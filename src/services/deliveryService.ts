import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface DeliveryProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface Delivery {
  id?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  products: DeliveryProduct[];
  totalAmount: number;
  status: DeliveryStatus;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: any;
  startedAt?: any;
  deliveredAt?: any;
  cancelledAt?: any;
  failedAt?: any;
  notes?: string;
  livreurNotes?: string;
  storeId: string;
  createdAt?: any;
  updatedAt?: any;
}

// ─── Create ────────────────────────────────────────────────────────────────

export const createDelivery = async (
  storeId: string,
  delivery: Omit<Delivery, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const ref = await addDoc(collection(db, 'stores', storeId, 'deliveries'), {
      ...delivery,
      storeId,
      status: delivery.assignedTo ? 'assigned' : 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ─── Read ──────────────────────────────────────────────────────────────────

export const getDelivery = async (storeId: string, deliveryId: string) => {
  try {
    const snap = await getDoc(doc(db, 'stores', storeId, 'deliveries', deliveryId));
    if (!snap.exists()) return { success: false, error: 'Livraison introuvable' };
    return { success: true, delivery: { id: snap.id, ...snap.data() } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getDeliveries = async (storeId: string) => {
  try {
    const snap = await getDocs(
      query(collection(db, 'stores', storeId, 'deliveries'), orderBy('createdAt', 'desc'))
    );
    return {
      success: true,
      deliveries: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getLivreurDeliveries = async (storeId: string, livreurId: string) => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'stores', storeId, 'deliveries'),
        where('assignedTo', '==', livreurId),
        orderBy('createdAt', 'desc')
      )
    );
    return {
      success: true,
      deliveries: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ─── Real-time subscriptions ───────────────────────────────────────────────

export const subscribeStoreDeliveries = (
  storeId: string,
  callback: (deliveries: Delivery[]) => void,
  onError?: (error: Error) => void
) => {
  return onSnapshot(
    query(collection(db, 'stores', storeId, 'deliveries'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery))),
    onError
  );
};

export const subscribeLivreurDeliveries = (
  storeId: string,
  livreurId: string,
  callback: (deliveries: Delivery[]) => void,
  onError?: (error: Error) => void
) => {
  return onSnapshot(
    query(
      collection(db, 'stores', storeId, 'deliveries'),
      where('assignedTo', '==', livreurId),
      orderBy('createdAt', 'desc')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery))),
    onError
  );
};

// ─── Update ────────────────────────────────────────────────────────────────

export const updateDelivery = async (
  storeId: string,
  deliveryId: string,
  data: Partial<Delivery>
) => {
  try {
    await updateDoc(doc(db, 'stores', storeId, 'deliveries', deliveryId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateDeliveryStatus = async (
  storeId: string,
  deliveryId: string,
  status: DeliveryStatus,
  extra?: Record<string, any>
) => {
  const timestamps: Record<string, any> = {};
  if (status === 'in_progress') timestamps.startedAt = serverTimestamp();
  if (status === 'delivered') timestamps.deliveredAt = serverTimestamp();
  if (status === 'cancelled') timestamps.cancelledAt = serverTimestamp();
  if (status === 'failed') timestamps.failedAt = serverTimestamp();

  return updateDelivery(storeId, deliveryId, { status, ...timestamps, ...extra });
};

export const assignDelivery = async (
  storeId: string,
  deliveryId: string,
  livreurId: string,
  livreurName: string
) => {
  return updateDelivery(storeId, deliveryId, {
    assignedTo: livreurId,
    assignedToName: livreurName,
    assignedAt: serverTimestamp() as any,
    status: 'assigned',
  });
};

// ─── Delete ────────────────────────────────────────────────────────────────

export const deleteDelivery = async (storeId: string, deliveryId: string) => {
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'deliveries', deliveryId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ─── Livreurs (stored as users with role='livreur') ───────────────────────

export const getStoreLivreurs = async (storeId: string) => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('storeId', '==', storeId),
        where('role', '==', 'livreur')
      )
    );
    return {
      success: true,
      livreurs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const subscribeStoreLivreurs = (
  storeId: string,
  callback: (livreurs: any[]) => void
) => {
  return onSnapshot(
    query(
      collection(db, 'users'),
      where('storeId', '==', storeId),
      where('role', '==', 'livreur')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    assigned: 'Assignée',
    in_progress: 'En cours',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    failed: 'Échouée',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    pending: '#F39C12',
    assigned: '#3498DB',
    in_progress: '#9B59B6',
    delivered: '#27AE60',
    cancelled: '#95A5A6',
    failed: '#E74C3C',
  };
  return map[status] || '#95A5A6';
};

export const getStatusIcon = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'time-outline',
    assigned: 'person-outline',
    in_progress: 'bicycle-outline',
    delivered: 'checkmark-circle-outline',
    cancelled: 'close-circle-outline',
    failed: 'alert-circle-outline',
  };
  return map[status] || 'ellipse-outline';
};

export const getLivreurStats = (deliveries: Delivery[]) => {
  const total = deliveries.length;
  const delivered = deliveries.filter((d) => d.status === 'delivered').length;
  const pending = deliveries.filter((d) =>
    ['pending', 'assigned'].includes(d.status)
  ).length;
  const inProgress = deliveries.filter((d) => d.status === 'in_progress').length;
  const failed = deliveries.filter((d) => d.status === 'failed').length;
  const cancelled = deliveries.filter((d) => d.status === 'cancelled').length;
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDeliveries = deliveries.filter((d) => {
    const ts = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
    return ts >= today;
  });
  const todayDelivered = todayDeliveries.filter((d) => d.status === 'delivered').length;

  return {
    total,
    delivered,
    pending,
    inProgress,
    failed,
    cancelled,
    successRate,
    todayTotal: todayDeliveries.length,
    todayDelivered,
  };
};
