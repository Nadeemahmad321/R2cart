export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: 'CUSTOMER' | 'DELIVERY_PERSON' | 'ADMIN' | 'MANAGER' | 'SUPER_ADMIN';
  deliveryStaffId?: string | null;
  dutyStatus?: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK' | string;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
}

export interface ProductVariant {
  id: string;
  name?: string;
  unit?: string;
  weight?: string;
  price: number;
  mrp?: number;
  stock?: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  images?: string[];
  category?: any;
  categorySlug?: string;
  categoryName?: string;
  variants?: ProductVariant[];
  variantGroupId?: string;
  price?: number;
  mrp?: number;
  costPrice?: number;
  unit?: string;
  stock?: number;
  sku?: string;
  featured?: boolean;
  bestSeller?: boolean;
  status?: string;
  rating?: number | null;
  ratingCount?: number;
  deliveryScope?: 'LOCAL' | 'PAN_INDIA' | 'CUSTOM' | string;
  deliveryLocations?: string[] | string;
  shippingFee?: number;
  shippingSoloOnly?: boolean;
  shippingMinOtherCartValue?: number;
  orderMode?: 'DIRECT_ORDER' | 'CONTACT_REQUEST' | 'BOTH' | string;
  estimatedDelivery?: string;
  minOrderQty?: number;
  dietaryPreference?: string;
  specifications?: any;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  image?: string;
  color?: string;
  position?: number;
  status?: string;
  badgeActive?: boolean;
  badgeText?: string;
  noticeActive?: boolean;
  noticeTitle?: string;
  noticeMessage?: string;
}

export interface Banner {
  id: string;
  title?: string;
  imageUrl?: string;
  image?: string;
  kicker?: string;
  heading?: string;
  subtitle?: string;
  ctaText?: string;
  destination?: string;
  link?: string;
  position?: number;
  status?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  unit?: string;
  price: number;
  mrp?: number;
  imageUrl?: string;
  quantity: number;
  stock?: number;
  status?: string;
  isSoon?: boolean;
  comingSoon?: boolean;
  categorySlug?: string;
  deliveryScope?: 'LOCAL' | 'PAN_INDIA' | 'CUSTOM' | string;
  orderMode?: 'DIRECT_ORDER' | 'CONTACT_REQUEST' | 'BOTH' | string;
  shippingFee?: number;
  shippingSoloOnly?: boolean;
  shippingMinOtherCartValue?: number;
  minOrderQty?: number;
  dietaryPreference?: string;
}

export interface Address {
  id: string;
  fullName?: string;
  name?: string;
  phone?: string;
  mobile?: string;
  houseNo?: string;
  house?: string;
  street?: string;
  landmark?: string;
  city?: string;
  area?: string;
  pincode?: string;
  pin?: string;
  type?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  mrp?: number;
  unit?: string;
  image?: string;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  status: any;
  totalAmount?: number;
  grandTotal?: number;
  total?: number;
  itemTotal?: number;
  deliveryFee?: number;
  discount?: number;
  paymentMethod: 'COD' | 'ONLINE';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  deliveryAddress?: any;
  address?: any;
  items: OrderItem[];
  customerName?: string;
  customerMobile?: string;
  createdAt: string;
  date?: string;
  deliveredAt?: string | null;
  deliveryType?: string;
  deliveryDate?: string | null;
  deliverySlot?: string | null;
  deliveryInstruction?: string | null;
  customer?: string;
  mobile?: string;
  handlingFee?: number;
  couponDiscount?: number;
  productDiscount?: number;
  deliveryPerson?: {
    id: string;
    name: string;
    mobile?: string;
    vehicleType?: string | null;
    vehicleNumber?: string | null;
  } | null;
  assignedDeliveryPerson?: {
    id: string;
    name: string;
    mobile?: string;
    vehicleType?: string | null;
    vehicleNumber?: string | null;
  } | null;
  deliveryProof?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'CUSTOMER' | 'DELIVERY_PERSON';
  message: string;
  createdAt: string;
}

export interface CodSummary {
  cashInHand: number;
  todayDeliveredCount: number;
  todayPendingCount: number;
  todayCollectedCod: number;
  settledAmount?: number;
  pendingSettlement?: number;
}
