import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { dataCache } from '../../services/dataCache';
import { Category, Product } from '../../types';
import { Skeleton, ProductCardSkeleton } from '../../components/common/Skeleton';
import { FloatingCartBar, ProductCard } from '../../components/customer';

const { width } = Dimensions.get('window');
const RIGHT_PROD_WIDTH = (width - 95 - 28) / 2;

// --- 60 FPS MEMOIZED CATEGORY RAIL ITEM ---
// Only re-renders when selection state specifically changes for THIS item,
// preventing whole list re-renders when tapping a category.
interface CategoryRailItemProps {
  item: Category;
  isSelected: boolean;
  onSelect: (item: Category) => void;
}

const CategoryRailItem = React.memo<CategoryRailItemProps>(
  ({ item, isSelected, onSelect }) => {
    return (
      <TouchableOpacity
        style={[styles.catRailItem, isSelected && styles.catRailItemActive]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.catIconWrap, isSelected && styles.catIconWrapActive]}>
          {item.image || item.imageUrl ? (
            <Image
              source={{ uri: item.image || item.imageUrl }}
              style={styles.catRailImg}
              resizeMode="contain"
            />
          ) : (
            <Feather
              name="grid"
              size={18}
              color={isSelected ? Colors.primaryDark : '#64748B'}
            />
          )}
        </View>
        <Text
          style={[styles.catLabel, isSelected && styles.catLabelActive]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name
);

export const CategoriesScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { addToCart, removeFromCart, getItemQuantity, totalItems } = useCart();

  // 1. Instant cache initialization (0ms frame-1 display)
  const cachedCats = dataCache.getCategories();
  const [categories, setCategories] = useState<Category[]>(cachedCats);
  const [loadingCats, setLoadingCats] = useState<boolean>(cachedCats.length === 0);

  // Compute initial target category from cache + route params
  const initialTarget = useMemo(() => {
    if (cachedCats.length === 0) return null;
    if (route?.params?.categorySlug) {
      return cachedCats.find(c => c.slug === route.params.categorySlug) || cachedCats[0];
    }
    if (route?.params?.categoryId) {
      return cachedCats.find(c => c.id === route.params.categoryId) || cachedCats[0];
    }
    return cachedCats[0];
  }, [cachedCats, route?.params]);

  const [selectedCatId, setSelectedCatId] = useState<string>(initialTarget?.id || '');

  // 2. Instant product cache initialization
  const initialCachedProds = useMemo(() => {
    if (!initialTarget?.slug) return [];
    return dataCache.getProductsByCategory(initialTarget.slug) || [];
  }, [initialTarget]);

  const [products, setProducts] = useState<Product[]>(initialCachedProds);
  const [loadingProds, setLoadingProds] = useState<boolean>(
    initialTarget ? initialCachedProds.length === 0 : false
  );

  // Background category fetch (Stale-While-Revalidate)
  const refreshCategories = useCallback(async () => {
    try {
      const res = await api.getCategories();
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
        dataCache.setCategories(res.data);

        // If no category was selected yet, select the first or targeted one
        setSelectedCatId(prev => {
          if (prev && res.data.some((c: Category) => c.id === prev)) return prev;
          let target = res.data[0];
          if (route?.params?.categorySlug) {
            target = res.data.find((c: Category) => c.slug === route.params.categorySlug) || target;
          } else if (route?.params?.categoryId) {
            target = res.data.find((c: Category) => c.id === route.params.categoryId) || target;
          }
          return target.id;
        });
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoadingCats(false);
    }
  }, [route?.params]);

  // Initial mount load
  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const activeCategorySlugRef = useRef<string>(initialTarget?.slug || '');
  const lastParamRef = useRef<string | null>(null);

  // Fetch products for a category with Stale-While-Revalidate & Race-Condition protection
  const fetchProductsForCategory = useCallback(async (slug: string, isSilent: boolean = false) => {
    if (!slug) return;
    activeCategorySlugRef.current = slug;
    if (!isSilent) setLoadingProds(true);

    try {
      const res = await api.getProducts({ category: slug, limit: 50 });
      // Guard against race conditions: only update state if user is still on THIS category
      if (activeCategorySlugRef.current === slug && res.data) {
        const list = Array.isArray(res.data) ? res.data : [];
        dataCache.setProductsByCategory(slug, list);
        setProducts(list);
      }
    } catch {
      // Graceful error fallback
    } finally {
      if (activeCategorySlugRef.current === slug) {
        setLoadingProds(false);
      }
    }
  }, []);

  // Category switch handler: instant display if cached, background refresh
  const handleSelectCategory = useCallback(
    (cat: Category) => {
      if (!cat?.id) return;
      setSelectedCatId(cat.id);

      if (cat.slug) {
        activeCategorySlugRef.current = cat.slug;
        const cached = dataCache.getProductsByCategory(cat.slug);
        if (cached && cached.length > 0) {
          // Instant switch - 0ms delay!
          setProducts(cached);
          setLoadingProds(false);
          // Silent background revalidation
          fetchProductsForCategory(cat.slug, true);
        } else {
          // First time loading this category
          setProducts([]);
          fetchProductsForCategory(cat.slug, false);
        }
      }
    },
    [fetchProductsForCategory]
  );

  // Sync category selection ONLY when route params change from external screens (e.g. Home tap),
  // without reverting when user manually taps other categories on this screen!
  useEffect(() => {
    const slugParam = route?.params?.categorySlug;
    const idParam = route?.params?.categoryId;
    const currentKey = `${slugParam || ''}_${idParam || ''}`;

    if (!slugParam && !idParam) return;
    if (currentKey === lastParamRef.current) return;
    if (categories.length === 0) return;

    lastParamRef.current = currentKey;

    let target: Category | undefined;
    if (slugParam) {
      target = categories.find((c: Category) => c.slug === slugParam);
    } else if (idParam) {
      target = categories.find((c: Category) => c.id === idParam);
    }

    if (target && target.id !== selectedCatId) {
      handleSelectCategory(target);
    }
  }, [route?.params?.categorySlug, route?.params?.categoryId, categories, handleSelectCategory, selectedCatId]);

  // Initial load when categories first finish loading and none was selected yet
  useEffect(() => {
    if (!selectedCatId && categories.length > 0) {
      handleSelectCategory(categories[0]);
    }
  }, [categories, selectedCatId, handleSelectCategory]);

  // Cold start product load for the initial category
  const initialFetchedRef = useRef(false);
  useEffect(() => {
    if (!initialFetchedRef.current && initialTarget?.slug) {
      initialFetchedRef.current = true;
      fetchProductsForCategory(initialTarget.slug, initialCachedProds.length > 0);
    }
  }, [initialTarget, initialCachedProds.length, fetchProductsForCategory]);

  const selectedCat = useMemo(() => {
    return categories.find(c => c.id === selectedCatId);
  }, [categories, selectedCatId]);

  const handleProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('ProductDetail', { productId });
    },
    [navigation]
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryRailItem
        item={item}
        isSelected={item.id === selectedCatId}
        onSelect={handleSelectCategory}
      />
    ),
    [selectedCatId, handleSelectCategory]
  );

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        width={RIGHT_PROD_WIDTH}
        quantity={getItemQuantity(item.id)}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onPress={handleProductPress}
      />
    ),
    [getItemQuantity, addToCart, removeFromCart, handleProductPress]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const productKeyExtractor = useCallback((item: Product) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Top Header with Safe Area and Cart Icon */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Categories</Text>
          {selectedCat && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {selectedCat.name}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerSearchBtn}
            onPress={() => navigation.navigate('SearchTab')}
            activeOpacity={0.7}
          >
            <Feather name="search" size={19} color="#334155" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCartBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Cart')}
          >
            <Feather name="shopping-cart" size={20} color={Colors.primaryDark} />
            {totalItems > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loadingCats && categories.length === 0 ? (
        <View style={styles.mainLayout}>
          <View style={styles.leftRail}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Skeleton width={44} height={44} borderRadius={22} />
                <Skeleton width={50} height={10} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
          <View style={[styles.rightContent, { padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} width={RIGHT_PROD_WIDTH} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.mainLayout}>
          {/* Left Category Rail */}
          <View style={styles.leftRail}>
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={categoryKeyExtractor}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
            />
          </View>

          {/* Right Product Grid */}
          <View style={styles.rightContent}>
            {loadingProds && products.length === 0 ? (
              <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} width={RIGHT_PROD_WIDTH} />
                ))}
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="package" size={32} color="#059669" />
                </View>
                <Text style={styles.emptyTitle}>Products coming soon</Text>
                <Text style={styles.emptySub}>
                  {selectedCat
                    ? `No products have been added to ${selectedCat.name} yet.`
                    : 'No products have been added to this category yet.'}
                </Text>
                <Text style={styles.emptyRestockText}>
                  We are restocking fresh inventory shortly!
                </Text>
              </View>
            ) : (
              <FlatList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={productKeyExtractor}
                numColumns={2}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 10, paddingBottom: 110 + insets.bottom }}
                columnWrapperStyle={{ gap: 8 }}
              />
            )}
          </View>
        </View>
      )}

      {/* Floating Bottom Cart Bar */}
      <FloatingCartBar onPress={() => navigation.navigate('Cart')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSearchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftRail: {
    width: 95,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  catRailItem: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  catRailItemActive: {
    backgroundColor: '#FFFFFF',
    borderLeftColor: Colors.primary,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  catIconWrapActive: {
    backgroundColor: '#D1FAE5',
  },
  catRailImg: {
    width: 34,
    height: 34,
  },
  catLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },
  catLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  rightContent: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyRestockText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primaryDark,
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
