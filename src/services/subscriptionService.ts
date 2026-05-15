import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, PLANS } from '../../firebase.config';

/**
 * Get subscription for a user
 */
export const getSubscription = async (userId) => {
  try {
    const subRef = doc(db, 'subscriptions', userId);
    const docSnap = await getDoc(subRef);
    if (docSnap.exists()) {
      return { success: true, subscription: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Abonnement non trouvé' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create or update a subscription (admin action)
 */
export const setSubscription = async (userId, planId, paymentMethod, amount) => {
  try {
    const plan = PLANS[planId];
    if (!plan) throw new Error('Plan invalide');

    const now = new Date();
    const endDate = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    await setDoc(doc(db, 'subscriptions', userId), {
      plan: planId,
      status: 'active',
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(endDate),
      paymentMethod: paymentMethod || 'Espèces',
      amount: amount || plan.price,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Cancel a subscription (admin action)
 */
export const cancelSubscription = async (userId) => {
  try {
    const subRef = doc(db, 'subscriptions', userId);
    await updateDoc(subRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Extend a subscription (admin action)
 */
export const extendSubscription = async (userId, days) => {
  try {
    const subRef = doc(db, 'subscriptions', userId);
    const docSnap = await getDoc(subRef);

    if (!docSnap.exists()) throw new Error('Abonnement non trouvé');

    const currentData = docSnap.data();
    const currentEndDate = currentData.endDate?.toDate
      ? currentData.endDate.toDate()
      : new Date(currentData.endDate);

    const now = new Date();
    const baseDate = currentEndDate > now ? currentEndDate : now;
    const newEndDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await updateDoc(subRef, {
      status: 'active',
      endDate: Timestamp.fromDate(newEndDate),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Check if subscription is active
 */
export const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;

  const endDate = subscription.endDate?.toDate
    ? subscription.endDate.toDate()
    : new Date(subscription.endDate);

  return endDate > new Date();
};

/**
 * Get subscription limits for a plan
 */
export const getPlanLimits = (planId) => {
  return PLANS[planId] || PLANS.free;
};

/**
 * Check if vendor can add more products
 */
export const canAddProduct = (subscription, currentCount) => {
  const plan = PLANS[subscription?.plan] || PLANS.free;
  if (plan.maxProducts === -1) return true;
  return currentCount < plan.maxProducts;
};

/**
 * Check if vendor can add more clients
 */
export const canAddClient = (subscription, currentCount) => {
  const plan = PLANS[subscription?.plan] || PLANS.free;
  if (plan.maxClients === -1) return true;
  return currentCount < plan.maxClients;
};

/**
 * Check if vendor can add more employees
 */
export const canAddEmployee = (subscription, currentCount) => {
  const plan = PLANS[subscription?.plan] || PLANS.free;
  if (plan.maxEmployees === -1) return true;
  return currentCount < plan.maxEmployees;
};

// =================== PAYMENTS ===================

/**
 * Record a payment (admin action)
 */
export const recordPayment = async (userId, paymentData) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const docRef = await addDoc(paymentsRef, {
      userId,
      amount: Number(paymentData.amount) || 0,
      plan: paymentData.plan,
      method: paymentData.method || 'Espèces',
      date: paymentData.date
        ? Timestamp.fromDate(new Date(paymentData.date))
        : serverTimestamp(),
      status: 'completed',
      reference: paymentData.reference?.trim() || '',
      notes: paymentData.notes?.trim() || '',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all payments (admin)
 */
export const getAllPayments = async () => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, payments };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get payments for a specific user
 */
export const getUserPayments = async (userId) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, payments };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all vendors with their subscriptions (admin)
 */
export const getAllVendorsWithSubscriptions = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'vendor'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const vendors = await Promise.all(
      snapshot.docs.map(async (userDoc) => {
        const userData = { id: userDoc.id, ...userDoc.data() };
        const subRef = doc(db, 'subscriptions', userDoc.id);
        const subSnap = await getDoc(subRef);
        const subscription = subSnap.exists()
          ? { id: subSnap.id, ...subSnap.data() }
          : null;
        return { ...userData, subscription };
      })
    );

    return { success: true, vendors };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get admin stats
 */
export const getAdminStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const vendorsQuery = query(usersRef, where('role', '==', 'vendor'));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    const totalVendors = vendorsSnapshot.size;

    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    const payments = paymentsSnapshot.docs.map(doc => doc.data());
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Count active subscriptions
    let activeSubscriptions = 0;
    const subsRef = collection(db, 'subscriptions');
    const subsSnapshot = await getDocs(subsRef);
    const now = new Date();
    subsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
      if (data.status === 'active' && endDate > now) {
        activeSubscriptions++;
      }
    });

    return {
      success: true,
      stats: {
        totalVendors,
        activeSubscriptions,
        totalRevenue,
        totalPayments: payments.length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
