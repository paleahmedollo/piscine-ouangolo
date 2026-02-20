const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);
router.use(canAccessModule('events'));

// Espaces
router.get('/spaces', eventsController.getSpaces);

// Événements
router.post('/', checkPermission('events', 'gestion'), eventsController.createEvent);
router.get('/', checkPermission('events', 'lecture'), eventsController.getEvents);
router.get('/calendar', checkPermission('events', 'lecture'), eventsController.getCalendar);
router.get('/:id', checkPermission('events', 'lecture'), eventsController.getEventById);
router.put('/:id', checkPermission('events', 'gestion'), eventsController.updateEvent);
router.put('/:id/status', checkPermission('events', 'gestion'), eventsController.updateEventStatus);

// Devis
router.post('/:eventId/quotes', checkPermission('events', 'devis'), eventsController.createQuote);
router.get('/:eventId/quotes', checkPermission('events', 'lecture'), eventsController.getQuotesByEvent);
router.put('/quotes/:id', checkPermission('events', 'devis'), eventsController.updateQuote);
router.put('/quotes/:id/payment', checkPermission('events', 'devis'), eventsController.recordPayment);

module.exports = router;
