import { useState, useEffect } from 'react'
import { getAssessments, saveAssessment } from '../db'
import { today, formatDate } from '../utils/dateUtils'
import PainSlider from '../components/PainSlider'

const INITIAL_FORM = {
  painfulArc: 0,
  painfulArcStartDeg: '',
  emptyCan: 0,
  resistedER: 0,
  liftOffPositioning: 0,
  liftOffLifting: 0,
  liftOffInches: '',
  crossBodyAdduction: 0,
  jacketTest: 0,
  deadHangPain: 0,
  deadHangDuration: '',
  averageDailyPain: 0,
  sleepQuality: 'Good',
  notes: '',
}

function getTrend(current, previous) {
  if (current > previous) return { arrow: '\u2191', label: 'worse', color: 'text-red dark:text-red-400' }
  if (current < previous) return { arrow: '\u2193', label: 'better', color: 'text-green-600 dark:text-green-400' }
  return { arrow: '\u2192', label: 'same', color: 'text-muted dark:text-muted-dark' }
}

export default function AssessmentScreen() {
  const [tab, setTab] = useState('new') // 'new' | 'history'
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [showDeadHang, setShowDeadHang] = useState(false)
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
      const entry = {
        date: today(),
        painfulArc: form.painfulArc,
        painfulArcStartDeg: form.painfulArcStartDeg ? Number(form.painfulArcStartDeg) : null,
        emptyCan: form.emptyCan,
        resistedER: form.resistedER,
        liftOffPositioning: form.liftOffPositioning,
        liftOffLifting: form.liftOffLifting,
        liftOffInches: form.liftOffInches ? Number(form.liftOffInches) : null,
        crossBodyAdduction: form.crossBodyAdduction,
        jacketTest: form.jacketTest,
        deadHangPain: showDeadHang ? form.deadHangPain : null,
        deadHangDuration: showDeadHang && form.deadHangDuration ? Number(form.deadHangDuration) : null,
        averageDailyPain: form.averageDailyPain,
        sleepQuality: form.sleepQuality,
        notes: form.notes,
      }

      const saved = await saveAssessment(entry)
      const updated = await getAssessments()
      setAssessments(updated)
      setHighlightId(saved.id)
      setForm({ ...INITIAL_FORM })
      setShowDeadHang(false)
      setTab('history')
    } catch (err) {
      console.error('Failed to save assessment:', err)
    } finally {
      setSaving(false)
    }
  }

  const painMetrics = [
    { key: 'painfulArc', label: 'Painful Arc' },
    { key: 'emptyCan', label: 'Empty Can' },
    { key: 'resistedER', label: 'Resisted ER' },
    { key: 'liftOffPositioning', label: 'Lift-Off Pos.' },
    { key: 'liftOffLifting', label: 'Lift-Off Lift' },
    { key: 'crossBodyAdduction', label: 'Cross-Body' },
    { key: 'jacketTest', label: 'Jacket Test' },
    { key: 'averageDailyPain', label: 'Avg Daily Pain' },
  ]

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
          {/* Painful Arc */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-4">
            <PainSlider
              label="Painful Arc"
              value={form.painfulArc}
              onChange={(v) => updateField('painfulArc', v)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Painful Arc Start Degree
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={180}
                placeholder="e.g. 60"
                value={form.painfulArcStartDeg}
                onChange={(e) => updateField('painfulArcStartDeg', e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-base dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Empty Can */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <PainSlider
              label="Empty Can"
              value={form.emptyCan}
              onChange={(v) => updateField('emptyCan', v)}
            />
          </div>

          {/* Resisted ER */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <PainSlider
              label="Resisted External Rotation"
              value={form.resistedER}
              onChange={(v) => updateField('resistedER', v)}
            />
          </div>

          {/* Lift-Off */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-4">
            <PainSlider
              label="Lift-Off Positioning"
              value={form.liftOffPositioning}
              onChange={(v) => updateField('liftOffPositioning', v)}
            />
            <PainSlider
              label="Lift-Off Lifting"
              value={form.liftOffLifting}
              onChange={(v) => updateField('liftOffLifting', v)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lift-Off Inches
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="e.g. 4"
                value={form.liftOffInches}
                onChange={(e) => updateField('liftOffInches', e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-base dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Cross-Body Adduction */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <PainSlider
              label="Cross-Body Adduction"
              value={form.crossBodyAdduction}
              onChange={(v) => updateField('crossBodyAdduction', v)}
            />
          </div>

          {/* Jacket Test */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <PainSlider
              label="Jacket Test"
              value={form.jacketTest}
              onChange={(v) => updateField('jacketTest', v)}
            />
          </div>

          {/* Dead Hang (optional) */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-4">
            <button
              onClick={() => setShowDeadHang((p) => !p)}
              className="flex items-center justify-between w-full min-h-[48px]"
            >
              <span className="text-sm font-semibold dark:text-white">Dead Hang (optional)</span>
              <svg
                viewBox="0 0 24 24"
                className={`w-5 h-5 text-muted dark:text-muted-dark transition-transform ${showDeadHang ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showDeadHang && (
              <div className="space-y-4">
                <PainSlider
                  label="Dead Hang"
                  value={form.deadHangPain}
                  onChange={(v) => updateField('deadHangPain', v)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dead Hang Duration (seconds)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="e.g. 30"
                    value={form.deadHangDuration}
                    onChange={(e) => updateField('deadHangDuration', e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-base dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Average Daily Pain */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <PainSlider
              label="Average Daily Pain"
              value={form.averageDailyPain}
              onChange={(v) => updateField('averageDailyPain', v)}
            />
          </div>

          {/* Sleep Quality */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Sleep Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Good', 'Fair', 'Poor'].map((quality) => (
                <button
                  key={quality}
                  onClick={() => updateField('sleepQuality', quality)}
                  className={`min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
                    form.sleepQuality === quality
                      ? 'bg-teal text-white'
                      : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]'
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="Any observations, triggers, changes..."
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#3A3A3C] text-base dark:text-white placeholder-gray-400 resize-none"
            />
          </div>

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
