import React, { useState } from 'react'
import { X, Sparkles, Trophy, Award } from 'lucide-react'
import { claimDailyVIPBonus } from '../api/client'
import { sound } from '../utils/audio'

export function FortuneWheelModal({ isOpen, onClose, userId, onRewardClaimed }) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [rewardWon, setRewardWon] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSpin = async () => {
    if (spinning) return
    setErrorMsg('')
    setRewardWon(null)
    setSpinning(true)

    try {
      sound.playTick()
      const extraSpins = 5 * 360 + Math.floor(Math.random() * 360)
      const nextRotation = rotation + extraSpins
      setRotation(nextRotation)

      // Call VIP bonus API
      const res = await claimDailyVIPBonus(userId)

      setTimeout(() => {
        setSpinning(false)
        setRewardWon(res.bonusAmount || 25)
        sound.playWin()
        if (onRewardClaimed) onRewardClaimed(res.newBalance, res.bonusAmount)
      }, 3500)
    } catch (err) {
      setTimeout(() => {
        setSpinning(false)
        setErrorMsg(err.message || 'Already claimed today. Check back tomorrow!')
      }, 1500)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="fortune-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="fortune-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="fortune-header">
          <div className="fortune-badge">55 CLUB EXCLUSIVE</div>
          <h2 className="fortune-title">🎡 Wheel of Fortune</h2>
          <p className="fortune-subtitle">Spin the daily lucky wheel & win up to ₹500 cash rewards!</p>
        </div>

        {/* Wheel Container */}
        <div className="wheel-stage">
          <div className="wheel-pointer">▼</div>
          <div
            className="wheel-disc"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
            }}
          >
            <div className="wheel-slice slice-1"><span>₹50</span></div>
            <div className="wheel-slice slice-2"><span>₹15</span></div>
            <div className="wheel-slice slice-3"><span>₹100</span></div>
            <div className="wheel-slice slice-4"><span>₹20</span></div>
            <div className="wheel-slice slice-5"><span>₹500</span></div>
            <div className="wheel-slice slice-6"><span>₹25</span></div>
            <div className="wheel-slice slice-7"><span>₹30</span></div>
            <div className="wheel-slice slice-8"><span>₹40</span></div>
          </div>
          <button
            className={`wheel-center-btn ${spinning ? 'spinning' : ''}`}
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? '...' : 'GO'}
          </button>
        </div>

        {rewardWon && (
          <div className="fortune-win-banner">
            <Trophy size={22} className="text-amber" />
            <div>
              <strong>Congratulations!</strong>
              <p>+₹{rewardWon} has been credited to your wallet!</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="fortune-error-banner">
            <span>ℹ️ {errorMsg}</span>
          </div>
        )}

        <div className="fortune-footer">
          <button
            className="fortune-spin-btn"
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? 'Spinning Wheel...' : 'Spin Now (Free 1x Daily)'}
          </button>
        </div>
      </div>
    </div>
  )
}
export default FortuneWheelModal
