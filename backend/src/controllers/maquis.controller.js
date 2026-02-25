const { Product, StockMovement, Supplier, Purchase, PurchaseItem, CustomerTab, TabItem } = require('../models');
const { Op, sequelize } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// PRODUITS MAQUIS
// ─────────────────────────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const { category, active_only } = req.query;
    let where = { service_type: 'maquis' };
    if (active_only === 'true') where.is_active = true;
    if (category) where.category = category;

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
      name, category, service_type: 'maquis',
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
    const product = await Product.findOne({ where: { id: req.params.id, service_type: 'maquis' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    await product.update(req.body);
    res.json({ success: true, data: product, message: 'Produit mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, service_type: 'maquis' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    await product.update({ is_active: false });
    res.json({ success: true, message: `"${product.name}" désactivé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VENTES / COMMANDES
// ─────────────────────────────────────────────────────────────────────────────

const createOrder = async (req, res) => {
  try {
    const { items, tab_id, payment_method, payment_operator, payment_reference, table_number, notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Articles requis' });
    }

    // Validate stock and compute total
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'maquis', is_active: true } });
      if (!product) return res.status(404).json({ success: false, message: `Produit ID ${item.product_id} introuvable` });
      if (parseFloat(product.current_stock) < item.quantity) {
        return res.status(400).json({ success: false, message: `Stock insuffisant pour "${product.name}" (disponible: ${product.current_stock})` });
      }
      const subtotal = parseFloat(product.sell_price) * item.quantity;
      totalAmount += subtotal;
      orderItems.push({ product, quantity: item.quantity, subtotal });
    }

    if (tab_id) {
      // ── Ajouter à l'onglet ──
      const tab = await CustomerTab.findByPk(tab_id);
      if (!tab || tab.status !== 'ouvert') {
        return res.status(400).json({ success: false, message: 'Onglet invalide ou fermé' });
      }
      for (const item of orderItems) {
        await TabItem.create({
          tab_id,
          service_type: 'maquis',
          item_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.sell_price,
          subtotal: item.subtotal
        });
        await item.product.decrement('current_stock', { by: item.quantity });
        await StockMovement.create({
          product_id: item.product.id, type: 'OUT', quantity: item.quantity,
          unit_price: item.product.sell_price,
          reason: `Vente maquis (onglet #${tab_id})`,
          reference_type: 'tab', reference_id: tab_id,
          user_id: req.user?.id
        });
      }
      await tab.update({ total_amount: parseFloat(tab.total_amount) + totalAmount });
      return res.json({ success: true, message: `Commande ajoutée à l'onglet — ${totalAmount.toLocaleString()} FCFA` });
    }

    // ── Vente directe ──
    for (const item of orderItems) {
      await item.product.decrement('current_stock', { by: item.quantity });
      await StockMovement.create({
        product_id: item.product.id, type: 'OUT', quantity: item.quantity,
        unit_price: item.product.sell_price,
        reason: 'Vente maquis', reference_type: 'sale',
        user_id: req.user?.id
      });
    }
    res.json({ success: true, message: `Vente enregistrée — ${totalAmount.toLocaleString()} FCFA`, data: { total: totalAmount } });
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
      where: { service_type: 'maquis', is_active: true },
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
      include: [{ model: Product, as: 'product', where: { service_type: 'maquis' } }],
      order: [['created_at', 'DESC']],
      limit: 200
    });
    res.json({ success: true, data: movements });
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
      service_type: 'maquis',
      payment_method: payment_method || 'especes',
      notes,
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      user_id: req.user?.id
    });

    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'maquis' } });
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
        reason: 'Approvisionnement maquis',
        reference_id: purchase.id, reference_type: 'purchase',
        user_id: req.user?.id
      });
    }

    await purchase.update({ total_amount: totalAmount });
    res.json({ success: true, message: `Approvisionnement enregistré — ${totalAmount.toLocaleString()} FCFA`, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      where: { service_type: 'maquis' },
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
      where: { service_type: ['maquis', 'both'], is_active: true },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, contact, phone, address, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom du fournisseur requis' });
    const supplier = await Supplier.create({ name, contact, phone, address, notes, service_type: 'maquis' });
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
    res.json({ success: true, data: supplier, message: 'Fournisseur mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

const getMaquisStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todaySales] = await sequelize.query(`
      SELECT
        COALESCE(SUM(sm.quantity * sm.unit_price), 0) as total_ventes,
        COUNT(*) as nb_mouvements
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.type = 'OUT' AND p.service_type = 'maquis'
        AND DATE(sm.created_at) = :today
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    const lowStockProducts = await Product.findAll({
      where: { service_type: 'maquis', is_active: true },
      raw: true
    });
    const alerts = lowStockProducts.filter(p =>
      parseFloat(p.min_stock) > 0 && parseFloat(p.current_stock) <= parseFloat(p.min_stock)
    );

    const [monthPurchases] = await sequelize.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_achats, COUNT(*) as nb_achats
      FROM purchases
      WHERE service_type = 'maquis' AND MONTH(created_at) = MONTH(CURDATE())
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true, data: {
        today: todaySales,
        low_stock_alerts: alerts.length,
        low_stock_products: alerts,
        month_purchases: monthPurchases
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts, createProduct, updateProduct, deleteProduct,
  createOrder, getStock, getStockMovements, addStock, getPurchases,
  getSuppliers, createSupplier, updateSupplier,
  getMaquisStats
};
