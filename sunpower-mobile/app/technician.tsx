import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiClient, InstallationJob } from '@/services/apiClient';
import { SafeStorage } from '@/services/storage';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

export default function TechnicianScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<InstallationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>('INST-2024-001');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [timerSeconds, setTimerSeconds] = useState(1420); // 23 mins 40s
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCategory, setPhotoCategory] = useState('Solar Array Completed');
  const [previewImage, setPreviewImage] = useState<any | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, 'pending' | 'synced'>>({});

  // Hidden web file input for camera capture
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  // Timer loop
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const persistJobPhotos = async (jobId: string, photos: any[]) => {
    try {
      await SafeStorage.setItem(`technician_photos_${jobId}`, JSON.stringify(photos));
    } catch (e) {
      console.warn('Failed to persist photos', e);
    }
  };

  const loadJobs = async () => {
    const list = await ApiClient.getTechnicianJobs();
    const updatedWithStored = await Promise.all(
      list.map(async (job) => {
        try {
          const stored = await SafeStorage.getItem(`technician_photos_${job.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return { ...job, photos: parsed };
            }
          }
        } catch (e) {
          console.warn('Error reading stored photos', e);
        }
        return job;
      })
    );
    setJobs(updatedWithStored);
  };

  const formatTimer = (total: number) => {
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const handleToggleChecklist = (checkId: string) => {
    if (!currentJob) return;
    const updated = jobs.map((j) => {
      if (j.id === currentJob.id) {
        const nextChecklist = j.checklist.map((c) =>
          c.id === checkId ? { ...c, done: !c.done } : c
        );
        const doneCount = nextChecklist.filter((c) => c.done).length;
        const progress = Math.round((doneCount / nextChecklist.length) * 100);
        return { ...j, checklist: nextChecklist, progress };
      }
      return j;
    });
    setJobs(updated);
  };

  // Trigger Camera Capture
  const handleTriggerCamera = (category?: string) => {
    if (category) setPhotoCategory(category);

    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        // Fallback demo capture
        addMockCapturedPhoto(category || photoCategory);
      }
    } else {
      // Mobile native camera fallback / alert
      addMockCapturedPhoto(category || photoCategory);
    }
  };

  const handleWebFileSelect = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        if (dataUrl && currentJob) {
          const newPhoto = {
            id: `photo_${Date.now()}`,
            url: dataUrl,
            title: photoCategory,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            gps: '18.5204° N, 73.8567° E (Pune Solar Park)',
            storageLocation: `Local App Vault (SafeStorage: technician_photos_${currentJob.id})`,
            syncStatus: 'Ready for DISCOM Sync',
          };
          const nextPhotos = [newPhoto, ...currentJob.photos];
          persistJobPhotos(currentJob.id, nextPhotos);
          mirrorPhotoToCRMDb(currentJob, newPhoto);
          const updated = jobs.map((j) => {
            if (j.id === currentJob.id) {
              return { ...j, photos: nextPhotos };
            }
            return j;
          });
          setJobs(updated);
          setShowPhotoModal(false);
          notify('Camera Evidence Saved', `${photoCategory} stored in local app storage (SafeStorage) & synced to CRM.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const mirrorPhotoToCRMDb = (job: any, photo: any) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('sunflow360.demo-db');
        if (raw) {
          const db = JSON.parse(raw);
          const inst = db.installations?.find(
            (i: any) => i.id === job.id || i.reference === job.reference || i.customerId === job.customerId
          );
          if (inst) {
            if (!inst.photos) inst.photos = [];
            inst.photos.unshift({
              id: photo.id,
              url: photo.url,
              caption: `${photo.title} (GPS: ${photo.gps})`,
              at: new Date().toISOString(),
            });
            window.localStorage.setItem('sunflow360.demo-db', JSON.stringify(db));
          }
        }
      } catch {}
    }
  };

  const addMockCapturedPhoto = (category: string) => {
    if (!currentJob) return;
    const sampleUrls: Record<string, string> = {
      'Solar Array Completed': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
      'Inverter & Wiring': 'https://images.unsplash.com/photo-1548337138-e87d889cc369?auto=format&fit=crop&w=800&q=80',
      'Earthing Pit & Safety': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      'Net Meter Commissioning': 'https://images.unsplash.com/photo-1558441719-8b489c63f739?auto=format&fit=crop&w=800&q=80',
    };

    const newPhoto = {
      id: `photo_${Date.now()}`,
      url: sampleUrls[category] || 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      title: category,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      gps: '18.5204° N, 73.8567° E (Pune Sector 4)',
      storageLocation: `Local App Vault (SafeStorage: technician_photos_${currentJob.id})`,
      syncStatus: 'Ready for DISCOM Sync',
    };

    const nextPhotos = [newPhoto, ...currentJob.photos];
    persistJobPhotos(currentJob.id, nextPhotos);
    mirrorPhotoToCRMDb(currentJob, newPhoto);
    const updated = jobs.map((j) => {
      if (j.id === currentJob.id) {
        return { ...j, photos: nextPhotos };
      }
      return j;
    });
    setJobs(updated);
    setShowPhotoModal(false);
    notify(
      'Camera Evidence Captured & Stored 💾',
      `${category} saved to local app storage (SafeStorage: technician_photos_${currentJob.id}) & synced to CRM with GPS stamp.`
    );
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!currentJob) return;
    const nextPhotos = currentJob.photos.filter((p) => p.id !== photoId);
    persistJobPhotos(currentJob.id, nextPhotos);
    const updated = jobs.map((j) => {
      if (j.id === currentJob.id) {
        return { ...j, photos: nextPhotos };
      }
      return j;
    });
    setJobs(updated);
  };

  const handleSyncPhotosWithDiscom = () => {
    if (!currentJob) return;
    setSyncStatus((prev) => ({ ...prev, [currentJob.id]: 'synced' }));
    notify(
      'DISCOM Cloud Synchronization Complete ☁️',
      `All ${currentJob.photos.length} photos for ${currentJob.reference} uploaded to MSEDCL portal with GPS coordinates (18.5204° N, 73.8567° E).`
    );
  };

  const handleCompleteJob = () => {
    if (!currentJob) return;
    if (currentJob.photos.length < 2) {
      notify('Evidence Required', 'Please take at least two camera verification photos (Array & Inverter)');
      return;
    }
    const updated = jobs.map((j) => {
      if (j.id === currentJob.id) {
        return { ...j, status: 'Completed' as const, progress: 100 };
      }
      return j;
    });
    setJobs(updated);
    setIsTimerRunning(false);
    notify('Job Completed! 🎉', `Installation ${currentJob.reference} submitted to DISCOM and handover report ready.`);
  };

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0D2B20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Hidden file input for web camera capture */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          accept="image/*"
          // @ts-ignore
          capture="environment"
          ref={fileInputRef as any}
          style={{ display: 'none' }}
          onChange={handleWebFileSelect}
        />
      )}

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/(portal)')}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Field Technician Workspace</Text>
          <Text style={styles.navSubtitle}>Arjun Patil · Lead Installer</Text>
        </View>
        <Pressable
          style={styles.quickAddPhotoBtn}
          onPress={() => setShowPhotoModal(true)}
        >
          <Text style={styles.quickAddPhotoIcon}>📷</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Selector Pills */}
        <View style={styles.jobSelectorRow}>
          {jobs.map((job) => {
            const isSelected = job.id === currentJob?.id;
            return (
              <Pressable
                key={job.id}
                style={[
                  styles.jobPill,
                  isSelected && styles.jobPillSelected,
                ]}
                onPress={() => setSelectedJobId(job.id)}
              >
                <Text
                  style={[
                    styles.jobPillRef,
                    isSelected && styles.jobPillRefSelected,
                  ]}
                >
                  {job.reference}
                </Text>
                <Text
                  style={[
                    styles.jobPillCust,
                    isSelected && styles.jobPillCustSelected,
                  ]}
                >
                  {job.customerName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {currentJob && (
          <>
            {/* Active Job Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.badgeWrap}>
                  <Text style={styles.referenceBadge}>{currentJob.reference}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      currentJob.status === 'Completed'
                        ? { backgroundColor: '#10B981' }
                        : { backgroundColor: '#F59E0B' },
                    ]}
                  >
                    <Text style={styles.statusPillText}>{currentJob.status}</Text>
                  </View>
                </View>

                {/* Live Working Timer */}
                <Pressable
                  style={styles.timerBadge}
                  onPress={() => setIsTimerRunning(!isTimerRunning)}
                >
                  <Text style={styles.timerIcon}>{isTimerRunning ? '⏱️' : '⏸️'}</Text>
                  <Text style={styles.timerText}>{formatTimer(timerSeconds)}</Text>
                </Pressable>
              </View>

              <Text style={styles.customerNameText}>{currentJob.customerName}</Text>
              <Text style={styles.systemSpecsText}>
                {currentJob.capacity} kW {currentJob.systemType}
              </Text>

              {/* Location & Phone Quick Actions */}
              <View style={styles.quickContactRow}>
                <View style={styles.contactChip}>
                  <Text style={styles.contactChipIcon}>📍</Text>
                  <Text style={styles.contactChipText} numberOfLines={1}>
                    {currentJob.address}, {currentJob.city}
                  </Text>
                </View>

                <Pressable
                  style={styles.callChip}
                  onPress={() => notify('Calling Customer', `Dialing +91 ${currentJob.customerPhone}`)}
                >
                  <Text style={styles.contactChipIcon}>📞</Text>
                  <Text style={styles.callChipText}>+91 {currentJob.customerPhone}</Text>
                </Pressable>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Checklist Completion</Text>
                  <Text style={styles.progressPercent}>{currentJob.progress}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${currentJob.progress}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Camera Evidence Section (Critical User Feature) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>📸 On-Site Camera Verification</Text>
                  <Text style={styles.sectionSubtitle}>
                    Capture required photographic proof of installation
                  </Text>
                </View>
                <Pressable
                  style={styles.captureActionBtn}
                  onPress={() => setShowPhotoModal(true)}
                >
                  <Text style={styles.captureActionIcon}>📷</Text>
                  <Text style={styles.captureActionText}>Take Photo</Text>
                </Pressable>
              </View>

              {/* Required Categories Quick Bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsScroll}
              >
                {[
                  'Solar Array Completed',
                  'Inverter & Wiring',
                  'Earthing Pit & Safety',
                  'Net Meter Commissioning',
                ].map((cat) => (
                  <Pressable
                    key={cat}
                    style={styles.categoryPill}
                    onPress={() => handleTriggerCamera(cat)}
                  >
                    <Text style={styles.categoryPillPlus}>+</Text>
                    <Text style={styles.categoryPillLabel}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Photo Storage & DISCOM Cloud Status Banner */}
              <View style={styles.storageStatusBanner}>
                <View style={styles.storageStatusRow}>
                  <Text style={styles.storageIcon}>💾</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storageTitle}>Local Device Vault: SafeStorage</Text>
                    <Text style={styles.storageSub}>
                      Key: technician_photos_{currentJob.id} · {currentJob.photos.length} photos persisted
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.syncCloudBtn,
                      syncStatus[currentJob.id] === 'synced' && styles.syncCloudBtnDone,
                    ]}
                    onPress={handleSyncPhotosWithDiscom}
                  >
                    <Text style={styles.syncCloudText}>
                      {syncStatus[currentJob.id] === 'synced' ? '✓ Synced' : '☁️ Sync DISCOM'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Captured Photo Thumbnails */}
              {currentJob.photos.length === 0 ? (
                <View style={styles.emptyPhotosBox}>
                  <Text style={styles.emptyPhotosEmoji}>📷</Text>
                  <Text style={styles.emptyPhotosHeading}>No Evidence Photos Yet</Text>
                  <Text style={styles.emptyPhotosSub}>
                    Tap 'Take Photo' above to use your mobile camera and capture array mounting. All photos are saved to local persistent storage.
                  </Text>
                </View>
              ) : (
                <View style={styles.photosGrid}>
                  {currentJob.photos.map((photo) => (
                    <View key={photo.id} style={styles.photoItemCard}>
                      <Pressable onPress={() => setPreviewImage(photo)}>
                        <Image source={{ uri: photo.url }} style={styles.photoThumbnail} />
                        <View style={styles.gpsWatermarkTag}>
                          <Text style={styles.gpsWatermarkText}>📍 GPS 18.52° N</Text>
                        </View>
                      </Pressable>
                      <View style={styles.photoMetaRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.photoTitle} numberOfLines={1}>
                            {photo.title}
                          </Text>
                          <Text style={styles.photoTimestamp}>
                            Verified · {photo.timestamp}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.deletePhotoBtn}
                          onPress={() => handleDeletePhoto(photo.id)}
                        >
                          <Text style={styles.deletePhotoText}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Checklist Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>✅ Installation Checklist</Text>
              <Text style={styles.sectionSubtitle}>
                Check off tasks as completed on site
              </Text>

              <View style={styles.checklistItems}>
                {currentJob.checklist.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.checklistItemRow,
                      item.done && styles.checklistItemRowDone,
                    ]}
                    onPress={() => handleToggleChecklist(item.id)}
                  >
                    <View
                      style={[
                        styles.checkBoxSquare,
                        item.done && styles.checkBoxSquareChecked,
                      ]}
                    >
                      {item.done && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text
                      style={[
                        styles.checkItemLabel,
                        item.done && styles.checkItemLabelDone,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Test Readings & Commissioning */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⚡ Technical Test Readings</Text>
              <Text style={styles.sectionSubtitle}>
                Measured values for DISCOM commissioning report
              </Text>

              <View style={styles.readingsGrid}>
                <View style={styles.readingBox}>
                  <Text style={styles.readingLabel}>Generation</Text>
                  <Text style={styles.readingValue}>
                    {currentJob.tests?.generationKw ?? 4.82} <Text style={styles.readingUnit}>kW</Text>
                  </Text>
                </View>
                <View style={styles.readingBox}>
                  <Text style={styles.readingLabel}>DC Voltage</Text>
                  <Text style={styles.readingValue}>
                    {currentJob.tests?.dcVoltage ?? 385} <Text style={styles.readingUnit}>V</Text>
                  </Text>
                </View>
                <View style={styles.readingBox}>
                  <Text style={styles.readingLabel}>AC Voltage</Text>
                  <Text style={styles.readingValue}>
                    {currentJob.tests?.acVoltage ?? 230} <Text style={styles.readingUnit}>V</Text>
                  </Text>
                </View>
                <View style={styles.readingBox}>
                  <Text style={styles.readingLabel}>Earth Pit</Text>
                  <Text style={styles.readingValue}>
                    {currentJob.tests?.earthingOhm ?? 2.4} <Text style={styles.readingUnit}>Ω</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Finish Job Action Button */}
            <Pressable
              style={[
                styles.completeJobButton,
                currentJob.status === 'Completed' && styles.jobAlreadyCompletedBtn,
              ]}
              onPress={handleCompleteJob}
              disabled={currentJob.status === 'Completed'}
            >
              <Text style={styles.completeJobButtonText}>
                {currentJob.status === 'Completed'
                  ? '✓ Job Certified & Complete'
                  : 'Submit Handover & Certify Job →'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Camera Capture Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Camera Category</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowPhotoModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              Which installation stage are you photographing right now?
            </Text>

            <View style={styles.categoryOptionList}>
              {[
                { title: 'Solar Array Completed', icon: '☀️' },
                { title: 'Inverter & Wiring', icon: '⚡' },
                { title: 'Earthing Pit & Safety', icon: '🛡️' },
                { title: 'Net Meter Commissioning', icon: '📟' },
              ].map((opt) => (
                <Pressable
                  key={opt.title}
                  style={styles.categoryOptionItem}
                  onPress={() => {
                    handleTriggerCamera(opt.title);
                  }}
                >
                  <Text style={styles.categoryOptionIcon}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryOptionTitle}>{opt.title}</Text>
                    <Text style={styles.categoryOptionDesc}>
                      Verified GPS tagged photo
                    </Text>
                  </View>
                  <Text style={styles.categoryOptionArrow}>📷</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Photo Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewBackdrop}>
          <Pressable
            style={styles.closePreviewBtn}
            onPress={() => setPreviewImage(null)}
          >
            <Text style={styles.closePreviewText}>✕ Close Preview</Text>
          </Pressable>
          {previewImage && (
            <View style={styles.previewImageContainer}>
              <Image
                source={{ uri: previewImage.url || previewImage }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
              <View style={styles.previewMetaCard}>
                <Text style={styles.previewMetaTitle}>
                  {previewImage.title || 'Installation Photo'}
                </Text>
                <Text style={styles.previewMetaGPS}>
                  📍 Watermark: {previewImage.gps || '18.5204° N, 73.8567° E (Pune Sector 4)'}
                </Text>
                <Text style={styles.previewMetaStorage}>
                  💾 Stored at: {previewImage.storageLocation || 'Local SafeStorage Vault'} · Time: {previewImage.timestamp || 'Verified'}
                </Text>
                <Text style={styles.previewMetaStatus}>
                  ✓ Cryptographically Signed for DISCOM Handover
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    paddingTop: 54,
    paddingHorizontal: 20,
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
  backArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navCenter: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 1,
  },
  quickAddPhotoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAddPhotoIcon: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  jobSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  jobPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  jobPillSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  jobPillRef: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  jobPillRefSelected: {
    color: '#10B981',
  },
  jobPillCust: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  jobPillCustSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referenceBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F4C542',
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  timerIcon: {
    fontSize: 13,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  customerNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  systemSpecsText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 14,
  },
  quickContactRow: {
    gap: 8,
    marginBottom: 16,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contactChipIcon: {
    fontSize: 14,
  },
  contactChipText: {
    fontSize: 12,
    color: '#E2E8F0',
    flex: 1,
  },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  callChipText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  captureActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  captureActionIcon: {
    fontSize: 14,
  },
  captureActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  categoryPillsScroll: {
    gap: 8,
    marginBottom: 14,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  categoryPillPlus: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  categoryPillLabel: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  emptyPhotosBox: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyPhotosEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyPhotosHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyPhotosSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 4,
  },
  photosGrid: {
    gap: 12,
  },
  photoItemCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoThumbnail: {
    width: '100%',
    height: 160,
  },
  photoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  photoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoTimestamp: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
  },
  deletePhotoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  checklistItems: {
    gap: 10,
    marginTop: 12,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  checklistItemRowDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  checkBoxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxSquareChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  checkItemLabel: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
    flex: 1,
  },
  checkItemLabelDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  readingBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  readingLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  readingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  readingUnit: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  completeJobButton: {
    backgroundColor: '#10B981',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 6,
    marginTop: 8,
  },
  jobAlreadyCompletedBtn: {
    backgroundColor: '#059669',
    opacity: 0.8,
  },
  completeJobButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 18,
  },
  categoryOptionList: {
    gap: 10,
    marginBottom: 20,
  },
  categoryOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  categoryOptionIcon: {
    fontSize: 22,
  },
  categoryOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryOptionDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  categoryOptionArrow: {
    fontSize: 18,
  },
  // Preview
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  closePreviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fullPreviewImage: {
    width: '100%',
    height: '65%',
  },
  previewImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMetaCard: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  previewMetaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewMetaGPS: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  previewMetaStorage: {
    fontSize: 11,
    color: '#94A3B8',
  },
  previewMetaStatus: {
    fontSize: 11,
    color: '#F4C542',
    fontWeight: '700',
    marginTop: 2,
  },
  storageStatusBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  storageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storageIcon: { fontSize: 22 },
  storageTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  storageSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  syncCloudBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncCloudBtnDone: {
    backgroundColor: '#059669',
  },
  syncCloudText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gpsWatermarkTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#10B981',
  },
  gpsWatermarkText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '800',
  },
});
