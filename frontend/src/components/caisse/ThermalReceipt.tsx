import React from 'react';

export interface ThermalReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ThermalReceiptData {
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  module: string;
  moduleLabel: string;
  receiptNumber: string;
  date: string;
  cashierName: string;
  items: ThermalReceiptItem[];
  total: number;
  paymentMethod: string;
  tableNumber?: string;
  clientName?: string;
  extra?: Record<string, string>;
}

const MODULE_LABELS: Record<string, string> = {
  restaurant: 'RESTAURANT',
  lavage: 'LAVAGE AUTO',
  pressing: 'PRESSING',
  maquis: 'MAQUIS / BAR',
  superette: 'SUPÉRETTE',
  depot: 'DÉPÔT',
  piscine: 'PISCINE',
  hotel: 'HÔTEL',
  events: 'ÉVÉNEMENTS',
};

const PAYMENT_LABELS: Record<string, string> = {
  especes: 'Espèces',
  mobile_money: 'Mobile Money',
  carte: 'Carte bancaire',
  orange_money: 'Orange Money',
  wave: 'Wave',
};

const formatCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

function pad(str: string, width: number, right = false): string {
  const s = String(str);
  if (s.length >= width) return s.substring(0, width);
  return right ? s.padEnd(width) : s.padStart(width);
}

const ThermalReceipt: React.FC<{ data: ThermalReceiptData }> = ({ data }) => {
  const LINE = '================================';
  const SEP  = '--------------------------------';

  return (
    <div
      id="thermal-receipt"
      style={{
        fontFamily: 'Courier New, Courier, monospace',
        fontSize: '12px',
        width: '300px',
        margin: '0 auto',
        padding: '8px',
        background: '#fff',
        color: '#000',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap'
      }}
    >
      {/* En-tête */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
        {data.companyName}
      </div>
      {data.companyAddress && (
        <div style={{ textAlign: 'center', fontSize: '11px' }}>{data.companyAddress}</div>
      )}
      {data.companyPhone && (
        <div style={{ textAlign: 'center', fontSize: '11px' }}>Tél: {data.companyPhone}</div>
      )}

      <div style={{ textAlign: 'center', marginTop: '4px' }}>{LINE}</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
        {MODULE_LABELS[data.module] || data.moduleLabel}
      </div>
      <div style={{ textAlign: 'center' }}>{LINE}</div>

      {/* Infos */}
      <div>N° Reçu : {data.receiptNumber}</div>
      <div>Date    : {data.date}</div>
      <div>Caissier: {data.cashierName}</div>
      {data.tableNumber && <div>Table   : {data.tableNumber}</div>}
      {data.clientName  && <div>Client  : {data.clientName}</div>}
      {data.extra && Object.entries(data.extra).map(([k, v]) => (
        <div key={k}>{pad(k + ' ', 9, true)}: {v}</div>
      ))}

      <div style={{ textAlign: 'center' }}>{SEP}</div>

      {/* Articles */}
      {data.items.map((item, i) => {
        const qtyPrice = `${item.quantity} x ${formatCFA(item.unit_price)}`;
        const total    = formatCFA(item.total);
        return (
          <div key={i}>
            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{qtyPrice}</span>
              <span>{total}</span>
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'center' }}>{SEP}</div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
        <span>TOTAL</span>
        <span>{formatCFA(data.total)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Paiement</span>
        <span>{PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: '4px' }}>{LINE}</div>
      <div style={{ textAlign: 'center' }}>Merci pour votre visite !</div>
      <div style={{ textAlign: 'center' }}>{LINE}</div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #thermal-receipt, #thermal-receipt * { visibility: visible !important; }
          #thermal-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4px !important;
          }
        }
      `}</style>
    </div>
  );
};

export function printThermalReceipt(data: ThermalReceiptData) {
  // Génère un numéro de reçu simple
  const receiptNum = 'R-' + Date.now().toString().slice(-6);
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const fullData: ThermalReceiptData = { ...data, receiptNumber: receiptNum, date: dateStr };

  // Ouvrir une fenêtre d'impression
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;

  const itemsHtml = fullData.items.map(item => `
    <div style="font-weight:bold">${item.name}</div>
    <div style="display:flex;justify-content:space-between">
      <span>${item.quantity} x ${new Intl.NumberFormat('fr-FR').format(item.unit_price)} FCFA</span>
      <span>${new Intl.NumberFormat('fr-FR').format(item.total)} FCFA</span>
    </div>
  `).join('');

  const extrasHtml = fullData.extra ? Object.entries(fullData.extra).map(([k, v]) => `<div>${k}: ${v}</div>`).join('') : '';

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reçu</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 4px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .big { font-size: 14px; }
        .line { text-align: center; }
        .row { display: flex; justify-content: space-between; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style>
    </head>
    <body>
      <div class="center bold big">${fullData.companyName}</div>
      ${fullData.companyAddress ? `<div class="center">${fullData.companyAddress}</div>` : ''}
      ${fullData.companyPhone ? `<div class="center">Tél: ${fullData.companyPhone}</div>` : ''}
      <div class="line">================================</div>
      <div class="center bold">${MODULE_LABELS[fullData.module] || fullData.moduleLabel}</div>
      <div class="line">================================</div>
      <div>N° Reçu : ${fullData.receiptNumber}</div>
      <div>Date    : ${fullData.date}</div>
      <div>Caissier: ${fullData.cashierName}</div>
      ${fullData.tableNumber ? `<div>Table   : ${fullData.tableNumber}</div>` : ''}
      ${fullData.clientName  ? `<div>Client  : ${fullData.clientName}</div>` : ''}
      ${extrasHtml}
      <div class="line">--------------------------------</div>
      ${itemsHtml}
      <div class="line">--------------------------------</div>
      <div class="row bold" style="font-size:13px"><span>TOTAL</span><span>${new Intl.NumberFormat('fr-FR').format(fullData.total)} FCFA</span></div>
      <div class="row"><span>Paiement</span><span>${PAYMENT_LABELS[fullData.paymentMethod] || fullData.paymentMethod}</span></div>
      <div class="line">================================</div>
      <div class="center">Merci pour votre visite !</div>
      <div class="line">================================</div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

export default ThermalReceipt;
