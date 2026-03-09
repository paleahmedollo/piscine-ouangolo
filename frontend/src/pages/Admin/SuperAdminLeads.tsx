import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Tabs, Tab, Select, MenuItem, TextField,
  IconButton, Tooltip, Card, CardContent, Grid, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  PersonAdd as LeadIcon,
  CheckCircle as DoneIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Visibility as VisitIcon,
  DeleteOutline as DeleteIcon,
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

const STATUS_LABEL: Record<string, string> = {
  new: '🆕 Nouveau', contacted: '📞 Contacté', converted: '✅ Converti', rejected: '❌ Rejeté',
};

export default function SuperAdminLeads() {
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrialRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/landing/requests/${deleteTarget.id}`);
      setRequests(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    converted: requests.filter(r => r.status === 'converted').length,
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Landing Page — Suivi</Typography>
          <Typography variant="body2" color="text.secondary">Visiteurs et demandes d'essai gratuit</Typography>
        </Box>
        <Tooltip title="Actualiser">
          <IconButton onClick={loadData} disabled={loading} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Cartes stats */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { icon: <VisitIcon sx={{ fontSize: 26 }} />, val: totalVisitors, label: 'Visiteurs', bg: 'linear-gradient(135deg,#1565c0,#0d47a1)' },
          { icon: <LeadIcon sx={{ fontSize: 26 }} />, val: stats.total, label: 'Demandes', bg: 'linear-gradient(135deg,#e53935,#b71c1c)' },
          { icon: <PhoneIcon sx={{ fontSize: 26 }} />, val: stats.new, label: 'À contacter', bg: 'linear-gradient(135deg,#f57c00,#e65100)' },
          { icon: <DoneIcon sx={{ fontSize: 26 }} />, val: stats.converted, label: 'Convertis', bg: 'linear-gradient(135deg,#2e7d32,#1b5e20)' },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2.5, background: s.bg, color: '#fff' }}>
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                {s.icon}
                <Typography variant="h5" fontWeight={800}>{s.val}</Typography>
                <Typography variant="caption" sx={{ fontSize: 11 }}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 1.5, minHeight: 42 }}>
          <Tab sx={{ minHeight: 42, fontSize: 13 }} label={
            <Badge badgeContent={stats.new} color="error" max={99}>
              <Box sx={{ pr: 1 }}>Demandes d'essai</Box>
            </Badge>
          } />
          <Tab sx={{ minHeight: 42, fontSize: 13 }} label={`Visiteurs (${totalVisitors})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            {/* ── Tab 0 : Demandes ─────────────────────────── */}
            {tab === 0 && (
              <Box sx={{ overflowX: 'auto' }}>
                {requests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <LeadIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                    <Typography variant="body2">Aucune demande pour l'instant</Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: '#f8fafc' }}>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>#</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Nom</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Téléphone</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Complexe</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Ville</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Modules</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Statut</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Notes</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Date</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Action</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requests.map(r => (
                        <TableRow key={r.id} hover sx={{ '&:hover': { background: '#f0f7ff' } }}>
                          <TableCell sx={{ fontSize: 11 }}>{r.id}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            <Typography variant="caption" fontWeight={600} display="block">{r.full_name}</Typography>
                            {r.email && <Typography variant="caption" color="text.secondary">{r.email}</Typography>}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            <Typography
                              variant="caption"
                              component="a"
                              href={`https://wa.me/${r.phone.replace(/\D/g,'')}`}
                              target="_blank"
                              sx={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}
                            >
                              📱 {r.phone}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon sx={{ fontSize: 12, color: '#1565c0' }} />
                              <Typography variant="caption">{r.business_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{r.city || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {r.modules
                                ? JSON.parse(r.modules).map((m: string) => (
                                    <Chip key={m} label={m} size="small" sx={{ fontSize: 9, height: 16 }} />
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
                              sx={{ fontSize: 11, minWidth: 110, height: 28 }}
                            >
                              {Object.entries(STATUS_LABEL).map(([val, lbl]) => (
                                <MenuItem key={val} value={val} sx={{ fontSize: 12 }}>{lbl}</MenuItem>
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
                              sx={{ width: 120 }}
                              inputProps={{ style: { fontSize: 11, padding: '4px 6px' } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Supprimer cette demande">
                              <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: '#e53935' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
                  <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <PeopleIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                    <Typography variant="body2">Aucune visite enregistrée</Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: '#f8fafc' }}>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>#</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Date & Heure</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Pays</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Ville</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Langue</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>Source (Référent)</strong></TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12 }}><strong>IP</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visitors.map((v, i) => (
                        <TableRow key={v.id} hover>
                          <TableCell sx={{ fontSize: 11 }}>{visitors.length - i}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(v.visited_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant="caption">{v.country || '—'}</Typography></TableCell>
                          <TableCell><Typography variant="caption">{v.city || '—'}</Typography></TableCell>
                          <TableCell>
                            <Chip label={v.lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'} size="small" sx={{ fontSize: 10, height: 20 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 180, overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* ── Dialog confirmation suppression ──────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Supprimer la demande ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Vous allez supprimer la demande de <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.business_name}).
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} size="small">Annuler</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            size="small"
            disabled={deleting}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
