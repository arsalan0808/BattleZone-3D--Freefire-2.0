import { AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { Lobby } from '../scenes/Lobby'
import { GameScene } from '../scenes/GameScene'
import { Loading } from '../components/Loading'
import { GameOver } from '../scenes/GameOver'
import { PWAInstallPrompt } from '../components/PWAInstallPrompt'
import { usePWAServiceWorker } from '../hooks/usePWAServiceWorker'
import { audioManager, initializeSounds } from '../utils/audioManager'
import { sendGameNotification } from '../utils/notifications'

/**
 * App Component
 * Main application router that manages game state transitions
 * and renders appropriate scenes based on current game state.
 *
 * State Flow:
 *   loading → lobby → game ↔ pause
 *            ↓
 *          gameOver → (restart) → game
 */
export const App = () => {
  const lastNotificationRef = useRef<string>('')
  const currentScene = useGameStore((state) => state.currentScene)
  const playerHealth = useGameStore((state) => state.playerHealth)
  const aiHealth = useGameStore((state) => state.aiHealth)
  const soundVolume = useGameStore((state) => state.soundVolume)
  const muteSounds = useGameStore((state) => state.muteSounds)

  // Register PWA service worker for offline support
  usePWAServiceWorker()

  useEffect(() => {
    initializeSounds()
  }, [])

  useEffect(() => {
    audioManager.setMasterVolume(soundVolume)
  }, [soundVolume])

  useEffect(() => {
    audioManager.setMuted(muteSounds)
  }, [muteSounds])

  useEffect(() => {
    if (currentScene === 'lobby' || currentScene === 'loading') {
      audioManager.playAmbient()
      return
    }

    audioManager.stopAmbient()
  }, [currentScene])

  /**
   * Handle keyboard input for global actions
   * ESC: Pause/Resume, R: Restart from game over
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'escape':
          // Toggle pause only during active gameplay
          if (currentScene === 'game' || currentScene === 'pause') {
            useGameStore.getState().togglePause()
          }
          break

        case 'r':
          // Restart from game over screen
          if (currentScene === 'gameover') {
            useGameStore.getState().resetGame()
            useGameStore.getState().setScene('lobby')
          }
          break

        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentScene])

  /**
   * Monitor health values and trigger game over when either player or AI dies
   */
  useEffect(() => {
    if (currentScene === 'game') {
      if (playerHealth <= 0) {
        useGameStore.getState().setScene('gameover')
      } else if (aiHealth <= 0) {
        useGameStore.getState().setScene('gameover')
      }
    }
  }, [playerHealth, aiHealth, currentScene])

  useEffect(() => {
    if (currentScene === 'lobby' && lastNotificationRef.current !== 'lobby-ready') {
      lastNotificationRef.current = 'lobby-ready'
      void sendGameNotification({
        title: 'BattleZone Ready',
        body: 'The arena is loaded and ready to deploy.',
        tag: 'battlezone-lobby',
      })
      return
    }

    if (currentScene === 'game' && lastNotificationRef.current !== 'match-started') {
      lastNotificationRef.current = 'match-started'
      void sendGameNotification({
        title: 'Match Started',
        body: 'Reload, aim, and clear the arena.',
        tag: 'battlezone-match-start',
      })
      return
    }

    if (currentScene === 'gameover') {
      const resultTag = playerHealth > 0 && aiHealth <= 0 ? 'victory' : 'defeat'
      if (lastNotificationRef.current !== resultTag) {
        lastNotificationRef.current = resultTag
        void sendGameNotification({
          title: resultTag === 'victory' ? 'Victory' : 'Defeat',
          body: resultTag === 'victory' ? 'Enemy eliminated. Great round.' : 'Mission failed. Ready for another drop.',
          tag: `battlezone-${resultTag}`,
        })
      }
    }
  }, [aiHealth, currentScene, playerHealth])

  /**
   * Render appropriate scene based on game state
   * Using AnimatePresence for smooth transitions between scenes
   */
  return (
    <>
      <AnimatePresence mode="wait">
        {renderScene(currentScene)}
      </AnimatePresence>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </>
  )
}

/**
 * Helper function to conditionally render scenes
 * Keeps component clean by separating rendering logic
 */
const renderScene = (scene: string) => {
  switch (scene) {
    case 'loading':
      return <Loading key="loading" />

    case 'lobby':
      return <Lobby key="lobby" />

    case 'game':
    case 'pause':
      // Both game and pause states render GameScene
      // PauseMenu overlay is conditionally rendered inside GameScene
      return <GameScene key="game" />

    case 'gameover':
      return <GameOver key="gameover" />

    default:
      // Fallback to loading if state is invalid
      return <Loading key="loading" />
  }
}
