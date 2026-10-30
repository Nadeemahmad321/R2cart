import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';

interface PromoStripProps {
  tag?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onPress: () => void;
}

export const PromoStrip: React.FC<PromoStripProps> = React.memo(({
  tag = 'YOUR SAVINGS',
  title = 'Stock up. Save more.',
  subtitle = 'Explore the current offers available for your basket.',
  buttonText = 'Explore offers',
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.textCol}>
          <View style={styles.tagBadge}>
            <Feather name="percent" size={10} color="#059669" />
            <Text style={styles.tagText}>{tag}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.85}
          onPress={onPress}
        >
          <Text style={styles.btnText}>{buttonText}</Text>
          <Feather name="arrow-right" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#064E3B',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  textCol: {
    flex: 1,
    marginRight: 12,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    marginLeft: 3,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
