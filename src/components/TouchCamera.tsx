import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

interface TouchState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
  isJoystickTouch: boolean
}

/**
 * Touch Camera Control Component
 * Handles swipe-based camera rotation on mobile
 * Features:
 * - Horizontal swipe to rotate camera around player
 * - Vertical swipe to look up/down (clamped)
 * - Multi-touch aware (ignores joystick touches)
 * - Smooth lerp-based camera updates
 * - Respects pause state
 */
export const TouchCamera = () => {
  const touchStateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    isJoystickTouch: false,
  })

  const cameraRotationRef = useRef({ x: 0, y: 0 })
  const isPaused = useGameStore((state) => state.isPaused)

  // Camera parameters
  const SWIPE_SENSITIVITY = 0.003 // How sensitive to mouse movement
  const VERTICAL_CLAMP_MIN = -Math.PI / 3 // -60 degrees (looking down limit)
  const VERTICAL_CLAMP_MAX = Math.PI / 3 // +60 degrees (looking up limit)
  const JOYSTICK_EXCLUSION_ZONE = 180 // pixels from bottom-left to exclude

  /**
   * Check if touch is in joystick exclusion zone
   */
  const isInJoystickZone = (x: number, y: number, windowHeight: number): boolean => {
    const bottomLeftMargin = JOYSTICK_EXCLUSION_ZONE
    const isInBottomLeft =
      x < bottomLeftMargin &&
      y > windowHeight - bottomLeftMargin

    return isInBottomLeft
  }

  /**
   * Handle touch start
   */
  const handleTouchStart = (e: TouchEvent) => {
    if (isPaused || e.touches.length !== 1) return

    const touch = e.touches[0]
    const isInZone = isInJoystickZone(
      touch.clientX,
      touch.clientY,
      window.innerHeight
    )

    touchStateRef.current.startX = touch.clientX
    touchStateRef.current.startY = touch.clientY
    touchStateRef.current.currentX = touch.clientX
    touchStateRef.current.currentY = touch.clientY
    touchStateRef.current.isDragging = true
    touchStateRef.current.isJoystickTouch = isInZone
  }

  /**
   * Handle touch move
   */
  const handleTouchMove = (e: TouchEvent) => {
    const state = touchStateRef.current
    if (!state.isDragging || state.isJoystickTouch || e.touches.length === 0)
      return

    const touch = e.touches[0]

    // Calculate delta
    const deltaX = touch.clientX - state.currentX
    const deltaY = touch.clientY - state.currentY

    // Update camera rotation based on swipe
    cameraRotationRef.current.y += deltaX * SWIPE_SENSITIVITY
    cameraRotationRef.current.x += deltaY * SWIPE_SENSITIVITY

    // Clamp vertical angle
    cameraRotationRef.current.x = Math.max(
      VERTICAL_CLAMP_MIN,
      Math.min(VERTICAL_CLAMP_MAX, cameraRotationRef.current.x)
    )

    // Update current position
    state.currentX = touch.clientX
    state.currentY = touch.clientY
  }

  /**
   * Handle touch end
   */
  const handleTouchEnd = () => {
    touchStateRef.current.isDragging = false
    touchStateRef.current.isJoystickTouch = false
  }

  /**
   * Handle mouse move for desktop camera control
   */
  const handleMouseMove = (e: MouseEvent) => {
    if (isPaused || !touchStateRef.current.isDragging) return

    const deltaX = e.clientX - touchStateRef.current.currentX
    const deltaY = e.clientY - touchStateRef.current.currentY

    // Much lower sensitivity for mouse to allow precise aiming
    const mouseSensitivity = 0.001
    cameraRotationRef.current.y += deltaX * mouseSensitivity
    cameraRotationRef.current.x += deltaY * mouseSensitivity

    // Clamp vertical
    cameraRotationRef.current.x = Math.max(
      VERTICAL_CLAMP_MIN,
      Math.min(VERTICAL_CLAMP_MAX, cameraRotationRef.current.x)
    )

    touchStateRef.current.currentX = e.clientX
    touchStateRef.current.currentY = e.clientY
  }

  /**
   * Handle mouse down/up
   */
  const handleMouseDown = (e: MouseEvent) => {
    // Only enable camera control on right-click
    if (e.button !== 2) return

    touchStateRef.current.startX = e.clientX
    touchStateRef.current.startY = e.clientY
    touchStateRef.current.currentX = e.clientX
    touchStateRef.current.currentY = e.clientY
    touchStateRef.current.isDragging = true
  }

  const handleMouseUp = () => {
    touchStateRef.current.isDragging = false
  }

  /**
   * Prevent context menu on right-click
   */
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }

  // Register touch and mouse listeners
  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [isPaused])

  /**
   * Apply camera rotation to camera angles
   * This is independent of position (handled by Camera component)
   */
  useFrame(() => {
    if (isPaused) return

    const rotation = cameraRotationRef.current

    // Apply rotation (minimal effect - camera follows player position)
    // Store for Zustand if needed for other systems
    useGameStore.setState({ cameraRotation: { x: rotation.x, y: rotation.y } })
  })

  return null // TouchCamera is a logic component with no visual output
}
