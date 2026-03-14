"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ShoppingList, ShoppingListItem } from "@/lib/api-client/models/index";

export function useCompletedShoppingLists() {
  return useQuery({
    queryKey: ["completedShoppingLists"],
    queryFn: () =>
      apiClient.api.shoppingLists.completed.get() as Promise<ShoppingList[]>,
  });
}

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

export function useUpdateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiClient.api.shoppingLists.byId(id).put({ name }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingList", id] });
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
      queryClient.invalidateQueries({ queryKey: ["completedShoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems"] });
    },
  });
}

export function useReorderShoppingLists() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.api.shoppingLists.reorder.put({ ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingLists"] });
      const previousLists = queryClient.getQueryData<ShoppingList[]>(["shoppingLists"]);
      queryClient.setQueryData<ShoppingList[]>(["shoppingLists"], (old) => {
        if (!old) return old;
        return ids.map((id) => old.find((l) => l.id === id)).filter(Boolean) as ShoppingList[];
      });
      return { previousLists };
    },
    onError: (_err, _ids, context) => {
      queryClient.setQueryData(["shoppingLists"], context?.previousLists);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
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
    mutationFn: ({ name, amount, unit }: { name: string; amount?: number | null; unit?: string | null }) =>
      apiClient.api.shoppingLists.byId(listId).items.post({ name, amount, unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useUpdateShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, name, isChecked, amount, unit }: { itemId: number; name: string; isChecked: boolean; amount?: number | null; unit?: string | null }) =>
      apiClient.api.shoppingLists.byId(listId).items.byId(itemId).put({ name, isChecked, amount, unit }),
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
