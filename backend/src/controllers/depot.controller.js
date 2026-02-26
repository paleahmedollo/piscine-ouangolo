const { DepotClient, DepotSale, DepotSaleItem, Product, StockMovement, CustomerTab, TabItem } = require('../models');
const { Op, sequelize } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS DÉPÔT
// ─────────────────────────────────────────────────────────────────────────────

const getClients = async (req, res) => {
  try {
    const clients = await DepotClient.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createClient = async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom du client requis' });

    const client = await DepotClient.create({ name, phone, address, notes });
    res.json({ success: true, data: client, message: `Client "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const client = await DepotClient.findByPk(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client non trouvé' });
    const { name, phone, address, notes, is_active } = req.body;
    await client.update({ name, phone, address, notes, is_active });
    res.json({ success: true, data: client, message: 'Client mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUITS DÉPÔT
// ─────────────────────────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { service_type: 'depot', is_active: true },
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
    if (!name || sell_price === undefined) {
      return res.status(400).json({ success: false, message: 'Nom et prix de vente requis' });
    }
    const product = await Product.create({
      name, category: category || 'boissons',
      service_type: 'depot',
      buy_price: buy_price || 0, sell_price,
      unit: unit || 'carton', min_stock: min_stock || 0,
      description, current_stock: 0
    });
    res.json({ success: true, data: product, message: `Produit "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, service_type: 'depot' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    await product.update(req.body);
    res.json({ success: true, data: product, message: 'Produit mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const receiveStock = async (req, res) => {
  try {
    const { items, supplier_name, notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Articles requis' });
    }

    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'depot' } });
      if (!product) continue;

      await product.increment('current_stock', { by: parseFloat(item.quantity) });
      await StockMovement.create({
        product_id: item.product_id,
        type: 'IN',
        quantity: item.quantity,
        unit_price: item.unit_price || product.buy_price,
        reason: `Approvisionnement dépôt${supplier_name ? ' — ' + supplier_name : ''}`,
        reference_type: 'depot_supply',
        user_id: req.user?.id
      });
    }

    res.json({ success: true, message: 'Stock mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VENTES DÉPÔT
// ─────────────────────────────────────────────────────────────────────────────

const createSale = async (req, res) => {
  try {
    const { depot_client_id, items, payment_method, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Articles requis' });
    }
    if (!depot_client_id) {
      return res.status(400).json({ success: false, message: 'Client requis' });
    }

    const client = await DepotClient.findByPk(depot_client_id);
    if (!client) return res.status(404).json({ success: false, message: 'Client non trouvé' });

    // Valider stock et calculer total
    let totalAmount = 0;
    const saleItems = [];
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'depot', is_active: true } });
      if (!product) return res.status(404).json({ success: false, message: `Produit ID ${item.product_id} introuvable` });
      if (parseFloat(product.current_stock) < parseFloat(item.quantity)) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour "${product.name}" (disponible: ${product.current_stock} ${product.unit})`
        });
      }
      const unitPrice = parseFloat(product.sell_price);
      const subtotal = unitPrice * parseFloat(item.quantity);
      totalAmount += subtotal;
      saleItems.push({ product, quantity: item.quantity, unit_price: unitPrice, subtotal });
    }

    // Gérer crédit
    let tab = null;
    if (payment_method === 'credit') {
      // Créer un onglet automatiquement
      tab = await CustomerTab.create({
        customer_name: client.name,
        customer_phone: client.phone || '',
        status: 'ouvert',
        total_amount: totalAmount,
        service_type: 'depot'
      });
    }

    // Créer la vente
    const sale = await DepotSale.create({
      depot_client_id,
      total_amount: totalAmount,
      payment_method: payment_method || 'especes',
      tab_id: tab ? tab.id : null,
      user_id: req.user?.id,
      notes
    });

    // Créer les lignes de vente + décrémenter stock
    for (const item of saleItems) {
      await DepotSaleItem.create({
        depot_sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      });

      // Ajouter au tab si crédit
      if (tab) {
        await TabItem.create({
          tab_id: tab.id,
          service_type: 'depot',
          item_name: `${item.product.name} x${item.quantity}`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          reference_id: sale.id
        });
      }

      // Décrémenter stock
      await item.product.decrement('current_stock', { by: parseFloat(item.quantity) });
      await StockMovement.create({
        product_id: item.product.id,
        type: 'OUT',
        quantity: item.quantity,
        unit_price: item.unit_price,
        reason: `Vente dépôt — ${client.name}`,
        reference_type: 'depot_sale',
        reference_id: sale.id,
        user_id: req.user?.id
      });
    }

    // Mettre à jour crédit du client si crédit
    if (payment_method === 'credit') {
      await client.increment('credit_balance', { by: totalAmount });
    }

    res.json({
      success: true,
      data: sale,
      message: `Vente enregistrée — ${totalAmount.toLocaleString()} FCFA${payment_method === 'credit' ? ' (crédit — onglet #' + tab.id + ' créé)' : ''}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSales = async (req, res) => {
  try {
    const { date, start_date, end_date, depot_client_id } = req.query;
    let where = {};

    if (depot_client_id) where.depot_client_id = depot_client_id;

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

    const sales = await DepotSale.findAll({
      where,
      include: [
        { model: DepotClient, as: 'client' },
        {
          model: DepotSaleItem, as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 200
    });

    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GESTION DU CRÉDIT
// ─────────────────────────────────────────────────────────────────────────────

const payCredit = async (req, res) => {
  try {
    const { depot_client_id, amount, payment_method } = req.body;
    if (!depot_client_id || !amount) {
      return res.status(400).json({ success: false, message: 'Client et montant requis' });
    }

    const client = await DepotClient.findByPk(depot_client_id);
    if (!client) return res.status(404).json({ success: false, message: 'Client non trouvé' });

    const payAmount = parseFloat(amount);
    const currentBalance = parseFloat(client.credit_balance);

    if (payAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Montant trop élevé (solde actuel: ${currentBalance.toLocaleString()} FCFA)`
      });
    }

    // Fermer les onglets ouverts du client (jusqu'à concurrence du montant payé)
    const openTabs = await CustomerTab.findAll({
      where: {
        customer_name: client.name,
        status: 'ouvert'
      },
      order: [['created_at', 'ASC']]
    });

    let remaining = payAmount;
    for (const tab of openTabs) {
      if (remaining <= 0) break;
      const tabTotal = parseFloat(tab.total_amount);
      if (remaining >= tabTotal) {
        await tab.update({ status: 'ferme' });
        remaining -= tabTotal;
      } else {
        // Paiement partiel — on laisse l'onglet ouvert avec le solde restant
        await tab.update({ total_amount: tabTotal - remaining });
        remaining = 0;
      }
    }

    // Décrémenter le crédit du client
    const newBalance = Math.max(0, currentBalance - payAmount);
    await client.update({ credit_balance: newBalance });

    res.json({
      success: true,
      message: `Paiement de ${payAmount.toLocaleString()} FCFA enregistré. Solde restant: ${newBalance.toLocaleString()} FCFA`,
      data: { client: client.toJSON() }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

const getDepotStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_ventes,
        COALESCE(SUM(CASE WHEN payment_method != 'credit' THEN total_amount ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END), 0) as total_credit
      FROM depot_sales
      WHERE DATE(created_at) = :today
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    const [totalCredit] = await sequelize.query(`
      SELECT COALESCE(SUM(credit_balance), 0) as total_en_cours
      FROM depot_clients
      WHERE is_active = true
    `, { type: sequelize.QueryTypes.SELECT });

    const lowStock = await Product.findAll({
      where: { service_type: 'depot', is_active: true },
      raw: true
    });
    const alerts = lowStock.filter(p =>
      parseFloat(p.min_stock) > 0 && parseFloat(p.current_stock) <= parseFloat(p.min_stock)
    );

    res.json({
      success: true,
      data: {
        today: todayStats,
        total_credit_en_cours: totalCredit,
        low_stock_alerts: alerts.length,
        low_stock_products: alerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClients, createClient, updateClient,
  getProducts, createProduct, updateProduct, receiveStock,
  createSale, getSales,
  payCredit,
  getDepotStats
};
