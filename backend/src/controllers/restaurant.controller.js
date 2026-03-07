const { Op } = require('sequelize');
const { MenuItem, Sale, User, Room, Reservation } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');
const { getCompanyFilter } = require('../middlewares/auth.middleware');
const { createAccountingEntry } = require('../utils/accounting');

// =====================================================
// MENU
// =====================================================

const getMenu = async (req, res) => {
  try {
    const { category, available_only } = req.query;
    const cf = getCompanyFilter(req);

    let whereClause = { ...cf };

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
      is_available: true,
      company_id: req.user.company_id
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

const createSale = async (req, res) => {
  try {
    const { items, payment_method, payment_operator, payment_reference, table_number, room_number } = req.body;

    // Si facturation à une chambre, vérifier que la chambre existe
    if (room_number) {
      const room = await Room.findOne({ where: { number: room_number } });
      if (!room) {
        return res.status(400).json({
          success: false,
          message: `Chambre ${room_number} introuvable`
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Articles requis'
      });
    }

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
      payment_method: room_number ? 'chambre' : 'en_attente',
      payment_operator: null,
      payment_reference: null,
      table_number: table_number || null,
      room_number: room_number || null,
      status: 'ouvert',
      company_id: req.user.company_id
    });

    await logAction(req, 'CREATE_SALE', 'restaurant', 'sale', sale.id, {
      items_count: items.length,
      total: subtotal
    });

    if (sale.payment_method && sale.payment_method !== 'en_attente') {
      await createAccountingEntry({
        company_id: req.user.company_id || sale.company_id,
        amount: sale.total,
        entry_type: 'vente',
        payment_type: sale.payment_method,
        description: 'Vente restaurant',
        source_module: 'restaurant',
        source_id: sale.id,
        source_type: 'sale'
      });
    }

    res.status(201).json({
      success: true,
      message: room_number
        ? `Ticket ouvert — facturé à la chambre ${room_number}`
        : 'Ticket ouvert — en attente d\'encaissement',
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

const getOpenSales = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    let whereClause = { status: 'ouvert', ...cf };

    if (!['directeur', 'maire', 'gerant', 'responsable', 'admin'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    const sales = await Sale.findAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'ASC']]
    });

    res.json({ success: true, data: { sales } });
  } catch (error) {
    console.error('Get open sales error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des tickets ouverts' });
  }
};

const closeSale = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Ticket introuvable' });
    }

    if (sale.status === 'ferme') {
      return res.status(400).json({ success: false, message: 'Ce ticket est déjà encaissé' });
    }

    if (sale.room_number) {
      return res.status(400).json({
        success: false,
        message: 'Ce ticket est facturé à une chambre — il sera soldé au check-out'
      });
    }

    const { payment_method, payment_operator, payment_reference } = req.body;

    if (!payment_method || payment_method === 'en_attente') {
      return res.status(400).json({ success: false, message: 'Mode de paiement requis' });
    }

    await sale.update({
      status: 'ferme',
      payment_method,
      payment_operator: payment_operator || null,
      payment_reference: payment_reference || null
    });

    await logAction(req, 'CLOSE_SALE', 'restaurant', 'sale', sale.id, {
      payment_method,
      total: sale.total
    });

    await sale.reload({ include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] });

    res.json({
      success: true,
      message: 'Ticket encaissé avec succès',
      data: sale
    });
  } catch (error) {
    console.error('Close sale error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'encaissement' });
  }
};

const getSales = async (req, res) => {
  try {
    const { date, start_date, end_date, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const cf = getCompanyFilter(req);

    let whereClause = { ...cf };

    whereClause.status = status || 'ferme';

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      whereClause.created_at = {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      };
    }

    if (!['directeur', 'maire', 'gerant', 'responsable', 'admin'].includes(req.user.role)) {
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

const getSaleStats = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const cf = getCompanyFilter(req);
    let whereClause = {
      status: 'ferme',
      created_at: {
        [Op.gte]: targetDate,
        [Op.lt]: nextDay
      },
      ...cf
    };

    if (!['directeur', 'maire', 'gerant', 'responsable', 'admin'].includes(req.user.role)) {
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

const getRoomBill = async (req, res) => {
  try {
    const { roomNumber } = req.params;

    const room = await Room.findOne({ where: { number: roomNumber } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Chambre ${roomNumber} introuvable`
      });
    }

    const activeReservation = await Reservation.findOne({
      where: { room_id: room.id, status: 'en_cours' },
      order: [['created_at', 'DESC']]
    });

    let whereClause = { room_number: roomNumber };
    if (activeReservation) {
      whereClause.created_at = {
        [Op.gte]: new Date(activeReservation.check_in)
      };
    }

    const sales = await Sale.findAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      order: [['created_at', 'ASC']]
    });

    const totalRestaurant = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);

    res.json({
      success: true,
      data: {
        room: { number: room.number, type: room.type },
        reservation: activeReservation ? {
          client_name: activeReservation.client_name,
          check_in: activeReservation.check_in,
          check_out: activeReservation.check_out,
          total_price: activeReservation.total_price,
          deposit_paid: activeReservation.deposit_paid
        } : null,
        sales,
        total_restaurant: totalRestaurant,
        total_general: activeReservation
          ? parseFloat(activeReservation.total_price) + totalRestaurant
          : totalRestaurant
      }
    });
  } catch (error) {
    console.error('Get room bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la facture'
    });
  }
};

const closeRoomSales = async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const { payment_method } = req.body;

    if (!roomNumber) {
      return res.status(400).json({ success: false, message: 'Numéro de chambre requis' });
    }

    const [updatedCount] = await Sale.update(
      {
        status: 'ferme',
        payment_method: payment_method || 'chambre'
      },
      {
        where: {
          room_number: roomNumber,
          status: 'ouvert'
        }
      }
    );

    await logAction(req, 'restaurant', 'fermeture_chambre', null, {
      room_number: roomNumber,
      sales_closed: updatedCount,
      payment_method: payment_method || 'chambre'
    });

    res.json({
      success: true,
      message: `${updatedCount} vente(s) de la chambre ${roomNumber} clôturée(s)`,
      data: { sales_closed: updatedCount }
    });
  } catch (error) {
    console.error('Close room sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la clôture des ventes de la chambre'
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
  getOpenSales,
  closeSale,
  getSales,
  getSaleById,
  getSaleStats,
  getRoomBill,
  closeRoomSales
};
