const { Op } = require('sequelize');
const {
  User, Ticket, Subscription, Sale, Reservation,
  Event, Quote, CashRegister, Expense, UserLayout, DepotSale, DepotClient
} = require('../models');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

// Roles avec acces complet aux rapports
const FULL_ACCESS_ROLES = ['admin', 'gerant', 'responsable', 'directeur', 'maire'];

// Mapping role -> module
const ROLE_MODULE_MAP = {
  'maitre_nageur': 'piscine',
  'serveuse': 'restaurant',
  'serveur': 'restaurant',
  'receptionniste': 'hotel',
  'gestionnaire_events': 'events'
};

/**
 * GET /api/reports/transactions
 * Rapport détaillé des transactions avec filtres
 * Les employes ne voient que leurs propres transactions dans leur module
 */
const getTransactionsReport = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      module,
      user_id,
      payment_method,
      min_amount,
      max_amount,
      sort_by = 'date',
      sort_order = 'DESC',
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = end_date ? new Date(end_date) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const cf = getCompanyFilter(req);

    // Determiner les restrictions basees sur le role
    const userRole = req.user.role;
    const hasFullAccess = FULL_ACCESS_ROLES.includes(userRole);

    // Pour les employes: filtrer par leur module et leur user_id uniquement
    let restrictedModule = module;
    let restrictedUserId = user_id;

    if (!hasFullAccess) {
      // L'employe ne peut voir que son propre module
      restrictedModule = ROLE_MODULE_MAP[userRole];
      // L'employe ne peut voir que ses propres transactions
      restrictedUserId = req.user.id;
    }

    let transactions = [];

    // Récupérer les tickets piscine
    if (!restrictedModule || restrictedModule === 'piscine') {
      const tickets = await Ticket.findAll({
        where: {
          ...cf,
          created_at: { [Op.between]: [startDate, endDate] },
          ...(restrictedUserId && { user_id: restrictedUserId }),
          ...(payment_method && { payment_method })
        },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'username'] }]
      });

      tickets.forEach(t => {
        const amount = parseFloat(t.total);
        if ((!min_amount || amount >= parseFloat(min_amount)) && (!max_amount || amount <= parseFloat(max_amount))) {
          transactions.push({
            id: `ticket_${t.id}`,
            date: t.created_at,
            time: new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            module: 'Piscine',
            type: `Ticket ${t.type}`,
            description: `${t.quantity} ticket(s) ${t.type}`,
            quantity: t.quantity,
            unit_price: parseFloat(t.unit_price),
            amount: amount,
            payment_method: t.payment_method,
            user_id: t.user_id,
            user_name: t.user?.full_name || 'N/A',
            reference: `TKT-${t.id}`
          });
        }
      });
    }

    // Récupérer les abonnements piscine
    if (!restrictedModule || restrictedModule === 'piscine') {
      const subscriptions = await Subscription.findAll({
        where: {
          ...cf,
          created_at: { [Op.between]: [startDate, endDate] },
          ...(restrictedUserId && { user_id: restrictedUserId })
        },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'username'] }]
      });

      subscriptions.forEach(s => {
        const amount = parseFloat(s.price);
        if ((!min_amount || amount >= parseFloat(min_amount)) && (!max_amount || amount <= parseFloat(max_amount))) {
          transactions.push({
            id: `sub_${s.id}`,
            date: s.created_at,
            time: new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            module: 'Piscine',
            type: `Abonnement ${s.type}`,
            description: `Abonnement ${s.type} - ${s.client_name}`,
            quantity: 1,
            unit_price: amount,
            amount: amount,
            payment_method: 'especes',
            user_id: s.user_id,
            user_name: s.user?.full_name || 'N/A',
            reference: `ABO-${s.id}`,
            client_name: s.client_name
          });
        }
      });
    }

    // Récupérer les ventes restaurant
    if (!restrictedModule || restrictedModule === 'restaurant') {
      const sales = await Sale.findAll({
        where: {
          ...cf,
          created_at: { [Op.between]: [startDate, endDate] },
          ...(restrictedUserId && { user_id: restrictedUserId }),
          ...(payment_method && { payment_method })
        },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'username'] }]
      });

      sales.forEach(s => {
        const amount = parseFloat(s.total);
        if ((!min_amount || amount >= parseFloat(min_amount)) && (!max_amount || amount <= parseFloat(max_amount))) {
          const items = s.items || [];
          const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
          transactions.push({
            id: `sale_${s.id}`,
            date: s.created_at,
            time: new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            module: 'Restaurant',
            type: 'Vente',
            description: `Commande ${s.table_number ? `Table ${s.table_number}` : ''} - ${itemCount} article(s)`,
            quantity: itemCount,
            unit_price: amount / (itemCount || 1),
            amount: amount,
            payment_method: s.payment_method,
            user_id: s.user_id,
            user_name: s.user?.full_name || 'N/A',
            reference: `VTE-${s.id}`,
            table_number: s.table_number
          });
        }
      });
    }

    // Récupérer les réservations hôtel
    if (!restrictedModule || restrictedModule === 'hotel') {
      const reservations = await Reservation.findAll({
        where: {
          ...cf,
          created_at: { [Op.between]: [startDate, endDate] },
          ...(restrictedUserId && { user_id: restrictedUserId }),
          status: { [Op.ne]: 'annulee' }
        },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'username'] }]
      });

      reservations.forEach(r => {
        const amount = parseFloat(r.total_price);
        if ((!min_amount || amount >= parseFloat(min_amount)) && (!max_amount || amount <= parseFloat(max_amount))) {
          transactions.push({
            id: `res_${r.id}`,
            date: r.created_at,
            time: new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            module: 'Hotel',
            type: 'Reservation',
            description: `${r.nights} nuit(s) - ${r.client_name}`,
            quantity: r.nights,
            unit_price: amount / r.nights,
            amount: amount,
            payment_method: 'acompte',
            user_id: r.user_id,
            user_name: r.user?.full_name || 'N/A',
            reference: `RES-${r.id}`,
            client_name: r.client_name,
            deposit_paid: r.deposit_paid
          });
        }
      });
    }

    // Récupérer les événements
    if (!restrictedModule || restrictedModule === 'events') {
      const events = await Event.findAll({
        where: {
          ...cf,
          created_at: { [Op.between]: [startDate, endDate] },
          ...(restrictedUserId && { user_id: restrictedUserId })
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'full_name', 'username'] },
          { model: Quote, as: 'quotes' }
        ]
      });

      events.forEach(e => {
        const quotesTotal = e.quotes?.reduce((sum, q) => sum + parseFloat(q.total || 0), 0) || 0;
        const amount = quotesTotal || parseFloat(e.price || 0);
        if ((!min_amount || amount >= parseFloat(min_amount)) && (!max_amount || amount <= parseFloat(max_amount))) {
          transactions.push({
            id: `evt_${e.id}`,
            date: e.created_at,
            time: new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            module: 'Evenements',
            type: e.space,
            description: `${e.name} - ${e.client_name}`,
            quantity: e.guest_count || 1,
            unit_price: amount / (e.guest_count || 1),
            amount: amount,
            payment_method: 'devis',
            user_id: e.user_id,
            user_name: e.user?.full_name || 'N/A',
            reference: `EVT-${e.id}`,
            client_name: e.client_name,
            status: e.status
          });
        }
      });
    }

    // Récupérer les ventes dépôt
    if (!restrictedModule || restrictedModule === 'depot') {
      try {
        const depotSales = await DepotSale.findAll({
          where: {
            ...cf,
            created_at: { [Op.between]: [startDate, endDate] },
            ...(restrictedUserId && { user_id: restrictedUserId }),
            ...(payment_method && { payment_method })
          },
          include: [
            { model: User, as: 'user', attributes: ['id', 'full_name', 'username'] },
            { model: DepotClient, as: 'client', attributes: ['id', 'name'] }
          ]
        });

        depotSales.forEach(ds => {
          const amount = parseFloat(ds.total_amount);
          if ((!min_amount || amount >= parseFloat(min_amount)) && (!max_amount || amount <= parseFloat(max_amount))) {
            transactions.push({
              id: `depot_${ds.id}`,
              date: ds.created_at,
              time: new Date(ds.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              module: 'Dépôt',
              type: ds.payment_method === 'credit' ? 'Vente à crédit' : 'Vente',
              description: `Vente dépôt — ${ds.client?.name || 'Client'}`,
              quantity: 1,
              unit_price: amount,
              amount: amount,
              payment_method: ds.payment_method || 'cash',
              user_id: ds.user_id,
              user_name: ds.user?.full_name || 'N/A',
              reference: `DEP-${ds.id}`,
              client_name: ds.client?.name
            });
          }
        });
      } catch (e) {
        // DepotSale model may not exist in all contexts — fail silently
      }
    }

    // Tri
    const sortField = sort_by === 'date' ? 'date' : sort_by === 'amount' ? 'amount' : sort_by === 'module' ? 'module' : 'date';
    transactions.sort((a, b) => {
      if (sortField === 'date') {
        return sort_order === 'DESC'
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      }
      if (sortField === 'amount') {
        return sort_order === 'DESC' ? b.amount - a.amount : a.amount - b.amount;
      }
      return sort_order === 'DESC'
        ? b[sortField]?.localeCompare(a[sortField])
        : a[sortField]?.localeCompare(b[sortField]);
    });

    // Pagination
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(offset, offset + parseInt(limit));

    // Statistiques
    const stats = {
      total_transactions: total,
      total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
      by_module: {},
      by_payment_method: {},
      by_user: {}
    };

    transactions.forEach(t => {
      // Par module
      if (!stats.by_module[t.module]) {
        stats.by_module[t.module] = { count: 0, amount: 0 };
      }
      stats.by_module[t.module].count++;
      stats.by_module[t.module].amount += t.amount;

      // Par méthode de paiement
      if (!stats.by_payment_method[t.payment_method]) {
        stats.by_payment_method[t.payment_method] = { count: 0, amount: 0 };
      }
      stats.by_payment_method[t.payment_method].count++;
      stats.by_payment_method[t.payment_method].amount += t.amount;

      // Par utilisateur
      if (!stats.by_user[t.user_name]) {
        stats.by_user[t.user_name] = { count: 0, amount: 0 };
      }
      stats.by_user[t.user_name].count++;
      stats.by_user[t.user_name].amount += t.amount;
    });

    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        stats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        },
        // Informations sur les restrictions appliquees
        restrictions: {
          hasFullAccess,
          restrictedModule: restrictedModule || null,
          restrictedUserId: restrictedUserId || null,
          userRole
        }
      }
    });
  } catch (error) {
    console.error('Get transactions report error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport'
    });
  }
};

/**
 * GET /api/reports/summary
 * Résumé des rapports par période
 * Restreint pour les employes a leur module
 */
const getSummaryReport = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // Determiner les restrictions basees sur le role
    const userRole = req.user.role;
    const hasFullAccess = FULL_ACCESS_ROLES.includes(userRole);
    const restrictedModule = !hasFullAccess ? ROLE_MODULE_MAP[userRole] : null;
    const restrictedUserId = !hasFullAccess ? req.user.id : null;
    const cf = getCompanyFilter(req);

    // Construire les filtres selon le role
    const userFilter = restrictedUserId ? { user_id: restrictedUserId } : {};
    const dateFilter = { created_at: { [Op.between]: [startDate, endDate] } };

    // Récupérer toutes les transactions (filtrées selon le role)
    let depotSalesForSummary = [];
    try {
      if (!restrictedModule || restrictedModule === 'depot') {
        depotSalesForSummary = await DepotSale.findAll({ where: { ...cf, ...dateFilter, ...userFilter } });
      }
    } catch { depotSalesForSummary = []; }

    const [tickets, subscriptions, sales, reservations, events, expenses] = await Promise.all([
      (!restrictedModule || restrictedModule === 'piscine') ?
        Ticket.findAll({ where: { ...cf, ...dateFilter, ...userFilter } }) : [],
      (!restrictedModule || restrictedModule === 'piscine') ?
        Subscription.findAll({ where: { ...cf, ...dateFilter, ...userFilter } }) : [],
      (!restrictedModule || restrictedModule === 'restaurant') ?
        Sale.findAll({ where: { ...cf, ...dateFilter, ...userFilter } }) : [],
      (!restrictedModule || restrictedModule === 'hotel') ?
        Reservation.findAll({ where: { ...cf, ...dateFilter, ...userFilter, status: { [Op.ne]: 'annulee' } } }) : [],
      (!restrictedModule || restrictedModule === 'events') ?
        Event.findAll({ where: { ...cf, ...dateFilter, ...userFilter }, include: [{ model: Quote, as: 'quotes' }] }) : [],
      hasFullAccess ?
        Expense.findAll({ where: { ...cf, expense_date: { [Op.between]: [startDate, endDate] } } }) : []
    ]);

    // Calculer les totaux
    const totalRevenue = {
      piscine: tickets.reduce((sum, t) => sum + parseFloat(t.total), 0) +
               subscriptions.reduce((sum, s) => sum + parseFloat(s.price), 0),
      restaurant: sales.reduce((sum, s) => sum + parseFloat(s.total), 0),
      hotel: reservations.reduce((sum, r) => sum + parseFloat(r.total_price), 0),
      events: events.reduce((sum, e) => {
        const quotesTotal = e.quotes?.reduce((s, q) => s + parseFloat(q.total || 0), 0) || 0;
        return sum + (quotesTotal || parseFloat(e.price || 0));
      }, 0),
      depot: depotSalesForSummary.reduce((sum, ds) => sum + parseFloat(ds.total_amount || 0), 0)
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalCA = Object.values(totalRevenue).reduce((a, b) => a + b, 0);
    const netProfit = totalCA - totalExpenses;

    // Grouper les dépenses par catégorie
    const expensesByCategory = {};
    expenses.forEach(e => {
      const cat = e.category || 'Autres';
      if (!expensesByCategory[cat]) expensesByCategory[cat] = { count: 0, total: 0 };
      expensesByCategory[cat].count++;
      expensesByCategory[cat].total += parseFloat(e.amount || 0);
    });

    // Grouper par période
    const groupedData = {};
    const formatDate = (date) => {
      const d = new Date(date);
      if (group_by === 'day') return d.toISOString().split('T')[0];
      if (group_by === 'week') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return `Sem. ${startOfWeek.toISOString().split('T')[0]}`;
      }
      if (group_by === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return d.toISOString().split('T')[0];
    };

    // Initialiser les périodes
    const allTransactions = [
      ...tickets.map(t => ({ date: t.created_at, module: 'piscine', amount: parseFloat(t.total) })),
      ...subscriptions.map(s => ({ date: s.created_at, module: 'piscine', amount: parseFloat(s.price) })),
      ...sales.map(s => ({ date: s.created_at, module: 'restaurant', amount: parseFloat(s.total) })),
      ...reservations.map(r => ({ date: r.created_at, module: 'hotel', amount: parseFloat(r.total_price) })),
      ...events.map(e => ({ date: e.created_at, module: 'events', amount: e.quotes?.reduce((s, q) => s + parseFloat(q.total || 0), 0) || parseFloat(e.price || 0) })),
      ...depotSalesForSummary.map(ds => ({ date: ds.created_at, module: 'depot', amount: parseFloat(ds.total_amount || 0) }))
    ];

    allTransactions.forEach(t => {
      const period = formatDate(t.date);
      if (!groupedData[period]) {
        groupedData[period] = { piscine: 0, restaurant: 0, hotel: 0, events: 0, depot: 0, total: 0 };
      }
      groupedData[period][t.module] += t.amount;
      groupedData[period].total += t.amount;
    });

    // Convertir en tableau trié
    const timeline = Object.entries(groupedData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data }));

    res.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        totals: {
          revenue: totalRevenue,
          total_ca: totalCA,
          expenses: totalExpenses,
          expenses_by_category: expensesByCategory,
          net_profit: netProfit,
          profit_margin: totalCA > 0 ? ((netProfit / totalCA) * 100).toFixed(1) : 0
        },
        counts: {
          tickets: tickets.length,
          subscriptions: subscriptions.length,
          sales: sales.length,
          reservations: reservations.length,
          events: events.length,
          expenses: expenses.length,
          depot_sales: depotSalesForSummary.length
        },
        timeline
      }
    });
  } catch (error) {
    console.error('Get summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du résumé'
    });
  }
};

/**
 * GET /api/reports/layouts
 * Récupérer les layouts de l'utilisateur
 */
const getUserLayouts = async (req, res) => {
  try {
    const layouts = await UserLayout.findAll({
      where: { user_id: req.user.id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: layouts
    });
  } catch (error) {
    console.error('Get user layouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des layouts'
    });
  }
};

/**
 * POST /api/reports/layouts
 * Créer un nouveau layout
 */
const createLayout = async (req, res) => {
  try {
    const { layout_name, columns, filters, sort_by, sort_order, rows_per_page, is_default } = req.body;

    // Si c'est le layout par défaut, retirer le statut des autres
    if (is_default) {
      await UserLayout.update(
        { is_default: false },
        { where: { user_id: req.user.id } }
      );
    }

    const layout = await UserLayout.create({
      user_id: req.user.id,
      layout_name: layout_name || 'Mon Layout',
      layout_type: 'reports',
      columns: columns || ['date', 'module', 'type', 'quantity', 'time', 'amount', 'user'],
      filters,
      sort_by: sort_by || 'date',
      sort_order: sort_order || 'DESC',
      rows_per_page: rows_per_page || 50,
      is_default: is_default || false
    });

    res.status(201).json({
      success: true,
      message: 'Layout créé',
      data: layout
    });
  } catch (error) {
    console.error('Create layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du layout'
    });
  }
};

/**
 * PUT /api/reports/layouts/:id
 * Modifier un layout
 */
const updateLayout = async (req, res) => {
  try {
    const layout = await UserLayout.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout non trouvé'
      });
    }

    const { layout_name, columns, filters, sort_by, sort_order, rows_per_page, is_default } = req.body;

    // Si c'est le layout par défaut, retirer le statut des autres
    if (is_default) {
      await UserLayout.update(
        { is_default: false },
        { where: { user_id: req.user.id, id: { [Op.ne]: layout.id } } }
      );
    }

    await layout.update({
      layout_name: layout_name !== undefined ? layout_name : layout.layout_name,
      columns: columns !== undefined ? columns : layout.columns,
      filters: filters !== undefined ? filters : layout.filters,
      sort_by: sort_by !== undefined ? sort_by : layout.sort_by,
      sort_order: sort_order !== undefined ? sort_order : layout.sort_order,
      rows_per_page: rows_per_page !== undefined ? rows_per_page : layout.rows_per_page,
      is_default: is_default !== undefined ? is_default : layout.is_default
    });

    res.json({
      success: true,
      message: 'Layout mis à jour',
      data: layout
    });
  } catch (error) {
    console.error('Update layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du layout'
    });
  }
};

/**
 * DELETE /api/reports/layouts/:id
 * Supprimer un layout
 */
const deleteLayout = async (req, res) => {
  try {
    const layout = await UserLayout.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout non trouvé'
      });
    }

    await layout.destroy();

    res.json({
      success: true,
      message: 'Layout supprimé'
    });
  } catch (error) {
    console.error('Delete layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du layout'
    });
  }
};

/**
 * GET /api/reports/users
 * Liste des utilisateurs pour les filtres
 * Les employes ne peuvent pas filtrer par utilisateur (ils voient que leurs propres transactions)
 */
const getReportUsers = async (req, res) => {
  try {
    const userRole = req.user.role;
    const hasFullAccess = FULL_ACCESS_ROLES.includes(userRole);

    // Les employes ne peuvent voir que leur propre utilisateur
    if (!hasFullAccess) {
      res.json({
        success: true,
        data: [{
          id: req.user.id,
          full_name: req.user.full_name,
          username: req.user.username,
          role: req.user.role
        }],
        restrictions: { canFilterByUser: false }
      });
      return;
    }

    const cfUsers = getCompanyFilter(req);
    const users = await User.findAll({
      attributes: ['id', 'full_name', 'username', 'role'],
      where: { is_active: true, ...cfUsers },
      order: [['full_name', 'ASC']]
    });

    res.json({
      success: true,
      data: users,
      restrictions: { canFilterByUser: true }
    });
  } catch (error) {
    console.error('Get report users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

module.exports = {
  getTransactionsReport,
  getSummaryReport,
  getUserLayouts,
  createLayout,
  updateLayout,
  deleteLayout,
  getReportUsers
};
