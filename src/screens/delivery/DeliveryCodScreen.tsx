import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { CodSummary } from '../../types';

export const DeliveryCodScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<CodSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchCod = useCallback(async () => {
    try {
      const res = await api.getCodSummary();
      if (res.data) {
        setSummary(res.data);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCod();
  }, [fetchCod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCod();
  };

  const cashInHand = (summary as any)?.pendingHandoverAmount ?? summary?.cashInHand ?? 0;
  const todayDelivered = summary?.todayDeliveredCount ?? 0;
  const todayPending = summary?.todayPendingCount ?? 0;
  const totalCollected = summary?.todayCollectedCod ?? cashInHand;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>COD & Cash Summary</Text>
          <Text style={styles.headerSubtitle}>Collections & Daily Settlements</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading COD summary...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Cash in Hand Box */}
          <View style={styles.heroBox}>
            <Text style={styles.heroLabel}>Total Cash In Hand</Text>
            <Text style={styles.heroAmount}>₹{cashInHand}</Text>
            <Text style={styles.heroSub}>Cash collected from completed COD deliveries</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIconCircle}>
                <Feather name="check-circle" size={16} color="#059669" />
              </View>
              <Text style={styles.statVal}>{todayDelivered}</Text>
              <Text style={styles.statLabel}>Today Delivered</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Feather name="clock" size={16} color="#EA580C" />
              </View>
              <Text style={styles.statVal}>{todayPending}</Text>
              <Text style={styles.statLabel}>Pending Deliveries</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconCircle, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Feather name="dollar-sign" size={16} color="#0284C7" />
              </View>
              <Text style={styles.statVal}>₹{totalCollected}</Text>
              <Text style={styles.statLabel}>Collected Today</Text>
            </View>
          </View>

          {/* Settlement Guidelines (Flat outline box) */}
          <View style={styles.infoBox}>
            <View style={styles.infoTitleRow}>
              <Feather name="shield" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.infoTitle}>Settlement & Handover Guidelines</Text>
            </View>

            <Text style={styles.infoDesc}>
              At the end of your shift or when cash exceeds ₹3,000, please deposit or hand over
              collected cash to the store manager.
            </Text>

            <View style={styles.ruleItem}>
              <Feather name="check" size={13} color="#059669" style={styles.ruleIcon} />
              <Text style={styles.ruleText}>Always count and verify exact cash before marking order delivered.</Text>
            </View>

            <View style={styles.ruleItem}>
              <Feather name="check" size={13} color="#059669" style={styles.ruleIcon} />
              <Text style={styles.ruleText}>Offer customer store UPI scan code if they don't have exact physical change.</Text>
            </View>

            <View style={styles.ruleItem}>
              <Feather name="check" size={13} color="#059669" style={styles.ruleIcon} />
              <Text style={styles.ruleText}>Obtain acknowledgment receipt from hub coordinator after depositing cash.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
  },
  heroBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  heroAmount: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  heroSub: {
    color: '#475569',
    fontSize: 11.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ruleIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
});
