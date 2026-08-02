# Limpar Dados do Site extension guide

## Architecture

`manifest.json` defines the Manifest V3 extension contract and `popup.js` implements the active-tab workflow. The extension must request only `activeTab`, `browsingData` and `storage`.

## Validation

```bash
node --test
node --check popup.js
```

Then load the unpacked extension in Chrome and verify one real origin.

## Privacy contract

- Determine the origin from the active tab only after the user opens the popup.
- Use the `origins` filter for browser-data types that support it.
- Explain the broader registrable-domain scope of cookie removal in the README and UI.
- Do not add broad host permissions or telemetry without an explicit product requirement and documentation update.
