import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

/**
 * Add a new client
 */
export const addClient = async (storeId, clientData) => {
  try {
    const clientsRef = collection(db, 'stores', storeId, 'clients');
    const docRef = await addDoc(clientsRef, {
      name: clientData.name?.trim(),
      phone: clientData.phone?.trim() || '',
      email: clientData.email?.trim() || '',
      address: clientData.address?.trim() || '',
      totalDebt: 0,
      notes: clientData.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update a client
 */
export const updateClient = async (storeId, clientId, clientData) => {
  try {
    const clientRef = doc(db, 'stores', storeId, 'clients', clientId);
    await updateDoc(clientRef, {
      ...clientData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a client
 */
export const deleteClient = async (storeId, clientId) => {
  try {
    const clientRef = doc(db, 'stores', storeId, 'clients', clientId);
    await deleteDoc(clientRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get a single client
 */
export const getClient = async (storeId, clientId) => {
  try {
    const clientRef = doc(db, 'stores', storeId, 'clients', clientId);
    const docSnap = await getDoc(clientRef);
    if (docSnap.exists()) {
      return { success: true, client: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Client non trouvé' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all clients for a store
 */
export const getClients = async (storeId) => {
  try {
    const clientsRef = collection(db, 'stores', storeId, 'clients');
    const q = query(clientsRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, clients };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get clients with outstanding debts
 */
export const getClientsWithDebts = async (storeId) => {
  try {
    const clientsRef = collection(db, 'stores', storeId, 'clients');
    const q = query(clientsRef, where('totalDebt', '>', 0), orderBy('totalDebt', 'desc'));
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, clients };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update client total debt
 */
export const updateClientDebt = async (storeId, clientId, debtChange) => {
  try {
    const clientRef = doc(db, 'stores', storeId, 'clients', clientId);
    await updateDoc(clientRef, {
      totalDebt: increment(debtChange),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get debts for a specific client
 */
export const getClientDebts = async (storeId, clientId) => {
  try {
    const debtsRef = collection(db, 'stores', storeId, 'debts');
    const q = query(
      debtsRef,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, debts };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
