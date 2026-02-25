import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import { companiesApi } from '../services/api';

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
}

interface CompanyStats {
  company: Company;
  users_count: number;
  active_users: number;
}

interface CreateCompanyForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  plan: string;
  admin_username: string;
  admin_password: string;
  admin_full_name: string;
}

const defaultForm: CreateCompanyForm = {
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  plan: 'standard',
  admin_username: '',
  admin_password: '',
  admin_full_name: ''
};

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog ajout
  const [openAdd, setOpenAdd] = useState(false);
  const [formData, setFormData] = useState<CreateCompanyForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Dialog modification
  const [openEdit, setOpenEdit] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState<Partial<Company>>({});

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await companiesApi.getCompanies();
      const list: Company[] = res.data.data || [];
      // Charger les stats pour chaque entreprise
      const statsPromises = list.map(async (c) => {
        try {
          const statsRes = await companiesApi.getCompanyStats(c.id);
          return statsRes.data.data as CompanyStats;
        } catch {
          return { company: c, users_count: 0, active_users: 0 } as CompanyStats;
        }
      });
      const stats = await Promise.all(statsPromises);
      setCompanies(stats);
    } catch {
      setError('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleCreate = async () => {
    setFormError('');
    if (!formData.name || !formData.code || !formData.admin_username || !formData.admin_password || !formData.admin_full_name) {
      setFormError('Les champs nom, code, et administrateur sont requis');
      return;
    }
    setSaving(true);
    try {
      await companiesApi.createCompany(formData);
      setSuccess(`Entreprise "${formData.name}" créée avec succès`);
      setOpenAdd(false);
      setFormData(defaultForm);
      loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editCompany) return;
    setSaving(true);
    try {
      await companiesApi.updateCompany(editCompany.id, editForm);
      setSuccess(`Entreprise mise à jour`);
      setOpenEdit(false);
      setEditCompany(null);
      loadCompanies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      await companiesApi.updateCompany(company.id, { is_active: !company.is_active });
      setSuccess(`Entreprise ${company.is_active ? 'désactivée' : 'activée'}`);
      loadCompanies();
    } catch {
      setError('Erreur lors de la modification');
    }
  };

  const openEditDialog = (company: Company) => {
    setEditCompany(company);
    setEditForm({
      name: company.name,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      plan: company.plan
    });
    setFormError('');
    setOpenEdit(true);
  };

  const planLabel = (plan: string) => {
    const labels: Record<string, string> = {
      basic: 'Basique',
      standard: 'Standard',
      premium: 'Premium'
    };
    return labels[plan] || plan;
  };

  const planColor = (plan: string): 'default' | 'primary' | 'secondary' | 'success' => {
    if (plan === 'premium') return 'success';
    if (plan === 'standard') return 'primary';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <div>
            <Typography variant="h5" fontWeight="bold">
              Gestion des Entreprises
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administration multi-entreprises
            </Typography>
          </div>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={loadCompanies} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setFormData(defaultForm); setFormError(''); setOpenAdd(true); }}
          >
            Nouvelle entreprise
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {companies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entreprises total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {companies.filter(c => c.company.is_active).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entreprises actives
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main" fontWeight="bold">
                {companies.reduce((sum, c) => sum + (c.active_users || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Utilisateurs actifs total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tableau des entreprises */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Entreprise</strong></TableCell>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Plan</strong></TableCell>
              <TableCell><strong>Utilisateurs</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell><strong>Date création</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Aucune entreprise</Typography>
                </TableCell>
              </TableRow>
            ) : (
              companies.map(({ company, users_count, active_users }) => (
                <TableRow key={company.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{company.name}</Typography>
                      {company.address && (
                        <Typography variant="caption" color="text.secondary">{company.address}</Typography>
                      )}
                      {company.phone && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {company.phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={company.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={planLabel(company.plan)}
                      size="small"
                      color={planColor(company.plan)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {active_users} / {users_count} actifs
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {company.is_active ? (
                      <Chip
                        icon={<ActiveIcon />}
                        label="Active"
                        size="small"
                        color="success"
                      />
                    ) : (
                      <Chip
                        icon={<InactiveIcon />}
                        label="Inactive"
                        size="small"
                        color="error"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(company.created_at).toLocaleDateString('fr-FR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => openEditDialog(company)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={company.is_active ? 'Désactiver' : 'Activer'}>
                      <IconButton
                        size="small"
                        color={company.is_active ? 'error' : 'success'}
                        onClick={() => handleToggleActive(company)}
                      >
                        {company.is_active ? <InactiveIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Création */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, color: 'text.secondary' }}>
            Informations de l'entreprise
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Nom de l'entreprise *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Code *"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                size="small"
                inputProps={{ maxLength: 20 }}
                helperText="Ex: OUANGOLO"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select
                  value={formData.plan}
                  label="Plan"
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                >
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            Compte administrateur initial
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom complet de l'admin *"
                value={formData.admin_full_name}
                onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Nom d'utilisateur *"
                value={formData.admin_username}
                onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Mot de passe *"
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                size="small"
                inputProps={{ minLength: 6 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Créer l'entreprise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Modification */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier l'entreprise</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom de l'entreprise"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                value={editForm.address || ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select
                  value={editForm.plan || 'standard'}
                  label="Plan"
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                >
                  <MenuItem value="basic">Basique</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.is_active !== false}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                }
                label="Entreprise active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Companies;
