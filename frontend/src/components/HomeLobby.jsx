import React, { useState, useEffect } from 'react'
import {
  Volume2,
  VolumeX,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  DownloadCloud,
  Mail,
  ChevronLeft,
  ChevronRight,
  Star,
  Gamepad2,
  Coins,
  ShieldCheck,
  Flame,
  Crown,
} from 'lucide-react'

export function HomeLobby({
  balance,
  onRefreshBalance,
  onOpenWithdraw,
  onOpenDeposit,
  onOpenFortuneWheel,
  onOpenVIP,
  onSelectGame,
  onDownloadApp,
  onMessages,
  onAddToDesktop,
}) {
  const [activeCategory, setActiveCategory] = useState('lobby')
  const [marqueeIndex, setMarqueeIndex] = useState(0)
  const [showDesktopPill, setShowDesktopPill] = useState(true)

  const announcements = [
    'All players registered on this platform must bind their bank data. If a non-personal bank account is bound, please withdraw all your balance and re-register.',
    '🎉 Welcome to PRINCE CLUB! Get up to ₹500 on your first daily fortune spin!',
    '⚡ Instant UPI & Bank withdrawals processed 24/7 with zero processing fees.',
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setMarqueeIndex((prev) => (prev + 1) % announcements.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [announcements.length])

  const categories = [
    { id: 'lobby', label: 'Lobby', icon: '🏠' },
    { id: 'minigame', label: 'Mini game', icon: '🎮' },
    { id: 'slots', label: 'Slots', icon: '🎰' },
    { id: 'card', label: 'Card', icon: '🃏' },
    { id: 'fishing', label: 'Fishing', icon: '🦈' },
    { id: 'original', label: 'Original', icon: '🎲' },
  ]

  const handleCategorySelect = (catId) => {
    setActiveCategory(catId)
    if (catId === 'lobby') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (catId === 'minigame') {
      document.getElementById('section-minigame')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (catId === 'slots') {
      document.getElementById('section-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (catId === 'card' || catId === 'fishing') {
      document.getElementById('section-lottery')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (catId === 'original') {
      document.getElementById('section-recommended')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="home-55-container">
      {/* 1. Top Header Bar */}
      <header className="home-55-header">
        <div className="home-55-brand">
          <div className="brand-55-logo-circle">
            <Crown size={11} className="brand-pc-crown" />
            <span className="brand-55-num">PC</span>
          </div>
          <span className="brand-55-text">PRINCE CLUB</span>
        </div>

        <button
          className="home-55-download-btn"
          title="Download Official App"
          onClick={onDownloadApp}
        >
          <div className="download-cloud-icon">
            <DownloadCloud size={18} />
          </div>
        </button>
      </header>

      {/* 2. Scrolling Announcement Bar */}
      <div className="home-55-marquee-bar">
        <div className="marquee-speaker-icon">📢</div>
        <div className="marquee-track">
          <span className="marquee-text" key={marqueeIndex}>
            {announcements[marqueeIndex]}
          </span>
        </div>
        <button className="marquee-mail-btn" title="Messages" onClick={onMessages}>
          <Mail size={16} />
          <span className="marquee-dot" />
        </button>
      </div>

      {/* 3. Hero Carousel Banner */}
      <div className="home-55-hero-banner">
        <div className="hero-banner-content">
          <div className="hero-left-col">
            <div className="hero-55-stamp">
              <span className="stamp-circle">👑</span>
              <span className="stamp-text">PRINCECLUB.COM</span>
            </div>
            <h3 className="hero-title-main">WIN BIG REWARDS</h3>
            <p className="hero-desc-hindi">
              PRINCE CLUB ऐप इंस्टॉल करें और दैनिक नकद पुरस्कार प्राप्त करें
            </p>
            <div className="hero-phones-mockup">
              <div className="phone-mini-card">
                <span className="warp-badge">WARP</span>
                <span className="status-on">ON</span>
              </div>
            </div>
          </div>
          <div className="hero-model-visual">
            <div className="model-cards-fan">🃏🂡🂮</div>
            <div className="model-avatar-graphic">💃</div>
          </div>
        </div>
      </div>

      {/* 4. Wallet Balance & Action Row */}
      <div className="home-55-wallet-section">
        <div className="wallet-55-left">
          <div className="wallet-55-label">
            <span className="wallet-coin-icon">🟡</span>
            <span>Wallet balance</span>
          </div>
          <div className="wallet-55-amt-row">
            <span className="wallet-55-currency">₹</span>
            <strong className="wallet-55-balance">{Number(balance).toFixed(2)}</strong>
            <button
              className="wallet-55-refresh-btn"
              onClick={onRefreshBalance}
              title="Refresh Wallet Balance"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="wallet-55-actions">
          <button className="btn-55-withdraw" onClick={onOpenWithdraw}>
            <div className="btn-arrow-circle">
              <ArrowUp size={14} />
            </div>
            <span>Withdraw</span>
          </button>
          <button className="btn-55-deposit" onClick={onOpenDeposit}>
            <div className="btn-arrow-circle">
              <ArrowDown size={14} />
            </div>
            <span>Deposit</span>
          </button>
        </div>
      </div>

      {/* 5. Two Large Feature Cards */}
      <div className="home-55-features-grid">
        <div className="feature-card card-fortune" onClick={onOpenFortuneWheel}>
          <div className="wheel-art-circle">
            <div className="mini-spinning-wheel">🎡</div>
          </div>
          <div className="feature-text">
            <strong>Wheel</strong>
            <span>of fortune</span>
          </div>
        </div>

        <div className="feature-card card-vip" onClick={onOpenVIP}>
          <div className="crown-art-circle">
            <Crown size={28} className="crown-gold" />
          </div>
          <div className="feature-text">
            <strong>VIP</strong>
            <span>privileges</span>
          </div>
        </div>
      </div>

      {/* 6. Horizontal Scrollable Category Tabs Bar */}
      <div className="home-55-categories-bar">
        <div className="categories-scroll-track">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat-tab-btn ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(c.id)}
            >
              <span className="cat-icon">{c.icon}</span>
              <span className="cat-label">{c.label}</span>
            </button>
          ))}
        </div>
        <div className="cat-scroll-indicator">
          <div className="cat-scroll-thumb" />
        </div>
      </div>

      {/* 7. ⭐ Recommended Games Section */}
      <div className="home-55-section" id="section-recommended">
        <div className="section-55-header">
          <div className="section-title-wrap">
            <Star size={16} className="star-gold" />
            <h4 className="section-55-title">Recommended Games</h4>
          </div>
          <div className="section-arrows">
            <button className="arrow-btn"><ChevronLeft size={16} /></button>
            <button className="arrow-btn"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="recommended-cards-grid">
          {/* Card 1: Aviator Dark */}
          <div className="game-card card-aviator-dark" onClick={() => onSelectGame('aviator')}>
            <div className="card-badge-top">HOT</div>
            <div className="aviator-plane-art">✈️</div>
            <h5 className="game-title-aviator">Aviator</h5>
            <span className="game-label-pill">AVIATOR</span>
          </div>

          {/* Card 2: Aviator 500% */}
          <div className="game-card card-aviator-red" onClick={() => onSelectGame('aviator')}>
            <div className="card-badge-corner">10 SEC</div>
            <div className="aviator-500-art">🛩️</div>
            <div className="badge-500">+500%</div>
            <h5 className="game-title-aviator">AVIATOR</h5>
            <small className="game-sub-text">TI GAME</small>
          </div>

          {/* Card 3: WIN GO */}
          <div className="game-card card-wingo-red" onClick={() => onSelectGame('wingo', 'PARITY')}>
            <div className="wingo-55-stamp">PRINCE CLUB</div>
            <div className="wingo-balls-cluster">
              <span className="ball-circle ball-red">9</span>
              <span className="ball-circle ball-green">4</span>
              <span className="ball-circle ball-purple">0</span>
            </div>
            <h5 className="game-title-wingo">WIN GO</h5>
          </div>
        </div>
      </div>

      {/* 8. Lottery Section */}
      <div className="home-55-section" id="section-lottery">
        <div className="lottery-banner-header">
          <div className="lottery-badge-8">8</div>
          <div className="lottery-header-text">
            <h4 className="lottery-title">Lottery</h4>
            <p className="lottery-desc">
              The games are independently developed by our team, fun, fair, and safe
            </p>
          </div>
        </div>

        <div className="lottery-grid-2x2">
          {/* Win Go */}
          <div className="lottery-item-card item-wingo" onClick={() => onSelectGame('wingo', 'PARITY')}>
            <div className="item-art-left">
              <span className="lotto-ball-big">1</span>
              <span className="lotto-ball-small">8</span>
            </div>
            <div className="item-info">
              <strong className="item-title">WIN GO</strong>
              <span className="item-tag">POPULAR</span>
            </div>
          </div>

          {/* K3 */}
          <div className="lottery-item-card item-k3" onClick={() => onSelectGame('wingo', 'SAPRE')}>
            <div className="item-art-left">
              <span className="dice-art">🎲</span>
            </div>
            <div className="item-info">
              <strong className="item-title">K3</strong>
              <span className="item-tag">DICE</span>
            </div>
          </div>

          {/* 5D */}
          <div className="lottery-item-card item-5d" onClick={() => onSelectGame('wingo', 'BCONE')}>
            <div className="item-art-left">
              <span className="drawbox-art">🎰</span>
            </div>
            <div className="item-info">
              <strong className="item-title">5D</strong>
              <span className="item-tag">LOTTERY</span>
            </div>
          </div>

          {/* MOTO RACING */}
          <div className="lottery-item-card item-moto" onClick={() => onSelectGame('wingo', 'EMERD')}>
            <div className="item-art-left">
              <span className="moto-art">🏍️</span>
            </div>
            <div className="item-info">
              <strong className="item-title">MOTO RACING</strong>
              <span className="item-tag">SPEED</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9. Mini game Section */}
      <div className="home-55-section" id="section-minigame">
        <div className="section-55-header">
          <div className="section-title-wrap">
            <Gamepad2 size={16} className="text-purple" />
            <h4 className="section-55-title">Mini game</h4>
          </div>
          <div className="section-right-wrap">
            <button className="detail-btn">Detail</button>
            <button className="arrow-btn"><ChevronLeft size={14} /></button>
            <button className="arrow-btn"><ChevronRight size={14} /></button>
          </div>
        </div>

        <div className="minigames-scroll-grid">
          <div className="minigame-card card-goalwave" onClick={() => onSelectGame('aviator')}>
            <div className="minigame-art">⚽👑</div>
            <div className="minigame-name">GOAL WAVE</div>
            <small className="minigame-sub">TI GAME</small>
          </div>

          <div className="minigame-card card-rocket" onClick={() => onSelectGame('aviator')}>
            <div className="minigame-art">🚀</div>
            <div className="minigame-name">ROCKET</div>
            <small className="minigame-sub">CRASH</small>
          </div>

          <div className="minigame-card card-hilo" onClick={() => onSelectGame('wingo', 'PARITY')}>
            <div className="minigame-art">♦️♠️</div>
            <div className="minigame-name">HILO WAVE</div>
          </div>
        </div>
      </div>

      {/* 10. Slots Section */}
      <div className="home-55-section" id="section-slots">
        <div className="section-55-header">
          <div className="section-title-wrap">
            <span className="slots-icon-badge">🎰</span>
            <h4 className="section-55-title">Slots</h4>
          </div>
          <div className="section-right-wrap">
            <button className="detail-btn">Detail</button>
            <button className="arrow-btn"><ChevronLeft size={14} /></button>
            <button className="arrow-btn"><ChevronRight size={14} /></button>
          </div>
        </div>

        <div className="slots-preview-card" onClick={() => onSelectGame('wingo', 'PARITY')}>
          <div className="slots-art-pharaoh">
            <span className="pharaoh-crown">🔱</span>
            <div className="pharaoh-name">PHARAOH TREASURE</div>
          </div>
        </div>
      </div>

      {/* Floating Add to Desktop Pill */}
      {showDesktopPill && (
        <div className="floating-add-desktop">
          <div className="desktop-55-pill" onClick={onAddToDesktop}>
            <span className="desktop-55-badge">PC</span>
            <span>Add to Desktop</span>
            <button
              className="pill-dismiss-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowDesktopPill(false)
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default HomeLobby
