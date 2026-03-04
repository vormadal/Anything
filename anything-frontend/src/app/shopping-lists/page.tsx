"use client";

import { Button } from "@/components/ui/button";
import { useShoppingLists, useCreateShoppingList } from "@/hooks/useShoppingLists";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Plus } from "lucide-react";

export default function ShoppingListsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: lists, isLoading, error } = useShoppingLists();
  const createList = useCreateShoppingList();
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      const newList = await createList.mutateAsync({ name: newListName });
      setNewListName("");
      setIsCreating(false);
      toast.success("Shopping list created");
      if (newList?.id) {
        router.push(`/shopping-lists/${newList.id}`);
      }
    } catch {
      toast.error("Failed to create shopping list. Please try again.");
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewListName("");
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCreating(true)}
          aria-label="Create shopping list"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {isCreating && (
        <form onSubmit={handleCreateList} className="mb-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelCreate();
              }}
            />
            <Button type="submit" size="sm" disabled={createList.isPending}>
              {createList.isPending ? "Creating..." : "Create"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCancelCreate}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load shopping lists. Make sure the API is running on port 5238.
        </div>
      )}

      {lists && lists.length === 0 && !isCreating && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No shopping lists yet.
        </div>
      )}

      {lists && lists.length > 0 && (
        <div className="space-y-1">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center gap-2">
              <button
                type="button"
                className="flex-1 flex items-center px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => router.push(`/shopping-lists/${list.id}`)}
              >
                <span className="text-gray-900 dark:text-white font-medium text-sm">
                  {list.name}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
