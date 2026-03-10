import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSettings, saveSettings, exportAllData, importData, validateImportData, clearAllData, backfillPhaseStartDate } from '../db'
import { today } from '../utils/dateUtils'

function Toggle({ enabled, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 min-w-[48px] min-h-[48px] items-center rounded-full transition-colors ${
        enabled ? 'bg-teal' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-[48px] py-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium dark:text-white">{label}</div>
        {description && (
          <div className="text-xs text-muted dark:text-muted-dark mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsScreen({ onDarkModeChange }) {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPhaseConfirm, setShowPhaseConfirm] = useState(null) // phase number or null
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(null) // { data, fileName } or null
  const [importStatus, setImportStatus] = useState(null) // { type: 'success'|'error', message: string } | null
  const [exportStatus, setExportStatus] = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await getSettings()
        // Backfill phaseStartDate from earliest log if missing
        await backfillPhaseStartDate(s)
        if (!cancelled) setSettings(s)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function updateSetting(key, value) {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    await saveSettings(updated)
  }

  async function handlePhaseChange(phase) {
    setShowPhaseConfirm(null)
    const updated = { ...settings, currentPhase: phase, phaseStartDate: today() }
    setSettings(updated)
    await saveSettings(updated)
  }

  async function handleNotificationToggle(enabled) {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        return // don't enable if denied
      }
    }
    await updateSetting('timerNotification', enabled)
  }

  function handleDarkModeChange(mode) {
    updateSetting('darkMode', mode)
    if (onDarkModeChange) onDarkModeChange(mode)
  }

  async function handleExportDownload() {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rcpt-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleExportShare() {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const fileName = `rcpt-backup-${new Date().toISOString().split('T')[0]}.json`
    const file = new File([json], fileName, { type: 'application/json' })
    await navigator.share({ files: [file] })
  }

  async function handleExport() {
    try {
      await handleExportDownload()
      setExportStatus('success')
      setTimeout(() => setExportStatus(null), 3000)
    } catch (err) {
      console.error('Export failed:', err)
      setExportStatus('error')
      setTimeout(() => setExportStatus(null), 3000)
    }
  }

  async function handleShareExport() {
    try {
      await handleExportShare()
      setExportStatus('success')
      setTimeout(() => setExportStatus(null), 3000)
    } catch (err) {
      // User cancelled the share sheet — not an error
      if (err.name === 'AbortError') return
      console.error('Share export failed:', err)
      setExportStatus('error')
      setTimeout(() => setExportStatus(null), 3000)
    }
  }

  function handleImportClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        let data
        try {
          data = JSON.parse(text)
        } catch {
          setImportStatus({ type: 'error', message: 'File is not valid JSON.' })
          setTimeout(() => setImportStatus(null), 5000)
          return
        }
        const validation = validateImportData(data)
        if (!validation.valid) {
          setImportStatus({ type: 'error', message: validation.reason })
          setTimeout(() => setImportStatus(null), 5000)
          return
        }
        // Show confirmation dialog with summary
        setShowImportConfirm({ data, fileName: file.name })
      } catch (err) {
        console.error('Import failed:', err)
        setImportStatus({ type: 'error', message: 'Failed to read the file.' })
        setTimeout(() => setImportStatus(null), 5000)
      }
    }
    input.click()
  }

  async function handleImportConfirm() {
    const { data } = showImportConfirm
    setShowImportConfirm(null)
    try {
      await importData(data)
      setImportStatus({ type: 'success', message: 'Data imported successfully.' })
      // Reload settings after import
      const s = await getSettings()
      await backfillPhaseStartDate(s)
      setSettings(s)
      if (onDarkModeChange && s.darkMode) onDarkModeChange(s.darkMode)
      setTimeout(() => setImportStatus(null), 3000)
    } catch (err) {
      console.error('Import failed:', err)
      setImportStatus({ type: 'error', message: 'Import failed. Your previous data has been restored.' })
      setTimeout(() => setImportStatus(null), 5000)
    }
  }

  async function handleClearAll() {
    setShowClearConfirm(false)
    try {
      await clearAllData()
      const s = await getSettings()
      setSettings(s)
      if (onDarkModeChange) onDarkModeChange('system')
    } catch (err) {
      console.error('Clear failed:', err)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const phaseDescriptions = {
    1: 'Pain Reduction & Isometric Loading (Weeks 1-2)',
    2: 'Isotonic Strengthening (Weeks 3-6). Includes Phase 1 exercises.',
    3: 'Pull-Up Return (Weeks 7-12+). Includes Phase 1 & 2 exercises.',
  }

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Settings</h1>

      {/* ── Current Phase ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Current Phase</h2>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((phase) => (
            <button
              key={phase}
              onClick={() => {
                if (phase !== settings.currentPhase) {
                  setShowPhaseConfirm(phase)
                }
              }}
              className={`min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
                settings.currentPhase === phase
                  ? 'bg-teal text-white'
                  : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]'
              }`}
            >
              Phase {phase}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted dark:text-muted-dark mt-3">
          {phaseDescriptions[settings.currentPhase]}
        </p>
      </div>

      {/* Phase confirmation dialog */}
      {showPhaseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Change to Phase {showPhaseConfirm}?</h3>
            <p className="text-sm text-muted dark:text-muted-dark mb-4">
              {phaseDescriptions[showPhaseConfirm]}
            </p>
            <p className="text-sm text-muted dark:text-muted-dark mb-6">
              Phases are cumulative. Phase {showPhaseConfirm} includes all exercises from previous phases.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPhaseConfirm(null)}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePhaseChange(showPhaseConfirm)}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-teal text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import confirmation dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Import Data?</h3>
            <p className="text-sm text-muted dark:text-muted-dark mb-3">
              This will replace all your current data with the contents of <strong className="dark:text-white">{showImportConfirm.fileName}</strong>.
            </p>
            <div className="text-xs text-muted dark:text-muted-dark mb-4 space-y-1">
              <p>{(showImportConfirm.data.workoutLogs || []).length} workout logs</p>
              <p>{(showImportConfirm.data.assessments || []).length} assessments</p>
              <p>{(showImportConfirm.data.checklist || []).length} checklist items</p>
              {showImportConfirm.data.exportedAt && (
                <p>Exported: {new Date(showImportConfirm.data.exportedAt).toLocaleDateString()}</p>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-6">
              Your current data will be backed up automatically. If the import fails, it will be restored.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportConfirm(null)}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-teal text-white"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Timer Defaults ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-1 dark:text-white">Timer Defaults</h2>
        <p className="text-xs text-muted dark:text-muted-dark">
          Hold and rest durations come from each exercise's data and cannot be changed here.
        </p>
      </div>

      {/* ── Alerts ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-1">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Alerts</h2>
        <SettingRow label="Sound">
          <Toggle
            label="Timer sound"
            enabled={settings.timerSound}
            onChange={(v) => updateSetting('timerSound', v)}
          />
        </SettingRow>
        <SettingRow label="Vibration">
          <Toggle
            label="Timer vibration"
            enabled={settings.timerVibrate}
            onChange={(v) => updateSetting('timerVibrate', v)}
          />
        </SettingRow>
        <SettingRow label="Notifications">
          <Toggle
            label="Timer notifications"
            enabled={settings.timerNotification}
            onChange={(v) => handleNotificationToggle(v)}
          />
        </SettingRow>
      </div>

      {/* ── Display ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Display</h2>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dark Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleDarkModeChange(option.value)}
              className={`min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
                settings.darkMode === option.value
                  ? 'bg-teal text-white'
                  : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rest Timer ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Rest Timer</h2>
        <SettingRow label="Auto-start rest timer" description="Automatically start the rest timer after completing a set">
          <Toggle
            label="Auto-start rest timer"
            enabled={settings.restTimerAutoStart}
            onChange={(v) => updateSetting('restTimerAutoStart', v)}
          />
        </SettingRow>
      </div>

      {/* ── Data Management ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-semibold mb-1 dark:text-white">Data Management</h2>

        <button
          onClick={handleExport}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C] transition-colors"
        >
          Export Data
        </button>

        {typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File([''], 'test.json', { type: 'application/json' })] }) && (
          <button
            onClick={handleShareExport}
            className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C] transition-colors flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share to Google Drive / Cloud
          </button>
        )}

        <button
          onClick={handleImportClick}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C] transition-colors"
        >
          Import Data
        </button>

        <p className="text-xs text-muted dark:text-muted-dark text-center">
          To import from Google Drive, tap Import Data — on Android you can browse Drive directly from the file picker.
        </p>

        {exportStatus === 'success' && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center">Data exported successfully.</p>
        )}
        {exportStatus === 'error' && (
          <p className="text-sm text-red dark:text-red-400 text-center">Export failed. Please try again.</p>
        )}

        {importStatus?.type === 'success' && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center">{importStatus.message}</p>
        )}
        {importStatus?.type === 'error' && (
          <p className="text-sm text-red dark:text-red-400 text-center">{importStatus.message}</p>
        )}

        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-red/10 text-red border border-red/20 transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {/* Clear confirmation dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Clear All Data?</h3>
            <p className="text-sm text-muted dark:text-muted-dark mb-6">
              This will permanently delete all workout logs, assessments, checklist progress, and settings. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-red text-white"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Links ── */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/phase-rules')}
          className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium dark:text-white">Phase Rules</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => navigate('/checklist')}
          className="w-full min-h-[48px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl px-5 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium dark:text-white">Return-to-Pull-Ups Checklist</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted dark:text-muted-dark" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
