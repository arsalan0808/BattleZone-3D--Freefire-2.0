import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clampArenaPosition, getRandomPatrolPoint, getSafeSpawnPositions, isLineOfSightBlocked } from '../game/arena'
import { getWeaponConfig } from '../game/weapons'
import { useGameStore } from '../store/gameStore'
import { playerRef } from './Player'
import { HumanoidModelLoader, type HumanoidConfig } from '../systems/character/HumanoidModelLoader'
import type { CharacterController } from '../systems/character/CharacterController'

export let aiBotRef: React.MutableRefObject<THREE.Group | null> | null = null
const AI_MODEL_SCALE = 0.9

type AIBehavior = 'idle' | 'patrol' | 'chase' | 'attack'

interface AIBotState {
  behavior: AIBehavior
  velocity: THREE.Vector3
  direction: THREE.Vector3
  patrolTarget: THREE.Vector3
  strafeDirection: number
  nextAttackAt: number
  attackFlash: number
  decisionTimer: number
  spawnGraceUntil: number
}

export const AIBot = () => {
  const spawnPosition = getSafeSpawnPositions().ai
  const meshRef = useRef<THREE.Group>(null)
  const modelContainerRef = useRef<THREE.Group>(null)
  const hitboxRef = useRef<THREE.Mesh>(null)
  const controllerRef = useRef<CharacterController | null>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const toPlayerRef = useRef(new THREE.Vector3())
  const moveTargetRef = useRef(new THREE.Vector3())
  const playerAimPointRef = useRef(new THREE.Vector3())
  const shotOriginRef = useRef(new THREE.Vector3())
  const shotTargetRef = useRef(new THREE.Vector3())
  const aiStateRef = useRef<AIBotState>({
    behavior: 'idle',
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    patrolTarget: new THREE.Vector3(12, 0, 10),
    strafeDirection: 1,
    nextAttackAt: 0,
    attackFlash: 0,
    decisionTimer: 0,
    spawnGraceUntil: 2.5,
  })

  const aiHealth = useGameStore((state) => state.aiHealth)
  const setPlayerHealth = useGameStore((state) => state.setPlayerHealth)
  const registerDamage = useGameStore((state) => state.registerDamage)
  const registerEnemyShot = useGameStore((state) => state.registerEnemyShot)
  const pushBulletTrace = useGameStore((state) => state.pushBulletTrace)
  const isPaused = useGameStore((state) => state.isPaused)

  // Load humanoid model (same as player)
  useEffect(() => {
    let isDisposed = false

    const loadModel = async () => {
      try {
        HumanoidModelLoader.initialize()

        const config: HumanoidConfig = {
          modelUrl: '/mode1s/character.glb',
          scale: 1.0,
          position: new THREE.Vector3(0, 0, 0),
          skinTone: '#f0d0b0',
          armorColor: '#dc2626', // Red armor to distinguish from player
          castShadow: true,
          receiveShadow: true,
        }

        const loaded = await HumanoidModelLoader.loadHumanoid(config)

        if (isDisposed) {
          loaded.controller.dispose()
          return
        }

        if (modelContainerRef.current) {
          modelContainerRef.current.clear()
          modelContainerRef.current.add(loaded.model)
        }

        controllerRef.current = loaded.controller
        setIsModelLoaded(true)
      } catch (error) {
        console.error('[AIBot] Failed to load humanoid model:', error)
        setIsModelLoaded(false)
      }
    }

    loadModel()

    return () => {
      isDisposed = true
      if (controllerRef.current) {
        controllerRef.current.dispose()
        controllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    aiBotRef = meshRef
    return () => {
      aiBotRef = null
    }
  }, [])

  useFrame((state, delta) => {
    if (!meshRef.current || isPaused || !playerRef?.current) {
      return
    }

    const aiBot = meshRef.current
    if (aiHealth <= 0) {
      aiBot.visible = false
      aiStateRef.current.attackFlash = 0
      aiStateRef.current.velocity.set(0, 0, 0)
      return
    }

    aiBot.visible = true
    const aiState = aiStateRef.current
    const player = playerRef.current
    const enemyWeapon = getWeaponConfig('rifle')
    const toPlayer = toPlayerRef.current.subVectors(player.position, aiBot.position)
    const distanceToPlayer = toPlayer.length()
    const directionToPlayer = distanceToPlayer > 0.001 ? toPlayer.normalize() : toPlayer
    playerAimPointRef.current.copy(player.position)
    playerAimPointRef.current.y += 1.2
    const canSeePlayer = !isLineOfSightBlocked(
      aiBot.position.clone().setY(1.4),
      playerAimPointRef.current,
      0.18
    )

    const moveSpeed = aiState.behavior === 'attack' ? 3.1 : 4.35
    const acceleration = 7.2
    const friction = 7.2
    const maxRotationSpeed = 8.5
    const chaseRange = 35
    const attackRange = 25
    const idealRange = 14
    const now = state.clock.elapsedTime
    const inSpawnGrace = now < aiState.spawnGraceUntil

    if (distanceToPlayer < chaseRange) {
      if (canSeePlayer) {
        aiState.behavior = distanceToPlayer <= attackRange ? 'attack' : 'chase'
      } else {
        aiState.behavior = 'chase'
      }
    } else {
      aiState.behavior = 'patrol'
      aiState.patrolTarget.copy(getRandomPatrolPoint())
    }

    aiState.attackFlash = Math.max(0, aiState.attackFlash - delta * 8)

    if (aiState.decisionTimer <= 0) {
      aiState.strafeDirection = Math.random() > 0.5 ? 1 : -1
      aiState.decisionTimer = 1.4 + Math.random() * 1.2
    } else {
      aiState.decisionTimer -= delta
    }

    const targetDirection = moveTargetRef.current.set(0, 0, 0)

    if (aiState.behavior === 'attack') {
      const strafe = new THREE.Vector3(directionToPlayer.z, 0, -directionToPlayer.x).multiplyScalar(
        aiState.strafeDirection
      )
      targetDirection.copy(strafe)

      if (distanceToPlayer > idealRange + 2) {
        targetDirection.add(directionToPlayer)
      } else if (distanceToPlayer < idealRange - 4) {
        targetDirection.addScaledVector(directionToPlayer, -0.8)
      }

      if (canSeePlayer && now >= aiState.nextAttackAt && !inSpawnGrace) {
        aiState.nextAttackAt = now + enemyWeapon.fireIntervalMs / 1000 + 0.2 + Math.random() * 0.3
        aiState.attackFlash = 1
        registerEnemyShot()

        shotOriginRef.current.copy(aiBot.position)
        shotOriginRef.current.y += 1.35
        shotTargetRef.current.copy(playerAimPointRef.current)

        // Better projectile prediction with less spread
        const inaccuracy = Math.pow(distanceToPlayer / 40, 0.8) * 1.5
        shotTargetRef.current.x += (Math.random() - 0.5) * inaccuracy
        shotTargetRef.current.y += (Math.random() - 0.5) * (inaccuracy * 0.6)
        shotTargetRef.current.z += (Math.random() - 0.5) * inaccuracy

        // Higher hit chance at close range
        const hitChance = THREE.MathUtils.clamp(
          0.35 + (1 - distanceToPlayer / 40) * 0.55,
          0.25,
          0.75
        )

        const isHit = Math.random() < hitChance
        if (isHit) {
          const damage = Math.round(enemyWeapon.damage * 0.7 * (1 + (1 - distanceToPlayer / 40) * 0.4))
          setPlayerHealth(Math.max(0, useGameStore.getState().playerHealth - damage))
          registerDamage()
          shotTargetRef.current.copy(playerAimPointRef.current)
        }

        pushBulletTrace({
          from: [shotOriginRef.current.x, shotOriginRef.current.y, shotOriginRef.current.z],
          to: [shotTargetRef.current.x, shotTargetRef.current.y, shotTargetRef.current.z],
          color: '#fb7185',
          width: 1.2,
          life: 0.1,
        })
      }
    } else if (aiState.behavior === 'chase') {
      targetDirection.copy(directionToPlayer)
    } else {
      if (aiBot.position.distanceTo(aiState.patrolTarget) < 2.5) {
        aiState.patrolTarget.copy(getRandomPatrolPoint())
      }
      targetDirection.copy(aiState.patrolTarget).sub(aiBot.position).setY(0)
    }

    if (targetDirection.lengthSq() > 0) {
      targetDirection.normalize()
      aiState.velocity.x = THREE.MathUtils.damp(aiState.velocity.x, targetDirection.x * moveSpeed, acceleration, delta)
      aiState.velocity.z = THREE.MathUtils.damp(aiState.velocity.z, targetDirection.z * moveSpeed, acceleration, delta)
    } else {
      aiState.velocity.x = THREE.MathUtils.damp(aiState.velocity.x, 0, friction, delta)
      aiState.velocity.z = THREE.MathUtils.damp(aiState.velocity.z, 0, friction, delta)
    }

    aiBot.position.x += aiState.velocity.x * delta
    aiBot.position.z += aiState.velocity.z * delta
    aiBot.position.y = 0
    clampArenaPosition(aiBot.position, 1.6)

    const targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z)
    const currentRotation = aiBot.rotation.y
    let rotationDelta = targetRotation - currentRotation

    if (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2
    if (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2

    aiBot.rotation.y += rotationDelta * Math.min(1, maxRotationSpeed * delta)
    aiState.direction.copy(targetDirection)

    // Update animations based on behavior
    if (isModelLoaded && controllerRef.current) {
      const speed = aiState.velocity.length()
      if (speed < 0.5) {
        controllerRef.current.playAnimation('idle', true)
      } else if (speed < 2.8) {
        controllerRef.current.playAnimation('walk', true)
      } else {
        controllerRef.current.playAnimation('run', true)
      }

      if (aiState.behavior === 'attack') {
        controllerRef.current.playAnimation('aim', true, 0.5)
      }

      controllerRef.current.update(delta)
    }
  })

  return (
    <group ref={meshRef} position={spawnPosition}>
      <group
        ref={modelContainerRef}
        scale={[AI_MODEL_SCALE, AI_MODEL_SCALE, AI_MODEL_SCALE]}
        position={[0, -0.02, 0]}
      >
        {/* Model will be loaded here */}
      </group>

      <mesh ref={hitboxRef} position={[0, 1.05, 0]} userData={{ isEnemyHitbox: true }}>
        <capsuleGeometry args={[0.55, 1.45, 6, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.2} />
      </mesh>

      <AIHealthIndicator health={aiHealth} />
    </group>
  )
}

const AIHealthIndicator = ({ health, maxHealth = 100 }: { health: number; maxHealth?: number }) => {
  const healthPercent = (health / maxHealth) * 100
  let healthColor = 0x00ff99
  if (healthPercent <= 50) healthColor = 0xffcc33
  if (healthPercent <= 25) healthColor = 0xff4d4f

  return (
    <group position={[0, 2.15, 0]}>
      <mesh>
        <boxGeometry args={[1.2, 0.12, 0.05]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.7} />
      </mesh>

      <mesh position={[-0.6 + (healthPercent / 100) * 0.6, 0, 0.03]} scale={[healthPercent / 100, 1, 1]}>
        <boxGeometry args={[1.2, 0.12, 0.05]} />
        <meshBasicMaterial color={healthColor} toneMapped={false} />
      </mesh>
    </group>
  )
}
