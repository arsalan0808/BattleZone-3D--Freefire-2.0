# BattleZone 3D

A premium cross-platform 3D battle game built with React, Three.js, and TypeScript.

## 🎮 Features

- **Cross-Platform**: Works on desktop (keyboard + mouse), mobile (touch controls), and as a PWA
- **3D Graphics**: Powered by @react-three/fiber and Three.js
- **Real-Time Gameplay**: Smooth 60fps combat with AI-driven enemies
- **Mobile Optimized**: Touch joystick, responsive UI, offline play via PWA
- **Dark Futuristic UI**: Glassmorphism panels with yellow/orange glow accents
- **Smooth Animations**: Framer Motion-powered UI transitions and effects

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety and developer experience
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful Three.js abstractions
- **Zustand** - Lightweight state management
- **Framer Motion** - Animation library
- **Tailwind CSS** - Utility-first CSS
- **Howler.js** - Audio library
- **Vite PWA Plugin** - Progressive Web App support

## 📁 Project Structure

```
src/
├── app/
│   └── App.tsx                 # Main app router
├── scenes/
│   ├── Lobby.tsx              # Character preview and start
│   └── GameScene.tsx          # Main gameplay arena
├── components/
│   ├── Player.tsx             # Player character controller
│   ├── AIBot.tsx              # Enemy AI behavior
│   ├── Camera.tsx             # Third-person camera system
│   ├── Shooting.tsx           # Projectile/weapon system
│   ├── HUD.tsx                # Health bars, score, crosshair
│   ├── MobileControls.tsx     # Touch joystick & buttons
│   ├── Loading.tsx            # Loading screen
│   └── PauseMenu.tsx          # Pause menu overlay
├── store/
│   └── gameStore.ts           # Zustand game state
├── utils/
│   └── device.ts              # Device detection utilities
├── styles/
│   └── globals.css            # Global Tailwind styles
├── assets/                    # Images, models, sounds
└── main.tsx                   # React DOM entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Core Gameplay Loop

1. **Loading Screen** → Progress bar animation
2. **Lobby** → Character preview, start button
3. **Game** → Real-time 3D combat with AI
4. **Pause Menu** → Resume or return to lobby
5. **Game Over** → Win/lose screen with restart

## 🎯 Key Systems

### Input Handling
- **Desktop**: WASD movement, mouse aim, click to shoot
- **Mobile**: Touch joystick, tap to shoot
- **Unified abstraction** via Zustand store

### Game State (Zustand)
- Scene management (loading, lobby, game, pause, gameover)
- Player/AI health and damage
- Input state (movement, camera, shooting)
- Audio settings

### 3D World (@react-three/fiber)
- Player character mesh
- AI bot with animations
- Third-person follow camera
- Projectile system
- Environmental objects

### UI (React + Tailwind + Framer Motion)
- Glassmorphism panels
- Health bars with smooth animations
- Crosshair overlay
- Mobile touch controls
- Score display

## 📊 Performance Optimization

- **Mobile-first design** for faster load times
- **Lazy loading** of assets
- **Efficient state management** with Zustand
- **Three.js instancing** for multiple objects
- **PWA caching** via Workbox
- **Code splitting** via Vite

## 📦 PWA Installation

The app is installable as a Progressive Web App:
- **Desktop**: Click "Install" in browser
- **Mobile**: Add to home screen
- **Offline support**: Cached via Service Worker

## 🎨 Customization

### Modify Theme Colors
Edit `tailwind.config.js`:
```js
colors: {
  'primary': '#1a1a2e',
  'accent': '#ffa500',
  // ...
}
```

### Add Game Audio
- Place audio files in `src/assets/sounds/`
- Use Howler.js API for playback

### Extend Game Features
- Add new scenes to `src/scenes/`
- Create new components in `src/components/`
- Extend Zustand store in `src/store/gameStore.ts`

## 🐛 Debugging

Development mode includes:
- Axes helper for scene orientation
- React strict mode for development
- TypeScript strict checks
- console logging for game events

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please follow the existing code structure and TypeScript conventions.

---

Built with ❤️ for cross-platform gaming.
