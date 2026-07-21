"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteShoppingList, useConvertShoppingListType, useSaveAsTemplate, useShoppingListTemplates, useShoppingList } from "@/hooks/useShoppingLists";
import { useEditListNameDialog } from "@/hooks/useEditListNameDialog";
import { EditListNameDialog } from "@/components/EditListNameDialog";
import { AddItemsToTemplateDialog } from "@/components/AddItemsToTemplateDialog";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { LayoutList, Trash2, MoreVertical, SquarePen, ShoppingCart, ListChecks, LayoutTemplate, PackagePlus } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ShoppingListView } from "@/app/shopping-lists/[id]/ShoppingListView";
import { ShoppingListEditMode } from "@/app/shopping-lists/[id]/ShoppingListEditMode";
import { GeneralChecklistView } from "./GeneralChecklistView";
import { GeneralChecklistEditMode } from "./GeneralChecklistEditMode";

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit") === "true";
  const [isEditMode, setIsEditMode] = useState(editParam);

  useEffect(() => {
    setIsEditMode(editParam);
  }, [editParam]);
  const { setHeaderActions, setLeftAction } = useHeaderActions();
  const isOnline = useOnlineStatus();

  const handleDeleteListRef = useRef<() => void>(() => undefined);
  const handleConvertTypeRef = useRef<() => Promise<void>>(async () => {});
  const handleSaveAsTemplateRef = useRef<() => void>(() => undefined);
  const openEditNameDialogRef = useRef<() => void>(() => undefined);
  const [showAddToTemplateDialog, setShowAddToTemplateDialog] = useState(false);

  const { data: list } = useShoppingList(listId);

  const deleteList = useDeleteShoppingList();
  const convertType = useConvertShoppingListType();
  const saveAsTemplate = useSaveAsTemplate();
  const { data: templates } = useShoppingListTemplates(!!list?.sourceTemplateId);
  const sourceTemplate = list?.sourceTemplateId
    ? templates?.find((t) => t.id === list.sourceTemplateId)
    : undefined;
  const editNameDialog = useEditListNameDialog(listId, list?.name, openEditNameDialogRef);

  const isGeneral = list?.type === 0;

  useEffect(() => {
    handleDeleteListRef.current = async () => {
      try {
        await deleteList.mutateAsync(listId);
        toast.success("List deleted");
        router.push("/lists");
      } catch {
        toast.error("Failed to delete list. Please try again.");
      }
    };
  }, [deleteList, listId, router]);

  // No dependency array: keeps the closure fresh without adding unstable refs to the header effect deps
  useEffect(() => {
    handleConvertTypeRef.current = async () => {
      try {
        await convertType.mutateAsync({ id: listId, type: isGeneral ? 1 : 0 });
      } catch {
        toast.error("Failed to convert list type. Please try again.");
      }
    };
    handleSaveAsTemplateRef.current = async () => {
      try {
        await saveAsTemplate.mutateAsync({ id: listId });
        toast.success("Saved as template");
      } catch {
        toast.error("Failed to save as template. Please try again.");
      }
    };
  });

  useEffect(() => {
    setLeftAction({ type: "back", href: "/lists" });
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        {!isEditMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsEditMode(true); router.push("?edit=true"); }}
            aria-label="Edit list"
          >
            <LayoutList className="h-5 w-5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openEditNameDialogRef.current()}>
              <SquarePen className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isOnline}
              onSelect={() => handleConvertTypeRef.current()}
            >
              {isGeneral ? (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Convert to Shopping List
                </>
              ) : (
                <>
                  <ListChecks className="h-4 w-4" />
                  Convert to Checklist
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isOnline}
              onSelect={() => handleSaveAsTemplateRef.current()}
            >
              <LayoutTemplate className="h-4 w-4" />
              Save as template
            </DropdownMenuItem>
            {sourceTemplate && (
              <DropdownMenuItem
                disabled={!isOnline}
                onSelect={() => setShowAddToTemplateDialog(true)}
              >
                <PackagePlus className="h-4 w-4" />
                Add items to template
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
              onSelect={() => handleDeleteListRef.current()}
            >
              <Trash2 className="h-4 w-4" />
              Delete list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, isGeneral, isOnline, listId, !!sourceTemplate, setHeaderActions, setLeftAction]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <EditListNameDialog
        open={editNameDialog.open}
        onOpenChange={editNameDialog.setOpen}
        value={editNameDialog.value}
        onChange={editNameDialog.setValue}
        onSave={editNameDialog.handleSave}
        isPending={editNameDialog.isPending}
        inputRef={editNameDialog.inputRef}
      />
      {sourceTemplate && showAddToTemplateDialog && (
        <AddItemsToTemplateDialog
          open={showAddToTemplateDialog}
          onOpenChange={setShowAddToTemplateDialog}
          listId={listId}
          templateId={sourceTemplate.id ?? 0}
          templateName={sourceTemplate.name ?? ""}
        />
      )}
      <PageTitle>{list?.name ?? "List"}</PageTitle>
      {sourceTemplate && (
        <div className="-mt-2 mb-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span>From template: {sourceTemplate.name}</span>
        </div>
      )}
      {isEditMode ? (
        isGeneral ? (
          <GeneralChecklistEditMode listId={listId} />
        ) : (
          <ShoppingListEditMode listId={listId} />
        )
      ) : (
        isGeneral ? (
          <GeneralChecklistView listId={listId} />
        ) : (
          <ShoppingListView listId={listId} />
        )
      )}
    </div>
  );
}
