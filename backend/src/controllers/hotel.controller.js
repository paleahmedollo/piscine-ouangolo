const { Op } = require('sequelize');
const { Room, Reservation, User } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');

// =====================================================
// CHAMBRES
// =====================================================

/**
 * GET /api/hotel/rooms
 * Lister toutes les chambres
 */
const getRooms = async (req, res) => {
  try {
    const { status, type } = req.query;

    let whereClause = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const rooms = await Room.findAll({
      where: whereClause,
      order: [['number', 'ASC']]
    });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des chambres'
    });
  }
};

/**
 * GET /api/hotel/rooms/:id
 * Détails d'une chambre
 */
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{
        model: Reservation,
        as: 'reservations',
        where: {
          status: { [Op.in]: ['confirmee', 'en_cours'] }
        },
        required: false,
        limit: 5,
        order: [['check_in', 'DESC']]
      }]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chambre non trouvée'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la chambre'
    });
  }
};

/**
 * PUT /api/hotel/rooms/:id/status
 * Modifier le statut d'une chambre
 */
const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chambre non trouvée'
      });
    }

    if (!['disponible', 'occupee', 'maintenance', 'nettoyage'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    room.status = status;
    await room.save();

    await logAction(req, 'UPDATE_ROOM_STATUS', 'hotel', 'room', room.id, { status });

    res.json({
      success: true,
      message: 'Statut mis à jour',
      data: room
    });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * GET /api/hotel/rooms/available
 * Chambres disponibles pour une période
 */
const getAvailableRooms = async (req, res) => {
  try {
    const { check_in, check_out, type } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'Dates de séjour requises'
      });
    }

    // Trouver les chambres qui ont des réservations chevauchantes
    const bookedRoomIds = await Reservation.findAll({
      attributes: ['room_id'],
      where: {
        status: { [Op.in]: ['confirmee', 'en_cours'] },
        [Op.or]: [
          {
            check_in: { [Op.between]: [check_in, check_out] }
          },
          {
            check_out: { [Op.between]: [check_in, check_out] }
          },
          {
            [Op.and]: [
              { check_in: { [Op.lte]: check_in } },
              { check_out: { [Op.gte]: check_out } }
            ]
          }
        ]
      }
    }).then(reservations => reservations.map(r => r.room_id));

    let whereClause = {
      status: 'disponible'
    };

    if (bookedRoomIds.length > 0) {
      whereClause.id = { [Op.notIn]: bookedRoomIds };
    }

    if (type) {
      whereClause.type = type;
    }

    const rooms = await Room.findAll({
      where: whereClause,
      order: [['number', 'ASC']]
    });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des chambres disponibles'
    });
  }
};

// =====================================================
// RÉSERVATIONS
// =====================================================

/**
 * POST /api/hotel/reservations
 * Créer une réservation
 */
const createReservation = async (req, res) => {
  try {
    const {
      room_id,
      client_name,
      client_phone,
      client_email,
      check_in,
      check_out,
      deposit_paid,
      notes,
      cni_number,
      origin_city,
      destination_city,
      payment_operator,
      payment_reference
    } = req.body;

    if (!room_id || !client_name || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'Chambre, nom du client et dates requises'
      });
    }

    // Vérifier que la chambre existe
    const room = await Room.findByPk(room_id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chambre non trouvée'
      });
    }

    // Vérifier la disponibilité
    const conflictingReservation = await Reservation.findOne({
      where: {
        room_id,
        status: { [Op.in]: ['confirmee', 'en_cours'] },
        [Op.or]: [
          { check_in: { [Op.between]: [check_in, check_out] } },
          { check_out: { [Op.between]: [check_in, check_out] } },
          {
            [Op.and]: [
              { check_in: { [Op.lte]: check_in } },
              { check_out: { [Op.gte]: check_out } }
            ]
          }
        ]
      }
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: 'Chambre non disponible pour ces dates'
      });
    }

    // Calculer le nombre de nuits et le total
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const total_price = nights * parseFloat(room.price_per_night);

    const reservation = await Reservation.create({
      room_id,
      client_name,
      client_phone,
      client_email,
      check_in: checkInDate,
      check_out: checkOutDate,
      nights,
      total_price,
      deposit_paid: deposit_paid || 0,
      notes,
      cni_number: cni_number || null,
      origin_city: origin_city || null,
      destination_city: destination_city || null,
      payment_operator: payment_operator || null,
      payment_reference: payment_reference || null,
      user_id: req.user.id
    });

    // Mettre la chambre en occupée si la réservation commence aujourd'hui ou avant
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate <= today) {
      await Room.update(
        { status: 'occupee' },
        { where: { id: room_id } }
      );
      reservation.status = 'en_cours';
      await reservation.save();
    } else {
      // Réservation future - mettre la chambre en réservée/indisponible
      await Room.update(
        { status: 'occupee' },
        { where: { id: room_id } }
      );
    }

    await logAction(req, 'CREATE_RESERVATION', 'hotel', 'reservation', reservation.id, {
      room: room.number,
      client_name,
      nights,
      total_price
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée',
      data: reservation
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation'
    });
  }
};

/**
 * GET /api/hotel/reservations
 * Lister les réservations
 */
const getReservations = async (req, res) => {
  try {
    const { status, date, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (date) {
      whereClause[Op.or] = [
        { check_in: date },
        { check_out: date },
        {
          [Op.and]: [
            { check_in: { [Op.lte]: date } },
            { check_out: { [Op.gte]: date } }
          ]
        }
      ];
    } else if (start_date && end_date) {
      whereClause[Op.or] = [
        { check_in: { [Op.between]: [start_date, end_date] } },
        { check_out: { [Op.between]: [start_date, end_date] } }
      ];
    }

    const { count, rows: reservations } = await Reservation.findAndCountAll({
      where: whereClause,
      include: [
        { model: Room, as: 'room', attributes: ['id', 'number', 'type'] },
        { model: User, as: 'user', attributes: ['id', 'full_name'] }
      ],
      order: [['check_in', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations'
    });
  }
};

/**
 * GET /api/hotel/reservations/:id
 * Détails d'une réservation
 */
const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user', attributes: ['id', 'full_name'] }
      ]
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la réservation'
    });
  }
};

/**
 * PUT /api/hotel/reservations/:id
 * Modifier une réservation
 */
const updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const {
      client_name,
      client_phone,
      client_email,
      deposit_paid,
      notes,
      status
    } = req.body;

    await reservation.update({
      client_name: client_name || reservation.client_name,
      client_phone: client_phone !== undefined ? client_phone : reservation.client_phone,
      client_email: client_email !== undefined ? client_email : reservation.client_email,
      deposit_paid: deposit_paid !== undefined ? deposit_paid : reservation.deposit_paid,
      notes: notes !== undefined ? notes : reservation.notes,
      status: status || reservation.status
    });

    await logAction(req, 'UPDATE_RESERVATION', 'hotel', 'reservation', reservation.id);

    res.json({
      success: true,
      message: 'Réservation mise à jour',
      data: reservation
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la réservation'
    });
  }
};

/**
 * PUT /api/hotel/reservations/:id/checkin
 * Enregistrer l'arrivée
 */
const checkIn = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [{ model: Room, as: 'room' }]
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    if (reservation.status !== 'confirmee') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation ne peut pas être enregistrée'
      });
    }

    reservation.status = 'en_cours';
    await reservation.save();

    // Mettre à jour le statut de la chambre
    await Room.update(
      { status: 'occupee' },
      { where: { id: reservation.room_id } }
    );

    await logAction(req, 'CHECKIN', 'hotel', 'reservation', reservation.id);

    res.json({
      success: true,
      message: 'Check-in effectué',
      data: reservation
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du check-in'
    });
  }
};

/**
 * PUT /api/hotel/reservations/:id/checkout
 * Enregistrer le départ
 */
const checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [{ model: Room, as: 'room' }]
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    if (reservation.status !== 'en_cours') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation n\'est pas en cours'
      });
    }

    reservation.status = 'terminee';
    await reservation.save();

    // Mettre la chambre en nettoyage
    await Room.update(
      { status: 'nettoyage' },
      { where: { id: reservation.room_id } }
    );

    await logAction(req, 'CHECKOUT', 'hotel', 'reservation', reservation.id, {
      total_price: reservation.total_price,
      deposit_paid: reservation.deposit_paid
    });

    res.json({
      success: true,
      message: 'Check-out effectué',
      data: reservation
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du check-out'
    });
  }
};

/**
 * PUT /api/hotel/reservations/:id/cancel
 * Annuler une réservation
 */
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    if (!['confirmee', 'en_cours'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation ne peut pas être annulée'
      });
    }

    reservation.status = 'annulee';
    await reservation.save();

    // Remettre la chambre en disponible
    await Room.update(
      { status: 'disponible' },
      { where: { id: reservation.room_id } }
    );

    await logAction(req, 'CANCEL_RESERVATION', 'hotel', 'reservation', reservation.id);

    res.json({
      success: true,
      message: 'Réservation annulée',
      data: reservation
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation'
    });
  }
};

/**
 * PUT /api/hotel/rooms/:id
 * Modifier une chambre (prix, capacité, type, équipements)
 */
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chambre non trouvée'
      });
    }

    const { number, price_per_night, capacity, type, amenities } = req.body;

    // Vérifier si le nouveau numéro existe déjà
    if (number && number !== room.number) {
      const existingRoom = await Room.findOne({ where: { number } });
      if (existingRoom) {
        return res.status(409).json({
          success: false,
          message: 'Une chambre avec ce numéro existe déjà'
        });
      }
    }

    // Sauvegarder les anciennes valeurs pour l'historique
    const oldValues = {
      number: room.number,
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      type: room.type
    };

    await room.update({
      number: number !== undefined ? number : room.number,
      price_per_night: price_per_night !== undefined ? price_per_night : room.price_per_night,
      capacity: capacity !== undefined ? capacity : room.capacity,
      type: type !== undefined ? type : room.type,
      amenities: amenities !== undefined ? amenities : room.amenities
    });

    // Log détaillé avec les anciennes et nouvelles valeurs
    await logAction(req, 'UPDATE_ROOM', 'hotel', 'room', room.id, {
      room_number: room.number,
      changes: {
        old: oldValues,
        new: {
          number: room.number,
          price_per_night: room.price_per_night,
          capacity: room.capacity,
          type: room.type
        }
      }
    });

    res.json({
      success: true,
      message: 'Chambre mise à jour',
      data: room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la chambre'
    });
  }
};

/**
 * POST /api/hotel/rooms
 * Créer une nouvelle chambre
 */
const createRoom = async (req, res) => {
  try {
    const { number, type, capacity, price_per_night, amenities } = req.body;

    if (!number || !type || !price_per_night) {
      return res.status(400).json({
        success: false,
        message: 'Numéro, type et prix requis'
      });
    }

    // Vérifier si le numéro existe déjà
    const existingRoom = await Room.findOne({ where: { number } });
    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: 'Une chambre avec ce numéro existe déjà'
      });
    }

    const room = await Room.create({
      number,
      type,
      capacity: capacity || 2,
      price_per_night,
      status: 'disponible',
      amenities: amenities || {}
    });

    await logAction(req, 'CREATE_ROOM', 'hotel', 'room', room.id, {
      room_number: number,
      type,
      price_per_night
    });

    res.status(201).json({
      success: true,
      message: 'Chambre créée',
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la chambre'
    });
  }
};

/**
 * GET /api/hotel/stats
 * Statistiques de l'hôtel
 */
const getHotelStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rooms = await Room.findAll();
    const todayReservations = await Reservation.findAll({
      where: {
        status: 'en_cours',
        check_in: { [Op.lte]: today },
        check_out: { [Op.gt]: today }
      }
    });

    const stats = {
      total_chambres: rooms.length,
      chambres_occupees: rooms.filter(r => r.status === 'occupee').length,
      chambres_disponibles: rooms.filter(r => r.status === 'disponible').length,
      chambres_maintenance: rooms.filter(r => r.status === 'maintenance').length,
      chambres_nettoyage: rooms.filter(r => r.status === 'nettoyage').length,
      taux_occupation: rooms.length > 0
        ? Math.round((rooms.filter(r => r.status === 'occupee').length / rooms.length) * 100)
        : 0,
      reservations_en_cours: todayReservations.length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get hotel stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  updateRoomStatus,
  updateRoom,
  createRoom,
  getAvailableRooms,
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  checkIn,
  checkOut,
  cancelReservation,
  getHotelStats
};
