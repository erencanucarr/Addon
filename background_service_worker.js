// Service Worker entry for ClearURLs (Manifest v3 migration)
// Loads existing background scripts via importScripts so core logic remains untouched.
// Note: MV3 SW runs in worker context; window is undefined. Most existing code relies on browser.* APIs which are still available.

// --- Compatibility Polyfill ---
// Ensure scripts expecting 'window' can access globalThis in Worker.
if (typeof window === 'undefined' && typeof self !== 'undefined') {
  self.window = self;
}
if (typeof self !== 'undefined') {
  const br = (typeof browser !== 'undefined') ? browser : (typeof chrome !== 'undefined' ? chrome : undefined);
  if (br) {
    if (!br.browserAction && br.action) {
      br.browserAction = br.action;
    }
  }
}

// --- Prevent invalid blocking webRequest listeners in MV3 (Chrome) ---
if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest) {
  const wr = chrome.webRequest;
  if (wr && wr.onBeforeRequest) {
    const originalAdd = wr.onBeforeRequest.addListener;
    wr.onBeforeRequest.addListener = function(listener, filter, opt_extraInfoSpec) {
      if (Array.isArray(opt_extraInfoSpec) && opt_extraInfoSpec.includes('blocking')) {
        console.warn('Skipped adding blocking webRequest listener in MV3');
        return;
      }
      return originalAdd.call(this, listener, filter, opt_extraInfoSpec);
    };
  }
}

const scripts = [
  'browser-polyfill.js',
  'core_js/utils/Multimap.js',
  'core_js/utils/URLHashParams.js',
  'core_js/message_handler.js',
  'external_js/ip-range-check.js',
  'core_js/tools.js',
  'core_js/badgedHandler.js',
  'core_js/pureCleaning.js',
  'core_js/context_menu.js',
  'core_js/historyListener.js',
  'clearurls.js',
  'core_js/storage.js',
  'core_js/watchdog.js',
  'core_js/eTagFilter.js'
];

importScripts(...scripts);

// Optionally listen for install/update to (re)initialize declarativeNetRequest rules later.
chrome.runtime.onInstalled.addListener(() => {
  fetch('dnr_rules.json')
    .then(r => r.json())
    .then(rules => {
      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
        removeRuleIds: rules.map(r=>r.id)
      }, () => console.log('DNR rules loaded'));
    });
  console.log('ClearURLs service worker installed.');
});
