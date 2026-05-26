import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import { getDocs, collection, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase.config';
import LoadingSpinner from '../../components/common/LoadingSpinner';

type SortKey = 'name_asc' | 'price_asc' | 'price_desc' | 'stock_desc';

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'name_asc',    label: 'Nom A → Z',         icon: 'text-outline' },
  { key: 'price_asc',  label: 'Prix croissant',      icon: 'trending-up-outline' },
  { key: 'price_desc', label: 'Prix décroissant',    icon: 'trending-down-outline' },
  { key: 'stock_desc', label: 'Stock disponible',    icon: 'layers-outline' },
];

const ClientHomeScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { activeOrders, pendingOrders } = useOrder();
  const [products, setProducts] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [sort, setSort] = useState<SortKey>('name_asc');
  const [showSort, setShowSort] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const storeId = userProfile?.storeId;

  useEffect(() => {
    if (!storeId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [storeSnap, prodSnap] = await Promise.all([
          getDoc(doc(db, 'stores', storeId)),
          getDocs(collection(db, 'stores', storeId, 'products')),
        ]);
        if (storeSnap.exists()) setStore({ id: storeSnap.id, ...storeSnap.data() });
        const prods = prodSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p: any) => p.quantity > 0);
        setProducts(prods);
      } catch (e) {
        console.error('ClientHome load error:', e);
      }
      setLoading(false);
    };
    load();
  }, [storeId]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p: any) => p.category).filter(Boolean))].sort();
    return ['Tout', ...cats];
  }, [products]);

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = { Tout: products.length };
    products.forEach((p: any) => {
      if (p.category) map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = products.filter((p: any) => {
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'Tout' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });

    switch (sort) {
      case 'name_asc':
        list = list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'price_asc':
        list = list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        list = list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'stock_desc':
        list = list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
        break;
    }
    return list;
  }, [products, search, selectedCategory, sort]);

  const isFiltered = search.trim() !== '' || selectedCategory !== 'Tout';
  const currentSort = SORT_OPTIONS.find((o) => o.key === sort)!;

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('Tout');
  };

  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);
  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((s, [id, qty]) => {
      const p = products.find((pr: any) => pr.id === id);
      return s + (p?.price || 0) * qty;
    }, 0);
  }, [cart, products]);

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) next[productId] -= 1;
      else delete next[productId];
      return next;
    });
  };

  const handleCheckout = () => {
    const items = Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((pr: any) => pr.id === id);
        if (!p) return null;
        return { productId: id, name: p.name, quantity: qty, unitPrice: p.price || 0, subtotal: (p.price || 0) * qty };
      })
      .filter(Boolean);
    navigation.navigate('PlaceOrder', { items, totalAmount: cartTotal, onOrderPlaced: () => setCart({}) });
  };

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

  if (loading) return <LoadingSpinner fullScreen message="Chargement du catalogue..." />;

  const renderProduct = ({ item }: { item: any }) => {
    const qty = cart[item.id] || 0;
    return (
      <View style={styles.productCard}>
        <View style={styles.productIconBox}>
          <Ionicons name="cube-outline" size={28} color={colors.secondary} />
        </View>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.category && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{item.category}</Text>
          </View>
        )}
        <Text style={styles.productPrice}>{fmt(item.price || 0)}</Text>
        <Text style={styles.productStock}>Stock : {item.quantity} {item.unit || ''}</Text>
        <View style={styles.cartControl}>
          {qty > 0 ? (
            <>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                <Ionicons name="remove" size={16} color={colors.secondary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}>
                <Ionicons name="add" size={16} color={colors.secondary} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item.id)}>
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const listHeader = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {userProfile?.name?.split(' ')[0]} !</Text>
          <Text style={styles.storeName}>{store?.name || 'Boutique'}</Text>
        </View>
        {activeOrders.length > 0 && (
          <TouchableOpacity style={styles.activeOrderBtn} onPress={() => navigation.navigate('MesCommandes')}>
            <Ionicons name="bicycle-outline" size={16} color={colors.accent} />
            <Text style={styles.activeOrderText}>{activeOrders.length} en cours</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending orders banner */}
      {pendingOrders.length > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={() => navigation.navigate('MesCommandes')}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={styles.pendingBannerText}>
            {pendingOrders.length} commande(s) en attente de confirmation
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.warning} />
        </TouchableOpacity>
      )}

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(true)}>
          <Ionicons name="swap-vertical-outline" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Sort label */}
      <View style={styles.sortLabelRow}>
        <Ionicons name={currentSort.icon as any} size={12} color={colors.textDisabled} />
        <Text style={styles.sortLabel}>{currentSort.label}</Text>
      </View>

      {/* Categories */}
      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {categories.map((item) => {
            const isActive = selectedCategory === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => setSelectedCategory(isActive && item !== 'Tout' ? 'Tout' : item)}
              >
                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>{item}</Text>
                <View style={[styles.catBadge, isActive && styles.catBadgeActive]}>
                  <Text style={[styles.catBadgeText, isActive && styles.catBadgeTextActive]}>
                    {countByCategory[item] ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Results count / reset */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
        </Text>
        {isFiltered && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
            <Ionicons name="close-circle" size={13} color={colors.secondary} />
            <Text style={styles.resetBtnText}>Réinitialiser</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
            {isFiltered && (
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.emptyReset}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: cartCount > 0 ? 100 : 24 }} />}
      />

      {/* Floating cart */}
      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cartCount} article{cartCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.cartTotal}>{fmt(cartTotal)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Ionicons name="cart" size={18} color={colors.textInverse} />
            <Text style={styles.checkoutBtnText}>Commander</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort modal */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSort(false)}>
          <View style={styles.sortSheet}>
            <Text style={styles.sortSheetTitle}>Trier par</Text>
            {SORT_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.sortOption, sort === o.key && styles.sortOptionActive]}
                onPress={() => { setSort(o.key); setShowSort(false); }}
              >
                <Ionicons name={o.icon as any} size={18} color={sort === o.key ? colors.secondary : colors.textSecondary} />
                <Text style={[styles.sortOptionText, sort === o.key && styles.sortOptionTextActive]}>
                  {o.label}
                </Text>
                {sort === o.key && <Ionicons name="checkmark" size={18} color={colors.secondary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  storeName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  activeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}15`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  activeOrderText: { fontSize: 12, fontWeight: '700', color: colors.accent },

  // Pending banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBackground,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  pendingBannerText: { flex: 1, fontSize: 13, color: colors.warning, fontWeight: '600' },

  // Search + sort
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sortLabel: { fontSize: 11, color: colors.textDisabled, fontWeight: '500' },

  // Categories
  categoriesRow: { paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  catChipTextActive: { color: colors.textInverse },
  catBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.textDisabled}25`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  catBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  catBadgeTextActive: { color: colors.textInverse },

  // Results bar
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${colors.secondary}12`,
  },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: colors.secondary },

  // Product grid
  listContent: { paddingHorizontal: 12, paddingBottom: 8 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  productCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  productIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: `${colors.secondary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  productName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 6, minHeight: 36 },
  categoryTag: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryTagText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  productPrice: { fontSize: 15, fontWeight: '800', color: colors.secondary, marginBottom: 2 },
  productStock: { fontSize: 11, color: colors.textDisabled, marginBottom: 10 },
  cartControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 8,
    gap: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.textInverse },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: `${colors.secondary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.secondary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  emptyReset: { fontSize: 14, color: colors.secondary, fontWeight: '700', marginTop: 4 },

  // Cart bar
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    gap: 16,
  },
  cartInfo: { flex: 1 },
  cartCount: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  cartTotal: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  checkoutBtnText: { fontSize: 15, fontWeight: '700', color: colors.textInverse },

  // Sort modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  sortSheetTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 10 },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortOptionActive: { backgroundColor: `${colors.secondary}10` },
  sortOptionText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  sortOptionTextActive: { color: colors.secondary },
});

export default ClientHomeScreen;
