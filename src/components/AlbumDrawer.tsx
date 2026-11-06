import { useEffect, useId, useRef, useState } from 'react'
import { formatDuration, getAlbumDetails } from '../data/musicbrainz'
import { getItunesDetails } from '../data/itunes'
import type { Album, AlbumDetails } from '../data/types'
import Cover from './Cover'
import ErrorBanner from './ErrorBanner'
import { useAlbums } from '../data/AlbumsContext'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; details: AlbumDetails }

export default function AlbumDrawer({ album, onClose }: { album: Album | null; onClose: () => void }) {
  const open = album !== null
  // Keep showing the last album while the close animation runs.
  const [shown, setShown] = useState<Album | null>(album)
  const [visible, setVisible] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (album) {
      setShown(album)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const t = setTimeout(() => setShown(null), 200)
    return () => clearTimeout(t)
  }, [album])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!shown) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-zinc-950/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-zinc-900
          sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none
          ${visible ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0'}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <span className="text-sm font-medium text-zinc-500">Album info</span>
          <button ref={closeRef} className="btn btn-ghost px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-4">
          <DrawerBody key={shown.id} album={shown} titleId={titleId} onClose={onClose} />
        </div>
      </aside>
    </div>
  )
}

function DrawerBody({ album, titleId, onClose }: { album: Album; titleId: string; onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setLoad({ status: 'loading' })
    const load = album.itunesId
      ? getItunesDetails(album.itunesId, album.mbid)
      : album.mbid
        ? getAlbumDetails(album.mbid)
        : Promise.reject(new Error('No details available.'))
    load
      .then((details) => alive && setLoad({ status: 'ok', details }))
      .catch((e) => alive && setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [album.itunesId, album.mbid, attempt])

  return (
    <>
      <div className="flex gap-4 sm:flex-col">
        <Cover src={album.cover} alt={album.title} large className="w-28 shrink-0 shadow-md sm:w-full" />
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-semibold leading-tight tracking-tight">{album.title}</h2>
          <p className="mt-0.5 text-zinc-500">
            {album.artist}
            {album.year && <span className="text-zinc-400"> · {album.year}</span>}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {load.status === 'loading' && <Skeleton />}
        {load.status === 'error' && (
          <div>
            <ErrorBanner message={load.message} />
            <button className="btn btn-ghost ring-1 ring-zinc-300 dark:ring-zinc-700" onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </button>
          </div>
        )}
        {load.status === 'ok' && <Details d={load.details} />}
      </div>

      <RemoveFromRanking album={album} onRemoved={onClose} />
    </>
  )
}

function Details({ d }: { d: AlbumDetails }) {
  const multiDisc = d.discs.length > 1
  return (
    <div className="flex flex-col gap-6">
      {(d.genres.length > 0 || d.label || d.copyright || d.releaseDate) && (
        <div className="flex flex-col gap-3">
          {d.genres.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {d.genres.map((g) => (
                <li key={g} className="rounded-full bg-accent-500/15 px-2.5 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                  {g}
                </li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {d.releaseDate && (
              <>
                <dt className="text-zinc-500">Released</dt>
                <dd>{d.releaseDate}</dd>
              </>
            )}
            {d.label && (
              <>
                <dt className="text-zinc-500">Label</dt>
                <dd>{d.label}</dd>
              </>
            )}
            {d.copyright && (
              <>
                <dt className="text-zinc-500">Rights</dt>
                <dd>{d.copyright}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Tracks</h3>
        {d.discs.length === 0 ? (
          <p className="text-sm text-zinc-500">No track listing available.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {d.discs.map((disc, i) => (
              <div key={i}>
                {multiDisc && (
                  <div className="mb-1 text-xs font-medium text-zinc-500">
                    Disc {i + 1}
                    {disc.format && ` · ${disc.format}`}
                    {disc.title && ` · ${disc.title}`}
                  </div>
                )}
                <ol className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                  {disc.tracks.map((t, j) => (
                    <li key={j} className="flex items-baseline gap-3 py-1.5">
                      <span className="w-6 shrink-0 text-right tabular-nums text-zinc-400">{t.number}</span>
                      <span className="min-w-0 flex-1">{t.title}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        {t.lengthMs ? formatDuration(t.lengthMs) : '–'}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {d.totalMs > 0 && (
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-medium dark:border-zinc-800">
                <span>Total</span>
                <span className="tabular-nums">{formatDuration(d.totalMs)}</span>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {d.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline dark:text-accent-400">
            {l.label} ↗
          </a>
        ))}
        {d.musicbrainzUrl && (
          <a href={d.musicbrainzUrl} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline dark:text-accent-400">
            View on MusicBrainz ↗
          </a>
        )}
      </section>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading album details">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-4 rounded bg-zinc-200 dark:bg-zinc-800" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
      ))}
    </div>
  )
}

/** Shown for ranked albums: "Remove" reveals a confirmation before deleting. */
function RemoveFromRanking({ album, onRemoved }: { album: Album; onRemoved: () => void }) {
  const { listOf, remove } = useAlbums()
  const [confirming, setConfirming] = useState(false)
  if (listOf(album) !== 'ranked') return null

  if (!confirming) {
    return (
      <button
        className="btn mt-8 w-full text-red-600 ring-1 ring-red-200 hover:bg-red-50 dark:text-red-400 dark:ring-red-900 dark:hover:bg-red-950/50"
        onClick={() => setConfirming(true)}
      >
        Remove
      </button>
    )
  }

  return (
    <div role="alertdialog" aria-label="Confirm removal" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
      <p className="mb-2 text-sm text-red-800 dark:text-red-300">
        Remove <strong>{album.title}</strong> from your ranking? This can't be undone.
      </p>
      <div className="flex gap-1.5">
        <button
          className="btn flex-1 bg-red-600 text-white hover:bg-red-700"
          onClick={() => {
            remove(album)
            onRemoved()
          }}
          autoFocus
        >
          Yes, Remove This Album
        </button>
        <button className="btn btn-ghost flex-1 ring-1 ring-zinc-300 dark:ring-zinc-700" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
