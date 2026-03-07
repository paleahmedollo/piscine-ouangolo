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
  Edit as EditIcon,
  LocalShipping as SupplierIcon,
  ShoppingCart as OrderIcon,
  ReceiptLong as ReceiptIcon,
  CheckCircleOutline as ReceivedIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
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

interface Supplier {
  id: number;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  delai_paiement: number;
  mode_paiement_habituel: string;
  notes?: string;
  is_active: boolean;
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  quantite_recue: number;
  unit_price: number;
  subtotal: number;
  date_expiration?: string;
  product?: { id: number; name: string; unit: string; current_stock: number };
}

interface PurchaseOrder {
  id: number;
  numero_commande: string;
  supplier_id?: number;
  supplier_name: string;
  purchase_date: string;
  date_reception?: string;
  date_echeance?: string;
  reference_facture?: string;
  total_amount: number;
  montant_paye: number;
  reste_a_payer: number;
  statut: 'en_attente' | 'recu' | 'partiel' | 'annule';
  notes?: string;
  items?: OrderItem[];
}

const STATUT_ORDER_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  en_attente: 'warning', recu: 'success', partiel: 'info', annule: 'error'
};
const STATUT_ORDER_LABEL: Record<string, string> = {
  en_attente: 'En attente', recu: 'Reçu', partiel: 'Partiel', annule: 'Annulé'
};

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

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

  // ── Fournisseurs ──────────────────────────────────────────────────────────
  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact: '', phone: '', email: '', address: '',
    delai_paiement: '30', mode_paiement_habituel: 'especes', notes: ''
  });

  // ── Commandes fournisseurs ─────────────────────────────────────────────────
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState<number | ''>('');
  const [orderPurchaseDate, setOrderPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderDateEcheance, setOrderDateEcheance] = useState('');
  const [orderRefFacture, setOrderRefFacture] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: number; product_name: string; quantity: number; unit_price: number; subtotal: number; date_expiration: string;
  }>>([]);
  const [addOrderProductId, setAddOrderProductId] = useState<number | ''>('');
  const [addOrderQty, setAddOrderQty] = useState(1);
  const [addOrderPrice, setAddOrderPrice] = useState('');

  // Réception commande
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, string>>({});

  // Paiement commande fournisseur
  const [openPayOrderDialog, setOpenPayOrderDialog] = useState(false);
  const [payingOrder, setPayingOrder] = useState<PurchaseOrder | null>(null);
  const [payOrderAmount, setPayOrderAmount] = useState('');

  // Détail commande
  const [openOrderDetailDialog, setOpenOrderDetailDialog] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const todayDate = new Date().toISOString().split('T')[0];
    try {
      const [statsRes, clientsRes, productsRes, salesRes, suppliersRes, ordersRes] = await Promise.all([
        depotApi.getStats(),
        depotApi.getClients(),
        depotApi.getProducts(),
        depotApi.getSales({ date: todayDate }),
        depotApi.getSuppliers(),
        depotApi.getOrders()
      ]);
      setStats(statsRes.data?.data || statsRes.data || null);
      setClients(clientsRes.data?.data || clientsRes.data || []);
      setProducts(productsRes.data?.data || productsRes.data || []);
      setSales(salesRes.data?.data || salesRes.data || []);
      setSuppliers(suppliersRes.data?.data || suppliersRes.data || []);
      setOrders(ordersRes.data?.data || ordersRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement des données');
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
      // Paiement à la Caisse sauf si crédit client
      const effectivePaymentMethod = salePaymentMethod === 'credit' ? 'credit' : 'en_attente';
      const res = await depotApi.createSale({
        depot_client_id: selectedClient,
        items: saleItems,
        payment_method: effectivePaymentMethod,
        notes: saleNotes
      });
      setSuccess(`Vente enregistrée${res.data.tab ? ` — Ticket crédit #${res.data.tab.ticket_number}` : salePaymentMethod !== 'credit' ? ' — Paiement à la Caisse' : ''}`);
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

  // ── Fournisseurs ──────────────────────────────────────────────────────────

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '', delai_paiement: '30', mode_paiement_habituel: 'especes', notes: '' });
    setOpenSupplierDialog(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '',
      address: s.address || '', delai_paiement: String(s.delai_paiement || 30),
      mode_paiement_habituel: s.mode_paiement_habituel || 'especes', notes: s.notes || ''
    });
    setOpenSupplierDialog(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) { setError('Nom du fournisseur requis'); return; }
    try {
      const data = { ...supplierForm, delai_paiement: parseInt(supplierForm.delai_paiement) || 30 };
      if (editingSupplier) {
        await depotApi.updateSupplier(editingSupplier.id, data);
        setSuccess('Fournisseur mis à jour');
      } else {
        await depotApi.createSupplier(data);
        setSuccess('Fournisseur créé');
      }
      setOpenSupplierDialog(false);
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  // ── Commandes fournisseurs ────────────────────────────────────────────────

  const openNewOrder = () => {
    setOrderSupplierId('');
    setOrderPurchaseDate(new Date().toISOString().split('T')[0]);
    setOrderDateEcheance('');
    setOrderRefFacture('');
    setOrderNotes('');
    setOrderItems([]);
    setAddOrderProductId('');
    setAddOrderQty(1);
    setAddOrderPrice('');
    setOpenOrderDialog(true);
  };

  const handleAddOrderItem = () => {
    const product = products.find(p => p.id === addOrderProductId);
    if (!product) return;
    const unitPrice = parseFloat(addOrderPrice) || product.price;
    const existing = orderItems.findIndex(i => i.product_id === product.id);
    if (existing >= 0) {
      const updated = [...orderItems];
      updated[existing].quantity += addOrderQty;
      updated[existing].subtotal = updated[existing].quantity * updated[existing].unit_price;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: addOrderQty,
        unit_price: unitPrice,
        subtotal: unitPrice * addOrderQty,
        date_expiration: ''
      }]);
    }
    setAddOrderProductId('');
    setAddOrderQty(1);
    setAddOrderPrice('');
  };

  const handleCreateOrder = async () => {
    if (!orderItems.length) { setError('Ajoutez au moins un article à la commande'); return; }
    try {
      const data = {
        supplier_id: orderSupplierId || undefined,
        purchase_date: orderPurchaseDate,
        date_echeance: orderDateEcheance || undefined,
        reference_facture: orderRefFacture || undefined,
        notes: orderNotes,
        items: orderItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          date_expiration: i.date_expiration || undefined
        }))
      };
      const res = await depotApi.createOrder(data);
      setSuccess(`Commande ${res.data.data.numero_commande} créée`);
      setOpenOrderDialog(false);
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const openReceiveOrder = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    const init: Record<number, string> = {};
    (order.items || []).forEach(item => {
      const restant = parseFloat(String(item.quantity)) - parseFloat(String(item.quantite_recue || 0));
      init[item.id] = String(Math.max(0, restant));
    });
    setReceiveQtys(init);
    setOpenReceiveDialog(true);
  };

  const handleReceiveOrder = async () => {
    if (!receivingOrder) return;
    try {
      const items_received = (receivingOrder.items || [])
        .filter(item => parseFloat(receiveQtys[item.id] || '0') > 0)
        .map(item => ({ purchase_item_id: item.id, quantite_recue: parseFloat(receiveQtys[item.id] || '0') }));
      if (!items_received.length) { setError('Saisissez les quantités reçues'); return; }
      await depotApi.receiveOrder(receivingOrder.id, {
        items_received,
        date_reception: new Date().toISOString().split('T')[0]
      });
      setSuccess('Réception enregistrée — stock mis à jour');
      setOpenReceiveDialog(false);
      setReceivingOrder(null);
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la réception');
    }
  };

  const openPayOrder = (order: PurchaseOrder) => {
    setPayingOrder(order);
    setPayOrderAmount(String(order.reste_a_payer));
    setOpenPayOrderDialog(true);
  };

  const handlePayOrder = async () => {
    if (!payingOrder || !payOrderAmount) return;
    try {
      await depotApi.payOrder(payingOrder.id, { montant: parseFloat(payOrderAmount) });
      setSuccess('Paiement fournisseur enregistré');
      setOpenPayOrderDialog(false);
      setPayingOrder(null);
      setPayOrderAmount('');
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`Annuler la commande ${order.numero_commande} ?`)) return;
    try {
      await depotApi.cancelOrder(order.id);
      setSuccess('Commande annulée');
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const totalOrder = orderItems.reduce((s, i) => s + i.subtotal, 0);

  return (
    <Layout>
    <Box sx={{ p: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DepotIcon sx={{ fontSize: 22, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700}>Dépôt Boissons</Typography>
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
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpIcon color="primary" fontSize="small" />
                <Typography variant="caption" color="text.secondary">Ventes du jour</Typography>
              </Box>
              <Typography variant="h6" fontWeight={700}>{stats?.aujourd_hui.total_ventes ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Cash: {formatCFA(stats?.aujourd_hui.total_cash)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MoneyIcon color="success" fontSize="small" />
                <Typography variant="caption" color="text.secondary">Recette du jour</Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {formatCFA((stats?.aujourd_hui.total_cash ?? 0) + (stats?.aujourd_hui.total_mobile ?? 0))}
              </Typography>
              <Typography variant="caption" color="text.secondary">Mobile: {formatCFA(stats?.aujourd_hui.total_mobile)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CreditIcon color="warning" fontSize="small" />
                <Typography variant="caption" color="text.secondary">Crédit du jour</Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} color="warning.main">{formatCFA(stats?.aujourd_hui.total_credit)}</Typography>
              <Typography variant="caption" color="text.secondary">livraisons à crédit</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WarningIcon color="error" fontSize="small" />
                <Typography variant="caption" color="text.secondary">Crédits en cours</Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} color="error.main">{formatCFA(stats?.total_credit_en_cours.total_en_cours)}</Typography>
              <Typography variant="caption" color="text.secondary">{stats?.total_credit_en_cours.nb_clients_en_credit ?? 0} client(s)</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Ventes" sx={{ minHeight: 44, fontSize: '0.82rem' }} />
          <Tab
            icon={
              <Badge badgeContent={stats?.total_credit_en_cours.nb_clients_en_credit ?? 0} color="error">
                <ClientsIcon fontSize="small" />
              </Badge>
            }
            iconPosition="start"
            label="Clients & Crédits"
            sx={{ minHeight: 44, fontSize: '0.82rem' }}
          />
          <Tab icon={<StockIcon fontSize="small" />} iconPosition="start" label="Stock & Produits" sx={{ minHeight: 44, fontSize: '0.82rem' }} />
          <Tab
            icon={
              <Badge badgeContent={orders.filter(o => o.statut === 'en_attente').length || 0} color="warning">
                <OrderIcon fontSize="small" />
              </Badge>
            }
            iconPosition="start"
            label="Commandes"
            sx={{ minHeight: 44, fontSize: '0.82rem' }}
          />
          <Tab icon={<SupplierIcon fontSize="small" />} iconPosition="start" label="Fournisseurs" sx={{ minHeight: 44, fontSize: '0.82rem' }} />
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

      {/* Tab 3 – Commandes fournisseurs */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 2 }}>
          <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={openNewOrder}>
            Nouvelle commande
          </Button>
        </Box>
        {orders.length === 0 ? (
          <Alert severity="info">Aucune commande fournisseur.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>N° Commande</strong></TableCell>
                  <TableCell><strong>Fournisseur</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell align="right"><strong>Total</strong></TableCell>
                  <TableCell align="right"><strong>Payé</strong></TableCell>
                  <TableCell align="right"><strong>Reste</strong></TableCell>
                  <TableCell align="center"><strong>Statut</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {order.numero_commande}
                      </Typography>
                      {order.reference_facture && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Réf: {order.reference_facture}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.supplier_name || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(order.purchase_date).toLocaleDateString('fr-FR')}
                      </Typography>
                      {order.date_echeance && (
                        <Typography variant="caption" color="error.main" display="block">
                          Échéance: {new Date(order.date_echeance).toLocaleDateString('fr-FR')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatCFA(order.total_amount)}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{formatCFA(order.montant_paye)}</TableCell>
                    <TableCell align="right">
                      {order.reste_a_payer > 0
                        ? <Typography fontWeight={700} color="error.main">{formatCFA(order.reste_a_payer)}</Typography>
                        : <Typography color="success.main">✓ Soldé</Typography>
                      }
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={STATUT_ORDER_LABEL[order.statut] || order.statut}
                        color={STATUT_ORDER_COLOR[order.statut] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Voir le détail">
                          <IconButton size="small" onClick={() => { setViewingOrder(order); setOpenOrderDetailDialog(true); }}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {(order.statut === 'en_attente' || order.statut === 'partiel') && (
                          <Tooltip title="Enregistrer une réception">
                            <IconButton size="small" color="success" onClick={() => openReceiveOrder(order)}>
                              <ReceivedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.reste_a_payer > 0 && order.statut !== 'annule' && (
                          <Tooltip title="Enregistrer un paiement">
                            <IconButton size="small" color="primary" onClick={() => openPayOrder(order)}>
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.statut === 'en_attente' && (
                          <Tooltip title="Annuler la commande">
                            <IconButton size="small" color="error" onClick={() => handleCancelOrder(order)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Tab 4 – Fournisseurs */}
      <TabPanel value={tabValue} index={4}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 2 }}>
          <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={openNewSupplier}>
            Nouveau fournisseur
          </Button>
        </Box>
        {suppliers.length === 0 ? (
          <Alert severity="info">Aucun fournisseur enregistré.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Fournisseur</strong></TableCell>
                  <TableCell><strong>Contact</strong></TableCell>
                  <TableCell><strong>Téléphone</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Délai paiement</strong></TableCell>
                  <TableCell><strong>Mode habituel</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                      {s.address && <Typography variant="caption" color="text.secondary">{s.address}</Typography>}
                    </TableCell>
                    <TableCell>{s.contact || '—'}</TableCell>
                    <TableCell>{s.phone || '—'}</TableCell>
                    <TableCell>{s.email || '—'}</TableCell>
                    <TableCell>
                      <Chip label={`${s.delai_paiement || 30} j`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.mode_paiement_habituel || 'espèces'}
                        size="small"
                        color="default"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEditSupplier(s)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
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
                <InputLabel>Type de vente</InputLabel>
                <Select value={salePaymentMethod} onChange={e => setSalePaymentMethod(e.target.value)} label="Type de vente">
                  <MenuItem value="cash">🏦 Paiement à la Caisse</MenuItem>
                  <MenuItem value="credit">📋 Crédit client (onglet)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              {salePaymentMethod === 'credit' ? (
                <Alert severity="warning" icon={<CreditIcon />}>
                  Cette vente sera enregistrée <strong>à crédit</strong> pour le client. Un onglet sera créé automatiquement.
                </Alert>
              ) : (
                <Alert severity="info">
                  🏦 <strong>Paiement à la Caisse</strong> — La vente sera enregistrée. Le client règle à la Caisse.
                </Alert>
              )}
            </Grid>

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

      {/* ── Dialog: Fournisseur (créer / modifier) ─────────────────────── */}
      <Dialog open={openSupplierDialog} onClose={() => setOpenSupplierDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nom du fournisseur *"
                value={supplierForm.name}
                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Personne contact"
                value={supplierForm.contact}
                onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Téléphone"
                value={supplierForm.phone}
                onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Email"
                type="email"
                value={supplierForm.email}
                onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Adresse"
                value={supplierForm.address}
                onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Délai de paiement (jours)" type="number"
                value={supplierForm.delai_paiement}
                onChange={e => setSupplierForm({ ...supplierForm, delai_paiement: e.target.value })}
                inputProps={{ min: 0 }}
                InputProps={{ endAdornment: <InputAdornment position="end">j</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode de paiement habituel</InputLabel>
                <Select
                  value={supplierForm.mode_paiement_habituel}
                  onChange={e => setSupplierForm({ ...supplierForm, mode_paiement_habituel: e.target.value })}
                  label="Mode de paiement habituel"
                >
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="virement">Virement bancaire</MenuItem>
                  <MenuItem value="cheque">Chèque</MenuItem>
                  <MenuItem value="mobile">Mobile Money</MenuItem>
                  <MenuItem value="credit">Crédit (à terme)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Notes"
                value={supplierForm.notes}
                onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                multiline rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSupplierDialog(false)}>Annuler</Button>
          <Button onClick={handleSaveSupplier} variant="contained" startIcon={<CheckIcon />}>
            {editingSupplier ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Nouvelle commande fournisseur ──────────────────────── */}
      <Dialog open={openOrderDialog} onClose={() => setOpenOrderDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <OrderIcon /> Nouvelle commande fournisseur
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Fournisseur (optionnel)</InputLabel>
                <Select
                  value={orderSupplierId}
                  onChange={e => setOrderSupplierId(e.target.value as number | '')}
                  label="Fournisseur (optionnel)"
                >
                  <MenuItem value=""><em>— Aucun —</em></MenuItem>
                  {suppliers.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Date de commande" type="date"
                value={orderPurchaseDate}
                onChange={e => setOrderPurchaseDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Date d'échéance (optionnel)" type="date"
                value={orderDateEcheance}
                onChange={e => setOrderDateEcheance(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Référence facture (optionnel)"
                value={orderRefFacture}
                onChange={e => setOrderRefFacture(e.target.value)}
              />
            </Grid>

            {/* Ajout d'articles */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}><Typography variant="caption">Ajouter des articles</Typography></Divider>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Produit</InputLabel>
                  <Select
                    value={addOrderProductId}
                    onChange={e => setAddOrderProductId(e.target.value as number | '')}
                    label="Produit"
                  >
                    {products.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small" type="number" label="Quantité"
                  value={addOrderQty}
                  onChange={e => setAddOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  sx={{ width: 100 }}
                />
                <TextField
                  size="small" type="number" label="Prix achat unitaire"
                  value={addOrderPrice}
                  onChange={e => setAddOrderPrice(e.target.value)}
                  placeholder={addOrderProductId ? String(products.find(p => p.id === addOrderProductId)?.price || '') : ''}
                  InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }}
                  sx={{ width: 170 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddOrderItem}
                  disabled={!addOrderProductId}
                  startIcon={<AddIcon />}
                >
                  Ajouter
                </Button>
              </Box>
            </Grid>

            {/* Liste des articles commandés */}
            {orderItems.length > 0 && (
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
                      {orderItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">{formatCFA(item.unit_price)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right"><strong>{formatCFA(item.subtotal)}</strong></TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>TOTAL COMMANDE</strong></TableCell>
                        <TableCell align="right">
                          <Typography color="primary.main" fontWeight={700}>{formatCFA(totalOrder)}</Typography>
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
                fullWidth size="small" label="Notes (optionnel)"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                multiline rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOrderDialog(false)}>Annuler</Button>
          <Button
            onClick={handleCreateOrder}
            variant="contained"
            disabled={orderItems.length === 0}
            startIcon={<CheckIcon />}
          >
            Créer la commande ({formatCFA(totalOrder)})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Réception commande ─────────────────────────────────── */}
      <Dialog open={openReceiveDialog} onClose={() => setOpenReceiveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceivedIcon color="success" /> Réception — {receivingOrder?.numero_commande}
        </DialogTitle>
        <DialogContent>
          {receivingOrder && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Saisissez les quantités effectivement reçues pour chaque article.
                Le stock sera mis à jour automatiquement.
              </Alert>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell align="right">Commandé</TableCell>
                      <TableCell align="right">Déjà reçu</TableCell>
                      <TableCell align="right">Reçu maintenant</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(receivingOrder.items || []).map(item => {
                      const restant = parseFloat(String(item.quantity)) - parseFloat(String(item.quantite_recue || 0));
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.product?.name || `Produit #${item.product_id}`}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            <Typography color={item.quantite_recue > 0 ? 'success.main' : 'text.secondary'}>
                              {item.quantite_recue || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={receiveQtys[item.id] ?? String(Math.max(0, restant))}
                              onChange={e => setReceiveQtys({ ...receiveQtys, [item.id]: e.target.value })}
                              inputProps={{ min: 0, max: restant, step: 1 }}
                              sx={{ width: 90 }}
                              disabled={restant <= 0}
                              helperText={restant <= 0 ? 'Complet' : `max ${restant}`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReceiveDialog(false)}>Annuler</Button>
          <Button onClick={handleReceiveOrder} variant="contained" color="success" startIcon={<ReceivedIcon />}>
            Enregistrer la réception
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Paiement fournisseur ───────────────────────────────── */}
      <Dialog open={openPayOrderDialog} onClose={() => setOpenPayOrderDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon /> Paiement fournisseur
        </DialogTitle>
        <DialogContent>
          {payingOrder && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Commande : <strong>{payingOrder.numero_commande}</strong>
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total commande :</Typography>
                <Typography variant="body2" fontWeight={600}>{formatCFA(payingOrder.total_amount)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Déjà payé :</Typography>
                <Typography variant="body2" color="success.main">{formatCFA(payingOrder.montant_paye)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Reste à payer :</Typography>
                <Typography variant="body2" fontWeight={700} color="error.main">{formatCFA(payingOrder.reste_a_payer)}</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth size="small" label="Montant du paiement *" type="number"
                value={payOrderAmount}
                onChange={e => setPayOrderAmount(e.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }}
                inputProps={{ min: 1, max: payingOrder.reste_a_payer, step: 1 }}
                helperText={`Maximum : ${formatCFA(payingOrder.reste_a_payer)}`}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayOrderDialog(false)}>Annuler</Button>
          <Button
            onClick={handlePayOrder}
            variant="contained"
            color="primary"
            startIcon={<CheckIcon />}
            disabled={!payOrderAmount || parseFloat(payOrderAmount) <= 0}
          >
            Enregistrer le paiement
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Détail commande ────────────────────────────────────── */}
      <Dialog open={openOrderDetailDialog} onClose={() => setOpenOrderDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon /> Détail — {viewingOrder?.numero_commande}
          {viewingOrder && (
            <Chip
              label={STATUT_ORDER_LABEL[viewingOrder.statut] || viewingOrder.statut}
              color={STATUT_ORDER_COLOR[viewingOrder.statut] || 'default'}
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {viewingOrder && (
            <>
              {/* Informations générales */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Fournisseur</Typography>
                  <Typography variant="body2" fontWeight={600}>{viewingOrder.supplier_name || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Date commande</Typography>
                  <Typography variant="body2">{new Date(viewingOrder.purchase_date).toLocaleDateString('fr-FR')}</Typography>
                </Grid>
                {viewingOrder.date_reception && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Date réception</Typography>
                    <Typography variant="body2" color="success.main">{new Date(viewingOrder.date_reception).toLocaleDateString('fr-FR')}</Typography>
                  </Grid>
                )}
                {viewingOrder.date_echeance && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Échéance</Typography>
                    <Typography variant="body2" color="error.main">{new Date(viewingOrder.date_echeance).toLocaleDateString('fr-FR')}</Typography>
                  </Grid>
                )}
                {viewingOrder.reference_facture && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Réf. facture</Typography>
                    <Typography variant="body2">{viewingOrder.reference_facture}</Typography>
                  </Grid>
                )}
                {viewingOrder.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{viewingOrder.notes}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Articles */}
              <Typography variant="subtitle2" gutterBottom>Articles commandés</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell align="right">Prix unit.</TableCell>
                      <TableCell align="right">Commandé</TableCell>
                      <TableCell align="right">Reçu</TableCell>
                      <TableCell align="right">Sous-total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewingOrder.items || []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.product?.name || `Produit #${item.product_id}`}
                          </Typography>
                          {item.date_expiration && (
                            <Typography variant="caption" color="text.secondary">
                              Exp: {new Date(item.date_expiration).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{formatCFA(item.unit_price)}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {item.quantite_recue > 0
                            ? <Typography color={item.quantite_recue >= item.quantity ? 'success.main' : 'warning.main'} fontWeight={600}>{item.quantite_recue}</Typography>
                            : <Typography color="text.disabled">0</Typography>
                          }
                        </TableCell>
                        <TableCell align="right"><strong>{formatCFA(item.subtotal)}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Récapitulatif financier */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxWidth: 300, ml: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total commande :</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatCFA(viewingOrder.total_amount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Montant payé :</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600}>{formatCFA(viewingOrder.montant_paye)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={700}>Reste à payer :</Typography>
                  <Typography variant="body2" fontWeight={700} color={viewingOrder.reste_a_payer > 0 ? 'error.main' : 'success.main'}>
                    {viewingOrder.reste_a_payer > 0 ? formatCFA(viewingOrder.reste_a_payer) : '✓ Soldé'}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOrderDetailDialog(false)} variant="outlined">Fermer</Button>
          {viewingOrder && (viewingOrder.statut === 'en_attente' || viewingOrder.statut === 'partiel') && (
            <Button
              onClick={() => { setOpenOrderDetailDialog(false); openReceiveOrder(viewingOrder); }}
              variant="contained"
              color="success"
              startIcon={<ReceivedIcon />}
            >
              Enregistrer réception
            </Button>
          )}
          {viewingOrder && viewingOrder.reste_a_payer > 0 && viewingOrder.statut !== 'annule' && (
            <Button
              onClick={() => { setOpenOrderDetailDialog(false); openPayOrder(viewingOrder); }}
              variant="contained"
              startIcon={<PaymentIcon />}
            >
              Payer fournisseur
            </Button>
          )}
        </DialogActions>
      </Dialog>

    </Box>
    </Layout>
  );
};

export default Depot;
