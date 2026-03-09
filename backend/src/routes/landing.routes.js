const express = require('express');
const router = express.Router();
const { submitContact, trackVisit, listRequests, listVisitors, updateStatus } = require('../controllers/landing.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Public — soumission du formulaire d'essai
router.post('/contact', submitContact);

// Public — tracking visite (non bloquant)
router.post('/visit', trackVisit);

// Admin — liste des demandes (protégé)
router.get('/requests', authenticateToken, listRequests);
router.patch('/requests/:id', authenticateToken, updateStatus);

// Admin — liste des visiteurs (protégé)
router.get('/visitors', authenticateToken, listVisitors);

module.exports = router;
