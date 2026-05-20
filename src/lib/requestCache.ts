type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function getCachedRequest<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options?: { force?: boolean },
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (!options?.force && cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (!options?.force && inFlight) {
    return inFlight;
  }

  const request = loader()
    .then((value) => {
      memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}

export function setCachedRequest<T>(key: string, value: T, ttlMs: number): void {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCachedRequest(key: string): void {
  memoryCache.delete(key);
  inFlightRequests.delete(key);
}

export function clearCachedRequestPrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  for (const key of inFlightRequests.keys()) {
    if (key.startsWith(prefix)) inFlightRequests.delete(key);
  }
}

export function clearAllCachedRequests(): void {
  memoryCache.clear();
  inFlightRequests.clear();
}
