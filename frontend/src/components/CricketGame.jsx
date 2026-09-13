import React, { useState, useEffect } from 'react'
import { Trophy, Flame, Play, History, ShieldCheck, Zap } from 'lucide-react'
import { playCricket, fetchCricketHistory } from '../api/client'
import { sound } from '../utils/audio'

const CRICKET_OPTIONS = [
  { id: 'DOT', label: '0 Runs (Dot)', mult: 1.5, desc: 'Defensive Block', color: '#64748b', bg: '#1e293b' },
  { id: 'SINGLE', label: '1 - 2 Runs', mult: 1.9, desc: 'Quick Single', color: '#10b981', bg: '#064e3b' },
  { id: 'FOUR', label: '4 (Boundary)', mult: 3.5, desc: 'Cover Drive', color: '#3b82f6', bg: '#1e3a8a' },
  { id: 'SIX', label: '6 (Maximum)', mult: 6.0, desc: 'Huge Sixer!', color: '#f59e0b', bg: '#78350f' },
  { id: 'WICKET', label: 'Wicket Out', mult: 4.5, desc: 'Clean Bowled', color: '#ef4444', bg: '#7f1d1d' },
]

const AMOUNTS = [10, 50, 100, 200, 500]

export function CricketGame({ user, userBalance = 0, onBalanceUpdate }) {
  const [selectedPrediction, setSelectedPrediction] = useState('FOUR')
  const [betAmount, setBetAmount] = useState(50)
  const [bowling, setBowling] = useState(false)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [history, setHistory] = useState([])
  const [commentary, setCommentary] = useState('Bowler running up to the crease... Choose your shot!')

  useEffect(() => {
    fetchCricketHistory().then((d) => setHistory(d.history || [])).catch(() => {})
  }, [])

  const handlePlayBall = async () => {
    if (bowling) return
    if (userBalance < betAmount) {
      setCommentary('Insufficient balance! Please deposit to play.')
      return
    }

    setBowling(true)
    setLastOutcome(null)
    setCommentary('⚡ Bowler releases the ball... In mid-air!')
    sound.playBet()

    try {
      const res = await playCricket(user?.id || 'guest', selectedPrediction, betAmount)

      setTimeout(() => {
        setBowling(false)
        setLastOutcome(res)
        setCommentary(res.commentary || 'Ball finished!')
        if (onBalanceUpdate && res.balance !== undefined) {
          onBalanceUpdate(res.balance)
        }

        if (res.won) {
          sound.playWin()
        } else {
          sound.playTick()
        }

        fetchCricketHistory().then((d) => setHistory(d.history || [])).catch(() => {})
      }, 1500)
    } catch (err) {
      setBowling(false)
      setCommentary(err.message || 'Ball failed')
    }
  }

  return (
    <div className="cricket-container">
      {/* Stadium Pitch View */}
      <div className="cricket-pitch-box">
        <div className="cricket-stadium-lights" />
        <div className="cricket-pitch-turf">
          <div className="cricket-crease-line" />
          <div className={`cricket-ball ${bowling ? 'bowling' : ''}`} />
          <div className="cricket-wickets">
            <div className="stump" />
            <div className="stump" />
            <div className="stump" />
          </div>
        </div>

        {/* Live Commentary Marquee */}
        <div className="cricket-commentary-bar">
          <span className="comm-dot" />
          <p className="comm-text">{commentary}</p>
        </div>
      </div>

      {/* Outcome Banner */}
      {lastOutcome && (
        <div className={`cricket-outcome-card ${lastOutcome.won ? 'win' : 'loss'}`}>
          <div className="outcome-res-tag">
            Result: <strong>{lastOutcome.outcome}</strong> ({lastOutcome.commentary})
          </div>
          {lastOutcome.won ? (
            <div className="outcome-win-text">🎉 WON ₹{lastOutcome.payout} ({lastOutcome.multiplier}x)!</div>
          ) : (
            <div className="outcome-loss-text">Missed shot. Better luck next ball!</div>
          )}
        </div>
      )}

      {/* Prediction Cards Grid */}
      <div className="cricket-market-grid">
        {CRICKET_OPTIONS.map((opt) => {
          const isSelected = selectedPrediction === opt.id
          return (
            <button
              key={opt.id}
              className={`cricket-market-card ${isSelected ? 'active' : ''}`}
              style={{
                borderColor: isSelected ? opt.color : 'rgba(255,255,255,0.1)',
                background: isSelected ? `linear-gradient(135deg, ${opt.bg}, rgba(15,23,42,0.8))` : 'rgba(15,23,42,0.6)',
              }}
              onClick={() => setSelectedPrediction(opt.id)}
            >
              <div className="market-mult" style={{ color: opt.color }}>{opt.mult}x</div>
              <div className="market-label">{opt.label}</div>
              <div className="market-desc">{opt.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Bet Amount Controls */}
      <div className="cricket-bet-controls">
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
          className="cricket-hit-btn"
          disabled={bowling}
          onClick={handlePlayBall}
        >
          <Play size={18} fill="currentColor" />
          <span>{bowling ? 'BOWLING IN PROGRESS...' : `FACING BALL (₹${betAmount})`}</span>
        </button>
      </div>

      {/* History */}
      <div className="cricket-history-card">
        <div className="hist-header">
          <History size={14} /> <span>Recent Balls</span>
        </div>
        <div className="hist-pill-list">
          {history.slice(0, 8).map((h) => (
            <span key={h.id} className={`hist-pill ${h.outcome === 'SIX' || h.outcome === 'FOUR' ? 'win' : 'neutral'}`}>
              {h.outcome}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
