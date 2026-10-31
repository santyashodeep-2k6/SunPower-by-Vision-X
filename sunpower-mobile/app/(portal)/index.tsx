import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SMSAuthService } from '@/services/smsAuth';
import { ApiClient } from '@/services/apiClient';
import {
  CalculatorIcon,
  QuotationIcon,
  RobotHeadIcon,
  LocationPinIcon,
} from '@/components/ui/ActionIcons';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Rahul Sharma');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [quoteAccepted, setQuoteAccepted] = useState(false);
  const [systemCapacity, setSystemCapacity] = useState('5.0 kW');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await SMSAuthService.getUserData();
      if (userData && userData.name) {
        setUserName(userData.name);
      }
    } catch {
      // fallback
    }
  };

  const handleAcceptQuote = () => {
    setQuoteAccepted(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Quotation Accepted! 🎉\nOur installation team will contact you for site survey confirmation and advance.');
    } else {
      Alert.alert('Quotation Accepted! 🎉', 'Our installation team will contact you for site survey confirmation and advance.');
    }
  };

  return (
    <LinearGradient
      colors={['#E5FBF0', '#EAE6FF', '#F8F6FE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.userProfile}>
            <Image
              source={require('@/assets/avatar_viraj.jpg')}
              style={styles.avatar}
            />
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Good Morning,</Text>
              <Text style={styles.userNameText}>{userName}! 👋</Text>
            </View>
          </View>

          {/* Bell Notification Button */}
          <Pressable
            style={styles.bellButton}
            onPress={() => setNotificationsVisible(true)}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellBadge} />
          </Pressable>
        </View>

        {/* 3D Solar Clay Cottage Hero matching Screenshot */}
        <View style={styles.heroContainer}>
          <Image
            source={require('@/assets/solar_clay_house.jpg')}
            style={styles.houseImage}
            resizeMode="cover"
          />
        </View>

        {/* Today's Generation Overlapping Card matching Screenshot */}
        <View style={styles.generationCardWrapper}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(240, 253, 248, 0.92)']}
            style={styles.generationCard}
          >
            <View style={styles.generationLeft}>
              <LinearGradient
                colors={['#6EE7B7', '#10B981']}
                style={styles.lightningBadge}
              >
                <Text style={styles.lightningIcon}>⚡</Text>
              </LinearGradient>

              <View style={styles.generationInfo}>
                <Text style={styles.generationLabel}>Today's Generation</Text>
                <View style={styles.kwhRow}>
                  <Text style={styles.kwhValue}>18.5</Text>
                  <Text style={styles.kwhUnit}> kWh</Text>
                </View>
                <Text style={styles.generationChange}>↑ +12% vs yesterday</Text>
              </View>
            </View>

            {/* Ascending Green Generation Signal Bars */}
            <View style={styles.signalBars}>
              <View style={[styles.signalBar, { height: 12, backgroundColor: '#86EFAC' }]} />
              <View style={[styles.signalBar, { height: 18, backgroundColor: '#4ADE80' }]} />
              <View style={[styles.signalBar, { height: 26, backgroundColor: '#22C55E' }]} />
              <View style={[styles.signalBar, { height: 34, backgroundColor: '#16A34A' }]} />
            </View>
          </LinearGradient>
        </View>

        {/* 2x2 Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          {/* Row 1 */}
          <View style={styles.quickActionsRow}>
            {/* Solar Calculator */}
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push('/calculator')}
            >
              <CalculatorIcon />
              <Text style={styles.actionLabel}>Solar{'\n'}Calculator</Text>
            </Pressable>

            {/* System Dossier & Documents */}
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push('/documents')}
            >
              <QuotationIcon />
              <Text style={styles.actionLabel}>Installation{'\n'}Dossier</Text>
            </Pressable>
          </View>

          {/* Row 2 */}
          <View style={styles.quickActionsRow}>
            {/* Talk to AI */}
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push('/(portal)/ai')}
            >
              <RobotHeadIcon />
              <Text style={styles.actionLabel}>Talk to AI</Text>
            </Pressable>

            {/* Track Installation */}
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push('/(portal)/installations')}
            >
              <LocationPinIcon />
              <Text style={styles.actionLabel}>Track{'\n'}Installation</Text>
            </Pressable>
          </View>
        </View>

        {/* Generic & Interactive Installation System Hub */}
        <View style={styles.sectionWrapper}>
          <LinearGradient
            colors={['#FFFFFF', '#F0FDF4']}
            style={styles.quotationCard}
          >
            <View style={styles.quoteHeaderRow}>
              <View style={styles.quotePill}>
                <Text style={styles.quotePillText}>✓ SYSTEM COMMISSIONED</Text>
              </View>
              <Text style={styles.quoteIdText}>DOC-SUN-001</Text>
            </View>

            <Text style={styles.quoteTitle}>
              5.0 kW On-Grid Rooftop Solar Plant
            </Text>
            <Text style={styles.quoteSub}>
              MSEDCL Net-Meter Synchronized · 20 - 22 kWh Expected Daily Yield
            </Text>

            <View style={styles.quotePriceRow}>
              <View>
                <Text style={styles.quotePriceLabel}>PV Modules Array</Text>
                <Text style={styles.quotePriceValue}>10x 540W Mono-PERC</Text>
              </View>
              <View style={styles.netCostBadge}>
                <Text style={styles.netCostLabel}>Smart Inverter</Text>
                <Text style={styles.netCostValue}>5 kW Dual-MPPT</Text>
              </View>
            </View>

            <View style={styles.quoteActionButtons}>
              <Pressable
                style={styles.acceptQuoteBtn}
                onPress={() => router.push('/documents')}
              >
                <Text style={styles.acceptQuoteText}>📂 Open Certified Docs & Specs</Text>
              </Pressable>
              <Pressable
                style={styles.viewQuoteDetailsBtn}
                onPress={() => router.push('/technician')}
              >
                <Text style={styles.viewQuoteText}>🛠️ Field Photos</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* 4 Essential Stats Grid (Matching Web Portal) */}
        <View style={styles.statsQuadGrid}>
          {/* Stat 1: Outstanding Payments */}
          <View style={styles.statMiniCard}>
            <Text style={styles.statMiniIcon}>💳</Text>
            <Text style={styles.statMiniLabel}>Outstanding</Text>
            <Text style={styles.statMiniValue}>₹0.00</Text>
            <Text style={styles.statMiniBadge}>All Dues Cleared</Text>
          </View>

          {/* Stat 2: Active Warranties */}
          <View style={styles.statMiniCard}>
            <Text style={styles.statMiniIcon}>🛡️</Text>
            <Text style={styles.statMiniLabel}>Active Warranties</Text>
            <Text style={styles.statMiniValue}>3 Active</Text>
            <Text style={styles.statMiniBadge}>25-Yr Modules</Text>
          </View>

          {/* Stat 3: Service Tickets */}
          <Pressable
            style={styles.statMiniCard}
            onPress={() => router.push('/(portal)/service')}
          >
            <Text style={styles.statMiniIcon}>🔧</Text>
            <Text style={styles.statMiniLabel}>Service Status</Text>
            <Text style={styles.statMiniValue}>Optimal</Text>
            <Text style={[styles.statMiniBadge, { color: '#059669' }]}>
              + Book Service
            </Text>
          </Pressable>

          {/* Stat 4: Subsidy Status */}
          <View style={styles.statMiniCard}>
            <Text style={styles.statMiniIcon}>🏛️</Text>
            <Text style={styles.statMiniLabel}>Govt Subsidy</Text>
            <Text style={styles.statMiniValue}>₹78,000</Text>
            <Text style={styles.statMiniBadge}>Approved by MSEDCL</Text>
          </View>
        </View>
        {/* Bottom spacing to ensure content floats above tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={notificationsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications 🔔</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setNotificationsVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.notifItem}>
              <Text style={styles.notifEmoji}>☀️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifHeading}>Peak Generation Reached</Text>
                <Text style={styles.notifSub}>
                  Your 5.0 kW solar system generated 18.5 kWh today.
                </Text>
              </View>
            </View>
            <View style={styles.notifItem}>
              <Text style={styles.notifEmoji}>🔧</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifHeading}>Installation Stage 4 In Progress</Text>
                <Text style={styles.notifSub}>
                  Roof mounting & inverter cabling active with technician Arjun Patil.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 54,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 1,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroContainer: {
    width: width,
    height: 220,
    marginTop: 4,
    overflow: 'hidden',
  },
  houseImage: {
    width: '100%',
    height: '100%',
  },
  generationCardWrapper: {
    paddingHorizontal: 20,
    marginTop: -42,
    zIndex: 10,
  },
  generationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#10B981',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  generationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lightningBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  lightningIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  generationInfo: {
    justifyContent: 'center',
  },
  generationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  kwhRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  kwhValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kwhUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  generationChange: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 38,
    paddingBottom: 2,
  },
  signalBar: {
    width: 6,
    borderRadius: 3,
  },
  quickActionsGrid: {
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  // Quotation Section (Main Folder Feature)
  sectionWrapper: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  quotationCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  quoteIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  quoteTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  quoteSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  quotePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginVertical: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  quotePriceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  quotePriceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  netCostBadge: {
    alignItems: 'flex-end',
  },
  netCostLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  netCostValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  quoteActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptQuoteBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  acceptQuoteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewQuoteDetailsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  viewQuoteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  acceptedConfirmBanner: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  acceptedConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  // 4 Mini Stats Grid
  statsQuadGrid: {
    paddingHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statMiniCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  statMiniIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statMiniLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statMiniValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statMiniBadge: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 4,
  },
  // Technician Mode Banner
  technicianModeBanner: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: '#0D2B20',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0D2B20',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  techModeEmoji: {
    fontSize: 24,
  },
  techModeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  techModeSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  techModeArrow: {
    fontSize: 18,
    color: '#F4C542',
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  notifItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifEmoji: {
    fontSize: 20,
  },
  notifHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
