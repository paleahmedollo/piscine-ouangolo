const { PressingType, PressingOrder, CustomerTab, TabItem } = require('../models');
const { Op, sequelize } = require('../models');
const { createAccountingEntry } = require('../utils/accounting');

// ─────────────────────────────────────────────────────────────────────────────
// TYPES DE PRESSING
// ─────────────────────────────────────────────────────────────────────────────

const getPressingTypes = async (req, res) => {
  try {
    const types = await PressingType.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllPressingTypes = async (req, res) => {
  try {
    const types = await PressingType.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPressingType = async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nom et prix requis' });
    }
    const existing = await PressingType.findOne({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Ce type existe déjà' });

    const type = await PressingType.create({ name, price });
    res.json({ success: true, data: type, message: `Type "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePressingType = async (req, res) => {
  try {
    const type = await PressingType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type non trouvé' });
    await type.update(req.body);
    res.json({ success: true, data: type, message: 'Mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePressingType = async (req, res) => {
  try {
    const type = await PressingType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type non trouvé' });
    await type.update({ is_active: false });
    res.json({ success: true, message: 'Type désactivé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMANDES PRESSING
// ─────────────────────────────────────────────────────────────────────────────

const createOrder = async (req, res) => {
  try {
    const { customer_name, customer_phone, notes, items } = req.body;

    if (!customer_name) {
      return res.status(400).json({ success: false, message: 'Nom du client requis' });
    }

    // ── Support multi-articles (nouveau format) ──────────────────────────────
    if (items && Array.isArray(items) && items.length > 0) {
      // Valider chaque ligne
      const activeItems = items.filter(it => it.quantity > 0);
      if (activeItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Sélectionnez au moins un article' });
      }

      // Charger tous les types nécessaires
      const typeIds = [...new Set(activeItems.map(it => it.pressing_type_id))];
      const types = await PressingType.findAll({ where: { id: typeIds } });
      const typeMap = Object.fromEntries(types.map(t => [t.id, t]));

      // Calculer le total + construire items_json
      let totalAmount = 0;
      const itemsJson = [];
      for (const it of activeItems) {
        const t = typeMap[it.pressing_type_id];
        if (!t) return res.status(404).json({ success: false, message: `Type ${it.pressing_type_id} introuvable` });
        const lineTotal = parseFloat(t.price) * it.quantity;
        totalAmount += lineTotal;
        itemsJson.push({ pressing_type_id: t.id, name: t.name, quantity: it.quantity, unit_price: parseFloat(t.price), total: lineTotal });
      }

      // Toujours créé en_attente → paiement à la Caisse
      const order = await PressingOrder.create({
        pressing_type_id: null,           // multi-articles → pas de type unique
        customer_name, customer_phone,
        quantity: activeItems.reduce((s, it) => s + it.quantity, 0),
        amount: totalAmount,
        items_json: JSON.stringify(itemsJson),
        status: 'en_attente',
        user_id: req.user?.id, notes
      });

      // Recharger avec association pressingType (null pour multi)
      const orderData = order.toJSON();
      orderData.itemsParsed = itemsJson;

      return res.json({
        success: true, data: orderData,
        message: `🎫 Ticket créé — ${itemsJson.length} article(s) — ${totalAmount.toLocaleString()} FCFA à la Caisse`
      });
    }

    // ── Compatibilité ancien format (pressing_type_id unique) ────────────────
    const { pressing_type_id, quantity } = req.body;
    if (!pressing_type_id) {
      return res.status(400).json({ success: false, message: 'Articles requis' });
    }
    const pressingType = await PressingType.findByPk(pressing_type_id);
    if (!pressingType) return res.status(404).json({ success: false, message: 'Type de pressing non trouvé' });
    const qty = parseInt(quantity) || 1;
    const amount = parseFloat(pressingType.price) * qty;
    const itemsJson = JSON.stringify([{ pressing_type_id: pressingType.id, name: pressingType.name, quantity: qty, unit_price: parseFloat(pressingType.price), total: amount }]);

    const order = await PressingOrder.create({
      pressing_type_id, customer_name, customer_phone,
      quantity: qty, amount, items_json: itemsJson,
      status: 'en_attente',
      user_id: req.user?.id, notes
    });

    return res.json({ success: true, data: order, message: `🎫 Ticket créé — ${pressingType.name} pour ${customer_name}` });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const { date, start_date, end_date, status } = req.query;
    let where = {};

    if (status) where.status = status;

    if (date) {
      where.created_at = {
        [Op.gte]: new Date(date + 'T00:00:00'),
        [Op.lte]: new Date(date + 'T23:59:59')
      };
    } else if (start_date && end_date) {
      where.created_at = {
        [Op.gte]: new Date(start_date + 'T00:00:00'),
        [Op.lte]: new Date(end_date + 'T23:59:59')
      };
    }

    const orders = await PressingOrder.findAll({
      where,
      include: [{ model: PressingType, as: 'pressingType' }],
      order: [['created_at', 'DESC']],
      limit: 200
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPressingStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_commandes,
        COALESCE(SUM(CASE WHEN status = 'paye' THEN amount ELSE 0 END), 0) as total_cash,
        COUNT(CASE WHEN status = 'tab' THEN 1 END) as tab_count
      FROM pressing_orders
      WHERE DATE(created_at) = :today
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    const [monthStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_commandes,
        COALESCE(SUM(CASE WHEN status = 'paye' THEN amount ELSE 0 END), 0) as total_cash
      FROM pressing_orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, { type: sequelize.QueryTypes.SELECT });

    const typeStats = await sequelize.query(`
      SELECT pt.name, COUNT(po.id) as nb_commandes,
             COALESCE(SUM(po.amount), 0) as total
      FROM pressing_types pt
      LEFT JOIN pressing_orders po ON pt.id = po.pressing_type_id
        AND DATE(po.created_at) = :today
      WHERE pt.is_active = true
      GROUP BY pt.id, pt.name
      ORDER BY pt.name
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        today: todayStats,
        month: monthStats,
        by_type: typeStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const payPressingOrder = async (req, res) => {
  try {
    const { payment_method } = req.body;
    const order = await PressingOrder.findByPk(req.params.id, {
      include: [{ model: PressingType, as: 'pressingType' }]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    if (order.status === 'paye') return res.status(400).json({ success: false, message: 'Déjà payé' });
    if (order.status === 'tab') return res.status(400).json({ success: false, message: 'Sur un onglet — fermez l\'onglet' });

    await order.update({
      status: 'paye',
      payment_method: payment_method || 'especes',
      updated_at: new Date()
    });

    await order.reload({ include: [{ model: PressingType, as: 'pressingType' }] });
    res.json({ success: true, data: order, message: `✅ Payé — ${parseFloat(order.amount).toLocaleString()} FCFA` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPressingTypes, getAllPressingTypes,
  createPressingType, updatePressingType, deletePressingType,
  createOrder, payPressingOrder, getOrders, getPressingStats
};
