import { describe, it, expect } from 'vitest'
import { orderExercises, isExerciseComplete, byProgramOrder } from '../exerciseOrder'

const ex = (id, sortOrder, sets = 3) => ({ id, sortOrder, sets })

const program = [ex('a', 1), ex('b', 2), ex('c', 3), ex('d', 4)]
const ids = (list) => list.map((e) => e.id)

describe('isExerciseComplete', () => {
  it('is true only when every set is logged', () => {
    expect(isExerciseComplete(ex('a', 1, 3), { a: 3 })).toBe(true)
    expect(isExerciseComplete(ex('a', 1, 3), { a: 4 })).toBe(true)
    expect(isExerciseComplete(ex('a', 1, 3), { a: 2 })).toBe(false)
    expect(isExerciseComplete(ex('a', 1, 3), {})).toBe(false)
  })

  it('never reports complete for an exercise with no sets', () => {
    expect(isExerciseComplete(ex('a', 1, 0), { a: 5 })).toBe(false)
  })
})

describe('orderExercises', () => {
  it('keeps program order when nothing is done', () => {
    expect(ids(orderExercises(program, {}))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('sinks completed exercises below the ones still to do', () => {
    expect(ids(orderExercises(program, { a: 3, c: 3 }))).toEqual(['b', 'd', 'a', 'c'])
  })

  it('leaves partially-done exercises on top', () => {
    expect(ids(orderExercises(program, { a: 2, b: 3 }))).toEqual(['a', 'c', 'd', 'b'])
  })

  it('keeps program order within each group', () => {
    expect(ids(orderExercises(program, { d: 3, b: 3 }))).toEqual(['a', 'c', 'b', 'd'])
  })

  it('sorts exercises missing a sortOrder to the end', () => {
    const mixed = [ex('z'), ex('a', 2), ex('b', 1)]
    expect(ids(orderExercises(mixed, {}))).toEqual(['b', 'a', 'z'])
  })

  it('does not mutate the input array', () => {
    const input = [...program]
    orderExercises(input, { a: 3 })
    expect(ids(input)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('holds a frozen order regardless of completion', () => {
    const frozenOrder = ['c', 'a', 'd', 'b']
    expect(ids(orderExercises(program, { c: 3, a: 3 }, { frozenOrder })))
      .toEqual(['c', 'a', 'd', 'b'])
  })

  it('appends exercises missing from the frozen order', () => {
    const frozenOrder = ['d', 'b']
    expect(ids(orderExercises(program, {}, { frozenOrder }))).toEqual(['d', 'b', 'a', 'c'])
  })

  it('keeps a pinned exercise in place even when complete', () => {
    expect(ids(orderExercises(program, { a: 3, c: 3 }, { pinnedId: 'c' })))
      .toEqual(['b', 'c', 'd', 'a'])
  })

  it('ignores a pinned id that is not complete', () => {
    expect(ids(orderExercises(program, { d: 3 }, { pinnedId: 'b' })))
      .toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('byProgramOrder', () => {
  it('compares two unranked exercises as equal', () => {
    expect(byProgramOrder(ex('x'), ex('y'))).toBe(0)
  })
})
