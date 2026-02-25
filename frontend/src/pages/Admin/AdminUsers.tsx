import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip, InputAdornment, Divider, List, ListItem,
  ListItemText, ListItemIcon, Collapse
} from '@mui/material';
import {
  People as PeopleIcon, Edit as EditIcon, Search as SearchIcon,
  Refresh as RefreshIcon, LockReset as ResetPwdIcon,
  CheckCircle as ActiveIcon, Cancel as InactiveIcon,
  PersonOff as DeactivateIcon, Add as AddIcon,
  UploadFile as UploadIcon, Download as DownloadIcon,
  CheckCircleOutline as SuccessRowIcon, ErrorOutline as ErrorRowIcon,
  WarningAmber as SkipRowIcon, ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon, PersonAdd as PersonAddIcon
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

interface BulkResult {
  created: { id: number; username: string; full_name: string; role: string }[];
  skipped: { username: string; reason: string }[];
  failed:  { username: string; reason: string }[];
  total_rows: number;
  company: { id: number; name: string };
  message: string;
}

const ROLES = ['admin', 'gerant', 'directeur', 'responsable', 'maire', 'maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events'];
const roleColor = (r: string): 'default' | 'primary' | 'success' | 'warning' | 'error' =>
  r === 'admin' ? 'error' : r === 'gerant' ? 'primary' : r === 'directeur' ? 'success' : 'default';

/* ─── Télécharger le modèle Excel pour import en masse ─── */
const downloadTemplate = () => {
  const header = 'full_name\tusername\tpassword\trole\n';
  const rows = [
    'Jean Dupont\tjean.dupont\tPass@1234\tgerant',
    'Marie Koné\tmarie.kone\tPass@1234\treceptionniste',
    'Ahmed Traoré\tahmed.traore\tPass@1234\tmaitre_nageur',
  ].join('\n');
  const blob = new Blob([header + rows], { type: 'text/tab-separated-values' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'modele_import_utilisateurs.xls'; a.click();
  URL.revokeObjectURL(url);
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  // ── Dialog Créer utilisateur ──────────────────────────
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '', username: '', password: '', role: 'gerant', company_id: ''
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Dialog Modifier utilisateur ───────────────────────
  const [openEdit, setOpenEdit] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<{ full_name: string; role: string; company_id: string; is_active: boolean }>
    ({ full_name: '', role: '', company_id: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Dialog Reset mot de passe ─────────────────────────
  const [openReset, setOpenReset] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ── Dialog Import en masse ────────────────────────────
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState<number | ''>('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Chargement des données ────────────────────────────
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

  // ── Créer un utilisateur ──────────────────────────────
  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.full_name || !createForm.username || !createForm.password || !createForm.role) {
      setCreateError('Tous les champs obligatoires (*) doivent être remplis'); return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Le mot de passe doit contenir au moins 6 caractères'); return;
    }
    setCreateLoading(true);
    try {
      await superadminApi.createUser({
        full_name: createForm.full_name,
        username: createForm.username,
        password: createForm.password,
        role: createForm.role,
        company_id: createForm.company_id ? parseInt(createForm.company_id) : null
      });
      setSuccess(`✅ Utilisateur "${createForm.username}" créé avec succès`);
      setOpenCreate(false);
      setCreateForm({ full_name: '', username: '', password: '', role: 'gerant', company_id: '' });
      loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setCreateError(e.response?.data?.message || 'Erreur lors de la création');
    } finally { setCreateLoading(false); }
  };

  // ── Modifier un utilisateur ───────────────────────────
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

  // ── Reset mot de passe ────────────────────────────────
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

  // ── Désactiver un utilisateur ─────────────────────────
  const handleDeactivate = async (u: User) => {
    if (!window.confirm(`Désactiver l'utilisateur "${u.username}" ?`)) return;
    try {
      await superadminApi.deleteUser(u.id);
      setSuccess(`Utilisateur "${u.username}" désactivé`); loadData();
    } catch { setError('Erreur lors de la désactivation'); }
  };

  // ── Import en masse ───────────────────────────────────
  const openBulkDialog = (companyId?: number) => {
    setBulkCompanyId(companyId ?? '');
    setBulkFile(null); setBulkResult(null); setBulkError(''); setShowDetails(false); setOpenBulk(true);
  };

  const handleBulkUpload = async () => {
    if (!bulkCompanyId || !bulkFile) { setBulkError('Sélectionnez une entreprise et un fichier'); return; }
    setBulkLoading(true); setBulkError(''); setBulkResult(null);
    try {
      const res = await companiesApi.bulkCreateUsers(Number(bulkCompanyId), bulkFile);
      setBulkResult(res.data.data);
      setSuccess(res.data.message);
      loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setBulkError(e.response?.data?.message || "Erreur lors de l'import");
    } finally { setBulkLoading(false); }
  };

  // ── Rendu ─────────────────────────────────────────────
  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon sx={{ fontSize: 28, color: '#1a237e' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Gestion des utilisateurs</Typography>
            <Typography variant="body2" color="text.secondary">Tous les comptes de toutes les entreprises</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined" size="small" startIcon={<UploadIcon />} onClick={() => openBulkDialog()}>
            Import en masse
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => { setCreateForm({ full_name: '', username: '', password: '', role: 'gerant', company_id: '' }); setCreateError(''); setOpenCreate(true); }}>
            Nouvel utilisateur
          </Button>
        </Box>
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
              <Typography variant="h5" fontWeight={700} sx={{ color }}>{value}</Typography>
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

      {/* Tableau */}
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
                  <Tooltip title="Import utilisateurs pour cette entreprise">
                    <span>
                      <IconButton size="small" color="primary"
                        onClick={() => u.company_id ? openBulkDialog(u.company_id) : openBulkDialog()}
                        disabled={!u.company_id}>
                        <UploadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
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

      {/* ══════════════════════════════════════════════
          Dialog — Créer un utilisateur
      ══════════════════════════════════════════════ */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon color="primary" />
          Créer un nouvel utilisateur
        </DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
            Informations personnelles
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Nom complet *"
                value={createForm.full_name}
                onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Ex: Jean Dupont" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Identifiant (username) *"
                value={createForm.username}
                onChange={e => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="Ex: jean.dupont"
                helperText="Sans espace, en minuscules" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Mot de passe *" type="password"
                value={createForm.password}
                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                helperText="Minimum 6 caractères" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Rôle et affectation
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Rôle *</InputLabel>
                <Select value={createForm.role} label="Rôle *"
                  onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Entreprise</InputLabel>
                <Select value={createForm.company_id} label="Entreprise"
                  onChange={e => setCreateForm({ ...createForm, company_id: e.target.value })}>
                  <MenuItem value="">Aucune (superadmin)</MenuItem>
                  {companies.map(c => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={c.code} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        {c.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createLoading}
            startIcon={createLoading ? <CircularProgress size={16} /> : <AddIcon />}>
            Créer l'utilisateur
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Import en masse d'utilisateurs
      ══════════════════════════════════════════════ */}
      <Dialog open={openBulk} onClose={() => setOpenBulk(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon color="primary" />
          Import en masse d'utilisateurs
        </DialogTitle>
        <DialogContent>
          {bulkError && <Alert severity="error" sx={{ mb: 2 }}>{bulkError}</Alert>}

          {/* Étape 1 — Entreprise */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            1. Sélectionner l'entreprise cible
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel>Entreprise *</InputLabel>
            <Select value={bulkCompanyId} label="Entreprise *"
              onChange={e => setBulkCompanyId(e.target.value as number)}>
              {companies.filter(c => c.code).map(c => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip label={`#${c.id}`} size="small" sx={{ fontFamily: 'monospace', fontWeight: 'bold', minWidth: 50 }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <Chip label={c.code} size="small" variant="outlined" />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Étape 2 — Modèle */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            2. Télécharger le modèle et le remplir
          </Typography>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>Colonnes requises :</Typography>
            <Typography component="code" sx={{
              fontFamily: 'monospace', display: 'block', background: '#f0f4ff',
              p: '6px 10px', borderRadius: 1, fontSize: '0.82rem'
            }}>
              full_name &nbsp;|&nbsp; username &nbsp;|&nbsp; password &nbsp;|&nbsp; role
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Rôles valides : admin · gerant · directeur · responsable · maire ·
              maitre_nageur · serveuse · serveur · receptionniste · gestionnaire_events
            </Typography>
          </Alert>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={downloadTemplate} sx={{ mb: 3 }}>
            Télécharger le modèle .xls
          </Button>

          {/* Étape 3 — Fichier */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            3. Charger le fichier complété
          </Typography>
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
              borderColor: bulkFile ? 'success.main' : 'primary.light',
              background: bulkFile ? 'rgba(76,175,80,0.04)' : 'rgba(25,118,210,0.02)',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', background: 'rgba(25,118,210,0.05)' }
            }}
          >
            <UploadIcon sx={{ fontSize: 40, color: bulkFile ? 'success.main' : 'primary.light', mb: 1 }} />
            {bulkFile ? (
              <>
                <Typography variant="body1" fontWeight="bold" color="success.main">✅ {bulkFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(bulkFile.size / 1024).toFixed(1)} Ko — Cliquer pour changer
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" color="text.secondary">
                  Cliquer pour sélectionner un fichier Excel ou CSV
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Formats acceptés : .xlsx, .xls, .csv — Max 5 Mo
                </Typography>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setBulkFile(f); setBulkResult(null); setBulkError(''); }
              }} />
          </Box>

          {/* Résultats import */}
          {bulkResult && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Résultats de l'import</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  { label: 'Créés',   value: bulkResult.created.length, bg: '#e8f5e9', border: '#a5d6a7', color: 'success.main' },
                  { label: 'Ignorés', value: bulkResult.skipped.length, bg: '#fff8e1', border: '#ffe082', color: 'warning.main' },
                  { label: 'Erreurs', value: bulkResult.failed.length,  bg: '#ffebee', border: '#ef9a9a', color: 'error.main'   },
                ].map(({ label, value, bg, border, color }) => (
                  <Grid item xs={4} key={label}>
                    <Card sx={{ background: bg, border: `1px solid ${border}` }}>
                      <CardContent sx={{ py: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="h5" sx={{ color }} fontWeight="bold">{value}</Typography>
                        <Typography variant="caption">{label}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Button size="small" onClick={() => setShowDetails(!showDetails)}
                endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ mb: 1 }}>
                {showDetails ? 'Masquer' : 'Voir'} le détail ({bulkResult.total_rows} lignes)
              </Button>
              <Collapse in={showDetails}>
                <Paper variant="outlined" sx={{ maxHeight: 280, overflow: 'auto' }}>
                  <List dense>
                    {bulkResult.created.map((u, i) => (
                      <ListItem key={`c-${i}`}>
                        <ListItemIcon sx={{ minWidth: 32 }}><SuccessRowIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary={`${u.full_name} (${u.username})`} secondary={`${u.role} — ID #${u.id}`} />
                      </ListItem>
                    ))}
                    {bulkResult.skipped.map((u, i) => (
                      <ListItem key={`s-${i}`}>
                        <ListItemIcon sx={{ minWidth: 32 }}><SkipRowIcon color="warning" fontSize="small" /></ListItemIcon>
                        <ListItemText primary={u.username} secondary={`Ignoré : ${u.reason}`} />
                      </ListItem>
                    ))}
                    {bulkResult.failed.map((u, i) => (
                      <ListItem key={`f-${i}`}>
                        <ListItemIcon sx={{ minWidth: 32 }}><ErrorRowIcon color="error" fontSize="small" /></ListItemIcon>
                        <ListItemText primary={u.username || '?'} secondary={`Erreur : ${u.reason}`} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Collapse>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulk(false)}>Fermer</Button>
          <Button variant="contained" onClick={handleBulkUpload}
            disabled={!bulkCompanyId || !bulkFile || bulkLoading}
            startIcon={bulkLoading ? <CircularProgress size={16} /> : <UploadIcon />}>
            Lancer l'import
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Modifier un utilisateur
      ══════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════
          Dialog — Réinitialiser le mot de passe
      ══════════════════════════════════════════════ */}
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
