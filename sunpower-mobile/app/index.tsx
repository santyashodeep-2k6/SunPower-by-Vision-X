import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#0D2B20', '#133E2E', '#0B231A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Ambient Radial Glow */}
      <View style={styles.ambientGlow} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <LinearGradient
            colors={['#F4C542', '#E7A934']}
            style={styles.logoBadge}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={5} fill="#0D2B20" />
              <Path
                d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                stroke="#0D2B20"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </LinearGradient>
          <Text style={styles.brandName}>SunFlow 360</Text>
          <Text style={styles.brandTagline}>Clean Solar Ecosystem · Field & Customer Suite</Text>
        </View>

        {/* Hero Visual Card */}
        <View style={styles.heroCard}>
          <Image
            source={require('@/assets/solar_clay_house.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(13, 43, 32, 0.95)']}
            style={styles.heroGradientOverlay}
          >
            <Text style={styles.heroTitle}>Choose Your Workspace</Text>
            <Text style={styles.heroSub}>
              Select your role to access the dedicated dashboard
            </Text>
          </LinearGradient>
        </View>

        {/* Role Cards: Customer vs Technician */}
        <View style={styles.rolesContainer}>
          {/* Option 1: Customer Portal */}
          <Pressable
            style={styles.roleCard}
            onPress={() => router.push('/(portal)')}
          >
            <View style={styles.roleIconBoxCustomer}>
              <Text style={styles.roleEmoji}>☀️</Text>
            </View>
            <View style={styles.roleInfo}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>Solar Customer</Text>
                <View style={styles.badgeCustomer}>
                  <Text style={styles.badgeCustomerText}>HOMEOWNER DASHBOARD</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                Real-time 5.4 kW solar generation, battery telemetry, bill savings, and PM Surya Ghar subsidy tracking.
              </Text>
              <View style={styles.roleFeatureChips}>
                <Text style={styles.chipText}>⚡ Live Power</Text>
                <Text style={styles.chipText}>💰 ₹4,250 Saved</Text>
                <Text style={styles.chipText}>🎙️ AI Call</Text>
                <Text style={styles.chipText}>📄 Vault</Text>
              </View>
            </View>
            <View style={styles.roleArrowCircle}>
              <Text style={styles.roleArrow}>→</Text>
            </View>
          </Pressable>

          {/* Option 2: Field Technician Workspace */}
          <Pressable
            style={[styles.roleCard, styles.roleCardTech]}
            onPress={() => router.push('/technician')}
          >
            <View style={styles.roleIconBoxTech}>
              <Text style={styles.roleEmoji}>🛠️</Text>
            </View>
            <View style={styles.roleInfo}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>Field Technician</Text>
                <View style={styles.badgeTech}>
                  <Text style={styles.badgeTechText}>INSTALLER OPS DASHBOARD</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                On-site rooftop job dispatch, camera photo evidence capture with GPS, checklists & DISCOM sync.
              </Text>
              <View style={styles.roleFeatureChips}>
                <Text style={[styles.chipText, styles.chipTextTech]}>📸 GPS Photo</Text>
                <Text style={[styles.chipText, styles.chipTextTech]}>⏱️ Work Timer</Text>
                <Text style={[styles.chipText, styles.chipTextTech]}>📋 Checklist</Text>
                <Text style={[styles.chipText, styles.chipTextTech]}>⚡ 480V Diag</Text>
              </View>
            </View>
            <View style={[styles.roleArrowCircle, styles.roleArrowCircleTech]}>
              <Text style={styles.roleArrow}>→</Text>
            </View>
          </Pressable>
        </View>

        {/* Direct Login Option */}
        <Pressable
          style={styles.loginLinkRow}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginLinkText}>
            Need to sign in with OTP or change account? <Text style={styles.loginLinkHighlight}>Go to Login →</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(56, 184, 120, 0.12)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#F4C542',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    marginTop: 2,
  },
  heroCard: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  rolesContainer: {
    gap: 14,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  roleCardTech: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  roleIconBoxCustomer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 197, 66, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleIconBoxTech: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleEmoji: {
    fontSize: 24,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badgeCustomer: {
    backgroundColor: 'rgba(244, 197, 66, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeCustomerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F4C542',
    letterSpacing: 0.5,
  },
  badgeTech: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTechText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  roleDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
  roleArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  roleArrowCircleTech: {
    backgroundColor: '#10B981',
  },
  roleArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  loginLinkRow: {
    marginTop: 22,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loginLinkHighlight: {
    color: '#10B981',
    fontWeight: '700',
  },
  roleFeatureChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F4C542',
    backgroundColor: 'rgba(244, 197, 66, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipTextTech: {
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
});
