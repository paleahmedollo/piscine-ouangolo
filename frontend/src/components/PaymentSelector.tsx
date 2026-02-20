import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Alert
} from '@mui/material';
import {
  Money as CashIcon,
  PhoneAndroid as MobileIcon,
  CreditCard as CardIcon,
  QrCodeScanner as QrIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import QRScanner from './QRScanner';

export interface PaymentInfo {
  method: string;
  operator?: string;
  reference?: string;
}

interface PaymentSelectorProps {
  value: PaymentInfo;
  onChange: (info: PaymentInfo) => void;
  label?: string;
}

const OPERATORS = [
  { id: 'orange', label: 'Orange Money', color: '#FF6600', bg: '#FFF3E0' },
  { id: 'moov',   label: 'Moov Money',   color: '#0057A8', bg: '#E3F2FD' },
  { id: 'wave',   label: 'Wave',          color: '#1BC5BD', bg: '#E0F7FA' },
  { id: 'mtn',    label: 'MTN MoMo',      color: '#FFCC00', bg: '#FFFDE7' },
];

const PaymentSelector: React.FC<PaymentSelectorProps> = ({ value, onChange, label }) => {
  const [showQR, setShowQR] = useState(false);

  const handleMethodChange = (_: any, newMethod: string) => {
    if (!newMethod) return;
    onChange({ method: newMethod, operator: undefined, reference: undefined });
  };

  const handleOperatorClick = (op: typeof OPERATORS[0]) => {
    onChange({ ...value, operator: op.id, reference: undefined });
    setShowQR(true);
  };

  const handleQRScanned = (data: string) => {
    setShowQR(false);
    onChange({ ...value, reference: data });
  };

  const selectedOp = OPERATORS.find(o => o.id === value.operator);

  return (
    <Box>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      {/* Mode de paiement principal */}
      <ToggleButtonGroup
        value={value.method}
        exclusive
        onChange={handleMethodChange}
        fullWidth
        size="small"
        sx={{ mb: value.method === 'mobile_money' ? 2 : 0 }}
      >
        <ToggleButton value="especes" sx={{ gap: 0.5 }}>
          <CashIcon fontSize="small" /> Espèces
        </ToggleButton>
        <ToggleButton value="mobile_money" sx={{ gap: 0.5 }}>
          <MobileIcon fontSize="small" /> Mobile Money
        </ToggleButton>
        <ToggleButton value="carte" sx={{ gap: 0.5 }}>
          <CardIcon fontSize="small" /> Carte
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Sélection opérateur si Mobile Money */}
      {value.method === 'mobile_money' && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Choisir l'opérateur
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {OPERATORS.map(op => (
              <Button
                key={op.id}
                variant={value.operator === op.id ? 'contained' : 'outlined'}
                onClick={() => handleOperatorClick(op)}
                sx={{
                  borderColor: op.color,
                  color: value.operator === op.id ? 'white' : op.color,
                  backgroundColor: value.operator === op.id ? op.color : op.bg,
                  '&:hover': { backgroundColor: op.color, color: 'white' },
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  py: 1.5
                }}
              >
                {op.label}
              </Button>
            ))}
          </Box>

          {/* Résultat du scan QR */}
          {value.operator && (
            <Box sx={{ mt: 1.5 }}>
              {value.reference ? (
                <Alert
                  severity="success"
                  icon={<CheckIcon />}
                  action={
                    <Button size="small" onClick={() => setShowQR(true)}>
                      <QrIcon fontSize="small" />
                    </Button>
                  }
                >
                  <Typography variant="caption" noWrap>
                    Réf: {value.reference.slice(0, 40)}{value.reference.length > 40 ? '...' : ''}
                  </Typography>
                </Alert>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<QrIcon />}
                  onClick={() => setShowQR(true)}
                  sx={{ borderStyle: 'dashed', py: 1.5 }}
                >
                  Scanner le QR code {selectedOp?.label}
                </Button>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* QR Scanner Dialog */}
      <QRScanner
        open={showQR}
        operator={selectedOp}
        onScan={handleQRScanned}
        onClose={() => setShowQR(false)}
      />
    </Box>
  );
};

export default PaymentSelector;
