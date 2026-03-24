"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteShoppingList } from "@/hooks/useShoppingLists";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ShoppingList } from "@/lib/api-client/models/index";
import { apiClient } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Pencil, Trash2, MoreVertical, SquarePen, Check } from "lucide-react";
import { ShoppingListView } from "./ShoppingListView";
import { ShoppingListEditMode } from "./ShoppingListEditMode";

export default function ShoppingListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const [isEditMode, setIsEditMode] = useState(false);
  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const handleDeleteListRef = useRef<() => void>(() => undefined);
  const openEditNameDialogRef = useRef<() => void>(() => undefined);

  const { data: list } = useQuery({
    queryKey: ["shoppingList", listId],
    queryFn: () => apiClient.api.shoppingLists.byId(listId).get() as Promise<ShoppingList>,
    enabled: listId > 0,
  });

  const deleteList = useDeleteShoppingList();
  const isCompleted = !!list?.deletedOn;

  // No dependency array: keeps the closure fresh without adding unstable refs to the header effect deps
  useEffect(() => {
    handleDeleteListRef.current = async () => {
      try {
        await deleteList.mutateAsync(listId);
        toast.success("Shopping list deleted");
        router.push("/shopping-lists");
      } catch {
        toast.error("Failed to delete shopping list. Please try again.");
      }
    };
  });

  useEffect(() => {
    setLeftAction({ type: "back", href: "/shopping-lists" });
    setHeaderActions(
      isCompleted ? null : (
        <div className="flex items-center gap-1 ml-auto">
          {!isEditMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditMode(true)}
              aria-label="Edit list"
            >
              <Pencil className="h-5 w-5" />
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditNameDialogRef.current()}
                aria-label="Edit list name"
              >
                <SquarePen className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode(false)}
                aria-label="Done editing"
              >
                <Check className="h-5 w-5" />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      )
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [isEditMode, isCompleted, setHeaderActions, setLeftAction]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <PageTitle>{list?.name ?? "Shopping List"}</PageTitle>
      {isEditMode && !isCompleted ? (
        <ShoppingListEditMode
          listId={listId}
          list={list}
          openEditNameDialogRef={openEditNameDialogRef}
        />
      ) : (
        <ShoppingListView listId={listId} list={list} isCompleted={isCompleted} />
      )}
    </div>
  );
}
