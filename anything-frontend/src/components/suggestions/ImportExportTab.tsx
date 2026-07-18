"use client";

import { useRef, useState } from "react";
import { Copy, Check, Download, Upload, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useExportSuggestionsBundle,
  useImportSuggestionsBundle,
  type SuggestionsBundle,
} from "@/hooks/useSuggestionsBundle";
import { useSuggestionCategories } from "@/hooks/useSuggestionCategories";

const AI_PROMPT_BASE = `I'm attaching a JSON file exported from a shopping-list app. Please assign a category to each item and return the full file so I can re-upload it.

Follow these rules exactly:
- Keep the top-level shape: { "recommendations": [ { "name": "...", "preferredUnit": "...", "category": "...", "delete": false } ], "categories": [ { "name": "..." } ] }.
- Return the "categories" array unchanged.
- Do not rename, add, or remove any "name" values - each one must match exactly (case-insensitive) with what I gave you.
- Set "category" to a short category name for the item (e.g. Produce, Dairy, Bakery, Meat, Frozen, Pantry, Household). Leave "category" as an empty string only if you truly can't tell.
- Keep "preferredUnit" and "delete" as they were; don't set "delete" to true.
- Return the complete JSON file, ready to re-upload, not a diff or partial list.`;

function buildAiPrompt(categoryNames: string[]): string {
  const names = categoryNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return AI_PROMPT_BASE;
  return `${AI_PROMPT_BASE}\n\nPrefer these existing categories where they fit, and only invent a new one if none apply:\n${names.join(", ")}`;
}

const sectionClass =
  "rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3";
const sectionTitleClass = "text-sm font-semibold text-gray-900 dark:text-white";
const sectionHintClass = "text-xs text-gray-500 dark:text-gray-400";

export function ImportExportTab() {
  const { data: categories = [] } = useSuggestionCategories();
  const exportBundle = useExportSuggestionsBundle();
  const importBundle = useImportSuggestionsBundle();

  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiPrompt = buildAiPrompt(categories.map((c) => c.name ?? ""));

  const handleExport = async (uncategorizedOnly: boolean) => {
    try {
      await exportBundle.mutateAsync({ uncategorizedOnly });
      toast.success("Suggestions exported.");
    } catch {
      toast.error("Failed to export suggestions.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as SuggestionsBundle;
      await importBundle.mutateAsync(data);
      toast.success("Suggestions imported.");
    } catch {
      toast.error("Failed to import suggestions.");
    } finally {
      e.target.value = "";
    }
  };

  const handleCopyAiPrompt = async () => {
    await navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    toast.success("AI instructions copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Export */}
      <div className={sectionClass}>
        <div>
          <h3 className={sectionTitleClass}>Export</h3>
          <p className={sectionHintClass}>
            Download suggestions and their categories together as one JSON file for
            backup or editing.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => handleExport(false)}
            disabled={exportBundle.isPending}
            className="sm:w-auto"
          >
            <Download className="h-4 w-4 mr-1" />
            Export all
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport(true)}
            disabled={exportBundle.isPending}
            className="sm:w-auto"
          >
            <Download className="h-4 w-4 mr-1" />
            Export uncategorized only
          </Button>
        </div>
      </div>

      {/* Import */}
      <div className={sectionClass}>
        <div>
          <h3 className={sectionTitleClass}>Import</h3>
          <p className={sectionHintClass}>
            Upload a previously exported file. Categories are created as needed and
            existing suggestions are updated by name.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
        <Button
          variant="outline"
          onClick={handleImportClick}
          disabled={importBundle.isPending}
          className="sm:w-auto self-start"
        >
          <Upload className="h-4 w-4 mr-1" />
          Import from file
        </Button>
      </div>

      {/* AI categorization */}
      <div className={sectionClass}>
        <div>
          <h3 className={sectionTitleClass}>Categorize with an AI</h3>
          <p className={sectionHintClass}>
            Export the file, give it to an AI assistant with the prompt below, then
            re-import the result to fill in each suggestion&apos;s category.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPromptOpen((v) => !v)}
          className="flex items-center gap-1.5 self-start text-sm font-medium text-gray-700 dark:text-gray-200"
          aria-expanded={promptOpen}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${promptOpen ? "rotate-180" : ""}`}
          />
          {promptOpen ? "Hide prompt" : "Show prompt"}
        </button>
        {promptOpen && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
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
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-900">
              {aiPrompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
