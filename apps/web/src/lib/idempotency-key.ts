import { useRef } from 'react';

// API_RULES §16: a key that persists across retries of the same action attempt (e.g. a
// client-side timeout followed by the user clicking again), regenerated only once that
// attempt actually succeeds — see api-client.ts's idempotentHeaders. Falls back to a
// timestamp+random string if crypto.randomUUID() isn't available.
function generateKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);

  const getKey = (): string => {
    if (!keyRef.current) {
      keyRef.current = generateKey();
    }
    return keyRef.current;
  };

  const resetKey = (): void => {
    keyRef.current = null;
  };

  return { getKey, resetKey };
}
