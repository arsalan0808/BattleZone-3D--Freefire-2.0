import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { isGameplayUiTarget, isInMobileMovementZone } from '../utils/mobileInput'

const clamp01 = (value: number) => Math.max(0.02, Math.min(0.98, value))

export const PointerTracker = () => {
  const setCursorPosition = useGameStore((state) => state.setCursorPosition)

  useEffect(() => {
    let activeTouchPointerId: number | null = null

    const updateFromPoint = (clientX: number, clientY: number) => {
      setCursorPosition({
        x: clamp01(clientX / window.innerWidth),
        y: clamp01(clientY / window.innerHeight),
      })
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isGameplayUiTarget(event.target)) {
        return
      }

      if (event.pointerType === 'touch') {
        if (
          activeTouchPointerId !== null ||
          isInMobileMovementZone(event.clientX, window.innerWidth)
        ) {
          return
        }

        activeTouchPointerId = event.pointerId
      }

      updateFromPoint(event.clientX, event.clientY)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (isGameplayUiTarget(event.target)) {
        return
      }

      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        updateFromPoint(event.clientX, event.clientY)
        return
      }

      if (event.pointerType !== 'touch' || activeTouchPointerId !== event.pointerId) {
        return
      }

      updateFromPoint(event.clientX, event.clientY)
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && activeTouchPointerId === event.pointerId) {
        activeTouchPointerId = null
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerEnd, { passive: true })
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [setCursorPosition])

  return null
}
