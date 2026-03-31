# AAA Shooter Systems - Troubleshooting & Best Practices

## 🐛 Troubleshooting Guide

### Performance Issues

#### Problem: FPS drops below 30
**Symptoms:** Game feels stuttery, animations lag

**Solutions:**
1. Check debug panel (press `Ctrl+Shift+D`):
   - Look at "Quality" level
   - If already at "Mobile", need to optimize further

2. Reduce draw calls:
   ```typescript
   optimizer.setQualityLevel(QualityLevel.LOW)
   ```

3. Disable shadows (if on mobile):
   ```typescript
   renderer.shadowMap.enabled = false
   ```

4. Check triangle count:
   ```typescript
   const metrics = optimizer.getMetrics()
   console.log(`Triangles: ${metrics.triangles}`) // Should be < 500K on mobile
   ```

5. **Model optimization:**
   - Re-export with Draco compression
   - Reduce bone count (combine small bones)
   - Use lower polygon version on mobile

---

#### Problem: Frame rate inconsistent (jumps 60→45→60)
**Symptoms:** Jittery camera, stuttering animations

**Solutions:**
1. Enable frame rate capping:
   ```typescript
   renderer.setAnimationLoop = (callback) => {
     let lastTime = 0
     const handleAnimationFrame = (time) => {
       const deltaTime = time - lastTime
       if (deltaTime >= 1000 / 60) { // 60 FPS cap
         lastTime = time
         callback(time)
       }
      requestAnimationFrame(handleAnimationFrame)
     }
     requestAnimationFrame(handleAnimationFrame)
   }
   ```

2. Check for memory leaks:
   - Debug panel should show stable memory
   - If memory grows over time, check for unreleased textures

3. Disable auto-optimization:
   ```typescript
   optimizer.enableAutoOptimization(false)
   optimizer.setQualityLevel(QualityLevel.MEDIUM)
   ```

---

### Animation Issues

#### Problem: Animations don't play or snap to wrong pose
**Symptoms:** Character freezes, jerky transitions, wrong animation plays

**Solutions:**
1. Verify animations are loaded:
   ```typescript
   const animations = humanoid.controller.getDebugInfo()
   console.log('Registered animations:', animations.registeredAnimations)
   ```
   Should show: idle, run, walk, aim, shoot, reload, etc.

2. Check animation names match:
   ```typescript
   // In your model, verify these names exist:
   // Mixamo standard: mixamo_com|humanoid|Idle
   // Custom: idle, run, shoot, etc.
   
   // Rename in Blender if needed before export
   ```

3. Increase fade time for smoother transitions:
   ```typescript
   blender.playSimple('run', true, 0.5) // 500ms fade
   ```

4. Check if animations are looping correctly:
   ```typescript
   blender.getBlendState() // Returns current animation info
   ```

---

#### Problem: Aiming + running layered animation doesn't work
**Symptoms:** Either walking or aiming shows, but not both

**Solutions:**
1. Ensure animations exist in model:
   ```typescript
   const debug = controller.getDebugInfo()
   console.log('Has "run"?', debug.registeredAnimations.includes('run'))
   console.log('Has "aim"?', debug.registeredAnimations.includes('aim'))
   ```

2. Check blend weight is non-zero:
   ```typescript
   blender.playLayered('run', 'aim', 0.0) // ❌ 0 = invisible upper body
   blender.playLayered('run', 'aim', 0.8) // ✅ 80% aiming
   ```

3. Verify upper body animation is looping:
   ```typescript
   // Make sure 'aim' animation exists and loops
   controller.playAnimation('aim', true) // Must be loop: true
   ```

---

### Camera Issues

#### Problem: Camera spins wildly or jerks around
**Symptoms:** Uncontrollable camera rotation, motion sickness

**Solutions:**
1. Check mouse sensitivity:
   ```typescript
   const camera = new CameraController(renderer.camera, scene, {
     rotationSensitivity: {
       desktop: 0.002, // Reduce this
       mobile: 0.010
     }
   })
   ```

2. Verify damping is reasonable:
   ```typescript
   // Higher damping = smoother but more delayed
   camera.config.damping = 0.15 // Usually 0.12-0.18
   ```

3. Reset camera if stuck:
   ```typescript
   camera.targetRotation = { x: 0.5, y: 0 }
   camera.rotation = { x: 0.5, y: 0 }
   ```

---

#### Problem: Camera clips through walls or goes underground
**Symptoms:** Can see inside geometry, camera behavior glitchy

**Solutions:**
1. Mark obstacles for collision:
   Add userData to obstacles in Blender:
   ```typescript
   wall.userData.isObstacle = true
   ```

2. Adjust camera position offset:
   ```typescript
   const camera = new CameraController(renderer.camera, scene, {
     distance: 10, // Distance from player
     initialHeight: 1.55, // Look-at height
     verticalOffset: 0.8 // How high camera pivot
   })
   ```

3. Disable collision detection if causing issues:
   ```typescript
   // In CameraController, comment out _applyCollisionDetection() call
   ```

---

#### Problem: Mobile camera too sensitive or not responsive
**Symptoms:** Touch drag doesn't rotate smoothly, or too jerky

**Solutions:**
1. Adjust mobile sensitivity:
   ```typescript
   rotationSensitivity: {
     mobile: 0.015 // Increase for more responsive
   }
   ```

2. Enable/disable inertia:
   ```typescript
   camera.inertiaEnabled = true // Smooth deceleration after swipe
   ```

3. Increase damping for smoother feel:
   ```typescript
   config.damping = 0.20 // Higher = slower follow
   ```

---

### Weapon Issues

#### Problem: Weapon doesn't appear or appears in wrong place
**Symptoms:** Gun invisible, weapon stuck in character body

**Solutions:**
1. Check weapon model loading:
   ```typescript
   try {
     const weaponModel = await weapon.loadModel()
     console.log('Weapon loaded:', weaponModel)
   } catch (e) {
     console.error('Failed to load weapon:', e)
   }
   ```

2. Verify bone attachment:
   ```typescript
   const rightHand = humanoid.bones.rightHand
   if (!rightHand) {
     console.error('Right hand bone not found!')
   } else {
     weapon.attachToBone(rightHand)
   }
   ```

3. Adjust attachment offset:
   ```typescript
   weapon.attachToBone(rightHandBone, {
     position: new THREE.Vector3(0, -0.1, -0.3), // Adjust offset
     rotation: new THREE.Quaternion(),
     scale: 1.0
   })
   ```

4. Verify weapon scale:
   ```typescript
   // Weapon might be too small or too large
   // Check in Blender if scale is 1:1 with character
   ```

---

#### Problem: Weapon fires but no visual feedback (muzzle flash, recoil)
**Symptoms:** Character fires but nothing visible happens

**Solutions:**
1. Check muzzle flash enabled:
   ```typescript
   weapon.getStats() // Should show isFiring: true
   ```

2. Apply camera shake on fire:
   ```typescript
   if (weapon.fire()) {
     cameraController.shake(0.12, 0.08)
   }
```

3. Verify muzzle flash has proper scale:
   ```typescript
   {
     muzzle: {
       position: [0.15, 0.05, 0],
       flashScale: 1.0
     }
   }
   ```

---

### Material & Lighting Issues

#### Problem: Character looks flat or unlit
**Symptoms:** No shadows, character blends into background

**Solutions:**
1. Verify PBR materials applied:
   ```typescript
   humanoid.model.traverse((obj) => {
     if (obj instanceof THREE.Mesh) {
       console.log('Material:', obj.material)
       // Should have metalness, roughness properties
     }
   })
   ```

2. Increase ambient light:
   ```typescript
   const preset = LIGHTING_PRESETS.sunny
   preset.ambientLight.intensity = 0.8 // Increase from 0.6
   ```

3. Make sure directional light casts shadow:
   ```typescript
   directionalLight.castShadow = true
   directionalLight.shadow.mapSize.width = 2048
   ```

4. Enable post-processing:
   ```typescript
   renderer.toneMapping = THREE.ACESFilmicToneMapping
   renderer.toneMappingExposure = 1.0
   ```

---

#### Problem: Lighting looks wrong (too dark, too bright, wrong colors)
**Symptoms:** Environment doesn't look right, hard to see details

**Solutions:**
1. Try different preset:
   ```typescript
   applyLightingPreset(scene, LIGHTING_PRESETS.night) // or other presets
   ```

2. Adjust specific light:
   ```typescript
   const preset = LIGHTING_PRESETS.sunny
   preset.directionalLight.intensity = 1.4 // Make brighter
   preset.ambientLight.intensity = 0.7
   applyLightingPreset(scene, preset)
   ```

3. Check for missing environment map:
   ```typescript
   // PBR materials need environment map for reflections
   const envMap = await textureLoader.loadAsync('hdri.hdr')
   // Apply to scene...
   ```

---

### Bone & Attachment Issues

#### Problem: Bones not detected, "Bone not found" error
**Symptoms:** Error when trying to attach weapon, rigid bones variable is undefined

**Solutions:**
1. Debug detected bones:
   ```typescript
   const debug = humanoid.controller.getDebugInfo()
   console.log('Detected bones:', debug.detectedBones) // Should be 20+
   ```

2. Check bone names match:
   ```typescript
   // Mixamo uses:
   // armature.Hips → Armature|Hips
   // Spell-check bone names carefully!
   
   // Verify what's available:
   humanoid.model.traverse((obj) => {
     if (obj.isBone) console.log('Bone found:', obj.name)
   })
   ```

3. Re-export model with correct bone structure:
   - Use Mixamo standard character (Marcus, Zara)
   - Export without modifications
   - Ensure "Rig" is included when exporting

---

## ✅ Best Practices

### Performance

#### 1. **Pre-load expensive assets**
```typescript
// Load models ahead of time
useEffect(() => {
  HumanoidModelLoader.initialize() // 1ms
  // Game ready instantly when needed
}, [])
```

#### 2. **Use appropriate quality level**
```typescript
// Mobile detection
const isMobile = /iPhone|Android|iPad/i.test(navigator.userAgent)
optimizer.setQualityLevel(isMobile ? QualityLevel.LOW : QualityLevel.HIGH)
```

#### 3. **Cache geometry and materials**
```typescript
// Don't create new materials each frame
const skinMaterial = PBRMaterialFactory.createSkinMaterial()
// Reuse across characters
```

#### 4. **Implement LOD (Level of Detail)**
```typescript
// Swap models based on distance
const distance = player.position.distanceTo(camera.position)
if (distance > 50) {
  // Use low-res model
} else if (distance > 20) {
  // Use medium-res model
} else {
  // Use high-res model
}
```

---

### Animation

#### 1. **Use smooth transitions with appropriate fade times**
```typescript
// Too fast: feels unnatural
blender.playSimple('run', true, 0.05) // 50ms ❌

// Good: feels responsive
blender.playSimple('run', true, 0.25) // 250ms ✅

// Too slow: feels laggy
blender.playSimple('run', true, 1.0) // 1000ms ❌
```

#### 2. **Blend layered animations contextually**
```typescript
// While aiming at extreme angles, favor aiming
const aimStrength = Math.abs(cameraRotation.x) / (Math.PI / 4)
blender.playLayered('idle', 'aim', aimStrength)
```

#### 3. **Preload all animations upfront**
```typescript
// Don't load animations on-demand during gameplay
// Load all at startup for instant playback
const allAnimations = [
  'idle', 'walk', 'run', 'aim', 'shoot', 'reload'
]
```

---

### Camera

#### 1. **Match sensitivity to device**
```typescript
{
  rotationSensitivity: {
    desktop: 0.0035, // Precise mouse control
    mobile: 0.015    // Larger fingers, less precise
  }
}
```

#### 2. **Use inertia for mobile smoothness**
```typescript
// After swipe, camera continues momentum smoothly
camera.inertiaEnabled = true
camera.inertiaVelocity = swipeVelocity
```

#### 3. **Clamp vertical rotation to prevent flipping**
```typescript
// Don't let camera go completely upside down
targetRotation.x = THREE.MathUtils.clamp(
  targetRotation.x,
  -Math.PI / 2.5,  // Max look down
  Math.PI / 2.8    // Max look up
)
```

---

### Weapons

#### 1. **Attach weapons to bones, not hardcoded positions**
```typescript
// ❌ Wrong: gun stuck to screen position
gun.position.set(0.5, -0.3, -0.8)

// ✅ Right: gun moves with hand bone
weapon.attachToBone(rightHandBone, offset)
```

#### 2. **Apply recoil to camera, not weapon**
```typescript
// Weapon doesn't move, but camera shakes
weapon.fire()
camera.shake(0.15, 0.1)

// This creates illusion of gun recoil
```

#### 3. **Procedurally generate fire sounds**
```typescript
// Don't rely on audio files for latency
const osc = audioContext.createOscillator()
// Generate sound in real-time for instant response
```

---

### Lighting

#### 1. **Choose preset based on game mode**
```typescript
// Arena mode → sunny (good visibility)
applyLightingPreset(scene, LIGHTING_PRESETS.sunny)

// Night mode → night (dramatic, challenging)
applyLightingPreset(scene, LIGHTING_PRESETS.night)
```

#### 2. **Don't exceed 3-4 shadow-casting lights**
```typescript
// Each shadow-casting light = performance cost
// Usually: 1 directional + 1-2 point lights max
```

#### 3. **Use fog to hide far geometry**
```typescript
scene.fog = new THREE.Fog(
  '#0a1520',  // Color matches sky
  30,         // Near distance
  150         // Far distance (where fade completes)
)
```

---

### Code Organization

#### 1. **Keep systems separate and injectable**
```typescript
export const GameScene = () => {
  // ✅ Good: systems can be replaced/configured
  const [cameraController] = useState(() => 
    new CameraController(camera, scene, customConfig)
  )
}
```

#### 2. **Use refs for persistent objects**
```typescript
// ✅ Good: persist between renders
const blenderRef = useRef<AnimationBlender | null>(null)

// ❌ Wrong: recreated each render
const blender = new AnimationBlender()
```

#### 3. **Clean up resources properly**
```typescript
useEffect(() => {
  // Setup
  const optimizer = new PerformanceOptimizer(renderer, scene, camera)
  
  return () => {
    // Cleanup
    optimizer.dispose()
  }
}, [renderer, scene, camera])
```

---

### Testing & Optimization

#### 1. **Profile with DevTools**
```
Chrome DevTools:
1. Ctrl+Shift+J → Performance tab
2. Record for 5 seconds of gameplay
3. Look for spikes in:
   - JavaScript execution
   - Layout recalculation
   - Rendering time
```

#### 2. **Monitor memory leaks**
```typescript
// Check memory doesn't grow infinitely
if (performance.memory) {
  const memBefore = performance.memory.usedJSHeapSize
  // ... play for 1 minute
  const memAfter = performance.memory.usedJSHeapSize
  
  if (memAfter - memBefore > 50MB) {
    console.warn('Possible memory leak!')
  }
}
```

#### 3. **Test on real devices**
```bash
# Desktop (Windows/Mac/Linux)
npm run dev
# Test in Chrome, Firefox, Safari

# Mobile (iOS)
# Deploy to HTTPS URL, open in Safari
# Connect to Remote Inspector

# Mobile (Android)
# Deploy to HTTPS URL, open in Chrome
# Use Chrome DevTools remote debug
```

---

### Deployment Checklist

```
Before Going Live:

Performance:
☑ FPS stable at 60 (desktop), 30+ (mobile)
☑ Memory stays < 300MB
☑ Initial load < 3 seconds
☑ No WebGL errors in console

Content:
☑ All 8+ animations working
☑ Character looks visually polished
☑ Weapons attach correctly
☑ Lighting looks intentional

Testing:
☑ Tested on 3+ devices
☑ Tested on 2+ browsers
☑ Tested landscape + portrait (mobile)
☑ No lag on 4G/LTE connection

Debugging:
☑ Debug tools disabled (or set to dev-only)
☑ Console.log() spam removed
☑ No console errors or warnings
```

---

## 🎓 Learning Resources

- **Three.js Performance:** https://threejs.org/manual/#en/fundamentals/performance
- **React Three Fiber Best Practices:** https://docs.pmnd.rs/react-three-fiber/
- **WebGL Debugging:** https://spector.babylonjs.com/
- **Animation Principles:** https://muybridge.com/ (classic reference)

---

## 📞 Getting Help

If something doesn't work:

1. **Check debug tools** (`Ctrl+Shift+D`)
2. **Check browser console** (F12 → Console tab)
3. **Check system requirements** (GPU, RAM, OS)
4. **Try disabling debug tools** (in case they're causing conflict)
5. **Try lower quality level** (may reveal performance issue)
6. **Export debug info** (`debug.exportDebugInfo()`) for bug reports
