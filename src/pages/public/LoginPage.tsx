import { useSearchParams } from "react-router"
import { PublicShell } from "@/components/layout/PublicShell"
import { LoginPanel } from "@/components/auth/LoginPanel"

export default function LoginPage() {
  const [params] = useSearchParams()
  const tab =
    params.get("tab") === "team" || params.get("next")?.startsWith("/app")
      ? "team"
      : "customer"
  return (
    <PublicShell
      eyebrow="Sign in"
      title="Welcome back to SunFlow 360."
      description="Customers track their installation, documents and service. Team members open the operations workspace."
      footer={false}
    >
      <div className="glass glass-modal mx-auto max-w-lg rounded-[28px] p-6 sm:p-8">
        <LoginPanel initialTab={tab} next={params.get("next")} />
      </div>
    </PublicShell>
  )
}
