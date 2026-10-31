import type {
  Assessment,
  ChecklistKey,
  DemoDB,
  Installation,
  InventoryUnit,
  Lead,
  LeadSource,
  LeadStatus,
  Photo,
  PropertyType,
  SystemType,
  User,
} from "@/lib/types"
import { CHECKLIST_ITEMS } from "@/lib/types"
import {
  DEFAULT_SETTINGS,
  SUPPLIERS,
  buildBom,
  buildProducts,
  chargesFor,
  computeTotals,
  inverterId,
  packageFor,
  quoteItemsFor,
} from "@/lib/catalog"
import { DAY, addDays, uid } from "@/lib/format"
import { summarizeLead } from "@/lib/rules"
import { nextId, nextInstallationRef, nextSerial } from "./ids"

export const DB_VERSION = 3

/** Customer used for the guided end-to-end demo journey. Not pre-seeded. */
export const DEMO_CUSTOMER = {
  name: "Rahul Sharma",
  phone: "9876543210",
  email: "rahul.sharma@example.in",
  language: "English",
  contactMethod: "WhatsApp" as const,
  propertyType: "Residential" as PropertyType,
  address: "Flat 302, Green Valley Society, Baner Road",
  city: "Pune",
  pin: "411045",
  monthlyBill: 3200,
  capacity: 3,
  systemType: "On-Grid" as SystemType,
}

export const USERS: User[] = [
  {
    id: "U-01",
    name: "Meera Kulkarni",
    role: "admin",
    title: "Director",
    phone: "9822000001",
    email: "meera@sunflow360.in",
    active: true,
  },
  {
    id: "U-02",
    name: "Vikram Joshi",
    role: "sales",
    title: "Sales Manager",
    phone: "9822000002",
    email: "vikram@sunflow360.in",
    active: true,
  },
  {
    id: "U-03",
    name: "Sneha Patil",
    role: "sales",
    title: "Sales Executive",
    phone: "9822000003",
    email: "sneha@sunflow360.in",
    active: true,
  },
  {
    id: "U-04",
    name: "Rohan Deshpande",
    role: "surveyor",
    title: "Site Surveyor",
    phone: "9822000004",
    email: "rohan@sunflow360.in",
    active: true,
  },
  {
    id: "U-05",
    name: "Kiran More",
    role: "surveyor",
    title: "Site Surveyor",
    phone: "9822000005",
    email: "kiran@sunflow360.in",
    active: true,
  },
  {
    id: "U-06",
    name: "Anil Gaikwad",
    role: "inventory",
    title: "Warehouse & Inventory Manager",
    phone: "9822000006",
    email: "anil@sunflow360.in",
    active: true,
  },
  ...[
    "Arjun Patil",
    "Mahesh Pawar",
    "Santosh Jadhav",
    "Ravi Shinde",
    "Ajay Kadam",
    "Nilesh Chavan",
    "Sachin Mane",
    "Prakash Salunkhe",
    "Tushar Bhosale",
    "Yogesh Thorat",
    "Dinesh Kamble",
  ].map<User>((name, i) => ({
    id: `U-${String(7 + i).padStart(2, "0")}`,
    name,
    role: "installer",
    title: i === 0 ? "Lead Installation Technician" : "Installation Technician",
    phone: `98220001${String(i).padStart(2, "0")}`,
    email: `${name.split(" ")[0].toLowerCase()}@sunflow360.in`,
    active: true,
  })),
  ...[
    "Imran Shaikh",
    "Swapnil Gore",
    "Akash Waghmare",
    "Vishal Lokhande",
  ].map<User>((name, i) => ({
    id: `U-${18 + i}`,
    name,
    role: "service",
    title: i === 0 ? "Service Lead" : "Service Technician",
    phone: `98220002${String(i).padStart(2, "0")}`,
    email: `${name.split(" ")[0].toLowerCase()}@sunflow360.in`,
    active: true,
  })),
]

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=70`
export const SAMPLE_PHOTOS = {
  roof: [
    IMG("photo-1758651636543-3c64e32870f6"),
    IMG("photo-1574932948936-d1a29990c634"),
  ],
  install: [
    IMG("photo-1655300283247-6b1924b1d152"),
    IMG("photo-1696697016306-b23b2c000575"),
    IMG("photo-1694327672187-74aa0605314d"),
    IMG("photo-1613665813446-82a78c468a1d"),
  ],
}

export const SIGNATURE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><path d="M20 70 C 40 20, 60 20, 70 60 S 100 90, 120 50 S 150 20, 160 55 S 190 80, 210 45 S 250 30, 280 60" fill="none" stroke="#18352A" stroke-width="3" stroke-linecap="round"/></svg>`,
  )

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STAGES = [
  "lead",
  "qualified",
  "survey-scheduled",
  "survey-pending",
  "survey-approved",
  "quote-sent",
  "quote-rejected",
  "shortage",
  "reserved",
  "delivered",
  "completed",
] as const
type Stage = typeof STAGES[number]
const rank = (s: Stage) => STAGES.indexOf(s)

interface ProjectOpts {
  name: string
  phone: string
  email?: string
  language?: string
  city: string
  pin: string
  address: string
  property: PropertyType
  kw: number
  type: SystemType
  source: LeadSource
  /** Days ago the enquiry arrived. Later milestones are offset from this. */
  start: number
  stage: Stage
  salesId: string
  surveyorId?: string
  crew?: string[]
  leadStatus?: LeadStatus
  balancePaid?: boolean
  monthlyBill?: number
  roofArea?: number
}

export function buildSeed(): DemoDB {
  const now = Date.now()
  const random = rng(360)
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(random() * arr.length)]
  /** ISO timestamp `daysAgo` days in the past (negative = future). */
  const at = (daysAgo: number, hour = 10) => {
    const d = new Date(now - daysAgo * DAY)
    d.setHours(hour, Math.floor(random() * 4) * 15, 0, 0)
    return d.toISOString()
  }

  const db: DemoDB = {
    version: DB_VERSION,
    counters: {},
    settings: { ...DEFAULT_SETTINGS },
    users: USERS,
    customers: [],
    sites: [],
    leads: [],
    conversations: [],
    surveys: [],
    quotations: [],
    salesOrders: [],
    payments: [],
    products: buildProducts(),
    units: [],
    reservations: [],
    movements: [],
    suppliers: SUPPLIERS,
    purchaseOrders: [],
    dispatches: [],
    installations: [],
    warranties: [],
    serviceTickets: [],
    replacements: [],
    subsidies: [],
    activities: [],
    notifications: [],
  }
  const product = (id: string) => db.products.find((p) => p.id === id)!
  const log = (
    entityType: DemoDB["activities"][number]["entityType"],
    entityId: string,
    customerId: string | undefined,
    text: string,
    actor: string,
    when: string,
  ) =>
    db.activities.push({
      id: uid(),
      entityType,
      entityId,
      customerId,
      text,
      actor,
      at: when,
    })
  const userName = (id?: string) =>
    db.users.find((u) => u.id === id)?.name ?? "System"
  const photo = (url: string, caption: string, when: string): Photo => ({
    id: uid(),
    url,
    caption,
    at: when,
  })

  function project(o: ProjectOpts) {
    const d = (offset: number, hour?: number) => at(o.start - offset, hour)
    const customerId = nextId(db, "CUS")
    db.customers.push({
      id: customerId,
      name: o.name,
      phone: o.phone,
      email: o.email,
      language: o.language ?? "English",
      contactMethod: o.source === "WhatsApp" ? "WhatsApp" : "Phone",
      createdAt: d(0),
    })
    const siteId = nextId(db, "SITE")
    db.sites.push({
      id: siteId,
      customerId,
      propertyType: o.property,
      address: o.address,
      city: o.city,
      state: "Maharashtra",
      pin: o.pin,
    })

    const r = rank(o.stage)
    const leadStatus: LeadStatus =
      o.stage === "lead"
        ? (o.leadStatus ?? "New")
        : o.stage === "qualified"
          ? "Qualified"
          : o.stage === "survey-scheduled"
            ? "Survey Scheduled"
            : r <= rank("survey-approved")
              ? "Survey Completed"
              : o.stage === "quote-sent"
                ? "Quotation Sent"
                : o.stage === "quote-rejected"
                  ? "Lost"
                  : "Won"
    const lead: Lead = {
      id: nextId(db, "LD"),
      customerId,
      siteId,
      source: o.source,
      status: leadStatus,
      monthlyBill:
        o.monthlyBill ??
        (r >= rank("qualified")
          ? Math.round((o.kw * 960 + random() * 600) / 100) * 100
          : undefined),
      roofArea:
        o.roofArea ??
        (r >= rank("survey-scheduled") ? o.kw * 110 + 40 : undefined),
      preferredCapacity: r >= rank("qualified") ? o.kw : undefined,
      systemType: r >= rank("qualified") || o.monthlyBill ? o.type : undefined,
      assignedTo: o.salesId,
      createdAt: d(0),
      updatedAt: d(Math.min(10, Math.max(0, o.start))),
      lostReason:
        o.stage === "quote-rejected"
          ? "Chose a lower-priced competitor"
          : undefined,
      notes: [],
    }
    db.leads.push(lead)
    log(
      "lead",
      lead.id,
      customerId,
      `Enquiry received via ${o.source}`,
      "System",
      d(0),
    )
    if (r >= rank("qualified"))
      log(
        "lead",
        lead.id,
        customerId,
        `Lead qualified by ${userName(o.salesId)}`,
        userName(o.salesId),
        d(1),
      )

    if (r < rank("survey-scheduled")) {
      lead.aiSummary = summarizeLead(lead, db.customers.at(-1), db.sites.at(-1))
      return { customerId, siteId, lead }
    }

    // Survey
    const surveyorId = o.surveyorId ?? pick(["U-04", "U-05"])
    const survey = {
      id: nextId(db, "SRV"),
      leadId: lead.id,
      customerId,
      siteId,
      surveyorId,
      scheduledAt: d(3, 11),
      status: "Scheduled" as DemoDB["surveys"][number]["status"],
      photos: [] as Photo[],
      notes: [],
      createdAt: d(2),
      assessment: undefined as Assessment | undefined,
      decidedAt: undefined as string | undefined,
      decisionNote: undefined as string | undefined,
    }
    db.surveys.push(survey)
    log(
      "survey",
      survey.id,
      customerId,
      `Site survey scheduled with ${userName(surveyorId)}`,
      userName(o.salesId),
      d(2),
    )
    if (r >= rank("survey-pending")) {
      survey.assessment = {
        roofArea: lead.roofArea ?? o.kw * 110,
        orientation: pick(["South", "South-East", "South-West"] as const),
        tilt: 18,
        shading: pick(["None", "Minimal"] as const),
        roofStructure: o.property === "Residential" ? "RCC" : "Metal Sheet",
        electricalSetup: o.kw >= 4 ? "Three Phase" : "Single Phase",
        cableDistance: 18 + Math.round(random() * 20),
        recommendedCapacity: o.kw,
        recommendedType: o.type,
      }
      survey.photos = [
        photo(SAMPLE_PHOTOS.roof[0], "Roof overview", d(3)),
        photo(SAMPLE_PHOTOS.roof[1], "Approach & meter location", d(3)),
      ]
      survey.status = "Pending Approval"
      log(
        "survey",
        survey.id,
        customerId,
        "Technical assessment submitted for approval",
        userName(surveyorId),
        d(3, 16),
      )
    }
    if (r >= rank("survey-approved")) {
      survey.status = "Approved"
      survey.decidedAt = d(4)
      survey.decisionNote = "Structure and shading acceptable."
      log(
        "survey",
        survey.id,
        customerId,
        "Survey approved",
        "Meera Kulkarni",
        d(4),
      )
    }
    if (r < rank("quote-sent")) return { customerId, siteId, lead, survey }

    // Quotation
    const items = quoteItemsFor(o.kw, o.type, db.products, uid)
    const { labour, other } = chargesFor(o.kw, o.type, db.settings)
    const totals = computeTotals(items, labour, other, db.settings)
    const quote = {
      id: nextId(db, "QT"),
      leadId: lead.id,
      customerId,
      siteId,
      surveyId: survey.id,
      packageId: packageFor(o.kw, o.type).id,
      capacity: o.kw,
      systemType: o.type,
      items,
      labour,
      otherCharges: other,
      totals,
      status: "Sent" as DemoDB["quotations"][number]["status"],
      validUntil: addDays(d(5), db.settings.quoteValidityDays),
      createdAt: d(5),
      sentAt: d(5, 15),
      amountSource: "demo" as const,
      decidedAt: undefined as string | undefined,
      salesOrderId: undefined as string | undefined,
      rejectionReason: undefined as string | undefined,
    }
    db.quotations.push(quote)
    log(
      "quotation",
      quote.id,
      customerId,
      `Quotation sent — ${o.kw} kW ${o.type}`,
      userName(o.salesId),
      d(5, 15),
    )
    if (o.stage === "quote-sent")
      return { customerId, siteId, lead, survey, quote }
    if (o.stage === "quote-rejected") {
      quote.status = "Rejected"
      quote.decidedAt = d(9)
      quote.rejectionReason = "Chose a lower-priced competitor"
      return { customerId, siteId, lead, survey, quote }
    }

    // Sales order + installation record
    quote.status = "Accepted"
    quote.decidedAt = d(7)
    const soId = nextId(db, "SO")
    quote.salesOrderId = soId
    const instId = nextId(db, "INS")
    const bom = buildBom(o.kw, o.type)
    db.salesOrders.push({
      id: soId,
      quotationId: quote.id,
      customerId,
      siteId,
      installationId: instId,
      total: totals.total,
      bom,
      status: "Confirmed",
      createdAt: d(7),
    })
    db.payments.push({
      id: nextId(db, "PAY"),
      salesOrderId: soId,
      customerId,
      amount: totals.advance,
      kind: "Advance",
      method: pick(["UPI", "Bank Transfer"] as const),
      reference: `UTR${Math.floor(random() * 9e9 + 1e9)}`,
      at: d(7, 14),
    })
    log(
      "order",
      soId,
      customerId,
      `Advance received and sales order created`,
      userName(o.salesId),
      d(7, 14),
    )
    const checklist = Object.fromEntries(
      CHECKLIST_ITEMS.map((c) => [c.key, false]),
    ) as Record<ChecklistKey, boolean>
    const inst: Installation = {
      id: instId,
      reference: nextInstallationRef(db, d(7)),
      salesOrderId: soId,
      customerId,
      siteId,
      capacity: o.kw,
      systemType: o.type,
      status: "Awaiting Materials",
      crew: [],
      checklist,
      photos: [],
      verifiedSerials: [],
      timesheets: [],
      createdAt: d(7),
      logisticsCost: 900 + o.kw * 150,
    }
    db.installations.push(inst)
    const so = db.salesOrders.at(-1)!

    if (o.stage === "shortage") {
      so.status = "Awaiting Stock"
      return { customerId, siteId, lead, survey, quote, so, inst }
    }
    if (o.stage === "reserved") {
      so.status = "Stock Reserved"
      bom.forEach((l) =>
        db.reservations.push({
          id: uid(),
          salesOrderId: soId,
          productId: l.productId,
          qty: l.qty,
        }),
      )
      log(
        "order",
        soId,
        customerId,
        "Stock reserved for order",
        "Anil Gaikwad",
        d(8),
      )
      return { customerId, siteId, lead, survey, quote, so, inst }
    }

    // Dispatch: serialized units are created directly as dispatched for this project
    const dspId = nextId(db, "DSP")
    const lines = bom.map((l) => {
      const p = product(l.productId)
      const serials: string[] = []
      if (p.serialized) {
        for (let i = 0; i < l.qty; i++) {
          const unit: InventoryUnit = {
            serial: nextSerial(db, p),
            productId: p.id,
            status: "Dispatched",
            receivedAt: at(o.start + 20),
            salesOrderId: soId,
            dispatchId: dspId,
            installationId: instId,
          }
          db.units.push(unit)
          serials.push(unit.serial)
        }
      }
      db.movements.push({
        id: uid(),
        productId: p.id,
        qty: -l.qty,
        type: "Dispatched",
        reference: dspId,
        at: d(9),
      })
      return { productId: l.productId, qty: l.qty, serials }
    })
    db.dispatches.push({
      id: dspId,
      salesOrderId: soId,
      installationId: instId,
      status: "Delivered",
      lines,
      vehicle: pick(["MH12 QW 4471", "MH14 KT 9024", "MH12 RT 1186"]),
      driver: pick(["Balu Kshirsagar", "Raju Pawar"]),
      createdAt: d(8),
      dispatchedAt: d(9, 8),
      deliveredAt: d(9, 13),
      receivedBy: o.name,
    })
    log(
      "dispatch",
      dspId,
      customerId,
      "Material dispatched with validated serials and delivered",
      "Anil Gaikwad",
      d(9, 13),
    )
    so.status = "Delivered"
    inst.status = "Scheduled"
    const crew = o.crew ?? [
      pick(["U-07", "U-08", "U-09", "U-10"]),
      pick(["U-11", "U-12", "U-13", "U-14", "U-15", "U-16", "U-17"]),
    ]
    inst.crew = crew.map((id, i) => ({
      technicianId: id,
      role: i === 0 ? "Lead" : "Crew",
    }))
    inst.scheduledAt = d(10, 9)
    inst.expectedCompletion = d(11, 18)
    log(
      "installation",
      instId,
      customerId,
      `Installation scheduled with ${userName(crew[0])}`,
      "Meera Kulkarni",
      d(9, 15),
    )
    if (o.stage === "delivered")
      return { customerId, siteId, lead, survey, quote, so, inst }

    // Completed installation
    const done = d(11, 17)
    inst.status = "Completed"
    inst.completedAt = done
    CHECKLIST_ITEMS.forEach((c) => (inst.checklist[c.key] = true))
    inst.verifiedSerials = lines.flatMap((l) => l.serials)
    inst.photos = [
      photo(SAMPLE_PHOTOS.install[0], "Array completed", done),
      photo(SAMPLE_PHOTOS.install[2], "Module close-up", done),
    ]
    inst.tests = {
      generationKw: Math.round(o.kw * 0.82 * 100) / 100,
      dcVoltage: 300 + o.kw * 40,
      acVoltage: 232,
      insulationMOhm: 48,
      earthingOhm: 1.6,
      recordedAt: done,
    }
    inst.signature = { name: o.name, dataUrl: SIGNATURE_PLACEHOLDER, at: done }
    inst.commissioning = {
      commissionedAt: done,
      generationKw: inst.tests.generationKw,
      handoverBy: crew[0],
    }
    inst.timesheets = crew.flatMap((id) => [
      { id: uid(), technicianId: id, start: d(10, 9), end: d(10, 17) },
      { id: uid(), technicianId: id, start: d(11, 9), end: d(11, 14) },
    ])
    db.units.forEach((u) => {
      if (u.installationId === instId) u.status = "Installed"
    })
    for (const l of lines) {
      const p = product(l.productId)
      for (const serial of l.serials) {
        db.warranties.push({
          id: nextId(db, "WAR", 5),
          serial,
          productId: p.id,
          installationId: instId,
          customerId,
          start: done,
          end: addDays(done, Math.round(p.warrantyMonths * 30.44)),
          terms: p.warrantyTerms,
        })
      }
    }
    db.warranties.push({
      id: nextId(db, "WAR", 5),
      serial: inst.reference,
      productId: "WORKMANSHIP",
      installationId: instId,
      customerId,
      start: done,
      end: addDays(done, Math.round(60 * 30.44)),
      terms: "5-year installation workmanship warranty",
    })
    so.status = o.balancePaid === false ? "Installed" : "Closed"
    if (o.balancePaid !== false) {
      db.payments.push({
        id: nextId(db, "PAY"),
        salesOrderId: soId,
        customerId,
        amount: totals.balance,
        kind: "Balance",
        method: pick(["UPI", "Bank Transfer", "Cheque"] as const),
        reference: `UTR${Math.floor(random() * 9e9 + 1e9)}`,
        at: d(13),
      })
    }
    if (o.property === "Residential" && o.type === "On-Grid") {
      const amount = o.kw === 1 ? 30000 : o.kw === 2 ? 60000 : 78000
      db.subsidies.push({
        id: nextId(db, "SUB"),
        installationId: instId,
        customerId,
        scheme: "PM Surya Ghar (sample tracking)",
        status:
          o.start > 120 ? "Disbursed" : o.start > 40 ? "Approved" : "Applied",
        amount,
        updatedAt: d(20),
      })
    }
    log(
      "installation",
      instId,
      customerId,
      "Installation completed, commissioned and handed over",
      userName(crew[0]),
      done,
    )
    return { customerId, siteId, lead, survey, quote, so, inst }
  }

  /* ---------- Story customers ---------- */

  const priya = project({
    name: "Priya Deshmukh",
    phone: "9822334455",
    email: "priya.deshmukh@example.in",
    language: "Marathi",
    city: "Pune",
    pin: "411038",
    address: "12, Prabhat Road, Erandwane",
    property: "Residential",
    kw: 5,
    type: "On-Grid",
    source: "Referral",
    start: 430,
    stage: "completed",
    salesId: "U-02",
    crew: ["U-07", "U-08"],
  })
  const deepak = project({
    name: "Deepak Shinde",
    phone: "9850011223",
    email: "deepak.shinde@example.in",
    language: "Marathi",
    city: "Satara",
    pin: "415001",
    address: "Plot 7, Sadar Bazar",
    property: "Residential",
    kw: 3,
    type: "On-Grid",
    source: "Walk-in",
    start: 2200,
    stage: "completed",
    salesId: "U-02",
    crew: ["U-09", "U-12"],
  })
  const vaishali = project({
    name: "Vaishali Kadam",
    phone: "9921456780",
    city: "Ahmednagar",
    pin: "414001",
    address: "Savedi Road, Near Water Tank",
    property: "Residential",
    kw: 2,
    type: "Off-Grid",
    source: "Phone",
    start: 1030,
    stage: "completed",
    salesId: "U-03",
    crew: ["U-10", "U-13"],
  })
  project({
    name: "Amit Kulkarni",
    phone: "9767123456",
    email: "amit.k@example.in",
    city: "Nashik",
    pin: "422005",
    address: "4, Gangapur Road, College Road Area",
    property: "Residential",
    kw: 3,
    type: "Off-Grid",
    source: "Website",
    start: 9,
    stage: "delivered",
    salesId: "U-03",
    crew: ["U-07", "U-08"],
  })
  const anjali = project({
    name: "Anjali Mehta",
    phone: "9881234567",
    email: "accounts@mehtatextiles.in",
    city: "Nagpur",
    pin: "440010",
    address: "Mehta Textiles, Plot 22, Hingna MIDC",
    property: "Commercial",
    kw: 5,
    type: "On-Grid",
    source: "Referral",
    start: 12,
    stage: "shortage",
    salesId: "U-02",
  })
  project({
    name: "Kavita Rao",
    phone: "9819876543",
    email: "kavita.rao@example.in",
    city: "Thane",
    pin: "400601",
    address: "Rao Clinic, Naupada",
    property: "Commercial",
    kw: 4,
    type: "On-Grid",
    source: "Website",
    start: 9,
    stage: "quote-sent",
    salesId: "U-03",
  })
  project({
    name: "Suresh Patil",
    phone: "9970112233",
    city: "Kolhapur",
    pin: "416003",
    address: "Rajarampuri 5th Lane",
    property: "Residential",
    kw: 2,
    type: "On-Grid",
    source: "Phone",
    start: 4,
    stage: "survey-pending",
    salesId: "U-02",
    surveyorId: "U-04",
  })
  project({
    name: "Pooja Iyer",
    phone: "9930445566",
    email: "pooja.iyer@example.in",
    city: "Thane",
    pin: "400607",
    address: "B-1104, Hiranandani Estate",
    property: "Residential",
    kw: 3,
    type: "On-Grid",
    source: "AI Assistant",
    start: 1,
    stage: "survey-scheduled",
    salesId: "U-03",
    surveyorId: "U-04",
  })
  project({
    name: "Sanjay Pawar",
    phone: "9890765432",
    city: "Pune",
    pin: "411028",
    address: "Hadapsar, Magarpatta Road",
    property: "Residential",
    kw: 2,
    type: "On-Grid",
    source: "Website",
    start: 34,
    stage: "quote-rejected",
    salesId: "U-03",
  })
  const neha = project({
    name: "Neha Joshi",
    phone: "9765432109",
    city: "Pune",
    pin: "",
    address: "",
    property: "Residential",
    kw: 4,
    type: "On-Grid",
    source: "WhatsApp",
    start: 0.2,
    stage: "lead",
    salesId: "U-03",
    leadStatus: "New",
    language: "Hindi",
  })
  project({
    name: "Farhan Qureshi",
    phone: "9823456780",
    city: "Chhatrapati Sambhajinagar",
    pin: "431001",
    address: "Jalna Road, Cidco N-3",
    property: "Residential",
    kw: 1,
    type: "Off-Grid",
    source: "Phone",
    start: 3,
    stage: "lead",
    salesId: "U-02",
    leadStatus: "Contacted",
    monthlyBill: 900,
  })

  /* ---------- Historical completed projects (feed reports) ---------- */

  const first = [
    "Aditya",
    "Sunita",
    "Rajesh",
    "Manisha",
    "Omkar",
    "Shweta",
    "Ganesh",
    "Rupali",
    "Nikhil",
    "Asha",
    "Harish",
    "Meghna",
    "Tejas",
    "Kalpana",
    "Vinod",
    "Smita",
    "Pankaj",
    "Leena",
    "Rohit",
    "Varsha",
    "Sameer",
    "Ketaki",
    "Mangesh",
    "Pallavi",
    "Abhijit",
    "Seema",
    "Kunal",
    "Jyoti",
    "Hemant",
    "Ishita",
    "Nitin",
    "Archana",
  ]
  const last = [
    "Bhide",
    "Gokhale",
    "Phadke",
    "Sawant",
    "Naik",
    "Apte",
    "Karve",
    "Lele",
    "Ranade",
    "Wagh",
    "Jagtap",
    "Mhatre",
    "Dixit",
    "Nimbalkar",
    "Tambe",
    "Sathe",
  ]
  const cities = [
    ["Pune", "4110"],
    ["Pune", "4110"],
    ["Pimpri-Chinchwad", "4110"],
    ["Mumbai", "4000"],
    ["Nashik", "4220"],
    ["Nagpur", "4400"],
    ["Kolhapur", "4160"],
    ["Satara", "4150"],
  ] as const
  const usedNames = new Set(db.customers.map((c) => c.name))
  let phoneSeq = 9011100000
  const person = () => {
    let name = ""
    do name = `${pick(first)} ${pick(last)}`
    while (usedNames.has(name))
    usedNames.add(name)
    phoneSeq += 1 + Math.floor(random() * 900)
    const [city, pinPrefix] = pick(cities)
    return {
      name,
      phone: String(phoneSeq),
      city,
      pin: `${pinPrefix}${String(10 + Math.floor(random() * 60)).padStart(2, "0")}`,
    }
  }
  const streets = [
    "Karve Nagar",
    "Kothrud",
    "Aundh",
    "Wakad",
    "Shivaji Nagar",
    "Model Colony",
    "Viman Nagar",
    "Sinhagad Road",
    "Kharadi",
    "Bavdhan",
  ]
  const sources: LeadSource[] = [
    "Website",
    "WhatsApp",
    "Phone",
    "Referral",
    "AI Assistant",
    "Walk-in",
  ]

  for (let i = 0; i < 16; i++) {
    const p = person()
    const kw = pick([2, 3, 3, 3, 4, 5, 1, 2])
    const type: SystemType = random() < 0.85 ? "On-Grid" : "Off-Grid"
    project({
      ...p,
      email: `${p.name.split(" ")[0].toLowerCase()}@example.in`,
      address: `${Math.ceil(random() * 90)}, ${pick(streets)}`,
      property: random() < 0.8 ? "Residential" : "Commercial",
      kw,
      type,
      source: pick(sources),
      start: 22 + Math.round((i / 16) * 190 + random() * 10),
      stage: "completed",
      salesId: pick(["U-02", "U-03"]),
      balancePaid: i % 6 !== 1,
    })
  }

  /* ---------- Open pipeline leads ---------- */

  const statuses: LeadStatus[] = [
    "New",
    "New",
    "New",
    "New",
    "New",
    "Contacted",
    "Contacted",
    "Contacted",
    "Contacted",
    "Qualified",
    "Qualified",
    "Qualified",
    "Lost",
    "Lost",
    "Lost",
  ]
  statuses.forEach((status, i) => {
    const p = person()
    const kw = pick([1, 2, 3, 3, 4, 5])
    const complete = random() > 0.4
    const r = project({
      ...p,
      email: complete
        ? `${p.name.split(" ")[0].toLowerCase()}.${i}@example.in`
        : undefined,
      address: complete ? `${Math.ceil(random() * 90)}, ${pick(streets)}` : "",
      property:
        random() < 0.75
          ? "Residential"
          : random() < 0.7
            ? "Commercial"
            : "Industrial",
      kw,
      type: random() < 0.8 ? "On-Grid" : "Off-Grid",
      source: pick(sources),
      start: Math.round(random() * 40 + (status === "New" ? 0 : 3)),
      stage: status === "Qualified" ? "qualified" : "lead",
      leadStatus: status,
      salesId: status === "New" && random() < 0.5 ? "" : pick(["U-02", "U-03"]),
      monthlyBill: complete ? kw * 1000 : undefined,
    })
    if (!r.lead.assignedTo) r.lead.assignedTo = undefined
    if (status === "Lost")
      r.lead.lostReason = pick([
        "Budget constraints",
        "Roof not suitable",
        "Postponed decision",
      ])
  })

  /* ---------- Current stock ---------- */

  const receivePO = (
    supplierId: string,
    lines: { productId: string; qty: number }[],
    daysAgo: number,
    reason: string,
  ) => {
    const poId = nextId(db, "PO")
    db.purchaseOrders.push({
      id: poId,
      supplierId,
      status: "Received",
      lines: lines.map((l) => ({
        ...l,
        received: l.qty,
        unitCost: product(l.productId).unitCost,
      })),
      reason,
      createdAt: at(daysAgo + 8),
      expectedAt: at(daysAgo),
    })
    for (const l of lines) {
      const p = product(l.productId)
      if (p.serialized)
        for (let i = 0; i < l.qty; i++)
          db.units.push({
            serial: nextSerial(db, p),
            productId: p.id,
            status: "In Stock",
            receivedAt: at(daysAgo),
            purchaseOrderId: poId,
          })
      else p.onHand += l.qty
      db.movements.push({
        id: uid(),
        productId: p.id,
        qty: l.qty,
        type: "Received",
        reference: poId,
        at: at(daysAgo),
      })
    }
  }
  receivePO(
    "SUP-01",
    [{ productId: "PNL-540", qty: 84 }],
    26,
    "Monthly panel replenishment",
  )
  receivePO(
    "SUP-02",
    [
      { productId: inverterId(1, "On-Grid"), qty: 2 },
      { productId: inverterId(2, "On-Grid"), qty: 3 },
      { productId: inverterId(3, "On-Grid"), qty: 3 },
      { productId: inverterId(4, "On-Grid"), qty: 2 },
      { productId: inverterId(1, "Off-Grid"), qty: 2 },
      { productId: inverterId(2, "Off-Grid"), qty: 1 },
      { productId: inverterId(3, "Off-Grid"), qty: 1 },
      { productId: inverterId(4, "Off-Grid"), qty: 1 },
      { productId: inverterId(5, "Off-Grid"), qty: 1 },
      { productId: "BAT-150", qty: 18 },
    ],
    19,
    "Inverter & battery replenishment",
  )
  receivePO(
    "SUP-03",
    [
      { productId: "CBL-DC4", qty: 900 },
      { productId: "CBL-AC6", qty: 520 },
      { productId: "CON-MC4", qty: 120 },
      { productId: "PRT-ACDB", qty: 9 },
      { productId: "PRT-DCDB", qty: 8 },
      { productId: "PRT-LA", qty: 3 },
      { productId: "ERT-KIT", qty: 24 },
    ],
    15,
    "Balance-of-system restock",
  )
  receivePO(
    "SUP-04",
    [{ productId: "MNT-GI", qty: 36 }],
    12,
    "Structure restock",
  )

  db.purchaseOrders.push({
    id: nextId(db, "PO"),
    supplierId: "SUP-03",
    status: "Ordered",
    lines: [
      {
        productId: "PRT-LA",
        qty: 10,
        received: 0,
        unitCost: product("PRT-LA").unitCost,
      },
    ],
    reason: "Low stock — lightning arresters",
    createdAt: at(2),
    expectedAt: at(-3),
  })
  db.purchaseOrders.push({
    id: nextId(db, "PO"),
    supplierId: "SUP-02",
    status: "Requested",
    lines: [
      {
        productId: inverterId(5, "On-Grid"),
        qty: 1,
        received: 0,
        unitCost: product(inverterId(5, "On-Grid")).unitCost,
      },
    ],
    reason: `Shortage for ${anjali.so!.id} (Anjali Mehta)`,
    salesOrderId: anjali.so!.id,
    createdAt: at(4),
  })
  log(
    "purchase",
    db.purchaseOrders.at(-1)!.id,
    anjali.customerId,
    "Purchase request raised for 5 kW On-Grid inverter shortage",
    "Anil Gaikwad",
    at(4),
  )

  /* ---------- Service history ---------- */

  // Priya: covered panel replacement, closed — demonstrates replacement history
  const priyaPanel = db.units.find(
    (u) => u.installationId === priya.inst!.id && u.productId === "PNL-540",
  )!
  const replacement: InventoryUnit = {
    serial: nextSerial(db, product("PNL-540")),
    productId: "PNL-540",
    status: "Installed",
    receivedAt: at(200),
    installationId: priya.inst!.id,
    salesOrderId: priya.so!.id,
  }
  db.units.push(replacement)
  priyaPanel.status = "Replaced"
  const priyaTicket = nextId(db, "TKT")
  const oldW = db.warranties.find((w) => w.serial === priyaPanel.serial)!
  const newWId = nextId(db, "WAR", 5)
  oldW.supersededBy = newWId
  db.warranties.push({
    ...oldW,
    id: newWId,
    serial: replacement.serial,
    supersededBy: undefined,
  })
  db.replacements.push({
    id: uid(),
    originalSerial: priyaPanel.serial,
    replacementSerial: replacement.serial,
    productId: "PNL-540",
    installationId: priya.inst!.id,
    serviceTicketId: priyaTicket,
    at: at(150),
  })
  db.serviceTickets.push({
    id: priyaTicket,
    customerId: priya.customerId,
    installationId: priya.inst!.id,
    serial: priyaPanel.serial,
    warrantyId: oldW.id,
    issue:
      "One string producing noticeably less power; visible hotspot on a module.",
    priority: "Medium",
    status: "Closed",
    assignedTo: "U-18",
    photos: [],
    diagnosis:
      "Thermal scan confirmed a cell hotspot on one module — manufacturing defect.",
    coverage: "Covered",
    repair: {
      action: "Replaced",
      notes: "Module replaced under product warranty. String output restored.",
      originalSerial: priyaPanel.serial,
      replacementSerial: replacement.serial,
      at: at(150),
    },
    parts: [{ productId: "PNL-540", qty: 1, unitCost: 0 }],
    labourHours: 3,
    customerCharge: 0,
    customerConfirmedAt: at(149),
    createdAt: at(156),
    closedAt: at(149),
    raisedBy: "customer",
    log: [
      {
        id: uid(),
        text: "Ticket raised from customer portal",
        authorName: "Priya Deshmukh",
        at: at(156),
      },
      {
        id: uid(),
        text: "Replacement completed under warranty",
        authorName: "Imran Shaikh",
        at: at(150),
      },
    ],
  })
  db.movements.push({
    id: uid(),
    productId: "PNL-540",
    qty: -1,
    type: "Replacement Issued",
    reference: priyaTicket,
    serial: replacement.serial,
    at: at(150),
  })

  // Deepak: inverter out of warranty — chargeable estimate awaiting approval
  const deepakInv = db.units.find(
    (u) =>
      u.installationId === deepak.inst!.id && u.productId.startsWith("INV"),
  )!
  db.serviceTickets.push({
    id: nextId(db, "TKT"),
    customerId: deepak.customerId,
    installationId: deepak.inst!.id,
    serial: deepakInv.serial,
    warrantyId: db.warranties.find((w) => w.serial === deepakInv.serial)?.id,
    issue: "Inverter does not start in the morning, shows error E-07.",
    priority: "High",
    status: "Awaiting Approval",
    assignedTo: "U-18",
    photos: [],
    diagnosis:
      "IGBT power board failure. Inverter warranty expired — board replacement required.",
    coverage: "Chargeable",
    estimate: { amount: 18500 },
    parts: [],
    labourHours: 0,
    customerCharge: 18500,
    createdAt: at(3),
    raisedBy: "staff",
    log: [
      {
        id: uid(),
        text: "Customer called the service line",
        authorName: "Imran Shaikh",
        at: at(3),
      },
      {
        id: uid(),
        text: "Chargeable estimate ₹18,500 shared with customer",
        authorName: "Imran Shaikh",
        at: at(2),
      },
    ],
  })
  // A recent installation with low generation, unassigned
  const recent = db.installations
    .filter((i) => i.status === "Completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0]
  db.serviceTickets.push({
    id: nextId(db, "TKT"),
    customerId: recent.customerId,
    installationId: recent.id,
    issue: "Generation appears lower than expected on cloudy-free days.",
    priority: "Medium",
    status: "Open",
    photos: [],
    parts: [],
    labourHours: 0,
    customerCharge: 0,
    createdAt: at(1),
    raisedBy: "customer",
    log: [
      {
        id: uid(),
        text: "Ticket raised from customer portal",
        authorName: db.customers.find((c) => c.id === recent.customerId)!.name,
        at: at(1),
      },
    ],
  })

  /* ---------- Conversations ---------- */

  db.conversations.push({
    id: nextId(db, "CONV"),
    channel: "WhatsApp",
    customerId: neha.customerId,
    leadId: neha.lead.id,
    language: "Hindi",
    status: "Needs Human",
    collected: {
      name: "Neha Joshi",
      city: "Pune",
      propertyType: "Residential",
      language: "Hindi",
    },
    messages: [
      {
        id: uid(),
        from: "customer",
        text: "Namaste, mujhe ghar ke liye solar lagwana hai. Price kya hoga?",
        at: at(0.2),
      },
      {
        id: uid(),
        from: "assistant",
        text: "Namaste Neha ji! Aapka average monthly bijli bill kitna aata hai? Isse hum sahi system size suggest kar paayenge.",
        at: at(0.2),
      },
      {
        id: uid(),
        from: "customer",
        text: "Bill ka photo bhej sakti hoon? Kya subsidy milegi?",
        at: at(0.19),
      },
      {
        id: uid(),
        from: "assistant",
        text: "Subsidy eligibility hamari team confirm karegi. Main aapko ek sales advisor se connect kar raha hoon.",
        at: at(0.19),
      },
    ],
    startedAt: at(0.2),
    updatedAt: at(0.19),
  })

  /* ---------- Notifications ---------- */

  db.notifications.push(
    {
      id: uid(),
      title: "Survey awaiting approval",
      body: "Suresh Patil — 2 kW On-Grid, Kolhapur",
      link: "/app/surveys",
      roles: ["admin", "sales"],
      at: at(0.5),
      read: false,
    },
    {
      id: uid(),
      title: "Low stock: Lightning Arrester",
      body: "Available quantity is below the reorder level.",
      link: "/app/inventory",
      roles: ["admin", "inventory"],
      at: at(1),
      read: false,
    },
    {
      id: uid(),
      title: "Chargeable estimate pending",
      body: "Deepak Shinde has not yet approved the ₹18,500 inverter repair.",
      link: "/app/service-tickets",
      roles: ["admin", "service"],
      at: at(2),
      read: false,
    },
    {
      id: uid(),
      title: "New WhatsApp enquiry needs a human",
      body: "Neha Joshi asked about subsidy eligibility.",
      link: "/app/conversations",
      roles: ["admin", "sales"],
      at: at(0.19),
      read: false,
    },
    {
      id: uid(),
      title: "Installation scheduled",
      body: "Amit Kulkarni — 3 kW Off-Grid, Nashik",
      link: "/app/technician",
      roles: ["admin", "installer"],
      at: at(0.3),
      read: false,
    },
  )

  void vaishali
  db.activities.sort((a, b) => b.at.localeCompare(a.at))
  return db
}
