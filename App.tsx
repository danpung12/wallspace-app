import 'react-native-gesture-handler';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Component,
  ReactNode,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
const Ionicons: any = require('@expo/vector-icons/Ionicons').default;
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';

import { supabase } from './src/lib/supabase';
import { AuthContext } from './src/contexts/AuthContext';
import NativeLoginScreen from './src/screens/NativeLoginScreen';
import NativeEmailLoginScreen from './src/screens/NativeEmailLoginScreen';
import NativeSignUpScreen from './src/screens/NativeSignUpScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import AnimatedTabBar from './src/components/AnimatedTabBar';
import { handleSocialLogin, getCurrentSession } from './src/lib/socialLogin';
import { RN_WEBVIEW_PRE_INJECT } from './src/injected-scripts/preInject';
import { THEME_COLOR_SCRIPT } from './src/injected-scripts/themeColor';
import { webviewControllerRegistry } from './src/lib/webviewController';
import { useAuthFlowStore } from './src/store/authFlowStore';
import { clearCurrentUserCache, getCurrentUserCached } from './src/lib/authCache';
import { clearAllCachedRequests } from './src/lib/requestCache';
import { getProfileUserTypeRow } from './src/lib/api/profile';
import {
  clearLastAuthSnapshot,
  getLastAuthSnapshot,
  saveAuthSnapshotFromUser,
} from './src/lib/localAuthSnapshot';

const BASE_WEB_URL = 'https://withart.vercel.app';
const WEBVIEW_READY_REVEAL_DELAY_MS = 350;

// ---------- Error Boundary ----------
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>앱 시작 중 오류가 발생했습니다</Text>
          <Text style={styles.errorMsg}>{this.state.error?.message}</Text>
          <Pressable
            style={styles.errorBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.errorBtnText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// ---------- 탭 스크린 ----------
const Tab = createBottomTabNavigator();

const EmptyTabScreen = () => <View style={{ flex: 1 }} />;

const TAB_WEBVIEW_TARGETS = [
  { name: 'main', path: '/' },
  { name: 'map', path: '/map' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'profile', path: '/profile' },
] as const;

const RESERVATION_PATH_PREFIXES = [
  '/bookingdate',
  '/bookingdate2',
  '/confirm-booking',
  '/booking',
  '/payment/success',
  '/bookingdetail',
  '/refund',
];

function isReservationPath(pathname: string): boolean {
  return RESERVATION_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`),
  );
}

const BOTTOM_NAV_HIDDEN_PATH_PREFIXES = [
  '/login',
  '/onboarding',
  '/find-password',
  '/reset-password',
  '/select-type',
  '/bookingdate',
  '/bookingdate2',
  '/confirm-booking',
  '/booking',
  '/payment/success',
  '/bookingdetail',
  '/refund',
  '/dashboard/add',
  '/dashboard/add-store',
  '/auth/link/naver',
  '/auth/link-account',
  '/auth/callback/naver',
];

function shouldHideBottomNavForPath(pathnameWithSearch?: string): boolean {
  if (!pathnameWithSearch) return false;

  const [rawPathname, rawSearch = ''] = pathnameWithSearch.split('?');
  const pathname = rawPathname && rawPathname !== '/' && rawPathname.endsWith('/')
    ? rawPathname.slice(0, -1)
    : rawPathname || '/';
  const search = rawSearch ? `?${rawSearch}` : '';

  if (pathname === '/map' && new URLSearchParams(search).has('placeId')) {
    return true;
  }

  return BOTTOM_NAV_HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const FULLSCREEN_WEB_OVERLAY_SCRIPT = `(function(){
  try {
    document.documentElement.style.setProperty('--safe-area-top', '0px');
    document.documentElement.style.setProperty('--safe-area-bottom', '0px');

    var css = [
      'html, body { height: 100% !important; min-height: 100% !important; overflow: hidden !important; }',
      'body { padding: 0 !important; margin: 0 !important; background: #F5F3F0 !important; }',
      '#__next, main { min-height: 0 !important; }',
      '.h-screen.h-dvh, .h-screen, .h-dvh { height: var(--app-vh, 100dvh) !important; min-height: var(--app-vh, 100dvh) !important; box-sizing: border-box !important; padding-top: 0 !important; padding-bottom: 0 !important; background: #F5F3F0 !important; }',
      '.h-screen.h-dvh > div, .h-screen > div, .h-dvh > div { min-height: 0 !important; height: auto !important; flex: 1 1 auto !important; box-sizing: border-box !important; padding-bottom: 1rem !important; }',
      'main.flex.flex-col { min-height: 0 !important; flex: 1 1 auto !important; gap: 1rem !important; }',
      'main.flex.flex-col a { min-height: 0 !important; flex: 1 1 0 !important; padding: 1.25rem !important; }',
      '@media (max-height: 720px) { header.py-8 { padding-top: 1rem !important; padding-bottom: 1rem !important; } main.flex.flex-col a { padding: 1rem !important; } .material-symbols-outlined { font-size: 3rem !important; } }'
    ].join('\\n');

    var style = document.getElementById('__withart_fullscreen_overlay_css__');
    if (!style) {
      style = document.createElement('style');
      style.id = '__withart_fullscreen_overlay_css__';
      document.head.appendChild(style);
    }
    style.textContent = css;

    function apply() {
      try {
        var root = document.querySelector('.h-screen.h-dvh, .h-screen, .h-dvh');
        if (root) {
          root.style.height = 'var(--app-vh, 100dvh)';
          root.style.minHeight = 'var(--app-vh, 100dvh)';
          root.style.boxSizing = 'border-box';
          root.style.paddingTop = '0px';
          root.style.paddingBottom = '0px';
          root.style.backgroundColor = '#F5F3F0';
        }
      } catch (e) {}
    }

    function postBackToNativeLogin() {
      try {
        var message = JSON.stringify({ type: 'SELECT_TYPE_BACK_TO_LOGIN' });
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(message);
        }
      } catch (e) {}
    }

    function installBackBridge() {
      try {
        if (window.__WITHART_SELECT_TYPE_BACK_BRIDGE__) return;
        window.__WITHART_SELECT_TYPE_BACK_BRIDGE__ = true;
        document.addEventListener('click', function(event) {
          try {
            var target = event.target;
            var el = target && target.closest ? target.closest('button[aria-label="Go back"], button[title], .focus-ring') : null;
            var isSelectType = location.pathname === '/select-type' || location.pathname.indexOf('/select-type/') === 0;
            if (!isSelectType || !el) return;
            var label = (el.getAttribute('aria-label') || '').toLowerCase();
            var title = (el.getAttribute('title') || '').toLowerCase();
            if (label.indexOf('go back') !== -1 || title.length > 0) {
              event.preventDefault();
              event.stopPropagation();
              postBackToNativeLogin();
            }
          } catch (e) {}
        }, true);
      } catch (e) {}
    }

    apply();
    installBackBridge();
    setTimeout(apply, 100);
    setTimeout(apply, 400);
    try {
      new MutationObserver(apply).observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true
      });
    } catch (e) {}
  } catch (e) {}
})();true;`;

// ---------- 푸시 알림 ----------
async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#A3834C',
      });
    }
    const { data } = await Notifications.getExpoPushTokenAsync();
    return data;
  } catch (e) {
    console.warn('Push token error:', e);
    return null;
  }
}

async function sendPushTokenToServer(pushToken: string): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync('pushToken');
    if (stored === pushToken) return;
    const userId = await SecureStore.getItemAsync('userId');
    if (!userId) {
      await SecureStore.setItemAsync('pushToken', pushToken);
      return;
    }
    const res = await fetch(`${BASE_WEB_URL}/api/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken, deviceType: Platform.OS }),
    });
    if (res.ok) await SecureStore.setItemAsync('pushToken', pushToken);
  } catch (e) {
    console.warn('sendPushTokenToServer error:', e);
  }
}

// ---------- 위치 권한 ----------
async function requestLocationPermission(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied');
      return null;
    }
    const location = await Location.getCurrentPositionAsync({});
    return location;
  } catch (e) {
    console.warn('Location error:', e);
    return null;
  }
}

// ---------- 로딩 오버레이 ----------
function LoadingOverlay({
  message = '로그인 중...',
  opaque = false,
}: {
  message?: string;
  opaque?: boolean;
}) {
  return (
    <View style={[styles.loadingOverlay, opaque && styles.loadingOverlayOpaque]}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#A3834C" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

// ---------- 스플래시 아이콘 애니메이션 ----------
function SplashIcon({ size = 80 }: { size?: number }) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.7)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;
  const opacity3 = useRef(new Animated.Value(0.15)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const createPulse = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
      baseOpacity: number,
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.4,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 1, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: baseOpacity, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
    };

    Animated.parallel([
      createPulse(scale1, opacity1, 0, 0.7),
      createPulse(scale2, opacity2, 150, 0.4),
      createPulse(scale3, opacity3, 300, 0.15),
    ]).start();

  }, [scale1, scale2, scale3, opacity1, opacity2, opacity3, iconScale, iconOpacity]);

  const ring1 = size;
  const ring2 = Math.round(size * 1.25);
  const ring3 = Math.round(size * 1.5);
  const borderRadius1 = Math.round(size * 0.275);
  const borderRadius2 = Math.round(size * 0.35);
  const borderRadius3 = Math.round(size * 0.4);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={[
          styles.pulseRing,
          { width: ring1, height: ring1, borderRadius: borderRadius1, transform: [{ scale: scale1 }], opacity: opacity1 },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          { width: ring2, height: ring2, borderRadius: borderRadius2, transform: [{ scale: scale2 }], opacity: opacity2 },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          { width: ring3, height: ring3, borderRadius: borderRadius3, transform: [{ scale: scale3 }], opacity: opacity3 },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseIconCircle,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.275),
            transform: [{ scale: iconScale }],
            opacity: iconOpacity,
          },
        ]}
      >
        <Text style={[styles.pulseIconText, { fontSize: Math.round(size * 0.45) }]}>W</Text>
      </Animated.View>
    </View>
  );
}

// ---------- 백그라운드 WebView 프리워밍 ----------
function WebViewPrewarm({
  enabled,
  urls,
  startDelayMs = 0,
}: {
  enabled: boolean;
  urls: string[];
  startDelayMs?: number;
}) {
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expired, setExpired] = useState(false);
  const [started, setStarted] = useState(startDelayMs === 0);

  useEffect(() => {
    if (!enabled) {
      setLoadedMap({});
      setCurrentIndex(0);
      setExpired(false);
      setStarted(startDelayMs === 0);
      return;
    }

    if (startDelayMs > 0) {
      const startTimer = setTimeout(() => setStarted(true), startDelayMs);
      return () => clearTimeout(startTimer);
    }

    setStarted(true);
  }, [enabled, startDelayMs]);

  useEffect(() => {
    if (!enabled || !started) return;
    if (currentIndex >= urls.length) return;
    if (!loadedMap[urls[currentIndex]]) return;

    const timer = setTimeout(() => {
      setCurrentIndex((index) => index + 1);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentIndex, enabled, loadedMap, started, urls]);

  useEffect(() => {
    if (!enabled || !started) return;

    const timer = setTimeout(() => {
      setExpired(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [enabled, started]);

  const allLoaded = urls.length > 0 && urls.every((u) => loadedMap[u]);
  if (!enabled || !started || expired || allLoaded) return null;
  const currentUrl = urls[currentIndex];
  if (!currentUrl) return null;

  return (
    <View pointerEvents="none" style={styles.prewarmContainer}>
      <WebView
        key={currentUrl}
        source={{ uri: currentUrl }}
        style={styles.prewarmWebview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        onLoadEnd={() => {
          setLoadedMap((prev) => ({ ...prev, [currentUrl]: true }));
        }}
        onError={() => {
          setLoadedMap((prev) => ({ ...prev, [currentUrl]: true }));
        }}
      />
    </View>
  );
}

// ---------- 웹 오버레이 (회원가입 / 네이버 콜백) ----------
function WebOverlay({
  url,
  onClose,
  onLoginComplete,
  showHeader = true,
  onNavigateToLogin,
  completeOnPathPrefixes = [],
  completeOnExactPaths = [],
}: {
  url: string;
  onClose: () => void;
  onLoginComplete: () => void;
  showHeader?: boolean;
  onNavigateToLogin?: () => void;
  completeOnPathPrefixes?: string[];
  completeOnExactPaths?: string[];
}) {
  // AUTH_SUCCESS 또는 nav로 이미 처리되었는지 방지
  const authDoneRef = useRef(false);
  const webOverlayRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const shouldFitFullscreen = url.includes('/select-type');

  const ensureRedirectFromLogin = useCallback((targetUrl?: string) => {
    try {
      if (!targetUrl) return;
      const parsed = new URL(targetUrl);
      const p = parsed.pathname || '/';
      const normalized = p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p;
      const isLoginLike =
        normalized === '/login' ||
        normalized.startsWith('/login/') ||
        normalized === '/auth' ||
        normalized.startsWith('/auth/');
      const bypass =
        normalized === '/login/social-only' ||
        normalized === '/auth/callback/naver';

      // 회원가입 오버레이에서는 로그인 페이지로 이동 시 앱 네이티브 로그인으로 복귀
      if (!showHeader && normalized === '/login') {
        onNavigateToLogin?.();
        return;
      }

      if (!isLoginLike || bypass) return;

      webOverlayRef.current?.injectJavaScript(`(function(){
        try { window.location.replace('/'); } catch (e) {}
      })();true;`);
    } catch (_) {}
  }, [showHeader, onNavigateToLogin]);

  const handleMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        const msgType = msg?.type;

        if (msgType === 'SELECT_TYPE_BACK_TO_LOGIN') {
          onNavigateToLogin?.();
          return;
        }

        if (authDoneRef.current) return;

        if (msgType === 'AUTH_SUCCESS') {
          authDoneRef.current = true;
          // 세션 데이터가 있으면 SecureStore에 저장
          if (msg?.session) {
            try {
              const accessToken = msg.session.access_token;
              const refreshToken = msg.session.refresh_token;
              if (accessToken) await SecureStore.setItemAsync('accessToken', accessToken);
              if (refreshToken) await SecureStore.setItemAsync('refreshToken', refreshToken);
              if (msg.session.expires_at) {
                const rawExpiresAt = Number(msg.session.expires_at);
                const expiresAtMs =
                  Number.isFinite(rawExpiresAt) && rawExpiresAt > 0
                    ? rawExpiresAt < 1_000_000_000_000
                      ? rawExpiresAt * 1000
                      : rawExpiresAt
                    : Date.now() + 3600 * 1000;
                await SecureStore.setItemAsync('tokenExpiresAt', String(expiresAtMs));
              }
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
            } catch (_) {}
          }
          onLoginComplete();
          return;
        }

        // LOADING_END: 네이버 콜백 페이지가 로딩 종료를 알릴 때
        // (withart:// 리다이렉트는 WebView에서 navigation을 트리거하지 않을 수 있음)
        if (msgType === 'LOADING_END') {
          if (!authDoneRef.current) {
            authDoneRef.current = true;
            onLoginComplete();
          }
          return;
        }
      } catch (_) {}
    },
    [onLoginComplete, onNavigateToLogin],
  );

  const handleNavChange = useCallback(
    (state: WebViewNavigation) => {
      const u = state.url ?? '';

      ensureRedirectFromLogin(u);

      // 온보딩 완료 후 내부 라우팅(예: /, /guest)이 발생하면 오버레이를 즉시 종료
      // 닫기 헤더가 붙은 컨테이너에 갇히는 현상 방지
      if (completeOnPathPrefixes.length > 0 || completeOnExactPaths.length > 0) {
        try {
          const parsed = new URL(u);
          const pathname = parsed.pathname || '/';
          const matchedExact = completeOnExactPaths.some((p) => pathname === p);
          const matchedPrefix = completeOnPathPrefixes.some((prefix) => pathname.startsWith(prefix));
          if ((matchedExact || matchedPrefix) && !authDoneRef.current) {
            authDoneRef.current = true;
            onLoginComplete();
            return ;
          }
        } catch (_) {}
      }

      // [핵심 수정] about:blank 로 이동 = 소셜 로그인 완료 신호
      // social-only/page.tsx 에서 window.location.href = 'about:blank' 로 이동됨
      // authDoneRef와 무관하게 항상 처리 (AUTH_SUCCESS가 먼저 도착했을 수도 있음)
      if (u === 'about:blank') {
        if (!authDoneRef.current) {
          authDoneRef.current = true;
          onLoginComplete();
        }
        return;
      }

      // 이미 처리 완료되면 skip
      if (authDoneRef.current) return;

      // 중요: '/' 이동 자체는 로그인 성공으로 간주하지 않는다.
      // 실제 성공 신호는 AUTH_SUCCESS / LOADING_END / about:blank 에서만 처리한다.
    },
    [ensureRedirectFromLogin, onLoginComplete, completeOnPathPrefixes, completeOnExactPaths],
  );

  return (
    <View style={[styles.overlay, { zIndex: 200 }]}>
      <View style={{ flex: 1 }}>
        {showHeader && (
          <View style={[styles.webOverlayHeader, { height: 52 + insets.top, paddingTop: insets.top }]}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={24} color="#3E352F" />
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
          </View>
        )}
        <WebView
          ref={webOverlayRef}
          source={{ uri: url }}
          style={{ flex: 1 }}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavChange}
          onShouldStartLoadWithRequest={(req) => {
            ensureRedirectFromLogin(req?.url);
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={`${RN_WEBVIEW_PRE_INJECT}\n;${shouldFitFullscreen ? FULLSCREEN_WEB_OVERLAY_SCRIPT : ''}`}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
          injectedJavaScript={`${shouldFitFullscreen ? FULLSCREEN_WEB_OVERLAY_SCRIPT : ''}\n;${THEME_COLOR_SCRIPT}`}
          userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
      </View>
    </View>
  );
}

// ---------- 메인 App ----------
type AppProps = {
  onLoggedInChange?: (v: boolean) => void;
};

type WebviewAuthPayload = {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
};

export default function App({ onLoggedInChange }: AppProps) {
  const [isReady, setIsReady] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [showNativeLogin, setShowNativeLogin] = useState(true);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [showNativeSignUp, setShowNativeSignUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, _setIsLoggedIn] = useState(false);
  const [webOverlayUrl, setWebOverlayUrl] = useState<string | null>(null);
  const [webviewAuthPayload, setWebviewAuthPayload] = useState<WebviewAuthPayload | null>(null);
  const [shouldPrewarmTabs, setShouldPrewarmTabs] = useState(false);
  const [activeTabName, setActiveTabName] = useState<'홈' | '예약' | '대시보드' | '내 정보'>('홈');
  const [pendingTabName, setPendingTabName] = useState<'홈' | '예약' | '대시보드' | '내 정보' | null>(null);
  const [mainPathname, setMainPathname] = useState<string>('');
  const [forceTopLoadingOverlay, setForceTopLoadingOverlay] = useState(false);
  const [routeBottomNavVisible, setRouteBottomNavVisible] = useState(true);
  const [contentBottomNavVisible, setContentBottomNavVisible] = useState(true);
  const [mainContentReady, setMainContentReady] = useState(false);
  const [emailLoginNonce, setEmailLoginNonce] = useState(0);
  const [mainWebViewNonce, setMainWebViewNonce] = useState(0);
  const ignoreMapNavigationUntilRef = useRef(0);
  const routeBottomNavVisibleRef = useRef(true);
  const contentBottomNavVisibleRef = useRef(true);
  const contentBottomNavShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authHydrationPending = useAuthFlowStore((s) => s.authHydrationPending);
  const setAuthHydrationPending = useAuthFlowStore((s) => s.setAuthHydrationPending);
  const setNavTransitionPending = useAuthFlowStore((s) => s.setNavTransitionPending);

  const isAppContentReady =
    isLoggedIn &&
    !showNativeLogin &&
    !showEmailLogin &&
    !showNativeSignUp &&
    !webOverlayUrl &&
    !authHydrationPending &&
    !isLoggingIn &&
    mainContentReady &&
    !forceTopLoadingOverlay;

  // WebView는 세션 주입/리다이렉트가 필요해서, 표시 준비 전에도 미리 마운트해둔다.
  const shouldMountWebView = isLoggedIn || authHydrationPending;
  const isBottomNavVisible = routeBottomNavVisible && contentBottomNavVisible;

  const applyContentBottomNavVisible = useCallback((nextVisible: boolean) => {
    if (contentBottomNavShowTimerRef.current) {
      clearTimeout(contentBottomNavShowTimerRef.current);
      contentBottomNavShowTimerRef.current = null;
    }

    if (!nextVisible) {
      if (contentBottomNavVisibleRef.current) {
        contentBottomNavVisibleRef.current = false;
        setContentBottomNavVisible(false);
      }
      return;
    }

    contentBottomNavShowTimerRef.current = setTimeout(() => {
      contentBottomNavShowTimerRef.current = null;
      if (!contentBottomNavVisibleRef.current) {
        contentBottomNavVisibleRef.current = true;
        setContentBottomNavVisible(true);
      }
    }, 140);
  }, []);

  const handleBottomNavVisibilityMessage = useCallback((type: string, data?: any) => {
    const nextVisible = data?.visible !== false;
    const messagePathname = typeof data?.pathname === 'string' ? data.pathname : undefined;

    if (type === 'SET_TABS_VISIBILITY') {
      routeBottomNavVisibleRef.current = nextVisible;
      setRouteBottomNavVisible(nextVisible);
      return;
    }

    if (!nextVisible) {
      routeBottomNavVisibleRef.current = false;
      setRouteBottomNavVisible(false);
      applyContentBottomNavVisible(false);
      return;
    }

    if (!routeBottomNavVisibleRef.current) {
      if (messagePathname && !shouldHideBottomNavForPath(messagePathname)) {
        routeBottomNavVisibleRef.current = true;
        setRouteBottomNavVisible(true);
        applyContentBottomNavVisible(true);
        return;
      }
      return;
    }

    routeBottomNavVisibleRef.current = nextVisible;
    setRouteBottomNavVisible(nextVisible);
    applyContentBottomNavVisible(nextVisible);
  }, [applyContentBottomNavVisible]);

  useEffect(() => {
    if (isAppContentReady) {
      if (contentBottomNavShowTimerRef.current) {
        clearTimeout(contentBottomNavShowTimerRef.current);
        contentBottomNavShowTimerRef.current = null;
      }
    }
  }, [isAppContentReady]);

  useEffect(() => {
    return () => {
      if (contentBottomNavShowTimerRef.current) {
        clearTimeout(contentBottomNavShowTimerRef.current);
      }
    };
  }, []);

  // isLoggedIn 상태 변경 → AppWrapper에 알림
  const setIsLoggedIn = useCallback((v: boolean) => {
    _setIsLoggedIn(v);
    onLoggedInChange?.(v);
  }, [onLoggedInChange]);

  const onLogout = useCallback(() => {
    clearCurrentUserCache();
    clearAllCachedRequests();
    SecureStore.deleteItemAsync('accessToken').catch(() => {});
    SecureStore.deleteItemAsync('refreshToken').catch(() => {});
    SecureStore.deleteItemAsync('tokenExpiresAt').catch(() => {});
    SecureStore.deleteItemAsync('userId').catch(() => {});
    clearLastAuthSnapshot().catch(() => {});
    supabase.auth.signOut().catch(() => {});
    setWebviewAuthPayload(null);
    setIsLoggedIn(false);
    setShowNativeLogin(true);
    setShowEmailLogin(false);
    setMainContentReady(false);
    setMainWebViewNonce((value) => value + 1);
    setShouldPrewarmTabs(false);
    setActiveTabName('홈');
  }, []);

  const resetToLoginAfterInvalidProfile = useCallback(async () => {
    clearCurrentUserCache();
    clearAllCachedRequests();
    await supabase.auth.signOut().catch(() => {});
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken').catch(() => {}),
      SecureStore.deleteItemAsync('refreshToken').catch(() => {}),
      SecureStore.deleteItemAsync('tokenExpiresAt').catch(() => {}),
      SecureStore.deleteItemAsync('userId').catch(() => {}),
      clearLastAuthSnapshot().catch(() => {}),
    ]);
    setAuthHydrationPending(false);
    setForceTopLoadingOverlay(false);
    setShowNativeLogin(true);
    setShowEmailLogin(false);
    setIsLoggedIn(false);
    setMainContentReady(false);
    setMainWebViewNonce((value) => value + 1);
    setShouldPrewarmTabs(false);
    setMainPathname('');
  }, [setAuthHydrationPending, setIsLoggedIn]);

  const validateProfileInBackground = useCallback(
    (resolveUserId: () => Promise<string | null>) => {
      const timer = setTimeout(async () => {
        try {
          const userId = await resolveUserId();
          if (!userId) return;

          const profile = await getProfileUserTypeRow(userId);
          if (!profile) {
            await resetToLoginAfterInvalidProfile();
          }
        } catch (error) {
          console.warn('[App] Background profile validation skipped:', error);
        }
      }, 12_000);

      return () => clearTimeout(timer);
    },
    [resetToLoginAfterInvalidProfile],
  );

  // 세션 확인
  useEffect(() => {
    let alive = true;
    const watchdog = setTimeout(() => {
      if (!alive) return;
      console.warn('[App] Session check watchdog fired');
      setShowNativeLogin(true);
      setIsLoggedIn(false);
      setIsSessionChecked(true);
    }, 8000);

    async function checkSession() {
      try {
        // 1) SecureStore 토큰 (이메일 로그인)
        const [accessToken, tokenExpiresAt, refreshToken, cachedAuthSnapshot] = await Promise.all([
          SecureStore.getItemAsync('accessToken'),
          SecureStore.getItemAsync('tokenExpiresAt'),
          SecureStore.getItemAsync('refreshToken'),
          getLastAuthSnapshot(),
        ]);

        const finishStoredSessionRestore = (
          syncPayload: WebviewAuthPayload,
          resolveUserId: () => Promise<string | null>,
        ) => {
          setWebviewAuthPayload(syncPayload);
          setShowNativeLogin(false);
          setShowEmailLogin(false);
          setAuthHydrationPending(true);
          setMainContentReady(true);
          setMainPathname('/');
          if (alive) setIsSessionChecked(true);
          setIsLoggedIn(true);
          setShouldPrewarmTabs(true);

          setTimeout(() => {
            webviewControllerRegistry.callAll('injectSession', syncPayload);
            setAuthHydrationPending(false);
            setForceTopLoadingOverlay(false);
          }, 120);

          validateProfileInBackground(resolveUserId);
        };

        if (accessToken && tokenExpiresAt && parseInt(tokenExpiresAt, 10) > Date.now()) {
          const syncPayload = {
            accessToken: accessToken || undefined,
            refreshToken: refreshToken || undefined,
            tokenExpiresAt: tokenExpiresAt || undefined,
          };
          if (refreshToken) {
            void supabase.auth
              .setSession({ access_token: accessToken, refresh_token: refreshToken })
              .catch((error) => console.warn('[App] Deferred session restore failed:', error));
          }
          if (cachedAuthSnapshot?.userId) {
            void SecureStore.setItemAsync('userId', cachedAuthSnapshot.userId).catch(() => {});
          } else {
            void getCurrentUserCached()
              .then((user) => saveAuthSnapshotFromUser(user))
              .catch(() => {});
          }

          finishStoredSessionRestore(syncPayload, async () => {
            const storedUserId = await SecureStore.getItemAsync('userId');
            if (storedUserId) return storedUserId;
            if (cachedAuthSnapshot?.userId) return cachedAuthSnapshot.userId;
            return (await getCurrentUserCached())?.id ?? null;
          });
          return;
        }

        // 2) Supabase 세션 (소셜 로그인)
        if (refreshToken) {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (!error && data.session?.access_token) {
            const refreshedSession = data.session;
            const rawExpiresAt = Number(refreshedSession.expires_at);
            const expiresAtMs =
              Number.isFinite(rawExpiresAt) && rawExpiresAt > 0
                ? rawExpiresAt < 1_000_000_000_000
                  ? rawExpiresAt * 1000
                  : rawExpiresAt
                : Date.now() + 3600 * 1000;

            await Promise.all([
              SecureStore.setItemAsync('accessToken', refreshedSession.access_token),
              SecureStore.setItemAsync('refreshToken', refreshedSession.refresh_token ?? refreshToken),
              SecureStore.setItemAsync('tokenExpiresAt', String(expiresAtMs)),
              refreshedSession.user?.id
                ? SecureStore.setItemAsync('userId', refreshedSession.user.id)
                : Promise.resolve(),
              saveAuthSnapshotFromUser(refreshedSession.user),
            ]);

            finishStoredSessionRestore(
              {
                accessToken: refreshedSession.access_token,
                refreshToken: refreshedSession.refresh_token ?? refreshToken,
                tokenExpiresAt: String(expiresAtMs),
              },
              async () => refreshedSession.user?.id ?? (await getCurrentUserCached())?.id ?? null,
            );
            return;
          }
        }

        const session = await getCurrentSession();
        const user = session?.user;
        if (user) {
          setShowNativeLogin(false);
          setShowEmailLogin(false);
          setAuthHydrationPending(true);
          setMainContentReady(false);
          if (alive) setIsSessionChecked(true);
          setIsLoggedIn(true);
          setShouldPrewarmTabs(true);
          setMainPathname('/');

          if (session.access_token && session.refresh_token) {
            const expiresAtMs = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000;
            await Promise.all([
              SecureStore.setItemAsync('accessToken', session.access_token),
              SecureStore.setItemAsync('refreshToken', session.refresh_token),
              SecureStore.setItemAsync('tokenExpiresAt', String(expiresAtMs)),
              SecureStore.setItemAsync('userId', user.id),
              saveAuthSnapshotFromUser(user),
            ]);
            setWebviewAuthPayload({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              tokenExpiresAt: String(expiresAtMs),
            });
          }

          validateProfileInBackground(async () => user.id);

          setShowNativeLogin(false);
          setIsLoggedIn(true);
          setShouldPrewarmTabs(true);
          setMainPathname('/');

          setTimeout(() => {
            webviewControllerRegistry.callAll('injectSession', {
              accessToken: session.access_token || undefined,
              refreshToken: session.refresh_token || undefined,
              tokenExpiresAt: session.expires_at ? String(session.expires_at * 1000) : undefined,
            });
            setAuthHydrationPending(false);
          }, 120);
          return;
        }

        setShowNativeLogin(true);
        setIsLoggedIn(false);
        setAuthHydrationPending(false);
      } catch (e) {
        console.warn('Session check failed:', e);
        setShowNativeLogin(true);
        setAuthHydrationPending(false);
      } finally {
        if (alive) {
          clearTimeout(watchdog);
          setIsSessionChecked(true);
        }
      }
    }

    checkSession();
    return () => {
      alive = false;
      clearTimeout(watchdog);
    };
  }, []);

  // 초기 준비 (스플래시)
  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // 푸시 알림 등록은 초기 렌더 이후 백그라운드에서 처리
  useEffect(() => {
    if (!isLoggedIn || !mainContentReady) return;

    let mounted = true;
    const run = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!mounted) return;
        if (token) await sendPushTokenToServer(token);
      } catch (e) {
        console.warn('Push notification setup failed:', e);
      }
    };

    const timer = setTimeout(run, 3000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isLoggedIn, mainContentReady]);

  // 위치 권한 요청
  useEffect(() => {
    if (!isLoggedIn || !mainContentReady) return;

    const timer = setTimeout(() => {
      requestLocationPermission();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoggedIn, mainContentReady]);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) await SplashScreen.hideAsync();
  }, [isReady]);

  const runAuthHydrationSync = useCallback(
    (
      payload: { accessToken?: string; refreshToken?: string; tokenExpiresAt?: string },
      onDone?: () => void,
    ) => {
      setAuthHydrationPending(true);
      setForceTopLoadingOverlay(true);
      setMainContentReady(false);

      const isLoginLikePath = (path: string | null) =>
        !!path && (path === '/login' || path.startsWith('/login/') || path === '/auth' || path.startsWith('/auth/'));

      const hydrateTabWebviews = (options?: { navigate?: boolean }) => {
        TAB_WEBVIEW_TARGETS.filter(({ name }) => name === 'main').forEach(({ name, path }) => {
          const ctrl = webviewControllerRegistry.get(name);
          if (!ctrl) return;

          ctrl.injectSession(payload);
          if (options?.navigate === false) return;

          const currentPath = ctrl.getCurrentPath();
          const isAtTarget =
            name === 'main'
              ? currentPath === '/' || currentPath === ''
              : !!currentPath && currentPath.startsWith(path);

          if (!currentPath || isLoginLikePath(currentPath) || !isAtTarget) {
            ctrl.navigateToPath(path);
          }
        });
      };

      const areMountedTabsReady = () => {
        const mounted = TAB_WEBVIEW_TARGETS
          .map(({ name, path }) => ({ name, path, ctrl: webviewControllerRegistry.get(name) }))
          .filter(({ ctrl }) => !!ctrl);

        if (mounted.length < TAB_WEBVIEW_TARGETS.length) return false;

        return mounted.every(({ name, path, ctrl }) => {
          const currentPath = ctrl?.getCurrentPath();
          if (!currentPath || isLoginLikePath(currentPath)) return false;
          return name === 'main' ? currentPath === '/' : currentPath.startsWith(path);
        });
      };

      const finish = () => {
        setAuthHydrationPending(false);
        onDone?.();
        setTimeout(() => {
          setForceTopLoadingOverlay(false);
        }, 300);
      };

      hydrateTabWebviews({ navigate: true });

      let attempt = 0;
      const tick = () => {
        attempt += 1;

        hydrateTabWebviews({ navigate: attempt <= 2 || attempt % 5 === 0 });

        const mainPath = webviewControllerRegistry.getCurrentPath('main');
        if (attempt >= 3 && mainPath && !isLoginLikePath(mainPath)) {
          setMainPathname(mainPath);
          finish();
          return;
        }

        if (attempt === 2 || attempt === 5 || attempt === 8) {
          hydrateTabWebviews({ navigate: true });
        }

        if (attempt >= 25) {
          console.warn('[App] Auth hydration timed out; revealing app with last known session state');
          setMainPathname('/');
          finish();
          return;
        }

        setTimeout(tick, 200);
      };

      setTimeout(tick, 100);
    },
    [setAuthHydrationPending],
  );

  // 소셜 로그인 핸들러
  const handleSocialLoginPress = useCallback(
    async (provider: 'kakao' | 'naver' | 'google') => {
      try {
        setShowNativeLogin(false);
        setShowEmailLogin(false);
        setIsLoggingIn(true);
        setForceTopLoadingOverlay(true);

        const result = await handleSocialLogin(provider);

        console.log('[App] 소셜 로그인 result:', JSON.stringify(result));

        if (!result.success) {
          console.warn('[App] 로그인 실패:', result.error);
          setAuthHydrationPending(false);
          setForceTopLoadingOverlay(false);
          setShowNativeLogin(true);
          setShowEmailLogin(false);
          return;
        }

        const accessToken = await SecureStore.getItemAsync('accessToken');
        const tokenExpiresAt = await SecureStore.getItemAsync('tokenExpiresAt');
        const hasValidStoredToken =
          !!accessToken && !!tokenExpiresAt && parseInt(tokenExpiresAt, 10) > Date.now();

        console.log('[App] hasValidStoredToken:', hasValidStoredToken);

        if (!hasValidStoredToken) {
          const user = await getCurrentUserCached({ force: true });
          console.log('[App] getUser result:', user?.id);
          if (!user) {
            console.warn('[App] 유저 없음 - 로그인 실패');
            setAuthHydrationPending(false);
            setForceTopLoadingOverlay(false);
            setShowNativeLogin(true);
            setShowEmailLogin(false);
            return;
          }
        }

        const [storedAccessToken, storedRefreshToken, storedTokenExpiresAt] = await Promise.all([
          SecureStore.getItemAsync('accessToken'),
          SecureStore.getItemAsync('refreshToken'),
          SecureStore.getItemAsync('tokenExpiresAt'),
        ]);
        const syncPayload = {
          accessToken: storedAccessToken || undefined,
          refreshToken: storedRefreshToken || undefined,
          tokenExpiresAt: storedTokenExpiresAt || undefined,
        };
        setWebviewAuthPayload(syncPayload);

        // 이메일 로그인과 동일한 흐름으로 세션 주입 후 홈 복귀
        setShowNativeLogin(false);
        setShowEmailLogin(false);
        setShouldPrewarmTabs(true);
        setIsLoggedIn(true);
        setActiveTabName('홈');
        setMainContentReady(false);
        setMainPathname('/');

        runAuthHydrationSync(syncPayload);

        const currentUser = await getCurrentUserCached();
        const currentUserId = currentUser?.id;
        if (!currentUserId) {
          throw new Error('로그인 사용자 정보를 확인할 수 없습니다.');
        }

        await saveAuthSnapshotFromUser(currentUser);

        setTimeout(async () => {
          try {
            const profile = await getProfileUserTypeRow(currentUserId, { force: true });

            if (!profile) {
              await supabase.auth.signOut();
              await SecureStore.deleteItemAsync('accessToken');
              await SecureStore.deleteItemAsync('refreshToken');
              await SecureStore.deleteItemAsync('tokenExpiresAt');
              await clearLastAuthSnapshot();
              setAuthHydrationPending(false);
              setForceTopLoadingOverlay(false);
              setShowNativeLogin(true);
              setIsLoggedIn(false);
              setShouldPrewarmTabs(false);
              setMainPathname('');
            }
          } catch (profileErr) {
            console.warn('[App] profile check skipped/failed:', profileErr);
          }
        }, 0);
      } catch (e: any) {
        console.error('[App] Social login error:', e?.message, JSON.stringify(e));
        setAuthHydrationPending(false);
        setForceTopLoadingOverlay(false);
        setShowNativeLogin(true);
        setShowEmailLogin(false);
      } finally {
        setIsLoggingIn(false);
      }
    },
    [runAuthHydrationSync, setAuthHydrationPending],
  );
  // 이메일 로그인 성공 핸들러
  const handleEmailLoginSuccess = useCallback(
    async (session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      token_type: string;
      user?: {
        id?: string;
        email?: string | null;
      };
      profile?: {
        nickname?: string | null;
        name?: string | null;
        full_name?: string | null;
        user_type?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
      } | null;
    }) => {
      try {
        setShowNativeLogin(false);
        setShowEmailLogin(false);
        setIsLoggingIn(true);
        setAuthHydrationPending(true);
        await SecureStore.setItemAsync('accessToken', session.access_token);
        await SecureStore.setItemAsync('refreshToken', session.refresh_token);
        if (session.user?.id) {
          await SecureStore.setItemAsync('userId', session.user.id);
          await saveAuthSnapshotFromUser(session.user, session.profile);
        }
        const rawExpiresAt = Number(session.expires_at);
        const expiresAtMs =
          Number.isFinite(rawExpiresAt) && rawExpiresAt > 0
            ? rawExpiresAt < 1_000_000_000_000
              ? rawExpiresAt * 1000
              : rawExpiresAt
            : Date.now() + 3600 * 1000;
        await SecureStore.setItemAsync('tokenExpiresAt', String(expiresAtMs));
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (!session.user?.id) {
          void getCurrentUserCached({ force: true })
            .then((user) => saveAuthSnapshotFromUser(user))
            .catch(() => {});
        }

        const [storedAccessToken, storedRefreshToken, storedTokenExpiresAt] = await Promise.all([
          SecureStore.getItemAsync('accessToken'),
          SecureStore.getItemAsync('refreshToken'),
          SecureStore.getItemAsync('tokenExpiresAt'),
        ]);
        const syncPayload = {
          accessToken: storedAccessToken || undefined,
          refreshToken: storedRefreshToken || undefined,
          tokenExpiresAt: storedTokenExpiresAt || undefined,
        };
        setWebviewAuthPayload(syncPayload);

        runAuthHydrationSync(syncPayload, () => {
          setIsLoggedIn(true);
          setShowEmailLogin(false);
          setShowNativeLogin(false);
          setShouldPrewarmTabs(true);
          setActiveTabName('홈');
          webviewControllerRegistry.get('main')?.navigateToPath('/');
        });
      } catch (e) {
        console.error('Email login save error:', e);
        setAuthHydrationPending(false);
        setShowEmailLogin(false);
        setShowNativeLogin(true);
      } finally {
        setIsLoggingIn(false);
      }
    },
    [runAuthHydrationSync, setAuthHydrationPending],
  );

  const handleNavigateTabMessage = useCallback((pathname: string) => {
    if (pathname === '/map' && Date.now() < ignoreMapNavigationUntilRef.current) {
      return;
    }

    const nextTab = pathname.startsWith('/dashboard')
      ? '대시보드'
      : pathname.startsWith('/profile')
        ? '내 정보'
        : pathname.startsWith('/map') || isReservationPath(pathname)
          ? '예약'
          : '홈';

    if (nextTab === '대시보드') {
      setPendingTabName(nextTab);
      setActiveTabName(nextTab);
      webviewControllerRegistry.get('dashboard')?.navigateToPath(pathname);
    } else if (nextTab === '내 정보') {
      setPendingTabName(nextTab);
      setActiveTabName(nextTab);
      webviewControllerRegistry.get('profile')?.navigateToPath(pathname);
    } else if (nextTab === '예약') {
      setPendingTabName(nextTab);
      setActiveTabName(nextTab);
      webviewControllerRegistry.get('map')?.navigateToPath(pathname);
    } else {
      setPendingTabName(nextTab);
      setActiveTabName(nextTab);
      setMainPathname('/');
      webviewControllerRegistry.get('main')?.navigateToPath('/');
    }

    setTimeout(() => setNavTransitionPending(false), 500);
  }, [setNavTransitionPending]);

  if (!isReady || !isSessionChecked) {
    return (
      <View style={styles.splashContainer}>
        <SplashIcon />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <AuthContext.Provider value={{ isLoggedIn, onLogout }}>
            <NavigationContainer>
              {Platform.OS !== 'android' && (
                <StatusBar style="dark" backgroundColor="transparent" translucent />
              )}

              <View
                key={`web-${emailLoginNonce}`}
                style={[styles.webviewLayer, !isAppContentReady && styles.webviewHidden]}
                pointerEvents={isAppContentReady ? 'box-none' : 'none'}
              >
                {shouldMountWebView ? (
                  <>
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        activeTabName === '홈' ? styles.webviewVisible : styles.webviewHidden,
                      ]}
                      pointerEvents={activeTabName === '홈' ? 'box-none' : 'none'}
                    >
                      <WebViewScreen
                        key={`main-${mainWebViewNonce}`}
                        url={`${BASE_WEB_URL}/`}
                        name="main"
                        targetPath="/"
                        authPayload={webviewAuthPayload}
                        onPathChange={(pathname) => {
                          setMainPathname((prev) => (prev === pathname ? prev : pathname));

                          const nextTab =
                            pathname.startsWith('/dashboard')
                              ? '대시보드'
                              : pathname.startsWith('/profile')
                                ? '내 정보'
                                : pathname.startsWith('/map') || isReservationPath(pathname)
                                  ? '예약'
                                  : '홈';

                          setActiveTabName((prev) => {
                            if (pendingTabName && pendingTabName !== nextTab) return prev;
                            return nextTab;
                          });

                          if (pendingTabName === nextTab) {
                            setPendingTabName(null);
                          }

                          if (pathname === '/login' || pathname.startsWith('/login/') || pathname === '/auth' || pathname.startsWith('/auth/')) {
                            const main = webviewControllerRegistry.get('main');
                            main?.navigateToPath('/');
                            setMainPathname('/');
                            return;
                          }
                        }}
                        onCustomMessage={(type, data) => {
                          if (type === 'HOME_READY') {
                            setMainContentReady(true);
                            setAuthHydrationPending(false);
                            setForceTopLoadingOverlay(false);
                            routeBottomNavVisibleRef.current = true;
                            setRouteBottomNavVisible(true);
                            contentBottomNavVisibleRef.current = true;
                            setContentBottomNavVisible(true);
                            return;
                          }

                          if (type === 'WEBVIEW_READY') {
                            setTimeout(() => {
                              setMainContentReady(true);
                              setAuthHydrationPending(false);
                              setForceTopLoadingOverlay(false);
                            }, WEBVIEW_READY_REVEAL_DELAY_MS);
                            return;
                          }

                          if (type === 'SET_BOTTOM_NAV_VISIBLE' || type === 'SET_TABS_VISIBILITY') {
                            handleBottomNavVisibilityMessage(type, data);
                            return;
                          }

                          if (type === 'NAVIGATE_TAB' && data?.pathname) {
                            handleNavigateTabMessage(data.pathname);
                          }
                        }}
                      />
                    </View>

                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        activeTabName === '예약' ? styles.webviewVisible : styles.webviewHidden,
                      ]}
                      pointerEvents={activeTabName === '예약' ? 'box-none' : 'none'}
                    >
                      <WebViewScreen
                        url={`${BASE_WEB_URL}/map`}
                        name="map"
                        targetPath="/map"
                        authPayload={webviewAuthPayload}
                        onCustomMessage={(type, data) => {
                          if (type === 'SET_BOTTOM_NAV_VISIBLE' || type === 'SET_TABS_VISIBILITY') {
                            handleBottomNavVisibilityMessage(type, data);
                            return;
                          }

                          if (type === 'NAVIGATE_TAB' && data?.pathname) {
                            handleNavigateTabMessage(data.pathname);
                          }
                        }}
                      />
                    </View>

                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        activeTabName === '대시보드' ? styles.webviewVisible : styles.webviewHidden,
                      ]}
                      pointerEvents={activeTabName === '대시보드' ? 'box-none' : 'none'}
                    >
                      <WebViewScreen
                        url={`${BASE_WEB_URL}/dashboard`}
                        name="dashboard"
                        targetPath="/dashboard"
                        authPayload={webviewAuthPayload}
                        onCustomMessage={(type, data) => {
                          if (type === 'SET_BOTTOM_NAV_VISIBLE' || type === 'SET_TABS_VISIBILITY') {
                            handleBottomNavVisibilityMessage(type, data);
                            return;
                          }

                          if (type === 'NAVIGATE_TAB' && data?.pathname) {
                            handleNavigateTabMessage(data.pathname);
                          }
                        }}
                      />
                    </View>

                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        activeTabName === '내 정보' ? styles.webviewVisible : styles.webviewHidden,
                      ]}
                      pointerEvents={activeTabName === '내 정보' ? 'box-none' : 'none'}
                    >
                      <WebViewScreen
                        url={`${BASE_WEB_URL}/profile`}
                        name="profile"
                        targetPath="/profile"
                        authPayload={webviewAuthPayload}
                        onCustomMessage={(type, data) => {
                          if (type === 'SET_BOTTOM_NAV_VISIBLE' || type === 'SET_TABS_VISIBILITY') {
                            handleBottomNavVisibilityMessage(type, data);
                            return;
                          }

                          if (type === 'NAVIGATE_TAB' && data?.pathname) {
                            handleNavigateTabMessage(data.pathname);
                          }
                        }}
                      />
                    </View>

                    {activeTabName === '홈' && mainPathname === '/exhibition-detail' && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="전시 상세 뒤로가기"
                        style={styles.exhibitionBackTouchCatcher}
                        onPress={() => {
                          setPendingTabName('홈');
                          setActiveTabName('홈');
                          setMainPathname('/');
                          routeBottomNavVisibleRef.current = true;
                          setRouteBottomNavVisible(true);
                          contentBottomNavVisibleRef.current = true;
                          setContentBottomNavVisible(true);
                          webviewControllerRegistry.get('main')?.navigateToPath('/');
                        }}
                      />
                    )}
                  </>
                ) : (
                  <View style={styles.splashContainer} />
                )}
              </View>

              <View
                style={[
                  styles.tabNavigatorLayer,
                ]}
                pointerEvents={isAppContentReady && isBottomNavVisible ? 'box-none' : 'none'}
              >
                <Tab.Navigator
                  tabBar={(props) => (
                    <AnimatedTabBar
                      {...props}
                      isVisible={isAppContentReady && isBottomNavVisible}
                      activeRouteName={activeTabName}
                    />
                  )}
                  screenOptions={{
                    headerShown: false,
                    tabBarStyle: styles.hiddenDefaultTabBar,
                    sceneStyle: styles.transparentTabScene,
                  }}
                  backBehavior="none"
                >
                  <Tab.Screen
                  name="홈"
                  component={EmptyTabScreen}
                  listeners={{
                    tabPress: (e) => {
                      e.preventDefault();
                      setNavTransitionPending(true);
                      setPendingTabName('홈');
                      setActiveTabName('홈');
                      setMainPathname('/');
                      ignoreMapNavigationUntilRef.current = Date.now() + 1800;
                      webviewControllerRegistry.get('main')?.navigateToPath('/');
                      setTimeout(() => setNavTransitionPending(false), 420);
                    },
                  }}
                  options={{
                    tabBarIcon: ({ color, focused }) => (
                      <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                    ),
                  }}
                  />
                  <Tab.Screen
                  name="예약"
                  component={EmptyTabScreen}
                  listeners={{
                    tabPress: (e) => {
                      e.preventDefault();
                      setNavTransitionPending(true);
                      setPendingTabName('예약');
                      setActiveTabName('예약');
                      const map = webviewControllerRegistry.get('map');
                      const mapPath = map?.getCurrentPath();
                      if (!mapPath || !mapPath.startsWith('/map')) {
                        map?.navigateToPath('/map');
                      }
                      setTimeout(() => setNavTransitionPending(false), 420);
                    },
                  }}
                  options={{
                    tabBarIcon: ({ color, focused }) => (
                      <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
                    ),
                  }}
                  />
                  <Tab.Screen
                  name="대시보드"
                  component={EmptyTabScreen}
                  listeners={{
                    tabPress: (e) => {
                      e.preventDefault();
                      setNavTransitionPending(true);
                      setPendingTabName('대시보드');
                      setActiveTabName('대시보드');
                      const dashboard = webviewControllerRegistry.get('dashboard');
                      const dashboardPath = dashboard?.getCurrentPath();
                      if (!dashboardPath || !dashboardPath.startsWith('/dashboard')) {
                        dashboard?.navigateToPath('/dashboard');
                      }
                      setTimeout(() => setNavTransitionPending(false), 420);
                    },
                  }}
                  options={{
                    tabBarIcon: ({ color, focused }) => (
                      <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
                    ),
                  }}
                  />
                  <Tab.Screen
                  name="내 정보"
                  component={EmptyTabScreen}
                  listeners={{
                    tabPress: (e) => {
                      e.preventDefault();
                      setNavTransitionPending(true);
                      setPendingTabName('내 정보');
                      setActiveTabName('내 정보');
                      const profile = webviewControllerRegistry.get('profile');
                      const profilePath = profile?.getCurrentPath();
                      if (!profilePath || !profilePath.startsWith('/profile')) {
                        profile?.navigateToPath('/profile');
                      }
                      setTimeout(() => setNavTransitionPending(false), 420);
                    },
                  }}
                  options={{
                    tabBarIcon: ({ color, focused }) => (
                      <Ionicons
                        name={focused ? 'person' : 'person-outline'}
                        size={22}
                        color={color}
                      />
                    ),
                  }}
                  />
                </Tab.Navigator>
              </View>
            </NavigationContainer>

            {/* 로그인 오버레이 */}
            {showNativeLogin && (
              <View style={styles.overlay}>
                <NativeLoginScreen
                  onSocialLogin={handleSocialLoginPress}
                  onNormalLogin={() => {
                    setShowNativeLogin(false);
                    setShowNativeSignUp(false);
                    setShowEmailLogin(true);
                  }}
                  onSignUp={() => {
                    setShowNativeLogin(false);
                    setShowEmailLogin(false);
                    setShowNativeSignUp(true);
                  }}
                />
                {(isLoggingIn || authHydrationPending) && <LoadingOverlay opaque />}
              </View>
            )}

            {/* 이메일 로그인 오버레이 */}
            {showEmailLogin && (
              <View style={styles.overlay}>
                <NativeEmailLoginScreen
                  onBack={() => {
                    setShowEmailLogin(false);
                    setShowNativeSignUp(false);
                    setShowNativeLogin(true);
                  }}
                  onLoginSuccess={handleEmailLoginSuccess}
                />
                {(isLoggingIn || authHydrationPending) && <LoadingOverlay opaque />}
              </View>
            )}

            {/* 네이티브 회원가입 오버레이 */}
            {showNativeSignUp && (
              <View style={styles.overlay}>
                <NativeSignUpScreen
                  onBack={() => {
                    setShowNativeSignUp(false);
                    setShowEmailLogin(false);
                    setShowNativeLogin(true);
                  }}
                  onComplete={() => {
                    setShowNativeSignUp(false);
                    setShowNativeLogin(false);
                    setShowEmailLogin(true);
                    setEmailLoginNonce((value) => value + 1);
                  }}
                />
                {(isLoggingIn || authHydrationPending) && <LoadingOverlay opaque />}
              </View>
            )}

            <WebViewPrewarm
              enabled={shouldPrewarmTabs && isAppContentReady}
              startDelayMs={8000}
              urls={[
                `${BASE_WEB_URL}/map`,
                `${BASE_WEB_URL}/dashboard`,
                `${BASE_WEB_URL}/profile`,
              ]}
            />

            {/* 앱 콘텐츠 준비 전 공통 로딩 오버레이 */}
            {!isAppContentReady && isLoggedIn && (
              <LoadingOverlay opaque />
            )}

            {/* 하드 가드: 소셜/하이드레이션 진행 중에는 어떤 웹 화면도 노출하지 않음 */}
            {(authHydrationPending || isLoggingIn || forceTopLoadingOverlay) && <LoadingOverlay opaque />}

            {webOverlayUrl && (
              <WebOverlay
                url={webOverlayUrl}
                showHeader={!webOverlayUrl.includes('/select-type') && !webOverlayUrl.includes('/onboarding')}
                completeOnExactPaths={
                  webOverlayUrl.includes('/onboarding') ? ['/', '/guest'] : []
                }
                onNavigateToLogin={() => {
                  setWebOverlayUrl(null);
                  setShowEmailLogin(false);
                  setShowNativeLogin(true);
                }}
                onClose={() => {
                  setWebOverlayUrl(null);
                  if (!isLoggedIn) {
                    setShowEmailLogin(false);
                    setShowNativeLogin(true);
                  }
                }}
                onLoginComplete={async () => {
                  // 실제 세션이 있는 경우에만 로그인 완료 처리
                  let hasValidSession = false;
                  try {
                    const storedAccessToken = await SecureStore.getItemAsync('accessToken');
                    const storedExpiresAt = await SecureStore.getItemAsync('tokenExpiresAt');
                    if (
                      storedAccessToken &&
                      storedExpiresAt &&
                      parseInt(storedExpiresAt, 10) > Date.now()
                    ) {
                      hasValidSession = true;
                    } else {
                      const user = await getCurrentUserCached({ force: true });
                      hasValidSession = !!user;
                    }
                  } catch (_) {
                    hasValidSession = false;
                  }

                  if (!hasValidSession) {
                    setAuthHydrationPending(false);
                    setWebOverlayUrl(null);
                    setShowNativeLogin(true);
                    setShowEmailLogin(false);
                    setIsLoggedIn(false);
                    return;
                  }

                  setAuthHydrationPending(true);
                  setWebOverlayUrl(null);
                  setShowNativeLogin(false);
                  setShowEmailLogin(false);
                  setShouldPrewarmTabs(true);
                  setIsLoggedIn(true);
                  setMainContentReady(false);

                  const storedAccessToken = await SecureStore.getItemAsync('accessToken');
                  const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
                  const storedTokenExpiresAt = await SecureStore.getItemAsync('tokenExpiresAt');
                  const syncPayload = {
                    accessToken: storedAccessToken || undefined,
                    refreshToken: storedRefreshToken || undefined,
                    tokenExpiresAt: storedTokenExpiresAt || undefined,
                  };
                  setWebviewAuthPayload(syncPayload);

                  setMainPathname('/');
                  setAuthHydrationPending(false);
                  setForceTopLoadingOverlay(false);
                  setTimeout(() => {
                    TAB_WEBVIEW_TARGETS.forEach(({ name, path }) => {
                      const ctrl = webviewControllerRegistry.get(name);
                      ctrl?.injectSession(syncPayload);
                      ctrl?.navigateToPath(path);
                    });
                  }, 0);
                }}
              />
            )}
          </AuthContext.Provider>
      </SafeAreaProvider>
    </View>
    </AppErrorBoundary>
  );
}

// ---------- 스타일 ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e3da',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#e8e3da',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 160,
    height: 160,
  },
  splashBrandText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3D2C1D',
    marginTop: 20,
    marginBottom: 6,
  },
  splashSubText: {
    fontSize: 13,
    color: '#8B7355',
    letterSpacing: 0.3,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#C19A6B',
  },
  pulseIconCircle: {
    backgroundColor: '#C19A6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C19A6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  pulseIconText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  webviewLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  tabNavigatorLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    zIndex: 50,
    elevation: 50,
  },
  transparentTabScene: {
    backgroundColor: 'transparent',
  },
  hiddenDefaultTabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
  },
  webviewVisible: {
    opacity: 1,
    zIndex: 1,
    elevation: 1,
  },
  webviewHidden: {
    opacity: 0,
    zIndex: -1,
    elevation: 0,
  },
  exhibitionBackTouchCatcher: {
    position: 'absolute',
    top: 92,
    left: 0,
    width: 148,
    height: 140,
    zIndex: 90,
    elevation: 90,
    backgroundColor: 'transparent',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F1EC',
    zIndex: 100,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingOverlayOpaque: {
    backgroundColor: '#F5F1EC',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3E352F',
  },
  webOverlayHeader: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
  },
  prewarmContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -1,
    left: -9999,
    top: -9999,
  },
  prewarmWebview: {
    width: 1,
    height: 1,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E352F',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1EC',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2F24',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: '#8A7B6B',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBtn: {
    backgroundColor: '#A3834C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
