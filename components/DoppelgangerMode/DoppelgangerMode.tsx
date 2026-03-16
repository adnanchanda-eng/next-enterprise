"use client"

import { useEffect, useState } from "react"

import { useUser } from "@clerk/nextjs"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, X } from "lucide-react"

import { type Persona, useDoppelganger } from "@/context/DoppelgangerContext"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

type UIState = "idle" | "loading" | "choosing" | "active"

interface DoppelgangerModeProps {
  onClose?: () => void
}

export function DoppelgangerMode({ onClose }: DoppelgangerModeProps) {
  const { user } = useUser()
  const { activeChannel, driftScore, expiresAt, activateChannel, clearChannel } = useDoppelganger()
  const [uiState, setUIState] = useState<UIState>("idle")
  const [personas, setPersonas] = useState<Persona[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hoursLeft, setHoursLeft] = useState(0)

  // Sync with context active channel
  useEffect(() => {
    if (activeChannel) {
      setUIState("active")
    } else if (uiState === "active") {
      setUIState("idle")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel])

  // Update countdown every minute
  useEffect(() => {
    if (!expiresAt) return
    const update = () => setHoursLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600000)))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [expiresAt])

  const handleEnterMultiverse = async () => {
    if (!user?.id) return
    setError(null)
    setUIState("loading")
    try {
      const res = await fetch(`${BACKEND_URL}/api/doppelganger/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const data = (await res.json()) as { personas: Persona[] }
      setPersonas(data.personas)
      setUIState("choosing")
    } catch {
      setError("Could not map your multiverse. Try again.")
      setUIState("idle")
    }
  }

  const handleActivate = async (persona: Persona) => {
    await activateChannel(persona)
    setUIState("active")
  }

  const handleExit = () => {
    clearChannel()
    setUIState("idle")
    onClose?.()
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* ── IDLE ── */}
        {uiState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d18] p-6 md:p-8"
          >
            {/* Subtle radial glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.06),transparent_60%)]" />

            {onClose && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-white/30 transition-colors hover:text-white/70"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}

            <div className="relative space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">Doppelgänger Mode</h2>
                <p className="mt-1 text-sm text-white/40">Discover who you could have become</p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={handleEnterMultiverse}
                className="rounded-xl bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/[0.10] active:scale-95"
              >
                Enter the multiverse
              </button>
            </div>
          </motion.div>
        )}

        {/* ── LOADING ── */}
        {uiState === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex min-h-[140px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080d18]"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Loader2 size={16} className="animate-spin text-white/40" />
                <span className="text-sm text-white/60">Mapping your musical multiverse</span>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block size-1.5 rounded-full bg-white/30"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── CHOOSING ── */}
        {uiState === "choosing" && (
          <motion.div
            key="choosing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Choose your alternate self</h2>
              {onClose && (
                <button onClick={onClose} className="text-white/30 transition-colors hover:text-white/70">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {personas.map((persona, i) => (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#080d18] p-5 transition-colors hover:bg-white/[0.03]"
                  style={{ borderLeft: `3px solid ${persona.accentColor}` }}
                >
                  <p className="text-[15px] font-bold leading-snug text-white">{persona.name}</p>
                  <p className="mt-1.5 text-xs text-white/40">{persona.tagline}</p>
                  <button
                    onClick={() => handleActivate(persona)}
                    className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-white/70 ring-1 ring-white/10 transition-all hover:text-white hover:ring-white/20 active:scale-95"
                  >
                    Enter this version
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── ACTIVE ── */}
        {uiState === "active" && activeChannel && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d18] p-6"
            style={{ borderLeft: `3px solid ${activeChannel.accentColor}` }}
          >
            <div className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(ellipse at top left, ${activeChannel.accentColor}12, transparent 60%)` }}
            />

            <div className="relative space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Active mode</p>
                  <h2 className="mt-1 text-lg font-bold leading-snug text-white">{activeChannel.name}</h2>
                  <p className="mt-0.5 text-xs text-white/40">{activeChannel.tagline}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-white/30">{hoursLeft}h left</p>
                  <button
                    onClick={handleExit}
                    className="mt-1.5 text-[11px] text-white/30 underline underline-offset-2 transition-colors hover:text-white/60"
                  >
                    Exit
                  </button>
                </div>
              </div>

              {/* Drift progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-white/30">
                  <span>Drift score</span>
                  <span>{Math.min(driftScore, 100)} / 100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: activeChannel.accentColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(driftScore, 100)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
