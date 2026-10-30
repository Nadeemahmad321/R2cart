import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { Product } from '../../types';
import { FloatingCartBar } from '../../components/customer/FloatingCartBar';
import { FavoriteCardSkeleton } from '../../components/common/Skeleton';

export const FavoritesScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { addToCart, removeFromCart, getItemQuantity, totalItems } = useCart();
  const { favorites, loading, fetchFavorites, removeFavorite } = useFavorites();

  // Refresh favorites on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites])
  );

  const handleOpenProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const renderFavItem = ({ item, index }: { item: Product; index: number }) => {
    const prodId = String(item.id || (item as any)._id || '');
    const qty = getItemQuantity(prodId);
    const price = Number(item.price || (item.variants && item.variants[0]?.price) || 0);
    const mrp = Number(item.mrp || (item.variants && item.variants[0]?.mrp) || price);
    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const unit = item.unit || (item.variants && item.variants[0]?.unit) || '1 unit';
    const imgUri = item.imageUrl || item.image || (item.images && item.images[0]);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => handleOpenProduct(prodId)}
      >
        {/* Compact Product Image */}
        <View style={styles.imgWrap}>
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.img} resizeMode="contain" />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Feather name="package" size={24} color="#94A3B8" />
            </View>
          )}
        </View>

        {/* Product Info Section */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.unit}>{unit}</Text>

          {/* Bottom Row: Price & Perfectly Aligned Action Buttons */}
          <View style={styles.bottomRow}>
            <View style={styles.priceWrap}>
              <Text style={styles.price}>₹{price}</Text>
              {discount > 0 && <Text style={styles.mrp}>₹{mrp}</Text>}
            </View>

            {/* Actions: Heart Delete Button & Add Button Aligned in Same Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => removeFavorite(prodId)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <FontAwesome name="heart" size={18} color="#EF4444" />
              </TouchableOpacity>

              {qty === 0 ? (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addBtnText}>+ ADD</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => removeFromCart(prodId)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="minus" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{qty}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="plus" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sleek Top Header with Chevron Back Arrow */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={26} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.titleCol}>
            <Text style={styles.topBarTitle}>My Favourites</Text>
            <Text style={styles.topBarSubtitle}>
              {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
            </Text>
          </View>
        </View>

        <View style={styles.headerRightBadge}>
          <View style={styles.favIconWrap}>
            <FontAwesome name="heart" size={15} color="#EF4444" />
          </View>
        </View>
      </View>

      {/* Screen Body */}
      {loading && favorites.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <FavoriteCardSkeleton />
          <FavoriteCardSkeleton />
          <FavoriteCardSkeleton />
          <FavoriteCardSkeleton />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconOuter}>
            <View style={styles.emptyIconCircle}>
              <FontAwesome name="heart" size={38} color="#EF4444" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySub}>
            Tap the heart icon on any product across R2Cart to save your favourite items here for fast re-ordering.
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.88}
          >
            <Feather name="shopping-bag" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.shopBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavItem}
          keyExtractor={(item) => String(item.id || (item as any)._id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (totalItems > 0 ? 100 : 28) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchFavorites}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Bottom Cart Bar if items are added */}
      <FloatingCartBar
        bottomOffset={Math.max(insets.bottom + 18, 28)}
        onPress={() => navigation.navigate('Cart')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleCol: {
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  headerRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1', // crisp clean outline all around the card
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0,
  },
  imgWrap: {
    width: 62,
    height: 62,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
    overflow: 'hidden',
  },
  img: {
    width: '90%',
    height: '90%',
  },
  imgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
    zIndex: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
    marginBottom: 2,
  },
  unit: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flexShrink: 1,
    marginRight: 6,
  },
  price: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  mrp: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heartBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    height: 30,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.2,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  qtyContainer: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'center',
    marginHorizontal: 2,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});
