"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useHousehold,
  useUpdateHousehold,
  useAddHouseholdMember,
  useRemoveHouseholdMember,
} from "@/hooks/useHouseholds";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { Pencil, Trash2, UserPlus, Crown, User, Users } from "lucide-react";
import { toast } from "sonner";

export default function HouseholdDetailPage() {
  const params = useParams();
  const householdId = Number(params.id);
  const { data: household, isLoading } = useHousehold(householdId);
  const { selectedHouseholdId } = useHouseholdContext();
  const updateHousehold = useUpdateHousehold();
  const addMember = useAddHouseholdMember();
  const removeMember = useRemoveHouseholdMember();
  const { setHeaderActions } = useHeaderActions();

  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("Member");

  useEffect(() => {
    if (!household) return;
    setHeaderActions(
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setNewName(household.name);
          setShowRename(true);
        }}
        aria-label="Rename household"
      >
        <Pencil className="h-5 w-5" />
      </Button>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, household]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await updateHousehold.mutateAsync({ id: householdId, name: newName.trim() });
      toast.success("Household renamed");
      setShowRename(false);
    } catch {
      toast.error("Failed to rename household");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = Number(memberUserId);
    if (Number.isNaN(userId) || userId <= 0) {
      toast.error("Please enter a valid user ID");
      return;
    }
    try {
      await addMember.mutateAsync({
        householdId,
        userId,
        role: memberRole,
      });
      toast.success("Member added");
      setShowAddMember(false);
      setMemberUserId("");
      setMemberRole("Member");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add member";
      toast.error(message);
    }
  };

  const handleRemoveMember = async (userId: number, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this household?`)) return;
    try {
      await removeMember.mutateAsync({ householdId, userId });
      toast.success(`${memberName} removed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        Loading...
      </div>
    );
  }

  if (!household) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Household not found.</p>
      </div>
    );
  }

  const owners = household.members.filter((m) => m.role === "Owner");
  const members = household.members.filter((m) => m.role !== "Owner");

  return (
    <div className="container mx-auto px-4 py-4 max-w-xl space-y-4">
      <PageTitle>{household.name}</PageTitle>

      {/* Household info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {household.name}
          </h2>
          {householdId === selectedHouseholdId && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Created {new Date(household.createdOn).toLocaleDateString()}
        </p>
      </div>

      {/* Members section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Members ({household.members.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAddMember(true)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Add member
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {/* Owners first */}
          {owners.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              onRemove={handleRemoveMember}
              removePending={removeMember.isPending}
            />
          ))}
          {/* Then regular members */}
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              onRemove={handleRemoveMember}
              removePending={removeMember.isPending}
            />
          ))}
        </div>
      </div>

      {/* Add member dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                User ID
              </label>
              <input
                type="number"
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                placeholder="Enter user ID"
                min="1"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Role
              </label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Member">Member</option>
                <option value="Owner">Owner</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddMember(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addMember.isPending}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Household</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="mt-4 space-y-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Household name"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRename(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateHousehold.isPending}>
                {updateHousehold.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberRow({
  member,
  onRemove,
  removePending,
}: {
  member: { userId: number; name: string; email: string; role: string; joinedOn: string };
  onRemove: (userId: number, name: string) => void;
  removePending: boolean;
}) {
  const isOwner = member.role === "Owner";

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        {isOwner ? (
          <Crown className="h-4 w-4 text-amber-500" />
        ) : (
          <User className="h-4 w-4 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {member.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {member.email}
        </p>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize flex-shrink-0">
        {member.role}
      </span>
      <button
        type="button"
        onClick={() => onRemove(member.userId, member.name)}
        disabled={removePending}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
        aria-label={`Remove ${member.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
