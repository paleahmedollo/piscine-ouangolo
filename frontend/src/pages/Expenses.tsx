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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  AttachMoney,
  People,
  Receipt,
  TrendingDown
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { expensesApi } from '../services/api';

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  reference: string;
  expense_date: string;
  payroll_id: number | null;
  notes: string;
  user?: { full_name: string };
  payroll?: { employee?: { full_name: string } };
}

interface ExpenseStats {
  period: { month: number; year: number };
  total_month: number;
  total_salaires: number;
  total_autres: number;
  expenses_count: number;
}

const categoryLabels: Record<string, string> = {
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

const categoryColors: Record<string, string> = {
  salaire: '#9c27b0',
  fournitures: '#2196f3',
  maintenance: '#ff9800',
  electricite: '#f44336',
  eau: '#00bcd4',
  telephone: '#4caf50',
  internet: '#3f51b5',
  carburant: '#795548',
  transport: '#607d8b',
  nourriture: '#ff5722',
  autre: '#9e9e9e'
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form
  const [formData, setFormData] = useState({
    category: 'autre',
    description: '',
    amount: 0,
    payment_method: 'especes',
    reference: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchExpenses = async () => {
    try {
      const response = await expensesApi.getExpenses();
      setExpenses(response.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await expensesApi.getExpenseStats();
      setStats(response.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchExpenses(), fetchStats()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        payment_method: expense.payment_method,
        reference: expense.reference || '',
        expense_date: expense.expense_date,
        notes: expense.notes || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({
        category: 'autre',
        description: '',
        amount: 0,
        payment_method: 'especes',
        reference: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      setError('');
      if (editingExpense) {
        await expensesApi.updateExpense(editingExpense.id, formData);
        setSuccess('Depense modifiee avec succes');
      } else {
        await expensesApi.createExpense(formData);
        setSuccess('Depense enregistree avec succes');
      }
      setOpenDialog(false);
      fetchExpenses();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de l\'operation');
    }
  };

  if (loading) {
    return (
      <Layout title="Gestion des Depenses">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Gestion des Depenses">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f4433615', color: '#f44336', mr: 2 }}>
                    <TrendingDown />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Depenses</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_month)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#9c27b015', color: '#9c27b0', mr: 2 }}>
                    <People />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Salaires</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_salaires)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#ff980015', color: '#ff9800', mr: 2 }}>
                    <Receipt />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Autres Depenses</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_autres)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#2196f315', color: '#2196f3', mr: 2 }}>
                    <AttachMoney />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Nb Depenses</Typography>
                    <Typography variant="h5" fontWeight="bold">{stats.expenses_count}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Liste des depenses */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">Liste des Depenses</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Nouvelle Depense
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Categorie</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="right"><strong>Montant</strong></TableCell>
                  <TableCell><strong>Mode paiement</strong></TableCell>
                  <TableCell><strong>Reference</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} hover>
                    <TableCell>{new Date(expense.expense_date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Chip
                        label={categoryLabels[expense.category] || expense.category}
                        size="small"
                        sx={{
                          backgroundColor: `${categoryColors[expense.category]}15`,
                          color: categoryColors[expense.category],
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                      -{formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{expense.payment_method}</TableCell>
                    <TableCell>{expense.reference || '-'}</TableCell>
                    <TableCell align="center">
                      {!expense.payroll_id ? (
                        <Tooltip title="Modifier">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(expense)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Chip label="Paie" size="small" color="secondary" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      Aucune depense enregistree
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingExpense ? 'Modifier la depense' : 'Nouvelle depense'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Categorie"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              {Object.entries(categoryLabels).filter(([key]) => key !== 'salaire').map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Montant (FCFA)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              required
            />
            <TextField
              select
              label="Mode de paiement"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              fullWidth
            >
              <MenuItem value="especes">Especes</MenuItem>
              <MenuItem value="virement">Virement</MenuItem>
              <MenuItem value="cheque">Cheque</MenuItem>
              <MenuItem value="mobile_money">Mobile Money</MenuItem>
            </TextField>
            <TextField
              label="Reference (facture, etc.)"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              fullWidth
            />
            <TextField
              label="Date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingExpense ? 'Modifier' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Expenses;
