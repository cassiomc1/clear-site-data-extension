document.addEventListener('DOMContentLoaded', async () => {
  const siteInfo = document.getElementById('siteInfo');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');

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

  clearBtn.addEventListener('click', async () => {
    status.textContent = 'Limpando...';
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

    if (!Object.values(dataToRemove).some(Boolean)) {
      status.textContent = 'Selecione ao menos um tipo de dado.';
      status.className = 'status error';
      clearBtn.disabled = false;
      return;
    }

    try {
      await chrome.browsingData.remove(
        { origins: [origin] },
        dataToRemove
      );

      status.textContent = `Dados removidos de ${origin}. Recarregando...`;
      status.className = 'status success';

      setTimeout(() => {
        chrome.tabs.reload(tab.id).catch((err) => console.error('Falha ao recarregar a aba:', err));
        window.close();
      }, 800);
    } catch (err) {
      console.error('Falha ao remover os dados do site:', err);
      status.textContent = 'Não foi possível remover os dados. Tente novamente.';
      status.className = 'status error';
      clearBtn.disabled = false;
    }
  });
});
