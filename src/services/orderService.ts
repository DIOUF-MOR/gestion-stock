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
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  items: OrderItem[];
  totalAmount: number;
  discount: number;
  notes?: string;
  status: OrderStatus;
  paymentMethod?: string;
  cancelReason?: string;
  assignedTo?: string;
  assignedToName?: string;
  storeId: string;
  createdAt?: any;
  updatedAt?: any;
  confirmedAt?: any;
  preparingAt?: any;
  readyAt?: any;
  inDeliveryAt?: any;
  deliveredAt?: any;
  cancelledAt?: any;
}

// ─── Create ────────────────────────────────────────────────────────────────

export const createOrder = async (
  storeId: string,
  order: Omit<Order, 'id' | 'storeId' | 'status' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const ref = await addDoc(collection(db, 'stores', storeId, 'orders'), {
      ...order,
      storeId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ─── Real-time subscriptions ───────────────────────────────────────────────

export const subscribeStoreOrders = (
  storeId: string,
  callback: (orders: Order[]) => void,
  onError?: (e: Error) => void
) =>
  onSnapshot(
    query(collection(db, 'stores', storeId, 'orders'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))),
    onError
  );

export const subscribeClientOrders = (
  storeId: string,
  clientId: string,
  callback: (orders: Order[]) => void,
  onError?: (e: Error) => void
) =>
  onSnapshot(
    query(
      collection(db, 'stores', storeId, 'orders'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))),
    onError
  );

// ─── Update status ─────────────────────────────────────────────────────────

export const updateOrderStatus = async (
  storeId: string,
  orderId: string,
  status: OrderStatus,
  extra?: Record<string, any>
) => {
  const timestamps: Record<string, any> = {};
  if (status === 'confirmed') timestamps.confirmedAt = serverTimestamp();
  if (status === 'preparing') timestamps.preparingAt = serverTimestamp();
  if (status === 'ready') timestamps.readyAt = serverTimestamp();
  if (status === 'in_delivery') timestamps.inDeliveryAt = serverTimestamp();
  if (status === 'delivered') timestamps.deliveredAt = serverTimestamp();
  if (status === 'cancelled') timestamps.cancelledAt = serverTimestamp();

  try {
    await updateDoc(doc(db, 'stores', storeId, 'orders', orderId), {
      status,
      ...timestamps,
      ...extra,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const cancelOrder = async (
  storeId: string,
  orderId: string,
  reason?: string
) =>
  updateOrderStatus(storeId, orderId, 'cancelled', { cancelReason: reason || '' });

// ─── Assign livreur ────────────────────────────────────────────────────────

export const assignOrderLivreur = async (
  storeId: string,
  orderId: string,
  livreurId: string,
  livreurName: string
) =>
  updateOrderStatus(storeId, orderId, 'in_delivery', {
    assignedTo: livreurId,
    assignedToName: livreurName,
  });

// ─── Delete ────────────────────────────────────────────────────────────────

export const deleteOrder = async (storeId: string, orderId: string) => {
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'orders', orderId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: string; description: string }
> = {
  pending: {
    label: 'En attente',
    color: '#F39C12',
    icon: 'time-outline',
    description: 'Votre commande est en attente de confirmation',
  },
  confirmed: {
    label: 'Confirmée',
    color: '#3498DB',
    icon: 'checkmark-circle-outline',
    description: 'Votre commande a été confirmée',
  },
  preparing: {
    label: 'En préparation',
    color: '#9B59B6',
    icon: 'construct-outline',
    description: 'Votre commande est en cours de préparation',
  },
  ready: {
    label: 'Prête',
    color: '#27AE60',
    icon: 'bag-check-outline',
    description: 'Votre commande est prête',
  },
  in_delivery: {
    label: 'En livraison',
    color: '#F18F01',
    icon: 'bicycle-outline',
    description: 'Votre commande est en route',
  },
  delivered: {
    label: 'Livrée',
    color: '#27AE60',
    icon: 'checkmark-done-circle-outline',
    description: 'Votre commande a été livrée',
  },
  cancelled: {
    label: 'Annulée',
    color: '#E74C3C',
    icon: 'close-circle-outline',
    description: 'Cette commande a été annulée',
  },
};

export const getOrderStatusLabel = (status: OrderStatus) =>
  ORDER_STATUS_CONFIG[status]?.label || status;

export const getOrderStatusColor = (status: OrderStatus) =>
  ORDER_STATUS_CONFIG[status]?.color || '#95A5A6';

export const getOrderStatusIcon = (status: OrderStatus) =>
  ORDER_STATUS_CONFIG[status]?.icon || 'ellipse-outline';

export const isActiveOrder = (status: OrderStatus) =>
  ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery'].includes(status);

export const getOrderStats = (orders: Order[]) => {
  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'pending').length;
  const active = orders.filter((o) => isActiveOrder(o.status)).length;
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const revenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + o.totalAmount, 0);
  return { total, pending, active, delivered, cancelled, revenue };
};
