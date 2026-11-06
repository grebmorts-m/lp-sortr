import type { Album, AlbumDetails, AlbumKind, Disc } from './types'

const MB = 'https://musicbrainz.org/ws/2'
const BUSY = 'MusicBrainz is busy, try again in a second.'

// MusicBrainz allows ~1 request/second per client: space all calls out.
let nextSlot = 0
async function throttle(signal?: AbortSignal) {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + 1100
  if (wait) await new Promise((r) => setTimeout(r, wait))
  signal?.throwIfAborted()
}

async function mbGet<T>(path: string, signal?: AbortSignal, retries = 1): Promise<T> {
  await throttle(signal)
  const res = await fetch(`${MB}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (res.status === 503) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1500))
      return mbGet(path, signal, retries - 1)
    }
    throw new Error(BUSY)
  }
  if (!res.ok) throw new Error(`MusicBrainz request failed (${res.status})`)
  return res.json()
}

type ArtistCredit = { name: string; joinphrase?: string }[]

interface MbReleaseGroup {
  id: string
  title: string
  'primary-type'?: string
  'first-release-date'?: string
  'artist-credit'?: ArtistCredit
}

const creditName = (ac?: ArtistCredit) =>
  (ac ?? []).map((a) => a.name + (a.joinphrase ?? '')).join('') || 'Unknown artist'

export type SearchField = 'all' | 'artist' | 'album'

/** Escape Lucene query syntax so user input is searched literally. */
const escapeLucene = (s: string) => s.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&')

function buildQuery(q: string, field: SearchField) {
  const terms = `(${escapeLucene(q)})`
  const match =
    field === 'artist'
      ? `artist:${terms}`
      : field === 'album'
        ? `releasegroup:${terms}`
        : `(releasegroup:${terms} OR artist:${terms})`
  return `${match} AND primarytype:(album OR ep)`
}

/** Search MusicBrainz release groups (albums and EPs) by title, artist or both. Max 100 results. */
export async function searchAlbums(q: string, field: SearchField = 'all', signal?: AbortSignal): Promise<Album[]> {
  const query = buildQuery(q, field)
  const data = await mbGet<{ 'release-groups': MbReleaseGroup[] }>(
    `/release-group?fmt=json&limit=100&query=${encodeURIComponent(query)}`,
    signal,
  )
  return data['release-groups'].map((rg) => ({
    id: `mb:${rg.id}`,
    itunesId: null,
    mbid: rg.id,
    title: rg.title,
    artist: creditName(rg['artist-credit']),
    year: rg['first-release-date'] ? Number(rg['first-release-date'].slice(0, 4)) || null : null,
    cover: coverUrl(rg.id),
    kind: (rg['primary-type'] === 'EP' ? 'ep' : 'album') as AlbumKind,
  }))
}

export function coverUrl(mbid: string, size: 250 | 500 = 250): string {
  return `https://coverartarchive.org/release-group/${mbid}/front-${size}`
}

// ---------- Album details ----------

interface MbRelation {
  type: string
  url?: { resource: string }
}

interface MbReleaseGroupFull {
  'first-release-date'?: string
  genres?: { name: string; count: number }[]
  relations?: MbRelation[]
}

interface MbRelease {
  id: string
  'label-info'?: { label?: { name: string } | null }[]
  media?: {
    format?: string | null
    title?: string
    tracks?: { number: string; title: string; length?: number | null }[]
  }[]
}

const COUNTRY_PREF = ['XW', 'XE', 'US', 'GB']

interface MbReleaseBrief {
  id: string
  date?: string
  status?: string
  country?: string
  media?: { 'track-count'?: number }[]
}

/**
 * Pick the "canonical" edition: the most common track count among official releases
 * (skips deluxe / bonus-disc editions), then earliest date, then preferred country.
 */
function pickRelease(releases: MbReleaseBrief[]) {
  const official = releases.filter((r) => r.status === 'Official')
  const pool = official.length ? official : releases
  const tracks = (r: MbReleaseBrief) => (r.media ?? []).reduce((s, m) => s + (m['track-count'] ?? 0), 0)
  const freq = new Map<number, number>()
  for (const r of pool) freq.set(tracks(r), (freq.get(tracks(r)) ?? 0) + 1)
  const rank = (c?: string) => {
    const i = COUNTRY_PREF.indexOf(c ?? '')
    return i === -1 ? COUNTRY_PREF.length : i
  }
  return [...pool].sort(
    (a, b) =>
      (freq.get(tracks(b)) ?? 0) - (freq.get(tracks(a)) ?? 0) ||
      (a.date || '9999').localeCompare(b.date || '9999') ||
      rank(a.country) - rank(b.country),
  )[0]
}

const LINK_LABELS: Record<string, string> = {
  wikidata: 'Wikidata',
  wikipedia: 'Wikipedia',
  discogs: 'Discogs',
  allmusic: 'AllMusic',
}

function linksOf(relations: MbRelation[] = []) {
  const links: { label: string; url: string }[] = []
  const seen = new Set<string>()
  for (const r of relations) {
    const url = r.url?.resource
    if (!url) continue
    let label = LINK_LABELS[r.type]
    if (!label && /streaming/.test(r.type)) {
      try {
        const host = new URL(url).hostname.replace(/^(www|open|music)\./, '')
        label = host.split('.')[0].replace(/^\w/, (c) => c.toUpperCase())
      } catch {
        continue
      }
    }
    if (label && !seen.has(label)) {
      seen.add(label)
      links.push({ label, url })
    }
  }
  return links
}

async function fetchDetails(mbid: string): Promise<AlbumDetails> {
  const rg = await mbGet<MbReleaseGroupFull>(`/release-group/${mbid}?inc=genres+url-rels&fmt=json`)
  const genres = [...(rg.genres ?? [])].sort((a, b) => b.count - a.count).slice(0, 5).map((g) => g.name)
  const base = {
    releaseDate: rg['first-release-date'] || null,
    genres,
    copyright: null,
    links: linksOf(rg.relations),
    musicbrainzUrl: `https://musicbrainz.org/release-group/${mbid}`,
  }

  const { releases } = await mbGet<{ releases: MbReleaseBrief[] }>(
    `/release?release-group=${mbid}&inc=media&limit=100&fmt=json`,
  )
  const chosen = releases.length ? pickRelease(releases) : undefined
  if (!chosen) return { ...base, label: null, discs: [], totalMs: 0 }

  const rel = await mbGet<MbRelease>(`/release/${chosen.id}?inc=recordings+labels&fmt=json`)
  const discs: Disc[] = (rel.media ?? []).map((m) => ({
    format: m.format ?? null,
    title: m.title || null,
    tracks: (m.tracks ?? []).map((t) => ({ number: t.number, title: t.title, lengthMs: t.length ?? null })),
  }))
  const label = rel['label-info']?.map((l) => l.label?.name).find(Boolean) ?? null
  const totalMs = discs.flatMap((d) => d.tracks).reduce((s, t) => s + (t.lengthMs ?? 0), 0)
  return { ...base, label, discs, totalMs }
}

const detailsCache = new Map<string, Promise<AlbumDetails>>()

/** Album details incl. track listing of a representative release. Cached per session. */
export function getAlbumDetails(mbid: string): Promise<AlbumDetails> {
  let p = detailsCache.get(mbid)
  if (!p) {
    p = fetchDetails(mbid)
    p.catch(() => detailsCache.delete(mbid)) // allow retry after failure
    detailsCache.set(mbid, p)
  }
  return p
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
