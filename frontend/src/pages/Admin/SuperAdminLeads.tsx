import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Tabs, Tab, Select, MenuItem, TextField,
  IconButton, Tooltip, Card, CardContent, Grid, Badge
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  PersonAdd as LeadIcon,
  CheckCircle as DoneIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Visibility as VisitIcon,
} from '@mui/icons-material';
import api from '../../services/api';

/* ── Types ─────────────────────────────────────────────── */
interface TrialRequest {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  business_name: string;
  city?: string;
  modules?: string;
  message?: string;
  status: 'new' | 'contacted' | 'converted' | 'rejected';
  notes?: string;
  createdAt: string;
}
interface Visitor {
  id: number;
  ip?: string;
  country?: string;
  city?: string;
  lang: string;
  referrer?: string;
  visited_at: string;
}

/* ── Labels statuts ────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  new: '🆕 Nouveau', contacted: '📞 Contacté', converted: '✅ Converti', rejected: '❌ Rejeté',
};

/* ── Composant principal ────────────────────────────────── */
export default function SuperAdminLeads() {
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, vRes] = await Promise.all([
        api.get('/landing/requests'),
        api.get('/landing/visitors'),
      ]);
      setRequests(rRes.data.data || []);
      setVisitors(vRes.data.data || []);
      setTotalVisitors(vRes.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateStatus = async (id: number, status: string, notes?: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/landing/requests/${id}`, { status, notes });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as TrialRequest['status'], notes } : r));
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Stats ──────────────────────────────────────────── */
  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    converted: requests.filter(r => r.status === 'converted').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Landing Page — Suivi</Typography>
          <Typography variant="body2" color="text.secondary">Visiteurs et demandes d'essai gratuit</Typography>
        </Box>
        <Tooltip title="Actualiser">
          <IconButton onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Cartes stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg,#1565c0,#0d47a1)', color: '#fff' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <VisitIcon sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight={800}>{totalVisitors}</Typography>
              <Typography variant="caption">Visiteurs total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg,#e53935,#b71c1c)', color: '#fff' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <LeadIcon sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight={800}>{stats.total}</Typography>
              <Typography variant="caption">Demandes reçues</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg,#f57c00,#e65100)', color: '#fff' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <PhoneIcon sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight={800}>{stats.new}</Typography>
              <Typography variant="caption">À contacter</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg,#2e7d32,#1b5e20)', color: '#fff' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <DoneIcon sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight={800}>{stats.converted}</Typography>
              <Typography variant="caption">Convertis</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label={
            <Badge badgeContent={stats.new} color="error" max={99}>
              <Box sx={{ pr: 1 }}>Demandes d'essai</Box>
            </Badge>
          } />
          <Tab label={`Visiteurs (${totalVisitors})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* ── Tab 0 : Demandes ─────────────────────────── */}
            {tab === 0 && (
              <Box sx={{ overflowX: 'auto' }}>
                {requests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <LeadIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                    <Typography>Aucune demande pour l'instant</Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: '#f8fafc' }}>
                        <TableCell><strong>#</strong></TableCell>
                        <TableCell><strong>Nom</strong></TableCell>
                        <TableCell><strong>Téléphone</strong></TableCell>
                        <TableCell><strong>Complexe</strong></TableCell>
                        <TableCell><strong>Ville</strong></TableCell>
                        <TableCell><strong>Modules</strong></TableCell>
                        <TableCell><strong>Statut</strong></TableCell>
                        <TableCell><strong>Notes</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requests.map(r => (
                        <TableRow key={r.id} hover sx={{ '&:hover': { background: '#f0f7ff' } }}>
                          <TableCell>{r.id}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{r.full_name}</Typography>
                              {r.email && <Typography variant="caption" color="text.secondary">{r.email}</Typography>}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              component="a"
                              href={`https://wa.me/${r.phone.replace(/\D/g,'')}`}
                              target="_blank"
                              sx={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}
                            >
                              📱 {r.phone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon sx={{ fontSize: 14, color: '#1565c0' }} />
                              <Typography variant="body2">{r.business_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{r.city || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {r.modules
                                ? JSON.parse(r.modules).map((m: string) => (
                                    <Chip key={m} label={m} size="small" sx={{ fontSize: 10, height: 18 }} />
                                  ))
                                : <Typography variant="caption" color="text.secondary">—</Typography>
                              }
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={r.status}
                              disabled={updatingId === r.id}
                              onChange={e => updateStatus(r.id, e.target.value, r.notes)}
                              sx={{ fontSize: 12, minWidth: 120 }}
                            >
                              {Object.entries(STATUS_LABEL).map(([val, lbl]) => (
                                <MenuItem key={val} value={val}>{lbl}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              placeholder="Notes..."
                              defaultValue={r.notes || ''}
                              onBlur={e => {
                                if (e.target.value !== (r.notes || '')) {
                                  updateStatus(r.id, r.status, e.target.value);
                                }
                              }}
                              sx={{ width: 140, fontSize: 12 }}
                              inputProps={{ style: { fontSize: 12 } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            )}

            {/* ── Tab 1 : Visiteurs ────────────────────────── */}
            {tab === 1 && (
              <Box sx={{ overflowX: 'auto' }}>
                {visitors.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <PeopleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                    <Typography>Aucune visite enregistrée</Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: '#f8fafc' }}>
                        <TableCell><strong>#</strong></TableCell>
                        <TableCell><strong>Date & Heure</strong></TableCell>
                        <TableCell><strong>Pays</strong></TableCell>
                        <TableCell><strong>Ville</strong></TableCell>
                        <TableCell><strong>Langue</strong></TableCell>
                        <TableCell><strong>Source (Référent)</strong></TableCell>
                        <TableCell><strong>IP</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visitors.map((v, i) => (
                        <TableRow key={v.id} hover>
                          <TableCell>{visitors.length - i}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(v.visited_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </TableCell>
                          <TableCell>{v.country || '—'}</TableCell>
                          <TableCell>{v.city || '—'}</TableCell>
                          <TableCell>
                            <Chip label={v.lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'} size="small" sx={{ fontSize: 11 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.referrer || 'Direct'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{v.ip || '—'}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
