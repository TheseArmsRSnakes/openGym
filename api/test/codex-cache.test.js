import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tempData } from './helpers.mjs';
const data = tempData();
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-auth-test-'));
process.env.COACH_CREDENTIAL_DIR = home;
const cfg = await import('../coach/config.js');
const auth = await import('../coach/codex-auth.js');
const { forcePrivilegeVerdict } = await import('../coach/adapters/spawn.js');

test('ChatGPT cache connects without importing a token and binds to its owner', () => {
  cfg.save({ enabled: true, provider: 'codex', auth: {}, boundUid: {} });
  assert.equal(cfg.isConnected(), false);
  fs.writeFileSync(path.join(home, 'auth.json'), '{}', { mode: 0o600 });
  assert.equal(cfg.isConnected(), true);
  assert.equal(cfg.credentialFor('owner').ok, true);
  cfg.bindInstanceCredential('owner');
  assert.equal(cfg.credentialFor('other').reason, 'shared-account');
  assert.equal(cfg.jobEnv('/tmp/job', cfg.credentialFor('owner')).CODEX_HOME, home);
  assert.deepEqual(cfg.load().auth, {});
  fs.unlinkSync(path.join(home, 'auth.json'));
  assert.equal(cfg.isConnected(), false);
});
test('device login and logout refuse to spawn without the Coach privilege boundary', async () => {
  forcePrivilegeVerdict({ ok: false, why: 'test privilege refusal' });
  fs.writeFileSync(path.join(home, 'auth.json'), '{}', { mode: 0o600 });
  try {
    assert.throws(() => auth.startCodexDeviceLogin({ replace: true }), /test privilege refusal/);
    await assert.rejects(auth.disconnect(), /test privilege refusal/);
    assert.equal(fs.existsSync(path.join(home, 'auth.json')), true);
  } finally {
    forcePrivilegeVerdict(null);
    fs.unlinkSync(path.join(home, 'auth.json'));
  }
});
test.after(() => {
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(data, { recursive: true, force: true });
});
