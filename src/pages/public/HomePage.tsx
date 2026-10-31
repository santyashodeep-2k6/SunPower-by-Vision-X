import { useEffect } from "react"
import { useLocation } from "react-router"
import { Hero } from "@/components/Hero"
import {
  AboutSection,
  HowItWorksSection,
  ServicesSection,
  SiteFooter,
  SolutionsSection,
} from "@/components/home/Sections"
import { FloatingAssistant } from "@/components/home/FloatingAssistant"
import { scrollToSection } from "@/lib/scroll"

export default function HomePage() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    const t = setTimeout(() => scrollToSection(id), 60)
    return () => clearTimeout(t)
  }, [hash])
  return (
    <main>
      <Hero />
      <SolutionsSection />
      <HowItWorksSection />
      <ServicesSection />
      <AboutSection />
      <SiteFooter />
      <FloatingAssistant />
    </main>
  )
}
