import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCoverUpgrade } from './coverUpgrade'
import { sameAlbum } from './normalize'
import type { Album, AlbumStore, Entry, ListName } from './types'

interface AlbumsApi {
  loading: boolean
  error: string | null
  ranked: Entry[]
  shortlist: Entry[]
  /** Which list the album (or the same album from another source/edition) is in. */
  listOf(album: Album): ListName | null
  /** Add (or move) an album into a list, at `index` (0-based) or at the end. */
  addTo(album: Album, list: ListName, index?: number): Promise<void>
  remove(album: Album): Promise<void>
  /** Move an entry within its list to the given index. */
  reorder(list: ListName, from: number, to: number): Promise<void>
}

const Ctx = createContext<AlbumsApi | null>(null)

const byPosition = (a: Entry, b: Entry) => a.position - b.position

/** Fractional position that puts an item at `index` among `items` (sorted, without the item). */
function positionAt(items: Entry[], index: number) {
  const before = items[index - 1]?.position
  const after = items[index]?.position
  if (before === undefined) return (after ?? 1) - 1
  if (after === undefined) return before + 1
  return (before + after) / 2
}

export function AlbumsProvider({ store, children }: { store: AlbumStore; children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    store
      .load()
      .then((e) => alive && setEntries(e))
      .catch((e) => alive && setError(String(e.message ?? e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [store])

  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // Swap slow MusicBrainz covers for iTunes ones in the background (not for unsaved changes).
  const applyUpgrade = useCallback(
    (id: string, patch: Pick<Entry, 'itunesId' | 'cover'>) => {
      const current = entriesRef.current.find((e) => e.id === id)
      if (!current) return
      const updated = { ...current, ...patch }
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
      store.save(updated).catch(() => {
        /* kept in memory; retried next visit */
      })
    },
    [store],
  )
  useCoverUpgrade(loading ? [] : entries, applyUpgrade)

  // Optimistic update: change local state first, roll back on failure.
  const commit = useCallback(
    async (next: Entry[], op: () => Promise<void>) => {
      const prev = entries
      setEntries(next)
      setError(null)
      try {
        await op()
      } catch (e) {
        setEntries(prev)
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [entries],
  )

  const api = useMemo<AlbumsApi>(() => {
    const sorted = (list: ListName) => entries.filter((e) => e.list === list).sort(byPosition)
    const ranked = sorted('ranked')
    const shortlist = sorted('shortlist')
    // Match by id, by either source id, then fuzzily — prevents saving one album twice.
    const find = (a: Album) =>
      entries.find((e) => e.id === a.id) ??
      entries.find((e) => (a.itunesId && e.itunesId === a.itunesId) || (a.mbid && e.mbid === a.mbid)) ??
      entries.find((e) => sameAlbum(e, a))

    return {
      loading,
      error,
      ranked,
      shortlist,
      listOf: (album) => find(album)?.list ?? null,
      addTo(album, list, index) {
        const existing = find(album)
        const target = (list === 'ranked' ? ranked : shortlist).filter((e) => e.id !== existing?.id)
        const at = index === undefined ? target.length : Math.max(0, Math.min(index, target.length))
        // Moving keeps the saved entry (and its id); fill in a source id it was missing.
        const fields: Album = existing
          ? { ...existing, itunesId: existing.itunesId ?? album.itunesId, mbid: existing.mbid ?? album.mbid }
          : album
        const entry: Entry = { ...fields, list, position: positionAt(target, at) }
        return commit([...entries.filter((e) => e.id !== entry.id), entry], () => store.save(entry))
      },
      remove(album) {
        const existing = find(album)
        if (!existing) return Promise.resolve()
        return commit(entries.filter((e) => e.id !== existing.id), () => store.remove(existing.id))
      },
      reorder(list, from, to) {
        const items = list === 'ranked' ? ranked : shortlist
        if (from === to || !items[from]) return Promise.resolve()
        // Fractional positioning: only the moved row changes.
        const moved = { ...items[from], position: positionAt(items.filter((_, i) => i !== from), to) }
        return commit(
          entries.map((e) => (e.id === moved.id ? moved : e)),
          () => store.save(moved),
        )
      },
    }
  }, [entries, loading, error, commit, store])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAlbums() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAlbums outside AlbumsProvider')
  return ctx
}
