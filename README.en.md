# Clear Site Data

Chrome extension (Manifest V3) that clears the data stored by the site in the active
tab (cookies, HTTP cache, Cache Storage, Local Storage, Service Workers and IndexedDB).

🌐 *[Leia esta documentação em português](README.md)*

## Features

- Automatically detects the origin (`protocol://domain:port`) of the active tab.
- Lets you choose which data types to clear.
- **Bilingual interface (PT/EN)**: a button at the top switches the entire popup between Portuguese and English, and the choice is remembered.
- **Remembers the last selected options** between uses, speeding up repeated cleanups.
- **Shows detailed cleanup progress** (e.g., "Removing browser cache... (2/6)").
- Shows the result as soon as the removal finishes, without waiting for the page reload.
- Reloads the tab after cleanup to apply the changes.
- Uses temporary access only to the tab where the extension was opened.

## How to install (developer mode)

1. Go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Notes about the data types

Cache and storage are restricted to the current tab's origin using the `origins`
filter of the
[`chrome.browsingData`](https://developer.chrome.com/docs/extensions/reference/api/browsingData)
API. Cookies are the exception described below. Only types that support the filter
are used:

- **Cookies** — Chrome removes them for the entire registrable domain. As a result,
  shared cookies may also be removed from other related subdomains.
- **Browser cache** (HTTP cache).
- **Cache Storage** (Cache Storage API).
- **Local Storage**
- **Service Workers**
- **IndexedDB**

`sessionStorage` has no corresponding type in the `browsingData` API and is not
removed by the extension; it is discarded when the tab is closed.

## Permissions

- `activeTab`: temporary access to the tab's URL only when the user opens the extension.
- `browsingData`: removal of the selected data types.
- `storage`: locally saves the last checked options and the chosen language to restore them on the next use.

The extension requires Chrome 96 or later to use the API's asynchronous interface.

## Performance

Removal runs one data type at a time, which allows real-time progress to be shown.
The total time depends on the site's data volume: **browser cache** is the slowest
type, since Chrome scans the entire cache filtering by origin; **IndexedDB** from
heavy sites can also take a few seconds. Cookies, Local Storage and Cache Storage
are virtually instant. Uncheck unnecessary types for faster cleanups.

## Development

Run the local validation without installing dependencies:

```bash
node --test
node --check popup.js
```
