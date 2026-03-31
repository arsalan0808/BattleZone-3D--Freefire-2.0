/**
 * DEBUG TOOLS & MONITORING SYSTEM
 * Real-time performance monitoring, state inspection, and camera/animation debugging
 * 
 * Features:
 * - FPS monitor and performance overlay
 * - Animation state viewer
 * - Camera position/rotation logger
 * - Bone visualization
 * - Memory profiling
 * - Physics debugging
 */

import * as THREE from 'three'
import type { PerformanceMetrics } from '../optimization/PerformanceOptimizer'

export interface DebugConfig {
  enabled: boolean
  showFPSMonitor: boolean
  showAnimationState: boolean
  showCameraInfo: boolean
  showMemoryUsage: boolean
  showBoneHelper: boolean
  logToConsole: boolean
}

export class DebugTools {
  private config: DebugConfig
  private statsPanel: HTMLElement | null = null
  private logBuffer: string[] = []
  private boneHelpers: Map<string, THREE.SkeletonHelper> = new Map()

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: true,
      showFPSMonitor: true,
      showAnimationState: true,
      showCameraInfo: true,
      showMemoryUsage: false,
      showBoneHelper: false,
      logToConsole: true,
      ...config,
    }

    if (this.config.enabled) {
      this._initializePanel()
      this._setupHotkeys()
    }
  }

  /**
   * Initialize debug UI panel
   */
  private _initializePanel(): void {
    this.statsPanel = document.createElement('div')
    this.statsPanel.id = 'debug-panel'
    this.statsPanel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      width: 320px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #0f0;
      z-index: 10000;
      line-height: 1.5;
      max-height: 600px;
      overflow-y: auto;
    `

    document.body.appendChild(this.statsPanel)
  }

  /**
   * Setup keyboard hotkeys for toggling debug features
   */
  private _setupHotkeys(): void {
    document.addEventListener('keydown', (event) => {
      if (!event.ctrlKey || !event.shiftKey) return

      switch (event.key) {
        case 'D': // Ctrl+Shift+D - Toggle debug panel
          this.togglePanel()
          break
        case 'F': // Ctrl+Shift+F - Toggle FPS monitor
          this.config.showFPSMonitor = !this.config.showFPSMonitor
          break
        case 'A': // Ctrl+Shift+A - Toggle animation state
          this.config.showAnimationState = !this.config.showAnimationState
          break
        case 'C': // Ctrl+Shift+C - Toggle camera info
          this.config.showCameraInfo = !this.config.showCameraInfo
          break
        case 'M': // Ctrl+Shift+M - Toggle memory usage
          this.config.showMemoryUsage = !this.config.showMemoryUsage
          break
        case 'B': // Ctrl+Shift+B - Toggle bone helper
          this.config.showBoneHelper = !this.config.showBoneHelper
          break
      }
    })
  }

  /**
   * Update debug display (call every frame)
   */
  update(data: {
    fps?: number
    frameTime?: number
    cameraPos?: THREE.Vector3
    cameraRot?: THREE.Euler
    animationState?: string
    animationWeight?: number
    playerHealth?: number
    playerPos?: THREE.Vector3
    weaponStats?: any
    performance?: PerformanceMetrics
  }): void {
    if (!this.statsPanel || !this.config.enabled) return

    let html = '<div style="font-weight: bold; color: #0f0; margin-bottom: 8px;">🎮 DEBUG INFO</div>'

    // FPS Monitor
    if (this.config.showFPSMonitor && data.fps) {
      const fpsColor = data.fps >= 55 ? '#0f0' : data.fps >= 30 ? '#ff0' : '#f00'
      html += `<div style="color: ${fpsColor}">FPS: ${Math.round(data.fps)} (${(data.frameTime || 0).toFixed(2)}ms)</div>`
    }

    // Performance Metrics
    if (this.config.showMemoryUsage && data.performance) {
      const perf = data.performance
      html += `<div>Draw Calls: ${perf.drawCalls}</div>`
      html += `<div>Triangles: ${(perf.triangles / 1000).toFixed(1)}K</div>`
      html += `<div>Textures: ${perf.textures}</div>`
      if (perf.memory.used > 0) {
        html += `<div>Memory: ${perf.memory.used}MB / ${perf.memory.limit}MB</div>`
      }
    }

    // Animation State
    if (this.config.showAnimationState && data.animationState) {
      html += `<div style="color: #0ff; margin-top: 8px;">Animation: <strong>${data.animationState}</strong></div>`
      if (data.animationWeight !== undefined) {
        html += `<div>Blend Weight: ${(data.animationWeight * 100).toFixed(1)}%</div>`
      }
    }

    // Player Status
    if (data.playerHealth !== undefined) {
      html += `<div style="color: #f88;">Health: ${Math.round(data.playerHealth)}</div>`
    }

    if (data.playerPos) {
      html += `<div>Player: [${data.playerPos.x.toFixed(1)}, ${data.playerPos.y.toFixed(1)}, ${data.playerPos.z.toFixed(1)}]</div>`
    }

    // Camera Info
    if (this.config.showCameraInfo && data.cameraPos) {
      html += `<div style="color: #f0f; margin-top: 8px;">Camera Pos: [${data.cameraPos.x.toFixed(1)}, ${data.cameraPos.y.toFixed(1)}, ${data.cameraPos.z.toFixed(1)}]</div>`
      if (data.cameraRot) {
        html += `<div>Camera Rot: [${(data.cameraRot.x * 180 / Math.PI).toFixed(1)}°, ${(data.cameraRot.y * 180 / Math.PI).toFixed(1)}°]</div>`
      }
    }

    // Weapon Stats
    if (data.weaponStats) {
      html += `<div style="color: #fa0; margin-top: 8px;">Weapon: ${data.weaponStats.name}</div>`
      html += `<div>Ammo: ${data.weaponStats.ammoInMagazine}/${data.weaponStats.magazineSize}</div>`
    }

    // Hotkey hints
    html += `<div style="color: #888; font-size: 10px; margin-top: 8px; border-top: 1px solid #444; padding-top: 4px;">`
    html += `Ctrl+Shift+D: Toggle | Ctrl+Shift+F: FPS | Ctrl+Shift+A: Anim | Ctrl+Shift+C: Camera`
    html += `</div>`

    this.statsPanel.innerHTML = html
  }

  /**
   * Toggle debug panel visibility
   */
  togglePanel(): void {
    if (!this.statsPanel) return

    this.statsPanel.style.display =
      this.statsPanel.style.display === 'none' ? 'block' : 'none'
  }

  /**
   * Log message to debug panel and console
   */
  log(category: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${category}: ${message}`

    this.logBuffer.push(logEntry)
    if (this.logBuffer.length > 100) {
      this.logBuffer.shift()
    }

    if (this.config.logToConsole) {
      const consoleMethod = {
        info: 'log',
        warn: 'warn',
        error: 'error',
      }[level] as 'log' | 'warn' | 'error'

      console[consoleMethod](`[${category}]`, message)
    }
  }

  /**
   * Visualize bones in scene
   */
  addBoneVisualization(name: string, skinnedMesh: THREE.SkinnedMesh): void {
    if (skinnedMesh.skeleton) {
      const helper = new THREE.SkeletonHelper(skinnedMesh)
      this.boneHelpers.set(name, helper)
    }
  }

  /**
   * Get all bone visualizations
   */
  getBoneHelpers(): Map<string, THREE.SkeletonHelper> {
    return this.boneHelpers
  }

  /**
   * Export debug info to JSON (for bug reports)
   */
  exportDebugInfo(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        logBuffer: this.logBuffer,
        config: this.config,
      },
      null,
      2
    )
  }

  /**
   * Clear debug logs
   */
  clearLogs(): void {
    this.logBuffer = []
  }

  /**
   * Dispose debug tools
   */
  dispose(): void {
    if (this.statsPanel) {
      this.statsPanel.remove()
    }
    this.logBuffer = []
    this.boneHelpers.clear()
  }
}

/**
 * Performance Monitor Utility
 * Tracks specific operations for profiling
 */
export class PerformanceMonitor {
  private markers: Map<string, number> = new Map()
  private measurements: Map<string, number[]> = new Map()

  /**
   * Start timing an operation
   */
  startMark(name: string): void {
    this.markers.set(name, performance.now())
  }

  /**
   * End timing and record measurement
   */
  endMark(name: string): number {
    const start = this.markers.get(name)
    if (!start) {
      console.warn(`[PerformanceMonitor] No marker found: ${name}`)
      return 0
    }

    const duration = performance.now() - start
    this.markers.delete(name)

    // Record measurement
    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    this.measurements.get(name)!.push(duration)

    // Keep only last 100 measurements
    const measurements = this.measurements.get(name)!
    if (measurements.length > 100) {
      measurements.shift()
    }

    return duration
  }

  /**
   * Get average time for operation
   */
  getAverage(name: string): number {
    const measurements = this.measurements.get(name)
    if (!measurements || measurements.length === 0) return 0

    const sum = measurements.reduce((a, b) => a + b, 0)
    return sum / measurements.length
  }

  /**
   * Get report
   */
  getReport(): Record<string, { average: number; count: number }> {
    const report: Record<string, { average: number; count: number }> = {}

    for (const [name, measurements] of this.measurements) {
      report[name] = {
        average: this.getAverage(name),
        count: measurements.length,
      }
    }

    return report
  }

  /**
   * Clear measurements
   */
  clear(): void {
    this.measurements.clear()
    this.markers.clear()
  }
}
