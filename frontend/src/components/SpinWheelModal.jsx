import React, { useState, useEffect } from 'react'
import { X, Sparkles, Trophy, Gift, ArrowRight } from 'lucide-react'
import { claimSpinWheel, fetchSpinStatus } from '../api/client'
import { sound } from '../utils/audio'

const SECTORS = [
  { label: '₹10', value: 10, color: '#3b82f6' },
  { label: '₹25', value: 25, color: '#10b981' },
  { label: '₹15', value: 15, color: '#8b5cf6' },
  { label: '₹50', value: 50, color: '#ec4899' },
  { label: '₹100', value: 100, color: '#f59e0b' },
  { label: '₹200', value: 200, color: '#06b6d4' },
  { label: '₹500', value: 500, color: '#ef4444', jackpot: true },
  { label: '₹20', value: 20, color: '#14b8a6' },
]

export function SpinWheelModal({ isOpen, onClose, userId, onRewardClaimed }) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinResult, setSpinResult] = useState(null)
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setSpinResult(null)
      fetchSpinStatus(userId)
        .then((data) => setStatus(data))
        .catch(() => {})
    }
  }, [isOpen, userId])

  if (!isOpen) return null

  const handleSpinClick = async () => {
    if (spinning) return
    setErrorMsg('')
    setSpinning(true)
    setSpinResult(null)
    sound.playBet()

    try {
      const res = await claimSpinWheel(userId || 'guest')
      
      // Calculate target sector rotation
      const matchedIdx = SECTORS.findIndex((s) => s.value === res.wonAmount)
      const targetIdx = matchedIdx !== -1 ? matchedIdx : 0
      const sliceAngle = 360 / SECTORS.length
      // Target center of that slice + 5 full rotations (1800 deg)
      const targetAngle = 1800 + (360 - (targetIdx * sliceAngle + sliceAngle / 2))
      
      setRotation((prev) => prev + targetAngle)

      setTimeout(() => {
        setSpinning(false)
        setSpinResult(res)
        sound.playWin()
        if (onRewardClaimed && res.balance !== undefined) {
          onRewardClaimed(res.balance, res.wonAmount)
        }
        fetchSpinStatus(userId).then((d) => setStatus(d)).catch(() => {})
      }, 3000)
    } catch (err) {
      setSpinning(false)
      setErrorMsg(err.message || 'Spin failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="spin-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="spin-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="spin-modal-header">
          <div className="spin-badge">
            <Sparkles size={14} className="text-amber-300 animate-spin-slow" />
            <span>LUCKY FORTUNE WHEEL</span>
          </div>
          <h2 className="spin-modal-title">Spin & Win Up to ₹500</h2>
          <p className="spin-modal-sub">
            Free daily spin for all Prince Club members! Instant wallet cash.
          </p>
        </div>

        {/* Wheel Graphic */}
        <div className="spin-wheel-stage">
          {/* Wheel Pointer */}
          <div className="spin-pointer" />

          {/* Rotating Wheel Disc */}
          <div
            className="spin-wheel-disc"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3s cubic-bezier(0.1, 0.9, 0.2, 1)' : 'none',
            }}
          >
            {SECTORS.map((sec, idx) => {
              const angle = (idx * 360) / SECTORS.length
              return (
                <div
                  key={idx}
                  className={`spin-slice ${sec.jackpot ? 'jackpot-slice' : ''}`}
                  style={{
                    transform: `rotate(${angle}deg)`,
                    background: sec.color,
                  }}
                >
                  <span className="slice-text">{sec.label}</span>
                </div>
              )
            })}
            <div className="spin-center-hub">
              <span className="hub-text">SPIN</span>
            </div>
          </div>
        </div>

        {/* Win Notification */}
        {spinResult && (
          <div className="spin-congrats-card">
            <Trophy size={28} className="text-amber-400 animate-bounce" />
            <div className="congrats-text">
              <h3>CONGRATULATIONS!</h3>
              <p>You won <strong>₹{spinResult.wonAmount}</strong> bonus cash credited to your balance!</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="spin-error-card">
            {errorMsg}
          </div>
        )}

        {/* Spin Action Button */}
        <div className="spin-action-row">
          <button
            className="spin-now-btn"
            disabled={spinning}
            onClick={handleSpinClick}
          >
            <span>{spinning ? 'SPINNING...' : status?.canFreeSpin ? 'SPIN FREE NOW' : 'SPIN (₹20)'}</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="spin-footer-note">
          {status?.canFreeSpin ? (
            <span className="text-emerald-400">✅ Daily Free Spin Available!</span>
          ) : (
            <span className="text-slate-400">Next free spin in 24 hours. Extra spins cost ₹20.</span>
          )}
        </div>
      </div>
    </div>
  )
}
