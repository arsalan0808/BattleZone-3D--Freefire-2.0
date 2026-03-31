import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { playerRef } from './Player'
import { CameraController } from '../systems/camera/CameraController'
import { AimingSystem } from '../systems/aiming/AimingSystem'

export const Camera = () => {
  const { camera, scene } = useThree()
  const controllerRef = useRef<CameraController | null>(null)
  const aimingSystemRef = useRef<AimingSystem | null>(null)
  const playerForwardRef = useRef(new THREE.Vector3(0, 0, -1))

  const isPaused = useGameStore((state) => state.isPaused)
  const isShootingInput = useGameStore((state) => state.isShootingInput)
  const movementInput = useGameStore((state) => state.movementInput)
  const shotPulse = useGameStore((state) => state.shotPulse)
  const cursorPosition = useGameStore((state) => state.cursorPosition)
  const setCameraRotation = useGameStore((state) => state.setCameraRotation)

  useEffect(() => {
    const controller = new CameraController(camera, scene, {
      distanceFromPlayer: 8.2,
      heightAbovePlayer: 1.4,
      lookAheadDistance: 1,
      defaultZoom: 1,
      aimZoom: 1.28,
      followDamping: 0.12,
      rotationDamping: 0.18,
      zoomDamping: 0.12,
    })

    const aimingSystem = new AimingSystem(camera)

    controllerRef.current = controller
    aimingSystemRef.current = aimingSystem

    // Expose for external access
    ;(window as any).__aimingSystem = aimingSystem

    return () => {
      controller.dispose()
      aimingSystem.dispose()
      delete (window as any).__aimingSystem
    }
  }, [camera, scene])

  useEffect(() => {
    if (shotPulse > 0 && controllerRef.current) {
      controllerRef.current.shake(0.15, 0.1)
    }
  }, [shotPulse])

  useFrame((_, delta) => {
    if (!playerRef?.current || !controllerRef.current || !aimingSystemRef.current || isPaused) {
      return
    }

    const player = playerRef.current
    const controller = controllerRef.current
    const aimingSystem = aimingSystemRef.current

    const isMoving = Math.sqrt(movementInput.x ** 2 + movementInput.z ** 2) > 0.5
    controller.setMoving(isMoving)
    controller.setAiming(isShootingInput)

    playerForwardRef.current.set(0, 0, -1).applyQuaternion(player.quaternion)
    controller.update(
      player.position,
      playerForwardRef.current,
      isShootingInput,
      isMoving,
      Math.min(0.05, Math.max(delta, 1 / 240))
    )

    // 🎯 CRITICAL: Update aiming system from LIVE camera (not React state)
    aimingSystem.update(cursorPosition)

    const debugInfo = controller.getDebugInfo()
    setCameraRotation({ x: debugInfo.rotation.y, y: debugInfo.rotation.x })
  })

  return null
}
