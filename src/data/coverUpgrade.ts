import { useEffect, useRef } from 'react'
import { findItunesMatch } from './itunes'
import { isSlowCover } from './normalize'
import type { Entry } from './types'

// Cover Art Archive images are slow (~2.5s, uncached). Look saved albums up on iTunes in the
// background and switch to Apple's fast, long-cached artwork when the same album is found.

const MISS_KEY = 'lp-sortr:cover-miss'
const RETRY_MISS_AFTER = 30 * 24 * 3600 * 1000 // look again after 30 days
const SPACING_MS = 4000 // ≤15 lookups/min, below iTunes' ~20/min, leaving room for searches
const RATE_LIMIT_PAUSE_MS = 60_000

function readMisses(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(MISS_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function recordMiss(id: string) {
  try {
    localStorage.setItem(MISS_KEY, JSON.stringify({ ...readMisses(), [id]: Date.now() }))
  } catch {
    /* storage unavailable */
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true })
  })

/** Upgrade slow covers of saved entries; `apply` stores the iTunes id and cover. */
export function useCoverUpgrade(
  entries: Entry[],
  apply: (id: string, patch: Pick<Entry, 'itunesId' | 'cover'>) => void,
) {
  const tried = useRef(new Set<string>())
  const queue = useRef<Entry[]>([])
  /** Signal of the worker currently running (null when idle). */
  const running = useRef<AbortSignal | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const applyRef = useRef(apply)
  applyRef.current = apply

  // One worker for the provider's lifetime, so list changes don't reset its pacing.
  useEffect(() => {
    ctrl.current = new AbortController()
    return () => {
      ctrl.current?.abort()
      running.current = null
      for (const e of queue.current) tried.current.delete(e.id)
      queue.current = []
    }
  }, [])

  useEffect(() => {
    const misses = readMisses()
    for (const e of entries) {
      if (e.itunesId || !isSlowCover(e.cover) || tried.current.has(e.id)) continue
      if (Date.now() - (misses[e.id] ?? 0) < RETRY_MISS_AFTER) continue
      tried.current.add(e.id)
      queue.current.push(e)
    }
    const signal = ctrl.current?.signal
    if (running.current || !queue.current.length || !signal || signal.aborted) return

    running.current = signal
    ;(async () => {
      while (queue.current.length && !signal.aborted) {
        const e = queue.current.shift()!
        try {
          const match = await findItunesMatch(e, signal)
          if (match) applyRef.current(e.id, { itunesId: match.itunesId, cover: match.cover })
          else recordMiss(e.id)
        } catch {
          if (signal.aborted) break
          // Rate-limited or offline: put it back and wait longer.
          queue.current.unshift(e)
          await sleep(RATE_LIMIT_PAUSE_MS, signal)
          continue
        }
        await sleep(SPACING_MS, signal)
      }
      if (running.current === signal) running.current = null
    })()
  }, [entries])
}
