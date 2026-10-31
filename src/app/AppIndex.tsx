import { Navigate } from "react-router"
import { useSession } from "@/data/store"
import { homeFor } from "./navigation"

/** /app redirects to the signed-in role's home screen. */
export default function AppIndex() {
  const session = useSession()
  return (
    <Navigate
      to={session ? homeFor(session.role) : "/login?tab=team"}
      replace
    />
  )
}
