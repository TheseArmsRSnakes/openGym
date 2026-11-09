import { expect, it } from 'vitest'
import { coachText } from './coach.js'
const S = { routines: [{ ex: [{ id: '0025' }, { id: '1161' }] }] }
it('names known exercises without changing dates, years, unknown ids or numbers inside words', () => {
  const text = coachText('0025 missed; For 1161 try cardio. 2026-11-09, 2026, 99999, x0025.', S)
  expect(text).toContain('Barbell Bench Press missed')
  expect(text).toContain('Rowing (with Rowing Machine)')
  expect(text).toContain('2026-11-09, 2026, 99999, x0025.')
})
