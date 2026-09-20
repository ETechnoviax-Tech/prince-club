// frontend/src/utils/antiInspect.js
/**
 * 69 Club Security Protection Engine
 * Disables Right-Click Context Menu, Inspect Element, DevTools shortcuts, and Source viewing
 */

export function initAntiInspect(onBlockedAttempt) {
  if (typeof window === 'undefined') return

  // 1. Disable Right-Click Context Menu
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (typeof onBlockedAttempt === 'function') {
        onBlockedAttempt('Right-click is disabled for security.')
      }
      return false
    },
    { capture: true }
  )

  // 2. Block DevTools Keyboard Shortcuts
  window.addEventListener(
    'keydown',
    (e) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault()
        e.stopPropagation()
        if (typeof onBlockedAttempt === 'function') {
          onBlockedAttempt('Developer Tools are disabled.')
        }
        return false
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      // Ctrl+Shift+I (DevTools Inspect)
      // Ctrl+Shift+J (DevTools Console)
      // Ctrl+Shift+C (DevTools Inspect Element)
      if (
        isCtrlOrCmd &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
      ) {
        e.preventDefault()
        e.stopPropagation()
        if (typeof onBlockedAttempt === 'function') {
          onBlockedAttempt('Inspect Element is disabled.')
        }
        return false
      }

      // Ctrl+U (View Page Source)
      if (isCtrlOrCmd && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault()
        e.stopPropagation()
        if (typeof onBlockedAttempt === 'function') {
          onBlockedAttempt('Viewing source is disabled.')
        }
        return false
      }

      // Ctrl+S (Save Webpage)
      if (isCtrlOrCmd && (e.key === 'S' || e.key === 's')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    },
    { capture: true }
  )

  // 3. Clear Console & Debugger Protection
  try {
    setInterval(() => {
      // Devtools open detection via dimension delta
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160
      if (widthThreshold || heightThreshold) {
        // Clear sensitive console outputs
        console.clear()
      }
    }, 1500)
  } catch { }
}
