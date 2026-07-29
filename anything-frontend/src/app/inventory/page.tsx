"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Plus, Search as SearchIcon, X } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useInventoryBoxes,
  useInventoryItems,
  useInventoryStorageUnits,
} from "@/hooks/useInventory";
import { PlaceFormDialog } from "@/components/inventory/PlaceFormDialog";
import { InventoryList, InventoryRow } from "@/components/inventory/InventoryRow";
import {
  boxesInPlace,
  describeItemLocation,
  formatPlaceName,
  itemPath,
  itemsInPlace,
  placePath,
  unplacedItems,
} from "@/lib/inventory";
import { fuzzyRank } from "@/lib/fuzzy";

const SECTION_HEADING_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export default function InventoryPage() {
  const { setHeaderActions } = useHeaderActions();
  const [createPlaceOpen, setCreatePlaceOpen] = useState(false);
  const [query, setQuery] = useState("");

  const places = useInventoryStorageUnits();
  const boxes = useInventoryBoxes();
  const items = useInventoryItems();

  const isLoading = places.isLoading || boxes.isLoading || items.isLoading;
  const error = places.error ?? boxes.error ?? items.error;

  useEffect(() => {
    setHeaderActions(
      <Button
        variant="ghost"
        size="icon"
        aria-label="Create place"
        onClick={() => setCreatePlaceOpen(true)}
      >
        <Plus className="h-5 w-5" />
      </Button>,
      false
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const allItems = useMemo(() => items.data ?? [], [items.data]);
  const allBoxes = useMemo(() => boxes.data ?? [], [boxes.data]);
  const allPlaces = useMemo(() => places.data ?? [], [places.data]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    // Match on the description too — "the one with the broken fuse" is often
    // what you remember, not the name you gave it.
    return fuzzyRank(allItems, query, (item) =>
      `${item.name ?? ""} ${item.description ?? ""}`.trim()
    );
  }, [allItems, query]);

  const loose = useMemo(() => unplacedItems(allItems), [allItems]);
  const isSearching = query.trim().length > 0;
  const isEmpty = allPlaces.length === 0 && allItems.length === 0;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>Storage</PageTitle>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all items…"
          aria-label="Search all items"
          className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Failed to load your storage. Please try again later.
        </div>
      )}

      {!isLoading && !error && isSearching && (
        <section className="space-y-2">
          <h2 className={SECTION_HEADING_CLASS}>
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </h2>
          {matches.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No items match &quot;{query.trim()}&quot;.
            </p>
          ) : (
            <InventoryList>
              {matches.map((item) => (
                <InventoryRow
                  key={item.id}
                  href={itemPath(item.id ?? 0)}
                  title={item.name ?? ""}
                  subtitle={describeItemLocation(item, allBoxes, allPlaces)}
                />
              ))}
            </InventoryList>
          )}
        </section>
      )}

      {!isLoading && !error && !isSearching && isEmpty && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Nothing stored yet. Tap + to add your first place — a basement room, the
          space under the bed, the summerhouse.
        </div>
      )}

      {!isLoading && !error && !isSearching && !isEmpty && (
        <>
          <section className="space-y-2">
            <h2 className={SECTION_HEADING_CLASS}>Places</h2>
            {allPlaces.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No places yet. Tap + to add one.
              </p>
            ) : (
              <InventoryList>
                {allPlaces.map((place) => {
                  const placeId = place.id ?? 0;
                  const boxCount = boxesInPlace(allBoxes, placeId).length;
                  const itemCount = itemsInPlace(allItems, placeId).length;
                  return (
                    <InventoryRow
                      key={place.id}
                      href={placePath(placeId)}
                      title={formatPlaceName(place)}
                      subtitle={`${boxCount} ${boxCount === 1 ? "box" : "boxes"} · ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                      count={itemCount}
                      icon={<Box className="h-4 w-4" />}
                    />
                  );
                })}
              </InventoryList>
            )}
          </section>

          {loose.length > 0 && (
            <section className="space-y-2">
              <h2 className={SECTION_HEADING_CLASS}>Not placed yet</h2>
              <InventoryList>
                {loose.map((item) => (
                  <InventoryRow
                    key={item.id}
                    href={itemPath(item.id ?? 0)}
                    title={item.name ?? ""}
                    subtitle={item.description}
                  />
                ))}
              </InventoryList>
            </section>
          )}
        </>
      )}

      {createPlaceOpen && (
        <PlaceFormDialog onClose={() => setCreatePlaceOpen(false)} />
      )}
    </div>
  );
}
