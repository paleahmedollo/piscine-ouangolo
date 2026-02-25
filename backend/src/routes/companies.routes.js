const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middlewares/auth.middleware');
const {
  getCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats
} = require('../controllers/companies.controller');

// Toutes les routes companies nécessitent d'être super_admin
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/', getCompanies);
router.post('/', createCompany);
router.get('/:id', getCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);
router.get('/:id/stats', getCompanyStats);

module.exports = router;
