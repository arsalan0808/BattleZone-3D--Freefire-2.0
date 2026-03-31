# Mixamo Model Setup Guide - AAA Quality Character Integration

## Overview
This guide walks you through integrating highly-realistic humanoid models from Mixamo into your shooter game with proper animations and bone structure.

## Step 1: Download Character Model from Mixamo

### 1a. Go to Mixamo.com
- Visit https://www.mixamo.com/#/
- Sign in with Adobe ID (free account available)

### 1b. Select Character
**Recommended High-Quality Characters:**
- **Marcus** - Realistic male, well-proportioned
- **Zara** - Realistic female, excellent anatomy
- **Mutant** - Unique, sci-fi aesthetic
- **Kaya** - High-quality female character

**What to Avoid:**
- Cartoonish characters (incompatible with AAA look)
- Low LP poly models (prefer Medium/High quality)

### 1c. Download Settings
1. Click **Download**
2. Select format: **`Collada (.dae)`** first (we'll convert)
3. Enable: **"Without Skin"** (for our PBR material system)
4. Click **Download**

Alternatively, for GLTF:
- Some Mixamo exports support GLTF - check if available
- GLTF is preferred (already compressed)

## Step 2: Convert to GLTF/GLB Format

### Using Blender (Recommended)
1. **Install Blender** https://www.blender.org/download/
2. **Open the DAE file:**
   ```
   Blender → File → Open → Select .dae file
   ```
3. **Import animations:**
   - The rig should auto-import with bones
4. **Export as GLTF:**
   ```
   File → Export As → Choose Format (.glb recommended for compression)
   
   Export Settings:
   ☑ Animation
   ☑ Shape Keys (for facial blend shapes)
   ☑ Draco compression (if available - reduces file size 80%)
   ☑ Format: glTF Binary (.glb)
   
   Quality Settings:
   - Compression Level: 7
   ```

### Alternative: Online Converters
- https://products.aspose.app/3d/conversion/dae-to-glb
- Faster but larger file size (no Draco compression)

## Step 3: Prepare Model File

### File Size Optimization
```
Recommended file sizes:
- Without compression: 2-5 MB
- With Draco compression: 400-800 KB ✓ (Much better for web)
- With textures baked: 800 KB - 2 MB
```

### Naming Convention (Important!)
Mixamo uses standard bone names which our system auto-detects:
```
Armature.Hips (root)
├─ Spine
│  ├─ Spine1
│  │  ├─ Spine2
│  │  │  └─ Head
│  │  ├─ LeftShoulder
│  │  │  └─ LeftArm
│  │  │     └─ LeftForeArm
│  │  │        └─ LeftHand
│  │  └─ RightShoulder
│  │     └─ RightArm
│  │        └─ RightForeArm
│  │           └─ RightHand
├─ LeftUpLeg
│  └─ LeftLeg
│     └─ LeftFoot
└─ RightUpLeg
   └─ RightLeg
      └─ RightFoot
```

**Our system auto-detects these** - no manual renaming needed!

## Step 4: Download Animations from Mixamo

### Recommended Combat Animations Pack

**Essential Animations** (Required):
1. **Idle** - Standing still, breathing motion
   - Search: "idle" → Choose realistic breathing variant
2. **Walk** - Forward movement
   - Search: "walk" → Choose natural stride
3. **Run** - Sprint forward
   - Search: "run" → Combat-ready running style
4. **Aim** - Aiming gun at target
   - Search: "aim" or "combat aim"
5. **Shoot** - Single shot recoil
   - Search: "shoot" or "fire"
6. **Reload** - Magazine change
   - Search: "reload"
7. **Getting Hit** - Damage reaction
   - Search: "hit reaction" or "flinch"
8. **Death** - Character death
   - Search: "death" → Realistic fall variant

**Optional High-Quality Animations:**
- "Aim While Running" - Upper body aiming + lower body running
- "Strafe Left/Right" - Lateral movement while aiming
- "Jump" - For future parkour system
- "Melee Attack" - For knife/melee combat

### Download Procedure
For each animation:
1. On Mixamo, search animation name
2. Click animation thumbnail
3. Click **Download**
4. Settings:
   ```
   Format: FBX for Blender / glTF for direct use
   Skin: No
   Frames per Second: 30 ✓
   ```
5. Name file descriptively:
   - `character_idle.glb`
   - `character_run.glb`
   - `character_reload.glb`

## Step 5: Organize Project Structure

```
your_game/
├── public/
│  └── models/
│     ├── characters/
│     │  ├── humanoid_male.glb          (Main model, no animations)
│     │  ├── animations/
│     │  │  ├── mixamo_idle.glb
│     │  │  ├── mixamo_run.glb
│     │  │  ├── mixamo_reload.glb
│     │  │  └── ... (all animations)
│     │  └── skins/
│     │     ├── casual.glb
│     │     ├── tactical.glb
│     │     └── combat.glb
│     ├── weapons/
│     │  ├── ar15.glb
│     │  └── sniper.glb
│     └── environments/
│        └── arena.glb

src/
├── systems/
│  └── character/
│     ├── CharacterController.ts
│     ├── HumanoidModelLoader.ts
│     ├── AnimationBlender.ts
│     └── BoneAttachmentSystem.ts
```

## Step 6: Combine Model + Animations in Blender

### Merge All into Single GLB

**Option A: Export with Multiple Animations**

In Blender:
1. Import main character model
2. Import each animation as separate action:
   - File → Append → Select .glb → Select Action
3. Export main model:
   ```
   File → Export As → .glb
   
   ✓ Include All Bones
   ✓ Animation (exports ALL actions)
   ✓ Shape Keys
   ✓ Draco Compression
   ```

Result: Single `.glb` file with character + all animations bundled!

**Option B: Keep Separate Files**

Better for:
- Smaller download sizes (lazy load animations)
- A/B testing different animation sets
- Memory management on mobile

Implementation:
```typescript
// Load base model
const humanoid = await HumanoidModelLoader.loadHumanoid({
  modelUrl: '/models/characters/humanoid_base.glb',
  scale: 1.0,
  skinTone: '#f0d0b0',
  armorColor: '#e2e8f0'
})

// Lazy load animations as needed
const idleAnimation = await loadAnimationURL('/models/animations/mixamo_idle.glb')
const runAnimation = await loadAnimationURL('/models/animations/mixamo_run.glb')
// ... etc
```

## Step 7: Integration Code Example

```typescript
// In your game scene
import { HumanoidModelLoader } from '@/systems/character/HumanoidModelLoader'

// Initialize loader once
HumanoidModelLoader.initialize()

// Load character
const humanoid = await HumanoidModelLoader.loadHumanoid({
  modelUrl: '/models/characters/humanoid_tacticalv2.glb',
  scale: 0.95, // Mixamo models often 1:1 scale
  position: new THREE.Vector3(0, 0, 0),
  skinTone: '#f0d0b0',
  armorColor: '#2d3d4d',
  rimLightColor: '#87ceeb'
})

// Use the character controller
const { model, controller } = humanoid

// Play animations
controller.playAnimation('idle', true) // Loop idle
controller.playAnimation('run', true)  // Loop running
controller.playAnimation('shoot', false) // One-shot fire

// Layered animation: Running while aiming
controller.playLayeredAnimation('run', 'aim', 0.7)

// Add to scene
scene.add(model)
```

## Step 8: Performance Optimization Tips

### Model Optimization

| Optimization | Impact | Web Friendly |
|--------------|--------|--------------|
| **Draco Compression** | 80% size reduction | ✓ Essential |
| **Normal baking** | Removes normal map uploads | ✓ Good |
| **Texture atlasing** | Single texture per character | ✓ Excellent |
| **LOD models** | Low-poly for distance | ✓ Advanced |
| **Vertex simplification** | Reduce bone 30-50% | ✓ Safe at 50% |

### Animation Optimization

```typescript
// Only load animations in use
const animationQueue = [
  'idle',
  'walk', 
  'run',
  'aim',
  'reload'
]
// Load combat anims only when match starts
// Lazy-load death/hit-reaction animations
```

### File Size Checklist

```
☑ Model + all animations: < 3 MB combined (ideal: < 2 MB)
☑ Individual character GLB: < 1 MB (with Draco)
☑ Per-animation GLB: < 300 KB
☑ Total game assets: < 50 MB
```

## Step 9: Debugging & Validation

### Check if model loaded correctly

```typescript
const debug = controller.getDebugInfo()
console.log('Detected Bones:', debug.detectedBones) // Should be > 20
console.log('Available Animations:', debug.registeredAnimations) // Should have 8+
console.log('Right Hand Bone:', humanoid.bones.rightHand) // Should not be undefined
```

### Skeleton helper (visual debugging)

```typescript
// In THREE.js scene
const skeletonHelper = controller.getSkeletonHelper()
if (skeletonHelper) {
  scene.add(skeletonHelper)
}
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Animations don't load | Wrong format | Ensure .glb or .gltf with animations included |
| Character feet float | Wrong scale | Adjust `scale` param in `loadHumanoid()` |
| Bones not detected | Naming mismatch | Check bone names in Blender |
| Model distorted | Rigging issue | Re-export from Mixamo without modifications |
| Huge file size | No compression | Use Draco compression in Blender export |

## Step 10: Production Deployment

### Before going live:

```
☑ All animations (8+) present and functional
☑ Model exports under 1.5 MB with Draco
☑ Tested on mobile (iOS + Android)
☑ FPS stable at 60 on desktop, 30+ on mobile
☑ No console warnings/errors
☑ Bones correctly attached for weapons
☑ Materials visually appealing under game lighting
```

### CDN Deployment
```
Upload to CDN (Cloudflare, AWS CloudFront, etc.):
/models/characters/ (character + animations)
/models/weapons/ (weapon models)

Reference in code:
modelUrl: 'https://cdn.yourdomain.com/models/characters/humanoid.glb'
```

## Resource Links

- **Mixamo**: https://www.mixamo.com/
- **ReadyPlayerMe** (Alternative): https://readyplayer.me/
- **Sketchfab** (Asset marketplace): https://sketchfab.com/
- **Three.js Documentation**: https://threejs.org/docs/
- **Blender Tutorials**: https://www.blender.org/support/tutorials/

## Next Steps

After model integration:
1. ✅ Implement weapon attachment to RightHand bone
2. ✅ Add animation blending for running + aiming
3. ✅ Set up IK for better foot placement
4. ✅ Implement hit-reaction animations
5. ✅ Add voice lines and audio sync
