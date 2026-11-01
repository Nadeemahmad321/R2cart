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
import { useLanguage } from '../../context/LanguageContext';
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
    const { t, tCat } = useLanguage();
    const isSoon = dataCache.isCategoryComingSoon(item.slug);
    const imgUri = item.image || item.imageUrl;

    return (
      <TouchableOpacity
        style={[styles.catRailItem, isSelected && styles.catRailItemActive]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.railIconContainer}>
          <View style={[styles.catIconWrap, isSelected && styles.catIconWrapActive]}>
            {imgUri ? (
              <Image
                source={{ uri: imgUri }}
                style={styles.catRailImg}
                resizeMode="cover"
              />
            ) : (
              <Feather
                name="grid"
                size={22}
                color={isSelected ? Colors.primaryDark : '#64748B'}
              />
            )}
          </View>
          {item.badgeActive && item.badgeText ? (
            <View style={styles.railCustomBadge}>
              <Text style={styles.railCustomBadgeText} numberOfLines={1}>{item.badgeText}</Text>
            </View>
          ) : isSoon ? (
            <View style={styles.railSoonBadge}>
              <Text style={styles.railSoonBadgeText}>{t('soonBadge', 'Soon')}</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[styles.catLabel, isSelected && styles.catLabelActive]}
          numberOfLines={2}
        >
          {tCat(item.name)}
        </Text>
      </TouchableOpacity>
    );
  }
);

export const CategoriesScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { addToCart, removeFromCart, getItemQuantity, totalItems } = useCart();
  const { t, tCat, tText, prefetchTranslations } = useLanguage();

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
  const [loadingProds, setLoadingProds] = useState<boolean>(initialCachedProds.length === 0);

  // Background category & settings fetch (Stale-While-Revalidate)
  const refreshCategories = useCallback(async () => {
    try {
      const [catRes, settingsRes, deliveryRes] = await Promise.allSettled([
        api.getCategories(),
        api.getSettings(),
        api.getDelivery(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        dataCache.setSettings(settingsRes.value.data);
      }
      if (deliveryRes.status === 'fulfilled' && deliveryRes.value?.data) {
        dataCache.setDeliveryData(deliveryRes.value.data);
      }

      if (catRes.status === 'fulfilled' && catRes.value?.data && catRes.value.data.length > 0) {
        const catData = catRes.value.data;
        setCategories(catData);
        dataCache.setCategories(catData);
        prefetchTranslations(catData);

        // If no category was selected yet, select the first or targeted one
        setSelectedCatId(prev => {
          if (prev && catData.some((c: Category) => c.id === prev)) return prev;
          let target = catData[0];
          if (route?.params?.categorySlug) {
            target = catData.find((c: Category) => c.slug === route.params.categorySlug) || target;
          } else if (route?.params?.categoryId) {
            target = catData.find((c: Category) => c.id === route.params.categoryId) || target;
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
        prefetchTranslations(list);
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
          // First time loading this category - show skeleton immediately!
          setProducts([]);
          setLoadingProds(true);
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

  const isSelectedCatSoon = useMemo(() => {
    return Boolean(selectedCat && dataCache.isCategoryComingSoon(selectedCat.slug));
  }, [selectedCat]);

  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Record<string, boolean>>({});

  const hasNotice = useMemo(() => {
    if (!selectedCat?.noticeActive) return false;
    if (!selectedCat.noticeTitle && !selectedCat.noticeMessage) return false;
    return !dismissedNoticeIds[selectedCat.id];
  }, [selectedCat, dismissedNoticeIds]);

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
          <Text style={styles.headerTitle}>{t('categories', 'Categories')}</Text>
          {selectedCat && (
            <View style={styles.headerSubRow}>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {tCat(selectedCat.name)}
              </Text>
              {selectedCat.badgeActive && selectedCat.badgeText ? (
                <View style={styles.headerCatBadge}>
                  <Text style={styles.headerCatBadgeText}>{selectedCat.badgeText}</Text>
                </View>
              ) : isSelectedCatSoon ? (
                <View style={styles.headerSoonBadge}>
                  <Feather name="clock" size={9} color="#B45309" />
                  <Text style={styles.headerSoonBadgeText}>{t('soonBadge', 'Soon')}</Text>
                </View>
              ) : null}
            </View>
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
                <Skeleton width={54} height={54} borderRadius={27} />
                <Skeleton width={56} height={10} borderRadius={4} style={{ marginTop: 6 }} />
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
          <View style={[styles.rightContent, { padding: 10 }]}>
            {loadingProds ? (
              <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} width={RIGHT_PROD_WIDTH} />
                ))}
              </View>
            ) : products.length === 0 ? (
              <View style={{ flex: 1 }}>
                {/* Right Header Bar */}
                <View style={styles.rightHeaderBar}>
                  <View style={styles.rightHeaderLeft}>
                    <Text style={styles.rightCatTitle} numberOfLines={1}>
                      {selectedCat ? tCat(selectedCat.name) : ''}
                    </Text>
                    {selectedCat?.badgeActive && selectedCat?.badgeText ? (
                      <View style={styles.rightBadgePill}>
                        <Text style={styles.rightBadgePillText}>{selectedCat.badgeText}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.rightCatCount}>0 items</Text>
                </View>

                {hasNotice && (
                  <View style={styles.noticeCard}>
                    <View style={styles.noticeIconWrap}>
                      <Feather name="bell" size={11} color="#2563EB" />
                    </View>
                    <View style={styles.noticeTextCol}>
                      {selectedCat?.noticeTitle ? (
                        <Text style={styles.noticeTitle}>{tText(selectedCat.noticeTitle)}</Text>
                      ) : null}
                      {selectedCat?.noticeMessage ? (
                        <Text style={styles.noticeMessage}>{tText(selectedCat.noticeMessage)}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.noticeDismissBtn}
                      onPress={() => setDismissedNoticeIds(prev => ({ ...prev, [selectedCat!.id]: true }))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={11} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  {isSelectedCatSoon ? (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyCenterContent}>
                        <View style={[styles.emptyIconCircle, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                          <Feather name="clock" size={32} color="#D97706" />
                        </View>
                        <View style={styles.comingSoonPillTag}>
                          <Feather name="clock" size={10} color="#B45309" style={{ marginRight: 4 }} />
                          <Text style={styles.comingSoonPillTagText}>{t('comingSoon', 'COMING SOON')}</Text>
                        </View>
                        <Text style={styles.emptyTitle}>
                          {selectedCat ? selectedCat.name : 'Coming Soon'}
                        </Text>
                        <Text style={styles.emptySub}>
                          We are stocking up fresh products for this category. Check back shortly!
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyCenterContent}>
                        <View style={styles.emptyIconCircle}>
                          <Feather name="package" size={32} color="#059669" />
                        </View>
                        <Text style={styles.emptyTitle}>No Products Available</Text>
                        <Text style={styles.emptySub}>
                          {selectedCat
                            ? `Currently no products available in ${selectedCat.name}.`
                            : 'No products available in this category.'}
                        </Text>
                        <View style={{ alignItems: 'center', width: '100%' }}>
                          <Text style={styles.emptyRestockText}>
                            We are restocking fresh inventory shortly!
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
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
                ListHeaderComponent={
                  <View style={{ marginBottom: 6 }}>
                    {/* Right Header Bar */}
                    <View style={styles.rightHeaderBar}>
                      <View style={styles.rightHeaderLeft}>
                        <Text style={styles.rightCatTitle} numberOfLines={1}>
                          {selectedCat ? tCat(selectedCat.name) : ''}
                        </Text>
                        {selectedCat?.badgeActive && selectedCat?.badgeText ? (
                          <View style={styles.rightBadgePill}>
                            <Text style={styles.rightBadgePillText}>{selectedCat.badgeText}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.rightCatCount}>
                        {products.length} {products.length === 1 ? 'item' : 'items'}
                      </Text>
                    </View>

                    {/* Revamped High-Quality Notice Card */}
                    {hasNotice && (
                      <View style={styles.noticeCard}>
                        <View style={styles.noticeIconWrap}>
                          <Feather name="bell" size={11} color="#2563EB" />
                        </View>
                        <View style={styles.noticeTextCol}>
                          {selectedCat?.noticeTitle ? (
                            <Text style={styles.noticeTitle}>{tText(selectedCat.noticeTitle)}</Text>
                          ) : null}
                          {selectedCat?.noticeMessage ? (
                            <Text style={styles.noticeMessage}>{tText(selectedCat.noticeMessage)}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={styles.noticeDismissBtn}
                          onPress={() => setDismissedNoticeIds(prev => ({ ...prev, [selectedCat!.id]: true }))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="x" size={11} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Coming Soon Banner */}
                    {isSelectedCatSoon && (
                      <View style={styles.catBannerCard}>
                        <View style={styles.catBannerHeader}>
                          <Feather name="clock" size={12} color="#D97706" />
                          <Text style={styles.catBannerBadgeText}>{t('comingSoon', 'COMING SOON')}</Text>
                        </View>
                        <Text style={styles.catBannerDesc}>
                          {t('categoryComingSoonDesc', 'We are stocking up fresh products for this category. Check back shortly!')}
                        </Text>
                      </View>
                    )}
                  </View>
                }
                contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
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
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
    flexShrink: 1,
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
    width: 98,
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
  railIconContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 6,
  },
  catIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  catIconWrapActive: {
    backgroundColor: '#ECFDF5',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  catRailImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  rightContentCentered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    alignSelf: 'center',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignSelf: 'center',
  },
  emptyCenterContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 6,
    lineHeight: 18,
    width: '100%',
    paddingHorizontal: 8,
  },
  emptyRestockText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primaryDark,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  railSoonBadge: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
    elevation: 2,
  },
  railSoonBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#B45309',
  },
  railCustomBadge: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    elevation: 2,
  },
  railCustomBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerCatBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  headerCatBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  rightHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  rightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 6,
    gap: 6,
  },
  rightCatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  rightCatCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    flexShrink: 0,
  },
  rightBadgePill: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    flexShrink: 0,
  },
  rightBadgePillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  noticeIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 1,
    flexShrink: 0,
  },
  noticeTextCol: {
    flex: 1,
    paddingRight: 4,
  },
  noticeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
    lineHeight: 16,
  },
  noticeMessage: {
    fontSize: 10.5,
    color: '#1E40AF',
    lineHeight: 15,
  },
  noticeDismissBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: 1,
    flexShrink: 0,
  },
  headerSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  headerSoonBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 2.5,
  },
  comingSoonPillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    marginTop: 10,
    marginBottom: 4,
  },
  comingSoonPillTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  catBannerCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    alignSelf: 'center',
  },
  catBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 4,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  catBannerDesc: {
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
});
