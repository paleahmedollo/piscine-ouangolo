import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Pool as PoolIcon,
  CardMembership as SubscriptionIcon,
  Warning as IncidentIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import PaymentSelector, { PaymentInfo } from '../components/PaymentSelector';
import CameraCapture from '../components/CameraCapture';
import { useAuth } from '../contexts/AuthContext';
import { piscineApi } from '../services/api';
import { Ticket, Subscription, TicketType, SubscriptionType } from '../types';

interface Incident {
  id: number;
  title: string;
  description: string;
  severity: string;
  incident_date: string;
  incident_time?: string;
  location: string;
  persons_involved?: string;
  actions_taken?: string;
  status: string;
  user?: { full_name: string };
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 12 }}>
    {value === index && children}
  </div>
);

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const severityColors: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  mineur: 'default',
  moyen: 'info',
  grave: 'warning',
  critique: 'error'
};

const statusLabels: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Resolu',
  clos: 'Clos'
};

const Piscine: React.FC = () => {
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [prices, setPrices] = useState<{ tickets: Record<string, number>; subscriptions: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Ticket form
  const [ticketType, setTicketType] = useState<TicketType>('adulte');
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({ method: 'especes' });
  const [ticketLoading, setTicketLoading] = useState(false);

  // Subscription dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subForm, setSubForm] = useState({
    client_name: '',
    client_phone: '',
    type: 'mensuel' as SubscriptionType,
    start_date: new Date().toISOString().split('T')[0]
  });
  const [subLoading, setSubLoading] = useState(false);

  // Incident photo
  const [incidentPhoto, setIncidentPhoto] = useState<string | undefined>(undefined);

  // Incident dialog
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    severity: 'mineur',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '',
    location: 'piscine',
    persons_involved: '',
    actions_taken: ''
  });
  const [incidentLoading, setIncidentLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<{
    total_ventes: number;
    total_tickets_adulte: number;
    total_tickets_enfant: number;
    total_montant: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricesRes, ticketsRes, subsRes, statsRes, incidentsRes] = await Promise.all([
        piscineApi.getPrices(),
        piscineApi.getTickets(),
        piscineApi.getSubscriptions({ active_only: 'true' }),
        piscineApi.getTicketStats(),
        piscineApi.getIncidents()
      ]);
      setPrices(pricesRes.data.data);
      setTickets(ticketsRes.data.data.tickets);
      setSubscriptions(subsRes.data.data.subscriptions);
      setStats(statsRes.data.data);
      setIncidents(incidentsRes.data.data.incidents);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSellTicket = async () => {
    if (!hasPermission('piscine', 'vente_tickets')) {
      setSnackbar({ open: true, message: 'Non autorise', severity: 'error' });
      return;
    }

    try {
      setTicketLoading(true);
      await piscineApi.createTicket({
        type: ticketType,
        quantity: ticketQuantity,
        payment_method: paymentInfo.method,
        payment_operator: paymentInfo.operator,
        payment_reference: paymentInfo.reference
      });
      setSnackbar({ open: true, message: 'Vente enregistree', severity: 'success' });
      setTicketQuantity(1);
      setPaymentInfo({ method: 'especes' });
      fetchData();
    } catch (error) {
      console.error('Error selling ticket:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la vente', severity: 'error' });
    } finally {
      setTicketLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!hasPermission('piscine', 'gestion_abonnements')) {
      setSnackbar({ open: true, message: 'Non autorise', severity: 'error' });
      return;
    }

    try {
      setSubLoading(true);
      await piscineApi.createSubscription(subForm);
      setSnackbar({ open: true, message: 'Abonnement cree', severity: 'success' });
      setSubDialogOpen(false);
      setSubForm({
        client_name: '',
        client_phone: '',
        type: 'mensuel',
        start_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      console.error('Error creating subscription:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la creation', severity: 'error' });
    } finally {
      setSubLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!incidentForm.title || !incidentForm.description) {
      setSnackbar({ open: true, message: 'Veuillez remplir le titre et la description', severity: 'error' });
      return;
    }

    try {
      setIncidentLoading(true);
      await piscineApi.createIncident({
        title: incidentForm.title,
        description: incidentForm.description,
        severity: incidentForm.severity,
        incident_date: incidentForm.incident_date,
        incident_time: incidentForm.incident_time || undefined,
        location: incidentForm.location,
        persons_involved: incidentForm.persons_involved || undefined,
        actions_taken: incidentForm.actions_taken || undefined,
        photo_url: incidentPhoto
      });
      setSnackbar({ open: true, message: 'Incident signale', severity: 'success' });
      setIncidentDialogOpen(false);
      setIncidentPhoto(undefined);
      setIncidentForm({
        title: '',
        description: '',
        severity: 'mineur',
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: '',
        location: 'piscine',
        persons_involved: '',
        actions_taken: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating incident:', error);
      setSnackbar({ open: true, message: 'Erreur lors du signalement', severity: 'error' });
    } finally {
      setIncidentLoading(false);
    }
  };

  const handleUpdateIncidentStatus = async (id: number, status: string) => {
    try {
      await piscineApi.updateIncident(id, { status });
      setSnackbar({ open: true, message: 'Statut mis a jour', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    }
  };

  const getTicketTotal = () => {
    if (!prices) return 0;
    return (prices.tickets[ticketType] || 0) * ticketQuantity;
  };

  if (loading) {
    return (
      <Layout title="Piscine">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Piscine">
      {/* Stats Cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Ventes du jour</Typography>
              <Typography variant="h5" fontWeight="bold">{stats?.total_ventes || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Montant du jour</Typography>
              <Typography variant="h5" fontWeight="bold">{formatCurrency(stats?.total_montant || 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Tickets Adulte</Typography>
              <Typography variant="h5" fontWeight="bold">{stats?.total_tickets_adulte || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">Tickets Enfant</Typography>
              <Typography variant="h5" fontWeight="bold">{stats?.total_tickets_enfant || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<PoolIcon />} label="Vente de Tickets" />
          <Tab icon={<SubscriptionIcon />} label="Abonnements" />
          <Tab icon={<IncidentIcon />} label="Incidents" />
        </Tabs>
      </Box>

      {/* Tickets Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={1.5}>
          {hasPermission('piscine', 'vente_tickets') && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Nouvelle Vente</Typography>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Type de ticket</InputLabel>
                    <Select
                      value={ticketType}
                      label="Type de ticket"
                      onChange={(e) => setTicketType(e.target.value as TicketType)}
                    >
                      <MenuItem value="adulte">Adulte - {formatCurrency(prices?.tickets.adulte || 0)}</MenuItem>
                      <MenuItem value="enfant">Enfant - {formatCurrency(prices?.tickets.enfant || 0)}</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Quantite"
                    type="number"
                    value={ticketQuantity}
                    onChange={(e) => setTicketQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    margin="normal"
                    inputProps={{ min: 1 }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <PaymentSelector
                      value={paymentInfo}
                      onChange={setPaymentInfo}
                      label="Mode de paiement"
                    />
                  </Box>
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="h5" textAlign="center">
                      Total: {formatCurrency(getTicketTotal())}
                    </Typography>
                  </Box>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSellTicket}
                    disabled={ticketLoading}
                    sx={{ mt: 2 }}
                    startIcon={ticketLoading ? <CircularProgress size={20} /> : <AddIcon />}
                  >
                    Enregistrer la vente
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
          <Grid item xs={12} md={hasPermission('piscine', 'vente_tickets') ? 8 : 12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Ventes du jour</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Heure</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Quantite</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Paiement</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            {new Date(ticket.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.type === 'adulte' ? 'Adulte' : 'Enfant'}
                              size="small"
                              color={ticket.type === 'adulte' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{ticket.quantity}</TableCell>
                          <TableCell>{formatCurrency(ticket.total)}</TableCell>
                          <TableCell>{ticket.payment_method}</TableCell>
                        </TableRow>
                      ))}
                      {tickets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">Aucune vente aujourd'hui</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Subscriptions Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          {hasPermission('piscine', 'gestion_abonnements') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSubDialogOpen(true)}>
              Nouvel Abonnement
            </Button>
          )}
        </Box>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Abonnements Actifs</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Telephone</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Debut</TableCell>
                    <TableCell>Fin</TableCell>
                    <TableCell>Prix</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.client_name}</TableCell>
                      <TableCell>{sub.client_phone || '-'}</TableCell>
                      <TableCell><Chip label={sub.type} size="small" /></TableCell>
                      <TableCell>{new Date(sub.start_date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{new Date(sub.end_date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{formatCurrency(sub.price)}</TableCell>
                      <TableCell>
                        <Chip label={sub.is_active ? 'Actif' : 'Expire'} color={sub.is_active ? 'success' : 'default'} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscriptions.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center">Aucun abonnement actif</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Incidents Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="warning" startIcon={<IncidentIcon />} onClick={() => setIncidentDialogOpen(true)}>
            Signaler un Incident
          </Button>
        </Box>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Liste des Incidents</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Titre</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Gravite</strong></TableCell>
                    <TableCell><strong>Lieu</strong></TableCell>
                    <TableCell><strong>Statut</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id} hover>
                      <TableCell>
                        {new Date(incident.incident_date).toLocaleDateString('fr-FR')}
                        {incident.incident_time && ` ${incident.incident_time.slice(0, 5)}`}
                      </TableCell>
                      <TableCell><Typography fontWeight="bold">{incident.title}</Typography></TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>{incident.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.severity}
                          size="small"
                          color={severityColors[incident.severity] || 'default'}
                        />
                      </TableCell>
                      <TableCell>{incident.location}</TableCell>
                      <TableCell>
                        <Chip label={statusLabels[incident.status] || incident.status} size="small" />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={incident.status}
                            onChange={(e) => handleUpdateIncidentStatus(incident.id, e.target.value)}
                          >
                            <MenuItem value="ouvert">Ouvert</MenuItem>
                            <MenuItem value="en_cours">En cours</MenuItem>
                            <MenuItem value="resolu">Resolu</MenuItem>
                            <MenuItem value="clos">Clos</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                  {incidents.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Aucun incident signale</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Subscription Dialog */}
      <Dialog open={subDialogOpen} onClose={() => setSubDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvel Abonnement</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nom du client" value={subForm.client_name} onChange={(e) => setSubForm({ ...subForm, client_name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Telephone" value={subForm.client_phone} onChange={(e) => setSubForm({ ...subForm, client_phone: e.target.value })} margin="normal" />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type d'abonnement</InputLabel>
            <Select value={subForm.type} label="Type d'abonnement" onChange={(e) => setSubForm({ ...subForm, type: e.target.value as SubscriptionType })}>
              <MenuItem value="mensuel">Mensuel - {formatCurrency(prices?.subscriptions.mensuel || 0)}</MenuItem>
              <MenuItem value="trimestriel">Trimestriel - {formatCurrency(prices?.subscriptions.trimestriel || 0)}</MenuItem>
              <MenuItem value="annuel">Annuel - {formatCurrency(prices?.subscriptions.annuel || 0)}</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Date de debut" type="date" value={subForm.start_date} onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })} margin="normal" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateSubscription} variant="contained" disabled={subLoading || !subForm.client_name}>
            {subLoading ? <CircularProgress size={20} /> : 'Creer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog open={incidentDialogOpen} onClose={() => setIncidentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'warning.main' }}>Signaler un Incident</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Titre de l'incident" value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Description detaillee" multiline rows={3} value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} margin="normal" required />
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Gravite</InputLabel>
                <Select value={incidentForm.severity} label="Gravite" onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
                  <MenuItem value="mineur">Mineur</MenuItem>
                  <MenuItem value="moyen">Moyen</MenuItem>
                  <MenuItem value="grave">Grave</MenuItem>
                  <MenuItem value="critique">Critique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Lieu" value={incidentForm.location} onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Date" type="date" value={incidentForm.incident_date} onChange={(e) => setIncidentForm({ ...incidentForm, incident_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Heure" type="time" value={incidentForm.incident_time} onChange={(e) => setIncidentForm({ ...incidentForm, incident_time: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
          <TextField fullWidth label="Personnes impliquees" value={incidentForm.persons_involved} onChange={(e) => setIncidentForm({ ...incidentForm, persons_involved: e.target.value })} margin="normal" placeholder="Noms des personnes concernees" />
          <TextField fullWidth label="Actions prises" multiline rows={2} value={incidentForm.actions_taken} onChange={(e) => setIncidentForm({ ...incidentForm, actions_taken: e.target.value })} margin="normal" placeholder="Mesures prises suite a l'incident" />
          <Box sx={{ mt: 1 }}>
            <CameraCapture
              value={incidentPhoto}
              onChange={setIncidentPhoto}
              label="Photo de la scène (optionnel)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateIncident} variant="contained" color="warning" disabled={incidentLoading || !incidentForm.title || !incidentForm.description}>
            {incidentLoading ? <CircularProgress size={20} /> : 'Signaler'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Layout>
  );
};

export default Piscine;
