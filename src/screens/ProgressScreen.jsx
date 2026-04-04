import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgram } from '../config/ProgramContext'
import { extractPainFields } from '../config/schema'
import { getSettings, getLogsInRange, getAssessments, backfillPhaseStartDate } from '../db'
import { today, daysAgo, getWeekDates, dayOfWeek } from '../utils/dateUtils'
import { evaluatePhaseReadiness } from '../utils/phaseReadiness'

export default function ProgressScreen() {
  const navigate = useNavigate()
  const { exercises, phases, phaseMap, progressionRules, assessmentSections } = useProgram()
  const [settings, setSettings] = useState(null)
  const [logs, setLogs] = useState([])
  const [streak, setStreak] = useState(0)
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [s, rangeLogs, assessments] = await Promise.all([
          getSettings(),
          getLogsInRange(daysAgo(30), today()),
          getAssessments(),
        ])
        if (cancelled) return

        // Backfill phaseStartDate from earliest log if missing
        await backfillPhaseStartDate(s)

        setSettings(s)
        setLogs(rangeLogs)

        // Evaluate phase readiness
        const recentAssessments = assessments.filter((a) => a.date >= daysAgo(30))
        const readinessResult = evaluatePhaseReadiness(
          s.currentPhase,
          s.phaseStartDate,
          today(),
          rangeLogs,
          recentAssessments,
          {
            exercises,
            progressionRules,
            painFields: extractPainFields(assessmentSections),
          }
        )
        setReadiness(readinessResult)

        // Calculate streak by iterating backward from today
        let currentStreak = 0
        let day = 0
        while (true) {
          const dateStr = daysAgo(day)
          const hasLog = rangeLogs.some((l) => l.date === dateStr)
          if (hasLog) {
            currentStreak++
            day++
          } else {
            // If today has no logs yet, skip today and check yesterday onward
            if (day === 0) {
              day++
              continue
            }
            break
          }
        }
        setStreak(currentStreak)
      } catch (err) {
        console.error('Failed to load progress data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [exercises, progressionRules, assessmentSections])

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentPhase = settings.currentPhase || 1

  // Phase exercises (cumulative)
  const phaseExercises = exercises
    .filter((e) => e.phase <= currentPhase)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Weekly data
  const weekDates = getWeekDates()
  const weekLogs = logs.filter((l) => weekDates.includes(l.date))

  // Per-day exercises-completed count for weekly chart (normalized so every
  // exercise counts equally regardless of how many sets it requires).
  const perDay = weekDates.map((date) => {
    const dayLogs = weekLogs.filter((l) => l.date === date)
    const exercisesCompleted = phaseExercises.filter((ex) => {
      const setsForEx = dayLogs
        .filter((l) => l.exerciseId === ex.id)
        .reduce((sum, l) => sum + (l.setsCompleted || 0), 0)
      return setsForEx >= ex.sets
    }).length
    return { date, day: dayOfWeek(date), exercisesCompleted }
  })
  const maxCompleted = Math.max(...perDay.map((d) => d.exercisesCompleted), 1)

  // Per-exercise completion rates for the last 7 days
  const last7Start = daysAgo(6)
  const last7Logs = logs.filter((l) => l.date >= last7Start && l.date <= today())

  const exerciseCompletion = phaseExercises.map((ex) => {
    const exLogs = last7Logs.filter((l) => l.exerciseId === ex.id)
    const totalSetsCompleted = exLogs.reduce((sum, l) => sum + (l.setsCompleted || 0), 0)
    const totalExpected = (ex.sets || 1) * 7
    const pct = Math.round((totalSetsCompleted / totalExpected) * 100)
    return { id: ex.id, name: ex.shortName || ex.name, pct }
  })

  // Phase info
  const phaseInfo = phaseMap[currentPhase] || { name: '', weeks: '' }

  // SVG bar chart dimensions
  const chartHeight = 120

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold dark:text-white">Progress</h1>

      {/* ── Streak Tracker ── */}
      <button
        onClick={() => navigate('/history')}
        className="w-full bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 flex items-center gap-4 text-left hover:border-teal/30 transition-colors"
      >
        <div aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
            <path
              d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z"
              fill={streak > 0 ? '#F59E0B' : '#9CA3AF'}
              stroke={streak > 0 ? '#D97706' : '#6B7280'}
              strokeWidth="1.5"
            />
            <path
              d="M12 22c-1.657 0-3-1.343-3-3 0-2 3-4 3-4s3 2 3 4c0 1.657-1.343 3-3 3z"
              fill={streak > 0 ? '#EF4444' : '#9CA3AF'}
              opacity="0.7"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-4xl font-bold tabular-nums dark:text-white">{streak}</div>
          <div className="text-sm text-muted dark:text-muted-dark">day streak</div>
        </div>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── Weekly Chart (SVG bars) ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-4 dark:text-white">This Week</h2>
        <svg
          viewBox={`0 0 ${perDay.length * 50} ${chartHeight + 40}`}
          className="w-full"
          role="img"
          aria-label="Weekly sets bar chart"
        >
          {perDay.map(({ date, day, exercisesCompleted }, i) => {
            const barWidth = 36
            const x = i * 50 + (50 - barWidth) / 2
            const barH = exercisesCompleted > 0 ? (exercisesCompleted / maxCompleted) * chartHeight : 4
            const barY = chartHeight - barH
            const isToday = date === today()

            return (
              <g
                key={date}
                onClick={() => exercisesCompleted > 0 && navigate(`/history?date=${date}`)}
                className={exercisesCompleted > 0 ? 'cursor-pointer' : ''}
                role={exercisesCompleted > 0 ? 'button' : undefined}
                tabIndex={exercisesCompleted > 0 ? 0 : undefined}
                aria-label={exercisesCompleted > 0 ? `View ${day} history: ${exercisesCompleted} exercises` : undefined}
              >
                {/* Hit area (invisible wider rect for easier tapping) */}
                <rect x={i * 50} y={0} width={50} height={chartHeight + 30} fill="transparent" />
                {/* Count label above bar */}
                {exercisesCompleted > 0 && (
                  <text
                    x={i * 50 + 25}
                    y={barY - 4}
                    textAnchor="middle"
                    className="fill-muted dark:fill-muted-dark"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {exercisesCompleted}/{phaseExercises.length}
                  </text>
                )}
                {/* Bar */}
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  fill={
                    isToday
                      ? '#0D9488'
                      : exercisesCompleted > 0
                      ? 'rgba(13,148,136,0.5)'
                      : '#D1D5DB'
                  }
                />
                {/* Day label below */}
                <text
                  x={i * 50 + 25}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill={isToday ? '#0D9488' : '#6B7280'}
                >
                  {day}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Exercise Balance ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-4 dark:text-white">Exercise Balance (7 days)</h2>
        <div className="space-y-3">
          {exerciseCompletion.map(({ id, name, pct }) => (
            <button
              key={id}
              onClick={() => navigate(`/history/${id}`)}
              className="w-full space-y-1 text-left hover:bg-gray-50 dark:hover:bg-[#3A3A3C]/50 -mx-1 px-1 py-1 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm truncate pr-2 dark:text-gray-200">{name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      pct < 50 ? 'text-amber' : 'text-teal dark:text-teal-light'
                    }`}
                  >
                    {pct}%
                  </span>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct < 50 ? 'bg-amber' : 'bg-teal dark:bg-teal-light'
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </button>
          ))}
          {exerciseCompletion.length === 0 && (
            <p className="text-sm text-muted dark:text-muted-dark">No exercises for this phase.</p>
          )}
        </div>
      </div>

      {/* ── Phase Progress ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-2 dark:text-white">Current Phase</h2>
        <p className="text-teal dark:text-teal-light font-semibold">
          Phase {currentPhase} &middot; {phaseInfo.weeks}
        </p>
        <p className="text-sm text-muted dark:text-muted-dark mt-1">{phaseInfo.name}</p>
      </div>

      {/* ── Phase Readiness ── */}
      {readiness && (
        <div className={`border rounded-2xl p-5 ${
          readiness.canProgress
            ? 'bg-teal/5 dark:bg-teal/10 border-teal/30'
            : 'bg-white dark:bg-[#2C2C2E] border-[#E5E5E5] dark:border-[#3A3A3C]'
        }`}>
          <h2 className="text-base font-semibold mb-1 dark:text-white">
            Phase {readiness.nextPhase} Readiness
          </h2>
          <p className="text-xs text-muted dark:text-muted-dark mb-4">
            {readiness.canProgress
              ? 'All criteria met — you may be ready to advance!'
              : 'Track your progress toward the next phase.'}
          </p>

          <div className="space-y-4">
            {Object.values(readiness.pillars).map((pillar) => {
              const pct = pillar.current == null
                ? 0
                : pillar.unit === '%'
                  ? Math.min(pillar.current, 100)
                  : pillar.unit === 'days'
                    ? Math.min(Math.round((pillar.current / pillar.required) * 100), 100)
                    : pillar.met ? 100 : Math.max(0, Math.round((1 - (pillar.current - pillar.required) / 10) * 100))
              const displayPct = Math.max(0, Math.min(100, pct))

              return (
                <div key={pillar.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        pillar.met
                          ? 'bg-teal text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {pillar.met ? (
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span>&middot;</span>
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-gray-200">{pillar.label}</span>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${
                      pillar.met ? 'text-teal dark:text-teal-light' : 'text-muted dark:text-muted-dark'
                    }`}>
                      {pillar.current != null
                        ? `${pillar.current}${pillar.unit === '%' ? '%' : pillar.unit === 'days' ? `/${pillar.required} days` : ` ${pillar.unit}`}`
                        : `—`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pillar.met ? 'bg-teal dark:bg-teal-light' : 'bg-amber'
                      }`}
                      style={{ width: `${displayPct}%` }}
                    />
                  </div>
                  {pillar.detail && (
                    <p className="text-xs text-muted dark:text-muted-dark mt-1">{pillar.detail}</p>
                  )}
                </div>
              )
            })}
          </div>

          {readiness.canProgress && (
            <button
              onClick={() => navigate('/settings')}
              className="mt-4 w-full min-h-[48px] rounded-xl text-sm font-semibold bg-teal text-white transition-colors"
            >
              Go to Settings to Advance
            </button>
          )}
        </div>
      )}

      {/* ── Links ── */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/history')}
          className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium dark:text-white">Exercise History</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => navigate('/assessment')}
          className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium dark:text-white">Assessment History</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {phases.some(p => p.checklists?.length > 0) && currentPhase >= phases.find(p => p.checklists?.length > 0)?.id && (
          <button
            onClick={() => navigate('/checklist')}
            className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
          >
            <span className="font-medium dark:text-white">Milestone Checklist</span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
