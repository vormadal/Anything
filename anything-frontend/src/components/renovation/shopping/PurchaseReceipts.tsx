"use client";

import { useRef, useState } from "react";
import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadErrorState } from "@/components/LoadErrorState";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  useDeleteRenovationPurchaseAttachment,
  useDownloadRenovationPurchaseAttachment,
  useRenovationPurchaseAttachments,
  useUploadRenovationPurchaseAttachment,
} from "@/hooks/useRenovation";
import type { RenovationPurchaseAttachmentResponse } from "@/lib/api-client/models/index";
import { loadFailure } from "@/lib/queryState";
import { ATTACHMENT_ACCEPT } from "@/lib/uploadAccept";

const MUTED_CLASS = "text-gray-500 dark:text-gray-400";

interface PurchaseReceiptsProps {
  projectId: number;
  purchaseId: number;
}

/**
 * The receipts section inside an expanded purchase. Mounted only while the
 * purchase is open, so its attachment list is fetched on demand.
 */
export function PurchaseReceipts({ projectId, purchaseId }: PurchaseReceiptsProps) {
  const isOnline = useOnlineStatus();
  const attachmentsQuery = useRenovationPurchaseAttachments(projectId, purchaseId);
  const upload = useUploadRenovationPurchaseAttachment(projectId);
  const download = useDownloadRenovationPurchaseAttachment(projectId);
  const remove = useDeleteRenovationPurchaseAttachment(projectId);
  const load = loadFailure(attachmentsQuery);
  const attachments = attachmentsQuery.data ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<RenovationPurchaseAttachmentResponse | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync({ purchaseId, file });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach receipt");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = (attachment: RenovationPurchaseAttachmentResponse) => {
    download.mutate(
      { purchaseId, attachmentId: attachment.id ?? 0, name: attachment.name ?? "receipt" },
      { onError: () => toast.error("Failed to download receipt") },
    );
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync({ purchaseId, attachmentId: pendingDelete.id ?? 0 });
      setPendingDelete(null);
    } catch {
      toast.error("Failed to delete receipt");
    }
  };

  return (
    <section aria-label="Receipts" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Receipts
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending || !isOnline}
          title={isOnline ? undefined : "Attaching a receipt requires an internet connection"}
          className="h-11"
        >
          {upload.isPending ? "Attaching..." : "Attach receipt"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          aria-label="Receipt file"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {attachmentsQuery.isLoading && <p className={`text-xs ${MUTED_CLASS}`}>Loading...</p>}
      {!attachmentsQuery.isLoading && load.failed && (
        <LoadErrorState what="receipts" onRetry={load.retry} isRetrying={load.isRetrying} />
      )}
      {!attachmentsQuery.isLoading && !load.failed && attachments.length === 0 && (
        <p className={`text-xs ${MUTED_CLASS}`}>No receipts attached yet.</p>
      )}
      {!load.failed && attachments.length > 0 && (
        <ul className="flex flex-col">
          {attachments.map((attachment, index) => (
            <li
              key={attachment.id ?? index}
              className="flex items-center gap-3 border-t border-gray-100 py-2 first:border-t-0 dark:border-gray-700"
            >
              <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {attachment.name}
                </span>
                <span className={`truncate text-xs ${MUTED_CLASS}`}>{attachment.contentType}</span>
              </span>
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                disabled={!isOnline || download.isPending}
                title={isOnline ? undefined : "Downloading requires an internet connection"}
                aria-label={`Download ${attachment.name ?? "receipt"}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(attachment)}
                disabled={!isOnline}
                title={isOnline ? undefined : "Deleting a receipt requires an internet connection"}
                aria-label={`Delete ${attachment.name ?? "receipt"}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        title="Delete receipt?"
        message={`“${pendingDelete?.name ?? "This receipt"}” will be removed from this purchase.`}
        isPending={remove.isPending}
        onConfirm={() => void handleConfirmDelete()}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </section>
  );
}
