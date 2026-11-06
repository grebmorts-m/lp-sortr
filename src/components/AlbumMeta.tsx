import type { Album } from '../data/types'

export default function AlbumMeta({ album }: { album: Album }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium" title={album.title}>{album.title}</div>
      <div className="truncate text-sm text-zinc-500" title={album.artist}>
        {album.artist}
        {album.year && <span className="text-zinc-400"> · {album.year}</span>}
        {album.kind === 'ep' && (
          <span className="ml-1.5 rounded bg-zinc-200 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            EP
          </span>
        )}
      </div>
    </div>
  )
}
