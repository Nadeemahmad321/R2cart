import { Platform, PermissionsAndroid, TurboModuleRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const FCM_TOKEN_STORAGE_KEY = '@r2cart_fcm_token';

class NotificationService {
  private messagingModule: any = null;
  private isModuleChecked = false;

  /**
   * Safely load messaging module only if native TurboModule is registered in the APK.
   */
  private getMessagingModule(): any {
    if (this.isModuleChecked) return this.messagingModule;

    try {
      // Check if native Firebase module exists in current APK
      const nativeTurboApp = TurboModuleRegistry?.get ? TurboModuleRegistry.get('NativeRNFBTurboApp') : null;
      if (!nativeTurboApp) {
        console.log('[NotificationService] NativeRNFBTurboApp not yet registered in APK. A native build (npx react-native run-android) is required.');
        this.isModuleChecked = true;
        this.messagingModule = null;
        return null;
      }

      this.messagingModule = require('@react-native-firebase/messaging');
      this.isModuleChecked = true;
      return this.messagingModule;
    } catch (e: any) {
      console.log('[NotificationService] Firebase messaging module load notice:', e?.message);
      this.isModuleChecked = true;
      this.messagingModule = null;
      return null;
    }
  }

  private getMessagingInstance(): any {
    const mod = this.getMessagingModule();
    if (!mod || typeof mod.getMessaging !== 'function') return null;
    try {
      return mod.getMessaging();
    } catch (e: any) {
      console.log('[NotificationService] Firebase messaging instance error:', e?.message);
      return null;
    }
  }

  /**
   * Request push notification permission for Android 13+ & iOS.
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      if (Platform.OS === 'ios') {
        const mod = this.getMessagingModule();
        const messaging = this.getMessagingInstance();
        if (!mod || !messaging || typeof mod.requestPermission !== 'function') return false;

        const authStatus = await mod.requestPermission(messaging);
        return (
          authStatus === mod.AuthorizationStatus?.AUTHORIZED ||
          authStatus === mod.AuthorizationStatus?.PROVISIONAL
        );
      }

      return true;
    } catch (err: any) {
      console.log('[NotificationService] Permission request error:', err?.message);
      return false;
    }
  }

  /**
   * Fetch device FCM token, cache locally, and register with backend.
   */
  async syncDeviceToken(role: 'CUSTOMER' | 'DELIVERY' | 'ADMIN' = 'CUSTOMER'): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('[NotificationService] Push notifications permission denied.');
        return null;
      }

      const mod = this.getMessagingModule();
      const messaging = this.getMessagingInstance();
      if (!mod || !messaging || typeof mod.getToken !== 'function') {
        return null;
      }

      const token = await mod.getToken(messaging);
      if (!token) return null;

      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (cachedToken !== token) {
        await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      }

      // Sync with backend API
      try {
        await api.registerFcmToken(token, role);
        console.log('[NotificationService] FCM token registered with backend successfully.');
      } catch (err: any) {
        console.log('[NotificationService] Backend token sync notice:', err?.message);
      }

      return token;
    } catch (err: any) {
      console.log('[NotificationService] Get FCM token error:', err?.message);
      return null;
    }
  }

  /**
   * Setup foreground notification listener when app is open.
   */
  listenForeground(onReceive: (message: any) => void) {
    try {
      const mod = this.getMessagingModule();
      const messaging = this.getMessagingInstance();
      if (!mod || !messaging || typeof mod.onMessage !== 'function') return () => {};

      return mod.onMessage(messaging, (remoteMessage: any) => {
        console.log('[NotificationService] Foreground message received:', remoteMessage?.notification?.title);
        onReceive(remoteMessage);
      });
    } catch (e: any) {
      console.log('[NotificationService] listenForeground warning:', e?.message);
      return () => {};
    }
  }

  /**
   * Listen for token refreshes automatically.
   */
  listenTokenRefresh(role: 'CUSTOMER' | 'DELIVERY' | 'ADMIN' = 'CUSTOMER') {
    try {
      const mod = this.getMessagingModule();
      const messaging = this.getMessagingInstance();
      if (!mod || !messaging || typeof mod.onTokenRefresh !== 'function') return () => {};

      return mod.onTokenRefresh(messaging, async (newToken: string) => {
        try {
          await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
          await api.registerFcmToken(newToken, role);
          console.log('[NotificationService] Refreshed FCM token synced.');
        } catch (err: any) {
          console.log('[NotificationService] Token refresh sync error:', err?.message);
        }
      });
    } catch (e: any) {
      console.log('[NotificationService] listenTokenRefresh warning:', e?.message);
      return () => {};
    }
  }

  /**
   * Listen when user taps a notification while app is in background or quit state.
   */
  listenNotificationOpened(onOpen: (message: any) => void) {
    try {
      const mod = this.getMessagingModule();
      const messaging = this.getMessagingInstance();
      if (!mod || !messaging) return () => {};

      // App in background
      let unsubscribe = () => {};
      if (typeof mod.onNotificationOpenedApp === 'function') {
        unsubscribe = mod.onNotificationOpenedApp(messaging, (remoteMessage: any) => {
          if (remoteMessage) {
            console.log('[NotificationService] App opened from background by notification:', remoteMessage.data);
            onOpen(remoteMessage);
          }
        });
      }

      // App opened from completely closed (quit) state
      if (typeof mod.getInitialNotification === 'function') {
        mod.getInitialNotification(messaging)
          .then((remoteMessage: any) => {
            if (remoteMessage) {
              console.log('[NotificationService] App opened from quit state by notification:', remoteMessage.data);
              onOpen(remoteMessage);
            }
          })
          .catch((err: any) => {
            console.log('[NotificationService] getInitialNotification error:', err?.message);
          });
      }

      return unsubscribe;
    } catch (e: any) {
      console.log('[NotificationService] listenNotificationOpened warning:', e?.message);
      return () => {};
    }
  }

  /**
   * Unregister FCM token on logout.
   */
  async unregisterToken() {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (token) {
        await api.unregisterFcmToken(token);
        await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      }
      const mod = this.getMessagingModule();
      const messaging = this.getMessagingInstance();
      if (mod && messaging && typeof mod.deleteToken === 'function') {
        await mod.deleteToken(messaging);
      }
      console.log('[NotificationService] FCM token unregistered.');
    } catch (err: any) {
      console.log('[NotificationService] Unregister token error:', err?.message);
    }
  }
}

export const notificationService = new NotificationService();
