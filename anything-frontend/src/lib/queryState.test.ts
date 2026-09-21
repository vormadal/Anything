import { loadFailure, type LoadableQuery } from "./queryState";

function query(overrides: Partial<LoadableQuery> = {}): LoadableQuery {
  return {
    isError: false,
    isPaused: false,
    isFetching: false,
    data: undefined,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("loadFailure", () => {
  it("is not a failure while a query is simply pending", () => {
    expect(loadFailure(query({ isFetching: true })).failed).toBe(false);
  });

  it("is not a failure when the query succeeded with an empty collection", () => {
    expect(loadFailure(query({ data: [] })).failed).toBe(false);
  });

  it("is a failure when the query errored with nothing to show", () => {
    expect(loadFailure(query({ isError: true })).failed).toBe(true);
  });

  it("is a failure when the query never ran because the browser is offline", () => {
    // React Query's default networkMode pauses instead of erroring, which is
    // neither loading nor an empty result — the state this helper exists for.
    expect(loadFailure(query({ isPaused: true })).failed).toBe(true);
  });

  it("prefers stale cached data over an error", () => {
    expect(loadFailure(query({ isError: true, data: [{ id: 1 }] })).failed).toBe(false);
  });

  it("fails when any one of several queries failed", () => {
    expect(loadFailure(query({ data: [] }), query({ isError: true })).failed).toBe(true);
  });

  it("retries every query it was given", () => {
    const first = query({ isError: true });
    const second = query({ isError: true });

    loadFailure(first, second).retry();

    expect(first.refetch).toHaveBeenCalledTimes(1);
    expect(second.refetch).toHaveBeenCalledTimes(1);
  });

  it("reports retrying while any query is fetching", () => {
    expect(loadFailure(query({ isError: true }), query({ isFetching: true })).isRetrying).toBe(true);
  });
});
