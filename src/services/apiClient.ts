/*
  Central API client. When VITE_SUNFLOW_API_URL is set, every service
  module calls the separately developed backend through this client.
  When it is not set, services run against the clearly labelled demo
  data store instead. No credentials are stored in the frontend.
*/

export const API_BASE_URL =
  ((typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SUNFLOW_API_URL : process.env.VITE_SUNFLOW_API_URL) as string | undefined)?.replace(
    /\/$/,
    "",
  ) || undefined
export const isDemoMode = !API_BASE_URL

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

let authToken: string | null = null
/** Called by the auth flow once the backend issues a session token. */
export const setAuthToken = (token: string | null) => {
  authToken = token
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (!API_BASE_URL)
    throw new ApiError(
      0,
      "NO_BACKEND",
      "The SunFlow 360 backend URL is not configured.",
    )
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the SunFlow 360 server. Check your connection and try again.",
    )
  }
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : undefined
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = (data ?? {}) as {
      code?: string
      message?: string
      details?: unknown
    }
    throw new ApiError(
      res.status,
      err.code ?? `HTTP_${res.status}`,
      err.message ?? res.statusText ?? "Request failed",
      err.details,
    )
  }
  return data as T
}

export function errorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}
