export type WeaponId = 'rifle' | 'sniper' | 'pistol'

export interface WeaponConfig {
  id: WeaponId
  name: string
  shortName: string
  damage: number
  fireIntervalMs: number
  reloadMs: number
  magazineSize: number
  reserveAmmo: number
  range: number
  spread: number
  projectileColor: string
  projectileWidth: number
  muzzleFlashScale: number
  hitScore: number
}

export interface WeaponAmmoState {
  magazine: number
  reserve: number
}

export const WEAPON_ORDER: WeaponId[] = ['rifle', 'sniper', 'pistol']

export const WEAPON_CONFIGS: Record<WeaponId, WeaponConfig> = {
  rifle: {
    id: 'rifle',
    name: 'Assault Rifle',
    shortName: 'AR',
    damage: 18,
    fireIntervalMs: 120,
    reloadMs: 1450,
    magazineSize: 30,
    reserveAmmo: 180,
    range: 42,
    spread: 0.012,
    projectileColor: '#ffd166',
    projectileWidth: 1.8,
    muzzleFlashScale: 1,
    hitScore: 35,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Rifle',
    shortName: 'SR',
    damage: 65,
    fireIntervalMs: 920,
    reloadMs: 1900,
    magazineSize: 5,
    reserveAmmo: 25,
    range: 88,
    spread: 0.003,
    projectileColor: '#7dd3fc',
    projectileWidth: 2.3,
    muzzleFlashScale: 1.25,
    hitScore: 95,
  },
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    shortName: 'PST',
    damage: 12,
    fireIntervalMs: 260,
    reloadMs: 980,
    magazineSize: 14,
    reserveAmmo: 84,
    range: 28,
    spread: 0.02,
    projectileColor: '#fda4af',
    projectileWidth: 1.3,
    muzzleFlashScale: 0.8,
    hitScore: 22,
  },
}

export const createInitialWeaponAmmo = (): Record<WeaponId, WeaponAmmoState> => ({
  rifle: {
    magazine: WEAPON_CONFIGS.rifle.magazineSize,
    reserve: WEAPON_CONFIGS.rifle.reserveAmmo,
  },
  sniper: {
    magazine: WEAPON_CONFIGS.sniper.magazineSize,
    reserve: WEAPON_CONFIGS.sniper.reserveAmmo,
  },
  pistol: {
    magazine: WEAPON_CONFIGS.pistol.magazineSize,
    reserve: WEAPON_CONFIGS.pistol.reserveAmmo,
  },
})

export const getWeaponConfig = (weaponId: WeaponId) => WEAPON_CONFIGS[weaponId]
