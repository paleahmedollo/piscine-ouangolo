const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarWash = sequelize.define('CarWash', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vehicle_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  plate_number: {
    type: DataTypes.STRING(30)
  },
  customer_name: {
    type: DataTypes.STRING(150)
  },
  customer_phone: {
    type: DataTypes.STRING(30)
  },
  amount: {
    type: DataTypes.DECIMAL(12, 0),
    allowNull: false
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
  status: {
    type: DataTypes.ENUM('paye', 'en_attente', 'tab'),
    defaultValue: 'paye'
  },
  tab_id: {
    type: DataTypes.INTEGER,
    comment: 'Link to customer_tabs if added to a tab'
  },
  user_id: {
    type: DataTypes.INTEGER
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'car_washes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CarWash;
