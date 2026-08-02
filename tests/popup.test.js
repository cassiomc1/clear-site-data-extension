const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'popup.js'), 'utf8');

function loadPopup({ url = 'https://app.example.com/page', queryError, removeError, reloadError, savedOptions } = {}) {
  const elements = Object.fromEntries(
    ['siteInfo', 'clearBtn', 'status', 'cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB']
      .map((id) => [id, {
        id,
        checked: true,
        disabled: id === 'clearBtn',
        textContent: '',
        className: '',
        addEventListener(event, listener) { this[event] = listener; },
      }]),
  );
  let ready;
  const removals = [];
  let reloadedTab;
  let stored;

  const document = {
    addEventListener(event, listener) { if (event === 'DOMContentLoaded') ready = listener; },
    getElementById(id) { return elements[id]; },
  };
  const chrome = {
    tabs: {
      query: async () => {
        if (queryError) throw queryError;
        return [{ id: 7, url }];
      },
      reload: async (tabId) => {
        if (reloadError) throw reloadError;
        reloadedTab = tabId;
      },
    },
    browsingData: {
      remove: async (options, data) => {
        if (removeError) throw removeError;
        removals.push({ options, data });
      },
    },
    storage: {
      local: {
        get: async (key) => (savedOptions ? { [key]: savedOptions } : {}),
        set: async (value) => { stored = value; },
      },
    },
  };

  vm.runInNewContext(source, {
    chrome,
    console: { error() {} },
    document,
    URL,
  });

  return {
    elements,
    ready: () => ready(),
    click: () => elements.clearBtn.click(),
    result: () => ({ reloadedTab, removals, stored }),
  };
}

test('envia a origem ativa e recarrega a aba após a remoção', async () => {
  const popup = loadPopup();
  await popup.ready();

  assert.equal(popup.elements.clearBtn.disabled, false);
  await popup.click();

  const { removals, reloadedTab, stored } = JSON.parse(JSON.stringify(popup.result()));
  assert.equal(popup.elements.siteInfo.textContent, 'https://app.example.com');
  assert.equal(removals.length, 6);
  for (const removal of removals) {
    assert.deepEqual(removal.options, { origins: ['https://app.example.com'] });
  }
  assert.deepEqual(
    removals.map((removal) => Object.keys(removal.data)[0]),
    ['cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB'],
  );
  assert.equal(reloadedTab, 7);
  assert.deepEqual(stored, {
    selectedOptions: {
      cookies: true,
      cache: true,
      cacheStorage: true,
      localStorage: true,
      serviceWorkers: true,
      indexedDB: true,
    },
  });
  assert.equal(popup.elements.status.textContent, 'Dados removidos de https://app.example.com.');
});

test('restaura as últimas opções salvas ao abrir o popup', async () => {
  const popup = loadPopup({
    savedOptions: {
      cookies: true,
      cache: false,
      cacheStorage: false,
      localStorage: true,
      serviceWorkers: false,
      indexedDB: false,
    },
  });
  await popup.ready();

  assert.equal(popup.elements.cookies.checked, true);
  assert.equal(popup.elements.cache.checked, false);
  assert.equal(popup.elements.localStorage.checked, true);
  assert.equal(popup.elements.indexedDB.checked, false);
});

test('não executa a remoção sem ao menos uma opção selecionada', async () => {
  const popup = loadPopup();
  Object.values(popup.elements).forEach((element) => { element.checked = false; });
  await popup.ready();
  await popup.click();

  assert.equal(popup.result().removals.length, 0);
  assert.equal(popup.elements.status.textContent, 'Selecione ao menos um tipo de dado.');
  assert.equal(popup.elements.clearBtn.disabled, false);
});

test('bloqueia a ação em páginas internas do navegador', async () => {
  const popup = loadPopup({ url: 'chrome://extensions' });
  await popup.ready();

  assert.equal(popup.elements.siteInfo.textContent, 'Esta aba não é um site web.');
  assert.equal(popup.elements.clearBtn.disabled, true);
});

test('bloqueia a ação quando não consegue consultar a aba', async () => {
  const popup = loadPopup({ queryError: new Error('indisponível') });
  await popup.ready();

  assert.equal(popup.elements.siteInfo.textContent, 'Não foi possível identificar o site.');
  assert.equal(popup.elements.clearBtn.disabled, true);
});

test('informa a falha de remoção e libera uma nova tentativa', async () => {
  const popup = loadPopup({ removeError: new Error('indisponível') });
  await popup.ready();
  await popup.click();

  assert.equal(popup.elements.status.textContent, 'Não foi possível remover os dados. Tente novamente.');
  assert.equal(popup.elements.status.className, 'status error');
  assert.equal(popup.elements.clearBtn.disabled, false);
  assert.equal(popup.result().reloadedTab, undefined);
});

test('mantém o resultado visível quando a recarga falha', async () => {
  const popup = loadPopup({ reloadError: new Error('indisponível') });
  await popup.ready();
  await popup.click();

  assert.equal(popup.elements.status.textContent, 'Dados removidos, mas não foi possível recarregar a aba.');
  assert.equal(popup.elements.status.className, 'status warning');
  assert.notEqual(popup.result().removals.length, 0);
  assert.equal(popup.result().reloadedTab, undefined);
});
