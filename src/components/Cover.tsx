import { useState } from 'react'
import { coverAt, type CoverSize } from '../data/normalize'

export default function Cover({
  src,
  alt,
  className = '',
  size = 'md',
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  size?: CoverSize
  /** Load immediately (for the first rows on screen) instead of lazily. */
  eager?: boolean
}) {
  const [failed, setFailed] = useState(!src)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={`relative aspect-square overflow-hidden rounded-md bg-surface-2 ${className}`}>
      {failed ? (
        <div className="absolute inset-0 grid place-items-center">
          {/* Vinyl placeholder */}
          <div className="grid size-3/4 place-items-center rounded-full bg-surface ring-1 ring-line">
            <div className="size-1/3 rounded-full bg-lime/80" />
          </div>
        </div>
      ) : (
        <img
          // Already decoded (e.g. from cache): show at once, no fade.
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0 && !loaded) setLoaded(true)
          }}
          src={coverAt(src, size)}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}
