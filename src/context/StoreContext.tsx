import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { useAuth } from './AuthContext';

const StoreContext = createContext({});

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider = ({ children }) => {
  const { userProfile } = useAuth();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState(null);

  useEffect(() => {
    if (userProfile?.storeId) {
      setStoreId(userProfile.storeId);
    } else {
      setStore(null);
      setProducts([]);
      setClients([]);
      setEmployees([]);
      setTransactions([]);
      setDebts([]);
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!storeId) return;

    const unsubscribers = [];

    // Listen to store document
    const storeRef = doc(db, 'stores', storeId);
    unsubscribers.push(
      onSnapshot(storeRef, (docSnap) => {
        if (docSnap.exists()) {
          setStore({ id: docSnap.id, ...docSnap.data() });
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to store:', error);
        setLoading(false);
      })
    );

    // Listen to products
    const productsRef = collection(db, 'stores', storeId, 'products');
    const productsQuery = query(productsRef, orderBy('name', 'asc'));
    unsubscribers.push(
      onSnapshot(productsQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
      }, (error) => {
        console.error('Error listening to products:', error);
      })
    );

    // Listen to clients
    const clientsRef = collection(db, 'stores', storeId, 'clients');
    const clientsQuery = query(clientsRef, orderBy('name', 'asc'));
    unsubscribers.push(
      onSnapshot(clientsQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(items);
      }, (error) => {
        console.error('Error listening to clients:', error);
      })
    );

    // Listen to employees
    const employeesRef = collection(db, 'stores', storeId, 'employees');
    const employeesQuery = query(employeesRef, orderBy('name', 'asc'));
    unsubscribers.push(
      onSnapshot(employeesQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(items);
      }, (error) => {
        console.error('Error listening to employees:', error);
      })
    );

    // Listen to transactions (last 90 days)
    const transactionsRef = collection(db, 'stores', storeId, 'transactions');
    const transactionsQuery = query(transactionsRef, orderBy('date', 'desc'));
    unsubscribers.push(
      onSnapshot(transactionsQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTransactions(items);
      }, (error) => {
        console.error('Error listening to transactions:', error);
      })
    );

    // Listen to debts
    const debtsRef = collection(db, 'stores', storeId, 'debts');
    const debtsQuery = query(debtsRef, orderBy('createdAt', 'desc'));
    unsubscribers.push(
      onSnapshot(debtsQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDebts(items);
      }, (error) => {
        console.error('Error listening to debts:', error);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [storeId]);

  // Computed stats
  const getLowStockProducts = () => {
    return products.filter(p => p.quantity <= (p.minQuantity || 5));
  };

  const getTotalRevenue = (period = 'month') => {
    const now = new Date();
    let startDate;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(0);
    }

    return transactions
      .filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.type === 'revenue' && tDate >= startDate;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const getTotalExpenses = (period = 'month') => {
    const now = new Date();
    let startDate;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(0);
    }

    return transactions
      .filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.type === 'expense' && tDate >= startDate;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const getTotalProfit = (period = 'month') => {
    return getTotalRevenue(period) - getTotalExpenses(period);
  };

  const getTotalReceivable = () => {
    return debts
      .filter(d => d.type === 'receivable' && !d.isPaid)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  const getTotalPayable = () => {
    return debts
      .filter(d => d.type === 'payable' && !d.isPaid)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  const getStockValue = () => {
    return products.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantity || 0)), 0);
  };

  const value = {
    store,
    storeId,
    products,
    clients,
    employees,
    transactions,
    debts,
    loading,
    getLowStockProducts,
    getTotalRevenue,
    getTotalExpenses,
    getTotalProfit,
    getTotalReceivable,
    getTotalPayable,
    getStockValue,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export default StoreContext;
