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
  Add as AddIcon, Edit as EditIcon, Business as BusinessIcon,
  People as PeopleIcon, Refresh as RefreshIcon,
  CheckCircle as ActiveIcon, Cancel as InactiveIcon,
  UploadFile as UploadIcon, Download as DownloadIcon,
  CheckCircleOutline as SuccessRowIcon, ErrorOutline as ErrorRowIcon,
  WarningAmber as SkipRowIcon, ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon, Tag as IdIcon,
  Extension as ModuleIcon, Visibility as ViewIcon,
  RestartAlt as ResetDataIcon, DeleteForever as DeleteForeverIcon,
  LockReset as ResetModulesIcon
} from '@mui/icons-material';
import { companiesApi } from '../services/api';

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
  created_at: string;
  users_count?: number;
  modules?: string[] | null;
  manager_name?: string;   // fondateur
  locality?: string;       // ville
  country?: string;        // pays
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

interface CreateCompanyForm {
  name: string; code: string; address: string; phone: string; email: string;
  plan: string; admin_username: string; admin_password: string; admin_full_name: string;
  founder_name: string; city: string; country: string;
}

const defaultForm: CreateCompanyForm = {
  name: '', code: '', address: '', phone: '', email: '',
  plan: 'standard', admin_username: '', admin_password: '', admin_full_name: '',
  founder_name: '', city: '', country: "Côte d'Ivoire"
};

const planLabel = (p: string) => ({ basic: 'Basique', standard: 'Standard', premium: 'Premium' }[p] || p);
const planColor = (p: string): 'default' | 'primary' | 'success' =>
  p === 'premium' ? 'success' : p === 'standard' ? 'primary' : 'default';

/* ─── Télécharger le modèle Excel ────────────────────── */
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
const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  /* Dialog Création */
  const [openAdd, setOpenAdd]           = useState(false);
  const [formData, setFormData]         = useState<CreateCompanyForm>(defaultForm);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');
  const [newCompanyId, setNewCompanyId] = useState<number | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [askIsTest, setAskIsTest] = useState(false); // afficher la question "compte test ?"
  const [markingTest, setMarkingTest] = useState(false);
  const [createModules, setCreateModules] = useState<string[]>([]); // aucun coché par défaut — le superadmin choisit

  /* Dialog Modification */
  const [openEdit, setOpenEdit]         = useState(false);
  const [editCompany, setEditCompany]   = useState<Company | null>(null);
  const [editForm, setEditForm]         = useState<Partial<Company>>({});
  const [editModules, setEditModules]   = useState<string[]>(ALL_MODULE_KEYS);

  /* Dialog Détails */
  const [openDetails, setOpenDetails]       = useState(false);
  const [detailsCompany, setDetailsCompany] = useState<Company | null>(null);

  /* Dialog Réinitialiser modules */
  const [openResetMod, setOpenResetMod]       = useState(false);
  const [resetModCompany, setResetModCompany] = useState<Company | null>(null);
  const [resetModPwd, setResetModPwd]         = useState('');
  const [resetModError, setResetModError]     = useState('');
  const [resetModLoading, setResetModLoading] = useState(false);

  /* Dialog Réinitialiser données */
  const [openResetData, setOpenResetData]       = useState(false);
  const [resetDataCompany, setResetDataCompany] = useState<Company | null>(null);
  const [resetDataPwd, setResetDataPwd]         = useState('');
  const [resetDataError, setResetDataError]     = useState('');
  const [resetDataLoading, setResetDataLoading] = useState(false);

  /* Dialog Suppression définitive */
  const [openPermDel, setOpenPermDel]       = useState(false);
  const [permDelCompany, setPermDelCompany] = useState<Company | null>(null);
  const [permDelPwd, setPermDelPwd]         = useState('');
  const [permDelError, setPermDelError]     = useState('');
  const [permDelLoading, setPermDelLoading] = useState(false);

  /* Dialog Bulk Upload */
  const [openBulk, setOpenBulk]             = useState(false);
  const [bulkCompanyId, setBulkCompanyId]   = useState<number | ''>('');
  const [bulkFile, setBulkFile]             = useState<File | null>(null);
  const [bulkLoading, setBulkLoading]       = useState(false);
  const [bulkResult, setBulkResult]         = useState<BulkResult | null>(null);
  const [bulkError, setBulkError]           = useState('');
  const [showDetails, setShowDetails]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Chargement — uniquement les entreprises production (is_test=false) ── */
  const loadCompanies = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await companiesApi.getCompanies({ is_test: 'false' });
      const list: Company[] = res.data.data || [];
      const enriched = await Promise.all(list.map(async (c) => {
        try {
          const s = await companiesApi.getCompanyStats(c.id);
          return { ...c, users_count: s.data.data?.users_count ?? 0 };
        } catch { return { ...c, users_count: 0 }; }
      }));
      setCompanies(enriched);
    } catch { setError('Erreur lors du chargement des entreprises'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  /* ── Création entreprise ── */
  const handleCreate = async () => {
    setFormError('');
    if (!formData.name || !formData.code || !formData.admin_username || !formData.admin_password || !formData.admin_full_name) {
      setFormError('Tous les champs obligatoires (*) doivent être remplis'); return;
    }
    setSaving(true);
    try {
      const res     = await companiesApi.createCompany({ ...formData, modules: createModules });
      const created = res.data.data?.company;
      setNewCompanyId(created?.id ?? null);
      setNewCompanyName(formData.name);
      setAskIsTest(true); // afficher la question "compte test ?"
      setFormData(defaultForm);
      loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const closeAddDialog = () => {
    setOpenAdd(false); setFormData(defaultForm); setFormError(''); setNewCompanyId(null);
    setNewCompanyName(''); setAskIsTest(false); setMarkingTest(false);
    setCreateModules([]);
  };

  const handleMarkAsTest = async (isTest: boolean) => {
    if (!newCompanyId) return;
    setMarkingTest(true);
    try {
      await companiesApi.updateCompany(newCompanyId, { is_test: isTest });
      if (isTest) {
        setSuccess(`✅ "${newCompanyName}" créée et placée dans les Comptes Test.`);
      } else {
        setSuccess(`✅ Entreprise "${newCompanyName}" créée — ID : #${newCompanyId}`);
      }
      loadCompanies();
    } catch {
      setFormError('Erreur lors du marquage du compte');
    } finally {
      setMarkingTest(false);
      setAskIsTest(false);
    }
  };

  const toggleCreateModule = (key: string) => {
    setCreateModules(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleEditModule = (key: string) => {
    setEditModules(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  /* ── Modification entreprise ── */
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
      setSuccess('Entreprise mise à jour'); setOpenEdit(false); setEditCompany(null); loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      await companiesApi.updateCompany(company.id, { is_active: !company.is_active });
      setSuccess(`Entreprise ${company.is_active ? 'désactivée' : 'activée'}`); loadCompanies();
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
    // Si modules null → tous activés (rétrocompat), si tableau → charger
    setEditModules(
      company.modules === null || company.modules === undefined
        ? ALL_MODULE_KEYS
        : company.modules
    );
    setFormError(''); setOpenEdit(true);
  };

  /* ── Réinitialiser modules ── */
  const handleResetModules = async () => {
    if (resetModPwd !== 'Bonjour@2026#') { setResetModError('Mot de passe incorrect'); return; }
    if (!resetModCompany) return;
    setResetModLoading(true); setResetModError('');
    try {
      await companiesApi.updateCompany(resetModCompany.id, { modules: ALL_MODULE_KEYS });
      setSuccess(`Modules de "${resetModCompany.name}" réinitialisés (tous actifs)`);
      setOpenResetMod(false); setResetModCompany(null); setResetModPwd('');
      loadCompanies();
    } catch { setResetModError('Erreur lors de la réinitialisation'); }
    finally { setResetModLoading(false); }
  };

  /* ── Réinitialiser données ── */
  const handleResetData = async () => {
    if (resetDataPwd !== 'Bonjour@2026#') { setResetDataError('Mot de passe incorrect'); return; }
    if (!resetDataCompany) return;
    setResetDataLoading(true); setResetDataError('');
    try {
      await companiesApi.resetCompanyData(resetDataCompany.id);
      setSuccess(`Données de "${resetDataCompany.name}" réinitialisées — compteur à zéro`);
      setOpenResetData(false); setResetDataCompany(null); setResetDataPwd('');
      loadCompanies();
    } catch { setResetDataError('Erreur lors de la réinitialisation des données'); }
    finally { setResetDataLoading(false); }
  };

  /* ── Suppression définitive ── */
  const handlePermDelete = async () => {
    if (permDelPwd !== 'Bonjour@2026#') { setPermDelError('Mot de passe incorrect'); return; }
    if (!permDelCompany) return;
    setPermDelLoading(true); setPermDelError('');
    try {
      await companiesApi.permanentDeleteCompany(permDelCompany.id);
      setSuccess(`Entreprise "${permDelCompany.name}" supprimée définitivement`);
      setOpenPermDel(false); setPermDelCompany(null); setPermDelPwd('');
      loadCompanies();
    } catch { setPermDelError('Erreur lors de la suppression'); }
    finally { setPermDelLoading(false); }
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
          <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <div>
            <Typography variant="h5" fontWeight="bold">Gestion des Entreprises</Typography>
            <Typography variant="body2" color="text.secondary">Super administrateur — accès multi-entreprises</Typography>
          </div>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={loadCompanies} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => openBulkDialog()}>
            Import utilisateurs
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setFormData(defaultForm); setFormError(''); setNewCompanyId(null); setOpenAdd(true); }}>
            Nouvelle entreprise
          </Button>
        </Box>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── Résumé ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Entreprises total',   value: companies.length,                                           color: 'primary.main' },
          { label: 'Entreprises actives', value: companies.filter(c => c.is_active).length,                color: 'success.main' },
          { label: 'Utilisateurs total',  value: companies.reduce((s, c) => s + (c.users_count ?? 0), 0), color: 'info.main'    },
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
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Plan</strong></TableCell>
              <TableCell><strong>Modules</strong></TableCell>
              <TableCell><strong>Utilisateurs</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Aucune entreprise</Typography>
              </TableCell></TableRow>
            ) : companies.map((company) => (
              <TableRow key={company.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{company.name}</Typography>
                  <Typography variant="caption" color="text.secondary">#{company.id} · {company.code}</Typography>
                  {company.locality && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📍 {company.locality}</Typography>}
                </TableCell>
                <TableCell><Chip label={planLabel(company.plan)} size="small" color={planColor(company.plan)} /></TableCell>
                <TableCell>
                  {/* Affichage des modules actifs */}
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
                        arrow
                        placement="right"
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
                <TableCell align="right">
                  <Tooltip title="Voir les détails">
                    <IconButton size="small" color="info" onClick={() => { setDetailsCompany(company); setOpenDetails(true); }}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Importer des utilisateurs">
                    <IconButton size="small" color="primary" onClick={() => openBulkDialog(company.id)}>
                      <UploadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => openEditDialog(company)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={company.is_active ? 'Désactiver' : 'Activer'}>
                    <IconButton size="small" color={company.is_active ? 'error' : 'success'}
                      onClick={() => handleToggleActive(company)}>
                      {company.is_active ? <InactiveIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Réinitialiser modules (tous actifs)">
                    <IconButton size="small" sx={{ color: 'warning.main' }}
                      onClick={() => { setResetModCompany(company); setResetModPwd(''); setResetModError(''); setOpenResetMod(true); }}>
                      <ResetModulesIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Réinitialiser données (compteur à zéro)">
                    <IconButton size="small" sx={{ color: 'orange' }}
                      onClick={() => { setResetDataCompany(company); setResetDataPwd(''); setResetDataError(''); setOpenResetData(true); }}>
                      <ResetDataIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Suppression définitive">
                    <IconButton size="small" sx={{ color: 'error.main' }}
                      onClick={() => { setPermDelCompany(company); setPermDelPwd(''); setPermDelError(''); setOpenPermDel(true); }}>
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
          Dialog — Création entreprise
      ══════════════════════════════════════════════ */}
      <Dialog open={openAdd} onClose={closeAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          {/* Après création : question "compte test ?" */}
          {newCompanyId && askIsTest && (
            <Alert severity="info" icon={<IdIcon />} sx={{ mb: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                Entreprise créée — ID : #{newCompanyId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                S'agit-il d'un <strong>compte de démonstration / test</strong> ?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small" variant="contained" color="warning"
                  disabled={markingTest}
                  onClick={() => handleMarkAsTest(true)}
                  startIcon={markingTest ? <CircularProgress size={14} /> : undefined}
                >
                  Oui, compte test
                </Button>
                <Button
                  size="small" variant="outlined"
                  disabled={markingTest}
                  onClick={() => handleMarkAsTest(false)}
                >
                  Non, production
                </Button>
              </Box>
            </Alert>
          )}

          {/* ID affiché après avoir répondu */}
          {newCompanyId && !askIsTest && (
            <Alert severity="success" icon={<IdIcon />}
              sx={{ mb: 2, fontWeight: 'bold', fontSize: '1rem' }}>
              Entreprise créée — <strong>ID : #{newCompanyId}</strong>
              <br />
              <Typography variant="caption">
                Notez cet identifiant pour l'import d'utilisateurs.
              </Typography>
            </Alert>
          )}

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, color: 'text.secondary' }}>
            Informations de l'entreprise
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth label="Nom de l'entreprise *" size="small"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Code ID *" size="small"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '') })}
                inputProps={{ maxLength: 20 }}
                helperText={formData.code ? `→ users: serveuse.${formData.code}` : 'Ex: pmdo'} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom du fondateur" size="small"
                value={formData.founder_name}
                onChange={(e) => setFormData({ ...formData, founder_name: e.target.value })}
                helperText="Nom du fondateur ou directeur général" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Ville" size="small"
                value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Pays" size="small"
                value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Adresse complète" size="small"
                value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Téléphone" size="small"
                value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Email" type="email" size="small"
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select value={formData.plan} label="Plan"
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}>
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Modules à activer ({createModules.length}/{ALL_MODULES.length})
              {createModules.length === 0 && (
                <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                  — Aucun module sélectionné
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setCreateModules(ALL_MODULE_KEYS)}>Tout cocher</Button>
              <Button size="small" onClick={() => setCreateModules([])}>Tout décocher</Button>
            </Box>
          </Box>
          <FormGroup row sx={{ mb: 1 }}>
            {ALL_MODULES.map(m => (
              <FormControlLabel
                key={m.key}
                control={
                  <Checkbox
                    size="small"
                    checked={createModules.includes(m.key)}
                    onChange={() => toggleCreateModule(m.key)}
                  />
                }
                label={<Typography variant="body2">{m.label}</Typography>}
                sx={{ width: '50%', m: 0 }}
              />
            ))}
          </FormGroup>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Compte administrateur initial
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom complet de l'admin *" size="small"
                value={formData.admin_full_name}
                onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Nom d'utilisateur *" size="small"
                value={formData.admin_username}
                onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Mot de passe *" type="password" size="small"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                inputProps={{ minLength: 6 }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog} disabled={markingTest}>
            {newCompanyId ? 'Fermer' : 'Annuler'}
          </Button>
          {!newCompanyId && (
            <Button variant="contained" onClick={handleCreate} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}>
              Créer l'entreprise
            </Button>
          )}
          {newCompanyId && !askIsTest && (
            <Button variant="outlined" color="primary"
              onClick={() => { closeAddDialog(); openBulkDialog(newCompanyId); }}>
              Importer des utilisateurs →
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Modification entreprise
      ══════════════════════════════════════════════ */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Modifier l'entreprise
          {editCompany && <Chip label={`ID #${editCompany.id}`} size="small" sx={{ ml: 1, fontFamily: 'monospace' }} />}
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
                        onChange={() => toggleEditModule(m.key)}
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
                label="Entreprise active" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Import utilisateurs (Mass Upload)
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
              onChange={(e) => setBulkCompanyId(e.target.value as number)}>
              {companies.filter(c => c.is_active).map(c => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip label={`#${c.id}`} size="small"
                      sx={{ fontFamily: 'monospace', fontWeight: 'bold', minWidth: 50 }} />
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
              onChange={(e) => {
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
          <Button variant="contained" onClick={handleBulkUpload}
            disabled={!bulkCompanyId || !bulkFile || bulkLoading}
            startIcon={bulkLoading ? <CircularProgress size={16} /> : <UploadIcon />}>
            Lancer l'import
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Détails entreprise
      ══════════════════════════════════════════════ */}
      <Dialog open={openDetails} onClose={() => setOpenDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewIcon color="info" />
          Détails de l'entreprise
          {detailsCompany && <Chip label={`#${detailsCompany.id}`} size="small" sx={{ ml: 1, fontFamily: 'monospace' }} />}
        </DialogTitle>
        <DialogContent>
          {detailsCompany && (
            <Grid container spacing={1.5} sx={{ mt: 0 }}>
              {[
                { label: 'Nom',       value: detailsCompany.name },
                { label: 'Code',      value: detailsCompany.code },
                { label: 'Plan',      value: planLabel(detailsCompany.plan) },
                { label: 'Fondateur', value: detailsCompany.manager_name || '—' },
                { label: 'Ville',     value: detailsCompany.locality    || '—' },
                { label: 'Pays',      value: detailsCompany.country     || '—' },
                { label: 'Adresse',   value: detailsCompany.address     || '—' },
                { label: 'Téléphone', value: detailsCompany.phone       || '—' },
                { label: 'Email',     value: detailsCompany.email       || '—' },
                { label: 'Utilisateurs actifs', value: String(detailsCompany.users_count ?? 0) },
                { label: 'Créé le',   value: new Date(detailsCompany.created_at).toLocaleDateString('fr-FR') },
                { label: 'Statut',    value: detailsCompany.is_active ? 'Active' : 'Inactive' },
              ].map(({ label, value }) => (
                <Grid item xs={6} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight="bold">{value}</Typography>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Modules activés</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {(() => {
                    const mods = detailsCompany.modules === null || detailsCompany.modules === undefined
                      ? ALL_MODULE_KEYS : detailsCompany.modules;
                    return ALL_MODULES.map(m => (
                      <Chip key={m.key} label={m.label} size="small"
                        color={mods.includes(m.key) ? 'success' : 'default'}
                        variant={mods.includes(m.key) ? 'filled' : 'outlined'}
                        sx={{ opacity: mods.includes(m.key) ? 1 : 0.4 }} />
                    ));
                  })()}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetails(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Réinitialiser modules
      ══════════════════════════════════════════════ */}
      <Dialog open={openResetMod} onClose={() => setOpenResetMod(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ResetModulesIcon sx={{ color: 'warning.main' }} />
          Réinitialiser les modules
        </DialogTitle>
        <DialogContent>
          {resetModError && <Alert severity="error" sx={{ mb: 2 }}>{resetModError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tous les modules seront <strong>réactivés</strong> pour <strong>{resetModCompany?.name}</strong>.
            L'entreprise aura accès à l'ensemble des fonctionnalités.
          </Alert>
          <TextField fullWidth label="Mot de passe de confirmation" type="password" size="small"
            value={resetModPwd} onChange={(e) => setResetModPwd(e.target.value)}
            placeholder="Bonjour@2026#" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetMod(false)}>Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleResetModules}
            disabled={resetModLoading} startIcon={resetModLoading ? <CircularProgress size={16} /> : <ResetModulesIcon />}>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Réinitialiser données (compteur à 0)
      ══════════════════════════════════════════════ */}
      <Dialog open={openResetData} onClose={() => setOpenResetData(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ResetDataIcon sx={{ color: 'orange' }} />
          Réinitialisation des données
        </DialogTitle>
        <DialogContent>
          {resetDataError && <Alert severity="error" sx={{ mb: 2 }}>{resetDataError}</Alert>}
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography fontWeight="bold" sx={{ mb: 0.5 }}>⚠️ Action irréversible</Typography>
            Toutes les données transactionnelles de <strong>{resetDataCompany?.name}</strong> seront
            supprimées définitivement (tickets, ventes, commandes, réservations…).
            Les utilisateurs et la configuration sont conservés.
          </Alert>
          <TextField fullWidth label="Mot de passe de confirmation" type="password" size="small"
            value={resetDataPwd} onChange={(e) => setResetDataPwd(e.target.value)}
            placeholder="Bonjour@2026#" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetData(false)}>Annuler</Button>
          <Button variant="contained" sx={{ backgroundColor: 'orange', '&:hover': { backgroundColor: '#e65100' } }}
            onClick={handleResetData} disabled={resetDataLoading}
            startIcon={resetDataLoading ? <CircularProgress size={16} /> : <ResetDataIcon />}>
            Réinitialiser les données
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Dialog — Suppression définitive
      ══════════════════════════════════════════════ */}
      <Dialog open={openPermDel} onClose={() => setOpenPermDel(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon color="error" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          {permDelError && <Alert severity="error" sx={{ mb: 2 }}>{permDelError}</Alert>}
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography fontWeight="bold" sx={{ mb: 0.5 }}>⛔ Action irréversible</Typography>
            L'entreprise <strong>{permDelCompany?.name}</strong> et <strong>tous ses utilisateurs</strong> seront
            supprimés définitivement de la base de données. Il n'y a aucun retour en arrière possible.
          </Alert>
          <TextField fullWidth label="Mot de passe de confirmation" type="password" size="small"
            value={permDelPwd} onChange={(e) => setPermDelPwd(e.target.value)}
            placeholder="Bonjour@2026#" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPermDel(false)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handlePermDelete}
            disabled={permDelLoading} startIcon={permDelLoading ? <CircularProgress size={16} /> : <DeleteForeverIcon />}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Companies;
