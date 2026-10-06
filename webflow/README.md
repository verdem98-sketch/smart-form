# Prava critical pipeline fixes — local integration

These changes are local only. No remote branch was pushed, no Webflow content was edited, and no deployment, publication or paid generation was started.

## Runtime source

- `prava-smart-form.js`: scoped material selection persistence and two Step 8 semantic key repairs.
- `webflow/prava-ai-visualization.js`: versioned source of the existing inline AI collector, patched locally.
- The collector source baseline is the published 2026-10-06 collector captured in local commit `760be25`, not a new additional collector.

A future authorized release must update the existing external Prava script and replace the existing inline collector IIFE (the one exposing `window.collectPravaKitchenConfig`) with this source. Do not add a second collector or duplicate event bindings. The scoped helper runs at footer evaluation, before existing DOM-ready callbacks; it sets handleless and panel_doors on the existing controls without redesigning them.

Backend changes live in the sibling `../backend` checkout. Release both halves together when explicitly authorized. Nothing in this task updates the published page.

## Tests

Use Node 24 and the sibling backend checkout from the same fix set:

```text
npm ci --ignore-scripts --no-audit --no-fund
node --test tests/prava-pipeline.test.mjs
```

The fixture is the audited published page snapshot. JSDOM resource loading is disabled; remote scripts and images are never fetched. Tests execute the actual gallery/search/select scripts, patched collector, scoped persistence helper and unchanged configuration engine, then the actual backend scene builder. Unchanged visual layout observers are excluded because JSDOM has no browser layout.

Backend:

```text
node --test tests/prava-critical-pipeline.test.mjs
npm exec --offline -- tsc --noEmit --incremental false
npm exec --offline -- eslint src/lib/kitchen-modular-planner.ts src/app/api/kitchen-visual/route.ts
```

Backend tests include a fully mocked local route/image API. The mock does not perform network requests or paid generation.

## Preserved limits

The image prompt builder and model/API settings are unchanged. New drawers/panelDoors/fridge/material identity data is now present in the scene; extending artist instructions remains a separate task. Existing filename/decor mappings are deliberately preserved. Fixed module widths, storage/filler logic and material role order remain unchanged.
