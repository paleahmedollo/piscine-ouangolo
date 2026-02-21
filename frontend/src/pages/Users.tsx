import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  Lock as LockIcon,
  CheckCircle,
  Cancel,
  DeleteForever as DeleteIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { usersApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  maitre_nageur: 'Maitre-nageur',
  serveuse: 'Serveuse',
  serveur: 'Serveur',
  receptionniste: 'Receptionniste',
  gestionnaire_events: 'Gestionnaire Events',
  gerant: 'Gerant',
  responsable: 'Responsable',
  directeur: 'Directeur',
  maire: 'Maire'
};

const roleColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  admin: 'error',
  maitre_nageur: 'info',
  serveuse: 'warning',
  serveur: 'warning',
  receptionniste: 'success',
  gestionnaire_events: 'secondary',
  gerant: 'primary',
  responsable: 'info',
  directeur: 'primary',
  maire: 'error'
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'serveuse'
  });
  const [newPassword, setNewPassword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const isAhmed = currentUser?.username === 'ahmedpiscine';

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers();
      setUsers(response.data.data.users || response.data.data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        full_name: user.full_name,
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'serveuse'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'serveuse'
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role
        });
        setSuccess('Utilisateur modifie avec succes');
      } else {
        await usersApi.createUser(formData);
        setSuccess('Utilisateur cree avec succes');
      }
      handleCloseDialog();
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de l\'operation');
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await usersApi.toggleActive(userId);
      setSuccess('Statut modifie avec succes');
      fetchUsers();
    } catch (err) {
      setError('Erreur lors de la modification du statut');
    }
  };

  const handleOpenPasswordDialog = (userId: number) => {
    setSelectedUserId(userId);
    setNewPassword('');
    setOpenPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUserId || !newPassword) return;
    try {
      await usersApi.resetPassword(selectedUserId, newPassword);
      setSuccess('Mot de passe reinitialise avec succes');
      setOpenPasswordDialog(false);
      setNewPassword('');
    } catch (err) {
      setError('Erreur lors de la reinitialisation du mot de passe');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await usersApi.deleteUser(deletingUser.id);
      setSuccess(`Compte "${deletingUser.full_name}" supprimé définitivement`);
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Vérifier si l'utilisateur connecté peut modifier un utilisateur
  const canModifyUser = (targetUser: User): boolean => {
    // L'admin peut tout modifier
    if (currentUser?.role === 'admin') return true;
    // Le gérant ne peut pas modifier les admins
    if (currentUser?.role === 'gerant' && targetUser.role === 'admin') return false;
    return true;
  };

  if (loading) {
    return (
      <Layout title="Gestion des Utilisateurs">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Gestion des Utilisateurs">
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">
              Liste des Utilisateurs
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nouvel Utilisateur
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Nom complet</strong></TableCell>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Date creation</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Chip
                        label={roleLabels[user.role] || user.role}
                        color={roleColors[user.role] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.is_active ? <CheckCircle /> : <Cancel />}
                        label={user.is_active ? 'Actif' : 'Inactif'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell align="center">
                      {canModifyUser(user) ? (
                        <>
                          <Tooltip title="Modifier">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(user)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reinitialiser mot de passe">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleOpenPasswordDialog(user.id)}
                            >
                              <LockIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.is_active ? 'Desactiver' : 'Activer'}>
                            <IconButton
                              size="small"
                              color={user.is_active ? 'error' : 'success'}
                              onClick={() => handleToggleActive(user.id)}
                            >
                              {user.is_active ? <Cancel /> : <CheckCircle />}
                            </IconButton>
                          </Tooltip>
                          {isAhmed && user.id !== currentUser?.id && (
                            <Tooltip title="Supprimer définitivement">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => { setDeletingUser(user); setDeleteDialogOpen(true); }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog Creer/Modifier Utilisateur */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom complet"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Nom d'utilisateur"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
              disabled={!!editingUser}
            />
            {!editingUser && (
              <TextField
                label="Mot de passe"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
              />
            )}
            <TextField
              select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              fullWidth
            >
              {Object.entries(roleLabels)
                .filter(([value]) => {
                  // Le gérant ne peut pas attribuer le rôle admin
                  if (currentUser?.role === 'gerant' && value === 'admin') return false;
                  return true;
                })
                .map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingUser ? 'Modifier' : 'Creer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Reinitialiser mot de passe */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleResetPassword}>
            Reinitialiser
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmation suppression définitive */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer définitivement</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 1 }}>
            Vous allez supprimer définitivement le compte de <strong>{deletingUser?.full_name}</strong> ({deletingUser?.username}). Cette action est irréversible.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error" startIcon={<DeleteIcon />}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Users;
