import { useRef, useCallback } from 'react';

/**
 * Exercise card for the home screen.
 *
 * Displays exercise info, completion progress, and a Start button.
 * Supports long-press (or info icon tap) to view exercise details.
 */
export default function ExerciseCard({
  exercise,
  setsCompleted = 0,
  onStart,
  onDetail,
  editMode = false,
  onAdjustSets,
}) {
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const {
    emoji = '',
    name = '',
    sets = 1,
    holdSeconds,
    reps,
  } = exercise || {};

  const totalSets = sets;
  const isComplete = setsCompleted >= totalSets;
  const progressPct = totalSets > 0 ? Math.min(100, (setsCompleted / totalSets) * 100) : 0;

  // Build target description like "5 x 45s hold" or "3 x 15 reps"
  const targetDesc = holdSeconds
    ? `${totalSets} \u00d7 ${holdSeconds}s hold`
    : reps
      ? `${totalSets} \u00d7 ${reps} reps`
      : `${totalSets} sets`;

  // Long-press handlers
  const handlePointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onDetail?.();
    }, 500);
  }, [onDetail]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      className={`
        relative rounded-xl p-4 shadow-sm
        bg-white dark:bg-[#2C2C2E]
        border border-gray-200 dark:border-[#3A3A3C]
        transition-colors duration-150
        ${isComplete ? 'bg-teal-50/40 dark:bg-teal-900/10 border-teal/30' : ''}
      `}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* Top row: emoji + info + detail button */}
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <span className="text-3xl leading-none select-none" aria-hidden="true">
          {emoji}
        </span>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold truncate">
              {name}
            </h3>
            {isComplete && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-teal)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 shrink-0"
                aria-label="Completed"
              >
                <polyline points="4 12 10 18 20 6" />
              </svg>
            )}
          </div>

          <p className="text-sm text-muted dark:text-muted-dark mt-0.5">
            {targetDesc}
          </p>

          {/* Progress row */}
          <div className="mt-2 flex items-center gap-2">
            {/* Progress bar */}
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-[#3A3A3C] overflow-hidden">
              <div
                className="h-full rounded-full bg-teal transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted dark:text-muted-dark tabular-nums whitespace-nowrap">
              {setsCompleted}/{totalSets} sets
            </span>
          </div>
        </div>

        {/* Info / detail icon button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDetail?.();
          }}
          aria-label={`Details for ${name}`}
          className="
            touch-target min-h-[48px] min-w-[48px]
            flex items-center justify-center
            -mr-2 -mt-1
            text-muted dark:text-muted-dark
            hover:text-gray-700 dark:hover:text-gray-300
            transition-colors
          "
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      </div>

      {/* Edit mode controls or Start button */}
      {editMode ? (
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdjustSets?.(-1);
            }}
            disabled={setsCompleted <= 0}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              text-lg font-bold transition-colors
              ${setsCompleted <= 0
                ? 'bg-gray-200 dark:bg-[#3A3A3C] text-gray-400 dark:text-gray-600 cursor-default'
                : 'bg-red/10 text-red hover:bg-red/20 active:bg-red/30 border border-red/30'
              }
            `}
            aria-label={`Decrease sets for ${name}`}
          >
            &minus;
          </button>
          <span className="text-lg font-bold tabular-nums min-w-[3ch] text-center dark:text-white">
            {setsCompleted}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdjustSets?.(1);
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-teal/10 text-teal hover:bg-teal/20 active:bg-teal/30 border border-teal/30 transition-colors"
            aria-label={`Increase sets for ${name}`}
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isLongPress.current) onStart?.();
          }}
          disabled={isComplete}
          className={`
            mt-3 w-full rounded-lg py-3
            text-sm font-semibold text-white
            touch-target min-h-[48px]
            transition-colors duration-150
            ${isComplete
              ? 'bg-gray-300 dark:bg-[#3A3A3C] text-gray-500 dark:text-gray-500 cursor-default'
              : 'bg-teal hover:bg-teal-light active:bg-teal/90 cursor-pointer'
            }
          `}
        >
          {isComplete ? 'Completed' : 'Start'}
        </button>
      )}
    </div>
  );
}
