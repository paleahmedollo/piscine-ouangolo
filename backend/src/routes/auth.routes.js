const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Routes publiques
router.get('/companies', authController.getCompanies);
router.post('/login', authController.login);

// Routes protégées
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/password', authenticateToken, authController.changePassword);
router.post('/refresh', authenticateToken, authController.refreshToken);

module.exports = router;
