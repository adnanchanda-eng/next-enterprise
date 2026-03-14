"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

import { useUser } from "@clerk/nextjs"
import { AnimatePresence, motion } from "framer-motion"

import { useMusicStore } from "@/store/musicStore"
import { PLAY_STATE } from "@/types/music"

export interface Persona {
  id: string
  name: string
  tagline: string
  theme: string
  searchTerms: string[]
  accentColor: string
}

interface DoppelgangerContextValue {
  activeChannel: Persona | null
  driftScore: number
  expiresAt: number | null
  activateChannel: (channel: Persona) => Promise<void>
  clearChannel: () => void
}

const DoppelgangerContext = createContext<DoppelgangerContextValue | null>(null)

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export function DoppelgangerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [activeChannel, setActiveChannel] = useState<Persona | null>(null)
  const [driftScore, setDriftScore] = useState(0)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [showPermanentToast, setShowPermanentToast] = useState(false)
  const activeChannelRef = useRef<Persona | null>(null)
  activeChannelRef.current = activeChannel

  // Fetch initial state from Redis on mount
  useEffect(() => {
    if (!user?.id) return
    fetch(`${BACKEND_URL}/api/doppelganger/state/${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data: { channel: Persona; driftScore: number; expiresAt: number } | null) => {
        if (data && data.channel) {
          setActiveChannel(data.channel)
          setDriftScore(data.driftScore ?? 0)
          setExpiresAt(data.expiresAt ?? null)
        }
      })
      .catch(() => {})
  }, [user?.id])

  // Apply --doppelganger-accent CSS variable on root
  useEffect(() => {
    if (activeChannel?.accentColor) {
      document.documentElement.style.setProperty("--doppelganger-accent", activeChannel.accentColor)
    } else {
      document.documentElement.style.removeProperty("--doppelganger-accent")
    }
  }, [activeChannel?.accentColor])

  // Subscribe to music store — always build history; increment drift only when a channel is active
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = useMusicStore.subscribe((state, prevState) => {
      if (!state.currentlyPlaying) return
      if (state.playState !== PLAY_STATE.PLAYING) return
      if (state.currentlyPlaying.id === prevState.currentlyPlaying?.id) return

      const artistName = state.currentlyPlaying.artist.name

      // Always push artist to history so generation has real data even before first activation
      fetch(`${BACKEND_URL}/api/doppelganger/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, artistName }),
      }).catch(() => {})

      // Only increment drift when a channel is active
      const channel = activeChannelRef.current
      if (!channel) return

      fetch(`${BACKEND_URL}/api/doppelganger/drift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, channelId: channel.id }),
      })
        .then((r) => r.json())
        .then((data: { driftScore: number; isPermanent: boolean }) => {
          setDriftScore(data.driftScore)
          if (data.isPermanent) setShowPermanentToast(true)
        })
        .catch(() => {})
    })

    return unsubscribe
  }, [user?.id])

  const activateChannel = async (channel: Persona) => {
    if (!user?.id) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/doppelganger/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, channel }),
      })
      const data = (await res.json()) as { success: boolean; expiresAt: number }
      setActiveChannel(channel)
      setDriftScore(0)
      setExpiresAt(data.expiresAt)
    } catch {}
  }

  const clearChannel = () => {
    setActiveChannel(null)
    setDriftScore(0)
    setExpiresAt(null)
  }

  return (
    <DoppelgangerContext.Provider value={{ activeChannel, driftScore, expiresAt, activateChannel, clearChannel }}>
      {children}

      {/* Permanent drift toast */}
      <AnimatePresence>
        {showPermanentToast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-1/2 z-[200] -translate-x-1/2"
          >
            <div
              className="flex items-center gap-3 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl"
              style={{ background: `color-mix(in srgb, ${activeChannel?.accentColor ?? "#06b6d4"} 20%, #0f172a)` }}
            >
              <span className="text-base">⟁</span>
              <span>This version of you is becoming permanent</span>
              <button
                onClick={() => setShowPermanentToast(false)}
                className="ml-1 text-white/50 transition-colors hover:text-white"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DoppelgangerContext.Provider>
  )
}

export function useDoppelganger() {
  const ctx = useContext(DoppelgangerContext)
  if (!ctx) throw new Error("useDoppelganger must be used within DoppelgangerProvider")
  return ctx
}
