import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { deleteProduct } from '../../../services/stockService';
import { canAddProduct } from '../../../services/subscriptionService';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const StockScreen = ({ navigation }) => {
  const { products, loading, storeId } = useStore();
  const { subscription } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['Tous', ...cats.sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleAddProduct = () => {
    if (!canAddProduct(subscription, products.length)) {
      Alert.alert(
        'Limite atteinte',
        'Vous avez atteint la limite de produits de votre plan. Passez à un plan supérieur pour en ajouter plus.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Mettre à niveau',
            onPress: () => navigation.navigate('Paramètres', { screen: 'Subscription' }),
          },
        ]
      );
      return;
    }
    navigation.navigate('AddProduct');
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Supprimer le produit',
      `Voulez-vous vraiment supprimer "${product.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteProduct(storeId, product.id);
            if (!result.success) {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
    }).format(amount || 0) + ' FCFA';
  };

  const renderProduct = ({ item }) => {
    const isLowStock = item.quantity <= (item.minQuantity || 5);

    return (
      <Card style={styles.productCard} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
        <View style={styles.productContent}>
          {/* Icon */}
          <View style={[styles.productIcon, { backgroundColor: isLowStock ? `${colors.error}15` : `${colors.primary}15` }]}>
            <Ionicons
              name="cube"
              size={28}
              color={isLowStock ? colors.error : colors.primary}
            />
          </View>

          {/* Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
            <View style={styles.productDetails}>
              <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
              <Text style={styles.productDot}>·</Text>
              <Text style={[styles.productStock, isLowStock && styles.lowStock]}>
                {item.quantity} {item.unit || 'unité(s)'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.productActions}>
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>!</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('AddProduct', { product: item })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProduct(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Stock</Text>
          <Text style={styles.headerSubtitle}>{products.length} produit(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category filter */}
      {categories.length > 1 && (
        <View>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === item && styles.categoryChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Product list */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Aucun produit"
            message={
              searchQuery
                ? 'Aucun produit ne correspond à votre recherche.'
                : 'Ajoutez votre premier produit pour commencer.'
            }
            actionLabel="Ajouter un produit"
            onAction={handleAddProduct}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 10,
    marginRight: 10,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productCard: {
    marginBottom: 10,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  productDot: {
    fontSize: 13,
    color: colors.textDisabled,
    marginHorizontal: 6,
  },
  productStock: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lowStock: {
    color: colors.error,
    fontWeight: '700',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lowStockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  lowStockText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StockScreen;
