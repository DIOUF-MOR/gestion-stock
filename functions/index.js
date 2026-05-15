const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

const db = admin.firestore();

// ─── Expo Push API Helper ─────────────────────────────────────────────────────

/**
 * Send push notifications via Expo Push API
 * @param {Array<{to, title, body, data, sound, priority}>} messages
 */
const sendExpoPushNotifications = async (messages) => {
  try {
    const response = await fetch('https://exp.host/--/exponent-push-notification/api/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('sendExpoPushNotifications error:', error);
    throw error;
  }
};

/**
 * Get a user's Expo push token from Firestore
 */
const getUserPushToken = async (userId) => {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  return userDoc.data()?.expoPushToken || null;
};

// ─── Scheduled: Check expiring subscriptions ─────────────────────────────────

/**
 * Runs every day at 9:00 AM.
 * Finds subscriptions expiring in 3 days and sends push notification to vendors.
 */
exports.sendSubscriptionExpiryNotifications = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Africa/Abidjan')
  .onRun(async (context) => {
    functions.logger.info('Running sendSubscriptionExpiryNotifications');

    const now = new Date();
    // Check 3 days from now
    const targetDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);

    try {
      const subsSnapshot = await db.collection('subscriptions')
        .where('status', '==', 'active')
        .where('endDate', '>=', admin.firestore.Timestamp.fromDate(targetStart))
        .where('endDate', '<=', admin.firestore.Timestamp.fromDate(targetEnd))
        .get();

      if (subsSnapshot.empty) {
        functions.logger.info('No subscriptions expiring in 3 days');
        return null;
      }

      const messages = [];
      const pushPromises = [];

      for (const subDoc of subsSnapshot.docs) {
        const userId = subDoc.id;
        pushPromises.push(
          getUserPushToken(userId).then(token => {
            if (token) {
              messages.push({
                to: token,
                title: '⚠️ Abonnement bientôt expiré',
                body: 'Votre abonnement expire dans 3 jours. Renouvelez maintenant pour continuer à utiliser l\'application.',
                data: { type: 'subscription_expiry', daysLeft: 3 },
                sound: 'default',
                priority: 'high',
              });
            }
          })
        );
      }

      await Promise.all(pushPromises);

      if (messages.length > 0) {
        await sendExpoPushNotifications(messages);
        functions.logger.info(`Sent expiry notifications to ${messages.length} users`);
      }

      return null;
    } catch (error) {
      functions.logger.error('sendSubscriptionExpiryNotifications error:', error);
      throw error;
    }
  });

// ─── Trigger: New pending payment recorded ────────────────────────────────────

/**
 * Fires when a new pending payment is created.
 * Notifies the admin about the pending payment.
 */
exports.onNewPendingPayment = functions.firestore
  .document('pendingPayments/{paymentId}')
  .onCreate(async (snap, context) => {
    const payment = snap.data();
    functions.logger.info('New pending payment:', context.params.paymentId);

    try {
      // Get admin users to notify
      const adminSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .get();

      const messages = [];
      const pushPromises = [];

      for (const adminDoc of adminSnapshot.docs) {
        pushPromises.push(
          getUserPushToken(adminDoc.id).then(token => {
            if (token) {
              messages.push({
                to: token,
                title: '💳 Nouveau paiement en attente',
                body: `${payment.vendorName || 'Un vendeur'} a effectué un paiement de ${payment.amount || '?'} FCFA via ${payment.method || 'Mobile Money'}. Référence: ${payment.reference || '?'}`,
                data: { type: 'pending_payment', paymentId: context.params.paymentId },
                sound: 'default',
                priority: 'high',
              });
            }
          })
        );
      }

      await Promise.all(pushPromises);

      if (messages.length > 0) {
        await sendExpoPushNotifications(messages);
        functions.logger.info(`Notified ${messages.length} admins about pending payment`);
      }

      return null;
    } catch (error) {
      functions.logger.error('onNewPendingPayment error:', error);
      throw error;
    }
  });

// ─── Trigger: Payment confirmed by admin ──────────────────────────────────────

/**
 * Fires when a pending payment is updated (e.g. status changes to 'confirmed').
 * Notifies the vendor that their payment was confirmed and subscription activated.
 */
exports.onPaymentStatusChanged = functions.firestore
  .document('pendingPayments/{paymentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only act when status transitions to 'confirmed'
    if (before.status === after.status) return null;
    if (after.status !== 'confirmed') return null;

    functions.logger.info('Payment confirmed:', context.params.paymentId);

    const userId = after.userId;
    if (!userId) return null;

    try {
      const token = await getUserPushToken(userId);
      if (!token) return null;

      await sendExpoPushNotifications([{
        to: token,
        title: '✅ Paiement confirmé!',
        body: `Votre paiement de ${after.amount || '?'} FCFA a été confirmé. Votre abonnement ${after.plan || ''} est maintenant actif!`,
        data: { type: 'payment_confirmed', paymentId: context.params.paymentId },
        sound: 'default',
        priority: 'high',
      }]);

      functions.logger.info('Payment confirmation notification sent to vendor:', userId);
      return null;
    } catch (error) {
      functions.logger.error('onPaymentStatusChanged error:', error);
      throw error;
    }
  });

// ─── Trigger: Payment rejected ────────────────────────────────────────────────

/**
 * Notifies vendor when their payment is rejected
 */
exports.onPaymentRejected = functions.firestore
  .document('pendingPayments/{paymentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return null;
    if (after.status !== 'rejected') return null;

    functions.logger.info('Payment rejected:', context.params.paymentId);

    const userId = after.userId;
    if (!userId) return null;

    try {
      const token = await getUserPushToken(userId);
      if (!token) return null;

      await sendExpoPushNotifications([{
        to: token,
        title: '❌ Paiement rejeté',
        body: `Votre paiement de ${after.amount || '?'} FCFA a été rejeté. Raison: ${after.rejectReason || 'Non spécifiée'}. Veuillez contacter l'administrateur.`,
        data: { type: 'payment_rejected', paymentId: context.params.paymentId },
        sound: 'default',
        priority: 'high',
      }]);

      return null;
    } catch (error) {
      functions.logger.error('onPaymentRejected error:', error);
      throw error;
    }
  });

// ─── HTTP: Manually trigger low stock notification ───────────────────────────

/**
 * Can be called from the client to send a low stock push notification.
 * The client sends: { userId, productName, quantity }
 */
exports.onLowStock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentification requise');
  }

  const { userId, productName, quantity } = data;
  if (!userId || !productName) {
    throw new functions.https.HttpsError('invalid-argument', 'userId et productName requis');
  }

  try {
    const token = await getUserPushToken(userId);
    if (!token) {
      return { success: false, error: 'Aucun token push enregistré' };
    }

    const isOutOfStock = quantity === 0;
    await sendExpoPushNotifications([{
      to: token,
      title: isOutOfStock ? '🚨 Rupture de stock' : '⚠️ Stock bas',
      body: isOutOfStock
        ? `"${productName}" est en rupture de stock. Réapprovisionner immédiatement.`
        : `"${productName}" n'a plus que ${quantity} unité${quantity > 1 ? 's' : ''} en stock.`,
      data: { type: isOutOfStock ? 'out_of_stock' : 'low_stock', productName, quantity },
      sound: 'default',
      priority: 'high',
    }]);

    return { success: true };
  } catch (error) {
    functions.logger.error('onLowStock error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
