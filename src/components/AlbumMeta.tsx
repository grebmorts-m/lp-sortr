import type { Album } from '../data/types'

export default function AlbumMeta({ album }: { album: Album }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium" title={album.title}>{album.title}</div>
      <div className="truncate text-sm text-muted" title={album.artist}>
        {album.artist}
        {album.year && <span className="text-muted"> · {album.year}</span>}
        {album.kind === 'ep' && (
          <span className="ml-1.5 rounded bg-surface-2 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-fg/80">
            EP
          </span>
        )}
      </div>
    </div>
  )
}
