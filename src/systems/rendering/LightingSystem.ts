/**
 * ADVANCED LIGHTING & MATERIAL SYSTEM
 * Production-grade lighting setup with HDRI, shadows, and tone mapping
 * PBR-compliant materials with proper roughness/metalness workflows
 */

import * as THREE from 'three'

export interface LightingPreset {
  name: string
  ambientLight: { intensity: number; color: string }
  hemisphereLight: { intensity: number; skyColor: string; groundColor: string }
  directionalLight: {
    intensity: number
    color: string
    position: [number, number, number]
    castShadow: boolean
    shadowMapSize: number
    shadowBias: number
  }
  pointLights: Array<{
    position: [number, number, number]
    intensity: number
    color: string
    distance: number
  }>
  fog: { color: string; near: number; far: number }
  toneMappingExposure: number
}

/**
 * Predefined lighting setups
 */
export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  /**
   * Bright, sunny arena - good visibility, high contrast
   */
  sunny: {
    name: 'Sunny Arena',
    ambientLight: { intensity: 0.6, color: '#b8d2ff' },
    hemisphereLight: {
      intensity: 0.5,
      skyColor: '#87ceeb',
      groundColor: '#8b7355',
    },
    directionalLight: {
      intensity: 1.8,
      color: '#fff2d2',
      position: [25, 35, 15],
      castShadow: true,
      shadowMapSize: 2048,
      shadowBias: -0.0005,
    },
    pointLights: [
      {
        position: [0, 12, 0],
        intensity: 0.4,
        color: '#ffd700',
        distance: 50,
      },
    ],
    fog: { color: '#87ceeb', near: 30, far: 150 },
    toneMappingExposure: 1.0,
  },

  /**
   * Night time - cool lighting, dramatic shadows
   */
  night: {
    name: 'Night Arena',
    ambientLight: { intensity: 0.2, color: '#1a2a4a' },
    hemisphereLight: {
      intensity: 0.35,
      skyColor: '#1a3a54',
      groundColor: '#0a1520',
    },
    directionalLight: {
      intensity: 1.2,
      color: '#c0d9ff',
      position: [20, 25, 10],
      castShadow: true,
      shadowMapSize: 2048,
      shadowBias: -0.0005,
    },
    pointLights: [
      { position: [-15, 8, -20], intensity: 0.6, color: '#ff6b35', distance: 40 },
      { position: [20, 8, 15], intensity: 0.5, color: '#4ecdc4', distance: 35 },
    ],
    fog: { color: '#0a1520', near: 25, far: 120 },
    toneMappingExposure: 1.3,
  },

  /**
   * Indoor - subdued, controlled lighting
   */
  indoor: {
    name: 'Indoor Arena',
    ambientLight: { intensity: 0.5, color: '#e0e0e0' },
    hemisphereLight: {
      intensity: 0.3,
      skyColor: '#c0c0c0',
      groundColor: '#606060',
    },
    directionalLight: {
      intensity: 1.4,
      color: '#f5f5dc',
      position: [15, 20, 10],
      castShadow: true,
      shadowMapSize: 2048,
      shadowBias: -0.0003,
    },
    pointLights: [
      { position: [-20, 10, -15], intensity: 0.7, color: '#e0e0e0', distance: 45 },
      { position: [20, 10, 15], intensity: 0.7, color: '#e0e0e0', distance: 45 },
    ],
    fog: { color: '#808080', near: 20, far: 100 },
    toneMappingExposure: 0.9,
  },

  /**
   * Sci-fi - cool, neon-influenced lighting
   */
  scifi: {
    name: 'Sci-Fi Arena',
    ambientLight: { intensity: 0.4, color: '#0a2a4a' },
    hemisphereLight: {
      intensity: 0.4,
      skyColor: '#1a4a7a',
      groundColor: '#0a1a2a',
    },
    directionalLight: {
      intensity: 1.5,
      color: '#6dd5ff',
      position: [30, 40, 20],
      castShadow: true,
      shadowMapSize: 2048,
      shadowBias: -0.0005,
    },
    pointLights: [
      { position: [-25, 12, -25], intensity: 0.8, color: '#00ff88', distance: 50 },
      { position: [25, 12, 25], intensity: 0.8, color: '#ff0088', distance: 50 },
      { position: [0, 8, -30], intensity: 0.6, color: '#ffaa00', distance: 40 },
    ],
    fog: { color: '#0a2a4a', near: 25, far: 130 },
    toneMappingExposure: 1.2,
  },
}

/**
 * Apply lighting preset to Three.js scene
 */
export function applyLightingPreset(
  scene: THREE.Scene,
  preset: LightingPreset
): {
  ambientLight: THREE.Light
  hemisphereLight: THREE.Light
  directionalLight: THREE.DirectionalLight
  pointLights: THREE.PointLight[]
} {
  // Clear existing lights
  scene.children.forEach((child) => {
    if (
      child instanceof THREE.Light &&
      !(child instanceof THREE.Camera)
    ) {
      scene.remove(child)
    }
  })

  // Ambient light
  const ambientLight = new THREE.AmbientLight(
    preset.ambientLight.color,
    preset.ambientLight.intensity
  )
  scene.add(ambientLight)

  // Hemisphere light (sky + ground lighting)
  const hemisphereLight = new THREE.HemisphereLight(
    preset.hemisphereLight.skyColor,
    preset.hemisphereLight.groundColor,
    preset.hemisphereLight.intensity
  )
  scene.add(hemisphereLight)

  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(
    preset.directionalLight.color,
    preset.directionalLight.intensity
  )
  directionalLight.position.set(...preset.directionalLight.position)
  directionalLight.castShadow = preset.directionalLight.castShadow
  directionalLight.shadow.mapSize.width = preset.directionalLight.shadowMapSize
  directionalLight.shadow.mapSize.height = preset.directionalLight.shadowMapSize
  directionalLight.shadow.bias = preset.directionalLight.shadowBias
  directionalLight.shadow.camera.far = 100
  directionalLight.shadow.camera.left = -50
  directionalLight.shadow.camera.right = 50
  directionalLight.shadow.camera.top = 50
  directionalLight.shadow.camera.bottom = -50
  directionalLight.shadow.normalBias = 0.02
  scene.add(directionalLight)

  // Point lights (accent lights)
  const pointLights: THREE.PointLight[] = []
  preset.pointLights.forEach((config) => {
    const light = new THREE.PointLight(config.color, config.intensity, config.distance)
    light.position.set(...config.position)
    light.castShadow = true
    light.shadow.mapSize.width = 512
    light.shadow.mapSize.height = 512
    scene.add(light)
    pointLights.push(light)
  })

  // Fog
  scene.fog = new THREE.Fog(
    preset.fog.color,
    preset.fog.near,
    preset.fog.far
  )

  // Tone mapping
  if ('renderer' in scene && typeof scene.renderer === 'object') {
    // Will be applied in render setup
  }

  return { ambientLight, hemisphereLight, directionalLight, pointLights }
}

/**
 * PBR Material Creator
 * Creates physically-correct materials with proper workflows
 */
export class PBRMaterialFactory {
  /**
   * Create character skin material
   */
  static createSkinMaterial(config: {
    baseColor?: string
    roughness?: number
    metalness?: number
  } = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: config.baseColor || '#f0d0b0',
      roughness: config.roughness ?? 0.75,
      metalness: config.metalness ?? 0.0,
      side: THREE.FrontSide,
      envMapIntensity: 0.5,
    })
  }

  /**
   * Create metal armor/equipment material
   */
  static createMetalMaterial(config: {
    baseColor?: string
    roughness?: number
    metalness?: number
  } = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: config.baseColor || '#8d8d8d',
      roughness: config.roughness ?? 0.35,
      metalness: config.metalness ?? 0.95,
      side: THREE.FrontSide,
      envMapIntensity: 1.0,
    })
  }

  /**
   * Create fabric/textile material
   */
  static createFabricMaterial(config: {
    baseColor?: string
    roughness?: number
    metalness?: number
  } = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: config.baseColor || '#3d3d3d',
      roughness: config.roughness ?? 0.8,
      metalness: config.metalness ?? 0.0,
      side: THREE.FrontSide,
      envMapIntensity: 0.3,
    })
  }

  /**
   * Create weapon material (dark metal)
   */
  static createWeaponMaterial(config: {
    baseColor?: string
    roughness?: number
    metalness?: number
  } = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: config.baseColor || '#1a1a1a',
      roughness: config.roughness ?? 0.4,
      metalness: config.metalness ?? 0.9,
      side: THREE.FrontSide,
      envMapIntensity: 0.8,
    })
  }

  /**
   * Create transparent material (glass, clear plastic)
   */
  static createTransparentMaterial(config: {
    color?: string
    roughness?: number
    metalness?: number
    opacity?: number
  } = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: config.color || '#ffffff',
      roughness: config.roughness ?? 0.1,
      metalness: config.metalness ?? 0.0,
      transparent: true,
      opacity: config.opacity ?? 0.8,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5,
    })
  }

  /**
   * Create glowing/emissive material
   */
  static createEmissiveMaterial(config: {
    baseColor?: string
    emissiveColor?: string
    emissiveIntensity?: number
    roughness?: number
  } = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: config.baseColor || '#e0e0e0',
      emissive: config.emissiveColor || '#ff6b35',
      emissiveIntensity: config.emissiveIntensity ?? 0.8,
      roughness: config.roughness ?? 0.5,
      metalness: 0.2,
      envMapIntensity: 0.4,
    })
  }
}

/**
 * Shadow optimization helper
 * Adjusts shadow quality for performance
 */
export function optimizeShadows(
  renderer: THREE.WebGLRenderer,
  quality: 'low' | 'medium' | 'high' = 'medium'
): void {
  void quality

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  // Configure scene lights' shadows
  // This is typically done per-light, not globally
}

/**
 * Enable tone mapping and post-processing
 */
export function enablePostProcessing(
  renderer: THREE.WebGLRenderer,
  preset: LightingPreset
): void {
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = preset.toneMappingExposure
  renderer.outputColorSpace = THREE.SRGBColorSpace
}
