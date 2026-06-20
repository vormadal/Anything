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
  useCreateHouseholdInvite,
  useRemoveHouseholdMember,
  type HouseholdMember,
} from "@/hooks/useHouseholds";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { Copy, Link, Pencil, Trash2, UserPlus, Crown, User, Users } from "lucide-react";
import { toast } from "sonner";

export default function HouseholdDetailPage() {
  const params = useParams();
  const rawId = params.id;
  const householdId =
    typeof rawId === "string" && rawId !== "" ? Number(rawId) : NaN;
  const isValidId = Number.isFinite(householdId) && householdId > 0;

  const { data: household, isLoading } = useHousehold(isValidId ? householdId : null);
  const { selectedHouseholdId } = useHouseholdContext();
  const updateHousehold = useUpdateHousehold();
  const createInvite = useCreateHouseholdInvite();
  const removeMember = useRemoveHouseholdMember();
  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteData, setInviteData] = useState<{ email: string; url: string } | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<HouseholdMember | null>(null);

  useEffect(() => {
    setLeftAction({ type: "back", href: "/households" });
    if (household) {
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
    }
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [setHeaderActions, setLeftAction, household]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !isValidId) return;
    try {
      await updateHousehold.mutateAsync({ id: householdId, name: newName.trim() });
      toast.success("Household renamed");
      setShowRename(false);
    } catch {
      toast.error("Failed to rename household");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidId || !inviteEmail.trim()) return;
    try {
      const result = await createInvite.mutateAsync({ householdId, email: inviteEmail.trim() });
      const fullUrl = `${window.location.origin}${result.inviteUrl}`;
      setInviteData({ email: inviteEmail.trim(), url: fullUrl });
      setInviteEmail("");
      toast.success("Invite link created!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create invite";
      toast.error(message);
    }
  };

  const copyInviteLink = () => {
    if (!inviteData) return;
    navigator.clipboard.writeText(inviteData.url);
    toast.success("Copied to clipboard!");
  };

  const handleCloseInvite = () => {
    setShowInvite(false);
    setInviteEmail("");
    setInviteData(null);
  };

  const promptRemoveMember = (member: HouseholdMember) => {
    setMemberToRemove(member);
    setRemoveConfirmOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !isValidId) return;
    try {
      await removeMember.mutateAsync({ householdId, userId: memberToRemove.userId });
      toast.success(`${memberToRemove.name} removed`);
      setRemoveConfirmOpen(false);
      setMemberToRemove(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    }
  };

  if (!isValidId) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Invalid household ID.</p>
      </div>
    );
  }

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
            onClick={() => setShowInvite(true)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Invite member
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {/* Owners first */}
          {owners.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              onRemove={promptRemoveMember}
              removePending={removeMember.isPending}
            />
          ))}
          {/* Then regular members */}
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              onRemove={promptRemoveMember}
              removePending={removeMember.isPending}
            />
          ))}
        </div>
      </div>

      {/* Invite member dialog */}
      <Dialog open={showInvite} onOpenChange={handleCloseInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate a one-time registration link. When the user registers, they will automatically be added to this household.
          </p>
          <form onSubmit={handleInvite} className="mt-2 space-y-4">
            <div className="flex gap-2">
              <label htmlFor="invite-email" className="sr-only">Email address</label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              <Button type="submit" size="sm" disabled={createInvite.isPending}>
                {createInvite.isPending ? "Creating..." : "Create Link"}
              </Button>
            </div>
          </form>

          {inviteData && (
            <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <Link className="h-4 w-4 text-green-700 dark:text-green-300 shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Link created for <span className="font-semibold">{inviteData.email}</span>
                </p>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mb-3">
                Expires in 7 days. The user must register with this exact email address.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteData.url}
                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-xs text-gray-700 dark:text-gray-300"
                />
                <Button
                  onClick={copyInviteLink}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label="Copy invite link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={handleCloseInvite}>
              Close
            </Button>
          </div>
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

      {/* Remove member confirmation dialog */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Remove <span className="font-medium">{memberToRemove?.name}</span> from this household?
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRemoveConfirmOpen(false);
                setMemberToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveMember}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Removing..." : "Remove"}
            </Button>
          </div>
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
  member: HouseholdMember;
  onRemove: (member: HouseholdMember) => void;
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
        onClick={() => onRemove(member)}
        disabled={removePending}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
        aria-label={`Remove ${member.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
