const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashShortage = sequelize.define('CashShortage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expected_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  actual_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  shortage_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'en_attente'
    // en_attente, deduit, regle, annule
  },
  deducted_from_payroll_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  }
}, {
  tableName: 'cash_shortages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CashShortage;
