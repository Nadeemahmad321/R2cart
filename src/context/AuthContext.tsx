import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { notificationService } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  role: 'CUSTOMER' | 'DELIVERY_PERSON' | null;
  isLoading: boolean;
  loginCustomer: (identifier: string, pass: string) => Promise<User | null>;
  loginDelivery: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchRole: (newRole: 'CUSTOMER' | 'DELIVERY_PERSON') => void;
  setAuthSession: (user: User, role?: 'CUSTOMER' | 'DELIVERY_PERSON') => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'CUSTOMER' | 'DELIVERY_PERSON' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const startTime = Date.now();
    try {
      const [savedRole, token, cachedUser] = await Promise.all([
        api.getRole(),
        api.getToken(),
        api.getCachedUser(),
      ]);

      // 1. Immediately restore cached user & role to avoid UI flash / logout
      if (cachedUser && token) {
        setUser(cachedUser);
        const resolvedRole =
          (savedRole as 'CUSTOMER' | 'DELIVERY_PERSON') ||
          (cachedUser.role === 'DELIVERY_PERSON' ? 'DELIVERY_PERSON' : 'CUSTOMER');
        setRole(resolvedRole);

        // Background validate / sync with backend without blocking app start
        api.getMe().then(async (res) => {
          if (res?.data) {
            setUser(res.data);
            await api.setCachedUser(res.data);
            const currentRole = res.data.role === 'DELIVERY_PERSON' ? 'DELIVERY_PERSON' : 'CUSTOMER';
            setRole(currentRole);
          }
        }).catch(async (meErr: any) => {
          const is401 =
            meErr?.message?.includes('401') ||
            meErr?.message?.includes('unauthorized') ||
            meErr?.message?.includes('expired');

          if (is401) {
            const refreshed = await api.refreshSession();
            if (refreshed) {
              const retryRes = await api.getMe().catch(() => null);
              if (retryRes?.data) {
                setUser(retryRes.data);
                await api.setCachedUser(retryRes.data);
                return;
              }
            }
            await api.clearToken();
            setUser(null);
            setRole(null);
          }
        });
        return;
      }

      // If token exists but cachedUser wasn't cached yet, fetch from backend
      if (token && !cachedUser) {
        try {
          const res = await api.getMe();
          if (res?.data) {
            setUser(res.data);
            await api.setCachedUser(res.data);
            const currentRole = res.data.role === 'DELIVERY_PERSON' ? 'DELIVERY_PERSON' : 'CUSTOMER';
            setRole(currentRole);
          }
        } catch {}
      }
    } catch {
      // Graceful storage fallback
    } finally {
      // Ensure single clean splash display time without microsecond flickering/glitching
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000 - elapsed));
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const loginCustomer = async (identifier: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const res = await api.customerLogin(identifier, pass);
      if (res.data?.user) {
        setUser(res.data.user);
        await api.setCachedUser(res.data.user);
        const resolvedRole = res.data.user.role === 'DELIVERY_PERSON' ? 'DELIVERY_PERSON' : 'CUSTOMER';
        setRole(resolvedRole);
        // Sync FCM device token with backend
        notificationService.syncDeviceToken('CUSTOMER').catch(() => {});
        return res.data.user;
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loginDelivery = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.deliveryLogin(identifier, pass);
      if (res.data?.user) {
        setUser(res.data.user);
        await api.setCachedUser(res.data.user);
        setRole('DELIVERY_PERSON');
        // Sync FCM device token with backend
        notificationService.syncDeviceToken('DELIVERY').catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await notificationService.unregisterToken();
    } catch {}
    await api.clearToken();
    setUser(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      if (res.data) {
        setUser(res.data);
        await api.setCachedUser(res.data);
      }
    } catch {}
  };

  const switchRole = (newRole: 'CUSTOMER' | 'DELIVERY_PERSON') => {
    setRole(newRole);
  };

  const setAuthSession = async (newUser: User, newRole: 'CUSTOMER' | 'DELIVERY_PERSON' = 'CUSTOMER') => {
    setUser(newUser);
    setRole(newRole);
    await api.setCachedUser(newUser);
    notificationService.syncDeviceToken(newRole === 'DELIVERY_PERSON' ? 'DELIVERY' : 'CUSTOMER').catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        loginCustomer,
        loginDelivery,
        logout,
        refreshProfile,
        switchRole,
        setAuthSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
