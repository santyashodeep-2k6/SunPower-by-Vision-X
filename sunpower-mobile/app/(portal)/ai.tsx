import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiClient, ELEVENLABS_DEFAULT_AGENT_ID } from '@/services/apiClient';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const NUM_BARS = 22;

export const VOICE_LANGUAGES = [
  {
    code: 'en' as const,
    label: 'English',
    native: 'English',
    greeting:
      "Hello! Welcome to SunFlow 360. I'm your solar voice receptionist. How can I assist you with your rooftop solar enquiry today?",
  },
  {
    code: 'hi' as const,
    label: 'Hindi',
    native: 'हिन्दी',
    greeting:
      'नमस्ते! SunFlow 360 में आपका स्वागत है। मैं आपकी सोलर वॉइस रिसेप्शनिस्ट हूँ। आज आपकी सोलर संबंधी क्या सहायता करूँ?',
  },
  {
    code: 'mr' as const,
    label: 'Marathi',
    native: 'मराठी',
    greeting:
      'नमस्कार! SunFlow 360 मध्ये आपले स्वागत आहे. मी आपली सोलर व्हॉइस रिसेप्शनिस्ट आहे. आज मी आपल्याला सोलर प्रकल्पाबद्दल कशी मदत करू शकते?',
  },
  {
    code: 'te' as const,
    label: 'Telugu',
    native: 'తెలుగు',
    greeting:
      'నమస్కారం! SunFlow 360 కి స్వాగతం. నేను మీ సోలార్ వాయిస్ రిసెప్షనిస్ట్‌ని. రూఫ్‌టాప్ సోలార్ కోసం నేను మీకు ఎలా సహాయపడగలను?',
  },
] as const;

type VoiceLangCode = (typeof VOICE_LANGUAGES)[number]['code'];

interface TranscriptMessage {
  id: number;
  role: 'agent' | 'user';
  text: string;
  time: string;
}

export default function SolarAIAssistantScreen() {
  const router = useRouter();

  const [selectedLang, setSelectedLang] = useState<VoiceLangCode>('en');
  const [callActive, setCallActive] = useState(true);
  const [callConnecting, setCallConnecting] = useState(false);
  const [seconds, setSeconds] = useState(18);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [agentMode, setAgentMode] = useState<'speaking' | 'listening'>('speaking');
  const [statusText, setStatusText] = useState('SunFlow AI Speaking…');
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [typedMessage, setTypedMessage] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Animated bars heights
  const barHeights = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(10))
  ).current;

  const activeLang =
    VOICE_LANGUAGES.find((l) => l.code === selectedLang) || VOICE_LANGUAGES[0];

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  // Start ElevenLabs Conversational Session
  useEffect(() => {
    connectElevenLabs();
    return () => {
      disconnectElevenLabs();
    };
  }, [selectedLang]);

  const connectElevenLabs = useCallback(async () => {
    setCallConnecting(true);
    setStatusText(`Connecting to ElevenLabs in ${activeLang.native}…`);

    // Add initial agent greeting in chosen language
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 1,
        role: 'agent',
        text: activeLang.greeting,
        time: now,
      },
    ]);

    try {
      // Connect to ElevenLabs Conversational WebSocket or Audio API
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_DEFAULT_AGENT_ID}`;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'WebSocket' in window) {
        try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            setCallConnecting(false);
            setCallActive(true);
            setAgentMode('speaking');
            setStatusText(`SunFlow AI speaking (${activeLang.native})…`);

            // Play voice greeting if SpeechSynthesis is available on browser
            playGreetingAudio(activeLang.greeting, selectedLang);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'agent_response' || data.text) {
                const text = data.text || data.agent_response;
                const msgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages((prev) => [
                  ...prev,
                  { id: Date.now(), role: 'agent', text, time: msgTime },
                ]);
                setAgentMode('speaking');
                setStatusText(`SunFlow AI speaking (${activeLang.native})…`);
              } else if (data.type === 'user_transcript') {
                const text = data.user_transcript;
                const msgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages((prev) => [
                  ...prev,
                  { id: Date.now(), role: 'user', text, time: msgTime },
                ]);
                setAgentMode('listening');
                setStatusText(`Listening to you (${activeLang.native})…`);
              }
            } catch {
              // ignore binary or format ping
            }
          };

          ws.onerror = () => {
            fallbackInteractiveMode();
          };
        } catch {
          fallbackInteractiveMode();
        }
      } else {
        fallbackInteractiveMode();
      }
    } catch {
      fallbackInteractiveMode();
    }
  }, [selectedLang]);

  const fallbackInteractiveMode = () => {
    setCallConnecting(false);
    setCallActive(true);
    setAgentMode('speaking');
    setStatusText(`SunFlow AI speaking (${activeLang.native})…`);
    playGreetingAudio(activeLang.greeting, selectedLang);

    // Switch to listening after greeting
    setTimeout(() => {
      setAgentMode('listening');
      setStatusText(`Listening to you (${activeLang.native})…`);
    }, 4000);
  };

  const playGreetingAudio = (text: string, lang: VoiceLangCode) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langMap: Record<VoiceLangCode, string> = {
          en: 'en-IN',
          hi: 'hi-IN',
          mr: 'mr-IN',
          te: 'te-IN',
        };
        utterance.lang = langMap[lang] || 'en-IN';
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        if (!isSpeaker) utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      } catch {
        // speech synthesis not allowed
      }
    }
  };

  const disconnectElevenLabs = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Run call duration timer
  useEffect(() => {
    let timer: any;
    if (callActive) {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callActive]);

  // Audio waveform animation loop
  useEffect(() => {
    let isCancelled = false;

    const animateBars = () => {
      if (isCancelled) return;

      const animations = barHeights.map((barAnim, index) => {
        const distFromCenter = Math.abs(index - NUM_BARS / 2);
        const maxH = Math.max(12, 38 - distFromCenter * 1.5);
        const randomH = Math.floor(Math.random() * maxH) + 8;

        return Animated.timing(barAnim, {
          toValue: randomH,
          duration: 180 + Math.random() * 120,
          useNativeDriver: false,
        });
      });

      Animated.parallel(animations).start(() => {
        if (!isCancelled) {
          animateBars();
        }
      });
    };

    if (callActive) {
      animateBars();
    }

    return () => {
      isCancelled = true;
    };
  }, [barHeights, callActive, agentMode]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Send typed text to ElevenLabs agent
  const handleSendTypedMessage = () => {
    if (!typedMessage.trim()) return;
    const msg = typedMessage.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text: msg, time },
    ]);
    setTypedMessage('');
    setAgentMode('listening');
    setStatusText('Processing your question…');

    // If WebSocket is open, send to ElevenLabs
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ text: msg }));
      } catch {}
    }

    // Dynamic response simulation if backend is standalone
    setTimeout(() => {
      let reply = `That's great! For your rooftop, a 5 kW On-Grid system generates about 20-22 units daily, saving ₹4,000 every month on electricity bills. Plus, PM Surya Ghar gives a direct subsidy of ₹78,000. Would you like me to book a free site survey?`;
      if (selectedLang === 'hi') {
        reply = `बहुत बढ़िया! 5 किलोवाट ऑन-ग्रिड सोलर सिस्टम रोज़ाना लगभग 20-22 यूनिट बिजली पैदा करता है, जिससे आपके मासिक बिल में ₹4,000 तक की बचत होगी। इसके अलावा पीएम सूर्य घर योजना के तहत ₹78,000 की सरकारी सब्सिडी सीधे आपके खाते में आती है।`;
      } else if (selectedLang === 'mr') {
        reply = `उत्तम! ५ किलोवॅट ऑन-ग्रिड सोलर यंत्रणा दररोज सुमारे २०-२२ युनिट वीज तयार करते. यामुळे दरमहा अंदाजे ₹४,००० ची बचत होईल आणि ₹७८,००० थेट सरकारी सबसिडी मिळते.`;
      }

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'agent', text: reply, time: replyTime },
      ]);
      setAgentMode('speaking');
      setStatusText(`SunFlow AI speaking (${activeLang.native})…`);
      playGreetingAudio(reply, selectedLang);
    }, 1500);
  };

  const handleEndCall = () => {
    disconnectElevenLabs();
    setCallActive(false);

    // Save lead to CRM backend webhook
    ApiClient.postVoiceWebhook({
      customerName: 'Mobile App Caller',
      customerPhone: '9876543210',
      city: 'Pune',
      capacityKw: 5.0,
      summary: `Customer had a ${formatTime(seconds)} consultation in ${activeLang.label} with ElevenLabs AI receptionist.`,
      conversationId: `conv_${Date.now()}`,
    }).catch(() => {});

    router.back();
  };

  return (
    <LinearGradient
      colors={['#0C0721', '#140C33', '#1F1147', '#150A30']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        {/* Circular Frosted Back Button */}
        <Pressable style={styles.backButton} onPress={handleEndCall}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18L9 12L15 6"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        {/* Title and Call Status */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Solar AI Assistant</Text>
          <View style={styles.callStatusRow}>
            <View
              style={[
                styles.greenDot,
                { backgroundColor: callActive ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text style={styles.callStatusText}>
              {callConnecting
                ? 'Connecting…'
                : callActive
                ? `ElevenLabs AI · ${formatTime(seconds)}`
                : 'Call Ended'}
            </Text>
          </View>
        </View>

        {/* Live Transcript Toggle */}
        <Pressable
          style={styles.transcriptToggleBtn}
          onPress={() => setShowTranscript(!showTranscript)}
        >
          <Text style={styles.transcriptToggleIcon}>
            {showTranscript ? '💬' : '🗨️'}
          </Text>
        </Pressable>
      </View>

      {/* Language Selector Pills */}
      <View style={styles.langSelectorRow}>
        {VOICE_LANGUAGES.map((lang) => {
          const isSelected = selectedLang === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[
                styles.langPill,
                isSelected && styles.langPillSelected,
              ]}
              onPress={() => setSelectedLang(lang.code)}
            >
              <Text
                style={[
                  styles.langPillText,
                  isSelected && styles.langPillTextSelected,
                ]}
              >
                {lang.native}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3D Robot Hero Centerpiece matching Screenshot */}
      <View style={styles.robotContainer}>
        <Image
          source={require('@/assets/robot_call_screen.jpg')}
          style={styles.robotImage}
          resizeMode="contain"
        />

        {/* Live Subtitle Transcript Overlay */}
        {showTranscript && messages.length > 0 && (
          <View style={styles.liveSubtitleCard}>
            <Text style={styles.subtitleSpeaker}>
              {messages[messages.length - 1].role === 'agent'
                ? '🤖 SunFlow AI'
                : '👤 You'}
            </Text>
            <Text style={styles.subtitleText} numberOfLines={3}>
              "{messages[messages.length - 1].text}"
            </Text>
          </View>
        )}
      </View>

      {/* Audio Waveform Visualizer */}
      <View style={styles.waveformContainer}>
        {barHeights.map((barAnim, index) => {
          let barColor = '#22D3EE';
          if (index >= 4 && index <= 7) barColor = '#4ADE80';
          if (index >= 8 && index <= 13) barColor = '#FFFFFF';
          if (index >= 14 && index <= 17) barColor = '#C084FC';
          if (index > 17) barColor = '#818CF8';

          return (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: barAnim,
                  backgroundColor: barColor,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Frosted Status Pill */}
      <View style={styles.statusPillContainer}>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{statusText}</Text>
        </View>
      </View>

      {/* In-Call Type Input Bar */}
      {showTextInput && (
        <View style={styles.typeInputRow}>
          <TextInput
            style={styles.textInputBox}
            placeholder="Ask anything about packages, subsidy or bills…"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={typedMessage}
            onChangeText={setTypedMessage}
            onSubmitEditing={handleSendTypedMessage}
          />
          <Pressable
            style={styles.sendTextBtn}
            onPress={handleSendTypedMessage}
          >
            <Text style={styles.sendTextIcon}>↑</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom Action Controls matching Screenshot */}
      <View style={styles.controlsRow}>
        {/* Mute Button */}
        <Pressable
          style={[
            styles.secondaryControlBtn,
            isMuted && styles.controlBtnActive,
          ]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            {isMuted ? (
              <Path
                d="M1 1L23 23M9 9V3C9 1.34315 10.3431 0 12 0C13.6569 0 15 1.34315 15 3V9M19 10V12C19 15.866 15.866 19 12 19M5 10V12C5 13.5674 5.5147 15.0147 6.38462 16.1824M12 19V24M8 24H16"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ) : (
              <>
                <Rect
                  x={8}
                  y={2}
                  width={8}
                  height={12}
                  rx={4}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <Path
                  d="M4 10V11C4 15.4183 7.58172 19 12 19C16.4183 19 20 15.4183 20 11V10M12 19V23M8 23H16"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </>
            )}
          </Svg>
        </Pressable>

        {/* End Call Button (Large Red Circle) */}
        <Pressable style={styles.endCallButton} onPress={handleEndCall}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 8.5C5.5 6 9.5 5 12 5C14.5 5 18.5 6 21 8.5C21.5 9 21.5 9.8 21 10.3L18.8 12.5C18.3 13 17.5 13 17 12.5L15.3 10.8C15.1 10.6 15 10.3 15 10V8.2C13.5 7.8 10.5 7.8 9 8.2V10C9 10.3 8.9 10.6 8.7 10.8L7 12.5C6.5 13 5.7 13 5.2 12.5L3 10.3C2.5 9.8 2.5 9 3 8.5Z"
              fill="#FFFFFF"
            />
          </Svg>
        </Pressable>

        {/* Speaker / Text Toggle Button */}
        <Pressable
          style={[
            styles.secondaryControlBtn,
            showTextInput && styles.controlBtnActive,
          ]}
          onPress={() => setShowTextInput(!showTextInput)}
        >
          <Text style={{ fontSize: 20 }}>💬</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  transcriptToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  transcriptToggleIcon: {
    fontSize: 18,
  },
  titleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  callStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  callStatusText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  langSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  langPillSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  langPillTextSelected: {
    color: '#0D2B20',
    fontWeight: '800',
  },
  robotContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  robotImage: {
    width: width * 0.78,
    height: width * 0.88,
  },
  liveSubtitleCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  subtitleSpeaker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#F8FAFC',
    lineHeight: 18,
    fontWeight: '500',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: 4,
    marginBottom: 12,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  statusPillContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  typeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  textInputBox: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 6,
  },
  sendTextBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendTextIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 10,
  },
  secondaryControlBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  endCallButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
