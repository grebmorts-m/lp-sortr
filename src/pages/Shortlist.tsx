import { Link } from 'react-router-dom'
import { useAlbums } from '../data/AlbumsContext'
import Cover from '../components/Cover'
import AlbumMeta from '../components/AlbumMeta'
import ErrorBanner from '../components/ErrorBanner'
import { useRankDialog } from '../components/RankDialog'

export default function Shortlist() {
  const { shortlist, remove, loading, error } = useAlbums()
  const { openRank } = useRankDialog()

  if (loading) return <p className="py-16 text-center text-zinc-500">Loading…</p>

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Shortlist</h1>
      <p className="mb-6 text-sm text-zinc-500">Albums to listen to next. Once you've heard one, rank it.</p>
      <ErrorBanner message={error} />
      {shortlist.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">
          Your shortlist is empty. <Link to="/" className="text-accent-600 underline">Find something to listen to</Link>.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shortlist.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <Cover src={entry.cover} alt={entry.title} />
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
