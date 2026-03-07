const { DepotClient, DepotSale, DepotSaleItem, Product, StockMovement, CustomerTab, TabItem, User, Supplier, Purchase, PurchaseItem } = require('../models');
const { Op, sequelize } = require('../models');
const { createAccountingEntry } = require('../utils/accounting');

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
    // Mapper vers les champs attendus par le frontend
    const mapped = products.map(p => ({
      ...p.toJSON(),
      price: parseFloat(p.sell_price || 0),
      stock_quantity: parseFloat(p.current_stock || 0)
    }));
    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, category, buy_price, unit, min_stock, description } = req.body;
    // Accepter 'price' (frontend) ou 'sell_price' (direct)
    const sell_price = req.body.sell_price ?? req.body.price;
    if (!name || sell_price === undefined) {
      return res.status(400).json({ success: false, message: 'Nom et prix requis' });
    }
    const product = await Product.create({
      name, category: category || 'boissons',
      service_type: 'depot',
      buy_price: buy_price || 0, sell_price,
      unit: unit || 'carton', min_stock: min_stock || 0,
      description, current_stock: 0
    });
    const out = { ...product.toJSON(), price: parseFloat(product.sell_price || 0), stock_quantity: 0 };
    res.json({ success: true, data: out, message: `Produit "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, service_type: 'depot' } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    // Accepter 'price' (frontend) ou 'sell_price' (direct)
    const updateData = { ...req.body };
    if (updateData.price !== undefined && updateData.sell_price === undefined) {
      updateData.sell_price = updateData.price;
    }
    await product.update(updateData);
    const out = { ...product.toJSON(), price: parseFloat(product.sell_price || 0), stock_quantity: parseFloat(product.current_stock || 0) };
    res.json({ success: true, data: out, message: 'Produit mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const receiveStock = async (req, res) => {
  try {
    const { supplier_name, notes } = req.body;
    // Accepter format tableau { items: [...] } OU format simple { product_id, quantity }
    let items = req.body.items;
    if (!items || !items.length) {
      if (req.body.product_id) {
        items = [{ product_id: req.body.product_id, quantity: req.body.quantity || 1 }];
      } else {
        return res.status(400).json({ success: false, message: 'Produit et quantité requis' });
      }
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
    const isPending = payment_method === 'en_attente';
    const sale = await DepotSale.create({
      depot_client_id,
      total_amount: totalAmount,
      payment_method: payment_method || 'especes',
      tab_id: tab ? tab.id : null,
      user_id: req.user?.id,
      notes,
      status: isPending ? 'en_attente' : 'paye',
      client_name: client.name,
      items_json: saleItems.map(i => ({ name: i.product.name, quantity: i.quantity, unit_price: i.unit_price, total: i.subtotal }))
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

    // Ne créer l'écriture comptable que si paiement immédiat
    if (!isPending && payment_method !== 'credit') {
      await createAccountingEntry({
        company_id: req.user.company_id,
        amount: sale.total_amount,
        entry_type: 'vente',
        payment_type: req.body.payment_method,
        description: 'Vente dépôt',
        source_module: 'depot',
        source_id: sale.id,
        source_type: 'sale'
      });
    }

    res.json({
      success: true,
      data: sale,
      message: isPending
        ? `Ticket ouvert — en attente encaissement (${totalAmount.toLocaleString()} FCFA)`
        : `Vente enregistrée — ${totalAmount.toLocaleString()} FCFA${payment_method === 'credit' ? ' (crédit — onglet #' + tab.id + ' créé)' : ''}`
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
        { model: DepotClient, as: 'client', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'user', attributes: ['id', 'full_name', 'username'] },
        {
          model: DepotSaleItem, as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 200
    });

    // Mapper pour ajouter client_name et user_name directement sur l'objet
    const mapped = sales.map(s => ({
      ...s.toJSON(),
      client_name: s.client?.name || '—',
      user_name: s.user?.full_name || s.user?.username || '—'
    }));

    res.json({ success: true, data: mapped });
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
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0 END), 0) as total_mobile
      FROM depot_sales
      WHERE DATE(created_at) = :today
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    const [totalCredit] = await sequelize.query(`
      SELECT
        COALESCE(SUM(credit_balance), 0) as total_en_cours,
        COUNT(CASE WHEN credit_balance > 0 THEN 1 END) as nb_clients_en_credit
      FROM depot_clients
      WHERE is_active = true
    `, { type: sequelize.QueryTypes.SELECT });

    const [monthStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_ventes,
        COALESCE(SUM(total_amount), 0) as montant
      FROM depot_sales
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
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
        aujourd_hui: {
          total_ventes: Number(todayStats?.total_ventes || 0),
          total_cash: Number(todayStats?.total_cash || 0),
          total_credit: Number(todayStats?.total_credit || 0),
          total_mobile: Number(todayStats?.total_mobile || 0)
        },
        total_credit_en_cours: {
          total_en_cours: Number(totalCredit?.total_en_cours || 0),
          nb_clients_en_credit: Number(totalCredit?.nb_clients_en_credit || 0)
        },
        mois: {
          total_ventes: Number(monthStats?.total_ventes || 0),
          montant: Number(monthStats?.montant || 0)
        },
        low_stock_alerts: alerts.length,
        low_stock_products: alerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FOURNISSEURS DÉPÔT
// ─────────────────────────────────────────────────────────────────────────────

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: {
        is_active: true,
        service_type: { [Op.in]: ['depot', 'both'] }
      },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, contact, phone, email, address, delai_paiement, mode_paiement_habituel, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom du fournisseur requis' });
    const supplier = await Supplier.create({
      name, contact, phone, email, address,
      service_type: 'depot',
      delai_paiement: delai_paiement || 30,
      mode_paiement_habituel: mode_paiement_habituel || 'especes',
      notes
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
    const { name, contact, phone, email, address, delai_paiement, mode_paiement_habituel, notes, is_active } = req.body;
    await supplier.update({ name, contact, phone, email, address, delai_paiement, mode_paiement_habituel, notes, is_active });
    res.json({ success: true, data: supplier, message: 'Fournisseur mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMANDES FOURNISSEURS DÉPÔT
// ─────────────────────────────────────────────────────────────────────────────

// Auto-générer un numéro de commande : CMD-2026-0001
const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const [result] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM purchases WHERE service_type = 'depot' AND EXTRACT(YEAR FROM created_at) = :year`,
    { replacements: { year }, type: sequelize.QueryTypes.SELECT }
  );
  const seq = (parseInt(result.cnt) + 1).toString().padStart(4, '0');
  return `CMD-${year}-${seq}`;
};

const getOrders = async (req, res) => {
  try {
    const { statut, supplier_id } = req.query;
    const where = { service_type: 'depot' };
    if (statut) where.statut = statut;
    if (supplier_id) where.supplier_id = supplier_id;

    const orders = await Purchase.findAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'phone', 'email'] },
        { model: User, as: 'user', attributes: ['id', 'full_name', 'username'] },
        {
          model: PurchaseItem, as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'current_stock'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 200
    });

    const mapped = orders.map(o => ({
      ...o.toJSON(),
      supplier_name: o.supplier?.name || '—',
      user_name: o.user?.full_name || o.user?.username || '—'
    }));
    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const { supplier_id, purchase_date, date_echeance, reference_facture, items, notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Au moins un article requis' });
    }

    // Calculer le montant total
    let totalAmount = 0;
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.product_id, service_type: 'depot' } });
      if (!product) return res.status(404).json({ success: false, message: `Produit ID ${item.product_id} introuvable` });
      const qty = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price || product.buy_price || 0);
      const subtotal = qty * unitPrice;
      totalAmount += subtotal;
      validatedItems.push({ product_id: item.product_id, quantity: qty, unit_price: unitPrice, subtotal, date_expiration: item.date_expiration || null });
    }

    const numero_commande = await generateOrderNumber();

    const order = await Purchase.create({
      supplier_id: supplier_id || null,
      service_type: 'depot',
      numero_commande,
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      date_echeance: date_echeance || null,
      reference_facture: reference_facture || null,
      total_amount: totalAmount,
      montant_paye: 0,
      reste_a_payer: totalAmount,
      statut: 'en_attente',
      notes,
      user_id: req.user?.id
    });

    // Créer les lignes de commande
    for (const item of validatedItems) {
      await PurchaseItem.create({
        purchase_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        quantite_recue: 0,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        date_expiration: item.date_expiration
      });
    }

    res.json({ success: true, data: { ...order.toJSON(), numero_commande }, message: `Commande ${numero_commande} créée` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const receiveOrder = async (req, res) => {
  try {
    const order = await Purchase.findOne({
      where: { id: req.params.id, service_type: 'depot' },
      include: [{ model: PurchaseItem, as: 'items' }]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.statut === 'annule') return res.status(400).json({ success: false, message: 'Commande annulée' });

    // items_received : [{purchase_item_id, quantite_recue}]
    const { items_received, date_reception } = req.body;
    if (!items_received || !items_received.length) {
      return res.status(400).json({ success: false, message: 'Quantités reçues requises' });
    }

    let totalRecuQty = 0;
    let totalCommandeQty = 0;

    for (const recv of items_received) {
      const orderItem = order.items.find(i => i.id === recv.purchase_item_id);
      if (!orderItem) continue;

      const qtyRecue = parseFloat(recv.quantite_recue || 0);
      const newTotal = Math.min(parseFloat(orderItem.quantity), parseFloat(orderItem.quantite_recue || 0) + qtyRecue);

      if (qtyRecue > 0) {
        // Mettre à jour quantite_recue dans la ligne
        await orderItem.update({ quantite_recue: newTotal });

        // Incrémenter le stock du produit
        await Product.increment('current_stock', {
          by: qtyRecue,
          where: { id: orderItem.product_id }
        });

        // Enregistrer le mouvement de stock
        await StockMovement.create({
          product_id: orderItem.product_id,
          type: 'IN',
          quantity: qtyRecue,
          unit_price: orderItem.unit_price,
          reason: `Réception commande ${order.numero_commande}`,
          reference_type: 'purchase',
          reference_id: order.id,
          user_id: req.user?.id
        });
      }

      totalRecuQty += parseFloat(newTotal);
      totalCommandeQty += parseFloat(orderItem.quantity);
    }

    // Calculer le nouveau statut
    let newStatut = order.statut;
    if (totalCommandeQty > 0) {
      if (totalRecuQty >= totalCommandeQty) newStatut = 'recu';
      else if (totalRecuQty > 0) newStatut = 'partiel';
    }

    await order.update({
      statut: newStatut,
      date_reception: date_reception || new Date().toISOString().split('T')[0]
    });

    res.json({ success: true, message: `Réception enregistrée — statut: ${newStatut}`, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const payOrder = async (req, res) => {
  try {
    const order = await Purchase.findOne({ where: { id: req.params.id, service_type: 'depot' } });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.statut === 'annule') return res.status(400).json({ success: false, message: 'Commande annulée' });

    const { montant } = req.body;
    if (!montant || parseFloat(montant) <= 0) {
      return res.status(400).json({ success: false, message: 'Montant requis' });
    }

    const paiement = parseFloat(montant);
    const nouvelMontantPaye = Math.min(parseFloat(order.total_amount), parseFloat(order.montant_paye || 0) + paiement);
    const nouvelReste = Math.max(0, parseFloat(order.total_amount) - nouvelMontantPaye);

    await order.update({
      montant_paye: nouvelMontantPaye,
      reste_a_payer: nouvelReste
    });

    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: req.body.montant,
      entry_type: 'achat',
      payment_type: undefined,
      description: 'Paiement fournisseur',
      source_module: 'depot',
      source_id: req.params.id,
      source_type: 'purchase'
    });

    res.json({
      success: true,
      message: `Paiement de ${paiement.toLocaleString()} FCFA enregistré. Reste: ${nouvelReste.toLocaleString()} FCFA`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Purchase.findOne({ where: { id: req.params.id, service_type: 'depot' } });
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.statut === 'recu') return res.status(400).json({ success: false, message: 'Impossible d\'annuler une commande déjà reçue' });
    await order.update({ statut: 'annule' });
    res.json({ success: true, message: 'Commande annulée' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS EN ATTENTE (ENCAISSEMENT CAISSE)
// ─────────────────────────────────────────────────────────────────────────────

const getPendingSales = async (req, res) => {
  try {
    const sales = await DepotSale.findAll({
      where: { status: 'en_attente' },
      include: [
        { model: DepotClient, as: 'client', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'user', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'ASC']]
    });
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const payDepotSale = async (req, res) => {
  try {
    const { payment_method, payment_operator, payment_reference } = req.body;
    if (!payment_method || payment_method === 'en_attente') {
      return res.status(400).json({ success: false, message: 'Mode de paiement requis' });
    }
    const sale = await DepotSale.findOne({
      where: { id: req.params.id, status: 'en_attente' },
      include: [{ model: DepotClient, as: 'client', attributes: ['id', 'name'] }]
    });
    if (!sale) return res.status(404).json({ success: false, message: 'Ticket introuvable' });

    await sale.update({ status: 'paye', payment_method });

    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: parseFloat(sale.total_amount),
      entry_type: 'vente',
      payment_type: payment_method,
      description: `Vente dépôt — ${sale.client_name || ''}`,
      source_module: 'depot',
      source_id: sale.id,
      source_type: 'sale'
    });

    await sale.reload({ include: [{ model: DepotClient, as: 'client', attributes: ['id', 'name', 'phone'] }] });
    res.json({ success: true, message: 'Ticket encaissé', data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClients, createClient, updateClient,
  getProducts, createProduct, updateProduct, receiveStock,
  createSale, getSales,
  payCredit,
  getDepotStats,
  // Fournisseurs
  getSuppliers, createSupplier, updateSupplier,
  // Commandes fournisseurs
  getOrders, createOrder, receiveOrder, payOrder, cancelOrder,
  // Tickets en attente
  getPendingSales, payDepotSale
};
