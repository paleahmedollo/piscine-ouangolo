const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Quote = sequelize.define('Quote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  items_json: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of {description, quantity, unit_price, total}'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  deposit_required: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  deposit_paid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'brouillon'
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  synced: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' }
  }
}, {
  tableName: 'quotes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Calculer le solde avant création/mise à jour
Quote.beforeSave((quote) => {
  quote.balance = parseFloat(quote.total) - parseFloat(quote.deposit_paid || 0);
});

module.exports = Quote;
