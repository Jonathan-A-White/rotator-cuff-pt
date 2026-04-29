import { openDB } from "idb";

const DB_NAME = "rcpt-db";
const DB_VERSION = 2;

const DEFAULT_SETTINGS = {
  currentPhase: 1,
  phaseStartDate: null, // ISO date string when current phase began
  exerciseOrder: [],
  timerSound: true,
  timerVibrate: true,
  timerNotification: true,
  darkMode: "system",
  restTimerAutoStart: true,
  systemTimer: false,
  activeProgramId: null, // ID of the active program config
};

let dbPromise = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // ── Version 1 → create initial stores ─────────────────────────
        if (oldVersion < 1) {
          const workoutStore = db.createObjectStore("workoutLogs", {
            keyPath: "id",
          });
          workoutStore.createIndex("date", "date", { unique: false });
          workoutStore.createIndex("exerciseId", "exerciseId", {
            unique: false,
          });
          workoutStore.createIndex("timestamp", "timestamp", { unique: false });

          const assessmentStore = db.createObjectStore("assessments", {
            keyPath: "id",
          });
          assessmentStore.createIndex("date", "date", { unique: false });

          db.createObjectStore("settings", { keyPath: "key" });
          db.createObjectStore("checklist", { keyPath: "id" });
        }

        // ── Version 2 → add programs store ──────────────────────────────
        if (oldVersion < 2) {
          db.createObjectStore("programs", { keyPath: "id" });
          // Note: programId on workoutLogs/assessments is filtered at the
          // application level for backward compatibility (no index needed).
        }
      },
    });
  }
  return dbPromise;
}

// ── Programs ──────���───────────────────────────────────────────────────────

export async function saveProgram(program) {
  const db = await getDB();
  await db.put("programs", program);
}

export async function getProgram(programId) {
  const db = await getDB();
  return db.get("programs", programId);
}

export async function getAllPrograms() {
  const db = await getDB();
  return db.getAll("programs");
}

/**
 * Delete a program and every workoutLog/assessment tagged with its programId,
 * all in a single transaction so partial failure cannot leave orphans.
 */
export async function deleteProgramAndData(programId) {
  if (!programId) return;
  const db = await getDB();
  const tx = db.transaction(
    ["programs", "workoutLogs", "assessments"],
    "readwrite",
  );
  const programs = tx.objectStore("programs");
  const workoutLogs = tx.objectStore("workoutLogs");
  const assessments = tx.objectStore("assessments");

  const [allLogs, allAssessments] = await Promise.all([
    workoutLogs.getAll(),
    assessments.getAll(),
  ]);

  await programs.delete(programId);
  for (const log of allLogs) {
    if (log.programId === programId) {
      await workoutLogs.delete(log.id);
    }
  }
  for (const a of allAssessments) {
    if (a.programId === programId) {
      await assessments.delete(a.id);
    }
  }
  await tx.done;
}

/**
 * Get the active program config (the one currently selected).
 * Returns null if no custom program is saved (app uses built-in default).
 */
export async function getActiveProgram() {
  const settings = await getSettings();
  if (!settings.activeProgramId) return null;
  return getProgram(settings.activeProgramId);
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
    programId: log.programId || null,
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
 * If phaseStartDate is missing from settings, infer it from the earliest
 * workout log date. Falls back to today if there are no logs.
 * Returns the (possibly updated) settings object.
 */
export async function backfillPhaseStartDate(settings) {
  if (settings.phaseStartDate) return settings;

  const db = await getDB();
  const allLogs = await db.getAll("workoutLogs");

  let earliest = null;
  for (const log of allLogs) {
    if (log.date && (!earliest || log.date < earliest)) {
      earliest = log.date;
    }
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  settings.phaseStartDate = earliest || todayStr;
  await saveSettings(settings);
  return settings;
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
      programId: latest?.programId || null,
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
 * Update an existing workout log entry by its ID.
 * Merges the provided fields into the existing record.
 */
export async function updateLog(logId, updates) {
  const db = await getDB();
  const existing = await db.get("workoutLogs", logId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await db.put("workoutLogs", updated);
  return updated;
}

/**
 * Add a manual log entry (from edit mode).
 * Creates a single entry with source "manual" and setsCompleted = 1.
 */
export async function addManualLog(exerciseId, dateStr, programId = null) {
  const now = Date.now();
  return logWorkout({
    date: dateStr,
    exerciseId,
    setsCompleted: 1,
    source: "manual",
    timestamp: now,
    startTime: now,
    endTime: now,
    programId,
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
    programId: assessment.programId || null,
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

// ── Data Import / Export ────────────────────────────��────────────────────

export async function exportAllData() {
  const db = await getDB();
  const [workoutLogs, assessments, settings, checklist, programs] = await Promise.all([
    db.getAll("workoutLogs"),
    db.getAll("assessments"),
    db.getAll("settings"),
    db.getAll("checklist"),
    db.getAll("programs"),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    workoutLogs,
    assessments,
    settings,
    checklist,
    programs,
  };
}

/**
 * Validate that imported data has the expected shape.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateImportData(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, reason: "File does not contain valid JSON data." };
  }

  // Check version compatibility — reject exports from newer DB versions
  if (data.version != null && data.version > DB_VERSION) {
    return {
      valid: false,
      reason: `This backup is from a newer app version (v${data.version}). Please update the app before importing.`,
    };
  }

  // Must have at least one data array present
  const storeKeys = ["workoutLogs", "assessments", "settings", "checklist", "programs"];
  const hasAnyData = storeKeys.some(
    (key) => Array.isArray(data[key]) && data[key].length > 0,
  );
  if (!hasAnyData) {
    return {
      valid: false,
      reason: "No recognizable data found (workoutLogs, assessments, settings, checklist, or programs).",
    };
  }

  // Each present key must be an array
  for (const key of storeKeys) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      return {
        valid: false,
        reason: `"${key}" must be an array, got ${typeof data[key]}.`,
      };
    }
  }

  // Validate workout log entries have required fields
  if (Array.isArray(data.workoutLogs)) {
    for (let i = 0; i < data.workoutLogs.length; i++) {
      const log = data.workoutLogs[i];
      if (!log || typeof log !== "object") {
        return { valid: false, reason: `workoutLogs[${i}] is not an object.` };
      }
      if (!log.id || !log.date || !log.exerciseId) {
        return {
          valid: false,
          reason: `workoutLogs[${i}] is missing required fields (id, date, or exerciseId).`,
        };
      }
    }
  }

  // Validate assessment entries have required fields
  if (Array.isArray(data.assessments)) {
    for (let i = 0; i < data.assessments.length; i++) {
      const a = data.assessments[i];
      if (!a || typeof a !== "object") {
        return { valid: false, reason: `assessments[${i}] is not an object.` };
      }
      if (!a.id || !a.date) {
        return {
          valid: false,
          reason: `assessments[${i}] is missing required fields (id or date).`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Migrate export data from an older version to the current version.
 * Each migration step transforms the data shape forward by one version.
 * Returns the migrated data object (does not mutate the original).
 */
export function migrateImportData(data) {
  let migrated = { ...data };
  const fromVersion = migrated.version || 1;

  // v1 → v2: ensure programs array exists
  if (fromVersion < 2) {
    if (!migrated.programs) {
      migrated.programs = [];
    }
    migrated.version = 2;
  }

  migrated.version = DB_VERSION;
  return migrated;
}

export async function importData(data) {
  // Migrate old exports to the current schema before importing
  const migrated = migrateImportData(data);

  const db = await getDB();

  // Back up current data before clearing, so we can restore on failure
  const storeNames = ["workoutLogs", "assessments", "settings", "checklist", "programs"];
  const backup = {};
  for (const name of storeNames) {
    backup[name] = await db.getAll(name);
  }

  const tx = db.transaction(storeNames, "readwrite");

  try {
    // Clear all stores first
    await Promise.all(
      storeNames.map((name) => tx.objectStore(name).clear()),
    );

    // Import data into each store
    const putAll = (storeName, records) =>
      (records || []).map((record) => tx.objectStore(storeName).put(record));

    await Promise.all([
      ...putAll("workoutLogs", migrated.workoutLogs),
      ...putAll("assessments", migrated.assessments),
      ...putAll("settings", migrated.settings),
      ...putAll("checklist", migrated.checklist),
      ...putAll("programs", migrated.programs),
      tx.done,
    ]);
  } catch (err) {
    // Attempt to restore from backup
    try {
      const restoreTx = db.transaction(storeNames, "readwrite");
      for (const name of storeNames) {
        const store = restoreTx.objectStore(name);
        await store.clear();
        for (const record of backup[name]) {
          await store.put(record);
        }
      }
      await restoreTx.done;
    } catch {
      // Restore failed — nothing more we can do
    }
    throw err;
  }
}

export async function clearAllData() {
  const db = await getDB();
  const storeNames = ["workoutLogs", "assessments", "settings", "checklist", "programs"];
  const tx = db.transaction(storeNames, "readwrite");
  await Promise.all([
    ...storeNames.map((name) => tx.objectStore(name).clear()),
    tx.done,
  ]);
}
