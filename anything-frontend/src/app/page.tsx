"use client";

import { Button } from "@/components/ui/button";
import { useSomethings, useCreateSomething, useDeleteSomething } from "@/hooks/useSomethings";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/roles";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Home() {
  const [newSomethingName, setNewSomethingName] = useState("");
  const { data: somethings, isLoading, error } = useSomethings();
  const createSomething = useCreateSomething();
  const deleteSomething = useDeleteSomething();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();

  const handleCreateSomething = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSomethingName.trim()) return;

    try {
      await createSomething.mutateAsync({
        name: newSomethingName,
      });
      setNewSomethingName("");
      toast.success("Item created successfully");
    } catch {
      toast.error("Failed to create item. Please try again.");
    }
  };

  const handleDeleteSomething = async (id: number) => {
    try {
      await deleteSomething.mutateAsync(id);
      toast.success("Item deleted successfully");
    } catch {
      toast.error("Failed to delete item. Please try again.");
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
                Anything
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Create anything you want - lists, inventory, and more
              </p>
            </div>
            <div className="text-right">
              {user && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {user.name} ({user.role})
                  </p>
                  <div className="flex gap-2 justify-end">
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

          <form onSubmit={handleCreateSomething} className="mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSomethingName}
                onChange={(e) => setNewSomethingName(e.target.value)}
                placeholder="What do you want to create?"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Button type="submit" disabled={createSomething.isPending}>
                {createSomething.isPending ? "Adding..." : "Add"}
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
              Failed to load items. Make sure the API is running on port 5000.
            </div>
          )}

          {somethings && somethings.length === 0 && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No items yet. Create your first one above!
            </div>
          )}

          {somethings && somethings.length > 0 && (
            <div className="space-y-2">
              {somethings.map((something) => (
                <div
                  key={something.id}
                  className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="flex-1 text-gray-900 dark:text-white">
                    {something.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(something.createdOn).toLocaleDateString()}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSomething(something.id)}
                    disabled={deleteSomething.isPending}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

