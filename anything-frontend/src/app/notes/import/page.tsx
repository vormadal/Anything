"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCreateNote, useUploadNoteImage } from "@/hooks/useNotes";
import { serializeNoteDocument } from "@/lib/notes/noteDocument";
import { buildNoteDocument, type UploadedImagesByPlaceholder } from "@/lib/notes/import/buildNoteDocument";
import { parseImportFile } from "@/lib/notes/import/importFile";
import type { ParsedImport } from "@/lib/notes/import/types";
import { NOTES_PATH } from "@/components/notes/NoteWorkspace";

type Phase = "pick" | "review" | "importing" | "done";

interface ReviewEntry {
  parsed: ParsedImport;
  selected: boolean;
}

interface ImportOutcome {
  title: string;
  status: "created" | "failed";
  error?: string;
}

const INSTRUCTIONS = [
  "On your phone, open Samsung Notes.",
  "Long-press a note, then tap Select all.",
  'Tap Save as file, and choose "Text file" or "Microsoft Word file".',
  "Copy the exported files to this device, then pick them below.",
];

export default function ImportNotesPage() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { setLeftAction } = useHeaderActions();

  const uploadImage = useUploadNoteImage();
  const createNote = useCreateNote();

  useEffect(() => {
    setLeftAction({ type: "back", href: NOTES_PATH });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const parsed = await Promise.all(Array.from(files).map(parseImportFile));
    setEntries(parsed.map((file) => ({ parsed: file, selected: !file.fatalError })));
    setPhase("review");
  };

  const toggleEntry = (index: number) => {
    setEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, selected: !entry.selected } : entry))
    );
  };

  const handleImport = async () => {
    const toImport = entries.filter((entry) => entry.selected && !entry.parsed.fatalError);
    setPhase("importing");
    setProgress({ done: 0, total: toImport.length });

    const results: ImportOutcome[] = [];
    for (const entry of toImport) {
      results.push(await importOne(entry.parsed, uploadImage, createNote));
      setProgress((current) => ({ ...current, done: current.done + 1 }));
    }

    setOutcomes(results);
    setPhase("done");
  };

  if (phase === "pick") {
    return (
      <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
        <PageTitle>Import from Samsung Notes</PageTitle>
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800">
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {INSTRUCTIONS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-gray-500 transition-colors hover:border-blue-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-400">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Choose exported files</span>
            <span className="text-xs">.txt or .docx — you can pick several at once</span>
            <input
              type="file"
              multiple
              accept=".txt,.docx"
              className="sr-only"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </label>
        </div>
      </div>
    );
  }

  if (phase === "review") {
    const selectedCount = entries.filter((entry) => entry.selected).length;
    return (
      <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
        <PageTitle>Review notes to import</PageTitle>
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {entries.map((entry, index) => (
            <ReviewRow key={`${entry.parsed.fileName}-${index}`} entry={entry} onToggle={() => toggleEntry(index)} />
          ))}
        </div>
        <Button
          onClick={handleImport}
          disabled={selectedCount === 0 || !isOnline}
          title={isOnline ? undefined : "Importing notes requires an internet connection"}
          className="w-full"
        >
          {selectedCount > 0 ? `Import ${selectedCount} note${selectedCount === 1 ? "" : "s"}` : "Nothing selected"}
        </Button>
      </div>
    );
  }

  if (phase === "importing") {
    const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
        <PageTitle>Importing notes…</PageTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {progress.done} of {progress.total} imported
        </p>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Import progress"
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        >
          <div className="h-full bg-blue-600 transition-all dark:bg-blue-400" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  const createdCount = outcomes.filter((outcome) => outcome.status === "created").length;
  const failed = outcomes.filter((outcome) => outcome.status === "failed");
  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      <PageTitle>Import complete</PageTitle>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {createdCount} note{createdCount === 1 ? "" : "s"} imported.
        </p>
        {failed.length > 0 && (
          <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
            {failed.map((outcome) => (
              <li key={outcome.title}>
                {outcome.title}: {outcome.error}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button onClick={() => router.replace(NOTES_PATH)} className="w-full">
        Done
      </Button>
    </div>
  );
}

function ReviewRow({ entry, onToggle }: { entry: ReviewEntry; onToggle: () => void }) {
  const { parsed } = entry;
  const disabled = !!parsed.fatalError;

  return (
    <label
      className={`flex items-start gap-3 px-4 py-3 ${disabled ? "opacity-50" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
    >
      <input
        type="checkbox"
        checked={entry.selected}
        disabled={disabled}
        onChange={onToggle}
        className="mt-1 h-4 w-4"
      />
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{parsed.title}</span>
        {parsed.fatalError ? (
          <span className="block text-xs text-red-600 dark:text-red-400">{parsed.fatalError}</span>
        ) : (
          <>
            {parsed.images.length > 0 && (
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {parsed.images.length} image{parsed.images.length === 1 ? "" : "s"}
              </span>
            )}
            {parsed.warnings.map((warning) => (
              <span key={warning} className="block text-xs text-amber-600 dark:text-amber-400">
                {warning}
              </span>
            ))}
          </>
        )}
      </span>
    </label>
  );
}

/** Uploads `parsed`'s images (best-effort — a failed one is just dropped) then creates the note. */
async function importOne(
  parsed: ParsedImport,
  uploadImage: ReturnType<typeof useUploadNoteImage>,
  createNote: ReturnType<typeof useCreateNote>
): Promise<ImportOutcome> {
  try {
    const uploadedImages: UploadedImagesByPlaceholder = new Map();
    for (const image of parsed.images) {
      try {
        const file = new File([image.blob], image.fileName, { type: image.blob.type });
        const uploaded = await uploadImage.mutateAsync(file);
        uploadedImages.set(image.placeholderId, { src: uploaded.url, storageKey: uploaded.storageKey });
      } catch {
        // Dropped from the note body by buildNoteDocument — the note itself
        // still imports, just without this one image.
      }
    }

    const document = buildNoteDocument(parsed, uploadedImages);
    await createNote.mutateAsync({ title: parsed.title, contentJson: serializeNoteDocument(document) });
    return { title: parsed.title, status: "created" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import this note.";
    return { title: parsed.title, status: "failed", error: message };
  }
}
