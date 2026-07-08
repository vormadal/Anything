// The Fetch spec guarantees a fetch() promise rejects with a TypeError when
// the request never reached a server (offline, DNS failure, connection
// refused, etc.) — as opposed to Kiota's ApiError, which is only constructed
// from an actual HTTP error response. This lets mutations detect "the
// browser thought it was online but the request failed anyway" and fall
// back to the offline queue instead of surfacing a hard error.
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}
