"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteShoppingList, useConvertShoppingListType } from "@/hooks/useShoppingLists";
import { useEditListNameDialog } from "@/hooks/useEditListNameDialog";
import { EditListNameDialog } from "@/components/EditListNameDialog";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ShoppingList } from "@/lib/api-client/models/index";
import { apiClient } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { LayoutList, Trash2, MoreVertical, SquarePen, ShoppingCart, ListChecks } from "lucide-react";
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

  const handleDeleteListRef = useRef<() => void>(() => undefined);
  const handleConvertTypeRef = useRef<() => Promise<void>>(async () => {});
  const openEditNameDialogRef = useRef<() => void>(() => undefined);

  const { data: list } = useQuery({
    queryKey: ["shoppingList", listId],
    queryFn: () => apiClient.api.shoppingLists.byId(listId).get() as Promise<ShoppingList>,
    enabled: listId > 0,
  });

  const deleteList = useDeleteShoppingList();
  const convertType = useConvertShoppingListType();
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
        toast.success(`Converted to ${isGeneral ? "Shopping List" : "Checklist"}`);
      } catch {
        toast.error("Failed to convert list type. Please try again.");
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
            <DropdownMenuItem onSelect={() => handleConvertTypeRef.current()}>
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
  }, [isEditMode, isGeneral, listId, setHeaderActions, setLeftAction]);

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
      <PageTitle>{list?.name ?? "List"}</PageTitle>
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
