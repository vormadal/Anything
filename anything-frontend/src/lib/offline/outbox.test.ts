jest.mock("idb-keyval", () => {
  // Backed by globalThis so the fake store survives jest.resetModules() calls
  // between tests (module registry resets, but globalThis does not) — this is
  // what lets the "survives a rehydrate" test simulate a real page reload.
  const globalWithStore = globalThis as { __idbKeyvalStore?: Map<string, unknown> };
  globalWithStore.__idbKeyvalStore ??= new Map<string, unknown>();
  const store = globalWithStore.__idbKeyvalStore;
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key))),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

jest.mock("@/lib/apiClient", () => ({
  HOUSEHOLD_ID_KEY: "householdId",
}));

type OutboxModule = typeof import("@/lib/offline/outbox");

describe("offline outbox", () => {
  let outbox: OutboxModule;

  beforeEach(async () => {
    jest.resetModules();
    localStorage.clear();
    (globalThis as { __idbKeyvalStore?: Map<string, unknown> }).__idbKeyvalStore?.clear();
    outbox = await import("@/lib/offline/outbox");
    await outbox.hydrateOutbox();
  });

  it("creates unique negative temp item ids", () => {
    const a = outbox.createTempItemId();
    const b = outbox.createTempItemId();
    expect(a).toBeLessThan(0);
    expect(b).toBeLessThan(0);
    expect(a).not.toBe(b);
    expect(outbox.isTempItemId(a)).toBe(true);
    expect(outbox.isTempItemId(1)).toBe(false);
  });

  it("enqueues and persists an add mutation", async () => {
    const tempId = outbox.createTempItemId();
    await outbox.enqueueAdd(1, tempId, { name: "Milk", amount: 2, unit: "L" });

    const queued = outbox.getQueueForList(1);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ type: "add", listId: 1, itemId: tempId });
  });

  it("orders queued mutations by enqueue order (FIFO) within a list", async () => {
    await outbox.enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });
    await outbox.enqueueAdd(1, -2, { name: "Bread", amount: null, unit: null });
    await outbox.enqueueDelete(1, 99); // a previously synced item, unrelated to the queued adds

    const queued = outbox.getQueueForList(1);
    expect(queued.map((m) => m.type)).toEqual(["add", "add", "delete"]);
  });

  it("reconciles a temp id to a real id across all queued mutations referencing it", async () => {
    const tempId = outbox.createTempItemId();
    await outbox.enqueueAdd(1, tempId, { name: "Milk", amount: null, unit: null });
    await outbox.enqueueUpdate(1, tempId, {
      name: "Milk",
      isChecked: true,
      amount: null,
      unit: null,
    });

    await outbox.reconcileTempId(1, tempId, 42);

    const queued = outbox.getQueueForList(1);
    expect(queued.every((m) => m.itemId === 42)).toBe(true);
  });

  it("dequeues a mutation by id", async () => {
    await outbox.enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });
    const [entry] = outbox.getQueueForList(1);

    await outbox.dequeueMutation(entry.id);

    expect(outbox.getQueueForList(1)).toHaveLength(0);
  });

  it("increments retries for a mutation", async () => {
    await outbox.enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });
    const [entry] = outbox.getQueueForList(1);

    await outbox.incrementRetries(entry.id);

    expect(outbox.getQueueForList(1)[0].retries).toBe(1);
  });

  it("returns a stable pending-ids snapshot until the queue changes", async () => {
    await outbox.enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });
    const first = outbox.getPendingItemIdsForList(1);
    const second = outbox.getPendingItemIdsForList(1);
    expect(first).toBe(second);

    await outbox.enqueueAdd(1, -2, { name: "Bread", amount: null, unit: null });
    const third = outbox.getPendingItemIdsForList(1);
    expect(third).not.toBe(first);
    expect(third).toEqual(expect.arrayContaining([-1, -2]));
  });

  it("cancels a queued add (and any queued update) when the same unsynced item is deleted", async () => {
    const tempId = outbox.createTempItemId();
    await outbox.enqueueAdd(1, tempId, { name: "Milk", amount: null, unit: null });
    await outbox.enqueueUpdate(1, tempId, {
      name: "Milk",
      isChecked: true,
      amount: null,
      unit: null,
    });

    await outbox.enqueueDelete(1, tempId);

    expect(outbox.getQueueForList(1)).toHaveLength(0);
  });

  it("queues a real delete for a synced item rather than cancelling it", async () => {
    await outbox.enqueueDelete(1, 42);

    const queued = outbox.getQueueForList(1);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ type: "delete", listId: 1, itemId: 42 });
  });

  it("snapshots the household id from localStorage at enqueue time", async () => {
    localStorage.setItem("householdId", "household-123");
    await outbox.enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });

    expect(outbox.getQueueForList(1)[0].householdId).toBe("household-123");
  });

  it("persists the queue via idb-keyval so it survives a rehydrate", async () => {
    await outbox.enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });

    jest.resetModules();
    const reloaded: OutboxModule = await import("@/lib/offline/outbox");
    await reloaded.hydrateOutbox();

    expect(reloaded.getQueueForList(1)).toHaveLength(1);
  });
});
