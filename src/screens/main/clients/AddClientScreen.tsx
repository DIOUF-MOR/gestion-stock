import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { addClient, updateClient } from '../../../services/clientService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

const AddClientScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const editClient = route.params?.client;
  const isEditing = !!editClient;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editClient) {
      setForm({
        name: editClient.name || '',
        phone: editClient.phone || '',
        email: editClient.email || '',
        address: editClient.address || '',
        notes: editClient.notes || '',
      });
    }
  }, [editClient]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Email invalide';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await updateClient(storeId, editClient.id, form);
      } else {
        result = await addClient(storeId, form);
      }

      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? 'Modifier le client' : 'Nouveau client'}
        subtitle={isEditing ? 'Mettre à jour les informations' : 'Enregistrer un nouveau client'}
        onBack={() => navigation.goBack()}
        accentColor={colors.secondary}
        showShadow
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations client</Text>

            <Input
              label="Nom complet *"
              value={form.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Jean Dupont"
              autoCapitalize="words"
              error={errors.name}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Téléphone"
              value={form.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
              leftIcon={
                <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Email"
              value={form.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="jean@exemple.com"
              keyboardType="email-address"
              error={errors.email}
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Adresse"
              value={form.address}
              onChangeText={(text) => updateField('address', text)}
              placeholder="Adresse du client"
              autoCapitalize="sentences"
              leftIcon={
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Notes"
              value={form.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder="Notes sur ce client..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              leftIcon={
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              }
            />
          </View>

          <Button
            title={isEditing ? 'Enregistrer les modifications' : 'Ajouter le client'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  submitButton: {
    marginBottom: 8,
  },
  bottomPadding: {
    height: 24,
  },
});

export default AddClientScreen;
