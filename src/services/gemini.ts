import type { ChatMessage } from "@/lib/types"
import { getDatabaseContextForGemini } from "./dbLookup"

const GEMINI_LOCAL_KEY = "sunflow_gemini_api_key"

export function getGeminiApiKey(): string | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(GEMINI_LOCAL_KEY)
    if (saved && saved.trim()) return saved.trim()
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && typeof envKey === "string" && envKey.trim()) {
    return envKey.trim()
  }
  return null
}

export function setGeminiApiKey(key: string) {
  if (typeof window !== "undefined") {
    if (!key.trim()) {
      localStorage.removeItem(GEMINI_LOCAL_KEY)
    } else {
      localStorage.setItem(GEMINI_LOCAL_KEY, key.trim())
    }
  }
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey())
}

const SYSTEM_INSTRUCTION = `You are the SunFlow 360 AI Solar Advisor, an expert rooftop solar energy consultant for residential, commercial, and industrial customers across India.

YOUR MISSION:
Help customers understand rooftop solar, calculate their savings, explain the PM Surya Ghar government subsidy, and guide them towards booking a free on-site survey.

CORE DOMAIN KNOWLEDGE:
1. PM Surya Ghar Muft Bijli Yojana (Central Govt DBT Subsidy for residential on-grid systems):
   - 1 kW: ₹30,000 direct bank subsidy
   - 2 kW: ₹60,000 direct bank subsidy
   - 3 kW to 10 kW: ₹78,000 flat maximum subsidy
   - Subsidies are credited directly into customer bank accounts via DBT within 30 days of net meter commissioning.
   - SunFlow 360 handles all portal paperwork and Discom net metering liaisoning.

2. Typical Turnkey Costs & Payback:
   - 1 kW On-Grid: ~₹65,000 gross | Net after subsidy: ~₹35,000
   - 2 kW On-Grid: ~₹1,25,000 gross | Net after subsidy: ~₹65,000
   - 3 kW On-Grid: ~₹1,80,000 gross | Net after subsidy: ~₹1,02,000
   - 5 kW On-Grid: ~₹2,80,000 gross | Net after subsidy: ~₹2,02,000
   - Payback period is around 2.8 to 3.5 years, providing free electricity for 22+ years thereafter.

3. Generation & Rooftop Feasibility:
   - 1 kW generates approx 120–130 units (kWh) per month (~4 units/day in sunny conditions).
   - Requires approx 90–100 sq. ft. of shadow-free rooftop space per kW.
   - 3 kW requires ~300 sq. ft. and produces ~360–400 units/month.
   - 5 kW requires ~500 sq. ft. and produces ~600–650 units/month.

4. Heavy Loads & Air Conditioners:
   - A 3 kW system easily powers one 1.5-ton inverter AC alongside regular household load (fridge, TV, lights, fans).
   - For 2 ACs or larger homes, a 5 kW system is recommended.

5. System Types:
   - On-Grid (Grid-tied with Net Meter): Best ROI, qualifies for ₹78,000 subsidy, zero battery cost.
   - Off-Grid (Battery backup): Ideal for frequent power cuts or remote farmhouses. Higher initial cost, no PM Surya Ghar subsidy.

6. Warranties:
   - 25-Year Performance Warranty on Mono PERC 540W solar panels.
   - 5 to 10-Year Inverter Warranty.
   - 5-Year Comprehensive SunFlow installation guarantee.

COMMUNICATION STYLE:
- Polite, encouraging, knowledgeable, and transparent.
- Use clean Markdown formatting with bold numbers and bullet points.
- Keep answers concise and actionable (under 180 words when possible) so they are easy to read in a chat bubble.
- If customer expresses interest in proceeding, invite them to share their name, phone, and city so an engineer can schedule a free site survey.
- Reply in the language requested by the customer (English, Hindi, Marathi, or Telugu).`

export async function callGeminiChat(
  messages: ChatMessage[],
  preferredLanguage: string = "English",
): Promise<string> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error("No Gemini API key configured.")
  }

  // Build Gemini contents payload from chat history
  const contents = messages
    .filter((m) => m.from === "customer" || m.from === "assistant")
    .slice(-8) // last 8 messages for context
    .map((m) => ({
      role: m.from === "customer" ? "user" : "model",
      parts: [{ text: m.text }],
    }))

  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: "Hello, tell me about rooftop solar." }],
    })
  }

  const lastCustomerText =
    messages.filter((m) => m.from === "customer").at(-1)?.text || ""
  const dbContext = getDatabaseContextForGemini(lastCustomerText)

  const langInstruction =
    preferredLanguage !== "English"
      ? `\nIMPORTANT: Please reply fluently in ${preferredLanguage}.`
      : ""

  const body = {
    contents,
    systemInstruction: {
      parts: [
        {
          text: `${SYSTEM_INSTRUCTION}\n\n${dbContext}\n${langInstruction}`,
        },
      ],
    },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 800,
    },
  }

  // Try gemini-2.0-flash, fallback to gemini-1.5-flash
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"]
  let lastError: any = null

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const msg = errorData?.error?.message || `HTTP ${res.status}`
        throw new Error(`Gemini API Error: ${msg}`)
      }

      const data = await res.json()
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (answer && typeof answer === "string") {
        return answer.trim()
      }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error("Failed to generate response from Gemini API.")
}

