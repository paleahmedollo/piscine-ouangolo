const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DepotSaleItem = sequelize.define('DepotSaleItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  depot_sale_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  product_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  }
}, {
  tableName: 'depot_sale_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DepotSaleItem;
