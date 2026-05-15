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
 * Delete a transaction
 */
export const deleteTransaction = async (storeId, transactionId) => {
  try {
    const transactionRef = doc(db, 'stores', storeId, 'transactions', transactionId);
    await deleteDoc(transactionRef);
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
 * Add a debt (receivable from client or payable to supplier)
 */
export const addDebt = async (storeId, debtData) => {
  try {
    const debtsRef = collection(db, 'stores', storeId, 'debts');
    const docRef = await addDoc(debtsRef, {
      type: debtData.type, // 'receivable' | 'payable'
      amount: Number(debtData.amount) || 0,
      description: debtData.description?.trim() || '',
      clientId: debtData.clientId || null,
      clientName: debtData.clientName?.trim() || '',
      supplierName: debtData.supplierName?.trim() || '',
      dueDate: debtData.dueDate
        ? Timestamp.fromDate(new Date(debtData.dueDate))
        : null,
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
 * Mark a debt as paid
 */
export const markDebtAsPaid = async (storeId, debtId) => {
  try {
    const debtRef = doc(db, 'stores', storeId, 'debts', debtId);
    await updateDoc(debtRef, {
      isPaid: true,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a debt
 */
export const deleteDebt = async (storeId, debtId) => {
  try {
    const debtRef = doc(db, 'stores', storeId, 'debts', debtId);
    await deleteDoc(debtRef);
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
