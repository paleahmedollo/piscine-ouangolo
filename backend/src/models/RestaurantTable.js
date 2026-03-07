const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RestaurantTable = sequelize.define('RestaurantTable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  },
  numero: { type: DataTypes.INTEGER, allowNull: false },
  capacite: { type: DataTypes.INTEGER, defaultValue: 4 },
  statut: {
    type: DataTypes.STRING(15),
    defaultValue: 'libre',
    validate: { isIn: [['libre', 'occupee', 'reservee']] }
  },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'restaurant_tables',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RestaurantTable;
