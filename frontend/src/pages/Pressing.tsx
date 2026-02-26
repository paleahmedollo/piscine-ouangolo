import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Stack, Divider
} from '@mui/material';
import {
  Add as AddIcon, LocalLaundryService as PressingIcon,
  Refresh as RefreshIcon, Edit as EditIcon,
  CheckCircle as PaidIcon, PendingActions as TabIcon,
  OpenInNew as OpenTabIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { pressingApi, tabsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PressingType { id: number; name: string; price: number; is_active: boolean; }
interface PressingOrder { id: number; pressing_type_id: number; customer_name: string; customer_phone: string; quantity: number; amount: number; status: string; payment_method: string; tab_id: number; notes: string; created_at: string; pressingType?: PressingType; }
interface OpenTab { id: number; customer_name: string; total_amount: number; status: string; }
interface Stats { today: { total_commandes: number; total_cash: number; tab_count: number }; by_type: { name: string; nb_commandes: number; total: number }[]; }

const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';

const Pressing: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePrix = hasPermission('pressing', 'gestion_prix');
  const [tab, setTab] = useState(0);
  const [pressingTypes, setPressingTypes] = useState<PressingType[]>([]);
  const [orders, setOrders] = useState<PressingOrder[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Dialog states
  const [orderDialog, setOrderDialog] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState<PressingType | null>(null);
  const [tabDialog, setTabDialog] = useState(false);
  const [payOrderDialog, setPayOrderDialog] = useState<PressingOrder | null>(null);
  const [payOrderMethod, setPayOrderMethod] = useState('especes');
  const [receiptDialog, setReceiptDialog] = useState<PressingOrder | null>(null);

  // Forms
  const [orderForm, setOrderForm] = useState({ pressing_type_id: '', customer_name: '', customer_phone: '', quantity: '1', payment_method: 'especes', tab_id: '' });
  const [typeForm, setTypeForm] = useState({ name: '', price: '' });
  const [tabForm, setTabForm] = useState({ customer_name: '', customer_info: '' });

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [types, ords, ot, st] = await Promise.all([
        pressingApi.getAllTypes(),
        pressingApi.getOrders({ date: new Date().toISOString().split('T')[0] }),
        tabsApi.getOpenTabs({ service_type: 'pressing' }),
        pressingApi.getStats()
      ]);
      setPressingTypes(types.data.data || types.data || []);
      setOrders(ords.data.data || ords.data || []);
      setOpenTabs(ot.data.data || ot.data || []);
      setStats(st.data.data || st.data || null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      showAlert('error', err?.response?.data?.message || err?.message || 'Erreur chargement données Pressing');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreateOrder = async () => {
    if (!orderForm.pressing_type_id) return showAlert('error', 'Sélectionnez un type de service');
    if (!orderForm.customer_name) return showAlert('error', 'Nom du client requis');
    try {
      const payload: any = {
        pressing_type_id: parseInt(orderForm.pressing_type_id),
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        quantity: parseInt(orderForm.quantity) || 1
      };
      if (orderForm.payment_method === 'onglet' && orderForm.tab_id) {
        payload.tab_id = parseInt(orderForm.tab_id);
      } else {
        payload.payment_method = orderForm.payment_method;
      }
      const res = await pressingApi.createOrder(payload);
      showAlert('success', res.data.message || 'Commande enregistrée');
      setOrderDialog(false);
      setOrderForm({ pressing_type_id: '', customer_name: '', customer_phone: '', quantity: '1', payment_method: 'especes', tab_id: '' });
      loadAll();
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Erreur');
    }
  };

  const selectedType = pressingTypes.find(t => t.id === parseInt(orderForm.pressing_type_id));
  const totalAmount = selectedType ? parseFloat(selectedType.price as any) * (parseInt(orderForm.quantity) || 1) : 0;

  const handleCreateType = async () => {
    if (!typeForm.name || !typeForm.price) return showAlert('error', 'Nom et prix requis');
    try {
      await pressingApi.createType({ name: typeForm.name, price: parseFloat(typeForm.price) });
      showAlert('success', 'Type créé');
      setTypeDialog(false);
      setTypeForm({ name: '', price: '' });
      loadAll();
    } catch (err: any) { showAlert('error', err?.response?.data?.message || 'Erreur'); }
  };

  const handleUpdateType = async () => {
    if (!editTypeDialog) return;
    try {
      await pressingApi.updateType(editTypeDialog.id, { name: editTypeDialog.name, price: editTypeDialog.price, is_active: editTypeDialog.is_active });
      showAlert('success', 'Type mis à jour');
      setEditTypeDialog(null);
      loadAll();
    } catch (err: any) { showAlert('error', err?.response?.data?.message || 'Erreur'); }
  };

  const handleCreateTab = async () => {
    if (!tabForm.customer_name) return showAlert('error', 'Nom requis');
    try {
      await tabsApi.createTab({ customer_name: tabForm.customer_name, customer_info: tabForm.customer_info, service_type: 'pressing' });
      showAlert('success', 'Onglet créé');
      setTabDialog(false);
      setTabForm({ customer_name: '', customer_info: '' });
      loadAll();
    } catch (err: any) { showAlert('error', err?.response?.data?.message || 'Erreur'); }
  };

  const handlePayOrder = async () => {
    if (!payOrderDialog) return;
    try {
      const res = await pressingApi.payOrder(payOrderDialog.id, { payment_method: payOrderMethod });
      const paidOrder: PressingOrder = { ...payOrderDialog, ...res.data.data, payment_method: payOrderMethod, status: 'paye' };
      setReceiptDialog(paidOrder);
      setPayOrderDialog(null);
      setPayOrderMethod('especes');
      showAlert('success', res.data.message || 'Paiement confirmé');
      loadAll();
    } catch (err: any) { showAlert('error', err?.response?.data?.message || 'Erreur'); }
  };

  return (
    <Layout title="Pressing / Repassage">
      {alert && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Commandes du jour', value: stats.today?.total_commandes || 0, color: '#795548' },
            { label: 'Recette du jour', value: fmt(stats.today?.total_cash || 0), color: '#4caf50' },
            { label: 'En onglet', value: stats.today?.tab_count || 0, color: '#ff9800' },
            { label: 'Types actifs', value: pressingTypes.length, color: '#9c27b0' }
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ borderLeft: `4px solid ${s.color}` }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h5" fontWeight="bold" color={s.color}>{s.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOrderDialog(true)} sx={{ bgcolor: '#795548', '&:hover': { bgcolor: '#5d4037' } }}>
          Nouvelle Commande
        </Button>
        <Button variant="outlined" startIcon={<OpenTabIcon />} onClick={() => setTabDialog(true)}>
          Nouvel Onglet
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
          Actualiser
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Commandes du jour (${orders.length})`} />
        <Tab label={`Onglets ouverts (${openTabs.length})`} />
        {canManagePrix && <Tab label="Gestion des types" />}
      </Tabs>

      {/* Tab 0: Commandes du jour */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#795548' }}>
                {['#', 'Client', 'Service', 'Qté', 'Montant', 'Paiement', 'Statut', 'Heure'].map(h => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id} hover>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{o.customer_name}</Typography>
                    {o.customer_phone && <Typography variant="caption" color="text.secondary">{o.customer_phone}</Typography>}
                  </TableCell>
                  <TableCell>{o.pressingType?.name || '—'}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell><Typography fontWeight="bold">{fmt(o.amount)}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small" label={o.payment_method || 'espèces'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {o.status === 'paye' ? (
                      <Chip size="small" icon={<PaidIcon />} label="Payé" color="success" />
                    ) : o.status === 'en_attente' ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip size="small" label="En attente" color="warning" variant="outlined" />
                        <Button size="small" variant="contained" color="success"
                          sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.7rem' }}
                          onClick={() => { setPayOrderDialog(o); setPayOrderMethod('especes'); }}>
                          Encaisser
                        </Button>
                      </Stack>
                    ) : (
                      <Chip size="small" icon={<TabIcon />} label="Onglet" color="warning" />
                    )}
                  </TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">Aucune commande aujourd'hui</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Onglets ouverts */}
      {tab === 1 && (
        <Grid container spacing={2}>
          {openTabs.map(t => (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card sx={{ border: '2px solid #ff9800' }}>
                <CardContent>
                  <Typography fontWeight="bold">{t.customer_name}</Typography>
                  <Typography variant="h6" color="warning.main">{fmt(t.total_amount)}</Typography>
                  <Chip size="small" label="Ouvert" color="warning" />
                </CardContent>
              </Card>
            </Grid>
          ))}
          {openTabs.length === 0 && <Grid item xs={12}><Alert severity="info">Aucun onglet ouvert</Alert></Grid>}
        </Grid>
      )}

      {/* Tab 2: Types de pressing (admin/gérant seulement) */}
      {tab === 2 && canManagePrix && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTypeDialog(true)} sx={{ bgcolor: '#795548' }}>
              Ajouter un type
            </Button>
          </Box>
          <Grid container spacing={2}>
            {pressingTypes.map(type => (
              <Grid item xs={12} sm={6} md={4} key={type.id}>
                <Card sx={{ opacity: type.is_active ? 1 : 0.5 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight="bold">{type.name}</Typography>
                        <Typography variant="h6" color="#795548">{fmt(type.price)}</Typography>
                        <Chip size="small" label={type.is_active ? 'Actif' : 'Désactivé'} color={type.is_active ? 'success' : 'default'} />
                      </Box>
                      <IconButton onClick={() => setEditTypeDialog({ ...type })} color="primary"><EditIcon /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dialog: Nouvelle commande */}
      <Dialog open={orderDialog} onClose={() => setOrderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#795548', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PressingIcon /> Nouvelle Commande
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Nom du client *" value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} fullWidth />
            <TextField label="Téléphone" value={orderForm.customer_phone} onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Type de service *</InputLabel>
              <Select value={orderForm.pressing_type_id} onChange={e => setOrderForm(f => ({ ...f, pressing_type_id: String(e.target.value) }))} label="Type de service *">
                {pressingTypes.filter(t => t.is_active).map(t => (
                  <MenuItem key={t.id} value={String(t.id)}>{t.name} — {fmt(t.price)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Quantité" type="number" value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))} inputProps={{ min: 1 }} fullWidth />
            {totalAmount > 0 && (
              <Alert severity="info">
                <strong>Total: {fmt(totalAmount)}</strong>
              </Alert>
            )}
            <FormControl fullWidth>
              <InputLabel>Mode de paiement</InputLabel>
              <Select value={orderForm.payment_method} onChange={e => setOrderForm(f => ({ ...f, payment_method: e.target.value }))} label="Mode de paiement">
                <MenuItem value="especes">Espèces</MenuItem>
                <MenuItem value="mobile">Mobile Money</MenuItem>
                <MenuItem value="onglet">Onglet client</MenuItem>
                <MenuItem value="en_attente">🎫 Ticket — payer à la livraison</MenuItem>
              </Select>
            </FormControl>
            {orderForm.payment_method === 'en_attente' && (
              <Alert severity="info" sx={{ py: 0.5 }}>Un ticket sera ouvert. Le client paiera lors de la récupération des vêtements.</Alert>
            )}
            {orderForm.payment_method === 'onglet' && (
              <FormControl fullWidth>
                <InputLabel>Onglet client</InputLabel>
                <Select value={orderForm.tab_id} onChange={e => setOrderForm(f => ({ ...f, tab_id: e.target.value as string }))} label="Onglet client">
                  {openTabs.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.customer_name} — {fmt(t.total_amount)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateOrder} sx={{ bgcolor: '#795548' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Créer onglet */}
      <Dialog open={tabDialog} onClose={() => setTabDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvel onglet client</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Nom du client *" value={tabForm.customer_name} onChange={e => setTabForm(f => ({ ...f, customer_name: e.target.value }))} fullWidth />
            <TextField label="Info (téléphone...)" value={tabForm.customer_info} onChange={e => setTabForm(f => ({ ...f, customer_info: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTabDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateTab}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Nouveau type */}
      <Dialog open={typeDialog} onClose={() => setTypeDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau type de pressing</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Nom *" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="Prix (FCFA) *" type="number" value={typeForm.price} onChange={e => setTypeForm(f => ({ ...f, price: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateType} sx={{ bgcolor: '#795548' }}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Payer une commande en attente */}
      <Dialog open={!!payOrderDialog} onClose={() => setPayOrderDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#795548', color: 'white' }}>💳 Encaisser la commande</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {payOrderDialog && (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                Client: <strong>{payOrderDialog.customer_name}</strong>
                {payOrderDialog.customer_phone && <><br />{payOrderDialog.customer_phone}</>}<br />
                Service: <strong>{payOrderDialog.pressingType?.name || '—'}</strong> × {payOrderDialog.quantity}<br />
                Montant: <strong>{fmt(payOrderDialog.amount)}</strong>
              </Alert>
              <FormControl fullWidth required>
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={payOrderMethod} label="Mode de paiement" onChange={e => setPayOrderMethod(e.target.value)}>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="mobile">Mobile Money</MenuItem>
                  <MenuItem value="carte">Carte bancaire</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOrderDialog(null)}>Annuler</Button>
          <Button variant="contained" onClick={handlePayOrder} sx={{ bgcolor: '#795548' }}>
            Confirmer — {payOrderDialog && fmt(payOrderDialog.amount)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Reçu pressing */}
      <Dialog open={!!receiptDialog} onClose={() => setReceiptDialog(null)} maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#795548', color: 'white', textAlign: 'center' }}>✅ Reçu — Pressing</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {receiptDialog && (
            <Stack spacing={1.5} alignItems="center">
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 2 }}>PRESSING</Typography>
              <Divider sx={{ width: '100%' }} />
              <Typography>Client: <strong>{receiptDialog.customer_name}</strong></Typography>
              {receiptDialog.customer_phone && <Typography variant="caption">{receiptDialog.customer_phone}</Typography>}
              <Typography>Service: <strong>{receiptDialog.pressingType?.name || '—'}</strong></Typography>
              <Typography>Quantité: {receiptDialog.quantity}</Typography>
              <Divider sx={{ width: '100%' }} />
              <Typography variant="h4" color="#795548" fontWeight={700}>{fmt(receiptDialog.amount)}</Typography>
              <Chip label={receiptDialog.payment_method === 'especes' ? 'Espèces' : receiptDialog.payment_method === 'mobile' ? 'Mobile Money' : 'Carte'} size="small" />
              <Typography variant="caption" color="text.secondary">{new Date().toLocaleString('fr-FR')}</Typography>
              <Divider sx={{ width: '100%' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Merci de votre confiance !</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
          <Button variant="outlined" onClick={() => window.print()}>Imprimer</Button>
          <Button variant="contained" sx={{ bgcolor: '#795548' }} onClick={() => setReceiptDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Modifier type */}
      {editTypeDialog && (
        <Dialog open={true} onClose={() => setEditTypeDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Modifier le type</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField label="Nom" value={editTypeDialog.name} onChange={e => setEditTypeDialog(d => d ? { ...d, name: e.target.value } : null)} fullWidth />
              <TextField label="Prix (FCFA)" type="number" value={editTypeDialog.price} onChange={e => setEditTypeDialog(d => d ? { ...d, price: parseFloat(e.target.value) } : null)} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={editTypeDialog.is_active ? 'actif' : 'inactif'} onChange={e => setEditTypeDialog(d => d ? { ...d, is_active: e.target.value === 'actif' } : null)} label="Statut">
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="inactif">Désactivé</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTypeDialog(null)}>Annuler</Button>
            <Button variant="contained" onClick={handleUpdateType}>Enregistrer</Button>
          </DialogActions>
        </Dialog>
      )}
    </Layout>
  );
};

export default Pressing;
