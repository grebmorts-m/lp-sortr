import type { SupabaseClient } from '@supabase/supabase-js'
import type { AlbumStore, Entry } from './types'

const TABLE = 'albums_entries'
const COLUMNS = 'album_id, itunes_id, mbid, list, title, artist, year, cover_url, kind, position'

interface Row {
  album_id: string
  itunes_id: number | null
  mbid: string | null
  list: Entry['list']
  title: string
  artist: string
  year: number | null
  cover_url: string
  kind: Entry['kind']
  position: number
}

const toRow = (e: Entry): Row => ({
  album_id: e.id,
  itunes_id: e.itunesId,
  mbid: e.mbid,
  list: e.list,
  title: e.title,
  artist: e.artist,
  year: e.year,
  cover_url: e.cover,
  kind: e.kind,
  position: e.position,
})

const fromRow = (r: Row): Entry => ({
  id: r.album_id,
  itunesId: r.itunes_id,
  mbid: r.mbid,
  list: r.list,
  title: r.title,
  artist: r.artist,
  year: r.year,
  cover: r.cover_url,
  kind: r.kind,
  position: r.position,
})

export function createSupabaseStore(sb: SupabaseClient): AlbumStore {
  return {
    async load() {
      const { data, error } = await sb.from(TABLE).select(COLUMNS)
      if (error) throw error
      return (data as Row[]).map(fromRow)
    },
    async save(entry) {
      // user_id defaults to auth.uid() in the database.
      const { error } = await sb.from(TABLE).upsert(toRow(entry), { onConflict: 'user_id,album_id' })
      if (error) throw error
    },
    async remove(id) {
      const { error } = await sb.from(TABLE).delete().eq('album_id', id)
      if (error) throw error
    },
  }
}

export async function importEntries(sb: SupabaseClient, entries: Entry[]) {
  if (!entries.length) return
  const { error } = await sb
    .from(TABLE)
    .upsert(entries.map(toRow), { onConflict: 'user_id,album_id', ignoreDuplicates: true })
  if (error) throw error
}
