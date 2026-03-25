import { Capacitor, registerPlugin } from '@capacitor/core'

const SystemTimer = registerPlugin('SystemTimer')

/**
 * Start the Android system Clock timer with the given duration.
 * The timer runs in the notification bar while the in-app timer continues.
 * No-ops gracefully on web or if the system clock app isn't available.
 *
 * @param {number} seconds - Duration in seconds
 * @param {string} [label] - Label shown on the system timer
 */
export async function startSystemTimer(seconds, label = 'Exercise Timer') {
  if (!Capacitor.isNativePlatform()) return

  try {
    await SystemTimer.setTimer({
      seconds: Math.round(seconds),
      label,
      skipUi: true,
    })
  } catch {
    // System clock app may not support ACTION_SET_TIMER — fail silently
  }
}
