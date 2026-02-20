import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Snackbar,
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
  Divider
} from '@mui/material';
import {
  PointOfSale,
  Check as ValidateIcon,
  Close as RejectIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { caisseApi, receiptsApi } from '../services/api';
import ReceiptPrint from '../components/ReceiptPrint';
import { CashRegister, CashRegisterModule } from '../types';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const moduleLabels: Record<CashRegisterModule, string> = {
  piscine: 'Piscine',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  events: 'Evenements'
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

const Caisse: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [pendingRegisters, setPendingRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });

  // Close dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeForm, setCloseForm] = useState({
    module: '' as CashRegisterModule | '',
    actual_amount: 0,
    notes: '',
    employee_id: null as number | null
  });
  const [expectedAmount, setExpectedAmount] = useState<{ amount: number; count: number } | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  // Liste des employes par module (pour le gerant)
  const [moduleEmployees, setModuleEmployees] = useState<Array<{ id: number; full_name: string; role: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Dialog de confirmation d'ecart
  const [confirmDifferenceDialog, setConfirmDifferenceDialog] = useState(false);
  const [differenceInfo, setDifferenceInfo] = useState<{
    expected: number;
    actual: number;
    difference: number;
    module: string;
  } | null>(null);

  // Receipt print dialog
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  // Module access by role
  const moduleAccess: Record<string, CashRegisterModule[]> = {
    maitre_nageur: ['piscine'],
    serveuse: ['restaurant'],
    serveur: ['restaurant'],
    receptionniste: ['hotel'],
    gestionnaire_events: ['events'],
    gerant: ['piscine', 'restaurant', 'hotel', 'events'],
    admin: ['piscine', 'restaurant', 'hotel', 'events'],
    directeur: ['piscine', 'restaurant', 'hotel', 'events']
  };

  const isGerant = user?.role === 'gerant' || user?.role === 'admin' || user?.role === 'directeur';

  const userModules = user ? moduleAccess[user.role] || [] : [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [registersRes] = await Promise.all([
        caisseApi.getCashRegisters()
      ]);
      setCashRegisters(registersRes.data.data.cashRegisters);

      if (hasPermission('caisse', 'validation')) {
        const pendingRes = await caisseApi.getPendingCashRegisters();
        setPendingRegisters(pendingRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = async (module: CashRegisterModule) => {
    setCloseForm({ ...closeForm, module, employee_id: null });
    setModuleEmployees([]);
    setExpectedAmount(null);

    try {
      // Si c'est le gerant, charger les employes du module ET le montant total du module
      if (isGerant) {
        setLoadingEmployees(true);
        const [empRes, amountRes] = await Promise.all([
          caisseApi.getEmployeesByModule(module),
          caisseApi.getExpectedAmount(module) // Sans employee_id = total du module
        ]);
        setModuleEmployees(empRes.data.data);
        setExpectedAmount({
          amount: amountRes.data.data.expected_amount,
          count: amountRes.data.data.transactions_count
        });
        setLoadingEmployees(false);
      } else {
        // Pour les autres employes, charger le montant attendu directement
        const res = await caisseApi.getExpectedAmount(module);
        setExpectedAmount({
          amount: res.data.data.expected_amount,
          count: res.data.data.transactions_count
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoadingEmployees(false);
    }
  };

  // Fonction reservee pour utilisation future
  const _handleEmployeeChange = async (employeeId: number) => {
    setCloseForm({ ...closeForm, employee_id: employeeId });
  };
  void _handleEmployeeChange;

  const handleCloseCaisse = async () => {
    if (!closeForm.module || closeForm.actual_amount === undefined) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs', severity: 'error' });
      return;
    }

    // Note: Le gerant peut cloturer sans selectionner un employe specifique
    // Dans ce cas, la cloture sera au nom du gerant lui-meme

    // Verifier s'il y a un ecart
    if (expectedAmount) {
      const difference = closeForm.actual_amount - expectedAmount.amount;

      if (difference !== 0) {
        // Il y a un ecart - afficher le dialogue de confirmation
        setDifferenceInfo({
          expected: expectedAmount.amount,
          actual: closeForm.actual_amount,
          difference,
          module: closeForm.module
        });
        setConfirmDifferenceDialog(true);
        return;
      }
    }

    // Pas d'ecart - proceder a la cloture
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

      // Determiner le message selon l'ecart
      if (differenceInfo && differenceInfo.difference !== 0) {
        if (differenceInfo.difference > 0) {
          setSnackbar({
            open: true,
            message: `Cloture enregistree avec un SURPLUS de ${formatCurrency(differenceInfo.difference)}. Le surplus sera reporte.`,
            severity: 'warning'
          });
        } else {
          setSnackbar({
            open: true,
            message: `Cloture enregistree avec un MANQUE de ${formatCurrency(Math.abs(differenceInfo.difference))}. Veuillez justifier cet ecart.`,
            severity: 'warning'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'Cloture de caisse reussie ! Les comptes sont bons.',
          severity: 'success'
        });
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
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Erreur lors de la cloture',
        severity: 'error'
      });
    } finally {
      setCloseLoading(false);
    }
  };

  const handleConfirmWithDifference = () => {
    performClosure(true);
  };

  const handleValidate = async (id: number, status: 'validee' | 'rejetee') => {
    try {
      const response = await caisseApi.validateCashRegister(id, status);

      // Si validee et recu genere, proposer l'impression
      if (status === 'validee' && response.data.receipt) {
        setSelectedReceiptId(response.data.receipt.id);
        setReceiptDialogOpen(true);
        setSnackbar({
          open: true,
          message: `Cloture validee - Recu ${response.data.receipt.receipt_number} genere`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: status === 'validee' ? 'Cloture validee' : 'Cloture rejetee',
          severity: 'success'
        });
      }
      fetchData();
    } catch (error) {
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
    } catch (error) {
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

  if (loading) {
    return (
      <Layout title="Caisse">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Caisse">
      {/* Close Button */}
      {hasPermission('caisse', 'cloture_propre') && userModules.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PointOfSale />}
            onClick={() => setCloseDialogOpen(true)}
          >
            Cloturer ma caisse
          </Button>
        </Box>
      )}

      {/* Pending Validations (Directeur) */}
      {hasPermission('caisse', 'validation') && pendingRegisters.length > 0 && (
        <Card sx={{ mb: 1.5 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              Clotures en attente de validation ({pendingRegisters.length})
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
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRegisters.map((reg) => (
                    <TableRow key={reg.id} sx={{ backgroundColor: getDifferenceBgColor(reg.difference) }}>
                      <TableCell>{new Date(reg.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{moduleLabels[reg.module]}</TableCell>
                      <TableCell>{reg.user?.full_name}</TableCell>
                      <TableCell align="right">{formatCurrency(reg.expected_amount)}</TableCell>
                      <TableCell align="right">{formatCurrency(reg.actual_amount)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color={getDifferenceColor(reg.difference)}>
                          {reg.difference >= 0 ? '+' : ''}{formatCurrency(reg.difference)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Valider">
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
          </CardContent>
        </Card>
      )}

      {/* History */}
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
                {cashRegisters.map((reg) => (
                  <TableRow key={reg.id} hover>
                    <TableCell>{new Date(reg.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{moduleLabels[reg.module]}</TableCell>
                    <TableCell>{reg.user?.full_name}</TableCell>
                    <TableCell align="right">{formatCurrency(reg.expected_amount)}</TableCell>
                    <TableCell align="right">{formatCurrency(reg.actual_amount)}</TableCell>
                    <TableCell align="right">
                      <Typography color={getDifferenceColor(reg.difference)}>
                        {reg.difference >= 0 ? '+' : ''}{formatCurrency(reg.difference)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[reg.status]}
                        color={statusColors[reg.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {reg.status === 'validee' && (
                        <Tooltip title="Imprimer le recu">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handlePrintReceipt(reg.id)}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {cashRegisters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">Aucune cloture</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Close Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cloture de caisse</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Module</InputLabel>
            <Select
              value={closeForm.module}
              label="Module"
              onChange={(e) => handleModuleChange(e.target.value as CashRegisterModule)}
            >
              {userModules.map((mod) => (
                <MenuItem key={mod} value={mod}>{moduleLabels[mod]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Liste des employes pour le gerant */}
          {isGerant && closeForm.module && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Employe qui fait le versement (optionnel)</InputLabel>
                <Select
                  value={closeForm.employee_id || ''}
                  label="Employe qui fait le versement (optionnel)"
                  onChange={(e) => {
                    const val = e.target.value;
                    // Juste changer l'employe, garder le meme montant attendu
                    setCloseForm({ ...closeForm, employee_id: val === '' ? null : Number(val) });
                  }}
                  disabled={loadingEmployees}
                >
                  <MenuItem value="">
                    <em>-- Moi-meme (Gerant) --</em>
                  </MenuItem>
                  {loadingEmployees ? (
                    <MenuItem disabled>Chargement...</MenuItem>
                  ) : (
                    moduleEmployees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.role === 'maitre_nageur' ? 'Maitre-nageur' :
                          emp.role === 'serveuse' ? 'Serveuse' :
                          emp.role === 'serveur' ? 'Serveur' :
                          emp.role === 'receptionniste' ? 'Receptionniste' :
                          emp.role === 'gestionnaire_events' ? 'Gest. Events' : emp.role})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {!loadingEmployees && moduleEmployees.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  La cloture sera enregistree a votre nom (Gerant).
                  Pour cloturer au nom d'un employe, creez d'abord son compte dans <strong>Utilisateurs</strong>.
                </Alert>
              )}
              {!closeForm.employee_id && expectedAmount && expectedAmount.amount > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Ce montant represente TOUTES les ventes du module {moduleLabels[closeForm.module]} aujourd'hui
                  (y compris vos propres ventes).
                </Alert>
              )}
            </>
          )}

          {expectedAmount && (
            <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Transactions: {expectedAmount.count}
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                Montant attendu: {formatCurrency(expectedAmount.amount)}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            label="Montant reel en caisse"
            type="number"
            value={closeForm.actual_amount}
            onChange={(e) => setCloseForm({ ...closeForm, actual_amount: Number(e.target.value) })}
            margin="normal"
            required
          />

          {expectedAmount && closeForm.actual_amount > 0 && (
            <Box
              sx={{
                my: 2,
                p: 2,
                borderRadius: 1,
                bgcolor: getDifferenceBgColor(closeForm.actual_amount - expectedAmount.amount)
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {closeForm.actual_amount - expectedAmount.amount === 0 ? (
                  <SuccessIcon color="success" />
                ) : (
                  <WarningIcon color={closeForm.actual_amount - expectedAmount.amount > 0 ? 'info' : 'error'} />
                )}
                <Typography variant="h6" color={getDifferenceColor(closeForm.actual_amount - expectedAmount.amount)}>
                  Ecart: {closeForm.actual_amount - expectedAmount.amount >= 0 ? '+' : ''}
                  {formatCurrency(closeForm.actual_amount - expectedAmount.amount)}
                </Typography>
              </Box>
              {closeForm.actual_amount - expectedAmount.amount === 0 && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  Les comptes sont bons !
                </Typography>
              )}
              {closeForm.actual_amount - expectedAmount.amount > 0 && (
                <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                  Surplus detecte. Ce montant sera reporte.
                </Typography>
              )}
              {closeForm.actual_amount - expectedAmount.amount < 0 && (
                <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                  Manque detecte. Veuillez verifier vos comptes.
                </Typography>
              )}
            </Box>
          )}

          <TextField
            fullWidth
            label="Notes / Commentaires"
            multiline
            rows={2}
            value={closeForm.notes}
            onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
            margin="normal"
            placeholder={expectedAmount && closeForm.actual_amount - expectedAmount.amount !== 0 ? 'Expliquez l\'ecart ici...' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCloseCaisse}
            variant="contained"
            disabled={closeLoading || !closeForm.module}
          >
            {closeLoading ? <CircularProgress size={20} /> : 'Cloturer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation d'ecart */}
      <Dialog open={confirmDifferenceDialog} onClose={() => setConfirmDifferenceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: differenceInfo && differenceInfo.difference > 0 ? 'info.main' : 'error.main' }}>
          <WarningIcon />
          Ecart detecte !
        </DialogTitle>
        <DialogContent>
          {differenceInfo && (
            <>
              <Alert severity={differenceInfo.difference > 0 ? 'info' : 'error'} sx={{ mb: 3 }}>
                {differenceInfo.difference > 0
                  ? `Il y a un SURPLUS de ${formatCurrency(differenceInfo.difference)} dans la caisse ${moduleLabels[differenceInfo.module as CashRegisterModule]}.`
                  : `Il MANQUE ${formatCurrency(Math.abs(differenceInfo.difference))} dans la caisse ${moduleLabels[differenceInfo.module as CashRegisterModule]}.`
                }
              </Alert>

              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 3 }}>
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
          <Button onClick={() => setConfirmDifferenceDialog(false)} color="inherit">
            Annuler et revoir
          </Button>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Receipt Print Dialog */}
      <ReceiptPrint
        open={receiptDialogOpen}
        onClose={() => {
          setReceiptDialogOpen(false);
          setSelectedReceiptId(null);
        }}
        receiptId={selectedReceiptId}
      />
    </Layout>
  );
};

export default Caisse;
