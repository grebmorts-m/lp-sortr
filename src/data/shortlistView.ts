import { normalizeArtist, normalizeQuery } from './normalize'
import type { Entry } from './types'

export type ShortlistSort = 'added' | 'year' | 'artist'

/** Natural direction for each sort: newest first for dates, A–Z for names. */
export const DEFAULT_DESC: Record<ShortlistSort, boolean> = { added: true, year: true, artist: false }

/** Keep entries whose title + artist contain every word of the query (case/accent-insensitive). */
export function filterEntries(entries: Entry[], query: string): Entry[] {
  const words = normalizeQuery(query).split(' ').filter(Boolean)
  if (words.length === 0) return entries
  return entries.filter((e) => {
    const hay = ` ${normalizeQuery(e.title)} ${normalizeQuery(e.artist)} `
    return words.every((w) => hay.includes(w))
  })
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const byArtist = (a: Entry, b: Entry) => collator.compare(normalizeArtist(a.artist), normalizeArtist(b.artist))
const byTitle = (a: Entry, b: Entry) => collator.compare(a.title, b.title)
const byYearAsc = (a: Entry, b: Entry) => (a.year ?? Infinity) - (b.year ?? Infinity)

export function sortEntries(entries: Entry[], sort: ShortlistSort, desc: boolean): Entry[] {
  const dir = desc ? -1 : 1
  const cmp = (a: Entry, b: Entry): number => {
    switch (sort) {
      case 'added':
        return dir * (a.position - b.position)
      case 'year': {
        // Unknown years last in either direction.
        if ((a.year === null) !== (b.year === null)) return a.year === null ? 1 : -1
        return dir * ((a.year ?? 0) - (b.year ?? 0)) || byArtist(a, b) || byTitle(a, b)
      }
      case 'artist':
        return dir * byArtist(a, b) || byYearAsc(a, b) || byTitle(a, b)
    }
  }
  return [...entries].sort(cmp)
}
