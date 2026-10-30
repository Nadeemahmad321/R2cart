import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { useLanguage } from '../../context/LanguageContext';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: string;
  iconColor?: string;
  products: Product[];
  onSeeAll?: () => void;
  onProductPress: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
  getItemQuantity: (productId: string) => number;
}

const RAIL_CARD_WIDTH = 146;

export const ProductRail: React.FC<ProductRailProps> = React.memo(({
  title,
  subtitle,
  badge,
  icon,
  iconColor = Colors.primaryDark,
  products,
  onSeeAll,
  onProductPress,
  onAddToCart,
  onRemoveFromCart,
  getItemQuantity,
}) => {
  const { t, tCat } = useLanguage();
  if (!products || products.length === 0) return null;

  const renderItem = React.useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        width={RAIL_CARD_WIDTH}
        quantity={getItemQuantity(item.id)}
        onAdd={onAddToCart}
        onRemove={onRemoveFromCart}
        onPress={onProductPress}
      />
    ),
    [getItemQuantity, onAddToCart, onRemoveFromCart, onProductPress]
  );

  const getItemLayout = React.useCallback(
    (_: any, index: number) => ({
      length: 154,
      offset: 154 * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.titleWrap}>
            {icon ? (
              <Feather name={icon as any} size={16} color={iconColor} style={styles.titleIcon} />
            ) : null}
            <Text style={styles.titleText}>{tCat(title)}</Text>
            {badge ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>

        {onSeeAll ? (
          <TouchableOpacity
            style={styles.seeAllBtn}
            activeOpacity={0.7}
            onPress={onSeeAll}
          >
            <Text style={styles.seeAllText}>{t('seeAll')}</Text>
            <Feather name="chevron-right" size={14} color={Colors.primaryDark} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => `rail_${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={renderItem}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  titleIcon: {
    marginRight: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  badgePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  subtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginRight: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
