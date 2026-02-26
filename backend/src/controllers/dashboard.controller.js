const { Op } = require('sequelize');
const {
  User, Ticket, Subscription, Sale, Room,
  Reservation, Event, Quote, CashRegister, AuditLog,
  CarWash, Product, Expense, PressingOrder, DepotSale, DepotClient
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

    // ── Lavage Auto ──────────────────────────────────────────────────────────
    if (['admin', 'super_admin', 'gerant', 'maitre_nageur', 'serveur', 'serveuse', 'receptionniste', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      try {
        const todayWashes = await CarWash.findAll({ where: { created_at: { [Op.between]: [today, tomorrow] } } });
        const monthWashes = await CarWash.findAll({ where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } } });
        dashboard.modules.lavage = {
          aujourd_hui: { total_lavages: todayWashes.length, montant: todayWashes.reduce((s, w) => s + parseFloat(w.amount || 0), 0) },
          mois: { total_lavages: monthWashes.length, montant: monthWashes.reduce((s, w) => s + parseFloat(w.amount || 0), 0) }
        };
      } catch (e) { /* table may not exist yet */ }
    }

    // ── Maquis / Bar ─────────────────────────────────────────────────────────
    if (['admin', 'super_admin', 'gerant', 'serveur', 'serveuse', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      try {
        const { sequelize: sq } = require('../config/database');
        const maquisToday = await sq.query(
          `SELECT COALESCE(SUM(subtotal),0) as total, COUNT(*) as nb
           FROM tab_items ti
           JOIN customer_tabs ct ON ct.id = ti.tab_id
           WHERE ti.service_type IN ('maquis','bar') AND ct.created_at BETWEEN :start AND :end`,
          { replacements: { start: today, end: tomorrow }, type: sq.QueryTypes.SELECT }
        );
        const maquisMonth = await sq.query(
          `SELECT COALESCE(SUM(subtotal),0) as total FROM tab_items ti
           JOIN customer_tabs ct ON ct.id = ti.tab_id
           WHERE ti.service_type IN ('maquis','bar') AND ct.created_at >= :start`,
          { replacements: { start: startOfMonth }, type: sq.QueryTypes.SELECT }
        );
        dashboard.modules.maquis = {
          aujourd_hui: { total_ventes: parseInt(maquisToday[0]?.nb || 0), montant: parseFloat(maquisToday[0]?.total || 0) },
          mois: { montant: parseFloat(maquisMonth[0]?.total || 0) }
        };
      } catch (e) { /* silent */ }
    }

    // ── Supérette ─────────────────────────────────────────────────────────────
    if (['admin', 'super_admin', 'gerant', 'serveur', 'serveuse', 'receptionniste', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      try {
        const { sequelize: sq } = require('../config/database');
        const superetteToday = await sq.query(
          `SELECT COALESCE(SUM(subtotal),0) as total, COUNT(*) as nb
           FROM tab_items ti
           JOIN customer_tabs ct ON ct.id = ti.tab_id
           WHERE ti.service_type = 'superette' AND ct.created_at BETWEEN :start AND :end`,
          { replacements: { start: today, end: tomorrow }, type: sq.QueryTypes.SELECT }
        );
        const superetteMonth = await sq.query(
          `SELECT COALESCE(SUM(subtotal),0) as total FROM tab_items ti
           JOIN customer_tabs ct ON ct.id = ti.tab_id
           WHERE ti.service_type = 'superette' AND ct.created_at >= :start`,
          { replacements: { start: startOfMonth }, type: sq.QueryTypes.SELECT }
        );
        dashboard.modules.superette = {
          aujourd_hui: { total_ventes: parseInt(superetteToday[0]?.nb || 0), montant: parseFloat(superetteToday[0]?.total || 0) },
          mois: { montant: parseFloat(superetteMonth[0]?.total || 0) }
        };
      } catch (e) { /* silent */ }
    }

    // ── Pressing ──────────────────────────────────────────────────────────────
    if (['admin', 'super_admin', 'gerant', 'serveur', 'serveuse', 'receptionniste', 'maitre_nageur', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      try {
        const todayPressing = await PressingOrder.findAll({ where: { created_at: { [Op.between]: [today, tomorrow] }, status: 'paye' } });
        const monthPressing = await PressingOrder.findAll({ where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] }, status: 'paye' } });
        dashboard.modules.pressing = {
          aujourd_hui: { total_commandes: todayPressing.length, montant: todayPressing.reduce((s, p) => s + parseFloat(p.amount || 0), 0) },
          mois: { total_commandes: monthPressing.length, montant: monthPressing.reduce((s, p) => s + parseFloat(p.amount || 0), 0) }
        };
      } catch (e) { /* table may not exist yet */ }
    }

    // ── Dépôt ─────────────────────────────────────────────────────────────────
    if (['admin', 'super_admin', 'gerant', 'serveur', 'serveuse', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      try {
        const todayDepot = await DepotSale.findAll({ where: { created_at: { [Op.between]: [today, tomorrow] } } });
        const totalCreditEnCours = await DepotClient.sum('credit_balance', { where: { is_active: true } });
        dashboard.modules.depot = {
          aujourd_hui: {
            total_ventes: todayDepot.length,
            total_cash: todayDepot.filter(d => d.payment_method !== 'credit').reduce((s, d) => s + parseFloat(d.total_amount || 0), 0),
            total_credit: todayDepot.filter(d => d.payment_method === 'credit').reduce((s, d) => s + parseFloat(d.total_amount || 0), 0)
          },
          total_credit_en_cours: { total_en_cours: parseFloat(totalCreditEnCours || 0) }
        };
      } catch (e) { /* table may not exist yet */ }
    }

    if (['admin', 'super_admin', 'gerant', 'responsable', 'directeur', 'maire'].includes(req.user.role)) {
      const pendingCashRegisters = await CashRegister.count({ where: { ...cf, status: 'en_attente' } });
      const activeUsers = await User.count({ where: { ...cf, is_active: true } });

      let caJour = 0;
      if (dashboard.modules.piscine) caJour += dashboard.modules.piscine.aujourd_hui.montant;
      if (dashboard.modules.restaurant) caJour += dashboard.modules.restaurant.aujourd_hui.montant;
      if (dashboard.modules.lavage) caJour += dashboard.modules.lavage.aujourd_hui.montant;
      if (dashboard.modules.maquis) caJour += dashboard.modules.maquis.aujourd_hui.montant;
      if (dashboard.modules.superette) caJour += dashboard.modules.superette.aujourd_hui.montant;
      if (dashboard.modules.pressing) caJour += dashboard.modules.pressing.aujourd_hui.montant;

      let caMois = 0;
      if (dashboard.modules.piscine) caMois += dashboard.modules.piscine.mois.montant;
      if (dashboard.modules.restaurant) caMois += dashboard.modules.restaurant.mois.montant;
      if (dashboard.modules.lavage) caMois += dashboard.modules.lavage.mois.montant;
      if (dashboard.modules.maquis) caMois += dashboard.modules.maquis.mois.montant;
      if (dashboard.modules.superette) caMois += dashboard.modules.superette.mois.montant;
      if (dashboard.modules.pressing) caMois += dashboard.modules.pressing.mois.montant;

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

    // ── Dépenses (toujours incluses dans les rapports) ─────────────────────
    try {
      if (Expense) {
        const expenses = await Expense.findAll({
          where: { ...cf, created_at: { [Op.between]: [startDate, endDate] } }
        });
        const byCategory = {};
        expenses.forEach(e => {
          const cat = e.category || 'Autres';
          if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
          byCategory[cat].count++;
          byCategory[cat].total += parseFloat(e.amount || 0);
        });
        const totalDepenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        report.modules.depenses = {
          count: expenses.length,
          total: totalDepenses,
          par_categorie: byCategory
        };
        // Calcul bénéfice net
        const totalCA = (report.modules.piscine?.tickets?.total || 0) +
          (report.modules.piscine?.abonnements?.total || 0) +
          (report.modules.restaurant?.ventes?.total || 0) +
          (report.modules.hotel?.reservations?.total || 0);
        report.bilan = { total_ca: totalCA, total_depenses: totalDepenses, benefice_net: totalCA - totalDepenses };
      }
    } catch (e) { /* Expense table may not be loaded */ }

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
