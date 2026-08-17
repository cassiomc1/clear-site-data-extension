const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'popup.js'), 'utf8');

const ELEMENT_IDS = [
  'siteInfo', 'clearBtn', 'status',
  'cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB',
  'title', 'optionsLegend', 'cookieNote',
  'labelCookies', 'labelCache', 'labelCacheStorage', 'labelLocalStorage', 'labelServiceWorkers', 'labelIndexedDB',
];

function loadPopup({ url = 'https://app.example.com/page', queryError, removeError, reloadError, savedOptions } = {}) {
  const elements = Object.fromEntries(
    ELEMENT_IDS
      .map((id) => [id, {
        id,
        checked: true,
        disabled: id === 'clearBtn',
        textContent: '',
        className: '',
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(event, listener) { this[event] = listener; },
      }]),
  );

  let ready;
  const removals = [];
  let reloadedTab;
  const storedValues = {};

  const document = {
    documentElement: { lang: '' },
    title: '',
    addEventListener(event, listener) { if (event === 'DOMContentLoaded') ready = listener; },
    getElementById(id) { return elements[id]; },
  };

  const chrome = {
    tabs: {
      query: async () => { if (queryError) throw queryError; return [{ url }]; },
      reload: async () => { reloadedTab = true; if (reloadError) throw reloadError; },
    },
    browsingData: {
      remove: async (filter, spec) => {
        if (removeError) throw removeError;
        removals.push({ filter, spec });
      },
    },
    storage: {
      local: {
        get: async (key) => {
          if (queryError) throw queryError;
          const stored = {};
          if (savedOptions && key === 'selectedOptions') stored[key] = savedOptions;
          return stored;
        },
        set: async (obj) => { Object.assign(storedValues, obj); },
      },
    },
  };

  const context = vm.createContext({
    chrome,
    document,
    console: { error() {} },
    URL,
  });

  vm.runInContext(source, context);

  return {
    document,
    elements,
    result() { return { removals, reloadedTab, storedValues }; },
    ready: async () => {
      if (ready) await ready();
    },
    click: () => elements.clearBtn.click?.(),
  };
}

test('identifies https origin', async () => {
  const popup = loadPopup();
  await popup.ready();
  assert.equal(popup.elements.siteInfo.textContent, 'https://app.example.com');
  assert.equal(popup.elements.clearBtn.disabled, false);
});

test('reports query failure', async () => {
  const popup = loadPopup({ queryError: new Error('unavailable') });
  await popup.ready();
  assert.equal(popup.elements.siteInfo.textContent, 'Could not identify the site.');
  assert.equal(popup.elements.clearBtn.disabled, true);
});

test('reports removal failure', async () => {
  const popup = loadPopup({ removeError: new Error('unavailable') });
  await popup.ready();
  await popup.click();
  assert.equal(popup.elements.status.textContent, 'Could not remove the data. Please try again.');
  assert.equal(popup.elements.status.className, 'status error');
  assert.equal(popup.result().removals.length, 0);
});

test('informs removal failure and allows retry', async () => {
  const popup = loadPopup({ removeError: new Error('unavailable') });
  await popup.ready();
  await popup.click();
  assert.equal(popup.elements.status.textContent, 'Could not remove the data. Please try again.');
  assert.equal(popup.elements.clearBtn.disabled, false);
  assert.equal(popup.result().reloadedTab, undefined);
});

test('keeps result visible when reload fails', async () => {
  const popup = loadPopup({ reloadError: new Error('unavailable') });
  await popup.ready();
  await popup.click();
  assert.equal(popup.elements.status.textContent, 'Data removed, but the tab could not be reloaded.');
  assert.equal(popup.elements.status.className, 'status warning');
  assert.notEqual(popup.result().removals.length, 0);
});

test('clears selected categories', async () => {
  const popup = loadPopup();
  await popup.ready();

  popup.elements.cache.checked = false;
  popup.elements.localStorage.checked = false;
  await popup.click();

  assert.equal(popup.elements.status.textContent, 'Data removed from https://app.example.com.');
  assert.equal(popup.elements.status.className, 'status success');

  assert.equal(popup.result().removals.length, 4);
  const removedTypes = popup.result().removals.map((r) => Object.keys(r.spec)[0]);
  assert.deepEqual(removedTypes, ['cookies', 'cacheStorage', 'serviceWorkers', 'indexedDB']);
});

test('saves selected categories for next use', async () => {
  const popup = loadPopup();
  await popup.ready();

  popup.elements.cache.checked = false;
  await popup.click();

  const saved = popup.result().storedValues;
  assert.deepEqual(JSON.parse(JSON.stringify(saved.selectedOptions)), { cache: false });
});

test('restores saved options on load', async () => {
  const savedOptions = { cookies: false, cache: true };
  const popup = loadPopup({ savedOptions });
  await popup.ready();

  assert.equal(popup.elements.cookies.checked, false);
  assert.equal(popup.elements.cache.checked, true);
});

test('prevents execution with no selection', async () => {
  const popup = loadPopup();
  await popup.ready();

  for (const id of ELEMENT_IDS.slice(3, 9)) {
    popup.elements[id].checked = false;
  }

  await popup.click();
  assert.equal(popup.elements.status.textContent, 'Select at least one data type.');
  assert.equal(popup.result().removals.length, 0);
});

test('handles non-web tabs correctly', async () => {
  const popup = loadPopup({ url: 'chrome://extensions' });
  await popup.ready();
  assert.equal(popup.elements.siteInfo.textContent, 'Could not identify the site.');
  assert.equal(popup.elements.clearBtn.disabled, true);
});

test('interface displays in English on startup', async () => {
  const popup = loadPopup();
  await popup.ready();

  assert.equal(popup.document.documentElement.lang, 'en');
  assert.equal(popup.document.title, 'Clear Site Data');
  assert.equal(popup.elements.title.textContent, 'Clear Site Data');
  assert.equal(popup.elements.optionsLegend.textContent, 'Data that will be removed');
  assert.equal(popup.elements.labelCache.textContent, 'Browser cache');
  assert.equal(popup.elements.cookieNote.textContent, 'Shared cookies may also be removed from related subdomains.');
  assert.equal(popup.elements.clearBtn.textContent, 'Clear this site\'s data');
});

test('completes removal and shows success message', async () => {
  const popup = loadPopup();
  await popup.ready();
  await popup.click();

  assert.equal(popup.elements.status.textContent, 'Data removed from https://app.example.com.');
  assert.equal(popup.elements.status.className, 'status success');
  assert.equal(popup.result().reloadedTab, true);
});
