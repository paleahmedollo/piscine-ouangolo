import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Pool as PoolIcon,
  Restaurant as RestaurantIcon,
  Hotel as HotelIcon,
  Event as EventIcon,
  TrendingUp,
  AttachMoney,
  People,
  AccountBalance,
  LocalCarWash as LavageIcon,
  SportsBar as MaquisIcon,
  Store as SuperetteIcon,
  LocalLaundryService as PressingIcon,
  Warehouse as DepotIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import { Dashboard as DashboardType } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            backgroundColor: `${color}15`,
            color: color
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

interface ModuleCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  stats: { label: string; value: string | number }[];
  footer?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, icon, color, stats, footer }) => (
  <Card sx={{ height: '100%', minHeight: 200 }}>
    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1.5, '&:last-child': { pb: 1.5 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            backgroundColor: `${color}15`,
            color: color,
            mr: 1.5
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" fontWeight="bold">{title}</Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={1} sx={{ flex: 1 }}>
        {stats.map((stat, index) => (
          <Grid item xs={6} key={index}>
            <Box sx={{
              p: 1,
              backgroundColor: '#f5f5f5',
              borderRadius: 2,
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography variant="body1" fontWeight="bold" color={color}>
                {stat.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      {footer && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary" textAlign="center">
            {footer}
          </Typography>
        </>
      )}
    </CardContent>
  </Card>
);

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const Dashboard: React.FC = () => {
  const { user, canAccessModule } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardApi.getDashboard();
        setDashboard(response.data.data);
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Erreur inconnue';
        setError(`Erreur ${status || 'réseau'}: ${msg}`);
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <Layout title="Tableau de bord">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Tableau de bord">
        <Alert severity="error">{error}</Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Tableau de bord">
      {/* Welcome Header */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Bienvenue, {user?.full_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Typography>
      </Box>

      {/* Global Stats (Directeur/Maire) */}
      {dashboard?.global && (
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="CA Aujourd'hui"
              value={formatCurrency(dashboard.global.ca_aujourd_hui)}
              icon={<AttachMoney />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="CA du Mois"
              value={formatCurrency(dashboard.global.ca_mois)}
              icon={<TrendingUp />}
              color="#2196f3"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Clotures en attente"
              value={dashboard.global.clotures_en_attente}
              icon={<AccountBalance />}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Utilisateurs actifs"
              value={dashboard.global.utilisateurs_actifs}
              icon={<People />}
              color="#9c27b0"
            />
          </Grid>
        </Grid>
      )}

      {/* Section Title */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
        Statistiques par Module
      </Typography>

      {/* Module Stats - Uniform Cards */}
      <Grid container spacing={1.5}>
        {/* Piscine */}
        {canAccessModule('piscine') && dashboard?.modules.piscine && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Piscine"
              icon={<PoolIcon />}
              color="#2196f3"
              stats={[
                { label: 'Ventes du jour', value: dashboard.modules.piscine.aujourd_hui?.ventes || 0 },
                { label: 'Montant', value: formatCurrency(dashboard.modules.piscine.aujourd_hui?.montant || 0) },
                { label: 'Tickets adulte', value: dashboard.modules.piscine.aujourd_hui?.tickets_adulte || 0 },
                { label: 'Tickets enfant', value: dashboard.modules.piscine.aujourd_hui?.tickets_enfant || 0 }
              ]}
              footer={`Abonnements actifs: ${dashboard.modules.piscine.abonnements_actifs || 0}`}
            />
          </Grid>
        )}

        {/* Restaurant */}
        {canAccessModule('restaurant') && dashboard?.modules.restaurant && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Restaurant"
              icon={<RestaurantIcon />}
              color="#ff9800"
              stats={[
                { label: 'Ventes du jour', value: dashboard.modules.restaurant.aujourd_hui?.ventes || 0 },
                { label: 'Montant', value: formatCurrency(dashboard.modules.restaurant.aujourd_hui?.montant || 0) },
                { label: 'Ventes du mois', value: dashboard.modules.restaurant.mois?.ventes || 0 },
                { label: 'CA du mois', value: formatCurrency(dashboard.modules.restaurant.mois?.montant || 0) }
              ]}
            />
          </Grid>
        )}

        {/* Hotel */}
        {canAccessModule('hotel') && dashboard?.modules.hotel && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Hotel"
              icon={<HotelIcon />}
              color="#4caf50"
              stats={[
                { label: 'Taux occupation', value: `${dashboard.modules.hotel.taux_occupation || 0}%` },
                { label: 'Disponibles', value: dashboard.modules.hotel.chambres?.disponibles || 0 },
                { label: 'Check-ins', value: dashboard.modules.hotel.aujourd_hui?.check_ins || 0 },
                { label: 'Check-outs', value: dashboard.modules.hotel.aujourd_hui?.check_outs || 0 }
              ]}
              footer={`Total chambres: ${dashboard.modules.hotel.chambres?.total || 7}`}
            />
          </Grid>
        )}

        {/* Evenements */}
        {canAccessModule('events') && dashboard?.modules.events && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Evenements"
              icon={<EventIcon />}
              color="#9c27b0"
              stats={[
                { label: 'A venir', value: dashboard.modules.events.evenements_a_venir || 0 },
                { label: 'Ce mois', value: dashboard.modules.events.evenements_ce_mois || 0 },
                { label: 'Devis en attente', value: dashboard.modules.events.devis_en_attente || 0 },
                { label: 'Confirmes', value: dashboard.modules.events.evenements_confirmes || 0 }
              ]}
            />
          </Grid>
        )}

        {/* Lavage Auto */}
        {canAccessModule('lavage') && (dashboard?.modules as any)?.lavage && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Lavage Auto"
              icon={<LavageIcon />}
              color="#00bcd4"
              stats={[
                { label: 'Lavages du jour', value: (dashboard!.modules as any).lavage.aujourd_hui?.total_lavages || 0 },
                { label: 'Recette du jour', value: formatCurrency((dashboard!.modules as any).lavage.aujourd_hui?.montant || 0) },
                { label: 'Lavages du mois', value: (dashboard!.modules as any).lavage.mois?.total_lavages || 0 },
                { label: 'CA du mois', value: formatCurrency((dashboard!.modules as any).lavage.mois?.montant || 0) }
              ]}
            />
          </Grid>
        )}

        {/* Pressing */}
        {canAccessModule('pressing') && (dashboard?.modules as any)?.pressing && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Pressing"
              icon={<PressingIcon />}
              color="#795548"
              stats={[
                { label: 'Commandes jour', value: (dashboard!.modules as any).pressing.aujourd_hui?.total_commandes || 0 },
                { label: 'Recette du jour', value: formatCurrency((dashboard!.modules as any).pressing.aujourd_hui?.montant || 0) },
                { label: 'Commandes mois', value: (dashboard!.modules as any).pressing.mois?.total_commandes || 0 },
                { label: 'CA du mois', value: formatCurrency((dashboard!.modules as any).pressing.mois?.montant || 0) }
              ]}
            />
          </Grid>
        )}

        {/* Maquis / Bar */}
        {canAccessModule('maquis') && (dashboard?.modules as any)?.maquis && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Maquis / Bar"
              icon={<MaquisIcon />}
              color="#e91e63"
              stats={[
                { label: 'Ventes du jour', value: (dashboard!.modules as any).maquis.aujourd_hui?.total_ventes || 0 },
                { label: 'Recette du jour', value: formatCurrency((dashboard!.modules as any).maquis.aujourd_hui?.montant || 0) },
                { label: 'Ventes du mois', value: (dashboard!.modules as any).maquis.mois?.total_ventes || 0 },
                { label: 'CA du mois', value: formatCurrency((dashboard!.modules as any).maquis.mois?.montant || 0) }
              ]}
            />
          </Grid>
        )}

        {/* Supérette */}
        {canAccessModule('superette') && (dashboard?.modules as any)?.superette && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Supérette"
              icon={<SuperetteIcon />}
              color="#607d8b"
              stats={[
                { label: 'Ventes du jour', value: (dashboard!.modules as any).superette.aujourd_hui?.total_ventes || 0 },
                { label: 'Recette du jour', value: formatCurrency((dashboard!.modules as any).superette.aujourd_hui?.montant || 0) },
                { label: 'Ventes du mois', value: (dashboard!.modules as any).superette.mois?.total_ventes || 0 },
                { label: 'CA du mois', value: formatCurrency((dashboard!.modules as any).superette.mois?.montant || 0) }
              ]}
            />
          </Grid>
        )}

        {/* Dépôt */}
        {canAccessModule('depot') && (dashboard?.modules as any)?.depot && (
          <Grid item xs={12} sm={6} lg={3}>
            <ModuleCard
              title="Dépôt Boissons"
              icon={<DepotIcon />}
              color="#ff5722"
              stats={[
                { label: 'Ventes du jour', value: (dashboard!.modules as any).depot.aujourd_hui?.total_ventes || 0 },
                { label: 'Recette du jour', value: formatCurrency((dashboard!.modules as any).depot.aujourd_hui?.total_cash || 0) },
                { label: 'Crédit du jour', value: formatCurrency((dashboard!.modules as any).depot.aujourd_hui?.total_credit || 0) },
                { label: 'Crédits en cours', value: formatCurrency((dashboard!.modules as any).depot.total_credit_en_cours?.total_en_cours || 0) }
              ]}
            />
          </Grid>
        )}
      </Grid>
    </Layout>
  );
};

export default Dashboard;
