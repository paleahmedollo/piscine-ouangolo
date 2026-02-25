const { Op } = require('sequelize');
const { Ticket, Subscription, User, Incident, PriceSetting } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

const DEFAULT_TICKET_PRICES = { adulte: 2000, enfant: 1000 };
const DEFAULT_SUBSCRIPTION_PRICES = { mensuel: 25000, trimestriel: 60000, annuel: 200000 };

const getPricesFromDB = async (companyId) => {
  try {
    const where = companyId ? { company_id: companyId } : {};
    const settings = await PriceSetting.findAll({ where });
    const map = {};
    settings.forEach(s => { map[s.key] = parseFloat(s.value); });
    return {
      tickets: {
        adulte: map['ticket_adulte'] ?? DEFAULT_TICKET_PRICES.adulte,
        enfant: map['ticket_enfant'] ?? DEFAULT_TICKET_PRICES.enfant
      },
      subscriptions: {
        mensuel: map['abonnement_mensuel'] ?? DEFAULT_SUBSCRIPTION_PRICES.mensuel,
        trimestriel: map['abonnement_trimestriel'] ?? DEFAULT_SUBSCRIPTION_PRICES.trimestriel,
        annuel: map['abonnement_annuel'] ?? DEFAULT_SUBSCRIPTION_PRICES.annuel
      }
    };
  } catch {
    return { tickets: DEFAULT_TICKET_PRICES, subscriptions: DEFAULT_SUBSCRIPTION_PRICES };
  }
};

const createTicket = async (req, res) => {
  try {
    const { type, quantity, payment_method, payment_operator, payment_reference } = req.body;
    if (!type || !quantity) return res.status(400).json({ success: false, message: 'Type et quantité requis' });
    if (!['adulte', 'enfant'].includes(type)) return res.status(400).json({ success: false, message: 'Type de ticket invalide' });

    const prices = await getPricesFromDB(req.user.company_id);
    const unit_price = prices.tickets[type];
    const total = unit_price * quantity;

    const ticket = await Ticket.create({
      user_id: req.user.id,
      company_id: req.user.company_id,
      type, quantity, unit_price, total,
      payment_method: payment_method || 'especes',
      payment_operator: payment_operator || null,
      payment_reference: payment_reference || null
    });

    await logAction(req, 'CREATE_TICKET', 'piscine', 'ticket', ticket.id, { type, quantity, total });
    res.status(201).json({ success: true, message: 'Vente enregistrée', data: ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du ticket' });
  }
};

const getTickets = async (req, res) => {
  try {
    const { date, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const cf = getCompanyFilter(req);

    let whereClause = { ...cf };

    if (date) {
      whereClause.created_at = { [Op.gte]: new Date(date), [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };
    } else if (start_date && end_date) {
      whereClause.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      whereClause.created_at = { [Op.gte]: today, [Op.lt]: tomorrow };
    }

    if (!['directeur', 'maire', 'admin', 'gerant', 'responsable', 'super_admin'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: parseInt(offset)
    });

    res.json({ success: true, data: { tickets, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } } });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des tickets' });
  }
};

const getTicketStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);
    const cf = getCompanyFilter(req);

    let whereClause = { ...cf, created_at: { [Op.gte]: targetDate, [Op.lt]: nextDay } };
    if (!['directeur', 'maire', 'admin', 'gerant', 'responsable', 'super_admin'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    const tickets = await Ticket.findAll({ where: whereClause });
    const stats = { total_ventes: tickets.length, total_tickets_adulte: 0, total_tickets_enfant: 0, total_montant: 0, par_mode_paiement: { especes: 0, carte: 0, mobile_money: 0 } };
    tickets.forEach(ticket => {
      if (ticket.type === 'adulte') stats.total_tickets_adulte += ticket.quantity;
      else stats.total_tickets_enfant += ticket.quantity;
      stats.total_montant += parseFloat(ticket.total);
      if (stats.par_mode_paiement[ticket.payment_method] !== undefined) stats.par_mode_paiement[ticket.payment_method] += parseFloat(ticket.total);
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
};

const getPrices = async (req, res) => {
  try {
    const data = await getPricesFromDB(req.user.company_id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des prix' });
  }
};

const updatePrices = async (req, res) => {
  try {
    const { ticket_adulte, ticket_enfant, abonnement_mensuel, abonnement_trimestriel, abonnement_annuel } = req.body;
    const updates = [];
    if (ticket_adulte !== undefined) updates.push({ key: 'ticket_adulte', value: parseFloat(ticket_adulte) });
    if (ticket_enfant !== undefined) updates.push({ key: 'ticket_enfant', value: parseFloat(ticket_enfant) });
    if (abonnement_mensuel !== undefined) updates.push({ key: 'abonnement_mensuel', value: parseFloat(abonnement_mensuel) });
    if (abonnement_trimestriel !== undefined) updates.push({ key: 'abonnement_trimestriel', value: parseFloat(abonnement_trimestriel) });
    if (abonnement_annuel !== undefined) updates.push({ key: 'abonnement_annuel', value: parseFloat(abonnement_annuel) });

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Aucune valeur à modifier' });

    for (const u of updates) {
      await PriceSetting.upsert({ key: u.key, value: u.value, company_id: req.user.company_id });
    }

    await logAction(req, 'UPDATE_PRICES', 'piscine', 'price_settings', null, { updates: updates.map(u => `${u.key}=${u.value}`) });
    const data = await getPricesFromDB(req.user.company_id);
    res.json({ success: true, message: 'Tarifs mis à jour', data });
  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des tarifs' });
  }
};

const createSubscription = async (req, res) => {
  try {
    const { client_name, client_phone, type, start_date } = req.body;
    if (!client_name || !type || !start_date) return res.status(400).json({ success: false, message: 'Nom, type et date requis' });
    if (!['mensuel', 'trimestriel', 'annuel'].includes(type)) return res.status(400).json({ success: false, message: 'Type d\'abonnement invalide' });

    const prices = await getPricesFromDB(req.user.company_id);
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    if (type === 'mensuel') endDateObj.setMonth(endDateObj.getMonth() + 1);
    else if (type === 'trimestriel') endDateObj.setMonth(endDateObj.getMonth() + 3);
    else endDateObj.setFullYear(endDateObj.getFullYear() + 1);

    const subscription = await Subscription.create({
      client_name, client_phone, type,
      start_date: startDateObj, end_date: endDateObj,
      price: prices.subscriptions[type],
      user_id: req.user.id,
      company_id: req.user.company_id
    });

    await logAction(req, 'CREATE_SUBSCRIPTION', 'piscine', 'subscription', subscription.id, { client_name, type, price: prices.subscriptions[type] });
    res.status(201).json({ success: true, message: 'Abonnement créé', data: subscription });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'abonnement' });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const { active_only, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const cf = getCompanyFilter(req);
    let whereClause = { ...cf };

    if (active_only === 'true') { const today = new Date(); whereClause.is_active = true; whereClause.end_date = { [Op.gte]: today }; }
    if (search) { whereClause[Op.or] = [{ client_name: { [Op.iLike]: `%${search}%` } }, { client_phone: { [Op.like]: `%${search}%` } }]; }

    const { count, rows: subscriptions } = await Subscription.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
    });

    res.json({ success: true, data: { subscriptions, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } } });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des abonnements' });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, { include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] });
    if (!subscription) return res.status(404).json({ success: false, message: 'Abonnement non trouvé' });
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération' });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) return res.status(404).json({ success: false, message: 'Abonnement non trouvé' });
    subscription.is_active = false;
    await subscription.save();
    await logAction(req, 'CANCEL_SUBSCRIPTION', 'piscine', 'subscription', subscription.id);
    res.json({ success: true, message: 'Abonnement annulé', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation' });
  }
};

const checkSubscription = async (req, res) => {
  try {
    const { phone } = req.params;
    const today = new Date();
    const cf = getCompanyFilter(req);
    const subscription = await Subscription.findOne({
      where: { ...cf, client_phone: phone, is_active: true, end_date: { [Op.gte]: today } },
      order: [['end_date', 'DESC']]
    });
    res.json({ success: true, data: { has_valid_subscription: !!subscription, subscription: subscription || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification' });
  }
};

const createIncident = async (req, res) => {
  try {
    const { title, description, severity, incident_date, incident_time, location, persons_involved, actions_taken, photo_url } = req.body;
    if (!title || !description || !incident_date) return res.status(400).json({ success: false, message: 'Titre, description et date requis' });

    const incident = await Incident.create({
      title, description, severity: severity || 'mineur', incident_date, incident_time,
      location: location || 'piscine', persons_involved, actions_taken,
      photo_url: photo_url || null, user_id: req.user.id, company_id: req.user.company_id
    });

    await logAction(req, 'CREATE_INCIDENT', 'piscine', 'incident', incident.id, { title, severity });
    res.status(201).json({ success: true, message: 'Incident signalé', data: incident });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'incident' });
  }
};

const getIncidents = async (req, res) => {
  try {
    const { status, severity, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const cf = getCompanyFilter(req);
    let whereClause = { ...cf };

    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (start_date && end_date) whereClause.incident_date = { [Op.between]: [start_date, end_date] };

    const { count, rows: incidents } = await Incident.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['incident_date', 'DESC'], ['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
    });

    res.json({ success: true, data: { incidents, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des incidents' });
  }
};

const updateIncident = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident non trouvé' });
    const { status, actions_taken } = req.body;
    if (status) incident.status = status;
    if (actions_taken) incident.actions_taken = actions_taken;
    await incident.save();
    await logAction(req, 'UPDATE_INCIDENT', 'piscine', 'incident', incident.id, { status });
    res.json({ success: true, message: 'Incident mis à jour', data: incident });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

module.exports = { createTicket, getTickets, getTicketStats, getPrices, updatePrices, createSubscription, getSubscriptions, getSubscriptionById, cancelSubscription, checkSubscription, createIncident, getIncidents, updateIncident };
