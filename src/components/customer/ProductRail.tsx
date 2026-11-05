import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
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
const PAGE_SIZE = 5;

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

  // Lazy loading state: initially load 5 products, then batch 5-by-5 on scroll
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset to initial 5 items whenever the products collection updates
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, visibleCount);
  }, [products, visibleCount]);

  const handleEndReached = useCallback(() => {
    if (visibleCount < (products?.length || 0)) {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, products.length));
    }
  }, [visibleCount, products?.length]);

  const renderItem = useCallback(
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

  const renderFooter = useCallback(() => {
    const totalCount = products?.length || 0;
    if (visibleCount < totalCount) {
      return (
        <View style={styles.footerLoaderWrap}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingMoreText}>
            {visibleCount}/{totalCount}
          </Text>
        </View>
      );
    }
    if (onSeeAll && totalCount > PAGE_SIZE) {
      return (
        <TouchableOpacity
          style={styles.endSeeAllCard}
          activeOpacity={0.75}
          onPress={onSeeAll}
        >
          <View style={styles.endSeeAllCircle}>
            <Feather name="arrow-right" size={18} color={Colors.primaryDark} />
          </View>
          <Text style={styles.endSeeAllTitle}>{t('seeAll')}</Text>
          <Text style={styles.endSeeAllSub}>
            {totalCount} {t('items')}
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  }, [visibleCount, products?.length, onSeeAll, t]);

  if (!products || products.length === 0) return null;

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
        data={visibleProducts}
        keyExtractor={(item, index) => `rail_${item.id || 'itm'}_${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
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
  footerLoaderWrap: {
    width: 64,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  loadingMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
  },
  endSeeAllCard: {
    width: 104,
    minHeight: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginRight: 8,
    marginBottom: 12,
  },
  endSeeAllCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  endSeeAllTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  endSeeAllSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
});
