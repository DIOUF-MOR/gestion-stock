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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

/**
 * Add a new employee
 */
export const addEmployee = async (storeId, employeeData) => {
  try {
    const employeesRef = collection(db, 'stores', storeId, 'employees');
    const docRef = await addDoc(employeesRef, {
      name: employeeData.name?.trim(),
      phone: employeeData.phone?.trim() || '',
      email: employeeData.email?.trim() || '',
      role: employeeData.role?.trim() || 'Employé',
      salary: Number(employeeData.salary) || 0,
      startDate: employeeData.startDate || new Date().toISOString(),
      address: employeeData.address?.trim() || '',
      notes: employeeData.notes?.trim() || '',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update an employee
 */
export const updateEmployee = async (storeId, employeeId, employeeData) => {
  try {
    const employeeRef = doc(db, 'stores', storeId, 'employees', employeeId);
    await updateDoc(employeeRef, {
      ...employeeData,
      salary: Number(employeeData.salary) || 0,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete an employee
 */
export const deleteEmployee = async (storeId, employeeId) => {
  try {
    const employeeRef = doc(db, 'stores', storeId, 'employees', employeeId);
    await deleteDoc(employeeRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get a single employee
 */
export const getEmployee = async (storeId, employeeId) => {
  try {
    const employeeRef = doc(db, 'stores', storeId, 'employees', employeeId);
    const docSnap = await getDoc(employeeRef);
    if (docSnap.exists()) {
      return { success: true, employee: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Employé non trouvé' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all employees for a store
 */
export const getEmployees = async (storeId) => {
  try {
    const employeesRef = collection(db, 'stores', storeId, 'employees');
    const q = query(employeesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, employees };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Toggle employee active status
 */
export const toggleEmployeeStatus = async (storeId, employeeId, isActive) => {
  try {
    const employeeRef = doc(db, 'stores', storeId, 'employees', employeeId);
    await updateDoc(employeeRef, {
      isActive,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Calculate total salary expenses
 */
export const getTotalSalaries = async (storeId) => {
  try {
    const employeesRef = collection(db, 'stores', storeId, 'employees');
    const snapshot = await getDocs(employeesRef);
    const totalSalaries = snapshot.docs
      .filter(doc => doc.data().isActive !== false)
      .reduce((sum, doc) => sum + (doc.data().salary || 0), 0);
    return { success: true, totalSalaries };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
