import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { auth, db, ADMIN_EMAIL, PLANS } from '../../firebase.config';

/**
 * Register a new vendor user
 */
export const registerVendor = async ({ email, password, name, phone, storeName, storeAddress }) => {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Update display name
    await updateProfile(user, { displayName: name });

    // Create store document
    const storeRef = doc(collection(db, 'stores'));
    const storeId = storeRef.id;

    await setDoc(storeRef, {
      name: storeName || `Boutique de ${name}`,
      ownerId: user.uid,
      address: storeAddress || '',
      phone: phone || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Determine role
    const role = email === ADMIN_EMAIL ? 'admin' : 'vendor';

    // Create user document
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      phone: phone || '',
      role,
      storeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create free subscription for vendors
    if (role === 'vendor') {
      const now = new Date();
      const endDate = new Date(now.getTime() + PLANS.free.duration * 24 * 60 * 60 * 1000);

      await setDoc(doc(db, 'subscriptions', user.uid), {
        plan: 'free',
        status: 'active',
        startDate: serverTimestamp(),
        endDate,
        paymentMethod: null,
        amount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Login with email and password
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Logout current user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    // Update display name in auth if name changed
    if (data.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.name });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Change user password
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return { success: true, profile: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Profil non trouvé' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Map Firebase auth error codes to French messages
 */
const getAuthErrorMessage = (code) => {
  const messages = {
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
    'auth/invalid-email': 'Adresse email invalide.',
    'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/network-request-failed': 'Erreur de connexion réseau.',
    'auth/user-disabled': 'Ce compte a été désactivé.',
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/operation-not-allowed': 'Opération non autorisée.',
    'auth/requires-recent-login': 'Veuillez vous reconnecter pour effectuer cette action.',
  };
  return messages[code] || 'Une erreur est survenue. Veuillez réessayer.';
};
