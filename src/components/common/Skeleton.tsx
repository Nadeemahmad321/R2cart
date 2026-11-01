import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const BannerSkeleton = () => (
  <View style={styles.bannerSkeletonWrap}>
    <Skeleton width="100%" height={150} borderRadius={18} />
  </View>
);

export const CategoryGridSkeleton = () => (
  <View style={styles.catGridSkeleton}>
    {Array.from({ length: 8 }).map((_, i) => (
      <View key={i} style={styles.catItemSkeleton}>
        <Skeleton width={56} height={56} borderRadius={20} />
        <Skeleton width={48} height={10} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    ))}
  </View>
);

export const ProductCardSkeleton = ({ width = 160 }: { width?: number }) => (
  <View style={[styles.productCardSkeleton, { width }]}>
    <Skeleton width="100%" height={110} borderRadius={12} />
    <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
    <Skeleton width="50%" height={11} borderRadius={4} style={{ marginTop: 6 }} />
    <View style={styles.priceRowSkeleton}>
      <Skeleton width={50} height={18} borderRadius={4} />
      <Skeleton width={58} height={28} borderRadius={8} />
    </View>
  </View>
);

export const OrderCardSkeleton = () => (
  <View style={styles.orderCardSkeleton}>
    {/* Header */}
    <View style={styles.orderHeaderSkeleton}>
      <Skeleton width={110} height={22} borderRadius={6} />
      <Skeleton width={80} height={22} borderRadius={12} />
    </View>
    {/* Subrow: date & pill */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 }}>
      <Skeleton width={110} height={13} borderRadius={4} />
      <Skeleton width={90} height={18} borderRadius={6} />
    </View>
    <View style={styles.orderDivider} />
    {/* Body: thumbnails + pricing */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={38} height={38} borderRadius={6} style={{ marginRight: 6 }} />
        <Skeleton width={38} height={38} borderRadius={6} style={{ marginRight: 8 }} />
        <View>
          <Skeleton width={120} height={13} borderRadius={4} />
          <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 5 }} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Skeleton width={65} height={14} borderRadius={4} />
        <Skeleton width={50} height={18} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    </View>
    <View style={styles.orderDivider} />
    {/* Footer actions */}
    <View style={styles.orderFooterSkeleton}>
      <Skeleton width={110} height={14} borderRadius={4} />
      <View style={{ flexDirection: 'row' }}>
        <Skeleton width={55} height={28} borderRadius={6} style={{ marginRight: 6 }} />
        <Skeleton width={65} height={28} borderRadius={6} />
      </View>
    </View>
  </View>
);

export const CouponCardSkeleton = () => (
  <View style={styles.couponCardSkeleton}>
    {/* Header row: Discount Pill + Code + Copy + Apply Button */}
    <View style={styles.couponHeaderSkeleton}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={56} height={20} borderRadius={4} style={{ marginRight: 6 }} />
        <Skeleton width={74} height={20} borderRadius={4} style={{ marginRight: 6 }} />
        <Skeleton width={20} height={20} borderRadius={4} />
      </View>
      <Skeleton width={58} height={22} borderRadius={6} />
    </View>
    {/* Description line */}
    <Skeleton width="80%" height={12} borderRadius={3} style={{ marginTop: 6 }} />
    {/* Inline Terms Strip */}
    <Skeleton width="55%" height={10} borderRadius={3} style={{ marginTop: 5 }} />
  </View>
);

export const AddressCardSkeleton = () => (
  <View style={styles.addressCardSkeleton}>
    {/* Header row: type icon + title badge */}
    <View style={styles.addressHeaderSkeleton}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={26} height={26} borderRadius={6} style={{ marginRight: 8 }} />
        <Skeleton width={50} height={16} borderRadius={5} style={{ marginRight: 6 }} />
        <Skeleton width={48} height={16} borderRadius={4} />
      </View>
      <Skeleton width={18} height={18} borderRadius={9} />
    </View>
    {/* Body lines */}
    <View style={{ marginTop: 6 }}>
      <Skeleton width="88%" height={12} borderRadius={3} />
      <Skeleton width="55%" height={11} borderRadius={3} style={{ marginTop: 4 }} />
      <Skeleton width="45%" height={10} borderRadius={3} style={{ marginTop: 4 }} />
    </View>
    {/* Divider */}
    <View style={styles.compactDivider} />
    {/* Footer pills */}
    <View style={styles.addressFooterSkeleton}>
      <Skeleton width={74} height={20} borderRadius={5} />
      <View style={{ flexDirection: 'row' }}>
        <Skeleton width={44} height={20} borderRadius={5} style={{ marginRight: 6 }} />
        <Skeleton width={50} height={20} borderRadius={5} />
      </View>
    </View>
  </View>
);

export const FavoriteCardSkeleton = () => (
  <View style={styles.favoriteCardSkeleton}>
    {/* Image */}
    <Skeleton width={80} height={80} borderRadius={12} style={{ marginRight: 14 }} />
    {/* Info Column */}
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>
        <Skeleton width="85%" height={14} borderRadius={4} />
        <Skeleton width="50%" height={11} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <View>
          <Skeleton width={55} height={16} borderRadius={4} />
          <Skeleton width={38} height={11} borderRadius={4} style={{ marginTop: 3 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={28} height={28} borderRadius={14} style={{ marginRight: 8 }} />
          <Skeleton width={68} height={30} borderRadius={8} />
        </View>
      </View>
    </View>
  </View>
);

export const ChatBubbleSkeleton = () => (
  <View style={styles.chatSkeletonContainer}>
    {/* Left Partner Bubble */}
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
      <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} />
      <View style={styles.partnerBubbleSkeleton}>
        <Skeleton width={160} height={14} borderRadius={4} />
        <Skeleton width={100} height={11} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
    {/* Right User Bubble */}
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
      <View style={styles.userBubbleSkeleton}>
        <Skeleton width={140} height={14} borderRadius={4} />
      </View>
    </View>
    {/* Left Partner Bubble */}
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
      <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} />
      <View style={styles.partnerBubbleSkeleton}>
        <Skeleton width={200} height={14} borderRadius={4} />
        <Skeleton width={130} height={14} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
  </View>
);

export const CartScreenSkeleton = () => (
  <View style={styles.cartSkeletonContainer}>
    {/* Top Header Placeholder */}
    <View style={styles.cartSkeletonHeader}>
      <Skeleton width={36} height={36} borderRadius={18} />
      <Skeleton width={120} height={20} borderRadius={6} />
      <Skeleton width={36} height={36} borderRadius={18} />
    </View>

    {/* Top Address Card Skeleton (Compact) */}
    <View style={styles.cartSkeletonAddressCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 9 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width="45%" height={12} borderRadius={4} />
          <Skeleton width="80%" height={11} borderRadius={4} />
        </View>
        <Skeleton width={52} height={22} borderRadius={6} />
      </View>
    </View>

    {/* Delivery Mode Chips (Compact) */}
    <View style={styles.cartSkeletonRow}>
      <Skeleton width="48%" height={38} borderRadius={8} />
      <Skeleton width="48%" height={38} borderRadius={8} />
    </View>

    {/* 2 Cart Item Skeletons */}
    <View style={styles.cartSkeletonItemsBox}>
      {[1, 2].map(i => (
        <View key={i} style={styles.cartItemSkeletonRow}>
          <Skeleton width={60} height={60} borderRadius={10} style={{ marginRight: 12 }} />
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <Skeleton width="75%" height={14} borderRadius={4} />
            <Skeleton width="40%" height={11} borderRadius={3} style={{ marginVertical: 4 }} />
            <Skeleton width="30%" height={15} borderRadius={4} />
          </View>
          <Skeleton width={74} height={30} borderRadius={8} />
        </View>
      ))}
    </View>

    {/* Bill Summary Skeleton */}
    <View style={styles.cartSkeletonBillBox}>
      <Skeleton width={110} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={styles.cartSkeletonBillRow}>
        <Skeleton width="40%" height={12} borderRadius={4} />
        <Skeleton width="20%" height={12} borderRadius={4} />
      </View>
      <View style={styles.cartSkeletonBillRow}>
        <Skeleton width="45%" height={12} borderRadius={4} />
        <Skeleton width="15%" height={12} borderRadius={4} />
      </View>
      <View style={[styles.cartSkeletonBillRow, { marginTop: 8 }]}>
        <Skeleton width="35%" height={16} borderRadius={4} />
        <Skeleton width="25%" height={16} borderRadius={4} />
      </View>
    </View>
  </View>
);

export const DeliveryOrderCardSkeleton = () => (
  <View style={styles.deliveryOrderCardSkeleton}>
    {/* Top Row: Order # + Badge */}
    <View style={styles.deliveryOrderTopSkeleton}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={110} height={16} borderRadius={4} />
          <Skeleton width={50} height={16} borderRadius={4} style={{ marginLeft: 8 }} />
        </View>
        <Skeleton width={140} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={80} height={22} borderRadius={6} />
    </View>

    {/* Meta Row: delivery type & status */}
    <View style={styles.deliveryOrderMetaSkeleton}>
      <Skeleton width={120} height={12} borderRadius={4} />
      <Skeleton width={70} height={18} borderRadius={4} />
    </View>

    {/* Address Box */}
    <View style={styles.deliveryAddressBoxSkeleton}>
      <Skeleton width={16} height={16} borderRadius={8} style={{ marginRight: 8, marginTop: 2 }} />
      <View style={{ flex: 1, gap: 5 }}>
        <Skeleton width="92%" height={11} borderRadius={3} />
        <Skeleton width="60%" height={11} borderRadius={3} />
      </View>
    </View>

    {/* Action Buttons Row */}
    <View style={styles.deliveryOrderActionsSkeleton}>
      <Skeleton width="38%" height={38} borderRadius={8} />
      <Skeleton width="58%" height={38} borderRadius={8} />
    </View>
  </View>
);

export const DeliveryCodBoxSkeleton = () => (
  <View style={styles.deliveryCodBoxSkeleton}>
    <View style={{ flex: 1 }}>
      <Skeleton width={120} height={12} borderRadius={4} />
      <Skeleton width={90} height={24} borderRadius={5} style={{ marginVertical: 6 }} />
      <Skeleton width={160} height={12} borderRadius={4} />
    </View>
    <Skeleton width={85} height={26} borderRadius={13} />
  </View>
);

export const DeliveryDashboardSkeleton = () => (
  <View style={styles.deliveryDashboardSkeletonContainer}>
    {/* COD Box */}
    <DeliveryCodBoxSkeleton />

    {/* Tabs Row */}
    <View style={styles.deliveryTabsSkeleton}>
      <Skeleton width={105} height={32} borderRadius={16} style={{ marginRight: 8 }} />
      <Skeleton width={90} height={32} borderRadius={16} />
    </View>

    {/* 3 Delivery Order Skeletons */}
    <DeliveryOrderCardSkeleton />
    <DeliveryOrderCardSkeleton />
    <DeliveryOrderCardSkeleton />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  bannerSkeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  catGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  catItemSkeleton: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 14,
  },
  productCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  priceRowSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orderCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  orderFooterSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  couponHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 7,
  },
  addressHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressFooterSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatSkeletonContainer: {
    padding: 16,
  },
  partnerBubbleSkeleton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '75%',
  },
  userBubbleSkeleton: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    maxWidth: '75%',
  },
  cartSkeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cartSkeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartSkeletonAddressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  cartSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cartSkeletonItemsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cartItemSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cartSkeletonBillBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cartSkeletonBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryOrderCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryOrderTopSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  deliveryOrderMetaSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryAddressBoxSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryOrderActionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  deliveryCodBoxSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryTabsSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryDashboardSkeletonContainer: {
    flex: 1,
  },
});
