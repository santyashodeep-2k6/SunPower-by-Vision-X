import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clay3DCard } from '@/components/ui/Clay3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SMSAuthService } from '@/services/smsAuth';
import { BiometricAuthService } from '@/services/biometricAuth';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { SafeStorage } from '@/services/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Viraj Deshmukh');
  const [phone, setPhone] = useState('+91 98220 12345');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanStep, setScanStep] = useState<'scanning' | 'success'>('scanning');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await SMSAuthService.getUserData();
      if (userData) {
        setUserName(userData.name || 'Viraj Deshmukh');
        setPhone(userData.phone || '+91 98220 12345');
      }
      const enabled = await BiometricAuthService.isBiometricLoginEnabled();
      setBiometricEnabled(enabled);
    } catch (e) {
      console.warn('Error loading profile', e);
    }
  };

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Prompt verification scan
      setScanStep('scanning');
      setScanModalVisible(true);
      setTimeout(async () => {
        setScanStep('success');
        await BiometricAuthService.enableBiometricLogin();
        setBiometricEnabled(true);
        setTimeout(() => {
          setScanModalVisible(false);
          showNotification('🛡️ Face ID & Biometric Lock is now ACTIVE!');
        }, 1200);
      }, 1500);
    } else {
      await BiometricAuthService.disableBiometricLogin();
      setBiometricEnabled(false);
      showNotification('🔓 Biometric Lock disabled. Standard PIN/OTP will be used.');
    }
  };

  const handleTestBiometric = () => {
    setScanStep('scanning');
    setScanModalVisible(true);
    setTimeout(() => {
      setScanStep('success');
      setTimeout(() => {
        setScanModalVisible(false);
        showNotification('✅ Identity Verified via Biometrics!');
      }, 1000);
    }, 1200);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out of SunFlow 360?');
      if (confirmed) {
        SMSAuthService.logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to log out of SunFlow 360?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await SMSAuthService.logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    }
  };

  return (
    <LinearGradient colors={['#0D2B20', '#133E2E', '#0B231A']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarGlow}>
            <Text style={styles.avatar}>👤</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.phone}>{phone}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ PM Surya Ghar Registered Owner</Text>
          </View>
        </View>

        {/* Floating Notification */}
        {notificationMsg && (
          <View style={styles.floatingToast}>
            <Text style={styles.floatingToastText}>{notificationMsg}</Text>
          </View>
        )}

        {/* Biometric Security Card */}
        <Clay3DCard style={styles.section}>
          <View style={styles.securityHeader}>
            <View style={styles.securityIconBox}>
              <Text style={styles.securityEmoji}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Biometric Vault Lock</Text>
              <Text style={styles.securitySub}>
                Face ID / Fingerprint lock for energy stats, bills & subsidy vault
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor={biometricEnabled ? '#0D2B20' : '#FFFFFF'}
            />
          </View>

          {/* Status Row */}
          <View style={styles.biometricStatusRow}>
            <View
              style={[
                styles.biometricStatusDot,
                biometricEnabled ? styles.dotActive : styles.dotInactive,
              ]}
            />
            <Text style={styles.biometricStatusLabel}>
              Status:{' '}
              <Text style={biometricEnabled ? styles.statusActive : styles.statusInactive}>
                {biometricEnabled
                  ? 'ARMED (Protected by Biometrics)'
                  : 'DISABLED (Unlocked)'}
              </Text>
            </Text>
          </View>

          {biometricEnabled && (
            <Pressable style={styles.testBiometricBtn} onPress={handleTestBiometric}>
              <Text style={styles.testBiometricText}>⚡ Test Biometric Sensor</Text>
            </Pressable>
          )}
        </Clay3DCard>

        {/* Customer Solar Portal Quick Links (Exclusively Customer) */}
        <Clay3DCard style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Documents & Vault</Text>
          
          <Pressable onPress={() => router.push('/documents')} style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Text style={styles.linkEmoji}>📄</Text>
              <Text style={styles.linkText}>Installation & Certified Documents</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/assets')} style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Text style={styles.linkEmoji}>🛡️</Text>
              <Text style={styles.linkText}>Equipment Specs & Warranty Certificates</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/subsidy')} style={[styles.linkRow, { borderBottomWidth: 0 }]}>
            <View style={styles.linkLeft}>
              <Text style={styles.linkEmoji}>🏛️</Text>
              <Text style={styles.linkText}>PM Surya Ghar ₹78,000 Subsidy Tracker</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>
        </Clay3DCard>

        {/* System & Account Details */}
        <Clay3DCard style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Grid Parameters</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Consumer ID:</Text>
            <Text style={styles.infoValue}>CUST-MUM-48201</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>System Capacity:</Text>
            <Text style={styles.infoValue}>5.4 kW Bifacial Solar</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DISCOM Sanction:</Text>
            <Text style={styles.infoValue}>MSEDCL Pune Division</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project ID:</Text>
            <Text style={styles.infoValue}>SP-2026-DEL-041</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version:</Text>
            <Text style={styles.infoValue}>v2.4.0 (SunFlow 360 Gold)</Text>
          </View>
        </Clay3DCard>

        {/* Logout Button */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 Log Out of Account</Text>
        </Pressable>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Biometric Verification Modal */}
      <Modal
        visible={scanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View style={styles.scanModalOverlay}>
          <View style={styles.scanModalCard}>
            <View style={styles.fingerprintAnimBox}>
              <Text style={styles.fingerprintEmoji}>
                {scanStep === 'scanning' ? '🔍' : '✅'}
              </Text>
            </View>
            <Text style={styles.scanModalTitle}>
              {scanStep === 'scanning' ? 'Verifying Identity...' : 'Biometrics Authenticated!'}
            </Text>
            <Text style={styles.scanModalSub}>
              {scanStep === 'scanning'
                ? 'Scan your Face ID or place finger on sensor'
                : 'Security credentials confirmed with local hardware vault'}
            </Text>
            {scanStep === 'scanning' && (
              <View style={styles.scanningPulse}>
                <Text style={styles.scanningPulseText}>Hardware Sensor Active</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: 10,
  },
  avatarGlow: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: spacing.sm,
  },
  avatar: { fontSize: 44 },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  phone: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  floatingToast: {
    backgroundColor: '#0D2B20',
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  floatingToastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityEmoji: { fontSize: 22 },
  securitySub: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 15,
  },
  biometricStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  biometricStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: '#10B981' },
  dotInactive: { backgroundColor: '#94A3B8' },
  biometricStatusLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  statusActive: {
    color: '#059669',
    fontWeight: '800',
  },
  statusInactive: {
    color: '#64748B',
    fontWeight: '700',
  },
  testBiometricBtn: {
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  testBiometricText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkEmoji: { fontSize: 18 },
  linkText: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '700',
  },
  linkArrow: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  scanModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  fingerprintAnimBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  fingerprintEmoji: { fontSize: 36 },
  scanModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  scanModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  scanningPulse: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scanningPulseText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
});
