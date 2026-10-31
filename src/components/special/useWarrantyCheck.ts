import { useEffect, useState } from "react"
import { useDb } from "@/data/store"
import {
  verifyWarranty,
  type WarrantyVerification,
} from "@/services/aftersales"

/** Retrieves the warranty verification for a serial (backend-owned when connected). */
export function useWarrantyCheck(serial?: string) {
  const db = useDb()
  const [result, setResult] = useState<WarrantyVerification | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!serial) return setResult(null)
    let live = true
    setLoading(true)
    verifyWarranty(serial)
      .then((r) => live && setResult(r))
      .catch(() => live && setResult(null))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [serial, db.warranties])
  return { result, loading }
}
