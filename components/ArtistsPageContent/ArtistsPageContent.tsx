"use client"

import { useEffect, useState } from "react"

import Image from "next/image"

import { AnimatePresence, motion } from "framer-motion"
import { Mic2, RefreshCw, WifiOff } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SongCard } from "@/components/SongCard/SongCard"
import { Spotlight } from "@/components/ui/spotlight"
import { type ArtistWithSongs, fetchArtistsBrowse } from "@/lib/services/itunesService"
import { useMusicStore } from "@/store/musicStore"
import { PLAY_STATE } from "@/types/music"

const stagger = {
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function ArtistsPageContent() {
  const { t } = useTranslation()
  const { currentlyPlaying, playState, setPlayingTrack, togglePlay } = useMusicStore()

  const [artists, setArtists] = useState<ArtistWithSongs[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchArtistsBrowse()
      setArtists(data)
    } catch {
      setError("Failed to load")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handlePlay = (songId: string) => {
    for (const artist of artists) {
      const song = artist.songs.find((s) => s.id === songId)
      if (song) {
        if (currentlyPlaying?.id === songId) {
          togglePlay()
        } else {
          setPlayingTrack(song, artist.songs)
        }
        return
      }
    }
  }

  return (
    <div className="relative space-y-6">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none z-0">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(6, 182, 212, 0.07)" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="from-accent to-accent-hover relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg shadow-cyan-500/20">
          <div className="from-accent/20 to-accent-hover/20 absolute inset-0 animate-pulse rounded-xl bg-gradient-to-br blur-md" />
          <Mic2 size={20} className="relative z-10 text-white" />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-bold">{t("artists.title")}</h1>
          <p className="text-text-tertiary text-sm">{t("artists.subtitle", { count: artists.length })}</p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && artists.length === 0 ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-5 py-20 text-center"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-white/[0.06]">
              <WifiOff size={24} className="text-text-tertiary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-white">{t("hero.errorTitle")}</h2>
              <p className="text-text-tertiary max-w-xs text-sm">{t("hero.errorDescription")}</p>
            </div>
            <button
              onClick={load}
              className="bg-accent hover:bg-accent-hover inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-all duration-200 hover:shadow-accent/30"
            >
              <RefreshCw size={14} />
              {t("hero.retry")}
            </button>
          </motion.div>
        ) : isLoading && artists.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
            role="status"
            aria-label={t("hero.loading")}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <div className="size-10 animate-pulse rounded-full bg-white/10" />
                  <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
                </div>
                <div className="space-y-1 rounded-xl bg-white/[0.03] p-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                      <div className="size-11 animate-pulse rounded-lg bg-white/10" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-32 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="list" variants={stagger} initial="hidden" animate="show" className="space-y-10">
            {artists.map((artist) => (
              <motion.div key={artist.id} variants={fadeUp} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] shadow-xl shadow-black/30">
                {/* Artist header */}
                <div className="relative flex items-center gap-4 overflow-hidden px-5 py-5">
                  {/* blurred background derived from artist image */}
                  <div className="pointer-events-none absolute inset-0 scale-110 blur-2xl">
                    <Image
                      src={artist.image}
                      alt=""
                      fill
                      className="object-cover opacity-20"
                      sizes="100vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="relative size-20 overflow-hidden rounded-full ring-2 ring-white/20 shadow-lg shadow-black/40">
                      <Image
                        src={artist.image}
                        alt={artist.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </div>

                  {/* Name + count */}
                  <div className="relative min-w-0">
                    <p className="text-text-tertiary mb-0.5 text-[11px] font-semibold uppercase tracking-widest">
                      {t("artists.title").replace(/s$/, "")}
                    </p>
                    <h2 className="truncate text-2xl font-bold text-white drop-shadow">{artist.name}</h2>
                    <p className="text-text-tertiary mt-0.5 text-xs">
                      {t("artists.tracksCount", { count: artist.songs.length })}
                    </p>
                  </div>
                </div>

                {/* Divider + songs label */}
                <div className="flex items-center gap-3 border-t border-white/[0.06] px-5 py-3">
                  <span className="text-text-tertiary text-[11px] font-semibold uppercase tracking-widest">
                    Songs
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Songs list */}
                <div className="px-2 pb-3">
                  {artist.songs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      variant="trending"
                      isPlaying={currentlyPlaying?.id === song.id && playState === PLAY_STATE.PLAYING}
                      onPlay={() => handlePlay(song.id)}
                      showAddToPlaylist
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
