import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  subscribeStoreOrders,
  subscribeClientOrders,
  Order,
  getOrderStats,
  isActiveOrder,
} from '../services/orderService';
import { useAuth } from './AuthContext';

interface OrderContextValue {
  orders: Order[];
  activeOrders: Order[];
  completedOrders: Order[];
  pendingOrders: Order[];
  loading: boolean;
  stats: ReturnType<typeof getOrderStats>;
  storeId: string | null;
}

const OrderContext = createContext<OrderContextValue>({
  orders: [],
  activeOrders: [],
  completedOrders: [],
  pendingOrders: [],
  loading: true,
  stats: { total: 0, pending: 0, active: 0, delivered: 0, cancelled: 0, revenue: 0 },
  storeId: null,
});

export const useOrder = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within an OrderProvider');
  return ctx;
};

export const OrderProvider = ({ children }) => {
  const { userProfile, isClient, isVendor } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const storeId = userProfile?.storeId;
    if (!storeId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isClient()) {
      unsubRef.current = subscribeClientOrders(
        storeId,
        userProfile.id,
        (data) => { setOrders(data); setLoading(false); },
        () => setLoading(false)
      );
    } else if (isVendor()) {
      unsubRef.current = subscribeStoreOrders(
        storeId,
        (data) => { setOrders(data); setLoading(false); },
        () => setLoading(false)
      );
    } else {
      setLoading(false);
    }

    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [userProfile?.storeId, userProfile?.id, userProfile?.role]);

  const activeOrders = orders.filter((o) => isActiveOrder(o.status));
  const completedOrders = orders.filter((o) =>
    ['delivered', 'cancelled'].includes(o.status)
  );
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const stats = getOrderStats(orders);

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeOrders,
        completedOrders,
        pendingOrders,
        loading,
        stats,
        storeId: userProfile?.storeId || null,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContext;
