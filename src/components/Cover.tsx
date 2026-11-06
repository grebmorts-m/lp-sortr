import { useState } from 'react'
import { largeCover } from '../data/normalize'

export default function Cover({
  src,
  alt,
  className = '',
  large = false,
}: {
  src: string
  alt: string
  className?: string
  large?: boolean
}) {
  const [failed, setFailed] = useState(!src)
  return (
    <div className={`relative aspect-square overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}>
      {failed ? (
        <div className="absolute inset-0 grid place-items-center">
          {/* Vinyl placeholder */}
          <div className="grid size-3/4 place-items-center rounded-full bg-zinc-900 ring-1 ring-zinc-700">
            <div className="size-1/3 rounded-full bg-accent-500/80" />
          </div>
        </div>
      ) : (
        <img
          src={large ? largeCover(src) : src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  )
}
