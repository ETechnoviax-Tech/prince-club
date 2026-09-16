import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, RefreshCw, ExternalLink, Maximize2, Minimize2, X, Loader2,
} from 'lucide-react'
import { fetchGameLaunchUrl } from '../api/client'
import InHouseSlotArena from './InHouseSlotArena'

export function ThirdPartyGameModal({ game, isOpen, onClose, balance, onBalanceUpdate, userId, setToast }) {
  const [state, setState] = useState({ loading: false, url: null, needsOperator: false, openInTab: false, error: null })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const loadGame = useCallback(async () => {
    if (!game) return
    setState({ loading: true, url: null, needsOperator: false, openInTab: false, error: null })
    try {
      const res = await fetchGameLaunchUrl(game.id, game.provider, userId)
      setState({
        loading: false,
        url: res.url || null,
        needsOperator: !!res.needsOperator,
        openInTab: !!res.openInTab,
        error: null,
      })
    } catch (err) {
      setState({ loading: false, url: null, needsOperator: false, openInTab: false, error: err.message })
      setToast?.({ type: 'loss', title: 'Launch Error', detail: err.message })
    }
  }, [game, userId])

  useEffect(() => {
    if (isOpen && game) loadGame()
    return () => setState({ loading: false, url: null, needsOperator: false, openInTab: false, error: null })
  }, [isOpen, game?.id])

  if (!isOpen || !game) return null

  const openTab = () => state.url && window.open(state.url, '_blank', 'noopener,noreferrer')

  return (
    <div className={`game-launcher-overlay ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <div className="game-launcher-shell">

        {/* Header */}
        <header className="launcher-header">
          <button className="launcher-btn" onClick={onClose}><ArrowLeft size={20} /></button>

          <div className="launcher-title-group">
            {game.img && (
              <img src={game.img} alt={game.provider} className="launcher-provider-icon"
                onError={e => e.target.style.display = 'none'} />
            )}
            <div>
              <p className="launcher-game-name">{game.name}</p>
              <span className={`launcher-badge badge-${game.provider.toLowerCase()}`}>{game.provider}</span>
            </div>
          </div>

          <div className="launcher-header-actions">
            <span className="launcher-balance">₹{Number(balance || 0).toFixed(2)}</span>
            <button className="launcher-btn" onClick={loadGame} title="Reload"><RefreshCw size={16} /></button>
            <button className="launcher-btn" onClick={openTab} disabled={!state.url} title="Open in new tab">
              <ExternalLink size={16} />
            </button>
            <button className="launcher-btn" onClick={() => setIsFullscreen(f => !f)}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="launcher-btn close-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        {/* Viewport */}
        <div className="launcher-viewport">

          {/* Loading */}
          {state.loading && (
            <div className="launcher-loading-screen">
              {game.img && <img src={game.img} alt={game.name} className="loading-game-poster"
                onError={e => e.target.style.display = 'none'} />}
              <Loader2 size={44} className="spin-anim" />
              <p className="loading-game-label">Launching <strong>{game.name}</strong>…</p>
              <span className="loading-provider-tag">{game.provider} · Connecting</span>
            </div>
          )}

          {/* Self-Hosted Native In-House Slot Engine (Zero-Fee, Instant Play) */}
          {!state.loading && state.needsOperator && (
            <InHouseSlotArena
              initialGameId={
                game.name?.toLowerCase().includes('gem') || game.name?.toLowerCase().includes('fortune')
                  ? 'fortunegems'
                  : game.name?.toLowerCase().includes('ace')
                  ? 'superace'
                  : 'crazy777'
              }
              userId={userId}
              balance={balance}
              onBalanceUpdate={(newBal) => {
                onBalanceUpdate?.(newBal)
                if (typeof window !== 'undefined' && window.__prince_update_balance) {
                  window.__prince_update_balance(newBal)
                }
              }}
              onClose={onClose}
              setToast={setToast}
            />
          )}

          {/* Error */}
          {!state.loading && state.error && (
            <div className="launcher-error-screen">
              {game.img && <img src={game.img} alt={game.name} className="loading-game-poster"
                onError={e => e.target.style.display = 'none'} />}
              <div className="error-icon">⚠️</div>
              <p className="error-title">Unable to Launch Game</p>
              <p className="error-detail">{state.error}</p>
              <div className="error-actions">
                <button className="retry-launch-btn" onClick={loadGame}><RefreshCw size={16} /> Retry</button>
              </div>
            </div>
          )}

          {/* Real iframe (only when 55club operator API returns a real URL) */}
          {!state.loading && !state.needsOperator && !state.error && state.url && (
            <iframe
              key={state.url}
              src={state.url}
              title={game.name}
              className="game-iframe"
              allow="fullscreen; autoplay; payment"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ThirdPartyGameModal
