"use client";

import { Button } from "@/components/ui/button";
import { useShoppingLists, useCreateShoppingList, useDeleteShoppingList } from "@/hooks/useShoppingLists";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/roles";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ShoppingListsPage() {
  const [newListName, setNewListName] = useState("");
  const { data: lists, isLoading, error } = useShoppingLists();
  const createList = useCreateShoppingList();
  const deleteList = useDeleteShoppingList();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const newList = await createList.mutateAsync({ name: newListName });
      setNewListName("");
      toast.success("Shopping list created");
      if (newList?.id) {
        router.push(`/shopping-lists/${newList.id}`);
      }
    } catch {
      toast.error("Failed to create shopping list. Please try again.");
    }
  };

  const handleDeleteList = async (id: number) => {
    try {
      await deleteList.mutateAsync(id);
      toast.success("Shopping list deleted");
    } catch {
      toast.error("Failed to delete shopping list. Please try again.");
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Shopping Lists
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your shopping lists
              </p>
            </div>
            <div className="text-right">
              {user && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {user.name} ({user.role})
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/")}
                    >
                      Home
                    </Button>
                    {isAdmin(user.role) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/admin")}
                      >
                        Admin Panel
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      disabled={logout.isPending}
                    >
                      {logout.isPending ? "Logging out..." : "Logout"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleCreateList} className="mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New shopping list name..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Button type="submit" disabled={createList.isPending}>
                {createList.isPending ? "Creating..." : "Create List"}
              </Button>
            </div>
          </form>

          {isLoading && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading...
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
              Failed to load shopping lists. Make sure the API is running on port 5238.
            </div>
          )}

          {lists && lists.length === 0 && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No shopping lists yet. Create your first one above!
            </div>
          )}

          {lists && lists.length > 0 && (
            <div className="space-y-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => router.push(`/shopping-lists/${list.id}`)}
                >
                  <span className="flex-1 text-gray-900 dark:text-white font-medium">
                    {list.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {list.createdOn ? new Date(list.createdOn).toLocaleDateString() : ""}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/shopping-lists/${list.id}`);
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id!);
                    }}
                    disabled={deleteList.isPending}
                  >
                    Delete
                  </Button>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
