import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAlbums } from '../data/AlbumsContext'

export default function Header() {
  const { state, signOut } = useAuth()
  const { ranked, shortlist } = useAlbums()
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      isActive
        ? 'bg-lime text-bg'
        : 'text-muted hover:bg-surface-2 hover:text-fg'
    }`

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="font-display text-2xl font-semibold leading-none">LP Sortr</span>
        <nav className="flex gap-1">
          <NavLink to="/" end className={tab}>Search</NavLink>
          <NavLink to="/ranking" className={tab}>
            Ranking <span className="ml-1 text-xs opacity-60">{ranked.length}</span>
          </NavLink>
          <NavLink to="/shortlist" className={tab}>
            Shortlist <span className="ml-1 text-xs opacity-60">{shortlist.length}</span>
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted">
            {state.status === 'member' ? state.username : 'Guest'}
          </span>
          <button className="btn btn-ghost" onClick={() => signOut()}>
            {state.status === 'guest' ? 'Sign up / log in' : 'Log out'}
          </button>
        </div>
      </div>
      {state.status === 'guest' && (
        <div className="bg-lime-soft px-4 py-1.5 text-center text-xs text-lime">
          You're trying it out — lists are saved in this browser only. Create an account to keep them.
        </div>
      )}
    </header>
  )
}
