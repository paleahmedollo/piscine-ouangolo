import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Chip, Alert, CircularProgress, IconButton,
  Divider, TablePagination, Collapse, Checkbox, Tooltip
} from '@mui/material';
import {
  FilterList as FilterIcon, SaveAlt as ExportIcon, Refresh as RefreshIcon,
  ExpandMore, ExpandLess, Print as PrintIcon, Assessment as AssessmentIcon,
  TrendingUp, TrendingDown, AttachMoney, Receipt as ReceiptIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import ClientReceiptDialog, { ClientReceiptData } from '../components/ClientReceiptDialog';
import { reportsApi, hotelApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  id: string; date: string; time: string; module: string; type: string;
  description: string; quantity: number; unit_price: number; amount: number;
  payment_method: string; payment_operator?: string; payment_reference?: string;
  user_id: number; user_name: string; reference: string;
  client_name?: string;
}

interface Stats {
  total_transactions: number; total_amount: number;
  by_module: Record<string, { count: number; amount: number }>;
  by_payment_method: Record<string, { count: number; amount: number }>;
  by_user: Record<string, { count: number; amount: number }>;
}

interface Summary {
  period: { start_date: string; end_date: string };
  totals: {
    revenue: Record<string, number>; total_ca: number; expenses: number;
    expenses_by_category?: Record<string, { count: number; total: number }>;
    net_profit: number; profit_margin: number;
  };
  counts: Record<string, number>;
  timeline: Array<{
    period: string; piscine: number; restaurant: number; hotel: number;
    events: number; depot: number; lavage?: number; pressing?: number;
    maquis?: number; superette?: number; total: number;
  }>;
}

interface User { id: number; full_name: string; username: string; role: string; }

// ─── Constantes ──────────────────────────────────────────────────────────────

const ALL_MODULES = ['piscine', 'restaurant', 'hotel', 'events', 'depot', 'lavage', 'pressing', 'maquis', 'superette'];

const moduleLabels: Record<string, string> = {
  piscine: 'Piscine', restaurant: 'Restaurant', hotel: 'Hôtel',
  events: 'Événements', depot: 'Dépôt', lavage: 'Lavage Auto',
  pressing: 'Pressing', maquis: 'Maquis / Bar', superette: 'Supérette'
};

const moduleColors: Record<string, string> = {
  Piscine: '#2196f3', Restaurant: '#ff9800', Hotel: '#4caf50',
  Evenements: '#9c27b0', Depot: '#795548',
  'Lavage Auto': '#00bcd4', Lavage: '#00bcd4',
  Pressing: '#8d6e63', 'Maquis / Bar': '#f44336', Maquis: '#f44336',
  Superette: '#607d8b'
};

const paymentLabels: Record<string, string> = {
  especes: 'Espèces', carte: 'Carte', mobile_money: 'Mobile Money',
  mobile: 'Mobile Money', virement: 'Virement', cheque: 'Chèque',
  acompte: 'Acompte', devis: 'Devis'
};

const FULL_ACCESS_ROLES = ['admin', 'gerant', 'responsable', 'directeur', 'maire', 'super_admin'];

const ROLE_MODULE_MAP: Record<string, string> = {
  maitre_nageur: 'piscine', serveuse: 'restaurant', serveur: 'restaurant',
  receptionniste: 'hotel', gestionnaire_events: 'events', gestionnaire_depot: 'depot'
};

const allColumns = [
  { id: 'date', label: 'Date' }, { id: 'time', label: 'Heure' },
  { id: 'module', label: 'Module' }, { id: 'type', label: 'Type' },
  { id: 'description', label: 'Description' }, { id: 'quantity', label: 'Qté' },
  { id: 'unit_price', label: 'Prix unit.' }, { id: 'amount', label: 'Montant' },
  { id: 'payment_method', label: 'Paiement' }, { id: 'user_name', label: 'Utilisateur' },
  { id: 'reference', label: 'Référence' }, { id: 'client_name', label: 'Client' }
];

const visibleColumns = ['date', 'time', 'module', 'type', 'quantity', 'amount', 'payment_method', 'reference', 'user_name'];

const formatCurrency = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

// ─── Composant ───────────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const { user } = useAuth();
  const hasFullAccess = user ? FULL_ACCESS_ROLES.includes(user.role) : false;
  const userRestrictedModule = user && !hasFullAccess ? (ROLE_MODULE_MAP[user.role] || null) : null;

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canFilterByUser, setCanFilterByUser] = useState(true);
  const [restrictedModule, setRestrictedModule] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [viewMode, setViewMode] = useState<'transactions' | 'summary'>('transactions');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ClientReceiptData | null>(null);
  const [, setReceiptLoading] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    module: '', user_id: '', payment_method: '', min_amount: '', max_amount: ''
  });

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (viewMode === 'transactions') fetchTransactions();
    else fetchSummary();
  }, [filters, sortBy, sortOrder, page, rowsPerPage, viewMode]);

  const fetchInitialData = async () => {
    try {
      const res = await reportsApi.getUsers();
      setUsers(res.data.data);
      if (res.data.restrictions) setCanFilterByUser(res.data.restrictions.canFilterByUser);
    } catch (e) { console.error(e); }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getTransactions({
        start_date: filters.start_date, end_date: filters.end_date,
        module: filters.module || undefined,
        user_id: filters.user_id ? parseInt(filters.user_id) : undefined,
        payment_method: filters.payment_method || undefined,
        min_amount: filters.min_amount ? parseFloat(filters.min_amount) : undefined,
        max_amount: filters.max_amount ? parseFloat(filters.max_amount) : undefined,
        sort_by: sortBy, sort_order: sortOrder, page: page + 1, limit: rowsPerPage
      });
      setTransactions(res.data.data.transactions);
      setStats(res.data.data.stats);
      setTotalRows(res.data.data.pagination.total);
      if (res.data.data.restrictions) setRestrictedModule(res.data.data.restrictions.restrictedModule);
    } catch (e) { setError('Erreur lors du chargement des transactions'); console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getSummary({ start_date: filters.start_date, end_date: filters.end_date, group_by: 'day' });
      setSummary(res.data.data);
    } catch (e) { setError('Erreur lors du chargement du résumé'); console.error(e); }
    finally { setLoading(false); }
  };

  // ── Raccourcis période ─────────────────────────────────────────────────────
  const setPeriod = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    let start: string;
    if (days === 0) {
      start = end;
    } else if (days === -1) {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    } else {
      start = new Date(new Date().setDate(new Date().getDate() - days)).toISOString().split('T')[0];
    }
    setFilters(f => ({ ...f, start_date: start, end_date: end }));
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = visibleColumns.map(c => allColumns.find(x => x.id === c)?.label || c);
    const rows = transactions.map(t =>
      visibleColumns.map(col => {
        if (col === 'amount' || col === 'unit_price') return (t as any)[col];
        if (col === 'date') return new Date(t.date).toLocaleDateString('fr-FR');
        return (t as any)[col] || '';
      })
    );
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_${filters.start_date}_${filters.end_date}.csv`;
    link.click();
  };

  // ── Sélection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => selectedIds.size === transactions.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(transactions.map(t => t.id)));

  // ── Impression reçu générique ──────────────────────────────────────────────
  const printReceipt = (t: Transaction) => {
    const cashier = user?.full_name || user?.username || 'Caissier';
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
    const num = `RC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const dateStr = `${new Date(t.date).toLocaleDateString('fr-FR')} ${t.time}`;
    const modLabel = moduleLabels[t.module?.toLowerCase()] || t.module;
    const payLabel = paymentLabels[t.payment_method] || t.payment_method;

    const css = `
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}
      .center{text-align:center}.bold{font-weight:bold}
      .row{display:flex;justify-content:space-between;margin:3px 0}
      .sep{border-top:1px dashed #000;margin:7px 0}
      .title{font-size:15px;font-weight:bold;text-align:center}
      .total{display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin:5px 0;background:#f5f5f5;padding:4px}
      @media print{body{width:100%}}
    `;
    const body = `
      <div class="title">${(user?.company?.name || 'Mon Entreprise').toUpperCase()}</div>
      <div class="center" style="font-size:10px">Reçu client</div>
      <div class="sep"></div>
      <div class="center bold">REÇU CLIENT</div>
      <div class="sep"></div>
      <div class="row"><span>N° Reçu :</span><span>${num}</span></div>
      <div class="row"><span>Date :</span><span>${dateStr}</span></div>
      <div class="sep"></div>
      <div class="bold" style="margin-bottom:4px">MODULE : ${modLabel.toUpperCase()}</div>
      ${t.client_name ? `<div class="row"><span>Client :</span><span>${t.client_name}</span></div>` : ''}
      <div class="row"><span>Réf. :</span><span>${t.reference || t.id}</span></div>
      <div class="sep"></div>
      <div style="margin:4px 0;font-size:11px">${t.description || '—'}</div>
      ${t.quantity > 1 ? `<div class="row"><span>Quantité :</span><span>${t.quantity}</span></div>` : ''}
      ${t.unit_price > 0 ? `<div class="row"><span>Prix unitaire :</span><span>${fmt(t.unit_price)}</span></div>` : ''}
      <div class="sep"></div>
      <div class="total"><span>TOTAL :</span><span>${fmt(t.amount)}</span></div>
      <div class="row"><span>Paiement :</span><span>${payLabel}</span></div>
      <div class="sep"></div>
      <div class="row"><span>Caissier :</span><span>${cashier}</span></div>
      <div style="margin-top:12px">Signature : ____________________</div>
      <div class="center" style="margin-top:10px;font-size:11px">Merci de votre visite !</div>
    `;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu</title><style>${css}</style></head><body>${body}</body></html>`;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const handlePrintHotelReceipt = async (t: Transaction) => {
    const match = t.reference?.match(/^RES-(\d+)$/);
    if (!match) { printReceipt(t); return; }
    setReceiptLoading(t.id);
    try {
      const res = await hotelApi.getFullReceipt(parseInt(match[1]));
      const d = res.data.data;
      setReceiptData({
        type: 'hotel', clientName: d.clientName, clientPhone: d.clientPhone || undefined,
        roomNumber: d.roomNumber, roomType: d.roomType, checkIn: d.checkIn, checkOut: d.checkOut,
        nights: d.nights, totalPrice: d.totalPrice, depositPaid: d.depositPaid, soldePaid: d.soldePaid,
        cashierName: user?.full_name || user?.username || 'Caissier',
        restaurantItems: d.restaurantItems, restaurantTotal: d.restaurantTotal
      });
      setReceiptDialogOpen(true);
    } catch (e) { console.error(e); printReceipt(t); }
    finally { setReceiptLoading(null); }
  };

  const printSelectedReceipts = () => {
    transactions.filter(t => selectedIds.has(t.id)).forEach((t, i) => {
      setTimeout(() => { t.module === 'Hotel' || t.module === 'Hôtel' ? handlePrintHotelReceipt(t) : printReceipt(t); }, i * 600);
    });
  };

  // ── Rendu cellule ──────────────────────────────────────────────────────────
  const OPERATOR_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
    moov:   { label: '🟢 Moov Money',   color: '#4caf50', textColor: '#fff' },
    orange: { label: '🟠 Orange Money', color: '#f4511e', textColor: '#fff' },
    wave:   { label: '🔵 Wave',          color: '#1565c0', textColor: '#fff' },
    mtn:    { label: '🟡 MTN Money',    color: '#ffc107', textColor: '#333' }
  };

  const renderCell = (t: Transaction, colId: string) => {
    const color = moduleColors[t.module] || '#607d8b';
    switch (colId) {
      case 'date': return new Date(t.date).toLocaleDateString('fr-FR');
      case 'time': return t.time;
      case 'module': return <Chip label={t.module} size="small" sx={{ bgcolor: `${color}20`, color, fontWeight: 'bold' }} />;
      case 'amount': return <Typography fontWeight="bold" color="primary">{formatCurrency(t.amount)}</Typography>;
      case 'unit_price': return t.unit_price > 0 ? formatCurrency(t.unit_price) : '—';
      case 'payment_method': {
        const op = t.payment_operator;
        if (t.payment_method === 'mobile_money' && op && OPERATOR_CONFIG[op]) {
          const cfg = OPERATOR_CONFIG[op];
          return <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.color, color: cfg.textColor, fontWeight: 'bold', fontSize: '0.65rem' }} />;
        }
        if (t.payment_method === 'carte') {
          return <Chip label="💳 Carte bancaire" size="small" sx={{ bgcolor: '#9c27b020', color: '#9c27b0', fontWeight: 'bold', fontSize: '0.65rem' }} />;
        }
        if (t.payment_method === 'mobile_money') {
          return <Chip label="📱 Mobile Money" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold', fontSize: '0.65rem' }} />;
        }
        if (t.payment_method === 'especes') {
          return <Chip label="💵 Espèces" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold', fontSize: '0.65rem' }} />;
        }
        return <Chip label={paymentLabels[t.payment_method] || t.payment_method} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />;
      }
      case 'reference': {
        const ref = t.reference;
        if (!ref) return '—';
        // Si c'est une référence de paiement réelle (7 chiffres), la mettre en avant
        if (/^\d{4,7}$/.test(ref)) {
          return <Chip label={`🔑 ${ref}`} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 'bold', fontSize: '0.65rem' }} />;
        }
        return <Typography variant="caption" color="text.secondary">{ref}</Typography>;
      }
      case 'quantity': return t.quantity;
      default: return (t as any)[colId] || '—';
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="Rapports">
      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filtre période */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="subtitle1" fontWeight="bold">Période :</Typography>
            </Grid>
            <Grid item xs={12} sm="auto">
              <TextField type="date" label="Date début" value={filters.start_date}
                onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid item xs={12} sm="auto">
              <TextField type="date" label="Date fin" value={filters.end_date}
                onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[
                  { label: "Aujourd'hui", days: 0 },
                  { label: '7 jours', days: 7 },
                  { label: '30 jours', days: 30 },
                  { label: 'Ce mois', days: -1 }
                ].map(({ label, days }) => (
                  <Chip key={label} label={label} size="small" variant="outlined" clickable onClick={() => setPeriod(days)} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant={viewMode === 'transactions' ? 'contained' : 'outlined'} startIcon={<FilterIcon />} onClick={() => setViewMode('transactions')}>
            Transactions
          </Button>
          <Button variant={viewMode === 'summary' ? 'contained' : 'outlined'} startIcon={<AssessmentIcon />} onClick={() => setViewMode('summary')}>
            Résumé
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={printSelectedReceipts}>
              Imprimer les reçus ({selectedIds.size})
            </Button>
          )}
          <Button variant="outlined" startIcon={<FilterIcon />} onClick={() => setShowFilters(!showFilters)}>
            Filtres {showFilters ? <ExpandLess /> : <ExpandMore />}
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExportCSV}>Exporter CSV</Button>
          <IconButton onClick={() => viewMode === 'transactions' ? fetchTransactions() : fetchSummary()}><RefreshIcon /></IconButton>
        </Box>
      </Box>

      {/* Restriction */}
      {!hasFullAccess && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vous visualisez uniquement vos propres transactions{restrictedModule && ` du module ${moduleLabels[restrictedModule] || restrictedModule}`}.
        </Alert>
      )}

      {/* Filtres supplémentaires */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Filtres supplémentaires</Typography>
            <Grid container spacing={2}>
              {hasFullAccess && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth select label="Module" value={filters.module}
                    onChange={e => setFilters(f => ({ ...f, module: e.target.value }))} size="small">
                    <MenuItem value="">Tous les modules</MenuItem>
                    {ALL_MODULES.map(m => <MenuItem key={m} value={m}>{moduleLabels[m]}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              {hasFullAccess && canFilterByUser && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth select label="Utilisateur" value={filters.user_id}
                    onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))} size="small">
                    <MenuItem value="">Tous</MenuItem>
                    {users.map(u => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth select label="Paiement" value={filters.payment_method}
                  onChange={e => setFilters(f => ({ ...f, payment_method: e.target.value }))} size="small">
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="especes">Espèces</MenuItem>
                  <MenuItem value="carte">Carte</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="mobile">Mobile Money</MenuItem>
                  <MenuItem value="virement">Virement</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3} md={1}>
                <TextField fullWidth type="number" label="Min" value={filters.min_amount}
                  onChange={e => setFilters(f => ({ ...f, min_amount: e.target.value }))} size="small" />
              </Grid>
              <Grid item xs={6} sm={3} md={1}>
                <TextField fullWidth type="number" label="Max" value={filters.max_amount}
                  onChange={e => setFilters(f => ({ ...f, max_amount: e.target.value }))} size="small" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : viewMode === 'transactions' ? (
        <>
          {/* Stats */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography color="text.secondary" variant="body2">Transactions</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.total_transactions}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography color="text.secondary" variant="body2">Montant Total</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">{formatCurrency(stats.total_amount)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography color="text.secondary" variant="body2" gutterBottom>Par Module</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Object.entries(stats.by_module).map(([mod, data]) => (
                        <Chip key={mod} label={`${mod}: ${data.count}`} size="small"
                          sx={{ bgcolor: `${moduleColors[mod] || '#607d8b'}20`, color: moduleColors[mod] || '#607d8b', fontWeight: 'bold' }} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography color="text.secondary" variant="body2">Top Utilisateur</Typography>
                    {Object.entries(stats.by_user).length > 0 && (
                      <Typography variant="body1" fontWeight="bold">
                        {Object.entries(stats.by_user).sort((a, b) => b[1].amount - a[1].amount)[0]?.[0]}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Tableau des transactions */}
          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small"
                        checked={transactions.length > 0 && selectedIds.size === transactions.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < transactions.length}
                        onChange={toggleSelectAll} title="Tout sélectionner" />
                    </TableCell>
                    {visibleColumns.map(colId => (
                      <TableCell key={colId} sx={{ fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => { if (sortBy === colId) setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC'); else { setSortBy(colId); setSortOrder('DESC'); } }}>
                        {allColumns.find(c => c.id === colId)?.label}{sortBy === colId && (sortOrder === 'DESC' ? ' ↓' : ' ↑')}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold' }}>Reçu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id} hover selected={selectedIds.has(t.id)}
                      onClick={() => toggleSelect(t.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)} onClick={e => e.stopPropagation()} />
                      </TableCell>
                      {visibleColumns.map(colId => <TableCell key={colId}>{renderCell(t, colId)}</TableCell>)}
                      <TableCell>
                        <Tooltip title="Imprimer le reçu">
                          <IconButton size="small" color="primary"
                            onClick={e => { e.stopPropagation(); t.module === 'Hotel' || t.module === 'Hôtel' ? handlePrintHotelReceipt(t) : printReceipt(t); }}>
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Aucune transaction trouvée pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={totalRows} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100, 200]} labelRowsPerPage="Lignes :" />
          </Card>
        </>
      ) : (
        summary && (
          <Grid container spacing={1.5}>
            {/* Cartes totaux */}
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Chiffre d'Affaires</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="primary">{formatCurrency(summary.totals.total_ca)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#ffebee' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown color="error" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Dépenses</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="error">{formatCurrency(summary.totals.expenses)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: summary.totals.net_profit >= 0 ? '#e8f5e9' : '#ffebee' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp color={summary.totals.net_profit >= 0 ? 'success' : 'error'} fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Bénéfice Net</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color={summary.totals.net_profit >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(summary.totals.net_profit)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="body2" color="text.secondary">Marge bénéficiaire</Typography>
                  <Typography variant="h6" fontWeight="bold">{summary.totals.profit_margin}%</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Revenus par module */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Revenus par Module</Typography>
                  <Divider sx={{ mb: 1 }} />
                  {Object.entries(summary.totals.revenue)
                    .filter(([m]) => !userRestrictedModule || m === userRestrictedModule)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([m, amount]) => (
                      <Box key={m} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Chip label={moduleLabels[m] || m} size="small"
                          sx={{ bgcolor: `${moduleColors[moduleLabels[m]] || moduleColors[m] || '#607d8b'}20` }} />
                        <Typography variant="body2" fontWeight="bold">{formatCurrency(amount as number)}</Typography>
                      </Box>
                    ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Dépenses par catégorie */}
            {summary.totals.expenses > 0 && summary.totals.expenses_by_category && (
              <Grid item xs={12} md={6}>
                <Card sx={{ border: '1px solid #ef9a9a' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TrendingDown color="error" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight="bold">Dépenses par catégorie</Typography>
                    </Box>
                    <Divider sx={{ mb: 1 }} />
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#ffebee' }}>
                            <TableCell><strong>Catégorie</strong></TableCell>
                            <TableCell align="right"><strong>Nb</strong></TableCell>
                            <TableCell align="right"><strong>Total</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(summary.totals.expenses_by_category).map(([cat, data]) => (
                            <TableRow key={cat}>
                              <TableCell><Chip label={cat} size="small" /></TableCell>
                              <TableCell align="right">{data.count}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{formatCurrency(data.total)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow sx={{ bgcolor: '#ffebee' }}>
                            <TableCell colSpan={2} align="right"><strong>Total dépenses</strong></TableCell>
                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}><strong>{formatCurrency(summary.totals.expenses)}</strong></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Nombre de transactions par module */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Nombre de Transactions par Module</Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {Object.entries(summary.counts)
                      .filter(([k]) => !userRestrictedModule || k === userRestrictedModule || !ALL_MODULES.includes(k))
                      .map(([k, count]) => (
                        <Grid item xs={6} sm={4} key={k}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {moduleLabels[k] || k.charAt(0).toUpperCase() + k.slice(1)}
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">{count}</Typography>
                          </Box>
                        </Grid>
                      ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Évolution journalière — tous les modules */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Évolution Journalière</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Date</strong></TableCell>
                          {ALL_MODULES.filter(m => !userRestrictedModule || m === userRestrictedModule).map(m => (
                            <TableCell key={m} align="right"><strong>{moduleLabels[m]}</strong></TableCell>
                          ))}
                          <TableCell align="right"><strong>Total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary.timeline.slice(-15).map(row => (
                          <TableRow key={row.period} hover>
                            <TableCell>{row.period}</TableCell>
                            {ALL_MODULES.filter(m => !userRestrictedModule || m === userRestrictedModule).map(m => (
                              <TableCell key={m} align="right">{formatCurrency((row as any)[m] || 0)}</TableCell>
                            ))}
                            <TableCell align="right">
                              <strong>{formatCurrency(userRestrictedModule ? ((row as any)[userRestrictedModule] || 0) : row.total)}</strong>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )
      )}

      <ClientReceiptDialog
        open={receiptDialogOpen}
        data={receiptData}
        onClose={() => { setReceiptDialogOpen(false); setReceiptData(null); }}
      />
    </Layout>
  );
};

export default Reports;
