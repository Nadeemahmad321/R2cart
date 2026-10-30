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
}

export const defaultHomeSections: HomeSectionConfig[] = [
  {
    id: 'heroBanners',
    label: 'Top Hero Banners Carousel',
    enabled: true,
    order: 1,
  },
  {
    id: 'campaignOffers',
    label: 'Offers Picked For You (Campaign Rail)',
    enabled: true,
    order: 2,
    title: 'Offers picked for you',
    subtitle: 'Fresh deals, updated from R2Cart',
  },
  {
    id: 'shopCategories',
    label: 'Shop By Category (Capsules & Grid)',
    enabled: true,
    order: 3,
    title: 'Shop by category',
    subtitle: 'Everything your home needs',
  },
  {
    id: 'recommended',
    label: 'Recommended For You Rail',
    enabled: true,
    order: 4,
    title: 'Recommended for you',
    count: 10,
  },
  {
    id: 'bestSellers',
    label: 'Best Sellers Rail',
    enabled: true,
    order: 5,
    title: 'Best sellers',
    count: 10,
  },
  {
    id: 'topPicks',
    label: 'Top Picks Rail',
    enabled: true,
    order: 6,
    title: 'Top picks',
    count: 10,
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
  },
  {
    id: 'categoryRails',
    label: 'Category Product Rails',
    enabled: true,
    order: 8,
  },
  {
    id: 'specialOffers',
    label: 'Special Offers Rail',
    enabled: true,
    order: 9,
    title: 'Special offers',
    count: 10,
  },
  {
    id: 'recentlyViewed',
    label: 'Recently Viewed Rail',
    enabled: true,
    order: 10,
    title: 'Recently viewed',
    count: 8,
  },
  {
    id: 'promise',
    label: 'Delivery & Quality Promise',
    enabled: true,
    order: 11,
  },
];
