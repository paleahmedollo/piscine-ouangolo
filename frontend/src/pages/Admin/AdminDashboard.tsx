import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Alert, Chip, Divider, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import {
  Business as BusinessIcon, People as PeopleIcon,
  CardMembership as SubscriptionIcon, Receipt as BillingIcon,
  SupportAgent as TicketIcon, TrendingUp as TrendingIcon,
  Refresh as RefreshIcon, Warning as WarningIcon,
  CheckCircle as OkIcon, Error as ErrorIcon
} from '@mui/icons-material';
import { superadminApi } from '../../services/api';

interface DashboardStats {
  companies: { total: number; active: number; suspended: number; expired: number; new_7d: number };
  users: { total: number; active: number };
  subscriptions: { active: number; expired: number };
  tickets: { open: number; urgent: number; resolved_week: number };
  finance: { revenue_month: number; revenue_total: number; unpaid_invoices: number };
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtCFA = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} F`;

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  chip?: { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' | 'primary' };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, bgColor, chip }) => (
  <Card sx={{ height: '100%', border: `1px solid ${bgColor}`, borderTop: `3px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color, mt: 0.3, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {subtitle && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{subtitle}</Typography>}
          {chip && <Chip label={chip.label} color={chip.color} size="small" sx={{ mt: 0.3, height: 18, fontSize: '0.62rem' }} />}
        </Box>
        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: bgColor }}>
          <Box sx={{ color, '& svg': { fontSize: 20 } }}>{icon}</Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true); setError('');
    try {
      const res = await superadminApi.getDashboardStats();
      setStats(res.data.data);
    } catch {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress size={48} />
    </Box>
  );

  if (error) return <Alert severity="error" action={<IconButton onClick={loadStats}><RefreshIcon /></IconButton>}>{error}</Alert>;

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1a237e">Tableau de bord</Typography>
          <Typography variant="body2" color="text.secondary">Vue globale de la plateforme Ollentra</Typography>
        </Box>
        <Tooltip title="Actualiser">
          <IconButton onClick={loadStats}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* Alertes */}
      {stats && (stats.tickets.urgent > 0 || stats.finance.unpaid_invoices > 0 || stats.companies.expired > 0) && (
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {stats.tickets.urgent > 0 && (
            <Alert severity="error" icon={<WarningIcon />} sx={{ py: 0.5 }}>
              {stats.tickets.urgent} ticket(s) <strong>urgent(s)</strong> en attente de traitement
            </Alert>
          )}
          {stats.finance.unpaid_invoices > 0 && (
            <Alert severity="warning" icon={<BillingIcon />} sx={{ py: 0.5 }}>
              {stats.finance.unpaid_invoices} facture(s) impayée(s) en attente
            </Alert>
          )}
          {stats.companies.expired > 0 && (
            <Alert severity="info" icon={<SubscriptionIcon />} sx={{ py: 0.5 }}>
              {stats.companies.expired} abonnement(s) expiré(s)
            </Alert>
          )}
        </Box>
      )}

      {/* Cartes principales */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* Entreprises */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Entreprises"
            value={fmt(stats?.companies.total || 0)}
            subtitle={`+${stats?.companies.new_7d || 0} cette semaine`}
            icon={<BusinessIcon />}
            color="#1a237e" bgColor="#e8eaf6"
            chip={{ label: `${stats?.companies.active || 0} actives`, color: 'success' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Utilisateurs"
            value={fmt(stats?.users.total || 0)}
            subtitle={`${stats?.users.active || 0} actifs`}
            icon={<PeopleIcon />}
            color="#0d47a1" bgColor="#e3f2fd"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Abonnements actifs"
            value={fmt(stats?.subscriptions.active || 0)}
            subtitle={`${stats?.subscriptions.expired || 0} expirés`}
            icon={<SubscriptionIcon />}
            color="#2e7d32" bgColor="#e8f5e9"
            chip={stats?.subscriptions.expired ? { label: `${stats.subscriptions.expired} expirés`, color: 'warning' } : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tickets ouverts"
            value={fmt(stats?.tickets.open || 0)}
            subtitle={`${stats?.tickets.urgent || 0} urgents`}
            icon={<TicketIcon />}
            color={stats?.tickets.urgent ? '#c62828' : '#e65100'} bgColor="#fff3e0"
            chip={stats?.tickets.urgent ? { label: `${stats.tickets.urgent} urgents`, color: 'error' } : undefined}
          />
        </Grid>
      </Grid>

      {/* Revenus */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Revenu du mois"
            value={fmtCFA(stats?.finance.revenue_month || 0)}
            subtitle="Factures payées ce mois"
            icon={<TrendingIcon />}
            color="#1b5e20" bgColor="#e8f5e9"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Revenu total"
            value={fmtCFA(stats?.finance.revenue_total || 0)}
            subtitle="Depuis le démarrage"
            icon={<BillingIcon />}
            color="#4a148c" bgColor="#f3e5f5"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Factures impayées"
            value={fmt(stats?.finance.unpaid_invoices || 0)}
            subtitle="À recouvrer"
            icon={<ErrorIcon />}
            color={stats?.finance.unpaid_invoices ? '#b71c1c' : '#37474f'} bgColor="#ffebee"
            chip={stats?.finance.unpaid_invoices ? { label: 'Action requise', color: 'error' } : { label: 'OK', color: 'success' }}
          />
        </Grid>
      </Grid>

      {/* Vue synthétique statut entreprises */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                📊 Statut des entreprises
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              {[
                { label: 'Actives', value: stats?.companies.active || 0, total: stats?.companies.total || 1, color: '#2e7d32', bg: '#e8f5e9' },
                { label: 'Suspendues', value: stats?.companies.suspended || 0, total: stats?.companies.total || 1, color: '#e65100', bg: '#fff3e0' },
                { label: 'Expirées', value: stats?.companies.expired || 0, total: stats?.companies.total || 1, color: '#b71c1c', bg: '#ffebee' },
              ].map(({ label, value, total, color, bg }) => (
                <Box key={label} sx={{ mb: 1.2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="body2" fontSize="0.8rem">{label}</Typography>
                    <Typography variant="body2" fontWeight={600} fontSize="0.8rem" sx={{ color }}>{value}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={total ? (value / total) * 100 : 0}
                    sx={{ height: 6, borderRadius: 3, bgcolor: bg, '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                🎟 Tickets d'assistance
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Grid container spacing={1}>
                {[
                  { label: 'Ouverts', value: stats?.tickets.open, icon: <TicketIcon />, color: '#e65100' },
                  { label: 'Urgents', value: stats?.tickets.urgent, icon: <WarningIcon />, color: '#b71c1c' },
                  { label: 'Résolus cette semaine', value: stats?.tickets.resolved_week, icon: <OkIcon />, color: '#2e7d32' },
                ].map(({ label, value, icon, color }) => (
                  <Grid item xs={12} key={label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, bgcolor: '#f9f9f9' }}>
                      <Box sx={{ color, '& svg': { fontSize: 18 } }}>{icon}</Box>
                      <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>{label}</Typography>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color }}>{value ?? 0}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
