import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../data/supabase'
import ErrorBanner from '../components/ErrorBanner'
import PasswordInput from '../components/PasswordInput'

const MIN_PASSWORD = 6

export default function Login() {
  const { signIn, signUp, tryAsGuest } = useAuth()
  const [mode, setModeRaw] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  /** Shared by both password fields, so they can be compared as text. */
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setMode = (m: typeof mode) => {
    setModeRaw(m)
    setConfirm('')
    setShowPw(false)
    setError(null)
  }

  const register = mode === 'register'
  const longEnough = password.length >= MIN_PASSWORD
  const matches = confirm === password
  const canSubmit = username.trim() !== '' && password !== '' && (!register || (longEnough && matches))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) {
      if (register && !longEnough) return setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      if (register && !matches) return setError("Passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await (mode === 'login' ? signIn : signUp)(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const tabCls = (m: typeof mode) =>
    `flex-1 rounded-md py-1.5 text-sm font-medium transition ${
      mode === m ? 'bg-surface-2 shadow-sm' : 'text-muted hover:text-fg'
    }`

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-semibold">LP Sortr</h1>
          <p className="mt-1 text-muted">Rank the albums you've heard. Shortlist the ones you haven't.</p>
        </div>

        {supabase ? (
          <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
            <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
              <button type="button" className={tabCls('login')} onClick={() => setMode('login')}>Log in</button>
              <button type="button" className={tabCls('register')} onClick={() => setMode('register')}>Create account</button>
            </div>
            <ErrorBanner message={error} />
            <input className="input" placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <PasswordInput
              placeholder="Password"
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={setPassword}
              visible={showPw}
              onToggle={() => setShowPw((v) => !v)}
              describedBy={register ? 'pw-hint' : undefined}
            />
            {register && (
              <>
                {!confirm && (
                  <p id="pw-hint" className={`-mt-1 text-xs ${password && !longEnough ? 'text-red-400' : 'text-muted'}`}>
                    At least {MIN_PASSWORD} characters
                  </p>
                )}
                <PasswordInput
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={setConfirm}
                  visible={showPw}
                  onToggle={() => setShowPw((v) => !v)}
                  invalid={confirm !== '' && !matches}
                  describedBy="confirm-hint"
                />
                {confirm && (
                  <p id="confirm-hint" aria-live="polite" className={`-mt-1 text-xs ${matches ? 'text-lime' : 'text-red-400'}`}>
                    {matches
                      ? longEnough
                        ? 'Passwords match ✓'
                        : `Passwords match, but need at least ${MIN_PASSWORD} characters`
                      : "Passwords don't match"}
                  </p>
                )}
              </>
            )}
            <button className="btn btn-primary py-2" disabled={busy || !canSubmit}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
            {mode === 'register' && (
              <p className="text-xs text-muted">Anything you added while trying it out in this browser will be moved to your new account.</p>
            )}
          </form>
        ) : (
          <p className="rounded-xl bg-surface p-4 text-center text-sm text-muted">
            Accounts aren't configured on this deployment yet.
          </p>
        )}

        <div className="mt-6 text-center">
          <button className="btn btn-ghost" onClick={tryAsGuest}>Just try it out →</button>
          <p className="mt-1 text-xs text-muted">No account needed. Saved in this browser.</p>
        </div>
      </div>
    </div>
  )
}
