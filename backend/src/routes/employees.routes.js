const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employees.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');

// Toutes les routes necessitent authentification + role admin ou directeur
// Note: gerant n'a plus acces a la paie, seul admin peut gerer les paies
router.use(authenticateToken);
router.use(hasRole('admin', 'directeur'));

// =====================================================
// EMPLOYEES ROUTES
// =====================================================

// GET /api/employees - Liste des employes
router.get('/', employeesController.getEmployees);

// GET /api/employees/positions - Liste des postes
router.get('/positions', employeesController.getPositions);

// GET /api/employees/payroll - Liste des paies
router.get('/payroll', employeesController.getPayrolls);

// GET /api/employees/payroll/stats - Statistiques des paies
router.get('/payroll/stats', employeesController.getPayrollStats);

// POST /api/employees/payroll - Creer une paie
router.post('/payroll', employeesController.createPayroll);

// PUT /api/employees/payroll/:id/pay - Payer une paie
router.put('/payroll/:id/pay', employeesController.payPayroll);

// DELETE /api/employees/payroll/:id - Annuler une paie
router.delete('/payroll/:id', employeesController.cancelPayroll);

// GET /api/employees/:id - Details d'un employe
router.get('/:id', employeesController.getEmployee);

// POST /api/employees - Creer un employe
router.post('/', employeesController.createEmployee);

// PUT /api/employees/:id - Modifier un employe
router.put('/:id', employeesController.updateEmployee);

// Note: Route DELETE supprimee - utiliser la modification pour desactiver un employe

module.exports = router;
