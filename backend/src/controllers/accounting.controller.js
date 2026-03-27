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

// ─── Trésorerie globale & bénéfices ──────────────────────────────────────────
const getTreasury = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const sumByType = (rows, types) => {
      const arr = Array.isArray(rows) ? rows : [];
      return arr
        .filter(r => types.includes(r.entry_type))
        .reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    };

    // Recettes et dépenses du jour (type: vente vs achat+charge+salaire)
    const dayRows = await sequelize.query(
      `SELECT entry_type, COALESCE(SUM(amount), 0) as total
       FROM accounting_entries
       WHERE company_id = :company_id AND DATE(entry_date) = CURDATE()
       GROUP BY entry_type`,
      { replacements: { company_id }, type: sequelize.QueryTypes.SELECT }
    );

    // Recettes et dépenses du mois
    const monthRows = await sequelize.query(
      `SELECT entry_type, COALESCE(SUM(amount), 0) as total
       FROM accounting_entries
       WHERE company_id = :company_id AND MONTH(entry_date) = :month AND YEAR(entry_date) = :year
       GROUP BY entry_type`,
      { replacements: { company_id, month, year }, type: sequelize.QueryTypes.SELECT }
    );

    // Solde global (depuis toujours)
    const globalRows = await sequelize.query(
      `SELECT entry_type, COALESCE(SUM(amount), 0) as total
       FROM accounting_entries
       WHERE company_id = :company_id
       GROUP BY entry_type`,
      { replacements: { company_id }, type: sequelize.QueryTypes.SELECT }
    );

    // Ventes supérette du jour
    const superetteDayRows = await sequelize.query(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE company_id = :company_id AND module = 'superette' AND status = 'ferme' AND DATE(created_at) = CURDATE()`,
      { replacements: { company_id }, type: sequelize.QueryTypes.SELECT }
    );

    const recettes_jour = sumByType(dayRows, ['vente']);
    const depenses_jour = sumByType(dayRows, ['achat', 'charge', 'salaire']);
    const recettes_mois = sumByType(monthRows, ['vente']);
    const depenses_mois = sumByType(monthRows, ['achat', 'charge', 'salaire']);
    const recettes_global = sumByType(globalRows, ['vente']);
    const depenses_global = sumByType(globalRows, ['achat', 'charge', 'salaire']);
    const solde_global = recettes_global - depenses_global;
    const benefice_jour = recettes_jour - depenses_jour;

    const ventes_superette_jour = parseFloat(superetteDayRows[0]?.total || '0') || 0;

    // Achats superette du jour (entrées comptables type 'achat' source_module superette)
    const superetteAchatRows = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM accounting_entries
       WHERE company_id = :company_id AND entry_type = 'achat' AND source_module = 'superette' AND DATE(entry_date) = CURDATE()`,
      { replacements: { company_id }, type: sequelize.QueryTypes.SELECT }
    );
    const achats_superette_jour = parseFloat(superetteAchatRows[0]?.total || '0') || 0;
    const benefice_superette_jour = ventes_superette_jour - achats_superette_jour;

    res.json({
      success: true,
      data: {
        recettes_jour,
        depenses_jour,
        benefice_jour,
        recettes_mois,
        depenses_mois,
        solde_global,
        ventes_superette_jour,
        achats_superette_jour,
        benefice_superette_jour
      }
    });
  } catch (err) {
    console.error('getTreasury error:', err);
    res.status(500).json({ success: false, message: 'Erreur trésorerie' });
  }
};

module.exports = { getReport, getEntries, getAccounts, getAnnualReport, getTreasury };
