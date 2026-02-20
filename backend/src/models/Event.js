const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  client_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  client_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  client_email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  event_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  event_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  space: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guest_count: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'demande'
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  deposit_paid: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  synced: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Event;
