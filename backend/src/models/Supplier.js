const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  contact: {
    type: DataTypes.STRING(200)
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  address: {
    type: DataTypes.TEXT
  },
  service_type: {
    type: DataTypes.ENUM('maquis', 'superette', 'both'),
    defaultValue: 'both'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Supplier;
