import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { WEAPON_ORDER, getWeaponConfig } from '../game/weapons'
import { useGameStore } from '../store/gameStore'
import { playUIClick } from '../utils/audioManager'

interface JoystickPosition {
  x: number
  y: number
}

export const MobileControls = () => {
  const setMovementInput = useGameStore((state) => state.setMovementInput)
  const setShootingInput = useGameStore((state) => state.setShootingInput)
  const togglePause = useGameStore((state) => state.togglePause)
  const setSelectedWeapon = useGameStore((state) => state.setSelectedWeapon)
  const requestReload = useGameStore((state) => state.requestReload)
  const isPaused = useGameStore((state) => state.isPaused)
  const selectedWeapon = useGameStore((state) => state.selectedWeapon)
  const ammoInMagazine = useGameStore((state) => state.ammoInMagazine)
  const ammoReserve = useGameStore((state) => state.ammoReserve)
  const isReloading = useGameStore((state) => state.isReloading)

  const joystickRef = useRef<HTMLDivElement>(null)
  const joystickPointerIdRef = useRef<number | null>(null)
  const shootPointerIdRef = useRef<number | null>(null)

  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPosition, setJoystickPosition] = useState<JoystickPosition>({ x: 50, y: 50 })
  const [shootPressed, setShootPressed] = useState(false)

  const triggerHaptic = (intensity: 'light' | 'medium' = 'light') => {
    if (!navigator.vibrate) return
    navigator.vibrate(intensity === 'medium' ? 22 : 10)
  }

  const updateJoystickPosition = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const radius = rect.width / 2
    const dx = clientX - centerX
    const dy = clientY - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const rawIntensity = Math.min(distance / radius, 1)
    const deadzone = 0.12
    const intensity = rawIntensity <= deadzone ? 0 : (rawIntensity - deadzone) / (1 - deadzone)
    const clampedDistance = intensity * radius
    const angle = Math.atan2(dy, dx)
    const normalizedX = (Math.cos(angle) * clampedDistance) / radius
    const normalizedY = (Math.sin(angle) * clampedDistance) / radius

    setJoystickPosition({
      x: (normalizedX * 100) / 2 + 50,
      y: (normalizedY * 100) / 2 + 50,
    })

    setMovementInput({ x: normalizedX, z: -normalizedY })
  }, [setMovementInput])

  const releaseJoystick = useCallback(() => {
    joystickPointerIdRef.current = null
    setJoystickActive(false)
    setJoystickPosition({ x: 50, y: 50 })
    setMovementInput({ x: 0, z: 0 })
  }, [setMovementInput])

  const releaseShooting = useCallback(() => {
    shootPointerIdRef.current = null
    setShootPressed(false)
    setShootingInput(false)
  }, [setShootingInput])

  const handleJoystickPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerIdRef.current !== null) return
    joystickPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setJoystickActive(true)
    updateJoystickPosition(event.clientX, event.clientY)
    triggerHaptic()
  }, [updateJoystickPosition])

  const handleJoystickPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerIdRef.current !== event.pointerId) return
    updateJoystickPosition(event.clientX, event.clientY)
  }, [updateJoystickPosition])

  const handleJoystickPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    releaseJoystick()
    triggerHaptic()
  }, [releaseJoystick])

  const handleShootPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (shootPointerIdRef.current !== null) return
    shootPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setShootPressed(true)
    setShootingInput(true)
    triggerHaptic('medium')
  }, [setShootingInput])

  const handleShootPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (shootPointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    releaseShooting()
    triggerHaptic()
  }, [releaseShooting])

  useEffect(() => {
    if (!isPaused) {
      return
    }

    releaseJoystick()
    releaseShooting()
  }, [isPaused, releaseJoystick, releaseShooting])

  useEffect(() => {
    const resetControls = () => {
      releaseJoystick()
      releaseShooting()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetControls()
      }
    }

    window.addEventListener('blur', resetControls)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', resetControls)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      resetControls()
    }
  }, [releaseJoystick, releaseShooting])

  const handleReload = useCallback(() => {
    const weaponConfig = getWeaponConfig(selectedWeapon)

    if (isReloading || ammoReserve <= 0 || ammoInMagazine >= weaponConfig.magazineSize) {
      return
    }

    playUIClick()
    requestReload()
  }, [ammoInMagazine, ammoReserve, isReloading, requestReload, selectedWeapon])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      style={{
        height: `max(13rem, calc(env(safe-area-inset-bottom, 0px) + 13rem))`,
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <div className="relative h-full w-full">
        <div className="absolute bottom-3 left-3 pointer-events-auto sm:bottom-4 sm:left-4" data-ui-control="true" style={{
          bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          left: 'max(0.75rem, env(safe-area-inset-left))',
        }}>
          <motion.div
            ref={joystickRef}
            className="glass-panel premium-panel relative flex items-center justify-center rounded-full opacity-70 backdrop-blur-sm"
            style={{
              width: 'clamp(4.25rem, 18vw, 5.5rem)',
              height: 'clamp(4.25rem, 18vw, 5.5rem)',
              touchAction: 'none',
              userSelect: 'none',
            }}
            onPointerDown={handleJoystickPointerDown}
            onPointerMove={handleJoystickPointerMove}
            onPointerUp={handleJoystickPointerUp}
            onPointerCancel={handleJoystickPointerUp}
            onLostPointerCapture={releaseJoystick}
            animate={{
              scale: joystickActive ? 1.05 : 1,
              boxShadow: joystickActive
                ? '0 0 24px rgba(251, 146, 60, 0.35)'
                : '0 0 14px rgba(14, 165, 233, 0.12)',
            }}
          >
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-4 rounded-full border border-amber-300/15" />
            <motion.div
              className="absolute rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-orange-600 shadow-[0_0_22px_rgba(251,146,60,0.55)]"
              style={{ width: '40%', height: '40%' }}
              animate={{
                x: `calc(${joystickPosition.x}% - 50%)`,
                y: `calc(${joystickPosition.y}% - 50%)`,
                scale: joystickActive ? 1.08 : 1,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            />
            <div className="absolute h-2 w-2 rounded-full bg-sky-200/90 shadow-[0_0_12px_rgba(125,211,252,0.6)]" />
          </motion.div>
          <p className="mt-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">Move</p>
        </div>

        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 pointer-events-auto sm:bottom-4 sm:right-4" data-ui-control="true" style={{
          bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          right: 'max(0.75rem, env(safe-area-inset-right))',
        }}>
          <div className="flex gap-1">
            {WEAPON_ORDER.map((weaponId) => {
              const weapon = getWeaponConfig(weaponId)

              return (
                <motion.button
                  key={weaponId}
                  type="button"
                  data-ui-control="true"
                  onClick={() => {
                    playUIClick()
                    setSelectedWeapon(weaponId)
                  }}
                  className={`rounded-full border font-semibold uppercase transition-all backdrop-blur-sm ${
                    selectedWeapon === weaponId
                      ? 'border-amber-200/60 bg-amber-300/15 text-amber-100'
                      : 'border-white/10 bg-slate-950/50 text-slate-300'
                  }`}
                  style={{
                    width: '12vw',
                    height: '12vw',
                    minWidth: '2.5rem',
                    minHeight: '2.5rem',
                    maxWidth: '3.25rem',
                    maxHeight: '3.25rem',
                    fontSize: 'clamp(0.55rem, 2vw, 0.68rem)',
                    letterSpacing: '0.15em',
                    opacity: 0.7,
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                  whileTap={{ scale: 0.92, opacity: 1 }}
                >
                  {weapon.shortName}
                </motion.button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            <ControlButton
              label="Shoot"
              accent
              pressed={shootPressed}
              onPointerDown={handleShootPointerDown}
              onPointerUp={handleShootPointerUp}
              onPointerCancel={handleShootPointerUp}
              onLostPointerCapture={releaseShooting}
            />
            <ControlButton
              label={isReloading ? 'Load' : 'Reload'}
              onClick={handleReload}
              disabled={isReloading || ammoReserve <= 0}
            />
            <ControlButton
              label="Pause"
              onClick={() => {
                playUIClick()
                togglePause()
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const ControlButton = ({
  label,
  pressed = false,
  accent = false,
  disabled = false,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
}: {
  label: string
  pressed?: boolean
  accent?: boolean
  disabled?: boolean
  onClick?: () => void
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp?: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerCancel?: (event: React.PointerEvent<HTMLButtonElement>) => void
  onLostPointerCapture?: () => void
}) => (
  <motion.button
    type="button"
    data-ui-control="true"
    disabled={disabled}
    onClick={onClick}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerCancel}
    onLostPointerCapture={onLostPointerCapture}
    className={`rounded-full border font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm ${
      accent ? 'border-amber-200/45 bg-amber-400/20' : 'border-white/10 bg-slate-950/45'
    } ${disabled ? 'opacity-45' : ''}`}
    style={{
      width: 'clamp(3rem, 14vw, 4rem)',
      height: 'clamp(3rem, 14vw, 4rem)',
      minWidth: '3rem',
      minHeight: '3rem',
      fontSize: 'clamp(0.55rem, 2vw, 0.7rem)',
      opacity: disabled ? 0.45 : pressed ? 1 : 0.75,
      boxShadow: accent ? '0 0 18px rgba(251,146,60,0.22)' : '0 0 12px rgba(15,23,42,0.25)',
      touchAction: 'none',
      userSelect: 'none',
    }}
    whileTap={disabled ? undefined : { scale: 0.9, opacity: 1 }}
    animate={{ scale: pressed ? 0.92 : 1 }}
  >
    {label}
  </motion.button>
)
