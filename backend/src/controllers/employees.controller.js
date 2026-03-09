const { Employee, Payroll, User, Expense, CashShortage } = require('../models');
const { Op } = require('sequelize');
const { getCompanyFilter } = require('../middlewares/auth.middleware');
const { createAccountingEntry } = require('../utils/accounting');

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
    const cf = getCompanyFilter(req);
    const where = { ...cf };

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
      is_active: true,
      company_id: req.user.company_id
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
    const cf = getCompanyFilter(req);
    const where = {};

    if (month) where.period_month = parseInt(month);
    if (year) where.period_year = parseInt(year);
    if (status) where.status = status;
    if (employee_id) where.employee_id = parseInt(employee_id);

    const payrolls = await Payroll.findAll({
      where,
      include: [{
        model: Employee,
        as: 'employee',
        where: { ...cf }
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
    const employee = await Employee.findOne({ where: { id: employee_id, ...getCompanyFilter(req) } });
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
      notes,
      company_id: req.user.company_id
    });

    // Recharger avec les associations
    const fullPayroll = await Payroll.findByPk(payroll.id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    // Récupérer les manquants en attente de cet employé (via son user_id)
    let pending_shortages = [];
    try {
      // L'employé peut être lié à un user_id via la colonne user_id de l'Employee, ou on cherche par company
      const cf = getCompanyFilter(req);
      pending_shortages = await CashShortage.findAll({
        where: {
          user_id: employee_id,
          status: 'en_attente',
          ...(cf.company_id ? { company_id: cf.company_id } : {})
        },
        order: [['date', 'ASC']]
      });
    } catch (e) { /* non-bloquant */ }

    res.status(201).json({
      success: true,
      message: 'Paie creee avec succes',
      data: fullPayroll,
      pending_shortages
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
      notes: notes,
      company_id: req.user.company_id
    });

    // Construire la description avec les manquants déduits si applicable
    let accountingDescription = `Salaire ${payroll.employee.full_name} - ${monthNames[payroll.period_month - 1]} ${payroll.period_year}`;
    try {
      const deductedShortages = await CashShortage.findAll({
        where: { deducted_from_payroll_id: payroll.id, status: 'deduit' }
      });
      if (deductedShortages.length > 0) {
        const totalDeducted = deductedShortages.reduce((sum, s) => sum + parseFloat(s.shortage_amount), 0);
        accountingDescription += ` (dont ${totalDeducted.toLocaleString('fr-FR')} FCFA manquants déduits)`;
      }
    } catch (e) { /* non-bloquant */ }

    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: payroll.net_salary,
      entry_type: 'salaire',
      payment_type: payroll.payment_method,
      description: accountingDescription,
      source_module: 'employees',
      source_id: payroll.id,
      source_type: 'payroll'
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

    const cf = getCompanyFilter(req);
    // Total des paies du mois
    const monthPayrolls = await Payroll.findAll({
      where: {
        period_month: currentMonth,
        period_year: currentYear
      },
      include: [{ model: Employee, as: 'employee', where: { ...cf } }]
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
    const activeEmployees = await Employee.count({ where: { is_active: true, ...cf } });

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

// =====================================================
// MANQUANTS CAISSE
// =====================================================

/**
 * GET /api/employees/:id/shortages
 * Manquants caisse d'un employé
 */
const getEmployeeShortages = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    // On cherche via user_id (l'employé doit avoir un compte user)
    // On expose aussi directement par user_id si c'est un user
    const shortages = await CashShortage.findAll({
      where: { user_id: employeeId },
      order: [['date', 'DESC']]
    });
    res.json({ success: true, data: shortages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/employees/:id/deduct-shortage
 * Déduire un manquant du salaire de l'employé
 */
const deductShortage = async (req, res) => {
  try {
    const { shortage_id, payroll_id } = req.body;

    if (!shortage_id || !payroll_id) {
      return res.status(400).json({ success: false, message: 'shortage_id et payroll_id requis' });
    }

    const shortage = await CashShortage.findByPk(shortage_id);
    if (!shortage) return res.status(404).json({ success: false, message: 'Manquant non trouvé' });
    if (shortage.status !== 'en_attente') {
      return res.status(400).json({ success: false, message: 'Ce manquant a déjà été traité' });
    }

    const payroll = await Payroll.findByPk(payroll_id, {
      include: [{ model: Employee, as: 'employee' }]
    });
    if (!payroll) return res.status(404).json({ success: false, message: 'Fiche de paie non trouvée' });

    const shortageAmount = parseFloat(shortage.shortage_amount);
    const currentDeductions = parseFloat(payroll.deductions) || 0;
    const newDeductions = currentDeductions + shortageAmount;
    const newNetSalary = parseFloat(payroll.base_salary) + parseFloat(payroll.bonus || 0) - newDeductions;

    await payroll.update({
      deductions: newDeductions,
      net_salary: Math.max(0, newNetSalary)
    });

    await shortage.update({
      status: 'deduit',
      deducted_from_payroll_id: payroll_id
    });

    res.json({
      success: true,
      message: `${shortageAmount.toLocaleString()} FCFA déduit du salaire`,
      data: { shortage, payroll: payroll.toJSON() }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/employees/:id/settle-shortage
 * L'employé règle physiquement un manquant (remet l'argent).
 * Crée une écriture comptable "reglement_ecart" et met le statut à "regle".
 */
const settleShortage = async (req, res) => {
  try {
    const { shortage_id, amount, payment_method, notes } = req.body;

    if (!shortage_id) {
      return res.status(400).json({ success: false, message: 'shortage_id requis' });
    }

    const shortage = await CashShortage.findByPk(shortage_id);
    if (!shortage) return res.status(404).json({ success: false, message: 'Manquant non trouvé' });

    if (shortage.status === 'regle') {
      return res.status(400).json({ success: false, message: 'Ce manquant a déjà été réglé' });
    }
    if (shortage.status === 'annule') {
      return res.status(400).json({ success: false, message: 'Ce manquant est annulé' });
    }

    const settledAmount = parseFloat(amount) || parseFloat(shortage.shortage_amount);

    // Créer l'écriture comptable de règlement d'écart
    await createAccountingEntry({
      company_id: req.user.company_id,
      amount: settledAmount,
      entry_type: 'reglement_ecart',
      payment_type: payment_method || 'especes',
      description: `Règlement manquant caisse du ${shortage.date} - montant ${settledAmount.toLocaleString('fr-FR')} FCFA`,
      source_module: 'employees',
      source_id: shortage.id,
      source_type: 'cash_shortage'
    });

    // Mettre à jour le statut du manquant
    await shortage.update({ status: 'regle', notes: notes || shortage.notes });

    // Si ce manquant avait été déduit d'une paie encore en attente, reverser la déduction
    if (shortage.status === 'deduit' && shortage.deducted_from_payroll_id) {
      const linkedPayroll = await Payroll.findByPk(shortage.deducted_from_payroll_id);
      if (linkedPayroll && linkedPayroll.status === 'en_attente') {
        const shortageAmount = parseFloat(shortage.shortage_amount);
        const currentDeductions = parseFloat(linkedPayroll.deductions) || 0;
        const newDeductions = Math.max(0, currentDeductions - shortageAmount);
        const newNetSalary = parseFloat(linkedPayroll.base_salary) + parseFloat(linkedPayroll.bonus || 0) - newDeductions;
        await linkedPayroll.update({
          deductions: newDeductions,
          net_salary: Math.max(0, newNetSalary)
        });
      }
    }

    res.json({
      success: true,
      message: `Manquant de ${settledAmount.toLocaleString('fr-FR')} FCFA réglé avec succès`,
      data: shortage
    });
  } catch (error) {
    console.error('Settle shortage error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du règlement du manquant' });
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
  getPayrollStats,
  getEmployeeShortages,
  deductShortage,
  settleShortage
};
