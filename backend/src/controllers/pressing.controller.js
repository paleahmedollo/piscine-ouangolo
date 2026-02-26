const { PressingType, PressingOrder, CustomerTab, TabItem } = require('../models');
const { Op, sequelize } = require('../models');

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
    const {
      pressing_type_id, customer_name, customer_phone,
      quantity, payment_method, tab_id, notes
    } = req.body;

    if (!customer_name) {
      return res.status(400).json({ success: false, message: 'Nom du client requis' });
    }
    if (!pressing_type_id) {
      return res.status(400).json({ success: false, message: 'Type de pressing requis' });
    }

    const pressingType = await PressingType.findByPk(pressing_type_id);
    if (!pressingType) return res.status(404).json({ success: false, message: 'Type de pressing non trouvé' });

    const qty = parseInt(quantity) || 1;
    const amount = parseFloat(pressingType.price) * qty;

    if (tab_id) {
      // Ajouter à un onglet client
      const tab = await CustomerTab.findByPk(tab_id);
      if (!tab || tab.status !== 'ouvert') {
        return res.status(400).json({ success: false, message: 'Onglet invalide ou déjà fermé' });
      }

      const order = await PressingOrder.create({
        pressing_type_id, customer_name, customer_phone,
        quantity: qty, amount,
        status: 'tab', tab_id,
        user_id: req.user?.id, notes
      });

      await TabItem.create({
        tab_id,
        service_type: 'pressing',
        item_name: `${pressingType.name} x${qty} (${customer_name})`,
        quantity: qty,
        unit_price: pressingType.price,
        subtotal: amount,
        reference_id: order.id
      });

      await tab.update({ total_amount: parseFloat(tab.total_amount) + amount });
      return res.json({ success: true, data: order, message: `Pressing ajouté à l'onglet — ${amount.toLocaleString()} FCFA` });
    }

    // Paiement direct
    const order = await PressingOrder.create({
      pressing_type_id, customer_name, customer_phone,
      quantity: qty, amount,
      payment_method: payment_method || 'especes',
      status: 'paye',
      user_id: req.user?.id, notes
    });

    res.json({ success: true, data: order, message: `Commande enregistrée — ${amount.toLocaleString()} FCFA` });
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

module.exports = {
  getPressingTypes, getAllPressingTypes,
  createPressingType, updatePressingType, deletePressingType,
  createOrder, getOrders, getPressingStats
};
