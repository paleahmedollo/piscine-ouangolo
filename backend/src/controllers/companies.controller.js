const { Company, User, sequelize,
  Ticket, Subscription, RestaurantOrder, RestaurantOrderItem,
  Reservation, Receipt, CarWash, PressingOrder,
  Purchase, PurchaseItem, Sale, StockMovement,
  CustomerTab, TabItem, DepotClient, DepotSale, DepotSaleItem,
  Expense, Payroll, CashRegister, CashShortage,
  AccountingEntry, Event, Quote, Incident
} = require('../models');
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
 * POST /api/companies/:id/reset-data
 * Remet à zéro toutes les données transactionnelles d'une entreprise
 * (tickets, ventes, commandes, réservations, etc.) — les utilisateurs et la config sont conservés
 */
const resetCompanyData = async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    // Récupérer les IDs de tous les utilisateurs de cette entreprise
    const users = await User.findAll({ where: { company_id: companyId }, attributes: ['id'] });
    const userIds = users.map(u => u.id);

    // Supprimer d'abord les sous-éléments (respect des FK) — sans transaction unique
    // (PostgreSQL: une erreur dans une transaction aborte toutes les opérations suivantes)
    const restaurantOrders = await RestaurantOrder.findAll({ where: { company_id: companyId }, attributes: ['id'] });
    if (restaurantOrders.length > 0) {
      const orderIds = restaurantOrders.map(o => o.id);
      try { await RestaurantOrderItem.destroy({ where: { order_id: { [Op.in]: orderIds } } }); } catch (_) {}
    }

    const purchases = await Purchase.findAll({ where: { company_id: companyId }, attributes: ['id'] });
    if (purchases.length > 0) {
      const purchaseIds = purchases.map(p => p.id);
      try { await PurchaseItem.destroy({ where: { purchase_id: { [Op.in]: purchaseIds } } }); } catch (_) {}
    }

    const depotSales = await DepotSale.findAll({ where: { company_id: companyId }, attributes: ['id'] });
    if (depotSales.length > 0) {
      const saleIds = depotSales.map(d => d.id);
      try { await DepotSaleItem.destroy({ where: { sale_id: { [Op.in]: saleIds } } }); } catch (_) {}
    }

    const customerTabs = await CustomerTab.findAll({ where: { company_id: companyId }, attributes: ['id'] });
    if (customerTabs.length > 0) {
      const tabIds = customerTabs.map(tb => tb.id);
      try { await TabItem.destroy({ where: { tab_id: { [Op.in]: tabIds } } }); } catch (_) {}
    }

    // Supprimer les enregistrements par company_id
    const modelsCompany = [
      RestaurantOrder, Purchase, DepotSale, DepotClient, CustomerTab,
      CarWash, PressingOrder, Receipt, Expense, Payroll,
      CashRegister, CashShortage, AccountingEntry, Event, Quote, Incident, StockMovement
    ];
    for (const model of modelsCompany) {
      try { await model.destroy({ where: { company_id: companyId } }); } catch (_) {}
    }

    // Supprimer les enregistrements par user_id
    if (userIds.length > 0) {
      const modelsUser = [Ticket, Subscription, Sale, Reservation];
      for (const model of modelsUser) {
        try { await model.destroy({ where: { user_id: { [Op.in]: userIds } } }); } catch (_) {}
      }
    }

    res.json({ success: true, message: `Données de "${company.name}" réinitialisées — compteur remis à zéro` });
  } catch (error) {
    console.error('Reset company data error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation des données' });
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

/**
 * POST /api/companies/:id/reset-stock
 * Réinitialise le stock à 0 pour tous les produits liés aux users de la company
 */
const resetCompanyStock = async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    // Réinitialise via stock_movements: produits utilisés par les users de cette company
    const [result] = await sequelize.query(
      `UPDATE products SET current_stock = 0 WHERE id IN (
        SELECT DISTINCT sm.product_id FROM stock_movements sm
        INNER JOIN users u ON u.id = sm.user_id WHERE u.company_id = :companyId
      )`,
      { replacements: { companyId }, type: sequelize.QueryTypes.UPDATE }
    );

    res.json({
      success: true,
      message: `Stock réinitialisé à zéro pour l'entreprise "${company.name}"`,
      data: { affected: result }
    });
  } catch (error) {
    console.error('Reset stock error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation du stock' });
  }
};

module.exports = {
  getCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
  permanentDeleteCompany,
  resetCompanyData,
  getCompanyStats,
  bulkCreateUsers,
  resetCompanyStock
};
