import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { WEAPON_ORDER, getWeaponConfig } from '../game/weapons'
import { useGameStore } from '../store/gameStore'
import { playUIClick } from '../utils/audioManager'
import { AnimatedButton } from './AnimatedButton'

const panelVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
}

export const HUD = () => {
  const playerHealth = useGameStore((state) => state.playerHealth)
  const playerMaxHealth = useGameStore((state) => state.playerMaxHealth)
  const aiHealth = useGameStore((state) => state.aiHealth)
  const aiMaxHealth = useGameStore((state) => state.aiMaxHealth)
  const playerScore = useGameStore((state) => state.playerScore)
  const ammoInMagazine = useGameStore((state) => state.ammoInMagazine)
  const ammoReserve = useGameStore((state) => state.ammoReserve)
  const kills = useGameStore((state) => state.kills)
  const playerName = useGameStore((state) => state.playerName)
  const coins = useGameStore((state) => state.coins)
  const diamonds = useGameStore((state) => state.diamonds)
  const hitPulse = useGameStore((state) => state.hitPulse)
  const damagePulse = useGameStore((state) => state.damagePulse)
  const togglePause = useGameStore((state) => state.togglePause)
  const selectedWeapon = useGameStore((state) => state.selectedWeapon)
  const setSelectedWeapon = useGameStore((state) => state.setSelectedWeapon)
  const isReloading = useGameStore((state) => state.isReloading)
  const requestReload = useGameStore((state) => state.requestReload)
  const cursorPosition = useGameStore((state) => state.cursorPosition)

  const [showHitIndicator, setShowHitIndicator] = useState(false)
  const [showDamageFlash, setShowDamageFlash] = useState(false)

  useEffect(() => {
    if (!hitPulse) return
    setShowHitIndicator(true)
    const timeout = setTimeout(() => setShowHitIndicator(false), 180)
    return () => clearTimeout(timeout)
  }, [hitPulse])

  useEffect(() => {
    if (!damagePulse) return
    setShowDamageFlash(true)
    const timeout = setTimeout(() => setShowDamageFlash(false), 220)
    return () => clearTimeout(timeout)
  }, [damagePulse])

  const playerHealthPercent = (playerHealth / playerMaxHealth) * 100
  const aiHealthPercent = (aiHealth / aiMaxHealth) * 100
  const activeWeapon = getWeaponConfig(selectedWeapon)

  return (
    <>
      <AnimatePresence>
        {showDamageFlash && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-red-500/25 via-transparent to-red-500/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-30 mobile-safe-area">
        {/* Desktop Layout */}
        <motion.div
          className="mx-auto hidden sm:flex max-w-7xl items-start justify-between gap-3 px-1"
          initial="hidden"
          animate="visible"
          variants={panelVariants}
          transition={{ duration: 0.35 }}
        >
          <div className="glass-panel premium-panel min-w-0 max-w-[min(14rem,40vw)] px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-[0.3em] text-slate-400">Player</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <div>
                <p className="truncate text-xs font-semibold text-white">{playerName}</p>
                <p className="text-[9px] text-slate-400">Elite</p>
              </div>
              <div className="flex shrink-0 gap-1 text-[9px]">
                <span className="currency-pill text-[9px] py-0.5 px-2">{coins}C</span>
                <span className="currency-pill currency-pill-blue text-[9px] py-0.5 px-2">{diamonds}D</span>
              </div>
            </div>
          </div>

          <motion.div
            className="glass-panel premium-panel w-20 overflow-hidden"
            variants={panelVariants}
          >
            <div className="minimap-grid relative h-20 w-full">
              <div className="absolute inset-0 rounded-lg border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.75)]" />
              <p className="absolute bottom-1 left-2 text-[7px] uppercase tracking-[0.2em] text-slate-400">Zone</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Desktop Health Bars and Crosshair */}
        <div className="mx-auto mt-2 hidden sm:grid max-w-7xl grid-cols-[minmax(0,14rem)_1fr_minmax(0,14rem)] gap-2">
          <motion.div
            className="glass-panel premium-panel px-2 py-1.5"
            initial="hidden"
            animate="visible"
            variants={panelVariants}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="mb-1 flex items-center justify-between text-[7px] uppercase tracking-[0.2em] text-slate-400">
              <span>HP</span>
              <span>{Math.ceil(playerHealth)} / {playerMaxHealth}</span>
            </div>
            <div className="health-shell h-1.5">
              <motion.div
                className="health-fill health-fill-player"
                animate={{ width: `${playerHealthPercent}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
              <span className="text-[8px]">Stable</span>
              <span className="font-semibold text-white text-[8px]">{Math.round(playerHealthPercent)}%</span>
            </div>
          </motion.div>

          <div className="relative flex min-h-[2.5rem] items-center justify-center">
            <AnimatePresence>
              {showHitIndicator && (
                <motion.div
                  className="absolute top-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-amber-100 backdrop-blur"
                  initial={{ opacity: 0, scale: 0.85, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -12 }}
                >
                  Hit
                </motion.div>
              )}
            </AnimatePresence>

            {/* 🎯 Dynamic Desktop Crosshair - Follows Cursor/Mouse */}
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${cursorPosition.x * 100}%`,
                top: `${cursorPosition.y * 100}%`,
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <motion.div
                className="crosshair-shell scale-75"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <span className="crosshair-line horizontal" />
                <span className="crosshair-line vertical" />
                <span className="crosshair-core" />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            className="glass-panel premium-panel px-2 py-1.5"
            initial="hidden"
            animate="visible"
            variants={panelVariants}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="mb-1 flex items-center justify-between text-[7px] uppercase tracking-[0.2em] text-slate-400">
              <span>Enemy</span>
              <span>{Math.ceil(aiHealth)} / {aiMaxHealth}</span>
            </div>
            <div className="health-shell h-1.5">
              <motion.div
                className="health-fill health-fill-enemy"
                animate={{ width: `${aiHealthPercent}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
              <span className="text-[8px]">Pressure</span>
              <span className="font-semibold text-white text-[8px]">{Math.round(aiHealthPercent)}%</span>
            </div>
          </motion.div>
        </div>

        {/* Mobile Health Bars - Top Right */}
        <motion.div
          className="absolute right-1 top-1 sm:hidden flex flex-col gap-1 max-w-[11rem]"
          style={{
            right: 'max(0.25rem, env(safe-area-inset-right))',
            top: 'max(0.25rem, env(safe-area-inset-top))',
          }}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          {/* Player Health */}
          <div className="glass-panel premium-panel px-1.5 py-1">
            <div className="flex items-center justify-between text-[6px] uppercase tracking-[0.15em] text-slate-400">
              <span>You</span>
              <span className="text-white font-semibold">{Math.ceil(playerHealth)}/{playerMaxHealth}</span>
            </div>
            <div className="health-shell h-1 mt-0.5">
              <motion.div
                className="health-fill health-fill-player"
                animate={{ width: `${playerHealthPercent}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              />
            </div>
          </div>

          {/* Enemy Health */}
          <div className="glass-panel premium-panel px-1.5 py-1">
            <div className="flex items-center justify-between text-[6px] uppercase tracking-[0.15em] text-slate-400">
              <span>Enemy</span>
              <span className="text-white font-semibold">{Math.ceil(aiHealth)}/{aiMaxHealth}</span>
            </div>
            <div className="health-shell h-1 mt-0.5">
              <motion.div
                className="health-fill health-fill-enemy"
                animate={{ width: `${aiHealthPercent}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Crosshair - Mobile */}
        <div className="absolute inset-0 pointer-events-none sm:hidden z-40 flex items-center justify-center">
          {/* 🎯 Dynamic Mobile Crosshair - Follows Touch/Joystick */}
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]"
            style={{
              left: `${cursorPosition.x * 100}%`,
              top: `${cursorPosition.y * 100}%`,
            }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <div className="relative flex items-center justify-center">
              <AnimatePresence>
                {showHitIndicator && (
                  <motion.div
                    className="absolute top-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[6px] font-semibold uppercase tracking-[0.15em] text-amber-100 backdrop-blur"
                    initial={{ opacity: 0, scale: 0.85, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -12 }}
                  >
                    Hit
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="crosshair-shell scale-75 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <span className="crosshair-line horizontal" />
                <span className="crosshair-line vertical" />
                <span className="crosshair-core" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Desktop Bottom Layout */}
        <div className="mx-auto mt-auto hidden sm:flex max-w-7xl flex-wrap items-end justify-between gap-2 pb-2">
          <motion.div
            className="glass-panel premium-panel flex min-w-[8rem] gap-2 px-2 py-1.5"
            initial="hidden"
            animate="visible"
            variants={panelVariants}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <div>
              <p className="text-[7px] uppercase tracking-[0.25em] text-slate-400">Kills</p>
              <p className="text-lg font-black text-white">{kills}</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-[0.25em] text-slate-400">Score</p>
              <p className="text-lg font-black text-amber-200">{playerScore.toLocaleString()}</p>
            </div>
          </motion.div>

          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            <AnimatedButton 
              onClick={requestReload}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              disabled={isReloading || ammoInMagazine === activeWeapon.magazineSize || ammoReserve === 0}
            >
              {isReloading ? 'Reloading...' : 'Reload'}
            </AnimatedButton>
            <AnimatedButton onClick={togglePause} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              Pause
            </AnimatedButton>
          </motion.div>

          <motion.div
            className="glass-panel premium-panel ammo-panel ml-auto min-w-[10rem] px-2 py-1.5 text-right"
            initial="hidden"
            animate="visible"
            variants={panelVariants}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            <div className="flex items-center justify-between gap-2 text-[7px] uppercase tracking-[0.2em] text-slate-400">
              <span>{activeWeapon.name}</span>
              <span>{isReloading ? 'Reload' : activeWeapon.shortName}</span>
            </div>
            <div className="mt-0.5 flex items-end justify-end gap-1">
              <span className="text-3xl font-black text-white">{ammoInMagazine}</span>
              <span className="pb-0.5 text-xs text-slate-400">/ {ammoReserve}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-slate-950/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 shadow-[0_0_12px_rgba(251,146,60,0.6)]"
                animate={{ width: `${(ammoInMagazine / activeWeapon.magazineSize) * 100}%` }}
                transition={{ duration: 0.18 }}
              />
            </div>
            <div className="pointer-events-auto mt-2 flex justify-end gap-1">
              {WEAPON_ORDER.map((weaponId) => {
                const weapon = getWeaponConfig(weaponId)

                return (
                  <button
                    key={weaponId}
                    type="button"
                    data-ui-control="true"
                    className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] transition ${
                      selectedWeapon === weaponId
                        ? 'border-amber-200/60 bg-amber-300/15 text-amber-100'
                        : 'border-white/10 bg-slate-950/35 text-slate-300'
                    }`}
                    onClick={() => {
                      playUIClick()
                      setSelectedWeapon(weaponId)
                    }}
                  >
                    {weapon.shortName}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Mobile Score, Ammo & Rifles - Left Side Column Above Joystick */}
        <motion.div
          className="absolute sm:hidden left-1 flex flex-col items-start gap-1.5 max-w-[12rem] pointer-events-auto"
          style={{
            bottom: 'max(14rem, calc(env(safe-area-inset-bottom, 0px) + 14rem))',
            left: 'max(0.25rem, env(safe-area-inset-left))',
          }}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {/* Score Panel */}
          <div className="glass-panel premium-panel px-1.5 py-1 w-full">
            <div className="flex items-center justify-between gap-2 text-[6px] uppercase tracking-[0.15em]">
              <span className="text-slate-400">Score</span>
              <span className="font-black text-amber-200">{playerScore.toLocaleString()}</span>
            </div>
          </div>

          {/* Ammo Panel */}
          <div className="glass-panel premium-panel px-1.5 py-1 w-full">
            <div className="text-[6px] uppercase tracking-[0.15em] text-slate-400 mb-0.5">
              {activeWeapon.shortName}
            </div>
            <div className="flex items-end gap-0.5">
              <span className="text-lg font-black text-white">{ammoInMagazine}</span>
              <span className="text-[6px] text-slate-400 pb-0.5">/ {ammoReserve}</span>
            </div>
            <div className="mt-0.5 h-0.5 rounded-full bg-slate-950/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
                animate={{ width: `${(ammoInMagazine / activeWeapon.magazineSize) * 100}%` }}
                transition={{ duration: 0.18 }}
              />
            </div>
          </div>

          {/* Rifles Panel */}
          <div className="w-full">
            <p className="text-[6px] uppercase tracking-[0.2em] text-slate-400 px-1.5 mb-1">Rifles</p>
            <div className="pointer-events-auto flex flex-wrap gap-0.5 px-1">
              {WEAPON_ORDER.map((weaponId) => {
                const weapon = getWeaponConfig(weaponId)
                return (
                  <motion.button
                    key={weaponId}
                    type="button"
                    data-ui-control="true"
                    className={`rounded-full border px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-[0.1em] transition ${
                      selectedWeapon === weaponId
                        ? 'border-amber-200/60 bg-amber-300/15 text-amber-100'
                        : 'border-white/10 bg-slate-950/35 text-slate-300'
                    }`}
                    onClick={() => {
                      playUIClick()
                      setSelectedWeapon(weaponId)
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {weapon.shortName}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
