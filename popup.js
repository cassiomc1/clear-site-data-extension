const OPTION_IDS = ['cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB'];

const I18N = {
  en: {
    title: 'Clear Site Data',
    loading: 'Loading...',
    optionsLegend: 'Data that will be removed',
    labels: {
      cookies: 'Cookies',
      cache: 'Browser cache',
      cacheStorage: 'Cache Storage',
      localStorage: 'Local Storage',
      serviceWorkers: 'Service Workers',
      indexedDB: 'IndexedDB',
    },
    cookieNote: 'Shared cookies may also be removed from related subdomains.',
    clearButton: 'Clear this site\'s data',
    identifyError: 'Could not identify the site.',
    invalidUrl: 'Invalid URL.',
    notWebPage: 'This tab is not a web page.',
    selectOne: 'Select at least one data type.',
    removing: (label, step, total) => `Removing ${label}... (${step}/${total})`,
    removeError: 'Could not remove the data. Please try again.',
    success: (origin) => `Data removed from ${origin}.`,
    reloadError: 'Data removed, but the tab could not be reloaded.',
  },
};

const STORAGE_KEY = 'selectedOptions';

function t() {
  return I18N.en;
}

function applyLanguage() {
  document.documentElement.lang = 'en';
  document.title = t().title;
  document.getElementById('title').textContent = t().title;
  document.getElementById('siteInfo').textContent = t().loading;
  document.getElementById('optionsLegend').textContent = t().optionsLegend;
  document.getElementById('labelCookies').textContent = t().labels.cookies;
  document.getElementById('labelCache').textContent = t().labels.cache;
  document.getElementById('labelCacheStorage').textContent = t().labels.cacheStorage;
  document.getElementById('labelLocalStorage').textContent = t().labels.localStorage;
  document.getElementById('labelServiceWorkers').textContent = t().labels.serviceWorkers;
  document.getElementById('labelIndexedDB').textContent = t().labels.indexedDB;
  document.getElementById('cookieNote').textContent = t().cookieNote;
  document.getElementById('clearBtn').textContent = t().clearButton;
}

async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) {
      throw new Error('No active tab found');
    }
    return tabs[0];
  } catch (err) {
    console.error('Failed to query active tab:', err);
    const siteInfo = document.getElementById('siteInfo');
    siteInfo.textContent = t().identifyError;
    throw err;
  }
}

function getOriginFromTab(tab) {
  try {
    const url = new URL(tab.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Not a web URL');
    }
    return url.origin;
  } catch (err) {
    console.error('Invalid URL in active tab:', err);
    const siteInfo = document.getElementById('siteInfo');
    siteInfo.textContent = t().identifyError;
    throw err;
  }
}

async function clear(dataTypes, origin) {
  const labels = t().labels;
  const status = document.getElementById('status');

  let failed = false;

  for (const [step, id] of dataTypes.entries()) {
    status.textContent = t().removing(labels[id], step + 1, dataTypes.length);
    status.className = 'status progress';

    try {
      await chrome.browsingData.remove({ origins: [origin] }, { [id]: true });
    } catch (err) {
      console.error(`Failed to remove ${id} from site:`, err);
      status.textContent = t().removeError;
      status.className = 'status error';
      failed = true;
      break;
    }
  }

  if (!failed) {
    status.textContent = t().success(origin);
    status.className = 'status success';

    try {
      await chrome.tabs.reload();
    } catch (err) {
      console.error('Failed to reload tab:', err);
      status.textContent = t().reloadError;
      status.className = 'status warning';
    }
  }
}

function saveOptions(dataToRemove) {
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: dataToRemove });
  } catch (err) {
    console.error('Failed to save options:', err);
  }
}

async function restoreOptions() {
  let saved;
  try {
    saved = await chrome.storage.local.get(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to restore options:', err);
    return;
  }

  const options = saved && saved[STORAGE_KEY];
  if (!options) return;

  for (const id of OPTION_IDS) {
    if (typeof options[id] === 'boolean') {
      document.getElementById(id).checked = options[id];
    }
  }
}

async function initializePopup() {
  applyLanguage();
  restoreOptions();

  try {
    const tab = await getActiveTab();
    const origin = getOriginFromTab(tab);
    const siteInfo = document.getElementById('siteInfo');
    siteInfo.textContent = origin;
    document.getElementById('clearBtn').disabled = false;

    document.getElementById('clearBtn').addEventListener('click', async () => {
      const dataTypes = OPTION_IDS.filter((id) => document.getElementById(id).checked);

      if (!dataTypes.length) {
        const status = document.getElementById('status');
        status.textContent = t().selectOne;
        status.className = 'status warning';
        return;
      }

      const optionsState = Object.fromEntries(
        OPTION_IDS
          .filter((id) => !document.getElementById(id).checked)
          .map((id) => [id, false]),
      );
      saveOptions(optionsState);
      await clear(dataTypes, origin);
    });
  } catch (err) {
    // Error already handled in getActiveTab or getOriginFromTab
  }
}

document.addEventListener('DOMContentLoaded', initializePopup);
