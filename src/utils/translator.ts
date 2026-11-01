import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const STORAGE_KEY = '@r2cart_auto_translations';
const memoryCache = new Map<string, string>();
let isStorageLoaded = false;

// Initialize cache from AsyncStorage
export const initTranslationCache = async () => {
  if (isStorageLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') {
            memoryCache.set(k.trim().toLowerCase(), v);
          }
        });
      }
    }
  } catch {}
  isStorageLoaded = true;
};

// Immediately kick off cache loading on app import
initTranslationCache().catch(() => {});

const saveToDisk = async (key: string, value: string) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : {};
    current[key.trim().toLowerCase()] = value;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

/**
 * Synchronous cache lookup (0ms response)
 */
export function getCachedHindi(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const key = text.trim().toLowerCase();
  return memoryCache.get(key) || null;
}

/**
 * Asynchronously translate English text to natural Hindi using live Google Translate engine
 * Automatically persists to AsyncStorage and emits event to trigger real-time UI update
 */
export async function translateToHindi(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const key = trimmed.toLowerCase();
  const cached = memoryCache.get(key);
  if (cached) return cached;

  try {
    const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(trimmed)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    let result = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      result = data[0].map((segment: any) => segment?.[0]).filter(Boolean).join(' ').trim();
    }

    if (result) {
      memoryCache.set(key, result);
      saveToDisk(key, result).catch(() => {});
      // Notify all listening components across the app to re-render in Hindi seamlessly
      DeviceEventEmitter.emit('R2CART_TRANSLATION_UPDATED', { text: trimmed, hi: result });
      return result;
    }
  } catch {
    // Graceful fallback to original text on network timeout
  }

  return trimmed;
}

// Queue to throttle background prefetching and prevent rate-limiting
const pendingPrefetches = new Set<string>();
let isBatchRunning = false;

const runBatch = async () => {
  if (isBatchRunning || pendingPrefetches.size === 0) return;
  isBatchRunning = true;

  const items = Array.from(pendingPrefetches).slice(0, 8);
  items.forEach(item => pendingPrefetches.delete(item));

  for (const item of items) {
    if (!getCachedHindi(item)) {
      await translateToHindi(item).catch(() => {});
      // Polite 80ms pacing between requests
      await new Promise(resolve => setTimeout(() => resolve(undefined), 80));
    }
  }

  isBatchRunning = false;
  if (pendingPrefetches.size > 0) {
    setTimeout(runBatch, 200);
  }
};

/**
 * Batch background pre-fetch for dynamic products/categories loaded from the backend
 */
export function prefetchTranslations(items: Array<string | { name?: string; title?: string; noticeTitle?: string; noticeMessage?: string } | undefined | null>) {
  if (!Array.isArray(items)) return;

  items.forEach(item => {
    if (typeof item === 'object' && item) {
      if (item.name) {
        const clean = String(item.name).trim();
        if (clean && clean.length > 1 && !getCachedHindi(clean)) pendingPrefetches.add(clean);
      }
      if (item.title) {
        const clean = String(item.title).trim();
        if (clean && clean.length > 1 && !getCachedHindi(clean)) pendingPrefetches.add(clean);
      }
      if (item.noticeTitle) {
        const clean = String(item.noticeTitle).trim();
        if (clean && clean.length > 1 && !getCachedHindi(clean)) pendingPrefetches.add(clean);
      }
      if (item.noticeMessage) {
        const clean = String(item.noticeMessage).trim();
        if (clean && clean.length > 1 && !getCachedHindi(clean)) pendingPrefetches.add(clean);
      }
    } else {
      const raw = String(item || '').trim();
      if (raw && raw.length > 1 && !getCachedHindi(raw)) pendingPrefetches.add(raw);
    }
  });

  if (!isBatchRunning) {
    setTimeout(runBatch, 300);
  }
}
