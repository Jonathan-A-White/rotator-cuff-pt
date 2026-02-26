import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getSettings, logWorkout, getLogsForDate } from '../db'
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
  const exercise = exercises.find((e) => e.id === id)

  const [settings, setSettings] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [painLevel, setPainLevel] = useState(0)
  const [notes, setNotes] = useState('')

  // Rep-based state
  const [repSet, setRepSet] = useState(1)
  const [repResting, setRepResting] = useState(false)
  const [repRestRemaining, setRepRestRemaining] = useState(0)

  const audioInitRef = useRef(false)
  const warningFiredRef = useRef(false)
  // Tracks whether the current set's hold phase completed (needed to correctly count
  // sets when autoStartRest=false leaves state as 'idle' after a finished hold)
  const holdCompletedRef = useRef(false)
  const prevCurrentSetRef = useRef(1)

  const wakeLock = useWakeLock()

  // Load settings on mount
  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  // Initialize starting set from today's already-logged sets for this exercise
  useEffect(() => {
    if (!exercise) return
    getLogsForDate(today()).then((logs) => {
      const alreadyDone = logs
        .filter((l) => l.exerciseId === id)
        .reduce((sum, l) => sum + (l.setsCompleted || 0), 0)
      if (alreadyDone > 0) {
        const startSet = Math.min(alreadyDone + 1, totalSets)
        timer.setInitialSet(startSet)
        setRepSet(startSet)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Determine exercise type
  const isIsometric = exercise && exercise.holdSeconds && !exercise.reps
  // Some exercises like scapular setting have both reps and holdSeconds
  const isHybrid = exercise && exercise.reps && exercise.holdSeconds
  const isRepBased = exercise && exercise.reps && !exercise.holdSeconds

  const totalSets = exercise?.sets || 1
  const holdTime = exercise?.holdSeconds || 30
  const restTime = exercise?.restSeconds || 60

  // --- Timer callbacks ---
  const handleHoldComplete = useCallback(() => {
    holdCompletedRef.current = true
    if (settings?.timerSound) playCompleteTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate(500)
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

  // Timer hook for isometric / hybrid exercises
  const timer = useTimer({
    holdSeconds: holdTime,
    restSeconds: restTime,
    totalSets: totalSets,
    autoStartRest: settings?.restTimerAutoStart ?? true,
    onHoldComplete: handleHoldComplete,
    onRestComplete: handleRestComplete,
    onAllComplete: handleAllComplete,
  })

  // Reset holdCompletedRef whenever the set advances (so skipToNextSet doesn't
  // carry a stale "hold done" flag into the next set)
  useEffect(() => {
    if (timer.currentSet !== prevCurrentSetRef.current) {
      holdCompletedRef.current = false
      prevCurrentSetRef.current = timer.currentSet
    }
  }, [timer.currentSet])

  // Warning beeps at 10 seconds remaining during hold
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

  // Rep-based rest countdown
  useEffect(() => {
    if (!repResting || repRestRemaining <= 0) {
      if (repResting && repRestRemaining <= 0) {
        setRepResting(false)
        if (settings?.timerSound) playRestCompleteTone()
        if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate([200, 100, 200])
      }
      return
    }
    const interval = setInterval(() => {
      setRepRestRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [repResting, repRestRemaining, settings])

  // Ensure audio context is initialized (requires user gesture)
  const ensureAudio = useCallback(() => {
    if (!audioInitRef.current) {
      initAudio()
      audioInitRef.current = true
    }
  }, [])

  // Handle start for isometric/hybrid exercises
  const handleStart = useCallback(() => {
    holdCompletedRef.current = false  // new hold beginning — clear previous state
    ensureAudio()
    wakeLock.request()
    if (settings?.timerSound) playStartTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate(200)
    timer.start()
  }, [ensureAudio, timer, settings, wakeLock])

  // Handle pause/resume
  const handlePauseResume = useCallback(() => {
    if (timer.isPaused) {
      timer.resume()
    } else {
      timer.pause()
    }
  }, [timer])

  // Handle complete set for rep-based exercises
  const handleCompleteRepSet = useCallback(() => {
    ensureAudio()
    wakeLock.request()
    if (settings?.timerSound) playCompleteTone()
    if (settings?.timerVibrate && navigator.vibrate) navigator.vibrate(300)

    if (repSet >= totalSets) {
      // All sets done
      wakeLock.release()
      setCompleted(true)
    } else {
      // Move to next set with optional rest
      if (restTime > 0) {
        setRepResting(true)
        setRepRestRemaining(restTime)
      }
      setRepSet((s) => s + 1)
    }
  }, [ensureAudio, repSet, totalSets, restTime, settings, wakeLock])

  // Skip rep rest
  const handleSkipRepRest = useCallback(() => {
    setRepResting(false)
    setRepRestRemaining(0)
  }, [])

  // Save workout and navigate back
  const handleSave = useCallback(async () => {
    const setsCompleted = (isIsometric || isHybrid)
      ? timer.currentSet
      : repSet
    await logWorkout({
      date: today(),
      exerciseId: id,
      setsCompleted: completed ? totalSets : setsCompleted,
      painLevel: painLevel || undefined,
      notes: notes.trim() || undefined,
    })
    navigate('/')
  }, [id, isIsometric, isHybrid, timer.currentSet, repSet, completed, totalSets, painLevel, notes, navigate])

  // Handle back navigation — auto-save partial progress
  const handleBack = useCallback(async () => {
    wakeLock.release()

    // Calculate how many sets were fully completed
    let completedSets = 0
    if (isIsometric || isHybrid) {
      // Count the current set if its hold is done (resting after it, or hold completed
      // with manual rest mode leaving state as 'idle'). Don't count if mid-hold.
      const holdDone = timer.state === 'resting' || holdCompletedRef.current
      completedSets = holdDone ? timer.currentSet : timer.currentSet - 1
    } else if (isRepBased) {
      // repSet is the set you're currently on (1-indexed), so completed = repSet - 1
      completedSets = repSet - 1
    }

    if (completedSets > 0) {
      await logWorkout({
        date: today(),
        exerciseId: id,
        setsCompleted: completedSets,
      })
    }

    navigate('/')
  }, [navigate, wakeLock, isIsometric, isHybrid, isRepBased, timer.state, timer.currentSet, repSet, id])

  // --- Not found state ---
  if (!exercise) {
    return (
      <div className="page-enter px-4 pt-6 max-w-lg mx-auto text-center">
        <p className="text-muted dark:text-muted-dark py-12">Exercise not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full min-h-[48px] rounded-xl bg-teal text-white font-semibold py-3"
        >
          Back to Home
        </button>
      </div>
    )
  }

  const totalTime = timer.state === 'resting'
    ? restTime * 1000
    : holdTime * 1000

  // --- Completion screen ---
  if (completed) {
    return (
      <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-5xl" role="img" aria-label={exercise.name}>
            {exercise.emoji}
          </span>
          <h1 className="text-xl font-bold dark:text-white">Exercise Complete</h1>
          <p className="text-muted dark:text-muted-dark text-sm">
            {exercise.name} &middot; {totalSets}/{totalSets} sets
          </p>
        </div>

        {/* Completion check */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-teal/10 dark:bg-teal/20 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-teal)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10"
            >
              <polyline points="4 12 10 18 20 6" />
            </svg>
          </div>
        </div>

        {/* Pain slider */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4">
          <PainSlider value={painLevel} onChange={setPainLevel} label="Pain during exercise" />
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel? Any adjustments?"
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#1C1C1E] px-3 py-2 text-sm dark:text-white placeholder:text-muted dark:placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-teal/50 resize-none"
          />
        </div>

        {/* Save & Back button */}
        <button
          onClick={handleSave}
          className="w-full min-h-[56px] rounded-xl bg-teal hover:bg-teal-light active:bg-teal/90 text-white font-semibold text-base transition-colors"
        >
          Save &amp; Back
        </button>
      </div>
    )
  }

  // --- Active exercise screen ---
  return (
    <div className="page-enter px-4 pt-4 pb-24 max-w-lg mx-auto">
      {/* Back button + exercise name + emoji */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          aria-label="Back"
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2 text-muted dark:text-muted-dark hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl shrink-0" aria-hidden="true">{exercise.emoji}</span>
          <h1 className="text-lg font-bold truncate dark:text-white">{exercise.name}</h1>
        </div>
      </div>

      {/* Effort guidance badge + Pain threshold warning */}
      {(exercise.effortGuidance || exercise.painThreshold) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {exercise.effortGuidance && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal/10 text-teal dark:bg-teal/20 dark:text-teal-light">
              {exercise.effortGuidance}
            </span>
          )}
          {exercise.painThreshold && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red/10 text-red dark:bg-red/20">
              {exercise.painThreshold}
            </span>
          )}
        </div>
      )}

      {/* Collapsible CueList */}
      {exercise.cues && exercise.cues.length > 0 && (
        <div className="mb-3">
          <CueList cues={exercise.cues} defaultOpen={false} />
        </div>
      )}

      {/* YouTube link button */}
      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center justify-center gap-2 w-full min-h-[48px] rounded-lg border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm font-medium text-muted dark:text-muted-dark hover:text-teal dark:hover:text-teal-light transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Watch Video
        </a>
      )}

      {/* ======= ISOMETRIC / HYBRID TIMER ======= */}
      {(isIsometric || isHybrid) && (
        <div className="flex flex-col items-center">
          {/* TimerRing */}
          <TimerRing
            timeRemaining={timer.timeRemaining}
            totalTime={totalTime}
            size={220}
            strokeWidth={8}
            state={timer.state}
          />

          {/* Set indicator */}
          <p className="text-sm font-semibold text-muted dark:text-muted-dark mt-3 mb-4">
            Set {timer.currentSet} of {totalSets}
            {isHybrid && exercise.reps && (
              <span className="ml-2 text-teal dark:text-teal-light">
                &middot; {exercise.reps} reps per set
              </span>
            )}
          </p>

          {/* Start / Pause button */}
          {timer.state === 'idle' && (
            <button
              onClick={handleStart}
              className="w-full min-h-[56px] rounded-xl bg-teal hover:bg-teal-light active:bg-teal/90 text-white font-semibold text-lg transition-colors"
            >
              {timer.currentSet === 1 ? 'Start' : 'Start Set'}
            </button>
          )}

          {(timer.state === 'holding' || timer.state === 'resting') && (
            <>
              <button
                onClick={handlePauseResume}
                className={`w-full min-h-[56px] rounded-xl font-semibold text-lg transition-colors ${
                  timer.isPaused
                    ? 'bg-teal hover:bg-teal-light text-white'
                    : timer.state === 'resting'
                      ? 'bg-amber/15 hover:bg-amber/25 text-amber border border-amber/30'
                      : 'bg-amber/15 hover:bg-amber/25 text-amber border border-amber/30'
                }`}
              >
                {timer.isPaused ? 'Resume' : 'Pause'}
              </button>

              {/* Skip Rest / Skip Set row */}
              <div className="flex gap-3 mt-3 w-full">
                {timer.state === 'resting' && (
                  <button
                    onClick={timer.skipRest}
                    className="flex-1 min-h-[48px] rounded-lg border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm font-medium text-muted dark:text-muted-dark hover:text-teal transition-colors"
                  >
                    Skip Rest
                  </button>
                )}
                <button
                  onClick={timer.skipToNextSet}
                  className="flex-1 min-h-[48px] rounded-lg border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm font-medium text-muted dark:text-muted-dark hover:text-teal transition-colors"
                >
                  Skip Set
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======= REP-BASED EXERCISE ======= */}
      {isRepBased && (
        <div className="flex flex-col items-center">
          {/* Rep counter circle */}
          <div className="w-[220px] h-[220px] rounded-full border-8 border-gray-200 dark:border-[#3A3A3C] flex flex-col items-center justify-center relative">
            {repResting ? (
              <>
                <span className="timer-digits text-5xl leading-none text-amber">
                  {String(Math.floor(repRestRemaining / 60)).padStart(2, '0')}:{String(repRestRemaining % 60).padStart(2, '0')}
                </span>
                <span className="text-sm font-semibold tracking-widest mt-2 uppercase text-amber">
                  REST
                </span>
              </>
            ) : (
              <>
                <span className="text-5xl font-bold leading-none text-teal dark:text-teal-light">
                  {exercise.reps}
                </span>
                <span className="text-sm font-semibold tracking-widest mt-2 uppercase text-teal dark:text-teal-light">
                  REPS
                </span>
              </>
            )}
          </div>

          {/* Set indicator */}
          <p className="text-sm font-semibold text-muted dark:text-muted-dark mt-3 mb-4">
            Set {repSet} of {totalSets}
          </p>

          {/* Complete Set / Skip Rest buttons */}
          {repResting ? (
            <button
              onClick={handleSkipRepRest}
              className="w-full min-h-[56px] rounded-xl bg-amber/15 hover:bg-amber/25 text-amber border border-amber/30 font-semibold text-lg transition-colors"
            >
              Skip Rest
            </button>
          ) : (
            <button
              onClick={handleCompleteRepSet}
              className="w-full min-h-[56px] rounded-xl bg-teal hover:bg-teal-light active:bg-teal/90 text-white font-semibold text-lg transition-colors"
            >
              {repSet >= totalSets ? 'Complete Exercise' : 'Complete Set'}
            </button>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalSets }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < repSet - (repResting || repSet > totalSets ? 0 : 1)
                    ? 'bg-teal dark:bg-teal-light'
                    : 'bg-gray-200 dark:bg-[#3A3A3C]'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
