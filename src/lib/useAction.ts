import { useCallback, useState } from "react"
import { useToast } from "@/components/ui/overlays"
import { errorMessage } from "@/services/apiClient"

/**
 * Wraps a service call with pending state and consistent toast feedback.
 * Errors are shown as toasts and re-thrown so dialogs can stay open.
 */
export function useAction() {
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)
  const run = useCallback(
    async <T,>(
      key: string,
      fn: () => Promise<T>,
      success?: string | ((r: T) => string),
      opts?: { silentError?: boolean },
    ) => {
      setPending(key)
      try {
        const r = await fn()
        if (success)
          toast({
            tone: "success",
            title: typeof success === "function" ? success(r) : success,
          })
        return r
      } catch (e) {
        if (!opts?.silentError)
          toast({
            tone: "error",
            title: "Action not completed",
            description: errorMessage(e),
          })
        throw e
      } finally {
        setPending(null)
      }
    },
    [toast],
  )
  /** Like run, but swallows the error after showing it (for fire-and-forget buttons). */
  const fire = useCallback(
    <T,>(
      key: string,
      fn: () => Promise<T>,
      success?: string | ((r: T) => string),
    ) => run(key, fn, success).catch(() => undefined),
    [run],
  )
  return { run, fire, pending, isPending: (key: string) => pending === key }
}
