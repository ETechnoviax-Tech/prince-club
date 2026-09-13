import React, { useState, useEffect } from 'react'
import { Flame, ShieldAlert, Crosshair, Play, History, Trophy, Clock } from 'lucide-react'
import { playPubg, fetchPubgHistory } from '../api/client'
import { sound } from '../utils/audio'

const ZONES = [
  { id: 'POCHINKI', name: 'Pochinki Town', mult: 2.0, danger: 'Medium', loot: 'M416 + L3 Vest', color: '#10b981' },
  { id: 'GEORGOPOL', name: 'Georgopol', mult: 2.2, danger: 'Medium', loot: 'Kar98k + 8x', color: '#3b82f6' },
  { id: 'MILITARY', name: 'Military Base', mult: 3.5, danger: 'High', loot: 'AWM Sniper', color: '#8b5cf6' },
  { id: 'SCHOOL', name: 'School Drop', mult: 5.0, danger: 'Extreme', loot: 'Ghillie Suit', color: '#f59e0b' },
  { id: 'AIRDROP', name: 'Airdrop Flare', mult: 10.0, danger: 'Legendary', loot: 'Golden Helmet', color: '#ef4444' },
]

const AMOUNTS = [10, 50, 100, 200, 500]

export function PubgGame({ user, userBalance = 0, onBalanceUpdate }) {
  const [selectedZone, setSelectedZone] = useState('POCHINKI')
  const [betAmount, setBetAmount] = useState(50)
  const [dropping, setDropping] = useState(false)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [history, setHistory] = useState([])
  const [statusMsg, setStatusMsg] = useState('Select Drop Zone and survive the 1-Minute circle!')

  useEffect(() => {
    fetchPubgHistory().then((d) => setHistory(d.history || [])).catch(() => {})
  }, [])

  const handleDrop = async () => {
    if (dropping) return
    if (userBalance < betAmount) {
      setStatusMsg('Insufficient balance to drop!')
      return
    }

    setDropping(true)
    setLastOutcome(null)
    setStatusMsg('🪂 Plane over Erangel! Parachute deploying into hot zone...')
    sound.playBet()

    try {
      const res = await playPubg(user?.id || 'guest', selectedZone, betAmount)

      setTimeout(() => {
        setDropping(false)
        setLastOutcome(res)
        if (onBalanceUpdate && res.balance !== undefined) {
          onBalanceUpdate(res.balance)
        }

        if (res.won) {
          sound.playWin()
          setStatusMsg(`🍗 WINNER WINNER CHICKEN DINNER! Won ₹${res.payout} (${res.multiplier}x) in ${res.safeZone}!`)
        } else {
          sound.playTick()
          setStatusMsg(`☠️ Eliminated outside playzone. Safe Zone was ${res.safeZone}.`)
        }

        fetchPubgHistory().then((d) => setHistory(d.history || [])).catch(() => {})
      }, 2000)
    } catch (err) {
      setDropping(false)
      setStatusMsg(err.message || 'Drop failed')
    }
  }

  return (
    <div className="pubg-container">
      {/* Battlefield Display */}
      <div className="pubg-battle-box">
        <div className="pubg-helmet-glow">
          <div className="pubg-helmet-graphic">
            <span className="helmet-badge">1 MIN BATTLE</span>
            <div className="helmet-icon">🪖</div>
            <h2 className="helmet-title">PUBG 1MIN</h2>
          </div>
        </div>

        <div className="pubg-status-marquee">
          <Crosshair size={14} className="text-amber-400" />
          <span>{statusMsg}</span>
        </div>
      </div>

      {/* Outcome Card */}
      {lastOutcome && (
        <div className={`pubg-outcome-card ${lastOutcome.won ? 'win' : 'loss'}`}>
          <div className="outcome-res-tag">
            Final Circle: <strong>{lastOutcome.safeZone}</strong> • Loot: {lastOutcome.loot}
          </div>
          {lastOutcome.won ? (
            <div className="outcome-win-text">🎉 Payout ₹{lastOutcome.payout} ({lastOutcome.multiplier}x)!</div>
          ) : (
            <div className="outcome-loss-text">Squad eliminated in Blue Zone.</div>
          )}
        </div>
      )}

      {/* Zone Selector Cards */}
      <div className="pubg-zones-grid">
        {ZONES.map((zone) => {
          const isSelected = selectedZone === zone.id
          return (
            <button
              key={zone.id}
              className={`pubg-zone-btn ${isSelected ? 'active' : ''}`}
              style={{
                borderColor: isSelected ? zone.color : 'rgba(255,255,255,0.08)',
                background: isSelected ? `linear-gradient(135deg, ${zone.color}33, rgba(15,20,35,0.9))` : 'rgba(15,20,35,0.6)',
              }}
              onClick={() => setSelectedZone(zone.id)}
            >
              <div className="zone-mult" style={{ color: zone.color }}>{zone.mult}x</div>
              <div className="zone-name">{zone.name}</div>
              <div className="zone-loot">{zone.loot}</div>
            </button>
          )
        })}
      </div>

      {/* Amount Controls */}
      <div className="pubg-controls-card">
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
          className="pubg-drop-btn"
          disabled={dropping}
          onClick={handleDrop}
        >
          <Play size={18} fill="currentColor" />
          <span>{dropping ? 'PARACHUTING INTO ZONE...' : `DROP INTO ${selectedZone} (₹${betAmount})`}</span>
        </button>
      </div>

      {/* History */}
      <div className="pubg-history-card">
        <div className="hist-header">
          <History size={14} /> <span>Recent Circles</span>
        </div>
        <div className="hist-pill-list">
          {history.slice(0, 8).map((h) => (
            <span key={h.id} className="hist-pill win">
              {h.safeZone}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
