import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.config';

// Configure notification handler (how notifications appear when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permissions and register for push notifications.
 * Saves the Expo push token to the user's Firestore document.
 */
export const registerForPushNotifications = async (userId) => {
  try {
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return { success: false, error: 'Appareil physique requis' };
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { success: false, error: 'Permission refusée pour les notifications' };
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications générales',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E86AB',
      });
      await Notifications.setNotificationChannelAsync('stock', {
        name: 'Alertes de stock',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F39C12',
      });
      await Notifications.setNotificationChannelAsync('finance', {
        name: 'Alertes financières',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#27AE60',
      });
    }

    // Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenResponse.data;

    // Save token to Firestore if userId provided
    if (userId && pushToken) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushToken: pushToken,
        pushNotificationsEnabled: true,
        tokenUpdatedAt: serverTimestamp(),
      }).catch(() => {
        // User doc might not exist yet; try setDoc instead
      });
    }

    return { success: true, token: pushToken };
  } catch (error) {
    console.error('registerForPushNotifications error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule an immediate local notification
 */
export const scheduleLocalNotification = async (title, body, data = {}, channelId = 'default') => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: null, // immediate
    });
    return { success: true, id };
  } catch (error) {
    console.error('scheduleLocalNotification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule a notification at a specific future time
 */
export const scheduleNotificationAt = async (title, body, date, data = {}, channelId = 'default') => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: { type: 'date' as const, date },
    });
    return { success: true, id };
  } catch (error) {
    console.error('scheduleNotificationAt error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send low stock alert notification
 */
export const sendLowStockAlert = async (productName, quantity) => {
  return scheduleLocalNotification(
    '⚠️ Stock bas – Action requise',
    `"${productName}" n'a plus que ${quantity} unité${quantity > 1 ? 's' : ''} en stock.`,
    { type: 'low_stock', productName, quantity },
    'stock'
  );
};

/**
 * Send out-of-stock alert notification
 */
export const sendOutOfStockAlert = async (productName) => {
  return scheduleLocalNotification(
    '🚨 Rupture de stock',
    `"${productName}" est en rupture de stock. Réapprovisionner immédiatement.`,
    { type: 'out_of_stock', productName },
    'stock'
  );
};

/**
 * Send debt reminder notification
 */
export const sendDebtReminderNotification = async (clientName, amount, dueDate) => {
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(amount);
  const formattedDate = dueDate
    ? new Date(dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'bientôt';

  return scheduleLocalNotification(
    '💰 Rappel de créance',
    `${clientName} doit ${formattedAmount} FCFA. Échéance: ${formattedDate}.`,
    { type: 'debt_reminder', clientName, amount, dueDate },
    'finance'
  );
};

/**
 * Schedule subscription expiry alerts (7, 3, 1 day before)
 */
export const scheduleSubscriptionExpiryAlerts = async (expiryDate) => {
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const now = new Date();
  const scheduledIds = [];

  const thresholds = [
    { days: 7, label: '7 jours' },
    { days: 3, label: '3 jours' },
    { days: 1, label: 'demain' },
  ];

  for (const { days, label } of thresholds) {
    const alertDate = new Date(expiry.getTime() - days * 24 * 60 * 60 * 1000);
    if (alertDate > now) {
      const result = await scheduleNotificationAt(
        '📅 Abonnement bientôt expiré',
        `Votre abonnement expire dans ${label}. Renouvelez maintenant pour continuer à utiliser l'application.`,
        alertDate,
        { type: 'subscription_expiry', daysLeft: days }
      );
      if (result.success) scheduledIds.push(result.id);
    }
  }

  return { success: true, ids: scheduledIds };
};

/**
 * Send an immediate subscription expiry warning (when already close)
 */
export const sendSubscriptionExpiryAlert = async (daysLeft) => {
  const urgency = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '📅';
  const dayText = daysLeft === 0 ? 'expire aujourd\'hui' : `expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
  return scheduleLocalNotification(
    `${urgency} Abonnement – ${dayText}`,
    `Renouvelez votre abonnement pour continuer à profiter de toutes les fonctionnalités.`,
    { type: 'subscription_expiry', daysLeft }
  );
};

/**
 * Cancel all scheduled and delivered notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Cancel a specific notification by ID
 */
export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Save notification to Firestore history
 */
export const saveNotificationToHistory = async (userId, notification) => {
  try {
    const ref = collection(db, 'notifications', userId, 'messages');
    await addDoc(ref, {
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      readAt: null,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
