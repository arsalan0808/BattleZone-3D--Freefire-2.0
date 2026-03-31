/**
 * FREE FIRE STYLE THIRD-PERSON CAMERA CONTROLLER
 * Battle Royale optimized camera system
 *
 * Features:
 * - Fixed third-person follow (behind & above player)
 * - Smooth camera tracking with interpolation
 * - Rotation controls (mouse/touch) but stays behind player
 * - Dynamic zoom (default + ADS aiming)
 * - Camera direction synced with shooting
 * - Shoulder swap (left/right view)
 * - Mobile touch controls with inertia
 * - Collision avoidance
 */

import * as THREE from 'three'

export interface CameraConfig {
  // Position offsets
  distanceFromPlayer: number       // ~7-9 units directly behind
  heightAbovePlayer: number        // ~1.2-1.5 units above
  lookAheadDistance: number        // How far ahead to look (0.5-1.5)

  // Zoom settings
  defaultZoom: number              // 1.0 (no zoom)
  aimZoom: number                  // 1.3 (zoom in when aiming)
  minZoom: number                  // 0.8
  maxZoom: number                  // 2.0
  zoomSensitivity: number          // Scroll sensitivity

  // Rotation
  horizontalRotation: number       // How far to rotate left/right
  maxVerticalRotation: number      // Max angle up/down

  // Smoothing
  followDamping: number            // Camera follow smoothness (0-1)
  rotationDamping: number          // Rotation smoothness
  zoomDamping: number              // Zoom smoothness

  // Input sensitivity
  rotationSensitivity: {
    desktop: number
    mobile: number
  }

  // Collision
  collisionRadius: number
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  // Behind & Above player (Free Fire style)
  distanceFromPlayer: 8.5,
  heightAbovePlayer: 1.3,
  lookAheadDistance: 0.8,

  // Zoom
  defaultZoom: 1.0,
  aimZoom: 1.35,
  minZoom: 0.7,
  maxZoom: 2.2,
  zoomSensitivity: 0.1,

  // Rotation bounds
  horizontalRotation: Math.PI / 2.5,  // ~70 degrees left/right
  maxVerticalRotation: Math.PI / 6,   // ~30 degrees up/down

  // Smoothing
  followDamping: 0.15,
  rotationDamping: 0.2,
  zoomDamping: 0.12,

  // Input
  rotationSensitivity: {
    desktop: 0.004,
    mobile: 0.018,
  },

  collisionRadius: 0.5,
}

export class CameraController {
  private camera: THREE.Camera
  private scene: THREE.Scene
  private config: CameraConfig

  // Positions & rotation
  private targetPosition: THREE.Vector3 = new THREE.Vector3()
  private currentPosition: THREE.Vector3 = new THREE.Vector3()
  private lookAtTarget: THREE.Vector3 = new THREE.Vector3()

  // Rotation state (local to camera, not orbital)
  private rotation: { horizontal: number; vertical: number } = { horizontal: 0, vertical: 0 }
  private targetRotation: { horizontal: number; vertical: number } = { horizontal: 0, vertical: 0 }

  // Zoom state
  private currentZoom: number = 1
  private targetZoom: number = 1

  // Input state
  private isRightClickDown: boolean = false
  private isTouching: boolean = false
  private touchCurrentPos: { x: number; y: number } = { x: 0, y: 0 }
  private inertiaVelocity: { x: number; y: number } = { x: 0, y: 0 }

  // Game state
  private isAiming: boolean = false
  private isMoving: boolean = false
  private shoulderOffset: number = 0  // -0.6 (left), 0 (center), 0.6 (right)

  // Helper vectors
  private readonly scratchUp = new THREE.Vector3(0, 1, 0)
  private hasInitialized: boolean = false
  private readonly boundMouseMove = (event: MouseEvent) => this._handleMouseMove(event)
  private readonly boundMouseDown = (event: MouseEvent) => this._handleMouseDown(event)
  private readonly boundMouseUp = (event: MouseEvent) => this._handleMouseUp(event)
  private readonly boundMouseWheel = (event: WheelEvent) => this._handleMouseWheel(event)
  private readonly boundTouchStart = (event: TouchEvent) => this._handleTouchStart(event)
  private readonly boundTouchMove = (event: TouchEvent) => this._handleTouchMove(event)
  private readonly boundTouchEnd = (event: TouchEvent) => this._handleTouchEnd(event)
  private readonly boundKeyDown = (event: KeyboardEvent) => this._handleKeyDown(event)

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    config: Partial<CameraConfig> = {}
  ) {
    this.camera = camera
    this.scene = scene
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config }
    this.currentZoom = this.config.defaultZoom
    this.targetZoom = this.config.defaultZoom

    this._setupEventListeners()
  }

  /**
   * Setup input event listeners
   */
  private _setupEventListeners(): void {
    // Desktop
    document.addEventListener('mousemove', this.boundMouseMove, false)
    document.addEventListener('mousedown', this.boundMouseDown, false)
    document.addEventListener('mouseup', this.boundMouseUp, false)
    document.addEventListener('wheel', this.boundMouseWheel, { passive: false })

    // Mobile
    document.addEventListener('touchstart', this.boundTouchStart, false)
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false })
    document.addEventListener('touchend', this.boundTouchEnd, false)

    // Keyboard
    document.addEventListener('keydown', this.boundKeyDown, false)
  }

  /**
   * ========== DESKTOP INPUT ==========
   */
  private _handleMouseMove(event: MouseEvent): void {
    if (!this.isRightClickDown) return

    const sensitivity = this.config.rotationSensitivity.desktop
    this.targetRotation.horizontal += event.movementX * sensitivity
    this.targetRotation.vertical -= event.movementY * sensitivity

    // Clamp vertical rotation
    this.targetRotation.vertical = THREE.MathUtils.clamp(
      this.targetRotation.vertical,
      -this.config.maxVerticalRotation,
      this.config.maxVerticalRotation
    )
  }

  private _handleMouseDown(event: MouseEvent): void {
    if (event.button === 2) {  // Right click
      this.isRightClickDown = true
    }
  }

  private _handleMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isRightClickDown = false
    }
  }

  private _handleMouseWheel(event: WheelEvent): void {
    event.preventDefault()

    const zoomDelta = event.deltaY > 0 ? 1 : -1
    this.targetZoom = THREE.MathUtils.clamp(
      this.targetZoom + zoomDelta * this.config.zoomSensitivity,
      this.config.minZoom,
      this.config.maxZoom
    )
  }

  /**
   * ========== MOBILE INPUT ==========
   */
  private _handleTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement | null
    if (target?.closest('[data-ui-control="true"]')) {
      return
    }

    if (event.touches.length === 1) {
      this.isTouching = true
      this.touchCurrentPos.x = event.touches[0].clientX
      this.touchCurrentPos.y = event.touches[0].clientY
    }
  }

  private _handleTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isTouching) {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-ui-control="true"]')) {
        return
      }

      event.preventDefault()

      const currentX = event.touches[0].clientX
      const currentY = event.touches[0].clientY

      const deltaX = currentX - this.touchCurrentPos.x
      const deltaY = currentY - this.touchCurrentPos.y

      this.touchCurrentPos.x = currentX
      this.touchCurrentPos.y = currentY

      const sensitivity = this.config.rotationSensitivity.mobile
      this.targetRotation.horizontal += deltaX * sensitivity
      this.targetRotation.vertical -= deltaY * sensitivity

      // Clamp vertical
      this.targetRotation.vertical = THREE.MathUtils.clamp(
        this.targetRotation.vertical,
        -this.config.maxVerticalRotation,
        this.config.maxVerticalRotation
      )

      // Inertia
      this.inertiaVelocity.x = deltaX * sensitivity * 1.5
      this.inertiaVelocity.y = deltaY * sensitivity * 1.5
    }
  }

  private _handleTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isTouching = false
    }
  }

  /**
   * ========== KEYBOARD INPUT ==========
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'z' || event.key === 'Z') {
      // Toggle shoulder position
      if (this.shoulderOffset === 0) {
        this.shoulderOffset = 0.6  // Right
      } else if (this.shoulderOffset === 0.6) {
        this.shoulderOffset = -0.6  // Left
      } else {
        this.shoulderOffset = 0  // Center
      }
    }
  }

  /**
   * Main camera update - call this from render loop
   */
  update(
    playerPosition: THREE.Vector3,
    playerForwardDirection: THREE.Vector3,
    isAiming: boolean = false,
    isMoving: boolean = false,
    delta: number = 0.016
  ): void {
    const safeDelta = Math.min(0.05, Math.max(delta, 1 / 240))

    this.isAiming = isAiming
    this.isMoving = isMoving

    // Apply inertia damping
    if (!this.isTouching) {
      const inertiaDamping = Math.exp(-5 * safeDelta)
      this.inertiaVelocity.x *= inertiaDamping
      this.inertiaVelocity.y *= inertiaDamping

      if (Math.abs(this.inertiaVelocity.x) > 0.0001) {
        this.targetRotation.horizontal += this.inertiaVelocity.x
      }
      if (Math.abs(this.inertiaVelocity.y) > 0.0001) {
        this.targetRotation.vertical += this.inertiaVelocity.y
        this.targetRotation.vertical = THREE.MathUtils.clamp(
          this.targetRotation.vertical,
          -this.config.maxVerticalRotation,
          this.config.maxVerticalRotation
        )
      }
    }

    // Smooth rotation
    this.rotation.horizontal = THREE.MathUtils.lerp(
      this.rotation.horizontal,
      this.targetRotation.horizontal,
      this.config.rotationDamping
    )
    this.rotation.vertical = THREE.MathUtils.lerp(
      this.rotation.vertical,
      this.targetRotation.vertical,
      this.config.rotationDamping
    )

    // Update zoom based on aiming
    if (this.isAiming) {
      this.targetZoom = this.config.aimZoom
    } else {
      this.targetZoom = this.config.defaultZoom
    }

    this.currentZoom = THREE.MathUtils.lerp(
      this.currentZoom,
      this.targetZoom,
      this.config.zoomDamping
    )

    // Calculate camera position (behind & above player)
    this._calculateCameraPosition(playerPosition, playerForwardDirection)

    // Smooth follow
    if (!this.hasInitialized) {
      this.currentPosition.copy(this.targetPosition)
      this.hasInitialized = true
    } else {
      const followAlpha = 1 - Math.exp(-8 * safeDelta)
      this.currentPosition.lerp(this.targetPosition, THREE.MathUtils.clamp(followAlpha, 0, 1))
    }

    // Validate position
    if (!Number.isFinite(this.currentPosition.x)) {
      this.currentPosition.copy(this.targetPosition)
    }

    // Apply camera position & look
    this.camera.position.copy(this.currentPosition)
    this.camera.lookAt(this.lookAtTarget)

    // Update FOV based on zoom
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.fov = 68 * (1 / this.currentZoom)  // Inverse zoom for FOV
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Calculate camera position relative to player
   * Free Fire style: behind, slightly above, rotatable
   */
  private _calculateCameraPosition(
    playerPos: THREE.Vector3,
    playerForward: THREE.Vector3
  ): void {
    // Calculate camera's local forward direction based on rotation
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler(this.rotation.vertical, this.rotation.horizontal, 0, 'YXZ')
    quaternion.setFromEuler(euler)

    // Get camera's forward in world space
    const cameraForward = new THREE.Vector3(0, 0, -1)
    cameraForward.applyQuaternion(quaternion)

    // Position: behind player with zoom adjustment
    const distance = (this.config.distanceFromPlayer / this.currentZoom)
    const height = this.config.heightAbovePlayer

    // Calculate offset position
    const offset = new THREE.Vector3()
      .copy(cameraForward)
      .multiplyScalar(distance)

    // Add right/left shoulder offset
    const right = new THREE.Vector3()
      .copy(playerForward)
      .cross(this.scratchUp)
      .normalize()
      .multiplyScalar(this.shoulderOffset)

    offset.add(right)
    offset.y = height

    this.targetPosition.copy(playerPos).add(offset)

    // Look at target: slightly ahead of player
    this.lookAtTarget.copy(playerPos)
    this.lookAtTarget.y += this.config.heightAbovePlayer * 0.8
    this.lookAtTarget.addScaledVector(playerForward, this.config.lookAheadDistance)

    // Collision detection
    this._applyCollisionDetection(playerPos)
  }

  /**
   * Collision detection - prevent camera clipping through obstacles
   */
  private _applyCollisionDetection(playerPos: THREE.Vector3): void {
    const raycaster = new THREE.Raycaster(playerPos, this.targetPosition.clone().sub(playerPos).normalize())

    const obstacles: THREE.Mesh[] = []
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.isObstacle) {
        obstacles.push(obj)
      }
    })

    if (obstacles.length > 0) {
      const intersections = raycaster.intersectObjects(obstacles)

      if (intersections.length > 0) {
        const firstHit = intersections[0]
        const distance = Math.max(0, firstHit.distance - this.config.collisionRadius)

        if (distance < playerPos.distanceTo(this.targetPosition)) {
          const direction = this.targetPosition.clone().sub(playerPos).normalize()
          this.targetPosition.copy(playerPos).addScaledVector(direction, distance)
        }
      }
    }
  }

  /**
   * ========== PUBLIC API ==========
   */

  setAiming(aiming: boolean): void {
    this.isAiming = aiming
  }

  setMoving(moving: boolean): void {
    this.isMoving = moving
  }

  toggleShoulder(): void {
    if (this.shoulderOffset === 0) {
      this.shoulderOffset = 0.6
    } else if (this.shoulderOffset === 0.6) {
      this.shoulderOffset = -0.6
    } else {
      this.shoulderOffset = 0
    }
  }

  /**
   * Get camera forward direction (for shooting)
   */
  getCameraForward(): THREE.Vector3 {
    return this.camera.getWorldDirection(new THREE.Vector3())
  }

  /**
   * Get aim direction from camera center
   */
  getAimDirection(): THREE.Vector3 {
    return this.getCameraForward()
  }

  /**
   * Shake camera for firing feedback
   */
  shake(intensity: number = 0.12, duration: number = 0.08): void {
    const originalPos = this.currentPosition.clone()
    const shakeFrames = Math.ceil(duration / 0.016)
    let frame = 0

    const shakeInterval = setInterval(() => {
      if (frame >= shakeFrames) {
        clearInterval(shakeInterval)
        this.currentPosition.copy(originalPos)
        return
      }

      const offset = (Math.random() - 0.5) * intensity
      this.currentPosition.copy(originalPos)
      this.currentPosition.x += offset
      this.currentPosition.y += offset * 0.5

      frame++
    }, 16)
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      rotation: { x: this.rotation.horizontal, y: this.rotation.vertical },
      zoom: this.currentZoom,
      shoulderOffset: this.shoulderOffset,
      isAiming: this.isAiming,
      isMoving: this.isMoving,
      distance: this.config.distanceFromPlayer,
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mousedown', this.boundMouseDown)
    document.removeEventListener('mouseup', this.boundMouseUp)
    document.removeEventListener('wheel', this.boundMouseWheel)
    document.removeEventListener('touchstart', this.boundTouchStart)
    document.removeEventListener('touchmove', this.boundTouchMove)
    document.removeEventListener('touchend', this.boundTouchEnd)
    document.removeEventListener('keydown', this.boundKeyDown)
  }
}
