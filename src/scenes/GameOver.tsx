import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { AnimatedButton } from '../components/AnimatedButton'

export const GameOver = () => {
  const playerHealth = useGameStore((state) => state.playerHealth)
  const aiHealth = useGameStore((state) => state.aiHealth)
  const playerScore = useGameStore((state) => state.playerScore)
  const kills = useGameStore((state) => state.kills)
  const resetGame = useGameStore((state) => state.resetGame)
  const setScene = useGameStore((state) => state.setScene)

  const playerWon = playerHealth > 0 && aiHealth <= 0
  const gameResult = playerWon ? 'Victory' : 'Defeat'

  const handleRestart = () => {
    resetGame()
    setScene('lobby')
  }

  const handleRetry = () => {
    resetGame()
    setScene('game')
  }

  return (
    <motion.div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(255,174,66,0.16),_transparent_25%),linear-gradient(180deg,#05070d_0%,#0b1120_50%,#05070d_100%)] py-4 sm:py-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,179,71,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,179,71,0.08)_1px,transparent_1px)] bg-[size:3rem_3rem]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.18 }}
      />

      <motion.div
        className="glass-panel premium-panel relative z-10 mx-3 w-full max-w-xl px-4 py-6 text-center sm:mx-4 sm:px-8 sm:py-10"
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.4 }}
      >
        <motion.p
          className={`text-xs font-semibold uppercase tracking-[0.3em] sm:text-sm sm:tracking-[0.45em] ${playerWon ? 'text-emerald-300' : 'text-rose-300'}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Match Complete
        </motion.p>
        <motion.h1
          className="mt-2 text-3xl font-black uppercase tracking-[0.12em] text-white sm:mt-3 sm:text-5xl sm:tracking-[0.16em] lg:text-6xl"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {gameResult}
        </motion.h1>
        <motion.p
          className="mt-2 text-xs leading-5 text-slate-300 sm:mt-3 sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {playerWon ? 'Target neutralized. Arena secured.' : 'Operator down. Re-enter and tighten the angle.'}
        </motion.p>

        <motion.div
          className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-4 sm:gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <StatCard label="Score" value={playerScore.toLocaleString()} />
          <StatCard label="Kills" value={kills.toString()} />
          <StatCard label="Your HP" value={Math.max(0, playerHealth).toString()} />
          <StatCard label="Enemy HP" value={Math.max(0, aiHealth).toString()} />
        </motion.div>

        <motion.div
          className="mt-6 space-y-2 sm:mt-8 sm:space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <AnimatedButton glow onClick={handleRetry} className="touch-target w-full py-3 text-sm font-black uppercase tracking-[0.2em] sm:py-4 sm:text-base sm:tracking-[0.28em]">
            Drop Again
          </AnimatedButton>
          <AnimatedButton onClick={handleRestart} className="touch-target w-full py-3 text-sm font-semibold uppercase tracking-[0.2em] sm:py-4 sm:text-base sm:tracking-[0.25em]">
            Back to Lobby
          </AnimatedButton>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-white">{value}</p>
  </div>
)
