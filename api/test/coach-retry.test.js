import test from 'node:test';
import assert from 'node:assert/strict';
import { retryAfterFailure, FAILURE_RETRY_MS } from '../coach/cadence.js';

test('failed automatic reviews wait an hour across scheduler restarts', () => {
  const history = [{ kind: 'review', trigger: 'scheduled', outcome: 'failed', errorClass: 'provider', at: 1000 }];
  assert.equal(retryAfterFailure(history, 61000), true);
  assert.equal(retryAfterFailure(JSON.parse(JSON.stringify(history)), 1000 + FAILURE_RETRY_MS), false);
  assert.equal(retryAfterFailure([{ ...history[0], trigger: 'manual' }], 61000), false);
  assert.equal(retryAfterFailure([{ ...history[0], errorClass: 'unusable' }], 61000), false);
});
