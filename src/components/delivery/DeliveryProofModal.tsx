import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';

interface DeliveryProofModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeliveryProofModal: React.FC<DeliveryProofModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [customerOtp, setCustomerOtp] = useState<string>('');
  const [collectedAmount, setCollectedAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<string>('');

  useEffect(() => {
    if (order) {
      setRecipientName(order.customerName || '');
      setRecipientPhone(order.customerPhone || '');
      setCustomerOtp('');
      setNotes('');
      setPhoto(null);
      const isCod = order.paymentMethod === 'COD';
      const expectedAmount = String(order.codAmountToCollect || order.grandTotal || 0);
      setCollectedAmount(isCod ? expectedAmount : '0');
    }
  }, [order]);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const isAlreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (isAlreadyGranted) return true;

        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Camera Access Blocked',
            'Camera permission is permanently disabled for R2Cart. Please enable Camera in App Settings to click proof photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }

        Alert.alert(
          'Permission Required',
          'Please allow Camera access to click doorstep delivery photos for customer verification.'
        );
        return false;
      } catch (err) {
        console.warn('Camera permission check error:', err);
        return false;
      }
    }
    return true;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const perm =
          Platform.Version >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const isAlreadyGranted = await PermissionsAndroid.check(perm);
        if (isAlreadyGranted) return true;

        const result = await PermissionsAndroid.request(perm);
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Storage/Photos Access Blocked',
            'Photos access is permanently disabled for R2Cart. Please enable Photos access in App Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }

        return false;
      } catch (err) {
        console.warn('Gallery permission check error:', err);
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'back',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        includeBase64: false,
        saveToPhotos: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          if (response.errorCode === 'permission') {
            Alert.alert(
              'Permission Required',
              'Camera permission was not granted. Please allow camera in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          } else {
            Alert.alert('Camera Error', response.errorMessage || 'Could not open device camera');
          }
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setPhoto(response.assets[0]);
        }
      }
    );
  };

  const handleChooseGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        selectionLimit: 1,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          if (response.errorCode === 'permission') {
            Alert.alert(
              'Permission Required',
              'Photos permission was not granted. Please allow access in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          } else {
            Alert.alert('Gallery Error', response.errorMessage || 'Could not open photo library');
          }
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setPhoto(response.assets[0]);
        }
      }
    );
  };

  const handleSubmit = async () => {
    if (!photo || !photo.uri) {
      Alert.alert(
        'Photo Proof Mandatory',
        'Backend requires a photo of the delivered package at the customer doorstep before completing this delivery.'
      );
      return;
    }

    const assignmentId = order.assignmentId || order.id || order.orderId;
    setUploading(true);
    setUploadStep('Uploading delivery proof photo to cloud...');

    try {
      // 1. Prepare Multipart FormData for Proof Upload
      const formData = new FormData();
      formData.append('proofImage', {
        uri: photo.uri,
        name: photo.fileName || `delivery_proof_${Date.now()}.jpg`,
        type: photo.type || 'image/jpeg',
      } as any);

      if (recipientName.trim()) {
        formData.append('recipientName', recipientName.trim());
      }
      if (recipientPhone.trim()) {
        formData.append('recipientPhone', recipientPhone.trim());
      }
      if (customerOtp.trim()) {
        formData.append('customerOtp', customerOtp.trim());
      }
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      await api.uploadDeliveryProof(assignmentId, formData);

      // 2. Complete delivery & record settlement
      setUploadStep('Finalizing order delivery with dispatch...');
      const isCod = order.paymentMethod === 'COD';
      const actualCollected = isCod ? Number(collectedAmount) : 0;

      await api.completeDelivery(assignmentId, {
        collectedAmount: actualCollected,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        customerOtp: customerOtp.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Delivery Completion Failed',
        err.message || 'Could not upload proof or complete delivery. Please check network and try again.'
      );
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  const isCod = order?.paymentMethod === 'COD';
  const targetOrderId = order?.orderId || order?.id || order?.assignmentId;
  const orderNum = order?.orderNumber || (targetOrderId ? String(targetOrderId).slice(-6).toUpperCase() : '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!uploading) onClose();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Feather name="shield" size={18} color="#059669" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Proof of Delivery (POD)</Text>
                <Text style={styles.modalSub}>Order #{orderNum}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              disabled={uploading}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* COD Cash Collection Strip */}
            {isCod ? (
              <View style={styles.codCard}>
                <View style={styles.codHeader}>
                  <Feather name="dollar-sign" size={16} color="#B45309" style={{ marginRight: 6 }} />
                  <Text style={styles.codTitle}>Collect Cash on Delivery</Text>
                </View>
                <Text style={styles.codSub}>
                  Collect ₹{order.codAmountToCollect || order.grandTotal || 0} from customer
                </Text>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    value={collectedAmount}
                    onChangeText={setCollectedAmount}
                    placeholder="Enter collected amount"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.prepaidCard}>
                <Feather name="check-circle" size={16} color="#059669" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.prepaidTitle}>Prepaid Order (No Cash to Collect)</Text>
                  <Text style={styles.prepaidSub}>Payment already completed online by customer.</Text>
                </View>
              </View>
            )}

            {/* Mandatory Doorstep Photo Section */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Doorstep Photo Proof</Text>
                <View style={styles.mandatoryBadge}>
                  <Text style={styles.mandatoryText}>MANDATORY</Text>
                </View>
              </View>

              {photo && photo.uri ? (
                <View style={styles.photoPreviewCard}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      disabled={uploading}
                      onPress={handleTakePhoto}
                    >
                      <Feather name="camera" size={13} color="#2563EB" style={{ marginRight: 5 }} />
                      <Text style={styles.retakeText}>Retake Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      disabled={uploading}
                      onPress={() => setPhoto(null)}
                    >
                      <Feather name="trash-2" size={13} color="#DC2626" style={{ marginRight: 5 }} />
                      <Text style={styles.deletePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadDashedBox}>
                  <View style={styles.uploadIconCircle}>
                    <Feather name="camera" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.uploadPromptTitle}>Capture Package at Doorstep</Text>
                  <Text style={styles.uploadPromptSub}>
                    Take a clear photo showing the delivered parcel at customer premises.
                  </Text>

                  <View style={styles.uploadButtonsRow}>
                    <TouchableOpacity
                      style={styles.capturePrimaryBtn}
                      onPress={handleTakePhoto}
                      activeOpacity={0.85}
                    >
                      <Feather name="camera" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.capturePrimaryText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.gallerySecondaryBtn}
                      onPress={handleChooseGallery}
                      activeOpacity={0.8}
                    >
                      <Feather name="image" size={15} color="#334155" style={{ marginRight: 6 }} />
                      <Text style={styles.gallerySecondaryText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Recipient Verification */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>Handover & Verification Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Person who received parcel"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Mobile Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                  placeholder="Mobile number"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Verification OTP (If generated)</Text>
                <TextInput
                  style={styles.otpInput}
                  value={customerOtp}
                  onChangeText={setCustomerOtp}
                  keyboardType="numeric"
                  maxLength={6}
                  placeholder="Enter 4 or 6 digit OTP"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="e.g. Handed to security / Left at front gate"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.modalFooter}>
            {uploading ? (
              <View style={styles.uploadingStateWrap}>
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.uploadingText}>{uploadStep}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!photo || uploading) && styles.submitBtnDisabled,
              ]}
              disabled={!photo || uploading}
              onPress={handleSubmit}
              activeOpacity={0.88}
            >
              <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Proof & Complete Delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              disabled={uploading}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  codCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 16,
  },
  codHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  codSub: {
    fontSize: 11.5,
    color: '#92400E',
    marginTop: 2,
    marginBottom: 8,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  prepaidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    marginBottom: 16,
  },
  prepaidTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  prepaidSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  sectionWrap: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  mandatoryBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  uploadDashedBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    padding: 18,
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadPromptTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadPromptSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 14,
    lineHeight: 15,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  capturePrimaryBtn: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturePrimaryText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  gallerySecondaryBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallerySecondaryText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '600',
  },
  photoPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  photoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  deletePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  deletePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  otpInput: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 3,
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  uploadingStateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  uploadingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primary,
  },
  submitBtn: {
    backgroundColor: '#059669',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});

