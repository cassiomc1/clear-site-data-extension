const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'popup.js'), 'utf8');

const ELEMENT_IDS = [
  'siteInfo', 'clearBtn', 'status',
  'cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB',
  'langBtn', 'title', 'optionsLegend', 'cookieNote',
  'labelCookies', 'labelCache', 'labelCacheStorage', 'labelLocalStorage', 'labelServiceWorkers', 'labelIndexedDB',
];

function loadPopup({ url = 'https://app.example.com/page', queryError, removeError, reloadError, savedOptions, savedLanguage } = {}) {
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
        get: async (key) => {
          if (key === 'selectedOptions' && savedOptions) return { selectedOptions: savedOptions };
          if (key === 'language' && savedLanguage) return { language: savedLanguage };
          return {};
        },
        set: async (value) => { Object.assign(storedValues, value); },
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
    document,
    ready: () => ready(),
    click: () => elements.clearBtn.click(),
    toggleLanguage: () => elements.langBtn.click(),
    result: () => ({ reloadedTab, removals, storedValues }),
  };
}

test('envia a origem ativa e recarrega a aba após a remoção', async () => {
  const popup = loadPopup();
  await popup.ready();

  assert.equal(popup.elements.clearBtn.disabled, false);
  await popup.click();

  const { removals, reloadedTab, storedValues } = JSON.parse(JSON.stringify(popup.result()));
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
  assert.deepEqual(storedValues.selectedOptions, {
    cookies: true,
    cache: true,
    cacheStorage: true,
    localStorage: true,
    serviceWorkers: true,
    indexedDB: true,
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

test('alterna toda a interface para inglês e persiste a escolha', async () => {
  const popup = loadPopup();
  await popup.ready();
  popup.toggleLanguage();

  assert.equal(popup.document.documentElement.lang, 'en');
  assert.equal(popup.document.title, 'Clear Site Data');
  assert.equal(popup.elements.title.textContent, 'Clear Site Data');
  assert.equal(popup.elements.langBtn.textContent, 'PT');
  assert.equal(popup.elements.optionsLegend.textContent, 'Data that will be removed');
  assert.equal(popup.elements.labelCache.textContent, 'Browser cache');
  assert.equal(popup.elements.cookieNote.textContent, 'Shared cookies may also be removed from related subdomains.');
  assert.equal(popup.elements.clearBtn.textContent, 'Clear this site\'s data');
  assert.deepEqual(JSON.parse(JSON.stringify(popup.result().storedValues)), { language: 'en' });

  await popup.click();
  assert.equal(popup.elements.status.textContent, 'Data removed from https://app.example.com.');
});

test('restaura o idioma salvo ao abrir o popup', async () => {
  const popup = loadPopup({ savedLanguage: 'en' });
  await popup.ready();

  assert.equal(popup.document.documentElement.lang, 'en');
  assert.equal(popup.elements.title.textContent, 'Clear Site Data');

  await popup.click();
  assert.equal(popup.elements.status.textContent, 'Data removed from https://app.example.com.');
});
