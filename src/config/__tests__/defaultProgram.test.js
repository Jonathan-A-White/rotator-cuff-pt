import { describe, it, expect } from 'vitest'
import defaultProgram from '../defaultProgram.json'
import { validateProgram } from '../schema.js'

describe('defaultProgram', () => {
  it('passes schema validation', () => {
    const result = validateProgram(defaultProgram)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('has all required top-level fields', () => {
    expect(defaultProgram.id).toBeDefined()
    expect(defaultProgram.name).toBeDefined()
    expect(defaultProgram.phases).toBeDefined()
    expect(defaultProgram.exercises).toBeDefined()
    expect(defaultProgram.assessmentSections).toBeDefined()
    expect(defaultProgram.progressionRules).toBeDefined()
  })

  it('has 14 exercises across 3 phases', () => {
    expect(defaultProgram.exercises).toHaveLength(14)
    expect(defaultProgram.phases).toHaveLength(3)
  })

  it('all exercises have valid timerType', () => {
    const validTypes = ['isometric', 'rep_based', 'hybrid']
    for (const ex of defaultProgram.exercises) {
      expect(validTypes).toContain(ex.timerType)
    }
  })

  it('Phase 3 has 8 checklist items', () => {
    const phase3 = defaultProgram.phases.find((p) => p.id === 3)
    expect(phase3).toBeDefined()
    expect(phase3.checklists).toHaveLength(8)
  })

  it('assessment sections cover all expected fields', () => {
    const sectionIds = defaultProgram.assessmentSections.map((s) => s.id)
    expect(sectionIds).toContain('painfulArc')
    expect(sectionIds).toContain('emptyCan')
    expect(sectionIds).toContain('resistedER')
    expect(sectionIds).toContain('liftOff')
    expect(sectionIds).toContain('crossBodyAdduction')
    expect(sectionIds).toContain('jacketTest')
    expect(sectionIds).toContain('averageDailyPain')
    expect(sectionIds).toContain('sleepQuality')
    expect(sectionIds).toContain('notes')
  })

  it('progression rules have all required thresholds', () => {
    const rules = defaultProgram.progressionRules
    expect(rules.minDaysInPhase).toBeDefined()
    expect(rules.minConsistencyPct).toBeDefined()
    expect(rules.evalWindowDays).toBeDefined()
    expect(rules.maxAvgPain).toBeDefined()
    expect(rules.minAssessments).toBeDefined()
    expect(rules.maxSinglePain).toBeDefined()
  })

  it('exercise IDs are unique', () => {
    const ids = defaultProgram.exercises.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('phase IDs are unique', () => {
    const ids = defaultProgram.phases.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every exercise references a valid phase ID', () => {
    const phaseIds = new Set(defaultProgram.phases.map((p) => p.id))
    for (const ex of defaultProgram.exercises) {
      expect(phaseIds.has(ex.phase)).toBe(true)
    }
  })
})
