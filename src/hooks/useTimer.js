import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Drift-free exercise timer hook using performance.now() and requestAnimationFrame.
 *
 * States: 'idle' | 'holding' | 'resting' | 'done'
 *
 * Flow:
 *   idle -> start() -> holding -> (hold completes) ->
 *     if autoStartRest & sets remain -> resting -> (rest completes) ->
 *       increment set, sets remain ? idle : done
 *     else -> idle (user triggers rest manually)
 *   When final set completes -> done
 */
export default function useTimer({
  holdSeconds = 30,
  restSeconds = 15,
  totalSets = 5,
  autoStartRest = true,
  onHoldComplete,
  onRestComplete,
  onAllComplete,
} = {}) {
  const [state, setState] = useState('idle');        // 'idle' | 'holding' | 'resting' | 'done'
  const [timeRemaining, setTimeRemaining] = useState(0); // milliseconds
  const [currentSet, setCurrentSet] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for timing mechanics
  const endTimeRef = useRef(0);
  const rafRef = useRef(null);
  const remainingOnPauseRef = useRef(0);

  // Refs for the latest callback values so the tick closure always sees current values
  const stateRef = useRef(state);
  const currentSetRef = useRef(currentSet);
  const onHoldCompleteRef = useRef(onHoldComplete);
  const onRestCompleteRef = useRef(onRestComplete);
  const onAllCompleteRef = useRef(onAllComplete);

  // Keep refs in sync
  stateRef.current = state;
  currentSetRef.current = currentSet;
  onHoldCompleteRef.current = onHoldComplete;
  onRestCompleteRef.current = onRestComplete;
  onAllCompleteRef.current = onAllComplete;

  // Cancel any pending animation frame
  const cancelFrame = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Start the resting phase
  const startResting = useCallback(() => {
    setState('resting');
    stateRef.current = 'resting';
    endTimeRef.current = performance.now() + restSeconds * 1000;
    setTimeRemaining(restSeconds * 1000);
  }, [restSeconds]);

  // The core tick – runs every animation frame
  const tick = useCallback(() => {
    const remaining = Math.max(0, endTimeRef.current - performance.now());
    setTimeRemaining(remaining);

    if (remaining > 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // --- Timer reached zero ---
    const currentState = stateRef.current;
    const set = currentSetRef.current;

    if (currentState === 'holding') {
      // Hold phase complete
      onHoldCompleteRef.current?.(set);

      const hasMoreSets = set < totalSets;

      if (hasMoreSets && autoStartRest) {
        // Automatically transition to rest
        startResting();
        rafRef.current = requestAnimationFrame(tick);
      } else if (hasMoreSets) {
        // Manual rest mode – go to idle so user can trigger rest / next action
        setState('idle');
        stateRef.current = 'idle';
        setTimeRemaining(0);
      } else {
        // Final set complete – all done
        setState('done');
        stateRef.current = 'done';
        setTimeRemaining(0);
        onAllCompleteRef.current?.();
      }
    } else if (currentState === 'resting') {
      // Rest phase complete
      onRestCompleteRef.current?.(set);

      const nextSet = set + 1;

      if (nextSet <= totalSets) {
        // More sets remain – go to idle, ready for next hold
        setCurrentSet(nextSet);
        currentSetRef.current = nextSet;
        setState('idle');
        stateRef.current = 'idle';
        setTimeRemaining(0);
      } else {
        // All sets finished
        setCurrentSet(nextSet - 1); // keep at final set number
        setState('done');
        stateRef.current = 'done';
        setTimeRemaining(0);
        onAllCompleteRef.current?.();
      }
    }
  }, [totalSets, autoStartRest, startResting]);

  // --- Public API ---

  /** Start (or restart) the hold phase for the current set. */
  const start = useCallback(() => {
    cancelFrame();
    setIsPaused(false);
    setState('holding');
    stateRef.current = 'holding';
    endTimeRef.current = performance.now() + holdSeconds * 1000;
    setTimeRemaining(holdSeconds * 1000);
    rafRef.current = requestAnimationFrame(tick);
  }, [holdSeconds, tick, cancelFrame]);

  /** Pause the active countdown. */
  const pause = useCallback(() => {
    if (stateRef.current !== 'holding' && stateRef.current !== 'resting') return;
    cancelFrame();
    remainingOnPauseRef.current = Math.max(0, endTimeRef.current - performance.now());
    setTimeRemaining(remainingOnPauseRef.current);
    setIsPaused(true);
  }, [cancelFrame]);

  /** Resume from pause. */
  const resume = useCallback(() => {
    if (!isPaused) return;
    setIsPaused(false);
    endTimeRef.current = performance.now() + remainingOnPauseRef.current;
    rafRef.current = requestAnimationFrame(tick);
  }, [isPaused, tick]);

  /** Skip the rest phase and go to idle for the next set. */
  const skipRest = useCallback(() => {
    if (stateRef.current !== 'resting') return;
    cancelFrame();
    setIsPaused(false);

    onRestCompleteRef.current?.(currentSetRef.current);
    const nextSet = currentSetRef.current + 1;

    if (nextSet <= totalSets) {
      setCurrentSet(nextSet);
      currentSetRef.current = nextSet;
      setState('idle');
      stateRef.current = 'idle';
      setTimeRemaining(0);
    } else {
      setState('done');
      stateRef.current = 'done';
      setTimeRemaining(0);
      onAllCompleteRef.current?.();
    }
  }, [totalSets, cancelFrame]);

  /** Skip to the next set (skips whatever phase is active). */
  const skipToNextSet = useCallback(() => {
    cancelFrame();
    setIsPaused(false);

    const set = currentSetRef.current;
    const currentState = stateRef.current;

    // Fire appropriate completion callback for the skipped phase
    if (currentState === 'holding') {
      onHoldCompleteRef.current?.(set);
    } else if (currentState === 'resting') {
      onRestCompleteRef.current?.(set);
    }

    const nextSet = set + 1;

    if (nextSet <= totalSets) {
      setCurrentSet(nextSet);
      currentSetRef.current = nextSet;
      setState('idle');
      stateRef.current = 'idle';
      setTimeRemaining(0);
    } else {
      setState('done');
      stateRef.current = 'done';
      setTimeRemaining(0);
      onAllCompleteRef.current?.();
    }
  }, [totalSets, cancelFrame]);

  /** Full reset back to initial state. */
  const reset = useCallback(() => {
    cancelFrame();
    setIsPaused(false);
    setState('idle');
    stateRef.current = 'idle';
    setCurrentSet(1);
    currentSetRef.current = 1;
    setTimeRemaining(0);
    endTimeRef.current = 0;
    remainingOnPauseRef.current = 0;
  }, [cancelFrame]);

  /** Set the starting set number before the timer has been started (idle state only). */
  const setInitialSet = useCallback((set) => {
    setCurrentSet(set);
    currentSetRef.current = set;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => cancelFrame();
  }, [cancelFrame]);

  return {
    state,
    timeRemaining,
    currentSet,
    isPaused,
    start,
    pause,
    resume,
    skipRest,
    skipToNextSet,
    reset,
    setInitialSet,
  };
}
