"use client";

import { PageTitle } from "@/components/PageTitle";
import { DEFAULT_HOME_CARD_ORDER, HOME_CARD_REGISTRY } from "./HomeCards";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-6">
      <PageTitle>Anything</PageTitle>
      {DEFAULT_HOME_CARD_ORDER.map((cardKey) => {
        const Card = HOME_CARD_REGISTRY[cardKey].component;
        return <Card key={cardKey} />;
      })}
    </div>
  );
}
