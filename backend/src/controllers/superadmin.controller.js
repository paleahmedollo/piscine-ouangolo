/**
 * Super Admin Controller — Ollentra SaaS Platform
 * Gère les 9 modules du tableau de bord superadmin :
 *  1. Tableau de bord (stats globales)
 *  2. Entreprises (via companies.controller.js)
 *  3. Utilisateurs
 *  4. Abonnements
 *  5. Facturation
 *  6. Assistance (Billets)
 *  7. Rapports
 *  8. Paramètres
 *  9. Système de journaux
 */

const { Op } = require('sequelize');
const { sequelize, Company, User, SupportTicket, Invoice, SaasSubscription, SystemLog, AuditLog } = require('../models');

// ─────────────────────────────────────────────────────
// Helper : journaliser une action superadmin
// ─────────────────────────────────────────────────────
const logAction = async (req, action, module, entityType = null, entityId = null, details = null) => {
  try {
    await SystemLog.create({
      user_id: req.user?.id || null,
      company_id: req.user?.company_id || null,
      action,
      module,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: req.ip || req.connection?.remoteAddress || null,
      user_agent: req.headers?.['user-agent'] || null,
      status: 'success'
    });
  } catch (e) {
    console.error('Erreur log système:', e.message);
  }
};

// ═══════════════════════════════════════════════════════
// 1. TABLEAU DE BORD — Stats globales
// ═══════════════════════════════════════════════════════

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Entreprises
    const totalCompanies = await Company.count();
    const activeCompanies = await Company.count({ where: { is_active: true, status: 'actif' } });
    const suspendedCompanies = await Company.count({ where: { status: 'suspendu' } });
    const expiredCompanies = await Company.count({ where: { status: 'expire' } });
    const newCompanies7d = await Company.count({
      where: { created_at: { [Op.gte]: sevenDaysAgo } }
    });

    // Utilisateurs
    const totalUsers = await User.count({ where: { role: { [Op.ne]: 'super_admin' } } });
    const activeUsers = await User.count({ where: { is_active: true, role: { [Op.ne]: 'super_admin' } } });

    // Abonnements
    const activeSubscriptions = await SaasSubscription.count({ where: { status: 'actif' } });
    const expiredSubscriptions = await SaasSubscription.count({ where: { status: 'expire' } });

    // Tickets support
    const openTickets = await SupportTicket.count({ where: { status: { [Op.in]: ['ouvert', 'en_cours'] } } });
    const urgentTickets = await SupportTicket.count({ where: { priority: 'urgente', status: { [Op.notIn]: ['resolu', 'cloture'] } } });
    const resolvedThisWeek = await SupportTicket.count({
      where: {
        status: { [Op.in]: ['resolu', 'cloture'] },
        resolved_at: { [Op.gte]: sevenDaysAgo }
      }
    });

    // Facturation
    const [revenueMonthResult] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM invoices
      WHERE status = 'payee' AND created_at >= :startOfMonth
    `, { replacements: { startOfMonth }, type: sequelize.QueryTypes.SELECT });
    const revenueMonth = parseFloat(revenueMonthResult?.total || 0);

    const [revenueTotalResult] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'payee'
    `, { type: sequelize.QueryTypes.SELECT });
    const revenueTotal = parseFloat(revenueTotalResult?.total || 0);

    const unpaidInvoices = await Invoice.count({ where: { status: { [Op.in]: ['impayee', 'en_retard'] } } });

    res.json({
      success: true,
      data: {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          suspended: suspendedCompanies,
          expired: expiredCompanies,
          new_7d: newCompanies7d
        },
        users: {
          total: totalUsers,
          active: activeUsers
        },
        subscriptions: {
          active: activeSubscriptions,
          expired: expiredSubscriptions
        },
        tickets: {
          open: openTickets,
          urgent: urgentTickets,
          resolved_week: resolvedThisWeek
        },
        finance: {
          revenue_month: revenueMonth,
          revenue_total: revenueTotal,
          unpaid_invoices: unpaidInvoices
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des statistiques' });
  }
};

// ═══════════════════════════════════════════════════════
// 3. UTILISATEURS — Gestion multi-entreprises
// ═══════════════════════════════════════════════════════

const getAllUsers = async (req, res) => {
  try {
    const { company_id, role, is_active, search, page = 1, limit = 50 } = req.query;
    const where = { role: { [Op.ne]: 'super_admin' } };

    if (company_id) where.company_id = company_id;
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'code'], required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des utilisateurs' });
  }
};

const createUser = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { username, full_name, password, role, company_id } = req.body;

    if (!username || !full_name || !password || !role) {
      return res.status(400).json({ success: false, message: 'Champs requis : username, full_name, password, role' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: `L'identifiant "${username}" est déjà utilisé` });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      full_name,
      password_hash,
      role,
      company_id: company_id || null,
      is_active: true
    });

    await logAction(req, 'CREATE_USER', 'users', 'User', user.id, { username, role, company_id });
    res.json({ success: true, data: user, message: `Utilisateur "${username}" créé avec succès` });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'utilisateur' });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.role === 'super_admin') return res.status(403).json({ success: false, message: 'Impossible de modifier le super administrateur' });

    const { full_name, role, is_active, company_id } = req.body;
    await user.update({
      ...(full_name && { full_name }),
      ...(role && { role }),
      ...(is_active !== undefined && { is_active }),
      ...(company_id !== undefined && { company_id: company_id || null })
    });

    await logAction(req, 'UPDATE_USER', 'users', 'user', user.id, { username: user.username });
    res.json({ success: true, message: 'Utilisateur mis à jour', data: user.toJSON() });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.role === 'super_admin') return res.status(403).json({ success: false, message: 'Impossible de modifier le super administrateur' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 6 caractères)' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({ password_hash: hashedPassword }, { hooks: false });
    await logAction(req, 'RESET_PASSWORD', 'users', 'user', user.id, { username: user.username });

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.role === 'super_admin') return res.status(403).json({ success: false, message: 'Impossible de supprimer le super administrateur' });

    await user.update({ is_active: false });
    await logAction(req, 'DEACTIVATE_USER', 'users', 'user', user.id, { username: user.username });
    res.json({ success: true, message: 'Utilisateur désactivé' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la désactivation' });
  }
};

// ═══════════════════════════════════════════════════════
// 4. ABONNEMENTS — Gestion SaaS
// ═══════════════════════════════════════════════════════

const getSubscriptions = async (req, res) => {
  try {
    const { company_id, status, plan } = req.query;
    const where = {};
    if (company_id) where.company_id = company_id;
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const subscriptions = await SaasSubscription.findAll({
      where,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'code'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des abonnements' });
  }
};

const createSubscription = async (req, res) => {
  try {
    const { company_id, plan, price, currency, billing_cycle, start_date, end_date, next_billing_date, notes } = req.body;

    if (!company_id || !plan || !start_date) {
      return res.status(400).json({ success: false, message: 'company_id, plan et start_date obligatoires' });
    }

    const company = await Company.findByPk(company_id);
    if (!company) return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });

    const subscription = await SaasSubscription.create({
      company_id, plan, price: price || 0, currency: currency || 'XOF',
      billing_cycle: billing_cycle || 'mensuel',
      start_date, end_date: end_date || null,
      next_billing_date: next_billing_date || null,
      status: 'actif', notes
    });

    // Mettre à jour le plan de l'entreprise
    await company.update({ plan, status: 'actif' });
    await logAction(req, 'CREATE_SUBSCRIPTION', 'subscriptions', 'subscription', subscription.id, { company: company.name, plan });

    res.status(201).json({ success: true, message: 'Abonnement créé', data: subscription });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const sub = await SaasSubscription.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Abonnement non trouvé' });

    const { plan, price, status, end_date, next_billing_date, billing_cycle, notes } = req.body;
    await sub.update({
      ...(plan && { plan }),
      ...(price !== undefined && { price }),
      ...(status && { status }),
      ...(end_date !== undefined && { end_date }),
      ...(next_billing_date !== undefined && { next_billing_date }),
      ...(billing_cycle && { billing_cycle }),
      ...(notes !== undefined && { notes })
    });

    // Sync statut entreprise si changement de statut
    if (status) {
      const companyStatus = status === 'actif' ? 'actif' : status === 'suspendu' ? 'suspendu' : 'expire';
      await Company.update({ status: companyStatus }, { where: { id: sub.company_id } });
    }

    await logAction(req, 'UPDATE_SUBSCRIPTION', 'subscriptions', 'subscription', sub.id);
    res.json({ success: true, message: 'Abonnement mis à jour', data: sub });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

// ═══════════════════════════════════════════════════════
// 5. FACTURATION — Invoices
// ═══════════════════════════════════════════════════════

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const [result] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM invoices WHERE invoice_number LIKE 'INV-${year}-%'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const count = parseInt(result?.cnt || 0) + 1;
  return `INV-${year}-${String(count).padStart(4, '0')}`;
};

const getInvoices = async (req, res) => {
  try {
    const { company_id, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (company_id) where.company_id = company_id;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'code'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des factures' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { company_id, amount, description, plan, period_start, period_end, due_date, notes } = req.body;
    if (!company_id || !amount) {
      return res.status(400).json({ success: false, message: 'company_id et amount obligatoires' });
    }

    const company = await Company.findByPk(company_id);
    if (!company) return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });

    const invoice_number = await generateInvoiceNumber();
    const invoice = await Invoice.create({
      invoice_number, company_id, amount, description, plan,
      period_start, period_end, due_date,
      status: 'impayee', notes
    });

    await logAction(req, 'CREATE_INVOICE', 'billing', 'invoice', invoice.id, { company: company.name, amount, invoice_number });
    res.status(201).json({ success: true, message: 'Facture créée', data: invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    const { status, payment_method, payment_reference, paid_at, notes, due_date } = req.body;
    await invoice.update({
      ...(status && { status }),
      ...(payment_method && { payment_method }),
      ...(payment_reference && { payment_reference }),
      ...(paid_at && { paid_at }),
      ...(notes !== undefined && { notes }),
      ...(due_date && { due_date }),
      // Auto-set paid_at si status passe à 'payee'
      ...(status === 'payee' && !invoice.paid_at && !paid_at && { paid_at: new Date() })
    });

    await logAction(req, 'UPDATE_INVOICE', 'billing', 'invoice', invoice.id, { status });
    res.json({ success: true, message: 'Facture mise à jour', data: invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

const getInvoiceStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'payee') as paid_count,
        COUNT(*) FILTER (WHERE status IN ('impayee', 'en_retard')) as unpaid_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'payee'), 0) as total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE status = 'payee' AND created_at >= :startOfMonth), 0) as monthly_revenue,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('impayee', 'en_retard')), 0) as unpaid_amount
      FROM invoices
    `, { replacements: { startOfMonth }, type: sequelize.QueryTypes.SELECT });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Invoice stats error:', error);
    res.status(500).json({ success: false, message: 'Erreur stats facturation' });
  }
};

// ═══════════════════════════════════════════════════════
// 6. ASSISTANCE — Support Tickets
// ═══════════════════════════════════════════════════════

const generateTicketNumber = async () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const [result] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM support_tickets WHERE ticket_number LIKE 'TK-${year}${month}-%'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const count = parseInt(result?.cnt || 0) + 1;
  return `TK-${year}${month}-${String(count).padStart(4, '0')}`;
};

const getTickets = async (req, res) => {
  try {
    const { company_id, status, priority, category, assigned_to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (company_id) where.company_id = company_id;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assigned_to) where.assigned_to = assigned_to;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'], required: false },
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'], required: false },
        { model: User, as: 'assignedUser', attributes: ['id', 'username', 'full_name'], required: false }
      ],
      order: [
        [sequelize.literal(`CASE priority WHEN 'urgente' THEN 1 WHEN 'haute' THEN 2 WHEN 'moyenne' THEN 3 ELSE 4 END`), 'ASC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des tickets' });
  }
};

const createTicket = async (req, res) => {
  try {
    const { company_id, user_id, category, title, description, priority, attachment_url } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Titre et description obligatoires' });
    }

    const ticket_number = await generateTicketNumber();
    const ticket = await SupportTicket.create({
      ticket_number, company_id: company_id || null,
      user_id: user_id || req.user?.id || null,
      category: category || 'assistance',
      title, description, priority: priority || 'moyenne',
      attachment_url: attachment_url || null,
      status: 'ouvert',
      opened_at: new Date()
    });

    const fullTicket = await SupportTicket.findByPk(ticket.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'], required: false },
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'], required: false }
      ]
    });

    await logAction(req, 'CREATE_TICKET', 'tickets', 'ticket', ticket.id, { ticket_number, priority });
    res.status(201).json({ success: true, message: 'Ticket créé', data: fullTicket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
};

const updateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });

    const { status, priority, assigned_to, resolution_notes, category } = req.body;
    const updates = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assigned_to !== undefined && { assigned_to: assigned_to || null }),
      ...(resolution_notes !== undefined && { resolution_notes }),
      ...(category && { category }),
      // Si résolution : enregistrer la date
      ...((status === 'resolu' || status === 'cloture') && !ticket.resolved_at && { resolved_at: new Date() })
    };

    await ticket.update(updates);
    await logAction(req, 'UPDATE_TICKET', 'tickets', 'ticket', ticket.id, { status, priority });
    res.json({ success: true, message: 'Ticket mis à jour', data: ticket });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

const getTicketStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('ouvert', 'en_cours')) as open_count,
        COUNT(*) FILTER (WHERE status = 'ouvert') as new_count,
        COUNT(*) FILTER (WHERE priority = 'urgente' AND status NOT IN ('resolu','cloture')) as urgent_count,
        COUNT(*) FILTER (WHERE status IN ('resolu','cloture') AND resolved_at >= :sevenDaysAgo) as resolved_week,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - opened_at))/3600) FILTER (WHERE resolved_at IS NOT NULL), 1) as avg_resolution_hours
      FROM support_tickets
    `, { replacements: { sevenDaysAgo }, type: sequelize.QueryTypes.SELECT });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Ticket stats error:', error);
    res.status(500).json({ success: false, message: 'Erreur stats tickets' });
  }
};

// ═══════════════════════════════════════════════════════
// 7. RAPPORTS — Statistiques avancées
// ═══════════════════════════════════════════════════════

const getReports = async (req, res) => {
  try {
    const { type = 'overview', from, to } = req.query;
    const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const dateTo = to ? new Date(to) : new Date();

    let data = {};

    if (type === 'companies') {
      const companies = await Company.findAll({
        include: [{ model: User, as: 'users', attributes: ['id'], required: false }],
        order: [['created_at', 'DESC']]
      });
      data = companies.map(c => ({
        id: c.id, name: c.name, code: c.code, plan: c.plan, status: c.status,
        users_count: c.users?.length || 0, created_at: c.created_at
      }));
    } else if (type === 'revenue') {
      const [rows] = await sequelize.query(`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as invoice_count,
          SUM(amount) FILTER (WHERE status = 'payee') as revenue,
          COUNT(*) FILTER (WHERE status IN ('impayee','en_retard')) as unpaid_count
        FROM invoices
        WHERE created_at BETWEEN :dateFrom AND :dateTo
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month DESC
      `, { replacements: { dateFrom, dateTo }, type: sequelize.QueryTypes.SELECT });
      data = rows;
    } else if (type === 'tickets') {
      const [rows] = await sequelize.query(`
        SELECT
          category,
          priority,
          status,
          COUNT(*) as count
        FROM support_tickets
        WHERE created_at BETWEEN :dateFrom AND :dateTo
        GROUP BY category, priority, status
        ORDER BY count DESC
      `, { replacements: { dateFrom, dateTo }, type: sequelize.QueryTypes.SELECT });
      data = rows;
    } else {
      // Overview par défaut
      const [overview] = await sequelize.query(`
        SELECT
          (SELECT COUNT(*) FROM companies WHERE is_active = true) as total_companies,
          (SELECT COUNT(*) FROM users WHERE role != 'super_admin' AND is_active = true) as total_users,
          (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'payee') as total_revenue,
          (SELECT COUNT(*) FROM support_tickets WHERE status NOT IN ('resolu','cloture')) as open_tickets,
          (SELECT COUNT(*) FROM saas_subscriptions WHERE status = 'actif') as active_subscriptions
      `, { type: sequelize.QueryTypes.SELECT });
      data = overview;
    }

    res.json({ success: true, data, type, period: { from: dateFrom, to: dateTo } });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des rapports' });
  }
};

// ═══════════════════════════════════════════════════════
// 8. PARAMÈTRES — Configuration système
// ═══════════════════════════════════════════════════════

const getSettings = async (req, res) => {
  try {
    // Retourner les paramètres système depuis les variables d'env et configs
    const settings = {
      platform: {
        name: 'Ollentra',
        version: '2.0',
        environment: process.env.NODE_ENV || 'development',
        api_url: process.env.API_URL || 'http://localhost:3001'
      },
      subscriptions: {
        plans: [
          { id: 'basic', name: 'Basique', price: 15000, currency: 'XOF', features: ['Piscine', '5 utilisateurs'] },
          { id: 'pro', name: 'Pro', price: 35000, currency: 'XOF', features: ['Tous modules', '20 utilisateurs'] },
          { id: 'premium', name: 'Premium', price: 75000, currency: 'XOF', features: ['Tous modules', 'Utilisateurs illimités', 'Support prioritaire'] }
        ]
      },
      activity_types: ['Restaurant', 'Hôtel', 'Maquis', 'Lavage', 'Événementiel', 'Piscine', 'Mixte', 'Autre'],
      countries: ["Côte d'Ivoire", 'Mali', 'Sénégal', 'Burkina Faso', 'Ghana', 'Guinée', 'Togo', 'Bénin', 'Niger', 'Cameroun']
    };

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des paramètres' });
  }
};

const updateSettings = async (req, res) => {
  try {
    // Pour l'instant, journaliser seulement
    await logAction(req, 'UPDATE_SETTINGS', 'settings', null, null, req.body);
    res.json({ success: true, message: 'Paramètres enregistrés' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

// ═══════════════════════════════════════════════════════
// 9. SYSTÈME DE JOURNAUX — Logs
// ═══════════════════════════════════════════════════════

const getSystemLogs = async (req, res) => {
  try {
    const { user_id, company_id, module, action, status, from, to, page = 1, limit = 100 } = req.query;
    const where = {};

    if (user_id) where.user_id = user_id;
    if (company_id) where.company_id = company_id;
    if (module) where.module = module;
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (status) where.status = status;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await SystemLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'], required: false },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'], required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('System logs error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors des journaux' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { company_id, user_id, from, to, page = 1, limit = 100 } = req.query;
    const where = {};

    if (company_id) where.company_id = company_id;
    if (user_id) where.user_id = user_id;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name', 'role'], required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'audit' });
  }
};

module.exports = {
  // Dashboard
  getDashboardStats,
  // Users
  getAllUsers, createUser, updateUser, resetUserPassword, deleteUser,
  // Subscriptions
  getSubscriptions, createSubscription, updateSubscription,
  // Billing
  getInvoices, createInvoice, updateInvoice, getInvoiceStats,
  // Support Tickets
  getTickets, createTicket, updateTicket, getTicketStats,
  // Reports
  getReports,
  // Settings
  getSettings, updateSettings,
  // Logs
  getSystemLogs, getAuditLogs
};
