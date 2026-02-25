const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SaasSubscription = sequelize.define('SaasSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'companies', key: 'id' }
  },
  plan: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'basic'
    // basic, pro, premium
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'XOF'
  },
  billing_cycle: {
    type: DataTypes.STRING(20),
    defaultValue: 'mensuel'
    // mensuel, trimestriel, annuel
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  next_billing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'actif'
    // actif, suspendu, expire, annule
  },
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'saas_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SaasSubscription;
