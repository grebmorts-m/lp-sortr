export type ListName = 'ranked' | 'shortlist'
export type AlbumKind = 'album' | 'ep'

/** An album from search (iTunes, MusicBrainz, or both merged). */
export interface Album {
  /** Stable key: "itunes:<collectionId>" or "mb:<release-group id>". */
  id: string
  itunesId: number | null
  mbid: string | null
  title: string
  artist: string
  year: number | null
  /** ~250px cover URL. */
  cover: string
  kind: AlbumKind
}

/** An album saved in one of the user's lists. */
export interface Entry extends Album {
  list: ListName
  position: number
}

/** Persistence backend. Guests use localStorage, members use Supabase. */
export interface AlbumStore {
  load(): Promise<Entry[]>
  /** Insert or replace the entry with this id. */
  save(entry: Entry): Promise<void>
  remove(id: string): Promise<void>
}

/** Album details shown in the info drawer. */
export interface Track {
  number: string
  title: string
  lengthMs: number | null
}

export interface Disc {
  format: string | null
  title: string | null
  tracks: Track[]
}

export interface AlbumDetails {
  releaseDate: string | null
  label: string | null
  /** Copyright line (iTunes has no label field). */
  copyright: string | null
  genres: string[]
  discs: Disc[]
  totalMs: number
  links: { label: string; url: string }[]
  musicbrainzUrl: string | null
}
