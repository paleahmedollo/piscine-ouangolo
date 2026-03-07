const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER
  },
  service_type: {
    type: DataTypes.ENUM('maquis', 'superette', 'depot'),
    allowNull: false
  },
  numero_commande: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Numéro de commande auto-généré'
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  date_reception: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  date_echeance: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date limite de paiement'
  },
  reference_facture: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  montant_paye: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  reste_a_payer: {
    type: DataTypes.DECIMAL(12, 0),
    defaultValue: 0
  },
  statut: {
    type: DataTypes.STRING(20),
    defaultValue: 'en_attente',
    comment: 'en_attente | recu | partiel | annule'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'especes'
  },
  notes: {
    type: DataTypes.TEXT
  },
  user_id: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'purchases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Purchase;
