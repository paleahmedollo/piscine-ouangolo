const express = require('express');
const router = express.Router();
const piscineController = require('../controllers/piscine.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule, isGerant } = require('../middlewares/rbac.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);
router.use(canAccessModule('piscine'));

// Prix - lecture pour tous, modification réservée admin/directeur
router.get('/prices', piscineController.getPrices);
router.put('/prices', isGerant, piscineController.updatePrices);

// Tickets
router.post('/tickets', checkPermission('piscine', 'vente_tickets'), piscineController.createTicket);
router.get('/tickets', checkPermission('piscine', 'lecture'), piscineController.getTickets);
router.get('/tickets/stats', checkPermission('piscine', 'lecture'), piscineController.getTicketStats);

// Abonnements
router.post('/subscriptions', checkPermission('piscine', 'gestion_abonnements'), piscineController.createSubscription);
router.get('/subscriptions', checkPermission('piscine', 'lecture'), piscineController.getSubscriptions);
router.get('/subscriptions/check/:phone', checkPermission('piscine', 'lecture'), piscineController.checkSubscription);
router.get('/subscriptions/:id', checkPermission('piscine', 'lecture'), piscineController.getSubscriptionById);
router.put('/subscriptions/:id/cancel', checkPermission('piscine', 'gestion_abonnements'), piscineController.cancelSubscription);

// Incidents
router.post('/incidents', checkPermission('piscine', 'lecture'), piscineController.createIncident);
router.get('/incidents', checkPermission('piscine', 'lecture'), piscineController.getIncidents);
router.put('/incidents/:id', checkPermission('piscine', 'lecture'), piscineController.updateIncident);

module.exports = router;
