"use client";

import { useState, type ComponentType } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HomeCardEditingProvider } from "./HomeCardEditContext";

export interface EditableHomeCard {
  key: string;
  title: string;
  isVisible: boolean;
  component: ComponentType;
}

const OFFLINE_TITLE = "Customizing the home page requires an internet connection";

// Sizes change mid-drag (every card collapses to its header), so droppable
// rects must be re-measured continuously instead of once at drag start.
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

function SortableHomeCard({
  card,
  collapsed,
  disabled,
  onToggle,
}: Readonly<{
  card: EditableHomeCard;
  collapsed: boolean;
  disabled: boolean;
  onToggle: (isVisible: boolean) => void;
}>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.key, disabled });
  const Card = card.component;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid={`home-card-edit-${card.key}`}
      className={cn(
        // -mx-3 cancels border + padding so the card itself stays exactly where it sits outside edit mode.
        "relative -mx-3 rounded-xl border-2 border-dashed p-2.5",
        card.isVisible ? "border-blue-300 dark:border-blue-700" : "border-gray-300 dark:border-gray-600",
        isDragging && "z-10 shadow-lg ring-2 ring-blue-500 bg-white dark:bg-gray-900"
      )}
    >
      <div className="absolute right-2.5 top-2.5 z-10 flex h-8 items-center gap-2 pl-2">
        {!card.isVisible && <span className="text-xs text-gray-500 dark:text-gray-400">Hidden</span>}
        <Switch
          checked={card.isVisible}
          onCheckedChange={onToggle}
          disabled={disabled}
          title={disabled ? OFFLINE_TITLE : undefined}
          aria-label={`Show ${card.title} on home page`}
        />
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing touch-none disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Drag to reorder ${card.title}`}
          disabled={disabled}
          title={disabled ? OFFLINE_TITLE : undefined}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {/* The card is a preview while editing: inert so its links, buttons and inputs can't be used. */}
      <div
        inert
        className={cn(
          "select-none",
          !card.isVisible && "opacity-40",
          // While any card is dragged, every card shrinks to its header so a long
          // page can be reordered without dragging a tall card past others.
          collapsed && "max-h-8 overflow-hidden"
        )}
      >
        <Card />
      </div>
    </div>
  );
}

/**
 * The home page in edit mode: every card (hidden ones included, dimmed) as a
 * live, non-interactive preview with a drag handle and a visibility switch in
 * its top-right corner. Each change is reported immediately via `onChange`.
 */
export function EditableHomeCards({
  cards,
  disabled,
  onChange,
}: Readonly<{
  cards: EditableHomeCard[];
  disabled: boolean;
  onChange: (next: EditableHomeCard[]) => void;
}>) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveKey(String(event.active.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveKey(null);
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.key === active.id);
    const newIndex = cards.findIndex((c) => c.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(cards, oldIndex, newIndex));
  };

  const handleToggle = (key: string, isVisible: boolean) =>
    onChange(cards.map((c) => (c.key === key ? { ...c, isVisible } : c)));

  return (
    <HomeCardEditingProvider value={true}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={MEASURING}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveKey(null)}
      >
        <SortableContext items={cards.map((c) => c.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cards.map((card) => (
              <SortableHomeCard
                key={card.key}
                card={card}
                collapsed={activeKey !== null}
                disabled={disabled}
                onToggle={(isVisible) => handleToggle(card.key, isVisible)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </HomeCardEditingProvider>
  );
}
