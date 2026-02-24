const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotel.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);
router.use(canAccessModule('hotel'));

// Chambres
router.get('/rooms', checkPermission('hotel', 'lecture'), hotelController.getRooms);
router.get('/rooms/available', checkPermission('hotel', 'lecture'), hotelController.getAvailableRooms);
router.get('/rooms/:id', checkPermission('hotel', 'lecture'), hotelController.getRoomById);
router.post('/rooms', checkPermission('hotel', 'gestion_chambres'), hotelController.createRoom);
router.put('/rooms/:id', checkPermission('hotel', 'gestion_chambres'), hotelController.updateRoom);
router.put('/rooms/:id/status', checkPermission('hotel', 'gestion_chambres'), hotelController.updateRoomStatus);

// Réservations
router.post('/reservations', checkPermission('hotel', 'reservations'), hotelController.createReservation);
router.get('/reservations', checkPermission('hotel', 'lecture'), hotelController.getReservations);
router.get('/reservations/:id/full-receipt', checkPermission('hotel', 'lecture'), hotelController.getFullReceipt);
router.get('/reservations/:id', checkPermission('hotel', 'lecture'), hotelController.getReservationById);
router.put('/reservations/:id', checkPermission('hotel', 'reservations'), hotelController.updateReservation);
router.put('/reservations/:id/checkin', checkPermission('hotel', 'reservations'), hotelController.checkIn);
router.put('/reservations/:id/checkout', checkPermission('hotel', 'reservations'), hotelController.checkOut);
router.put('/reservations/:id/cancel', checkPermission('hotel', 'reservations'), hotelController.cancelReservation);

// Stats
router.get('/stats', checkPermission('hotel', 'lecture'), hotelController.getHotelStats);

module.exports = router;
