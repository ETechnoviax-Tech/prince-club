import React, { useState, useEffect } from 'react'

// Global Loading Event Bus for zero-dependency universal site-wide loading control
const loadingListeners = new Set()
const activeRequests = new Set()
let currentLoadingText = 'Loading...'
let showOverlayGlobal = false
let safetyTimer = null
const MAX_LOADING_DURATION_MS = 60000

export function triggerLoadingStart(text = 'Loading...', withOverlay = false) {
  const requestToken = Symbol('global-loading-request')
  activeRequests.add(requestToken)
  if (text) currentLoadingText = text
  if (withOverlay) showOverlayGlobal = true
  if (!safetyTimer) {
    safetyTimer = setTimeout(() => {
      safetyTimer = null
      forceHideLoading()
    }, MAX_LOADING_DURATION_MS)
  }
  notifyListeners()
  return requestToken
}

export function triggerLoadingEnd(requestToken) {
  if (requestToken) activeRequests.delete(requestToken)
  else {
    const firstToken = activeRequests.values().next().value
    if (firstToken) activeRequests.delete(firstToken)
  }
  if (activeRequests.size === 0) {
    if (safetyTimer) {
      clearTimeout(safetyTimer)
      safetyTimer = null
    }
    showOverlayGlobal = false
    currentLoadingText = 'Loading...'
  }
  notifyListeners()
}

export function forceHideLoading() {
  activeRequests.clear()
  if (safetyTimer) {
    clearTimeout(safetyTimer)
    safetyTimer = null
  }
  showOverlayGlobal = false
  currentLoadingText = 'Loading...'
  notifyListeners()
}

function notifyListeners() {
  loadingListeners.forEach((listener) => {
    try {
      listener({
        isLoading: activeRequests.size > 0,
        count: activeRequests.size,
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
