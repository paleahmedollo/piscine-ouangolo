const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LandingVisitor = sequelize.define('LandingVisitor', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  ip: { type: DataTypes.STRING(60), allowNull: true },
  country: { type: DataTypes.STRING(80), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  user_agent: { type: DataTypes.TEXT, allowNull: true },
  referrer: { type: DataTypes.STRING(500), allowNull: true },
  lang: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'fr' },
}, {
  tableName: 'landing_visitors',
  timestamps: true,
  createdAt: 'visited_at',
  updatedAt: false,
});

module.exports = LandingVisitor;
