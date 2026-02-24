import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  TablePagination,
  Collapse,
  Checkbox
} from '@mui/material';
import {
  FilterList as FilterIcon,
  SaveAlt as ExportIcon,
  Refresh as RefreshIcon,
  ExpandMore,
  ExpandLess,
  Print as PrintIcon,
  Assessment as AssessmentIcon,
  TrendingUp,
  TrendingDown,
  AttachMoney
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import ClientReceiptDialog, { ClientReceiptData } from '../components/ClientReceiptDialog';
import { reportsApi, hotelApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  id: string;
  date: string;
  time: string;
  module: string;
  type: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  payment_method: string;
  user_id: number;
  user_name: string;
  reference: string;
  client_name?: string;
}

interface Stats {
  total_transactions: number;
  total_amount: number;
  by_module: Record<string, { count: number; amount: number }>;
  by_payment_method: Record<string, { count: number; amount: number }>;
  by_user: Record<string, { count: number; amount: number }>;
}

interface Summary {
  period: { start_date: string; end_date: string };
  totals: {
    revenue: Record<string, number>;
    total_ca: number;
    expenses: number;
    net_profit: number;
    profit_margin: number;
  };
  counts: Record<string, number>;
  timeline: Array<{ period: string; piscine: number; restaurant: number; hotel: number; events: number; total: number }>;
}

interface User {
  id: number;
  full_name: string;
  username: string;
  role: string;
}

const allColumns = [
  { id: 'date', label: 'Date', width: 100 },
  { id: 'time', label: 'Heure', width: 80 },
  { id: 'module', label: 'Module', width: 100 },
  { id: 'type', label: 'Type', width: 120 },
  { id: 'description', label: 'Description', width: 200 },
  { id: 'quantity', label: 'Quantite', width: 80 },
  { id: 'unit_price', label: 'Prix unit.', width: 100 },
  { id: 'amount', label: 'Montant', width: 120 },
  { id: 'payment_method', label: 'Paiement', width: 100 },
  { id: 'user_name', label: 'Utilisateur', width: 120 },
  { id: 'reference', label: 'Reference', width: 100 },
  { id: 'client_name', label: 'Client', width: 120 }
];

const moduleColors: Record<string, string> = {
  'Piscine': '#2196f3',
  'Restaurant': '#ff9800',
  'Hotel': '#4caf50',
  'Evenements': '#9c27b0'
};

const paymentLabels: Record<string, string> = {
  'especes': 'Especes',
  'carte': 'Carte',
  'mobile_money': 'Mobile Money',
  'virement': 'Virement',
  'cheque': 'Cheque',
  'acompte': 'Acompte',
  'devis': 'Devis'
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

// Roles avec acces complet
const FULL_ACCESS_ROLES = ['admin', 'gerant', 'responsable', 'directeur', 'maire'];

// Mapping role -> module pour les employes
const ROLE_MODULE_MAP: Record<string, string> = {
  'maitre_nageur': 'piscine',
  'serveuse': 'restaurant',
  'serveur': 'restaurant',
  'receptionniste': 'hotel',
  'gestionnaire_events': 'events'
};

// Labels des modules
const moduleLabels: Record<string, string> = {
  'piscine': 'Piscine',
  'restaurant': 'Restaurant',
  'hotel': 'Hotel',
  'events': 'Evenements'
};

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Restrictions d'acces
  const [canFilterByUser, setCanFilterByUser] = useState(true);
  const [restrictedModule, setRestrictedModule] = useState<string | null>(null);
  const hasFullAccess = user ? FULL_ACCESS_ROLES.includes(user.role) : false;
  const userRestrictedModule = user && !hasFullAccess ? (ROLE_MODULE_MAP[user.role] || null) : null;

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    module: '',
    user_id: '',
    payment_method: '',
    min_amount: '',
    max_amount: ''
  });

  // Table settings
  const visibleColumns = ['date', 'time', 'module', 'type', 'quantity', 'amount', 'user_name'];
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  // View mode
  const [viewMode, setViewMode] = useState<'transactions' | 'summary'>('transactions');

  // Reçu hôtel depuis les rapports
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ClientReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (viewMode === 'transactions') {
      fetchTransactions();
    } else {
      fetchSummary();
    }
  }, [filters, sortBy, sortOrder, page, rowsPerPage, viewMode]);

  const fetchInitialData = async () => {
    try {
      const usersRes = await reportsApi.getUsers();
      setUsers(usersRes.data.data);
      if (usersRes.data.restrictions) {
        setCanFilterByUser(usersRes.data.restrictions.canFilterByUser);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getTransactions({
        start_date: filters.start_date,
        end_date: filters.end_date,
        module: filters.module || undefined,
        user_id: filters.user_id ? parseInt(filters.user_id) : undefined,
        payment_method: filters.payment_method || undefined,
        min_amount: filters.min_amount ? parseFloat(filters.min_amount) : undefined,
        max_amount: filters.max_amount ? parseFloat(filters.max_amount) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: page + 1,
        limit: rowsPerPage
      });
      setTransactions(response.data.data.transactions);
      setStats(response.data.data.stats);
      setTotalRows(response.data.data.pagination.total);

      if (response.data.data.restrictions) {
        setRestrictedModule(response.data.data.restrictions.restrictedModule);
      }
    } catch (err) {
      setError('Erreur lors du chargement des transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getSummary({
        start_date: filters.start_date,
        end_date: filters.end_date,
        group_by: 'day'
      });
      setSummary(response.data.data);
    } catch (err) {
      setError('Erreur lors du chargement du resume');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = visibleColumns.map(col => allColumns.find(c => c.id === col)?.label || col);
    const rows = transactions.map(t =>
      visibleColumns.map(col => {
        const value = t[col as keyof Transaction];
        if (col === 'amount' || col === 'unit_price') return value;
        if (col === 'date') return new Date(t.date).toLocaleDateString('fr-FR');
        return value || '';
      })
    );

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_${filters.start_date}_${filters.end_date}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const printReceipt = (t: Transaction) => {
    const paymentLabel: Record<string, string> = {
      especes: 'Espèces', carte: 'Carte', mobile_money: 'Mobile Money',
      virement: 'Virement', cheque: 'Chèque', acompte: 'Acompte', devis: 'Devis'
    };
    const cashier = user?.full_name || user?.username || 'Caissier';
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
    const now = new Date();
    const num = `RC-${now.getFullYear()}-${now.getTime().toString().slice(-6)}`;
    const dateStr = `${new Date(t.date).toLocaleDateString('fr-FR')} ${t.time}`;

    const css = `
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}
      .center{text-align:center}.bold{font-weight:bold}
      .row{display:flex;justify-content:space-between;margin:2px 0}
      .sep{border-top:1px dashed #000;margin:6px 0}
      .title{font-size:15px;font-weight:bold;text-align:center}
      .total{display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin:4px 0}
      @media print{body{width:100%}}
    `;

    const body = `
      <div class="title">PISCINE DE OUANGOLO</div>
      <div class="center" style="font-size:10px">Ouangolo, Côte d'Ivoire</div>
      <div class="sep"></div>
      <div class="center bold">REÇU CLIENT</div>
      <div class="sep"></div>
      <div class="row"><span>N° Reçu :</span><span>${num}</span></div>
      <div class="row"><span>Date :</span><span>${dateStr}</span></div>
      <div class="sep"></div>
      <div class="bold" style="margin-bottom:4px">MODULE : ${t.module.toUpperCase()}</div>
      ${t.client_name ? `<div class="row"><span>Client :</span><span>${t.client_name}</span></div>` : ''}
      <div class="row"><span>Ref. :</span><span>${t.reference || t.id}</span></div>
      <div class="sep"></div>
      <div style="margin:2px 0;font-size:11px">${t.description}</div>
      <div class="sep"></div>
      <div class="total"><span>MONTANT :</span><span>${fmt(t.amount)}</span></div>
      <div class="row"><span>Paiement :</span><span>${paymentLabel[t.payment_method] || t.payment_method}</span></div>
      <div class="sep"></div>
      <div class="row"><span>Caissier :</span><span>${cashier}</span></div>
      <div style="margin-top:12px">Signature : ____________________</div>
      <div class="center" style="margin-top:8px">Merci de votre visite !</div>
    `;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu</title><style>${css}</style></head><body>${body}</body></html>`;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const printSelectedReceipts = () => {
    const selected = transactions.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) return;
    // Un reçu individuel par transaction sélectionnée
    selected.forEach((t, i) => {
      setTimeout(() => printReceipt(t), i * 600);
    });
  };

  const handlePrintHotelReceipt = async (t: Transaction) => {
    // Extraire l'ID de réservation depuis reference = 'RES-123'
    const match = t.reference?.match(/^RES-(\d+)$/);
    if (!match) {
      printReceipt(t); // fallback reçu générique
      return;
    }
    const resId = parseInt(match[1]);
    setReceiptLoading(t.id);
    try {
      const res = await hotelApi.getFullReceipt(resId);
      const d = res.data.data;
      setReceiptData({
        type: 'hotel',
        clientName: d.clientName,
        clientPhone: d.clientPhone || undefined,
        roomNumber: d.roomNumber,
        roomType: d.roomType,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
        nights: d.nights,
        totalPrice: d.totalPrice,
        depositPaid: d.depositPaid,
        soldePaid: d.soldePaid,
        cashierName: user?.full_name || user?.username || 'Caissier',
        restaurantItems: d.restaurantItems,
        restaurantTotal: d.restaurantTotal
      });
      setReceiptDialogOpen(true);
    } catch (e) {
      console.error('Erreur chargement reçu hôtel:', e);
      printReceipt(t); // fallback reçu générique
    } finally {
      setReceiptLoading(null);
    }
  };

  const renderCellValue = (transaction: Transaction, columnId: string) => {
    switch (columnId) {
      case 'date':
        return new Date(transaction.date).toLocaleDateString('fr-FR');
      case 'time':
        return transaction.time;
      case 'module':
        return (
          <Chip
            label={transaction.module}
            size="small"
            sx={{
              backgroundColor: `${moduleColors[transaction.module]}20`,
              color: moduleColors[transaction.module],
              fontWeight: 'bold'
            }}
          />
        );
      case 'amount':
      case 'unit_price':
        return (
          <Typography fontWeight="bold" color={columnId === 'amount' ? 'primary' : 'text.primary'}>
            {formatCurrency(transaction[columnId])}
          </Typography>
        );
      case 'payment_method':
        return paymentLabels[transaction.payment_method] || transaction.payment_method;
      case 'quantity':
        return transaction.quantity;
      default:
        return transaction[columnId as keyof Transaction] || '-';
    }
  };

  return (
    <Layout title="Rapports">
      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filtre par periode - en haut */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="subtitle1" fontWeight="bold">Periode :</Typography>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Date debut"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Date fin"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={viewMode === 'transactions' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('transactions')}
            startIcon={<FilterIcon />}
          >
            Transactions
          </Button>
          <Button
            variant={viewMode === 'summary' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('summary')}
            startIcon={<AssessmentIcon />}
          >
            Resume
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={printSelectedReceipts}
            >
              Imprimer les reçus ({selectedIds.size})
            </Button>
          )}
          <Button variant="outlined" startIcon={<FilterIcon />} onClick={() => setShowFilters(!showFilters)}>
            Filtres {showFilters ? <ExpandLess /> : <ExpandMore />}
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExportCSV}>
            Exporter
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            Imprimer
          </Button>
          <IconButton onClick={() => viewMode === 'transactions' ? fetchTransactions() : fetchSummary()}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Restriction Alert */}
      {!hasFullAccess && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vous visualisez uniquement vos propres transactions
          {restrictedModule && ` du module ${moduleLabels[restrictedModule] || restrictedModule}`}.
        </Alert>
      )}

      {/* Filtres supplementaires */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Filtres supplementaires</Typography>
            <Grid container spacing={2}>
              {hasFullAccess && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    select
                    label="Module"
                    value={filters.module}
                    onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="piscine">Piscine</MenuItem>
                    <MenuItem value="restaurant">Restaurant</MenuItem>
                    <MenuItem value="hotel">Hotel</MenuItem>
                    <MenuItem value="events">Evenements</MenuItem>
                  </TextField>
                </Grid>
              )}
              {hasFullAccess && canFilterByUser && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    select
                    label="Utilisateur"
                    value={filters.user_id}
                    onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="">Tous</MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  select
                  label="Paiement"
                  value={filters.payment_method}
                  onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                  size="small"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="especes">Especes</MenuItem>
                  <MenuItem value="carte">Carte</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="virement">Virement</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3} md={1}>
                <TextField
                  fullWidth
                  type="number"
                  label="Min"
                  value={filters.min_amount}
                  onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3} md={1}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max"
                  value={filters.max_amount}
                  onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'transactions' ? (
        <>
          {/* Stats Summary */}
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
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {formatCurrency(stats.total_amount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography color="text.secondary" variant="body2">Par Module</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                      {Object.entries(stats.by_module).map(([module, data]) => (
                        <Chip
                          key={module}
                          label={`${module}: ${data.count}`}
                          size="small"
                          sx={{ backgroundColor: `${moduleColors[module]}20`, color: moduleColors[module] }}
                        />
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

          {/* Transactions Table */}
          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={transactions.length > 0 && selectedIds.size === transactions.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < transactions.length}
                        onChange={toggleSelectAll}
                        title="Tout sélectionner"
                      />
                    </TableCell>
                    {visibleColumns.map(colId => {
                      const col = allColumns.find(c => c.id === colId);
                      return (
                        <TableCell
                          key={colId}
                          sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={() => {
                            if (sortBy === colId) {
                              setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                            } else {
                              setSortBy(colId);
                              setSortOrder('DESC');
                            }
                          }}
                        >
                          {col?.label}
                          {sortBy === colId && (sortOrder === 'DESC' ? ' ↓' : ' ↑')}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ fontWeight: 'bold', width: 50 }}>Reçu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      hover
                      selected={selectedIds.has(transaction.id)}
                      onClick={() => toggleSelect(transaction.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedIds.has(transaction.id)}
                          onChange={() => toggleSelect(transaction.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      {visibleColumns.map(colId => (
                        <TableCell key={colId}>
                          {renderCellValue(transaction, colId)}
                        </TableCell>
                      ))}
                      <TableCell>
                        {transaction.module === 'Hotel' && (
                          <IconButton
                            size="small"
                            title="Imprimer le reçu hôtel"
                            onClick={(e) => { e.stopPropagation(); handlePrintHotelReceipt(transaction); }}
                            disabled={receiptLoading === transaction.id}
                            color="primary"
                          >
                            {receiptLoading === transaction.id
                              ? <CircularProgress size={16} />
                              : <PrintIcon fontSize="small" />}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 2} align="center" sx={{ py: 4 }}>
                        Aucune transaction trouvee
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Lignes:"
            />
          </Card>
        </>
      ) : (
        summary && (
          <Grid container spacing={1.5}>
            {/* Totals Cards */}
            <Grid item xs={6} md={3}>
              <Card sx={{ backgroundColor: '#e3f2fd' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Chiffre d'Affaires</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formatCurrency(summary.totals.total_ca)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ backgroundColor: '#ffebee' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown color="error" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Depenses</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="error">
                    {formatCurrency(summary.totals.expenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ backgroundColor: summary.totals.net_profit >= 0 ? '#e8f5e9' : '#ffebee' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp color={summary.totals.net_profit >= 0 ? 'success' : 'error'} fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Benefice Net</Typography>
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
                  <Typography variant="body2" color="text.secondary">Marge</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {summary.totals.profit_margin}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Revenue by Module */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Revenus par Module</Typography>
                  <Divider sx={{ mb: 1 }} />
                  {Object.entries(summary.totals.revenue)
                    .filter(([module]) => !userRestrictedModule || module === userRestrictedModule)
                    .map(([module, amount]) => (
                      <Box key={module} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Chip
                          label={moduleLabels[module] || module}
                          size="small"
                          sx={{ backgroundColor: `${moduleColors[moduleLabels[module] || module]}20` }}
                        />
                        <Typography variant="body2" fontWeight="bold">{formatCurrency(amount as number)}</Typography>
                      </Box>
                    ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Counts */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Nombre de Transactions</Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {Object.entries(summary.counts)
                      .filter(([key]) => !userRestrictedModule || key === userRestrictedModule || !['piscine','restaurant','hotel','events'].includes(key))
                      .map(([key, count]) => (
                        <Grid item xs={6} key={key}>
                          <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {moduleLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">{count}</Typography>
                          </Box>
                        </Grid>
                      ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Timeline */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Evolution Journaliere</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Date</strong></TableCell>
                          {(!userRestrictedModule || userRestrictedModule === 'piscine') && <TableCell align="right"><strong>Piscine</strong></TableCell>}
                          {(!userRestrictedModule || userRestrictedModule === 'restaurant') && <TableCell align="right"><strong>Restaurant</strong></TableCell>}
                          {(!userRestrictedModule || userRestrictedModule === 'hotel') && <TableCell align="right"><strong>Hotel</strong></TableCell>}
                          {(!userRestrictedModule || userRestrictedModule === 'events') && <TableCell align="right"><strong>Evenements</strong></TableCell>}
                          <TableCell align="right"><strong>Total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary.timeline.slice(-15).map((row) => (
                          <TableRow key={row.period} hover>
                            <TableCell>{row.period}</TableCell>
                            {(!userRestrictedModule || userRestrictedModule === 'piscine') && <TableCell align="right">{formatCurrency(row.piscine)}</TableCell>}
                            {(!userRestrictedModule || userRestrictedModule === 'restaurant') && <TableCell align="right">{formatCurrency(row.restaurant)}</TableCell>}
                            {(!userRestrictedModule || userRestrictedModule === 'hotel') && <TableCell align="right">{formatCurrency(row.hotel)}</TableCell>}
                            {(!userRestrictedModule || userRestrictedModule === 'events') && <TableCell align="right">{formatCurrency(row.events)}</TableCell>}
                            <TableCell align="right"><strong>{formatCurrency(userRestrictedModule ? row[userRestrictedModule as keyof typeof row] as number : row.total)}</strong></TableCell>
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
      {/* Reçu hôtel structuré depuis les rapports */}
      <ClientReceiptDialog
        open={receiptDialogOpen}
        data={receiptData}
        onClose={() => { setReceiptDialogOpen(false); setReceiptData(null); }}
      />
    </Layout>
  );
};

export default Reports;
