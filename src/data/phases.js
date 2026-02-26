export const phaseRules = {
  1: {
    name: "Pain Reduction & Isometric Loading",
    weeks: "1–2",
    rules: [
      "No behind-back reaching with left arm",
      "No overhead lifting with left arm",
      "No cross-body movements",
      "Sleep on right side or back — avoid left side pressure",
      "Ice after exercises if needed (15 min max)",
      "All exercises should be pain-free or ≤2/10 pain",
    ],
  },
  2: {
    name: "Isotonic Strengthening",
    weeks: "3–6",
    rules: [
      "Continue all Phase 1 exercises",
      "AC joint management: avoid heavy overhead loading",
      "Progress loads only after 2 consecutive pain-free sessions",
      "Slow tempo on all isotonic exercises (2-3 sec each direction)",
      "Stop any exercise that causes sharp pain",
    ],
  },
  3: {
    name: "Pull-Up Return",
    weeks: "7–12+",
    rules: [
      "Continue Phase 2 exercises as maintenance",
      "Start with dead hangs before progressing",
      "Chin-up grip preferred over pull-up grip (reduces AC compression)",
      "Neutral grip safest for AC joint if available",
      "Progress only when previous level is completely pain-free",
      "Full pull-ups are the final milestone — not a starting point",
    ],
  },
};

export const pullUpChecklist = [
  { id: "dead_hang_45s", label: "Pain-free dead hang for 45 seconds" },
  { id: "scap_pullups_3x8", label: "3×8 scapular pull-ups with no pain" },
  {
    id: "eccentric_3x5",
    label: "3×5 eccentric pull-ups (5-sec lowering) with no pain",
  },
  {
    id: "er_strength_equal",
    label: "External rotation strength equal bilaterally",
  },
  {
    id: "ir_strength_equal",
    label: "Internal rotation strength near-equal bilaterally",
  },
  { id: "liftoff_no_pain", label: "Lift-off test: minimal or no pain" },
  {
    id: "crossbody_no_pain",
    label: "Cross-body adduction: minimal or no pain at top of shoulder",
  },
  {
    id: "jacket_test_clear",
    label:
      "Jacket test: putting on jacket (right arm first) is completely pain-free",
  },
];
