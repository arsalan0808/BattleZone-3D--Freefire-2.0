# AAA Shooter Systems - Quick Reference

## System Overview

### 1️⃣ Character System
**Purpose:** Realistic humanoid with skeleton and animations
**Key Classes:**
- `CharacterController` - Core animation management
- `HumanoidModelLoader` - Load GLTF models with PBR materials
- `AnimationBlender` - Layer animations (legs + upper body)

**Quick Start:**
```typescript
// Load model
const humanoid = await HumanoidModelLoader.loadHumanoid({
  modelUrl: '/models/humanoid.glb',
  scale: 0.95
})

// Create blender
const blender = new AnimationBlender(humanoid.controller)

// Play layered: run with upper body aiming
blender.playLayered('run', 'aim', 0.8)
```

---

### 2️⃣ Animation System
**Purpose:** Smooth transitions between 8+ animations
**Features:**
- Automatic state machine with transitions
- Layered blending (lower + upper body)
- One-shot effects (recoil, hit reactions)

**Quick Start:**
```typescript
const blender = new AnimationBlender(controller)

// Simple animation
blender.playSimple('idle', true) // Loop idle

// Layered: lower body run + upper body shooting
blender.playLayered('run', 'shoot', 0.7, 0.4)

// Update every frame
blender.update(delta)
```

---

### 3️⃣ Camera System
**Purpose:** 360° third-person camera with physics
**Features:**
- Orbital camera around player
- Desktop + mobile controls
- Smooth follow with damping
- Dynamic FOV adjustment
- Collision detection
- Shoulder swap

**Quick Start:**
```typescript
const camera = new CameraController(renderer.camera, scene, {
  distance: 9.5,
  fov: { default: 68, aiming: 48 }
})

// Update every frame
camera.update(
  playerPosition,
  isAiming,    // narrows FOV
  isMoving,    // widens FOV
  delta
)

// Hotkeys work automatically:
// Right-click + drag: rotate (desktop)
// Touch drag: rotate (mobile)
// Scroll / pinch: zoom
```

---

### 4️⃣ Weapon System
**Purpose:** Firing, attachment, recoil, effects
**Classes:**
- `WeaponController` - Individual weapon config
- `WeaponInventory` - Weapon collection manager
- `BoneAttachmentManager` - Attach to character bones

**Quick Start:**
```typescript
// Create weapon
const weaponConfig: WeaponConfig = {
  id: 'rifle',
  name: 'Assault Rifle',
  modelUrl: '/models/rifle.glb',
  damage: 18,
  fireRate: 8, // shots per second
  spread: 0.012,
  recoilForce: 0.15,
  magazine: 30,
  attachmentOffset: {
    position: [0, 0, 0],
    rotation: [0, 0, 0]
  }
}

const weapon = new WeaponController(weaponConfig)
await weapon.loadModel()

// Attach to RightHand bone
weapon.attachToBone(rightHandBone)

// Fire!
if (weapon.fire()) {
  console.log('Shot fired!')
}

// Update each frame
weapon.update(delta)
```

---

### 5️⃣ Lighting System
**Purpose:** Multiple lighting presets for different environments
**Presets:** sunny, night, indoor, scifi

**Quick Start:**
```typescript
import { LIGHTING_PRESETS, applyLightingPreset } from '../systems/rendering/LightingSystem'

// Apply preset (automatically manages all lights)
applyLightingPreset(scene, LIGHTING_PRESETS.sunny)

// Switch preset dynamically
applyLightingPreset(scene, LIGHTING_PRESETS.night)
```

**Lighting Details:**
| Preset | Best For | Lighting Style |
|--------|----------|----------------|
| sunny | Arena combat | Bright, high contrast |
| night | Stealth, drama | Cool tones, accent lights |
| indoor | Corridor fighting | Neutral, controlled |
| scifi | Futuristic | Neon, blue/magenta accents |

---

### 6️⃣ Performance System
**Purpose:** Auto-adjust quality for stable FPS
**Quality Levels:** Ultra (5) → Mobile (1)

**Quick Start:**
```typescript
const optimizer = new PerformanceOptimizer(renderer, scene, camera)

// Auto-adjust based on FPS
optimizer.enableAutoOptimization(true)

// Manual control
optimizer.setQualityLevel(QualityLevel.HIGH)

// Get metrics
const metrics = optimizer.getMetrics()
console.log(`FPS: ${metrics.fps}, Draw Calls: ${metrics.drawCalls}`)
```

**Auto-Optimization:**
- FPS drops below 60? → Reduce quality
- FPS above 80? → Increase quality
- Maintains 60 FPS desktop, 30-45 FPS mobile

---

### 7️⃣ Debug System
**Purpose:** Real-time monitoring & debugging
**Hotkeys:**
- `Ctrl+Shift+D` - Toggle panel
- `Ctrl+Shift+F` - Toggle FPS
- `Ctrl+Shift+A` - Toggle animations
- `Ctrl+Shift+C` - Toggle camera
- `Ctrl+Shift+M` - Toggle memory

**Quick Start:**
```typescript
const debug = new DebugTools({
  enabled: process.env.NODE_ENV === 'development',
  showFPSMonitor: true,
  showAnimationState: true
})

// Update every frame
debug.update({
  fps: currentFPS,
  frameTime: deltaTime,
  cameraPos: camera.position,
  animationState: currentAnimation,
  playerHealth: health
})

// Log events
debug.log('[Combat]', 'Player fired weapon', 'info')
debug.log('[Warning]', 'Low FPS detected', 'warn')
```

---

## 🎮 Game Loop Integration Example

```typescript
export const GameScene = () => {
  const playerRef = useRef<THREE.Group>(null)
  const humanoidRef = useRef<LoadedHumanoid | null>(null)
  const blenderRef = useRef<AnimationBlender | null>(null)
  const cameraRef = useRef<CameraController | null>(null)
  const optimizerRef = useRef<PerformanceOptimizer | null>(null)
  const debugRef = useRef<DebugTools | null>(null)

  // Setup (runs once)
  useEffect(() => {
    // Initialize all systems...
  }, [])

  // Main game loop
  useFrame((state, delta) => {
    if (!playerRef.current) return

    const { movementInput, isShootingInput, playerHealth } = useGameStore.getState()

    // 1. Update character animation
    if (blenderRef.current && humanoidRef.current) {
      const isMoving = Math.abs(movementInput.x) > 0.1 || Math.abs(movementInput.z) > 0.1

      if (isShootingInput) {
        blenderRef.current.playLayered('run', 'shoot', 0.75, 0.3)
      } else if (isMoving) {
        blenderRef.current.playSimple('run', true, 0.25)
      } else {
        blenderRef.current.playSimple('idle', true, 0.35)
      }

      // Update animation
      humanoidRef.current.controller.update(delta)
      blenderRef.current.update(delta)
    }

    // 2. Update camera
    if (cameraRef.current) {
      cameraRef.current.update(
        playerRef.current.position,
        isShootingInput,
        Math.abs(movementInput.x) > 0.1 || Math.abs(movementInput.z) > 0.1,
        delta
      )
    }

    // 3. Update performance
    if (optimizerRef.current) {
      optimizerRef.current.update(delta)
    }

    // 4. Update debug display
    if (debugRef.current) {
      const metrics = optimizerRef.current?.getMetrics()
      debugRef.current.update({
        fps: state.clock.getDelta() > 0 ? 1 / state.clock.getDelta() : 0,
        frameTime: state.clock.getDelta() * 1000,
        cameraPos: state.camera.position,
        animationState: 'idle',
        playerHealth,
        playerPos: playerRef.current.position,
        performance: metrics
      })
    }
  })

  return <group ref={playerRef} />
}
```

---

## 📊 File Structure

```
src/systems/
├── character/
│   ├── CharacterController.ts
│   ├── HumanoidModelLoader.ts
│   ├── AnimationBlender.ts
│   └── BoneAttachmentManager.ts
├── camera/
│   └── CameraController.ts
├── weapons/
│   ├── WeaponController.ts
│   └── BoneAttachmentManager.ts
├── rendering/
│   └── LightingSystem.ts
├── optimization/
│   └── PerformanceOptimizer.ts
└── debug/
    └── DebugTools.ts
```

---

## 🔑 Key Concepts

### Animation Blending
Legs animate one thing (walking), upper body animates another (aiming). Blend weight controls how much upper body animation affects final pose.

```typescript
// 60% run, 40% idle
blender.playLayered('run', 'idle', 0.4)

// 100% shoot
blender.playLayered('idle', 'shoot', 1.0)
```

### Camera Physics
Camera doesn't snap to new position - it smoothly interpolates with damping for cinematic feel.

```typescript
// Distance lerps: camera.distance = lerp(current, target, 0.12)
// Rotation easing: camera.rotation = lerp(current, target, 0.18)
```

### Bone Attachment
Objects can be attached to character bones - moving with the skeleton automatically. Perfect for weapons following hand bone.

```typescript
weapon.attachToBone(rightHandBone, {
  position: [0, 0, -0.3],
  rotation: [0, 0, 0]
})
// Gun automatically follows hand!
```

### Quality Levels
Auto-adjust render quality to maintain target FPS. Lower framerate = reduce:
- Shadows (disabled on mobile)
- Pixel ratio (1.0 on mobile, 2.0 on desktop)
- Draw calls through culling
- Texture resolution

---

## 🎯 Common Tasks

### Make character run while aiming
```typescript
blender.playLayered('run', 'aim', 0.9)
```

### Fire weapon with recoil
```typescript
weapon.fire() // plays fire animation
camera.shake(0.15, 0.1) // camera recoil
```

### Switch lighting
```typescript
applyLightingPreset(scene, LIGHTING_PRESETS.night)
```

### Check performance
```typescript
const metrics = optimizer.getMetrics()
console.log(`Quality: ${optimizer.getQualityLevelName()} @ ${metrics.fps} FPS`)
```

### Add custom animation transition
```typescript
blender.addTransition('idle', 'jump', 0.2, Easing.easeOutCubic)
```

---

## ⚡ Performance Tips

1. **Use setQualityLevel()** if you know target device capability
2. **Draco compress** character models (80% smaller files)
3. **LOD (Level of Detail)** - swap character model at distance
4. **Frustum culling** - don't render what's off-screen
5. **Batch animations** - combine multiple models with same material

---

## 🚀 Next Level Features

To extend the system further:

1. **IK Solver** - Feet stick to ground naturally
2. **Facial Animations** - Blend shapes for expressions
3. **Voice Lines** - Audio sync with animations
4. **Ragdoll Physics** - Death animations
5. **HDRI Maps** - Realistic reflections
6. **Post-Processing** - Bloom, motion blur, color grading

Each can be added without breaking existing systems!
