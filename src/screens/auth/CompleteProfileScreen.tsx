import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db, PLANS } from '../../../firebase.config';
import { colors } from '../../theme/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const CompleteProfileScreen = ({ route }) => {
  const { user } = route.params;
  const [form, setForm] = useState({
    name: '',
    storeName: '',
    storeAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.storeName.trim()) newErrors.storeName = 'Le nom de la boutique est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: form.name });

      const storeRef = doc(collection(db, 'stores'));
      const storeId = storeRef.id;

      await setDoc(storeRef, {
        name: form.storeName,
        ownerId: user.uid,
        address: form.storeAddress || '',
        phone: user.phoneNumber || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid), {
        name: form.name,
        phone: user.phoneNumber || '',
        email: user.email || '',
        role: 'vendor',
        storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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

      // AuthContext détecte automatiquement la connexion
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Complétez votre profil</Text>
          <Text style={styles.subtitle}>
            Quelques informations pour configurer votre boutique
          </Text>

          <Input
            label="Votre nom complet"
            value={form.name}
            onChangeText={(t) => updateField('name', t)}
            placeholder="Ex: Moussa Diallo"
            error={errors.name}
          />

          <Input
            label="Nom de votre boutique"
            value={form.storeName}
            onChangeText={(t) => updateField('storeName', t)}
            placeholder="Ex: Boutique Diallo"
            error={errors.storeName}
          />

          <Input
            label="Adresse (optionnel)"
            value={form.storeAddress}
            onChangeText={(t) => updateField('storeAddress', t)}
            placeholder="Ex: Marché Sandaga, Dakar"
          />

          <Button
            title="Terminer l'inscription"
            onPress={handleComplete}
            loading={loading}
            style={styles.btn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 40 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  btn: { marginTop: 16 },
});

export default CompleteProfileScreen;
