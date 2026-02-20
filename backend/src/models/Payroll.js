const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  period_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  period_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  base_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  bonus: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  deductions: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  net_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  payment_method: {
    type: DataTypes.ENUM('especes', 'virement', 'cheque'),
    defaultValue: 'especes'
  },
  status: {
    type: DataTypes.ENUM('en_attente', 'paye', 'annule'),
    defaultValue: 'en_attente'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  paid_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'payrolls',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payroll;
