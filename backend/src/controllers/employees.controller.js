const { Employee, Payroll, User, Expense } = require('../models');
const { Op } = require('sequelize');

// Position labels
const positionLabels = {
  vigile: 'Vigile',
  agent_entretien: 'Agent d\'entretien',
  maitre_nageur: 'Maitre-nageur',
  serveuse: 'Serveuse',
  cuisinier: 'Cuisinier',
  receptionniste: 'Receptionniste',
  gestionnaire_events: 'Gestionnaire Events',
  comptable: 'Comptable',
  gerant: 'Gerant'
};

// =====================================================
// EMPLOYEES
// =====================================================

/**
 * GET /api/employees
 * Liste des employes
 */
const getEmployees = async (req, res) => {
  try {
    const { position, is_active } = req.query;
    const where = {};

    if (position) where.position = position;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const employees = await Employee.findAll({
      where,
      order: [['full_name', 'ASC']]
    });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des employes'
    });
  }
};

/**
 * GET /api/employees/positions
 * Liste des postes disponibles
 */
const getPositions = async (req, res) => {
  res.json({
    success: true,
    data: positionLabels
  });
};

/**
 * GET /api/employees/:id
 * Details d'un employe
 */
const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [{
        model: Payroll,
        as: 'payrolls',
        order: [['period_year', 'DESC'], ['period_month', 'DESC']],
        limit: 12
      }]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employe non trouve'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation de l\'employe'
    });
  }
};

/**
 * POST /api/employees
 * Creer un employe
 */
const createEmployee = async (req, res) => {
  try {
    const {
      full_name, position, phone, email, hire_date, base_salary,
      contract_type, end_contract_date,
      id_type, id_number, id_issue_date, id_expiry_date, id_issued_by,
      birth_date, birth_place, gender, nationality, address,
      emergency_contact_name, emergency_contact_phone,
      marital_status, dependents_count,
      notes
    } = req.body;

    if (!full_name || !position) {
      return res.status(400).json({
        success: false,
        message: 'Nom et poste requis'
      });
    }

    const employee = await Employee.create({
      full_name,
      position,
      phone,
      email,
      hire_date: hire_date || new Date(),
      base_salary: base_salary || 0,
      contract_type: contract_type || 'cdi',
      end_contract_date,
      id_type, id_number, id_issue_date, id_expiry_date, id_issued_by,
      birth_date, birth_place, gender, nationality, address,
      emergency_contact_name, emergency_contact_phone,
      marital_status, dependents_count: dependents_count || 0,
      notes,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Employe cree avec succes',
      data: employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la creation de l\'employe'
    });
  }
};

/**
 * PUT /api/employees/:id
 * Modifier un employe
 */
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employe non trouve'
      });
    }

    const {
      full_name, position, phone, email, hire_date, base_salary, is_active,
      contract_type, end_contract_date,
      id_type, id_number, id_issue_date, id_expiry_date, id_issued_by,
      birth_date, birth_place, gender, nationality, address,
      emergency_contact_name, emergency_contact_phone,
      marital_status, dependents_count,
      notes
    } = req.body;

    const updateData = {
      full_name: full_name || employee.full_name,
      position: position || employee.position,
      phone: phone !== undefined ? phone : employee.phone,
      email: email !== undefined ? email : employee.email,
      hire_date: hire_date || employee.hire_date,
      base_salary: base_salary !== undefined ? base_salary : employee.base_salary,
      is_active: is_active !== undefined ? is_active : employee.is_active,
      contract_type: contract_type !== undefined ? contract_type : employee.contract_type,
      end_contract_date: end_contract_date !== undefined ? end_contract_date : employee.end_contract_date,
      id_type: id_type !== undefined ? id_type : employee.id_type,
      id_number: id_number !== undefined ? id_number : employee.id_number,
      id_issue_date: id_issue_date !== undefined ? id_issue_date : employee.id_issue_date,
      id_expiry_date: id_expiry_date !== undefined ? id_expiry_date : employee.id_expiry_date,
      id_issued_by: id_issued_by !== undefined ? id_issued_by : employee.id_issued_by,
      birth_date: birth_date !== undefined ? birth_date : employee.birth_date,
      birth_place: birth_place !== undefined ? birth_place : employee.birth_place,
      gender: gender !== undefined ? gender : employee.gender,
      nationality: nationality !== undefined ? nationality : employee.nationality,
      address: address !== undefined ? address : employee.address,
      emergency_contact_name: emergency_contact_name !== undefined ? emergency_contact_name : employee.emergency_contact_name,
      emergency_contact_phone: emergency_contact_phone !== undefined ? emergency_contact_phone : employee.emergency_contact_phone,
      marital_status: marital_status !== undefined ? marital_status : employee.marital_status,
      dependents_count: dependents_count !== undefined ? dependents_count : employee.dependents_count,
      notes: notes !== undefined ? notes : employee.notes
    };

    await employee.update(updateData);

    res.json({
      success: true,
      message: 'Employe modifie avec succes',
      data: employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'employe'
    });
  }
};

/**
 * DELETE /api/employees/:id
 * Supprimer un employe
 */
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employe non trouve'
      });
    }

    // Verifier s'il a des paies
    const payrollCount = await Payroll.count({ where: { employee_id: employee.id } });
    if (payrollCount > 0) {
      // Desactiver au lieu de supprimer
      await employee.update({ is_active: false });
      return res.json({
        success: true,
        message: 'Employe desactive (historique de paie conserve)'
      });
    }

    await employee.destroy();

    res.json({
      success: true,
      message: 'Employe supprime avec succes'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'employe'
    });
  }
};

// =====================================================
// PAYROLL
// =====================================================

/**
 * GET /api/employees/payroll
 * Liste des paies
 */
const getPayrolls = async (req, res) => {
  try {
    const { month, year, status, employee_id } = req.query;
    const where = {};

    if (month) where.period_month = parseInt(month);
    if (year) where.period_year = parseInt(year);
    if (status) where.status = status;
    if (employee_id) where.employee_id = parseInt(employee_id);

    const payrolls = await Payroll.findAll({
      where,
      include: [{
        model: Employee,
        as: 'employee'
      }, {
        model: User,
        as: 'paidByUser',
        attributes: ['id', 'username', 'full_name']
      }],
      order: [['period_year', 'DESC'], ['period_month', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: payrolls
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des paies'
    });
  }
};

/**
 * POST /api/employees/payroll
 * Creer une paie
 */
const createPayroll = async (req, res) => {
  try {
    const { employee_id, period_month, period_year, bonus, deductions, notes } = req.body;

    // Verifier l'employe
    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employe non trouve'
      });
    }

    // Verifier si une paie existe deja pour ce mois
    const existingPayroll = await Payroll.findOne({
      where: {
        employee_id,
        period_month,
        period_year
      }
    });

    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        message: 'Une paie existe deja pour cet employe ce mois-ci'
      });
    }

    const base_salary = parseFloat(employee.base_salary);
    const bonusAmount = parseFloat(bonus) || 0;
    const deductionsAmount = parseFloat(deductions) || 0;
    const net_salary = base_salary + bonusAmount - deductionsAmount;

    const payroll = await Payroll.create({
      employee_id,
      period_month,
      period_year,
      base_salary,
      bonus: bonusAmount,
      deductions: deductionsAmount,
      net_salary,
      status: 'en_attente',
      notes
    });

    // Recharger avec les associations
    const fullPayroll = await Payroll.findByPk(payroll.id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    res.status(201).json({
      success: true,
      message: 'Paie creee avec succes',
      data: fullPayroll
    });
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la creation de la paie'
    });
  }
};

/**
 * PUT /api/employees/payroll/:id/pay
 * Marquer une paie comme payee et creer une depense
 */
const payPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Paie non trouvee'
      });
    }

    if (payroll.status === 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Cette paie a deja ete payee'
      });
    }

    const { payment_method, payment_date, notes } = req.body;
    const paymentMethodValue = payment_method || 'especes';
    const paymentDateValue = payment_date || new Date();

    // Mettre a jour la paie
    await payroll.update({
      status: 'paye',
      payment_method: paymentMethodValue,
      payment_date: paymentDateValue,
      paid_by: req.user.id,
      notes: notes || payroll.notes
    });

    // Creer automatiquement une depense liee au salaire
    const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    await Expense.create({
      category: 'salaire',
      description: `Salaire ${payroll.employee.full_name} - ${monthNames[payroll.period_month - 1]} ${payroll.period_year}`,
      amount: payroll.net_salary,
      payment_method: paymentMethodValue,
      reference: `PAIE-${payroll.id}`,
      expense_date: paymentDateValue,
      payroll_id: payroll.id,
      user_id: req.user.id,
      notes: notes
    });

    const fullPayroll = await Payroll.findByPk(payroll.id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: User, as: 'paidByUser', attributes: ['id', 'username', 'full_name'] }
      ]
    });

    res.json({
      success: true,
      message: 'Paie effectuee et depense enregistree avec succes',
      data: fullPayroll
    });
  } catch (error) {
    console.error('Pay payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du paiement'
    });
  }
};

/**
 * DELETE /api/employees/payroll/:id
 * Annuler une paie
 */
const cancelPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Paie non trouvee'
      });
    }

    if (payroll.status === 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler une paie deja effectuee'
      });
    }

    await payroll.update({ status: 'annule' });

    res.json({
      success: true,
      message: 'Paie annulee avec succes'
    });
  } catch (error) {
    console.error('Cancel payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation'
    });
  }
};

/**
 * GET /api/employees/payroll/stats
 * Statistiques des paies
 */
const getPayrollStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Total des paies du mois
    const monthPayrolls = await Payroll.findAll({
      where: {
        period_month: currentMonth,
        period_year: currentYear
      },
      include: [{ model: Employee, as: 'employee' }]
    });

    const totalBase = monthPayrolls.reduce((sum, p) => sum + parseFloat(p.base_salary), 0);
    const totalBonus = monthPayrolls.reduce((sum, p) => sum + parseFloat(p.bonus), 0);
    const totalDeductions = monthPayrolls.reduce((sum, p) => sum + parseFloat(p.deductions), 0);
    const totalNet = monthPayrolls.reduce((sum, p) => sum + parseFloat(p.net_salary), 0);
    const totalPaid = monthPayrolls
      .filter(p => p.status === 'paye')
      .reduce((sum, p) => sum + parseFloat(p.net_salary), 0);
    const totalPending = monthPayrolls
      .filter(p => p.status === 'en_attente')
      .reduce((sum, p) => sum + parseFloat(p.net_salary), 0);

    // Employes actifs
    const activeEmployees = await Employee.count({ where: { is_active: true } });

    res.json({
      success: true,
      data: {
        period: { month: currentMonth, year: currentYear },
        employees_count: activeEmployees,
        payrolls_count: monthPayrolls.length,
        total_base_salary: totalBase,
        total_bonus: totalBonus,
        total_deductions: totalDeductions,
        total_net_salary: totalNet,
        total_paid: totalPaid,
        total_pending: totalPending
      }
    });
  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des statistiques'
    });
  }
};

module.exports = {
  getEmployees,
  getPositions,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getPayrolls,
  createPayroll,
  payPayroll,
  cancelPayroll,
  getPayrollStats
};
