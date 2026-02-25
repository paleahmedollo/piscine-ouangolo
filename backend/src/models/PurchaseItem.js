const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
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
  tableName: 'purchase_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PurchaseItem;
