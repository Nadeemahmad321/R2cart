import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Banner } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;

interface CampaignRailProps {
  title?: string;
  subtitle?: string;
  banners: Banner[];
  onBannerPress: (banner: Banner) => void;
}

const GRADIENT_COLORS = [
  '#064E3B', // Emerald dark
  '#1E3A8A', // Blue dark
  '#7C2D12', // Warm amber / terracotta
  '#4C1D95', // Purple dark
];

export const CampaignRail: React.FC<CampaignRailProps> = React.memo(({
  title = 'Offers picked for you',
  subtitle = 'Fresh deals, updated from R2Cart',
  banners,
  onBannerPress,
}) => {
  const { lang } = useLanguage();
  if (!banners || banners.length === 0) return null;

  const displayTitle = lang === 'hi' ? 'खास आपके लिए ऑफर्स' : title;
  const displaySubtitle = lang === 'hi' ? 'ताज़ा बचत डील्स, सीधे R2Cart से' : subtitle;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="tag" size={16} color={Colors.primaryDark} style={styles.headerIcon} />
          <Text style={styles.titleText}>{displayTitle}</Text>
        </View>
        {displaySubtitle ? <Text style={styles.subtitleText}>{displaySubtitle}</Text> : null}
      </View>

      <FlatList
        horizontal
        data={banners}
        keyExtractor={(item, idx) => item.id || `campaign_${idx}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        renderItem={({ item, index }) => {
          const bgCol = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
          const ctaText = item.ctaText || 'Claim Offer Now';

          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: bgCol }]}
              activeOpacity={0.92}
              onPress={() => onBannerPress(item)}
            >
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.cardBgImage}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.overlay}>
                <View style={styles.kickerBadge}>
                  <Text style={styles.kickerText}>
                    {item.kicker || 'SPECIAL DEAL'}
                  </Text>
                </View>

                <Text style={styles.cardHeading} numberOfLines={2}>
                  {item.heading}
                </Text>

                {item.subtitle ? (
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : null}

                <View style={styles.ctaRow}>
                  <View style={styles.ctaBtn}>
                    <Text style={styles.ctaBtnText}>{ctaText}</Text>
                    <Feather name="arrow-right" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    justifyContent: 'space-between',
  },
  kickerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kickerText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardHeading: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 4,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
