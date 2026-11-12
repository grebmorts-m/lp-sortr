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

export type CoverSize = 'sm' | 'md' | 'lg'

/**
 * Cover URL at a display size. iTunes artwork can be any size; the Cover Art Archive
 * offers 250 (smallest) and 500.
 */
export function coverAt(url: string, size: CoverSize) {
  const px = { sm: 120, md: 250, lg: 600 }[size]
  if (/\/\d+x\d+bb\./.test(url)) return url.replace(/\/\d+x\d+bb\./, `/${px}x${px}bb.`)
  if (size === 'lg') return url.replace(/\/front-250$/, '/front-500')
  return url
}

export const isSlowCover = (url: string) => url.includes('coverartarchive.org')
