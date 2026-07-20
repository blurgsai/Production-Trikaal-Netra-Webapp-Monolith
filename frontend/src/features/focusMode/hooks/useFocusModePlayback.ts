import { useState, useEffect } from 'react'
import type { TrajectoryPoint } from '../model/types'

export const useFocusModePlayback = (trajectory: TrajectoryPoint[], resetKey: unknown) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  useEffect(() => {
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [resetKey])

  useEffect(() => {
    if (!isPlaying || trajectory.length === 0) return
    if (currentIndex >= trajectory.length - 1) {
      setIsPlaying(false)
      return
    }
    const gap = trajectory[currentIndex + 1].timestamp - trajectory[currentIndex].timestamp
    const delay = Math.max(50, Math.min(2000, gap * 1000) / playbackSpeed)
    const timer = setTimeout(() => setCurrentIndex((i) => i + 1), delay)
    return () => clearTimeout(timer)
  }, [isPlaying, currentIndex, playbackSpeed, trajectory])

  return {
    currentIndex,
    isPlaying,
    playbackSpeed,
    seek: setCurrentIndex,
    setSpeed: setPlaybackSpeed,
    togglePlay: () => setIsPlaying((p) => !p),
  }
}
