/**
 * Utility for detecting device type and capabilities
 * Enables mobile-first responsive behavior
 */

export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop'

  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
      userAgent
    )
  const isTablet =
    /ipad|android(?!.*mobi)|kindle/.test(userAgent) && isMobile

  return isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
}

export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

export const isDesktop = () => getDeviceType() === 'desktop'
export const isMobile = () => getDeviceType() === 'mobile'
export const isTablet = () => getDeviceType() === 'tablet'

export const getViewportSize = () => {
  if (typeof window === 'undefined')
    return { width: 1920, height: 1080, ratio: 16 / 9 }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: window.innerWidth / window.innerHeight,
  }
}

export const supportsWebGL = () => {
  if (typeof window === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

export const lockPortraitOrientation = async () => {
  if (typeof window === 'undefined' || typeof screen === 'undefined') return

  type ScreenLockMode =
    | 'any'
    | 'natural'
    | 'landscape'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape-primary'
    | 'landscape-secondary'

  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: ScreenLockMode) => Promise<void>
  }

  if (!orientation?.lock) return

  try {
    await orientation.lock('portrait-primary')
  } catch {
    // Ignore browsers/platforms that don't allow orientation locking.
  }
}
