import { useParams } from "react-router"
import { useDb } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { ButtonLink } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/feedback"
import { SolarAssetPassport } from "@/components/special/SolarAssetPassport"

export default function PassportPage() {
  const { reference } = useParams()
  const db = useDb()
  const inst = db.installations.find(
    (i) => i.reference.toUpperCase() === reference?.toUpperCase(),
  )
  if (!inst)
    return (
      <EmptyState
        title="Passport not found"
        description={`No installation with reference ${reference}.`}
        action={
          <ButtonLink to="/app/installations" variant="dark" size="sm">
            Installations
          </ButtonLink>
        }
      />
    )
  return (
    <>
      <PageHeader
        back={{ to: `/app/installations/${inst.id}`, label: "Installation" }}
        eyebrow="After-sales"
        title="Solar Asset Passport"
        description="Internal employee view. The public QR link only confirms authenticity."
        actions={
          <ButtonLink size="sm" to={`/passport/${inst.reference}`}>
            Preview public QR page
          </ButtonLink>
        }
      />
      <SolarAssetPassport db={db} inst={inst} view="internal" />
    </>
  )
}
