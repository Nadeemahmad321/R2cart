import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
  Keyboard,
  BackHandler,
  ToastAndroid,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

export const CustomerLoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, loginCustomer, isLoading } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [initialHeight, setInitialHeight] = useState(0);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      if (user.role === 'DELIVERY_PERSON') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'DeliveryDashboard' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    }
  }, [user, isLoading, navigation]);

  // Handle hardware back on root Login screen
  const lastBackPressTime = useRef<number>(0);
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        const now = Date.now();
        if (now - lastBackPressTime.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressTime.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            lang === 'hi' ? 'बाहर निकलने के लिए फिर से बैक दबाएं' : 'Press back again to exit',
            ToastAndroid.SHORT
          );
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [lang, navigation])
  );

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    const id = identifier.trim();
    const pass = password.trim();

    if (!id) {
      const msg =
        lang === 'hi'
          ? 'कृपया अपना मोबाइल नंबर या ईमेल दर्ज करें'
          : 'Please enter your email or mobile number';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }
    if (!pass) {
      const msg =
        lang === 'hi' ? 'कृपया अपना पासवर्ड दर्ज करें' : 'Please enter your password';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      const loggedUser = await loginCustomer(id, pass);

      // Unified Login: automatically route Delivery Riders to Delivery Dashboard
      if (loggedUser?.role === 'DELIVERY_PERSON') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'DeliveryDashboard' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (err: any) {
      const rawMsg = err.message || '';
      const isNet =
        rawMsg.toLowerCase().includes('network') ||
        rawMsg.toLowerCase().includes('internet') ||
        rawMsg.toLowerCase().includes('failed to fetch');

      const friendlyMsg = isNet
        ? (lang === 'hi'
            ? 'इंटरनेट कनेक्शन नहीं है। कृपया मोबाइल डेटा या वाई-फ़ाई चेक करें।'
            : 'No internet connection. Please check your mobile data or Wi-Fi.')
        : (rawMsg || (lang === 'hi' ? 'गलत क्रेडेंशियल्स या लॉगिन विफल' : 'Invalid credentials or login failed'));

      // 1. Show clean Top Toast
      showToast(friendlyMsg, 'error');

      // 2. Remove in-box error for network issues so only clean top toast is displayed
      if (isNet) {
        setErrorMsg('');
      } else {
        setErrorMsg(friendlyMsg);
      }
    }
  };

  const handleContinueAsGuest = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
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
        {/* R2Cart Brand Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title & Subtitle for R2Cart */}
        <Text style={styles.title}>
          {lang === 'hi' ? 'साइन इन करें' : 'Sign In'}
        </Text>

        <Text style={styles.subtitle}>
          {lang === 'hi'
            ? 'ताज़ा किराने का सामान और दैनिक आवश्यक वस्तुएं ऑर्डर करने के लिए लॉगिन करें।'
            : 'Access your orders, saved addresses, and fresh daily essentials.'}
        </Text>

        {/* Error Alert if any */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Minimal Underlined Input Form (Template Style) */}
        <View style={styles.formContainer}>
          {/* Email / Mobile / Staff ID */}
          <View style={styles.underlineInputRow}>
            <Feather name="mail" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={
                lang === 'hi'
                  ? 'ईमेल या मोबाइल नंबर'
                  : 'Email or mobile number'
              }
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={identifier}
              onChangeText={txt => {
                setIdentifier(txt);
                if (errorMsg) setErrorMsg('');
              }}
            />
            {identifier.length > 0 && (
              <TouchableOpacity
                onPress={() => setIdentifier('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.underlineInputRow}>
            <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={lang === 'hi' ? 'पासवर्ड' : 'Password'}
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={txt => {
                setPassword(txt);
                if (errorMsg) setErrorMsg('');
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                size={18}
                color={showPassword ? '#059669' : '#64748B'}
              />
            </TouchableOpacity>
          </View>

          {/* Solid Pill CTA Button */}
          <TouchableOpacity
            style={[styles.primaryPillBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <Text style={styles.primaryPillBtnText}>
                {lang === 'hi' ? 'लॉगिन...' : 'Login...'}
              </Text>
            ) : (
              <Text style={styles.primaryPillBtnText}>
                {lang === 'hi' ? 'लॉगिन करें' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Need an account? Create account */}
          <View style={styles.accountRow}>
            <Text style={styles.accountQuestion}>
              {lang === 'hi' ? 'नया खाता बनाना है? ' : 'Need an account? '}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerSignUp')}
              activeOpacity={0.7}
            >
              <Text style={styles.accountLink}>
                {lang === 'hi' ? 'खाता बनाएं' : 'Create an account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>
              {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>

          {/* Continue as Guest */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={handleContinueAsGuest}
            activeOpacity={0.7}
          >
            <Text style={styles.guestText}>
              {lang === 'hi' ? 'गेस्ट के रूप में जारी रखें' : 'Continue as guest'}
            </Text>
          </TouchableOpacity>

          {/* Legal Consent for Google Play compliance */}
          <View style={styles.legalConsentWrap}>
            <Text style={styles.legalConsentText}>
              {lang === 'hi' ? 'लॉग इन करके, आप हमारी ' : 'By continuing, you agree to R2Cart\'s '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL('https://www.r2cart.in/terms').catch(() => {})}
              >
                {lang === 'hi' ? 'सेवा की शर्तें' : 'Terms of Service'}
              </Text>
              {lang === 'hi' ? ' और ' : ' & '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL('https://www.r2cart.in/privacy').catch(() => {})}
              >
                {lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
              </Text>
              {lang === 'hi' ? ' से सहमत होते हैं।' : '.'}
            </Text>
          </View>
        </View>
        </View>
      </ScrollView>
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
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 52,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: 36,
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
    marginBottom: 18,
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
    paddingVertical: 12,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
    fontWeight: '400',
  },
  primaryPillBtn: {
    backgroundColor: '#059669', // R2Cart Primary Brand Green
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 22,
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
  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
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
  legalConsentWrap: {
    marginTop: 22,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  legalConsentText: {
    fontSize: 11.5,
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



