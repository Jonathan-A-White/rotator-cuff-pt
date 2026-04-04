import { useState, useEffect, useMemo } from 'react'
import { useProgram } from '../config/ProgramContext'
import { buildInitialAssessmentForm } from '../config/schema'
import { getAssessments, saveAssessment } from '../db'
import { today, formatDate } from '../utils/dateUtils'
import PainSlider from '../components/PainSlider'

function getTrend(current, previous) {
  if (current > previous) return { arrow: '\u2191', label: 'worse', color: 'text-red dark:text-red-400' }
  if (current < previous) return { arrow: '\u2193', label: 'better', color: 'text-green-600 dark:text-green-400' }
  return { arrow: '\u2192', label: 'same', color: 'text-muted dark:text-muted-dark' }
}

export default function AssessmentScreen() {
  const { assessmentSections, assessmentSummaryFields } = useProgram()
  const INITIAL_FORM = useMemo(() => buildInitialAssessmentForm(assessmentSections), [assessmentSections])
  const [tab, setTab] = useState('new') // 'new' | 'history'
  const [form, setForm] = useState(() => buildInitialAssessmentForm(assessmentSections))
  const [collapsedSections, setCollapsedSections] = useState({})
  const [assessments, setAssessments] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [highlightId, setHighlightId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getAssessments()
        if (!cancelled) setAssessments(data)
      } catch (err) {
        console.error('Failed to load assessments:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const entry = { date: today() }
      for (const section of assessmentSections) {
        // Skip collapsible sections that are collapsed (user didn't fill them in)
        const isCollapsed = section.collapsible && collapsedSections[section.id] !== true
        for (const field of section.fields || []) {
          const val = form[field.id]
          if (section.collapsible && isCollapsed) {
            entry[field.id] = null
          } else if (field.type === 'number') {
            entry[field.id] = val !== '' && val != null ? Number(val) : null
          } else {
            entry[field.id] = val
          }
        }
      }

      const saved = await saveAssessment(entry)
      const updated = await getAssessments()
      setAssessments(updated)
      setHighlightId(saved.id)
      setForm({ ...INITIAL_FORM })
      setCollapsedSections({})
      setTab('history')
    } catch (err) {
      console.error('Failed to save assessment:', err)
    } finally {
      setSaving(false)
    }
  }

  const painMetrics = assessmentSummaryFields

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-5 dark:text-white">Assessment</h1>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'new', label: 'New Assessment' },
          { id: 'history', label: 'History' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-teal text-white'
                : 'bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-muted dark:text-muted-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── New Assessment Form ── */}
      {tab === 'new' && (
        <div className="space-y-6">
          {assessmentSections.map((section) => {
            const isCollapsible = !!section.collapsible
            const isOpen = !isCollapsible || collapsedSections[section.id] === true

            const renderField = (field) => {
              if (field.type === 'pain_scale') {
                return (
                  <PainSlider
                    key={field.id}
                    label={field.label}
                    value={form[field.id] || 0}
                    onChange={(v) => updateField(field.id, v)}
                  />
                )
              }
              if (field.type === 'number') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={field.min ?? 0}
                      max={field.max ?? undefined}
                      placeholder={field.placeholder || ''}
                      value={form[field.id] ?? ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-base dark:text-white placeholder-gray-400"
                    />
                  </div>
                )
              }
              if (field.type === 'select') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {field.label}
                    </label>
                    <div className={`grid grid-cols-${Math.min(field.options.length, 3)} gap-2`}>
                      {field.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => updateField(field.id, option)}
                          className={`min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
                            form[field.id] === option
                              ? 'bg-teal text-white'
                              : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              if (field.type === 'text') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.label}
                    </label>
                    <textarea
                      value={form[field.id] || ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      rows={3}
                      placeholder={field.placeholder || ''}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-base dark:text-white placeholder-gray-400 resize-none"
                    />
                  </div>
                )
              }
              return null
            }

            if (isCollapsible) {
              return (
                <div key={section.id} className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-4">
                  <button
                    onClick={() => setCollapsedSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                    className="flex items-center justify-between w-full min-h-[48px]"
                  >
                    <span className="text-sm font-semibold dark:text-white">{section.label || section.id} (optional)</span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 text-muted dark:text-muted-dark transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="space-y-4">
                      {section.fields.map(renderField)}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={section.id} className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-4">
                {section.fields.map(renderField)}
              </div>
            )
          })}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full min-h-[48px] bg-teal text-white font-semibold rounded-2xl py-4 text-base transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>
        </div>
      )}

      {/* ── History View ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {assessments.length === 0 ? (
            <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-6 text-center">
              <p className="text-muted dark:text-muted-dark">No assessments recorded yet.</p>
            </div>
          ) : (
            assessments.map((assessment, idx) => {
              const prev = idx < assessments.length - 1 ? assessments[idx + 1] : null
              const isExpanded = expandedId === assessment.id
              const isHighlighted = highlightId === assessment.id

              return (
                <div
                  key={assessment.id}
                  className={`bg-white dark:bg-[#2C2C2E] border rounded-2xl overflow-hidden transition-all ${
                    isHighlighted
                      ? 'border-teal dark:border-teal-light ring-2 ring-teal/20'
                      : 'border-[#E5E5E5] dark:border-[#3A3A3C]'
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
                    className="w-full min-h-[48px] px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold dark:text-white">{formatDate(assessment.date)}</div>
                      <div className="flex items-center gap-3 text-sm text-muted dark:text-muted-dark">
                        <span>
                          Arc: {assessment.painfulArc}/10
                          {prev && (
                            <span className={`ml-1 ${getTrend(assessment.painfulArc, prev.painfulArc).color}`}>
                              {getTrend(assessment.painfulArc, prev.painfulArc).arrow}
                            </span>
                          )}
                        </span>
                        <span>
                          Daily: {assessment.averageDailyPain}/10
                          {prev && (
                            <span className={`ml-1 ${getTrend(assessment.averageDailyPain, prev.averageDailyPain).color}`}>
                              {getTrend(assessment.averageDailyPain, prev.averageDailyPain).arrow}
                            </span>
                          )}
                        </span>
                        <span className="capitalize">
                          Sleep: {assessment.sleepQuality}
                        </span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 flex-shrink-0 text-muted dark:text-muted-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-[#E5E5E5] dark:border-[#3A3A3C]">
                      <div className="space-y-2 mt-3">
                        {painMetrics.map(({ key, label }) => {
                          const val = assessment[key]
                          if (val == null) return null
                          const trend = prev && prev[key] != null ? getTrend(val, prev[key]) : null
                          return (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-muted dark:text-muted-dark">{label}</span>
                              <span className="font-semibold dark:text-white">
                                {val}/10
                                {trend && (
                                  <span className={`ml-1 ${trend.color}`}>{trend.arrow}</span>
                                )}
                              </span>
                            </div>
                          )
                        })}

                        {assessment.painfulArcStartDeg != null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted dark:text-muted-dark">Arc Start Degree</span>
                            <span className="font-semibold dark:text-white">{assessment.painfulArcStartDeg}&deg;</span>
                          </div>
                        )}

                        {assessment.liftOffInches != null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted dark:text-muted-dark">Lift-Off Inches</span>
                            <span className="font-semibold dark:text-white">{assessment.liftOffInches} in</span>
                          </div>
                        )}

                        {assessment.deadHangPain != null && (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted dark:text-muted-dark">Dead Hang</span>
                              <span className="font-semibold dark:text-white">
                                {assessment.deadHangPain}/10
                                {prev && prev.deadHangPain != null && (
                                  <span className={`ml-1 ${getTrend(assessment.deadHangPain, prev.deadHangPain).color}`}>
                                    {getTrend(assessment.deadHangPain, prev.deadHangPain).arrow}
                                  </span>
                                )}
                              </span>
                            </div>
                            {assessment.deadHangDuration != null && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted dark:text-muted-dark">Hang Duration</span>
                                <span className="font-semibold dark:text-white">{assessment.deadHangDuration}s</span>
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted dark:text-muted-dark">Sleep Quality</span>
                          <span className="font-semibold dark:text-white capitalize">{assessment.sleepQuality}</span>
                        </div>

                        {assessment.notes && (
                          <div className="pt-2 mt-2 border-t border-[#E5E5E5] dark:border-[#3A3A3C]">
                            <p className="text-sm text-muted dark:text-muted-dark whitespace-pre-wrap">{assessment.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
