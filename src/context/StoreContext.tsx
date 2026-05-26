import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
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

    // Livreurs and clients only need the store document — not subcollections (permission denied)
    const isLivreurRole = userProfile?.role === 'livreur';
    const isClientRole = userProfile?.role === 'client';

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

    // Skip subcollections for livreurs and clients (no permission + not needed)
    if (isLivreurRole || isClientRole) {
      return () => unsubscribers.forEach(unsub => unsub());
    }

    // Listen to products — sort by name in JS (no index needed)
    unsubscribers.push(
      onSnapshot(collection(db, 'stores', storeId, 'products'), (snapshot) => {
        const items = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setProducts(items);
      }, (error) => console.error('products listener:', error))
    );

    // Listen to clients — sort by name in JS
    unsubscribers.push(
      onSnapshot(collection(db, 'stores', storeId, 'clients'), (snapshot) => {
        const items = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setClients(items);
      }, (error) => console.error('clients listener:', error))
    );

    // Listen to employees — sort by name in JS
    unsubscribers.push(
      onSnapshot(collection(db, 'stores', storeId, 'employees'), (snapshot) => {
        const items = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setEmployees(items);
      }, (error) => console.error('employees listener:', error))
    );

    // Listen to transactions — sort by date desc in JS
    unsubscribers.push(
      onSnapshot(collection(db, 'stores', storeId, 'transactions'), (snapshot) => {
        const items = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
            const db_ = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
            return db_ - da;
          });
        setTransactions(items);
      }, (error) => console.error('transactions listener:', error))
    );

    // Listen to debts — sort by createdAt desc in JS
    unsubscribers.push(
      onSnapshot(collection(db, 'stores', storeId, 'debts'), (snapshot) => {
        const items = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return db_ - da;
          });
        setDebts(items);
      }, (error) => console.error('debts listener:', error))
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [storeId, userProfile?.role]);

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
