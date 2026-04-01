import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  server: {
    // Use HTTP for dev - PWA dev mode allows testing without HTTPS
    port: 5173,
    strictPort: false,
    open: false,
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      manifestFilename: 'manifest.json',
      registerType: 'autoUpdate',
      strategies: 'generateSW', // Let vite-plugin-pwa generate SW
      includeAssets: [
        'mode1s/pwa-icon.webp',
        'mode1s/character.glb',
        'operator-lowpoly.gltf'
      ],
      manifest: {
        name: 'BattleZone 3D',
        short_name: 'BattleZone',
        description: 'A premium 3D cross-platform battle game with real-time multiplayer action',
        id: '/',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/?utm_source=pwa',
        orientation: 'portrait-primary',
        categories: ['games'],
        prefer_related_applications: false,
        screenshots: [
          {
            src: '/mode1s/pwa-icon.webp',
            sizes: '192x192',
            type: 'image/webp',
            form_factor: 'narrow'
          },
          {
            src: '/mode1s/pwa-icon.webp',
            sizes: '512x512',
            type: 'image/webp',
            form_factor: 'wide'
          }
        ],
        icons: [
          {
            src: '/mode1s/pwa-icon.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any monochrome'
          },
          {
            src: '/mode1s/pwa-icon.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any monochrome'
          },
          {
            src: '/mode1s/pwa-icon.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'maskable'
          },
          {
            src: '/mode1s/pwa-icon.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Start Game',
            short_name: 'Play',
            description: 'Start a new game session',
            url: '/?mode=play&utm_source=pwa_shortcut',
            icons: [
              {
                src: '/mode1s/pwa-icon.webp',
                sizes: '192x192',
                type: 'image/webp'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,woff,woff2,ttf,otf,eot,ico,png,jpg,jpeg,gif,svg,webp,glb,gltf,bin,json}'
        ],
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^mode$/],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB max file size
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /manifest\.json$/, /sw\.js$/],
        cacheId: 'battlezone-3d-v1',
        
        // Cache strategies
        runtimeCaching: [
          // HTML pages - Network first with quick fallback
          {
            urlPattern: /\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 2
            }
          },

          // JavaScript and CSS - Network first, shorter cache
          {
            urlPattern: /\.(js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache-v1',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days (shorter for bug fixes)
              },
              networkTimeoutSeconds: 2
            }
          },

          // Images - Cache first
          {
            urlPattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
              }
            }
          },

          // 3D assets - Cache first for offline play
          {
            urlPattern: /\.(glb|gltf|bin|json)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-assets-cache-v1',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },

          // Fonts - Cache first
          {
            urlPattern: /\.(woff|woff2|ttf|otf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache-v1',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/',
        suppressWarnings: true,
      },
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    // Optimize asset naming for caching
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-vendor'
          }

          if (id.includes('framer-motion')) {
            return 'motion-vendor'
          }

          if (id.includes('react')) {
            return 'react-vendor'
          }
        },
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.name || 'asset'
          const info = fileName.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|gif|tiff|bmp|ico|webp|svg/.test(ext)) {
            return `img/[name]-[hash][extname]`
          } else if (/woff|woff2|ttf|otf|eot/.test(ext)) {
            return `fonts/[name]-[hash][extname]`
          } else if (ext === 'css') {
            return `css/[name]-[hash][extname]`
          }
          return `[name]-[hash][extname]`
        }
      }
    }
  }
})
