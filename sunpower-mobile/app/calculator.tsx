import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clay3DCard } from '@/components/ui/Clay3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { SafeStorage } from '@/services/storage';
import { syncMobileConversationToCRM } from '@/services/crmSync';

export default function SolarCalculatorScreen() {
  const router = useRouter();

  // State
  const [monthlyBill, setMonthlyBill] = useState(4500); // ₹
  const [roofArea, setRoofArea] = useState(450); // sq.ft

  // Solar mathematical models:
  // Average tariff in India: ~₹8/unit
  // Monthly units = monthlyBill / 8
  // 1 kW solar generates ~120 units/month in India
  // Required kW = monthlyUnits / 120
  // Each kW requires ~80-90 sq.ft
  const monthlyUnits = Math.round(monthlyBill / 8);
  const rawKwNeeded = monthlyUnits / 120;
  const maxKwByRoof = roofArea / 85;
  const recommendedKw = Math.min(Math.max(Math.round(rawKwNeeded * 10) / 10, 1.0), Math.round(maxKwByRoof * 10) / 10);

  // Subsidy calculation (PM Surya Ghar rules):
  // Up to 1 kW: ₹30,000
  // Up to 2 kW: ₹60,000
  // 3 kW and above: ₹78,000
  let subsidy = 0;
  if (recommendedKw >= 3.0) {
    subsidy = 78000;
  } else if (recommendedKw >= 2.0) {
    subsidy = 60000;
  } else {
    subsidy = 30000;
  }

  // Cost estimates: ~₹55,000 / kW (Tier 1 Bifacial + Smart Inverter)
  const totalCost = Math.round(recommendedKw * 58000);
  const netInvestment = Math.max(totalCost - subsidy, 15000);

  const annualSavings = Math.round(recommendedKw * 120 * 12 * 8 * 0.95);
  const paybackYears = Math.round((netInvestment / annualSavings) * 10) / 10;
  const lifetimeSavings25Yrs = Math.round(annualSavings * 25 * 0.92);
  const co2OffsetTons = Math.round(recommendedKw * 1.3 * 10) / 10;
  const treesPlanted = Math.round(co2OffsetTons * 45);

  const handleRequestQuote = async () => {
    let userName = 'Rahul Sharma';
    let userPhone = '9876543210';
    let userEmail = 'rahul@gmail.com';
    let userCity = 'Pune';

    try {
      const profileRaw = await SafeStorage.getItem('user_profile');
      const dataRaw = await SafeStorage.getItem('user_data');
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        userName = p.fullName || p.name || userName;
        userPhone = p.phone || userPhone;
        userEmail = p.email || userEmail;
      } else if (dataRaw) {
        const d = JSON.parse(dataRaw);
        userName = d.name || userName;
        userPhone = d.phone || userPhone;
      }
    } catch {}

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const convId = `CALC-LEAD-${Date.now().toString(36).toUpperCase()}`;

    // Create lead in CRM database
    const syncRes = await syncMobileConversationToCRM({
      customerName: userName,
      customerPhone: userPhone,
      customerEmail: userEmail,
      city: userCity,
      language: 'English',
      propertyType: 'Residential',
      monthlyBill,
      roofArea,
      capacity: recommendedKw,
      systemType: 'On-Grid',
      callDurationSeconds: 0,
      conversationId: convId,
      messages: [
        {
          role: 'user',
          text: `Calculated solar requirement: Monthly bill ₹${monthlyBill.toLocaleString('en-IN')}, Roof area ${roofArea} sq.ft. Recommended system: ${recommendedKw} kW.`,
          time: now,
        },
        {
          role: 'agent',
          text: `System quote: ${recommendedKw} kW On-Grid. Est Investment: ₹${netInvestment.toLocaleString('en-IN')} (Subsidy: ₹${subsidy.toLocaleString('en-IN')}). Expected Annual Savings: ₹${annualSavings.toLocaleString('en-IN')}.`,
          time: now,
        },
      ],
    });

    const leadRef = syncRes.leadId ? ` (${syncRes.leadId})` : '';

    Alert.alert(
      'Site Survey & Quotation Confirmed! ☀️',
      `Engineering specifications for a ${recommendedKw} kW system with ₹${subsidy.toLocaleString()} subsidy have been submitted directly to the SunFlow 360 Sales CRM${leadRef}. Our technical advisor will contact you within 2 hours.`,
      [{ text: 'View Documents', onPress: () => router.push('/documents' as any) }]
    );
  };

  const adjustBill = (delta: number) => {
    setMonthlyBill((prev) => Math.min(Math.max(prev + delta, 1000), 25000));
  };

  const adjustRoof = (delta: number) => {
    setRoofArea((prev) => Math.min(Math.max(prev + delta, 100), 2500));
  };

  return (
    <LinearGradient colors={colors.background.gradient} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.navTitle}>Solar Calculator 🧮</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Result Card */}
        <Clay3DCard variant="gradient" shadowSize="lg" style={styles.resultCard}>
          <Text style={styles.resultBadge}>RECOMMENDED SYSTEM SIZE</Text>
          <Text style={styles.resultKw}>{recommendedKw} kW Solar Array</Text>
          <Text style={styles.resultSub}>Generates ~{Math.round(recommendedKw * 120)} kWh electricity per month</Text>

          <View style={styles.savingsRow}>
            <View style={styles.savingItem}>
              <Text style={styles.savingVal}>₹{annualSavings.toLocaleString()}</Text>
              <Text style={styles.savingLbl}>Annual Savings</Text>
            </View>
            <View style={styles.savingDivider} />
            <View style={styles.savingItem}>
              <Text style={styles.savingVal}>₹{subsidy.toLocaleString()}</Text>
              <Text style={styles.savingLbl}>Govt Subsidy</Text>
            </View>
            <View style={styles.savingDivider} />
            <View style={styles.savingItem}>
              <Text style={styles.savingVal}>{paybackYears} Yrs</Text>
              <Text style={styles.savingLbl}>Payback ROI</Text>
            </View>
          </View>
        </Clay3DCard>

        {/* Input Card 1: Monthly Electricity Bill */}
        <Clay3DCard style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <Text style={styles.inputTitle}>Average Monthly Electricity Bill</Text>
            <Text style={styles.inputValue}>₹{monthlyBill.toLocaleString()}</Text>
          </View>
          <Text style={styles.inputHint}>Around ~{monthlyUnits} units consumed per billing cycle</Text>

          <View style={styles.stepperRow}>
            <Pressable onPress={() => adjustBill(-1000)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>- ₹1,000</Text>
            </Pressable>
            <Pressable onPress={() => adjustBill(-500)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>- ₹500</Text>
            </Pressable>
            <Pressable onPress={() => adjustBill(500)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+ ₹500</Text>
            </Pressable>
            <Pressable onPress={() => adjustBill(1000)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+ ₹1,000</Text>
            </Pressable>
          </View>
        </Clay3DCard>

        {/* Input Card 2: Rooftop Space */}
        <Clay3DCard style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <Text style={styles.inputTitle}>Available Shadow-Free Roof Area</Text>
            <Text style={styles.inputValue}>{roofArea} sq.ft</Text>
          </View>
          <Text style={styles.inputHint}>
            Supports up to {Math.round(maxKwByRoof * 10) / 10} kW bifacial module mounting
          </Text>

          <View style={styles.stepperRow}>
            <Pressable onPress={() => adjustRoof(-100)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>- 100 sq.ft</Text>
            </Pressable>
            <Pressable onPress={() => adjustRoof(-50)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>- 50 sq.ft</Text>
            </Pressable>
            <Pressable onPress={() => adjustRoof(50)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+ 50 sq.ft</Text>
            </Pressable>
            <Pressable onPress={() => adjustRoof(100)} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+ 100 sq.ft</Text>
            </Pressable>
          </View>
        </Clay3DCard>

        {/* Financial Breakdown Card */}
        <Clay3DCard style={styles.financeCard}>
          <Text style={styles.financeTitle}>Financial & Investment Breakdown</Text>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Total Estimated EPC System Cost:</Text>
            <Text style={styles.financeVal}>₹{totalCost.toLocaleString()}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>PM Surya Ghar Govt Subsidy (Direct Grant):</Text>
            <Text style={[styles.financeVal, { color: colors.eco.forest }]}>- ₹{subsidy.toLocaleString()}</Text>
          </View>
          <View style={[styles.financeRow, styles.financeTotalRow]}>
            <Text style={styles.financeTotalLabel}>Your Net Effective Cost:</Text>
            <Text style={styles.financeTotalVal}>₹{netInvestment.toLocaleString()}</Text>
          </View>

          <View style={styles.lifetimeBox}>
            <Text style={styles.lifetimeLabel}>Estimated 25-Year Lifetime Savings:</Text>
            <Text style={styles.lifetimeVal}>₹{lifetimeSavings25Yrs.toLocaleString()}</Text>
          </View>
        </Clay3DCard>

        {/* Environmental Impact Card */}
        <GlassCard style={styles.ecoCard}>
          <Text style={styles.ecoTitle}>🌱 Your Lifetime Environmental Impact</Text>
          <View style={styles.ecoStatsRow}>
            <View style={styles.ecoItem}>
              <Text style={styles.ecoVal}>{co2OffsetTons} Tons</Text>
              <Text style={styles.ecoLbl}>CO2 Offset/Year</Text>
            </View>
            <View style={styles.ecoDivider} />
            <View style={styles.ecoItem}>
              <Text style={styles.ecoVal}>{treesPlanted} 🌳</Text>
              <Text style={styles.ecoLbl}>Trees Equivalent</Text>
            </View>
          </View>
        </GlassCard>

        {/* Action Button */}
        <Button
          title="Get Detailed Quotation & Survey 🚀"
          onPress={handleRequestQuote}
          variant="gradient"
          size="lg"
          style={styles.quoteBtn}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 22, color: colors.primary.violet, fontWeight: '700' },
  navTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  resultCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  resultBadge: {
    ...typography.small,
    fontSize: 10,
    color: colors.white,
    opacity: 0.85,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultKw: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '700',
  },
  resultSub: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  savingItem: { flex: 1, alignItems: 'center' },
  savingVal: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
  savingLbl: {
    ...typography.small,
    fontSize: 10,
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  savingDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  inputCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  inputCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  inputValue: {
    ...typography.h3,
    color: colors.primary.violet,
    fontWeight: '700',
  },
  inputHint: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepBtn: {
    flex: 1,
    backgroundColor: colors.clay.light,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primary.ripple,
  },
  stepBtnText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.violet,
  },
  financeCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  financeTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  financeLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  financeVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  financeTotalRow: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  financeTotalLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  financeTotalVal: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.primary.violet,
  },
  lifetimeBox: {
    backgroundColor: colors.clay.light,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lifetimeLabel: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  lifetimeVal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.eco.forest,
  },
  ecoCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  ecoTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  ecoStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ecoItem: { alignItems: 'center' },
  ecoVal: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.eco.forest,
  },
  ecoLbl: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  ecoDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.gray[300],
  },
  quoteBtn: {
    marginBottom: spacing.xl,
  },
});
