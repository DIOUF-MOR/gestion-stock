/**
 * ClientPickerField
 *
 * Un bouton + modal réutilisable pour sélectionner un client avec recherche.
 *
 * Usage :
 *   <ClientPickerField
 *     clients={clients}
 *     selectedClient={selectedClient}
 *     onSelect={(client) => setSelectedClient(client)}
 *     onClear={() => setSelectedClient(null)}
 *     placeholder="Choisir un client"   // optionnel
 *     allowAnonymous                     // optionnel — ajoute "Anonyme" en tête de liste
 *     label="Client"                     // optionnel — label au-dessus du bouton
 *   />
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface Client {
  id: string;
  name: string;
  phone?: string;
  totalDebt?: number;
  [key: string]: any;
}

interface Props {
  clients: Client[];
  selectedClient: Client | null;
  onSelect: (client: Client | null) => void;
  onClear?: () => void;
  placeholder?: string;
  allowAnonymous?: boolean;
  label?: string;
  error?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const ClientPickerField: React.FC<Props> = ({
  clients,
  selectedClient,
  onSelect,
  onClear,
  placeholder = 'Choisir un client',
  allowAnonymous = false,
  label,
  error,
}) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch]   = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleSelect = (client: Client | null) => {
    onSelect(client);
    setVisible(false);
    setSearch('');
  };

  const handleClear = () => {
    onClear?.();
    onSelect(null);
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Trigger button */}
      <TouchableOpacity
        style={[styles.triggerBtn, selectedClient && styles.triggerBtnSelected, error && styles.triggerBtnError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        {selectedClient ? (
          <>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>
                {initials(selectedClient.name)}
              </Text>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedClient.name}</Text>
              {selectedClient.phone && (
                <Text style={styles.selectedPhone}>{selectedClient.phone}</Text>
              )}
            </View>
            {selectedClient.totalDebt > 0 && (
              <View style={styles.debtBadge}>
                <Ionicons name="warning-outline" size={10} color={colors.warning} />
                <Text style={styles.debtBadgeText}>{fmt(selectedClient.totalDebt)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="person-add-outline" size={18} color={colors.textDisabled} />
            <Text style={styles.placeholder}>{placeholder}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textDisabled} />
          </>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Picker modal */}
      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sélectionner un client</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Nom ou téléphone..."
                placeholderTextColor={colors.textDisabled}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Client list */}
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                allowAnonymous ? (
                  <TouchableOpacity
                    style={[styles.clientRow, styles.anonymousRow]}
                    onPress={() => handleSelect(null)}
                  >
                    <View style={[styles.avatar, styles.avatarAnonymous]}>
                      <Ionicons name="person-outline" size={18} color={colors.textDisabled} />
                    </View>
                    <Text style={styles.anonymousText}>Anonyme (sans client)</Text>
                    {!selectedClient && (
                      <Ionicons name="checkmark" size={18} color={colors.secondary} />
                    )}
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="search-outline" size={32} color={colors.textDisabled} />
                  <Text style={styles.emptyText}>Aucun client trouvé</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedClient?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.clientRow, isSelected && styles.clientRowSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                      <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                        {initials(item.name)}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={[styles.clientName, isSelected && styles.clientNameSelected]}>
                        {item.name}
                      </Text>
                      {item.phone && (
                        <Text style={styles.clientPhone}>{item.phone}</Text>
                      )}
                    </View>
                    {item.totalDebt > 0 && (
                      <View style={styles.debtBadge}>
                        <Text style={styles.debtBadgeText}>{fmt(item.totalDebt)}</Text>
                      </View>
                    )}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.secondary} style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },

  // Trigger button
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  triggerBtnSelected: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}08`,
  },
  triggerBtnError: {
    borderColor: colors.error,
  },
  selectedAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${colors.secondary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
  },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  selectedPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  placeholder: { flex: 1, fontSize: 14, color: colors.textDisabled },
  clearBtn: { padding: 2 },

  // Debt badge on trigger
  debtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.warning}18`,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  debtBadgeText: { fontSize: 11, color: colors.warning, fontWeight: '700' },

  errorText: { fontSize: 12, color: colors.error, marginTop: 4, fontWeight: '500' },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },

  list: {},
  listContent: { paddingHorizontal: 12, paddingBottom: 32 },

  // Anonymous row
  anonymousRow: { borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  avatarAnonymous: { backgroundColor: `${colors.textDisabled}20` },
  anonymousText: { flex: 1, fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },

  // Client rows
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  clientRowSelected: { backgroundColor: `${colors.secondary}06` },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.secondary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { backgroundColor: colors.secondary },
  avatarText: { fontSize: 14, fontWeight: '800', color: colors.secondary },
  avatarTextSelected: { color: colors.textInverse },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  clientNameSelected: { color: colors.secondary },
  clientPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textDisabled },
});

export default ClientPickerField;
