'use strict';
/**
 * Utilitaire comptabilité — écriture automatique simplifiée
 * Appelé depuis tous les contrôleurs financiers (non-bloquant)
 */

let AccountingEntry;
const getModel = () => {
  if (!AccountingEntry) {
    AccountingEntry = require('../models').AccountingEntry;
  }
  return AccountingEntry;
};

/**
 * Crée une écriture comptable automatique.
 * Ne bloque jamais la transaction principale (try/catch silencieux).
 *
 * @param {Object} data
 * @param {number}  data.company_id
 * @param {number}  data.amount
 * @param {string}  data.entry_type    - 'vente' | 'achat' | 'charge' | 'salaire'
 * @param {string}  [data.payment_type] - 'especes' | 'mobile' | 'credit' | 'virement'
 * @param {string}  [data.description]
 * @param {string}  [data.source_module] - 'restaurant' | 'hotel' | 'depot' | ...
 * @param {number}  [data.source_id]
 * @param {string}  [data.source_type]  - 'sale' | 'purchase' | 'expense' | 'payroll'
 * @param {string}  [data.entry_date]   - YYYY-MM-DD (défaut : aujourd'hui)
 */
const createAccountingEntry = async (data) => {
  if (!data.company_id || !data.amount || !data.entry_type) return;
  try {
    const Model = getModel();
    await Model.create({
      company_id:    data.company_id,
      entry_date:    data.entry_date || new Date().toISOString().split('T')[0],
      description:   data.description || null,
      amount:        Math.abs(parseFloat(data.amount)) || 0,
      entry_type:    data.entry_type,
      payment_type:  data.payment_type || null,
      source_module: data.source_module || null,
      source_id:     data.source_id || null,
      source_type:   data.source_type || null
    });
  } catch (err) {
    console.error('[ACCOUNTING] Erreur écriture (non-bloquant):', err.message);
  }
};

/**
 * Initialise les 8 comptes comptables par défaut pour une nouvelle entreprise.
 */
const initCompanyAccounts = async (companyId) => {
  try {
    const { AccountingAccount } = require('../models');
    const defaultAccounts = [
      { code: '51', name: 'Caisse',           account_type: 'actif' },
      { code: '52', name: 'Banque',           account_type: 'actif' },
      { code: '41', name: 'Clients',          account_type: 'actif' },
      { code: '40', name: 'Fournisseurs',     account_type: 'passif' },
      { code: '60', name: 'Achats',           account_type: 'charge' },
      { code: '70', name: 'Ventes',           account_type: 'produit' },
      { code: '65', name: 'Charges diverses', account_type: 'charge' },
      { code: '64', name: 'Salaires',         account_type: 'charge' }
    ];
    for (const acc of defaultAccounts) {
      await AccountingAccount.findOrCreate({
        where: { company_id: companyId, code: acc.code },
        defaults: { ...acc, company_id: companyId }
      });
    }
    console.log(`[ACCOUNTING] Comptes initialisés pour entreprise #${companyId}`);
  } catch (err) {
    console.error('[ACCOUNTING] Erreur init comptes:', err.message);
  }
};

module.exports = { createAccountingEntry, initCompanyAccounts };
