"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

interface RecipeImageUploadProps {
  recipeId: number;
  onSuccess: () => void;
}

export function RecipeImageUpload({ recipeId, onSuccess }: RecipeImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("accessToken") ?? "";

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/images/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      onSuccess();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
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
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Upload Photo"}
      </Button>
      {uploadError && (
        <p className="text-sm text-red-500 mt-1">{uploadError}</p>
      )}
    </div>
  );
}
