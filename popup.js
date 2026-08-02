const OPTION_IDS = ['cookies', 'cache', 'cacheStorage', 'localStorage', 'serviceWorkers', 'indexedDB'];

const OPTION_LABELS = {
  cookies: 'cookies',
  cache: 'cache do navegador',
  cacheStorage: 'Cache Storage',
  localStorage: 'Local Storage',
  serviceWorkers: 'service workers',
  indexedDB: 'IndexedDB',
};

const STORAGE_KEY = 'selectedOptions';

document.addEventListener('DOMContentLoaded', async () => {
  const siteInfo = document.getElementById('siteInfo');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');

  restoreOptions();

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    console.error('Falha ao consultar a aba ativa:', err);
    siteInfo.textContent = 'Não foi possível identificar o site.';
    clearBtn.disabled = true;
    return;
  }

  if (!tab || !tab.url) {
    siteInfo.textContent = 'Não foi possível identificar o site.';
    clearBtn.disabled = true;
    return;
  }

  let url;
  try {
    url = new URL(tab.url);
  } catch (err) {
    console.error('URL inválida na aba ativa:', err);
    siteInfo.textContent = 'URL inválida.';
    clearBtn.disabled = true;
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    siteInfo.textContent = 'Esta aba não é um site web.';
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
      status.textContent = 'Selecione ao menos um tipo de dado.';
      status.className = 'status error';
      clearBtn.disabled = false;
      return;
    }

    saveOptions(dataToRemove);

    // Remove um tipo por vez para exibir o progresso detalhado
    for (let i = 0; i < selected.length; i += 1) {
      const id = selected[i];
      status.textContent = `Removendo ${OPTION_LABELS[id]}... (${i + 1}/${selected.length})`;
      try {
        await chrome.browsingData.remove({ origins: [origin] }, { [id]: true });
      } catch (err) {
        console.error(`Falha ao remover ${id} do site:`, err);
        status.textContent = 'Não foi possível remover os dados. Tente novamente.';
        status.className = 'status error';
        clearBtn.disabled = false;
        return;
      }
    }

    // Mostra o resultado imediatamente; a recarga ocorre em segundo plano
    status.textContent = `Dados removidos de ${origin}.`;
    status.className = 'status success';

    try {
      await chrome.tabs.reload(tab.id);
    } catch (err) {
      console.error('Falha ao recarregar a aba:', err);
      status.textContent = 'Dados removidos, mas não foi possível recarregar a aba.';
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
