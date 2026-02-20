const { Op } = require('sequelize');
const { MenuItem, Sale, User } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');

// =====================================================
// MENU
// =====================================================

/**
 * GET /api/restaurant/menu
 * Récupérer le menu
 */
const getMenu = async (req, res) => {
  try {
    const { category, available_only } = req.query;

    let whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (available_only === 'true') {
      whereClause.is_available = true;
    }

    const menuItems = await MenuItem.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Grouper par catégorie
    const menuByCategory = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        items: menuItems,
        byCategory: menuByCategory
      }
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du menu'
    });
  }
};

/**
 * POST /api/restaurant/menu
 * Ajouter un article au menu (directeur uniquement)
 */
const createMenuItem = async (req, res) => {
  try {
    const { name, category, price, description } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Nom, catégorie et prix requis'
      });
    }

    const menuItem = await MenuItem.create({
      name,
      category,
      price,
      description,
      is_available: true
    });

    await logAction(req, 'CREATE_MENU_ITEM', 'restaurant', 'menu_item', menuItem.id, { name, category, price });

    res.status(201).json({
      success: true,
      message: 'Article ajouté au menu',
      data: menuItem
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'article'
    });
  }
};

/**
 * PUT /api/restaurant/menu/:id
 * Modifier un article du menu
 */
const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé'
      });
    }

    const { name, category, price, description, is_available } = req.body;

    await menuItem.update({
      name: name || menuItem.name,
      category: category || menuItem.category,
      price: price !== undefined ? price : menuItem.price,
      description: description !== undefined ? description : menuItem.description,
      is_available: is_available !== undefined ? is_available : menuItem.is_available
    });

    await logAction(req, 'UPDATE_MENU_ITEM', 'restaurant', 'menu_item', menuItem.id);

    res.json({
      success: true,
      message: 'Article modifié',
      data: menuItem
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'article'
    });
  }
};

/**
 * DELETE /api/restaurant/menu/:id
 * Supprimer un article du menu
 */
const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé'
      });
    }

    await menuItem.destroy();

    await logAction(req, 'DELETE_MENU_ITEM', 'restaurant', 'menu_item', req.params.id);

    res.json({
      success: true,
      message: 'Article supprimé'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'article'
    });
  }
};

/**
 * PUT /api/restaurant/menu/:id/availability
 * Modifier la disponibilité d'un article
 */
const toggleAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé'
      });
    }

    menuItem.is_available = !menuItem.is_available;
    await menuItem.save();

    res.json({
      success: true,
      message: `Article ${menuItem.is_available ? 'disponible' : 'indisponible'}`,
      data: menuItem
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la disponibilité'
    });
  }
};

// =====================================================
// VENTES
// =====================================================

/**
 * POST /api/restaurant/sales
 * Créer une vente
 */
const createSale = async (req, res) => {
  try {
    const { items, payment_method, table_number } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Articles requis'
      });
    }

    // Calculer les totaux
    let subtotal = 0;
    const itemsWithDetails = [];

    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menu_item_id);

      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Article ${item.menu_item_id} non trouvé`
        });
      }

      if (!menuItem.is_available) {
        return res.status(400).json({
          success: false,
          message: `Article "${menuItem.name}" non disponible`
        });
      }

      const itemTotal = parseFloat(menuItem.price) * item.quantity;
      subtotal += itemTotal;

      itemsWithDetails.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unit_price: parseFloat(menuItem.price),
        total: itemTotal
      });
    }

    const sale = await Sale.create({
      user_id: req.user.id,
      items_json: itemsWithDetails,
      subtotal,
      tax: 0,
      total: subtotal,
      payment_method: payment_method || 'especes',
      table_number
    });

    await logAction(req, 'CREATE_SALE', 'restaurant', 'sale', sale.id, {
      items_count: items.length,
      total: subtotal
    });

    res.status(201).json({
      success: true,
      message: 'Vente enregistrée',
      data: sale
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la vente'
    });
  }
};

/**
 * GET /api/restaurant/sales
 * Lister les ventes
 */
const getSales = async (req, res) => {
  try {
    const { date, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    if (date) {
      whereClause.created_at = {
        [Op.gte]: new Date(date),
        [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    } else if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    } else {
      // Par défaut: ventes du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      whereClause.created_at = {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      };
    }

    // Filtrer par utilisateur si pas directeur/maire
    if (!['directeur', 'maire'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    const { count, rows: sales } = await Sale.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        sales,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des ventes'
    });
  }
};

/**
 * GET /api/restaurant/sales/:id
 * Détails d'une vente
 */
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la vente'
    });
  }
};

/**
 * GET /api/restaurant/sales/stats
 * Statistiques des ventes
 */
const getSaleStats = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let whereClause = {
      created_at: {
        [Op.gte]: targetDate,
        [Op.lt]: nextDay
      }
    };

    if (!['directeur', 'maire'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    const sales = await Sale.findAll({ where: whereClause });

    const stats = {
      total_ventes: sales.length,
      total_montant: 0,
      par_mode_paiement: {
        especes: 0,
        carte: 0,
        mobile_money: 0
      },
      articles_vendus: {}
    };

    sales.forEach(sale => {
      stats.total_montant += parseFloat(sale.total);
      stats.par_mode_paiement[sale.payment_method] += parseFloat(sale.total);

      // Compter les articles vendus
      const items = sale.items_json;
      items.forEach(item => {
        if (!stats.articles_vendus[item.name]) {
          stats.articles_vendus[item.name] = { quantity: 0, total: 0 };
        }
        stats.articles_vendus[item.name].quantity += item.quantity;
        stats.articles_vendus[item.name].total += item.total;
      });
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get sale stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  createSale,
  getSales,
  getSaleById,
  getSaleStats
};
