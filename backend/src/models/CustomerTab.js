const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerTab = sequelize.define('CustomerTab', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  customer_info: {
    type: DataTypes.STRING(255),
    comment: 'Phone or plate number'
  },
  status: {
    type: DataTypes.ENUM('ouvert', 'ferme'),
    defaultValue: 'ouvert'
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  payment_method: {
    type: DataTypes.STRING(50)
  },
  payment_operator: {
    type: DataTypes.STRING(50)
  },
  payment_reference: {
    type: DataTypes.STRING(200)
  },
  user_id: {
    type: DataTypes.INTEGER
  },
  notes: {
    type: DataTypes.TEXT
  },
  closed_at: {
    type: DataTypes.DATE
  },
  service_type: {
    type: DataTypes.STRING(50),
    allowNull: true
    // pressing, depot, lavage, maquis, restaurant... null = global
  }
}, {
  tableName: 'customer_tabs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CustomerTab;
