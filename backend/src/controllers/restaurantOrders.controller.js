const { Op } = require('sequelize');
const {
  RestaurantOrder, RestaurantOrderItem, RestaurantTable,
  RestaurantNotification, MenuItem, User
} = require('../models');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

// ─── Helpers ────────────────────────────────────────────────────────────────

const orderWithDetails = {
  include: [
    { model: RestaurantTable, as: 'table', attributes: ['id', 'numero', 'capacite', 'statut'] },
    { model: RestaurantOrderItem, as: 'items' },
    { model: User, as: 'serveuse', attributes: ['id', 'full_name', 'role'] },
    { model: User, as: 'cuisinier', attributes: ['id', 'full_name', 'role'] }
  ]
};

async function notifyUsers(companyId, orderId, type, message, userIds) {
  const notifs = userIds.filter(Boolean).map(uid => ({
    company_id: companyId,
    order_id: orderId,
    destinataire_id: uid,
    type,
    message
  }));
  if (notifs.length) await RestaurantNotification.bulkCreate(notifs);
}

// ─── COMMANDES ──────────────────────────────────────────────────────────────

// GET /orders  — liste des commandes (avec filtres)
const getOrders = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { statut, date, table_id } = req.query;
    const where = { ...cf };
    if (statut) where.statut = statut;
    if (table_id) where.table_id = table_id;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      where.created_at = { [Op.between]: [start, end] };
    }
    const orders = await RestaurantOrder.findAll({
      where,
      ...orderWithDetails,
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('getOrders:', err);
    res.status(500).json({ success: false, message: 'Erreur récupération commandes' });
  }
};

// GET /orders/active  — commandes non payées (pour caisse et cuisine)
const getActiveOrders = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const orders = await RestaurantOrder.findAll({
      where: { ...cf, statut: { [Op.in]: ['nouvelle', 'en_preparation', 'prete'] } },
      ...orderWithDetails,
      order: [['created_at', 'ASC']]
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('getActiveOrders:', err);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// GET /orders/:id
const getOrderById = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const order = await RestaurantOrder.findOne({
      where: { id: req.params.id, ...cf },
      ...orderWithDetails
    });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// POST /orders  — créer une commande (serveuse)
const createOrder = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { table_id, order_type, items, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Au moins un plat requis' });
    }

    // Calcul total
    const total = items.reduce((sum, it) => sum + (it.prix_unitaire * it.quantite), 0);

    const order = await RestaurantOrder.create({
      ...cf,
      table_id: table_id || null,
      order_type: order_type || 'table',
      serveuse_id: req.user.id,
      statut: 'nouvelle',
      total,
      notes: notes || null
    });

    // Créer les lignes
    const orderItems = items.map(it => ({
      order_id: order.id,
      menu_item_id: it.menu_item_id || null,
      nom_plat: it.nom_plat || it.name,
      quantite: it.quantite,
      prix_unitaire: it.prix_unitaire,
      sous_total: it.prix_unitaire * it.quantite
    }));
    await RestaurantOrderItem.bulkCreate(orderItems);

    // Marquer la table occupée
    if (table_id) {
      await RestaurantTable.update({ statut: 'occupee' }, { where: { id: table_id, ...cf } });
    }

    const full = await RestaurantOrder.findByPk(order.id, orderWithDetails);
    res.status(201).json({ success: true, data: full, message: 'Commande créée' });
  } catch (err) {
    console.error('createOrder:', err);
    res.status(500).json({ success: false, message: 'Erreur création commande' });
  }
};

// PUT /orders/:id/acknowledge  — cuisinier accuse réception
const acknowledgeOrder = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { temps_preparation } = req.body;

    if (![15, 25, 45].includes(Number(temps_preparation))) {
      return res.status(400).json({ success: false, message: 'Temps invalide (15, 25 ou 45 min)' });
    }

    const order = await RestaurantOrder.findOne({ where: { id: req.params.id, ...cf } });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.statut !== 'nouvelle') {
      return res.status(400).json({ success: false, message: 'Commande déjà prise en charge' });
    }

    await order.update({
      statut: 'en_preparation',
      cuisinier_id: req.user.id,
      temps_preparation: Number(temps_preparation)
    });

    // Notifier la serveuse
    const msg = `Table ${order.table_id ? '#' + order.table_id : ''} — En préparation : ${temps_preparation} min`;
    await notifyUsers(order.company_id, order.id, 'preparation', msg, [order.serveuse_id]);

    const full = await RestaurantOrder.findByPk(order.id, orderWithDetails);
    res.json({ success: true, data: full, message: 'Accusé réception envoyé' });
  } catch (err) {
    console.error('acknowledgeOrder:', err);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// PUT /orders/:id/ready  — cuisinier clique "Prêt à servir"
const markReady = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const order = await RestaurantOrder.findOne({
      where: { id: req.params.id, ...cf },
      include: [{ model: RestaurantTable, as: 'table' }]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.statut !== 'en_preparation') {
      return res.status(400).json({ success: false, message: 'Commande pas encore en préparation' });
    }

    await order.update({ statut: 'prete' });

    // Notifier la serveuse
    const tableNum = order.table ? `Table ${order.table.numero}` : 'Commande';
    const msg = `${tableNum} — Prêt à servir ! 🍽️`;
    await notifyUsers(order.company_id, order.id, 'prete', msg, [order.serveuse_id]);

    const full = await RestaurantOrder.findByPk(order.id, orderWithDetails);
    res.json({ success: true, data: full, message: 'Commande marquée prête' });
  } catch (err) {
    console.error('markReady:', err);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// PUT /orders/:id/pay  — caissière encaisse
const payOrder = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { mode_paiement } = req.body;

    if (!mode_paiement) {
      return res.status(400).json({ success: false, message: 'Mode de paiement requis' });
    }

    const order = await RestaurantOrder.findOne({ where: { id: req.params.id, ...cf } });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.statut === 'payee') {
      return res.status(400).json({ success: false, message: 'Commande déjà payée' });
    }

    await order.update({ statut: 'payee', mode_paiement, paid_at: new Date() });

    // Libérer la table si plus de commandes actives
    if (order.table_id) {
      const activeCount = await RestaurantOrder.count({
        where: {
          table_id: order.table_id,
          statut: { [Op.in]: ['nouvelle', 'en_preparation', 'prete'] }
        }
      });
      if (activeCount === 0) {
        await RestaurantTable.update({ statut: 'libre' }, { where: { id: order.table_id } });
      }
    }

    const full = await RestaurantOrder.findByPk(order.id, orderWithDetails);
    res.json({ success: true, data: full, message: 'Paiement enregistré' });
  } catch (err) {
    console.error('payOrder:', err);
    res.status(500).json({ success: false, message: 'Erreur paiement' });
  }
};

// GET /orders/stats/caisse  — montant global caisse restaurant du jour
const getCaisseStats = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const { sequelize } = require('../models');
    const result = await RestaurantOrder.findAll({
      where: {
        ...cf,
        statut: 'payee',
        paid_at: { [Op.between]: [today, tomorrow] }
      },
      attributes: [
        'mode_paiement',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total']
      ],
      group: ['mode_paiement'],
      raw: true
    });

    const totalJour = result.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    res.json({ success: true, data: { totalJour, byMode: result } });
  } catch (err) {
    console.error('getCaisseStats:', err);
    res.status(500).json({ success: false, message: 'Erreur stats caisse' });
  }
};

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

// GET /notifications  — polling serveuse
const getNotifications = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const notifs = await RestaurantNotification.findAll({
      where: { ...cf, destinataire_id: req.user.id, is_read: false },
      include: [{ model: RestaurantOrder, as: 'order', include: [{ model: RestaurantTable, as: 'table' }] }],
      order: [['created_at', 'DESC']],
      limit: 20
    });
    res.json({ success: true, data: notifs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur notifications' });
  }
};

// PUT /notifications/read  — marquer lues
const markNotificationsRead = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    await RestaurantNotification.update(
      { is_read: true },
      { where: { ...cf, destinataire_id: req.user.id, is_read: false } }
    );
    res.json({ success: true, message: 'Notifications marquées lues' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

module.exports = {
  getOrders,
  getActiveOrders,
  getOrderById,
  createOrder,
  acknowledgeOrder,
  markReady,
  payOrder,
  getCaisseStats,
  getNotifications,
  markNotificationsRead
};
