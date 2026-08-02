# Limpar Dados do Site

Extensão Chrome (Manifest V3) que limpa os dados armazenados pelo site da aba ativa
(cookies, cache HTTP, Cache Storage, Local Storage, Service Workers e IndexedDB).

🌐 *[Read this documentation in English](README.en.md)*

## Funcionalidades

- Detecta automaticamente a origem (`protocolo://domínio:porta`) da aba ativa.
- Permite escolher quais tipos de dados limpar.
- **Lembra as últimas opções selecionadas** entre usos, agilizando limpezas repetidas.
- **Exibe o progresso detalhado** da limpeza (ex.: "Removendo cache do navegador... (2/6)").
- Mostra o resultado assim que a remoção termina, sem esperar a recarga da página.
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
- `storage`: salva localmente as últimas opções marcadas para restaurá-las no próximo uso.

A extensão requer Chrome 96 ou posterior para usar a interface assíncrona da API.

## Desempenho

A remoção é feita um tipo de dado por vez, o que permite exibir o progresso em tempo
real. O tempo total depende do volume de dados do site: o **cache do navegador** é o
tipo mais lento, pois o Chrome varre todo o cache filtrando pela origem; **IndexedDB**
de sites pesados também pode levar alguns segundos. Cookies, Local Storage e
Cache Storage são praticamente instantâneos. Desmarque os tipos desnecessários para
limpezas mais rápidas.

## Desenvolvimento

Execute a validação local, sem instalar dependências:

```bash
node --test
node --check popup.js
```
