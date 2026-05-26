import {
  collection,
  doc,
  writeBatch,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export type SaleItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
};

export type SaleData = {
  items: SaleItem[];
  total: number;
  discount: number;
  clientId: string | null;
  clientName: string | null;
  paymentMethod: string;
  notes: string;
  amountPaid?: number; // si défini et < total, le reste devient une dette
};

/**
 * Record a sale: creates a transaction and decrements each product's stock atomically.
 * If paymentMethod === 'Crédit', also creates a debt entry for the client.
 */
export const createSale = async (storeId: string, saleData: SaleData) => {
  try {
    if (!storeId) throw new Error('Boutique introuvable.');
    if (!saleData.items || saleData.items.length === 0)
      throw new Error('Le panier est vide.');

    const { items, total, discount, clientId, clientName, paymentMethod, notes, amountPaid } = saleData;
    const batch = writeBatch(db);

    // 1. Transaction record
    const transactionRef = doc(collection(db, 'stores', storeId, 'transactions'));
    batch.set(transactionRef, {
      type: 'revenue',
      category: 'Vente de produits',
      amount: total,
      discount: discount || 0,
      description: `Vente — ${items.length} article${items.length > 1 ? 's' : ''}`,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit,
        subtotal: item.quantity * item.unitPrice,
      })),
      clientId: clientId || null,
      clientName: clientName || null,
      paymentMethod,
      notes: notes || '',
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Decrement stock for each product
    for (const item of items) {
      const productRef = doc(db, 'stores', storeId, 'products', item.productId);
      batch.update(productRef, {
        quantity: increment(-item.quantity),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Debt creation — full credit OR partial payment with remainder
    const isFullCredit = paymentMethod === 'Crédit' && clientId;
    const paidNow = amountPaid ?? total;
    const debtAmount = total - paidNow;
    const isPartial = paymentMethod !== 'Crédit' && clientId && debtAmount > 0;

    if (isFullCredit || isPartial) {
      const debtValue = isFullCredit ? total : debtAmount;
      const debtRef = doc(collection(db, 'stores', storeId, 'debts'));
      batch.set(debtRef, {
        type: 'receivable',
        amount: debtValue,
        description: isFullCredit
          ? `Vente à crédit — ${items.length} article${items.length > 1 ? 's' : ''}`
          : `Reste dû — ${items.length} article${items.length > 1 ? 's' : ''}`,
        clientId,
        clientName: clientName || '',
        supplierName: '',
        dueDate: null,
        isPaid: false,
        paidAt: null,
        notes: notes || '',
        transactionId: transactionRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'stores', storeId, 'clients', clientId), {
        totalDebt: increment(debtValue),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return { success: true, saleId: transactionRef.id };
  } catch (error: any) {
    console.error('createSale error:', error);
    return { success: false, error: error.message };
  }
};
