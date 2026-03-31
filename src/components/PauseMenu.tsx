import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { resetAppCacheAndReload } from '../utils/pwa'
import { sendTestNotification } from '../utils/notifications'
import { AnimatedButton } from './AnimatedButton'

export const PauseMenu = () => {
  const togglePause = useGameStore((state) => state.togglePause)
  const resetGame = useGameStore((state) => state.resetGame)
  const setScene = useGameStore((state) => state.setScene)
  const playerScore = useGameStore((state) => state.playerScore)

  const handleMainMenu = () => {
    resetGame()
    setScene('lobby')
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 backdrop-blur-md sm:px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="glass-panel premium-panel w-full max-w-md px-4 py-6 text-center sm:px-8 sm:py-10"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 sm:tracking-[0.45em]">Paused</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.15em] text-white sm:mt-3 sm:text-4xl sm:tracking-[0.18em]">Hold Position</h2>
          <p className="mt-2 text-xs text-slate-300 sm:text-sm">Current score: {playerScore.toLocaleString()}</p>

          <div className="mt-6 space-y-2 sm:mt-8 sm:space-y-3">
            <AnimatedButton 
              glow 
              onClick={togglePause} 
              className="touch-target w-full py-3 text-sm font-black uppercase tracking-[0.2em] sm:py-4 sm:text-base sm:tracking-[0.28em]"
            >
              Resume Match
            </AnimatedButton>
            <AnimatedButton 
              onClick={handleMainMenu} 
              className="touch-target w-full py-3 text-sm font-semibold uppercase tracking-[0.2em] sm:py-4 sm:text-base sm:tracking-[0.25em]"
            >
              Return to Lobby
            </AnimatedButton>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5">
            <button
              type="button"
              onClick={() => void sendTestNotification()}
              className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-slate-900/70"
            >
              Test Notify
            </button>
            <button
              type="button"
              onClick={() => void resetAppCacheAndReload()}
              className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-slate-900/70"
            >
              Reset Cache
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
