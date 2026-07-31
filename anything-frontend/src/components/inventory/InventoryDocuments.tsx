"use client";

import { useRef, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { InventoryAttachmentKinds } from "@/lib/inventory";
import type { InventoryAttachmentResponse } from "@/hooks/useInventory";
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  OFFLINE_HINT,
} from "@/components/inventory/inventoryFormStyles";

const DOCUMENT_KIND_OPTIONS = [
  InventoryAttachmentKinds.Manual,
  InventoryAttachmentKinds.Receipt,
  InventoryAttachmentKinds.Warranty,
  InventoryAttachmentKinds.Other,
];

interface InventoryDocumentsProps {
  attachments: InventoryAttachmentResponse[] | undefined;
  isLoading: boolean;
  onUpload: (data: { file: File; kind: string }) => Promise<unknown>;
  isUploading: boolean;
  onDownload: (data: { attachmentId: number; name: string }) => void;
  onDelete: (attachmentId: number) => Promise<unknown>;
  isDeleting: boolean;
}

/**
 * Manuals, receipts and warranty docs for items, boxes and places — each owner gets its
 * own attachment hooks (list/upload/download/delete), but the UI is identical, so pages
 * pass the hook results in rather than this component knowing which owner it's attached
 * to. Photos are not shown here; they live in `InventoryPhotoGallery` at the top of the page.
 */
export function InventoryDocuments({
  attachments,
  isLoading,
  onUpload,
  isUploading,
  onDownload,
  onDelete,
  isDeleting,
}: InventoryDocumentsProps) {
  const isOnline = useOnlineStatus();
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null);
  const [documentKind, setDocumentKind] = useState<string>(InventoryAttachmentKinds.Manual);

  const documents = (attachments ?? []).filter((a) => a.kind !== InventoryAttachmentKinds.Photo);

  function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingDocumentFile(file);
  }

  function closeDocumentDialog() {
    setPendingDocumentFile(null);
    if (documentInputRef.current) documentInputRef.current.value = "";
  }

  async function handleConfirmDocumentUpload() {
    if (!pendingDocumentFile) return;
    try {
      await onUpload({ file: pendingDocumentFile, kind: documentKind });
      closeDocumentDialog();
    } catch {
      toast.error("Failed to upload document");
    }
  }

  async function handleDelete(id: number) {
    try {
      await onDelete(id);
    } catch {
      toast.error("Failed to delete attachment");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Documents</h2>
        <input
          ref={documentInputRef}
          type="file"
          className="hidden"
          onChange={handleDocumentChange}
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => documentInputRef.current?.click()}
          disabled={isUploading || !isOnline}
          title={isOnline ? undefined : OFFLINE_HINT}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add document
        </Button>
      </div>
      {!isLoading && documents.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No documents yet.</p>
      )}
      {documents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {documents.map((doc) => (
            <div key={doc.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onDownload({ attachmentId: doc.id ?? 0, name: doc.name ?? "file" })}
                  disabled={!isOnline}
                  title={isOnline ? undefined : OFFLINE_HINT}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate text-left w-full block disabled:opacity-50"
                >
                  {doc.name}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{doc.kind}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc.id ?? 0)}
                disabled={isDeleting || !isOnline}
                title={isOnline ? undefined : OFFLINE_HINT}
                aria-label="Remove document"
                className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pendingDocumentFile !== null} onOpenChange={(open) => { if (!open) closeDocumentDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {pendingDocumentFile?.name}
            </p>
            <div>
              <label htmlFor="document-kind" className={FIELD_LABEL_CLASS}>
                Type
              </label>
              <select
                id="document-kind"
                value={documentKind}
                onChange={(e) => setDocumentKind(e.target.value)}
                className={FIELD_INPUT_CLASS}
              >
                {DOCUMENT_KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeDocumentDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => void handleConfirmDocumentUpload()}
                disabled={isUploading || !isOnline}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
