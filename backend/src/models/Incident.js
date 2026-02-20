const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('mineur', 'moyen', 'grave', 'critique'),
    defaultValue: 'mineur'
  },
  incident_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  incident_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(100),
    defaultValue: 'piscine'
  },
  persons_involved: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  actions_taken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('ouvert', 'en_cours', 'resolu', 'clos'),
    defaultValue: 'ouvert'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'incidents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Incident;
