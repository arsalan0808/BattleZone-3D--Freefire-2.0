import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type UpdateSWHandler = (reloadPage?: boolean) => Promise<void>

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const [showOfflineMode, setShowOfflineMode] = useState(false)
  const [showInstalledToast, setShowInstalledToast] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [updateSW, setUpdateSW] = useState<UpdateSWHandler | null>(null)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (standalone) {
      setIsInstalled(true)
      return
    }

    const isIOSDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    setIsIOS(isIOSDevice)

    const dismissedUntil = Number(localStorage.getItem('pwa-install-dismissed-until') ?? 0)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      if (Date.now() >= dismissedUntil) {
        setShowPrompt(true)
      }
    }

    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true')
      setIsInstalled(true)
      setShowInstalledToast(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    const handleUpdateReady = (event: WindowEventMap['battlezone:pwa-update-ready']) => {
      setUpdateSW(() => event.detail.updateSW)
      setShowUpdate(true)
    }

    const handleOfflineReady = () => {
      if (!sessionStorage.getItem('battlezone-offline-ready')) {
        sessionStorage.setItem('battlezone-offline-ready', 'true')
        setShowUpdate(true)
      }
    }

    const handleOffline = () => setShowOfflineMode(true)
    const handleOnline = () => setShowOfflineMode(false)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('battlezone:pwa-update-ready', handleUpdateReady)
    window.addEventListener('battlezone:pwa-offline-ready', handleOfflineReady)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    if (localStorage.getItem('pwa-installed') === 'true') {
      setIsInstalled(true)
    } else if (Date.now() >= dismissedUntil && isIOSDevice) {
      setShowPrompt(true)
    }

    setShowOfflineMode(!window.navigator.onLine)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('battlezone:pwa-update-ready', handleUpdateReady)
      window.removeEventListener('battlezone:pwa-offline-ready', handleOfflineReady)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true')
      setIsInstalled(true)
      setShowInstalledToast(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed-until', String(Date.now() + 1000 * 60 * 60 * 12))
  }

  if (isInstalled) {
    return (
      <AnimatePresence>
        {showInstalledToast && (
          <Banner
            title="App Installed Successfully"
            body="BattleZone is now available from your home screen or desktop app launcher."
            primaryLabel="Launch Ready"
            onPrimary={() => setShowInstalledToast(false)}
            onDismiss={() => setShowInstalledToast(false)}
          />
        )}
        {showUpdate && (
          <Banner
            title="Offline Ready"
            body={updateSW ? 'A new version is ready to install.' : 'The app is cached and ready for offline play.'}
            primaryLabel={updateSW ? 'Update' : 'Nice'}
            onPrimary={updateSW ? () => void updateSW(true) : () => setShowUpdate(false)}
            onDismiss={() => setShowUpdate(false)}
          />
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {showOfflineMode && (
        <Banner
          title="Offline Mode Active"
          body="Cached content is active. You can keep playing without an internet connection."
          primaryLabel="OK"
          onPrimary={() => setShowOfflineMode(false)}
          onDismiss={() => setShowOfflineMode(false)}
        />
      )}

      {showPrompt && (
        <Banner
          title="Install BattleZone"
          body={
            deferredPrompt
              ? 'Install for fullscreen play, faster loading, and offline access.'
              : isIOS
                ? 'Use Share > Add to Home Screen to install on iPhone or iPad.'
                : 'This device can install the app once the browser exposes the install prompt.'
          }
          primaryLabel={deferredPrompt ? 'Install Game' : 'OK'}
          onPrimary={deferredPrompt ? () => void handleInstall() : () => setShowPrompt(false)}
          onDismiss={handleDismiss}
        />
      )}

      {showUpdate && (
        <Banner
          title={updateSW ? 'Update Ready' : 'Offline Ready'}
          body={updateSW ? 'A fresh build is available. Update now for the latest fixes.' : 'The latest game files are cached for offline play.'}
          primaryLabel={updateSW ? 'Update' : 'Nice'}
          onPrimary={updateSW ? () => void updateSW(true) : () => setShowUpdate(false)}
          onDismiss={() => setShowUpdate(false)}
        />
      )}
    </AnimatePresence>
  )
}

const Banner = ({
  title,
  body,
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  title: string
  body: string
  primaryLabel: string
  onPrimary: () => void
  onDismiss: () => void
}) => (
  <motion.div
    className="fixed left-1/2 top-4 z-50 w-[min(100vw-1.5rem,26rem)] -translate-x-1/2"
    initial={{ opacity: 0, y: -24, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -24, scale: 0.96 }}
    transition={{ duration: 0.28 }}
  >
    <div className="glass-panel premium-panel rounded-2xl border border-amber-300/35 p-4 shadow-[0_0_28px_rgba(251,146,60,0.22)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{body}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          data-ui-control="true"
          onClick={onPrimary}
          className="glow-button flex-1 py-2 text-sm font-semibold uppercase tracking-[0.18em]"
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          data-ui-control="true"
          onClick={onDismiss}
          className="glass-button flex-1 py-2 text-sm font-semibold uppercase tracking-[0.18em]"
        >
          Dismiss
        </button>
      </div>
    </div>
  </motion.div>
)
