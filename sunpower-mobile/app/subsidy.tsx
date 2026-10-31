import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clay3DCard } from '@/components/ui/Clay3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme';

export default function SubsidyScreen() {
  const router = useRouter();

  const stages = [
    {
      step: '01',
      title: 'Rooftop Feasibility Clearance',
      desc: 'DISCOM verified technical load sanction and grid feeder feasibility.',
      date: 'Cleared Oct 18, 2026',
      status: 'completed',
    },
    {
      step: '02',
      title: 'EPC Installation & PCR Upload',
      desc: 'Vendor uploads equipment serials, module photos & generation capacity.',
      date: 'Underway (Current Stage)',
      status: 'current',
    },
    {
      step: '03',
      title: 'DISCOM Net Meter & JIR Signoff',
      desc: 'Joint Inspection Report (JIR) by DISCOM officer verifying bi-directional meter.',
      date: 'Scheduled Nov 05, 2026',
      status: 'upcoming',
    },
    {
      step: '04',
      title: 'Direct Benefit Transfer (DBT)',
      desc: '₹78,000 credited directly into Aadhaar-linked bank account via PFMS.',
      date: 'Estimated Nov 25, 2026',
      status: 'upcoming',
    },
  ];

  const handlePortalCheck = () => {
    Alert.alert(
      'National Portal PM Surya Ghar',
      'Redirecting to pmsuryaghar.gov.in portal tracking for Application #PM-SGMBY-2026-981245?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Visit Portal', onPress: () => Linking.openURL('https://pmsuryaghar.gov.in') },
      ]
    );
  };

  return (
    <LinearGradient colors={colors.background.gradient} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.navTitle}>PM Surya Ghar Subsidy 🏛️</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Subsidy Hero Card */}
        <Clay3DCard variant="gradient" shadowSize="lg" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.schemeTag}>CENTRAL FINANCIAL ASSISTANCE (CFA)</Text>
              <Text style={styles.schemeTitle}>₹78,000 Grant Approved</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          </View>

          <Text style={styles.heroSub}>
            PM Surya Ghar: Muft Bijli Yojana direct bank transfer pipeline
          </Text>

          <View style={styles.bankDetailBox}>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Beneficiary:</Text>
              <Text style={styles.bankVal}>Viraj Sharma</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Application Ref:</Text>
              <Text style={styles.bankVal}>PM-SGMBY-2026-981245</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Linked Bank Account:</Text>
              <Text style={styles.bankVal}>HDFC Bank (A/C: •••• 4109)</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>NPCI Aadhaar Seeding:</Text>
              <Text style={[styles.bankVal, { color: colors.eco.mint }]}>Active & Verified ✓</Text>
            </View>
          </View>
        </Clay3DCard>

        {/* Action Button */}
        <Button
          title="🌐 Check National Portal Status"
          onPress={handlePortalCheck}
          variant="secondary"
          size="md"
          style={styles.portalBtn}
        />

        {/* Pipeline Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DBT Disbursal Progress 📍</Text>
          <Text style={styles.sectionSub}>4-stage government verification process</Text>
        </View>

        <View style={styles.timelineList}>
          {stages.map((stage, idx) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';

            return (
              <View key={stage.step} style={styles.timelineItem}>
                <View style={styles.indicatorCol}>
                  <View
                    style={[
                      styles.nodeDot,
                      isCompleted && styles.nodeDotCompleted,
                      isCurrent && styles.nodeDotCurrent,
                    ]}
                  >
                    {isCompleted ? (
                      <Text style={styles.nodeCheck}>✓</Text>
                    ) : isCurrent ? (
                      <View style={styles.innerDot} />
                    ) : (
                      <Text style={styles.nodeNum}>{stage.step}</Text>
                    )}
                  </View>
                  {idx < stages.length - 1 && (
                    <View
                      style={[
                        styles.connectorLine,
                        isCompleted && styles.connectorLineCompleted,
                      ]}
                    />
                  )}
                </View>

                <View style={styles.cardCol}>
                  <Clay3DCard
                    style={[
                      styles.stageCard,
                      isCurrent && styles.stageCardCurrent,
                    ]}
                  >
                    <View style={styles.stageHeader}>
                      <Text style={styles.stageTitle}>
                        STAGE {stage.step}: {stage.title}
                      </Text>
                    </View>
                    <Text style={styles.stageDesc}>{stage.desc}</Text>
                    <Text
                      style={[
                        styles.stageDate,
                        isCurrent && styles.stageDateCurrent,
                        isCompleted && styles.stageDateCompleted,
                      ]}
                    >
                      {stage.date}
                    </Text>
                  </Clay3DCard>
                </View>
              </View>
            );
          })}
        </View>

        {/* Subsidy Guidelines Box */}
        <GlassCard style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Important Subsidy Facts</Text>
          <Text style={styles.infoText}>
            • The ₹78,000 subsidy is 100% non-repayable central grant provided directly by Ministry of New and Renewable Energy (MNRE).{'\n'}
            • Funds are disbursed directly via PFMS (Public Financial Management System) into your bank account within 30 days of net meter synchronization.{'\n'}
            • Zero paperwork needed from you — our SunPower regulatory compliance team handles all uploads.
          </Text>
        </GlassCard>
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
  heroCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  schemeTag: {
    ...typography.small,
    fontSize: 10,
    color: colors.white,
    opacity: 0.85,
    fontWeight: '700',
    letterSpacing: 1,
  },
  schemeTitle: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: colors.eco.mint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  verifiedText: {
    ...typography.small,
    fontSize: 11,
    color: colors.text.primary,
    fontWeight: '700',
  },
  heroSub: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.md,
  },
  bankDetailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankLabel: {
    ...typography.small,
    color: colors.white,
    opacity: 0.8,
  },
  bankVal: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  portalBtn: {
    marginBottom: spacing.xl,
  },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  sectionSub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  timelineList: {
    marginBottom: spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  indicatorCol: {
    width: 36,
    alignItems: 'center',
  },
  nodeDot: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeDotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  nodeDotCurrent: {
    borderColor: colors.primary.violet,
    borderWidth: 3,
    backgroundColor: colors.white,
  },
  nodeCheck: { color: colors.white, fontSize: 16, fontWeight: '700' },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary.violet,
  },
  nodeNum: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  connectorLine: {
    width: 3,
    flex: 1,
    backgroundColor: colors.gray[300],
    marginTop: -2,
    marginBottom: -2,
  },
  connectorLineCompleted: { backgroundColor: colors.success },
  cardCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  stageCard: {
    padding: spacing.md,
  },
  stageCardCurrent: {
    borderColor: colors.primary.violet,
    borderWidth: 2,
  },
  stageHeader: {
    marginBottom: 4,
  },
  stageTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  stageDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  stageDate: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  stageDateCurrent: {
    color: colors.primary.violet,
  },
  stageDateCompleted: {
    color: colors.eco.forest,
  },
  infoBox: {
    padding: spacing.lg,
  },
  infoTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
