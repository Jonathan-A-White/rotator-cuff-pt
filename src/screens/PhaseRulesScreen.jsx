import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { phaseRules } from '../data/phases'
import { getSettings } from '../db'

export default function PhaseRulesScreen() {
  const navigate = useNavigate()
  const [currentPhase, setCurrentPhase] = useState(1)
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then((s) => {
      const phase = s.currentPhase || 1
      setCurrentPhase(phase)
      setExpandedPhase(phase)
      setLoading(false)
    })
  }, [])

  const phases = [1, 2, 3]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-enter px-4 pt-4 pb-24 max-w-lg mx-auto">
      {/* Back button + title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2 text-muted dark:text-muted-dark hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold dark:text-white">Phase Rules</h1>
      </div>

      {/* Current phase highlighted card */}
      <div className="mb-4 bg-teal/10 dark:bg-teal/15 border border-teal/30 dark:border-teal/40 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal text-white">
          Phase {currentPhase}
        </span>
        <div>
          <p className="text-sm font-semibold text-teal dark:text-teal-light">
            {phaseRules[currentPhase]?.name}
          </p>
          <p className="text-xs text-muted dark:text-muted-dark">
            Current phase &middot; Weeks {phaseRules[currentPhase]?.weeks}
          </p>
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-3">
        {phases.map((phase) => {
          const rules = phaseRules[phase]
          if (!rules) return null

          const isCurrent = phase === currentPhase
          const isExpanded = expandedPhase === phase

          return (
            <div
              key={phase}
              className={`bg-white dark:bg-[#2C2C2E] border rounded-xl overflow-hidden transition-colors ${
                isCurrent
                  ? 'border-teal dark:border-teal'
                  : 'border-[#E5E5E5] dark:border-[#3A3A3C]'
              }`}
            >
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between p-4 touch-target min-h-[48px] text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      isCurrent
                        ? 'bg-teal text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-muted dark:text-muted-dark'
                    }`}
                  >
                    Phase {phase}
                  </span>
                  <div>
                    <p className={`font-medium text-sm ${isCurrent ? 'dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {rules.name}
                    </p>
                    <p className="text-xs text-muted dark:text-muted-dark">
                      Weeks {rules.weeks}
                    </p>
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-5 h-5 text-muted dark:text-muted-dark transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded rules list */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[#E5E5E5] dark:border-[#3A3A3C] pt-3">
                  <ul className="space-y-2.5" role="list">
                    {rules.rules.map((rule, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm leading-relaxed dark:text-white"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            isCurrent ? 'bg-teal' : 'bg-gray-400 dark:bg-gray-600'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
