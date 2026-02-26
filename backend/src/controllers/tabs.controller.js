const { CustomerTab, TabItem } = require('../models');
const { Op } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// ONGLETS CLIENTS (cross-service billing)
// ─────────────────────────────────────────────────────────────────────────────

const createTab = async (req, res) => {
  try {
    const { customer_name, customer_info, notes, service_type } = req.body;
    if (!customer_name) {
      return res.status(400).json({ success: false, message: 'Nom du client requis' });
    }
    const tab = await CustomerTab.create({
      customer_name, customer_info, notes,
      service_type: service_type || null,
      user_id: req.user?.id,
      status: 'ouvert',
      total_amount: 0
    });
    res.json({ success: true, data: tab, message: `Onglet ouvert pour ${customer_name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOpenTabs = async (req, res) => {
  try {
    const { service_type } = req.query;
    const where = { status: 'ouvert' };
    // Filtrer par module si précisé (pressing, depot, lavage, maquis...)
    if (service_type) where.service_type = service_type;
    const tabs = await CustomerTab.findAll({
      where,
      include: [{ model: TabItem, as: 'items' }],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: tabs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTab = async (req, res) => {
  try {
    const tab = await CustomerTab.findByPk(req.params.id, {
      include: [{ model: TabItem, as: 'items' }]
    });
    if (!tab) return res.status(404).json({ success: false, message: 'Onglet non trouvé' });
    res.json({ success: true, data: tab });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addItemToTab = async (req, res) => {
  try {
    const { service_type, item_name, quantity, unit_price, reference_id, notes } = req.body;
    const tab = await CustomerTab.findByPk(req.params.id);
    if (!tab || tab.status !== 'ouvert') {
      return res.status(400).json({ success: false, message: 'Onglet invalide ou déjà fermé' });
    }
    const subtotal = parseFloat(quantity) * parseFloat(unit_price);
    const item = await TabItem.create({
      tab_id: tab.id, service_type, item_name,
      quantity, unit_price, subtotal, reference_id, notes
    });
    await tab.update({ total_amount: parseFloat(tab.total_amount) + subtotal });
    res.json({ success: true, data: item, message: 'Article ajouté à l\'onglet' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const closeTab = async (req, res) => {
  try {
    const { payment_method, payment_operator, payment_reference } = req.body;
    if (!payment_method) {
      return res.status(400).json({ success: false, message: 'Mode de paiement requis' });
    }
    const tab = await CustomerTab.findByPk(req.params.id, {
      include: [{ model: TabItem, as: 'items' }]
    });
    if (!tab || tab.status !== 'ouvert') {
      return res.status(400).json({ success: false, message: 'Onglet invalide ou déjà fermé' });
    }
    await tab.update({
      status: 'ferme',
      payment_method, payment_operator, payment_reference,
      closed_at: new Date()
    });
    res.json({
      success: true, data: tab,
      message: `Onglet fermé — Total: ${parseFloat(tab.total_amount).toLocaleString()} FCFA`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTabs = async (req, res) => {
  try {
    const { date, status, start_date, end_date } = req.query;
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
    const tabs = await CustomerTab.findAll({
      where,
      include: [{ model: TabItem, as: 'items' }],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: tabs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createTab, getOpenTabs, getTab, addItemToTab, closeTab, getTabs };
