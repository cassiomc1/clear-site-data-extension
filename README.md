# Limpar Dados do Site

Extensão Chrome (Manifest V3) que limpa os dados armazenados pelo site da aba ativa
(cookies, cache HTTP, Cache Storage, Local Storage, Service Workers e IndexedDB).

## Funcionalidades

- Detecta automaticamente a origem (`protocolo://domínio:porta`) da aba ativa.
- Permite escolher quais tipos de dados limpar.
- Recarrega a aba após a limpeza para aplicar as mudanças.
- Usa acesso temporário somente à aba em que a extensão foi aberta.

## Como instalar (modo desenvolvedor)

1. Acesse `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione esta pasta.

## Observações sobre os tipos de dados

O cache e os armazenamentos são restritos à origem da aba atual usando o filtro
`origins` da API
[`chrome.browsingData`](https://developer.chrome.com/docs/extensions/reference/api/browsingData).
Os cookies são a exceção descrita abaixo. Apenas tipos com suporte ao filtro são usados:

- **Cookies** — o Chrome os remove para todo o domínio registrável. Assim, cookies
  compartilhados podem ser removidos também de outros subdomínios relacionados.
- **Cache do navegador** (cache HTTP).
- **Cache Storage** (Cache Storage API).
- **Local Storage**
- **Service Workers**
- **IndexedDB**

O `sessionStorage` não tem um tipo correspondente na API `browsingData` e não é
removido pela extensão; ele é descartado quando a aba é fechada.

## Permissões

- `activeTab`: acesso temporário à URL da aba somente quando o usuário abre a extensão.
- `browsingData`: remoção dos tipos de dados selecionados.

A extensão requer Chrome 96 ou posterior para usar a interface assíncrona da API.
