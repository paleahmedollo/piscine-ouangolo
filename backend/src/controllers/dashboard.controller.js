const { Op } = require('sequelize');
const {
  User, Ticket, Subscription, Sale, Room,
  Reservation, Event, Quote, CashRegister, AuditLog
} = require('../models');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const cf = getCompanyFilter(req);

    const dashboard = { date: today.toISOString().split('T')[0], modules: {} };

    if (['admin', 'super_admin', 'maitre_nageur', 'gerant', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      const todayTickets = await Ticket.findAll({ where: { ...cf, created_at: { [Op.between]: [today, tomorrow] } } });
      const monthTickets = await Ticket.findAll({ where: { ...cf, created_at: { [Op.between]: [startOfMonth, endOfMonth] } } });
      const activeSubscriptions = await Subscription.count({ where: { ...cf, is_active: true, end_date: { [Op.gte]: today } } });

      dashboard.modules.piscine = {
        aujourd_hui: {
          ventes: todayTickets.length,
          montant: todayTickets.reduce((sum, t) => sum + parseFloat(t.total), 0),
          tickets_adulte: todayTickets.filter(t => t.type === 'adulte').reduce((sum, t) => sum + t.quantity, 0),
          tickets_enfant: todayTickets.filter(t => t.type === 'enfant').reduce((sum, t) => sum + t.quantity, 0)
        },
        mois: {
          ventes: monthTickets.length,
          montant: monthTickets.reduce((sum, t) => sum + parseFloat(t.total), 0)
        },
        abonnements_actifs: activeSubscriptions
      };
    }

    if (['admin', 'super_admin', 'serveuse', 'serveur', 'gerant', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      const todaySales = await Sale.findAll({ where: { ...cf, status: 'ferme', created_at: { [Op.between]: [today, tomorrow] } } });
      const monthSales = await Sale.findAll({ where: { ...cf, status: 'ferme', created_at: { [Op.between]: [startOfMonth, endOfMonth] } } });

      dashboard.modules.restaurant = {
        aujourd_hui: { ventes: todaySales.length, montant: todaySales.reduce((sum, s) => sum + parseFloat(s.total), 0) },
        mois: { ventes: monthSales.length, montant: monthSales.reduce((sum, s) => sum + parseFloat(s.total), 0) }
      };
    }

    if (['admin', 'super_admin', 'receptionniste', 'gerant', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      const rooms = await Room.findAll({ where: { ...cf } });
      const todayCheckins = await Reservation.count({ where: { ...cf, check_in: today.toISOString().split('T')[0], status: { [Op.ne]: 'annulee' } } });
      const todayCheckouts = await Reservation.count({ where: { ...cf, check_out: today.toISOString().split('T')[0], status: 'en_cours' } });

      dashboard.modules.hotel = {
        chambres: {
          total: rooms.length,
          disponibles: rooms.filter(r => r.status === 'disponible').length,
          occupees: rooms.filter(r => r.status === 'occupee').length,
          maintenance: rooms.filter(r => r.status === 'maintenance').length,
          nettoyage: rooms.filter(r => r.status === 'nettoyage').length
        },
        aujourd_hui: { check_ins: todayCheckins, check_outs: todayCheckouts },
        taux_occupation: rooms.length > 0 ? Math.round((rooms.filter(r => r.status === 'occupee').length / rooms.length) * 100) : 0
      };
    }

    if (['admin', 'super_admin', 'gestionnaire_events', 'gerant', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      const upcomingEvents = await Event.findAll({
        where: { ...cf, event_date: { [Op.gte]: today }, status: { [Op.in]: ['demande', 'confirme'] } },
        limit: 5, order: [['event_date', 'ASC']]
      });
      const monthEvents = await Event.count({ where: { ...cf, event_date: { [Op.between]: [startOfMonth, endOfMonth] } } });
      const pendingQuotes = await Quote.count({ where: { ...cf, status: { [Op.in]: ['brouillon', 'envoye'] } } });
      const confirmedEvents = await Event.count({ where: { ...cf, status: 'confirme' } });

      dashboard.modules.events = {
        evenements_a_venir: upcomingEvents.length,
        evenements_ce_mois: monthEvents,
        devis_en_attente: pendingQuotes,
        evenements_confirmes: confirmedEvents,
        prochains: upcomingEvents.map(e => ({ id: e.id, name: e.name, date: e.event_date, space: e.space, status: e.status }))
      };
    }

    if (['admin', 'super_admin', 'gerant', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      const pendingCashRegisters = await CashRegister.count({ where: { ...cf, status: 'en_attente' } });
      const activeUsers = await User.count({ where: { ...cf, is_active: true } });

      let caJour = 0;
      if (dashboard.modules.piscine) caJour += dashboard.modules.piscine.aujourd_hui.montant;
      if (dashboard.modules.restaurant) caJour += dashboard.modules.restaurant.aujourd_hui.montant;

      let caMois = 0;
      if (dashboard.modules.piscine) caMois += dashboard.modules.piscine.mois.montant;
      if (dashboard.modules.restaurant) caMois += dashboard.modules.restaurant.mois.montant;

      dashboard.global = { ca_aujourd_hui: caJour, ca_mois: caMois, clotures_en_attente: pendingCashRegisters, utilisateurs_actifs: activeUsers };
    }

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du dashboard' });
  }
};

const getReports = async (req, res) => {
  try {
    const { start_date, end_date, module } = req.query;
    if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'Dates requises' });

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);
    const cf = getCompanyFilter(req);

    const report = { periode: { start_date, end_date }, modules: {} };

    if (!module || module === 'piscine') {
      const tickets = await Ticket.findAll({ where: { ...cf, created_at: { [Op.between]: [startDate, endDate] } } });
      const subscriptions = await Subscription.findAll({ where: { ...cf, created_at: { [Op.between]: [startDate, endDate] } } });
      report.modules.piscine = {
        tickets: {
          count: tickets.length,
          total: tickets.reduce((sum, t) => sum + parseFloat(t.total), 0),
          par_type: {
            adulte: tickets.filter(t => t.type === 'adulte').reduce((sum, t) => sum + t.quantity, 0),
            enfant: tickets.filter(t => t.type === 'enfant').reduce((sum, t) => sum + t.quantity, 0)
          }
        },
        abonnements: { count: subscriptions.length, total: subscriptions.reduce((sum, s) => sum + parseFloat(s.price), 0) }
      };
    }

    if (!module || module === 'restaurant') {
      const sales = await Sale.findAll({ where: { ...cf, status: 'ferme', created_at: { [Op.between]: [startDate, endDate] } } });
      report.modules.restaurant = { ventes: { count: sales.length, total: sales.reduce((sum, s) => sum + parseFloat(s.total), 0) } };
    }

    if (!module || module === 'hotel') {
      const reservations = await Reservation.findAll({ where: { ...cf, created_at: { [Op.between]: [startDate, endDate] }, status: { [Op.ne]: 'annulee' } } });
      report.modules.hotel = { reservations: { count: reservations.length, total: reservations.reduce((sum, r) => sum + parseFloat(r.total_price), 0), nuits: reservations.reduce((sum, r) => sum + r.nights, 0) } };
    }

    if (!module || module === 'events') {
      const events = await Event.findAll({ where: { ...cf, event_date: { [Op.between]: [startDate, endDate] } } });
      const quotes = await Quote.findAll({ where: { ...cf, created_at: { [Op.between]: [startDate, endDate] } } });
      report.modules.events = {
        evenements: { count: events.length, par_status: { demande: events.filter(e => e.status === 'demande').length, confirme: events.filter(e => e.status === 'confirme').length, termine: events.filter(e => e.status === 'termine').length, annule: events.filter(e => e.status === 'annule').length } },
        devis: { count: quotes.length, total: quotes.reduce((sum, q) => sum + parseFloat(q.total), 0), encaisse: quotes.reduce((sum, q) => sum + parseFloat(q.deposit_paid || 0), 0) }
      };
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du rapport' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { user_id, module, action, start_date, end_date, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    const cf = getCompanyFilter(req);

    let whereClause = { ...cf };
    if (user_id) whereClause.user_id = user_id;
    if (module) whereClause.module = module;
    if (action) whereClause.action = { [Op.like]: `%${action}%` };
    if (start_date && end_date) whereClause.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, data: { logs, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } } });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des logs' });
  }
};

module.exports = { getDashboard, getReports, getAuditLogs };
