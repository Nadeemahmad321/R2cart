import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { navigationRef, navigate } from './navigationRef';
import { notificationService } from '../services/notificationService';
import { useToast } from '../context/ToastContext';

// Customer Bottom Tab Navigator
import { CustomerTabNavigator } from './CustomerTabNavigator';

// Customer Stack Screens
import { ProductDetailScreen } from '../screens/customer/ProductDetailScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { OrderDetailScreen } from '../screens/customer/OrderDetailScreen';
import { OrderSuccessScreen } from '../screens/customer/OrderSuccessScreen';
import { CustomerChatScreen } from '../screens/customer/CustomerChatScreen';
import { CustomerLoginScreen } from '../screens/customer/CustomerLoginScreen';
import { CustomerSignUpScreen } from '../screens/customer/CustomerSignUpScreen';
import { ForgotPasswordScreen } from '../screens/customer/ForgotPasswordScreen';
import { AddressesScreen } from '../screens/customer/AddressesScreen';
import { FavoritesScreen } from '../screens/customer/FavoritesScreen';
import { CouponsScreen } from '../screens/customer/CouponsScreen';
import { SupportScreen } from '../screens/customer/SupportScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { useAuth } from '../context/AuthContext';

// Delivery Boy Screens
import { DeliveryLoginScreen } from '../screens/delivery/DeliveryLoginScreen';
import { DeliveryDashboardScreen } from '../screens/delivery/DeliveryDashboardScreen';
import { DeliveryOrderDetailScreen } from '../screens/delivery/DeliveryOrderDetailScreen';
import { DeliveryChatScreen } from '../screens/delivery/DeliveryChatScreen';
import { DeliveryCodScreen } from '../screens/delivery/DeliveryCodScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { user, role, isLoading } = useAuth();
  const { showToast, showNotification } = useToast();

  useEffect(() => {
    const fcmRole =
      role === 'DELIVERY_PERSON' || user?.role === 'DELIVERY_PERSON' ? 'DELIVERY' : 'CUSTOMER';

    // Initial token request and registration with backend
    notificationService.syncDeviceToken(fcmRole).catch(() => {});

    // Listen for refreshed tokens
    const unsubTokenRefresh = notificationService.listenTokenRefresh(fcmRole);

    // Production-Grade Foreground In-App Notification Banner
    const unsubForeground = notificationService.listenForeground((remoteMessage) => {
      const title =
        remoteMessage.notification?.title ||
        (remoteMessage.data?.title as string) ||
        'Order Update';
      const body =
        remoteMessage.notification?.body ||
        (remoteMessage.data?.body as string) ||
        '';
      const data = remoteMessage.data;

      showNotification({
        title,
        body,
        data,
        onPress: () => {
          const targetScreen = data?.screen as string | undefined;
          const orderId = data?.orderId as string | undefined;

          if (targetScreen === 'OrderDetail' && orderId) {
            navigate('OrderDetail', { orderId });
          } else if (targetScreen === 'DeliveryOrderDetail' && orderId) {
            navigate('DeliveryOrderDetail', { orderId });
          } else if (orderId) {
            navigate('OrderDetail', { orderId });
          } else if (targetScreen) {
            navigate(targetScreen, data);
          }
        },
      });
    });

    // Tap-to-open handler (from background or quit state)
    const unsubOpened = notificationService.listenNotificationOpened((remoteMessage) => {
      const data = remoteMessage.data;
      if (!data) return;

      const targetScreen = data.screen as string | undefined;
      const orderId = data.orderId as string | undefined;

      if (targetScreen === 'OrderDetail' && orderId) {
        navigate('OrderDetail', { orderId });
      } else if (targetScreen === 'DeliveryOrderDetail' && orderId) {
        navigate('DeliveryOrderDetail', { orderId });
      } else if (targetScreen) {
        navigate(targetScreen, data);
      }
    });

    return () => {
      if (typeof unsubTokenRefresh === 'function') unsubTokenRefresh();
      if (typeof unsubForeground === 'function') unsubForeground();
      if (typeof unsubOpened === 'function') unsubOpened();
    };
  }, [user, role, showToast]);

  // Show clean branded splash screen while auth session is restoring from storage
  if (isLoading) {
    return <SplashScreen />;
  }

  const initialRoute = user
    ? (role === 'DELIVERY_PERSON' || user.role === 'DELIVERY_PERSON' ? 'DeliveryDashboard' : 'MainTabs')
    : 'CustomerLogin';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: Colors.dark,
          headerTitleStyle: {
            fontWeight: '800',
          },
          headerShadowVisible: false,
        }}
      >
        {/* Customer Auth Screen (Entry screen after Splash for guest/new customer) */}
        <Stack.Screen
          name="CustomerLogin"
          component={CustomerLoginScreen}
          options={{ headerShown: false }}
        />

        {/* Customer Main Bottom Tabs */}
        <Stack.Screen
          name="MainTabs"
          component={CustomerTabNavigator}
          options={{ headerShown: false }}
        />

        {/* Customer Stack Pages */}
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Product Details' }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderSuccess"
          component={OrderSuccessScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CustomerChat"
          component={CustomerChatScreen}
          options={{ title: 'Delivery Partner Chat' }}
        />
        <Stack.Screen
          name="CustomerSignUp"
          component={CustomerSignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Addresses"
          component={AddressesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Coupons"
          component={CouponsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Support"
          component={SupportScreen}
          options={{ headerShown: false }}
        />

        {/* Delivery Boy Portal */}
        <Stack.Screen
          name="DeliveryLogin"
          component={DeliveryLoginScreen}
          options={{
            title: 'Rider Portal',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="DeliveryDashboard"
          component={DeliveryDashboardScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="DeliveryOrderDetail"
          component={DeliveryOrderDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="DeliveryChat"
          component={DeliveryChatScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="DeliveryCod"
          component={DeliveryCodScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
