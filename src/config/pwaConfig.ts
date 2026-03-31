/* 
  BattleZone 3D PWA Production Configuration
  Configure these settings for your deployment environment
*/

// Export environment config
export const PWA_CONFIG = {
  // HTTPS Configuration
  https: {
    // For development with self-signed cert
    cert: import.meta.env.VITE_HTTPS_CERT || '',
    key: import.meta.env.VITE_HTTPS_KEY || '',
    
    // For production - use real SSL certificate
    // Set these via environment variables on your server
    enabled: import.meta.env.MODE === 'production'
  },

  // Cache Control Headers (set these on your server)
  cacheHeaders: {
    // Static assets (JS, CSS) - long-term caching
    assets: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    },
    
    // HTML files - no caching to get fresh pages
    html: {
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'X-UA-Compatible': 'IE=edge'
    },
    
    // Service Worker - must revalidate
    sw: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Service-Worker-Allowed': '/'
    },
    
    // Manifest - cache for 1 day
    manifest: {
      'Cache-Control': 'public, max-age=86400'
    },
    
    // Images and fonts - long-term caching
    media: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
    
    // API responses - no caching
    api: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  },

  // Security Headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  },

  // Server Configuration
  server: {
    // Use HTTPS in production
    protocol: import.meta.env.MODE === 'production' ? 'https' : 'http',
    
    // Compression
    compression: 'gzip',
    
    // CORS settings
    cors: {
      origin: import.meta.env.VITE_CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  },

  // PWA Settings
  pwa: {
    // Cache strategy
    strategies: {
      html: 'NetworkFirst',
      assets: 'CacheFirst',
      images: 'CacheFirst',
      fonts: 'CacheFirst',
      api: 'NetworkFirst'
    },

    // Cache durations (in seconds)
    cacheDuration: {
      html: 3600,           // 1 hour
      assets: 31536000,     // 1 year
      images: 2592000,      // 30 days
      fonts: 31536000,      // 1 year
      api: 300              // 5 minutes
    }
  }
}

// Helper function to get cache header
export const getCacheHeader = (fileType: string) => {
  const headers = PWA_CONFIG.cacheHeaders
  const securityHeaders = PWA_CONFIG.securityHeaders
  
  switch (fileType) {
    case 'js':
    case 'css':
      return { ...headers.assets, ...securityHeaders }
    case 'html':
      return { ...headers.html, ...securityHeaders }
    case 'sw':
      return { ...headers.sw, ...securityHeaders }
    case 'manifest':
      return { ...headers.manifest, ...securityHeaders }
    case 'image':
    case 'font':
      return { ...headers.media, ...securityHeaders }
    case 'api':
      return { ...headers.api, ...securityHeaders }
    default:
      return securityHeaders
  }
}

export default PWA_CONFIG
