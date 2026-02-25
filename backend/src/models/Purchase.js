const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER
  },
  service_type: {
    type: DataTypes.ENUM('maquis', 'superette'),
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'especes'
  },
  notes: {
    type: DataTypes.TEXT
  },
  user_id: {
    type: DataTypes.INTEGER
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'purchases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Purchase;
