"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ShoppingListResponse, ShoppingListItem } from "@/lib/api-client/models/index";

export function useShoppingLists() {
  return useQuery({
    queryKey: ["shoppingLists"],
    queryFn: () =>
      apiClient.api.shoppingLists.get() as unknown as Promise<ShoppingListResponse[]>,
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (list: { name: string; type?: number }) =>
      apiClient.api.shoppingLists.post({ name: list.name, type: list.type ?? 1 }),
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
    mutationFn: ({ id, markUnchecked }: { id: number; markUnchecked: boolean }) =>
      apiClient.api.shoppingLists.byId(id).complete.post({ markUnchecked }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingList", id] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", id] });
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
      const previousLists = queryClient.getQueryData<ShoppingListResponse[]>(["shoppingLists"]);
      queryClient.setQueryData<ShoppingListResponse[]>(["shoppingLists"], (old) => {
        if (!old) return old;
        return ids.map((id) => old.find((l) => l.id === id)).filter(Boolean) as ShoppingListResponse[];
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
      apiClient.api.shoppingLists.byId(listId).items.byItemId(itemId).put({ name, isChecked, amount, unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useRemoveShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) =>
      apiClient.api.shoppingLists.byId(listId).items.byItemId(itemId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useConvertShoppingListType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, type }: { id: number; type: number }) =>
      apiClient.api.shoppingLists.byId(id).type.put({ type }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingList", id] });
    },
  });
}
