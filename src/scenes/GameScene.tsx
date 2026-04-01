import { Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ARENA_OBSTACLES } from '../game/arena'
import { useGameStore } from '../store/gameStore'
import { HUD } from '../components/HUD'
import { MobileControls } from '../components/MobileControls'
import { PauseMenu } from '../components/PauseMenu'
import { Player } from '../components/Player'
import { AIBot } from '../components/AIBot'
import { Camera } from '../components/Camera'
import { Shooting } from '../components/Shooting'
import { PointerTracker } from '../components/PointerTracker'
import { isMobile } from '../utils/device'
import { PerformanceOptimizer } from '../systems/optimization/PerformanceOptimizer'

export const GameScene = memo(() => {
  const isPaused = useGameStore((state) => state.isPaused)
  const mobile = isMobile()

  return (
    <div className="w-full h-screen relative bg-[#070b14]">
      <Canvas
        className="relative z-0"
        camera={{ position: [0, 6, 10], fov: 68, near: 0.1, far: 200 }}
        shadows={!mobile}
        dpr={[1, mobile ? 1.25 : 2]}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#070b14', 1)
          scene.background = new THREE.Color('#070b14')
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          precision: 'mediump',
          depth: true,
          stencil: false,
        }}
        performance={{ min: 0.6, max: 1, debounce: 200 }}
        frameloop={isPaused ? 'demand' : 'always'}
      >
        <fog attach="fog" args={['#0a1320', 22, 135]} />

        <LightingSystem mobile={mobile} />
        <PerformanceMonitor />
        <Arena />
        <Player />
        <AIBot />
        <Shooting />
        <Camera />
      </Canvas>

      <PointerTracker />
      <HUD />
      {mobile && <MobileControls />}
      {isPaused && <PauseMenu />}
    </div>
  )
})

GameScene.displayName = 'GameScene'

const LightingSystem = memo(({ mobile }: { mobile: boolean }) => (
  <>
    <ambientLight intensity={mobile ? 0.72 : 0.55} color={0xb9d7ff} />
    <hemisphereLight intensity={mobile ? 0.58 : 0.45} color={0x8dc7ff} groundColor={0x10151d} />
    <directionalLight
      position={[18, 30, 12]}
      intensity={mobile ? 1.2 : 1.6}
      color={0xfff2d2}
      castShadow={!mobile}
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-far={80}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
    />
    <directionalLight position={[-20, 12, -18]} intensity={0.35} color={0x67c8ff} />
    <pointLight position={[0, 9, 0]} intensity={0.35} color={0xff9f3f} distance={40} />
    <Stars radius={100} depth={20} count={mobile ? 350 : 1200} factor={mobile ? 1.25 : 2} saturation={0.2} fade speed={0.35} />
    {!mobile && <Sparkles count={16} scale={[55, 6, 55]} size={2.6} speed={0.25} color="#ffd27f" />}
  </>
))

LightingSystem.displayName = 'LightingSystem'

const Arena = memo(() => {
  const structures = useMemo(() => ARENA_OBSTACLES, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140, 1, 1]} />
        <meshStandardMaterial color="#101b29" roughness={0.92} metalness={0.08} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[140, 140, 1, 1]} />
        <meshStandardMaterial color="#213246" emissive="#0f1722" emissiveIntensity={0.2} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[140, 140, 32, 32]} />
        <meshStandardMaterial
          color="#1a2a3a"
          emissive="#0a1018"
          emissiveIntensity={0.18}
          roughness={0.96}
          metalness={0.05}
          wireframe={false}
        />
      </mesh>

      <gridHelper args={[140, 32, '#ffb347', '#18304b']} position={[0, 0.05, 0]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[8, 10, 48]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.25} />
      </mesh>

      {structures.map((structure) => (
        <group key={structure.id} position={structure.position}>
          <mesh castShadow receiveShadow userData={{ isObstacle: true }}>
            <boxGeometry args={structure.size} />
            <meshStandardMaterial color={structure.color} metalness={0.18} roughness={0.74} />
          </mesh>
          <mesh position={[0, structure.size[1] / 2 + 0.04, 0]}>
            <boxGeometry args={[structure.size[0] * 0.92, 0.08, structure.size[2] * 0.92]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff9f3f" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}

      {[
        [-22, 0.9, -24],
        [-8, 0.9, 10],
        [7, 0.9, -6],
        [24, 0.9, 24],
      ].map((position, index) => (
        <group key={`crate-${index}`} position={position as [number, number, number]}>
          <mesh castShadow receiveShadow userData={{ isObstacle: true }}>
            <boxGeometry args={[2.2, 1.8, 2.2]} />
            <meshStandardMaterial color="#374151" roughness={0.82} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.91, 0]}>
            <boxGeometry args={[1.9, 0.08, 1.9]} />
            <meshStandardMaterial color="#f59e0b" emissive="#fb923c" emissiveIntensity={0.22} />
          </mesh>
        </group>
      ))}

      {[
        [-50, 4, -50],
        [50, 4, -50],
        [-50, 4, 50],
        [50, 4, 50],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow>
          <cylinderGeometry args={[1.1, 1.5, 8, 10]} />
          <meshStandardMaterial color="#233244" emissive="#5bc0eb" emissiveIntensity={0.18} />
        </mesh>
      ))}
    </group>
  )
})

Arena.displayName = 'Arena'
/**
 * Performance monitoring component
 * Tracks FPS, memory usage, and quality settings
 */
const PerformanceMonitor = memo(() => {
  const { gl, scene, camera } = useThree()
  const optimizerRef = useRef<PerformanceOptimizer | null>(null)

  useEffect(() => {
    const optimizer = new PerformanceOptimizer(gl, scene, camera)
    optimizerRef.current = optimizer

    return () => {
      // Cleanup if needed
    }
  }, [gl, scene, camera])

  useFrame((_, delta) => {
    if (optimizerRef.current) {
      optimizerRef.current.update(delta)
    }
  })

  return null
})

PerformanceMonitor.displayName = 'PerformanceMonitor'
