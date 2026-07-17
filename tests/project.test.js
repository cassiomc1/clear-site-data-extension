const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const popup = readFileSync(join(root, 'popup.html'), 'utf8');

test('mantém apenas as permissões necessárias', () => {
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'browsingData']);
  assert.equal(manifest.host_permissions, undefined);
});

test('mantém o contrato entre manifesto, popup e JavaScript', () => {
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
  ]) {
    assert.equal(popup.match(new RegExp(`id="${id}"`, 'g'))?.length, 1, `id ausente ou duplicado: ${id}`);
  }
});

test('mantém a ação bloqueada enquanto a origem é carregada', () => {
  assert.match(popup, /<button[^>]+id="clearBtn"[^>]+disabled>/);
});
