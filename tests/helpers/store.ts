import { MemoryBackend } from "@/lib/prep/store/backend";
import { Store } from "@/lib/prep/store";

/** A fresh in-memory store with every tab created. Writes run the Apps Script's own logic. */
export async function createTestStore(): Promise<Store> {
  const store = new Store(new MemoryBackend());
  await store.setup();
  return store;
}
