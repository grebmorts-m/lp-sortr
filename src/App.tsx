import { useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AlbumsProvider } from './data/AlbumsContext'
import { localStore } from './data/localStore'
import { supabase } from './data/supabase'
import { createSupabaseStore } from './data/supabaseStore'
import Header from './components/Header'
import Login from './pages/Login'
import Search from './pages/Search'
import Ranking from './pages/Ranking'
import Shortlist from './pages/Shortlist'

export default function App() {
  const { state } = useAuth()
  const userId = state.status === 'member' ? state.session.user.id : null

  // A new store per user so data reloads on login/logout.
  const store = useMemo(
    () => (userId && supabase ? createSupabaseStore(supabase) : localStore),
    [userId],
  )

  if (state.status === 'loading') {
    return <div className="grid min-h-dvh place-items-center text-zinc-500">Loading…</div>
  }
  if (state.status === 'signedOut') return <Login />

  return (
    <AlbumsProvider key={userId ?? 'guest'} store={store}>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/shortlist" element={<Shortlist />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AlbumsProvider>
  )
}
