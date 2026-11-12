import type { Album, AlbumDetails, Disc } from './types'
import type { SearchField } from './musicbrainz'
import { normalizeArtist, normalizeQuery, normalizeTitle, sameAlbum } from './normalize'

const BASE = 'https://itunes.apple.com'

/** Apple storefront from the browser locale (e.g. fi-FI → FI), US by default. */
const COUNTRY = (() => {
  for (const l of typeof navigator !== 'undefined' ? navigator.languages ?? [] : []) {
    const region = l.split('-')[1]
    if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase()
  }
  return 'US'
})()

async function get<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams({ ...params, country: COUNTRY })
  const res = await fetch(`${BASE}${path}?${qs}`, { signal })
  if (res.status === 403 || res.status === 429) throw new Error('Apple search is rate-limited, try again in a minute.')
  if (!res.ok) throw new Error(`Apple search failed (${res.status})`)
  return res.json()
}

interface ItCollection {
  wrapperType: 'collection'
  collectionId: number
  collectionName: string
  artistName: string
  artworkUrl100?: string
  releaseDate?: string
  collectionExplicitness?: string
  collectionViewUrl?: string
  copyright?: string
  primaryGenreName?: string
}

interface ItTrack {
  wrapperType: 'track'
  kind?: string
  discNumber?: number
  trackNumber?: number
  trackName: string
  trackTimeMillis?: number
}

interface ItArtist {
  wrapperType: 'artist'
  artistId: number
  artistName: string
}

type ItResult = ItCollection | ItTrack | ItArtist

function toAlbum(c: ItCollection): Album | null {
  const name = c.collectionName
  if (/\s-\sSingle$/i.test(name)) return null
  const isEp = /\s-\sEP$/i.test(name)
  return {
    id: `itunes:${c.collectionId}`,
    itunesId: c.collectionId,
    mbid: null,
    title: isEp ? name.replace(/\s-\sEP$/i, '') : name,
    artist: c.artistName,
    year: c.releaseDate ? Number(c.releaseDate.slice(0, 4)) || null : null,
    cover: (c.artworkUrl100 ?? '').replace(/\/\d+x\d+bb\./, '/250x250bb.'),
    kind: isEp ? 'ep' : 'album',
  }
}

/** Map collections to albums, dropping singles and collapsing clean/explicit duplicates. */
function toAlbums(results: ItResult[]): Album[] {
  const out: { album: Album; explicit: boolean }[] = []
  for (const r of results) {
    if (r.wrapperType !== 'collection') continue
    const album = toAlbum(r)
    if (!album) continue
    const explicit = r.collectionExplicitness === 'explicit'
    const dup = out.find((o) => sameAlbum(o.album, album))
    if (dup) {
      if (explicit && !dup.explicit) Object.assign(dup, { album, explicit })
      continue
    }
    out.push({ album, explicit })
  }
  return out.map((o) => o.album)
}

export async function searchItunes(q: string, field: SearchField, signal?: AbortSignal): Promise<Album[]> {
  if (field === 'artist') {
    const { results: artists } = await get<{ results: ItArtist[] }>(
      '/search',
      { term: q, media: 'music', entity: 'musicArtist', limit: '5' },
      signal,
    )
    if (!artists.length) return []
    const nq = normalizeQuery(q)
    const artist = artists.find((a) => normalizeArtist(a.artistName) === nq) ?? artists[0]
    const { results } = await get<{ results: ItResult[] }>(
      '/lookup',
      { id: String(artist.artistId), entity: 'album', limit: '200' },
      signal,
    )
    return toAlbums(results)
  }

  const { results } = await get<{ results: ItResult[] }>(
    '/search',
    { term: q, media: 'music', entity: 'album', limit: '200' },
    signal,
  )
  const albums = toAlbums(results)
  if (field === 'album') {
    const words = normalizeQuery(q).split(' ').filter(Boolean)
    return albums.filter((a) => {
      const t = ` ${normalizeTitle(a.title)} `
      return words.every((w) => t.includes(` ${w}`))
    })
  }
  return albums
}

async function fetchItunesDetails(id: number, mbid: string | null): Promise<AlbumDetails> {
  const { results } = await get<{ results: ItResult[] }>('/lookup', { id: String(id), entity: 'song' })
  const col = results.find((r): r is ItCollection => r.wrapperType === 'collection')
  if (!col) throw new Error('Album not found on Apple Music.')
  const tracks = results.filter((r): r is ItTrack => r.wrapperType === 'track')

  const byDisc = new Map<number, ItTrack[]>()
  for (const t of tracks) {
    const d = t.discNumber ?? 1
    byDisc.set(d, [...(byDisc.get(d) ?? []), t])
  }
  const discs: Disc[] = [...byDisc.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, ts]) => ({
      format: null,
      title: null,
      tracks: ts
        .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
        .map((t) => ({ number: String(t.trackNumber ?? ''), title: t.trackName, lengthMs: t.trackTimeMillis ?? null })),
    }))

  return {
    releaseDate: col.releaseDate?.slice(0, 10) ?? null,
    label: null,
    copyright: col.copyright ?? null,
    genres: col.primaryGenreName ? [col.primaryGenreName] : [],
    discs,
    totalMs: tracks.reduce((s, t) => s + (t.trackTimeMillis ?? 0), 0),
    links: col.collectionViewUrl ? [{ label: 'Apple Music', url: col.collectionViewUrl }] : [],
    musicbrainzUrl: mbid ? `https://musicbrainz.org/release-group/${mbid}` : null,
  }
}

const cache = new Map<number, Promise<AlbumDetails>>()

export function getItunesDetails(id: number, mbid: string | null = null): Promise<AlbumDetails> {
  let p = cache.get(id)
  if (!p) {
    p = fetchItunesDetails(id, mbid)
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p
}

/** Find the same album on iTunes (for upgrading MusicBrainz-only entries). */
export async function findItunesMatch(album: Pick<Album, 'artist' | 'title' | 'year'>, signal?: AbortSignal) {
  const { results } = await get<{ results: ItResult[] }>(
    '/search',
    { term: `${album.artist} ${album.title}`, media: 'music', entity: 'album', limit: '25' },
    signal,
  )
  return toAlbums(results).find((a) => sameAlbum(a, album)) ?? null
}
