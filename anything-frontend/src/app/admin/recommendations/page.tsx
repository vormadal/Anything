"use client";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  usePendingRecommendations,
  useAllRecommendations,
  useApproveRecommendation,
  useDeleteRecommendation,
  useUpdateRecommendation,
} from "@/hooks/useRecommendations";
import { isAdmin } from "@/lib/roles";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, Pencil } from "lucide-react";
import { useState } from "react";

type Recommendation = {
  id?: number | null;
  name?: string | null;
  preferredUnit?: string | null;
  isApproved?: boolean | null;
};

type RecommendationRowProps = {
  rec: Recommendation;
  mode: "pending" | "all";
  editingId: number | null;
  editName: string;
  editPreferredUnit: string;
  onEditNameChange: (value: string) => void;
  onEditPreferredUnitChange: (value: string) => void;
  onStartEdit: (id: number, name: string, preferredUnit: string | null | undefined) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onApprove?: (id: number) => void;
  onDelete: (id: number) => void;
  isApprovePending?: boolean;
  isDeletePending: boolean;
  isUpdatePending: boolean;
};

function RecommendationRow({
  rec,
  mode,
  editingId,
  editName,
  editPreferredUnit,
  onEditNameChange,
  onEditPreferredUnitChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onApprove,
  onDelete,
  isApprovePending,
  isDeletePending,
  isUpdatePending,
}: RecommendationRowProps) {
  return (
    <li className="flex flex-col gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
      {editingId === rec.id ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <input
            type="text"
            value={editPreferredUnit}
            onChange={(e) => onEditPreferredUnitChange(e.target.value)}
            placeholder="Preferred unit (optional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
            <Button size="sm" onClick={() => onSaveEdit(rec.id!)} disabled={isUpdatePending}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-gray-900 dark:text-white truncate">{rec.name}</span>
            {rec.preferredUnit && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{rec.preferredUnit}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mode === "all" && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  rec.isApproved
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }`}
              >
                {rec.isApproved ? "Approved" : "Pending"}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEdit(rec.id!, rec.name!, rec.preferredUnit)}
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {mode === "pending" && (
              <Button
                size="sm"
                onClick={() => onApprove!(rec.id!)}
                disabled={isApprovePending}
                className="bg-green-600 hover:bg-green-700 text-white px-3"
                aria-label="Approve"
              >
                <Check className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(rec.id!)}
              disabled={isDeletePending}
              className="px-3"
              aria-label={mode === "pending" ? "Reject" : "Remove"}
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{mode === "pending" ? "Reject" : "Remove"}</span>
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

type Tab = "pending" | "all";

export default function AdminRecommendationsPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const { data: pendingRecommendations } = usePendingRecommendations();
  const { data: allRecommendations } = useAllRecommendations();
  const approveRecommendation = useApproveRecommendation();
  const deleteRecommendation = useDeleteRecommendation();
  const updateRecommendation = useUpdateRecommendation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPreferredUnit, setEditPreferredUnit] = useState("");

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

  const handleRemove = async (id: number) => {
    try {
      await deleteRecommendation.mutateAsync(id);
      toast.success("Removed.");
    } catch {
      toast.error("Failed to remove recommendation.");
    }
  };

  const handleStartEdit = (id: number, name: string, preferredUnit: string | null | undefined) => {
    setEditingId(id);
    setEditName(name);
    setEditPreferredUnit(preferredUnit ?? "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await updateRecommendation.mutateAsync({
        id,
        name: editName.trim(),
        preferredUnit: editPreferredUnit.trim() || null,
      });
      setEditingId(null);
      toast.success("Recommendation updated.");
    } catch {
      toast.error("Failed to update recommendation.");
    }
  };

  const validPending = (pendingRecommendations ?? []).filter(
    (rec) => rec.id !== null && rec.name !== null
  );
  const validAll = (allRecommendations ?? []).filter(
    (rec) => rec.id !== null && rec.name !== null
  );

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Approved items appear as autocomplete suggestions in shopping lists.
        </p>

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "pending"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Pending
            {validPending.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {validPending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            All
          </button>
        </div>

        {activeTab === "pending" && (
          <>
            {validPending.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                No pending recommendations.
              </p>
            ) : (
              <ul className="space-y-2">
                {validPending.map((rec) => (
                  <RecommendationRow
                    key={rec.id}
                    rec={rec}
                    mode="pending"
                    editingId={editingId}
                    editName={editName}
                    editPreferredUnit={editPreferredUnit}
                    onEditNameChange={setEditName}
                    onEditPreferredUnitChange={setEditPreferredUnit}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit}
                    onApprove={handleApprove}
                    onDelete={handleReject}
                    isApprovePending={approveRecommendation.isPending}
                    isDeletePending={deleteRecommendation.isPending}
                    isUpdatePending={updateRecommendation.isPending}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        {activeTab === "all" && (
          <>
            {validAll.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                No recommendations yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {validAll.map((rec) => (
                  <RecommendationRow
                    key={rec.id}
                    rec={rec}
                    mode="all"
                    editingId={editingId}
                    editName={editName}
                    editPreferredUnit={editPreferredUnit}
                    onEditNameChange={setEditName}
                    onEditPreferredUnitChange={setEditPreferredUnit}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit}
                    onDelete={handleRemove}
                    isDeletePending={deleteRecommendation.isPending}
                    isUpdatePending={updateRecommendation.isPending}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
