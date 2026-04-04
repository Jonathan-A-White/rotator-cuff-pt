export const exercises = [
  // ── Phase 1: Pain Reduction & Isometric Loading ──────────────────────
  {
    id: "p1_iso_internal_rotation",
    name: "Isometric Internal Rotation",
    shortName: "Internal Rot.",
    phase: 1,
    category: "isometric",
    sets: 5,
    holdSeconds: 45,
    restSeconds: 120,
    frequency: "daily, 1-2x",
    description:
      "Stand with left elbow bent 90°, tucked to your side. Place a rolled towel between your elbow and body (keeps the shoulder in a neutral, less compressed position). Press your PALM into a door frame or wall (pushing inward toward your body). Hold 30–45 seconds at ~20–30% effort to start. 4–5 sets. Pain must stay ≤2/10 during holds. If it's more, reduce effort. Progress to 40% effort over the first week as tolerated.",
    cues: [
      "Elbow bent 90°, tucked to side",
      "Towel between elbow & body",
      "Press palm INTO wall/frame",
      "20-30% effort → progress to 40%",
      "Pain ≤ 2/10",
    ],
    videoUrl:
      "https://youtube.com/shorts/ewhkUx4SAQE?si=n6b7WPExKogBBxGc",
    emoji: "🫸",
    effortGuidance: "20-30% effort, progress to 40% over first week",
    painThreshold: "Pain must stay ≤ 2/10",
    sortOrder: 1,
  },
  {
    id: "p1_iso_external_rotation",
    name: "Isometric External Rotation",
    shortName: "External Rot.",
    phase: 1,
    category: "isometric",
    sets: 5,
    holdSeconds: 45,
    restSeconds: 120,
    frequency: "daily, 1-2x",
    description:
      "Press back of hand into door frame, elbow tucked. 4–5 sets × 30–45 sec at 30–40% effort. This loads the infraspinatus and helps balance the cuff.",
    cues: [
      "Back of hand into door frame",
      "Elbow tucked to side",
      "30-40% effort",
      "Loads infraspinatus",
    ],
    videoUrl:
      "https://youtube.com/shorts/kWtMKNnjyd0?si=kCByXDc51vvKnSTP",
    emoji: "🤚",
    effortGuidance: "30-40% effort",
    sortOrder: 2,
  },
  {
    id: "p1_iso_abduction",
    name: "Isometric Abduction",
    shortName: "Abduction",
    phase: 1,
    category: "isometric",
    sets: 5,
    holdSeconds: 45,
    restSeconds: 120,
    frequency: "daily, 1-2x",
    description:
      "Push elbow into wall at your side. 4–5 sets × 30–45 sec. Start at 20–30% effort given the supraspinatus involvement. Stay BELOW the 60° painful arc — do this with arm at your side, not raised.",
    cues: [
      "Push elbow into wall at your side",
      "Arm stays at side (below 60°)",
      "20-30% effort",
      "Stay below painful arc",
    ],
    videoUrl:
      "https://youtube.com/shorts/zoCppYw0PlU?si=6OB0Q8WRg0-PtblG",
    emoji: "💪",
    effortGuidance: "20-30% effort",
    painThreshold: "Stay BELOW 60° painful arc",
    sortOrder: 3,
  },
  {
    id: "p1_pendulums",
    name: "Supported Pendulums",
    shortName: "Pendulums",
    phase: 1,
    category: "mobility",
    sets: 1,
    holdSeconds: 120,
    frequency: "2-3x daily",
    description:
      "These decompress the AC joint as well as the subacromial space. 1–2 minutes, both directions, 2–3x daily. Especially valuable first thing in the morning.",
    cues: [
      "Lean forward, let arm hang",
      "Small circles both directions",
      "1-2 minutes total",
      "Especially good in the morning",
    ],
    videoUrl:
      "https://youtube.com/shorts/vSK0aP7ZdU0?si=8m0_WJvERmwQs24H",
    emoji: "🔄",
    sortOrder: 4,
  },
  {
    id: "p1_scapular_setting",
    name: "Scapular Setting Exercise",
    shortName: "Scap. Setting",
    phase: 1,
    category: "mobility",
    sets: 1,
    reps: 10,
    holdSeconds: 10,
    frequency: "2-3x daily",
    description:
      'Sit or stand with arms relaxed. Gently squeeze your shoulder blades together and slightly down (think "put your shoulder blades in your back pockets"). Hold 10 seconds, relax. 10 reps, 2–3x daily. This helps the scapula position correctly, reducing AC joint compression and subacromial impingement.',
    cues: [
      "Arms relaxed at sides",
      "Squeeze blades together + down",
      '"Shoulder blades in back pockets"',
      "Hold 10 sec, relax",
      "10 reps",
    ],
    videoUrl:
      "https://youtube.com/shorts/crvqDfkIihI?si=dZyl9hE76Lo9bZCl",
    emoji: "🦋",
    sortOrder: 5,
  },

  // ── Phase 2: Isotonic Strengthening ──────────────────────────────────
  {
    id: "p2_belly_press",
    name: "Belly Press",
    shortName: "Belly Press",
    phase: 2,
    category: "isotonic",
    sets: 3,
    reps: 15,
    frequency: "daily, 1-2x",
    description:
      "Stand with left elbow bent 90°, hand on your belly. Press your hand into your belly while moving your elbow forward (away from your side). Use your belly as resistance — the subscapularis does the work. This is a safer internal rotation exercise than using bands initially. 3 sets × 12–15 reps. Progress to band internal rotation when this is painless.",
    cues: [
      "Elbow bent 90°, hand on belly",
      "Press hand into belly",
      "Move elbow forward/away from side",
      "Belly provides resistance",
      "Progress to bands when painless",
    ],
    emoji: "🤜",
    effortGuidance: "Isometric — hold and press",
    videoUrl:
      "https://www.youtube.com/watch?v=cI4GN8NqRdg",
    videoReferences: [
      {
        label: "Precision Movement — 5 SUBSCAPULARIS Exercises (belly press as Exercise #3)",
        url: "https://www.youtube.com/results?search_query=precision+movement+5+subscapularis+exercises+rotator+cuff",
      },
      {
        label: "The Physio Channel — Belly Press Subscapularis Test",
        url: "https://www.youtube.com/watch?v=cI4GN8NqRdg",
      },
    ],
    sortOrder: 6,
  },
  {
    id: "p2_band_internal_rotation",
    name: "Band Internal Rotation",
    shortName: "Band Int. Rot.",
    phase: 2,
    category: "isotonic",
    sets: 3,
    reps: 15,
    frequency: "daily, 1-2x",
    description:
      "Attach band at elbow height. Stand with right side toward anchor. Left elbow tucked with towel roll, rotate forearm inward against band. 3 sets × 12–15 reps, slow tempo (2 sec in, 3 sec out). This is the isotonic progression for subscapularis.",
    cues: [
      "Band at elbow height",
      "Right side toward anchor",
      "Towel roll under left elbow",
      "Rotate forearm inward",
      "Tempo: 2s in, 3s out",
    ],
    emoji: "🟡",
    effortGuidance: "Slow tempo: 2 sec concentric, 3 sec eccentric",
    videoUrl:
      "https://www.youtube.com/results?search_query=band+internal+rotation+shoulder+towel+roll+rotator+cuff+rehab",
    videoReferences: [
      {
        label: "General search — Band IR with towel roll",
        url: "https://www.youtube.com/results?search_query=band+internal+rotation+shoulder+towel+roll+rotator+cuff+rehab",
      },
      {
        label: "Kaiser Permanente — Rotator Cuff Exercises (banded IR with towel roll)",
        url: "https://healthy.kaiserpermanente.org/health-wellness/health-encyclopedia/he.rotator-cuff-exercises.ad1509",
      },
      {
        label: "The Stone Clinic — Shoulder Theraband External and Internal Rotation",
        url: "https://www.stoneclinic.com/video/Shoulder-Theraband-External-and-Internal-Rotation",
      },
    ],
    sortOrder: 7,
  },
  {
    id: "p2_band_external_rotation",
    name: "Band External Rotation",
    shortName: "Band Ext. Rot.",
    phase: 2,
    category: "isotonic",
    sets: 3,
    reps: 15,
    frequency: "daily, 1-2x",
    description:
      "Standard band external rotation from Phase 2 of original plan. Elbow tucked, towel roll, rotate forearm outward against band resistance.",
    cues: [
      "Band at elbow height",
      "Left side toward anchor",
      "Towel roll under elbow",
      "Rotate forearm outward",
      "Slow controlled tempo",
    ],
    emoji: "🟢",
    effortGuidance: "Slow controlled tempo",
    videoUrl:
      "https://www.youtube.com/results?search_query=band+external+rotation+shoulder+towel+roll+elbow+tucked+rehab",
    videoReferences: [
      {
        label: "General search — Band ER with towel roll",
        url: "https://www.youtube.com/results?search_query=band+external+rotation+shoulder+towel+roll+elbow+tucked+rehab",
      },
      {
        label: "E3 Rehab — Rotator Cuff Exercises (band ER with towel roll, common mistakes)",
        url: "https://e3rehab.com/rotator-cuff-exercises/",
      },
      {
        label: "[P]rehab — Eccentric Shoulder ER Walk Out (advanced variation)",
        url: "https://library.theprehabguys.com/vimeo-video/eccentric-shoulder-external-rotation-walk-out-band/",
      },
    ],
    sortOrder: 8,
  },
  {
    id: "p2_ytw_raises",
    name: "Modified Y-T-W Raises",
    shortName: "Y-T-W",
    phase: 2,
    category: "isotonic",
    sets: 3,
    reps: 10,
    frequency: "daily, 1-2x",
    description:
      "START WITH NO WEIGHT. The AC joint irritation means overhead positions need to be loaded very gradually. Add weight only when bodyweight is completely painless for 2 consecutive sessions. Y position (arms overhead in V), T position (arms out to sides), W position (arms bent like goal posts).",
    cues: [
      "Start with NO WEIGHT",
      "Y: arms overhead in V shape",
      "T: arms straight to sides",
      "W: bent arms, goal post position",
      "Add weight after 2 painless sessions",
    ],
    emoji: "🙆",
    painThreshold:
      "Add weight only after 2 consecutive painless sessions",
    videoUrl:
      "https://www.youtube.com/results?search_query=prone+Y+T+W+raises+shoulder+rehab+no+weight+bodyweight",
    videoReferences: [
      {
        label: "General search — Prone Y-T-W (bodyweight)",
        url: "https://www.youtube.com/results?search_query=prone+Y+T+W+raises+shoulder+rehab+no+weight+bodyweight",
      },
      {
        label: "Standing Y-T-W — Scapular retraction version",
        url: "https://www.youtube.com/results?search_query=standing+YTW+exercise+shoulder+scapular+retraction",
      },
      {
        label: "Catalyst Athletics — YTW exercise (band and prone variations)",
        url: "https://www.catalystathletics.com/exercise/920/YTW/",
      },
    ],
    sortOrder: 9,
  },
  {
    id: "p2_sidelying_external_rotation",
    name: "Side-Lying External Rotation",
    shortName: "Side-Lying ER",
    phase: 2,
    category: "isotonic",
    sets: 3,
    reps: 15,
    frequency: "daily, 1-2x",
    description:
      "Lie on right side, left elbow bent 90° resting on hip. Rotate forearm upward toward ceiling. Use light dumbbell (1-3 lbs to start). Slow controlled motion.",
    cues: [
      "Lie on right side",
      "Left elbow on hip, bent 90°",
      "Rotate forearm toward ceiling",
      "Light weight (1-3 lbs)",
      "Slow and controlled",
    ],
    emoji: "🛏️",
    effortGuidance: "Slow and controlled",
    videoUrl:
      "https://www.youtube.com/results?search_query=side+lying+external+rotation+dumbbell+rotator+cuff",
    videoReferences: [
      {
        label: "General search — Side-lying ER dumbbell",
        url: "https://www.youtube.com/results?search_query=side+lying+external+rotation+dumbbell+rotator+cuff",
      },
      {
        label: "[P]rehab — Side Lying External Rotation Dumbbell",
        url: "https://library.theprehabguys.com/vimeo-video/side-lying-external-rotation-dumbbell-2/",
      },
      {
        label: "Point Performance — Side-Lying Shoulder Exercise Series",
        url: "https://www.pointperformance.com/side-lying-shoulder-exercise-series-video/",
      },
      {
        label: "Live Lean TV — Side Lying Dumbbell External Rotation",
        url: "https://www.liveleantv.com/how-to-do-a-side-lying-one-arm-dumbbell-external-rotation/",
      },
    ],
    sortOrder: 10,
  },

  // ── Phase 3: Pull-Up Return ──────────────────────────────────────────
  {
    id: "p3_dead_hang",
    name: "Dead Hangs",
    shortName: "Dead Hang",
    phase: 3,
    category: "functional",
    sets: 3,
    holdSeconds: 10,
    restSeconds: 120,
    frequency: "daily, 1-2x",
    description:
      "Start with just 5–10 seconds. The hang position puts the subscapularis on stretch. If this provokes the behind-back pain pattern, you're not ready. Progress duration gradually.",
    cues: [
      "Start with 5-10 seconds",
      "Full grip, relaxed shoulders",
      "STOP if behind-back pain pattern",
      "Progress duration gradually",
    ],
    emoji: "🧗",
    painThreshold:
      "Stop immediately if it provokes behind-back pain pattern",
    sortOrder: 11,
  },
  {
    id: "p3_active_hang",
    name: "Active Hangs",
    shortName: "Active Hang",
    phase: 3,
    category: "functional",
    sets: 3,
    holdSeconds: 15,
    restSeconds: 120,
    frequency: "daily, 1-2x",
    description:
      "Engage shoulders while hanging — pull shoulder blades down and back slightly without bending elbows. This is the bridge between dead hangs and scapular pull-ups.",
    cues: [
      "Hang from bar",
      "Pull shoulder blades down + back",
      "Don't bend elbows",
      "Shoulders engaged, not relaxed",
    ],
    emoji: "🏋️",
    sortOrder: 12,
  },
  {
    id: "p3_scapular_pullups",
    name: "Scapular Pull-Ups",
    shortName: "Scap. Pull-Ups",
    phase: 3,
    category: "functional",
    sets: 3,
    reps: 8,
    frequency: "daily, 1-2x",
    description:
      "From dead hang, depress and retract scapulae to lift body slightly without bending elbows. Focus on scapular control. Target 3×8 pain-free before progressing.",
    cues: [
      "Dead hang start position",
      "Pull shoulder blades down",
      "Body rises 1-2 inches",
      "No elbow bending",
      "3×8 pain-free = progress",
    ],
    emoji: "⬆️",
    sortOrder: 13,
  },
  {
    id: "p3_eccentric_pullups",
    name: "Eccentric Pull-Ups",
    shortName: "Eccentric PU",
    phase: 3,
    category: "functional",
    sets: 3,
    reps: 5,
    frequency: "daily, 1-2x",
    description:
      "Jump or step to chin-above-bar position. Lower yourself as slowly as possible (5 second target descent). Focus on control through the full range. Chin-up grip (palms toward you) may be better tolerated — reduces AC joint compression. Neutral grip (palms facing each other) is safest for AC joint if available.",
    cues: [
      "Jump/step to top position",
      "Lower over 5 seconds",
      "Chin-up grip preferred (palms in)",
      "Neutral grip safest for AC joint",
      "Full controlled descent",
    ],
    emoji: "⬇️",
    effortGuidance: "5-second lowering phase",
    sortOrder: 14,
  },
];
