import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon, Warning as WarningIcon } from '@mui/icons-material';
import { receiptsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ReceiptData {
  receipt_number: string;
  module: string;
  closure_date: string;
  transactions_count: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  opening_amount: number;
  cashier: {
    name: string;
    role: string;
    module: string;
  };
  validator: {
    name: string;
  };
  validation_date: string;
  notes: string | null;
  is_modified: boolean;
  modification_date: string | null;
  modification_details: {
    original: {
      expected_amount: number;
      actual_amount: number;
      difference: number;
    };
    current: {
      expected_amount: number;
      actual_amount: number;
      difference: number;
    };
  } | null;
  generated_at: string;
}

interface ReceiptPrintProps {
  open: boolean;
  onClose: () => void;
  receiptId: number | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ open, onClose, receiptId }) => {
  const { user } = useAuth();
  const companyName = (user?.company?.name || 'Mon Entreprise').toUpperCase();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && receiptId) {
      fetchReceipt();
    }
  }, [open, receiptId]);

  const fetchReceipt = async () => {
    if (!receiptId) return;

    try {
      setLoading(true);
      setError('');
      const response = await receiptsApi.getReceiptForPrint(receiptId);
      setReceipt(response.data.data);
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError('Erreur lors du chargement du recu');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recu ${receipt?.receipt_number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .receipt {
              border: 2px solid #000;
              padding: 15px;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header h1 {
              font-size: 16px;
              margin-bottom: 5px;
            }
            .header h2 {
              font-size: 14px;
              font-weight: normal;
            }
            .section {
              margin: 10px 0;
              padding: 10px 0;
              border-bottom: 1px dashed #000;
            }
            .section:last-child {
              border-bottom: none;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 11px;
            }
            .row.total {
              font-weight: bold;
              font-size: 13px;
              margin-top: 8px;
            }
            .row.negative {
              color: #c00;
            }
            .row.positive {
              color: #080;
            }
            .signature-section {
              margin-top: 15px;
            }
            .signature-line {
              margin: 15px 0;
            }
            .signature-label {
              font-size: 11px;
              margin-bottom: 3px;
            }
            .signature-name {
              font-weight: bold;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 8px;
              margin: 10px 0;
              font-size: 10px;
            }
            .warning-title {
              color: #856404;
              font-weight: bold;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Recu de Cloture de Caisse
        <Button onClick={onClose} size="small">
          <CloseIcon />
        </Button>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {receipt && (
          <Box id="receipt-content">
            <Box className="receipt" sx={{
              border: '2px solid #000',
              p: 2,
              fontFamily: 'Courier New, monospace',
              bgcolor: '#fff'
            }}>
              {/* Header */}
              <Box className="header" sx={{ textAlign: 'center', borderBottom: '1px dashed #000', pb: 1, mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {companyName}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontSize: '14px' }}>
                  RECU DE CLOTURE DE CAISSE
                </Typography>
              </Box>

              {/* Warning if modified */}
              {receipt.is_modified && (
                <Box className="warning" sx={{
                  bgcolor: '#fff3cd',
                  border: '1px solid #ffc107',
                  p: 1,
                  my: 1,
                  borderRadius: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#856404' }}>
                    <WarningIcon fontSize="small" />
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      DOCUMENT MODIFIE LE {receipt.modification_date}
                    </Typography>
                  </Box>
                  {receipt.modification_details && (
                    <Box sx={{ mt: 1, fontSize: '10px' }}>
                      <Typography variant="caption" display="block">
                        Valeurs originales: Verse {formatCurrency(receipt.modification_details.original.actual_amount)}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Valeurs actuelles: Verse {formatCurrency(receipt.modification_details.current.actual_amount)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Info Section */}
              <Box className="section" sx={{ borderBottom: '1px dashed #000', py: 1 }}>
                <Box className="row" sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Date:</span>
                  <span>{receipt.closure_date}</span>
                </Box>
                <Box className="row" sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Module:</span>
                  <span>{receipt.module}</span>
                </Box>
                <Box className="row" sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>N Recu:</span>
                  <span style={{ fontWeight: 'bold' }}>{receipt.receipt_number}</span>
                </Box>
              </Box>

              {/* Summary Section */}
              <Box className="section" sx={{ borderBottom: '1px dashed #000', py: 1 }}>
                <Typography className="section-title" sx={{ fontWeight: 'bold', fontSize: '12px', mb: 1 }}>
                  RESUME DES OPERATIONS
                </Typography>
                <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                <Box className="row" sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', my: 0.5 }}>
                  <span>Nombre de transactions:</span>
                  <span>{receipt.transactions_count}</span>
                </Box>
                <Box className="row" sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', my: 0.5 }}>
                  <span>Montant attendu:</span>
                  <span>{formatCurrency(receipt.expected_amount)}</span>
                </Box>
                <Box className="row total" sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  my: 0.5
                }}>
                  <span>Montant verse:</span>
                  <span>{formatCurrency(receipt.actual_amount)}</span>
                </Box>
                <Box className="row" sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  my: 0.5,
                  color: receipt.difference < 0 ? '#c00' : receipt.difference > 0 ? '#080' : 'inherit'
                }}>
                  <span>Ecart:</span>
                  <span>{receipt.difference >= 0 ? '+' : ''}{formatCurrency(receipt.difference)}</span>
                </Box>
              </Box>

              {/* Signatures Section */}
              <Box className="section" sx={{ py: 1 }}>
                <Box className="signature-line" sx={{ my: 2 }}>
                  <Typography className="signature-label" sx={{ fontSize: '11px', color: '#666' }}>
                    VERSEMENT EFFECTUE PAR:
                  </Typography>
                  <Typography className="signature-name" sx={{ fontWeight: 'bold', fontSize: '13px' }}>
                    {receipt.cashier.name}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', fontStyle: 'italic' }}>
                    ({receipt.cashier.role} - {receipt.cashier.module})
                  </Typography>
                </Box>

                <Box className="signature-line" sx={{ my: 2 }}>
                  <Typography className="signature-label" sx={{ fontSize: '11px', color: '#666' }}>
                    RECEPTIONNE PAR:
                  </Typography>
                  <Typography className="signature-name" sx={{ fontWeight: 'bold', fontSize: '13px' }}>
                    {receipt.validator.name}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#666' }}>
                    (Gerant Principal)
                  </Typography>
                  <Typography sx={{ fontSize: '11px', mt: 1 }}>
                    Le {receipt.validation_date}
                  </Typography>
                </Box>
              </Box>

              {/* Notes */}
              {receipt.notes && (
                <Box className="section" sx={{ borderTop: '1px dashed #000', pt: 1 }}>
                  <Typography className="section-title" sx={{ fontWeight: 'bold', fontSize: '11px' }}>
                    OBSERVATIONS:
                  </Typography>
                  <Typography sx={{ fontSize: '11px', fontStyle: 'italic' }}>
                    {receipt.notes}
                  </Typography>
                </Box>
              )}

              {/* Footer */}
              <Box className="footer" sx={{ textAlign: 'center', mt: 2, pt: 1, borderTop: '1px dashed #000' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>
                  Document genere le {receipt.generated_at}
                </Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mt: 0.5 }}>
                  STATUT: VALIDE
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={!receipt}
        >
          Imprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptPrint;
