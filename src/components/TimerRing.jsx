/**
 * Circular countdown visualization.
 *
 * Renders an SVG ring whose stroke-dashoffset tracks the countdown progress,
 * with a large monospaced time readout in the centre.
 */
export default function TimerRing({
  timeRemaining = 0,
  totalTime = 1,
  size = 240,
  strokeWidth = 8,
  state = 'idle',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Avoid division by zero; clamp progress to [0, 1]
  const progress = totalTime > 0 ? Math.min(1, Math.max(0, timeRemaining / totalTime)) : 0;
  const dashOffset = circumference * (1 - progress);

  // Ring colour based on timer phase
  const ringColor =
    state === 'resting' ? 'var(--color-amber)' : 'var(--color-teal)';

  // Format milliseconds as MM:SS
  const totalSeconds = Math.ceil(timeRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // State label shown below the time
  const stateLabel = {
    idle: 'READY',
    holding: 'HOLD',
    resting: 'REST',
    done: 'DONE',
  }[state] ?? '';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          className="dark:stroke-[var(--color-border-dark)]"
        />

        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 0.1s linear',
          }}
        />
      </svg>

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {state === 'done' ? (
          <>
            {/* Checkmark */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-teal)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16"
            >
              <polyline points="4 12 10 18 20 6" />
            </svg>
            <span className="text-sm font-semibold tracking-widest text-teal mt-1 uppercase">
              {stateLabel}
            </span>
          </>
        ) : (
          <>
            <span
              className="timer-digits leading-none"
              style={{ fontSize: size * 0.22 }}
            >
              {display}
            </span>
            <span
              className={`
                text-sm font-semibold tracking-widest mt-1 uppercase
                ${state === 'resting' ? 'text-amber' : 'text-teal'}
              `}
            >
              {stateLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
