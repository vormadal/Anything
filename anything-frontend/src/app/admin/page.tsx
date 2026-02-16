"use client";

import { Button } from "@/components/ui/button";
import { useCreateInvite, useCurrentUser } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const createInvite = useCreateInvite();
  const { data: user } = useCurrentUser();
  const router = useRouter();

  // Check if user is admin
  if (user && user.role !== "Admin") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => router.push("/")}>
            Go to Home
          </Button>
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
      const fullUrl = `${window.location.origin}${result.inviteUrl}`;
      setInviteUrl(fullUrl);
      toast.success("Invite created successfully!");
      setEmail("");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to create invite");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite URL copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            ← Back to Home
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Create invite links for new users
          </p>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="user@example.com"
                    required
                  />
                  <Button type="submit" disabled={createInvite.isPending}>
                    {createInvite.isPending ? "Creating..." : "Create Invite"}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {inviteUrl && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Invite Created!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Share this link with the invited user:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-sm"
                />
                <Button onClick={copyToClipboard} variant="outline" size="sm">
                  Copy
                </Button>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                This link will expire in 7 days.
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              How it works
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Enter the email address of the person you want to invite</li>
              <li>An invite link will be generated for that specific email</li>
              <li>Copy and send the link to the user manually</li>
              <li>The user can register using the link (valid for 7 days)</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
