"use client";

import { Button } from "@/components/ui/button";
import { useCreateInvite, useCurrentUser, useDeleteInvite, useInvites } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/roles";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Copy, Link, Trash2 } from "lucide-react";
import type { InviteResponse } from "@/lib/api-client/models/index";

export default function AdminInvitePage() {
  const [email, setEmail] = useState("");
  const [inviteData, setInviteData] = useState<{ email: string; url: string } | null>(null);
  const createInvite = useCreateInvite();
  const deleteInvite = useDeleteInvite();
  const { data: invites, isLoading: invitesLoading } = useInvites();
  const { data: user } = useCurrentUser();
  const router = useRouter();

  if (user && !isAdmin(user.role)) {
    return (
      <div className="flex items-center justify-center p-4 mt-20">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <Button onClick={() => router.push("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const result = await createInvite.mutateAsync({ email });
      if (!result?.inviteUrl) {
        toast.error("Failed to get invite URL from server");
        return;
      }
      const fullUrl = `${window.location.origin}${result.inviteUrl}`;
      setInviteData({ email, url: fullUrl });
      toast.success("Invite created!");
      setEmail("");
    } catch {
      toast.error("Failed to create invite");
    }
  };

  const copyToClipboard = () => {
    if (!inviteData) return;
    navigator.clipboard.writeText(inviteData.url);
    toast.success("Copied to clipboard!");
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteInvite.mutateAsync(id);
      toast.success("Invite deleted");
    } catch {
      toast.error("Failed to delete invite");
    }
  };

  const getInviteStatus = (invite: InviteResponse) => {
    if (invite.isUsed) return { label: "Accepted", className: "text-green-600 dark:text-green-400" };
    if (invite.isExpired) return { label: "Expired", className: "text-red-600 dark:text-red-400" };
    return { label: "Pending", className: "text-yellow-600 dark:text-yellow-400" };
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Generate a one-time registration link for a specific email address.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="email" className="sr-only">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder="user@example.com"
              required
            />
            <Button type="submit" disabled={createInvite.isPending} className="w-full sm:w-auto">
              {createInvite.isPending ? "Creating..." : "Create Link"}
            </Button>
          </div>
        </form>

        {inviteData && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
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
              <Button onClick={copyToClipboard} variant="outline" size="sm" className="shrink-0" aria-label="Copy invite link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invites</h2>
        {invitesLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading invites...</p>
        ) : !invites || invites.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No invites found.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {invites.map((invite) => {
              if (invite.id == null) return null;
              const status = getInviteStatus(invite);
              return (
                <li key={invite.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{invite.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium ${status.className}`}>{status.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete invite for ${invite.email}`}
                      onClick={() => handleDelete(invite.id)}
                      disabled={deleteInvite.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
