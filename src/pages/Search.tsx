import { useCallback, useEffect, useRef, useState } from 'react'
import type { SearchField } from '../data/musicbrainz'
import { searchAll } from '../data/search'
import { useAlbums } from '../data/AlbumsContext'
import type { Album } from '../data/types'
import Cover from '../components/Cover'
import AlbumMeta from '../components/AlbumMeta'
import ErrorBanner from '../components/ErrorBanner'
import ListButtons from '../components/ListButtons'
import AlbumDrawer from '../components/AlbumDrawer'
import Segmented from '../components/Segmented'

const FIELDS: [SearchField, string][] = [
  ['all', 'Show All'],
  ['artist', 'Artist'],
  ['album', 'Album'],
]

export default function Search() {
  const [q, setQ] = useState('')
  const [field, setField] = useState<SearchField>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const clear = () => {
    setQ('')
    inputRef.current?.focus()
  }
  const [results, setResults] = useState<Album[]>([])
  const [busy, setBusy] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Album | null>(null)
  const closeDrawer = useCallback(() => setSelected(null), [])
  const { error } = useAlbums()

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setSearchError(null)
      setBusy(false)
      return
    }
    const ctrl = new AbortController()
    // Debounce: iTunes allows ~20 requests/minute, MusicBrainz ~1/second.
    const t = setTimeout(async () => {
      setBusy(true)
      setSearchError(null)
      try {
        // Updates twice: iTunes (fast) first, then merged with MusicBrainz.
        await searchAll(term, field, setResults, ctrl.signal)
      } catch (e) {
        if (!ctrl.signal.aborted) setSearchError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!ctrl.signal.aborted) setBusy(false)
      }
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, field])

  return (
    <div>
      {/* Options sit right of the bar; below it on narrow screens. Same 0.75rem gap either way. */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            type="search"
            className="input pr-16 text-lg [&::-webkit-search-cancel-button]:hidden"
            placeholder={field === 'artist' ? 'Search by artist…' : field === 'album' ? 'Search by album title…' : 'Search albums or artists…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && clear()}
            autoFocus
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
            {busy && (
              <div className="size-5 animate-spin rounded-full border-2 border-line border-t-lime" aria-label="Searching" />
            )}
            {q && (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear search"
                title="Clear search"
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <Segmented options={FIELDS} value={field} onChange={setField} label="Search in" className="shrink-0 self-start sm:self-auto" />
      </div>

      <ErrorBanner message={searchError ?? error} />

      {results.length === 0 && !busy && (
        <p className="py-16 text-center text-muted">
          {q.trim().length < 2 ? 'Find an album, then rank it or save it for later.' : 'No albums found.'}
        </p>
      )}

      {results.length > 0 && (
        <p className="mb-3 text-sm text-muted">
          {results.length} result{results.length === 1 ? '' : 's'}
          {busy && <span className="text-muted"> · still searching…</span>}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {results.map((album) => (
          <li key={album.id} className="flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-sm ring-1 ring-line">
            <div className="group relative">
              <button className="block w-full cursor-pointer" onClick={() => setSelected(album)} aria-label={`Show info for ${album.title}`}>
                <Cover src={album.cover} alt={album.title} />
              </button>
              <button
                className="absolute right-1.5 top-1.5 rounded-full bg-bg/65 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur transition hover:bg-bg/85"
                onClick={() => setSelected(album)}
                aria-label={`Info: ${album.title}`}
                title="Album info"
              >
                ⓘ Info
              </button>
            </div>
            <AlbumMeta album={album} />
            <ListButtons album={album} className="mt-auto" />
          </li>
        ))}
      </ul>

      <AlbumDrawer album={selected} onClose={closeDrawer} />
    </div>
  )
}
