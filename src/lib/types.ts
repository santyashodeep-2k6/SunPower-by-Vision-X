/*
  Shared SunFlow 360 domain model. Every module references records through
  the same identifiers (customerId, siteId, installationId, serial,
  salesOrderId, warrantyId, serviceTicketId) so a single installation is
  recognisable from enquiry through to profitability.
*/

export type ID = string
export type ISODate = string

export type Role = "admin" | "sales" | "surveyor" | "inventory" | "installer" | "service" | "customer"

export interface User {
  id: ID
  name: string
  role: Exclude<Role, "customer">
  title: string
  phone: string
  email: string
  active: boolean
}

export interface Customer {
  id: ID
  name: string
  phone: string
  email?: string
  language: string
  contactMethod: "Phone" | "WhatsApp" | "Email"
  createdAt: ISODate
}

export type PropertyType = "Residential" | "Commercial" | "Industrial"
export type SystemType = "On-Grid" | "Off-Grid"

export interface Site {
  id: ID
  customerId: ID
  propertyType: PropertyType
  address: string
  city: string
  state: string
  pin: string
}

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Survey Scheduled" | "Survey Completed" | "Quotation Sent" | "Won" | "Lost"

export type LeadSource = "Website" | "WhatsApp" | "Phone" | "Referral" | "AI Assistant" | "Walk-in"

export interface Note {
  id: ID
  text: string
  authorId?: ID
  authorName: string
  at: ISODate
}

export interface AISummary {
  generatedAt: ISODate
  score: number
  summary: string
  recommendedCapacity: number
  recommendedType: SystemType
  missing: string[]
  /** Demo summaries are rule-based; a real model response would set 'model'. */
  engine: "demo-rules" | "model"
}

export interface Lead {
  id: ID
  customerId: ID
  siteId: ID
  source: LeadSource
  status: LeadStatus
  monthlyBill?: number
  roofArea?: number
  preferredCapacity?: number
  systemType?: SystemType
  requirements?: string
  assignedTo?: ID
  followUpAt?: ISODate
  lostReason?: string
  createdAt: ISODate
  updatedAt: ISODate
  notes: Note[]
  aiSummary?: AISummary
}

export interface ChatMessage {
  id: ID
  from: "customer" | "assistant" | "agent"
  text: string
  at: ISODate
  authorName?: string
}

export interface AssistantFields {
  name: string
  phone: string
  language: string
  propertyType: PropertyType
  city: string
  monthlyBill: number
  roofArea: number | null
  capacity: number | null
  systemType: SystemType
}

export interface Conversation {
  id: ID
  channel: "Web Assistant" | "WhatsApp" | "Phone"
  customerId?: ID
  leadId?: ID
  language: string
  status: "Active" | "Needs Human" | "Completed"
  collected: Partial<AssistantFields>
  messages: ChatMessage[]
  startedAt: ISODate
  updatedAt: ISODate
}

export type SurveyStatus = "Scheduled" | "Pending Approval" | "Approved" | "Rejected" | "Revisit Requested"

export interface Assessment {
  roofArea: number
  orientation: "South" | "South-East" | "South-West" | "East" | "West" | "Flat"
  tilt: number
  shading: "None" | "Minimal" | "Partial" | "Heavy"
  roofStructure: "RCC" | "Metal Sheet" | "Asbestos" | "Tiled"
  electricalSetup: "Single Phase" | "Three Phase"
  cableDistance: number
  recommendedCapacity: number
  recommendedType: SystemType
}

export interface Photo {
  id: ID
  url: string
  caption: string
  at: ISODate
}

export interface Survey {
  id: ID
  leadId: ID
  customerId: ID
  siteId: ID
  surveyorId?: ID
  scheduledAt: ISODate
  status: SurveyStatus
  assessment?: Assessment
  photos: Photo[]
  notes: Note[]
  decisionNote?: string
  decidedAt?: ISODate
  createdAt: ISODate
}

export type QuotationStatus = "Draft" | "Sent" | "Awaiting Response" | "Accepted" | "Rejected" | "Expired"

export interface QuotationItem {
  id: ID
  productId: ID
  description: string
  category: ProductCategory | "Service"
  qty: number
  unit: string
  unitPrice: number
}

export interface QuotationTotals {
  equipment: number
  labour: number
  other: number
  equipmentTax: number
  serviceTax: number
  total: number
  advance: number
  balance: number
}

export interface Quotation {
  id: ID
  leadId: ID
  customerId: ID
  siteId: ID
  surveyId: ID
  packageId: ID
  capacity: number
  systemType: SystemType
  items: QuotationItem[]
  labour: number
  otherCharges: number
  totals: QuotationTotals
  status: QuotationStatus
  validUntil: ISODate
  createdAt: ISODate
  sentAt?: ISODate
  decidedAt?: ISODate
  rejectionReason?: string
  salesOrderId?: ID
  /** 'demo' amounts are labelled sample calculations; 'backend' amounts come from the API. */
  amountSource: "demo" | "backend"
}

export interface BOMLine {
  productId: ID
  qty: number
}

export type SalesOrderStatus = "Confirmed" | "Awaiting Stock" | "Stock Reserved" | "Dispatched" | "Delivered" | "Installed" | "Closed"

export interface SalesOrder {
  id: ID
  quotationId: ID
  customerId: ID
  siteId: ID
  installationId: ID
  total: number
  bom: BOMLine[]
  status: SalesOrderStatus
  createdAt: ISODate
}

export interface Payment {
  id: ID
  salesOrderId?: ID
  serviceTicketId?: ID
  customerId: ID
  amount: number
  kind: "Advance" | "Balance" | "Service"
  method: "UPI" | "Bank Transfer" | "Cheque" | "Cash" | "Card"
  reference: string
  at: ISODate
}

export type ProductCategory = "Panel" | "Inverter" | "Battery" | "Structure" | "Cable" | "Connector" | "Protection" | "Earthing"

export interface Product {
  id: ID
  name: string
  category: ProductCategory
  unit: string
  serialized: boolean
  serialPrefix?: string
  unitCost: number
  unitPrice: number
  reorderLevel: number
  warrantyMonths: number
  warrantyTerms: string
  supplierId: ID
  /** Quantity on hand for non-serialized items. Serialized stock is derived from units. */
  onHand: number
}

export type UnitStatus = "In Stock" | "Dispatched" | "Installed" | "Replaced" | "Faulty Returned"

export interface InventoryUnit {
  serial: string
  productId: ID
  status: UnitStatus
  receivedAt: ISODate
  purchaseOrderId?: ID
  salesOrderId?: ID
  dispatchId?: ID
  installationId?: ID
}

export interface Reservation {
  id: ID
  salesOrderId: ID
  productId: ID
  qty: number
}

export interface StockMovement {
  id: ID
  productId: ID
  qty: number
  type: "Received" | "Reserved" | "Released" | "Dispatched" | "Adjustment" | "Replacement Issued" | "Faulty Returned"
  reference: string
  serial?: string
  at: ISODate
}

export interface Supplier {
  id: ID
  name: string
  city: string
  contact: string
  phone: string
  categories: ProductCategory[]
  leadTimeDays: number
}

export type PurchaseStatus = "Requested" | "Ordered" | "Partially Received" | "Received" | "Cancelled"

export interface PurchaseOrder {
  id: ID
  supplierId: ID
  status: PurchaseStatus
  lines: { productId: ID; qty: number; received: number; unitCost: number }[]
  reason: string
  salesOrderId?: ID
  createdAt: ISODate
  expectedAt?: ISODate
}

export type DispatchStatus = "Draft" | "Dispatched" | "Delivered"

export interface DispatchLine {
  productId: ID
  qty: number
  serials: string[]
}

export interface Dispatch {
  id: ID
  salesOrderId: ID
  installationId: ID
  status: DispatchStatus
  lines: DispatchLine[]
  vehicle: string
  driver: string
  createdAt: ISODate
  dispatchedAt?: ISODate
  deliveredAt?: ISODate
  receivedBy?: string
}

export const CHECKLIST_ITEMS = [
  { key: "structure", label: "Structure installation" },
  { key: "panels", label: "Panel installation" },
  { key: "inverter", label: "Inverter installation" },
  { key: "wiring", label: "Wiring completed" },
  { key: "earthing", label: "Earthing completed" },
  { key: "safety", label: "Electrical safety checks" },
  { key: "generation", label: "Generation test" },
  { key: "serials", label: "Equipment serial verification" },
  { key: "photos", label: "Photographs" },
  { key: "signature", label: "Customer signature" },
] as const

export type ChecklistKey = typeof CHECKLIST_ITEMS[number]["key"]

export interface TestResults {
  generationKw: number
  dcVoltage: number
  acVoltage: number
  insulationMOhm: number
  earthingOhm: number
  recordedAt: ISODate
}

export interface Timesheet {
  id: ID
  technicianId: ID
  start: ISODate
  end?: ISODate
}

export interface TechnicianAssignment {
  technicianId: ID
  role: "Lead" | "Crew"
}

export interface Commissioning {
  commissionedAt: ISODate
  generationKw: number
  handoverBy: ID
}

export type InstallationStatus = "Awaiting Materials" | "Ready to Schedule" | "Scheduled" | "In Progress" | "Paused" | "Completed"

export interface Installation {
  id: ID
  /** Public-facing asset reference, e.g. SOL-2026-0001. */
  reference: string
  salesOrderId: ID
  customerId: ID
  siteId: ID
  capacity: number
  systemType: SystemType
  status: InstallationStatus
  scheduledAt?: ISODate
  expectedCompletion?: ISODate
  crew: TechnicianAssignment[]
  checklist: Record<ChecklistKey, boolean>
  photos: Photo[]
  tests?: TestResults
  verifiedSerials: string[]
  timesheets: Timesheet[]
  signature?: { name: string; dataUrl: string; at: ISODate }
  commissioning?: Commissioning
  completedAt?: ISODate
  createdAt: ISODate
  logisticsCost: number
}

export interface Warranty {
  id: ID
  serial: string
  productId: ID | "WORKMANSHIP"
  installationId: ID
  customerId: ID
  start: ISODate
  end: ISODate
  terms: string
  /** Set when a unit is replaced: the warranty moves to the replacement serial. */
  supersededBy?: ID
}

export type TicketStatus = "Open" | "Assigned" | "Diagnosed" | "Awaiting Approval" | "In Repair" | "Awaiting Confirmation" | "Closed"

export type Priority = "Low" | "Medium" | "High" | "Critical"

export interface Repair {
  action: "Repaired" | "Replaced" | "Adjusted"
  notes: string
  originalSerial?: string
  replacementSerial?: string
  at: ISODate
}

export interface ServiceTicket {
  id: ID
  customerId: ID
  installationId: ID
  serial?: string
  warrantyId?: ID
  issue: string
  priority: Priority
  status: TicketStatus
  assignedTo?: ID
  photos: Photo[]
  diagnosis?: string
  coverage?: "Covered" | "Chargeable"
  estimate?: { amount: number; approved?: boolean; decidedAt?: ISODate }
  repair?: Repair
  parts: { productId: ID; qty: number; unitCost: number }[]
  labourHours: number
  customerCharge: number
  customerConfirmedAt?: ISODate
  createdAt: ISODate
  closedAt?: ISODate
  raisedBy: "customer" | "staff"
  log: Note[]
}

export interface Replacement {
  id: ID
  originalSerial: string
  replacementSerial: string
  productId: ID
  installationId: ID
  serviceTicketId: ID
  at: ISODate
}

export interface SubsidyTracking {
  id: ID
  installationId: ID
  customerId: ID
  scheme: string
  status: "Not Applied" | "Applied" | "Inspection" | "Approved" | "Disbursed"
  amount: number
  updatedAt: ISODate
}

export interface Activity {
  id: ID
  entityType: "lead" | "survey" | "quotation" | "order" | "dispatch" | "installation" | "ticket" | "purchase" | "inventory" | "conversation"
  entityId: ID
  customerId?: ID
  text: string
  actor: string
  at: ISODate
}

export interface AppNotification {
  id: ID
  title: string
  body: string
  link: string
  roles: Role[]
  at: ISODate
  read: boolean
}

export interface Settings {
  labourPerKw: number
  netMeteringFee: number
  transportFee: number
  equipmentTaxPct: number
  serviceTaxPct: number
  advancePct: number
  quoteValidityDays: number
  technicianHourlyCost: number
  serviceLabourRate: number
}

export interface DemoDB {
  version: number
  counters: Record<string, number>
  settings: Settings
  users: User[]
  customers: Customer[]
  sites: Site[]
  leads: Lead[]
  conversations: Conversation[]
  surveys: Survey[]
  quotations: Quotation[]
  salesOrders: SalesOrder[]
  payments: Payment[]
  products: Product[]
  units: InventoryUnit[]
  reservations: Reservation[]
  movements: StockMovement[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  dispatches: Dispatch[]
  installations: Installation[]
  warranties: Warranty[]
  serviceTickets: ServiceTicket[]
  replacements: Replacement[]
  subsidies: SubsidyTracking[]
  activities: Activity[]
  notifications: AppNotification[]
}

export interface DashboardMetrics {
  revenueInvoiced: number
  collected: number
  outstanding: number
  recordedCosts: number
  contribution: number
  completedInstallations: number
  pendingInstallations: number
  openTickets: number
  inventoryValue: number
}

export interface Session {
  role: Role
  userId?: ID
  customerId?: ID
}
