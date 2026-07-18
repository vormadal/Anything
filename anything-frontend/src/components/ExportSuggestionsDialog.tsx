"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExportSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onExportAll: () => void;
  onExportUncategorized: () => void;
  // Existing category names, offered to the AI as the preferred vocabulary so
  // it reuses them instead of inventing new ones.
  categoryNames?: string[];
}

const AI_PROMPT_BASE = `I'm attaching a JSON file exported from a shopping-list app. Please assign a category to each item and return the full file so I can re-upload it.

Follow these rules exactly:
- Keep the top-level shape: { "recommendations": [ { "name": "...", "preferredUnit": "...", "category": "...", "delete": false } ] }.
- Do not rename, add, or remove any "name" values - each one must match exactly (case-insensitive) with what I gave you.
- Set "category" to a short category name for the item (e.g. Produce, Dairy, Bakery, Meat, Frozen, Pantry, Household). Leave "category" as an empty string only if you truly can't tell.
- Keep "preferredUnit" and "delete" as they were; don't set "delete" to true.
- Return the complete JSON file, ready to re-upload, not a diff or partial list.`;

function buildAiPrompt(categoryNames?: string[]): string {
  const names = (categoryNames ?? []).map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return AI_PROMPT_BASE;
  return `${AI_PROMPT_BASE}\n\nPrefer these existing categories where they fit, and only invent a new one if none apply:\n${names.join(", ")}`;
}

export function ExportSuggestionsDialog({
  open,
  onOpenChange,
  isPending,
  onExportAll,
  onExportUncategorized,
  categoryNames,
}: ExportSuggestionsDialogProps) {
  const [copied, setCopied] = useState(false);
  const aiPrompt = buildAiPrompt(categoryNames);

  const handleCopyAiPrompt = async () => {
    await navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    toast.success("AI instructions copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="export-suggestions-description">
        <DialogHeader>
          <DialogTitle>Export suggestions</DialogTitle>
        </DialogHeader>
        <p id="export-suggestions-description" className="text-sm text-gray-600 dark:text-gray-400">
          Export all suggestions, or only suggestions that are still uncategorized.
        </p>

        <details className="rounded-md border border-gray-200 dark:border-gray-700">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Categorize with an AI
          </summary>
          <div className="space-y-1 border-t border-gray-200 px-3 py-2 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Export the file, give it to an AI assistant with this prompt, then re-import the result.
              </p>
              <button
                type="button"
                onClick={handleCopyAiPrompt}
                className="flex shrink-0 items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                aria-label="Copy AI instructions"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy prompt"}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-900">
              {aiPrompt}
            </pre>
          </div>
        </details>

        <DialogFooter className="flex gap-2 sm:flex-row flex-col">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onExportUncategorized} disabled={isPending}>
            Export uncategorized
          </Button>
          <Button onClick={onExportAll} disabled={isPending}>
            Export all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
