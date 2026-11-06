import { useAlbums } from '../data/AlbumsContext'
import type { Album } from '../data/types'
import { useRankDialog } from './RankDialog'

/** "Rank it" / "Shortlist" button pair, reflecting which list the album is already in. */
export default function ListButtons({ album, className = '' }: { album: Album; className?: string }) {
  const { listOf, addTo } = useAlbums()
  const { openRank } = useRankDialog()
  const inList = listOf(album)
  return (
    <div className={`flex gap-1.5 ${className}`}>
      <button
        className={`btn flex-1 ${inList === 'ranked' ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800' : 'btn-primary'}`}
        disabled={inList === 'ranked'}
        onClick={() => openRank(album)}
      >
        {inList === 'ranked' ? 'Ranked ✓' : 'Rank it'}
      </button>
      <button
        className="btn btn-ghost flex-1 ring-1 ring-zinc-300 dark:ring-zinc-700"
        disabled={inList === 'shortlist'}
        onClick={() => addTo(album, 'shortlist')}
      >
        {inList === 'shortlist' ? 'Listed ✓' : 'Shortlist'}
      </button>
    </div>
  )
}
