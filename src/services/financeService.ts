import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

/**
 * Add a transaction (revenue or expense)
 */
export const addTransaction = async (storeId, transactionData) => {
  try {
    const transactionsRef = collection(db, 'stores', storeId, 'transactions');
    const docRef = await addDoc(transactionsRef, {
      type: transactionData.type, // 'revenue' | 'expense'
      amount: Number(transactionData.amount) || 0,
      description: transactionData.description?.trim() || '',
      category: transactionData.category?.trim() || 'Autre',
      date: transactionData.date
        ? Timestamp.fromDate(new Date(transactionData.date))
        : serverTimestamp(),
      clientId: transactionData.clientId || null,
      productId: transactionData.productId || null,
      paymentMethod: transactionData.paymentMethod || 'Espèces',
      notes: transactionData.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update a transaction
 */
export const updateTransaction = async (storeId, transactionId, transactionData) => {
  try {
    const transactionRef = doc(db, 'stores', storeId, 'transactions', transactionId);
    await updateDoc(transactionRef, {
      ...transactionData,
      amount: Number(transactionData.amount) || 0,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a transaction.
 * For sales (revenue + items): restores each product's stock atomically.
 * For credit sales: also deletes the linked debt and decrements client.totalDebt.
 */
export const deleteTransaction = async (storeId, transactionId) => {
  try {
    const transactionRef = doc(db, 'stores', storeId, 'transactions', transactionId);
    const snap = await getDoc(transactionRef);
    if (!snap.exists()) return { success: false, error: 'Transaction introuvable' };
    const tx = snap.data();

    const isSale = tx.type === 'revenue' && Array.isArray(tx.items) && tx.items.length > 0;

    if (isSale) {
      const batch = writeBatch(db);

      // Delete the transaction
      batch.delete(transactionRef);

      // Restore stock for each product sold
      for (const item of tx.items) {
        if (item.productId && item.quantity > 0) {
          batch.update(doc(db, 'stores', storeId, 'products', item.productId), {
            quantity: increment(item.quantity),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // If credit sale: find and delete the linked debt + decrement client.totalDebt
      if (tx.paymentMethod === 'Crédit' && tx.clientId) {
        const debtsSnap = await getDocs(
          query(
            collection(db, 'stores', storeId, 'debts'),
            where('transactionId', '==', transactionId),
            where('isPaid', '==', false)
          )
        );
        for (const debtDoc of debtsSnap.docs) {
          batch.delete(debtDoc.ref);
          batch.update(doc(db, 'stores', storeId, 'clients', tx.clientId), {
            totalDebt: increment(-debtDoc.data().amount),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } else {
      // Simple transaction (manual revenue/expense) — just delete
      await deleteDoc(transactionRef);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all transactions with optional filters
 */
export const getTransactions = async (storeId, filters = {}) => {
  try {
    const transactionsRef = collection(db, 'stores', storeId, 'transactions');
    let q = query(transactionsRef, orderBy('date', 'desc'));

    if (filters.type) {
      q = query(
        transactionsRef,
        where('type', '==', filters.type),
        orderBy('date', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, transactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get financial summary for a period
 */
export const getFinancialSummary = async (storeId, startDate, endDate) => {
  try {
    const transactionsRef = collection(db, 'stores', storeId, 'transactions');
    const q = query(
      transactionsRef,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const revenue = transactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const profit = revenue - expenses;

    return {
      success: true,
      summary: { revenue, expenses, profit, transactions },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get monthly revenue data for chart
 */
export const getMonthlyData = async (storeId, year = new Date().getFullYear()) => {
  try {
    const transactionsRef = collection(db, 'stores', storeId, 'transactions');
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const q = query(
      transactionsRef,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Initialize monthly data
    const monthlyRevenue = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);

    transactions.forEach(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const month = date.getMonth();
      if (t.type === 'revenue') {
        monthlyRevenue[month] += t.amount || 0;
      } else if (t.type === 'expense') {
        monthlyExpenses[month] += t.amount || 0;
      }
    });

    return { success: true, monthlyRevenue, monthlyExpenses };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// =================== DEBTS ===================

/**
 * Add a debt (receivable from client or payable to supplier).
 * If receivable and linked to a client, also increments client.totalDebt atomically.
 */
export const addDebt = async (storeId, debtData) => {
  try {
    const amount = Number(debtData.amount) || 0;
    const isReceivableWithClient = debtData.type === 'receivable' && debtData.clientId;

    if (isReceivableWithClient) {
      const batch = writeBatch(db);
      const debtRef = doc(collection(db, 'stores', storeId, 'debts'));
      batch.set(debtRef, {
        type: debtData.type,
        amount,
        description: debtData.description?.trim() || '',
        clientId: debtData.clientId,
        clientName: debtData.clientName?.trim() || '',
        supplierName: '',
        dueDate: debtData.dueDate ? Timestamp.fromDate(new Date(debtData.dueDate)) : null,
        isPaid: false,
        paidAt: null,
        notes: debtData.notes?.trim() || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'stores', storeId, 'clients', debtData.clientId), {
        totalDebt: increment(amount),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return { success: true, id: debtRef.id };
    }

    // Payable debt or receivable without client link — simple write
    const debtsRef = collection(db, 'stores', storeId, 'debts');
    const docRef = await addDoc(debtsRef, {
      type: debtData.type,
      amount,
      description: debtData.description?.trim() || '',
      clientId: debtData.clientId || null,
      clientName: debtData.clientName?.trim() || '',
      supplierName: debtData.supplierName?.trim() || '',
      dueDate: debtData.dueDate ? Timestamp.fromDate(new Date(debtData.dueDate)) : null,
      isPaid: false,
      paidAt: null,
      notes: debtData.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update a debt
 */
export const updateDebt = async (storeId, debtId, debtData) => {
  try {
    const debtRef = doc(db, 'stores', storeId, 'debts', debtId);
    await updateDoc(debtRef, {
      ...debtData,
      amount: Number(debtData.amount) || 0,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Mark a debt as fully paid.
 * If receivable with a linked client, decrements client.totalDebt atomically.
 */
export const markDebtAsPaid = async (storeId, debtId) => {
  try {
    const debtRef = doc(db, 'stores', storeId, 'debts', debtId);
    const snap = await getDoc(debtRef);
    if (!snap.exists()) return { success: false, error: 'Dette introuvable' };
    const debt = snap.data();

    if (debt.type === 'receivable' && debt.clientId && !debt.isPaid) {
      const batch = writeBatch(db);
      batch.update(debtRef, { isPaid: true, paidAt: serverTimestamp(), updatedAt: serverTimestamp() });
      batch.update(doc(db, 'stores', storeId, 'clients', debt.clientId), {
        totalDebt: increment(-debt.amount),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      await updateDoc(debtRef, { isPaid: true, paidAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Apply a partial payment to a receivable debt.
 * Reduces the debt amount and decrements client.totalDebt atomically.
 */
export const applyPartialPaymentToDebt = async (storeId, debtId, paymentAmount) => {
  try {
    const debtRef = doc(db, 'stores', storeId, 'debts', debtId);
    const snap = await getDoc(debtRef);
    if (!snap.exists()) return { success: false, error: 'Dette introuvable' };
    const debt = snap.data();

    if (debt.isPaid) return { success: false, error: 'Cette dette est déjà soldée' };
    const payment = Math.min(paymentAmount, debt.amount);
    const remaining = debt.amount - payment;
    const isPaidOff = remaining <= 0;

    const batch = writeBatch(db);
    batch.update(debtRef, {
      amount: remaining,
      isPaid: isPaidOff,
      paidAt: isPaidOff ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    if (debt.type === 'receivable' && debt.clientId) {
      batch.update(doc(db, 'stores', storeId, 'clients', debt.clientId), {
        totalDebt: increment(-payment),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return { success: true, remaining };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a debt.
 * If it was an unpaid receivable linked to a client, decrements client.totalDebt.
 */
export const deleteDebt = async (storeId, debtId) => {
  try {
    const debtRef = doc(db, 'stores', storeId, 'debts', debtId);
    const snap = await getDoc(debtRef);
    if (!snap.exists()) return { success: false, error: 'Dette introuvable' };
    const debt = snap.data();

    if (debt.type === 'receivable' && debt.clientId && !debt.isPaid) {
      const batch = writeBatch(db);
      batch.delete(debtRef);
      batch.update(doc(db, 'stores', storeId, 'clients', debt.clientId), {
        totalDebt: increment(-debt.amount),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      await deleteDoc(debtRef);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all debts with optional filters
 */
export const getDebts = async (storeId, filters = {}) => {
  try {
    const debtsRef = collection(db, 'stores', storeId, 'debts');
    let q = query(debtsRef, orderBy('createdAt', 'desc'));

    if (filters.type) {
      q = query(
        debtsRef,
        where('type', '==', filters.type),
        orderBy('createdAt', 'desc')
      );
    }

    if (filters.isPaid !== undefined) {
      q = query(
        debtsRef,
        where('isPaid', '==', filters.isPaid),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, debts };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get transaction categories
 */
export const getTransactionCategories = () => {
  return {
    revenue: [
      'Vente de produits',
      'Prestation de service',
      'Remboursement',
      'Autre revenu',
    ],
    expense: [
      'Achat de stock',
      'Salaires',
      'Loyer',
      'Électricité/Eau',
      'Transport',
      'Marketing',
      'Entretien',
      'Taxes',
      'Autre dépense',
    ],
  };
};
