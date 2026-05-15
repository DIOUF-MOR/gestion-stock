import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  registerForPushNotifications,
  sendLowStockAlert,
  sendOutOfStockAlert,
  sendDebtReminderNotification,
  sendSubscriptionExpiryAlert,
  scheduleSubscriptionExpiryAlerts,
  saveNotificationToHistory,
} from '../services/notificationService';

const DEBT_DUE_DAYS_THRESHOLD = 3; // warn if debt due within 3 days

/**
 * useNotifications – registers push notifications, sets up listeners,
 * and schedules automatic alerts for low stock, debts, and subscription expiry.
 */
const useNotifications = () => {
  const { user, subscription, getSubscriptionDaysLeft, isAdmin } = useAuth();
  const { products, debts } = useStore();

  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const alertedProducts = useRef(new Set());
  const alertedDebts = useRef(new Set());
  const subscriptionAlertSent = useRef(false);

  // ── 1. Register for push notifications on mount ───────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    registerForPushNotifications(user.uid).catch(err => {
      console.warn('Push registration failed:', err);
    });

    // Notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (user?.uid) {
        saveNotificationToHistory(user.uid, {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        }).catch(() => {});
      }
    });

    // User tapped on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Navigation could be handled here if we expose a navigation ref
      console.log('Notification tapped:', data?.type);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.uid]);

  // ── 2. Low stock alerts ───────────────────────────────────────────────────
  useEffect(() => {
    if (!products || products.length === 0) return;
    if (isAdmin && isAdmin()) return; // admins don't need stock alerts

    products.forEach(product => {
      const key = product.id;
      if (alertedProducts.current.has(key)) return;

      if (product.quantity === 0) {
        alertedProducts.current.add(key);
        sendOutOfStockAlert(product.name).catch(() => {});
      } else if (product.quantity <= (product.minQuantity || 5)) {
        alertedProducts.current.add(key);
        sendLowStockAlert(product.name, product.quantity).catch(() => {});
      }
    });
  }, [products]);

  // ── 3. Debt due reminders ─────────────────────────────────────────────────
  useEffect(() => {
    if (!debts || debts.length === 0) return;
    if (isAdmin && isAdmin()) return;

    const now = new Date();
    const threshold = new Date(now.getTime() + DEBT_DUE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);

    debts.forEach(debt => {
      if (debt.isPaid) return;
      if (debt.type !== 'receivable') return;
      if (!debt.dueDate) return;
      if (alertedDebts.current.has(debt.id)) return;

      const dueDate = debt.dueDate?.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
      if (dueDate <= threshold && dueDate >= now) {
        alertedDebts.current.add(debt.id);
        sendDebtReminderNotification(
          debt.clientName || 'Client',
          debt.amount,
          dueDate
        ).catch(() => {});
      }
    });
  }, [debts]);

  // ── 4. Subscription expiry alerts ────────────────────────────────────────
  useEffect(() => {
    if (!subscription || subscriptionAlertSent.current) return;
    if (isAdmin && isAdmin()) return;

    const daysLeft = getSubscriptionDaysLeft();
    const endDate = subscription.endDate?.toDate
      ? subscription.endDate.toDate()
      : subscription.endDate ? new Date(subscription.endDate) : null;

    if (!endDate) return;

    if (daysLeft <= 7 && daysLeft > 0) {
      subscriptionAlertSent.current = true;
      sendSubscriptionExpiryAlert(daysLeft).catch(() => {});
    }

    // Also schedule future alerts if we haven't done so
    if (daysLeft > 1) {
      scheduleSubscriptionExpiryAlerts(endDate).catch(() => {});
    }
  }, [subscription]);

  // Reset alert caches when products/debts change significantly
  useEffect(() => {
    if (products.length === 0) alertedProducts.current = new Set();
  }, [products.length === 0]);

  useEffect(() => {
    if (debts.length === 0) alertedDebts.current = new Set();
  }, [debts.length === 0]);
};

export default useNotifications;
