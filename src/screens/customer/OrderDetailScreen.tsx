import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  Modal,
  TextInput,
  RefreshControl,
  Animated,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { Order, Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { EditOrderDetailsModal } from '../../components/EditOrderDetailsModal';
import { OrderInvoiceModal } from '../../components/customer/OrderInvoiceModal';
import { OrderCancelledModal } from '../../components/customer/OrderCancelledModal';
import { Skeleton } from '../../components/common/Skeleton';

const CANCEL_REASONS = [
  'Placed order by mistake',
  'Need to change delivery address or phone number',
  'Need to add or modify items in grocery basket',
  'Selected delivery timing is no longer suitable',
  'Found items available earlier locally',
  'Other reason',
];

const formatDateTime = (val: any) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getStatusTheme = (status: string) => {
  const s = (status || '').toUpperCase();
  if (['DELIVERED', 'COMPLETED'].includes(s)) {
    return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label: 'Delivered', icon: 'check-circle' };
  }
  if (['CANCELLED', 'CANCELED'].includes(s)) {
    return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', label: 'Cancelled', icon: 'x-circle' };
  }
  if (['OUT_FOR_DELIVERY', 'OUT FOR DELIVERY', 'IN_TRANSIT'].includes(s)) {
    return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA', label: 'Out for Delivery', icon: 'truck' };
  }
  if (['PACKING', 'PACKED'].includes(s)) {
    return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', label: 'Packing', icon: 'package' };
  }
  if (['CONFIRMED', 'ACCEPTED'].includes(s)) {
    return { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE', label: 'Confirmed', icon: 'clipboard' };
  }
  return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', label: status || 'New', icon: 'clock' };
};

export const OrderDetailScreen = ({ route, navigation }: any) => {
  const orderId = route.params?.orderId || route.params?.id || route.params?.orderNumber;
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { lang } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState<boolean>(false);
  const [cancelSuccessVisible, setCancelSuccessVisible] = useState<boolean>(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for active step
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.45,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();

    // Fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    return () => pulseLoop.stop();
  }, [pulseAnim, haloOpacity, fadeAnim]);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await api.getOrder(orderId);
      const data = res?.data?.data || res?.data?.order || res?.data || res;
      if (data && (data.id || data._id || data.orderNumber)) {
        setOrder(data);
      }
    } catch (err: any) {
      if (!order) {
        Alert.alert('Error', err.message || 'Could not load order details');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
      const interval = setInterval(fetchOrder, 10000);
      return () => clearInterval(interval);
    }, [fetchOrder])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleCopyOrderId = () => {
    const orderNum = order?.orderNumber || order?.id || '';
    setCopied(true);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Copied Order #${orderNum}`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', `Order #${orderNum} copied to clipboard`);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSupport = () => {
    if (!order) return;
    const orderNum = order.orderNumber || order.id?.slice(-8).toUpperCase() || '';
    navigation.navigate('Support', {
      orderId: order.id || order.orderNumber,
      orderNumber: orderNum,
      defaultSubject: `Issue with Order #${orderNum}`,
    });
  };

  const handleDownloadInvoice = () => {
    setInvoiceModalVisible(true);
  };

  const handleCallRider = () => {
    const rider = order?.deliveryPerson || order?.assignedDeliveryPerson;
    if (rider?.mobile) {
      Linking.openURL(`tel:${rider.mobile}`);
    } else {
      Alert.alert('Phone Unavailable', 'Rider phone number is not available.');
    }
  };

  const handleOpenChat = () => {
    if (!order) return;
    navigation.navigate('CustomerChat', {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id.slice(-6).toUpperCase(),
    });
  };

  const handleRateProduct = async (productId: string, score: number, productName: string) => {
    if (submittingRating) return;
    setSubmittingRating(productId);
    try {
      await api.rateProduct(productId, score);
      setRatings(prev => ({ ...prev, [productId]: score }));
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Rated "${productName}" ${score} ★`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Thank you!', `You rated "${productName}" ${score} ★`);
      }
    } catch {
      setRatings(prev => ({ ...prev, [productId]: score }));
    } finally {
      setSubmittingRating(null);
    }
  };

  const handleReorder = () => {
    if (!order || !order.items?.length) {
      Alert.alert('Empty Order', 'This order has no items to re-order.');
      return;
    }

    let addedCount = 0;
    order.items.forEach(item => {
      const productObj: Product = {
        id: item.productId || item.id,
        name: item.name,
        price: item.price,
        mrp: item.mrp || item.price,
        unit: item.unit || '',
        imageUrl: item.imageUrl || item.image || '',
        category: '',
        stock: 100,
        status: 'ACTIVE',
      };
      addToCart(productObj);
      addedCount++;
    });

    Alert.alert(
      lang === 'hi' ? 'कार्ट में जोड़ा गया' : 'Added to Basket',
      lang === 'hi'
        ? `ऑर्डर #${order.orderNumber || order.id.slice(-6).toUpperCase()} के ${addedCount} आइटम आपकी बास्केट में जोड़ दिए गए हैं!`
        : `Added ${addedCount} items from Order #${order.orderNumber || order.id.slice(-6).toUpperCase()} to your basket!`,
      [
        { text: lang === 'hi' ? 'ठीक है' : 'OK' },
        {
          text: lang === 'hi' ? 'बास्केट देखें' : 'View Basket',
          onPress: () => navigation.navigate('Cart'),
        },
      ]
    );
  };

  const handleCancelSubmit = async () => {
    if (!order) return;
    const finalReason = selectedReason === 'Other reason' ? (customReason.trim() || 'Other reason') : selectedReason;
    setCancelling(true);
    try {
      await api.cancelOrder(order.id, finalReason);
      setCancelModalVisible(false);
      setCancelSuccessVisible(true);
      fetchOrder();
    } catch (err: any) {
      Alert.alert('Cancellation Error', err.message || 'Could not cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Feather name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.topBarTitleCol}>
            <Text style={styles.topBarTitle}>Order Details</Text>
            <Skeleton width={90} height={12} borderRadius={4} style={{ marginTop: 2 }} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card Skeleton */}
          <View style={styles.headerCard}>
            <View style={styles.headerCardTopRow}>
              <View style={styles.headerCardLeftCol}>
                <Skeleton width={100} height={11} borderRadius={4} />
                <Skeleton width={140} height={20} borderRadius={6} style={{ marginTop: 6 }} />
                <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
              <Skeleton width={80} height={24} borderRadius={12} />
            </View>
          </View>

          {/* Timeline Skeleton */}
          <View style={styles.sectionCard}>
            <Skeleton width={130} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
            {[1, 2, 3, 4].map(idx => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="45%" height={14} borderRadius={4} />
                  <Skeleton width="60%" height={11} borderRadius={4} style={{ marginTop: 5 }} />
                </View>
              </View>
            ))}
          </View>

          {/* Items Skeleton */}
          <View style={styles.sectionCard}>
            <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 14 }} />
            {[1, 2].map(idx => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Skeleton width={48} height={48} borderRadius={8} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="65%" height={14} borderRadius={4} />
                  <Skeleton width="40%" height={11} borderRadius={4} style={{ marginTop: 5 }} />
                </View>
                <Skeleton width={50} height={16} borderRadius={4} />
              </View>
            ))}
          </View>

          {/* Bill Summary Skeleton */}
          <View style={styles.sectionCard}>
            <Skeleton width={110} height={16} borderRadius={4} style={{ marginBottom: 14 }} />
            <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const rawStatus = (order.status || '').trim();
  const statusTheme = getStatusTheme(rawStatus);
  const isCancelled = statusTheme.label === 'Cancelled';
  const isDelivered = statusTheme.label === 'Delivered';
  const isCancellable = ['New', 'Confirmed', 'Packing'].includes(statusTheme.label);
  const isScheduled = order.deliveryType === 'SCHEDULED';
  const isOutForDelivery = statusTheme.label === 'Out for Delivery';

  // Timeline Step Calculations matching Website
  const deliveryPersonName = order.deliveryPerson?.name || order.assignedDeliveryPerson?.name;
  const deliveredTimestampText = order.deliveredAt ? formatDateTime(order.deliveredAt) : null;

  const steps = [
    {
      key: 'New',
      label: 'Order Placed',
      desc: order.date ? `Placed on ${formatDateTime(order.date)}` : 'Received & logged',
      icon: 'check',
    },
    {
      key: 'Confirmed',
      label: 'Confirmed',
      desc: 'Accepted by store',
      icon: 'clipboard',
    },
    {
      key: 'Packing',
      label: 'Packing',
      desc: 'Packed at local hub',
      icon: 'package',
    },
    {
      key: 'Out for Delivery',
      label: 'Out for Delivery',
      desc: deliveryPersonName ? `Out with ${deliveryPersonName}` : 'Rider on the way',
      icon: 'truck',
    },
    {
      key: 'Delivered',
      label: 'Delivered',
      desc: isDelivered && deliveredTimestampText
        ? `Delivered on ${deliveredTimestampText}${deliveryPersonName ? ` | by ${deliveryPersonName}` : ''}`
        : 'Completed',
      icon: 'home',
    },
  ];

  let currentIdx = 0;
  if (statusTheme.label === 'New') currentIdx = 0;
  else if (statusTheme.label === 'Confirmed') currentIdx = 1;
  else if (statusTheme.label === 'Packing') currentIdx = 2;
  else if (statusTheme.label === 'Out for Delivery') currentIdx = 3;
  else if (statusTheme.label === 'Delivered') currentIdx = 4;
  else if (isCancelled) currentIdx = -1;

  // Address
  const addrObj = order.address || order.deliveryAddress || {};
  const receiverName = addrObj.name || addrObj.fullName || order.customer || order.customerName || 'Customer';
  const receiverMobile = addrObj.mobile || addrObj.phone || order.mobile || order.customerMobile || '';
  const formattedAddress = [
    addrObj.houseNo || addrObj.house,
    addrObj.street,
    addrObj.landmark ? `Near ${addrObj.landmark}` : null,
    addrObj.city || addrObj.area,
    addrObj.pincode || addrObj.pin,
  ].filter(Boolean).join(', ') || addrObj.fullAddress || addrObj.address || 'Address provided at checkout';

  const rider = order.deliveryPerson || order.assignedDeliveryPerson;
  const isCod = order.paymentMethod === 'COD';
  const grandTotal = Number(order.total || order.grandTotal || order.totalAmount || 0);
  const itemTotal = Number(order.itemTotal || (order.items || []).reduce((acc, it) => acc + (it.price * it.quantity), 0));
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const handlingFee = Number(order.handlingFee ?? 0);
  const discount = Number(order.couponDiscount || order.discount || 0);

  const orderDateFormatted = formatDateTime(order.date || order.createdAt);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sleek Top Bar (Single Back Arrow) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.topBarTitleCol}>
          <Text style={styles.topBarTitle}>Order Details</Text>
          <Text style={styles.topBarSubtitle}>#{order.orderNumber || order.id.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={handleOpenSupport}
          activeOpacity={0.8}
        >
          <Feather name="help-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.helpBtnText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Website-Style Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerCardTopRow}>
              <View style={styles.headerCardLeftCol}>
                <Text style={styles.orderSummaryKicker}>ORDER SUMMARY</Text>
                <View style={styles.orderNumberRow}>
                  <Text style={styles.orderNumberText}>
                    #{order.orderNumber || order.id.slice(-8).toUpperCase()}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopyOrderId}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name={copied ? 'check' : 'copy'}
                      size={14}
                      color={copied ? '#10B981' : '#6B7280'}
                    />
                    {copied && <Text style={styles.copiedText}>Copied</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.placedDateText}>Placed on {orderDateFormatted}</Text>

                {isDelivered && (
                  <View style={styles.deliveredHeaderBadge}>
                    <Feather name="check-circle" size={14} color="#059669" style={{ marginRight: 5 }} />
                    <Text style={styles.deliveredHeaderText}>
                      Delivered on {formatDateTime(order.deliveredAt || order.date)}
                      {deliveryPersonName ? ` | by ${deliveryPersonName}` : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusTheme.bg, borderColor: statusTheme.border },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusTheme.text }]} />
                <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
                  {statusTheme.label}
                </Text>
              </View>
            </View>

            {/* Header Actions: Invoice & Support (Website Parity) */}
            <View style={styles.headerActionsBar}>
              <TouchableOpacity
                style={styles.invoiceHeaderBtn}
                onPress={handleDownloadInvoice}
                activeOpacity={0.8}
              >
                <Feather name="file-text" size={13} color="#047857" style={{ marginRight: 5 }} />
                <Text style={styles.invoiceHeaderBtnText}>Download Invoice / Bill</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.helpHeaderBtn}
                onPress={handleOpenSupport}
                activeOpacity={0.8}
              >
                <Feather name="help-circle" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.helpHeaderBtnText}>Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items in this Order Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionCardTitle}>Items in this Order</Text>
              <Text style={styles.sectionCountText}>{(order.items || []).length} items</Text>
            </View>

            <View style={styles.itemsListContainer}>
              {(order.items || []).map((item, idx) => {
                const prodId = item.productId || item.id;
                const userScore = ratings[prodId] || 0;

                return (
                  <View key={item.id || idx} style={styles.itemRowWrapper}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemImageWrap}>
                        {item.image || item.imageUrl ? (
                          <Image
                            source={{ uri: item.image || item.imageUrl }}
                            style={styles.itemImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Feather name="package" size={20} color="#9CA3AF" />
                        )}
                      </View>
                      <View style={styles.itemMetaCol}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemPackDetails}>
                          {item.unit || 'Pack'} | Qty: {item.quantity} × ₹{item.price}
                        </Text>
                      </View>
                      <Text style={styles.itemTotalAmount}>₹{item.price * item.quantity}</Text>
                    </View>

                    {/* Interactive 5-Star Rating Card (Website style) when Delivered */}
                    {isDelivered && (
                      <View style={styles.ratingCard}>
                        <Text style={styles.ratePromptText}>
                          {userScore > 0 ? 'Your rating:' : 'Rate product:'}
                        </Text>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => handleRateProduct(prodId, star, item.name)}
                              style={styles.starTouch}
                              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                            >
                              <Feather
                                name="star"
                                size={17}
                                color={star <= userScore ? '#F59E0B' : '#D1D5DB'}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        {userScore > 0 && (
                          <View style={styles.savedScoreBadge}>
                            <Feather name="check" size={12} color="#059669" />
                            <Text style={styles.savedScoreText}>Saved ({userScore}/5 ★)</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Delivery Note if present */}
          {order.deliveryInstruction ? (
            <View style={styles.deliveryNoteCard}>
              <View style={styles.deliveryNoteHeader}>
                <Feather name="file-text" size={14} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.deliveryNoteTitle}>Delivery Note</Text>
              </View>
              <Text style={styles.deliveryNoteBody}>"{order.deliveryInstruction}"</Text>
            </View>
          ) : null}

          {/* Delivery Address Card (Website Style) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.sectionCardTitle}>Delivery Address</Text>
                <Feather name="map-pin" size={14} color="#10B981" style={{ marginLeft: 6 }} />
              </View>
              {isCancellable && (
                <TouchableOpacity
                  style={styles.addrEditBtn}
                  onPress={() => setEditModalVisible(true)}
                >
                  <Feather name="edit-2" size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.addrEditBtnText}>Edit Details</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.addrRecipientName}>{receiverName}</Text>
            <Text style={styles.addrFullText}>{formattedAddress}</Text>
            {receiverMobile ? (
              <View style={styles.addrPhoneRow}>
                <Feather name="phone" size={12} color="#6B7280" style={{ marginRight: 5 }} />
                <Text style={styles.addrPhoneText}>+91 {receiverMobile}</Text>
              </View>
            ) : null}

            {/* Delivery Time Pill in Address Card */}
            <View style={styles.addrDeliveryTimeBlock}>
              <Text style={styles.addrDeliveryTimeKicker}>DELIVERY TIME</Text>
              {isDelivered ? (
                <View style={styles.addrDeliveredPill}>
                  <Feather name="check-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.addrDeliveredPillText}>
                    Delivered on {formatDateTime(order.deliveredAt || order.date)}
                  </Text>
                </View>
              ) : isScheduled ? (
                <View style={styles.deliveryTypePillScheduled}>
                  <Feather name="calendar" size={12} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.deliveryTypePillScheduledText}>
                    {order.deliveryDate || 'Scheduled date'} | {order.deliverySlot || 'Standard Slot'}
                  </Text>
                </View>
              ) : (
                <View style={styles.deliveryTypePillInstant}>
                  <Feather name="zap" size={12} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={styles.deliveryTypePillInstantText}>15-20 Min Instant Express</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bill Summary Card (Website Style) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionCardTitle}>Bill Summary</Text>
              <View style={styles.paymentMethodChip}>
                <Text style={styles.paymentMethodChipText}>
                  {isCod ? 'Cash on Delivery' : 'Paid Online'}
                </Text>
              </View>
            </View>

            <View style={styles.billRowsList}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Subtotal</Text>
                <Text style={styles.billValue}>₹{itemTotal}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={[styles.billValue, deliveryFee === 0 && styles.freeDeliveryHighlight]}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </Text>
              </View>

              {handlingFee > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Handling & Packaging</Text>
                  <Text style={styles.billValue}>₹{handlingFee}</Text>
                </View>
              )}

              {discount > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.discountLabel}>Coupon Discount</Text>
                  <Text style={styles.discountValue}>-₹{discount}</Text>
                </View>
              )}

              <View style={styles.billDivider} />

              <View style={styles.billTotalRow}>
                <Text style={styles.billTotalLabel}>Grand Total</Text>
                <Text style={styles.billTotalValue}>₹{grandTotal}</Text>
              </View>
            </View>
          </View>

          {/* Dedicated Order Support Ticket Option */}
          <TouchableOpacity
            style={styles.orderSupportCard}
            onPress={handleOpenSupport}
            activeOpacity={0.85}
          >
            <View style={styles.orderSupportIconWrap}>
              <Feather name="message-square" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.orderSupportTitle}>
                {lang === 'hi' ? 'सपोर्ट टिकट दर्ज करें' : 'Raise Support Ticket'}
              </Text>
              <Text style={styles.orderSupportSub}>
                {lang === 'hi'
                  ? `ऑर्डर #${order.orderNumber || order.id.slice(-8).toUpperCase()} के लिए सहायता प्राप्त करें`
                  : `Need help or have an issue with Order #${order.orderNumber || order.id.slice(-8).toUpperCase()}?`}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#059669" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomBarContent}>
          {isCancellable && (
            <TouchableOpacity
              style={styles.bottomEditBtn}
              onPress={() => setEditModalVisible(true)}
            >
              <Feather name="edit-2" size={14} color="#059669" style={{ marginRight: 5 }} />
              <Text style={styles.bottomEditBtnText}>Edit</Text>
            </TouchableOpacity>
          )}

          {isCancellable && (
            <TouchableOpacity
              style={styles.cancelOrderBtn}
              onPress={() => setCancelModalVisible(true)}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="x-circle" size={15} color="#DC2626" style={{ marginRight: 5 }} />
                  <Text style={styles.cancelOrderBtnText}>Cancel</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.reorderBtn, !isCancellable && { flex: 1 }]}
            onPress={handleReorder}
          >
            <Feather name="rotate-cw" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.reorderBtnText}>Re-order all items</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Website-Style Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Feather name="x" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Warning strip */}
            <View style={styles.cancelWarningStrip}>
              <Feather name="alert-circle" size={17} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelWarningTitle}>
                  Are you sure you want to cancel order #{order.orderNumber || order.id.slice(-8).toUpperCase()}?
                </Text>
                <Text style={styles.cancelWarningSubtitle}>
                  All {(order.items || []).length} items will be released and returned to store inventory.
                </Text>
              </View>
            </View>

            <Text style={styles.modalSubheading}>Please select reason for cancellation:</Text>

            {CANCEL_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedReason === reason && styles.reasonOptionActive,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={[styles.radioCircle, selectedReason === reason && styles.radioCircleSelected]}>
                  {selectedReason === reason && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 'Other reason' && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Tell us why you are cancelling..."
                placeholderTextColor="#9CA3AF"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />
            )}

            {/* Offer to edit details instead (Matching Website) */}
            {(selectedReason === 'Need to change delivery address or phone number' ||
              selectedReason === 'Selected delivery timing is no longer suitable') && (
              <View style={styles.editOfferCard}>
                <View style={styles.editOfferHeader}>
                  <Feather name="edit-2" size={13} color="#059669" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.editOfferText}>
                    Did you know? You can edit recipient, address, or delivery slot without cancelling!
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editOfferBtn}
                  onPress={() => {
                    setCancelModalVisible(false);
                    setTimeout(() => setEditModalVisible(true), 300);
                  }}
                >
                  <Feather name="edit-2" size={12} color="#059669" style={{ marginRight: 5 }} />
                  <Text style={styles.editOfferBtnText}>Edit details instead</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalKeepBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalKeepBtnText}>Keep Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmCancelBtn}
                onPress={handleCancelSubmit}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmCancelBtnText}>Yes, Cancel Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Order Details Modal (Website Parity) */}
      <EditOrderDetailsModal
        visible={editModalVisible}
        order={order}
        onClose={() => setEditModalVisible(false)}
        onSuccess={(updated) => {
          if (updated && (updated.id || updated.orderNumber || updated.addressSnapshot || updated.deliveryDate)) {
            setOrder(prev => (prev ? { ...prev, ...updated } : prev));
          }
          fetchOrder();
        }}
      />

      {/* Official Tax Invoice & Cash Bill Modal (Live Backend Connected) */}
      <OrderInvoiceModal
        visible={invoiceModalVisible}
        order={order}
        onClose={() => setInvoiceModalVisible(false)}
      />

      {/* Custom Designed Order Cancelled Modal */}
      <OrderCancelledModal
        visible={cancelSuccessVisible}
        orderNumber={order?.orderNumber || order?.id?.slice(-8).toUpperCase()}
        onClose={() => setCancelSuccessVisible(false)}
        lang={lang}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  helpBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerCardLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  orderSummaryKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 4,
  },
  orderNumberText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  copiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
  placedDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  deliveredHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  deliveredHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  invoiceHeaderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoiceHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
  },
  helpHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  helpHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  needHelpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  needHelpContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  needHelpIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  needHelpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  needHelpDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  needHelpBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  needHelpTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 9,
  },
  needHelpTicketBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  needHelpCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  needHelpCallBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  deliveryTypePillScheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryTypePillScheduledText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  deliveryTypePillInstant: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryTypePillInstantText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  cancelledBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  cancelledTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelledDesc: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
    lineHeight: 16,
  },
  timelineWrapper: {
    paddingLeft: 4,
    paddingVertical: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
    position: 'relative',
    minHeight: 52,
  },
  timelineConnectorLine: {
    position: 'absolute',
    left: 13,
    top: 26,
    bottom: -8,
    width: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  timelineConnectorLineDone: {
    backgroundColor: '#10B981',
  },
  timelineNodeCol: {
    width: 28,
    alignItems: 'center',
    marginRight: 14,
    zIndex: 2,
  },
  timelineHaloRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#A7F3D0',
    zIndex: 1,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineDotDone: {
    backgroundColor: '#10B981',
  },
  timelineDotCurrent: {
    backgroundColor: '#10B981',
  },
  timelineStepNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  timelineInfoCol: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineStepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  timelineStepTitleActive: {
    color: '#0F172A',
  },
  timelineStepDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  riderBanner: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  riderInfo: {
    flex: 1,
  },
  riderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  riderRoleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  riderRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  riderVehicle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  riderActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riderIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  riderChatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsListContainer: {
    marginTop: 4,
  },
  itemRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemMetaCol: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  itemPackDetails: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  itemTotalAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  ratingCard: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratePromptText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starTouch: {
    padding: 2,
  },
  savedScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  savedScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  deliveryNoteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  deliveryNoteBody: {
    fontSize: 12.5,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  addrRecipientName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  addrFullText: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
  },
  addrPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  addrPhoneText: {
    fontSize: 12,
    color: '#6B7280',
  },
  addrDeliveryTimeBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addrDeliveryTimeKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  addrDeliveredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addrDeliveredPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  paymentMethodChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentMethodChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  billRowsList: {
    marginTop: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  freeDeliveryHighlight: {
    color: '#10B981',
  },
  discountLabel: {
    fontSize: 13,
    color: '#059669',
  },
  discountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  bottomBarContent: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelOrderBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  reorderBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cancelWarningStrip: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cancelWarningTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelWarningSubtitle: {
    fontSize: 11.5,
    color: '#DC2626',
    marginTop: 2,
    lineHeight: 15,
  },
  modalSubheading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  reasonOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: '#059669',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  reasonText: {
    fontSize: 13,
    color: '#374151',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalKeepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalKeepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  modalConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalConfirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addrEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  addrEditBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  bottomEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
  },
  bottomEditBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  editOfferCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  editOfferHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  editOfferText: {
    fontSize: 11.5,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
  },
  editOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editOfferBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  orderSupportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderSupportIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderSupportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  orderSupportSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
