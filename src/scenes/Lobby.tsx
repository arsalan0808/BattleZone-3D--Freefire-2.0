import { Float } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { AnimatedButton } from '../components/AnimatedButton'
import { CharacterModel } from '../components/CharacterModel'
import { unlockAudio } from '../utils/audioManager'
import { isMobile } from '../utils/device'

const screenTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
}

export const Lobby = () => {
  const setScene = useGameStore((state) => state.setScene)
  const isMobileDevice = isMobile()

  const handleStartGame = () => {
    unlockAudio()
    setScene('game')
  }

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleStartGame()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <motion.div
      className="relative flex min-h-screen w-full flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_36%),linear-gradient(160deg,#05070d_0%,#0b1120_45%,#101d30_100%)] md:items-center md:justify-center md:overflow-hidden"
      {...screenTransition}
      transition={{ duration: 0.45 }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,179,71,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,179,71,0.08)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,174,66,0.25),transparent_20%),radial-gradient(circle_at_80%_70%,rgba(91,192,235,0.16),transparent_24%)]" />

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-3 py-6 sm:px-4 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:items-center md:gap-8 md:py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="order-2 w-full md:order-1 md:max-w-2xl">
          <motion.p
            className="mb-2 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-100 sm:px-4 sm:tracking-[0.45em]"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            Premium Arena Build
          </motion.p>
          <motion.h1
            className="text-3xl font-black uppercase tracking-[0.15em] text-white drop-shadow-[0_0_30px_rgba(255,179,71,0.35)] sm:text-4xl md:text-5xl lg:text-7xl"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            Battle Royale
          </motion.h1>
          <motion.p
            className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            Drop into a glossy neon arena with responsive gunplay, richer camera feel, premium HUD polish, and mobile-ready controls.
          </motion.p>

          <motion.div
            className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
          >
            {[
              ['Responsive', 'Smoother follow and motion'],
              ['Immersive', 'Ambient audio and hit feedback'],
              ['Mobile Ready', 'Touch-safe controls'],
            ].map(([title, subtitle]) => (
              <div key={title} className="glass-panel premium-panel px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100 sm:tracking-[0.25em]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300 sm:mt-2 sm:text-sm sm:leading-6">{subtitle}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="order-1 flex w-full flex-col gap-4 md:order-2 md:ml-auto md:max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
        >
          <div className="glass-panel premium-panel relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,174,66,0.2),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(91,192,235,0.18),transparent_28%)]" />
            <div className={`${isMobileDevice ? 'h-64' : 'h-[26rem]'} w-full`}>
              <LobbyPreview isMobile={isMobileDevice} />
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-md">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Operator Preview</p>
              <p className="mt-1 text-sm font-semibold text-white">Operator Nova</p>
              <p className="text-xs text-slate-300">Mixamo character linked to live in-game loadout.</p>
            </div>
          </div>

          <motion.div
            className="glass-panel premium-panel relative z-10 w-full px-4 py-5 sm:px-5 sm:py-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 sm:tracking-[0.4em]">Deploy Brief</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300 sm:mt-4 sm:space-y-3 sm:text-sm">
              <div className="flex items-center justify-between">
                <span>Mode</span>
                <span className="font-semibold text-amber-100">1v1 Elimination</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Visuals</span>
                <span className="font-semibold text-amber-100">High Fidelity Lite</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Input</span>
                <span className="font-semibold text-amber-100">{isMobileDevice ? 'Touch Optimized' : 'Mouse + Key'}</span>
              </div>
            </div>

            <AnimatedButton
              glow
              onClick={handleStartGame}
              className="mt-5 w-full py-3 text-base font-black uppercase tracking-[0.2em] sm:mt-6 sm:py-4 sm:text-lg sm:tracking-[0.28em]"
            >
              Enter Arena
            </AnimatedButton>

            <p className="mt-3 text-center text-xs uppercase tracking-[0.25em] text-slate-500 sm:mt-4 sm:tracking-[0.32em]">
              {isMobileDevice ? 'Tap to deploy' : 'Press Enter'}
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const LobbyPreview = ({ isMobile }: { isMobile: boolean }) => {
  const cameraPos: [number, number, number] = isMobile ? [0.1, 1.8, 4] : [0.45, 2.1, 5]
  const target: [number, number, number] = isMobile ? [0, 1.2, 0] : [0.05, 1.25, 0]

  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: cameraPos, fov: isMobile ? 38 : 34 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
    >
      <fog attach="fog" args={['#070c14', 8, 16]} />
      <LobbyPreviewCamera target={target} />
      <ambientLight intensity={1.05} color={0xd9e8ff} />
      <hemisphereLight intensity={0.75} color={0xbcd7ff} groundColor={0x0a1018} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} color={0xfff3d6} castShadow />
      <pointLight position={[-3.5, 2.6, 2.8]} intensity={2.1} color={0xffa53d} distance={12} />
      <pointLight position={[2.5, 2.1, -1.2]} intensity={1.15} color={0x5bc0eb} distance={10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[isMobile ? 2.8 : 3.2, 48]} />
        <meshStandardMaterial color="#101826" roughness={0.88} metalness={0.08} />
      </mesh>
      <Float speed={isMobile ? 1.5 : 2} rotationIntensity={isMobile ? 0.25 : 0.35} floatIntensity={isMobile ? 0.22 : 0.35}>
        <group
          rotation={[0, isMobile ? -0.3 : -0.34, 0]}
          position={isMobile ? [0.15, 0.18, -0.05] : [0.25, -0.02, -0.08]}
          scale={isMobile ? 0.86 : 1}
        >
          <CharacterModel color="#e2e8f0" emissive="#ffae42" />
        </group>
      </Float>
    </Canvas>
  )
}

const LobbyPreviewCamera = ({ target }: { target: [number, number, number] }) => {
  const { camera } = useThree()
  const lookTarget = new THREE.Vector3(...target)

  useFrame(() => {
    camera.lookAt(lookTarget)
  })

  return null
}
