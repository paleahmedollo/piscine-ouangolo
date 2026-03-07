const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RestaurantNotification = sequelize.define('RestaurantNotification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'restaurant_orders', key: 'id' }
  },
  destinataire_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['preparation', 'prete', 'annulee']] }
  },
  message: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'restaurant_notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = RestaurantNotification;
