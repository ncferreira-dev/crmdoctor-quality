import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextStore {
  usuarioId?: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export function runWith<T>(store: RequestContextStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function getUsuarioAtualId(): string | undefined {
  return storage.getStore()?.usuarioId;
}
