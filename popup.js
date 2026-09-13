'use strict';

const OPTION_IDS = ['cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB'];

const STRINGS = {
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
  clearButton: "Clear this site's data",
  selectAll: 'Select all',
  selectNone: 'Clear selection',
  identifyError: 'Could not identify the site.',
  invalidUrl: 'Invalid URL.',
  notWebPage: 'This tab is not a web page (e.g. chrome:// pages).',
  selectOne: 'Select at least one data type.',
  removing: (label, step, total) => `Removing ${label}... (${step}/${total})`,
  removeError: (failedLabels) => `Could not remove: ${failedLabels.join(', ')}. Please try again.`,
  success: (origin) => `Data removed from ${origin}.`,
  reloadError: 'Data removed, but the tab could not be reloaded.',
};

const STORAGE_KEY = 'selectedOptions';

// Cached DOM references, resolved on init.
const els = {};

function t() {
  return STRINGS;
}

function applyLanguage() {
  document.documentElement.lang = 'en';
  document.title = t().title;
  els.title.textContent = t().title;
  els.siteInfo.textContent = t().loading;
  els.optionsLegend.textContent = t().optionsLegend;
  els.labelCookies.textContent = t().labels.cookies;
  els.labelCache.textContent = t().labels.cache;
  els.labelCacheStorage.textContent = t().labels.cacheStorage;
  els.labelLocalStorage.textContent = t().labels.localStorage;
  els.labelServiceWorkers.textContent = t().labels.serviceWorkers;
  els.labelIndexedDB.textContent = t().labels.indexedDB;
  els.cookieNote.textContent = t().cookieNote;
  els.clearBtn.textContent = t().clearButton;
  els.selectAllBtn.textContent = t().selectAll;
  els.selectNoneBtn.textContent = t().selectNone;
}

function setStatus(message, kind) {
  els.status.textContent = message;
  els.status.className = kind ? `status ${kind}` : 'status';
}

function getSelectedIds() {
  return OPTION_IDS.filter((id) => els[id].checked);
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    throw new Error('NO_ACTIVE_TAB');
  }
  return tabs[0];
}

function getOriginFromTab(tab) {
  if (!tab || !tab.url) {
    const err = new Error('Missing tab URL');
    err.code = 'NOT_WEB_PAGE';
    throw err;
  }
  let url;
  try {
    url = new URL(tab.url);
  } catch (err) {
    const wrapped = new Error('Invalid tab URL');
    wrapped.code = 'INVALID_URL';
    wrapped.cause = err;
    throw wrapped;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    const err = new Error(`Unsupported protocol: ${url.protocol}`);
    err.code = 'NOT_WEB_PAGE';
    throw err;
  }
  return url.origin;
}

function originErrorMessage(err) {
  if (err && err.code === 'NOT_WEB_PAGE') return t().notWebPage;
  if (err && err.code === 'INVALID_URL') return t().invalidUrl;
  return t().identifyError;
}

async function clear(dataTypes, origin, tabId) {
  const labels = t().labels;
  const failed = [];

  els.clearBtn.disabled = true;

  try {
    for (const [step, id] of dataTypes.entries()) {
      setStatus(t().removing(labels[id], step + 1, dataTypes.length), 'progress');
      try {
        await chrome.browsingData.remove({ origins: [origin] }, { [id]: true });
      } catch (err) {
        console.error(`Failed to remove ${id} from site:`, err);
        failed.push(labels[id]);
      }
    }

    if (failed.length) {
      setStatus(t().removeError(failed), 'error');
      return;
    }

    setStatus(t().success(origin), 'success');

    try {
      if (typeof tabId === 'number') {
        await chrome.tabs.reload(tabId);
      } else {
        await chrome.tabs.reload();
      }
    } catch (err) {
      console.error('Failed to reload tab:', err);
      setStatus(t().reloadError, 'warning');
    }
  } finally {
    els.clearBtn.disabled = false;
  }
}

function readOptionsState() {
  return Object.fromEntries(OPTION_IDS.map((id) => [id, els[id].checked]));
}

function saveOptions(state) {
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
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
  if (!options || typeof options !== 'object') return;

  for (const id of OPTION_IDS) {
    if (typeof options[id] === 'boolean') {
      els[id].checked = options[id];
    }
  }
}

function cacheElements() {
  els.title = document.getElementById('title');
  els.siteInfo = document.getElementById('siteInfo');
  els.siteIcon = document.getElementById('siteIcon');
  els.optionsLegend = document.getElementById('optionsLegend');
  els.labelCookies = document.getElementById('labelCookies');
  els.labelCache = document.getElementById('labelCache');
  els.labelCacheStorage = document.getElementById('labelCacheStorage');
  els.labelLocalStorage = document.getElementById('labelLocalStorage');
  els.labelServiceWorkers = document.getElementById('labelServiceWorkers');
  els.labelIndexedDB = document.getElementById('labelIndexedDB');
  els.cookieNote = document.getElementById('cookieNote');
  els.clearBtn = document.getElementById('clearBtn');
  els.selectAllBtn = document.getElementById('selectAllBtn');
  els.selectNoneBtn = document.getElementById('selectNoneBtn');
  els.status = document.getElementById('status');
  for (const id of OPTION_IDS) {
    els[id] = document.getElementById(id);
  }
}

function wireEvents(origin, tab) {
  els.clearBtn.addEventListener('click', async () => {
    const dataTypes = getSelectedIds();

    if (!dataTypes.length) {
      setStatus(t().selectOne, 'warning');
      return;
    }

    saveOptions(readOptionsState());
    await clear(dataTypes, origin, tab.id);
  });

  els.selectAllBtn.addEventListener('click', () => {
    for (const id of OPTION_IDS) els[id].checked = true;
    saveOptions(readOptionsState());
  });

  els.selectNoneBtn.addEventListener('click', () => {
    for (const id of OPTION_IDS) els[id].checked = false;
    saveOptions(readOptionsState());
  });

  for (const id of OPTION_IDS) {
    els[id].addEventListener('change', () => saveOptions(readOptionsState()));
  }
}

async function initializePopup() {
  cacheElements();
  applyLanguage();
  await restoreOptions();

  let tab;
  try {
    tab = await getActiveTab();
  } catch (err) {
    console.error('Failed to query active tab:', err);
    els.siteInfo.textContent = t().identifyError;
    return;
  }

  let origin;
  try {
    origin = getOriginFromTab(tab);
  } catch (err) {
    console.error('Invalid URL in active tab:', err);
    els.siteInfo.textContent = originErrorMessage(err);
    return;
  }

  els.siteInfo.textContent = origin;
  if (els.siteIcon && tab.favIconUrl) {
    els.siteIcon.src = tab.favIconUrl;
    els.siteIcon.hidden = false;
  }
  els.clearBtn.disabled = false;
  wireEvents(origin, tab);
}

document.addEventListener('DOMContentLoaded', initializePopup);
