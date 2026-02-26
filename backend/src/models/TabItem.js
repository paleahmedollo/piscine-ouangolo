const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TabItem = sequelize.define('TabItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tab_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  service_type: {
    type: DataTypes.STRING(30),
    allowNull: false
    // lavage, pressing, maquis, superette, restaurant, depot
  },
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  reference_id: {
    type: DataTypes.INTEGER,
    comment: 'ID of original CarWash or sale record'
  },
  notes: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'tab_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = TabItem;
