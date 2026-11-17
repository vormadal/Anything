"use client";

import { useEffect } from "react";
import { HeaderMenu } from "@/components/HeaderMenu";
import { PageTitle } from "@/components/PageTitle";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Settings } from "lucide-react";
import { DEFAULT_HOME_CARD_ORDER, HOME_CARD_REGISTRY, type HomeCardKey } from "./HomeCards";
import { useHomeCardPreferences } from "@/hooks/useHomePreferences";
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

export default function Home() {
  const { setHeaderActions } = useHeaderActions();
  const { data: preferences, isLoading: preferencesLoading } = useHomeCardPreferences();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setHeaderActions(
      <HeaderMenu
        items={[
          {
            label: "Customize home page",
            icon: Settings,
            href: "/home-preferences",
            // The preferences page saves straight to the API.
            disabled: !isOnline,
          },
        ]}
      />
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, isOnline]);

  const cardKeys: HomeCardKey[] = preferences
    ? preferences
        .filter((p) => p.isVisible)
        .map((p) => p.cardKey as HomeCardKey)
        .filter((key) => key in HOME_CARD_REGISTRY)
    : DEFAULT_HOME_CARD_ORDER;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-6">
      <PageTitle>Anything</PageTitle>
      {preferencesLoading ? (
        <HomeCardsSkeleton />
      ) : (
        cardKeys.map((cardKey) => {
          const Card = HOME_CARD_REGISTRY[cardKey].component;
          return <Card key={cardKey} />;
        })
      )}
    </div>
  );
}
