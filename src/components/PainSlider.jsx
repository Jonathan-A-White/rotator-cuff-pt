import { useMemo } from 'react';

/**
 * 0-10 pain scale slider with colour-coded gradient and descriptive labels.
 *
 * Green (0) -> Yellow (5) -> Red (10)
 */

function getDescriptor(value) {
  if (value === 0) return 'None';
  if (value <= 3) return 'Mild';
  if (value <= 6) return 'Moderate';
  return 'Severe';
}

function getDescriptorColor(value) {
  if (value === 0) return 'text-green-600 dark:text-green-400';
  if (value <= 3) return 'text-lime-600 dark:text-lime-400';
  if (value <= 6) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function PainSlider({ value = 0, onChange, label = 'Pain Level' }) {
  const descriptor = useMemo(() => getDescriptor(value), [value]);
  const descriptorColor = useMemo(() => getDescriptorColor(value), [value]);

  // Percentage for the filled portion of the track
  const pct = (value / 10) * 100;

  return (
    <div className="w-full space-y-2">
      {/* Header row: label + value */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className={`text-sm font-semibold ${descriptorColor}`}>
            {descriptor}
          </span>
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          aria-label={`${label}: ${value} out of 10, ${descriptor}`}
          className="w-full h-2 appearance-none rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-gray-400
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:relative
            [&::-webkit-slider-thumb]:z-10
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-gray-400
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
          "
          style={{
            background: `linear-gradient(to right,
              #22c55e 0%,
              #eab308 50%,
              #ef4444 100%)`,
          }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-muted dark:text-muted-dark px-0.5">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
