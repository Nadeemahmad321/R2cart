import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';

export const OrderSuccessScreen = ({ route, navigation }: any) => {
  const { orderId, orderNumber, totalAmount } = route?.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkText}>✓</Text>
        </View>

        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>
          Your groceries are being prepared at the local store and will reach you in 15-20 minutes.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Order Number</Text>
            <Text style={styles.val}>#{orderNumber || orderId?.slice(-6).toUpperCase() || 'R2C'}</Text>
          </View>
          {totalAmount ? (
            <View style={styles.row}>
              <Text style={styles.label}>Amount to Pay / Paid</Text>
              <Text style={styles.val}>₹{totalAmount}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Delivery ETA</Text>
            <Text style={[styles.val, styles.greenVal]}>⚡ 15-20 Mins</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => {
            if (orderId) {
              navigation.replace('OrderDetail', { orderId });
            } else {
              navigation.replace('Orders');
            }
          }}
        >
          <Text style={styles.trackBtnText}>Track Order Live {'->'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  label: {
    fontSize: 13,
    color: Colors.muted,
  },
  val: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.dark,
  },
  greenVal: {
    color: Colors.primaryDark,
  },
  trackBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  homeBtn: {
    paddingVertical: 10,
  },
  homeBtnText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
});
