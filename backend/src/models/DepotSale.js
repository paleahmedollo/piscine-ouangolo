const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DepotSale = sequelize.define('DepotSale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  depot_client_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'especes'
  },
  tab_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'paye',
    comment: 'en_attente = ticket en attente encaissement caisse | paye = encaissé'
  },
  payment_operator: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'moov|orange|wave|mtn'
  },
  payment_reference: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '7 derniers chiffres réf transaction mobile/carte'
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  client_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  items_json: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Articles pour affichage reçu'
  }
}, {
  tableName: 'depot_sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DepotSale;
