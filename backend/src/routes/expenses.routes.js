const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expenses.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');

// Toutes les routes necessitent authentification + role admin, gerant ou directeur
router.use(authenticateToken);
router.use(hasRole('admin', 'gerant', 'directeur'));

// GET /api/expenses - Liste des depenses
router.get('/', expensesController.getExpenses);

// GET /api/expenses/categories - Liste des categories
router.get('/categories', expensesController.getCategories);

// GET /api/expenses/stats - Statistiques des depenses
router.get('/stats', expensesController.getExpenseStats);

// POST /api/expenses - Creer une depense
router.post('/', expensesController.createExpense);

// PUT /api/expenses/:id - Modifier une depense
router.put('/:id', expensesController.updateExpense);

// Note: Route DELETE supprimee - utiliser la modification pour corriger une depense

module.exports = router;
