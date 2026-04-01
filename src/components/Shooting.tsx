import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { isLineOfSightBlocked } from '../game/arena'
import { getWeaponConfig, WEAPON_ORDER } from '../game/weapons'
import { useGameStore } from '../store/gameStore'
import { playerRef } from './Player'
import { aiBotRef } from './AIBot'
import { audioManager } from '../utils/audioManager'
import { isGameplayUiTarget, isInMobileMovementZone } from '../utils/mobileInput'
import type { AimingSystem } from '../systems/aiming/AimingSystem'

const clamp01 = (value: number) => Math.max(0.02, Math.min(0.98, value))

export const Shooting = () => {
  const { camera } = useThree()
  const raycasterRef = useRef(new THREE.Raycaster())
  const cameraRayRef = useRef(new THREE.Ray())
  const directionRef = useRef(new THREE.Vector3())
  const rayOriginRef = useRef(new THREE.Vector3())
  const playerPositionRef = useRef(new THREE.Vector3())
  const hitTargetRef = useRef(new THREE.Vector3())
  const fallbackHitPointRef = useRef(new THREE.Vector3())
  const cursorNdcRef = useRef(new THREE.Vector2())
  const enemyBoundsRef = useRef(new THREE.Box3())
  const enemyCenterRef = useRef(new THREE.Vector3())
  const enemySizeRef = useRef(new THREE.Vector3())
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeShootPointerIdRef = useRef<number | null>(null)
  const lastShotTimeRef = useRef(0)
  const lastDamageAtRef = useRef(0)
  const killRegisteredRef = useRef(false)
  const aimingSystemRef = useRef<AimingSystem | null>(null)
  const fireShotRef = useRef<() => boolean>(() => false)

  const isShootingInput = useGameStore((state) => state.isShootingInput)
  const currentScene = useGameStore((state) => state.currentScene)
  const cursorPosition = useGameStore((state) => state.cursorPosition)
  const setAiHealth = useGameStore((state) => state.setAiHealth)
  const addScore = useGameStore((state) => state.addScore)
  const registerKill = useGameStore((state) => state.registerKill)
  const consumeAmmo = useGameStore((state) => state.consumeAmmo)
  const finishReload = useGameStore((state) => state.finishReload)
  const ammoInMagazine = useGameStore((state) => state.ammoInMagazine)
  const ammoReserve = useGameStore((state) => state.ammoReserve)
  const registerShot = useGameStore((state) => state.registerShot)
  const registerHit = useGameStore((state) => state.registerHit)
  const isPaused = useGameStore((state) => state.isPaused)
  const selectedWeapon = useGameStore((state) => state.selectedWeapon)
  const isReloading = useGameStore((state) => state.isReloading)
  const setReloading = useGameStore((state) => state.setReloading)
  const requestReload = useGameStore((state) => state.requestReload)
  const reloadRequestId = useGameStore((state) => state.reloadRequestId)
  const setSelectedWeapon = useGameStore((state) => state.setSelectedWeapon)
  const cycleWeapon = useGameStore((state) => state.cycleWeapon)
  const bulletTraces = useGameStore((state) => state.bulletTraces)
  const pushBulletTrace = useGameStore((state) => state.pushBulletTrace)
  const tickBulletTraces = useGameStore((state) => state.tickBulletTraces)

  useEffect(() => {
    aimingSystemRef.current = (window as Window & { __aimingSystem?: AimingSystem }).__aimingSystem ?? null
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (currentScene !== 'game' || isPaused) {
        return
      }

      if (isGameplayUiTarget(event.target)) {
        return
      }

      if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && event.button !== 0) {
        return
      }

      if (
        event.pointerType === 'touch' &&
        isInMobileMovementZone(event.clientX, window.innerWidth)
      ) {
        return
      }

      if (
        activeShootPointerIdRef.current !== null &&
        activeShootPointerIdRef.current !== event.pointerId
      ) {
        return
      }

      const cursorPosition = {
        x: clamp01(event.clientX / window.innerWidth),
        y: clamp01(event.clientY / window.innerHeight),
      }
      const aimingSystem =
        aimingSystemRef.current ??
        (window as Window & { __aimingSystem?: AimingSystem }).__aimingSystem ??
        null

      activeShootPointerIdRef.current = event.pointerId
      useGameStore.getState().setCursorPosition(cursorPosition)
      aimingSystem?.update(cursorPosition)
      useGameStore.getState().setShootingInput(true)
      fireShotRef.current()
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (
        activeShootPointerIdRef.current !== null &&
        activeShootPointerIdRef.current !== event.pointerId
      ) {
        return
      }

      activeShootPointerIdRef.current = null
      useGameStore.getState().setShootingInput(false)
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        return
      }

      activeShootPointerIdRef.current = null
      useGameStore.getState().setShootingInput(false)
    }

    const handleWindowBlur = () => {
      activeShootPointerIdRef.current = null
      useGameStore.getState().setShootingInput(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentScene, isPaused])

  useEffect(() => {
    if (currentScene === 'game' && !isPaused) {
      return
    }

    activeShootPointerIdRef.current = null
    useGameStore.getState().setShootingInput(false)
  }, [currentScene, isPaused])

  useEffect(() => {
    if (!reloadTimeoutRef.current) {
      return
    }

    clearTimeout(reloadTimeoutRef.current)
    reloadTimeoutRef.current = null
    setReloading(false)
  }, [selectedWeapon, setReloading])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (currentScene !== 'game') {
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'r') {
        event.preventDefault()
        useGameStore.getState().requestReload()
        return
      }

      if (key === 'q') {
        cycleWeapon(-1)
        return
      }

      if (key === 'e') {
        cycleWeapon(1)
        return
      }

      if (key >= '1' && key <= `${WEAPON_ORDER.length}`) {
        setSelectedWeapon(WEAPON_ORDER[Number(key) - 1])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentScene, cycleWeapon, setSelectedWeapon])

  const triggerReload = () => {
    const weaponConfig = getWeaponConfig(useGameStore.getState().selectedWeapon)
    const {
      ammoInMagazine: currentMagazine,
      ammoReserve: currentReserve,
      isReloading: reloading,
    } = useGameStore.getState()

    if (reloading || currentReserve <= 0 || currentMagazine >= weaponConfig.magazineSize || reloadTimeoutRef.current) {
      return
    }

    setReloading(true)
    audioManager.play('reload', 0.7)
    reloadTimeoutRef.current = setTimeout(() => {
      finishReload()
      reloadTimeoutRef.current = null
    }, weaponConfig.reloadMs)
  }

  useEffect(() => {
    if (currentScene !== 'game') {
      return
    }

    triggerReload()
  }, [currentScene, reloadRequestId])

  useEffect(() => {
    if (ammoInMagazine > 0 || ammoReserve <= 0 || isReloading) {
      return
    }

    requestReload()
  }, [ammoInMagazine, ammoReserve, isReloading, requestReload])

  const fireShot = () => {
    if (isPaused || currentScene !== 'game' || !playerRef?.current || !aiBotRef?.current) {
      return false
    }

    const state = useGameStore.getState()
    if (state.aiHealth <= 0) {
      return false
    }

    const weaponConfig = getWeaponConfig(selectedWeapon)
    const now = performance.now()
    if (now - lastShotTimeRef.current < weaponConfig.fireIntervalMs || isReloading) {
      return false
    }

    if (!consumeAmmo()) {
      requestReload()
      return false
    }

    const aimingSystem = aimingSystemRef.current ?? (window as Window & { __aimingSystem?: AimingSystem }).__aimingSystem ?? null
    if (aimingSystem) {
      rayOriginRef.current.copy(aimingSystem.getShootingOrigin())
      directionRef.current.copy(aimingSystem.getShootingDirection(weaponConfig.spread))
    } else {
      cursorNdcRef.current.set(cursorPosition.x * 2 - 1, -(cursorPosition.y * 2 - 1))
      raycasterRef.current.setFromCamera(cursorNdcRef.current, camera)
      rayOriginRef.current.copy(raycasterRef.current.ray.origin)
      directionRef.current.copy(raycasterRef.current.ray.direction)
    }

    cameraRayRef.current.origin.copy(rayOriginRef.current)
    cameraRayRef.current.direction.copy(directionRef.current)

    playerPositionRef.current.copy(playerRef.current.position)
    playerPositionRef.current.y += 1.35

    lastShotTimeRef.current = now
    registerShot()
    audioManager.play('shoot', 0.7)

    return true
  }

  fireShotRef.current = fireShot

  useFrame((_, delta) => {
    tickBulletTraces(delta)

    if (!isShootingInput || isPaused) {
      return
    }

    const didShoot = fireShot()
    if (!didShoot || !aiBotRef?.current) {
      return
    }

    const gameState = useGameStore.getState()
    if (gameState.aiHealth <= 0) {
      return
    }

    hitTargetRef.current.copy(aiBotRef.current.position)
    hitTargetRef.current.y += 1.2

    const weaponConfig = getWeaponConfig(selectedWeapon)
    const distance = hitTargetRef.current.distanceTo(playerPositionRef.current)

    raycasterRef.current.set(cameraRayRef.current.origin, directionRef.current)
    const intersectsBot = raycasterRef.current.intersectObject(aiBotRef.current, true)
    const directHit =
      intersectsBot.length > 0 &&
      intersectsBot[0].distance <= weaponConfig.range &&
      !isLineOfSightBlocked(playerPositionRef.current, intersectsBot[0].point, 0.18)

    let fallbackHitPoint: THREE.Vector3 | null = null
    if (!directHit) {
      enemyBoundsRef.current.setFromObject(aiBotRef.current).expandByScalar(0.2)
      fallbackHitPoint = cameraRayRef.current.intersectBox(enemyBoundsRef.current, fallbackHitPointRef.current)
      enemyBoundsRef.current.getCenter(enemyCenterRef.current)
    }

    let forgivingHit = false
    if (!directHit) {
      enemyBoundsRef.current.getSize(enemySizeRef.current)
      const hitRadius =
        Math.max(enemySizeRef.current.x, enemySizeRef.current.z, enemySizeRef.current.y * 0.38) * 0.55 + 0.35
      cameraRayRef.current.closestPointToPoint(enemyCenterRef.current, fallbackHitPointRef.current)
      forgivingHit =
        cameraRayRef.current.origin.distanceTo(enemyCenterRef.current) <= weaponConfig.range &&
        fallbackHitPointRef.current.distanceTo(enemyCenterRef.current) <= hitRadius &&
        !isLineOfSightBlocked(playerPositionRef.current, enemyCenterRef.current, 0.18)
    }

    const fallbackHit =
      !directHit &&
      Boolean(
        fallbackHitPoint &&
        cameraRayRef.current.origin.distanceTo(fallbackHitPoint) <= weaponConfig.range &&
        !isLineOfSightBlocked(playerPositionRef.current, fallbackHitPoint, 0.18) &&
        cameraRayRef.current.distanceSqToPoint(enemyCenterRef.current) <= 2.6
      )

    const didHitBot = directHit || fallbackHit || forgivingHit
    const resolvedHitPoint =
      directHit
        ? intersectsBot[0].point.clone()
        : fallbackHitPoint
          ? fallbackHitPoint.clone()
          : forgivingHit
            ? enemyCenterRef.current.clone()
            : null

    const bulletEnd = resolvedHitPoint
      ? resolvedHitPoint
      : playerPositionRef.current.clone().addScaledVector(directionRef.current, weaponConfig.range)

    pushBulletTrace({
      from: [playerPositionRef.current.x, playerPositionRef.current.y, playerPositionRef.current.z],
      to: [bulletEnd.x, bulletEnd.y, bulletEnd.z],
      color: weaponConfig.projectileColor,
      width: weaponConfig.projectileWidth,
      life: selectedWeapon === 'sniper' ? 0.14 : 0.08,
    })

    if (!didHitBot || distance >= weaponConfig.range) {
      return
    }

    const now = performance.now()
    if (now - lastDamageAtRef.current < 40) {
      return
    }
    lastDamageAtRef.current = now

    const newHealth = Math.max(0, gameState.aiHealth - weaponConfig.damage)
    setAiHealth(newHealth)
    addScore(weaponConfig.hitScore)
    registerHit()
    audioManager.play('hit', 0.9)

    if (newHealth <= 0 && !killRegisteredRef.current) {
      killRegisteredRef.current = true
      registerKill()
    } else if (newHealth > 0) {
      killRegisteredRef.current = false
    }
  })

  return (
    <>
      {bulletTraces.map((trace) => (
        <Line
          key={trace.id}
          points={[trace.from, trace.to]}
          color={trace.color}
          transparent
          opacity={Math.min(1, trace.life * 10)}
          lineWidth={trace.width}
        />
      ))}
    </>
  )
}
