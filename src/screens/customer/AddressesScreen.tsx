import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  ToastAndroid,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Address } from '../../types';
import { AddressCardSkeleton } from '../../components/common/Skeleton';

export const AddressesScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const isSelectMode = route?.params?.selectMode || false;

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardOpen(true);
        if (e.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields matching website r2cart.in
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [area, setArea] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [house, setHouse] = useState('');
  const [type, setType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [customType, setCustomType] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Fetch localities dynamically from backend delivery zones (website parity)
  const fetchLocalities = useCallback(async () => {
    try {
      const res = await api.getDelivery();
      const payload = res?.data;
      const foundSet = new Set<string>();

      if (Array.isArray(payload?.villages)) {
        payload.villages.forEach((v: any) => {
          if (v.name) foundSet.add(String(v.name).trim());
          if (v.villageName) foundSet.add(String(v.villageName).trim());
        });
      }
      if (Array.isArray(payload?.areas)) {
        payload.areas.forEach((a: any) => {
          if (a.name) foundSet.add(String(a.name).trim());
          if (Array.isArray(a.localities)) {
            a.localities.forEach((loc: any) => {
              if (loc) foundSet.add(String(loc).trim());
            });
          }
        });
      }

      if (foundSet.size > 0) {
        const sorted = Array.from(foundSet).sort((a, b) => a.localeCompare(b));
        setLocalities(sorted);
        setArea((prev) => (prev && sorted.includes(prev) ? prev : sorted[0] || ''));
      }
    } catch (err: any) {
      console.warn('Delivery localities fetch error:', err?.message);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await api.getAddresses();
      const list = res?.data?.data || res?.data?.addresses || res?.data || [];
      if (Array.isArray(list)) {
        setAddresses(list);
      }
    } catch (err: any) {
      console.warn('Addresses fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
      fetchLocalities();
    }, [fetchAddresses, fetchLocalities])
  );

  const resetForm = () => {
    setName(user?.name || '');
    setMobile(user?.mobile || '');
    setArea(localities[0] || '');
    setAreaSearch('');
    setDropdownOpen(false);
    setStreet('');
    setLandmark('');
    setHouse('');
    setType('Home');
    setCustomType('');
    setIsDefault(addresses.length === 0);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: Address) => {
    setEditingId(item.id);
    setName(item.name || item.fullName || '');
    setMobile(item.mobile || item.phone || '');
    setArea(item.area || localities[0] || '');
    setAreaSearch('');
    setDropdownOpen(false);
    setStreet(item.street || '');
    setLandmark(item.landmark || '');
    setHouse(item.house || item.houseNo || '');

    const t = (item.type || 'Home').trim();
    if (['Home', 'Work'].includes(t)) {
      setType(t as any);
      setCustomType('');
    } else {
      setType('Other');
      setCustomType(t);
    }

    setIsDefault(Boolean(item.isDefault));
    setModalVisible(true);
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanMobile = mobile.replace(/\D/g, '').trim();
    const cleanArea = area.trim();
    const cleanStreet = street.trim();
    const cleanLandmark = landmark.trim();
    const cleanHouse = house.trim();
    const cleanType = type === 'Other' ? (customType.trim() || 'Other') : type;

    if (cleanName.length < 2) {
      Alert.alert('Name Required', 'Please enter full recipient name (at least 2 letters).');
      return;
    }
    if (cleanMobile.length < 10) {
      Alert.alert('Mobile Number Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanArea) {
      Alert.alert('Village / Area Required', 'Please select or search your delivery village or area.');
      return;
    }
    if (!cleanLandmark) {
      Alert.alert('Landmark Required', 'Please enter a nearby landmark (e.g. Near Shiv Mandir, High School).');
      return;
    }

    setSaving(true);
    // Payload matching website addressPayload & backend schema
    const payload = {
      name: cleanName,
      mobile: cleanMobile,
      house: cleanHouse || '',
      street: cleanStreet || '',
      landmark: cleanLandmark,
      area: cleanArea,
      city: 'Hathua',
      type: cleanType,
      isDefault,
    };

    try {
      if (editingId) {
        await api.updateAddress(editingId, payload);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Address updated successfully!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Address updated successfully!');
        }
      } else {
        await api.addAddress(payload);
        if (Platform.OS === 'android') {
          ToastAndroid.show('New address saved to your account!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'New address saved to your account!');
        }
      }

      Keyboard.dismiss();
      setModalVisible(false);
      resetForm();
      fetchAddresses();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save delivery address.');
    } finally {
      setSaving(false);
    }
  };

  const filteredLocalities = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    if (!q) return localities;
    return localities.filter((loc) => loc.toLowerCase().includes(q));
  }, [localities, areaSearch]);

  const handleSetDefault = async (id: string) => {
    try {
      await api.setDefaultAddress(id);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Default delivery address updated', ToastAndroid.SHORT);
      }
      fetchAddresses();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update default address');
    }
  };

  const handleDelete = (id: string, addrLabel: string) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to remove "${addrLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAddress(id);
              if (Platform.OS === 'android') {
                ToastAndroid.show('Address deleted', ToastAndroid.SHORT);
              }
              fetchAddresses();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete address');
            }
          },
        },
      ]
    );
  };

  const handleAddressSelect = async (item: Address) => {
    // 1. Optimistically update UI so that selected address immediately shows active
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === item.id,
      }))
    );

    // 2. Persist selection to backend as default delivery address
    try {
      await api.setDefaultAddress(item.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`${item.type || 'Address'} selected for delivery`, ToastAndroid.SHORT);
      }
    } catch (err: any) {
      console.warn('Set default address error:', err?.message);
    }

    // 3. Handle navigation if invoked in selection mode
    if (route?.params?.onSelect) {
      route.params.onSelect(item);
      navigation.goBack();
    } else if (isSelectMode) {
      navigation.navigate('Cart', { selectedAddressId: item.id });
    }
  };

  const renderAddressItem = ({ item }: { item: Address }) => {
    const isDef = Boolean(item.isDefault);
    const itemType = (item.type || 'Home').trim();
    const typeLower = itemType.toLowerCase();
    const isWork = typeLower === 'work' || typeLower === 'office';
    const isHome = typeLower === 'home';
    const typeIcon = isWork ? 'briefcase' : isHome ? 'home' : 'map-pin';
    const typeLabel = isHome ? 'Home' : isWork ? 'Work' : (item.type || 'Other');

    const theme = isWork
      ? { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' }
      : isHome
      ? { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' }
      : { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };

    const recipientName = item.name || item.fullName || 'Customer';
    const recipientPhone = item.mobile || item.phone || '';

    // Structured address details (Street, Landmark, House)
    const primaryAddress = [
      item.house || item.houseNo,
      item.street,
      item.landmark ? `Near ${item.landmark}` : null,
    ].filter(Boolean).join(', ');

    // Locality, City, Pin details
    const localityDetails = [
      item.area,
      item.city || 'Hathua',
      item.pin || item.pincode,
    ].filter(Boolean).join(', ');

    return (
      <TouchableOpacity
        style={[styles.card, isDef && styles.cardDefault]}
        activeOpacity={0.78}
        onPress={() => handleAddressSelect(item)}
      >
        {/* Compact Header: Type Badge, Default Tag, Selection Indicator */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.typeIconBox, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Feather name={typeIcon as any} size={13} color={theme.color} />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.addressTypeTitle}>{typeLabel}</Text>
              {isDef ? (
                <View style={styles.defaultPill}>
                  <Text style={styles.defaultPillText}>DEFAULT</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Radio Selection Indicator */}
          <View style={[styles.selectRadio, isDef && styles.selectRadioActive]}>
            {isDef ? <Feather name="check" size={10} color="#FFFFFF" /> : null}
          </View>
        </View>

        {/* Compact Details Box: full-width, clean layout */}
        <View style={styles.cardDetailsBox}>
          {primaryAddress ? (
            <Text style={styles.primaryAddressText} numberOfLines={2}>
              {primaryAddress}
            </Text>
          ) : null}

          {localityDetails ? (
            <View style={styles.localityRow}>
              <Feather name="map-pin" size={10.5} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.localityRowText} numberOfLines={1}>{localityDetails}</Text>
            </View>
          ) : null}

          {/* Recipient & Phone in single clean row */}
          <View style={styles.recipientRow}>
            <Text style={styles.contactText} numberOfLines={1}>
              <Feather name="user" size={10} color="#64748B" /> {recipientName}
              {recipientPhone ? `  |  +91 ${recipientPhone}` : ''}
            </Text>
          </View>
        </View>

        {/* Compact Bottom Actions Bar */}
        <View style={styles.cardFooter}>
          {!isDef ? (
            <TouchableOpacity
              style={styles.setDefaultPillBtn}
              onPress={() => handleAddressSelect(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather name="check-circle" size={11} color="#059669" style={{ marginRight: 3 }} />
              <Text style={styles.setDefaultPillText}>Set as default</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeLocationIndicator}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLocationText}>Delivering here</Text>
            </View>
          )}

          <View style={styles.footerActionButtons}>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather name="edit-2" size={11} color="#475569" style={{ marginRight: 3 }} />
              <Text style={styles.actionPillText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, styles.deletePillBtn]}
              onPress={() => handleDelete(item.id, recipientName)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather name="trash-2" size={11} color="#DC2626" style={{ marginRight: 3 }} />
              <Text style={[styles.actionPillText, styles.deletePillText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sleek Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={26} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleCol}>
          <Text style={styles.topBarTitle}>Saved Addresses</Text>
          <Text style={styles.topBarSubtitle}>
            {addresses.length > 0
              ? `${addresses.length} ${addresses.length === 1 ? 'address' : 'addresses'} saved`
              : 'Manage your delivery locations'}
          </Text>
        </View>
      </View>

      {loading && addresses.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <AddressCardSkeleton />
          <AddressCardSkeleton />
          <AddressCardSkeleton />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Feather name="map-pin" size={42} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>No Saved Addresses</Text>
          <Text style={styles.emptySub}>
            Add your home, office or shop address for fast 15-minute grocery delivery.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={openAddModal}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>Add New Delivery Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Bottom Add Button if addresses exist */}
      {addresses.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity
            style={styles.bottomAddBtn}
            onPress={openAddModal}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.bottomAddBtnText}>Add New Delivery Address</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add / Edit Delivery Address Modal (Website Parity) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          if (!saving) {
            Keyboard.dismiss();
            setModalVisible(false);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Backdrop Touch Dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (!saving) {
                Keyboard.dismiss();
                setModalVisible(false);
              }
            }}
          />

          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                height: isKeyboardOpen ? '88%' : undefined,
                maxHeight: '92%',
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Feather name={editingId ? "edit-2" : "map-pin"} size={16} color="#059669" />
                </View>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit Address' : 'Add New Address'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                disabled={saving}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={isKeyboardOpen ? { flex: 1 } : { flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={[
                styles.modalFormContent,
                {
                  paddingBottom: isKeyboardOpen ? Math.max(keyboardHeight, 280) + 40 : 36,
                },
              ]}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={false}
            >
              {/* Recipient Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <Feather name="user" size={15} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter full name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              {/* 10-Digit Mobile Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Mobile Number <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <Feather name="phone" size={15} color="#94A3B8" style={styles.inputIcon} />
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={setMobile}
                  />
                </View>
              </View>

              {/* Village / Area Locality Dropdown (Production Grade) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Village / Locality <Text style={styles.requiredStar}>*</Text>
                </Text>

                {/* Dropdown Box Toggle */}
                <TouchableOpacity
                  style={[styles.dropdownBox, dropdownOpen && styles.dropdownBoxOpen]}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeft}>
                    <Feather name="map-pin" size={15} color={area ? "#059669" : "#94A3B8"} style={styles.inputIcon} />
                    <Text style={[styles.dropdownSelectedText, !area && styles.dropdownPlaceholder]} numberOfLines={1}>
                      {area || 'Select village / locality'}
                    </Text>
                  </View>
                  <Feather
                    name={dropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>

                {/* Dropdown Menu Container */}
                {dropdownOpen && (
                  <View style={styles.dropdownPanel}>
                    {/* Search inside Dropdown */}
                    <View style={styles.dropdownSearchRow}>
                      <Feather name="search" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.dropdownSearchInput}
                        placeholder="Search your village or area..."
                        placeholderTextColor="#94A3B8"
                        value={areaSearch}
                        onChangeText={setAreaSearch}
                        autoFocus
                      />
                      {areaSearch ? (
                        <TouchableOpacity onPress={() => setAreaSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Feather name="x" size={14} color="#64748B" />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Scrollable List */}
                    <ScrollView
                      style={styles.dropdownListScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {filteredLocalities.length > 0 ? (
                        filteredLocalities.map((loc) => {
                          const isSelected = area === loc;
                          return (
                            <TouchableOpacity
                              key={loc}
                              style={[styles.dropdownItemRow, isSelected && styles.dropdownItemRowSelected]}
                              onPress={() => {
                                setArea(loc);
                                setDropdownOpen(false);
                                setAreaSearch('');
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.dropdownItemLeft}>
                                <Feather
                                  name="map-pin"
                                  size={13}
                                  color={isSelected ? "#059669" : "#94A3B8"}
                                  style={{ marginRight: 8 }}
                                />
                                <Text style={[styles.dropdownItemLabel, isSelected && styles.dropdownItemLabelSelected]}>
                                  {loc}
                                </Text>
                              </View>
                              {isSelected && (
                                <Feather name="check" size={14} color="#059669" />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.dropdownEmptyBox}>
                          <Text style={styles.dropdownEmptyText}>No matching locality found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Nearby Landmark */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Nearby Landmark <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <Feather name="navigation" size={15} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Near Shiv Mandir, High School"
                    placeholderTextColor="#94A3B8"
                    value={landmark}
                    onChangeText={setLandmark}
                  />
                </View>
              </View>

              {/* Street / Ward / Colony details */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street / Ward Details</Text>
                <View style={styles.inputWrap}>
                  <Feather name="map" size={15} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Ward No. 3, Main Market Road"
                    placeholderTextColor="#94A3B8"
                    value={street}
                    onChangeText={setStreet}
                  />
                </View>
              </View>

              {/* House / Flat / Shop details (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>House / Flat / Shop (Optional)</Text>
                <View style={styles.inputWrap}>
                  <Feather name="home" size={15} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. House #14, Shop No. 2"
                    placeholderTextColor="#94A3B8"
                    value={house}
                    onChangeText={setHouse}
                  />
                </View>
              </View>

              {/* Save As Type (Home, Work, Other) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Save As</Text>
                <View style={styles.typeSegmentRow}>
                  {(['Home', 'Work', 'Other'] as const).map((t) => {
                    const isSel = type === t;
                    const iconName = t === 'Home' ? 'home' : t === 'Work' ? 'briefcase' : 'tag';
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeSegmentBtn, isSel && styles.typeSegmentBtnActive]}
                        onPress={() => setType(t)}
                      >
                        <Feather
                          name={iconName}
                          size={13}
                          color={isSel ? '#FFFFFF' : '#475569'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.typeSegmentText, isSel && styles.typeSegmentTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {type === 'Other' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Custom Label <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Parents, Hostel, Shop"
                      placeholderTextColor="#94A3B8"
                      value={customType}
                      onChangeText={setCustomType}
                    />
                  </View>
                </View>
              )}

              {/* Make Default Switch */}
              <TouchableOpacity
                style={styles.defaultCheckboxRow}
                activeOpacity={0.8}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View style={[styles.checkboxBox, isDefault && styles.checkboxBoxChecked]}>
                  {isDefault && <Feather name="check" size={13} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default delivery address</Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalVisible(false);
                  }}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="check" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalSaveBtnText}>
                        {editingId ? 'Update Address' : 'Save Address'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topBarTitleCol: {
    flex: 1,
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
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
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
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardDefault: {
    borderColor: '#059669',
    borderWidth: 1.5,
    backgroundColor: '#FAFCFA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressTypeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  defaultPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  selectRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectRadioActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  cardDetailsBox: {
    paddingLeft: 0,
    marginBottom: 6,
  },
  primaryAddressText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 17,
    marginBottom: 2,
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  localityRowText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    flex: 1,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  contactText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  setDefaultPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  setDefaultPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  activeLocationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  activeLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  footerActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  deletePillBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deletePillText: {
    color: '#DC2626',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyAddBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomAddBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  modalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  modalFormContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  requiredStar: {
    color: '#EF4444',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  dropdownBoxOpen: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownSelectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontWeight: '400',
    color: '#94A3B8',
  },
  dropdownPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  dropdownListScroll: {
    maxHeight: 180,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemRowSelected: {
    backgroundColor: '#ECFDF5',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  dropdownItemLabel: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
  dropdownItemLabelSelected: {
    color: '#059669',
    fontWeight: '800',
  },
  dropdownEmptyBox: {
    padding: 14,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  inputIcon: {
    marginRight: 8,
  },
  countryCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  typeSegmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 9,
    borderRadius: 8,
  },
  typeSegmentBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typeSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  typeSegmentTextActive: {
    color: '#FFFFFF',
  },
  defaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 14,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkboxLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkboxSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 9,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalSaveBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 9,
  },
  modalSaveBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
