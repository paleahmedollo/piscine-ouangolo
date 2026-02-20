import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
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
  Divider
} from '@mui/material';
import { Add as AddIcon, AttachMoney } from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { eventsApi } from '../services/api';
import { Event, EventSpace, EventStatus } from '../types';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const spaceLabels: Record<EventSpace, string> = {
  salle_conference: 'Salle de conference',
  terrasse: 'Terrasse',
  jardin: 'Jardin',
  piscine_privee: 'Piscine privee',
  restaurant_prive: 'Restaurant prive'
};

const statusColors: Record<EventStatus, 'default' | 'primary' | 'info' | 'success' | 'error'> = {
  demande: 'default',
  confirme: 'primary',
  en_cours: 'info',
  termine: 'success',
  annule: 'error'
};

const statusLabels: Record<EventStatus, string> = {
  demande: 'Demande',
  confirme: 'Confirme',
  en_cours: 'En cours',
  termine: 'Termine',
  annule: 'Annule'
};

// Extension du type Event pour inclure price et deposit_paid
interface EventWithPrice extends Event {
  price?: number;
  deposit_paid?: number;
}

const Events: React.FC = () => {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<EventWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Event dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    event_date: '',
    event_time: '',
    space: '' as EventSpace | '',
    guest_count: 0,
    description: '',
    price: 0,
    deposit_paid: 0
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getEvents();
      setEvents(response.data.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!hasPermission('events', 'gestion')) {
      setSnackbar({ open: true, message: 'Non autorise', severity: 'error' });
      return;
    }

    if (!eventForm.name || !eventForm.client_name || !eventForm.event_date || !eventForm.space) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs requis', severity: 'error' });
      return;
    }

    try {
      setFormLoading(true);
      await eventsApi.createEvent({
        name: eventForm.name,
        client_name: eventForm.client_name,
        client_phone: eventForm.client_phone || undefined,
        client_email: eventForm.client_email || undefined,
        event_date: eventForm.event_date,
        event_time: eventForm.event_time || undefined,
        space: eventForm.space as EventSpace,
        guest_count: eventForm.guest_count || undefined,
        description: eventForm.description || undefined,
        price: eventForm.price || undefined,
        deposit_paid: eventForm.deposit_paid || undefined
      });
      setSnackbar({ open: true, message: 'Evenement cree', severity: 'success' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      console.error('Error creating event:', error);
      const err = error as { response?: { data?: { message?: string }, status?: number } };
      const errorMessage = err.response?.status === 409
        ? 'Cet espace est deja reserve pour cette date. Veuillez choisir une autre date ou un autre espace.'
        : err.response?.data?.message || 'Erreur lors de la creation';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (eventId: number, status: EventStatus) => {
    try {
      await eventsApi.updateEventStatus(eventId, status);
      setSnackbar({ open: true, message: 'Statut mis a jour', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    }
  };

  const resetForm = () => {
    setEventForm({
      name: '',
      client_name: '',
      client_phone: '',
      client_email: '',
      event_date: '',
      event_time: '',
      space: '',
      guest_count: 0,
      description: '',
      price: 0,
      deposit_paid: 0
    });
  };

  const upcomingEvents = events.filter(e => ['demande', 'confirme'].includes(e.status));

  // Calculer le resume financier
  const getSummary = () => {
    const activeEvents = events.filter(e => ['demande', 'confirme', 'en_cours'].includes(e.status));
    const totalPrix = activeEvents.reduce((sum, e) => sum + parseFloat(String(e.price || 0)), 0);
    const totalAcompte = activeEvents.reduce((sum, e) => sum + parseFloat(String(e.deposit_paid || 0)), 0);
    const totalRestant = totalPrix - totalAcompte;
    return { count: activeEvents.length, totalPrix, totalAcompte, totalRestant };
  };

  const summary = getSummary();

  if (loading) {
    return (
      <Layout title="Evenements">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Evenements">
      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Evenements a venir</Typography>
              <Typography variant="h5" fontWeight="bold">{upcomingEvents.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">En attente</Typography>
              <Typography variant="h5" fontWeight="bold">{events.filter(e => e.status === 'demande').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Confirmes</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">{events.filter(e => e.status === 'confirme').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Total ce mois</Typography>
              <Typography variant="h5" fontWeight="bold">{events.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        {hasPermission('events', 'gestion') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Nouvel Evenement
          </Button>
        )}
      </Box>

      {/* Upcoming Events */}
      <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
        Evenements a venir
      </Typography>
      <Card sx={{ mb: 1.5 }}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Evenement</strong></TableCell>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Espace</strong></TableCell>
                  <TableCell><strong>Invites</strong></TableCell>
                  <TableCell align="right"><strong>Prix</strong></TableCell>
                  <TableCell align="right"><strong>Acompte</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  {hasPermission('events', 'gestion') && <TableCell><strong>Actions</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {upcomingEvents.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      {new Date(event.event_date).toLocaleDateString('fr-FR')}
                      {event.event_time && ` ${event.event_time.slice(0, 5)}`}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{event.name}</Typography>
                      {event.description && (
                        <Typography variant="caption" color="text.secondary">
                          {event.description.substring(0, 50)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.client_name}
                      {event.client_phone && (
                        <Typography variant="caption" display="block">{event.client_phone}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{spaceLabels[event.space]}</TableCell>
                    <TableCell>{event.guest_count || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {event.price ? formatCurrency(event.price) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {event.deposit_paid ? formatCurrency(event.deposit_paid) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip label={statusLabels[event.status]} color={statusColors[event.status]} size="small" />
                    </TableCell>
                    {hasPermission('events', 'gestion') && (
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={event.status}
                            onChange={(e) => handleUpdateStatus(event.id, e.target.value as EventStatus)}
                          >
                            <MenuItem value="demande">Demande</MenuItem>
                            <MenuItem value="confirme">Confirme</MenuItem>
                            <MenuItem value="en_cours">En cours</MenuItem>
                            <MenuItem value="termine">Termine</MenuItem>
                            <MenuItem value="annule">Annule</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {upcomingEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">Aucun evenement a venir</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Resume financier - Toujours afficher s'il y a des evenements actifs */}
      {summary.count > 0 && (
        <Card sx={{ mb: 1.5, backgroundColor: summary.totalPrix > 0 ? '#e8f5e9' : '#fff3e0' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney /> Resume Financier des Evenements Actifs
            </Typography>
            <Divider sx={{ my: 1 }} />
            {summary.totalPrix > 0 ? (
              <Grid container spacing={1.5}>
                <Grid item xs={6} md={3}>
                  <Typography color="text.secondary" variant="body2">Evenements</Typography>
                  <Typography variant="h6" fontWeight="bold">{summary.count}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography color="text.secondary" variant="body2">Total Prix</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formatCurrency(summary.totalPrix)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography color="text.secondary" variant="body2">Acomptes Recus</Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(summary.totalAcompte)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography color="text.secondary" variant="body2">Reste a Payer</Typography>
                  <Typography variant="h6" fontWeight="bold" color="error.main">
                    {formatCurrency(summary.totalRestant)}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                {summary.count} evenement(s) actif(s) sans prix renseigne.
                Ajoutez le prix lors de la creation pour voir le resume financier.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvel Evenement</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Le systeme verifie automatiquement les conflits de dates. Si un evenement est deja programme pour le meme espace a la meme date, la creation sera refusee.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom de l'evenement"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du client"
                value={eventForm.client_name}
                onChange={(e) => setEventForm({ ...eventForm, client_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Telephone"
                value={eventForm.client_phone}
                onChange={(e) => setEventForm({ ...eventForm, client_phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={eventForm.client_email}
                onChange={(e) => setEventForm({ ...eventForm, client_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Heure"
                type="time"
                value={eventForm.event_time}
                onChange={(e) => setEventForm({ ...eventForm, event_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Espace</InputLabel>
                <Select
                  value={eventForm.space}
                  label="Espace"
                  onChange={(e) => setEventForm({ ...eventForm, space: e.target.value as EventSpace })}
                >
                  <MenuItem value="salle_conference">Salle de conference</MenuItem>
                  <MenuItem value="terrasse">Terrasse</MenuItem>
                  <MenuItem value="jardin">Jardin</MenuItem>
                  <MenuItem value="piscine_privee">Piscine privee</MenuItem>
                  <MenuItem value="restaurant_prive">Restaurant prive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Nombre d'invites"
                type="number"
                value={eventForm.guest_count}
                onChange={(e) => setEventForm({ ...eventForm, guest_count: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Prix de la reservation (FCFA)"
                type="number"
                value={eventForm.price}
                onChange={(e) => setEventForm({ ...eventForm, price: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Acompte verse (FCFA)"
                type="number"
                value={eventForm.deposit_paid}
                onChange={(e) => setEventForm({ ...eventForm, deposit_paid: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCreateEvent}
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={20} /> : 'Creer'}
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

export default Events;
