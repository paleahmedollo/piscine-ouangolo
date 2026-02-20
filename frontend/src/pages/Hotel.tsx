import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Tabs,
  Tab,
  Alert,
  Snackbar,
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Cancel as CancelIcon,
  Hotel as HotelIcon,
  MeetingRoom,
  AttachMoney,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { hotelApi } from '../services/api';
import { Room, Reservation, RoomStatus } from '../types';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const statusColors: Record<RoomStatus, 'success' | 'error' | 'warning' | 'info'> = {
  disponible: 'success',
  occupee: 'error',
  maintenance: 'warning',
  nettoyage: 'info'
};

const statusLabels: Record<string, string> = {
  disponible: 'Disponible',
  occupee: 'Occupée',
  maintenance: 'Maintenance',
  nettoyage: 'Nettoyage',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée'
};

const Hotel: React.FC = () => {
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [, setReservations] = useState<Reservation[]>([]); // reservations en_cours (non utilise directement)
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Reservation dialog
  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resForm, setResForm] = useState({
    room_id: 0,
    client_name: '',
    client_phone: '',
    client_email: '',
    check_in: '',
    check_out: '',
    deposit_paid: 0,
    notes: ''
  });
  const [resLoading, setResLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  // Stats
  const [stats, setStats] = useState<{
    total_chambres: number;
    chambres_disponibles: number;
    chambres_occupees: number;
    taux_occupation: number;
  } | null>(null);

  // Room editing
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editRoomForm, setEditRoomForm] = useState({
    number: '',
    price_per_night: 0,
    capacity: 2,
    type: ''
  });
  const [roomSaving, setRoomSaving] = useState(false);

  // New room dialog
  const [newRoomDialogOpen, setNewRoomDialogOpen] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    number: '',
    type: 'Simple',
    capacity: 2,
    price_per_night: 0
  });
  const [newRoomLoading, setNewRoomLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, reservationsRes, allResRes, statsRes] = await Promise.all([
        hotelApi.getRooms(),
        hotelApi.getReservations({ status: 'en_cours' }),
        hotelApi.getReservations({}),
        hotelApi.getStats()
      ]);
      setRooms(roomsRes.data.data);
      setReservations(reservationsRes.data.data.reservations);
      setAllReservations(allResRes.data.data.reservations);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openNewReservation = async () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setResForm({
      room_id: 0,
      client_name: '',
      client_phone: '',
      client_email: '',
      check_in: today,
      check_out: tomorrow,
      deposit_paid: 0,
      notes: ''
    });
    try {
      const res = await hotelApi.getAvailableRooms(today, tomorrow);
      setAvailableRooms(res.data.data);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
    }
    setResDialogOpen(true);
  };

  const handleDateChange = async (field: 'check_in' | 'check_out', value: string) => {
    const newForm = { ...resForm, [field]: value };
    setResForm(newForm);

    if (newForm.check_in && newForm.check_out && newForm.check_in < newForm.check_out) {
      try {
        const res = await hotelApi.getAvailableRooms(newForm.check_in, newForm.check_out);
        setAvailableRooms(res.data.data);
      } catch (error) {
        console.error('Error fetching available rooms:', error);
      }
    }
  };

  const handleCreateReservation = async () => {
    if (!hasPermission('hotel', 'reservations')) {
      setSnackbar({ open: true, message: 'Non autorisé', severity: 'error' });
      return;
    }

    try {
      setResLoading(true);
      await hotelApi.createReservation({
        room_id: resForm.room_id,
        client_name: resForm.client_name,
        client_phone: resForm.client_phone || undefined,
        client_email: resForm.client_email || undefined,
        check_in: resForm.check_in,
        check_out: resForm.check_out,
        deposit_paid: resForm.deposit_paid || undefined,
        notes: resForm.notes || undefined
      });
      setSnackbar({ open: true, message: 'Réservation créée - Chambre marquée comme occupée', severity: 'success' });
      setResDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Erreur lors de la création',
        severity: 'error'
      });
    } finally {
      setResLoading(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      await hotelApi.checkIn(id);
      setSnackbar({ open: true, message: 'Check-in effectué', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors du check-in', severity: 'error' });
    }
  };

  const handleCheckOut = async (id: number) => {
    try {
      await hotelApi.checkOut(id);
      setSnackbar({ open: true, message: 'Check-out effectué', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors du check-out', severity: 'error' });
    }
  };

  const handleCancelReservation = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;

    try {
      await hotelApi.cancelReservation(id);
      setSnackbar({ open: true, message: 'Réservation annulée - Chambre libérée', severity: 'success' });
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Erreur lors de l\'annulation',
        severity: 'error'
      });
    }
  };

  const handleUpdateRoomStatus = async (roomId: number, status: RoomStatus) => {
    try {
      await hotelApi.updateRoomStatus(roomId, status);
      setSnackbar({ open: true, message: 'Statut mis à jour', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    }
  };

  // Room price editing functions
  const handleEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditRoomForm({
      number: room.number,
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      type: room.type
    });
  };

  const handleCancelEditRoom = () => {
    setEditingRoomId(null);
    setEditRoomForm({ number: '', price_per_night: 0, capacity: 2, type: '' });
  };

  const handleSaveRoom = async (roomId: number) => {
    try {
      setRoomSaving(true);
      await hotelApi.updateRoom(roomId, editRoomForm);
      setSnackbar({ open: true, message: 'Chambre mise à jour - Les nouveaux prix sont effectifs', severity: 'success' });
      setEditingRoomId(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Erreur lors de la mise à jour',
        severity: 'error'
      });
    } finally {
      setRoomSaving(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      setNewRoomLoading(true);
      await hotelApi.createRoom(newRoomForm);
      setSnackbar({ open: true, message: 'Nouvelle chambre créée', severity: 'success' });
      setNewRoomDialogOpen(false);
      setNewRoomForm({ number: '', type: 'Simple', capacity: 2, price_per_night: 0 });
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Erreur lors de la création',
        severity: 'error'
      });
    } finally {
      setNewRoomLoading(false);
    }
  };

  // Calculer le résumé des réservations
  const getReservationSummary = () => {
    const activeReservations = allReservations.filter(r => ['confirmee', 'en_cours'].includes(r.status));
    const totalMontant = activeReservations.reduce((sum, r) => sum + r.total_price, 0);
    const totalAcompte = activeReservations.reduce((sum, r) => sum + (r.deposit_paid || 0), 0);
    const totalRestant = totalMontant - totalAcompte;
    const totalNuits = activeReservations.reduce((sum, r) => sum + r.nights, 0);

    return {
      count: activeReservations.length,
      totalMontant,
      totalAcompte,
      totalRestant,
      totalNuits
    };
  };

  const summary = getReservationSummary();

  if (loading) {
    return (
      <Layout title="Hôtel">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Hôtel">
      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Taux d'occupation</Typography>
              <Typography variant="h5" fontWeight="bold">{stats?.taux_occupation || 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Chambres disponibles</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">{stats?.chambres_disponibles || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Chambres occupées</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">{stats?.chambres_occupees || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Total chambres</Typography>
              <Typography variant="h5" fontWeight="bold">{stats?.total_chambres || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {hasPermission('hotel', 'reservations') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewReservation}>
            Nouvelle Réservation
          </Button>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<MeetingRoom />} label="Chambres" />
          <Tab icon={<HotelIcon />} label="Réservations" />
          {hasPermission('hotel', 'gestion_chambres') && (
            <Tab icon={<SettingsIcon />} label="Paramètres & Prix" />
          )}
        </Tabs>
      </Box>

      {/* Rooms Tab */}
      {tabValue === 0 && (
        <Box sx={{ pt: 1.5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Liste des Chambres</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell width="10%"><strong>N°</strong></TableCell>
                      <TableCell width="20%"><strong>Type</strong></TableCell>
                      <TableCell width="15%"><strong>Capacité</strong></TableCell>
                      <TableCell width="20%"><strong>Prix/nuit</strong></TableCell>
                      <TableCell width="15%"><strong>Statut</strong></TableCell>
                      {hasPermission('hotel', 'gestion_chambres') && (
                        <TableCell width="20%"><strong>Action</strong></TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow
                        key={room.id}
                        hover
                        sx={{
                          backgroundColor: room.status === 'disponible' ? '#e8f5e9' :
                            room.status === 'occupee' ? '#ffebee' :
                            room.status === 'nettoyage' ? '#e3f2fd' : '#fff3e0'
                        }}
                      >
                        <TableCell>
                          <Typography variant="h6" fontWeight="bold">{room.number}</Typography>
                        </TableCell>
                        <TableCell>{room.type}</TableCell>
                        <TableCell>{room.capacity} pers.</TableCell>
                        <TableCell>
                          <Typography fontWeight="bold" color="primary">
                            {formatCurrency(room.price_per_night)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[room.status]}
                            color={statusColors[room.status]}
                            size="small"
                          />
                        </TableCell>
                        {hasPermission('hotel', 'gestion_chambres') && (
                          <TableCell>
                            {room.status !== 'occupee' && (
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={room.status}
                                  onChange={(e) => handleUpdateRoomStatus(room.id, e.target.value as RoomStatus)}
                                >
                                  <MenuItem value="disponible">Disponible</MenuItem>
                                  <MenuItem value="maintenance">Maintenance</MenuItem>
                                  <MenuItem value="nettoyage">Nettoyage</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Reservations Tab */}
      {tabValue === 1 && (
        <Box sx={{ pt: 1.5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Liste des Réservations</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Chambre</strong></TableCell>
                      <TableCell><strong>Client</strong></TableCell>
                      <TableCell><strong>Arrivée</strong></TableCell>
                      <TableCell><strong>Départ</strong></TableCell>
                      <TableCell><strong>Nuits</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong>Acompte</strong></TableCell>
                      <TableCell><strong>Statut</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allReservations.filter(r => ['confirmee', 'en_cours'].includes(r.status)).map((res) => (
                      <TableRow key={res.id} hover>
                        <TableCell>
                          <Typography fontWeight="bold">{res.room?.number}</Typography>
                          <Typography variant="caption" color="text.secondary">{res.room?.type}</Typography>
                        </TableCell>
                        <TableCell>
                          {res.client_name}
                          {res.client_phone && <Typography variant="caption" display="block">{res.client_phone}</Typography>}
                        </TableCell>
                        <TableCell>{new Date(res.check_in).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{new Date(res.check_out).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{res.nights}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(res.total_price)}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(res.deposit_paid || 0)}</TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[res.status]}
                            size="small"
                            color={res.status === 'en_cours' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {hasPermission('hotel', 'reservations') && (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              {res.status === 'confirmee' && (
                                <Tooltip title="Check-in">
                                  <IconButton color="success" size="small" onClick={() => handleCheckIn(res.id)}>
                                    <CheckInIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {res.status === 'en_cours' && (
                                <Tooltip title="Check-out">
                                  <IconButton color="primary" size="small" onClick={() => handleCheckOut(res.id)}>
                                    <CheckOutIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {['confirmee', 'en_cours'].includes(res.status) && (
                                <Tooltip title="Annuler">
                                  <IconButton color="error" size="small" onClick={() => handleCancelReservation(res.id)}>
                                    <CancelIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {allReservations.filter(r => ['confirmee', 'en_cours'].includes(r.status)).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          Aucune réservation en cours
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Résumé des réservations */}
          {summary.count > 0 && (
            <Card sx={{ mt: 1.5, backgroundColor: '#e3f2fd' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney /> Résumé des Réservations Actives
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={1.5}>
                  <Grid item xs={6} md={2.4}>
                    <Typography color="text.secondary" variant="body2">Réservations</Typography>
                    <Typography variant="h6" fontWeight="bold">{summary.count}</Typography>
                  </Grid>
                  <Grid item xs={6} md={2.4}>
                    <Typography color="text.secondary" variant="body2">Total Nuits</Typography>
                    <Typography variant="h6" fontWeight="bold">{summary.totalNuits}</Typography>
                  </Grid>
                  <Grid item xs={6} md={2.4}>
                    <Typography color="text.secondary" variant="body2">Montant Total</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {formatCurrency(summary.totalMontant)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={2.4}>
                    <Typography color="text.secondary" variant="body2">Acomptes Reçus</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {formatCurrency(summary.totalAcompte)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <Typography color="text.secondary" variant="body2">Reste à Payer</Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {formatCurrency(summary.totalRestant)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Settings Tab - Gestion des Prix */}
      {tabValue === 2 && hasPermission('hotel', 'gestion_chambres') && (
        <Box sx={{ pt: 1.5 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Configuration des Chambres et Prix
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setNewRoomDialogOpen(true)}
                >
                  Nouvelle Chambre
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                Les modifications de prix seront automatiquement appliquées pour toutes les nouvelles réservations.
              </Alert>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>N° Chambre</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Capacité</strong></TableCell>
                      <TableCell><strong>Prix/Nuit (FCFA)</strong></TableCell>
                      <TableCell><strong>Statut actuel</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id} hover>
                        <TableCell>
                          {editingRoomId === room.id ? (
                            <TextField
                              size="small"
                              value={editRoomForm.number}
                              onChange={(e) => setEditRoomForm({ ...editRoomForm, number: e.target.value })}
                              sx={{ width: 80 }}
                            />
                          ) : (
                            <Typography variant="h6" fontWeight="bold">{room.number}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRoomId === room.id ? (
                            <TextField
                              select
                              size="small"
                              value={editRoomForm.type}
                              onChange={(e) => setEditRoomForm({ ...editRoomForm, type: e.target.value })}
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value="Simple">Simple</MenuItem>
                              <MenuItem value="Double">Double</MenuItem>
                              <MenuItem value="Suite">Suite</MenuItem>
                              <MenuItem value="VIP">VIP</MenuItem>
                              <MenuItem value="Familiale">Familiale</MenuItem>
                            </TextField>
                          ) : (
                            room.type
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRoomId === room.id ? (
                            <TextField
                              type="number"
                              size="small"
                              value={editRoomForm.capacity}
                              onChange={(e) => setEditRoomForm({ ...editRoomForm, capacity: parseInt(e.target.value) || 1 })}
                              sx={{ width: 80 }}
                              inputProps={{ min: 1, max: 10 }}
                            />
                          ) : (
                            `${room.capacity} pers.`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRoomId === room.id ? (
                            <TextField
                              type="number"
                              size="small"
                              value={editRoomForm.price_per_night}
                              onChange={(e) => setEditRoomForm({ ...editRoomForm, price_per_night: parseInt(e.target.value) || 0 })}
                              sx={{ width: 130 }}
                              inputProps={{ min: 0, step: 1000 }}
                            />
                          ) : (
                            <Typography fontWeight="bold" color="primary">
                              {formatCurrency(room.price_per_night)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[room.status]}
                            color={statusColors[room.status]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {editingRoomId === room.id ? (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="Enregistrer">
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleSaveRoom(room.id)}
                                  disabled={roomSaving}
                                >
                                  {roomSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Annuler">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={handleCancelEditRoom}
                                  disabled={roomSaving}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : (
                            <Tooltip title="Modifier">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleEditRoom(room)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* New Room Dialog */}
      <Dialog open={newRoomDialogOpen} onClose={() => setNewRoomDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter une nouvelle chambre</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Numéro de chambre"
                value={newRoomForm.number}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, number: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Type"
                value={newRoomForm.type}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, type: e.target.value })}
              >
                <MenuItem value="Simple">Simple</MenuItem>
                <MenuItem value="Double">Double</MenuItem>
                <MenuItem value="Suite">Suite</MenuItem>
                <MenuItem value="VIP">VIP</MenuItem>
                <MenuItem value="Familiale">Familiale</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Capacité (personnes)"
                value={newRoomForm.capacity}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, capacity: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Prix par nuit (FCFA)"
                value={newRoomForm.price_per_night}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, price_per_night: parseInt(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 1000 }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRoomDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCreateRoom}
            variant="contained"
            disabled={newRoomLoading || !newRoomForm.number || !newRoomForm.price_per_night}
          >
            {newRoomLoading ? <CircularProgress size={20} /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reservation Dialog */}
      <Dialog open={resDialogOpen} onClose={() => setResDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle Réservation</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            La chambre sera automatiquement marquée comme occupée après la création de la réservation.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Date d'arrivée"
                type="date"
                value={resForm.check_in}
                onChange={(e) => handleDateChange('check_in', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Date de départ"
                type="date"
                value={resForm.check_out}
                onChange={(e) => handleDateChange('check_out', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Chambre</InputLabel>
                <Select
                  value={resForm.room_id}
                  label="Chambre"
                  onChange={(e) => setResForm({ ...resForm, room_id: Number(e.target.value) })}
                >
                  {availableRooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.number} - {room.type} - {formatCurrency(room.price_per_night)}/nuit
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {availableRooms.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Aucune chambre disponible pour ces dates
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du client"
                value={resForm.client_name}
                onChange={(e) => setResForm({ ...resForm, client_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={resForm.client_phone}
                onChange={(e) => setResForm({ ...resForm, client_phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={resForm.client_email}
                onChange={(e) => setResForm({ ...resForm, client_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Acompte versé"
                type="number"
                value={resForm.deposit_paid}
                onChange={(e) => setResForm({ ...resForm, deposit_paid: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={resForm.notes}
                onChange={(e) => setResForm({ ...resForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCreateReservation}
            variant="contained"
            disabled={resLoading || !resForm.room_id || !resForm.client_name}
          >
            {resLoading ? <CircularProgress size={20} /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Layout>
  );
};

export default Hotel;
