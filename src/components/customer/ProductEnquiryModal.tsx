import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductEnquiryModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
}

export const ProductEnquiryModal: React.FC<ProductEnquiryModalProps> = ({
  visible,
  product,
  onClose,
}) => {
  const { user } = useAuth();
  const { lang, t, tProd } = useLanguage();
  const { notify } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState('');

  useEffect(() => {
    if (visible && user) {
      if (user.name) setName(user.name);
      if (user.mobile) setPhone(user.mobile);
      if (user.email) setEmail(user.email);
    }
    if (visible) {
      setSuccess(false);
    }
  }, [visible, user]);

  if (!visible || !product) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      notify(lang === 'hi' ? 'कृपया अपना नाम दर्ज करें' : 'Please enter your name', 'error');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      notify(
        lang === 'hi'
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें'
          : 'Please enter a valid 10-digit mobile number',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.submitProductEnquiry(product.id, {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        message: message.trim() || undefined,
      });
      setSubmittedPhone(cleanPhone);
      setSuccess(true);
      notify(
        lang === 'hi'
          ? 'पूछताछ स्टोर एडमिन को भेज दी गई! एडमिन जल्द संपर्क करेगा।'
          : 'Enquiry sent to store admin! Our team will contact you shortly.',
        'success'
      );
    } catch (err: any) {
      notify(err.message || 'Failed to submit enquiry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setMessage('');
    onClose();
  };

  const imgUri = product.imageUrl || product.image || (product.images && product.images[0]);
  const price = Number(product.price || (product.variants && product.variants[0]?.price) || 0);
  const unit = product.unit || (product.variants && product.variants[0]?.unit) || '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centerContainer}
        >
          <View style={styles.dialogCard}>
            {success ? (
              /* --- MEANINGFUL CENTERED SUCCESS CONFIRMATION --- */
              <View style={styles.successWrapper}>
                <View style={styles.successIconOuterRing}>
                  <View style={styles.successIconCircle}>
                    <Feather name="check" size={32} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.successHeading}>
                  {lang === 'hi' ? 'पूछताछ स्टोर एडमिन को भेज दी गई!' : 'Enquiry Sent to Store Admin!'}
                </Text>

                <View style={styles.adminContactBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.adminContactBadgeText}>
                    {lang === 'hi' ? 'एडमिन जल्द संपर्क करेगा' : 'Store Admin will contact you'}
                  </Text>
                </View>

                <Text style={styles.successDescription}>
                  {lang === 'hi'
                    ? `धन्यवाद ${name ? `${name} जी` : ''}! आपका अनुरोध सीधे हमारे स्टोर एडमिन और कारीगर तक पहुँच गया है।\n\nहमारे स्टोर मैनेजर जल्द ही आपके मोबाइल नंबर (${submittedPhone || phone}) पर कॉल या WhatsApp करके आपके ऑर्डर की चर्चा करेंगे।`
                    : `Thank you ${name || ''}! Your custom request has been delivered directly to our store admin.\n\nOur store manager will review your request and call or WhatsApp you shortly at ${submittedPhone || phone} to assist you.`}
                </Text>

                {/* Mini Product Snapshot */}
                <View style={styles.successProdCard}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.successProdThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.successProdThumb, styles.placeholderThumb]}>
                      <Feather name="package" size={20} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.successProdName} numberOfLines={1}>
                      {tProd(product)}
                    </Text>
                    <Text style={styles.successProdMeta}>
                      ₹{price} {unit ? `• ${unit}` : ''}
                    </Text>
                  </View>
                  <View style={styles.enquiryTagPill}>
                    <Text style={styles.enquiryTagPillText}>
                      {lang === 'hi' ? 'सफलतापूर्वक भेजा' : 'Delivered'}
                    </Text>
                  </View>
                </View>

                {/* Confirmation Button */}
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={handleClose}
                  activeOpacity={0.88}
                >
                  <Feather name="check-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.doneBtnText}>
                    {lang === 'hi' ? 'ठीक है, समझ गया' : 'Got It, Thanks!'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* --- CENTERED ENQUIRY FORM DIALOG --- */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formScroll}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={styles.headerTitleRow}>
                      <View style={styles.phoneIconWrap}>
                        <Feather name="phone-call" size={15} color="#059669" />
                      </View>
                      <Text style={styles.title}>
                        {lang === 'hi' ? 'कस्टम कोट और पूछताछ' : 'Request Custom Quote'}
                      </Text>
                    </View>
                    <Text style={styles.subtitle}>
                      {lang === 'hi'
                        ? 'स्टोर एडमिन और कारीगर से सीधा संपर्क'
                        : 'Direct inquiry to artisan & store admin'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Product Summary Mini Card */}
                <View style={styles.prodSummaryCard}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.prodThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.prodThumb, styles.placeholderThumb]}>
                      <Feather name="package" size={20} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.prodSummaryMeta}>
                    <Text style={styles.prodSummaryName} numberOfLines={1}>
                      {tProd(product)}
                    </Text>
                    <View style={styles.prodSummaryPriceRow}>
                      <Text style={styles.prodSummaryPrice}>₹{price}</Text>
                      {unit ? <Text style={styles.prodSummaryUnit}> • {unit}</Text> : null}
                    </View>
                  </View>
                </View>

                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'आपका नाम' : 'Your Name'} <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={styles.inputBox}>
                    <Feather name="user" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={lang === 'hi' ? 'उदा. राहुल कुमार' : 'e.g. Rahul Kumar'}
                      placeholderTextColor="#94A3B8"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                {/* Phone Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'मोबाइल नंबर (कॉल / WhatsApp)' : 'Mobile Number (Call / WhatsApp)'}{' '}
                    <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={styles.inputBox}>
                    <Feather name="phone" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={lang === 'hi' ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                {/* Email (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'ईमेल (वैकल्पिक)' : 'Email (Optional)'}
                  </Text>
                  <View style={styles.inputBox}>
                    <Feather name="mail" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="email@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                {/* Message / Customization Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'कस्टमाइज़ेशन विवरण / आवश्यकता' : 'Customization Details & Notes'}
                  </Text>
                  <View style={[styles.inputBox, styles.textAreaBox]}>
                    <TextInput
                      style={[styles.textInput, styles.textAreaInput]}
                      placeholder={
                        lang === 'hi'
                          ? 'उदा. विशेष रंग, साइज़ या डिज़ाइन की आवश्यकता लिखें...'
                          : 'e.g. Color, size, wedding date, or custom design requirements...'
                      }
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      value={message}
                      onChangeText={setMessage}
                    />
                  </View>
                </View>

                {/* Admin Contact Reassurance */}
                <View style={styles.reassuranceRow}>
                  <Feather name="shield" size={12} color="#059669" style={{ marginRight: 5 }} />
                  <Text style={styles.reassuranceText}>
                    {lang === 'hi'
                      ? 'अनुरोध भेजने के बाद एडमिन सीधे आपसे संपर्क करेगा'
                      : 'Store admin will call you to confirm your custom order'}
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="send" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>
                        {lang === 'hi' ? 'अनुरोध भेजें' : 'Send Custom Enquiry'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formScroll: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 36,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  prodThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodSummaryMeta: {
    flex: 1,
    marginLeft: 10,
  },
  prodSummaryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  prodSummaryPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  prodSummaryPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  prodSummaryUnit: {
    fontSize: 11,
    color: '#64748B',
  },
  inputGroup: {
    marginBottom: 11,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  reqStar: {
    color: '#EF4444',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 11,
    minHeight: 40,
  },
  textAreaBox: {
    minHeight: 68,
    alignItems: 'flex-start',
    paddingVertical: 7,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  textAreaInput: {
    minHeight: 54,
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  reassuranceText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* SUCCESS VIEW STYLES */
  successWrapper: {
    padding: 24,
    alignItems: 'center',
  },
  successIconOuterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  successHeading: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  adminContactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  adminContactBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
  },
  successDescription: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18.5,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  successProdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginBottom: 18,
  },
  successProdThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  successProdName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  successProdMeta: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  enquiryTagPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  enquiryTagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
