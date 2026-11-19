import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../data/AlbumsContext'
import type { Album, Entry } from '../data/types'
import Cover from '../components/Cover'
import AlbumMeta from '../components/AlbumMeta'
import ErrorBanner from '../components/ErrorBanner'
import AlbumDrawer from '../components/AlbumDrawer'
import { useRankDialog } from '../components/RankDialog'
import { filterEntries, sortEntries, type ShortlistSort } from '../data/shortlistView'

const SORT_KEY = 'lp-sortr:shortlist-sort'
type Order = { sort: ShortlistSort; desc: boolean }
// Arrows follow sort direction: ↑ ascending (oldest first, A–Z), ↓ descending.
const ORDERS: { key: string; label: string; order: Order }[] = [
  { key: 'added-desc', label: '↓ Added: newest first', order: { sort: 'added', desc: true } },
  { key: 'added-asc', label: '↑ Added: oldest first', order: { sort: 'added', desc: false } },
  { key: 'year-desc', label: '↓ Year: newest first', order: { sort: 'year', desc: true } },
  { key: 'year-asc', label: '↑ Year: oldest first', order: { sort: 'year', desc: false } },
  { key: 'artist-asc', label: '↑ Artist: A–Z', order: { sort: 'artist', desc: false } },
  { key: 'artist-desc', label: '↓ Artist: Z–A', order: { sort: 'artist', desc: true } },
]
const keyOf = ({ sort, desc }: Order) => `${sort}-${desc ? 'desc' : 'asc'}`

function loadSort(): Order {
  try {
    const v = JSON.parse(localStorage.getItem(SORT_KEY) ?? 'null')
    const known = v && ORDERS.find((o) => o.key === keyOf(v))
    if (known) return known.order
  } catch {
    /* storage unavailable or corrupt */
  }
  return ORDERS[0].order
}

export default function Shortlist() {
  const { shortlist, remove, loading, error } = useAlbums()
  const { openRank } = useRankDialog()
  const [selected, setSelected] = useState<Album | null>(null)
  const closeDrawer = useCallback(() => setSelected(null), [])
  const [query, setQuery] = useState('')
  const [{ sort, desc }, setOrder] = useState(loadSort)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify({ sort, desc }))
    } catch {
      /* not critical */
    }
  }, [sort, desc])

  const visible = useMemo(() => sortEntries(filterEntries(shortlist, query), sort, desc), [shortlist, query, sort, desc])
  const clear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  if (loading) return <p className="py-16 text-center text-muted">Loading…</p>

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-semibold">Shortlist</h1>
      <p className="mb-6 text-sm text-muted">Albums to listen to next. Once you've heard one, rank it.</p>
      <ErrorBanner message={error} />
      {shortlist.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Your shortlist is empty. <Link to="/" className="text-lime underline">Find something to listen to</Link>.
        </p>
      ) : (
        <>
          {/* Sort controls sit right of the search bar; below it on narrow screens. */}
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <input
                ref={inputRef}
                type="search"
                className="input pr-10 [&::-webkit-search-cancel-button]:hidden"
                placeholder="Search your shortlist…"
                aria-label="Search your shortlist"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && clear()}
              />
              {query && (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear search"
                  title="Clear search"
                  className="absolute inset-y-0 right-2 my-auto grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              )}
            </div>
            <div className="relative shrink-0 self-start sm:self-auto">
              <select
                aria-label="Sort shortlist"
                className="input cursor-pointer appearance-none py-2 pr-9 text-sm font-medium"
                value={keyOf({ sort, desc })}
                onChange={(e) => setOrder(ORDERS.find((o) => o.key === e.target.value)!.order)}
              >
                {ORDERS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 16 16" className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 6l4 4 4-4" />
              </svg>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted empty:mb-6" aria-live="polite">
            {query.trim() && `${visible.length} of ${shortlist.length} album${shortlist.length === 1 ? '' : 's'}`}
          </p>

          {visible.length === 0 ? (
            <p className="py-16 text-center text-muted">
              No shortlisted albums match “{query.trim()}”.{' '}
              <button className="text-lime underline" onClick={clear}>
                Clear search
              </button>
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((entry, i) => (
                <li key={entry.id} className="flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-sm ring-1 ring-line">
                  <div className="group relative">
                    <button className="block w-full cursor-pointer" onClick={() => setSelected(entry)} aria-label={`Show info for ${entry.title}`}>
                      <Cover src={entry.cover} alt={entry.title} eager={i < 8} />
                    </button>
                    <button
                      className="absolute right-1.5 top-1.5 rounded-full bg-bg/65 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur transition hover:bg-bg/85"
                      onClick={() => setSelected(entry)}
                      aria-label={`Info: ${entry.title}`}
                      title="Album info"
                    >
                      ⓘ Info
                    </button>
                  </div>
                  <AlbumMeta album={entry} />
                  <CardActions entry={entry} onRank={() => openRank(entry)} onRemove={() => remove(entry)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <AlbumDrawer album={selected} onClose={closeDrawer} />
    </div>
  )
}

/** "Listened → rank" and ✕; the ✕ asks for confirmation before removing. */
function CardActions({ entry, onRank, onRemove }: { entry: Entry; onRank: () => void; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <div className="mt-auto flex gap-1.5">
        <button className="btn btn-primary flex-1" onClick={onRank}>
          Listened → rank
        </button>
        <button className="btn btn-ghost px-2 hover:text-red-400" onClick={() => setConfirming(true)} aria-label={`Remove ${entry.title}`}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Remove ${entry.title} from your shortlist?`}
      onKeyDown={(e) => e.key === 'Escape' && setConfirming(false)}
      className="mt-auto rounded-lg border border-red-900 bg-red-950/40 p-2"
    >
      <p className="mb-2 text-xs text-red-300">Remove from shortlist?</p>
      <div className="flex gap-1.5">
        <button className="btn min-w-0 flex-1 bg-red-600 px-1.5 py-1 text-sm text-fg hover:bg-red-700" onClick={onRemove} autoFocus>
          Remove
        </button>
        <button className="btn btn-ghost min-w-0 flex-1 px-1.5 py-1 text-sm ring-1 ring-line" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
