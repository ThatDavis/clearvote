'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Option {
  id: string
  label: string
}

function SortableOption({ option, index }: { option: Option; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 transition-shadow ${
        isDragging
          ? 'border-chicago-blue bg-white shadow-xl z-10 scale-[1.02]'
          : 'border-zinc-200 bg-white hover:border-chicago-blue/30 hover:shadow-sm'
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chicago-red/10 text-sm font-bold text-chicago-red">
        {index + 1}
      </span>
      <span className="flex-1 text-sm font-medium text-zinc-900">{option.label}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded-lg px-2 py-1 text-zinc-400 transition-colors hover:text-chicago-blue hover:bg-chicago-blue/10 active:cursor-grabbing"
        aria-label={`Drag to reorder ${option.label}`}
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
    </div>
  )
}

interface Props {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
}

export default function RankedContest({ options, value, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const orderedOptions =
    value.length > 0
      ? (value.map((id) => options.find((o) => o.id === id)).filter(Boolean) as Option[])
      : options

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const newOrder = [...orderedOptions]
    const oldIndex = newOrder.findIndex((o) => o.id === active.id)
    const newIndex = newOrder.findIndex((o) => o.id === over.id)
    const reordered = arrayMove(newOrder, oldIndex, newIndex)
    onChange(reordered.map((o) => o.id))
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        Drag to rank your choices from most preferred (1) to least preferred.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedOptions.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {orderedOptions.map((option, index) => (
              <SortableOption key={option.id} option={option} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
