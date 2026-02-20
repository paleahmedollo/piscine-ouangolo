const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category: {
    type: DataTypes.ENUM(
      'salaire',
      'fournitures',
      'maintenance',
      'electricite',
      'eau',
      'telephone',
      'internet',
      'carburant',
      'transport',
      'nourriture',
      'autre'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('especes', 'virement', 'cheque', 'mobile_money'),
    defaultValue: 'especes'
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Numero de facture, reference paie, etc.'
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  payroll_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'payrolls',
      key: 'id'
    },
    comment: 'Lien vers la fiche de paie si c\'est un salaire'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Expense;
