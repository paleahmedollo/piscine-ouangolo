const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PressingOrder = sequelize.define('PressingOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pressing_type_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  customer_name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  customer_phone: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  amount: {
    type: DataTypes.DECIMAL(12, 0),
    allowNull: false,
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
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'paye'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pressing_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PressingOrder;
