const { Receipt, CashRegister, User } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');

/**
 * Génère un reçu pour une clôture de caisse validée
 */
const generateReceipt = async (cashRegisterId, validatorId) => {
  // Récupérer la clôture avec les infos utilisateur
  const cashRegister = await CashRegister.findByPk(cashRegisterId, {
    include: [
      { model: User, as: 'user', attributes: ['id', 'full_name', 'role'] },
      { model: User, as: 'validator', attributes: ['id', 'full_name'] }
    ]
  });

  if (!cashRegister) {
    throw new Error('Clôture de caisse non trouvée');
  }

  // Vérifier qu'un reçu n'existe pas déjà
  const existingReceipt = await Receipt.findOne({
    where: { cash_register_id: cashRegisterId }
  });

  if (existingReceipt) {
    return existingReceipt;
  }

  // Récupérer les infos du validateur
  const validator = await User.findByPk(validatorId);

  // Générer le numéro de reçu
  const receiptNumber = await Receipt.generateReceiptNumber();

  // Préparer les données pour le hash
  const receiptData = {
    expected_amount: cashRegister.expected_amount,
    actual_amount: cashRegister.actual_amount,
    difference: cashRegister.difference,
    transactions_count: cashRegister.transactions_count,
    module: cashRegister.module,
    closure_date: cashRegister.date
  };

  // Créer le reçu
  const receipt = await Receipt.create({
    receipt_number: receiptNumber,
    cash_register_id: cashRegisterId,
    module: cashRegister.module,
    closure_date: cashRegister.date,
    transactions_count: cashRegister.transactions_count,
    expected_amount: cashRegister.expected_amount,
    actual_amount: cashRegister.actual_amount,
    difference: cashRegister.difference,
    opening_amount: cashRegister.opening_amount,
    cashier_id: cashRegister.user_id,
    cashier_name: cashRegister.user.full_name,
    cashier_role: cashRegister.user.role,
    validator_id: validatorId,
    validator_name: validator.full_name,
    validation_date: new Date(),
    notes: cashRegister.notes,
    data_hash: Receipt.generateHash(receiptData),
    is_modified: false
  });

  return receipt;
};

/**
 * GET /api/receipts/:id
 * Récupérer un reçu par son ID
 */
const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id, {
      include: [
        { model: CashRegister, as: 'cashRegister' }
      ]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Reçu non trouvé'
      });
    }

    // Vérifier si les données ont été modifiées
    const currentData = {
      expected_amount: receipt.cashRegister.expected_amount,
      actual_amount: receipt.cashRegister.actual_amount,
      difference: receipt.cashRegister.difference,
      transactions_count: receipt.cashRegister.transactions_count,
      module: receipt.cashRegister.module,
      closure_date: receipt.cashRegister.date
    };

    const currentHash = Receipt.generateHash(currentData);
    const isModified = currentHash !== receipt.data_hash;

    // Si modifié et pas encore marqué, mettre à jour
    if (isModified && !receipt.is_modified) {
      receipt.is_modified = true;
      receipt.modification_date = new Date();
      receipt.modification_details = {
        original: {
          expected_amount: parseFloat(receipt.expected_amount),
          actual_amount: parseFloat(receipt.actual_amount),
          difference: parseFloat(receipt.difference)
        },
        current: {
          expected_amount: parseFloat(receipt.cashRegister.expected_amount),
          actual_amount: parseFloat(receipt.cashRegister.actual_amount),
          difference: parseFloat(receipt.cashRegister.difference)
        }
      };
      await receipt.save();
    }

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du reçu'
    });
  }
};

/**
 * GET /api/receipts/by-cash-register/:cashRegisterId
 * Récupérer le reçu d'une clôture de caisse
 */
const getReceiptByCashRegister = async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      where: { cash_register_id: req.params.cashRegisterId },
      include: [
        { model: CashRegister, as: 'cashRegister' }
      ]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Reçu non trouvé pour cette clôture'
      });
    }

    // Vérifier si les données ont été modifiées
    const currentData = {
      expected_amount: receipt.cashRegister.expected_amount,
      actual_amount: receipt.cashRegister.actual_amount,
      difference: receipt.cashRegister.difference,
      transactions_count: receipt.cashRegister.transactions_count,
      module: receipt.cashRegister.module,
      closure_date: receipt.cashRegister.date
    };

    const currentHash = Receipt.generateHash(currentData);
    const isModified = currentHash !== receipt.data_hash;

    if (isModified && !receipt.is_modified) {
      receipt.is_modified = true;
      receipt.modification_date = new Date();
      receipt.modification_details = {
        original: {
          expected_amount: parseFloat(receipt.expected_amount),
          actual_amount: parseFloat(receipt.actual_amount),
          difference: parseFloat(receipt.difference)
        },
        current: {
          expected_amount: parseFloat(receipt.cashRegister.expected_amount),
          actual_amount: parseFloat(receipt.cashRegister.actual_amount),
          difference: parseFloat(receipt.cashRegister.difference)
        }
      };
      await receipt.save();
    }

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Get receipt by cash register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du reçu'
    });
  }
};

/**
 * GET /api/receipts
 * Lister tous les reçus
 */
const getReceipts = async (req, res) => {
  try {
    const { module, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    let whereClause = {};

    if (module) whereClause.module = module;

    if (start_date && end_date) {
      whereClause.closure_date = { [Op.between]: [start_date, end_date] };
    }

    const { count, rows: receipts } = await Receipt.findAndCountAll({
      where: whereClause,
      include: [
        { model: CashRegister, as: 'cashRegister' }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        receipts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des reçus'
    });
  }
};

/**
 * GET /api/receipts/:id/print
 * Données formatées pour l'impression
 */
const getReceiptForPrint = async (req, res) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id, {
      include: [
        { model: CashRegister, as: 'cashRegister' }
      ]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Reçu non trouvé'
      });
    }

    // Vérifier les modifications
    const currentData = {
      expected_amount: receipt.cashRegister.expected_amount,
      actual_amount: receipt.cashRegister.actual_amount,
      difference: receipt.cashRegister.difference,
      transactions_count: receipt.cashRegister.transactions_count,
      module: receipt.cashRegister.module,
      closure_date: receipt.cashRegister.date
    };

    const currentHash = Receipt.generateHash(currentData);
    const isModified = currentHash !== receipt.data_hash;

    const moduleLabels = {
      piscine: 'Piscine',
      restaurant: 'Restaurant',
      hotel: 'Hôtel',
      events: 'Événements'
    };

    const roleLabels = {
      maitre_nageur: 'Maître-nageur',
      serveuse: 'Serveuse',
      serveur: 'Serveur',
      receptionniste: 'Réceptionniste',
      gestionnaire_events: 'Gestionnaire événements',
      gerant: 'Gérant'
    };

    // Formater les données pour l'impression
    const printData = {
      receipt_number: receipt.receipt_number,
      module: moduleLabels[receipt.module] || receipt.module,
      module_raw: receipt.module,
      closure_date: new Date(receipt.closure_date).toLocaleDateString('fr-FR'),
      transactions_count: receipt.transactions_count,
      expected_amount: parseFloat(receipt.expected_amount),
      actual_amount: parseFloat(receipt.actual_amount),
      difference: parseFloat(receipt.difference),
      opening_amount: parseFloat(receipt.opening_amount),
      cashier: {
        name: receipt.cashier_name,
        role: roleLabels[receipt.cashier_role] || receipt.cashier_role,
        module: moduleLabels[receipt.module] || receipt.module
      },
      validator: {
        name: receipt.validator_name
      },
      validation_date: new Date(receipt.validation_date).toLocaleString('fr-FR'),
      notes: receipt.notes,
      is_modified: isModified || receipt.is_modified,
      modification_date: receipt.modification_date
        ? new Date(receipt.modification_date).toLocaleString('fr-FR')
        : null,
      modification_details: receipt.modification_details,
      generated_at: new Date().toLocaleString('fr-FR')
    };

    res.json({
      success: true,
      data: printData
    });
  } catch (error) {
    console.error('Get receipt for print error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la préparation du reçu'
    });
  }
};

module.exports = {
  generateReceipt,
  getReceiptById,
  getReceiptByCashRegister,
  getReceipts,
  getReceiptForPrint
};
