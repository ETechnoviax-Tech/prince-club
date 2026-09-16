import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Volume2, VolumeX, Zap, Play, Square, HelpCircle,
  Trophy, Sparkles, Coins, RefreshCw, X, ChevronRight, Flame
} from 'lucide-react'
import { executeInHouseSlotSpin } from '../api/client'
import slotAudio from '../utils/slotAudio'
import SlotSymbol from './SlotSymbol'

const SLOT_GAMES = [
  { id: 'crazy777', name: 'Crazy 777', icon: '🎰', badge: 'HOT 1000X', color: '#f59e0b' },
  { id: 'fortunegems', name: 'Fortune Gems', icon: '💎', badge: '15X WHEEL', color: '#10b981' },
  { id: 'superace', name: 'Super Ace', icon: '🃏', badge: '243 WAYS', color: '#8b5cf6' },
]

const QUICK_BETS = [5, 10, 50, 100, 500, 1000]

/**
 * 60FPS High-Impact HTML5 Canvas Coin & Sparkle Explosion
 */
function CoinShowerCanvas({ isActive }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!isActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const particles = []
    const colors = ['#fef08a', '#fbbf24', '#f59e0b', '#ffffff', '#34d399']

    // Create 60 coins & sparkle stars
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 80,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        gravity: 0.45,
        size: Math.random() * 8 + 6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        isStar: Math.random() > 0.6,
        alpha: 1,
      })
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let aliveCount = 0

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.rotation += p.vRot
        p.alpha -= 0.008

        if (p.alpha > 0 && p.y < canvas.height + 20) {
          aliveCount++
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)

          if (p.isStar) {
            // Star glint
            ctx.fillStyle = p.color
            ctx.beginPath()
            ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // 3D Spinning Coin
            ctx.scale(Math.cos(p.rotation), 1)
            ctx.fillStyle = p.color
            ctx.beginPath()
            ctx.arc(0, 0, p.size, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#b45309'
            ctx.lineWidth = 1.5
            ctx.stroke()
          }

          ctx.restore()
        }
      })

      if (aliveCount > 0) {
        animId = requestAnimationFrame(render)
      }
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [isActive])

  if (!isActive) return null
  return <canvas ref={canvasRef} width={430} height={700} className="slot-particle-canvas" />
}

export function InHouseSlotArena({
  initialGameId = 'crazy777',
  userId,
  balance,
  onBalanceUpdate,
  onClose,
  setToast,
}) {
  const [activeGame, setActiveGame] = useState(initialGameId || 'crazy777')
  const [betAmount, setBetAmount] = useState(10)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isTurbo, setIsTurbo] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0)
  const [winCelebration, setWinCelebration] = useState(null)
  const [showPaytable, setShowPaytable] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [displayWin, setDisplayWin] = useState(0)
  const [lastMultiplier, setLastMultiplier] = useState(0)

  // Visual Reel States
  const [c777Reels, setC777Reels] = useState(['S777', 'S777', 'S777'])
  const [c777Bonus, setC777Bonus] = useState({ label: '10X', type: 'MULT', val: 10 })

  const [fgGrid, setFgGrid] = useState([
    ['GARUDA', 'RUBY', 'SAPPHIRE'],
    ['RUBY', 'GARUDA', 'RUBY'],
    ['EMERALD', 'RUBY', 'GARUDA'],
  ])
  const [fgMult, setFgMult] = useState('5X')
  const [fgWinningLines, setFgWinningLines] = useState([])

  const [saMatrix, setSaMatrix] = useState([
    ['ACE', 'KING', 'QUEEN', 'JACK', 'WILD'],
    ['WILD', 'ACE', 'KING', 'QUEEN', 'JACK'],
    ['ACE', 'WILD', 'ACE', 'KING', 'QUEEN'],
    ['TEN', 'NINE', 'WILD', 'ACE', 'KING'],
  ])
  const [saCombo, setSaCombo] = useState(1)

  const isSpinningRef = useRef(false)
  const autoSpinTimerRef = useRef(null)

  // Sound toggle
  const toggleSound = () => {
    const muted = slotAudio.toggleMute()
    setIsMuted(muted)
  }

  // Handle Game Switch
  const switchGame = (gameId) => {
    if (isSpinningRef.current) return
    setActiveGame(gameId)
    setWinCelebration(null)
    setLastWin(0)
    setDisplayWin(0)
    setLastMultiplier(0)
    setFgWinningLines([])
  }

  // Smooth Animated Win Counter
  useEffect(() => {
    if (lastWin === 0) {
      setDisplayWin(0)
      return
    }
    let start = 0
    const end = lastWin
    const duration = isTurbo ? 300 : 700
    const startTime = performance.now()

    const animateCount = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const current = Math.floor(start + (end - start) * progress)
      setDisplayWin(current)
      if (progress < 1) {
        requestAnimationFrame(animateCount)
      } else {
        setDisplayWin(end)
      }
    }
    requestAnimationFrame(animateCount)
  }, [lastWin, isTurbo])

  // Execute Spin
  const spin = useCallback(async () => {
    if (isSpinningRef.current) return
    if (balance < betAmount) {
      setToast?.({ type: 'loss', title: 'Low Balance', detail: 'Please recharge your wallet to spin.' })
      setAutoSpinsLeft(0)
      return
    }

    isSpinningRef.current = true
    setIsSpinning(true)
    setWinCelebration(null)
    setFgWinningLines([])

    // Immediate optimistic balance deduction
    onBalanceUpdate?.(balance - betAmount)
    slotAudio.playSpinStart()

    // High-speed rolling ticker
    let rollTicks = 0
    const rollInterval = setInterval(() => {
      rollTicks++
      if (activeGame === 'crazy777') {
        const dummy = ['S777', 'S77', 'S7', 'BAR3', 'BAR2', 'BAR1', 'BELL', 'CHERRY']
        setC777Reels([
          dummy[Math.floor(Math.random() * dummy.length)],
          dummy[Math.floor(Math.random() * dummy.length)],
          dummy[Math.floor(Math.random() * dummy.length)],
        ])
        const dummyBonus = ['2X', '5X', '10X', '+5X', 'RESPIN', '--']
        setC777Bonus({ label: dummyBonus[Math.floor(Math.random() * dummyBonus.length)] })
      } else if (activeGame === 'fortunegems') {
        const gems = ['GARUDA', 'RUBY', 'SAPPHIRE', 'EMERALD', 'A', 'K', 'Q', 'J']
        setFgGrid(Array.from({ length: 3 }, () =>
          Array.from({ length: 3 }, () => gems[Math.floor(Math.random() * gems.length)])
        ))
        const mults = ['1X', '2X', '3X', '5X', '10X', '15X']
        setFgMult(mults[Math.floor(Math.random() * mults.length)])
      } else if (activeGame === 'superace') {
        const cards = ['WILD', 'ACE', 'KING', 'QUEEN', 'JACK', 'TEN', 'NINE']
        setSaMatrix(Array.from({ length: 4 }, () =>
          Array.from({ length: 5 }, () => cards[Math.floor(Math.random() * cards.length)])
        ))
      }
      if (rollTicks % 2 === 0) slotAudio.playReelTick()
    }, isTurbo ? 35 : 70)

    try {
      const res = await executeInHouseSlotSpin(userId, activeGame, betAmount)
      const data = res.spinResult

      const spinDuration = isTurbo ? 400 : 1100
      await new Promise(r => setTimeout(r, spinDuration))
      clearInterval(rollInterval)

      // Snap Stop with physical bounce
      if (activeGame === 'crazy777') {
        setC777Reels(data.symbols)
        setC777Bonus(data.bonusReel)
        slotAudio.playReelStop(0)
        if (data.bonusReel?.type === 'MULT' && data.bonusReel.val >= 5) {
          slotAudio.playBonusTrigger()
        }
      } else if (activeGame === 'fortunegems') {
        setFgGrid(data.gridIds)
        setFgMult(data.multiplierWheel.label)
        setFgWinningLines(data.winningLines || [])
        slotAudio.playReelStop(1)
        if (data.multiplierWheel.val >= 5) {
          slotAudio.playBonusTrigger()
        }
      } else if (activeGame === 'superace') {
        setSaMatrix(data.matrixIds)
        setSaCombo(data.comboMultiplier || 1)
        slotAudio.playReelStop(2)
      }

      // Settle balances
      onBalanceUpdate?.(res.newBalance)
      setLastWin(data.finalWin)
      setLastMultiplier(data.multiplier)

      if (data.finalWin > 0) {
        if (data.multiplier >= 50) {
          setWinCelebration({ type: 'JACKPOT', title: 'SUPER JACKPOT!', amount: data.finalWin, mult: data.multiplier })
          slotAudio.playMegaWinFanfare()
        } else if (data.multiplier >= 20) {
          setWinCelebration({ type: 'MEGA', title: 'MEGA WIN!', amount: data.finalWin, mult: data.multiplier })
          slotAudio.playMegaWinFanfare()
        } else if (data.multiplier >= 5) {
          setWinCelebration({ type: 'BIG', title: 'BIG WIN!', amount: data.finalWin, mult: data.multiplier })
          slotAudio.playWinChime()
        } else {
          slotAudio.playWinChime()
        }
      }
    } catch (err) {
      clearInterval(rollInterval)
      setToast?.({ type: 'loss', title: 'Spin Error', detail: err.message })
      onBalanceUpdate?.(balance)
      setAutoSpinsLeft(0)
    } finally {
      isSpinningRef.current = false
      setIsSpinning(false)

      setAutoSpinsLeft((prev) => {
        if (prev > 1) {
          autoSpinTimerRef.current = setTimeout(() => {
            spin()
          }, isTurbo ? 500 : 1000)
          return prev - 1
        }
        return 0
      })
    }
  }, [balance, betAmount, activeGame, userId, isTurbo, onBalanceUpdate, setToast])

  const stopAutoSpin = () => {
    if (autoSpinTimerRef.current) clearTimeout(autoSpinTimerRef.current)
    setAutoSpinsLeft(0)
  }

  useEffect(() => {
    return () => {
      if (autoSpinTimerRef.current) clearTimeout(autoSpinTimerRef.current)
    }
  }, [])

  return (
    <div className="inhouse-slot-shell">
      {/* 60FPS Coin Explosion Canvas */}
      <CoinShowerCanvas isActive={lastWin > 0 && !isSpinning} />

      {/* Top Header */}
      <header className="slot-topbar">
        <button className="slot-icon-btn" onClick={onClose}><ArrowLeft size={20} /></button>

        <div className="slot-brand">
          <span className="slot-brand-logo">👑</span>
          <div>
            <h1 className="slot-title">{SLOT_GAMES.find(g => g.id === activeGame)?.name}</h1>
            <span className="slot-tag">PRINCE CASINO · 0% FEE</span>
          </div>
        </div>

        <div className="slot-header-right">
          <div className="slot-balance-pill">
            <Coins size={14} className="text-amber-400" />
            <span>₹{Number(balance || 0).toFixed(2)}</span>
          </div>
          <button className="slot-icon-btn" onClick={toggleSound}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="slot-icon-btn" onClick={() => setShowPaytable(true)}>
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Game Tabs */}
      <nav className="slot-tabs-bar">
        {SLOT_GAMES.map(g => (
          <button
            key={g.id}
            className={`slot-tab-pill ${activeGame === g.id ? 'active' : ''}`}
            onClick={() => switchGame(g.id)}
            disabled={isSpinning}
          >
            <span className="tab-icon">{g.icon}</span>
            <span className="tab-name">{g.name}</span>
            {g.badge && <span className="tab-badge">{g.badge}</span>}
          </button>
        ))}
      </nav>

      {/* Main Arcade Slot Cabinet with 3D Bevels */}
      <main className="slot-cabinet">
        {/* Animated Marquee with Running Lights */}
        <div className="cabinet-marquee">
          <div className="marquee-bulb-strip">
            <span className="marquee-bulb b1"></span>
            <span className="marquee-bulb b2"></span>
            <span className="marquee-bulb b3"></span>
          </div>

          <div className="marquee-jackpot">
            <Flame size={16} className="jackpot-fire" />
            <span>TOP JACKPOT: ₹{(betAmount * 1000).toLocaleString()}</span>
            <Sparkles size={14} className="jackpot-sparkle" />
          </div>

          <div className="marquee-bulb-strip">
            <span className="marquee-bulb b3"></span>
            <span className="marquee-bulb b2"></span>
            <span className="marquee-bulb b1"></span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* GAME 1: CRAZY 777 (3 Standard Reels + 1 Bonus Reel)   */}
        {/* ==================================================== */}
        {activeGame === 'crazy777' && (
          <div className="c777-stage">
            {/* Cylindrical Reel 3D Glass Glare Overlays */}
            <div className="reel-glass-glare-top"></div>
            <div className="reel-glass-glare-bottom"></div>

            {/* Glowing Laser Neon Payline */}
            <div className="c777-laser-payline">
              <span className="laser-dot dot-left"></span>
              <span className="laser-dot dot-right"></span>
            </div>

            <div className="c777-reels-wrap">
              {/* 3 Main Reels */}
              {c777Reels.map((symId, idx) => (
                <div
                  key={idx}
                  className={`c777-reel ${isSpinning ? 'spinning' : 'bounce-land'}`}
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="reel-symbol-cell">
                    <SlotSymbol symbol={symId} size={54} />
                  </div>
                </div>
              ))}

              {/* 4th Special Bonus Multiplier Reel */}
              <div
                className={`c777-bonus-reel ${isSpinning ? 'spinning' : 'bounce-land'} ${
                  c777Bonus?.val >= 5 ? 'super-glow' : ''
                }`}
              >
                <div className="bonus-reel-badge">BONUS</div>
                <div className="reel-symbol-cell bonus-cell">
                  <span className="bonus-glyph">{c777Bonus?.label}</span>
                </div>
              </div>
            </div>

            <div className="c777-payline-label">
              <span>⚡ CENTER PAYLINE WINS ⚡</span>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 2: FORTUNE GEMS (3x3 Grid + Multiplier Wheel)   */}
        {/* ==================================================== */}
        {activeGame === 'fortunegems' && (
          <div className="fg-stage">
            <div className="reel-glass-glare-top"></div>
            <div className="reel-glass-glare-bottom"></div>

            <div className="fg-grid-box">
              {fgGrid.map((row, rIdx) => (
                <div key={rIdx} className="fg-row">
                  {row.map((symId, cIdx) => {
                    const isWinning = fgWinningLines.some(l =>
                      l.coords.some(([r, c]) => r === rIdx && c === cIdx)
                    )
                    return (
                      <div
                        key={cIdx}
                        className={`fg-cell ${isSpinning ? 'spinning' : 'bounce-land'} ${
                          isWinning ? 'win-cell' : ''
                        }`}
                      >
                        <SlotSymbol symbol={symId} size={36} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 4th Animated Multiplier Wheel */}
            <div className="fg-mult-box">
              <span className="fg-mult-title">WHEEL</span>
              <div className={`fg-mult-display ${isSpinning ? 'wheel-spinning' : 'wheel-locked'}`}>
                <div className="mult-ring-glow"></div>
                <span className="mult-number-txt">{fgMult}</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 3: SUPER ACE (5x4 Card Grid + Combo Chain)      */}
        {/* ==================================================== */}
        {activeGame === 'superace' && (
          <div className="sa-stage">
            <div className="sa-combo-bar">
              <span className={`combo-pill ${saCombo === 1 ? 'active' : ''}`}>1X</span>
              <ChevronRight size={14} className="combo-arrow" />
              <span className={`combo-pill ${saCombo === 2 ? 'active' : ''}`}>2X</span>
              <ChevronRight size={14} className="combo-arrow" />
              <span className={`combo-pill ${saCombo === 3 ? 'active' : ''}`}>3X</span>
              <ChevronRight size={14} className="combo-arrow" />
              <span className={`combo-pill ${saCombo >= 5 ? 'active' : ''}`}>5X COMBO</span>
            </div>

            <div className="sa-matrix-box">
              {saMatrix.map((row, rIdx) => (
                <div key={rIdx} className="sa-row">
                  {row.map((symId, cIdx) => (
                    <div
                      key={cIdx}
                      className={`sa-cell ${isSpinning ? 'spinning' : 'bounce-land'}`}
                    >
                      <SlotSymbol symbol={symId} size={28} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="sa-ways-badge">⚡ 243 WAYS TO WIN ⚡</div>
          </div>
        )}

        {/* Dynamic Win Bar with Counting Number Animation */}
        <div className="slot-win-bar">
          <div className="win-metric">
            <span className="label">WIN</span>
            <span className={`val ${displayWin > 0 ? 'highlight-pulse' : ''}`}>
              ₹{displayWin.toFixed(2)}
            </span>
          </div>

          {lastMultiplier > 0 && (
            <div className="mult-metric">
              <Sparkles size={15} className="sparkle-spin" />
              <span>{lastMultiplier}X PAYOUT</span>
            </div>
          )}
        </div>
      </main>

      {/* Control Deck with 3D Chips & Spin Button */}
      <footer className="slot-controls">
        <div className="quick-bet-strip">
          {QUICK_BETS.map(amt => (
            <button
              key={amt}
              className={`chip-btn ${betAmount === amt ? 'active' : ''}`}
              onClick={() => setBetAmount(amt)}
              disabled={isSpinning}
            >
              ₹{amt}
            </button>
          ))}
        </div>

        <div className="slot-action-deck">
          <div className="toggle-group">
            <button
              className={`toggle-icon-btn ${isTurbo ? 'active' : ''}`}
              onClick={() => setIsTurbo(t => !t)}
              title="Turbo Mode"
            >
              <Zap size={16} />
              <span>Turbo</span>
            </button>

            {autoSpinsLeft > 0 ? (
              <button className="toggle-icon-btn active auto-btn" onClick={stopAutoSpin}>
                <Square size={14} />
                <span>{autoSpinsLeft}</span>
              </button>
            ) : (
              <button
                className="toggle-icon-btn"
                onClick={() => setAutoSpinsLeft(20)}
                disabled={isSpinning}
              >
                <Play size={14} />
                <span>Auto 20</span>
              </button>
            )}
          </div>

          <div className="bet-stepper">
            <button
              className="stepper-btn"
              onClick={() => setBetAmount(b => Math.max(1, b - 5))}
              disabled={isSpinning || betAmount <= 1}
            >
              -
            </button>
            <div className="stepper-val">
              <span className="stepper-label">TOTAL BET</span>
              <span className="stepper-amount">₹{betAmount}</span>
            </div>
            <button
              className="stepper-btn"
              onClick={() => setBetAmount(b => b + 10)}
              disabled={isSpinning}
            >
              +
            </button>
          </div>

          <button
            className={`massive-spin-btn ${isSpinning ? 'spinning' : ''}`}
            onClick={spin}
            disabled={isSpinning}
          >
            {isSpinning ? (
              <RefreshCw size={28} className="spin-anim" />
            ) : (
              <>
                <span className="spin-btn-text">SPIN</span>
                <span className="spin-btn-sub">₹{betAmount}</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* 3D WIN CELEBRATION MODAL WITH BURST RAYS */}
      {winCelebration && (
        <div className="slot-celebration-backdrop" onClick={() => setWinCelebration(null)}>
          <div className="slot-celebration-card">
            <div className="celebration-sunburst"></div>
            <div className="celebration-burst">🏆</div>
            <h2 className="celebration-title">{winCelebration.title}</h2>
            <div className="celebration-amount">₹{winCelebration.amount.toFixed(2)}</div>
            <div className="celebration-mult">
              <Sparkles size={16} /> {winCelebration.mult}X MASSIVE MULTIPLIER!
            </div>
            <button className="celebration-claim-btn" onClick={() => setWinCelebration(null)}>
              COLLECT WINNINGS
            </button>
          </div>
        </div>
      )}

      {/* PAYTABLE MODAL */}
      {showPaytable && (
        <div className="slot-paytable-overlay" onClick={() => setShowPaytable(false)}>
          <div className="slot-paytable-card" onClick={e => e.stopPropagation()}>
            <div className="paytable-header">
              <h3>{SLOT_GAMES.find(g => g.id === activeGame)?.name} Paytable</h3>
              <button onClick={() => setShowPaytable(false)}><X size={18} /></button>
            </div>
            <div className="paytable-body">
              {activeGame === 'crazy777' && (
                <div className="pay-grid">
                  <div className="pay-row"><span>Triple 777</span><strong>100X</strong></div>
                  <div className="pay-row"><span>Double 77</span><strong>40X</strong></div>
                  <div className="pay-row"><span>Single 7</span><strong>20X</strong></div>
                  <div className="pay-row"><span>Any 3 7s Mixed</span><strong>5X</strong></div>
                  <div className="pay-row"><span>3x BAR</span><strong>10X</strong></div>
                  <div className="pay-row"><span>2x BAR</span><strong>5X</strong></div>
                  <div className="pay-row"><span>1x BAR</span><strong>2X</strong></div>
                  <div className="pay-row"><span>Bell</span><strong>1.5X</strong></div>
                  <div className="pay-row"><span>Cherry</span><strong>1X</strong></div>
                  <div className="pay-note">4th Bonus Reel adds up to 10X multiplier or +5X direct cash!</div>
                </div>
              )}
              {activeGame === 'fortunegems' && (
                <div className="pay-grid">
                  <div className="pay-row"><span>Garuda Wild (Substitutes all)</span><strong>25X</strong></div>
                  <div className="pay-row"><span>Red Ruby</span><strong>15X</strong></div>
                  <div className="pay-row"><span>Blue Sapphire</span><strong>10X</strong></div>
                  <div className="pay-row"><span>Green Emerald</span><strong>8X</strong></div>
                  <div className="pay-row"><span>King / Ace</span><strong>5X / 3X</strong></div>
                  <div className="pay-note">8 Paylines. 4th Multiplier Wheel multiplies all line wins up to 15X!</div>
                </div>
              )}
              {activeGame === 'superace' && (
                <div className="pay-grid">
                  <div className="pay-row"><span>Golden Joker Wild</span><strong>100X</strong></div>
                  <div className="pay-row"><span>Ace of Spades</span><strong>50X</strong></div>
                  <div className="pay-row"><span>King of Hearts</span><strong>30X</strong></div>
                  <div className="pay-row"><span>Queen of Clubs</span><strong>20X</strong></div>
                  <div className="pay-note">243 Ways to win! Consecutive combo cascades trigger up to 5X multiplier.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InHouseSlotArena
