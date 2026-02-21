import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  ShoppingCart,
  Add as AddIcon,
  Edit as EditIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import PaymentSelector, { PaymentInfo } from '../components/PaymentSelector';
import ClientReceiptDialog, { ClientReceiptData } from '../components/ClientReceiptDialog';
import { useAuth } from '../contexts/AuthContext';
import { restaurantApi } from '../services/api';
import { MenuItem as MenuItemType, Sale, MenuCategory } from '../types';

interface OrderLine {
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
}

interface MenuItemForm {
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const categoryLabels: Record<MenuCategory, string> = {
  entree: 'Entrees',
  plat: 'Plats',
  dessert: 'Desserts',
  boisson: 'Boissons',
  snack: 'Snacks'
};

// Quantites disponibles dans le dropdown
const quantities = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const Restaurant: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const [clientReceiptOpen, setClientReceiptOpen] = useState(false);
  const [clientReceiptData, setClientReceiptData] = useState<ClientReceiptData | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [menu, setMenu] = useState<MenuItemType[]>([]);
  const [menuByCategory, setMenuByCategory] = useState<Record<string, MenuItemType[]>>({});
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Commande en cours - prix modifiables
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({ method: 'especes' });
  const [tableNumber, setTableNumber] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Remise
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Stats
  const [stats, setStats] = useState<{ total_ventes: number; total_montant: number } | null>(null);

  // Gestion du menu
  const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItemType | null>(null);
  const [menuItemForm, setMenuItemForm] = useState<MenuItemForm>({
    name: '',
    category: 'plat',
    price: 0,
    description: ''
  });
  const [menuItemLoading, setMenuItemLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMenuItem, setDeletingMenuItem] = useState<MenuItemType | null>(null);
  const [allMenu, setAllMenu] = useState<MenuItemType[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Initialiser les lignes de commande quand le menu est charge
  useEffect(() => {
    if (menu.length > 0 && orderLines.length === 0) {
      setOrderLines(menu.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: 0,
        unit_price: item.price
      })));
    }
  }, [menu]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, allMenuRes, salesRes, statsRes] = await Promise.all([
        restaurantApi.getMenu({ available_only: 'true' }),
        restaurantApi.getMenu(),
        restaurantApi.getSales(),
        restaurantApi.getSaleStats()
      ]);
      setMenu(menuRes.data.data.items);
      setMenuByCategory(menuRes.data.data.byCategory);
      setAllMenu(allMenuRes.data.data.items);
      setSales(salesRes.data.data.sales);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Mettre a jour la quantite d'un plat
  const updateQuantity = (menuItemId: number, newQuantity: number) => {
    setOrderLines(prev => prev.map(line =>
      line.menu_item_id === menuItemId ? { ...line, quantity: newQuantity } : line
    ));
  };

  // Mettre a jour le prix d'un plat (reserve pour utilisation future)
  const _updatePrice = (menuItemId: number, newPrice: number) => {
    setOrderLines(prev => prev.map(line =>
      line.menu_item_id === menuItemId ? { ...line, unit_price: newPrice } : line
    ));
  };
  void _updatePrice; // Supprime l'avertissement TypeScript

  // Calculer le sous-total de la commande (avant remise)
  const getOrderSubtotal = () => {
    return orderLines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  };

  // Calculer la remise
  const getDiscountAmount = () => {
    const subtotal = getOrderSubtotal();
    if (discountType === 'percent' && discountValue > 0) {
      return Math.round(subtotal * discountValue / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
      return Math.min(discountValue, subtotal); // Ne pas depasser le sous-total
    }
    return 0;
  };

  // Calculer le total de la commande (apres remise)
  const getOrderTotal = () => {
    return getOrderSubtotal() - getDiscountAmount();
  };

  // Obtenir les lignes avec quantite > 0
  const getActiveLines = () => {
    return orderLines.filter(line => line.quantity > 0);
  };

  // Reinitialiser la commande
  const resetOrder = () => {
    setOrderLines(menu.map(item => ({
      menu_item_id: item.id,
      name: item.name,
      quantity: 0,
      unit_price: item.price
    })));
    setTableNumber('');
    setDiscountType('none');
    setDiscountValue(0);
    setPaymentInfo({ method: 'especes' });
  };

  // =====================================================
  // GESTION DU MENU
  // =====================================================

  const openAddMenuItemDialog = () => {
    setEditingMenuItem(null);
    setMenuItemForm({
      name: '',
      category: 'plat',
      price: 0,
      description: ''
    });
    setMenuItemDialogOpen(true);
  };

  const openEditMenuItemDialog = (item: MenuItemType) => {
    setEditingMenuItem(item);
    setMenuItemForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || ''
    });
    setMenuItemDialogOpen(true);
  };

  const handleSaveMenuItem = async () => {
    if (!menuItemForm.name || menuItemForm.price <= 0) {
      setSnackbar({ open: true, message: 'Nom et prix requis', severity: 'error' });
      return;
    }

    try {
      setMenuItemLoading(true);
      if (editingMenuItem) {
        await restaurantApi.updateMenuItem(editingMenuItem.id, menuItemForm);
        setSnackbar({ open: true, message: 'Plat modifie avec succes', severity: 'success' });
      } else {
        await restaurantApi.createMenuItem(menuItemForm);
        setSnackbar({ open: true, message: 'Plat ajoute avec succes', severity: 'success' });
      }
      setMenuItemDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving menu item:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la sauvegarde', severity: 'error' });
    } finally {
      setMenuItemLoading(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItemType) => {
    try {
      await restaurantApi.toggleAvailability(item.id);
      setSnackbar({
        open: true,
        message: item.is_available ? 'Plat desactive' : 'Plat active',
        severity: 'success'
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling availability:', error);
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    }
  };

  // Fonction de suppression retiree de l'interface
  const _openDeleteDialog = (item: MenuItemType) => {
    setDeletingMenuItem(item);
    setDeleteDialogOpen(true);
  };
  void _openDeleteDialog; // Supprime l'avertissement TypeScript

  const handleDeleteMenuItem = async () => {
    if (!deletingMenuItem) return;
    try {
      await restaurantApi.deleteMenuItem(deletingMenuItem.id);
      setSnackbar({ open: true, message: 'Plat supprime', severity: 'success' });
      setDeleteDialogOpen(false);
      setDeletingMenuItem(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  // Ouvrir le reçu pour une vente existante (historique)
  const openReceiptForSale = (sale: Sale) => {
    setClientReceiptData({
      type: 'restaurant',
      items: sale.items_json.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total
      })),
      total: sale.total,
      paymentMethod: sale.payment_method,
      tableNumber: sale.table_number || undefined,
      cashierName: user?.full_name || user?.username || 'Caissier'
    });
    setClientReceiptOpen(true);
  };

  // Valider la commande
  const handleCheckout = async () => {
    const activeLines = getActiveLines();
    if (activeLines.length === 0) return;

    if (!hasPermission('restaurant', 'ventes')) {
      setSnackbar({ open: true, message: 'Non autorise', severity: 'error' });
      return;
    }

    try {
      setCheckoutLoading(true);
      // Capturer les données de la commande AVANT reset
      const currentLines = [...activeLines];
      const currentTotal = getOrderTotal();
      const currentPaymentMethod = paymentInfo.method;
      const currentTableNumber = tableNumber;
      await restaurantApi.createSale({
        items: currentLines.map(line => ({
          menu_item_id: line.menu_item_id,
          quantity: line.quantity
        })),
        payment_method: currentPaymentMethod,
        payment_operator: paymentInfo.operator,
        payment_reference: paymentInfo.reference,
        table_number: currentTableNumber || undefined
      });
      setSnackbar({ open: true, message: 'Vente enregistree avec succes', severity: 'success' });
      // Ouvrir le reçu si gérant/admin
      if (hasPermission('caisse', 'validation')) {
        setClientReceiptData({
          type: 'restaurant',
          items: currentLines.map(line => ({
            name: line.name,
            quantity: line.quantity,
            unit_price: line.unit_price,
            total: line.quantity * line.unit_price
          })),
          total: currentTotal,
          paymentMethod: currentPaymentMethod,
          tableNumber: currentTableNumber || undefined,
          cashierName: user?.full_name || user?.username || 'Caissier'
        });
        setClientReceiptOpen(true);
      }
      resetOrder();
      setConfirmDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating sale:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la vente', severity: 'error' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Restaurant">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Restaurant">
      {/* Stats Cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={4}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Ventes du jour
              </Typography>
              <Typography variant="h5">{stats?.total_ventes || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={4}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Recette du jour
              </Typography>
              <Typography variant="h5">{formatCurrency(stats?.total_montant || 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Articles au menu
              </Typography>
              <Typography variant="h5">{menu.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          {hasPermission('restaurant', 'ventes') && (
            <Tab label="Nouvelle Commande" />
          )}
          <Tab label="Ventes du jour" />
          {hasPermission('restaurant', 'gestion_menu') && (
            <Tab label="Gestion du Menu" />
          )}
        </Tabs>
      </Box>

      {/* Tab Nouvelle Commande - uniquement pour serveurs/serveuses */}
      {tabValue === 0 && hasPermission('restaurant', 'ventes') && (
        <Box sx={{ pt: 1.5 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" fontWeight="bold">
                  Liste des Plats
                </Typography>
                {getActiveLines().length > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ShoppingCart />}
                    onClick={() => setConfirmDialogOpen(true)}
                  >
                    Valider ({formatCurrency(getOrderTotal())})
                  </Button>
                )}
              </Box>

              {/* Table des plats par categorie */}
              {Object.entries(menuByCategory).map(([category, items]) => (
                <Box key={category} sx={{ mb: 1.5 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{
                      mb: 2,
                      pb: 1,
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      color: 'primary.main'
                    }}
                  >
                    {categoryLabels[category as MenuCategory] || category}
                  </Typography>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell width="40%"><strong>Plat</strong></TableCell>
                          <TableCell width="25%"><strong>Prix (FCFA)</strong></TableCell>
                          <TableCell width="20%"><strong>Quantite</strong></TableCell>
                          <TableCell width="15%" align="right"><strong>Sous-total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item) => {
                          const orderLine = orderLines.find(l => l.menu_item_id === item.id);
                          const quantity = orderLine?.quantity || 0;
                          const price = orderLine?.unit_price || item.price;
                          const subtotal = quantity * price;

                          return (
                            <TableRow
                              key={item.id}
                              sx={{
                                backgroundColor: quantity > 0 ? '#e3f2fd' : 'inherit',
                                '&:hover': { backgroundColor: quantity > 0 ? '#bbdefb' : '#f5f5f5' }
                              }}
                            >
                              <TableCell>
                                <Typography fontWeight={quantity > 0 ? 'bold' : 'normal'}>
                                  {item.name}
                                </Typography>
                                {item.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {item.description}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography
                                  sx={{
                                    backgroundColor: '#f5f5f5',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 1,
                                    color: 'text.secondary',
                                    fontWeight: 'medium'
                                  }}
                                >
                                  {formatCurrency(price)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 80 }}>
                                  <Select
                                    value={quantity}
                                    onChange={(e) => updateQuantity(item.id, e.target.value as number)}
                                  >
                                    {quantities.map((q) => (
                                      <MenuItem key={q} value={q}>{q}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="right">
                                {quantity > 0 ? (
                                  <Typography fontWeight="bold" color="primary">
                                    {formatCurrency(subtotal)}
                                  </Typography>
                                ) : (
                                  <Typography color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}

              {/* Resume de la commande */}
              {getActiveLines().length > 0 && (
                <Card variant="outlined" sx={{ mt: 1.5, backgroundColor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Resume de la commande</Typography>
                    <Divider sx={{ my: 1 }} />
                    {getActiveLines().map((line) => (
                      <Box key={line.menu_item_id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{line.name} x {line.quantity}</Typography>
                        <Typography fontWeight="bold">{formatCurrency(line.quantity * line.unit_price)}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />

                    {/* Sous-total */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Sous-total</Typography>
                      <Typography fontWeight="bold">{formatCurrency(getOrderSubtotal())}</Typography>
                    </Box>

                    {/* Remise */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', my: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Remise</InputLabel>
                        <Select
                          value={discountType}
                          label="Remise"
                          onChange={(e) => {
                            setDiscountType(e.target.value as 'none' | 'percent' | 'fixed');
                            setDiscountValue(0);
                          }}
                        >
                          <MenuItem value="none">Aucune</MenuItem>
                          <MenuItem value="percent">Pourcentage (%)</MenuItem>
                          <MenuItem value="fixed">Montant (FCFA)</MenuItem>
                        </Select>
                      </FormControl>
                      {discountType !== 'none' && (
                        <TextField
                          size="small"
                          type="number"
                          label={discountType === 'percent' ? '%' : 'FCFA'}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          sx={{ width: 100 }}
                          inputProps={{ min: 0, max: discountType === 'percent' ? 100 : undefined }}
                        />
                      )}
                      {getDiscountAmount() > 0 && (
                        <Typography color="error.main" fontWeight="bold">
                          -{formatCurrency(getDiscountAmount())}
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">TOTAL</Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {formatCurrency(getOrderTotal())}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab Ventes du jour */}
      {((hasPermission('restaurant', 'ventes') && tabValue === 1) || (!hasPermission('restaurant', 'ventes') && tabValue === 0)) && (
        <Box sx={{ pt: 1.5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ventes du jour
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Heure</strong></TableCell>
                      <TableCell><strong>Articles</strong></TableCell>
                      <TableCell><strong>Table</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                      <TableCell><strong>Paiement</strong></TableCell>
                      {hasPermission('caisse', 'validation') && <TableCell align="center"><strong>Reçu</strong></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell>
                          {new Date(sale.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {sale.items_json.map(item => `${item.name} x${item.quantity}`).join(', ')}
                        </TableCell>
                        <TableCell>{sale.table_number || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(sale.total)}
                        </TableCell>
                        <TableCell>
                          <Chip label={sale.payment_method} size="small" />
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
                    {sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={hasPermission('caisse', 'validation') ? 6 : 5} align="center" sx={{ py: 4 }}>
                          Aucune vente aujourd'hui
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab Gestion du Menu - visible uniquement pour gerant et admin */}
      {((hasPermission('restaurant', 'ventes') && tabValue === 2) || (!hasPermission('restaurant', 'ventes') && tabValue === 1)) && hasPermission('restaurant', 'gestion_menu') && (
        <Box sx={{ pt: 1.5 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" fontWeight="bold">
                  Gestion des Plats
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={openAddMenuItemDialog}
                >
                  Ajouter un Plat
                </Button>
              </Box>

              {/* Table des plats par categorie */}
              {Object.keys(categoryLabels).map((category) => {
                const categoryItems = allMenu.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <Box key={category} sx={{ mb: 1.5 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{
                        mb: 2,
                        pb: 1,
                        borderBottom: '2px solid',
                        borderColor: 'primary.main',
                        color: 'primary.main'
                      }}
                    >
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
                          {categoryItems.map((item) => (
                            <TableRow
                              key={item.id}
                              sx={{
                                backgroundColor: item.is_available ? 'inherit' : '#ffebee',
                                '&:hover': { backgroundColor: item.is_available ? '#f5f5f5' : '#ffcdd2' }
                              }}
                            >
                              <TableCell>
                                <Typography fontWeight="medium">{item.name}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {item.description || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography fontWeight="bold">{formatCurrency(item.price)}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Switch
                                  checked={item.is_available}
                                  onChange={() => handleToggleAvailability(item)}
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Modifier">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => openEditMenuItemDialog(item)}
                                  >
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

              {/* Message si aucun plat */}
              {allMenu.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    Aucun plat dans le menu. Cliquez sur "Ajouter un Plat" pour commencer.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Dialog de confirmation */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmer la commande</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Resume */}
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Articles commandes:
            </Typography>
            {getActiveLines().map((line) => (
              <Box key={line.menu_item_id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>{line.name} x {line.quantity}</Typography>
                <Typography>{formatCurrency(line.quantity * line.unit_price)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Sous-total</Typography>
              <Typography fontWeight="bold">{formatCurrency(getOrderSubtotal())}</Typography>
            </Box>
            {getDiscountAmount() > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="error.main">
                  Remise {discountType === 'percent' ? `(${discountValue}%)` : ''}
                </Typography>
                <Typography color="error.main" fontWeight="bold">
                  -{formatCurrency(getDiscountAmount())}
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">TOTAL</Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {formatCurrency(getOrderTotal())}
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Numero de table (optionnel)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              margin="normal"
            />

            <Box sx={{ mt: 1 }}>
              <PaymentSelector
                value={paymentInfo}
                onChange={setPaymentInfo}
                label="Mode de paiement"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCheckout}
            variant="contained"
            disabled={checkoutLoading || getActiveLines().length === 0}
          >
            {checkoutLoading ? <CircularProgress size={20} /> : 'Valider la vente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Ajouter/Modifier un plat */}
      <Dialog open={menuItemDialogOpen} onClose={() => setMenuItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMenuItem ? 'Modifier le plat' : 'Ajouter un plat'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nom du plat"
              value={menuItemForm.name}
              onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Categorie</InputLabel>
              <Select
                value={menuItemForm.category}
                label="Categorie"
                onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value as MenuCategory })}
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Prix (FCFA)"
              type="number"
              value={menuItemForm.price}
              onChange={(e) => setMenuItemForm({ ...menuItemForm, price: parseFloat(e.target.value) || 0 })}
              required
              inputProps={{ min: 0, step: 100 }}
            />

            <TextField
              fullWidth
              label="Description (optionnel)"
              value={menuItemForm.description}
              onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuItemDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleSaveMenuItem}
            variant="contained"
            disabled={menuItemLoading || !menuItemForm.name || menuItemForm.price <= 0}
          >
            {menuItemLoading ? <CircularProgress size={20} /> : (editingMenuItem ? 'Modifier' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Etes-vous sur de vouloir supprimer le plat "{deletingMenuItem?.name}" ?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Cette action est irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleDeleteMenuItem} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <ClientReceiptDialog
        open={clientReceiptOpen}
        onClose={() => setClientReceiptOpen(false)}
        data={clientReceiptData}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default Restaurant;
