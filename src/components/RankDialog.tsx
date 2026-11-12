import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useAlbums } from '../data/AlbumsContext'
import type { Album, Entry } from '../data/types'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AlbumMeta from './AlbumMeta'
import Cover from './Cover'

interface RankDialogApi {
  /** Ask the user where to place `album` in the ranking. */
  openRank(album: Album): void
}

const Ctx = createContext<RankDialogApi | null>(null)

export function RankDialogProvider({ children }: { children: ReactNode }) {
  const [album, setAlbum] = useState<Album | null>(null)
  const ref = useRef<HTMLDialogElement>(null)
  const close = useCallback(() => ref.current?.close(), [])

  useEffect(() => {
    const d = ref.current
    if (album && d && !d.open) d.showModal()
  }, [album])

  const api = useMemo<RankDialogApi>(() => ({ openRank: setAlbum }), [])

  return (
    <Ctx.Provider value={api}>
      {children}
      <dialog
        ref={ref}
        onClose={() => setAlbum(null)}
        // Clicks on the dialog element itself (not its content) are backdrop clicks.
        onClick={(e) => e.target === e.currentTarget && close()}
        aria-labelledby="rank-dialog-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-fg shadow-2xl backdrop:bg-bg/50"
      >
        {album && <RankForm key={album.id} album={album} onDone={close} />}
      </dialog>
    </Ctx.Provider>
  )
}

export function useRankDialog() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useRankDialog outside RankDialogProvider')
  return ctx
}

const NEW_ID = '__new__'

function RankForm({ album, onDone }: { album: Album; onDone: () => void }) {
  const { ranked, addTo, listOf } = useAlbums()
  // Albums it will be placed among (excluding itself, in case it's somehow already ranked).
  const others = listOf(album) === 'ranked' ? ranked.filter((e) => e.id !== album.id) : ranked
  const total = others.length + 1
  /** Insertion index 0…others.length; the album's rank is slot + 1. */
  const [slot, setSlotRaw] = useState(others.length)
  const [numText, setNumText] = useState(String(others.length + 1))
  const newRowRef = useRef<HTMLLIElement>(null)

  const setSlot = (s: number) => {
    const clamped = Math.max(0, Math.min(others.length, s))
    setSlotRaw(clamped)
    setNumText(String(clamped + 1))
  }

  // Keep the album being ranked in view as it moves.
  useEffect(() => {
    newRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [slot])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // The full list as it will look, with the new album at `slot`.
  const rows: (Entry | typeof NEW_ID)[] = [...others.slice(0, slot), NEW_ID, ...others.slice(slot)]
  const ids = rows.map((r) => (r === NEW_ID ? NEW_ID : r.id))

  const onDragEnd = ({ over }: DragEndEvent) => {
    if (!over) return
    const to = ids.indexOf(String(over.id))
    if (to !== -1) setSlot(to)
  }

  const confirm = () => {
    addTo(album, 'ranked', slot)
    onDone()
  }

  return (
    <form
      method="dialog"
      onSubmit={(e) => {
        e.preventDefault()
        confirm()
      }}
      className="flex max-h-[90dvh] flex-col"
    >
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Cover src={album.cover} alt={album.title} size="sm" eager className="size-14 shrink-0" />
        <div className="min-w-0">
          <h2 id="rank-dialog-title" className="text-xs font-medium uppercase tracking-wide text-muted">
            Rank album
          </h2>
          <AlbumMeta album={album} />
        </div>
      </div>

      {others.length === 0 ? (
        <p className="p-8 text-center text-fg/80">This will be your first ranked album. 🎉</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-fg/80">Rank</span>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={total}
                // Native spinners hidden; custom chevrons below.
                className="input w-20 py-1 pr-6 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={numText}
                onChange={(e) => {
                  setNumText(e.target.value)
                  const n = Number(e.target.value)
                  if (Number.isInteger(n) && n >= 1 && n <= total) setSlotRaw(n - 1)
                }}
                onBlur={() => setSlot(Math.round(Number(numText) || total) - 1)}
              />
              <div className="absolute inset-y-0 right-1 flex flex-col justify-center">
                {([['Increase', 1, 'M4 10l4-4 4 4'], ['Decrease', -1, 'M4 6l4 4 4-4']] as const).map(([label, d, path]) => (
                  <button
                    key={label}
                    type="button"
                    tabIndex={-1}
                    aria-label={`${label} rank number`}
                    onClick={() => setSlot(slot + d)}
                    disabled={d === 1 ? slot === others.length : slot === 0}
                    className="grid h-3.5 w-4 place-items-center bg-transparent text-fg transition hover:text-lime disabled:opacity-30"
                  >
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <span className="text-fg/80">
              of <span className="font-semibold tabular-nums">{total}</span>
            </span>
            <span className="ml-auto text-xs text-muted">or drag it in the list</span>
          </label>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ol
                aria-label="Your ranking"
                className="h-[min(26rem,55dvh)] overflow-y-auto overscroll-contain rounded-xl bg-surface-2 p-2 text-sm"
              >
                {rows.map((r, i) =>
                  r === NEW_ID ? (
                    <NewRow
                      key={NEW_ID}
                      rowRef={newRowRef}
                      rank={i + 1}
                      title={album.title}
                      canUp={slot > 0}
                      canDown={slot < others.length}
                      onUp={() => setSlot(slot - 1)}
                      onDown={() => setSlot(slot + 1)}
                    />
                  ) : (
                    <OtherRow key={r.id} entry={r} rank={i + 1} />
                  ),
                )}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-line p-4">
        <button type="button" className="btn btn-ghost ring-1 ring-line" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Rank as #{slot + 1}
        </button>
      </div>
    </form>
  )
}

function NewRow({
  rowRef,
  rank,
  title,
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  rowRef: RefObject<HTMLLIElement | null>
  rank: number
  title: string
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: NEW_ID,
  })
  return (
    <li
      ref={(el) => {
        setNodeRef(el)
        rowRef.current = el
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative my-1 flex items-center gap-3 rounded-lg bg-lime-soft px-2 py-2 ring-1 ring-lime ${
        isDragging ? 'z-10 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${title} to its place`}
        className="cursor-grab touch-none px-1 text-lime active:cursor-grabbing"
      >
        ⠿
      </button>
      <span className="w-7 text-right font-semibold tabular-nums text-lime">{rank}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      <button type="button" className="btn btn-ghost px-2 py-0.5" disabled={!canUp} onClick={onUp} aria-label="Move up">
        ▲
      </button>
      <button type="button" className="btn btn-ghost px-2 py-0.5" disabled={!canDown} onClick={onDown} aria-label="Move down">
        ▼
      </button>
    </li>
  )
}

function OtherRow({ rank, entry }: { rank: number; entry: Entry }) {
  // Not draggable, but shifts out of the way while the new album is dragged.
  const { setNodeRef, transform, transition } = useSortable({ id: entry.id, disabled: { draggable: true, droppable: false } })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 px-2 py-1.5 text-muted"
    >
      <span className="w-5" />
      <span className="w-7 text-right tabular-nums text-muted">{rank}</span>
      <span className="min-w-0 flex-1 truncate">
        {entry.title} <span className="text-muted">— {entry.artist}</span>
      </span>
    </li>
  )
}
