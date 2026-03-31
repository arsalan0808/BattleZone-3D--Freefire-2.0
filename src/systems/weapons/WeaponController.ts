/**
 * WEAPON ATTACHMENT & FIRING SYSTEM
 * Production-grade weapon system with bone attachment, recoil, and effects
 * 
 * Features:
 * - Automatic attachment to character bones (RightHand, LeftHand)
 * - Realistic model attachment (offset/rotation per weapon type)
 * - Recoil animation and camera shake
 * - Muzzle flash and shell ejection effects
 * - Procedural bullet trails with physics
 * - Weapon switching smoothness
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface WeaponAttachment {
  position: THREE.Vector3Like
  rotation: [number, number, number]
  scale?: number
}

export interface WeaponConfig {
  id: string
  name: string
  modelUrl: string
  damage: number
  fireRate: number // shots per second
  spread: number // cone spread in degrees
  recoilForce: number // camera recoil intensity (0-1)
  recoilRecovery: number // how fast recoil recovers
  muzzle: {
    position: THREE.Vector3Like // offset from gun tip
    flashScale: number
  }
  magazine: number
  attachmentOffset: WeaponAttachment
}

export interface BulletTrace {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  time: number // lifetime in seconds
  width: number
}

export class WeaponController {
  private model: THREE.Group | null = null
  private config: WeaponConfig
  private isFiring: boolean = false
  private lastFireTime: number = 0
  private ammoInMagazine: number

  // Effects
  private muzzleFlash: THREE.Mesh | null = null
  private bulletTraces: Map<string, BulletTrace> = new Map()
  private recoilState: {
    current: THREE.Vector3
    target: THREE.Vector3
    velocity: THREE.Vector3
  }

  // Audio
  private audioContext: AudioContext | null = null

  constructor(config: WeaponConfig) {
    this.config = config
    this.ammoInMagazine = config.magazine
    this.recoilState = {
      current: new THREE.Vector3(),
      target: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    }

    this._initializeAudio()
  }

  /**
   * Load weapon model from GLB/GLTF
   */
  async loadModel(): Promise<THREE.Group> {
    const loader = new GLTFLoader()

    const gltf = await loader.loadAsync(this.config.modelUrl)
    this.model = gltf.scene as THREE.Group

    // Optimize model
    this.model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    // Create muzzle flash effect
    this._createMuzzleFlash()

    return this.model
  }

  /**
   * Attach weapon to character bone
   *
   * @param bone - Character bone (RightHand, LeftHand, etc.)
   * @param attachmentOffset - Position/rotation offset for realistic attachment
   */
  attachToBone(bone: THREE.Bone, attachmentOffset?: WeaponAttachment): void {
    if (!this.model) {
      console.warn('[Weapon] Model not loaded yet')
      return
    }

    const offset = attachmentOffset || this.config.attachmentOffset

    // Remove from previous parent
    if (this.model.parent) {
      this.model.parent.remove(this.model)
    }

    // Attach to bone
    bone.add(this.model)

    // Apply attachment offset and rotation
    this.model.position.copy(offset.position)
    if (Array.isArray(offset.rotation)) {
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(offset.rotation[0]),
        THREE.MathUtils.degToRad(offset.rotation[1]),
        THREE.MathUtils.degToRad(offset.rotation[2]),
        'YXZ'
      )
      this.model.quaternion.setFromEuler(euler)
    }

    if (offset.scale) {
      this.model.scale.setScalar(offset.scale)
    }
  }

  /**
   * Detach weapon from bone
   */
  detach(): void {
    if (this.model && this.model.parent) {
      this.model.parent.remove(this.model)
    }
  }

  /**
   * Fire weapon
   * Returns true if shot was fired, false if empty/cooldown
   */
  fire(): boolean {
    const now = Date.now()
    const timeSinceLastShot = now - this.lastFireTime
    const fireInterval = 1000 / this.config.fireRate

    // Check fire rate cooldown
    if (timeSinceLastShot < fireInterval) {
      return false
    }

    // Check ammunition
    if (this.ammoInMagazine <= 0) {
      return false
    }

    // Fire!
    this.ammoInMagazine--
    this.lastFireTime = now
    this.isFiring = true

    // Apply recoil
    this._applyRecoil()

    // Create muzzle flash
    this._triggerMuzzleFlash()

    // Play fire sound
    this._playSoundEffect('fire')

    // Reset firing flag after a short time
    setTimeout(() => {
      this.isFiring = false
    }, 50)

    return true
  }

  /**
   * Create bullet trace visual
   */
  createBulletTrace(from: THREE.Vector3, to: THREE.Vector3): void {
    const traceId = `trace_${Date.now()}_${Math.random()}`
    this.bulletTraces.set(traceId, {
      from: from.clone(),
      to: to.clone(),
      color: this.config.id === 'sniper' ? '#7dd3fc' : '#ffd166',
      time: 0.15, // Fade out in 150ms
      width: this.config.id === 'sniper' ? 2.5 : 1.8,
    })
  }

  /**
   * Reload weapon
   */
  reload(ammoReserve: number): void {
    const ammoNeeded = this.config.magazine - this.ammoInMagazine
    const ammoToLoad = Math.min(ammoNeeded, ammoReserve)

    this.ammoInMagazine += ammoToLoad

    this._playSoundEffect('reload')
  }

  /**
   * Internal: Apply recoil animation
   */
  private _applyRecoil(): void {
    // Recoil goes in random direction with spread factor
    const spreadAngle = THREE.MathUtils.degToRad(this.config.spread)
    const randomX = (Math.random() - 0.5) * spreadAngle
    const randomY = (Math.random() - 0.5) * spreadAngle

    this.recoilState.target.set(
      randomX * this.config.recoilForce,
      -Math.abs(randomY * this.config.recoilForce), // Primarily upward
      0
    )
  }

  /**
   * Internal: Create muzzle flash effect
   */
  private _createMuzzleFlash(): void {
    const flashSize = 0.3 * (this.config.muzzle.flashScale || 1)
    const geometry = new THREE.PlaneGeometry(flashSize, flashSize * 1.2)

    // Procedural muzzle flash material (yellow to orange)
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // Draw radial gradient flash
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 45)
    gradient.addColorStop(0, 'rgba(255, 255, 100, 1)')
    gradient.addColorStop(0.4, 'rgba(255, 200, 50, 0.8)')
    gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.4)')
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    this.muzzleFlash = new THREE.Mesh(geometry, material)
    this.muzzleFlash.position.copy(this.config.muzzle.position)
    this.muzzleFlash.visible = false

    if (this.model) {
      this.model.add(this.muzzleFlash)
    }
  }

  /**
   * Internal: Trigger muzzle flash visibility
   */
  private _triggerMuzzleFlash(): void {
    if (!this.muzzleFlash) return

    this.muzzleFlash.visible = true
    this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2 // Random rotation

    setTimeout(() => {
      if (this.muzzleFlash) {
        this.muzzleFlash.visible = false
      }
    }, 40)
  }

  /**
   * Internal: Initialize Web Audio API
   */
  private _initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      console.warn('[Weapon] Web Audio API not supported')
    }
  }

  /**
   * Internal: Play sound effect (fire, reload, etc.)
   */
  private _playSoundEffect(effectType: 'fire' | 'reload' | 'empty'): void {
    if (!this.audioContext) return

    // Create simple procedural sound
    switch (effectType) {
      case 'fire':
        this._playFireSound()
        break
      case 'reload':
        this._playReloadSound()
        break
      case 'empty':
        this._playEmptySound()
        break
    }
  }

  private _playFireSound(): void {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.connect(gain)
    gain.connect(this.audioContext.destination)

    // Different sounds for different weapons
    if (this.config.id === 'sniper') {
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else {
      osc.frequency.setValueAtTime(200, now)
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    }
  }

  private _playReloadSound(): void {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const noise = this.audioContext.createBufferSource()
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.4, this.audioContext.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)

    // Generate white noise
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1
    }

    noise.buffer = noiseBuffer
    const gain = this.audioContext.createGain()
    noise.connect(gain)
    gain.connect(this.audioContext.destination)

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    noise.start(now)
  }

  private _playEmptySound(): void {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.connect(gain)
    gain.connect(this.audioContext.destination)

    osc.frequency.setValueAtTime(100, now)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  /**
   * Update weapon physics (recoil recovery)
   */
  update(delta: number): void {
    // Recover from recoil
    this.recoilState.velocity.lerp(new THREE.Vector3(), 0.15)
    this.recoilState.current.lerp(this.recoilState.target, 0.2)
    this.recoilState.target.lerp(new THREE.Vector3(), 0.85)

    // Update bullet traces
    for (const [id, trace] of this.bulletTraces) {
      trace.time -= delta

      if (trace.time <= 0) {
        this.bulletTraces.delete(id)
      }
    }
  }

  /**
   * Get bullet traces for rendering
   */
  getBulletTraces(): BulletTrace[] {
    return Array.from(this.bulletTraces.values())
  }

  /**
   * Get recoil amount (for camera shake)
   */
  getRecoilAmount(): number {
    return this.recoilState.current.length()
  }

  /**
   * Get weapon stats
   */
  getStats() {
    return {
      name: this.config.name,
      ammoInMagazine: this.ammoInMagazine,
      magazineSize: this.config.magazine,
      isFiring: this.isFiring,
      fireRate: this.config.fireRate,
      damage: this.config.damage,
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.model) {
      this.model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose()
          }
        }
      })
    }
  }
}

/**
 * Weapon collection manager
 * Handles weapon selection, switching, and inventory
 */
export class WeaponInventory {
  private weapons: Map<string, WeaponController> = new Map()
  private currentWeapon: WeaponController | null = null
  private weaponOrder: string[] = []

  addWeapon(weaponController: WeaponController, id: string): void {
    this.weapons.set(id, weaponController)
    this.weaponOrder.push(id)

    if (!this.currentWeapon) {
      this.currentWeapon = weaponController
    }
  }

  switchWeapon(id: string): boolean {
    const weapon = this.weapons.get(id)
    if (!weapon) return false

    this.currentWeapon = weapon
    return true
  }

  nextWeapon(): WeaponController | null {
    if (this.weaponOrder.length === 0) return null

    const currentIndex = this.currentWeapon
      ? this.weaponOrder.indexOf(
          Array.from(this.weapons.entries()).find(
            ([_, w]) => w === this.currentWeapon
          )?.[0] || ''
        )
      : 0

    const nextIndex = (currentIndex + 1) % this.weaponOrder.length
    this.currentWeapon = this.weapons.get(this.weaponOrder[nextIndex]) || null

    return this.currentWeapon
  }

  getCurrentWeapon(): WeaponController | null {
    return this.currentWeapon
  }

  getWeapon(id: string): WeaponController | undefined {
    return this.weapons.get(id)
  }
}
