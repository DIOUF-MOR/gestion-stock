import { Linking } from 'react-native';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, PLANS } from '../../firebase.config';
import { setSubscription } from './subscriptionService';

// ─── Reference generator ──────────────────────────────────────────────────────

/**
 * Generate a unique payment reference (e.g. SM-20260515-A3F7)
 */
export const generatePaymentReference = () => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SM-${dateStr}-${rand}`;
};

// ─── Mobile money launchers ───────────────────────────────────────────────────

/**
 * Initiate Orange Money payment via USSD deep link
 * USSD format: *144*1*{phone}*{amount}#
 */
export const initiateOrangeMoneyPayment = async (amount, phoneNumber, reference) => {
  try {
    // Clean phone number (remove spaces, dashes, +)
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    // USSD code for Orange Money transfer
    const ussdCode = `*144*1*${cleanPhone}*${amount}%23`;
    const url = `tel:${ussdCode}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return { success: true, method: 'ussd', url };
    } else {
      // Fallback: open Orange Money web/app
      const webUrl = `https://orangemoney.orange.com/`;
      await Linking.openURL(webUrl);
      return { success: true, method: 'web', url: webUrl };
    }
  } catch (error) {
    console.error('initiateOrangeMoneyPayment error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initiate Wave payment via deep link / web link
 */
export const initiateWavePayment = async (amount, phoneNumber, reference) => {
  try {
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    // Wave deep link (if Wave app is installed, it opens it)
    const waveDeepLink = `wave://send?to=${cleanPhone}&amount=${amount}&note=StockManager%20${reference}`;
    const waveWebLink = `https://wave.com/send?to=${cleanPhone}&amount=${amount}`;

    const canOpenDeep = await Linking.canOpenURL(waveDeepLink);
    if (canOpenDeep) {
      await Linking.openURL(waveDeepLink);
      return { success: true, method: 'deeplink', url: waveDeepLink };
    } else {
      await Linking.openURL(waveWebLink);
      return { success: true, method: 'web', url: waveWebLink };
    }
  } catch (error) {
    console.error('initiateWavePayment error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initiate Airtel Money payment via USSD
 * USSD format varies by country; generic: *778*{amount}*{phone}#
 */
export const initiateAirtelMoneyPayment = async (amount, phoneNumber, reference) => {
  try {
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    const ussdCode = `*778*${amount}*${cleanPhone}%23`;
    const url = `tel:${ussdCode}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
    return { success: true, method: 'ussd', url };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Initiate MTN Mobile Money payment via USSD
 * Generic MTN MoMo USSD: *165*amount*phone#
 */
export const initiateMTNMoMoPayment = async (amount, phoneNumber, reference) => {
  try {
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    const ussdCode = `*165*${amount}*${cleanPhone}%23`;
    const url = `tel:${ussdCode}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
    return { success: true, method: 'ussd', url };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Generic mobile money handler
 */
export const initiateMobileMoneyPayment = async (provider, amount, phoneNumber, reference) => {
  switch (provider) {
    case 'orange_money':
      return initiateOrangeMoneyPayment(amount, phoneNumber, reference);
    case 'wave':
      return initiateWavePayment(amount, phoneNumber, reference);
    case 'airtel_money':
      return initiateAirtelMoneyPayment(amount, phoneNumber, reference);
    case 'mtn_momo':
      return initiateMTNMoMoPayment(amount, phoneNumber, reference);
    default:
      return { success: false, error: 'Opérateur non reconnu' };
  }
};

// ─── USSD codes & instructions per provider ───────────────────────────────────

export const PAYMENT_PROVIDERS = {
  orange_money: {
    id: 'orange_money',
    name: 'Orange Money',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Orange_logo.svg/1200px-Orange_logo.svg.png',
    color: '#FF6600',
    emoji: '🟠',
    ussd: '*144*1*{phone}*{amount}#',
    instructions: [
      'Composez le code USSD: *144*1*{phone}*{amount}#',
      'Entrez votre code PIN Orange Money',
      'Confirmez le transfert',
      'Conservez le SMS de confirmation',
      'Cliquez "J\'ai effectué le paiement" ci-dessous',
    ],
  },
  wave: {
    id: 'wave',
    name: 'Wave',
    icon: null,
    color: '#1CC8F5',
    emoji: '🌊',
    ussd: null,
    instructions: [
      'Ouvrez votre application Wave',
      'Appuyez sur "Envoyer de l\'argent"',
      'Entrez le numéro: {phone}',
      'Entrez le montant: {amount} FCFA',
      'Mettez la référence: {reference} dans le message',
      'Confirmez le paiement',
      'Cliquez "J\'ai effectué le paiement" ci-dessous',
    ],
  },
  airtel_money: {
    id: 'airtel_money',
    name: 'Airtel Money',
    icon: null,
    color: '#E40000',
    emoji: '🔴',
    ussd: '*778*{amount}*{phone}#',
    instructions: [
      'Composez le code USSD: *778*{amount}*{phone}#',
      'Entrez votre code PIN Airtel Money',
      'Confirmez le transfert',
      'Conservez le SMS de confirmation',
      'Cliquez "J\'ai effectué le paiement" ci-dessous',
    ],
  },
  mtn_momo: {
    id: 'mtn_momo',
    name: 'MTN MoMo',
    icon: null,
    color: '#FFCC00',
    emoji: '🟡',
    ussd: '*165*{amount}*{phone}#',
    instructions: [
      'Composez le code USSD: *165*{amount}*{phone}#',
      'Entrez votre code PIN MTN MoMo',
      'Confirmez le transfert',
      'Conservez le SMS de confirmation',
      'Cliquez "J\'ai effectué le paiement" ci-dessous',
    ],
  },
  bank_transfer: {
    id: 'bank_transfer',
    name: 'Virement bancaire',
    icon: null,
    color: '#2E86AB',
    emoji: '🏦',
    ussd: null,
    instructions: [
      'Effectuez un virement vers le compte suivant:',
      'Banque: Banque Nationale de Commerce',
      'Titulaire: StockManager SARL',
      'IBAN: BJ00 XXXX XXXX XXXX XXXX XXXX',
      'Référence: {reference}',
      'Montant: {amount} FCFA',
      'Cliquez "J\'ai effectué le paiement" ci-dessous',
    ],
  },
  cash: {
    id: 'cash',
    name: 'Espèces',
    icon: null,
    color: '#27AE60',
    emoji: '💵',
    ussd: null,
    instructions: [
      'Rendez-vous dans nos bureaux:',
      'StockManager – Siège social',
      'Horaires: Lun-Ven 8h-18h',
      'Montant à payer: {amount} FCFA',
      'Référence: {reference}',
      'Un reçu vous sera remis',
    ],
  },
};

// Admin account where mobile money should be sent
export const ADMIN_PAYMENT_PHONE = '+225 07 00 00 00 00'; // Replace with real number

// ─── Firestore operations ─────────────────────────────────────────────────────

/**
 * Save a pending payment record to Firestore
 */
export const savePaymentRecord = async (userId, amount, plan, method, reference, vendorName = '') => {
  try {
    const paymentData = {
      userId,
      vendorName,
      amount: Number(amount),
      plan,
      method,
      reference,
      status: 'pending',
      adminNote: '',
      rejectReason: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'pendingPayments'), paymentData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('savePaymentRecord error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin: Confirm a pending payment → activate/extend subscription
 */
export const verifyPaymentManually = async (paymentId, adminNote = '') => {
  try {
    const paymentRef = doc(db, 'pendingPayments', paymentId);
    const paymentSnap = await getDoc(paymentRef);

    if (!paymentSnap.exists()) {
      return { success: false, error: 'Paiement non trouvé' };
    }

    const payment = paymentSnap.data();
    const { userId, plan, method, amount } = payment;

    // Activate subscription
    const subResult = await setSubscription(userId, plan, method, amount);
    if (!subResult.success) {
      return { success: false, error: subResult.error };
    }

    // Update payment status
    await updateDoc(paymentRef, {
      status: 'confirmed',
      adminNote,
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Also record in the main payments collection
    await addDoc(collection(db, 'payments'), {
      userId,
      amount: Number(amount),
      plan,
      method,
      reference: payment.reference,
      status: 'completed',
      pendingPaymentId: paymentId,
      notes: adminNote,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('verifyPaymentManually error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin: Reject a pending payment
 */
export const rejectPayment = async (paymentId, reason = '') => {
  try {
    const paymentRef = doc(db, 'pendingPayments', paymentId);
    await updateDoc(paymentRef, {
      status: 'rejected',
      rejectReason: reason,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all pending payments (admin)
 */
export const getPendingPayments = async () => {
  try {
    const q = query(
      collection(db, 'pendingPayments'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, payments };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get payment history for a specific user
 */
export const getPaymentHistory = async (userId) => {
  try {
    const q = query(
      collection(db, 'pendingPayments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, payments };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Real-time listener on a single pending payment (for vendor to watch confirmation)
 */
export const listenToPayment = (paymentId, callback) => {
  const paymentRef = doc(db, 'pendingPayments', paymentId);
  return onSnapshot(paymentRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
};

/**
 * Real-time listener on all pending payments (admin)
 */
export const listenToPendingPayments = (callback) => {
  const q = query(
    collection(db, 'pendingPayments'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(payments);
  });
};
