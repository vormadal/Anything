"use client";

import { useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useCreateHousehold } from "@/hooks/useHouseholds";
import { Home, Plus, Check, Users } from "lucide-react";
import { toast } from "sonner";

export default function HouseholdsPage() {
  const { households, isLoading, selectedHouseholdId, setSelectedHouseholdId } =
    useHouseholdContext();
  const createHousehold = useCreateHousehold();
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await createHousehold.mutateAsync({ name: newName.trim() });
      setSelectedHouseholdId(created.id);
      setNewName("");
      setShowCreate(false);
      toast.success("Household created");
    } catch {
      toast.error("Failed to create household");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-xl space-y-4">
      <PageTitle>Households</PageTitle>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading households…
        </div>
      ) : households.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Home className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            No households yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create your first household to get started
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Household
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {households.map((h) => {
              const isActive = h.id === selectedHouseholdId;
              return (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {h.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {h.role}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      <Check className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedHouseholdId(h.id)}
                    >
                      Switch
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {showCreate ? (
            <form
              onSubmit={handleCreate}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                New Household
              </h3>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Household name"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createHousehold.isPending}
                >
                  {createHousehold.isPending ? "Creating…" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Household
            </Button>
          )}
        </>
      )}

      {/* Info footer */}
      {!isLoading && households.length > 0 && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
          <Users className="h-3 w-3" />
          Switch households to access different data scopes
        </p>
      )}
    </div>
  );
}
