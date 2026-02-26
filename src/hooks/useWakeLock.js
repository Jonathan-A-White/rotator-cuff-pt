import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Wake Lock hook – keeps the screen on during exercise sessions.
 *
 * Silently fails when the Wake Lock API is not supported (older browsers, non-secure contexts).
 * Re-acquires the lock when the page becomes visible again (the browser releases it on hide).
 */
export default function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef(null);
  const wantedRef = useRef(false); // tracks whether the consumer wants the lock held

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  /** Request (acquire) the wake lock. */
  const request = useCallback(async () => {
    wantedRef.current = true;

    if (!isSupported) return;

    try {
      // Release any existing lock first to avoid stale references
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setIsActive(true);

      // When the system releases the lock (e.g. page hidden), update state
      sentinel.addEventListener('release', () => {
        wakeLockRef.current = null;
        setIsActive(false);
      });
    } catch {
      // Silently fail – could be permission denied or page not visible
      setIsActive(false);
    }
  }, [isSupported]);

  /** Release the wake lock. */
  const release = useCallback(async () => {
    wantedRef.current = false;

    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Already released or failed – no-op
      }
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Re-acquire when the page becomes visible again, but only if we still want it
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wantedRef.current && !wakeLockRef.current) {
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSupported, request]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  return { request, release, isActive };
}
