const CLICK_GUARD_MS = 900
const lastAcceptedClick = new WeakMap()

function isCta(target) {
  return typeof Element !== 'undefined' && target instanceof Element
    ? target.closest('button, input[type="submit"], input[type="button"], [role="button"]')
    : null
}

export function installGlobalCtaGuard() {
  if (typeof document === 'undefined' || document.documentElement.dataset.ctaGuardInstalled) return () => {}

  const handleClick = (event) => {
    const cta = isCta(event.target)
    if (!cta || cta.hasAttribute('disabled') || cta.getAttribute('aria-disabled') === 'true') return

    const now = Date.now()
    const lastClick = lastAcceptedClick.get(cta) || 0
    if (now - lastClick < CLICK_GUARD_MS) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }

    lastAcceptedClick.set(cta, now)
  }

  document.addEventListener('click', handleClick, true)
  document.documentElement.dataset.ctaGuardInstalled = 'true'
  return () => document.removeEventListener('click', handleClick, true)
}
