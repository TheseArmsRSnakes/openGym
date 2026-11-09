import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api, passwordLogin, passkeyAssertion } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { Row, Button } from './ui.jsx'

const MIN_PASSWORD = 1
const toast = message => useUI.getState().toast(message)

export function PasswordSignInSheet({ close }) {
  const { setUser, pullState } = useStore()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const user = await passwordLogin(name.trim(), password)
      setUser(user); close(); await pullState(); toast(t('Welcome back, {0}', user.name))
    } catch (e) { setError(e.message || t('Sign-in failed')) }
    finally { setBusy(false) }
  }
  return <>
    <h3>{t('Sign in with password')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Use your profile name and password.')}</div>
    <form onSubmit={submit}>
      <input className="input" name="username" autoComplete="username" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
      <div style={{ height: 10 }} />
      <input className="input" type="password" name="password" autoComplete="current-password" placeholder={t('Password')} value={password} onChange={e => setPassword(e.target.value)} />
      {error && <div className="small" role="alert" style={{ color: 'var(--red)', marginTop: 10 }}>{error}</div>}
      <div style={{ height: 12 }} />
      <Button type="submit" variant="primary" disabled={busy}>{t('Sign in')}</Button>
    </form>
  </>
}

export function PasswordRow() {
  const [status, setStatus] = useState(null)
  const load = () => api('/api/account/password').then(setStatus).catch(() => {})
  useEffect(() => { load() }, [])
  if (!status) return null
  const open = () => useUI.getState().openSheet(close => <PasswordSetSheet close={close} status={status} done={load} />)
  return <Row icon="lock" iconTint="var(--orange)" title={t('Password')} subtitle={status.set ? t('Set — sign in as “{0}”', status.name) : t('Not set — sign in where passkeys do not work.')} accessory="chevron" onClick={open} />
}

function PasswordSetSheet({ close, status, done }) {
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async event => {
    event.preventDefault()
    if (busy) return
    if ([...next].length < MIN_PASSWORD) return setError(t('Use at least {0} characters.', MIN_PASSWORD))
    if (next !== again) return setError(t('The two passwords are not the same.'))
    setBusy(true); setError('')
    try {
      const proof = await passkeyAssertion()
      await api('/api/account/password', { method: 'POST', body: JSON.stringify({ next, ...proof }) })
      close(); done(); toast(t('Password saved — sign in with your profile name and password.'))
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') setError(e.message || t('Could not save password')) }
    finally { setBusy(false) }
  }
  return <>
    <h3>{status.set ? t('Change password') : t('Set a password')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Confirm with your passkey, then sign in as “{0}” with this password.', status.name)}</div>
    <form onSubmit={save}>
      <input className="input" type="password" name="new-password" autoComplete="new-password" placeholder={t('New password')} value={next} onChange={e => setNext(e.target.value)} />
      <div style={{ height: 10 }} />
      <input className="input" type="password" name="new-password-again" autoComplete="new-password" placeholder={t('Repeat the password')} value={again} onChange={e => setAgain(e.target.value)} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('At least {0} character.', MIN_PASSWORD)}</div>
      {error && <div className="small" role="alert" style={{ color: 'var(--red)', marginTop: 10 }}>{error}</div>}
      <div style={{ height: 12 }} />
      <Button type="submit" variant="primary" disabled={busy}>{t('Confirm with passkey & save')}</Button>
    </form>
  </>
}
