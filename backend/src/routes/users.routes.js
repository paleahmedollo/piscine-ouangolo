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

// Suppression définitive — réservée uniquement à ahmedpiscine
const onlyAhmed = (req, res, next) => {
  if (req.user.username !== 'ahmedpiscine') {
    return res.status(403).json({ success: false, message: 'Action réservée au super-administrateur uniquement' });
  }
  next();
};
router.delete('/:id', onlyAhmed, usersController.deleteUser);

module.exports = router;
