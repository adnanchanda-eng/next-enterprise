"use client"

import { useEffect, useRef, useState } from "react"

import { useUser } from "@clerk/nextjs"

import type { Blend } from "@/context/BlendContext"
import { useBlend } from "@/context/BlendContext"
import { useMusicStore } from "@/store/musicStore"

export type SongMood = "romantic" | "heartbreak" | "party" | "devotional" | "sad" | "energetic" | "chill" | "neutral"

export interface MoodResult {
  mood: SongMood
  emoji: string
  color: string   // AI-generated, culturally accurate hex — no hardcoding
  confidence: number
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
const ROMANTIC_STREAK_THRESHOLD = 3

export function useSongMood() {
  const [moodResult, setMoodResult] = useState<MoodResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { user } = useUser()
  const { activeBlend, activateBlend } = useBlend()
  const romanticStreakRef = useRef(0)
  const recentArtistsRef = useRef<string[]>([])
  const lastSongIdRef = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = useMusicStore.subscribe((state) => {
      const song = state.currentlyPlaying
      if (!song || song.id === lastSongIdRef.current) return
      lastSongIdRef.current = song.id

      // Keep a rolling window of recent artists for cultural context
      recentArtistsRef.current = [song.artist.name, ...recentArtistsRef.current].slice(0, 8)

      setMoodResult(null)
      setIsLoading(true)

      fetch(`${BACKEND_URL}/api/songs/mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: String(song.id),
          trackName: song.title,
          artistName: song.artist.name,
          albumName: song.collectionName,
        }),
      })
        .then((r) => r.json())
        .then((data: unknown) => {
          const data_ = data as MoodResult;
          setMoodResult(data_)
          setIsLoading(false)

          // Track romantic streak
          if (data_.mood === "romantic" || data_.mood === "heartbreak") {
            romanticStreakRef.current += 1
          } else {
            romanticStreakRef.current = 0
          }

          // After threshold consecutive romantic songs — generate a culturally accurate blend via AI
          if (
            romanticStreakRef.current >= ROMANTIC_STREAK_THRESHOLD &&
            !activeBlend &&
            user?.id
          ) {
            romanticStreakRef.current = 0
            generateAndActivateBlend(data_.mood, recentArtistsRef.current, user.id)
          }
        })
        .catch(() => setIsLoading(false))
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeBlend])

  const generateAndActivateBlend = async (mood: SongMood, recentArtists: string[], userId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/blend/from-mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, recentArtists }),
      })
      const blend = (await res.json()) as Blend
      if (blend?.id) {
        await activateBlend(blend, userId)
      }
    } catch {}
  }

  return { moodResult, isLoading }
}
