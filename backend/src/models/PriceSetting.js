const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PriceSetting = sequelize.define('PriceSetting', {
  key: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  label: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'price_settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = PriceSetting;
