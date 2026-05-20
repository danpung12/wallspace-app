/**
 * Simple global registry for WebView controllers.
 * Allows App.tsx to call redirectFromLoginIfNeeded on the active WebView
 * without needing prop drilling or complex ref patterns.
 */

type InjectSessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  force?: boolean;
};

type WebViewController = {
  redirectFromLoginIfNeeded: () => void;
  injectSession: (payload?: InjectSessionPayload) => void;
  navigateToPath: (path: string) => void;
  reload: () => void;
  getCurrentPath: () => string | null;
};

type ControllerRegistry = {
  set: (name: string, controller: WebViewController | null) => void;
  get: (name: string) => WebViewController | null;
  hasAny: () => boolean;
  getCurrentPath: (name: string) => string | null;
  callAll: (
    method: keyof WebViewController,
    payload?: InjectSessionPayload | string
  ) => void;
};

const registry: Record<string, WebViewController | null> = {};

export const webviewControllerRegistry: ControllerRegistry = {
  set(name: string, controller: WebViewController | null) {
    registry[name] = controller;
  },
  get(name: string) {
    return registry[name] ?? null;
  },
  hasAny() {
    return Object.values(registry).some((ctrl) => !!ctrl);
  },
  getCurrentPath(name: string) {
    const ctrl = registry[name];
    if (!ctrl) return null;
    return ctrl.getCurrentPath();
  },
  callAll(
    method: keyof WebViewController,
    payload?: { accessToken?: string; refreshToken?: string; tokenExpiresAt?: string } | string
  ) {
    Object.values(registry).forEach((ctrl) => {
      if (!ctrl) return;
      if (method === 'injectSession') {
        ctrl.injectSession(payload as { accessToken?: string; refreshToken?: string; tokenExpiresAt?: string });
        return;
      }
      if (method === 'navigateToPath') {
        ctrl.navigateToPath((payload as string) || '/');
        return;
      }
      if (method === 'reload') {
        ctrl.reload();
        return;
      }
      if (method === 'getCurrentPath') {
        return;
      }
      ctrl[method]();
    });
  },
};
