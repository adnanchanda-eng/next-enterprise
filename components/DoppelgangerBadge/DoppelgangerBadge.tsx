"use client"

import { useEffect, useRef, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"

import { DoppelgangerMode } from "@/components/DoppelgangerMode/DoppelgangerMode"
import { useDoppelganger } from "@/context/DoppelgangerContext"

export function DoppelgangerBadge() {
  const { activeChannel, expiresAt } = useDoppelganger()
  const [isOpen, setIsOpen] = useState(false)
  const [hoursLeft, setHoursLeft] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expiresAt) return
    const update = () => setHoursLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600000)))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [expiresAt])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  if (!activeChannel) return null

  const bg = activeChannel.accentColor + "33" // 20% opacity

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-all hover:border-white/20 active:scale-95"
        style={{ background: bg }}
        aria-label="Doppelgänger mode active — open details"
      >
        <span>⟁</span>
        <span className="truncate max-w-[120px]">{activeChannel.name.replace("You, if you ", "").replace("You, if ", "")}</span>
        <span className="text-white/40">·</span>
        <span className="text-white/60">{hoursLeft}h left</span>
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              ref={modalRef}
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg"
            >
              <DoppelgangerMode onClose={() => setIsOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
