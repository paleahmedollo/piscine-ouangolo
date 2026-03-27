import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  PointOfSale,
  Check as ValidateIcon,
  Close as RejectIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  caisseApi, receiptsApi, restaurantApi,
  lavageApi, pressingApi, maquisApi, superetteApi, depotApi
} from '../services/api';
import ReceiptPrint from '../components/ReceiptPrint';
import { printThermalReceipt } from '../components/caisse/ThermalReceipt';
import type { ThermalReceiptItem } from '../components/caisse/ThermalReceipt';
import { CashRegister, CashRegisterModule } from '../types';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

// Types pour les commandes restaurant V2 (réutilisé dans mapping)
interface OrderItemV2 { id: number; nom_plat: string; quantite: number; prix_unitaire: number; }
interface OrderV2 {
  id: number;
  statut: 'nouvelle' | 'en_preparation' | 'prete' | 'payee' | 'annulee';
  order_type?: 'table' | 'livraison';
  total: number; notes?: string; created_at: string;
  items?: OrderItemV2[];
  table?: { id: number; numero: number };
}

// Type ticket unifié pour l'encaissement
interface PendingTicket {
  id: number;
  module: string;
  title: string;
  items: ThermalReceiptItem[];
  total: number;
  createdAt: string;
}

const moduleLabels: Record<CashRegisterModule, string> = {
  piscine: 'Piscine',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  events: 'Evenements',
  lavage: 'Lavage',
  pressing: 'Pressing',
  maquis: 'Maquis / Bar',
  superette: 'Supérette',
  depot: 'Dépôt'
};

const statusColors: Record<string, 'warning' | 'success' | 'error'> = {
  en_attente: 'warning',
  validee: 'success',
  rejetee: 'error'
};

const statusLabels: Record<string, string> = {
  en_attente: 'En attente',
  validee: 'Validee',
  rejetee: 'Rejetee'
};

// Modules qui ont un système de tickets en attente
const TICKETED_MODULES: string[] = ['restaurant', 'lavage', 'pressing', 'maquis', 'depot'];

const Caisse: React.FC = () => {
  const { hasPermission, user, canAccessModule } = useAuth();

  // ── Onglets principaux ───────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState(0); // 0=Encaissement, 1=Clôturer

  // ── État Encaissement ────────────────────────────────────────────────────
  const [selectedModule, setSelectedModule] = useState<CashRegisterModule | null>(null);
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});

  // Dialog encaissement
  const [encaissPayDialog, setEncaissPayDialog] = useState(false);
  const [encaissTicket, setEncaissTicket] = useState<PendingTicket | null>(null);
  const [encaissPayMethod, setEncaissPayMethod] = useState<string>('especes');
  const [encaissPayLoading, setEncaissPayLoading] = useState(false);

  // ── État Clôturer ────────────────────────────────────────────────────────
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [pendingRegisters, setPendingRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeForm, setCloseForm] = useState({
    module: '' as CashRegisterModule | '',
    actual_amount: 0,
    notes: '',
    employee_id: null as number | null
  });
  const [expectedAmount, setExpectedAmount] = useState<{ amount: number; count: number } | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const [moduleEmployees, setModuleEmployees] = useState<Array<{ id: number; full_name: string; role: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [confirmDifferenceDialog, setConfirmDifferenceDialog] = useState(false);
  const [differenceInfo, setDifferenceInfo] = useState<{
    expected: number; actual: number; difference: number; module: string;
  } | null>(null);

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  // ── Accès modules ────────────────────────────────────────────────────────
  const moduleAccess: Record<string, CashRegisterModule[]> = {
    maitre_nageur: ['piscine'],
    serveuse: ['restaurant'],
    serveur: ['restaurant'],
    receptionniste: ['hotel'],
    gestionnaire_events: ['events'],
    caissier_lavage: ['lavage'],
    caissier_pressing: ['pressing'],
    caissier_maquis: ['maquis'],
    caissier_superette: ['superette'],
    caissier_depot: ['depot'],
    gerant: ['piscine', 'restaurant', 'hotel', 'events', 'lavage', 'pressing', 'maquis', 'superette', 'depot'],
    admin: ['piscine', 'restaurant', 'hotel', 'events', 'lavage', 'pressing', 'maquis', 'superette', 'depot'],
    directeur: ['piscine', 'restaurant', 'hotel', 'events', 'lavage', 'pressing', 'maquis', 'superette', 'depot'],
    caissier: ['restaurant']
  };

  const isGerant = user?.role === 'gerant' || user?.role === 'admin' || user?.role === 'directeur';
  const allManagerModules: CashRegisterModule[] = ['piscine', 'restaurant', 'hotel', 'events', 'lavage', 'pressing', 'maquis', 'superette', 'depot'];
  const userModules: CashRegisterModule[] = isGerant
    ? allManagerModules.filter(m => canAccessModule(m))
    : (user ? moduleAccess[user.role] || [] : []);

  // ── Données initiales ────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [registersRes] = await Promise.all([caisseApi.getCashRegisters()]);
      setCashRegisters(registersRes.data.data.cashRegisters);
      if (hasPermission('caisse', 'validation')) {
        const pendingRes = await caisseApi.getPendingCashRegisters();
        setPendingRegisters(pendingRes.data.data);
      }
    } catch {
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── Comptage tickets par module ──────────────────────────────────────────
  const fetchModuleCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    const promises: Promise<void>[] = [];

    if (canAccessModule('restaurant')) {
      promises.push(
        restaurantApi.getActiveOrders().catch(() => null).then((res) => {
          const orders: OrderV2[] = res?.data?.data?.orders || res?.data?.data || [];
          counts['restaurant'] = orders.filter((o) => o.statut === 'prete').length;
        })
      );
    }
    if (canAccessModule('lavage')) {
      promises.push(
        lavageApi.getOpenWashes().catch(() => null).then((res) => {
          counts['lavage'] = (res?.data?.data || []).length;
        })
      );
    }
    if (canAccessModule('pressing')) {
      promises.push(
        pressingApi.getOpenOrders().catch(() => null).then((res) => {
          counts['pressing'] = (res?.data?.data || []).length;
        })
      );
    }
    if (canAccessModule('maquis')) {
      promises.push(
        maquisApi.getOpenTickets().catch(() => null).then((res) => {
          counts['maquis'] = (res?.data?.data || []).length;
        })
      );
    }
    if (canAccessModule('superette')) {
      promises.push(
        superetteApi.getOpenTickets().catch(() => null).then((res) => {
          counts['superette'] = (res?.data?.data || []).length;
        })
      );
    }
    if (canAccessModule('depot')) {
      promises.push(
        depotApi.getPendingSales().catch(() => null).then((res) => {
          counts['depot'] = (res?.data?.data || []).length;
        })
      );
    }

    await Promise.all(promises);
    setModuleCounts({ ...counts });
  }, [canAccessModule]);

  // ── Tickets d'un module spécifique ───────────────────────────────────────
  const fetchModuleTickets = useCallback(async (mod: CashRegisterModule) => {
    setLoadingTickets(true);
    setPendingTickets([]);
    try {
      let tickets: PendingTicket[] = [];

      if (mod === 'restaurant') {
        const res = await restaurantApi.getActiveOrders().catch(() => null);
        const orders: OrderV2[] = res?.data?.data?.orders || res?.data?.data || [];
        tickets = orders
          .filter((o) => o.statut === 'prete')
          .map((o) => ({
            id: o.id,
            module: 'restaurant',
            title: o.table ? `Table ${o.table.numero}` : o.order_type === 'livraison' ? '🛵 À livrer' : `Commande #${o.id}`,
            items: (o.items || []).map((i) => ({
              name: i.nom_plat,
              quantity: i.quantite,
              unit_price: i.prix_unitaire,
              total: i.quantite * i.prix_unitaire
            })),
            total: o.total,
            createdAt: o.created_at
          }));

      } else if (mod === 'lavage') {
        const res = await lavageApi.getOpenWashes().catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const washes: any[] = res?.data?.data || [];
        tickets = washes.map((w) => ({
          id: w.id,
          module: 'lavage',
          title: [w.plate_number, w.vehicleType?.name || w.vehicle_type?.name].filter(Boolean).join(' — ') || `Lavage #${w.id}`,
          items: [{
            name: `Lavage${w.vehicleType?.name ? ` — ${w.vehicleType.name}` : ''}${w.plate_number ? ` (${w.plate_number})` : ''}`,
            quantity: 1,
            unit_price: w.amount,
            total: w.amount
          }],
          total: w.amount,
          createdAt: w.created_at
        }));

      } else if (mod === 'pressing') {
        const res = await pressingApi.getOpenOrders().catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orders: any[] = res?.data?.data || [];
        tickets = orders.map((o) => {
          // Tenter de parser items_json (multi-articles)
          let parsedItems: { name: string; quantity: number; unit_price: number; total: number }[] = [];
          if (o.items_json) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              parsedItems = JSON.parse(o.items_json).map((it: any) => ({
                name: it.name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                total: it.total
              }));
            } catch { /* ignore */ }
          }
          if (parsedItems.length === 0) {
            parsedItems = [{ name: o.pressingType?.name || o.pressing_type?.name || 'Pressing', quantity: o.quantity || 1, unit_price: o.quantity ? o.amount / o.quantity : o.amount, total: o.amount }];
          }
          const firstItem = parsedItems[0]?.name || 'Pressing';
          const titleSuffix = parsedItems.length > 1 ? ` +${parsedItems.length - 1}` : ` — ${firstItem}`;
          return {
            id: o.id,
            module: 'pressing',
            title: `🧺 ${o.customer_name || 'Client'}${titleSuffix}`,
            items: parsedItems,
            total: o.amount,
            createdAt: o.created_at
          };
        });

      } else if (mod === 'maquis') {
        const res = await maquisApi.getOpenTickets().catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tix: any[] = res?.data?.data || [];
        tickets = tix.map((t) => ({
          id: t.id,
          module: 'maquis',
          title: t.client_name || `Ticket #${t.id}`,
          items: (t.items_json || []).map((i: ThermalReceiptItem) => ({
            name: i.name, quantity: i.quantity, unit_price: i.unit_price, total: i.total
          })),
          total: t.total || t.total_amount || 0,
          createdAt: t.created_at
        }));

      } else if (mod === 'superette') {
        const res = await superetteApi.getOpenTickets().catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tix: any[] = res?.data?.data || [];
        tickets = tix.map((t) => ({
          id: t.id,
          module: 'superette',
          title: t.client_name || `Ticket #${t.id}`,
          items: (t.items_json || []).map((i: ThermalReceiptItem) => ({
            name: i.name, quantity: i.quantity, unit_price: i.unit_price, total: i.total
          })),
          total: t.total || t.total_amount || 0,
          createdAt: t.created_at
        }));

      } else if (mod === 'depot') {
        const res = await depotApi.getPendingSales().catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sales: any[] = res?.data?.data || [];
        tickets = sales.map((s) => ({
          id: s.id,
          module: 'depot',
          title: s.client_name || s.client?.full_name || `Vente #${s.id}`,
          items: (s.items_json || []).map((i: ThermalReceiptItem) => ({
            name: i.name, quantity: i.quantity, unit_price: i.unit_price, total: i.total
          })),
          total: s.total_amount || 0,
          createdAt: s.created_at
        }));
      }

      setPendingTickets(tickets);
    } catch (e) {
      console.error('fetchModuleTickets error', e);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const handleSelectModule = (mod: CashRegisterModule) => {
    setSelectedModule(mod);
    fetchModuleTickets(mod);
  };

  // ── Paiement encaissement ────────────────────────────────────────────────
  const handleEncaissePay = async () => {
    if (!encaissTicket) return;
    setEncaissPayLoading(true);
    try {
      const { module, id } = encaissTicket;

      if (module === 'restaurant') {
        await restaurantApi.payOrder(id, encaissPayMethod);
      } else if (module === 'lavage') {
        await lavageApi.payWash(id, { payment_method: encaissPayMethod });
      } else if (module === 'pressing') {
        await pressingApi.payOrder(id, { payment_method: encaissPayMethod });
      } else if (module === 'maquis') {
        await maquisApi.payTicket(id, { payment_method: encaissPayMethod });
      } else if (module === 'superette') {
        await superetteApi.payTicket(id, { payment_method: encaissPayMethod });
      } else if (module === 'depot') {
        await depotApi.payDepotSale(id, { payment_method: encaissPayMethod });
      }

      // Impression reçu thermique
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const company = user?.company as any;
      printThermalReceipt({
        companyName: company?.name || 'Ollentra',
        companyPhone: company?.phone,
        companyAddress: company?.address,
        module,
        moduleLabel: moduleLabels[module as CashRegisterModule] || module.toUpperCase(),
        receiptNumber: '',
        date: '',
        cashierName: user?.full_name || '',
        items: encaissTicket.items,
        total: encaissTicket.total,
        paymentMethod: encaissPayMethod,
        tableNumber: module === 'restaurant' ? encaissTicket.title.replace('Table ', '') : undefined,
        clientName: module !== 'restaurant' ? encaissTicket.title : undefined
      });

      setSnackbar({ open: true, message: `✅ Encaissé — ${encaissTicket.title} (${formatCurrency(encaissTicket.total)})`, severity: 'success' });
      setEncaissPayDialog(false);
      setEncaissTicket(null);

      // Rafraîchir la liste du module et les compteurs
      if (selectedModule) fetchModuleTickets(selectedModule);
      fetchModuleCounts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur lors du paiement', severity: 'error' });
    } finally {
      setEncaissPayLoading(false);
    }
  };

  // ── Clôture caisse ───────────────────────────────────────────────────────
  const handleModuleChange = async (module: CashRegisterModule) => {
    setCloseForm({ ...closeForm, module, employee_id: null });
    setModuleEmployees([]);
    setExpectedAmount(null);
    try {
      if (isGerant) {
        setLoadingEmployees(true);
        const [empRes, amountRes] = await Promise.all([
          caisseApi.getEmployeesByModule(module),
          caisseApi.getExpectedAmount(module)
        ]);
        setModuleEmployees(empRes.data.data);
        setExpectedAmount({ amount: amountRes.data.data.expected_amount, count: amountRes.data.data.transactions_count });
        setLoadingEmployees(false);
      } else {
        const res = await caisseApi.getExpectedAmount(module);
        setExpectedAmount({ amount: res.data.data.expected_amount, count: res.data.data.transactions_count });
      }
    } catch {
      setLoadingEmployees(false);
    }
  };

  const handleCloseCaisse = async () => {
    if (!closeForm.module || closeForm.actual_amount === undefined) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs', severity: 'error' });
      return;
    }
    if (expectedAmount) {
      const difference = closeForm.actual_amount - expectedAmount.amount;
      if (difference !== 0) {
        setDifferenceInfo({ expected: expectedAmount.amount, actual: closeForm.actual_amount, difference, module: closeForm.module });
        setConfirmDifferenceDialog(true);
        return;
      }
    }
    await performClosure();
  };

  const performClosure = async (forceWithDifference = false) => {
    try {
      setCloseLoading(true);
      let notesWithDifference = closeForm.notes;
      if (forceWithDifference && differenceInfo) {
        notesWithDifference = `${closeForm.notes}\n[ECART SIGNALE] Attendu: ${formatCurrency(differenceInfo.expected)}, Reel: ${formatCurrency(differenceInfo.actual)}, Ecart: ${formatCurrency(differenceInfo.difference)}`;
      }
      await caisseApi.closeCashRegister({
        module: closeForm.module,
        actual_amount: closeForm.actual_amount,
        notes: notesWithDifference || undefined,
        employee_id: closeForm.employee_id || undefined
      });
      if (differenceInfo && differenceInfo.difference !== 0) {
        if (differenceInfo.difference > 0) {
          setSnackbar({ open: true, message: `Cloture enregistree avec un SURPLUS de ${formatCurrency(differenceInfo.difference)}.`, severity: 'warning' });
        } else {
          setSnackbar({ open: true, message: `Cloture enregistree avec un MANQUE de ${formatCurrency(Math.abs(differenceInfo.difference))}.`, severity: 'warning' });
        }
      } else {
        setSnackbar({ open: true, message: 'Cloture de caisse reussie ! Les comptes sont bons.', severity: 'success' });
      }
      setCloseDialogOpen(false);
      setConfirmDifferenceDialog(false);
      setCloseForm({ module: '', actual_amount: 0, notes: '', employee_id: null });
      setExpectedAmount(null);
      setDifferenceInfo(null);
      setModuleEmployees([]);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: err.response?.data?.message || 'Erreur lors de la cloture', severity: 'error' });
    } finally {
      setCloseLoading(false);
    }
  };

  const handleConfirmWithDifference = () => { performClosure(true); };

  const handleValidate = async (id: number, status: 'validee' | 'rejetee') => {
    try {
      const response = await caisseApi.validateCashRegister(id, status);
      if (status === 'validee' && response.data.receipt) {
        setSelectedReceiptId(response.data.receipt.id);
        setReceiptDialogOpen(true);
        setSnackbar({ open: true, message: `Cloture validee - Recu ${response.data.receipt.receipt_number} genere`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: status === 'validee' ? 'Cloture validee' : 'Cloture rejetee', severity: 'success' });
      }
      fetchData();
    } catch {
      setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
    }
  };

  const handlePrintReceipt = async (cashRegisterId: number) => {
    try {
      const response = await receiptsApi.getReceiptByCashRegister(cashRegisterId);
      if (response.data.data) {
        setSelectedReceiptId(response.data.data.id);
        setReceiptDialogOpen(true);
      }
    } catch {
      setSnackbar({ open: true, message: 'Recu non disponible', severity: 'error' });
    }
  };

  const getDifferenceColor = (diff: number) => {
    if (diff === 0) return 'success.main';
    if (diff > 0) return 'info.main';
    return 'error.main';
  };

  const getDifferenceBgColor = (diff: number) => {
    if (diff === 0) return '#e8f5e9';
    if (diff > 0) return '#e3f2fd';
    return '#ffebee';
  };

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
    fetchModuleCounts();
    // Rafraîchir les compteurs toutes les 15 secondes
    const interval = setInterval(fetchModuleCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh clotures en attente (directeur)
  useEffect(() => {
    if (!hasPermission('caisse', 'validation')) return;
    const interval = setInterval(async () => {
      try {
        const pendingRes = await caisseApi.getPendingCashRegisters();
        setPendingRegisters(pendingRes.data.data);
      } catch { /* silencieux */ }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rafraîchir les tickets du module sélectionné quand on est sur l'onglet Encaissement
  useEffect(() => {
    if (mainTab !== 0 || !selectedModule) return;
    const interval = setInterval(() => {
      fetchModuleTickets(selectedModule);
    }, 10000);
    return () => clearInterval(interval);
  }, [mainTab, selectedModule, fetchModuleTickets]);

  if (loading) {
    return (
      <Layout title="Caisse">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const totalPendingAll = Object.values(moduleCounts).reduce((a, b) => a + b, 0);

  return (
    <Layout title="Caisse">

      {/* ── Onglets principaux ─────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}>
          <Tab
            label={
              <Badge badgeContent={totalPendingAll > 0 ? totalPendingAll : undefined} color="error" max={99}>
                <Box sx={{ px: 1 }}>💰 Encaissement</Box>
              </Badge>
            }
          />
          <Tab label="📊 Clôturer ma caisse" />
        </Tabs>
      </Box>

      {/* ══════════════════════════════════════════════════════════════════════
          ONGLET 0 : ENCAISSEMENT
         ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 0 && (
        <Box>
          {userModules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">Aucun module accessible pour l'encaissement.</Typography>
            </Box>
          ) : (
            <>
              {/* Tuiles modules */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {userModules.map((mod) => {
                  const count = moduleCounts[mod] ?? 0;
                  const hasTickets = TICKETED_MODULES.includes(mod);
                  const isSelected = selectedModule === mod;

                  return (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={mod}>
                      <Card
                        onClick={() => hasTickets ? handleSelectModule(mod) : undefined}
                        sx={{
                          cursor: hasTickets ? 'pointer' : 'default',
                          border: isSelected
                            ? '2px solid #1976d2'
                            : count > 0
                              ? '2px solid #ff9800'
                              : '1px solid #e0e0e0',
                          backgroundColor: isSelected
                            ? '#e3f2fd'
                            : count > 0
                              ? '#fff8e1'
                              : 'white',
                          transition: 'all 0.2s',
                          '&:hover': hasTickets ? { boxShadow: 4, transform: 'translateY(-2px)' } : {}
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography sx={{ fontSize: '2rem', lineHeight: 1.2 }}>{getModuleEmoji(mod)}</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, mb: 0.5 }}>
                            {moduleLabels[mod]}
                          </Typography>
                          {hasTickets ? (
                            <Chip
                              label={count === 0 ? 'Aucun' : `${count} ticket${count > 1 ? 's' : ''}`}
                              color={count > 0 ? 'warning' : 'default'}
                              size="small"
                              sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                              Clôture directe
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Panneau tickets du module sélectionné */}
              {!selectedModule ? (
                <Box sx={{ textAlign: 'center', py: 5, backgroundColor: '#fafafa', borderRadius: 2, border: '1px dashed #e0e0e0' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Sélectionnez un module pour voir les tickets en attente
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Les modules Piscine, Hôtel et Événements utilisent la clôture directe sans ticket
                  </Typography>
                </Box>
              ) : (
                <Card>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {getModuleEmoji(selectedModule)} {moduleLabels[selectedModule]} — Tickets en attente
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {pendingTickets.length > 0 && (
                          <Chip label={`${pendingTickets.length} ticket${pendingTickets.length > 1 ? 's' : ''}`} color="warning" size="small" />
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => fetchModuleTickets(selectedModule)}
                          disabled={loadingTickets}
                        >
                          Actualiser
                        </Button>
                      </Box>
                    </Box>

                    {loadingTickets ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : pendingTickets.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4, backgroundColor: '#f1f8e9', borderRadius: 1 }}>
                        <Typography variant="h6" color="success.main">✅ Aucun ticket en attente</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Tous les tickets ont été encaissés
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell><strong>Référence / Client</strong></TableCell>
                              <TableCell><strong>Articles / Services</strong></TableCell>
                              <TableCell><strong>Heure</strong></TableCell>
                              <TableCell align="right"><strong>Total</strong></TableCell>
                              <TableCell align="center"><strong>Action</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pendingTickets.map((ticket) => (
                              <TableRow
                                key={ticket.id}
                                hover
                                sx={{ '&:hover': { backgroundColor: '#e8f5e9' } }}
                              >
                                <TableCell>
                                  <Typography fontWeight="bold">{ticket.title}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {ticket.items.length > 0
                                      ? ticket.items
                                          .map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
                                          .join(', ')
                                      : '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {new Date(ticket.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography fontWeight="bold" color="success.main" variant="subtitle1">
                                    {formatCurrency(ticket.total)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={() => {
                                      setEncaissTicket(ticket);
                                      setEncaissPayMethod('especes');
                                      setEncaissPayDialog(true);
                                    }}
                                    sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                                  >
                                    💰 Encaisser
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ONGLET 1 : CLÔTURER MA CAISSE
         ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 1 && (
        <Box>
          {/* Bouton Clôturer */}
          {hasPermission('caisse', 'cloture_propre') && userModules.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<PointOfSale />}
                onClick={() => setCloseDialogOpen(true)}
              >
                Clôturer ma caisse
              </Button>
            </Box>
          )}

          {/* Validations en attente (directeur) */}
          {hasPermission('caisse', 'validation') && (
            <Card sx={{ mb: 1.5, border: pendingRegisters.length > 0 ? '2px solid #ff9800' : '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" color={pendingRegisters.length > 0 ? 'warning.main' : 'text.secondary'}>
                    {pendingRegisters.length > 0
                      ? `⚠️ ${pendingRegisters.length} cloture(s) en attente de validation`
                      : 'Validations des clotures'}
                  </Typography>
                  {pendingRegisters.length === 0 && (
                    <Typography variant="body2" color="text.secondary">Aucune cloture en attente</Typography>
                  )}
                </Box>
                {pendingRegisters.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#fff3e0' }}>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Module</strong></TableCell>
                          <TableCell><strong>Employe</strong></TableCell>
                          <TableCell align="right"><strong>Attendu</strong></TableCell>
                          <TableCell align="right"><strong>Reel</strong></TableCell>
                          <TableCell align="right"><strong>Ecart</strong></TableCell>
                          <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingRegisters.map((reg) => (
                          <TableRow key={reg.id} sx={{ backgroundColor: getDifferenceBgColor(reg.difference) }}>
                            <TableCell>{new Date(reg.date).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell>
                              <Chip label={moduleLabels[reg.module] || reg.module} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell><strong>{reg.user?.full_name}</strong></TableCell>
                            <TableCell align="right">{formatCurrency(reg.expected_amount)}</TableCell>
                            <TableCell align="right">{formatCurrency(reg.actual_amount)}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold" color={getDifferenceColor(reg.difference)}>
                                {reg.difference >= 0 ? '+' : ''}{formatCurrency(reg.difference)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Valider et imprimer le recu">
                                <IconButton color="success" onClick={() => handleValidate(reg.id, 'validee')}>
                                  <ValidateIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rejeter">
                                <IconButton color="error" onClick={() => handleValidate(reg.id, 'rejetee')}>
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Historique */}
          <Card>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h6" gutterBottom>
                Historique des clotures
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Module</strong></TableCell>
                      <TableCell><strong>Employe</strong></TableCell>
                      <TableCell align="right"><strong>Attendu</strong></TableCell>
                      <TableCell align="right"><strong>Reel</strong></TableCell>
                      <TableCell align="right"><strong>Ecart</strong></TableCell>
                      <TableCell><strong>Statut</strong></TableCell>
                      <TableCell align="center"><strong>Recu</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cashRegisters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Aucune cloture enregistree
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : cashRegisters.map((reg) => (
                      <TableRow key={reg.id} sx={{ backgroundColor: getDifferenceBgColor(reg.difference) }}>
                        <TableCell>{new Date(reg.date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>
                          <Chip label={moduleLabels[reg.module] || reg.module} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{reg.user?.full_name || '—'}</TableCell>
                        <TableCell align="right">{formatCurrency(reg.expected_amount)}</TableCell>
                        <TableCell align="right">{formatCurrency(reg.actual_amount)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold" color={getDifferenceColor(reg.difference)}>
                            {reg.difference >= 0 ? '+' : ''}{formatCurrency(reg.difference)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[reg.status] || reg.status}
                            color={statusColors[reg.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {reg.status === 'validee' && (
                            <Tooltip title="Imprimer le recu">
                              <IconButton size="small" onClick={() => handlePrintReceipt(reg.id)}>
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Dialog Encaissement (paiement ticket) */}
      <Dialog open={encaissPayDialog} onClose={() => setEncaissPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>💰 Encaisser le ticket</DialogTitle>
        <DialogContent>
          {encaissTicket && (
            <Box sx={{ pt: 1 }}>
              {/* Résumé ticket */}
              <Box sx={{ mb: 2, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {getModuleEmoji(encaissTicket.module)} {encaissTicket.title}
                </Typography>
                <Divider sx={{ my: 1 }} />
                {encaissTicket.items.length > 0 ? (
                  encaissTicket.items.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                      <Typography variant="body2">{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</Typography>
                      <Typography variant="body2">{formatCurrency(item.total)}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">Détails non disponibles</Typography>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">TOTAL</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {formatCurrency(encaissTicket.total)}
                  </Typography>
                </Box>
              </Box>

              {/* Mode de paiement */}
              <FormControl fullWidth>
                <InputLabel>Mode de paiement</InputLabel>
                <Select
                  value={encaissPayMethod}
                  label="Mode de paiement"
                  onChange={(e) => setEncaissPayMethod(e.target.value)}
                >
                  <MenuItem value="especes">💵 Espèces</MenuItem>
                  <MenuItem value="mobile_money">📱 Mobile Money</MenuItem>
                  <MenuItem value="orange_money">🟠 Orange Money</MenuItem>
                  <MenuItem value="wave">🌊 Wave</MenuItem>
                  <MenuItem value="carte">💳 Carte bancaire</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEncaissPayDialog(false)} color="inherit">Annuler</Button>
          <Button
            onClick={handleEncaissePay}
            variant="contained"
            color="success"
            disabled={encaissPayLoading}
            sx={{ fontWeight: 'bold' }}
          >
            {encaissPayLoading ? <CircularProgress size={20} /> : '✅ Confirmer & Imprimer reçu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Clôture caisse */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PointOfSale />
            Clôturer ma caisse
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Module</InputLabel>
              <Select
                value={closeForm.module}
                label="Module"
                onChange={(e) => handleModuleChange(e.target.value as CashRegisterModule)}
              >
                {userModules.map((mod) => (
                  <MenuItem key={mod} value={mod}>{getModuleEmoji(mod)} {moduleLabels[mod]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {loadingEmployees && <CircularProgress size={20} sx={{ mb: 2 }} />}

            {isGerant && moduleEmployees.length > 0 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Employé (optionnel)</InputLabel>
                <Select
                  value={closeForm.employee_id || ''}
                  label="Employé (optionnel)"
                  onChange={(e) => setCloseForm({ ...closeForm, employee_id: e.target.value as number | null })}
                >
                  <MenuItem value="">Tous les employés</MenuItem>
                  {moduleEmployees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {expectedAmount !== null && (
              <Box sx={{ mb: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Montant attendu ({expectedAmount.count} transactions)</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">{formatCurrency(expectedAmount.amount)}</Typography>
              </Box>
            )}

            <TextField
              fullWidth
              label="Montant réel en caisse (FCFA)"
              type="number"
              value={closeForm.actual_amount || ''}
              onChange={(e) => setCloseForm({ ...closeForm, actual_amount: parseFloat(e.target.value) || 0 })}
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 100 }}
            />

            {expectedAmount !== null && closeForm.actual_amount > 0 && (
              <Box sx={{ mb: 2, p: 1.5, backgroundColor: getDifferenceBgColor(closeForm.actual_amount - expectedAmount.amount), borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Écart</Typography>
                <Typography variant="h6" fontWeight="bold" color={getDifferenceColor(closeForm.actual_amount - expectedAmount.amount)}>
                  {(closeForm.actual_amount - expectedAmount.amount) >= 0 ? '+' : ''}
                  {formatCurrency(closeForm.actual_amount - expectedAmount.amount)}
                </Typography>
              </Box>
            )}

            <TextField
              fullWidth
              label="Notes (optionnel)"
              multiline
              rows={2}
              value={closeForm.notes}
              onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)} color="inherit">Annuler</Button>
          <Button
            onClick={handleCloseCaisse}
            variant="contained"
            disabled={closeLoading || !closeForm.module}
          >
            {closeLoading ? <CircularProgress size={20} /> : 'Soumettre la clôture'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmation écart */}
      <Dialog open={confirmDifferenceDialog} onClose={() => setConfirmDifferenceDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
            ⚠️ Ecart détecté
          </Box>
        </DialogTitle>
        <DialogContent>
          {differenceInfo && (
            <>
              <Box sx={{ p: 2, backgroundColor: getDifferenceBgColor(differenceInfo.difference), borderRadius: 1, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography color="text.secondary">Montant attendu</Typography>
                    <Typography variant="h6">{formatCurrency(differenceInfo.expected)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="text.secondary">Montant reel</Typography>
                    <Typography variant="h6">{formatCurrency(differenceInfo.actual)}</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography color="text.secondary">Ecart</Typography>
                <Typography variant="h5" fontWeight="bold" color={getDifferenceColor(differenceInfo.difference)}>
                  {differenceInfo.difference >= 0 ? '+' : ''}{formatCurrency(differenceInfo.difference)}
                </Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                <strong>Voulez-vous quand meme enregistrer cette cloture ?</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {differenceInfo.difference > 0
                  ? 'Le surplus sera note et pourra etre reporte au prochain jour.'
                  : 'Le manque sera signale et devra etre justifie aupres du directeur.'
                }
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDifferenceDialog(false)} color="inherit">Annuler et revoir</Button>
          <Button
            onClick={handleConfirmWithDifference}
            variant="contained"
            color={differenceInfo && differenceInfo.difference > 0 ? 'info' : 'error'}
            disabled={closeLoading}
          >
            {closeLoading ? <CircularProgress size={20} /> : 'Confirmer avec ecart'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Receipt Print Dialog (clôtures validées) */}
      <ReceiptPrint
        open={receiptDialogOpen}
        onClose={() => { setReceiptDialogOpen(false); setSelectedReceiptId(null); }}
        receiptId={selectedReceiptId}
      />
    </Layout>
  );
};

// Helper emoji par module
function getModuleEmoji(mod: string): string {
  const emojis: Record<string, string> = {
    piscine: '🏊',
    restaurant: '🍽️',
    hotel: '🏨',
    events: '🎉',
    lavage: '🚿',
    pressing: '👔',
    maquis: '🍺',
    superette: '🛒',
    depot: '📦'
  };
  return emojis[mod] || '💰';
}

export default Caisse;
