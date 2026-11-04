import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Alert,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Product, ProductVariant } from '../../types';
import { Skeleton } from '../../components/common/Skeleton';
import { ProductCard, ProductEnquiryModal } from '../../components/customer';
import { useFavorites } from '../../context/FavoritesContext';
import { dataCache } from '../../services/dataCache';
import {
  parseProductDetails,
  getDietaryInfo,
  ParsedProductDetails,
  DietaryInfo,
} from '../../utils/productDetails';

const { width } = Dimensions.get('window');

function optimizeImg(url?: string | null, targetWidth = 600): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/') && !trimmed.includes('w_')) {
    return trimmed.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto/`);
  }
  return trimmed;
}

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { addToCart, removeFromCart, getItemQuantity } = useCart();
  const { user } = useAuth();
  const { notify } = useToast();
  const { lang, t, tProd, tCat, tText, prefetchTranslations } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantsList, setVariantsList] = useState<ProductVariant[]>([]);
  const [activeImgIndex, setActiveImgIndex] = useState<number>(0);
  const { isFavorite, toggleFavorite: ctxToggleFavorite } = useFavorites();
  const isFav = isFavorite(productId);
  const [loading, setLoading] = useState<boolean>(true);
  const [myRating, setMyRating] = useState<number>(5);
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState<boolean>(false);

  // Dynamic delivery config from backend
  const [deliveryEta, setDeliveryEta] = useState<string>('15-20 mins');

  // Related products from backend
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // 1. Fetch dynamic product data, delivery rules & user favorites
  const loadProductData = useCallback(async () => {
    try {
      const [prodRes, deliveryRes] = await Promise.allSettled([
        api.getProduct(productId),
        api.getDelivery(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        const prodData: Product = prodRes.value.data;
        setProduct(prodData);
        if (prodData) {
          prefetchTranslations([prodData.name, prodData.categoryName, prodData.description].filter(Boolean));
        }

        // Set user's existing rating if available
        if (prodData.rating != null && Number(prodData.rating) > 0) {
          setMyRating(Math.round(Number(prodData.rating)));
        }

        // Fetch related products and sibling pack variants from same category
        const catSlug = prodData.categorySlug || (typeof prodData.category === 'string' ? prodData.category : prodData.category?.slug);
        if (catSlug) {
          api.getProducts({ category: catSlug, limit: 12 })
            .then(res => {
              if (res.data && Array.isArray(res.data)) {
                const list = res.data;
                // Similar products excluding current product
                setRelatedProducts(list.filter(p => p.id !== prodData.id).slice(0, 8));
                prefetchTranslations(list.map((p: any) => p.name));

                // If backend product didn't have explicit variants array,
                // check if other products share the same variantGroupId
                if ((!prodData.variants || prodData.variants.length === 0) && (prodData as any).variantGroupId) {
                  const siblingPacks = list.filter((p: any) => p.variantGroupId === (prodData as any).variantGroupId);
                  if (siblingPacks.length > 1) {
                    const formattedVariants: ProductVariant[] = siblingPacks.map(p => ({
                      id: p.id,
                      name: p.name,
                      unit: p.unit,
                      price: p.price || 0,
                      mrp: p.mrp || p.price,
                      stock: p.stock !== undefined ? Number(p.stock) : 0,
                    }));
                    setVariantsList(formattedVariants);
                    const currentVariant = formattedVariants.find(v => v.id === prodData.id) || formattedVariants[0];
                    setSelectedVariant(currentVariant);
                    return;
                  }
                }
              }
            })
            .catch(() => {});
        }

        if (prodData.variants && prodData.variants.length > 0) {
          setVariantsList(prodData.variants);
          setSelectedVariant(prodData.variants[0]);
        }
      }

      if (deliveryRes.status === 'fulfilled' && deliveryRes.value?.data) {
        const dPayload = deliveryRes.value.data;
        dataCache.setDeliveryData(dPayload);
        const eta = dPayload.settings?.estimatedDelivery || dPayload.estimatedDelivery || dataCache.getEstimatedDelivery('20-30 mins');
        setDeliveryEta(eta);
      }
    } catch (err: any) {
      notify(err.message || 'Could not load product details', 'error');
    } finally {
      setLoading(false);
    }
  }, [productId, notify]);

  // 2. Fetch favorite status for logged-in user
  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} on R2Cart Hathua! Delivered fresh in ${deliveryEta}.`,
      });
    } catch {}
  };

  const toggleFavorite = async () => {
    if (product) {
      await ctxToggleFavorite(product);
    } else {
      await ctxToggleFavorite(productId);
    }
  };

  const handleRateProduct = async (stars: number) => {
    if (submittingRating) return;
    setMyRating(stars);
    setSubmittingRating(true);

    try {
      await api.rateProduct(productId, stars);
      notify(`Thank You! You rated this item ${stars} stars.`, 'success');
      const updated = await api.getProduct(productId);
      if (updated.data) setProduct(updated.data);
    } catch (err: any) {
      notify(err.message || 'Could not submit rating', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Gallery images from backend - MUST be called unconditionally before any early returns!
  const gallery: string[] = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    const rawImages = (product as any)?.images;
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      for (const img of rawImages) {
        if (typeof img === 'string') list.push(img);
        else if (img && typeof img === 'object' && (img as any).url) list.push((img as any).url);
      }
    }
    if (product.imageUrl && !list.includes(product.imageUrl)) list.unshift(product.imageUrl);
    if (product.image && !list.includes(product.image)) list.unshift(product.image);
    return list.filter(Boolean);
  }, [product]);

  // Parse structured specifications from backend description unconditionally
  const details = useMemo(() => {
    return parseProductDetails(product?.description, product);
  }, [product?.description, product]);

  const dietInfo = useMemo(() => {
    return getDietaryInfo(product, details);
  }, [product, details]);

  const minOrderQty = Math.max(1, Number(product?.minOrderQty) || 1);

  const price = selectedVariant ? Number(selectedVariant.price) : Number(product?.price || 0);
  const mrp = selectedVariant
    ? Number(selectedVariant.mrp || selectedVariant.price)
    : Number(product?.mrp || price);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const unit = selectedVariant
    ? (selectedVariant.unit || selectedVariant.weight || selectedVariant.name)
    : (product?.unit || '1 unit');
  const qty = product ? getItemQuantity(product.id, selectedVariant?.id) : 0;

  const activeImage = gallery[activeImgIndex] || gallery[0] || null;

  // Real stock from backend & Coming Soon status
  const isComingSoon = dataCache.isProductComingSoon(product);
  const stock =
    selectedVariant?.stock !== undefined
      ? Number(selectedVariant.stock)
      : product?.stock !== undefined
      ? Number(product.stock)
      : 0;
  const isOutOfStock = !isComingSoon && dataCache.isProductOutOfStock(product, selectedVariant?.stock);
  const hasNutrition = Boolean(
    details.nutrition &&
    (details.nutrition.energy ||
      details.nutrition.protein ||
      details.nutrition.carbs ||
      details.nutrition.totalSugars ||
      details.nutrition.fat)
  );

  if (loading || !product) {
    return (
      <View style={[styles.container, { padding: 16, paddingTop: insets.top + 16 }]}>
        <Skeleton width="100%" height={280} borderRadius={24} />
        <View style={{ marginTop: 20 }}>
          <Skeleton width={130} height={24} borderRadius={12} />
          <Skeleton width="85%" height={22} borderRadius={6} style={{ marginTop: 12 }} />
          <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Skeleton width={110} height={26} borderRadius={6} />
            <Skeleton width={90} height={36} borderRadius={10} />
          </View>
          <View style={{ marginTop: 24 }}>
            <Skeleton width="100%" height={40} borderRadius={10} />
            <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 16 }} />
            <Skeleton width="75%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Product Image (Frameless - Image has rounded corners, no card box) */}
        <View style={styles.imageStage}>
          <View style={styles.imageWrap}>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            )}

            <View style={styles.floatingActionRow}>
              <TouchableOpacity
                style={[
                  styles.actionCircle,
                  isFav && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                ]}
                onPress={toggleFavorite}
                activeOpacity={0.7}
              >
                {isFav ? (
                  <FontAwesome name="heart" size={17} color="#EF4444" />
                ) : (
                  <FontAwesome name="heart-o" size={17} color="#0F172A" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCircle}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={17} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {activeImage ? (
              <Image
                source={{ uri: optimizeImg(activeImage, 600) }}
                style={styles.productImg}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imgPlaceholder}>
                <Feather name="shopping-bag" size={54} color="#CBD5E1" />
              </View>
            )}
          </View>

          {/* Gallery Thumbnails if product has multiple photos */}
          {gallery.length > 1 && (
            <View style={styles.thumbnailRow}>
              {gallery.map((imgUri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.thumbnailWrap,
                    idx === activeImgIndex && styles.thumbnailWrapActive,
                  ]}
                  onPress={() => setActiveImgIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: optimizeImg(imgUri, 160) }} style={styles.thumbnailImg} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Product Details Header Card */}
        <View style={styles.detailSection}>
          <View style={styles.badgeTopRow}>
            {dietInfo && (
              <View style={[styles.dietaryPill, { backgroundColor: dietInfo.bgColor, borderColor: dietInfo.borderColor }]}>
                <View style={[styles.dietaryDot, { backgroundColor: dietInfo.dotColor }]} />
                <Text style={[styles.dietaryText, { color: dietInfo.textColor }]}>{dietInfo.label}</Text>
              </View>
            )}

            {product.orderMode !== 'CONTACT_REQUEST' && product.deliveryScope !== 'PAN_INDIA' && (
              <View style={styles.etaPill}>
                <Feather name="zap" size={12} color={Colors.primaryDark} style={{ marginRight: 4 }} />
                <Text style={styles.etaText}>{t('deliveryIn', 'Delivery in')} {deliveryEta}</Text>
              </View>
            )}
            {product.deliveryScope === 'PAN_INDIA' && (
              <View style={[styles.etaPill, styles.panIndiaPill]}>
                <Feather name="truck" size={12} color="#6D28D9" style={{ marginRight: 4 }} />
                <Text style={[styles.etaText, { color: '#6D28D9' }]}>
                  {lang === 'hi' ? 'अखिल भारतीय डिलीवरी (5-10 दिन)' : 'Pan-India Delivery (5-10 Days)'}
                </Text>
              </View>
            )}

            {product.rating != null && Number(product.rating) > 0 ? (
              <View style={styles.ratingBadge}>
                <Feather name="star" size={11} color="#047857" style={{ marginRight: 3 }} />
                <Text style={styles.ratingVal}>{Number(product.rating).toFixed(1)}</Text>
                {product.ratingCount ? (
                  <Text style={styles.ratingCount}> ({product.ratingCount})</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Brand & Category Breadcrumb */}
          {(details.brand || product.categoryName) && (
            <View style={styles.categoryTagRow}>
              {details.brand ? (
                <Text style={styles.brandText}>{details.brand}</Text>
              ) : null}
              {product.categoryName ? (
                <Text style={styles.categoryBadgeText}>
                  {details.brand ? ' - ' : ''}{tCat(product.categoryName)}
                </Text>
              ) : null}
            </View>
          )}

          <Text style={styles.titleText}>{tProd(product)}</Text>
          <View style={styles.unitMetaRow}>
            <Text style={styles.unitText}>{unit}</Text>
            {minOrderQty > 1 && (
              <View style={styles.minOrderPill}>
                <Text style={styles.minOrderPillText}>Min Order: {minOrderQty}</Text>
              </View>
            )}
          </View>

          {/* Price, MRP & Savings Row */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₹{price}</Text>
            {discount > 0 && <Text style={styles.mrpPrice}>₹{mrp}</Text>}
            {discount > 0 && (
              <View style={styles.savingsPill}>
                <Text style={styles.savingsText}>{t('save', 'Save')} ₹{mrp - price}</Text>
              </View>
            )}
            {isComingSoon && (
              <View style={styles.comingSoonBadge}>
                <Feather name="clock" size={11} color="#B45309" style={{ marginRight: 4 }} />
                <Text style={styles.comingSoonBadgeText}>{t('comingSoon', 'COMING SOON')}</Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>{t('outOfStock', 'OUT OF STOCK')}</Text>
              </View>
            )}
          </View>

          {stock > 0 && stock <= 5 && (
            <Text style={styles.lowStockWarning}>⚡ Only {stock} left in stock - order soon!</Text>
          )}
        </View>

        {/* Pack Size / Variant Selector (Real Backend Data) */}
        {variantsList.length > 1 && (
          <View style={styles.fluidSection}>
            <Text style={styles.sectionHeading}>{t('selectPackSize', 'Select Pack Size')}</Text>
            <View style={styles.variantChipsWrap}>
              {variantsList.map((v, vIdx) => {
                const isSelected = selectedVariant?.id === v.id;
                return (
                  <TouchableOpacity
                    key={`${v.id || 'var'}_${vIdx}`}
                    style={[styles.variantChip, isSelected && styles.variantChipActive]}
                    onPress={() => setSelectedVariant(v)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.variantChipUnit, isSelected && styles.variantChipUnitActive]}>
                      {v.unit || v.weight || v.name}
                    </Text>
                    <Text style={[styles.variantChipPrice, isSelected && styles.variantChipPriceActive]}>
                      ₹{v.price}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Quality Guarantee Banner */}
        <View style={styles.guaranteeBanner}>
          <Feather name="shield" size={22} color={Colors.primaryDark} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>R2Cart {t('freshnessGuarantee', 'Freshness Guarantee')}</Text>
            <Text style={styles.guaranteeSub}>
              {t('freshnessSub', 'Quality checked at our Hathua sorting facility. 100% replacement guarantee if not completely satisfied.')}
            </Text>
          </View>
        </View>

        {/* Product Details & Specifications (Real Backend Data) */}
        <View style={styles.fluidSection}>
          <Text style={styles.sectionHeading}>{t('productDetails', 'Product Details')}</Text>
          {details.summary ? (
            <Text style={styles.descText}>{tText(details.summary)}</Text>
          ) : (
            <Text style={styles.descText}>
              {tText(product.description || 'Fresh daily essential delivered straight to your doorstep in Hathua.')}
            </Text>
          )}

          {/* Clean Specification Table (No UI overflow) */}
          <View style={styles.specTable}>
            {details.brand ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Brand</Text>
                <Text style={styles.specVal}>{details.brand}</Text>
              </View>
            ) : null}

            {details.productType ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Product Type</Text>
                <Text style={styles.specVal}>{details.productType}</Text>
              </View>
            ) : null}

            {dietInfo ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Dietary</Text>
                <View style={[styles.dietaryPill, { backgroundColor: dietInfo.bgColor, borderColor: dietInfo.borderColor }]}>
                  <View style={[styles.dietaryDot, { backgroundColor: dietInfo.dotColor }]} />
                  <Text style={[styles.dietaryText, { color: dietInfo.textColor }]}>{dietInfo.label}</Text>
                </View>
              </View>
            ) : null}

            {details.flavour ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Flavour / Variant</Text>
                <Text style={styles.specVal}>{details.flavour}</Text>
              </View>
            ) : null}

            {details.itemForm ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Item Form</Text>
                <Text style={styles.specVal}>{details.itemForm}</Text>
              </View>
            ) : null}

            {details.weight ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Net Weight</Text>
                <Text style={styles.specVal}>{details.weight}</Text>
              </View>
            ) : null}

            {details.packagingType ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Packaging Type</Text>
                <Text style={styles.specVal}>{details.packagingType}</Text>
              </View>
            ) : null}

            {details.shelfLife ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Shelf Life</Text>
                <Text style={styles.specVal}>{details.shelfLife}</Text>
              </View>
            ) : null}

            {details.countryOfOrigin ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Origin</Text>
                <Text style={styles.specVal}>{details.countryOfOrigin}</Text>
              </View>
            ) : null}

            {details.storage ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Storage</Text>
                <Text style={styles.specVal}>{details.storage}</Text>
              </View>
            ) : null}

            {details.ingredients ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Ingredients</Text>
                <Text style={styles.specVal}>{details.ingredients}</Text>
              </View>
            ) : null}

            {details.allergens ? (
              <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.specLabel}>Allergens</Text>
                <Text style={styles.specVal}>{details.allergens}</Text>
              </View>
            ) : null}
          </View>

          {/* Key Features Bullet List */}
          {details.keyFeatures.length > 0 && (
            <View style={styles.keyFeaturesWrap}>
              <Text style={styles.subHeading}>Key Highlights</Text>
              {details.keyFeatures.map((feat, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{feat}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Nutrition Table if present */}
          {hasNutrition && (
            <View style={styles.nutritionWrap}>
              <View style={styles.nutritionHeader}>
                <Text style={styles.subHeading}>Nutrition Information</Text>
                {details.nutrition?.servingSize ? (
                  <Text style={styles.servingSizeText}>{details.nutrition.servingSize}</Text>
                ) : null}
              </View>
              <View style={styles.nutritionGrid}>
                {details.nutrition?.energy ? (
                  <View style={styles.nutritionCell}>
                    <Text style={styles.nutritionVal}>{details.nutrition.energy}</Text>
                    <Text style={styles.nutritionLabel}>Energy</Text>
                  </View>
                ) : null}
                {details.nutrition?.protein ? (
                  <View style={styles.nutritionCell}>
                    <Text style={styles.nutritionVal}>{details.nutrition.protein}</Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                ) : null}
                {details.nutrition?.carbs ? (
                  <View style={styles.nutritionCell}>
                    <Text style={styles.nutritionVal}>{details.nutrition.carbs}</Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                ) : null}
                {details.nutrition?.totalSugars ? (
                  <View style={styles.nutritionCell}>
                    <Text style={styles.nutritionVal}>{details.nutrition.totalSugars}</Text>
                    <Text style={styles.nutritionLabel}>Sugars</Text>
                  </View>
                ) : null}
                {details.nutrition?.fat ? (
                  <View style={styles.nutritionCell}>
                    <Text style={styles.nutritionVal}>{details.nutrition.fat}</Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </View>

        {/* Rating Section (Backend Connected) */}
        <View style={styles.fluidSection}>
          <Text style={styles.sectionHeading}>Rate this Product</Text>
          <Text style={styles.ratingSubText}>How satisfied are you with this product?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRateProduct(star)}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Feather
                  name="star"
                  size={28}
                  color={star <= myRating ? '#F59E0B' : '#E2E8F0'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Similar Products Rail (Backend Connected) */}
        {relatedProducts.length > 0 && (
          <View style={styles.similarProductsSection}>
            <Text style={styles.sectionHeading}>Similar Products</Text>
            <FlatList
              horizontal
              data={relatedProducts}
              keyExtractor={(item, idx) => `${item.id || 'rel'}_${idx}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  width={150}
                  quantity={getItemQuantity(item.id)}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onPress={(id) => navigation.push('ProductDetail', { productId: id })}
                />
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar with Safe Inset */}
      <View style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.bottomBarPriceCol}>
          <Text style={styles.barPrice}>₹{price}</Text>
          <Text style={styles.barUnit}>{unit}</Text>
        </View>

        {isComingSoon ? (
          <View style={styles.comingSoonBottomBtn}>
            <Feather name="clock" size={16} color="#B45309" style={{ marginRight: 6 }} />
            <Text style={styles.comingSoonBottomBtnText}>{t('comingSoon', 'Coming Soon')}</Text>
          </View>
        ) : isOutOfStock ? (
          <View style={styles.outOfStockBtn}>
            <Text style={styles.outOfStockBtnText}>{t('outOfStock', 'Out of Stock')}</Text>
          </View>
        ) : product.orderMode === 'CONTACT_REQUEST' ? (
          <TouchableOpacity
            style={styles.bigEnquireBtn}
            activeOpacity={0.85}
            onPress={() => setEnquiryModalOpen(true)}
          >
            <Feather name="phone-call" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.bigEnquireBtnText}>
              {lang === 'hi' ? 'कॉल / कोट का अनुरोध करें' : 'Request Call / Custom Quote'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {product.orderMode === 'BOTH' && (
              <TouchableOpacity
                style={styles.secondaryEnquireBtn}
                activeOpacity={0.85}
                onPress={() => setEnquiryModalOpen(true)}
              >
                <Feather name="phone-call" size={14} color="#059669" style={{ marginRight: 5 }} />
                <Text style={styles.secondaryEnquireBtnText}>
                  {lang === 'hi' ? 'पूछताछ' : 'Enquire'}
                </Text>
              </TouchableOpacity>
            )}
            {qty === 0 ? (
              <TouchableOpacity
                style={styles.bigAddBtn}
                activeOpacity={0.85}
                onPress={() => addToCart(product, selectedVariant?.id)}
              >
                <Feather name="shopping-bag" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.bigAddBtnText}>{t('addToBasket', 'Add to Basket')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.bigQtyControl}>
                <TouchableOpacity
                  style={styles.bigQtyTouch}
                  onPress={() => removeFromCart(product.id, selectedVariant?.id)}
                >
                  <Feather name="minus" size={14} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.bigQtyNum}>{qty}</Text>
                <TouchableOpacity
                  style={styles.bigQtyTouch}
                  onPress={() => addToCart(product, selectedVariant?.id)}
                >
                  <Feather name="plus" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Product Enquiry Modal */}
      <ProductEnquiryModal
        visible={enquiryModalOpen}
        product={product}
        onClose={() => setEnquiryModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    padding: 12,
  },
  imageStage: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  imageWrap: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  productImg: {
    width: '94%',
    height: '94%',
    borderRadius: 24,
  },
  imgPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  thumbnailWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAF9',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailWrapActive: {
    borderColor: Colors.primary,
    backgroundColor: '#ECFDF5',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    zIndex: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  floatingActionRow: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
    zIndex: 2,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  ratingCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  categoryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  categoryBadgeText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  unitText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  unitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  minOrderPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  minOrderPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  mrpPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  comingSoonBadgeText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 10,
  },
  outOfStockBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  outOfStockText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 10,
  },
  lowStockWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 6,
  },
  fluidSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  variantChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
  },
  variantChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  variantChipUnit: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  variantChipUnitActive: {
    color: Colors.primaryDark,
  },
  variantChipPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  variantChipPriceActive: {
    color: Colors.primaryDark,
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  guaranteeSub: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  descText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
  },
  specTable: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  specLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    width: 95,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    flexWrap: 'wrap',
  },
  dietaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  dietaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dietaryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nutritionWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servingSizeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionCell: {
    flex: 1,
    minWidth: 68,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nutritionVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  nutritionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  keyFeaturesWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  subHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 13,
    color: Colors.primaryDark,
    marginRight: 6,
    lineHeight: 17,
  },
  bulletText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    flex: 1,
  },
  ratingSubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  similarProductsSection: {
    marginBottom: 16,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  bottomBarPriceCol: {
    justifyContent: 'center',
  },
  barPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  barUnit: {
    fontSize: 11,
    color: '#64748B',
  },
  bigAddBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  bigAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  bigEnquireBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bigEnquireBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  secondaryEnquireBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9.5,
    borderRadius: 10,
  },
  secondaryEnquireBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12.5,
  },
  panIndiaPill: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  comingSoonBottomBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  comingSoonBottomBtnText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 13,
  },
  outOfStockBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  outOfStockBtnText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 13,
  },
  bigQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 4,
  },
  bigQtyTouch: {
    width: 30,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigQtyNum: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 10,
  },
});
