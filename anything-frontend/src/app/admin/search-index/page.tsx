"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useCurrentUser } from "@/hooks/useAuth";
import { useRebuildSearchIndex } from "@/hooks/useSearch";
import { isAdmin } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function AdminSearchIndexPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const rebuildIndex = useRebuildSearchIndex();

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

  const handleRebuild = async () => {
    try {
      const result = await rebuildIndex.mutateAsync();
      const count = result.indexed ?? 0;
      toast.success(`Rebuilt search index for ${count} item${count === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Failed to rebuild the search index.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <PageTitle>Search Index</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Rebuilds the cross-entity search index (recipes, shopping lists, inventory items) from
          scratch, across every household. Safe to re-run — existing entries are refreshed and
          stale ones are removed. The index keeps itself in sync automatically, so this isn&apos;t
          needed day-to-day; use it after a deploy that changes what gets indexed, or if search
          results look out of date.
        </p>
        <Button
          onClick={handleRebuild}
          disabled={rebuildIndex.isPending || !isOnline}
          title={isOnline ? undefined : "Rebuilding the index requires an internet connection"}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${rebuildIndex.isPending ? "animate-spin" : ""}`} />
          {rebuildIndex.isPending ? "Rebuilding..." : "Rebuild Search Index"}
        </Button>
      </div>
    </div>
  );
}
