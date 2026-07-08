import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/apiClient";
import {
  getAllQueuedMutations,
  getQueueForList,
  dequeueMutation,
  hydrateOutbox,
  incrementRetries,
  reconcileTempId,
  isTempItemId,
  MAX_OUTBOX_RETRIES,
  type QueuedMutation,
} from "@/lib/offline/outbox";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

let replaying = false;

function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && (err.responseStatusCode === 404 || err.responseStatusCode === 410);
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.responseStatusCode === 401;
}

async function replayOne(
  listId: number,
  mutation: QueuedMutation,
  queryClient: QueryClient
): Promise<void> {
  if (mutation.type === "add") {
    const created = await apiClient.api.checklists.byId(listId).items.post(mutation.payload);
    if (created?.id != null) {
      await reconcileTempId(listId, mutation.itemId, created.id);
      queryClient.setQueryData<ShoppingListItem[]>(["shoppingListItems", listId], (old) =>
        old?.map((item) => (item.id === mutation.itemId ? created : item))
      );
    }
  } else if (mutation.type === "update") {
    if (isTempItemId(mutation.itemId)) {
      // The "add" this depends on hasn't resolved to a real id yet. This
      // shouldn't happen given strict per-list FIFO ordering, but if it does,
      // leave it queued and retry on the next replay pass rather than
      // sending a PUT against an id the server has never seen.
      throw new Error("update targets an unresolved temp id");
    }
    await apiClient.api.checklists.byId(listId).items.byItemId(mutation.itemId).put(mutation.payload);
  } else {
    try {
      await apiClient.api.checklists.byId(listId).items.byItemId(mutation.itemId).delete();
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
}

// Processes one list's queued mutations strictly in enqueue order — never
// reordered or parallelized within a list — so an "add" always resolves to a
// real id before a later same-list mutation referencing it is replayed. Each
// iteration re-reads the live queue (rather than an upfront snapshot) so a
// temp id reconciled mid-loop is visible to the next mutation immediately.
async function replayListQueue(
  listId: number,
  queryClient: QueryClient
): Promise<{ unauthorized: boolean; touched: boolean }> {
  let touched = false;

  for (;;) {
    const [mutation] = getQueueForList(listId);
    if (!mutation) break;

    try {
      await replayOne(listId, mutation, queryClient);
      await dequeueMutation(mutation.id);
      touched = true;
    } catch (err) {
      if (isUnauthorized(err)) {
        return { unauthorized: true, touched };
      }

      if (mutation.type === "update" && isNotFound(err)) {
        await dequeueMutation(mutation.id);
        touched = true;
        toast.error("An offline edit couldn't be saved because that item was removed elsewhere.");
        continue;
      }

      if (mutation.retries + 1 >= MAX_OUTBOX_RETRIES) {
        await dequeueMutation(mutation.id);
        touched = true;
        toast.error("Some offline changes couldn't be saved and were discarded.");
        continue;
      }

      await incrementRetries(mutation.id);
      toast.error("Some changes couldn't sync yet — we'll retry when you're back online.");
      break; // preserve ordering: stop this list's queue, retry later
    }
  }

  if (touched) {
    queryClient.invalidateQueries({ queryKey: ["shoppingListItems", listId] });
    queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
  }

  return { unauthorized: false, touched };
}

export async function replayOutbox(queryClient: QueryClient): Promise<void> {
  if (replaying) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  replaying = true;
  try {
    await hydrateOutbox();

    const listIds = Array.from(new Set(getAllQueuedMutations().map((m) => m.listId)));
    if (listIds.length === 0) return;

    const results = await Promise.all(
      listIds.map((listId) => replayListQueue(listId, queryClient))
    );

    if (results.some((r) => r.unauthorized)) {
      toast.error("You've been signed out — sign back in to sync your offline changes.");
    }
  } finally {
    replaying = false;
  }
}
