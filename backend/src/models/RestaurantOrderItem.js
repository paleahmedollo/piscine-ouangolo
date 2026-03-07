const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RestaurantOrderItem = sequelize.define('RestaurantOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'restaurant_orders', key: 'id' }
  },
  menu_item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'menu_items', key: 'id' }
  },
  nom_plat: { type: DataTypes.STRING(100), allowNull: false },
  quantite: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false },
  prix_unitaire: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  sous_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, {
  tableName: 'restaurant_order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = RestaurantOrderItem;
