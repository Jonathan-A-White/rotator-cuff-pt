# Creating a PT Program Configuration

This guide explains how to create a JSON configuration file for the PT Tracker app. The app is a general-purpose physical therapy tracker that loads exercise programs, phases, assessments, and progression rules from a single JSON file.

## Quick Start

1. Create a `.json` file following the schema below
2. In the app, go to **Settings > Program Management > Import Program**
3. Select your JSON file — the app validates it and switches immediately

## File Structure Overview

```json
{
  "id": "your-program-id",
  "name": "Program Display Name",
  "description": "...",
  "version": "1.0.0",
  "author": "...",
  "bodyRegion": "...",
  "condition": "...",
  "categories": [],
  "phases": [],
  "exercises": [],
  "assessmentSections": [],
  "assessmentSummaryFields": [],
  "progressionRules": {}
}
```

## Required Fields

The validator requires these four top-level fields. Everything else is optional but strongly recommended.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier (e.g. `"acl-rehab-v1"`). Used internally to scope workout history. Use kebab-case. |
| `name` | string | Yes | Display name shown in the app header and Settings. |
| `phases` | array | Yes | At least one phase. |
| `exercises` | array | Yes | At least one exercise. |
| `description` | string | No | Short description of the program and injury context. |
| `version` | string | No | Semver version for your own tracking. |
| `author` | string | No | Creator name. |
| `bodyRegion` | string | No | E.g. `"shoulder"`, `"knee"`, `"ankle"`. |
| `condition` | string | No | E.g. `"ACL reconstruction"`, `"Rotator cuff tendinopathy"`. |

## Categories

Categories define exercise types. Each gets a colored pill in the UI.

```json
"categories": [
  {
    "id": "isometric",
    "label": "Isometric",
    "colorClass": "bg-teal/10 text-teal dark:bg-teal/20 dark:text-teal-light"
  },
  {
    "id": "isotonic",
    "label": "Isotonic",
    "colorClass": "bg-amber/10 text-amber dark:bg-amber/20"
  }
]
```

**`colorClass`** uses Tailwind CSS utility classes. The app has these colors available:
- **Teal** (primary): `bg-teal/10 text-teal dark:bg-teal/20 dark:text-teal-light`
- **Amber** (secondary): `bg-amber/10 text-amber dark:bg-amber/20`
- **Blue**: `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`
- **Purple**: `bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`
- **Green**: `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`
- **Red**: `bg-red/10 text-red dark:bg-red/20`

If you omit `categories`, the app falls back to built-in defaults for `isometric`, `isotonic`, `mobility`, and `functional`.

## Phases

Phases define the rehabilitation stages. The app is cumulative — Phase 2 shows Phase 1 + Phase 2 exercises, Phase 3 shows all three, etc.

```json
"phases": [
  {
    "id": 1,
    "name": "Acute / Protected Loading",
    "weeks": "1–4",
    "rules": [
      "No open-chain knee extension",
      "Weight bearing as tolerated with crutches",
      "Ice after exercises (15 min)"
    ],
    "checklists": []
  },
  {
    "id": 2,
    "name": "Strengthening",
    "weeks": "5–12",
    "rules": [
      "Continue Phase 1 exercises as warm-up",
      "Progress resistance only after 2 pain-free sessions"
    ],
    "checklists": []
  },
  {
    "id": 3,
    "name": "Return to Sport",
    "weeks": "13–24+",
    "rules": [
      "All Phase 2 exercises as maintenance",
      "Sport-specific drills only when all criteria met"
    ],
    "checklists": [
      { "id": "single_leg_squat", "label": "Single-leg squat with good form, no pain" },
      { "id": "hop_test_90pct", "label": "Single-leg hop test ≥90% of uninvolved side" }
    ]
  }
]
```

### Phase fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | number | Yes | Phase identifier. Must be unique. Exercises reference this. |
| `name` | string | Yes | Display name (e.g. "Acute / Protected Loading"). |
| `weeks` | string | No | Display string for the week range (e.g. "1–4"). |
| `rules` | array of strings | No | Safety rules / guidelines displayed on the Phase Rules screen. |
| `checklists` | array of objects | No | Milestone checklist items. Each has `id` (string) and `label` (string). If any phase has checklists, the app shows a "Milestone Checklist" screen. |

### Design guidance for phases

- Most rehab programs have 3–4 phases. The app supports any number.
- Phase `id` values should be sequential integers starting at 1.
- Rules should be actionable restrictions or reminders the patient sees daily.
- Checklists are typically on the final phase — they represent "ready to progress beyond rehab" criteria.

## Exercises

Exercises are the core of the program. Each exercise belongs to exactly one phase.

```json
"exercises": [
  {
    "id": "p1_quad_sets",
    "name": "Quad Sets",
    "shortName": "Quad Sets",
    "phase": 1,
    "category": "isometric",
    "timerType": "isometric",
    "sets": 3,
    "holdSeconds": 10,
    "restSeconds": 30,
    "frequency": "3x daily",
    "description": "Sit with leg extended. Tighten quadriceps, pushing knee down into surface. Hold 10 seconds.",
    "cues": [
      "Leg fully extended",
      "Push knee into surface",
      "Tighten quad — you should see the muscle contract",
      "Hold 10 seconds, relax"
    ],
    "emoji": "🦵",
    "effortGuidance": "Firm contraction, not maximal",
    "painThreshold": "Pain must stay ≤ 2/10",
    "sortOrder": 1,
    "videoUrl": "https://www.youtube.com/watch?v=example",
    "videoReferences": [
      {
        "label": "PT demo — Quad Sets after ACL surgery",
        "url": "https://www.youtube.com/watch?v=example"
      }
    ]
  }
]
```

### Exercise fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier. Convention: `p{phase}_{snake_case_name}`. |
| `name` | string | Yes | Full display name. |
| `shortName` | string | No | Abbreviated name for compact views. Falls back to `name`. |
| `phase` | number | Yes | Must match a phase `id`. Determines when the exercise appears. |
| `category` | string | No | Must match a category `id` (e.g. `"isometric"`). Controls the colored pill. |
| `timerType` | string | Yes | **One of: `"isometric"`, `"rep_based"`, `"hybrid"`**. Determines the timer UI. See below. |
| `sets` | number | Yes | Number of sets (minimum 1). |
| `reps` | number | Conditional | Required for `rep_based` and `hybrid`. Number of reps per set. |
| `holdSeconds` | number | Conditional | Required for `isometric` and `hybrid`. Hold duration in seconds. |
| `restSeconds` | number | No | Rest time between sets in seconds. Defaults to 60 if omitted. |
| `frequency` | string | No | Display string (e.g. `"daily, 1-2x"`, `"3x daily"`). |
| `description` | string | No | Full exercise instructions. Displayed on the detail screen. |
| `cues` | array of strings | No | Quick coaching cues shown during the exercise as a collapsible list. |
| `emoji` | string | No | Single emoji displayed as the exercise icon. |
| `effortGuidance` | string | No | Displayed as a teal badge (e.g. `"20-30% effort"`). |
| `painThreshold` | string | No | Displayed as a red badge (e.g. `"Pain must stay ≤ 2/10"`). |
| `sortOrder` | number | No | Controls display order. Exercises without `sortOrder` appear after those that have it. |
| `halfwayCue` | string | No | If set, triggers a buzz/alert at the halfway point of an isometric hold with this message (e.g. `"Switch direction"`). |
| `videoUrl` | string | No | Primary video link. Opens from the "Watch Video" button on the timer screen. |
| `videoReferences` | array | No | Additional labeled video links shown on the detail screen. Each has `label` (string) and `url` (string). |

### Timer types explained

| `timerType` | Required fields | UI behavior |
|---|---|---|
| `"isometric"` | `holdSeconds` | Countdown timer for hold → rest → next set. Large circular timer. |
| `"rep_based"` | `reps` | Shows rep count. User taps "Complete Set" when done → rest → next set. |
| `"hybrid"` | `reps` + `holdSeconds` | Shows countdown timer AND rep count. For exercises like "10 reps, hold each 10 seconds". |

### Exercise design guidance

- **ID convention**: Use `p{phase_number}_{descriptive_name}` (e.g. `p1_quad_sets`, `p2_band_er`). IDs are stored in workout history, so once a program is in use, changing IDs will orphan historical data.
- **Cues**: Keep to 3–5 bullet points. These are visible during the exercise, so brevity matters.
- **Sort order**: Assign sequential values (1, 2, 3...) to control the exact display order. Exercises within the same phase appear grouped.
- **Emoji**: Pick a single emoji that visually represents the exercise. It appears on the home screen exercise cards.
- **Videos**: `videoUrl` is the single "Watch Video" button during the exercise. `videoReferences` are multiple labeled links on the detail screen for more context. YouTube search URLs work well as general references: `https://www.youtube.com/results?search_query=your+search+terms`.

## Assessment Sections

Assessment sections define the biweekly self-assessment form. The app renders each section as a card. Fields within a section are grouped visually.

```json
"assessmentSections": [
  {
    "id": "kneeFlexion",
    "fields": [
      {
        "id": "kneeFlexionROM",
        "label": "Knee Flexion ROM",
        "type": "pain_scale",
        "isPainMetric": true
      },
      {
        "id": "kneeFlexionDegrees",
        "label": "Flexion Degrees",
        "type": "number",
        "min": 0,
        "max": 180,
        "placeholder": "e.g. 120"
      }
    ]
  },
  {
    "id": "swelling",
    "fields": [
      {
        "id": "swellingLevel",
        "label": "Swelling",
        "type": "select",
        "options": ["None", "Mild", "Moderate", "Severe"],
        "defaultValue": "None"
      }
    ]
  },
  {
    "id": "functionalTest",
    "collapsible": true,
    "defaultExpanded": false,
    "collapseLabel": "Functional Tests (optional)",
    "fields": [
      {
        "id": "singleLegBalance",
        "label": "Single-Leg Balance (seconds)",
        "type": "number",
        "min": 0,
        "placeholder": "e.g. 30"
      }
    ]
  },
  {
    "id": "notes",
    "fields": [
      {
        "id": "notes",
        "label": "Notes",
        "type": "text",
        "placeholder": "Any observations, triggers, changes..."
      }
    ]
  }
]
```

### Field types

| `type` | Renders | Config |
|---|---|---|
| `"pain_scale"` | 0–10 slider | Set `"isPainMetric": true` if this field should count toward phase progression pain calculations. |
| `"number"` | Numeric input | Optional: `min`, `max`, `placeholder`. |
| `"select"` | Button group | Required: `options` (array of strings). Optional: `defaultValue`. |
| `"text"` | Textarea | Optional: `placeholder`. |

### Section options

| Field | Type | Description |
|---|---|---|
| `collapsible` | boolean | If `true`, the section starts collapsed with a toggle button. Use for optional assessments. |
| `defaultExpanded` | boolean | If `collapsible`, whether to start expanded. Default: `false`. |
| `collapseLabel` | string | Label shown on the collapse toggle (e.g. `"Functional Tests (optional)"`). |

### Assessment summary fields

These control which metrics appear in the assessment history list (the collapsed view of past assessments):

```json
"assessmentSummaryFields": [
  { "key": "kneeFlexionROM", "label": "Knee Flexion" },
  { "key": "averageDailyPain", "label": "Avg Daily Pain" }
]
```

Each `key` must match a field `id` from `assessmentSections`. Keep this list to 3–8 fields for readability.

### Assessment design guidance

- Always include an `"averageDailyPain"` field with `"isPainMetric": true` — this is the single most useful metric for progression decisions.
- Always include a `"notes"` text field as the last section.
- Mark all pain/discomfort sliders as `"isPainMetric": true`. These are averaged for phase progression calculations.
- Use `"select"` for categorical assessments (swelling level, sleep quality, function rating).
- Use collapsible sections for phase-specific tests the patient may not perform every session.

## Progression Rules

These control the automated "Phase Readiness" evaluation that tells the patient when they may be ready to advance.

```json
"progressionRules": {
  "minDaysInPhase": {
    "1": 14,
    "2": 28
  },
  "minConsistencyPct": 70,
  "evalWindowDays": 14,
  "maxAvgPain": 2,
  "minAssessments": 2,
  "maxSinglePain": 3
}
```

| Field | Type | Description |
|---|---|---|
| `minDaysInPhase` | object | Minimum days required in each phase before progression is considered. Keys are phase `id` as strings. If a phase isn't listed, defaults to 14 days. The **last phase** doesn't need an entry (there's nothing to progress to). |
| `minConsistencyPct` | number | What percentage of days in the evaluation window must have all exercises completed (0–100). |
| `evalWindowDays` | number | How many recent days to evaluate for consistency and pain. |
| `maxAvgPain` | number | Maximum average pain score (across all `isPainMetric` fields) to be "ready". |
| `minAssessments` | number | Minimum number of assessments required within the evaluation window. |
| `maxSinglePain` | number | Maximum pain score on any single `isPainMetric` field. Even if the average is low, one high score blocks progression. |

### Progression design guidance

- **Conservative defaults are safer.** The patient can always manually advance in Settings.
- `minDaysInPhase` should reflect the biological healing timeline for the specific tissue (e.g. 6 weeks for tendon, 12 weeks for ligament graft).
- `minConsistencyPct` of 70 means "5 out of 7 days" — reasonable for most outpatient programs.
- `maxAvgPain` of 2 and `maxSinglePain` of 3 are evidence-based thresholds for "acceptable" pain during rehab loading.

## Complete Minimal Example

The smallest valid program:

```json
{
  "id": "minimal-example",
  "name": "Minimal Program",
  "phases": [
    {
      "id": 1,
      "name": "Phase 1",
      "rules": ["Follow your PT's guidance"]
    }
  ],
  "exercises": [
    {
      "id": "ex1",
      "name": "Example Exercise",
      "phase": 1,
      "timerType": "rep_based",
      "sets": 3,
      "reps": 10,
      "emoji": "💪",
      "cues": ["Cue 1", "Cue 2"]
    }
  ]
}
```

## Validation

The app validates your JSON on import. Common errors:

- **"Missing required field"** — You're missing `id`, `name`, `phases`, or `exercises`.
- **"Duplicate id"** — Two exercises or phases share the same `id`.
- **"Invalid timerType"** — Must be exactly `"isometric"`, `"rep_based"`, or `"hybrid"`.
- **"select type requires non-empty options array"** — A `"select"` field is missing its `options` list.

If validation fails, the app shows the specific error. Fix it in your JSON and re-import.

## Tips for Building a New Program

1. **Start with the injury profile.** What tissues are involved? What movements are restricted? This determines your phases and rules.
2. **Design phases around tissue healing timelines.** Tendons (6–12 weeks), ligaments (12–24 weeks), bone (6–12 weeks), muscle (4–8 weeks).
3. **Pick 3–6 exercises per phase.** More than that and compliance drops.
4. **Use isometric exercises for early phases** (safer, less joint stress) and progress to isotonic/functional.
5. **Write cues like you're coaching the patient in the room.** Short, specific, body-part-focused.
6. **Include video references.** YouTube search URLs are fine — they stay current as new demos are uploaded.
7. **Set conservative progression rules.** The patient can always override in Settings.
8. **Test your JSON** by importing it in the app and clicking through every exercise and assessment.

## Reference

For a complete real-world example, see the built-in default program at:
`src/config/defaultProgram.json`

This contains 14 exercises across 3 phases, full assessment sections, progression rules, video references, and checklists — everything described in this guide.
