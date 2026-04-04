import { describe, it, expect } from 'vitest'
import {
  validateProgram,
  inferTimerType,
  buildCategoryColorMap,
  extractPainFields,
  buildInitialAssessmentForm,
  getPhaseChecklists,
} from '../schema.js'
import defaultProgram from '../defaultProgram.json'

// Minimal valid program for testing
function makeValidProgram(overrides = {}) {
  return {
    id: 'test-program',
    name: 'Test Program',
    phases: [{ id: 1, name: 'Phase 1' }],
    exercises: [
      { id: 'ex1', name: 'Exercise 1', phase: 1, sets: 3 },
    ],
    ...overrides,
  }
}

describe('validateProgram', () => {
  it('returns valid for a well-formed program', () => {
    const result = validateProgram(makeValidProgram())
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('returns valid for the default program', () => {
    const result = validateProgram(defaultProgram)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects null/non-object input', () => {
    const result = validateProgram(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Program config must be an object.')
  })

  it('returns errors for missing required fields', () => {
    const result = validateProgram({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing required field: "id".')
    expect(result.errors).toContain('Missing required field: "name".')
    expect(result.errors).toContain('Missing required field: "phases".')
    expect(result.errors).toContain('Missing required field: "exercises".')
  })

  it('returns error for duplicate exercise IDs', () => {
    const program = makeValidProgram({
      exercises: [
        { id: 'dup', name: 'A', phase: 1, sets: 3 },
        { id: 'dup', name: 'B', phase: 1, sets: 3 },
      ],
    })
    const result = validateProgram(program)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate id "dup"'))).toBe(true)
  })

  it('returns error for invalid timerType', () => {
    const program = makeValidProgram({
      exercises: [
        { id: 'ex1', name: 'A', phase: 1, sets: 3, timerType: 'invalid_type' },
      ],
    })
    const result = validateProgram(program)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('invalid timerType "invalid_type"'))).toBe(true)
  })

  it('passes with valid assessment sections', () => {
    const program = makeValidProgram({
      assessmentSections: [
        {
          id: 'pain',
          fields: [
            { id: 'f1', type: 'pain_scale' },
            { id: 'f2', type: 'number' },
          ],
        },
      ],
    })
    const result = validateProgram(program)
    expect(result.valid).toBe(true)
  })

  it('returns error for invalid assessment field type', () => {
    const program = makeValidProgram({
      assessmentSections: [
        {
          id: 'sec1',
          fields: [{ id: 'f1', type: 'unknown_type' }],
        },
      ],
    })
    const result = validateProgram(program)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('invalid type "unknown_type"'))).toBe(true)
  })

  it('returns error for duplicate phase IDs', () => {
    const program = makeValidProgram({
      phases: [
        { id: 1, name: 'Phase 1' },
        { id: 1, name: 'Phase 1 dup' },
      ],
    })
    const result = validateProgram(program)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate id'))).toBe(true)
  })
})

describe('inferTimerType', () => {
  it('returns explicit timerType when set', () => {
    expect(inferTimerType({ timerType: 'isometric' })).toBe('isometric')
  })

  it('returns "isometric" for holdSeconds only', () => {
    expect(inferTimerType({ holdSeconds: 30 })).toBe('isometric')
  })

  it('returns "rep_based" for reps only', () => {
    expect(inferTimerType({ reps: 10 })).toBe('rep_based')
  })

  it('returns "hybrid" for holdSeconds + reps', () => {
    expect(inferTimerType({ holdSeconds: 10, reps: 10 })).toBe('hybrid')
  })

  it('returns "rep_based" as default fallback', () => {
    expect(inferTimerType({})).toBe('rep_based')
  })
})

describe('buildCategoryColorMap', () => {
  it('returns defaults when called with null', () => {
    const map = buildCategoryColorMap(null)
    expect(map).toHaveProperty('isometric')
    expect(map).toHaveProperty('isotonic')
    expect(map).toHaveProperty('mobility')
    expect(map).toHaveProperty('functional')
  })

  it('merges custom categories over defaults', () => {
    const map = buildCategoryColorMap([
      { id: 'custom', colorClass: 'bg-red' },
    ])
    expect(map.custom).toBe('bg-red')
    // defaults still present
    expect(map).toHaveProperty('isometric')
  })
})

describe('extractPainFields', () => {
  it('returns empty array for null', () => {
    expect(extractPainFields(null)).toEqual([])
  })

  it('extracts only pain metric field IDs', () => {
    const sections = [
      {
        id: 's1',
        fields: [
          { id: 'f1', type: 'pain_scale', isPainMetric: true },
          { id: 'f2', type: 'number' },
        ],
      },
      {
        id: 's2',
        fields: [
          { id: 'f3', type: 'pain_scale', isPainMetric: true },
        ],
      },
    ]
    expect(extractPainFields(sections)).toEqual(['f1', 'f3'])
  })
})

describe('buildInitialAssessmentForm', () => {
  it('returns empty object for null', () => {
    expect(buildInitialAssessmentForm(null)).toEqual({})
  })

  it('builds correct initial state for each field type', () => {
    const sections = [
      {
        id: 's1',
        fields: [
          { id: 'pain', type: 'pain_scale' },
          { id: 'num', type: 'number' },
          { id: 'sel', type: 'select', options: ['A', 'B'] },
          { id: 'txt', type: 'text' },
        ],
      },
    ]
    const form = buildInitialAssessmentForm(sections)
    expect(form.pain).toBe(0)
    expect(form.num).toBe('')
    expect(form.sel).toBe('A')
    expect(form.txt).toBe('')
  })

  it('uses defaultValue for select fields when provided', () => {
    const sections = [
      {
        id: 's1',
        fields: [
          { id: 'sel', type: 'select', options: ['A', 'B'], defaultValue: 'B' },
        ],
      },
    ]
    const form = buildInitialAssessmentForm(sections)
    expect(form.sel).toBe('B')
  })
})

describe('getPhaseChecklists', () => {
  it('returns empty array for null', () => {
    expect(getPhaseChecklists(null)).toEqual([])
  })

  it('returns only phases with non-empty checklists', () => {
    const phases = [
      { id: 1, name: 'P1', checklists: [] },
      { id: 2, name: 'P2' },
      { id: 3, name: 'P3', checklists: [{ id: 'c1', label: 'Check 1' }] },
    ]
    const result = getPhaseChecklists(phases)
    expect(result).toHaveLength(1)
    expect(result[0].phaseId).toBe(3)
    expect(result[0].phaseName).toBe('P3')
    expect(result[0].items).toHaveLength(1)
  })
})
