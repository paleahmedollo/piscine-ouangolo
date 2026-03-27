const { Product, StockMovement, Supplier, Purchase, PurchaseItem, CustomerTab, TabItem, Sale, User } = require('../models');
const { Op, sequelize } = require('../models');
const { createAccountingEntry } = require('../utils/accounting');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// PRODUITS SUPERETTE
// ─────────────────────────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const { category, active_only, search } = req.query;
    let where = { service_type: 'superette' };
    if (active_only === 'true') where.is_active = true;
    if (category) where.category = category;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const products = await Product.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, category, buy_price, sell_price, unit, min_stock, description } = req.body;
    if (!name || !category || sell_price === undefined) {
      return res.status(400).json({ success: false, message: 'Nom, catégorie et prix de vente requis' });
    }
    const product = await Product.create({
      name, category, service_type: 'superette',
      buy_price: buy_price || 0, sell_price,
      unit: unit || 'unité', min_stock: min_stock || 0,
      description, current_stock: 0
    });
    res.json({ success: true, data: product, message: `Produit "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, service_type: 'superette' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    await product.update(req.body);
    res.json({ success: true, data: product, message: 'Produit mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, service_type: 'superette' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    await product.update({ is_active: false });
    res.json({ success: true, message: `"${product.name}" désactivé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VENTES (CAISSE)
// ─────────────────────────────────────────────────────────────────────────────

const createSale = async (req, res) => {
  try {
    const { items, tab_id, payment_method, payment_operator, payment_reference, notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Articles requis' });
    }

    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'superette', is_active: true } });
      if (!product) return res.status(404).json({ success: false, message: `Produit ID ${item.product_id} introuvable` });
      if (parseFloat(product.current_stock) < item.quantity) {
        return res.status(400).json({ success: false, message: `Stock insuffisant pour "${product.name}"` });
      }
      const subtotal = parseFloat(product.sell_price) * item.quantity;
      totalAmount += subtotal;
      orderItems.push({ product, quantity: item.quantity, subtotal });
    }

    if (tab_id) {
      const tab = await CustomerTab.findByPk(tab_id);
      if (!tab || tab.status !== 'ouvert') {
        return res.status(400).json({ success: false, message: 'Onglet invalide ou fermé' });
      }
      for (const item of orderItems) {
        await TabItem.create({
          tab_id,
          service_type: 'superette',
          item_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.sell_price,
          subtotal: item.subtotal
        });
        await item.product.decrement('current_stock', { by: item.quantity });
        await StockMovement.create({
          product_id: item.product.id, type: 'OUT', quantity: item.quantity,
          unit_price: item.product.sell_price,
          reason: `Vente superette (onglet #${tab_id})`,
          reference_type: 'tab', reference_id: tab_id,
          user_id: req.user?.id
        });
      }
      await tab.update({ total_amount: parseFloat(tab.total_amount) + totalAmount });
      return res.json({ success: true, message: `Articles ajoutés à l'onglet — ${totalAmount.toLocaleString()} FCFA` });
    }

    // Construire les items pour le Sale record
    const saleItems = orderItems.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.product.sell_price),
      total: item.subtotal
    }));

    // Vente directe — déduire stock
    for (const item of orderItems) {
      await item.product.decrement('current_stock', { by: item.quantity });
      await StockMovement.create({
        product_id: item.product.id, type: 'OUT', quantity: item.quantity,
        unit_price: item.product.sell_price,
        reason: 'Vente superette',
        reference_type: 'sale',
        user_id: req.user?.id
      });
    }

    // Supérette : toujours paiement direct (status: ferme), jamais de ticket ouvert vers la Caisse
    // Paiement direct (especes / mobile_money / carte) → Sale fermé + écriture comptable
    const operatorLabel = payment_operator ? payment_operator.toUpperCase() : null;
    const saleRecord = await Sale.create({
      user_id: req.user.id,
      items_json: saleItems,
      subtotal: totalAmount,
      tax: 0,
      total: totalAmount,
      payment_method: (payment_method && payment_method !== 'en_attente') ? payment_method : 'especes',
      payment_operator: payment_operator || null,
      payment_reference: payment_reference || null,
      status: 'ferme',
      module: 'superette',
      company_id: req.user.company_id
    });

    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: totalAmount,
      entry_type: 'vente',
      payment_type: payment_method,
      payment_operator: payment_operator || null,
      payment_reference: payment_reference || null,
      description: `Vente supérette${operatorLabel ? ` (${operatorLabel})` : ''}${payment_reference ? ` — Réf: ${payment_reference}` : ''}`,
      source_module: 'superette',
      source_id: saleRecord.id,
      source_type: 'sale'
    });

    res.json({ success: true, message: `Vente enregistrée — ${totalAmount.toLocaleString()} FCFA`, data: { total: totalAmount, id: saleRecord.id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK
// ─────────────────────────────────────────────────────────────────────────────

const getStock = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { service_type: 'superette', is_active: true },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStockMovements = async (req, res) => {
  try {
    const { product_id, type, start_date, end_date } = req.query;
    let where = {};
    if (product_id) where.product_id = product_id;
    if (type) where.type = type;
    if (start_date && end_date) {
      where.created_at = {
        [Op.gte]: new Date(start_date + 'T00:00:00'),
        [Op.lte]: new Date(end_date + 'T23:59:59')
      };
    }
    const movements = await StockMovement.findAll({
      where,
      include: [{ model: Product, as: 'product', where: { service_type: 'superette' } }],
      order: [['created_at', 'DESC']],
      limit: 200
    });
    res.json({ success: true, data: movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Inventaire: adjustment manuel du stock
const adjustStock = async (req, res) => {
  try {
    const { product_id, new_quantity, reason } = req.body;
    const product = await Product.findOne({ where: { id: product_id, service_type: 'superette' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });

    const oldQty = parseFloat(product.current_stock);
    const diff = parseFloat(new_quantity) - oldQty;
    const movType = diff >= 0 ? 'IN' : 'OUT';

    await product.update({ current_stock: new_quantity });
    if (diff !== 0) {
      await StockMovement.create({
        product_id, type: movType, quantity: Math.abs(diff),
        unit_price: 0,
        reason: reason || 'Ajustement inventaire',
        reference_type: 'adjustment',
        user_id: req.user?.id
      });
    }
    res.json({ success: true, data: product, message: 'Stock ajusté' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVISIONNEMENT
// ─────────────────────────────────────────────────────────────────────────────

const addStock = async (req, res) => {
  try {
    const { supplier_id, items, payment_method, notes, purchase_date } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Articles requis' });
    }

    const purchase = await Purchase.create({
      supplier_id: supplier_id || null,
      service_type: 'superette',
      payment_method: payment_method || 'especes',
      notes,
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      user_id: req.user?.id
    });

    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'superette' } });
      if (!product) continue;

      const subtotal = parseFloat(item.unit_price || 0) * parseFloat(item.quantity);
      totalAmount += subtotal;

      await PurchaseItem.create({
        purchase_id: purchase.id, product_id: item.product_id,
        quantity: item.quantity, unit_price: item.unit_price || 0, subtotal
      });
      await product.increment('current_stock', { by: parseFloat(item.quantity) });
      await StockMovement.create({
        product_id: item.product_id, type: 'IN', quantity: item.quantity,
        unit_price: item.unit_price || 0,
        reason: 'Approvisionnement superette',
        reference_id: purchase.id, reference_type: 'purchase',
        user_id: req.user?.id
      });
    }

    await purchase.update({ total_amount: totalAmount });

    await createAccountingEntry({
      company_id: req.user?.company_id,
      amount: totalAmount,
      entry_type: 'achat',
      payment_type: req.body.payment_method,
      description: 'Achat stock supérette',
      source_module: 'superette',
      source_id: purchase.id,
      source_type: 'purchase'
    });

    res.json({ success: true, message: `Approvisionnement enregistré — ${totalAmount.toLocaleString()} FCFA`, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      where: { service_type: 'superette' },
      include: [
        { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Supplier, as: 'supplier' }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FOURNISSEURS
// ─────────────────────────────────────────────────────────────────────────────

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { service_type: ['superette', 'both'], is_active: true },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, contact, phone, email, address, ville, marque, secteur_activite, date_debut_collaboration, mode_paiement_habituel, delai_paiement, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom requis' });
    const supplier = await Supplier.create({
      name, contact, phone, email, address, ville, marque,
      secteur_activite, date_debut_collaboration: date_debut_collaboration || null,
      mode_paiement_habituel: mode_paiement_habituel || 'especes',
      delai_paiement: delai_paiement ? parseInt(delai_paiement) : 30,
      notes, service_type: 'superette'
    });
    res.json({ success: true, data: supplier, message: `Fournisseur "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    await supplier.update(req.body);
    res.json({ success: true, data: supplier, message: 'Mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

const getSuperetteStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todaySales] = await sequelize.query(`
      SELECT
        COALESCE(SUM(sm.quantity * sm.unit_price), 0) as total_ventes,
        COUNT(*) as nb_mouvements
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.type = 'OUT' AND p.service_type = 'superette'
        AND DATE(sm.created_at) = :today
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    const allProducts = await Product.findAll({
      where: { service_type: 'superette', is_active: true },
      raw: true
    });
    const alerts = allProducts.filter(p =>
      parseFloat(p.min_stock) > 0 && parseFloat(p.current_stock) <= parseFloat(p.min_stock)
    );

    const totalProducts = allProducts.length;
    const totalStockValue = allProducts.reduce((sum, p) => sum + parseFloat(p.current_stock) * parseFloat(p.sell_price), 0);

    const [monthPurchases] = await sequelize.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_achats, COUNT(*) as nb_achats
      FROM purchases
      WHERE service_type = 'superette' AND MONTH(created_at) = MONTH(CURDATE())
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true, data: {
        today: todaySales,
        total_products: totalProducts,
        total_stock_value: totalStockValue,
        low_stock_alerts: alerts.length,
        low_stock_products: alerts,
        month_purchases: monthPurchases
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS EN ATTENTE (ENCAISSEMENT CAISSE)
// ─────────────────────────────────────────────────────────────────────────────

const getOpenTickets = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const tickets = await Sale.findAll({
      where: { status: 'ouvert', module: 'superette', ...cf },
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'ASC']]
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('[getOpenTickets superette]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const payTicket = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { payment_method, payment_operator, payment_reference } = req.body;
    if (!payment_method || payment_method === 'en_attente') {
      return res.status(400).json({ success: false, message: 'Mode de paiement requis' });
    }
    const sale = await Sale.findOne({ where: { id: req.params.id, module: 'superette', status: 'ouvert', ...cf } });
    if (!sale) return res.status(404).json({ success: false, message: 'Ticket introuvable' });

    await sale.update({
      status: 'ferme',
      payment_method,
      payment_operator: payment_operator || null,
      payment_reference: payment_reference || null
    });

    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: parseFloat(sale.total),
      entry_type: 'vente',
      payment_type: payment_method,
      description: 'Vente supérette (encaissement caisse)',
      source_module: 'superette',
      source_id: sale.id,
      source_type: 'sale'
    });

    await sale.reload({ include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] });
    res.json({ success: true, message: 'Ticket encaissé', data: sale });
  } catch (error) {
    console.error('[payTicket superette]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts, createProduct, updateProduct, deleteProduct,
  createSale, getStock, getStockMovements, adjustStock,
  addStock, getPurchases,
  getSuppliers, createSupplier, updateSupplier,
  getSuperetteStats, getOpenTickets, payTicket
};
