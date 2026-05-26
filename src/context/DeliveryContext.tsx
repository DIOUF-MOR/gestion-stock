import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  subscribeStoreDeliveries,
  subscribeLivreurDeliveries,
  subscribeStoreLivreurs,
  Delivery,
  getLivreurStats,
} from '../services/deliveryService';
import { useAuth } from './AuthContext';

interface DeliveryContextValue {
  deliveries: Delivery[];
  livreurs: any[];
  loading: boolean;
  stats: ReturnType<typeof getLivreurStats>;
  activeDeliveries: Delivery[];
  historyDeliveries: Delivery[];
  storeId: string | null;
}

const DeliveryContext = createContext<DeliveryContextValue>({
  deliveries: [],
  livreurs: [],
  loading: true,
  stats: {
    total: 0,
    delivered: 0,
    pending: 0,
    inProgress: 0,
    failed: 0,
    cancelled: 0,
    successRate: 0,
    todayTotal: 0,
    todayDelivered: 0,
  },
  activeDeliveries: [],
  historyDeliveries: [],
  storeId: null,
});

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) throw new Error('useDelivery must be used within a DeliveryProvider');
  return context;
};

export const DeliveryProvider = ({ children }) => {
  const { userProfile, isLivreur, isVendor, isEmployee } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribeDeliveries = useRef<(() => void) | null>(null);
  const unsubscribeLivreurs = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up previous subscriptions
    if (unsubscribeDeliveries.current) {
      unsubscribeDeliveries.current();
      unsubscribeDeliveries.current = null;
    }
    if (unsubscribeLivreurs.current) {
      unsubscribeLivreurs.current();
      unsubscribeLivreurs.current = null;
    }

    const storeId = userProfile?.storeId;
    if (!storeId) {
      setDeliveries([]);
      setLivreurs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isLivreur()) {
      // Livreur: only see their own deliveries
      unsubscribeDeliveries.current = subscribeLivreurDeliveries(
        storeId,
        userProfile.id,
        (data) => {
          setDeliveries(data);
          setLoading(false);
        },
        () => setLoading(false)
      );
    } else if (isVendor() || isEmployee()) {
      // Vendor/Admin/Employee: see all store deliveries + livreurs list
      unsubscribeDeliveries.current = subscribeStoreDeliveries(
        storeId,
        (data) => {
          setDeliveries(data);
          setLoading(false);
        },
        () => setLoading(false)
      );

      unsubscribeLivreurs.current = subscribeStoreLivreurs(storeId, setLivreurs);
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribeDeliveries.current) unsubscribeDeliveries.current();
      if (unsubscribeLivreurs.current) unsubscribeLivreurs.current();
    };
  }, [userProfile?.storeId, userProfile?.id, userProfile?.role, userProfile?.employeeRole]);

  const activeDeliveries = deliveries.filter((d) =>
    ['pending', 'assigned', 'in_progress'].includes(d.status)
  );

  const historyDeliveries = deliveries.filter((d) =>
    ['delivered', 'cancelled', 'failed'].includes(d.status)
  );

  const stats = getLivreurStats(deliveries);

  const value: DeliveryContextValue = {
    deliveries,
    livreurs,
    loading,
    stats,
    activeDeliveries,
    historyDeliveries,
    storeId: userProfile?.storeId || null,
  };

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
};

export default DeliveryContext;
