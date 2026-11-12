import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../data/supabase'
import ErrorBanner from '../components/ErrorBanner'

export default function Login() {
  const { signIn, signUp, tryAsGuest } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'register' && password.length < 6) return setError('Password must be at least 6 characters.')
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
            <input
              className="input"
              type="password"
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="btn btn-primary py-2" disabled={busy}>
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
