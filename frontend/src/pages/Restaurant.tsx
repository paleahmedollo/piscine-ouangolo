import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Switch,
  Tooltip,
  Badge
} from '@mui/material';
import {
  ShoppingCart,
  Add as AddIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Hotel as HotelIcon,
  TableRestaurant as TableIcon,
  Notifications as NotifIcon,
  NotificationsOff as NotifOffIcon,
  DoneAll as DoneAllIcon,
  Kitchen as KitchenIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import PaymentSelector, { PaymentInfo } from '../components/PaymentSelector';
import ClientReceiptDialog, { ClientReceiptData } from '../components/ClientReceiptDialog';
import { useAuth } from '../contexts/AuthContext';
import { restaurantApi, hotelApi } from '../services/api';
import { MenuItem as MenuItemType, Sale, MenuCategory } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderLine { menu_item_id: number; name: string; quantity: number; unit_price: number; }
interface MenuItemForm { name: string; category: MenuCategory; price: number; description: string; }

interface RestaurantTable {
  id: number; numero: number; capacite: number;
  statut: 'libre' | 'occupee' | 'reservee'; notes?: string;
}

interface OrderItemV2 { id: number; nom_plat: string; quantite: number; prix_unitaire: number; }
interface OrderV2 {
  id: number;
  statut: 'nouvelle' | 'en_preparation' | 'prete' | 'payee' | 'annulee';
  order_type?: 'table' | 'livraison';
  table_id?: number; serveuse_id?: number; temps_preparation?: number;
  total: number; notes?: string; created_at: string;
  items?: OrderItemV2[];
  table?: { id: number; numero: number };
  serveuse?: { id: number; full_name: string };
}

interface RestaurantNotif {
  id: number;
  type: 'preparation' | 'prete' | 'annulee';
  message: string; is_read: boolean; created_at: string;
  order?: { id: number; table?: { numero: number } };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
const quantities = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const categoryLabels: Record<MenuCategory, string> = {
  entree: 'Entrées', plat: 'Plats', dessert: 'Desserts', boisson: 'Boissons', snack: 'Snacks'
};

const tableStatutConfig: Record<string, { label: string; color: 'success' | 'error' | 'primary'; border: string; bg: string }> = {
  libre:    { label: 'Libre',     color: 'success', border: '#4caf50', bg: '#e8f5e9' },
  occupee:  { label: 'Occupée',   color: 'error',   border: '#f44336', bg: '#ffebee' },
  reservee: { label: 'Réservée',  color: 'primary', border: '#2196f3', bg: '#e3f2fd' },
};

const orderStatutConfig: Record<string, { label: string; emoji: string; color: string }> = {
  nouvelle:       { label: 'Nouvelle',       emoji: '🔴', color: '#f44336' },
  en_preparation: { label: 'En préparation', emoji: '🟠', color: '#ff9800' },
  prete:          { label: 'Prête',           emoji: '🟢', color: '#4caf50' },
  payee:          { label: 'Payée',           emoji: '⚫', color: '#9e9e9e' },
  annulee:        { label: 'Annulée',         emoji: '❌', color: '#9e9e9e' },
};

// ── Component ──────────────────────────────────────────────────────────────────
const Restaurant: React.FC = () => {
  const { hasPermission, user } = useAuth();

  // ── Tabs (string-based) ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>('commande');

  // ── Receipt ──────────────────────────────────────────────────────────────────
  const [clientReceiptOpen, setClientReceiptOpen] = useState(false);
  const [clientReceiptData, setClientReceiptData] = useState<ClientReceiptData | null>(null);

  // ── Menu + Sales (V1) ────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuItemType[]>([]);
  const [menuByCategory, setMenuByCategory] = useState<Record<string, MenuItemType[]>>({});
  const [sales, setSales] = useState<Sale[]>([]);
  const [openSales, setOpenSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<{ total_ventes: number; total_montant: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Commande V1 ──────────────────────────────────────────────────────────────
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [v1OrderType, setV1OrderType] = useState<'table' | 'livraison' | 'hotel'>('table');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [occupiedRooms, setOccupiedRooms] = useState<{ id: number; number: string; type: string; guest_name?: string; check_in?: string; check_out?: string }[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // ── Tickets ouverts (V1) ─────────────────────────────────────────────────────
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingSale, setClosingSale] = useState<Sale | null>(null);
  const [closePaymentInfo, setClosePaymentInfo] = useState<PaymentInfo>({ method: 'especes' });
  const [closeLoading, setCloseLoading] = useState(false);

  // ── Gestion menu ─────────────────────────────────────────────────────────────
  const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItemType | null>(null);
  const [menuItemForm, setMenuItemForm] = useState<MenuItemForm>({ name: '', category: 'plat', price: 0, description: '' });
  const [menuItemLoading, setMenuItemLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMenuItem, setDeletingMenuItem] = useState<MenuItemType | null>(null);
  const [allMenu, setAllMenu] = useState<MenuItemType[]>([]);

  // ── Tables V2 ────────────────────────────────────────────────────────────────
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderV2[]>([]);

  // Dialog créer table
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableForm, setTableForm] = useState({ numero: '', capacite: '4', notes: '' });
  const [tableFormLoading, setTableFormLoading] = useState(false);

  // Dialog commande V2 (liée à une table ou livraison)
  const [v2OrderDialogOpen, setV2OrderDialogOpen] = useState(false);
  const [v2OrderType, setV2OrderType] = useState<'table' | 'livraison'>('table');
  const [v2SelectedTable, setV2SelectedTable] = useState<RestaurantTable | null>(null);
  const [v2OrderLines, setV2OrderLines] = useState<OrderLine[]>([]);
  const [v2Notes, setV2Notes] = useState('');
  const [v2OrderLoading, setV2OrderLoading] = useState(false);

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<RestaurantNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const [notifsDialogOpen, setNotifsDialogOpen] = useState(false);

  // ── Cuisine (vue cuisine intégrée) ────────────────────────────────────────
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [ackOrder, setAckOrder] = useState<OrderV2 | null>(null);
  const [selectedPrepTime, setSelectedPrepTime] = useState<15 | 25 | 45>(15);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ── Snackbar ──────────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const showSnack = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  // ── Fetch ──────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [menuRes, allMenuRes, salesRes, openSalesRes, statsRes, tablesRes, activeOrdersRes] = await Promise.all([
        restaurantApi.getMenu({ available_only: 'true' }),
        restaurantApi.getMenu(),
        restaurantApi.getSales(),
        restaurantApi.getOpenSales(),
        restaurantApi.getSaleStats(),
        restaurantApi.getTables().catch(() => ({ data: { data: [] } })),
        restaurantApi.getActiveOrders().catch(() => ({ data: { data: [] } })),
      ]);
      setMenu(menuRes.data.data.items);
      setMenuByCategory(menuRes.data.data.byCategory);
      setAllMenu(allMenuRes.data.data.items);
      setSales(salesRes.data.data.sales);
      setOpenSales(openSalesRes.data.data.sales);
      setStats(statsRes.data.data);
      setTables(tablesRes.data?.data || []);
      setActiveOrders(activeOrdersRes.data?.data || []);
    } catch (err) {
      console.error('Erreur chargement restaurant:', err);
      showSnack('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await restaurantApi.getNotifications().catch(() => null);
      if (res) {
        const notifs: RestaurantNotif[] = res.data?.data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    } catch { /* silencieux */ }
  }, []);

  const fetchActiveOrders = useCallback(async () => {
    try {
      const [ordersRes, tablesRes] = await Promise.all([
        restaurantApi.getActiveOrders().catch(() => null),
        restaurantApi.getTables().catch(() => null)
      ]);
      if (ordersRes) setActiveOrders(ordersRes.data?.data || []);
      if (tablesRes) setTables(tablesRes.data?.data || []);
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    fetchData();
    fetchNotifications();
    fetchActiveOrders();
    const notifInterval = setInterval(fetchNotifications, 5000);
    const ordersInterval = setInterval(fetchActiveOrders, 5000);
    return () => { clearInterval(notifInterval); clearInterval(ordersInterval); };
  }, [fetchData, fetchNotifications, fetchActiveOrders]);

  useEffect(() => {
    if (menu.length > 0 && orderLines.length === 0) {
      setOrderLines(menu.map(item => ({ menu_item_id: item.id, name: item.name, quantity: 0, unit_price: item.price })));
    }
  }, [menu]);

  // ── Commande V1 handlers ───────────────────────────────────────────────────
  const updateQuantity = (menuItemId: number, qty: number) =>
    setOrderLines(prev => prev.map(l => l.menu_item_id === menuItemId ? { ...l, quantity: qty } : l));
  const getActiveLines = () => orderLines.filter(l => l.quantity > 0);
  const getSubtotal = () => orderLines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const getDiscount = () => {
    const sub = getSubtotal();
    if (discountType === 'percent' && discountValue > 0) return Math.round(sub * discountValue / 100);
    if (discountType === 'fixed' && discountValue > 0) return Math.min(discountValue, sub);
    return 0;
  };
  const getTotal = () => getSubtotal() - getDiscount();
  const resetOrder = () => {
    setOrderLines(menu.map(item => ({ menu_item_id: item.id, name: item.name, quantity: 0, unit_price: item.price })));
    setTableNumber(''); setDiscountType('none'); setDiscountValue(0);
    setRoomNumberInput(''); setV1OrderType('table');
  };

  const loadOccupiedRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await hotelApi.getRooms({ status: 'occupee' });
      setOccupiedRooms(res.data.data || res.data || []);
    } catch { setOccupiedRooms([]); } finally { setLoadingRooms(false); }
  };

  const handleCheckout = async () => {
    if (getActiveLines().length === 0) return;
    if (!hasPermission('restaurant', 'ventes')) { showSnack('Non autorisé', 'error'); return; }
    if (v1OrderType === 'hotel' && !roomNumberInput.trim()) { showSnack('Veuillez sélectionner une chambre', 'error'); return; }
    try {
      setCheckoutLoading(true);
      await restaurantApi.createSale({
        items: getActiveLines().map(l => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
        table_number: v1OrderType === 'table' ? (tableNumber || undefined) : undefined,
        room_number: v1OrderType === 'hotel' ? roomNumberInput.trim() : undefined,
        order_type: v1OrderType === 'hotel' ? 'table' : v1OrderType,
      });
      const msg = v1OrderType === 'hotel'
        ? `Facturé à la chambre ${roomNumberInput}`
        : v1OrderType === 'livraison'
        ? '🛵 Commande à livrer envoyée en cuisine'
        : 'Ticket ouvert — en attente d\'encaissement';
      showSnack(msg);
      resetOrder(); setConfirmDialogOpen(false); fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showSnack(e.response?.data?.message || 'Erreur lors de la commande', 'error');
    } finally { setCheckoutLoading(false); }
  };

  const handleCloseSale = async () => {
    if (!closingSale) return;
    try {
      setCloseLoading(true);
      const res = await restaurantApi.closeSale(closingSale.id, {
        payment_method: closePaymentInfo.method,
        payment_operator: closePaymentInfo.operator,
        payment_reference: closePaymentInfo.reference
      });
      const closedSale = res.data.data;
      showSnack('Ticket encaissé avec succès');
      setClientReceiptData({
        type: 'restaurant',
        items: closedSale.items_json.map((i: { name: string; quantity: number; unit_price: number; total: number }) => ({
          name: i.name, quantity: i.quantity, unit_price: i.unit_price, total: i.total
        })),
        total: closedSale.total, paymentMethod: closePaymentInfo.method,
        tableNumber: closedSale.table_number || undefined,
        cashierName: user?.full_name || user?.username || 'Caissier'
      });
      setClientReceiptOpen(true);
      setCloseDialogOpen(false); setClosingSale(null); fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showSnack(e.response?.data?.message || 'Erreur lors de l\'encaissement', 'error');
    } finally { setCloseLoading(false); }
  };

  // ── Gestion menu handlers ──────────────────────────────────────────────────
  const openAddMenuItem = () => { setEditingMenuItem(null); setMenuItemForm({ name: '', category: 'plat', price: 0, description: '' }); setMenuItemDialogOpen(true); };
  const openEditMenuItem = (item: MenuItemType) => { setEditingMenuItem(item); setMenuItemForm({ name: item.name, category: item.category, price: item.price, description: item.description || '' }); setMenuItemDialogOpen(true); };

  const handleSaveMenuItem = async () => {
    if (!menuItemForm.name || menuItemForm.price <= 0) { showSnack('Nom et prix requis', 'error'); return; }
    try {
      setMenuItemLoading(true);
      if (editingMenuItem) await restaurantApi.updateMenuItem(editingMenuItem.id, menuItemForm);
      else await restaurantApi.createMenuItem(menuItemForm);
      showSnack(editingMenuItem ? 'Plat modifié' : 'Plat ajouté');
      setMenuItemDialogOpen(false); fetchData();
    } catch { showSnack('Erreur lors de la sauvegarde', 'error'); } finally { setMenuItemLoading(false); }
  };

  const handleToggleAvailability = async (item: MenuItemType) => {
    try {
      await restaurantApi.toggleAvailability(item.id);
      showSnack(item.is_available ? 'Plat désactivé' : 'Plat activé');
      fetchData();
    } catch { showSnack('Erreur', 'error'); }
  };

  const handleDeleteMenuItem = async () => {
    if (!deletingMenuItem) return;
    try {
      await restaurantApi.deleteMenuItem(deletingMenuItem.id);
      showSnack('Plat supprimé'); setDeleteDialogOpen(false); setDeletingMenuItem(null); fetchData();
    } catch { showSnack('Erreur lors de la suppression', 'error'); }
  };

  const openReceiptForSale = (sale: Sale) => {
    setClientReceiptData({
      type: 'restaurant',
      items: sale.items_json.map(i => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price, total: i.total })),
      total: sale.total, paymentMethod: sale.payment_method,
      tableNumber: sale.table_number || undefined,
      cashierName: user?.full_name || user?.username || 'Caissier'
    });
    setClientReceiptOpen(true);
  };

  // ── Tables V2 handlers ────────────────────────────────────────────────────
  const handleSaveTable = async () => {
    if (!tableForm.numero) { showSnack('Numéro de table requis', 'error'); return; }
    try {
      setTableFormLoading(true);
      if (editingTable) {
        await restaurantApi.updateTable(editingTable.id, {
          numero: parseInt(tableForm.numero),
          capacite: parseInt(tableForm.capacite) || 4,
          notes: tableForm.notes || undefined
        });
        showSnack('Table modifiée');
      } else {
        await restaurantApi.createTable({
          numero: parseInt(tableForm.numero),
          capacite: parseInt(tableForm.capacite) || 4,
          notes: tableForm.notes || undefined
        });
        showSnack('Table créée');
      }
      setTableDialogOpen(false); fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showSnack(e.response?.data?.message || 'Erreur', 'error');
    } finally { setTableFormLoading(false); }
  };

  const handleChangeTableStatus = async (table: RestaurantTable, newStatus: 'libre' | 'occupee' | 'reservee') => {
    try {
      await restaurantApi.updateTableStatus(table.id, newStatus as 'libre' | 'occupee' | 'reservee');
      showSnack(`Table ${table.numero} — ${tableStatutConfig[newStatus].label}`);
      fetchData();
    } catch { showSnack('Erreur', 'error'); }
  };

  // Ouvrir le dialog de commande V2 pour une table
  const openV2OrderDialog = (table?: RestaurantTable | null) => {
    setV2SelectedTable(table || null);
    setV2OrderType('table');
    setV2OrderLines(menu.map(item => ({ menu_item_id: item.id, name: item.name, quantity: 0, unit_price: item.price })));
    setV2Notes('');
    setV2OrderDialogOpen(true);
  };

  const getV2ActiveLines = () => v2OrderLines.filter(l => l.quantity > 0);
  const getV2Total = () => v2OrderLines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  const handleCreateV2Order = async () => {
    const lines = getV2ActiveLines();
    if (lines.length === 0) { showSnack('Sélectionnez au moins un plat', 'error'); return; }
    if (v2OrderType === 'table' && !v2SelectedTable) { showSnack('Veuillez sélectionner une table', 'error'); return; }
    try {
      setV2OrderLoading(true);
      await restaurantApi.createOrder({
        table_id: v2OrderType === 'table' ? v2SelectedTable?.id : undefined,
        order_type: v2OrderType,
        items: lines.map(l => ({ menu_item_id: l.menu_item_id, nom_plat: l.name, quantite: l.quantity, prix_unitaire: l.unit_price })),
        notes: v2Notes || undefined
      });
      const msg = v2OrderType === 'livraison'
        ? '🛵 Commande à livrer envoyée en cuisine !'
        : `🍽️ Commande envoyée — Table ${v2SelectedTable?.numero}`;
      showSnack(msg);
      setV2OrderDialogOpen(false); fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showSnack(e.response?.data?.message || 'Erreur lors de la commande', 'error');
    } finally { setV2OrderLoading(false); }
  };

  // ── Cuisine handlers ──────────────────────────────────────────────────────
  const handleAcknowledgeOrder = async () => {
    if (!ackOrder) return;
    try {
      setActionLoading(ackOrder.id);
      await restaurantApi.acknowledgeOrder(ackOrder.id, selectedPrepTime);
      showSnack(`Commande #${ackOrder.id} prise en charge — ${selectedPrepTime} min`);
      setAckDialogOpen(false); setAckOrder(null);
      fetchActiveOrders();
    } catch { showSnack('Erreur', 'error'); } finally { setActionLoading(null); }
  };

  const handleMarkOrderReady = async (order: OrderV2) => {
    try {
      setActionLoading(order.id);
      await restaurantApi.markOrderReady(order.id);
      showSnack(`Commande #${order.id} — Prête à servir ! 🟢`);
      fetchActiveOrders();
    } catch { showSnack('Erreur', 'error'); } finally { setActionLoading(null); }
  };

  // ── Notifications handlers ────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      setMarkingRead(true);
      await restaurantApi.markNotificationsRead();
      fetchNotifications();
    } catch { showSnack('Erreur', 'error'); } finally { setMarkingRead(false); }
  };

  const notifTypeConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error'; emoji: string }> = {
    preparation: { label: 'En préparation', color: 'warning', emoji: '🟠' },
    prete:       { label: 'Prête à servir', color: 'success', emoji: '🟢' },
    annulee:     { label: 'Annulée',         color: 'error',   emoji: '❌' },
  };

  // ── Calcul onglets visibles ────────────────────────────────────────────────
  const isGerant = user?.role === 'gerant' || user?.role === 'admin' || user?.role === 'directeur';

  if (loading) {
    return (
      <Layout title="Restaurant">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </Layout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout title="Restaurant">
      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography color="text.secondary" variant="body2">Ventes du jour</Typography>
            <Typography variant="h5">{stats?.total_ventes || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography color="text.secondary" variant="body2">Recette du jour</Typography>
            <Typography variant="h5">{formatCurrency(stats?.total_montant || 0)}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography color="text.secondary" variant="body2">Tables occupées</Typography>
            <Typography variant="h5" color={tables.filter(t => t.statut === 'occupee').length > 0 ? 'error.main' : 'text.primary'}>
              {tables.filter(t => t.statut === 'occupee').length} / {tables.length}
            </Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography color="text.secondary" variant="body2">Commandes actives</Typography>
            <Typography variant="h5" color={activeOrders.length > 0 ? 'warning.main' : 'text.primary'}>
              {activeOrders.length}
            </Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* ── Tabs + cloche notification ────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', alignItems: 'flex-end' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ flex: 1 }}>
          {hasPermission('restaurant', 'ventes') && <Tab label="Nouvelle Commande" value="commande" />}
          {hasPermission('restaurant', 'ventes') && (
            <Tab
              label={openSales.filter(s => !s.room_number).length > 0
                ? `Tickets (${openSales.filter(s => !s.room_number).length})`
                : 'Tickets'}
              value="tickets"
              sx={{ color: openSales.filter(s => !s.room_number).length > 0 ? 'warning.main' : 'inherit' }}
            />
          )}
          <Tab
            value="tables"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TableIcon fontSize="small" />
                <span>Tables</span>
              </Box>
            }
          />
          <Tab
            value="cuisine"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <KitchenIcon fontSize="small" />
                <span>Cuisine</span>
                {activeOrders.filter(o => o.statut === 'nouvelle').length > 0 && (
                  <Chip
                    label={activeOrders.filter(o => o.statut === 'nouvelle').length}
                    color="error" size="small"
                    sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Ventes" value="ventes" />
          {hasPermission('restaurant', 'gestion_menu') && <Tab label="Menu" value="menu" />}
        </Tabs>
        {/* Cloche notifications */}
        <Tooltip title={unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications cuisine'}>
          <IconButton
            onClick={() => { setNotifsDialogOpen(true); }}
            color={unreadCount > 0 ? 'error' : 'default'}
            sx={{ mb: 0.5, mr: 0.5 }}
          >
            <Badge badgeContent={unreadCount} color="error" max={9}>
              <NotifIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      {/* ══ Onglet : Nouvelle Commande (V1) ══════════════════════════════════ */}
      {activeTab === 'commande' && hasPermission('restaurant', 'ventes') && (
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" fontWeight="bold">Liste des Plats</Typography>
                {getActiveLines().length > 0 && (
                  <Button variant="contained" startIcon={<ShoppingCart />} onClick={() => setConfirmDialogOpen(true)}>
                    Valider ({formatCurrency(getTotal())})
                  </Button>
                )}
              </Box>

              {Object.entries(menuByCategory).map(([category, items]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, pb: 0.5, borderBottom: '2px solid', borderColor: 'primary.main', color: 'primary.main' }}>
                    {categoryLabels[category as MenuCategory] || category}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell width="40%"><strong>Plat</strong></TableCell>
                          <TableCell width="25%"><strong>Prix (FCFA)</strong></TableCell>
                          <TableCell width="20%"><strong>Quantité</strong></TableCell>
                          <TableCell width="15%" align="right"><strong>Sous-total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map(item => {
                          const line = orderLines.find(l => l.menu_item_id === item.id);
                          const qty = line?.quantity || 0;
                          return (
                            <TableRow key={item.id} sx={{ backgroundColor: qty > 0 ? '#e3f2fd' : 'inherit', '&:hover': { backgroundColor: qty > 0 ? '#bbdefb' : '#f5f5f5' } }}>
                              <TableCell>
                                <Typography fontWeight={qty > 0 ? 'bold' : 'normal'}>{item.name}</Typography>
                                {item.description && <Typography variant="caption" color="text.secondary">{item.description}</Typography>}
                              </TableCell>
                              <TableCell><Typography sx={{ backgroundColor: '#f5f5f5', px: 1, py: 0.5, borderRadius: 1, color: 'text.secondary' }}>{formatCurrency(item.price)}</Typography></TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 70 }}>
                                  <Select value={qty} onChange={e => updateQuantity(item.id, e.target.value as number)}>
                                    {quantities.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="right">
                                {qty > 0 ? <Typography fontWeight="bold" color="primary">{formatCurrency(qty * item.price)}</Typography> : <Typography color="text.secondary">—</Typography>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}

              {getActiveLines().length > 0 && (
                <Card variant="outlined" sx={{ mt: 2, backgroundColor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Résumé de la commande</Typography>
                    <Divider sx={{ my: 1 }} />
                    {getActiveLines().map(l => (
                      <Box key={l.menu_item_id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{l.name} × {l.quantity}</Typography>
                        <Typography fontWeight="bold">{formatCurrency(l.quantity * l.unit_price)}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', my: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Remise</InputLabel>
                        <Select value={discountType} label="Remise" onChange={e => { setDiscountType(e.target.value as 'none' | 'percent' | 'fixed'); setDiscountValue(0); }}>
                          <MenuItem value="none">Aucune</MenuItem>
                          <MenuItem value="percent">Pourcentage (%)</MenuItem>
                          <MenuItem value="fixed">Montant (FCFA)</MenuItem>
                        </Select>
                      </FormControl>
                      {discountType !== 'none' && (
                        <TextField size="small" type="number" label={discountType === 'percent' ? '%' : 'FCFA'} value={discountValue}
                          onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} sx={{ width: 100 }} inputProps={{ min: 0, max: discountType === 'percent' ? 100 : undefined }} />
                      )}
                      {getDiscount() > 0 && <Typography color="error.main" fontWeight="bold">-{formatCurrency(getDiscount())}</Typography>}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">TOTAL</Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">{formatCurrency(getTotal())}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ══ Onglet : Tickets ouverts (V1) ════════════════════════════════════ */}
      {activeTab === 'tickets' && hasPermission('restaurant', 'ventes') && (
        <Box>
          {openSales.filter(s => !s.room_number).length === 0 ? (
            <Alert severity="info">Aucun ticket ouvert pour le moment.</Alert>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Tickets en attente d'encaissement</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#fff8e1' }}>
                        <TableCell><strong>Heure</strong></TableCell>
                        <TableCell><strong>Serveur</strong></TableCell>
                        <TableCell><strong>Articles</strong></TableCell>
                        <TableCell><strong>Table</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                        <TableCell align="center"><strong>Action</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {openSales.filter(s => !s.room_number).map(sale => (
                        <TableRow key={sale.id} hover sx={{ backgroundColor: '#fffde7' }}>
                          <TableCell>{new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell>{sale.user?.full_name || '—'}</TableCell>
                          <TableCell>{sale.items_json.map(i => `${i.name} ×${i.quantity}`).join(', ')}</TableCell>
                          <TableCell>{sale.table_number || '—'}</TableCell>
                          <TableCell align="right"><Typography fontWeight="bold" color="primary">{formatCurrency(sale.total)}</Typography></TableCell>
                          <TableCell align="center">
                            <Button variant="contained" color="success" size="small" onClick={() => { setClosingSale(sale); setClosePaymentInfo({ method: 'especes' }); setCloseDialogOpen(true); }}>
                              Encaisser
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ══ Onglet : Tables ══════════════════════════════════════════════════ */}
      {activeTab === 'tables' && (
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" fontWeight="bold">Plan des Tables</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Bouton commande rapide (sans pré-sélection de table) */}
              {hasPermission('restaurant', 'ventes') && menu.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openV2OrderDialog(null)}
                >
                  + Nouvelle commande
                </Button>
              )}
              {isGerant && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setEditingTable(null); setTableForm({ numero: '', capacite: '4', notes: '' }); setTableDialogOpen(true); }}>
                  Ajouter une table
                </Button>
              )}
            </Box>
          </Box>

          {/* Légende */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip size="small" label="Libre" sx={{ backgroundColor: '#e8f5e9', border: '1px solid #4caf50', fontWeight: 'bold' }} />
            <Chip size="small" label="Occupée" sx={{ backgroundColor: '#ffebee', border: '1px solid #f44336', fontWeight: 'bold' }} />
            <Chip size="small" label="Réservée" sx={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3', fontWeight: 'bold' }} />
          </Box>

          {tables.length === 0 ? (
            <Alert severity="info">
              Aucune table configurée.{isGerant ? ' Cliquez sur "Ajouter une table" pour commencer.' : ' Le gérant doit configurer les tables.'}
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {tables.map(table => {
                const cfg = tableStatutConfig[table.statut];
                const tableOrders = activeOrders.filter(o => o.table?.id === table.id);
                return (
                  <Grid item xs={6} sm={4} md={3} key={table.id}>
                    <Card sx={{ border: `2px solid ${cfg.border}`, backgroundColor: cfg.bg, height: '100%' }}>
                      <CardContent>
                        {/* Numero + statut */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h3" fontWeight="bold">{table.numero}</Typography>
                          <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 'bold' }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">{table.capacite} couverts</Typography>
                        {table.notes && <Typography variant="caption" color="text.secondary">{table.notes}</Typography>}

                        {/* Commandes actives */}
                        {tableOrders.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {tableOrders.map(o => {
                              const sc = orderStatutConfig[o.statut];
                              return (
                                <Chip key={o.id} size="small" label={`${sc.emoji} ${sc.label}`}
                                  sx={{ fontSize: '0.7rem', mb: 0.5, backgroundColor: 'rgba(255,255,255,0.7)' }} />
                              );
                            })}
                          </Box>
                        )}

                        {/* Actions */}
                        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {/* Créer commande (serveuse sur table libre ou occupée) */}
                          {hasPermission('restaurant', 'ventes') && table.statut !== 'reservee' && (
                            <Button size="small" variant="contained" fullWidth startIcon={<AddIcon />}
                              onClick={() => openV2OrderDialog(table)} sx={{ fontSize: '0.75rem' }}>
                              Nouvelle commande
                            </Button>
                          )}
                          {/* Changer statut (gérant) */}
                          {isGerant && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {table.statut !== 'libre' && (
                                <Button size="small" variant="outlined" color="success" fullWidth
                                  onClick={() => handleChangeTableStatus(table, 'libre')} sx={{ fontSize: '0.65rem' }}>
                                  Libérer
                                </Button>
                              )}
                              {table.statut !== 'reservee' && (
                                <Button size="small" variant="outlined" color="primary" fullWidth
                                  onClick={() => handleChangeTableStatus(table, 'reservee')} sx={{ fontSize: '0.65rem' }}>
                                  Réserver
                                </Button>
                              )}
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={() => { setEditingTable(table); setTableForm({ numero: String(table.numero), capacite: String(table.capacite), notes: table.notes || '' }); setTableDialogOpen(true); }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ══ Onglet : Cuisine ══════════════════════════════════════════════════ */}
      {activeTab === 'cuisine' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              🍳 Commandes en cuisine
              {activeOrders.length > 0 && (
                <Chip label={activeOrders.length} size="small" color="warning" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Button size="small" variant="outlined" onClick={fetchActiveOrders}>Actualiser</Button>
          </Box>

          {activeOrders.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Aucune commande en cours. La cuisine est libre !
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {/* ── Nouvelles ── */}
              {activeOrders.filter(o => o.statut === 'nouvelle').length > 0 && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#f44336' }}>
                    🔴 Nouvelles ({activeOrders.filter(o => o.statut === 'nouvelle').length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activeOrders.filter(o => o.statut === 'nouvelle').map(order => (
                      <Card key={order.id} sx={{ border: '2px solid #f44336', backgroundColor: '#fff8f8' }}>
                        <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography fontWeight="bold">
                              {order.table ? `Table ${order.table.numero}` : order.order_type === 'livraison' ? '🛵 À livrer' : `#${order.id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                          {order.items && order.items.map(item => (
                            <Typography key={item.id} variant="body2">
                              × {item.quantite} {item.nom_plat}
                            </Typography>
                          ))}
                          {order.notes && (
                            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                              📝 {order.notes}
                            </Typography>
                          )}
                          <Button
                            fullWidth variant="contained" color="error" size="small"
                            sx={{ mt: 1, fontSize: '0.75rem' }}
                            disabled={actionLoading === order.id}
                            onClick={() => { setAckOrder(order); setSelectedPrepTime(15); setAckDialogOpen(true); }}
                          >
                            {actionLoading === order.id ? <CircularProgress size={16} /> : '✋ Accuser réception'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Grid>
              )}

              {/* ── En préparation ── */}
              {activeOrders.filter(o => o.statut === 'en_preparation').length > 0 && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#ff9800' }}>
                    🟠 En préparation ({activeOrders.filter(o => o.statut === 'en_preparation').length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activeOrders.filter(o => o.statut === 'en_preparation').map(order => (
                      <Card key={order.id} sx={{ border: '2px solid #ff9800', backgroundColor: '#fff8f0' }}>
                        <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography fontWeight="bold">
                              {order.table ? `Table ${order.table.numero}` : order.order_type === 'livraison' ? '🛵 À livrer' : `#${order.id}`}
                            </Typography>
                            {order.temps_preparation && (
                              <Chip icon={<TimeIcon />} label={`${order.temps_preparation} min`} size="small" color="warning" />
                            )}
                          </Box>
                          {order.items && order.items.map(item => (
                            <Typography key={item.id} variant="body2">
                              × {item.quantite} {item.nom_plat}
                            </Typography>
                          ))}
                          {order.notes && (
                            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                              📝 {order.notes}
                            </Typography>
                          )}
                          <Button
                            fullWidth variant="contained" color="success" size="small"
                            sx={{ mt: 1, fontSize: '0.75rem' }}
                            disabled={actionLoading === order.id}
                            onClick={() => handleMarkOrderReady(order)}
                          >
                            {actionLoading === order.id ? <CircularProgress size={16} /> : '🟢 Prêt à servir'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Grid>
              )}

              {/* ── Prêtes ── */}
              {activeOrders.filter(o => o.statut === 'prete').length > 0 && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#4caf50' }}>
                    🟢 Prêtes à servir ({activeOrders.filter(o => o.statut === 'prete').length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activeOrders.filter(o => o.statut === 'prete').map(order => (
                      <Card key={order.id} sx={{ border: '2px solid #4caf50', backgroundColor: '#f0fff4', opacity: 0.85 }}>
                        <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography fontWeight="bold">
                              {order.table ? `Table ${order.table.numero}` : order.order_type === 'livraison' ? '🛵 À livrer' : `#${order.id}`}
                            </Typography>
                            <Chip label="Prête" color="success" size="small" />
                          </Box>
                          {order.items && order.items.map(item => (
                            <Typography key={item.id} variant="body2">
                              × {item.quantite} {item.nom_plat}
                            </Typography>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* ══ Onglet : Ventes du jour ═══════════════════════════════════════════ */}
      {activeTab === 'ventes' && (
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Ventes du jour</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Heure</strong></TableCell>
                      <TableCell><strong>Articles</strong></TableCell>
                      <TableCell><strong>Table / Chambre</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                      <TableCell><strong>Paiement</strong></TableCell>
                      {hasPermission('caisse', 'validation') && <TableCell align="center"><strong>Reçu</strong></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.map(sale => (
                      <TableRow key={sale.id} hover sx={{ backgroundColor: sale.room_number ? '#fff8e1' : 'inherit' }}>
                        <TableCell>{new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{sale.items_json.map(i => `${i.name} ×${i.quantity}`).join(', ')}</TableCell>
                        <TableCell>
                          {sale.room_number ? (
                            <Chip icon={<HotelIcon fontSize="small" />} label={`Chambre ${sale.room_number}`} size="small" color="warning" />
                          ) : (sale.table_number || '—')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <Chip label={sale.payment_method === 'chambre' ? 'Chambre' : sale.payment_method} size="small"
                            color={sale.payment_method === 'chambre' ? 'warning' : 'default'} />
                        </TableCell>
                        {hasPermission('caisse', 'validation') && (
                          <TableCell align="center">
                            <Tooltip title="Imprimer le reçu">
                              <IconButton size="small" color="primary" onClick={() => openReceiptForSale(sale)}>
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {sales.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Aucune vente aujourd'hui</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* (Notifications affichées dans un Dialog via la cloche) */}

      {/* ══ Onglet : Gestion du Menu ══════════════════════════════════════════ */}
      {activeTab === 'menu' && hasPermission('restaurant', 'gestion_menu') && (
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">Gestion des Plats</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAddMenuItem}>Ajouter un Plat</Button>
              </Box>
              {Object.keys(categoryLabels).map(category => {
                const catItems = allMenu.filter(i => i.category === category);
                if (catItems.length === 0) return null;
                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, pb: 0.5, borderBottom: '2px solid', borderColor: 'primary.main', color: 'primary.main' }}>
                      {categoryLabels[category as MenuCategory]}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell width="30%"><strong>Nom</strong></TableCell>
                            <TableCell width="25%"><strong>Description</strong></TableCell>
                            <TableCell width="15%"><strong>Prix</strong></TableCell>
                            <TableCell width="15%" align="center"><strong>Disponible</strong></TableCell>
                            <TableCell width="15%" align="center"><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {catItems.map(item => (
                            <TableRow key={item.id} sx={{ backgroundColor: item.is_available ? 'inherit' : '#ffebee', '&:hover': { backgroundColor: item.is_available ? '#f5f5f5' : '#ffcdd2' } }}>
                              <TableCell><Typography fontWeight="medium">{item.name}</Typography></TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary">{item.description || '—'}</Typography></TableCell>
                              <TableCell><Typography fontWeight="bold">{formatCurrency(item.price)}</Typography></TableCell>
                              <TableCell align="center">
                                <Switch checked={item.is_available} onChange={() => handleToggleAvailability(item)} color="primary" />
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Modifier">
                                  <IconButton size="small" color="primary" onClick={() => openEditMenuItem(item)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              })}
              {allMenu.length === 0 && <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">Aucun plat. Cliquez sur "Ajouter un Plat".</Typography></Box>}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ════════════════ DIALOGS ════════════════════════════════════════════ */}

      {/* Dialog Confirmer Commande V1 */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmer la commande</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Articles commandés :</Typography>
            {getActiveLines().map(l => (
              <Box key={l.menu_item_id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>{l.name} × {l.quantity}</Typography>
                <Typography>{formatCurrency(l.quantity * l.unit_price)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            {getDiscount() > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="error.main">Remise</Typography>
                <Typography color="error.main">-{formatCurrency(getDiscount())}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">TOTAL</Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">{formatCurrency(getTotal())}</Typography>
            </Box>
            {/* ── Sélecteur type commande : Sur table / À livrer / Hôtel ── */}
            <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
              <Button
                variant={v1OrderType === 'table' ? 'contained' : 'outlined'}
                color="primary"
                startIcon={<TableIcon />}
                onClick={() => { setV1OrderType('table'); setRoomNumberInput(''); }}
                sx={{ flex: 1, fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                Sur table
              </Button>
              <Button
                variant={v1OrderType === 'livraison' ? 'contained' : 'outlined'}
                color="warning"
                onClick={() => { setV1OrderType('livraison'); setRoomNumberInput(''); setTableNumber(''); }}
                sx={{ flex: 1, fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                🛵 À livrer
              </Button>
              <Button
                variant={v1OrderType === 'hotel' ? 'contained' : 'outlined'}
                color="secondary"
                startIcon={<HotelIcon />}
                onClick={() => { setV1OrderType('hotel'); setTableNumber(''); loadOccupiedRooms(); }}
                sx={{ flex: 1, fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                Hôtel
              </Button>
            </Box>

            {/* Dropdown des tables libres */}
            {v1OrderType === 'table' && (
              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel>Table disponible</InputLabel>
                <Select
                  value={tableNumber}
                  label="Table disponible"
                  onChange={e => setTableNumber(String(e.target.value))}
                >
                  {tables.filter(t => t.statut === 'libre').map(t => (
                    <MenuItem key={t.id} value={String(t.numero)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TableIcon fontSize="small" color="primary" />
                        <span>Table {t.numero}</span>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({t.capacite} couverts)</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                  {tables.filter(t => t.statut === 'libre').length === 0 && (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">Aucune table libre pour l'instant</Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            )}

            {/* Info livraison */}
            {v1OrderType === 'livraison' && (
              <Box sx={{ mb: 1, p: 1.5, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
                <Typography variant="body2"><strong>🛵 Commande à livrer hors salle</strong></Typography>
                <Typography variant="caption" color="text.secondary">La commande sera préparée et livrée en dehors de la salle.</Typography>
              </Box>
            )}

            {/* Sélection chambre hôtel */}
            {v1OrderType === 'hotel' && (
              <Box sx={{ mb: 1 }}>
                {loadingRooms ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption">Chargement chambres...</Typography></Box>
                ) : occupiedRooms.length > 0 ? (
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Chambre occupée</InputLabel>
                    <Select value={roomNumberInput} label="Chambre occupée" onChange={e => setRoomNumberInput(e.target.value)}>
                      {occupiedRooms.map(room => (
                        <MenuItem key={room.id} value={room.number}>🛏 Chambre {room.number}{room.guest_name ? ` — ${room.guest_name}` : ''}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField fullWidth size="small" label="Numéro de chambre" value={roomNumberInput} onChange={e => setRoomNumberInput(e.target.value)} required placeholder="ex: 101" />
                )}
              </Box>
            )}

            {v1OrderType !== 'hotel' && (
              <Alert severity="info" sx={{ mt: 1 }}>Le ticket restera ouvert jusqu'à l'encaissement.</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCheckout} variant="contained" disabled={checkoutLoading || getActiveLines().length === 0 || (v1OrderType === 'hotel' && !roomNumberInput.trim())}>
            {checkoutLoading ? <CircularProgress size={20} /> : (v1OrderType === 'hotel' ? 'Facturer à la chambre' : v1OrderType === 'livraison' ? '🛵 Envoyer en livraison' : 'Valider la vente')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Encaissement Ticket V1 */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Encaisser le ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {closingSale && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Articles :</Typography>
                {closingSale.items_json.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography>{item.name} ×{item.quantity}</Typography>
                    <Typography>{formatCurrency(item.total)}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">TOTAL</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">{formatCurrency(closingSale.total)}</Typography>
                </Box>
              </>
            )}
            <PaymentSelector value={closePaymentInfo} onChange={setClosePaymentInfo} label="Mode de paiement" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCloseSale} variant="contained" color="success" disabled={closeLoading}>
            {closeLoading ? <CircularProgress size={20} /> : 'Encaisser'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Ajouter/Modifier table (gérant) */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingTable ? 'Modifier la table' : 'Nouvelle table'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="Numéro de table" type="number" value={tableForm.numero} onChange={e => setTableForm({ ...tableForm, numero: e.target.value })} required inputProps={{ min: 1 }} />
            <TextField fullWidth label="Capacité (couverts)" type="number" value={tableForm.capacite} onChange={e => setTableForm({ ...tableForm, capacite: e.target.value })} inputProps={{ min: 1, max: 50 }} />
            <TextField fullWidth label="Notes (optionnel)" value={tableForm.notes} onChange={e => setTableForm({ ...tableForm, notes: e.target.value })} placeholder="ex: Terrasse, VIP…" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveTable} variant="contained" disabled={tableFormLoading || !tableForm.numero}>
            {tableFormLoading ? <CircularProgress size={20} /> : (editingTable ? 'Modifier' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Créer commande V2 (table ou livraison) */}
      <Dialog open={v2OrderDialogOpen} onClose={() => setV2OrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {v2OrderType === 'livraison'
            ? '🛵 Nouvelle commande — À livrer'
            : v2SelectedTable
              ? `🍽️ Nouvelle commande — Table ${v2SelectedTable.numero}`
              : '🍽️ Nouvelle commande'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>

            {/* ── Sélecteur de type de commande ── */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={v2OrderType === 'table' ? 'contained' : 'outlined'}
                color="primary"
                startIcon={<TableIcon />}
                onClick={() => setV2OrderType('table')}
                sx={{ flex: 1, fontWeight: 'bold' }}
              >
                Sur table
              </Button>
              <Button
                variant={v2OrderType === 'livraison' ? 'contained' : 'outlined'}
                color="warning"
                onClick={() => { setV2OrderType('livraison'); setV2SelectedTable(null); }}
                sx={{ flex: 1, fontWeight: 'bold' }}
              >
                🛵 À livrer
              </Button>
            </Box>

            {/* ── Sélection de table (liste déroulante des tables libres) ── */}
            {v2OrderType === 'table' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Table disponible</InputLabel>
                <Select
                  value={v2SelectedTable?.id || ''}
                  label="Table disponible"
                  onChange={(e) => {
                    const found = tables.find(t => t.id === (e.target.value as number));
                    setV2SelectedTable(found || null);
                  }}
                >
                  {tables
                    .filter(t => t.statut === 'libre' || t.id === v2SelectedTable?.id)
                    .map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TableIcon fontSize="small" color="primary" />
                          <span>Table {t.numero}</span>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({t.capacite} couverts)
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  {tables.filter(t => t.statut === 'libre').length === 0 && (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">Aucune table libre</Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            )}

            {/* ── Info livraison ── */}
            {v2OrderType === 'livraison' && (
              <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
                <Typography variant="body2" color="text.primary">
                  🛵 <strong>Commande à livrer hors salle</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  La commande sera préparée en cuisine et marquée "À livrer" pour l'équipe.
                </Typography>
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* ── Menu par catégorie ── */}
            {Object.entries(menuByCategory).map(([category, items]) => (
              <Box key={category} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                  {categoryLabels[category as MenuCategory] || category}
                </Typography>
                <Grid container spacing={1}>
                  {items.map(item => {
                    const line = v2OrderLines.find(l => l.menu_item_id === item.id);
                    const qty = line?.quantity || 0;
                    return (
                      <Grid item xs={12} sm={6} key={item.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid', borderColor: qty > 0 ? 'primary.main' : 'divider', borderRadius: 1, backgroundColor: qty > 0 ? '#e3f2fd' : 'transparent' }}>
                          <Box>
                            <Typography fontWeight={qty > 0 ? 'bold' : 'normal'} sx={{ fontSize: '0.9rem' }}>{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatCurrency(item.price)}</Typography>
                          </Box>
                          <FormControl size="small" sx={{ minWidth: 65 }}>
                            <Select value={qty} onChange={e => setV2OrderLines(prev => prev.map(l => l.menu_item_id === item.id ? { ...l, quantity: e.target.value as number } : l))}>
                              {quantities.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))}

            <TextField fullWidth label="Notes pour la cuisine (optionnel)" value={v2Notes} onChange={e => setV2Notes(e.target.value)} multiline rows={2} sx={{ mt: 1 }} placeholder="ex: sans piment, bien cuit…" />
            {getV2ActiveLines().length > 0 && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                <Typography fontWeight="bold">Résumé : {getV2ActiveLines().map(l => `${l.name} ×${l.quantity}`).join(' · ')}</Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">Total : {formatCurrency(getV2Total())}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setV2OrderDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCreateV2Order}
            variant="contained"
            color={v2OrderType === 'livraison' ? 'warning' : 'primary'}
            disabled={v2OrderLoading || getV2ActiveLines().length === 0 || (v2OrderType === 'table' && !v2SelectedTable)}
          >
            {v2OrderLoading ? <CircularProgress size={20} /> : (v2OrderType === 'livraison' ? '🛵 Envoyer en cuisine' : '🍳 Envoyer en cuisine')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Ajouter/Modifier plat menu */}
      <Dialog open={menuItemDialogOpen} onClose={() => setMenuItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMenuItem ? 'Modifier le plat' : 'Ajouter un plat'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="Nom du plat" value={menuItemForm.name} onChange={e => setMenuItemForm({ ...menuItemForm, name: e.target.value })} required />
            <FormControl fullWidth required>
              <InputLabel>Catégorie</InputLabel>
              <Select value={menuItemForm.category} label="Catégorie" onChange={e => setMenuItemForm({ ...menuItemForm, category: e.target.value as MenuCategory })}>
                {Object.entries(categoryLabels).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Prix (FCFA)" type="number" value={menuItemForm.price} onChange={e => setMenuItemForm({ ...menuItemForm, price: parseFloat(e.target.value) || 0 })} required inputProps={{ min: 0, step: 100 }} />
            <TextField fullWidth label="Description (optionnel)" value={menuItemForm.description} onChange={e => setMenuItemForm({ ...menuItemForm, description: e.target.value })} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuItemDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveMenuItem} variant="contained" disabled={menuItemLoading || !menuItemForm.name || menuItemForm.price <= 0}>
            {menuItemLoading ? <CircularProgress size={20} /> : (editingMenuItem ? 'Modifier' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Supprimer plat */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Supprimer "{deletingMenuItem?.name}" ?</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>Cette action est irréversible.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleDeleteMenuItem} variant="contained" color="error">Supprimer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Notifications cuisine (cloche) */}
      <Dialog open={notifsDialogOpen} onClose={() => setNotifsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotifIcon color={unreadCount > 0 ? 'error' : 'action'} />
              <Typography variant="h6">Notifications cuisine</Typography>
              {unreadCount > 0 && <Chip label={unreadCount} color="error" size="small" />}
            </Box>
            <IconButton onClick={() => setNotifsDialogOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {unreadCount > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Button startIcon={markingRead ? <CircularProgress size={16} /> : <DoneAllIcon />}
                onClick={handleMarkAllRead} disabled={markingRead} variant="outlined" size="small" fullWidth>
                Tout marquer comme lu
              </Button>
            </Box>
          )}
          {notifications.length === 0 ? (
            <Alert severity="info" icon={<NotifOffIcon />}>Aucune notification pour le moment.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {notifications.map(notif => {
                const nc = notifTypeConfig[notif.type] || { label: notif.type, color: 'default' as const, emoji: '📢' };
                return (
                  <Card key={notif.id} sx={{ backgroundColor: notif.is_read ? '#fafafa' : '#fff', opacity: notif.is_read ? 0.7 : 1, borderLeft: '4px solid', borderColor: notif.is_read ? '#e0e0e0' : (nc.color === 'success' ? '#4caf50' : nc.color === 'warning' ? '#ff9800' : '#f44336') }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '1.1rem' }}>{nc.emoji}</Typography>
                          <Box>
                            <Typography fontWeight={notif.is_read ? 'normal' : 'bold'} variant="body2">{notif.message}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={nc.label} color={nc.color} size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifsDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Accuser réception (Cuisine) */}
      <Dialog open={ackDialogOpen} onClose={() => setAckDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>⏱ Temps de préparation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {ackOrder && (
              <>Commande {ackOrder.table ? `Table ${ackOrder.table.numero}` : `#${ackOrder.id}`} — {ackOrder.items?.map(i => `${i.quantite}× ${i.nom_plat}`).join(', ')}</>
            )}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Temps estimé de préparation :</Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
            {([15, 25, 45] as const).map(t => (
              <Button key={t} variant={selectedPrepTime === t ? 'contained' : 'outlined'} color="warning"
                onClick={() => setSelectedPrepTime(t)} sx={{ minWidth: 70, fontWeight: 'bold' }}>
                {t} min
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAckDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleAcknowledgeOrder} variant="contained" color="warning" disabled={actionLoading !== null}>
            {actionLoading !== null ? <CircularProgress size={20} /> : '✋ Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ClientReceiptDialog open={clientReceiptOpen} onClose={() => setClientReceiptOpen(false)} data={clientReceiptData} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Layout>
  );
};

export default Restaurant;
