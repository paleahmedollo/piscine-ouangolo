import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip
} from '@mui/material';
import {
  Receipt as BillingIcon, Add as AddIcon, Edit as EditIcon,
  Refresh as RefreshIcon, CheckCircle as PaidIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { superadminApi, companiesApi } from '../../services/api';

interface Invoice {
  id: number;
  invoice_number: string;
  company_id: number;
  amount: number;
  currency: string;
  description: string | null;
  plan: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  company?: { id: number; name: string; code: string };
  created_at: string;
}
interface InvoiceStats {
  paid_count: string; unpaid_count: string;
  total_revenue: string; monthly_revenue: string; unpaid_amount: string;
}
interface Company { id: number; name: string; code: string; }

const statusColor = (s: string): 'success' | 'error' | 'warning' | 'default' =>
  s === 'payee' ? 'success' : s === 'en_retard' ? 'error' : s === 'impayee' ? 'warning' : 'default';
const statusLabel = (s: string) => ({ payee: 'Payée', impayee: 'Impayée', en_retard: 'En retard', annulee: 'Annulée' }[s] || s);
const fmtCFA = (n: number | string) => `${new Intl.NumberFormat('fr-FR').format(Number(n))} F`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const defaultForm = { company_id: '', amount: '', description: '', plan: '', period_start: '', period_end: '', due_date: '', notes: '' };

const AdminBilling: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [openEdit, setOpenEdit] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState<Partial<{ status: string; payment_method: string; paid_at: string; notes: string; due_date: string }>>({});

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const [invRes, compRes, statsRes] = await Promise.all([
        superadminApi.getInvoices(params),
        companiesApi.getCompanies(),
        superadminApi.getInvoiceStats()
      ]);
      setInvoices(invRes.data.data || []);
      setCompanies(compRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch { setError('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.company_id || !form.amount) { setFormError('Entreprise et montant obligatoires'); return; }
    setSaving(true);
    try {
      await superadminApi.createInvoice({ ...form, company_id: parseInt(form.company_id), amount: parseFloat(form.amount), period_start: form.period_start || null, period_end: form.period_end || null, due_date: form.due_date || null });
      setSuccess('Facture créée'); setOpenAdd(false); setForm(defaultForm); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const openEditDialog = (inv: Invoice) => {
    setEditInvoice(inv);
    setEditForm({ status: inv.status, payment_method: inv.payment_method || '', paid_at: inv.paid_at ? inv.paid_at.substring(0, 10) : '', notes: inv.notes || '', due_date: inv.due_date || '' });
    setFormError(''); setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editInvoice) return;
    setSaving(true); setFormError('');
    try {
      await superadminApi.updateInvoice(editInvoice.id, editForm);
      setSuccess('Facture mise à jour'); setOpenEdit(false); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const markAsPaid = async (inv: Invoice) => {
    try {
      await superadminApi.updateInvoice(inv.id, { status: 'payee', paid_at: new Date().toISOString().substring(0, 10) });
      setSuccess(`Facture ${inv.invoice_number} marquée comme payée`); loadData();
    } catch { setError('Erreur'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BillingIcon sx={{ fontSize: 28, color: '#1b5e20' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Facturation</Typography>
            <Typography variant="body2" color="text.secondary">Gestion des factures SaaS</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser"><IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(defaultForm); setFormError(''); setOpenAdd(true); }}>
            Nouvelle facture
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats financières */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Revenu total', value: fmtCFA(stats.total_revenue), color: '#1b5e20', bg: '#e8f5e9' },
            { label: 'Ce mois-ci', value: fmtCFA(stats.monthly_revenue), color: '#2e7d32', bg: '#f1f8e9' },
            { label: 'Factures payées', value: stats.paid_count, color: '#0d47a1', bg: '#e3f2fd' },
            { label: 'Montant impayé', value: fmtCFA(stats.unpaid_amount), color: '#b71c1c', bg: '#ffebee' },
          ].map(({ label, value, color, bg }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Card sx={{ bgcolor: bg, border: `1px solid ${bg}` }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filtre */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        {['', 'impayee', 'payee', 'en_retard', 'annulee'].map(s => (
          <Chip key={s} label={s ? statusLabel(s) : 'Toutes'}
            onClick={() => setFilterStatus(s)}
            color={filterStatus === s ? 'primary' : 'default'}
            variant={filterStatus === s ? 'filled' : 'outlined'} />
        ))}
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>N° Facture</strong></TableCell>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Montant</strong></TableCell>
              <TableCell><strong>Plan</strong></TableCell>
              <TableCell><strong>Échéance</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell><strong>Payée le</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Aucune facture</Typography>
              </TableCell></TableRow>
            ) : invoices.map(inv => (
              <TableRow key={inv.id} hover>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{inv.invoice_number}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2">{inv.company?.name || `#${inv.company_id}`}</Typography>
                      {inv.company && <Chip label={inv.company.code} size="small" variant="outlined" />}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Typography fontWeight={700} sx={{ color: '#1b5e20' }}>{fmtCFA(inv.amount)}</Typography></TableCell>
                <TableCell>{inv.plan ? <Chip label={inv.plan} size="small" /> : '—'}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: inv.status === 'en_retard' ? 'error.main' : 'text.primary' }}>
                    {fmtDate(inv.due_date)}
                  </Typography>
                </TableCell>
                <TableCell><Chip label={statusLabel(inv.status)} size="small" color={statusColor(inv.status)} /></TableCell>
                <TableCell><Typography variant="caption">{fmtDate(inv.paid_at)}</Typography></TableCell>
                <TableCell align="right">
                  {inv.status !== 'payee' && (
                    <Tooltip title="Marquer comme payée">
                      <IconButton size="small" color="success" onClick={() => markAsPaid(inv)}><PaidIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Modifier"><IconButton size="small" onClick={() => openEditDialog(inv)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Création */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle facture</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Entreprise *</InputLabel>
                <Select value={form.company_id} label="Entreprise *" onChange={e => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Montant (XOF) *" type="number"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan associé</InputLabel>
                <Select value={form.plan} label="Plan associé" onChange={e => setForm({ ...form, plan: e.target.value })}>
                  <MenuItem value="">Aucun</MenuItem>
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="pro">Pro</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={2}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Période début" type="date" InputLabelProps={{ shrink: true }}
                value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Période fin" type="date" InputLabelProps={{ shrink: true }}
                value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Date d'échéance" type="date" InputLabelProps={{ shrink: true }}
                value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier la facture {editInvoice?.invoice_number}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select value={editForm.status || ''} label="Statut" onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <MenuItem value="impayee">Impayée</MenuItem>
                  <MenuItem value="payee">Payée</MenuItem>
                  <MenuItem value="en_retard">En retard</MenuItem>
                  <MenuItem value="annulee">Annulée</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={editForm.payment_method || ''} label="Mode de paiement" onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="virement">Virement</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="carte">Carte</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Payée le" type="date" InputLabelProps={{ shrink: true }}
                value={editForm.paid_at || ''} onChange={e => setEditForm({ ...editForm, paid_at: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date d'échéance" type="date" InputLabelProps={{ shrink: true }}
                value={editForm.due_date || ''} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline rows={2}
                value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBilling;
