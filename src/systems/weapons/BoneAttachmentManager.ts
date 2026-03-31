/**
 * BONE ATTACHMENT SYSTEM
 * Robust bone attachment with dynamic offset adjustment
 * Supports weapons, equipment, accessories, VFX
 */

import * as THREE from 'three'

export interface AttachmentPoint {
  boneName: string
  localPosition: THREE.Vector3
  localRotation: THREE.Quaternion
  localScale: number
  object: THREE.Object3D
}

export class BoneAttachmentManager {
  private attachmentPoints: Map<string, AttachmentPoint> = new Map()
  private skeleton: THREE.Skeleton | null = null

  constructor(skeleton: THREE.Skeleton | null = null) {
    this.skeleton = skeleton
  }

  /**
   * Find bone by name with fuzzy matching
   */
  private _findBone(targetName: string): THREE.Bone | null {
    if (!this.skeleton) return null

    const normalizedTarget = targetName.toLowerCase()

    for (const bone of this.skeleton.bones) {
      if (bone.name.toLowerCase().includes(normalizedTarget)) {
        return bone
      }
    }

    return null
  }

  /**
   * Attach object to bone
   */
  attachToBone(
    boneName: string,
    object: THREE.Object3D,
    localPosition: THREE.Vector3 = new THREE.Vector3(),
    localRotation: THREE.Quaternion = new THREE.Quaternion(),
    localScale: number = 1
  ): boolean {
    const bone = this._findBone(boneName)
    if (!bone) {
      console.warn(`[BoneAttachmentManager] Bone not found: ${boneName}`)
      return false
    }

    // Store original properties
    const attachmentId = `${boneName}_${object.uuid}`
    this.attachmentPoints.set(attachmentId, {
      boneName,
      localPosition: localPosition.clone(),
      localRotation: localRotation.clone(),
      localScale,
      object,
    })

    // Apply transformation
    object.position.copy(localPosition)
    object.quaternion.copy(localRotation)
    object.scale.setScalar(localScale)

    // Attach to bone
    bone.add(object)

    return true
  }

  /**
   * Detach object from bone
   */
  detach(attachmentId: string): boolean {
    const attachment = this.attachmentPoints.get(attachmentId)
    if (!attachment) return false

    const bone = this._findBone(attachment.boneName)
    if (bone) {
      bone.remove(attachment.object)
    }

    this.attachmentPoints.delete(attachmentId)
    return true
  }

  /**
   * Update all attachments (call in render loop if needed)
   */
  update(): void {
    for (const _attachment of this.attachmentPoints.values()) {
      // Position and rotation are automatically updated by Three.js
      // since the object is a child of the bone
    }
  }

  /**
   * Detach all
   */
  detachAll(): void {
    for (const [id] of this.attachmentPoints) {
      this.detach(id)
    }
  }

  /**
   * Get all attachment points
   */
  getAttachments(): AttachmentPoint[] {
    return Array.from(this.attachmentPoints.values())
  }
}
