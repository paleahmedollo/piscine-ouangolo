const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  createTab, getOpenTabs, getTab, addItemToTab, closeTab, getTabs
} = require('../controllers/tabs.controller');

router.use(authenticateToken);

router.post('/', createTab);
router.get('/open', getOpenTabs);
router.get('/', getTabs);
router.get('/:id', getTab);
router.post('/:id/items', addItemToTab);
router.put('/:id/close', closeTab);

module.exports = router;
