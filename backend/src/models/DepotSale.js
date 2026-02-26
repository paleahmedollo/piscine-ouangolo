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
  }
}, {
  tableName: 'depot_sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DepotSale;
