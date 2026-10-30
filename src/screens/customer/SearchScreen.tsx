import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { Product, Category } from '../../types';
import { ProductCard } from '../../components/customer/ProductCard';
import { FloatingCartBar } from '../../components/customer/FloatingCartBar';
import { ProductCardSkeleton } from '../../components/common/Skeleton';

import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 10) / 2);

const TRENDING_SEARCHES = [
  'Milk',
  'Atta',
  'Rice',
  'Oil',
  'Sugar',
  'Tea',
  'Chips',
  'Biscuits',
  'Ghee',
  'Paneer',
  'Maggi',
  'Soap',
];

export const SearchScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { t, tCat } = useLanguage();
  const { addToCart, removeFromCart, getItemQuantity } = useCart();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Product[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Load search history and popular categories from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getSearchHistory();
        if (res.data && Array.isArray(res.data)) {
          setHistory(res.data.map((x: any) => (typeof x === 'string' ? x : x.query)));
        }
      } catch {}

      try {
        const catRes = await api.getCategories();
        if (catRes.data && Array.isArray(catRes.data)) {
          setCategories(catRes.data.slice(0, 8));
        }
      } catch {}
    })();
  }, []);

  const performSearch = useCallback(async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let list: Product[] = [];

      // 1. Primary: Try Smart Search API
      try {
        const searchRes = await api.searchProducts(q);
        if (searchRes.data) {
          if (Array.isArray(searchRes.data.results) && searchRes.data.results.length > 0) {
            list = searchRes.data.results;
          } else if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
            list = searchRes.data;
          } else if (Array.isArray(searchRes.data.similarProducts) && searchRes.data.similarProducts.length > 0) {
            list = searchRes.data.similarProducts;
          }
        }
      } catch {}

      // 2. Fallback: Catalog Products Search
      if (list.length === 0) {
        try {
          const prodRes = await api.getProducts({ search: q, limit: 40 });
          if (prodRes.data && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
            list = prodRes.data;
          }
        } catch {}
      }

      // 3. Fallback: Multi-keyword queries (e.g. queries with '&' or 'and')
      if (list.length === 0 && (q.includes('&') || q.toLowerCase().includes(' and '))) {
        const cleanWord = q.split(/&|\band\b/i)[0].trim();
        if (cleanWord) {
          try {
            const wordRes = await api.searchProducts(cleanWord);
            if (wordRes.data?.results && Array.isArray(wordRes.data.results)) {
              list = wordRes.data.results;
            }
          } catch {}
        }
      }

      setResults(list);
      api.addSearchHistory(q).catch(() => {});
      setHistory(prev => [q, ...prev.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for filter or query passed from Home or other tabs
  useEffect(() => {
    if (route?.params?.query) {
      setQuery(route.params.query);
      performSearch(route.params.query);
    } else if (route?.params?.filter) {
      const f = route.params.filter;
      const term = f === 'bestseller' ? 'Best Seller' : f === 'toppicks' ? 'Top Picks' : f === 'discount' ? 'Discount' : f;
      setQuery(term);
      performSearch(term);
    }
  }, [route?.params, performSearch]);

  // Debounced search on text change
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(text);
    }, 280);
  };

  const handleClearHistory = async () => {
    try {
      await api.clearSearchHistory();
      setHistory([]);
    } catch {}
  };

  const handleProductPress = useCallback((productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  }, [navigation]);

  const renderProductItem = useCallback(({ item }: { item: Product }) => {
    return (
      <ProductCard
        product={item}
        quantity={getItemQuantity(item.id)}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onPress={handleProductPress}
        width={GRID_ITEM_WIDTH}
      />
    );
  }, [getItemQuantity, addToCart, removeFromCart, handleProductPress]);

  return (
    <View style={styles.container}>
      {/* Top Header with Back button & Website Matching Search Bar */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('HomeTab');
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Feather name="search" size={17} color="#059669" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => performSearch(query)}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
              }}
              style={styles.clearBtn}
            >
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* When no query is typed: Show Trending Searches & Recent Searches & Popular Categories */}
      {query.length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.defaultContent, { paddingBottom: 110 + insets.bottom }]}
        >
          {/* Trending Searches */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Feather name="trending-up" size={15} color={Colors.primaryDark} />
              <Text style={styles.sectionHeading}>Trending Searches</Text>
            </View>
            <View style={styles.chipsWrap}>
              {TRENDING_SEARCHES.map((item, idx) => (
                <TouchableOpacity
                  key={`trend_${idx}`}
                  style={styles.trendingChip}
                  onPress={() => {
                    setQuery(item);
                    performSearch(item);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trendingChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Searches (Backend Connected) */}
          {history.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeadingRowBetween}>
                <View style={styles.rowAlign}>
                  <Feather name="clock" size={15} color="#64748B" />
                  <Text style={[styles.sectionHeading, { color: '#475569', marginLeft: 6 }]}>
                    Recent Searches
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {history.map((item, idx) => (
                  <TouchableOpacity
                    key={`hist_${idx}`}
                    style={styles.historyChip}
                    onPress={() => {
                      setQuery(item);
                      performSearch(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="rotate-ccw" size={11} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.historyChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Categories from Backend */}
          {categories.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeadingRow}>
                <Feather name="grid" size={15} color={Colors.primaryDark} />
                <Text style={styles.sectionHeading}>Explore Categories</Text>
              </View>
              <View style={styles.catGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.catChip}
                    onPress={() =>
                      navigation.navigate('CategoriesTab', {
                        categoryId: cat.id,
                        categorySlug: cat.slug,
                        categoryName: cat.name,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.catChipText} numberOfLines={1}>
                      {tCat(cat.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : loading ? (
        /* Loading Skeletons Grid */
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} width={GRID_ITEM_WIDTH} />
          ))}
        </View>
      ) : results.length === 0 ? (
        /* No Results Found View matching website */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Feather name="search" size={36} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>No results found for "{query}"</Text>
          <Text style={styles.emptySub}>
            Try searching with a different keyword or check spelling.
          </Text>
        </View>
      ) : (
        /* Search Results 2-Column Grid using Shared ProductCard */
        <FlatList
          data={results}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 110 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Floating Bottom Cart Bar */}
      <FloatingCartBar onPress={() => navigation.navigate('Cart')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  defaultContent: {
    padding: 16,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionHeadingRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trendingChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  historyChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  skeletonGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultsList: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
