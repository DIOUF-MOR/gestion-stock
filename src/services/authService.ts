import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  initializeAuth,
  inMemoryPersistence,
  getAuth,
} from 'firebase/auth';
import { initializeApp, getApp } from 'firebase/app';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  getFirestore,
} from 'firebase/firestore';
import { auth, db, PLANS, firebaseConfig } from '../../firebase.config';

/**
 * Secondary Firebase app used for creating livreur/client accounts without
 * disrupting the current vendor session.
 */
const getSecondaryAuth = () => {
  try {
    return getAuth(getApp('secondary'));
  } catch {
    const secondary = initializeApp(firebaseConfig, 'secondary');
    return initializeAuth(secondary, { persistence: inMemoryPersistence });
  }
};

/**
 * Firestore instance bound to the secondary app.
 * The secondary app's auth is signed in as the newly created user,
 * so writes to users/{uid} satisfy the "request.auth.uid == uid" rule.
 */
const getSecondaryDb = () => getFirestore(getApp('secondary'));

/**
 * Normalize phone number to +221XXXXXXXXX format
 */
export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('221')) return `+${digits}`;
  if (digits.startsWith('0')) return `+221${digits.slice(1)}`;
  return `+221${digits}`;
};

/**
 * Derive the Firebase Auth email:
 * - Real email if provided
 * - Otherwise a generated address from the phone number
 */
const getAuthEmail = (email: string, phone: string): string => {
  if (email?.trim()) return email.trim();
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return `${digits}@stockmanager.app`;
};

/**
 * Register a new vendor user
 * Phone is required. Email is optional.
 */
export const registerVendor = async ({ email, password, name, phone, storeName, storeAddress }) => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const realEmail = email?.trim() || '';
    const authEmail = getAuthEmail(realEmail, phone);

    // Create auth user (always uses authEmail)
    const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
    const { user } = userCredential;

    await updateProfile(user, { displayName: name });

    const storeRef = doc(collection(db, 'stores'));
    const storeId = storeRef.id;

    await setDoc(storeRef, {
      name: storeName || `Boutique de ${name}`,
      ownerId: user.uid,
      address: storeAddress || '',
      phone: normalizedPhone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'users', user.uid), {
      email: realEmail,       // real email (may be empty)
      authEmail,              // email used for Firebase Auth login
      name,
      phone: normalizedPhone,
      role: 'vendor',
      storeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    {
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

    // Send email verification only if user has a real email
    if (realEmail) {
      await sendEmailVerification(user);
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Login with phone number + password.
 * The auth email is derived deterministically from the phone number
 * (same logic as getAuthEmail), so no Firestore lookup is needed.
 * Vendors who registered with a real email should use loginWithEmail instead.
 */
export const loginWithPhone = async (phone: string, password: string) => {
  try {
    const digits = normalizePhone(phone).replace(/\D/g, '');
    const authEmail = `${digits}@stockmanager.app`;
    const result = await signInWithEmailAndPassword(auth, authEmail, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    // In newer Firebase SDK, auth/invalid-credential covers both
    // "user not found" and "wrong password" — keep message generic.
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-email'
    ) {
      return { success: false, error: 'Numéro de téléphone ou mot de passe incorrect.' };
    }
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Resend email verification to the current user
 */
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');
    await sendEmailVerification(user);
    return { success: true };
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

    // Keep savedPassword in sync so vendor can still reset after a self-change
    await updateDoc(doc(db, 'users', user.uid), {
      savedPassword: newPassword,
      updatedAt: serverTimestamp(),
    }).catch(() => {}); // non-blocking — don't fail the password change if this errors

    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Activate a client account so they can log in with phone + password.
 * Called by the vendor from the ClientPortalScreen.
 * Uses secondary auth so the vendor session is not disrupted.
 */
export const activateClientAccount = async ({
  clientId,
  storeId,
  phone,
  name,
  password,
}: {
  clientId: string;
  storeId: string;
  phone: string;
  name: string;
  password: string;
}) => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const authEmail = getAuthEmail('', phone);

    // Phone uniqueness is enforced by Firebase Auth (email-already-in-use).
    // A Firestore query would fail due to security rules requiring a storeId filter.
    const secondaryAuth = getSecondaryAuth();
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Ce client a déjà un compte actif.' };
      }
      throw authErr;
    }
    const { user } = userCredential;

    await updateProfile(user, { displayName: name });

    // Write users/{uid} using secondary Firestore (secondary auth = client, satisfies rules)
    const secondaryDb = getSecondaryDb();
    await setDoc(doc(secondaryDb, 'users', user.uid), {
      email: '',
      authEmail,
      name,
      phone: normalizedPhone,
      role: 'client',
      storeId,
      clientId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await signOut(secondaryAuth);

    // Mark the client record as activated using main auth (vendor is signed in)
    await updateDoc(doc(db, 'stores', storeId, 'clients', clientId), {
      isActivated: true,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    });

    return { success: true, userId: user.uid };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Register a new client (self-registration) linked to a store via storeId code.
 * Uses secondary auth so no existing vendor session is disrupted.
 */
export const registerClient = async ({ name, phone, address, storeId, password }) => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const authEmail = getAuthEmail('', phone);

    // Verify that the store exists
    const storeSnap = await getDoc(doc(db, 'stores', storeId));
    if (!storeSnap.exists()) {
      return { success: false, error: 'Code boutique invalide. Vérifiez le code fourni par votre vendeur.' };
    }

    const secondaryAuth = getSecondaryAuth();
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Ce numéro de téléphone est déjà utilisé.' };
      }
      throw authErr;
    }
    const { user } = userCredential!;

    await updateProfile(user, { displayName: name });

    // Write users/{uid} via secondary Firestore (secondary auth = new client)
    const secondaryDb = getSecondaryDb();
    await setDoc(doc(secondaryDb, 'users', user.uid), {
      email: '',
      authEmail,
      name,
      phone: normalizedPhone,
      address: address?.trim() || '',
      role: 'client',
      storeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await signOut(secondaryAuth);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Register an employee with app access (called by vendor).
 * Same secondary-auth pattern as registerLivreur.
 */
export const registerEmployee = async ({
  name, phone, password, storeId, employeeRole,
}: {
  name: string; phone: string; password: string; storeId: string; employeeRole: string;
}) => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const authEmail = getAuthEmail('', phone);

    const secondaryAuth = getSecondaryAuth();
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Ce numéro de téléphone est déjà utilisé.' };
      }
      throw authErr;
    }
    const { user } = userCredential!;

    await updateProfile(user, { displayName: name });

    const secondaryDb = getSecondaryDb();
    await setDoc(doc(secondaryDb, 'users', user.uid), {
      email: '',
      authEmail,
      name,
      phone: normalizedPhone,
      role: 'employee',
      employeeRole,
      storeId,
      isActive: true,
      savedPassword: password,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await signOut(secondaryAuth);

    return { success: true, employeeId: user.uid };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Reset an employee's password (called by vendor). Same pattern as resetLivreurPassword.
 */
export const resetEmployeePassword = async (employeeId: string, phone: string, newPassword: string) => {
  try {
    const userSnap = await getDoc(doc(db, 'users', employeeId));
    if (!userSnap.exists()) return { success: false, error: 'Employé introuvable.' };

    const savedPassword = userSnap.data().savedPassword;
    if (!savedPassword) {
      return { success: false, error: 'Aucun mot de passe enregistré. L\'employé doit modifier son mot de passe depuis son profil.' };
    }

    const authEmail = getAuthEmail('', phone);
    const secondaryAuth = getSecondaryAuth();

    let credential;
    try {
      credential = await signInWithEmailAndPassword(secondaryAuth, authEmail, savedPassword);
    } catch (authErr: any) {
      await signOut(secondaryAuth).catch(() => {});
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(authErr.code)) {
        return { success: false, error: 'Le mot de passe enregistré ne correspond plus. L\'employé doit d\'abord changer son mot de passe depuis son profil.' };
      }
      throw authErr;
    }

    await updatePassword(credential.user, newPassword);
    await signOut(secondaryAuth);

    await updateDoc(doc(db, 'users', employeeId), {
      savedPassword: newPassword,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Reset a livreur's password (called by vendor).
 * Reads the saved password from Firestore, signs in via secondary auth, then updates.
 * Also keeps savedPassword in sync for future resets.
 */
export const resetLivreurPassword = async (livreurId: string, phone: string, newPassword: string) => {
  try {
    // Fetch the last known password stored in Firestore
    const userSnap = await getDoc(doc(db, 'users', livreurId));
    if (!userSnap.exists()) return { success: false, error: 'Livreur introuvable.' };

    const savedPassword = userSnap.data().savedPassword;
    if (!savedPassword) {
      return {
        success: false,
        error: 'Aucun mot de passe enregistré. Le livreur doit modifier son mot de passe lui-même depuis son profil.',
      };
    }

    const authEmail = getAuthEmail('', phone);
    const secondaryAuth = getSecondaryAuth();

    let credential;
    try {
      credential = await signInWithEmailAndPassword(secondaryAuth, authEmail, savedPassword);
    } catch (authErr: any) {
      await signOut(secondaryAuth).catch(() => {});
      if (
        authErr.code === 'auth/invalid-credential' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/user-not-found'
      ) {
        return {
          success: false,
          error: 'Le mot de passe enregistré ne correspond plus. Le livreur doit d\'abord changer son mot de passe depuis son profil.',
        };
      }
      throw authErr;
    }

    await updatePassword(credential.user, newPassword);
    await signOut(secondaryAuth);

    // Keep savedPassword in sync for the next reset
    await updateDoc(doc(db, 'users', livreurId), {
      savedPassword: newPassword,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Register a new livreur (delivery person) for a store
 * Only called by a vendor. The livreur can login immediately with phone + password.
 */
export const registerLivreur = async ({ name, phone, password, storeId }) => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const authEmail = getAuthEmail('', phone);

    // Use secondary auth instance so vendor session is not disrupted
    // Phone uniqueness enforced by Firebase Auth (email-already-in-use)
    const secondaryAuth = getSecondaryAuth();
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Ce numéro de téléphone est déjà utilisé.' };
      }
      throw authErr;
    }
    const { user } = userCredential!;

    await updateProfile(user, { displayName: name });

    // Write users/{uid} using secondary Firestore (secondary auth = livreur, satisfies rules)
    const secondaryDb = getSecondaryDb();
    await setDoc(doc(secondaryDb, 'users', user.uid), {
      email: '',
      authEmail,
      name,
      phone: normalizedPhone,
      role: 'livreur',
      storeId,
      isActive: true,
      savedPassword: password,   // stored so vendor can reset without knowing current pwd
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Sign out from secondary app (vendor's session is unaffected)
    await signOut(secondaryAuth);

    return { success: true, livreurId: user.uid };
  } catch (error: any) {
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
