import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

// Guards docs/module-map.md: it has its five sections, every path it names
// exists, the collision table is well formed, and each proposed refactor
// carries a typed API and a size. Counts and line numbers are not pinned here:
// they are a snapshot taken at a named commit and are checked by hand.

/* global process */
const root = process.cwd() + '/'
const docPath = root + 'docs/module-map.md'

function load() {
  expect(existsSync(docPath), 'docs/module-map.md exists').toBe(true)
  return readFileSync(docPath, 'utf8')
}

function section(text, title) {
  const parts = text.split(/^## /m).slice(1)
  const hit = parts.find((p) => p.startsWith(title))
  expect(hit, `section "## ${title}" exists`).toBeTruthy()
  return hit
}

describe('docs/module-map.md', () => {
  it('has the five sections', () => {
    const text = load()
    for (const title of ['Modules', 'Collisions', 'Proposed refactors', 'Rule breaks', 'Library candidates']) {
      section(text, title)
    }
  })

  it('names only paths that exist (a not-yet-existing path is written without backticks, marked new)', () => {
    const text = load()
    const spans = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1])
    const pathLike = spans.filter(
      (s) => /^[\w.\-/]+$/.test(s)
        && (/^(src|docs|public|android|\.github)\//.test(s) || /\.(jsx?|json|md|css|yml|html|toml)$/.test(s)),
    )
    expect(pathLike.length).toBeGreaterThan(20)
    const missing = pathLike.filter((p) => !existsSync(root + p.replace(/\/$/, '')))
    expect(missing).toEqual([])
  })

  it('lists 15 collision files with descending commit counts', () => {
    const text = load()
    const rows = [...section(text, 'Collisions').matchAll(/^\|\s*(\d+)\s*\|\s*`(src\/[^`]+)`\s*\|\s*(\d+)\s*\|/gm)]
    expect(rows).toHaveLength(15)
    const counts = rows.map((r) => Number(r[1]))
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('gives every proposed refactor a typed API and a size, and proposes at least three', () => {
    const text = load()
    const body = section(text, 'Proposed refactors')
    const refactors = body.split(/^### /m).slice(1)
    expect(refactors.length).toBeGreaterThanOrEqual(3)
    expect(refactors.length).toBeLessThanOrEqual(8)
    for (const r of refactors) {
      const name = r.split('\n')[0]
      expect(r, `${name}: typed signatures`).toMatch(/```(ts|typescript)\n[\s\S]+?=>|```(ts|typescript)\n[\s\S]+?\):/)
      expect(r, `${name}: size`).toMatch(/\*\*Size:\*\*\s*(fits one story|does not fit one story)/i)
      expect(r, `${name}: risk`).toMatch(/\*\*Risk:\*\*/)
    }
  })

  it('gives every library candidate a library, a public API and versioning', () => {
    const text = load()
    const body = section(text, 'Library candidates')
    const candidates = body.split(/^### /m).slice(1)
    expect(candidates.length).toBeGreaterThanOrEqual(1)
    for (const c of candidates) {
      const name = c.split('\n')[0]
      expect(c, `${name}: library`).toMatch(/\*\*Library:\*\*/)
      expect(c, `${name}: API`).toMatch(/```(ts|typescript)/)
      expect(c, `${name}: versioning`).toMatch(/\*\*Versioning:\*\*/)
    }
  })

  it('is linked from the README', () => {
    expect(readFileSync(root + 'README.md', 'utf8')).toContain('docs/module-map.md')
  })
})
