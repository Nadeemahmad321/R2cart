import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  StatusBar,
  Modal,
  Dimensions,
  ScrollView,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api, networkStatus } from '../../services/api';
import { dataCache } from '../../services/dataCache';
import { Product, Category, Banner, Address } from '../../types';
import {
  BannerSkeleton,
  CategoryGridSkeleton,
  ProductCardSkeleton,
  Skeleton,
} from '../../components/common/Skeleton';
import { EmergencyBanner } from '../../components/common/EmergencyBanner';
import {
  HeroCarousel,
  ProductCard,
  PRODUCT_ITEM_WIDTH,
  ProductRail,
  CampaignRail,
  CategoryGrid,
  PromoStrip,
  PromiseStrip,
  FloatingCartBar,
} from '../../components/customer';
import { normalizeHomeLayout, HomeLayoutConfig, HomeSectionConfig } from '../../config/homeLayout';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lang, toggleLang, t, tCat, tEta, prefetchTranslations } = useLanguage();
  const { addToCart, removeFromCart, getItemQuantity, totalItems, grandTotal } = useCart();

  // Double back to exit handler on root screen
  const lastBackPressTime = useRef<number>(0);
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPressTime.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressTime.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            lang === 'hi' ? 'बाहर निकलने के लिए फिर से बैक दबाएं' : 'Press back again to exit',
            ToastAndroid.SHORT
          );
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [lang])
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [topPicks, setTopPicks] = useState<Product[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(Boolean(user));
  const [availableVillages, setAvailableVillages] = useState<string[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState<boolean>(false);
  const [storeSettings, setStoreSettings] = useState<any>(dataCache.getSettings());
  const [festivalOffers, setFestivalOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [gridDisplayCount, setGridDisplayCount] = useState<number>(20);
  const [deferredReady, setDeferredReady] = useState<boolean>(false);

  useEffect(() => {
    // Mount initial viewport first (HeroCarousel + CategoryGrid + Top 2 rails)
    // Then smoothly mount remaining rails after brief delay for instant 60 FPS screen open
    const timer = setTimeout(() => {
      setDeferredReady(true);
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const HOME_FEED_CACHE_KEY = '@r2cart_home_feed_cache';

  // Active address resolution from backend
  const currentAddress = useMemo(() => {
    if (!user || savedAddresses.length === 0) return null;
    return (
      savedAddresses.find(a => a.id === selectedAddressId) ||
      savedAddresses.find(a => a.isDefault) ||
      savedAddresses[0]
    );
  }, [user, savedAddresses, selectedAddressId]);

  // Formatted address display string (User ko bas village dikhe)
  const displayAddressText = useMemo(() => {
    if (!user || !currentAddress) return '';
    const village =
      (currentAddress as any).village ||
      (currentAddress as any).villageName ||
      currentAddress.area ||
      currentAddress.landmark ||
      currentAddress.city ||
      currentAddress.street ||
      (lang === 'hi' ? 'घर' : 'Home');
    return village;
  }, [user, currentAddress, lang]);

  const fetchData = async () => {
    try {
      const [catRes, prodRes, bannerRes, bestRes, picksRes, deliveryRes, addrRes, settingsRes, mktRes] = await Promise.allSettled([
        api.getCategories(),
        api.getAllProducts(),
        api.getBanners(),
        api.getBestSellers(),
        api.getTopPicks(),
        api.getDelivery(),
        user ? api.getAddresses() : Promise.resolve({ data: [] }),
        api.getSettings(),
        api.getActiveMarketing(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        dataCache.setSettings(settingsRes.value.data);
        setStoreSettings(settingsRes.value.data);
      }

      if (mktRes.status === 'fulfilled' && mktRes.value?.data?.festivalOffers) {
        setFestivalOffers(mktRes.value.data.festivalOffers);
      }

      let prodList: Product[] = [];
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        const rawProds = Array.isArray(prodRes.value.data) ? prodRes.value.data : [];
        const seenProd = new Set<string>();
        prodList = rawProds.filter(p => {
          if (!p || !p.id || seenProd.has(p.id)) return false;
          seenProd.add(p.id);
          return true;
        });
        setProducts(prodList);
        dataCache.populateFromProducts(prodList);
      }

      let catList: any[] = [];
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        const rawCats = Array.isArray(catRes.value.data) ? catRes.value.data : [];
        const seenCat = new Set<string>();
        catList = rawCats.filter(c => {
          const key = c?.id || c?.slug;
          if (!key || seenCat.has(key)) return false;
          seenCat.add(key);
          return true;
        });
        setCategories(catList);
        dataCache.setCategories(catList);
      }

      if (bannerRes.status === 'fulfilled' && bannerRes.value?.data) {
        const rawBanners = Array.isArray(bannerRes.value.data) ? bannerRes.value.data : [];
        const seenBanners = new Set<string>();
        const bList = rawBanners.filter(b => {
          if (!b || !b.id || seenBanners.has(b.id)) return false;
          seenBanners.add(b.id);
          return true;
        });
        setBanners(bList);
      }

      // Background prefetch translations for all dynamic products & categories from backend
      prefetchTranslations([...prodList, ...catList]);

      // Best Sellers
      let bestList: Product[] = [];
      if (bestRes.status === 'fulfilled' && bestRes.value?.data) {
        const raw = bestRes.value.data as any;
        bestList = Array.isArray(raw) ? raw : (Array.isArray(raw.products) ? raw.products : []);
      }
      if (bestList.length === 0 && prodList.length > 0) {
        bestList = prodList.filter(p => p && (p.bestSeller || p.featured)).slice(0, 10);
      }
      const seenBest = new Set<string>();
      setBestSellers(bestList.filter(p => {
        if (!p || !p.id || seenBest.has(p.id)) return false;
        seenBest.add(p.id);
        return true;
      }));

      // Top Picks
      let picksList: Product[] = [];
      if (picksRes.status === 'fulfilled' && picksRes.value?.data) {
        const rawPicks = picksRes.value.data as any;
        picksList = Array.isArray(rawPicks) ? rawPicks : (Array.isArray(rawPicks.products) ? rawPicks.products : []);
      }
      if (picksList.length === 0 && prodList.length > 0) {
        picksList = prodList.slice(0, 10);
      }
      const seenPicks = new Set<string>();
      setTopPicks(picksList.filter(p => {
        if (!p || !p.id || seenPicks.has(p.id)) return false;
        seenPicks.add(p.id);
        return true;
      }));

      // Dynamic delivery areas and villages from backend (Zero hardcoding)
      let dynamicVillages: string[] = [];
      if (deliveryRes.status === 'fulfilled' && deliveryRes.value?.data) {
        dataCache.setDeliveryData(deliveryRes.value.data);
        const raw = deliveryRes.value.data as any;
        const villagesList = Array.isArray(raw.villages) ? raw.villages : (Array.isArray(raw) ? raw : []);
        dynamicVillages = villagesList.map((v: any) => v.name || v.title).filter(Boolean);
        const areasList = Array.isArray(raw.areas) ? raw.areas : [];
        for (const a of areasList) {
          if (Array.isArray(a.pincodes)) {
            dynamicVillages.push(...a.pincodes);
          }
        }
        dynamicVillages = [...new Set(dynamicVillages)];
        setAvailableVillages(dynamicVillages);
      }

      // Dynamic saved addresses from backend (only when user is logged in)
      let userAddrs: Address[] = [];
      if (user && addrRes.status === 'fulfilled' && addrRes.value?.data) {
        userAddrs = Array.isArray(addrRes.value.data) ? addrRes.value.data : [];
        setSavedAddresses(userAddrs);
        dataCache.setAddresses(userAddrs);
        if (userAddrs.length > 0) {
          const defaultAddr = userAddrs.find((a: any) => a.isDefault) || userAddrs[0];
          setSelectedAddressId(prev => {
            if (prev && userAddrs.some((a: any) => a.id === prev)) return prev;
            return defaultAddr.id;
          });
          const chosen = userAddrs.find((a: any) => a.id === selectedAddressId) || defaultAddr;
          dataCache.setSelectedAddress(chosen);
        } else {
          setSelectedAddressId(null);
          dataCache.setSelectedAddress(null);
        }
      } else {
        setSavedAddresses([]);
        setSelectedAddressId(null);
      }
      setLoadingAddresses(false);

      // Persist instant home cache for 0ms initial launch next time
      if (prodList.length > 0) {
        AsyncStorage.setItem(
          HOME_FEED_CACHE_KEY,
          JSON.stringify({
            categories: catRes.status === 'fulfilled' && catRes.value?.data ? catRes.value.data : [],
            products: prodList,
            banners: bannerRes.status === 'fulfilled' && bannerRes.value?.data ? bannerRes.value.data : [],
            bestSellers: bestList,
            topPicks: picksList,
          })
        ).catch(() => {});
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Instant cache restoration: display cached catalog in 0ms!
    (async () => {
      try {
        const cachedStr = await AsyncStorage.getItem(HOME_FEED_CACHE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && typeof cached === 'object') {
            if (Array.isArray(cached.categories) && cached.categories.length > 0) setCategories(cached.categories);
            if (Array.isArray(cached.products) && cached.products.length > 0) {
              setProducts(cached.products);
              dataCache.populateFromProducts(cached.products);
            }
            if (Array.isArray(cached.banners) && cached.banners.length > 0) setBanners(cached.banners);
            if (Array.isArray(cached.bestSellers) && cached.bestSellers.length > 0) setBestSellers(cached.bestSellers);
            if (Array.isArray(cached.topPicks) && cached.topPicks.length > 0) setTopPicks(cached.topPicks);
            // Instant display without waiting for network!
            setLoading(false);
          }
        }
      } catch {}
    })();

    // 2. Fetch fresh catalog silently in background
    fetchData();

    // Auto-reload catalog when internet is restored
    let wasOff = false;
    const unsub = networkStatus.subscribe((online) => {
      if (!online) {
        wasOff = true;
      } else if (wasOff) {
        wasOff = false;
        fetchData();
      }
    });

    return () => unsub();
  }, []);

  // Sync user saved addresses when user logs in or out
  useEffect(() => {
    if (user) {
      setLoadingAddresses(true);
      api.getAddresses().then(res => {
        if (res.data && Array.isArray(res.data)) {
          setSavedAddresses(res.data);
          if (res.data.length > 0) {
            setSelectedAddressId(prev => {
              if (prev && res.data.some((a: any) => a.id === prev)) return prev;
              const def = res.data.find((a: any) => a.isDefault) || res.data[0];
              return def.id;
            });
          } else {
            setSelectedAddressId(null);
          }
        }
      }).catch(() => {}).finally(() => {
        setLoadingAddresses(false);
      });
    } else {
      setSavedAddresses([]);
      setSelectedAddressId(null);
      setLoadingAddresses(false);
    }
  }, [user]);

  // Refresh addresses & check 2-hour prompt whenever user returns to HomeScreen
  useFocusEffect(
    useCallback(() => {
      if (user) {
        api.getAddresses().then(res => {
          if (res.data && Array.isArray(res.data)) {
            setSavedAddresses(res.data);
            dataCache.setAddresses(res.data);
            if (res.data.length > 0) {
              setSelectedAddressId(prev => {
                if (prev && res.data.some((a: any) => a.id === prev)) return prev;
                const def = res.data.find((a: any) => a.isDefault) || res.data[0];
                return def ? def.id : null;
              });
            } else {
              setSelectedAddressId(null);
              dataCache.setSelectedAddress(null);
            }
          }
        }).catch(() => {}).finally(() => {
          setLoadingAddresses(false);
        });

        // 2-Hour Address Selection / Confirmation System for Logged-In Users
        const checkTwoHourAddressPrompt = async () => {
          try {
            const lastPrompt = await AsyncStorage.getItem('@r2cart_last_address_prompt_time');
            const now = Date.now();
            const TWO_HOURS = 2 * 60 * 60 * 1000;
            if (!lastPrompt || now - Number(lastPrompt) >= TWO_HOURS) {
              await AsyncStorage.setItem('@r2cart_last_address_prompt_time', String(now));
              setTimeout(() => {
                setLocationModalVisible(true);
              }, 1000);
            }
          } catch {}
        };
        checkTwoHourAddressPrompt();
      }
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Stable callbacks so child components don't re-render unnecessarily
  const handleProductPress = useCallback((productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  }, [navigation]);

  const handleCategoryPress = useCallback((category: Category) => {
    if (!category) {
      navigation.navigate('CategoriesTab');
      return;
    }
    navigation.navigate('CategoriesTab', {
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
    });
  }, [navigation]);

  const handleBannerPress = useCallback((banner: Banner) => {
    if (banner.destination?.includes('category/')) {
      const slug = banner.destination.split('category/')[1];
      navigation.navigate('CategoriesTab', { categorySlug: slug });
    } else if (banner.destination?.includes('coupons')) {
      navigation.navigate('Coupons');
    } else {
      navigation.navigate('SearchTab');
    }
  }, [navigation]);

  // Dynamic Normalized Storefront Layout from backend (zero hardcoding, admin synced)
  const homeLayout: HomeLayoutConfig = useMemo(() => {
    return normalizeHomeLayout(
      storeSettings?.policies?.homeLayout || storeSettings?.homeLayout || dataCache.getHomeLayout()
    );
  }, [storeSettings]);

  const bannerPlacements = homeLayout.bannerPlacements || {};
  const heroRotation = homeLayout.heroRotation || {};

  // Only active live banners from backend
  const liveBanners = useMemo(() => {
    return banners.filter(b => !b.status || String(b.status).toUpperCase() === 'ACTIVE');
  }, [banners]);

  // Candidates for Top Hero Banner Carousel based on admin bannerPlacements
  const allHeroCandidates = useMemo(() => {
    return liveBanners.filter((banner, index) => {
      const p = bannerPlacements[banner.id];
      if (p === 'HERO' || p === 'BOTH') return true;
      if (p === 'CAMPAIGN') return false;
      return index < 2;
    });
  }, [liveBanners, bannerPlacements]);

  // Dynamic Hero Carousel with 24-hr daily calendar rotation & admin manual override
  const heroBanners = useMemo(() => {
    if (allHeroCandidates.length <= 1) return allHeroCandidates;

    const { manualBannerId, manualChangedAt, intervalHours = 24 } = heroRotation;
    const cycleMs = (Number(intervalHours) || 24) * 60 * 60 * 1000;
    const now = Date.now();

    let activeIndex = 0;

    if (manualBannerId && manualChangedAt) {
      const manualTime = new Date(manualChangedAt).getTime();
      if (!isNaN(manualTime)) {
        const elapsed = now - manualTime;
        const manualIdx = allHeroCandidates.findIndex(b => String(b.id) === String(manualBannerId));
        if (manualIdx !== -1) {
          if (elapsed >= 0 && elapsed < cycleMs) {
            activeIndex = manualIdx;
          } else {
            const periods = Math.floor(elapsed / cycleMs);
            activeIndex = (manualIdx + periods) % allHeroCandidates.length;
          }
        }
      }
    } else {
      const dayNumber = Math.floor(now / (24 * 60 * 60 * 1000));
      activeIndex = dayNumber % allHeroCandidates.length;
    }

    const reordered: Banner[] = [];
    for (let i = 0; i < allHeroCandidates.length; i++) {
      reordered.push(allHeroCandidates[(activeIndex + i) % allHeroCandidates.length]);
    }
    return reordered;
  }, [allHeroCandidates, heroRotation]);

  // Campaign offers rail strictly adhering to backend placements & active festival promotions
  const campaignBanners = useMemo(() => {
    const promoBanners = (festivalOffers || []).map((f: any, idx: number) => ({
      id: `fest-${f.id || idx}`,
      kicker: f.badge || 'FESTIVAL SPECIAL',
      heading: f.title || f.name,
      subtitle: f.subtitle || f.content,
      image: f.imageUrl,
      destination: f.linkUrl && f.linkUrl !== '/' && f.linkUrl !== '#' ? f.linkUrl : 'Coupons',
      ctaText: f.metadata?.ctaText || 'Shop festival deals',
    }));

    const regularBanners = liveBanners.filter((banner, index) => {
      const p = bannerPlacements[banner.id];
      if (p === 'CAMPAIGN' || p === 'BOTH') return true;
      if (p === 'HERO') return false;
      return index >= 2;
    });

    return [...promoBanners, ...regularBanners];
  }, [liveBanners, bannerPlacements, festivalOffers]);

  // Dynamic Category Ordering matching website & Admin Storefront Layout categoryOrder
  const orderedCategories = useMemo(() => {
    if (!homeLayout.categoryOrder?.length) return categories;
    const orderMap = new Map(
      homeLayout.categoryOrder.map((slugOrId: string, idx: number) => [slugOrId, idx])
    );
    return [...categories].sort((a, b) => {
      const slugA = a.slug || '';
      const idA = a.id || '';
      const posA = orderMap.has(slugA)
        ? orderMap.get(slugA)!
        : orderMap.has(idA)
        ? orderMap.get(idA)!
        : 999;

      const slugB = b.slug || '';
      const idB = b.id || '';
      const posB = orderMap.has(slugB)
        ? orderMap.get(slugB)!
        : orderMap.has(idB)
        ? orderMap.get(idB)!
        : 999;

      if (posA === posB) {
        return (Number(a.position) || 999) - (Number(b.position) || 999);
      }
      return posA - posB;
    });
  }, [categories, homeLayout.categoryOrder]);

  // Derived product rails matching website
  const recommendedProducts = useMemo(() => {
    return products.slice(0, 10);
  }, [products]);

  const specialOffers = useMemo(() => {
    return products
      .filter(p => {
        const price = Number(p.price || 0);
        const mrp = Number(p.mrp || price);
        return mrp > price && Math.round(((mrp - price) / mrp) * 100) >= 15;
      })
      .slice(0, 10);
  }, [products]);

  // High-performance single-pass O(N) grouping map for Category rails
  const allCategoryRails = useMemo(() => {
    if (orderedCategories.length === 0 || products.length === 0) return [];

    const catMap = new Map<string, Product[]>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p || !p.id) continue;
      const keys: string[] = [];
      if ((p as any).categoryId) keys.push(String((p as any).categoryId));
      if ((p as any).category?.id) keys.push(String((p as any).category.id));
      if ((p as any).categorySlug) keys.push(String((p as any).categorySlug));
      if ((p as any).category?.slug) keys.push(String((p as any).category.slug));
      if (typeof p.category === 'string') keys.push(p.category);

      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        let arr = catMap.get(k);
        if (!arr) {
          arr = [];
          catMap.set(k, arr);
        }
        arr.push(p);
      }
    }

    const rails: { category: Category; items: Product[] }[] = [];
    const seenCatKeys = new Set<string>();

    for (let i = 0; i < orderedCategories.length; i++) {
      const cat = orderedCategories[i];
      if (!cat) continue;
      const catKey = String(cat.id || cat.slug || cat.name || '');
      if (seenCatKeys.has(catKey)) continue;
      seenCatKeys.add(catKey);

      const items = (cat.id && catMap.get(String(cat.id))) ||
                    (cat.slug && catMap.get(String(cat.slug))) ||
                    (cat.name && catMap.get(String(cat.name))) || [];
      if (items.length > 0) {
        const seenProd = new Set<string>();
        const uniqueItems: Product[] = [];
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (!seenProd.has(item.id)) {
            seenProd.add(item.id);
            uniqueItems.push(item);
          }
        }
        if (uniqueItems.length > 0) {
          rails.push({ category: cat, items: uniqueItems });
        }
      }
    }
    return rails;
  }, [orderedCategories, products]);

  // Dynamic Emergency status from backend policies (5 varieties: ALL_ORDERS, STORE_CLOSE, IMMEDIATE_ONLY, SCHEDULED_ONLY, SELECTED_AREAS)
  const emergencyInfo = useMemo(() => {
    return dataCache.getEmergencyInfo(currentAddress);
  }, [currentAddress, storeSettings]);

  // Dynamic active storefront sections strictly adhering to admin configuration (order and enabled)
  const activeSections = useMemo(() => {
    const list = (homeLayout.sections || []).filter(s => s && s.enabled !== false);
    return [...list].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [homeLayout.sections]);

  // Virtualized window for bottom storefront grid to prevent excessive memory consumption
  const displayedGridProducts = useMemo(() => {
    return products.slice(0, gridDisplayCount);
  }, [products, gridDisplayCount]);

  const handleEndReached = useCallback(() => {
    setGridDisplayCount(prev => (prev < products.length ? Math.min(products.length, prev + 20) : prev));
  }, [products.length]);

  // Storefront main grid item renderer - clean and high-performance
  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        quantity={getItemQuantity(item.id)}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onPress={handleProductPress}
        width={PRODUCT_ITEM_WIDTH}
      />
    ),
    [getItemQuantity, addToCart, removeFromCart, handleProductPress]
  );

  // Header assembling all sections dynamically according to backend layout
  const renderListHeader = useCallback(() => (
    <View>
      {/* Dynamic Emergency Alert Banner (Driven entirely by backend emergency policies) */}
      <EmergencyBanner info={emergencyInfo} />

      {activeSections.map((section: any, sectionIdx: number) => {
        const secKey = `sec_${section.id || sectionIdx}_${sectionIdx}`;

        // Section-level Coming Soon card renderer
        const renderComingSoonCard = () => (
          <View key={secKey} style={styles.sectionComingSoonCard}>
            <View style={styles.sectionCsChip}>
              <Feather name="clock" size={11} color="#B45309" />
              <Text style={styles.sectionCsChipText}>
                {section.comingSoonBadge || (lang === 'hi' ? 'जल्द आ रहा है' : 'COMING SOON')}
              </Text>
            </View>
            <Text style={styles.sectionCsTitle}>
              {section.comingSoonTitle || section.title || (lang === 'hi' ? 'जल्द शुरू हो रहा है' : 'Launching Soon')}
            </Text>
            <Text style={styles.sectionCsNotice}>
              {section.comingSoonNotice ||
                (lang === 'hi'
                  ? 'आपके क्षेत्र के लिए इस सेक्शन को तैयार किया जा रहा है।'
                  : 'We are preparing handpicked merchant deals and fresh items for your area.')}
            </Text>
          </View>
        );

        switch (section.id) {
          case 'heroBanners':
            if (section.comingSoon) return renderComingSoonCard();
            return heroBanners.length > 0 ? (
              <HeroCarousel key={secKey} banners={heroBanners} onBannerPress={handleBannerPress} />
            ) : null;

          case 'campaignOffers':
            if (section.comingSoon) return renderComingSoonCard();
            return campaignBanners.length > 0 ? (
              <CampaignRail
                key={secKey}
                title={section.title || (lang === 'hi' ? 'आपके लिए खास ऑफर्स' : 'Offers picked for you')}
                subtitle={section.subtitle || (lang === 'hi' ? 'ताज़ा डील्स और बचत' : 'Fresh deals, updated from R2Cart')}
                banners={campaignBanners}
                onBannerPress={handleBannerPress}
              />
            ) : null;

          case 'shopCategories':
            if (section.comingSoon) return renderComingSoonCard();
            return (
              <CategoryGrid
                key={secKey}
                title={section.title || t('shopByCategory')}
                subtitle={
                  section.subtitle ||
                  dataCache.getSettings()?.tagline ||
                  (lang === 'hi' ? 'ताज़ा और शुद्ध रोज़मर्रा का सामान' : 'Everything your home needs')
                }
                categories={orderedCategories}
                onCategoryPress={handleCategoryPress}
              />
            );

          case 'recommended': {
            if (section.comingSoon) return renderComingSoonCard();
            const count = Number(section.count) || 10;
            const items = recommendedProducts.slice(0, count);
            return items.length > 0 ? (
              <ProductRail
                key={secKey}
                title={section.title || (lang === 'hi' ? 'आपके लिए खास सिफारिशें' : 'Recommended for you')}
                subtitle={section.subtitle || (lang === 'hi' ? 'आपकी पसंद के अनुसार' : 'Tailored to what you love')}
                icon="sparkles"
                iconColor="#10B981"
                products={items}
                onProductPress={handleProductPress}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                getItemQuantity={getItemQuantity}
                onSeeAll={() => navigation.navigate('CategoriesTab')}
              />
            ) : null;
          }

          case 'bestSellers': {
            if (section.comingSoon) return renderComingSoonCard();
            const count = Number(section.count) || 10;
            const items = bestSellers.slice(0, count);
            return items.length > 0 ? (
              <ProductRail
                key={secKey}
                title={section.title || (lang === 'hi' ? 'सबसे ज्यादा बिकने वाले' : 'Best sellers')}
                subtitle={
                  section.subtitle ||
                  (lang === 'hi' ? 'ग्राहकों द्वारा सबसे ज्यादा पसंद' : 'Top selling essentials in your area')
                }
                badge="POPULAR"
                icon="award"
                iconColor="#F59E0B"
                products={items}
                onProductPress={handleProductPress}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                getItemQuantity={getItemQuantity}
                onSeeAll={() => navigation.navigate('CategoriesTab')}
              />
            ) : null;
          }

          case 'topPicks': {
            if (section.comingSoon) return renderComingSoonCard();
            const count = Number(section.count) || 10;
            const items = topPicks.slice(0, count);
            return items.length > 0 ? (
              <ProductRail
                key={secKey}
                title={section.title || (lang === 'hi' ? 'आज के टॉप पिक्स' : 'Top picks')}
                subtitle={section.subtitle || (lang === 'hi' ? 'ताज़ा और चुनिंदा सामान' : 'Handpicked fresh items')}
                badge="10-MIN"
                icon="zap"
                iconColor="#059669"
                products={items}
                onProductPress={handleProductPress}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                getItemQuantity={getItemQuantity}
                onSeeAll={() => navigation.navigate('CategoriesTab')}
              />
            ) : null;
          }

          case 'promoStrip':
            if (section.comingSoon) return renderComingSoonCard();
            return (
              <PromoStrip
                key={secKey}
                tag={section.tag || (lang === 'hi' ? 'आपकी बचत' : 'YOUR SAVINGS')}
                title={section.title || (lang === 'hi' ? 'खरीदें ज्यादा · बचाएं ज्यादा' : 'Stock up. Save more.')}
                subtitle={
                  section.subtitle ||
                  (lang === 'hi'
                    ? 'अपनी कार्ट के लिए कूपन और विशेष छूट देखें।'
                    : 'Explore the current coupons and exclusive discounts for your basket.')
                }
                buttonText={section.buttonText || (lang === 'hi' ? 'ऑफ़र्स देखें' : 'Explore offers')}
                onPress={() => navigation.navigate('Coupons')}
              />
            );

          case 'categoryRails': {
            if (section.comingSoon) return renderComingSoonCard();
            const maxCats = Number(section.maxCategories) || 8;
            const allowedCount = deferredReady ? maxCats : Math.min(2, maxCats);
            const railsToRender = allCategoryRails.slice(0, allowedCount);
            return (
              <View key={secKey}>
                {railsToRender.map(({ category, items }, catIdx) => {
                  if (!category) return null;
                  const catName = category.name || category.slug || 'Items';
                  const isCatSoon = dataCache.isCategoryComingSoon(category.slug);
                  const backendEta = dataCache.getEstimatedDelivery('20-30 mins');
                  const railTitle =
                    category.badgeActive && category.badgeText
                      ? `${tCat(catName)} · ${category.badgeText}`
                      : tCat(catName);

                  return (
                    <ProductRail
                      key={`cat_rail_${category.id || category.slug || catIdx}_${catIdx}`}
                      title={railTitle}
                      badge={isCatSoon ? (lang === 'hi' ? 'जल्द आएगा' : 'Coming Soon') : undefined}
                      subtitle={
                        isCatSoon
                          ? (lang === 'hi' ? 'जल्द ही आपके लिए उपलब्ध होगा' : 'Opening soon for orders')
                          : (lang === 'hi'
                              ? `ताज़ा ${tCat(catName)} • डिलीवरी ${tEta(backendEta)} में`
                              : `Fresh ${catName.toLowerCase()} delivered in ${backendEta}`)
                      }
                      products={items}
                      onProductPress={handleProductPress}
                      onAddToCart={addToCart}
                      onRemoveFromCart={removeFromCart}
                      getItemQuantity={getItemQuantity}
                      onSeeAll={() => handleCategoryPress(category)}
                    />
                  );
                })}
              </View>
            );
          }

          case 'specialOffers': {
            if (section.comingSoon) return renderComingSoonCard();
            const count = Number(section.count) || 10;
            const items = specialOffers.slice(0, count);
            return items.length > 0 ? (
              <ProductRail
                key={secKey}
                title={section.title || (lang === 'hi' ? 'खास ऑफर्स' : 'Special offers')}
                subtitle={
                  section.subtitle ||
                  (lang === 'hi' ? 'कम से कम 15% छूट के साथ बड़ी बचत' : 'Save big with minimum 15% discount')
                }
                badge="DEALS"
                icon="tag"
                iconColor="#DC2626"
                products={items}
                onProductPress={handleProductPress}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                getItemQuantity={getItemQuantity}
                onSeeAll={() => navigation.navigate('CategoriesTab')}
              />
            ) : null;
          }

          case 'recentlyViewed': {
            if (section.comingSoon) return renderComingSoonCard();
            const count = Number(section.count) || 8;
            const items = products.slice(8, 8 + count);
            return items.length > 0 ? (
              <ProductRail
                key={secKey}
                title={section.title || (lang === 'hi' ? 'हाल ही में देखे गए' : 'Recently viewed')}
                subtitle={
                  section.subtitle ||
                  (lang === 'hi' ? 'अपनी पसंदीदा चीजें आसानी से दोहराएं' : 'Products explored by you')
                }
                icon="clock"
                iconColor="#3B82F6"
                products={items}
                onProductPress={handleProductPress}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                getItemQuantity={getItemQuantity}
                onSeeAll={() => navigation.navigate('CategoriesTab')}
              />
            ) : null;
          }

          case 'promise':
            return <PromiseStrip key={secKey} />;

          default:
            return null;
        }
      })}

      {/* Storefront Section Header */}
      <View style={styles.storefrontHeader}>
        <View>
          <Text style={styles.storefrontTitle}>{lang === 'hi' ? 'सभी ताज़ा उत्पाद' : 'All Fresh Products'}</Text>
          <Text style={styles.storefrontSub}>
            {lang === 'hi' ? `${products.length} ताज़ा किराना उत्पाद उपलब्ध हैं` : `${products.length} fresh grocery items available`}
          </Text>
        </View>
      </View>
    </View>
  ), [
    activeSections,
    lang,
    heroBanners,
    campaignBanners,
    orderedCategories,
    recommendedProducts,
    bestSellers,
    topPicks,
    allCategoryRails,
    specialOffers,
    deferredReady,
    products.length,
    handleBannerPress,
    handleCategoryPress,
    handleProductPress,
    addToCart,
    removeFromCart,
    getItemQuantity,
    emergencyInfo,
    navigation,
    t,
    tCat,
    tEta,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header matching website */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 6 }]}>
        {/* Row 1: Logo on Left | User/Sign In & Cart on Right */}
        <View style={styles.topRow}>
          <TouchableOpacity activeOpacity={0.9} onPress={onRefresh}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            {/* Website matching Hindi/English Toggle Pill Button */}
            <TouchableOpacity
              style={styles.langToggleBtn}
              activeOpacity={0.8}
              onPress={toggleLang}
            >
              <Feather name="globe" size={12} color="#059669" />
              <Text style={styles.langToggleText}>
                {lang === 'hi' ? 'EN' : 'हिन्दी'}
              </Text>
            </TouchableOpacity>

            {user ? (
              <TouchableOpacity
                style={styles.userHeaderBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AccountTab')}
              >
                <View style={styles.userAvatarWrap}>
                  <Feather name="user" size={13} color={Colors.primaryDark} />
                </View>
                <Text style={styles.userNameHeader} numberOfLines={1}>
                  {user.name ? user.name.split(' ')[0] : 'Account'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.signInHeaderBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('CustomerLogin')}
              >
                <Text style={styles.signInHeaderText}>{t('signIn')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.headerCartBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Cart')}
            >
              <Feather name="shopping-cart" size={19} color={Colors.primaryDark} />
              {totalItems > 0 && (
                <View style={styles.headerCartBadge}>
                  <Text style={styles.headerCartBadgeText}>{totalItems}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Location & ETA Bar */}
        <TouchableOpacity
          style={styles.mobileLocationBar}
          activeOpacity={0.8}
          onPress={() => {
            if (!user) {
              navigation.navigate('CustomerLogin');
            } else if (savedAddresses.length === 0) {
              navigation.navigate('Addresses');
            } else {
              setLocationModalVisible(true);
            }
          }}
        >
          <View
            style={[
              styles.mobileLocEta,
              (emergencyInfo.isStorePaused || emergencyInfo.isAreaSuspended) && {
                backgroundColor: '#FEE2E2',
                borderColor: '#FECACA',
              },
              storeSettings?.effectiveStatus?.isOpenNow === false &&
                !emergencyInfo.isStorePaused && {
                  backgroundColor: '#FEF3C7',
                  borderColor: '#FDE68A',
                },
              (storeSettings?.effectiveStatus?.allowImmediateOrders === false ||
                emergencyInfo.isImmediatePaused) &&
                storeSettings?.effectiveStatus?.isOpenNow !== false &&
                !emergencyInfo.isStorePaused && {
                  backgroundColor: '#E0F2FE',
                  borderColor: '#BAE6FD',
                },
            ]}
          >
            {(() => {
              const effective = storeSettings?.effectiveStatus || {};
              const isStoreClosed = effective.isOpenNow === false;
              const nextOpeningLabel = effective.nextAvailableOpening?.label;
              const isEmergency = emergencyInfo.isStorePaused || emergencyInfo.isAreaSuspended;
              const isPaused = emergencyInfo.isStorePaused;

              if (isEmergency) {
                return (
                  <>
                    <Feather name="alert-circle" size={12} color="#DC2626" />
                    <Text
                      style={[styles.mobileLocEtaText, { color: '#DC2626', fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {isPaused
                        ? emergencyInfo.resumesAtLabel
                          ? `Paused (${emergencyInfo.resumesAtLabel})`
                          : 'Paused'
                        : 'Area Suspended'}
                    </Text>
                  </>
                );
              }

              if (isStoreClosed) {
                return (
                  <>
                    <Feather name="moon" size={12} color="#D97706" />
                    <Text
                      style={[styles.mobileLocEtaText, { color: '#B45309', fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {nextOpeningLabel ? `Closed (${nextOpeningLabel})` : 'Closed'}
                    </Text>
                  </>
                );
              }

              if (effective.allowImmediateOrders === false || emergencyInfo.isImmediatePaused) {
                return (
                  <>
                    <Feather name="calendar" size={12} color="#0284C7" />
                    <Text
                      style={[styles.mobileLocEtaText, { color: '#0369A1', fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      Schedule Only
                    </Text>
                  </>
                );
              }

              return (
                <>
                  <Feather name="clock" size={12} color="#059669" />
                  <Text style={styles.mobileLocEtaText} numberOfLines={1}>
                    {`${t('deliveryIn')} ${tEta(dataCache.getEstimatedDelivery('20-30 mins'))}`}
                  </Text>
                </>
              );
            })()}
          </View>
          <View style={styles.mobileLocAddress}>
            {loadingAddresses && !currentAddress ? (
              <Skeleton width={80} height={12} borderRadius={4} />
            ) : (
              <>
                <Feather
                  name={!user ? 'map-pin' : (savedAddresses.length > 0 ? 'map-pin' : 'plus-circle')}
                  size={12}
                  color="#059669"
                  style={{ flexShrink: 0 }}
                />
                <Text
                  style={[
                    styles.addressDisplayText,
                    (!user || savedAddresses.length === 0) && { color: Colors.primaryDark, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {!user
                    ? (lang === 'hi' ? 'पता जोड़ने के लिए लॉगिन करें' : 'Login to add address')
                    : (savedAddresses.length > 0
                        ? displayAddressText
                        : (lang === 'hi' ? '+ डिलीवरी पता जोड़ें' : '+ Add delivery address'))}
                </Text>
                <Feather
                  name={!user || savedAddresses.length === 0 ? 'chevron-right' : 'chevron-down'}
                  size={12}
                  color="#64748B"
                  style={{ flexShrink: 0 }}
                />
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Row 3: Search Bar Input Trigger */}
        <TouchableOpacity
          style={styles.searchBarTrigger}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('SearchTab')}
        >
          <Feather name="search" size={16} color="#64748B" style={styles.searchTriggerIcon} />
          <Text style={styles.searchTriggerText}>{t('searchPlaceholder')}</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Skeleton Mode */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <BannerSkeleton />
          <CategoryGridSkeleton />
          <View style={styles.skeletonProductRow}>
            <ProductCardSkeleton width={PRODUCT_ITEM_WIDTH} />
            <ProductCardSkeleton width={PRODUCT_ITEM_WIDTH} />
          </View>
        </View>
      ) : (
        /* High-Performance Virtualized Single FlatList */
        <FlatList
          data={displayedGridProducts}
          renderItem={renderProductItem}
          keyExtractor={(item, index) => `${item.id || 'prod'}_${index}`}
          numColumns={2}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={[
            styles.mainListContent,
            { paddingBottom: 110 + insets.bottom },
          ]}
          columnWrapperStyle={styles.productRowWrapper}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Floating Bottom Cart Bar */}
      <FloatingCartBar onPress={() => navigation.navigate('Cart')} />

      {/* Dynamic Location Selector Modal */}
      <Modal visible={locationModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalHeading}>
                  {lang === 'hi' ? 'डिलीवरी पता चुनें' : 'Select Delivery Address'}
                </Text>
                <Text style={styles.modalSubheading}>
                  {lang === 'hi'
                    ? `ताज़ा किराने का सामान ${tEta(dataCache.getEstimatedDelivery('20-30 mins'))} में डिलीवर`
                    : `Fresh groceries delivered in ${dataCache.getEstimatedDelivery('20-30 mins')}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Skeleton loading while fetching from backend */}
              {loadingAddresses ? (
                <View style={{ padding: 16, gap: 12 }}>
                  <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="100%" height={64} borderRadius={12} />
                  <Skeleton width="100%" height={64} borderRadius={12} />
                </View>
              ) : user && savedAddresses.length === 0 ? (
                /* If User logged in but has no saved address: Recommend adding address */
                <View style={styles.noAddressPromptBox}>
                  <View style={styles.noAddressIconCircle}>
                    <Feather name="map-pin" size={26} color={Colors.primaryDark} />
                  </View>
                  <Text style={styles.noAddressPromptTitle}>
                    {lang === 'hi' ? 'कोई डिलीवरी पता नहीं मिला' : 'No Delivery Address Found'}
                  </Text>
                  <Text style={styles.noAddressPromptSub}>
                    {lang === 'hi'
                      ? `तेज़ ${tEta(dataCache.getEstimatedDelivery('20-30 mins'))} में डोरस्टेप डिलीवरी के लिए कृपया अपना डिलीवरी पता जोड़ें।`
                      : `Please add your delivery address for fast ${dataCache.getEstimatedDelivery('20-30 mins')} doorstep delivery.`}
                  </Text>
                  <TouchableOpacity
                    style={styles.addAddressPrimaryBtn}
                    onPress={() => {
                      setLocationModalVisible(false);
                      navigation.navigate('Addresses');
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.addAddressPrimaryBtnText}>
                      {lang === 'hi' ? 'डिलीवरी पता जोड़ें' : 'Add Delivery Address'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* User Saved Addresses from backend */}
              {user && savedAddresses.length > 0 ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.modalSectionTitle}>
                    {lang === 'hi' ? 'आपके सहेजे गए पते' : 'Your Saved Addresses'}
                  </Text>
                  {savedAddresses.map(addr => {
                    const isSelected = selectedAddressId === addr.id;
                    const addrDetails = [addr.houseNo, addr.street, addr.landmark, addr.area, addr.city]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[styles.villageItem, isSelected && styles.villageItemActive]}
                        onPress={() => {
                          setSelectedAddressId(addr.id);
                          dataCache.setSelectedAddress(addr);
                          setLocationModalVisible(false);
                        }}
                      >
                        <View style={styles.villageItemLeft}>
                          <Feather
                            name={addr.type === 'WORK' ? 'briefcase' : 'home'}
                            size={16}
                            color={isSelected ? Colors.primaryDark : '#059669'}
                          />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.villageName, isSelected && styles.villageNameActive]}>
                              {addr.type || (lang === 'hi' ? 'घर' : 'Home')}
                            </Text>
                            {addrDetails ? (
                              <Text style={styles.addrSubText} numberOfLines={1}>
                                {addrDetails}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        {isSelected && <Feather name="check" size={18} color={Colors.primaryDark} />}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.addAddrBtn}
                    onPress={() => {
                      setLocationModalVisible(false);
                      navigation.navigate('Addresses');
                    }}
                  >
                    <Feather name="plus" size={14} color={Colors.primaryDark} />
                    <Text style={styles.addAddrBtnText}>
                      {lang === 'hi' ? '+ नया पता जोड़ें' : '+ Add New Address'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Serviceable Delivery Areas from backend (only if returned by backend) */}
              {availableVillages.length > 0 && (
                <View>
                  <Text style={styles.modalSectionTitle}>
                    {lang === 'hi' ? 'सेवा योग्य डिलीवरी क्षेत्र' : 'Serviceable Delivery Areas'}
                  </Text>
                  {availableVillages.map((v, idx) => (
                    <View key={`loc_${idx}_${v}`} style={styles.villageItem}>
                      <View style={styles.villageItemLeft}>
                        <Feather name="map-pin" size={16} color="#059669" />
                        <Text style={styles.villageName}>{v}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoImg: {
    width: 105,
    height: 38,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  langToggleText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  userHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  userAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 80,
  },
  signInHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 5,
  },
  signInHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  mobileLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  mobileLocEta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mobileLocEtaText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.2,
  },
  mobileLocAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 8,
  },
  addressDisplayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },
  headerCartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
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
  searchBarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchTriggerIcon: {
    marginRight: 8,
  },
  searchTriggerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  skeletonProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  mainListContent: {
    paddingBottom: 20,
  },
  storefrontHeader: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  storefrontTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  storefrontSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  productRowWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  floatingCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCounterBadge: {
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cartCounterText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  cartBarTotal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cartBarSub: {
    color: '#A7F3D0',
    fontSize: 10.5,
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBasketText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubheading: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  villageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  villageItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: Colors.primary,
  },
  villageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  villageName: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
    marginLeft: 10,
  },
  villageNameActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  addrSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
    marginBottom: 12,
    gap: 6,
  },
  addAddrBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  noAddressPromptBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  noAddressIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  noAddressPromptTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  noAddressPromptSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  addAddressPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  addAddressPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionComingSoonCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionCsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  sectionCsChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  sectionCsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 4,
  },
  sectionCsNotice: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
});
