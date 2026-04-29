import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgram } from '../config/ProgramContext'
import { validateProgram } from '../config/schema'
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
  const {
    phases,
    program,
    availablePrograms,
    switchProgram,
    switchToProgramId,
    resetToDefault,
    removeSavedProgram,
  } = useProgram()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPhaseConfirm, setShowPhaseConfirm] = useState(null) // phase number or null
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(null) // { data, fileName } or null
  const [showRemoveProgramConfirm, setShowRemoveProgramConfirm] = useState(null) // { id, name } or null
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

  async function handleExport() {
    try {
      const data = await exportAllData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const fileName = `${program.id}-backup-${new Date().toISOString().split('T')[0]}.json`

      // Use File System Access API when available — on Android Chrome 132+
      // the save picker shows Google Drive and other storage providers.
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        // Fallback for older browsers — plain download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      setExportStatus('success')
      setTimeout(() => setExportStatus(null), 3000)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Export failed:', err)
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

  async function handleSelectProgram(id) {
    if (id === program.id) return
    const result = await switchToProgramId(id)
    if (result.success) {
      const target = availablePrograms.find((p) => p.id === id)
      setImportStatus({ type: 'success', message: `Switched to "${target?.name || id}".` })
    } else {
      setImportStatus({ type: 'error', message: `Failed to switch: ${result.errors.join(', ')}` })
    }
    setTimeout(() => setImportStatus(null), 3000)
  }

  async function handleRemoveProgram() {
    const target = showRemoveProgramConfirm
    setShowRemoveProgramConfirm(null)
    if (!target) return
    try {
      await removeSavedProgram(target.id)
      setImportStatus({ type: 'success', message: `Removed "${target.name}".` })
    } catch (err) {
      console.error('Remove program failed:', err)
      setImportStatus({ type: 'error', message: 'Failed to remove the program.' })
    }
    setTimeout(() => setImportStatus(null), 3000)
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

  const phaseDescriptions = {}
  phases.forEach((p, idx) => {
    const prev = idx > 0 ? ` Includes Phase ${phases.slice(0, idx).map(pp => pp.id).join(' & ')} exercises.` : ''
    phaseDescriptions[p.id] = `${p.name} (Weeks ${p.weeks}).${prev}`
  })

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Settings</h1>

      {/* ── Current Phase ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Current Phase</h2>
        <div className={`grid grid-cols-${Math.min(phases.length, 3)} gap-2`}>
          {phases.map((phaseObj) => (
            <button
              key={phaseObj.id}
              onClick={() => {
                if (phaseObj.id !== settings.currentPhase) {
                  setShowPhaseConfirm(phaseObj.id)
                }
              }}
              className={`min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
                settings.currentPhase === phaseObj.id
                  ? 'bg-teal text-white'
                  : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]'
              }`}
            >
              Phase {phaseObj.id}
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
        <SettingRow label="System timer" description="Also start the Android clock timer so it shows in the notification bar">
          <Toggle
            label="System timer"
            enabled={settings.systemTimer}
            onChange={(v) => updateSetting('systemTimer', v)}
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

        <button
          onClick={handleImportClick}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C] transition-colors"
        >
          Import Data
        </button>

        <p className="text-xs text-muted dark:text-muted-dark text-center">
          You can save exports directly to Google Drive from the file picker. To import from Drive, tap Import Data and browse Drive from the picker.
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

      {/* Remove program confirmation dialog */}
      {showRemoveProgramConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Remove this program?</h3>
            <p className="text-sm text-muted dark:text-muted-dark mb-6">
              <span className="font-medium dark:text-white">{showRemoveProgramConfirm.name}</span> will be deleted from this device.
              {showRemoveProgramConfirm.id === program.id && ' The app will switch back to the built-in program.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveProgramConfirm(null)}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C]"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveProgram}
                className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-red text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Program ── */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-semibold mb-1 dark:text-white">Program</h2>
        <p className="text-sm text-muted dark:text-muted-dark">
          Current: <span className="font-medium dark:text-white">{program.name}</span>
        </p>

        {availablePrograms.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-muted dark:text-muted-dark">Tap to switch programs.</p>
            <ul className="space-y-2">
              {availablePrograms.map((p) => {
                const isActive = p.id === program.id
                return (
                  <li key={p.id} className="flex items-stretch gap-2">
                    <button
                      onClick={() => handleSelectProgram(p.id)}
                      aria-pressed={isActive}
                      className={`flex-1 min-w-0 min-h-[48px] rounded-xl px-4 py-3 text-left text-sm font-medium border transition-colors ${
                        isActive
                          ? 'bg-teal text-white border-teal'
                          : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border-[#E5E5E5] dark:border-[#3A3A3C]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 min-w-0 truncate">{p.name}</span>
                        <span className={`text-xs flex-shrink-0 ${isActive ? 'text-white/80' : 'text-muted dark:text-muted-dark'}`}>
                          {p.builtIn ? 'Built-in' : isActive ? 'Active' : 'Imported'}
                        </span>
                      </div>
                    </button>
                    {!p.builtIn && (
                      <button
                        onClick={() => setShowRemoveProgramConfirm({ id: p.id, name: p.name })}
                        aria-label={`Remove ${p.name}`}
                        className="min-h-[48px] min-w-[48px] rounded-xl text-sm font-semibold bg-red/10 text-red border border-red/20"
                      >
                        ×
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <button
          onClick={() => {
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
                const validation = validateProgram(data)
                if (!validation.valid) {
                  setImportStatus({ type: 'error', message: `Invalid program: ${validation.errors.join(', ')}` })
                  setTimeout(() => setImportStatus(null), 5000)
                  return
                }
                const result = await switchProgram(data)
                if (result.success) {
                  setImportStatus({ type: 'success', message: `Switched to "${data.name}" program.` })
                } else {
                  setImportStatus({ type: 'error', message: `Failed: ${result.errors.join(', ')}` })
                }
                setTimeout(() => setImportStatus(null), 5000)
              } catch (err) {
                console.error('Import program failed:', err)
                setImportStatus({ type: 'error', message: 'Failed to read the file.' })
                setTimeout(() => setImportStatus(null), 5000)
              }
            }
            input.click()
          }}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C] transition-colors"
        >
          Import Program
        </button>

        <button
          onClick={() => {
            try {
              const json = JSON.stringify(program, null, 2)
              const blob = new Blob([json], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${program.id}-program.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            } catch (err) {
              console.error('Export program failed:', err)
            }
          }}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#3A3A3C] transition-colors"
        >
          Export Program
        </button>

        <button
          onClick={resetToDefault}
          className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-amber/10 text-amber border border-amber/20 transition-colors"
        >
          Reset to Default
        </button>
      </div>

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

        {phases.some(p => p.checklists?.length > 0) && (
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
