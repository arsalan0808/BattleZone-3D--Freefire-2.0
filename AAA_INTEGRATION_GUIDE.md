# AAA-Quality Shooter Integration Guide

Complete production guide to integrate all the advanced systems into your game.

## ✅ Systems Built

1. **CharacterController** - Realistic humanoid with animation blending
2. **HumanoidModelLoader** - GLTF/GLB loading with PBR materials
3. **AnimationBlender** - Layered animation system (legs + upper body)
4. **CameraController** - 360° camera with desktop/mobile controls
5. **WeaponController** - Weapon attachment, firing, recoil
6. **BoneAttachmentManager** - Robust bone attachment system
7. **LightingSystem** - 5+ lighting presets (sunny, night, indoor, sci-fi)
8. **PerformanceOptimizer** - Auto-quality adjustment (Ultra to Mobile)
9. **DebugTools** - Real-time monitoring & debugging overlay

---

## 📋 Integration Checklist

### Phase 1: Replace Current Character System

#### Step 1a: Update Player Component

**File:** `src/components/Player.tsx`

Replace the current simple character with the advanced system:

```typescript
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { HumanoidModelLoader, type LoadedHumanoid } from '../systems/character/HumanoidModelLoader'
import { AnimationBlender } from '../systems/character/AnimationBlender'
import { BoneAttachmentManager } from '../systems/weapons/BoneAttachmentManager'

export let playerRef: React.MutableRefObject<THREE.Group | null> | null = null

export const Player = () => {
  const groupRef = useRef<THREE.Group>(null)
  const humanoidRef = useRef<LoadedHumanoid | null>(null)
  const blenderRef = useRef<AnimationBlender | null>(null)
  const boneManagerRef = useRef<BoneAttachmentManager | null>(null)

  const movementInput = useGameStore((state) => state.movementInput)
  const isShootingInput = useGameStore((state) => state.isShootingInput)
  const selectedWeapon = useGameStore((state) => state.selectedWeapon)
  const isReloading = useGameStore((state) => state.isReloading)

  // Load humanoid model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        const humanoid = await HumanoidModelLoader.loadHumanoid({
          modelUrl: '/models/characters/humanoid_tactical.glb', // Your Mixamo model
          scale: 0.95,
          position: new THREE.Vector3(0, 0, 0),
          skinTone: '#f0d0b0',
          armorColor: '#3d4d5d',
        })

        if (groupRef.current) {
          // Add model to group
          groupRef.current.add(humanoid.model)

          // Initialize animation blender
          const blender = new AnimationBlender(humanoid.controller)
          blenderRef.current = blender

          // Setup bone attachments
          const boneManager = new BoneAttachmentManager(
            humanoid.model.children.find((c: any) => c.isSkinnedMesh)?.skeleton
          )
          boneManagerRef.current = boneManager

          // Store reference
          humanoidRef.current = humanoid
        }
      } catch (error) {
        console.error('[Player] Failed to load humanoid:', error)
      }
    }

    loadModel()
    playerRef = groupRef

    return () => {
      playerRef = null
    }
  }, [])

  // Animation state machine
  useFrame((_, delta) => {
    if (!blenderRef.current) return

    const isMoving = Math.abs(movementInput.x) > 0.1 || Math.abs(movementInput.z) > 0.1

    if (isReloading) {
      blenderRef.current.playSimple('reload', false, 0.2)
    } else if (isShootingInput && isMoving) {
      // Layered: run with upper-body shooting
      blenderRef.current.playLayered('run', 'shoot', 0.8, 0.25)
    } else if (isShootingInput) {
      // Layered: idle with aiming/shooting
      blenderRef.current.playLayered('idle', 'aim', 0.9, 0.3)
    } else if (isMoving) {
      const speed = Math.sqrt(movementInput.x ** 2 + movementInput.z ** 2)
      blenderRef.current.playSimple(speed > 0.7 ? 'run' : 'walk', true, 0.3)
    } else {
      blenderRef.current.playSimple('idle', true, 0.35)
    }

    // Update animation
    if (humanoidRef.current) {
      humanoidRef.current.controller.update(delta)
    }
    blenderRef.current.update(delta)
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Character model is added dynamically above */}
    </group>
  )
}
```

### Phase 1b: Update Camera Component

**File:** `src/components/Camera.tsx`

Replace with the new CameraController:

```typescript
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { CameraController } from '../systems/camera/CameraController'
import { playerRef } from './Player'

export const Camera = () => {
  const { camera, scene } = useThree()
  const controllerRef = useRef<CameraController | null>(null)

  const isShootingInput = useGameStore((state) => state.isShootingInput)
  const movementInput = useGameStore((state) => state.movementInput)
  const isPaused = useGameStore((state) => state.isPaused)

  useEffect(() => {
    // Initialize camera controller
    const controller = new CameraController(camera, scene, {
      distance: 9.5,
      fov: {
        default: 68,
        moving: 72,
        aiming: 48,
      },
    })

    controllerRef.current = controller

    return () => {
      controller.dispose()
    }
  }, [camera, scene])

  useFrame((_, delta) => {
    if (!playerRef?.current || !controllerRef.current || isPaused) return

    const isMoving = Math.abs(movementInput.x) > 0.1 || Math.abs(movementInput.z) > 0.1

    // Update camera
    controllerRef.current.update(
      playerRef.current.position,
      isShootingInput, // is aiming
      isMoving,        // is moving
      delta
    )

    // Fire event with camera info for debug
    if (isShootingInput) {
      controllerRef.current.shake(0.1, 0.08) // Camera recoil on fire
    }
  })

  return null
}
```

### Phase 1c: Update Game Lighting

**File:** `src/scenes/GameScene.tsx`

Replace LightingSystem with new presets:

```typescript
import { applyLightingPreset, LIGHTING_PRESETS } from '../systems/rendering/LightingSystem'

// In your scene setup:
const setupLighting = (scene: THREE.Scene) => {
  // Choose preset: 'sunny', 'night', 'indoor', 'scifi'
  applyLightingPreset(scene, LIGHTING_PRESETS.sunny)
}
```

### Phase 1d: Add Performance Optimizer

**File:** `src/scenes/GameScene.tsx`

```typescript
import { PerformanceOptimizer } from '../systems/optimization/PerformanceOptimizer'

const GameScene = () => {
  const optimizerRef = useRef<PerformanceOptimizer | null>(null)

  const { camera, scene, gl } = useThree()

  useEffect(() => {
    // Initialize optimizer
    const optimizer = new PerformanceOptimizer(gl, scene, camera)
    optimizer.enableAutoOptimization(true)
    optimizerRef.current = optimizer
  }, [gl, scene, camera])

  useFrame((_, delta) => {
    optimizerRef.current?.update(delta)
  })
}
```

### Phase 1e: Add Debug Tools

**File:** `src/scenes/GameScene.tsx`

```typescript
import { DebugTools } from '../systems/debug/DebugTools'

const GameScene = () => {
  const debugRef = useRef<DebugTools | null>(null)

  useEffect(() => {
    // Initialize debug tools (only dev mode)
    if (process.env.NODE_ENV === 'development') {
      const debug = new DebugTools({
        enabled: true,
        showFPSMonitor: true,
        showAnimationState: true,
        showCameraInfo: true,
      })
      debugRef.current = debug
    }
  }, [])

  useFrame((state, delta) => {
    if (!debugRef.current || !playerRef?.current) return

    const blenderInfo = blenderRef.current?.getBlendState()

    debugRef.current.update({
      fps: state.clock.getDelta() > 0 ? 1 / state.clock.getDelta() : 0,
      frameTime: state.clock.getDelta() * 1000,
      cameraPos: camera.position,
      cameraRot: camera.rotation,
      animationState: blenderInfo?.currentBlendState?.baseAnimation || 'idle',
      playerHealth: playerHealth,
      playerPos: playerRef.current.position,
    })
  })
}
```

---

## 🎯 Integration Steps Summary

### Step 1: Prepare Assets
```bash
# Place your Mixamo model in public/models/
/public/models/characters/humanoid_tactical.glb

# Optionally, place weapon models:
/public/models/weapons/rifle.glb
/public/models/weapons/sniper.glb
```

### Step 2: Update Dependencies
```bash
npm install three @react-three/fiber @react-three/drei zustand
```

### Step 3: Replace Components

Run these replacements in your codebase:

```bash
# Update Player component
# Update Camera component
# Update Lighting in GameScene
# Add PerformanceOptimizer to GameScene
# Add DebugTools to GameScene
```

### Step 4: Test Integration

1. **Access Debug Panel:** Press `Ctrl+Shift+D` in-game
2. **Monitor Performance:** Check FPS in bottom-left corner
3. **Animation Switching:** Press movement keys to see animations change
4. **Camera Controls:**
   - Desktop: Right-click + drag to rotate
   - Desktop: Scroll wheel to zoom
   - Mobile: Touch drag to rotate, pinch to zoom

### Step 5: Customize

#### Change Character Model
```typescript
// In Player.tsx
const humanoid = await HumanoidModelLoader.loadHumanoid({
  modelUrl: '/models/characters/YOUR_MODEL.glb',
  skinTone: '#f0d0b0',
  armorColor: '#2d3d4d',
})
```

#### Change Lighting Preset
```typescript
import { LIGHTING_PRESETS } from '../systems/rendering/LightingSystem'

// Use one of: 'sunny', 'night', 'indoor', 'scifi'
applyLightingPreset(scene, LIGHTING_PRESETS.scifi)
```

#### Adjust Camera Distance
```typescript
const controller = new CameraController(camera, scene, {
  distance: 12, // Increase for wider view
  minDistance: 4,
  maxDistance: 20,
})
```

---

## 🔧 Next Steps (Future Enhancements)

### Immediate Improvements
- [ ] Load weapon models and attach to RightHand bone
- [ ] Integrate weapon firing with animation events
- [ ] Add footstep sounds with animation events
- [ ] Implement hit reaction animations

### Mid-term
- [ ] Inverse Kinematics (IK) for natural foot placement
- [ ] Facial animations (blend shapes)
- [ ] Voice lines and dialogue
- [ ] Ragdoll physics on death

### Long-term
- [ ] HDRI environment maps for realistic reflections
- [ ] Screen-space ambient occlusion (SSAO)
- [ ] Post-processing effects (bloom, motion blur)
- [ ] Advanced water/weather systems

---

## 📊 Performance Targets

### Desktop (1080p)
- ✅ 60 FPS consistent
- ✅ < 5ms frame time
- ✅ 100-150 draw calls
- ✅ 1-2M triangles

### Tablet
- ✅ 45-60 FPS
- ✅ < 7ms frame time
- ✅ 50-80 draw calls
- ✅ 500K-1M triangles

### Mobile (Low-end)
- ✅ 30-45 FPS
- ✅ < 15ms frame time
- ✅ 20-40 draw calls
- ✅ 200-500K triangles

**Current system automatically adjusts quality to maintain targets.**

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Model doesn't appear | Check console for load errors; verify modelUrl is correct |
| Animations not playing | Ensure model has animations bundled; check animation names |
| Camera shaky | Increase damping value (0.2-0.3 recommended) |
| Low FPS | Debug tools show quality level; manually downgrade with setQualityLevel() |
| Bones not found | Check bone names in Blender; verify skeleton export |

---

## 🎮 Debug Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+D` | Toggle debug panel |
| `Ctrl+Shift+F` | Toggle FPS monitor |
| `Ctrl+Shift+A` | Toggle animation state |
| `Ctrl+Shift+C` | Toggle camera info |
| `Ctrl+Shift+M` | Toggle memory usage |
| `Ctrl+Shift+B` | Toggle bone helper |

---

## 📚 System Architecture

```
GameScene
├── LightingSystem (HDRI, directional, point lights)
├── Player
│   ├── HumanoidModelLoader (model + textures)
│   ├── CharacterController (animations)
│   ├── AnimationBlender (layering)
│   └── BoneAttachmentManager (weapons, accessories)
├── Camera
│   └── CameraController (360° controls, smooth follow)
├── Weapons
│   ├── WeaponController (firing, recoil)
│   └── WeaponInventory (weapon switching)
├── PerformanceOptimizer (FPS + quality management)
└── DebugTools (real-time monitoring)
```

---

## 🚀 Deployment

### Before Production:

```
☑️ All animations working smoothly
☑️ FPS stable at target (60 desktop, 30+ mobile)
☑️ No console errors or warnings
☑️ Models optimized (< 2MB combined with Draco)
☑️ Tested on multiple devices (iOS, Android, Desktop)
☑️ Audio configured properly
☑️ Weapon mechanics working
☑️ Debug tools disabled in production mode
```

### Build & Deploy:
```bash
npm run build
# Deploy to CDN/hosting
# Use HTTPS for PWA support
```

---

## 📖 API Reference

### CharacterController
```typescript
controller.playAnimation(name, loop, fadeInDuration, fadeOutDuration)
controller.playLayeredAnimation(lower, upper, weight)
controller.update(delta)
controller.getBone(purpose: 'rightHand' | 'leftHand' | 'head' | 'spine' | 'pelvis')
```

### AnimationBlender
```typescript
blender.playSimple(name, loop, fadeTime)
blender.playLayered(baseAnim, upperAnim, weight, duration)
blender.update(delta)
blender.getBlendState()
```

### CameraController
```typescript
camera.update(playerPosition, isAiming, isMoving, delta)
camera.setAiming(aiming)
camera.toggleShoulder()
camera.shake(intensity, duration)
```

### PerformanceOptimizer
```typescript
optimizer.update(deltaTime)
optimizer.setQualityLevel(QualityLevel.HIGH)
optimizer.getQualityLevelName() // "High", "Medium", etc.
optimizer.getMetrics() // FPS, drawCalls, memory, etc.
```

### DebugTools
```typescript
debug.update(debugData)
debug.log(category, message, level)
debug.togglePanel()
debug.exportDebugInfo()
```

---

## 🎓 Learning Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber Guide](https://docs.pmnd.rs/react-three-fiber/)
- [Mixamo Animation Library](https://www.mixamo.com/)
- [WebGL Performance](https://www.khronos.org/opengl/wiki/Profiling)
