import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  Keyboard,
  BackHandler,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { PasswordEyeButton } from '../../components/common/PasswordEyeButton';

export const CustomerSignUpScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { setAuthSession } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [initialHeight, setInitialHeight] = useState(0);
  const [stage, setStage] = useState<'FORM' | 'OTP'>('FORM');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [accountCreatedVisible, setAccountCreatedVisible] = useState(false);

  const handleStartShopping = () => {
    setAccountCreatedVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  // Handle hardware back without looping
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (stage === 'OTP') {
          setStage('FORM');
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('CustomerLogin');
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [stage, navigation])
  );

  // Resend Countdown Timer
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleRequestOtp = async () => {
    setErrorMsg('');
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, '').slice(0, 10);
    const pass = password.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg(lang === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें' : 'Please enter your full name (minimum 2 characters)');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg(lang === 'hi' ? 'कृपया एक वैध ईमेल पता दर्ज करें' : 'Please enter a valid email address');
      return;
    }
    if (cleanMobile.length !== 10) {
      setErrorMsg(lang === 'hi' ? 'कृपया 10-अंकों का मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (!pass || pass.length < 8) {
      setErrorMsg(lang === 'hi' ? 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए' : 'Password must contain at least 8 characters');
      return;
    }
    if (pass !== confirmPassword.trim()) {
      setErrorMsg(lang === 'hi' ? 'पासवर्ड मेल नहीं खा रहे हैं' : 'Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      const msg =
        lang === 'hi'
          ? 'आगे बढ़ने के लिए कृपया सेवा की शर्तों और गोपनीयता नीति को स्वीकार करें'
          : 'Please agree to the Terms of Service and Privacy Policy to continue';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      await api.requestOtp({
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        password: pass,
        mode: 'signup',
      });
      setSeconds(60);
      setStage('OTP');
      showToast(
        lang === 'hi'
          ? `ओटीपी ${cleanEmail} पर भेज दिया गया है`
          : `Verification code sent to ${cleanEmail}`,
        'success',
        'top'
      );
    } catch (err: any) {
      const isNet =
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('internet');
      if (isNet) {
        showToast(
          lang === 'hi'
            ? 'इंटरनेट कनेक्शन नहीं है। कृपया मोबाइल डेटा या वाई-फ़ाई चेक करें।'
            : 'No internet connection. Please check your mobile data or Wi-Fi.',
          'error'
        );
        setErrorMsg('');
      } else {
        setErrorMsg(err.message || 'Could not send verification OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (seconds > 0 || loading) return;
    setErrorMsg('');
    setLoading(true);
    try {
      await api.requestOtp({
        email: email.trim().toLowerCase(),
        mode: 'signup',
      });
      setSeconds(60);
      showToast(
        lang === 'hi'
          ? 'नया ओटीपी कोड आपके ईमेल पर भेज दिया गया है'
          : `New 6-digit code sent to ${email.trim().toLowerCase()}`,
        'success',
        'top'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg('');
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg(lang === 'hi' ? 'कृपया 6-अंकों का ओटीपी दर्ज करें' : 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        mode: 'signup',
      });

      if (res.data?.user) {
        setAuthSession(res.data.user, 'CUSTOMER');
      }

      // Show beautiful custom celebratory success modal instead of default OS alert
      setAccountCreatedVisible(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={e => {
        const h = e.nativeEvent.layout.height;
        if (!initialHeight && h > 0) {
          setInitialHeight(h);
        }
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled={true}
      >
        <View
          style={[
            styles.innerCenter,
            initialHeight ? { minHeight: initialHeight } : { flex: 1 },
            {
              paddingTop: Math.max(insets.top + 16, 28),
              paddingBottom: Math.max(insets.bottom + 20, 36),
            },
          ]}
        >
        {/* Top Header Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>
          {stage === 'FORM'
            ? lang === 'hi'
              ? 'खाता बनाएं'
              : 'Create Account'
            : lang === 'hi'
            ? 'ईमेल वेरिफाई करें'
            : 'Verify Email'}
        </Text>

        <Text style={styles.subtitle}>
          {stage === 'FORM'
            ? lang === 'hi'
              ? 'ताज़ा किराने का सामान ऑर्डर करने के लिए अपना विवरण भरें।'
              : 'Sign up to order fresh groceries, daily essentials & enjoy fast delivery.'
            : lang === 'hi'
            ? `${email} पर भेजा गया 6-अंकों का वेरिफिकेशन कोड दर्ज करें`
            : `Enter the 6-digit verification code sent to ${email}`}
        </Text>

        {/* Error Alert */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Form Container */}
        <View style={styles.formContainer}>
          {stage === 'FORM' ? (
            <>
              {/* Full Name */}
              <View style={styles.underlineInputRow}>
                <Feather name="user" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'पूरा नाम' : 'Full name'}
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={txt => {
                    setName(txt);
                    if (errorMsg) setErrorMsg('');
                  }}
                />
              </View>

              {/* Email */}
              <View style={styles.underlineInputRow}>
                <Feather name="mail" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'ईमेल पता' : 'Email address'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={txt => {
                    setEmail(txt);
                    if (errorMsg) setErrorMsg('');
                  }}
                />
              </View>

              {/* Mobile */}
              <View style={styles.underlineInputRow}>
                <Feather name="phone" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? '10-अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={txt => {
                    setMobile(txt.replace(/\D/g, '').slice(0, 10));
                    if (errorMsg) setErrorMsg('');
                  }}
                />
              </View>

              {/* Password */}
              <View style={styles.underlineInputRow}>
                <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'पासवर्ड (कम से कम 8 अक्षर)' : 'Password (min 8 characters)'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={txt => {
                    setPassword(txt);
                    if (errorMsg) setErrorMsg('');
                  }}
                />
                <PasswordEyeButton
                  visible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
              </View>

              {/* Confirm Password */}
              <View style={styles.underlineInputRow}>
                <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm password'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={txt => {
                    setConfirmPassword(txt);
                    if (errorMsg) setErrorMsg('');
                  }}
                />
                <PasswordEyeButton
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </View>

              {/* Terms of Service & Privacy Policy Consent Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  if (errorMsg) setErrorMsg('');
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    agreedToTerms && styles.checkboxBoxChecked,
                  ]}
                >
                  {agreedToTerms && <Feather name="check" size={13} color="#FFFFFF" />}
                </View>

                <Text style={styles.checkboxLabel}>
                  {lang === 'hi' ? 'मैं ' : 'I agree to the '}
                  <Text
                    style={styles.checkboxLink}
                    onPress={() => Linking.openURL('https://www.r2cart.in/terms').catch(() => {})}
                  >
                    {lang === 'hi' ? 'सेवा की शर्तें (Terms of Service)' : 'Terms of Service'}
                  </Text>
                  {lang === 'hi' ? ' और ' : ' and '}
                  <Text
                    style={styles.checkboxLink}
                    onPress={() => Linking.openURL('https://www.r2cart.in/privacy').catch(() => {})}
                  >
                    {lang === 'hi' ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy'}
                  </Text>
                  {lang === 'hi' ? ' से सहमत हूँ।' : '.'}
                </Text>
              </TouchableOpacity>

              {/* Pill CTA Button */}
              <TouchableOpacity
                style={[
                  styles.primaryPillBtn,
                  (!agreedToTerms || loading) && styles.btnDisabled,
                ]}
                onPress={handleRequestOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryPillBtnText}>
                    {lang === 'hi' ? 'खाता बनाएं' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* High-End OTP Sent Feedback Card */}
              <View style={styles.otpSentCard}>
                <View style={styles.otpSentIconBox}>
                  <Feather name="mail" size={20} color="#059669" />
                  <View style={styles.otpSentCheckBadge}>
                    <Feather name="check" size={9} color="#FFFFFF" />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.otpSentTitle}>
                    {lang === 'hi' ? 'वेरिफिकेशन कोड भेजा गया' : 'Verification Code Sent'}
                  </Text>
                  <Text style={styles.otpSentEmail} numberOfLines={1}>
                    {email.trim().toLowerCase()}
                  </Text>
                  <Text style={styles.otpSentHint}>
                    {lang === 'hi'
                      ? 'कृपया अपना इनबॉक्स या स्पैम फ़ोल्डर चेक करें'
                      : 'Check your inbox or spam folder for 6-digit OTP'}
                  </Text>
                </View>
              </View>

              {/* OTP Input Underlined */}
              <View style={styles.underlineInputRow}>
                <Feather name="shield" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.otpInputText]}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={txt => {
                    setOtp(txt.replace(/\D/g, '').slice(0, 6));
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoFocus
                />
              </View>

              {/* Resend & Change row */}
              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setStage('FORM');
                    setErrorMsg('');
                  }}
                >
                  <Text style={styles.subtleLink}>
                    {lang === 'hi' ? 'विवरण बदलें' : 'Change details'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={seconds > 0 || loading}
                  onPress={handleResendOtp}
                >
                  <Text style={[styles.resendLink, (seconds > 0 || loading) && styles.resendDisabled]}>
                    {seconds > 0
                      ? `Resend in ${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
                      : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.primaryPillBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryPillBtnText}>
                    {lang === 'hi' ? 'सत्यापित करें और शुरू करें' : 'Verify & Start Shopping'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Already have an account? Sign in */}
          <View style={styles.accountRow}>
            <Text style={styles.accountQuestion}>
              {lang === 'hi' ? 'पहले से खाता है? ' : 'Already have an account? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.replace('CustomerLogin');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.accountLink}>
                {lang === 'hi' ? 'साइन इन करें' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Continue as guest */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
            activeOpacity={0.7}
          >
            <Text style={styles.guestText}>
              {lang === 'hi' ? 'गेस्ट के रूप में जारी रखें' : 'Continue as guest'}
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Celebratory Account Created Success Modal */}
      <Modal
        visible={accountCreatedVisible}
        transparent
        animationType="fade"
        onRequestClose={handleStartShopping}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            {/* Celebratory Icon with Glow Ring */}
            <View style={styles.successIconRingOuter}>
              <View style={styles.successIconRingInner}>
                <Feather name="check" size={30} color="#FFFFFF" />
              </View>
            </View>

            {/* Title & Celebration */}
            <Text style={styles.successTitle}>
              {lang === 'hi' ? 'खाता सफलतापूर्वक बन गया! 🎉' : 'Account Created! 🎉'}
            </Text>
            <Text style={styles.successSub}>
              {lang === 'hi'
                ? 'R2Cart में आपका स्वागत है! अब आप ताज़ा किराना, फल और सब्ज़ियाँ मिनटों में ऑर्डर कर सकते हैं।'
                : 'Welcome to R2Cart! You are now ready to order fresh farm produce, groceries and daily essentials with ultra-fast delivery.'}
            </Text>

            {/* Welcome Perks Pill Row */}
            <View style={styles.perksContainer}>
              <View style={styles.perkItem}>
                <Feather name="zap" size={14} color="#059669" />
                <Text style={styles.perkText}>
                  {lang === 'hi' ? 'सुपरफास्ट डिलीवरी' : '15-Min Delivery'}
                </Text>
              </View>
              <View style={styles.perkItem}>
                <Feather name="shield" size={14} color="#059669" />
                <Text style={styles.perkText}>
                  {lang === 'hi' ? '100% ताज़ा गारंटी' : 'Freshness Guarantee'}
                </Text>
              </View>
            </View>

            {/* Start Shopping CTA Button */}
            <TouchableOpacity
              style={styles.startShoppingBtn}
              onPress={handleStartShopping}
              activeOpacity={0.88}
            >
              <Text style={styles.startShoppingBtnText}>
                {lang === 'hi' ? 'शॉपिंग शुरू करें 🛒' : 'Start Shopping 🛒'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  innerCenter: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 145,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: 28,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  underlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 11,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    padding: 0,
    fontWeight: '400',
  },
  otpInputText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtleLink: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 12.5,
    color: '#059669',
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#94A3B8',
  },
  primaryPillBtn: {
    backgroundColor: '#059669',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryPillBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountQuestion: {
    fontSize: 13,
    color: '#64748B',
  },
  accountLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  guestText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  checkboxLink: {
    color: '#059669',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Dedicated OTP Sent Card Styles
  otpSentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 13,
    marginBottom: 20,
    width: '100%',
  },
  otpSentIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpSentCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpSentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  otpSentEmail: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 1,
  },
  otpSentHint: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  // Celebratory Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#86EFAC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  perksContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
    justifyContent: 'center',
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  perkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  startShoppingBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  startShoppingBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  legalConsentWrap: {
    marginTop: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  legalConsentText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: '#059669',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

