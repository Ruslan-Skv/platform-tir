type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeCompareLimitExceeded(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCompareLimitExceeded(): void {
  for (const listener of listeners) {
    listener();
  }
}
