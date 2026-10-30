import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export type DutyStatus = 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';

const DUTY_OPTIONS: Array<{
  status: DutyStatus;
  label: string;
  sublabel: string;
  dotColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}> = [
  {
    status: 'ON_DUTY',
    label: 'ON DUTY',
    sublabel: 'Available & receiving deliveries',
    dotColor: '#10B981',
    badgeBg: '#ECFDF5',
    badgeBorder: '#A7F3D0',
    badgeText: '#059669',
  },
  {
    status: 'ON_BREAK',
    label: 'ON BREAK',
    sublabel: 'Resting / Tea break (No new orders)',
    dotColor: '#F59E0B',
    badgeBg: '#FFFBEB',
    badgeBorder: '#FDE68A',
    badgeText: '#B45309',
  },
  {
    status: 'OFF_DUTY',
    label: 'OFF DUTY',
    sublabel: 'Shift ended / Offline',
    dotColor: '#94A3B8',
    badgeBg: '#F1F5F9',
    badgeBorder: '#E2E8F0',
    badgeText: '#475569',
  },
];

export const DeliveryDashboardScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshProfile } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [codSummary, setCodSummary] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>((user?.dutyStatus as DutyStatus) || 'OFF_DUTY');
  const [dutyModalVisible, setDutyModalVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [togglingDuty, setTogglingDuty] = useState<boolean>(false);

  // Fetch complete live data from backend
  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, codRes, profileRes] = await Promise.allSettled([
        api.getMyDeliveries(),
        api.getCodSummary(),
        api.getDeliveryProfile(),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        const raw = ordersRes.value.data;
        setOrders(Array.isArray(raw) ? raw : []);
      }
      if (codRes.status === 'fulfilled' && codRes.value?.data) {
        setCodSummary(codRes.value.data);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        const p = profileRes.value.data;
        setProfile(p);
        if (p.dutyStatus) {
          setDutyStatus(p.dutyStatus as DutyStatus);
        }
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectDutyStatus = async (newStatus: DutyStatus) => {
    setDutyModalVisible(false);
    if (newStatus === dutyStatus) return;

    setTogglingDuty(true);
    try {
      await api.updateDutyStatus(newStatus);
      setDutyStatus(newStatus);
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Status Update Failed', err.message || 'Could not update duty status');
    } finally {
      setTogglingDuty(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Rider Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Filtered orders (Active vs All)
  const filteredOrders = useMemo(() => {
    if (activeTab === 'ACTIVE') {
      return orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'DELIVERY_FAILED');
    }
    return orders;
  }, [orders, activeTab]);

  const activeCount = useMemo(() => {
    return orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'DELIVERY_FAILED').length;
  }, [orders]);

  // Backend fields resolution
  const riderName = profile?.name || user?.name || 'Delivery Partner';
  const staffId = profile?.deliveryStaffId || user?.deliveryStaffId || 'DEL-RIDER';
  const vehicleInfo = [profile?.vehicleType || user?.vehicleType || 'Bike', profile?.vehicleNumber || user?.vehicleNumber]
    .filter(Boolean)
    .join(' · ');

  const cashInHand =
    codSummary?.pendingHandoverAmount ??
    codSummary?.todayCollectedAmount ??
    codSummary?.cashInHand ??
    0;

  const todayDelivered = codSummary?.todayDeliveredCount ?? 0;
  const currentDutyConfig = DUTY_OPTIONS.find((o) => o.status === dutyStatus) || DUTY_OPTIONS[2];

  const renderDeliveryOrder = ({ item }: { item: any }) => {
    const isCod = item.paymentMethod === 'COD';
    const targetOrderId = item.orderId || item.id || item.assignmentId;
    const orderNum = item.orderNumber || (targetOrderId ? String(targetOrderId).slice(-6).toUpperCase() : '');

    // Full real address from backend
    const addressStr =
      typeof item.deliveryAddress === 'string'
        ? item.deliveryAddress
        : item.deliveryAddress?.fullAddress ||
          [
            item.deliveryAddress?.houseNo,
            item.deliveryAddress?.street,
            item.deliveryAddress?.landmark,
            item.deliveryAddress?.city,
          ]
            .filter(Boolean)
            .join(', ') ||
          'Address not provided';

    const totalAmount = item.grandTotal ?? item.codAmountToCollect ?? item.totalAmount ?? 0;
    const itemsCount = item.itemCount || item.items?.length || 1;
    const isScheduled = Boolean(item.deliverySlot || item.deliveryType === 'SCHEDULED');
    const isDelivered = item.status === 'DELIVERED';
    const isOutForDelivery = item.status === 'OUT_FOR_DELIVERY';

    return (
      <View style={styles.orderCard}>
        {/* Top Row: Order # + Payment Badge */}
        <View style={styles.orderTop}>
          <View style={styles.orderTopLeft}>
            <View style={styles.orderIdRow}>
              <Text style={styles.orderIdText} numberOfLines={1}>Order #{orderNum}</Text>
              <View style={styles.itemsCountBadge}>
                <Text style={styles.itemsCountText}>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</Text>
              </View>
            </View>
            <Text style={styles.customerName} numberOfLines={1}>
              Customer: {item.customerName || 'Customer'}
            </Text>
          </View>

          <View style={[styles.payBadge, isCod ? styles.codBadge : styles.onlineBadge]}>
            <Text style={[styles.payBadgeText, isCod ? styles.codText : styles.onlineText]} numberOfLines={1}>
              {isCod ? `COD ₹${totalAmount}` : 'Paid Online'}
            </Text>
          </View>
        </View>

        {/* Delivery Type & Status Pill */}
        <View style={styles.metaRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.typeText} numberOfLines={1}>
              {isScheduled
                ? `Scheduled: ${item.deliveryDate || 'Today'} ${item.deliverySlot ? `(${item.deliverySlot})` : ''}`
                : 'Instant (15-20 Min)'}
            </Text>
          </View>

          <View style={[styles.statusPill, isDelivered ? styles.statusPillDelivered : isOutForDelivery ? styles.statusPillOut : styles.statusPillAssigned]}>
            <Text style={[styles.statusPillText, isDelivered ? styles.statusTextDelivered : isOutForDelivery ? styles.statusTextOut : styles.statusTextAssigned]} numberOfLines={1}>
              {item.status ? item.status.replace(/_/g, ' ') : 'ASSIGNED'}
            </Text>
          </View>
        </View>

        {/* Address Box */}
        <View style={styles.addressBox}>
          <Feather name="map-pin" size={13} color={Colors.primary} style={styles.addressIcon} />
          <Text style={styles.addressText} numberOfLines={2}>
            {addressStr}
          </Text>
        </View>

        {/* Action Buttons Row: Call removed, uniform Chat + Deliver */}
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.chatBtn}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate('DeliveryChat', {
                orderId: targetOrderId,
                orderNumber: orderNum,
              })
            }
          >
            <Feather name="message-square" size={13} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.chatBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deliverBtn}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('DeliveryOrderDetail', {
                orderId: targetOrderId,
              })
            }
          >
            <Text style={styles.deliverBtnText}>
              {isDelivered ? 'View Details' : 'Deliver Order'}
            </Text>
            <Feather name="arrow-right" size={13} color="#FFFFFF" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Top Header Bar with Rider Profile */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.riderProfileWrap}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderAvatarText}>
              {riderName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.riderName} numberOfLines={1}>{riderName}</Text>
            <Text style={styles.staffId} numberOfLines={1}>
              {staffId} · {vehicleInfo}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {/* Duty Status Capsule (3 Options: ON_DUTY, ON_BREAK, OFF_DUTY) */}
          <TouchableOpacity
            style={[
              styles.dutyCapsule,
              { backgroundColor: currentDutyConfig.badgeBg, borderColor: currentDutyConfig.badgeBorder },
            ]}
            onPress={() => setDutyModalVisible(true)}
            activeOpacity={0.8}
            disabled={togglingDuty}
          >
            {togglingDuty ? (
              <ActivityIndicator size="small" color={currentDutyConfig.badgeText} style={{ marginRight: 4 }} />
            ) : (
              <View style={[styles.dutyDot, { backgroundColor: currentDutyConfig.dotColor }]} />
            )}
            <Text style={[styles.dutyLabel, { color: currentDutyConfig.badgeText }]}>
              {currentDutyConfig.label}
            </Text>
            <Feather
              name="chevron-down"
              size={12}
              color={currentDutyConfig.badgeText}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogoutPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="log-out" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderDeliveryOrder}
        keyExtractor={(item) => String(item.assignmentId || item.orderId || item.id || Math.random())}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <>
            {/* Cash in Hand & Today Performance (Flat Clean Box) */}
            <TouchableOpacity
              style={styles.codBox}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('DeliveryCod')}
            >
              <View style={styles.codLeft}>
                <Text style={styles.codTitle}>Today Cash In Hand</Text>
                <Text style={styles.codAmount}>₹{cashInHand}</Text>
                <View style={styles.deliveredCountRow}>
                  <Feather name="check-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.codSub}>
                    {todayDelivered} deliveries completed today
                  </Text>
                </View>
              </View>

              <View style={styles.codRightPill}>
                <Text style={styles.codRightText}>COD Details</Text>
                <Feather name="chevron-right" size={12} color={Colors.primary} />
              </View>
            </TouchableOpacity>

            {/* Filter Tabs for Deliveries: All Orders first, then Active */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabCapsule, activeTab === 'ALL' && styles.tabCapsuleActive]}
                onPress={() => setActiveTab('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
                  All Orders ({orders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabCapsule, activeTab === 'ACTIVE' && styles.tabCapsuleActive]}
                onPress={() => setActiveTab('ACTIVE')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
                  Active ({activeCount})
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Feather name="package" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE' ? 'No Active Deliveries' : 'No Orders Assigned'}
              </Text>
              <Text style={styles.emptySub}>
                {dutyStatus === 'ON_DUTY'
                  ? 'You are online and ready! New orders assigned to you will appear here automatically.'
                  : dutyStatus === 'ON_BREAK'
                  ? 'You are currently ON BREAK. Switch back to ON DUTY when you are ready to receive deliveries.'
                  : 'You are currently OFF DUTY. Switch to ON DUTY above to start receiving deliveries.'}
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          )
        }
      />

      {/* Duty Status Selection Modal (3 Options fetched & synced with backend) */}
      <Modal
        visible={dutyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDutyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDutyModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Set Duty Status</Text>
            <Text style={styles.modalSub}>Update your real-time availability for deliveries</Text>

            <View style={styles.modalOptionsList}>
              {DUTY_OPTIONS.map((opt) => {
                const isSelected = opt.status === dutyStatus;
                return (
                  <TouchableOpacity
                    key={opt.status}
                    style={[
                      styles.modalOptionCard,
                      isSelected && { borderColor: opt.badgeBorder, backgroundColor: opt.badgeBg },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleSelectDutyStatus(opt.status)}
                  >
                    <View style={[styles.modalOptionDot, { backgroundColor: opt.dotColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionTitle, isSelected && { color: opt.badgeText }]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.modalOptionSub}>{opt.sublabel}</Text>
                    </View>
                    {isSelected ? (
                      <Feather name="check" size={18} color={opt.badgeText} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setDutyModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  riderProfileWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  riderAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  riderName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  staffId: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dutyCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dutyLabel: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  modalOptionsList: {
    gap: 10,
    marginBottom: 16,
  },
  modalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  modalOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  modalOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCancelBtn: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Flat outline box (No floating card shadows)
  codBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codLeft: {
    flex: 1,
  },
  codTitle: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
  },
  codAmount: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  deliveredCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  codSub: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
  codRightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  codRightText: {
    color: Colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
    marginRight: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabCapsuleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Flat outline order card (Clean 1px border on all 4 sides)
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderTopLeft: {
    flex: 1,
    marginRight: 10,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  orderIdText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemsCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  itemsCountText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  customerName: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  payBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  codBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  onlineBadge: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryBorder,
  },
  payBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  codText: {
    color: '#B45309',
  },
  onlineText: {
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPillAssigned: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusPillOut: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  statusPillDelivered: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryBorder,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusTextAssigned: {
    color: '#475569',
  },
  statusTextOut: {
    color: '#C2410C',
  },
  statusTextDelivered: {
    color: Colors.primary,
  },
  // Address box with 4-side clean border
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  chatBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 8,
  },
  chatBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  deliverBtn: {
    flex: 1.5,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  deliverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
