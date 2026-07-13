import type { Query } from "@tanstack/react-query";
import { shouldPersistQuery } from "@/lib/offline/persister";

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
