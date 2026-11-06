import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../data/supabase'
import { clearGuestEntries, readGuestEntries } from '../data/localStore'
import { importEntries } from '../data/supabaseStore'

const GUEST_FLAG = 'lp-sortr:guest'
const EMAIL_DOMAIN = 'users.lp-sortr.app'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'guest' }
  | { status: 'member'; username: string; session: Session }

interface AuthApi {
  state: AuthState
  signIn(username: string, password: string): Promise<void>
  signUp(username: string, password: string): Promise<void>
  tryAsGuest(): void
  signOut(): Promise<void>
}

const Ctx = createContext<AuthApi | null>(null)

export function normalizeUsername(u: string) {
  return u.trim().toLowerCase()
}
const toEmail = (u: string) => `${normalizeUsername(u)}@${EMAIL_DOMAIN}`
const usernameOf = (s: Session) =>
  (s.user.user_metadata?.username as string | undefined) ?? s.user.email?.split('@')[0] ?? 'user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [guest, setGuest] = useState(() => localStorage.getItem(GUEST_FLAG) === '1')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const api = useMemo<AuthApi>(() => {
    const state: AuthState =
      session === undefined
        ? { status: 'loading' }
        : session
          ? { status: 'member', username: usernameOf(session), session }
          : guest
            ? { status: 'guest' }
            : { status: 'signedOut' }

    const leaveGuest = () => {
      localStorage.removeItem(GUEST_FLAG)
      setGuest(false)
    }

    return {
      state,
      async signIn(username, password) {
        if (!supabase) throw new Error('Accounts are not configured on this deployment.')
        const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password })
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong username or password.' : error.message)
        leaveGuest()
      },
      async signUp(username, password) {
        if (!supabase) throw new Error('Accounts are not configured on this deployment.')
        const name = normalizeUsername(username)
        if (!/^[a-z0-9_]{3,20}$/.test(name)) throw new Error('Username: 3–20 characters, letters, digits or _.')
        const { data, error } = await supabase.auth.signUp({
          email: toEmail(name),
          password,
          options: { data: { username: name } },
        })
        if (error) throw new Error(/already registered/i.test(error.message) ? 'That username is taken.' : error.message)
        if (!data.session) throw new Error('Sign-up needs "Confirm email" turned off in Supabase.')
        // Carry over anything collected while trying the app out.
        const local = readGuestEntries()
        if (local.length) {
          await importEntries(supabase, local)
          clearGuestEntries()
        }
        leaveGuest()
      },
      tryAsGuest() {
        localStorage.setItem(GUEST_FLAG, '1')
        setGuest(true)
      },
      async signOut() {
        if (state.status === 'member' && supabase) await supabase.auth.signOut()
        leaveGuest()
      },
    }
  }, [session, guest])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
