'use strict';
/**
 * Accounting Controller — Comptabilité Simplifiée Ollentra
 * Rapport : Ventes / Achats / Charges / Salaires / Bénéfice
 */
const { AccountingAccount, AccountingEntry, sequelize, Op } = require('../models');

// ─── Rapport mensuel ──────────────────────────────────────────────────────────
const getReport = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate   = new Date(year, month, 0).toISOString().split('T')[0];

    const rows = await AccountingEntry.findAll({
      where: {
        company_id,
        entry_date: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        'entry_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['entry_type'],
      raw: true
    });

    const totals = { vente: 0, achat: 0, charge: 0, salaire: 0 };
    rows.forEach(r => { totals[r.entry_type] = parseFloat(r.total) || 0; });

    const benefice = totals.vente - (totals.achat + totals.charge + totals.salaire);

    res.json({
      success: true,
      data: {
        period: { month, year, start: startDate, end: endDate },
        ventes:   totals.vente,
        achats:   totals.achat,
        charges:  totals.charge,
        salaires: totals.salaire,
        benefice,
        benefice_pct: totals.vente > 0
          ? Math.round((benefice / totals.vente) * 100) : 0
      }
    });
  } catch (err) {
    console.error('getReport error:', err);
    res.status(500).json({ success: false, message: 'Erreur rapport comptable' });
  }
};

// ─── Liste des écritures ──────────────────────────────────────────────────────
const getEntries = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const month  = parseInt(req.query.month)  || new Date().getMonth() + 1;
    const year   = parseInt(req.query.year)   || new Date().getFullYear();
    const type   = req.query.type || null;

    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate   = new Date(year, month, 0).toISOString().split('T')[0];

    const where = {
      company_id,
      entry_date: { [Op.between]: [startDate, endDate] }
    };
    if (type) where.entry_type = type;

    const entries = await AccountingEntry.findAll({
      where,
      order: [['entry_date', 'DESC'], ['id', 'DESC']],
      limit: 500
    });

    res.json({ success: true, data: entries });
  } catch (err) {
    console.error('getEntries error:', err);
    res.status(500).json({ success: false, message: 'Erreur chargement écritures' });
  }
};

// ─── Comptes (balances) ───────────────────────────────────────────────────────
const getAccounts = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const accounts = await AccountingAccount.findAll({
      where: { company_id },
      order: [['code', 'ASC']]
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur chargement comptes' });
  }
};

// ─── Rapport annuel (tous les mois) ──────────────────────────────────────────
const getAnnualReport = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const rows = await AccountingEntry.findAll({
      where: {
        company_id,
        entry_date: {
          [Op.between]: [`${year}-01-01`, `${year}-12-31`]
        }
      },
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal("MONTH FROM entry_date")), 'month'],
        'entry_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: [
        sequelize.fn('EXTRACT', sequelize.literal("MONTH FROM entry_date")),
        'entry_type'
      ],
      raw: true
    });

    // Construire tableau 12 mois
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      ventes: 0, achats: 0, charges: 0, salaires: 0, benefice: 0
    }));
    rows.forEach(r => {
      const m = months[parseInt(r.month) - 1];
      if (m) m[r.entry_type === 'vente' ? 'ventes'
             : r.entry_type === 'achat' ? 'achats'
             : r.entry_type === 'charge' ? 'charges'
             : 'salaires'] = parseFloat(r.total) || 0;
    });
    months.forEach(m => {
      m.benefice = m.ventes - (m.achats + m.charges + m.salaires);
    });

    res.json({ success: true, data: { year, months } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur rapport annuel' });
  }
};

module.exports = { getReport, getEntries, getAccounts, getAnnualReport };
