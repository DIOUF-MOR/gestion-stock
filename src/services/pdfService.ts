import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

// ─── Invoice types & helpers ──────────────────────────────────────────────────

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  storeName: string;
  storePhone?: string;
  clientName?: string;
  clientPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  resteDu?: number;
}

export const buildInvoiceNumber = (): string => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `FAC-${d}-${r}`;
};

// ─── 0. Facture client ────────────────────────────────────────────────────────

export const generateInvoice = async (data: InvoiceData): Promise<{ success: boolean; uri?: string; error?: string }> => {
  try {
    const fc = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
    const fd = (d: Date) => moment(d).format('DD MMMM YYYY');

    const rows = data.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.quantity} ${item.unit}</td>
        <td style="text-align:right">${fc(item.unitPrice)} FCFA</td>
        <td style="text-align:right;font-weight:700">${fc(item.subtotal)} FCFA</td>
      </tr>
    `).join('');

    const discountRow = data.discount > 0
      ? `<div class="sum-row" style="color:#E74C3C"><span>Remise</span><span>−${fc(data.discount)} FCFA</span></div>` : '';

    const partialRows = (data.amountPaid != null && data.amountPaid < data.total) ? `
      <div class="sum-row" style="color:#27AE60;font-weight:700"><span>Payé</span><span>${fc(data.amountPaid)} FCFA</span></div>
      <div class="sum-row" style="color:#F39C12;font-weight:700"><span>Reste dû</span><span>${fc(data.resteDu ?? 0)} FCFA</span></div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#212121;background:#fff;padding:32px;font-size:13px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #2E86AB;margin-bottom:24px}
.store-name{font-size:20px;font-weight:900;color:#2E86AB}
.store-sub{font-size:12px;color:#757575;margin-top:4px}
.inv-title{font-size:28px;font-weight:900;color:#2E86AB;letter-spacing:3px;text-align:right}
.inv-meta{font-size:12px;color:#757575;text-align:right;margin-top:3px}
.client-box{background:#F5F7FA;border-radius:8px;padding:14px 16px;margin-bottom:20px}
.client-lbl{font-size:10px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
.client-name{font-size:15px;font-weight:700;color:#212121}
.client-phone{font-size:12px;color:#757575;margin-top:3px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead{background:#2E86AB}
thead th{color:#fff;padding:10px 12px;font-size:12px;font-weight:700;text-align:left}
tbody tr:nth-child(even){background:#F8F9FA}
tbody tr{border-bottom:1px solid #EEEEEE}
tbody td{padding:9px 12px;font-size:13px}
.pay-badge{display:inline-block;background:#E3F2FA;color:#2E86AB;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;margin-bottom:18px}
.summary{margin-left:auto;width:230px}
.sum-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #EEE}
.sum-total{display:flex;justify-content:space-between;font-size:17px;font-weight:900;color:#2E86AB;border-top:2px solid #2E86AB;padding-top:10px;margin-top:4px}
.footer{margin-top:32px;text-align:center;padding-top:16px;border-top:1px solid #EEE;color:#9E9E9E;font-size:12px}
.footer strong{color:#2E86AB;font-size:14px;display:block;margin-bottom:4px}
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="store-name">${data.storeName}</div>
    ${data.storePhone ? `<div class="store-sub">${data.storePhone}</div>` : ''}
  </div>
  <div>
    <div class="inv-title">FACTURE</div>
    <div class="inv-meta">N° ${data.invoiceNumber}</div>
    <div class="inv-meta">${fd(data.date)}</div>
  </div>
</div>
${data.clientName ? `
<div class="client-box">
  <div class="client-lbl">Facturé à</div>
  <div class="client-name">${data.clientName}</div>
  ${data.clientPhone ? `<div class="client-phone">${data.clientPhone}</div>` : ''}
</div>` : ''}
<table>
<thead><tr>
  <th>Désignation</th>
  <th style="text-align:center">Qté</th>
  <th style="text-align:right">Prix unitaire</th>
  <th style="text-align:right">Montant</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<span class="pay-badge">Paiement : ${data.paymentMethod}</span>
<div class="summary">
  <div class="sum-row"><span>Sous-total</span><span>${fc(data.subtotal)} FCFA</span></div>
  ${discountRow}
  <div class="sum-total"><span>TOTAL</span><span>${fc(data.total)} FCFA</span></div>
  ${partialRows}
</div>
<div class="footer">
  <strong>Merci pour votre confiance !</strong>
  Généré par StockManager · ${data.storeName}
</div>
</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Envoyer la facture',
      UTI: 'com.adobe.pdf',
    });
    return { success: true, uri };
  } catch (error: any) {
    console.error('generateInvoice error:', error);
    return { success: false, error: error.message };
  }
};

export const sendInvoiceWhatsApp = async (
  phone: string,
  clientName: string,
  total: number,
  invoiceNumber: string
): Promise<void> => {
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('221') ? clean : `221${clean}`;
  const fc = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
  const text =
    `Bonjour ${clientName} 👋,\n\nVoici votre facture *N°${invoiceNumber}* d'un montant de *${fc(total)} FCFA*.\n\nMerci pour votre confiance ! 🙏\n_${moment().format('DD/MM/YYYY')}_`;
  const encoded = encodeURIComponent(text);
  const waUrl = `whatsapp://send?phone=${intl}&text=${encoded}`;
  const webUrl = `https://wa.me/${intl}?text=${encoded}`;
  const canOpen = await Linking.canOpenURL(waUrl).catch(() => false);
  await Linking.openURL(canOpen ? waUrl : webUrl);
};

// ─── Common helpers ───────────────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (d) => {
  if (!d) return '–';
  const date = d?.toDate ? d.toDate() : new Date(d);
  return moment(date).format('DD/MM/YYYY');
};

const pageHeader = (storeName, reportTitle, subtitle = '') => `
  <div class="page-header">
    <div class="store-name">${storeName || 'Ma Boutique'}</div>
    <div class="report-title">${reportTitle}</div>
    ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
    <div class="report-date">Généré le ${moment().format('DD MMMM YYYY [à] HH:mm')}</div>
  </div>
`;

const baseStyles = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; background: #fff; color: #212121; font-size: 13px; }
    .page { padding: 32px; max-width: 800px; margin: auto; }
    .page-header { text-align: center; border-bottom: 3px solid #2E86AB; padding-bottom: 20px; margin-bottom: 28px; }
    .store-name { font-size: 26px; font-weight: 800; color: #1A5F7A; letter-spacing: 1px; }
    .report-title { font-size: 18px; font-weight: 700; color: #2E86AB; margin-top: 6px; }
    .report-subtitle { font-size: 13px; color: #757575; margin-top: 4px; }
    .report-date { font-size: 11px; color: #BDBDBD; margin-top: 8px; }

    .section { margin-bottom: 28px; }
    .section-title { font-size: 15px; font-weight: 700; color: #1A5F7A; border-left: 4px solid #2E86AB; padding-left: 10px; margin-bottom: 14px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    thead th { background: #2E86AB; color: #fff; font-size: 12px; font-weight: 700; padding: 10px 8px; text-align: left; }
    tbody tr:nth-child(even) { background: #F5F5F5; }
    tbody td { padding: 9px 8px; font-size: 12px; border-bottom: 1px solid #EEEEEE; vertical-align: middle; }
    tfoot td { padding: 10px 8px; font-weight: 700; font-size: 12px; background: #E8F4F8; border-top: 2px solid #2E86AB; }

    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat-card { border: 1px solid #E0E0E0; border-radius: 10px; padding: 16px; text-align: center; }
    .stat-label { font-size: 11px; color: #757575; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 22px; font-weight: 800; color: #212121; margin-top: 6px; }
    .stat-card.green { border-color: #27AE60; background: #D5F5E3; }
    .stat-card.red { border-color: #E74C3C; background: #FADBD8; }
    .stat-card.blue { border-color: #2E86AB; background: #D6EAF8; }
    .stat-card.orange { border-color: #F18F01; background: #FEF9E7; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .badge-green { background: #D5F5E3; color: #1E8449; }
    .badge-red { background: #FADBD8; color: #C0392B; }
    .badge-orange { background: #FEF9E7; color: #C07200; }
    .badge-grey { background: #F5F5F5; color: #757575; }

    .footer { margin-top: 32px; border-top: 1px solid #EEEEEE; padding-top: 14px; text-align: center; font-size: 11px; color: #BDBDBD; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: 700; }
    .color-green { color: #27AE60; }
    .color-red { color: #E74C3C; }
    .color-blue { color: #2E86AB; }
  </style>
`;

// ─── 1. Rapport de stock ──────────────────────────────────────────────────────

export const generateStockReport = async (products = [], storeName = '') => {
  try {
    const lowStock = products.filter(p => p.quantity <= (p.minQuantity || 5));
    const outOfStock = products.filter(p => p.quantity === 0);
    const totalValue = products.reduce((s, p) => s + (p.costPrice || 0) * (p.quantity || 0), 0);
    const totalRetailValue = products.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0);

    // Group by category
    const categories = {};
    products.forEach(p => {
      const cat = p.category || 'Général';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    });

    const rows = products
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(p => {
        const isLow = p.quantity <= (p.minQuantity || 5) && p.quantity > 0;
        const isOut = p.quantity === 0;
        const badge = isOut
          ? '<span class="badge badge-red">Rupture</span>'
          : isLow
          ? '<span class="badge badge-orange">Stock bas</span>'
          : '<span class="badge badge-green">OK</span>';
        return `
          <tr>
            <td class="bold">${p.name || '–'}</td>
            <td>${p.category || 'Général'}</td>
            <td class="text-center">${p.quantity || 0} ${p.unit || 'u.'}</td>
            <td class="text-center">${p.minQuantity || 5}</td>
            <td class="text-right">${formatCurrency(p.costPrice)} FCFA</td>
            <td class="text-right">${formatCurrency(p.price)} FCFA</td>
            <td class="text-right">${formatCurrency((p.costPrice || 0) * (p.quantity || 0))} FCFA</td>
            <td class="text-center">${badge}</td>
          </tr>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport de Stock</title>${baseStyles}</head><body>
    <div class="page">
      ${pageHeader(storeName, 'Rapport d\'Inventaire', `${products.length} produit${products.length > 1 ? 's' : ''} au total`)}

      <div class="stat-grid">
        <div class="stat-card blue">
          <div class="stat-label">Total Produits</div>
          <div class="stat-value">${products.length}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Ruptures de stock</div>
          <div class="stat-value">${outOfStock.length}</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Stock bas</div>
          <div class="stat-value">${lowStock.length}</div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card green">
          <div class="stat-label">Valeur stock (coût)</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalValue)}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Valeur stock (vente)</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalRetailValue)}</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Marge potentielle</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalRetailValue - totalValue)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Liste des produits</div>
        <table>
          <thead>
            <tr>
              <th>Produit</th><th>Catégorie</th><th class="text-center">Quantité</th>
              <th class="text-center">Min.</th><th class="text-right">Coût unitaire</th>
              <th class="text-right">Prix vente</th><th class="text-right">Valeur stock</th>
              <th class="text-center">Statut</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="6" class="text-right">TOTAL VALEUR STOCK:</td>
              <td class="text-right color-blue">${formatCurrency(totalValue)} FCFA</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="footer">
        ${storeName} · Rapport de stock · ${moment().format('DD/MM/YYYY HH:mm')}
      </div>
    </div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le rapport de stock',
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true, uri };
  } catch (error) {
    console.error('generateStockReport error:', error);
    return { success: false, error: error.message };
  }
};

// ─── 2. Rapport financier ─────────────────────────────────────────────────────

export const generateFinancialReport = async (transactions = [], debts = [], period = '', storeName = '') => {
  try {
    const revenues = transactions.filter(t => t.type === 'revenue');
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalRevenue = revenues.reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, t) => s + (t.amount || 0), 0);
    const profit = totalRevenue - totalExpenses;
    const unpaidDebts = debts.filter(d => !d.isPaid);
    const totalReceivable = unpaidDebts.filter(d => d.type === 'receivable').reduce((s, d) => s + (d.amount || 0), 0);
    const totalPayable = unpaidDebts.filter(d => d.type === 'payable').reduce((s, d) => s + (d.amount || 0), 0);

    // Revenue by category
    const revCats = {};
    revenues.forEach(t => {
      const cat = t.category || 'Autre';
      revCats[cat] = (revCats[cat] || 0) + (t.amount || 0);
    });
    const expCats = {};
    expenses.forEach(t => {
      const cat = t.category || 'Autre';
      expCats[cat] = (expCats[cat] || 0) + (t.amount || 0);
    });

    const transRows = transactions
      .sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return db2 - da;
      })
      .map(t => {
        const isRevenue = t.type === 'revenue';
        return `
          <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || '–'}</td>
            <td>${t.category || 'Autre'}</td>
            <td class="text-center">${t.paymentMethod || '–'}</td>
            <td class="text-right ${isRevenue ? 'color-green bold' : 'color-red'}">
              ${isRevenue ? '+' : '-'}${formatCurrency(t.amount)} FCFA
            </td>
          </tr>
        `;
      })
      .join('');

    const revCatRows = Object.entries(revCats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `
        <tr>
          <td>${cat}</td>
          <td class="text-right color-green bold">${formatCurrency(amt)} FCFA</td>
          <td class="text-right">${totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0}%</td>
        </tr>
      `).join('');

    const expCatRows = Object.entries(expCats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `
        <tr>
          <td>${cat}</td>
          <td class="text-right color-red bold">${formatCurrency(amt)} FCFA</td>
          <td class="text-right">${totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0}%</td>
        </tr>
      `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport Financier</title>${baseStyles}</head><body>
    <div class="page">
      ${pageHeader(storeName, 'Rapport Financier', period)}

      <div class="stat-grid">
        <div class="stat-card green">
          <div class="stat-label">Revenus</div>
          <div class="stat-value" style="font-size:18px">${formatCurrency(totalRevenue)}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Dépenses</div>
          <div class="stat-value" style="font-size:18px">${formatCurrency(totalExpenses)}</div>
        </div>
        <div class="stat-card ${profit >= 0 ? 'blue' : 'red'}">
          <div class="stat-label">Bénéfice net</div>
          <div class="stat-value" style="font-size:18px">${profit >= 0 ? '+' : ''}${formatCurrency(profit)}</div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card orange">
          <div class="stat-label">Créances clients</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalReceivable)}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Dettes fournisseurs</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalPayable)}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Nb. transactions</div>
          <div class="stat-value">${transactions.length}</div>
        </div>
      </div>

      ${revCatRows ? `
      <div class="section">
        <div class="section-title">Revenus par catégorie</div>
        <table>
          <thead><tr><th>Catégorie</th><th class="text-right">Montant</th><th class="text-right">Part</th></tr></thead>
          <tbody>${revCatRows}</tbody>
          <tfoot><tr><td class="bold">TOTAL REVENUS</td><td class="text-right color-green bold">${formatCurrency(totalRevenue)} FCFA</td><td></td></tr></tfoot>
        </table>
      </div>` : ''}

      ${expCatRows ? `
      <div class="section">
        <div class="section-title">Dépenses par catégorie</div>
        <table>
          <thead><tr><th>Catégorie</th><th class="text-right">Montant</th><th class="text-right">Part</th></tr></thead>
          <tbody>${expCatRows}</tbody>
          <tfoot><tr><td class="bold">TOTAL DÉPENSES</td><td class="text-right color-red bold">${formatCurrency(totalExpenses)} FCFA</td><td></td></tr></tfoot>
        </table>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Détail des transactions (${transactions.length})</div>
        <table>
          <thead>
            <tr><th>Date</th><th>Description</th><th>Catégorie</th><th class="text-center">Paiement</th><th class="text-right">Montant</th></tr>
          </thead>
          <tbody>${transRows || '<tr><td colspan="5" class="text-center">Aucune transaction</td></tr>'}</tbody>
        </table>
      </div>

      <div class="footer">
        ${storeName} · Rapport financier · ${moment().format('DD/MM/YYYY HH:mm')}
      </div>
    </div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le rapport financier',
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true, uri };
  } catch (error) {
    console.error('generateFinancialReport error:', error);
    return { success: false, error: error.message };
  }
};

// ─── 3. Rapport clients ───────────────────────────────────────────────────────

export const generateClientReport = async (clients = [], storeName = '') => {
  try {
    const clientsWithDebt = clients.filter(c => (c.totalDebt || 0) > 0);
    const totalDebt = clients.reduce((s, c) => s + (c.totalDebt || 0), 0);

    const rows = clients
      .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
      .map((c, i) => {
        const hasDebt = (c.totalDebt || 0) > 0;
        return `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td class="bold">${c.name || '–'}</td>
            <td>${c.phone || '–'}</td>
            <td>${c.email || '–'}</td>
            <td>${c.address || '–'}</td>
            <td class="text-right ${hasDebt ? 'color-red bold' : 'color-green'}">
              ${hasDebt ? formatCurrency(c.totalDebt) + ' FCFA' : 'Aucune'}
            </td>
            <td class="text-center">
              ${hasDebt
                ? '<span class="badge badge-red">Doit</span>'
                : '<span class="badge badge-green">OK</span>'}
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport Clients</title>${baseStyles}</head><body>
    <div class="page">
      ${pageHeader(storeName, 'Rapport Clients', `${clients.length} client${clients.length > 1 ? 's' : ''} au total`)}

      <div class="stat-grid">
        <div class="stat-card blue">
          <div class="stat-label">Total clients</div>
          <div class="stat-value">${clients.length}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Clients débiteurs</div>
          <div class="stat-value">${clientsWithDebt.length}</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Total créances</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalDebt)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Liste des clients</div>
        <table>
          <thead>
            <tr>
              <th class="text-center">#</th><th>Nom</th><th>Téléphone</th>
              <th>Email</th><th>Adresse</th><th class="text-right">Dette</th><th class="text-center">Statut</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7" class="text-center">Aucun client</td></tr>'}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right">TOTAL CRÉANCES:</td>
              <td class="text-right color-red bold">${formatCurrency(totalDebt)} FCFA</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${clientsWithDebt.length > 0 ? `
      <div class="section">
        <div class="section-title">Clients avec dettes (${clientsWithDebt.length})</div>
        <table>
          <thead><tr><th>Nom</th><th>Téléphone</th><th class="text-right">Montant dû</th></tr></thead>
          <tbody>
            ${clientsWithDebt
              .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
              .map(c => `
                <tr>
                  <td class="bold">${c.name || '–'}</td>
                  <td>${c.phone || '–'}</td>
                  <td class="text-right color-red bold">${formatCurrency(c.totalDebt)} FCFA</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>` : ''}

      <div class="footer">
        ${storeName} · Rapport clients · ${moment().format('DD/MM/YYYY HH:mm')}
      </div>
    </div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le rapport clients',
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true, uri };
  } catch (error) {
    console.error('generateClientReport error:', error);
    return { success: false, error: error.message };
  }
};

// ─── 4. Rapport employés ──────────────────────────────────────────────────────

export const generateEmployeeReport = async (employees = [], storeName = '') => {
  try {
    const activeEmployees = employees.filter(e => e.isActive !== false);
    const totalSalaries = activeEmployees.reduce((s, e) => s + (e.salary || 0), 0);

    const rows = employees
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((e, i) => {
        const isActive = e.isActive !== false;
        return `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td class="bold">${e.name || '–'}</td>
            <td>${e.role || '–'}</td>
            <td>${e.phone || '–'}</td>
            <td>${e.email || '–'}</td>
            <td class="text-right bold">${formatCurrency(e.salary)} FCFA</td>
            <td class="text-center">${formatDate(e.startDate)}</td>
            <td class="text-center">
              ${isActive
                ? '<span class="badge badge-green">Actif</span>'
                : '<span class="badge badge-grey">Inactif</span>'}
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport Employés</title>${baseStyles}</head><body>
    <div class="page">
      ${pageHeader(storeName, 'Rapport Employés', `${employees.length} employé${employees.length > 1 ? 's' : ''} au total`)}

      <div class="stat-grid">
        <div class="stat-card blue">
          <div class="stat-label">Total employés</div>
          <div class="stat-value">${employees.length}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Actifs</div>
          <div class="stat-value">${activeEmployees.length}</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Masse salariale/mois</div>
          <div class="stat-value" style="font-size:16px">${formatCurrency(totalSalaries)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Liste des employés</div>
        <table>
          <thead>
            <tr>
              <th class="text-center">#</th><th>Nom</th><th>Poste</th><th>Téléphone</th>
              <th>Email</th><th class="text-right">Salaire</th><th class="text-center">Début</th><th class="text-center">Statut</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="8" class="text-center">Aucun employé</td></tr>'}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right">MASSE SALARIALE MENSUELLE:</td>
              <td class="text-right color-blue bold">${formatCurrency(totalSalaries)} FCFA</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Résumé par poste</div>
        <table>
          <thead><tr><th>Poste</th><th class="text-center">Nb. employés</th><th class="text-right">Coût total</th></tr></thead>
          <tbody>
            ${(() => {
              const roles = {};
              activeEmployees.forEach(e => {
                const r = e.role || 'Employé';
                if (!roles[r]) roles[r] = { count: 0, total: 0 };
                roles[r].count++;
                roles[r].total += e.salary || 0;
              });
              return Object.entries(roles)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([role, data]) => `
                  <tr>
                    <td>${role}</td>
                    <td class="text-center">${data.count}</td>
                    <td class="text-right bold">${formatCurrency(data.total)} FCFA</td>
                  </tr>
                `).join('');
            })()}
          </tbody>
        </table>
      </div>

      <div class="footer">
        ${storeName} · Rapport employés · ${moment().format('DD/MM/YYYY HH:mm')}
      </div>
    </div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le rapport employés',
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true, uri };
  } catch (error) {
    console.error('generateEmployeeReport error:', error);
    return { success: false, error: error.message };
  }
};
