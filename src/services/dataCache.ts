import { Category, Product } from '../types';
import { normalizeHomeLayout, HomeLayoutConfig } from '../config/homeLayout';

export interface EmergencyInfo {
  isEmergencyActive: boolean;
  isStorePaused: boolean;
  isImmediatePaused: boolean;
  isScheduledPaused: boolean;
  isAreaSuspended: boolean;
  emergencyType: 'ALL_ORDERS' | 'IMMEDIATE_ONLY' | 'SCHEDULED_ONLY' | 'SELECTED_AREAS' | 'STORE_CLOSE' | null;
  title: string;
  message: string;
  resumesAtLabel: string | null;
  affectedVillageIds: string[];
  canPlaceOrder: boolean;
  blockReason?: string;
  holidayDates: string[];
}

/**
 * Ultra-fast in-memory cache service.
 * Allows Category & Product screens to render in 0ms (Stale-While-Revalidate).
 * Completely eliminates blank screens, skeleton flashes, and laggy tab transitions.
 */
class DataCacheService {
  private categories: Category[] = [];
  private productsByCategory: Map<string, Product[]> = new Map();
  private productById: Map<string, Product> = new Map();
  private settings: any = null;
  private deliveryData: any = null;

  getSettings(): any {
    return this.settings;
  }

  setSettings(s: any) {
    if (s && typeof s === 'object') {
      this.settings = s;
      if (s.estimatedDelivery && !this.deliveryData?.settings?.estimatedDelivery) {
        if (!this.deliveryData) this.deliveryData = {};
        this.deliveryData.estimatedDelivery = s.estimatedDelivery;
      }
    }
  }

  getDeliveryData(): any {
    return this.deliveryData;
  }

  setDeliveryData(d: any) {
    if (d && typeof d === 'object') {
      this.deliveryData = d;
    }
  }

  getEstimatedDelivery(defaultEta = '20-30 mins'): string {
    const d = this.deliveryData;
    const fromDelivery = d?.settings?.estimatedDelivery || d?.estimatedDelivery;
    if (fromDelivery && typeof fromDelivery === 'string' && fromDelivery.trim()) {
      return fromDelivery.trim();
    }
    const fromSettings = this.settings?.estimatedDelivery;
    if (fromSettings && typeof fromSettings === 'string' && fromSettings.trim()) {
      return fromSettings.trim();
    }
    return defaultEta;
  }

  getHomeLayout(): HomeLayoutConfig {
    const raw = this.settings?.policies?.homeLayout || this.settings?.homeLayout || null;
    return normalizeHomeLayout(raw);
  }

  isSectionEnabled(sectionId: string, defaultEnabled = true): boolean {
    const layout = this.getHomeLayout();
    if (!layout || !Array.isArray(layout.sections)) return defaultEnabled;
    const sec = layout.sections.find((s: any) => s && s.id === sectionId);
    if (!sec) return defaultEnabled;
    return sec.enabled !== false;
  }

  getSectionConfig(sectionId: string): any {
    const layout = this.getHomeLayout();
    if (!layout || !Array.isArray(layout.sections)) return null;
    return layout.sections.find((s: any) => s && s.id === sectionId) || null;
  }

  isProductComingSoon(product: any): boolean {
    if (!product) return false;
    const layout = this.settings?.policies?.homeLayout || this.settings?.homeLayout || this.settings || {};
    const comingSoonCategories: string[] = Array.isArray(layout.comingSoonCategories) ? layout.comingSoonCategories : [];
    const comingSoonProducts: string[] = Array.isArray(layout.comingSoonProducts) ? layout.comingSoonProducts : [];
    const comingSoonExemptions: string[] = Array.isArray(layout.comingSoonExemptions) ? layout.comingSoonExemptions : [];

    const id = String(product.id || product._id || '');
    const catSlug = product.categorySlug || product.category?.slug || (typeof product.category === 'string' ? product.category : null);

    // 1. Explicit individual Coming Soon (ON)
    if (id && comingSoonProducts.includes(id)) return true;

    // 2. Explicit individual Available / Exemption (OFF)
    if (id && comingSoonExemptions.includes(id)) return false;

    // 3. Category level Soon
    if (catSlug && comingSoonCategories.includes(catSlug)) return true;

    return Boolean(product.isSoon || product.comingSoon);
  }

  isCategoryComingSoon(categorySlug?: string | null): boolean {
    if (!categorySlug) return false;
    const layout = this.settings?.policies?.homeLayout || this.settings?.homeLayout || this.settings || {};
    const comingSoonCategories: string[] = Array.isArray(layout.comingSoonCategories) ? layout.comingSoonCategories : [];
    return comingSoonCategories.includes(categorySlug);
  }

  isProductOutOfStock(product: any, variantStock?: number): boolean {
    if (!product) return false;
    const status = String(product.status || '').toUpperCase();
    if (status === 'INACTIVE' || status === 'OUT_OF_STOCK' || status === 'ARCHIVED' || status === 'DISABLED' || product.inStock === false) {
      return true;
    }
    if (variantStock !== undefined && variantStock !== null) {
      return Number(variantStock) <= 0;
    }
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      const allVariantsOos = product.variants.every((v: any) => v.stock !== undefined && v.stock !== null && Number(v.stock) <= 0);
      if (allVariantsOos) return true;
    }
    const stockVal = product.stock;
    if (stockVal !== undefined && stockVal !== null) {
      return Number(stockVal) <= 0;
    }
    return false;
  }

  getPackOptions(product: any): any[] {
    if (!product) return [];
    if (product.variantGroupId) {
      const all = Array.from(this.productById.values());
      const siblings = all.filter(p => p.variantGroupId === product.variantGroupId);
      if (siblings.length > 1) {
        return siblings.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      }
    }
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 1) {
      return product.variants.map((v: any) => ({
        ...product,
        id: v.id || `${product.id}_${v.unit}`,
        productId: product.id,
        variantId: v.id,
        unit: v.unit || v.weight || v.name || product.unit,
        price: Number(v.price),
        mrp: Number(v.mrp || v.price),
        stock: v.stock !== undefined ? v.stock : product.stock,
      }));
    }
    return [product];
  }

  getCategories(): Category[] {
    return this.categories;
  }

  getEmergencyInfo(selectedAddress?: any | null): EmergencyInfo {
    const s = this.settings || {};
    const effective = s.effectiveStatus || {};
    const pause = s.policies?.emergencyPause || {};
    const emSettings = s.emergencySettings || {};
    const isOrderPaused = Boolean(s.isOrderPaused);

    const isPausedByPolicy = Boolean(pause.isPaused);
    const isPausedByEffective =
      effective.storeStatus === 'EMERGENCY_PAUSED' || Boolean(effective.isEmergencyActive);
    const isPausedByEmSettings = Boolean(emSettings.isActive);

    const isEmergencyActive =
      isPausedByPolicy || isPausedByEffective || isPausedByEmSettings || isOrderPaused;

    const rawType =
      emSettings.type ||
      effective.emergencyDetails?.type ||
      (isPausedByPolicy ? 'ALL_ORDERS' : isOrderPaused ? 'ALL_ORDERS' : null);

    const emergencyType:
      | 'ALL_ORDERS'
      | 'IMMEDIATE_ONLY'
      | 'SCHEDULED_ONLY'
      | 'SELECTED_AREAS'
      | 'STORE_CLOSE'
      | null = rawType || (isEmergencyActive ? 'ALL_ORDERS' : null);

    const rawVillages =
      emSettings.affectedVillageIds || effective.emergencyDetails?.affectedVillageIds || [];
    const affectedVillageIds: string[] = Array.isArray(rawVillages)
      ? rawVillages.map((v: any) => String(v).trim().toLowerCase()).filter(Boolean)
      : [];

    let isAreaSuspended = false;
    if (isEmergencyActive && emergencyType === 'SELECTED_AREAS' && selectedAddress) {
      const addrArea = String(selectedAddress.area || '').trim().toLowerCase();
      const addrVillage = String(
        selectedAddress.village || selectedAddress.villageName || ''
      ).trim().toLowerCase();
      const addrVillageId = String(selectedAddress.villageId || '').trim().toLowerCase();
      const addrCity = String(selectedAddress.city || '').trim().toLowerCase();
      const addrPin = String(selectedAddress.pincode || selectedAddress.pin || '').trim();

      isAreaSuspended = affectedVillageIds.some(vId => {
        if (!vId) return false;
        return (
          vId === addrVillageId ||
          vId === addrArea ||
          vId === addrVillage ||
          vId === addrCity ||
          (addrArea && (vId.includes(addrArea) || addrArea.includes(vId))) ||
          (addrVillage && (vId.includes(addrVillage) || addrVillage.includes(vId))) ||
          (addrPin && vId === addrPin)
        );
      });
    }

    const nextOpening = effective.nextAvailableOpening;
    const rawEndTime =
      effective.emergencyDetails?.endTime || emSettings.endTime || pause.resumesAt;
    let resumesAtLabel: string | null = null;
    if (nextOpening?.label) {
      resumesAtLabel = String(nextOpening.label).trim();
    } else if (rawEndTime) {
      try {
        const date = new Date(rawEndTime);
        if (!isNaN(date.getTime())) {
          resumesAtLabel = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      } catch {}
    }

    const rawReason =
      effective.statusReason ||
      effective.emergencyDetails?.message ||
      emSettings.message ||
      pause.message ||
      (pause.reason ? `High order volume (${pause.reason})` : null);

    const message = (rawReason || '').trim() || 'Store operations are temporarily adjusted due to emergency conditions.';

    const isStorePaused =
      isEmergencyActive &&
      (emergencyType === 'ALL_ORDERS' ||
        emergencyType === 'STORE_CLOSE' ||
        effective.storeStatus === 'EMERGENCY_PAUSED');

    const isImmediatePaused =
      isStorePaused ||
      emergencyType === 'IMMEDIATE_ONLY' ||
      effective.allowImmediateOrders === false;

    const isScheduledPaused =
      isStorePaused ||
      emergencyType === 'SCHEDULED_ONLY' ||
      effective.allowScheduledOrders === false;

    const canPlaceOrder = !isStorePaused && !isAreaSuspended;

    let title = 'Orders Temporarily Paused';
    if (emergencyType === 'STORE_CLOSE') {
      title = 'Store Temporarily Closed';
    } else if (isAreaSuspended) {
      const areaName = selectedAddress?.village || selectedAddress?.villageName || selectedAddress?.area || 'Your Area';
      title = `Deliveries Suspended in ${areaName}`;
    } else if (emergencyType === 'IMMEDIATE_ONLY') {
      title = 'Instant Delivery Paused';
    } else if (emergencyType === 'SCHEDULED_ONLY') {
      title = 'Scheduled Delivery Paused';
    }

    let blockReason: string | undefined;
    if (isStorePaused) {
      blockReason = message || 'We are temporarily not taking new orders. Please check back shortly.';
    } else if (isAreaSuspended) {
      const areaName = selectedAddress?.village || selectedAddress?.villageName || selectedAddress?.area || 'your area';
      blockReason = `Deliveries to ${areaName} are temporarily suspended due to emergency conditions. Please choose another address or check back later.`;
    }

    const holidayDates = Array.isArray(pause.holidayDates) ? pause.holidayDates : [];

    return {
      isEmergencyActive,
      isStorePaused,
      isImmediatePaused,
      isScheduledPaused,
      isAreaSuspended,
      emergencyType,
      title,
      message,
      resumesAtLabel,
      affectedVillageIds,
      canPlaceOrder,
      blockReason,
      holidayDates,
    };
  }

  setCategories(cats: Category[]) {
    if (Array.isArray(cats) && cats.length > 0) {
      this.categories = cats;
    }
  }

  hasCategories(): boolean {
    return this.categories.length > 0;
  }

  getProductsByCategory(slug: string): Product[] | undefined {
    if (!slug) return undefined;
    return this.productsByCategory.get(slug);
  }

  getProductById(id: string): Product | undefined {
    if (!id) return undefined;
    return this.productById.get(String(id));
  }

  setProductsByCategory(slug: string, prods: Product[]) {
    if (slug && Array.isArray(prods)) {
      this.productsByCategory.set(slug, prods);
      for (const p of prods) {
        if (p && p.id) {
          this.productById.set(String(p.id), p);
        }
      }
    }
  }

  hasProductsForCategory(slug: string): boolean {
    return this.productsByCategory.has(slug) && (this.productsByCategory.get(slug)?.length || 0) > 0;
  }

  populateFromProducts(products: Product[]) {
    if (!Array.isArray(products) || products.length === 0) return;

    const groups: Record<string, Product[]> = {};
    for (const p of products) {
      if (!p) continue;
      if (p.id) {
        this.productById.set(String(p.id), p);
      }
      const slug =
        (typeof p.category === 'object' ? p.category?.slug : null) ||
        (typeof p.category === 'string' ? p.category : null) ||
        p.categorySlug;

      if (slug) {
        if (!groups[slug]) groups[slug] = [];
        groups[slug].push(p);
      }
    }

    for (const [slug, list] of Object.entries(groups)) {
      if (!this.productsByCategory.has(slug) || (this.productsByCategory.get(slug)?.length || 0) < list.length) {
        this.productsByCategory.set(slug, list);
      }
    }
  }

  clear() {
    this.categories = [];
    this.productsByCategory.clear();
    this.productById.clear();
    this.settings = null;
  }
}

export const dataCache = new DataCacheService();
