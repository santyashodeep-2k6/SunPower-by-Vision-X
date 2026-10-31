import type {
  Assessment,
  Conversation,
  Lead,
  LeadSource,
  LeadStatus,
  Payment,
  Photo,
  PropertyType,
  Quotation,
  SystemType,
} from "@/lib/types"
import { CHECKLIST_ITEMS } from "@/lib/types"
import {
  buildBom,
  chargesFor,
  computeTotals,
  PACKAGES,
  quoteItemsFor,
} from "@/lib/catalog"
import { addDays, normalizePhone, uid } from "@/lib/format"
import { byId, summarizeLead } from "@/lib/rules"
import { nextId, nextInstallationRef } from "@/data/ids"
import {
  actorName,
  command,
  logActivity,
  notFound,
  notify,
  nowIso,
  query,
  rule,
} from "./core"

/* ============================ Enquiries & leads ============================ */

export interface EnquiryInput {
  name: string
  phone: string
  email?: string
  language: string
  contactMethod: "Phone" | "WhatsApp" | "Email"
  propertyType: PropertyType
  address: string
  city: string
  pin: string
  monthlyBill?: number
  roofArea?: number
  preferredCapacity?: number
  systemType?: SystemType
  requirements?: string
  source: LeadSource
}

export interface DuplicateMatch {
  customerId: string
  name: string
  matchedOn: "phone" | "email"
  openLeadId?: string
  openLeadStatus?: LeadStatus
}

export function checkDuplicateEnquiry(phone: string, email?: string) {
  const p = normalizePhone(phone)
  return query<DuplicateMatch | null>(
    {
      method: "GET",
      path: `/customers/lookup?phone=${p}&email=${encodeURIComponent(email ?? "")}`,
    },
    (db) => {
      const byPhone = db.customers.find((c) => normalizePhone(c.phone) === p)
      const byEmail = email
        ? db.customers.find(
            (c) => c.email?.toLowerCase() === email.toLowerCase(),
          )
        : undefined
      const c = byPhone ?? byEmail
      if (!c) return null
      const open = db.leads.find(
        (l) => l.customerId === c.id && !["Won", "Lost"].includes(l.status),
      )
      return {
        customerId: c.id,
        name: c.name,
        matchedOn: byPhone ? "phone" : "email",
        openLeadId: open?.id,
        openLeadStatus: open?.status,
      }
    },
  )
}

/** Creates a lead. Re-uses the existing customer record when the phone number matches. */
export function submitEnquiry(input: EnquiryInput) {
  return command({ method: "POST", path: "/enquiries", body: input }, (db) => {
    const phone = normalizePhone(input.phone)
    let customer = db.customers.find((c) => normalizePhone(c.phone) === phone)
    const now = nowIso()
    if (customer) {
      Object.assign(customer, {
        name: input.name,
        email: input.email || customer.email,
        language: input.language,
        contactMethod: input.contactMethod,
      })
    } else {
      customer = {
        id: nextId(db, "CUS"),
        name: input.name,
        phone,
        email: input.email || undefined,
        language: input.language,
        contactMethod: input.contactMethod,
        createdAt: now,
      }
      db.customers.push(customer)
    }
    let site = db.sites.find(
      (s) =>
        s.customerId === customer!.id &&
        s.pin === input.pin &&
        s.address === input.address,
    )
    if (!site) {
      site = {
        id: nextId(db, "SITE"),
        customerId: customer.id,
        propertyType: input.propertyType,
        address: input.address,
        city: input.city,
        state: "Maharashtra",
        pin: input.pin,
      }
      db.sites.push(site)
    }
    const lead: Lead = {
      id: nextId(db, "LD"),
      customerId: customer.id,
      siteId: site.id,
      source: input.source,
      status: "New",
      monthlyBill: input.monthlyBill || undefined,
      roofArea: input.roofArea || undefined,
      preferredCapacity: input.preferredCapacity || undefined,
      systemType: input.systemType,
      requirements: input.requirements || undefined,
      createdAt: now,
      updatedAt: now,
      notes: [],
    }
    lead.aiSummary = summarizeLead(lead, customer, site)
    db.leads.unshift(lead)
    logActivity(
      db,
      "lead",
      lead.id,
      customer.id,
      `Enquiry received via ${input.source}`,
    )
    notify(db, {
      title: "New enquiry",
      body: `${customer.name} — ${site.city}, ${input.propertyType}`,
      link: `/app/leads/${lead.id}`,
      roles: ["admin", "sales"],
    })
    return { leadId: lead.id, customerId: customer.id, reference: lead.id }
  })
}

export interface LeadPatch {
  name?: string
  email?: string
  phone?: string
  language?: string
  propertyType?: PropertyType
  address?: string
  city?: string
  pin?: string
  monthlyBill?: number
  roofArea?: number
  preferredCapacity?: number
  systemType?: SystemType
  requirements?: string
}

export function updateLead(id: string, patch: LeadPatch) {
  return command(
    { method: "PATCH", path: `/leads/${id}`, body: patch },
    (db) => {
      const lead = byId(db.leads, id) ?? notFound("Lead")
      const customer = byId(db.customers, lead.customerId)!
      const site = byId(db.sites, lead.siteId)!
      if (patch.phone !== undefined) {
        const p = normalizePhone(patch.phone)
        const clash = db.customers.find(
          (c) => c.id !== customer.id && normalizePhone(c.phone) === p,
        )
        if (clash)
          rule(
            "DUPLICATE_PHONE",
            `This phone number already belongs to ${clash.name}. Merge records instead of duplicating the customer.`,
          )
        customer.phone = p
      }
      if (patch.name !== undefined) customer.name = patch.name
      if (patch.email !== undefined) customer.email = patch.email || undefined
      if (patch.language !== undefined) customer.language = patch.language
      if (patch.propertyType) site.propertyType = patch.propertyType
      if (patch.address !== undefined) site.address = patch.address
      if (patch.city !== undefined) site.city = patch.city
      if (patch.pin !== undefined) site.pin = patch.pin
      for (const k of [
        "monthlyBill",
        "roofArea",
        "preferredCapacity",
        "systemType",
        "requirements",
      ] as const) {
        if (patch[k] !== undefined)
          (lead as unknown as Record<string, unknown>)[k] =
            patch[k] || undefined
      }
      lead.updatedAt = nowIso()
      lead.aiSummary = summarizeLead(lead, customer, site)
      logActivity(db, "lead", id, lead.customerId, "Lead details updated")
    },
  )
}

export function assignLead(id: string, userId: string) {
  return command(
    { method: "POST", path: `/leads/${id}/assign`, body: { userId } },
    (db) => {
      const lead = byId(db.leads, id) ?? notFound("Lead")
      const user = byId(db.users, userId) ?? notFound("Salesperson")
      lead.assignedTo = userId
      lead.updatedAt = nowIso()
      logActivity(db, "lead", id, lead.customerId, `Assigned to ${user.name}`)
    },
  )
}

const MANUAL_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  New: ["Contacted", "Qualified", "Lost"],
  Contacted: ["Qualified", "Lost"],
  Qualified: ["Contacted", "Lost"],
  "Survey Scheduled": ["Lost"],
  "Survey Completed": ["Lost"],
  "Quotation Sent": ["Lost"],
  Won: [],
  Lost: ["Contacted"],
}
export const allowedLeadTransitions = (s: LeadStatus) => MANUAL_TRANSITIONS[s]

export function changeLeadStatus(
  id: string,
  status: LeadStatus,
  reason?: string,
) {
  return command(
    { method: "POST", path: `/leads/${id}/status`, body: { status, reason } },
    (db) => {
      const lead = byId(db.leads, id) ?? notFound("Lead")
      if (!MANUAL_TRANSITIONS[lead.status].includes(status))
        rule(
          "INVALID_TRANSITION",
          `A lead cannot move from “${lead.status}” to “${status}” manually.`,
        )
      if (status === "Lost" && !reason?.trim())
        rule("REASON_REQUIRED", "Please record why the lead was lost.")
      const from = lead.status
      lead.status = status
      lead.lostReason = status === "Lost" ? reason : undefined
      lead.updatedAt = nowIso()
      logActivity(
        db,
        "lead",
        id,
        lead.customerId,
        `Status changed from ${from} to ${status}${
          reason ? ` — ${reason}` : ""
        }`,
      )
    },
  )
}

export function addLeadNote(id: string, text: string) {
  return command(
    { method: "POST", path: `/leads/${id}/notes`, body: { text } },
    (db) => {
      if (!text.trim()) rule("EMPTY_NOTE", "Note cannot be empty.")
      const lead = byId(db.leads, id) ?? notFound("Lead")
      lead.notes.unshift({
        id: uid(),
        text: text.trim(),
        authorName: actorName(db),
        at: nowIso(),
      })
      logActivity(db, "lead", id, lead.customerId, "Internal note added")
    },
  )
}

export function requestFollowUp(id: string, at: string, note: string) {
  return command(
    { method: "POST", path: `/leads/${id}/follow-ups`, body: { at, note } },
    (db) => {
      const lead = byId(db.leads, id) ?? notFound("Lead")
      if (new Date(at).getTime() < Date.now() - 60000)
        rule("PAST_DATE", "Follow-up must be scheduled in the future.")
      lead.followUpAt = at
      if (note.trim())
        lead.notes.unshift({
          id: uid(),
          text: `Follow-up: ${note.trim()}`,
          authorName: actorName(db),
          at: nowIso(),
        })
      logActivity(
        db,
        "lead",
        id,
        lead.customerId,
        `Follow-up requested for ${new Date(at).toLocaleString("en-IN")}`,
      )
    },
  )
}

export function regenerateLeadSummary(id: string) {
  return command({ method: "POST", path: `/leads/${id}/ai-summary` }, (db) => {
    const lead = byId(db.leads, id) ?? notFound("Lead")
    lead.aiSummary = summarizeLead(
      lead,
      byId(db.customers, lead.customerId),
      byId(db.sites, lead.siteId),
    )
  })
}

/* ================================ Surveys ================================= */

export function scheduleSurvey(
  leadId: string,
  surveyorId: string,
  scheduledAt: string,
) {
  return command(
    {
      method: "POST",
      path: `/leads/${leadId}/surveys`,
      body: { surveyorId, scheduledAt },
    },
    (db) => {
      const lead = byId(db.leads, leadId) ?? notFound("Lead")
      if (lead.status === "Lost" || lead.status === "Won")
        rule(
          "LEAD_CLOSED",
          `Cannot schedule a survey for a ${lead.status.toLowerCase()} lead.`,
        )
      const active = db.surveys.find(
        (s) =>
          s.leadId === leadId &&
          [
            "Scheduled",
            "Pending Approval",
            "Approved",
            "Revisit Requested",
          ].includes(s.status),
      )
      if (active)
        rule(
          "SURVEY_EXISTS",
          `Survey ${active.id} is already ${active.status.toLowerCase()} for this lead. Reschedule it from the survey page.`,
        )
      if (new Date(scheduledAt).getTime() < Date.now() - 3600000)
        rule("PAST_DATE", "Survey date must be in the future.")
      const id = nextId(db, "SRV")
      db.surveys.unshift({
        id,
        leadId,
        customerId: lead.customerId,
        siteId: lead.siteId,
        surveyorId,
        scheduledAt,
        status: "Scheduled",
        photos: [],
        notes: [],
        createdAt: nowIso(),
      })
      lead.status = "Survey Scheduled"
      lead.updatedAt = nowIso()
      logActivity(
        db,
        "survey",
        id,
        lead.customerId,
        `Site survey scheduled with ${byId(db.users, surveyorId)?.name}`,
      )
      notify(db, {
        title: "Survey assigned",
        body: `${byId(db.customers, lead.customerId)?.name} — ${new Date(scheduledAt).toLocaleString("en-IN")}`,
        link: `/app/surveys/${id}`,
        roles: ["surveyor", "admin"],
      })
      return id
    },
  )
}

export function assignSurveyor(id: string, surveyorId: string) {
  return command(
    { method: "POST", path: `/surveys/${id}/assign`, body: { surveyorId } },
    (db) => {
      const s = byId(db.surveys, id) ?? notFound("Survey")
      s.surveyorId = surveyorId
      logActivity(
        db,
        "survey",
        id,
        s.customerId,
        `Surveyor changed to ${byId(db.users, surveyorId)?.name}`,
      )
    },
  )
}

export function rescheduleSurvey(id: string, scheduledAt: string) {
  return command(
    {
      method: "POST",
      path: `/surveys/${id}/reschedule`,
      body: { scheduledAt },
    },
    (db) => {
      const s = byId(db.surveys, id) ?? notFound("Survey")
      if (!["Scheduled", "Revisit Requested"].includes(s.status))
        rule(
          "INVALID_TRANSITION",
          `A ${s.status.toLowerCase()} survey cannot be rescheduled.`,
        )
      if (new Date(scheduledAt).getTime() < Date.now() - 3600000)
        rule("PAST_DATE", "Survey date must be in the future.")
      s.scheduledAt = scheduledAt
      s.status = "Scheduled"
      logActivity(
        db,
        "survey",
        id,
        s.customerId,
        `Survey rescheduled to ${new Date(scheduledAt).toLocaleString("en-IN")}`,
      )
    },
  )
}

export function saveAssessment(id: string, assessment: Assessment) {
  return command(
    { method: "PUT", path: `/surveys/${id}/assessment`, body: assessment },
    (db) => {
      const s = byId(db.surveys, id) ?? notFound("Survey")
      if (!["Scheduled", "Revisit Requested"].includes(s.status))
        rule("LOCKED", "The assessment is locked once submitted for approval.")
      s.assessment = assessment
    },
  )
}

export function addSurveyPhoto(id: string, photo: Photo) {
  return command(
    { method: "POST", path: `/surveys/${id}/photos`, body: photo },
    (db) => {
      const s = byId(db.surveys, id) ?? notFound("Survey")
      s.photos.push(photo)
    },
  )
}

export function removeSurveyPhoto(id: string, photoId: string) {
  return command(
    { method: "DELETE", path: `/surveys/${id}/photos/${photoId}` },
    (db) => {
      const s = byId(db.surveys, id) ?? notFound("Survey")
      if (!["Scheduled", "Revisit Requested"].includes(s.status))
        rule("LOCKED", "Photos are locked once the survey is submitted.")
      s.photos = s.photos.filter((p) => p.id !== photoId)
    },
  )
}

export function addSurveyNote(id: string, text: string) {
  return command(
    { method: "POST", path: `/surveys/${id}/notes`, body: { text } },
    (db) => {
      if (!text.trim()) rule("EMPTY_NOTE", "Note cannot be empty.")
      const s = byId(db.surveys, id) ?? notFound("Survey")
      s.notes.unshift({
        id: uid(),
        text: text.trim(),
        authorName: actorName(db),
        at: nowIso(),
      })
    },
  )
}

export function submitSurvey(id: string) {
  return command({ method: "POST", path: `/surveys/${id}/submit` }, (db) => {
    const s = byId(db.surveys, id) ?? notFound("Survey")
    if (!["Scheduled", "Revisit Requested"].includes(s.status))
      rule("INVALID_TRANSITION", "This survey has already been submitted.")
    if (!s.assessment)
      rule(
        "ASSESSMENT_REQUIRED",
        "Save the technical assessment before submitting.",
      )
    if (s.photos.length < 1)
      rule(
        "PHOTOS_REQUIRED",
        "Add at least one site photograph before submitting.",
      )
    s.status = "Pending Approval"
    const lead = byId(db.leads, s.leadId)
    if (lead) {
      lead.status = "Survey Completed"
      lead.roofArea = lead.roofArea ?? s.assessment.roofArea
      lead.updatedAt = nowIso()
    }
    logActivity(
      db,
      "survey",
      id,
      s.customerId,
      "Technical assessment submitted for approval",
    )
    notify(db, {
      title: "Survey awaiting approval",
      body: `${byId(db.customers, s.customerId)?.name} — ${s.assessment.recommendedCapacity} kW ${s.assessment.recommendedType}`,
      link: `/app/surveys/${id}`,
      roles: ["admin", "sales"],
    })
  })
}

export function decideSurvey(
  id: string,
  decision: "approve" | "reject" | "revisit",
  note: string,
) {
  return command(
    { method: "POST", path: `/surveys/${id}/${decision}`, body: { note } },
    (db) => {
      const s = byId(db.surveys, id) ?? notFound("Survey")
      if (s.status !== "Pending Approval")
        rule(
          "INVALID_TRANSITION",
          "Only surveys pending approval can be approved, rejected or sent for revisit.",
        )
      if (decision !== "approve" && !note.trim())
        rule("REASON_REQUIRED", "Please explain the reason.")
      s.status =
        decision === "approve"
          ? "Approved"
          : decision === "reject"
            ? "Rejected"
            : "Revisit Requested"
      s.decisionNote = note.trim() || undefined
      s.decidedAt = nowIso()
      const lead = byId(db.leads, s.leadId)
      if (lead && decision === "reject") {
        lead.status = "Lost"
        lead.lostReason = `Site not feasible: ${note.trim()}`
      }
      logActivity(
        db,
        "survey",
        id,
        s.customerId,
        decision === "approve"
          ? "Survey approved — quotation unlocked"
          : decision === "reject"
            ? `Survey rejected — ${note}`
            : `Revisit requested — ${note}`,
      )
    },
  )
}

/* =============================== Quotations =============================== */

export const effectiveQuoteStatus = (q: Quotation): Quotation["status"] =>
  (q.status === "Sent" || q.status === "Awaiting Response") &&
  new Date(q.validUntil).getTime() < Date.now()
    ? "Expired"
    : q.status

export function createQuotation(surveyId: string, packageId?: string) {
  return command(
    { method: "POST", path: "/quotations", body: { surveyId, packageId } },
    (db) => {
      const s = byId(db.surveys, surveyId) ?? notFound("Survey")
      if (s.status !== "Approved")
        rule(
          "SURVEY_NOT_APPROVED",
          "A final quotation can only be generated after the site survey is approved.",
        )
      const pkg =
        PACKAGES.find((p) => p.id === packageId) ??
        PACKAGES.find(
          (p) =>
            p.capacity === s.assessment?.recommendedCapacity &&
            p.systemType === s.assessment?.recommendedType,
        ) ??
        PACKAGES[2]
      const items = quoteItemsFor(
        pkg.capacity,
        pkg.systemType,
        db.products,
        uid,
      )
      const { labour, other } = chargesFor(
        pkg.capacity,
        pkg.systemType,
        db.settings,
      )
      const id = nextId(db, "QT")
      const lead = byId(db.leads, s.leadId)!
      db.quotations.unshift({
        id,
        leadId: s.leadId,
        customerId: s.customerId,
        siteId: s.siteId,
        surveyId,
        packageId: pkg.id,
        capacity: pkg.capacity,
        systemType: pkg.systemType,
        items,
        labour,
        otherCharges: other,
        totals: computeTotals(items, labour, other, db.settings),
        status: "Draft",
        validUntil: addDays(nowIso(), db.settings.quoteValidityDays),
        createdAt: nowIso(),
        amountSource: "demo",
      })
      logActivity(
        db,
        "quotation",
        id,
        lead.customerId,
        `Draft quotation created — ${pkg.label}`,
      )
      return id
    },
  )
}

export function updateQuotationDraft(
  id: string,
  patch: { packageId?: string; qty?: Record<string, number> },
) {
  return command(
    { method: "PATCH", path: `/quotations/${id}`, body: patch },
    (db) => {
      const q = byId(db.quotations, id) ?? notFound("Quotation")
      if (q.status !== "Draft")
        rule("LOCKED", "Only draft quotations can be edited.")
      if (patch.packageId && patch.packageId !== q.packageId) {
        const pkg =
          PACKAGES.find((p) => p.id === patch.packageId) ?? notFound("Package")
        q.packageId = pkg.id
        q.capacity = pkg.capacity
        q.systemType = pkg.systemType
        q.items = quoteItemsFor(pkg.capacity, pkg.systemType, db.products, uid)
        const c = chargesFor(pkg.capacity, pkg.systemType, db.settings)
        q.labour = c.labour
        q.otherCharges = c.other
      }
      if (patch.qty) {
        for (const item of q.items) {
          const v = patch.qty[item.id]
          if (v === undefined) continue
          if (!Number.isFinite(v) || v < 0)
            rule("INVALID_QTY", "Quantities cannot be negative.")
          const required = buildBom(q.capacity, q.systemType).find(
            (b) => b.productId === item.productId,
          )
          if (required && v < 1)
            rule(
              "BOM_INCOMPLETE",
              `${item.description} is a required component of the ${q.capacity} kW package.`,
            )
          item.qty = Math.round(v)
        }
      }
      q.totals = computeTotals(q.items, q.labour, q.otherCharges, db.settings)
      logActivity(db, "quotation", id, q.customerId, "Draft quotation saved")
    },
  )
}

export function sendQuotation(id: string) {
  return command({ method: "POST", path: `/quotations/${id}/send` }, (db) => {
    const q = byId(db.quotations, id) ?? notFound("Quotation")
    if (q.status !== "Draft")
      rule("INVALID_TRANSITION", "Only draft quotations can be sent.")
    const survey = byId(db.surveys, q.surveyId)
    if (survey?.status !== "Approved")
      rule("SURVEY_NOT_APPROVED", "The linked survey is not approved.")
    const missingCategories = [
      "Panel",
      "Inverter",
      "Structure",
      "Protection",
      "Earthing",
    ].filter((c) => !q.items.some((i) => i.category === c && i.qty > 0))
    if (missingCategories.length)
      rule(
        "BOM_INCOMPLETE",
        `Quotation is missing: ${missingCategories.join(", ")}.`,
      )
    q.status = "Sent"
    q.sentAt = nowIso()
    q.validUntil = addDays(nowIso(), db.settings.quoteValidityDays)
    const lead = byId(db.leads, q.leadId)
    if (lead && !["Won", "Lost"].includes(lead.status))
      lead.status = "Quotation Sent"
    logActivity(db, "quotation", id, q.customerId, "Quotation sent to customer")
  })
}

export function markQuotationViewed(id: string) {
  return command({ method: "POST", path: `/quotations/${id}/viewed` }, (db) => {
    const q = byId(db.quotations, id)
    if (q?.status === "Sent") q.status = "Awaiting Response"
  })
}

export function acceptQuotation(id: string) {
  return command({ method: "POST", path: `/quotations/${id}/accept` }, (db) => {
    const q = byId(db.quotations, id) ?? notFound("Quotation")
    const status = effectiveQuoteStatus(q)
    if (status === "Expired")
      rule(
        "QUOTE_EXPIRED",
        "This quotation has expired. Please request a revised quotation.",
      )
    if (!["Sent", "Awaiting Response"].includes(status))
      rule(
        "INVALID_TRANSITION",
        `A ${status.toLowerCase()} quotation cannot be accepted.`,
      )
    q.status = "Accepted"
    q.decidedAt = nowIso()
    logActivity(db, "quotation", id, q.customerId, "Quotation accepted")
    notify(db, {
      title: "Quotation accepted",
      body: `${byId(db.customers, q.customerId)?.name} accepted ${q.id}`,
      link: `/app/quotations/${id}`,
      roles: ["admin", "sales"],
    })
  })
}

export function rejectQuotation(id: string, reason: string) {
  return command(
    { method: "POST", path: `/quotations/${id}/reject`, body: { reason } },
    (db) => {
      const q = byId(db.quotations, id) ?? notFound("Quotation")
      if (!["Sent", "Awaiting Response", "Draft"].includes(q.status))
        rule(
          "INVALID_TRANSITION",
          `A ${q.status.toLowerCase()} quotation cannot be rejected.`,
        )
      if (!reason.trim()) rule("REASON_REQUIRED", "Please record a reason.")
      q.status = "Rejected"
      q.decidedAt = nowIso()
      q.rejectionReason = reason.trim()
      logActivity(
        db,
        "quotation",
        id,
        q.customerId,
        `Quotation rejected — ${reason}`,
      )
    },
  )
}

export function convertToSalesOrder(
  id: string,
  advance: Pick<Payment, "amount" | "method" | "reference">,
) {
  return command(
    { method: "POST", path: `/quotations/${id}/sales-order`, body: advance },
    (db) => {
      const q = byId(db.quotations, id) ?? notFound("Quotation")
      if (q.status !== "Accepted")
        rule(
          "NOT_ACCEPTED",
          "Only accepted quotations can be converted to a sales order.",
        )
      if (q.salesOrderId)
        rule("ALREADY_CONVERTED", `Already converted to ${q.salesOrderId}.`)
      if (!(advance.amount > 0))
        rule(
          "ADVANCE_REQUIRED",
          "Record the advance payment before creating the sales order.",
        )
      if (advance.amount > q.totals.total)
        rule("ADVANCE_TOO_HIGH", "Advance cannot exceed the quotation total.")
      if (!advance.reference.trim())
        rule(
          "REFERENCE_REQUIRED",
          "Enter the payment reference (UTR / cheque number).",
        )
      const soId = nextId(db, "SO")
      const instId = nextId(db, "INS")
      const now = nowIso()
      db.salesOrders.unshift({
        id: soId,
        quotationId: q.id,
        customerId: q.customerId,
        siteId: q.siteId,
        installationId: instId,
        total: q.totals.total,
        bom: q.items
          .map((i) => ({ productId: i.productId, qty: i.qty }))
          .filter((l) => l.qty > 0),
        status: "Confirmed",
        createdAt: now,
      })
      db.payments.unshift({
        id: nextId(db, "PAY"),
        salesOrderId: soId,
        customerId: q.customerId,
        amount: advance.amount,
        kind: "Advance",
        method: advance.method,
        reference: advance.reference.trim(),
        at: now,
      })
      db.installations.unshift({
        id: instId,
        reference: nextInstallationRef(db, now),
        salesOrderId: soId,
        customerId: q.customerId,
        siteId: q.siteId,
        capacity: q.capacity,
        systemType: q.systemType,
        status: "Awaiting Materials",
        crew: [],
        checklist: Object.fromEntries(
          CHECKLIST_ITEMS.map((c) => [c.key, false]),
        ) as Record<typeof CHECKLIST_ITEMS[number]["key"], boolean>,
        photos: [],
        verifiedSerials: [],
        timesheets: [],
        createdAt: now,
        logisticsCost: 900 + q.capacity * 150,
      })
      q.salesOrderId = soId
      const lead = byId(db.leads, q.leadId)
      if (lead) lead.status = "Won"
      logActivity(
        db,
        "order",
        soId,
        q.customerId,
        `Advance ₹${advance.amount.toLocaleString("en-IN")} recorded; sales order created`,
      )
      notify(db, {
        title: "New sales order — check stock",
        body: `${soId} · ${q.capacity} kW ${q.systemType}`,
        link: `/app/orders/${soId}`,
        roles: ["admin", "inventory"],
      })
      return soId
    },
  )
}

/* ============================== Conversations ============================= */

export function saveConversation(conv: Conversation) {
  return command(
    { method: "PUT", path: `/conversations/${conv.id}`, body: conv },
    (db) => {
      const i = db.conversations.findIndex((c) => c.id === conv.id)
      if (i >= 0) db.conversations[i] = conv
      else db.conversations.unshift(conv)
    },
  )
}

export function newConversationId() {
  return `CONV-W${Date.now().toString(36).toUpperCase()}`
}

export function requestHuman(convId: string) {
  return command(
    { method: "POST", path: `/conversations/${convId}/handoff` },
    (db) => {
      const c = byId(db.conversations, convId) ?? notFound("Conversation")
      c.status = "Needs Human"
      c.updatedAt = nowIso()
      notify(db, {
        title: "Customer requested a human",
        body: `${c.collected.name ?? "Website visitor"} is waiting in ${c.channel}`,
        link: "/app/conversations",
        roles: ["admin", "sales"],
      })
    },
  )
}

export function sendAgentMessage(convId: string, text: string) {
  return command(
    {
      method: "POST",
      path: `/conversations/${convId}/messages`,
      body: { text },
    },
    (db) => {
      if (!text.trim()) rule("EMPTY_MESSAGE", "Message cannot be empty.")
      const c = byId(db.conversations, convId) ?? notFound("Conversation")
      c.messages.push({
        id: uid(),
        from: "agent",
        text: text.trim(),
        at: nowIso(),
        authorName: actorName(db),
      })
      c.updatedAt = nowIso()
      if (c.status === "Needs Human") c.status = "Active"
    },
  )
}

export function resolveConversation(convId: string) {
  return command(
    { method: "POST", path: `/conversations/${convId}/resolve` },
    (db) => {
      const c = byId(db.conversations, convId) ?? notFound("Conversation")
      c.status = "Completed"
      c.updatedAt = nowIso()
    },
  )
}

/** Links a completed assistant conversation to a lead — updating the existing lead when the phone matches. */
export function submitAssistantEnquiry(convId: string) {
  return command(
    { method: "POST", path: `/conversations/${convId}/enquiry` },
    (db) => {
      const c = byId(db.conversations, convId) ?? notFound("Conversation")
      const f = c.collected
      if (!f.name || !f.phone || !f.city || !f.propertyType)
        rule(
          "INCOMPLETE",
          "Name, phone, location and property type are required to submit.",
        )
      const phone = normalizePhone(f.phone)
      let customer = db.customers.find((x) => normalizePhone(x.phone) === phone)
      const now = nowIso()
      let lead = customer
        ? db.leads.find(
            (l) =>
              l.customerId === customer!.id &&
              !["Won", "Lost"].includes(l.status),
          )
        : undefined
      let updated = false
      if (!customer) {
        customer = {
          id: nextId(db, "CUS"),
          name: f.name,
          phone,
          language: f.language ?? "English",
          contactMethod: "WhatsApp",
          createdAt: now,
        }
        db.customers.push(customer)
      } else {
        customer.language = f.language ?? customer.language
      }
      if (lead) {
        updated = true
        lead.monthlyBill = lead.monthlyBill ?? f.monthlyBill
        lead.roofArea = lead.roofArea ?? f.roofArea ?? undefined
        lead.preferredCapacity =
          lead.preferredCapacity ?? f.capacity ?? undefined
        lead.systemType = lead.systemType ?? f.systemType
        lead.updatedAt = now
      } else {
        const site = {
          id: nextId(db, "SITE"),
          customerId: customer.id,
          propertyType: f.propertyType,
          address: "",
          city: f.city,
          state: "Maharashtra",
          pin: "",
        }
        db.sites.push(site)
        lead = {
          id: nextId(db, "LD"),
          customerId: customer.id,
          siteId: site.id,
          source: "AI Assistant",
          status: "New",
          monthlyBill: f.monthlyBill,
          roofArea: f.roofArea ?? undefined,
          preferredCapacity: f.capacity ?? undefined,
          systemType: f.systemType,
          createdAt: now,
          updatedAt: now,
          notes: [],
        }
        db.leads.unshift(lead)
      }
      lead.aiSummary = summarizeLead(
        lead,
        customer,
        byId(db.sites, lead.siteId),
      )
      c.customerId = customer.id
      c.leadId = lead.id
      c.status = "Completed"
      c.updatedAt = now
      logActivity(
        db,
        "conversation",
        c.id,
        customer.id,
        updated
          ? "Assistant collected missing enquiry details"
          : "Enquiry created by the website assistant",
      )
      notify(db, {
        title: updated ? "Lead updated by assistant" : "New assistant enquiry",
        body: `${customer.name} — ${f.city}`,
        link: `/app/leads/${lead.id}`,
        roles: ["admin", "sales"],
      })
      return { leadId: lead.id, updated }
    },
  )
}
