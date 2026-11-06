import type { Album } from './types'

// Bracketed edition notes that don't change which album it is.
const EDITION =
  /[([][^)\]]*\b(remaster(ed)?|deluxe|edition|expanded|anniversary|bonus|version|mono|stereo|explicit|clean|reissue|special|collector'?s?|legacy|super|bonus tracks?)\b[^)\]]*[)\]]/gi

function base(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '')
}

export const normalizeTitle = (t: string) => base(t.replace(EDITION, '').replace(/\s+-\s+(ep|single)$/i, ''))
export const normalizeArtist = (a: string) => base(a)
export const normalizeQuery = (q: string) => base(q)

/** Same album from (possibly) different sources or editions. */
export function sameAlbum(a: Pick<Album, 'artist' | 'title' | 'year'>, b: Pick<Album, 'artist' | 'title' | 'year'>) {
  if (normalizeArtist(a.artist) !== normalizeArtist(b.artist)) return false
  if (normalizeTitle(a.title) !== normalizeTitle(b.title)) return false
  return a.year == null || b.year == null || Math.abs(a.year - b.year) <= 1
}

/** Bigger version of a cover URL (iTunes artwork or Cover Art Archive). */
export function largeCover(url: string) {
  return url.replace(/\/\d+x\d+bb\./, '/600x600bb.').replace(/\/front-250$/, '/front-500')
}
