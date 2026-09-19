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
    const serverChallenge = await fetchCaptchaChallenge()
    setChallenge(serverChallenge)
    const nextIdx = newImgIdx !== null ? newImgIdx : Math.floor(Math.random() * SCENIC_IMAGES.length)
    setImageIndex(nextIdx)

    // Target between 110px and 220px
    const randX = serverChallenge.targetX
    const randY = serverChallenge.targetY
    setTargetX(randX)
    setTargetY(randY)
    setSliderPos(0)
    setStatus('idle')
    setStatusText('Hold and slide')

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = SCENIC_IMAGES[nextIdx]
    imageObjRef.current = img

    img.onload = () => {
      // 1. Draw Background & Target Slot Silhouette
      const bgCanvas = bgCanvasRef.current
      if (!bgCanvas) return
      const bgCtx = bgCanvas.getContext('2d')
      bgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      bgCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw cutout slot outline
      bgCtx.save()
      drawJigsawPath(bgCtx, randX, randY)
      bgCtx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      bgCtx.fill()
      bgCtx.lineWidth = 2
      bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      bgCtx.stroke()
      bgCtx.restore()

      // 2. Draw Moving Jigsaw Piece
      const pieceCanvas = pieceCanvasRef.current
      if (!pieceCanvas) return
      const pCtx = pieceCanvas.getContext('2d')
      pCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      pCtx.save()
      drawJigsawPath(pCtx, randX, randY)
      pCtx.clip()
      pCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      pCtx.lineWidth = 2.5
      pCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
      pCtx.shadowColor = 'rgba(0, 0, 0, 0.7)'
      pCtx.shadowBlur = 8
      pCtx.stroke()
      pCtx.restore()
    }
  }, [drawJigsawPath])

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
