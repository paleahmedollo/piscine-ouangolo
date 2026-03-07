import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  Badge
} from '@mui/material';
import {
  Restaurant as KitchenIcon,
  AccessTime as TimeIcon,
  CheckCircle as ReadyIcon,
  NotificationsActive as NewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { restaurantApi } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: number;
  nom_plat: string;
  quantite: number;
  prix_unitaire: number;
  sous_total?: number;
}

interface OrderV2 {
  id: number;
  statut: 'nouvelle' | 'en_preparation' | 'prete' | 'payee' | 'annulee';
  table_id?: number;
  order_type?: 'table' | 'livraison';
  temps_preparation?: number;
  total: number;
  notes?: string;
  created_at: string;
  items?: OrderItem[];
  table?: { id: number; numero: number };
  serveuse?: { id: number; full_name: string };
}

// ── Statut config ──────────────────────────────────────────────────────────────
const statutConfig: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  nouvelle:       { label: 'Nouvelle',       color: '#c62828', bg: '#ffebee', border: '#f44336', emoji: '🔴' },
  en_preparation: { label: 'En préparation', color: '#e65100', bg: '#fff3e0', border: '#ff9800', emoji: '🟠' },
  prete:          { label: 'Prête',           color: '#1b5e20', bg: '#e8f5e9', border: '#4caf50', emoji: '🟢' },
  payee:          { label: 'Payée',           color: '#616161', bg: '#f5f5f5', border: '#9e9e9e', emoji: '⚫' },
  annulee:        { label: 'Annulée',         color: '#616161', bg: '#f5f5f5', border: '#9e9e9e', emoji: '❌' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const timeElapsed = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'à l\'instant';
  if (diff < 60) return `il y a ${diff} min`;
  return `il y a ${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'm' : ''}`;
};

// ── Component ──────────────────────────────────────────────────────────────────
const Cuisine: React.FC = () => {
  const [orders, setOrders] = useState<OrderV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Dialog prise en charge
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [ackOrder, setAckOrder] = useState<OrderV2 | null>(null);
  const [selectedTime, setSelectedTime] = useState<15 | 25 | 45>(25);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await restaurantApi.getActiveOrders();
      const data = res.data?.data || res.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // polling 5s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleAcknowledge = async () => {
    if (!ackOrder) return;
    try {
      setActionLoading(ackOrder.id);
      await restaurantApi.acknowledgeOrder(ackOrder.id, selectedTime);
      setSnackbar({ open: true, message: `✅ Prise en charge — prête dans ${selectedTime} min`, severity: 'success' });
      setAckDialogOpen(false);
      setAckOrder(null);
      fetchOrders();
    } catch {
      setSnackbar({ open: true, message: 'Erreur lors de la prise en charge', severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (order: OrderV2) => {
    try {
      setActionLoading(order.id);
      await restaurantApi.markOrderReady(order.id);
      setSnackbar({ open: true, message: '🟢 Commande marquée comme prête !', severity: 'success' });
      fetchOrders();
    } catch {
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Groupes ──────────────────────────────────────────────────────────────────
  const nouvelles       = orders.filter(o => o.statut === 'nouvelle');
  const enPreparation   = orders.filter(o => o.statut === 'en_preparation');
  const pretes          = orders.filter(o => o.statut === 'prete');

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="Cuisine">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="🍳 Cuisine">
      {/* ── Barre de statuts ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Badge badgeContent={nouvelles.length} color="error" max={99}>
            <Chip
              icon={<NewIcon />}
              label="Nouvelles"
              color={nouvelles.length > 0 ? 'error' : 'default'}
              sx={{ fontWeight: 'bold', fontSize: '0.9rem', height: 34 }}
            />
          </Badge>
          <Badge badgeContent={enPreparation.length} color="warning" max={99}>
            <Chip
              icon={<TimeIcon />}
              label="En préparation"
              color={enPreparation.length > 0 ? 'warning' : 'default'}
              sx={{ fontWeight: 'bold', fontSize: '0.9rem', height: 34 }}
            />
          </Badge>
          <Badge badgeContent={pretes.length} color="success" max={99}>
            <Chip
              icon={<ReadyIcon />}
              label="Prêtes"
              color={pretes.length > 0 ? 'success' : 'default'}
              sx={{ fontWeight: 'bold', fontSize: '0.9rem', height: 34 }}
            />
          </Badge>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Rafraîchi à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Typography>
          <Tooltip title="Rafraîchir maintenant">
            <IconButton size="small" onClick={fetchOrders}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Aucune commande ───────────────────────────────────────────────── */}
      {orders.length === 0 ? (
        <Alert severity="success" sx={{ fontSize: '1.1rem', py: 2 }}>
          🎉 Aucune commande active — la cuisine est à jour !
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* ══ NOUVELLES ══════════════════════════════════════════════════ */}
          {nouvelles.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ color: '#c62828', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                🔴 Nouvelles commandes
                <Chip label={nouvelles.length} color="error" size="small" sx={{ fontWeight: 'bold' }} />
              </Typography>
              <Grid container spacing={2}>
                {nouvelles.map(order => (
                  <Grid item xs={12} sm={6} md={4} key={order.id}>
                    <Card sx={{
                      border: `3px solid ${statutConfig.nouvelle.border}`,
                      backgroundColor: statutConfig.nouvelle.bg,
                      boxShadow: '0 6px 20px rgba(244,67,54,0.25)',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}>
                      <CardContent>
                        {/* Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h4" fontWeight="bold" color="error.dark">
                            {order.table ? `Table ${order.table.numero}` : order.order_type === 'livraison' ? '🛵 À livrer' : '—'}
                          </Typography>
                          <Chip label="NOUVELLE" color="error" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {timeElapsed(order.created_at)}
                          {order.serveuse && ` · ${order.serveuse.full_name}`}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        {/* Items */}
                        {order.items?.map(item => (
                          <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="h6" sx={{ fontSize: '1rem' }}>{item.nom_plat}</Typography>
                            <Typography variant="h6" fontWeight="bold" color="error.dark" sx={{ fontSize: '1rem' }}>
                              ×{item.quantite}
                            </Typography>
                          </Box>
                        ))}
                        {order.notes && (
                          <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, fontSize: '0.85rem' }}>
                            📝 {order.notes}
                          </Alert>
                        )}
                        {/* Action */}
                        <Button
                          fullWidth
                          variant="contained"
                          color="error"
                          size="large"
                          startIcon={<KitchenIcon />}
                          onClick={() => {
                            setAckOrder(order);
                            setSelectedTime(25);
                            setAckDialogOpen(true);
                          }}
                          disabled={actionLoading === order.id}
                          sx={{ mt: 2, fontWeight: 'bold', fontSize: '1rem' }}
                        >
                          {actionLoading === order.id ? <CircularProgress size={20} /> : 'Accuser réception'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ══ EN PRÉPARATION ══════════════════════════════════════════════ */}
          {enPreparation.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ color: '#e65100', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                🟠 En préparation
                <Chip label={enPreparation.length} color="warning" size="small" sx={{ fontWeight: 'bold' }} />
              </Typography>
              <Grid container spacing={2}>
                {enPreparation.map(order => (
                  <Grid item xs={12} sm={6} md={4} key={order.id}>
                    <Card sx={{
                      border: `2px solid ${statutConfig.en_preparation.border}`,
                      backgroundColor: statutConfig.en_preparation.bg,
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h4" fontWeight="bold" color="warning.dark">
                            {order.table ? `Table ${order.table.numero}` : order.order_type === 'livraison' ? '🛵 À livrer' : '—'}
                          </Typography>
                          <Chip
                            icon={<TimeIcon />}
                            label={order.temps_preparation ? `~${order.temps_preparation} min` : 'En cours'}
                            color="warning"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {timeElapsed(order.created_at)}
                          {order.serveuse && ` · ${order.serveuse.full_name}`}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        {order.items?.map(item => (
                          <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body1">{item.nom_plat}</Typography>
                            <Typography fontWeight="bold" color="warning.dark">×{item.quantite}</Typography>
                          </Box>
                        ))}
                        {order.notes && (
                          <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, fontSize: '0.85rem' }}>
                            📝 {order.notes}
                          </Alert>
                        )}
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          size="large"
                          startIcon={<ReadyIcon />}
                          onClick={() => handleMarkReady(order)}
                          disabled={actionLoading === order.id}
                          sx={{ mt: 2, fontWeight: 'bold', fontSize: '1rem' }}
                        >
                          {actionLoading === order.id ? <CircularProgress size={20} /> : '✅ Prêt à servir !'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ══ PRÊTES ══════════════════════════════════════════════════════ */}
          {pretes.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ color: '#1b5e20', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                🟢 Prêtes à servir
                <Chip label={pretes.length} color="success" size="small" sx={{ fontWeight: 'bold' }} />
              </Typography>
              <Grid container spacing={2}>
                {pretes.map(order => (
                  <Grid item xs={12} sm={6} md={4} key={order.id}>
                    <Card sx={{
                      border: `2px solid ${statutConfig.prete.border}`,
                      backgroundColor: statutConfig.prete.bg,
                      opacity: 0.85
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h4" fontWeight="bold" color="success.dark">
                            {order.table ? `Table ${order.table.numero}` : order.order_type === 'livraison' ? '🛵 À livrer' : '—'}
                          </Typography>
                          <Chip label="À servir" color="success" sx={{ fontWeight: 'bold' }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {timeElapsed(order.created_at)}
                          {order.serveuse && ` · ${order.serveuse.full_name}`}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        {order.items?.map(item => (
                          <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body1" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                              {item.nom_plat}
                            </Typography>
                            <Typography color="text.disabled">×{item.quantite}</Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

        </Box>
      )}

      {/* ── Dialog : Prise en charge + temps ──────────────────────────────── */}
      <Dialog open={ackDialogOpen} onClose={() => setAckDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 'bold', pb: 0 }}>
          🍳 Prise en charge
        </DialogTitle>
        <DialogContent>
          {ackOrder && (
            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {ackOrder.table ? `Table ${ackOrder.table.numero}` : 'Commande sans table'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {ackOrder.items?.map(i => `${i.nom_plat} ×${i.quantite}`).join(' · ')}
              </Typography>
              <Typography variant="body1" fontWeight="bold" gutterBottom>
                Temps de préparation estimé :
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
                {([15, 25, 45] as const).map(time => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'contained' : 'outlined'}
                    size="large"
                    onClick={() => setSelectedTime(time)}
                    sx={{ minWidth: 80, fontSize: '1.4rem', fontWeight: 'bold', py: 1.5 }}
                    color={selectedTime === time ? 'primary' : 'inherit'}
                  >
                    {time}m
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
          <Button onClick={() => setAckDialogOpen(false)} color="inherit" size="large">
            Annuler
          </Button>
          <Button
            onClick={handleAcknowledge}
            variant="contained"
            size="large"
            color="error"
            disabled={actionLoading !== null}
            sx={{ fontWeight: 'bold', px: 4 }}
          >
            {actionLoading ? <CircularProgress size={22} /> : 'Prendre en charge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ──────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ fontWeight: 'bold' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default Cuisine;
