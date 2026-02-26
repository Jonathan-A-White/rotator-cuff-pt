/**
 * Returns today's date as an ISO date string "YYYY-MM-DD" in local time.
 */
export function today() {
  return toISODate(new Date());
}

/**
 * Formats an ISO date string into a human-readable form like "Feb 26, 2026".
 */
export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns the ISO date string for n days ago.
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/**
 * Returns an array of 7 ISO date strings for the current week (Mon-Sun).
 */
export function getWeekDates() {
  const now = new Date();
  // getDay() returns 0 (Sun) - 6 (Sat). Convert so Mon = 0.
  const jsDay = now.getDay(); // 0 = Sunday
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toISODate(d));
  }
  return dates;
}

/**
 * Returns the short day name (e.g. "Mon", "Tue") for an ISO date string.
 */
export function dayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Returns the number of days between two ISO date strings (absolute value).
 */
export function daysBetween(date1, date2) {
  const [y1, m1, d1] = date1.split("-").map(Number);
  const [y2, m2, d2] = date2.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  const diffMs = Math.abs(a - b);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// ── Internal helper ──────────────────────────────────────────────────────

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
