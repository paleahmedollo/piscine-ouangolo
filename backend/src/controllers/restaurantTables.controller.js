const { RestaurantTable, RestaurantOrder } = require('../models');
const { getCompanyFilter } = require('../middlewares/auth.middleware');
const { Op } = require('sequelize');

// GET /tables
const getTables = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const tables = await RestaurantTable.findAll({
      where: cf,
      order: [['numero', 'ASC']]
    });
    res.json({ success: true, data: tables });
  } catch (err) {
    console.error('getTables:', err);
    res.status(500).json({ success: false, message: 'Erreur récupération tables' });
  }
};

// POST /tables  — créer une table (gérant/admin)
const createTable = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { numero, capacite, notes } = req.body;
    if (!numero) return res.status(400).json({ success: false, message: 'Numéro requis' });

    // Vérifier unicité par entreprise (multi-tenant)
    const dup = await RestaurantTable.findOne({ where: { numero, ...cf } });
    if (dup) return res.status(409).json({ success: false, message: 'Une table avec ce numéro existe déjà pour votre établissement' });

    const table = await RestaurantTable.create({ ...cf, numero, capacite: capacite || 4, notes });
    res.status(201).json({ success: true, data: table, message: 'Table créée' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Ce numéro de table existe déjà pour votre établissement' });
    }
    console.error('createTable:', err);
    res.status(500).json({ success: false, message: 'Erreur création table' });
  }
};

// PUT /tables/:id  — modifier
const updateTable = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const table = await RestaurantTable.findOne({ where: { id: req.params.id, ...cf } });
    if (!table) return res.status(404).json({ success: false, message: 'Table introuvable' });
    const { numero, capacite, statut, notes } = req.body;

    // Vérifier unicité du numéro si changement (multi-tenant)
    if (numero && numero !== table.numero) {
      const dup = await RestaurantTable.findOne({ where: { numero, ...cf } });
      if (dup) return res.status(409).json({ success: false, message: 'Une table avec ce numéro existe déjà pour votre établissement' });
    }

    await table.update({ numero, capacite, statut, notes });
    res.json({ success: true, data: table });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur mise à jour table' });
  }
};

// PUT /tables/:id/status  — changer le statut manuellement
const updateTableStatus = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const { statut } = req.body;
    if (!['libre', 'occupee', 'reservee'].includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }
    const table = await RestaurantTable.findOne({ where: { id: req.params.id, ...cf } });
    if (!table) return res.status(404).json({ success: false, message: 'Table introuvable' });
    await table.update({ statut });
    res.json({ success: true, data: table, message: `Table ${table.numero} → ${statut}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// DELETE /tables/:id
const deleteTable = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const table = await RestaurantTable.findOne({ where: { id: req.params.id, ...cf } });
    if (!table) return res.status(404).json({ success: false, message: 'Table introuvable' });

    // Vérifier pas de commande active
    const active = await RestaurantOrder.count({
      where: { table_id: req.params.id, statut: { [Op.in]: ['nouvelle', 'en_preparation', 'prete'] } }
    });
    if (active > 0) {
      return res.status(400).json({ success: false, message: 'Table avec commandes actives, impossible de supprimer' });
    }

    await table.destroy();
    res.json({ success: true, message: 'Table supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur suppression table' });
  }
};

module.exports = { getTables, createTable, updateTable, updateTableStatus, deleteTable };
