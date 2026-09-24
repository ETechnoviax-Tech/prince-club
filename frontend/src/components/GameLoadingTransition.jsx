import React, { useState, useEffect, useRef } from 'react'
import { ShieldCheck } from 'lucide-react'

const GAME_METADATA = {
  wingo: {
    title: 'Win Go Lottery',
    tagline: 'High-frequency 30s, 1m, 3m & 5m color prediction',
    badge: 'WIN GO',
    color: '#ff6b35',
    icon: '🎯',
    tips: [
      'Synchronizing cryptographic seed with live draw provider...',
      'Verifying real-time odds & round sequence integrity...',
      'Connecting to high-speed websocket parity channel...',
      'Establishing secure real-time betting session...',
    ],
  },
  aviator: {
    title: 'Aviator Crash',
    tagline: 'Provably fair multiplayer crash multiplier',
    badge: 'AVIATOR',
    color: '#e11d48',
    icon: '✈️',
    tips: [
      'Calibrating flight curve & aerodynamic trajectory...',
      'Connecting to real-time provably fair server seed...',
      'Loading live multiplayer cash-out room...',
      'Syncing active auto-cashout limits...',
    ],
  },
  k3: {
    title: 'K3 Lotre',
    tagline: 'Fast-paced triple dice sum & combination lottery',
    badge: 'K3',
    color: '#8b5cf6',
    icon: '🎲',
    tips: [
      'Shaking high-precision cryptographic dice cup...',
      'Calibrating Sum, 2-Same & 3-Same payout matrices...',
      'Fetching live provider draw schedule...',
    ],
  },
  '5d': {
    title: '5D Lotre',
    tagline: 'Five-digit state draw with Big/Small & Sum lines',
    badge: '5D',
    color: '#ec4899',
    icon: '🎱',
    tips: [
      'Loading 5-reel mechanical lottery ball chambers...',
      'Synchronizing A, B, C, D, E position parities...',
      'Connecting to provably fair draw auditor...',
    ],
  },
  trx: {
    title: 'TRX Win Go',
    tagline: 'Public TRON blockchain block hash parity game',
    badge: 'TRX',
    color: '#06b6d4',
    icon: '⚡',
    tips: [
      'Connecting to TRON public mainnet RPC nodes...',
      'Fetching latest block hash cryptographic proofs...',
      'Verifying on-chain tamper-proof outcome engine...',
    ],
  },
  mines: {
    title: 'Mines Arena',
    tagline: 'Classic 5x5 grid cash-out multiplier puzzle',
    badge: 'MINES',
    color: '#f59e0b',
    icon: '💣',
    tips: [
      'Generating 5x5 grid client-server salt pair...',
      'Burying provably fair cryptographic landmines...',
      'Calibrating step multiplier curves...',
    ],
  },
  dragontiger: {
    title: 'Dragon vs Tiger',
    tagline: 'Rapid high-card casino table showdown',
    badge: 'D vs T',
    color: '#ef4444',
    icon: '🐉',
    tips: [
      'Shuffling 8-deck standard casino shoe...',
      'Connecting to real-time dealer table stream...',
      'Verifying tie & suited tie payout tables...',
    ],
  },
}

export function GameLoadingTransition({ gameId, onLoaded, durationMs = 2400 }) {
  const meta = GAME_METADATA[gameId] || {
    title: 'Casino Game Arena',
    tagline: 'Loading high-performance gaming environment',
    badge: 'CASINO',
    color: '#ff6b35',
    icon: '🎮',
    tips: [
      'Connecting to gaming engine...',
      'Verifying wallet balance & credentials...',
      'Synchronizing live game state...',
    ],
  }

  const [progress, setProgress] = useState(8)
  const [tipIndex, setTipIndex] = useState(0)
  const startTimeRef = useRef(Date.now())
  const onLoadedRef = useRef(onLoaded)
  useEffect(() => { onLoadedRef.current = onLoaded }, [onLoaded])

  // Progress timer — startTimeRef never resets, so tip changes don't break the countdown
  useEffect(() => {
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setProgress(pct)

      if (elapsed >= durationMs) {
        clearInterval(interval)
        setProgress(100)
        setTimeout(() => {
          if (typeof onLoadedRef.current === 'function') onLoadedRef.current()
        }, 150)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [durationMs]) // ← no tipIndex in deps

  // Tip cycling — driven by progress, independent of timer
  useEffect(() => {
    if (progress > 70 && meta.tips[2]) setTipIndex(2)
    else if (progress > 35 && meta.tips[1]) setTipIndex(1)
  }, [progress, meta.tips])

  return (
    <div className="game-loader-screen" role="dialog" aria-modal="true" aria-label="Game Loading">
      <div className="game-loader-card">
        {/* Animated Brand Badge */}
        <div className="game-loader-badge" style={{ borderColor: meta.color }}>
          <div className="game-loader-icon-bounce">{meta.icon}</div>
          <span className="game-loader-badge-tag" style={{ background: meta.color }}>
            {meta.badge}
          </span>
        </div>

        {/* Game Title & Subtitle */}
        <h2 className="game-loader-title">{meta.title}</h2>
        <p className="game-loader-tagline">{meta.tagline}</p>

        {/* Progress Bar & Percentage */}
        <div className="game-loader-progress-wrap">
          <div className="game-loader-bar-bg">
            <div
              className="game-loader-bar-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${meta.color} 0%, #ff8c42 100%)`,
              }}
            />
          </div>
          <div className="game-loader-progress-text">
            <span>Loading assets & live data...</span>
            <strong style={{ color: meta.color }}>{progress}%</strong>
          </div>
        </div>

        {/* Live Status Tip */}
        <div className="game-loader-tip-box">
          <span className="game-loader-tip-pulse" style={{ background: meta.color }} />
          <span className="game-loader-tip-text">
            {meta.tips[tipIndex] || 'Establishing secure connection...'}
          </span>
        </div>

        {/* Security Footer */}
        <div className="game-loader-security-footer">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Provably Fair RNG · 256-Bit SSL Secured · Official 55Club Partner</span>
        </div>
      </div>
    </div>
  )
}

export default GameLoadingTransition
