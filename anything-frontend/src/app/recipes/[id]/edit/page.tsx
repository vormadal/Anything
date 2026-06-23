"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus, Check, GripVertical, Clock, RefreshCw, X, ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useRecipe,
  useRecipeIngredients,
  useRecipeSteps,
  useRecipeImages,
  useUpdateRecipe,
  useDeleteRecipe,
  useAddRecipeIngredient,
  useUpdateRecipeIngredient,
  useDeleteRecipeIngredient,
  useAddRecipeStep,
  useUpdateRecipeStep,
  useDeleteRecipeStep,
  useDeleteRecipeImage,
  useRecipeTags,
  useAddRecipeTag,
  useDeleteRecipeTag,
  useReorderRecipeIngredients,
  useReorderRecipeSteps,
  useReimportRecipe,
} from "@/hooks/useRecipes";
import { useRecommendations } from "@/hooks/useRecommendations";
import { RecipeImageUpload } from "@/components/RecipeImageUpload";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import type { RecipeIngredient, RecipeStep } from "@/lib/api-client/models/index";

type SortableIngredientItemProps = Readonly<{
  id: number;
  ingredient: RecipeIngredient;
  edits?: { name: string; amount: string; unit: string };
  onFieldChange: (id: number, field: "name" | "amount" | "unit", value: string) => void;
  onBlur: (id: number) => void;
  onDelete: (id: number) => void;
  isDeletePending: boolean;
}>;

function SortableIngredientItem({
  id,
  ingredient,
  edits,
  onFieldChange,
  onBlur,
  onDelete,
  isDeletePending,
}: SortableIngredientItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-1 py-1">
      <button
        type="button"
        className="flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <input
        type="text"
        value={edits?.name ?? (ingredient.name ?? "")}
        onChange={(e) => onFieldChange(id, "name", e.target.value)}
        onBlur={() => onBlur(id)}
        placeholder="Ingredient name"
        aria-label="Ingredient name"
        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
      />
      <input
        type="number"
        value={edits?.amount ?? String(ingredient.amount ?? "")}
        onChange={(e) => onFieldChange(id, "amount", e.target.value)}
        onBlur={() => onBlur(id)}
        placeholder="Qty"
        aria-label="Ingredient quantity"
        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        step="any"
      />
      <input
        type="text"
        value={edits?.unit ?? (ingredient.unit ?? "")}
        onChange={(e) => onFieldChange(id, "unit", e.target.value)}
        onBlur={() => onBlur(id)}
        placeholder="Unit"
        aria-label="Ingredient unit"
        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(id)}
        disabled={isDeletePending}
        aria-label="Remove ingredient"
        className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

type SortableStepItemProps = Readonly<{
  step: RecipeStep;
  index: number;
  editText?: string;
  onTextChange: (text: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDelete: () => void;
  isDeletePending: boolean;
  showSaved?: boolean;
}>;

function SortableStepItem({
  step,
  index,
  editText,
  onTextChange,
  onBlur,
  onKeyDown,
  onDelete,
  isDeletePending,
  showSaved,
}: SortableStepItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id ?? 0 });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <li ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="flex items-center justify-center p-1 mt-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="shrink-0 text-sm font-semibold text-gray-300 dark:text-gray-600 w-5 text-right mt-1.5">
        {index + 1}.
      </span>
      <div className="relative flex-1 min-w-0">
        <input
          type="text"
          value={editText ?? step.text ?? ""}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="w-full px-2 py-1 pr-7 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        />
        <span
          className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${showSaved ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5 text-green-500" />
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isDeletePending}
        aria-label="Remove step"
        className="h-7 w-7 mt-0.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

export default function RecipeEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const recipeId = Number(params.id);

  const [editName, setEditName] = useState<string | null>(null);
  const [editLink, setEditLink] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string | null>(null);
  const [editCookTimeMinutes, setEditCookTimeMinutes] = useState<string | null>(null);
  const [editServings, setEditServings] = useState<string | null>(null);
  const [editServingsType, setEditServingsType] = useState<string | null>(null);

  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("");

  const [editingIngredients, setEditingIngredients] = useState<
    Record<number, { name: string; amount: string; unit: string }>
  >({});

  const [newStepText, setNewStepText] = useState("");
  const [editingSteps, setEditingSteps] = useState<Record<number, string>>({});
  const [savedStepIds, setSavedStepIds] = useState<Record<number, boolean>>({});
  const [stepAddedSuccess, setStepAddedSuccess] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reimportDialogOpen, setReimportDialogOpen] = useState(false);
  const [reimportName, setReimportName] = useState(true);
  const [reimportIngredients, setReimportIngredients] = useState(true);
  const [reimportSteps, setReimportSteps] = useState(true);
  const [reimportImages, setReimportImages] = useState(true);
  const [showIngredientSuggestions, setShowIngredientSuggestions] = useState(false);
  const ingredientNameRef = useRef<HTMLInputElement>(null);
  const SUGGESTION_CLOSE_DELAY_MS = 150;

  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const { data: ingredients } = useRecipeIngredients(recipeId);
  const { data: steps } = useRecipeSteps(recipeId);
  const { data: images } = useRecipeImages(recipeId);
  const { data: tags } = useRecipeTags(recipeId);
  const { data: recommendations } = useRecommendations();

  const effectiveEditName = editName ?? (recipe?.name ?? "");
  const effectiveEditLink = editLink ?? (recipe?.link ?? "");
  const effectiveEditNotes = editNotes ?? (recipe?.notes ?? "");
  const effectiveEditCookTimeMinutes = editCookTimeMinutes ?? (recipe?.cookTimeMinutes != null ? String(recipe.cookTimeMinutes) : "");
  const effectiveEditServings = editServings ?? (recipe?.servings != null ? String(recipe.servings) : "");
  const effectiveEditServingsType = editServingsType ?? (recipe?.servingsType ?? "People");

  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const reimportRecipe = useReimportRecipe(recipeId);
  const addIngredient = useAddRecipeIngredient(recipeId);
  const updateIngredient = useUpdateRecipeIngredient(recipeId);
  const deleteIngredient = useDeleteRecipeIngredient(recipeId);
  const addStep = useAddRecipeStep(recipeId);
  const updateStep = useUpdateRecipeStep(recipeId);
  const deleteStep = useDeleteRecipeStep(recipeId);
  const deleteImage = useDeleteRecipeImage(recipeId);
  const addTag = useAddRecipeTag(recipeId);
  const deleteTag = useDeleteRecipeTag(recipeId);
  const reorderIngredients = useReorderRecipeIngredients(recipeId);
  const reorderSteps = useReorderRecipeSteps(recipeId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleIngredientDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !ingredients) return;
    const oldIndex = ingredients.findIndex((i) => i.id === active.id);
    const newIndex = ingredients.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(ingredients, oldIndex, newIndex);
    reorderIngredients.mutate(reordered.map((i) => i.id ?? 0));
  };

  const handleStepDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
    const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortedSteps, oldIndex, newIndex);
    reorderSteps.mutate(reordered.map((s) => s.id ?? 0));
  };

  const handleDone = useCallback(async () => {
    const parsedCookTime = effectiveEditCookTimeMinutes ? Number(effectiveEditCookTimeMinutes) : null;
    const parsedServings = effectiveEditServings ? Number(effectiveEditServings) : null;
    const nameChanged = effectiveEditName !== (recipe?.name ?? "");
    const linkChanged = effectiveEditLink !== (recipe?.link ?? "");
    const notesChanged = effectiveEditNotes !== (recipe?.notes ?? "");
    const cookTimeChanged = parsedCookTime !== (recipe?.cookTimeMinutes ?? null);
    const servingsChanged = parsedServings !== (recipe?.servings ?? null);
    const servingsTypeChanged = effectiveEditServingsType !== (recipe?.servingsType ?? "People");

    if (nameChanged || linkChanged || notesChanged || cookTimeChanged || servingsChanged || servingsTypeChanged) {
      try {
        await updateRecipe.mutateAsync({
          id: recipeId,
          name: effectiveEditName,
          link: effectiveEditLink || null,
          notes: effectiveEditNotes || null,
          cookTimeMinutes: parsedCookTime && !Number.isNaN(parsedCookTime) ? parsedCookTime : null,
          servings: parsedServings && !Number.isNaN(parsedServings) ? parsedServings : null,
          servingsType: effectiveEditServingsType,
        });
        toast.success("Recipe updated");
      } catch {
        toast.error("Failed to update recipe. Please try again.");
        return;
      }
    }
    router.push(`/recipes/${recipeId}`);
  }, [effectiveEditName, effectiveEditLink, effectiveEditNotes, effectiveEditCookTimeMinutes, effectiveEditServings, effectiveEditServingsType, recipe, recipeId, updateRecipe, router]);

  const handleIngredientFieldChange = (
    ingredientId: number,
    field: "name" | "amount" | "unit",
    value: string
  ) => {
    setEditingIngredients((prev) => ({
      ...prev,
      [ingredientId]: {
        ...(prev[ingredientId] ?? {
          name: ingredients?.find((i) => i.id === ingredientId)?.name ?? "",
          amount: String(ingredients?.find((i) => i.id === ingredientId)?.amount ?? ""),
          unit: ingredients?.find((i) => i.id === ingredientId)?.unit ?? "",
        }),
        [field]: value,
      },
    }));
  };

  const handleIngredientBlur = async (ingredientId: number) => {
    const edits = editingIngredients[ingredientId];
    if (!edits) return;
    if (!edits.name.trim()) return;
    const parsedAmount = edits.amount ? Number(edits.amount) : null;
    if (parsedAmount !== null && (Number.isNaN(parsedAmount) || parsedAmount < 0)) return;

    try {
      await updateIngredient.mutateAsync({
        ingredientId,
        name: edits.name,
        amount: parsedAmount,
        unit: edits.unit || null,
      });
      setEditingIngredients((prev) => {
        const next = { ...prev };
        delete next[ingredientId];
        return next;
      });
    } catch {
      toast.error("Failed to update ingredient. Please try again.");
    }
  };

  const filteredIngredientSuggestions =
    recommendations?.filter(
      (r) =>
        r.name &&
        newIngredientName.trim().length > 0 &&
        r.name.toLowerCase().includes(newIngredientName.toLowerCase())
    ) ?? [];

  const handleSelectIngredientSuggestion = (name: string, preferredUnit?: string | null) => {
    setNewIngredientName(name);
    if (!newIngredientUnit.trim() && preferredUnit?.trim()) {
      setNewIngredientUnit(preferredUnit.trim());
    }
    setShowIngredientSuggestions(false);
    ingredientNameRef.current?.focus();
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;
    const parsedAmount = newIngredientAmount ? Number(newIngredientAmount) : null;
    if (parsedAmount !== null && (Number.isNaN(parsedAmount) || parsedAmount < 0)) return;

    try {
      await addIngredient.mutateAsync({
        name: newIngredientName,
        amount: parsedAmount,
        unit: newIngredientUnit || undefined,
      });
      setNewIngredientName("");
      setNewIngredientAmount("");
      setNewIngredientUnit("");
      toast.success("Ingredient added");
      ingredientNameRef.current?.focus();
    } catch {
      toast.error("Failed to add ingredient. Please try again.");
    }
  };

  const handleDeleteIngredient = async (ingredientId: number) => {
    try {
      await deleteIngredient.mutateAsync(ingredientId);
      toast.success("Ingredient removed");
    } catch {
      toast.error("Failed to remove ingredient. Please try again.");
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;
    const nextOrder = (steps?.length ?? 0) + 1;
    try {
      await addStep.mutateAsync({ text: newStepText, order: nextOrder });
      setNewStepText("");
      setStepAddedSuccess(true);
      setTimeout(() => setStepAddedSuccess(false), 2000);
    } catch {
      toast.error("Failed to add step. Please try again.");
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    try {
      await deleteStep.mutateAsync(stepId);
      toast.success("Step removed");
    } catch {
      toast.error("Failed to remove step. Please try again.");
    }
  };

  const handleSaveStep = async (stepId: number, order: number) => {
    const text = editingSteps[stepId];
    if (text === undefined) return;
    if (!text.trim()) return;
    try {
      await updateStep.mutateAsync({ stepId, text, order });
      setEditingSteps((prev) => {
        const next = { ...prev };
        delete next[stepId];
        return next;
      });
      setSavedStepIds((prev) => ({ ...prev, [stepId]: true }));
      setTimeout(() => {
        setSavedStepIds((prev) => {
          const next = { ...prev };
          delete next[stepId];
          return next;
        });
      }, 2000);
    } catch {
      toast.error("Failed to update step. Please try again.");
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteImage.mutateAsync(imageId);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image. Please try again.");
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await addTag.mutateAsync(newTagName.trim());
      setNewTagName("");
      toast.success("Tag added");
    } catch {
      toast.error("Failed to add tag. Please try again.");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await deleteTag.mutateAsync(tagId);
      toast.success("Tag removed");
    } catch {
      toast.error("Failed to remove tag. Please try again.");
    }
  };

  const handleReimport = async () => {
    try {
      await reimportRecipe.mutateAsync({
        importName: reimportName,
        importIngredients: reimportIngredients,
        importSteps: reimportSteps,
        importImages: reimportImages,
      });
      toast.success("Recipe reimported successfully");
      setReimportDialogOpen(false);
    } catch {
      toast.error("Failed to reimport recipe. Please try again.");
    }
  };

  const handleDeleteRecipe = async () => {
    try {
      await deleteRecipe.mutateAsync(recipeId);
      setDeleteConfirmOpen(false);
      toast.success("Recipe deleted");
      router.push("/recipes");
    } catch {
      toast.error("Failed to delete recipe. Please try again.");
      setDeleteConfirmOpen(false);
    }
  };

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const heroImageUrl = images?.[0]?.originalUrl ?? "";

  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const handleDoneRef = useRef(handleDone);
  useEffect(() => {
    handleDoneRef.current = handleDone;
  });

  useEffect(() => {
    setLeftAction({ type: "back", href: `/recipes/${recipeId}` });
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="default"
          size="sm"
          onClick={() => handleDoneRef.current()}
          disabled={updateRecipe.isPending}
          aria-label="Done editing"
        >
          <Check className="h-4 w-4 mr-1" />
          Done
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {recipe?.link && (
              <DropdownMenuItem onSelect={() => setReimportDialogOpen(true)}>
                <RefreshCw className="h-4 w-4" />
                Reimport from URL
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
              onSelect={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Recipe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [updateRecipe.isPending, recipe?.link, recipeId, setHeaderActions, setLeftAction]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageTitle>Edit Recipe</PageTitle>

      {/* ── Hero: full-width image with overlaid title ── */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt="Recipe image"
            fill
            className="object-cover"
            sizes="100vw"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-gray-600">
            <ImageIcon className="h-20 w-20" strokeWidth={1} />
            <p className="text-sm text-gray-400 dark:text-gray-500">Upload a photo below</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
          <input
            type="text"
            value={effectiveEditName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Recipe name"
            className="w-full bg-transparent text-white text-2xl font-bold placeholder-white/50 focus:outline-none border-b border-white/40 pb-0.5"
          />
        </div>
      </div>

      {/* ── Image management strip ── */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <RecipeImageUpload
          recipeId={recipeId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["recipeImages", recipeId] })}
        />
        {images && images.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {images.map((image) => (
              <div key={image.id} className="relative h-16 w-24">
                {image.thumbnailUrl && (
                  <Image
                    src={image.thumbnailUrl}
                    alt="Recipe image"
                    fill
                    sizes="96px"
                    className="object-cover rounded border border-gray-200 dark:border-gray-700"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full"
                  onClick={() => handleDeleteImage(image.id ?? 0)}
                  disabled={deleteImage.isPending}
                  aria-label="Remove image"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Page content ── */}
      <div className="px-4 sm:px-6 py-6">
        {isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load recipe. Please try again later.
          </div>
        )}

        {/* Recipe metadata */}
        <div className="space-y-2 mb-8">
          <input
            type="url"
            value={effectiveEditLink}
            onChange={(e) => setEditLink(e.target.value)}
            placeholder="Recipe link (optional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          />
          <textarea
            value={effectiveEditNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm resize-none"
          />
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="number"
                min={1}
                max={10000}
                value={effectiveEditCookTimeMinutes}
                onChange={(e) => setEditCookTimeMinutes(e.target.value)}
                placeholder="Cook time (min)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min={1}
                max={10000}
                value={effectiveEditServings}
                onChange={(e) => setEditServings(e.target.value)}
                placeholder="Servings"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <select
                value={effectiveEditServingsType}
                onChange={(e) => setEditServingsType(e.target.value)}
                className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                aria-label="Servings type"
              >
                <option value="People">People</option>
                <option value="Quantity">Quantity</option>
                <option value="Pieces">Pieces</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Tags ── */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <span
                key={tag.id!}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleDeleteTag(tag.id!)}
                  disabled={deleteTag.isPending}
                  aria-label={`Remove tag ${tag.name}`}
                  className="ml-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddTag} className="flex gap-2 mt-3">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Add a tag (e.g. vegetarian)"
              maxLength={50}
              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!newTagName.trim() || addTag.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>
        </div>

        {/* ── Ingredients ── */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Ingredients
          </h2>
          {ingredients?.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No ingredients yet. Add some below.</p>
          )}
          {ingredients && ingredients.length > 0 && (
            <ul className="space-y-0.5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleIngredientDragEnd}
              >
                <SortableContext
                  items={ingredients.map((i) => i.id ?? 0)}
                  strategy={verticalListSortingStrategy}
                >
                  {ingredients.map((ingredient) => {
                    const id = ingredient.id ?? 0;
                    return (
                      <SortableIngredientItem
                        key={id}
                        id={id}
                        ingredient={ingredient}
                        edits={editingIngredients[id]}
                        onFieldChange={handleIngredientFieldChange}
                        onBlur={handleIngredientBlur}
                        onDelete={handleDeleteIngredient}
                        isDeletePending={deleteIngredient.isPending}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </ul>
          )}
          <form onSubmit={handleAddIngredient} className="mt-3">
            <div className="flex gap-1 items-center">
              <div className="relative flex-1 min-w-0">
                <input
                  ref={ingredientNameRef}
                  type="text"
                  value={newIngredientName}
                  onChange={(e) => {
                    setNewIngredientName(e.target.value);
                    setShowIngredientSuggestions(true);
                  }}
                  onFocus={() => setShowIngredientSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowIngredientSuggestions(false), SUGGESTION_CLOSE_DELAY_MS)
                  }
                  placeholder="Ingredient name"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  autoComplete="off"
                />
                {showIngredientSuggestions && filteredIngredientSuggestions.length > 0 && (
                  <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredIngredientSuggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          onMouseDown={() => handleSelectIngredientSuggestion(suggestion.name ?? "", suggestion.preferredUnit)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          {suggestion.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                type="number"
                value={newIngredientAmount}
                onChange={(e) => setNewIngredientAmount(e.target.value)}
                placeholder="Qty"
                className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                step="any"
              />
              <input
                type="text"
                value={newIngredientUnit}
                onChange={(e) => setNewIngredientUnit(e.target.value)}
                placeholder="Unit"
                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <Button type="submit" size="icon" disabled={addIngredient.isPending} aria-label="Add ingredient">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* ── Steps ── */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Steps
          </h2>
          {sortedSteps.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No steps yet. Add one below.</p>
          )}
          {sortedSteps.length > 0 && (
            <ol className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStepDragEnd}
              >
                <SortableContext
                  items={sortedSteps.map((s) => s.id ?? 0)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedSteps.map((step, index) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      index={index}
                      editText={editingSteps[step.id ?? 0]}
                      showSaved={!!savedStepIds[step.id ?? 0]}
                      onTextChange={(text) =>
                        setEditingSteps((prev) => ({ ...prev, [step.id ?? 0]: text }))
                      }
                      onBlur={() => {
                        const current = editingSteps[step.id ?? 0];
                        if (current === undefined) return;
                        if (current === step.text) {
                          setEditingSteps((prev) => {
                            const next = { ...prev };
                            delete next[step.id ?? 0];
                            return next;
                          });
                        } else {
                          handleSaveStep(step.id ?? 0, step.order ?? 0);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveStep(step.id ?? 0, step.order ?? 0);
                        }
                      }}
                      onDelete={() => handleDeleteStep(step.id ?? 0)}
                      isDeletePending={deleteStep.isPending}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </ol>
          )}
          <form onSubmit={handleAddStep} className="mt-4">
            <div className="flex gap-1 items-center">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder="Step description..."
                  className="w-full px-2 py-1.5 pr-7 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <span
                  className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${stepAddedSuccess ? "opacity-100" : "opacity-0"}`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5 text-green-500" />
                </span>
              </div>
              <Button type="submit" size="icon" disabled={addStep.isPending} aria-label="Add step">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Delete recipe confirmation dialog ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this recipe? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRecipe}
              disabled={deleteRecipe.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reimport from URL dialog ── */}
      <Dialog open={reimportDialogOpen} onOpenChange={setReimportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reimport from URL</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose which parts to update from{" "}
            <a
              href={recipe?.link ?? ""}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all"
            >
              {recipe?.link}
            </a>
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportName}
                onChange={(e) => setReimportName(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportIngredients}
                onChange={(e) => setReimportIngredients(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Ingredients</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportSteps}
                onChange={(e) => setReimportSteps(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Instructions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportImages}
                onChange={(e) => setReimportImages(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Images</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setReimportDialogOpen(false)} disabled={reimportRecipe.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleReimport}
              disabled={reimportRecipe.isPending || (!reimportName && !reimportIngredients && !reimportSteps && !reimportImages)}
            >
              {reimportRecipe.isPending ? "Importing…" : "Reimport"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
