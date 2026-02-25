const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashRegister = sequelize.define('CashRegister', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  opening_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  expected_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  actual_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  difference: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'en_attente'
  },
  validated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  validated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  transactions_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  synced: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  }
}, {
  tableName: 'cash_registers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Calculer la différence avant création
CashRegister.beforeCreate((cashRegister) => {
  cashRegister.difference = parseFloat(cashRegister.actual_amount) - parseFloat(cashRegister.expected_amount);
});

module.exports = CashRegister;
