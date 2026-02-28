import { openDB } from "idb";

const DB_NAME = "rcpt-db";
const DB_VERSION = 1;

const DEFAULT_SETTINGS = {
  currentPhase: 1,
  exerciseOrder: [],
  timerSound: true,
  timerVibrate: true,
  timerNotification: true,
  darkMode: "system",
  restTimerAutoStart: true,
};

let dbPromise = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Workout logs store
        const workoutStore = db.createObjectStore("workoutLogs", {
          keyPath: "id",
        });
        workoutStore.createIndex("date", "date", { unique: false });
        workoutStore.createIndex("exerciseId", "exerciseId", {
          unique: false,
        });
        workoutStore.createIndex("timestamp", "timestamp", { unique: false });

        // Assessments store
        const assessmentStore = db.createObjectStore("assessments", {
          keyPath: "id",
        });
        assessmentStore.createIndex("date", "date", { unique: false });

        // Settings store
        db.createObjectStore("settings", { keyPath: "key" });

        // Checklist store
        db.createObjectStore("checklist", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// ── Settings ─────────────────────────────────────────────────────────────

export async function getSettings() {
  const db = await getDB();
  const record = await db.get("settings", "userSettings");
  if (!record) {
    return { ...DEFAULT_SETTINGS };
  }
  // Merge with defaults so newly-added keys always exist
  return { ...DEFAULT_SETTINGS, ...record.value };
}

export async function saveSettings(settings) {
  const db = await getDB();
  await db.put("settings", { key: "userSettings", value: settings });
}

// ── Workout Logs ─────────────────────────────────────────────────────────

export async function logWorkout(log) {
  const db = await getDB();
  const now = Date.now();
  const entry = {
    ...log,
    id: log.id || crypto.randomUUID(),
    timestamp: log.timestamp || now,
    source: log.source || "timer",
    startTime: log.startTime || now,
    endTime: log.endTime || now,
  };
  await db.add("workoutLogs", entry);
  return entry;
}

export async function getLogsForDate(dateStr) {
  const db = await getDB();
  return db.getAllFromIndex("workoutLogs", "date", dateStr);
}

export async function getLogsForExercise(exerciseId, limit) {
  const db = await getDB();
  const all = await db.getAllFromIndex(
    "workoutLogs",
    "exerciseId",
    exerciseId,
  );
  // Sort most recent first
  all.sort((a, b) => b.timestamp - a.timestamp);
  if (limit !== undefined && limit > 0) {
    return all.slice(0, limit);
  }
  return all;
}

export async function getLogsInRange(startDate, endDate) {
  const db = await getDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  return db.getAllFromIndex("workoutLogs", "date", range);
}

export async function getAllLogs() {
  const db = await getDB();
  return db.getAll("workoutLogs");
}

/**
 * Adjust the total logged sets for a specific exercise on a specific date.
 * Replaces all existing log entries for that exercise/date with a single entry
 * at the new total (or removes them all if newTotal <= 0).
 */
export async function adjustSetsForDate(exerciseId, dateStr, newTotal) {
  const db = await getDB();
  const dayLogs = await db.getAllFromIndex("workoutLogs", "date", dateStr);
  const exerciseLogs = dayLogs.filter((l) => l.exerciseId === exerciseId);

  const tx = db.transaction("workoutLogs", "readwrite");
  const store = tx.objectStore("workoutLogs");

  // Delete all existing logs for this exercise on this date
  for (const log of exerciseLogs) {
    await store.delete(log.id);
  }

  // If the new total is positive, create a single consolidated entry
  if (newTotal > 0) {
    // Preserve pain/notes from the most recent log if available
    const latest = exerciseLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
    const now = Date.now();
    await store.add({
      id: crypto.randomUUID(),
      date: dateStr,
      exerciseId,
      setsCompleted: newTotal,
      timestamp: latest?.timestamp || now,
      source: "manual",
      startTime: latest?.startTime || latest?.timestamp || now,
      endTime: latest?.endTime || latest?.timestamp || now,
      ...(latest?.painLevel != null ? { painLevel: latest.painLevel } : {}),
      ...(latest?.notes ? { notes: latest.notes } : {}),
    });
  }

  await tx.done;
}

/**
 * Delete a single workout log entry by its ID.
 */
export async function deleteLog(logId) {
  const db = await getDB();
  await db.delete("workoutLogs", logId);
}

/**
 * Add a manual log entry (from edit mode).
 * Creates a single entry with source "manual" and setsCompleted = 1.
 */
export async function addManualLog(exerciseId, dateStr) {
  const now = Date.now();
  return logWorkout({
    date: dateStr,
    exerciseId,
    setsCompleted: 1,
    source: "manual",
    timestamp: now,
    startTime: now,
    endTime: now,
  });
}

/**
 * Smart-remove one set from the most recent log entry for an exercise on a date.
 * If the entry reaches 0 sets, it is deleted entirely.
 * Returns the removed/modified log entry (or null if nothing to remove).
 */
export async function decrementLatestLog(exerciseId, dateStr) {
  const db = await getDB();
  const dayLogs = await db.getAllFromIndex("workoutLogs", "date", dateStr);
  const exerciseLogs = dayLogs
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (exerciseLogs.length === 0) return null;

  const latest = exerciseLogs[0];
  const tx = db.transaction("workoutLogs", "readwrite");
  const store = tx.objectStore("workoutLogs");

  if ((latest.setsCompleted || 0) <= 1) {
    // Delete the entry entirely
    await store.delete(latest.id);
  } else {
    // Decrement setsCompleted by 1
    await store.put({ ...latest, setsCompleted: latest.setsCompleted - 1 });
  }

  await tx.done;
  return latest;
}

// ── Assessments ──────────────────────────────────────────────────────────

export async function saveAssessment(assessment) {
  const db = await getDB();
  const entry = {
    ...assessment,
    id: assessment.id || crypto.randomUUID(),
  };
  await db.put("assessments", entry);
  return entry;
}

export async function getAssessments() {
  const db = await getDB();
  const all = await db.getAll("assessments");
  all.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  return all;
}

// ── Checklist ────────────────────────────────────────────────────────────

export async function getChecklistState() {
  const db = await getDB();
  return db.getAll("checklist");
}

export async function setChecklistItem(id, checked) {
  const db = await getDB();
  await db.put("checklist", { id, checked });
}

// ── Data Import / Export ─────────────────────────────────────────────────

export async function exportAllData() {
  const db = await getDB();
  const [workoutLogs, assessments, settings, checklist] = await Promise.all([
    db.getAll("workoutLogs"),
    db.getAll("assessments"),
    db.getAll("settings"),
    db.getAll("checklist"),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    workoutLogs,
    assessments,
    settings,
    checklist,
  };
}

export async function importData(data) {
  const db = await getDB();
  const tx = db.transaction(
    ["workoutLogs", "assessments", "settings", "checklist"],
    "readwrite",
  );

  // Clear all stores first
  await Promise.all([
    tx.objectStore("workoutLogs").clear(),
    tx.objectStore("assessments").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("checklist").clear(),
  ]);

  // Import data into each store
  const putAll = (storeName, records) =>
    (records || []).map((record) => tx.objectStore(storeName).put(record));

  await Promise.all([
    ...putAll("workoutLogs", data.workoutLogs),
    ...putAll("assessments", data.assessments),
    ...putAll("settings", data.settings),
    ...putAll("checklist", data.checklist),
    tx.done,
  ]);
}

export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(
    ["workoutLogs", "assessments", "settings", "checklist"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("workoutLogs").clear(),
    tx.objectStore("assessments").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("checklist").clear(),
    tx.done,
  ]);
}
