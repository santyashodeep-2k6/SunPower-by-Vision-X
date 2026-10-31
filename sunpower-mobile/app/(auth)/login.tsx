import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiClient } from '@/services/apiClient';
import { BiometricAuthService } from '@/services/biometricAuth';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type LoginTab = 'customer' | 'team';

const DEMO_CUSTOMERS = [
  { name: 'Rahul Sharma', phone: '9876543210', desc: '5.0 kW On-Grid (Pune)' },
  { name: 'Priya Deshmukh', phone: '9819001234', desc: '3.3 kW Residential' },
  { name: 'Viraj', phone: '9820011223', desc: '5.4 kW Solar Rooftop' },
];

const STAFF_ROLES = [
  {
    role: 'INSTALLER',
    username: 'installer',
    name: 'Arjun Patil',
    title: 'Lead Solar Technician',
    desc: 'On-site installation, camera verification & handover',
    icon: '🔧',
  },
  {
    role: 'SERVICE',
    username: 'service',
    name: 'Deepak Shinde',
    title: 'Solar Service Engineer',
    desc: 'Maintenance, inverter repairs & ticket resolution',
    icon: '⚡',
  },
  {
    role: 'SURVEYOR',
    username: 'surveyor',
    name: 'Vikram Joshi',
    title: 'Site Surveyor',
    desc: 'Roof dimensioning, shadow analysis & 3D survey',
    icon: '📐',
  },
  {
    role: 'ADMIN',
    username: 'admin',
    name: 'Rajesh Nair',
    title: 'Operations Director',
    desc: 'Complete CRM, inventory & order orchestration',
    icon: '📊',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LoginTab>('customer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState<string>('installer');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const otpRefs = useRef<Array<TextInput | null>>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Check backend health
    ApiClient.checkHealth().then(setBackendOnline);

    // Check biometric on mount
    checkBiometric();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkBiometric = async () => {
    try {
      const isEnabled = await BiometricAuthService.isBiometricLoginEnabled();
      if (isEnabled) {
        const result = await BiometricAuthService.quickLogin();
        if (result.success) {
          router.replace('/(portal)');
        }
      }
    } catch {
      // biometric not available
    }
  };

  const handleSendOTP = async () => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      notify('Invalid Phone', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    // Simulating quick SMS dispatch
    await new Promise((r) => setTimeout(r, 400));
    setLoading(false);
    setStep('otp');
    setCountdown(60);
    // Auto-focus first digit
    setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 150);
  };

  const handleOTPChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');

    // Handle full paste (e.g. "123456")
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      const newOTP = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOTP[index + i] = d;
        }
      });
      setOTP(newOTP);
      const targetFocus = Math.min(index + digits.length, 5);
      otpRefs.current[targetFocus]?.focus();
      if (newOTP.filter(Boolean).length === 6) {
        handleVerifyOTP(newOTP.join(''));
      }
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = cleaned;
    setOTP(newOTP);

    // Auto-advance
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto verify when filled
    if (cleaned && index === 5) {
      const full = newOTP.join('');
      if (full.length === 6) {
        handleVerifyOTP(full);
      }
    }
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (customOTP?: string) => {
    const code = customOTP || otp.join('');
    if (code.length < 6) {
      notify('Incomplete OTP', 'Please enter all 6 digits');
      return;
    }

    setLoading(true);
    const result = await ApiClient.customerLoginWithPhone(phoneNumber || '9876543210', code);
    setLoading(false);

    if (result.success) {
      router.replace('/(portal)');
    } else {
      notify('Verification Failed', result.error || 'Incorrect OTP code');
      setOTP(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleStaffLogin = async () => {
    setLoading(true);
    const staff = STAFF_ROLES.find((s) => s.username === selectedStaff) || STAFF_ROLES[0];
    const result = await ApiClient.login(staff.username, 'password123');
    setLoading(false);

    if (result.success) {
      if (staff.role === 'INSTALLER') {
        router.replace('/technician');
      } else {
        router.replace('/(portal)');
      }
    } else {
      notify('Login Error', result.error || 'Could not authenticate staff account');
    }
  };

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  return (
    <LinearGradient
      colors={['#0D2B20', '#133E2E', '#184C38']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Ambient Radial Highlights */}
      <View style={styles.ambientGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand Badge */}
          <Animated.View
            style={[
              styles.headerSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Logo Mark */}
            <View style={styles.logoRow}>
              <LinearGradient
                colors={['#F4C542', '#E7A934']}
                style={styles.logoBadge}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={5} fill="#0D2B20" />
                  <Path
                    d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                    stroke="#0D2B20"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                </Svg>
              </LinearGradient>
              <Text style={styles.brandTitle}>SunFlow 360</Text>
            </View>

            <Text style={styles.brandSubtitle}>Clean Solar Energy · Portal & Field Ops</Text>

            {/* Backend Connectivity Status Pill */}
            <View style={styles.backendStatusPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: backendOnline ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text style={styles.backendStatusText}>
                {backendOnline
                  ? 'Spring Boot Backend Connected (8081)'
                  : 'Backend Standalone Mode (Demo Ready)'}
              </Text>
            </View>
          </Animated.View>

          {/* Main Card */}
          <Animated.View
            style={[
              styles.cardContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Tab Switcher: Customer vs SunFlow Team */}
            <View style={styles.tabBar}>
              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === 'customer' && styles.tabItemActive,
                ]}
                onPress={() => {
                  setActiveTab('customer');
                  setStep('phone');
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'customer' && styles.tabTextActive,
                  ]}
                >
                  Customer Portal
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === 'team' && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab('team')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'team' && styles.tabTextActive,
                  ]}
                >
                  SunFlow Team
                </Text>
              </Pressable>
            </View>

            {/* ================= Customer Login Flow ================= */}
            {activeTab === 'customer' && (
              <View style={styles.tabContent}>
                {step === 'phone' ? (
                  <>
                    <Text style={styles.cardHeading}>Sign in to your system</Text>
                    <Text style={styles.cardSubtext}>
                      Track real-time generation, solar savings & installation
                    </Text>

                    {/* Phone Number Input */}
                    <View style={styles.inputLabelRow}>
                      <Text style={styles.inputLabel}>Registered Mobile Number</Text>
                    </View>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="10-digit number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                      />
                    </View>

                    {/* Send OTP Button */}
                    <Pressable
                      style={[
                        styles.primaryButton,
                        loading && styles.buttonDisabled,
                      ]}
                      onPress={handleSendOTP}
                      disabled={loading}
                    >
                      <Text style={styles.primaryButtonText}>
                        {loading ? 'Sending code…' : 'Send Verification Code →'}
                      </Text>
                    </Pressable>

                    {/* Demo Customers Quick Fill */}
                    <View style={styles.demoSection}>
                      <Text style={styles.demoSectionTitle}>
                        Tap a demo customer to test instantly:
                      </Text>
                      <View style={styles.demoPillsRow}>
                        {DEMO_CUSTOMERS.map((cust) => (
                          <Pressable
                            key={cust.phone}
                            style={styles.demoPill}
                            onPress={() => {
                              setPhoneNumber(cust.phone);
                              setStep('otp');
                              setCountdown(60);
                              setOTP(['1', '2', '3', '4', '5', '6']);
                            }}
                          >
                            <Text style={styles.demoPillName}>{cust.name}</Text>
                            <Text style={styles.demoPillPhone}>
                              {cust.phone} · {cust.desc}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.otpHeader}>
                      <Text style={styles.cardHeading}>Verification code 🔢</Text>
                      <Text style={styles.cardSubtext}>
                        Sent to <Text style={{ color: '#0F172A', fontWeight: '700' }}>+91 {phoneNumber}</Text>
                      </Text>
                      <Text style={styles.demoHint}>
                        💡 Demo code is <Text style={{ fontWeight: '800' }}>123456</Text>
                      </Text>
                    </View>

                    {/* Compact, Beautifully Sized OTP Boxes */}
                    <View style={styles.otpBoxesRow}>
                      {otp.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => {
                            otpRefs.current[index] = ref;
                          }}
                          style={[
                            styles.otpBox,
                            digit ? styles.otpBoxFilled : undefined,
                          ]}
                          maxLength={1}
                          keyboardType="number-pad"
                          value={digit}
                          onChangeText={(text) => handleOTPChange(text, index)}
                          onKeyPress={({ nativeEvent }) =>
                            handleOTPKeyPress(nativeEvent.key, index)
                          }
                          autoFocus={index === 0}
                          selectTextOnFocus
                        />
                      ))}
                    </View>

                    {/* Verify & Enter Button */}
                    <Pressable
                      style={[
                        styles.primaryButton,
                        loading && styles.buttonDisabled,
                      ]}
                      onPress={() => handleVerifyOTP()}
                      disabled={loading}
                    >
                      <Text style={styles.primaryButtonText}>
                        {loading ? 'Verifying…' : 'Verify & Enter Portal'}
                      </Text>
                    </Pressable>

                    {/* Resend & Change Phone Actions */}
                    <View style={styles.otpFooterActions}>
                      {countdown > 0 ? (
                        <Text style={styles.countdownText}>
                          Resend code in {countdown}s
                        </Text>
                      ) : (
                        <Pressable onPress={handleSendOTP}>
                          <Text style={styles.resendLink}>Resend OTP</Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => {
                          setStep('phone');
                          setOTP(['', '', '', '', '', '']);
                        }}
                      >
                        <Text style={styles.changePhoneLink}>← Change Number</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* ================= SunFlow Team Flow ================= */}
            {activeTab === 'team' && (
              <View style={styles.tabContent}>
                <Text style={styles.cardHeading}>SunFlow Team Workspace</Text>
                <Text style={styles.cardSubtext}>
                  Choose your role to open the technician or staff portal
                </Text>

                <View style={styles.staffGrid}>
                  {STAFF_ROLES.map((staff) => {
                    const isSelected = selectedStaff === staff.username;
                    return (
                      <Pressable
                        key={staff.username}
                        style={[
                          styles.staffCard,
                          isSelected && styles.staffCardSelected,
                        ]}
                        onPress={() => setSelectedStaff(staff.username)}
                      >
                        <View style={styles.staffIconWrap}>
                          <Text style={styles.staffEmoji}>{staff.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.staffTitleRow}>
                            <Text style={styles.staffName}>{staff.name}</Text>
                            {isSelected && (
                              <View style={styles.selectedCheck}>
                                <Text style={styles.checkText}>✓</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.staffRoleTitle}>{staff.title}</Text>
                          <Text style={styles.staffDesc}>{staff.desc}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Continue as Role Button */}
                <Pressable
                  style={[
                    styles.primaryButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleStaffLogin}
                  disabled={loading}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading
                      ? 'Authenticating…'
                      : `Continue as ${STAFF_ROLES.find((s) => s.username === selectedStaff)?.name} →`}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Quick Direct Link to Technician Page */}
          <Pressable
            style={styles.technicianDirectBadge}
            onPress={() => router.push('/technician')}
          >
            <Text style={styles.techBadgeIcon}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.techBadgeTitle}>Technician Field Workspace</Text>
              <Text style={styles.techBadgeSub}>
                Capture camera photos & verify solar installations
              </Text>
            </View>
            <Text style={styles.techBadgeArrow}>→</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 184, 120, 0.12)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F4C542',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    marginBottom: 10,
  },
  backendStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  backendStatusText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0D2B20',
    fontWeight: '800',
  },
  tabContent: {
    paddingTop: 4,
  },
  cardHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 18,
  },
  inputLabelRow: {
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 16,
  },
  countryCodeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#EDF2F7',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  demoSection: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  demoPillsRow: {
    gap: 8,
  },
  demoPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  demoPillName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  demoPillPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  // OTP Styles - Fixed & Compact Sizing
  otpHeader: {
    marginBottom: 16,
  },
  demoHint: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 18,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpBoxFilled: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  otpFooterActions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
  },
  changePhoneLink: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  // Staff Selection Styles
  staffGrid: {
    gap: 10,
    marginBottom: 18,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  staffCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  staffIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffEmoji: {
    fontSize: 18,
  },
  staffTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  staffRoleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginTop: 1,
  },
  staffDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  technicianDirectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 18,
    padding: 14,
  },
  techBadgeIcon: {
    fontSize: 22,
  },
  techBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  techBadgeSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  techBadgeArrow: {
    fontSize: 16,
    color: '#F4C542',
    fontWeight: '800',
  },
});
