"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

import { useUser } from "@clerk/nextjs"
import { AnimatePresence, motion } from "framer-motion"

import { useMusicStore } from "@/store/musicStore"
import { PLAY_STATE } from "@/types/music"

interface BlendTheme {
  cssVars: Record<string, string>
  overlayColor: string
  grainOpacity: number
  vignetteOpacity: number
  scanlines: boolean
}

export type BlendMood = "vibrant" | "ethereal" | "energetic" | "melancholic" | "serene"

export interface Blend {
  id: string
  label: string
  confidence: number
  description: string
  searchTerms: string[]
  mood: BlendMood
  theme: BlendTheme
}

interface BlendContextValue {
  activeBlend: Blend | null
  expiresAt: number | null
  dismissBlend: () => void
  activateBlend: (blend: Blend, userId: string) => Promise<void>
}

const BlendContext = createContext<BlendContextValue | null>(null)

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export function BlendProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [activeBlend, setActiveBlend] = useState<Blend | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [showToast, setShowToast] = useState(false)

  const activeBlendRef = useRef<Blend | null>(null)
  activeBlendRef.current = activeBlend

  const originalVarsRef = useRef<Record<string, string>>({})
  const appliedVarsRef = useRef<string[]>([])

  // Fetch initial blend state from Redis on mount
  useEffect(() => {
    if (!user?.id) return
    fetch(`${BACKEND_URL}/api/blend/state/${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data: { blend: Blend; expiresAt: number } | null) => {
        if (data && data.blend) {
          setActiveBlend(data.blend)
          setExpiresAt(data.expiresAt ?? null)
        }
      })
      .catch(() => {})
  }, [user?.id])

  // Apply CSS variables when activeBlend changes
  useEffect(() => {
    if (activeBlend) {
      const vars = activeBlend.theme.cssVars
      const keys = Object.keys(vars)

      // Store original values before first override
      const originals: Record<string, string> = {}
      keys.forEach((key) => {
        originals[key] = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
      })
      originalVarsRef.current = originals
      appliedVarsRef.current = keys

      // Apply the new values
      keys.forEach((key) => {
        document.documentElement.style.setProperty(key, vars[key])
      })
    } else {
      // Restore original values
      appliedVarsRef.current.forEach((key) => {
        const original = originalVarsRef.current[key]
        if (original) {
          document.documentElement.style.setProperty(key, original)
        } else {
          document.documentElement.style.removeProperty(key)
        }
      })
      appliedVarsRef.current = []
      originalVarsRef.current = {}
    }
  }, [activeBlend])

  // Auto-expiry timer
  useEffect(() => {
    if (!expiresAt) return
    const delay = expiresAt - Date.now()
    if (delay <= 0) {
      dismissBlend()
      return
    }
    const timer = setTimeout(() => {
      dismissBlend()
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt])

  // Auto-detection — subscribe to music store
  const playCountRef = useRef(0)
  const lastDetectTimeRef = useRef(0)

  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = useMusicStore.subscribe((state, prevState) => {
      if (!state.currentlyPlaying) return
      if (state.playState !== PLAY_STATE.PLAYING) return
      if (state.currentlyPlaying.id === prevState.currentlyPlaying?.id) return

      playCountRef.current += 1

      if (
        playCountRef.current % 4 === 0 &&
        Date.now() - lastDetectTimeRef.current > 30000 &&
        activeBlendRef.current === null
      ) {
        lastDetectTimeRef.current = Date.now()
        detectAndActivate(user.id)
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const detectAndActivate = async (userId: string) => {
    try {
      const detectRes = await fetch(`${BACKEND_URL}/api/blend/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const detectData = (await detectRes.json()) as { blend: Blend | null }
      if (!detectData.blend) return

      const activateRes = await fetch(`${BACKEND_URL}/api/blend/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, blend: detectData.blend }),
      })
      const activateData = (await activateRes.json()) as { success: boolean; expiresAt: number }

      setActiveBlend(detectData.blend)
      setExpiresAt(activateData.expiresAt)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
    } catch {}
  }

  const dismissBlend = () => {
    setActiveBlend(null)
    setExpiresAt(null)
  }

  const activateBlend = async (blend: Blend, userId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/blend/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, blend }),
    })
    const data = (await res.json()) as { success: boolean; expiresAt: number }
    setActiveBlend(blend)
    setExpiresAt(data.expiresAt)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 5000)
  }

  return (
    <BlendContext.Provider value={{ activeBlend, expiresAt, dismissBlend, activateBlend }}>
      {children}

      <AnimatePresence>
        {showToast && activeBlend && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-1/2 z-[180] -translate-x-1/2"
          >
            <div
              className="flex items-center gap-3 rounded-full border px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl"
              style={{
                background: activeBlend.theme.overlayColor.replace(/[\d.]+\)$/, "0.75)"),
                borderColor: activeBlend.theme.cssVars["--color-accent"]
                  ? `${activeBlend.theme.cssVars["--color-accent"]}60`
                  : "rgba(255,255,255,0.12)",
              }}
            >
              <span>✦ {activeBlend.label} blend activated</span>
              <button
                onClick={() => setShowToast(false)}
                className="ml-1 text-white/50 transition-colors hover:text-white"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BlendContext.Provider>
  )
}

export function useBlend() {
  const ctx = useContext(BlendContext)
  if (!ctx) throw new Error("useBlend must be used within BlendProvider")
  return ctx
}
