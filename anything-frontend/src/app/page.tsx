"use client";

import { useEffect, useState } from "react";
import { Check, Settings } from "lucide-react";
import { HeaderMenu } from "@/components/HeaderMenu";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { EditableHomeCards, hiddenLast, type EditableHomeCard } from "@/components/home/EditableHomeCards";
import { useHeaderActions } from "@/context/PageActionsContext";
import { DEFAULT_HOME_CARD_ORDER, HOME_CARD_REGISTRY, type HomeCardKey } from "./HomeCards";
import {
  useHomeCardPreferences,
  useUpdateHomeCardPreferences,
  type HomeCardPreferenceResponse,
} from "@/hooks/useHomePreferences";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

function HomeCardsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  );
}

const isKnownCard = (key: string): key is HomeCardKey => key in HOME_CARD_REGISTRY;

function toEditableCards(preferences: HomeCardPreferenceResponse[] | undefined): EditableHomeCard[] {
  const entries = preferences
    ? preferences.flatMap((p) =>
        p.cardKey && isKnownCard(p.cardKey) ? [{ key: p.cardKey, isVisible: p.isVisible ?? true }] : []
      )
    : DEFAULT_HOME_CARD_ORDER.map((key) => ({ key, isVisible: true }));
  return entries.map(({ key, isVisible }) => ({ key, isVisible, ...HOME_CARD_REGISTRY[key] }));
}

export default function Home() {
  const { setHeaderActions } = useHeaderActions();
  const { data: preferences, isLoading: preferencesLoading } = useHomeCardPreferences();
  const updatePreferences = useUpdateHomeCardPreferences();
  const isOnline = useOnlineStatus();
  // Local copy while editing, so a drag lands instantly regardless of the save.
  const [draft, setDraft] = useState<EditableHomeCard[] | null>(null);
  const editing = draft !== null;

  useEffect(() => {
    setHeaderActions(
      editing ? (
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setDraft(null)}>
          <Check className="h-4 w-4 mr-1" />
          Done
        </Button>
      ) : (
        <HeaderMenu
          items={[
            {
              label: "Customize home page",
              icon: Settings,
              onSelect: () => setDraft(hiddenLast(toEditableCards(preferences))),
              // Every edit saves straight to the API.
              disabled: !isOnline || preferencesLoading,
            },
          ]}
        />
      )
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, isOnline, editing, preferences, preferencesLoading]);

  const handleChange = (next: EditableHomeCard[]) => {
    setDraft(next);
    updatePreferences.mutate(next.map((c) => ({ cardKey: c.key, isVisible: c.isVisible })));
  };

  const renderCards = () => {
    if (preferencesLoading) return <HomeCardsSkeleton />;
    if (draft) return <EditableHomeCards cards={draft} disabled={!isOnline} onChange={handleChange} />;
    return toEditableCards(preferences)
      .filter((card) => card.isVisible)
      .map(({ key, component: Card }) => <Card key={key} />);
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-6">
      <PageTitle>Anything</PageTitle>
      {editing && (
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3">
          Drag a card by its handle to move it, and use the switch to show or hide it.
        </p>
      )}
      {renderCards()}
    </div>
  );
}
