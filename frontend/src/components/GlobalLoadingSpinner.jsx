import React, { useState, useEffect } from 'react'

// Global Loading Event Bus for zero-dependency universal site-wide loading control
const loadingListeners = new Set()
let activeRequestCount = 0
let currentLoadingText = 'Loading...'
let showOverlayGlobal = false

export function triggerLoadingStart(text = 'Loading...', withOverlay = false) {
  activeRequestCount++
  if (text) currentLoadingText = text
  if (withOverlay) showOverlayGlobal = true
  notifyListeners()
}

export function triggerLoadingEnd() {
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  if (activeRequestCount === 0) {
    showOverlayGlobal = false
    currentLoadingText = 'Loading...'
  }
  notifyListeners()
}

export function forceHideLoading() {
  activeRequestCount = 0
  showOverlayGlobal = false
  notifyListeners()
}

function notifyListeners() {
  loadingListeners.forEach((listener) => {
    try {
      listener({
        isLoading: activeRequestCount > 0,
        count: activeRequestCount,
        text: currentLoadingText,
        showOverlay: showOverlayGlobal,
      })
    } catch {}
  })
}

export function GlobalLoadingSpinner() {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    count: 0,
    text: 'Loading...',
    showOverlay: false,
  })

  useEffect(() => {
    loadingListeners.add(setLoadingState)
    return () => {
      loadingListeners.delete(setLoadingState)
    }
  }, [])

  if (!loadingState.isLoading) return null

  return (
    <>
      {/* 1. Universal Top Loading Progress Bar */}
      <div className="site-top-loader-bar">
        <div className="site-top-loader-progress" />
      </div>

      {/* 2. Global Branded Loading Spinner Overlay */}
      {loadingState.showOverlay && (
        <div className="site-loading-overlay">
          <div className="site-loading-card">
            <div className="site-loading-spinner-ring">
              <div className="spinner-inner-dot" />
            </div>
            <div className="site-loading-brand">
              <span className="brand-badge">55</span>
              <span className="brand-name">CLUB</span>
            </div>
            <div className="site-loading-text">{loadingState.text}</div>
          </div>
        </div>
      )}
    </>
  )
}

export default GlobalLoadingSpinner
