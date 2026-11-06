import { coverUrl } from './musicbrainz'
import type { AlbumStore, Entry } from './types'

export const GUEST_KEY = 'lp-sortr:guest-entries'

/** Entries saved before multi-source support only had an `mbid`. */
function migrate(e: Partial<Entry> & { mbid?: string | null }): Entry {
  if (e.id) return e as Entry
  return {
    ...(e as Entry),
    id: `mb:${e.mbid}`,
    itunesId: null,
    mbid: e.mbid ?? null,
    cover: coverUrl(e.mbid!),
    kind: 'album',
  }
}

function read(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.map(migrate) : []
  } catch {
    return []
  }
}

function write(entries: Entry[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(entries))
  } catch {
    // storage full or blocked: keep working in memory
  }
}

export const localStore: AlbumStore = {
  async load() {
    return read()
  },
  async save(entry) {
    write([...read().filter((e) => e.id !== entry.id), entry])
  },
  async remove(id) {
    write(read().filter((e) => e.id !== id))
  },
}

export function readGuestEntries(): Entry[] {
  return read()
}

export function clearGuestEntries() {
  localStorage.removeItem(GUEST_KEY)
}
