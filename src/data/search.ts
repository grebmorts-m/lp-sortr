import { searchAlbums, type SearchField } from './musicbrainz'
import { searchItunes } from './itunes'
import { sameAlbum } from './normalize'
import type { Album } from './types'

/**
 * Merge iTunes and MusicBrainz results. Matching albums become one result carrying both ids
 * (iTunes id and cover preferred). Keeps iTunes relevance order; MusicBrainz-only albums follow.
 */
export function mergeResults(itunes: Album[], mb: Album[]): Album[] {
  const merged = itunes.map((a) => ({ ...a }))
  const mbOnly: Album[] = []
  for (const m of mb) {
    const hit = merged.find((a) => a.mbid === null && sameAlbum(a, m))
    if (hit) {
      hit.mbid = m.mbid
      hit.year ??= m.year
    } else if (!mbOnly.some((x) => sameAlbum(x, m))) {
      mbOnly.push(m)
    }
  }
  return [...merged, ...mbOnly]
}

/**
 * Query both sources in parallel. `onUpdate` fires when each source answers, so fast
 * iTunes results show first. Rejects only if both sources fail.
 */
export async function searchAll(
  q: string,
  field: SearchField,
  onUpdate: (results: Album[]) => void,
  signal?: AbortSignal,
): Promise<void> {
  let it: Album[] = []
  let mb: Album[] = []
  const emit = () => !signal?.aborted && onUpdate(mergeResults(it, mb))
  const [a, b] = await Promise.allSettled([
    searchItunes(q, field, signal).then((r) => {
      it = r
      emit()
    }),
    searchAlbums(q, field, signal).then((r) => {
      mb = r
      emit()
    }),
  ])
  if (a.status === 'rejected' && b.status === 'rejected') throw a.reason
  for (const r of [a, b]) if (r.status === 'rejected' && !signal?.aborted) console.warn('Search source failed:', r.reason)
}
