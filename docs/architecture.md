# Limpar Dados do Site extension architecture

## Manifest boundary

This is a Chrome Manifest V3 popup extension. The manifest intentionally requests only `activeTab` and `browsingData`; it has no persistent host permissions, background worker, analytics, or remote code. Opening the popup grants temporary access to inspect the currently active tab.

## User flow

1. `popup.js` queries the active tab.
2. It parses the tab URL and enables the action only for `http:` or `https:` origins.
3. The user selects one or more removable data categories.
4. The extension calls `chrome.browsingData.remove` with the active origin and reloads that tab after success.

`popup.html` contains the stable element IDs consumed by the script; `popup.css` is presentation only. Keep the action disabled while origin discovery fails or no category is selected.

## Privacy contract

Origin filtering applies to the data types supported by the Chrome API. Cookie removal has broader registrable-domain behavior, so both UI and README must continue to disclose that related subdomain cookies can be affected. `sessionStorage` has no matching `browsingData` type and is not removed.

## Validation

```bash
node --test
node --check popup.js
```

Then load the unpacked extension in Chrome and validate an HTTPS origin, a non-web tab, no-selection handling, one selected storage type, and the post-clear reload. Do not add broad host permissions or telemetry without a documented product and privacy change.
