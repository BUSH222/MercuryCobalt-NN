/**
 * A minimal redux-persist storage engine backed by `window.localStorage`,
 * functionally identical to `redux-persist/lib/storage`'s own
 * `createWebStorage('local')` (Promise-wrapped get/set/remove). Written by
 * hand instead of importing that subpath because Vite 8's Rolldown-based dep
 * optimizer mis-transforms its CommonJS-to-ESM interop for this particular
 * module — `export default require_storage();` resolves to `undefined` at
 * runtime (the wrapped factory mutates its own `exports` object rather than
 * returning it), throwing "storage.getItem is not a function" as soon as
 * redux-persist tries to use it. Same effective behaviour, no broken import.
 */
export interface PersistStorageEngine {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const localStorageEngine: PersistStorageEngine = {
  getItem(key) {
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export default localStorageEngine;
