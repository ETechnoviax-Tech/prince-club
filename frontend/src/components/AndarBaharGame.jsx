import React, { useState, useEffect } from 'react'
import {
  Trophy,
  Layers,
  Sparkles,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Coins,
  ChevronRight,
} from 'lucide-react'
import { playAndarBahar, fetchAndarBaharHistory } from '../api/client'
import { sound } from '../utils/audio'

export function AndarBaharGame({ user, userBalance, onBalanceUpdate }) {
  const [chosenSide, setChosenSide] = useState('ANDAR')
  const [betAmount, setBetAmount] = useState(50)
  const [isDealing, setIsDealing] = useState(false)
  const [jokerCard, setJokerCard] = useState({ rank: 'K', suit: '♠', isRed: false, name: 'K♠' })
  const [andarCards, setAndarCards] = useState([])
  const [baharCards, setBaharCards] = useState([])
  const [winningCard, setWinningCard] = useState(null)
  const [gameOutcome, setGameOutcome] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState([
    { id: '1', winningSide: 'ANDAR', jokerRank: '7' },
    { id: '2', winningSide: 'BAHAR', jokerRank: 'K' },
    { id: '3', winningSide: 'ANDAR', jokerRank: '9' },
    { id: '4', winningSide: 'ANDAR', jokerRank: 'J' },
  ])
  const [stats, setStats] = useState({ andarPercent: 52, baharPercent: 48, totalRounds: 15 })

  useEffect(() => {
    fetchAndarBaharHistory()
      .then((data) => {
        if (data.history) setHistory(data.history)
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {})
  }, [])

  const handlePlay = async () => {
    if (!user) {
      setErrorMsg('Please login to play Andar Bahar')
      return
    }
    if (betAmount > userBalance) {
      setErrorMsg('Insufficient balance')
      return
    }

    setErrorMsg('')
    setIsDealing(true)
    setGameOutcome(null)
    setWinningCard(null)
    setAndarCards([])
    setBaharCards([])

    try {
      const res = await playAndarBahar(user.id, chosenSide, betAmount)
      setJokerCard(res.jokerCard)

      // Step-by-step card deal animation
      const dealtList = res.dealtCards || []
      let index = 0

      const dealInterval = setInterval(() => {
        if (index < dealtList.length) {
          const item = dealtList[index]
          sound.playCardDeal()
          if (item.side === 'ANDAR') {
            setAndarCards((prev) => [...prev, item.card])
          } else {
            setBaharCards((prev) => [...prev, item.card])
          }
          index++
        } else {
          clearInterval(dealInterval)
          setIsDealing(false)
          setWinningCard(res.winningCard)
          setGameOutcome(res)

          if (res.won) {
            sound.playWin()
          }

          if (res.history) setHistory(res.history)
          if (typeof res.newBalance === 'number') {
            onBalanceUpdate(res.newBalance)
          }
        }
      }, 350)
    } catch (err) {
      setIsDealing(false)
      setErrorMsg(err.message || 'Failed to deal round')
    }
  }

  const renderCard = (card, isWinning = false) => {
    if (!card) return null
    return (
      <div className={`playing-card ${card.isRed ? 'card-red' : 'card-black'} ${isWinning ? 'card-winner' : ''}`}>
        <div className="card-top-corner">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit">{card.suit}</span>
        </div>
        <div className="card-center-suit">{card.suit}</div>
        <div className="card-bot-corner">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit">{card.suit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ab-container">
      {/* Top History & Stats */}
      <div className="ab-stats-header">
        <div className="ab-stat-item">
          <span className="label">ANDAR</span>
          <span className="val text-blue-400">{stats.andarPercent}%</span>
        </div>
        <div className="ab-roadmap">
          <span className="roadmap-title">ROADMAP:</span>
          <div className="roadmap-pills">
            {history.map((h, i) => (
              <span
                key={h.id || i}
                className={`ab-pill ${h.winningSide === 'ANDAR' ? 'pill-andar' : 'pill-bahar'}`}
              >
                {h.winningSide === 'ANDAR' ? 'A' : 'B'}
              </span>
            ))}
          </div>
        </div>
        <div className="ab-stat-item">
          <span className="label">BAHAR</span>
          <span className="val text-amber-400">{stats.baharPercent}%</span>
        </div>
      </div>

      {/* Casino Felt Table */}
      <div className="ab-table-felt">
        {/* Center Joker / Opening Card */}
        <div className="ab-joker-zone">
          <div className="joker-badge">
            <Sparkles size={14} className="text-amber-300" />
            <span>JOKER CARD</span>
          </div>
          <div className="joker-card-spot">
            {renderCard(jokerCard)}
          </div>
          <span className="joker-hint">Match Rank <strong>{jokerCard.rank}</strong></span>
        </div>

        {/* Andar & Bahar Deal Zones */}
        <div className="ab-deal-zones">
          {/* ANDAR (Left) */}
          <div className={`deal-zone zone-andar ${chosenSide === 'ANDAR' ? 'user-selected' : ''} ${gameOutcome?.winningSide === 'ANDAR' ? 'winner-zone' : ''}`}>
            <div className="zone-header">
              <span className="zone-name">ANDAR</span>
              <span className="zone-odds">1.95X</span>
            </div>
            <div className="zone-cards-pile">
              {andarCards.map((c, i) => (
                <div key={i} className="pile-card-wrapper">
                  {renderCard(c, winningCard && c.rank === winningCard.rank && c.suit === winningCard.suit)}
                </div>
              ))}
              {andarCards.length === 0 && <span className="empty-pile-text">Waiting for deal...</span>}
            </div>
          </div>

          {/* BAHAR (Right) */}
          <div className={`deal-zone zone-bahar ${chosenSide === 'BAHAR' ? 'user-selected' : ''} ${gameOutcome?.winningSide === 'BAHAR' ? 'winner-zone' : ''}`}>
            <div className="zone-header">
              <span className="zone-name">BAHAR</span>
              <span className="zone-odds">2.00X</span>
            </div>
            <div className="zone-cards-pile">
              {baharCards.map((c, i) => (
                <div key={i} className="pile-card-wrapper">
                  {renderCard(c, winningCard && c.rank === winningCard.rank && c.suit === winningCard.suit)}
                </div>
              ))}
              {baharCards.length === 0 && <span className="empty-pile-text">Waiting for deal...</span>}
            </div>
          </div>
        </div>

        {/* Win/Loss Result Banner */}
        {gameOutcome && !isDealing && (
          <div className={`ab-result-banner ${gameOutcome.won ? 'banner-win' : 'banner-loss'}`}>
            <CheckCircle2 size={20} className={gameOutcome.won ? 'text-emerald-400' : 'text-red-400'} />
            <div>
              <span className="result-title">
                {gameOutcome.winningSide} WINS! (Match: {gameOutcome.winningCard?.name})
              </span>
              <span className="result-sub">
                {gameOutcome.won ? `You Won +₹${gameOutcome.payout}!` : `Round Lost (-₹${betAmount})`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="ab-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Side Selector (Andar vs Bahar) */}
      <div className="ab-side-selectors">
        <button
          className={`ab-side-btn btn-andar ${chosenSide === 'ANDAR' ? 'active' : ''}`}
          onClick={() => setChosenSide('ANDAR')}
          disabled={isDealing}
        >
          <div className="btn-text-group">
            <span className="btn-main">ANDAR</span>
            <span className="btn-sub">1.95X Payout</span>
          </div>
          {chosenSide === 'ANDAR' && <div className="choice-check">✓</div>}
        </button>

        <button
          className={`ab-side-btn btn-bahar ${chosenSide === 'BAHAR' ? 'active' : ''}`}
          onClick={() => setChosenSide('BAHAR')}
          disabled={isDealing}
        >
          <div className="btn-text-group">
            <span className="btn-main">BAHAR</span>
            <span className="btn-sub">2.00X Payout</span>
          </div>
          {chosenSide === 'BAHAR' && <div className="choice-check">✓</div>}
        </button>
      </div>

      {/* Amount Controls */}
      <div className="ab-amount-deck">
        <div className="ab-counter-row">
          <button
            className="amt-btn"
            onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
            disabled={isDealing}
          >
            -
          </button>
          <div className="amt-val">
            <span className="cur">₹</span>
            <span className="val">{betAmount}</span>
          </div>
          <button
            className="amt-btn"
            onClick={() => setBetAmount(betAmount + 50)}
            disabled={isDealing}
          >
            +
          </button>
        </div>

        <div className="ab-chip-row">
          {[10, 50, 100, 500, 1000].map((v) => (
            <button
              key={v}
              className={`ab-chip ${betAmount === v ? 'selected' : ''}`}
              onClick={() => setBetAmount(v)}
              disabled={isDealing}
            >
              ₹{v}
            </button>
          ))}
          <button
            className="ab-chip chip-double"
            onClick={() => setBetAmount(betAmount * 2)}
            disabled={isDealing}
          >
            2X
          </button>
        </div>
      </div>

      {/* Deal Action Button */}
      <button
        className="ab-deal-btn"
        onClick={handlePlay}
        disabled={isDealing || userBalance < betAmount}
      >
        <Layers size={20} className="mr-2" />
        <span>{isDealing ? 'DEALING CARDS...' : `DEAL CARDS (₹${betAmount})`}</span>
      </button>
    </div>
  )
}
