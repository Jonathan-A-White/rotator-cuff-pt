import { useState } from 'react';

/**
 * Collapsible exercise cue list with animated open/close.
 *
 * Displays a "Quick Cues" header with a chevron toggle and a bullet list of
 * coaching cues that expands/collapses with a max-height transition.
 */
export default function CueList({ cues = [], defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!cues.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-[#3A3A3C] overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="
          flex items-center justify-between w-full px-4 py-3
          text-sm font-semibold text-gray-700 dark:text-gray-300
          bg-gray-50 dark:bg-[#2C2C2E]
          touch-target min-h-[48px]
          transition-colors hover:bg-gray-100 dark:hover:bg-[#3A3A3C]
        "
      >
        <span>Quick Cues</span>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Collapsible body */}
      <div
        className="transition-[max-height] duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: isOpen ? `${cues.length * 3.5}rem` : '0' }}
      >
        <ul className="px-4 py-3 space-y-2" role="list">
          {cues.map((cue, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal"
                aria-hidden="true"
              />
              <span>{cue}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
