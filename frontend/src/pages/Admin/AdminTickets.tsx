import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip, Divider
} from '@mui/material';
import {
  SupportAgent as TicketIcon, Add as AddIcon, Edit as EditIcon,
  Refresh as RefreshIcon, Warning as WarningIcon
} from '@mui/icons-material';
import { superadminApi, companiesApi } from '../../services/api';

interface Ticket {
  id: number;
  ticket_number: string;
  company_id: number | null;
  user_id: number | null;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  opened_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  company?: { id: number; name: string; code: string };
  user?: { id: number; username: string; full_name: string };
  assignedUser?: { id: number; username: string; full_name: string };
  created_at: string;
}
interface TicketStats {
  open_count: string; new_count: string; urgent_count: string;
  resolved_week: string; avg_resolution_hours: string | null;
}
interface Company { id: number; name: string; code: string; }

const priorityColor = (p: string): 'default' | 'info' | 'warning' | 'error' =>
  p === 'urgente' ? 'error' : p === 'haute' ? 'warning' : p === 'moyenne' ? 'info' : 'default';
const statusColor = (s: string): 'default' | 'primary' | 'warning' | 'success' | 'error' =>
  s === 'ouvert' ? 'primary' : s === 'en_cours' ? 'warning' : s === 'resolu' ? 'success' : s === 'cloture' ? 'default' : 'default';
const statusLabel = (s: string) => ({
  ouvert: 'Ouvert', en_cours: 'En cours', attente_client: 'Attente client',
  resolu: 'Résolu', cloture: 'Clôturé'
}[s] || s);
const catLabel = (c: string) => ({ bogue: '🐛 Bogue', paiement: '💳 Paiement', amelioration: '💡 Amélioration', assistance: '🆘 Assistance' }[c] || c);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const defaultForm = { company_id: '', title: '', description: '', category: 'assistance', priority: 'moyenne', attachment_url: '' };

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [openEdit, setOpenEdit] = useState(false);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<Partial<{ status: string; priority: string; resolution_notes: string; category: string }>>({});

  const [openDetail, setOpenDetail] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const [ticketRes, compRes, statsRes] = await Promise.all([
        superadminApi.getTickets(params),
        companiesApi.getCompanies(),
        superadminApi.getTicketStats()
      ]);
      setTickets(ticketRes.data.data || []);
      setCompanies(compRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch { setError('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, [filterStatus, filterPriority]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.title || !form.description) { setFormError('Titre et description obligatoires'); return; }
    setSaving(true);
    try {
      await superadminApi.createTicket({ ...form, company_id: form.company_id ? parseInt(form.company_id) : null });
      setSuccess('Ticket créé'); setOpenAdd(false); setForm(defaultForm); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const openEditDialog = (t: Ticket) => {
    setEditTicket(t);
    setEditForm({ status: t.status, priority: t.priority, resolution_notes: t.resolution_notes || '', category: t.category });
    setFormError(''); setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editTicket) return;
    setSaving(true); setFormError('');
    try {
      await superadminApi.updateTicket(editTicket.id, editForm);
      setSuccess('Ticket mis à jour'); setOpenEdit(false); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TicketIcon sx={{ fontSize: 28, color: '#e65100' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Assistance (Billets)</Typography>
            <Typography variant="body2" color="text.secondary">Gestion des tickets de support</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser"><IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" color="warning" startIcon={<AddIcon />} onClick={() => { setForm(defaultForm); setFormError(''); setOpenAdd(true); }}>
            Nouveau ticket
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Ouverts', value: stats.open_count, color: '#1565c0', bg: '#e3f2fd' },
            { label: 'Urgents', value: stats.urgent_count, color: '#b71c1c', bg: '#ffebee' },
            { label: 'Résolus cette semaine', value: stats.resolved_week, color: '#2e7d32', bg: '#e8f5e9' },
            { label: 'Tps moyen résolution (h)', value: stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : '—', color: '#e65100', bg: '#fff3e0' },
          ].map(({ label, value, color, bg }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Card sx={{ bgcolor: bg }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filtres */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ mr: 1, lineHeight: '32px' }} color="text.secondary">Statut:</Typography>
        {[{ v: '', l: 'Tous' }, { v: 'ouvert', l: 'Ouverts' }, { v: 'en_cours', l: 'En cours' }, { v: 'resolu', l: 'Résolus' }, { v: 'cloture', l: 'Clôturés' }].map(({ v, l }) => (
          <Chip key={v} label={l} onClick={() => setFilterStatus(v)}
            color={filterStatus === v ? 'primary' : 'default'} variant={filterStatus === v ? 'filled' : 'outlined'} size="small" />
        ))}
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <Typography variant="body2" sx={{ mr: 1, lineHeight: '32px' }} color="text.secondary">Priorité:</Typography>
        {[{ v: '', l: 'Tous' }, { v: 'urgente', l: '🔴 Urgente' }, { v: 'haute', l: '🟠 Haute' }, { v: 'moyenne', l: '🟡 Moyenne' }, { v: 'basse', l: '🟢 Basse' }].map(({ v, l }) => (
          <Chip key={v} label={l} onClick={() => setFilterPriority(v)}
            color={filterPriority === v ? 'warning' : 'default'} variant={filterPriority === v ? 'filled' : 'outlined'} size="small" />
        ))}
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>N° Ticket</strong></TableCell>
              <TableCell><strong>Titre</strong></TableCell>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Catégorie</strong></TableCell>
              <TableCell><strong>Priorité</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell><strong>Ouvert le</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
            ) : tickets.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Aucun ticket</Typography>
              </TableCell></TableRow>
            ) : tickets.map(t => (
              <TableRow key={t.id} hover
                sx={{ borderLeft: t.priority === 'urgente' ? '4px solid #b71c1c' : t.priority === 'haute' ? '4px solid #e65100' : 'none' }}>
                <TableCell>
                  <Typography variant="caption" fontFamily="monospace" fontWeight={700}>{t.ticket_number}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                    onClick={() => { setDetailTicket(t); setOpenDetail(true); }}>
                    {t.title}
                  </Typography>
                  {t.user && <Typography variant="caption" color="text.secondary">par {t.user.full_name}</Typography>}
                </TableCell>
                <TableCell>{t.company ? <Chip label={t.company.name} size="small" icon={<WarningIcon sx={{ display: 'none' }} />} /> : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                <TableCell><Typography variant="caption">{catLabel(t.category)}</Typography></TableCell>
                <TableCell><Chip label={t.priority} size="small" color={priorityColor(t.priority)} /></TableCell>
                <TableCell><Chip label={statusLabel(t.status)} size="small" color={statusColor(t.status)} /></TableCell>
                <TableCell><Typography variant="caption">{fmtDate(t.opened_at)}</Typography></TableCell>
                <TableCell align="right">
                  <Tooltip title="Modifier"><IconButton size="small" onClick={() => openEditDialog(t)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Création */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau ticket d'assistance</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Entreprise concernée</InputLabel>
                <Select value={form.company_id} label="Entreprise concernée" onChange={e => setForm({ ...form, company_id: e.target.value })}>
                  <MenuItem value="">Aucune (interne)</MenuItem>
                  {companies.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Titre *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Catégorie</InputLabel>
                <Select value={form.category} label="Catégorie" onChange={e => setForm({ ...form, category: e.target.value })}>
                  <MenuItem value="bogue">🐛 Bogue</MenuItem>
                  <MenuItem value="paiement">💳 Paiement</MenuItem>
                  <MenuItem value="amelioration">💡 Amélioration</MenuItem>
                  <MenuItem value="assistance">🆘 Assistance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priorité</InputLabel>
                <Select value={form.priority} label="Priorité" onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <MenuItem value="basse">🟢 Basse</MenuItem>
                  <MenuItem value="moyenne">🟡 Moyenne</MenuItem>
                  <MenuItem value="haute">🟠 Haute</MenuItem>
                  <MenuItem value="urgente">🔴 Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description *" multiline rows={4}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}>Créer le ticket</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Traiter le ticket {editTicket?.ticket_number}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select value={editForm.status || ''} label="Statut" onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <MenuItem value="ouvert">Ouvert</MenuItem>
                  <MenuItem value="en_cours">En cours</MenuItem>
                  <MenuItem value="attente_client">Attente client</MenuItem>
                  <MenuItem value="resolu">Résolu</MenuItem>
                  <MenuItem value="cloture">Clôturé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priorité</InputLabel>
                <Select value={editForm.priority || ''} label="Priorité" onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                  <MenuItem value="basse">🟢 Basse</MenuItem>
                  <MenuItem value="moyenne">🟡 Moyenne</MenuItem>
                  <MenuItem value="haute">🟠 Haute</MenuItem>
                  <MenuItem value="urgente">🔴 Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes de résolution" multiline rows={4}
                value={editForm.resolution_notes || ''} onChange={e => setEditForm({ ...editForm, resolution_notes: e.target.value })}
                helperText="Résumé de la résolution ou action prise" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Détail */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {detailTicket?.ticket_number}
          <Chip label={detailTicket?.priority} size="small" color={priorityColor(detailTicket?.priority || '')} sx={{ ml: 1 }} />
        </DialogTitle>
        <DialogContent>
          {detailTicket && (
            <Box>
              <Typography variant="h6" gutterBottom>{detailTicket.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={catLabel(detailTicket.category)} size="small" />
                <Chip label={statusLabel(detailTicket.status)} size="small" color={statusColor(detailTicket.status)} />
                {detailTicket.company && <Chip label={detailTicket.company.name} size="small" icon={<TicketIcon />} />}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{detailTicket.description}</Typography>
              {detailTicket.resolution_notes && (
                <Box sx={{ bgcolor: '#f1f8e9', p: 2, borderRadius: 1, border: '1px solid #c5e1a5' }}>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>✅ Notes de résolution</Typography>
                  <Typography variant="body2">{detailTicket.resolution_notes}</Typography>
                </Box>
              )}
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Ouvert le : {fmtDate(detailTicket.opened_at)}</Typography>
                {detailTicket.resolved_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Résolu le : {fmtDate(detailTicket.resolved_at)}</Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Fermer</Button>
          {detailTicket && (
            <Button variant="outlined" onClick={() => { setOpenDetail(false); openEditDialog(detailTicket); }}>Modifier</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTickets;
