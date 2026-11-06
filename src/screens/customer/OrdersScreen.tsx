import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
  ToastAndroid,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { Order, Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { EditOrderDetailsModal } from '../../components/EditOrderDetailsModal';
import { OrderCardSkeleton } from '../../components/common/Skeleton';
import { OrderCancelledModal } from '../../components/customer/OrderCancelledModal';

const CANCEL_REASONS = [
  'Placed order by mistake',
  'Need to change delivery address or phone number',
  'Need to add or modify items in grocery basket',
  'Selected delivery timing is no longer suitable',
  'Found items available earlier locally',
  'Other reason',
];

const isOrderActive = (status: string) => {
  const s = (status || '').toUpperCase();
  return ['NEW', 'CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY', 'ACCEPTED', 'PACKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(s);
};

const isOrderDelivered = (status: string) => {
  const s = (status || '').toUpperCase();
  return ['DELIVERED', 'COMPLETED'].includes(s);
};

const isOrderCancelled = (status: string) => {
  const s = (status || '').toUpperCase();
  return ['CANCELLED', 'CANCELED', 'FAILED', 'REJECTED'].includes(s);
};

const canOrderCancel = (status: string) => {
  const s = (status || '').toUpperCase();
  return ['NEW', 'CONFIRMED', 'PENDING', 'PACKING'].includes(s);
};

const formatScheduledTime = (date?: string | null, slot?: string | null) => {
  if (!date && !slot) return 'Scheduled';
  let slotLabel = (slot || '').trim();
  if (slotLabel.includes('(')) {
    const match = slotLabel.match(/\(([^)]+)\)/);
    if (match) {
      slotLabel = match[1].trim();
    }
  }
  if (date && slotLabel) return `${date} (${slotLabel})`;
  return date || slotLabel;
};

const formatDateTime = (val: any) => {
  if (!val) return 'Recent';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getStatusBadge = (status: string, tStatus?: (s: string) => string) => {
  const s = (status || '').toUpperCase();
  const label = tStatus ? tStatus(status) : status;
  if (['DELIVERED', 'COMPLETED'].includes(s)) {
    return { text: label || 'Delivered', bg: Colors.primaryLight, color: Colors.primaryDark, border: Colors.primaryBorder };
  }
  if (['CANCELLED', 'CANCELED', 'FAILED', 'REJECTED'].includes(s)) {
    return { text: label || 'Cancelled', bg: '#FEF2F2', color: '#991B1B', border: '#FEE2E2' };
  }
  if (['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'OUT FOR DELIVERY'].includes(s)) {
    return { text: label || 'Out for Delivery', bg: Colors.primaryLight, color: Colors.primary, border: Colors.primaryBorder };
  }
  if (['PACKING', 'PACKED'].includes(s)) {
    return { text: label || 'Packing', bg: Colors.primaryLight, color: Colors.primary, border: Colors.primaryBorder };
  }
  if (['CONFIRMED', 'ACCEPTED'].includes(s)) {
    return { text: label || 'Confirmed', bg: Colors.primaryLight, color: Colors.primary, border: Colors.primaryBorder };
  }
  return { text: label || status || 'Placed', bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' };
};

export const OrdersScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { lang, t, tProd, tStatus, prefetchTranslations } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Delivered' | 'Cancelled'>('All');
  const [search, setSearch] = useState<string>('');

  // Cancel order modal state
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancelSuccessVisible, setCancelSuccessVisible] = useState<boolean>(false);
  const [cancelledOrderNumber, setCancelledOrderNumber] = useState<string>('');

  // Edit order details modal state
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);

  const handleOpenEdit = (order: Order) => {
    setSelectedOrderToEdit(order);
    setEditModalVisible(true);
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = await api.getToken();
      if (!token && !user) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await api.getOrders();
      const raw = res?.data?.data || res?.data?.orders || res?.data || res;
      if (Array.isArray(raw)) {
        setOrders(raw);
        const itemNames: string[] = [];
        raw.forEach((o: any) => {
          o.items?.forEach((i: any) => {
            if (i?.name) itemNames.push(i.name);
          });
        });
        if (itemNames.length > 0) prefetchTranslations(itemNames);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.warn('Orders fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const copyOrderId = (orderNumber: string) => {
    setCopiedId(orderNumber);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Copied #${orderNumber}`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', `Order #${orderNumber} copied to clipboard`);
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Re-order functionality
  const handleReorder = (order: Order) => {
    const items = order.items || [];
    if (!items.length) {
      Alert.alert('Empty Order', 'This order has no items to re-order.');
      return;
    }

    let addedCount = 0;
    items.forEach(item => {
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
        ? `ऑर्डर #${order.orderNumber || order.id.slice(-8).toUpperCase()} के ${addedCount} आइटम आपकी बास्केट में जोड़ दिए गए हैं!`
        : `Added ${addedCount} items from Order #${order.orderNumber || order.id.slice(-8).toUpperCase()} to your basket!`,
      [
        { text: lang === 'hi' ? 'ठीक है' : 'OK' },
        {
          text: lang === 'hi' ? 'बास्केट देखें' : 'View Basket',
          onPress: () => navigation.navigate('Cart'),
        },
      ]
    );
  };

  // Cancel order execution
  const executeCancelOrder = async () => {
    if (!selectedOrderToCancel) return;
    const finalReason = selectedReason === 'Other reason' ? (customReason.trim() || 'Other reason') : selectedReason;
    const orderNum = selectedOrderToCancel.orderNumber || selectedOrderToCancel.id?.slice(-8).toUpperCase() || '';

    setCancelling(true);
    try {
      await api.cancelOrder(selectedOrderToCancel.id, finalReason);
      setCancelModalVisible(false);
      setSelectedOrderToCancel(null);
      setCancelledOrderNumber(orderNum);
      setCancelSuccessVisible(true);
      fetchOrders();
    } catch (err: any) {
      Alert.alert(
        lang === 'hi' ? 'त्रुटि' : 'Error',
        err.message || 'Could not cancel order. Please try again.'
      );
    } finally {
      setCancelling(false);
    }
  };

  // Status Counts
  const totalCount = orders.length;
  const activeCount = useMemo(() => orders.filter(o => isOrderActive(o.status)).length, [orders]);
  const deliveredCount = useMemo(() => orders.filter(o => isOrderDelivered(o.status)).length, [orders]);
  const cancelledCount = useMemo(() => orders.filter(o => isOrderCancelled(o.status)).length, [orders]);

  // Filtered List
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeTab === 'Active') {
      list = list.filter(o => isOrderActive(o.status));
    } else if (activeTab === 'Delivered') {
      list = list.filter(o => isOrderDelivered(o.status));
    } else if (activeTab === 'Cancelled') {
      list = list.filter(o => isOrderCancelled(o.status));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(o => {
        const idMatch = (o.orderNumber || o.id || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some(item => (item.name || '').toLowerCase().includes(q));
        return idMatch || itemMatch;
      });
    }

    return list;
  }, [orders, activeTab, search]);

  // Render Order Card (Clean Minimalist)
  const renderOrderItem = ({ item }: { item: Order }) => {
    const badge = getStatusBadge(item.status, tStatus);
    const active = isOrderActive(item.status);
    const cancellable = canOrderCancel(item.status);
    const isScheduled = item.deliveryType === 'SCHEDULED';
    const isDelivered = isOrderDelivered(item.status);
    const isCancelled = isOrderCancelled(item.status);
    const orderNum = item.orderNumber || item.id.slice(-8).toUpperCase();
    const dateFormatted = formatDateTime(item.date || item.createdAt);

    // Items preview
    const items = item.items || [];
    const previewNames = items.slice(0, 3).map(x => tProd(x)).join(', ');
    const remainingCount = items.length > 3 ? items.length - 3 : 0;

    const totalAmount = item.total ?? item.grandTotal ?? item.totalAmount ?? 0;
    const isCod = item.paymentMethod === 'COD';

    return (
      <TouchableOpacity
        style={styles.orderCardV2}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id || item.orderNumber })}
      >
        {/* Card Header: Order ID & Time on Left, Clean Status Badge on Right */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.orderNumberText}>Order #{orderNum}</Text>
              <TouchableOpacity
                onPress={() => copyOrderId(orderNum)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.copyBtn}
              >
                <Text style={styles.copyBtnText}>
                  {copiedId === orderNum ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardDateText}>
              {dateFormatted} · {isScheduled ? formatScheduledTime(item.deliveryDate, item.deliverySlot) : 'Instant'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>

        {/* Card Body: Items Preview & Pricing */}
        <View style={styles.cardBody}>
          <View style={styles.cardItemsCol}>
            {/* Thumbnails */}
            <View style={styles.itemsThumbsRow}>
              {items.slice(0, 3).map((prod, idx) => (
                <View key={prod.id || idx} style={styles.thumbBox}>
                  {prod.image || prod.imageUrl ? (
                    <Image
                      source={{ uri: prod.image || prod.imageUrl }}
                      style={styles.thumbImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.thumbEmpty} />
                  )}
                  {prod.quantity > 1 && (
                    <View style={styles.qtyTag}>
                      <Text style={styles.qtyTagText}>{prod.quantity}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Names & Count */}
            <View style={styles.itemsTextWrap}>
              <Text style={styles.itemsNamesText} numberOfLines={1}>
                {previewNames || 'Grocery order items'}
              </Text>
              <Text style={styles.itemsCountText}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
                {remainingCount > 0 ? ` +${remainingCount} more` : ''}
              </Text>
            </View>
          </View>

          {/* Pricing & Payment Mode */}
          <View style={styles.priceSummaryCol}>
            <Text style={styles.grandTotalText}>₹{totalAmount}</Text>
            <Text style={styles.paymentMethodText}>
              {isCod ? 'Cash on Delivery' : 'Paid Online'}
            </Text>
          </View>
        </View>

        {/* Card Footer Actions */}
        <View style={styles.cardFooter}>
          <Text
            style={[
              styles.footerNoteText,
              active && styles.footerNoteActive,
              isDelivered && styles.footerNoteDelivered,
              isCancelled && styles.footerNoteCancelled,
            ]}
          >
            {badge.text}
          </Text>

          <View style={styles.btnActionsRow}>
            {item.status === 'Out for Delivery' && (
              <TouchableOpacity
                style={styles.chatBtn}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('CustomerChat', {
                    orderId: item.id,
                    orderNumber: orderNum,
                  })
                }
              >
                <Text style={styles.chatBtnText}>{t('chat', 'Chat')}</Text>
              </TouchableOpacity>
            )}

            {cancellable && (
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.7}
                onPress={() => handleOpenEdit(item)}
              >
                <Text style={styles.editBtnText}>{t('edit', 'Edit')}</Text>
              </TouchableOpacity>
            )}

            {cancellable && (
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedOrderToCancel(item);
                  setSelectedReason(CANCEL_REASONS[0]);
                  setCustomReason('');
                  setCancelModalVisible(true);
                }}
              >
                <Text style={styles.cancelBtnText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.reorderBtn}
              activeOpacity={0.8}
              onPress={() => handleReorder(item)}
            >
              <Text style={styles.reorderBtnText}>{t('reorder', 'Re-order')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailsBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id || item.orderNumber })}
            >
              <Text style={styles.detailsBtnText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header & Filter */}
      <View style={styles.heroBanner}>
        {/* Top Header Row */}
        <View style={styles.headerTopRow}>
          <View style={styles.titleWithBadge}>
            {navigation?.canGoBack && navigation.canGoBack() && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="chevron-left" size={24} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.heroTitle}>{t('myOrders', 'My Orders')}</Text>
            {totalCount > 0 && (
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>{totalCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { id: 'All', label: t('all', 'All'), count: totalCount },
            { id: 'Active', label: t('active', 'Active'), count: activeCount },
            { id: 'Delivered', label: t('delivered', 'Delivered'), count: deliveredCount },
            { id: 'Cancelled', label: t('cancelled', 'Cancelled'), count: cancelledCount },
          ].map(tabItem => {
            const isSelected = activeTab === tabItem.id;
            return (
              <TouchableOpacity
                key={tabItem.id}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setActiveTab(tabItem.id as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {tabItem.label}
                </Text>
                <View style={[styles.tabCountPill, isSelected && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, isSelected && styles.tabCountTextActive]}>
                    {tabItem.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Input Box */}
        <View style={styles.searchBox}>
          <Feather name="search" size={14} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchOrdersPlaceholder', 'Search by Order ID or grocery item...')}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Orders List or Skeleton Loading */}
      {loading ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id || item.orderNumber || String(Math.random())}
          renderItem={renderOrderItem}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconOuter}>
                <View style={styles.emptyIconCircle}>
                  <Feather
                    name={
                      search
                        ? 'search'
                        : activeTab === 'Delivered'
                        ? 'check-circle'
                        : activeTab === 'Active'
                        ? 'clock'
                        : 'shopping-bag'
                    }
                    size={32}
                    color={Colors.primary}
                  />
                </View>
              </View>
              <Text style={styles.emptyTitle}>
                {search
                  ? t('noMatchingOrders', 'No matching orders found')
                  : activeTab === 'Active'
                  ? t('noActiveDeliveries', 'No active deliveries')
                  : activeTab === 'Delivered'
                  ? t('noCompletedOrders', 'No completed orders yet')
                  : t('noOrdersYet', 'No orders yet')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `${t('noOrdersFoundFor', 'No orders matching')} "${search}". ${t('tryAnotherSearch', 'Try another search.')}`
                  : activeTab === 'Active'
                  ? t('allPastCompleted', 'All your past orders have been completed.')
                  : activeTab === 'Delivered'
                  ? t('deliveredWillShow', 'Your delivered orders will appear here.')
                  : t('noOrdersYetSub', 'When you place orders, they will appear here with live tracking.')}
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('MainTabs')}
              >
                <Feather name="shopping-bag" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.exploreBtnText}>{t('shopFreshGroceries', 'Shop Fresh Groceries')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Cancel Order Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Cancel Order</Text>
              <TouchableOpacity
                onPress={() => setCancelModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Warning strip */}
            <View style={styles.cancelWarningStrip}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelWarningTitle}>
                  Cancel order #{selectedOrderToCancel?.orderNumber || selectedOrderToCancel?.id?.slice(-8).toUpperCase()}?
                </Text>
                <Text style={styles.cancelWarningSubtitle}>
                  Items in this order will be released and returned to store inventory.
                </Text>
              </View>
            </View>

            <Text style={styles.modalSubheading}>Please select a cancellation reason:</Text>

            {CANCEL_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedReason === reason && styles.reasonOptionActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={[styles.radioCircle, selectedReason === reason && styles.radioCircleSelected]}>
                  {selectedReason === reason && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 'Other reason' && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Tell us why you are cancelling..."
                placeholderTextColor="#94A3B8"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />
            )}

            {/* Edit details notice */}
            {(selectedReason === 'Need to change delivery address or phone number' ||
              selectedReason === 'Selected delivery timing is no longer suitable') && (
              <View style={styles.editOfferCard}>
                <Text style={styles.editOfferText}>
                  You can edit recipient, address, or delivery slot without cancelling.
                </Text>
                <TouchableOpacity
                  style={styles.editOfferBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    const toEdit = selectedOrderToCancel;
                    setCancelModalVisible(false);
                    if (toEdit) {
                      setTimeout(() => handleOpenEdit(toEdit), 300);
                    }
                  }}
                >
                  <Text style={styles.editOfferBtnText}>Edit details instead</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalKeepBtn}
                activeOpacity={0.8}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalKeepBtnText}>Keep Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmCancelBtn}
                activeOpacity={0.8}
                onPress={executeCancelOrder}
                disabled={cancelling}
              >
                <Text style={styles.modalConfirmCancelBtnText}>
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Order Details Modal */}
      <EditOrderDetailsModal
        visible={editModalVisible}
        order={selectedOrderToEdit}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedOrderToEdit(null);
        }}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Custom Designed Order Cancelled Modal */}
      <OrderCancelledModal
        visible={cancelSuccessVisible}
        orderNumber={cancelledOrderNumber}
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
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 8,
    padding: 3,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  totalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabCountPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabCountPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  orderCardV2: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  copyBtn: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardDateText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardItemsCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    minWidth: 0,
  },
  itemsThumbsRow: {
    flexDirection: 'row',
    marginRight: 8,
    flexShrink: 0,
  },
  thumbBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  qtyTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.7)',
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderTopLeftRadius: 3,
  },
  qtyTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  itemsNamesText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemsCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  priceSummaryCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  grandTotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  paymentMethodText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  footerNoteText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  footerNoteActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  footerNoteDelivered: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  footerNoteCancelled: {
    color: '#DC2626',
    fontWeight: '700',
  },
  btnActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reorderBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsBtn: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  detailsBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  editBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  cancelBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  cancelBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
  },
  chatBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  chatBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginHorizontal: 4,
    marginVertical: 12,
  },
  emptyIconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  exploreBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelWarningStrip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  cancelWarningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelWarningSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 15,
  },
  modalSubheading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  reasonOptionActive: {
    backgroundColor: '#F8FAFC',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: '#0F172A',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  reasonText: {
    fontSize: 12.5,
    color: '#334155',
  },
  reasonTextActive: {
    fontWeight: '600',
    color: '#0F172A',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
    fontSize: 12.5,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalKeepBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalKeepBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalConfirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editOfferCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  editOfferText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  editOfferBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editOfferBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
});
