import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../theme/colors';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { dataCache } from '../../services/dataCache';
import { ProductEnquiryModal } from './ProductEnquiryModal';

const { width } = Dimensions.get('window');
export const PRODUCT_ITEM_WIDTH = (width - 44) / 2;

interface ProductMediaProps {
  imgUri?: string;
  discount: number;
  isFav?: boolean;
  onToggleFav?: () => void;
  isOutOfStock?: boolean;
  isComingSoon?: boolean;
  stock?: number;
  deliveryScope?: string;
  orderMode?: string;
}

function optimizeThumb(url?: string | null, targetWidth = 240): string {
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
  isFav,
  onToggleFav,
  isOutOfStock,
  isComingSoon,
  stock,
  deliveryScope,
  orderMode,
}) => {
  const { lang, t, tEta } = useLanguage();
  const optimizedUri = useMemo(() => optimizeThumb(imgUri, 320), [imgUri]);
  const imageSource = useMemo(() => (optimizedUri ? { uri: optimizedUri } : null), [optimizedUri]);
  const isPanIndia = deliveryScope === 'PAN_INDIA';
  const isContactOnly = orderMode === 'CONTACT_REQUEST';
  const showInstantEta = !isContactOnly && !isPanIndia && deliveryScope !== 'CUSTOM';
  const backendEta = dataCache.getEstimatedDelivery('20-30 mins');
  const displayEta = lang === 'hi'
    ? tEta(backendEta)
    : backendEta.replace(/minutes/gi, 'MINS').replace(/mins/gi, 'MINS').toUpperCase();

  return (
    <View style={styles.imageBackdrop}>
      {discount > 0 && !isOutOfStock && !isComingSoon && (
        <View style={styles.discountPill}>
          <Text style={styles.discountPillText}>{discount}% {t('off')}</Text>
        </View>
      )}

      {/* Out of Stock / Coming Soon / Low Stock Badge on Media */}
      {isComingSoon ? (
        <View style={styles.soonMediaOverlay}>
          <Feather name="clock" size={9.5} color="#B45309" />
          <Text style={styles.soonMediaOverlayText}>{t('comingSoon', 'COMING SOON')}</Text>
        </View>
      ) : isOutOfStock ? (
        <View style={styles.outOfStockMediaOverlay}>
          <Text style={styles.outOfStockMediaOverlayText}>{t('outOfStock', 'OUT OF STOCK')}</Text>
        </View>
      ) : stock !== undefined && stock > 0 && stock <= 5 ? (
        <View style={styles.lowStockMediaOverlay}>
          <Text style={styles.lowStockMediaOverlayText}>{`⚡ ONLY ${stock} LEFT`}</Text>
        </View>
      ) : null}

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
        <Image
          source={imageSource}
          style={[styles.productImg, (isOutOfStock || isComingSoon) && styles.productImgDimmed]}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : (
        <View style={styles.placeholderWrap}>
          <Feather name="shopping-bag" size={26} color="#94A3B8" />
        </View>
      )}

      {/* Bottom Badge Row: Only Delivery ETA for clean Blinkit/Zepto appearance */}
      <View style={styles.badgeRow}>
        <View style={styles.badgeLeftRow}>
          {showInstantEta ? (
            <View style={styles.deliveryPill}>
              <Feather name="zap" size={8.5} color="#059669" />
              <Text style={styles.deliveryPillText}>{displayEta}</Text>
            </View>
          ) : isPanIndia ? (
            <View style={styles.panIndiaPill}>
              <Feather name="truck" size={8.5} color="#6D28D9" />
              <Text style={styles.panIndiaPillText}>PAN-INDIA</Text>
            </View>
          ) : null}
        </View>
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

  const { t, tProd, lang } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getItemQuantity: getCartItemQty, addToCart: cartAdd, removeFromCart: cartRemove } = useCart();
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  const orderMode = product.orderMode || 'DIRECT_ORDER';
  const isContactOnly = orderMode === 'CONTACT_REQUEST';
  const isBothMode = orderMode === 'BOTH';

  const prodId = String(product.id || (product as any)._id || '');
  const isFav = isFavorite(prodId);

  const isComingSoon = dataCache.isProductComingSoon(product);
  const isOutOfStock = !isComingSoon && dataCache.isProductOutOfStock(product);

  const packOptions = useMemo(() => dataCache.getPackOptions(product), [product]);
  const hasMultiplePacks = packOptions.length > 1;

  // Find which pack/variant is currently added in the cart
  const addedPack = useMemo(() => {
    if (!hasMultiplePacks) return product;
    for (const pack of packOptions) {
      const packId = String(pack.id || product.id);
      if (getCartItemQty(packId, pack.variantId) > 0) {
        return pack;
      }
    }
    return packOptions[0] || product;
  }, [hasMultiplePacks, packOptions, product, getCartItemQty]);

  const price = Number(product.price || (product.variants && product.variants[0]?.price) || 0);
  const mrp = Number(product.mrp || (product.variants && product.variants[0]?.mrp) || price);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const unit = product.unit || (product.variants && product.variants[0]?.unit) || '1 unit';
  const imgUri = product.imageUrl || product.image || (product.images && product.images[0]);
  const minOrderQty = Math.max(1, Number(product.minOrderQty) || 1);

  const handleAddPress = () => {
    if (hasMultiplePacks) {
      setPackModalOpen(true);
    } else {
      onAdd(product);
    }
  };

  const handleStepperPress = () => {
    if (hasMultiplePacks) {
      setPackModalOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.productCell, { width }]}
        activeOpacity={0.92}
        onPress={() => onPress(product.id)}
      >
        {/* Product Image Media Container */}
        <ProductMedia
          imgUri={imgUri}
          discount={discount}
          isFav={isFav}
          onToggleFav={() => toggleFavorite(product)}
          isOutOfStock={isOutOfStock}
          isComingSoon={isComingSoon}
          stock={addedPack?.stock !== undefined ? Number(addedPack.stock) : (product.stock !== undefined ? Number(product.stock) : undefined)}
          deliveryScope={product.deliveryScope}
          orderMode={product.orderMode}
        />

        {/* Product Details with Subtle Line Card Outline */}
        <View style={styles.productMeta}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {tProd(product)}
          </Text>
          <View style={styles.unitMetaRow}>
            <Text style={styles.productUnitText} numberOfLines={1}>
              {unit}
              {hasMultiplePacks ? (
                <Text style={{ color: Colors.primaryDark, fontWeight: '700' }}> · {packOptions.length} {lang === 'hi' ? 'साइज़' : 'options'}</Text>
              ) : null}
            </Text>
            {minOrderQty > 1 && (
              <View style={styles.minOrderPill}>
                <Text style={styles.minOrderPillText}>Min {minOrderQty}</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.currentPrice}>₹{price}</Text>
              {discount > 0 && <Text style={styles.strikethroughPrice}>₹{mrp}</Text>}
            </View>

            {isOutOfStock ? (
              <View style={styles.outOfStockPill}>
                <Text style={styles.outOfStockPillText}>{t('outOfStock', 'OUT OF STOCK')}</Text>
              </View>
            ) : isComingSoon ? (
              <View style={styles.comingSoonPill}>
                <Feather name="clock" size={10.5} color="#B45309" style={{ marginRight: 3 }} />
                <Text style={styles.comingSoonPillText}>{t('soon', 'SOON')}</Text>
              </View>
            ) : isContactOnly ? (
              <TouchableOpacity
                style={styles.enquireBtnPill}
                activeOpacity={0.8}
                onPress={() => setEnquiryModalOpen(true)}
              >
                <Feather name="phone-call" size={11.5} color="#059669" style={{ marginRight: 3.5 }} />
                <Text style={styles.enquireBtnPillText}>{lang === 'hi' ? 'पूछताछ' : 'Enquire'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isBothMode && (
                  <TouchableOpacity
                    style={styles.enquireIconBtn}
                    activeOpacity={0.8}
                    onPress={() => setEnquiryModalOpen(true)}
                  >
                    <Feather name="phone-call" size={12} color="#059669" />
                  </TouchableOpacity>
                )}
                {quantity === 0 ? (
                  <TouchableOpacity
                    style={styles.addBtnPill}
                    activeOpacity={0.8}
                    onPress={handleAddPress}
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
                      onPress={() => {
                        if (hasMultiplePacks && addedPack) {
                          cartRemove(String(addedPack.id || product.id), addedPack.variantId);
                        } else {
                          onRemove(product.id);
                        }
                      }}
                    >
                      <Feather name="minus" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyTouch}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={() => {
                        if (hasMultiplePacks && addedPack) {
                          cartAdd(addedPack, addedPack.variantId);
                        } else {
                          onAdd(product);
                        }
                      }}
                    >
                      <Feather name="plus" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Multiple Pack/Unit Choice Modal (Backend Connected) */}
      {hasMultiplePacks && packModalOpen && (
        <Modal
          visible={packModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPackModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.packModalBackdrop}
            activeOpacity={1}
            onPress={() => setPackModalOpen(false)}
          >
            <TouchableOpacity
              style={styles.packModalSheet}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.packModalHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.packModalTitle} numberOfLines={1}>
                    {tProd(product)}
                  </Text>
                  <Text style={styles.packModalSub}>
                    {lang === 'hi' ? 'उपलब्ध पैक और यूनिट चुनें' : 'Select available pack size & unit'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPackModalOpen(false)}
                  style={styles.packModalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={19} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {packOptions.map((pack: any, pIdx: number) => {
                  const packId = String(pack.id || product.id);
                  const pQty = getCartItemQty(packId, pack.variantId);
                  const pPrice = Number(pack.price || 0);
                  const pMrp = Number(pack.mrp || pPrice);
                  const pDiscount = pMrp > pPrice ? Math.round(((pMrp - pPrice) / pMrp) * 100) : 0;
                  const pOos = dataCache.isProductOutOfStock(pack, pack.stock);

                  return (
                    <View
                      key={String(pack.id || pack.variantId || pIdx)}
                      style={[
                        styles.packOptionRow,
                        pIdx === packOptions.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.packOptionUnit}>{pack.unit || '1 unit'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                          <Text style={styles.packOptionPrice}>₹{pPrice}</Text>
                          {pDiscount > 0 && (
                            <>
                              <Text style={styles.packOptionMrp}>₹{pMrp}</Text>
                              <View style={styles.packOptionDiscountBadge}>
                                <Text style={styles.packOptionDiscountText}>{pDiscount}% OFF</Text>
                              </View>
                            </>
                          )}
                        </View>
                        {pOos && (
                          <Text style={styles.packOptionOosText}>{t('outOfStock', 'Out of stock')}</Text>
                        )}
                      </View>

                      {pOos ? (
                        <View style={styles.packOptionOosPill}>
                          <Text style={styles.packOptionOosPillText}>{t('outOfStock', 'OOS')}</Text>
                        </View>
                      ) : pQty === 0 ? (
                        <TouchableOpacity
                          style={styles.packOptionAddBtn}
                          activeOpacity={0.8}
                          onPress={() => cartAdd(pack, pack.variantId)}
                        >
                          <Text style={styles.packOptionAddBtnText}>{t('add', 'ADD')} +</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.packOptionStepper}>
                          <TouchableOpacity
                            style={styles.packOptionStepperTouch}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            onPress={() => cartRemove(packId, pack.variantId)}
                          >
                            <Feather name="minus" size={13} color="#FFFFFF" />
                          </TouchableOpacity>
                          <Text style={styles.packOptionStepperVal}>{pQty}</Text>
                          <TouchableOpacity
                            style={styles.packOptionStepperTouch}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            onPress={() => cartAdd(pack, pack.variantId)}
                          >
                            <Feather name="plus" size={13} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.packModalDoneBtn}
                activeOpacity={0.85}
                onPress={() => setPackModalOpen(false)}
              >
                <Text style={styles.packModalDoneBtnText}>{t('done', 'Done')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Product Enquiry Modal */}
      {enquiryModalOpen && (
        <ProductEnquiryModal
          visible={enquiryModalOpen}
          product={product}
          onClose={() => setEnquiryModalOpen(false)}
        />
      )}
    </>
  );
}, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.quantity === next.quantity &&
    prev.width === next.width &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.status === next.product.status &&
    (prev.product as any).isSoon === (next.product as any).isSoon &&
    (prev.product as any).comingSoon === (next.product as any).comingSoon &&
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
    overflow: 'hidden',
  },
  badgeLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
    marginRight: 4,
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
  panIndiaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#DDD6FE',
  },
  panIndiaPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6D28D9',
    marginLeft: 2,
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
    height: 30,
  },
  productUnitText: {
    fontSize: 10.5,
    color: '#64748B',
    flex: 1,
    marginRight: 4,
  },
  unitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 18,
    marginTop: 2,
    overflow: 'hidden',
  },
  minOrderPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0.8,
    borderColor: '#FCD34D',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3.5,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minOrderPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#92400E',
    includeFontPadding: false,
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
  enquireBtnPill: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  enquireBtnPillText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '700',
  },
  enquireIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
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
  productImgDimmed: {
    opacity: 0.72,
  },
  soonMediaOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 243, 199, 0.96)',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 3,
  },
  soonMediaOverlayText: {
    color: '#B45309',
    fontSize: 8.5,
    fontWeight: '800',
    marginLeft: 3,
  },
  outOfStockMediaOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(241, 245, 249, 0.96)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 3,
  },
  outOfStockMediaOverlayText: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
  },
  lowStockMediaOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 3,
  },
  lowStockMediaOverlayText: {
    color: '#B45309',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  outOfStockPill: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  outOfStockPillText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '800',
  },
  comingSoonPill: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  comingSoonPillText: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '800',
  },
  // --- Pack Modal Styles ---
  packModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  packModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  packModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  packModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  packModalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  packModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  packOptionUnit: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  packOptionPrice: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  packOptionMrp: {
    fontSize: 11.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  packOptionDiscountBadge: {
    marginLeft: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  packOptionDiscountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  packOptionOosText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
  packOptionOosPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  packOptionOosPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  packOptionAddBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  packOptionAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  packOptionStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 4,
  },
  packOptionStepperTouch: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packOptionStepperVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 18,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  packModalDoneBtn: {
    marginTop: 14,
    backgroundColor: '#059669',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packModalDoneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
