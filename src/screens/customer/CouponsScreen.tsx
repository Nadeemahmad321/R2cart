import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FloatingCartBar } from '../../components/customer/FloatingCartBar';
import { CouponCardSkeleton } from '../../components/common/Skeleton';

export const CouponsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { items: cartItems, totalItems } = useCart();
  const { user } = useAuth();

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await api.getCoupons();
      const rawList = res?.data?.data || res?.data?.coupons || res?.data || [];
      if (Array.isArray(rawList)) {
        setCoupons(rawList);
      }
    } catch (err: any) {
      console.warn('Coupons fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCoupons();
    }, [fetchCoupons])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const handleCopyCode = (code: string) => {
    setCopiedCode(code);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Copied coupon code: ${code}`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', `Coupon code "${code}" copied to clipboard.`);
    }
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const handleApplyCoupon = async (coupon: any) => {
    const code = coupon.code;
    setApplyingCode(code);

    try {
      // Validate coupon with backend
      await api.validateCoupon(code);

      if (Platform.OS === 'android') {
        ToastAndroid.show(`Coupon ${code} applied successfully!`, ToastAndroid.SHORT);
      }

      // Navigate to Cart with prefilled coupon code
      navigation.navigate('Cart', { appliedCode: code });
    } catch (err: any) {
      // If validation fails because cart is empty or below minimum order
      const errMsg = err.message || 'Could not apply coupon';
      if (cartItems.length === 0) {
        Alert.alert(
          'Empty Basket',
          `Add items worth at least ₹${coupon.minimumOrder || 199} to apply ${code}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Explore Products',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        Alert.alert('Coupon Alert', errMsg);
      }
    } finally {
      setApplyingCode(null);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'Limited time offer';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderHeader = () => {
    if (coupons.length === 0) return null;
    return (
      <View style={styles.listHeaderWrap}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.tagIconBadge}>
              <Feather name="percent" size={13} color="#059669" />
            </View>
            <Text style={styles.sectionTitle}>AVAILABLE COUPONS</Text>
          </View>
          <View style={styles.offersCountPill}>
            <Text style={styles.sectionCount}>
              {coupons.length} {coupons.length === 1 ? 'OFFER' : 'OFFERS'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCouponItem = ({ item }: { item: any }) => {
    const isAvailable = item.displayStatus === 'Available' || item.status === 'ACTIVE';
    const isCopied = copiedCode === item.code;
    const isApplying = applyingCode === item.code;
    const isPercentage = item.type === 'PERCENTAGE' || item.discountType === 'PERCENTAGE';
    const discountText = isPercentage
      ? `${Number(item.discount)}% OFF`
      : `₹${Number(item.discount)} FLAT OFF`;

    return (
      <View style={[styles.ticketCard, !isAvailable && styles.ticketCardDisabled]}>
        {/* Left Green Accent Stripe */}
        <View style={[styles.ticketLeftBar, !isAvailable && styles.ticketLeftBarDisabled]} />

        {/* Notches for authentic ticket look */}
        <View style={styles.notchTop} />
        <View style={styles.notchBottom} />

        <View style={styles.ticketContent}>
          {/* Top Row: Code + Copy + Apply Button */}
          <View style={styles.ticketHeaderRow}>
            <View style={styles.ticketHeaderLeft}>
              {/* Discount Pill */}
              <View style={styles.discountPill}>
                <Feather name="percent" size={10} color="#059669" style={{ marginRight: 3 }} />
                <Text style={styles.discountPillText}>{discountText}</Text>
              </View>

              {/* Code Dotted Box */}
              <View style={styles.codeDottedBox}>
                <Text style={styles.codeText}>{item.code}</Text>
              </View>

              {/* Copy Button */}
              <TouchableOpacity
                style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                onPress={() => handleCopyCode(item.code)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={isCopied ? 'check' : 'copy'}
                  size={11}
                  color={isCopied ? '#059669' : '#475569'}
                />
              </TouchableOpacity>
            </View>

            {/* Compact Apply Button on Right */}
            <TouchableOpacity
              style={[
                styles.compactApplyBtn,
                !isAvailable && styles.compactApplyBtnDisabled,
              ]}
              onPress={() => handleApplyCoupon(item)}
              disabled={!isAvailable || isApplying}
              activeOpacity={0.8}
            >
              {isApplying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.compactApplyBtnText,
                    !isAvailable && styles.compactApplyBtnTextDisabled,
                  ]}
                >
                  {isAvailable ? 'APPLY' : (item.displayStatus || 'EXPIRED')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.descText} numberOfLines={1}>
            {item.description || `Save ${discountText.toLowerCase()} on your grocery order!`}
          </Text>

          {/* Inline Terms Strip */}
          <View style={styles.compactTermsRow}>
            <Feather name="info" size={10} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.compactTermsText} numberOfLines={1}>
              Min. order <Text style={styles.termHighlight}>₹{Number(item.minimumOrder || 0)}</Text>
              {item.maximumDiscount != null && Number(item.maximumDiscount) > 0 ? (
                <Text> | Max off <Text style={styles.termHighlight}>₹{Number(item.maximumDiscount)}</Text></Text>
              ) : null}
              <Text> | Valid till {formatDate(item.expiresAt)}</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sleek Top Header with Chevron Back Arrow */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={26} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.titleCol}>
            <Text style={styles.topBarTitle}>Offers & Coupons</Text>
            <Text style={styles.topBarSubtitle}>
              {coupons.length > 0
                ? `${coupons.length} available ${coupons.length === 1 ? 'offer' : 'offers'}`
                : 'Extra grocery savings & discounts'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightBadge}>
          <View style={styles.tagIconWrap}>
            <Feather name="tag" size={16} color="#059669" />
          </View>
        </View>
      </View>

      {/* Screen Body */}
      {loading && coupons.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <CouponCardSkeleton />
          <CouponCardSkeleton />
          <CouponCardSkeleton />
        </View>
      ) : coupons.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Feather name="percent" size={38} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>No Coupons Available Right Now</Text>
          <Text style={styles.emptySub}>
            Special promotional offers and seasonal discounts are updated regularly. Check back soon!
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <Feather name="shopping-bag" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.shopBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={coupons}
          renderItem={renderCouponItem}
          keyExtractor={(item) => item.id || item.code}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: totalItems > 0 ? 120 + insets.bottom : 30 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Cart Bar - positioned higher only on CouponsScreen as requested */}
      <FloatingCartBar
        bottomOffset={Math.max(insets.bottom + 22, 30)}
        onPress={() => navigation.navigate('Cart')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleCol: {
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  headerRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  listHeaderWrap: {
    marginBottom: 14,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.6,
  },
  offersCountPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.4,
  },
  ticketCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1', // crisp clean outline all around the card
    overflow: 'hidden',
    flexDirection: 'row',
  },
  ticketCardDisabled: {
    opacity: 0.72,
    backgroundColor: '#F8FAFC',
  },
  ticketLeftBar: {
    width: 4,
    backgroundColor: '#059669',
  },
  ticketLeftBarDisabled: {
    backgroundColor: '#94A3B8',
  },
  notchTop: {
    position: 'absolute',
    top: -6,
    left: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 10,
  },
  notchBottom: {
    position: 'absolute',
    bottom: -6,
    left: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 10,
  },
  ticketContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountPillText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.2,
  },
  codeDottedBox: {
    borderWidth: 1.2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  copyBtn: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  copyBtnSuccess: {
    backgroundColor: '#ECFDF5',
  },
  compactApplyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactApplyBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  compactApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compactApplyBtnTextDisabled: {
    color: '#94A3B8',
  },
  descText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 4,
  },
  compactTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTermsText: {
    fontSize: 10.5,
    color: '#64748B',
    flex: 1,
  },
  termHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});
