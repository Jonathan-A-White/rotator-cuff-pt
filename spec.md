# Rotator Cuff PT Tracker — PWA Spec

## Overview

A Progressive Web App (PWA) for tracking rotator cuff rehabilitation exercises across three phases. Installable on Android (Samsung S24 Ultra target device), with timers, audio/visual/notification alerts, exercise history, and progress dashboards. Hosted via GitHub Pages.

## Tech Stack

- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB via `idb` library (all data local, no backend)
- **Notifications**: Web Notifications API + Service Worker for background alerts
- **Audio**: Web Audio API (generate tones programmatically, no audio files needed)
- **Timers**: `requestAnimationFrame` + `setInterval` hybrid for accuracy even when screen is dimmed
- **PWA**: `vite-plugin-pwa` with Workbox for service worker, manifest, offline support
- **Hosting**: GitHub Pages via `gh-pages` npm package
- **Testing**: Vitest for unit tests on timer logic and data layer

## Design Direction

**Aesthetic**: Clinical-warm. Think physical therapy clinic meets fitness app. Not gamified, not sterile.

- **Colors**: Warm neutral background (`#FAF8F5`), dark text (`#1A1A1A`), accent teal (`#0D9488`) for active/positive states, warm amber (`#D97706`) for timers/warnings, soft red (`#DC2626`) for pain indicators. Dark mode: deep charcoal (`#1C1C1E`) background.
- **Typography**: `"DM Sans"` for body (clean, friendly, medical-appropriate), `"Space Mono"` for timer digits (monospaced for countdown readability).
- **Layout**: Mobile-first, single-column. Large touch targets (minimum 48px). The app will almost exclusively be used one-handed on a phone while doing exercises.
- **Motion**: Minimal — timer ring animation, subtle page transitions. Nothing distracting during exercise.

## Data Model

### Exercise

```typescript
interface Exercise {
  id: string;                    // e.g., "iso_internal_rotation"
  name: string;                  // "Isometric Internal Rotation"
  shortName: string;             // "Internal Rot."
  phase: number;                 // 1, 2, or 3
  category: "isometric" | "isotonic" | "mobility" | "functional";
  sets: number;                  // target sets (e.g., 5)
  reps?: number;                 // for isotonic exercises (e.g., 12-15)
  holdSeconds?: number;          // for isometric holds (e.g., 45)
  restSeconds?: number;          // rest between sets (e.g., 120)
  frequency: string;             // "daily, 1-2x" or "2-3x daily"
  description: string;           // full text instructions
  cues: string[];                // quick bullet reminders shown during exercise
  videoUrl?: string;             // YouTube link
  emoji: string;                 // visual identifier
  effortGuidance?: string;       // e.g., "20-30% effort, progress to 40%"
  painThreshold?: string;        // e.g., "Pain must stay ≤2/10"
  sortOrder: number;             // default display order (user can override)
}
```

### WorkoutLog

```typescript
interface WorkoutLog {
  id: string;                    // UUID
  date: string;                  // ISO date "2026-02-26"
  exerciseId: string;
  setsCompleted: number;
  notes?: string;                // optional free text
  painLevel?: number;            // 0-10 scale, optional
  timestamp: number;             // Date.now() when logged
}
```

### UserSettings

```typescript
interface UserSettings {
  currentPhase: number;          // 1, 2, or 3
  exerciseOrder: string[];       // ordered exercise IDs for current display
  timerSound: boolean;           // default true
  timerVibrate: boolean;         // default true
  timerNotification: boolean;    // default true
  darkMode: "system" | "light" | "dark";
  restTimerAutoStart: boolean;   // auto-start rest countdown after hold
}
```

### ProgressAssessment

```typescript
interface ProgressAssessment {
  id: string;
  date: string;
  painfulArc: number;            // 0-10
  painfulArcStartDegree?: number;
  emptyCan: number;
  resistedExternalRotation: number;
  liftOffPositioning: number;
  liftOffLifting: number;
  liftOffInches?: number;
  crossBodyAdduction: number;
  jacketTest: number;
  deadHang?: number;             // when applicable
  deadHangDuration?: number;     // seconds
  averageDailyPain: number;
  sleepQuality: "good" | "fair" | "poor";
  notes?: string;
}
```

## Exercise Data (Seed Data)

### Phase 1: Pain Reduction & Isometric Loading (Weeks 1–2)

#### 1. Isometric Internal Rotation (Subscapularis Focus)
- **id**: `p1_iso_internal_rotation`
- **sets**: 5, **holdSeconds**: 45, **restSeconds**: 120
- **emoji**: 🫸
- **video**: `https://youtube.com/shorts/ewhkUx4SAQE?si=n6b7WPExKogBBxGc`
- **description**: Stand with left elbow bent 90°, tucked to your side. Place a rolled towel between your elbow and body (keeps the shoulder in a neutral, less compressed position). Press your PALM into a door frame or wall (pushing inward toward your body). Hold 30–45 seconds at ~20–30% effort to start. 4–5 sets. Pain must stay ≤2/10 during holds. If it's more, reduce effort. Progress to 40% effort over the first week as tolerated.
- **cues**: ["Elbow bent 90°, tucked to side", "Towel between elbow & body", "Press palm INTO wall/frame", "20-30% effort → progress to 40%", "Pain ≤ 2/10"]
- **effortGuidance**: "20-30% effort, progress to 40% over first week"
- **painThreshold**: "Pain must stay ≤ 2/10"

#### 2. Isometric External Rotation
- **id**: `p1_iso_external_rotation`
- **sets**: 5, **holdSeconds**: 45, **restSeconds**: 120
- **emoji**: 🤚
- **video**: `https://youtube.com/shorts/kWtMKNnjyd0?si=kCByXDc51vvKnSTP`
- **description**: Press back of hand into door frame, elbow tucked. 4–5 sets × 30–45 sec at 30–40% effort. This loads the infraspinatus and helps balance the cuff.
- **cues**: ["Back of hand into door frame", "Elbow tucked to side", "30-40% effort", "Loads infraspinatus"]
- **effortGuidance**: "30-40% effort"

#### 3. Isometric Abduction
- **id**: `p1_iso_abduction`
- **sets**: 5, **holdSeconds**: 45, **restSeconds**: 120
- **emoji**: 💪
- **video**: `https://youtube.com/shorts/zoCppYw0PlU?si=6OB0Q8WRg0-PtblG`
- **description**: Push elbow into wall at your side. 4–5 sets × 30–45 sec. Start at 20–30% effort given the supraspinatus involvement. Stay BELOW the 60° painful arc — do this with arm at your side, not raised.
- **cues**: ["Push elbow into wall at your side", "Arm stays at side (below 60°)", "20-30% effort", "Stay below painful arc"]
- **effortGuidance**: "20-30% effort"
- **painThreshold**: "Stay BELOW 60° painful arc"

#### 4. Supported Pendulums
- **id**: `p1_pendulums`
- **sets**: 1, **holdSeconds**: 120 (duration, not hold)
- **emoji**: 🔄
- **video**: `https://youtube.com/shorts/vSK0aP7ZdU0?si=8m0_WJvERmwQs24H`
- **description**: These decompress the AC joint as well as the subacromial space. 1–2 minutes, both directions, 2–3x daily. Especially valuable first thing in the morning.
- **cues**: ["Lean forward, let arm hang", "Small circles both directions", "1-2 minutes total", "Especially good in the morning"]
- **frequency**: "2-3x daily"

#### 5. Scapular Setting Exercise
- **id**: `p1_scapular_setting`
- **sets**: 1, **reps**: 10, **holdSeconds**: 10
- **emoji**: 🦋
- **video**: `https://youtube.com/shorts/crvqDfkIihI?si=dZyl9hE76Lo9bZCl`
- **description**: Sit or stand with arms relaxed. Gently squeeze your shoulder blades together and slightly down (think "put your shoulder blades in your back pockets"). Hold 10 seconds, relax. 10 reps, 2–3x daily. This helps the scapula position correctly, reducing AC joint compression and subacromial impingement.
- **cues**: ["Arms relaxed at sides", "Squeeze blades together + down", "\"Shoulder blades in back pockets\"", "Hold 10 sec, relax", "10 reps"]
- **frequency**: "2-3x daily"

### Phase 2: Isotonic Strengthening (Weeks 3–6)

#### 6. Belly Press (Subscapularis)
- **id**: `p2_belly_press`
- **sets**: 3, **reps**: 15
- **emoji**: 🤜
- **description**: Stand with left elbow bent 90°, hand on your belly. Press your hand into your belly while moving your elbow forward (away from your side). Use your belly as resistance — the subscapularis does the work. This is a safer internal rotation exercise than using bands initially. 3 sets × 12–15 reps. Progress to band internal rotation when this is painless.
- **cues**: ["Elbow bent 90°, hand on belly", "Press hand into belly", "Move elbow forward/away from side", "Belly provides resistance", "Progress to bands when painless"]

#### 7. Band Internal Rotation
- **id**: `p2_band_internal_rotation`
- **sets**: 3, **reps**: 15
- **emoji**: 🟡
- **description**: Attach band at elbow height. Stand with right side toward anchor. Left elbow tucked with towel roll, rotate forearm inward against band. 3 sets × 12–15 reps, slow tempo (2 sec in, 3 sec out). This is the isotonic progression for subscapularis.
- **cues**: ["Band at elbow height", "Right side toward anchor", "Towel roll under left elbow", "Rotate forearm inward", "Tempo: 2s in, 3s out"]
- **effortGuidance**: "Slow tempo: 2 sec concentric, 3 sec eccentric"

#### 8. Band External Rotation
- **id**: `p2_band_external_rotation`
- **sets**: 3, **reps**: 15
- **emoji**: 🟢
- **description**: Standard band external rotation from Phase 2 of original plan. Elbow tucked, towel roll, rotate forearm outward against band resistance.
- **cues**: ["Band at elbow height", "Left side toward anchor", "Towel roll under elbow", "Rotate forearm outward", "Slow controlled tempo"]

#### 9. Modified Y-T-W Raises
- **id**: `p2_ytw_raises`
- **sets**: 3, **reps**: 10
- **emoji**: 🙆
- **description**: START WITH NO WEIGHT. The AC joint irritation means overhead positions need to be loaded very gradually. Add weight only when bodyweight is completely painless for 2 consecutive sessions. Y position (arms overhead in V), T position (arms out to sides), W position (arms bent like goal posts).
- **cues**: ["Start with NO WEIGHT", "Y: arms overhead in V shape", "T: arms straight to sides", "W: bent arms, goal post position", "Add weight after 2 painless sessions"]
- **painThreshold**: "Add weight only after 2 consecutive painless sessions"

#### 10. Side-Lying External Rotation
- **id**: `p2_sidelying_external_rotation`
- **sets**: 3, **reps**: 15
- **emoji**: 🛏️
- **description**: Lie on right side, left elbow bent 90° resting on hip. Rotate forearm upward toward ceiling. Use light dumbbell (1-3 lbs to start). Slow controlled motion.
- **cues**: ["Lie on right side", "Left elbow on hip, bent 90°", "Rotate forearm toward ceiling", "Light weight (1-3 lbs)", "Slow and controlled"]

### Phase 3: Pull-Up Return (Weeks 7–12+)

#### 11. Dead Hangs
- **id**: `p3_dead_hang`
- **sets**: 3, **holdSeconds**: 10
- **emoji**: 🧗
- **description**: Start with just 5–10 seconds. The hang position puts the subscapularis on stretch. If this provokes the behind-back pain pattern, you're not ready. Progress duration gradually.
- **cues**: ["Start with 5-10 seconds", "Full grip, relaxed shoulders", "STOP if behind-back pain pattern", "Progress duration gradually"]
- **painThreshold**: "Stop immediately if it provokes behind-back pain pattern"

#### 12. Active Hangs
- **id**: `p3_active_hang`
- **sets**: 3, **holdSeconds**: 15
- **emoji**: 🏋️
- **description**: Engage shoulders while hanging — pull shoulder blades down and back slightly without bending elbows. This is the bridge between dead hangs and scapular pull-ups.
- **cues**: ["Hang from bar", "Pull shoulder blades down + back", "Don't bend elbows", "Shoulders engaged, not relaxed"]

#### 13. Scapular Pull-Ups
- **id**: `p3_scapular_pullups`
- **sets**: 3, **reps**: 8
- **emoji**: ⬆️
- **description**: From dead hang, depress and retract scapulae to lift body slightly without bending elbows. Focus on scapular control. Target 3×8 pain-free before progressing.
- **cues**: ["Dead hang start position", "Pull shoulder blades down", "Body rises 1-2 inches", "No elbow bending", "3×8 pain-free = progress"]

#### 14. Eccentric Pull-Ups
- **id**: `p3_eccentric_pullups`
- **sets**: 3, **reps**: 5
- **emoji**: ⬇️
- **description**: Jump or step to chin-above-bar position. Lower yourself as slowly as possible (5 second target descent). Focus on control through the full range. Chin-up grip (palms toward you) may be better tolerated — reduces AC joint compression. Neutral grip (palms facing each other) is safest for AC joint if available.
- **cues**: ["Jump/step to top position", "Lower over 5 seconds", "Chin-up grip preferred (palms in)", "Neutral grip safest for AC joint", "Full controlled descent"]
- **effortGuidance**: "5-second lowering phase"

## App Structure & Screens

### 1. Home / Today Screen (default view)

The main screen the user sees. Shows:

- **Current phase indicator** at top (e.g., "Phase 1 · Week 2")
- **Today's exercises** as a vertical list of cards, in the user's configured order
- Each card shows: emoji, exercise name, target (e.g., "5 × 45s hold"), and a completion indicator (sets done today vs target)
- **Quick-start button** on each card → navigates to the Exercise Timer screen
- Cards that are fully completed today get a subtle checkmark/tint
- **Daily summary bar** at bottom: "3/5 exercises done · 12/25 total sets"
- Tapping a completed exercise allows viewing the log or doing more sets

### 2. Exercise Timer Screen

The core interaction screen. Entered by tapping an exercise from Home.

**Top section:**
- Exercise name + emoji
- Quick-reference cues (collapsible, shown by default first time)
- Link to YouTube video (opens external)
- Effort guidance badge (e.g., "20-30% effort")
- Pain threshold warning if applicable

**Timer section (for isometric holds):**
- Large circular countdown timer (prominent, easy to read across room)
- Current set indicator: "Set 3 of 5"
- Timer states: READY → HOLD (counting down) → REST (counting down) → READY (next set) → DONE
- Start/pause button (large, thumb-friendly)
- Skip rest / skip set buttons (smaller)
- Configurable: hold duration, rest duration (per-exercise defaults, but adjustable in-session)

**Timer section (for rep-based exercises):**
- Set counter: "Set 2 of 3"
- Rep counter (tap to increment, or just mark set complete)
- Optional rest timer between sets
- "Complete Set" button

**Timer feedback options (all independently toggleable in settings):**
- **Visual**: Screen flash / color change on timer completion. Progress ring animation.
- **Audio**: Distinct tones for "hold start", "10 seconds remaining", "hold complete", "rest complete". Use Web Audio API to generate tones (no files needed). A short ascending tone for "begin hold", descending triple beep for "10 sec warning", a pleasant chime for "set complete".
- **Vibration**: Vibration API patterns. Short buzz for start, long buzz for complete.
- **Notification**: If app is backgrounded, fire a notification via Service Worker for timer completion.

**On completion:**
- Auto-log the session (setsCompleted)
- Optional: pain level slider (0-10), notes field
- "Back to exercises" button

**Important UX note**: The timer must remain visible and functional with the screen dimmed. Use Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent screen sleep during active exercise.

### 3. Exercise Detail Screen

Accessed by long-press or info button on exercise card.

- Full description text
- All cues
- Effort guidance
- Pain thresholds
- Embedded YouTube link (thumbnail + "Watch Video" button)
- History: chart of sets completed over last 7/30 days for this exercise
- Phase/category tags

### 4. Progress Dashboard

- **Weekly view**: Chart showing sets completed per day (stacked bar, one color per exercise)
- **Exercise balance**: Radar/spider chart or simple bar chart showing completion % by exercise (highlights if any exercise is being neglected)
- **Streak tracker**: Consecutive days with at least one session logged
- **Phase progress**: Current phase, week number, rough % through phase
- **Assessment history**: List of biweekly progress assessments with trend arrows for each test

### 5. Biweekly Assessment Screen

Form matching the progress tracking template from the rehab plan:

- Pain scale sliders (0-10) for each test: Painful Arc, Empty Can, Resisted External Rotation, Lift-Off (positioning), Lift-Off (lifting), Cross-Body Adduction, Jacket Test, Dead Hang (when applicable)
- Painful arc start degree input
- Lift-off inches input
- Dead hang duration (when applicable)
- Average daily pain slider
- Sleep quality selector (Good/Fair/Poor)
- Notes text area
- "Save Assessment" → stores to IndexedDB, shows comparison with last assessment

### 6. Settings Screen

- **Current Phase**: Selector (1, 2, 3) — changing phase updates which exercises are shown on Home
- **Exercise Order**: Drag-to-reorder list of exercises for current phase
- **Timer Defaults**: Default hold duration, default rest duration (per-phase)
- **Alerts**:
  - Sound on/off + volume
  - Vibration on/off
  - Notifications on/off (with permission request flow)
- **Display**: Dark mode toggle (system/light/dark)
- **Rest Timer Auto-Start**: Toggle
- **Data**: Export all data as JSON, Import JSON, Clear all data (with confirmation)

### 7. Phase Rules Screen

A reference screen showing the rules/restrictions for the current phase:
- Phase 1: No behind-back reaching, no overhead with left arm, no cross-body, sleep guidance
- Phase 2: AC joint management notes, progression criteria
- Phase 3: Prerequisites checklist, grip recommendations

This should be a simple read-only display pulled from static data.

## Return-to-Pull-Ups Checklist

A dedicated checklist view (accessible from Phase 3 or Progress Dashboard) showing all criteria from the plan:

- [ ] Pain-free dead hang for 45 seconds
- [ ] 3×8 scapular pull-ups with no pain
- [ ] 3×5 eccentric pull-ups (5-sec lowering) with no pain
- [ ] External rotation strength equal bilaterally
- [ ] Internal rotation strength near-equal bilaterally
- [ ] Lift-off test: minimal or no pain
- [ ] Cross-body adduction: minimal or no pain at top of shoulder
- [ ] Jacket test: putting on jacket (right arm first) is completely pain-free

Each item is a toggle. State persists in IndexedDB.

## PWA Configuration

### manifest.json
```json
{
  "name": "Rotator Cuff PT Tracker",
  "short_name": "RC PT",
  "description": "Track rotator cuff rehabilitation exercises",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAF8F5",
  "theme_color": "#0D9488",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker
- Cache app shell for offline use (the app should work fully offline after first load)
- Handle notification display when app is backgrounded
- Use Workbox via `vite-plugin-pwa` for cache strategies

### Wake Lock
- Request screen wake lock when a timer is actively counting down
- Release on timer pause or completion

## File Structure

```
rotator-cuff-pt/
├── public/
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css                    # Tailwind imports + custom styles
│   ├── data/
│   │   ├── exercises.js             # All exercise definitions (seed data)
│   │   └── phases.js                # Phase rules, descriptions, criteria
│   ├── db/
│   │   └── index.js                 # IndexedDB wrapper (idb library)
│   ├── hooks/
│   │   ├── useTimer.js              # Timer logic (hold + rest countdown)
│   │   ├── useWakeLock.js           # Screen wake lock
│   │   ├── useAudio.js              # Web Audio API tone generation
│   │   └── useNotification.js       # Notification permission + firing
│   ├── components/
│   │   ├── ExerciseCard.jsx         # Home screen exercise card
│   │   ├── TimerRing.jsx            # Circular countdown visualization
│   │   ├── PainSlider.jsx           # 0-10 pain input
│   │   ├── CueList.jsx              # Collapsible exercise cues
│   │   ├── WeeklyChart.jsx          # Bar chart for weekly progress
│   │   ├── BalanceChart.jsx         # Exercise balance visualization
│   │   └── AssessmentForm.jsx       # Biweekly assessment form
│   ├── screens/
│   │   ├── HomeScreen.jsx
│   │   ├── ExerciseTimerScreen.jsx
│   │   ├── ExerciseDetailScreen.jsx
│   │   ├── ProgressScreen.jsx
│   │   ├── AssessmentScreen.jsx
│   │   ├── SettingsScreen.jsx
│   │   ├── PhaseRulesScreen.jsx
│   │   └── ChecklistScreen.jsx
│   └── utils/
│       ├── audio.js                 # Tone generation functions
│       └── dateUtils.js             # Date helpers
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

## Key Implementation Notes

### Timer Accuracy
The timer is the most critical UX element. Use `performance.now()` for drift-free timing rather than naive `setInterval` counting. Store the target end time and calculate remaining on each tick. This prevents drift from JS event loop delays.

```javascript
// Pseudocode for drift-free timer
const endTime = performance.now() + (holdSeconds * 1000);
const tick = () => {
  const remaining = Math.max(0, endTime - performance.now());
  setTimeRemaining(remaining);
  if (remaining > 0) requestAnimationFrame(tick);
  else onComplete();
};
```

### Audio Tones (Web Audio API)
Generate tones without audio files:
- **Start tone**: 440Hz sine wave, 200ms, fade in/out
- **Warning beeps** (10s remaining): 3x 880Hz beeps, 100ms each, 100ms gap
- **Complete chime**: 523Hz + 659Hz + 784Hz chord (C major), 400ms, fade out
- **Rest complete**: Same as start tone but 2x stacked

### Data Export Format
Export as JSON with all WorkoutLogs, ProgressAssessments, and UserSettings. Include a version field for future migration.

### Phase Transitions
When the user changes phase in Settings:
- Previous phase exercises remain in history but are hidden from Home
- New phase exercises appear on Home in default order
- A confirmation dialog explains what will change
- Phase 2 includes all Phase 1 exercises plus new ones (cumulative)
- Phase 3 includes Phase 2 exercises plus new ones

### Mobile UX Priorities
- All touch targets ≥ 48px
- Timer digits should be readable from 3 feet away (large font, high contrast)
- Minimize scrolling during active exercise — timer screen should fit above the fold
- Support one-handed operation (bottom-aligned primary actions)
- Haptic feedback on timer events via Vibration API

## GitHub Setup

Repository name: `rotator-cuff-pt`

### GitHub Pages Deployment
```bash
# In package.json scripts:
"deploy": "vite build && gh-pages -d dist"
```

Set `base` in `vite.config.js` to `'/rotator-cuff-pt/'` for GitHub Pages path.

### README.md should include:
- What the app does
- How to install as PWA on Android
- How to develop locally (`npm run dev`)
- How to deploy (`npm run deploy`)
- Data is stored locally only, no server/tracking

## Implementation Priority

Build in this order:

1. **Scaffold**: Vite + React + Tailwind + PWA plugin + routing
2. **Data layer**: IndexedDB setup, exercise seed data, settings store
3. **Home screen**: Exercise list with completion indicators
4. **Exercise Timer**: The core loop (hold → rest → next set), with audio + vibration
5. **Logging**: Auto-log on completion, pain slider
6. **Progress Dashboard**: Weekly chart, exercise balance
7. **Settings**: Phase selection, exercise reorder, alert toggles
8. **Assessment**: Biweekly form + history
9. **Polish**: Dark mode, transitions, Wake Lock, offline caching
10. **Deploy**: GitHub Pages setup, PWA icons, final manifest tuning

## Testing Checklist (Manual)

- [ ] Install to S24 Ultra homescreen, launches fullscreen
- [ ] Timer counts down accurately (compare with stopwatch)
- [ ] Audio plays during exercise even when screen dims
- [ ] Vibration fires on timer events
- [ ] Notification appears when app is backgrounded and timer completes
- [ ] Exercise order persists across app restarts
- [ ] Workout history survives app close/reopen
- [ ] Phase change shows correct exercises
- [ ] Offline: close network, app still loads and works
- [ ] Export/import data roundtrip works
- [ ] Dark mode respects system setting
