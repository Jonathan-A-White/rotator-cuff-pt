import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { phaseRules } from '../data/phases'
import { getSettings } from '../db'

export default function PhaseRulesScreen() {
  const navigate = useNavigate()
  const [currentPhase, setCurrentPhase] = useState(1)
  const [expandedPhase, setExpandedPhase] = useState(null)

  useEffect(() => {
    getSettings().then(s => {
      setCurrentPhase(s.currentPhase || 1)
      setExpandedPhase(s.currentPhase || 1)
    })
  }, [])

  const phases = [1, 2, 3]

  return (
    <div className="page-enter px-4 pt-4 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-muted dark:text-muted-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold dark:text-white">Phase Rules</h1>
      </div>

      <div className="space-y-3">
        {phases.map(phase => {
          const rules = phaseRules[phase]
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
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                className="w-full flex items-center justify-between p-4 touch-target text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    isCurrent ? 'bg-teal text-white' : 'bg-gray-100 dark:bg-gray-800 text-muted dark:text-muted-dark'
                  }`}>
                    Phase {phase}
                  </span>
                  <div>
                    <p className="font-medium text-sm dark:text-white">{rules.name}</p>
                    <p className="text-xs text-muted dark:text-muted-dark">Weeks {rules.weeks}</p>
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`w-5 h-5 text-muted dark:text-muted-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[#E5E5E5] dark:border-[#3A3A3C] pt-3">
                  <ul className="space-y-2.5">
                    {rules.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm dark:text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 shrink-0" />
                        {rule}
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
