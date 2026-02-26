const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('code', value ? value.toUpperCase() : value);
    }
  },
  // Informations de localisation
  locality: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: "Côte d'Ivoire"
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Type d'activité
  activity_type: {
    type: DataTypes.STRING(100),
    allowNull: true
    // Restaurant, Hotel, Maquis, Lavage, Evenementiel, Piscine, Autre
  },
  // Responsable
  manager_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  manager_phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Plan SaaS
  plan: {
    type: DataTypes.STRING(50),
    defaultValue: 'basic'
    // basic, pro, premium
  },
  // Statut
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'actif'
    // actif, suspendu, expire
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Dates
  subscription_start: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  subscription_end: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Logo
  logo_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Notes internes (super admin)
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Modules activés (null = tous, [] = aucun, ['piscine','maquis',...] = sélectifs)
  modules: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'companies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Company;
