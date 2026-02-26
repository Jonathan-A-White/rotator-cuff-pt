import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getSettings, getLogsInRange } from '../db'
import { today, daysAgo, getWeekDates, dayOfWeek, daysBetween } from '../utils/dateUtils'

export default function ProgressScreen() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [logs, setLogs] = useState([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [s, rangeLogs] = await Promise.all([
          getSettings(),
          getLogsInRange(daysAgo(30), today()),
        ])
        if (cancelled) return

        setSettings(s)
        setLogs(rangeLogs)

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
  }, [])

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

  // Per-day set totals for weekly chart
  const perDay = weekDates.map((date) => {
    const dayLogs = weekLogs.filter((l) => l.date === date)
    const totalSets = dayLogs.reduce((sum, l) => sum + (l.setsCompleted || 1), 0)
    return { date, day: dayOfWeek(date), totalSets }
  })
  const maxSets = Math.max(...perDay.map((d) => d.totalSets), 1)

  // Per-exercise completion rates for the last 7 days
  const last7Start = daysAgo(6)
  const last7Logs = logs.filter((l) => l.date >= last7Start && l.date <= today())

  const exerciseCompletion = phaseExercises.map((ex) => {
    const exLogs = last7Logs.filter((l) => l.exerciseId === ex.id)
    // Count unique days with at least one log
    const daysWithLogs = new Set(exLogs.map((l) => l.date)).size
    const pct = Math.round((daysWithLogs / 7) * 100)
    return { id: ex.id, name: ex.shortName || ex.name, pct }
  })

  // Phase info
  const phaseLabels = {
    1: { name: 'Pain Reduction & Isometric Loading', weeks: 'Weeks 1-2' },
    2: { name: 'Isotonic Strengthening', weeks: 'Weeks 3-6' },
    3: { name: 'Pull-Up Return', weeks: 'Weeks 7-12+' },
  }
  const phaseInfo = phaseLabels[currentPhase]

  // SVG bar chart dimensions
  const chartHeight = 120
  const barGap = 4

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold dark:text-white">Progress</h1>

      {/* ── Streak Tracker ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 flex items-center gap-4">
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
        <div>
          <div className="text-4xl font-bold tabular-nums dark:text-white">{streak}</div>
          <div className="text-sm text-muted dark:text-muted-dark">day streak</div>
        </div>
      </div>

      {/* ── Weekly Chart (SVG bars) ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-4 dark:text-white">This Week</h2>
        <svg
          viewBox={`0 0 ${perDay.length * 50} ${chartHeight + 40}`}
          className="w-full"
          role="img"
          aria-label="Weekly sets bar chart"
        >
          {perDay.map(({ date, day, totalSets }, i) => {
            const barWidth = 36
            const x = i * 50 + (50 - barWidth) / 2
            const barH = totalSets > 0 ? (totalSets / maxSets) * chartHeight : 4
            const barY = chartHeight - barH
            const isToday = date === today()

            return (
              <g key={date}>
                {/* Count label above bar */}
                {totalSets > 0 && (
                  <text
                    x={i * 50 + 25}
                    y={barY - 4}
                    textAnchor="middle"
                    className="fill-muted dark:fill-muted-dark"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {totalSets}
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
                      : totalSets > 0
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
            <div key={id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm truncate pr-2 dark:text-gray-200">{name}</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    pct < 50 ? 'text-amber' : 'text-teal dark:text-teal-light'
                  }`}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct < 50 ? 'bg-amber' : 'bg-teal dark:bg-teal-light'
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
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

      {/* ── Links ── */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/assessment')}
          className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium dark:text-white">Assessment History</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {currentPhase >= 3 && (
          <button
            onClick={() => navigate('/checklist')}
            className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
          >
            <span className="font-medium dark:text-white">Return-to-Pull-Ups Checklist</span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
