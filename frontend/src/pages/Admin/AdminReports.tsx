import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, IconButton,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, Tooltip
} from '@mui/material';
import {
  BarChart as ReportsIcon, Refresh as RefreshIcon,
  Business as BusinessIcon, TrendingUp as TrendingIcon,
  SupportAgent as TicketIcon
} from '@mui/icons-material';
import { superadminApi } from '../../services/api';

const fmtCFA = (n: number | string) => `${new Intl.NumberFormat('fr-FR').format(Number(n || 0))} F`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const AdminReports: React.FC = () => {
  const [reportType, setReportType] = useState('overview');
  const [data, setData] = useState<unknown[]>([]);
  const [overviewData, setOverviewData] = useState<Record<string, string | number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReport = async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { type: reportType };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const res = await superadminApi.getReports(params);
      if (reportType === 'overview') {
        setOverviewData(res.data.data as Record<string, string | number>);
        setData([]);
      } else {
        setData(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
        setOverviewData(null);
      }
    } catch { setError('Erreur lors du chargement du rapport'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); }, [reportType]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReportsIcon sx={{ fontSize: 28, color: '#4a148c' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Rapports</Typography>
            <Typography variant="body2" color="text.secondary">Statistiques et analyses de la plateforme</Typography>
          </Box>
        </Box>
        <Tooltip title="Actualiser"><IconButton onClick={loadReport} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Contrôles */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type de rapport</InputLabel>
                <Select value={reportType} label="Type de rapport" onChange={e => setReportType(e.target.value)}>
                  <MenuItem value="overview">Vue d'ensemble</MenuItem>
                  <MenuItem value="companies">Entreprises</MenuItem>
                  <MenuItem value="revenue">Revenus par mois</MenuItem>
                  <MenuItem value="tickets">Tickets par catégorie</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Du" type="date" InputLabelProps={{ shrink: true }}
                value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Au" type="date" InputLabelProps={{ shrink: true }}
                value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={loadReport} disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <ReportsIcon />}>
                Générer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {/* Vue d'ensemble */}
      {!loading && reportType === 'overview' && overviewData && (
        <Grid container spacing={2}>
          {[
            { label: 'Entreprises actives', value: overviewData.total_companies, icon: <BusinessIcon />, color: '#1a237e' },
            { label: 'Utilisateurs actifs', value: overviewData.total_users, icon: <ReportsIcon />, color: '#0d47a1' },
            { label: 'Revenu total', value: fmtCFA(overviewData.total_revenue as number), icon: <TrendingIcon />, color: '#1b5e20' },
            { label: 'Tickets ouverts', value: overviewData.open_tickets, icon: <TicketIcon />, color: '#e65100' },
            { label: 'Abonnements actifs', value: overviewData.active_subscriptions, icon: <BusinessIcon />, color: '#4a148c' },
          ].map(({ label, value, icon, color }) => (
            <Grid item xs={12} sm={6} md={4} key={label}>
              <Card sx={{ borderTop: `4px solid ${color}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>{label}</Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color }}>{String(value ?? 0)}</Typography>
                    </Box>
                    <Box sx={{ color, opacity: 0.3, fontSize: 40 }}>{icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Rapport Entreprises */}
      {!loading && reportType === 'companies' && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Entreprise</strong></TableCell>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Plan</strong></TableCell>
                <TableCell><strong>Utilisateurs</strong></TableCell>
                <TableCell><strong>Statut</strong></TableCell>
                <TableCell><strong>Créée le</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data as { id: number; name: string; code: string; plan: string; users_count: number; status: string; created_at: string }[]).map(c => (
                <TableRow key={c.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{c.name}</Typography></TableCell>
                  <TableCell><Chip label={c.code} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={c.plan} size="small" /></TableCell>
                  <TableCell>{c.users_count}</TableCell>
                  <TableCell><Chip label={c.status} size="small" color={c.status === 'actif' ? 'success' : 'error'} /></TableCell>
                  <TableCell><Typography variant="caption">{fmtDate(c.created_at)}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rapport Revenus */}
      {!loading && reportType === 'revenue' && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Mois</strong></TableCell>
                <TableCell><strong>Factures</strong></TableCell>
                <TableCell><strong>Revenu encaissé</strong></TableCell>
                <TableCell><strong>Factures impayées</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data as { month: string; invoice_count: string; revenue: string | null; unpaid_count: string }[]).map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell><Typography fontWeight={600}>{r.month}</Typography></TableCell>
                  <TableCell>{r.invoice_count}</TableCell>
                  <TableCell><Typography fontWeight={700} color="success.main">{fmtCFA(r.revenue || 0)}</Typography></TableCell>
                  <TableCell>{r.unpaid_count > '0' ? <Chip label={r.unpaid_count} size="small" color="error" /> : <Chip label="0" size="small" color="success" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rapport Tickets */}
      {!loading && reportType === 'tickets' && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Catégorie</strong></TableCell>
                <TableCell><strong>Priorité</strong></TableCell>
                <TableCell><strong>Statut</strong></TableCell>
                <TableCell><strong>Nombre</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data as { category: string; priority: string; status: string; count: string }[]).map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>{r.category}</TableCell>
                  <TableCell><Chip label={r.priority} size="small" color={r.priority === 'urgente' ? 'error' : r.priority === 'haute' ? 'warning' : 'default'} /></TableCell>
                  <TableCell><Chip label={r.status} size="small" /></TableCell>
                  <TableCell><Typography fontWeight={700}>{r.count}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AdminReports;
