import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { EmergencyInfo } from '../../services/dataCache';

interface EmergencyBannerProps {
  info: EmergencyInfo;
  containerStyle?: any;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ info, containerStyle }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // If no emergency is active, don't render anything
  if (!info.isEmergencyActive && !info.isStorePaused && !info.isAreaSuspended) {
    return null;
  }

  const isSevere = info.isStorePaused || info.isAreaSuspended || info.emergencyType === 'STORE_CLOSE';

  return (
    <View
      style={[
        styles.banner,
        isSevere ? styles.bannerSevere : styles.bannerWarning,
        containerStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🚨</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {info.title}
          </Text>
        </View>

        <View style={styles.badgesWrap}>
          {info.resumesAtLabel && (
            <View style={styles.resumesChip}>
              <Feather name="clock" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.resumesChipText}>Resumes {info.resumesAtLabel}</Text>
            </View>
          )}

          <View style={styles.statusPill}>
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
            <Text style={styles.statusPillText}>
              {info.isStorePaused ? 'PAUSED' : info.isAreaSuspended ? 'SUSPENDED' : 'ALERT'}
            </Text>
          </View>
        </View>
      </View>

      {info.message ? (
        <Text style={styles.message} numberOfLines={2}>
          {info.message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginHorizontal: 14,
    marginVertical: 8,
    borderWidth: 1,
  },
  bannerSevere: {
    backgroundColor: '#991B1B',
    borderColor: '#7F1D1D',
  },
  bannerWarning: {
    backgroundColor: '#B45309',
    borderColor: '#92400E',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
  badgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  resumesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resumesChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 5,
    fontWeight: '500',
  },
});
