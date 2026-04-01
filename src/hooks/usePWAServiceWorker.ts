import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'

type UpdateSWHandler = (reloadPage?: boolean) => Promise<void>

declare global {
  interface WindowEventMap {
    'battlezone:pwa-update-ready': CustomEvent<{ updateSW: UpdateSWHandler }>
    'battlezone:pwa-offline-ready': CustomEvent
  }
}

export const usePWAServiceWorker = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const isDevHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0'

    if (import.meta.env.DEV || isDevHost) {
      void navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          await Promise.all(registrations.map((registration) => registration.unregister()))
          const cacheKeys = 'caches' in window ? await caches.keys() : []
          await Promise.all(cacheKeys.map((key) => caches.delete(key)))
        })
      return
    }

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) {
          return
        }

        void registration.update()
        const intervalId = window.setInterval(() => {
          void registration.update()
        }, 30_000) // Check for updates every 30 seconds

        const cleanup = () => window.clearInterval(intervalId)
        window.addEventListener('beforeunload', cleanup, { once: true })
      },
      onNeedRefresh() {
        window.dispatchEvent(
          new CustomEvent('battlezone:pwa-update-ready', {
            detail: { updateSW },
          })
        )
      },
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('battlezone:pwa-offline-ready'))
      },
    })
  }, [])
}
