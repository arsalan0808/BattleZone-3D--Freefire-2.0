# PWA Install Prompt - Fix and Setup Guide

## What Was Fixed

### 1. **Service Worker Registration Conflict**
- **Issue**: Manual `/public/sw.js` conflicted with `vite-plugin-pwa` auto-generated SW
- **Fix**: 
  - Set `strategies: 'generateSW'` to let vite-plugin-pwa handle SW generation
  - Updated `usePWAServiceWorker.ts` to use `navigator.serviceWorker.ready` instead of manual registration
  - Removed duplicate workbox configuration

### 2. **PWA Plugin Configuration**
- **Issue**: Plugin was set to `registerType: 'autoUpdate'` which doesn't show install prompts
- **Fix**: Changed to `registerType: 'prompt'` to display user-triggerable install prompt
- **Impact**: Users now see the install button they can click

### 3. **Enhanced Error Logging**
- **Issue**: No debugging info when things went wrong
- **Fix**: Added comprehensive console logging throughout PWAInstallPrompt component
- **Now shows**: 
  - `[PWA]` prefixed logs
  - When beforeinstallprompt fires
  - User agent info
  - Install acceptance/dismissal
  - Error messages

---

## Testing the PWA Setup

### ✅ Local Development (HTTP Localhost)
```bash
npm run dev
```
- Dev server runs on **http://localhost:5174** (or next available port)
- PWA features test in dev mode with `devOptions: { enabled: true }`
- Service worker registers and caches assets
- Install prompt won't show on HTTP (requires Android emulator or production HTTPS)

### 📱 Testing Install Prompts

#### Option 1: Test Locally (HTTP Dev Mode)
```bash
npm run dev
```
**What works:**
- ✅ Service worker registration
- ✅ Offline caching
- ✅ Console logging with `[PWA]` prefix
- ⚠️ Install prompt hidden on HTTP (browser security)

**Check Console:**
```
[PWA] App is already running as installed PWA
[PWA] Service Worker registered and ready
```

#### Option 2: Production Build with HTTPS (Recommended for testing)
```bash
npm run build
npm run preview
```
Then access via **http://localhost:4173**

**To test with HTTPS locally:**
1. Install `mkcert`:
   ```bash
   # Windows (PowerShell as Admin)
   choco install mkcert
   ```

2. Generate certificates:
   ```bash
   mkcert -install
   mkcert localhost 127.0.0.1 ::1
   ```

3. Update `vite.config.ts` server config:
   ```ts
   server: {
     https: {
       key: fs.readFileSync('localhost-key.pem'),
       cert: fs.readFileSync('localhost.pem'),
     },
     port: 5173,
   }
   ```

4. Run: `npm run dev`
5. Access: **https://localhost:5173**

### 🎯 What to Expect

#### Android Chrome / Chromium Browsers:
When running with **proper HTTPS** in production:
- ✅ Install button appears in bottom-right corner
- ✅ Click "Install" to add to home screen
- ✅ App runs as native-like app
- ✅ Works offline

#### iOS Safari:
Always available:
- ✅ Manual installation guide shown
- ✅ Instructions: "Share → Add to Home Screen"
- ✅ Creates app on home screen

#### Console Debugging:
Open DevTools Console (F12) to see PWA logs (any environment):
```
[PWA] App is already running as installed PWA
[PWA] beforeinstallprompt event triggered
[PWA] User choice: accepted
[PWA] Installation accepted
```

---

## Browser Compatibility

| Browser | Environment | Support | Implementation |
|---------|-------------|---------|-----------------|
| Chrome/Edge (Android) | HTTPS | ✅ Full | beforeinstallprompt event |
| Chrome/Edge (Desktop) | HTTPS | ✅ Full | Address bar install |
| Safari (iOS) | Any | ✅ Limited | Manual home screen add |
| Firefox | HTTPS | ⚠️ Partial | May show native prompt |
| Safari (Desktop) | Any | ❌ No | Not supported |

---

## Production Deployment

### 🔴 HTTPS is REQUIRED
PWA **only works with install prompts over HTTPS** in production. For development, HTTP is fine for testing service workers.

### 📋 Deployment Checklist

1. **SSL Certificate**
   - Use a valid certificate from trusted CA (Let's Encrypt recommended)
   - Certificate must be valid for your domain
   - No self-signed certs allowed in production

2. **Server Headers**
   Ensure your server returns correct headers:

   ```
   # HTML files
   Cache-Control: public, max-age=3600, must-revalidate
   Content-Type: text/html; charset=UTF-8

   # Service Worker (CRITICAL - must not cache SW itself)
   Cache-Control: public, max-age=0, must-revalidate
   Service-Worker-Allowed: /
   Content-Type: application/javascript

   # Assets (JS, CSS)
   Cache-Control: public, max-age=31536000, immutable
   Content-Type: application/javascript or text/css

   # Manifest
   Cache-Control: public, max-age=86400
   Content-Type: application/manifest+json
   ```

3. **Manifest Configuration** ✅ Already done
   - Standalone display mode configured
   - App icons (192x192 and 512x512) in WebP format
   - Proper theme colors set
   - Start URL and scope configured

4. **Service Worker Caching** ✅ Already configured
   - HTML: Network-first (1 hour cache)
   - JS/CSS: Cache-first (30 days)
   - Images: Cache-first (60 days)
   - Offline fallback enabled

---

## Checking PWA Installation Status

### Browser DevTools
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check:
   - **Manifest** section - should load without errors
   - **Service Workers** - should show "activated and running"
   - **Cache Storage** - should show cache entries
   - **Local Storage** - check for `pwa-installed` flag

### Manual Testing
1. **Check if installed:**
   ```js
   // In console
   const isInstalled = 'pwa-installed' in localStorage;
   console.log('PWA installed:', isInstalled);
   ```

2. **Check service worker:**
   ```js
   navigator.serviceWorker.getRegistrations()
     .then(regs => console.log('SW registrations:', regs.length))
   ```

3. **Check dismissal timeout:**
   ```js
   const dismissUntil = localStorage.getItem('pwa-install-dismissed-until');
   console.log('Dismissed until:', new Date(Number(dismissUntil)));
   ```

---

## Dismiss Behavior

Install prompt is automatically hidden for **12 hours** if user clicks "Not Now".

### To reset and re-show immediately:
1. Open DevTools (F12)
2. Go to **Application > Local Storage**
3. Delete these keys:
   - `pwa-installed`
   - `pwa-install-dismissed-until`
4. Hard refresh: Ctrl+Shift+R

---

## Common Issues & Solutions

### Issue: "beforeinstallprompt never fires"
**This is normal on HTTP localhost.** Solutions:

1. ✅ Test in production with HTTPS
2. ✅ Generate local HTTPS certs with mkcert (see above)
3. ✅ Build and preview: `npm run build && npm run preview`
4. ✅ Use Android emulator (automatically grants HTTPS on localhost)
5. ✅ Deploy to staging server with valid HTTPS

### Issue: "Install button works but app doesn't install"
**Solutions:**
1. ✅ Verify manifest.json loads without errors (DevTools > Application > Manifest)
2. ✅ Check service worker is activated (DevTools > Application > Service Workers)
3. ✅ Ensure icon files exist and load without 404 errors
4. ✅ Check browser compatibility (Chrome/Edge on Android)
5. ✅ Try incognito mode to avoid extension interference

### Issue: "App installs but doesn't work offline"
**Solutions:**
1. ✅ Verify service worker is activated and running
2. ✅ Check Cache Storage populated (DevTools > Application > Cache Storage)
3. ✅ Ensure HTML/JS/CSS are in cache strategies
4. ✅ Test offline: DevTools > Network > Offline checkbox
5. ✅ Check for failed network requests in console

### Issue: "Console shows [PWA] errors"
**Common errors:**
- `Service Worker registration failed` - Check SW permissions and paths
- `Failed to check for SW updates` - Network issue, retry
- `beforeinstallprompt not fired` - Browser doesn't support or on HTTP

---

## Configuration Files

### Modified Files:
1. **vite.config.ts**
   - PWA plugin settings with `registerType: 'prompt'`
   - Workbox caching strategies
   - Build optimization

2. **src/hooks/usePWAServiceWorker.ts**
   - Service worker ready detection
   - Update checking (60 second intervals)
   - Event listener setup

3. **src/components/PWAInstallPrompt.tsx**
   - Install prompt UI with Framer Motion
   - BeforeInstallPrompt event handling
   - iOS manual install instructions
   - Comprehensive console logging

### Key Settings:
```ts
// Prompt registration (shows install button when available)
registerType: 'prompt'

// Auto-generate service worker
strategies: 'generateSW'

// Enable dev testing
devOptions: { enabled: true }

// Cache strategies
runtimeCaching: [
  // HTML - network first
  // JS/CSS - cache first
  // Images - cache first
]
```

---

## Next Steps

### 1. Test Locally (Now)
```bash
npm run dev
# Visit http://localhost:5174
# Check console for [PWA] logs
# Service worker should activate
```

### 2. Build & Preview (Test Caching)
```bash
npm run build
npm run preview
# Visit http://localhost:4173
# Check Application tab for service worker
```

### 3. Deploy to Production (With HTTPS)
- Ensure valid SSL certificate
- Deploy to HTTPS domain
- Install prompt appears on Android browsers
- Full offline support enabled

### 4. Monitor
- Check console for `[PWA]` messages
- Verify cache grows over time
- Monitor service worker updates in DevTools

---

## Useful Links

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - Install Prompt](https://web.dev/install-prompt/)
- [vite-plugin-pwa Docs](https://vite-plugin-pwa.netlify.app/)
- [Workbox Docs](https://developers.google.com/web/tools/workbox)
- [mkcert - Local HTTPS](https://github.com/FiloSottile/mkcert)
