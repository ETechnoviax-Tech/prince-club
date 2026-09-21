import React, { useState } from 'react'
import { X, Sparkles, Gift, ArrowRight } from 'lucide-react'
import { sound } from '../../utils/audio'
import './first_deposit_modal.css'

// 5% boosted bonus rates compared to reference screenshot:
// 500 -> was 108 => +5% = ₹114
// 1000 -> was 158 => +5% = ₹166
// 5000 -> was 458 => +5% = ₹481
// 200 -> was 48 => +5% = ₹50
// 10000 -> was 928 => +5% = ₹975
const BONUS_TIERS = [
  {
    deposit: 500,
    bonus: 114,
    bonusFormatted: '+ ₹114.00',
    desc: 'Deposit 500 for the first time and you will receive 114 bonus',
  },
  {
    deposit: 1000,
    bonus: 166,
    bonusFormatted: '+ ₹166.00',
    desc: 'Deposit 1000 for the first time and you will receive 166 bonus',
  },
  {
    deposit: 5000,
    bonus: 481,
    bonusFormatted: '+ ₹481.00',
    desc: 'Deposit 5000 for the first time and you will receive 481 bonus',
  },
]

export default function FirstDepositBonusModal({
  isOpen,
  onClose,
  onOpenDeposit,
  onOpenActivity,
}) {
  const [noMoreToday, setNoMoreToday] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    sound.playTick?.()
    if (noMoreToday) {
      try {
        const today = new Date().toISOString().split('T')[0]
        localStorage.setItem('hide_first_deposit_bonus_date', today)
      } catch {}
    }
    onClose?.()
  }

  const handleDepositClick = (amt) => {
    sound.playTick?.()
    handleClose()
    if (onOpenDeposit) {
      onOpenDeposit(amt)
    }
  }

  const handleActivityClick = () => {
    sound.playTick?.()
    handleClose()
    if (onOpenActivity) {
      onOpenActivity()
    }
  }

  return (
    <div className="first-deposit-modal-overlay" onClick={handleClose}>
      <div className="first-deposit-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="first-deposit-modal-header">
          <button
            type="button"
            className="first-deposit-close-btn"
            onClick={handleClose}
            title="Close"
          >
            <X size={18} />
          </button>

          <h2 className="first-deposit-modal-title">Extra first deposit bonus</h2>
          <div className="first-deposit-modal-sub">
            Each account can only receive rewards once
          </div>
        </div>

        {/* Body with 5% Boosted Bonus Tiers */}
        <div className="first-deposit-modal-body">
          {BONUS_TIERS.map((tier) => (
            <div key={tier.deposit} className="first-deposit-tier-card">
              <div className="tier-top-row">
                <div className="tier-title-wrap">
                  <span className="tier-title">
                    First deposit <span className="tier-title-highlight">{tier.deposit}</span>
                  </span>
                </div>
                <div className="tier-bonus-badge">{tier.bonusFormatted}</div>
              </div>

              <div className="tier-desc-text">{tier.desc}</div>

              <div className="tier-actions-row">
                <span className="tier-amount-pill">₹{tier.deposit}</span>
                <button
                  type="button"
                  className="tier-deposit-btn"
                  onClick={() => handleDepositClick(tier.deposit)}
                >
                  Deposit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="first-deposit-modal-footer">
          <label className="first-deposit-checkbox-label">
            <input
              type="checkbox"
              checked={noMoreToday}
              onChange={(e) => setNoMoreToday(e.target.checked)}
            />
            <span>No more reminders today</span>
          </label>

          <button
            type="button"
            className="first-deposit-activity-btn"
            onClick={handleActivityClick}
          >
            Activity
          </button>
        </div>
      </div>
    </div>
  )
}
