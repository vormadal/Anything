"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus, Check, Pencil, ShoppingCart, ImageIcon, MoreVertical, CalendarPlus, X, GripVertical, Clock, Users, Package, Layers, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useAddIngredientsToShoppingList,
  useRecipeTags,
  useAddRecipeTag,
  useDeleteRecipeTag,
  useReorderRecipeIngredients,
  useReorderRecipeSteps,
  useReimportRecipe,
} from "@/hooks/useRecipes";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useApprovedRecommendations } from "@/hooks/useRecommendations";
import { AddToFoodPlanDialog } from "@/components/AddToFoodPlanDialog";
import { RecipeImageUpload } from "@/components/RecipeImageUpload";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  onSave: (id: number) => void;
  onDelete: (id: number) => void;
  isSavePending: boolean;
  isDeletePending: boolean;
}>;

function SortableIngredientItem({
  id,
  ingredient,
  edits,
  onFieldChange,
  onSave,
  onDelete,
  isSavePending,
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
        placeholder="Ingredient name"
        aria-label="Ingredient name"
        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
      />
      <input
        type="number"
        value={edits?.amount ?? String(ingredient.amount ?? "")}
        onChange={(e) => onFieldChange(id, "amount", e.target.value)}
        placeholder="Qty"
        aria-label="Ingredient quantity"
        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        step="any"
      />
      <input
        type="text"
        value={edits?.unit ?? (ingredient.unit ?? "")}
        onChange={(e) => onFieldChange(id, "unit", e.target.value)}
        placeholder="Unit"
        aria-label="Ingredient unit"
        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
      />
      {edits && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSave(id)}
          disabled={isSavePending}
          aria-label="Save ingredient"
          className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
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
      <input
        type="text"
        value={editText ?? step.text ?? ""}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
      />
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

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const recipeId = Number(params.id);

  const isSafeUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  const getDisplayDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    } catch {
      return url;
    }
  };

  const [isEditMode, setIsEditMode] = useState(() => searchParams.get("edit") === "true");

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
  const [newTagName, setNewTagName] = useState("");
  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [foodPlanDialogOpen, setFoodPlanDialogOpen] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
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
  const { data: shoppingLists } = useShoppingLists();
  const { data: recommendations } = useApprovedRecommendations();

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
  const addToShoppingList = useAddIngredientsToShoppingList(recipeId);
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

  const handleEnterEditMode = useCallback(() => {
    setEditName(null);
    setEditLink(null);
    setEditNotes(null);
    setEditCookTimeMinutes(null);
    setEditServings(null);
    setEditServingsType(null);
    setEditingIngredients({});
    setEditingSteps({});
    setIsEditMode(true);
  }, []);

  // Clean up the ?edit=true param from the URL without triggering a re-render loop
  const hasCleanedEditParam = useRef(false);
  useEffect(() => {
    if (searchParams.get("edit") === "true" && !hasCleanedEditParam.current) {
      hasCleanedEditParam.current = true;
      router.replace(`/recipes/${recipeId}`);
    }
  }, [searchParams, recipeId, router]);

  const handleExitEditMode = async () => {
    const nameChanged = effectiveEditName !== (recipe?.name ?? "");
    const linkChanged = effectiveEditLink !== (recipe?.link ?? "");
    const notesChanged = effectiveEditNotes !== (recipe?.notes ?? "");
    const parsedCookTime = effectiveEditCookTimeMinutes ? Number(effectiveEditCookTimeMinutes) : null;
    const parsedServings = effectiveEditServings ? Number(effectiveEditServings) : null;
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
          cookTimeMinutes: parsedCookTime && !isNaN(parsedCookTime) ? parsedCookTime : null,
          servings: parsedServings && !isNaN(parsedServings) ? parsedServings : null,
          servingsType: effectiveEditServingsType,
        });
        toast.success("Recipe updated");
      } catch {
        toast.error("Failed to update recipe. Please try again.");
      }
    }
    setIsEditMode(false);
    setEditName(null);
    setEditLink(null);
    setEditNotes(null);
    setEditCookTimeMinutes(null);
    setEditServings(null);
    setEditServingsType(null);
    setEditingIngredients({});
    setEditingSteps({});
  };

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

  const handleSaveIngredient = async (ingredientId: number) => {
    const edits = editingIngredients[ingredientId];
    if (!edits) return;
    if (!edits.name.trim()) return;
    const parsedAmount = edits.amount ? Number(edits.amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) return;

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
      toast.success("Ingredient updated");
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
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) return;

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
      toast.success("Step added");
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
      toast.success("Step updated");
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

  const handleAddToShoppingList = async (shoppingListId: number) => {
    try {
      await addToShoppingList.mutateAsync({ shoppingListId, multiplier });
      setShoppingListDialogOpen(false);
      toast.success("Ingredients added to shopping list");
    } catch {
      toast.error("Failed to add ingredients to shopping list. Please try again.");
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

  // Keep a ref to the exit handler so the header effect closure is always current
  const handleExitEditModeRef = useRef(handleExitEditMode);
  useEffect(() => {
    handleExitEditModeRef.current = handleExitEditMode;
  });

  useEffect(() => {
    setLeftAction({ type: "back", href: "/recipes" });
    if (isEditMode) {
      setHeaderActions(
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="default"
            size="sm"
            onClick={() => handleExitEditModeRef.current()}
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
    } else {
      setHeaderActions(
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFoodPlanDialogOpen(true)}
            aria-label="Add to food plan"
          >
            <CalendarPlus className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleEnterEditMode}>
                <Pencil className="h-4 w-4" />
                Edit recipe
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShoppingListDialogOpen(true)}>
                <ShoppingCart className="h-4 w-4" />
                Add to Shopping List
              </DropdownMenuItem>
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
    }
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [isEditMode, updateRecipe.isPending, setHeaderActions, setLeftAction, handleEnterEditMode]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageTitle>Recipe</PageTitle>
      {/* ── Hero: full-width image with overlaid controls and title ── */}
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
            {isEditMode ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Upload a photo below</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No photo yet</p>
            )}
          </div>
        )}

        {/* Gradient for legibility of the title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Title — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
          {isEditMode ? (
            <input
              type="text"
              value={effectiveEditName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Recipe name"
              className="w-full bg-transparent text-white text-2xl font-bold placeholder-white/50 focus:outline-none border-b border-white/40 pb-0.5"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
              {recipe?.name ?? (isLoading ? "" : "Recipe")}
            </h1>
          )}
          {/* Tags overlay — view mode only */}
          {!isEditMode && tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Image management strip (edit mode only) ── */}
      {isEditMode && (
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
      )}

      {/* ── Page content ── */}
      <div className="px-4 sm:px-6 py-6">
        {isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load recipe. Make sure the API is running on port 5238.
          </div>
        )}

        {/* Recipe meta: link and notes */}
        {isEditMode ? (
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
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
        ) : (
          (recipe?.link || recipe?.notes || recipe?.cookTimeMinutes != null || recipe?.servings != null) && (
            <div className="mb-8">
              {(recipe?.cookTimeMinutes != null || recipe?.servings != null) && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {recipe.cookTimeMinutes != null && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      {recipe.cookTimeMinutes} min
                    </span>
                  )}
                  {recipe.servings != null && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      {recipe.servingsType === "Quantity" ? (
                        <Package className="h-4 w-4" />
                      ) : recipe.servingsType === "Pieces" ? (
                        <Layers className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      {recipe.servings} {recipe.servingsType === "Quantity" ? "items" : recipe.servingsType === "Pieces" ? "pieces" : "people"}
                    </span>
                  )}
                </div>
              )}
              {recipe?.link && isSafeUrl(recipe.link) && (
                <a
                  href={recipe.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm block mb-2"
                >
                  {getDisplayDomain(recipe.link)}
                </a>
              )}
              {recipe?.notes && (
                <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
                  {recipe.notes}
                </p>
              )}
            </div>
          )
        )}

        {/* ── Tags (edit mode only) ── */}
        {isEditMode && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
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
        )}

        {/* ── Ingredients ── */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Ingredients
          </h2>

          {ingredients && ingredients.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">
              {isEditMode ? "No ingredients yet. Add some below." : "No ingredients yet."}
            </p>
          )}

          {ingredients && ingredients.length > 0 && (
            <ul className="space-y-0.5">
              {isEditMode ? (
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
                      const edits = editingIngredients[id];
                      return (
                        <SortableIngredientItem
                          key={id}
                          id={id}
                          ingredient={ingredient}
                          edits={edits}
                          onFieldChange={handleIngredientFieldChange}
                          onSave={handleSaveIngredient}
                          onDelete={handleDeleteIngredient}
                          isSavePending={updateIngredient.isPending}
                          isDeletePending={deleteIngredient.isPending}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              ) : (
                ingredients.map((ingredient) => {
                  const id = ingredient.id ?? 0;
                  return (
                    <li key={id} className="flex items-center gap-1 py-1">
                      <span className="text-gray-800 dark:text-gray-200 text-sm">
                        {(() => {
                          const hasAmountOrUnit = ingredient.amount != null || !!ingredient.unit;
                          return hasAmountOrUnit ? (
                            <>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {ingredient.amount != null ? ingredient.amount : ""}{ingredient.unit ? ` ${ingredient.unit}` : ""}
                              </span>{" "}
                            </>
                          ) : null;
                        })()}
                        {ingredient.name}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          )}

          {isEditMode && (
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
          )}

          {/* Add to Shopping List dialog — triggered from header ⋮ menu */}
          <Dialog open={shoppingListDialogOpen} onOpenChange={setShoppingListDialogOpen}>
            <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add ingredients to shopping list</DialogTitle>
                  </DialogHeader>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Multiplier (scale ingredient quantities):
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
                        className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg disabled:opacity-50"
                        disabled={multiplier <= 1}
                        aria-label="Decrease multiplier"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{multiplier}</span>
                      <button
                        type="button"
                        onClick={() => setMultiplier((m) => m + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg"
                        aria-label="Increase multiplier"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select a shopping list to add all ingredients to:
                  </p>
                  <ul className="space-y-2">
                    {(shoppingLists ?? []).map((list) => (
                      <li key={list.id}>
                        <button
                          onClick={() => handleAddToShoppingList(list.id ?? 0)}
                          disabled={addToShoppingList.isPending}
                          className="w-full text-left px-4 py-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {list.name}
                        </button>
                      </li>
                    ))}
                  </ul>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Steps ── */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Steps
          </h2>

          {sortedSteps.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">
              {isEditMode ? "No steps yet. Add one below." : "No steps yet."}
            </p>
          )}

          {sortedSteps.length > 0 && (
            <ol className="space-y-3">
              {isEditMode ? (
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
              ) : (
                sortedSteps.map((step, index) => (
                  <li key={step.id} className="flex items-start gap-3">
                    <span className="shrink-0 text-sm font-semibold text-gray-300 dark:text-gray-600 w-5 text-right mt-0.5">
                      {index + 1}.
                    </span>
                    <span className="flex-1 min-w-0 text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                      {step.text}
                    </span>
                  </li>
                ))
              )}
            </ol>
          )}

          {isEditMode && (
            <form onSubmit={handleAddStep} className="mt-4">
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder="Step description..."
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <Button type="submit" size="icon" disabled={addStep.isPending} aria-label="Add step">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Add to Food Plan dialog ── */}
      {foodPlanDialogOpen && recipe && (
        <AddToFoodPlanDialog
          recipe={recipe}
          onClose={() => setFoodPlanDialogOpen(false)}
        />
      )}

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
