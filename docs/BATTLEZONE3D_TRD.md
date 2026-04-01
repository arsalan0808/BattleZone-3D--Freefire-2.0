# BattleZone 3D TRD

## 1. Technical Overview

BattleZone 3D is a frontend-heavy 3D game application built as a single-page web app. The project combines React UI rendering with Three.js scene management through React Three Fiber, while Zustand manages centralized gameplay state.

## 2. Technology Stack

- **React 18** for component-driven UI
- **TypeScript** for typed application logic
- **Vite** for development and production builds
- **Three.js** for 3D rendering primitives
- **@react-three/fiber** for React-based scene orchestration
- **@react-three/drei** for 3D helpers and abstractions
- **Zustand** for state management
- **Framer Motion** for screen and HUD animation
- **Tailwind CSS** for styling
- **Howler.js** for audio playback
- **vite-plugin-pwa** for service worker and PWA support

## 3. High-Level Architecture

### 3.1 Application Layers

- **App Layer:** scene routing, lifecycle, notifications, and PWA setup
- **Scene Layer:** loading, lobby, gameplay, and game-over screens
- **Gameplay Layer:** player, AI, camera, shooting, HUD, and controls
- **System Layer:** aiming, character control, rendering, optimization, weapons, and audio support
- **State Layer:** shared gameplay data and input state through Zustand

### 3.2 Main Entry Points

- `src/main.tsx` initializes the React app
- `src/app/App.tsx` controls scene transitions and application-wide effects
- `src/scenes/GameScene.tsx` mounts the real-time battle experience

## 4. State Management Design

The project uses a centralized Zustand store in `src/store/gameStore.ts`.

### Store Responsibilities

- Current scene management
- Player and AI health
- Score, kills, and player identity data
- Weapon selection and ammo state
- Reload requests and reload state
- Movement, shooting, cursor, and camera input
- Pause state
- Audio preferences
- Combat feedback pulses and bullet traces

This design keeps gameplay UI and 3D systems synchronized without introducing a heavier global architecture.

## 5. Gameplay Systems

### 5.1 Player System

- Player state is driven by input updates stored in Zustand.
- The player component integrates movement and representation inside the arena.
- Crosshair and aiming behavior are tied to cursor position and camera direction.

### 5.2 AI System

- AI logic lives in `src/components/AIBot.tsx`.
- The enemy transitions between patrol, chase, and attack states.
- Attack decisions consider distance, attack cooldowns, and line of sight.
- AI fires simulated shots with controlled inaccuracy and hit probability.

### 5.3 Weapon System

- Weapon definitions are centralized in `src/game/weapons.ts`.
- Each weapon defines damage, fire rate, reload timing, magazine size, reserve ammo, spread, range, and feedback values.
- Current loadout includes rifle, sniper, and pistol.

### 5.4 Shooting System

- Shooting logic lives in `src/components/Shooting.tsx`.
- The system handles fire-rate limiting, ammo consumption, reload requests, raycasting, forgiving hit detection, bullet traces, scoring, and hit audio.

### 5.5 Arena System

- Arena geometry and obstacle data are defined in `src/game/arena.ts` and `GameScene.tsx`.
- Obstacles influence pathing, cover, and line-of-sight checks.

## 6. UI and UX Architecture

- UI screens are implemented as React components.
- Framer Motion is used for scene transitions and HUD motion.
- Tailwind CSS provides utility-driven styling.
- The HUD supports distinct mobile and desktop layouts.
- The lobby includes a live 3D character preview.

## 7. Input Model

### Desktop

- Keyboard input for movement and gameplay actions
- Mouse and pointer input for aiming and firing
- Keyboard shortcuts for pause, reload, restart, and weapon switching

### Mobile

- Virtual joystick for movement
- Dedicated action buttons for shooting, reload, pause, and weapon selection
- Haptic feedback where supported

## 8. Audio Architecture

- Audio behavior is managed through a shared audio manager utility.
- Sound categories include ambient audio, weapon fire, hit feedback, reload, and UI interactions.
- Volume and mute preferences persist in application state during runtime.

## 9. PWA and Deployment Design

- PWA registration is handled through `usePWAServiceWorker`.
- Service worker registration is disabled in local development and enabled in supported production environments.
- Update and offline-ready events are exposed to the app through custom browser events.
- The application is designed for modern browser deployment and installability.

## 10. Performance Strategy

- Device-aware rendering adjustments for mobile
- Configured canvas DPR limits
- Conditional shadow usage
- Performance monitoring through `PerformanceOptimizer`
- Controlled bullet trace limits and lightweight state updates

## 11. File Structure Summary

- `src/app/` application routing and lifecycle
- `src/scenes/` scene-level views
- `src/components/` gameplay and UI components
- `src/store/` global game state
- `src/game/` gameplay configuration and arena data
- `src/systems/` reusable gameplay and technical subsystems
- `src/utils/` support utilities for device, audio, notifications, and PWA
- `public/` 3D assets and icons

## 12. Technical Constraints

- Browser-based execution limits hardware consistency across devices
- Mobile performance requires selective visual tradeoffs
- No backend or multiplayer synchronization layer is currently present
- Offline support depends on browser PWA capabilities

## 13. Future Technical Extensions

- Multiplayer networking layer
- Persistent player profiles and cloud save
- More advanced AI state machines
- Content pipelines for maps, weapons, and characters
- Telemetry and performance analytics
