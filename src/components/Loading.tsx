import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

/**
 * Loading Component
 * Full-screen loading overlay with animated spinner and progress bar
 * Smooth fade-out transitions when loading completes
 */
export const Loading = () => {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const setScene = useGameStore((state) => state.setScene)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    let sceneTimeout: ReturnType<typeof setTimeout> | null = null
    let hardTimeout: ReturnType<typeof setTimeout> | null = null

    // Simulate loading progress
    interval = setInterval(() => {
      setProgress((prev) => {
        // Early exit conditions
        if (prev >= 100) {
          if (interval) clearInterval(interval)
          return 100
        }

        // Non-linear progress calculation
        let increment = 0
        if (prev < 30) {
          // Fast start: 0-30%
          increment = Math.random() * 8 + 3
        } else if (prev < 70) {
          // Medium pace: 30-70%
          increment = Math.random() * 5 + 2
        } else if (prev < 95) {
          // Slower: 70-95%
          increment = Math.random() * 3 + 1
        } else {
          // Final push: 95-100%
          increment = Math.random() * 3 + 2
        }

        const newProgress = Math.min(prev + increment, 100)

        // When reaching 100%, trigger completion
        if (newProgress >= 100) {
          if (interval) {
            clearInterval(interval)
            interval = null
          }
          setIsComplete(true)
          // Delay scene transition for fade-out animation
          sceneTimeout = setTimeout(() => {
            setScene('lobby')
          }, 800)
        }

        return newProgress
      })
    }, 400)

    hardTimeout = setTimeout(() => {
      setProgress(100)
      setIsComplete(true)
      setScene('lobby')
    }, 6000)

    // Cleanup function
    return () => {
      if (interval) clearInterval(interval)
      if (sceneTimeout) clearTimeout(sceneTimeout)
      if (hardTimeout) clearTimeout(hardTimeout)
    }
  }, [setScene])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary via-secondary to-primary overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: isComplete ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        {/* Animated background grid effect */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(90deg, rgba(255,165,0,0.1) 1px, transparent 1px), linear-gradient(rgba(255,165,0,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-6">
          {/* Title with glow effect */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-6xl font-black glow-accent drop-shadow-2xl text-center tracking-wider">
              Free Fire
            </h1>
            <h2 className="text-2xl font-bold text-accent-glow mt-2 text-center tracking-wide">
              2.0
            </h2>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="text-accent-glow/60 text-lg font-mono tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Initializing Game ...
          </motion.p>

          {/* Loading indicator - Animated Spinner */}
          <motion.div
            className="relative w-20 h-20 mt-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-accent-glow border-r-accent-glow rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            {/* Inner pulsing ring */}
            <motion.div
              className="absolute inset-2 border-2 border-accent/30 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-accent-glow rounded-full shadow-lg shadow-accent-glow" />
            </div>
          </motion.div>

          {/* Progress Bar Section */}
          <motion.div
            className="w-full max-w-md mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Progress bar container */}
            <div className="relative h-3 bg-black/50 rounded-full overflow-hidden border border-accent-glow/50 shadow-lg shadow-accent/20">
              {/* Animated progress fill */}
              <motion.div
                className="relative h-full bg-gradient-to-r from-accent via-accent-glow to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              {/* Glow effect behind bar */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent-glow/20 rounded-full blur-md"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            {/* Progress text */}
            <motion.p
              className="text-center mt-4 text-accent-glow font-mono text-lg font-bold tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Math.ceil(progress)}%
            </motion.p>
          </motion.div>

          {/* Loading tips */}
          <motion.div
            className="mt-8 text-center text-gray-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Loading ...
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom decorator */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-glow to-transparent opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.7 }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
