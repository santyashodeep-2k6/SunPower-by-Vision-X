import { useEffect, useRef, useState } from "react"

/**
 * Custom React hook that debounces a rapidly changing value (e.g. search queries).
 * Delays updating the returned value until after the specified delay has elapsed
 * since the last change.
 *
 * @param value The value to debounce (e.g. search string)
 * @param delay Milliseconds to wait after the last change (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom React hook that returns a debounced version of a callback function.
 * Ensures the callback is only invoked after the specified delay has passed
 * since its last execution call.
 *
 * @param callback The function to debounce
 * @param delay Milliseconds to wait (default: 300ms)
 * @returns A debounced callback function with a .cancel() method
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number = 300,
) {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debounced = (...args: Args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }

  debounced.cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return debounced
}

