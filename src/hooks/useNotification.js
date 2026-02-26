import { useState, useCallback } from 'react';

/**
 * Notification hook – provides permission management and a simple notify() helper.
 *
 * Gracefully handles environments where the Notification API is not available
 * (e.g. iOS Safari in-app browsers, non-secure contexts).
 */
export default function useNotification() {
  const isSupported =
    typeof window !== 'undefined' && 'Notification' in window;

  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : 'denied',
  );

  /** Prompt the user for notification permission. */
  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied';

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return 'denied';
    }
  }, [isSupported]);

  /** Show a notification if permission has been granted. */
  const notify = useCallback(
    (title, body) => {
      if (!isSupported || permission !== 'granted') return null;

      try {
        return new Notification(title, { body });
      } catch {
        return null;
      }
    },
    [isSupported, permission],
  );

  return { permission, requestPermission, notify };
}
