const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employees.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);

// =====================================================
// PAYROLL ROUTES EN PREMIER (avant /:id pour eviter le conflit)
// Admin et Directeur uniquement
// =====================================================

// GET /api/employees/payroll - Liste des paies
router.get('/payroll', hasRole('admin', 'directeur'), employeesController.getPayrolls);

// GET /api/employees/payroll/stats - Statistiques des paies
router.get('/payroll/stats', hasRole('admin', 'directeur'), employeesController.getPayrollStats);

// POST /api/employees/payroll - Creer une paie
router.post('/payroll', hasRole('admin', 'directeur'), employeesController.createPayroll);

// PUT /api/employees/payroll/:id/pay - Payer une paie
router.put('/payroll/:id/pay', hasRole('admin', 'directeur'), employeesController.payPayroll);

// DELETE /api/employees/payroll/:id - Annuler une paie
router.delete('/payroll/:id', hasRole('admin', 'directeur'), employeesController.cancelPayroll);

// =====================================================
// EMPLOYEES ROUTES - Gerant, Admin, Directeur
// =====================================================

// GET /api/employees - Liste des employes
router.get('/', hasRole('admin', 'directeur', 'gerant'), employeesController.getEmployees);

// GET /api/employees/positions - Liste des postes
router.get('/positions', hasRole('admin', 'directeur', 'gerant'), employeesController.getPositions);

// GET /api/employees/:id - Details d'un employe
router.get('/:id', hasRole('admin', 'directeur', 'gerant'), employeesController.getEmployee);

// POST /api/employees - Creer un employe
router.post('/', hasRole('admin', 'directeur', 'gerant'), employeesController.createEmployee);

// PUT /api/employees/:id - Modifier un employe
router.put('/:id', hasRole('admin', 'directeur', 'gerant'), employeesController.updateEmployee);

module.exports = router;
