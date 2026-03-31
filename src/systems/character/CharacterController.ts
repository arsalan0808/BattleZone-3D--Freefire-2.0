/**
 * CHARACTER CONTROLLER SYSTEM
 * Manages realistic humanoid character with skeleton, animations, and state
 * Supports Mixamo, ReadyPlayerMe, and other standard GLTF models
 * 
 * Key Features:
 * - Automatic skeleton detection and bone mapping
 * - Animation state machine
 * - Layered animation blending
 * - IK-ready bone structure
 */

import * as THREE from 'three'
import { AnimationMixer, Skeleton, SkeletonHelper } from 'three'

export interface BoneMap {
  [key: string]: THREE.Bone
}

export interface AnimationClips {
  idle: THREE.AnimationClip
  walk: THREE.AnimationClip
  run: THREE.AnimationClip
  aim: THREE.AnimationClip
  shoot: THREE.AnimationClip
  reload: THREE.AnimationClip
  getHit: THREE.AnimationClip
  death: THREE.AnimationClip
  specialMove?: THREE.AnimationClip
}

export interface CharacterAnimationState {
  current: keyof AnimationClips
  previous: keyof AnimationClips
  blendWeight: number
  targetWeight: number
  fadeInDuration: number
  fadeOutDuration: number
}

export enum AnimationStateEnum {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  AIM = 'aim',
  SHOOT = 'shoot',
  RELOAD = 'reload',
  GET_HIT = 'getHit',
  DEATH = 'death',
}

/**
 * BONE NAMING CONVENTIONS (Auto-detects):
 * 
 * Mixamo standard:
 * - armature.Hips (root)
 * - Spine, Spine1, Spine2
 * - Head
 * - LeftShoulder, LeftArm, LeftForeArm, LeftHand
 * - RightShoulder, RightArm, RightForeArm, RightHand
 * - LeftUpLeg, LeftLeg, LeftFoot
 * - RightUpLeg, RightLeg, RightFoot
 * 
 * ReadyPlayerMe:
 * - Root
 * - Spine
 * - Head
 * - Armature.LeftArm etc (with Armature prefix)
 */
export class CharacterController {
  private model: THREE.Group
  private mixer: AnimationMixer
  private animations: Map<string, THREE.AnimationAction> = new Map()
  private canonicalAnimations: Map<string, THREE.AnimationAction> = new Map()
  private boneMap: BoneMap = {}
  private warnedAnimations: Set<string> = new Set()
  private animationState: CharacterAnimationState = {
    current: 'idle',
    previous: 'idle',
    blendWeight: 1.0,
    targetWeight: 1.0,
    fadeInDuration: 0.35,
    fadeOutDuration: 0.25,
  }

  private shootLayerWeight: number = 0 // Blend between movement and shooting

  constructor(model: THREE.Group, clips: THREE.AnimationClip[]) {
    this.model = model
    this.mixer = new AnimationMixer(model)
    
    // Map bones for later use (IK, weapon attachment)
    this.buildBoneMap()
    
    // Log available animations for debugging
    console.log('[CharacterController] Available animations:', clips.map(c => c.name))
    
    // Register all animation clips
    clips.forEach((clip) => {
      const action = this.mixer.clipAction(clip)
      action.clampWhenFinished = true
      this.animations.set(clip.name, action)
      this.animations.set(clip.name.toLowerCase(), action) // Also register lowercase version
      this.registerAnimationAliases(clip.name, action)
    })

    // Try to start with idle, fallback to first available animation
    const idleAction = this.animations.get('idle') || this.animations.get('Idle')
    if (idleAction) {
      this.playAnimation('idle', true)
    } else if (clips.length > 0) {
      // Fallback: use first available animation
      const firstClip = clips[0].name
      console.warn(`[CharacterController] 'idle' animation not found, using '${firstClip}' as fallback`)
      this.playAnimation(firstClip, true)
    }
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/[\s_-]+/g, '')
  }

  private registerAnimationAliases(name: string, action: THREE.AnimationAction): void {
    const normalized = this.normalizeName(name)
    const aliasChecks: Array<[string, RegExp[]]> = [
      ['idle', [/idle/, /breath/, /stand/]],
      ['walk', [/walk/, /locomotionwalk/]],
      ['run', [/run/, /jog/, /sprint/]],
      ['aim', [/aim/, /rifleaim/, /combatidle/]],
      ['shoot', [/shoot/, /fire/, /attack/, /recoil/]],
      ['reload', [/reload/, /reloadrifle/, /reloadgun/]],
      ['getHit', [/hit/, /damage/, /hurt/, /impact/]],
      ['death', [/death/, /die/, /fall/]],
    ]

    for (const [alias, matchers] of aliasChecks) {
      if (matchers.some((matcher) => matcher.test(normalized))) {
        this.canonicalAnimations.set(alias, action)
      }
    }
  }

  /**
   * Auto-detect and map bones from character skeleton
   * Supports multiple naming conventions
   */
  private buildBoneMap(): void {
    const skeletons: Skeleton[] = []
    
    this.model.traverse((obj: any) => {
      if (obj.isSkinnedMesh) {
        skeletons.push(obj.skeleton)
      }
    })

    if (skeletons.length === 0) return

    const skeleton = skeletons[0]
    const bones = skeleton.bones

    // Create normalized bone map
    bones.forEach((bone: THREE.Bone) => {
      const name = bone.name.toLowerCase()
      this.boneMap[name] = bone
    })

    // Log detected bones (for debugging)
    this._debugLogBones()
  }

  /**
   * Get a bone by common naming variations
   * E.g., "RightHand" matches "righthnd", "righthand", "Armature_RightHand"
   */
  private findBone(names: string[]): THREE.Bone | undefined {
    for (const name of names) {
      const normalized = name.toLowerCase()
      for (const [key, bone] of Object.entries(this.boneMap)) {
        if (key.includes(normalized)) return bone
      }
    }
    return undefined
  }

  /**
   * Get specific bone by purpose (for weapon attachment)
   */
  getBone(purpose: 'rightHand' | 'leftHand' | 'head' | 'spine' | 'pelvis'): THREE.Bone | undefined {
    switch (purpose) {
      case 'rightHand':
        return this.findBone(['RightHand', 'r_hand', 'right_hand'])
      case 'leftHand':
        return this.findBone(['LeftHand', 'l_hand', 'left_hand'])
      case 'head':
        return this.findBone(['Head', 'head'])
      case 'spine':
        return this.findBone(['Spine', 'Spine3', 'spine_03'])
      case 'pelvis':
        return this.findBone(['Hips', 'Pelvis', 'Root'])
      default:
        return undefined
    }
  }

  /**
   * High-level animation system
   * Handles smooth crossfading and layering
   * Tries multiple naming conventions to find animation
   */
  playAnimation(
    animationName: string,
    loop: boolean = false,
    fadeInDuration: number = 0.35,
    fadeOutDuration: number = 0.25
  ): void {
    // Try to find animation with different naming conventions
    let action = this.animations.get(animationName) || this.canonicalAnimations.get(animationName)
    
    if (!action) {
      // Try capitalized version
      const capitalized = animationName.charAt(0).toUpperCase() + animationName.slice(1)
      action = this.animations.get(capitalized)
    }
    
    if (!action) {
      // Try lowercase version
      action = this.animations.get(animationName.toLowerCase()) || this.canonicalAnimations.get(animationName.toLowerCase())
    }
    
    if (!action) {
      // Try to find any animation that contains this name (fuzzy match)
      for (const [key, act] of this.animations.entries()) {
        if (this.normalizeName(key).includes(this.normalizeName(animationName))) {
          action = act
          break
        }
      }
    }
    
    if (!action) {
      if (!this.warnedAnimations.has(animationName)) {
        this.warnedAnimations.add(animationName)
        console.warn(`[Character] Animation "${animationName}" not found. Available:`, Array.from(new Set(this.animations.keys())))
      }
      return
    }

    const currentAction = this.animations.get(this.animationState.current)
    if (currentAction && currentAction === action) {
      // Already playing this animation
      return
    }

    // Fade out current
    if (currentAction) {
      currentAction.fadeOut(fadeOutDuration)
    }

    // Configure new animation
    action.reset()
    action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce
    action.clampWhenFinished = !loop
    
    // Fade in new
    action.fadeIn(fadeInDuration)
    action.play()

    // Update state
    this.animationState.previous = this.animationState.current
    this.animationState.current = animationName as keyof AnimationClips
  }

  hasAnimation(animationName: string): boolean {
    return (
      this.animations.has(animationName) ||
      this.animations.has(animationName.toLowerCase()) ||
      this.canonicalAnimations.has(animationName) ||
      this.canonicalAnimations.has(animationName.toLowerCase())
    )
  }

  /**
   * ADVANCED: Layered animation blending
   * Example: Run with upper body aiming/shooting
   * 
   * @param lowerBody - animation for legs (idle, walk, run)
   * @param upperBody - animation for torso (aim, shoot, reload)
   * @param upperBodyWeight - 0-1 blend between lower and upper
   */
  playLayeredAnimation(
    lowerBody: string,
    upperBody: string,
    upperBodyWeight: number = 0.0
  ): void {
    const lowerAction = this.animations.get(lowerBody)
    const upperAction = this.animations.get(upperBody)

    if (!lowerAction || !upperAction) {
      console.warn('[Character] Layered animation not found', { lowerBody, upperBody })
      return
    }

    // Play lower body with full weight
    if (this.animationState.current !== lowerBody) {
      lowerAction.reset()
      lowerAction.loop = THREE.LoopRepeat
      lowerAction.play()
      lowerAction.weight = 1.0
    }

    // Play upper body with controlled weight
    upperAction.reset()
    upperAction.loop = THREE.LoopRepeat
    upperAction.play()
    upperAction.weight = THREE.MathUtils.lerp(
      upperAction.weight,
      upperBodyWeight,
      0.15 // Smooth transition
    )

    this.shootLayerWeight = upperAction.weight
  }

  /**
   * Smooth animation transition with keyframe interpolation
   */
  transitionAnimation(
    _fromAnim: string,
    toAnim: string,
    duration: number = 0.4
  ): void {
    this.playAnimation(toAnim, false, duration, duration)
  }

  /**
   * One-shot animation (weapon fire recoil, getting hit)
   */
  playOneShot(animationName: string, duration: number = 0.2): void {
    const action = this.animations.get(animationName)
    if (!action) return

    action.reset()
    action.loop = THREE.LoopOnce
    action.clampWhenFinished = false
    
    // Blend one-shot on top
    action.weight = 1.0
    action.timeScale = 1.0
    action.play()

    // Auto-blend back to current after duration
    setTimeout(() => {
      action.fadeOut(0.15)
    }, duration * 1000)
  }

  /**
   * Update animation mixer (call in render loop)
   */
  update(delta: number): void {
    this.mixer.update(delta)
  }

  /**
   * Get animation duration in seconds
   */
  getAnimationDuration(animationName: string): number {
    const action = this.animations.get(animationName)
    return action ? action.getClip().duration : 0
  }

  /**
   * Check if specific animation is playing
   */
  isAnimationPlaying(animationName: string): boolean {
    return this.animationState.current === animationName
  }

  /**
   * Set animation time scale (speed multiplier)
   * Example: 1.5 = 1.5x speed, 0.5 = slow motion
   */
  setAnimationSpeed(animationName: string, speed: number): void {
    const action = this.animations.get(animationName)
    if (action) {
      action.timeScale = speed
    }
  }

  // ==================== DEBUG UTILITIES ====================

  private _debugLogBones(): void {
    // Log bone map in console for debugging
    const isDevelopment = typeof window !== 'undefined' && (window as any).__DEBUG__ === true
    if (isDevelopment || true) { // Always log for now during integration
      console.group('[Character] Detected Bones')
      Object.keys(this.boneMap).forEach((bone) => {
        console.log(`  - ${bone}`)
      })
      console.groupEnd()
    }
  }

  /**
   * Visualize skeleton in scene (development only)
   */
  getSkeletonHelper(): SkeletonHelper | null {
    const skinnedMesh = this.model.children.find(
      (child: any) => child.isSkinnedMesh
    ) as THREE.SkinnedMesh | undefined

    return skinnedMesh ? new SkeletonHelper(skinnedMesh) : null
  }

  /**
   * Export current state (debugging)
   */
  getDebugInfo() {
    return {
      currentAnimation: this.animationState.current,
      previousAnimation: this.animationState.previous,
      shootLayerWeight: this.shootLayerWeight,
      detectedBones: Object.keys(this.boneMap).length,
      registeredAnimations: Array.from(this.animations.keys()),
    }
  }

  dispose(): void {
    this.mixer.stopAllAction()
    this.mixer.timeScale = 0
  }
}
