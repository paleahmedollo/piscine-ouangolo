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
    allowNull: false,
    comment: 'Quantité commandée'
  },
  quantite_recue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Quantité effectivement reçue (peut être partielle)'
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  date_expiration: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'purchase_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PurchaseItem;
