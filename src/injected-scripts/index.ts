/**
 * Injected JavaScript scripts for WebView communication
 * 
 * These scripts are injected into the WebView to handle:
 * - React Native WebView detection
 * - Bottom navigation padding removal
 * - Status bar color synchronization
 * - Route change detection
 */

export { RN_WEBVIEW_PRE_INJECT } from './preInject';
export { THEME_COLOR_SCRIPT, REQUEST_THEME_COLOR_SCRIPT } from './themeColor';
