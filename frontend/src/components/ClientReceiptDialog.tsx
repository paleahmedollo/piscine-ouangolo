import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';

const fmt = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClientReceiptData =
  | {
      type: 'hotel';
      clientName: string;
      clientPhone?: string;
      roomNumber: string;
      roomType: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      totalPrice: number;
      depositPaid: number;
      soldePaid: number;
      cashierName: string;
    }
  | {
      type: 'event';
      clientName: string;
      clientPhone?: string;
      eventName: string;
      eventDate: string;
      space: string;
      guestCount?: number;
      price: number;
      depositPaid: number;
      soldePaid: number;
      cashierName: string;
    }
  | {
      type: 'restaurant';
      items: Array<{ name: string; quantity: number; unit_price: number; total: number }>;
      total: number;
      paymentMethod: string;
      tableNumber?: string;
      cashierName: string;
    }
  | {
      type: 'generic';
      module: string;
      description: string;
      amount: number;
      paymentMethod: string;
      clientName?: string;
      date: string;
      reference: string;
      cashierName: string;
    };

interface Props {
  open: boolean;
  onClose: () => void;
  data: ClientReceiptData | null;
}

// ─── HTML du reçu pour l'impression ─────────────────────────────────────────

const buildReceiptHtml = (data: ClientReceiptData, receiptNumber: string, dateStr: string): string => {
  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}
    .center{text-align:center}
    .bold{font-weight:bold}
    .row{display:flex;justify-content:space-between;margin:2px 0}
    .sep{border-top:1px dashed #000;margin:6px 0}
    .title{font-size:15px;font-weight:bold;text-align:center}
    .total-row{display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin:4px 0}
    @media print{body{width:100%}}
  `;

  let body = `
    <div class="title">PISCINE DE OUANGOLO</div>
    <div class="center" style="font-size:10px">Ouangolo, Côte d'Ivoire</div>
    <div class="sep"></div>
    <div class="center bold">REÇU CLIENT</div>
    <div class="sep"></div>
    <div class="row"><span>N° Reçu :</span><span>${receiptNumber}</span></div>
    <div class="row"><span>Date :</span><span>${dateStr}</span></div>
    <div class="sep"></div>
  `;

  if (data.type === 'hotel') {
    body += `
      <div class="bold" style="margin-bottom:4px">MODULE : HÔTEL</div>
      <div class="row"><span>Client :</span><span>${data.clientName}</span></div>
      ${data.clientPhone ? `<div class="row"><span>Tél :</span><span>${data.clientPhone}</span></div>` : ''}
      <div class="row"><span>Chambre :</span><span>${data.roomNumber} (${data.roomType})</span></div>
      <div class="row"><span>Arrivée :</span><span>${new Date(data.checkIn).toLocaleDateString('fr-FR')}</span></div>
      <div class="row"><span>Départ :</span><span>${new Date(data.checkOut).toLocaleDateString('fr-FR')}</span></div>
      <div class="row"><span>Durée :</span><span>${data.nights} nuit${data.nights > 1 ? 's' : ''}</span></div>
      <div class="sep"></div>
      <div class="row"><span>Total séjour :</span><span>${fmt(data.totalPrice)}</span></div>
      <div class="row"><span>Acompte versé :</span><span>${fmt(data.depositPaid)}</span></div>
      <div class="row"><span>Solde payé :</span><span>${fmt(data.soldePaid)}</span></div>
      <div class="sep"></div>
      <div class="total-row"><span>TOTAL ENCAISSÉ :</span><span>${fmt(data.depositPaid + data.soldePaid)}</span></div>
    `;
  }

  if (data.type === 'event') {
    body += `
      <div class="bold" style="margin-bottom:4px">MODULE : ÉVÉNEMENTS</div>
      <div class="row"><span>Client :</span><span>${data.clientName}</span></div>
      ${data.clientPhone ? `<div class="row"><span>Tél :</span><span>${data.clientPhone}</span></div>` : ''}
      <div class="row"><span>Événement :</span><span>${data.eventName}</span></div>
      <div class="row"><span>Date :</span><span>${new Date(data.eventDate).toLocaleDateString('fr-FR')}</span></div>
      <div class="row"><span>Espace :</span><span>${data.space}</span></div>
      ${data.guestCount ? `<div class="row"><span>Invités :</span><span>${data.guestCount}</span></div>` : ''}
      <div class="sep"></div>
      <div class="row"><span>Prix total :</span><span>${fmt(data.price)}</span></div>
      <div class="row"><span>Acompte versé :</span><span>${fmt(data.depositPaid)}</span></div>
      <div class="row"><span>Solde payé :</span><span>${fmt(data.soldePaid)}</span></div>
      <div class="sep"></div>
      <div class="total-row"><span>TOTAL ENCAISSÉ :</span><span>${fmt(data.depositPaid + data.soldePaid)}</span></div>
    `;
  }

  if (data.type === 'restaurant') {
    const itemsHtml = data.items.map(i =>
      `<div class="row"><span>${i.name} x${i.quantity}</span><span>${fmt(i.total)}</span></div>`
    ).join('');
    body += `
      <div class="bold" style="margin-bottom:4px">MODULE : RESTAURANT</div>
      ${data.tableNumber ? `<div class="row"><span>Table :</span><span>${data.tableNumber}</span></div>` : ''}
      <div class="sep"></div>
      ${itemsHtml}
      <div class="sep"></div>
      <div class="total-row"><span>TOTAL :</span><span>${fmt(data.total)}</span></div>
      <div class="row"><span>Paiement :</span><span>${data.paymentMethod}</span></div>
    `;
  }

  if (data.type === 'generic') {
    body += `
      <div class="bold" style="margin-bottom:4px">MODULE : ${data.module.toUpperCase()}</div>
      ${data.clientName ? `<div class="row"><span>Client :</span><span>${data.clientName}</span></div>` : ''}
      <div class="row"><span>Date :</span><span>${data.date}</span></div>
      <div class="row"><span>Ref. :</span><span>${data.reference}</span></div>
      <div class="sep"></div>
      <div class="row"><span>Description :</span><span></span></div>
      <div style="margin:2px 0;font-size:11px">${data.description}</div>
      <div class="sep"></div>
      <div class="total-row"><span>MONTANT :</span><span>${fmt(data.amount)}</span></div>
      <div class="row"><span>Paiement :</span><span>${data.paymentMethod}</span></div>
    `;
  }

  body += `
    <div class="sep"></div>
    <div class="row"><span>Caissier :</span><span>${data.cashierName}</span></div>
    <div style="margin-top:15px">Signature : ____________________</div>
    <div class="sep"></div>
    <div class="center" style="margin-top:8px">Merci de votre visite !</div>
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu</title><style>${css}</style></head><body>${body}</body></html>`;
};

// ─── Composant ───────────────────────────────────────────────────────────────

const ClientReceiptDialog: React.FC<Props> = ({ open, onClose, data }) => {
  if (!data) return null;

  const now = new Date();
  const receiptNumber = `RC-${now.getFullYear()}-${now.getTime().toString().slice(-6)}`;
  const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    const html = buildReceiptHtml(data, receiptNumber, dateStr);
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const R = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{label}</Typography>
      <Typography variant="caption" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>{value}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Reçu Client — Aperçu</DialogTitle>
      <DialogContent>
        <Box sx={{
          border: '1px dashed #999', borderRadius: 1, p: 2,
          fontFamily: 'Courier New, monospace', fontSize: '12px', backgroundColor: '#fafafa'
        }}>
          <Typography align="center" fontWeight="bold" sx={{ fontFamily: 'inherit', fontSize: '14px' }}>
            PISCINE DE OUANGOLO
          </Typography>
          <Typography align="center" variant="caption" sx={{ fontFamily: 'inherit', display: 'block', mb: 1 }}>
            REÇU CLIENT
          </Typography>
          <Divider sx={{ borderStyle: 'dashed', mb: 1 }} />
          <R label="N° Reçu :" value={receiptNumber} />
          <R label="Date :" value={dateStr} />
          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

          {data.type === 'hotel' && (
            <>
              <Typography variant="caption" fontWeight="bold" sx={{ fontFamily: 'inherit', display: 'block', mb: 0.5 }}>
                MODULE : HÔTEL
              </Typography>
              <R label="Client :" value={data.clientName} />
              {data.clientPhone && <R label="Tél :" value={data.clientPhone} />}
              <R label="Chambre :" value={`${data.roomNumber} (${data.roomType})`} />
              <R label="Arrivée :" value={new Date(data.checkIn).toLocaleDateString('fr-FR')} />
              <R label="Départ :" value={new Date(data.checkOut).toLocaleDateString('fr-FR')} />
              <R label="Durée :" value={`${data.nights} nuit${data.nights > 1 ? 's' : ''}`} />
              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
              <R label="Total séjour :" value={fmt(data.totalPrice)} />
              <R label="Acompte versé :" value={fmt(data.depositPaid)} />
              <R label="Solde payé :" value={fmt(data.soldePaid)} />
            </>
          )}

          {data.type === 'event' && (
            <>
              <Typography variant="caption" fontWeight="bold" sx={{ fontFamily: 'inherit', display: 'block', mb: 0.5 }}>
                MODULE : ÉVÉNEMENTS
              </Typography>
              <R label="Client :" value={data.clientName} />
              {data.clientPhone && <R label="Tél :" value={data.clientPhone} />}
              <R label="Événement :" value={data.eventName} />
              <R label="Date :" value={new Date(data.eventDate).toLocaleDateString('fr-FR')} />
              <R label="Espace :" value={data.space} />
              {data.guestCount && <R label="Invités :" value={String(data.guestCount)} />}
              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
              <R label="Prix total :" value={fmt(data.price)} />
              <R label="Acompte versé :" value={fmt(data.depositPaid)} />
              <R label="Solde payé :" value={fmt(data.soldePaid)} />
            </>
          )}

          {data.type === 'restaurant' && (
            <>
              <Typography variant="caption" fontWeight="bold" sx={{ fontFamily: 'inherit', display: 'block', mb: 0.5 }}>
                MODULE : RESTAURANT
              </Typography>
              {data.tableNumber && <R label="Table :" value={data.tableNumber} />}
              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
              {data.items.map((item, i) => (
                <R key={i} label={`${item.name} x${item.quantity}`} value={fmt(item.total)} />
              ))}
              <R label="Paiement :" value={data.paymentMethod} />
            </>
          )}

          {data.type === 'generic' && (
            <>
              <Typography variant="caption" fontWeight="bold" sx={{ fontFamily: 'inherit', display: 'block', mb: 0.5 }}>
                MODULE : {data.module.toUpperCase()}
              </Typography>
              {data.clientName && <R label="Client :" value={data.clientName} />}
              <R label="Date :" value={data.date} />
              <R label="Ref. :" value={data.reference} />
              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>Description :</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 0.5 }}>{data.description}</Typography>
              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
              <R label="Paiement :" value={data.paymentMethod} />
            </>
          )}

          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" fontWeight="bold" sx={{ fontFamily: 'inherit' }}>
              {data.type === 'generic' ? 'MONTANT :' : 'TOTAL ENCAISSÉ :'}
            </Typography>
            <Typography variant="caption" fontWeight="bold" sx={{ fontFamily: 'inherit', fontSize: '13px', color: 'primary.main' }}>
              {data.type === 'hotel' ? fmt(data.depositPaid + data.soldePaid)
                : data.type === 'event' ? fmt(data.depositPaid + data.soldePaid)
                : data.type === 'restaurant' ? fmt(data.total)
                : fmt(data.amount)}
            </Typography>
          </Box>
          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
          <R label="Caissier :" value={data.cashierName} />
          <Typography variant="caption" sx={{ fontFamily: 'inherit', display: 'block', mt: 1.5 }}>
            Signature : ____________________
          </Typography>
          <Typography align="center" variant="caption" sx={{ fontFamily: 'inherit', display: 'block', mt: 1.5 }}>
            Merci de votre visite !
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<PrintIcon />} color="primary">
          Imprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientReceiptDialog;
