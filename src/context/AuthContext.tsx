import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, ADMIN_EMAIL } from '../../firebase.config';

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

        // Listen to user profile changes
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = { id: docSnap.id, ...docSnap.data() };
            setUserProfile(profileData);
          } else {
            setUserProfile(null);
          }
        }, (error) => {
          console.error('Error listening to user profile:', error);
        });

        // Listen to subscription changes
        const subRef = doc(db, 'subscriptions', firebaseUser.uid);
        unsubscribeSubscription = onSnapshot(subRef, (docSnap) => {
          if (docSnap.exists()) {
            const subData = { id: docSnap.id, ...docSnap.data() };
            setSubscription(subData);
          } else {
            setSubscription(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to subscription:', error);
          setLoading(false);
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

  const isAdmin = () => {
    return userProfile?.role === 'admin' || user?.email === ADMIN_EMAIL;
  };

  const isVendor = () => {
    return userProfile?.role === 'vendor';
  };

  const isEmployee = () => {
    return userProfile?.role === 'employee';
  };

  const getEmployeeRole = () => {
    return userProfile?.employeeRole || null;
  };

  const hasActiveSubscription = () => {
    if (isAdmin()) return true;
    if (isEmployee()) return true;
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

  const value = {
    user,
    userProfile,
    subscription,
    loading,
    authError,
    setAuthError,
    isAdmin,
    isVendor,
    isEmployee,
    getEmployeeRole,
    hasActiveSubscription,
    getSubscriptionDaysLeft,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
