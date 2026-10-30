import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';

export const DeliveryOrderDetailScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');

  const fetchDetails = useCallback(async () => {
    try {
      const res = await api.getDeliveryOrderDetails(orderId);
      if (res.data) {
        setOrder(res.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const targetOrderId = order?.orderId || order?.id || orderId;
  const orderNum = order?.orderNumber || (targetOrderId ? String(targetOrderId).slice(-6).toUpperCase() : '');
  const isCod = order?.paymentMethod === 'COD';
  const totalAmount = order?.grandTotal ?? order?.totalAmount ?? order?.codAmountToCollect ?? 0;
  const isDelivered = order?.status === 'DELIVERED';
  const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY';
  const isFailed = order?.status === 'DELIVERY_FAILED';

  const addressStr =
    typeof order?.deliveryAddress === 'string'
      ? order.deliveryAddress
      : order?.deliveryAddress?.fullAddress ||
        [
          order?.deliveryAddress?.houseNo,
          order?.deliveryAddress?.street,
          order?.deliveryAddress?.landmark,
          order?.deliveryAddress?.city,
        ]
          .filter(Boolean)
          .join(', ') ||
        'Address not provided';

  const handleStartDelivery = async () => {
    setUpdating(true);
    try {
      await api.updateDeliveryStatus(targetOrderId, 'OUT_FOR_DELIVERY');
      Alert.alert('Order Out for Delivery', 'Customer has been notified that you are on the way.');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteDelivery = async () => {
    setUpdating(true);
    try {
      await api.completeDelivery(targetOrderId, otp.trim() || undefined, 'Delivered by rider');
      Alert.alert('Delivery Successful', 'Order marked as delivered.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Delivery Failed', err.message || 'Could not complete delivery');
    } finally {
      setUpdating(false);
    }
  };

  const handleReportFailure = () => {
    Alert.prompt
      ? Alert.prompt(
          'Report Delivery Issue',
          'Please specify the reason (e.g. Customer unavailable, Wrong address):',
          async (reason) => {
            if (!reason?.trim()) return;
            try {
              setUpdating(true);
              await api.reportDeliveryFailure(targetOrderId, reason.trim());
              Alert.alert('Reported', 'Delivery failure has been recorded.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setUpdating(false);
            }
          }
        )
      : Alert.alert(
          'Report Delivery Issue',
          'Customer was unavailable or delivery could not be completed.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm Failure',
              style: 'destructive',
              onPress: async () => {
                try {
                  setUpdating(true);
                  await api.reportDeliveryFailure(targetOrderId, 'Customer unavailable at location');
                  navigation.goBack();
                } catch (err: any) {
                  Alert.alert('Error', err.message);
                } finally {
                  setUpdating(false);
                }
              },
            },
          ]
        );
  };

  const handleOpenMaps = () => {
    if (order?.googleMapsUrl) {
      Linking.openURL(order.googleMapsUrl);
    } else if (addressStr && addressStr !== 'Address not provided') {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}`);
    } else {
      Alert.alert('Location unavailable', 'Full address coordinates not found.');
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.loaderWrap, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderText}>Loading order details...</Text>
      </View>
    );
  }

  const items = order.items || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>Order #{orderNum}</Text>
          <Text style={styles.headerSubtitle}>Delivery Details</Text>
        </View>

        <View style={[styles.statusBadge, isDelivered ? styles.badgeDelivered : isOutForDelivery ? styles.badgeOut : isFailed ? styles.badgeFailed : styles.badgeAssigned]}>
          <Text style={[styles.statusBadgeText, isDelivered ? styles.statusTextDelivered : isOutForDelivery ? styles.statusTextOut : isFailed ? styles.statusTextFailed : styles.statusTextAssigned]}>
            {order.status ? order.status.replace(/_/g, ' ') : 'ASSIGNED'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Collect Card */}
        <View style={[styles.card, isCod ? styles.paymentCardCod : styles.paymentCardOnline]}>
          <View style={styles.paymentRow}>
            <View style={[styles.paymentIconCircle, isCod ? styles.iconCircleCod : styles.iconCircleOnline]}>
              <Feather name={isCod ? 'dollar-sign' : 'check'} size={18} color={isCod ? '#B45309' : Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentTitle, isCod ? styles.paymentTextCod : styles.paymentTextOnline]}>
                {isCod ? `Collect Cash: ₹${totalAmount}` : 'Paid Online'}
              </Text>
              <Text style={styles.paymentSub}>
                {isCod ? 'Collect exact cash from customer at doorstep' : 'Order is prepaid. Do not collect any cash.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer & Location Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Customer & Address</Text>

          <View style={styles.infoRow}>
            <Feather name="user" size={14} color="#64748B" style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Customer Name</Text>
              <Text style={styles.infoVal}>{order.customerName || 'Customer'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color="#64748B" style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoVal}>{addressStr}</Text>
              {order.villageName ? (
                <Text style={styles.infoSubVal}>Zone / Area: {order.villageName}</Text>
              ) : null}
            </View>
          </View>

          {order.deliverySlot ? (
            <View style={styles.infoRow}>
              <Feather name="clock" size={14} color="#64748B" style={styles.infoIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Delivery Slot</Text>
                <Text style={styles.infoVal}>{order.deliveryDate || 'Today'} · {order.deliverySlot}</Text>
              </View>
            </View>
          ) : null}

          {order.deliveryInstruction ? (
            <View style={styles.instructionsBox}>
              <Feather name="info" size={13} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.instructionsText}>
                Note: {order.deliveryInstruction}
              </Text>
            </View>
          ) : null}

          {/* Action Row: Open in Maps & Chat (Call removed) */}
          <View style={styles.locationActionsRow}>
            <TouchableOpacity
              style={styles.mapBtn}
              activeOpacity={0.8}
              onPress={handleOpenMaps}
            >
              <Feather name="navigation" size={14} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.mapBtnText}>Open in Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatActionBtn}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('DeliveryChat', {
                  orderId: targetOrderId,
                  orderNumber: orderNum,
                  customerName: order.customerName,
                })
              }
            >
              <Feather name="message-square" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.chatActionBtnText}>Chat Customer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Items in Bag */}
        <View style={styles.card}>
          <View style={styles.itemsHeaderRow}>
            <Text style={styles.cardHeader}>Items in Bag</Text>
            <View style={styles.itemsBadge}>
              <Text style={styles.itemsBadgeText}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
            </View>
          </View>

          {items.map((item: any, idx: number) => {
            const itemName = item.name || item.title || item.product?.title || `Item #${idx + 1}`;
            const itemQty = item.quantity || item.qty || 1;
            const itemPrice = item.price ?? item.unitPrice ?? 0;
            const itemUnit = item.unit || item.product?.unit || '';

            return (
              <View key={item.id || idx} style={[styles.itemRow, idx === items.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.itemDot} />
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{itemName}</Text>
                  {itemUnit ? (
                    <Text style={styles.itemUnit}>{itemUnit}</Text>
                  ) : null}
                </View>
                <View style={styles.itemQtyPill}>
                  <Text style={styles.itemQtyText}>x{itemQty}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{itemPrice * itemQty}</Text>
              </View>
            );
          })}
        </View>

        {/* Delivery Workflow Actions */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Delivery Status Actions</Text>

          {!isOutForDelivery && !isDelivered && !isFailed ? (
            <TouchableOpacity
              style={[styles.primaryActionBtn, updating && styles.btnDisabled]}
              disabled={updating}
              onPress={handleStartDelivery}
              activeOpacity={0.85}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="truck" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionText}>Start Delivery (Out For Delivery)</Text>
                </>
              )}
            </TouchableOpacity>
          ) : isOutForDelivery ? (
            <>
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>Delivery Verification Code (OTP)</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 4 or 6 digit OTP if required"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, updating && styles.btnDisabled]}
                disabled={updating}
                onPress={handleCompleteDelivery}
                activeOpacity={0.85}
              >
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionText}>Mark Order Delivered</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.failureBtn}
                disabled={updating}
                onPress={handleReportFailure}
                activeOpacity={0.8}
              >
                <Feather name="alert-triangle" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.failureBtnText}>Report Delivery Issue / Failed</Text>
              </TouchableOpacity>
            </>
          ) : isDelivered ? (
            <View style={styles.deliveredSuccessBanner}>
              <Feather name="check-circle" size={18} color="#059669" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveredSuccessTitle}>Order Delivered</Text>
                <Text style={styles.deliveredSuccessSub}>
                  {order.deliveredAt ? `Delivered on ${new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Completed successfully'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.failedBanner}>
              <Feather name="x-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.failedTitle}>Delivery Marked Failed</Text>
                <Text style={styles.failedSub}>{order.failureReason || 'Customer was unreachable'}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeAssigned: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  badgeOut: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  badgeDelivered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeFailed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextAssigned: {
    color: '#475569',
  },
  statusTextOut: {
    color: '#C2410C',
  },
  statusTextDelivered: {
    color: '#059669',
  },
  statusTextFailed: {
    color: '#DC2626',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentCardCod: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  paymentCardOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircleCod: {
    backgroundColor: '#FEF3C7',
  },
  iconCircleOnline: {
    backgroundColor: '#D1FAE5',
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  paymentTextCod: {
    color: '#B45309',
  },
  paymentTextOnline: {
    color: '#059669',
  },
  paymentSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  cardHeader: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
    lineHeight: 18,
  },
  infoSubVal: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    padding: 9,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
  },
  locationActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  mapBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  chatActionBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  chatActionBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemsBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  itemsBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  itemName: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '500',
  },
  itemUnit: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  itemQtyPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 12,
  },
  itemQtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  itemPrice: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  primaryActionBtn: {
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  otpBox: {
    marginBottom: 12,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  otpInput: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: 2,
  },
  failureBtn: {
    marginTop: 10,
    height: 38,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  failureBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  deliveredSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
  },
  deliveredSuccessTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
  },
  deliveredSuccessSub: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
  },
  failedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
  },
  failedTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  failedSub: {
    fontSize: 11.5,
    color: '#B91C1C',
    marginTop: 2,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
  },
});
