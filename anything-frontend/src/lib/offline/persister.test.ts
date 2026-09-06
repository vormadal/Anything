import type { Query } from "@tanstack/react-query";
import {
  shouldPersistQuery,
  serializeOfflineCache,
  deserializeOfflineCache,
} from "@/lib/offline/persister";

function makeQuery(queryKey: unknown[]): Query {
  return { queryKey } as unknown as Query;
}

describe("shouldPersistQuery", () => {
  it("persists query keys by default", () => {
    expect(shouldPersistQuery(makeQuery(["households"]))).toBe(true);
    expect(shouldPersistQuery(makeQuery(["recipes", "search", "tag"]))).toBe(true);
    expect(shouldPersistQuery(makeQuery(["shoppingLists"]))).toBe(true);
  });

  it("excludes auth-prefixed query keys", () => {
    expect(shouldPersistQuery(makeQuery(["auth", "user"]))).toBe(false);
    expect(shouldPersistQuery(makeQuery(["auth", "invites"]))).toBe(false);
    expect(shouldPersistQuery(makeQuery(["auth", "invites", "me"]))).toBe(false);
  });

  it("persists a non-string first query key element", () => {
    expect(shouldPersistQuery(makeQuery([123]))).toBe(true);
  });
});

// Regression coverage for a bug where restoring the offline cache handed
// components a plain ISO string for every `Date` field (e.g. `modifiedOn`)
// instead of a `Date` instance, so `sortMostRecentlyCheckedFirst`'s
// `item.modifiedOn?.getTime()` threw "getTime is not a function" the moment a
// persisted, rehydrated cache reached it. Every other test in the app
// constructs items with real `Date` objects directly, so nothing exercised
// this JSON round-trip — that's why CI never caught it.
describe("serializeOfflineCache / deserializeOfflineCache", () => {
  it("restores Date fields as real Date instances, nested inside objects and arrays", () => {
    const modifiedOn = new Date("2024-01-02T03:04:05.000Z");
    const original = {
      items: [
        { id: 1, modifiedOn, name: "Milk" },
        { id: 2, modifiedOn: null, name: "Eggs" },
      ],
    };

    const restored = deserializeOfflineCache<typeof original>(serializeOfflineCache(original));

    expect(restored.items[0].modifiedOn).toBeInstanceOf(Date);
    expect((restored.items[0].modifiedOn as Date).getTime()).toBe(modifiedOn.getTime());
    expect(restored.items[1].modifiedOn).toBeNull();
  });

  it("leaves an ISO-looking plain string alone (only real Date instances get restored)", () => {
    const original = { note: "2024-01-02T03:04:05.000Z" };

    const restored = deserializeOfflineCache<typeof original>(serializeOfflineCache(original));

    expect(typeof restored.note).toBe("string");
    expect(restored.note).toBe(original.note);
  });

  it("round-trips primitives, null and undefined untouched", () => {
    const original = { count: 3, label: "x", ok: true, missing: null };

    const restored = deserializeOfflineCache<typeof original>(serializeOfflineCache(original));

    expect(restored).toEqual(original);
  });
});
