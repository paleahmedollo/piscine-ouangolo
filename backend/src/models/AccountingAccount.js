'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AccountingAccount = sequelize.define('AccountingAccount', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id:   { type: DataTypes.INTEGER, allowNull: true },
    code:         { type: DataTypes.STRING(20), allowNull: false },
    name:         { type: DataTypes.STRING(100), allowNull: false },
    account_type: { type: DataTypes.STRING(20), allowNull: false }, // actif|passif|charge|produit
    balance:      { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    created_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'accounting_accounts',
    timestamps: false
  });
  return AccountingAccount;
};
