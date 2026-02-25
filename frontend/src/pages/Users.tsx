import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { usersApi } from '../services/api';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      {/* Bandeau info lecture seule */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Cette page est en <strong>lecture seule</strong>. La création et la gestion des utilisateurs sont réservées au Super Administrateur.
      </Alert>

      <Card>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">
              Liste des Utilisateurs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {users.length} utilisateur(s) dans votre entreprise
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Nom complet</strong></TableCell>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Rôle</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Date création</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Aucun utilisateur</Typography>
                    </TableCell>
                  </TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{user.full_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
                    </TableCell>
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
                      <Typography variant="caption">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

    </Layout>
  );
};

export default Users;
