document.addEventListener('DOMContentLoaded', async () => {
  const siteInfo = document.getElementById('siteInfo');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');

  // Obtém a aba ativa
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url) {
    siteInfo.textContent = 'Não foi possível identificar o site.';
    clearBtn.disabled = true;
    return;
  }

  // Extrai a origem (protocolo + domínio + porta)
  let url;
  try {
    url = new URL(tab.url);
  } catch (e) {
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
  const hostname = url.hostname;

  siteInfo.textContent = hostname;

  clearBtn.addEventListener('click', async () => {
    status.textContent = 'Limpando...';
    status.className = 'status';
    clearBtn.disabled = true;

    const dataToRemove = {};

    if (document.getElementById('cookies').checked) {
      dataToRemove.cookies = true;
    }
    if (document.getElementById('cache').checked) {
      dataToRemove.cache = true;
      dataToRemove.cacheStorage = true;
    }
    if (document.getElementById('localStorage').checked) {
      dataToRemove.localStorage = true;
    }
    if (document.getElementById('sessionStorage').checked) {
      // Session storage é limpo ao limpar service workers e recarregar
      dataToRemove.serviceWorkers = true;
    }
    if (document.getElementById('indexedDB').checked) {
      dataToRemove.indexedDB = true;
    }

    try {
      await chrome.browsingData.remove(
        { origins: [origin] },
        dataToRemove
      );

      status.textContent = 'Dados limpos com sucesso!';
      status.className = 'status success';

      // Recarrega a aba para aplicar mudanças
      setTimeout(() => {
        chrome.tabs.reload(tab.id);
        window.close();
      }, 800);
    } catch (err) {
      status.textContent = 'Erro: ' + err.message;
      status.className = 'status error';
      clearBtn.disabled = false;
    }
  });
});
