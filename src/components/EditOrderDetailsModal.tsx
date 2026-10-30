import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { Order } from '../types';
import { DatePickerModal } from './common/DatePickerModal';

interface EditOrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: (updatedData?: any) => void;
}

const DEFAULT_SLOTS = [
  'Morning Slot (07:00 AM - 11:00 AM)',
  'Midday Slot (10:00 AM - 01:00 PM)',
  'Afternoon Slot (01:00 PM - 04:00 PM)',
  'Evening Slot (04:00 PM - 07:00 PM)',
  'Night Slot (07:00 PM - 10:00 PM)',
];

export const EditOrderDetailsModal: React.FC<EditOrderDetailsModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [house, setHouse] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Hathua');
  const [pin, setPin] = useState('841436');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [updateSavedAddress, setUpdateSavedAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isScheduled = order?.deliveryType === 'SCHEDULED';

  useEffect(() => {
    if (order && visible) {
      const snap: any = order.address || (typeof (order as any).addressSnapshot === 'string'
        ? JSON.parse((order as any).addressSnapshot || '{}')
        : (order as any).addressSnapshot) || {};

      setName(snap.name || snap.fullName || order.customer || '');
      setMobile(snap.mobile || snap.phone || order.mobile || '');
      setHouse(snap.house || snap.houseNo || '');
      setStreet(snap.street || '');
      setLandmark(snap.landmark || '');
      setArea(snap.area || snap.villageName || snap.city || 'Hathua');
      setCity(snap.city || 'Hathua');
      setPin(snap.pin || snap.pincode || '841436');
      setDeliveryInstruction(order.deliveryInstruction || '');
      setDeliveryDate(order.deliveryDate || '');
      setDeliverySlot(order.deliverySlot || DEFAULT_SLOTS[0]);
      setUpdateSavedAddress(false);
      setError('');
    }
  }, [order, visible]);

  if (!visible || !order) return null;

  const handleSubmit = async () => {
    const cleanName = name.trim();
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanArea = area.trim();

    if (cleanName.length < 2) {
      setError('Recipient name must have at least 2 characters');
      return;
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!cleanArea) {
      setError('Village / Area name is required');
      return;
    }

    setBusy(true);
    setError('');

    const payload = {
      name: cleanName,
      mobile: cleanMobile,
      house: house.trim() || undefined,
      street: street.trim(),
      landmark: landmark.trim(),
      area: cleanArea,
      city: city.trim() || 'Hathua',
      pin: pin.trim() || '841436',
      deliveryInstruction: deliveryInstruction.trim() || undefined,
      deliveryDate: isScheduled ? deliveryDate.trim() : undefined,
      deliverySlot: isScheduled ? deliverySlot : undefined,
      updateSavedAddress,
    };

    try {
      const orderTargetId = order.id || order.orderNumber || '';
      if (!orderTargetId) {
        setError('Missing order identifier');
        setBusy(false);
        return;
      }
      const res = await api.updateOrderDetails(orderTargetId, payload);
      const updatedData = res?.data || payload;

      if (Platform.OS === 'android') {
        ToastAndroid.show('Order details updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Order details updated successfully!');
      }

      onSuccess(updatedData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update order details. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const orderNumber = order.orderNumber || order.id.slice(-8).toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBox}>
                <Feather name="edit-2" size={17} color="#059669" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Edit Order Details</Text>
                <Text style={styles.headerSubtitle}>#{orderNumber}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={busy}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info Notice Strip */}
            <View style={styles.infoStrip}>
              <Feather name="info" size={14} color="#0284C7" style={{ marginRight: 7, marginTop: 2 }} />
              <Text style={styles.infoStripText}>
                Updating delivery address and recipient details for order #{orderNumber}.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorStrip}>
                <Feather name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Recipient Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Mobile Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.mobileInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Street / Ward / Colony */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Street / Colony / Ward details</Text>
              <TextInput
                style={styles.input}
                value={street}
                onChangeText={setStreet}
                placeholder="e.g. Ward No. 3, Main Market road"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Landmark */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nearby Landmark (Mandir, School, etc.)</Text>
              <TextInput
                style={styles.input}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="e.g. Near Shiv Mandir, High School"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Village / Area */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Village / Area <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="e.g. Hathua, Station Road, Mirganj"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Delivery Instructions */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Delivery Instructions (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={deliveryInstruction}
                onChangeText={setDeliveryInstruction}
                placeholder="e.g. Leave at door, call before arriving..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Scheduled Date & Slot if Scheduled Order */}
            {isScheduled && (
              <View style={styles.scheduledCard}>
                <View style={styles.scheduledHeader}>
                  <Feather name="calendar" size={14} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.scheduledTitle}>SCHEDULED DELIVERY TIMING</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Delivery Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setDatePickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.datePickerBtnLeft}>
                      <Feather name="calendar" size={15} color="#059669" style={{ marginRight: 8 }} />
                      <Text style={[styles.datePickerBtnText, !deliveryDate && { color: '#94A3B8' }]}>
                        {deliveryDate ? deliveryDate : 'Choose delivery date'}
                      </Text>
                    </View>
                    <View style={styles.changeDateChip}>
                      <Text style={styles.changeDateChipText}>Pick Date</Text>
                      <Feather name="chevron-right" size={12} color="#059669" />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Select Delivery Slot</Text>
                  {DEFAULT_SLOTS.map(slot => {
                    const isSelected = deliverySlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotOption, isSelected && styles.slotOptionActive]}
                        onPress={() => setDeliverySlot(slot)}
                      >
                        <View style={[styles.slotRadio, isSelected && styles.slotRadioSelected]}>
                          {isSelected && <View style={styles.slotRadioDot} />}
                        </View>
                        <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Update Saved Address Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => setUpdateSavedAddress(!updateSavedAddress)}
            >
              <View style={[styles.checkboxBox, updateSavedAddress && styles.checkboxBoxChecked]}>
                {updateSavedAddress && <Feather name="check" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                Also update this in my saved addresses for future orders
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.cancelBtnText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, busy && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="check" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerOpen}
        selectedDate={deliveryDate}
        onSelectDate={d => setDeliveryDate(d)}
        onClose={() => setDatePickerOpen(false)}
        title="Select Scheduled Date"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    marginTop: 12,
    maxHeight: 460,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  infoStripText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 17,
  },
  errorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  mobileInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeBadge: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10.5,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  scheduledCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  scheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduledTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  slotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  slotOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  slotRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  slotRadioSelected: {
    borderColor: '#059669',
  },
  slotRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  slotText: {
    fontSize: 12,
    color: '#334155',
  },
  slotTextActive: {
    fontWeight: '700',
    color: '#065F46',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  changeDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeDateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginRight: 2,
  },
});
