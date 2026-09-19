import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronsRight, RotateCw, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { fetchCaptchaChallenge } from '../../api/client.js'

// Scenic background image options (high-res coastal cove / landscape matching official 55club)
const SCENIC_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=640&q=80', // Coastal beach cove
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=640&q=80', // Mountain sunset
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=640&q=80', // Nature landscape
]

export function SliderCaptchaModal({ isOpen, onSuccess, onClose }) {
  const [imageIndex, setImageIndex] = useState(0)
  const [sliderPos, setSliderPos] = useState(0) // 0 to maxDrag
  const [isDragging, setIsDragging] = useState(false)
  const [targetX, setTargetX] = useState(160) // Target slot X
  const [targetY, setTargetY] = useState(50) // Target slot Y
  const [status, setStatus] = useState('idle') // 'idle' | 'success' | 'fail'
  const [statusText, setStatusText] = useState('Hold and slide')
  const [challenge, setChallenge] = useState(null)
  const [challengeError, setChallengeError] = useState('')

  const containerRef = useRef(null)
  const trackRef = useRef(null)
  const bgCanvasRef = useRef(null)
  const pieceCanvasRef = useRef(null)
  const startDragXRef = useRef(0)
  const dragStartedAtRef = useRef(0)
  const dragPathRef = useRef([])
  const startSliderPosRef = useRef(0)
  const imageObjRef = useRef(null)

  const CANVAS_WIDTH = 280
  const CANVAS_HEIGHT = 160
  const PIECE_SIZE = 42
  const TAB_SIZE = 9
  const TRACK_WIDTH = 280
  const HANDLE_WIDTH = 44
  const MAX_DRAG = TRACK_WIDTH - HANDLE_WIDTH

  const renderPuzzle = useCallback((img, randX, randY) => {
    const bgCanvas = bgCanvasRef.current
    const pieceCanvas = pieceCanvasRef.current
    if (!bgCanvas || !pieceCanvas) return

    const bgCtx = bgCanvas.getContext('2d')
    const pCtx = pieceCanvas.getContext('2d')
    bgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (img) {
      bgCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    } else {
      const gradient = bgCtx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      gradient.addColorStop(0, '#2563eb')
      gradient.addColorStop(1, '#14b8a6')
      bgCtx.fillStyle = gradient
      bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      bgCtx.fillStyle = 'rgba(255,255,255,0.18)'
      for (let i = 0; i < 8; i += 1) {
        bgCtx.beginPath()
        bgCtx.arc(24 + i * 42, 30 + ((i * 37) % 100), 14 + (i % 3) * 8, 0, Math.PI * 2)
        bgCtx.fill()
      }
    }

    bgCtx.save()
    drawJigsawPath(bgCtx, randX, randY)
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    bgCtx.fill()
    bgCtx.lineWidth = 2
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    bgCtx.stroke()
    bgCtx.restore()

    pCtx.save()
    drawJigsawPath(pCtx, randX, randY)
    pCtx.clip()
    if (img) {
      pCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    } else {
      pCtx.fillStyle = '#fbbf24'
      pCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
    pCtx.lineWidth = 2.5
    pCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    pCtx.stroke()
    pCtx.restore()
  }, [])

  // Draw Jigsaw Path helper
  const drawJigsawPath = useCallback((ctx, x, y, size = PIECE_SIZE, tab = TAB_SIZE) => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    // Top edge with protruding tab
    ctx.lineTo(x + size * 0.35, y)
    ctx.arc(x + size * 0.5, y - tab * 0.7, tab * 0.7, Math.PI, 0, false)
    ctx.lineTo(x + size, y)
    // Right edge with protruding tab
    ctx.lineTo(x + size, y + size * 0.35)
    ctx.arc(x + size + tab * 0.7, y + size * 0.5, tab * 0.7, -Math.PI / 2, Math.PI / 2, false)
    ctx.lineTo(x + size, y + size)
    // Bottom edge with indented blank
    ctx.lineTo(x + size * 0.65, y + size)
    ctx.arc(x + size * 0.5, y + size - tab * 0.7, tab * 0.7, 0, Math.PI, true)
    ctx.lineTo(x, y + size)
    // Left edge (flat)
    ctx.lineTo(x, y)
    ctx.closePath()
  }, [])

  // Initialize random target slot and render canvases
  const initPuzzle = useCallback(async (newImgIdx = null) => {
    setChallengeError('')
    const nextIdx = newImgIdx !== null ? newImgIdx : Math.floor(Math.random() * SCENIC_IMAGES.length)
    const fallbackX = Math.floor(110 + Math.random() * 110)
    const fallbackY = Math.floor(25 + Math.random() * 70)
    setImageIndex(nextIdx)
    setTargetX(fallbackX)
    setTargetY(fallbackY)
    setSliderPos(0)
    setStatus('idle')
    setStatusText('Hold and slide')
    renderPuzzle(null, fallbackX, fallbackY)

    let serverChallenge = null
    try {
      serverChallenge = await fetchCaptchaChallenge()
      setChallenge(serverChallenge)
    } catch (error) {
      setChallenge(null)
      setChallengeError(error.message || 'Security verification is temporarily unavailable')
    }
    // Target between 110px and 220px
    const randX = serverChallenge?.targetX ?? fallbackX
    const randY = serverChallenge?.targetY ?? fallbackY
    setTargetX(randX)
    setTargetY(randY)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = SCENIC_IMAGES[nextIdx]
    imageObjRef.current = img

    img.onload = () => {
      renderPuzzle(img, randX, randY)
    }
    img.onerror = () => {
      // Keep CAPTCHA usable when mobile networks block third-party images.
      renderPuzzle(null, randX, randY)
    }
    window.setTimeout(() => {
      if (!img.complete || img.naturalWidth === 0) {
        renderPuzzle(null, randX, randY)
      }
    }, 2500)
  }, [drawJigsawPath, renderPuzzle])

  useEffect(() => {
    if (isOpen) {
      initPuzzle().catch((error) => setChallengeError(error.message || 'Unable to load CAPTCHA'))
    }
  }, [isOpen, initPuzzle])

  // Drag Handlers (Mouse & Touch)
  const handleStartDrag = (clientX) => {
    if (status === 'success') return
    setIsDragging(true)
    startDragXRef.current = clientX
    startSliderPosRef.current = sliderPos
    dragStartedAtRef.current = Date.now()
    dragPathRef.current = [{ x: clientX, t: Date.now() }]
  }

  const handleMoveDrag = useCallback((clientX) => {
    if (!isDragging) return
    const deltaX = clientX - startDragXRef.current
    const newPos = Math.max(0, Math.min(MAX_DRAG, startSliderPosRef.current + deltaX))
    setSliderPos(newPos)
    dragPathRef.current.push({ x: clientX, t: Date.now() })
  }, [isDragging, MAX_DRAG])

  const handleEndDrag = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    // Calculate alignment
    // The piece canvas moves from X = -targetX to X = (CANVAS_WIDTH - targetX)
    // When sliderPos = (targetX / (CANVAS_WIDTH - PIECE_SIZE)) * MAX_DRAG, they match!
    const effectiveTargetSliderPos = (targetX / (CANVAS_WIDTH - PIECE_SIZE)) * MAX_DRAG
    const diff = Math.abs(sliderPos - effectiveTargetSliderPos)

    if (diff <= 8) {
      // SUCCESS!
      setStatus('success')
      setStatusText('Verification Passed!')
      setTimeout(() => {
        if (!challenge?.challenge) {
          setStatus('fail')
          setStatusText('Reload verification')
          return
        }
        onSuccess?.({
          captchaToken: challenge?.challenge,
          captchaProof: {
            targetX,
            targetY,
            startedAt: dragStartedAtRef.current,
            completedAt: Date.now(),
            path: dragPathRef.current.slice(-300),
          },
        })
      }, 600)
    } else {
      // FAIL
      setStatus('fail')
      setStatusText('Verification Failed. Try again!')
      setTimeout(() => {
        setSliderPos(0)
        setStatus('idle')
        setStatusText('Hold and slide')
      }, 800)
    }
  }, [isDragging, sliderPos, targetX, targetY, MAX_DRAG, onSuccess, challenge])

  // Global mouse / touch listeners
  useEffect(() => {
    const onMouseMove = (e) => handleMoveDrag(e.clientX)
    const onMouseUp = () => handleEndDrag()
    const onTouchMove = (e) => {
      if (e.touches?.[0]) handleMoveDrag(e.touches[0].clientX)
    }
    const onTouchEnd = () => handleEndDrag()

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('touchmove', onTouchMove)
      window.addEventListener('touchend', onTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging, handleMoveDrag, handleEndDrag])

  if (!isOpen) return null

  // Piece translation across X
  const pieceTranslateX = (sliderPos / MAX_DRAG) * (CANVAS_WIDTH - PIECE_SIZE) - targetX

  return (
    <div className="slider-captcha-overlay">
      <div className={`slider-captcha-card ${status === 'fail' ? 'card-shake' : ''}`}>
        {/* Header / Close */}
        <div className="slider-captcha-header">
          <span className="slider-captcha-title">Security Verification</span>
          <button className="slider-captcha-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Visual Canvas Area */}
        <div className="slider-captcha-canvas-wrap" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={bgCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="slider-bg-canvas"
          />
          <canvas
            ref={pieceCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="slider-piece-canvas"
            style={{
              transform: `translateX(${pieceTranslateX}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
          />

          {/* Status banner on canvas */}
          {status === 'success' && (
            <div className="slider-canvas-toast toast-success">
              <CheckCircle2 size={16} />
              <span>Verification Passed!</span>
            </div>
          )}
          {status === 'fail' && (
            <div className="slider-canvas-toast toast-fail">
              <AlertCircle size={16} />
              <span>Mismatch! Try again</span>
            </div>
          )}
          {challengeError && (
            <div className="slider-canvas-toast toast-fail">
              <AlertCircle size={16} />
              <span>{challengeError}</span>
            </div>
          )}
        </div>

        {/* Slide Track */}
        <div
          ref={trackRef}
          className={`slider-track-container ${status}`}
          style={{ width: TRACK_WIDTH }}
        >
          {/* Progress fill behind handle */}
          <div
            className="slider-track-fill"
            style={{ width: `${sliderPos + HANDLE_WIDTH / 2}px` }}
          />

          <span className="slider-track-label">{statusText}</span>

          {/* Draggable Handle */}
          <div
            className={`slider-handle ${isDragging ? 'dragging' : ''}`}
            style={{
              transform: `translateX(${sliderPos}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            onMouseDown={(e) => handleStartDrag(e.clientX)}
            onTouchStart={(e) => {
              if (e.touches?.[0]) handleStartDrag(e.touches[0].clientX)
            }}
          >
            <ChevronsRight size={20} className="handle-icon" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="slider-captcha-footer">
          <button
            className="slider-reload-btn"
            onClick={() => initPuzzle((imageIndex + 1) % SCENIC_IMAGES.length)}
          >
            <RotateCw size={14} />
            <span>Reload</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SliderCaptchaModal
