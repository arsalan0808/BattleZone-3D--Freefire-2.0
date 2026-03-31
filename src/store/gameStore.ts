import { create } from 'zustand'
import { createInitialWeaponAmmo, getWeaponConfig, WEAPON_ORDER, type WeaponId } from '../game/weapons'

export type GameScene = 'loading' | 'lobby' | 'game' | 'pause' | 'gameover'

export interface BulletTrace {
  id: number
  from: [number, number, number]
  to: [number, number, number]
  color: string
  width: number
  life: number
}

export interface GameState {
  // Scene management
  currentScene: GameScene
  setScene: (scene: GameScene) => void

  // Player state
  playerHealth: number
  playerMaxHealth: number
  setPlayerHealth: (health: number) => void

  // AI state
  aiHealth: number
  aiMaxHealth: number
  setAiHealth: (health: number) => void

  // Game stats
  playerScore: number
  kills: number
  ammoInMagazine: number
  ammoReserve: number
  weaponAmmo: Record<WeaponId, { magazine: number; reserve: number }>
  selectedWeapon: WeaponId
  availableWeapons: WeaponId[]
  isReloading: boolean
  reloadRequestId: number
  playerName: string
  coins: number
  diamonds: number
  addScore: (points: number) => void
  registerKill: () => void
  consumeAmmo: () => boolean
  finishReload: () => void
  setReloading: (active: boolean) => void
  requestReload: () => void
  setSelectedWeapon: (weaponId: WeaponId) => void
  cycleWeapon: (direction: 1 | -1) => void
  resetScore: () => void

  // Input state
  isShootingInput: boolean
  movementInput: { x: number; z: number }
  cameraRotation: { x: number; y: number }
  cursorPosition: { x: number; y: number }  // For crosshair (mouse or joystick)
  setShootingInput: (active: boolean) => void
  setMovementInput: (input: { x: number; z: number }) => void
  setCameraRotation: (rotation: { x: number; y: number }) => void
  setCursorPosition: (pos: { x: number; y: number }) => void

  // Game flags
  isPaused: boolean
  togglePause: () => void
  resetGame: () => void

  // Audio state
  soundVolume: number
  setSoundVolume: (volume: number) => void
  muteSounds: boolean
  toggleMute: () => void

  // Feedback state
  shotPulse: number
  hitPulse: number
  damagePulse: number
  enemyShotPulse: number
  bulletTraces: BulletTrace[]
  registerShot: () => void
  registerHit: () => void
  registerDamage: () => void
  registerEnemyShot: () => void
  pushBulletTrace: (trace: Omit<BulletTrace, 'id' | 'life'> & { life?: number }) => void
  tickBulletTraces: (delta: number) => void
}

const DEFAULT_WEAPON = 'rifle' as WeaponId

const getDisplayedAmmo = (weaponAmmo: Record<WeaponId, { magazine: number; reserve: number }>, selectedWeapon: WeaponId) => ({
  ammoInMagazine: weaponAmmo[selectedWeapon].magazine,
  ammoReserve: weaponAmmo[selectedWeapon].reserve,
})

const createGameplayState = () => ({
  weaponAmmo: createInitialWeaponAmmo(),
  selectedWeapon: DEFAULT_WEAPON,
  availableWeapons: WEAPON_ORDER,
  isReloading: false,
  reloadRequestId: 0,
  currentScene: 'loading' as GameScene,
  playerHealth: 100,
  playerMaxHealth: 100,
  aiHealth: 100,
  aiMaxHealth: 100,
  playerScore: 0,
  kills: 0,
  ...getDisplayedAmmo(createInitialWeaponAmmo(), DEFAULT_WEAPON),
  playerName: 'Operator Nova',
  coins: 2850,
  diamonds: 42,
  isShootingInput: false,
  movementInput: { x: 0, z: 0 },
  cameraRotation: { x: 0, y: 0 },
  cursorPosition: { x: 0.5, y: 0.5 },  // Normalized 0-1
  isPaused: false,
  shotPulse: 0,
  hitPulse: 0,
  damagePulse: 0,
  enemyShotPulse: 0,
  bulletTraces: [] as BulletTrace[],
})

const persistentState = {
  soundVolume: 1,
  muteSounds: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...createGameplayState(),
  ...persistentState,

  setScene: (scene) => set({ currentScene: scene }),

  setPlayerHealth: (health) =>
    set({
      playerHealth: Math.max(0, Math.min(health, 100)),
    }),

  setAiHealth: (health) =>
    set({
      aiHealth: Math.max(0, Math.min(health, 100)),
    }),

  addScore: (points) =>
    set((state) => ({
      playerScore: state.playerScore + points,
    })),

  registerKill: () =>
    set((state) => ({
      kills: state.kills + 1,
      playerScore: state.playerScore + 250,
    })),

  consumeAmmo: () => {
    let didConsume = false

    set((state) => {
      const selectedAmmo = state.weaponAmmo[state.selectedWeapon]

      if (selectedAmmo.magazine <= 0 || state.isReloading) {
        return state
      }

      didConsume = true
      const weaponAmmo = {
        ...state.weaponAmmo,
        [state.selectedWeapon]: {
          ...selectedAmmo,
          magazine: selectedAmmo.magazine - 1,
        },
      }

      return {
        weaponAmmo,
        ...getDisplayedAmmo(weaponAmmo, state.selectedWeapon),
      }
    })

    return didConsume
  },

  finishReload: () =>
    set((state) => {
      const weaponConfig = getWeaponConfig(state.selectedWeapon)
      const selectedAmmo = state.weaponAmmo[state.selectedWeapon]

      if (selectedAmmo.magazine >= weaponConfig.magazineSize || selectedAmmo.reserve <= 0) {
        return state
      }

      const ammoNeeded = weaponConfig.magazineSize - selectedAmmo.magazine
      const ammoLoaded = Math.min(ammoNeeded, selectedAmmo.reserve)
      const weaponAmmo = {
        ...state.weaponAmmo,
        [state.selectedWeapon]: {
          magazine: selectedAmmo.magazine + ammoLoaded,
          reserve: selectedAmmo.reserve - ammoLoaded,
        },
      }

      return {
        isReloading: false,
        weaponAmmo,
        ...getDisplayedAmmo(weaponAmmo, state.selectedWeapon),
      }
    }),

  setReloading: (active) => set({ isReloading: active }),

  requestReload: () =>
    set((state) => ({
      reloadRequestId: state.reloadRequestId + 1,
    })),

  setSelectedWeapon: (weaponId) =>
    set((state) => ({
      selectedWeapon: weaponId,
      isReloading: false,
      ...getDisplayedAmmo(state.weaponAmmo, weaponId),
    })),

  cycleWeapon: (direction) =>
    set((state) => {
      const currentIndex = state.availableWeapons.indexOf(state.selectedWeapon)
      const nextIndex =
        (currentIndex + direction + state.availableWeapons.length) % state.availableWeapons.length
      const selectedWeapon = state.availableWeapons[nextIndex]

      return {
        selectedWeapon,
        isReloading: false,
        ...getDisplayedAmmo(state.weaponAmmo, selectedWeapon),
      }
    }),

  resetScore: () => set({ playerScore: 0 }),

  setShootingInput: (active) => set({ isShootingInput: active }),

  setMovementInput: (input) => set({ movementInput: input }),

  setCameraRotation: (rotation) => set({ cameraRotation: rotation }),

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  togglePause: () =>
    set((state) => ({
      isPaused: !state.isPaused,
      currentScene: state.isPaused ? 'game' : 'pause',
    })),

  setSoundVolume: (volume) =>
    set({
      soundVolume: Math.max(0, Math.min(volume, 1)),
    }),

  toggleMute: () =>
    set((state) => ({
      muteSounds: !state.muteSounds,
    })),

  registerShot: () =>
    set((state) => ({
      shotPulse: state.shotPulse + 1,
    })),

  registerHit: () =>
    set((state) => ({
      hitPulse: state.hitPulse + 1,
    })),

  registerDamage: () =>
    set((state) => ({
      damagePulse: state.damagePulse + 1,
    })),

  registerEnemyShot: () =>
    set((state) => ({
      enemyShotPulse: state.enemyShotPulse + 1,
    })),

  pushBulletTrace: (trace) =>
    set((state) => ({
      bulletTraces: [
        ...state.bulletTraces,
        {
          id: state.shotPulse + state.enemyShotPulse + state.bulletTraces.length + 1,
          life: trace.life ?? 0.12,
          ...trace,
        },
      ].slice(-18),
    })),

  tickBulletTraces: (delta) =>
    set((state) => ({
      bulletTraces: state.bulletTraces
        .map((trace) => ({
          ...trace,
          life: trace.life - delta,
        }))
        .filter((trace) => trace.life > 0),
    })),

  resetGame: () =>
    set((state) => ({
      ...createGameplayState(),
      soundVolume: state.soundVolume,
      muteSounds: state.muteSounds,
    })),
}))
