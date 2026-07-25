"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ShoppingList, ShoppingListResponse, ShoppingListItem, ShoppingListTemplateResponse } from "@/lib/api-client/models/index";
import { isOffline } from "@/hooks/useOnlineStatus";
import { isNetworkError } from "@/lib/offline/networkError";
import {
  createTempItemId,
  isTempItemId,
  enqueueAdd,
  enqueueUpdate,
  enqueueDelete,
  type UpdateItemPayload,
} from "@/lib/offline/outbox";

export function useShoppingLists(enabled = true) {
  return useQuery({
    queryKey: ["shoppingLists"],
    queryFn: () =>
      apiClient.api.checklists.get() as unknown as Promise<ShoppingListResponse[]>,
    enabled,
  });
}

export function useShoppingList(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["shoppingList", id],
    queryFn: () => apiClient.api.checklists.byId(id).get() as Promise<ShoppingList>,
    enabled: id > 0,
    // Seed from the already-cached shopping lists so navigating from the
    // list to a list the user just saw doesn't flash a bare loading state.
    placeholderData: (): ShoppingList | undefined => {
      const lists = queryClient.getQueryData<ShoppingListResponse[]>(["shoppingLists"]);
      const match = lists?.find((l) => l.id === id);
      return match
        ? { id: match.id, name: match.name, type: match.type, createdOn: match.createdOn }
        : undefined;
    },
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (list: { name: string; type?: number; isTemplate?: boolean }) =>
      apiClient.api.checklists.post({
        name: list.name,
        type: list.type ?? 1,
        isTemplate: list.isTemplate ?? false,
      }),
    onSuccess: (_, { isTemplate }) => {
      queryClient.invalidateQueries({
        queryKey: isTemplate ? ["shoppingListTemplates"] : ["shoppingLists"],
      });
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

export function useCopyItemsToTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemIds }: { id: number; templateId: number; itemIds: number[] }) =>
      apiClient.api.checklists.byId(id).copyItemsToTemplate.post({ itemIds }),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems", templateId] });
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
      // Templates are lists too — keep the template manager in sync on rename.
      queryClient.invalidateQueries({ queryKey: ["shoppingListTemplates"] });
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
      // Templates are lists too — keep the template manager in sync on delete.
      queryClient.invalidateQueries({ queryKey: ["shoppingListTemplates"] });
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

interface AddShoppingListItemInput {
  name: string;
  amount?: number | null;
  unit?: string | null;
}

interface AddShoppingListItemVariables extends AddShoppingListItemInput {
  clientId: number;
}

export function useAddShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (vars: AddShoppingListItemVariables): Promise<ShoppingListItem> => {
      const payload = { name: vars.name, amount: vars.amount ?? null, unit: vars.unit ?? null };
      const fallback: ShoppingListItem = {
        id: vars.clientId,
        ...payload,
        isChecked: false,
        shoppingListId: listId,
      };
      if (isOffline()) {
        await enqueueAdd(listId, vars.clientId, payload);
        return fallback;
      }
      try {
        const created = await apiClient.api.checklists.byId(listId).items.post(payload);
        return created ?? fallback;
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueueAdd(listId, vars.clientId, payload);
          return fallback;
        }
        throw err;
      }
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingListItems", listId] });
      const previousItems = queryClient.getQueryData<ShoppingListItem[]>(["shoppingListItems", listId]);
      queryClient.setQueryData<ShoppingListItem[]>(["shoppingListItems", listId], (old) => [
        ...(old ?? []),
        {
          id: vars.clientId,
          name: vars.name,
          amount: vars.amount ?? null,
          unit: vars.unit ?? null,
          isChecked: false,
          shoppingListId: listId,
        },
      ]);
      return { previousItems };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["shoppingListItems", listId], context?.previousItems);
    },
    onSuccess: (data, vars) => {
      // A real (server-assigned) id means this reached the server — swap the
      // optimistic temp item for the real one so ids line up before refetch.
      if ((data.id ?? 0) > 0) {
        queryClient.setQueryData<ShoppingListItem[]>(["shoppingListItems", listId], (old) =>
          old?.map((item) => (item.id === vars.clientId ? data : item))
        );
      }
    },
    onSettled: (data) => {
      if ((data?.id ?? 0) > 0) {
        queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
        queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
      }
    },
  });

  return {
    ...mutation,
    mutate: (input: AddShoppingListItemInput) =>
      mutation.mutate({ ...input, clientId: createTempItemId() }),
    mutateAsync: (input: AddShoppingListItemInput) =>
      mutation.mutateAsync({ ...input, clientId: createTempItemId() }),
  };
}

interface UpdateShoppingListItemVariables {
  itemId: number;
  name: string;
  isChecked: boolean;
  amount?: number | null;
  unit?: string | null;
}

export function useUpdateShoppingListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: UpdateShoppingListItemVariables): Promise<{ synced: boolean }> => {
      const payload: UpdateItemPayload = {
        name: vars.name,
        isChecked: vars.isChecked,
        amount: vars.amount ?? null,
        unit: vars.unit ?? null,
      };
      // A temp (negative) id means the server doesn't know about this item
      // yet — its "add" is still queued, so this update must queue too.
      if (isTempItemId(vars.itemId) || isOffline()) {
        await enqueueUpdate(listId, vars.itemId, payload);
        return { synced: false };
      }
      try {
        await apiClient.api.checklists.byId(listId).items.byItemId(vars.itemId).put(payload);
        return { synced: true };
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueueUpdate(listId, vars.itemId, payload);
          return { synced: false };
        }
        throw err;
      }
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingListItems", listId] });
      const previousItems = queryClient.getQueryData<ShoppingListItem[]>(["shoppingListItems", listId]);
      queryClient.setQueryData<ShoppingListItem[]>(["shoppingListItems", listId], (old) =>
        old?.map((item) =>
          item.id === vars.itemId
            ? {
                ...item,
                name: vars.name,
                isChecked: vars.isChecked,
                amount: vars.amount ?? null,
                unit: vars.unit ?? null,
              }
            : item
        )
      );
      return { previousItems };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["shoppingListItems", listId], context?.previousItems);
    },
    onSettled: (data) => {
      if (data?.synced) {
        queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
        queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
      }
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
    mutationFn: async (itemId: number): Promise<{ synced: boolean }> => {
      if (isTempItemId(itemId) || isOffline()) {
        await enqueueDelete(listId, itemId);
        return { synced: false };
      }
      try {
        await apiClient.api.checklists.byId(listId).items.byItemId(itemId).delete();
        return { synced: true };
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueueDelete(listId, itemId);
          return { synced: false };
        }
        throw err;
      }
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingListItems", listId] });
      const previousItems = queryClient.getQueryData<ShoppingListItem[]>(["shoppingListItems", listId]);
      queryClient.setQueryData<ShoppingListItem[]>(["shoppingListItems", listId], (old) =>
        old?.filter((item) => item.id !== itemId)
      );
      return { previousItems };
    },
    onError: (_err, _itemId, context) => {
      queryClient.setQueryData(["shoppingListItems", listId], context?.previousItems);
    },
    onSettled: (data) => {
      if (data?.synced) {
        queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
        queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
      }
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
