const { Company, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * GET /api/companies
 * Liste toutes les entreprises (super_admin uniquement)
 */
const getCompanies = async (req, res) => {
  try {
    // Filtrage par is_test : ?is_test=true → comptes test, ?is_test=false → production
    const where = {};
    if (req.query.is_test !== undefined) {
      where.is_test = req.query.is_test === 'true';
    }

    const companies = await Company.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id'],
          required: false
        }
      ]
    });

    const result = companies.map(c => {
      const json = c.toJSON();
      json.users_count = json.users ? json.users.length : 0;
      delete json.users;
      return json;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des entreprises' });
  }
};

/**
 * POST /api/companies
 * Créer une nouvelle entreprise + utilisateur admin initial
 */
const createCompany = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name, code, address, phone, email, plan,
      founder_name, city, country,
      admin_username, admin_password, admin_full_name, modules, is_test
    } = req.body;

    if (!name || !code) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Nom et code obligatoires' });
    }

    if (!admin_username || !admin_password) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Identifiants admin obligatoires' });
    }

    // modules: null = tous, [] = aucun, [...] = sélectifs
    const modulesValue = modules !== undefined ? modules : null;

    // Créer l'entreprise
    const company = await Company.create({
      name,
      code: (code || '').toLowerCase().trim(),
      address,
      phone,
      email,
      plan: plan || 'basic',
      modules: modulesValue,
      manager_name: founder_name || null,   // fondateur → manager_name en DB
      locality: city || null,               // ville → locality en DB
      country: country || "Côte d'Ivoire",
      is_active: true,
      is_test: is_test === true || is_test === 'true' ? true : false
    }, { transaction: t });

    // Créer l'utilisateur admin de l'entreprise
    const admin = await User.create({
      username: admin_username,
      password_hash: admin_password,
      full_name: admin_full_name || `Admin ${name}`,
      role: 'admin',
      is_active: true,
      company_id: company.id,
      created_at: new Date(),
      updated_at: new Date()
    }, { transaction: t });

    await t.commit();

    const { initCompanyAccounts } = require('../utils/accounting');
    await initCompanyAccounts(company.id);

    res.status(201).json({
      success: true,
      message: 'Entreprise créée avec succès',
      data: {
        company: company.toJSON(),
        admin: admin.toJSON()
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Create company error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Code entreprise déjà utilisé' });
    }
    res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'entreprise' });
  }
};

/**
 * GET /api/companies/:id
 * Détails d'une entreprise
 */
const getCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'username', 'full_name', 'role', 'is_active'],
          required: false
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    res.json({ success: true, data: company.toJSON() });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'entreprise' });
  }
};

/**
 * PUT /api/companies/:id
 * Mettre à jour une entreprise
 */
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    const { name, address, phone, email, logo_url, plan, is_active, modules,
            founder_name, city, country, is_test } = req.body;

    await company.update({
      ...(name && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(logo_url !== undefined && { logo_url }),
      ...(plan && { plan }),
      ...(is_active !== undefined && { is_active }),
      ...(modules !== undefined && { modules }),
      ...(founder_name !== undefined && { manager_name: founder_name }),
      ...(city !== undefined && { locality: city }),
      ...(country !== undefined && { country }),
      ...(is_test !== undefined && { is_test: is_test === true || is_test === 'true' })
    });

    res.json({ success: true, message: 'Entreprise mise à jour', data: company.toJSON() });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

/**
 * DELETE /api/companies/:id
 * Désactiver une entreprise
 */
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    // Désactiver plutôt que supprimer pour préserver l'historique
    await company.update({ is_active: false });

    res.json({ success: true, message: 'Entreprise désactivée' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la désactivation' });
  }
};

/**
 * DELETE /api/companies/:id/permanent
 * Suppression définitive d'une entreprise et de tous ses utilisateurs
 */
const permanentDeleteCompany = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    const companyName = company.name;
    // Supprimer tous les utilisateurs de l'entreprise d'abord
    await User.destroy({ where: { company_id: req.params.id }, transaction: t });
    // Supprimer l'entreprise
    await company.destroy({ transaction: t });
    await t.commit();

    res.json({ success: true, message: `Entreprise "${companyName}" et tous ses utilisateurs supprimés définitivement` });
  } catch (error) {
    await t.rollback();
    console.error('Permanent delete company error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression définitive' });
  }
};

/**
 * GET /api/companies/:id/stats
 * Statistiques d'une entreprise (super_admin)
 */
const getCompanyStats = async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);

    const usersCount = await User.count({ where: { company_id: companyId, is_active: true } });

    res.json({
      success: true,
      data: {
        users_count: usersCount
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des statistiques' });
  }
};

/**
 * POST /api/companies/:id/bulk-users
 * Création en masse d'utilisateurs via fichier Excel/CSV (super_admin uniquement)
 * Colonnes attendues : full_name, username, password, role
 */
const bulkCreateUsers = async (req, res) => {
  const companyId = parseInt(req.params.id);

  try {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Fichier Excel requis' });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Le fichier est vide ou mal formaté' });
    }

    const results = { created: [], failed: [], skipped: [] };
    const validRoles = ['admin', 'gerant', 'directeur', 'responsable', 'maire', 'maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events'];

    for (const row of rows) {
      const full_name = String(row['full_name'] || row['Nom complet'] || row['nom_complet'] || '').trim();
      const username  = String(row['username']  || row['Identifiant']   || row['identifiant']   || '').trim().toLowerCase();
      const password  = String(row['password']  || row['Mot de passe']  || row['mot_de_passe']  || '').trim();
      const role      = String(row['role']       || row['Role']          || row['rôle']          || '').trim().toLowerCase();

      // Validation
      if (!full_name || !username || !password || !role) {
        results.failed.push({ username: username || '?', reason: 'Champs manquants (full_name, username, password, role)' });
        continue;
      }
      if (!validRoles.includes(role)) {
        results.failed.push({ username, reason: `Rôle invalide: "${role}"` });
        continue;
      }
      if (password.length < 6) {
        results.failed.push({ username, reason: 'Mot de passe trop court (min 6 caractères)' });
        continue;
      }

      // Vérifier si l'username existe déjà
      const existing = await User.findOne({ where: { username } });
      if (existing) {
        results.skipped.push({ username, reason: 'Nom d\'utilisateur déjà utilisé' });
        continue;
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
          username,
          password_hash: hashedPassword,
          full_name,
          role,
          is_active: true,
          company_id: companyId
        }, { hooks: false });

        results.created.push({ id: newUser.id, username, full_name, role });
      } catch (err) {
        results.failed.push({ username, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `Import terminé : ${results.created.length} créés, ${results.skipped.length} ignorés, ${results.failed.length} erreurs`,
      data: {
        company: { id: company.id, name: company.name },
        total_rows: rows.length,
        created: results.created,
        skipped: results.skipped,
        failed: results.failed
      }
    });
  } catch (error) {
    console.error('Bulk create users error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'import', detail: error.message });
  }
};

module.exports = {
  getCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
  permanentDeleteCompany,
  getCompanyStats,
  bulkCreateUsers
};
