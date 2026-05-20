import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

const USER_CACHE_TTL_MS = 60_000;

let cachedUser: { value: User | null; expiresAt: number } | null = null;
let userRequest: Promise<User | null> | null = null;

export async function getCurrentUserCached(options?: { force?: boolean }): Promise<User | null> {
  const now = Date.now();

  if (!options?.force && cachedUser && cachedUser.expiresAt > now) {
    return cachedUser.value;
  }

  if (!options?.force && userRequest) {
    return userRequest;
  }

  userRequest = supabase.auth
    .getUser()
    .then(({ data }) => {
      const user = data.user ?? null;
      cachedUser = { value: user, expiresAt: Date.now() + USER_CACHE_TTL_MS };
      return user;
    })
    .finally(() => {
      userRequest = null;
    });

  return userRequest;
}

export function primeCurrentUserCache(user: User | null): void {
  cachedUser = { value: user, expiresAt: Date.now() + USER_CACHE_TTL_MS };
}

export function clearCurrentUserCache(): void {
  cachedUser = null;
  userRequest = null;
}

supabase.auth.onAuthStateChange((_event, session) => {
  primeCurrentUserCache(session?.user ?? null);
});
