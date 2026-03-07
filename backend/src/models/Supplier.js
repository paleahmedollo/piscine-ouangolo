const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  contact: {
    type: DataTypes.STRING(200)
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT
  },
  service_type: {
    type: DataTypes.ENUM('maquis', 'superette', 'both', 'depot'),
    defaultValue: 'both'
  },
  delai_paiement: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    comment: 'Délai de paiement en jours'
  },
  mode_paiement_habituel: {
    type: DataTypes.STRING(50),
    defaultValue: 'especes'
  },
  marque: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Marque ou enseigne commerciale'
  },
  secteur_activite: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Secteur d\'activité (ex: Alimentaire, Hygiène…)'
  },
  ville: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Ville du fournisseur'
  },
  date_debut_collaboration: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date de début de collaboration'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Supplier;
