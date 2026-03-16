"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { createPortal } from "react-dom"

import { useUser } from "@clerk/nextjs"
import { Check, ChevronRight, Copy, Download, Link, ListEnd, ListPlus, Mail, MoreHorizontal, Plus, Share2, X } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { usePlaylistStore } from "@/store/playlistStore"
import { useMusicStore } from "@/store/musicStore"
import type { Song } from "@/types/music"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ShareView = "pick" | "email" | "link"

interface SongActionsProps {
  song: Song
  className?: string
  dropdownPosition?: "top" | "bottom"
}

export function SongActions({ song, className, dropdownPosition = "bottom" }: SongActionsProps) {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user } = useUser()
  const { addToQueue, manualQueue } = useMusicStore()
  const isQueued = manualQueue.some((s) => s.id === song.id)
  const { playlists, fetchPlaylists, addSong, createPlaylist } = usePlaylistStore()

  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  // Playlist flyout
  const [playlistFlyout, setPlaylistFlyout] = useState(false)
  const flyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [playlistFeedback, setPlaylistFeedback] = useState<number | null>(null)
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  // Share sub-view (replaces main menu)
  const [shareView, setShareView] = useState<ShareView | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [emailError, setEmailError] = useState("")

  // Queue
  const [queueFeedback, setQueueFeedback] = useState(false)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen && user?.id) fetchPlaylists(user.id)
  }, [isOpen, user?.id, fetchPlaylists])

  const openMenu = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const MENU_H = 200
    const rightVal = Math.max(4, window.innerWidth - rect.right)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const showAbove = dropdownPosition === "top"
      ? spaceAbove >= MENU_H || spaceAbove >= spaceBelow
      : spaceBelow < MENU_H && spaceAbove > spaceBelow
    if (showAbove) {
      setMenuStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, right: rightVal })
    } else {
      setMenuStyle({ position: "fixed", top: rect.bottom + 4, right: rightVal })
    }
    setIsOpen(true)
  }, [dropdownPosition])

  const close = useCallback(() => {
    setIsOpen(false)
    setPlaylistFlyout(false)
    setShareView(null)
    setShowCreate(false)
    setNewName("")
    setEmailTo("")
    setEmailError("")
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen, close])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [isOpen, close])

  // Flyout hover — small delay so mouse can travel between row and panel
  const showFlyout = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current)
    setPlaylistFlyout(true)
  }
  const hideFlyout = () => {
    flyoutTimerRef.current = setTimeout(() => setPlaylistFlyout(false), 120)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOpen) { close(); return }
    openMenu()
    posthog?.capture("song_actions_opened", { song_id: song.id })
  }

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isQueued) return
    addToQueue(song)
    setQueueFeedback(true)
    setTimeout(() => setQueueFeedback(false), 800)
    posthog?.capture("song_added_to_queue", { song_id: song.id })
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!song.previewUrl) return
    const a = document.createElement("a")
    a.href = song.previewUrl
    a.download = `${song.title} - ${song.artist.name}.m4a`
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    a.click()
    posthog?.capture("song_downloaded", { song_id: song.id })
    close()
  }

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!user?.id) return
    try {
      await addSong(playlistId, song, user.id)
      setPlaylistFeedback(playlistId)
      setTimeout(() => { setPlaylistFeedback(null); close() }, 1200)
      posthog?.capture("playlist_song_added", { playlist_id: playlistId, song_id: song.id })
    } catch {
      posthog?.capture("playlist_song_add_failed", { playlist_id: playlistId, song_id: song.id })
    }
  }

  const handleQuickCreate = async () => {
    if (!user?.id || !newName.trim()) return
    try {
      const created = await createPlaylist(user.id, newName.trim())
      await addSong(created.id, song, user.id)
      posthog?.capture("playlist_created_and_song_added", { playlist_id: created.id, song_id: song.id })
      close()
    } catch { /* silent */ }
  }

  const songLink = `https://music.apple.com/us/album/id?i=${song.id}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(songLink)
      setLinkCopied(true)
      setTimeout(() => { setLinkCopied(false); close() }, 1400)
      posthog?.capture("song_link_copied", { song_id: song.id })
    } catch { /* silent */ }
  }

  const handleSendEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    const trimmed = emailTo.trim()
    if (!trimmed) { setEmailError("Please enter an email address"); return }
    if (!EMAIL_REGEX.test(trimmed)) { setEmailError("Please enter a valid email"); return }
    const subject = encodeURIComponent(`Check out "${song.title}" by ${song.artist.name}`)
    const body = encodeURIComponent(
      `Hey! I thought you'd enjoy this track:\n\n"${song.title}" by ${song.artist.name}${song.collectionName ? ` (${song.collectionName})` : ""}\n\nListen here: ${songLink}`
    )
    window.open(`mailto:${trimmed}?subject=${subject}&body=${body}`, "_blank")
    posthog?.capture("song_shared_via_email", { song_id: song.id })
    close()
  }

  const row = "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white rounded-lg"

  return (
    <div className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="More options"
        onClick={handleToggle}
        className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="z-[200] w-56 rounded-xl border border-white/[0.08] bg-[#1a1a2e] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── MAIN MENU ── */}
          {!shareView && (
            <div className="py-1.5">
              {/* Add to Playlist row — hover triggers flyout */}
              <div
                className="relative"
                onMouseEnter={showFlyout}
                onMouseLeave={hideFlyout}
              >
                <button className={cn(row, playlistFlyout && "bg-white/[0.07] text-white")}>
                  <ListPlus size={16} className="text-white/50 shrink-0" />
                  <span className="flex-1">{t("addToPlaylist.title")}</span>
                  <ChevronRight size={13} className="text-white/30 shrink-0" />
                </button>

                {/* Playlist flyout panel */}
                {playlistFlyout && (
                  <div
                    className="absolute right-full top-0 mr-1.5 w-52 rounded-xl border border-white/[0.08] bg-[#1a1a2e] py-1.5 shadow-2xl"
                    onMouseEnter={showFlyout}
                    onMouseLeave={hideFlyout}
                  >
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      {t("addToPlaylist.title")}
                    </p>

                    <div className="max-h-44 overflow-y-auto">
                      {playlists.length === 0 ? (
                        <p className="px-3 py-3 text-center text-xs text-white/40">{t("addToPlaylist.noPlaylists")}</p>
                      ) : (
                        playlists.map((pl) => (
                          <button
                            key={pl.id}
                            className={row}
                            onClick={() => handleAddToPlaylist(pl.id)}
                            disabled={playlistFeedback === pl.id}
                          >
                            <span className="flex-1 truncate">{pl.name}</span>
                            {playlistFeedback === pl.id && <Check size={13} className="text-green-400 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>

                    <div className="mx-2 my-1 h-px bg-white/[0.06]" />

                    {showCreate ? (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleQuickCreate()}
                          placeholder="Playlist name"
                          autoFocus
                          className="min-w-0 flex-1 rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-1 text-xs text-white placeholder-white/40 outline-none focus:border-white/20"
                        />
                        <button
                          onClick={handleQuickCreate}
                          disabled={!newName.trim()}
                          className="bg-accent rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button className={row} onClick={() => setShowCreate(true)}>
                        <Plus size={14} className="text-white/50 shrink-0" />
                        {t("addToPlaylist.create")}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Add to Queue */}
              <button className={cn(row, isQueued && "cursor-default opacity-70")} onClick={handleAddToQueue}>
                <ListEnd size={16} className={cn("shrink-0", (isQueued || queueFeedback) ? "text-accent" : "text-white/50")} />
                {isQueued ? t("song.addedToQueue") : t("song.addToQueue")}
                {(isQueued || queueFeedback) && <Check size={13} className="ml-auto text-accent" />}
              </button>

              {/* Download */}
              <button
                className={cn(row, !song.previewUrl && "opacity-40 cursor-not-allowed")}
                onClick={handleDownload}
                disabled={!song.previewUrl}
              >
                <Download size={16} className="text-white/50 shrink-0" />
                {t("song.download")}
              </button>

              {/* Share */}
              <button className={row} onClick={() => setShareView("pick")}>
                <Share2 size={16} className="text-white/50 shrink-0" />
                {t("song.shareSong")}
              </button>
            </div>
          )}

          {/* ── SHARE: PICK ── */}
          {shareView === "pick" && (
            <div className="py-1.5">
              <div className="mb-1 flex items-center gap-1 px-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShareView(null)}
                  className="rounded-full p-1 text-white/40 hover:bg-white/[0.07] hover:text-white transition-colors"
                >
                  <X size={13} />
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{t("song.shareSong")}</span>
              </div>
              <div className="px-2 pb-2 space-y-1.5 mt-1">
                <button
                  className="flex w-full flex-col items-start gap-1 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.08]"
                  onClick={() => setShareView("email")}
                >
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-accent shrink-0" />
                    <span className="text-sm font-medium text-white">Share via Email</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-tight pl-[23px]">Send directly to someone&apos;s inbox</p>
                </button>
                <button
                  className="flex w-full flex-col items-start gap-1 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.08]"
                  onClick={() => setShareView("link")}
                >
                  <div className="flex items-center gap-2">
                    <Link size={15} className="text-accent shrink-0" />
                    <span className="text-sm font-medium text-white">Copy public link</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-tight pl-[23px]">Share anywhere — no sign-in needed</p>
                </button>
              </div>
            </div>
          )}

          {/* ── SHARE: EMAIL ── */}
          {shareView === "email" && (
            <div className="py-1.5">
              <div className="mb-1 flex items-center gap-1 px-2 pt-1">
                <button type="button" onClick={() => setShareView("pick")} className="rounded-full p-1 text-white/40 hover:bg-white/[0.07] hover:text-white transition-colors">
                  <X size={13} />
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Share via Email</span>
              </div>
              <div className="px-3 pb-3 space-y-2 mt-1">
                <p className="text-[11px] text-white/50 leading-snug">
                  Enter an email address and we&apos;ll open your email client with the song pre-filled.
                </p>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={emailTo}
                  autoFocus
                  onChange={(e) => { setEmailTo(e.target.value); setEmailError("") }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendEmail(e as unknown as React.MouseEvent) }}
                  className="w-full rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-accent/40 transition-colors"
                />
                {emailError && <p className="text-[11px] text-red-400">{emailError}</p>}
                <button
                  onClick={handleSendEmail}
                  disabled={!emailTo.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90"
                >
                  <Mail size={14} />
                  Open email client
                </button>
              </div>
            </div>
          )}

          {/* ── SHARE: LINK ── */}
          {shareView === "link" && (
            <div className="py-1.5">
              <div className="mb-1 flex items-center gap-1 px-2 pt-1">
                <button type="button" onClick={() => setShareView("pick")} className="rounded-full p-1 text-white/40 hover:bg-white/[0.07] hover:text-white transition-colors">
                  <X size={13} />
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Copy public link</span>
              </div>
              <div className="px-3 pb-3 space-y-2 mt-1">
                <p className="text-[11px] text-white/50 leading-snug">
                  Anyone with this link can find the track on Apple Music.
                </p>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/50">{songLink}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                  {linkCopied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
