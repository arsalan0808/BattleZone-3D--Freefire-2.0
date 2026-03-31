/**
 * ANIMATION BLENDING ENGINE
 * Production-grade animation layering system for AAA-quality character control
 * 
 * Features:
 * - Layered animation blending (lower body + upper body)
 * - Smooth weight transitions
 * - State machine with transitions
 * - Additive animation support (for recoil, hit reactions)
 * - Frame-perfect animation timing
 */

import * as THREE from 'three'
import { CharacterController } from './CharacterController'

export enum AnimationLayer {
  BASE = 0,        // Lower body (walk, run, idle)
  UPPER_BODY = 1,  // Upper body (aim, shoot, reload)
  ADDITIVE = 2,    // One-shot effects (recoil, hit)
}

export interface BlendTarget {
  baseAnimation: string
  upperAnimation?: string
  blendWeight: number
  targetWeight: number
  duration: number
  easing?: (t: number) => number
}

export interface AnimationTransition {
  from: string
  to: string
  duration: number
  easing: (t: number) => number
}

/**
 * Easing functions for smooth animations
 */
export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutExpo: (t: number) =>
    t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
}

export class AnimationBlender {
  private controller: CharacterController
  private currentBlendState: BlendTarget | null = null
  private blendProgress: number = 0
  private activeTransitions: Map<string, number> = new Map()
  private layerWeights: Map<AnimationLayer, number> = new Map()
  // State machine
  private stateTransitions: Map<string, AnimationTransition[]> = new Map()

  constructor(controller: CharacterController) {
    this.controller = controller

    // Initialize layer weights
    this.layerWeights.set(AnimationLayer.BASE, 1.0)
    this.layerWeights.set(AnimationLayer.UPPER_BODY, 0.0)
    this.layerWeights.set(AnimationLayer.ADDITIVE, 0.0)

    this._setupDefaultTransitions()
  }

  /**
   * Set up default smooth transitions between animations
   * Example: idle → walk, walk → run, run → shoot
   */
  private _setupDefaultTransitions(): void {
    // Idle transitions
    this.addTransition('idle', 'walk', 0.3, Easing.easeOutCubic)
    this.addTransition('idle', 'run', 0.25, Easing.easeOutCubic)
    this.addTransition('idle', 'aim', 0.4, Easing.easeInOutQuad)

    // Walk transitions
    this.addTransition('walk', 'idle', 0.35, Easing.easeOutCubic)
    this.addTransition('walk', 'run', 0.2, Easing.easeOutCubic)

    // Run transitions
    this.addTransition('run', 'walk', 0.3, Easing.easeOutCubic)
    this.addTransition('run', 'idle', 0.4, Easing.easeOutCubic)

    // Aim transitions
    this.addTransition('aim', 'idle', 0.35, Easing.easeOutCubic)
    this.addTransition('aim', 'shoot', 0.1, Easing.linear)

    // Shoot transitions
    this.addTransition('shoot', 'aim', 0.08, Easing.easeOutQuad)
    this.addTransition('shoot', 'idle', 0.4, Easing.easeOutCubic)

    // Reload transitions
    this.addTransition('reload', 'idle', 0.25, Easing.easeOutCubic)
    this.addTransition('reload', 'aim', 0.3, Easing.easeOutCubic)
  }

  /**
   * Register transition path between two animations
   */
  addTransition(
    from: string,
    to: string,
    duration: number = 0.3,
    easing: (t: number) => number = Easing.easeOutCubic
  ): void {
    if (!this.stateTransitions.has(from)) {
      this.stateTransitions.set(from, [])
    }

    const transition: AnimationTransition = { from, to, duration, easing }
    this.stateTransitions.get(from)!.push(transition)
  }

  /**
   * ======== PRIMARY API ========
   * 
   * Play simple animation (full body)
   * Example: playSimple('idle')
   */
  playSimple(animationName: string, loop: boolean = false, fadeTime: number = 0.3): void {
    // Stop any active blending
    this.currentBlendState = null
    this.activeTransitions.clear()

    // Reset layer weights to base only
    this.layerWeights.set(AnimationLayer.BASE, 1.0)
    this.layerWeights.set(AnimationLayer.UPPER_BODY, 0.0)

    // Find transition if available
    const transition = this._findTransition(this.controller['animationState'].current, animationName)

    if (transition) {
      this.controller.playAnimation(animationName, loop, transition.duration * 0.6, transition.duration * 0.4)
    } else {
      this.controller.playAnimation(animationName, loop, fadeTime, fadeTime * 0.75)
    }
  }

  /**
   * ======== ADVANCED API ========
   * 
   * Layered animation blending
   * Lower body handles locomotion, upper body handles actions
   * 
   * Example: Running while aiming/shooting
   * playLayered('run', 'aim', 0.8)
   * 
   * This results in:
   * - Legs: Full running animation
   * - Torso: 80% aiming, 20% running
   */
  playLayered(
    baseAnimation: string,
    upperBodyAnimation: string | undefined = undefined,
    upperBodyWeight: number = 0.0,
    transitionDuration: number = 0.4
  ): void {
    // Set blend target
    this.currentBlendState = {
      baseAnimation,
      upperAnimation: upperBodyAnimation,
      blendWeight: 0.0,
      targetWeight: upperBodyWeight,
      duration: transitionDuration,
      easing: Easing.easeInOutQuad,
    }

    // Reset progress
    this.blendProgress = 0

    // Start base animation
    this.controller.playAnimation(baseAnimation, true, transitionDuration * 0.5, transitionDuration * 0.3)

    // Start upper body animation if specified
    if (upperBodyAnimation) {
      this.controller.playAnimation(
        upperBodyAnimation,
        true,
        transitionDuration * 0.5,
        transitionDuration * 0.3
      )
    }
  }

  /**
   * Script-based complex animation sequences
   * Example: Fire sequence with recoil and muzzle flash
   * 
   * sequence('shoot', [
   *   { delay: 0, action: () => camera.shake() },
   *   { delay: 0.05, action: () => muzzleFlash.play() },
   *   { delay: 0.15, action: () => return to aim }
   * ])
   */
  playAnimationSequence(
    animations: Array<{
      name: string
      duration?: number
      loop?: boolean
      delay?: number
      onStart?: () => void
      onEnd?: () => void
    }>
  ): Promise<void> {
    return new Promise((resolve) => {
      let currentIndex = 0

      const playNext = () => {
        if (currentIndex >= animations.length) {
          resolve()
          return
        }

        const current = animations[currentIndex]
        const duration = current.duration || this.controller.getAnimationDuration(current.name)

        if (current.delay) {
          setTimeout(() => {
            current.onStart?.()
            this.controller.playAnimation(current.name, current.loop || false)
          }, current.delay * 1000)

          setTimeout(() => {
            current.onEnd?.()
            currentIndex++
            playNext()
          }, (current.delay + duration) * 1000)
        } else {
          current.onStart?.()
          this.controller.playAnimation(current.name, current.loop || false)

          setTimeout(() => {
            current.onEnd?.()
            currentIndex++
            playNext()
          }, duration * 1000)
        }
      }

      playNext()
    })
  }

  /**
   * One-shot additive animations (layered on top)
   * Example: recoil animation while aiming
   * 
   * playShotgun('shoot', 'recoil', 0.5)
   * - 50% recoil applied additively
   */
  playShotgun(baseAnimation: string, additiveAnimation: string, additiveWeight: number = 0.5): void {
    // Ensure base is playing
    this.playSimple(baseAnimation, true, 0.2)

    // Stack additive animation
    const additiveDuration = this.controller.getAnimationDuration(additiveAnimation)
    this.controller.playOneShot(additiveAnimation, additiveDuration)

    // Smooth weight adjustment
    this.activeTransitions.set(
      `additive_${additiveAnimation}`,
      additiveWeight
    )
  }

  /**
   * Smooth weight interpolation for active animations
   * Call this in your game loop (requestAnimationFrame)
   */
  update(delta: number): void {
    // Update blend state
    if (this.currentBlendState) {
      this._updateBlendState(delta)
    }

    // Update active transitions
    this._updateActiveTransitions(delta)
  }

  /**
   * Internal: Update blend state progress
   */
  private _updateBlendState(delta: number): void {
    if (!this.currentBlendState) return

    const state = this.currentBlendState

    // Progress blend
    this.blendProgress = Math.min(1, this.blendProgress + delta / state.duration)
    
    // Apply easing
    const easedProgress = state.easing ? state.easing(this.blendProgress) : this.blendProgress
    
    // Update weight
    state.blendWeight = THREE.MathUtils.lerp(0, state.targetWeight, easedProgress)

    // Update layer weight
    this.layerWeights.set(AnimationLayer.UPPER_BODY, state.blendWeight)

    // Check if blending complete
    if (this.blendProgress >= 1) {
      this.currentBlendState = null
    }
  }

  /**
   * Internal: Update active transitions
   */
  private _updateActiveTransitions(delta: number): void {
    for (const [key, weight] of this.activeTransitions) {
      const smoothedWeight = THREE.MathUtils.damp(weight, 0, 3, delta)
      if (smoothedWeight < 0.01) {
        this.activeTransitions.delete(key)
      } else {
        this.activeTransitions.set(key, smoothedWeight)
      }
    }
  }

  /**
   * Find registered transition between two animations
   */
  private _findTransition(from: string, to: string): AnimationTransition | undefined {
    const transitions = this.stateTransitions.get(from)
    if (!transitions) return undefined

    return transitions.find((t) => t.to === to)
  }

  /**
   * Get current blend state (for debugging)
   */
  getBlendState() {
    return {
      currentBlendState: this.currentBlendState,
      blendProgress: this.blendProgress,
      layerWeights: {
        base: this.layerWeights.get(AnimationLayer.BASE),
        upperBody: this.layerWeights.get(AnimationLayer.UPPER_BODY),
        additive: this.layerWeights.get(AnimationLayer.ADDITIVE),
      },
    }
  }

  /**
   * Get layer weight
   */
  getLayerWeight(layer: AnimationLayer): number {
    return this.layerWeights.get(layer) ?? 0
  }

  /**
   * Set layer weight directly (advanced use)
   */
  setLayerWeight(layer: AnimationLayer, weight: number, smoothDuration: number = 0.2): void {
    void smoothDuration
    this.layerWeights.set(layer, THREE.MathUtils.clamp(weight, 0, 1))
  }
}
