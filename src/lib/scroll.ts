/** Smoothly scrolls to a homepage section, respecting reduced-motion preferences. */
export function scrollToSection(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (id === "home") {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
    return true
  }
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  return true
}
