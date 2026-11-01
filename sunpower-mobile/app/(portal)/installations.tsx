import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clay3DCard } from '@/components/ui/Clay3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface Milestone {
  id: number;
  stageNumber: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  details: string[];
  engineer?: string;
  documentRef?: string;
}

export default function InstallationsScreen() {
  const [expandedId, setExpandedId] = useState<number | null>(4); // default expand current stage

  const milestones: Milestone[] = [
    {
      id: 1,
      stageNumber: '01',
      title: 'Site Survey & Roof Shadow 3D Analysis',
      description: 'Complete rooftop structural integrity and drone solar irradiation scan.',
      date: 'Completed Oct 12, 2026',
      status: 'completed',
      details: [
        'Rooftop usable area: 420 sq.ft (South-facing slope optimal)',
        'Shadow-free peak sun hours: 5.4 hrs/day',
        'Structural load capacity confirmed: >65 kg/sq.m (RCC slab passed)',
      ],
      engineer: 'Er. Rajesh Menon (Civil & Solar Auditor)',
      documentRef: 'Site_Survey_Report_V3.pdf',
    },
    {
      id: 2,
      stageNumber: '02',
      title: 'DISCOM Net Metering NOC & Sanction',
      description: 'Regulatory grid connectivity approval from State Electricity Board.',
      date: 'Completed Oct 18, 2026',
      status: 'completed',
      details: [
        'Application Reference: DISCOM-DEL-2026-9842',
        'Sanctioned load capacity: 5.0 kW Bifacial Solar',
        'Feasibility clearance: Approved with zero grid congestion',
      ],
      engineer: 'DISCOM Division Inspectorate',
      documentRef: 'DISCOM_Grid_Feasibility_NOC.pdf',
    },
    {
      id: 3,
      stageNumber: '03',
      title: 'Structure Mounting & Panel Installation',
      description: 'Hot-dip galvanized mounting structure assembly & 12 bifacial modules mounted.',
      date: 'Completed Oct 25, 2026',
      status: 'completed',
      details: [
        '12x SunPower 450W Monocrystalline Bifacial Modules mounted',
        'Tilt angle calibrated at 28° South for peak seasonal efficiency',
        'Heavy-duty wind resistance tested up to 150 km/h gusts',
      ],
      engineer: 'Lead Installer: Suresh Verma',
      documentRef: 'Mounting_Structure_Warranty.pdf',
    },
    {
      id: 4,
      stageNumber: '04',
      title: 'Inverter Wiring & Chemical Earthing',
      description: 'Dual MPPT hybrid inverter wiring, DC/AC safety boxes, and 3 earthing pits.',
      date: 'In Progress • Oct 31, 2026',
      status: 'in_progress',
      details: [
        '5 kW Smart Grid-Tie Inverter cabling & Wi-Fi logger setup',
        '3x Copper-bonded chemical earthing pits (Inverter, DC, Lightning)',
        'Type-II DC Surge Protection Device (SPD) & MCB enclosure integration',
      ],
      engineer: 'Senior Electrical Lead: Vikram Sharma',
      documentRef: 'Electrical_Single_Line_Diagram.pdf',
    },
    {
      id: 5,
      stageNumber: '05',
      title: 'DISCOM Bi-Directional Net Meter Swapping',
      description: 'DISCOM engineer on-site replacement of existing meter with Smart Bi-directional meter.',
      date: 'Scheduled: Nov 05, 2026',
      status: 'upcoming',
      details: [
        'Dual-register meter counts energy imported vs energy exported to grid',
        'Automatic optical pulse communication test with discom billing servers',
      ],
    },
    {
      id: 6,
      stageNumber: '06',
      title: 'Grid Sync & PM Surya Ghar Subsidy Inspection',
      description: 'Final commissioning, official generation test, and central govt DBT inspection.',
      date: 'Scheduled: Nov 10, 2026',
      status: 'upcoming',
      details: [
        'Full load testing under peak midday sun irradiation',
        'National Portal PM Surya Ghar inspection signoff for ₹78,000 DBT transfer',
      ],
    },
  ];

  const handleCallEngineer = () => {
    Linking.openURL('tel:+919811234567');
  };

  const handleDownloadDoc = (docName: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`Document Download\nSimulating download of ${docName}. File is cryptographically signed.`);
    } else {
      Alert.alert('Document Ready', `Simulating download of ${docName}. File is stored in offline vault.`);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <LinearGradient colors={['#0D2B20', '#133E2E', '#0B231A']} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBadge}>PROJECT ID: SP-2026-DEL-041</Text>
          <Text style={styles.headerTitle}>Installation Tracker 🚀</Text>
          <Text style={styles.headerSubtitle}>
            Live real-time milestone telemetry for your 5.4 kW solar rooftop system
          </Text>
        </View>

        {/* Overall System Overview Card */}
        <Clay3DCard variant="gradient" shadowSize="lg" style={styles.systemCard}>
          <View style={styles.systemHeader}>
            <View style={styles.systemTitleBox}>
              <Text style={styles.systemTitle}>5.4 kW Bifacial Solar</Text>
              <Text style={styles.systemSubtitle}>12 Panels · Dual MPPT Inverter</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Stage 4 of 6 Active</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: '68%' }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressPercent}>68% Completed</Text>
              <Text style={styles.progressTarget}>Grid Sync: Nov 10</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>12</Text>
              <Text style={styles.metricLabel}>Panels</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>5.4 kW</Text>
              <Text style={styles.metricLabel}>Capacity</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>₹78,000</Text>
              <Text style={styles.metricLabel}>Govt Subsidy</Text>
            </View>
          </View>
        </Clay3DCard>

        {/* Lead Engineer Card */}
        <Clay3DCard style={styles.engineerCard}>
          <View style={styles.engineerRow}>
            <View style={styles.engineerAvatar}>
              <Text style={styles.avatarEmoji}>👷‍♂️</Text>
            </View>
            <View style={styles.engineerInfo}>
              <Text style={styles.engineerRole}>Assigned Project Lead</Text>
              <Text style={styles.engineerName}>Vikram Sharma</Text>
              <Text style={styles.engineerBadge}>★ 4.98 • 180+ Solar Installs</Text>
            </View>
          </View>
          <View style={styles.engineerActions}>
            <Pressable style={styles.callLeadBtn} onPress={handleCallEngineer}>
              <Text style={styles.callLeadText}>📞 Call Lead</Text>
            </Pressable>
            <Pressable
              style={styles.whatsappLeadBtn}
              onPress={() => Linking.openURL('https://wa.me/919811234567')}
            >
              <Text style={styles.whatsappLeadText}>💬 WhatsApp Desk</Text>
            </Pressable>
          </View>
        </Clay3DCard>

        {/* Milestones Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Milestone Progression 📍</Text>
          <Text style={styles.sectionHint}>Tap any milestone to view inspection logs & verified docs</Text>
        </View>

        <View style={styles.timelineContainer}>
          {milestones.map((item, index) => {
            const isExpanded = expandedId === item.id;
            const isCompleted = item.status === 'completed';
            const isInProgress = item.status === 'in_progress';

            return (
              <Pressable
                key={item.id}
                onPress={() => toggleExpand(item.id)}
                style={styles.milestoneWrapper}
              >
                {/* Timeline connector track */}
                <View style={styles.trackColumn}>
                  <View
                    style={[
                      styles.timelineNode,
                      isCompleted && styles.nodeCompleted,
                      isInProgress && styles.nodeInProgress,
                    ]}
                  >
                    {isCompleted ? (
                      <Text style={styles.checkIcon}>✓</Text>
                    ) : isInProgress ? (
                      <View style={styles.pulseDot} />
                    ) : (
                      <Text style={styles.nodeNumber}>{item.stageNumber}</Text>
                    )}
                  </View>
                  {index < milestones.length - 1 && (
                    <View
                      style={[
                        styles.trackLine,
                        isCompleted && styles.trackLineCompleted,
                      ]}
                    />
                  )}
                </View>

                {/* Milestone Content Card */}
                <View style={styles.milestoneCardContainer}>
                  <Clay3DCard
                    style={[
                      styles.milestoneCard,
                      isInProgress && styles.activeMilestoneCard,
                    ]}
                  >
                    <View style={styles.milestoneHeader}>
                      <View style={styles.titleArea}>
                        <View style={styles.stageTagRow}>
                          <Text style={styles.stageTag}>STAGE {item.stageNumber}</Text>
                          <View
                            style={[
                              styles.statusPill,
                              isCompleted && styles.statusPillCompleted,
                              isInProgress && styles.statusPillInProgress,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                isCompleted && styles.statusPillTextCompleted,
                                isInProgress && styles.statusPillTextInProgress,
                              ]}
                            >
                              {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.milestoneTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.milestoneDate}>{item.date}</Text>
                      </View>
                      <View style={styles.expandChevronBox}>
                        <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </View>

                    <Text style={styles.milestoneDesc}>{item.description}</Text>

                    {/* Expandable Inspection Details */}
                    {isExpanded && (
                      <View style={styles.expandedDetails}>
                        <View style={styles.detailList}>
                          {item.details.map((detail, idx) => (
                            <View key={idx} style={styles.detailRow}>
                              <Text style={styles.bulletDot}>•</Text>
                              <Text style={styles.detailText}>{detail}</Text>
                            </View>
                          ))}
                        </View>

                        {item.engineer && (
                          <View style={styles.inspectorRow}>
                            <Text style={styles.inspectorLabel}>Certified by: </Text>
                            <Text style={styles.inspectorName}>{item.engineer}</Text>
                          </View>
                        )}

                        {item.documentRef && (
                          <Pressable
                            onPress={() => handleDownloadDoc(item.documentRef!)}
                            style={styles.docDownloadBtn}
                          >
                            <Text style={styles.docIcon}>📄</Text>
                            <Text style={styles.docText} numberOfLines={1} ellipsizeMode="middle">
                              {item.documentRef}
                            </Text>
                            <Text style={styles.downloadArrow}>↓</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </Clay3DCard>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Live Site Equipment Photos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rooftop Site Inspection Photos 📸</Text>
          <Text style={styles.sectionHint}>Field engineer photos verified with GPS watermark</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.galleryScroll}
        >
          <GlassCard style={styles.photoCard}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>☀️</Text>
              <Text style={styles.photoCaption}>Bifacial Solar Array</Text>
              <Text style={styles.photoDate}>Mounted Oct 25 · 450W</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.photoCard}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>⚡</Text>
              <Text style={styles.photoCaption}>5kW Inverter Room</Text>
              <Text style={styles.photoDate}>Wired Oct 30 · Dual MPPT</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.photoCard}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>🏗️</Text>
              <Text style={styles.photoCaption}>Galvanized Mounting</Text>
              <Text style={styles.photoDate}>Passed 150 km/h Stress Test</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.photoCard}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>🌐</Text>
              <Text style={styles.photoCaption}>Chemical Earthing</Text>
              <Text style={styles.photoDate}>1.2 Ohms (Optimal &lt; 2.0)</Text>
            </View>
          </GlassCard>
        </ScrollView>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            🔒 All installation milestones are verified with tamper-proof DISCOM and MNRE GPS tags.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: { marginBottom: spacing.lg, paddingHorizontal: 4 },
  headerBadge: {
    ...typography.small,
    color: '#10B981',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h1,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
    fontSize: 13,
  },
  systemCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 8,
  },
  systemTitleBox: {
    flex: 1,
    flexShrink: 1,
  },
  systemTitle: {
    fontSize: 17,
    color: colors.white,
    fontWeight: '800',
    flexShrink: 1,
  },
  systemSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    flexShrink: 1,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  progressContainer: {
    marginVertical: spacing.sm,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: borderRadius.round,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressPercent: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '800',
  },
  progressTarget: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  metricItem: { alignItems: 'center', flex: 1 },
  metricValue: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  engineerCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  engineerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 26 },
  engineerInfo: {
    flex: 1,
    flexShrink: 1,
  },
  engineerRole: {
    fontSize: 10,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  engineerName: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '800',
  },
  engineerBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 1,
  },
  engineerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callLeadBtn: {
    flex: 1,
    backgroundColor: '#0D2B20',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callLeadText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  whatsappLeadBtn: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappLeadText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 12,
  },
  sectionHeader: { marginBottom: spacing.md, paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  timelineContainer: {
    marginBottom: spacing.xl,
  },
  milestoneWrapper: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  trackColumn: {
    width: 32,
    alignItems: 'center',
    flexShrink: 0,
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  nodeInProgress: {
    backgroundColor: colors.white,
    borderColor: '#10B981',
    borderWidth: 3,
  },
  checkIcon: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  nodeNumber: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '800',
  },
  trackLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginTop: -2,
    marginBottom: -2,
  },
  trackLineCompleted: {
    backgroundColor: '#10B981',
  },
  milestoneCardContainer: {
    flex: 1,
    marginLeft: 8,
    flexShrink: 1,
    overflow: 'hidden',
  },
  milestoneCard: {
    padding: 12,
    overflow: 'hidden',
  },
  activeMilestoneCard: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleArea: {
    flex: 1,
    flexShrink: 1,
  },
  stageTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  stageTag: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.gray[200],
  },
  statusPillCompleted: { backgroundColor: '#10B98120' },
  statusPillInProgress: { backgroundColor: '#05966930' },
  statusPillText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  statusPillTextCompleted: { color: '#047857' },
  statusPillTextInProgress: { color: '#065F46' },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    flexShrink: 1,
    lineHeight: 18,
  },
  milestoneDate: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  expandChevronBox: {
    padding: 4,
  },
  expandChevron: {
    fontSize: 12,
    color: colors.gray[500],
  },
  milestoneDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 6,
    lineHeight: 17,
    flexShrink: 1,
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  detailList: { gap: 6, marginBottom: 10 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexShrink: 1,
  },
  bulletDot: {
    color: '#10B981',
    fontSize: 14,
    lineHeight: 18,
  },
  detailText: {
    fontSize: 11,
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
    lineHeight: 16,
  },
  inspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  inspectorLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  inspectorName: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    flexShrink: 1,
  },
  docDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
    gap: 6,
  },
  docIcon: { fontSize: 16 },
  docText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '700',
    flex: 1,
    flexShrink: 1,
  },
  downloadArrow: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '800',
  },
  galleryScroll: {
    gap: 12,
    paddingBottom: spacing.lg,
  },
  photoCard: {
    width: 160,
    height: 130,
    borderRadius: borderRadius.lg,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoEmoji: { fontSize: 32, marginBottom: 4 },
  photoCaption: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  photoDate: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: 8,
  },
  footerNoteText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
