"use client"

import { AnimatePresence, motion } from "framer-motion"

import type { BlendMood } from "@/context/BlendContext"
import { useBlend } from "@/context/BlendContext"

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractRGB(color: string): string {
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgba) return `${rgba[1]}, ${rgba[2]}, ${rgba[3]}`
  const hex = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)
  if (hex)
    return `${parseInt(hex[1] ?? "64", 16)}, ${parseInt(hex[2] ?? "64", 16)}, ${parseInt(hex[3] ?? "c8", 16)}`
  return "100, 100, 200"
}

// ─── Mood config ─────────────────────────────────────────────────────────────

interface MoodConfig {
  orbCount: 2 | 3 | 4
  orbOpacity: [number, number]   // [min, max] for breathing
  orbSpeed: number               // seconds per cycle
  topBarHeight: string
  topBarGlow: string             // box-shadow spread
  edgeGlowOpacity: number
  rightGlow: boolean             // show right-edge glow too
  vignetteMultiplier: number
  grainMultiplier: number
}

const MOOD_CONFIG: Record<BlendMood, MoodConfig> = {
  vibrant: {
    orbCount: 4,
    orbOpacity: [0.32, 0.48],
    orbSpeed: 6,
    topBarHeight: "3px",
    topBarGlow: "0 0 32px 10px",
    edgeGlowOpacity: 0.28,
    rightGlow: true,
    vignetteMultiplier: 0.45,
    grainMultiplier: 0.5,
  },
  energetic: {
    orbCount: 3,
    orbOpacity: [0.25, 0.4],
    orbSpeed: 7,
    topBarHeight: "2px",
    topBarGlow: "0 0 24px 7px",
    edgeGlowOpacity: 0.22,
    rightGlow: true,
    vignetteMultiplier: 0.5,
    grainMultiplier: 0.45,
  },
  ethereal: {
    orbCount: 2,
    orbOpacity: [0.1, 0.18],
    orbSpeed: 16,
    topBarHeight: "1px",
    topBarGlow: "0 0 14px 3px",
    edgeGlowOpacity: 0.1,
    rightGlow: false,
    vignetteMultiplier: 0.85,
    grainMultiplier: 0.9,
  },
  serene: {
    orbCount: 2,
    orbOpacity: [0.08, 0.15],
    orbSpeed: 18,
    topBarHeight: "1px",
    topBarGlow: "0 0 10px 2px",
    edgeGlowOpacity: 0.07,
    rightGlow: false,
    vignetteMultiplier: 0.9,
    grainMultiplier: 1.0,
  },
  melancholic: {
    orbCount: 2,
    orbOpacity: [0.14, 0.22],
    orbSpeed: 12,
    topBarHeight: "2px",
    topBarGlow: "0 0 18px 4px",
    edgeGlowOpacity: 0.14,
    rightGlow: false,
    vignetteMultiplier: 0.75,
    grainMultiplier: 0.7,
  },
}

// ─── Orb positions ────────────────────────────────────────────────────────────

const ORB_DEFS = [
  { className: "top-[-25%] left-[-10%] w-[70vw] h-[70vw]", blur: 70, dx: 40, dy: -25 },
  { className: "bottom-[-20%] right-[-10%] w-[60vw] h-[60vw]", blur: 90, dx: -50, dy: 30 },
  { className: "top-[10%] right-[-5%] w-[40vw] h-[40vw]",     blur: 80, dx: -20, dy: -20 },
  { className: "bottom-[5%] left-[20%] w-[30vw] h-[30vw]",    blur: 60, dx: 25,  dy: 20  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function BlendOverlay() {
  const { activeBlend } = useBlend()

  if (!activeBlend) return null

  const mood = (activeBlend.mood && MOOD_CONFIG[activeBlend.mood]) ? activeBlend.mood : "energetic"
  const cfg = MOOD_CONFIG[mood]!
  const rgb = extractRGB(activeBlend.theme.overlayColor)
  const accent = activeBlend.theme.cssVars["--color-accent"] ?? "#06b6d4"

  return (
    <AnimatePresence>
      {activeBlend && (
        <>
          {/* ── Chromatic top bar ─────────────────────────────────────────── */}
          <motion.div
            key="blend-topbar"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-[200] pointer-events-none origin-left"
            style={{
              height: cfg.topBarHeight,
              background: `linear-gradient(90deg, transparent 0%, ${accent} 12%, ${accent} 88%, transparent 100%)`,
              boxShadow: `${cfg.topBarGlow} ${accent}66`,
            }}
          />

          {/* ── Aurora orbs ───────────────────────────────────────────────── */}
          {ORB_DEFS.slice(0, cfg.orbCount).map((orb, i) => (
            <motion.div
              key={`orb-${i}`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [cfg.orbOpacity[0], cfg.orbOpacity[1], cfg.orbOpacity[0]],
                scale: [1, 1 + 0.06 + i * 0.02, 1],
                x: [0, orb.dx * (i % 2 === 0 ? 1 : -1), 0],
                y: [0, orb.dy * (i % 2 === 0 ? 1 : -1), 0],
              }}
              exit={{ opacity: 0, transition: { duration: 1.2 } }}
              transition={{
                opacity: { duration: 1.8 + i * 0.3, ease: "easeOut" },
                scale:   { duration: cfg.orbSpeed + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 },
                x:       { duration: cfg.orbSpeed + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 },
                y:       { duration: cfg.orbSpeed + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 },
              }}
              className={`fixed rounded-full pointer-events-none z-[4] ${orb.className}`}
              style={{
                background: `radial-gradient(circle, rgba(${rgb}, 0.55) 0%, transparent 65%)`,
                filter: `blur(${orb.blur}px)`,
                mixBlendMode: "screen",
              }}
            />
          ))}

          {/* ── Left-edge glow ────────────────────────────────────────────── */}
          <motion.div
            key="blend-left-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="fixed top-0 left-0 bottom-0 w-[300px] pointer-events-none z-[4]"
            style={{
              background: `linear-gradient(90deg, rgba(${rgb}, ${cfg.edgeGlowOpacity}) 0%, transparent 100%)`,
              mixBlendMode: "screen",
            }}
          />

          {/* ── Right-edge glow (vibrant / energetic only) ────────────────── */}
          {cfg.rightGlow && (
            <motion.div
              key="blend-right-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, delay: 0.5 }}
              className="fixed top-0 right-0 bottom-0 w-[200px] pointer-events-none z-[4]"
              style={{
                background: `linear-gradient(270deg, rgba(${rgb}, ${cfg.edgeGlowOpacity * 0.7}) 0%, transparent 100%)`,
                mixBlendMode: "screen",
              }}
            />
          )}

          {/* ── Vignette ──────────────────────────────────────────────────── */}
          <motion.div
            key="blend-vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5 }}
            className="fixed inset-0 pointer-events-none z-[4]"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,${activeBlend.theme.vignetteOpacity * cfg.vignetteMultiplier}) 100%)`,
            }}
          />

          {/* ── Film grain ────────────────────────────────────────────────── */}
          <motion.div
            key="blend-grain"
            initial={{ opacity: 0 }}
            animate={{ opacity: activeBlend.theme.grainOpacity * cfg.grainMultiplier }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 z-[5] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              mixBlendMode: "overlay",
            }}
          />

          {/* ── Scanlines (retro styles) ───────────────────────────────────── */}
          {activeBlend.theme.scanlines && (
            <motion.div
              key="blend-scanlines"
              initial={{ opacity: 0 }}
              animate={{ opacity: mood === "vibrant" ? 0.25 : 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="fixed inset-0 z-[5] pointer-events-none"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  )
}
