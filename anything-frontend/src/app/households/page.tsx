"use client";

import { useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useCreateHousehold } from "@/hooks/useHouseholds";
import { useMyPendingInvites, useAcceptHouseholdInvite, type PendingInvite } from "@/hooks/useAuth";
import { Home, Plus, Check, Users, ChevronRight, Bell } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function HouseholdsPage() {
  const { households, isLoading, selectedHouseholdId, setSelectedHouseholdId } =
    useHouseholdContext();
  const createHousehold = useCreateHousehold();
  const { data: pendingInvites } = useMyPendingInvites();
  const acceptInvite = useAcceptHouseholdInvite();
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dismissedInvites, setDismissedInvites] = useState<number[]>([]);

  const visibleInvites = (pendingInvites ?? []).filter(
    (inv) => inv.householdId !== null && !dismissedInvites.includes(inv.id)
  );

  const handleAcceptInvite = async (invite: PendingInvite) => {
    try {
      await acceptInvite.mutateAsync(invite.token);
      toast.success(`Joined "${invite.householdName ?? "household"}" successfully!`);
      setDismissedInvites((prev) => [...prev, invite.id]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to accept invite";
      toast.error(message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await createHousehold.mutateAsync({ name: newName.trim() });
      setSelectedHouseholdId(created.id);
      setNewName("");
      setShowCreate(false);
      toast.success("Household created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create household";
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-xl space-y-4">
      <PageTitle>Households</PageTitle>

      {visibleInvites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-blue-500" />
            Pending Invitations
          </h2>
          {visibleInvites.map((invite) => (
            <div
              key={invite.id}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                You&apos;ve been invited to join{" "}
                <span className="font-semibold">&ldquo;{invite.householdName}&rdquo;</span>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Expires {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleAcceptInvite(invite)}
                  disabled={acceptInvite.isPending}
                >
                  {acceptInvite.isPending ? "Joining..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissedInvites((prev) => [...prev, invite.id])}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                  className={`flex items-center gap-2 rounded-lg border transition-colors ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  }`}
                >
                  <Link
                    href={`/households/${h.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {h.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {h.role}
                      </p>
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        <Check className="h-3.5 w-3.5" />
                        Active
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </Link>
                  {!isActive && (
                    <div className="pr-3 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedHouseholdId(h.id)}
                      >
                        Switch
                      </Button>
                    </div>
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
