import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeScreen from '../HomeScreen'

const exercises = [
  { id: 'a', name: 'Alpha', phase: 1, sortOrder: 1, sets: 3, reps: 10 },
  { id: 'b', name: 'Bravo', phase: 1, sortOrder: 2, sets: 3, reps: 10 },
  { id: 'c', name: 'Charlie', phase: 1, sortOrder: 3, sets: 3, reps: 10 },
  { id: 'd', name: 'Delta', phase: 1, sortOrder: 4, sets: 3, reps: 10 },
]

let mockLogs = []

vi.mock('../../db', () => ({
  getSettings: () => Promise.resolve({ currentPhase: 1 }),
  getLogsForDate: () => Promise.resolve(mockLogs),
  addManualLog: () => Promise.resolve(),
  decrementLatestLog: () => Promise.resolve(),
}))

vi.mock('../../config/ProgramContext', () => ({
  useProgram: () => ({
    program: { id: 'test-program' },
    exercises,
    phaseMap: { 1: { id: 1, name: 'Phase One' } },
  }),
}))

/** Names of the exercise cards, top to bottom. */
function renderedOrder() {
  return screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
}

async function renderHome(initialEntries = ['/']) {
  const result = render(
    <MemoryRouter initialEntries={initialEntries}>
      <HomeScreen />
    </MemoryRouter>
  )
  // Flush the settings + logs loads
  await act(async () => {})
  return result
}

beforeEach(() => {
  mockLogs = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('HomeScreen exercise ordering', () => {
  it('keeps program order when nothing is done', async () => {
    await renderHome()
    expect(renderedOrder()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
  })

  it('drops completed exercises below the ones still to do', async () => {
    mockLogs = [
      { exerciseId: 'a', setsCompleted: 3 },
      { exerciseId: 'c', setsCompleted: 3 },
    ]
    await renderHome()
    expect(renderedOrder()).toEqual(['Bravo', 'Delta', 'Alpha', 'Charlie'])
  })

  it('leaves a partially-done exercise on top', async () => {
    mockLogs = [{ exerciseId: 'a', setsCompleted: 2 }]
    await renderHome()
    expect(renderedOrder()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
  })

  it('holds a just-finished exercise in place, then drops it', async () => {
    mockLogs = [{ exerciseId: 'a', setsCompleted: 3 }]
    await renderHome([{ pathname: '/', state: { justCompleted: 'a' } }])

    // Rendered in its old spot first, so the move is visible
    expect(renderedOrder()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])

    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(renderedOrder()).toEqual(['Bravo', 'Charlie', 'Delta', 'Alpha'])
  })

  it('does not hold an exercise that was left unfinished', async () => {
    mockLogs = [
      { exerciseId: 'a', setsCompleted: 1 },
      { exerciseId: 'b', setsCompleted: 3 },
    ]
    await renderHome([{ pathname: '/', state: { justCompleted: 'a' } }])
    expect(renderedOrder()).toEqual(['Alpha', 'Charlie', 'Delta', 'Bravo'])
  })

  it('freezes the order while Edit mode is open', async () => {
    mockLogs = [{ exerciseId: 'a', setsCompleted: 3 }]
    await renderHome()
    expect(renderedOrder()).toEqual(['Bravo', 'Charlie', 'Delta', 'Alpha'])

    await act(async () => {
      screen.getByRole('button', { name: 'Edit' }).click()
    })

    // Completing Bravo in edit mode must not move it out from under the tap
    mockLogs = [
      { exerciseId: 'a', setsCompleted: 3 },
      { exerciseId: 'b', setsCompleted: 3 },
    ]
    await act(async () => {
      screen.getByRole('button', { name: 'Add set for Bravo' }).click()
    })
    expect(renderedOrder()).toEqual(['Bravo', 'Charlie', 'Delta', 'Alpha'])

    // ...and it re-sorts on Done
    await act(async () => {
      screen.getByRole('button', { name: 'Done' }).click()
    })
    expect(renderedOrder()).toEqual(['Charlie', 'Delta', 'Alpha', 'Bravo'])
  })
})
