import { Link } from 'react-router-dom'
import { useAlbums } from '../data/AlbumsContext'
import Cover from '../components/Cover'
import AlbumMeta from '../components/AlbumMeta'
import ErrorBanner from '../components/ErrorBanner'
import { useRankDialog } from '../components/RankDialog'

export default function Shortlist() {
  const { shortlist, remove, loading, error } = useAlbums()
  const { openRank } = useRankDialog()

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
              <Cover src={entry.cover} alt={entry.title} eager={i < 8} />
              <AlbumMeta album={entry} />
              <div className="mt-auto flex gap-1.5">
                <button className="btn btn-primary flex-1" onClick={() => openRank(entry)}>
                  Listened → rank
                </button>
                <button className="btn btn-ghost px-2 hover:text-red-600" onClick={() => remove(entry)} aria-label="Remove">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
