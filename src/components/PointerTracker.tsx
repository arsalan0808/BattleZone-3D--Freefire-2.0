import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const clamp01 = (value: number) => Math.max(0.02, Math.min(0.98, value))

export const PointerTracker = () => {
  const setCursorPosition = useGameStore((state) => state.setCursorPosition)

  useEffect(() => {
    const updateFromPoint = (clientX: number, clientY: number) => {
      setCursorPosition({
        x: clamp01(clientX / window.innerWidth),
        y: clamp01(clientY / window.innerHeight),
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-ui-control="true"]')) {
        return
      }

      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        updateFromPoint(event.clientX, event.clientY)
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target?.closest('[data-ui-control="true"]')) {
        return
      }

      const touch = event.touches[0]
      updateFromPoint(touch.clientX, touch.clientY)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [setCursorPosition])

  return null
}
