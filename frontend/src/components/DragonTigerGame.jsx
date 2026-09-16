import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Coins, Clock, Trophy, Flame, Zap, HelpCircle,
  RefreshCw, Check, Sparkles
} from 'lucide-react'
import { fetchDragonTigerState, placeDragonTigerBet } from '../api/client'
import slotAudio from '../utils/slotAudio'

const CHIPS = [10, 50, 100, 500, 1000]

export function DragonTigerGame({ userId, balance, onBalanceUpdate, onBackToLobby, setToast }) {
  const [selectedChip, setSelectedChip] = useState(50)
  const [selectedMarket, setSelectedMarket] = useState('DRAGON')
  const [tableState, setTableState] = useState(null)
  const [isDealing, setIsDealing] = useState(false)
  const [roundResult, setRoundResult] = useState(null)
  const [lastWinner, setLastWinner] = useState(null)
  const [countdown, setCountdown] = useState(10)

  // Fetch live table state
  const refreshState = useCallback(async () => {
    try {
      const data = await fetchDragonTigerState()
      setTableState(data)
      setCountdown(data.roundTimeLeft || 10)
    } catch {}
  }, [])

  useEffect(() => {
    refreshState()
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 10))
    }, 1000)
    const syncTimer = setInterval(refreshState, 3000)
    return () => {
      clearInterval(timer)
      clearInterval(syncTimer)
    }
  }, [refreshState])

  // Place bet / Deal showdown
  const handleBet = async (market) => {
    setSelectedMarket(market)
    if (balance < selectedChip) {
      setToast?.({ type: 'loss', title: 'Low Balance', detail: 'Please recharge your wallet to place bet.' })
      return
    }

    setIsDealing(true)
    setRoundResult(null)
    onBalanceUpdate?.(balance - selectedChip)
    slotAudio.playSpinStart()

    try {
      const res = await placeDragonTigerBet(userId, market, selectedChip)
      const data = res.roundResult

      // Card squeeze animation pause
      await new Promise((r) => setTimeout(r, 700))
      slotAudio.playReelStop(0)
      setRoundResult(data)
      setLastWinner(data.winner)
      onBalanceUpdate?.(res.newBalance)

      if (data.isWin) {
        slotAudio.playMegaWinFanfare()
      } else {
        slotAudio.playWinChime()
      }

      refreshState()
    } catch (err) {
      setToast?.({ type: 'loss', title: 'Bet Error', detail: err.message })
      onBalanceUpdate?.(balance)
    } finally {
      setIsDealing(false)
    }
  }

  return (
    <div className="dt-app-shell">
      {/* Top Header */}
      <header className="dt-topbar">
        <button className="dt-back-btn" onClick={onBackToLobby}><ArrowLeft size={20} /></button>
        <div className="dt-title-group">
          <div className="dt-dragon-badge">🐉</div>
          <span className="dt-vs-txt">VS</span>
          <div className="dt-tiger-badge">🐯</div>
          <span className="dt-sub-label">TABLE BATTLE</span>
        </div>

        <div className="dt-header-right">
          <div className="dt-balance-pill">
            <Coins size={14} className="text-amber-400" />
            <span>₹{Number(balance || 0).toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Table Felt Stage */}
      <main className="dt-table-felt">
        {/* Clock & Status Bar */}
        <div className="dt-clock-banner">
          <div className="clock-left">
            <Clock size={14} className="text-amber-400" />
            <span>ROUND #{tableState?.roundNumber || 1001}</span>
          </div>
          <div className={`countdown-badge ${countdown <= 3 ? 'urgent' : ''}`}>
            {isDealing ? 'DEALING...' : `${countdown}s`}
          </div>
        </div>

        {/* Card Duel Arena */}
        <div className="dt-card-duel">
          {/* Dragon Card Box */}
          <div className={`dt-card-slot dragon-slot ${lastWinner === 'DRAGON' ? 'winner-glow' : ''}`}>
            <div className="slot-title-badge dragon-title">🐉 DRAGON</div>
            <div className={`duel-card ${roundResult ? 'flipped' : ''}`}>
              {roundResult?.dragonCard ? (
                <div className={`card-face ${roundResult.dragonCard.color}`}>
                  <span className="card-rank">{roundResult.dragonCard.name}</span>
                  <span className="card-suit">{roundResult.dragonCard.suit}</span>
                </div>
              ) : (
                <div className="card-back dragon-back">
                  <span className="back-pattern">🐉</span>
                </div>
              )}
            </div>
          </div>

          <div className="vs-divider">
            <span className="vs-circle">VS</span>
            {lastWinner && (
              <span className={`winner-pill winner-${lastWinner.toLowerCase()}`}>
                {lastWinner} WINS
              </span>
            )}
          </div>

          {/* Tiger Card Box */}
          <div className={`dt-card-slot tiger-slot ${lastWinner === 'TIGER' ? 'winner-glow' : ''}`}>
            <div className="slot-title-badge tiger-title">🐯 TIGER</div>
            <div className={`duel-card ${roundResult ? 'flipped' : ''}`}>
              {roundResult?.tigerCard ? (
                <div className={`card-face ${roundResult.tigerCard.color}`}>
                  <span className="card-rank">{roundResult.tigerCard.name}</span>
                  <span className="card-suit">{roundResult.tigerCard.suit}</span>
                </div>
              ) : (
                <div className="card-back tiger-back">
                  <span className="back-pattern">🐯</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Betting Felt Layout */}
        <div className="dt-bet-sectors">
          {/* Dragon Bet Button */}
          <button
            className={`sector-btn dragon-sector ${selectedMarket === 'DRAGON' ? 'selected' : ''}`}
            onClick={() => handleBet('DRAGON')}
            disabled={isDealing}
          >
            <span className="sector-icon">🐉</span>
            <strong className="sector-title">DRAGON</strong>
            <span className="sector-payout">1 : 1</span>
          </button>

          {/* Tie Bet Button */}
          <button
            className={`sector-btn tie-sector ${selectedMarket === 'TIE' ? 'selected' : ''}`}
            onClick={() => handleBet('TIE')}
            disabled={isDealing}
          >
            <span className="sector-icon">⚖️</span>
            <strong className="sector-title">TIE</strong>
            <span className="sector-payout">1 : 8</span>
          </button>

          {/* Tiger Bet Button */}
          <button
            className={`sector-btn tiger-sector ${selectedMarket === 'TIGER' ? 'selected' : ''}`}
            onClick={() => handleBet('TIGER')}
            disabled={isDealing}
          >
            <span className="sector-icon">🐯</span>
            <strong className="sector-title">TIGER</strong>
            <span className="sector-payout">1 : 1</span>
          </button>
        </div>

        {/* Bead Plate Roadmap */}
        <div className="dt-roadmap-container">
          <span className="roadmap-title">TREND ROADMAP</span>
          <div className="roadmap-beads">
            {tableState?.recentHistory?.map((h, i) => {
              const win = h.winner
              const isD = win === 'DRAGON'
              const isT = win === 'TIGER'
              return (
                <div
                  key={i}
                  className={`road-bead bead-${win.toLowerCase()}`}
                  title={`Round #${h.round}: ${win}`}
                >
                  {isD ? 'D' : isT ? 'T' : 'X'}
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Control Deck with Chips */}
      <footer className="dt-control-deck">
        <div className="chip-selector-strip">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              className={`casino-chip chip-${chip} ${selectedChip === chip ? 'active-chip' : ''}`}
              onClick={() => setSelectedChip(chip)}
              disabled={isDealing}
            >
              <span className="chip-inner">₹{chip}</span>
            </button>
          ))}
        </div>

        <div className="dt-bet-summary">
          <span>Selected: <strong>{selectedMarket}</strong> (₹{selectedChip})</span>
          <button
            className="dt-deal-btn"
            onClick={() => handleBet(selectedMarket)}
            disabled={isDealing}
          >
            {isDealing ? <RefreshCw size={16} className="spin-anim" /> : `BET ₹${selectedChip}`}
          </button>
        </div>
      </footer>
    </div>
  )
}

export default DragonTigerGame
