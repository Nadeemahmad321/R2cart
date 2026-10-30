import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useCart } from '../../context/CartContext';

interface FloatingCartBarProps {
  onPress: () => void;
  bottomOffset?: number;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = React.memo(({ onPress, bottomOffset }) => {
  const insets = useSafeAreaInsets();
  const { items, totalItems, grandTotal } = useCart();

  if (totalItems <= 0) return null;

  // Up to 3 preview thumbnails for stacked preview matching the website FloatingBottomCartBar
  const previewThumbs = items.slice(0, 3);

  // Screen content container ends at the top of the tab bar, so bottom: 10 sits
  // snugly right above the bottom tab bar with an elegant 10px floating margin.
  // Can be customized with bottomOffset on screens without bottom tabs.
  const bottomPosition = bottomOffset !== undefined ? bottomOffset : 10;

  return (
    <TouchableOpacity
      style={[styles.container, { bottom: bottomPosition }]}
      activeOpacity={0.92}
      onPress={onPress}
    >
      {/* Left Section: Thumbnails Stack + Total & Items info */}
      <View style={styles.leftSection}>
        {/* Thumbnails stack or Cart Icon */}
        <View style={styles.thumbsStack}>
          {previewThumbs.map((item, idx) => (
            <View
              key={item.id || idx}
              style={[
                styles.thumbWrapper,
                {
                  marginLeft: idx > 0 ? -12 : 0,
                  zIndex: 3 - idx,
                },
              ]}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.thumbImg}
                  resizeMode="cover"
                />
              ) : (
                <Feather name="shopping-bag" size={14} color="#059669" />
              )}
            </View>
          ))}
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.titleText}>
            {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'} | ₹{grandTotal}
          </Text>
          <Text style={styles.subText}>⚡ Instant delivery to your door</Text>
        </View>
      </View>

      {/* Right Section: Pure White Pill Button matching website */}
      <View style={styles.actionPill}>
        <Text style={styles.actionText}>View Cart</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // Website matching deep rich emerald gradient styling
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#047857',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    elevation: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 999,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  thumbsStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  thumbWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subText: {
    color: '#A7F3D0',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1.5,
  },
  // Pure White pill action button matching website FloatingBottomCartBar
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    color: '#065F46',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
