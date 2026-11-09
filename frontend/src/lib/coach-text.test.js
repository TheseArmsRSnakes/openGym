import { expect, it } from 'vitest'
import { coachText } from './coach.js'
import { EXIDX } from './exercises.js'
const S = { routines: [{ ex: [{ id: '0025' }, { id: '1161' }] }] }
it('names known exercises without changing dates, years, unknown ids or numbers inside words', () => {
  const text = coachText('0025 missed; For 1161 try cardio. 2026-11-09, 2026, 99999, x0025.', S)
  expect(text).toContain('Barbell Bench Press missed')
  expect(text).toContain('Rowing (with Rowing Machine)')
  expect(text).toContain('2026-11-09, 2026, 99999, x0025.')
})
it('names exercises in proposals that have not been imported, including explicit ids that resemble years', () => {
  const id = Object.keys(EXIDX).find(id => +id >= 1900 && +id <= 2100 && EXIDX[id]?.n)
  expect(id).toBeTruthy()
  const p = { bundle: { routines: [{ ex: [{ id: '0025' }, { id }] }] } }
  expect(coachText('0025 needs rest.', {}, p)).toContain('Barbell Bench Press')
  expect(coachText(`Exercise ${id} needs rest.`, {}, p)).not.toContain(id)
  expect(coachText(`${id} needs rest.`, {}, p)).not.toContain(id)
  expect(coachText(`In ${id}, train regularly.`, {}, p)).toContain(id)
})
it('does not interpret a quantity as an exercise reference', () => {
  const S = { routines: [{ ex: [{ id: '1161' }] }] }
  expect(coachText('Row 1161 m, burn 1161 kcal, and 1161 minutes is too long.', S)).toBe('Row 1161 m, burn 1161 kcal, and 1161 minutes is too long.')
})
