const store = new Map<string, string>();

const AsyncStorage = {
  setItem: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),

  getItem: jest.fn(async (key: string) => {
    return store.has(key) ? store.get(key)! : null;
  }),

  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
  }),

  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      store.set(key, value);
    });
  }),

  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => store.delete(key));
  }),

  clear: jest.fn(async () => {
    store.clear();
  }),
};

export default AsyncStorage;