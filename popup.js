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

    // Apenas tipos de dados suportados pelo filtro 'origins' do chrome.browsingData.
    // O tipo global 'cache' (cache HTTP do navegador inteiro) não aceita filtro por
    // origem e lançaria erro, por isso usamos 'cacheStorage' (escopo por site).
    const dataToRemove = {
      cookies: document.getElementById('cookies').checked,
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
