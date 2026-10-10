import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

// Guards docs/best-practices-audit.md: one row for every line of the PWA
// checklist (and a row per rule added 2026-10-09/10), every row has a status
// and evidence, every file:line it cites exists, every fail carries a fix and a
// size, and the ranked list has at most 10 stories that each name a check.
// The audit is a snapshot of the code at a named commit; what is pinned here is
// its shape, not the app's present state.

/* global process */
const root = process.cwd() + '/'
const docPath = root + 'docs/best-practices-audit.md'
const checklistPath = process.env.HOME + '/millwright-vault/seats/builder/pwa-best-practices/checklist.md'

const STATUSES = ['pass', 'fail', 'n/a']
const SIZES = ['XS', 'S', 'M', 'L']

function load() {
  expect(existsSync(docPath), 'docs/best-practices-audit.md exists').toBe(true)
  return readFileSync(docPath, 'utf8')
}

function section(text, title) {
  const parts = text.split(/^## /m).slice(1)
  const hit = parts.find((p) => p.startsWith(title))
  expect(hit, `section "## ${title}" exists`).toBeTruthy()
  return hit
}

// Table rows: | ID | Line | Status | Evidence | Fix | Size |
function rows(sectionText) {
  return sectionText
    .split('\n')
    .filter((l) => /^\|\s*[CR]\d+\s*\|/.test(l))
    .map((l) => l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim()))
}

describe('docs/best-practices-audit.md', () => {
  it('has its three sections', () => {
    const text = load()
    for (const title of ['Checklist', 'Rules added 2026-10-09', 'Ranked fix stories']) {
      section(text, title)
    }
  })

  it('has one checklist row per line of the vault checklist (31), numbered C01 to C31', () => {
    const r = rows(section(load(), 'Checklist'))
    expect(r.map((c) => c[0])).toEqual(Array.from({ length: 31 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`))
  })

  it.skipIf(!existsSync(checklistPath))('has as many checklist rows as the vault checklist has [ ] lines', () => {
    const lines = readFileSync(checklistPath, 'utf8').split('\n').filter((l) => l.startsWith('[ ]'))
    expect(rows(section(load(), 'Checklist'))).toHaveLength(lines.length)
  })

  it('covers the six rules placed 2026-10-09 by name', () => {
    const body = section(load(), 'Rules added 2026-10-09')
    const r = rows(body)
    expect(r.length).toBeGreaterThanOrEqual(6)
    for (const phrase of [
      'Long press',
      'Pause',
      'push-to-talk',
      'Credits follow removals',
      'Version raised',
      'Module boundaries',
    ]) {
      expect(r.some((c) => c[1].toLowerCase().includes(phrase.toLowerCase())), `a row names "${phrase}"`).toBe(true)
    }
  })

  it('gives every row a status and evidence, and every fail a fix and a size', () => {
    const text = load()
    const all = [...rows(section(text, 'Checklist')), ...rows(section(text, 'Rules added 2026-10-09'))]
    expect(all.length).toBeGreaterThanOrEqual(37)
    for (const [id, , status, evidence, fix, size] of all) {
      expect(STATUSES, `${id} status`).toContain(status)
      expect(evidence.length, `${id} evidence`).toBeGreaterThan(10)
      if (status === 'fail') {
        expect(fix.length, `${id} fix`).toBeGreaterThan(10)
        expect(SIZES, `${id} size`).toContain(size)
      }
    }
  })

  it('cites only file:line places that exist', () => {
    const text = load()
    const cites = [...text.matchAll(/`((?:src|docs|public|android|\.github)\/[\w./-]+|index\.html|vite\.config\.js|package\.json|README\.md|capacitor\.config\.json|vitest\.config\.js):(\d+)(?:-(\d+))?`/g)]
    expect(cites.length).toBeGreaterThan(40)
    const bad = []
    for (const [whole, path, from, to] of cites) {
      if (!existsSync(root + path)) {
        bad.push(`${whole}: no such file`)
        continue
      }
      const n = readFileSync(root + path, 'utf8').split('\n').length
      if (Number(from) < 1 || Number(to ?? from) > n || Number(to ?? from) < Number(from)) bad.push(`${whole}: file has ${n} lines`)
    }
    expect(bad).toEqual([])
  })

  it('ranks at most 10 fix stories, each with a runnable check', () => {
    const body = section(load(), 'Ranked fix stories')
    const items = body.split('\n').filter((l) => /^\d+\.\s/.test(l))
    expect(items.length).toBeGreaterThanOrEqual(5)
    expect(items.length).toBeLessThanOrEqual(10)
    for (const item of items) {
      expect(item, 'a bold title').toMatch(/\*\*[^*]+\*\*/)
      expect(item, 'a Check: with a command or test in backticks').toMatch(/Check:[^`]*`[^`]+`/)
    }
  })

  it('is linked from the README', () => {
    expect(readFileSync(root + 'README.md', 'utf8')).toContain('docs/best-practices-audit.md')
  })
})
