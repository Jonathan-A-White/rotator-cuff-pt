import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getSettings, logWorkout } from '../db'
import { today } from '../utils/dateUtils'
import useTimer from '../hooks/useTimer'
import useWakeLock from '../hooks/useWakeLock'
import { initAudio, playStartTone, playWarningBeeps, playCompleteTone, playRestCompleteTone } from '../utils/audio'
import TimerRing from '../components/TimerRing'
import PainSlider from '../components/PainSlider'
import CueList from '../components/CueList'

export default function ExerciseTimerScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const exercise = exercises.find(e => e.id === id)

  const [settings, setSettings] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [painLevel, setPainLevel] = useState(0)
  const [notes, setNotes] = useState('')
  const [repCount, setRepCount] = useState(0)
  const [repSet, setRepSet] = useState(1)
  const [flash, setFlash] = useState(false)
  const audioInitRef = useRef(false)
  const warningFiredRef = useRef(false)

  const wakeLock = useWakeLock()

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const isIsometric = exercise && exercise.holdSeconds && !exercise.reps
  const isRepBased = exercise && exercise.reps && !exercise.holdSeconds
  // Some exercises like scapular setting have both reps and holdSeconds
  const isHybrid = exercise && exercise.reps && exercise.holdSeconds

  const handleHoldComplete = useCallback(() => {
    if (settings?.timerSound) playCompleteTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate(500)
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }, [settings])

  const handleRestComplete = useCallback(() => {
    if (settings?.timerSound) playRestCompleteTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate([200, 100, 200])
  }, [settings])

  const handleAllComplete = useCallback(() => {
    if (settings?.timerSound) playCompleteTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500])
    wakeLock.release()
    setCompleted(true)
  }, [settings, wakeLock])

  const timer = useTimer({
    holdSeconds: exercise?.holdSeconds || 0,
    restSeconds: exercise?.restSeconds || 0,
    totalSets: exercise?.sets || 1,
    autoStartRest: settings?.restTimerAutoStart ?? true,
    onHoldComplete: handleHoldComplete,
    onRestComplete: handleRestComplete,
    onAllComplete: handleAllComplete,
  })

  // Fire warning beeps at 10 seconds remaining during hold
  useEffect(() => {
    if (timer.state === 'holding' && timer.timeRemaining <= 10000 && timer.timeRemaining > 9500 && !warningFiredRef.current) {
      warningFiredRef.current = true
      if (settings?.timerSound) playWarningBeeps()
      if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate([100, 100, 100, 100, 100])
    }
    if (timer.state !== 'holding' || timer.timeRemaining > 10500) {
      warningFiredRef.current = false
    }
  }, [timer.state, timer.timeRemaining, settings])

  const handleStart = useCallback(() => {
    if (!audioInitRef.current) {
      initAudio()
      audioInitRef.current = true
    }
    wakeLock.request()
    if (settings?.timerSound) playStartTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate(200)
    timer.start()
  }, [timer, settings, wakeLock])

  const handlePauseResume = useCallback(() => {
    if (timer.isPaused) {
      timer.resume()
    } else {
      timer.pause()
    }
  }, [timer])

  const handleCompleteRepSet = useCallback(() => {
    if (!audioInitRef.current) {
      initAudio()
      audioInitRef.current = true
    }
    if (settings?.timerSound) playCompleteTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate(300)
    if (repSet >= (exercise?.sets || 3)) {
      handleAllComplete()
    } else {
      setRepSet(s => s + 1)
      setRepCount(0)
    }
  }, [repSet, exercise, settings, handleAllComplete])

  const handleSave = async () => {
    const setsCompleted = isRepBased || isHybrid ? repSet : timer.currentSet
    await logWorkout({
      date: today(),
      exerciseId: id,
      setsCompleted: completed ? (exercise?.sets || setsCompleted) : setsCompleted,
      painLevel: painLevel || undefined,
      notes: notes || undefined,
    })
    navigate('/')
  }

  if (!exercise) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted dark:text-muted-dark">Exercise not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal font-medium">Go Back</button>
      </div>
    )
  }

  const totalTime = timer.state === 'resting'
    ? (exercise.restSeconds || 0) * 1000
    : (exercise.holdSeconds || 0) * 1000

  return (
    <div className={`page-enter px-4 pt-4 pb-24 max-w-lg mx-auto ${flash ? 'timer-flash' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-muted dark:text-muted-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-2xl">{exercise.emoji}</span>
        <h1 className="text-lg font-bold dark:text-white flex-1">{exercise.name}</h1>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {exercise.effortGuidance && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal dark:text-teal-light">
            {exercise.effortGuidance}
          </span>
        )}
        {exercise.painThreshold && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red/10 text-red">
            {exercise.painThreshold}
          </span>
        )}
      </div>

      {/* Cues */}
      <CueList cues={exercise.cues} defaultOpen={true} />

      {/* Video link */}
      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-teal dark:text-teal-light font-medium mb-4 touch-target"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
          </svg>
          Watch Video
        </a>
      )}

      {/* Completion view */}
      {completed ? (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-6 space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-xl font-bold dark:text-white">Exercise Complete!</h2>
            <p className="text-muted dark:text-muted-dark text-sm mt-1">
              {exercise.sets} sets completed
            </p>
          </div>

          <PainSlider value={painLevel} onChange={setPainLevel} label="Pain during exercise" />

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it feel?"
              rows={2}
              className="w-full rounded-lg border border-[#E5E5E5] dark:border-[#3A3A3C] bg-white dark:bg-[#1C1C1E] px-3 py-2 text-sm dark:text-white"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl bg-teal text-white font-bold text-base touch-target"
          >
            Save & Back
          </button>
        </div>
      ) : (isIsometric || isHybrid) ? (
        /* Isometric / Hybrid Timer */
        <div className="flex flex-col items-center">
          <TimerRing
            timeRemaining={timer.timeRemaining}
            totalTime={totalTime}
            size={240}
            strokeWidth={8}
            state={timer.state}
          />

          <p className="text-sm font-medium text-muted dark:text-muted-dark mt-3 mb-4">
            Set {timer.currentSet} of {exercise.sets}
          </p>

          {timer.state === 'idle' ? (
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-xl bg-teal text-white font-bold text-lg touch-target"
            >
              {timer.currentSet === 1 ? 'Start' : 'Start Next Set'}
            </button>
          ) : (
            <div className="w-full space-y-3">
              <button
                onClick={handlePauseResume}
                className="w-full py-4 rounded-xl bg-teal text-white font-bold text-lg touch-target"
              >
                {timer.isPaused ? 'Resume' : 'Pause'}
              </button>

              <div className="flex gap-3">
                {timer.state === 'resting' && (
                  <button
                    onClick={timer.skipRest}
                    className="flex-1 py-3 rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3C] text-sm font-medium text-muted dark:text-muted-dark touch-target"
                  >
                    Skip Rest
                  </button>
                )}
                <button
                  onClick={timer.skipToNextSet}
                  className="flex-1 py-3 rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3C] text-sm font-medium text-muted dark:text-muted-dark touch-target"
                >
                  Skip Set
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Rep-based exercises */
        <div className="flex flex-col items-center">
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-2xl p-8 w-full text-center mb-4">
            <p className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
              Set {repSet} of {exercise.sets}
            </p>
            <div className="timer-digits text-6xl font-bold text-teal dark:text-teal-light mb-1">
              {repCount}
            </div>
            <p className="text-sm text-muted dark:text-muted-dark">
              of {exercise.reps} reps
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => setRepCount(c => Math.min(c + 1, exercise.reps || 99))}
              className="w-full py-4 rounded-xl bg-teal/10 text-teal dark:text-teal-light font-bold text-lg touch-target"
            >
              +1 Rep
            </button>
            <button
              onClick={handleCompleteRepSet}
              className="w-full py-4 rounded-xl bg-teal text-white font-bold text-lg touch-target"
            >
              {repSet >= exercise.sets ? 'Complete Exercise' : 'Complete Set'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
