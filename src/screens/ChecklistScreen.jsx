import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pullUpChecklist } from '../data/phases'
import { getChecklistState, setChecklistItem } from '../db'

export default function ChecklistScreen() {
  const navigate = useNavigate()
  const [checkedItems, setCheckedItems] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const state = await getChecklistState()
        const map = {}
        state.forEach((item) => {
          map[item.id] = item.checked
        })
        if (!cancelled) setCheckedItems(map)
      } catch (err) {
        console.error('Failed to load checklist:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleToggle(id) {
    const newValue = !checkedItems[id]
    setCheckedItems((prev) => ({ ...prev, [id]: newValue }))
    try {
      await setChecklistItem(id, newValue)
    } catch (err) {
      console.error('Failed to save checklist item:', err)
      // Revert on error
      setCheckedItems((prev) => ({ ...prev, [id]: !newValue }))
    }
  }

  const completedCount = pullUpChecklist.filter((item) => checkedItems[item.id]).length
  const totalCount = pullUpChecklist.length
  const allComplete = completedCount === totalCount

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-muted dark:text-muted-dark hover:text-teal transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold dark:text-white">Return-to-Pull-Ups</h1>
      </div>

      {/* Progress summary */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted dark:text-muted-dark">Progress</span>
          <span className={`text-lg font-bold tabular-nums ${allComplete ? 'text-teal dark:text-teal-light' : 'dark:text-white'}`}>
            {completedCount}/{totalCount} criteria met
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal dark:bg-teal-light rounded-full transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Congratulatory message */}
      {allComplete && (
        <div className="bg-teal/10 dark:bg-teal-light/10 border border-teal/30 dark:border-teal-light/30 rounded-2xl p-5 mb-5 text-center">
          <div className="text-3xl mb-2" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0D9488" strokeWidth="2" />
              <path d="M8 12l3 3 5-5" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-teal dark:text-teal-light mb-1">All Criteria Met!</h2>
          <p className="text-sm text-teal/80 dark:text-teal-light/80">
            You have met all the prerequisites for returning to pull-ups. Progress carefully and listen to your body.
          </p>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-2">
        {pullUpChecklist.map((item) => {
          const isChecked = !!checkedItems[item.id]
          return (
            <button
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-4 py-4 flex items-start gap-3 text-left transition-colors"
            >
              {/* Checkbox */}
              <div
                className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-teal border-teal dark:bg-teal-light dark:border-teal-light'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {isChecked && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm leading-snug ${
                  isChecked
                    ? 'text-muted dark:text-muted-dark line-through'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
