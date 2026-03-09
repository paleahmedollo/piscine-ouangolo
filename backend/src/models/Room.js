const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  number: {
    type: DataTypes.STRING(10),
    allowNull: false
    // unique géré par index composé (number, company_id) — pas unique globalement
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Simple'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  },
  price_per_night: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'disponible'
  },
  amenities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Object with amenities like wifi, climatisation, tv, minibar, etc.'
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  }
}, {
  tableName: 'rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Room;
