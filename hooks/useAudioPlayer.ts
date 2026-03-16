"use client"

import { useEffect, useRef } from "react"

import posthog from "posthog-js"

import { useMusicStore } from "@/store/musicStore"
import { PLAY_STATE } from "@/types/music"

let audioElement: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio()
    audioElement.preload = "auto"
  }
  return audioElement
}

export function seekAudio(time: number) {
  const audio = getAudio()
  audio.currentTime = time
}

export function setAudioVolume(volume: number) {
  const audio = getAudio()
  audio.volume = Math.max(0, Math.min(1, volume))
}

export function useAudioPlayer() {
  const { currentlyPlaying, playState, volume, isMuted } = useMusicStore()
  const prevSongIdRef = useRef<string | null>(null)
  const loadingNewTrackRef = useRef(false)

  useEffect(() => {
    const audio = getAudio()

    if (!currentlyPlaying?.previewUrl) {
      audio.pause()
      audio.src = ""
      prevSongIdRef.current = null
      return
    }

    // New song selected
    if (currentlyPlaying.id !== prevSongIdRef.current) {
      // Track partial listen of the previous song before switching
      const prevProgress = audio.currentTime
      const prevDuration = audio.duration
      if (prevSongIdRef.current && prevProgress > 0 && prevDuration > 0 && isFinite(prevDuration)) {
        const pct = prevProgress / prevDuration
        if (pct < 0.9) {
          const prevState = useMusicStore.getState()
          posthog.capture("song_partially_listened", {
            song_id: prevSongIdRef.current,
            song_title: prevState.currentlyPlaying?.title,
            artist_name: prevState.currentlyPlaying?.artist?.name,
            progress_seconds: Math.round(prevProgress),
            duration_seconds: Math.round(prevDuration),
            percent_listened: Math.round(pct * 100),
          })
        }
      }

      loadingNewTrackRef.current = true
      audio.pause()
      audio.src = currentlyPlaying.previewUrl
      audio.load()
      
      // Only auto-play if the state says we should be playing
      if (playState === PLAY_STATE.PLAYING) {
        audio.play().catch(() => {})
      }
      prevSongIdRef.current = currentlyPlaying.id
      return
    }

    // Same song, just play/pause toggled
    if (playState === PLAY_STATE.PLAYING) {
      audio.play().catch(() => {})
    } else if (playState === PLAY_STATE.PAUSED) {
      audio.pause()
    }
  }, [currentlyPlaying, playState])

  useEffect(() => {
    const audio = getAudio()
    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  // Use requestAnimationFrame for smooth, immediate progress updates
  useEffect(() => {
    const audio = getAudio()
    const store = useMusicStore.getState
    let rafId: number | null = null

    const tick = () => {
      if (!audio.paused && !loadingNewTrackRef.current) {
        // Still fire the time to global state for the text labels (0:00 / 3:00)
        // Zustand batches these or the ref-subscription will handle it faster than React re-renders anyway.
        store().setCurrentTime(audio.currentTime)
        if (audio.duration && isFinite(audio.duration)) {
          store().setDuration(audio.duration)
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    const handleEnded = () => {
      const state = store()
      if (state.currentlyPlaying) {
        posthog.capture("song_fully_listened", {
          song_id: state.currentlyPlaying.id,
          song_title: state.currentlyPlaying.title,
          artist_name: state.currentlyPlaying.artist.name,
          duration_seconds: Math.round(audio.duration || 0),
        })
      }
      if (state.isRepeating) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      state.setCurrentTime(state.duration)
      state.playNext()
    }

    const handleLoadedMetadata = () => {
      store().setDuration(audio.duration)
      store().setCurrentTime(0)
      loadingNewTrackRef.current = false
    }

    const handlePlaying = () => {
      store().setBuffering(false)
    }

    const handleWaiting = () => {
      store().setBuffering(true)
    }

    rafId = requestAnimationFrame(tick)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("playing", handlePlaying)
    audio.addEventListener("waiting", handleWaiting)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("playing", handlePlaying)
      audio.removeEventListener("waiting", handleWaiting)
    }
  }, [])
}
