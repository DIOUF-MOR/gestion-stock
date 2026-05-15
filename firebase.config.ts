import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration
// Replace these values with your actual Firebase project credentials
export const firebaseConfig = {
  apiKey: "AIzaSyDmFRHhIM_8pSgHc1yhuhovFOQ4MWTyIHc",
  authDomain: "gestion-stock-e1fbd.firebaseapp.com",
  databaseURL: "https://gestion-stock-e1fbd-default-rtdb.firebaseio.com",
  projectId: "gestion-stock-e1fbd",
  storageBucket: "gestion-stock-e1fbd.firebasestorage.app",
  messagingSenderId: "743205734546",
  appId: "1:743205734546:web:140ccc72d5dc3d6591fe4b",
  // measurementId ignoré — Analytics non disponible en React Native
};

// Admin email - the user with this email will have admin access
export const ADMIN_EMAIL = "mor@admin.com";

// Subscription plans configuration
export const PLANS = {
  free: {
    id: "free",
    name: "Gratuit",
    price: 0,
    duration: 30,
    maxProducts: 50,
    maxClients: 20,
    maxEmployees: 5,
    features: [
      "Gestion de stock basique",
      "Jusqu'à 50 produits",
      "Jusqu'à 20 clients",
      "Jusqu'à 5 employés",
      "Tableau de bord simple",
    ],
  },
  basic: {
    id: "basic",
    name: "Basique",
    price: 9.99,
    duration: 30,
    maxProducts: 500,
    maxClients: 100,
    maxEmployees: 20,
    features: [
      "Tout du plan Gratuit",
      "Jusqu'à 500 produits",
      "Jusqu'à 100 clients",
      "Jusqu'à 20 employés",
      "Rapports financiers",
      "Gestion des dettes",
      "Support prioritaire",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 19.99,
    duration: 30,
    maxProducts: -1, // unlimited
    maxClients: -1,
    maxEmployees: -1,
    features: [
      "Tout du plan Basique",
      "Produits illimités",
      "Clients illimités",
      "Employés illimités",
      "Graphiques avancés",
      "Export de données",
      "Support 24/7",
      "Fonctionnalités avancées",
    ],
  },
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
