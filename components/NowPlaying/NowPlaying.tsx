"use client"

import { useCallback, useEffect, useRef } from "react"

import Image from "next/image"

import { AnimatePresence, motion } from "framer-motion"
import { Music2, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PlayButton } from "@/components/PlayButton/PlayButton"
import { seekAudio } from "@/hooks/useAudioPlayer"
import { useFeatureFlag } from "@/hooks/useFeatureFlag"
import { useMusicStore } from "@/store/musicStore"
import { PLAY_STATE } from "@/types/music"

import { ExpandedPlayer } from "./ExpandedPlayer"

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function NowPlaying() {
  const { t } = useTranslation()
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const volumeContainerRef = useRef<HTMLDivElement>(null)
  const isDraggingProgress = useRef(false)
  const isDraggingVolume = useRef(false)

  const {
    currentlyPlaying,
    playState,
    togglePlay,
    currentTime,
    duration,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    isShuffled,
    toggleShuffle,
    isRepeating,
    toggleRepeat,
    playNext,
    playPrevious,
    history,
    isExpanded,
    setExpanded,
    isPlayerDismissed,
    dismissPlayer,
    restorePlayer,
  } = useMusicStore()

  const expandedPlayerFlag = useFeatureFlag("expanded-player-ab")
  const canExpand = expandedPlayerFlag === "on" || expandedPlayerFlag === true

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const seekFromClientX = useCallback(
    (clientX: number) => {
      if (!progressContainerRef.current || duration <= 0) return
      const rect = progressContainerRef.current.getBoundingClientRect()
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      seekAudio(fraction * duration)
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${fraction * 100}%`
      }
    },
    [duration]
  )

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      isDraggingProgress.current = true
      seekFromClientX(e.clientX)
      const onMove = (ev: MouseEvent) => { if (isDraggingProgress.current) seekFromClientX(ev.clientX) }
      const onUp = () => {
        isDraggingProgress.current = false
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [seekFromClientX]
  )

  const handleProgressKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (duration <= 0) return
      const step = 5
      let newTime: number | null = null
      if (e.key === "ArrowRight") newTime = Math.min(duration, currentTime + step)
      else if (e.key === "ArrowLeft") newTime = Math.max(0, currentTime - step)
      if (newTime !== null) {
        seekAudio(newTime)
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${(newTime / duration) * 100}%`
        }
      }
    },
    [duration, currentTime]
  )

  const handleVolumeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      isDraggingVolume.current = true
      const update = (clientX: number) => {
        if (!volumeContainerRef.current) return
        const rect = volumeContainerRef.current.getBoundingClientRect()
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        setVolume(frac)
        if (frac > 0 && isMuted) toggleMute()
      }
      update(e.clientX)
      const onMove = (ev: MouseEvent) => { if (isDraggingVolume.current) update(ev.clientX) }
      const onUp = () => {
        isDraggingVolume.current = false
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [isMuted, setVolume, toggleMute]
  )

  useEffect(() => {
    const unsubscribe = useMusicStore.subscribe(
      (state) => {
        if (progressBarRef.current && state.duration > 0) {
          const prog = (state.currentTime / state.duration) * 100
          progressBarRef.current.style.width = `${prog}%`
        }
      }
    )
    return () => unsubscribe()
  }, [])

  return (
    <>
      {/* Restore pill — shown when player is dismissed but a song is loaded */}
      <AnimatePresence>
        {currentlyPlaying && isPlayerDismissed && (
          <motion.button
            key="restore-pill"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={restorePlayer}
            aria-label={t("player.restore")}
            className="fixed top-3 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#0d0d0d]/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-black/40 backdrop-blur-xl border border-white/[0.08] hover:bg-white/10 transition-colors"
          >
            <Music2 size={13} className="text-accent" />
            <span className="max-w-[140px] truncate">{currentlyPlaying.title}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentlyPlaying && !isExpanded && !isPlayerDismissed && (
          <motion.div
            key="mini-player"
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`fixed inset-x-0 top-0 z-[60] bg-[#0d0d0d]/90 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/20 ${canExpand ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => canExpand && setExpanded(true)}
          >
            {/* Subtle top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

            {/* Progress bar absolutely positioned at the bottom of the mini-player */}
            <div
              ref={progressContainerRef}
              className="absolute bottom-0 translate-y-[1px] inset-x-0 group h-[2px] hover:h-[4px] w-full cursor-pointer transition-[height] bg-white/[0.06] z-[65] overflow-visible"
              role="slider"
              aria-label={t("player.progress")}
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration)}
              aria-valuenow={Math.floor(currentTime)}
              tabIndex={0}
              onMouseDown={handleProgressMouseDown}
              onKeyDown={(e) => { e.stopPropagation(); handleProgressKeyDown(e) }}
            >
              <div
                ref={progressBarRef}
                className="bg-accent h-full relative shadow-[4px_0_10px_3px_rgba(6,182,212,0.45)]"
                style={{ width: `${progress}%` }}
              >
                {/* Glow dot at progress head */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              </div>
            </div>

            <div className="flex items-center px-3 py-3 md:px-4 relative z-10">

              {/* LEFT — dismiss button */}
              <div className="flex flex-1 items-center">
                <button
                  type="button"
                  aria-label={t("player.dismiss")}
                  onClick={(e) => { e.stopPropagation(); dismissPlayer() }}
                  className="rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                >
                  <X size={15} />
                </button>
              </div>

              {/* CENTER — album art + song info + divider + controls */}
              <div className="flex items-center gap-3 shrink-0">

                {/* Song info block */}
                <div className="flex items-center gap-2.5">
                  <motion.div
                    key={currentlyPlaying.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="relative size-11 shrink-0 overflow-hidden rounded-md shadow-lg shadow-black/30"
                  >
                    <Image
                      src={currentlyPlaying.albumArt}
                      alt={`${currentlyPlaying.title} album art`}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                    {playState === PLAY_STATE.PLAYING && (
                      <div className="absolute inset-0 rounded-md ring-1 ring-accent/40" />
                    )}
                  </motion.div>
                  <div className="min-w-0">
                    <motion.p
                      key={currentlyPlaying.title}
                      initial={{ y: 4, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="max-w-[180px] truncate text-sm font-semibold leading-tight text-white"
                    >
                      {currentlyPlaying.title}
                    </motion.p>
                    <p className="text-text-secondary mt-0.5 max-w-[180px] truncate text-xs leading-tight">
                      {currentlyPlaying.artist.name}
                    </p>
                    <div className="mt-0.5 hidden items-center gap-1 md:flex">
                      <span className="text-text-tertiary text-[10px] tabular-nums">{formatTime(currentTime)}</span>
                      <span className="text-white/20 text-[10px]">/</span>
                      <span className="text-white/35 text-[10px] tabular-nums">{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Divider — song info / controls */}
                <div className="hidden md:block h-10 w-px shrink-0 bg-white/[0.08]" />

                {/* Playback controls */}
                <div className="flex items-center gap-1">
                  <button
                    className={`hidden cursor-pointer rounded-full p-2 transition-all duration-200 md:block ${
                      isShuffled ? "text-accent bg-accent/10 ring-1 ring-accent/30" : "text-white/40 hover:text-white hover:bg-white/[0.06]"
                    }`}
                    aria-label={t("player.shuffle")}
                    onClick={(e) => { e.stopPropagation(); toggleShuffle() }}
                    type="button"
                  >
                    <Shuffle size={14} />
                  </button>
                  <button
                    className={`hidden cursor-pointer rounded-full p-2 transition-all duration-200 md:block ${
                      history.length === 0 ? "text-white/20 cursor-not-allowed" : "text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95"
                    }`}
                    aria-label={t("player.previous")}
                    onClick={(e) => { e.stopPropagation(); playPrevious() }}
                    disabled={history.length === 0}
                    type="button"
                  >
                    <SkipBack size={16} fill="currentColor" />
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <PlayButton isPlaying={playState === PLAY_STATE.PLAYING} onToggle={togglePlay} size="sm" />
                  </div>
                  <button
                    className="cursor-pointer rounded-full p-2 text-white/40 transition-all duration-200 hover:text-white hover:bg-white/[0.06] active:scale-95"
                    aria-label={t("player.next")}
                    onClick={(e) => { e.stopPropagation(); playNext() }}
                    type="button"
                  >
                    <SkipForward size={16} fill="currentColor" />
                  </button>
                  <button
                    className={`hidden cursor-pointer rounded-full p-2 transition-all duration-200 md:block ${
                      isRepeating ? "text-accent bg-accent/10 ring-1 ring-accent/30" : "text-white/40 hover:text-white hover:bg-white/[0.06]"
                    }`}
                    aria-label={t("player.repeat")}
                    onClick={(e) => { e.stopPropagation(); toggleRepeat() }}
                    type="button"
                  >
                    <Repeat size={14} />
                  </button>
                </div>

              </div>

              {/* Divider — center / volume */}
              <div className="hidden md:block h-10 w-px shrink-0 bg-white/[0.08] mx-4" />

              {/* RIGHT — Volume */}
              <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute() }}
                  aria-label={t(isMuted ? "player.unmute" : "player.mute")}
                  className="shrink-0 text-white/50 rounded-full p-1.5 transition-all duration-200 hover:text-white hover:bg-white/[0.06]"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div
                  ref={volumeContainerRef}
                  className="group relative flex h-8 w-28 cursor-pointer items-center"
                  onMouseDown={handleVolumeMouseDown}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Track */}
                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 group-hover:h-1.5 transition-[height] duration-150">
                    <div
                      className="h-full rounded-full bg-white transition-[width] duration-75"
                      style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                    />
                  </div>
                  {/* Thumb dot */}
                  <div
                    className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ left: `${isMuted ? 0 : volume * 100}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-white/35">
                  {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                </span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && canExpand && <ExpandedPlayer />}
      </AnimatePresence>
    </>
  )
}
