import { useDb } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { CustomerPhasePriorityCard } from "@/components/special/CustomerPhasePriorityCard"

export default function CustomerPriorityPage() {
  const db = useDb()
  return (
    <>
      <PageHeader
        eyebrow="Admin · Management"
        title="Customer Priority Dashboard"
        description="Real-time priority ranking of all customers by installation phase. Assign technicians and dispatch crews from here."
      />
      <div className="space-y-6">
        <CustomerPhasePriorityCard db={db} fullPage />
      </div>
    </>
  )
}
