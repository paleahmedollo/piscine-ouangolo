'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AccountingEntry = sequelize.define('AccountingEntry', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id:    { type: DataTypes.INTEGER, allowNull: true },
    entry_date:    { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    description:   { type: DataTypes.STRING(255), allowNull: true },
    amount:        { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    entry_type:    { type: DataTypes.STRING(20), allowNull: false }, // vente|achat|charge|salaire
    payment_type:  { type: DataTypes.STRING(30), allowNull: true },  // especes|mobile|credit|virement
    source_module: { type: DataTypes.STRING(50), allowNull: true },  // restaurant|hotel|depot...
    source_id:     { type: DataTypes.INTEGER, allowNull: true },
    source_type:   { type: DataTypes.STRING(50), allowNull: true },  // sale|purchase|expense|payroll
    created_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'accounting_entries',
    timestamps: false
  });
  return AccountingEntry;
};
