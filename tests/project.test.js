const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const popup = readFileSync(join(root, 'popup.html'), 'utf8');

test('keeps only the necessary permissions', () => {
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'browsingData', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
});

test('maintains the contract between manifest, popup and JavaScript', () => {
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.match(popup, /<script src="popup\.js"><\/script>/);
  assert.match(popup, /<link rel="stylesheet" href="popup\.css">/);

  for (const id of [
    'siteInfo',
    'clearBtn',
    'status',
    'cookies',
    'cache',
    'cacheStorage',
    'localStorage',
    'serviceWorkers',
    'indexedDB',
    'title',
    'optionsLegend',
    'cookieNote',
    'labelCookies',
    'labelCache',
    'labelCacheStorage',
    'labelLocalStorage',
    'labelServiceWorkers',
    'labelIndexedDB',
  ]) {
    assert.equal(popup.match(new RegExp(`id="${id}"`, 'g'))?.length, 1, `missing or duplicated id: ${id}`);
  }
});

test('keeps the action disabled while origin is being loaded', () => {
  assert.match(popup, /<button[^>]+id="clearBtn"[^>]+disabled>/);
});
