const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  module: {
    type: DataTypes.ENUM('piscine', 'restaurant', 'hotel', 'events', 'caisse', 'users', 'auth', 'system'),
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  details_json: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = AuditLog;
