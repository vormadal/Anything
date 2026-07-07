// Automatic manual mock for the `idb-keyval` package: jsdom (used by Jest)
// has no IndexedDB implementation, so any module that touches idb-keyval
// (e.g. src/lib/offline/outbox.ts, persister.ts) would throw
// "ReferenceError: indexedDB is not defined" in every test that imports it
// transitively, not just tests that exercise offline behavior directly.
// Placing this file at __mocks__/idb-keyval.ts (adjacent to node_modules)
// makes Jest apply it to every test automatically, no per-file jest.mock()
// needed. Tests that want isolated/resettable storage still call
// jest.mock("idb-keyval", ...) locally, which takes precedence over this file.
const store = new Map<string, unknown>();

export async function get<T>(key: string): Promise<T | undefined> {
  return store.get(key) as T | undefined;
}

export async function set(key: string, value: unknown): Promise<void> {
  store.set(key, value);
}

export async function del(key: string): Promise<void> {
  store.delete(key);
}
