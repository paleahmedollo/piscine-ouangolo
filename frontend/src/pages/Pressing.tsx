import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Tab, Tabs,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, IconButton, Stack, Divider, Tooltip, Badge
} from '@mui/material';
import {
  Add as AddIcon, LocalLaundryService as PressingIcon,
  Refresh as RefreshIcon, Edit as EditIcon,
  Print as PrintIcon,
  HourglassEmpty as WaitIcon, ShoppingCart as CartIcon,
  Store as CaisseIcon, Remove as RemoveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { pressingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PressingType { id: number; name: string; price: number; is_active: boolean; }

interface PressingItemJson { pressing_type_id: number; name: string; quantity: number; unit_price: number; total: number; }

interface PressingOrder {
  id: number;
  pressing_type_id: number | null;
  customer_name: string; customer_phone: string;
  quantity: number; amount: number; status: string; payment_method: string;
  items_json?: string;
  itemsParsed?: PressingItemJson[];
  notes: string; created_at: string;
  pressingType?: PressingType;
}
interface Stats {
  today: { total_commandes: number; total_cash: number; tab_count: number };
  by_type: { name: string; nb_commandes: number; total: number }[];
}

const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';

// ─── Parse items_json d'une commande ─────────────────────────────────────────
const parseItems = (order: PressingOrder): PressingItemJson[] => {
  if (order.itemsParsed) return order.itemsParsed;
  if (order.items_json) {
    try { return JSON.parse(order.items_json); } catch { /* ignore */ }
  }
  // Fallback : mono-article
  if (order.pressingType) {
    return [{ pressing_type_id: order.pressing_type_id || 0, name: order.pressingType.name, quantity: order.quantity, unit_price: order.pressingType.price, total: order.amount }];
  }
  return [];
};

// ─── Ticket de dépôt (impression) ────────────────────────────────────────────
const printDepositTicket = (order: PressingOrder) => {
  const num = `TKT-${String(order.id).padStart(4, '0')}`;
  const now = new Date(order.created_at || Date.now());
  const items = parseItems(order);

  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}
    .center{text-align:center} .bold{font-weight:bold}
    .row{display:flex;justify-content:space-between;margin:3px 0}
    .sep{border-top:1px dashed #000;margin:8px 0}
    .title{font-size:14px;font-weight:bold;text-align:center}
    .big{font-size:16px;font-weight:bold;text-align:center;margin:6px 0}
    .box{border:1px solid #000;padding:6px;margin:6px 0;border-radius:4px}
    @media print{body{width:100%}}
  `;

  const itemsHtml = items.map(it =>
    `<div class="row"><span>${it.name} × ${it.quantity}</span><span><b>${fmt(it.total)}</b></span></div>`
  ).join('');

  const body = `
    <div class="title">🧺 PRESSING / REPASSAGE</div>
    <div class="center" style="font-size:10px">Piscine de Ouangolodougou</div>
    <div class="sep"></div>
    <div class="big">TICKET DE DÉPÔT</div>
    <div class="sep"></div>
    <div class="row"><span>N° Ticket :</span><span><b>${num}</b></span></div>
    <div class="row"><span>Date :</span><span>${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="sep"></div>
    <div class="box">
      <div class="row"><span>Client :</span><span><b>${order.customer_name}</b></span></div>
      ${order.customer_phone ? `<div class="row"><span>Tél. :</span><span>${order.customer_phone}</span></div>` : ''}
    </div>
    <div class="sep"></div>
    <div style="margin-bottom:4px"><b>Vêtements déposés :</b></div>
    <div class="box">${itemsHtml}</div>
    <div class="sep"></div>
    <div class="row"><span style="font-size:13px"><b>MONTANT À PAYER :</b></span><span style="font-size:14px"><b>${fmt(order.amount)}</b></span></div>
    <div class="sep"></div>
    <div class="center" style="font-size:11px;font-weight:bold;margin:6px 0">⚠️ PAIEMENT À LA CAISSE</div>
    <div class="center" style="font-size:10px;margin-top:2px">Présentez ce ticket pour récupérer vos vêtements</div>
    <div class="center" style="margin-top:8px;font-size:11px">Merci de votre confiance !</div>
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket</title><style>${css}</style></head><body>${body}</body></html>`;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
};

// ─── Composant principal ──────────────────────────────────────────────────────
const Pressing: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canManagePrix = hasPermission('pressing', 'gestion_prix');
  const [tab, setTab] = useState(0);
  const [pressingTypes, setPressingTypes] = useState<PressingType[]>([]);
  const [orders, setOrders] = useState<PressingOrder[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PressingOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // ── Dialog Nouvelle Commande ──────────────────────────────────────────────
  const [orderDialog, setOrderDialog] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  // Panier : { typeId → quantity }
  const [cart, setCart] = useState<Record<number, number>>({});

  // ── Dialog après création ─────────────────────────────────────────────────
  const [createdOrder, setCreatedOrder] = useState<PressingOrder | null>(null);

  // ── Dialog Gestion des types ──────────────────────────────────────────────
  const [typeDialog, setTypeDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState<PressingType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', price: '' });

  const showAlert = (type: 'success' | 'error' | 'info', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [types, ords, pending, st] = await Promise.all([
        pressingApi.getAllTypes(),
        pressingApi.getOrders({ date: new Date().toISOString().split('T')[0] }),
        pressingApi.getOrders({ status: 'en_attente' }),
        pressingApi.getStats()
      ]);
      const typesData: PressingType[] = types.data.data || types.data || [];
      setPressingTypes([...typesData].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setOrders(ords.data.data || ords.data || []);
      setPendingOrders(pending.data.data || pending.data || []);
      setStats(st.data.data || st.data || null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      showAlert('error', err?.response?.data?.message || err?.message || 'Erreur chargement');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Panier helpers ────────────────────────────────────────────────────────
  const setQty = (typeId: number, delta: number) => {
    setCart(prev => {
      const cur = prev[typeId] || 0;
      const next = Math.max(0, cur + delta);
      const updated = { ...prev };
      if (next === 0) delete updated[typeId];
      else updated[typeId] = next;
      return updated;
    });
  };

  const cartTotal = pressingTypes.reduce((sum, t) => {
    const qty = cart[t.id] || 0;
    return sum + qty * t.price;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const resetOrderDialog = () => {
    setCustomerName(''); setCustomerPhone(''); setOrderNotes(''); setCart({});
  };

  // ── Créer commande ────────────────────────────────────────────────────────
  const handleCreateOrder = async () => {
    if (!customerName.trim()) return showAlert('error', 'Nom du client requis');
    if (cartItemCount === 0) return showAlert('error', 'Sélectionnez au moins un article');

    const itemsPayload = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([typeId, qty]) => ({ pressing_type_id: parseInt(typeId), quantity: qty }));

    try {
      const res = await pressingApi.createOrder({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: itemsPayload,
      } as Parameters<typeof pressingApi.createOrder>[0]);

      const rawOrder = res.data.data;
      // Enrichir avec les types pour l'affichage
      const enriched: PressingOrder = {
        ...rawOrder,
        itemsParsed: rawOrder.itemsParsed || itemsPayload.map(it => {
          const t = pressingTypes.find(pt => pt.id === it.pressing_type_id)!;
          return { pressing_type_id: it.pressing_type_id, name: t.name, quantity: it.quantity, unit_price: t.price, total: t.price * it.quantity };
        }),
        created_at: rawOrder.created_at || new Date().toISOString()
      };

      setOrderDialog(false);
      resetOrderDialog();
      setCreatedOrder(enriched);

      // Imprimer ticket de dépôt automatiquement
      setTimeout(() => printDepositTicket(enriched), 200);
      loadAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showAlert('error', e?.response?.data?.message || 'Erreur création commande');
    }
  };

  // ── Gestion types ─────────────────────────────────────────────────────────
  const handleCreateType = async () => {
    if (!typeForm.name || !typeForm.price) return showAlert('error', 'Nom et prix requis');
    try {
      await pressingApi.createType({ name: typeForm.name, price: parseFloat(typeForm.price) });
      showAlert('success', 'Type créé');
      setTypeDialog(false); setTypeForm({ name: '', price: '' }); loadAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showAlert('error', e?.response?.data?.message || 'Erreur');
    }
  };

  const handleUpdateType = async () => {
    if (!editTypeDialog) return;
    try {
      await pressingApi.updateType(editTypeDialog.id, { name: editTypeDialog.name, price: editTypeDialog.price, is_active: editTypeDialog.is_active });
      showAlert('success', 'Type mis à jour'); setEditTypeDialog(null); loadAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showAlert('error', e?.response?.data?.message || 'Erreur');
    }
  };

  // ── Affichage articles d'une commande ─────────────────────────────────────
  const renderOrderItems = (order: PressingOrder) => {
    const items = parseItems(order);
    if (items.length === 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
    return (
      <Box>
        {items.map((it, i) => (
          <Typography key={i} variant="caption" display="block">
            {it.name} × {it.quantity}
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <Layout title="Pressing / Repassage">
      {alert && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Commandes du jour', value: stats.today?.total_commandes || 0, color: '#795548' },
            { label: 'En attente (Caisse)', value: pendingOrders.length, color: '#ff9800' },
            { label: 'Types actifs', value: pressingTypes.length, color: '#9c27b0' },
          ].map((s, i) => (
            <Grid item xs={6} md={4} key={i}>
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

      {/* Bandeau info paiement Caisse */}
      <Alert severity="info" icon={<CaisseIcon />} sx={{ mb: 2 }}>
        <strong>Paiements à la Caisse</strong> — Les commandes sont enregistrées ici. Le client règle à la Caisse.
      </Alert>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { resetOrderDialog(); setOrderDialog(true); }}
          sx={{ bgcolor: '#795548', '&:hover': { bgcolor: '#5d4037' } }}>
          Nouvelle Commande
        </Button>
        <Button variant="outlined" color="warning" startIcon={<CaisseIcon />}
          onClick={() => navigate('/caisse')}>
          Aller à la Caisse
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
          Actualiser
        </Button>
      </Box>

      {/* Onglets */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Commandes du jour (${orders.length})`} />
        <Tab label={
          <Badge badgeContent={pendingOrders.length} color="warning">
            <Box sx={{ pr: pendingOrders.length > 0 ? 1.5 : 0 }}>En attente Caisse</Box>
          </Badge>
        } />
        {canManagePrix && <Tab label="Gestion des types" />}
      </Tabs>

      {/* Tab 0 : Commandes du jour */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#795548' }}>
                {['#', 'Client', 'Articles', 'Montant', 'Statut', 'Heure', 'Ticket'].map(h => (
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
                  <TableCell>{renderOrderItems(o)}</TableCell>
                  <TableCell><Typography fontWeight="bold">{fmt(o.amount)}</Typography></TableCell>
                  <TableCell>
                    {o.status === 'paye'
                      ? <Chip size="small" label="✅ Payé (Caisse)" color="success" />
                      : o.status === 'en_attente'
                        ? <Chip size="small" icon={<WaitIcon />} label="En attente Caisse" color="warning" variant="outlined" />
                        : <Chip size="small" label={o.status} color="default" />
                    }
                  </TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>
                    {o.status === 'en_attente' && (
                      <Tooltip title="Réimprimer ticket de dépôt">
                        <IconButton size="small" color="warning" onClick={() => printDepositTicket(o)}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucune commande aujourd'hui</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1 : En attente Caisse */}
      {tab === 1 && (
        <Box>
          {pendingOrders.length === 0 ? (
            <Alert severity="success">Aucun ticket en attente — tout a été encaissé à la Caisse 🎉</Alert>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {pendingOrders.length} ticket(s) en attente de paiement à la Caisse.
                <Button size="small" color="warning" sx={{ ml: 1 }} onClick={() => navigate('/caisse')}>
                  → Aller à la Caisse
                </Button>
              </Alert>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#ff9800' }}>
                      {['N° Ticket', 'Client', 'Téléphone', 'Articles', 'Montant', 'Déposé le', 'Ticket'].map(h => (
                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingOrders.map(o => (
                      <TableRow key={o.id} hover sx={{ bgcolor: '#fff8e1' }}>
                        <TableCell>
                          <Chip label={`TKT-${String(o.id).padStart(4, '0')}`} size="small" color="warning" />
                        </TableCell>
                        <TableCell><Typography fontWeight="bold">{o.customer_name}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{o.customer_phone || '—'}</Typography></TableCell>
                        <TableCell>{renderOrderItems(o)}</TableCell>
                        <TableCell><Typography fontWeight="bold" color="warning.main">{fmt(o.amount)}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2">{new Date(o.created_at).toLocaleDateString('fr-FR')}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Réimprimer ticket de dépôt">
                            <IconButton size="small" color="warning" onClick={() => printDepositTicket(o)}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}

      {/* Tab 2 : Gestion des types */}
      {tab === 2 && canManagePrix && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTypeDialog(true)} sx={{ bgcolor: '#795548' }}>
              Ajouter un type
            </Button>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: '#795548' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type de service</TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Prix</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pressingTypes.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun type</TableCell></TableRow>
                )}
                {pressingTypes.map(type => (
                  <TableRow key={type.id} hover sx={{ opacity: type.is_active ? 1 : 0.5 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PressingIcon sx={{ color: '#795548', fontSize: 18 }} />
                        <Typography fontWeight={600}>{type.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right"><Typography fontWeight={700} color="#795548">{fmt(type.price)}</Typography></TableCell>
                    <TableCell align="center">
                      {type.is_active ? <Chip label="Actif" color="success" size="small" /> : <Chip label="Désactivé" color="default" size="small" />}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Modifier">
                        <IconButton size="small" color="primary" onClick={() => setEditTypeDialog({ ...type })}>
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
      )}

      {/* ══════════ DIALOG : Nouvelle Commande (panier) ══════════════════════ */}
      <Dialog open={orderDialog} onClose={() => setOrderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#795548', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PressingIcon /> Nouvelle Commande
            </Box>
            {cartItemCount > 0 && (
              <Chip icon={<CartIcon />} label={`${cartItemCount} art. — ${fmt(cartTotal)}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {/* Infos client */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField label="Nom du client *" value={customerName}
                onChange={e => setCustomerName(e.target.value)} fullWidth size="small" />
              <TextField label="Téléphone" value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)} fullWidth size="small" />
            </Box>

            {/* Grille des types avec +/- */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#795548' }}>
                🧺 Sélectionnez les vêtements :
              </Typography>
              {pressingTypes.filter(t => t.is_active).length === 0 && (
                <Alert severity="warning" sx={{ py: 0.5 }}>Aucun type actif. Ajoutez-en dans l'onglet "Gestion des types".</Alert>
              )}
              <Stack spacing={0.5}>
                {pressingTypes.filter(t => t.is_active).map(t => {
                  const qty = cart[t.id] || 0;
                  return (
                    <Box key={t.id} sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      px: 1.5, py: 1,
                      borderRadius: 1,
                      border: qty > 0 ? '2px solid #795548' : '1px solid #e0e0e0',
                      bgcolor: qty > 0 ? '#fdf6f0' : 'transparent',
                      transition: 'all 0.15s'
                    }}>
                      {/* Nom + prix */}
                      <Box>
                        <Typography variant="body2" fontWeight={qty > 0 ? 700 : 400}>
                          🧺 {t.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{fmt(t.price)} / pièce</Typography>
                      </Box>

                      {/* Contrôles +/- */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {qty > 0 && (
                          <Typography variant="body2" color="#795548" fontWeight={700} sx={{ mr: 1 }}>
                            {fmt(qty * t.price)}
                          </Typography>
                        )}
                        <IconButton size="small" color="error" onClick={() => setQty(t.id, -1)} disabled={qty === 0}
                          sx={{ border: '1px solid', borderColor: qty === 0 ? '#e0e0e0' : 'error.main', p: 0.3 }}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {qty}
                        </Typography>
                        <IconButton size="small" color="primary" onClick={() => setQty(t.id, 1)}
                          sx={{ border: '1px solid', borderColor: '#795548', p: 0.3, bgcolor: '#795548', color: 'white',
                            '&:hover': { bgcolor: '#5d4037' } }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* Total */}
            {cartTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                p: 1.5, bgcolor: '#795548', borderRadius: 1, color: 'white' }}>
                <Typography fontWeight={700}>TOTAL</Typography>
                <Typography variant="h5" fontWeight={700}>{fmt(cartTotal)}</Typography>
              </Box>
            )}

            <TextField label="Notes (facultatif)" value={orderNotes} multiline rows={2}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Ex: tâche sur la chemise, urgent…" fullWidth size="small" />

            <Alert severity="info" icon={<CaisseIcon />} sx={{ py: 0.5 }}>
              🎫 Un ticket de dépôt sera imprimé. Le client paie à la <strong>Caisse</strong>.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateOrder}
            disabled={cartItemCount === 0 || !customerName.trim()}
            sx={{ bgcolor: '#795548', '&:hover': { bgcolor: '#5d4037' } }}>
            🎫 Créer le ticket ({cartItemCount} art.)
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════ DIALOG : Après création ══════════════════════════════════ */}
      <Dialog open={!!createdOrder} onClose={() => setCreatedOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ff9800', color: 'white', textAlign: 'center' }}>
          🎫 Ticket créé — TKT-{String(createdOrder?.id || 0).padStart(4, '0')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {createdOrder && (
            <Stack spacing={1.5}>
              <Alert severity="success" sx={{ py: 0.5 }}>
                Ticket imprimé automatiquement. Le client règle à la Caisse.
              </Alert>
              <Box sx={{ border: '2px dashed #ff9800', borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Client :</Typography>
                  <Typography variant="body2" fontWeight={700}>{createdOrder.customer_name}</Typography>
                </Box>
                {createdOrder.customer_phone && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Tél. :</Typography>
                    <Typography variant="body2">{createdOrder.customer_phone}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">Articles :</Typography>
                {parseItems(createdOrder).map((it, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2">{it.name} × {it.quantity}</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(it.total)}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700}>À payer (Caisse) :</Typography>
                  <Typography fontWeight={700} color="warning.main">{fmt(createdOrder.amount)}</Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />}
            onClick={() => createdOrder && printDepositTicket(createdOrder)}>
            Réimprimer
          </Button>
          <Button variant="contained" color="warning" startIcon={<CaisseIcon />}
            onClick={() => { setCreatedOrder(null); navigate('/caisse'); }}>
            → Aller à la Caisse
          </Button>
          <Button onClick={() => setCreatedOrder(null)}>Fermer</Button>
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

      {/* Dialog: Modifier type */}
      {editTypeDialog && (
        <Dialog open={true} onClose={() => setEditTypeDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Modifier le type</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField label="Nom" value={editTypeDialog.name}
                onChange={e => setEditTypeDialog(d => d ? { ...d, name: e.target.value } : null)} fullWidth />
              <TextField label="Prix (FCFA)" type="number" value={editTypeDialog.price}
                onChange={e => setEditTypeDialog(d => d ? { ...d, price: parseFloat(e.target.value) } : null)} fullWidth />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button fullWidth variant={editTypeDialog.is_active ? 'contained' : 'outlined'} color="success"
                  onClick={() => setEditTypeDialog(d => d ? { ...d, is_active: true } : null)}>Actif</Button>
                <Button fullWidth variant={!editTypeDialog.is_active ? 'contained' : 'outlined'} color="error"
                  onClick={() => setEditTypeDialog(d => d ? { ...d, is_active: false } : null)}>Désactivé</Button>
              </Box>
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
