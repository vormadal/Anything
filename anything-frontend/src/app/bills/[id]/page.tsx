"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import {
  useBill,
  useBillPriceHistory,
  useBillAttachments,
  useDeleteBill,
  useAddBillPrice,
  useDeleteBillPrice,
  useUploadBillAttachment,
  useUpdateBillAttachment,
  useDeleteBillAttachment,
  useDownloadBillAttachment,
  FREQUENCY_LABELS,
} from "@/hooks/useBills";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isSafeUrl } from "@/lib/utils";
import {
  ExternalLink,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Zap,
  Hand,
  Paperclip,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PriceChangeBadge({
  current,
  previous,
}: {
  current: number;
  previous?: number;
}) {
  // Treat only null/undefined as "missing"; 0 is a valid previous value.
  if (previous == null) return null;

  const diff = current - previous;

  // Avoid division by zero when previous is 0.
  if (previous === 0) {
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
          <Minus className="h-3 w-3" />0%
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
          <TrendingUp className="h-3 w-3" />+{formatCurrency(Math.abs(diff))}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-500">
        <TrendingDown className="h-3 w-3" />-{formatCurrency(Math.abs(diff))}
      </span>
    );
  }

  const pct = Math.abs((diff / previous) * 100).toFixed(1);
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-500">
        <TrendingDown className="h-3 w-3" />-{pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

export default function BillDetailPage() {
  const params = useParams();
  const billId = Number(params.id);
  const router = useRouter();
  const { data: bill, isLoading } = useBill(billId);
  const { data: history, isLoading: historyLoading } = useBillPriceHistory(billId);
  const { data: attachments, isLoading: attachmentsLoading } = useBillAttachments(billId);
  const deleteBill = useDeleteBill();
  const addPrice = useAddBillPrice();
  const deletePrice = useDeleteBillPrice();
  const uploadAttachment = useUploadBillAttachment();
  const updateAttachment = useUpdateBillAttachment();
  const deleteAttachment = useDeleteBillAttachment();
  const downloadAttachment = useDownloadBillAttachment();
  const { setHeaderActions } = useHeaderActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddPrice, setShowAddPrice] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");
  const [attachmentDialog, setAttachmentDialog] = useState<{ id: number; name: string } | null>(null);
  const [attachmentDialogName, setAttachmentDialogName] = useState("");

  useEffect(() => {
    setHeaderActions(
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(`/bills/${billId}/edit`)}
        aria-label="Edit bill"
      >
        <Pencil className="h-5 w-5" />
      </Button>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, router, billId]);

  const handleDelete = async () => {
    if (!confirm("Delete this bill?")) return;
    try {
      await deleteBill.mutateAsync(billId);
      toast.success("Bill deleted");
      router.push("/bills");
    } catch {
      toast.error("Failed to delete bill");
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount) return;
    try {
      await addPrice.mutateAsync({
        billId,
        amount: Number(newAmount),
        effectiveDate: new Date(newDate).toISOString(),
        notes: newNotes.trim() || undefined,
      });
      toast.success("Price entry added");
      setShowAddPrice(false);
      setNewAmount("");
      setNewNotes("");
      setNewDate(new Date().toISOString().split("T")[0]);
    } catch {
      toast.error("Failed to add price entry");
    }
  };

  const handleDeletePrice = async (historyId: number) => {
    if (!confirm("Remove this price entry?")) return;
    try {
      await deletePrice.mutateAsync({ billId, historyId });
      toast.success("Price entry removed");
    } catch {
      toast.error("Failed to remove price entry");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync({ billId, file });
      toast.success("Attachment uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload attachment");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenAttachmentDialog = (id: number, name: string) => {
    setAttachmentDialog({ id, name });
    setAttachmentDialogName(name);
  };

  const handleSaveAttachmentName = async () => {
    if (!attachmentDialog || !attachmentDialogName.trim()) return;
    try {
      await updateAttachment.mutateAsync({ billId, attachmentId: attachmentDialog.id, name: attachmentDialogName.trim() });
      toast.success("Attachment renamed");
      setAttachmentDialog(null);
    } catch {
      toast.error("Failed to rename attachment");
    }
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentDialog) return;
    try {
      await deleteAttachment.mutateAsync({ billId, attachmentId: attachmentDialog.id });
      toast.success("Attachment deleted");
      setAttachmentDialog(null);
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        Loading...
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Bill not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>{bill.name ?? "Bill"}</PageTitle>
      {/* Bill info card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {/* Amount + frequency */}
        <div className="flex items-start justify-between">
          <div>
            {bill.currentAmount !== undefined && bill.currentAmount !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(bill.currentAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {FREQUENCY_LABELS[bill.frequency]}
                  {bill.monthlyEquivalent !== undefined &&
                    bill.monthlyEquivalent !== null &&
                    bill.frequency !== "Monthly" && (
                      <span className="ml-1">
                        · {formatCurrency(bill.monthlyEquivalent)}/mo
                      </span>
                    )}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No price recorded · {FREQUENCY_LABELS[bill.frequency]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {bill.isAutomated ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                <Zap className="h-3 w-3" />
                Auto
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
                <Hand className="h-3 w-3" />
                Manual
              </span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
          {bill.vendorName && (
            <>
              <span className="text-gray-500 dark:text-gray-400">Vendor</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {bill.vendorWebsite && isSafeUrl(bill.vendorWebsite) ? (
                  <a
                    href={bill.vendorWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {bill.vendorName}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  bill.vendorName
                )}
              </span>
            </>
          )}
          {bill.locationName && (
            <>
              <span className="text-gray-500 dark:text-gray-400">Location</span>
              <span className="text-gray-900 dark:text-white">{bill.locationName}</span>
            </>
          )}
          {bill.category && (
            <>
              <span className="text-gray-500 dark:text-gray-400">Category</span>
              <span className="text-gray-900 dark:text-white">{bill.category}</span>
            </>
          )}
          {bill.managementUrl && isSafeUrl(bill.managementUrl) && (
            <>
              <span className="text-gray-500 dark:text-gray-400">Manage</span>
              <a
                href={bill.managementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Open website
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          {bill.notes && (
            <>
              <span className="text-gray-500 dark:text-gray-400">Notes</span>
              <span className="text-gray-900 dark:text-white">{bill.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Price history */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Price history
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAddPrice(!showAddPrice)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add entry
          </Button>
        </div>

        {/* Add price form */}
        {showAddPrice && (
          <form
            onSubmit={handleAddPrice}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3 space-y-2"
          >
            <div className="flex gap-2">
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Amount"
                min="0.01"
                step="0.01"
                required
                className="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowAddPrice(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={addPrice.isPending}
              >
                {addPrice.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}

        {historyLoading && (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            Loading...
          </div>
        )}
        {!historyLoading && (history ?? []).length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No price entries yet.
            </p>
          </div>
        )}
        {!historyLoading && (history ?? []).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {(history ?? []).map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(entry.amount)}
                    </span>
                    <PriceChangeBadge
                      current={entry.amount}
                      previous={entry.previousAmount}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDate(entry.effectiveDate)}
                    {entry.notes && (
                      <span className="ml-2 text-gray-400 dark:text-gray-500">
                        · {entry.notes}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePrice(entry.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete price entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Paperclip className="h-4 w-4" />
            Attachments
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachment.isPending}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {uploadAttachment.isPending ? "Uploading..." : "Add file"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {attachmentsLoading && (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
        )}
        {!attachmentsLoading && (attachments ?? []).length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No attachments yet.</p>
          </div>
        )}
        {!attachmentsLoading && (attachments ?? []).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {(attachments ?? []).map((att) => {
              const contentType = att.contentType ?? "";
              const isImage = contentType.startsWith("image/");
              return (
                <div key={att.id!} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                    {isImage && att.thumbnailUrl ? (
                      <Image
                        src={att.thumbnailUrl}
                        alt={att.name ?? ""}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isImage ? (
                      att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {att.name}
                        </a>
                      ) : (
                        <span className="text-sm font-medium truncate block">{att.name}</span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => downloadAttachment.mutate({ billId: bill.id!, attachmentId: att.id!, name: att.name! })}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate text-left w-full block"
                      >
                        {att.name}
                      </button>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{contentType}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAttachmentDialog(att.id!, att.name!)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                    aria-label="Attachment options"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!attachmentDialog} onOpenChange={(open) => { if (!open) setAttachmentDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attachment</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={attachmentDialogName}
                    onChange={(e) => setAttachmentDialogName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSaveAttachmentName(); }}
                    className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => void handleSaveAttachmentName()} disabled={updateAttachment.isPending}>
                    Save
                  </Button>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => void handleDeleteAttachment()}
                  disabled={deleteAttachment.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete attachment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete bill */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={handleDelete}
          disabled={deleteBill.isPending}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete bill
        </Button>
      </div>
    </div>
  );
}
