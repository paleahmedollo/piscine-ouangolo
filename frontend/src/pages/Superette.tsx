import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Tooltip, Badge,
  Divider, Stack, CircularProgress, LinearProgress, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon, StoreMallDirectory as SuperetteIcon, Refresh as RefreshIcon,
  Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon,
  LocalShipping as SupplyIcon,
  Receipt as ReceiptIcon,
  Remove as RemoveIcon, AddCircle as AddCircleIcon, Search as SearchIcon,
  Tune as AdjustIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { superetteApi, tabsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Product { id: number; name: string; category: string; buy_price: number; sell_price: number; unit: string; current_stock: number; min_stock: number; is_active: boolean; description: string; }
interface Supplier { id: number; name: string; contact: string; phone: string; }
interface CustomerTab { id: number; customer_name: string; customer_info: string; total_amount: number; items: unknown[]; }
interface CartItem { product: Product; quantity: number; }
interface Stats { today: { total_ventes: number }; total_products: number; total_stock_value: number; low_stock_alerts: number; low_stock_products: Product[]; month_purchases: { total_achats: number }; }

const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';

const SUPERETTE_CATEGORIES = ['Alimentation', 'Boissons', 'Hygiène', 'Ménager', 'Cosmétiques', 'Vêtements', 'Électronique', 'Papeterie', 'Boulangerie', 'Surgelés', 'Autres'];

const Superette: React.FC = () => {
  const { } = useAuth(); // permissions available
  // const canManage = hasPermission('superette', 'gestion_menu');
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openTabs, setOpenTabs] = useState<CustomerTab[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Dialogs
  const [productDialog, setProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [supplyDialog, setSupplyDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState<Product | null>(null);

  // Forms
  const [productForm, setProductForm] = useState({ name: '', category: 'Alimentation', sell_price: '', buy_price: '', unit: 'unité', min_stock: '0', description: '' });
  const [supplyForm, setSupplyForm] = useState({ supplier_id: '', payment_method: 'especes', notes: '', items: [] as { product_id: number; quantity: string; unit_price: string; name: string }[] });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', address: '' });
  const [checkoutForm, setCheckoutForm] = useState({ payment_method: 'especes', payment_operator: '', tab_id: '' });
  const [adjustForm, setAdjustForm] = useState({ new_quantity: '', reason: 'Ajustement inventaire' });

  const showAlert = (type: 'success' | 'error', msg: string) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, ot, st] = await Promise.all([
        superetteApi.getProducts({ active_only: 'true' }),
        superetteApi.getSuppliers(),
        tabsApi.getOpenTabs(),
        superetteApi.getStats()
      ]);
      setProducts(p.data.data || []);
      setSuppliers(s.data.data || []);
      setOpenTabs(ot.data.data || []);
      setStats(st.data.data || null);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addToCart = (product: Product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + qty } : c);
      return [...prev, { product, quantity: qty }];
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
      await superetteApi.createSale({
        items: cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
        payment_method: checkoutForm.payment_method,
        tab_id: checkoutForm.tab_id ? parseInt(checkoutForm.tab_id) : undefined
      });
      showAlert('success', checkoutForm.tab_id ? 'Articles ajoutés à l\'onglet !' : `Vente enregistrée — ${fmt(cartTotal)}`);
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
      const data = { name: productForm.name, category: productForm.category, sell_price: parseFloat(productForm.sell_price), buy_price: parseFloat(productForm.buy_price || '0'), unit: productForm.unit, min_stock: parseFloat(productForm.min_stock), description: productForm.description };
      if (editProduct) { await superetteApi.updateProduct(editProduct.id, data); showAlert('success', 'Produit mis à jour'); }
      else { await superetteApi.createProduct(data); showAlert('success', 'Produit créé'); }
      setProductDialog(false);
      setEditProduct(null);
      setProductForm({ name: '', category: 'Alimentation', sell_price: '', buy_price: '', unit: 'unité', min_stock: '0', description: '' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try { await superetteApi.deleteProduct(id); showAlert('success', 'Produit désactivé'); loadAll(); }
    catch { showAlert('error', 'Erreur'); }
  };

  const handleAdjustStock = async () => {
    if (!adjustDialog || adjustForm.new_quantity === '') return;
    try {
      await superetteApi.adjustStock({ product_id: adjustDialog.id, new_quantity: parseFloat(adjustForm.new_quantity), reason: adjustForm.reason });
      showAlert('success', 'Stock ajusté');
      setAdjustDialog(null);
      setAdjustForm({ new_quantity: '', reason: 'Ajustement inventaire' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleSupply = async () => {
    const validItems = supplyForm.items.filter(i => i.product_id && parseFloat(i.quantity) > 0);
    if (!validItems.length) return showAlert('error', 'Saisissez au moins une quantité');
    try {
      await superetteApi.addStock({
        supplier_id: supplyForm.supplier_id ? parseInt(supplyForm.supplier_id) : undefined,
        payment_method: supplyForm.payment_method,
        notes: supplyForm.notes,
        items: validItems.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price || '0') }))
      });
      showAlert('success', 'Approvisionnement enregistré');
      setSupplyDialog(false);
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) return showAlert('error', 'Nom requis');
    try { await superetteApi.createSupplier(supplierForm); showAlert('success', 'Fournisseur créé'); setSupplierDialog(false); setSupplierForm({ name: '', contact: '', phone: '', address: '' }); loadAll(); }
    catch { showAlert('error', 'Erreur'); }
  };

  const categories = [...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    const matchSearch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) || p.category.toLowerCase().includes(searchText.toLowerCase());
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SuperetteIcon color="primary" /> Supérette
            </Typography>
            <Typography variant="body2" color="text.secondary">Gestion caisse, stock, produits et approvisionnements</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Actualiser'}
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
              <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Valeur stock</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{fmt(stats.total_stock_value || 0)}</Typography>
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
              <Card sx={{ borderLeft: '4px solid #f57c00' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Total produits</Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">{stats.total_products || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Caisse" />
          <Tab label={<Badge badgeContent={stats?.low_stock_alerts || 0} color="error">Stock & Inventaire</Badge>} />
          <Tab label="Produits" />
          <Tab label="Approvisionnement" />
          <Tab label="Fournisseurs" />
        </Tabs>

        {/* Tab 0: CAISSE (POS) */}
        {activeTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              {/* Search & filter */}
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField size="small" placeholder="Rechercher un article..." value={searchText} onChange={e => setSearchText(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{ flex: 1 }} />
                <Select size="small" value={filterCat} onChange={e => setFilterCat(e.target.value)} displayEmpty sx={{ minWidth: 130 }}>
                  <MenuItem value="">Toutes catégories</MenuItem>
                  {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Stack>
              <Grid container spacing={1}>
                {filteredProducts.map(p => (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }, opacity: p.current_stock <= 0 ? 0.5 : 1 }}
                      onClick={() => p.current_stock > 0 && addToCart(p)}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                        <SuperetteIcon color={p.current_stock <= 0 ? 'disabled' : 'primary'} />
                        <Typography variant="body2" fontWeight={600} noWrap title={p.name}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{p.category}</Typography>
                        <Typography fontWeight={700} color="primary">{fmt(p.sell_price)}</Typography>
                        <Chip label={`${p.current_stock} ${p.unit}`} size="small"
                          color={p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'default'}
                          sx={{ mt: 0.5, fontSize: '0.65rem' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {filteredProducts.length === 0 && (
                  <Grid item xs={12}><Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Aucun produit trouvé</Paper></Grid>
                )}
              </Grid>
            </Grid>

            {/* Panier */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>🛒 Panier</Typography>
                {cart.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                    Cliquez sur un article pour l'ajouter
                  </Typography>
                ) : (
                  <>
                    <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                      {cart.map(item => (
                        <Box key={item.product.id} sx={{ display: 'flex', alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{item.product.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{fmt(item.product.sell_price)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <IconButton size="small" onClick={() => removeFromCart(item.product.id)}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                            <Typography fontWeight={700} sx={{ minWidth: 20, textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</Typography>
                            <IconButton size="small" onClick={() => addToCart(item.product)}><AddCircleIcon sx={{ fontSize: 14 }} /></IconButton>
                          </Box>
                          <Typography fontWeight={700} sx={{ ml: 0.5, minWidth: 75, textAlign: 'right', fontSize: '0.85rem' }} color="primary">
                            {fmt(item.product.sell_price * item.quantity)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography fontWeight={700}>{cart.reduce((s, c) => s + c.quantity, 0)} articles</Typography>
                      <Typography fontWeight={700} color="primary" variant="h6">{fmt(cartTotal)}</Typography>
                    </Box>
                    <Button fullWidth variant="contained" color="success" startIcon={<ReceiptIcon />} onClick={() => setCheckoutDialog(true)}>
                      Encaisser {fmt(cartTotal)}
                    </Button>
                    <Button fullWidth variant="text" color="error" onClick={() => setCart([])} sx={{ mt: 0.5 }} size="small">
                      Vider le panier
                    </Button>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: STOCK & INVENTAIRE */}
        {activeTab === 1 && (
          <Box>
            {stats?.low_stock_products && stats.low_stock_products.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{stats.low_stock_products.length} produit(s) en rupture ou stock bas :</strong> {stats.low_stock_products.map(p => p.name).join(', ')}
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
                    <TableCell align="right">Valeur</TableCell>
                    <TableCell>Inventaire</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(p => {
                    const pct = p.min_stock > 0 ? Math.min(100, (p.current_stock / p.min_stock) * 100) : 100;
                    const color: 'error' | 'warning' | 'success' = p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success';
                    return (
                      <TableRow key={p.id} hover sx={{ bgcolor: p.current_stock <= 0 ? 'error.50' : p.current_stock <= p.min_stock ? 'warning.50' : 'inherit' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell><Chip label={p.category} size="small" /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: p.current_stock <= 0 ? 'error.main' : 'inherit' }}>
                          {p.current_stock} {p.unit}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{p.min_stock}</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
                        </TableCell>
                        <TableCell align="right">{fmt(p.current_stock * p.sell_price)}</TableCell>
                        <TableCell>
                          <Tooltip title="Ajuster le stock (inventaire)">
                            <IconButton size="small" color="primary" onClick={() => { setAdjustDialog(p); setAdjustForm({ new_quantity: String(p.current_stock), reason: 'Ajustement inventaire' }); }}>
                              <AdjustIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: PRODUITS */}
        {activeTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <TextField size="small" placeholder="Rechercher..." value={searchText} onChange={e => setSearchText(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditProduct(null); setProductForm({ name: '', category: 'Alimentation', sell_price: '', buy_price: '', unit: 'unité', min_stock: '0', description: '' }); setProductDialog(true); }}>
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
                    <TableCell align="right">Marge %</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map(p => {
                    const marge = p.buy_price > 0 ? Math.round(((p.sell_price - p.buy_price) / p.buy_price) * 100) : null;
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell><Chip label={p.category} size="small" /></TableCell>
                        <TableCell align="right">{fmt(p.buy_price)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>{fmt(p.sell_price)}</TableCell>
                        <TableCell>{p.unit}</TableCell>
                        <TableCell align="right">
                          {marge !== null && <Chip label={`${marge}%`} size="small" color={marge >= 20 ? 'success' : marge >= 0 ? 'warning' : 'error'} />}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => { setEditProduct(p); setProductForm({ name: p.name, category: p.category, sell_price: String(p.sell_price), buy_price: String(p.buy_price), unit: p.unit, min_stock: String(p.min_stock), description: p.description || '' }); setProductDialog(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteProduct(p.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun produit</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: APPROVISIONNEMENT */}
        {activeTab === 3 && (
          <Box>
            <Button variant="contained" startIcon={<SupplyIcon />} sx={{ mb: 2 }} onClick={() => {
              setSupplyForm({ supplier_id: '', payment_method: 'especes', notes: '', items: products.map(p => ({ product_id: p.id, quantity: '', unit_price: String(p.buy_price || ''), name: p.name })) });
              setSupplyDialog(true);
            }}>
              Enregistrer une livraison
            </Button>
            <Typography variant="body2" color="text.secondary">
              Entrez les quantités reçues pour chaque produit. Le stock sera mis à jour automatiquement.
            </Typography>
          </Box>
        )}

        {/* Tab 4: FOURNISSEURS */}
        {activeTab === 4 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSupplierDialog(true)}>Nouveau fournisseur</Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Adresse</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                      <TableCell>{s.contact || '—'}</TableCell>
                      <TableCell>{s.phone || '—'}</TableCell>
                      <TableCell>{(s as unknown as { address: string }).address || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {suppliers.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun fournisseur</TableCell></TableRow>}
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
            <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 200, overflow: 'auto' }}>
              {cart.map(c => (
                <Box key={c.product.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
                  <Typography variant="body2">{c.product.name} × {c.quantity}</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmt(c.product.sell_price * c.quantity)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>TOTAL À PAYER</Typography>
                <Typography fontWeight={700} color="primary" variant="h6">{fmt(cartTotal)}</Typography>
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
            <TextField label="Nom du produit *" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} required />
            <FormControl fullWidth>
              <InputLabel>Catégorie</InputLabel>
              <Select value={productForm.category} label="Catégorie" onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>
                {SUPERETTE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
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
                <TextField fullWidth label="Unité" value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} placeholder="unité, kg, L, boîte..." />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Stock minimum (alerte)" type="number" value={productForm.min_stock} onChange={e => setProductForm(f => ({ ...f, min_stock: e.target.value }))} />
              </Grid>
            </Grid>
            <TextField label="Description" multiline rows={2} value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveProduct}>{editProduct ? 'Modifier' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ajustement stock */}
      <Dialog open={!!adjustDialog} onClose={() => setAdjustDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Ajustement stock — {adjustDialog?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">Stock actuel : <strong>{adjustDialog?.current_stock} {adjustDialog?.unit}</strong></Alert>
            <TextField label="Nouveau stock réel" type="number" value={adjustForm.new_quantity}
              onChange={e => setAdjustForm(f => ({ ...f, new_quantity: e.target.value }))}
              placeholder="Saisissez le stock réel compté" required />
            <TextField label="Raison" value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(null)}>Annuler</Button>
          <Button variant="contained" onClick={handleAdjustStock}>Ajuster</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Approvisionnement */}
      <Dialog open={supplyDialog} onClose={() => setSupplyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          Approvisionnement supérette
          <IconButton size="small" onClick={() => setSupplyDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Fournisseur</InputLabel>
                  <Select value={supplyForm.supplier_id} label="Fournisseur" onChange={e => setSupplyForm(f => ({ ...f, supplier_id: e.target.value }))}>
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
                    <MenuItem value="credit">Crédit</MenuItem>
                    <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell>Catégorie</TableCell>
                    <TableCell>Qté reçue</TableCell>
                    <TableCell>Prix unitaire</TableCell>
                    <TableCell>Stock actuel</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplyForm.items.map((item, idx) => {
                    const p = products.find(x => x.id === item.product_id);
                    return (
                      <TableRow key={item.product_id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell><Chip label={p?.category} size="small" /></TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={item.quantity} sx={{ width: 90 }}
                            onChange={e => setSupplyForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it) }))}
                            placeholder="0" inputProps={{ min: 0 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={item.unit_price} sx={{ width: 110 }}
                            onChange={e => setSupplyForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, unit_price: e.target.value } : it) }))} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{p?.current_stock || 0} {p?.unit}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TextField label="Notes" multiline rows={2} value={supplyForm.notes} onChange={e => setSupplyForm(f => ({ ...f, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplyDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSupply} startIcon={<SupplyIcon />}>Valider la livraison</Button>
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
    </Layout>
  );
};

export default Superette;
