import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

const TOKEN_KEY = '@r2cart_token';
const REFRESH_TOKEN_KEY = '@r2cart_refresh_token';
const ROLE_KEY = '@r2cart_role';
const USER_KEY = '@r2cart_user';

type NetworkListener = (isOnline: boolean) => void;
const networkListeners = new Set<NetworkListener>();
let isCurrentlyOnline = true;

export const networkStatus = {
  isOnline: () => isCurrentlyOnline,
  setOnline: (online: boolean) => {
    if (isCurrentlyOnline !== online) {
      isCurrentlyOnline = online;
      networkListeners.forEach(listener => {
        try {
          listener(online);
        } catch {}
      });
    }
  },
  subscribe: (listener: NetworkListener) => {
    networkListeners.add(listener);
    listener(isCurrentlyOnline);
    return () => {
      networkListeners.delete(listener);
    };
  },
  checkConnectivity: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const online = res.status === 204 || res.ok;
      networkStatus.setOnline(online);
      return online;
    } catch {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
        const res2 = await fetch(`${API_CONFIG.BASE_URL}/health`, {
          method: 'GET',
          signal: controller2.signal,
        });
        clearTimeout(timeoutId2);
        const online = res2.ok;
        networkStatus.setOnline(online);
        return online;
      } catch {
        networkStatus.setOnline(false);
        return false;
      }
    }
  },
};

class ApiService {
  private baseUrl = API_CONFIG.BASE_URL;
  private refreshPromise: Promise<string | null> | null = null;

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setTokens(token: string, refreshToken?: string, role?: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      if (role) {
        await AsyncStorage.setItem(ROLE_KEY, role);
      }
    } catch {}
  }

  async setToken(token: string, role?: string): Promise<void> {
    return this.setTokens(token, undefined, role);
  }

  async getCachedUser(): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setCachedUser(user: any): Promise<void> {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_KEY);
      }
    } catch {}
  }

  async clearToken(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(ROLE_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch {}
  }

  async getRole(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ROLE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Silent session renewal via /auth/refresh
   */
  async refreshSession(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const storedRefreshToken = await this.getRefreshToken();
        if (!storedRefreshToken) {
          return null;
        }

        const url = `${this.baseUrl}/auth/refresh`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-refresh-token': storedRefreshToken,
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          // If explicitly 401 expired or invalid, session cannot be refreshed
          if (res.status === 401) {
            await this.clearToken();
          }
          return null;
        }

        const payload = json.data !== undefined ? json.data : json;
        const newAccess = payload?.accessToken;
        const newRefresh = payload?.refreshToken;
        if (newAccess) {
          const role = (await this.getRole()) || 'CUSTOMER';
          await this.setTokens(newAccess, newRefresh || storedRefreshToken, role);
          if (payload?.user) {
            await this.setCachedUser(payload.user);
          }
          return newAccess;
        }
        return null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<{ success: boolean; data: T; message?: string }> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle transient proxy / gateway issues on backend (502/503/504)
      if ([502, 503, 504].includes(response.status) && retries > 0) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
        return this.request<T>(endpoint, options, retries - 1);
      }

      // Silent Automatic Token Refresh on 401
      const isAuthEndpoint =
        endpoint.startsWith('/auth/login') ||
        endpoint.startsWith('/auth/refresh') ||
        endpoint.startsWith('/delivery/auth/login');

      if (response.status === 401 && !isAuthEndpoint && retries > 0) {
        const refreshedToken = await this.refreshSession();
        if (refreshedToken) {
          return this.request<T>(
            endpoint,
            {
              ...options,
              headers: {
                ...headers,
                Authorization: `Bearer ${refreshedToken}`,
              },
            },
            retries - 1
          );
        }
      }

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = json.message || json.error || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      // Seamlessly unwrap backend response if nested in { data: ... }
      const payload = json.data !== undefined ? json.data : json;

      networkStatus.setOnline(true);

      return {
        success: json.success ?? true,
        data: payload,
        message: json.message,
      };
    } catch (err: any) {
      const rawMsg = (err?.message || String(err || '')).toLowerCase();
      const isNetwork =
        rawMsg.includes('network request failed') ||
        rawMsg.includes('failed to fetch') ||
        rawMsg.includes('network error') ||
        rawMsg.includes('enotfound') ||
        rawMsg.includes('connection refused') ||
        rawMsg.includes('aborted');

      if (retries > 0 && (rawMsg.includes('502') || isNetwork)) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
        return this.request<T>(endpoint, options, retries - 1);
      }

      if (isNetwork) {
        networkStatus.setOnline(false);
        throw new Error('No internet connection. Please check your mobile data or Wi-Fi and try again.');
      }

      throw new Error(err.message || 'Something went wrong. Please try again.');
    }
  }

  // --- Auth Endpoints ---
  async customerLogin(identifier: string, password: string) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (res.data?.accessToken) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken, 'CUSTOMER');
      if (res.data?.user) {
        await this.setCachedUser(res.data.user);
      }
    }
    return res;
  }

  async requestOtp(data: { email: string; name?: string; mobile?: string; password?: string; mode?: string }) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mode: 'signup', ...data }),
    });
  }

  async verifyOtp(data: { email: string; otp: string; mode?: string }) {
    const res = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mode: 'signup', ...data }),
    });
    if (res.data?.accessToken) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken, 'CUSTOMER');
      if (res.data?.user) {
        await this.setCachedUser(res.data.user);
      }
    }
    return res;
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  }

  async resetPassword(data: { email: string; otp: string; password: string }) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email.trim().toLowerCase(),
        otp: data.otp.trim(),
        password: data.password,
      }),
    });
  }

  async deliveryLogin(identifier: string, password: string) {
    const res = await this.request('/delivery/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (res.data?.accessToken) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken, 'DELIVERY_PERSON');
      if (res.data?.user) {
        await this.setCachedUser(res.data.user);
      }
    }
    return res;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(data: any) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount() {
    return this.request('/users/me', {
      method: 'DELETE',
    });
  }

  // --- Catalog Endpoints ---
  async getProducts(params?: { category?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    if (params?.search) query.append('q', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/products${qs}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async getCategories() {
    return this.request('/categories');
  }

  async getBanners() {
    return this.request('/banners');
  }

  async getBestSellers() {
    return this.request('/homepage/best-sellers');
  }

  async getTopPicks() {
    return this.request('/homepage/top-picks');
  }

  async searchProducts(query: string, category?: string) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category && category !== 'all') params.append('category', category);
    return this.request(`/search?${params.toString()}`);
  }

  async getSearchSuggestions(query: string) {
    return this.request(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // --- Customer Favorites ---
  async getFavorites() {
    return this.request('/favorites');
  }

  async addFavorite(productId: string) {
    return this.request(`/favorites/${productId}`, {
      method: 'POST',
    });
  }

  async removeFavorite(productId: string) {
    return this.request(`/favorites/${productId}`, {
      method: 'DELETE',
    });
  }

  // --- Customer Cart Endpoints ---
  async getCart() {
    return this.request('/cart');
  }

  async setCartItem(productId: string, quantity: number) {
    return this.request('/cart/items', {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async clearCart() {
    return this.request('/cart', {
      method: 'DELETE',
    });
  }

  // --- Customer Addresses ---
  async getAddresses() {
    return this.request('/addresses');
  }

  async addAddress(address: any) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    });
  }

  async updateAddress(id: string, address: any) {
    return this.request(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(address),
    });
  }

  async deleteAddress(id: string) {
    return this.request(`/addresses/${id}`, {
      method: 'DELETE',
    });
  }

  async setDefaultAddress(id: string) {
    return this.request(`/addresses/${id}/default`, {
      method: 'PATCH',
    });
  }

  // --- Customer Search History ---
  async getSearchHistory() {
    return this.request('/search-history');
  }

  async addSearchHistory(query: string) {
    return this.request('/search-history', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  async removeSearchHistory(query: string) {
    return this.request(`/search-history/${encodeURIComponent(query)}`, {
      method: 'DELETE',
    });
  }

  async clearSearchHistory() {
    return this.request('/search-history', {
      method: 'DELETE',
    });
  }

  // --- Delivery Areas & Zones ---
  async getDelivery() {
    return this.request('/delivery');
  }

  async getDeliverySlots(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`/delivery-slots${query}`);
  }

  async getSettings() {
    return this.request('/settings');
  }

  // --- Customer Coupons & Offers ---
  async getCoupons() {
    return this.request('/coupons');
  }

  async validateCoupon(code: string) {
    return this.request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // --- Customer Support Tickets ---
  async getSupportTickets() {
    return this.request('/support');
  }

  async createSupportTicket(ticket: {
    issueType: string;
    orderId?: string | null;
    subject: string;
    description: string;
    mobile?: string;
  }) {
    return this.request('/support', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  // --- Customer Orders & Checkout ---
  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderPayload: any) {
    return this.request('/checkout', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
  }

  async cancelOrder(id: string, reason: string) {
    return this.request(`/orders/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async updateOrderDetails(id: string, payload: any) {
    return this.request(`/orders/${id}/details`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // --- Customer Chat with Delivery Boy ---
  async getCustomerDeliveryChat(orderId: string) {
    return this.request(`/orders/${orderId}/delivery-chat`);
  }

  async sendCustomerDeliveryChatMessage(orderId: string, message: string) {
    return this.request(`/orders/${orderId}/delivery-chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // --- Delivery Boy Portal Endpoints ---
  async getMyDeliveries(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request(`/delivery-portal/my-orders${qs}`);
  }

  async getDeliveryOrderDetail(id: string) {
    return this.request(`/delivery-portal/orders/${id}`);
  }

  async updateDeliveryStatus(id: string, status: string, note?: string) {
    return this.request(`/delivery-portal/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  }

  async completeDelivery(id: string, payloadOrOtp?: any, recipientName?: string) {
    let body: any = {};
    if (typeof payloadOrOtp === 'string') {
      body = { otp: payloadOrOtp, recipientName };
    } else if (payloadOrOtp && typeof payloadOrOtp === 'object') {
      body = payloadOrOtp;
    }
    return this.request(`/delivery-portal/orders/${id}/complete-delivery`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async reportDeliveryFailure(id: string, reason: string) {
    return this.request(`/delivery-portal/orders/${id}/report-failure`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async updateDutyStatus(statusOrOnline: string | boolean) {
    const dutyStatus = typeof statusOrOnline === 'boolean'
      ? (statusOrOnline ? 'ON_DUTY' : 'OFF_DUTY')
      : statusOrOnline;
    return this.request('/delivery-portal/duty-status', {
      method: 'PATCH',
      body: JSON.stringify({ dutyStatus }),
    });
  }

  async getCodSummary() {
    return this.request('/delivery-portal/cod-summary');
  }

  async getDeliveryProfile() {
    return this.request('/delivery-portal/profile');
  }

  async getDeliveryChat(orderId: string) {
    return this.request(`/delivery-portal/orders/${orderId}/chat`);
  }

  async sendDeliveryChatMessage(orderId: string, message: string) {
    return this.request(`/delivery-portal/orders/${orderId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // --- Aliases for compatibility ---
  async checkout(orderPayload: any) {
    return this.createOrder(orderPayload);
  }

  async rateProduct(productId: string, rating: number) {
    return this.request(`/products/${productId}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ score: rating }),
    });
  }

  async getCustomerChat(orderId: string) {
    return this.getCustomerDeliveryChat(orderId);
  }

  async sendCustomerMessage(orderId: string, message: string) {
    return this.sendCustomerDeliveryChatMessage(orderId, message);
  }

  async getRiderChat(orderId: string) {
    return this.getDeliveryChat(orderId);
  }

  async sendRiderMessage(orderId: string, message: string) {
    return this.sendDeliveryChatMessage(orderId, message);
  }

  async getDeliveryOrders(status?: string) {
    return this.getMyDeliveries(status);
  }

  async getDeliveryOrderDetails(id: string) {
    return this.getDeliveryOrderDetail(id);
  }

  // --- FCM Device Push Notifications ---
  async registerFcmToken(token: string, role = 'CUSTOMER') {
    return this.request('/notifications/fcm/token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        role,
        platform: Platform.OS === 'android' ? 'ANDROID' : 'IOS',
      }),
    });
  }

  async unregisterFcmToken(token: string) {
    return this.request('/notifications/fcm/token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  }
}

export const api = new ApiService();
