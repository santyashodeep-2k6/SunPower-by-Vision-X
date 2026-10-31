import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

type HubTab = 'specs' | 'documents' | 'safety';

interface CertifiedDoc {
  id: string;
  title: string;
  subtitle: string;
  category: 'handover' | 'permit' | 'warranty' | 'schematic' | 'inspection';
  date: string;
  size: string;
  authority: string;
  status: 'Verified' | 'Active' | 'Approved';
  badgeColor: string;
  icon: string;
  content: {
    referenceNo: string;
    beneficiary: string;
    sanctionLoad: string;
    plantCapacity: string;
    location: string;
    engineer: string;
    commissionDate: string;
    specList: { label: string; value: string }[];
    notes: string;
  };
}

const CERTIFIED_DOCUMENTS: CertifiedDoc[] = [
  {
    id: 'DOC-SUN-001',
    title: 'Solar Commissioning & Handover Certificate',
    subtitle: 'Official acceptance document & system performance sign-off',
    category: 'handover',
    date: 'Oct 28, 2026',
    size: '1.4 MB',
    authority: 'SunFlow 360 EPC Operations',
    status: 'Verified',
    badgeColor: '#10B981',
    icon: '📜',
    content: {
      referenceNo: 'SF360-HOC-2026-9921',
      beneficiary: 'Rahul Sharma',
      sanctionLoad: '5.0 kW Single-Phase',
      plantCapacity: '5.4 kWp DC / 5.0 kW AC',
      location: '14 Sunrise Bungalows, Baner Road, Pune 411045',
      engineer: 'Arjun Patil (Lead Installer #ENG-04)',
      commissionDate: '28 October 2026',
      specList: [
        { label: 'PV Modules Fitted', value: '10x 540W Mono-PERC Half-Cut (Tier-1)' },
        { label: 'Inverter Unit', value: '5 kW Smart Dual-MPPT Grid-Tie (IP65)' },
        { label: 'Array Open Circuit Voltage (Voc)', value: '412.5 V DC' },
        { label: 'Operating Voltage (Vmp)', value: '348.0 V DC' },
        { label: 'Earthing Resistance', value: '2.4 Ω (Standards: < 3.0 Ω)' },
        { label: 'Grid Sync Frequency', value: '50.02 Hz (Synchronized)' },
      ],
      notes:
        'All structural mounting clamps, DC disconnects, and surge protection devices have been installed as per MNRE standards and successfully tested on-site.',
    },
  },
  {
    id: 'DOC-SUN-002',
    title: 'DISCOM Net-Metering Feasibility & Grid NOC',
    subtitle: 'Electricity board sanction for bi-directional energy export',
    category: 'permit',
    date: 'Oct 20, 2026',
    size: '890 KB',
    authority: 'Maharashtra State Electricity Board (MSEDCL)',
    status: 'Approved',
    badgeColor: '#059669',
    icon: '🏛️',
    content: {
      referenceNo: 'MSEDCL-ROOFTOP-PUN-84012',
      beneficiary: 'Rahul Sharma',
      sanctionLoad: '5.0 kW Sanctioned Load',
      plantCapacity: '5.0 kW Net-Meter Connected',
      location: 'Baner Sub-Division, Pune Rural Circle',
      engineer: 'V. R. Kulkarni (Executive Engineer)',
      commissionDate: '20 October 2026',
      specList: [
        { label: 'Bidirectional Meter Serial', value: 'LT-NET-2026-883492' },
        { label: 'Consumer Number (CA)', value: '018492048123' },
        { label: 'Sanctioned Transformer Load', value: '250 kVA (24% Capacity)' },
        { label: 'Approved Export Tariff', value: '₹3.80 / kWh Net Credit' },
        { label: 'Safety Anti-Islanding Test', value: 'Passed (Response < 1.8s)' },
      ],
      notes:
        'Grid interconnection verified. Generated excess units will offset monthly billing cycles automatically on the consumer electricity account.',
    },
  },
  {
    id: 'DOC-SUN-003',
    title: '25-Year Linear Solar Module Warranty Card',
    subtitle: 'Tier-1 manufacturer guaranteed output & degradation warranty',
    category: 'warranty',
    date: 'Valid till 2051',
    size: '1.8 MB',
    authority: 'Tier-1 Module Quality Assurance',
    status: 'Active',
    badgeColor: '#3B82F6',
    icon: '🛡️',
    content: {
      referenceNo: 'WAR-MOD-2026-540W-SERIES',
      beneficiary: 'Rahul Sharma',
      sanctionLoad: '10 Modules (5.4 kW Total DC)',
      plantCapacity: '540 Wp Per Module',
      location: 'Pune Rooftop Installation',
      engineer: 'QA Certified Inspector',
      commissionDate: 'October 2026 – October 2051',
      specList: [
        { label: 'Product Workmanship Warranty', value: '12 Years 100% Replacement' },
        { label: 'Year 1 Maximum Degradation', value: '≤ 2.0% Initial Year' },
        { label: 'Years 2-25 Annual Degradation', value: '≤ 0.55% Linear / Year' },
        { label: 'Year 25 Guaranteed Output', value: '≥ 84.8% Nominal Capacity' },
        { label: 'Anti-PID / Salt Mist Tested', value: 'IEC 61215 & IEC 61730 Certified' },
      ],
      notes:
        'Modules protected against micro-cracking, potential induced degradation (PID), and heavy hail storm impact up to 25mm diameter at 80 km/h.',
    },
  },
  {
    id: 'DOC-SUN-004',
    title: '10-Year Inverter Guarantee & Safety Dossier',
    subtitle: 'Dual-MPPT smart power conditioning unit guarantee certificate',
    category: 'warranty',
    date: 'Valid till 2036',
    size: '1.1 MB',
    authority: 'Smart Inverter Technologies Global',
    status: 'Active',
    badgeColor: '#3B82F6',
    icon: '⚡',
    content: {
      referenceNo: 'WAR-INV-SG5K-2026-0412',
      beneficiary: 'Rahul Sharma',
      sanctionLoad: '5 kW AC Continuous Rating',
      plantCapacity: '98.4% Peak Efficiency',
      location: 'Pune Shaded Utility Alcove',
      engineer: 'Factory Certified Technical Team',
      commissionDate: 'October 2026 – October 2036',
      specList: [
        { label: 'Inverter Serial No', value: 'SG-2026-INV-5KW-9942' },
        { label: 'Ingress Protection', value: 'IP65 Water & Dust Resistant' },
        { label: 'Arc Fault Circuit Interrupter', value: 'Built-in AFCI Type 1' },
        { label: 'Surge Protection Devices', value: 'Type II DC & AC SPDs Included' },
        { label: 'Remote Monitoring', value: 'Cloud Wi-Fi & Bluetooth Live Telemetry' },
      ],
      notes:
        'Covers free repair, board swap, and continuous firmware security patches for 10 full years from date of commissioning.',
    },
  },
  {
    id: 'DOC-SUN-005',
    title: 'Single-Line Diagram (SLD) & Roof Layout',
    subtitle: 'As-built electrical schematic, string design & conduit paths',
    category: 'schematic',
    date: 'Oct 15, 2026',
    size: '2.6 MB',
    authority: 'SunFlow 360 Engineering Team',
    status: 'Approved',
    badgeColor: '#8B5CF6',
    icon: '📐',
    content: {
      referenceNo: 'DWG-SLD-2026-RES-5KW',
      beneficiary: 'Rahul Sharma',
      sanctionLoad: 'String 1: 5 Panels | String 2: 5 Panels',
      plantCapacity: '5.0 kW Grid-Tie',
      location: 'South-Facing Shadow-Free Roof Area',
      engineer: 'Vikram Joshi (Site Surveyor #SUR-02)',
      commissionDate: '15 October 2026',
      specList: [
        { label: 'Array Tilt Angle', value: '18° South (Optimized for Pune Latitude)' },
        { label: 'Structure Material', value: 'Anodized 6063-T6 Aluminium' },
        { label: 'DC Cable Spec', value: '4 sq.mm UV-Resistant Solar Cable' },
        { label: 'AC Cable Spec', value: '6 sq.mm Copper Armoured 3-Core' },
        { label: 'Lightning Arrester', value: 'Franklin Rod with Dedicated Copper Down-lead' },
      ],
      notes:
        'Schematic verified against shadow analysis (PVSyst simulated > 97% annual solar irradiance yield).',
    },
  },
  {
    id: 'DOC-SUN-006',
    title: 'Quality & Electrical Safety Test Dossier',
    subtitle: 'Pre-handover insulation, voltage & earth fault test results',
    category: 'inspection',
    date: 'Oct 27, 2026',
    size: '950 KB',
    authority: 'MNRE Certified Solar Auditor',
    status: 'Verified',
    badgeColor: '#10B981',
    icon: '🔍',
    content: {
      referenceNo: 'TEST-REP-2026-QC-1102',
      beneficiary: 'Rahul Sharma',
      sanctionLoad: 'DC / AC Subsystem Safety',
      plantCapacity: '5.0 kW Testing Standard',
      location: 'Site Installation baner Road',
      engineer: 'Deepak Shinde (Quality Engineer)',
      commissionDate: '27 October 2026',
      specList: [
        { label: 'DC Insulation Resistance (MΩ)', value: '45 MΩ (Pass > 1.0 MΩ)' },
        { label: 'AC Earth Fault Protection', value: 'Tripped in 24ms (Pass)' },
        { label: 'Torque Inspection (Clamps)', value: '12 N·m Calibrated Torque Verified' },
        { label: 'Cable Conduit Sealing', value: 'Weather-tight UV resistant gland pass' },
        { label: 'Inverter Temperature Rise', value: '38°C at Peak 4.8 kW (Normal)' },
      ],
      notes:
        'All electrical and mechanical connections inspected and cleared for continuous uninterrupted generation.',
    },
  },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HubTab>('specs');
  const [selectedDoc, setSelectedDoc] = useState<CertifiedDoc | null>(null);
  const [copiedNote, setCopiedNote] = useState(false);
  const [activeComponentInspect, setActiveComponentInspect] = useState<string>('inverter');

  const handleDownload = (doc: CertifiedDoc) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Create a printable text/html document download in browser
      const content = `
=====================================================
${doc.title.toUpperCase()}
Authority: ${doc.authority}
Reference: ${doc.content.referenceNo}
Date: ${doc.content.commissionDate}
=====================================================
Beneficiary: ${doc.content.beneficiary}
Location: ${doc.content.location}
Plant Capacity: ${doc.content.plantCapacity}
Sanctioned Grid Load: ${doc.content.sanctionLoad}
Certified Engineer: ${doc.content.engineer}

TECHNICAL SPECIFICATIONS:
${doc.content.specList.map((s) => `• ${s.label}: ${s.value}`).join('\n')}

SAFETY & AUDIT NOTES:
${doc.content.notes}
=====================================================
SunFlow 360 Clean Solar Ecosystem
Official Digital Document Seal Verified.
      `;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.id}_${doc.title.replace(/\s+/g, '_')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyReference = (ref: string) => {
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0D2B20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="light" />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Installation & Documents Hub</Text>
          <Text style={styles.navSubtitle}>Certified Handover & System Specs</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented Navigation Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'specs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('specs')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'specs' && styles.tabButtonTextActive]}>
            ⚙️ System Specs
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'documents' && styles.tabButtonActive]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'documents' && styles.tabButtonTextActive]}>
            📜 Official Docs ({CERTIFIED_DOCUMENTS.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'safety' && styles.tabButtonActive]}
          onPress={() => setActiveTab('safety')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'safety' && styles.tabButtonTextActive]}>
            🛡️ Safety & Grid
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TAB 1: SYSTEM SPECS & ARCHITECTURE ================= */}
        {activeTab === 'specs' && (
          <View style={styles.tabBody}>
            {/* System Overview Hero Card */}
            <View style={styles.systemHeroCard}>
              <View style={styles.systemHeroHeader}>
                <View>
                  <Text style={styles.systemTypeBadge}>ON-GRID ROOFTOP SOLAR PLANT</Text>
                  <Text style={styles.systemHeroTitle}>5.0 kW AC / 5.4 kWp DC</Text>
                </View>
                <View style={styles.verifiedGreenBadge}>
                  <Text style={styles.verifiedGreenText}>✓ Commissioned</Text>
                </View>
              </View>

              <Text style={styles.systemHeroDesc}>
                High-efficiency mono-crystalline rooftop power station synchronized with MSEDCL
                grid under PM Surya Ghar Muft Bijli Yojana.
              </Text>

              {/* 4 Essential Technical Metrics */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Daily Generation</Text>
                  <Text style={styles.metricVal}>20 - 22</Text>
                  <Text style={styles.metricUnit}>kWh / Day</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Annual Output</Text>
                  <Text style={styles.metricVal}>~7,400</Text>
                  <Text style={styles.metricUnit}>Units / Year</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>CO₂ Clean Offset</Text>
                  <Text style={styles.metricVal}>6.8</Text>
                  <Text style={styles.metricUnit}>Tons / Year</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Govt Subsidy</Text>
                  <Text style={styles.metricVal}>₹78,000</Text>
                  <Text style={styles.metricUnit}>Direct DBT</Text>
                </View>
              </View>
            </View>

            {/* Interactive System Architecture Explorer */}
            <View style={styles.interactiveDiagramCard}>
              <Text style={styles.diagramHeading}>⚡ Interactive System Component Inspector</Text>
              <Text style={styles.diagramSub}>
                Tap any component to inspect technical specifications and connection health:
              </Text>

              <View style={styles.componentPillRow}>
                {[
                  { id: 'panels', label: '☀️ Solar PV Array' },
                  { id: 'inverter', label: '⚡ Smart Inverter' },
                  { id: 'meter', label: '📟 Bi-Directional Net-Meter' },
                  { id: 'earthing', label: '🛡️ Earthing & Lightning' },
                ].map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.compSelectPill,
                      activeComponentInspect === c.id && styles.compSelectPillActive,
                    ]}
                    onPress={() => setActiveComponentInspect(c.id)}
                  >
                    <Text
                      style={[
                        styles.compSelectText,
                        activeComponentInspect === c.id && styles.compSelectTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Detail view of inspected component */}
              <View style={styles.componentInspectBox}>
                {activeComponentInspect === 'panels' && (
                  <>
                    <View style={styles.inspectTopRow}>
                      <Text style={styles.inspectTitle}>Tier-1 Mono-PERC Half-Cut Modules</Text>
                      <Text style={styles.inspectStatusPill}>10 Units · 540W</Text>
                    </View>
                    <View style={styles.inspectSpecTable}>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Total DC Peak Power</Text>
                        <Text style={styles.specVal}>5,400 Watts Peak (5.4 kWp)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Cell Technology</Text>
                        <Text style={styles.specVal}>144 Half-Cut Multi-Busbar (MBB)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Module Efficiency</Text>
                        <Text style={styles.specVal}>21.3% Peak Conversion</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Warranty Life</Text>
                        <Text style={styles.specVal}>25 Years Performance Guarantee</Text>
                      </View>
                    </View>
                  </>
                )}

                {activeComponentInspect === 'inverter' && (
                  <>
                    <View style={styles.inspectTopRow}>
                      <Text style={styles.inspectTitle}>5 kW Smart Grid-Tie Inverter</Text>
                      <Text style={styles.inspectStatusPill}>Dual-MPPT · 98.4% Eff</Text>
                    </View>
                    <View style={styles.inspectSpecTable}>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Rated AC Output Power</Text>
                        <Text style={styles.specVal}>5,000 W (230V / 50Hz Single-Phase)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Max DC Input Voltage</Text>
                        <Text style={styles.specVal}>550 V DC (Dual Independent Trackers)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Protections</Text>
                        <Text style={styles.specVal}>Anti-Islanding, DC Reverse, Surge SPD</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Connectivity</Text>
                        <Text style={styles.specVal}>Wi-Fi Cloud Telemetry & RS-485</Text>
                      </View>
                    </View>
                  </>
                )}

                {activeComponentInspect === 'meter' && (
                  <>
                    <View style={styles.inspectTopRow}>
                      <Text style={styles.inspectTitle}>Bidirectional Smart Net-Meter</Text>
                      <Text style={styles.inspectStatusPill}>MSEDCL Approved</Text>
                    </View>
                    <View style={styles.inspectSpecTable}>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Meter Serial Number</Text>
                        <Text style={styles.specVal}>LT-NET-2026-883492</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Metering Function</Text>
                        <Text style={styles.specVal}>Import, Export, Net Units Tracking</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Accuracy Class</Text>
                        <Text style={styles.specVal}>Class 1.0 Active Energy (IS 13779)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Billing Synchrony</Text>
                        <Text style={styles.specVal}>Automated Monthly Bill Deduction</Text>
                      </View>
                    </View>
                  </>
                )}

                {activeComponentInspect === 'earthing' && (
                  <>
                    <View style={styles.inspectTopRow}>
                      <Text style={styles.inspectTitle}>Dedicated Copper Earthing System</Text>
                      <Text style={styles.inspectStatusPill}>2.4 Ω Measured</Text>
                    </View>
                    <View style={styles.inspectSpecTable}>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Earth Pits</Text>
                        <Text style={styles.specVal}>3 Dedicated (DC, AC, Lightning)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Electrode Material</Text>
                        <Text style={styles.specVal}>Copper-Bonded Steel Rods (250 Microns)</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Lightning Protection</Text>
                        <Text style={styles.specVal}>Franklin Arrestor with 45° Cone Coverage</Text>
                      </View>
                      <View style={styles.inspectSpecRow}>
                        <Text style={styles.specKey}>Earth Pit Compound</Text>
                        <Text style={styles.specVal}>Low-Resistivity BFC Carbon Backfill</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Quick Action: View Full Certified Docs */}
            <Pressable
              style={styles.jumpToDocsBtn}
              onPress={() => setActiveTab('documents')}
            >
              <Text style={styles.jumpToDocsEmoji}>📂</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.jumpToDocsTitle}>View All 6 Certified Documents</Text>
                <Text style={styles.jumpToDocsSub}>
                  Handover Certificate, DISCOM NOC, Warranties & As-Built Schematics
                </Text>
              </View>
              <Text style={styles.jumpToDocsArrow}>→</Text>
            </Pressable>
          </View>
        )}

        {/* ================= TAB 2: CERTIFIED DOCUMENTS (INTERACTIVE) ================= */}
        {activeTab === 'documents' && (
          <View style={styles.tabBody}>
            <Text style={styles.sectionHeaderTitle}>Official System Dossier</Text>
            <Text style={styles.sectionHeaderSub}>
              Tap any document below to inspect its certified contents, test values, or download:
            </Text>

            <View style={styles.docCardsList}>
              {CERTIFIED_DOCUMENTS.map((doc) => (
                <Pressable
                  key={doc.id}
                  style={styles.interactiveDocCard}
                  onPress={() => setSelectedDoc(doc)}
                >
                  <View style={styles.docCardTop}>
                    <View style={styles.docIconPill}>
                      <Text style={{ fontSize: 24 }}>{doc.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docCardTitle}>{doc.title}</Text>
                      <Text style={styles.docCardSub}>{doc.subtitle}</Text>
                    </View>
                  </View>

                  <View style={styles.docCardMetaRow}>
                    <View style={styles.docMetaBadge}>
                      <Text style={styles.docMetaBadgeText}>{doc.authority}</Text>
                    </View>
                    <View
                      style={[
                        styles.docStatusBadge,
                        { backgroundColor: `${doc.badgeColor}22` },
                      ]}
                    >
                      <Text style={[styles.docStatusText, { color: doc.badgeColor }]}>
                        ✓ {doc.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.docCardFooter}>
                    <Text style={styles.docSizeText}>
                      {doc.size} · Issued {doc.date}
                    </Text>
                    <View style={styles.tapToViewAction}>
                      <Text style={styles.tapToViewText}>View Document ↗</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ================= TAB 3: SAFETY, GRID & AUDIT ================= */}
        {activeTab === 'safety' && (
          <View style={styles.tabBody}>
            <View style={styles.safetyCard}>
              <Text style={styles.safetyCardTitle}>🛡️ Electrical & Structural Safety Dossier</Text>
              <Text style={styles.safetyCardSub}>
                Full compliance with MNRE (Ministry of New and Renewable Energy) and Central
                Electricity Authority (CEA) safety guidelines.
              </Text>

              <View style={styles.safetyChecklist}>
                {[
                  {
                    title: 'Anti-Islanding Protection (IEC 62116)',
                    desc: 'Inverter instantly halts power export within 2 seconds of any grid failure to protect linemen.',
                    ok: true,
                  },
                  {
                    title: 'Surge Protection Devices (SPD Type II)',
                    desc: 'Protects sensitive domestic electronics against atmospheric lightning and grid spikes.',
                    ok: true,
                  },
                  {
                    title: 'Dual Earthing Resistance Tested',
                    desc: 'AC & DC earth paths measured at 2.4 Ω with calibrated 4-terminal earth megger.',
                    ok: true,
                  },
                  {
                    title: 'Wind Load Rating Certified (150 km/h)',
                    desc: 'Mounting rails anchored into roof RCC columns with SS304 grade chemical fasteners.',
                    ok: true,
                  },
                  {
                    title: 'Fire Safety & DC Rapid Shutdown',
                    desc: 'Integrated emergency DC rotary isolator switch located within arm reach of inverter.',
                    ok: true,
                  },
                ].map((item, idx) => (
                  <View key={idx} style={styles.safetyRow}>
                    <View style={styles.safetyCheckCircle}>
                      <Text style={styles.safetyCheckTick}>✓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.safetyRowTitle}>{item.title}</Text>
                      <Text style={styles.safetyRowDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ================= INTERACTIVE DOCUMENT PREVIEW MODAL ================= */}
      <Modal
        visible={!!selectedDoc}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            {selectedDoc && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDocType}>OFFICIAL SYSTEM RECORD</Text>
                    <Text style={styles.modalDocTitle}>{selectedDoc.title}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedDoc(null)}
                  >
                    <Text style={styles.modalCloseIcon}>✕</Text>
                  </Pressable>
                </View>

                {/* Scrollable Document Body */}
                <ScrollView
                  style={styles.modalDocScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Verified Seal Banner */}
                  <View style={styles.docSealBanner}>
                    <Text style={styles.docSealIcon}>🛡️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docSealTitle}>
                        Issued by: {selectedDoc.authority}
                      </Text>
                      <Text style={styles.docSealSub}>
                        Digitally signed & recorded under reference: {selectedDoc.content.referenceNo}
                      </Text>
                    </View>
                  </View>

                  {/* Beneficiary & Site Information */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>SITE & BENEFICIARY INFORMATION</Text>
                    <View style={styles.docGrid}>
                      <View style={styles.docGridItem}>
                        <Text style={styles.gridKey}>Beneficiary Name</Text>
                        <Text style={styles.gridVal}>{selectedDoc.content.beneficiary}</Text>
                      </View>
                      <View style={styles.docGridItem}>
                        <Text style={styles.gridKey}>System Capacity</Text>
                        <Text style={styles.gridVal}>{selectedDoc.content.plantCapacity}</Text>
                      </View>
                      <View style={styles.docGridItem}>
                        <Text style={styles.gridKey}>Grid Sanction Load</Text>
                        <Text style={styles.gridVal}>{selectedDoc.content.sanctionLoad}</Text>
                      </View>
                      <View style={styles.docGridItem}>
                        <Text style={styles.gridKey}>Certified Officer</Text>
                        <Text style={styles.gridVal}>{selectedDoc.content.engineer}</Text>
                      </View>
                      <View style={[styles.docGridItem, { width: '100%' }]}>
                        <Text style={styles.gridKey}>Installation Address</Text>
                        <Text style={styles.gridVal}>{selectedDoc.content.location}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Certified Technical Parameters */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>CERTIFIED TECHNICAL PARAMETERS</Text>
                    <View style={styles.specsList}>
                      {selectedDoc.content.specList.map((spec, i) => (
                        <View key={i} style={styles.specListItem}>
                          <Text style={styles.specListBullet}>•</Text>
                          <Text style={styles.specListKey}>{spec.label}:</Text>
                          <Text style={styles.specListVal}>{spec.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Official Audit Note */}
                  <View style={styles.auditNoteBox}>
                    <Text style={styles.auditNoteHeading}>Official Compliance Note</Text>
                    <Text style={styles.auditNoteText}>{selectedDoc.content.notes}</Text>
                  </View>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View style={styles.modalFooterActions}>
                  <Pressable
                    style={styles.modalDownloadBtn}
                    onPress={() => handleDownload(selectedDoc)}
                  >
                    <Text style={styles.modalDownloadText}>📥 Download Certified PDF</Text>
                  </Pressable>

                  <Pressable
                    style={styles.modalCopyBtn}
                    onPress={() => handleCopyReference(selectedDoc.content.referenceNo)}
                  >
                    <Text style={styles.modalCopyText}>
                      {copiedNote ? '✓ Copied' : '📋 Copy Ref ID'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  navBar: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
  navTitleContainer: { alignItems: 'center' },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#10B981',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabBody: {
    paddingTop: 8,
  },
  // System Hero Card
  systemHeroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    marginBottom: 16,
  },
  systemHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  systemTypeBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  systemHeroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  verifiedGreenBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  verifiedGreenText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '800',
  },
  systemHeroDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 2,
  },
  // Interactive Diagram Card
  interactiveDiagramCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
  },
  diagramHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  diagramSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 12,
  },
  componentPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  compSelectPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  compSelectPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  compSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  compSelectTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  componentInspectBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inspectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  inspectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inspectStatusPill: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  inspectSpecTable: {
    gap: 8,
  },
  inspectSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specKey: {
    fontSize: 12,
    color: '#94A3B8',
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  jumpToDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#059669',
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
  },
  jumpToDocsEmoji: {
    fontSize: 24,
  },
  jumpToDocsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  jumpToDocsSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  jumpToDocsArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Tab 2: Document Cards
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeaderSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 14,
  },
  docCardsList: {
    gap: 12,
  },
  interactiveDocCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  docCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  docIconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  docCardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  docCardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  docMetaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  docMetaBadgeText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  docStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  docCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  docSizeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  tapToViewAction: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tapToViewText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Tab 3: Safety
  safetyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  safetyCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  safetyCardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 16,
    lineHeight: 16,
  },
  safetyChecklist: {
    gap: 12,
  },
  safetyRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  safetyCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  safetyCheckTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  safetyRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  safetyRowDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 26,
    maxHeight: '85%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalDocType: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  modalDocTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalDocScroll: {
    padding: 18,
  },
  docSealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 16,
  },
  docSealIcon: {
    fontSize: 22,
  },
  docSealTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  docSealSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  docSection: {
    marginBottom: 16,
  },
  docSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docGridItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
  },
  gridKey: {
    fontSize: 10,
    color: '#94A3B8',
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  specsList: {
    gap: 8,
  },
  specListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  specListBullet: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  specListKey: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  specListVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
  },
  auditNoteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  auditNoteHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F4C542',
    marginBottom: 4,
  },
  auditNoteText: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  modalFooterActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0F172A',
  },
  modalDownloadBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalDownloadText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCopyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modalCopyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
});
