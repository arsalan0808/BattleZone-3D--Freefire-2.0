# BattleZone 3D PWA - Quick Start & Testing Guide

## 🚀 Local Development & Testing

### 1. Install Dependencies
```bash
cd "3D Game"
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
- Opens at `http://localhost:5173`
- Hot reload enabled
- Service worker not active (dev mode)

### 3. Build for Production
```bash
npm run build
```
- Creates optimized `dist/` folder
- Generates hash-based filenames
- Service worker configured

### 4. Preview Production Build
```bash
npm run preview
```
- Serves optimized build locally
- Service worker registers
- Test as close to production as possible

---

## 📱 Testing Features

### Mobile Controls
```
✓ Joystick (bottom-left)
  - Touch and drag to move
  - Circular boundary detection
  - Haptic feedback on input

✓ Shoot Button (bottom-right)
  - Large touch target (48px+)
  - Haptic feedback
  - Rapid fire support

✓ Pause Button (center-bottom on mobile)
  - Centered for easy access
  - Stops game logic
  - Shows score and menu
```

### Pause Menu
```
✓ Accessible via pause button
✓ Shows current score
✓ Resume button resumes game
✓ Main Menu button navigates back
✓ Smooth animations
```

### Game Over Detection
```
✓ Win condition: Player alive, AI defeated
✓ Lose condition: Player defeated, AI alive
✓ Victory bonus: +1000 points
✓ Health summary display
✓ Restart button available
```

### Offline Mode (DevTools Simulation)
1. Open DevTools (F12)
2. Network tab
3. Select "Offline" from throttle dropdown
4. Refresh page
5. Game should work fully

---

## 🔧 Testing Checklist

### Pre-Deployment Tests
- [ ] Run `npm run build` without errors
- [ ] Check `dist/` folder size
- [ ] Run `npm run preview`
- [ ] Test on mobile device (if available)
- [ ] Verify DevTools Console has no errors
- [ ] Check all UI elements responsive at:
  - 320px (mobile)
  - 768px (tablet)
  - 1024px (desktop)

### Mobile Testing
- [ ] Joystick movement works smoothly
- [ ] Shoot button fires accurately
- [ ] Pause button accessible
- [ ] Health bars not overlapping
- [ ] Score displays correctly
- [ ] Pause menu appears on pause
- [ ] Haptic feedback working

### Offline Testing (Chrome DevTools)
- [ ] Go to Application tab
- [ ] Check Service Workers section shows "sw.js"
- [ ] Check Cache Storage shows cached files
- [ ] Enable offline mode in Network tab
- [ ] Game continues to work offline
- [ ] Score saved for later sync

### Performance
```bash
# Check bundle size
npm run build
ls -lh dist/

# Ideal sizes:
# - index.html: < 50KB
# - JS files: < 500KB total
# - Assets: < 5MB total
```

---

## 🧪 DevTools Testing

### 1. Service Worker Check
```javascript
// Open Console (F12) and paste:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs)
  regs.forEach(reg => console.log('Scope:', reg.scope, 'State:', reg.active.state))
})
```

### 2. Cache Verification
```javascript
// Check cached files:
caches.keys().then(cacheNames => {
  cacheNames.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(requests => {
        console.log(`Cache "${name}":`, requests.map(r => r.url))
      })
    })
  })
})
```

### 3. IndexedDB Check
```javascript
// Check offline scores stored:
const db = window.indexedDB.open('battlezone-pwa', 1)
db.onsuccess = () => {
  const store = db.result.transaction('scores').objectStore('scores')
  const all = store.getAll()
  all.onsuccess = () => console.log('Offline scores:', all.result)
}
```

### 4. Install Prompt
```javascript
// Check install prompt eligibility:
window.addEventListener('beforeinstallprompt', e => {
  console.log('Install prompt available!', e)
})
```

---

## 🎮 Game Configuration

### AI Difficulty
Located in `src/systems/aiSystem.ts`:
- `REACTION_TIME`: 500ms response delay
- `AIM_ACCURACY`: 0.8 (80% accuracy)
- `SHOOT_DISTANCE`: 50 units

### Game Physics
Located in `src/config/gameConfig.ts`:
- `PLAYER_SPEED`: 8 units/s
- `BULLET_SPEED`: 20 units/s
- `PLAYER_HEALTH`: 100
- `AI_HEALTH`: 100

### Mobile-Specific Tweaks
Located in `src/components/Game/MobileControls.tsx`:
- `TOUCH_SENSITIVITY`: 1.0
- `HAPTIC_STRENGTH`: 'medium' or 'light'
- `BUTTON_SIZE`: scales with breakpoints

---

## 📊 Monitoring & Analytics

### Error Tracking
```javascript
// Add to index.html <head> for Sentry integration
<script src="https://browser.sentry-cdn.com/7.91.0/bundle.min.js"></script>
<script>
  Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    tracesSampleRate: 1.0,
  });
</script>
```

### User Engagement
```javascript
// Track install events
window.addEventListener('appinstalled', () => {
  console.log('PWA installed')
  // Send analytics
})

// Track game events
window.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Game paused (tab hidden)')
  } else {
    console.log('Game resumed')
  }
})
```

---

## 🐛 Debugging

### Device Permissions (iOS)
```javascript
// Request notification permission for iOS notifications
if ('serviceWorker' in navigator && 'Notification' in window) {
  Notification.requestPermission().then(permission => {
    console.log('Notification permission:', permission)
  })
}
```

### Console Logs
```bash
# Filter by component:
# "MobileControls" - touch input
# "HUD" - UI rendering
# "GameStore" - state management
# "ServiceWorker" - offline functionality

# View Network tab for:
# - Cache hits (200 from cache)
# - Network requests
# - Failed requests (offline)
```

### Slow Performance?
1. Check DevTools → Performance tab
2. Record 5 second session
3. Look for long tasks (> 100ms)
4. Check for memory leaks (> 100MB usage)

---

## 🔐 Security Testing

### Content Security Policy (CSP)
```bash
# CSP violations will show in Console as warnings
# Check for inline scripts or external resources

# Expected with proper CSP:
# - No eval()
# - No inline <script> tags
# - Only HTTPS connections
```

### HTTPS Testing
```bash
# Generate self-signed cert for local HTTPS testing:
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes

# Update vite.config.ts:
import fs from 'fs'
export default {
  server: {
    https: {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem'),
    }
  }
}

# Run with: npm run dev
# Access at https://localhost:5173
```

---

## 📈 Performance Metrics

### Ideal Targets

| Metric | Target | Test With |
|--------|--------|-----------|
| First Contentful Paint (FCP) | < 1.8s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Service Worker Registration | < 500ms | DevTools |
| Offline Load Time | < 200ms | DevTools (offline) |
| Mobile FPS (in-game) | 60 FPS | Browser DevTools |

### Running Lighthouse
```bash
npm install -g lighthouse

# Test production build preview
npm run preview
lighthouse http://localhost:5000 --view

# Options:
# --form-factor=mobile (test as mobile)
# --throttling-method=simulate (network throttle)
# --save-assets (save screenshots)
```

---

## 🚀 Deployment Commands

### Build & Test Locally
```bash
# 1. Build
npm run build

# 2. Preview production build
npm run preview

# 3. Test on mobile (same network)
# On mobile: visit http://<your-ip>:5000
```

### Deploy to Hosting
```bash
# Via Vercel (recommended)
npm i -g vercel
vercel

# Via Netlify
npm i -g netlify-cli
netlify deploy --prod

# Via custom server
# 1. Build: npm run build
# 2. SCP dist/ to server
# 3. Configure nginx/apache with cache headers
# 4. Point domain to server
# 5. Enable HTTPS
```

---

## ✅ Final Verification

After deployment, verify:

1. **Install immediately works**
   - HTTPS required
   - Manifest accessible
   - Icons display

2. **Game playable offline**
   - Use DevTools offline mode
   - Movement works
   - Shooting works
   - Score saves

3. **Performance acceptable**
   - Lighthouse score > 90
   - Mobile FPS > 50
   - Load time < 3s

4. **No console errors**
   - DevTools Console clean
   - Service Worker active
   - All resources loaded

---

## 📞 Support

- **Service Worker Issues**: Check `/public/sw.js` version
- **Install Not Working**: Verify HTTPS and manifest
- **Offline Not Working**: Check DevTools → Cache Storage
- **Performance Issues**: Check Dev Tools → Performance tab
- **Mobile Issues**: Test at 320px width in DevTools

---

**Ready to Deploy! 🎮🚀**
