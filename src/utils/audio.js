let audioCtx = null;

/**
 * Creates the AudioContext if needed, resumes if suspended.
 * Must be called after a user gesture (click/tap) so the browser allows playback.
 */
export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── Internal helpers ─────────────────────────────────────────────────────

function ensureContext() {
  if (!audioCtx) {
    initAudio();
  }
  return audioCtx;
}

function playTone(frequency, durationMs, { fadeIn = true, fadeOut = true } = {}) {
  const ctx = ensureContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  const now = ctx.currentTime;
  const duration = durationMs / 1000;
  const fadeDuration = 0.02; // 20ms fade

  if (fadeIn) {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + fadeDuration);
  } else {
    gainNode.gain.setValueAtTime(0.3, now);
  }

  if (fadeOut) {
    gainNode.gain.setValueAtTime(0.3, now + duration - fadeDuration);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
  }

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playChord(frequencies, durationMs) {
  const ctx = ensureContext();
  const now = ctx.currentTime;
  const duration = durationMs / 1000;
  const fadeDuration = 0.02;

  frequencies.forEach((freq) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, now);

    // Each voice slightly quieter so combined output doesn't clip
    const voiceGain = 0.2;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(voiceGain, now + fadeDuration);
    gainNode.gain.setValueAtTime(voiceGain, now + duration - fadeDuration);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  });
}

// ── Public tones ─────────────────────────────────────────────────────────

/**
 * 440Hz sine wave, 200ms, fade in/out.
 * Used to signal the start of an exercise.
 */
export function playStartTone() {
  playTone(440, 200, { fadeIn: true, fadeOut: true });
}

/**
 * 3x 880Hz beeps, 100ms each, 100ms gap.
 * Used as a warning before a timer ends.
 */
export function playWarningBeeps() {
  const ctx = ensureContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const startTime = now + i * 0.2; // 100ms tone + 100ms gap = 200ms cycle
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.setValueAtTime(0.3, startTime + 0.09);
    gainNode.gain.linearRampToValueAtTime(0, startTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
  }
}

/**
 * C major chord (523Hz + 659Hz + 784Hz), 400ms, fade out.
 * Used to signal exercise completion.
 */
export function playCompleteTone() {
  playChord([523, 659, 784], 400);
}

/**
 * Same as start tone but played twice with a small gap.
 * Used to signal rest period completion.
 */
export function playRestCompleteTone() {
  const ctx = ensureContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const startTime = now + i * 0.3; // 200ms tone + 100ms gap
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, startTime);

    const fadeDuration = 0.02;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + fadeDuration);
    gainNode.gain.setValueAtTime(0.3, startTime + 0.2 - fadeDuration);
    gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.2);
  }
}
