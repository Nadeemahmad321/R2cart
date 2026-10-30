import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { CartProvider } from './src/context/CartContext';
import { ToastProvider } from './src/context/ToastContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <CartProvider>
              <FavoritesProvider>
                <RootNavigator />
              </FavoritesProvider>
            </CartProvider>
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

