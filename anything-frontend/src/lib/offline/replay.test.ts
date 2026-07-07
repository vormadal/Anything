import { DefaultApiError } from "@microsoft/kiota-abstractions";
import { QueryClient } from "@tanstack/react-query";

const mockItemsPost = jest.fn();
const mockItemsItemPut = jest.fn();
const mockItemsItemDelete = jest.fn();
const mockItemsItemById: jest.Mock = jest.fn(() => ({ put: mockItemsItemPut, delete: mockItemsItemDelete }));
const mockItems = { post: mockItemsPost, byItemId: mockItemsItemById };
const mockById: jest.Mock = jest.fn(() => ({ items: mockItems }));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      checklists: {
        byId: (...args: unknown[]) => mockById(...args),
      },
    },
  },
  ApiError: jest.requireActual("@microsoft/kiota-abstractions").DefaultApiError,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

import { toast } from "sonner";
import {
  enqueueAdd,
  enqueueUpdate,
  enqueueDelete,
  getAllQueuedMutations,
  dequeueMutation,
  hydrateOutbox,
} from "@/lib/offline/outbox";
import { replayOutbox } from "@/lib/offline/replay";

function makeApiError(status: number): DefaultApiError {
  const err = new DefaultApiError("error");
  err.responseStatusCode = status;
  return err;
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

async function clearOutbox() {
  await hydrateOutbox();
  for (const mutation of getAllQueuedMutations()) {
    await dequeueMutation(mutation.id);
  }
}

describe("replayOutbox", () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    setOnline(true);
    await clearOutbox();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it("does nothing while offline", async () => {
    setOnline(false);
    await enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });

    await replayOutbox(queryClient);

    expect(mockItemsPost).not.toHaveBeenCalled();
    expect(getAllQueuedMutations()).toHaveLength(1);
  });

  it("replays a queued add and reconciles the temp id", async () => {
    await enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });
    mockItemsPost.mockResolvedValueOnce({
      id: 42,
      name: "Milk",
      amount: null,
      unit: null,
      isChecked: false,
      shoppingListId: 1,
    });

    await replayOutbox(queryClient);

    expect(mockItemsPost).toHaveBeenCalledWith({ name: "Milk", amount: null, unit: null });
    expect(getAllQueuedMutations()).toHaveLength(0);
  });

  it("processes same-list mutations in FIFO order, resolving temp ids before dependent updates", async () => {
    await enqueueAdd(1, -1, { name: "Milk", amount: null, unit: null });
    await enqueueUpdate(1, -1, { name: "Milk", isChecked: true, amount: null, unit: null });
    mockItemsPost.mockResolvedValueOnce({
      id: 42,
      name: "Milk",
      amount: null,
      unit: null,
      isChecked: false,
      shoppingListId: 1,
    });
    mockItemsItemPut.mockResolvedValueOnce(undefined);

    await replayOutbox(queryClient);

    expect(mockItemsItemById).toHaveBeenCalledWith(42);
    expect(mockItemsItemPut).toHaveBeenCalledWith({
      name: "Milk",
      isChecked: true,
      amount: null,
      unit: null,
    });
    expect(getAllQueuedMutations()).toHaveLength(0);
  });

  it("drops an update that 404s (item deleted server-side), toasts, and continues the list's queue", async () => {
    await enqueueUpdate(1, 42, { name: "Milk", isChecked: true, amount: null, unit: null });
    await enqueueDelete(1, 43);
    mockItemsItemPut.mockRejectedValueOnce(makeApiError(404));
    mockItemsItemDelete.mockResolvedValueOnce(undefined);

    await replayOutbox(queryClient);

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/removed elsewhere/i));
    expect(mockItemsItemDelete).toHaveBeenCalled();
    expect(getAllQueuedMutations()).toHaveLength(0);
  });

  it("treats a 404/410 on delete replay as already-correct and dequeues silently", async () => {
    await enqueueDelete(1, 42);
    mockItemsItemDelete.mockRejectedValueOnce(makeApiError(404));

    await replayOutbox(queryClient);

    expect(getAllQueuedMutations()).toHaveLength(0);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("stops processing a list's remaining queue on a generic failure and increments retries", async () => {
    await enqueueUpdate(1, 42, { name: "Milk", isChecked: true, amount: null, unit: null });
    await enqueueDelete(1, 43);
    mockItemsItemPut.mockRejectedValueOnce(new Error("network hiccup"));

    await replayOutbox(queryClient);

    const queued = getAllQueuedMutations();
    expect(queued).toHaveLength(2);
    expect(queued[0].retries).toBe(1);
    expect(mockItemsItemDelete).not.toHaveBeenCalled();
  });

  it("drops a mutation once it exceeds the max retry count", async () => {
    await enqueueUpdate(1, 42, { name: "Milk", isChecked: true, amount: null, unit: null });
    mockItemsItemPut.mockRejectedValue(new Error("still failing"));

    for (let i = 0; i < 5; i++) {
      await replayOutbox(queryClient);
    }

    expect(getAllQueuedMutations()).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/discarded/i));
  });

  it("stops without dequeuing on a 401 and surfaces a re-auth toast", async () => {
    await enqueueUpdate(1, 42, { name: "Milk", isChecked: true, amount: null, unit: null });
    mockItemsItemPut.mockRejectedValueOnce(makeApiError(401));

    await replayOutbox(queryClient);

    expect(getAllQueuedMutations()).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/signed out/i));
  });

  it("replays independent lists without one list's failure blocking another", async () => {
    await enqueueUpdate(1, 42, { name: "Milk", isChecked: true, amount: null, unit: null });
    await enqueueUpdate(2, 99, { name: "Nails", isChecked: true, amount: null, unit: null });
    mockItemsItemPut.mockImplementation((payload: { name: string }) => {
      if (payload.name === "Milk") return Promise.reject(new Error("boom"));
      return Promise.resolve(undefined);
    });

    await replayOutbox(queryClient);

    expect(getAllQueuedMutations()).toMatchObject([{ listId: 1, itemId: 42 }]);
  });
});
