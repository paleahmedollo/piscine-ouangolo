const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  service_type: {
    type: DataTypes.STRING(20),
    allowNull: false
    // maquis, superette, depot
  },
  buy_price: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  sell_price: {
    type: DataTypes.DECIMAL(12, 0),
    allowNull: false,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING(50),
    defaultValue: 'unité'
  },
  current_stock: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  min_stock: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Stock minimum pour alerte'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Product;
