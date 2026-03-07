const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RestaurantOrder = sequelize.define('RestaurantOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  },
  table_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'restaurant_tables', key: 'id' }
  },
  serveuse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  cuisinier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  statut: {
    type: DataTypes.STRING(20),
    defaultValue: 'nouvelle',
    validate: { isIn: [['nouvelle', 'en_preparation', 'prete', 'payee', 'annulee']] }
  },
  temps_preparation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { isIn: [[15, 25, 45]] }
  },
  order_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'table',
    comment: 'table = commande en salle | livraison = commande à livrer hors salle'
  },
  total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  mode_paiement: { type: DataTypes.STRING(30), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  paid_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'restaurant_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RestaurantOrder;
