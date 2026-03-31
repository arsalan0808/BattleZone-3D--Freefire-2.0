/**
 * HUMANOID MODEL LOADER
 * Loads and configures realistic humanoid characters (Mixamo, ReadyPlayerMe, etc.)
 * Applies PBR materials, sets up bones for attachment, and optimizes for performance
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CharacterController } from './CharacterController'

export interface HumanoidConfig {
  modelUrl: string
  scale?: number
  position?: THREE.Vector3Like
  skinTone?: string // Hex color for skin
  armorColor?: string // Main armor/clothing
  rimLightColor?: string
  castShadow?: boolean
  receiveShadow?: boolean
}

export interface LoadedHumanoid {
  model: THREE.Group
  controller: CharacterController
  bones: {
    rightHand: THREE.Bone | undefined
    leftHand: THREE.Bone | undefined
    head: THREE.Bone | undefined
    spine: THREE.Bone | undefined
    pelvis: THREE.Bone | undefined
  }
}

export class HumanoidModelLoader {
  private static gltfLoader: GLTFLoader

  static initialize(): void {
    // Keep the loader local-only by default so integration works offline and
    // for standard GLB files that do not require Draco decoding.
    this.gltfLoader = new GLTFLoader()
  }

  /**
   * Load and initialize a humanoid character
   * Automatically configures animations, materials, and skeleton
   */
  static async loadHumanoid(config: HumanoidConfig): Promise<LoadedHumanoid> {
    if (!this.gltfLoader) this.initialize()

    try {
      console.log('[HumanoidLoader] Loading model from:', config.modelUrl)
      const gltf = await this.gltfLoader.loadAsync(config.modelUrl)
      const model = gltf.scene as THREE.Group

      console.log('[HumanoidLoader] Model loaded. Animations:', gltf.animations.map((a: THREE.AnimationClip) => a.name))

      // Apply scale and position
      if (config.scale) {
        model.scale.multiplyScalar(config.scale)
      }
      if (config.position) {
        model.position.copy(config.position)
      }

      // Setup shadows
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = config.castShadow !== false
          obj.receiveShadow = config.receiveShadow !== false

          // Optimize shadows for mobile
          if (obj.geometry) {
            obj.geometry.computeBoundingSphere()
          }
        }
      })

      // Apply PBR materials
      console.log('[HumanoidLoader] Applying PBR materials')
      this.applyPBRMaterials(model, config)
      this.normalizeModelToGround(model)

      // Create character controller
      console.log('[HumanoidLoader] Creating character controller')
      const controller = new CharacterController(model, gltf.animations)

      // Extract bone references
      const bones = {
        rightHand: controller.getBone('rightHand'),
        leftHand: controller.getBone('leftHand'),
        head: controller.getBone('head'),
        spine: controller.getBone('spine'),
        pelvis: controller.getBone('pelvis'),
      }

      console.log('[HumanoidLoader] Model successfully loaded and configured')
      return { model, controller, bones }
    } catch (error) {
      console.error('[HumanoidLoader] Failed to load model:', error)
      console.error('[HumanoidLoader] Stack:', error instanceof Error ? error.stack : 'N/A')
      throw error
    }
  }

  /**
   * Apply physically-based rendering materials to character
   * Handles skin, clothing, accessories, weapons separately
   */
  private static applyPBRMaterials(model: THREE.Group, config: HumanoidConfig): void {
    const skinColor = new THREE.Color(config.skinTone || '#f0d0b0')
    const armorColor = new THREE.Color(config.armorColor || '#e2e8f0')

    const materialCache = new Map<string, THREE.MeshStandardMaterial>()

    /**
     * Create material for specific mesh type
     * Optimized for web with minimal texture load
     */
    const createMaterial = (
      type: 'skin' | 'armor' | 'metal' | 'fabric' | 'weapon'
    ): THREE.MeshStandardMaterial => {
      if (materialCache.has(type)) {
        return materialCache.get(type)!.clone()
      }

      let material: THREE.MeshStandardMaterial

      switch (type) {
        case 'skin':
          // Skin-like material: low metalness, moderate roughness
          material = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.75,
            metalness: 0.0,
            flatShading: false,
          })
          break

        case 'armor':
          // Clothing/armor: fabric appearance
          material = new THREE.MeshStandardMaterial({
            color: armorColor,
            roughness: 0.65,
            metalness: 0.1,
            flatShading: false,
          })
          break

        case 'metal':
          // Metal details: shiny, reflective
          material = new THREE.MeshStandardMaterial({
            color: '#8d8d8d',
            roughness: 0.35,
            metalness: 0.95,
            flatShading: false,
          })
          break

        case 'fabric':
          // Leather/fabric accents
          material = new THREE.MeshStandardMaterial({
            color: '#3d3d3d',
            roughness: 0.8,
            metalness: 0.0,
            flatShading: false,
          })
          break

        case 'weapon':
          // Weapon appearance: gunmetal
          material = new THREE.MeshStandardMaterial({
            color: '#1a1a1a',
            roughness: 0.4,
            metalness: 0.9,
            flatShading: false,
          })
          break

        default:
          material = new THREE.MeshStandardMaterial()
      }

      materialCache.set(type, material)
      return material.clone()
    }

    // Apply materials based on mesh name
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const name = obj.name.toLowerCase()
        const currentMaterial = Array.isArray(obj.material) ? obj.material[0] : obj.material

        // Detect mesh type from name
        let fallbackMaterial: THREE.MeshStandardMaterial
        if (name.includes('head') || name.includes('face') || name.includes('neck')) {
          fallbackMaterial = createMaterial('skin')
        } else if (
          name.includes('armor') ||
          name.includes('cloth') ||
          name.includes('shirt') ||
          name.includes('pants') ||
          name.includes('vest')
        ) {
          fallbackMaterial = createMaterial('armor')
        } else if (name.includes('metal') || name.includes('buckle') || name.includes('strap')) {
          fallbackMaterial = createMaterial('metal')
        } else if (name.includes('weapon') || name.includes('gun') || name.includes('rifle')) {
          fallbackMaterial = createMaterial('weapon')
        } else if (name.includes('leather') || name.includes('glove') || name.includes('boot')) {
          fallbackMaterial = createMaterial('fabric')
        } else {
          // Default: armor/clothing color
          fallbackMaterial = createMaterial('armor')
        }

        // Preserve imported textured materials when possible and only tune their PBR values.
        if (currentMaterial instanceof THREE.MeshStandardMaterial) {
          const preservedMaterial = currentMaterial.clone()
          preservedMaterial.roughness ??= fallbackMaterial.roughness
          preservedMaterial.metalness ??= fallbackMaterial.metalness

          if (!preservedMaterial.map) {
            preservedMaterial.color.copy(fallbackMaterial.color)
          }

          obj.material = preservedMaterial
        } else {
          obj.material = fallbackMaterial
        }

        // Optimize for web performance
        if (obj.geometry) {
          // Don't compute vertex normals if already present
          if (!obj.geometry.attributes.normal) {
            obj.geometry.computeVertexNormals()
          }
        }
      }
    })
  }

  private static normalizeModelToGround(model: THREE.Group): void {
    const bounds = new THREE.Box3().setFromObject(model)
    if (bounds.isEmpty()) {
      return
    }

    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())

    // Center the character horizontally and place the feet on the arena floor.
    model.position.x -= center.x
    model.position.z -= center.z
    model.position.y -= bounds.min.y

    // Clamp extreme scales from imported authoring tools without overriding
    // deliberately configured tiny/large characters.
    if (size.y > 3.5) {
      const scaleFactor = 2.2 / size.y
      model.scale.multiplyScalar(scaleFactor)
      model.position.multiplyScalar(scaleFactor)
    }
  }

  /**
   * Load texture (for future texture implementation)
   * Currently simplified for web performance
   */
  static async loadTexture(url: string): Promise<THREE.Texture> {
    const textureLoader = new THREE.TextureLoader()
    return new Promise((resolve, reject) => {
      textureLoader.load(url, resolve, undefined, reject)
    })
  }

  /**
   * Dispose loader resources
   */
  static dispose(): void {
    // No persistent decoder resources to dispose right now.
  }
}
