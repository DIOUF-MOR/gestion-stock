import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase.config';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribeProfile = null;
    let unsubscribeSubscription = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Wait for BOTH profile and subscription before clearing the loading state.
        // Using local flags (not state) so they live in the closure without extra renders.
        let profileDone = false;
        let subscriptionDone = false;
        const trySetLoaded = () => {
          if (profileDone && subscriptionDone) setLoading(false);
        };

        // Listen to user profile changes
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          setUserProfile(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
          profileDone = true;
          trySetLoaded();
        }, (error) => {
          console.error('Error listening to user profile:', error);
          profileDone = true;
          trySetLoaded();
        });

        // Listen to subscription changes
        const subRef = doc(db, 'subscriptions', firebaseUser.uid);
        unsubscribeSubscription = onSnapshot(subRef, (docSnap) => {
          setSubscription(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
          subscriptionDone = true;
          trySetLoaded();
        }, (error) => {
          console.error('Error listening to subscription:', error);
          subscriptionDone = true;
          trySetLoaded();
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeSubscription) unsubscribeSubscription();
    };
  }, []);

  const isVendor = () => {
    return userProfile?.role === 'vendor';
  };

  const isLivreur = () => {
    return userProfile?.role === 'livreur';
  };

  const isClient = () => {
    return userProfile?.role === 'client';
  };

  const isEmployee = () => {
    return userProfile?.role === 'employee';
  };

  const getEmployeeRole = () => {
    return userProfile?.employeeRole || null;
  };

  const hasActiveSubscription = () => {
    if (isLivreur() || isClient() || isEmployee()) return true;
    if (!subscription) return false;

    const now = new Date();
    const endDate = subscription.endDate?.toDate
      ? subscription.endDate.toDate()
      : new Date(subscription.endDate);

    return subscription.status === 'active' && endDate > now;
  };

  const getSubscriptionDaysLeft = () => {
    if (!subscription || !subscription.endDate) return 0;

    const now = new Date();
    const endDate = subscription.endDate?.toDate
      ? subscription.endDate.toDate()
      : new Date(subscription.endDate);

    const diff = endDate - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserProfile({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  };

  const value = {
    user,
    userProfile,
    subscription,
    loading,
    authError,
    setAuthError,
    isVendor,
    isLivreur,
    isClient,
    isEmployee,
    getEmployeeRole,
    hasActiveSubscription,
    getSubscriptionDaysLeft,
    refreshUserProfile,
    reloadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
