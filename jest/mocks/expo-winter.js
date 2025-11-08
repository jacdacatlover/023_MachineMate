// Minimal stub for Expo's winter polyfill to keep Jest environment lightweight.
if (!globalThis.__ExpoImportMetaRegistry) {
  const store = new Map();
  globalThis.__ExpoImportMetaRegistry = {
    has: key => store.has(key),
    get: key => store.get(key),
    set: (key, value) => store.set(key, value),
  };
}

module.exports = {};
