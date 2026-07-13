"use client";

import { Button } from "@/components/ui/button";
import { classifyOcrLines, recognizeRecipePhoto } from "@/lib/ocr";
import {
  uploadRecipeImageFile,
  useImportRecipe,
  useParseRecipeFromText,
} from "@/hooks/useRecipes";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type Phase = "pick" | "ocr" | "review";

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white";

const LABEL_CLASS =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export function PhotoImport({ onBack }: { readonly onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [progress, setProgress] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [attachPhoto, setAttachPhoto] = useState(true);
  const cancelledRef = useRef(false);

  const parseText = useParseRecipeFromText();
  const importRecipe = useImportRecipe();
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setPhoto(file);
    setProgress(0);
    setPhase("ocr");
    cancelledRef.current = false;
    try {
      const text = await recognizeRecipePhoto(file, setProgress);
      if (cancelledRef.current) return;
      const classified = classifyOcrLines(text);
      setName(classified.name);
      setIngredientsText(classified.ingredientsText);
      setStepsText(classified.stepsText);
      setPhase("review");
    } catch {
      if (cancelledRef.current) return;
      toast.error(
        "Couldn't read text from this photo. Try a sharper photo or create the recipe manually."
      );
      setPhase("pick");
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !ingredientsText.trim() && !stepsText.trim()) return;
    try {
      const parsed = await parseText.mutateAsync({
        name: name.trim() || null,
        ingredientsText,
        stepsText,
      });
      const imported = await importRecipe.mutateAsync({
        name: parsed.name ?? "",
        link: null,
        notes: null,
        ingredients: parsed.ingredients ?? [],
        steps: parsed.steps ?? [],
        imageUrl: null,
      });
      if (attachPhoto && photo) {
        try {
          await uploadRecipeImageFile(imported.id, photo);
        } catch {
          toast.warning("Recipe imported, but the photo could not be attached.");
        }
      }
      toast.success("Recipe imported");
      router.replace(`/recipes/${imported.id}/edit`);
    } catch {
      toast.error("Failed to import the recipe. Please try again.");
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => {
        cancelledRef.current = true;
        onBack();
      }}
      aria-label="Return to import mode selection"
      className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
    >
      ← Back
    </button>
  );

  if (phase === "pick") {
    return (
      <div className="space-y-4">
        {backButton}
        <label htmlFor="recipe-photo" className={LABEL_CLASS}>
          Recipe photo
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Take a photo of a printed recipe and we&apos;ll extract the text to
          get you started. You can review and fix the result before saving.
        </p>
        <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer text-gray-500 dark:text-gray-400 transition-colors">
          <Camera className="h-8 w-8" />
          <span className="text-sm font-medium">Take or choose a photo</span>
          <input
            id="recipe-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
        </label>
      </div>
    );
  }

  if (phase === "ocr") {
    return (
      <div className="space-y-4">
        {backButton}
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Extracting text from the photo…
        </p>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Text extraction progress"
          className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        >
          <div
            className="h-full bg-blue-600 dark:bg-blue-400 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The first scan downloads the text recognition model, which can take a
          moment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleImport} className="space-y-4">
      {backButton}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Review the extracted text below and move any misplaced lines before
        importing.
      </p>
      <div>
        <label htmlFor="photo-recipe-name" className={LABEL_CLASS}>
          Name
        </label>
        <input
          id="photo-recipe-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recipe name"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="photo-recipe-ingredients" className={LABEL_CLASS}>
          Ingredients (one per line)
        </label>
        <textarea
          id="photo-recipe-ingredients"
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          rows={8}
          placeholder={"250 g flour\n2 eggs"}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="photo-recipe-steps" className={LABEL_CLASS}>
          Steps (one per line)
        </label>
        <textarea
          id="photo-recipe-steps"
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          rows={8}
          placeholder={"Whisk the batter.\nFry thin pancakes."}
          className={INPUT_CLASS}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={attachPhoto}
          onChange={(e) => setAttachPhoto(e.target.checked)}
          className="h-4 w-4"
        />
        Attach photo to the recipe
      </label>
      <Button
        type="submit"
        disabled={
          parseText.isPending ||
          importRecipe.isPending ||
          (!name.trim() && !ingredientsText.trim() && !stepsText.trim()) ||
          !isOnline
        }
        title={isOnline ? undefined : "Importing a recipe requires an internet connection"}
        className="w-full"
      >
        {parseText.isPending || importRecipe.isPending
          ? "Importing..."
          : "Import Recipe"}
      </Button>
    </form>
  );
}
