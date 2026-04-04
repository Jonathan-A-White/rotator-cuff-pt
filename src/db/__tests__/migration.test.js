import { describe, it, expect } from 'vitest'
import { migrateImportData, validateImportData } from '../index.js'

describe('migrateImportData', () => {
  it('migrates v1 data by adding programs array', () => {
    const v1Data = {
      version: 1,
      workoutLogs: [{ id: '1', date: '2025-01-01', exerciseId: 'ex1' }],
      assessments: [],
      settings: [],
      checklist: [],
    }
    const result = migrateImportData(v1Data)
    expect(result.programs).toEqual([])
    expect(result.version).toBe(2)
  })

  it('does not overwrite existing programs on v1 data', () => {
    const v1Data = {
      version: 1,
      programs: [{ id: 'prog1' }],
      workoutLogs: [],
      assessments: [],
      settings: [],
      checklist: [],
    }
    const result = migrateImportData(v1Data)
    // programs already existed, should not be overwritten
    expect(result.programs).toEqual([{ id: 'prog1' }])
  })

  it('passes through v2 data unchanged (except version stamp)', () => {
    const v2Data = {
      version: 2,
      workoutLogs: [],
      assessments: [],
      settings: [],
      checklist: [],
      programs: [{ id: 'p1' }],
    }
    const result = migrateImportData(v2Data)
    expect(result.programs).toEqual([{ id: 'p1' }])
    expect(result.version).toBe(2)
  })
})

describe('validateImportData', () => {
  it('accepts valid v2 data', () => {
    const data = {
      version: 2,
      workoutLogs: [{ id: '1', date: '2025-01-01', exerciseId: 'ex1' }],
      assessments: [],
      settings: [],
      checklist: [],
      programs: [],
    }
    expect(validateImportData(data)).toEqual({ valid: true })
  })

  it('rejects data from a newer version', () => {
    const data = {
      version: 99,
      workoutLogs: [{ id: '1', date: '2025-01-01', exerciseId: 'ex1' }],
    }
    const result = validateImportData(data)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/newer app version/)
  })

  it('rejects data with no recognizable arrays', () => {
    const data = { version: 2 }
    const result = validateImportData(data)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/No recognizable data/)
  })

  it('rejects null input', () => {
    const result = validateImportData(null)
    expect(result.valid).toBe(false)
  })

  it('rejects when a store key is not an array', () => {
    const data = {
      version: 2,
      workoutLogs: 'not an array',
      assessments: [{ id: '1', date: '2025-01-01' }],
    }
    const result = validateImportData(data)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/"workoutLogs" must be an array/)
  })

  it('accepts v1 data (backward compatibility)', () => {
    const data = {
      version: 1,
      workoutLogs: [{ id: '1', date: '2025-01-01', exerciseId: 'ex1' }],
      assessments: [],
      settings: [],
      checklist: [],
    }
    expect(validateImportData(data)).toEqual({ valid: true })
  })
})
