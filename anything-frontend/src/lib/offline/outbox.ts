import { get, set } from "idb-keyval";
import { HOUSEHOLD_ID_KEY } from "@/lib/apiClient";

const OUTBOX_KEY = "anything:outbox:v1";

// Maximum replay attempts for a single queued mutation before it is dropped.
export const MAX_OUTBOX_RETRIES = 5;

// Negative IDs are used as client-side placeholders for items created while
// offline. Real (server-assigned) IDs are always positive integers, so a
// negative ID can never collide with one. Seeding the counter from the
// current timestamp keeps IDs unique across page reloads within a session.
let tempIdSeed = -Date.now();

export function createTempItemId(): number {
  tempIdSeed -= 1;
  return tempIdSeed;
}

export function isTempItemId(id: number): boolean {
  return id < 0;
}

interface AddItemPayload {
  name: string;
  amount: number | null;
  unit: string | null;
}

export interface UpdateItemPayload {
  name: string;
  isChecked: boolean;
  amount: number | null;
  unit: string | null;
}

export type QueuedMutation =
  | {
      id: string;
      type: "add";
      listId: number;
      itemId: number;
      payload: AddItemPayload;
      createdAt: number;
      retries: number;
      householdId: string | null;
    }
  | {
      id: string;
      type: "update";
      listId: number;
      itemId: number;
      payload: UpdateItemPayload;
      createdAt: number;
      retries: number;
      householdId: string | null;
    }
  | {
      id: string;
      type: "delete";
      listId: number;
      itemId: number;
      createdAt: number;
      retries: number;
      householdId: string | null;
    };

let queue: QueuedMutation[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let version = 0;
const listSnapshotCache = new Map<number, { version: number; ids: number[] }>();
const listeners = new Set<() => void>();

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

async function persist(): Promise<void> {
  await set(OUTBOX_KEY, queue);
}

export function hydrateOutbox(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const stored = await get<QueuedMutation[]>(OUTBOX_KEY);
    queue = stored ?? [];
    hydrated = true;
    notify();
  })();
  return hydratePromise;
}

if (typeof window !== "undefined") {
  void hydrateOutbox();
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentHouseholdId(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(HOUSEHOLD_ID_KEY) : null;
}

function nextMutationId(): string {
  return `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function meta(): Pick<QueuedMutation, "id" | "createdAt" | "retries" | "householdId"> {
  return {
    id: nextMutationId(),
    createdAt: Date.now(),
    retries: 0,
    householdId: currentHouseholdId(),
  };
}

export async function enqueueAdd(
  listId: number,
  itemId: number,
  payload: AddItemPayload
): Promise<void> {
  queue = [...queue, { type: "add", listId, itemId, payload, ...meta() }];
  await persist();
  notify();
}

export async function enqueueUpdate(
  listId: number,
  itemId: number,
  payload: UpdateItemPayload
): Promise<void> {
  queue = [...queue, { type: "update", listId, itemId, payload, ...meta() }];
  await persist();
  notify();
}

export async function enqueueDelete(listId: number, itemId: number): Promise<void> {
  // Deleting an item that was itself added offline and never synced: drop the
  // queued "add" (and any queued "update"s for it) instead of round-tripping
  // a create-then-delete through the server once back online.
  if (isTempItemId(itemId)) {
    const hasUnsyncedAdd = queue.some(
      (m) => m.type === "add" && m.listId === listId && m.itemId === itemId
    );
    if (hasUnsyncedAdd) {
      queue = queue.filter((m) => !(m.listId === listId && m.itemId === itemId));
      await persist();
      notify();
      return;
    }
  }
  queue = [...queue, { type: "delete", listId, itemId, ...meta() }];
  await persist();
  notify();
}

export async function dequeueMutation(id: string): Promise<void> {
  queue = queue.filter((m) => m.id !== id);
  await persist();
  notify();
}

export async function incrementRetries(id: string): Promise<void> {
  queue = queue.map((m) => (m.id === id ? { ...m, retries: m.retries + 1 } : m));
  await persist();
  notify();
}

export async function reconcileTempId(
  listId: number,
  tempId: number,
  realId: number
): Promise<void> {
  queue = queue.map((m) =>
    m.listId === listId && m.itemId === tempId ? { ...m, itemId: realId } : m
  );
  await persist();
  notify();
}

export function getAllQueuedMutations(): QueuedMutation[] {
  return queue;
}

export function getQueueForList(listId: number): QueuedMutation[] {
  return queue.filter((m) => m.listId === listId);
}

// Cached per-list so repeated calls (e.g. from useSyncExternalStore) return a
// stable reference until the queue actually changes for that list.
export function getPendingItemIdsForList(listId: number): number[] {
  const cached = listSnapshotCache.get(listId);
  if (cached && cached.version === version) return cached.ids;
  const ids = Array.from(new Set(getQueueForList(listId).map((m) => m.itemId)));
  listSnapshotCache.set(listId, { version, ids });
  return ids;
}
