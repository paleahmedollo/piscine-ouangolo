'use strict';
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const { getReport, getEntries, getAccounts, getAnnualReport } = require('../controllers/accounting.controller');

router.use(authenticateToken);

router.get('/report',  getReport);
router.get('/entries', getEntries);
router.get('/accounts', getAccounts);
router.get('/annual',  getAnnualReport);

module.exports = router;
