import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

interface CharacterModelProps {
  color: string
  emissive: string
}

const MODEL_URL = '/mode1s/character.glb'

const cloneAndPrepareModel = (
  source: THREE.Group,
  color: string,
  emissive: string
): THREE.Group => {
  const instance = clone(source) as THREE.Group
  const armorColor = new THREE.Color(color)
  const glowColor = new THREE.Color(emissive)

  instance.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) {
      return
    }

    mesh.castShadow = true
    mesh.receiveShadow = true

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mesh.material = materials.map((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        return new THREE.MeshStandardMaterial({
          color: armorColor,
          emissive: glowColor,
          emissiveIntensity: 0.08,
          metalness: 0.2,
          roughness: 0.7,
        })
      }

      const nextMaterial = material.clone()
      const name = mesh.name.toLowerCase()

      if (!nextMaterial.map) {
        if (name.includes('head') || name.includes('face') || name.includes('skin')) {
          nextMaterial.color = new THREE.Color('#f0d0b0')
        } else if (name.includes('weapon') || name.includes('gun') || name.includes('rifle')) {
          nextMaterial.color = new THREE.Color('#1f2937')
          nextMaterial.metalness = 0.9
          nextMaterial.roughness = 0.28
        } else {
          nextMaterial.color.copy(armorColor)
        }
      }

      nextMaterial.emissive = glowColor.clone().multiplyScalar(name.includes('weapon') ? 0.35 : 0.14)
      nextMaterial.emissiveIntensity = name.includes('weapon') ? 0.12 : 0.06
      nextMaterial.metalness ??= 0.15
      nextMaterial.roughness ??= 0.75

      return nextMaterial
    })
  })

  const bounds = new THREE.Box3().setFromObject(instance)
  if (!bounds.isEmpty()) {
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())

    instance.position.x -= center.x
    instance.position.z -= center.z
    instance.position.y -= bounds.min.y

    if (size.y > 3.2) {
      const scaleFactor = 2 / size.y
      instance.scale.multiplyScalar(scaleFactor)
      instance.position.multiplyScalar(scaleFactor)
    }
  }

  return instance
}

export const CharacterModel = ({ color, emissive }: CharacterModelProps) => {
  const [modelTemplate, setModelTemplate] = useState<THREE.Group | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const loader = new GLTFLoader()
    loader
      .loadAsync(MODEL_URL)
      .then((gltf) => {
        if (!isMountedRef.current) {
          return
        }
        setModelTemplate(gltf.scene)
        setLoadFailed(false)
      })
      .catch((error) => {
        console.error('[CharacterModel] Failed to load lobby/AI model:', error)
        if (isMountedRef.current) {
          setLoadFailed(true)
        }
      })

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const preparedModel = useMemo(() => {
    if (!modelTemplate) {
      return null
    }

    return cloneAndPrepareModel(modelTemplate, color, emissive)
  }, [color, emissive, modelTemplate])

  if (preparedModel) {
    return <primitive object={preparedModel} scale={[0.95, 0.95, 0.95]} />
  }

  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.34, 1.2, 4, 12]} />
        <meshStandardMaterial
          color={loadFailed ? '#64748b' : color}
          emissive={emissive}
          emissiveIntensity={0.08}
          roughness={0.72}
          metalness={0.18}
        />
      </mesh>
      <mesh castShadow position={[0, 2.12, 0]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color="#f0d0b0" roughness={0.85} metalness={0.02} />
      </mesh>
    </group>
  )
}
