import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, ToastAndroid, Alert } from 'react-native';
import { api } from '../services/api';
import { Product } from '../types';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favoriteIds: string[];
  favorites: Product[];
  loading: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product | string) => Promise<boolean>;
  removeFavorite: (productId: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteIds: [],
  favorites: [],
  loading: false,
  isFavorite: () => false,
  toggleFavorite: async () => false,
  removeFavorite: async () => {},
  fetchFavorites: async () => {},
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await api.getToken();
      if (!token && !user) {
        setFavoriteIds([]);
        setFavorites([]);
        return;
      }
      setLoading(true);
      const res = await api.getFavorites();
      const list = res?.data?.data || res?.data?.favorites || res?.data || [];
      if (Array.isArray(list)) {
        setFavorites(list);
        setFavoriteIds(list.map((p: any) => String(p.id || p._id || '')));
      }
    } catch {
      // Keep existing list on transient failure
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (productId: string) => {
      if (!productId) return false;
      return favoriteIds.includes(String(productId));
    },
    [favoriteIds]
  );

  const showNotify = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    }
  };

  const toggleFavorite = useCallback(
    async (target: Product | string): Promise<boolean> => {
      const prodId = typeof target === 'string' ? String(target) : String(target.id || (target as any)._id || '');
      if (!prodId) return false;

      const currentlyFav = favoriteIds.includes(prodId);
      const nextFavState = !currentlyFav;

      // 0ms Synchronous Optimistic Update - Heart turns red INSTANTLY on click!
      if (currentlyFav) {
        setFavoriteIds(prev => prev.filter(id => id !== prodId));
        setFavorites(prev => prev.filter(p => String(p.id || (p as any)._id) !== prodId));
        showNotify('Removed from favourites');
      } else {
        setFavoriteIds(prev => (prev.includes(prodId) ? prev : [...prev, prodId]));
        if (typeof target !== 'string') {
          setFavorites(prev => [target, ...prev.filter(p => String(p.id || (p as any)._id) !== prodId)]);
        }
        showNotify('Saved to favourites');
      }

      // Background authentication & backend sync
      try {
        const token = await api.getToken();
        if (!token && !user) {
          // Revert optimistic state if user is not signed in
          if (currentlyFav) {
            setFavoriteIds(prev => (prev.includes(prodId) ? prev : [...prev, prodId]));
            if (typeof target !== 'string') setFavorites(prev => [target, ...prev]);
          } else {
            setFavoriteIds(prev => prev.filter(id => id !== prodId));
            setFavorites(prev => prev.filter(p => String(p.id || (p as any)._id) !== prodId));
          }
          Alert.alert(
            'Sign in Required',
            'Please sign in to save your favourite products to your wishlist.',
            [{ text: 'OK' }]
          );
          return false;
        }

        if (currentlyFav) {
          await api.removeFavorite(prodId);
        } else {
          await api.addFavorite(prodId);
        }
        return nextFavState;
      } catch (err: any) {
        // Rollback on network/backend failure
        if (currentlyFav) {
          setFavoriteIds(prev => (prev.includes(prodId) ? prev : [...prev, prodId]));
          if (typeof target !== 'string') {
            setFavorites(prev => [target, ...prev]);
          }
        } else {
          setFavoriteIds(prev => prev.filter(id => id !== prodId));
          setFavorites(prev => prev.filter(p => String(p.id || (p as any)._id) !== prodId));
        }
        Alert.alert('Wishlist Error', err.message || 'Could not update favourite status');
        return currentlyFav;
      }
    },
    [favoriteIds, user]
  );

  const removeFavorite = useCallback(
    async (productId: string) => {
      if (!productId) return;
      const targetId = String(productId);
      // Instant optimistic UI update (0ms latency)
      setFavoriteIds(prev => prev.filter(id => String(id) !== targetId));
      setFavorites(prev => prev.filter(p => String(p.id || (p as any)._id) !== targetId));
      showNotify('Removed from favourites');

      try {
        await api.removeFavorite(targetId);
      } catch (err: any) {
        // Rollback / refresh if backend call failed
        fetchFavorites();
      }
    },
    [fetchFavorites]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favorites,
        loading,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        fetchFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
