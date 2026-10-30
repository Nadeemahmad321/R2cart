import { Category, Product } from '../types';

/**
 * Ultra-fast in-memory cache service.
 * Allows Category & Product screens to render in 0ms (Stale-While-Revalidate).
 * Completely eliminates blank screens, skeleton flashes, and laggy tab transitions.
 */
class DataCacheService {
  private categories: Category[] = [];
  private productsByCategory: Map<string, Product[]> = new Map();

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

  setProductsByCategory(slug: string, prods: Product[]) {
    if (slug && Array.isArray(prods)) {
      this.productsByCategory.set(slug, prods);
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
  }
}

export const dataCache = new DataCacheService();
