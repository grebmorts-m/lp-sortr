import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../data/AlbumsContext'
import type { Album, Entry } from '../data/types'
import Cover from '../components/Cover'
import AlbumMeta from '../components/AlbumMeta'
import ErrorBanner from '../components/ErrorBanner'
import AlbumDrawer from '../components/AlbumDrawer'
import { useRankDialog } from '../components/RankDialog'

export default function Shortlist() {
  const { shortlist, remove, loading, error } = useAlbums()
  const { openRank } = useRankDialog()
  const [selected, setSelected] = useState<Album | null>(null)
  const closeDrawer = useCallback(() => setSelected(null), [])

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
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shortlist.map((entry, i) => (
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
