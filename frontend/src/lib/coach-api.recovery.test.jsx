// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ S: null, pending: null, fail: false, loseReply: false, acks: [] }))
vi.mock('./demo.js', () => ({ DEMO: false }))
vi.mock('./mobile.js', () => ({ MOBILE: false }))
vi.mock('../store/useStore.js', () => ({ useStore: { getState: () => ({ S: mocks.S }) } }))
vi.mock('../store/useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))
vi.mock('./api.js', () => ({ api: vi.fn(async (path, opts) => {
  if (path === '/api/coach/status') return { pending: mocks.pending, job: null }
  if (path === '/api/coach/pending/resolve') {
    const body = JSON.parse(opts.body)
    mocks.acks.push(body)
    if (mocks.fail) throw Error('offline')
    if (mocks.pending?.id === body.proposalId) mocks.pending = null
    if (mocks.loseReply) throw Error('response lost')
    return { ok: true }
  }
  throw Error('unexpected call ' + path)
}) }))
import { useCoachStatus } from './coach-api.js'
let root, host, snapshot
function Probe() { snapshot = useCoachStatus(true); return <div>{snapshot.resolutionPending ? 'Waiting to send' : 'Ready'}</div> }
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }
async function mount() {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => { root.render(<Probe />); await flush() })
}
async function unmount() { if (root) { await act(async () => root.unmount()); root = null; host.remove() } }
beforeEach(() => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  mocks.S = { routines: [{ id: 'plan', ex: [{ id: '0025', sets: 1 }] }], coach: { log: [
    { id: 'saved', proposalId: 'p1', kind: 'review', decisions: [{ id: 'c1', status: 'accepted' }, { id: 'c2', status: 'rejected' }] }
  ] } }
  mocks.pending = { id: 'p1', kind: 'review' }; mocks.fail = true; mocks.loseReply = false; mocks.acks = []
})
afterEach(async () => { await unmount(); vi.useRealTimers() })
it('retries a dropped acknowledgement automatically without reapplying or relogging the decision', async () => {
  const before = JSON.stringify(mocks.S)
  await mount()
  expect(snapshot.resolutionPending).toBe(true)
  expect(snapshot.pending).toBeNull()
  expect(host.textContent).toBe('Waiting to send')
  mocks.fail = false
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); await flush() })
  expect(snapshot.pending).toBeNull()
  expect(snapshot.resolutionPending).not.toBe(true)
  expect(mocks.acks).toHaveLength(2)
  expect(mocks.acks[1]).toEqual({ proposalId: 'p1', accepted: ['c1'], rejected: ['c2'] })
  expect(JSON.stringify(mocks.S)).toBe(before)
})
it('recovers from the persisted decision after reload', async () => {
  await mount(); await unmount()
  mocks.fail = false
  await mount()
  expect(snapshot.pending).toBeNull()
  expect(mocks.acks.at(-1).proposalId).toBe('p1')
  expect(mocks.S.coach.log).toHaveLength(1)
})
it('handles an acknowledgement applied by the server whose response was lost', async () => {
  mocks.fail = false; mocks.loseReply = true
  await mount()
  expect(snapshot.resolutionPending).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); await flush() })
  expect(snapshot.pending).toBeNull()
  expect(mocks.acks).toHaveLength(1)
})
it('leaves a new undecided proposal alone', async () => {
  mocks.pending = { id: 'new', kind: 'review' }; mocks.fail = false
  await mount()
  expect(snapshot.pending.id).toBe('new')
  expect(mocks.acks).toHaveLength(0)
})
