import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'hi';

const LANG_STORAGE_KEY = 'r2cart_lang_preference';
const TRANSLATIONS_STORAGE_KEY = 'r2cart_dynamic_translations_cache';

// In-memory fast cache
const memoryTranslationCache = new Map<string, string>();

// Comprehensive UI Translations
const uiTranslations: Record<Language, Record<string, string>> = {
  en: {
    home: 'Home',
    categories: 'Categories',
    search: 'Search',
    cart: 'Cart',
    myCart: 'My Basket',
    orders: 'Orders',
    account: 'Account',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    welcomeBack: 'Welcome',
    helloSignIn: 'Sign In',
    deliveryIn: 'Delivery in',
    deliveryPaused: 'Delivery Paused',
    selectAddress: 'Select Address',
    searchPlaceholder: 'Search for milk, chips, veggies...',
    seeAll: 'See all',
    offers: 'Offers',
    new: 'NEW',
    items: 'items',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    off: 'OFF',
    add: 'ADD',
    addedToBasket: 'Added to basket',
    subtotal: 'Item Total',
    deliveryFee: 'Delivery Fee',
    freeDelivery: 'FREE Delivery',
    totalPayable: 'To Pay',
    proceedToCheckout: 'Proceed to Pay',
    emptyCart: 'Your basket is empty',
    startShopping: 'Start Shopping',
    shopByCategory: 'Shop by Category',
    bestSellers: 'Best Sellers',
    topPicks: 'Picked for You',
    recommended: 'Recommended for You',
    specialOffers: 'Special Offers',
    recentlyViewed: 'Recently Viewed',
    comingSoon: 'Coming Soon',
    shopNow: 'Shop Now',
    exploreMore: 'Explore more fresh daily essentials',
  },
  hi: {
    home: 'होम',
    categories: 'कैटेगरी',
    search: 'सर्च',
    cart: 'कार्ट',
    myCart: 'मेरी टोकरी',
    orders: 'ऑर्डर्स',
    account: 'अकाउंट',
    signIn: 'साइन इन',
    signOut: 'लॉग आउट',
    welcomeBack: 'स्वागत है',
    helloSignIn: 'साइन इन',
    deliveryIn: 'डिलीवरी समय',
    deliveryPaused: 'डिलीवरी रुकी हुई है',
    selectAddress: 'डिलीवरी पता चुनें',
    searchPlaceholder: 'दूध, प्याज, ब्रेड, नमकीन खोजें...',
    seeAll: 'सभी देखें',
    offers: 'ऑफ़र्स',
    new: 'नया',
    items: 'सामान',
    inStock: 'उपलब्ध है',
    outOfStock: 'स्टॉक में नहीं है',
    off: 'छूट',
    add: 'जोड़ें',
    addedToBasket: 'टोकरी में जोड़ दिया',
    subtotal: 'सामान का मूल्य',
    deliveryFee: 'डिलीवरी शुल्क',
    freeDelivery: 'मुफ़्त डिलीवरी',
    totalPayable: 'कुल भुगतान',
    proceedToCheckout: 'भुगतान के लिए आगे बढ़ें',
    emptyCart: 'आपकी टोकरी खाली है',
    startShopping: 'खरीदारी शुरू करें',
    shopByCategory: 'कैटेगरी के अनुसार खरीदें',
    bestSellers: 'सर्वाधिक बिकने वाले',
    topPicks: 'खास आपके लिए',
    recommended: 'सुझाए गए उत्पाद',
    specialOffers: 'विशेष बचत ऑफर्स',
    recentlyViewed: 'हाल ही में देखे गए',
    comingSoon: 'जल्द आ रहा है',
    shopNow: 'अभी खरीदें',
    exploreMore: 'ताज़ा रोज़मर्रा का सामान खरीदें',
  },
};

// Instant Category Translation Map (0ms)
const categoryTranslations: Record<string, string> = {
  'Vegetables & Fruits': 'सब्जियां और फल',
  'Fruits & Vegetables': 'सब्जियां और फल',
  'Dairy, Bread & Eggs': 'डेयरी, ब्रेड और अंडे',
  'Atta, Rice, Dal & Oil': 'आटा, चावल, दाल और तेल',
  'Atta, Rice & Dal': 'आटा, चावल और दाल',
  'Masalas & Dry Fruits': 'मसाले और सूखे मेवे',
  'Cold Drinks & Juices': 'कोल्ड ड्रिंक्स और जूस',
  'Biscuits & Bakery': 'बिस्कुट और बेकरी',
  'Bakery & Biscuits': 'बेकरी और बिस्कुट',
  'Packaged Food': 'पैकेज्ड फूड',
  'Instant & Frozen Food': 'इंस्टेंट और फ्रोजन फूड',
  'Snacks & Munchies': 'स्नैक्स और नमकीन',
  'Tea, Coffee & Health Drinks': 'चाय, कॉफी और हेल्थ ड्रिंक्स',
  'Personal Care': 'पर्सनल केयर',
  'Household Care': 'सफाई और घरेलू सामान',
  'Cleaning & Kitchen': 'सफाई और किचन',
  'Home Care': 'होम केयर',
  'Baby Care': 'बेबी केयर',
  'Pet Care': 'पेट केयर',
  'Resin Art': 'रेजिन आर्ट',
  'Organic & Gourmet': 'ऑर्गेनिक और गौरमेट',
  'Paan Corner': 'पान कॉर्नर',
  'Sweet Tooth': 'मिठाइयां',
  'Breakfast & Instant Food': 'नाश्ता और इंस्टेंट फूड',
};

// Instant Common Grocery Translations (0ms)
const groceryTranslations: Record<string, string> = {
  'Amul Taaza Toned Milk': 'अमूल ताज़ा टोन्ड दूध',
  'Amul Gold Full Cream Milk': 'अमूल गोल्ड फुल क्रीम दूध',
  'Amul Butter': 'अमूल मक्खन',
  'Mother Dairy Milk': 'मदर डेयरी दूध',
  'Fortune Sunlite Sunflower Oil': 'फॉर्च्यून सूरजमुखी तेल',
  'Aashirvaad Shudh Chakki Atta': 'आशीर्वाद शुद्ध चक्की आटा',
  'Tata Salt': 'टाटा नमक',
  'Maggi 2-Minute Noodles': 'मैगी 2-मिनट नूडल्स',
  'Lay\'s Classic Salted Chips': 'लेज़ क्लासिक साल्टेड चिप्स',
  'Lay\'s India\'s Magic Masala': 'लेज़ मैजिक मसाला',
  'Kurkure Masala Munch': 'कुरकुरे मसाला मंच',
  'Oreo Vanilla Creme Biscuits': 'ओरियो वेनिला बिस्कुट',
  'Parle-G Gold Biscuits': 'पारले-जी गोल्ड बिस्कुट',
  'Good Day Butter Cookies': 'गुड डे बटर कुकीज़',
  'Tata Tea Gold': 'टाटा टी गोल्ड',
  'Red Label Tea': 'रेड लेबल चाय',
  'Bru Instant Coffee': 'ब्रू इंस्टेंट कॉफी',
  'Nescafe Classic Coffee': 'नेस्कैफे क्लासिक कॉफी',
  'Dettol Original Soap': 'डेटॉल ओरिजिनल साबुन',
  'Dove Cream Beauty Bar': 'डव ब्यूटी साबुन',
  'Surf Excel Quick Wash': 'सर्फ एक्सेल क्विक वॉश',
  'Vim Dishwash Gel': 'विम डिशवॉश जेल',
  'Fresh Potato (Aloo)': 'ताज़ा आलू',
  'Fresh Onion (Pyaz)': 'ताज़ा प्याज',
  'Fresh Tomato (Tamatar)': 'ताज़ा टमाटर',
  'Green Chilli (Hari Mirch)': 'हरी मिर्च',
  'Fresh Ginger (Adrak)': 'ताज़ा अदरक',
  'Fresh Garlic (Lahsun)': 'ताज़ा लहसुन',
  'Fresh Lemon (Nimbu)': 'ताज़ा नींबू',
  'Fresh Coriander (Dhaniya)': 'ताज़ा हरा धनिया',
  'Fresh Cauliflower (Gobhi)': 'ताज़ा फूलगोभी',
  'Fresh Cabbage (Patta Gobhi)': 'ताज़ा पत्तागोभी',
  'Paneer': 'पनीर',
  'Curd': 'दही',
  'Bread': 'ब्रेड',
  'Eggs': 'अंडे',
  'Sugar': 'चीनी',
  'Tea': 'चाय',
  'Rice': 'चावल',
  'Mustard Oil': 'सरसों का तेल',
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
  tCat: (name: string) => string;
  tEta: (eta: string) => string;
  tProd: (input: any) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string, fallback = '') => fallback || key,
  tCat: (name: string) => name || '',
  tEta: (eta: string) => eta || '',
  tProd: (input: any) => (typeof input === 'object' ? input.name || '' : String(input || '')),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');

  // Load preferences from local storage on launch
  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY)
      .then(stored => {
        if (stored === 'hi' || stored === 'en') {
          setLangState(stored);
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(TRANSLATIONS_STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'string') {
                memoryTranslationCache.set(k, v);
              }
            });
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Blazing-fast Instant Language Switchers (0ms response)
  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, newLang).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'hi' ? 'en' : 'hi';
      AsyncStorage.setItem(LANG_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, fallback = ''): string => {
      return uiTranslations[lang]?.[key] || fallback || key;
    },
    [lang]
  );

  const tCat = useCallback(
    (name: string): string => {
      if (!name) return '';
      if (lang !== 'hi') return name;

      const trimmed = name.trim();
      if (categoryTranslations[trimmed]) {
        return categoryTranslations[trimmed];
      }
      if (memoryTranslationCache.has(trimmed)) {
        return memoryTranslationCache.get(trimmed)!;
      }
      return name;
    },
    [lang]
  );

  const tEta = useCallback(
    (eta: string): string => {
      if (!eta) return '';
      if (lang !== 'hi') return eta;
      return eta
        .replace(/minutes/gi, 'मिनट')
        .replace(/minute/gi, 'मिनट')
        .replace(/mins/gi, 'मिनट')
        .replace(/min/gi, 'मिनट')
        .replace(/delivery in/gi, 'डिलीवरी समय');
    },
    [lang]
  );

  const tProd = useCallback(
    (input: any): string => {
      if (!input) return '';
      const name = typeof input === 'object' ? (input.nameHi || input.metadata?.nameHi || input.name || '') : String(input);
      if (lang !== 'hi') return typeof input === 'object' ? input.name || '' : name;

      // 1. If backend database provided nameHi, use it directly
      if (typeof input === 'object' && (input.nameHi || input.metadata?.nameHi)) {
        return input.nameHi || input.metadata?.nameHi;
      }

      const trimmed = name.trim();
      // 2. Instant dictionary lookup (0ms)
      if (groceryTranslations[trimmed]) {
        return groceryTranslations[trimmed];
      }
      if (memoryTranslationCache.has(trimmed)) {
        return memoryTranslationCache.get(trimmed)!;
      }

      return name;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t, tCat, tEta, tProd }),
    [lang, setLang, toggleLang, t, tCat, tEta, tProd]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
