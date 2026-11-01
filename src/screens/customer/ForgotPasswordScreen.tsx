import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Keyboard,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { PasswordEyeButton } from '../../components/common/PasswordEyeButton';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();

  const [initialHeight, setInitialHeight] = useState(0);
  const [stage, setStage] = useState<'EMAIL' | 'RESET' | 'DONE'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle hardware back without looping
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (stage === 'RESET') {
          setStage('EMAIL');
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

  // Countdown timer for resend
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleSendResetCode = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg(lang === 'hi' ? 'कृपया एक वैध रजिस्टर्ड ईमेल दर्ज करें' : 'Please enter a valid registered email');
      return;
    }

    setLoading(true);
    try {
      await api.forgotPassword(cleanEmail);
      setSeconds(60);
      setStage('RESET');
      Alert.alert(
        lang === 'hi' ? 'कोड भेजा गया' : 'Reset Code Sent',
        lang === 'hi'
          ? `आपके ईमेल ${cleanEmail} पर 6-अंकों का रीसेट कोड भेज दिया गया है।`
          : `A 6-digit reset code has been sent to ${cleanEmail}`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send reset code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg('');
    const cleanOtp = otp.trim().replace(/\D/g, '');
    const pass = password.trim();

    if (cleanOtp.length !== 6) {
      setErrorMsg(lang === 'hi' ? 'कृपया 6-अंकों का रीसेट कोड दर्ज करें' : 'Please enter the complete 6-digit reset code');
      return;
    }
    if (!pass || pass.length < 8) {
      setErrorMsg(lang === 'hi' ? 'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए' : 'New password must contain at least 8 characters');
      return;
    }
    if (pass !== confirmPassword.trim()) {
      setErrorMsg(lang === 'hi' ? 'पासवर्ड मेल नहीं खा रहे हैं' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        password: pass,
      });
      setStage('DONE');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired reset code');
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
          {stage === 'EMAIL'
            ? lang === 'hi'
              ? 'पासवर्ड भूल गए?'
              : 'Forgot Password'
            : stage === 'RESET'
            ? lang === 'hi'
              ? 'पासवर्ड रीसेट करें'
              : 'Reset Password'
            : lang === 'hi'
            ? 'पासवर्ड अपडेट हो गया!'
            : 'Password Updated!'}
        </Text>

        <Text style={styles.subtitle}>
          {stage === 'EMAIL'
            ? lang === 'hi'
              ? 'अपना पंजीकृत ईमेल दर्ज करें और हम एक सुरक्षित रीसेट कोड भेजेंगे।'
              : "Enter your registered email and we'll send a secure 6-digit reset code."
            : stage === 'RESET'
            ? lang === 'hi'
              ? `${email} पर भेजा गया कोड दर्ज करें और नया पासवर्ड सेट करें`
              : `Enter the 6-digit code sent to ${email} and choose a new password.`
            : lang === 'hi'
            ? 'आपका पासवर्ड सफलतापूर्वक अपडेट हो गया है। आप अब साइन इन कर सकते हैं।'
            : 'Your password has been reset successfully. You can now sign in.'}
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
          {stage === 'EMAIL' ? (
            <>
              {/* Registered Email */}
              <View style={styles.underlineInputRow}>
                <Feather name="mail" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'रजिस्टर्ड ईमेल पता' : 'Registered email address'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={txt => {
                    setEmail(txt);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoFocus
                />
              </View>

              {/* Send Reset Code Button */}
              <TouchableOpacity
                style={[styles.primaryPillBtn, loading && styles.btnDisabled]}
                onPress={handleSendResetCode}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryPillBtnText}>
                    {lang === 'hi' ? 'रीसेट कोड भेजें' : 'Send Reset Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : stage === 'RESET' ? (
            <>
              {/* 6-Digit Reset Code Underlined */}
              <View style={styles.underlineInputRow}>
                <Feather name="shield" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.otpInputText]}
                  placeholder="Enter 6-digit code"
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

              {/* New Password */}
              <View style={styles.underlineInputRow}>
                <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'नया पासवर्ड (न्यूनतम 8 अक्षर)' : 'New password (min 8 chars)'}
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

              {/* Confirm New Password */}
              <View style={styles.underlineInputRow}>
                <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={lang === 'hi' ? 'नए पासवर्ड की पुष्टि करें' : 'Confirm new password'}
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

              {/* Resend & Change Row */}
              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setStage('EMAIL');
                    setErrorMsg('');
                  }}
                >
                  <Text style={styles.subtleLink}>
                    {lang === 'hi' ? 'ईमेल बदलें' : 'Change email'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={seconds > 0 || loading}
                  onPress={handleSendResetCode}
                >
                  <Text style={[styles.resendLink, (seconds > 0 || loading) && styles.resendDisabled]}>
                    {seconds > 0
                      ? `Resend in ${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
                      : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Reset Password */}
              <TouchableOpacity
                style={[styles.primaryPillBtn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryPillBtnText}>
                    {lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* DONE STAGE */
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Feather name="check" size={32} color="#059669" />
              </View>
              <Text style={styles.successTitle}>
                {lang === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल गया!' : 'Password Reset Successfully!'}
              </Text>
              <Text style={styles.successSub}>
                {lang === 'hi'
                  ? 'अब आप अपने नए पासवर्ड से साइन इन कर सकते हैं।'
                  : 'You can now sign in with your new password to order groceries.'}
              </Text>

              <TouchableOpacity
                style={styles.primaryPillBtn}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.replace('CustomerLogin');
                  }
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryPillBtnText}>
                  {lang === 'hi' ? 'साइन इन करें' : 'Return to Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Switch back to Login */}
          {stage !== 'DONE' && (
            <View style={styles.accountRow}>
              <Text style={styles.accountQuestion}>
                {lang === 'hi' ? 'पासवर्ड याद आ गया? ' : 'Remember your password? '}
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
          )}
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
    marginBottom: 32,
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
    paddingVertical: 12,
    marginBottom: 22,
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
    marginTop: 12,
    marginBottom: 20,
    width: '100%',
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
  successBox: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
});

