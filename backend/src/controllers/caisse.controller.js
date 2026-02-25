const { Op } = require('sequelize');
const { CashRegister, User, Ticket, Sale, Reservation, Event, Quote } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');
const { generateReceipt } = require('./receipts.controller');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

// Mapping module -> rôles des employés
const moduleRoles = {
  piscine: ['maitre_nageur'],
  restaurant: ['serveuse', 'serveur'],
  hotel: ['receptionniste'],
  events: ['gestionnaire_events']
};

/**
 * Calcule le montant attendu pour un module et une date
 */
const calculateExpectedAmount = async (module, date, userId = null) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let total = 0;
  let count = 0;

  const whereClause = {
    created_at: { [Op.between]: [startOfDay, endOfDay] }
  };

  if (userId) {
    whereClause.user_id = userId;
  }

  switch (module) {
    case 'piscine':
      const tickets = await Ticket.findAll({ where: whereClause });
      tickets.forEach(t => {
        total += parseFloat(t.total);
        count++;
      });
      break;

    case 'restaurant':
      const sales = await Sale.findAll({ where: whereClause });
      sales.forEach(s => {
        total += parseFloat(s.total);
        count++;
      });
      break;

    case 'hotel':
      const reservations = await Reservation.findAll({
        where: {
          ...whereClause,
          status: { [Op.in]: ['confirmee', 'en_cours', 'terminee'] }
        }
      });
      reservations.forEach(r => {
        total += parseFloat(r.deposit_paid || 0);
        count++;
      });
      break;

    case 'events':
      const eventRecords = await Event.findAll({
        where: {
          ...whereClause,
          deposit_paid: { [Op.gt]: 0 }
        }
      });
      eventRecords.forEach(e => {
        total += parseFloat(e.deposit_paid || 0);
        count++;
      });
      break;
  }

  return { total, count };
};

/**
 * POST /api/caisse/close
 * Clôturer la caisse
 * Si employee_id est fourni (par le gérant), on fait la clôture pour cet employé
 */
const closeCashRegister = async (req, res) => {
  try {
    const { module, actual_amount, opening_amount, notes, employee_id } = req.body;

    if (!module || actual_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Module et montant réel requis'
      });
    }

    // Vérifier les droits d'accès au module
    // Admin et gerant ont accès à tous les modules pour la cloture
    const moduleAccess = {
      piscine: ['maitre_nageur', 'gerant', 'admin', 'directeur'],
      restaurant: ['serveuse', 'serveur', 'gerant', 'admin', 'directeur'],
      hotel: ['receptionniste', 'gerant', 'admin', 'directeur'],
      events: ['gestionnaire_events', 'gerant', 'admin', 'directeur']
    };

    if (!moduleAccess[module]?.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à clôturer ce module'
      });
    }

    // Si le gérant ou admin fait la clôture pour un employé
    let targetUserId = req.user.id;
    let targetEmployee = null;

    if (employee_id && ['gerant', 'admin'].includes(req.user.role)) {
      // Vérifier que l'employé existe et a le bon rôle pour ce module
      targetEmployee = await User.findByPk(employee_id);
      if (!targetEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employé non trouvé'
        });
      }

      const allowedRoles = moduleRoles[module] || [];
      if (!allowedRoles.includes(targetEmployee.role)) {
        return res.status(400).json({
          success: false,
          message: `Cet employé n'est pas autorisé pour le module ${module}`
        });
      }

      targetUserId = employee_id;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculer le montant attendu pour l'employé cible
    const { total: expected_amount, count: transactions_count } = await calculateExpectedAmount(
      module,
      today,
      !['gerant', 'admin', 'directeur'].includes(req.user.role) ? targetUserId : null
    );

    const difference = parseFloat(actual_amount) - expected_amount;

    const cashRegister = await CashRegister.create({
      user_id: targetUserId,
      module,
      date: today,
      opening_amount: opening_amount || 0,
      expected_amount,
      actual_amount: parseFloat(actual_amount),
      difference,
      transactions_count,
      notes,
      company_id: req.user.company_id
    });

    await logAction(req, 'CLOSE_CASH_REGISTER', 'caisse', 'cash_register', cashRegister.id, {
      module,
      expected_amount,
      actual_amount,
      difference,
      employee_id: targetUserId,
      closed_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Caisse clôturée',
      data: cashRegister
    });
  } catch (error) {
    console.error('Close cash register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la clôture de caisse'
    });
  }
};

/**
 * GET /api/caisse
 * Lister les clôtures de caisse
 */
const getCashRegisters = async (req, res) => {
  try {
    const { module, status, start_date, end_date, user_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const cf = getCompanyFilter(req);

    let whereClause = { ...cf };

    if (module) whereClause.module = module;
    if (status) whereClause.status = status;
    if (user_id) whereClause.user_id = user_id;

    if (start_date && end_date) {
      whereClause.date = { [Op.between]: [start_date, end_date] };
    }

    // Si pas admin, gerant, directeur ou maire, ne voir que ses propres clôtures
    if (!['admin', 'gerant', 'directeur', 'maire'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    const { count, rows: cashRegisters } = await CashRegister.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'role'] },
        { model: User, as: 'validator', attributes: ['id', 'full_name'] }
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        cashRegisters,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get cash registers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des clôtures'
    });
  }
};

/**
 * GET /api/caisse/:id
 * Détails d'une clôture
 */
const getCashRegisterById = async (req, res) => {
  try {
    const cashRegister = await CashRegister.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'role'] },
        { model: User, as: 'validator', attributes: ['id', 'full_name'] }
      ]
    });

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Clôture non trouvée'
      });
    }

    res.json({
      success: true,
      data: cashRegister
    });
  } catch (error) {
    console.error('Get cash register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la clôture'
    });
  }
};

/**
 * PUT /api/caisse/:id/validate
 * Valider une clôture (directeur uniquement)
 */
const validateCashRegister = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const cashRegister = await CashRegister.findByPk(req.params.id);

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Clôture non trouvée'
      });
    }

    if (cashRegister.status !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Cette clôture a déjà été traitée'
      });
    }

    if (!['validee', 'rejetee'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    cashRegister.status = status;
    cashRegister.validated_by = req.user.id;
    cashRegister.validated_at = new Date();
    if (notes) cashRegister.notes = (cashRegister.notes || '') + '\n' + notes;

    await cashRegister.save();

    // Générer le reçu si la clôture est validée
    let receipt = null;
    if (status === 'validee') {
      try {
        receipt = await generateReceipt(cashRegister.id, req.user.id);
        await logAction(req, 'GENERATE_RECEIPT', 'caisse', 'receipt', receipt.id, {
          receipt_number: receipt.receipt_number,
          cash_register_id: cashRegister.id
        });
      } catch (receiptError) {
        console.error('Error generating receipt:', receiptError);
        // On continue même si le reçu n'a pas pu être généré
      }
    }

    await logAction(req, 'VALIDATE_CASH_REGISTER', 'caisse', 'cash_register', cashRegister.id, {
      status,
      difference: cashRegister.difference
    });

    res.json({
      success: true,
      message: `Clôture ${status === 'validee' ? 'validée' : 'rejetée'}`,
      data: cashRegister,
      receipt: receipt ? { id: receipt.id, receipt_number: receipt.receipt_number } : null
    });
  } catch (error) {
    console.error('Validate cash register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation'
    });
  }
};

/**
 * GET /api/caisse/pending
 * Clôtures en attente de validation
 */
const getPendingCashRegisters = async (req, res) => {
  try {
    const cf = getCompanyFilter(req);
    const cashRegisters = await CashRegister.findAll({
      where: { status: 'en_attente', ...cf },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'role'] }
      ],
      order: [['date', 'ASC']]
    });

    res.json({
      success: true,
      data: cashRegisters
    });
  } catch (error) {
    console.error('Get pending cash registers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
};

/**
 * GET /api/caisse/expected
 * Calculer le montant attendu pour la clôture
 * Paramètres: module (requis), employee_id (optionnel, pour le gérant)
 */
const getExpectedAmount = async (req, res) => {
  try {
    const { module, employee_id } = req.query;

    if (!module) {
      return res.status(400).json({
        success: false,
        message: 'Module requis'
      });
    }

    const today = new Date();

    // Déterminer l'ID utilisateur pour le calcul
    let userId = null;
    if (['admin', 'gerant', 'directeur'].includes(req.user.role)) {
      // Si admin/gérant et employee_id fourni, utiliser cet ID
      // Sinon, calculer pour tous (null)
      userId = employee_id ? parseInt(employee_id) : null;
    } else {
      // Pour les autres rôles, toujours filtrer par leur propre ID
      userId = req.user.id;
    }

    const { total, count } = await calculateExpectedAmount(module, today, userId);

    res.json({
      success: true,
      data: {
        module,
        employee_id: userId,
        date: today.toISOString().split('T')[0],
        expected_amount: total,
        transactions_count: count
      }
    });
  } catch (error) {
    console.error('Get expected amount error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul'
    });
  }
};

/**
 * GET /api/caisse/stats
 * Statistiques des caisses
 */
const getCaisseStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const cf = getCompanyFilter(req);
    let whereClause = { ...cf };
    if (start_date && end_date) {
      whereClause.date = { [Op.between]: [start_date, end_date] };
    }

    const cashRegisters = await CashRegister.findAll({ where: whereClause });

    const stats = {
      total_clotures: cashRegisters.length,
      validees: cashRegisters.filter(c => c.status === 'validee').length,
      rejetees: cashRegisters.filter(c => c.status === 'rejetee').length,
      en_attente: cashRegisters.filter(c => c.status === 'en_attente').length,
      total_ecarts: 0,
      ecarts_positifs: 0,
      ecarts_negatifs: 0,
      par_module: {}
    };

    cashRegisters.forEach(c => {
      const diff = parseFloat(c.difference);
      stats.total_ecarts += diff;
      if (diff > 0) stats.ecarts_positifs += diff;
      if (diff < 0) stats.ecarts_negatifs += diff;

      if (!stats.par_module[c.module]) {
        stats.par_module[c.module] = {
          count: 0,
          expected: 0,
          actual: 0,
          difference: 0
        };
      }
      stats.par_module[c.module].count++;
      stats.par_module[c.module].expected += parseFloat(c.expected_amount);
      stats.par_module[c.module].actual += parseFloat(c.actual_amount);
      stats.par_module[c.module].difference += diff;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get caisse stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * GET /api/caisse/employees/:module
 * Récupérer les employés par module
 */
const getEmployeesByModule = async (req, res) => {
  try {
    const { module } = req.params;

    if (!moduleRoles[module]) {
      return res.status(400).json({
        success: false,
        message: 'Module invalide'
      });
    }

    const roles = moduleRoles[module];

    const cfEmp = getCompanyFilter(req);
    const employees = await User.findAll({
      where: {
        ...cfEmp,
        role: { [Op.in]: roles },
        is_active: true
      },
      attributes: ['id', 'full_name', 'role', 'username'],
      order: [['full_name', 'ASC']]
    });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees by module error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des employés'
    });
  }
};

module.exports = {
  closeCashRegister,
  getCashRegisters,
  getCashRegisterById,
  validateCashRegister,
  getPendingCashRegisters,
  getExpectedAmount,
  getCaisseStats,
  getEmployeesByModule
};
