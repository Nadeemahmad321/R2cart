import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { dataCache } from '../../services/dataCache';
import { useLanguage } from '../../context/LanguageContext';

export const PromiseStrip: React.FC = React.memo(() => {
  const { lang, tEta } = useLanguage();
  const backendEta = dataCache.getEstimatedDelivery('20-30 mins');
  const deliveryHeading = lang === 'hi'
    ? `${tEta(backendEta)} डिलीवरी`
    : `${backendEta.replace(/minutes/gi, 'Mins').replace(/mins/gi, 'Mins')} Delivery`;

  return (
    <View style={styles.container}>
      <View style={styles.cell}>
        <View style={styles.iconCircle}>
          <Feather name="clock" size={15} color={Colors.primaryDark} />
        </View>
        <Text style={styles.heading}>{deliveryHeading}</Text>
        <Text style={styles.subtext}>
          {lang === 'hi' ? 'सीधे आपके द्वार पर' : 'Super fast at your door'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cell}>
        <View style={styles.iconCircle}>
          <Feather name="shield" size={15} color={Colors.primaryDark} />
        </View>
        <Text style={styles.heading}>100% Quality</Text>
        <Text style={styles.subtext}>Handpicked & checked</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cell}>
        <View style={styles.iconCircle}>
          <Feather name="refresh-cw" size={15} color={Colors.primaryDark} />
        </View>
        <Text style={styles.heading}>Easy Returns</Text>
        <Text style={styles.subtext}>No questions asked</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  heading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
});
