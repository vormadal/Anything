"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { Switch } from "@/components/ui/switch";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useHomeCardPreferences, useUpdateHomeCardPreferences } from "@/hooks/useHomePreferences";
import { DEFAULT_HOME_CARD_ORDER, HOME_CARD_REGISTRY, type HomeCardKey } from "../HomeCards";

interface CardPreference {
  cardKey: HomeCardKey;
  isVisible: boolean;
}

function DraggableCardRow({
  preference,
  onToggle,
}: {
  preference: CardPreference;
  onToggle: (isVisible: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: preference.cardKey,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = HOME_CARD_REGISTRY[preference.cardKey]?.title ?? preference.cardKey;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3"
    >
      <button
        type="button"
        className="flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{title}</span>
      <Switch
        checked={preference.isVisible}
        onCheckedChange={onToggle}
        aria-label={`Show ${title} on home page`}
      />
    </div>
  );
}

export default function HomePreferencesPage() {
  const { data, isLoading } = useHomeCardPreferences();
  const updatePreferences = useUpdateHomeCardPreferences();
  const { setLeftAction } = useHeaderActions();
  const [cards, setCards] = useState<CardPreference[] | null>(null);

  useEffect(() => {
    setLeftAction({ type: "back", href: "/" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  // Seed local (draggable) state from the fetched preferences the first time they arrive,
  // without clobbering in-flight local edits on subsequent refetches. Keyed on `data` itself
  // (not just a reference change) so this still fires when `data` is served from a warm
  // react-query cache (e.g. navigating here from the home page, which already fetched it).
  useEffect(() => {
    if (cards === null && data) {
      setCards(data.map((p) => ({ cardKey: p.cardKey as HomeCardKey, isVisible: p.isVisible ?? true })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed once; `cards` is deliberately omitted to avoid re-running on every local edit
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persist = (next: CardPreference[]) => {
    updatePreferences.mutate(next.map((c) => ({ cardKey: c.cardKey, isVisible: c.isVisible })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !cards) return;

    const oldIndex = cards.findIndex((c) => c.cardKey === active.id);
    const newIndex = cards.findIndex((c) => c.cardKey === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(cards, oldIndex, newIndex);
    setCards(reordered);
    persist(reordered);
  };

  const handleToggle = (cardKey: HomeCardKey, isVisible: boolean) => {
    if (!cards) return;
    const next = cards.map((c) => (c.cardKey === cardKey ? { ...c, isVisible } : c));
    setCards(next);
    persist(next);
  };

  const displayCards: CardPreference[] =
    cards ?? DEFAULT_HOME_CARD_ORDER.map((cardKey) => ({ cardKey, isVisible: true }));

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg space-y-4">
      <PageTitle>Customize Home Page</PageTitle>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Drag to reorder, and use the toggles to show or hide cards on your home page.
      </p>

      {isLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={displayCards.map((c) => c.cardKey)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displayCards.map((preference) => (
                <DraggableCardRow
                  key={preference.cardKey}
                  preference={preference}
                  onToggle={(isVisible) => handleToggle(preference.cardKey, isVisible)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
