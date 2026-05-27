/**
 * Injected into WebView BEFORE page loads
 * - Detects React Native WebView
 * - Removes mobile bottom nav padding
 * - Handles route changes
 */

// prettier-ignore
export const RN_WEBVIEW_PRE_INJECT = `
(function(){
  try{
    var __RN_DEBUG = false;
    try { __RN_DEBUG = !!window.__WITHART_RN_DEBUG__; } catch(e) {}
    document.documentElement.classList.add('rn-webview');
    document.documentElement.style.setProperty('--bottom-nav-h','0px');
    document.documentElement.style.setProperty('--mobile-extra-padding','0px');
    // Prevent overscroll/bounce effect in React Native WebView
    document.documentElement.style.setProperty('overscroll-behavior','none');
    document.documentElement.style.setProperty('-webkit-overflow-scrolling','touch');
    document.body.style.setProperty('overscroll-behavior','none');
    document.body.style.setProperty('-webkit-overflow-scrolling','touch');
    try {
      if (__RN_DEBUG && window && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_DETECT', source: 'native-preinject', detected: true, ts: Date.now() }));
      }
      if (__RN_DEBUG && window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
        window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_DETECT', source: 'native-preinject', detected: true, ts: Date.now() }));
      }
    } catch(e) {}
    // Remove any inline padding/margin that might have been applied earlier by web scripts and observe for changes
    function clearBottomStyles(){
      try{
        var sel = '.mobile-padding-bottom, .mobile-footer-offset, .mobile-overflow-hidden, .pb-6, footer[role="contentinfo"], .bottom-navigation, .bottom-nav';
        document.querySelectorAll(sel).forEach(function(el){
          try{
            el.style.paddingBottom = '0px';
            el.style.marginBottom = '0px';
            el.style.minHeight = '0px';
            el.style.height = 'auto';
            if (el.matches('footer[role="contentinfo"], .bottom-navigation, .bottom-nav')) {
              el.style.display = 'none';
            }
          }catch(e){}
        });
      }catch(e){}
    }
    function scanAndFixInlinePadding(){
      try{
        var all = document.querySelectorAll('*');
        var reports = [];
        all.forEach(function(el){
          try{
            var inline = el.style && el.style.paddingBottom;
            if (inline && inline.length){
              var lower = inline.toLowerCase();
              var shouldFix = lower.indexOf('var(--bottom-nav-h') !== -1 || lower.indexOf('var(--booking-footer-h') !== -1;
              var computed = 0;
              try { computed = parseFloat(window.getComputedStyle(el).paddingBottom) || 0; } catch(e){}
              if (shouldFix || computed >= 48){
                el.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
                el.style.marginBottom = '0px';
                reports.push({ tag: el.tagName, inline: inline, computedBefore: computed });
              }
            }
          }catch(e){}
        });
        if (__RN_DEBUG && reports.length){
          try {
            if (window && typeof window.ReactNativeWebView === 'object' && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_FIX_REPORT', source: 'native-preinject', reports: reports.slice(0,20), ts: Date.now() }));
            }
            if (window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
              window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_FIX_REPORT', source: 'native-preinject', reports: reports.slice(0,20), ts: Date.now() }));
            }
          } catch(e){}
        }
      }catch(e){}
    }
    try { clearBottomStyles(); } catch(e){}
    try { scanAndFixInlinePadding(); } catch(e){}
    try {
      var mo = new MutationObserver(function(){ clearBottomStyles(); try{ scanAndFixInlinePadding(); }catch(e){} });
      mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    } catch(e){}
    try {
      var __bottomFixRuns = 0;
      var __bottomFixInterval = setInterval(function(){
        __bottomFixRuns += 1;
        clearBottomStyles();
        try{ scanAndFixInlinePadding(); }catch(e){}
        if (__bottomFixRuns >= 20) {
          try { clearInterval(__bottomFixInterval); } catch(e){}
        }
      }, 1000);
    } catch(e){}
    // Report CSS variable values and computed paddings for key selectors
    try {
      function reportVarsNative() {
        try {
          var vars = {
            bottomNavH: getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-h') || '',
            mobileExtraPadding: getComputedStyle(document.documentElement).getPropertyValue('--mobile-extra-padding') || '',
            safeAreaBottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '',
          };
          var selectors = ['.mobile-padding-bottom', '.mobile-footer-offset', '.mobile-overflow-hidden', 'footer[role="contentinfo"]', '.bottom-navigation', '.bottom-nav', '.min-h-\\[100dvh\\]'];
          var details = [];
          selectors.forEach(function(sel){
            try{
              var el = document.querySelector(sel);
              if (el) {
                var cs = window.getComputedStyle(el);
                details.push({ selector: sel, paddingBottom: cs.paddingBottom, marginBottom: cs.marginBottom, inline: (el.style && el.style.paddingBottom) || '' });
              } else {
                details.push({ selector: sel, found: false });
              }
            }catch(e){}
          });
          if (__RN_DEBUG && window && typeof window.ReactNativeWebView === 'object' && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_VAR_REPORT', source: 'native-preinject', vars: vars, details: details, ts: Date.now() }));
          }
          if (__RN_DEBUG && window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
            window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_VAR_REPORT', source: 'native-preinject', vars: vars, details: details, ts: Date.now() }));
          }
        } catch(e){}
      }
      try { reportVarsNative(); } catch(e){}
      try { setTimeout(reportVarsNative, 300); } catch(e){}
    } catch(e){}
  // Post-load fixer: run once after full load to clean up any remaining inline paddings/overlays for booking page
  try {
    var RN_POST_LOAD_FIX = "(function(){try{var sel = '.rn-hide-overlay .mobile-padding-bottom, .rn-hide-overlay .mobile-footer-offset, .rn-hide-overlay .mobile-overflow-hidden, .rn-hide-overlay .pb-6'; document.querySelectorAll(sel).forEach(function(el){try{el.style.paddingBottom='env(safe-area-inset-bottom,0px)'; el.style.marginBottom='0px';}catch(e){} }); document.querySelectorAll('.rn-hide-overlay div.fixed.inset-0').forEach(function(el){try{el.style.display='none'; el.style.pointerEvents='none'; el.style.height='0px'; el.style.minHeight='0px';}catch(e){} });}catch(e){}})(); true;";
    try { window.__RN_POST_LOAD_FIX = RN_POST_LOAD_FIX; } catch(e){}
  } catch(e){}
    // Diagnostic: report elements that may be causing bottom spacing
    try {
      function generatePath(el) {
        if (!el) return '';
        var path = [];
        var curr = el;
        while (curr && curr.nodeType === 1 && curr !== document.documentElement) {
          var tag = curr.tagName.toLowerCase();
          var id = curr.id ? '#' + curr.id : '';
          var cls = curr.className && typeof curr.className === 'string' ? '.' + curr.className.trim().split(/\\s+/).join('.') : '';
          path.unshift(tag + id + cls);
          curr = curr.parentElement;
        }
        return path.join(' > ');
      }
      function reportBottomDiagnostics() {
        try {
          var viewportH = window.innerHeight || document.documentElement.clientHeight;
          var candidates = [];
          var all = document.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            try {
              var cs = window.getComputedStyle(el);
              var pb = parseFloat(cs.paddingBottom) || 0;
              var mb = parseFloat(cs.marginBottom) || 0;
              var pos = cs.position;
              var rect = el.getBoundingClientRect();
              var fixedBottom = (pos === 'fixed' || pos === 'sticky') && rect.bottom >= viewportH - 1;
              var overlapsBottom = rect.bottom >= viewportH - 1 && rect.height > 0;
              if (pb > 0 || mb > 0 || fixedBottom || overlapsBottom) {
                candidates.push({
                  tag: el.tagName,
                  path: generatePath(el),
                  paddingBottom: pb,
                  marginBottom: mb,
                  position: pos,
                  rect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height), width: Math.round(rect.width) },
                  inlinePadding: (el.style && el.style.paddingBottom) || ''
                });
              }
            }catch(e){}
          }
          if (__RN_DEBUG && candidates.length) {
            try {
              if (window && typeof window.ReactNativeWebView === 'object' && typeof window.ReactNativeWebView.postMessage === 'function') {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_DIAG_REPORT', source: 'native-preinject', items: candidates.slice(0,50), ts: Date.now() }));
              }
              if (window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
                window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RN_DIAG_REPORT', source: 'native-preinject', items: candidates.slice(0,50), ts: Date.now() }));
              }
            } catch(e){}
          } else {
            try { console.debug('[withart] RN_DIAG_REPORT: no obvious candidates (native-preinject)'); } catch(e){}
          }
        } catch(e){}
      }
      try { reportBottomDiagnostics(); } catch(e){}
      try { setTimeout(reportBottomDiagnostics, 500); } catch(e){}
    } catch(e){}
  }catch(e){}
  // Robust fallback for exhibition detail back buttons inside RN WebView.
  try {
    function __withartPostNative(msg) {
      try {
        var payload = JSON.stringify(msg);
        if (window && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(payload);
          return true;
        }
        if (window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
          window.webkit.messageHandlers.ReactNativeWebView.postMessage(payload);
          return true;
        }
      } catch(e){}
      return false;
    }
    function __withartCurrentPath() {
      try {
        return (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
      } catch(e) {
        return '';
      }
    }
    function __withartGoBackOrFallback() {
      try {
        var fallbackPath = '/dashboard';
        try {
          var params = new URLSearchParams(window.location.search || '');
          var returnTo = params.get('returnTo');
          if (returnTo && returnTo.charAt(0) === '/') fallbackPath = returnTo;
        } catch(e) {}
        if (window.history && window.history.length > 1) {
          window.history.back();
          setTimeout(function(){
            try {
              if ((window.location.pathname || '') !== '/exhibition-detail') return;
              if (typeof window.__WITHART_HANDLE_NATIVE_NAV === 'function') {
                window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = true;
                window.__WITHART_HANDLE_NATIVE_NAV(fallbackPath);
                setTimeout(function(){
                  try { window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = false; } catch(e) {}
                }, 120);
              } else {
                window.location.href = fallbackPath;
              }
              __withartPostNative({ type: 'NAVIGATE_TAB', pathname: fallbackPath });
            } catch(e) {}
          }, 350);
          return;
        }
        if (typeof window.__WITHART_HANDLE_NATIVE_NAV === 'function') {
          window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = true;
          window.__WITHART_HANDLE_NATIVE_NAV(fallbackPath);
          setTimeout(function(){
            try { window.__WITHART_NATIVE_NAV_IN_PROGRESS__ = false; } catch(e) {}
          }, 120);
        } else {
          window.location.href = fallbackPath;
        }
        __withartPostNative({ type: 'NAVIGATE_TAB', pathname: fallbackPath });
      } catch(e) {}
    }
    function __withartInstallExhibitionBackBridge() {
      try {
        if (window.__WITHART_EXHIBITION_BACK_BRIDGE__) return;
        window.__WITHART_EXHIBITION_BACK_BRIDGE__ = true;

        document.addEventListener('click', function(event) {
          try {
            if ((window.location.pathname || '') !== '/exhibition-detail') return;
            var target = event.target;
            var button = target && target.closest ? target.closest('button') : null;
            if (!button) return;

            var label = (button.getAttribute('aria-label') || '').toLowerCase();
            var text = (button.textContent || '').replace(/\\s+/g, '').toLowerCase();
            var inHeader = false;
            try { inHeader = !!button.closest('header'); } catch(e) {}

            var rect = null;
            try { rect = button.getBoundingClientRect(); } catch(e) {}
            var leftHeaderButton = !!(inHeader && rect && rect.left < 120 && rect.top < 140);
            var isBackButton =
              label.indexOf('뒤로') !== -1 ||
              label.indexOf('back') !== -1 ||
              text === '뒤로' ||
              text.indexOf('돌아가기') !== -1 ||
              leftHeaderButton;

            if (!isBackButton) return;
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
              event.stopImmediatePropagation();
            }
            __withartGoBackOrFallback();
          } catch(e) {}
        }, true);
      } catch(e) {}
    }
    __withartInstallExhibitionBackBridge();
  } catch(e) {}
  // --- Route -> Native tab sync: post active tab to native when path changes ---
  try {
    var __last_pathname = ((location && location.pathname) ? location.pathname : '') + ((location && location.search) ? location.search : '');
    function __nativeTabForPath(p) {
      try {
        var path = p || '/';
        if (path.indexOf('/map') === 0) return 'Map';
        if (path.indexOf('/dashboard') === 0) return 'Dashboard';
        if (path.indexOf('/manager-booking-approval') === 0) return 'Dashboard';
        if (path.indexOf('/profile') === 0) return 'Profile';
        if (path === '/' || path.indexOf('/?') === 0) return 'Home';
      } catch(e){}
      return null;
    }
    function __normalizeNativePath(url) {
      try {
        var u = new URL(String(url), window.location.href);
        return (u.pathname || '/') + (u.search || '') + (u.hash || '');
      } catch(e) {
        return typeof url === 'string' ? url : null;
      }
    }
    function __postNativeMessage(msg) {
      try {
        var payload = JSON.stringify(msg);
        if (window && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(payload);
          return true;
        }
        if (window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
          window.webkit.messageHandlers.ReactNativeWebView.postMessage(payload);
          return true;
        }
      } catch(e){}
      return false;
    }
    function __shouldNativeOwnNavigation(target) {
      try {
        if (window.__WITHART_NATIVE_NAV_IN_PROGRESS__) return false;
        var targetPath = __normalizeNativePath(target);
        if (!targetPath) return false;
        var targetTab = __nativeTabForPath(targetPath);
        var currentTab = __nativeTabForPath((location && location.pathname) ? location.pathname : '/');
        return !!targetTab && !!currentTab && targetTab !== currentTab;
      } catch(e){}
      return false;
    }
    function __postActiveTabIfChanged() {
      try {
        var p = (location && location.pathname) ? location.pathname : '/';
        var currentKey = p + ((location && location.search) ? location.search : '');
        if (currentKey !== __last_pathname) {
          __last_pathname = currentKey;
          var tabMap = {'/':'Home','/map':'Map','/dashboard':'Dashboard','/profile':'Profile'};
          var tab = null;
          for (var k in tabMap) {
            if (Object.prototype.hasOwnProperty.call(tabMap, k)) {
              if (p === k || p.indexOf(k + '/') === 0) { tab = tabMap[k]; break; }
            }
          }
          try {
            if (tab && window && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SET_ACTIVE_TAB', tab: tab }));
            }
            if (tab && window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
              window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SET_ACTIVE_TAB', tab: tab }));
            }
          } catch(e){}
          // Also send tab visibility based on route
          try {
            var hideOnRoutes = ['/login','/onboarding','/find-password','/reset-password','/select-type','/select-type/guest','/select-type/artist','/bookingdate','/bookingdate2','/confirm-booking','/booking','/payment/success','/bookingdetail','/refund','/dashboard/add','/dashboard/add-store','/manager-booking-approval','/auth/link/naver','/auth/link-account','/auth/callback/naver'];
            var normalized = p && p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p || '/';
            var host = (location && location.hostname ? location.hostname : '').toLowerCase();
            var isAppHost = host === 'withart.vercel.app' || host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2' || host.endsWith('.vercel.app');
            var isPaymentCheckout = !!host && !isAppHost;
            var isMapPlaceDetail = normalized === '/map' && !!(location && location.search && location.search.indexOf('placeId=') !== -1);
            var shouldShowTabs = !isPaymentCheckout && !isMapPlaceDetail && !hideOnRoutes.some(function(route) {
              return normalized === route || normalized.indexOf(route + '/') === 0;
            });
            try {
              document.documentElement.classList.toggle('withart-hide-bottom-nav', !shouldShowTabs);
              var style = document.getElementById('__withart_hide_bottom_nav__');
              if (!style) {
                style = document.createElement('style');
                style.id = '__withart_hide_bottom_nav__';
                style.textContent = [
                  'html.withart-hide-bottom-nav footer.fixed.bottom-0.left-0.right-0,',
                  'html.withart-hide-bottom-nav div.fixed.bottom-0.left-0.right-0.z-0 {',
                  '  display: none !important;',
                  '  pointer-events: none !important;',
                  '}'
                ].join('\\n');
                (document.head || document.documentElement).appendChild(style);
              }
            } catch(e) {}
            var msg = { type: 'SET_TABS_VISIBILITY', visible: shouldShowTabs, pathname: isPaymentCheckout ? '__external_payment__' : normalized };
            if (window && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify(msg));
            }
            if (window && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
              window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify(msg));
            }
          } catch(e){}
        }
      } catch(e){}
    }
    try { __postActiveTabIfChanged(); } catch(e){}
    try { var __origPush = history.pushState; history.pushState = function() { try { if (__shouldNativeOwnNavigation(arguments[2])) { var p = __normalizeNativePath(arguments[2]); __postNativeMessage({ type: 'NAVIGATE_TAB', pathname: p }); try { window.__RN_NAV_ACK = true; } catch(e){} return; } } catch(e){} var r = __origPush.apply(this, arguments); try { __postActiveTabIfChanged(); } catch(e){} return r; }; } catch(e){}
    try { var __origReplace = history.replaceState; history.replaceState = function() { try { if (__shouldNativeOwnNavigation(arguments[2])) { var p = __normalizeNativePath(arguments[2]); __postNativeMessage({ type: 'NAVIGATE_TAB', pathname: p }); try { window.__RN_NAV_ACK = true; } catch(e){} return; } } catch(e){} var r = __origReplace.apply(this, arguments); try { __postActiveTabIfChanged(); } catch(e){} return r; }; } catch(e){}
    try { window.addEventListener('popstate', __postActiveTabIfChanged); } catch(e){}
    try { setInterval(__postActiveTabIfChanged, 1500); } catch(e){}
  } catch(e){}
})(); true;
`;
