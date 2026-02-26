import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  IconButton, Alert, Tabs, Tab, Divider,
  CircularProgress, Tooltip, InputAdornment, Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Warehouse as DepotIcon,
  People as ClientsIcon,
  Inventory as StockIcon,
  History as HistoryIcon,
  CreditCard as CreditIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { depotApi } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

interface DepotClient {
  id: number;
  name: string;
  phone: string;
  address: string;
  credit_balance: number;
  notes: string;
  is_active: boolean;
}

interface DepotProduct {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  unit: string;
  description?: string;
  is_active: boolean;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface DepotSale {
  id: number;
  depot_client_id: number;
  client_name: string;
  total_amount: number;
  payment_method: string;
  user_name: string;
  notes: string;
  created_at: string;
  items?: SaleItem[];
}

interface DepotStats {
  aujourd_hui: {
    total_ventes: number;
    total_cash: number;
    total_credit: number;
    total_mobile: number;
  };
  total_credit_en_cours: {
    total_en_cours: number;
    nb_clients_en_credit: number;
  };
  mois: {
    total_ventes: number;
    montant: number;
  };
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'credit', label: 'Crédit (Onglet client)' },
  { value: 'mobile', label: 'Mobile Money' }
];

const Depot: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePrix = hasPermission('depot', 'gestion_prix');

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [stats, setStats] = useState<DepotStats | null>(null);
  const [clients, setClients] = useState<DepotClient[]>([]);
  const [products, setProducts] = useState<DepotProduct[]>([]);
  const [sales, setSales] = useState<DepotSale[]>([]);

  // Sale form
  const [openSaleDialog, setOpenSaleDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | ''>('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [salePaymentMethod, setSalePaymentMethod] = useState('cash');
  const [saleNotes, setSaleNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [lastCreatedTab, setLastCreatedTab] = useState<{ id: number; ticket_number: string } | null>(null);

  // Add item to sale
  const [addItemProductId, setAddItemProductId] = useState<number | ''>('');
  const [addItemQty, setAddItemQty] = useState(1);

  // Client form
  const [openClientDialog, setOpenClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<DepotClient | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', address: '', notes: '' });

  // Product form
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DepotProduct | null>(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', unit: 'carton', description: '' });

  // Stock form
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [stockProductId, setStockProductId] = useState<number | ''>('');
  const [stockQty, setStockQty] = useState(1);
  const [stockNote, setStockNote] = useState('');

  // Pay credit
  const [openPayCreditDialog, setOpenPayCreditDialog] = useState(false);
  const [payingClient, setPayingClient] = useState<DepotClient | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, clientsRes, productsRes, salesRes] = await Promise.all([
        depotApi.getStats(),
        depotApi.getClients(),
        depotApi.getProducts(),
        depotApi.getSales()
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data || []);
      setProducts(productsRes.data || []);
      setSales(salesRes.data || []);
    } catch (e: any) {
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const formatCFA = (n: number | undefined) => {
    if (n === undefined || n === null) return '0 FCFA';
    return `${Number(n).toLocaleString('fr-FR')} FCFA`;
  };

  // ── Sale ──────────────────────────────────────────────────────────────────

  const handleAddItem = () => {
    if (!addItemProductId || addItemQty < 1) return;
    const product = products.find(p => p.id === addItemProductId);
    if (!product) return;

    const existing = saleItems.findIndex(i => i.product_id === addItemProductId);
    if (existing >= 0) {
      const updated = [...saleItems];
      updated[existing].quantity += addItemQty;
      updated[existing].subtotal = updated[existing].quantity * updated[existing].unit_price;
      setSaleItems(updated);
    } else {
      setSaleItems([...saleItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: addItemQty,
        unit_price: product.price,
        subtotal: product.price * addItemQty
      }]);
    }
    setAddItemProductId('');
    setAddItemQty(1);
  };

  const handleRemoveItem = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const totalSale = saleItems.reduce((s, i) => s + i.subtotal, 0);

  const handleSubmitSale = async () => {
    if (!selectedClient || saleItems.length === 0) {
      setError('Veuillez sélectionner un client et ajouter au moins un produit');
      return;
    }
    setSubmittingSale(true);
    try {
      const res = await depotApi.createSale({
        depot_client_id: selectedClient,
        items: saleItems,
        payment_method: salePaymentMethod,
        notes: saleNotes
      });
      setSuccess(`Vente enregistrée${res.data.tab ? ` — Ticket crédit #${res.data.tab.ticket_number}` : ''}`);
      if (res.data.tab) setLastCreatedTab(res.data.tab);
      setOpenSaleDialog(false);
      resetSaleForm();
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la vente');
    } finally {
      setSubmittingSale(false);
    }
  };

  const resetSaleForm = () => {
    setSelectedClient('');
    setSaleItems([]);
    setSalePaymentMethod('cash');
    setSaleNotes('');
    setAddItemProductId('');
    setAddItemQty(1);
  };

  // ── Client ────────────────────────────────────────────────────────────────

  const handleSaveClient = async () => {
    if (!clientForm.name.trim()) { setError('Nom du client requis'); return; }
    try {
      if (editingClient) {
        await depotApi.updateClient(editingClient.id, clientForm);
        setSuccess('Client mis à jour');
      } else {
        await depotApi.createClient(clientForm);
        setSuccess('Client créé');
      }
      setOpenClientDialog(false);
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const openEditClient = (c: DepotClient) => {
    setEditingClient(c);
    setClientForm({ name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
    setOpenClientDialog(true);
  };

  const openNewClient = () => {
    setEditingClient(null);
    setClientForm({ name: '', phone: '', address: '', notes: '' });
    setOpenClientDialog(true);
  };

  // ── Product ───────────────────────────────────────────────────────────────

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.price) { setError('Nom et prix requis'); return; }
    const data = { ...productForm, price: parseFloat(productForm.price) };
    try {
      if (editingProduct) {
        await depotApi.updateProduct(editingProduct.id, data);
        setSuccess('Produit mis à jour');
      } else {
        await depotApi.createProduct(data);
        setSuccess('Produit créé');
      }
      setOpenProductDialog(false);
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const openEditProduct = (p: DepotProduct) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, price: String(p.price), unit: p.unit || 'carton', description: p.description || '' });
    setOpenProductDialog(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', unit: 'carton', description: '' });
    setOpenProductDialog(true);
  };

  // ── Stock ─────────────────────────────────────────────────────────────────

  const handleReceiveStock = async () => {
    if (!stockProductId || stockQty < 1) { setError('Produit et quantité requis'); return; }
    try {
      await depotApi.receiveStock({ product_id: stockProductId, quantity: stockQty, notes: stockNote });
      setSuccess('Stock mis à jour');
      setOpenStockDialog(false);
      setStockProductId('');
      setStockQty(1);
      setStockNote('');
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  // ── Pay Credit ────────────────────────────────────────────────────────────

  const handlePayCredit = async () => {
    if (!payingClient || !payAmount) { setError('Montant requis'); return; }
    try {
      await depotApi.payCredit({
        depot_client_id: payingClient.id,
        amount: parseFloat(payAmount),
        payment_method: payMethod
      });
      setSuccess(`Paiement de ${formatCFA(parseFloat(payAmount))} enregistré pour ${payingClient.name}`);
      setOpenPayCreditDialog(false);
      setPayingClient(null);
      setPayAmount('');
      setPayMethod('cash');
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const openPayCredit = (c: DepotClient) => {
    setPayingClient(c);
    setPayAmount(String(c.credit_balance));
    setPayMethod('cash');
    setOpenPayCreditDialog(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DepotIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>Dépôt Boissons</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={loadAll} variant="outlined" size="small">
            Actualiser
          </Button>
          <Button startIcon={<AddIcon />} onClick={() => setOpenSaleDialog(true)} variant="contained" size="small">
            Nouvelle vente
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {lastCreatedTab && (
        <Alert severity="info" onClose={() => setLastCreatedTab(null)} sx={{ mb: 2 }}>
          🎫 Onglet crédit créé — Ticket <strong>#{lastCreatedTab.ticket_number}</strong>
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="body2" color="text.secondary">Ventes du jour</Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                {stats?.aujourd_hui.total_ventes ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cash: {formatCFA(stats?.aujourd_hui.total_cash)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon color="success" />
                <Typography variant="body2" color="text.secondary">Recette du jour</Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }} color="success.main">
                {formatCFA((stats?.aujourd_hui.total_cash ?? 0) + (stats?.aujourd_hui.total_mobile ?? 0))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mobile: {formatCFA(stats?.aujourd_hui.total_mobile)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditIcon color="warning" />
                <Typography variant="body2" color="text.secondary">Crédit du jour</Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }} color="warning.main">
                {formatCFA(stats?.aujourd_hui.total_credit)}
              </Typography>
              <Typography variant="caption" color="text.secondary">livraisons à crédit</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="error" />
                <Typography variant="body2" color="text.secondary">Crédits en cours</Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }} color="error.main">
                {formatCFA(stats?.total_credit_en_cours.total_en_cours)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats?.total_credit_en_cours.nb_clients_en_credit ?? 0} client(s)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<HistoryIcon />} iconPosition="start" label="Ventes du jour" />
          <Tab
            icon={
              <Badge badgeContent={stats?.total_credit_en_cours.nb_clients_en_credit ?? 0} color="error">
                <ClientsIcon />
              </Badge>
            }
            iconPosition="start"
            label="Clients & Crédits"
          />
          <Tab icon={<StockIcon />} iconPosition="start" label="Stock & Produits" />
        </Tabs>
      </Box>

      {/* Tab 0 – Ventes du jour */}
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : sales.length === 0 ? (
          <Alert severity="info">Aucune vente aujourd'hui.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Heure</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Paiement</TableCell>
                  <TableCell>Vendeur</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell><strong>{sale.client_name}</strong></TableCell>
                    <TableCell><strong>{formatCFA(sale.total_amount)}</strong></TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={sale.payment_method === 'cash' ? 'Espèces' : sale.payment_method === 'credit' ? 'Crédit' : 'Mobile'}
                        color={sale.payment_method === 'credit' ? 'warning' : sale.payment_method === 'cash' ? 'success' : 'info'}
                      />
                    </TableCell>
                    <TableCell>{sale.user_name}</TableCell>
                    <TableCell>{sale.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Tab 1 – Clients & Crédits */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={openNewClient}>
            Nouveau client
          </Button>
        </Box>
        {clients.length === 0 ? (
          <Alert severity="info">Aucun client enregistré.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell align="right">Crédit en cours</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id} sx={{ bgcolor: client.credit_balance > 0 ? 'warning.50' : 'inherit' }}>
                    <TableCell>
                      <strong>{client.name}</strong>
                      {!client.is_active && <Chip size="small" label="Inactif" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{client.phone || '—'}</TableCell>
                    <TableCell>{client.address || '—'}</TableCell>
                    <TableCell align="right">
                      {client.credit_balance > 0 ? (
                        <Typography color="error.main" fontWeight={700}>
                          {formatCFA(client.credit_balance)}
                        </Typography>
                      ) : (
                        <Typography color="success.main">0 FCFA</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => openEditClient(client)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {client.credit_balance > 0 && (
                        <Tooltip title="Encaisser le crédit">
                          <IconButton size="small" color="warning" onClick={() => openPayCredit(client)}>
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Tab 2 – Stock & Produits */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 2 }}>
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setOpenStockDialog(true)}>
            Réception stock
          </Button>
          {canManagePrix && (
            <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={openNewProduct}>
              Nouveau produit
            </Button>
          )}
        </Box>
        {products.length === 0 ? (
          <Alert severity="info">Aucun produit enregistré.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell>Unité</TableCell>
                  <TableCell align="right">Prix unitaire</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  {canManagePrix && <TableCell align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id} sx={{ bgcolor: p.stock_quantity <= 5 ? 'error.50' : 'inherit' }}>
                    <TableCell>
                      <strong>{p.name}</strong>
                      {p.stock_quantity <= 5 && (
                        <Chip size="small" label="Stock bas" color="error" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell align="right">{formatCFA(p.price)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={700}
                        color={p.stock_quantity <= 5 ? 'error.main' : p.stock_quantity <= 20 ? 'warning.main' : 'success.main'}
                      >
                        {p.stock_quantity}
                      </Typography>
                    </TableCell>
                    {canManagePrix && (
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openEditProduct(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ── Dialog: Nouvelle vente ─────────────────────────────────────── */}
      <Dialog open={openSaleDialog} onClose={() => { setOpenSaleDialog(false); resetSaleForm(); }} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle vente — Dépôt Boissons</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Client *</InputLabel>
                <Select value={selectedClient} onChange={e => setSelectedClient(e.target.value as number)} label="Client *">
                  {clients.filter(c => c.is_active).map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} {c.credit_balance > 0 && `(crédit: ${formatCFA(c.credit_balance)})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={salePaymentMethod} onChange={e => setSalePaymentMethod(e.target.value)} label="Mode de paiement">
                  {PAYMENT_METHODS.map(m => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {salePaymentMethod === 'credit' && (
              <Grid item xs={12}>
                <Alert severity="warning" icon={<CreditIcon />}>
                  Cette vente sera enregistrée <strong>à crédit</strong> pour le client. Un onglet sera créé automatiquement.
                </Alert>
              </Grid>
            )}

            {/* Ajout de produits */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}><Typography variant="caption">Ajouter des produits</Typography></Divider>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Produit</InputLabel>
                  <Select value={addItemProductId} onChange={e => setAddItemProductId(e.target.value as number)} label="Produit">
                    {products.filter(p => p.is_active && p.stock_quantity > 0).map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} — {formatCFA(p.price)} ({p.stock_quantity} en stock)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  label="Quantité"
                  value={addItemQty}
                  onChange={e => setAddItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  sx={{ width: 100 }}
                />
                <Button variant="outlined" onClick={handleAddItem} disabled={!addItemProductId}>
                  Ajouter
                </Button>
              </Box>
            </Grid>

            {/* Panier */}
            {saleItems.length > 0 && (
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produit</TableCell>
                        <TableCell align="right">Prix unit.</TableCell>
                        <TableCell align="right">Qté</TableCell>
                        <TableCell align="right">Sous-total</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {saleItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">{formatCFA(item.unit_price)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right"><strong>{formatCFA(item.subtotal)}</strong></TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>TOTAL</strong></TableCell>
                        <TableCell align="right">
                          <Typography color="primary.main" fontWeight={700}>{formatCFA(totalSale)}</Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes (optionnel)"
                value={saleNotes}
                onChange={e => setSaleNotes(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenSaleDialog(false); resetSaleForm(); }}>Annuler</Button>
          <Button
            onClick={handleSubmitSale}
            variant="contained"
            disabled={submittingSale || saleItems.length === 0 || !selectedClient}
          >
            {submittingSale ? <CircularProgress size={20} /> : `Valider la vente (${formatCFA(totalSale)})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Client ────────────────────────────────────────────── */}
      <Dialog open={openClientDialog} onClose={() => setOpenClientDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingClient ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nom *"
                value={clientForm.name}
                onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Téléphone"
                value={clientForm.phone}
                onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Adresse"
                value={clientForm.address}
                onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Notes"
                value={clientForm.notes}
                onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}
                multiline rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClientDialog(false)}>Annuler</Button>
          <Button onClick={handleSaveClient} variant="contained">
            {editingClient ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Produit ───────────────────────────────────────────── */}
      <Dialog open={openProductDialog} onClose={() => setOpenProductDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nom du produit *"
                value={productForm.name}
                onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Prix unitaire *" type="number"
                value={productForm.price}
                onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Unité</InputLabel>
                <Select value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} label="Unité">
                  {['carton', 'bouteille', 'casier', 'litre', 'sachet', 'pack', 'fût'].map(u => (
                    <MenuItem key={u} value={u}>{u}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Description (optionnel)"
                value={productForm.description}
                onChange={e => setProductForm({ ...productForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProductDialog(false)}>Annuler</Button>
          <Button onClick={handleSaveProduct} variant="contained">
            {editingProduct ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Réception stock ───────────────────────────────────── */}
      <Dialog open={openStockDialog} onClose={() => setOpenStockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Réception de stock</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Produit *</InputLabel>
                <Select value={stockProductId} onChange={e => setStockProductId(e.target.value as number)} label="Produit *">
                  {products.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Quantité reçue *" type="number"
                value={stockQty}
                onChange={e => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Notes (fournisseur, BL...)"
                value={stockNote}
                onChange={e => setStockNote(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStockDialog(false)}>Annuler</Button>
          <Button onClick={handleReceiveStock} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Encaisser crédit ──────────────────────────────────── */}
      <Dialog open={openPayCreditDialog} onClose={() => setOpenPayCreditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Encaisser le crédit — {payingClient?.name}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Crédit en cours : <strong>{formatCFA(payingClient?.credit_balance ?? 0)}</strong>
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Montant encaissé *" type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={payMethod} onChange={e => setPayMethod(e.target.value)} label="Mode de paiement">
                  <MenuItem value="cash">Espèces</MenuItem>
                  <MenuItem value="mobile">Mobile Money</MenuItem>
                  <MenuItem value="virement">Virement</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayCreditDialog(false)}>Annuler</Button>
          <Button
            onClick={handlePayCredit}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            disabled={!payAmount || parseFloat(payAmount) <= 0}
          >
            Confirmer le paiement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Depot;
