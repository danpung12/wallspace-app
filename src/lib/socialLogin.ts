import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearCurrentUserCache } from './authCache';
import { clearAllCachedRequests } from './requestCache';
import { clearLastAuthSnapshot, saveAuthSnapshotFromUser } from './localAuthSnapshot';

type SocialProvider = 'google' | 'kakao' | 'naver';

interface SocialLoginResult {
  success: boolean;
  provider?: SocialProvider;
  error?: string;
}

const BASE_WEB_URL = 'https://withart.vercel.app';
const APP_CALLBACK_PATH = 'login/social-only';
const CANCELLED_LOGIN_MESSAGE = '로그인이 취소되었습니다.';
const TOKEN_MISSING_MESSAGE = '인증 토큰을 받지 못했습니다.';

function getSessionExpiresAtMs(expiresAt?: number | null): number {
  if (!expiresAt) return Date.now() + 3600 * 1000;
  if (expiresAt > 1_000_000_000_000) return expiresAt;
  if (expiresAt > 1_000_000_000) return expiresAt * 1000;
  return Date.now() + 3600 * 1000;
}

async function saveSession(session: Session): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('accessToken', session.access_token),
    SecureStore.setItemAsync('refreshToken', session.refresh_token ?? ''),
    SecureStore.setItemAsync('tokenExpiresAt', String(getSessionExpiresAtMs(session.expires_at))),
    session.user?.id
      ? SecureStore.setItemAsync('userId', session.user.id)
      : Promise.resolve(),
    saveAuthSnapshotFromUser(session.user),
  ]);
}

function getProviderScopes(provider: Exclude<SocialProvider, 'naver'>): string {
  return provider === 'google'
    ? 'email profile'
    : 'account_email profile_nickname profile_image';
}

function parseAuthUrl(url?: string | null): {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
} {
  if (!url) return {};

  const hashIndex = url.indexOf('#');
  const hashParams = hashIndex >= 0 ? new URLSearchParams(url.substring(hashIndex + 1)) : null;
  const parsed = new URL(url);
  const queryParams = parsed.searchParams;

  return {
    accessToken: hashParams?.get('access_token') ?? queryParams.get('access_token') ?? undefined,
    refreshToken: hashParams?.get('refresh_token') ?? queryParams.get('refresh_token') ?? undefined,
    error:
      hashParams?.get('error_description') ??
      hashParams?.get('error') ??
      queryParams.get('error_description') ??
      queryParams.get('error') ??
      undefined,
  };
}

async function completeLoginFromUrl(url?: string | null): Promise<boolean> {
  const { accessToken, refreshToken, error } = parseAuthUrl(url);
  if (error) throw new Error(error);
  if (!accessToken) return false;

  const { data, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (sessionError) throw new Error(sessionError.message);
  if (!data.session) return false;

  await saveSession(data.session);
  return true;
}

async function completeLoginFromCurrentSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return false;
  await saveSession(data.session);
  return true;
}

async function openAuthAndComplete(
  authUrl: string,
  provider: SocialProvider,
  callbackUrl?: string,
): Promise<SocialLoginResult> {
  let callbackUrlFromEvent: string | null = null;
  const subscription = Linking.addEventListener('url', (event) => {
    callbackUrlFromEvent = event?.url ?? null;
  });

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl) as any;
    if (result.type === 'cancel') {
      return { success: false, error: CANCELLED_LOGIN_MESSAGE };
    }

    const candidateUrls = [result?.url, callbackUrlFromEvent].filter(Boolean) as string[];
    for (const url of candidateUrls) {
      if (await completeLoginFromUrl(url)) {
        return { success: true, provider };
      }
    }

    if (result.type === 'dismiss' && callbackUrlFromEvent) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (await completeLoginFromUrl(callbackUrlFromEvent)) {
        return { success: true, provider };
      }
    }

    if (await completeLoginFromCurrentSession()) {
      return { success: true, provider };
    }

    return { success: false, error: TOKEN_MISSING_MESSAGE };
  } catch (error: any) {
    return { success: false, error: error?.message ?? '로그인 중 오류가 발생했습니다.' };
  } finally {
    subscription.remove();
  }
}

async function handleGoogleKakaoLogin(
  provider: Exclude<SocialProvider, 'naver'>,
): Promise<SocialLoginResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: Linking.createURL(APP_CALLBACK_PATH),
      skipBrowserRedirect: true,
      scopes: getProviderScopes(provider),
    },
  });

  if (error) return { success: false, error: error.message };
  if (!data.url) return { success: false, error: 'OAuth URL 생성에 실패했습니다.' };

  return openAuthAndComplete(data.url, provider);
}

async function handleNaverLogin(): Promise<SocialLoginResult> {
  const callbackUrl = Linking.createURL(APP_CALLBACK_PATH);
  const bridgeUrl = `${BASE_WEB_URL}/auth/callback/naver?fromApp=1&appCallback=${encodeURIComponent(callbackUrl)}`;
  return openAuthAndComplete(bridgeUrl, 'naver', callbackUrl);
}

export async function handleSocialLogin(provider: SocialProvider): Promise<SocialLoginResult> {
  return provider === 'naver'
    ? handleNaverLogin()
    : handleGoogleKakaoLogin(provider);
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function signOut() {
  clearCurrentUserCache();
  clearAllCachedRequests();
  await clearLastAuthSnapshot().catch(() => undefined);
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
