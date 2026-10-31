import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clay3DCard } from '@/components/ui/Clay3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface AssetEquipment {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  model: string;
  warrantyYears: string;
  status: 'Optimal' | 'Active' | 'Tested';
  specs: { label: string; value: string }[];
}

export default function AssetsScreen() {
  const router = useRouter();

  const equipmentList: AssetEquipment[] = [
    {
      id: 'EQ-PANEL-01',
      name: 'SunPower Maxeon 450W Bifacial Panels',
      category: 'Solar PV Modules (12 Units)',
      serialNumber: 'SP-2026-BIF-8801 through 8812',
      model: 'SP-MAX-450-BF-G12',
      warrantyYears: '25-Year Linear Warranty',
      status: 'Optimal',
      specs: [
        { label: 'Module Efficiency', value: '21.8% Peak' },
        { label: 'Bifaciality Factor', value: '70% ± 5%' },
        { label: 'Annual Degradation', value: '< 0.55% / Year' },
        { label: 'Hail / Wind Rating', value: '2400 Pa / 5400 Pa' },
      ],
    },
    {
      id: 'EQ-INV-01',
      name: 'Sungrow 5kW Dual-MPPT Smart Inverter',
      category: 'Power Conditioning Unit',
      serialNumber: 'SG-2026-INV-5KW-9942',
      model: 'SG5.0RS-V2 (Wi-Fi Enabled)',
      warrantyYears: '10-Year Full Guarantee',
      status: 'Active',
      specs: [
        { label: 'Max Inverter Efficiency', value: '98.4%' },
        { label: 'MPPT Tracking Voltage', value: '80V - 560V' },
        { label: 'Cooling Method', value: 'Natural Smart Convection' },
        { label: 'Integrated Protections', value: 'DC Arc-Fault (AFCI) & SPD' },
      ],
    },
    {
      id: 'EQ-METER-01',
      name: 'L&T Bi-Directional Net Meter',
      category: 'Smart Grid Metering Register',
      serialNumber: 'LT-NM-2026-44109',
      model: 'ER300P 3-Phase 4-Wire Class 1.0',
      warrantyYears: '5-Year DISCOM Guarantee',
      status: 'Tested',
      specs: [
        { label: 'Accuracy Class', value: 'Class 1.0' },
        { label: 'Registers', value: 'Import, Export, Net kWh' },
        { label: 'Optical Interface', value: 'DLMS/COSEM Protocol' },
        { label: 'Testing Standard', value: 'IS 13779 / IEC 62053' },
      ],
    },
    {
      id: 'EQ-EARTH-01',
      name: 'Chemical Compound Earthing & Lightning Arrester',
      category: 'Safety & Lightning Protection',
      serialNumber: 'SP-SAFE-EARTH-PIT-1/2/3',
      model: '3-Pit Solid Copper Bonded Rods',
      warrantyYears: '15-Year Life Expectancy',
      status: 'Optimal',
      specs: [
        { label: 'Measured Soil Resistance', value: '1.2 Ohms (Pass < 2Ω)' },
        { label: 'Lightning Arrester Radius', value: '45-Meter Cone of Protection' },
        { label: 'DC & AC SPD Class', value: 'Type II 40kA Surge Capacity' },
      ],
    },
  ];

  const handleDownloadCertificate = (item: AssetEquipment) => {
    Alert.alert(
      'Warranty Certificate Ready',
      `Official Manufacturer Warranty Document for ${item.name} (${item.serialNumber}) ready for download.`,
      [{ text: 'Download' }]
    );
  };

  return (
    <LinearGradient colors={colors.background.gradient} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.navTitle}>Assets & Warranties 🛡️</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* System Summary Card */}
        <Clay3DCard variant="gradient" shadowSize="lg" style={styles.summaryCard}>
          <Text style={styles.summaryBadge}>HARDWARE REGISTRY</Text>
          <Text style={styles.summaryTitle}>5.4 kW Bifacial Solar Array</Text>
          <Text style={styles.summarySub}>All components Tier-1 certified with active factory warranties</Text>

          <View style={styles.statPillsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillVal}>4 Active</Text>
              <Text style={styles.statPillLbl}>Equipment Units</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillVal}>25 Yrs</Text>
              <Text style={styles.statPillLbl}>Peak Warranty</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillVal}>100%</Text>
              <Text style={styles.statPillLbl}>Health Score</Text>
            </View>
          </View>
        </Clay3DCard>

        {/* Equipment Cards List */}
        <View style={styles.equipmentList}>
          {equipmentList.map((eq) => (
            <Clay3DCard key={eq.id} style={styles.equipmentCard}>
              <View style={styles.equipmentHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eqCategory}>{eq.category}</Text>
                  <Text style={styles.eqName}>{eq.name}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>● {eq.status}</Text>
                </View>
              </View>

              <View style={styles.serialBox}>
                <Text style={styles.serialLabel}>Serial Number:</Text>
                <Text style={styles.serialValue}>{eq.serialNumber}</Text>
              </View>

              <View style={styles.specsGrid}>
                {eq.specs.map((spec, i) => (
                  <View key={i} style={styles.specItem}>
                    <Text style={styles.specLabel}>{spec.label}</Text>
                    <Text style={styles.specValue}>{spec.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.warrantyFooter}>
                <View style={styles.warrantyBadge}>
                  <Text style={styles.warrantyIcon}>🛡️</Text>
                  <Text style={styles.warrantyText}>{eq.warrantyYears}</Text>
                </View>
                <Pressable onPress={() => handleDownloadCertificate(eq)} style={styles.certButton}>
                  <Text style={styles.certButtonText}>Certificate 📜</Text>
                </Pressable>
              </View>
            </Clay3DCard>
          ))}
        </View>

        <GlassCard style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>✅ BIS & MNRE Certified</Text>
          <Text style={styles.complianceDesc}>
            All hardware components comply with Ministry of New and Renewable Energy (MNRE) Approved Models and Manufacturers of Solar Photovoltaic Modules (ALMM).
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
  summaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryBadge: {
    ...typography.small,
    color: colors.white,
    opacity: 0.85,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryTitle: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
  },
  summarySub: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  statPillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statPillVal: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
  statPillLbl: {
    ...typography.small,
    fontSize: 10,
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  equipmentList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  equipmentCard: {
    padding: spacing.md,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eqCategory: {
    ...typography.small,
    color: colors.primary.violet,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eqName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.eco.leaf + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  statusBadgeText: {
    ...typography.small,
    color: colors.eco.forest,
    fontWeight: '700',
  },
  serialBox: {
    backgroundColor: colors.gray[100],
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  serialLabel: {
    ...typography.small,
    fontSize: 11,
    color: colors.text.secondary,
  },
  serialValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  specsGrid: {
    gap: 6,
    marginBottom: spacing.md,
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specLabel: {
    ...typography.small,
    color: colors.text.secondary,
  },
  specValue: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text.primary,
  },
  warrantyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  warrantyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warrantyIcon: { fontSize: 16 },
  warrantyText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.primary.violet,
  },
  certButton: {
    backgroundColor: colors.clay.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primary.violet,
  },
  certButtonText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.primary.violet,
  },
  complianceCard: {
    padding: spacing.md,
  },
  complianceTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  complianceDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
