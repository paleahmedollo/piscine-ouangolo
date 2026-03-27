import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Payment as PaymentIcon,
  CheckCircle,
  Cancel,
  People,
  AttachMoney,
  Print as PrintIcon,
  Warning as WarningIcon,
  RemoveCircle as DeductIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShoppingCart as AchatIcon,
  AccountBalance as ComptaIcon,
  BarChart as ReportIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { employeesApi, employeeShortagesApi, accountingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Employee {
  id: number;
  full_name: string;
  position: string;
  phone: string;
  email: string;
  hire_date: string;
  base_salary: number;
  contract_type: string;
  end_contract_date: string;
  // Piece d'identite
  id_type: string;
  id_number: string;
  id_issue_date: string;
  id_expiry_date: string;
  id_issued_by: string;
  // Informations personnelles
  birth_date: string;
  birth_place: string;
  gender: string;
  nationality: string;
  address: string;
  // Contact d'urgence & Famille
  emergency_contact_name: string;
  emergency_contact_phone: string;
  marital_status: string;
  dependents_count: number;
  notes: string;
  is_active: boolean;
}

interface Payroll {
  id: number;
  employee_id: number;
  period_month: number;
  period_year: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  payment_date: string | null;
  payment_method: string;
  status: string;
  notes: string;
  employee?: Employee;
}

interface PayrollStats {
  period: { month: number; year: number };
  employees_count: number;
  payrolls_count: number;
  total_base_salary: number;
  total_bonus: number;
  total_deductions: number;
  total_net_salary: number;
  total_paid: number;
  total_pending: number;
}

interface AccountingReport {
  period: { month: number; year: number; start: string; end: string };
  ventes: number;
  achats: number;
  charges: number;
  salaires: number;
  benefice: number;
  benefice_pct: number;
}

interface AccountingEntry {
  id: number;
  entry_date: string;
  description: string;
  amount: number;
  entry_type: 'vente' | 'achat' | 'charge' | 'salaire';
  payment_type: string;
  source_module: string;
}

const ENTRY_TYPE_LABEL: Record<string, string> = {
  vente: 'Vente', achat: 'Achat', charge: 'Charge', salaire: 'Salaire'
};
const ENTRY_TYPE_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  vente: 'success', achat: 'error', charge: 'warning', salaire: 'info'
};
const MODULE_LABEL: Record<string, string> = {
  restaurant: 'Restaurant', hotel: 'Hôtel', piscine: 'Piscine',
  events: 'Événements', depot: 'Dépôt', superette: 'Supérette',
  maquis: 'Maquis', lavage: 'Lavage', pressing: 'Pressing',
  expenses: 'Dépenses', employees: 'Salaires'
};

const positionLabels: Record<string, string> = {
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

const monthNames = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const Employees: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Comptabilité ────────────────────────────────────────────
  const today = new Date();
  const [acctMonth, setAcctMonth] = useState(today.getMonth() + 1);
  const [acctYear,  setAcctYear]  = useState(today.getFullYear());
  const [acctReport,  setAcctReport]  = useState<AccountingReport | null>(null);
  const [acctEntries, setAcctEntries] = useState<AccountingEntry[]>([]);
  const [acctFilter,  setAcctFilter]  = useState<string>('all');
  const [acctLoading, setAcctLoading] = useState(false);
  const [treasury, setTreasury] = useState<{
    global: { total_entrees: number; total_sorties: number; solde: number; detail: { ventes: number; achats: number; charges: number; salaires: number } };
    this_month: { period: { month: number; year: number }; ventes: number; achats: number; charges: number; salaires: number; benefice: number };
    recent_entries: AccountingEntry[];
  } | null>(null);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [openPayrollDialog, setOpenPayrollDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openMassPayrollDialog, setOpenMassPayrollDialog] = useState(false);
  const [openMassPayDialog, setOpenMassPayDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [massPayrollLoading, setMassPayrollLoading] = useState(false);

  // Shortage states
  interface Shortage {
    id: number;
    date: string;
    expected_amount: number;
    actual_amount: number;
    shortage_amount: number;
    status: string;
    notes: string;
    user_name?: string;
  }
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [shortageEmployee, setShortageEmployee] = useState<Employee | null>(null);
  const [openShortageDialog, setOpenShortageDialog] = useState(false);
  const [deductShortage, setDeductShortage] = useState<Shortage | null>(null);
  const [deductPayrollId, setDeductPayrollId] = useState<number | ''>('');
  const [openDeductDialog, setOpenDeductDialog] = useState(false);

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    position: 'vigile',
    phone: '',
    email: '',
    hire_date: new Date().toISOString().split('T')[0],
    base_salary: 0,
    contract_type: 'cdi',
    end_contract_date: '',
    id_type: '',
    id_number: '',
    id_issue_date: '',
    id_expiry_date: '',
    id_issued_by: '',
    birth_date: '',
    birth_place: '',
    gender: '',
    nationality: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    marital_status: '',
    dependents_count: 0,
    notes: ''
  });

  const [payrollForm, setPayrollForm] = useState({
    employee_id: 0,
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    bonus: 0,
    deductions: 0,
    notes: ''
  });

  const [payForm, setPayForm] = useState({
    payment_method: 'especes',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [massPayrollForm, setMassPayrollForm] = useState({
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear()
  });

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.getEmployees();
      setEmployees(response.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayrolls = async () => {
    try {
      const response = await employeesApi.getPayrolls();
      setPayrolls(response.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await employeesApi.getPayrollStats();
      setStats(response.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchPayrolls(), fetchStats()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── Comptabilité : chargement rapport + écritures ──────────
  const loadAccounting = async (m: number, y: number) => {
    setAcctLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([
        accountingApi.getReport(m, y),
        accountingApi.getEntries({ month: m, year: y })
      ]);
      setAcctReport(rRes.data?.data || null);
      setAcctEntries(eRes.data?.data || []);
    } catch { /* silencieux */ }
    setAcctLoading(false);
  };

  const loadTreasury = async () => {
    setTreasuryLoading(true);
    try {
      const res = await accountingApi.getTreasury();
      setTreasury(res.data?.data || null);
    } catch { /* silencieux */ }
    setTreasuryLoading(false);
  };

  useEffect(() => {
    if (tabValue === 3 || tabValue === 4) loadAccounting(acctMonth, acctYear);
    if (tabValue === 3) {
      loadTreasury();
      const interval = setInterval(loadTreasury, 60000);
      return () => clearInterval(interval);
    }
    if (tabValue === 5) loadTreasury();
  }, [tabValue, acctMonth, acctYear]);

  // Employee handlers
  const handleOpenEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        full_name: employee.full_name,
        position: employee.position,
        phone: employee.phone || '',
        email: employee.email || '',
        hire_date: employee.hire_date,
        base_salary: employee.base_salary,
        contract_type: employee.contract_type || 'cdi',
        end_contract_date: employee.end_contract_date || '',
        id_type: employee.id_type || '',
        id_number: employee.id_number || '',
        id_issue_date: employee.id_issue_date || '',
        id_expiry_date: employee.id_expiry_date || '',
        id_issued_by: employee.id_issued_by || '',
        birth_date: employee.birth_date || '',
        birth_place: employee.birth_place || '',
        gender: employee.gender || '',
        nationality: employee.nationality || '',
        address: employee.address || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        marital_status: employee.marital_status || '',
        dependents_count: employee.dependents_count || 0,
        notes: employee.notes || ''
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        full_name: '',
        position: 'vigile',
        phone: '',
        email: '',
        hire_date: new Date().toISOString().split('T')[0],
        base_salary: 0,
        contract_type: 'cdi',
        end_contract_date: '',
        id_type: '',
        id_number: '',
        id_issue_date: '',
        id_expiry_date: '',
        id_issued_by: '',
        birth_date: '',
        birth_place: '',
        gender: '',
        nationality: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        marital_status: '',
        dependents_count: 0,
        notes: ''
      });
    }
    setOpenEmployeeDialog(true);
  };

  const handleSaveEmployee = async () => {
    try {
      setError('');
      if (editingEmployee) {
        await employeesApi.updateEmployee(editingEmployee.id, employeeForm);
        setSuccess('Employe modifie avec succes');
      } else {
        await employeesApi.createEmployee(employeeForm);
        setSuccess('Employe cree avec succes');
      }
      setOpenEmployeeDialog(false);
      fetchEmployees();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de l\'operation');
    }
  };

  // Payroll handlers
  const handleOpenPayrollDialog = () => {
    setPayrollForm({
      employee_id: employees[0]?.id || 0,
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      bonus: 0,
      deductions: 0,
      notes: ''
    });
    setOpenPayrollDialog(true);
  };

  const handleSavePayroll = async () => {
    try {
      setError('');
      await employeesApi.createPayroll(payrollForm);
      setSuccess('Fiche de paie creee avec succes');
      setOpenPayrollDialog(false);
      fetchPayrolls();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de la creation');
    }
  };

  const handleOpenPayDialog = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setPayForm({
      payment_method: 'especes',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setOpenPayDialog(true);
  };

  const handlePay = async () => {
    if (!selectedPayroll) return;
    try {
      setError('');
      await employeesApi.payPayroll(selectedPayroll.id, payForm);
      setSuccess('Paiement effectue avec succes');
      setOpenPayDialog(false);
      fetchPayrolls();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors du paiement');
    }
  };

  const handleCancelPayroll = async (id: number) => {
    if (!window.confirm('Etes-vous sur de vouloir annuler cette paie ?')) return;
    try {
      await employeesApi.cancelPayroll(id);
      setSuccess('Paie annulee');
      fetchPayrolls();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de l\'annulation');
    }
  };

  // Mass payroll handlers
  const handleOpenMassPayrollDialog = () => {
    setMassPayrollForm({
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear()
    });
    setOpenMassPayrollDialog(true);
  };

  const handleMassPayroll = async () => {
    try {
      setMassPayrollLoading(true);
      setError('');
      const activeEmployees = employees.filter(e => e.is_active);

      if (activeEmployees.length === 0) {
        setError('Aucun employe actif');
        return;
      }

      let created = 0;
      let skipped = 0;

      for (const employee of activeEmployees) {
        try {
          await employeesApi.createPayroll({
            employee_id: employee.id,
            period_month: massPayrollForm.period_month,
            period_year: massPayrollForm.period_year,
            bonus: 0,
            deductions: 0,
            notes: 'Creation en masse'
          });
          created++;
        } catch {
          skipped++; // Fiche deja existante ou erreur
        }
      }

      setSuccess(`${created} fiches de paie creees, ${skipped} ignorees (deja existantes)`);
      setOpenMassPayrollDialog(false);
      fetchPayrolls();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de la creation en masse');
    } finally {
      setMassPayrollLoading(false);
    }
  };

  // Obtenir les paies en attente pour la periode
  const getPendingPayrolls = () => {
    return payrolls.filter(p => p.status === 'en_attente');
  };

  const handleOpenMassPayDialog = () => {
    setPayForm({
      payment_method: 'especes',
      payment_date: new Date().toISOString().split('T')[0],
      notes: 'Paiement en masse'
    });
    setOpenMassPayDialog(true);
  };

  const handleMassPay = async () => {
    try {
      setMassPayrollLoading(true);
      setError('');
      const pendingPayrolls = getPendingPayrolls();

      if (pendingPayrolls.length === 0) {
        setError('Aucune paie en attente');
        return;
      }

      let paid = 0;
      for (const payroll of pendingPayrolls) {
        try {
          await employeesApi.payPayroll(payroll.id, payForm);
          paid++;
        } catch {
          // Ignorer les erreurs individuelles
        }
      }

      setSuccess(`${paid} paies effectuees`);
      setOpenMassPayDialog(false);
      fetchPayrolls();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors du paiement en masse');
    } finally {
      setMassPayrollLoading(false);
    }
  };

  const printPayroll = (payroll: Payroll) => {
    const employee = payroll.employee;
    const periodLabel = `${monthNames[payroll.period_month - 1]} ${payroll.period_year}`;
    const paymentMethodLabel: Record<string, string> = {
      especes: 'Espèces',
      virement: 'Virement bancaire',
      cheque: 'Chèque'
    };
    const statusLabel = payroll.status === 'paye' ? 'PAYÉ' : payroll.status === 'annule' ? 'ANNULÉ' : 'EN ATTENTE';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bulletin de salaire — ${employee?.full_name} — ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
  .header { text-align: center; border-bottom: 3px double #1976d2; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; color: #1976d2; letter-spacing: 1px; }
  .header h2 { font-size: 14px; color: #555; margin-top: 4px; }
  .badge { display: inline-block; background: ${payroll.status === 'paye' ? '#e8f5e9' : payroll.status === 'annule' ? '#ffebee' : '#fff8e1'}; color: ${payroll.status === 'paye' ? '#2e7d32' : payroll.status === 'annule' ? '#c62828' : '#e65100'}; border: 1px solid ${payroll.status === 'paye' ? '#a5d6a7' : payroll.status === 'annule' ? '#ef9a9a' : '#ffcc02'}; padding: 3px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-top: 8px; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 11px; font-weight: bold; color: #1976d2; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; }
  .row:last-child { border-bottom: none; }
  .row.total { border-top: 2px solid #1976d2; border-bottom: 2px solid #1976d2; padding: 8px 0; margin-top: 4px; background: #f0f7ff; }
  .row label { color: #555; }
  .row span { font-weight: bold; }
  .row.total label, .row.total span { font-size: 15px; color: #1976d2; }
  .row.green span { color: #2e7d32; }
  .row.red span { color: #c62828; }
  .info-item { margin-bottom: 4px; }
  .info-item label { color: #666; font-size: 11px; display: block; }
  .info-item span { font-weight: bold; }
  .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
  @media print {
    body { padding: 8px; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${(user?.company?.name || 'Mon Entreprise').toUpperCase()}</h1>
  <h2>BULLETIN DE SALAIRE — ${periodLabel.toUpperCase()}</h2>
  <div class="badge">${statusLabel}</div>
</div>

<div class="section">
  <div class="section-title">Informations employé</div>
  <div class="grid">
    <div class="info-item"><label>Nom complet</label><span>${employee?.full_name || '-'}</span></div>
    <div class="info-item"><label>Poste</label><span>${positionLabels[employee?.position || ''] || employee?.position || '-'}</span></div>
    <div class="info-item"><label>Téléphone</label><span>${employee?.phone || '-'}</span></div>
    <div class="info-item"><label>Période</label><span>${periodLabel}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Détail du salaire</div>
  <div class="row">
    <label>Salaire de base</label>
    <span>${new Intl.NumberFormat('fr-FR').format(payroll.base_salary)} FCFA</span>
  </div>
  <div class="row green">
    <label>Bonus / Prime</label>
    <span>+ ${new Intl.NumberFormat('fr-FR').format(payroll.bonus)} FCFA</span>
  </div>
  <div class="row red">
    <label>Retenues / Déductions</label>
    <span>- ${new Intl.NumberFormat('fr-FR').format(payroll.deductions)} FCFA</span>
  </div>
  <div class="row total">
    <label>NET À PAYER</label>
    <span>${new Intl.NumberFormat('fr-FR').format(payroll.net_salary)} FCFA</span>
  </div>
</div>

${payroll.status === 'paye' ? `<div class="section">
  <div class="section-title">Paiement effectué</div>
  <div class="row">
    <label>Mode de paiement</label>
    <span>${paymentMethodLabel[payroll.payment_method] || payroll.payment_method || '-'}</span>
  </div>
  <div class="row">
    <label>Date de paiement</label>
    <span>${payroll.payment_date ? new Date(payroll.payment_date).toLocaleDateString('fr-FR') : '-'}</span>
  </div>
</div>` : ''}

${payroll.notes ? `<div class="section">
  <div class="section-title">Notes</div>
  <p>${payroll.notes}</p>
</div>` : ''}

<div class="footer">
  <span>Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
  <span>Piscine de Ouangolo — Gestion RH</span>
</div>

<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=700,height=900');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  if (loading) {
    return (
      <Layout title="Gestion des Employes">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Gestion des Employes">
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#2196f315', color: '#2196f3', mr: 2 }}>
                    <People />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Employes actifs</Typography>
                    <Typography variant="h5" fontWeight="bold">{stats.employees_count}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#4caf5015', color: '#4caf50', mr: 2 }}>
                    <AttachMoney />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Salaires</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_net_salary)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#ff980015', color: '#ff9800', mr: 2 }}>
                    <PaymentIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">En attente</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_pending)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#9c27b015', color: '#9c27b0', mr: 2 }}>
                    <CheckCircle />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Deja paye</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_paid)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Employes" />
          <Tab label="Fiches de Paie" />
          <Tab label="Manquants Caisse" icon={<WarningIcon color="error" fontSize="small" />} iconPosition="end" />
          <Tab label="Dashboard Compta" icon={<ComptaIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Rapport Mensuel"  icon={<ReportIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Trésorerie"       icon={<AttachMoney fontSize="small" />} iconPosition="start" />
        </Tabs>

        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* Tab Employes */}
          {tabValue === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" fontWeight="bold">Liste des Employes</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenEmployeeDialog()}>
                  Nouvel Employe
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Nom complet</strong></TableCell>
                      <TableCell><strong>Poste</strong></TableCell>
                      <TableCell><strong>Telephone</strong></TableCell>
                      <TableCell><strong>Date embauche</strong></TableCell>
                      <TableCell align="right"><strong>Salaire de base</strong></TableCell>
                      <TableCell><strong>Statut</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} hover>
                        <TableCell>{employee.full_name}</TableCell>
                        <TableCell>
                          <Chip label={positionLabels[employee.position] || employee.position} size="small" />
                        </TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                        <TableCell>{new Date(employee.hire_date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell align="right">{formatCurrency(employee.base_salary)}</TableCell>
                        <TableCell>
                          <Chip
                            icon={employee.is_active ? <CheckCircle /> : <Cancel />}
                            label={employee.is_active ? 'Actif' : 'Inactif'}
                            color={employee.is_active ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEmployeeDialog(employee)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Tab Fiches de Paie */}
          {tabValue === 1 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" fontWeight="bold">Fiches de Paie</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" color="primary" onClick={handleOpenMassPayrollDialog}>
                    Creer Fiches en Masse
                  </Button>
                  {getPendingPayrolls().length > 0 && (
                    <Button variant="outlined" color="success" onClick={handleOpenMassPayDialog}>
                      Payer Tout ({getPendingPayrolls().length})
                    </Button>
                  )}
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenPayrollDialog}>
                    Nouvelle Fiche
                  </Button>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Employe</strong></TableCell>
                      <TableCell><strong>Periode</strong></TableCell>
                      <TableCell align="right"><strong>Salaire base</strong></TableCell>
                      <TableCell align="right"><strong>Bonus</strong></TableCell>
                      <TableCell align="right"><strong>Retenues</strong></TableCell>
                      <TableCell align="right"><strong>Net a payer</strong></TableCell>
                      <TableCell><strong>Statut</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrolls.map((payroll) => (
                      <TableRow key={payroll.id} hover>
                        <TableCell>{payroll.employee?.full_name}</TableCell>
                        <TableCell>{monthNames[payroll.period_month - 1]} {payroll.period_year}</TableCell>
                        <TableCell align="right">{formatCurrency(payroll.base_salary)}</TableCell>
                        <TableCell align="right" sx={{ color: 'green' }}>+{formatCurrency(payroll.bonus)}</TableCell>
                        <TableCell align="right" sx={{ color: 'red' }}>-{formatCurrency(payroll.deductions)}</TableCell>
                        <TableCell align="right"><strong>{formatCurrency(payroll.net_salary)}</strong></TableCell>
                        <TableCell>
                          <Chip
                            label={payroll.status === 'paye' ? 'Paye' : payroll.status === 'annule' ? 'Annule' : 'En attente'}
                            color={payroll.status === 'paye' ? 'success' : payroll.status === 'annule' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {payroll.status === 'en_attente' && (
                            <>
                              <Tooltip title="Payer">
                                <IconButton size="small" color="success" onClick={() => handleOpenPayDialog(payroll)}>
                                  <PaymentIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Annuler">
                                <IconButton size="small" color="error" onClick={() => handleCancelPayroll(payroll.id)}>
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {payroll.status === 'paye' && (
                            <Typography variant="body2" color="text.secondary" component="span">
                              {payroll.payment_date ? new Date(payroll.payment_date).toLocaleDateString('fr-FR') : ''}
                            </Typography>
                          )}
                          <Tooltip title="Imprimer le bulletin">
                            <IconButton size="small" color="info" onClick={() => printPayroll(payroll)}>
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          {/* Tab Manquants Caisse */}
          {/* ── Tab 3 : Dashboard Comptabilité ───────────────────── */}
          {tabValue === 3 && (
            <>
              {/* Sélecteur période */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <ComptaIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Comptabilité Simplifiée</Typography>
                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                  <TextField select size="small" label="Mois" value={acctMonth}
                    onChange={e => setAcctMonth(Number(e.target.value))} sx={{ width: 130 }}>
                    {monthNames.map((m, i) => (
                      <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                    ))}
                  </TextField>
                  <TextField select size="small" label="Année" value={acctYear}
                    onChange={e => setAcctYear(Number(e.target.value))} sx={{ width: 100 }}>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              {/* Trésorerie & Performance — temps réel */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TrendingUpIcon fontSize="small" color="primary" /> Trésorerie & Performance (Temps réel)
                </Typography>
                {treasuryLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                ) : treasury ? (
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: `4px solid ${treasury.global.solde >= 0 ? '#4caf50' : '#f44336'}` }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Solde global</Typography>
                          <Typography variant="h6" fontWeight={700} color={treasury.global.solde >= 0 ? 'success.main' : 'error.main'}>
                            {formatCurrency(treasury.global.solde)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Ventes totales</Typography>
                          <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(treasury.global.detail.ventes)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #f44336' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Achats totaux</Typography>
                          <Typography variant="h6" fontWeight={700} color="error.main">{formatCurrency(treasury.global.detail.achats)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: `4px solid ${treasury.this_month.benefice >= 0 ? '#2196f3' : '#f44336'}` }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Bénéfice ce mois</Typography>
                          <Typography variant="h6" fontWeight={700} color={treasury.this_month.benefice >= 0 ? 'primary.main' : 'error.main'}>
                            {formatCurrency(treasury.this_month.benefice)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #ff9800' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Recettes ce mois</Typography>
                          <Typography variant="h6" fontWeight={700} color="#f57c00">{formatCurrency(treasury.this_month.ventes)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #9c27b0' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Charges ce mois</Typography>
                          <Typography variant="h6" fontWeight={700} color="#7b1fa2">{formatCurrency(treasury.this_month.charges + treasury.this_month.salaires)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">Données de trésorerie indisponibles</Typography>
                )}
              </Box>

              {acctLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
              ) : acctReport ? (
                <>
                  {/* 5 cartes KPI */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <TrendingUpIcon color="success" fontSize="small" />
                            <Typography variant="caption" color="text.secondary">Ventes</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700} color="success.main">
                            {formatCurrency(acctReport.ventes)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #f44336' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <AchatIcon color="error" fontSize="small" />
                            <Typography variant="caption" color="text.secondary">Achats</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700} color="error.main">
                            {formatCurrency(acctReport.achats)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #ff9800' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <TrendingDownIcon color="warning" fontSize="small" />
                            <Typography variant="caption" color="text.secondary">Charges</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700} color="warning.main">
                            {formatCurrency(acctReport.charges)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md>
                      <Card sx={{ borderLeft: '4px solid #2196f3' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <People color="info" fontSize="small" />
                            <Typography variant="caption" color="text.secondary">Salaires</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700} color="info.main">
                            {formatCurrency(acctReport.salaires)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4} md>
                      <Card sx={{ borderLeft: `4px solid ${acctReport.benefice >= 0 ? '#4caf50' : '#f44336'}`,
                        bgcolor: acctReport.benefice >= 0 ? 'success.50' : 'error.50' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <AttachMoney color={acctReport.benefice >= 0 ? 'success' : 'error'} fontSize="small" />
                            <Typography variant="caption" color="text.secondary">Bénéfice estimé</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700}
                            color={acctReport.benefice >= 0 ? 'success.main' : 'error.main'}>
                            {formatCurrency(acctReport.benefice)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {acctReport.benefice_pct}% de marge
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Formule */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Bénéfice</strong> = Ventes ({formatCurrency(acctReport.ventes)}) –
                    (Achats {formatCurrency(acctReport.achats)} +
                    Charges {formatCurrency(acctReport.charges)} +
                    Salaires {formatCurrency(acctReport.salaires)})
                    = <strong>{formatCurrency(acctReport.benefice)}</strong>
                  </Alert>
                </>
              ) : (
                <Alert severity="info">Aucune donnée comptable pour cette période.</Alert>
              )}
            </>
          )}

          {/* ── Tab 4 : Rapport Mensuel détaillé ───────────────── */}
          {tabValue === 4 && (
            <>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <ReportIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Rapport Mensuel Détaillé</Typography>
                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                  <TextField select size="small" label="Filtre" value={acctFilter}
                    onChange={e => setAcctFilter(e.target.value)} sx={{ width: 130 }}>
                    <MenuItem value="all">Tous</MenuItem>
                    <MenuItem value="vente">Ventes</MenuItem>
                    <MenuItem value="achat">Achats</MenuItem>
                    <MenuItem value="charge">Charges</MenuItem>
                    <MenuItem value="salaire">Salaires</MenuItem>
                  </TextField>
                  <TextField select size="small" label="Mois" value={acctMonth}
                    onChange={e => setAcctMonth(Number(e.target.value))} sx={{ width: 130 }}>
                    {monthNames.map((m, i) => (
                      <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                    ))}
                  </TextField>
                  <TextField select size="small" label="Année" value={acctYear}
                    onChange={e => setAcctYear(Number(e.target.value))} sx={{ width: 100 }}>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </TextField>
                  <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => {
                    const filtered = acctFilter === 'all' ? acctEntries : acctEntries.filter(e => e.entry_type === acctFilter);
                    const totV = acctReport?.ventes || 0;
                    const totA = acctReport?.achats || 0;
                    const totC = acctReport?.charges || 0;
                    const totS = acctReport?.salaires || 0;
                    const ben  = acctReport?.benefice || 0;
                    const w = window.open('', '_blank');
                    if (!w) return;
                    w.document.write(`<html><head><title>Rapport Comptable</title>
                      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}
                      th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}
                      th{background:#1a237e;color:white}.total{font-weight:bold;background:#f5f5f5}
                      .success{color:green}.error{color:red}.warning{color:orange}.info{color:#2196f3}
                      @media print{button{display:none}}</style></head><body>
                      <h2>Rapport Comptable — ${monthNames[acctMonth-1]} ${acctYear}</h2>
                      <table><thead><tr><th>Date</th><th>Description</th><th>Module</th><th>Type</th><th>Montant</th></tr></thead>
                      <tbody>${filtered.map(e => `<tr>
                        <td>${new Date(e.entry_date).toLocaleDateString('fr-FR')}</td>
                        <td>${e.description || '—'}</td>
                        <td>${MODULE_LABEL[e.source_module] || e.source_module || '—'}</td>
                        <td class="${ENTRY_TYPE_COLOR[e.entry_type]}">${ENTRY_TYPE_LABEL[e.entry_type]}</td>
                        <td>${formatCurrency(e.amount)}</td></tr>`).join('')}
                      </tbody></table>
                      <br/><table><thead><tr><th colspan="2">Résumé</th></tr></thead><tbody>
                      <tr><td>Total Ventes</td><td class="success">${formatCurrency(totV)}</td></tr>
                      <tr><td>Total Achats</td><td class="error">${formatCurrency(totA)}</td></tr>
                      <tr><td>Total Charges</td><td class="warning">${formatCurrency(totC)}</td></tr>
                      <tr><td>Total Salaires</td><td class="info">${formatCurrency(totS)}</td></tr>
                      <tr class="total"><td><strong>Bénéfice estimé</strong></td>
                      <td class="${ben >= 0 ? 'success' : 'error'}"><strong>${formatCurrency(ben)}</strong></td></tr>
                      </tbody></table>
                      <script>window.print();</script></body></html>`);
                    w.document.close();
                  }}>
                    Imprimer
                  </Button>
                </Box>
              </Box>

              {acctLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white' }}><strong>Date</strong></TableCell>
                          <TableCell sx={{ color: 'white' }}><strong>Description</strong></TableCell>
                          <TableCell sx={{ color: 'white' }}><strong>Module</strong></TableCell>
                          <TableCell sx={{ color: 'white' }}><strong>Type</strong></TableCell>
                          <TableCell sx={{ color: 'white' }} align="right"><strong>Montant</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(acctFilter === 'all' ? acctEntries : acctEntries.filter(e => e.entry_type === acctFilter))
                          .map(entry => (
                            <TableRow key={entry.id} hover>
                              <TableCell>
                                {new Date(entry.entry_date).toLocaleDateString('fr-FR')}
                              </TableCell>
                              <TableCell>{entry.description || '—'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={MODULE_LABEL[entry.source_module] || entry.source_module || '—'}
                                  size="small" variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={ENTRY_TYPE_LABEL[entry.entry_type]}
                                  color={ENTRY_TYPE_COLOR[entry.entry_type]}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  fontWeight={600}
                                  color={entry.entry_type === 'vente' ? 'success.main' : 'error.main'}
                                >
                                  {entry.entry_type === 'vente' ? '+' : '−'}{formatCurrency(entry.amount)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        {acctEntries.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              Aucune écriture pour cette période
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Totaux en bas */}
                  {acctReport && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Ventes</Typography>
                          <Typography fontWeight={700} color="success.main">{formatCurrency(acctReport.ventes)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Achats + Charges + Salaires</Typography>
                          <Typography fontWeight={700} color="error.main">
                            {formatCurrency(acctReport.achats + acctReport.charges + acctReport.salaires)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">Bénéfice estimé</Typography>
                          <Typography variant="h6" fontWeight={700}
                            color={acctReport.benefice >= 0 ? 'success.main' : 'error.main'}>
                            {formatCurrency(acctReport.benefice)}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({acctReport.benefice_pct}% marge)
                            </Typography>
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {tabValue === 2 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" fontWeight="bold">Manquants en caisse par employé</Typography>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Sélectionnez un employé pour voir ses manquants et déduire du salaire.
              </Alert>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Employé</strong></TableCell>
                      <TableCell><strong>Poste</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.filter(e => e.is_active).map(emp => (
                      <TableRow key={emp.id} hover>
                        <TableCell><strong>{emp.full_name}</strong></TableCell>
                        <TableCell><Chip label={positionLabels[emp.position] || emp.position} size="small" /></TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<WarningIcon />}
                            onClick={async () => {
                              setShortageEmployee(emp);
                              try {
                                const res = await employeeShortagesApi.getShortages(emp.id);
                                setShortages(res.data.data || []);
                              } catch { setShortages([]); }
                              setOpenShortageDialog(true);
                            }}
                          >
                            Voir manquants
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* ── Tab 5 : Trésorerie Globale ──────────────────────── */}
          {tabValue === 5 && (
            <>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <AttachMoney color="primary" />
                <Typography variant="h6" fontWeight={700}>Trésorerie Globale</Typography>
                <Button size="small" variant="outlined" startIcon={<ReportIcon />} onClick={loadTreasury} sx={{ ml: 'auto' }}>
                  Actualiser
                </Button>
              </Box>

              {treasuryLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
              ) : treasury ? (
                <>
                  {/* Solde global principal */}
                  <Card sx={{
                    borderLeft: `6px solid ${treasury.global.solde >= 0 ? '#4caf50' : '#f44336'}`,
                    bgcolor: treasury.global.solde >= 0 ? '#f1f8e9' : '#ffebee',
                    mb: 3, p: 1
                  }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">SOLDE GLOBAL CUMULÉ (depuis l'origine)</Typography>
                      <Typography variant="h3" fontWeight={800} color={treasury.global.solde >= 0 ? 'success.main' : 'error.main'} sx={{ my: 1 }}>
                        {formatCurrency(treasury.global.solde)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip color="success" label={`✅ Entrées : ${formatCurrency(treasury.global.total_entrees)}`} />
                        <Chip color="error"   label={`❌ Sorties : ${formatCurrency(treasury.global.total_sorties)}`} />
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Détail des entrées/sorties */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Ventes totales</Typography>
                          <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(treasury.global.detail.ventes)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #f44336' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Achats totaux</Typography>
                          <Typography variant="h6" fontWeight={700} color="error.main">{formatCurrency(treasury.global.detail.achats)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #ff9800' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Charges totales</Typography>
                          <Typography variant="h6" fontWeight={700} color="warning.main">{formatCurrency(treasury.global.detail.charges)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #9c27b0' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">Salaires totaux</Typography>
                          <Typography variant="h6" fontWeight={700} color="secondary.main">{formatCurrency(treasury.global.detail.salaires)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Ce mois-ci */}
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Ce mois ({treasury.this_month.period.month}/{treasury.this_month.period.year}) :
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[
                      { label: 'Ventes', val: treasury.this_month.ventes, color: '#4caf50' },
                      { label: 'Achats', val: treasury.this_month.achats, color: '#f44336' },
                      { label: 'Charges', val: treasury.this_month.charges, color: '#ff9800' },
                      { label: 'Salaires', val: treasury.this_month.salaires, color: '#9c27b0' },
                      { label: 'Bénéfice net', val: treasury.this_month.benefice, color: treasury.this_month.benefice >= 0 ? '#4caf50' : '#f44336' },
                    ].map(item => (
                      <Grid item xs={6} sm key={item.label}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                            <Typography variant="h6" fontWeight={700} sx={{ color: item.color }}>{formatCurrency(item.val)}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Dernières écritures */}
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Dernières écritures :</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Type</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                          <TableCell align="right"><strong>Montant</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {treasury.recent_entries.map((e: AccountingEntry) => (
                          <TableRow key={e.id} hover>
                            <TableCell>{new Date(e.entry_date).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell>
                              <Chip size="small"
                                label={e.entry_type === 'vente' ? 'Vente' : e.entry_type === 'achat' ? 'Achat' : e.entry_type === 'charge' ? 'Charge' : 'Salaire'}
                                color={e.entry_type === 'vente' ? 'success' : e.entry_type === 'salaire' ? 'secondary' : 'error'} />
                            </TableCell>
                            <TableCell>{e.description || '—'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: e.entry_type === 'vente' ? 'success.main' : 'error.main' }}>
                              {e.entry_type === 'vente' ? '+' : '-'}{formatCurrency(e.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {treasury.recent_entries.length === 0 && (
                          <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Aucune écriture</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Alert severity="info">Aucune donnée de trésorerie disponible.</Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Manquants d'un employé */}
      <Dialog open={openShortageDialog} onClose={() => setOpenShortageDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Manquants caisse — {shortageEmployee?.full_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {shortages.length === 0 ? (
            <Alert severity="success">Aucun manquant enregistré pour cet employé.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Attendu</TableCell>
                    <TableCell align="right">Collecté</TableCell>
                    <TableCell align="right">Manquant</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shortages.map(s => (
                    <TableRow key={s.id} sx={{ bgcolor: s.status === 'en_attente' ? 'warning.50' : 'inherit' }}>
                      <TableCell>{new Date(s.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell align="right">{formatCurrency(s.expected_amount)}</TableCell>
                      <TableCell align="right">{formatCurrency(s.actual_amount)}</TableCell>
                      <TableCell align="right">
                        <Typography color="error.main" fontWeight={700}>{formatCurrency(s.shortage_amount)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.status === 'en_attente' ? 'En attente' : s.status === 'deduit' ? 'Déduit' : 'Annulé'}
                          color={s.status === 'en_attente' ? 'warning' : s.status === 'deduit' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {s.status === 'en_attente' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<DeductIcon />}
                            onClick={() => {
                              setDeductShortage(s);
                              setDeductPayrollId('');
                              setOpenDeductDialog(true);
                            }}
                          >
                            Déduire
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShortageDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmation déduction */}
      <Dialog open={openDeductDialog} onClose={() => setOpenDeductDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" /> Confirmer la déduction
        </DialogTitle>
        <DialogContent>
          {deductShortage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography fontWeight={700}>
                ⚠️ {shortageEmployee?.full_name} doit {formatCurrency(deductShortage.shortage_amount)} à la caisse
              </Typography>
              <Typography variant="body2">
                Manquant du {new Date(deductShortage.date).toLocaleDateString('fr-FR')}
              </Typography>
            </Alert>
          )}
          <TextField
            fullWidth
            label="ID de la fiche de paie concernée *"
            type="number"
            size="small"
            value={deductPayrollId}
            onChange={e => setDeductPayrollId(parseInt(e.target.value) || '')}
            helperText="Entrez l'ID de la fiche de paie du mois concerné"
            sx={{ mt: 1 }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            Cette action déduira <strong>{deductShortage ? formatCurrency(deductShortage.shortage_amount) : ''}</strong> du salaire net
            et est <strong>irréversible</strong>.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeductDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!deductPayrollId}
            onClick={async () => {
              if (!shortageEmployee || !deductShortage) return;
              try {
                await employeeShortagesApi.deductShortage(shortageEmployee.id, {
                  shortage_id: deductShortage.id,
                  payroll_id: deductPayrollId as number
                });
                setSuccess('Manquant déduit du salaire avec succès');
                setOpenDeductDialog(false);
                const res = await employeeShortagesApi.getShortages(shortageEmployee.id);
                setShortages(res.data.data || []);
                fetchPayrolls();
              } catch (e: unknown) {
                setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
                setOpenDeductDialog(false);
              }
            }}
          >
            Confirmer la déduction
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Employe */}
      <Dialog open={openEmployeeDialog} onClose={() => setOpenEmployeeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingEmployee ? 'Modifier l\'employe' : 'Nouvel employe'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>

            {/* Section 1 : Informations professionnelles */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
              Informations professionnelles
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nom complet"
                  value={employeeForm.full_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Poste"
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  fullWidth
                >
                  {Object.entries(positionLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telephone"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d'embauche"
                  type="date"
                  value={employeeForm.hire_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Salaire de base (FCFA)"
                  type="number"
                  value={employeeForm.base_salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, base_salary: parseFloat(e.target.value) || 0 })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Type de contrat"
                  value={employeeForm.contract_type}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, contract_type: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="cdi">CDI</MenuItem>
                  <MenuItem value="cdd">CDD</MenuItem>
                  <MenuItem value="saisonnier">Saisonnier</MenuItem>
                  <MenuItem value="stage">Stage</MenuItem>
                </TextField>
              </Grid>
              {(employeeForm.contract_type === 'cdd' || employeeForm.contract_type === 'stage' || employeeForm.contract_type === 'saisonnier') && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date de fin de contrat"
                    type="date"
                    value={employeeForm.end_contract_date}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, end_contract_date: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              )}
            </Grid>

            {/* Section 2 : Piece d'identite */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
              Piece d'identite
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Type de piece"
                  value={employeeForm.id_type}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, id_type: e.target.value })}
                  fullWidth
                >
                  <MenuItem value=""><em>Non renseigne</em></MenuItem>
                  <MenuItem value="cni">Carte Nationale d'Identite (CNI)</MenuItem>
                  <MenuItem value="passeport">Passeport</MenuItem>
                  <MenuItem value="permis_sejour">Permis de sejour</MenuItem>
                  <MenuItem value="acte_naissance">Acte de naissance</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Numero de la piece"
                  value={employeeForm.id_number}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, id_number: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de delivrance"
                  type="date"
                  value={employeeForm.id_issue_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, id_issue_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d'expiration"
                  type="date"
                  value={employeeForm.id_expiry_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, id_expiry_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Delivre par (autorite / lieu)"
                  value={employeeForm.id_issued_by}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, id_issued_by: e.target.value })}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Section 3 : Informations personnelles */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
              Informations personnelles
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de naissance"
                  type="date"
                  value={employeeForm.birth_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, birth_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Lieu de naissance"
                  value={employeeForm.birth_place}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, birth_place: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Sexe"
                  value={employeeForm.gender}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, gender: e.target.value })}
                  fullWidth
                >
                  <MenuItem value=""><em>Non renseigne</em></MenuItem>
                  <MenuItem value="M">Masculin</MenuItem>
                  <MenuItem value="F">Feminin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nationalite"
                  value={employeeForm.nationality}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, nationality: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Adresse domicile"
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            {/* Section 4 : Contact d'urgence & Famille */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
              Contact d'urgence & Situation familiale
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nom contact d'urgence"
                  value={employeeForm.emergency_contact_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_name: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tel. contact d'urgence"
                  value={employeeForm.emergency_contact_phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_phone: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Situation matrimoniale"
                  value={employeeForm.marital_status}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, marital_status: e.target.value })}
                  fullWidth
                >
                  <MenuItem value=""><em>Non renseigne</em></MenuItem>
                  <MenuItem value="celibataire">Celibataire</MenuItem>
                  <MenuItem value="marie">Marie(e)</MenuItem>
                  <MenuItem value="divorce">Divorce(e)</MenuItem>
                  <MenuItem value="veuf">Veuf / Veuve</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre de personnes a charge"
                  type="number"
                  value={employeeForm.dependents_count}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, dependents_count: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>

            {/* Section 5 : Notes */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
              Remarques internes
            </Typography>
            <TextField
              label="Notes"
              value={employeeForm.notes}
              onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Observations, competences particulieres, historique..."
            />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEmployeeDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEmployee}>
            {editingEmployee ? 'Modifier' : 'Creer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Nouvelle Paie */}
      <Dialog open={openPayrollDialog} onClose={() => setOpenPayrollDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle fiche de paie</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Employe"
              value={payrollForm.employee_id}
              onChange={(e) => setPayrollForm({ ...payrollForm, employee_id: parseInt(e.target.value) })}
              fullWidth
            >
              {employees.filter(e => e.is_active).map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.full_name} - {positionLabels[employee.position]}
                </MenuItem>
              ))}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Mois"
                  value={payrollForm.period_month}
                  onChange={(e) => setPayrollForm({ ...payrollForm, period_month: parseInt(e.target.value) })}
                  fullWidth
                >
                  {monthNames.map((month, index) => (
                    <MenuItem key={index} value={index + 1}>{month}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Annee"
                  type="number"
                  value={payrollForm.period_year}
                  onChange={(e) => setPayrollForm({ ...payrollForm, period_year: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label="Bonus (FCFA)"
              type="number"
              value={payrollForm.bonus}
              onChange={(e) => setPayrollForm({ ...payrollForm, bonus: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="Retenues (FCFA)"
              type="number"
              value={payrollForm.deductions}
              onChange={(e) => setPayrollForm({ ...payrollForm, deductions: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={payrollForm.notes}
              onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayrollDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSavePayroll}>Creer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Payer */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Effectuer le paiement</DialogTitle>
        <DialogContent>
          {selectedPayroll && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{selectedPayroll.employee?.full_name}</strong><br />
                Période : <strong>{monthNames[selectedPayroll.period_month - 1]} {selectedPayroll.period_year}</strong>
              </Alert>
              <TextField
                label="Salaire de base"
                value={formatCurrency(selectedPayroll.base_salary)}
                disabled
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Mode de paiement"
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="especes">Especes</MenuItem>
                  <MenuItem value="virement">Virement</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
                <TextField
                  label="Date de paiement"
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Notes"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayDialog(false)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handlePay}>
            Confirmer le Paiement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Creation en Masse */}
      <Dialog open={openMassPayrollDialog} onClose={() => setOpenMassPayrollDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Creer les fiches de paie en masse</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Cette action va creer une fiche de paie pour tous les <strong>{employees.filter(e => e.is_active).length} employes actifs</strong> pour la periode selectionnee.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Mois"
                  value={massPayrollForm.period_month}
                  onChange={(e) => setMassPayrollForm({ ...massPayrollForm, period_month: parseInt(e.target.value) })}
                  fullWidth
                >
                  {monthNames.map((month, index) => (
                    <MenuItem key={index} value={index + 1}>{month}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Annee"
                  type="number"
                  value={massPayrollForm.period_year}
                  onChange={(e) => setMassPayrollForm({ ...massPayrollForm, period_year: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMassPayrollDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleMassPayroll}
            disabled={massPayrollLoading}
          >
            {massPayrollLoading ? <CircularProgress size={20} /> : 'Creer les Fiches'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Paiement en Masse */}
      <Dialog open={openMassPayDialog} onClose={() => setOpenMassPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payer toutes les fiches en attente</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Cette action va payer <strong>{getPendingPayrolls().length} fiches de paie</strong> en attente
              pour un total de <strong>{formatCurrency(getPendingPayrolls().reduce((sum, p) => sum + p.net_salary, 0))}</strong>.
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Mode de paiement"
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                fullWidth
              >
                <MenuItem value="especes">Especes</MenuItem>
                <MenuItem value="virement">Virement</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
              </TextField>
              <TextField
                label="Date de paiement"
                type="date"
                value={payForm.payment_date}
                onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMassPayDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleMassPay}
            disabled={massPayrollLoading}
          >
            {massPayrollLoading ? <CircularProgress size={20} /> : 'Payer Tout'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Employees;
