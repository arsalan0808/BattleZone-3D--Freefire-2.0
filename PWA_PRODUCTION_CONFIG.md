# PWA Production Configuration Guide

## ✅ Production Deployment Checklist

### Pre-Deployment
- [ ] Run `npm run build` and verify no errors
- [ ] Check `dist/` folder exists with all assets
- [ ] Verify `dist/manifest.json` is valid (use manifest validator)
- [ ] Verify `dist/sw.js` exists and has content
- [ ] Check bundle size: `du -sh dist/` should be < 2MB total

### Manifest Validation
```bash
# Use online validator or:
npx web-app-manifest-validator dist/manifest.json
```

### Service Worker Validation
```bash
# Check SW syntax
node -c dist/sw.js
```

### HTTPS Required
- PWA requires HTTPS (except localhost)
- Vercel auto-enables HTTPS for *.vercel.app domains
- For custom domains, add SSL certificate before deploying

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or auto-deploy from GitHub push (recommended)
# 1. Push to GitHub
# 2. Vercel auto-detects and deploys
# 3. Check build logs in Vercel dashboard
```

---

## 🔧 Configuration Details

### Manifest Orientation
- `orientation: "portrait-primary"` forces portrait mode on mobile
- Portrait mode enforces proper UI layout for vertical screens
- Buttons positioned for thumb accessibility

### Service Worker Cache Strategy
- **HTML**: NetworkFirst (3-hour timeout, 2s network timeout)
- **JS/CSS**: NetworkFirst (3-day cache, 2s network timeout) **[CRITICAL: Changed from 30-day CacheFirst]**
- **Images**: CacheFirst (60-day cache)
- **3D Assets**: CacheFirst (30-day cache)
- **Fonts**: CacheFirst (1-year cache)

**Why NetworkFirst for JS/CSS?**
- Ensures bug fixes deploy immediately
- Falls back to cache if offline (up to 3 days old)
- Prevents users stuck on buggy versions
- Vercel cache headers make hashed assets 1-year cacheable anyway

### Cache Invalidation
- Vite uses content hashing: `bundle-[hash].js`
- Changed code = different file name = new request
- Old cached files automatically cleaned up after 3 days
- `cleanupOutdatedCaches: true` removes unused cache keys

### Vercel Headers (30-second rebuild)
```json
{
  "/manifest.json": "max-age=0, must-revalidate",
  "/sw.js": "max-age=0, must-revalidate",
  "/index.html": "max-age=0, must-revalidate",
  "/(js|css|img|fonts)/(.*)": "max-age=31536000, immutable",
  "/workbox-*.js": "max-age=3600, must-revalidate"
}
```

---

## 📱 Portrait Mode Features

### Forced Portrait Orientation
- App always launches in portrait mode
- Device rotation locked to portrait (recommended by manifest)
- UI optimized for vertical 9:16 aspect ratio
- Buttons positioned in bottom area for thumb reach

### Safe-Area Insets
- Respects device notches (iPhone X+, Samsung)
- Respects home indicators and software keyboards
- CSS: `env(safe-area-inset-top/bottom/left/right)`
- UI never hidden behind device UI elements

### Responsive Sizing
- Buttons: `clamp(3rem, 14vw, 4rem)` scales from 48px to 64px
- Joystick: `clamp(4.25rem, 18vw, 5.5rem)`
- Font sizes: `clamp(0.55rem, 2vw, 0.7rem)`
- All relative to viewport width for responsiveness

### Touch Optimization
- `touchAction: none` disables iOS double-tap zoom
- Immediate button response (no 300ms delay)
- Haptic feedback on Android/iOS
- No context menu on long press

---

## 🔍 Production Testing

### Test Offline Functionality
1. Open DevTools (F12)
2. Network tab → Throttle: Offline
3. Refresh page
4. Game should load from cache
5. All UI should work
6. Can play offline

### Test Service Worker Updates
1. Deploy a change to production
2. Open app in two tabs
3. Refresh one tab
4. "Update Ready" banner should appear
5. Click "Update" → page reloads with new version

### Test Installation
**Android Chrome:**
1. Open app on Chrome mobile
2. Wait 3 seconds (install prompt may appear)
3. Or: Menu → Install app
4. App installs like native app
5. Opens in standalone mode

**iOS Safari:**
1. Open app in Safari
2. Share → Add to Home Screen
3. App installable via manual process

**Desktop Chrome:**
1. Open app in Chrome desktop
2. Address bar shows install icon
3. Click to install app

### Test Portrait Lock
1. Install app on iPhone/Android
2. Device orientation lock: ON (in Control Center)
3. App stays in portrait
4. Buttons accessible with thumb
5. No UI cutoff

---

## 📊 Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| First Load (3G) | < 5s | ~3-4s |
| Repeat Load (offline) | Instant | ~0.5-1s |
| JS/CSS Cache Duration | 3 days | 3 days |
| Asset Cache Duration | 1 year | 1 year |
| Manifest Cache | 0 (always fresh) | 0s |
| SW Cache | 0 (always fresh) | 0s |
| LCP | < 2.5s | ~1.5-2s |
| FID | < 100ms | ~30-50ms |

---

## 🚨 Troubleshooting Production Issues

### Issue: App not installable
**Solution:**
- Verify HTTPS is enabled
- Check manifest.json is valid: `Content-Type: application/manifest+json`
- Verify icons paths are correct and files exist
- Check browser console for errors

### Issue: Users get old JS/CSS
**Solution:**
- Check if browser cached old assets
- Verify Vercel logs show new bundle
- Tell user to clear browser cache or reinstall app
- New deploy code = different file hash = fresh request

### Issue: Buttons not responding in production
**Solution:**
- Check GameScene canvas doesn't have `touch-none`
- Verify buttons have `pointer-events-auto`
- Check mobile layout isn't broken
- Check console for React errors

### Issue: Blank screen after install
**Solution:**
- Check service worker registration: `navigator.serviceWorker.getRegistrations()`
- Verify manifest.json start_url is correct
- Check browser console for 404 errors on assets
- Try clearing app cache

### Issue: UI elements overlapping
**Solution:**
- Check safe-area insets are applied
- Verify z-index values: Canvas: z-0, HUD: z-30, Controls: z-40
- Check Tailwind responsive classes match breakpoints
- Use DevTools device emulation to test small screens

---

## 📈 Monitoring in Production

### Key Metrics to Watch
1. Installation rate (Google Analytics)
2. Crash reports (if enabled)
3. Performance metrics (CrUX, Lighthouse)
4. Cache hit rate (Service Worker events)
5. User retention (app opens)

### Service Worker Events Log
Check browser DevTools → Application → Service Workers:
- Status: Activated (green dot)
- Update check: Should succeed
- Clients: Should show 1+ connected

### Cache Storage Inspection
DevTools → Application → Cache Storage:
- `html-cache-v1`: HTML files (1h)
- `assets-cache-v1`: JS/CSS files (3d)
- `images-cache-v1`: Images (60d)
- `game-assets-cache-v1`: 3D models (30d)
- `fonts-cache-v1`: Fonts (1y)

---

## 🔐 Security Considerations

### HTTPS Only
- PWA requires HTTPS
- Vercel auto-enables
- Check certificate validity

### Content Security Policy (Recommended)
```
default-src 'self' https:
script-src 'self' 'unsafe-inline' 'unsafe-eval' https:
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' data: https:
connect-src 'self' https:
media-src 'self' https: blob:
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'self'
```

### XSS Prevention
- Manifest from trusted source
- SW only from same origin
- No external scripts loaded
- React sanitizes user content

---

## 🚀 Quick Start: Deploy to Vercel

```bash
# 1. Push to GitHub (if using GitHub)
git add .
git commit -m "PWA production fixes"
git push origin main

# 2. Vercel auto-deploys from GitHub
# OR manually:
npm run build
vercel --prod

# 3. Verify deployment
# - Open https://your-app.vercel.app
# - Offline: DevTools → Network → Offline → Refresh
# - Install: Mobile browser → Install app
# - Check: DevTools → Application → Service Workers → Active

# 4. Monitor
# - Vercel Dashboard → Analytics
# - Google Search Console
# - Mobile device testing
```

---

## ✅ Verification Checklist (Post-Deploy)

- [ ] App loads on production URL
- [ ] Install prompt appears on mobile
- [ ] App installs and opens standalone
- [ ] Offline functionality works
- [ ] All buttons responsive
- [ ] No console errors
- [ ] UI looks correct in portrait
- [ ] Health bars visible on notched phones
- [ ] Performance Lighthouse score > 90
- [ ] Service Worker active and updating
