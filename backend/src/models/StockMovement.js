const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('IN', 'OUT'),
    allowNull: false,
    comment: 'IN = entrée stock, OUT = sortie (vente)'
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  reason: {
    type: DataTypes.STRING(200)
  },
  reference_id: {
    type: DataTypes.INTEGER
  },
  reference_type: {
    type: DataTypes.STRING(50),
    comment: 'purchase, sale, adjustment, tab'
  },
  user_id: {
    type: DataTypes.INTEGER
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'stock_movements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = StockMovement;
