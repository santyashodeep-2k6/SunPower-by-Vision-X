import type {
  BOMLine,
  Product,
  ProductCategory,
  QuotationItem,
  QuotationTotals,
  Settings,
  Supplier,
  SystemType,
} from "./types"

export const PANEL_WATT = 540
export const CAPACITIES = [1, 2, 3, 4, 5] as const
export const SYSTEM_TYPES: SystemType[] = ["On-Grid", "Off-Grid"]

export const DEFAULT_SETTINGS: Settings = {
  labourPerKw: 4500,
  netMeteringFee: 3500,
  transportFee: 1500,
  equipmentTaxPct: 5,
  serviceTaxPct: 18,
  advancePct: 30,
  quoteValidityDays: 15,
  technicianHourlyCost: 350,
  serviceLabourRate: 600,
}

export const SUPPLIERS: Supplier[] = [
  {
    id: "SUP-01",
    name: "Deccan PV Modules Pvt Ltd",
    city: "Pune",
    contact: "Nitin Bhosale",
    phone: "9822012345",
    categories: ["Panel"],
    leadTimeDays: 7,
  },
  {
    id: "SUP-02",
    name: "Sahyadri Power Electronics",
    city: "Mumbai",
    contact: "Farah Khan",
    phone: "9820456789",
    categories: ["Inverter", "Battery"],
    leadTimeDays: 10,
  },
  {
    id: "SUP-03",
    name: "Western Electricals & Cables",
    city: "Pune",
    contact: "Ganesh Kale",
    phone: "9890123456",
    categories: ["Cable", "Connector", "Protection", "Earthing"],
    leadTimeDays: 4,
  },
  {
    id: "SUP-04",
    name: "Maratha Steel Structures",
    city: "Chakan",
    contact: "Sunil Jagtap",
    phone: "9767001122",
    categories: ["Structure"],
    leadTimeDays: 5,
  },
]

type ProductSeed = Omit<Product, "onHand"> & { onHand?: number }

const inverterCost = (kw: number, type: SystemType) =>
  type === "On-Grid" ? 9000 + kw * 4500 : 14000 + kw * 6500
const round100 = (n: number) => Math.round(n / 100) * 100

export const inverterId = (kw: number, type: SystemType) =>
  `INV-${type === "On-Grid" ? "OG" : "OFF"}-${kw}K`

export function buildProducts(): Product[] {
  const list: ProductSeed[] = [
    {
      id: "PNL-540",
      name: "Mono PERC 540 Wp Solar Panel",
      category: "Panel",
      unit: "pcs",
      serialized: true,
      serialPrefix: "PN540",
      unitCost: 11200,
      unitPrice: 13800,
      reorderLevel: 30,
      warrantyMonths: 300,
      warrantyTerms: "12-year product, 25-year linear performance warranty",
      supplierId: "SUP-01",
    },
  ]
  for (const type of ["On-Grid", "Off-Grid"] as SystemType[]) {
    for (const kw of CAPACITIES) {
      const cost = inverterCost(kw, type)
      list.push({
        id: inverterId(kw, type),
        name:
          type === "On-Grid"
            ? `${kw} kW On-Grid String Inverter`
            : `${kw} kW Off-Grid Hybrid PCU`,
        category: "Inverter",
        unit: "pcs",
        serialized: true,
        serialPrefix: `${type === "On-Grid" ? "OG" : "HY"}${kw}K`,
        unitCost: cost,
        unitPrice: round100(cost * 1.25),
        reorderLevel: 2,
        warrantyMonths: 60,
        warrantyTerms: "5-year manufacturer warranty, repair or replacement",
        supplierId: "SUP-02",
      })
    }
  }
  list.push(
    {
      id: "BAT-150",
      name: "150 Ah C10 Tubular Battery",
      category: "Battery",
      unit: "pcs",
      serialized: true,
      serialPrefix: "BT150",
      unitCost: 11500,
      unitPrice: 14200,
      reorderLevel: 8,
      warrantyMonths: 36,
      warrantyTerms: "36-month warranty (24 months free replacement)",
      supplierId: "SUP-02",
    },
    {
      id: "MNT-GI",
      name: "Hot-dip GI Mounting Structure",
      category: "Structure",
      unit: "kW set",
      serialized: false,
      unitCost: 4200,
      unitPrice: 5500,
      reorderLevel: 10,
      warrantyMonths: 120,
      warrantyTerms: "10-year structural warranty",
      supplierId: "SUP-04",
    },
    {
      id: "CBL-DC4",
      name: "DC Solar Cable 4 sq mm",
      category: "Cable",
      unit: "m",
      serialized: false,
      unitCost: 55,
      unitPrice: 75,
      reorderLevel: 300,
      warrantyMonths: 0,
      warrantyTerms: "—",
      supplierId: "SUP-03",
    },
    {
      id: "CBL-AC6",
      name: "AC Copper Cable 6 sq mm",
      category: "Cable",
      unit: "m",
      serialized: false,
      unitCost: 70,
      unitPrice: 95,
      reorderLevel: 200,
      warrantyMonths: 0,
      warrantyTerms: "—",
      supplierId: "SUP-03",
    },
    {
      id: "CON-MC4",
      name: "MC4 Connector Pair",
      category: "Connector",
      unit: "pair",
      serialized: false,
      unitCost: 90,
      unitPrice: 140,
      reorderLevel: 40,
      warrantyMonths: 0,
      warrantyTerms: "—",
      supplierId: "SUP-03",
    },
    {
      id: "PRT-ACDB",
      name: "ACDB with SPD & MCB",
      category: "Protection",
      unit: "pcs",
      serialized: false,
      unitCost: 2600,
      unitPrice: 3600,
      reorderLevel: 5,
      warrantyMonths: 12,
      warrantyTerms: "1-year warranty",
      supplierId: "SUP-03",
    },
    {
      id: "PRT-DCDB",
      name: "DCDB with SPD & Fuse",
      category: "Protection",
      unit: "pcs",
      serialized: false,
      unitCost: 2900,
      unitPrice: 3900,
      reorderLevel: 5,
      warrantyMonths: 12,
      warrantyTerms: "1-year warranty",
      supplierId: "SUP-03",
    },
    {
      id: "PRT-LA",
      name: "Lightning Arrester",
      category: "Protection",
      unit: "pcs",
      serialized: false,
      unitCost: 1800,
      unitPrice: 2600,
      reorderLevel: 5,
      warrantyMonths: 12,
      warrantyTerms: "1-year warranty",
      supplierId: "SUP-03",
    },
    {
      id: "ERT-KIT",
      name: "Chemical Earthing Kit",
      category: "Earthing",
      unit: "set",
      serialized: false,
      unitCost: 2100,
      unitPrice: 2900,
      reorderLevel: 9,
      warrantyMonths: 0,
      warrantyTerms: "—",
      supplierId: "SUP-03",
    },
  )
  return list.map((p) => ({ ...p, onHand: p.onHand ?? 0 }))
}

export interface SolarPackage {
  id: string
  capacity: number
  systemType: SystemType
  label: string
}

export const PACKAGES: SolarPackage[] = SYSTEM_TYPES.flatMap((t) =>
  CAPACITIES.map((kw) => ({
    id: `PKG-${kw}-${t === "On-Grid" ? "ON" : "OFF"}`,
    capacity: kw,
    systemType: t,
    label: `${kw} kW ${t}`,
  })),
)

export const packageFor = (capacity: number, type: SystemType) =>
  PACKAGES.find((p) => p.capacity === capacity && p.systemType === type) ??
  PACKAGES[2]

export const panelCount = (kw: number) => Math.ceil((kw * 1000) / PANEL_WATT)

/** Configured bill of materials for a standard package. */
export function buildBom(kw: number, type: SystemType): BOMLine[] {
  const panels = panelCount(kw)
  const lines: BOMLine[] = [
    { productId: "PNL-540", qty: panels },
    { productId: inverterId(kw, type), qty: 1 },
  ]
  if (type === "Off-Grid") lines.push({ productId: "BAT-150", qty: kw * 2 })
  lines.push(
    { productId: "MNT-GI", qty: kw },
    { productId: "CBL-DC4", qty: 20 + 10 * kw },
    { productId: "CBL-AC6", qty: 15 + 5 * kw },
    { productId: "CON-MC4", qty: Math.ceil(panels / 2) + 2 },
    { productId: "PRT-ACDB", qty: 1 },
    { productId: "PRT-DCDB", qty: 1 },
    { productId: "ERT-KIT", qty: 3 },
    { productId: "PRT-LA", qty: 1 },
  )
  return lines
}

export const CATEGORY_ORDER: (ProductCategory | "Service")[] = [
  "Panel",
  "Inverter",
  "Battery",
  "Structure",
  "Cable",
  "Connector",
  "Protection",
  "Earthing",
  "Service",
]

export function quoteItemsFor(
  kw: number,
  type: SystemType,
  products: Product[],
  newId: () => string,
): QuotationItem[] {
  return buildBom(kw, type).map((l) => {
    const p = products.find((x) => x.id === l.productId)!
    return {
      id: newId(),
      productId: p.id,
      description: p.name,
      category: p.category,
      qty: l.qty,
      unit: p.unit,
      unitPrice: p.unitPrice,
    }
  })
}

export const chargesFor = (kw: number, type: SystemType, s: Settings) => ({
  labour: s.labourPerKw * kw,
  other: s.transportFee + (type === "On-Grid" ? s.netMeteringFee : 0),
})

/** Sample calculation used in demo mode. Real amounts must come from the backend. */
export function computeTotals(
  items: QuotationItem[],
  labour: number,
  other: number,
  s: Settings,
): QuotationTotals {
  const equipment = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
  const equipmentTax = Math.round((equipment * s.equipmentTaxPct) / 100)
  const serviceTax = Math.round(((labour + other) * s.serviceTaxPct) / 100)
  const total = equipment + labour + other + equipmentTax + serviceTax
  const advance = Math.round((total * s.advancePct) / 100 / 100) * 100
  return {
    equipment,
    labour,
    other,
    equipmentTax,
    serviceTax,
    total,
    advance,
    balance: total - advance,
  }
}

/** Rough sizing heuristic used by the demo assistant and lead summaries. */
export function recommendCapacity(
  monthlyBill?: number,
  roofArea?: number | null,
) {
  // ~₹8/unit, ~120 units per kW per month in Maharashtra (sample assumption)
  let kw = monthlyBill ? Math.round(monthlyBill / 8 / 120) : 3
  if (roofArea) kw = Math.min(kw, Math.floor(roofArea / 100))
  return Math.min(5, Math.max(1, kw))
}

/** Estimated monthly savings, sample assumption for marketing pages. */
export const estimatedSavings = (kw: number) => kw * 120 * 8
