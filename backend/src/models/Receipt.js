const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const Receipt = sequelize.define('Receipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receipt_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  cash_register_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'cash_registers',
      key: 'id'
    }
  },
  // Données figées au moment de la génération
  module: {
    type: DataTypes.ENUM('piscine', 'restaurant', 'hotel', 'events'),
    allowNull: false
  },
  closure_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  transactions_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  expected_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  actual_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  difference: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  opening_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  // Informations sur les personnes
  cashier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cashier_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  cashier_role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  validator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  validator_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  validation_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Hash pour détecter les modifications
  data_hash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  // Suivi des modifications
  is_modified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  modification_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  modification_details: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Génère un hash des données critiques pour détecter les modifications
 */
Receipt.generateHash = function(data) {
  const criticalData = {
    expected_amount: parseFloat(data.expected_amount),
    actual_amount: parseFloat(data.actual_amount),
    difference: parseFloat(data.difference),
    transactions_count: data.transactions_count,
    module: data.module,
    closure_date: data.closure_date
  };
  return crypto.createHash('sha256').update(JSON.stringify(criticalData)).digest('hex');
};

/**
 * Génère un numéro de reçu unique
 */
Receipt.generateReceiptNumber = async function() {
  const year = new Date().getFullYear();
  const lastReceipt = await Receipt.findOne({
    where: {
      receipt_number: {
        [require('sequelize').Op.like]: `REC-${year}-%`
      }
    },
    order: [['id', 'DESC']]
  });

  let sequence = 1;
  if (lastReceipt) {
    const lastNumber = parseInt(lastReceipt.receipt_number.split('-')[2]);
    sequence = lastNumber + 1;
  }

  return `REC-${year}-${String(sequence).padStart(4, '0')}`;
};

module.exports = Receipt;
