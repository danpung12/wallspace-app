import { getCurrentUserCached } from '../authCache';
import { supabase } from '../supabase';
import {
  clearCachedRequestPrefix,
  getCachedRequest,
} from '../requestCache';

const PROFILE_TTL_MS = 60_000;

export type NativeProfile = {
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  email: string | null;
  phone: string | null;
};

export type ProfileUserTypeRow = {
  user_type: string | null;
};

export async function getProfileUserTypeRow(
  userId: string,
  options?: { force?: boolean },
): Promise<ProfileUserTypeRow | null> {
  if (!userId) return null;

  return getCachedRequest(`profile:user-type:${userId}`, PROFILE_TTL_MS, async () => {
    const result = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    return result.data ?? null;
  }, options);
}

export async function getNativeProfile(options?: { force?: boolean }): Promise<NativeProfile | null> {
  const user = await getCurrentUserCached(options);
  if (!user) return null;

  const data = await getCachedRequest(`profile:${user.id}`, PROFILE_TTL_MS, async () => {
    const result = await supabase
      .from('profiles')
      .select('nickname, name, avatar_url, user_type, phone')
      .eq('id', user.id)
      .single();

    return result.data ?? null;
  }, options);

  return {
    nickname: data?.nickname ?? null,
    name: data?.name ?? null,
    avatar_url: data?.avatar_url ?? null,
    user_type: data?.user_type ?? null,
    email: user.email ?? null,
    phone: data?.phone ?? null,
  };
}

export function clearProfileCache(userId?: string): void {
  if (userId) {
    clearCachedRequestPrefix(`profile:${userId}`);
    clearCachedRequestPrefix(`profile:user-type:${userId}`);
    return;
  }
  clearCachedRequestPrefix('profile:');
}
