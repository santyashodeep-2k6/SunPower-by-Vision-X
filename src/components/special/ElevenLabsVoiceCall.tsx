import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { VoiceConversation } from '@elevenlabs/react'

/*
  SunFlow 360 × ElevenLabs Conversational Voice Receptionist
  -----------------------------------------------------------
  An authentic ElevenLabs calling agent interface crafted with
  SunFlow 360's Liquid Glassmorphism brand aesthetic.

  Features:
  - Real-time two-way audio streaming via ElevenLabs Conversational AI
  - Multi-language support: English, Hindi (हिन्दी), Marathi (मराठी), Telugu (తెలుగు)
  - Live frequency spectrum & dynamic organic voice orb
  - Interactive transcript with live subtitles
  - In-call text messaging (send typed notes/addresses to agent)
  - Microphone mute/unmute control
  - Speaker audio mute/unmute control
  - Live duration timer
  - Post-call summary & retry
*/

const DEFAULT_AGENT_ID = 'agent_4301m68j84sdfnzty10t96p2qt8y'

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
] as const

export type VoiceLangCode = (typeof VOICE_LANGUAGES)[number]['code']

type CallStatus = 'idle' | 'connecting' | 'connected' | 'ended' | 'error'
type AgentMode = 'listening' | 'speaking' | 'idle'

interface TranscriptMessage {
  id: number
  role: 'agent' | 'user'
  text: string
  time: string
}

interface Props {
  agentId?: string
  onClose?: () => void
  autoStart?: boolean
}

export function ElevenLabsVoiceCall({ agentId, onClose, autoStart = false }: Props) {
  const resolvedAgentId =
    agentId || import.meta.env.VITE_ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID

  const [selectedLang, setSelectedLang] = useState<VoiceLangCode>('en')
  const [status, setStatus] = useState<CallStatus>('idle')
  const [mode, setMode] = useState<AgentMode>('idle')
  const [muted, setMuted] = useState(false)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(true)
  const [showTextInput, setShowTextInput] = useState(false)
  const [typedMessage, setTypedMessage] = useState('')

  const sessionRef = useRef<VoiceConversation | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgCountRef = useRef(0)
  const transcriptBottomRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)

  // Scroll transcript to bottom on new message
  useEffect(() => {
    if (showTranscript) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, showTranscript])

  // Call duration counter
  useEffect(() => {
    if (status === 'connected') {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ---------- Start ElevenLabs Session ----------
  const startCall = useCallback(async () => {
    if (!resolvedAgentId) {
      setError('ElevenLabs Agent ID is missing. Please configure it in your settings.')
      setStatus('error')
      return
    }

    setStatus('connecting')
    setError(null)
    setMessages([])
    setConversationId(null)
    setMuted(false)
    setSpeakerMuted(false)

    const langConfig =
      VOICE_LANGUAGES.find((l) => l.code === selectedLang) || VOICE_LANGUAGES[0]

    try {
      // Build startSession configuration.
      // Notice: In ElevenLabs, overriding system prompt or dynamic variables from the client
      // will trigger "Server error: Unknown error (1006)" if "Allow client overrides" is
      // disabled in the agent's ElevenLabs Security dashboard.
      // We pass language and greeting overrides cleanly, falling back to direct connection if needed.
      const sessionConfig: Parameters<typeof VoiceConversation.startSession>[0] = {
        agentId: resolvedAgentId,
        onConnect: ({ conversationId: id }) => {
          setConversationId(id)
          setStatus('connected')
          setMode('listening')
        },
        onDisconnect: () => {
          setStatus('ended')
          setMode('idle')
          sessionRef.current = null
        },
        onError: (errMessage, context) => {
          console.error('ElevenLabs conversation error:', errMessage, context)
          const msg = typeof errMessage === 'string' ? errMessage : 'Voice connection error occurred.'
          setError(msg)
          setStatus('error')
          sessionRef.current = null
        },
        onMessage: (payload) => {
          const role = payload.role === 'user' || payload.source === 'user' ? 'user' : 'agent'
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          setMessages((prev) => [
            ...prev,
            { id: ++msgCountRef.current, role, text: payload.message, time: now },
          ])
        },
        onModeChange: ({ mode: nextMode }) => {
          setMode(nextMode as AgentMode)
        },
        onStatusChange: ({ status: nextStatus }) => {
          if (nextStatus === 'connected') {
            setStatus('connected')
          } else if (nextStatus === 'disconnected') {
            setStatus('ended')
          }
        },
      }

      // If user explicitly picked a non-English language, include language override
      if (selectedLang !== 'en') {
        sessionConfig.overrides = {
          agent: {
            language: langConfig.code,
            firstMessage: langConfig.greeting,
          },
        }
      }

      const session = await VoiceConversation.startSession(sessionConfig)
      sessionRef.current = session
    } catch (err: unknown) {
      console.error('Failed to initiate ElevenLabs call:', err)
      const message = (err as Error)?.message || 'Could not establish connection.'
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('notallowed')) {
        setError('Microphone permission is required to talk with the AI receptionist. Please enable microphone access.')
      } else {
        setError(message)
      }
      setStatus('error')
      sessionRef.current = null
    }
  }, [resolvedAgentId, selectedLang])

  // Optional auto-start
  useEffect(() => {
    if (autoStart && status === 'idle') {
      startCall()
    }
  }, [autoStart, startCall, status])

  // ---------- End Session ----------
  const endCall = useCallback(async () => {
    try {
      if (sessionRef.current) {
        await sessionRef.current.endSession()
      }
    } catch {
      /* ignore */
    } finally {
      sessionRef.current = null
      setStatus('ended')
      setMode('idle')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.endSession().catch(() => {})
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  // ---------- Controls ----------
  const toggleMute = () => {
    if (!sessionRef.current) return
    const nextMuted = !muted
    try {
      sessionRef.current.setMicMuted(nextMuted)
      setMuted(nextMuted)
    } catch (err) {
      console.error('Failed to toggle mic mute:', err)
    }
  }

  const toggleSpeaker = () => {
    if (!sessionRef.current) return
    const nextSpeaker = !speakerMuted
    try {
      sessionRef.current.setVolume({ volume: nextSpeaker ? 0 : 1 })
      setSpeakerMuted(nextSpeaker)
    } catch (err) {
      console.error('Failed to set speaker volume:', err)
    }
  }

  const sendTyped = (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedMessage.trim() || !sessionRef.current) return
    try {
      // Send text message directly into the active session
      sessionRef.current.sendUserMessage(typedMessage.trim())
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages((prev) => [
        ...prev,
        { id: ++msgCountRef.current, role: 'user', text: typedMessage.trim(), time: now },
      ])
      setTypedMessage('')
    } catch (err) {
      console.error('Failed to send user message:', err)
    }
  }

  // ---------- Audio Waveform Visualizer ----------
  useEffect(() => {
    if (status !== 'connected' || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    const render = () => {
      if (!running) return
      animFrameRef.current = requestAnimationFrame(render)

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const session = sessionRef.current
      let freqData: Uint8Array | null = null

      if (session) {
        try {
          if (mode === 'speaking') {
            freqData = session.getOutputByteFrequencyData()
          } else if (mode === 'listening' && !muted) {
            freqData = session.getInputByteFrequencyData()
          }
        } catch {
          freqData = null
        }
      }

      // Draw smooth symmetric waveform
      const barCount = 28
      const barWidth = 4
      const gap = 4
      const totalWidth = barCount * (barWidth + gap) - gap
      const startX = (w - totalWidth) / 2
      const centerY = h / 2

      for (let i = 0; i < barCount; i++) {
        let value = 0.08 // ambient breathing height
        if (freqData && freqData.length > 0) {
          const sampleIndex = Math.floor((i / barCount) * (freqData.length / 2))
          value = Math.max(0.08, freqData[sampleIndex] / 255)
        } else if (status === 'connected') {
          // Gentle idle ripple
          value = 0.08 + Math.sin(Date.now() / 400 + i * 0.4) * 0.04
        }

        const barHeight = Math.min(h - 4, Math.max(4, value * (h - 8)))
        const x = startX + i * (barWidth + gap)
        const y = centerY - barHeight / 2

        // Color based on active mode: Sunshine Yellow when agent speaks, Emerald Green when user speaks
        if (mode === 'speaking') {
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight)
          grad.addColorStop(0, '#FFEAA7')
          grad.addColorStop(0.5, '#F4C542')
          grad.addColorStop(1, '#E7A934')
          ctx.fillStyle = grad
        } else {
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight)
          grad.addColorStop(0, '#75E6A9')
          grad.addColorStop(0.5, '#38B878')
          grad.addColorStop(1, '#217A50')
          ctx.fillStyle = grad
        }

        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }
    }

    render()

    return () => {
      running = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [status, mode, muted])

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isEnded = status === 'ended'

  const activeLang =
    VOICE_LANGUAGES.find((l) => l.code === selectedLang) || VOICE_LANGUAGES[0]

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col select-none">
      {/* ===================== Top Status Bar ===================== */}
      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunshine/20 text-sunshine">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-[14px] font-semibold tracking-tight text-white">
              SunFlow 360 AI Receptionist
            </h4>
            <p className="text-[11px] text-white/55">
              Powered by ElevenLabs Conversational AI
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
            </span>
            <span className="font-mono text-[13px] font-medium text-white/90">
              {formatDuration(elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* ===================== Language Selector Pill Bar ===================== */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
        <div className="flex items-center gap-1.5 pl-2 text-[12px] font-medium text-white/70">
          <Globe className="h-3.5 w-3.5 text-sunshine" />
          <span>Language:</span>
        </div>
        <div className="flex items-center gap-1">
          {VOICE_LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                disabled={isConnected || isConnecting}
                onClick={() => setSelectedLang(lang.code)}
                className={`rounded-xl px-2.5 py-1 text-[12px] font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald text-forest font-semibold shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                title={`Speak in ${lang.label}`}
              >
                <span>{lang.native}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===================== Main Interactive Stage ===================== */}
      <div className="relative flex min-h-[180px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/4 p-5 shadow-inner backdrop-blur-md">
        {/* Ambient Glow Aura */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 rounded-3xl transition-opacity duration-1000 ${
            isConnected
              ? mode === 'speaking'
                ? 'bg-[radial-gradient(ellipse_at_center,rgb(244_197_66/0.25)_0%,transparent_70%)] opacity-100'
                : 'bg-[radial-gradient(ellipse_at_center,rgb(56_184_120/0.22)_0%,transparent_70%)] opacity-100'
              : isConnecting
                ? 'bg-[radial-gradient(ellipse_at_center,rgb(244_197_66/0.18)_0%,transparent_70%)] opacity-100 animate-pulse'
                : 'opacity-0'
          }`}
        />

        {/* ElevenLabs Central Calling Sphere / Orb */}
        <div className="relative mb-2.5 flex items-center justify-center">
          {/* Animated Outermost Ripple Ring */}
          {isConnected && (
            <span
              className={`absolute -inset-4 rounded-full border transition-all duration-700 ${
                mode === 'speaking'
                  ? 'border-sunshine/40 animate-ping'
                  : 'border-emerald/30 animate-pulse'
              }`}
            />
          )}

          {/* Secondary Breathing Halo */}
          <div
            className={`flex h-22 w-22 items-center justify-center rounded-full transition-all duration-500 ${
              isConnected
                ? mode === 'speaking'
                  ? 'scale-105 bg-sunshine/25 shadow-[0_0_35px_rgb(244_197_66/0.5)]'
                  : 'bg-emerald/20 shadow-[0_0_35px_rgb(56_184_120/0.4)]'
                : isConnecting
                  ? 'bg-sunshine/15 animate-pulse'
                  : isEnded
                    ? 'bg-white/10'
                    : 'bg-white/12'
            }`}
          >
            {/* Core Icon Capsule */}
            <div
              className={`flex h-15 w-15 items-center justify-center rounded-full transition-transform duration-300 ${
                isConnected
                  ? mode === 'speaking'
                    ? 'bg-gradient-to-tr from-sunshine to-amber text-forest shadow-md'
                    : 'bg-gradient-to-tr from-emerald to-botanical text-forest shadow-md'
                  : isConnecting
                    ? 'bg-sunshine text-forest'
                    : 'bg-white/15 text-white/70'
              }`}
            >
              {isConnected ? (
                mode === 'speaking' ? (
                  <Volume2 className="h-7 w-7 animate-bounce" />
                ) : (
                  <Mic className="h-7 w-7" />
                )
              ) : isConnecting ? (
                <span className="h-6 w-6 animate-spin rounded-full border-3 border-forest border-t-transparent" />
              ) : isEnded ? (
                <PhoneOff className="h-6 w-6 text-white/60" />
              ) : (
                <PhoneCall className="h-6 w-6" />
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Status Label */}
        <div className="text-center">
          <p className="text-[15px] font-semibold text-white">
            {isConnected
              ? mode === 'speaking'
                ? `SunFlow AI is speaking (${activeLang.native})…`
                : muted
                  ? 'Microphone Muted'
                  : `Listening to you (${activeLang.native})…`
              : isConnecting
                ? 'Connecting call…'
                : isEnded
                  ? 'Call Finished'
                  : `Ready to Call in ${activeLang.label} (${activeLang.native})`}
          </p>
          <p className="mt-0.5 text-[12px] text-white/60">
            {isConnected
              ? mode === 'speaking'
                ? 'Speak anytime to interrupt'
                : muted
                  ? 'Unmute below to speak'
                  : 'Speak naturally, ask about packages, subsidies or book a survey'
              : isConnecting
                ? `Connecting in ${activeLang.label}…`
                : isEnded
                  ? `Completed (${formatDuration(elapsed)}) · Thank you for calling SunFlow 360`
                  : 'Click below to connect with our live solar voice assistant'}
          </p>
        </div>

        {/* Real-time Frequency Spectrum Waveform */}
        {isConnected && (
          <div className="mt-3 w-full">
            <canvas
              ref={canvasRef}
              width={260}
              height={40}
              className="mx-auto block"
            />
          </div>
        )}
      </div>

      {/* ===================== Error Banner ===================== */}
      {error && (
        <div className="my-2.5 flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-[13px] text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="font-medium text-red-300">Connection error</p>
            <p className="text-[12px] text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {/* ===================== Live Transcript Accordion ===================== */}
      {isConnected && (
        <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
          <div className="mb-1 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/70 transition hover:text-white"
            >
              <span>Live Transcript</span>
              {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {messages.length > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-white/60">
                  {messages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowTextInput((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-white/55 transition hover:text-sunshine"
            >
              <MessageSquare className="h-3 w-3" />
              {showTextInput ? 'Hide text chat' : 'Type to agent'}
            </button>
          </div>

          {showTranscript && (
            <div className="scrollbar-thin min-h-[90px] max-h-[160px] flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/8 bg-black/20 p-3">
              {messages.length === 0 ? (
                <p className="py-4 text-center text-[12px] italic text-white/40">
                  Conversation transcript will appear here as you speak…
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-br-sm bg-emerald/30 text-white shadow-sm'
                          : 'rounded-bl-sm border border-white/10 bg-white/10 text-white/95'
                      }`}
                    >
                      <div className="mb-0.5 flex items-center justify-between gap-3 text-[10px] font-semibold">
                        <span className={m.role === 'user' ? 'text-emerald' : 'text-sunshine'}>
                          {m.role === 'user' ? 'You' : 'SunFlow AI'}
                        </span>
                        <span className="font-mono text-white/40">{m.time}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptBottomRef} />
            </div>
          )}

          {/* In-Call Text Input */}
          {showTextInput && (
            <form onSubmit={sendTyped} className="mt-2 flex items-center gap-1.5">
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Type a message or address…"
                className="h-9 flex-1 rounded-full border border-white/15 bg-white/10 px-3.5 text-[13px] text-white placeholder:text-white/40 focus:border-sunshine focus:outline-none"
              />
              <button
                type="submit"
                disabled={!typedMessage.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-sunshine text-forest transition disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Post-Call Transcript Review */}
      {isEnded && messages.length > 0 && (
        <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
          <p className="mb-1 text-[12px] font-medium text-white/70">
            Call Transcript ({messages.length} messages · {activeLang.label})
          </p>
          <div className="scrollbar-thin max-h-[150px] flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/8 bg-black/20 p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-emerald/30 text-white'
                      : 'rounded-bl-sm border border-white/10 bg-white/10 text-white/95'
                  }`}
                >
                  <p className={`mb-0.5 text-[10px] font-semibold ${m.role === 'user' ? 'text-emerald' : 'text-sunshine'}`}>
                    {m.role === 'user' ? 'You' : 'SunFlow AI'}
                  </p>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== Control Dock ===================== */}
      <div className="mt-auto pt-3">
        {isConnected ? (
          <div className="flex items-center justify-center gap-4 py-2">
            {/* Mic Mute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-13 w-13 items-center justify-center rounded-full transition-all active:scale-95 ${
                muted
                  ? 'bg-red-500/25 text-red-300 ring-2 ring-red-500/40'
                  : 'bg-white/12 text-white hover:bg-white/20'
              }`}
              title={muted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              className="flex h-15 w-15 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_6px_25px_rgb(220_38_38/0.5)] transition-all hover:bg-red-500 active:scale-90"
              title="End conversation"
              aria-label="End conversation"
            >
              <PhoneOff className="h-6 w-6" />
            </button>

            {/* Speaker Mute Toggle */}
            <button
              type="button"
              onClick={toggleSpeaker}
              className={`flex h-13 w-13 items-center justify-center rounded-full transition-all active:scale-95 ${
                speakerMuted
                  ? 'bg-amber/25 text-amber ring-2 ring-amber/40'
                  : 'bg-white/12 text-white hover:bg-white/20'
              }`}
              title={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
              aria-label={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
            >
              {speakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 py-1">
            <button
              type="button"
              onClick={startCall}
              disabled={isConnecting}
              className="group flex w-full max-w-sm items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald to-[#217A50] py-3.5 px-6 text-[15px] font-semibold text-white shadow-[0_12px_30px_-8px_rgb(56_184_120/0.7)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Connecting in {activeLang.label}…
                </>
              ) : isEnded ? (
                <>
                  <RotateCcw className="h-5 w-5" />
                  Call Again ({activeLang.native})
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  Start Call in {activeLang.native}
                </>
              )}
            </button>

            {isEnded && (
              <button
                type="button"
                onClick={() => {
                  setStatus('idle')
                  setMessages([])
                }}
                className="text-[12px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Reset session
              </button>
            )}
          </div>
        )}

        {/* Footer Security / Tech Note */}
        <div className="mt-2 text-center text-[10px] text-white/35">
          <span>Direct WebRTC audio link · Multi-language solar consultation</span>
        </div>
      </div>
    </div>
  )
}
