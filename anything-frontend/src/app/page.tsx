"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();
  const { data: preferences, isLoading: preferencesLoading } = useHomeCardPreferences();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setHeaderActions(
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/home-preferences")}
        aria-label="Customize home page"
        title={isOnline ? "Customize home page" : "Customizing the home page requires an internet connection"}
        disabled={!isOnline}
        className="ml-auto"
      >
        <Settings className="h-5 w-5" />
      </Button>
    );
    return () => setHeaderActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router identity is stable in the real app; omitted to avoid re-running on every render
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
