const express = require('express');
const router = express.Router();
const { submitContact, listRequests, updateStatus } = require('../controllers/landing.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Public — soumission du formulaire d'essai
router.post('/contact', submitContact);

// Admin — liste des demandes (protégé)
router.get('/requests', authenticateToken, listRequests);
router.patch('/requests/:id', authenticateToken, updateStatus);

module.exports = router;
