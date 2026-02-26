import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen'
import ExerciseTimerScreen from './screens/ExerciseTimerScreen'
import ExerciseDetailScreen from './screens/ExerciseDetailScreen'
import ProgressScreen from './screens/ProgressScreen'
import AssessmentScreen from './screens/AssessmentScreen'
import SettingsScreen from './screens/SettingsScreen'
import PhaseRulesScreen from './screens/PhaseRulesScreen'
import ChecklistScreen from './screens/ChecklistScreen'
import NavBar from './components/NavBar'
import { getSettings } from './db'

export default function App() {
  const [darkMode, setDarkMode] = useState('system')

  useEffect(() => {
    getSettings().then(s => {
      if (s?.darkMode) setDarkMode(s.darkMode)
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (darkMode === 'dark') {
      root.classList.add('dark')
    } else if (darkMode === 'light') {
      root.classList.remove('dark')
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e) => root.classList.toggle('dark', e.matches)
      handler(mq)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [darkMode])

  return (
    <div className="min-h-dvh pb-20">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/exercise/:id" element={<ExerciseTimerScreen />} />
        <Route path="/exercise/:id/detail" element={<ExerciseDetailScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/assessment" element={<AssessmentScreen />} />
        <Route path="/settings" element={<SettingsScreen onDarkModeChange={setDarkMode} />} />
        <Route path="/phase-rules" element={<PhaseRulesScreen />} />
        <Route path="/checklist" element={<ChecklistScreen />} />
      </Routes>
      <NavBar />
    </div>
  )
}
