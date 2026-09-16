import React from 'react'

/**
 * High-Definition Vector Casino Symbols with Metallic Gradients & 3D Shading
 */
export function SlotSymbol({ symbol, size = 48, className = '' }) {
  const sym = String(symbol || '').toUpperCase()

  // 1. CRAZY 777: TRIPLE GOLDEN 777
  if (sym.includes('S777') || sym === '7️⃣7️⃣7️⃣') {
    return (
      <div className={`slot-gfx-symbol sym-777 ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="gold777" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <filter id="fireGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
            </filter>
          </defs>
          <g filter="url(#fireGlow)">
            {/* Left 7 */}
            <path d="M12 18 L26 18 L19 46 L13 46 L19 23 L12 23 Z" fill="url(#gold777)" stroke="#fef08a" strokeWidth="0.8" />
            {/* Center 7 (Elevated) */}
            <path d="M25 14 L41 14 L33 50 L27 50 L33 19 L25 19 Z" fill="url(#gold777)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Right 7 */}
            <path d="M38 18 L52 18 L45 46 L39 46 L45 23 L38 23 Z" fill="url(#gold777)" stroke="#fef08a" strokeWidth="0.8" />
          </g>
          {/* Sparkles */}
          <circle cx="34" cy="16" r="2.5" fill="#ffffff" />
          <circle cx="20" cy="20" r="1.5" fill="#ffffff" />
        </svg>
      </div>
    )
  }

  // 2. CRAZY 777: DOUBLE CRIMSON 77
  if (sym.includes('S77') || sym === '7️⃣7️⃣') {
    return (
      <div className={`slot-gfx-symbol sym-77 ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="red77" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="80%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <filter id="redGlow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.7" />
            </filter>
          </defs>
          <g filter="url(#redGlow)">
            <path d="M16 16 L32 16 L24 48 L18 48 L24 22 L16 22 Z" fill="url(#red77)" stroke="#fecaca" strokeWidth="1" />
            <path d="M32 16 L48 16 L40 48 L34 48 L40 22 L32 22 Z" fill="url(#red77)" stroke="#fecaca" strokeWidth="1" />
          </g>
        </svg>
      </div>
    )
  }

  // 3. CRAZY 777: SINGLE ELECTRIC BLUE 7
  if (sym === 'S7' || sym === '7️⃣') {
    return (
      <div className={`slot-gfx-symbol sym-7 ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="blue7" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <filter id="blueGlow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
          </defs>
          <path d="M22 16 L44 16 L34 50 L27 50 L35 22 L22 22 Z" fill="url(#blue7)" stroke="#e0f2fe" strokeWidth="1.2" filter="url(#blueGlow)" />
        </svg>
      </div>
    )
  }

  // 4. CRAZY 777: 3x GOLDEN BAR
  if (sym.includes('BAR3') || sym === '🎰') {
    return (
      <div className={`slot-gfx-symbol sym-bar3 ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="barGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* 3 stacked gold ingots */}
          <rect x="8" y="14" width="48" height="9" rx="3" fill="url(#barGold)" stroke="#fef08a" strokeWidth="0.8" />
          <text x="32" y="21" fill="#78350f" fontSize="7" fontWeight="900" textAnchor="middle">BAR</text>

          <rect x="8" y="27" width="48" height="9" rx="3" fill="url(#barGold)" stroke="#fef08a" strokeWidth="0.8" />
          <text x="32" y="34" fill="#78350f" fontSize="7" fontWeight="900" textAnchor="middle">BAR</text>

          <rect x="8" y="40" width="48" height="9" rx="3" fill="url(#barGold)" stroke="#fef08a" strokeWidth="0.8" />
          <text x="32" y="47" fill="#78350f" fontSize="7" fontWeight="900" textAnchor="middle">BAR</text>
        </svg>
      </div>
    )
  }

  // 5. CRAZY 777: 2x SILVER BAR
  if (sym.includes('BAR2') || sym === '🍫') {
    return (
      <div className={`slot-gfx-symbol sym-bar2 ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="barSilver" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          <rect x="10" y="20" width="44" height="10" rx="3" fill="url(#barSilver)" stroke="#ffffff" strokeWidth="0.8" />
          <text x="32" y="28" fill="#1e293b" fontSize="8" fontWeight="900" textAnchor="middle">BAR</text>

          <rect x="10" y="35" width="44" height="10" rx="3" fill="url(#barSilver)" stroke="#ffffff" strokeWidth="0.8" />
          <text x="32" y="43" fill="#1e293b" fontSize="8" fontWeight="900" textAnchor="middle">BAR</text>
        </svg>
      </div>
    )
  }

  // 6. CRAZY 777: 1x BRONZE BAR
  if (sym.includes('BAR1') || sym === '➖') {
    return (
      <div className={`slot-gfx-symbol sym-bar1 ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="barBronze" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>
          <rect x="12" y="26" width="40" height="12" rx="3" fill="url(#barBronze)" stroke="#ffedd5" strokeWidth="1" />
          <text x="32" y="35" fill="#431407" fontSize="9" fontWeight="900" textAnchor="middle">BAR</text>
        </svg>
      </div>
    )
  }

  // 7. GOLDEN BELL
  if (sym.includes('BELL') || sym === '🔔') {
    return (
      <div className={`slot-gfx-symbol sym-bell ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="bellGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          <path d="M32 14 C24 14 20 24 18 36 L14 42 C13 44 14 46 17 46 L47 46 C50 46 51 44 50 42 L46 36 C44 24 40 14 32 14 Z" fill="url(#bellGold)" stroke="#fef08a" strokeWidth="1" />
          <circle cx="32" cy="49" r="4" fill="#92400e" stroke="#fbbf24" strokeWidth="1" />
          <circle cx="28" cy="22" r="2" fill="#ffffff" opacity="0.6" />
        </svg>
      </div>
    )
  }

  // 8. GLOSSY CHERRIES
  if (sym.includes('CHERRY') || sym === '🍒') {
    return (
      <div className={`slot-gfx-symbol sym-cherry ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <radialGradient id="cherryRed" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#dc2626" />
              <stop offset="85%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
          </defs>
          {/* Stems */}
          <path d="M38 16 Q30 26 24 36" stroke="#15803d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M38 16 Q42 26 42 38" stroke="#15803d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M38 16 Q48 14 46 22" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Left Cherry */}
          <circle cx="23" cy="40" r="10" fill="url(#cherryRed)" stroke="#fca5a5" strokeWidth="0.8" />
          <circle cx="20" cy="37" r="2.5" fill="#ffffff" opacity="0.7" />
          {/* Right Cherry */}
          <circle cx="42" cy="42" r="10" fill="url(#cherryRed)" stroke="#fca5a5" strokeWidth="0.8" />
          <circle cx="39" cy="39" r="2.5" fill="#ffffff" opacity="0.7" />
        </svg>
      </div>
    )
  }

  // 9. FORTUNE GEMS: GARUDA WILD
  if (sym.includes('GARUDA') || sym === '🦅') {
    return (
      <div className={`slot-gfx-symbol sym-garuda ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="garudaGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <filter id="garudaGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#eab308" floodOpacity="0.9" />
            </filter>
          </defs>
          {/* Golden Wings */}
          <path d="M32 20 C20 10 8 16 4 32 C12 28 22 30 32 36 C42 30 52 28 60 32 C56 16 44 10 32 20 Z" fill="url(#garudaGold)" filter="url(#garudaGlow)" />
          {/* Garuda Head & Crown */}
          <path d="M32 12 L35 18 L38 14 L36 22 L32 30 L28 22 L26 14 L29 18 Z" fill="#ffffff" />
          {/* Center Red Ruby Eye */}
          <circle cx="32" cy="24" r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />
          {/* Banner */}
          <rect x="14" y="44" width="36" height="12" rx="4" fill="#b91c1c" stroke="#fef08a" strokeWidth="1" />
          <text x="32" y="53" fill="#ffffff" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="1">WILD</text>
        </svg>
      </div>
    )
  }

  // 10. FORTUNE GEMS: RADIANT RUBY
  if (sym.includes('RUBY') || sym === '💎') {
    return (
      <div className={`slot-gfx-symbol sym-ruby ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="40%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>
          <polygon points="20,16 44,16 54,28 32,52 10,28" fill="url(#rubyGrad)" stroke="#fee2e2" strokeWidth="1.2" />
          <polygon points="20,16 32,28 44,16" fill="#f87171" opacity="0.6" />
          <polygon points="10,28 32,28 32,52" fill="#b91c1c" opacity="0.8" />
          <polygon points="54,28 32,28 32,52" fill="#ef4444" opacity="0.9" />
          <circle cx="28" cy="22" r="2" fill="#ffffff" opacity="0.8" />
        </svg>
      </div>
    )
  }

  // 11. FORTUNE GEMS: BLUE SAPPHIRE
  if (sym.includes('SAPPHIRE') || sym === '🔷') {
    return (
      <div className={`slot-gfx-symbol sym-sapphire ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="sapphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="40%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <polygon points="32,12 52,32 32,52 12,32" fill="url(#sapphGrad)" stroke="#dbeafe" strokeWidth="1.2" />
          <polygon points="32,18 46,32 32,46 18,32" fill="#60a5fa" opacity="0.6" />
          <circle cx="32" cy="26" r="2.5" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>
    )
  }

  // 12. FORTUNE GEMS: GREEN EMERALD
  if (sym.includes('EMERALD') || sym === '🟢') {
    return (
      <div className={`slot-gfx-symbol sym-emerald ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="emGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="40%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
          </defs>
          <polygon points="22,14 42,14 52,24 52,44 42,54 22,54 12,44 12,24" fill="url(#emGrad)" stroke="#dcfce7" strokeWidth="1.2" />
          <circle cx="28" cy="24" r="3" fill="#ffffff" opacity="0.8" />
        </svg>
      </div>
    )
  }

  // 13. SUPER ACE: JOKER WILD
  if (sym.includes('WILD') || sym === '🃏') {
    return (
      <div className={`slot-gfx-symbol sym-joker ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="jokerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="40%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="24" fill="url(#jokerGrad)" stroke="#fef08a" strokeWidth="1.5" />
          {/* Jester Hat */}
          <path d="M16 26 C20 14 26 12 32 18 C38 12 44 14 48 26 C42 28 32 30 16 26 Z" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="16" cy="26" r="3" fill="#ffffff" />
          <circle cx="32" cy="18" r="3" fill="#ffffff" />
          <circle cx="48" cy="26" r="3" fill="#ffffff" />
          {/* Joker Face Smile */}
          <path d="M22 38 Q32 48 42 38" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  // 14. SUPER ACE: ACE OF SPADES
  if (sym.includes('ACE') || sym === '♠️') {
    return (
      <div className={`slot-gfx-symbol sym-ace ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="slot-svg">
          <defs>
            <linearGradient id="aceGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
          </defs>
          <path d="M32 12 C28 22 16 28 16 36 C16 42 22 46 28 44 C30 43 31 41 32 40 C33 41 34 43 36 44 C42 46 48 42 48 36 C48 28 36 22 32 12 Z" fill="url(#aceGold)" stroke="#ffffff" strokeWidth="1" />
          <path d="M29 44 L26 52 L38 52 L35 44 Z" fill="url(#aceGold)" />
          <text x="32" y="38" fill="#1e1929" fontSize="10" fontWeight="900" textAnchor="middle">A</text>
        </svg>
      </div>
    )
  }

  // Fallback: styled text/emoji
  return (
    <div className={`slot-gfx-symbol sym-fallback ${className}`} style={{ width: size, height: size }}>
      <span className="fallback-glyph">{symbol}</span>
    </div>
  )
}

export default SlotSymbol
