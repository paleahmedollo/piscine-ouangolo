import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Badge,
  Divider, Stack, CircularProgress, LinearProgress, Tooltip
} from '@mui/material';
import {
  Add as AddIcon, SportsBar as MaquisIcon, Refresh as RefreshIcon,
  Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon,
  LocalShipping as SupplyIcon, Warning as WarnIcon,
  Receipt as ReceiptIcon, LockClock as ClockOutIcon,
  Remove as RemoveIcon, AddCircle as AddCircleIcon,
  Print as PrintIcon, CheckCircle as PaidIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { maquisApi, tabsApi, maquisShortagesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: number; name: string; category: string; buy_price: number;
  sell_price: number; unit: string; current_stock: number; min_stock: number; is_active: boolean;
}
interface Supplier { id: number; name: string; contact: string; phone: string; address?: string; }
interface CustomerTab { id: number; customer_name: string; customer_info: string; total_amount: number; items: unknown[]; }
interface CartItem { product: Product; quantity: number; }
interface SaleOrder { id: number; items: CartItem[]; total: number; payment_method: string; created_at: string; }
interface Stats {
  today: { total_ventes: number };
  low_stock_alerts: number;
  low_stock_products: Product[];
  month_purchases: { total_achats: number; nb_achats: number };
}

const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';
const MAQUIS_CATEGORIES = ['Bière', 'Vin', 'Alcool', 'Soft', 'Eau', 'Jus', 'Nourriture', 'Grillades', 'Cocktails', 'Autres'];

// ─── Impression reçu de vente ─────────────────────────────────────────────────
const printSaleReceipt = (order: SaleOrder, cashier: string) => {
  const num = `MQ-${String(order.id || Date.now()).padStart(5, '0')}`;
  const now = new Date(order.created_at || Date.now());
  const dateStr = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const payLabel: Record<string, string> = { especes: 'Espèces', mobile_money: 'Mobile Money', carte: 'Carte bancaire' };

  const lignes = order.items.map(c =>
    `<div class="row"><span>${c.product.name} × ${c.quantity}</span><span>${fmt(c.product.sell_price * c.quantity)}</span></div>`
  ).join('');

  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}
    .center{text-align:center} .bold{font-weight:bold}
    .row{display:flex;justify-content:space-between;margin:3px 0}
    .sep{border-top:1px dashed #000;margin:8px 0}
    .title{font-size:14px;font-weight:bold;text-align:center}
    .total{display:flex;justify-content:space-between;font-size:14px;font-weight:bold;background:#f5f5f5;padding:6px;margin:4px 0}
    @media print{body{width:100%}}
  `;
  const body = `
    <div class="title">🍺 MAQUIS / BAR</div>
    <div class="center" style="font-size:10px">Piscine de Ouangolodougou</div>
    <div class="sep"></div>
    <div class="center bold">REÇU DE VENTE</div>
    <div class="sep"></div>
    <div class="row"><span>N° Reçu :</span><span><b>${num}</b></span></div>
    <div class="row"><span>Date :</span><span>${dateStr}</span></div>
    <div class="row"><span>Heure :</span><span>${heureStr}</span></div>
    <div class="sep"></div>
    <div class="bold" style="margin-bottom:4px">Articles :</div>
    ${lignes}
    <div class="sep"></div>
    <div class="total"><span>TOTAL :</span><span>${fmt(order.total)}</span></div>
    <div class="row"><span>Paiement :</span><span>${payLabel[order.payment_method] || order.payment_method}</span></div>
    <div class="sep"></div>
    <div class="row"><span>Caissier :</span><span>${cashier}</span></div>
    <div class="center" style="margin-top:10px;font-size:11px;font-style:italic">Merci de votre visite !<br/>À bientôt au Maquis de Ouangolodougou</div>
  `;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu</title><style>${css}</style></head><body>${body}</body></html>`;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
};

// ─── Dialog Reçu ─────────────────────────────────────────────────────────────
const ReceiptDialog: React.FC<{ order: SaleOrder | null; cashier: string; onClose: () => void }> = ({ order, cashier, onClose }) => {
  if (!order) return null;
  return (
    <Dialog open={!!order} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white', textAlign: 'center' }}>
        ✅ Reçu — Maquis / Bar
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 2 }}>MAQUIS / BAR</Typography>
          <Typography variant="caption" color="text.secondary">Piscine de Ouangolodougou</Typography>
          <Divider sx={{ width: '100%' }} />
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">N° Reçu :</Typography>
              <Typography variant="body2" fontWeight={700}>MQ-{String(order.id || '').padStart(5, '0')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Date :</Typography>
              <Typography variant="body2" fontWeight={600}>{new Date(order.created_at || Date.now()).toLocaleDateString('fr-FR')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Heure :</Typography>
              <Typography variant="body2" fontWeight={600}>{new Date(order.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Typography>
            </Box>
          </Box>
          <Divider sx={{ width: '100%' }} />
          <Box sx={{ width: '100%' }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>Articles :</Typography>
            {order.items.map(c => (
              <Box key={c.product.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, bgcolor: 'grey.50', px: 1, borderRadius: 0.5, mb: 0.3 }}>
                <Typography variant="body2">{c.product.name} × {c.quantity}</Typography>
                <Typography variant="body2" fontWeight={600}>{fmt(c.product.sell_price * c.quantity)}</Typography>
              </Box>
            ))}
          </Box>
          <Divider sx={{ width: '100%' }} />
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight={700}>TOTAL</Typography>
            <Typography variant="h5" color="primary" fontWeight={700}>{fmt(order.total)}</Typography>
          </Box>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Paiement :</Typography>
            <Chip size="small" color="success" label={order.payment_method === 'especes' ? 'Espèces' : order.payment_method === 'mobile_money' ? 'Mobile Money' : 'Carte'} />
          </Box>
          <Divider sx={{ width: '100%' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
            Merci de votre visite !<br />À bientôt au Maquis de Ouangolodougou
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => printSaleReceipt(order, cashier)}>Imprimer</Button>
        <Button variant="contained" sx={{ bgcolor: '#1565c0' }} onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const Maquis: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const canManagePrix = hasPermission('maquis', 'gestion_prix');
  const cashier = (user as any)?.full_name || (user as any)?.username || 'Caissier';

  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openTabs, setOpenTabs] = useState<CustomerTab[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filterCat, setFilterCat] = useState('');

  // Close shift
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [actualAmount, setActualAmount] = useState('');
  const [closeShiftResult, setCloseShiftResult] = useState<{ shortage_amount: number; expected_amount: number; actual_amount: number; message: string } | null>(null);
  const [closingShift, setClosingShift] = useState(false);

  // Dialogs
  const [productDialog, setProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [supplyDialog, setSupplyDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<SaleOrder | null>(null);

  // Forms
  const [productForm, setProductForm] = useState({ name: '', category: 'Bière', sell_price: '', buy_price: '', unit: 'bouteille', min_stock: '0' });
  const [supplyForm, setSupplyForm] = useState({
    supplier_id: '', payment_method: 'especes', notes: '',
    items: [] as { product_id: number; quantity: string; unit_price: string; name: string }[]
  });
  // Approvisionnement : lignes manuelles (produit sélectionné + qté + prix)
  const [supplyLines, setSupplyLines] = useState<{ product_id: string; quantity: string; unit_price: string }[]>([
    { product_id: '', quantity: '', unit_price: '' }
  ]);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', address: '' });
  const [checkoutForm, setCheckoutForm] = useState({ payment_method: 'especes', tab_id: '' });

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const p = await maquisApi.getProducts({ active_only: 'true' });
      setProducts(p.data.data || p.data || []);
    } catch (e) { console.error('[products]', e); }
    try {
      const s = await maquisApi.getSuppliers();
      setSuppliers(s.data.data || s.data || []);
    } catch (e) { console.error('[suppliers]', e); }
    try {
      const ot = await tabsApi.getOpenTabs();
      setOpenTabs(ot.data.data || ot.data || []);
    } catch (e) { console.error('[tabs]', e); }
    try {
      const st = await maquisApi.getStats();
      setStats(st.data.data || st.data || null);
    } catch (e) { console.error('[stats]', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Panier ─────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(c => c.product.id === product.id);
      if (ex) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const ex = prev.find(c => c.product.id === productId);
      if (ex && ex.quantity > 1) return prev.map(c => c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter(c => c.product.id !== productId);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.sell_price * c.quantity, 0);

  // ── Encaissement ───────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await maquisApi.createOrder({
        items: cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
        payment_method: checkoutForm.tab_id ? 'tab' : 'en_attente', // Toujours en attente → paiement à la Caisse
        tab_id: checkoutForm.tab_id ? parseInt(checkoutForm.tab_id) : undefined
      });
      setCart([]);
      setCheckoutDialog(false);
      setCheckoutForm({ payment_method: 'en_attente', tab_id: '' });
      loadAll();
      if (checkoutForm.tab_id) {
        showAlert('success', 'Commande ajoutée à l\'onglet !');
      } else {
        showAlert('success', '🎫 Commande enregistrée — le client paie à la Caisse');
      }
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  // ── Produits ───────────────────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.sell_price) return showAlert('error', 'Nom et prix de vente requis');
    try {
      const payload = {
        name: productForm.name, category: productForm.category,
        sell_price: parseFloat(productForm.sell_price),
        buy_price: parseFloat(productForm.buy_price || '0'),
        unit: productForm.unit, min_stock: parseFloat(productForm.min_stock)
      };
      if (editProduct) {
        await maquisApi.updateProduct(editProduct.id, payload);
        showAlert('success', 'Produit mis à jour');
      } else {
        await maquisApi.createProduct(payload);
        showAlert('success', 'Produit créé');
      }
      setProductDialog(false); setEditProduct(null);
      setProductForm({ name: '', category: 'Bière', sell_price: '', buy_price: '', unit: 'bouteille', min_stock: '0' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Désactiver ce produit ?')) return;
    try { await maquisApi.deleteProduct(id); showAlert('success', 'Produit désactivé'); loadAll(); }
    catch { showAlert('error', 'Erreur lors de la suppression'); }
  };

  // ── Approvisionnement ──────────────────────────────────────────────────────
  const openSupplyDialog = () => {
    setSupplyForm({ supplier_id: '', payment_method: 'especes', notes: '', items: [] });
    setSupplyLines([{ product_id: '', quantity: '', unit_price: '' }]);
    setSupplyDialog(true);
  };

  const addSupplyLine = () => setSupplyLines(l => [...l, { product_id: '', quantity: '', unit_price: '' }]);

  const removeSupplyLine = (idx: number) => setSupplyLines(l => l.filter((_, i) => i !== idx));

  const updateSupplyLine = (idx: number, field: string, value: string) => {
    setSupplyLines(l => l.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      // Auto-remplir le prix d'achat si on choisit un produit
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod && prod.buy_price > 0) updated.unit_price = String(prod.buy_price);
      }
      return updated;
    }));
  };

  const supplyTotal = supplyLines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0;
    const p = parseFloat(l.unit_price) || 0;
    return sum + q * p;
  }, 0);

  const handleSupply = async () => {
    const validLines = supplyLines.filter(l => l.product_id && l.quantity && parseFloat(l.quantity) > 0);
    if (!validLines.length) return showAlert('error', 'Ajoutez au moins un produit avec une quantité');
    try {
      await maquisApi.addStock({
        supplier_id: supplyForm.supplier_id ? parseInt(supplyForm.supplier_id) : undefined,
        payment_method: supplyForm.payment_method,
        notes: supplyForm.notes,
        items: validLines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price || '0')
        }))
      });
      showAlert('success', `Approvisionnement enregistré — ${fmt(supplyTotal)}`);
      setSupplyDialog(false);
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de l\'approvisionnement');
    }
  };

  // ── Fournisseurs ───────────────────────────────────────────────────────────
  const openSupplierDialog = (s?: Supplier) => {
    if (s) {
      setEditSupplier(s);
      setSupplierForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', address: s.address || '' });
    } else {
      setEditSupplier(null);
      setSupplierForm({ name: '', contact: '', phone: '', address: '' });
    }
    setSupplierDialog(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) return showAlert('error', 'Le nom du fournisseur est requis');
    try {
      if (editSupplier) {
        await maquisApi.updateSupplier(editSupplier.id, supplierForm);
        showAlert('success', 'Fournisseur mis à jour');
      } else {
        await maquisApi.createSupplier(supplierForm);
        showAlert('success', 'Fournisseur créé avec succès !');
      }
      setSupplierDialog(false);
      setEditSupplier(null);
      setSupplierForm({ name: '', contact: '', phone: '', address: '' });
      loadAll();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert('error', msg || 'Erreur lors de la création du fournisseur');
    }
  };

  // ── Clôture caisse ─────────────────────────────────────────────────────────
  const handleCloseShift = async () => {
    if (!actualAmount) return showAlert('error', 'Veuillez saisir le montant collecté');
    setClosingShift(true);
    try {
      const res = await maquisShortagesApi.closeShift({ actual_amount: parseFloat(actualAmount) });
      setCloseShiftResult(res.data.data || res.data);
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de la clôture');
      setCloseShiftDialog(false);
    } finally { setClosingShift(false); }
  };

  const categories = [...new Set(products.map(p => p.category))];
  const filteredProducts = (filterCat ? products.filter(p => p.category === filterCat) : products)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  // Grouper par première lettre pour séparateurs alphabétiques
  type GroupedItem = { type: 'letter'; letter: string } | { type: 'product'; product: Product };
  const groupedProducts: GroupedItem[] = [];
  let lastLetter = '';
  filteredProducts.forEach(p => {
    const letter = p.name.charAt(0).toUpperCase();
    if (letter !== lastLetter) { groupedProducts.push({ type: 'letter', letter }); lastLetter = letter; }
    groupedProducts.push({ type: 'product', product: p });
  });

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

        {/* Header */}
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
            {(stats?.low_stock_alerts || 0) > 0 && (
              <Badge badgeContent={stats?.low_stock_alerts} color="error">
                <Button variant="outlined" color="warning" startIcon={<WarnIcon />} onClick={() => setActiveTab(1)}>
                  Alertes stock
                </Button>
              </Badge>
            )}
            <Button variant="contained" color="error" startIcon={<ClockOutIcon />}
              onClick={() => { setActualAmount(''); setCloseShiftResult(null); setCloseShiftDialog(true); }}>
              Clôturer ma caisse
            </Button>
          </Stack>
        </Box>

        {/* Stats */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: "Ventes aujourd'hui", value: fmt(stats.today?.total_ventes || 0), color: '#1565c0' },
              { label: 'Alertes stock', value: stats.low_stock_alerts || 0, color: '#f44336' },
              { label: 'Achats ce mois', value: fmt(stats.month_purchases?.total_achats || 0), color: '#2e7d32' },
              { label: 'Onglets ouverts', value: openTabs.length, color: '#7b1fa2' }
            ].map((s, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card sx={{ borderLeft: `4px solid ${s.color}` }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    <Typography variant="h6" fontWeight={700} color={s.color}>{s.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Ventes" />
          <Tab label={<Badge badgeContent={stats?.low_stock_alerts || 0} color="error"><Box sx={{ pr: (stats?.low_stock_alerts || 0) > 0 ? 1.5 : 0 }}>Stock</Box></Badge>} />
          <Tab label="Approvisionnement" />
          <Tab label="Produits" />
          <Tab label="Fournisseurs" />
        </Tabs>

        {/* ── Tab 0 : VENTES ─────────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Tous" onClick={() => setFilterCat('')} color={!filterCat ? 'primary' : 'default'} />
                {categories.map(c => (
                  <Chip key={c} label={c} onClick={() => setFilterCat(c)} color={filterCat === c ? 'primary' : 'default'} />
                ))}
              </Box>
              <Grid container spacing={1}>
                {groupedProducts.map((item, idx) => {
                  if (item.type === 'letter') {
                    return (
                      <Grid item xs={12} key={`letter-${item.letter}-${idx}`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                          <Box sx={{ bgcolor: '#1565c0', color: 'white', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                            {item.letter}
                          </Box>
                          <Box sx={{ flex: 1, height: '1px', bgcolor: '#1565c0', opacity: 0.25 }} />
                        </Box>
                      </Grid>
                    );
                  }
                  const p = item.product;
                  return (
                    <Grid item xs={6} sm={4} md={3} key={p.id}>
                      <Card variant="outlined"
                        sx={{ cursor: p.current_stock > 0 ? 'pointer' : 'not-allowed', opacity: p.current_stock <= 0 ? 0.5 : 1, '&:hover': p.current_stock > 0 ? { borderColor: 'primary.main', bgcolor: '#e3f2fd' } : {} }}
                        onClick={() => p.current_stock > 0 && addToCart(p)}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                          <MaquisIcon color={p.current_stock <= 0 ? 'disabled' : 'primary'} />
                          <Typography variant="body2" fontWeight={600} noWrap title={p.name}>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.category}</Typography>
                          <Typography fontWeight={700} color="primary">{fmt(p.sell_price)}</Typography>
                          <Chip label={`${p.current_stock} ${p.unit}`} size="small"
                            color={p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success'}
                            sx={{ mt: 0.5 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                      Aucun produit. <Button onClick={() => setActiveTab(3)}>Ajouter des produits</Button>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Panier — NE PAS MODIFIER */}
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

        {/* ── Tab 1 : STOCK ──────────────────────────────────────────────────── */}
        {activeTab === 1 && (
          <Box>
            {stats?.low_stock_products && stats.low_stock_products.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{stats.low_stock_products.length} produit(s)</strong> en dessous du stock minimum :{' '}
                {stats.low_stock_products.map(p => p.name).join(', ')}
              </Alert>
            )}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Produit</strong></TableCell>
                    <TableCell><strong>Catégorie</strong></TableCell>
                    <TableCell align="right"><strong>Stock actuel</strong></TableCell>
                    <TableCell align="right"><strong>Stock min</strong></TableCell>
                    <TableCell><strong>Niveau</strong></TableCell>
                    <TableCell align="right"><strong>Valeur stock</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(p => {
                    const pct = p.min_stock > 0 ? Math.min(100, (p.current_stock / p.min_stock) * 100) : 100;
                    const color = p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success';
                    return (
                      <TableRow key={p.id} hover sx={{ bgcolor: p.current_stock <= 0 ? '#ffebee' : p.current_stock <= p.min_stock ? '#fff8e1' : 'inherit' }}>
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
                  {products.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun produit</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 2 : APPROVISIONNEMENT ──────────────────────────────────────── */}
        {activeTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Enregistrez les livraisons de stock reçues des fournisseurs.
              </Typography>
              <Button variant="contained" startIcon={<SupplyIcon />} onClick={openSupplyDialog}>
                Nouvel approvisionnement
              </Button>
            </Box>
            {/* Info visuelle */}
            <Alert severity="info" sx={{ mb: 2 }}>
              Cliquez sur <strong>"Nouvel approvisionnement"</strong> pour sélectionner les produits reçus,
              indiquer les quantités et les prix d'achat. Le stock sera mis à jour automatiquement.
            </Alert>
            {/* Tableau des produits avec stock actuel */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Produit</strong></TableCell>
                    <TableCell><strong>Catégorie</strong></TableCell>
                    <TableCell align="right"><strong>Stock actuel</strong></TableCell>
                    <TableCell align="right"><strong>Stock min</strong></TableCell>
                    <TableCell align="right"><strong>Prix achat</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id} hover sx={{ bgcolor: p.current_stock <= p.min_stock ? '#fff8e1' : 'inherit' }}>
                      <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                      <TableCell><Chip label={p.category} size="small" /></TableCell>
                      <TableCell align="right">
                        <Chip label={`${p.current_stock} ${p.unit}`} size="small"
                          color={p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success'} />
                      </TableCell>
                      <TableCell align="right">{p.min_stock}</TableCell>
                      <TableCell align="right">{fmt(p.buy_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 3 : PRODUITS ───────────────────────────────────────────────── */}
        {activeTab === 3 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => { setEditProduct(null); setProductForm({ name: '', category: 'Bière', sell_price: '', buy_price: '', unit: 'bouteille', min_stock: '0' }); setProductDialog(true); }}>
                Nouveau produit
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Produit</strong></TableCell>
                    <TableCell><strong>Catégorie</strong></TableCell>
                    <TableCell align="right"><strong>Prix achat</strong></TableCell>
                    <TableCell align="right"><strong>Prix vente</strong></TableCell>
                    <TableCell><strong>Unité</strong></TableCell>
                    <TableCell align="right"><strong>Stock min</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
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
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {canManagePrix && (
                            <Tooltip title="Modifier">
                              <IconButton size="small" color="primary"
                                onClick={() => { setEditProduct(p); setProductForm({ name: p.name, category: p.category, sell_price: String(p.sell_price), buy_price: String(p.buy_price), unit: p.unit, min_stock: String(p.min_stock) }); setProductDialog(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canManagePrix && (
                            <Tooltip title="Désactiver">
                              <IconButton size="small" color="error" onClick={() => handleDeleteProduct(p.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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

        {/* ── Tab 4 : FOURNISSEURS ───────────────────────────────────────────── */}
        {activeTab === 4 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openSupplierDialog()}>
                Nouveau fournisseur
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Nom</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Téléphone</strong></TableCell>
                    <TableCell><strong>Adresse</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                      <TableCell>{s.contact || '—'}</TableCell>
                      <TableCell>{s.phone || '—'}</TableCell>
                      <TableCell>{(s as any).address || '—'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Modifier">
                          <IconButton size="small" color="primary" onClick={() => openSupplierDialog(s)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {suppliers.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun fournisseur enregistré</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* ── DIALOGS ───────────────────────────────────────────────────────────── */}

      {/* Dialog: Encaissement */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ReceiptIcon /> Encaissement — {fmt(cartTotal)}</Box>
        </DialogTitle>
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
                <Typography fontWeight={700} color="primary" variant="h6">{fmt(cartTotal)}</Typography>
              </Box>
            </Paper>
            {openTabs.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Onglet client (optionnel)</InputLabel>
                <Select value={checkoutForm.tab_id} label="Onglet client (optionnel)"
                  onChange={e => setCheckoutForm(f => ({ ...f, tab_id: e.target.value }))}>
                  <MenuItem value="">Aucun onglet</MenuItem>
                  {openTabs.map(t => <MenuItem key={t.id} value={t.id}>{t.customer_name} ({fmt(t.total_amount)})</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Alert severity="info" sx={{ py: 0.5 }}>
              🏦 <strong>Paiement à la Caisse</strong> — La commande sera enregistrée. Le client règle à la Caisse.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog(false)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleCheckout}>
            {checkoutForm.tab_id ? "Ajouter à l'onglet" : `🎫 Enregistrer → Caisse`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Reçu de vente */}
      <ReceiptDialog order={receiptOrder} cashier={cashier} onClose={() => setReceiptOrder(null)} />

      {/* Dialog: Nouveau produit */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom *" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Catégorie</InputLabel>
              <Select value={productForm.category} label="Catégorie" onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>
                {MAQUIS_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Prix d'achat (FCFA)" type="number" value={productForm.buy_price}
                  onChange={e => setProductForm(f => ({ ...f, buy_price: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Prix de vente (FCFA) *" type="number" value={productForm.sell_price}
                  onChange={e => setProductForm(f => ({ ...f, sell_price: e.target.value }))} />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Unité</InputLabel>
                  <Select value={productForm.unit} label="Unité" onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))}>
                    {['bouteille', 'casier', 'carton', 'litre', 'verre', 'sachet', 'pack', 'bidon', 'boîte', 'portion'].map(u => (
                      <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Stock minimum (alerte)" type="number" value={productForm.min_stock}
                  onChange={e => setProductForm(f => ({ ...f, min_stock: e.target.value }))} />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveProduct}>{editProduct ? 'Modifier' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Approvisionnement — saisie ligne par ligne */}
      <Dialog open={supplyDialog} onClose={() => setSupplyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SupplyIcon color="primary" /> Approvisionnement</Box>
          <IconButton size="small" onClick={() => setSupplyDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Fournisseur (optionnel)</InputLabel>
                  <Select value={supplyForm.supplier_id} label="Fournisseur (optionnel)"
                    onChange={e => setSupplyForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <MenuItem value="">Aucun / Non renseigné</MenuItem>
                    {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Mode de paiement</InputLabel>
                  <Select value={supplyForm.payment_method} label="Mode de paiement"
                    onChange={e => setSupplyForm(f => ({ ...f, payment_method: e.target.value }))}>
                    <MenuItem value="especes">💵 Espèces</MenuItem>
                    <MenuItem value="credit">📋 Crédit / Créance</MenuItem>
                    <MenuItem value="mobile_money">📱 Mobile Money</MenuItem>
                    <MenuItem value="virement">🏦 Virement</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Lignes de produits */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Produits reçus :</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addSupplyLine} variant="outlined">
                  Ajouter une ligne
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Produit *</strong></TableCell>
                      <TableCell align="center"><strong>Quantité *</strong></TableCell>
                      <TableCell align="center"><strong>Prix unitaire (FCFA)</strong></TableCell>
                      <TableCell align="right"><strong>Sous-total</strong></TableCell>
                      <TableCell align="center"><strong>Suppr.</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {supplyLines.map((line, idx) => {
                      const subTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
                      return (
                        <TableRow key={idx}>
                          <TableCell sx={{ minWidth: 180 }}>
                            <FormControl fullWidth size="small">
                              <Select value={line.product_id} displayEmpty
                                onChange={e => updateSupplyLine(idx, 'product_id', e.target.value)}>
                                <MenuItem value=""><em>— Choisir un produit —</em></MenuItem>
                                {products.map(p => (
                                  <MenuItem key={p.id} value={String(p.id)}>
                                    {p.name} <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({p.current_stock} {p.unit})</Typography>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={line.quantity} sx={{ width: 90 }}
                              onChange={e => updateSupplyLine(idx, 'quantity', e.target.value)}
                              placeholder="0" inputProps={{ min: 0 }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={line.unit_price} sx={{ width: 120 }}
                              onChange={e => updateSupplyLine(idx, 'unit_price', e.target.value)}
                              placeholder="0" inputProps={{ min: 0 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600} color={subTotal > 0 ? 'primary' : 'text.secondary'}>
                              {subTotal > 0 ? fmt(subTotal) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => removeSupplyLine(idx)} disabled={supplyLines.length === 1}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Total */}
            {supplyTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <strong>Total approvisionnement : {fmt(supplyTotal)}</strong>
                </Alert>
              </Box>
            )}

            <TextField label="Notes (facultatif)" multiline rows={2} value={supplyForm.notes}
              onChange={e => setSupplyForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ex: livraison partielle, produits en attente..." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplyDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSupply} startIcon={<PaidIcon />}>
            Enregistrer ({supplyLines.filter(l => l.product_id && l.quantity).length} produit{supplyLines.filter(l => l.product_id && l.quantity).length > 1 ? 's' : ''})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Fournisseur */}
      <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom du fournisseur *" value={supplierForm.name}
              onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} fullWidth autoFocus />
            <TextField label="Contact (nom du responsable)" value={supplierForm.contact}
              onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} fullWidth />
            <TextField label="Téléphone" value={supplierForm.phone}
              onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} fullWidth />
            <TextField label="Adresse" multiline rows={2} value={supplierForm.address}
              onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveSupplier}>
            {editSupplier ? 'Modifier' : 'Créer'}
          </Button>
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
                Saisissez le montant total collecté pendant votre service.
                Le système calculera automatiquement tout écart.
              </Alert>
              <TextField fullWidth label="Montant collecté (FCFA) *" type="number"
                value={actualAmount} onChange={e => setActualAmount(e.target.value)}
                inputProps={{ min: 0 }} autoFocus />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {closeShiftResult.shortage_amount > 0 ? (
                <Alert severity="error">
                  <Typography fontWeight={700}>⚠️ Manquant détecté !</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Ventes enregistrées : <strong>{fmt(closeShiftResult.expected_amount)}</strong><br />
                    Montant collecté : <strong>{fmt(closeShiftResult.actual_amount)}</strong><br />
                    <span style={{ color: '#d32f2f' }}>Manquant : <strong>{fmt(closeShiftResult.shortage_amount)}</strong></span>
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography fontWeight={700}>✅ Caisse correcte</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Ventes : <strong>{fmt(closeShiftResult.expected_amount)}</strong><br />
                    Collecté : <strong>{fmt(closeShiftResult.actual_amount)}</strong>
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCloseShiftDialog(false); setCloseShiftResult(null); }}>Fermer</Button>
          {!closeShiftResult && (
            <Button variant="contained" color="error" onClick={handleCloseShift}
              disabled={closingShift || !actualAmount}
              startIcon={closingShift ? <CircularProgress size={16} /> : <ClockOutIcon />}>
              Clôturer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Maquis;
