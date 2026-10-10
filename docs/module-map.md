# Module map

Where each part of this app lives, which files stories collide on, and the splits that would let stories change different modules at the same time. Written against `main` at commit 0c5bf69 (2026-10-10). No source file was moved to write it.

The rule it measures against is the factory's "Modular Boundaries" rule: one module per concern behind a small interface; screens talk to interfaces, never to a vendor or to storage details; common code lives once in a shared library; language and settings are data, not constants. A shared file is a merge conflict, so two stories that edit one file run one after the other.

Reading notes:

- The app is plain JavaScript (React 19, Vite). Signatures below are written as TypeScript declarations so the intended API is exact; they can ship as JSDoc `@typedef`s or a `.d.ts` first, with no change to the build.
- A path in backticks exists today. A folder or file that does not exist yet is written without backticks and marked "new".
- Line counts were taken with `wc -l` at the base commit. Code in other apps is written `repo:path` without backticks (it lives outside this repo).

## Modules

Every folder or file group under `src/`, as it is now.

| Module | Files | One responsibility | Entry file and exported API | Imports |
|---|---|---|---|---|
| Bootstrap | `src/main.jsx`, `src/App.jsx`, `src/index.css` | Mount the app, define the routes, apply the dark-mode class | `App` (default); `src/main.jsx` renders it in a `HashRouter` | react-router-dom, every screen, `src/components/NavBar.jsx`, `src/config/ProgramContext.jsx`, `getSettings` from `src/db/index.js` |
| Program config | `src/config/ProgramContext.jsx`, `src/config/schema.js`, `src/config/defaultProgram.json` | Hold the active program (phases, exercises, categories, assessment sections, progression rules); validate and switch programs | `ProgramProvider`, `useProgram()`; schema: `validateProgram`, `inferTimerType`, `buildCategoryColorMap`, `extractPainFields`, `buildInitialAssessmentForm`, `getPhaseChecklists` | `src/db/index.js` (programs and settings), the bundled JSON |
| Storage | `src/db/index.js` (528 lines) | Everything that touches IndexedDB: open and upgrade, then logs, assessments, settings, checklist, programs, and the backup export, validate, migrate, import and clear | `getDB`; programs: `saveProgram`, `getProgram`, `getAllPrograms`, `getActiveProgram`, `deleteProgramAndData`; settings: `getSettings`, `saveSettings`, `backfillPhaseStartDate`; logs: `logWorkout`, `getLogsForDate`, `getLogsForExercise`, `getLogsInRange`, `getAllLogs`, `adjustSetsForDate`, `deleteLog`, `updateLog`, `addManualLog`, `decrementLatestLog`; assessments: `saveAssessment`, `getAssessments`; checklist: `getChecklistState`, `setChecklistItem`; backup: `exportAllData`, `validateImportData`, `migrateImportData`, `importData`, `clearAllData` | `idb` only |
| Date helpers | `src/utils/dateUtils.js` | Local ISO dates and their display forms | `today`, `formatDate`, `daysAgo`, `getWeekDates`, `dayOfWeek`, `daysBetween` | nothing |
| Phase readiness | `src/utils/phaseReadiness.js` | Decide from logs and assessments whether the user may move to the next phase (three pillars: time, effort, results) | `evaluatePhaseReadiness` | nothing (it re-implements its own date arithmetic) |
| Exercise ordering | `src/utils/exerciseOrder.js` | Order the home list: unfinished first, finished sink | `byProgramOrder`, `isExerciseComplete`, `orderExercises` | nothing |
| Timer engine | `src/hooks/useTimer.js` | Drift-free hold, rest and set state machine on `requestAnimationFrame` | `useTimer({holdSeconds, restSeconds, totalSets, autoStartRest, onHoldComplete, onRestComplete, onAllComplete})` | react |
| Device feedback | `src/utils/audio.js`, `src/utils/systemTimer.js`, `src/hooks/useWakeLock.js`, `src/hooks/useNotification.js` | Make the phone beep, run the Android system timer, keep the screen on, raise a notification. Vibration has no module: it is called inline (see Rule breaks) | audio: `initAudio`, `playStartTone`, `playWarningBeeps`, `playCompleteTone`, `playSwitchTone`, `playRestCompleteTone`; `startSystemTimer`; `useWakeLock()`; `useNotification()` | `@capacitor/core` (systemTimer only); browser APIs |
| Motion | `src/hooks/useFlipReorder.js` | Animate list items to their new place (FLIP) | `useFlipReorder()` | react |
| Components | `src/components/ExerciseCard.jsx`, `src/components/TimerRing.jsx`, `src/components/PainSlider.jsx`, `src/components/CueList.jsx`, `src/components/NavBar.jsx` | Small presentational pieces shared by screens | each file's default export | react; NavBar: react-router-dom |
| Screens | `src/screens/HomeScreen.jsx` (238 lines), `src/screens/ExerciseTimerScreen.jsx` (707), `src/screens/ExerciseDetailScreen.jsx` (232), `src/screens/ProgressScreen.jsx` (405), `src/screens/HistoryScreen.jsx` (283), `src/screens/AssessmentScreen.jsx` (379), `src/screens/SettingsScreen.jsx` (673), `src/screens/PhaseRulesScreen.jsx` (154), `src/screens/ChecklistScreen.jsx` (150) | One route each: compose a page from the modules above | each file's default export | `useProgram`, `src/db/index.js` (all nine), `src/utils/*`, `src/hooks/*`, `src/components/*`, `src/config/schema.js` |
| Dead data | `src/data/exercises.js` (406), `src/data/phases.js` (64) | Nothing: no file imports them. They are an earlier hard-coded copy of what `src/config/defaultProgram.json` now holds | `exercises`; `phaseRules`, `pullUpChecklist` | nothing |
| Native shell | `capacitor.config.json`, `android/` | Wrap the build as an Android app; `SystemTimerPlugin.java` backs `startSystemTimer` | n/a | n/a |
| Tests | `src/test/setup.js`, `src/config/__tests__/`, `src/db/__tests__/migration.test.js`, `src/screens/__tests__/HomeScreen.test.jsx`, `src/utils/__tests__/exerciseOrder.test.js` | Vitest with jsdom | n/a | n/a |

What the dependency picture says: the program config, the date helpers, the ordering and readiness logic and the timer engine are already decent modules, each with one job and a plain API. The trouble is on the other side. All nine screens import `src/db/index.js` directly, and two screens (`src/screens/SettingsScreen.jsx`, `src/screens/ExerciseTimerScreen.jsx`) each do five or more jobs.

## Collisions

The files changed by the most commits, taken with the story's command:

```
git log --since=30.days --name-only --format= -- src | sort | uniq -c | sort -rn | head -15
```

At the base commit that command prints nothing. The newest commit on `main` is dated 2026-08-12 and the check was run on 2026-10-10, so no commit falls in the last 30 days. Rather than leave the section empty, the table uses the same command without `--since=30.days`, which covers the app's whole life (89 commits, 2026-02-26 to 2026-08-12). Ties at 2 commits are cut by `sort -rn`'s own tie-break, so other files with 2 commits are not shown.

```
git log --name-only --format= -- src | sort | uniq -c | sort -rn | head -15
```

| Commits | File | Lines | What is mixed in it |
|---|---|---|---|
| 18 | `src/screens/SettingsScreen.jsx` | 673 | phase picker, alert toggles and the notification permission, dark mode, backup export and import with file pickers, program list, program import and export, links |
| 17 | `src/screens/ExerciseTimerScreen.jsx` | 707 | timer wiring, rep-based rest countdown, sound, vibration, notification, system timer, wake lock, back-button guard, background save, saving the log |
| 13 | `src/db/index.js` | 528 | connection and upgrades, five stores, backup export, validate, migrate, import, clear |
| 8 | `src/screens/ProgressScreen.jsx` | 405 | loading, streak, weekly counts, completion rates, phase readiness, SVG chart |
| 7 | `src/screens/HomeScreen.jsx` | 238 | loading, ordering, sink animation, edit mode |
| 5 | `src/screens/ExerciseDetailScreen.jsx` | 232 | detail view, recent history |
| 4 | `src/hooks/useTimer.js` | 254 | the timer engine |
| 4 | `src/config/ProgramContext.jsx` | 194 | state, persistence, normalising, switching |
| 4 | `src/components/ExerciseCard.jsx` | 226 | card, long press, edit buttons |
| 3 | `src/screens/PhaseRulesScreen.jsx` | 154 | phase rules page |
| 3 | `src/screens/HistoryScreen.jsx` | 283 | log list, filters, delete |
| 3 | `src/App.jsx` | 59 | routes and dark mode |
| 2 | `src/utils/systemTimer.js` | 25 | Android system timer |
| 2 | `src/utils/phaseReadiness.js` | 141 | phase readiness |
| 2 | `src/utils/audio.js` | 191 | tones |

Reading it: the top three files account for 48 of the 95 file changes in the table (18 + 17 + 13), and they are the three files with the most mixed jobs. `src/screens/SettingsScreen.jsx` and `src/screens/ExerciseTimerScreen.jsx` are both past the 500-line mark where the rule says to propose a split. Any two stories that add a setting, an alert or a log field today meet in one of these three files.

## Proposed refactors

Ranked by how much parallel work each frees. All are no-behaviour-change refactors; each keeps the existing tests green and adds a unit test for the new module. Each lists files touched so the Mayor can see which ones can run at once: R1, R2 and R3 touch disjoint files and can run together.

### R1. Settings becomes small sections plus a file-IO module

- **Carve out:** the browser file work (save a JSON file, pick a JSON file) that `src/screens/SettingsScreen.jsx` writes out twice for backup and twice for programs, and the screen's five sections (phase, alerts, appearance, data backup, programs).
- **New modules:** a new src/platform/files.js and a new folder src/screens/settings/ with one component per section.
- **API:**

```ts
// src/platform/files.js (new)
export function saveJsonFile(fileName: string, data: unknown): Promise<'saved' | 'cancelled'>;
export function pickJsonFile(): Promise<{ fileName: string; data: unknown } | { fileName: string; error: 'not-json' | 'unreadable' } | null>;

// src/screens/settings/ (new): each section takes the settings and one updater
type SectionProps = { settings: Settings; onChange: (key: keyof Settings, value: unknown) => Promise<void> };
export function PhaseSection(props: SectionProps): JSX.Element;
export function AlertsSection(props: SectionProps): JSX.Element;
export function AppearanceSection(props: SectionProps & { onDarkModeChange: (mode: 'system' | 'light' | 'dark') => void }): JSX.Element;
export function BackupSection(): JSX.Element;
export function ProgramsSection(): JSX.Element;
```

- **Files touched:** `src/screens/SettingsScreen.jsx` (shrinks to under 150 lines of composition), plus the new files above. Nothing else imports `SettingsScreen`, except `src/App.jsx`'s route, which does not change.
- **Frees:** with sections in separate files, "add an alert option", "change backup" and "add a program action" stop colliding. This is the most-collided file (18 commits).
- **Risk:** low to medium. The behaviour is UI-only and there is no test for the screen today, so the story adds a render test per section first. The Android file picker path (`showSaveFilePicker` and the download fallback) must keep working: the story's check is to export and import on both.
- **Size:** does not fit one story. Two stories: (a) src/platform/files.js replacing the four copies; (b) the section split. (a) first, then (b).

### R2. The timer screen's alerts and session saving leave the screen

- **Carve out:** (1) the repeated "play a tone, vibrate, notify, maybe start the system timer" blocks, and (2) the session bookkeeping (how many sets are already done today, the background save when the page hides, saving or updating the log, the back-button guard).
- **New modules:** a new src/alerts/index.js and a new src/hooks/useExerciseSession.js.
- **API:**

```ts
// src/alerts/index.js (new)
type AlertEvent = 'holdComplete' | 'halfway' | 'restComplete' | 'allComplete' | 'cue';
type AlertSettings = { timerSound: boolean; timerVibrate: boolean; timerNotification: boolean; systemTimer: boolean };
export interface Alerts {
  prime(): void;                                   // call from a user tap (audio unlock)
  fire(event: AlertEvent, detail?: { title?: string; body?: string; restSeconds?: number }): void;
}
export function createAlerts(settings: AlertSettings): Alerts;

// src/hooks/useExerciseSession.js (new)
export function useExerciseSession(exercise: Exercise, programId: string | null): {
  setsAlreadyDone: number;
  begin(): void;
  recordProgress(setsCompleted: number, extra: { painLevel?: number; notes?: string }): Promise<void>;
  discard(): Promise<void>;
};
```

- **Files touched:** `src/screens/ExerciseTimerScreen.jsx` (shrinks toward 300 lines), the two new files, and `src/utils/audio.js`, `src/utils/systemTimer.js` and `src/hooks/useNotification.js` are then called from src/alerts/index.js instead of from the screen.
- **Frees:** the second most-collided file (17 commits). A story that adds a new alert (a new tone, a spoken cue) edits src/alerts/index.js and does not touch the screen; a story that changes how logs are saved edits the session hook.
- **Risk:** medium. `src/screens/ExerciseTimerScreen.jsx` relies on ref-based callbacks so the visibility handler sees current state; moving the save logic must keep those refs. No test covers the screen today, so the first commit of the story adds tests for `createAlerts` (fake settings, spy on the audio functions and `navigator.vibrate`).
- **Size:** does not fit one story. Two stories: (a) `createAlerts` (replaces the seven `navigator.vibrate` call sites and the repeated blocks); (b) `useExerciseSession`.

### R3. Storage splits per store behind the same entry file

- **Carve out:** the five stores and the backup code from `src/db/index.js`.
- **New modules:** new files under `src/db/`: a connection file, one repository file per store, and a backup file. `src/db/index.js` stays and only re-exports, so no screen's import changes.
- **API:**

```ts
// src/db/connection.js (new)
export function getDB(): Promise<IDBPDatabase>;      // owns DB_NAME, DB_VERSION and the upgrade steps

// src/db/logs.js (new)
export interface WorkoutLog { id: string; date: string; exerciseId: string; setsCompleted: number; timestamp: number; startTime: number; endTime: number; source: 'timer' | 'manual'; programId: string | null; painLevel?: number; notes?: string }
export function logWorkout(log: Partial<WorkoutLog> & Pick<WorkoutLog, 'date' | 'exerciseId'>): Promise<WorkoutLog>;
export function getLogsForDate(date: string): Promise<WorkoutLog[]>;
export function getLogsInRange(start: string, end: string): Promise<WorkoutLog[]>;
// ...the rest of the existing log functions, same names

// src/db/backup.js (new)
export function exportAllData(): Promise<BackupFile>;
export function validateImportData(data: unknown): { valid: true } | { valid: false; reason: string };
export function migrateImportData(data: BackupFile): BackupFile;
export function importData(data: BackupFile): Promise<void>;
export function clearAllData(): Promise<void>;
```

- **Files touched:** `src/db/index.js` (becomes a barrel), the new files, and `src/db/__tests__/migration.test.js` (import path only). No screen changes.
- **Frees:** a story that adds a backup field and a story that adds a log field no longer meet in the 528-line file (13 commits). Because the barrel keeps every name, it can run at the same time as R1 and R2.
- **Risk:** low. Pure moves behind a barrel; `src/db/__tests__/migration.test.js` covers `migrateImportData` and `validateImportData`. Check by hand that opening the database on an existing phone still works, since `DB_VERSION` and the upgrade steps must not change.
- **Size:** fits one story.

### R4. Screens read settings through one hook, not through the database

- **Carve out:** the "load settings, backfill the phase start date, save one key" code that Home, Timer, Progress, Settings and Phase Rules each repeat on their own.
- **New module:** a new src/settings/useSettings.js, with `backfillPhaseStartDate` kept in storage.
- **API:**

```ts
// src/settings/useSettings.js (new)
export interface Settings { currentPhase: number; phaseStartDate: string | null; timerSound: boolean; timerVibrate: boolean; timerNotification: boolean; darkMode: 'system' | 'light' | 'dark'; restTimerAutoStart: boolean; systemTimer: boolean; activeProgramId: string | null; exerciseOrder: string[] }
export function useSettings(): { settings: Settings | null; loading: boolean; update<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> };
```

- **Files touched:** `src/screens/HomeScreen.jsx`, `src/screens/ExerciseTimerScreen.jsx`, `src/screens/ProgressScreen.jsx`, `src/screens/SettingsScreen.jsx`, `src/screens/PhaseRulesScreen.jsx`, `src/App.jsx`, and `src/screens/__tests__/HomeScreen.test.jsx` (the mock changes from `../../db` to the hook).
- **Frees:** lets a screen be tested without a database, and gives the "one settings store" the rule asks for. It touches six screens, so it must run after R1 and R2 have landed, which is why it ranks fourth.
- **Risk:** medium: a shared hook means every screen sees one copy of the settings, which is a behaviour change if two screens relied on reading them fresh on mount. The story's check is the Settings round trip (change a toggle, open the timer, see it applied).
- **Size:** fits one story, if R1 and R2 are already merged.

### R5. Progress maths leaves ProgressScreen

- **Carve out:** the streak loop, the weekly counts, the per-exercise completion rates and the SVG bar chart in `src/screens/ProgressScreen.jsx`.
- **New modules:** a new src/progress/stats.js (pure) and a new src/components/WeeklyChart.jsx.
- **API:**

```ts
// src/progress/stats.js (new)
export function computeStreak(logs: WorkoutLog[], todayStr: string): number;
export function weeklyCompletion(logs: WorkoutLog[], exercises: Exercise[], weekDates: string[]): { date: string; day: string; exercisesCompleted: number }[];
export function exerciseCompletionRates(logs: WorkoutLog[], exercises: Exercise[], endDate: string, days: number): { id: string; name: string; pct: number }[];

// src/components/WeeklyChart.jsx (new)
export default function WeeklyChart(props: { data: { day: string; exercisesCompleted: number }[]; height?: number }): JSX.Element;
```

- **Files touched:** `src/screens/ProgressScreen.jsx` (405 lines to about 200), the new files, new tests.
- **Frees:** the third-most-collided screen (8 commits) and puts the numbers under unit tests; today none of the streak or rate maths has one.
- **Risk:** low. Pure functions lifted as they are; write each test from the screen's current output first.
- **Size:** fits one story.

### R6. Program persistence leaves the React context

- **Carve out:** load, save, switch and remove of programs, and the `timerType` normalising, from `src/config/ProgramContext.jsx`.
- **New module:** a new src/config/programStore.js with no React in it; the provider keeps only state.
- **API:**

```ts
// src/config/programStore.js (new)
export function loadActiveProgram(): Promise<Program>;                      // saved or bundled default, validated and normalised
export function activateProgram(next: Program): Promise<{ success: true; program: Program } | { success: false; errors: string[] }>;
export function activateProgramById(id: string | null): Promise<{ success: true; program: Program } | { success: false; errors: string[] }>;
export function removeProgram(id: string): Promise<void>;
export function listPrograms(): Promise<{ id: string; name: string; builtIn: boolean }[]>;
```

- **Files touched:** `src/config/ProgramContext.jsx` (194 lines to about 80), the new file, a new test.
- **Frees:** story work on program switching and story work on program rendering can proceed apart; the module is testable without React. The file has 4 commits, so the gain is smaller than R1 to R5.
- **Risk:** low.
- **Size:** fits one story.

### R7. Dates and display language come from settings, and dead files go

- **Carve out:** the constant `'en-US'` in date display, the second copy of "today as an ISO string" inside `backfillPhaseStartDate`, and the unused `src/data/` folder.
- **New module:** a new src/i18n/format.js; `src/utils/dateUtils.js` keeps the date arithmetic.
- **API:**

```ts
// src/i18n/format.js (new)
export interface Formatter { date(iso: string): string; time(timestamp: number): string; weekday(iso: string): string }
export function createFormatter(locale?: string): Formatter;   // default: the device's locale
```

- **Files touched:** `src/utils/dateUtils.js`, `src/screens/HistoryScreen.jsx` (its `formatTime`), `src/db/index.js` (use `today()`), and deletion of `src/data/exercises.js` and `src/data/phases.js`.
- **Frees:** little parallel work today; it removes the corner a second language would paint the app into, and frees the `src/data/` folder name for repositories if R3 grows that way.
- **Risk:** low. Deleting the two data files needs a `grep` showing no importer (done for this map; repeat it in the story).
- **Size:** fits one story.

### R8. Phase readiness takes its dates from the date helpers

- **Carve out:** the private `daysDiff` and `subtractDays` in `src/utils/phaseReadiness.js` that repeat `src/utils/dateUtils.js`.
- **New module:** none; `src/utils/dateUtils.js` gains `addDays(iso, n)` and `daysBetween` (already there) is used.
- **API:**

```ts
// src/utils/dateUtils.js
export function addDays(iso: string, n: number): string;
```

- **Files touched:** `src/utils/phaseReadiness.js`, `src/utils/dateUtils.js`, a test.
- **Frees:** nothing in parallel; it is a one-copy cleanup. Listed last because it is small, and because it should land together with or after R7 (same date file).
- **Risk:** low.
- **Size:** fits one story.

Suggested order for the Mayor: R3, R1a and R2a together (disjoint files), then R1b and R2b, then R4, with R5, R6, R7 and R8 filling any free lane.

## Rule breaks

Where a module breaks the Modular Boundaries rule or the library rule.

- **Screens call storage directly.** All nine screens import from `src/db/index.js` (for example `src/screens/HomeScreen.jsx` imports `getLogsForDate`, `addManualLog`, `decrementLatestLog`). The rule says screens talk to interfaces, repositories behind a seam. Fix: R3 gives the seam; R4 gives the settings hook.
- **Screens call browser and device APIs directly.** `src/screens/ExerciseTimerScreen.jsx` calls `navigator.vibrate` at 7 sites and `window.history.pushState` for the back guard; `src/screens/SettingsScreen.jsx` calls `Notification.requestPermission`, `window.showSaveFilePicker`, `URL.createObjectURL` and `document.createElement('input')` for file pickers. These are the "vendor in the screen" case: none can be swapped or tested. Fix: R1 (files) and R2 (alerts). Note `src/hooks/useNotification.js` already wraps `Notification`, but the settings screen does not use it.
- **A constant language.** `src/utils/dateUtils.js` formats with the literal `"en-US"` (in `formatDate` and `dayOfWeek`) and `src/screens/HistoryScreen.jsx` does the same in `formatTime`. The program JSON holds all exercise text, which is good, but the labels in screens ("Settings", "Progress", "Pain Level") are literals. Fix: R7 for dates; screen labels are a larger story not proposed here.
- **Duplicate code inside the app.** The file save and file pick code is written four times in `src/screens/SettingsScreen.jsx` (backup export at about line 117, program export at about line 622, backup import at about line 148, program import at about line 575). The "play, vibrate, notify" block is repeated in `src/screens/ExerciseTimerScreen.jsx`. `src/db/index.js` builds today's date by hand in `backfillPhaseStartDate`, and `src/utils/phaseReadiness.js` has its own date arithmetic. Fix: R1, R2, R7, R8.
- **Dead duplicate data.** `src/data/exercises.js` and `src/data/phases.js` are not imported anywhere and repeat what `src/config/defaultProgram.json` holds. They mislead a reader looking for where the exercises live. Fix: R7.
- **Build trap.** `src/screens/SettingsScreen.jsx` (line 259) and `src/screens/AssessmentScreen.jsx` (line 157) build a Tailwind class as `grid-cols-${n}`. Tailwind only emits classes it can read whole in the source. Checked in the base build's CSS: `.grid-cols-3` is there (a literal exists at `src/screens/SettingsScreen.jsx` line 396) and `.grid-cols-1` and `.grid-cols-2` are not, so a program with one or two phases, or an assessment field with one or two options, gets no grid. The bundled program has three phases, so nobody sees it today. Fix: a small lookup of whole class names; a story of its own, not in R1 to R8.
- **bsv-kit.** This app uses nothing from bsv-kit (no keys, licence or grist), so no copy of bsv-kit code was found. The copies that exist are of other things, below.

## Library candidates

Code another app could use, or already copies. Each names the library it belongs in. bsv-kit today holds `packages/bsv`, `packages/grist`, `packages/tips` and `packages/composer`; none of them is a device or file helper, and a wake lock does not belong beside a key vault, so these go to a new public library, proposed name `pwa-kit` (a new repo under Jonathan-A-White; the name has not been checked for clashes). Public libraries hold nothing personal: nothing here carries a key, a name or an address. Versioning for all of them, from the library guide: start at 0.1.0, tag each release, keep the tag equal to the `package.json` version, a CHANGELOG with "breaking" first, apps pin the full commit SHA until a tag exists, and a removed or changed export or option is a breaking change (a minor bump while the library is 0.x).

### files: save and pick a JSON file

- **Library:** new `pwa-kit`, package `@pwa-kit/files`.
- **Evidence:** the save-to-file code exists in this app twice (`src/screens/SettingsScreen.jsx`), in trade-tracker:src/services/export-service.ts (`downloadAsFile`) and in myshape:src/services/exportService.ts (`triggerDownload`). That is four copies in three apps; this is the clearest case.
- **API:**

```ts
export function saveFile(fileName: string, content: string | Blob, mimeType?: string): Promise<'saved' | 'cancelled'>; // File System Access picker when present, download link otherwise
export function pickFile(accept?: string): Promise<File | null>;
```

- **Versioning:** 0.1.0 with these two functions. Adding an optional argument is a patch or minor; renaming `'saved' | 'cancelled'` or changing the return of `pickFile` is breaking. Test with the browser APIs faked, plus one smoke test from an app.
- **Source to lift from:** `src/screens/SettingsScreen.jsx` (the export handler with `showSaveFilePicker`, which is the most complete of the copies).

### wake-lock: keep the screen on

- **Library:** new `pwa-kit`, package `@pwa-kit/wake-lock`.
- **Evidence:** `src/hooks/useWakeLock.js` here, and lampas:src/speech/wakeLock.ts (39 lines): two apps, two independent implementations of the same re-acquire-on-visible logic.
- **API:**

```ts
export function keepAwake(): void;               // wanted = true; acquire now and again whenever the page becomes visible
export function letSleep(): void;                // wanted = false; release
export function isKeepingAwake(): boolean;
// React binding in a second entry point, so non-React apps do not pull in React:
export function useWakeLock(): { isActive: boolean; request(): Promise<void>; release(): Promise<void> };
```

- **Versioning:** 0.1.0; the React binding lives at `@pwa-kit/wake-lock/react`. Both apps move onto it in one story each, deleting their copy in the same story.
- **Source to lift from:** lampas:src/speech/wakeLock.ts for the core (it handles the "lock arrived after the caller gave up" race) and `src/hooks/useWakeLock.js` for the hook shape.

### alerts: tones, vibration, notification, behind one call

- **Library:** new `pwa-kit`, package `@pwa-kit/alerts`.
- **Evidence:** only this app has it today (a web-audio tone player in `src/utils/audio.js`, `src/hooks/useNotification.js`, vibration inline), so this is not yet a second copy. It is plainly shareable (any timer, reminder or reading app wants a tone and a buzz) and it is cheaper to lift now, while R2 is rewriting the call sites. Do it after R2(a) so the module that is lifted is the clean one.
- **API:**

```ts
export type Cue = 'start' | 'warning' | 'complete' | 'switch' | 'restComplete';
export interface AlertChannels { sound: boolean; vibrate: boolean; notify: boolean }
export function createAlerts(channels: AlertChannels, patterns?: Partial<Record<Cue, { tone?: number[]; vibrate?: number | number[] }>>): {
  prime(): void;
  fire(cue: Cue, message?: { title: string; body: string }): void;
};
```

- **Versioning:** 0.x while the cue list settles; adding a cue is a minor bump, renaming or removing one is breaking. Test with a fake `AudioContext`, `navigator.vibrate` and `Notification`.
- **Source to lift from:** `src/utils/audio.js` (tone shapes), `src/hooks/useNotification.js`.

### countdown: drift-free hold, rest and set timer

- **Library:** new `pwa-kit`, package `@pwa-kit/countdown`.
- **Evidence:** only this app (`src/hooks/useTimer.js`, 254 lines), and it has no React-free core. Plainly shareable to any interval or workout app; keep it in the app until a second app wants it unless R2 finishes first and the Mayor wants it lifted early.
- **API:**

```ts
export type Phase = 'idle' | 'holding' | 'resting' | 'done';
export interface CountdownOptions { holdSeconds: number; restSeconds: number; totalSets: number; autoStartRest?: boolean }
export function createCountdown(options: CountdownOptions, events: { onHoldComplete?(): void; onRestComplete?(): void; onAllComplete?(): void }): {
  start(): void; pause(): void; resume(): void; skipToNextSet(): void; reset(): void;
  subscribe(listener: (s: { state: Phase; msRemaining: number; currentSet: number; paused: boolean }) => void): () => void;
};
```

- **Versioning:** 0.1.0; the state names and the callback names are the contract, so changing either is breaking. The unit tests (fake timers) lift with it.
- **Source to lift from:** `src/hooks/useTimer.js` (the rAF logic); the React hook becomes a thin wrapper over `createCountdown`.

### backup: versioned export, validate, migrate, import for a local database

- **Library:** new `pwa-kit`, package `@pwa-kit/backup`.
- **Evidence:** this app has it for IndexedDB via `idb` (`src/db/index.js`: `exportAllData`, `validateImportData`, `migrateImportData`, `importData`); trade-tracker has `exportAllData` in trade-tracker:src/services/export-service.ts and myshape has `exportAll` in myshape:src/services/exportService.ts. They differ in storage (idb here, other wrappers there), so the shared part is the envelope and the migration chain, not the database calls. This is the hardest lift and the least urgent.
- **API:**

```ts
export interface BackupEnvelope<T> { version: number; exportedAt: string; data: T }
export function createBackupFormat<T>(current: number, migrations: Record<number, (old: any) => any>): {
  wrap(data: T): BackupEnvelope<T>;
  validate(input: unknown): { valid: true } | { valid: false; reason: string };   // rejects a newer version
  migrate(input: BackupEnvelope<any>): BackupEnvelope<T>;
};
```

- **Versioning:** the wire format is the contract: a change to the envelope shape is breaking and needs the keep-both-formats window from the library guide's wire-format rule. 0.1.0; call out any envelope change first in the CHANGELOG.
- **Source to lift from:** `src/db/index.js` (`validateImportData`, `migrateImportData`), once R3 has put them in a file of their own.

Not proposed for a library: `src/utils/phaseReadiness.js`, `src/utils/exerciseOrder.js`, `src/config/schema.js` and the screens. They are rehab-program logic with one user; the second-copy rule says to wait.
