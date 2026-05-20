import React, { useRef, useCallback, useContext, useEffect } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../contexts/AuthContext';
import { useAuthFlowStore } from '../store/authFlowStore';
import { RN_WEBVIEW_PRE_INJECT } from '../injected-scripts/preInject';
import { THEME_COLOR_SCRIPT } from '../injected-scripts/themeColor';
import { webviewControllerRegistry } from '../lib/webviewController';
import { useWebviewReady } from '../contexts/WebviewReadyContext';

const CUSTOM_USER_AGENT =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1 WithartApp/1.0'
    : 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 WithartApp/1.0';

const WEBVIEW_DEBUG_BRIDGE_SCRIPT = `(function() {
  if (window.__RN_WEBVIEW_DEBUG_BRIDGE__) return;
  var __RN_DEBUG = false;
  try { __RN_DEBUG = !!window.__WITHART_RN_DEBUG__; } catch (_) {}
  window.__RN_WEBVIEW_DEBUG_BRIDGE__ = true;
  if (!__RN_DEBUG) return;

  var post = function(type, payload) {
    try {
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
      }
    } catch (_) {}
  };

  window.addEventListener('error', function(e) {
    post('WEBVIEW_ERROR', {
      message: e && e.message ? e.message : 'Unknown window error',
      source: e && e.filename ? e.filename : null,
      line: e && typeof e.lineno === 'number' ? e.lineno : null,
      column: e && typeof e.colno === 'number' ? e.colno : null,
      stack: e && e.error && e.error.stack ? e.error.stack : null
    });
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e ? e.reason : null;
    post('WEBVIEW_UNHANDLED_REJECTION', {
      message: reason && reason.message ? reason.message : String(reason),
      stack: reason && reason.stack ? reason.stack : null
    });
  });

  var originalLog = console.log;
  var originalWarn = console.warn;
  var originalError = console.error;

  console.log = function() {
    try { post('WEBVIEW_CONSOLE', { level: 'log', args: Array.prototype.slice.call(arguments) }); } catch (_) {}
    return originalLog && originalLog.apply(console, arguments);
  };

  console.warn = function() {
    try { post('WEBVIEW_CONSOLE', { level: 'warn', args: Array.prototype.slice.call(arguments) }); } catch (_) {}
    return originalWarn && originalWarn.apply(console, arguments);
  };

  console.error = function() {
    try { post('WEBVIEW_CONSOLE', { level: 'error', args: Array.prototype.slice.call(arguments) }); } catch (_) {}
    return originalError && originalError.apply(console, arguments);
  };
})();true;`;

const DASHBOARD_SAFE_TOP_SCRIPT = `(function(){
  function applyDashboardSafeTop() {
    try {
      var path = (window.location && window.location.pathname) || '';
      if (path !== '/dashboard' && path.indexOf('/dashboard/') !== 0) return;

      var headers = Array.prototype.slice.call(document.querySelectorAll('header'));
      var mobileHeader = null;
      for (var i = 0; i < headers.length; i += 1) {
        var h = headers[i];
        var style = window.getComputedStyle ? window.getComputedStyle(h) : null;
        if (style && style.display === 'none') continue;
        if (h.className && String(h.className).indexOf('lg:hidden') !== -1) {
          mobileHeader = h;
          break;
        }
      }

      if (!mobileHeader) return;
      mobileHeader.style.paddingTop = 'calc(max(env(safe-area-inset-top, 0px), 32px) + 0.5rem)';
      mobileHeader.style.minHeight = 'calc(max(env(safe-area-inset-top, 0px), 32px) + 56px)';
      mobileHeader.style.boxSizing = 'border-box';
    } catch (e) {}
  }

  applyDashboardSafeTop();
  try { document.addEventListener('DOMContentLoaded', applyDashboardSafeTop, { once: true }); } catch (e) {}
  try { setTimeout(applyDashboardSafeTop, 80); } catch (e) {}
  try { setTimeout(applyDashboardSafeTop, 400); } catch (e) {}
  try { setTimeout(applyDashboardSafeTop, 1200); } catch (e) {}
})();true;`;

type Props = {
  url: string;
  name?: string;
  targetPath?: string;
  authPayload?: AuthSessionPayload | null;
  onCustomMessage?: (type: string, data?: any) => void;
  onPathChange?: (pathname: string) => void;
  onReady?: () => void;
  deferInitialLoad?: boolean;
};

const LOGIN_PATH_PREFIXES = ['/login', '/auth'];
const DEFERRED_INITIAL_LOAD_MS: Record<string, number> = {
  map: 800,
  dashboard: 5000,
  profile: 6500,
};

type AuthSessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
};

function buildAuthSessionScript(payload?: AuthSessionPayload | null, name?: string, targetPath = '/'): string {
  const accessToken = payload?.accessToken;
  const refreshToken = payload?.refreshToken;
  const tokenExpiresAt = payload?.tokenExpiresAt;
  const webviewName = name || 'unnamed';

  if (!accessToken || !refreshToken || !tokenExpiresAt) {
    return `(function(){
      try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'AUTH_BOOTSTRAP',
            webview: ${JSON.stringify(webviewName)},
            status: 'skipped',
            reason: 'missing-payload'
          }));
        }
      } catch (e) {}
    })();true;`;
  }

  const expiresAtRaw = parseInt(tokenExpiresAt, 10);
  const expiresAtMs =
    Number.isFinite(expiresAtRaw) && expiresAtRaw < 1_000_000_000_000
      ? expiresAtRaw * 1000
      : expiresAtRaw;
  const expiresIn = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(expiresAtMs / 1000),
    expires_in: expiresIn,
    token_type: 'bearer',
  };

  return `(function(){
    try {
      try {
        var authStyle = document.getElementById('__withart_auth_bootstrap_style__');
        if (!authStyle) {
          authStyle = document.createElement('style');
          authStyle.id = '__withart_auth_bootstrap_style__';
          authStyle.textContent = [
            'html.__withart-auth-bootstrapping, html.__withart-auth-bootstrapping body { background: #e8e3da !important; }',
            'html.__withart-auth-bootstrapping body > * { opacity: 0 !important; visibility: hidden !important; }'
          ].join('\\n');
          (document.head || document.documentElement).appendChild(authStyle);
        }
      } catch (e) {}

      var accessToken = ${JSON.stringify(accessToken)};
      var refreshToken = ${JSON.stringify(refreshToken)};
      var expiresAt = ${JSON.stringify(String(expiresAtMs))};
      var sessionJson = ${JSON.stringify(JSON.stringify(session))};
      var supabaseStorageKey = 'sb-gnhwzbvlaqdnkahurlbv-auth-token';

      if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) <= Date.now()) {
        throw new Error('expired-auth-payload');
      }

      localStorage.setItem(supabaseStorageKey, sessionJson);
      localStorage.setItem('sb-access-token', accessToken);
      localStorage.setItem('sb-refresh-token', refreshToken);
      localStorage.setItem('sb-expires-at', expiresAt);
      localStorage.setItem('sb-session', sessionJson);
      localStorage.setItem('supabase.auth.token', sessionJson);

      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (key && key.indexOf('sb-') === 0 && key.lastIndexOf('-auth-token') === key.length - 11) {
          localStorage.setItem(key, sessionJson);
        }
      }

      try { window.dispatchEvent(new Event('storage')); } catch (e) {}
      try { window.dispatchEvent(new Event('authstatechange')); } catch (e) {}

      var targetPath = ${JSON.stringify(targetPath)};
      var pathname = (window.location && window.location.pathname) || '/';
      var isLoginPath = pathname === '/login' || pathname.indexOf('/login/') === 0 || pathname === '/auth' || pathname.indexOf('/auth/') === 0;
      if (isLoginPath) {
        try { document.documentElement.classList.add('__withart-auth-bootstrapping'); } catch (e) {}
      } else {
        try { document.documentElement.classList.remove('__withart-auth-bootstrapping'); } catch (e) {}
      }
      if (isLoginPath && targetPath) {
        setTimeout(function(){
          try {
            window.location.replace(targetPath);
          } catch (e) {}
        }, 250);
      }

      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'AUTH_BOOTSTRAP',
          webview: ${JSON.stringify(webviewName)},
          status: 'ok',
          expiresAt: expiresAt,
          pathname: pathname,
          targetPath: targetPath,
          redirectedFromLogin: isLoginPath
        }));
      }
    } catch (e) {
      try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'AUTH_BOOTSTRAP',
            webview: ${JSON.stringify(webviewName)},
            status: 'error',
            error: e && e.message ? e.message : String(e)
          }));
        }
      } catch (_) {}
    }
  })();true;`;
}

function isLoginLikePath(pathname: string): boolean {
  const normalized = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return LOGIN_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function getPathnameForTab(tab?: string): string | null {
  if (tab === 'Home') return '/';
  if (tab === 'Map') return '/map';
  if (tab === 'Dashboard') return '/dashboard';
  if (tab === 'Profile') return '/profile';
  return null;
}

function getOwnerNameForPath(pathname?: string): string {
  const path = pathname || '/';
  if (path.startsWith('/map')) return 'map';
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path.startsWith('/profile')) return 'profile';
  return 'main';
}

export default function WebViewScreen({ url, name, targetPath = '/', authPayload, onCustomMessage, onPathChange, onReady, deferInitialLoad = true }: Props) {
  const webViewRef = useRef<WebView>(null);
  const shouldDeferInitialLoad = deferInitialLoad && !!name && name !== 'main';
  const [sourceUri, setSourceUri] = React.useState(shouldDeferInitialLoad ? 'about:blank' : url);
  const sourceUriRef = useRef(sourceUri);
  const currentPathRef = useRef<string | null>(null);
  const { onLogout } = useContext(AuthContext);
  const { setIsWebviewReady } = useWebviewReady();
  const authHydrationPending = useAuthFlowStore((s) => s.authHydrationPending);
  const prevAuthHydrationRef = useRef<boolean>(true);
  const readySentRef = useRef(false);
  const lastInjectedAuthKeyRef = useRef<string | null>(null);
  const lastInjectedAuthAtRef = useRef(0);
  const lastKnownPathRef = useRef<string | null>(null);
  const authPayloadRef = useRef<AuthSessionPayload | null | undefined>(authPayload);

  useEffect(() => {
    sourceUriRef.current = sourceUri;
  }, [sourceUri]);

  useEffect(() => {
    authPayloadRef.current = authPayload;
  }, [authPayload]);

  useEffect(() => {
    if (!shouldDeferInitialLoad) {
      setSourceUri(url);
      return;
    }

    setSourceUri('about:blank');
    const delay = name ? DEFERRED_INITIAL_LOAD_MS[name] ?? 6500 : 0;
    const timer = setTimeout(() => {
      setSourceUri((current) => (current === 'about:blank' ? url : current));
    }, delay);

    return () => clearTimeout(timer);
  }, [name, shouldDeferInitialLoad, url]);

  // ✅ 1. redirectFromLoginIfNeeded 먼저 선언
  const redirectFromLoginIfNeeded = useCallback(() => {
    const js = `(function(){
      try {
        var p = window.location.pathname || '/';
        var isLogin = p === '/login' || p === '/login/social-only' || p.indexOf('/login/') === 0 || p === '/auth' || p.indexOf('/auth/') === 0;
        if (isLogin) {
          window.location.replace('/');
        }
      } catch (e) {}
    })();true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const navigateToPath = useCallback((path: string) => {
    try {
      const safePath = path === 'blank' || path === '/blank' ? 'blank' : path && path.startsWith('/') ? path : '/';
      currentPathRef.current = safePath;
      if (sourceUriRef.current === 'about:blank') {
        setSourceUri(safePath === 'blank' ? 'about:blank' : new URL(safePath, url).toString());
        return;
      }
      const js = `(function(){
        try {
          var target = ${JSON.stringify(safePath)};
          if (target === 'blank') {
            try { window.location.replace('about:blank'); } catch (e) {}
            return;
          }
          var current = (window.location.pathname || '/') + (window.location.search || '');
          if (current === target) {
            if (target.indexOf('/map?') === 0) {
              try {
                var url = new URL(target, window.location.href);
                var placeId = url.searchParams.get('placeId');
                if (placeId) {
                  window.dispatchEvent(new CustomEvent('WITHART_OPEN_MAP_PLACE', { detail: { placeId: placeId } }));
                }
              } catch (e) {}
            }
            return;
          }

          try {
            window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = true;
            try {
              window.history.pushState({}, '', target);
              window.dispatchEvent(new PopStateEvent('popstate'));
              window.dispatchEvent(new Event('pushstate'));
            } finally {
              setTimeout(function(){
                try { window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = false; } catch (e) {}
              }, 0);
            }
          } catch (e) {}

          setTimeout(function(){
            try {
              var now1 = (window.location.pathname || '/') + (window.location.search || '');
              if (now1 === target) return;
              var a = document.createElement('a');
              a.href = target;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              setTimeout(function(){
                try { document.body.removeChild(a); } catch(e) {}
              }, 0);
            } catch (e) {}
          }, 16);

          if (target === '/') {
            setTimeout(function(){
              try {
                var now2 = (window.location.pathname || '/') + (window.location.search || '');
                if (now2 === target) return;
                window.location.replace(target);
              } catch (e) {}
            }, 260);
          }
        } catch (e) {}
      })();true;`;
      webViewRef.current?.injectJavaScript(js);
    } catch (_) {}
  }, [url]);

  const reload = useCallback(() => {
    try {
      webViewRef.current?.reload();
    } catch (_) {}
  }, []);

  // ✅ 2. injectSession 선언
  const injectSession = useCallback((payload?: AuthSessionPayload) => {
    try {
      const accessToken = payload?.accessToken;
      const refreshToken = payload?.refreshToken;
      const expiresAt = payload?.tokenExpiresAt;
      if (!accessToken || !refreshToken || !expiresAt) return;

      const expiresAtRaw = parseInt(expiresAt, 10);
      if (!Number.isFinite(expiresAtRaw)) return;
      if (expiresAtRaw <= Date.now()) return;

      const dedupeKey = `${accessToken.slice(0, 10)}:${refreshToken.slice(0, 10)}:${expiresAt}`;
      const now = Date.now();
      if (lastInjectedAuthKeyRef.current === dedupeKey && now - lastInjectedAuthAtRef.current < 4000) {
        return;
      }
      lastInjectedAuthKeyRef.current = dedupeKey;
      lastInjectedAuthAtRef.current = now;

      const js = buildAuthSessionScript(payload, name, targetPath);
      webViewRef.current?.injectJavaScript(js);

    } catch (_) {}
  }, [name, targetPath]);

  // ✅ 3. useEffect (registry 등록)
  useEffect(() => {
    if (!name) return;
    webviewControllerRegistry.set(name, {
      redirectFromLoginIfNeeded,
      injectSession,
      navigateToPath,
      reload,
      getCurrentPath: () => currentPathRef.current,
    });
    return () => {
      webviewControllerRegistry.set(name, null);
    };
  }, [name, redirectFromLoginIfNeeded, injectSession, navigateToPath, reload]);

  // authHydrationPending이 false로 변하면 → 로그인 완료 → 모든 WebView에 세션 주입
  useEffect(() => {
    if (prevAuthHydrationRef.current && !authHydrationPending) {
      injectAuth({ force: true });
    }
    prevAuthHydrationRef.current = authHydrationPending;
  }, [authHydrationPending]);

  useFocusEffect(
    useCallback(() => {
      if (authHydrationPending) return;
      if (name !== 'main') return;
      injectAuth({ force: false });
    }, [url, authHydrationPending, name])
  );

  const injectAuth = async (options?: { force?: boolean }) => {
    try {
      if (!options?.force && currentPathRef.current && isLoginLikePath(currentPathRef.current)) {
        return;
      }
      const payload = authPayloadRef.current;
      if (payload?.accessToken && payload?.refreshToken && payload?.tokenExpiresAt) {
        injectSession(payload);
        return;
      }

      const [accessToken, refreshToken, tokenExpiresAt] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('tokenExpiresAt'),
      ]);
      injectSession({
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
        tokenExpiresAt: tokenExpiresAt || undefined,
      });
    } catch (_) {}
  };

  const handleNavChange = useCallback((navState: WebViewNavigation) => {
    try {
      const parsed = new URL(navState.url);
      const pathname = parsed.pathname || '/';
      const fullPath = `${pathname}${parsed.search || ''}`;
      const ownerName = getOwnerNameForPath(pathname);

      if (name && ownerName !== name) {
        onCustomMessage?.('NAVIGATE_TAB', { type: 'NAVIGATE_TAB', pathname: fullPath });
        currentPathRef.current = targetPath;
        lastKnownPathRef.current = targetPath;
        setTimeout(() => navigateToPath(targetPath), 0);
        return;
      }

      currentPathRef.current = pathname;
      lastKnownPathRef.current = pathname;
      onPathChange?.(pathname);

      // 로그인 플로우에서는 main WebView가 /login|/auth를 벗어났을 때만 READY
      if (name === 'main' && !isLoginLikePath(pathname)) {
        setIsWebviewReady(true);
      }
    } catch (_) {}
  }, [name, navigateToPath, onCustomMessage, onPathChange, setIsWebviewReady, targetPath]);

  const handleShouldStartLoadWithRequest = useCallback((request: any) => {
    try {
      const requestUrl = typeof request?.url === 'string' ? request.url : '';
      if (!requestUrl || requestUrl === 'about:blank') return true;

      const parsed = new URL(requestUrl);
      const base = new URL(url);
      if (parsed.origin !== base.origin) return true;

      const pathname = `${parsed.pathname || '/'}${parsed.search || ''}`;
      const ownerName = getOwnerNameForPath(parsed.pathname || '/');
      if (name && ownerName !== name) {
        onCustomMessage?.('NAVIGATE_TAB', { type: 'NAVIGATE_TAB', pathname });
        return false;
      }
    } catch (_) {}

    return true;
  }, [name, onCustomMessage, url]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (!msg?.type) return;

        const restoreOwnRouteIfCrossTabNavigation = (pathname?: string) => {
          try {
            if (!name || !pathname) return;
            if (getOwnerNameForPath(pathname) === name) return;

            const ownPath = targetPath || '/';
            const js = `(function(){
              try {
                var ownPath = ${JSON.stringify(targetPath || '/')};
                var current = (window.location.pathname || '/') + (window.location.search || '');
                if (current === ownPath) return;
                try {
                  window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = true;
                  window.location.replace(ownPath);
                } catch (e) {
                  try {
                    window.history.replaceState({}, '', ownPath);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    window.dispatchEvent(new Event('replaceState'));
                  } catch (_) {}
                } finally {
                  setTimeout(function(){
                    try { window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = false; } catch (e) {}
                  }, 0);
                }
              } catch (e) {}
            })();true;`;

            setTimeout(() => webViewRef.current?.injectJavaScript(js), 450);
            setTimeout(() => webViewRef.current?.injectJavaScript(js), 1200);
            setTimeout(() => webViewRef.current?.injectJavaScript(js), 2000);
          } catch (_) {}
        };

        if (msg.type === 'PRE_NAVIGATE' && msg.pathname) {
          try {
            webViewRef.current?.injectJavaScript(
              `(function(){try{window.__RN_NAV_ACK=true;}catch(e){}})();true;`,
            );
          } catch (_) {}
          onCustomMessage?.('NAVIGATE_TAB', msg);
          restoreOwnRouteIfCrossTabNavigation(msg.pathname);
          return;
        }

        if (msg.type === 'NAVIGATE_TAB' && msg.pathname) {
          try {
            webViewRef.current?.injectJavaScript(
              `(function(){try{window.__RN_NAV_ACK=true;}catch(e){}})();true;`,
            );
          } catch (_) {}
          onCustomMessage?.('NAVIGATE_TAB', msg);
          restoreOwnRouteIfCrossTabNavigation(msg.pathname);
          return;
        }

        if (msg.type === 'SET_ACTIVE_TAB') {
          const pathname = getPathnameForTab(msg.tab);
          if (pathname) {
            onCustomMessage?.('NAVIGATE_TAB', { ...msg, pathname });
          }
          return;
        }

        // WebView 내부 디버그/에러 브리지 로그는 과도하게 쌓여
        // 실제 복구 로그 확인을 방해하므로 기본적으로 출력하지 않는다.
        if (
          msg.type === 'WEBVIEW_ERROR' ||
          msg.type === 'WEBVIEW_UNHANDLED_REJECTION' ||
          msg.type === 'WEBVIEW_CONSOLE'
        ) {
          return;
        }

        if (msg.type === 'AUTH_BOOTSTRAP') {
          console.log('[WebView Auth Bootstrap]', JSON.stringify(msg));
          return;
        }

        if (msg.type === 'LOGOUT') {
          onLogout();
          return;
        }

        if (onCustomMessage) {
          onCustomMessage(msg.type, msg);
        }
      } catch (_) {}
    },
    [name, onLogout, onCustomMessage, targetPath]
  );

  const handleLoadEnd = useCallback(async () => {
    if (sourceUriRef.current === 'about:blank') return;
    await injectAuth();

    if (!readySentRef.current) {
      readySentRef.current = true;
      onReady?.();
      onCustomMessage?.('WEBVIEW_READY');
    }

    // main은 경로 확인(onNavigationStateChange)에서만 READY 처리
    if (name !== 'main') {
      setIsWebviewReady(true);
    }
  }, [injectAuth, name, setIsWebviewReady, onReady, onCustomMessage]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: sourceUri }}
        style={styles.webview}
        userAgent={CUSTOM_USER_AGENT}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        onNavigationStateChange={handleNavChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        injectedJavaScriptBeforeContentLoaded={`${buildAuthSessionScript(authPayload, name, targetPath)}\n;${RN_WEBVIEW_PRE_INJECT}\n;${WEBVIEW_DEBUG_BRIDGE_SCRIPT}`}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
        injectedJavaScript={`${WEBVIEW_DEBUG_BRIDGE_SCRIPT}\n;${THEME_COLOR_SCRIPT}`}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView Error]', nativeEvent.description);
          setIsWebviewReady(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView HTTP Error]', nativeEvent.statusCode, nativeEvent.description);
          setIsWebviewReady(true);
        }}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        onRenderProcessGone={(event) => {
          console.error('[WebView Process Gone]', event.nativeEvent.didCrash);
          Alert.alert('앱 에러', 'WebView가 충돌했습니다. 다시 시도해주세요.');
        }}
        pullToRefreshEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1EC',
  },
  webview: {
    flex: 1,
  },
});
