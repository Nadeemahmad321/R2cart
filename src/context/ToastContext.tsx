import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  AppState,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { networkStatus } from '../services/api';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  type?: 'customer' | 'rider' | 'order' | 'delivery' | 'chat';
  onPress?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, position?: 'top' | 'bottom') => void;
  notify: (message: string, type?: ToastType) => void;
  showNotification: (notification: NotificationPayload) => void;
  isOnline: boolean;
  checkNetwork: () => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  notify: () => {},
  showNotification: () => {},
  isOnline: true,
  checkNetwork: async () => true,
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();

  // --- Dynamic Toast State ---
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [position, setPosition] = useState<'top' | 'bottom'>('top');

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-60)).current;
  const toastTimerRef = useRef<any>(null);

  // --- Network Offline Status State ---
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [retryingNetwork, setRetryingNetwork] = useState(false);

  const offlineOpacity = useRef(new Animated.Value(0)).current;
  const offlineTranslateY = useRef(new Animated.Value(-50)).current;
  const reconnectedTimerRef = useRef<any>(null);

  // Show Toast from Top (default) or Bottom
  const showToast = useCallback(
    (msg: string, toastType: ToastType = 'success', toastPosition: 'top' | 'bottom' = 'top') => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

      try {
        Vibration.vibrate(35);
      } catch {}

      setMessage(msg);
      setType(toastType);
      setPosition(toastPosition);
      setVisible(true);

      const startY = toastPosition === 'top' ? -60 : 30;
      toastTranslateY.setValue(startY);
      toastOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(toastTranslateY, {
          toValue: 0,
          tension: 90,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();

      toastTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: toastPosition === 'top' ? -60 : 30,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
        });
      }, 3200);
    },
    [toastOpacity, toastTranslateY]
  );

  // --- Production In-App Notification Banner State ---
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifData, setNotifData] = useState<NotificationPayload | null>(null);
  const notifOpacity = useRef(new Animated.Value(0)).current;
  const notifTranslateY = useRef(new Animated.Value(-120)).current;
  const notifTimerRef = useRef<any>(null);

  const dismissNotification = useCallback(() => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    Animated.parallel([
      Animated.timing(notifOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(notifTranslateY, { toValue: -120, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setNotifVisible(false);
      setNotifData(null);
    });
  }, [notifOpacity, notifTranslateY]);

  const showNotification = useCallback(
    ({ title, body, data, type: notifType, onPress }: NotificationPayload) => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);

      const isRider =
        notifType === 'rider' ||
        data?.role === 'DELIVERY' ||
        data?.targetRole === 'DELIVERY' ||
        data?.screen === 'DeliveryOrderDetail' ||
        (title && (
          title.toLowerCase().includes('assign') ||
          title.toLowerCase().includes('rider') ||
          title.toLowerCase().includes('naya order') ||
          title.toLowerCase().includes('new order')
        ));

      try {
        if (isRider) {
          Vibration.vibrate([0, 300, 150, 300]);
        } else {
          Vibration.vibrate(60);
        }
      } catch {}

      setNotifData({
        title,
        body,
        data,
        type: isRider ? 'rider' : notifType || 'customer',
        onPress,
      });
      setNotifVisible(true);

      notifTranslateY.setValue(-120);
      notifOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(notifOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(notifTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();

      notifTimerRef.current = setTimeout(() => {
        dismissNotification();
      }, isRider ? 7500 : 5500);
    },
    [notifOpacity, notifTranslateY, dismissNotification]
  );

  // Manual Network Retry
  const checkNetwork = useCallback(async () => {
    setRetryingNetwork(true);
    const online = await networkStatus.checkConnectivity();
    setRetryingNetwork(false);
    return online;
  }, []);

  // Monitor Network Connectivity in real-time
  useEffect(() => {
    // Initial connectivity probe on app load
    networkStatus.checkConnectivity();

    // Subscribe to network updates
    const unsubscribe = networkStatus.subscribe((online) => {
      setIsOnline(online);

      if (!online) {
        setWasOffline(true);
        setShowReconnected(false);
        Animated.parallel([
          Animated.timing(offlineOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(offlineTranslateY, { toValue: 0, tension: 85, friction: 8, useNativeDriver: true }),
        ]).start();
      } else if (wasOffline) {
        // Transition to "Back Online" green banner
        setShowReconnected(true);
        if (reconnectedTimerRef.current) clearTimeout(reconnectedTimerRef.current);
        reconnectedTimerRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(offlineOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(offlineTranslateY, { toValue: -50, duration: 250, useNativeDriver: true }),
          ]).start(() => {
            setWasOffline(false);
            setShowReconnected(false);
          });
        }, 2200);
      }
    });

    // Handle AppState changes (e.g. user toggles Wi-Fi/data in system settings and returns)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        networkStatus.checkConnectivity();
      }
    });

    // Periodic heartbeat check: every 6s when offline, every 25s when online
    const interval = setInterval(() => {
      networkStatus.checkConnectivity();
    }, isOnline ? 25000 : 6000);

    return () => {
      unsubscribe();
      appStateSub.remove();
      clearInterval(interval);
      if (reconnectedTimerRef.current) clearTimeout(reconnectedTimerRef.current);
    };
  }, [isOnline, wasOffline, offlineOpacity, offlineTranslateY]);

  const isNetMsg =
    message.toLowerCase().includes('internet') ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('connection');

  return (
    <ToastContext.Provider
      value={{
        showToast,
        notify: showToast,
        showNotification,
        isOnline,
        checkNetwork,
      }}
    >
      {children}

      {/* Production-Grade In-App Push Notification Banner */}
      {notifVisible && notifData && (
        <Animated.View
          style={[
            styles.notifBannerCard,
            notifData.type === 'rider' && styles.notifBannerCardRider,
            {
              top: Math.max(insets.top, 12) + 6,
              opacity: notifOpacity,
              transform: [{ translateY: notifTranslateY }],
            },
          ]}
        >
          {notifData.type === 'rider' ? (
            /* --- RIDER HIGH-IMPACT DISPATCH ALERT CARD --- */
            <TouchableOpacity
              style={styles.riderBannerInner}
              activeOpacity={0.94}
              onPress={() => {
                const handler = notifData.onPress;
                dismissNotification();
                if (handler) handler();
              }}
            >
              <View style={styles.riderTopRow}>
                <View style={styles.riderBeaconWrap}>
                  <View style={styles.riderPulseDot} />
                  <Feather name="zap" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.riderBeaconText}>RIDER ORDER ALERT</Text>
                </View>
                <TouchableOpacity
                  onPress={dismissNotification}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.notifCloseBtn}
                >
                  <Feather name="x" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.riderContentRow}>
                <View style={styles.riderIconBadge}>
                  <Feather name="navigation" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.riderNotifTitle} numberOfLines={1}>
                    {notifData.title}
                  </Text>
                  {notifData.body ? (
                    <Text style={styles.riderNotifBody} numberOfLines={2}>
                      {notifData.body}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.riderCtaBtn}>
                <Text style={styles.riderCtaText}>View & Deliver Order</Text>
                <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          ) : (
            /* --- USER / CUSTOMER ENHANCED IN-APP NOTIFICATION CARD --- */
            <TouchableOpacity
              style={styles.userBannerInner}
              activeOpacity={0.92}
              onPress={() => {
                const handler = notifData.onPress;
                dismissNotification();
                if (handler) handler();
              }}
            >
              <View style={styles.userNotifTopRow}>
                <View style={styles.userBrandPill}>
                  <View style={styles.userBrandDot} />
                  <Text style={styles.userBrandName}>R2Cart</Text>
                  <Text style={styles.userLiveTag}>• Just now</Text>
                </View>
                <TouchableOpacity
                  onPress={dismissNotification}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.notifCloseBtn}
                >
                  <Feather name="x" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.userNotifContentRow}>
                <View style={styles.userIconCircle}>
                  <Feather
                    name={
                      (notifData.title + ' ' + (notifData.body || '')).toLowerCase().includes('deliver')
                        ? 'truck'
                        : (notifData.title + ' ' + (notifData.body || '')).toLowerCase().includes('confirm') ||
                          (notifData.title + ' ' + (notifData.body || '')).toLowerCase().includes('placed')
                        ? 'check-circle'
                        : (notifData.title + ' ' + (notifData.body || '')).toLowerCase().includes('chat')
                        ? 'message-circle'
                        : 'bell'
                    }
                    size={18}
                    color="#059669"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.userNotifTitle} numberOfLines={1}>
                    {notifData.title}
                  </Text>
                  {notifData.body ? (
                    <Text style={styles.userNotifBody} numberOfLines={2}>
                      {notifData.body}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.userActionRow}>
                <Text style={styles.userActionLink}>Tap to view details</Text>
                <Feather name="chevron-right" size={13} color="#059669" />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Production-Level Persistent Offline / Back Online Banner */}
      {(!isOnline || showReconnected) && (
        <Animated.View
          style={[
            styles.offlineBanner,
            {
              top: insets.top,
              opacity: offlineOpacity,
              transform: [{ translateY: offlineTranslateY }],
            },
            showReconnected ? styles.offlineBannerOnline : styles.offlineBannerOffline,
          ]}
        >
          <View style={styles.offlineInner}>
            <Feather
              name={showReconnected ? 'wifi' : 'wifi-off'}
              size={14}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.offlineText} numberOfLines={1}>
              {showReconnected
                ? 'Back online! Connected to internet.'
                : 'No internet connection. Please check your network.'}
            </Text>
            {!showReconnected && (
              <TouchableOpacity
                onPress={checkNetwork}
                style={styles.retryChip}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={retryingNetwork}
                activeOpacity={0.7}
              >
                <Feather
                  name="rotate-cw"
                  size={11}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.retryChipText}>
                  {retryingNetwork ? 'Checking...' : 'Retry'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* Top / Bottom Notification Toast */}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            position === 'top'
              ? {
                  top: Math.max(insets.top, 12) + (!isOnline ? 42 : 8),
                  transform: [{ translateY: toastTranslateY }],
                }
              : {
                  bottom: Math.max(insets.bottom + 52, 60),
                  transform: [{ translateY: toastTranslateY }],
                },
            { opacity: toastOpacity },
            type === 'error'
              ? styles.toastError
              : type === 'info'
              ? styles.toastInfo
              : styles.toastSuccess,
          ]}
        >
          <View
            style={
              type === 'error'
                ? styles.iconCircleError
                : type === 'info'
                ? styles.iconCircleInfo
                : styles.iconCircleSuccess
            }
          >
            <Feather
              name={
                isNetMsg && type === 'error'
                  ? 'wifi-off'
                  : type === 'error'
                  ? 'alert-circle'
                  : type === 'info'
                  ? 'info'
                  : 'check'
              }
              size={13}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.toastText} numberOfLines={2}>
            {message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  // --- Offline Top Banner ---
  offlineBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99998,
    paddingVertical: 7,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  offlineBannerOffline: {
    backgroundColor: '#991B1B', // Deep red
    borderBottomWidth: 1,
    borderBottomColor: '#B91C1C',
  },
  offlineBannerOnline: {
    backgroundColor: '#059669', // Emerald green
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
  },
  offlineInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // --- Floating Toast Card ---
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: width - 32,
    minWidth: Math.min(width - 64, 300),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 99999,
  },
  toastSuccess: {
    backgroundColor: '#064E3B',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  toastError: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  toastInfo: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  iconCircleSuccess: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCircleError: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCircleInfo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    lineHeight: 18,
  },

  // --- Enhanced In-App Push Notification Cards ---
  notifBannerCard: {
    position: 'absolute',
    alignSelf: 'center',
    width: width - 24,
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 999999,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    overflow: 'hidden',
  },
  notifBannerCardRider: {
    backgroundColor: '#0F172A',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 18,
  },

  // Customer In-App Notification
  userBannerInner: {
    padding: 14,
  },
  userNotifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  userBrandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  userBrandName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  userLiveTag: {
    fontSize: 10.5,
    color: '#64748B',
    marginLeft: 3,
    fontWeight: '600',
  },
  userNotifContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNotifTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userNotifBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },
  userActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  userActionLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    marginRight: 3,
  },

  // Rider High-Impact Notification
  riderBannerInner: {
    padding: 14,
  },
  riderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  riderBeaconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  riderPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  riderBeaconText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  riderContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderNotifTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  riderNotifBody: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 17,
  },
  riderCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  riderCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  notifCloseBtn: {
    padding: 3,
  },
});
