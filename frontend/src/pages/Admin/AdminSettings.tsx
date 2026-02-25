import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Alert, CircularProgress,
  Divider, Chip, Table, TableBody, TableCell, TableRow, IconButton, Tooltip
} from '@mui/material';
import { Settings as SettingsIcon, Refresh as RefreshIcon, CheckCircle as OkIcon } from '@mui/icons-material';
import { superadminApi } from '../../services/api';

interface PlanConfig { id: string; name: string; price: number; currency: string; features: string[]; }
interface Settings {
  platform: { name: string; version: string; environment: string; api_url: string };
  subscriptions: { plans: PlanConfig[] };
  activity_types: string[];
  countries: string[];
}

const planColor = (p: string): 'default' | 'primary' | 'success' => p === 'premium' ? 'success' : p === 'pro' ? 'primary' : 'default';
const fmtCFA = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} F`;

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true); setError('');
    try {
      const res = await superadminApi.getSettings();
      setSettings(res.data.data);
    } catch { setError('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSettings(); }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ fontSize: 28, color: '#37474f' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Paramètres</Typography>
            <Typography variant="body2" color="text.secondary">Configuration de la plateforme Gestix</Typography>
          </Box>
        </Box>
        <Tooltip title="Actualiser"><IconButton onClick={loadSettings}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Informations plateforme */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>🖥 Plateforme</Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  {settings && Object.entries(settings.platform).map(([key, val]) => (
                    <TableRow key={key}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '40%' }}>{key}</TableCell>
                      <TableCell>
                        <Chip label={String(val)}
                          color={key === 'environment' ? (val === 'production' ? 'success' : 'warning') : 'default'}
                          size="small" variant={key === 'environment' ? 'filled' : 'outlined'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Plans d'abonnements */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>📦 Plans d'abonnements</Typography>
              <Divider sx={{ mb: 2 }} />
              {settings?.subscriptions.plans.map(plan => (
                <Box key={plan.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, borderTop: `3px solid ${plan.id === 'premium' ? '#2e7d32' : plan.id === 'pro' ? '#1565c0' : '#9e9e9e'}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={plan.name} color={planColor(plan.id)} size="small" />
                    </Box>
                    <Typography fontWeight={700} color={plan.id === 'premium' ? 'success.main' : plan.id === 'pro' ? 'primary.main' : 'text.secondary'}>
                      {fmtCFA(plan.price)}/mois
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {plan.features.map(f => (
                      <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <OkIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography variant="caption">{f}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Types d'activités */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>🏢 Types d'activités</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {settings?.activity_types.map(t => (
                  <Chip key={t} label={t} variant="outlined" size="small" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pays supportés */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>🌍 Pays supportés</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {settings?.countries.map(c => (
                  <Chip key={c} label={c} variant="outlined" size="small" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminSettings;
