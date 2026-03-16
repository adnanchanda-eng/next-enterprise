"use client"

import { useEffect, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

import type { BlendMood } from "@/context/BlendContext"
import { useBlend } from "@/context/BlendContext"

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "expiring…"
  const mins = Math.ceil(ms / 60000)
  if (mins < 60) return `${mins}m left`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`
}

// Mood-specific label prefix and dot animation speed
const MOOD_META: Record<BlendMood, { icon: string; pulseSpeed: number; shimmer: boolean }> = {
  vibrant:    { icon: "✦", pulseSpeed: 1.2, shimmer: true  },
  energetic:  { icon: "⚡", pulseSpeed: 1.5, shimmer: true  },
  ethereal:   { icon: "◈", pulseSpeed: 4.0, shimmer: false },
  serene:     { icon: "◌", pulseSpeed: 5.0, shimmer: false },
  melancholic:{ icon: "◇", pulseSpeed: 3.0, shimmer: false },
}

export function BlendStatusBar() {
  const { activeBlend, expiresAt, dismissBlend } = useBlend()
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    if (!expiresAt) return
    const update = () => setTimeLeft(formatTimeLeft(expiresAt - Date.now()))
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [expiresAt])

  const mood: BlendMood = (activeBlend?.mood && MOOD_META[activeBlend.mood]) ? activeBlend.mood : "energetic"
  const meta = MOOD_META[mood]!
  const accent = activeBlend?.theme.cssVars["--color-accent"] ?? "#06b6d4"
  const overlayRaw = activeBlend?.theme.overlayColor ?? "rgba(6,182,212,0.08)"
  const overlayBg = overlayRaw.replace(/[\d.]+\)$/, "0.14)")

  return (
    <AnimatePresence>
      {activeBlend && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden px-3 pb-2"
        >
          <div
            className="relative rounded-xl border overflow-hidden"
            style={{
              background: overlayBg,
              borderColor: `${accent}35`,
            }}
          >
            {/* Shimmer sweep — vibrant/energetic only */}
            {meta.shimmer && (
              <motion.div
                animate={{ x: ["-110%", "210%"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 3.5 }}
                className="absolute top-0 left-0 w-1/2 h-full pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, ${accent}20, transparent)`,
                }}
              />
            )}

            <div className="relative px-3 py-2.5">
              {/* Row: dot · name · timer · dismiss */}
              <div className="flex items-center gap-2">
                {/* Pulsing presence dot */}
                <div className="relative shrink-0 w-4 h-4 flex items-center justify-center">
                  <div
                    className="w-2 h-2 rounded-full z-10 relative"
                    style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                  />
                  <motion.div
                    animate={{ scale: [1, 2.4, 1], opacity: [0.55, 0, 0.55] }}
                    transition={{ duration: meta.pulseSpeed, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: accent }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white leading-none truncate">
                    <span className="mr-1 opacity-80">{meta.icon}</span>
                    {activeBlend.label}
                  </p>
                  <p className="text-[10px] mt-0.5 leading-none" style={{ color: `${accent}90` }}>
                    {timeLeft}
                  </p>
                </div>

                <button
                  onClick={dismissBlend}
                  className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/10"
                  style={{ color: `${accent}60` }}
                  aria-label="Dismiss blend"
                >
                  <X size={11} />
                </button>
              </div>

              {/* Vibe description */}
              <p className="mt-1.5 text-[10px] text-white/40 leading-snug line-clamp-2">
                {activeBlend.description}
              </p>

              {/* Accent progress bar */}
              <div
                className="mt-2 h-[1.5px] rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${accent}, ${accent}40, transparent)`,
                  boxShadow: mood === "vibrant" || mood === "energetic" ? `0 0 6px ${accent}80` : "none",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
