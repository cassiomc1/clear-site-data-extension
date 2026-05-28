# Limpar Dados do Site

Extensão Chrome (Manifest V3) que limpa os dados armazenados pelo site da aba ativa
(cookies, Cache Storage, Local Storage, Service Workers e IndexedDB) sem afetar os
demais sites.

## Funcionalidades

- Detecta automaticamente a origem (`protocolo://domínio:porta`) da aba ativa.
- Permite escolher quais tipos de dados limpar.
- Recarrega a aba após a limpeza para aplicar as mudanças.

## Como instalar (modo desenvolvedor)

1. Acesse `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione esta pasta.

## Observações sobre os tipos de dados

A limpeza é sempre restrita à origem da aba atual usando o filtro `origins` da API
[`chrome.browsingData`](https://developer.chrome.com/docs/extensions/reference/api/browsingData).
Apenas tipos com suporte a esse filtro são usados:

- **Cookies**
- **Cache Storage** (Cache Storage API, escopo por site). O cache HTTP global do
  navegador não pode ser limpo por site e por isso não é incluído.
- **Local Storage**
- **Service Workers**
- **IndexedDB**

O `sessionStorage` é exclusivo da aba e é descartado quando a aba é fechada, portanto
não há um tipo correspondente nessa API.
