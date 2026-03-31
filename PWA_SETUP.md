# PWA Setup Guide - BattleZone 3D

## Overview

BattleZone 3D is a Progressive Web App (PWA) that works seamlessly online and offline. This guide explains the PWA setup and features.

## Features Implemented

### 1. **Web App Manifest** (`public/manifest.json`)
- Defines app metadata (name, description, icons, theme colors)
- Specifies display mode (fullscreen for immersive gameplay)
- Includes app shortcuts for quick actions
- Supports share target for social sharing

### 2. **Service Worker** (`public/sw.js`)
- **Offline Support**: Works completely offline after first load
- **Caching Strategies**:
  - **Network First**: HTML pages, API calls (try network, fallback to cache)
  - **Cache First**: Assets, images, fonts (use cache, fallback to network)
  - **Precaching**: Essential assets cached on install
- **Background Sync**: Syncs game scores when connection restored
- **Cache Cleanup**: Automatically removes old cache versions

### 3. **Install Prompt** (`src/components/PWAInstallPrompt.tsx`)
- Detects when app can be installed
- Shows install prompt UI on mobile
- Handles user choice (install or dismiss)
- Respects previous user choices

### 4. **Enhanced Meta Tags** (`index.html`)
- PWA detection and capability tags
- Apple iOS support (home screen installation)
- Windows tile configuration
- Open Graph for social sharing
- Security headers

### 5. **Service Worker Registration** (`src/hooks/usePWAServiceWorker.ts`)
- Automatic SW registration
- Update checks every minute
- Update notifications
- Error handling and reporting

## Installation

### On Mobile (iOS)
1. Open app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Tap "Add"
5. App appears on home screen with icon

### On Mobile (Android)
1. Open app in Chrome/Edge
2. Install prompt appears automatically
3. Tap "Install" when prompted
4. App installs to home screen

### On Desktop (PWA Support)
1. Open app in Chromium browser (Chrome, Edge, Opera)
2. Click install icon in address bar (if enabled)
3. Or: Menu → "Install BattleZone"
4. App launches in window mode

## Offline Functionality

### What Works Offline
- ✅ Full gameplay experience
- ✅ All 3D graphics and animations
- ✅ Game physics and mechanics
- ✅ Local score tracking
- ✅ Sound effects and music (if configured)

### What Happens Offline
- API calls return cached responses or error state
- Scores stored locally in IndexedDB
- Scores sync when connection restored
- Background sync enabled

## Cache Strategy Details

### HTML Files
- Network priority (get latest version)
- Falls back to cached version if offline
- 1-hour cache expiration

### JavaScript & CSS
- Cache priority (faster loading)
- Network fallback for updates
- 30-day cache expiration

### Images
- Cache priority (instant loading)
- Network fallback
- 60-day cache expiration

### Fonts (Google Fonts)
- Cache priority
- 1-year cache expiration

### API Calls
- Network priority (get latest data)
- Cache fallback for offline support
- 5-minute cache expiration

## PWA Assets Required

Create these files in the `public/` folder:

### Required Icons
```
public/pwa-192x192.png          (192x192 px)
public/pwa-192x192-maskable.png (192x192 px, with safe area)
public/pwa-512x512.png          (512x512 px)
public/pwa-512x512-maskable.png (512x512 px, with safe area)
public/apple-touch-icon.png     (180x180 px, iOS home screen)
public/mstile-150x150.png       (150x150 px, Windows tile)
public/favicon.ico              (favicon for browser tab)
```

### Icon Design Guidelines
- **Maskable icons**: Leave safe area (10% padding) for dynamic masking
- **PNG format**: Use transparent background where possible
- **Modern design**: Ensure readability at small sizes
- **Square format**: All icons should be square (1:1 aspect ratio)

## Testing PWA Locally

### Chrome DevTools
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check Service Worker registration
4. View cached files
5. Simulate offline mode

### Android Testing
1. Build: `npm run build`
2. Serve locally: `npx serve -s dist`
3. Open in Chrome on Android
4. Enable "Experimental" features if needed
5. Install prompt should appear

### iOS Testing
1. Build: `npm run build`
2. Serve locally: `npx serve -s dist`
3. Open in Safari on iOS
4. Share → Add to Home Screen
5. Launch from home screen

## Deployment Requirements

### HTTPS Only
PWAs require HTTPS in production (except localhost for testing)

### Manifest & Service Worker
- Serve manifest.json with correct MIME type
- Serve sw.js with correct MIME type
- Set proper cache headers

### Browser Support
- ✅ Chrome 40+
- ✅ Edge 17+
- ✅ Firefox 44+ (service worker only)
- ✅ Safari 14+ (iOS)
- ✅ Samsung Internet 5+

## Troubleshooting

### Service Worker Not Registering
- Check HTTPS is enabled
- Verify sw.js is accessible at root
- Check browser DevTools console for errors
- Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### App Not Installable
- Must be on HTTPS (or localhost)
- Must have valid manifest.json
- Must have valid service worker
- Icons must exist and be configured

### Offline Not Working
- Check service worker is active in DevTools
- Verify cache is populated
- Check network tab for failed requests
- Simulate offline mode in DevTools

### Install Prompt Not Showing
- App already installed (check home screen)
- Browser doesn't support PWA install (use Chrome/Edge)
- Prompt dismissed recently (clear localStorage)
- Not on mobile or doesn't meet install criteria

## Cache Clearing

### Manual Cache Clear
```javascript
// From browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

### From App
Implementation provided in service worker messaging system

## Future Enhancements

- Push notifications for game events
- Web share API integration
- Storage quota management
- Native file system API for saves
- Periodic background sync
- Virtual keyboard for native feel

## References

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)
