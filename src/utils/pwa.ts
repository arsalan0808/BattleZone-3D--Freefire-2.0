/**
 * PWA Utilities
 * Helpers for offline support, caching, and score syncing
 */

/**
 * Check if app is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine
}

/**
 * Add offline score to IndexedDB
 */
export const saveOfflineScore = async (score: {
  playerScore: number
  playerHealth: number
  aiHealth: number
  timestamp: number
  gameMode?: string
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('battlezone-db', 1)

    request.onerror = () => reject(request.error)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('scores')) {
        db.createObjectStore('scores', { autoIncrement: true })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['scores'], 'readwrite')
      const store = transaction.objectStore('scores')
      const addRequest = store.add(score)

      addRequest.onerror = () => reject(addRequest.error)
      addRequest.onsuccess = () => {
        console.log('Score saved to IndexedDB:', addRequest.result)
        resolve()
      }
    }
  })
}

/**
 * Get all offline scores from IndexedDB
 */
export const getOfflineScores = async (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('battlezone-db', 1)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['scores'], 'readonly')
      const store = transaction.objectStore('scores')
      const getAllRequest = store.getAll()

      getAllRequest.onerror = () => reject(getAllRequest.error)
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result)
      }
    }
  })
}

/**
 * Clear offline scores from IndexedDB
 */
export const clearOfflineScores = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('battlezone-db', 1)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['scores'], 'readwrite')
      const store = transaction.objectStore('scores')
      const clearRequest = store.clear()

      clearRequest.onerror = () => reject(clearRequest.error)
      clearRequest.onsuccess = () => resolve()
    }
  })
}

/**
 * Sync offline scores with server
 */
export const syncOfflineScores = async (): Promise<boolean> => {
  if (!isOnline()) {
    console.log('Not online, cannot sync scores')
    return false
  }

  try {
    const scores = await getOfflineScores()

    if (scores.length === 0) {
      console.log('No offline scores to sync')
      return true
    }

    console.log(`Syncing ${scores.length} offline scores...`)

    // Send to API endpoint (adjust URL as needed)
    const response = await fetch('/api/scores/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scores }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    // Clear synced scores from IndexedDB
    await clearOfflineScores()
    console.log('Scores synced successfully')
    return true
  } catch (error) {
    console.error('Failed to sync offline scores:', error)
    return false
  }
}

/**
 * Request background sync for score syncing
 */
export const requestScoreSync = async (): Promise<void> => {
  if (!('serviceWorker' in navigator && 'SyncManager' in window)) {
    console.log('Background Sync not supported')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await (registration as any).sync.register('sync-scores')
    console.log('Background sync requested for scores')
  } catch (error) {
    console.error('Failed to request background sync:', error)
  }
}

/**
 * Listen for online/offline events
 */
export const onOnlineStatusChange = (callback: (isOnline: boolean) => void) => {
  window.addEventListener('online', () => {
    console.log('App is online')
    callback(true)
    // Try to sync scores when coming back online
    syncOfflineScores()
  })

  window.addEventListener('offline', () => {
    console.log('App is offline')
    callback(false)
  })
}

/**
 * Clear all app caches
 */
export const clearAllCaches = async (): Promise<void> => {
  if (!('caches' in window)) {
    console.log('Caches API not supported')
    return
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        registrations.map(async (registration) => {
          if (!registration.active) {
            return
          }

          const channel = new MessageChannel()
          registration.active.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2])
        })
      )
    }
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    console.log('All caches cleared')
  } catch (error) {
    console.error('Failed to clear caches:', error)
  }
}

export const resetAppCacheAndReload = async (): Promise<void> => {
  await clearAllCaches()

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }

  window.location.reload()
}

/**
 * Get cache storage info
 */
export const getCacheInfo = async (): Promise<{
  usage: number
  quota: number
  percentage: number
}> => {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentage: 0 }
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? (estimate.usage! / estimate.quota) * 100 : 0,
    }
  } catch (error) {
    console.error('Failed to get cache info:', error)
    return { usage: 0, quota: 0, percentage: 0 }
  }
}

/**
 * Monitor network status
 */
export const useNetworkStatus = (callback: (isOnline: boolean) => void) => {
  // Call immediately with current status
  callback(isOnline())

  // Listen for changes
  onOnlineStatusChange(callback)
}

export default {
  isOnline,
  saveOfflineScore,
  getOfflineScores,
  clearOfflineScores,
  syncOfflineScores,
  requestScoreSync,
  onOnlineStatusChange,
  clearAllCaches,
  resetAppCacheAndReload,
  getCacheInfo,
  useNetworkStatus,
}
