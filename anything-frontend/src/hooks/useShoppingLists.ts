"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ShoppingListResponse, ShoppingListItem, ShoppingListTemplateResponse } from "@/lib/api-client/models/index";

export function useShoppingLists() {
  return useQuery({
    queryKey: ["shoppingLists"],
    queryFn: () =>
      apiClient.api.checklists.get() as unknown as Promise<ShoppingListResponse[]>,
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (list: { name: string; type?: number }) =>
      apiClient.api.checklists.post({ name: list.name, type: list.type ?? 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
  });
}

export function useShoppingListTemplates(enabled = true) {
  return useQuery({
    queryKey: ["shoppingListTemplates"],
    queryFn: () =>
      apiClient.api.checklists.templates.get() as unknown as Promise<ShoppingListTemplateResponse[]>,
    enabled,
  });
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: number; name?: string | null }) =>
      apiClient.api.checklists.fromTemplate.post({ templateId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
  });
}

export function useSaveAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name?: string | null }) =>
      apiClient.api.checklists.byId(id).saveAsTemplate.post({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListTemplates"] });
    },
  });
}

export function useUpdateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiClient.api.checklists.byId(id).put({ name }),
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
      apiClient.api.checklists.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
  });
}

export function useCompleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, markUnchecked }: { id: number; markUnchecked: boolean }) =>
      apiClient.api.checklists.byId(id).complete.post({ markUnchecked }),
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
      apiClient.api.checklists.reorder.put({ ids }),
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
      apiClient.api.checklists.byId(listId).items.get() as Promise<ShoppingListItem[]>,
    enabled: listId > 0,
  });
}

export function useAddShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, amount, unit }: { name: string; amount?: number | null; unit?: string | null }) =>
      apiClient.api.checklists.byId(listId).items.post({ name, amount, unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useUpdateShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, name, isChecked, amount, unit }: { itemId: number; name: string; isChecked: boolean; amount?: number | null; unit?: string | null }) =>
      apiClient.api.checklists.byId(listId).items.byItemId(itemId).put({ name, isChecked, amount, unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useReorderShoppingListItems(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.api.checklists.byId(listId).items.reorder.put({ ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingListItems", listId] });
      const previousItems = queryClient.getQueryData<ShoppingListItem[]>(["shoppingListItems", listId]);
      queryClient.setQueryData<ShoppingListItem[]>(["shoppingListItems", listId], (old) => {
        if (!old) return old;
        return ids.map((id) => old.find((i) => i.id === id)).filter(Boolean) as ShoppingListItem[];
      });
      return { previousItems };
    },
    onError: (_err, _ids, context) => {
      queryClient.setQueryData(["shoppingListItems", listId], context?.previousItems);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useRemoveShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) =>
      apiClient.api.checklists.byId(listId).items.byItemId(itemId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    },
  });
}

export function useConvertShoppingListType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, type }: { id: number; type: number }) =>
      apiClient.api.checklists.byId(id).type.put({ type }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingList", id] });
    },
  });
}
