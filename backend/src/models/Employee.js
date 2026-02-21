const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  position: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  base_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  contract_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'cdi'
  },
  end_contract_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // Piece d'identite
  id_type: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  id_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  id_issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  id_expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  id_issued_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // Informations personnelles
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  birth_place: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Contact d'urgence & Famille
  emergency_contact_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  marital_status: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  dependents_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'employees',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Employee;
