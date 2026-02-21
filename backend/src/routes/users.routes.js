const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { canAccessModule, isGerant } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);
router.use(canAccessModule('users'));

// Toutes les routes sont réservées au gérant et admin uniquement
router.get('/roles', isGerant, usersController.getRoles);
router.get('/', isGerant, usersController.getUsers);
router.get('/:id', isGerant, usersController.getUserById);
router.post('/', isGerant, usersController.createUser);
router.put('/:id', isGerant, usersController.updateUser);
router.put('/:id/password', isGerant, usersController.resetPassword);
router.put('/:id/toggle-active', isGerant, usersController.toggleActive);

module.exports = router;
