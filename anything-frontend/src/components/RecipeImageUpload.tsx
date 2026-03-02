"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useUploadRecipeImage } from "@/hooks/useRecipes";

interface RecipeImageUploadProps {
  recipeId: number;
  onSuccess: () => void;
}

export function RecipeImageUpload({ recipeId, onSuccess }: RecipeImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadImage, isPending, error } = useUploadRecipeImage(recipeId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadImage(file);
      onSuccess();
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? "Uploading..." : "Upload Photo"}
      </Button>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}
