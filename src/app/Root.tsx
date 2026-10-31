import { useEffect } from "react"
import {
  Link,
  Outlet,
  isRouteErrorResponse,
  useLocation,
  useRouteError,
} from "react-router"
import { ToastProvider } from "@/components/ui/overlays"
import { buttonClass } from "@/components/ui/Button"

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export function Root() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Outlet />
    </ToastProvider>
  )
}

/** Shown instead of a blank screen if any route throws while rendering. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Unknown error"
  return (
    <div className="app-canvas flex min-h-svh items-center justify-center p-6">
      <div className="surface max-w-md p-8 text-center">
        <p className="text-[12px] font-medium tracking-[0.16em] text-botanical uppercase">
          {notFound ? "404" : "Something went wrong"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {notFound ? "Page not found" : "This screen could not be displayed"}
        </h1>
        <p className="mt-2 text-sm break-words text-muted">
          {notFound ? "The link may be outdated." : message}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className={buttonClass("dark")}>
            Go to homepage
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonClass("secondary")}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="app-canvas flex min-h-svh items-center justify-center p-6">
      <div className="surface max-w-md p-8 text-center">
        <p className="text-[12px] font-medium tracking-[0.16em] text-botanical uppercase">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link to="/" className={buttonClass("dark", "md", "mt-6")}>
          Go to homepage
        </Link>
      </div>
    </div>
  )
}
