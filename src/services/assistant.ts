import type {
  AssistantFields,
  Conversation,
  PropertyType,
  SolarEstimate,
  SystemType,
} from "@/lib/types"

import { inr, isValidIndianMobile, normalizePhone, uid } from "@/lib/format"

import { recommendCapacity } from "@/lib/catalog"

import { getDb } from "@/data/store"

import { apiRequest, isDemoMode } from "./apiClient"

import { callGeminiChat, hasGeminiApiKey } from "./gemini"

import { queryDatabase } from "./dbLookup"

export type Slot = "language" | "name" | "phone" | "propertyType" | "city" | "monthlyBill" | "roofArea" | "capacity" | "systemType" | "confirm" | "done" | "chat"

export interface AssistantTurn {
  text: string

  quickReplies: string[]

  collected: Partial<AssistantFields>

  nextSlot: Slot

  estimate?: SolarEstimate
}

export interface AssistantService {
  readonly engine: "smart-ai" | "backend"

  greet(): AssistantTurn

  reply(
    conversation: Conversation,

    slot: Slot,

    text: string,
  ): Promise<AssistantTurn>
}

export const LANGUAGES = ["English", "हिन्दी", "मराठी", "తెలుగు"] as const

export type Lang = "en" | "hi" | "mr" | "te"

export const langKey = (l?: string): Lang =>
  l === "हिन्दी" || l === "Hindi" || l === "hi"
    ? "hi"
    : l === "मराठी" || l === "Marathi" || l === "mr"
      ? "mr"
      : l === "తెలుగు" || l === "Telugu" || l === "te"
        ? "te"
        : "en"

export const languageName = (l?: string) =>
  ({ en: "English", hi: "Hindi", mr: "Marathi", te: "Telugu" })[langKey(l)]

export const SLOT_ORDER: keyof AssistantFields[] = [
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

export const newMessage = (
  from: "customer" | "assistant" | "agent",

  text: string,

  estimate?: SolarEstimate,
) => ({
  id: uid(),

  from,

  text,

  at: new Date().toISOString(),

  estimate,
})

/* =========================================================================
   SOLAR ESTIMATION CALCULATOR
   ========================================================================= */

export function calculateSolarEstimate(params: {
  monthlyBill?: number

  roofArea?: number | null

  preferredCapacity?: number | null

  systemType?: SystemType
}): SolarEstimate {
  const kw =
    params.preferredCapacity ||
    recommendCapacity(params.monthlyBill, params.roofArea) ||
    3

  const systemType = params.systemType || "On-Grid"

  const roofAreaSqFt = params.roofArea || kw * 95

  const monthlyUnits = kw * 125 // avg 4.1 units/day per kW in Maharashtra & India

  const annualUnits = monthlyUnits * 12

  // Gross turnkey equipment + installation pricing

  let grossCost = 0

  if (systemType === "On-Grid") {
    if (kw === 1) grossCost = 65000
    else if (kw === 2) grossCost = 125000
    else if (kw === 3) grossCost = 180000
    else if (kw === 4) grossCost = 230000
    else if (kw === 5) grossCost = 280000
    else grossCost = kw * 55000
  } else {
    // Off-grid with tubular battery storage

    if (kw === 1) grossCost = 95000
    else if (kw === 2) grossCost = 175000
    else if (kw === 3) grossCost = 245000
    else if (kw === 4) grossCost = 310000
    else if (kw === 5) grossCost = 380000
    else grossCost = kw * 75000
  }

  // PM Surya Ghar Muft Bijli Yojana Central Government DBT Subsidy

  let subsidy = 0

  if (systemType === "On-Grid") {
    if (kw === 1) subsidy = 30000
    else if (kw === 2) subsidy = 60000
    else subsidy = 78000 // 3kW and above gets flat ₹78,000 for residential
  }

  const netCost = Math.max(0, grossCost - subsidy)

  const monthlySavings = params.monthlyBill
    ? Math.min(params.monthlyBill, Math.round(monthlyUnits * 7.5))
    : Math.round(monthlyUnits * 7.5)

  const annualSavings = monthlySavings * 12

  const paybackYears = Number((netCost / Math.max(annualSavings, 1)).toFixed(1))

  const lifetimeSavings25Y = Math.round(annualSavings * 25 - netCost)

  return {
    capacityKw: kw,

    roofAreaSqFt,

    monthlyUnits,

    annualUnits,

    grossCost,

    subsidy,

    netCost,

    monthlySavings,

    annualSavings,

    paybackYears,

    lifetimeSavings25Y,

    systemType,
  }
}

/* =========================================================================
   INTENT & ENTITY EXTRACTION
   ========================================================================= */

function extractEntities(text: string, current: Partial<AssistantFields>) {
  const c: Partial<AssistantFields> = { ...current }

  // 1. Language detection

  if (/hindi|हिन्दी/i.test(text)) c.language = "Hindi"
  else if (/marathi|मराठी/i.test(text)) c.language = "Marathi"
  else if (/telugu|తెలుగు/i.test(text)) c.language = "Telugu"
  else if (/english/i.test(text)) c.language = "English"

  // 2. Phone detection (10 digits starting with 6-9)

  const phoneMatch = text.replace(/[\s-+]/g, "").match(/[6-9]\d{9}/)

  if (phoneMatch) {
    c.phone = normalizePhone(phoneMatch[0])
  }

  // 3. Monthly electricity bill detection

  const billMatch =
    text.match(/(?:bill|₹|rs\.?|inr)\s*[:=]?\s*(\d[\d,]*)/i) ||
    text.match(/(\d[\d,]*)\s*(?:rs|rupees|₹|per\s*month|\/mo)/i)

  if (billMatch) {
    const amt = Number(billMatch[1].replace(/,/g, ""))

    if (amt >= 200 && amt <= 200000) c.monthlyBill = amt
  }

  // 4. Rooftop area detection

  const roofMatch = text.match(
    /(\d[\d,]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet|sq\s*feet)/i,
  )

  if (roofMatch) {
    const area = Number(roofMatch[1].replace(/,/g, ""))

    if (area >= 50 && area <= 50000) c.roofArea = area
  }

  // 5. System capacity detection (e.g. 3kW, 5 kW, 2 kilowatt)

  const kwMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kw|kilo\s*watt|kilowatt)/i)

  if (kwMatch) {
    const kw = Math.round(Number(kwMatch[1]))

    if (kw >= 1 && kw <= 20) c.capacity = kw
  }

  // 6. System type

  if (/off[- ]?grid|battery\s*backup/i.test(text)) c.systemType = "Off-Grid"
  else if (/on[- ]?grid|grid[- ]?tie|net\s*meter/i.test(text))
    c.systemType = "On-Grid"

  // 7. Property type

  if (/commercial|office|shop|hotel|restaurant|hospital/i.test(text))
    c.propertyType = "Commercial"
  else if (/industrial|factory|warehouse|plant/i.test(text))
    c.propertyType = "Industrial"
  else if (/residential|home|house|villa|flat|bungalow|society/i.test(text))
    c.propertyType = "Residential"

  // 8. City detection

  const cities = [
    "Pune",

    "Mumbai",

    "Nashik",

    "Nagpur",

    "Thane",

    "Chakan",

    "Kolhapur",

    "Aurangabad",

    "Solapur",

    "Bangalore",

    "Bengaluru",

    "Hyderabad",

    "Delhi",

    "Noida",

    "Gurgaon",

    "Ahmedabad",

    "Surat",

    "Chennai",

    "Jaipur",
  ]

  for (const city of cities) {
    const regex = new RegExp(`\\b${city}\\b`, "i")

    if (regex.test(text)) {
      c.city = city

      break
    }
  }

  // 9. Name detection (e.g., "My name is Amit", "I am Rahul Sharma", "Rahul from Pune")

  const nameIntroMatch =
    text.match(/(?:my name is|i am|this is|call me)\s+([A-Za-z\s]{2,25})/i) ||
    text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/)

  if (nameIntroMatch && !c.name) {
    const rawName = nameIntroMatch[1].trim()

    // ensure it's not a common solar word

    if (
      !/solar|sunflow|panel|inverter|subsidy|price|quote|estimate|hello|hi/i.test(
        rawName,
      )
    ) {
      c.name = rawName.replace(/\b\w/g, (m) => m.toUpperCase())
    }
  }

  return c
}

/* =========================================================================
   COMPREHENSIVE MULTILINGUAL SOLAR KNOWLEDGE BASE
   ========================================================================= */

interface QAItem {
  matcher: (t: string) => boolean

  response: Record<Lang, string>

  quickReplies: Record<Lang, string[]>

  triggerEstimate?: boolean
}

const KNOWLEDGE_BASE: QAItem[] = [
  // 1. PM Surya Ghar Subsidy

  {
    matcher: (t) =>
      /subsidy|surya\s*ghar|muft\s*bijli|government\s*scheme|subsidy\s*amount|dbt|सब्सिडी|सबसिडी|సబ్సిడీ/i.test(
        t,
      ),

    response: {
      en: `Under the central government's **PM Surya Ghar: Muft Bijli Yojana**, residential rooftop solar qualifies for direct DBT cash subsidies:

- **1 kW System**: **₹30,000** direct subsidy
- **2 kW System**: **₹60,000** direct subsidy
- **3 kW to 10 kW Systems**: **₹78,000** (flat maximum subsidy)

**Key Highlights:**
- Subsidy is credited directly into your bank account within **30 days** of net meter installation.
- Commercial & industrial properties receive **40% accelerated depreciation (tax benefit)** instead.
- SunFlow 360 manages all Discom liaisoning and portal documentation on your behalf!

Would you like to calculate your net cost after subsidy?`,

      hi: `केंद्र सरकार की **पीएम सूर्य घर: मुफ़्त बिजली योजना** के तहत आवासीय रूफटॉप सोलर पर डायरेक्ट डीबीटी सब्सिडी मिलती है:

- **1 kW सिस्टम**: **₹30,000** सब्सिडी
- **2 kW सिस्टम**: **₹60,000** सब्सिडी
- **3 kW और अधिक**: **₹78,000** (अधिकतम फ्लैट सब्सिडी)

**मुख्य बातें:**
- नेट मीटर चालू होने के 30 दिनों के भीतर सब्सिडी सीधे आपके बैंक खाते में आती है।
- SunFlow 360 कागजी कार्रवाई और डिस्कॉम अनुमति की पूरी प्रक्रिया संभालता है।

क्या आप अपने मासिक बिल के अनुसार सब्सिडी और बचत देखना चाहेंगे?`,

      mr: `केंद्र सरकारच्या **पीएम सूर्य घर: मोफत वीज योजने**अंतर्गत घरगुती सोलरसाठी थेट बँक खात्यात सबसिडी मिळते:

- **1 kW प्रणाली**: **₹30,000** सबसिडी
- **2 kW प्रणाली**: **₹60,000** सबसिडी
- **3 kW व अधिक**: **₹78,000** (कमाल फ्लॅट सबसिडी)

**महत्त्वाचे मुद्दे:**
- नेट मीटर बसवल्यानंतर 30 दिवसांत रक्कम थेट बँक खात्यात जमा होते.
- डिस्कॉम मंजुरी आणि पोर्टल अर्ज SunFlow 360 ची टीम पूर्ण करते.

आपल्या वीज बिलानुसार सबसिडी व निव्वळ खर्च जाणून घ्यायचा आहे का?`,

      te: `కేంద్ర ప్రభుత్వ **పీఎం సూర్య ఘర్: ముఫ్త్ బిజ్లీ యోజన** కింద నివాస గృహాల సోలార్ సిస్టమ్‌లకు డైరెక్ట్ డిబిటి సబ్సిడీ లభిస్తుంది:

- **1 kW సిస్టమ్**: **₹30,000** సబ్సిడీ
- **2 kW సిస్టమ్**: **₹60,000** సబ్సిడీ
- **3 kW మరియు అంతకంటే ఎక్కువ**: **₹78,000** గరిష్ట సబ్సిడీ

నెట్ మీటరింగ్ పూర్తయిన 30 రోజుల్లో సబ్సిడీ నేరుగా మీ బ్యాంక్ ఖాతాలో జమ అవుతుంది.`,
    },

    quickReplies: {
      en: [
        "Calculate my subsidy",

        "Cost of 3kW system",

        "Book Free Site Survey",
      ],

      hi: ["सब्सिडी कैलकुलेट करें", "3kW का खर्च", "फ्री साइट सर्वे बुक करें"],

      mr: ["माझी सबसिडी मोजा", "3kW चा खर्च", "विनामूल्य साइट सर्व्हे बुक करा"],

      te: ["నా సబ్సిడీని లెక్కించండి", "3kW ఖర్చు", "ఉచిత సైట్ సర్వే"],
    },
  },

  // 2. Pricing & Cost

  {
    matcher: (t) =>
      /cost|price|rate|quotation|how much|charges|expensive|खर्च|किंमत|ధర|ఖర్చు/i.test(
        t,
      ),

    response: {
      en: `Here is our turnkey pricing for **Mono PERC On-Grid Systems** including panels, inverter, GI structure, wiring, and Discom net-metering:

- **1 kW System**: ~₹65,000 | **Net after subsidy: ₹35,000**
- **2 kW System**: ~₹1,25,000 | **Net after subsidy: ₹65,000**
- **3 kW System**: ~₹1,80,000 | **Net after subsidy: ₹1,02,000**
- **5 kW System**: ~₹2,80,000 | **Net after subsidy: ₹2,02,000**

*Payback period is just **2.8 to 3.5 years**, providing free electricity for the remaining 22+ years!*

Tell me your average monthly electricity bill, and I will generate an exact estimate for your home!`,

      hi: `SunFlow 360 का टर्नकी सोलर मूल्य (पैनल, इन्वर्टर, स्ट्रक्चर, वायरिंग और नेट मीटरिंग सहित):

- **1 kW**: ~₹65,000 | **सब्सिडी बाद: ₹35,000**
- **2 kW**: ~₹1,25,000 | **सब्सिडी बाद: ₹65,000**
- **3 kW**: ~₹1,80,000 | **सब्सिडी बाद: ₹1,02,000**
- **5 kW**: ~₹2,80,000 | **सब्सिडी बाद: ₹2,02,000**

पेबैक अवधि केवल **3 वर्ष** है, जिसके बाद 22+ वर्षों तक बिजली बिल्कुल मुफ़्त मिलती है! अपना मासिक बिल बताएं, मैं तुरंत एस्टीमेट देता हूँ।`,

      mr: `टर्नकी ऑन-ग्रिड सोलरचे अंदाजे दर (पॅनेल, इन्व्हर्टर, स्ट्रक्चर आणि नेट मीटरिंगसह):

- **1 kW**: ~₹65,000 | **सबसिडीनंतर निव्वळ: ₹35,000**
- **2 kW**: ~₹1,25,000 | **सबसिडीनंतर निव्वळ: ₹65,000**
- **3 kW**: ~₹1,80,000 | **सबसिडीनंतर निव्वळ: ₹1,02,000**
- **5 kW**: ~₹2,80,000 | **सबसिडीनंतर निव्वळ: ₹2,02,000**

केवळ **3 वर्षांत संपूर्ण खर्च वसूल** होतो! आपले मासिक वीज बिल किती आहे?`,

      te: `టర్న్‌కీ ఆన్-గ్రిడ్ సోలార్ ధరల వివరాలు:
- **1 kW**: ~₹65,000 | **సబ్సిడీ తర్వాత: ₹35,000**
- **2 kW**: ~₹1,25,000 | **సబ్సిడీ తర్వాత: ₹65,000**
- **3 kW**: ~₹1,80,000 | **సబ్సిడీ తర్వాత: ₹1,02,000**
- **5 kW**: ~₹2,80,000 | **సబ్సిడీ తర్వాత: ₹2,02,000**

కేవలం 3 సంవత్సరాలలో పెట్టుబడి రికవరీ అవుతుంది! మీ నెలవారీ బిల్లును తెలపండి.`,
    },

    quickReplies: {
      en: [
        "Bill is ₹3,000/mo",

        "Bill is ₹5,000/mo",

        "On-Grid vs Off-Grid",

        "Book Free Site Survey",
      ],

      hi: [
        "बिल ₹3,000/माह",

        "बिल ₹5,000/माह",

        "ऑन-ग्रिड बनाम ऑफ-ग्रिड",

        "फ्री साइट सर्वे",
      ],

      mr: ["बिल ₹3,000/महिना", "बिल ₹5,000/महिना", "ऑन-ग्रिड की ऑफ-ग्रिड"],

      te: ["బిల్లు ₹3,000", "బిల్లు ₹5,000", "ఆన్-గ్రిడ్ వర్సెస్ ఆఫ్-గ్రిడ్"],
    },
  },

  // 3. On-Grid vs Off-Grid vs Hybrid

  {
    matcher: (t) =>
      /on[- ]?grid|off[- ]?grid|hybrid|battery|backup|net\s*metering|ग्रिड|बैटरी|बॅटरी/i.test(
        t,
      ),

    response: {
      en: `Here is the difference between solar system types:

1. **On-Grid System (Most Popular for Homes & Offices):**
   - Connects directly to the grid with a bi-directional **Net Meter**.
   - Daytime surplus units spin your meter backwards; you draw power from grid at night.
   - Lowest cost, **qualifies for ₹78,000 government subsidy**, zero battery replacement costs.
   - *Requires grid power to operate for safety.*

2. **Off-Grid System:**
   - Includes battery banks (Tubular or Li-ion) to store power.
   - Ideal for areas with frequent power outages (4+ hours daily) or farmhouses.
   - Higher cost, no PM Surya Ghar subsidy.

3. **Hybrid System:**
   - Both net metering export AND battery backup during power cuts.

For urban and suburban homes with reliable power, **On-Grid is 100% the best choice for maximum ROI!**`,

      hi: `सोलर सिस्टम के प्रकारों में मुख्य अंतर:

1. **ऑन-ग्रिड (On-Grid) - सबसे लोकप्रिय:**
   - नेट मीटर के माध्यम से ग्रिड से जुड़ा होता है। अतिरिक्त बिजली ग्रिड को बेची जाती है।
   - सबसे कम लागत, **₹78,000 तक सरकारी सब्सिडी मिलती है**, कोई बैटरी मेंटेनेंस नहीं।

2. **ऑफ-ग्रिड (Off-Grid):**
   - बैटरी बैकअप के साथ आता है। बार-बार बिजली जाने वाले क्षेत्रों या फार्महाउस के लिए उपयुक्त।

यदि आपके इलाके में बिजली कटौती कम है, तो **ऑन-ग्रिड सबसे अधिक बचत देता है!**`,

      mr: `सोलर सिस्टीममधील मुख्य फरक:

1. **ऑन-ग्रिड (सर्वात लोकप्रिय):**
   - नेट मीटरद्वारे महावितरण ग्रिडशी जोडलेले असते.
   - **₹78,000 पर्यंत सरकारी सबसिडी**, बॅटरीचा खर्च नाही, सर्वाधिक आर्थिक परतावा.

2. **ऑफ-ग्रिड:**
   - बॅटरी बॅकअपसह येते. वारंवार वीज जाणाऱ्या भागांसाठी उत्तम.

शहरी व उपनगरांसाठी **ऑन-ग्रिड प्रणाली सर्वोत्तम आहे!**`,

      te: `సోలార్ సిస్టమ్స్ రకాలు:
1. **ఆన్-గ్రిడ్ (నెట్ మీటరింగ్)**: గ్రిడ్‌తో అనుసంధానించబడి ఉంటుంది. గరిష్ట పొదుపు, ₹78,000 సబ్సిడీ లభిస్తుంది.
2. **ఆఫ్-గ్రిడ్**: బ్యాటరీ బ్యాకప్‌తో కూడినది. విద్యుత్ కోతలు ఎక్కువగా ఉండే ప్రాంతాలకు అనువైనది.`,
    },

    quickReplies: {
      en: [
        "Go with On-Grid",

        "Estimate My Savings",

        "Book Free Site Survey",
      ],

      hi: ["ऑन-ग्रिड चाहिए", "बचत का अनुमान लगाएं", "फ्री साइट सर्वे"],

      mr: ["ऑन-ग्रिड सिस्टीम हवी", "बचत तपासा", "विनामूल्य साइट सर्व्हे"],

      te: ["ఆన్-గ్రిడ్ కావాలి", "పొదుపు లెక్కించండి"],
    },
  },

  // 4. Air Conditioning (AC) & Heavy Appliances

  {
    matcher: (t) =>
      /ac\b|air\s*condition|refrigerator|fridge|washing\s*machine|motor|heavy\s*load|गीजर|पंखा/i.test(
        t,
      ),

    response: {
      en: `**Yes, absolutely!** You can easily run ACs and all heavy household appliances on solar:

- **1.5 Ton Inverter AC**: Consumes ~1.2 to 1.5 kW when active. A **3 kW Solar System** produces ~12 to 14 units per day, easily powering one 1.5-ton AC for 6–8 hours alongside your fridge, TV, fans, and lights!
- **2 Air Conditioners**: We recommend a **5 kW System** (produces ~20 to 22 units/day).
- **Water Pump / Motor (1-2 HP)**: Runs seamlessly during daytime peak solar hours.

With On-Grid Net Metering, solar powers the load directly during sunny hours, and any shortfall is seamlessly balanced by the grid without voltage drops or interruptions!`,

      hi: `**हाँ, बिल्कुल!** आप सोलर पर AC, फ्रिज, वॉशिंग मशीन और मोटर आसानी से चला सकते हैं:

- **1.5 टन इन्वर्टर AC**: लगभग 1.2 kW खपत करता है। एक **3 kW सोलर सिस्टम** रोज़ाना 12–14 यूनिट बनाता है, जो 1 AC और पूरे घर का लोड आराम से चला सकता है!
- **2 AC के लिए**: **5 kW सिस्टम** की सिफ़ारिश की जाती है।

ऑन-ग्रिड सिस्टम में बिजली का कोई उतार-चढ़ाव नहीं होता।`,

      mr: `**होय, नक्कीच!** आपण सोलरवर AC, फ्रिज, वॉटर पंप सर्व उपकरणे चालवू शकता:

- **1.5 टन इन्व्हर्टर AC**: **3 kW सोलर सिस्टीम** दररोज 12–14 युनिट्स तयार करते, ज्यामुळे एक 1.5 टन AC आणि घरातील इतर सर्व लोड सहज चालतो.
- **2 AC असल्यास**: **5 kW सिस्टीम** निवडावी.`,

      te: `**ఖచ్చితంగా!** మీరు సోలార్ ద్వారా 1.5 టన్ AC మరియు అన్ని గృహోపకరణాలను సులభంగా నడపవచ్చు. 1 AC కోసం 3 kW మరియు 2 ACల కోసం 5 kW సిస్టమ్ సిఫార్సు చేయబడింది.`,
    },

    quickReplies: {
      en: [
        "Need 3 kW for 1 AC",

        "Need 5 kW for 2 ACs",

        "Book Free Site Survey",
      ],

      hi: ["1 AC के लिए 3 kW", "2 AC के लिए 5 kW", "फ्री साइट सर्वे"],

      mr: ["1 AC साठी 3 kW", "2 AC साठी 5 kW", "साइट सर्व्हे बुक करा"],

      te: ["3 kW సిస్టమ్ కావాలి", "5 kW సిస్టమ్ కావాలి"],
    },
  },

  // 5. Rooftop Area & Requirements

  {
    matcher: (t) =>
      /roof|space|area|shadow|sq\s*ft|square\s*feet|छत|जागा|స్థలం/i.test(t),

    response: {
      en: `Here are the rooftop area requirements:

- **Standard Rule**: You need approximately **90 to 100 sq. ft. of shadow-free rooftop area per 1 kW** of solar panels.
  - **1 kW System**: ~100 sq ft (2 panels of 540W)
  - **3 kW System**: ~280–300 sq ft (6 panels)
  - **5 kW System**: ~480–500 sq ft (10 panels)
  - **10 kW System**: ~950–1,000 sq ft (20 panels)

- **Suitable Roof Types**: RCC flat roofs, industrial tin/metal sheets, or tiled roofs.
- **Structures**: We use heavy-duty hot-dip galvanized iron (GI) structures engineered to withstand **150 km/h wind speeds** without puncturing your roof waterproofing!

How many square feet of rooftop area do you have?`,

      hi: `रूफटॉप स्पेस की आवश्यकता:

- **सामान्य नियम**: प्रति 1 kW सोलर के लिए लगभग **90 से 100 वर्ग फुट (sq ft)** छाया-रहित छत की आवश्यकता होती है।
  - **3 kW**: ~300 sq ft (6 पैनल)
  - **5 kW**: ~500 sq ft (10 पैनल)

RCC छत, टिन शेड और टाइल वाली छत सभी पर मजबूत हॉट-डिप गैल्वनाइज्ड स्ट्रक्चर लगाया जाता है। आपकी छत का क्षेत्रफल कितना है?`,

      mr: `छताच्या जागेची आवश्यकता:

- **नियम**: प्रति 1 kW साठी सुमारे **90 ते 100 चौरस फूट (sq ft)** सावली नसलेली जागा लागते.
  - **3 kW**: सुमारे 300 चौरस फूट
  - **5 kW**: सुमारे 500 चौरस फूट

आपल्या छताचे अंदाजे क्षेत्रफळ किती आहे?`,

      te: `ప్రతి 1 kW సోలార్‌కు సుమారు **90 నుండి 100 చదరపు అడుగుల (sq ft)** నీడ లేని పైకప్పు స్థలం అవసరం. మీ పైకప్పు వైశాల్యం ఎంత?`,
    },

    quickReplies: {
      en: [
        "Around 300 sq ft",

        "Around 500 sq ft",

        "1000+ sq ft",

        "Book Free Site Survey",
      ],

      hi: ["लगभग 300 sq ft", "लगभग 500 sq ft", "1000+ sq ft"],

      mr: ["सुमारे 300 sq ft", "सुमारे 500 sq ft", "1000+ sq ft"],

      te: ["300 sq ft", "500 sq ft", "1000+ sq ft"],
    },
  },

  // 6. Warranties & Life Span

  {
    matcher: (t) =>
      /warranty|guarantee|lifespan|life|maintenance|cleaning|damage|वारंटी|वॉरंटी/i.test(
        t,
      ),

    response: {
      en: `SunFlow 360 installs Tier-1 premium solar equipment with industry-leading warranties:

- **Solar Panels**: **25-Year Linear Performance Warranty** (guarantees at least 80% output at year 25) + 12-Year Product Warranty.
- **Solar Inverter**: **5 to 10-Year Manufacturer Replacement Warranty**.
- **Mounting Structures**: **10-Year Structural Anti-Rust Warranty** (Hot-Dip Galvanized Iron).
- **SunFlow Workmanship**: **5-Year Comprehensive Installation & Service Guarantee**.

**Maintenance**:
Solar panels have no moving parts. Simply washing the panels with plain tap water once every 10–15 days keeps energy generation at 100%!`,

      hi: `SunFlow 360 द्वारा प्रदान की जाने वाली वारंटी:

- **सोलर पैनल**: **25 वर्ष की परफॉर्मेंस वारंटी** + 12 वर्ष प्रोडक्ट वारंटी।
- **इन्वर्टर**: **5 से 10 वर्ष** की रिप्लेसमेंट वारंटी।
- **स्ट्रक्चर**: **10 वर्ष** की एंटी-रस्ट वारंटी।
- **सर्विस सपोर्ट**: 5 वर्ष का कॉम्प्रिहेंसिव मेंटेनेंस सपोर्ट।

मेंटेनेंस बहुत आसान है — हर 10–15 दिन में पानी से पैनल धोना पर्याप्त है!`,

      mr: `SunFlow 360 कडून मिळणारी वॉरंटी:

- **सोलर पॅनेल्स**: **25 वर्षांची परफॉरमन्स वॉरंटी** + 12 वर्षे उत्पादन वॉरंटी.
- **इन्व्हर्टर**: **5 ते 10 वर्षे** वॉरंटी.
- **स्ट्रक्चर**: 10 वर्षे अँटी-रस्ट गॅरंटी.
- **मेंटेनन्स**: दर 10-15 दिवसांनी साध्या पाण्याने पॅनेल स्वच्छ करणे पुरेसे आहे!`,

      te: `సోలార్ ప్యానెల్స్‌కు **25 సంవత్సరాల వారంటీ** మరియు ఇన్వర్టర్‌కు **5-10 సంవత్సరాల వారంటీ** లభిస్తుంది. నిర్వహణ చాలా సులభం.`,
    },

    quickReplies: {
      en: [
        "Cost of 3kW system",

        "Book Free Site Survey",

        "Talk to an Advisor",
      ],

      hi: ["3kW सिस्टम का खर्च", "फ्री साइट सर्वे बुक करें", "सलाहकार से बात करें"],

      mr: ["3kW चा खर्च", "विनामूल्य साइट सर्व्हे", "सल्लागाराशी बोला"],

      te: ["3kW ఖర్చు", "ఉచిత సైట్ సర్వే"],
    },
  },

  // 7. Installation Process & Timeline

  {
    matcher: (t) =>
      /timeline|how long|process|installation\s*time|steps|duration|कितना समय|वेळ/i.test(
        t,
      ),

    response: {
      en: `From initial booking to turning on your solar switch takes **2 to 3 weeks**:

1. **Day 1–2**: Free on-site survey, shadow mapping, and customized 3D design.
2. **Day 3–5**: Discom net metering application and portal approvals.
3. **Day 7–10**: Fast **1-Day Rooftop Installation** of panels, inverter, and earthing pits by certified engineers.
4. **Day 14–20**: Discom inspection, bi-directional net meter installation, and commissioning.
5. **Post Commissioning**: PM Surya Ghar subsidy deposited directly into your bank account!

Would you like to book a zero-cost site survey to get started?`,

      hi: `बुकिंग से लेकर सोलर चालू होने में **2 से 3 सप्ताह** का समय लगता है:

1. **दिन 1–2**: मुफ़्त साइट सर्वे और 3D शैडो एनालिसिस।
2. **दिन 3–5**: डिस्कॉम नेट मीटरिंग आवेदन और अप्रूवल।
3. **दिन 7–10**: केवल 1 दिन में छत पर इंस्टॉलेशन पूर्ण।
4. **दिन 14–20**: डिस्कॉम द्वारा नेट मीटर लगाना व टेस्टिंग।
5. इसके बाद सब्सिडी सीधे आपके खाते में क्रेडिट हो जाती है!`,

      mr: `सोलर बसवण्याची प्रक्रिया साधारणतः **2 ते 3 आठवड्यांत** पूर्ण होते:
1. मोफत साइट सर्व्हे व डिझाइन
2. महावितरण नेट मीटरिंग अर्ज
3. 1 दिवसात छतावर प्रत्यक्ष इन्स्टॉलेशन
4. नेट मीटर तपासणी व कमिशनिंग!`,

      te: `మొత్తం ప్రక్రియ **2 నుండి 3 వారాలు** పడుతుంది: ఉచిత సైట్ సర్వే, నెట్ మీటరింగ్ దరఖాస్తు, 1 రోజులో ఇన్‌స్టాలేషన్ మరియు మీటర్ అమరిక.`,
    },

    quickReplies: {
      en: [
        "Book Free Site Survey",

        "Estimate My Savings",

        "Talk to an Advisor",
      ],

      hi: ["फ्री साइट सर्वे बुक करें", "बचत का अनुमान लगाएं"],

      mr: ["विनामूल्य साइट सर्व्हे बुक करा", "बचत तपासा"],

      te: ["ఉచిత సైట్ సర్వే బుక్ చేయండి"],
    },
  },

  // 8. Cities & Service Locations

  {
    matcher: (t) =>
      /location|pune|mumbai|nashik|nagpur|service|city|bangalore|hyderabad|शहर|कुठे|ఎక్కడ/i.test(
        t,
      ),

    response: {
      en: `**SunFlow 360 operates across all major cities and districts**, with active local engineering teams in:

- **Maharashtra**: Pune, Mumbai, Navi Mumbai, Thane, Nashik, Nagpur, Chakan, Kolhapur, Aurangabad (Chhatrapati Sambhajinagar), Solapur, Satara.
- **Karnataka**: Bangalore / Bengaluru, Mysore.
- **Telangana & AP**: Hyderabad, Secunderabad, Vijayawada.
- **Gujarat & NCR**: Ahmedabad, Surat, Delhi NCR.

We provide full doorstep site inspection, installation, and Discom liaisoning across these regions! Which city is your property in?`,

      hi: `SunFlow 360 की सेवाएँ पूरे महाराष्ट्र (पुणे, मुंबई, नासिक, नागपुर, ठाणे, कोल्हापुर, औरंगाबाद), बेंगलुरु, हैदराबाद और एनसीआर में उपलब्ध हैं।

आपकी संपत्ति किस शहर में स्थित है?`,

      mr: `SunFlow 360 ची सेवा पुणे, मुंबई, ठाणे, नाशिक, नागपूर, कोल्हापूर, छत्रपती संभाजीनगरसह संपूर्ण महाराष्ट्रात उपलब्ध आहे.

आपली मालमत्ता कोणत्या शहरात आहे?`,

      te: `మా సేవలు హైదరాబాద్, బెంగళూరు, పూణే, ముంబై మరియు ఇతర నగరాల్లో అందుబాటులో ఉన్నాయి. మీ ప్రాపర్టీ ఏ నగరంలో ఉంది?`,
    },

    quickReplies: {
      en: ["Pune", "Mumbai", "Nashik", "Nagpur", "Bangalore"],

      hi: ["पुणे", "मुंबई", "नासिक", "नागपुर"],

      mr: ["पुणे", "मुंबई", "नाशिक", "नागपूर"],

      te: ["హైదరాబాద్", "బెంగళూరు"],
    },
  },

  // 9. Booking Site Survey / Scheduling

  {
    matcher: (t) =>
      /book|schedule|survey|visit|call me|consultation|engineer|contact me|appointment|अपॉइंटमेंट|सर्व्हे/i.test(
        t,
      ),

    response: {
      en: `I would be delighted to schedule a **Free Rooftop Solar Survey & Consultation** for you! 

Our solar engineer will visit your roof, carry out laser shadow analysis, and share an exact 3D layout and Discom paperwork roadmap.

To confirm the visit, please confirm your:
1. **Full Name**
2. **Mobile Number**
3. **City / Locality**
4. **Property Type** (Residential / Commercial)`,

      hi: `मैं आपके लिए **मुफ़्त रूफटॉप सोलर साइट सर्वे** शेड्यूल करने के लिए तैयार हूँ!

हमारे सोलर इंजीनियर आपकी छत की लेज़र शैडो एनालिसिस करेंगे और सटीक 3D लेआउट तैयार करेंगे।

कृपया बुकिंग के लिए अपना:
1. **पूरा नाम**
2. **मोबाइल नंबर**
3. **शहर / इलाका** बताएं।`,

      mr: `आपल्यासाठी **विनामूल्य रूफटॉप सोलर साइट सर्व्हे** शेड्यूल करण्यात मला आनंद होईल!

अभियंता आपल्या छताची अचूक पाहणी करून 3D आराखडा तयार करतील.

बुकिंगसाठी कृपया आपले:
1. **पूर्ण नाव**
2. **मोबाईल नंबर**
3. **शहर** सांगा.`,

      te: `మేము మీ కోసం **ఉచిత రూఫ్‌టాప్ సోలార్ సైట్ సర్వే**ను షెడ్యూల్ చేయవచ్చు! దయచేసి మీ పూర్తి పేరు, మొబైల్ నంబర్ మరియు నగరాన్ని తెలపండి.`,
    },

    quickReplies: {
      en: [
        "Residential Home",

        "Commercial Property",

        "Estimate My Savings",

        "Talk to an Advisor",
      ],

      hi: ["आवासीय मकान", "व्यावसायिक संपत्ति", "सलाहकार से बात करें"],

      mr: ["घरगुती निवास", "व्यावसायिक इमारत", "सल्लागाराशी बोला"],

      te: ["నివాస గృహం", "వాణిజ్య ప్రాపర్టీ"],
    },
  },
]

/* =========================================================================
   INTELLIGENT HYBRID REASONING ENGINE
   ========================================================================= */

const smartAI: AssistantService = {
  engine: "smart-ai",

  greet: () => ({
    text: `Hello! I am your **SunFlow 360 AI Solar Advisor**. ☀️

I am connected to the SunFlow 360 database. I can help you:
- **Plan & estimate solar savings** with PM Surya Ghar subsidy (up to ₹78,000)
- **Check product catalog & database prices** (Mono PERC panels, inverters, batteries)
- **Track your existing order, lead, installation, or site survey** (by phone or ID)
- **Verify warranty coverage** by serial number or check service tickets

How can I help you today?`,

    quickReplies: [
      "💰 Estimate My Solar Savings",

      "🏛️ PM Surya Ghar Subsidy",

      "📦 View Products & Prices",

      "🔍 Track My Project / Order",
    ],

    collected: {},

    nextSlot: "chat",
  }),

  async reply(conv, currentSlot, raw) {
    // Artificial small delay for natural pacing

    await new Promise((r) => setTimeout(r, 450 + Math.random() * 300))

    const text = raw.trim()

    const lk = langKey(conv.collected.language || conv.language)

    // 1. Opportunistically extract entities from user input

    const updatedCollected = extractEntities(text, conv.collected)

    // Check if user confirmed booking / enquiry submission

    const isConfirming =
      /^(yes|submit|confirm|proceed|ok|sure|agree|हाँ|हो|అవును)/i.test(text) ||
      /yes,\s*submit/i.test(text) ||
      /book\s*(?:a\s*)?(?:free\s*)?site\s*survey/i.test(text)

    // Check if user provided contact details for booking

    const hasCoreDetails = Boolean(
      updatedCollected.name &&
        updatedCollected.phone &&
        updatedCollected.city &&
        (updatedCollected.propertyType || "Residential"),
    )

    if (!updatedCollected.propertyType) {
      updatedCollected.propertyType = "Residential"
    }

    // 2. If user is ready to book / submit enquiry

    if (isConfirming || currentSlot === "confirm") {
      if (hasCoreDetails) {
        const est = calculateSolarEstimate({
          monthlyBill: updatedCollected.monthlyBill,

          roofArea: updatedCollected.roofArea,

          preferredCapacity: updatedCollected.capacity,

          systemType: updatedCollected.systemType,
        })

        const replyText =
          lk === "hi"
            ? `शानदार ${updatedCollected.name}! आपकी सोलर पूछताछ और साइट सर्वे सफलतापूर्वक दर्ज कर लिया गया है। हमारे सोलर इंजीनियर 24 घंटों के भीतर आपसे संपर्क करेंगे।`
            : lk === "mr"
              ? `उत्कृष्ट ${updatedCollected.name}! आपली सोलर चौकशी आणि साइट सर्व्हे नोंदवण्यात आला आहे. आमचे तज्ज्ञ 24 तासांत आपल्याशी संपर्क साधतील.`
              : lk === "te"
                ? `ధన్యవాదాలు ${updatedCollected.name}! మీ విచారణ విజయవంతంగా నమోదు చేయబడింది. మా బృందం త్వరలోనే మిమ్మల్ని సంప్రదిస్తుంది.`
                : `Terrific, **${updatedCollected.name}**! Your rooftop solar enquiry & free site survey request has been confirmed. 

A SunFlow 360 technical advisor will call you at **${updatedCollected.phone}** to finalize your survey appointment and guide you through the PM Surya Ghar subsidy application.`

        return {
          text: replyText,

          quickReplies: [
            "View My Solar Estimate",

            "What happens next?",

            "Talk to an Advisor",
          ],

          collected: updatedCollected,

          nextSlot: "done",

          estimate: est,
        }
      }

      // If missing details, ask specifically for what's missing

      const missingFields: string[] = []

      if (!updatedCollected.name) missingFields.push("your full name")

      if (!updatedCollected.phone)
        missingFields.push("a 10-digit mobile number")

      if (!updatedCollected.city) missingFields.push("your city / town")

      return {
        text: `To schedule your free site survey, please provide ${missingFields.join(" and ")}.`,

        quickReplies: [
          "I am in Pune",

          "I am in Mumbai",

          "Residential Property",

          "Commercial Property",
        ],

        collected: updatedCollected,

        nextSlot: "confirm",
      }
    }

    // 3. Check for Database queries (customer tracking, orders, tickets, serials, catalog products)

    const dbResult = queryDatabase(text)

    if (dbResult && dbResult.found) {
      if (dbResult.category === "customer" && updatedCollected.phone) {
        const db = getDb()

        const foundCust = db.customers.find(
          (c) =>
            normalizePhone(c.phone) === normalizePhone(updatedCollected.phone!),
        )

        if (foundCust) {
          updatedCollected.name = updatedCollected.name || foundCust.name

          const s = db.sites.find((site) => site.customerId === foundCust.id)

          if (s) {
            updatedCollected.city = updatedCollected.city || s.city

            updatedCollected.propertyType =
              updatedCollected.propertyType || s.propertyType
          }
        }
      }

      // If Gemini is active, let Gemini format response using injected database context

      if (hasGeminiApiKey()) {
        try {
          const geminiAnswer = await callGeminiChat(
            [...conv.messages, newMessage("customer", text)],

            conv.collected.language || conv.language || "English",
          )

          if (geminiAnswer) {
            return {
              text: geminiAnswer,

              quickReplies: dbResult.quickReplies || [
                "Track My Order",

                "Check Warranty Details",

                "Talk to an Advisor",
              ],

              collected: updatedCollected,

              nextSlot: "chat",
            }
          }
        } catch (err) {
          console.warn(
            "Gemini API call failed, using built-in database record output:",

            err,
          )
        }
      }

      return {
        text: dbResult.summary,

        quickReplies: dbResult.quickReplies || [
          "Track My Installation",

          "Check Warranty Details",

          "Book Free Site Survey",
        ],

        collected: updatedCollected,

        nextSlot: "chat",
      }
    }

    // 4. If Gemini API key is configured, use live Google Gemini LLM

    if (hasGeminiApiKey()) {
      try {
        const geminiAnswer = await callGeminiChat(
          [...conv.messages, newMessage("customer", text)],

          conv.collected.language || conv.language || "English",
        )

        if (geminiAnswer) {
          const est =
            updatedCollected.monthlyBill || updatedCollected.capacity
              ? calculateSolarEstimate({
                  monthlyBill: updatedCollected.monthlyBill,

                  roofArea: updatedCollected.roofArea,

                  preferredCapacity: updatedCollected.capacity,

                  systemType: updatedCollected.systemType,
                })
              : undefined

          return {
            text: geminiAnswer,

            quickReplies: [
              "💰 Estimate My Solar Savings",

              "🏛️ PM Surya Ghar Subsidy",

              "⚡ On-Grid vs Off-Grid",

              "📅 Book Free Site Survey",
            ],

            collected: updatedCollected,

            nextSlot: "chat",

            estimate: est,
          }
        }
      } catch (err) {
        console.warn(
          "Gemini API call failed, using built-in Solar Knowledge Engine:",
          err,
        )
      }
    }

    // 4. Check Knowledge Base for matching solar domain questions

    for (const item of KNOWLEDGE_BASE) {
      if (item.matcher(text)) {
        let est: SolarEstimate | undefined = undefined

        if (
          item.triggerEstimate ||
          updatedCollected.monthlyBill ||
          updatedCollected.capacity
        ) {
          est = calculateSolarEstimate({
            monthlyBill: updatedCollected.monthlyBill,

            roofArea: updatedCollected.roofArea,

            preferredCapacity: updatedCollected.capacity,

            systemType: updatedCollected.systemType,
          })
        }

        return {
          text: item.response[lk],

          quickReplies: item.quickReplies[lk],

          collected: updatedCollected,

          nextSlot: "chat",

          estimate: est,
        }
      }
    }

    // 4. If user shared a bill or capacity, generate an instant customized calculation!

    if (
      updatedCollected.monthlyBill &&
      (!conv.collected.monthlyBill ||
        updatedCollected.monthlyBill !== conv.collected.monthlyBill)
    ) {
      const est = calculateSolarEstimate({
        monthlyBill: updatedCollected.monthlyBill,

        roofArea: updatedCollected.roofArea,

        preferredCapacity: updatedCollected.capacity,

        systemType: updatedCollected.systemType,
      })

      const textReply =
        lk === "hi"
          ? `आपके ₹${updatedCollected.monthlyBill.toLocaleString("en-IN")} मासिक बिजली बिल के आधार पर, हमने आपके लिए **${est.capacityKw} kW ऑन-ग्रिड सोलर सिस्टम** का सुझाव तैयार किया है। नीचे पूरा विवरण देखें:`
          : lk === "mr"
            ? `आपल्या ₹${updatedCollected.monthlyBill.toLocaleString("en-IN")} मासिक बिलासाठी आम्ही **${est.capacityKw} kW ऑन-ग्रिड सिस्टीम** सुचवत आहोत. खाली तपशील दिला आहे:`
            : lk === "te"
              ? `మీ ₹${updatedCollected.monthlyBill.toLocaleString("en-IN")} నెలవారీ బిల్లు ఆధారంగా, మేము **${est.capacityKw} kW ఆన్-గ్రిడ్ సిస్టమ్**ను సిఫార్సు చేస్తున్నాము:`
              : `Based on your average monthly electricity bill of **${inr(updatedCollected.monthlyBill)}**, a **${est.capacityKw} kW On-Grid System** will reduce your bill by **over 90%**! 

Here is your customized financial & generation breakdown under PM Surya Ghar:`

      return {
        text: textReply,

        quickReplies: [
          "Book Free Site Survey",

          "What is PM Surya Ghar subsidy?",

          "Can I run 1.5 ton AC?",

          "Talk to an Advisor",
        ],

        collected: updatedCollected,

        nextSlot: "chat",

        estimate: est,
      }
    }

    // 5. Default intelligent conversational fallback

    const est =
      updatedCollected.monthlyBill || updatedCollected.capacity
        ? calculateSolarEstimate({
            monthlyBill: updatedCollected.monthlyBill,

            roofArea: updatedCollected.roofArea,

            preferredCapacity: updatedCollected.capacity,

            systemType: updatedCollected.systemType,
          })
        : undefined

    const defaultReply =
      lk === "hi"
        ? `SunFlow 360 में आपका स्वागत है! मैं आपकी रूफटॉप सोलर संबंधी सहायता के लिए तैयार हूँ। आप सोलर की लागत, सरकार की ₹78,000 की सब्सिडी, बचत या फ्री साइट सर्वे के बारे में कुछ भी पूछ सकते हैं।`
        : lk === "mr"
          ? `SunFlow 360 मध्ये आपले स्वागत आहे! आपण सोलरचा खर्च, ₹78,000 सबसिडी, वीज बचत किंवा विनामूल्य साइट सर्व्हेबद्दल विचारू शकता.`
          : lk === "te"
            ? `SunFlow 360కి స్వాగతం! మీరు సోలార్ ఖర్చులు, సబ్సిడీ మరియు పొదుపు గురించి ఏదైనా అడగవచ్చు.`
            : `I'm happy to help you with anything related to rooftop solar! 

You can ask me about:
- **System Pricing & Payback** for your specific electricity bill
- **PM Surya Ghar: Muft Bijli Yojana** (claim up to ₹78,000 direct subsidy)
- **Rooftop Area & Feasibility** requirements
- **Running Air Conditioners & Heavy Loads** on solar
- **Booking a Free On-Site Inspection** with 3D shadow analysis

What is your average monthly electricity bill or city?`

    return {
      text: defaultReply,

      quickReplies: [
        "💰 Estimate My Solar Savings",

        "🏛️ PM Surya Ghar Subsidy",

        "⚡ On-Grid vs Off-Grid",

        "📅 Book Free Site Survey",
      ],

      collected: updatedCollected,

      nextSlot: "chat",

      estimate: est,
    }
  },
}

const backend: AssistantService = {
  engine: "backend",

  greet: smartAI.greet,

  reply: async (conversation, slot, text) => {
    try {
      return await apiRequest<AssistantTurn>("POST", "/assistant/reply", {
        conversationId: conversation.id,

        slot,

        text,
      })
    } catch {
      return smartAI.reply(conversation, slot, text)
    }
  },
}

export const assistantService: AssistantService = isDemoMode ? smartAI : backend
