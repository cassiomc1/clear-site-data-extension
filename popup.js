const OPTION_IDS = ['cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB'];

const I18N = {
  pt: {
    htmlLang: 'pt-BR',
    langButton: 'EN',
    langButtonLabel: 'Switch to English',
    title: 'Limpar Dados do Site',
    loading: 'Carregando...',
    optionsLegend: 'Dados que serão removidos',
    labels: {
      cookies: 'Cookies',
      cache: 'Cache do navegador',
      cacheStorage: 'Cache Storage',
      localStorage: 'Local Storage',
      serviceWorkers: 'Service Workers',
      indexedDB: 'IndexedDB',
    },
    cookieNote: 'Cookies compartilhados podem ser removidos também de subdomínios relacionados.',
    clearButton: 'Limpar dados deste site',
    identifyError: 'Não foi possível identificar o site.',
    invalidUrl: 'URL inválida.',
    notWebPage: 'Esta aba não é um site web.',
    selectOne: 'Selecione ao menos um tipo de dado.',
    removing: (label, step, total) => `Removendo ${label}... (${step}/${total})`,
    removeError: 'Não foi possível remover os dados. Tente novamente.',
    success: (origin) => `Dados removidos de ${origin}.`,
    reloadError: 'Dados removidos, mas não foi possível recarregar a aba.',
  },
  en: {
    htmlLang: 'en',
    langButton: 'PT',
    langButtonLabel: 'Mudar para português',
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
const LANG_KEY = 'language';

let currentLang = 'pt';

function t() {
  return I18N[currentLang];
}

function applyLanguage() {
  const strings = t();
  document.documentElement.lang = strings.htmlLang;
  document.title = strings.title;

  document.getElementById('title').textContent = strings.title;
  const langBtn = document.getElementById('langBtn');
  langBtn.textContent = strings.langButton;
  langBtn.setAttribute('aria-label', strings.langButtonLabel);
  document.getElementById('optionsLegend').textContent = strings.optionsLegend;
  document.getElementById('labelCookies').textContent = strings.labels.cookies;
  document.getElementById('labelCache').textContent = strings.labels.cache;
  document.getElementById('labelCacheStorage').textContent = strings.labels.cacheStorage;
  document.getElementById('labelLocalStorage').textContent = strings.labels.localStorage;
  document.getElementById('labelServiceWorkers').textContent = strings.labels.serviceWorkers;
  document.getElementById('labelIndexedDB').textContent = strings.labels.indexedDB;
  document.getElementById('cookieNote').textContent = strings.cookieNote;
  document.getElementById('clearBtn').textContent = strings.clearButton;
}

document.addEventListener('DOMContentLoaded', async () => {
  const siteInfo = document.getElementById('siteInfo');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');

  document.getElementById('langBtn').addEventListener('click', () => {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    applyLanguage();
    saveLanguage();
  });

  await Promise.all([restoreLanguage(), restoreOptions()]);
  applyLanguage();

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    console.error('Falha ao consultar a aba ativa:', err);
    siteInfo.textContent = t().identifyError;
    clearBtn.disabled = true;
    return;
  }

  if (!tab || !tab.url) {
    siteInfo.textContent = t().identifyError;
    clearBtn.disabled = true;
    return;
  }

  let url;
  try {
    url = new URL(tab.url);
  } catch (err) {
    console.error('URL inválida na aba ativa:', err);
    siteInfo.textContent = t().invalidUrl;
    clearBtn.disabled = true;
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    siteInfo.textContent = t().notWebPage;
    clearBtn.disabled = true;
    return;
  }

  const origin = url.origin;

  siteInfo.textContent = origin;
  clearBtn.disabled = false;

  clearBtn.addEventListener('click', async () => {
    status.className = 'status';
    clearBtn.disabled = true;

    const dataToRemove = {
      cookies: document.getElementById('cookies').checked,
      cache: document.getElementById('cache').checked,
      cacheStorage: document.getElementById('cacheStorage').checked,
      localStorage: document.getElementById('localStorage').checked,
      serviceWorkers: document.getElementById('serviceWorkers').checked,
      indexedDB: document.getElementById('indexedDB').checked,
    };

    const selected = OPTION_IDS.filter((id) => dataToRemove[id]);

    if (selected.length === 0) {
      status.textContent = t().selectOne;
      status.className = 'status error';
      clearBtn.disabled = false;
      return;
    }

    saveOptions(dataToRemove);

    // Remove um tipo por vez para exibir o progresso detalhado
    for (let i = 0; i < selected.length; i += 1) {
      const id = selected[i];
      status.textContent = t().removing(t().labels[id], i + 1, selected.length);
      try {
        await chrome.browsingData.remove({ origins: [origin] }, { [id]: true });
      } catch (err) {
        console.error(`Falha ao remover ${id} do site:`, err);
        status.textContent = t().removeError;
        status.className = 'status error';
        clearBtn.disabled = false;
        return;
      }
    }

    // Mostra o resultado imediatamente; a recarga ocorre em segundo plano
    status.textContent = t().success(origin);
    status.className = 'status success';

    try {
      await chrome.tabs.reload(tab.id);
    } catch (err) {
      console.error('Falha ao recarregar a aba:', err);
      status.textContent = t().reloadError;
      status.className = 'status warning';
    }
  });
});

function saveOptions(dataToRemove) {
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: dataToRemove });
  } catch (err) {
    console.error('Falha ao salvar as opções:', err);
  }
}

function saveLanguage() {
  try {
    chrome.storage.local.set({ [LANG_KEY]: currentLang });
  } catch (err) {
    console.error('Falha ao salvar o idioma:', err);
  }
}

async function restoreLanguage() {
  let saved;
  try {
    saved = await chrome.storage.local.get(LANG_KEY);
  } catch (err) {
    console.error('Falha ao restaurar o idioma:', err);
    return;
  }

  if (saved && I18N[saved[LANG_KEY]]) {
    currentLang = saved[LANG_KEY];
  }
}

async function restoreOptions() {
  let saved;
  try {
    saved = await chrome.storage.local.get(STORAGE_KEY);
  } catch (err) {
    console.error('Falha ao restaurar as opções:', err);
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
