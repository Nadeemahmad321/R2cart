import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { dataCache } from '../../services/dataCache';
import { Address, Category } from '../../types';
import { AddressCardSkeleton, CartScreenSkeleton, Skeleton } from '../../components/common/Skeleton';

const INSTRUCTION_PRESETS = [
  { id: 'no-bell', label: "Don't ring bell", sub: 'Avoid disturbing', icon: 'bell-off' },
  { id: 'at-door', label: 'Leave at door', sub: 'No-contact drop', icon: 'home' },
  { id: 'call-first', label: 'Call on arrival', sub: 'Before ringing', icon: 'phone' },
  { id: 'with-guard', label: 'Leave with guard', sub: 'At security gate', icon: 'shield' },
];

const TIP_OPTIONS = [0, 10, 20, 30, 50];

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAvailableBookingDates(limit = 4) {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < limit; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const id = formatYMD(d);
    const isToday = i === 0;
    const isTomorrow = i === 1;
    const dayName = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    dates.push({
      id,
      dayName,
      dateFormatted,
      label: `${dayName}, ${dateFormatted}`,
      isToday,
      isTomorrow,
    });
  }
  return dates;
}

interface CartItemRowProps {
  item: any;
  isLast: boolean;
  onUpdateQty: (productId: string, quantity: number, variantId?: string) => void;
  onDelete: (productId: string, variantId?: string) => void;
}

const CartItemRow = React.memo(({ item, isLast, onUpdateQty, onDelete }: CartItemRowProps) => {
  const { t, tProd, lang } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const rawImg = item?.imageUrl || '';
  const isValidUrl =
    !imgError &&
    typeof rawImg === 'string' &&
    rawImg.trim().length > 0 &&
    (rawImg.startsWith('http://') || rawImg.startsWith('https://'));

  const price = Math.max(0, Number(item?.price) || 0);
  const qty = Math.max(1, Number(item?.quantity) || 1);
  const targetId = String(item?.productId || item?.id || '').replace(/_default$/, '').trim();

  // Dynamic Out of Stock & Coming Soon detection
  const cachedProd = dataCache.getProductById(targetId);
  const isSoon = dataCache.isProductComingSoon(cachedProd || item);
  const stock = item?.stock !== undefined ? Number(item.stock) : (cachedProd?.stock !== undefined ? Number(cachedProd.stock) : undefined);
  const status = item?.status || cachedProd?.status;
  const isOutOfStock = !isSoon && ((stock !== undefined && stock <= 0) || status === 'INACTIVE');
  const isLowStock = !isSoon && !isOutOfStock && stock !== undefined && stock > 0 && stock < qty;
  const minOrderQty = Math.max(1, Number(item?.minOrderQty || cachedProd?.minOrderQty) || 1);
  const isUnderMinQty = !isSoon && !isOutOfStock && minOrderQty > 1 && qty < minOrderQty;

  return (
    <View style={[styles.itemFlatRow, isLast && { borderBottomWidth: 0 }, isOutOfStock && styles.itemFlatRowOos]}>
      <View style={styles.itemImgWrap}>
        {isValidUrl ? (
          <Image
            source={{ uri: rawImg }}
            style={[styles.itemImg, (isOutOfStock || isSoon) && { opacity: 0.45 }]}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Feather name="package" size={22} color="#94A3B8" />
        )}
        {isOutOfStock ? (
          <View style={styles.itemImgOosBadge}>
            <Text style={styles.itemImgOosText}>OOS</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, (isOutOfStock || isSoon) && { color: '#64748B' }]} numberOfLines={2}>
          {tProd(item) || 'Product'}
        </Text>
        {item?.unit ? <Text style={styles.itemUnit}>{item.unit}</Text> : null}

        {/* Warning Badges */}
        {isOutOfStock ? (
          <View style={styles.cartOosTag}>
            <Feather name="alert-circle" size={11} color="#DC2626" style={{ marginRight: 3.5 }} />
            <Text style={styles.cartOosTagText}>
              {t('outOfStock', 'Out of stock!')} · {t('pleaseRemove', 'Please remove')}
            </Text>
          </View>
        ) : isSoon ? (
          <View style={styles.cartSoonTag}>
            <Feather name="clock" size={11} color="#B45309" style={{ marginRight: 3.5 }} />
            <Text style={styles.cartSoonTagText}>
              {t('comingSoon', 'Coming Soon')} · {t('removeToCheckout', 'Remove to checkout')}
            </Text>
          </View>
        ) : isLowStock ? (
          <View style={styles.cartLowTag}>
            <Feather name="alert-triangle" size={11} color="#D97706" style={{ marginRight: 3.5 }} />
            <Text style={styles.cartLowTagText}>
              Only {stock} left in stock
            </Text>
          </View>
        ) : null}

        {isUnderMinQty ? (
          <View style={styles.cartMinQtyTag}>
            <Feather name="alert-circle" size={11} color="#B91C1C" style={{ marginRight: 3.5 }} />
            <Text style={styles.cartMinQtyTagText}>
              {lang === 'hi'
                ? `न्यूनतम ${minOrderQty} यूनिट चाहिए (${minOrderQty - qty} और जोड़ें)`
                : `Min ${minOrderQty} units required (Add ${minOrderQty - qty} more to order)`}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.itemPrice, (isOutOfStock || isSoon) && { color: '#94A3B8' }]}>₹{price}</Text>
      </View>

      {/* Stepper or Remove Button */}
      {isOutOfStock || isSoon ? (
        <TouchableOpacity
          style={styles.cartRemoveItemBtn}
          onPress={() => onDelete(targetId, item?.variantId)}
          activeOpacity={0.75}
        >
          <Feather name="trash-2" size={13} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={styles.cartRemoveItemText}>{t('remove', 'Remove')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => onUpdateQty(targetId, qty - 1, item?.variantId)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Feather
                name={qty === 1 ? 'trash-2' : 'minus'}
                size={13}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.stepperVal}>{qty}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => onUpdateQty(targetId, qty + 1, item?.variantId)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.cartDirectTrashBtn}
            onPress={() => onDelete(targetId, item?.variantId)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
            accessibilityLabel="Remove item from basket"
          >
            <Feather name="trash-2" size={13} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export const CartScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const appliedCodeFromRoute = route?.params?.appliedCode;
  const { items, updateQuantity, deleteItem, clearCart, itemTotal, syncCartWithBackend, isSyncing, isInitialized } = useCart();
  const { user } = useAuth();
  const { notify } = useToast();
  const { t, tProd, tCat, prefetchTranslations } = useLanguage();

  const validItems = useMemo(
    () => (Array.isArray(items) ? items.filter(i => i && (i.productId || i.id)) : []),
    [items]
  );

  useEffect(() => {
    if (validItems.length > 0) {
      prefetchTranslations(validItems.map((i: any) => i.name).filter(Boolean));
    }
  }, [validItems, prefetchTranslations]);

  const [pullRefreshing, setPullRefreshing] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState<boolean>(false);
  const [clearModalVisible, setClearModalVisible] = useState<boolean>(false);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);

  // Delivery Mode & Scheduling
  const [deliveryType, setDeliveryType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT');
  const [advanceDays, setAdvanceDays] = useState<number>(4);
  const bookingDates = useMemo(() => getAvailableBookingDates(advanceDays), [advanceDays]);
  const [selectedDate, setSelectedDate] = useState<string>(formatYMD(new Date()));
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState<boolean>(false);

  // Store Schedule & Operational Status synced with Backend
  const [storeSchedule, setStoreSchedule] = useState<{
    allowImmediateOrders: boolean;
    allowScheduledOrders: boolean;
    isOpenNow: boolean;
    statusReason?: string;
    nextAvailableOpening?: { label?: string; time?: string; date?: string };
    storeStatus?: string;
  }>({
    allowImmediateOrders: true,
    allowScheduledOrders: true,
    isOpenNow: true,
  });

  const fetchSlots = useCallback(async (dateStr?: string) => {
    const dateToQuery = dateStr || selectedDate;
    setLoadingSlots(true);
    try {
      const res = await api.getDeliverySlots(dateToQuery);
      const list = Array.isArray(res.data) ? res.data : [];
      setSlots(list);
      setSelectedSlot((prev: any) => {
        if (prev && list.some((s: any) => s.id === prev.id && s.isAvailable)) return prev;
        return list.find((s: any) => s.isAvailable) || null;
      });
    } catch {
      setSlots([]);
      setSelectedSlot(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate]);

  const fetchStoreSchedule = useCallback(async () => {
    try {
      const res = await api.getSettings();
      const effective = res.data?.effectiveStatus;
      const adv = Number(effective?.advanceBookingDays || res.data?.advanceBookingDays || 4);
      if (adv > 0) {
        setAdvanceDays(adv);
      }
      if (effective) {
        const canImmediate = Boolean(effective.allowImmediateOrders);
        const canScheduled = Boolean(effective.allowScheduledOrders);
        setStoreSchedule({
          allowImmediateOrders: canImmediate,
          allowScheduledOrders: canScheduled,
          isOpenNow: Boolean(effective.isOpenNow),
          statusReason: effective.statusReason,
          nextAvailableOpening: effective.nextAvailableOpening,
          storeStatus: effective.storeStatus || effective.status,
        });

        // If instant delivery is currently closed/disabled, switch automatically to SCHEDULED
        if (!canImmediate) {
          setDeliveryType('SCHEDULED');
          fetchSlots();
        }
      }
    } catch {
      // Keep defaults
    }
  }, [fetchSlots]);

  // Dynamic backend delivery data (villages, areas, settings)
  const [deliveryData, setDeliveryData] = useState<{
    villages?: any[];
    areas?: any[];
    settings?: any;
  } | null>(null);

  // Resolve dynamic delivery rules based on selected delivery address & backend coverage
  const deliveryRules = useMemo(() => {
    const isPanIndiaCart = validItems.length > 0 && validItems.every(i => i.deliveryScope === 'PAN_INDIA');
    if (isPanIndiaCart) {
      const totalShippingFee = validItems.reduce((acc, itm) => acc + (Number(itm.shippingFee) || 0), 0);
      return {
        freeDeliveryThreshold: 0,
        deliveryFee: totalShippingFee,
        estimatedDelivery: '5-10 Business Days (Courier)',
        isCourier: true,
      };
    }

    const settings = deliveryData?.settings || (deliveryData as any) || {};
    const fallbackThreshold = Number(settings.freeDeliveryThreshold ?? 499);
    const fallbackFee = Number(settings.deliveryFee ?? 20);
    const fallbackEta = settings.estimatedDelivery || dataCache.getEstimatedDelivery('20-30 mins');

    if (!selectedAddress || !deliveryData) {
      return {
        freeDeliveryThreshold: fallbackThreshold,
        deliveryFee: fallbackFee,
        estimatedDelivery: fallbackEta,
        isCourier: false,
      };
    }

    const addrArea = (selectedAddress.area || selectedAddress.city || selectedAddress.street || '').trim().toLowerCase();
    const addrPin = (selectedAddress.pincode || selectedAddress.pin || '').trim();

    // 1. Try matching villages
    const villages = Array.isArray(deliveryData.villages) ? deliveryData.villages : [];
    const matchedVillage = villages.find((v: any) => {
      const vName = String(v.name || '').trim().toLowerCase();
      const vPin = String(v.pincode || '').trim();
      return (vName && (addrArea.includes(vName) || vName.includes(addrArea))) || (addrPin && vPin === addrPin);
    });

    if (matchedVillage) {
      return {
        freeDeliveryThreshold: Number(matchedVillage.freeDeliveryThreshold ?? fallbackThreshold),
        deliveryFee: Number(matchedVillage.deliveryFee ?? fallbackFee),
        estimatedDelivery: matchedVillage.estimatedMinutes ? `${matchedVillage.estimatedMinutes} mins` : fallbackEta,
        isCourier: false,
      };
    }

    // 2. Try matching areas
    const areas = Array.isArray(deliveryData.areas) ? deliveryData.areas : [];
    const matchedArea = areas.find((a: any) => {
      const aName = String(a.name || '').trim().toLowerCase();
      const matchName = aName && (addrArea.includes(aName) || aName.includes(addrArea));
      const matchLocality = Array.isArray(a.localities) && a.localities.some((loc: string) => {
        const l = String(loc).trim().toLowerCase();
        return l && (addrArea.includes(l) || l.includes(addrArea));
      });
      return matchName || matchLocality;
    });

    if (matchedArea) {
      return {
        freeDeliveryThreshold: Number(matchedArea.freeDeliveryThreshold ?? fallbackThreshold),
        deliveryFee: Number(matchedArea.deliveryFee ?? fallbackFee),
        estimatedDelivery: matchedArea.estimatedMinutes ? `${matchedArea.estimatedMinutes} mins` : fallbackEta,
        isCourier: false,
      };
    }

    return {
      freeDeliveryThreshold: fallbackThreshold,
      deliveryFee: fallbackFee,
      estimatedDelivery: fallbackEta,
      isCourier: false,
    };
  }, [deliveryData, selectedAddress, validItems]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState<string>(appliedCodeFromRoute || '');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState<boolean>(false);

  const [instructions, setInstructions] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState<string>('');
  const [tip, setTip] = useState<number>(0);
  const [placing, setPlacing] = useState<boolean>(false);

  // Fetch real addresses from backend
  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const res = await api.getAddresses();
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setAddresses(list);
      if (list.length > 0) {
        const paramId = route?.params?.selectedAddressId;
        const paramAddr = paramId ? list.find((a: any) => a.id === paramId) : null;
        const defaultAddr = list.find((a: any) => a.isDefault || a.default) || list[0];
        setSelectedAddress(paramAddr || defaultAddr);
      } else {
        setSelectedAddress(null);
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoadingAddresses(false);
    }
  }, [user]);

  // Fetch dynamic coupons, delivery rules, store schedule, and categories
  useEffect(() => {
    fetchAddresses();
    fetchStoreSchedule();

    api.getCoupons()
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setAvailableCoupons(list.filter((c: any) => c.status === 'ACTIVE' || c.displayStatus === 'Available'));
      })
      .catch(() => {});

    api.getDelivery()
      .then(res => {
        if (res.data) {
          setDeliveryData(res.data);
        }
      })
      .catch(() => {});

    api.getCategories()
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setCategories(res.data.slice(0, 8));
        }
      })
      .catch(() => {});
  }, [fetchAddresses]);

  // If appliedCode was passed from route, validate it immediately
  useEffect(() => {
    if (appliedCodeFromRoute) {
      applyCouponCode(appliedCodeFromRoute);
    }
  }, [appliedCodeFromRoute]);

  // Automatically sync cart and addresses with backend when navigating into CartScreen
  useFocusEffect(
    useCallback(() => {
      syncCartWithBackend();
      fetchAddresses();
    }, [syncCartWithBackend, fetchAddresses])
  );

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.allSettled([
        syncCartWithBackend(),
        fetchAddresses(),
        fetchStoreSchedule(),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [syncCartWithBackend, fetchAddresses, fetchStoreSchedule]);

  const toggleInstruction = (label: string) => {
    if (instructions.includes(label)) {
      setInstructions(instructions.filter(x => x !== label));
    } else {
      setInstructions([...instructions, label]);
    }
  };

  const applyCouponCode = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      notify('Please enter a coupon code.', 'info');
      return;
    }
    if (!user) {
      notify('Please sign in to apply coupon offers.', 'info');
      navigation.navigate('CustomerLogin');
      return;
    }

    setValidatingCoupon(true);
    try {
      const res = await api.validateCoupon(code);
      const discountVal = Number(res.data?.discount || res.data?.discountAmount || 0);
      setDiscountAmount(discountVal);
      setAppliedCoupon({ code, discount: discountVal });
      setCouponCode(code);
      notify(`Coupon Applied! You saved ₹${discountVal} with ${code}`, 'success');
    } catch (err: any) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      notify(err.message || 'This coupon is not valid or has expired.', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
  };

  // Dynamic free delivery calculation from backend settings
  const diffForFree = Math.max(0, deliveryRules.freeDeliveryThreshold - itemTotal);
  const freePercent = Math.min(100, Math.round((itemTotal / deliveryRules.freeDeliveryThreshold) * 100));
  const effectiveDeliveryFee = itemTotal >= deliveryRules.freeDeliveryThreshold ? 0 : deliveryRules.deliveryFee;
  const finalTotal = Math.max(0, itemTotal + effectiveDeliveryFee + tip - discountAmount);

  // Dynamic Out of Stock / Coming Soon check for items in basket
  const hasOutOfStockItems = useMemo(() => {
    return validItems.some(i => {
      const targetId = String(i.productId || i.id || '').replace(/_default$/, '').trim();
      const cached = dataCache.getProductById(targetId);
      const isSoon = dataCache.isProductComingSoon(cached || i);
      const stock = i?.stock !== undefined ? Number(i.stock) : (cached?.stock !== undefined ? Number(cached.stock) : undefined);
      const status = i?.status || cached?.status;
      return !isSoon && ((stock !== undefined && stock <= 0) || status === 'INACTIVE');
    });
  }, [validItems]);

  const hasComingSoonItems = useMemo(() => {
    return validItems.some(i => {
      const targetId = String(i.productId || i.id || '').replace(/_default$/, '').trim();
      const cached = dataCache.getProductById(targetId);
      return dataCache.isProductComingSoon(cached || i);
    });
  }, [validItems]);

  const hasUnavailableItems = hasOutOfStockItems || hasComingSoonItems;

  const handlePlaceOrder = async () => {
    if (validItems.length === 0) {
      notify('Please add items to your basket first.', 'info');
      return;
    }

    if (hasOutOfStockItems) {
      notify('Some items in your basket are out of stock. Please remove them to proceed.', 'error');
      return;
    }

    if (hasComingSoonItems) {
      notify('Some items in your basket are coming soon. Please remove them to proceed.', 'error');
      return;
    }

    const underMinQtyItem = validItems.find((p) => {
      const targetId = String(p.productId || p.id).replace(/_default$/, '').trim();
      const cached = dataCache.getProductById(targetId);
      const minQty = Math.max(1, Number(p.minOrderQty || cached?.minOrderQty) || 1);
      return minQty > 1 && p.quantity < minQty;
    });
    if (underMinQtyItem) {
      const targetId = String(underMinQtyItem.productId || underMinQtyItem.id).replace(/_default$/, '').trim();
      const cached = dataCache.getProductById(targetId);
      const minQty = Math.max(1, Number(underMinQtyItem.minOrderQty || cached?.minOrderQty) || 1);
      const needed = minQty - underMinQtyItem.quantity;
      notify(
        `"${underMinQtyItem.name}" requires minimum ${minQty} units to place order. Please add ${needed} more unit${needed > 1 ? 's' : ''}.`,
        'error'
      );
      return;
    }

    if (!user) {
      notify('Please sign in to place your order.', 'info');
      navigation.navigate('CustomerLogin');
      return;
    }

    if (!selectedAddress || !selectedAddress.id) {
      notify('Please add or select a delivery address before placing your order.', 'info');
      navigation.navigate('Addresses');
      return;
    }

    setPlacing(true);
    try {
      const combinedInstructions = [
        ...instructions,
        customNote.trim() ? `Note: ${customNote.trim()}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      if (!deliveryRules.isCourier && deliveryType === 'INSTANT' && !storeSchedule.allowImmediateOrders) {
        notify(
          storeSchedule.statusReason || 'Store is currently closed for instant delivery. Please select a scheduled delivery slot.',
          'error'
        );
        setDeliveryType('SCHEDULED');
        setPlacing(false);
        return;
      }

      if (deliveryType === 'SCHEDULED' && (!selectedDate || !selectedSlot)) {
        notify('Please choose a delivery date and time slot for your scheduled delivery.', 'info');
        setPlacing(false);
        return;
      }

      const orderPayload = {
        addressId: selectedAddress.id,
        items: validItems.map(i => ({
          productId: i.productId,
          quantity: Math.max(1, Number(i.quantity) || 1),
        })),
        couponCode: appliedCoupon?.code || undefined,
        deliveryInstruction: combinedInstructions || undefined,
        paymentMethod: 'COD',
        deliveryType,
        deliveryDate: deliveryType === 'SCHEDULED' ? selectedDate : undefined,
        deliverySlot: deliveryType === 'SCHEDULED' ? (selectedSlot?.label || selectedSlot?.id) : undefined,
      };

      const res = await api.checkout(orderPayload);
      clearCart();
      navigation.replace('OrderSuccess', {
        orderId: res.data?.id,
        orderNumber: res.data?.orderNumber,
        totalAmount: finalTotal,
      });
    } catch (err: any) {
      notify(err.message || 'Could not complete your order. Please try again.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  const handleClearAll = useCallback(() => {
    setClearModalVisible(true);
  }, []);

  const handleConfirmClear = async () => {
    try {
      setClearModalVisible(false);
      removeCoupon();
      await clearCart();
      notify(t('cartCleared', 'Basket cleared successfully'), 'success');
    } catch (err: any) {
      console.log('[CartScreen] Error clearing cart:', err);
    }
  };

  const formatAddressSummary = (addr: Address) => {
    if (!addr) return '';
    const village = ((addr as any).village || (addr as any).villageName || addr.area || '').trim();
    const rawLandmark = (addr.landmark || '').trim();
    const landmark = rawLandmark
      ? (rawLandmark.toLowerCase().startsWith('near') ? rawLandmark : `Near ${rawLandmark}`)
      : '';
    const houseStreet = [addr.house || addr.houseNo, addr.street]
      .filter(Boolean)
      .map(s => String(s).trim())
      .filter(Boolean)
      .join(', ');

    const parts: string[] = [];
    if (village) {
      parts.push(village);
    }
    if (landmark) {
      parts.push(landmark);
    }
    if (houseStreet) {
      parts.push(houseStreet);
    }

    return parts.length > 0 ? parts.join(', ') : 'Delivery Address';
  };

  const keyExtractor = useCallback((item: any, index: number) => {
    return String(item?.id || item?.productId || index);
  }, []);

  const renderCartItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16 }}>
        <CartItemRow
          item={item}
          isLast={index === validItems.length - 1}
          onUpdateQty={updateQuantity}
          onDelete={deleteItem}
        />
      </View>
    ),
    [validItems.length, updateQuantity, deleteItem]
  );

  const renderHeader = useCallback(
    () => (
      <>
        {/* Top Compact Delivery Address Card */}
        <View style={styles.topAddressSection}>
          <View style={styles.topAddressCard}>
            {loadingAddresses && !selectedAddress ? (
              <View style={styles.compactAddressRow}>
                <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 9 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Skeleton width="45%" height={12} borderRadius={4} />
                  <Skeleton width="85%" height={11} borderRadius={4} />
                </View>
                <Skeleton width={52} height={22} borderRadius={6} />
              </View>
            ) : selectedAddress ? (
              <View style={styles.compactAddressRow}>
                <View style={styles.compactAddressIconCircle}>
                  <Feather
                    name={
                      selectedAddress?.type?.toLowerCase() === 'work' ||
                      selectedAddress?.type?.toLowerCase() === 'office'
                        ? 'briefcase'
                        : 'map-pin'
                    }
                    size={14}
                    color="#059669"
                  />
                </View>

                <View style={styles.compactAddressInfo}>
                  <View style={styles.compactAddressTagRow}>
                    <View style={styles.topAddressTagPill}>
                      <Text style={styles.topAddressTagText}>
                        {selectedAddress?.type ? selectedAddress.type.toUpperCase() : 'HOME'}
                      </Text>
                    </View>
                    <Text style={styles.compactReceiverText} numberOfLines={1}>
                      {selectedAddress.name || selectedAddress.fullName || user?.name || 'Customer'}
                      {selectedAddress.mobile || selectedAddress.phone
                        ? ` | +91 ${selectedAddress.mobile || selectedAddress.phone}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.compactAddressText} numberOfLines={2}>
                    {formatAddressSummary(selectedAddress)}
                  </Text>
                </View>

                {addresses.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setAddressModalVisible(true)}
                    style={styles.compactChangeBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.compactChangeText}>CHANGE</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.compactAddAddressRow}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Addresses')}
              >
                <View style={styles.compactAddressIconCircle}>
                  <Feather name="plus" size={15} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: 9 }}>
                  <Text style={styles.compactAddTitle}>Add Delivery Address</Text>
                  <Text style={styles.compactAddSub}>Select or add an address to proceed</Text>
                </View>
                <View style={styles.compactAddBtnBadge}>
                  <Text style={styles.compactAddBtnText}>+ ADD</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Delivery Preference (Instant vs Schedule) - Compact Design */}
        <View style={styles.deliveryModeSection}>
          <View style={styles.deliveryModeHeaderRow}>
            <View style={styles.rowAlign}>
              <View style={styles.headerIconWrap}>
                <Feather name="truck" size={12} color="#059669" />
              </View>
              <Text style={styles.deliveryModeTitle}>Delivery Speed</Text>
            </View>
            {!storeSchedule.allowImmediateOrders ? (
              <View style={[styles.deliveryModeBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Feather name="moon" size={10} color="#D97706" style={{ marginRight: 3 }} />
                <Text style={[styles.deliveryModeBadgeText, { color: '#B45309' }]}>
                  Instant Closed
                </Text>
              </View>
            ) : (
              <View style={styles.deliveryModeBadge}>
                <Feather
                  name={deliveryType === 'INSTANT' ? 'zap' : 'calendar'}
                  size={10}
                  color="#059669"
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.deliveryModeBadgeText}>
                  {deliveryType === 'INSTANT' ? (deliveryRules.estimatedDelivery || '15-20 Mins') : 'Scheduled Slot'}
                </Text>
              </View>
            )}
          </View>

          {/* Store Closed Notice Banner (if Instant is not allowed) */}
          {!storeSchedule.allowImmediateOrders && (
            <View style={styles.storeClosedNoticeBanner}>
              <Feather name="moon" size={12} color="#D97706" style={{ marginTop: 1, marginRight: 6 }} />
              <Text style={styles.storeClosedNoticeSub} numberOfLines={2}>
                {storeSchedule.nextAvailableOpening?.label
                  ? `Instant delivery opens ${storeSchedule.nextAvailableOpening.label}. Please select a scheduled slot.`
                  : storeSchedule.statusReason || 'Instant delivery is currently closed. Please choose a slot below.'}
              </Text>
            </View>
          )}

          {/* Instant vs Schedule Selectable Cards - Compact Layout */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[
                styles.modeOptionBtn,
                deliveryType === 'INSTANT' && styles.modeOptionBtnActive,
                !storeSchedule.allowImmediateOrders && styles.modeOptionBtnDisabled,
              ]}
              disabled={!storeSchedule.allowImmediateOrders}
              activeOpacity={0.85}
              onPress={() => setDeliveryType('INSTANT')}
            >
              <View
                style={[
                  styles.modeIconWrap,
                  deliveryType === 'INSTANT' && styles.modeIconWrapActive,
                  !storeSchedule.allowImmediateOrders && { backgroundColor: '#F1F5F9' },
                ]}
              >
                <Feather
                  name="zap"
                  size={13}
                  color={
                    !storeSchedule.allowImmediateOrders
                      ? '#94A3B8'
                      : deliveryType === 'INSTANT'
                      ? '#FFFFFF'
                      : '#059669'
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modeBtnTitle,
                    deliveryType === 'INSTANT' && styles.modeBtnTitleActive,
                    !storeSchedule.allowImmediateOrders && { color: '#94A3B8' },
                  ]}
                  numberOfLines={1}
                >
                  Instant
                </Text>
                <Text
                  style={[
                    styles.modeBtnSub,
                    deliveryType === 'INSTANT' && styles.modeBtnSubActive,
                    !storeSchedule.allowImmediateOrders && { color: '#EF4444' },
                  ]}
                  numberOfLines={1}
                >
                  {!storeSchedule.allowImmediateOrders ? 'Closed' : deliveryRules.estimatedDelivery || '15-20 mins'}
                </Text>
              </View>
              <View
                style={[
                  styles.radioCircle,
                  deliveryType === 'INSTANT' && styles.radioCircleActive,
                  !storeSchedule.allowImmediateOrders && styles.radioCircleDisabled,
                ]}
              >
                {deliveryType === 'INSTANT' && <Feather name="check" size={9} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeOptionBtn,
                deliveryType === 'SCHEDULED' && styles.modeOptionBtnActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setDeliveryType('SCHEDULED');
                if (!slots.length) fetchSlots(selectedDate);
              }}
            >
              <View style={[styles.modeIconWrap, deliveryType === 'SCHEDULED' && styles.modeIconWrapActive]}>
                <Feather name="calendar" size={13} color={deliveryType === 'SCHEDULED' ? '#FFFFFF' : '#059669'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.modeBtnTitle, deliveryType === 'SCHEDULED' && styles.modeBtnTitleActive]}
                  numberOfLines={1}
                >
                  Schedule
                </Text>
                <Text
                  style={[styles.modeBtnSub, deliveryType === 'SCHEDULED' && styles.modeBtnSubActive]}
                  numberOfLines={1}
                >
                  Choose Slot
                </Text>
              </View>
              <View style={[styles.radioCircle, deliveryType === 'SCHEDULED' && styles.radioCircleActive]}>
                {deliveryType === 'SCHEDULED' && <Feather name="check" size={9} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          </View>

          {/* When SCHEDULED is selected: Date & Time Slot Picker */}
          {deliveryType === 'SCHEDULED' && (
            <View style={styles.scheduledPickerBox}>
              <View style={styles.pickerTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="calendar" size={12} color="#059669" />
                  <Text style={styles.pickerHeading}>Select Delivery Date</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.datePickerRow}
                contentContainerStyle={{ paddingVertical: 2 }}
              >
                {bookingDates.map((d: any) => {
                  const isSel = selectedDate === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.dateChip, isSel && styles.dateChipActive]}
                      onPress={() => {
                        setSelectedDate(d.id);
                        fetchSlots(d.id);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.dateChipDay, isSel && styles.dateChipDayActive]}>{d.dayName}</Text>
                      <Text style={[styles.dateChipNum, isSel && styles.dateChipNumActive]}>{d.dateFormatted}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.pickerTitleRow, { marginTop: 14 }]}>
                <Feather name="clock" size={12} color="#059669" />
                <Text style={styles.pickerHeading}>Select Preferred Slot</Text>
              </View>

              {loadingSlots ? (
                <View style={{ flexDirection: 'row', paddingVertical: 10, gap: 8 }}>
                  <Skeleton width={105} height={38} borderRadius={8} />
                  <Skeleton width={105} height={38} borderRadius={8} />
                  <Skeleton width={105} height={38} borderRadius={8} />
                </View>
              ) : slots.length === 0 ? (
                <View style={styles.noSlotsBox}>
                  <Feather name="clock" size={16} color="#94A3B8" />
                  <Text style={styles.noSlotsText}>No slots available for this date. Please try another day.</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map(s => {
                    const isAvailable = Boolean(s.isAvailable);
                    const isSel = selectedSlot?.id === s.id;
                    const slotTitle = (s.label || '').replace(/\s*\([^)]*\)/g, '').trim() || s.name || 'Slot';
                    const timeRange = s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : (s.time || '');
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.slotCard,
                          isSel && styles.slotCardActive,
                          !isAvailable && styles.slotCardDisabled,
                        ]}
                        disabled={!isAvailable}
                        onPress={() => setSelectedSlot(s)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.slotCardTop}>
                          <Text
                            style={[
                              styles.slotTitleText,
                              isSel && styles.slotTitleTextActive,
                              !isAvailable && { color: '#94A3B8' },
                            ]}
                            numberOfLines={1}
                          >
                            {slotTitle}
                          </Text>
                          {isSel && (
                            <View style={styles.slotCheckMark}>
                              <Feather name="check" size={9} color="#FFFFFF" />
                            </View>
                          )}
                          {!isAvailable && (
                            <View style={styles.slotFullBadge}>
                              <Feather name="slash" size={8} color="#DC2626" style={{ marginRight: 2 }} />
                              <Text style={styles.slotFullBadgeText}>{s.isFull ? 'Full' : 'Closed'}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.slotTimeRow}>
                          <Feather name="clock" size={10} color={isSel ? '#047857' : '#64748B'} />
                          <Text style={[styles.slotTimeText, isSel && styles.slotTimeTextActive]}>{timeRange}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Delivery ETA & Free Delivery Progress Bar (Flat Integrated) */}
        <View style={styles.etaBarFlat}>
          <View style={styles.etaBarTop}>
            <View style={styles.etaBadge}>
              <Feather
                name={deliveryType === 'SCHEDULED' ? 'calendar' : 'clock'}
                size={13}
                color="#059669"
              />
              <Text style={styles.etaBadgeText}>
                {deliveryType === 'SCHEDULED'
                  ? selectedSlot
                    ? `${selectedSlot.label || selectedSlot.startTime || 'Scheduled'}`
                    : 'Choose slot above'
                  : deliveryRules.estimatedDelivery}
              </Text>
            </View>
            <View style={styles.freeMeterRow}>
              {diffForFree === 0 ? (
                <>
                  <Feather name="gift" size={12} color="#065F46" style={{ marginRight: 4 }} />
                  <Text style={styles.freeMeterText}>FREE Delivery Unlocked!</Text>
                </>
              ) : (
                <Text style={styles.freeMeterText}>{`Add ₹${diffForFree} more for FREE delivery`}</Text>
              )}
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${freePercent}%` }]} />
          </View>
        </View>

        {/* Flat Section Divider */}
        <View style={styles.flatSectionDivider} />

        {/* Flat Review Items List Header */}
        <View style={[styles.flatSection, { paddingBottom: 0 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('cart', 'Items in Basket')} ({validItems.length})</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs')}>
                <Text style={styles.actionLinkText}>{t('addMore', '+ Add more')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearAll}
                style={styles.clearAllBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="trash-2" size={11} color="#DC2626" style={{ marginRight: 3 }} />
                <Text style={styles.clearAllText}>{t('clearAll', 'Clear All')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Out of Stock / Coming Soon Notice Banner */}
        {hasUnavailableItems && (
          <View style={styles.cartOosBanner}>
            <View style={styles.cartOosBannerIcon}>
              <Feather name="alert-circle" size={17} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartOosBannerTitle}>
                {hasOutOfStockItems ? t('cartOosAlertTitle', 'Items Out of Stock') : t('comingSoon', 'Coming Soon')}
              </Text>
              <Text style={styles.cartOosBannerDesc}>
                {t('cartOosAlertDesc', 'Please remove out of stock items from your basket before placing order.')}
              </Text>
            </View>
          </View>
        )}
      </>
    ),
    [
      loadingAddresses,
      selectedAddress,
      addresses.length,
      user?.name,
      deliveryRules.estimatedDelivery,
      storeSchedule.allowImmediateOrders,
      storeSchedule.nextAvailableOpening?.label,
      storeSchedule.statusReason,
      deliveryType,
      selectedDate,
      slots,
      selectedSlot,
      loadingSlots,
      bookingDates,
      diffForFree,
      freePercent,
      validItems.length,
      hasUnavailableItems,
      hasOutOfStockItems,
      fetchSlots,
      navigation,
    ]
  );

  const renderFooter = useCallback(
    () => (
      <>
        {/* Flat Section Divider */}
        <View style={styles.flatSectionDivider} />

        {/* Enhanced Delivery Instructions (Structured Grid) */}
        <View style={styles.flatSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.rowAlign}>
              <Feather name="file-text" size={15} color={Colors.primaryDark} />
              <Text style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}>
                Delivery Instructions
              </Text>
            </View>
            {instructions.length > 0 && (
              <TouchableOpacity onPress={() => setInstructions([])}>
                <Text style={styles.clearInstructionText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.instructionGrid}>
            {INSTRUCTION_PRESETS.map(preset => {
              const selected = instructions.includes(preset.label);
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.instCard, selected && styles.instCardActive]}
                  onPress={() => toggleInstruction(preset.label)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.instIconWrap, selected && styles.instIconWrapActive]}>
                    <Feather
                      name={preset.icon as any}
                      size={15}
                      color={selected ? Colors.primaryDark : '#64748B'}
                    />
                  </View>
                  <View style={styles.instTextWrap}>
                    <Text
                      style={[styles.instCardTitle, selected && styles.instCardTitleActive]}
                      numberOfLines={1}
                    >
                      {preset.label}
                    </Text>
                    <Text style={styles.instCardSub} numberOfLines={1}>
                      {preset.sub}
                    </Text>
                  </View>
                  {selected && (
                    <View style={styles.instCheckBadge}>
                      <Feather name="check" size={9} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.customNoteWrap}>
            <Feather name="edit-3" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.customNoteInput}
              placeholder="Add specific note (e.g. Landmark, Gate code)"
              placeholderTextColor="#94A3B8"
              value={customNote}
              onChangeText={setCustomNote}
            />
            {customNote.length > 0 && (
              <TouchableOpacity onPress={() => setCustomNote('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Flat Section Divider */}
        <View style={styles.flatSectionDivider} />

        {/* Coupons & Offers (Flat) */}
        <View style={styles.flatSection}>
          <View style={styles.rowAlign}>
            <Feather name="tag" size={15} color={Colors.primaryDark} />
            <Text style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}>
              Coupons & Offers
            </Text>
          </View>

          {appliedCoupon ? (
            <View style={styles.appliedCouponBanner}>
              <View style={styles.appliedLeft}>
                <Feather name="check-circle" size={16} color="#059669" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.appliedCodeText}>{appliedCoupon.code}</Text>
                  <Text style={styles.appliedSavingsText}>₹{appliedCoupon.discount} savings applied</Text>
                </View>
              </View>
              <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponBtn}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code (e.g. WELCOME50)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={setCouponCode}
                />
                <TouchableOpacity
                  style={styles.couponApplyBtn}
                  onPress={() => applyCouponCode()}
                  disabled={validatingCoupon}
                >
                  {validatingCoupon ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.couponApplyText}>APPLY</Text>
                  )}
                </TouchableOpacity>
              </View>

              {availableCoupons.length > 0 && (
                <View style={styles.availableCouponsWrap}>
                  <Text style={styles.availableLabel}>Available Offers:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.couponChipsRow}>
                    {availableCoupons.map((c: any) => (
                      <TouchableOpacity
                        key={c.id || c.code}
                        style={styles.couponChip}
                        onPress={() => applyCouponCode(c.code)}
                      >
                        <Text style={styles.chipCode}>{c.code}</Text>
                        <Text style={styles.chipDesc}>
                          {c.discount ? `Save ₹${c.discount}` : c.description || 'Special Deal'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>

        {/* Flat Section Divider */}
        <View style={styles.flatSectionDivider} />

        {/* Tip Your Delivery Partner */}
        <View style={styles.flatSection}>
          <View style={styles.rowAlign}>
            <Feather name="smile" size={15} color={Colors.primaryDark} />
            <Text style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}>
              Tip Your Delivery Partner
            </Text>
          </View>
          <Text style={styles.tipSubText}>100% of your tip goes directly to the delivery rider</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[styles.tipChip, tip === amt && styles.tipChipActive]}
                onPress={() => setTip(amt)}
              >
                <Text style={[styles.tipText, tip === amt && styles.tipTextActive]}>
                  {amt === 0 ? 'No tip' : `₹${amt}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Flat Section Divider */}
        <View style={styles.flatSectionDivider} />

        {/* Bill Summary (Clean Flat Rows) */}
        <View style={styles.flatSection}>
          <Text style={styles.sectionTitle}>{t('billDetails', 'Bill Details')}</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{t('subtotal', 'Item Total')}</Text>
            <Text style={styles.billValue}>₹{itemTotal}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{t('deliveryFee', 'Delivery Fee')}</Text>
            <Text style={[styles.billValue, effectiveDeliveryFee === 0 && styles.freeValue]}>
              {effectiveDeliveryFee === 0 ? t('free', 'FREE') : `₹${effectiveDeliveryFee}`}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.discountLabel}>{t('discount', 'Coupon Discount')} ({appliedCoupon?.code})</Text>
              <Text style={styles.discountValue}>−₹{discountAmount}</Text>
            </View>
          )}

          {tip > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('riderTip', 'Rider Tip')}</Text>
              <Text style={styles.billValue}>₹{tip}</Text>
            </View>
          )}

          <View style={[styles.billRow, styles.grandTotalRow]}>
            <View>
              <Text style={styles.grandLabel}>{t('totalPayable', 'To Pay')}</Text>
              <Text style={styles.taxInclusiveText}>Inclusive of all taxes</Text>
            </View>
            <Text style={styles.grandValue}>₹{finalTotal}</Text>
          </View>
        </View>
      </>
    ),
    [
      instructions,
      customNote,
      appliedCoupon,
      couponCode,
      validatingCoupon,
      availableCoupons,
      tip,
      itemTotal,
      effectiveDeliveryFee,
      discountAmount,
      finalTotal,
    ]
  );

  // --- FILLED CART STATE (FLAT QUICK COMMERCE LAYOUT - NO HEAVY CARDS) ---
  return (
    <View style={styles.container}>
      {/* Sleek Top Header with Single Clean Back Button */}
      <View style={[styles.flatHeader, { paddingTop: insets.top + (validItems.length === 0 ? 10 : 8) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.flatHeaderTitle}>
            {validItems.length === 0 ? t('cart', 'Shopping Basket') : t('cart', 'My Basket')}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {!isInitialized ? (
        <View style={{ flex: 1 }}>
          <CartScreenSkeleton />
        </View>
      ) : validItems.length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.emptyScrollContent, { paddingBottom: 40 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onPullRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Hero Bag Glow */}
          <View style={styles.emptyBagCircle}>
            <Feather name="shopping-bag" size={38} color="#FFFFFF" />
          </View>

          {/* Dynamic ETA Pill */}
          <View style={styles.emptyEtaPill}>
            <Feather name="zap" size={12} color="#059669" />
            <Text style={styles.emptyEtaText}>{t('deliveryIn', 'Delivery in')} {deliveryRules.estimatedDelivery}</Text>
          </View>

          <Text style={styles.emptyTitle}>{t('emptyCart', 'Your basket is empty')}</Text>
          <Text style={styles.emptySub}>
            {t('emptyCartSub', 'Explore fresh fruits, vegetables, dairy & daily grocery essentials delivered fast to your doorstep.')}
          </Text>

          <TouchableOpacity
            style={styles.shopNowBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.shopNowText}>{t('startShopping', 'Start Shopping')}</Text>
            <Feather name="arrow-right" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Popular Categories from Backend */}
          {categories.length > 0 && (
            <View style={styles.emptyCategoriesWrap}>
              <Text style={styles.emptySectionHeading}>{t('popularCategories', 'Popular Categories')}</Text>
              <View style={styles.emptyCatGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.emptyCatChip}
                    onPress={() =>
                      navigation.navigate('MainTabs', {
                        screen: 'CategoriesTab',
                        params: {
                          categoryId: cat.id,
                          categorySlug: cat.slug,
                          categoryName: cat.name,
                        },
                      })
                    }
                  >
                    {cat.imageUrl && typeof cat.imageUrl === 'string' && cat.imageUrl.startsWith('http') ? (
                      <Image source={{ uri: cat.imageUrl }} style={styles.emptyCatImg} resizeMode="contain" />
                    ) : (
                      <Feather name="grid" size={14} color={Colors.primaryDark} />
                    )}
                    <Text style={styles.emptyCatName} numberOfLines={1}>
                      {tCat(cat.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quality Assurance Strip */}
          <View style={styles.trustStrip}>
            <View style={styles.trustCol}>
              <Feather name="zap" size={17} color="#059669" />
              <Text style={styles.trustTitle}>{deliveryRules.estimatedDelivery}</Text>
              <Text style={styles.trustSub}>Lightning Fast</Text>
            </View>
            <View style={[styles.trustCol, styles.trustColMiddle]}>
              <Feather name="check-circle" size={17} color="#059669" />
              <Text style={styles.trustTitle}>100% Fresh</Text>
              <Text style={styles.trustSub}>Quality Checked</Text>
            </View>
            <View style={styles.trustCol}>
              <Feather name="shield" size={17} color="#059669" />
              <Text style={styles.trustTitle}>Safe Delivery</Text>
              <Text style={styles.trustSub}>Hygienic Packing</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <FlatList
            data={validItems}
            keyExtractor={keyExtractor}
            renderItem={renderCartItem}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 120 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={pullRefreshing}
                onRefresh={onPullRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          />

          {/* Docked Sticky Bottom Bar */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
            <View>
              <Text style={styles.bottomTotalText}>₹{finalTotal}</Text>
              <View style={styles.bottomSubRow}>
                {deliveryType === 'SCHEDULED' ? (
                  <>
                    <Feather name="calendar" size={11} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.bottomItemsCount} numberOfLines={1}>
                      {selectedSlot ? `Scheduled: ${selectedSlot.label || selectedDate}` : 'Scheduled Delivery'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Feather name="zap" size={11} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.bottomItemsCount}>
                      Instant Delivery ({deliveryRules.estimatedDelivery})
                    </Text>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, (placing || hasUnavailableItems) && styles.btnDisabled]}
              activeOpacity={0.88}
              disabled={placing}
              onPress={handlePlaceOrder}
            >
              {placing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : hasUnavailableItems ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="alert-circle" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.checkoutBtnText}>
                    {hasOutOfStockItems ? t('outOfStock', 'Out of stock') : t('comingSoon', 'Coming Soon')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.checkoutBtnText}>{t('placeOrder', 'Place Order')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Address Selection Modal */}
      <Modal visible={addressModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalHeading}>Select Delivery Address</Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingAddresses ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <AddressCardSkeleton />
                <AddressCardSkeleton />
              </View>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={item => item.id}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.modalAddAddressBtn}
                    onPress={() => {
                      setAddressModalVisible(false);
                      navigation.navigate('Addresses');
                    }}
                  >
                    <Feather name="plus" size={16} color={Colors.primaryDark} />
                    <Text style={styles.modalAddAddressText}>Add New Delivery Address</Text>
                  </TouchableOpacity>
                }
                renderItem={({ item }) => {
                  const isSelected = selectedAddress?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.addressItemCard, isSelected && styles.addressItemActive]}
                      onPress={() => {
                        setSelectedAddress(item);
                        setAddressModalVisible(false);
                      }}
                    >
                      <View style={styles.addressItemLeft}>
                        <View style={isSelected ? styles.radioActive : styles.radioInactive}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <View style={styles.addrTagRow}>
                            <View style={styles.addrTagBadge}>
                              <Text style={styles.addrTagText}>{item.type || 'HOME'}</Text>
                            </View>
                            <Text style={styles.addrNameText}>
                              {item.name || item.fullName || 'Address'}
                            </Text>
                          </View>
                          <Text style={styles.modalAddrText}>{formatAddressSummary(item)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Clean Bottom-Sheet Modal for Clear All Confirmation */}
      <Modal
        visible={clearModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClearModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setClearModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.clearSheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.clearTrashIconCircle}>
              <Feather name="trash-2" size={24} color="#DC2626" />
            </View>
            <Text style={styles.clearSheetTitle}>{t('clearCartTitle', 'Clear Shopping Basket?')}</Text>
            <Text style={styles.clearSheetMsg}>
              {t('clearCartMsg', 'Are you sure you want to remove all items from your basket?')}
            </Text>
            <View style={styles.clearSheetActionsRow}>
              <TouchableOpacity
                style={styles.clearSheetCancelBtn}
                activeOpacity={0.75}
                onPress={() => setClearModalVisible(false)}
              >
                <Text style={styles.clearSheetCancelText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearSheetConfirmBtn}
                activeOpacity={0.85}
                onPress={handleConfirmClear}
              >
                <Text style={styles.clearSheetConfirmText}>{t('clearAll', 'Clear All')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  flatHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  flatHeaderSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
  },
  etaBarFlat: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  etaBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  freeMeterText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  flatSectionDivider: {
    height: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  flatSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  itemFlatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemFlatRowOos: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    borderRadius: 10,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  itemImgOosBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  itemImgOosText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cartOosTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
  },
  cartOosTagText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  cartSoonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
  },
  cartSoonTagText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  cartLowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
  },
  cartLowTagText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  cartMinQtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 0.5,
    borderColor: '#FECACA',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
  },
  cartMinQtyTagText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '700',
  },
  cartRemoveItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cartRemoveItemText: {
    color: '#DC2626',
    fontSize: 11.5,
    fontWeight: '800',
  },
  cartOosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  cartOosBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cartOosBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  cartOosBannerDesc: {
    fontSize: 11.5,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 15,
  },
  itemImgWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
  },
  itemUnit: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  itemActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cartDirectTrashBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  clearAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    height: 32,
    paddingHorizontal: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 20,
    textAlign: 'center',
    marginHorizontal: 3,
  },
  // Top Compact Delivery Address
  topAddressSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  topAddressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  compactAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAddressIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  compactAddressInfo: {
    flex: 1,
    marginRight: 8,
    gap: 2,
  },
  compactAddressTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topAddressTagPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: '#A7F3D0',
  },
  topAddressTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.3,
  },
  compactReceiverText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  compactAddressText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 15,
  },
  compactChangeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactChangeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.4,
  },
  compactAddAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAddTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactAddSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  compactAddBtnBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  compactAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  addrTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addrTagBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  addrTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  addrNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Enhanced Delivery Instructions (Structured Grid)
  clearInstructionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  instructionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  instCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  instCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#ECFDF5',
  },
  instIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  instIconWrapActive: {
    backgroundColor: '#D1FAE5',
  },
  instTextWrap: {
    flex: 1,
  },
  instCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  instCardTitleActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  instCardSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  instCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    marginTop: 10,
  },
  customNoteInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  appliedCouponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 10,
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedCodeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  appliedSavingsText: {
    fontSize: 11,
    color: '#065F46',
  },
  removeCouponBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeCouponText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  couponInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  couponApplyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponApplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  availableCouponsWrap: {
    marginTop: 10,
  },
  availableLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  couponChipsRow: {
    flexDirection: 'row',
  },
  couponChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipCode: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  chipDesc: {
    fontSize: 9.5,
    color: '#64748B',
  },
  tipSubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  tipChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#ECFDF5',
  },
  tipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tipTextActive: {
    color: Colors.primaryDark,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    marginTop: 8,
  },
  radioActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInactive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  paymentTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentSub: {
    fontSize: 10.5,
    color: '#047857',
    marginTop: 2,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  billValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  discountLabel: {
    fontSize: 12.5,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  discountValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  freeValue: {
    color: '#059669',
    fontWeight: '800',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
    paddingTop: 10,
  },
  grandLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  taxInclusiveText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  grandValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  bottomTotalText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  bottomItemsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 22,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  checkoutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  // Empty State Styles
  emptyScrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  emptyBagCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  emptyEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  emptyEtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    maxWidth: 290,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 28,
  },
  shopNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCategoriesWrap: {
    width: '100%',
    marginBottom: 24,
  },
  emptySectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyCatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  emptyCatImg: {
    width: 18,
    height: 18,
  },
  emptyCatName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  trustStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    width: '100%',
  },
  trustCol: {
    flex: 1,
    alignItems: 'center',
  },
  trustColMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  trustSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
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
    maxHeight: '75%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalAddAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: '#ECFDF5',
    marginTop: 10,
  },
  modalAddAddressText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginLeft: 6,
  },
  addressItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  addressItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: Colors.primary,
  },
  addressItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  modalAddrText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
  },
  // Delivery Mode Section (Compact Design)
  deliveryModeSection: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  deliveryModeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  headerIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  deliveryModeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  deliveryModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  deliveryModeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  modeOptionBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  modeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconWrapActive: {
    backgroundColor: '#059669',
  },
  modeBtnTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  modeBtnTitleActive: {
    color: '#059669',
    fontWeight: '800',
  },
  subtextWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  modeBtnSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  modeBtnSubActive: {
    color: '#047857',
    fontWeight: '600',
  },
  modeOptionBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  radioCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  radioCircleDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  storeClosedNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 7,
  },
  noticeIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  storeClosedNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 1,
  },
  storeClosedNoticeSub: {
    fontSize: 10,
    color: '#B45309',
    lineHeight: 14,
    flex: 1,
  },
  scheduledPickerBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  moreDatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  moreDatesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  pickerHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePickerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    minWidth: 64,
  },
  dateChipActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dateChipDay: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  dateChipDayActive: {
    color: '#D1FAE5',
    fontWeight: '700',
  },
  dateChipNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateChipNumActive: {
    color: '#FFFFFF',
  },
  noSlotsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  noSlotsText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  slotCard: {
    width: '48.5%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  slotCardActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  slotCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  slotCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slotTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  slotTitleTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  slotCheckMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  slotFullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
  },
  slotFullBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  slotTimeTextActive: {
    color: '#047857',
    fontWeight: '600',
  },
  freeMeterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    maxWidth: 160,
  },
  clearSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  clearTrashIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  clearSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  clearSheetMsg: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  clearSheetActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  clearSheetCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  clearSheetConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  clearSheetConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});


