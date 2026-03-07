const { Product, StockMovement, Supplier, Purchase, PurchaseItem, CustomerTab, TabItem, Sale, User } = require('../models');
const { Op, sequelize } = require('../models');
const { createAccountingEntry } = require('../utils/accounting');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

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
    console.error('[getProducts]', error);
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
      description, current_stock: 0, is_active: true
    });
    res.json({ success: true, data: product, message: `Produit "${name}" créé` });
  } catch (error) {
    console.error('[createProduct]', error);
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
    console.error('[updateProduct]', error);
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
    console.error('[deleteProduct]', error);
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

    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.product_id, service_type: 'maquis', is_active: true }
      });
      if (!product) return res.status(404).json({ success: false, message: `Produit ID ${item.product_id} introuvable` });
      if (parseFloat(product.current_stock) < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour "${product.name}" (disponible: ${product.current_stock})`
        });
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
          tab_id, service_type: 'maquis',
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
      return res.json({
        success: true,
        message: `Commande ajoutée à l'onglet — ${totalAmount.toLocaleString()} FCFA`
      });
    }

    // Vente directe — déduire stock
    for (const item of orderItems) {
      await item.product.decrement('current_stock', { by: item.quantity });
      await StockMovement.create({
        product_id: item.product.id, type: 'OUT', quantity: item.quantity,
        unit_price: item.product.sell_price,
        reason: payment_method === 'en_attente' ? 'Vente maquis (ticket caisse)' : 'Vente maquis',
        reference_type: 'sale',
        user_id: req.user?.id
      });
    }

    // Si paiement en attente → créer un ticket Sale pour la caisse
    if (payment_method === 'en_attente') {
      const saleItems = orderItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.product.sell_price),
        total: item.subtotal
      }));
      const saleRecord = await Sale.create({
        user_id: req.user.id,
        items_json: saleItems,
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        payment_method: 'en_attente',
        status: 'ouvert',
        module: 'maquis',
        table_number: table_number || null,
        company_id: req.user.company_id
      });
      return res.json({
        success: true,
        message: `Ticket ouvert — en attente encaissement (${totalAmount.toLocaleString()} FCFA)`,
        data: saleRecord
      });
    }

    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: totalAmount,
      entry_type: 'vente',
      payment_type: payment_method,
      description: 'Vente maquis',
      source_module: 'maquis',
      source_id: undefined,
      source_type: 'sale'
    });

    res.json({
      success: true,
      message: `Vente enregistrée — ${totalAmount.toLocaleString()} FCFA`,
      data: { id: Date.now(), total: totalAmount, payment_method: payment_method || 'especes' }
    });
  } catch (error) {
    console.error('[createOrder]', error);
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
    console.error('[getStock]', error);
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
    console.error('[getStockMovements]', error);
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

    await createAccountingEntry({
      company_id: req.user?.company_id,
      amount: totalAmount,
      entry_type: 'achat',
      payment_type: req.body.payment_method,
      description: 'Achat stock maquis',
      source_module: 'maquis',
      source_id: purchase.id,
      source_type: 'purchase'
    });

    res.json({
      success: true,
      message: `Approvisionnement enregistré — ${totalAmount.toLocaleString()} FCFA`,
      data: purchase
    });
  } catch (error) {
    console.error('[addStock]', error);
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
    console.error('[getPurchases]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FOURNISSEURS  — BUG CORRIGÉ : Op.in pour service_type
// ─────────────────────────────────────────────────────────────────────────────

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: {
        service_type: { [Op.in]: ['maquis', 'both'] },  // ← CORRECTION
        is_active: true
      },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('[getSuppliers]', error);
    // Fallback : retourner tous les fournisseurs actifs si le filtre échoue
    try {
      const suppliers = await Supplier.findAll({
        where: { is_active: true },
        order: [['name', 'ASC']]
      });
      res.json({ success: true, data: suppliers });
    } catch (err2) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, contact, phone, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nom du fournisseur requis' });
    }
    const supplier = await Supplier.create({
      name: name.trim(), contact, phone, address, notes,
      service_type: 'maquis', is_active: true
    });
    res.status(201).json({ success: true, data: supplier, message: `Fournisseur "${name}" créé avec succès` });
  } catch (error) {
    console.error('[createSupplier]', error);
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
    console.error('[updateSupplier]', error);
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
      success: true,
      data: {
        today: todaySales,
        low_stock_alerts: alerts.length,
        low_stock_products: alerts,
        month_purchases: monthPurchases
      }
    });
  } catch (error) {
    console.error('[getMaquisStats]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CLÔTURE CAISSE
// ─────────────────────────────────────────────────────────────────────────────

const { CashShortage } = require('../models');

const closeShift = async (req, res) => {
  try {
    const { actual_amount, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    if (actual_amount === undefined) {
      return res.status(400).json({ success: false, message: 'Montant réel requis' });
    }

    const [result] = await sequelize.query(`
      SELECT COALESCE(SUM(sm.quantity * sm.unit_price), 0) as expected
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.type = 'OUT' AND p.service_type = 'maquis'
        AND sm.user_id = :userId
        AND DATE(sm.created_at) = :today
    `, { replacements: { userId, today }, type: sequelize.QueryTypes.SELECT });

    const expected = parseFloat(result?.expected || 0);
    const actual = parseFloat(actual_amount) || 0;
    const shortage = Math.max(0, expected - actual);

    let shortage_record = null;
    if (shortage > 0) {
      shortage_record = await CashShortage.create({
        user_id: userId, date: today,
        expected_amount: expected, actual_amount: actual,
        shortage_amount: shortage, status: 'en_attente', notes
      });
    }

    res.json({
      success: true,
      data: {
        expected_amount: expected, actual_amount: actual,
        shortage_amount: shortage, has_shortage: shortage > 0, shortage_record
      },
      message: shortage > 0
        ? `⚠️ Manquant détecté : ${shortage.toLocaleString()} FCFA`
        : '✅ Caisse correcte — aucun manquant'
    });
  } catch (error) {
    console.error('[closeShift]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getShortages = async (req, res) => {
  try {
    const { user_id, status } = req.query;
    let where = {};
    if (user_id) where.user_id = parseInt(user_id);
    if (status) where.status = status;
    const shortages = await CashShortage.findAll({
      where, order: [['date', 'DESC']], limit: 100
    });
    res.json({ success: true, data: shortages });
  } catch (error) {
    console.error('[getShortages]', error);
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
      where: { status: 'ouvert', module: 'maquis', ...cf },
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'ASC']]
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('[getOpenTickets maquis]', error);
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
    const sale = await Sale.findOne({ where: { id: req.params.id, module: 'maquis', status: 'ouvert', ...cf } });
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
      description: 'Vente maquis (encaissement caisse)',
      source_module: 'maquis',
      source_id: sale.id,
      source_type: 'sale'
    });

    await sale.reload({ include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] });
    res.json({ success: true, message: 'Ticket encaissé', data: sale });
  } catch (error) {
    console.error('[payTicket maquis]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts, createProduct, updateProduct, deleteProduct,
  createOrder, getStock, getStockMovements, addStock, getPurchases,
  getSuppliers, createSupplier, updateSupplier,
  getMaquisStats, closeShift, getShortages,
  getOpenTickets, payTicket
};
