import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const DeliveryLoginScreen = ({ navigation }: any) => {
  const { user, loginDelivery, isLoading } = useAuth();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (user && !isLoading && user.role === 'DELIVERY_PERSON') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'DeliveryDashboard' }],
      });
    }
  }, [user, isLoading, navigation]);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showToast('Please enter your Delivery Staff ID / Phone and password', 'error');
      return;
    }

    try {
      await loginDelivery(identifier.trim(), password.trim());
      navigation.reset({
        index: 0,
        routes: [{ name: 'DeliveryDashboard' }],
      });
    } catch (err: any) {
      const rawMsg = err.message || '';
      const isNet =
        rawMsg.toLowerCase().includes('network') ||
        rawMsg.toLowerCase().includes('internet') ||
        rawMsg.toLowerCase().includes('failed to fetch');

      const msg = isNet
        ? 'No internet connection. Please check your mobile data or Wi-Fi.'
        : (rawMsg || 'Invalid delivery credentials');
      showToast(msg, 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.brandBox}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.badgeWrap}>
            <Text style={styles.partnerBadge}>🚴 DELIVERY PARTNER PORTAL</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Rider Sign In</Text>
          <Text style={styles.subtitle}>Enter your staff ID or registered mobile</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Staff ID / Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DEL001 or 9876543210"
              placeholderTextColor={Colors.muted}
              autoCapitalize="characters"
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>Go On-Duty & Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back to Customer App */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backLinkText}>⬅ Back to Customer Store</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 140,
    height: 44,
  },
  badgeWrap: {
    marginTop: 10,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  partnerBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkSub,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.dark,
    backgroundColor: '#FAFAFC',
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backLink: {
    marginTop: 24,
    alignItems: 'center',
    padding: 10,
  },
  backLinkText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
