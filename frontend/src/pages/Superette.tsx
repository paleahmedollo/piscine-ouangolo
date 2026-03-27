import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Tooltip, Badge,
  Divider, Stack, CircularProgress, LinearProgress, InputAdornment, Autocomplete,
  Popover
} from '@mui/material';
import {
  Add as AddIcon, StoreMallDirectory as SuperetteIcon, Refresh as RefreshIcon,
  Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon,
  LocalShipping as SupplyIcon, Receipt as ReceiptIcon, Print as PrintIcon,
  Remove as RemoveIcon, AddCircle as AddCircleIcon, Search as SearchIcon,
  Tune as AdjustIcon, CheckCircle as PaidIcon, Notifications as NotificationsIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { superetteApi, tabsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Product { id: number; name: string; category: string; buy_price: number; sell_price: number; unit: string; current_stock: number; min_stock: number; is_active: boolean; description: string; }
interface Supplier { id: number; name: string; contact: string; phone: string; email?: string; address?: string; ville?: string; marque?: string; secteur_activite?: string; date_debut_collaboration?: string; mode_paiement_habituel?: string; delai_paiement?: number; notes?: string; }
interface CustomerTab { id: number; customer_name: string; customer_info: string; total_amount: number; items: unknown[]; }
interface CartItem { product: Product; quantity: number; }
interface SaleOrder { id: number; items: CartItem[]; total: number; payment_method: string; created_at: string; }
interface Stats { today: { total_ventes: number }; total_products: number; total_stock_value: number; low_stock_alerts: number; low_stock_products: Product[]; month_purchases: { total_achats: number }; }

const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';
const SUPERETTE_CATEGORIES = ['Alimentation', 'Boissons', 'Hygiène', 'Ménager', 'Cosmétiques', 'Vêtements', 'Électronique', 'Papeterie', 'Boulangerie', 'Surgelés', 'Autres'];

// ─── Impression reçu de vente ─────────────────────────────────────────────────
const printSaleReceipt = (order: SaleOrder, cashier: string) => {
  const num = `SP-${String(order.id || Date.now()).padStart(5, '0')}`;
  const now = new Date(order.created_at || Date.now());
  const dateStr = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const payLabel: Record<string, string> = { especes: 'Espèces', mobile_money: 'Mobile Money', carte: 'Carte bancaire' };
  const lignes = order.items.map(c =>
    `<div class="row"><span>${c.product.name} × ${c.quantity}</span><span>${fmt(c.product.sell_price * c.quantity)}</span></div>`
  ).join('');
  const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}.center{text-align:center}.bold{font-weight:bold}.row{display:flex;justify-content:space-between;margin:3px 0}.sep{border-top:1px dashed #000;margin:8px 0}.title{font-size:14px;font-weight:bold;text-align:center}.total{display:flex;justify-content:space-between;font-size:14px;font-weight:bold;background:#f5f5f5;padding:6px;margin:4px 0}@media print{body{width:100%}}`;
  const body = `<div class="title">🛒 SUPÉRETTE</div><div class="center" style="font-size:10px">Piscine de Ouangolodougou</div><div class="sep"></div><div class="center bold">REÇU DE VENTE</div><div class="sep"></div><div class="row"><span>N° Reçu :</span><span><b>${num}</b></span></div><div class="row"><span>Date :</span><span>${dateStr}</span></div><div class="row"><span>Heure :</span><span>${heureStr}</span></div><div class="sep"></div><div class="bold" style="margin-bottom:4px">Articles :</div>${lignes}<div class="sep"></div><div class="total"><span>TOTAL :</span><span>${fmt(order.total)}</span></div><div class="row"><span>Paiement :</span><span>${payLabel[order.payment_method] || order.payment_method}</span></div><div class="sep"></div><div class="row"><span>Caissier :</span><span>${cashier}</span></div><div class="center" style="margin-top:10px;font-size:11px;font-style:italic">Merci de votre achat !<br/>À bientôt à la Supérette de Ouangolodougou</div>`;
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
      <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white', textAlign: 'center' }}>✅ Reçu — Supérette</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 2 }}>SUPÉRETTE</Typography>
          <Typography variant="caption" color="text.secondary">Piscine de Ouangolodougou</Typography>
          <Divider sx={{ width: '100%' }} />
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">N° Reçu :</Typography>
              <Typography variant="body2" fontWeight={700}>SP-{String(order.id || '').padStart(5, '0')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Date :</Typography>
              <Typography variant="body2" fontWeight={600}>{new Date(order.created_at || Date.now()).toLocaleDateString('fr-FR')}</Typography>
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
            Merci de votre achat !<br />À bientôt à la Supérette de Ouangolodougou
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
const Superette: React.FC = () => {
  const { user } = useAuth();
  const cashier = (user as any)?.full_name || (user as any)?.username || 'Caissier';

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
  const [receiptOrder, setReceiptOrder] = useState<SaleOrder | null>(null);

  // Dialogs
  const [productDialog, setProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [supplyDialog, setSupplyDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState<Product | null>(null);

  // Supply lines (ligne par ligne comme Maquis)
  const [supplyLines, setSupplyLines] = useState<{ product_id: string; quantity: string; unit_price: string }[]>([
    { product_id: '', quantity: '', unit_price: '' }
  ]);
  const [supplyMeta, setSupplyMeta] = useState({ supplier_id: '', payment_method: 'especes', notes: '' });

  // Forms
  const [productForm, setProductForm] = useState({ name: '', category: 'Alimentation', sell_price: '', buy_price: '', unit: 'unité', min_stock: '0', description: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', email: '', address: '', ville: '', marque: '', secteur_activite: '', date_debut_collaboration: '', mode_paiement_habituel: 'especes', delai_paiement: '30', notes: '' });
  const [checkoutForm, setCheckoutForm] = useState({
    payment_method: 'especes' as 'especes' | 'mobile_money' | 'carte',
    mobile_operator: '' as '' | 'moov' | 'orange' | 'wave' | 'mtn',
    transaction_ref: '',
    tab_id: ''
  });
  const [adjustForm, setAdjustForm] = useState({ new_quantity: '', reason: 'Ajustement inventaire' });
  const [alertAnchorEl, setAlertAnchorEl] = useState<HTMLButtonElement | null>(null);

  const showAlert = (type: 'success' | 'error', msg: string) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000); };

  // ── loadAll indépendant — une erreur ne bloque pas les autres ──────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const p = await superetteApi.getProducts({ active_only: 'true' });
      setProducts(p.data.data || p.data || []);
    } catch (e) { console.error('[superette products]', e); }
    try {
      const s = await superetteApi.getSuppliers();
      setSuppliers(s.data.data || s.data || []);
    } catch (e) { console.error('[superette suppliers]', e); }
    try {
      const ot = await tabsApi.getOpenTabs();
      setOpenTabs(ot.data.data || ot.data || []);
    } catch (e) { console.error('[superette tabs]', e); }
    try {
      const st = await superetteApi.getStats();
      setStats(st.data.data || st.data || null);
    } catch (e) { console.error('[superette stats]', e); }
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
      await superetteApi.createSale({
        items: cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
        payment_method: checkoutForm.tab_id ? 'tab' : checkoutForm.payment_method,
        payment_operator: checkoutForm.payment_method === 'mobile_money' && checkoutForm.mobile_operator ? checkoutForm.mobile_operator : undefined,
        payment_reference: checkoutForm.transaction_ref || undefined,
        tab_id: checkoutForm.tab_id ? parseInt(checkoutForm.tab_id) : undefined
      });
      setCart([]);
      setCheckoutDialog(false);
      setCheckoutForm({ payment_method: 'especes', mobile_operator: '', transaction_ref: '', tab_id: '' });
      loadAll();
      if (checkoutForm.tab_id) {
        showAlert('success', "Articles ajoutés à l'onglet !");
      } else {
        showAlert('success', '✅ Vente encaissée avec succès !');
      }
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  // ── Produits ───────────────────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.sell_price) return showAlert('error', 'Nom et prix de vente requis');
    try {
      const data = {
        name: productForm.name, category: productForm.category,
        sell_price: parseFloat(productForm.sell_price),
        buy_price: parseFloat(productForm.buy_price || '0'),
        unit: productForm.unit, min_stock: parseFloat(productForm.min_stock),
        description: productForm.description
      };
      if (editProduct) { await superetteApi.updateProduct(editProduct.id, data); showAlert('success', 'Produit mis à jour'); }
      else { await superetteApi.createProduct(data); showAlert('success', 'Produit créé'); }
      setProductDialog(false); setEditProduct(null);
      setProductForm({ name: '', category: 'Alimentation', sell_price: '', buy_price: '', unit: 'unité', min_stock: '0', description: '' });
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Désactiver ce produit ?')) return;
    try { await superetteApi.deleteProduct(id); showAlert('success', 'Produit désactivé'); loadAll(); }
    catch { showAlert('error', 'Erreur'); }
  };

  const handleAdjustStock = async () => {
    if (!adjustDialog || adjustForm.new_quantity === '') return;
    try {
      await superetteApi.adjustStock({ product_id: adjustDialog.id, new_quantity: parseFloat(adjustForm.new_quantity), reason: adjustForm.reason });
      showAlert('success', 'Stock ajusté'); setAdjustDialog(null);
      setAdjustForm({ new_quantity: '', reason: 'Ajustement inventaire' }); loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  // ── Approvisionnement ligne par ligne ──────────────────────────────────────
  const addSupplyLine = () => setSupplyLines(l => [...l, { product_id: '', quantity: '', unit_price: '' }]);
  const removeSupplyLine = (idx: number) => setSupplyLines(l => l.filter((_, i) => i !== idx));
  const updateSupplyLine = (idx: number, field: string, value: string) => {
    setSupplyLines(l => l.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod && prod.buy_price > 0) updated.unit_price = String(prod.buy_price);
      }
      return updated;
    }));
  };
  const supplyTotal = supplyLines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);

  const handleSupply = async () => {
    const validLines = supplyLines.filter(l => l.product_id && l.quantity && parseFloat(l.quantity) > 0);
    if (!validLines.length) return showAlert('error', 'Ajoutez au moins un produit avec une quantité');
    try {
      await superetteApi.addStock({
        supplier_id: supplyMeta.supplier_id ? parseInt(supplyMeta.supplier_id) : undefined,
        payment_method: supplyMeta.payment_method,
        notes: supplyMeta.notes,
        items: validLines.map(l => ({ product_id: parseInt(l.product_id), quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price || '0') }))
      });
      showAlert('success', `Approvisionnement enregistré — ${fmt(supplyTotal)}`);
      setSupplyDialog(false);
      setSupplyLines([{ product_id: '', quantity: '', unit_price: '' }]);
      loadAll();
    } catch (e: unknown) {
      showAlert('error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  // ── Fournisseurs ───────────────────────────────────────────────────────────
  const openSupplierDialog = (s?: Supplier) => {
    if (s) {
      setEditSupplier(s);
      setSupplierForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '', address: s.address || '', ville: s.ville || '', marque: s.marque || '', secteur_activite: s.secteur_activite || '', date_debut_collaboration: s.date_debut_collaboration ? s.date_debut_collaboration.split('T')[0] : '', mode_paiement_habituel: s.mode_paiement_habituel || 'especes', delai_paiement: s.delai_paiement ? String(s.delai_paiement) : '30', notes: s.notes || '' });
    } else {
      setEditSupplier(null);
      setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '', ville: '', marque: '', secteur_activite: '', date_debut_collaboration: '', mode_paiement_habituel: 'especes', delai_paiement: '30', notes: '' });
    }
    setSupplierDialog(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) return showAlert('error', 'Le nom du fournisseur est requis');
    try {
      if (editSupplier) {
        await superetteApi.updateSupplier(editSupplier.id, supplierForm);
        showAlert('success', 'Fournisseur mis à jour');
      } else {
        await superetteApi.createSupplier(supplierForm);
        showAlert('success', 'Fournisseur créé avec succès !');
      }
      setSupplierDialog(false); setEditSupplier(null);
      setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '', ville: '', marque: '', secteur_activite: '', date_debut_collaboration: '', mode_paiement_habituel: 'especes', delai_paiement: '30', notes: '' });
      loadAll();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert('error', msg || 'Erreur lors de la création du fournisseur');
    }
  };

  const categories = [...new Set(products.map(p => p.category))];
  const filteredProducts = products
    .filter(p => {
      const matchSearch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) || p.category.toLowerCase().includes(searchText.toLowerCase());
      const matchCat = !filterCat || p.category === filterCat;
      return matchSearch && matchCat;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  // Grouper par catégorie
  const groupedByCategory = (prods: Product[]) => {
    const groups: Record<string, Product[]> = {};
    prods.forEach(p => {
      const cat = p.category || 'Autres';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };
  const groupedForSales = groupedByCategory(filteredProducts.filter(p => p.current_stock > 0));
  const groupedForStock = groupedByCategory([...products].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })));
  const groupedForProducts = groupedByCategory(filteredProducts);

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Alertes stock">
              <IconButton
                color={products.filter(p => p.current_stock <= 0).length > 0 ? 'error' : products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).length > 0 ? 'warning' : 'default'}
                onClick={e => setAlertAnchorEl(e.currentTarget)}
              >
                <Badge badgeContent={products.filter(p => p.current_stock <= 0 || (p.current_stock > 0 && p.current_stock <= p.min_stock)).length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Actualiser'}
            </Button>
          </Box>
        </Box>

        {/* Popover alertes stock */}
        <Popover
          open={Boolean(alertAnchorEl)}
          anchorEl={alertAnchorEl}
          onClose={() => setAlertAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 2, minWidth: 280, maxWidth: 360, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Alertes Stock</Typography>
            {products.filter(p => p.current_stock <= 0).length > 0 && (
              <>
                <Typography variant="caption" color="error.main" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>Rupture de stock</Typography>
                {products.filter(p => p.current_stock <= 0).map(p => (
                  <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, px: 0.5, bgcolor: '#ffebee', borderRadius: 0.5, mb: 0.3 }}>
                    <Typography variant="body2">{p.name}</Typography>
                    <Chip label="0" size="small" color="error" sx={{ fontSize: '0.65rem', height: 18 }} />
                  </Box>
                ))}
              </>
            )}
            {products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).length > 0 && (
              <>
                <Typography variant="caption" color="warning.main" fontWeight={700} sx={{ display: 'block', mb: 0.5, mt: 1 }}>Stock bas</Typography>
                {products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).map(p => (
                  <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, px: 0.5, bgcolor: '#fff8e1', borderRadius: 0.5, mb: 0.3 }}>
                    <Typography variant="body2">{p.name}</Typography>
                    <Chip label={`${p.current_stock} ${p.unit}`} size="small" color="warning" sx={{ fontSize: '0.65rem', height: 18 }} />
                  </Box>
                ))}
              </>
            )}
            {products.filter(p => p.current_stock <= 0 || (p.current_stock > 0 && p.current_stock <= p.min_stock)).length === 0 && (
              <Typography variant="body2" color="text.secondary">Aucune alerte stock</Typography>
            )}
          </Box>
        </Popover>

        {/* Stats */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: "Ventes aujourd'hui", value: fmt(stats.today?.total_ventes || 0), color: '#1565c0' },
              { label: 'Valeur stock', value: fmt(stats.total_stock_value || 0), color: '#2e7d32' },
              { label: 'Alertes stock', value: stats.low_stock_alerts || 0, color: '#f44336' },
              { label: 'Total produits', value: stats.total_products || 0, color: '#f57c00' }
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
          <Tab label="Caisse" />
          <Tab label={<Badge badgeContent={stats?.low_stock_alerts || 0} color="error"><Box sx={{ pr: (stats?.low_stock_alerts || 0) > 0 ? 1.5 : 0 }}>Stock</Box></Badge>} />
          <Tab label="Produits" />
          <Tab label="Approvisionnement" />
          <Tab label="Fournisseurs" />
        </Tabs>

        {/* Tab 0: CAISSE */}
        {activeTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField size="small" placeholder="Rechercher un article..." value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{ flex: 1 }} />
                <Select size="small" value={filterCat} onChange={e => setFilterCat(e.target.value)} displayEmpty sx={{ minWidth: 140 }}>
                  <MenuItem value="">Toutes catégories</MenuItem>
                  {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Stack>
              <Grid container spacing={1}>
                {groupedForSales.map(([cat, prods]) => (
                  <React.Fragment key={cat}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ bgcolor: 'grey.200', px: 1.5, py: 0.5, borderRadius: 1, mt: 0.5 }}>
                        {cat}
                      </Typography>
                    </Grid>
                    {prods.map(p => (
                      <Grid item xs={6} sm={4} md={3} key={p.id}>
                        <Card variant="outlined"
                          sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: '#e3f2fd' } }}
                          onClick={() => addToCart(p)}>
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                            <SuperetteIcon color="primary" />
                            <Typography variant="body2" fontWeight={600} noWrap title={p.name}>{p.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{p.category}</Typography>
                            <Typography fontWeight={700} color="primary">{fmt(p.sell_price)}</Typography>
                            <Chip label={`${p.current_stock} ${p.unit}`} size="small"
                              color={p.current_stock <= p.min_stock ? 'warning' : 'success'}
                              sx={{ mt: 0.5, fontSize: '0.65rem' }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </React.Fragment>
                ))}
                {groupedForSales.length === 0 && (
                  <Grid item xs={12}><Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Aucun produit disponible</Paper></Grid>
                )}
              </Grid>
            </Grid>

            {/* Panier */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>🛒 Panier</Typography>
                {cart.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>Cliquez sur un article pour l'ajouter</Typography>
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

        {/* Tab 1: STOCK */}
        {activeTab === 1 && (
          <Box>
            {stats?.low_stock_products && stats.low_stock_products.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{stats.low_stock_products.length} produit(s) en rupture ou stock bas :</strong> {stats.low_stock_products.map(p => p.name).join(', ')}
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
                    <TableCell align="right"><strong>Valeur</strong></TableCell>
                    <TableCell align="center"><strong>Inventaire</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedForStock.map(([cat, prods]) => (
                    <React.Fragment key={cat}>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ bgcolor: 'grey.200', fontWeight: 700, py: 0.5, px: 1.5 }}>{cat}</TableCell>
                      </TableRow>
                      {prods.map(p => {
                        const pct = p.min_stock > 0 ? Math.min(100, (p.current_stock / p.min_stock) * 100) : 100;
                        const color: 'error' | 'warning' | 'success' = p.current_stock <= 0 ? 'error' : p.current_stock <= p.min_stock ? 'warning' : 'success';
                        return (
                          <TableRow key={p.id} hover sx={{ bgcolor: p.current_stock <= 0 ? '#ffebee' : p.current_stock <= p.min_stock ? '#fff8e1' : 'inherit' }}>
                            <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                            <TableCell><Chip label={p.category} size="small" /></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: p.current_stock <= 0 ? 'error.main' : 'inherit' }}>{p.current_stock} {p.unit}</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>{p.min_stock}</TableCell>
                            <TableCell sx={{ minWidth: 100 }}>
                              <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
                            </TableCell>
                            <TableCell align="right">{fmt(p.current_stock * p.sell_price)}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="Ajuster le stock">
                                <IconButton size="small" color="primary" onClick={() => { setAdjustDialog(p); setAdjustForm({ new_quantity: String(p.current_stock), reason: 'Ajustement inventaire' }); }}>
                                  <AdjustIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {products.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun produit</TableCell></TableRow>}
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
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => { setEditProduct(null); setProductForm({ name: '', category: 'Alimentation', sell_price: '', buy_price: '', unit: 'unité', min_stock: '0', description: '' }); setProductDialog(true); }}>
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
                    <TableCell align="right"><strong>Marge %</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedForProducts.map(([cat, prods]) => (
                    <React.Fragment key={cat}>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ bgcolor: 'grey.200', fontWeight: 700, py: 0.5, px: 1.5 }}>{cat}</TableCell>
                      </TableRow>
                      {prods.map(p => {
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
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="Modifier">
                                  <IconButton size="small" color="primary"
                                    onClick={() => { setEditProduct(p); setProductForm({ name: p.name, category: p.category, sell_price: String(p.sell_price), buy_price: String(p.buy_price), unit: p.unit, min_stock: String(p.min_stock), description: p.description || '' }); setProductDialog(true); }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Désactiver">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteProduct(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {filteredProducts.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun produit</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: APPROVISIONNEMENT */}
        {activeTab === 3 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Enregistrez les livraisons reçues des fournisseurs.</Typography>
              <Button variant="contained" startIcon={<SupplyIcon />}
                onClick={() => { setSupplyLines([{ product_id: '', quantity: '', unit_price: '' }]); setSupplyMeta({ supplier_id: '', payment_method: 'especes', notes: '' }); setSupplyDialog(true); }}>
                Nouvel approvisionnement
              </Button>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Cliquez sur <strong>"Nouvel approvisionnement"</strong> pour sélectionner les produits reçus, indiquer les quantités et prix. Le stock sera mis à jour automatiquement.
            </Alert>
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

        {/* Tab 4: FOURNISSEURS */}
        {activeTab === 4 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openSupplierDialog()}>Nouveau fournisseur</Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Nom / Marque</strong></TableCell>
                    <TableCell><strong>Secteur</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Téléphone</strong></TableCell>
                    <TableCell><strong>Ville</strong></TableCell>
                    <TableCell><strong>Paiement habituel</strong></TableCell>
                    <TableCell><strong>Depuis</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} variant="body2">{s.name}</Typography>
                        {s.marque && <Typography variant="caption" color="text.secondary">{s.marque}</Typography>}
                      </TableCell>
                      <TableCell>{s.secteur_activite || '—'}</TableCell>
                      <TableCell>{s.contact || '—'}</TableCell>
                      <TableCell>{s.phone || '—'}</TableCell>
                      <TableCell>{s.ville || '—'}</TableCell>
                      <TableCell>
                        {s.mode_paiement_habituel === 'especes' ? '💵 Espèces' :
                         s.mode_paiement_habituel === 'mobile_money' ? '📱 Mobile' :
                         s.mode_paiement_habituel === 'credit' ? '📋 Crédit' : s.mode_paiement_habituel || '—'}
                      </TableCell>
                      <TableCell>{s.date_debut_collaboration ? new Date(s.date_debut_collaboration).toLocaleDateString('fr-FR') : '—'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Modifier">
                          <IconButton size="small" color="primary" onClick={() => openSupplierDialog(s)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {suppliers.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 4 }}>Aucun fournisseur enregistré</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* ── DIALOGS ─────────────────────────────────────────────────────────── */}

      {/* Dialog: Encaissement */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ReceiptIcon /> Encaissement — {fmt(cartTotal)}</Box>
        </DialogTitle>
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
            {/* Sélecteur mode de paiement */}
            {!checkoutForm.tab_id && (
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>Mode de paiement :</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button fullWidth variant={checkoutForm.payment_method === 'especes' ? 'contained' : 'outlined'} color="success"
                    onClick={() => setCheckoutForm(f => ({ ...f, payment_method: 'especes', mobile_operator: '', transaction_ref: '' }))} sx={{ py: 1 }}>
                    💵 Espèces
                  </Button>
                  <Button fullWidth variant={checkoutForm.payment_method === 'mobile_money' ? 'contained' : 'outlined'} color="info"
                    onClick={() => setCheckoutForm(f => ({ ...f, payment_method: 'mobile_money', transaction_ref: '' }))} sx={{ py: 1 }}>
                    📱 Mobile Money
                  </Button>
                  <Button fullWidth variant={checkoutForm.payment_method === 'carte' ? 'contained' : 'outlined'}
                    sx={{ py: 1, borderColor: '#9c27b0', color: checkoutForm.payment_method === 'carte' ? 'white' : '#9c27b0', bgcolor: checkoutForm.payment_method === 'carte' ? '#9c27b0' : 'transparent', '&:hover': { bgcolor: '#9c27b020', borderColor: '#9c27b0' } }}
                    onClick={() => setCheckoutForm(f => ({ ...f, payment_method: 'carte', mobile_operator: '', transaction_ref: '' }))}>
                    💳 Carte
                  </Button>
                </Box>
              </Box>
            )}

            {/* Opérateurs Mobile Money */}
            {!checkoutForm.tab_id && checkoutForm.payment_method === 'mobile_money' && (
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>Opérateur :</Typography>
                <Grid container spacing={1}>
                  {[
                    { id: 'moov',   label: 'Moov Money',   color: '#4caf50', textDark: false },
                    { id: 'orange', label: 'Orange Money',  color: '#f4511e', textDark: false },
                    { id: 'wave',   label: 'Wave',          color: '#1565c0', textDark: false },
                    { id: 'mtn',    label: 'MTN Money',     color: '#ffc107', textDark: true  }
                  ].map(op => {
                    const selected = checkoutForm.mobile_operator === op.id;
                    return (
                      <Grid item xs={6} key={op.id}>
                        <Button fullWidth onClick={() => setCheckoutForm(f => ({ ...f, mobile_operator: op.id as typeof f.mobile_operator }))}
                          sx={{ fontWeight: 700, py: 1, bgcolor: selected ? op.color : 'transparent', color: selected ? (op.textDark ? '#333' : 'white') : op.color, borderColor: op.color, border: '1px solid', '&:hover': { bgcolor: `${op.color}22`, borderColor: op.color } }}>
                          {op.label}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {/* Référence transaction (Mobile Money ou Carte) */}
            {!checkoutForm.tab_id && (checkoutForm.payment_method === 'mobile_money' || checkoutForm.payment_method === 'carte') && (
              <TextField
                label={checkoutForm.payment_method === 'carte' ? '💳 Référence carte (7 derniers chiffres)' : '📱 Référence transaction (7 derniers chiffres)'}
                value={checkoutForm.transaction_ref}
                onChange={e => setCheckoutForm(f => ({ ...f, transaction_ref: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                inputProps={{ maxLength: 7, inputMode: 'numeric', pattern: '[0-9]*' }}
                placeholder="Ex : 1234567"
                helperText="Optionnel — lie le reçu à la transaction"
                fullWidth
                size="small"
              />
            )}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog(false)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleCheckout} startIcon={<PaidIcon />}>
            {checkoutForm.tab_id ? "Ajouter à l'onglet" : `💰 Encaisser`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Reçu */}
      <ReceiptDialog order={receiptOrder} cashier={cashier} onClose={() => setReceiptOrder(null)} />

      {/* Dialog: Produit */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nom du produit *" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} fullWidth />
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
                <TextField fullWidth label="Prix de vente (FCFA) *" type="number" value={productForm.sell_price} onChange={e => setProductForm(f => ({ ...f, sell_price: e.target.value }))} />
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

      {/* Dialog: Approvisionnement ligne par ligne */}
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
                  <Select value={supplyMeta.supplier_id} label="Fournisseur (optionnel)"
                    onChange={e => setSupplyMeta(f => ({ ...f, supplier_id: e.target.value }))}>
                    <MenuItem value="">Aucun / Non renseigné</MenuItem>
                    {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Mode de paiement</InputLabel>
                  <Select value={supplyMeta.payment_method} label="Mode de paiement"
                    onChange={e => setSupplyMeta(f => ({ ...f, payment_method: e.target.value }))}>
                    <MenuItem value="especes">💵 Espèces</MenuItem>
                    <MenuItem value="credit">📋 Crédit / Créance</MenuItem>
                    <MenuItem value="mobile_money">📱 Mobile Money</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Produits reçus :</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addSupplyLine} variant="outlined">Ajouter une ligne</Button>
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
                          <TableCell sx={{ minWidth: 220 }}>
                            <Autocomplete
                              size="small"
                              options={[...products].sort((a, b) => a.name.localeCompare(b.name, 'fr'))}
                              getOptionLabel={(p) => `${p.name} (${p.current_stock} ${p.unit})`}
                              value={products.find(p => String(p.id) === line.product_id) || null}
                              onChange={(_, p) => updateSupplyLine(idx, 'product_id', p ? String(p.id) : '')}
                              isOptionEqualToValue={(opt, val) => opt.id === val.id}
                              noOptionsText="Aucun produit trouvé"
                              renderInput={(params) => <TextField {...params} placeholder="Chercher un produit..." />}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={line.quantity} sx={{ width: 90 }}
                              onChange={e => updateSupplyLine(idx, 'quantity', e.target.value)} placeholder="0" inputProps={{ min: 0 }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={line.unit_price} sx={{ width: 120 }}
                              onChange={e => updateSupplyLine(idx, 'unit_price', e.target.value)} placeholder="0" inputProps={{ min: 0 }} />
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
            {supplyTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Alert severity="info" sx={{ py: 0.5 }}><strong>Total : {fmt(supplyTotal)}</strong></Alert>
              </Box>
            )}
            <TextField label="Notes (facultatif)" multiline rows={2} value={supplyMeta.notes}
              onChange={e => setSupplyMeta(f => ({ ...f, notes: e.target.value }))}
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

      {/* Dialog: Ajustement stock */}
      <Dialog open={!!adjustDialog} onClose={() => setAdjustDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Ajustement stock — {adjustDialog?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">Stock actuel : <strong>{adjustDialog?.current_stock} {adjustDialog?.unit}</strong></Alert>
            <TextField label="Nouveau stock réel" type="number" value={adjustForm.new_quantity}
              onChange={e => setAdjustForm(f => ({ ...f, new_quantity: e.target.value }))} required />
            <TextField label="Raison" value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(null)}>Annuler</Button>
          <Button variant="contained" onClick={handleAdjustStock}>Ajuster</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Fournisseur */}
      <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Informations principales */}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">📋 Informations générales</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField label="Nom du fournisseur *" value={supplierForm.name}
                  onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} fullWidth autoFocus />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Marque / Enseigne" value={supplierForm.marque}
                  onChange={e => setSupplierForm(f => ({ ...f, marque: e.target.value }))} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Secteur d'activité" value={supplierForm.secteur_activite}
                  onChange={e => setSupplierForm(f => ({ ...f, secteur_activite: e.target.value }))} fullWidth
                  placeholder="Ex: Alimentaire, Hygiène…" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Date début collaboration" type="date" value={supplierForm.date_debut_collaboration}
                  onChange={e => setSupplierForm(f => ({ ...f, date_debut_collaboration: e.target.value }))} fullWidth
                  InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
            <Divider />
            {/* Contact */}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">📞 Contact</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Responsable (contact)" value={supplierForm.contact}
                  onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Téléphone" value={supplierForm.phone}
                  onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" type="email" value={supplierForm.email}
                  onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Ville" value={supplierForm.ville}
                  onChange={e => setSupplierForm(f => ({ ...f, ville: e.target.value }))} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Adresse complète" multiline rows={2} value={supplierForm.address}
                  onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} fullWidth />
              </Grid>
            </Grid>
            <Divider />
            {/* Conditions commerciales */}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">💳 Conditions commerciales</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Mode de paiement habituel</InputLabel>
                  <Select value={supplierForm.mode_paiement_habituel} label="Mode de paiement habituel"
                    onChange={e => setSupplierForm(f => ({ ...f, mode_paiement_habituel: e.target.value }))}>
                    <MenuItem value="especes">💵 Espèces</MenuItem>
                    <MenuItem value="mobile_money">📱 Mobile Money</MenuItem>
                    <MenuItem value="credit">📋 Crédit / Créance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Délai de paiement (jours)" type="number" value={supplierForm.delai_paiement}
                  onChange={e => setSupplierForm(f => ({ ...f, delai_paiement: e.target.value }))} fullWidth
                  inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Notes (facultatif)" multiline rows={2} value={supplierForm.notes}
                  onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))} fullWidth
                  placeholder="Remarques, conditions spéciales…" />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveSupplier}>{editSupplier ? 'Modifier' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Superette;
