import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip, InputAdornment
} from '@mui/material';
import {
  People as PeopleIcon, Edit as EditIcon, Search as SearchIcon,
  Refresh as RefreshIcon, LockReset as ResetPwdIcon,
  CheckCircle as ActiveIcon, Cancel as InactiveIcon,
  PersonOff as DeactivateIcon
} from '@mui/icons-material';
import { superadminApi, companiesApi } from '../../services/api';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  company_id: number | null;
  company?: { id: number; name: string; code: string };
  created_at: string;
  updated_at: string;
}
interface Company { id: number; name: string; code: string; }

const ROLES = ['admin', 'gerant', 'directeur', 'responsable', 'maire', 'maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events'];
const roleColor = (r: string): 'default' | 'primary' | 'success' | 'warning' | 'error' =>
  r === 'admin' ? 'error' : r === 'gerant' ? 'primary' : r === 'directeur' ? 'success' : 'default';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  // Dialog edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<{ full_name: string; role: string; company_id: string; is_active: boolean }>({ full_name: '', role: '', company_id: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Dialog reset password
  const [openReset, setOpenReset] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterCompany) params.company_id = filterCompany;
      const [usersRes, companiesRes] = await Promise.all([
        superadminApi.getUsers(params),
        companiesApi.getCompanies()
      ]);
      setUsers(usersRes.data.data || []);
      setCompanies(companiesRes.data.data || []);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  const openEditDialog = (u: User) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name, role: u.role, company_id: u.company_id ? String(u.company_id) : '', is_active: u.is_active });
    setFormError(''); setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true); setFormError('');
    try {
      await superadminApi.updateUser(editUser.id, {
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
        company_id: editForm.company_id ? parseInt(editForm.company_id) : null
      });
      setSuccess('Utilisateur mis à jour'); setOpenEdit(false); loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const openResetDialog = (u: User) => {
    setResetUser(u); setNewPassword(''); setOpenReset(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    setResetLoading(true);
    try {
      await superadminApi.resetUserPassword(resetUser.id, newPassword);
      setSuccess(`Mot de passe réinitialisé pour ${resetUser.username}`);
      setOpenReset(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Erreur');
    } finally { setResetLoading(false); }
  };

  const handleDeactivate = async (u: User) => {
    if (!window.confirm(`Désactiver l'utilisateur "${u.username}" ?`)) return;
    try {
      await superadminApi.deleteUser(u.id);
      setSuccess(`Utilisateur "${u.username}" désactivé`); loadData();
    } catch { setError('Erreur lors de la désactivation'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon sx={{ fontSize: 28, color: '#1a237e' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Gestion des utilisateurs</Typography>
            <Typography variant="body2" color="text.secondary">Tous les comptes de toutes les entreprises</Typography>
          </Box>
        </Box>
        <Tooltip title="Actualiser"><IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Statistiques */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total utilisateurs', value: users.length, color: '#1a237e' },
          { label: 'Actifs', value: users.filter(u => u.is_active).length, color: '#2e7d32' },
          { label: 'Inactifs', value: users.filter(u => !u.is_active).length, color: '#b71c1c' },
        ].map(({ label, value, color }) => (
          <Grid item xs={4} key={label}>
            <Card><CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight={700} sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtres */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={5}>
          <TextField fullWidth size="small" placeholder="Rechercher nom / identifiant..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Rôle</InputLabel>
            <Select value={filterRole} label="Rôle" onChange={e => setFilterRole(e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Entreprise</InputLabel>
            <Select value={filterCompany} label="Entreprise" onChange={e => setFilterCompany(e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {companies.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Utilisateur</strong></TableCell>
              <TableCell><strong>Rôle</strong></TableCell>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell><strong>Créé le</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Aucun utilisateur trouvé</Typography>
              </TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.id} hover sx={{ opacity: u.is_active ? 1 : 0.6 }}>
                <TableCell><Typography variant="caption" fontFamily="monospace">#{u.id}</Typography></TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{u.full_name}</Typography>
                  <Typography variant="caption" color="text.secondary">@{u.username}</Typography>
                </TableCell>
                <TableCell><Chip label={u.role} size="small" color={roleColor(u.role)} /></TableCell>
                <TableCell>
                  {u.company ? (
                    <Box>
                      <Typography variant="body2">{u.company.name}</Typography>
                      <Chip label={u.company.code} size="small" variant="outlined" sx={{ mt: 0.3 }} />
                    </Box>
                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell>
                  {u.is_active
                    ? <Chip icon={<ActiveIcon />} label="Actif" size="small" color="success" />
                    : <Chip icon={<InactiveIcon />} label="Inactif" size="small" color="error" />}
                </TableCell>
                <TableCell><Typography variant="caption">{new Date(u.created_at).toLocaleDateString('fr-FR')}</Typography></TableCell>
                <TableCell align="right">
                  <Tooltip title="Modifier"><IconButton size="small" onClick={() => openEditDialog(u)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Réinitialiser mot de passe"><IconButton size="small" color="warning" onClick={() => openResetDialog(u)}><ResetPwdIcon fontSize="small" /></IconButton></Tooltip>
                  {u.is_active && (
                    <Tooltip title="Désactiver"><IconButton size="small" color="error" onClick={() => handleDeactivate(u)}><DeactivateIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Edit */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier l'utilisateur {editUser && <Chip label={`@${editUser.username}`} size="small" sx={{ ml: 1 }} />}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Nom complet"
                value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Rôle</InputLabel>
                <Select value={editForm.role} label="Rôle" onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Entreprise</InputLabel>
                <Select value={editForm.company_id} label="Entreprise"
                  onChange={e => setEditForm({ ...editForm, company_id: e.target.value })}>
                  <MenuItem value="">Aucune</MenuItem>
                  {companies.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select value={editForm.is_active ? 'actif' : 'inactif'} label="Statut"
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'actif' })}>
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="inactif">Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Reset Password */}
      <Dialog open={openReset} onClose={() => setOpenReset(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Utilisateur : <strong>{resetUser?.username}</strong>
          </Typography>
          <TextField fullWidth size="small" label="Nouveau mot de passe" type="password"
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            helperText="Minimum 6 caractères" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReset(false)}>Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleResetPassword}
            disabled={newPassword.length < 6 || resetLoading}
            startIcon={resetLoading ? <CircularProgress size={16} /> : <ResetPwdIcon />}>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;
