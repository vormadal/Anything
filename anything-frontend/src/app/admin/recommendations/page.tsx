"use client";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  usePendingRecommendations,
  useApproveRecommendation,
  useDeleteRecommendation,
} from "@/hooks/useRecommendations";
import { isAdmin } from "@/lib/roles";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export default function AdminRecommendationsPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const { data: pendingRecommendations } = usePendingRecommendations();
  const approveRecommendation = useApproveRecommendation();
  const deleteRecommendation = useDeleteRecommendation();

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

  const handleApprove = async (id: number) => {
    try {
      await approveRecommendation.mutateAsync(id);
      toast.success("Approved!");
    } catch {
      toast.error("Failed to approve recommendation.");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await deleteRecommendation.mutateAsync(id);
      toast.success("Rejected.");
    } catch {
      toast.error("Failed to reject recommendation.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Approved items appear as autocomplete suggestions in shopping lists.
        </p>

        {!pendingRecommendations || pendingRecommendations.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            No pending recommendations.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingRecommendations.filter((rec) => rec.id !== null && rec.name !== null).map((rec) => (
              <li
                key={rec.id}
                className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {rec.name}
                </span>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(rec.id!)}
                    disabled={approveRecommendation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-3"
                    aria-label="Approve"
                  >
                    <Check className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Approve</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(rec.id!)}
                    disabled={deleteRecommendation.isPending}
                    className="px-3"
                    aria-label="Reject"
                  >
                    <X className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Reject</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
