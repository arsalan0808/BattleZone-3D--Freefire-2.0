/**
 * PROFESSIONAL AIMING SYSTEM
 * Handles camera-aim synchronization, raycast, and shooting direction
 * 
 * PRINCIPLE: Camera direction is the SOURCE OF TRUTH
 * - All aiming derives from camera.getWorldDirection()
 * - No React state lag
 * - Real-time updates
 */

import * as THREE from 'three'

export interface AimingState {
  // Direction vectors (from camera)
  cameraForward: THREE.Vector3
  cameraPosition: THREE.Vector3
  
  // Ray for shooting
  shootingRay: THREE.Ray
  
  // Player facing direction (derived from camera)
  playerFacingDirection: THREE.Vector3
  
  // Debug info
  debugRaycast: {
    start: THREE.Vector3
    end: THREE.Vector3
    hit: boolean
  }
}

export class AimingSystem {
  private state: AimingState
  private camera: THREE.Camera
  private raycaster: THREE.Raycaster
  private pointerNdc: THREE.Vector2
  private debugMode: boolean = false

  constructor(camera: THREE.Camera) {
    this.camera = camera
    this.raycaster = new THREE.Raycaster()
    this.pointerNdc = new THREE.Vector2(0, 0)
    
    this.state = {
      cameraForward: new THREE.Vector3(0, 0, -1),
      cameraPosition: new THREE.Vector3(),
      shootingRay: new THREE.Ray(),
      playerFacingDirection: new THREE.Vector3(0, 0, -1),
      debugRaycast: {
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        hit: false,
      },
    }

    this.debugMode = import.meta.env.DEV || localStorage.getItem('battlezone-debug-aiming') === '1'
  }

  /**
   * CRITICAL: Update aim state from live camera every frame
   * Must be called from render loop, NOT React state
   */
  update(pointer: { x: number; y: number }): void {
    this.pointerNdc.set(pointer.x * 2 - 1, -(pointer.y * 2 - 1))
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)

    this.state.cameraPosition.copy(this.raycaster.ray.origin)
    this.state.cameraForward.copy(this.raycaster.ray.direction).normalize()
    this.state.shootingRay.origin.copy(this.state.cameraPosition)
    this.state.shootingRay.direction.copy(this.state.cameraForward)
    
    // Player should face in direction camera is looking (Y-axis only)
    // Extract horizontal angle from camera forward direction
    this.state.playerFacingDirection.copy(this.state.cameraForward)
    this.state.playerFacingDirection.y = 0
    this.state.playerFacingDirection.normalize()
    
    if (this.debugMode) {
      console.debug('[Aiming] Updated from camera', {
        forward: this.state.cameraForward.toArray(),
        position: this.state.cameraPosition.toArray(),
      })
    }
  }

  /**
   * Get current shooting direction (used for raycast)
   * With optional spread for weapons
   */
  getShootingDirection(spread: number = 0): THREE.Vector3 {
    const direction = this.state.cameraForward.clone()
    
    if (spread > 0) {
      // Add random spread
      direction.addScaledVector(
        new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        ),
        1
      )
      direction.normalize()
    }
    
    return direction
  }

  /**
   * Get current shooting ray origin
   */
  getShootingOrigin(): THREE.Vector3 {
    return this.state.cameraPosition.clone()
  }

  /**
   * Perform raycast from camera (for hit detection)
   */
  raycast(scene: THREE.Scene, maxDistance: number = 1000): THREE.Intersection[] {
    this.raycaster.ray.copy(this.state.shootingRay)
    this.raycaster.far = maxDistance
    
    const intersections = this.raycaster.intersectObjects(scene.children, true)
    
    return intersections.filter(hit => hit.distance <= maxDistance)
  }

  /**
   * Get player facing angle (in radians) for player body rotation
   */
  getPlayerFacingAngle(): number {
    return Math.atan2(this.state.playerFacingDirection.x, this.state.playerFacingDirection.z)
  }

  /**
   * Get current aiming state (read-only)
   */
  getState(): Readonly<AimingState> {
    return this.state
  }

  /**
   * Debug: Get raycast visualization line
   */
  getRaycastDebugLine(distance: number = 100): { start: THREE.Vector3; end: THREE.Vector3 } {
    const start = this.state.shootingRay.origin.clone()
    const end = start.clone().addScaledVector(this.state.shootingRay.direction, distance)
    
    return { start, end }
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    if (enabled) {
      console.log('[Aiming] Debug mode enabled')
    }
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      cameraForward: this.state.cameraForward.toArray(),
      cameraPosition: this.state.cameraPosition.toArray(),
      playerFacingAngle: this.getPlayerFacingAngle(),
      rayOrigin: this.state.shootingRay.origin.toArray(),
      rayDirection: this.state.shootingRay.direction.toArray(),
    }
  }

  dispose(): void {
    // Cleanup
  }
}
