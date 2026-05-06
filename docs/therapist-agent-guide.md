# Therapist Agent Guide — Converting a HEP into Program JSON

This document is written for an **AI agent acting on behalf of a physical therapist**. The therapist exports a Home Exercise Program (HEP) — typically as a PDF from a tool like HEP2Go, Medbridge, PhysioTec, etc. — and the patient imports the program into the *Rotator Cuff PT Tracker* app. Your job is to transform the HEP into a valid program JSON file the patient can import.

The full schema is in [`creating-a-program.md`](./creating-a-program.md). **Read that file first.** This guide only covers the HEP-specific mapping rules and conventions on top of it.

## Workflow

1. The therapist gives you (or the patient forwards you) a HEP — usually a PDF, sometimes a screenshot or pasted text.
2. Extract every exercise plus its prescription (sets, reps, hold, frequency, cues).
3. Decide phasing (most HEPs are a single phase — see [Phasing](#phasing) below).
4. Emit a single JSON file that conforms to the schema in `creating-a-program.md`.
5. Hand the JSON file back to the patient with a one-line note on what it contains.
6. The patient opens the app → **Settings → Program Management → Import Program** and selects the file.

The app validates on import. If there are errors, fix and re-emit — do not ask the patient to edit JSON by hand.

## HEP → JSON Field Mapping

Most HEP exports follow the same rough format. Map fields like this:

| HEP text | JSON field | Notes |
|---|---|---|
| Exercise title (e.g. "Dowel Shoulder Flexion") | `name` | Use the title verbatim. Title-case obvious typos (e.g. "quadruped" → "Quadruped"). |
| `Repeat N Times` | `reps` | Per set. |
| `Hold N Seconds` | `holdSeconds` | Per rep (for rep-based holds) or per set (for pure isometrics). |
| `Complete N Sets` | `sets` | Required, minimum 1. |
| `Perform N Times a Day` | `frequency` | Free-text string, e.g. `"20x daily"`, `"2-3x daily"`, `"1x daily"`. |
| First paragraph of instructions ("Starting Position" + "Movement") | `description` | Concatenate into one block. Preserve the therapist's wording. |
| Key instruction phrases | `cues` | 3–5 short bullets. See [Writing cues](#writing-cues). |
| "Created by {Therapist Name} {Date}" | `author` (top-level) | Include date in `description` of the program if useful. |
| HEP code or URL (e.g. `H73RUCE`, `my-exercise-code.com`) | top-level `description` | Optional. Helps the patient find the original later. |

### Timer type inference

The schema requires `timerType` per exercise. Pick it from the HEP prescription:

| HEP says | `timerType` | Required fields |
|---|---|---|
| Reps only, no hold (e.g. "Repeat 10 Times") | `"rep_based"` | `reps`, `sets` |
| Hold only, no reps (e.g. "Hold 45 Seconds, 5 Sets") | `"isometric"` | `holdSeconds`, `sets` |
| Reps **and** a per-rep hold (e.g. "Repeat 20 Times, Hold 1 Second") | `"hybrid"` | `reps`, `holdSeconds`, `sets` |

If a hold is `1 second` or shorter and the prescription is clearly rep-driven (e.g. "20 reps, hold 1 sec"), still use `"hybrid"` — the patient gets a per-rep timer cue, which is exactly what the therapist wants.

### IDs and sortOrder

- `id` convention: `p{phase}_{snake_case_short_name}` — e.g. `p1_dowel_shoulder_flexion`, `p1_band_external_rotation`.
- IDs are used to scope workout history. Once a patient has been using a program, **do not change exercise IDs** in updates — add new ones, leave old ones in place.
- Set `sortOrder` to the order the exercises appear in the HEP (1, 2, 3, …). The therapist's ordering is intentional.

### Emoji selection

Pick a single emoji per exercise that hints at the body part or movement. Examples:

| Exercise type | Emoji |
|---|---|
| Shoulder flexion / overhead | 🙆 or 🙋 |
| Internal rotation / press | 🤜 |
| External rotation / band pull | 🤚 or 🟢 |
| Pendulums / circles | 🔄 |
| Scapular setting / squeeze | 🦋 |
| Breathing | 🫁 |
| Thoracic / spine rotation | 🌀 |
| Dead hang / pull-up | 🧗 |
| Generic mobility | 🧘 |

When in doubt, use 💪.

## Writing cues

The `cues` array is shown during the exercise on a small phone screen, often one-handed mid-rep. Rules:

- **3–5 cues max.** More than that and they scroll off-screen.
- **Short imperative phrases.** "Elbow tucked to side" — not "Make sure your elbow stays tucked to your side throughout the movement."
- **Pull from the therapist's wording.** If they wrote "drop the ribcage to engage the core (abdominal approximation)" the cue is `"Drop ribcage, engage core"` — preserve their voice.
- **Front-load form cues, end with effort/pain cues** if any.
- **Encode emphasis the therapist used in the HEP.** ALL CAPS phrases like `"OUT TO THE SIDE LIKE WE PRACTICED"` are deliberate and should appear as a cue, capitalization preserved.

If the description contains a specific effort percentage (e.g. "20-30% effort") or pain rule (e.g. "Pain must stay ≤ 2/10"), put those in `effortGuidance` and `painThreshold` respectively rather than burying them in `cues`.

## Phasing

Most weekly HEPs are **a single phase**. Default to one phase named after the rehab stage the therapist mentions, or simply "Current Program" if unspecified.

Use multiple phases only when the HEP itself clearly stages exercises (e.g. "Phase 1: Acute" / "Phase 2: Strengthening" sections). When you do, set `id` as sequential integers starting at 1 and assign each exercise to the phase the therapist put it in.

Always include at least one `rules` entry per phase — even if it's just `"Follow Ryan's guidance"` — so the Phase Rules screen isn't empty.

## Halfway cues

If an exercise involves switching directions or sides mid-hold (e.g. pendulums "1–2 minutes, both directions"), set `halfwayCue` to a short string like `"Switch direction"`. The app buzzes and shows that text at the halfway point.

## Unusual prescriptions

Real HEPs include things that don't fit cleanly. Handle them like this:

| Situation | Approach |
|---|---|
| Patterned breathing (e.g. box breathing 4-7-8-7) | Use `timerType: "rep_based"`, with `reps` = number of cycles, `sets` = 1, `holdSeconds` omitted. Put the timing in `description` and a 4-bullet `cues` list mirroring the inhale/hold/exhale/hold steps. |
| Duration-based (e.g. "1–2 minutes total") | `timerType: "isometric"`, `holdSeconds` set to the lower bound in seconds (e.g. 60), `sets: 1`. Note the upper bound in `description`. |
| Range like "Hold 30–45 seconds" | Use the lower bound for `holdSeconds`, document the range in `description` or `effortGuidance`. The patient can adjust per-set in the app. |
| Range like "12–15 reps" | Use the upper bound for `reps` so the rep counter aims high; document the lower bound in `cues`. |
| "As tolerated" / "until fatigue" | Use a sensible default (e.g. 10 reps or 30 seconds) and put the qualifier in `effortGuidance`. |
| Therapist annotation like "Different timing than photo" | Put it in `description` verbatim — it's important context the patient needs. |

## Output requirements

When you produce the JSON:

1. **Always include `id`, `name`, `version`, `author` at the top level.** `version` is for your tracking — start at `"1.0.0"` and bump on revisions. `author` should be the therapist's name from the HEP header.
2. **Set `bodyRegion` and `condition`** when known from context (e.g. `"shoulder"` / `"Rotator cuff tendinopathy"`).
3. **Emit one self-contained file.** No external references, no comments, valid JSON parseable by `JSON.parse`.
4. **Validate before returning.** Required top-level: `id`, `name`, `phases`, `exercises`. Each exercise needs `id`, `name`, `phase`, `sets`. `timerType` is required by the schema validator — always set it.
5. **Hand the file off with a one-paragraph summary**: program name, exercise count, what `timerType` mix you used, anything you had to interpret rather than copy verbatim.

## Worked example

This is the HEP the patient (Jonathan) actually received from Ryan White on May 5th, 2026 (HEP2Go code `H73RUCE`). Use it as a reference for tone, cue length, and how to handle the "different timing than photo" box breathing case.

**Input (paraphrased from the PDF):**

> **HOME EXERCISE PROGRAM** — Created by Ryan White May 5th, 2026 — view at my-exercise-code.com code H73RUCE
>
> 1. **Dowel Shoulder Flexion** — Standing upright. Hold a dowel in front with a wide, overhand grip. Slight posterior pelvic tilt. Drop ribcage to engage the core. Movement: raise the dowel overhead and behind using only shoulder motion. Controlled range, feel a stretch across chest and shoulders. Return and repeat. *Repeat 10 Times. Complete 1 Set. Perform 20 Times a Day.*
> 2. **Band External Rotation (90/90)** — Stand tall, band in hands, elbows bent to 90° pinned to sides. Pull band apart by rotating arms outward, squeezing shoulder blades down and back. Ribs tucked, no chest puff or back arch. Return slowly. *Repeat 20 Times. Hold 1 Second. Complete 1 Set. Perform 20 Times a Day.*
> 3. **Box Breathing** *(different timing than photo)* — Inhale 4 sec, hold 7 sec, exhale 8 sec, hold 7 sec. Repeat. If lightheaded, breathe normally.
> 4. **Quadruped Thoracic Rotation** — From crawl position, lower buttocks toward feet. Hand OUT TO THE SIDE LIKE WE PRACTICED, rotate body and head to the side, then return. *Repeat 10 Times. Hold 3 Seconds. Complete 2 Sets. Perform 1 Time a Day.*

**Output:**

```json
{
  "id": "white-hep-2026-05-05",
  "name": "Ryan White HEP — May 5, 2026",
  "version": "1.0.0",
  "author": "Ryan White, PT",
  "description": "Home exercise program issued 2026-05-05. Original HEP2Go code: H73RUCE.",
  "bodyRegion": "shoulder",
  "condition": "Rotator cuff rehab",
  "phases": [
    {
      "id": 1,
      "name": "Current Program",
      "weeks": "Ongoing",
      "rules": [
        "Follow Ryan's cues on form before adding intensity",
        "Stop if pain spikes above the threshold the therapist set in-clinic"
      ]
    }
  ],
  "exercises": [
    {
      "id": "p1_dowel_shoulder_flexion",
      "name": "Dowel Shoulder Flexion",
      "phase": 1,
      "category": "mobility",
      "timerType": "rep_based",
      "sets": 1,
      "reps": 10,
      "frequency": "20x daily",
      "description": "Standing upright. Hold a dowel in front with a wide, overhand grip. Perform a slight posterior pelvic tilt. Drop the ribcage to engage the core (abdominal approximation). Raise the dowel overhead and behind using only shoulder motion. Move through a controlled range, feeling a stretch across the chest and shoulders. Return to starting position and repeat for desired reps.",
      "cues": [
        "Wide overhand grip on dowel",
        "Posterior pelvic tilt",
        "Drop ribcage, engage core",
        "Raise overhead and behind — shoulder motion only",
        "Controlled range, feel chest/shoulder stretch"
      ],
      "emoji": "🙆",
      "sortOrder": 1
    },
    {
      "id": "p1_band_external_rotation_90_90",
      "name": "Band External Rotation (90/90)",
      "phase": 1,
      "category": "isotonic",
      "timerType": "hybrid",
      "sets": 1,
      "reps": 20,
      "holdSeconds": 1,
      "frequency": "20x daily",
      "description": "Stand tall holding a band with elbows bent to 90° and pinned to your sides. Pull the band apart by rotating your arms outward while squeezing your shoulder blades down and back. Keep your ribs tucked — don't puff your chest or arch your back. Return slowly.",
      "cues": [
        "Elbows bent 90°, pinned to sides",
        "Rotate arms outward against band",
        "Squeeze shoulder blades down + back",
        "Ribs tucked — no chest puff, no back arch",
        "Return slowly"
      ],
      "emoji": "🟢",
      "sortOrder": 2
    },
    {
      "id": "p1_box_breathing",
      "name": "Box Breathing (4-7-8-7)",
      "phase": 1,
      "category": "mobility",
      "timerType": "rep_based",
      "sets": 1,
      "reps": 4,
      "frequency": "As needed",
      "description": "Different timing than the diagram. Inhale 4 seconds, hold 7 seconds, exhale 8 seconds, hold 7 seconds. Repeat the cycle a few times to control your breathing and calm your body. If you begin to feel lightheaded, breathe normally.",
      "cues": [
        "Inhale 4 sec",
        "Hold 7 sec",
        "Exhale 8 sec",
        "Hold 7 sec",
        "Lightheaded? breathe normally"
      ],
      "emoji": "🫁",
      "sortOrder": 3
    },
    {
      "id": "p1_quadruped_thoracic_rotation",
      "name": "Quadruped Thoracic Rotation",
      "phase": 1,
      "category": "mobility",
      "timerType": "hybrid",
      "sets": 2,
      "reps": 10,
      "holdSeconds": 3,
      "frequency": "1x daily",
      "description": "From a crawl position, lower your buttocks a little toward your feet to get into a lower position. With a hand OUT TO THE SIDE LIKE WE PRACTICED, rotate your body and your head to the side, then return.",
      "cues": [
        "Crawl position, sit hips back toward feet",
        "Hand OUT TO THE SIDE LIKE WE PRACTICED",
        "Rotate body AND head to the side",
        "Hold 3 sec, then return",
        "10 reps × 2 sets"
      ],
      "emoji": "🌀",
      "sortOrder": 4
    }
  ]
}
```

Notes on the conversion choices:

- **Exercise 1 (dowel)** has reps with no hold → `rep_based`.
- **Exercise 2 (band ER)** is rep-driven with a 1-second per-rep hold → `hybrid`. This is the right call even though the hold is short; the patient gets a per-rep tick.
- **Exercise 3 (box breathing)** has no sets/reps line in the HEP. Modeled as `rep_based` with `reps: 4` (a "few cycles") and the four phases as cues. Therapist's "different timing than photo" annotation is preserved verbatim in the description.
- **Exercise 4 (quadruped T-rotation)** has reps and a per-rep hold → `hybrid`. Therapist's emphasized phrase is kept in caps in the cues.
- All four are placed in a single phase; the HEP doesn't stage them.
- `frequency` strings preserve the therapist's `Perform N Times a Day` exactly in shorthand form.

## Handing the file back

When you return the JSON to the patient, include:

- The filename you'd suggest (e.g. `white-hep-2026-05-05.json`).
- A one-line summary: e.g. *"4 exercises, 1 phase, all mobility/isotonic. Box breathing modeled with reps=4 cycles since the HEP didn't specify count."*
- Any judgement calls you made that the therapist should sanity-check on the next visit.

The patient imports it via **Settings → Program Management → Import Program**. If the validator complains, fix the JSON yourself and re-send — don't ask the patient to debug it.
