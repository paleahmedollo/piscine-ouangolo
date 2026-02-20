const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
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
  check_in: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  check_out: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  nights: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  deposit_paid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('confirmee', 'en_cours', 'terminee', 'annulee'),
    defaultValue: 'confirmee'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'reservations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Calculer le nombre de nuits avant création
Reservation.beforeCreate((reservation) => {
  const checkIn = new Date(reservation.check_in);
  const checkOut = new Date(reservation.check_out);
  const diffTime = Math.abs(checkOut - checkIn);
  reservation.nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = Reservation;
