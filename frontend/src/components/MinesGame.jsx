import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Bomb, Gem, Coins, RefreshCw, Volume2, VolumeX,
  HelpCircle, ShieldCheck, Trophy, Sparkles, AlertTriangle, Loader2
} from 'lucide-react'
import { startMines, revealMinesTile, cashoutMines } from '../api/client'
import slotAudio from '../utils/slotAudio'

const MINES_OPTIONS = [1, 3, 5, 10, 15, 20]
const QUICK_BETS = [10, 50, 100, 500, 1000]

export function MinesGame({ userId, balance, onBalanceUpdate, onBackToLobby, setToast }) {
  const [minesCount, setMinesCount] = useState(3)
  const [betAmount, setBetAmount] = useState(20)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [tiles, setTiles] = useState(Array.from({ length: 25 }, () => ({ status: 'HIDDEN', type: null })))
  const [gemsRevealed, setGemsRevealed] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [nextMultiplier, setNextMultiplier] = useState(1.1)
  const [currentPayout, setCurrentPayout] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [gameOverResult, setGameOverResult] = useState(null)

  // Start new Mines round
  const handleStart = async () => {
    if (balance < betAmount) {
      setToast?.({ type: 'loss', title: 'Low Balance', detail: 'Please deposit funds to play Mines.' })
      return
    }

    setIsProcessing(true)
    setGameOverResult(null)
    try {
      const res = await startMines(userId, betAmount, minesCount)
      setSessionId(res.sessionId)
      setIsPlaying(true)
      setTiles(Array.from({ length: 25 }, () => ({ status: 'HIDDEN', type: null })))
      setGemsRevealed(0)
      setCurrentMultiplier(1.0)
      setNextMultiplier(res.nextMultiplier)
      setCurrentPayout(betAmount)
      onBalanceUpdate?.(res.newBalance)
      slotAudio.playSpinStart()
    } catch (err) {
      setToast?.({ type: 'loss', title: 'Start Error', detail: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  // Click / reveal a tile
  const handleTileClick = async (index) => {
    if (!isPlaying || isProcessing || !sessionId) return
    if (tiles[index].status !== 'HIDDEN') return

    setIsProcessing(true)
    try {
      const res = await revealMinesTile(sessionId, index, userId)

      // Tile hit mine!
      if (res.isHit) {
        slotAudio.playReelStop(0)
        setIsPlaying(false)
        setGameOverResult({ won: false, message: 'BOOM! Hit a Mine' })

        // Reveal all tiles with explosion
        setTiles((prev) =>
          prev.map((t, i) => {
            if (i === index) return { status: 'EXPLODED', type: 'MINE' }
            if (res.allMines?.includes(i)) return { status: 'REVEALED_MINE', type: 'MINE' }
            return { status: 'REVEALED_GEM', type: 'GEM' }
          })
        )
      } else {
        // Safe Gem!
        slotAudio.playWinChime()
        setGemsRevealed(res.gemsRevealed)
        setCurrentMultiplier(res.currentMultiplier)
        setNextMultiplier(res.nextMultiplier)
        setCurrentPayout(res.currentPayout)

        setTiles((prev) =>
          prev.map((t, i) =>
            i === index ? { status: 'GEM', type: 'GEM' } : t
          )
        )

        // All gems cleared!
        if (res.isOver) {
          setIsPlaying(false)
          slotAudio.playMegaWinFanfare()
          setGameOverResult({
            won: true,
            payout: res.currentPayout,
            message: 'FIELD CLEARED!',
          })
        }
      }
    } catch (err) {
      setToast?.({ type: 'loss', title: 'Action Error', detail: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  // Cash out current earnings
  const handleCashout = async () => {
    if (!isPlaying || isProcessing || !sessionId || gemsRevealed === 0) return

    setIsProcessing(true)
    try {
      const res = await cashoutMines(sessionId, userId)
      setIsPlaying(false)
      onBalanceUpdate?.(res.newBalance)
      slotAudio.playMegaWinFanfare()

      setGameOverResult({
        won: true,
        payout: res.finalPayout,
        multiplier: res.multiplier,
        message: 'CASHOUT SUCCESSFUL!',
      })

      // Reveal full remaining board
      setTiles((prev) =>
        prev.map((t, i) => {
          if (t.status === 'GEM') return t
          if (res.allMines?.includes(i)) return { status: 'REVEALED_MINE', type: 'MINE' }
          return { status: 'REVEALED_GEM', type: 'GEM' }
        })
      )
    } catch (err) {
      setToast?.({ type: 'loss', title: 'Cashout Error', detail: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mines-app-shell">
      {/* Topbar */}
      <header className="mines-topbar">
        <button className="mines-back-btn" onClick={onBackToLobby}><ArrowLeft size={20} /></button>
        <div className="mines-title-group">
          <div className="mines-logo-badge"><Bomb size={18} className="text-red-500" /></div>
          <div>
            <h1 className="mines-heading">MINES</h1>
            <span className="mines-subtag">SPRIBE CLASSIC · 97% RTP</span>
          </div>
        </div>

        <div className="mines-header-right">
          <div className="mines-balance-pill">
            <Coins size={14} className="text-amber-400" />
            <span>₹{Number(balance || 0).toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Multiplier Ticker Banner */}
      <div className="mines-mult-banner">
        <div className="mult-stat">
          <span className="label">MINES</span>
          <span className="val text-rose-400">{minesCount} 💣</span>
        </div>
        <div className="mult-stat center">
          <span className="label">CURRENT</span>
          <span className="val text-emerald-400 font-extrabold">{currentMultiplier.toFixed(2)}x</span>
        </div>
        <div className="mult-stat">
          <span className="label">NEXT TILE</span>
          <span className="val text-amber-300">{isPlaying ? `${nextMultiplier.toFixed(2)}x` : '--'}</span>
        </div>
      </div>

      {/* 5x5 Minefield Grid */}
      <main className="mines-grid-container">
        <div className="mines-5x5-grid">
          {tiles.map((tile, idx) => {
            const isGem = tile.status === 'GEM'
            const isExploded = tile.status === 'EXPLODED'
            const isRevealedMine = tile.status === 'REVEALED_MINE'
            const isRevealedGem = tile.status === 'REVEALED_GEM'

            return (
              <button
                key={idx}
                className={`mine-tile ${tile.status.toLowerCase()} ${isGem ? 'tile-gem' : ''} ${
                  isExploded ? 'tile-boom' : ''
                }`}
                onClick={() => handleTileClick(idx)}
                disabled={!isPlaying || tile.status !== 'HIDDEN' || isProcessing}
              >
                {isGem && (
                  <div className="gem-burst">
                    <span className="gem-icon">💎</span>
                  </div>
                )}
                {isExploded && (
                  <div className="bomb-exploded">
                    <span className="bomb-icon">💥</span>
                  </div>
                )}
                {isRevealedMine && (
                  <div className="mine-dimmed">
                    <span>💣</span>
                  </div>
                )}
                {isRevealedGem && (
                  <div className="gem-dimmed">
                    <span>💎</span>
                  </div>
                )}
                {tile.status === 'HIDDEN' && (
                  <div className="tile-facet"></div>
                )}
              </button>
            )
          })}
        </div>

        {/* Win / Loss Result Toast */}
        {gameOverResult && (
          <div className={`mines-result-popup ${gameOverResult.won ? 'win' : 'lose'}`}>
            <span className="result-icon">{gameOverResult.won ? '🏆' : '💀'}</span>
            <div>
              <p className="result-title">{gameOverResult.message}</p>
              {gameOverResult.won && (
                <p className="result-amt">+₹{gameOverResult.payout.toFixed(2)} ({gameOverResult.multiplier || currentMultiplier}x)</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Action Deck & Betting Controls */}
      <footer className="mines-controls">
        {isPlaying ? (
          <button
            className={`mines-cashout-btn ${gemsRevealed > 0 ? 'active' : 'disabled'}`}
            onClick={handleCashout}
            disabled={gemsRevealed === 0 || isProcessing}
          >
            {isProcessing ? (
              <><Loader2 size={18} className="spin-anim" /> Processing...</>
            ) : (
              <>
                <span className="cashout-txt">CASHOUT</span>
                <span className="cashout-amt">₹{currentPayout.toFixed(2)} ({currentMultiplier.toFixed(2)}x)</span>
              </>
            )}
          </button>
        ) : (
          <button
            className="mines-start-btn"
            onClick={handleStart}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <><Loader2 size={18} className="spin-anim" /> Placing bet...</>
            ) : (
              <>
                <span className="btn-main-txt">BET ₹{betAmount}</span>
                <span className="btn-sub-txt">START GAME</span>
              </>
            )}
          </button>
        )}

        {/* Configuration Strip (Disabled while playing) */}
        {!isPlaying && (
          <div className="mines-config-section">
            {/* Mines Count Selector */}
            <div className="config-row">
              <span className="config-label">Mines Count:</span>
              <div className="mines-pill-group">
                {MINES_OPTIONS.map((num) => (
                  <button
                    key={num}
                    className={`mines-pill ${minesCount === num ? 'active' : ''}`}
                    onClick={() => setMinesCount(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Bet Chips */}
            <div className="quick-chips-row">
              {QUICK_BETS.map((amt) => (
                <button
                  key={amt}
                  className={`chip-pill ${betAmount === amt ? 'active' : ''}`}
                  onClick={() => setBetAmount(amt)}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Bet Stepper */}
            <div className="stepper-row">
              <button className="step-btn" onClick={() => setBetAmount((b) => Math.max(1, b - 10))}>-</button>
              <span className="stepper-display">Bet: <strong>₹{betAmount}</strong></span>
              <button className="step-btn" onClick={() => setBetAmount((b) => b + 20)}>+</button>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}

export default MinesGame
