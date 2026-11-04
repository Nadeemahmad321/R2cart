export interface HomeSectionConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  title?: string;
  subtitle?: string;
  count?: number;
  tag?: string;
  buttonText?: string;
  buttonLink?: string;
  maxCategories?: number;
  comingSoon?: boolean;
  comingSoonBadge?: string;
  comingSoonTitle?: string;
  comingSoonNotice?: string;
  description?: string;
}

export interface HomeLayoutConfig {
  sections: HomeSectionConfig[];
  bannerPlacements: Record<string, 'HERO' | 'CAMPAIGN' | 'BOTH'>;
  bannerVisuals: Record<string, any>;
  heroRotation: {
    manualBannerId?: string;
    manualChangedAt?: string;
    intervalHours?: number;
  };
  categoryOrder: string[];
  comingSoonCategories: string[];
  comingSoonProducts: string[];
  comingSoonExemptions: string[];
}

export const defaultHomeSections: HomeSectionConfig[] = [
  {
    id: 'heroBanners',
    label: 'Top Hero Banners Carousel',
    enabled: true,
    order: 1,
    description: 'Primary visual cards or carousel at the top of the storefront with product callouts.',
  },
  {
    id: 'campaignOffers',
    label: 'Offers Picked For You (Campaign Rail)',
    enabled: true,
    order: 2,
    title: 'Offers picked for you',
    subtitle: 'Fresh deals, updated from R2Cart',
    description: 'Promotional campaign cards rail showing deals, discounts and bank offers.',
  },
  {
    id: 'shopCategories',
    label: 'Shop By Category (Capsules & Grid)',
    enabled: true,
    order: 3,
    title: 'Shop by category',
    subtitle: 'Everything your home needs',
    description: 'Icon capsules allowing customers to quickly navigate into specific aisles.',
  },
  {
    id: 'recommended',
    label: 'Recommended For You Rail',
    enabled: true,
    order: 4,
    title: 'Recommended for you',
    count: 10,
    description: 'Personalized product recommendations tailored for customer shopping baskets.',
  },
  {
    id: 'bestSellers',
    label: 'Best Sellers Rail',
    enabled: true,
    order: 5,
    title: 'Best sellers',
    count: 10,
    description: 'Top trending and highest-velocity products across your catalog.',
  },
  {
    id: 'topPicks',
    label: 'Top Picks Rail',
    enabled: true,
    order: 6,
    title: 'Top picks',
    count: 10,
    description: 'Curated, algorithmic, and hybrid grocery recommendations.',
  },
  {
    id: 'promoStrip',
    label: 'Savings Promo Strip',
    enabled: true,
    order: 7,
    tag: 'YOUR SAVINGS',
    title: 'Stock up. Save more.',
    subtitle: 'Explore the current offers available for your basket.',
    buttonText: 'Explore offers',
    buttonLink: 'Coupons',
    description: 'Highlighted promotional banner linking shoppers directly to available coupons.',
  },
  {
    id: 'categoryRails',
    label: 'Category Product Rails',
    enabled: true,
    order: 8,
    maxCategories: 8,
    description: 'Individual horizontal product rails grouped by category (e.g. Fruits, Dairy, Snacks).',
  },
  {
    id: 'specialOffers',
    label: 'Special Offers Rail',
    enabled: true,
    order: 9,
    title: 'Special offers',
    count: 10,
    description: 'Deals with significant price markdowns and high savings for shoppers.',
  },
  {
    id: 'recentlyViewed',
    label: 'Recently Viewed Rail',
    enabled: true,
    order: 10,
    title: 'Recently viewed',
    count: 8,
    description: 'Products recently opened or explored by shoppers to boost repeat orders.',
  },
  {
    id: 'promise',
    label: 'Delivery & Quality Promise',
    enabled: true,
    order: 11,
    description: 'Bottom trust banner highlighting delivery speed, freshness guarantee & customer support.',
  },
];

export const defaultHomeLayout: HomeLayoutConfig = {
  sections: defaultHomeSections,
  bannerPlacements: {},
  bannerVisuals: {},
  heroRotation: {},
  categoryOrder: [],
  comingSoonCategories: [],
  comingSoonProducts: [],
  comingSoonExemptions: [],
};

export function isProductComingSoon(product: any, layoutOrSettings?: any): boolean {
  if (!product) return false;
  const layout =
    layoutOrSettings?.policies?.homeLayout ||
    layoutOrSettings?.homeLayout ||
    layoutOrSettings ||
    {};
  const comingSoonCategories = Array.isArray(layout.comingSoonCategories)
    ? layout.comingSoonCategories
    : [];
  const comingSoonProducts = Array.isArray(layout.comingSoonProducts)
    ? layout.comingSoonProducts
    : [];
  const comingSoonExemptions = Array.isArray(layout.comingSoonExemptions)
    ? layout.comingSoonExemptions
    : [];

  const id = String(product.id || product._id || '');
  const catSlug =
    product.categorySlug ||
    product.category?.slug ||
    (typeof product.category === 'string' ? product.category : null);

  // 1. Explicit individual Coming Soon (ON)
  if (id && comingSoonProducts.includes(id)) return true;

  // 2. Explicit individual Available / Exemption (OFF)
  if (id && comingSoonExemptions.includes(id)) return false;

  // 3. Category level Soon
  if (catSlug && comingSoonCategories.includes(catSlug)) return true;

  // 4. Product-level flag if any
  return Boolean(product.isSoon || product.comingSoon);
}

export function normalizeHomeLayout(rawLayout: any): HomeLayoutConfig {
  if (!rawLayout || typeof rawLayout !== 'object') {
    return defaultHomeLayout;
  }

  const rawSections: any[] = Array.isArray(rawLayout.sections) ? rawLayout.sections : [];
  const mergedSections = defaultHomeSections.map(def => {
    const existing = rawSections.find(s => s && s.id === def.id);
    if (!existing) return { ...def, comingSoon: false };
    return {
      ...def,
      ...existing,
      enabled: existing.enabled !== false,
      order: Number(existing.order) > 0 ? Number(existing.order) : def.order,
      comingSoon: Boolean(existing.comingSoon),
      comingSoonBadge: existing.comingSoonBadge || 'Coming Soon',
      comingSoonTitle: existing.comingSoonTitle || '',
      comingSoonNotice: existing.comingSoonNotice || '',
    };
  });

  const extraSections = rawSections
    .filter(s => s && s.id && !defaultHomeSections.some(def => def.id === s.id))
    .map(s => ({
      ...s,
      enabled: s.enabled !== false,
      order: Number(s.order) || 99,
      comingSoon: Boolean(s.comingSoon),
      comingSoonBadge: s.comingSoonBadge || 'Coming Soon',
      comingSoonTitle: s.comingSoonTitle || '',
      comingSoonNotice: s.comingSoonNotice || '',
    }));

  const allSections = [...mergedSections, ...extraSections].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
  );

  return {
    sections: allSections,
    bannerPlacements:
      rawLayout.bannerPlacements && typeof rawLayout.bannerPlacements === 'object'
        ? rawLayout.bannerPlacements
        : {},
    bannerVisuals:
      rawLayout.bannerVisuals && typeof rawLayout.bannerVisuals === 'object'
        ? rawLayout.bannerVisuals
        : {},
    heroRotation:
      rawLayout.heroRotation && typeof rawLayout.heroRotation === 'object'
        ? rawLayout.heroRotation
        : {},
    categoryOrder: Array.isArray(rawLayout.categoryOrder) ? rawLayout.categoryOrder : [],
    comingSoonCategories: Array.isArray(rawLayout.comingSoonCategories)
      ? rawLayout.comingSoonCategories
      : [],
    comingSoonProducts: Array.isArray(rawLayout.comingSoonProducts)
      ? rawLayout.comingSoonProducts
      : [],
    comingSoonExemptions: Array.isArray(rawLayout.comingSoonExemptions)
      ? rawLayout.comingSoonExemptions
      : [],
  };
}
