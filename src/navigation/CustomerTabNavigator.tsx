import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

// Screens
import { HomeScreen } from '../screens/customer/HomeScreen';
import { CategoriesScreen } from '../screens/customer/CategoriesScreen';
import { SearchScreen } from '../screens/customer/SearchScreen';
import { OrdersScreen } from '../screens/customer/OrdersScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();

export const CustomerTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  // Ensure generous clearance so bottom tab never hides behind system navigation bar or gesture pill
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 24);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + bottomInset,
            paddingBottom: bottomInset + 4,
          },
        ],
        tabBarItemStyle: {
          paddingBottom: 2,
        },
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoriesScreen}
        options={{
          lazy: false,
          tabBarLabel: t('categories'),
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: t('search'),
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: t('orders'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Feather name="package" size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('account'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={21} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
