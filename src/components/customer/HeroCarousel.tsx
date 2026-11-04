import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Banner } from '../../types';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;

interface HeroCarouselProps {
  banners: Banner[];
  onBannerPress: (banner: Banner) => void;
}

const DEFAULT_WEBSITE_HERO = [
  {
    id: 'hero-default-1',
    bg: '#064E3B',
    isCream: false,
    kicker: 'R2CART FRESH',
    heading: 'Daily Needs,\nDelivered Fresh.',
    subtitle: 'Farm-fresh veggies & groceries in Hathua',
    ctaText: 'Shop now',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop&q=80',
    secondaryImage: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80',
    stickerBold: 'Fresh',
    stickerSmall: 'daily',
  },
  {
    id: 'hero-default-2',
    bg: '#FEF3C7',
    isCream: true,
    kicker: 'MORNING ESSENTIALS',
    heading: 'Mornings made\ndelicious.',
    subtitle: 'Milk, bread, eggs & butter in 15 mins',
    ctaText: 'Order now',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    secondaryImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
    stickerBold: '15 Min',
    stickerSmall: 'delivery',
  },
];

function optimizeThumb(url?: string | null, targetWidth = 500): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/') && !trimmed.includes('w_')) {
    return trimmed.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto/`);
  }
  return trimmed;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = React.memo(({
  banners,
  onBannerPress,
}) => {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const scrollRef = useRef<FlatList>(null);
  const timerRef = useRef<any>(null);

  // Dynamic hero slides strictly from backend banners
  const heroSlides = React.useMemo(() => {
    return Array.isArray(banners) ? banners : [];
  }, [banners]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % heroSlides.length;
        scrollRef.current?.scrollToIndex({
          index: next,
          animated: true,
        });
        return next;
      });
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroSlides.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (BANNER_WIDTH + 12));
    if (idx >= 0 && idx < heroSlides.length && idx !== activeIdx) {
      setActiveIdx(idx);
    }
  };

  if (!heroSlides || heroSlides.length === 0) return null;

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={scrollRef}
        data={heroSlides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.bannerList}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH + 12,
          offset: (BANNER_WIDTH + 12) * index,
          index,
        })}
        keyExtractor={(item, i) => item.id || `hero_${i}`}
        renderItem={({ item, index }) => {
          const isCream = item.isCream !== undefined ? Boolean(item.isCream) : index % 2 === 1;
          const kicker = item.kicker || 'R2CART FRESH';
          const heading = item.heading || item.title || 'Daily Needs, Delivered Fresh';
          const subtitle = item.subtitle || item.description || '';
          const cta = item.ctaText || 'Shop now';
          const mainImg = item.image || item.imageUrl || '';
          const secImg = item.secondaryImage || '';
          const stickerBold = item.stickerBold || (isCream ? '15 Min' : 'Fresh');
          const stickerSmall = item.stickerSmall || (isCream ? 'delivery' : 'daily');
          const customBg = item.bg || item.backgroundColor;

          return (
            <TouchableOpacity
              style={[
                styles.heroCard,
                isCream ? styles.heroCream : styles.heroGreen,
                customBg ? { backgroundColor: customBg } : null,
              ]}
              activeOpacity={0.92}
              onPress={() => onBannerPress(item)}
            >
              {/* Decorative Rings */}
              <View style={[styles.ringLarge, isCream && styles.ringCream]} />
              <View style={[styles.ringSmall, isCream && styles.ringCream]} />

              {/* Left Column: Compact Copy & Action */}
              <View style={styles.heroCopy}>
                <View style={[styles.kickerBadge, isCream ? styles.kickerCream : styles.kickerGreen]}>
                  <Feather
                    name="sparkles"
                    size={9.5}
                    color={isCream ? '#047857' : '#A7F3D0'}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.kickerText, isCream ? styles.kickerTextCream : styles.kickerTextGreen]}>
                    {kicker}
                  </Text>
                </View>

                <Text
                  style={[styles.heroHeading, isCream ? styles.headingCream : styles.headingGreen]}
                  numberOfLines={2}
                >
                  {heading}
                </Text>

                {subtitle ? (
                  <Text
                    style={[styles.heroSubtitle, isCream ? styles.subtitleCream : styles.subtitleGreen]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}

                <View style={styles.ctaRow}>
                  <View style={[styles.heroCtaBtn, isCream ? styles.ctaBtnCream : styles.ctaBtnGreen]}>
                    <Text style={[styles.heroCtaText, isCream ? styles.ctaTextCream : styles.ctaTextGreen]}>
                      {cta}
                    </Text>
                    <View style={styles.ctaIconCircle}>
                      <Feather name="arrow-right" size={10.5} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </View>

              {/* Right Column: Compact Visual */}
              <View style={styles.heroVisual}>
                {mainImg ? (
                  <View style={styles.mainPhotoWrap}>
                    <Image source={{ uri: optimizeThumb(mainImg, 450) }} style={styles.mainPhotoImg} resizeMode="cover" />
                  </View>
                ) : null}

                {secImg ? (
                  <View style={styles.floatingProduct}>
                    <Image source={{ uri: optimizeThumb(secImg, 250) }} style={styles.floatingProductImg} resizeMode="cover" />
                  </View>
                ) : null}

                <View style={styles.offerSticker}>
                  <Text style={styles.offerStickerBold}>{stickerBold}</Text>
                  <Text style={styles.offerStickerSmall}>{stickerSmall}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Exactly 2 dots matching top 2 hero banners */}
      <View style={styles.dotsRow}>
        {heroSlides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              activeIdx === i ? styles.activeDot : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  carouselContainer: {
    marginTop: 10,
  },
  bannerList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  // Compact Hero Card (~150px height)
  heroCard: {
    width: BANNER_WIDTH,
    height: 152,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroGreen: {
    backgroundColor: '#064E3B',
  },
  heroCream: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ringLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    right: -30,
    top: -50,
  },
  ringSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    right: 60,
    bottom: -40,
  },
  ringCream: {
    borderColor: 'rgba(180, 123, 20, 0.1)',
  },
  heroCopy: {
    width: '63%',
    paddingRight: 6,
    zIndex: 3,
  },
  kickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    marginBottom: 4,
  },
  kickerGreen: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  kickerCream: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  kickerText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kickerTextGreen: {
    color: '#A7F3D0',
  },
  kickerTextCream: {
    color: '#047857',
  },
  heroHeading: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 19,
    letterSpacing: -0.4,
  },
  headingGreen: {
    color: '#FFFFFF',
  },
  headingCream: {
    color: '#1C1C1E',
  },
  heroSubtitle: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 3,
  },
  subtitleGreen: {
    color: '#A7F3D0',
  },
  subtitleCream: {
    color: '#475569',
  },
  ctaRow: {
    marginTop: 8,
  },
  heroCtaBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 3,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ctaBtnGreen: {
    backgroundColor: '#FFFFFF',
  },
  ctaBtnCream: {
    backgroundColor: '#064E3B',
  },
  heroCtaText: {
    fontSize: 10.5,
    fontWeight: '800',
    marginRight: 6,
  },
  ctaTextGreen: {
    color: '#064E3B',
  },
  ctaTextCream: {
    color: '#FFFFFF',
  },
  ctaIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroVisual: {
    width: '37%',
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mainPhotoWrap: {
    width: 88,
    height: 88,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 32,
    borderBottomLeftRadius: 16,
    overflow: 'hidden',
    transform: [{ rotate: '2deg' }],
    backgroundColor: '#FFFFFF',
  },
  mainPhotoImg: {
    width: '100%',
    height: '100%',
  },
  floatingProduct: {
    position: 'absolute',
    left: -2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    transform: [{ rotate: '-7deg' }],
    backgroundColor: '#FFFFFF',
  },
  floatingProductImg: {
    width: '100%',
    height: '100%',
  },
  offerSticker: {
    position: 'absolute',
    right: -2,
    top: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  offerStickerBold: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#78350F',
    lineHeight: 10,
  },
  offerStickerSmall: {
    fontSize: 6.5,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});
