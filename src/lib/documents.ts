import type { DemoDB, Installation, Quotation, SalesOrder } from "./types"
import { CHECKLIST_ITEMS } from "./types"
import { fmtDate, fmtDateTime, inr } from "./format"
import { byId, paidForOrder, productName, warrantyState } from "./rules"
import { isDemoMode } from "@/services/apiClient"

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  )

function shell(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  *{box-sizing:border-box} body{font-family:Geist,system-ui,-apple-system,sans-serif;color:#18352A;margin:0;padding:40px;font-size:13px;line-height:1.5;background:#fff}
  h1{font-size:22px;margin:0;letter-spacing:-.02em} h2{font-size:14px;margin:28px 0 10px;text-transform:uppercase;letter-spacing:.08em;color:#217A50}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #103D2D;padding-bottom:16px}
  .brand{font-weight:700;font-size:18px;color:#103D2D}.brand span{font-weight:300;color:#708078}
  .muted{color:#708078} table{width:100%;border-collapse:collapse;margin-top:6px} th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #E3EAE2;vertical-align:top}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#708078;background:#F3F7F2} td.r,th.r{text-align:right}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px} .tot td{border:none;padding:4px 8px} .tot .big td{font-size:16px;font-weight:700;border-top:2px solid #103D2D;padding-top:8px}
  .demo{background:#FFF0BE;border:1px solid #F4C542;color:#6E4E00;padding:8px 12px;border-radius:10px;margin:16px 0;font-size:12px}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#E6F5EC;color:#17673F;font-size:11px;font-weight:600}
  .photos{display:flex;gap:8px;flex-wrap:wrap}.photos img{width:160px;height:110px;object-fit:cover;border-radius:8px}
  footer{margin-top:36px;padding-top:12px;border-top:1px solid #E3EAE2;font-size:11px;color:#708078}
  @media print{body{padding:16px}}
  </style></head><body>${body}<footer>SunFlow 360 Solar Pvt. Ltd. (sample) · Pune, Maharashtra · support@sunflow360.in · Generated ${esc(fmtDateTime(new Date().toISOString()))}</footer></body></html>`
}

const demoNote = (what: string) =>
  isDemoMode
    ? `<div class="demo">Demo document — ${esc(what)} Amounts use labelled sample rates until the finance backend supplies official figures.</div>`
    : ""

function partyBlock(db: DemoDB, customerId: string, siteId: string) {
  const c = byId(db.customers, customerId)
  const s = byId(db.sites, siteId)
  return `<div class="grid"><div><div class="muted">Customer</div><strong>${esc(c?.name)}</strong><br>${esc(c?.phone)}${
    c?.email ? `<br>${esc(c.email)}` : ""
  }</div><div><div class="muted">Site</div>${esc(s?.address || "—")}<br>${esc(s?.city)}, ${esc(s?.state)} ${esc(s?.pin)}<br>${esc(s?.propertyType)}</div></div>`
}

export function quotationHtml(db: DemoDB, q: Quotation) {
  const rows = q.items
    .filter((i) => i.qty > 0)
    .map(
      (i) =>
        `<tr><td>${esc(i.description)}<div class="muted">${esc(i.category)}</div></td><td class="r">${i.qty} ${esc(i.unit)}</td><td class="r">${inr(i.unitPrice)}</td><td class="r">${inr(i.qty * i.unitPrice)}</td></tr>`,
    )
    .join("")
  const t = q.totals
  return shell(
    `Quotation ${q.id}`,
    `<div class="head"><div><div class="brand">SunFlow <span>360</span></div><div class="muted">Rooftop Solar Quotation</div></div><div style="text-align:right"><h1>${esc(q.id)}</h1><div class="muted">Issued ${fmtDate(q.sentAt ?? q.createdAt)} · Valid until ${fmtDate(q.validUntil)}</div><div class="pill">${esc(q.status)}</div></div></div>
    ${demoNote("quotation generated from the configured BOM.")}
    ${partyBlock(db, q.customerId, q.siteId)}
    <h2>${q.capacity} kW ${esc(q.systemType)} system — bill of materials</h2>
    <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Line total</th></tr></thead><tbody>${rows}
    <tr><td>Installation service<div class="muted">Service</div></td><td class="r">${q.capacity} kW</td><td class="r">${inr(q.labour / q.capacity)}</td><td class="r">${inr(q.labour)}</td></tr>
    <tr><td>Transport${
      q.systemType === "On-Grid" ? ", net-metering &amp; documentation" : ""
    }<div class="muted">Other charges</div></td><td class="r">1</td><td class="r">${inr(q.otherCharges)}</td><td class="r">${inr(q.otherCharges)}</td></tr></tbody></table>
    <table class="tot" style="width:320px;margin-left:auto;margin-top:12px">
    <tr><td>Equipment</td><td class="r">${inr(t.equipment)}</td></tr><tr><td>Labour</td><td class="r">${inr(t.labour)}</td></tr><tr><td>Other charges</td><td class="r">${inr(t.other)}</td></tr>
    <tr><td>GST on equipment (${db.settings.equipmentTaxPct}% sample)</td><td class="r">${inr(t.equipmentTax)}</td></tr><tr><td>GST on services (${db.settings.serviceTaxPct}% sample)</td><td class="r">${inr(t.serviceTax)}</td></tr>
    <tr class="big"><td>Final amount</td><td class="r">${inr(t.total)}</td></tr><tr><td>Advance (${db.settings.advancePct}%)</td><td class="r">${inr(t.advance)}</td></tr><tr><td>Balance on completion</td><td class="r">${inr(t.balance)}</td></tr></table>
    <h2>Terms</h2><p class="muted">Quotation is valid until ${fmtDate(q.validUntil)}. Final design is based on approved site survey ${esc(q.surveyId)}. Subsidy eligibility, where applicable, is subject to scheme approval and is not deducted above.</p>`,
  )
}

export function invoiceHtml(db: DemoDB, so: SalesOrder) {
  const q = byId(db.quotations, so.quotationId)
  const pays = db.payments.filter((p) => p.salesOrderId === so.id)
  const paid = paidForOrder(db, so.id)
  return shell(
    `Invoice ${so.id}`,
    `<div class="head"><div><div class="brand">SunFlow <span>360</span></div><div class="muted">Invoice (demo)</div></div><div style="text-align:right"><h1>INV-${esc(so.id.replace("SO-", ""))}</h1><div class="muted">Sales order ${esc(so.id)} · ${fmtDate(so.createdAt)}</div></div></div>
    ${demoNote("not a legal tax invoice.")}
    ${partyBlock(db, so.customerId, so.siteId)}
    <h2>Summary</h2><table><tbody><tr><td>${
      q
        ? `${q.capacity} kW ${esc(q.systemType)} rooftop solar system (as per ${esc(q.id)})`
        : "Solar system"
    }</td><td class="r">${inr(so.total)}</td></tr></tbody></table>
    <h2>Payments</h2><table><thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${pays.map((p) => `<tr><td>${fmtDate(p.at)}</td><td>${esc(p.kind)}</td><td>${esc(p.method)}</td><td>${esc(p.reference)}</td><td class="r">${inr(p.amount)}</td></tr>`).join("") || '<tr><td colspan="5" class="muted">No payments yet</td></tr>'}</tbody></table>
    <table class="tot" style="width:300px;margin-left:auto;margin-top:12px"><tr><td>Invoiced</td><td class="r">${inr(so.total)}</td></tr><tr><td>Collected</td><td class="r">${inr(paid)}</td></tr><tr class="big"><td>Outstanding</td><td class="r">${inr(Math.max(0, so.total - paid))}</td></tr></table>`,
  )
}

export function handoverHtml(db: DemoDB, inst: Installation) {
  const d = db.dispatches.find(
    (x) => x.installationId === inst.id && x.status !== "Draft",
  )
  const lead = inst.crew.find((c) => c.role === "Lead")
  const ws = db.warranties.filter(
    (w) => w.installationId === inst.id && !w.supersededBy,
  )
  return shell(
    `Handover report ${inst.reference}`,
    `<div class="head"><div><div class="brand">SunFlow <span>360</span></div><div class="muted">Installation handover report</div></div><div style="text-align:right"><h1>${esc(inst.reference)}</h1><div class="muted">${inst.capacity} kW ${esc(inst.systemType)} · ${esc(inst.status)}${
      inst.completedAt ? ` · ${fmtDate(inst.completedAt)}` : ""
    }</div></div></div>
    ${demoNote("generated from captured installation evidence.")}
    ${partyBlock(db, inst.customerId, inst.siteId)}
    <h2>Crew</h2><p>${inst.crew.map((c) => `${esc(byId(db.users, c.technicianId)?.name)} (${c.role})`).join(", ") || "—"}</p>
    <h2>Equipment & serial numbers</h2><table><thead><tr><th>Product</th><th>Serial</th><th>Verified</th></tr></thead><tbody>${(d?.lines ?? []).flatMap((l) => l.serials.map((s) => `<tr><td>${esc(productName(db, l.productId))}</td><td style="font-family:monospace">${esc(s)}</td><td>${inst.verifiedSerials.includes(s) ? "✓" : "—"}</td></tr>`)).join("") || '<tr><td colspan="3" class="muted">No serialized equipment dispatched</td></tr>'}</tbody></table>
    <h2>Checklist</h2><table><tbody>${CHECKLIST_ITEMS.map((c) => `<tr><td>${esc(c.label)}</td><td class="r">${inst.checklist[c.key] ? "✓ Done" : "— Pending"}</td></tr>`).join("")}</tbody></table>
    <h2>Test results</h2>${
      inst.tests
        ? `<table><tbody><tr><td>Generation at handover</td><td class="r">${inst.tests.generationKw} kW</td></tr><tr><td>DC string voltage</td><td class="r">${inst.tests.dcVoltage} V</td></tr><tr><td>AC output voltage</td><td class="r">${inst.tests.acVoltage} V</td></tr><tr><td>Insulation resistance</td><td class="r">${inst.tests.insulationMOhm} MΩ</td></tr><tr><td>Earthing resistance</td><td class="r">${inst.tests.earthingOhm} Ω</td></tr></tbody></table>`
        : '<p class="muted">Not recorded</p>'
    }
    <h2>Warranties</h2><table><thead><tr><th>Item</th><th>Serial</th><th>Expiry</th><th>Status</th></tr></thead><tbody>${ws.map((w) => `<tr><td>${esc(productName(db, w.productId))}</td><td style="font-family:monospace">${esc(w.serial)}</td><td>${fmtDate(w.end)}</td><td>${warrantyState(w)}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">Warranties activate on completion</td></tr>'}</tbody></table>
    <h2>Photographs</h2><div class="photos">${inst.photos.map((p) => `<img src="${esc(p.url)}" alt="${esc(p.caption)}">`).join("") || '<span class="muted">None</span>'}</div>
    <h2>Customer acceptance</h2>${
      inst.signature
        ? `<img src="${esc(inst.signature.dataUrl)}" style="height:70px"><p>${esc(inst.signature.name)} · ${fmtDateTime(inst.signature.at)}</p>`
        : '<p class="muted">Pending</p>'
    }
    <p class="muted">Handover by ${esc(byId(db.users, lead?.technicianId)?.name ?? "—")}</p>`,
  )
}
