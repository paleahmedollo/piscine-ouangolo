const { Expense, User, Payroll, Employee } = require('../models');
const { Op } = require('sequelize');
const { getCompanyFilter } = require('../middlewares/auth.middleware');

// Categories labels
const categoryLabels = {
  salaire: 'Salaire',
  fournitures: 'Fournitures',
  maintenance: 'Maintenance',
  electricite: 'Electricite',
  eau: 'Eau',
  telephone: 'Telephone',
  internet: 'Internet',
  carburant: 'Carburant',
  transport: 'Transport',
  nourriture: 'Nourriture',
  autre: 'Autre'
};

/**
 * GET /api/expenses
 * Liste des depenses
 */
const getExpenses = async (req, res) => {
  try {
    const { category, start_date, end_date, month, year } = req.query;
    const cf = getCompanyFilter(req);
    const where = { ...cf };

    if (category) where.category = category;

    if (start_date && end_date) {
      where.expense_date = {
        [Op.between]: [start_date, end_date]
      };
    } else if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      where.expense_date = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] },
        {
          model: Payroll,
          as: 'payroll',
          include: [{ model: Employee, as: 'employee' }]
        }
      ],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des depenses'
    });
  }
};

/**
 * GET /api/expenses/categories
 * Liste des categories
 */
const getCategories = async (req, res) => {
  res.json({
    success: true,
    data: categoryLabels
  });
};

/**
 * GET /api/expenses/stats
 * Statistiques des depenses
 */
const getExpenseStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);

    const cf = getCompanyFilter(req);
    // Depenses du mois
    const monthExpenses = await Expense.findAll({
      where: {
        ...cf,
        expense_date: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    // Total par categorie
    const byCategory = {};
    let totalMonth = 0;
    let totalSalaires = 0;
    let totalAutres = 0;

    monthExpenses.forEach(expense => {
      const cat = expense.category;
      const amount = parseFloat(expense.amount);

      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, total: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].total += amount;
      totalMonth += amount;

      if (cat === 'salaire') {
        totalSalaires += amount;
      } else {
        totalAutres += amount;
      }
    });

    res.json({
      success: true,
      data: {
        period: { month: currentMonth, year: currentYear },
        total_month: totalMonth,
        total_salaires: totalSalaires,
        total_autres: totalAutres,
        by_category: byCategory,
        expenses_count: monthExpenses.length
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des statistiques'
    });
  }
};

/**
 * POST /api/expenses
 * Creer une depense
 */
const createExpense = async (req, res) => {
  try {
    const { category, description, amount, payment_method, reference, expense_date, notes } = req.body;

    if (!category || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Categorie, description et montant requis'
      });
    }

    const expense = await Expense.create({
      category,
      description,
      amount,
      payment_method: payment_method || 'especes',
      reference,
      expense_date: expense_date || new Date(),
      user_id: req.user.id,
      notes,
      company_id: req.user.company_id
    });

    const fullExpense = await Expense.findByPk(expense.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Depense enregistree avec succes',
      data: fullExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la creation de la depense'
    });
  }
};

/**
 * PUT /api/expenses/:id
 * Modifier une depense
 */
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Depense non trouvee'
      });
    }

    // Ne pas modifier les depenses liees a une paie
    if (expense.payroll_id) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une depense liee a une fiche de paie'
      });
    }

    const { category, description, amount, payment_method, reference, expense_date, notes } = req.body;

    await expense.update({
      category: category || expense.category,
      description: description || expense.description,
      amount: amount !== undefined ? amount : expense.amount,
      payment_method: payment_method || expense.payment_method,
      reference: reference !== undefined ? reference : expense.reference,
      expense_date: expense_date || expense.expense_date,
      notes: notes !== undefined ? notes : expense.notes
    });

    res.json({
      success: true,
      message: 'Depense modifiee avec succes',
      data: expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification'
    });
  }
};

/**
 * DELETE /api/expenses/:id
 * Supprimer une depense
 */
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Depense non trouvee'
      });
    }

    // Ne pas supprimer les depenses liees a une paie
    if (expense.payroll_id) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une depense liee a une fiche de paie'
      });
    }

    await expense.destroy();

    res.json({
      success: true,
      message: 'Depense supprimee avec succes'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};

module.exports = {
  getExpenses,
  getCategories,
  getExpenseStats,
  createExpense,
  updateExpense,
  deleteExpense
};
