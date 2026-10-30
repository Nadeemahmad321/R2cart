import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';

interface OrderCancelledModalProps {
  visible: boolean;
  orderNumber?: string;
  onClose: () => void;
  lang?: string;
}

export const OrderCancelledModal: React.FC<OrderCancelledModalProps> = ({
  visible,
  orderNumber,
  onClose,
  lang,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon Badge */}
          <View style={styles.iconCircle}>
            <Feather name="check" size={24} color="#166534" />
          </View>

          {/* Heading */}
          <Text style={styles.title}>
            {lang === 'hi' ? 'ऑर्डर रद्द कर दिया गया' : 'Order Cancelled'}
          </Text>

          {/* Order Number Badge */}
          {orderNumber ? (
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>#{orderNumber}</Text>
            </View>
          ) : null}

          {/* Description */}
          <Text style={styles.description}>
            {lang === 'hi'
              ? 'आपका ऑर्डर सफलतापूर्वक रद्द कर दिया गया है। यदि आपने ऑनलाइन भुगतान किया था, तो रिफंड 2-4 दिनों में आपके बैंक खाते में जमा कर दिया जाएगा।'
              : 'Your order has been cancelled successfully. If paid online, your refund will be credited back to your original payment method in 2-4 business days.'}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>
              {lang === 'hi' ? 'समझ गया' : 'Okay, Got it'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  orderBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 12,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

