# BattleZone 3D Development Guide

This guide explains the architecture, folder structure, and best practices for developing BattleZone 3D.

## Architecture Overview

### Scene-Based Design

The game is organized around **scenes** (game states):
- **Loading** → Progress bar
- **Lobby** → Menu + character preview
- **Game** → Active gameplay
- **Pause** → Pause overlay
- **GameOver** → Win/lose screen

Scenes are managed via Zustand store and switched with `useGameStore().setScene()`.

### Component Organization

```
Components are split by responsibility:

1. Scene Components (scenes/)
   - Lobby.tsx: Menu entry point
   - GameScene.tsx: Main gameplay arena

2. Logic Components (components/)
   - Player.tsx: Player character controller
   - AIBot.tsx: Enemy AI behavior
   - Camera.tsx: Third-person follow camera
   - Shooting.tsx: Projectile system
   
3. UI Components (components/)
   - HUD.tsx: Health bars, score, crosshair
   - Loading.tsx: Loading screen
   - PauseMenu.tsx: Pause overlay
   - MobileControls.tsx: Touch joystick
```

### Three.js Boundary

**Canvas (Three.js)** ← Lives in `<Canvas>` from @react-three/fiber
- Player geometry
- AIBot geometry  
- Camera controller
- Projectiles
- Environmental objects

**React DOM** ← Lives in regular React render tree
- HUD overlay (Tailwind CSS)
- UI buttons (Framer Motion)
- Mobile controls
- Pause menu

**Key rule**: Keep game logic (health, AI, movement) in **Zustand store**, not in React component state.

### State Management (Zustand)

Located in `src/store/gameStore.ts`:

```typescript
interface GameState {
  // Scene switching
  currentScene: 'loading' | 'lobby' | 'game' | 'pause' | 'gameover'
  setScene: (scene) => void

  // Player/AI stats
  playerHealth: number
  aiHealth: number
  playerScore: number

  // Input state
  movementInput: { x: number; z: number }
  isShootingInput: boolean
  cameraRotation: { x: number; y: number }

  // Game flags
  isPaused: boolean
  soundVolume: number
}
```

**Why Zustand?**
- Lightweight (no boilerplate)
- Direct state updates (not immutable actions)
- Great DevTools support
- Easy to use in useFrame hooks

## Development Workflow

### 1. **Adding a New Component**

```typescript
// src/components/MyComponent.tsx
import { useGameStore } from '../store/gameStore'
import { useFrame } from '@react-three/fiber'

export const MyComponent = () => {
  const playerHealth = useGameStore(state => state.playerHealth)
  
  useFrame((state) => {
    // Game tick logic
  })
  
  return (
    <mesh>
      <boxGeometry />
      <meshPhongMaterial color={0xffa500} />
    </mesh>
  )
}
```

### 2. **Handling Input**

**Desktop (Keyboard + Mouse)**:
```typescript
useEffect(() => {
  const handleKeyDown = (e) => {
    setMovementInput({ x: -1, z: 0 }) // For 'A' key
  }
  window.addEventListener('keydown', handleKeyDown)
}, [])
```

**Mobile (Touch)**:
- Located in `MobileControls.tsx`
- Joystick calculates normalized input (-1 to 1)
- Single shoot button for tap

**Unified access**:
```typescript
const movementInput = useGameStore(state => state.movementInput)
const isShootingInput = useGameStore(state => state.isShootingInput)
```

### 3. **Adding Audio (Howler.js)**

```typescript
import { Howl } from 'howler'

const shootSound = new Howl({
  src: ['/sounds/shoot.mp3'],
  volume: 0.8
})

// Play sound
shootSound.play()
```

### 4. **Animation (Framer Motion)**

```typescript
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### 5. **Responsive Design (Tailwind)**

```typescript
import { isMobile } from '../utils/device'

if (isMobile()) {
  // Show mobile-specific UI
}

// Or use Tailwind breakpoints
<div className="block md:hidden">Mobile only</div>
<div className="hidden md:block">Desktop only</div>
```

## Game Loop

```
Every frame:
1. Input handling (setMovementInput, setShootingInput)
2. AI behavior (decision making, pathfinding)
3. Physics/collision (movement, collision detection)
4. Damage resolution (health updates)
5. Camera update (follow player)
6. UI update (health bars, score)
7. Audio playback (sound effects)
```

## Performance Tips

### 1. **Avoid Re-renders**
```typescript
// ❌ Bad - whole store subscribers on every state change
const state = useGameStore()

// ✅ Good - only subscribe to needed values
const health = useGameStore(state => state.playerHealth)
const isShootingInput = useGameStore(state => state.isShootingInput)
```

### 2. **useFrame Instead of useState**
```typescript
// ❌ Bad - causes re-renders
const [position, setPosition] = useState([0, 0, 0])

// ✅ Good - no re-renders, runs in frame loop
useFrame(() => {
  meshRef.current.position.x += 0.1
})
```

### 3. **Memoization for UI**
```typescript
import { memo } from 'react'

export const HUD = memo(() => {
  // Only re-renders when deps change
})
```

### 4. **Three.js Optimization**
- Use `drei` utilities (`useGLTF`, `useAnimations`)
- Leverage frustum culling (built-in to Three.js)
- Batch geometries when possible
- Use LOD (Level of Detail) for distant objects

## Common Tasks

### Add a New Scene

1. Create `src/scenes/MyScene.tsx`
2. Export component
3. Add case in `App.tsx` AnimatePresence
4. Add scene type to `GameState`

### Add a New Game Stat

1. Add to `GameState` interface in `gameStore.ts`
2. Add getter/setter action
3. Add initializer
4. Use with `useGameStore(state => state.myVariable)`

### Deploy to PWA

```bash
npm run build
# Outputs to dist/
# Upload dist/ to hosting

# PWA automatically caches on first visit
# Users can install from browser menu
```

## Debugging

### Enable Debug Mode

```typescript
// In GameScene.tsx
const isDev = import.meta.env.DEV
{isDev && <axesHelper scale={5} />}
```

### Check State in DevTools

```typescript
// Access from console
useGameStore.setState({ playerHealth: 50 })
useGameStore.getState().currentScene
```

### Performance Monitoring

- Use Chrome DevTools → Performance tab
- Check FPS with Three.js stats (install drei's Stats)
- Profile with React DevTools

## File Naming Conventions

- **Components**: PascalCase (`Player.tsx`, `HUD.tsx`)
- **Utilities**: camelCase (`device.ts`, `physics.ts`)
- **Store**: camelCase (`gameStore.ts`)
- **Styles**: kebab-case (`globals.css`)
- **Scenes**: PascalCase (`Lobby.tsx`, `GameScene.tsx`)

## Folder for Assets

Place in `src/assets/`:
- `models/` → 3D models (GLTF/GLB)
- `sounds/` → Audio files (MP3/WAV)
- `images/` → Textures, sprites
- `fonts/` → Custom fonts

Import via:
```typescript
import shootSoundUrl from '../assets/sounds/shoot.mp3'
```

## Testing Strategy

- **Unit tests**: Test utility functions in `utils/`
- **Integration tests**: Test Zustand store mutations
- **E2E tests**: Test scene transitions
- **Visual tests**: Snapshot tests for UI components

## Next Steps

1. **Populate `src/assets/`** with 3D models and sounds
2. **Implement Player controller** with WASD + mouse
3. **Build AI behavior system** (idle, chase, attack states)
4. **Create projectile system** with collision detection
5. **Add visual effects** (particle systems, hit feedback)
6. **Polish UI** with animations and sounds
7. **Optimize for mobile** performance and controls

---

Questions? Check `README.md` or consult the Game Architect agent!
