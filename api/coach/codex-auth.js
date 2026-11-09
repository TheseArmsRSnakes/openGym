/* Codex owns ChatGPT device authorization and its private refreshable credential cache.
 * This module exposes only temporary device instructions and presence-only status to admins.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import {
  load, providerMeta,
  codexHome, codexAuthFile, ensureCodexHome, hasCodexAuth
} from './config.js';
import { run, unprivilegedIds, privilegeRefusal } from './adapters/spawn.js';
const CODEX_BIN = 'codex';

const PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
const FILE_STORE = 'cli_auth_credentials_store="file"';
const DEVICE_LOGIN_TIMEOUT_MS = 10 * 60000;
let deviceLogin = null;

function codexEnv() {
  const home = ensureCodexHome();
  return { PATH, HOME: home, CODEX_HOME: home, TMPDIR: '/tmp' };
}

function cleanLoginOutput(value) {
  // Device-code instructions intentionally contain a short-lived URL and verification code.
  // Strip terminal control bytes and any JWT-shaped value before rendering them in the admin UI.
  return String(value || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted]')
    .slice(-4096);
}

function failedLogin(attempt, fallback) {
  const detail = cleanLoginOutput(attempt.output).trim().split('\n').slice(-4).join(' ').trim();
  attempt.state = 'failed';
  attempt.error = (detail || fallback).slice(0, 500);
  attempt.finishedAt = Date.now();
  clearTimeout(attempt.timer);
}

function deviceLoginView() {
  if (deviceLogin && (deviceLogin.state === 'starting' || deviceLogin.state === 'pending')) {
    return {
      state: deviceLogin.state,
      instructions: cleanLoginOutput(deviceLogin.output) || 'Starting Codex device sign-in…'
    };
  }
  // Keep a useful error long enough for the operator to read it, then fall back to normal
  // connection status so a later admin session does not inherit stale login output.
  if (deviceLogin?.state === 'failed' && Date.now() - deviceLogin.finishedAt < 5 * 60000) {
    return { state: 'failed', error: deviceLogin.error };
  }
  return authStatus();
}

async function stopDeviceLogin() {
  const attempt = deviceLogin;
  if (!attempt || !['starting', 'pending'].includes(attempt.state) || !attempt.child) return;
  await new Promise(resolve => {
    let done = false;
    let force = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (force) clearTimeout(force);
      resolve();
    };
    attempt.child.once('close', finish);
    force = setTimeout(() => {
      try { attempt.child.kill('SIGKILL'); } catch { /* finish below still clears the cache */ }
      finish();
    }, 2000);
    try { attempt.child.kill('SIGTERM'); } catch { finish(); }
  });
}

/** Begin Codex's own device-code sign-in. The browser interaction remains between the owner and OpenAI. */
export function startCodexDeviceLogin({ replace = false } = {}) {
  const refusal = privilegeRefusal({ spawns: true });
  if (refusal) throw new Error(refusal);
  if (!providerMeta().deviceLogin) throw new Error('select OpenAI Codex CLI before starting ChatGPT sign-in');
  if (deviceLogin && (deviceLogin.state === 'starting' || deviceLogin.state === 'pending')) return deviceLoginView();
  if (hasCodexAuth() && !replace) return authStatus();
  // An admin who saw an expired credential explicitly chose to replace it. Remove only the
  // known cache file before starting the new provider-owned flow; no token is inspected.
  if (hasCodexAuth() && replace) {
    try { fs.unlinkSync(codexAuthFile()); } catch { /* login will report any real filesystem issue */ }
  }

  const home = ensureCodexHome();
  const ids = unprivilegedIds();
  const attempt = { state: 'starting', output: '', error: null, child: null, timer: null, timedOut: false, finishedAt: null };
  deviceLogin = attempt;

  try {
    const child = spawn(CODEX_BIN, ['login', '-c', FILE_STORE, '--device-auth'], {
      cwd: home,
      env: codexEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(ids || {})
    });
    attempt.child = child;
    const append = chunk => {
      attempt.output = cleanLoginOutput(attempt.output + chunk.toString());
      if (attempt.state === 'starting') attempt.state = 'pending';
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', err => failedLogin(attempt, err.message));
    child.on('close', code => {
      if (attempt.state === 'failed') return;
      if (!attempt.timedOut && code === 0 && hasCodexAuth()) {
        attempt.state = 'connected';
        attempt.finishedAt = Date.now();
        clearTimeout(attempt.timer);
        return;
      }
      failedLogin(attempt, attempt.timedOut ? 'ChatGPT device sign-in timed out' : 'ChatGPT device sign-in did not complete');
    });
    attempt.timer = setTimeout(() => {
      attempt.timedOut = true;
      try { child.kill('SIGTERM'); } catch { /* close handler records the timeout */ }
    }, DEVICE_LOGIN_TIMEOUT_MS);
    attempt.timer.unref();
  } catch (err) {
    failedLogin(attempt, err.message);
  }
  return deviceLoginView();
}

/** Status for an active device-code flow, or the normal Codex credential status once it ends. */
export const codexDeviceLoginStatus = () => deviceLoginView();

/** Presence-only status: tokens stay in the CLI cache. */
export function authStatus() {
  if (!hasCodexAuth()) return { state: 'none' };
  return { state: 'connected', type: 'chatgpt-cli', connectedAt: fs.statSync(codexAuthFile()).mtime.toISOString() };
}

export async function disconnect() {
  const refusal = privilegeRefusal({ spawns: true });
  if (refusal) throw new Error(refusal);
  await stopDeviceLogin();
  await run(CODEX_BIN, ['logout', '-c', FILE_STORE], { env: codexEnv(), cwd: codexHome(), timeoutMs: 20000 });
  try { fs.unlinkSync(codexAuthFile()); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  deviceLogin = null;
}
