const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserLayout = sequelize.define('UserLayout', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  layout_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Mon Layout'
  },
  layout_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'reports',
    comment: 'Type de layout: reports, dashboard, etc.'
  },
  columns: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['date', 'module', 'type', 'quantity', 'time', 'amount', 'user'],
    comment: 'Colonnes visibles et leur ordre'
  },
  filters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Filtres par defaut'
  },
  sort_by: {
    type: DataTypes.STRING(50),
    defaultValue: 'date'
  },
  sort_order: {
    type: DataTypes.ENUM('ASC', 'DESC'),
    defaultValue: 'DESC'
  },
  rows_per_page: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'user_layouts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UserLayout;
