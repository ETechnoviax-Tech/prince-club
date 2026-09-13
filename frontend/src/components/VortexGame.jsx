import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Zap, Flame, ShieldAlert, Award, Play, History, ChevronRight } from 'lucide-react'
import { playVortex, fetchVortexHistory } from '../api/client'
import { sound } from '../utils/audio'

const RINGS = [
  { id: 'INNER', name: 'Inner Ring', risk: 'Low Risk', maxMult: '3.0x', rtp: '96.11%', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', mults: '1.2x - 3.0x' },
  { id: 'MIDDLE', name: 'Middle Ring', risk: 'Medium Risk', maxMult: '10.0x', rtp: '96.11%', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', mults: '1.5x - 10x' },
  { id: 'OUTER', name: 'Outer Ring', risk: 'High Risk', maxMult: '50.0x', rtp: '96.11%', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', mults: '2.0x - 50x' },
]

const AMOUNTS = [10, 50, 100, 200, 500, 1000]

export function VortexGame({ user, userBalance = 0, onBalanceUpdate }) {
  const [selectedRing, setSelectedRing] = useState('INNER')
  const [betAmount, setBetAmount] = useState(50)
  const [spinning, setSpinning] = useState(false)
  const [spinDeg, setSpinDeg] = useState(0)
  const [lastResult, setLastResult] = useState(null)
  const [history, setHistory] = useState([])
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    fetchVortexHistory()
      .then((data) => setHistory(data.history || []))
      .catch(() => {})
  }, [])

  const handleSpin = async () => {
    if (spinning) return
    if (userBalance < betAmount) {
      setStatusMsg('Insufficient balance!')
      return
    }

    setSpinning(true)
    setStatusMsg('')
    setLastResult(null)

    const randomAddedDeg = 1440 + Math.floor(Math.random() * 360)
    setSpinDeg((prev) => prev + randomAddedDeg)
    sound.playBet()

    try {
      const res = await playVortex(user?.id || 'guest', selectedRing, betAmount)

      setTimeout(() => {
        setSpinning(false)
        setLastResult(res)
        if (onBalanceUpdate && res.balance !== undefined) {
          onBalanceUpdate(res.balance)
        }

        if (res.won) {
          sound.playWin()
          setStatusMsg(`🎉 WON ₹${res.payout} (${res.multiplier}x)!`)
        } else {
          sound.playTick()
          setStatusMsg(`💥 Hit black hole! Try again.`)
        }

        fetchVortexHistory().then((d) => setHistory(d.history || [])).catch(() => {})
      }, 2000)
    } catch (err) {
      setSpinning(false)
      setStatusMsg(err.message || 'Spin failed')
    }
  }

  const currentRingInfo = RINGS.find((r) => r.id === selectedRing)

  return (
    <div className="vortex-container">
      {/* Cosmic Vortex Portal Visual */}
      <div className="vortex-portal-box">
        <div
          className="vortex-core-wheel"
          style={{
            transform: `rotate(${spinDeg}deg)`,
            transition: spinning ? 'transform 2s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
            boxShadow: `0 0 45px ${currentRingInfo?.glow}`,
          }}
        >
          <div className="vortex-ring-outer">
            <div className="vortex-ring-middle">
              <div className="vortex-ring-inner">
                <div className="vortex-singularity">
                  <Flame size={28} className="vortex-flame-icon" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Live Overlay */}
        <div className="vortex-center-badge">
          {spinning ? (
            <span className="vortex-syncing">WARPING...</span>
          ) : lastResult ? (
            <span className={lastResult.won ? 'mult-won' : 'mult-lost'}>
              {lastResult.multiplier > 0 ? `${lastResult.multiplier}x` : '0x'}
            </span>
          ) : (
            <span>VORTEX</span>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className={`vortex-status-banner ${lastResult?.won ? 'win' : ''}`}>
          {statusMsg}
        </div>
      )}

      {/* Ring Selection Tabs */}
      <div className="vortex-ring-selector">
        {RINGS.map((ring) => {
          const isSelected = selectedRing === ring.id
          return (
            <button
              key={ring.id}
              className={`vortex-ring-btn ${isSelected ? 'active' : ''}`}
              style={{
                borderColor: isSelected ? ring.color : 'rgba(255,255,255,0.1)',
                background: isSelected ? `linear-gradient(180deg, ${ring.glow}, rgba(16,22,38,0.9))` : 'rgba(16,22,38,0.6)',
              }}
              onClick={() => setSelectedRing(ring.id)}
            >
              <div className="ring-name" style={{ color: ring.color }}>{ring.name}</div>
              <div className="ring-mult-tag">{ring.mults}</div>
              <div className="ring-risk">{ring.risk}</div>
            </button>
          )
        })}
      </div>

      {/* Bet Amount Chips */}
      <div className="vortex-bet-panel">
        <div className="bet-chips-row">
          {AMOUNTS.map((amt) => (
            <button
              key={amt}
              className={`bet-chip ${betAmount === amt ? 'active' : ''}`}
              onClick={() => setBetAmount(amt)}
            >
              ₹{amt}
            </button>
          ))}
        </div>

        <button
          className="vortex-spin-action-btn"
          disabled={spinning}
          onClick={handleSpin}
          style={{ background: currentRingInfo?.color }}
        >
          <Play size={18} fill="currentColor" />
          <span>{spinning ? 'CHARGING VORTEX...' : `SPIN VORTEX (₹${betAmount})`}</span>
        </button>
      </div>

      {/* History Ribbon */}
      <div className="vortex-history-card">
        <div className="hist-header">
          <History size={14} /> <span>Recent Warps</span>
        </div>
        <div className="hist-pill-list">
          {history.slice(0, 8).map((h) => (
            <span key={h.id} className={`hist-pill ${h.won ? 'win' : 'loss'}`}>
              {h.multiplier}x
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
