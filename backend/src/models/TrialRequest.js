const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrialRequest = sequelize.define('TrialRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  full_name: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  business_name: { type: DataTypes.STRING(200), allowNull: false },
  city: { type: DataTypes.STRING(100), allowNull: true },
  modules: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON array of selected modules' },
  message: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'converted', 'rejected'),
    defaultValue: 'new',
    allowNull: false
  },
  notes: { type: DataTypes.TEXT, allowNull: true, comment: 'Notes internes du directeur' },
}, {
  tableName: 'trial_requests',
  timestamps: true,
});

module.exports = TrialRequest;
