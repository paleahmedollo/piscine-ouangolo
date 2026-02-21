const { Op } = require('sequelize');
const { Event, Quote, User } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');

// =====================================================
// ÉVÉNEMENTS
// =====================================================

/**
 * POST /api/events
 * Créer un événement
 */
const createEvent = async (req, res) => {
  try {
    const {
      name,
      client_name,
      client_phone,
      client_email,
      event_date,
      event_time,
      end_date,
      space,
      guest_count,
      description,
      price,
      deposit_paid
    } = req.body;

    if (!name || !client_name || !event_date || !space) {
      return res.status(400).json({
        success: false,
        message: 'Nom, client, date et espace requis'
      });
    }

    // Vérifier la disponibilité de l'espace
    const conflictingEvent = await Event.findOne({
      where: {
        space,
        status: { [Op.in]: ['demande', 'confirme', 'en_cours'] },
        [Op.or]: [
          { event_date: event_date },
          {
            [Op.and]: [
              { event_date: { [Op.lte]: event_date } },
              { end_date: { [Op.gte]: event_date } }
            ]
          }
        ]
      }
    });

    if (conflictingEvent) {
      return res.status(409).json({
        success: false,
        message: 'Cet espace est déjà réservé pour cette date'
      });
    }

    const event = await Event.create({
      name,
      client_name,
      client_phone,
      client_email,
      event_date,
      event_time,
      end_date: end_date || event_date,
      space,
      guest_count,
      description,
      price: price || 0,
      deposit_paid: deposit_paid || 0,
      user_id: req.user.id
    });

    await logAction(req, 'CREATE_EVENT', 'events', 'event', event.id, {
      name,
      client_name,
      event_date,
      space
    });

    res.status(201).json({
      success: true,
      message: 'Événement créé',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement'
    });
  }
};

/**
 * GET /api/events
 * Lister les événements
 */
const getEvents = async (req, res) => {
  try {
    const { status, space, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    if (status) whereClause.status = status;
    if (space) whereClause.space = space;

    if (start_date && end_date) {
      whereClause.event_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] },
        { model: Quote, as: 'quotes' }
      ],
      order: [['event_date', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements'
    });
  }
};

/**
 * GET /api/events/calendar
 * Calendrier des événements
 */
const getCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const events = await Event.findAll({
      where: {
        event_date: {
          [Op.between]: [startDate, endDate]
        },
        status: { [Op.notIn]: ['annule'] }
      },
      order: [['event_date', 'ASC'], ['event_time', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        month: targetMonth + 1,
        year: targetYear,
        events
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du calendrier'
    });
  }
};

/**
 * GET /api/events/:id
 * Détails d'un événement
 */
const getEventById = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] },
        { model: Quote, as: 'quotes' }
      ]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'événement'
    });
  }
};

/**
 * PUT /api/events/:id
 * Modifier un événement
 */
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    const updateData = {};
    const allowedFields = [
      'name', 'client_name', 'client_phone', 'client_email',
      'event_date', 'event_time', 'end_date', 'space',
      'guest_count', 'description', 'status', 'price', 'deposit_paid', 'notes'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await event.update(updateData);

    await logAction(req, 'UPDATE_EVENT', 'events', 'event', event.id);

    res.json({
      success: true,
      message: 'Événement mis à jour',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

/**
 * PUT /api/events/:id/status
 * Changer le statut d'un événement
 */
const updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (!['demande', 'confirme', 'en_cours', 'termine', 'annule'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    event.status = status;
    await event.save();

    await logAction(req, 'UPDATE_EVENT_STATUS', 'events', 'event', event.id, { status });

    res.json({
      success: true,
      message: 'Statut mis à jour',
      data: event
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

// =====================================================
// DEVIS
// =====================================================

/**
 * POST /api/events/:eventId/quotes
 * Créer un devis pour un événement
 */
const createQuote = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { items, deposit_required, valid_until, notes } = req.body;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Articles du devis requis'
      });
    }

    // Calculer les totaux
    let subtotal = 0;
    const itemsWithTotals = items.map(item => {
      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;
      return {
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: itemTotal
      };
    });

    const quote = await Quote.create({
      event_id: eventId,
      items_json: itemsWithTotals,
      subtotal,
      tax: 0,
      total: subtotal,
      deposit_required: deposit_required || 0,
      balance: subtotal,
      valid_until,
      notes
    });

    await logAction(req, 'CREATE_QUOTE', 'events', 'quote', quote.id, {
      event_id: eventId,
      total: subtotal
    });

    res.status(201).json({
      success: true,
      message: 'Devis créé',
      data: quote
    });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du devis'
    });
  }
};

/**
 * GET /api/events/:eventId/quotes
 * Lister les devis d'un événement
 */
const getQuotesByEvent = async (req, res) => {
  try {
    const quotes = await Quote.findAll({
      where: { event_id: req.params.eventId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des devis'
    });
  }
};

/**
 * PUT /api/events/quotes/:id
 * Modifier un devis
 */
const updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    const { items, deposit_required, deposit_paid, valid_until, notes, status } = req.body;

    if (items) {
      let subtotal = 0;
      const itemsWithTotals = items.map(item => {
        const itemTotal = item.quantity * item.unit_price;
        subtotal += itemTotal;
        return {
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: itemTotal
        };
      });
      quote.items_json = itemsWithTotals;
      quote.subtotal = subtotal;
      quote.total = subtotal;
    }

    if (deposit_required !== undefined) quote.deposit_required = deposit_required;
    if (deposit_paid !== undefined) quote.deposit_paid = deposit_paid;
    if (valid_until !== undefined) quote.valid_until = valid_until;
    if (notes !== undefined) quote.notes = notes;
    if (status) quote.status = status;

    quote.balance = quote.total - (quote.deposit_paid || 0);

    await quote.save();

    await logAction(req, 'UPDATE_QUOTE', 'events', 'quote', quote.id);

    res.json({
      success: true,
      message: 'Devis mis à jour',
      data: quote
    });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du devis'
    });
  }
};

/**
 * PUT /api/events/quotes/:id/payment
 * Enregistrer un paiement sur un devis
 */
const recordPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const quote = await Quote.findByPk(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    quote.deposit_paid = parseFloat(quote.deposit_paid || 0) + parseFloat(amount);
    quote.balance = parseFloat(quote.total) - quote.deposit_paid;

    if (quote.balance <= 0) {
      quote.status = 'paye';
    }

    await quote.save();

    await logAction(req, 'RECORD_PAYMENT', 'events', 'quote', quote.id, { amount });

    res.json({
      success: true,
      message: 'Paiement enregistré',
      data: quote
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du paiement'
    });
  }
};

/**
 * GET /api/events/spaces
 * Lister les espaces disponibles
 */
const getSpaces = async (req, res) => {
  const spaces = [
    { id: 'salle_conference', name: 'Salle de conférence', capacity: 50 },
    { id: 'terrasse', name: 'Terrasse', capacity: 100 },
    { id: 'jardin', name: 'Jardin', capacity: 150 },
    { id: 'piscine_privee', name: 'Piscine privée', capacity: 30 },
    { id: 'restaurant_prive', name: 'Restaurant privé', capacity: 40 }
  ];

  res.json({
    success: true,
    data: spaces
  });
};

module.exports = {
  createEvent,
  getEvents,
  getCalendar,
  getEventById,
  updateEvent,
  updateEventStatus,
  createQuote,
  getQuotesByEvent,
  updateQuote,
  recordPayment,
  getSpaces
};
