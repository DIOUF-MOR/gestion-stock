import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { deleteProduct } from '../../../services/stockService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';

const ProductDetailScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const product = route.params?.product;

  if (!product) {
    navigation.goBack();
    return null;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const isLowStock = product.quantity <= (product.minQuantity || 5);
  const margin = product.price && product.costPrice
    ? ((product.price - product.costPrice) / product.price * 100).toFixed(1)
    : null;

  const handleDelete = () => {
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
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Détail produit"
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('AddProduct', { product })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product header */}
        <View style={styles.productHeader}>
          <View style={[styles.productIcon, { backgroundColor: isLowStock ? `${colors.error}15` : `${colors.primary}15` }]}>
            <Ionicons name="cube" size={48} color={isLowStock ? colors.error : colors.primary} />
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category || 'Sans catégorie'}</Text>
          </View>
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <Ionicons name="warning" size={14} color={colors.error} />
              <Text style={styles.lowStockText}>Stock faible</Text>
            </View>
          )}
        </View>

        {/* Stock info */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Stock</Text>
          <View style={styles.statsRow}>
            <StatItem
              label="Quantité"
              value={`${product.quantity} ${product.unit || 'unité(s)'}`}
              color={isLowStock ? colors.error : colors.success}
              icon="layers-outline"
            />
            <StatItem
              label="Seuil d'alerte"
              value={`${product.minQuantity || 5} ${product.unit || 'unité(s)'}`}
              color={colors.warning}
              icon="alert-circle-outline"
            />
          </View>

          {/* Stock bar */}
          <View style={styles.stockBarContainer}>
            <View style={styles.stockBarLabel}>
              <Text style={styles.stockBarText}>Niveau de stock</Text>
              <Text style={[styles.stockBarPercent, { color: isLowStock ? colors.error : colors.success }]}>
                {Math.min(100, Math.round((product.quantity / Math.max(product.minQuantity * 2, 1)) * 100))}%
              </Text>
            </View>
            <View style={styles.stockBar}>
              <View
                style={[
                  styles.stockBarFill,
                  {
                    width: `${Math.min(100, (product.quantity / Math.max(product.minQuantity * 2, 1)) * 100)}%`,
                    backgroundColor: isLowStock ? colors.error : colors.success,
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Pricing info */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Prix</Text>
          <View style={styles.statsRow}>
            <StatItem
              label="Prix de vente"
              value={formatCurrency(product.price)}
              color={colors.primary}
              icon="cash-outline"
            />
            <StatItem
              label="Prix d'achat"
              value={formatCurrency(product.costPrice || 0)}
              color={colors.textSecondary}
              icon="pricetag-outline"
            />
          </View>

          {margin !== null && (
            <View style={styles.marginRow}>
              <View style={styles.marginItem}>
                <Text style={styles.marginLabel}>Bénéfice unitaire</Text>
                <Text style={styles.marginValue}>{formatCurrency(product.price - product.costPrice)}</Text>
              </View>
              <View style={styles.marginItem}>
                <Text style={styles.marginLabel}>Marge</Text>
                <Text style={[styles.marginValue, { color: colors.success }]}>{margin}%</Text>
              </View>
              <View style={styles.marginItem}>
                <Text style={styles.marginLabel}>Valeur stock</Text>
                <Text style={styles.marginValue}>{formatCurrency(product.costPrice * product.quantity)}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Description */}
        {product.description && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('AddProduct', { product })}
          >
            <Ionicons name="create-outline" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatItem = ({ label, value, color, icon }) => (
  <View style={statStyles.container}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  productHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  productIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
    marginLeft: 4,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stockBarContainer: {
    marginTop: 4,
  },
  stockBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stockBarText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  stockBarPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  stockBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  marginRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 16,
    marginTop: 4,
  },
  marginItem: {
    flex: 1,
    alignItems: 'center',
  },
  marginLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  marginValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  bottomPadding: {
    height: 24,
  },
});

export default ProductDetailScreen;
