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
 * Add a new product to the store
 */
export const addProduct = async (storeId, productData) => {
  try {
    if (!storeId) throw new Error('storeId manquant — profil boutique non chargé.');
    const productsRef = collection(db, 'stores', storeId, 'products');
    const docRef = await addDoc(productsRef, {
      ...productData,
      name: productData.name?.trim(),
      category: productData.category?.trim() || 'Général',
      price: Number(productData.price) || 0,
      costPrice: Number(productData.costPrice) || 0,
      quantity: Number(productData.quantity) || 0,
      minQuantity: Number(productData.minQuantity) || 5,
      unit: productData.unit || 'unité',
      imageUrl: productData.imageUrl || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (storeId, productId, productData) => {
  try {
    const productRef = doc(db, 'stores', storeId, 'products', productId);
    await updateDoc(productRef, {
      ...productData,
      price: Number(productData.price) || 0,
      costPrice: Number(productData.costPrice) || 0,
      quantity: Number(productData.quantity) || 0,
      minQuantity: Number(productData.minQuantity) || 5,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (storeId, productId) => {
  try {
    const productRef = doc(db, 'stores', storeId, 'products', productId);
    await deleteDoc(productRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get a single product by ID
 */
export const getProduct = async (storeId, productId) => {
  try {
    const productRef = doc(db, 'stores', storeId, 'products', productId);
    const docSnap = await getDoc(productRef);
    if (docSnap.exists()) {
      return { success: true, product: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Produit non trouvé' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all products for a store
 */
export const getProducts = async (storeId, filters = {}) => {
  try {
    const productsRef = collection(db, 'stores', storeId, 'products');
    let q = query(productsRef, orderBy('name', 'asc'));

    if (filters.category) {
      q = query(productsRef, where('category', '==', filters.category), orderBy('name', 'asc'));
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, products };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update product quantity (e.g., after a sale)
 */
export const updateProductQuantity = async (storeId, productId, quantityChange) => {
  try {
    const productRef = doc(db, 'stores', storeId, 'products', productId);
    await updateDoc(productRef, {
      quantity: increment(quantityChange),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get products with low stock
 */
export const getLowStockProducts = async (storeId) => {
  try {
    const productsRef = collection(db, 'stores', storeId, 'products');
    const snapshot = await getDocs(productsRef);
    const products = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.quantity <= (p.minQuantity || 5));
    return { success: true, products };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all unique categories for a store
 */
export const getCategories = async (storeId) => {
  try {
    const productsRef = collection(db, 'stores', storeId, 'products');
    const snapshot = await getDocs(productsRef);
    const categories = [...new Set(
      snapshot.docs
        .map(doc => doc.data().category)
        .filter(Boolean)
    )].sort();
    return { success: true, categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Calculate total stock value
 */
export const getStockValue = async (storeId) => {
  try {
    const productsRef = collection(db, 'stores', storeId, 'products');
    const snapshot = await getDocs(productsRef);
    const totalValue = snapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + ((data.costPrice || 0) * (data.quantity || 0));
    }, 0);
    return { success: true, totalValue };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
