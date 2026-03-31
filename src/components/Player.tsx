import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { getSafeSpawnPositions } from '../game/arena'
import { getWeaponConfig } from '../game/weapons'
import { useGameStore } from '../store/gameStore'
import { HumanoidModelLoader, type HumanoidConfig } from '../systems/character/HumanoidModelLoader'
import type { CharacterController } from '../systems/character/CharacterController'

export let playerRef: React.MutableRefObject<THREE.Group | null> | null = null
const LOCAL_PLAYER_MODEL_SCALE = 0.78

interface PlayerState {
  velocity: THREE.Vector3
  direction: THREE.Vector3
}

export const Player = () => {
  const spawnPosition = getSafeSpawnPositions().player
  const meshRef = useRef<THREE.Group>(null)
  const modelContainerRef = useRef<THREE.Group>(null)
  const weaponAnchorRef = useRef<THREE.Group>(null)
  const controllerRef = useRef<CharacterController | null>(null)
  const rightHandBoneRef = useRef<THREE.Bone | null>(null)
  const targetDirectionRef = useRef(new THREE.Vector3())
  const tempBonePositionRef = useRef(new THREE.Vector3())
  const tempBoneQuaternionRef = useRef(new THREE.Quaternion())
  const tempParentQuaternionRef = useRef(new THREE.Quaternion())
  const playerStateRef = useRef<PlayerState>({
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  })
  const [isModelLoaded, setIsModelLoaded] = useState(false)

  const movementInput = useGameStore((state) => state.movementInput)
  const setMovementInput = useGameStore((state) => state.setMovementInput)
  const playerHealth = useGameStore((state) => state.playerHealth)
  const cameraRotation = useGameStore((state) => state.cameraRotation)
  const isShootingInput = useGameStore((state) => state.isShootingInput)
  const selectedWeapon = useGameStore((state) => state.selectedWeapon)
  const isReloading = useGameStore((state) => state.isReloading)
  const shotPulse = useGameStore((state) => state.shotPulse)

  useEffect(() => {
    playerRef = meshRef
    return () => {
      playerRef = null
    }
  }, [])

  // Load humanoid model
  useEffect(() => {
    let isDisposed = false

    const loadModel = async () => {
      try {
        // Initialize loader
        HumanoidModelLoader.initialize()

        // Configure model loading with the Mixamo character
        const config: HumanoidConfig = {
          modelUrl: '/mode1s/character.glb', // Mixamo character model
          scale: 1.0,
          position: new THREE.Vector3(0, 0, 0),
          skinTone: '#f0d0b0',
          armorColor: '#e2e8f0',
          castShadow: true,
          receiveShadow: true,
        }

        console.log('[Player] Loading humanoid model from:', config.modelUrl)
        const loaded = await HumanoidModelLoader.loadHumanoid(config)

        if (isDisposed) {
          loaded.controller.dispose()
          return
        }

        console.log('[Player] Model loaded successfully')

        if (modelContainerRef.current) {
          modelContainerRef.current.clear()
          modelContainerRef.current.add(loaded.model)
        }

        controllerRef.current = loaded.controller
        rightHandBoneRef.current = loaded.bones.rightHand ?? null
        setIsModelLoaded(true)
      } catch (error) {
        console.error('[Player] Failed to load humanoid model:', error)
        // Fallback: use geometric representation
        rightHandBoneRef.current = null
        setIsModelLoaded(false)
      }
    }

    loadModel()

    return () => {
      isDisposed = true
      if (controllerRef.current) {
        controllerRef.current.dispose()
      }
      rightHandBoneRef.current = null
    }
  }, [])

  useEffect(() => {
    const keysPressed = {
      w: false,
      a: false,
      s: false,
      d: false,
    }

    const updateMovement = () => {
      const x = (keysPressed.d ? 1 : 0) - (keysPressed.a ? 1 : 0)
      const z = (keysPressed.w ? -1 : 0) + (keysPressed.s ? 1 : 0)

      if (x !== 0 || z !== 0) {
        const length = Math.sqrt(x * x + z * z)
        setMovementInput({ x: x / length, z: z / length })
        return
      }

      setMovementInput({ x: 0, z: 0 })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keysPressed[key] = true
        updateMovement()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keysPressed[key] = false
        updateMovement()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setMovementInput])

  useFrame((state, delta) => {
    if (!meshRef.current) {
      return
    }

    const player = meshRef.current
    const playerState = playerStateRef.current
    const targetDirection = targetDirectionRef.current

    const moveSpeed = 8
    const acceleration = 12
    const friction = 9
    const maxRotationSpeed = 10

    const cameraYaw = -cameraRotation.y
    const sinYaw = Math.sin(cameraYaw)
    const cosYaw = Math.cos(cameraYaw)
    targetDirection.set(
      movementInput.x * cosYaw - movementInput.z * sinYaw,
      0,
      movementInput.x * sinYaw + movementInput.z * cosYaw
    )

    if (targetDirection.lengthSq() > 0) {
      targetDirection.normalize()
      playerState.velocity.x = THREE.MathUtils.lerp(
        playerState.velocity.x,
        targetDirection.x * moveSpeed,
        Math.min(1, acceleration * delta)
      )
      playerState.velocity.z = THREE.MathUtils.lerp(
        playerState.velocity.z,
        targetDirection.z * moveSpeed,
        Math.min(1, acceleration * delta)
      )
    } else {
      playerState.velocity.x = THREE.MathUtils.damp(playerState.velocity.x, 0, friction, delta)
      playerState.velocity.z = THREE.MathUtils.damp(playerState.velocity.z, 0, friction, delta)
    }

    player.position.x += playerState.velocity.x * delta
    player.position.z += playerState.velocity.z * delta
    player.position.y = 0
    player.position.x = Math.max(-56, Math.min(56, player.position.x))
    player.position.z = Math.max(-56, Math.min(56, player.position.z))

    if (targetDirection.lengthSq() > 0.01 || isShootingInput || isReloading) {
      let targetRotation: number
      
      if (targetDirection.lengthSq() > 0.01) {
        // Moving: rotate toward movement direction
        targetRotation = Math.atan2(targetDirection.x, targetDirection.z)
      } else {
        // Standing still / shooting: use live camera direction for rotation
        // 🎯 Get aim direction from AimingSystem (not React state)
        const aimingSystem = (window as any).__aimingSystem
        if (aimingSystem) {
          const aimAngle = aimingSystem.getPlayerFacingAngle()
          targetRotation = aimAngle
        } else {
          // Fallback to React state if AimingSystem not available
          targetRotation = Math.PI - cameraRotation.y
        }
      }

      const currentRotation = player.rotation.y
      let rotationDelta = targetRotation - currentRotation

      if (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2
      if (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2

      player.rotation.y += rotationDelta * Math.min(1, maxRotationSpeed * delta)
    }

    playerState.direction.copy(playerState.velocity).normalize()

    if (weaponAnchorRef.current) {
      const weaponAnchor = weaponAnchorRef.current
      const rightHandBone = rightHandBoneRef.current

      if (rightHandBone) {
        rightHandBone.getWorldPosition(tempBonePositionRef.current)
        meshRef.current.worldToLocal(tempBonePositionRef.current)
        weaponAnchor.position.copy(tempBonePositionRef.current)

        rightHandBone.getWorldQuaternion(tempBoneQuaternionRef.current)
        meshRef.current.getWorldQuaternion(tempParentQuaternionRef.current).invert()
        weaponAnchor.quaternion.copy(
          tempParentQuaternionRef.current.multiply(tempBoneQuaternionRef.current)
        )

        const weaponLength =
          selectedWeapon === 'sniper' ? 1.15 : selectedWeapon === 'rifle' ? 0.9 : 0.62

        weaponAnchor.translateX(0.11)
        weaponAnchor.translateY(-0.07)
        weaponAnchor.translateZ(0.07)
        weaponAnchor.rotateX(0.08)
        weaponAnchor.rotateY(Math.PI / 2)
        weaponAnchor.rotateZ(-0.22)

        if (selectedWeapon === 'sniper') {
          weaponAnchor.translateX(0.04)
          weaponAnchor.translateY(-0.02)
        } else if (selectedWeapon === 'pistol') {
          weaponAnchor.translateX(-0.02)
          weaponAnchor.translateY(0.03)
          weaponAnchor.rotateZ(0.12)
        }

        weaponAnchor.translateX(weaponLength * 0.08)
      } else {
        weaponAnchor.position.set(0.4, 1.28, 0.38)
        weaponAnchor.rotation.set(0.15, 0.06, -0.28)
      }
    }

    // Update animations based on movement state
    if (controllerRef.current && isModelLoaded) {
      const speed = playerState.velocity.length()
      const nextAnimation = isReloading
        ? 'reload'
        : isShootingInput
          ? 'shoot'
          : speed > 4
            ? 'run'
            : speed > 0.5
              ? 'walk'
              : 'idle'
      const shouldLoop = nextAnimation === 'idle' || nextAnimation === 'walk' || nextAnimation === 'run'

      try {
        if (controllerRef.current.hasAnimation(nextAnimation)) {
          controllerRef.current.playAnimation(
            nextAnimation,
            shouldLoop,
            nextAnimation === 'run' ? 0.25 : 0.3,
            0.2
          )
        } else if (!controllerRef.current.isAnimationPlaying('idle')) {
          controllerRef.current.playAnimation('idle', true, 0.35, 0.3)
        }

        // Update mixer
        controllerRef.current.update(delta)
      } catch (error) {
        console.error('[Player] Animation error:', error)
      }
    }

    // Idle animation (breathing effect) when not loaded
    if (!isModelLoaded && playerState.velocity.lengthSq() < 0.2) {
      player.position.y += Math.sin(state.clock.elapsedTime * 2.4) * 0.03
    }
  })

  return (
    <group ref={meshRef} position={spawnPosition}>
      {/* Model container - will hold humanoid when loaded */}
      <group
        ref={modelContainerRef}
        scale={[LOCAL_PLAYER_MODEL_SCALE, LOCAL_PLAYER_MODEL_SCALE, LOCAL_PLAYER_MODEL_SCALE]}
        position={[0, -0.02, 0]}
      />

      {/* Fallback geometric player body when model not loaded */}
      {!isModelLoaded && (
        <mesh castShadow>
          <capsuleGeometry args={[0.35, 1.6, 4, 8]} />
          <meshStandardMaterial color="#4a90a4" metalness={0.2} roughness={0.8} />
        </mesh>
      )}

      {/* Weapon attachment point */}
      <group ref={weaponAnchorRef} position={[0.4, 1.28, 0.38]} rotation={[0.15, 0.06, -0.28]}>
        <mesh castShadow>
          <boxGeometry
            args={[
              selectedWeapon === 'sniper' ? 1.15 : selectedWeapon === 'rifle' ? 0.9 : 0.62,
              0.12,
              0.12,
            ]}
          />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.22} />
        </mesh>
        <mesh position={[-0.1, -0.12, 0]} castShadow>
          <boxGeometry args={[0.18, 0.22, 0.08]} />
          <meshStandardMaterial color="#f97316" emissive="#fb923c" emissiveIntensity={0.25} />
        </mesh>
        {shotPulse > 0 && !isReloading && (
          <mesh position={[getWeaponConfig(selectedWeapon).muzzleFlashScale * 0.6, 0, 0]} scale={getWeaponConfig(selectedWeapon).muzzleFlashScale}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshBasicMaterial color="#fff1b8" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* Shadow circle under player */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.22} />
      </mesh>

      {/* Health indicator */}
      <HealthIndicator health={playerHealth} />
    </group>
  )
}

const HealthIndicator = ({ health }: { health: number }) => {
  const healthPercent = Math.max(0, Math.min(100, health))
  const healthColor = healthPercent > 50 ? 0x00ff99 : healthPercent > 25 ? 0xffcc33 : 0xff4d4f

  return (
    <group position={[0, 2.15, 0]}>
      <mesh>
        <boxGeometry args={[1.2, 0.12, 0.05]} />
        <meshBasicMaterial color={0x020617} transparent opacity={0.72} />
      </mesh>

      <mesh
        position={[-0.6 + (healthPercent / 100) * 0.6, 0, 0.03]}
        scale={[healthPercent / 100, 1, 1]}
      >
        <boxGeometry args={[1.2, 0.12, 0.05]} />
        <meshBasicMaterial color={healthColor} toneMapped={false} />
      </mesh>
    </group>
  )
}
