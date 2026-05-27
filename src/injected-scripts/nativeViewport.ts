type NativeViewportInsets = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  platform?: string;
  consumeBottomInset?: boolean;
};

const toInset = (value?: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
};

export function buildNativeViewportScript(insets: NativeViewportInsets = {}) {
  const top = toInset(insets.top);
  const right = toInset(insets.right);
  const bottom = toInset(insets.bottom);
  const left = toInset(insets.left);
  const platform = insets.platform || 'unknown';
  const consumeBottomInset = insets.consumeBottomInset === true;
  const webBottom = consumeBottomInset ? 0 : bottom;

  return `(function(){
  try {
    var root = document.documentElement;
    if (!root) return true;
    var values = { top: ${top}, right: ${right}, bottom: ${webBottom}, left: ${left}, platform: ${JSON.stringify(platform)}, systemBottom: ${bottom}, consumedBottom: ${JSON.stringify(consumeBottomInset)} };
    root.classList.add('rn-webview');
    root.classList.toggle('withart-native-android', values.platform === 'android');
    root.classList.toggle('withart-native-ios', values.platform === 'ios');
    root.classList.toggle('withart-bottom-inset-consumed', values.consumedBottom);
    root.style.setProperty('--withart-native-safe-area-top', values.top + 'px');
    root.style.setProperty('--withart-native-safe-area-right', values.right + 'px');
    root.style.setProperty('--withart-native-safe-area-bottom', values.bottom + 'px');
    root.style.setProperty('--withart-native-safe-area-left', values.left + 'px');
    root.style.setProperty('--withart-native-bottom-inset', values.bottom + 'px');
    root.style.setProperty('--withart-native-system-safe-area-bottom', values.systemBottom + 'px');
    root.style.setProperty('--safe-area-top', 'max(env(safe-area-inset-top, 0px), ' + values.top + 'px)');
    root.style.setProperty('--safe-area-bottom', values.consumedBottom ? '0px' : 'max(env(safe-area-inset-bottom, 0px), ' + values.bottom + 'px)');
    window.__WITHART_NATIVE_VIEWPORT_INSETS__ = values;
    try {
      window.dispatchEvent(new CustomEvent('WITHART_NATIVE_VIEWPORT_INSETS', { detail: values }));
    } catch (e) {}
  } catch (e) {}
})();true;`;
}
