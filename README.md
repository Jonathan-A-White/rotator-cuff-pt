# Rotator Cuff PT Tracker

A Progressive Web App for tracking rotator cuff rehabilitation exercises across three phases. Designed for one-handed mobile use during exercise sessions with timers, audio/visual/vibration alerts, workout logging, and progress tracking.

All data is stored locally on your device (IndexedDB). No server, no tracking, no account required.

## Features

- **3-phase exercise program** with isometric holds, isotonic exercises, and pull-up progressions
- **Accurate countdown timers** with audio tones, vibration, and visual feedback
- **Automatic workout logging** with optional pain tracking and notes
- **Progress dashboard** with weekly charts, exercise balance, and streak tracking
- **Biweekly assessments** to track rehabilitation progress over time
- **Return-to-Pull-Ups checklist** for Phase 3 milestone tracking
- **Dark mode** (system/light/dark)
- **Fully offline** after first load
- **Installable** as a PWA on Android and iOS

## Install as PWA on Android (easiest)

1. Open the app URL in Chrome
2. Tap the three-dot menu (top right)
3. Tap "Add to Home screen" or "Install app"
4. The app will appear on your home screen and run in standalone mode

## Build as a Native Android App (APK)

This project uses [Capacitor](https://capacitorjs.com) to wrap the web app as a native Android APK.

### Prerequisites

- [Android Studio](https://developer.android.com/studio) installed
- Android SDK with at least one platform (e.g. API 35)
- `ANDROID_HOME` environment variable set (Android Studio does this automatically)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Build web assets and sync to the Android project
npm run android:sync

# 3. Open the project in Android Studio
npm run android:open
```

In Android Studio:
- Wait for Gradle sync to finish
- Connect your Android phone via USB (enable USB debugging in Developer Options)
- Click **Run ▶** to install and launch on your device

### Or run directly from the command line

```bash
npm run android:run
```

This builds, syncs, and launches on a connected device or emulator in one step.

## Development

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

## Tech Stack

- React 19 + Vite
- Tailwind CSS 4
- IndexedDB via `idb`
- Web Audio API (programmatic tones)
- Wake Lock API
- PWA via `vite-plugin-pwa` + Workbox
