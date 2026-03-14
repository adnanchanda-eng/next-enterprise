import { Metadata } from "next"

import { DoppelgangerMode } from "@/components/DoppelgangerMode/DoppelgangerMode"
import { HeroSection } from "@/components/HeroSection/HeroSection"
import en from "@/i18n/locales/en.json"

export const metadata: Metadata = {
  title: en["meta.homeTitle"],
  description: en["meta.homeDescription"],
}

export default function Home() {
  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <DoppelgangerMode />
        <HeroSection />
      </div>
    </div>
  )
}
