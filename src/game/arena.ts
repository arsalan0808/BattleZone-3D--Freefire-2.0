import * as THREE from 'three'

export interface ArenaObstacle {
  id: string
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

export const ARENA_LIMIT = 56

export const ARENA_OBSTACLES: ArenaObstacle[] = [
  { id: 'north-west-tower', position: [-18, 2, -8], size: [6, 4, 6], color: '#1f2937' },
  { id: 'north-platform', position: [20, 3, -18], size: [8, 6, 8], color: '#162033' },
  { id: 'east-box', position: [12, 1.8, 18], size: [4, 3.6, 4], color: '#243447' },
  { id: 'south-west-cover', position: [-10, 2.4, 22], size: [7, 4.8, 5], color: '#1a2535' },
  { id: 'east-wall', position: [30, 1.25, 8], size: [3, 2.5, 9], color: '#2b3546' },
  { id: 'west-wall', position: [-28, 1.25, 10], size: [3, 2.5, 9], color: '#2b3546' },
  { id: 'north-bunker', position: [0, 1.75, -28], size: [12, 3.5, 4], color: '#202a39' },
  { id: 'center-cover', position: [0, 1.2, 0], size: [8, 2.4, 8], color: '#253244' },
]

export const ARENA_PATROL_POINTS: [number, number, number][] = [
  [-26, 0, -20],
  [-18, 0, 24],
  [0, 0, -12],
  [18, 0, 20],
  [28, 0, -10],
  [4, 0, 30],
]

export const DEFAULT_PLAYER_SPAWN: [number, number, number] = [-12, 0, -12]
export const DEFAULT_AI_SPAWN: [number, number, number] = [16, 0, 12]
export const MIN_SPAWN_SEPARATION = 18

const scratchVector = new THREE.Vector3()
const scratchDirection = new THREE.Vector3()
const scratchHit = new THREE.Vector3()

const getObstacleBox = (obstacle: ArenaObstacle, padding = 0) => {
  const [x, y, z] = obstacle.position
  const [width, height, depth] = obstacle.size
  const halfWidth = width / 2 + padding
  const halfHeight = height / 2 + padding
  const halfDepth = depth / 2 + padding

  return new THREE.Box3(
    new THREE.Vector3(x - halfWidth, y - halfHeight, z - halfDepth),
    new THREE.Vector3(x + halfWidth, y + halfHeight, z + halfDepth)
  )
}

export const clampArenaPosition = (position: THREE.Vector3, radius = 0) => {
  position.x = THREE.MathUtils.clamp(position.x, -ARENA_LIMIT + radius, ARENA_LIMIT - radius)
  position.z = THREE.MathUtils.clamp(position.z, -ARENA_LIMIT + radius, ARENA_LIMIT - radius)
  return position
}

export const isLineOfSightBlocked = (
  from: THREE.Vector3,
  to: THREE.Vector3,
  padding = 0.25
) => {
  scratchDirection.subVectors(to, from)
  const distance = scratchDirection.length()

  if (distance <= 0.001) {
    return false
  }

  scratchDirection.normalize()
  const ray = new THREE.Ray(from, scratchDirection)

  return ARENA_OBSTACLES.some((obstacle) => {
    const hit = ray.intersectBox(getObstacleBox(obstacle, padding), scratchHit)
    return Boolean(hit && from.distanceTo(hit) < distance)
  })
}

export const getRandomPatrolPoint = () => {
  const point = ARENA_PATROL_POINTS[Math.floor(Math.random() * ARENA_PATROL_POINTS.length)]
  return scratchVector.set(point[0], point[1], point[2]).clone()
}

export const getSafeSpawnPositions = () => {
  const playerSpawn = new THREE.Vector3(...DEFAULT_PLAYER_SPAWN)
  const aiSpawn = new THREE.Vector3(...DEFAULT_AI_SPAWN)

  if (playerSpawn.distanceTo(aiSpawn) < MIN_SPAWN_SEPARATION) {
    aiSpawn.set(MIN_SPAWN_SEPARATION, 0, MIN_SPAWN_SEPARATION)
  }

  clampArenaPosition(playerSpawn, 2)
  clampArenaPosition(aiSpawn, 2)

  return {
    player: [playerSpawn.x, playerSpawn.y, playerSpawn.z] as [number, number, number],
    ai: [aiSpawn.x, aiSpawn.y, aiSpawn.z] as [number, number, number],
  }
}
