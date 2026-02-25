import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Grid, Tooltip, TextField, Tab, Tabs
} from '@mui/material';
import {
  Article as LogsIcon, Refresh as RefreshIcon,
  CheckCircle as SuccessIcon, Error as FailIcon, Warning as WarnIcon
} from '@mui/icons-material';
import { superadminApi } from '../../services/api';

interface SystemLog {
  id: number;
  user_id: number | null;
  company_id: number | null;
  action: string;
  module: string | null;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  status: string;
  created_at: string;
  user?: { id: number; username: string; full_name: string };
  company?: { id: number; name: string; code: string };
}
interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  created_at: string;
  user?: { id: number; username: string; full_name: string; role: string };
}

const statusIcon = (s: string) => s === 'success' ? <SuccessIcon sx={{ color: 'success.main', fontSize: 16 }} /> : s === 'failure' ? <FailIcon sx={{ color: 'error.main', fontSize: 16 }} /> : <WarnIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

const AdminLogs: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { limit: '200' };
      if (filterModule) params.module = filterModule;
      if (filterDateFrom) params.from = filterDateFrom;
      if (filterDateTo) params.to = filterDateTo;

      if (tab === 0) {
        const res = await superadminApi.getSystemLogs(params);
        setSystemLogs(res.data.data || []);
      } else {
        const res = await superadminApi.getAuditLogs(params);
        setAuditLogs(res.data.data || []);
      }
    } catch { setError('Erreur lors du chargement des journaux'); }
    finally { setLoading(false); }
  }, [tab, filterModule, filterDateFrom, filterDateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const MODULES = ['auth', 'companies', 'users', 'tickets', 'subscriptions', 'billing', 'settings', 'piscine', 'restaurant', 'hotel', 'events', 'caisse'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LogsIcon sx={{ fontSize: 28, color: '#263238' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Système de journaux</Typography>
            <Typography variant="body2" color="text.secondary">Journaux systèmes et audit des actions</Typography>
          </Box>
        </Box>
        <Tooltip title="Actualiser"><IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Tab label="Journaux superadmin" />
        <Tab label="Audit entreprises" />
      </Tabs>

      {/* Filtres */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Module</InputLabel>
            <Select value={filterModule} label="Module" onChange={e => setFilterModule(e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {MODULES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField fullWidth size="small" label="Du" type="date" InputLabelProps={{ shrink: true }}
            value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField fullWidth size="small" label="Au" type="date" InputLabelProps={{ shrink: true }}
            value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        </Grid>
      </Grid>

      {/* Onglet 1 : System Logs */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small" sx={{ fontFamily: 'monospace' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell width={24}></TableCell>
                <TableCell><strong>Date/Heure</strong></TableCell>
                <TableCell><strong>Utilisateur</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Module</strong></TableCell>
                <TableCell><strong>Entreprise</strong></TableCell>
                <TableCell><strong>IP</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : systemLogs.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Aucun journal</Typography>
                </TableCell></TableRow>
              ) : systemLogs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell>{statusIcon(log.status)}</TableCell>
                  <TableCell><Typography variant="caption" fontFamily="monospace">{fmtDate(log.created_at)}</Typography></TableCell>
                  <TableCell>
                    {log.user ? (
                      <Box>
                        <Typography variant="caption" fontWeight={600}>{log.user.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>@{log.user.username}</Typography>
                      </Box>
                    ) : <Typography variant="caption" color="text.secondary">Système</Typography>}
                  </TableCell>
                  <TableCell><Chip label={log.action} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} /></TableCell>
                  <TableCell>{log.module ? <Chip label={log.module} size="small" color="primary" variant="outlined" /> : '—'}</TableCell>
                  <TableCell>
                    {log.company ? (
                      <Chip label={log.company.name} size="small" />
                    ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="caption" fontFamily="monospace">{log.ip_address || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Onglet 2 : Audit Logs */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Date/Heure</strong></TableCell>
                <TableCell><strong>Utilisateur</strong></TableCell>
                <TableCell><strong>Rôle</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Module</strong></TableCell>
                <TableCell><strong>IP</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Aucun journal d'audit</Typography>
                </TableCell></TableRow>
              ) : auditLogs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell><Typography variant="caption" fontFamily="monospace">{fmtDate(log.created_at)}</Typography></TableCell>
                  <TableCell>
                    {log.user ? (
                      <Box>
                        <Typography variant="caption" fontWeight={600}>{log.user.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>@{log.user.username}</Typography>
                      </Box>
                    ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell>{log.user?.role ? <Chip label={log.user.role} size="small" /> : '—'}</TableCell>
                  <TableCell><Chip label={log.action} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} /></TableCell>
                  <TableCell>{log.module ? <Chip label={log.module} size="small" color="secondary" variant="outlined" /> : '—'}</TableCell>
                  <TableCell><Typography variant="caption" fontFamily="monospace">{log.ip_address || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AdminLogs;
