import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Tooltip, Badge,
  Divider, Stack, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon, LocalCarWash as WashIcon, DirectionsCar as CarIcon,
  Refresh as RefreshIcon, Close as CloseIcon, Edit as EditIcon,
  Delete as DeleteIcon, Receipt as ReceiptIcon, OpenInNew as OpenTabIcon,
  CheckCircle as PaidIcon, PendingActions as TabIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { lavageApi, tabsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface VehicleType { id: number; name: string; price: number; is_active: boolean; }
interface CarWash { id: number; vehicle_type_id: number; plate_number: string; customer_name: string; customer_phone?: string; amount: number; status: string; tab_id: number; payment_method?: string; created_at: string; updated_at?: string; vehicleType?: VehicleType; }
interface CustomerTab { id: number; customer_name: string; customer_info: string; status: string; total_amount: number; items: TabItem[]; created_at: string; }
interface TabItem { id: number; service_type: string; item_name: string; quantity: number; unit_price: number; subtotal: number; }
interface Stats { today: { total_lavages: number; total_cash: number; tab_count: number }; by_vehicle: { name: string; price: number; nb_lavages: number; total: number }[]; }

const fmt = (n: number) => n?.toLocaleString('fr-FR') + ' FCFA';

const LavageAuto: React.FC = () => {
  const { } = useAuth(); // permissions available
  // const canManage = hasPermission('lavage', 'gestion');
  const [tab, setTab] = useState(0);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [carWashes, setCarWashes] = useState<CarWash[]>([]);
  const [openTabs, setOpenTabs] = useState<CustomerTab[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Dialog states
  const [washDialog, setWashDialog] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);
  const [tabDialog, setTabDialog] = useState(false);
  const [closeTabDialog, setCloseTabDialog] = useState<CustomerTab | null>(null);
  const [editTypeDialog, setEditTypeDialog] = useState<VehicleType | null>(null);
  const [payWashDialog, setPayWashDialog] = useState<CarWash | null>(null);
  const [payWashMethod, setPayWashMethod] = useState('especes');
  const [receiptDialog, setReceiptDialog] = useState<CarWash | null>(null);

  // Forms
  const [washForm, setWashForm] = useState({ vehicle_type_id: '', plate_number: '', customer_name: '', customer_phone: '', payment_method: 'especes', tab_id: '' });
  const [typeForm, setTypeForm] = useState({ name: '', price: '' });
  const [tabForm, setTabForm] = useState({ customer_name: '', customer_info: '' });
  const [closePayment, setClosePayment] = useState({ payment_method: 'especes', payment_operator: '', payment_reference: '' });

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vt, w, ot, st] = await Promise.all([
        lavageApi.getVehicleTypes(),
        lavageApi.getCarWashes({ date: new Date().toISOString().split('T')[0] }),
        tabsApi.getOpenTabs({ service_type: 'lavage' }),
        lavageApi.getStats()
      ]);
      setVehicleTypes(vt.data.data || []);
      setCarWashes(w.data.data || []);
      setOpenTabs(ot.data.data || []);
      setStats(st.data.data || null);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreateWash = async () => {
    if (!washForm.vehicle_type_id) return showAlert('error', 'Sélectionnez un type de véhicule');
    try {
      await lavageApi.createCarWash({
        vehicle_type_id: parseInt(washForm.vehicle_type_id),
        plate_number: washForm.plate_number,
        customer_name: washForm.customer_name,
        customer_phone: washForm.customer_phone,
        payment_method: washForm.payment_method,
        tab_id: washForm.tab_id ? parseInt(washForm.tab_id) : undefined
      });
      showAlert('success', 'Lavage enregistré !');
      setWashDialog(false);
      setWashForm({ vehicle_type_id: '', plate_number: '', customer_name: '', customer_phone: '', payment_method: 'especes', tab_id: '' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleCreateType = async () => {
    if (!typeForm.name || !typeForm.price) return showAlert('error', 'Nom et prix requis');
    try {
      if (editTypeDialog) {
        await lavageApi.updateVehicleType(editTypeDialog.id, { name: typeForm.name, price: parseFloat(typeForm.price) });
        showAlert('success', 'Type mis à jour');
      } else {
        await lavageApi.createVehicleType({ name: typeForm.name, price: parseFloat(typeForm.price) });
        showAlert('success', 'Type créé');
      }
      setTypeDialog(false);
      setEditTypeDialog(null);
      setTypeForm({ name: '', price: '' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleCreateTab = async () => {
    if (!tabForm.customer_name) return showAlert('error', 'Nom du client requis');
    try {
      await tabsApi.createTab({ ...tabForm, service_type: 'lavage' });
      showAlert('success', `Onglet ouvert pour ${tabForm.customer_name}`);
      setTabDialog(false);
      setTabForm({ customer_name: '', customer_info: '' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleCloseTab = async () => {
    if (!closeTabDialog || !closePayment.payment_method) return;
    try {
      await tabsApi.closeTab(closeTabDialog.id, closePayment);
      showAlert('success', `Onglet fermé — ${fmt(closeTabDialog.total_amount)}`);
      setCloseTabDialog(null);
      setClosePayment({ payment_method: 'especes', payment_operator: '', payment_reference: '' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteType = async (id: number) => {
    try {
      await lavageApi.deleteVehicleType(id);
      showAlert('success', 'Type désactivé');
      loadAll();
    } catch { showAlert('error', 'Erreur'); }
  };

  const handlePayWash = async () => {
    if (!payWashDialog) return;
    try {
      const res = await lavageApi.payWash(payWashDialog.id, { payment_method: payWashMethod });
      const paidWash: CarWash = { ...payWashDialog, ...res.data.data, payment_method: payWashMethod };
      setReceiptDialog(paidWash);
      setPayWashDialog(null);
      setPayWashMethod('especes');
      showAlert('success', res.data.message || 'Paiement confirmé');
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const selectedVehicle = vehicleTypes.find(v => v.id === parseInt(washForm.vehicle_type_id));

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WashIcon color="primary" /> Lavage Auto
            </Typography>
            <Typography variant="body2" color="text.secondary">Gestion des lavages de véhicules</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Actualiser'}
            </Button>
            <Button variant="outlined" color="secondary" startIcon={<OpenTabIcon />} onClick={() => setTabDialog(true)}>
              Ouvrir un onglet
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setWashDialog(true)}>
              Nouveau lavage
            </Button>
          </Stack>
        </Box>

        {/* Stats */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #1565c0' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Lavages aujourd'hui</Typography>
                  <Typography variant="h5" fontWeight={700} color="primary">{stats.today?.total_lavages || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Recettes du jour</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{fmt(stats.today?.total_cash || 0)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #f57c00' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">En onglet</Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">{stats.today?.tab_count || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #7b1fa2' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Onglets ouverts</Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary.main">{openTabs.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Lavages du jour" />
          <Tab label={<Badge badgeContent={openTabs.length} color="warning">Onglets ouverts</Badge>} />
          <Tab label="Types de véhicules" />
          <Tab label="Historique" />
        </Tabs>

        {/* Tab 0: Lavages du jour */}
        {tab === 0 && (
          <Box>
            {stats?.by_vehicle && stats.by_vehicle.length > 0 && (
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {stats.by_vehicle.map((v) => (
                  <Grid item xs={6} sm={4} md={2.4} key={v.name}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                      <CarIcon color={parseInt(String(v.nb_lavages)) > 0 ? 'primary' : 'disabled'} />
                      <Typography variant="body2" fontWeight={600}>{v.name}</Typography>
                      <Typography variant="h6" fontWeight={700} color="primary">{v.nb_lavages || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">{fmt(v.price)}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>Heure</TableCell>
                    <TableCell>Véhicule</TableCell>
                    <TableCell>Plaque</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Montant</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carWashes.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun lavage aujourd'hui</TableCell></TableRow>
                  )}
                  {carWashes.map(w => (
                    <TableRow key={w.id} hover sx={{ bgcolor: w.status === 'en_attente' ? 'warning.50' : 'inherit' }}>
                      <TableCell>{new Date(w.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{w.vehicleType?.name || '—'}</TableCell>
                      <TableCell><Chip label={w.plate_number || '—'} size="small" variant="outlined" /></TableCell>
                      <TableCell>{w.customer_name || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(w.amount)}</TableCell>
                      <TableCell>
                        {w.status === 'paye' ? (
                          <Chip icon={<PaidIcon />} label="Payé" color="success" size="small" />
                        ) : w.status === 'en_attente' ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip label="En attente" color="warning" size="small" variant="outlined" />
                            <Button size="small" variant="contained" color="success"
                              sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.7rem' }}
                              onClick={() => { setPayWashDialog(w); setPayWashMethod('especes'); }}>
                              Payer
                            </Button>
                          </Stack>
                        ) : (
                          <Chip icon={<TabIcon />} label="Onglet" color="warning" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: Onglets ouverts */}
        {tab === 1 && (
          <Grid container spacing={2}>
            {openTabs.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <TabIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography>Aucun onglet ouvert</Typography>
                  <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setTabDialog(true)}>Ouvrir un onglet</Button>
                </Paper>
              </Grid>
            )}
            {openTabs.map(t => (
              <Grid item xs={12} sm={6} md={4} key={t.id}>
                <Card variant="outlined" sx={{ borderColor: 'warning.main' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography fontWeight={700}>{t.customer_name}</Typography>
                      <Chip label="Ouvert" color="warning" size="small" />
                    </Box>
                    {t.customer_info && <Typography variant="caption" color="text.secondary">{t.customer_info}</Typography>}
                    <Divider sx={{ my: 1 }} />
                    {t.items?.map(item => (
                      <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
                        <Typography variant="caption">
                          <Chip label={item.service_type} size="small" sx={{ mr: 0.5, height: 16, fontSize: '0.6rem' }} />
                          {item.item_name} × {item.quantity}
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>{fmt(item.subtotal)}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={700} color="primary">Total: {fmt(t.total_amount)}</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Ajouter lavage à cet onglet">
                          <IconButton size="small" color="primary" onClick={() => { setWashForm(f => ({ ...f, tab_id: String(t.id) })); setWashDialog(true); }}>
                            <WashIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Fermer et encaisser">
                          <IconButton size="small" color="success" onClick={() => setCloseTabDialog(t)}>
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Ouvert à {new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tab 2: Types de véhicules */}
        {tab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setTypeForm({ name: '', price: '' }); setEditTypeDialog(null); setTypeDialog(true); }}>
                Nouveau type
              </Button>
            </Box>
            <Grid container spacing={2}>
              {vehicleTypes.map(v => (
                <Grid item xs={6} sm={4} md={3} key={v.id}>
                  <Card variant="outlined" sx={{ opacity: v.is_active ? 1 : 0.5 }}>
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <CarIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography fontWeight={700}>{v.name}</Typography>
                      <Typography variant="h6" color="primary" fontWeight={700}>{fmt(v.price)}</Typography>
                      {!v.is_active && <Chip label="Désactivé" size="small" color="default" sx={{ mt: 0.5 }} />}
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => { setEditTypeDialog(v); setTypeForm({ name: v.name, price: String(v.price) }); setTypeDialog(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteType(v.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Tab 3: Historique */}
        {tab === 3 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell>Date/Heure</TableCell>
                  <TableCell>Véhicule</TableCell>
                  <TableCell>Plaque</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {carWashes.map(w => (
                  <TableRow key={w.id} hover>
                    <TableCell>{new Date(w.created_at).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{w.vehicleType?.name || '—'}</TableCell>
                    <TableCell>{w.plate_number || '—'}</TableCell>
                    <TableCell>{w.customer_name || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(w.amount)}</TableCell>
                    <TableCell>
                      <Chip label={w.status === 'paye' ? 'Payé' : 'Onglet'} color={w.status === 'paye' ? 'success' : 'warning'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dialog: Nouveau lavage */}
      <Dialog open={washDialog} onClose={() => { setWashDialog(false); setWashForm(f => ({ ...f, tab_id: '' })); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>🚿 Enregistrer un lavage</span>
          <IconButton size="small" onClick={() => setWashDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Type de véhicule</InputLabel>
              <Select value={washForm.vehicle_type_id} label="Type de véhicule" onChange={e => setWashForm(f => ({ ...f, vehicle_type_id: e.target.value }))}>
                {vehicleTypes.filter(v => v.is_active).map(v => (
                  <MenuItem key={v.id} value={v.id}>{v.name} — {fmt(v.price)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedVehicle && (
              <Alert severity="info">Prix: <strong>{fmt(selectedVehicle.price)}</strong></Alert>
            )}
            <TextField label="Numéro de plaque" value={washForm.plate_number} onChange={e => setWashForm(f => ({ ...f, plate_number: e.target.value }))} />
            <TextField label="Nom du client" value={washForm.customer_name} onChange={e => setWashForm(f => ({ ...f, customer_name: e.target.value }))} />
            <TextField label="Téléphone" value={washForm.customer_phone} onChange={e => setWashForm(f => ({ ...f, customer_phone: e.target.value }))} />

            <FormControl fullWidth>
              <InputLabel>Onglet client (optionnel)</InputLabel>
              <Select value={washForm.tab_id} label="Onglet client (optionnel)" onChange={e => setWashForm(f => ({ ...f, tab_id: e.target.value }))}>
                <MenuItem value="">Paiement direct</MenuItem>
                {openTabs.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.customer_name} ({fmt(t.total_amount)} en cours)</MenuItem>
                ))}
              </Select>
            </FormControl>

            {!washForm.tab_id && (
              <FormControl fullWidth>
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={washForm.payment_method} label="Mode de paiement" onChange={e => setWashForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="carte">Carte bancaire</MenuItem>
                  <MenuItem value="en_attente">🎫 Ticket — payer plus tard</MenuItem>
                </Select>
              </FormControl>
            )}
            {washForm.payment_method === 'en_attente' && (
              <Alert severity="info" sx={{ py: 0.5 }}>Un ticket sera créé. Le client paiera à la fin du lavage.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWashDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateWash} startIcon={<WashIcon />}>
            {washForm.tab_id ? 'Ajouter à l\'onglet' : washForm.payment_method === 'en_attente' ? '🎫 Ouvrir le ticket' : 'Encaisser'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Type de véhicule */}
      <Dialog open={typeDialog} onClose={() => setTypeDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editTypeDialog ? 'Modifier' : 'Nouveau type de véhicule'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} required />
            <TextField label="Prix (FCFA)" type="number" value={typeForm.price} onChange={e => setTypeForm(f => ({ ...f, price: e.target.value }))} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateType}>{editTypeDialog ? 'Modifier' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ouvrir onglet */}
      <Dialog open={tabDialog} onClose={() => setTabDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ouvrir un onglet client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom du client *" value={tabForm.customer_name} onChange={e => setTabForm(f => ({ ...f, customer_name: e.target.value }))} required />
            <TextField label="Info (plaque / téléphone)" value={tabForm.customer_info} onChange={e => setTabForm(f => ({ ...f, customer_info: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTabDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateTab}>Ouvrir l'onglet</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Payer un lavage en attente */}
      <Dialog open={!!payWashDialog} onClose={() => setPayWashDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          💳 Encaisser le lavage
        </DialogTitle>
        <DialogContent>
          {payWashDialog && (
            <Stack spacing={2} sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                <strong>{payWashDialog.vehicleType?.name || '—'}</strong>
                {payWashDialog.plate_number ? ` — Plaque: ${payWashDialog.plate_number}` : ''}<br />
                {payWashDialog.customer_name ? `Client: ${payWashDialog.customer_name}` : 'Client anonyme'}<br />
                Montant: <strong>{fmt(payWashDialog.amount)}</strong>
              </Alert>
              <FormControl fullWidth required>
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={payWashMethod} label="Mode de paiement" onChange={e => setPayWashMethod(e.target.value)}>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="carte">Carte bancaire</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayWashDialog(null)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handlePayWash} startIcon={<PaidIcon />}>
            Confirmer — {payWashDialog && fmt(payWashDialog.amount)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Reçu de paiement */}
      <Dialog open={!!receiptDialog} onClose={() => setReceiptDialog(null)} maxWidth="xs">
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white', textAlign: 'center' }}>
          ✅ Reçu de paiement
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {receiptDialog && (
            <Stack spacing={1.5} alignItems="center">
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 2 }}>LAVAGE AUTO</Typography>
              <Divider sx={{ width: '100%' }} />
              <Typography>Type: <strong>{receiptDialog.vehicleType?.name || '—'}</strong></Typography>
              {receiptDialog.plate_number && <Typography>Plaque: <strong>{receiptDialog.plate_number}</strong></Typography>}
              {receiptDialog.customer_name && <Typography>Client: {receiptDialog.customer_name}</Typography>}
              <Divider sx={{ width: '100%' }} />
              <Typography variant="h4" color="success.main" fontWeight={700}>{fmt(receiptDialog.amount)}</Typography>
              <Chip
                label={receiptDialog.payment_method === 'especes' ? 'Espèces' : receiptDialog.payment_method === 'mobile_money' ? 'Mobile Money' : 'Carte'}
                color="success" size="small"
              />
              <Typography variant="caption" color="text.secondary">
                {new Date().toLocaleString('fr-FR')}
              </Typography>
              <Divider sx={{ width: '100%' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Merci de votre visite !</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
          <Button variant="outlined" startIcon={<ReceiptIcon />} onClick={() => window.print()}>Imprimer</Button>
          <Button variant="contained" onClick={() => setReceiptDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Fermer onglet */}
      <Dialog open={!!closeTabDialog} onClose={() => setCloseTabDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Fermer l'onglet — {closeTabDialog?.customer_name}</DialogTitle>
        <DialogContent>
          {closeTabDialog && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {closeTabDialog.items?.map(item => (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">
                      <Chip label={item.service_type} size="small" sx={{ mr: 0.5 }} />
                      {item.item_name} × {item.quantity}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(item.subtotal)}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700}>TOTAL</Typography>
                  <Typography fontWeight={700} color="primary" variant="h6">{fmt(closeTabDialog.total_amount)}</Typography>
                </Box>
              </Paper>
              <FormControl fullWidth required>
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={closePayment.payment_method} label="Mode de paiement" onChange={e => setClosePayment(p => ({ ...p, payment_method: e.target.value }))}>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="carte">Carte bancaire</MenuItem>
                </Select>
              </FormControl>
              {closePayment.payment_method === 'mobile_money' && (
                <>
                  <TextField label="Opérateur" value={closePayment.payment_operator} onChange={e => setClosePayment(p => ({ ...p, payment_operator: e.target.value }))} />
                  <TextField label="Référence" value={closePayment.payment_reference} onChange={e => setClosePayment(p => ({ ...p, payment_reference: e.target.value }))} />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseTabDialog(null)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleCloseTab} startIcon={<ReceiptIcon />}>
            Encaisser {closeTabDialog && fmt(closeTabDialog.total_amount)}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default LavageAuto;
