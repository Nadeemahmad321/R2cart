import { Category, Product } from '../types';

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
