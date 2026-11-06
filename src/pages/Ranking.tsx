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
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../data/AlbumsContext'
import type { Album, Entry } from '../data/types'
import Cover from '../components/Cover'
import AlbumMeta from '../components/AlbumMeta'
import ErrorBanner from '../components/ErrorBanner'
import AlbumDrawer from '../components/AlbumDrawer'

export default function Ranking() {
  const { ranked, reorder, loading, error } = useAlbums()
  const [selected, setSelected] = useState<Album | null>(null)
  const closeDrawer = useCallback(() => setSelected(null), [])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ranked.findIndex((e) => e.id === active.id)
    const to = ranked.findIndex((e) => e.id === over.id)
    reorder('ranked', from, to)
  }

  if (loading) return <p className="py-16 text-center text-zinc-500">Loading…</p>

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Your ranking</h1>
      <p className="mb-6 text-sm text-zinc-500">Drag albums to reorder. #1 is your favourite.</p>
      <ErrorBanner message={error} />
      {ranked.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">
          Nothing ranked yet. <Link to="/" className="text-accent-600 underline">Search for an album</Link>.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ranked.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2">
              {ranked.map((entry, i) => (
                <RankRow key={entry.id} entry={entry} rank={i + 1} total={ranked.length} onInfo={() => setSelected(entry)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <AlbumDrawer album={selected} onClose={closeDrawer} />
    </div>
  )
}

function RankRow({ entry, rank, total, onInfo }: { entry: Entry; rank: number; total: number; onInfo: () => void }) {
  const { reorder } = useAlbums()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl bg-white p-2 pr-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 ${
        isDragging ? 'relative z-10 shadow-lg ring-accent-500' : 'shadow-sm'
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${entry.title}`}
        className="cursor-grab touch-none px-1 text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
      >
        ⠿
      </button>
      <span className={`w-8 text-right text-lg font-semibold tabular-nums ${rank <= 3 ? 'text-accent-600' : 'text-zinc-400'}`}>
        {rank}
      </span>
      <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" onClick={onInfo} aria-label={`Show info for ${entry.title}`}>
        <Cover src={entry.cover} alt={entry.title} className="size-14 shrink-0" />
        <AlbumMeta album={entry} />
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button className="btn btn-ghost px-2" disabled={rank === 1} onClick={() => reorder('ranked', rank - 1, rank - 2)} aria-label="Move up">↑</button>
        <button className="btn btn-ghost px-2" disabled={rank === total} onClick={() => reorder('ranked', rank - 1, rank)} aria-label="Move down">↓</button>
        <button className="btn btn-ghost px-2.5 ring-1 ring-zinc-300 dark:ring-zinc-700" onClick={onInfo} title="Album info" aria-label={`Info: ${entry.title}`}>
          ⓘ<span className="hidden sm:inline"> Info</span>
        </button>
      </div>
    </li>
  )
}
