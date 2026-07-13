const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'popup.js'), 'utf8');

function loadPopup({ url = 'https://app.example.com/page', queryError, removeError } = {}) {
  const elements = Object.fromEntries(
    ['siteInfo', 'clearBtn', 'status', 'cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB']
      .map((id) => [id, {
        id,
        checked: true,
        disabled: false,
        textContent: '',
        className: '',
        addEventListener(event, listener) { this[event] = listener; },
      }]),
  );
  let ready;
  let removal;
  let reloadedTab;
  let closed = false;

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
      reload: async (tabId) => { reloadedTab = tabId; },
    },
    browsingData: {
      remove: async (options, data) => {
        if (removeError) throw removeError;
        removal = { options, data };
      },
    },
  };

  vm.runInNewContext(source, {
    chrome,
    console: { error() {} },
    document,
    setTimeout: (listener) => listener(),
    URL,
    window: { close: () => { closed = true; } },
  });

  return {
    elements,
    ready: () => ready(),
    click: () => elements.clearBtn.click(),
    result: () => ({ closed, reloadedTab, removal }),
  };
}

test('envia a origem ativa e recarrega a aba após a remoção', async () => {
  const popup = loadPopup();
  await popup.ready();
  await popup.click();

  assert.equal(popup.elements.siteInfo.textContent, 'https://app.example.com');
  assert.deepEqual(JSON.parse(JSON.stringify(popup.result().removal)), {
    options: { origins: ['https://app.example.com'] },
    data: {
      cookies: true,
      cache: true,
      cacheStorage: true,
      localStorage: true,
      serviceWorkers: true,
      indexedDB: true,
    },
  });
  assert.equal(popup.result().reloadedTab, 7);
  assert.equal(popup.result().closed, true);
});

test('não executa a remoção sem ao menos uma opção selecionada', async () => {
  const popup = loadPopup();
  Object.values(popup.elements).forEach((element) => { element.checked = false; });
  await popup.ready();
  await popup.click();

  assert.equal(popup.result().removal, undefined);
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
  assert.equal(popup.result().closed, false);
  assert.equal(popup.result().reloadedTab, undefined);
});
