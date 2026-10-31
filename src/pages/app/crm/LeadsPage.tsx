import { PageHeader } from "@/components/layout/PageHeader"
import { LeadsTable } from "./LeadsTable"

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sales & CRM"
        title="Leads"
        description="Every enquiry is linked to one customer and site record. Open a lead to qualify, assign and schedule a survey."
      />
      <LeadsTable pageSize={12} />
    </>
  )
}
