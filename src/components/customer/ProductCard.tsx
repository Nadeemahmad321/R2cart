import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../theme/colors';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';

const { width } = Dimensions.get('window');
export const PRODUCT_ITEM_WIDTH = (width - 44) / 2;

interface ProductMediaProps {
  imgUri?: string;
  discount: number;
  rating?: number | null;
  ratingCount?: number;
  isFav?: boolean;
  onToggleFav?: () => void;
}

function optimizeThumb(url?: string | null, targetWidth = 320): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/') && !trimmed.includes('w_')) {
    return trimmed.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto/`);
  }
  return trimmed;
}

// Memoized Media Component: Does NOT depend on `quantity`, completely preventing
// image flashing/reloads when user taps `+`, `-`, or `ADD`.
const ProductMedia: React.FC<ProductMediaProps> = React.memo(({
  imgUri,
  discount,
  rating,
  ratingCount,
  isFav,
  onToggleFav,
}) => {
  const { lang, t } = useLanguage();
  const optimizedUri = useMemo(() => optimizeThumb(imgUri, 320), [imgUri]);
  const imageSource = useMemo(() => (optimizedUri ? { uri: optimizedUri } : null), [optimizedUri]);
  const hasRating = rating != null && Number(rating) > 0;

  return (
    <View style={styles.imageBackdrop}>
      {discount > 0 && (
        <View style={styles.discountPill}>
          <Text style={styles.discountPillText}>{discount}% {t('off')}</Text>
        </View>
      )}

      {/* Top-Right Heart / Favorite Button */}
      <TouchableOpacity
        style={[styles.favBtn, isFav && styles.favBtnActive]}
        onPress={onToggleFav}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isFav ? (
          <FontAwesome name="heart" size={12.5} color="#EF4444" />
        ) : (
          <FontAwesome name="heart-o" size={12.5} color="#64748B" />
        )}
      </TouchableOpacity>

      {imageSource ? (
        <Image source={imageSource} style={styles.productImg} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderWrap}>
          <Feather name="shopping-bag" size={26} color="#94A3B8" />
        </View>
      )}

      {/* Bottom Badge Row: Delivery ETA on Left, Backend Rating on Right (matching website) */}
      <View style={styles.badgeRow}>
        <View style={styles.deliveryPill}>
          <Feather name="zap" size={8.5} color="#059669" />
          <Text style={styles.deliveryPillText}>{lang === 'hi' ? '15 मिनट' : '15 MINS'}</Text>
        </View>

        {hasRating && (
          <View style={styles.ratingBadge}>
            <Feather name="star" size={8.5} color="#047857" />
            <Text style={styles.ratingVal}>{Number(rating).toFixed(1)}</Text>
            {ratingCount ? (
              <Text style={styles.ratingCountText}>({ratingCount})</Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
});

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onPress: (productId: string) => void;
  width?: number;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  quantity,
  onAdd,
  onRemove,
  onPress,
  width = PRODUCT_ITEM_WIDTH,
}) => {
  if (!product || !product.id) return null;

  const { t, tProd } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const prodId = String(product.id || (product as any)._id || '');
  const isFav = isFavorite(prodId);

  const price = Number(product.price || (product.variants && product.variants[0]?.price) || 0);
  const mrp = Number(product.mrp || (product.variants && product.variants[0]?.mrp) || price);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const unit = product.unit || (product.variants && product.variants[0]?.unit) || '1 unit';
  const imgUri = product.imageUrl || product.image || (product.images && product.images[0]);

  return (
    <TouchableOpacity
      style={[styles.productCell, { width }]}
      activeOpacity={0.92}
      onPress={() => onPress(product.id)}
    >
      {/* Product Image Media Container */}
      <ProductMedia
        imgUri={imgUri}
        discount={discount}
        rating={product.rating}
        ratingCount={product.ratingCount}
        isFav={isFav}
        onToggleFav={() => toggleFavorite(product)}
      />

      {/* Product Details with Subtle Line Card Outline */}
      <View style={styles.productMeta}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {tProd(product)}
        </Text>
        <Text style={styles.productUnitText}>{unit}</Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.currentPrice}>₹{price}</Text>
            {discount > 0 && <Text style={styles.strikethroughPrice}>₹{mrp}</Text>}
          </View>

          {quantity === 0 ? (
            <TouchableOpacity
              style={styles.addBtnPill}
              activeOpacity={0.8}
              onPress={() => onAdd(product)}
            >
              <Text style={styles.addBtnPillText}>{t('add')}</Text>
              <Feather name="plus" size={13} color={Colors.primaryDark} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyPill}>
              <TouchableOpacity
                style={styles.qtyTouch}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                onPress={() => onRemove(product.id)}
              >
                <Feather name="minus" size={13} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyTouch}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                onPress={() => onAdd(product)}
              >
                <Feather name="plus" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.quantity === next.quantity &&
    prev.width === next.width &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.name === next.product.name
  );
});

const styles = StyleSheet.create({
  // Clean card with subtle outline ("card k chro taraf hlka sa line dikhna chahiye")
  productCell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF5', // subtle clean outline
  },
  // Rectangular media backdrop (matching website's .product-media height: 124px)
  imageBackdrop: {
    width: '100%',
    height: 126,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  discountPill: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    zIndex: 2,
  },
  discountPillText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  favBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  favBtnActive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  // Badge Row: sits at the bottom of the media container
  badgeRow: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    right: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  deliveryPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 2,
  },
  // Website .card-rating-badge
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 252, 231, 0.95)',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  ratingVal: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#047857',
    marginLeft: 2,
  },
  ratingCountText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 1.5,
  },
  productImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: {
    paddingHorizontal: 2,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 15,
    minHeight: 30,
  },
  productUnitText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  currentPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  strikethroughPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  // Increased ADD pill size for effortless tapping
  addBtnPill: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnPillText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  // Increased Quantity pill size with generous touch areas
  qtyPill: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  qtyTouch: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
    marginHorizontal: 1,
  },
});
