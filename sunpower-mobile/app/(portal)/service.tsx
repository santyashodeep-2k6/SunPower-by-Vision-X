import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clay3DCard } from '@/components/ui/Clay3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { SafeStorage } from '@/services/storage';

export interface ServiceTicket {
  id: string;
  category: string;
  title: string;
  status: 'assigned' | 'in_progress' | 'resolved';
  date: string;
  technician?: string;
  technicianId?: string;
  technicianPhone?: string;
  scheduledTime?: string;
  description: string;
  hasPhoto?: boolean;
  priority?: 'normal' | 'urgent' | 'critical';
}

interface CertifiedTechnician {
  id: string;
  name: string;
  role: string;
  specialty: string;
  rating: number;
  installs: number;
  phone: string;
  availableSlot: string;
  avatar: string;
}

const CERTIFIED_TECHNICIANS: CertifiedTechnician[] = [
  {
    id: 'TECH-104',
    name: 'Arjun Patil',
    role: 'Lead Solar Array & Inverter Specialist',
    specialty: 'Bifacial string balancing & high-voltage DC cabinets',
    rating: 4.98,
    installs: 210,
    phone: '+91 98220 12345',
    availableSlot: 'Today, 3:30 PM (Priority)',
    avatar: '👷‍♂️',
  },
  {
    id: 'TECH-092',
    name: 'Aman Deep',
    role: 'Wi-Fi Telemetry & Smart Dongle Lead',
    specialty: 'Inverter cloud sync, zero-export CT & meter pairing',
    rating: 4.95,
    installs: 140,
    phone: '+91 98112 34567',
    availableSlot: 'Tomorrow, 10:30 AM',
    avatar: '👨‍🔧',
  },
  {
    id: 'TECH-041',
    name: 'Deepak Shinde',
    role: 'DISCOM Net-Meter & Grid-Sync Inspector',
    specialty: 'Bi-directional swap, optical port test & earthing audits',
    rating: 4.92,
    installs: 95,
    phone: '+91 98765 43210',
    availableSlot: 'Tomorrow, 2:00 PM',
    avatar: '🧑‍💻',
  },
  {
    id: 'TECH-055',
    name: 'Suresh Verma',
    role: 'Safety & Chemical Earthing Auditor',
    specialty: 'Rooftop lightning arrester, surge protection & DC cabling',
    rating: 4.97,
    installs: 180,
    phone: '+91 98334 56789',
    availableSlot: 'Nov 03, 11:00 AM',
    avatar: '🦺',
  },
];

const DEFAULT_TICKETS: ServiceTicket[] = [
  {
    id: 'SR-2026-8821',
    category: 'Inverter Fault',
    title: 'Wi-Fi Telemetry Logger Re-syncing',
    status: 'assigned',
    date: 'Oct 30, 2026',
    technician: 'Aman Deep',
    technicianId: 'TECH-092',
    technicianPhone: '+91 98112 34567',
    scheduledTime: 'Tomorrow, 10:30 AM (Confirmed)',
    description: 'Inverter Wi-Fi dongle dropped cloud synchronization after broadband router reboot.',
    hasPhoto: true,
    priority: 'normal',
  },
  {
    id: 'SR-2026-7410',
    category: 'Panel Cleaning',
    title: 'Post-Monsoon Deep Panel Polish',
    status: 'resolved',
    date: 'Oct 15, 2026',
    technician: 'SunPower Eco Clean Team #4',
    technicianId: 'CLEAN-004',
    technicianPhone: '+91 98220 99999',
    scheduledTime: 'Completed Oct 15',
    description: 'Complimentary quarterly panel pressure cleaning & dust de-ionization treatment.',
    hasPhoto: true,
    priority: 'normal',
  },
];

const STORAGE_TICKETS_KEY = 'sunflow_service_tickets_v1';

export default function ServiceScreen() {
  const router = useRouter();

  // State
  const [tickets, setTickets] = useState<ServiceTicket[]>(DEFAULT_TICKETS);
  const [modalVisible, setModalVisible] = useState(false);
  const [helplineModalVisible, setHelplineModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [activeTicketForAssign, setActiveTicketForAssign] = useState<ServiceTicket | null>(null);
  const [selectedTech, setSelectedTech] = useState<CertifiedTechnician>(CERTIFIED_TECHNICIANS[0]);
  const [selectedSlot, setSelectedSlot] = useState('Tomorrow, 10:30 AM');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState('Inverter Fault');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [description, setDescription] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadPersistedTickets();
  }, []);

  const loadPersistedTickets = async () => {
    try {
      const stored = await SafeStorage.getItem(STORAGE_TICKETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickets(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load tickets from storage', e);
    }
  };

  const saveTickets = async (updated: ServiceTicket[]) => {
    setTickets(updated);
    try {
      await SafeStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save tickets', e);
    }
  };

  const categories = [
    'Inverter Fault',
    'Low Generation',
    'Physical Damage',
    'Panel Cleaning',
    'Net Meter Issue',
    'Wiring / Earthing',
  ];

  const handleAttachPhoto = () => {
    setAttachedPhoto('rooftop_inverter_diag_photo.jpg');
    notifyUser('Photo Attached', 'High-res image tagged with GPS timestamp attached to ticket.');
  };

  const handleSubmitTicket = () => {
    if (!description.trim()) {
      notifyUser('Description Required', 'Please enter a brief description of the issue.');
      return;
    }

    const defaultTech = CERTIFIED_TECHNICIANS[0];
    const newTicket: ServiceTicket = {
      id: `SR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      category: selectedCategory,
      title: `${selectedCategory} Inspection Request`,
      status: 'assigned',
      date: 'Today, Just now',
      technician: defaultTech.name,
      technicianId: defaultTech.id,
      technicianPhone: defaultTech.phone,
      scheduledTime: priority === 'critical' ? 'Urgent Dispatch (< 2 hrs)' : 'Tomorrow, 10:30 AM',
      description: description.trim(),
      hasPhoto: !!attachedPhoto,
      priority,
    };

    const nextTickets = [newTicket, ...tickets];
    saveTickets(nextTickets);
    setDescription('');
    setAttachedPhoto(null);
    setModalVisible(false);

    notifyUser(
      'Service Request Logged! 🛠️',
      `Ticket ${newTicket.id} created and assigned to ${defaultTech.name}. ETA: ${newTicket.scheduledTime}.`
    );
  };

  // Open Assign Modal for a specific ticket
  const openAssignModal = (ticket: ServiceTicket) => {
    setActiveTicketForAssign(ticket);
    const existingTech = CERTIFIED_TECHNICIANS.find((t) => t.id === ticket.technicianId);
    if (existingTech) {
      setSelectedTech(existingTech);
    } else {
      setSelectedTech(CERTIFIED_TECHNICIANS[0]);
    }
    setSelectedSlot(ticket.scheduledTime || 'Tomorrow, 10:30 AM');
    setAssignModalVisible(true);
  };

  // Confirm Ticket Assignment
  const handleConfirmAssignment = () => {
    if (!activeTicketForAssign) return;

    const updated = tickets.map((t) => {
      if (t.id === activeTicketForAssign.id) {
        return {
          ...t,
          technician: selectedTech.name,
          technicianId: selectedTech.id,
          technicianPhone: selectedTech.phone,
          scheduledTime: selectedSlot,
          status: 'assigned' as const,
        };
      }
      return t;
    });

    saveTickets(updated);
    setAssignModalVisible(false);
    notifyUser(
      'Technician Assigned! 👷‍♂️',
      `Ticket ${activeTicketForAssign.id} assigned to ${selectedTech.name} (${selectedTech.id}). Visit booked for ${selectedSlot}.`
    );
  };

  const handleDialHelpline = () => {
    const telUrl = 'tel:180078676937';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.open(telUrl, '_self');
      } catch {
        notifyUser('Emergency Helpline', 'Toll-Free Helpline: 1800-786-76937 (1800-SUN-POWER)');
      }
    } else {
      Linking.openURL(telUrl).catch(() => {
        Alert.alert('Emergency Helpline', 'Toll-Free Helpline: 1800-786-76937 (1800-SUN-POWER)');
      });
    }
  };

  const handleWhatsAppSupport = () => {
    const url = 'https://wa.me/919822012345?text=Hello%20SunPower%2024x7%20Emergency%20Grid%20Desk';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {
        Alert.alert('WhatsApp Emergency Desk', 'Message +91 98220 12345 for 24/7 technical dispatch.');
      });
    }
  };

  const handleCopyHelpline = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        navigator.clipboard.writeText('180078676937');
      } catch {}
    }
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const notifyUser = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
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
          <Text style={styles.headerBadge}>WARRANTY & SUPPORT</Text>
          <Text style={styles.headerTitle}>Service Center 🔧</Text>
          <Text style={styles.headerSubtitle}>
            Certified on-site maintenance, diagnostic telemetry, and complaint tracking
          </Text>
        </View>

        {/* AMC Status Card */}
        <Clay3DCard variant="gradient" shadowSize="lg" style={styles.amcCard}>
          <View style={styles.amcHeader}>
            <View>
              <Text style={styles.amcTitle}>5-Year Gold AMC Active</Text>
              <Text style={styles.amcSub}>Includes 4 Free Deep Cleanings/Year</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>✓ Protected</Text>
            </View>
          </View>

          <View style={styles.amcStatsRow}>
            <View style={styles.amcStat}>
              <Text style={styles.amcStatVal}>3 of 4</Text>
              <Text style={styles.amcStatLbl}>Cleanings Left</Text>
            </View>
            <View style={styles.amcStatDivider} />
            <View style={styles.amcStat}>
              <Text style={styles.amcStatVal}>24 Hrs</Text>
              <Text style={styles.amcStatLbl}>SLA Resolution</Text>
            </View>
            <View style={styles.amcStatDivider} />
            <View style={styles.amcStat}>
              <Text style={styles.amcStatVal}>25 Yrs</Text>
              <Text style={styles.amcStatLbl}>Panel Warranty</Text>
            </View>
          </View>
        </Clay3DCard>

        {/* Quick Service Action Buttons */}
        <View style={styles.quickActionRow}>
          <Pressable
            style={styles.primaryActionBtn}
            onPress={() => setModalVisible(true)}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.btnGradient}
            >
              <Text style={styles.primaryActionBtnText}>📸 Raise Service Ticket</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.helplineBtn}
            onPress={() => setHelplineModalVisible(true)}
          >
            <Text style={styles.helplineBtnText}>📞 24/7 Helpline</Text>
          </Pressable>
        </View>

        {/* Tickets Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Service & Complaint History 📋</Text>
          <Text style={styles.sectionSub}>Track active dispatches, assign engineers and verify reports</Text>
        </View>

        <View style={styles.ticketsList}>
          {tickets.map((t) => {
            const isAssigned = t.status === 'assigned';
            const isResolved = t.status === 'resolved';

            return (
              <Clay3DCard key={t.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketBadgeRow}>
                    <Text style={styles.ticketId}>{t.id}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        isAssigned && styles.statusPillAssigned,
                        isResolved && styles.statusPillResolved,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isAssigned && styles.statusTextAssigned,
                          isResolved && styles.statusTextResolved,
                        ]}
                      >
                        {isAssigned ? 'Technician Assigned' : 'Resolved & Verified'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketDate}>{t.date}</Text>
                </View>

                <Text style={styles.ticketTitle}>{t.title}</Text>
                <Text style={styles.ticketDesc}>{t.description}</Text>

                {/* Assigned Technician Card */}
                {t.technician ? (
                  <View style={styles.technicianRow}>
                    <Text style={styles.techIcon}>👷‍♂️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.techName}>
                        {t.technician} {t.technicianId ? `(${t.technicianId})` : ''}
                      </Text>
                      {t.scheduledTime && (
                        <Text style={styles.techTime}>Visit: {t.scheduledTime}</Text>
                      )}
                    </View>
                    <Pressable
                      style={styles.reassignMiniBtn}
                      onPress={() => openAssignModal(t)}
                    >
                      <Text style={styles.reassignMiniText}>Change ✎</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.unassignedBanner}
                    onPress={() => openAssignModal(t)}
                  >
                    <Text style={styles.unassignedIcon}>⚠️</Text>
                    <Text style={styles.unassignedText}>No technician assigned yet. Tap to assign.</Text>
                    <Text style={styles.assignNowBadge}>Assign Now →</Text>
                  </Pressable>
                )}

                {/* Action Row for Ticket */}
                <View style={styles.ticketActionsRow}>
                  <Pressable
                    style={styles.assignTicketActionBtn}
                    onPress={() => openAssignModal(t)}
                  >
                    <Text style={styles.assignActionBtnText}>
                      👷‍♂️ {t.technician ? 'Reassign Technician' : 'Assign Ticket'}
                    </Text>
                  </Pressable>

                  {t.technicianPhone && (
                    <Pressable
                      style={styles.callTechBtn}
                      onPress={() => Linking.openURL(`tel:${t.technicianPhone}`)}
                    >
                      <Text style={styles.callTechText}>📞 Call Tech</Text>
                    </Pressable>
                  )}
                </View>

                {t.hasPhoto && (
                  <View style={styles.photoAttachedBadge}>
                    <Text style={styles.photoBadgeText}>📎 1 Diagnostic Photo Attached (GPS Verified)</Text>
                  </View>
                )}
              </Clay3DCard>
            );
          })}
        </View>

        {/* Maintenance Guide Glass Card */}
        <GlassCard style={styles.guideCard}>
          <Text style={styles.guideTitle}>💡 Preventive Maintenance Tips</Text>
          <Text style={styles.guideText}>
            • Inspect inverter status LED weekly (Solid Green indicates normal feeding to grid).{'\n'}
            • Clean panels during cooler hours (sunrise or sunset) to prevent micro-cracks.{'\n'}
            • Never step on solar glass modules or lean heavy ladders against panel edges.
          </Text>
        </GlassCard>

        {/* BOTTOM SPACING */}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* 24/7 HELPLINE EMERGENCY MODAL */}
      <Modal
        visible={helplineModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHelplineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.emergencyPill}>EMERGENCY DISPATCH 24/7</Text>
                <Text style={styles.modalTitle}>SunPower Solar Helpline 🚨</Text>
              </View>
              <Pressable onPress={() => setHelplineModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Banner */}
              <View style={styles.helplineStatusBanner}>
                <View style={styles.onlineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.helplineStatusTitle}>Grid Emergency Desk is LIVE</Text>
                  <Text style={styles.helplineStatusSub}>14 Field Engineers On-Call · Average dispatch &lt; 45 mins</Text>
                </View>
              </View>

              {/* Action 1: Call Toll Free */}
              <Pressable style={styles.emergencyCallBtn} onPress={handleDialHelpline}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.emergencyCallGradient}
                >
                  <Text style={styles.emergencyCallIcon}>📞</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emergencyCallLabel}>Direct Toll-Free Line</Text>
                    <Text style={styles.emergencyCallNumber}>1800-786-76937 (1800-SUN-POWER)</Text>
                  </View>
                  <Text style={styles.emergencyCallArrow}>CALL →</Text>
                </LinearGradient>
              </Pressable>

              {/* Action 2: WhatsApp Hotline */}
              <Pressable style={styles.emergencyWhatsAppBtn} onPress={handleWhatsAppSupport}>
                <Text style={styles.emergencyWhatsAppIcon}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyWhatsAppLabel}>WhatsApp Priority Response</Text>
                  <Text style={styles.emergencyWhatsAppNumber}>+91 98220 12345 (Send fault photos/videos)</Text>
                </View>
                <Text style={styles.emergencyWhatsAppArrow}>CHAT →</Text>
              </Pressable>

              {/* Action 3: AI Voice Assistant */}
              <Pressable
                style={styles.emergencyAiBtn}
                onPress={() => {
                  setHelplineModalVisible(false);
                  router.push('/(portal)/ai');
                }}
              >
                <Text style={styles.emergencyAiIcon}>🎙️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyAiLabel}>24/7 AI Voice Energy Assistant</Text>
                  <Text style={styles.emergencyAiSub}>Speak in Hindi, English or Marathi for immediate triage</Text>
                </View>
                <Text style={styles.emergencyAiArrow}>TALK →</Text>
              </Pressable>

              {/* Copy Phone Number */}
              <Pressable style={styles.copyRow} onPress={handleCopyHelpline}>
                <Text style={styles.copyText}>
                  {copiedNotification ? '✅ Toll-Free Number copied to clipboard!' : '📋 Tap to copy 1800-786-76937'}
                </Text>
              </Pressable>

              {/* Quick Fault Triage FAQ */}
              <View style={styles.faqBox}>
                <Text style={styles.faqTitle}>Immediate Safety Guidelines:</Text>
                <Text style={styles.faqItem}>• Red Inverter LED: Switch OFF the AC Isolator switch below the inverter box.</Text>
                <Text style={styles.faqItem}>• Smoke or Burning smell: Keep 10 meters distance, do NOT spray water on panels.</Text>
                <Text style={styles.faqItem}>• Grid Outage: System automatically disconnects to protect utility workers (Anti-Islanding).</Text>
              </View>

              <Button
                title="Close"
                onPress={() => setHelplineModalVisible(false)}
                variant="outline"
                size="md"
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ASSIGN TECHNICIAN MODAL */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.emergencyPill}>FIELD DISPATCH MANAGER</Text>
                <Text style={styles.modalTitle}>Assign Service Engineer 👷‍♂️</Text>
              </View>
              <Pressable onPress={() => setAssignModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeTicketForAssign && (
                <View style={styles.assignTicketPreview}>
                  <Text style={styles.assignTicketId}>{activeTicketForAssign.id}</Text>
                  <Text style={styles.assignTicketTitle}>{activeTicketForAssign.title}</Text>
                  <Text style={styles.assignTicketDesc} numberOfLines={2}>
                    {activeTicketForAssign.description}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Select Certified Technician</Text>
              <View style={styles.techList}>
                {CERTIFIED_TECHNICIANS.map((tech) => {
                  const isSelected = selectedTech.id === tech.id;
                  return (
                    <Pressable
                      key={tech.id}
                      style={[styles.techItem, isSelected && styles.techItemSelected]}
                      onPress={() => {
                        setSelectedTech(tech);
                        setSelectedSlot(tech.availableSlot);
                      }}
                    >
                      <View style={styles.techAvatarBox}>
                        <Text style={styles.techAvatarEmoji}>{tech.avatar}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.techNameRow}>
                          <Text style={styles.techItemName}>{tech.name}</Text>
                          <View style={styles.techRatingBadge}>
                            <Text style={styles.techRatingText}>★ {tech.rating}</Text>
                          </View>
                        </View>
                        <Text style={styles.techItemRole}>{tech.role}</Text>
                        <Text style={styles.techItemSpecialty} numberOfLines={1}>
                          {tech.specialty}
                        </Text>
                        <Text style={styles.techSlotText}>🕒 Earliest Slot: {tech.availableSlot}</Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Time Slot Picker */}
              <Text style={styles.inputLabel}>Select Appointment Time Slot</Text>
              <View style={styles.slotsRow}>
                {[
                  selectedTech.availableSlot,
                  'Tomorrow, 10:30 AM',
                  'Tomorrow, 3:00 PM',
                  'Within 48 Hours',
                ].map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <Pressable
                      key={slot}
                      style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Confirm Assignment Button */}
              <Pressable
                style={styles.confirmAssignBtn}
                onPress={handleConfirmAssignment}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.confirmAssignGradient}
                >
                  <Text style={styles.confirmAssignBtnText}>
                    Confirm Assignment to {selectedTech.name} →
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RAISE SERVICE TICKET MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise New Service Ticket 🛠️</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Selection */}
              <Text style={styles.inputLabel}>Select Issue Category</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.catChip,
                      selectedCategory === cat && styles.catChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selectedCategory === cat && styles.catChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Priority Selection */}
              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.priorityRow}>
                {(['normal', 'urgent', 'critical'] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.priorityChip,
                      priority === p && styles.priorityChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        priority === p && styles.priorityChipTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Problem Description */}
              <Text style={styles.inputLabel}>Describe The Issue</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Detail any warning codes on inverter, abnormal sounds, or generation drops..."
                placeholderTextColor={colors.text.secondary}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              {/* Attach Photo Button */}
              <Pressable onPress={handleAttachPhoto} style={styles.attachBtn}>
                <Text style={styles.attachIcon}>📸</Text>
                <Text style={styles.attachText}>
                  {attachedPhoto ? `Attached: ${attachedPhoto}` : 'Attach Diagnostic Photo (Optional)'}
                </Text>
              </Pressable>

              {/* Submit Button */}
              <Pressable style={styles.submitTicketBtn} onPress={handleSubmitTicket}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.submitTicketGradient}
                >
                  <Text style={styles.submitTicketText}>Submit Ticket & Dispatch Engineer 🚀</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
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
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: { marginBottom: spacing.lg },
  headerBadge: {
    ...typography.small,
    color: '#10B981',
    fontWeight: '700',
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
    lineHeight: 22,
  },
  amcCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  amcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  amcTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  amcSub: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.round,
  },
  activePillText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  amcStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  amcStat: { flex: 1, alignItems: 'center' },
  amcStatVal: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  amcStatLbl: {
    ...typography.small,
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  amcStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  primaryActionBtn: {
    flex: 1.4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  helplineBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  helplineBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  ticketsList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  ticketCard: {
    padding: spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketId: {
    ...typography.small,
    color: '#10B981',
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.gray[200],
  },
  statusPillAssigned: { backgroundColor: '#10B98125' },
  statusPillResolved: { backgroundColor: '#05966930' },
  statusPillText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextAssigned: { color: '#10B981' },
  statusTextResolved: { color: '#059669' },
  ticketDate: {
    ...typography.small,
    color: colors.text.secondary,
  },
  ticketTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  ticketDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  techIcon: { fontSize: 20 },
  techName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  techTime: {
    ...typography.small,
    color: '#059669',
    fontWeight: '600',
  },
  reassignMiniBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  reassignMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  unassignedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unassignedIcon: { fontSize: 16 },
  unassignedText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  assignNowBadge: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '800',
  },
  ticketActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  assignTicketActionBtn: {
    flex: 1,
    backgroundColor: '#0D2B20',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  callTechBtn: {
    backgroundColor: '#E5F9F5',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  callTechText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
  },
  photoAttachedBadge: {
    marginTop: spacing.xs,
  },
  photoBadgeText: {
    ...typography.small,
    color: '#059669',
    fontWeight: '600',
  },
  guideCard: {
    padding: spacing.lg,
  },
  guideTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  guideText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emergencyPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalClose: {
    fontSize: 22,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  helplineStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 14,
    gap: 10,
    marginBottom: 16,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  helplineStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  helplineStatusSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  emergencyCallBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  emergencyCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  emergencyCallIcon: { fontSize: 26 },
  emergencyCallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  emergencyCallNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  emergencyCallArrow: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  emergencyWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  emergencyWhatsAppIcon: { fontSize: 24 },
  emergencyWhatsAppLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  emergencyWhatsAppNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  emergencyWhatsAppArrow: {
    color: '#15803D',
    fontWeight: '900',
    fontSize: 12,
  },
  emergencyAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  emergencyAiIcon: { fontSize: 24 },
  emergencyAiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  emergencyAiSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emergencyAiArrow: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
  },
  copyRow: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  faqBox: {
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  faqTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  faqItem: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  assignTicketPreview: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignTicketId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  assignTicketTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  assignTicketDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  techList: {
    gap: 10,
    marginBottom: 16,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  techItemSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  techAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarEmoji: { fontSize: 24 },
  techNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  techItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  techRatingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  techRatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  techItemRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 1,
  },
  techItemSpecialty: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  techSlotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#10B981',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotChipSelected: {
    backgroundColor: '#0D2B20',
    borderColor: '#0D2B20',
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  slotChipTextSelected: {
    color: '#FFFFFF',
  },
  confirmAssignBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  confirmAssignGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAssignBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  catChipActive: {
    backgroundColor: '#0D2B20',
    borderColor: '#0D2B20',
  },
  catChipText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: colors.white,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: borderRadius.round,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  priorityChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  priorityChipText: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  priorityChipTextActive: {
    color: colors.white,
  },
  textArea: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    textAlignVertical: 'top',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    marginBottom: spacing.lg,
  },
  attachIcon: { fontSize: 24 },
  attachText: {
    ...typography.caption,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
  },
  submitTicketBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  submitTicketGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTicketText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
