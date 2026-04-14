export type CartAuthRequiredReason = 'add_product' | 'add_component' | 'add_service';

export class AuthRequiredForCartError extends Error {
  readonly reason: CartAuthRequiredReason;

  constructor(reason: CartAuthRequiredReason) {
    super('AUTH_REQUIRED_FOR_CART');
    this.name = 'AuthRequiredForCartError';
    this.reason = reason;
  }
}

export function isAuthRequiredForCartError(e: unknown): e is AuthRequiredForCartError {
  return e instanceof AuthRequiredForCartError;
}

type Listener = (reason: CartAuthRequiredReason) => void;

const listeners = new Set<Listener>();

export function subscribeCartAuthRequired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCartAuthRequired(reason: CartAuthRequiredReason): void {
  for (const listener of listeners) {
    listener(reason);
  }
}
