import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { dataCache } from '../services/dataCache';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, variantId?: string) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  deleteItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string, variantId?: string) => number;
  syncCartWithBackend: () => Promise<void>;
  isSyncing: boolean;
  isInitialized: boolean;
  totalItems: number;
  itemTotal: number;
  deliveryFee: number;
  grandTotal: number;
}

const CART_STORAGE_KEY = '@r2cart_cart';
const CartContext = createContext<CartContextType>({} as CartContextType);

const mapBackendItemToCartItem = (bi: any, index: number = 0): CartItem => {
  if (!bi) {
    return {
      id: `fallback_${index}_${Date.now()}`,
      productId: `fallback_${index}`,
      name: 'Item',
      unit: '',
      price: 0,
      mrp: 0,
      imageUrl: '',
      quantity: 1,
    };
  }
  const img =
    bi.imageUrl ||
    (Array.isArray(bi.images) && (bi.images[0]?.url || bi.images[0])) ||
    bi.image ||
    '';
  const prodId = String(bi.id || bi.productId || `item_${index}`);
  return {
    id: `${prodId}_default`,
    productId: prodId,
    name: String(bi.name || 'Item'),
    unit: String(bi.unit || ''),
    price: Math.max(0, Number(bi.price) || 0),
    mrp: Math.max(0, Number(bi.mrp) || Number(bi.price) || 0),
    imageUrl: typeof img === 'string' ? img.trim() : (img?.url || ''),
    quantity: Math.max(1, Number(bi.qty || bi.quantity) || 1),
    stock: bi.stock !== undefined ? Number(bi.stock) : undefined,
    status: bi.status,
    isSoon: Boolean(bi.isSoon),
    comingSoon: Boolean(bi.comingSoon),
    categorySlug: bi.categorySlug || (typeof bi.category === 'string' ? bi.category : bi.category?.slug),
    deliveryScope: bi.deliveryScope || bi.product?.deliveryScope || 'LOCAL',
    orderMode: bi.orderMode || bi.product?.orderMode || 'DIRECT_ORDER',
    shippingFee: bi.shippingFee ? Number(bi.shippingFee) : (bi.product?.shippingFee ? Number(bi.product.shippingFee) : undefined),
    minOrderQty: Math.max(1, Number(bi.minOrderQty || bi.product?.minOrderQty) || 1),
    dietaryPreference: bi.dietaryPreference || bi.product?.dietaryPreference || undefined,
  };
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = items;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const { notify } = useToast();

  // 1. Initial load from local storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = parsed
              .filter((i: any) => i && typeof i === 'object')
              .map((i: any, idx: number) => ({
                id: String(i.id || `${i.productId || idx}_default`),
                productId: String(i.productId || idx),
                variantId: i.variantId,
                name: String(i.name || 'Item'),
                unit: String(i.unit || ''),
                price: Math.max(0, Number(i.price) || 0),
                mrp: Math.max(0, Number(i.mrp) || Number(i.price) || 0),
                imageUrl: typeof i.imageUrl === 'string' ? i.imageUrl.trim() : '',
                quantity: Math.max(1, Number(i.quantity) || 1),
                stock: i.stock !== undefined ? Number(i.stock) : undefined,
                status: i.status,
                isSoon: Boolean(i.isSoon),
                comingSoon: Boolean(i.comingSoon),
                categorySlug: i.categorySlug,
                deliveryScope: i.deliveryScope || 'LOCAL',
                orderMode: i.orderMode || 'DIRECT_ORDER',
                shippingFee: i.shippingFee ? Number(i.shippingFee) : undefined,
                minOrderQty: Math.max(1, Number(i.minOrderQty) || 1),
                dietaryPreference: i.dietaryPreference || undefined,
              }));
            setItems(sanitized);
            itemsRef.current = sanitized;
          }
        }
      } catch {} finally {
        setIsInitialized(true);
      }
    })();
  }, []);

  const saveTimerRef = useRef<any>(null);

  const saveCart = useCallback((newItems: CartItem[]) => {
    const valid = Array.isArray(newItems) ? newItems.filter(Boolean) : [];
    itemsRef.current = valid;
    setItems(valid);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(valid));
      } catch {}
    }, 300);
  }, []);

  // 2. Authoritative backend sync (Zero ghost items resurrection)
  const syncCartWithBackend = useCallback(async () => {
    if (!userRef.current) return;
    setIsSyncing(true);
    try {
      // Fetch authoritative backend cart from server database
      const res = await api.getCart();
      const data = res?.data;
      const backendItems: any[] = Array.isArray(data?.items) ? data.items.filter(Boolean) : [];

      const mapped = backendItems.map((bi: any, idx: number) => mapBackendItemToCartItem(bi, idx));
      itemsRef.current = mapped;
      setItems(mapped);
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mapped)).catch(() => {});
    } catch (err: any) {
      console.log('[CartContext] Cart backend sync error:', err?.message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync when user logs in and maintain multi-device real-time sync
  useEffect(() => {
    if (user?.id) {
      syncCartWithBackend();

      // 1. Sync immediately whenever app comes to foreground (AppState = 'active')
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          syncCartWithBackend();
        }
      });

      // 2. Poll backend cart every 8 seconds while active for seamless multi-device parity
      const interval = setInterval(() => {
        if (AppState.currentState === 'active' && userRef.current) {
          syncCartWithBackend();
        }
      }, 8000);

      return () => {
        subscription.remove();
        clearInterval(interval);
      };
    }
  }, [user?.id, syncCartWithBackend]);

  const addToCart = useCallback(
    async (product: Product, variantId?: string) => {
      const v = variantId ? product.variants?.find(x => x.id === variantId) : undefined;

      // Defense in depth: Check out-of-stock and coming-soon status
      if (dataCache.isProductComingSoon(product)) {
        notify('This product is coming soon and cannot be ordered yet', 'error');
        return;
      }
      if (dataCache.isProductOutOfStock(product, v ? v.stock : undefined)) {
        notify('This product is out of stock', 'error');
        return;
      }
      if (product.orderMode === 'CONTACT_REQUEST') {
        notify('This item is available via enquiry only. Please tap Enquire.', 'info');
        return;
      }

      const currentItems = itemsRef.current;
      const price = v ? v.price : (product.price || 0);
      const mrp = v ? v.mrp : (product.mrp || price);
      const unit = v ? (v.unit || v.weight || '') : (product.unit || '');
      const img = product.imageUrl || (product.images && product.images[0]) || '';

      const isMatch = (item: CartItem) => {
        const prodMatch = item.productId === product.id || item.id === product.id || item.id === `${product.id}_default`;
        const varMatch = variantId ? item.variantId === variantId : (!item.variantId || item.variantId === 'default');
        return prodMatch && varMatch;
      };

      const existingIndex = currentItems.findIndex(isMatch);

      let newQty = 1;
      let nextItems: CartItem[];
      if (existingIndex > -1) {
        nextItems = [...currentItems];
        newQty = nextItems[existingIndex].quantity + 1;
        nextItems[existingIndex] = { ...nextItems[existingIndex], quantity: newQty };
      } else {
        const newItem: CartItem = {
          id: `${product.id}_${variantId || 'default'}`,
          productId: product.id,
          variantId,
          name: product.name,
          unit,
          price,
          mrp,
          imageUrl: typeof img === 'string' ? img : ((img as any)?.url || ''),
          quantity: 1,
          stock: v?.stock !== undefined ? v.stock : product.stock,
          status: product.status,
          isSoon: (product as any).isSoon,
          comingSoon: (product as any).comingSoon,
          categorySlug: product.categorySlug || (typeof product.category === 'string' ? product.category : product.category?.slug),
          deliveryScope: product.deliveryScope || 'LOCAL',
          orderMode: product.orderMode || 'DIRECT_ORDER',
          shippingFee: product.shippingFee ? Number(product.shippingFee) : undefined,
          minOrderQty: Math.max(1, Number(product.minOrderQty) || 1),
          dietaryPreference: product.dietaryPreference || undefined,
        };
        newQty = 1;
        nextItems = [...currentItems, newItem];
      }

      itemsRef.current = nextItems;
      setItems(nextItems);
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems)).catch(() => {});
      notify(`Added ${product.name} to basket!`, 'success');

      // Sync with backend if logged in
      if (userRef.current) {
        try {
          const res = await api.setCartItem(product.id, newQty);
          if (res?.data?.items && Array.isArray(res.data.items)) {
            const mapped = res.data.items
              .filter(Boolean)
              .map((bi: any, idx: number) => mapBackendItemToCartItem(bi, idx));
            itemsRef.current = mapped;
            setItems(mapped);
            AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mapped)).catch(() => {});
          }
        } catch (err: any) {
          console.log('[CartContext] addToCart backend sync error:', err?.message);
          notify(err?.message || 'Could not add item to basket', 'error');
          syncCartWithBackend();
        }
      }
    },
    [notify, syncCartWithBackend]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number, variantId?: string) => {
      const currentItems = itemsRef.current;
      const validQty = Math.max(0, Math.floor(quantity));
      const cleanProdId = String(productId || '').replace(/_default$/, '').trim();

      const isMatch = (item: CartItem) => {
        const itemCleanId = String(item.productId || item.id || '').replace(/_default$/, '').trim();
        const prodMatch =
          item.productId === cleanProdId ||
          item.id === cleanProdId ||
          item.id === `${cleanProdId}_default` ||
          itemCleanId === cleanProdId;
        const varMatch = variantId
          ? item.variantId === variantId
          : (!item.variantId || item.variantId === 'default');
        return prodMatch && varMatch;
      };

      // Optimistic local update
      let nextItems: CartItem[];
      if (validQty <= 0) {
        nextItems = currentItems.filter(i => !isMatch(i));
      } else {
        nextItems = currentItems.map(i => {
          if (isMatch(i)) {
            return { ...i, quantity: validQty };
          }
          return i;
        });
      }

      itemsRef.current = nextItems;
      setItems(nextItems);
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems)).catch(() => {});

      // Sync with backend if logged in and valid product ID
      if (userRef.current && cleanProdId) {
        try {
          const res = await api.setCartItem(cleanProdId, validQty);
          if (res?.data?.items && Array.isArray(res.data.items)) {
            const mapped = res.data.items
              .filter(Boolean)
              .map((bi: any, idx: number) => mapBackendItemToCartItem(bi, idx));
            itemsRef.current = mapped;
            setItems(mapped);
            AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mapped)).catch(() => {});
          }
        } catch (err: any) {
          console.log('[CartContext] updateQuantity backend sync error:', err?.message);
          // Only show error and revert if user was trying to INCREASE or set active quantity
          if (validQty > 0) {
            notify(err?.message || 'Could not update item', 'error');
            syncCartWithBackend();
          }
        }
      }
    },
    [notify, syncCartWithBackend]
  );

  const deleteItem = useCallback(
    (productId: string, variantId?: string) => {
      const cleanProdId = String(productId || '').replace(/_default$/, '').trim();
      updateQuantity(cleanProdId, 0, variantId);
    },
    [updateQuantity]
  );

  const removeFromCart = useCallback(
    (productId: string, variantId?: string) => {
      const currentItems = itemsRef.current;
      const cleanProdId = String(productId || '').replace(/_default$/, '').trim();
      const isMatch = (item: CartItem) => {
        const itemCleanId = String(item.productId || item.id || '').replace(/_default$/, '').trim();
        const prodMatch =
          item.productId === cleanProdId ||
          item.id === cleanProdId ||
          item.id === `${cleanProdId}_default` ||
          itemCleanId === cleanProdId;
        const varMatch = variantId ? item.variantId === variantId : (!item.variantId || item.variantId === 'default');
        return prodMatch && varMatch;
      };
      const existing = currentItems.find(isMatch) || currentItems.find(i => i.productId === cleanProdId || i.id === cleanProdId);
      if (!existing) return;
      const newQty = existing.quantity - 1;
      updateQuantity(cleanProdId, Math.max(0, newQty), variantId);
    },
    [updateQuantity]
  );

  const clearCart = useCallback(async () => {
    itemsRef.current = [];
    setItems([]);
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify([])).catch(() => {});
    if (userRef.current) {
      try {
        await api.clearCart();
      } catch (err: any) {
        console.log('[CartContext] clearCart backend sync error:', err?.message);
      }
    }
  }, [notify]);

  const getItemQuantity = useCallback((productId: string, variantId?: string): number => {
    const cleanProdId = String(productId || '').replace(/_default$/, '').trim();
    if (!cleanProdId) return 0;

    // 1. Exact match
    const isMatch = (item: CartItem) => {
      const itemCleanId = String(item.productId || item.id || '').replace(/_default$/, '').trim();
      const prodMatch =
        item.productId === cleanProdId ||
        item.id === cleanProdId ||
        item.id === `${cleanProdId}_default` ||
        itemCleanId === cleanProdId;
      const varMatch = variantId ? item.variantId === variantId : (!item.variantId || item.variantId === 'default');
      return prodMatch && varMatch;
    };
    const found = itemsRef.current.find(isMatch) || itemsRef.current.find(i => i.productId === cleanProdId || i.id === cleanProdId);
    if (found) return found.quantity;

    // 2. Sibling variant match (if general card check without variantId)
    if (!variantId) {
      const cached = dataCache.getProductById(cleanProdId);
      if (cached?.variantGroupId) {
        const siblingItems = itemsRef.current.filter(i => {
          const itemProd = dataCache.getProductById(String(i.productId || i.id || '').replace(/_default$/, '').trim());
          return itemProd?.variantGroupId === cached.variantGroupId;
        });
        if (siblingItems.length > 0) {
          return siblingItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        }
      }
    }
    return 0;
  }, []);

  // Dynamic delivery settings fetched from backend
  const [deliverySettings, setDeliverySettings] = useState<{ deliveryFee: number; freeDeliveryThreshold: number }>({
    deliveryFee: 20,
    freeDeliveryThreshold: 499,
  });

  useEffect(() => {
    api
      .getDelivery()
      .then(res => {
        if (res?.data?.settings) {
          setDeliverySettings({
            deliveryFee: Number(res.data.settings.deliveryFee ?? 20),
            freeDeliveryThreshold: Number(res.data.settings.freeDeliveryThreshold ?? 499),
          });
        }
      })
      .catch(() => {});
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0),
    [items]
  );
  const itemTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (Math.max(0, Number(item?.price)) || 0) * (Math.max(0, Number(item?.quantity)) || 0),
        0
      ),
    [items]
  );
  const deliveryFee = itemTotal >= deliverySettings.freeDeliveryThreshold || itemTotal === 0 ? 0 : deliverySettings.deliveryFee;
  const grandTotal = itemTotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        deleteItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        syncCartWithBackend,
        isSyncing,
        isInitialized,
        totalItems,
        itemTotal,
        deliveryFee,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
