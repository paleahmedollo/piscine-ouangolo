import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip, Switch, FormControlLabel, Divider, List, ListItem,
  ListItemText, ListItemIcon, Collapse, Checkbox, FormGroup
} from '@mui/material';
import {
  Edit as EditIcon,
  People as PeopleIcon, Refresh as RefreshIcon,
  CheckCircle as ActiveIcon, Cancel as InactiveIcon,
  UploadFile as UploadIcon, Download as DownloadIcon,
  CheckCircleOutline as SuccessRowIcon, ErrorOutline as ErrorRowIcon,
  WarningAmber as SkipRowIcon, ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon, Tag as IdIcon,
  Extension as ModuleIcon, Science as TestIcon,
  MoveDown as MoveIcon, DeleteForever as DeleteForeverIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { companiesApi } from '../../services/api';

/* ─── Types ─────────────────────────────────────────── */
interface Company {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  plan: string;
  is_active: boolean;
  is_test: boolean;
  created_at: string;
  users_count?: number;
  modules?: string[] | null;
  manager_name?: string;
  locality?: string;
  country?: string;
}

const ALL_MODULES = [
  { key: 'piscine',     label: 'Piscine' },
  { key: 'restaurant',  label: 'Restaurant' },
  { key: 'hotel',       label: 'Hôtel' },
  { key: 'events',      label: 'Événements' },
  { key: 'lavage',      label: 'Lavage Auto' },
  { key: 'pressing',    label: 'Pressing' },
  { key: 'maquis',      label: 'Maquis / Bar' },
  { key: 'superette',   label: 'Supérette' },
  { key: 'depot',       label: 'Dépôt' },
  { key: 'caisse',      label: 'Caisse' },
  { key: 'employees',   label: 'Employés & Paie' },
  { key: 'expenses',    label: 'Dépenses' },
  { key: 'reports',     label: 'Mes Rapports' },
  { key: 'users',       label: 'Utilisateurs' },
];
const ALL_MODULE_KEYS = ALL_MODULES.map(m => m.key);

interface BulkResult {
  created: { id: number; username: string; full_name: string; role: string }[];
  skipped: { username: string; reason: string }[];
  failed:  { username: string; reason: string }[];
  total_rows: number;
  company: { id: number; name: string };
  message: string;
}

const planLabel = (p: string) => ({ basic: 'Basique', standard: 'Standard', premium: 'Premium' }[p] || p);
const planColor = (p: string): 'default' | 'primary' | 'success' =>
  p === 'premium' ? 'success' : p === 'standard' ? 'primary' : 'default';

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

/* ─── Composant principal ────────────────────────────── */
const AdminTestCompanies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  /* Dialog Modification */
  const [openEdit, setOpenEdit]       = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editForm, setEditForm]       = useState<Partial<Company>>({});
  const [editModules, setEditModules] = useState<string[]>(ALL_MODULE_KEYS);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

  /* Dialog Bulk Upload */
  const [openBulk, setOpenBulk]           = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState<number | ''>('');
  const [bulkFile, setBulkFile]           = useState<File | null>(null);
  const [bulkLoading, setBulkLoading]     = useState(false);
  const [bulkResult, setBulkResult]       = useState<BulkResult | null>(null);
  const [bulkError, setBulkError]         = useState('');
  const [showDetails, setShowDetails]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Dialog confirmation déplacement en production */
  const [moveTarget, setMoveTarget] = useState<Company | null>(null);
  const [moving, setMoving]         = useState(false);

  /* Dialog Réinitialiser modules (toutes entreprises) */
  const [openReset, setOpenReset]               = useState(false);
  const [allCompanies, setAllCompanies]         = useState<Company[]>([]);
  const [resetSelected, setResetSelected]       = useState<number[]>([]);
  const [resetPwd, setResetPwd]                 = useState('');
  const [resetPwdError, setResetPwdError]       = useState('');
  const [resetLoading, setResetLoading]         = useState(false);
  const [resetLoadingAll, setResetLoadingAll]   = useState(false);

  /* Dialog Suppression définitive entreprise */
  const [openPermDelete, setOpenPermDelete]     = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState<Company | null>(null);
  const [permDeletePwd, setPermDeletePwd]       = useState('');
  const [permDeleteError, setPermDeleteError]   = useState('');
  const [permDeleteLoading, setPermDeleteLoading] = useState(false);

  /* ── Chargement — uniquement les comptes test ── */
  const loadCompanies = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await companiesApi.getCompanies({ is_test: 'true' });
      const list: Company[] = res.data.data || [];
      const enriched = await Promise.all(list.map(async (c) => {
        try {
          const s = await companiesApi.getCompanyStats(c.id);
          return { ...c, users_count: s.data.data?.users_count ?? 0 };
        } catch { return { ...c, users_count: 0 }; }
      }));
      setCompanies(enriched);
    } catch { setError('Erreur lors du chargement des comptes test'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  /* ── Modification ── */
  const handleEdit = async () => {
    if (!editCompany) return;
    setSaving(true);
    try {
      await companiesApi.updateCompany(editCompany.id, {
        ...editForm,
        founder_name: editForm.manager_name,
        city: editForm.locality,
        modules: editModules
      });
      setSuccess('Compte test mis à jour'); setOpenEdit(false); setEditCompany(null); loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      await companiesApi.updateCompany(company.id, { is_active: !company.is_active });
      setSuccess(`Compte ${company.is_active ? 'désactivé' : 'activé'}`); loadCompanies();
    } catch { setError('Erreur lors de la modification'); }
  };

  const openEditDialog = (company: Company) => {
    setEditCompany(company);
    setEditForm({
      name: company.name,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      plan: company.plan,
      manager_name: company.manager_name || '',
      locality: company.locality || '',
      country: company.country || "Côte d'Ivoire"
    });
    setEditModules(
      company.modules === null || company.modules === undefined
        ? ALL_MODULE_KEYS
        : company.modules
    );
    setFormError(''); setOpenEdit(true);
  };

  /* ── Réinitialiser modules ── */
  const openResetDialog = async () => {
    setResetPwd(''); setResetPwdError(''); setResetSelected([]);
    setResetLoadingAll(true);
    try {
      const res = await companiesApi.getCompanies();
      setAllCompanies(res.data.data || []);
    } catch { setError('Impossible de charger toutes les entreprises'); return; }
    finally { setResetLoadingAll(false); }
    setOpenReset(true);
  };

  const handleResetModules = async () => {
    if (resetPwd !== 'Bonjour@2026#') { setResetPwdError('Mot de passe incorrect'); return; }
    if (resetSelected.length === 0) { setResetPwdError('Sélectionnez au moins une entreprise'); return; }
    setResetLoading(true);
    try {
      await Promise.all(resetSelected.map(id => companiesApi.updateCompany(id, { modules: null })));
      setSuccess(`Modules réinitialisés pour ${resetSelected.length} entreprise(s)`);
      setOpenReset(false);
      loadCompanies();
    } catch { setError('Erreur lors de la réinitialisation'); }
    finally { setResetLoading(false); }
  };

  const toggleResetSelect = (id: number) =>
    setResetSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* ── Suppression définitive entreprise ── */
  const openPermDeleteDialog = (company: Company) => {
    setPermDeleteTarget(company); setPermDeletePwd(''); setPermDeleteError(''); setOpenPermDelete(true);
  };

  const handlePermDelete = async () => {
    if (permDeletePwd !== 'Bonjour@2026#') { setPermDeleteError('Mot de passe incorrect'); return; }
    if (!permDeleteTarget) return;
    setPermDeleteLoading(true);
    try {
      await companiesApi.permanentDeleteCompany(permDeleteTarget.id);
      setSuccess(`"${permDeleteTarget.name}" supprimée définitivement`);
      setOpenPermDelete(false); setPermDeleteTarget(null);
      loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPermDeleteError(e.response?.data?.message || 'Erreur lors de la suppression');
    } finally { setPermDeleteLoading(false); }
  };

  /* ── Déplacer en production ── */
  const handleMoveToProduction = async () => {
    if (!moveTarget) return;
    setMoving(true);
    try {
      await companiesApi.updateCompany(moveTarget.id, { is_test: false });
      setSuccess(`"${moveTarget.name}" déplacée en Production.`);
      setMoveTarget(null);
      loadCompanies();
    } catch { setError('Erreur lors du déplacement'); }
    finally { setMoving(false); }
  };

  /* ── Bulk Upload ── */
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
      loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setBulkError(e.response?.data?.message || 'Erreur lors de l\'import');
    } finally { setBulkLoading(false); }
  };

  /* ─── Render ─────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>

      {/* ── En-tête ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TestIcon sx={{ fontSize: 32, color: 'warning.main' }} />
          <div>
            <Typography variant="h5" fontWeight="bold">Comptes Test / Démonstration</Typography>
            <Typography variant="body2" color="text.secondary">
              Entreprises de démonstration — distinctes des comptes production
            </Typography>
          </div>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={loadCompanies} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined" color="warning" startIcon={<ResetIcon />} onClick={openResetDialog}>
            Réinitialiser modules
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => openBulkDialog()}>
            Import utilisateurs
          </Button>
        </Box>
      </Box>

      {/* Bandeau info */}
      <Alert severity="warning" sx={{ mb: 2 }} icon={<TestIcon />}>
        Ces comptes sont utilisés pour des démonstrations. Pour créer un nouveau compte test, allez dans
        <strong> Entreprises → Créer → répondre "Oui" à la question compte test</strong>.
        Vous pouvez déplacer un compte en production via le bouton <MoveIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} />.
      </Alert>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── Résumé ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Comptes test total',  value: companies.length,                                            color: 'warning.main' },
          { label: 'Comptes actifs',      value: companies.filter(c => c.is_active).length,                 color: 'success.main' },
          { label: 'Utilisateurs total',  value: companies.reduce((s, c) => s + (c.users_count ?? 0), 0),  color: 'info.main'    },
        ].map(({ label, value, color }) => (
          <Grid item xs={12} sm={4} key={label}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" sx={{ color }} fontWeight="bold">{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Tableau ── */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#fff8e1' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Plan</strong></TableCell>
              <TableCell><strong>Modules</strong></TableCell>
              <TableCell><strong>Utilisateurs</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell><strong>Créé le</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Aucun compte test</Typography>
              </TableCell></TableRow>
            ) : companies.map((company) => (
              <TableRow key={company.id} hover sx={{ bgcolor: 'rgba(255,243,224,0.3)' }}>
                <TableCell>
                  <Chip icon={<IdIcon />} label={`#${company.id}`} size="small" variant="outlined"
                    color="warning" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TestIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography variant="body2" fontWeight="bold">{company.name}</Typography>
                  </Box>
                  {company.manager_name && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>👤 {company.manager_name}</Typography>}
                  {(company.locality || company.country) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      📍 {[company.locality, company.country].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {company.phone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📞 {company.phone}</Typography>}
                </TableCell>
                <TableCell><Chip label={company.code} size="small" variant="outlined" color="warning" /></TableCell>
                <TableCell><Chip label={planLabel(company.plan)} size="small" color={planColor(company.plan)} /></TableCell>
                <TableCell>
                  {(() => {
                    const mods = company.modules === null || company.modules === undefined
                      ? ALL_MODULE_KEYS
                      : company.modules;
                    const count = mods.length;
                    const total = ALL_MODULES.length;
                    const isAll = count === total;
                    return (
                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
                              Modules actifs :
                            </Typography>
                            {ALL_MODULES.map(m => (
                              <Box key={m.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" sx={{ color: mods.includes(m.key) ? '#a5d6a7' : '#ef9a9a' }}>
                                  {mods.includes(m.key) ? '✓' : '✗'} {m.label}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        }
                        arrow placement="right"
                      >
                        <Chip
                          icon={<ModuleIcon sx={{ fontSize: '14px !important' }} />}
                          label={`${count}/${total}`}
                          size="small"
                          color={isAll ? 'success' : count >= total / 2 ? 'warning' : 'error'}
                          variant={isAll ? 'filled' : 'outlined'}
                          onClick={() => openEditDialog(company)}
                          sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                        />
                      </Tooltip>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2">{company.users_count ?? 0}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {company.is_active
                    ? <Chip icon={<ActiveIcon />}   label="Active"   size="small" color="success" />
                    : <Chip icon={<InactiveIcon />} label="Inactive" size="small" color="error"   />}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{new Date(company.created_at).toLocaleDateString('fr-FR')}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Importer des utilisateurs">
                    <IconButton size="small" color="primary" onClick={() => openBulkDialog(company.id)}>
                      <UploadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Déplacer en Production">
                    <IconButton size="small" color="success" onClick={() => setMoveTarget(company)}>
                      <MoveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => openEditDialog(company)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={company.is_active ? 'Désactiver' : 'Activer'}>
                    <IconButton size="small" color={company.is_active ? 'error' : 'success'}
                      onClick={() => handleToggleActive(company)}>
                      {company.is_active ? <InactiveIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer définitivement">
                    <IconButton size="small" sx={{ color: '#7b1fa2' }} onClick={() => openPermDeleteDialog(company)}>
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ══════════════════════════════════════════════
          Dialog — Modification entreprise
      ══════════════════════════════════════════════ */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#fff8e1' }}>
          Modifier le compte test
          {editCompany && <Chip label={`ID #${editCompany.id}`} size="small" color="warning" sx={{ ml: 1, fontFamily: 'monospace' }} />}
        </DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom de l'entreprise" size="small"
                value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Fondateur / Directeur général" size="small"
                value={editForm.manager_name || ''}
                onChange={(e) => setEditForm({ ...editForm, manager_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Ville" size="small"
                value={editForm.locality || ''} onChange={(e) => setEditForm({ ...editForm, locality: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Pays" size="small"
                value={editForm.country || ''} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Adresse complète" size="small"
                value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Téléphone" size="small"
                value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Email" type="email" size="small"
                value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select value={editForm.plan || 'standard'} label="Plan"
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}>
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Modules activés ({editModules.length}/{ALL_MODULES.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => setEditModules(ALL_MODULE_KEYS)}>Tout</Button>
                  <Button size="small" onClick={() => setEditModules([])}>Aucun</Button>
                </Box>
              </Box>
              <FormGroup row>
                {ALL_MODULES.map(m => (
                  <FormControlLabel
                    key={m.key}
                    control={
                      <Checkbox
                        size="small"
                        checked={editModules.includes(m.key)}
                        onChange={() => setEditModules(prev =>
                          prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
                        )}
                      />
                    }
                    label={<Typography variant="body2">{m.label}</Typography>}
                    sx={{ width: '50%', m: 0 }}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={editForm.is_active !== false}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />}
                label="Compte actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleEdit} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Confirmer déplacement en Production
      ══════════════════════════════════════════════ */}
      <Dialog open={Boolean(moveTarget)} onClose={() => !moving && setMoveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoveIcon color="success" /> Déplacer en Production
        </DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous déplacer <strong>{moveTarget?.name}</strong> de l'onglet
            Comptes Test vers <strong>Entreprises (production)</strong> ?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Les utilisateurs et données de ce compte restent inchangés.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveTarget(null)} disabled={moving}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleMoveToProduction}
            disabled={moving} startIcon={moving ? <CircularProgress size={16} /> : <MoveIcon />}>
            Oui, déplacer en production
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Réinitialiser les modules
      ══════════════════════════════════════════════ */}
      <Dialog open={openReset} onClose={() => !resetLoading && setOpenReset(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff3e0' }}>
          <ResetIcon color="warning" /> Réinitialiser les modules par entreprise
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            Sélectionnez les entreprises dont vous souhaitez réinitialiser les modules (tous les modules seront réactivés).
          </Alert>
          {resetPwdError && <Alert severity="error" sx={{ mb: 2 }}>{resetPwdError}</Alert>}

          {resetLoadingAll ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ maxHeight: 280, overflow: 'auto', border: '1px solid #eee', borderRadius: 1, mb: 2 }}>
              {allCompanies.map(c => (
                <Box key={c.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                  borderBottom: '1px solid #f5f5f5',
                  bgcolor: resetSelected.includes(c.id) ? 'rgba(255,152,0,0.08)' : 'transparent',
                  cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,152,0,0.05)' }
                }} onClick={() => toggleResetSelect(c.id)}>
                  <Checkbox size="small" checked={resetSelected.includes(c.id)} color="warning" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.code} — {c.is_test ? 'Compte Test' : 'Production'} — {c.modules === null || c.modules === undefined ? 'Tous modules' : `${c.modules.length} module(s)`}
                    </Typography>
                  </Box>
                  {c.is_test && <Chip label="Test" size="small" color="warning" variant="outlined" />}
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button size="small" onClick={() => setResetSelected(allCompanies.map(c => c.id))}>Tout sélectionner</Button>
            <Button size="small" onClick={() => setResetSelected([])}>Tout désélectionner</Button>
          </Box>

          <TextField
            fullWidth size="small" label="Mot de passe de confirmation" type="password"
            value={resetPwd}
            onChange={e => { setResetPwd(e.target.value); setResetPwdError(''); }}
            placeholder="Entrez le mot de passe pour confirmer"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReset(false)} disabled={resetLoading}>Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleResetModules}
            disabled={resetSelected.length === 0 || !resetPwd || resetLoading}
            startIcon={resetLoading ? <CircularProgress size={16} /> : <ResetIcon />}>
            Réinitialiser ({resetSelected.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Suppression définitive entreprise
      ══════════════════════════════════════════════ */}
      <Dialog open={openPermDelete} onClose={() => !permDeleteLoading && setOpenPermDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f3e5f5' }}>
          <DeleteForeverIcon sx={{ color: '#7b1fa2' }} /> Suppression définitive
        </DialogTitle>
        <DialogContent>
          {permDeleteError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{permDeleteError}</Alert>}
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            <strong>Action irréversible !</strong> L'entreprise <strong>"{permDeleteTarget?.name}"</strong> et tous ses utilisateurs seront définitivement supprimés.
          </Alert>
          <TextField
            fullWidth size="small" label="Mot de passe de confirmation" type="password"
            value={permDeletePwd}
            onChange={e => { setPermDeletePwd(e.target.value); setPermDeleteError(''); }}
            placeholder="Entrez le mot de passe pour confirmer"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPermDelete(false)} disabled={permDeleteLoading}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}
            onClick={handlePermDelete} disabled={!permDeletePwd || permDeleteLoading}
            startIcon={permDeleteLoading ? <CircularProgress size={16} /> : <DeleteForeverIcon />}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Import utilisateurs
      ══════════════════════════════════════════════ */}
      <Dialog open={openBulk} onClose={() => setOpenBulk(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon color="primary" />
          Import en masse d'utilisateurs (Compte test)
        </DialogTitle>
        <DialogContent>
          {bulkError && <Alert severity="error" sx={{ mb: 2 }}>{bulkError}</Alert>}

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            1. Sélectionner le compte test cible
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel>Compte test *</InputLabel>
            <Select value={bulkCompanyId} label="Compte test *"
              onChange={(e) => setBulkCompanyId(e.target.value as number)}>
              {companies.filter(c => c.is_active).map(c => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip label={`#${c.id}`} size="small" color="warning"
                      sx={{ fontFamily: 'monospace', fontWeight: 'bold', minWidth: 50 }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <Chip label={c.code} size="small" variant="outlined" />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
          </Alert>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={downloadTemplate} sx={{ mb: 3 }}>
            Télécharger le modèle .xls
          </Button>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            3. Charger le fichier complété
          </Typography>
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
              borderColor: bulkFile ? 'success.main' : 'warning.light',
              background: bulkFile ? 'rgba(76,175,80,0.04)' : 'rgba(255,152,0,0.02)',
              '&:hover': { borderColor: 'warning.main', background: 'rgba(255,152,0,0.05)' }
            }}
          >
            <UploadIcon sx={{ fontSize: 40, color: bulkFile ? 'success.main' : 'warning.light', mb: 1 }} />
            {bulkFile ? (
              <>
                <Typography variant="body1" fontWeight="bold" color="success.main">✅ {bulkFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(bulkFile.size / 1024).toFixed(1)} Ko — Cliquer pour changer
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Cliquer pour sélectionner un fichier Excel ou CSV
              </Typography>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setBulkFile(f); setBulkResult(null); setBulkError(''); }
              }} />
          </Box>

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
                        <Typography variant="h4" sx={{ color }} fontWeight="bold">{value}</Typography>
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
          <Button variant="contained" color="warning" onClick={handleBulkUpload}
            disabled={!bulkCompanyId || !bulkFile || bulkLoading}
            startIcon={bulkLoading ? <CircularProgress size={16} /> : <UploadIcon />}>
            Lancer l'import
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdminTestCompanies;
