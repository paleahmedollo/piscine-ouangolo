import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControlLabel, Checkbox,
  Switch, Tooltip, Avatar, Alert, CircularProgress, Divider, FormGroup
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon, Shield as ShieldIcon,
  Key as KeyIcon, CheckCircle as CheckIcon, Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// ─── Sections disponibles dans le panel superadmin ────────────────────────────
const SA_SECTIONS = [
  { key: 'dashboard',     label: 'Tableau de bord',           desc: 'Statistiques globales' },
  { key: 'companies',     label: 'Entreprises',                desc: 'Gestion des sociétés clientes' },
  { key: 'users',         label: 'Utilisateurs',               desc: 'Utilisateurs de toutes les entreprises' },
  { key: 'subscriptions', label: 'Abonnements',                desc: 'Plans et abonnements SaaS' },
  { key: 'billing',       label: 'Facturation',                desc: 'Factures et paiements' },
  { key: 'leads',         label: 'Demandes Essai & Visiteurs', desc: 'Formulaires et leads landing' },
  { key: 'tickets',       label: 'Assistance (Billets)',       desc: 'Support client' },
  { key: 'reports',       label: 'Rapports',                   desc: 'Rapports globaux' },
  { key: 'settings',      label: 'Paramètres',                 desc: 'Configuration système' },
  { key: 'logs',          label: 'Système de journaux',        desc: 'Logs et audit' },
  { key: 'super-admins',  label: 'Utilisateurs Super Admin',   desc: 'Gestion des comptes superadmin' },
];

interface SuperAdminUser {
  id: number;
  username: string;
  full_name: string;
  is_active: boolean;
  sa_permissions: string[] | null;
  created_at: string;
}

interface FormState {
  username: string;
  full_name: string;
  password: string;
  is_active: boolean;
  sa_permissions: string[];
  allAccess: boolean; // null = tout
}

const AdminSuperAdmins: React.FC = () => {
  const { user: me, token } = useAuth();
  const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SuperAdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    username: '', full_name: '', password: '', is_active: true,
    sa_permissions: [], allAccess: true
  });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<SuperAdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password dialog
  const [pwdTarget, setPwdTarget] = useState<SuperAdminUser | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }), [token]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/superadmin/super-admins`, { headers: getHeaders() });
      if (!res.ok) {
        // Erreur HTTP (401, 403, 500...) → on tente de lire le message
        try {
          const data = await res.json();
          setError(data.message || `Erreur serveur (${res.status})`);
        } catch {
          setError(`Erreur serveur (${res.status})`);
        }
        return;
      }
      const data = await res.json();
      if (data.success) setAdmins(data.data);
      else setError(data.message || 'Erreur de chargement');
    } catch {
      setError('Serveur injoignable — vérifiez votre connexion ou réessayez dans quelques secondes.');
    } finally {
      setLoading(false);
    }
  }, [token, getHeaders]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  // ─── Ouvrir dialog création ───────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm({ username: '', full_name: '', password: '', is_active: true, sa_permissions: [], allAccess: true });
    setDialogOpen(true);
  };

  // ─── Ouvrir dialog édition ────────────────────────────────────────────────
  const openEdit = (admin: SuperAdminUser) => {
    setEditTarget(admin);
    setForm({
      username: admin.username,
      full_name: admin.full_name,
      password: '',
      is_active: admin.is_active,
      sa_permissions: admin.sa_permissions || [],
      allAccess: admin.sa_permissions === null
    });
    setDialogOpen(true);
  };

  // ─── Toggle section permission ────────────────────────────────────────────
  const toggleSection = (key: string) => {
    setForm(prev => {
      const has = prev.sa_permissions.includes(key);
      return { ...prev, sa_permissions: has ? prev.sa_permissions.filter(k => k !== key) : [...prev.sa_permissions, key] };
    });
  };

  // ─── Soumettre formulaire ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name,
        is_active: form.is_active,
        sa_permissions: form.allAccess ? null : form.sa_permissions,
      };
      if (!editTarget) {
        payload.username = form.username;
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const url = editTarget
        ? `/api/superadmin/super-admins/${editTarget.id}`
        : `/api/superadmin/super-admins`;
      const method = editTarget ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        fetchAdmins();
      } else {
        setError(data.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  // ─── Supprimer ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/super-admins/${deleteTarget.id}`, { method: 'DELETE', headers: getHeaders() });
      const data = await res.json();
      if (data.success) { setDeleteTarget(null); fetchAdmins(); }
      else setError(data.message || 'Erreur suppression');
    } catch {
      setError('Erreur réseau');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Changer mot de passe depuis liste ───────────────────────────────────
  const handlePwdSave = async () => {
    if (!pwdTarget || newPwd.length < 6) return;
    setSavingPwd(true);
    try {
      const res = await fetch(`/api/superadmin/super-admins/${pwdTarget.id}`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ password: newPwd })
      });
      const data = await res.json();
      if (data.success) { setPwdTarget(null); setNewPwd(''); }
      else setError(data.message || 'Erreur');
    } catch {
      setError('Erreur réseau');
    } finally {
      setSavingPwd(false);
    }
  };

  const isProtected = (admin: SuperAdminUser) => admin.username === 'superadmin' || admin.id === me?.id;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AdminIcon sx={{ color: '#1a237e', fontSize: 30 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a237e">Utilisateurs Super Admin</Typography>
            <Typography variant="body2" color="text.secondary">
              Gérez les comptes superadmin et leurs accès au panel d'administration
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' }, borderRadius: 2, fontWeight: 600 }}>
          Nouveau Super Admin
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}
          action={<Button size="small" color="inherit" onClick={fetchAdmins}>Réessayer</Button>}>
          {error}
        </Alert>
      )}

      {/* Info box */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<ShieldIcon />}>
        <strong>Accès total :</strong> un super admin sans restrictions voit toutes les sections. <br />
        <strong>Accès sélectif :</strong> cochez uniquement les sections que l'utilisateur doit voir.
      </Alert>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Utilisateur</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Accès</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Créé le</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
            ) : admins.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun compte super admin trouvé</TableCell></TableRow>
            ) : admins.map(admin => (
              <TableRow key={admin.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                {/* Utilisateur */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: admin.id === me?.id ? '#1a237e' : '#546e7a', fontSize: '0.9rem' }}>
                      {admin.full_name[0]}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{admin.full_name}</Typography>
                        {admin.id === me?.id && <Chip label="Vous" size="small" sx={{ bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.65rem', height: 18 }} />}
                        {admin.username === 'superadmin' && <Chip label="Principal" size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: '0.65rem', height: 18 }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">@{admin.username}</Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Statut */}
                <TableCell>
                  {admin.is_active
                    ? <Chip icon={<CheckIcon sx={{ fontSize: '0.9rem !important' }} />} label="Actif" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }} />
                    : <Chip icon={<CancelIcon sx={{ fontSize: '0.9rem !important' }} />} label="Inactif" size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 600 }} />}
                </TableCell>

                {/* Accès */}
                <TableCell sx={{ maxWidth: 320 }}>
                  {admin.sa_permissions === null ? (
                    <Chip label="★ Accès total" size="small" sx={{ bgcolor: '#1a237e', color: '#fff', fontWeight: 700 }} />
                  ) : admin.sa_permissions.length === 0 ? (
                    <Chip label="Aucun accès" size="small" sx={{ bgcolor: '#ffebee', color: '#c62828' }} />
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {admin.sa_permissions.map(s => {
                        const sec = SA_SECTIONS.find(x => x.key === s);
                        return <Chip key={s} label={sec?.label || s} size="small" sx={{ bgcolor: '#e8eaf6', color: '#3949ab', fontSize: '0.7rem' }} />;
                      })}
                    </Box>
                  )}
                </TableCell>

                {/* Date */}
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                  </Typography>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <Tooltip title="Modifier les accès">
                    <IconButton size="small" onClick={() => openEdit(admin)} sx={{ color: '#1565c0' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Changer le mot de passe">
                    <IconButton size="small" onClick={() => { setPwdTarget(admin); setNewPwd(''); }} sx={{ color: '#2e7d32' }}>
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!isProtected(admin) && (
                    <Tooltip title="Supprimer">
                      <IconButton size="small" onClick={() => setDeleteTarget(admin)} sx={{ color: '#c62828' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Dialog Créer / Modifier ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#1a237e', color: '#fff', py: 2 }}>
          <AdminIcon /> {editTarget ? `Modifier — ${editTarget.username}` : 'Nouveau Super Admin'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!editTarget && (
              <TextField label="Nom d'utilisateur *" fullWidth size="small"
                value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
            )}
            <TextField label="Nom complet *" fullWidth size="small"
              value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            <TextField
              label={editTarget ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}
              fullWidth size="small" type="password"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />

            {editTarget && (
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} color="success" />}
                label={form.is_active ? 'Compte actif' : 'Compte désactivé'}
              />
            )}

            <Divider />
            <Typography variant="subtitle2" fontWeight={700} color="#1a237e">
              Accès aux sections du panel
            </Typography>

            <FormControlLabel
              control={
                <Switch checked={form.allAccess}
                  onChange={e => setForm(p => ({ ...p, allAccess: e.target.checked, sa_permissions: [] }))}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: form.allAccess ? '#1a237e' : undefined } }} />
              }
              label={<Box><Typography variant="body2" fontWeight={600}>Accès total (toutes les sections)</Typography><Typography variant="caption" color="text.secondary">Recommandé pour les super admins de confiance</Typography></Box>}
            />

            {!form.allAccess && (
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Cochez les sections autorisées :
                </Typography>
                <FormGroup>
                  {SA_SECTIONS.map(sec => (
                    <FormControlLabel key={sec.key}
                      control={
                        <Checkbox size="small" checked={form.sa_permissions.includes(sec.key)}
                          onChange={() => toggleSection(sec.key)}
                          sx={{ '&.Mui-checked': { color: '#1a237e' } }} />
                      }
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2">{sec.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{sec.desc}</Typography>
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : editTarget ? 'Enregistrer' : 'Créer le compte'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Mot de passe ─────────────────────────────────────────────── */}
      <Dialog open={!!pwdTarget} onClose={() => setPwdTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyIcon sx={{ color: '#2e7d32' }} /> Changer le mot de passe
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Compte : <strong>{pwdTarget?.username}</strong>
          </Typography>
          <TextField label="Nouveau mot de passe *" type="password" fullWidth size="small"
            value={newPwd} onChange={e => setNewPwd(e.target.value)}
            helperText="Minimum 6 caractères" />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setPwdTarget(null)}>Annuler</Button>
          <Button variant="contained" onClick={handlePwdSave} disabled={savingPwd || newPwd.length < 6}
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
            {savingPwd ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Valider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Suppression ──────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon /> Supprimer le compte
        </DialogTitle>
        <DialogContent>
          <Typography>
            Supprimer définitivement le compte <strong>{deleteTarget?.username}</strong> ?<br />
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSuperAdmins;
