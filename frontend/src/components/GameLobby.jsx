import React, { useState } from 'react'
import {
  Star,
  Flame,
  Zap,
  Activity,
  Trophy,
  Coins,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles,
  Compass,
} from 'lucide-react'

export function GameLobby({ onSelectGame, userBalance = 0, onOpenDeposit, onOpenWithdraw }) {
  // Recommended games matching user screenshot
  const recommendedGames = [
    {
      id: 'aviator',
      name: 'AVIATOR',
      rtp: '96.45%',
      type: 'crash',
      theme: 'aviator',
      accent: '#ef4444',
      badge: 'HOT',
    },
    {
      id: 'vortex',
      name: 'VORTEX',
      rtp: '96.11%',
      type: 'multiplier',
      theme: 'vortex',
      accent: '#8b5cf6',
      badge: 'NEW',
    },
    {
      id: 'wingo',
      name: 'WINGO',
      rtp: '96.86%',
      type: 'color',
      theme: 'wingo',
      accent: '#f97316',
      badge: 'POPULAR',
    },
    {
      id: 'cricket',
      name: 'CRICKET',
      rtp: '97.82%',
      type: 'sports',
      theme: 'cricket',
      accent: '#84cc16',
      badge: 'LIVE',
    },
    {
      id: 'pubg',
      name: 'PUBG 1MIN',
      rtp: '97.06%',
      type: 'battle',
      theme: 'pubg',
      accent: '#eab308',
      badge: '1 MIN',
    },
    {
      id: 'kraken',
      name: 'POWER OF THE KRAKEN',
      rtp: '96.88%',
      type: 'slots',
      theme: 'kraken',
      accent: '#06b6d4',
      badge: 'MEGA',
    },
  ]

  // Top games matching user screenshot
  const topGames = [
    {
      id: 'jili_nudge',
      name: 'EX NUDGE 500',
      rtp: '97.20%',
      provider: 'JILI',
      theme: 'jili_nudge',
      accent: '#f59e0b',
    },
    {
      id: 'jili_wheel',
      name: 'LUCKY WHEEL',
      rtp: '97.50%',
      provider: 'JILI',
      theme: 'jili_wheel',
      accent: '#ec4899',
    },
    {
      id: 'jili_santa',
      name: 'DRAGON SANTA',
      rtp: '96.90%',
      provider: 'JILI',
      theme: 'jili_santa',
      accent: '#ef4444',
    },
    {
      id: 'coinflip',
      name: '3D COIN FLIP',
      rtp: '98.00%',
      provider: 'IN-HOUSE',
      theme: 'coinflip',
      accent: '#fbbf24',
    },
    {
      id: 'andarbahar',
      name: 'ANDAR BAHAR',
      rtp: '98.50%',
      provider: 'IN-HOUSE',
      theme: 'andarbahar',
      accent: '#a855f7',
    },
    {
      id: 'wingo',
      name: 'WIN GO 30S',
      rtp: '98.60%',
      provider: 'VEER',
      theme: 'wingo_veer',
      accent: '#10b981',
    },
  ]

  const renderCardArt = (theme) => {
    switch (theme) {
      case 'aviator':
        return (
          <div className="card-art-box aviator-art">
            <div className="art-plane-glow" />
            <svg viewBox="0 0 100 60" className="art-plane-svg">
              <path
                d="M10 40 L60 25 L85 10 L70 24 L95 22 L98 25 L75 32 L60 48 L52 46 L58 35 L30 40 Z"
                fill="#ef4444"
              />
              <circle cx="92" cy="18" r="2" fill="#fca5a5" />
            </svg>
            <div className="art-aviator-logo">Aviator</div>
            <div className="art-bottom-title">AVIATOR</div>
          </div>
        )

      case 'vortex':
        return (
          <div className="card-art-box vortex-art">
            <div className="art-vortex-rings">
              <div className="vortex-ring ring-3" />
              <div className="vortex-ring ring-2" />
              <div className="vortex-ring ring-1">
                <Flame size={20} className="vortex-fire" />
              </div>
            </div>
            <div className="art-bottom-title glow-cyan">VORTEX</div>
          </div>
        )

      case 'wingo':
        return (
          <div className="card-art-box wingo-art">
            <div className="art-ball-group">
              <div className="lottery-ball white-ball">
                <span>7</span>
              </div>
              <div className="lottery-ball violet-ball">
                <span>8</span>
              </div>
              <div className="rupee-coin">
                <span>₹</span>
              </div>
            </div>
            <div className="art-bottom-title glow-white">WINGO</div>
          </div>
        )

      case 'cricket':
        return (
          <div className="card-art-box cricket-art">
            <div className="cricket-shield-logo">
              <div className="cricket-ball-art" />
              <div className="wickets-art">
                <span />
                <span />
                <span />
              </div>
              <div className="cricket-text-art">CRICKET</div>
            </div>
            <div className="art-bottom-title">CRICKET</div>
          </div>
        )

      case 'pubg':
        return (
          <div className="card-art-box pubg-art">
            <div className="pubg-helmet-art">
              <div className="helmet-gold-visor" />
              <div className="pubg-tag-min">1 MIN</div>
            </div>
            <div className="pubg-title-block">PUBG</div>
            <div className="art-bottom-title">PUBG 1MIN</div>
          </div>
        )

      case 'kraken':
        return (
          <div className="card-art-box kraken-art">
            <div className="kraken-monster-art">
              <div className="kraken-tentacle left" />
              <div className="kraken-face">
                <span className="kraken-eye" />
                <span className="kraken-eye" />
              </div>
              <div className="kraken-tentacle right" />
            </div>
            <div className="art-bottom-title small-title">POWER OF THE KRAKEN</div>
          </div>
        )

      case 'jili_nudge':
        return (
          <div className="card-art-box jili-nudge-art">
            <span className="jili-top-tag">JILI</span>
            <div className="phoenix-mask-art">👑</div>
            <div className="art-slot-title">EX NUDGE 500</div>
          </div>
        )

      case 'jili_wheel':
        return (
          <div className="card-art-box jili-wheel-art">
            <span className="jili-top-tag">JILI</span>
            <div className="wheel-spin-art">🎡</div>
            <div className="art-slot-title">FORTUNE WHEEL</div>
          </div>
        )

      case 'jili_santa':
        return (
          <div className="card-art-box jili-santa-art">
            <span className="jili-top-tag">JILI</span>
            <div className="santa-dragon-art">🐉🎅</div>
            <div className="art-slot-title">DRAGON SANTA</div>
          </div>
        )

      case 'coinflip':
        return (
          <div className="card-art-box coin-art">
            <div className="coin-gold-spin">🪙</div>
            <div className="art-bottom-title">3D COIN FLIP</div>
          </div>
        )

      case 'andarbahar':
        return (
          <div className="card-art-box ab-art">
            <div className="ab-cards-fan">🂡 🂮</div>
            <div className="art-bottom-title">ANDAR BAHAR</div>
          </div>
        )

      default:
        return (
          <div className="card-art-box default-art">
            <Activity size={24} />
            <div className="art-bottom-title">WIN GO</div>
          </div>
        )
    }
  }

  return (
    <div className="arcade-lobby-wrapper">
      {/* SECTION 1: Recommended Games (Exactly matching screenshot) */}
      <div className="lobby-section">
        <div className="lobby-section-header">
          <Star size={20} className="section-star-icon" fill="#f59e0b" color="#f59e0b" />
          <h2 className="section-heading-title">Recommended Games</h2>
        </div>

        <div className="arcade-3col-grid">
          {recommendedGames.map((game) => (
            <div
              key={game.id}
              className="arcade-card-unit"
              onClick={() => onSelectGame(game.id)}
            >
              {/* Card visual artwork container */}
              <div className={`arcade-card-face theme-${game.theme}`}>
                {renderCardArt(game.theme)}
              </div>

              {/* RTP Pill below card */}
              <div className="arcade-rtp-pill">
                <span className="rtp-text">RTP</span>
                <span className="rtp-value">{game.rtp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Top Games (Matching screenshot) */}
      <div className="lobby-section">
        <div className="lobby-section-header">
          <Star size={20} className="section-star-icon" fill="#f59e0b" color="#f59e0b" />
          <h2 className="section-heading-title">Top Games</h2>
        </div>

        <div className="arcade-3col-grid">
          {topGames.map((game, idx) => (
            <div
              key={`${game.id}-${idx}`}
              className="arcade-card-unit"
              onClick={() => onSelectGame(game.id.startsWith('jili') ? 'vortex' : game.id)}
            >
              <div className={`arcade-card-face theme-${game.theme}`}>
                {renderCardArt(game.theme)}
              </div>

              <div className="arcade-rtp-pill">
                <span className="rtp-text">RTP</span>
                <span className="rtp-value">{game.rtp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
