import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Category } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const CAT_COL_WIDTH = (width - 32 - 24) / 4; // 4 columns with 8px gap

interface CategoryGridProps {
  title?: string;
  subtitle?: string;
  categories: Category[];
  onCategoryPress: (category: Category) => void;
  initialCount?: number;
}

const PASTEL_COLORS = [
  '#DCFCE7', // Fresh green
  '#FEF3C7', // Warm amber
  '#E0F2FE', // Light sky blue
  '#FCE7F3', // Soft pink
  '#EDE9FE', // Light purple
  '#FFEDD5', // Soft orange
  '#F1F5F9', // Clean slate
  '#CCFBF1', // Teal
];

function optimizeThumb(url?: string | null, targetWidth = 160): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/') && !trimmed.includes('w_')) {
    return trimmed.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto/`);
  }
  return trimmed;
}

export const CategoryGrid: React.FC<CategoryGridProps> = React.memo(({
  title,
  subtitle,
  categories,
  onCategoryPress,
  initialCount = 8,
}) => {
  const { lang, t, tCat } = useLanguage();
  const [expanded, setExpanded] = useState<boolean>(false);

  if (!categories || categories.length === 0) return null;

  const displayList = expanded ? categories : categories.slice(0, initialCount);
  const displayTitle = title || t('shopByCategory');
  const displaySubtitle = subtitle || (lang === 'hi' ? 'ताज़ा और शुद्ध रोज़मर्रा का सामान' : 'Everything your home needs');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={styles.titleText}>{displayTitle}</Text>
          {displaySubtitle ? <Text style={styles.subtitleText}>{displaySubtitle}</Text> : null}
        </View>

        {categories.length > initialCount && (
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleBtnText}>
              {expanded
                ? (lang === 'hi' ? 'कम देखें' : 'Show Less')
                : (lang === 'hi' ? `सभी देखें (${categories.length}) >` : `View All (${categories.length}) >`)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.grid}>
        {displayList.map((cat, idx) => {
          const imgUri = cat.image || (cat as any).imageUrl;
          const bgCol = cat.color || PASTEL_COLORS[idx % PASTEL_COLORS.length];

          return (
            <TouchableOpacity
              key={cat.id || `cat_${idx}`}
              style={styles.gridItem}
              activeOpacity={0.8}
              onPress={() => onCategoryPress(cat)}
            >
              <View style={[styles.outerLayer, { backgroundColor: bgCol }]}>
                {imgUri ? (
                  /* Inner Image: Circular (borderRadius: 30) matching website's border-radius: 50% */
                  <Image
                    source={{ uri: optimizeThumb(imgUri, 160) }}
                    style={styles.innerImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="shopping-bag" size={28} color={Colors.primaryDark} />
                )}
              </View>

              <Text style={styles.label} numberOfLines={2}>
                {tCat(cat.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toggleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: CAT_COL_WIDTH,
    alignItems: 'center',
    marginBottom: 12,
  },
  // Outer layer is NOT a circle - soft rounded rectangle matching website (.category-grid a div)
  outerLayer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  // Inner image is circular (50% radius) matching website (.category-grid a div img)
  innerImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
});
