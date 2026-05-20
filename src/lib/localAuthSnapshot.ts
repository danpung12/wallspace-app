import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

const AUTH_SNAPSHOT_KEY = 'withart:last-auth-snapshot';

export type LastAuthSnapshot = {
  userId: string;
  email?: string | null;
  nickname?: string | null;
  name?: string | null;
  userType?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  cachedAt: number;
};

type ProfileLike = {
  nickname?: string | null;
  name?: string | null;
  full_name?: string | null;
  user_type?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

export async function getLastAuthSnapshot(): Promise<LastAuthSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LastAuthSnapshot;
    if (!parsed?.userId || typeof parsed.cachedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLastAuthSnapshot(snapshot: LastAuthSnapshot): Promise<void> {
  await AsyncStorage.setItem(
    AUTH_SNAPSHOT_KEY,
    JSON.stringify({
      ...snapshot,
      cachedAt: snapshot.cachedAt || Date.now(),
    }),
  );
}

export async function saveAuthSnapshotFromUser(
  user: User | { id?: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
  profile?: ProfileLike | null,
): Promise<void> {
  if (!user?.id) return;

  const metadata = user.user_metadata ?? {};
  await saveLastAuthSnapshot({
    userId: user.id,
    email: user.email ?? null,
    nickname:
      profile?.nickname ??
      (metadata.nickname as string | undefined) ??
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      null,
    name:
      profile?.name ??
      profile?.full_name ??
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      null,
    userType: profile?.user_type ?? (metadata.user_type as string | undefined) ?? null,
    phone: profile?.phone ?? (metadata.phone as string | undefined) ?? null,
    avatarUrl: profile?.avatar_url ?? (metadata.avatar_url as string | undefined) ?? null,
    cachedAt: Date.now(),
  });
}

export async function clearLastAuthSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_SNAPSHOT_KEY);
}
