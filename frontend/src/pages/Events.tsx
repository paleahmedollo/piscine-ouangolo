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
import {
  Add as AddIcon,
  AttachMoney,
  CheckCircle as DoneIcon
} from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
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

const Events: React.FC = () => {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
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
    guest_count: '' as number | '',
    description: '',
    price: '' as number | '',
    deposit_paid: '' as number | ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Dialog raison écart acompte (création)
  const [depositReasonDialogOpen, setDepositReasonDialogOpen] = useState(false);
  const [depositReason, setDepositReason] = useState('');

  // Dialog solde final avant "Terminé"
  const [soldeDialogOpen, setSoldeDialogOpen] = useState(false);
  const [soldeEvent, setSoldeEvent] = useState<{ id: number; price: number; deposit_paid: number; name: string; client_name: string } | null>(null);
  const [soldePayment, setSoldePayment] = useState<number>(0);
  const [soldeNotes, setSoldeNotes] = useState('');
  const [soldeLoading, setSoldeLoading] = useState(false);

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

  const doCreateEvent = async (reason?: string) => {
    try {
      setFormLoading(true);
      const extraNote = reason ? `Raison écart acompte: ${reason}` : '';
      const finalDescription = [eventForm.description, extraNote].filter(Boolean).join('\n');
      await eventsApi.createEvent({
        name: eventForm.name,
        client_name: eventForm.client_name,
        client_phone: eventForm.client_phone || undefined,
        client_email: eventForm.client_email || undefined,
        event_date: eventForm.event_date,
        event_time: eventForm.event_time || undefined,
        space: eventForm.space as EventSpace,
        guest_count: eventForm.guest_count !== '' ? Number(eventForm.guest_count) : undefined,
        description: finalDescription || undefined,
        price: eventForm.price !== '' ? Number(eventForm.price) : undefined,
        deposit_paid: eventForm.deposit_paid !== '' ? Number(eventForm.deposit_paid) : undefined
      });
      setSnackbar({ open: true, message: 'Evenement cree', severity: 'success' });
      setDialogOpen(false);
      setDepositReasonDialogOpen(false);
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

  const handleCreateEvent = async () => {
    if (!hasPermission('events', 'gestion')) {
      setSnackbar({ open: true, message: 'Non autorise', severity: 'error' });
      return;
    }

    if (!eventForm.name || !eventForm.client_name || !eventForm.event_date || !eventForm.space) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs requis', severity: 'error' });
      return;
    }

    const price = eventForm.price !== '' ? Number(eventForm.price) : 0;
    const deposit = eventForm.deposit_paid !== '' ? Number(eventForm.deposit_paid) : 0;
    if (deposit > 0 && price > 0 && deposit < price) {
      setDepositReason('');
      setDepositReasonDialogOpen(true);
      return;
    }

    await doCreateEvent();
  };

  // Changement de statut simple (dropdown — sans "terminé")
  const handleUpdateStatus = async (eventId: number, status: EventStatus) => {
    try {
      await eventsApi.updateEventStatus(eventId, status);
      setSnackbar({ open: true, message: 'Statut mis a jour', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    }
  };

  // Bouton "Terminer" dédié — même procédé que le Check-out Hôtel
  const handleTerminate = (ev: Event) => {
    const price = parseFloat(String(ev.price || 0));
    const deposit = parseFloat(String(ev.deposit_paid || 0));
    const remaining = price - deposit;
    if (price > 0 && remaining > 0) {
      setSoldeEvent({ id: ev.id, price, deposit_paid: deposit, name: ev.name, client_name: ev.client_name });
      setSoldePayment(remaining);
      setSoldeNotes('');
      setSoldeDialogOpen(true);
    } else {
      // Déjà soldé ou pas de prix → terminer directement
      doTerminate(ev.id);
    }
  };

  const doTerminate = async (eventId: number, paymentAmount?: number, paymentNotes?: string) => {
    try {
      setSoldeLoading(true);
      // Enregistrer le paiement du solde si fourni
      if (paymentAmount !== undefined && paymentAmount > 0) {
        const ev = events.find(e => e.id === eventId);
        if (ev) {
          const currentDeposit = parseFloat(String(ev.deposit_paid || 0));
          const newDeposit = currentDeposit + paymentAmount;
          const updateData: Record<string, unknown> = { deposit_paid: newDeposit };
          if (paymentNotes) {
            const existingDesc = ev.description || '';
            updateData.description = existingDesc
              ? `${existingDesc}\n[Solde final] ${paymentNotes}`
              : `[Solde final] ${paymentNotes}`;
          }
          await eventsApi.updateEvent(eventId, updateData);
        }
      }
      await eventsApi.updateEventStatus(eventId, 'termine');
      setSnackbar({ open: true, message: 'Evenement termine et solde enregistre', severity: 'success' });
      setSoldeDialogOpen(false);
      setSoldeEvent(null);
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de la cloture', severity: 'error' });
    } finally {
      setSoldeLoading(false);
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
      guest_count: '',
      description: '',
      price: '',
      deposit_paid: ''
    });
  };

  // Tous les événements actifs (demande, confirmé, en cours)
  const activeEvents = events.filter(e => ['demande', 'confirme', 'en_cours'].includes(e.status));

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
              <Typography color="text.secondary" gutterBottom variant="body2">Evenements actifs</Typography>
              <Typography variant="h5" fontWeight="bold">{activeEvents.length}</Typography>
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

      {/* Événements actifs */}
      <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
        Evenements actifs
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
                  <TableCell align="right"><strong>Prix</strong></TableCell>
                  <TableCell align="right"><strong>Acompte</strong></TableCell>
                  <TableCell align="right"><strong>Reste</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  {hasPermission('events', 'gestion') && <TableCell align="center"><strong>Actions</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeEvents.map((event) => {
                  const price = parseFloat(String(event.price || 0));
                  const deposit = parseFloat(String(event.deposit_paid || 0));
                  const reste = price - deposit;
                  return (
                    <TableRow key={event.id} hover sx={{
                      backgroundColor: event.status === 'en_cours' ? '#e8f5e9' : 'inherit'
                    }}>
                      <TableCell>
                        {new Date(event.event_date).toLocaleDateString('fr-FR')}
                        {event.event_time && (
                          <Typography variant="caption" display="block">{event.event_time.slice(0, 5)}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{event.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{event.client_phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{event.client_name}</Typography>
                        {event.guest_count && (
                          <Typography variant="caption" color="text.secondary">{event.guest_count} invités</Typography>
                        )}
                      </TableCell>
                      <TableCell>{spaceLabels[event.space]}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {price > 0 ? formatCurrency(price) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {deposit > 0 ? formatCurrency(deposit) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: reste > 0 ? 'error.main' : 'success.main' }}>
                        {price > 0 ? (reste > 0 ? formatCurrency(reste) : 'Soldé ✓') : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={statusLabels[event.status]} color={statusColors[event.status]} size="small" />
                      </TableCell>
                      {hasPermission('events', 'gestion') && (
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                            {/* Dropdown pour les changements de statut hors "terminé" */}
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={event.status}
                                onChange={(e) => handleUpdateStatus(event.id, e.target.value as EventStatus)}
                              >
                                <MenuItem value="demande">Demande</MenuItem>
                                <MenuItem value="confirme">Confirme</MenuItem>
                                <MenuItem value="en_cours">En cours</MenuItem>
                                <MenuItem value="annule">Annule</MenuItem>
                              </Select>
                            </FormControl>
                            {/* Bouton Terminer dédié — déclenche le dialog de solde si nécessaire */}
                            {(event.status === 'en_cours' || event.status === 'confirme') && (
                              <Tooltip title={reste > 0 ? `Terminer — Reste ${formatCurrency(reste)} à encaisser` : 'Terminer (soldé)'}>
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleTerminate(event)}
                                >
                                  <DoneIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {activeEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>Aucun evenement actif</TableCell>
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
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Nom de l'evenement"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Nom du client"
                value={eventForm.client_name}
                onChange={(e) => setEventForm({ ...eventForm, client_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Telephone"
                value={eventForm.client_phone}
                onChange={(e) => setEventForm({ ...eventForm, client_phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                type="email"
                value={eventForm.client_email}
                onChange={(e) => setEventForm({ ...eventForm, client_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
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
                size="small"
                label="Heure"
                type="time"
                value={eventForm.event_time}
                onChange={(e) => setEventForm({ ...eventForm, event_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required size="small">
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
                size="small"
                label="Nombre d'invites"
                type="number"
                value={eventForm.guest_count}
                placeholder="0"
                onChange={(e) => setEventForm({ ...eventForm, guest_count: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Prix de la reservation (FCFA)"
                type="number"
                value={eventForm.price}
                placeholder="0"
                onChange={(e) => setEventForm({ ...eventForm, price: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Acompte verse (FCFA)"
                type="number"
                value={eventForm.deposit_paid}
                placeholder="0"
                onChange={(e) => setEventForm({ ...eventForm, deposit_paid: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </Grid>
            {eventForm.price !== '' && Number(eventForm.price) > 0 && eventForm.deposit_paid !== '' && Number(eventForm.deposit_paid) > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 3, p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                    <Typography fontWeight="bold" color="primary">{formatCurrency(Number(eventForm.price))}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Reste à payer</Typography>
                    <Typography fontWeight="bold" color={Number(eventForm.price) - Number(eventForm.deposit_paid) > 0 ? 'error.main' : 'success.main'}>
                      {Number(eventForm.price) - Number(eventForm.deposit_paid) > 0
                        ? formatCurrency(Number(eventForm.price) - Number(eventForm.deposit_paid))
                        : 'Soldé ✓'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                multiline
                rows={2}
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

      {/* Dialog paiement du solde — Terminer événement */}
      <Dialog open={soldeDialogOpen} onClose={() => setSoldeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Paiement du solde — Clôture événement</DialogTitle>
        <DialogContent>
          {soldeEvent && (() => {
            const remaining = soldeEvent.price - soldeEvent.deposit_paid;
            const ecart = soldePayment - remaining;
            const hasEcart = soldePayment !== remaining;
            return (
              <>
                <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                  Événement : <strong>{soldeEvent.name}</strong><br />
                  Client : <strong>{soldeEvent.client_name}</strong><br />
                  Prix total : <strong>{formatCurrency(soldeEvent.price)}</strong><br />
                  Acompte déjà versé : <strong>{formatCurrency(soldeEvent.deposit_paid)}</strong><br />
                  <Typography component="span" fontWeight="bold" color="error.main">
                    Reste à payer : {formatCurrency(remaining)}
                  </Typography>
                </Alert>
                <TextField
                  fullWidth
                  label="Montant encaissé (FCFA)"
                  type="number"
                  value={soldePayment}
                  onChange={(e) => setSoldePayment(Number(e.target.value))}
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0 }}
                />
                {hasEcart && (
                  <Alert severity={ecart < 0 ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {ecart < 0
                      ? `Manque : ${formatCurrency(Math.abs(ecart))} — Justification obligatoire`
                      : `Surplus : ${formatCurrency(ecart)} — Justification obligatoire`}
                  </Alert>
                )}
                {hasEcart && (
                  <TextField
                    fullWidth
                    label="Remarque / justification de l'écart (obligatoire)"
                    multiline
                    rows={2}
                    value={soldeNotes}
                    onChange={(e) => setSoldeNotes(e.target.value)}
                    placeholder="Ex: Le client paiera le reste la semaine prochaine..."
                  />
                )}
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSoldeDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={() => {
              if (!soldeEvent) return;
              const remaining = soldeEvent.price - soldeEvent.deposit_paid;
              const hasEcart = soldePayment !== remaining;
              if (hasEcart && !soldeNotes.trim()) return;
              doTerminate(soldeEvent.id, soldePayment, soldeNotes || undefined);
            }}
            variant="contained"
            color="primary"
            disabled={soldeLoading || (() => {
              if (!soldeEvent) return true;
              const remaining = soldeEvent.price - soldeEvent.deposit_paid;
              return soldePayment !== remaining && !soldeNotes.trim();
            })()}
          >
            {soldeLoading ? <CircularProgress size={20} /> : 'Confirmer et terminer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog raison écart acompte - Événements */}
      <Dialog open={depositReasonDialogOpen} onClose={() => setDepositReasonDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Raison de l'écart sur l'acompte</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            Acompte versé : <strong>{eventForm.deposit_paid !== '' ? formatCurrency(Number(eventForm.deposit_paid)) : '0 FCFA'}</strong> — Total : <strong>{eventForm.price !== '' ? formatCurrency(Number(eventForm.price)) : '0 FCFA'}</strong>
            <br />
            Reste à payer : <strong>{eventForm.price !== '' && eventForm.deposit_paid !== '' ? formatCurrency(Number(eventForm.price) - Number(eventForm.deposit_paid)) : '0 FCFA'}</strong>
          </Alert>
          <TextField
            fullWidth
            label="Raison de l'écart (obligatoire)"
            multiline
            rows={3}
            value={depositReason}
            onChange={(e) => setDepositReason(e.target.value)}
            placeholder="Ex: Le client paiera le solde le jour de l'événement..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositReasonDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={() => doCreateEvent(depositReason)}
            variant="contained"
            color="warning"
            disabled={formLoading || !depositReason.trim()}
          >
            {formLoading ? <CircularProgress size={20} /> : 'Confirmer et créer'}
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
