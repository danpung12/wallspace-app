/**
 * Injected into WebView AFTER page loads
 * - Detects page background color for status bar synchronization
 * - Handles tab visibility based on route
 */

// prettier-ignore
export const THEME_COLOR_SCRIPT = `
(function() {
  var lastColor = null;
  var lastTabVisibilityKey = null;
  var rafPending = false;
  var rafRuns = 0;
  var mutationDetectTimer = null;

  // --- Tab visibility based on route ---
  var hideOnRoutes = ['/login','/onboarding','/find-password','/reset-password','/select-type','/select-type/guest','/select-type/artist','/bookingdate','/bookingdate2','/confirm-booking','/booking','/payment/success','/bookingdetail','/refund','/dashboard/add','/dashboard/add-store','/auth/link/naver','/auth/link-account','/auth/callback/naver'];
  var bookingFlowRoutes = ['/bookingdate','/bookingdate2','/confirm-booking','/booking','/payment/success','/bookingdetail','/refund'];

  function routeMatches(pathname, routes) {
    try {
      return routes.some(function(route) {
        return pathname === route || pathname.indexOf(route + '/') === 0;
      });
    } catch(e) { return false; }
  }

  function isExternalPaymentHost() {
    try {
      var host = (window.location && window.location.hostname ? window.location.hostname : '').toLowerCase();
      var isAppHost =
        host === 'withart.vercel.app' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '10.0.2.2' ||
        host.endsWith('.vercel.app');
      return !!host && !isAppHost;
    } catch(e) { return false; }
  }

  function applyBookingChromeVisibility(pathname) {
    try {
      var isBookingFlow = routeMatches(pathname, bookingFlowRoutes);
      document.documentElement.classList.toggle('withart-booking-flow', isBookingFlow);

      var style = document.getElementById('__withart_booking_flow_chrome__');
      if (!style) {
        style = document.createElement('style');
        style.id = '__withart_booking_flow_chrome__';
        style.textContent = [
          'html.withart-booking-flow div.fixed.bottom-20.right-4.z-40,',
          'html.withart-booking-flow div.fixed.bottom-28.right-4,',
          'html.withart-booking-flow div.fixed.right-8.bottom-8 {',
          '  display: none !important;',
          '  pointer-events: none !important;',
          '}'
        ].join('\\n');
        (document.head || document.documentElement).appendChild(style);
      }
    } catch(e) {}
  }

  function applyEmbeddedTabDomVisibility(visible) {
    try {
      document.documentElement.classList.toggle('withart-hide-bottom-nav', !visible);
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
  }

  function getCurrentPathname() {
    try {
      return window.location.pathname || '/';
    } catch(e) { return '/'; }
  }

  function sendTabVisibility(pathname) {
    try {
      var normalized = pathname && pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname || '/';
      applyBookingChromeVisibility(normalized);
      var isPaymentCheckout = isExternalPaymentHost();
      var isMapPlaceDetail = normalized === '/map' && !!(window.location && window.location.search && window.location.search.indexOf('placeId=') !== -1);
      var shouldShowTabs = !isPaymentCheckout && !isMapPlaceDetail && !routeMatches(normalized, hideOnRoutes);
      applyEmbeddedTabDomVisibility(shouldShowTabs);
      var key = (isPaymentCheckout ? 'external-payment:' + window.location.host + normalized : normalized + (window.location.search || '')) + ':' + (shouldShowTabs ? '1' : '0');
      if (lastTabVisibilityKey === key) return;
      lastTabVisibilityKey = key;
      var msg = { type: 'SET_TABS_VISIBILITY', visible: shouldShowTabs, pathname: isPaymentCheckout ? '__external_payment__' : normalized };
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView && typeof window.webkit.messageHandlers.ReactNativeWebView.postMessage === 'function') {
        window.webkit.messageHandlers.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch(e) {}
  }

  // Send initial tab visibility on page load
  (function(){
    var path = getCurrentPathname();
    sendTabVisibility(path);
  })();

  // Also check periodically in case of browser redirect (not captured by history hooks)
  setInterval(function() {
    try {
      var path = getCurrentPathname();
      sendTabVisibility(path);
    } catch(e) {}
  }, 2000);

  // Hook history to send visibility on route change (for SPA navigation)
  function hookHistory(method) {
    var original = window.history[method];
    if (typeof original !== 'function') return;
    try {
      window.history[method] = function() {
        var result = original.apply(this, arguments);
        try {
          var path = window.location.pathname || '/';
          sendTabVisibility(path);
        } catch(e) {}
        return result;
      };
    } catch(e) {}
  }
  hookHistory('pushState');
  hookHistory('replaceState');
  window.addEventListener('popstate', function(){
    try { sendTabVisibility(window.location.pathname || '/'); } catch(e) {}
  });
  // --- End tab visibility ---

  function isTransparent(color) {
    if (!color) return true;
    var normalized = color.replace(/\\s+/g, '').toLowerCase();
    return normalized === 'transparent' || normalized === 'rgba(0,0,0,0)';
  }

  function getOpaqueColor(element) {
    var current = element;
    while (current) {
      try {
        var style = window.getComputedStyle(current);
        if (style && !isTransparent(style.backgroundColor)) {
          return style.backgroundColor;
        }
      } catch (e) {}
      current = current.parentElement;
    }
    try {
      var bodyColor = window.getComputedStyle(document.body).backgroundColor;
      if (bodyColor) {
        return bodyColor;
      }
    } catch (e) {}
    return '#ffffff';
  }

  function detectColor() {
    var probeX = Math.max(1, Math.floor(window.innerWidth / 2));
    var probeY = 1;
    var target = document.elementFromPoint(probeX, probeY);
    var color = getOpaqueColor(target || document.body);

    if (color && color !== lastColor) {
      lastColor = color;
      postColor(color);
    }
  }

  function runBurst() {
    rafRuns = 0;
    rafPending = true;
    var loop = function() {
      detectColor();
      rafRuns += 1;
      if (rafRuns < 8) {
        requestAnimationFrame(loop);
      } else {
        rafPending = false;
      }
    };
    requestAnimationFrame(loop);
  }

  function scheduleDetect(force) {
    if (force) {
      lastColor = null;
    }
    detectColor();
    if (!rafPending) {
      runBurst();
    }
  }

  function routeChanged() {
    scheduleDetect(true);
  }

  function postColor(color) {
    try {
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SET_THEME_COLOR',
          color: color
        }));
      }
    } catch (e) {}
  }

  var observer = new MutationObserver(function() {
    try {
      if (mutationDetectTimer) return;
      mutationDetectTimer = setTimeout(function() {
        mutationDetectTimer = null;
        scheduleDetect(false);
      }, 120);
    } catch (e) {
      scheduleDetect(false);
    }
  });

  function hookHistory(method) {
    var historyRef = window.history;
    if (!historyRef) return;
    var original = historyRef[method];
    if (typeof original !== 'function') return;
    try {
      historyRef[method] = function() {
        var result = original.apply(this, arguments);
        routeChanged();
        return result;
      };
    } catch (e) {}
  }

  window.__WALLSPACE_FORCE_COLOR = function() {
    scheduleDetect(true);
  };

  try {
    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  } catch (e) {}

  window.addEventListener('load', function() { scheduleDetect(true); });
  window.addEventListener('DOMContentLoaded', function() { scheduleDetect(true); });
  window.addEventListener('readystatechange', function() { scheduleDetect(false); });
  window.addEventListener('pageshow', function() { scheduleDetect(true); });
  window.addEventListener('visibilitychange', function() { scheduleDetect(false); });
  window.addEventListener('scroll', function() { scheduleDetect(false); }, true);
  window.addEventListener('resize', function() { scheduleDetect(false); });
  window.addEventListener('hashchange', routeChanged);
  window.addEventListener('popstate', routeChanged);

  hookHistory('pushState');
  hookHistory('replaceState');

  setInterval(function() { scheduleDetect(false); }, 3000);
  scheduleDetect(true);
})(); true;
`;

export const REQUEST_THEME_COLOR_SCRIPT =
  "window.__WALLSPACE_FORCE_COLOR && window.__WALLSPACE_FORCE_COLOR(); true;";
