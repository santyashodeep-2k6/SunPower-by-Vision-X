/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the separately developed SunFlow 360 backend. Leave unset for demo mode. */
  readonly VITE_SUNFLOW_API_URL?: string
  /** ElevenLabs Conversational AI agent ID for the voice receptionist. */
  readonly VITE_ELEVENLABS_AGENT_ID?: string
  /** Google Gemini API key for conversational AI advisor. */
  readonly VITE_GEMINI_API_KEY?: string
}
