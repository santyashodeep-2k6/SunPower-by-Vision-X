import type {
  AssistantFields,
  Conversation,
  PropertyType,
  SystemType,
} from "@/lib/types"
import { isValidIndianMobile, normalizePhone, uid } from "@/lib/format"
import { recommendCapacity } from "@/lib/catalog"
import { apiRequest, isDemoMode } from "./apiClient"

/*
  Assistant service interface. The demo implementation is a deterministic
  script — it is NOT an AI model. When the AI backend is available, set
  VITE_SUNFLOW_API_URL and `reply` is delegated to POST /assistant/reply.
*/

export type Slot = "language" | "name" | "phone" | "propertyType" | "city" | "monthlyBill" | "roofArea" | "capacity" | "systemType" | "confirm" | "done"

export interface AssistantTurn {
  text: string
  quickReplies: string[]
  collected: Partial<AssistantFields>
  nextSlot: Slot
}

export interface AssistantService {
  readonly engine: "scripted-demo" | "backend"
  greet(): AssistantTurn
  reply(
    conversation: Conversation,
    slot: Slot,
    text: string,
  ): Promise<AssistantTurn>
}

export const LANGUAGES = ["English", "हिन्दी", "मराठी", "తెలుగు"] as const
type Lang = "en" | "hi" | "mr" | "te"
const langKey = (l?: string): Lang =>
  l === "हिन्दी" || l === "Hindi"
    ? "hi"
    : l === "मराठी" || l === "Marathi"
      ? "mr"
      : l === "తెలుగు" || l === "Telugu"
        ? "te"
        : "en"
export const languageName = (l?: string) =>
  ({ en: "English", hi: "Hindi", mr: "Marathi", te: "Telugu" })[langKey(l)]

const T = {
  greet: {
    en: "Hello! I'm the SunFlow 360 solar assistant (demo). I'll collect a few details so our team can prepare the right system for you. Which language do you prefer?",
    hi: "नमस्ते! मैं SunFlow 360 सोलर असिस्टेंट (डेमो) हूँ। आपकी पसंदीदा भाषा कौन सी है?",
    mr: "नमस्कार! मी SunFlow 360 सोलर असिस्टंट (डेमो) आहे. आपली पसंतीची भाषा कोणती?",
    te: "నమస్కారం! నేను SunFlow 360 సోలార్ అసిస్టెంట్ (డెమో). మీ ప్రాధాన్యత భాష ఏది?",
  },
  name: {
    en: "Great. What is your full name?",
    hi: "बढ़िया। आपका पूरा नाम क्या है?",
    mr: "छान. आपले पूर्ण नाव काय आहे?",
    te: "చాలా బాగుంది. మీ పూర్తి పేరు ఏమిటి?",
  },
  phone: {
    en: "Thanks, {name}. Which mobile number can our team reach you on?",
    hi: "धन्यवाद {name}। हमारी टीम आपसे किस मोबाइल नंबर पर संपर्क करे?",
    mr: "धन्यवाद {name}. आमची टीम आपल्याशी कोणत्या मोबाइल नंबरवर संपर्क करू शकते?",
    te: "ధన్యవాదాలు {name}. మా బృందం మిమ్మల్ని ఏ మొబైల్ నంబర్‌లో సంప్రదించవచ్చు?",
  },
  phoneBad: {
    en: "That does not look like a valid Indian mobile number. Please enter 10 digits starting with 6–9.",
    hi: "यह मान्य मोबाइल नंबर नहीं लगता। कृपया 6–9 से शुरू होने वाले 10 अंक दर्ज करें।",
    mr: "हा वैध मोबाइल नंबर वाटत नाही. कृपया 6–9 ने सुरू होणारे 10 अंक लिहा.",
    te: "ఇది చెల్లుబాటు అయ్యే భారతీయ మొబైల్ నంబర్ కాదు. దయచేసి 6–9తో ప్రారంభమయ్యే 10 అంకెలను నమోదు చేయండి.",
  },
  propertyType: {
    en: "Is this for a residential, commercial or industrial property?",
    hi: "यह आवासीय, व्यावसायिक या औद्योगिक संपत्ति के लिए है?",
    mr: "हे निवासी, व्यावसायिक की औद्योगिक मालमत्तेसाठी आहे?",
    te: "ఇది నివాస, వాణిజ్య లేదా పారిశ్రామిక ప్రాపర్టీ కోసమా?",
  },
  city: {
    en: "Which city or town is the property in?",
    hi: "संपत्ति किस शहर में है?",
    mr: "मालमत्ता कोणत्या शहरात आहे?",
    te: "ప్రాపర్టీ ఏ నగరంలో లేదా పట్టణంలో ఉంది?",
  },
  monthlyBill: {
    en: "What is your average monthly electricity bill (₹)?",
    hi: "आपका औसत मासिक बिजली बिल कितना है (₹)?",
    mr: "आपले सरासरी मासिक वीज बिल किती आहे (₹)?",
    te: "మీ సగటు నెలవారీ విద్యుత్ బిల్లు ఎంత (₹)?",
  },
  billBad: {
    en: "Please share the bill amount as a number, e.g. 3200.",
    hi: "कृपया बिल राशि अंकों में बताएं, जैसे 3200।",
    mr: "कृपया बिलाची रक्कम अंकात सांगा, उदा. 3200.",
    te: "దయచేసి బిల్లు మొత్తాన్ని సంఖ్యగా తెలపండి, ఉదాహరణకు 3200.",
  },
  roofArea: {
    en: "Do you know the usable rooftop area in sq ft? You can skip this.",
    hi: "क्या आप उपयोग योग्य छत का क्षेत्रफल (sq ft) जानते हैं? आप इसे छोड़ सकते हैं।",
    mr: "वापरण्यायोग्य छताचे क्षेत्रफळ (sq ft) माहीत आहे का? आपण हे वगळू शकता.",
    te: "మీకు ఉపయోగించదగిన పైకప్పు వైశాల్యం (sq ft) తెలుసా? మీరు దీన్ని దాటవేయవచ్చు.",
  },
  capacity: {
    en: "Based on your bill, about {kw} kW should suit you. Do you have a preferred capacity?",
    hi: "आपके बिल के अनुसार लगभग {kw} kW उपयुक्त रहेगा। क्या आपकी कोई पसंदीदा क्षमता है?",
    mr: "आपल्या बिलानुसार सुमारे {kw} kW योग्य ठरेल. आपली पसंतीची क्षमता आहे का?",
    te: "మీ బిల్లు ఆధారంగా సుమారు {kw} kW మీకు సరిపోతుంది. మీకు నచ్చిన సామర్థ్యం ఏదైనా ఉందా?",
  },
  systemType: {
    en: "Would you prefer an On-Grid system (net metering) or Off-Grid with battery backup?",
    hi: "आप ऑन-ग्रिड (नेट मीटरिंग) या बैटरी बैकअप वाला ऑफ-ग्रिड सिस्टम पसंद करेंगे?",
    mr: "आपल्याला ऑन-ग्रिड (नेट मीटरिंग) की बॅटरी बॅकअपसह ऑफ-ग्रिड प्रणाली हवी?",
    te: "మీరు ఆన్-గ్రిడ్ (నెట్ మీటరింగ్) లేదా బ్యాటరీ బ్యాకప్‌తో కూడిన ఆఫ్-గ్రిడ్ వ్యవస్థను ఇష్టపడతారా?",
  },
  confirm: {
    en: "Here is what I have collected. Shall I submit your enquiry?",
    hi: "मैंने यह जानकारी एकत्र की है। क्या मैं आपकी पूछताछ सबमिट करूँ?",
    mr: "मी ही माहिती गोळा केली आहे. आपली चौकशी सबमिट करू का?",
    te: "నేను సేకరించిన వివరాలు ఇవి. మీ విచారణను సమర్పించమంటారా?",
  },
  edit: {
    en: "No problem — let us go through the details again.",
    hi: "कोई बात नहीं — चलिए फिर से विवरण लेते हैं।",
    mr: "हरकत नाही — पुन्हा तपशील घेऊया.",
    te: "సరే — వివరాలను మళ్లీ నమోదు చేద్దాం.",
  },
  done: {
    en: "Your enquiry has been submitted. A SunFlow 360 advisor will contact you shortly.",
    hi: "आपकी पूछताछ सबमिट हो गई है। हमारे सलाहकार जल्द संपर्क करेंगे।",
    mr: "आपली चौकशी सबमिट झाली आहे. आमचे सल्लागार लवकरच संपर्क करतील.",
    te: "మీ విచారణ సమర్పించబడింది. మా సలహాదారు త్వరలోనే మిమ్మల్ని సంప్రదిస్తారు.",
  },
} as const

const QR = {
  skip: { en: "Skip", hi: "छोड़ें", mr: "वगळा", te: "దాటవేయి" },
  notSure: { en: "Not sure", hi: "पता नहीं", mr: "माहीत नाही", te: "ఖచ్చితంగా తెలియదు" },
  yes: { en: "Yes, submit", hi: "हाँ, सबमिट करें", mr: "हो, सबमिट करा", te: "అవును, సమర్పించండి" },
  no: { en: "Edit details", hi: "बदलाव करें", mr: "बदल करा", te: "సవరించండి" },
}

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""))
const parseNumber = (s: string) => {
  const m = s.replace(/,/g, "").match(/\d+(\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

const scripted: AssistantService = {
  engine: "scripted-demo",
  greet: () => ({
    text: T.greet.en,
    quickReplies: [...LANGUAGES],
    collected: {},
    nextSlot: "language",
  }),
  async reply(conv, slot, raw) {
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 400))
    const text = raw.trim()
    const c: Partial<AssistantFields> = { ...conv.collected }
    let k = langKey(c.language)
    const turn = (
      next: Slot,
      msg: string,
      quickReplies: string[] = [],
    ): AssistantTurn => ({
      text: msg,
      quickReplies,
      collected: c,
      nextSlot: next,
    })
    switch (slot) {
      case "language":
        c.language = languageName(text)
        k = langKey(c.language)
        return turn("name", T.name[k])
      case "name":
        if (text.length < 2) return turn("name", T.name[k])
        c.name = text.replace(/\b\w/g, (m) => m.toUpperCase())
        return turn("phone", fill(T.phone[k], { name: c.name.split(" ")[0] }))
      case "phone":
        if (!isValidIndianMobile(text)) return turn("phone", T.phoneBad[k])
        c.phone = normalizePhone(text)
        return turn("propertyType", T.propertyType[k], [
          "Residential",
          "Commercial",
          "Industrial",
        ])
      case "propertyType": {
        const t = text.toLowerCase()
        c.propertyType = ((
          t.startsWith("c")
            ? "Commercial"
            : t.startsWith("i")
              ? "Industrial"
              : "Residential"
        ) as PropertyType)
        return turn("city", T.city[k], ["Pune", "Mumbai", "Nashik", "Nagpur"])
      }
      case "city":
        if (text.length < 2) return turn("city", T.city[k])
        c.city = text.replace(/\b\w/g, (m) => m.toUpperCase())
        return turn("monthlyBill", T.monthlyBill[k], [
          "₹1,500",
          "₹3,200",
          "₹5,000",
          "₹8,000",
        ])
      case "monthlyBill": {
        const n = parseNumber(text)
        if (!Number.isFinite(n) || n < 100)
          return turn("monthlyBill", T.billBad[k])
        c.monthlyBill = Math.round(n)
        return turn("roofArea", T.roofArea[k], [
          "350 sq ft",
          "500 sq ft",
          QR.skip[k],
        ])
      }
      case "roofArea": {
        const n = parseNumber(text)
        c.roofArea = Number.isFinite(n) && n > 20 ? Math.round(n) : null
        const kw = recommendCapacity(c.monthlyBill, c.roofArea)
        return turn("capacity", fill(T.capacity[k], { kw }), [
          `${kw} kW`,
          "1 kW",
          "5 kW",
          QR.notSure[k],
        ])
      }
      case "capacity": {
        const n = parseNumber(text)
        c.capacity =
          Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : null
        return turn("systemType", T.systemType[k], ["On-Grid", "Off-Grid"])
      }
      case "systemType":
        c.systemType = ((
          /off/i.test(text) || /ऑफ/.test(text) ? "Off-Grid" : "On-Grid"
        ) as SystemType)
        return turn("confirm", T.confirm[k], [QR.yes[k], QR.no[k]])
      case "confirm":
        if (/^(yes|y\b)/i.test(text) || text === QR.yes[k])
          return turn("done", T.done[k])
        return turn("name", `${T.edit[k]} ${T.name[k]}`)
      default:
        return turn("done", T.done[k])
    }
  },
}

const backend: AssistantService = {
  engine: "backend",
  greet: scripted.greet,
  reply: (conversation, slot, text) =>
    apiRequest<AssistantTurn>("POST", "/assistant/reply", {
      conversationId: conversation.id,
      slot,
      text,
    }),
}

export const assistantService: AssistantService = isDemoMode
  ? scripted
  : backend
export const SLOT_ORDER: Slot[] = [
  "language",
  "name",
  "phone",
  "propertyType",
  "city",
  "monthlyBill",
  "roofArea",
  "capacity",
  "systemType",
]
export const newMessage = (from: "customer" | "assistant", text: string) => ({
  id: uid(),
  from,
  text,
  at: new Date().toISOString(),
})
