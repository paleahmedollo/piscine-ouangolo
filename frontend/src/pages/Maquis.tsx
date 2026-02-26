import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Badge,
  Divider, Stack, CircularProgress, LinearProgress
} from '@mui/material';
import {
  Add as AddIcon, SportsBar as MaquisIcon, Refresh as RefreshIcon,
  Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon,
  LocalShipping as SupplyIcon, Warning as WarnIcon,
  Receipt as ReceiptIcon, LockClock as ClockOutIcon,
  Remove as RemoveIcon, AddCircle as AddCircleIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { maquisApi, tabsApi, maquisShortagesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Product { id: number; name: string; category: string; buy_price: number; sell_price: number; unit: string; current_stock: number; min_stock: number; is_active: boolean; }
interface Supplier { id: number; name: string; contact: string; phone: string; }
interface CustomerTab { id: number; customer_name: string; customer_info: string; total_amount: number; items: unknown[]; }
interface CartItem { product: Product; quantity: number; }
interface Stats { today: { total_ventes: number }; low_stock_alerts: number; low_stock_products: Product[]; month_purchases: { total_achats: number; nb_achats: number }; }

const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';

const MAQUIS_CATEGORIES = ['Bière', 'Vin', 'Alcool', 'Soft', 'Eau', 'Jus', 'Nourriture', 'Grillades', 'Cocktails', 'Autres'];

const Maquis: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePrix = hasPermission('maquis', 'gestion_prix');
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openTabs, setOpenTabs] = useState<CustomerTab[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filterCat, setFilterCat] = useState('');

  // Close-shift dialog
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [actualAmount, setActualAmount] = useState('');
  const [closeShiftResult, setCloseShiftResult] = useState<{ shortage_amount: number; expected_amount: number; actual_amount: number; message: string } | null>(null);
  const [closingShift, setClosingShift] = useState(false);

  // Dialogs
  const [productDialog, setProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [supplyDialog, setSupplyDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);

  // Forms
  const [productForm, setProductForm] = useState({ name: '', category: 'Bière', sell_price: '', buy_price: '', unit: 'bouteille', min_stock: '0' });
  const [supplyForm, setSupplyForm] = useState({ supplier_id: '', payment_method: 'especes', notes: '', items: [] as { product_id: number; quantity: string; unit_price: string; name: string }[] });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', address: '' });
  const [checkoutForm, setCheckoutForm] = useState({ payment_method: 'especes', payment_operator: '', tab_id: '' });

  const showAlert = (type: 'success' | 'error', msg: string) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, ot, st] = await Promise.all([
        maquisApi.getProducts({ active_only: 'true' }),
        maquisApi.getSuppliers(),
        tabsApi.getOpenTabs(),
        maquisApi.getStats()
      ]);
      setProducts(p.data.data || []);
      setSuppliers(s.data.data || []);
      setOpenTabs(ot.data.data || []);
      setStats(st.data.data || null);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === productId);
      if (existing && existing.quantity > 1) return prev.map(c => c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter(c => c.product.id !== productId);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.sell_price * c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await maquisApi.createOrder({
        items: cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
        payment_method: checkoutForm.payment_method,
        tab_id: checkoutForm.tab_id ? parseInt(checkoutForm.tab_id) : undefined
      });
      showAlert('success', checkoutForm.tab_id ? 'Commande ajoutée à l\'onglet !' : `Vente enregistrée — ${fmt(cartTotal)}`);
      setCart([]);
      setCheckoutDialog(false);
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.sell_price) return showAlert('error', 'Nom et prix de vente requis');
    try {
      if (editProduct) {
        await maquisApi.updateProduct(editProduct.id, { name: productForm.name, category: productForm.category, sell_price: parseFloat(productForm.sell_price), buy_price: parseFloat(productForm.buy_price || '0'), unit: productForm.unit, min_stock: parseFloat(productForm.min_stock) });
        showAlert('success', 'Produit mis à jour');
      } else {
        await maquisApi.createProduct({ name: productForm.name, category: productForm.category, sell_price: parseFloat(productForm.sell_price), buy_price: parseFloat(productForm.buy_price || '0'), unit: productForm.unit, min_stock: parseFloat(productForm.min_stock) });
        showAlert('success', 'Produit créé');
      }
      setProductDialog(false);
      setEditProduct(null);
      setProductForm({ name: '', category: 'Bière', sell_price: '', buy_price: '', unit: 'bouteille', min_stock: '0' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try { await maquisApi.deleteProduct(id); showAlert('success', 'Produit désactivé'); loadAll(); }
    catch { showAlert('error', 'Erreur'); }
  };

  const handleSupply = async () => {
    const validItems = supplyForm.items.filter(i => i.product_id && i.quantity);
    if (!validItems.length) return showAlert('error', 'Aucun article valide');
    try {
      await maquisApi.addStock({
        supplier_id: supplyForm.supplier_id ? parseInt(supplyForm.supplier_id) : undefined,
        payment_method: supplyForm.payment_method,
        notes: supplyForm.notes,
        items: validItems.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price || '0') }))
      });
      showAlert('success', 'Approvisionnement enregistré');
      setSupplyDialog(false);
      setSupplyForm({ supplier_id: '', payment_method: 'especes', notes: '', items: [] });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) return showAlert('error', 'Nom requis');
    try {
      await maquisApi.createSupplier(supplierForm);
      showAlert('success', 'Fournisseur créé');
      setSupplierDialog(false);
      setSupplierForm({ name: '', contact: '', phone: '', address: '' });
      loadAll();
    } catch { showAlert('error', 'Erreur'); }
  };

  const handleCloseShift = async () => {
    if (!actualAmount) return showAlert('error', 'Veuillez saisir le montant collecté');
    setClosingShift(true);
    try {
      const res = await maquisShortagesApi.closeShift({ actual_amount: parseFloat(actualAmount) });
      setCloseShiftResult(res.data.data || res.data);
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de la clôture');
      setCloseShiftDialog(false);
    } finally {
      setClosingShift(false);
    }
  };

  const categories = [...new Set(products.map(p => p.category))];
  const filteredProducts = filterCat ? products.filter(p => p.category === filterCat) : products;

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MaquisIcon color="primary" /> Maquis / Bar
            </Typography>
            <Typography variant="body2" color="text.secondary">Gestion des ventes, stock et approvisionnements</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Actualiser'}
            </Button>
            {stats?.low_stock_alerts ? (
              <Badge badgeContent={stats.low_stock_alerts} color="error">
                <Button variant="outlined" color="warning" startIcon={<WarnIcon />} onClick={() => setActiveTab(1)}>
                  Alertes stock
                </Button>
              </Badge>
            ) : null}
            <Button
              variant="contained"
              color="error"
              startIcon={<ClockOutIcon />}
              onClick={() => { setActualAmount(''); setCloseShiftResult(null); setCloseShiftDialog(true); }}
            >
              Clôturer ma caisse
            </Button>
          </Stack>
        </Box>

        {/* Stats */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #1565c0' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Ventes aujourd'hui</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">{fmt(stats.today?.total_ventes || 0)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #f44336' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Alertes stock</Typography>
                  <Typography variant="h5" fontWeight={700} color="error">{stats.low_stock_alerts || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Achats ce mois</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{fmt(stats.month_purchases?.total_achats || 0)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #7b1fa2' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Onglets ouverts</Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary">{openTabs.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Ventes" />
          <Tab label={<Badge badgeContent={stats?.low_stock_alerts || 0} color="error">Stock</Badge>} />
          <Tab label="Approvisionnement" />
          <Tab label="Produits" />
          <Tab label="Fournisseurs" />
        </Tabs>

        {/* Tab 0: VENTES (POS) */}
        {activeTab === 0 && (
          <Grid container spacing={2}>
            {/* Produits */}
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Tous" onClick={() => setFilterCat('')} color={!filterCat ? 'primary' : 'default'} />
                {categories.map(c => (
                  <Chip key={c} label={c} onClick={() => setFilterCat(c)} color={filterCat === c ? 'primary' : 'default'} />
                ))}
              </Box>
              <Grid container spacing={1}>
                {filteredProducts.map(p => (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }, opacity: p.current_stock <= 0 ? 0.5 : 1 }}
                      onClick={() => p.current_stock > 0 && addToCart(p)}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                        <MaquisIcon color={p.current_stock <= 0 ? 'disabled' : 'primary'} />
                        <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.category}</Typography>
                        <Typography fontWeight={700} color="primary">{fmt(p.sell_price)}</Typography>
                        <Chip label={`Stock: ${p.current_stock} ${p.unit}`} size="small"
                          color={p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success'}
                          sx={{ mt: 0.5 }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {filteredProducts.length === 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                      Aucun produit. <Button onClick={() => setActiveTab(3)}>Ajouter des produits</Button>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Panier */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>🛒 Commande en cours</Typography>
                {cart.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: 'center' }}>Sélectionnez des articles</Typography>
                ) : (
                  <>
                    {cart.map(item => (
                      <Box key={item.product.id} sx={{ display: 'flex', alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{item.product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmt(item.product.sell_price)} × {item.quantity}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => removeFromCart(item.product.id)}><RemoveIcon fontSize="small" /></IconButton>
                          <Typography fontWeight={700} sx={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => addToCart(item.product)}><AddCircleIcon fontSize="small" /></IconButton>
                        </Box>
                        <Typography fontWeight={700} sx={{ ml: 1, minWidth: 80, textAlign: 'right' }} color="primary">
                          {fmt(item.product.sell_price * item.quantity)}
                        </Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography fontWeight={700}>TOTAL</Typography>
                      <Typography fontWeight={700} color="primary" variant="h6">{fmt(cartTotal)}</Typography>
                    </Box>
                    <Button fullWidth variant="contained" color="success" startIcon={<ReceiptIcon />} onClick={() => setCheckoutDialog(true)}>
                      Encaisser
                    </Button>
                    <Button fullWidth variant="text" color="error" onClick={() => setCart([])} sx={{ mt: 0.5 }}>
                      Vider le panier
                    </Button>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: STOCK */}
        {activeTab === 1 && (
          <Box>
            {stats?.low_stock_products && stats.low_stock_products.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{stats.low_stock_products.length} produit(s)</strong> en dessous du stock minimum : {stats.low_stock_products.map(p => p.name).join(', ')}
              </Alert>
            )}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell>Catégorie</TableCell>
                    <TableCell align="right">Stock actuel</TableCell>
                    <TableCell align="right">Stock min</TableCell>
                    <TableCell>Niveau</TableCell>
                    <TableCell align="right">Valeur vente</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(p => {
                    const pct = p.min_stock > 0 ? Math.min(100, (p.current_stock / p.min_stock) * 100) : 100;
                    const color = p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success';
                    return (
                      <TableRow key={p.id} hover sx={{ bgcolor: p.current_stock <= 0 ? 'error.50' : p.current_stock <= p.min_stock ? 'warning.50' : 'inherit' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell><Chip label={p.category} size="small" /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: p.current_stock <= 0 ? 'error.main' : 'inherit' }}>
                          {p.current_stock} {p.unit}
                        </TableCell>
                        <TableCell align="right">{p.min_stock} {p.unit}</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
                        </TableCell>
                        <TableCell align="right">{fmt(p.current_stock * p.sell_price)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: APPROVISIONNEMENT */}
        {activeTab === 2 && (
          <Box>
            <Button variant="contained" startIcon={<SupplyIcon />} sx={{ mb: 2 }} onClick={() => {
              setSupplyForm({ supplier_id: '', payment_method: 'especes', notes: '', items: products.map(p => ({ product_id: p.id, quantity: '', unit_price: String(p.buy_price || ''), name: p.name })) });
              setSupplyDialog(true);
            }}>
              Enregistrer un approvisionnement
            </Button>
            <Typography variant="body2" color="text.secondary">Saisissez les quantités reçues pour mettre à jour le stock automatiquement.</Typography>
          </Box>
        )}

        {/* Tab 3: PRODUITS */}
        {activeTab === 3 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditProduct(null); setProductForm({ name: '', category: 'Bière', sell_price: '', buy_price: '', unit: 'bouteille', min_stock: '0' }); setProductDialog(true); }}>
                Nouveau produit
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell>Catégorie</TableCell>
                    <TableCell align="right">Prix achat</TableCell>
                    <TableCell align="right">Prix vente</TableCell>
                    <TableCell>Unité</TableCell>
                    <TableCell align="right">Stock min</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                      <TableCell><Chip label={p.category} size="small" /></TableCell>
                      <TableCell align="right">{fmt(p.buy_price)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>{fmt(p.sell_price)}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell align="right">{p.min_stock}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {canManagePrix && (
                            <IconButton size="small" onClick={() => { setEditProduct(p); setProductForm({ name: p.name, category: p.category, sell_price: String(p.sell_price), buy_price: String(p.buy_price), unit: p.unit, min_stock: String(p.min_stock) }); setProductDialog(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {canManagePrix && (
                            <IconButton size="small" color="error" onClick={() => handleDeleteProduct(p.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun produit — Cliquez sur "Nouveau produit"</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 4: FOURNISSEURS */}
        {activeTab === 4 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSupplierDialog(true)}>
                Nouveau fournisseur
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Téléphone</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                      <TableCell>{s.contact || '—'}</TableCell>
                      <TableCell>{s.phone || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {suppliers.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun fournisseur</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* Dialog: Encaissement */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Encaissement — {fmt(cartTotal)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              {cart.map(c => (
                <Box key={c.product.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
                  <Typography variant="body2">{c.product.name} × {c.quantity}</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmt(c.product.sell_price * c.quantity)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>TOTAL</Typography>
                <Typography fontWeight={700} color="primary">{fmt(cartTotal)}</Typography>
              </Box>
            </Paper>
            <FormControl fullWidth>
              <InputLabel>Onglet client (optionnel)</InputLabel>
              <Select value={checkoutForm.tab_id} label="Onglet client (optionnel)" onChange={e => setCheckoutForm(f => ({ ...f, tab_id: e.target.value }))}>
                <MenuItem value="">Paiement direct</MenuItem>
                {openTabs.map(t => <MenuItem key={t.id} value={t.id}>{t.customer_name} ({fmt(t.total_amount)})</MenuItem>)}
              </Select>
            </FormControl>
            {!checkoutForm.tab_id && (
              <FormControl fullWidth>
                <InputLabel>Mode de paiement</InputLabel>
                <Select value={checkoutForm.payment_method} label="Mode de paiement" onChange={e => setCheckoutForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="carte">Carte bancaire</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog(false)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleCheckout}>
            {checkoutForm.tab_id ? 'Ajouter à l\'onglet' : `Encaisser ${fmt(cartTotal)}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Produit */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom *" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} required />
            <FormControl fullWidth>
              <InputLabel>Catégorie</InputLabel>
              <Select value={productForm.category} label="Catégorie" onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>
                {MAQUIS_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Prix d'achat (FCFA)" type="number" value={productForm.buy_price} onChange={e => setProductForm(f => ({ ...f, buy_price: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Prix de vente (FCFA) *" type="number" value={productForm.sell_price} onChange={e => setProductForm(f => ({ ...f, sell_price: e.target.value }))} required />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Unité</InputLabel>
                  <Select value={productForm.unit} label="Unité" onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))}>
                    {['bouteille', 'casier', 'carton', 'litre', 'verre', 'sachet', 'pack', 'bidon', 'boîte'].map(u => (
                      <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Stock minimum (alerte)" type="number" value={productForm.min_stock} onChange={e => setProductForm(f => ({ ...f, min_stock: e.target.value }))} />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveProduct}>{editProduct ? 'Modifier' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Approvisionnement */}
      <Dialog open={supplyDialog} onClose={() => setSupplyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          Approvisionnement maquis
          <IconButton size="small" onClick={() => setSupplyDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Fournisseur (optionnel)</InputLabel>
                  <Select value={supplyForm.supplier_id} label="Fournisseur (optionnel)" onChange={e => setSupplyForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <MenuItem value="">Aucun</MenuItem>
                    {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Mode de paiement</InputLabel>
                  <Select value={supplyForm.payment_method} label="Mode de paiement" onChange={e => setSupplyForm(f => ({ ...f, payment_method: e.target.value }))}>
                    <MenuItem value="especes">Espèces</MenuItem>
                    <MenuItem value="credit">Crédit/Créance</MenuItem>
                    <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Typography variant="subtitle2" color="text.secondary">Saisissez les quantités reçues (laisser vide si non livré) :</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell>Quantité reçue</TableCell>
                    <TableCell>Prix unitaire (FCFA)</TableCell>
                    <TableCell>Stock actuel</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplyForm.items.map((item, idx) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={item.quantity} sx={{ width: 100 }}
                          onChange={e => setSupplyForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it) }))}
                          placeholder="0" />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={item.unit_price} sx={{ width: 120 }}
                          onChange={e => setSupplyForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, unit_price: e.target.value } : it) }))} />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{products.find(p => p.id === item.product_id)?.current_stock || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TextField label="Notes" multiline rows={2} value={supplyForm.notes} onChange={e => setSupplyForm(f => ({ ...f, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplyDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSupply} startIcon={<SupplyIcon />}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Fournisseur */}
      <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau fournisseur</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom *" value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} required />
            <TextField label="Contact" value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} />
            <TextField label="Téléphone" value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} />
            <TextField label="Adresse" multiline rows={2} value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveSupplier}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Clôture de caisse */}
      <Dialog open={closeShiftDialog} onClose={() => { setCloseShiftDialog(false); setCloseShiftResult(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClockOutIcon color="error" /> Clôture de caisse
        </DialogTitle>
        <DialogContent>
          {!closeShiftResult ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="info">
                Saisissez le montant total que vous avez collecté pendant votre service.
                Le système calculera automatiquement tout écart avec les ventes enregistrées.
              </Alert>
              <TextField
                fullWidth
                label="Montant collecté (FCFA) *"
                type="number"
                value={actualAmount}
                onChange={e => setActualAmount(e.target.value)}
                inputProps={{ min: 0 }}
                autoFocus
              />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {closeShiftResult.shortage_amount > 0 ? (
                <Alert severity="error" icon={<WarnIcon />}>
                  <Typography fontWeight={700}>⚠️ Manquant détecté !</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Ventes enregistrées : <strong>{fmt(closeShiftResult.expected_amount)}</strong><br />
                    Montant collecté : <strong>{fmt(closeShiftResult.actual_amount)}</strong><br />
                    <span style={{ color: '#d32f2f', fontSize: '1.1em' }}>
                      Manquant : <strong>{fmt(closeShiftResult.shortage_amount)}</strong>
                    </span>
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    Ce manquant a été enregistré et peut être déduit de votre salaire par l'administrateur.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography fontWeight={700}>✅ Caisse correcte</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Ventes enregistrées : <strong>{fmt(closeShiftResult.expected_amount)}</strong><br />
                    Montant collecté : <strong>{fmt(closeShiftResult.actual_amount)}</strong><br />
                    Aucun manquant.
                  </Typography>
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary">{closeShiftResult.message}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCloseShiftDialog(false); setCloseShiftResult(null); }}>Fermer</Button>
          {!closeShiftResult && (
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseShift}
              disabled={closingShift || !actualAmount}
              startIcon={closingShift ? <CircularProgress size={16} /> : <ClockOutIcon />}
            >
              Clôturer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Maquis;
