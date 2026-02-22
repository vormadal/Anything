"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ShoppingList, ShoppingListItem } from "@/lib/api-client/models/index";

export function useShoppingLists() {
  return useQuery({
    queryKey: ["shoppingLists"],
    queryFn: () =>
      apiClient.api.shoppingLists.get() as Promise<ShoppingList[]>,
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (list: { name: string }) =>
      apiClient.api.shoppingLists.post({ name: list.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
  });
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.shoppingLists.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
  });
}

export function useCompleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.shoppingLists.byId(id).complete.post() as Promise<ShoppingList>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems"] });
    },
  });
}

export function useShoppingListItems(listId: number) {
  return useQuery({
    queryKey: ["shoppingListItems", listId],
    queryFn: () =>
      apiClient.api.shoppingLists.byId(listId).items.get() as Promise<ShoppingListItem[]>,
    enabled: listId > 0,
  });
}

export function useAddShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiClient.api.shoppingLists.byId(listId).items.post({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useUpdateShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, name, isChecked }: { itemId: number; name: string; isChecked: boolean }) =>
      apiClient.api.shoppingLists.byId(listId).items.byId(itemId).put({ name, isChecked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useRemoveShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) =>
      apiClient.api.shoppingLists.byId(listId).items.byId(itemId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}
