import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip
} from '@mui/material';
import {
  CardMembership as SubscriptionIcon, Add as AddIcon, Edit as EditIcon,
  Refresh as RefreshIcon, Business as BusinessIcon
} from '@mui/icons-material';
import { superadminApi, companiesApi } from '../../services/api';

interface Subscription {
  id: number;
  company_id: number;
  plan: string;
  price: number;
  currency: string;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
  status: string;
  auto_renew: boolean;
  notes: string | null;
  company?: { id: number; name: string; code: string };
}
interface Company { id: number; name: string; code: string; plan: string; }

const planLabel = (p: string) => ({ basic: 'Basique', pro: 'Pro', premium: 'Premium' }[p] || p);
const planColor = (p: string): 'default' | 'primary' | 'success' => p === 'premium' ? 'success' : p === 'pro' ? 'primary' : 'default';
const statusColor = (s: string): 'success' | 'warning' | 'error' | 'default' =>
  s === 'actif' ? 'success' : s === 'suspendu' ? 'warning' : s === 'expire' ? 'error' : 'default';
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtCFA = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} F`;

const defaultForm = {
  company_id: '', plan: 'basic', price: '', currency: 'XOF',
  billing_cycle: 'mensuel', start_date: '', end_date: '', next_billing_date: '', notes: ''
};

const AdminSubscriptions: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [openEdit, setOpenEdit] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState<Partial<Subscription & { notes: string }>>({});

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [subsRes, compRes] = await Promise.all([superadminApi.getSubscriptions(), companiesApi.getCompanies()]);
      setSubs(subsRes.data.data || []);
      setCompanies(compRes.data.data || []);
    } catch { setError('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.company_id || !form.start_date) { setFormError('Entreprise et date de début obligatoires'); return; }
    setSaving(true);
    try {
      await superadminApi.createSubscription({
        ...form,
        company_id: parseInt(form.company_id),
        price: parseFloat(form.price) || 0,
        end_date: form.end_date || null,
        next_billing_date: form.next_billing_date || null
      });
      setSuccess('Abonnement créé'); setOpenAdd(false); setForm(defaultForm); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const openEditDialog = (s: Subscription) => {
    setEditSub(s);
    setEditForm({ plan: s.plan, price: s.price, status: s.status, billing_cycle: s.billing_cycle, end_date: s.end_date || undefined, next_billing_date: s.next_billing_date || undefined, notes: s.notes || '' });
    setFormError(''); setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editSub) return;
    setSaving(true); setFormError('');
    try {
      await superadminApi.updateSubscription(editSub.id, editForm);
      setSuccess('Abonnement mis à jour'); setOpenEdit(false); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SubscriptionIcon sx={{ fontSize: 28, color: '#2e7d32' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Abonnements</Typography>
            <Typography variant="body2" color="text.secondary">Gestion des abonnements SaaS par entreprise</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser"><IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} color="success" onClick={() => { setForm(defaultForm); setFormError(''); setOpenAdd(true); }}>
            Nouvel abonnement
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total', value: subs.length, color: '#1a237e' },
          { label: 'Actifs', value: subs.filter(s => s.status === 'actif').length, color: '#2e7d32' },
          { label: 'Suspendus', value: subs.filter(s => s.status === 'suspendu').length, color: '#e65100' },
          { label: 'Expirés', value: subs.filter(s => s.status === 'expire').length, color: '#b71c1c' },
        ].map(({ label, value, color }) => (
          <Grid item xs={3} key={label}>
            <Card><CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight={700} sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Plan</strong></TableCell>
              <TableCell><strong>Prix / cycle</strong></TableCell>
              <TableCell><strong>Début</strong></TableCell>
              <TableCell><strong>Fin</strong></TableCell>
              <TableCell><strong>Prochaine facture</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
            ) : subs.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Aucun abonnement</Typography>
              </TableCell></TableRow>
            ) : subs.map(s => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{s.company?.name || `Entreprise #${s.company_id}`}</Typography>
                      {s.company && <Chip label={s.company.code} size="small" variant="outlined" />}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Chip label={planLabel(s.plan)} size="small" color={planColor(s.plan)} /></TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{fmtCFA(s.price)}</Typography>
                  <Typography variant="caption" color="text.secondary">/{s.billing_cycle}</Typography>
                </TableCell>
                <TableCell><Typography variant="caption">{fmtDate(s.start_date)}</Typography></TableCell>
                <TableCell><Typography variant="caption">{fmtDate(s.end_date)}</Typography></TableCell>
                <TableCell><Typography variant="caption">{fmtDate(s.next_billing_date)}</Typography></TableCell>
                <TableCell><Chip label={s.status} size="small" color={statusColor(s.status)} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Modifier"><IconButton size="small" onClick={() => openEditDialog(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Création */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvel abonnement</DialogTitle>
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
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select value={form.plan} label="Plan" onChange={e => setForm({ ...form, plan: e.target.value })}>
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="pro">Pro</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Cycle</InputLabel>
                <Select value={form.billing_cycle} label="Cycle" onChange={e => setForm({ ...form, billing_cycle: e.target.value })}>
                  <MenuItem value="mensuel">Mensuel</MenuItem>
                  <MenuItem value="trimestriel">Trimestriel</MenuItem>
                  <MenuItem value="annuel">Annuel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Prix (XOF)" type="number"
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date de début *" type="date" InputLabelProps={{ shrink: true }}
                value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date de fin" type="date" InputLabelProps={{ shrink: true }}
                value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Prochaine facture" type="date" InputLabelProps={{ shrink: true }}
                value={form.next_billing_date} onChange={e => setForm({ ...form, next_billing_date: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline rows={2}
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier l'abonnement {editSub?.company?.name && `— ${editSub.company.name}`}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select value={editForm.plan || ''} label="Plan" onChange={e => setEditForm({ ...editForm, plan: e.target.value })}>
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="pro">Pro</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select value={editForm.status || ''} label="Statut" onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="suspendu">Suspendu</MenuItem>
                  <MenuItem value="expire">Expiré</MenuItem>
                  <MenuItem value="annule">Annulé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Prix" type="number"
                value={editForm.price || ''} onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Cycle</InputLabel>
                <Select value={editForm.billing_cycle || 'mensuel'} label="Cycle" onChange={e => setEditForm({ ...editForm, billing_cycle: e.target.value })}>
                  <MenuItem value="mensuel">Mensuel</MenuItem>
                  <MenuItem value="trimestriel">Trimestriel</MenuItem>
                  <MenuItem value="annuel">Annuel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date de fin" type="date" InputLabelProps={{ shrink: true }}
                value={editForm.end_date || ''} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Prochaine facture" type="date" InputLabelProps={{ shrink: true }}
                value={editForm.next_billing_date || ''} onChange={e => setEditForm({ ...editForm, next_billing_date: e.target.value })} />
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

export default AdminSubscriptions;
