const { Company, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * GET /api/companies
 * Liste toutes les entreprises (super_admin uniquement)
 */
const getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
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
    const { name, code, address, phone, email, plan, admin_username, admin_password, admin_full_name } = req.body;

    if (!name || !code) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Nom et code obligatoires' });
    }

    if (!admin_username || !admin_password) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Identifiants admin obligatoires' });
    }

    // Créer l'entreprise
    const company = await Company.create({
      name,
      code: code.toUpperCase(),
      address,
      phone,
      email,
      plan: plan || 'basic',
      is_active: true
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

    const { name, address, phone, email, logo_url, plan, is_active } = req.body;

    await company.update({
      ...(name && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(logo_url !== undefined && { logo_url }),
      ...(plan && { plan }),
      ...(is_active !== undefined && { is_active })
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

module.exports = {
  getCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats
};
