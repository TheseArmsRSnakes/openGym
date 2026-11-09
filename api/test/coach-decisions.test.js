import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDecisions } from '../coach/core/pending.js';
import { mergeCoach, stampPut } from '../sync-stamps.js';
const accepted = { id: 'yes', proposalId: 'p', kind: 'review', at: 10, decisions: [{ status: 'accepted' }] };
const falseDecline = { id: 'no', proposalId: 'p', kind: 'review', at: 20, dismissed: true };
const coach = { log: [accepted, falseDecline], chat: [{ id: 'a', ref: 'yes' }, { id: 'b', ref: 'no' }] };
test('repairs only a dismissal that contradicts an earlier accepted proposal', () => {
  const result = normalizeDecisions(coach);
  assert.deepEqual(result.log, [accepted]);
  assert.deepEqual(result.chat, [{ id: 'a', ref: 'yes' }]);
  const genuine = { log: [{ ...falseDecline, proposalId: 'other' }, { kind: 'revert', proposalId: 'p', at: 30 }, accepted] };
  assert.equal(normalizeDecisions(genuine), genuine);
});
test('an older device cannot restore the contradictory dismissal through a merge or a stamped push', () => {
  const clean = normalizeDecisions(coach);
  assert.deepEqual(mergeCoach(clean, coach).log, [accepted]);
  assert.deepEqual(mergeCoach(coach, clean).log, [accepted]);
  const next = { coach: structuredClone(coach) }, report = {};
  stampPut({ coach: clean }, next, { stamped: true, report });
  assert.deepEqual(next.coach.log, [accepted]);
  assert.equal(report.changed, true);
});
