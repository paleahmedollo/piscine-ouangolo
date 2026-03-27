const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middlewares/auth.middleware');
const {
  getCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
  permanentDeleteCompany,
  resetCompanyData,
  getCompanyStats,
  bulkCreateUsers,
  resetCompanyStock
} = require('../controllers/companies.controller');

// Upload en mémoire (pas de fichier sur disque)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',   // .xls
      'text/csv'                    // .csv
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) et CSV sont acceptés'));
    }
  }
});

// Toutes les routes companies nécessitent d'être super_admin
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/', getCompanies);
router.post('/', createCompany);
router.get('/:id', getCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);
router.delete('/:id/permanent', permanentDeleteCompany);
router.post('/:id/reset-data', resetCompanyData);
router.get('/:id/stats', getCompanyStats);
router.post('/:id/bulk-users', upload.single('file'), bulkCreateUsers);
router.post('/:id/reset-stock', resetCompanyStock);

module.exports = router;
