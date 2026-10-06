# Straight Kitchen canonical implementation

This is the durable implementation contract for `/prava-kuhnya`. Read it before adapting the planner to Corner or U-shaped kitchens. The pre-implementation audit and exact Webflow head/footer backups are beside this document and under `webflow/source-backups/`. The canonical deployment sources are versioned here, not in conversation memory.

## Page structure and phase order

The shared Webflow navbar is outside `.sf-page-prava`. The planner is `.sf-page-prava > .sf-shell-prava > .sf-panel-prava`. Its header owns Back, the normal title and Close. Flow moves the existing final title into the final phase and adds its own Back control there, so both remain visible after entering the calendar. The historical body wrappers `.sf-body-prava > .sf-right-prava > .sf-form-wrap > .smart-form-block-prava > .sf-form-prava.w-form > form#email-form` remain intact to preserve Webflow form transport and native success/error handling.

Inside the form, `.sf-header-left.sf-left-prava` is the two-column grid: `.sticky-cad-wrap` on the left and `.combo-dim-phase` on the right. The final phase is a sibling of that grid in the same form. Webflow `.w-form-done` and `.w-form-fail` are siblings of the form, never additional planner phases.

| Step | Content | Required to continue |
|---|---|---|
| 1 | Five configuration choices, displayed together | All five choices |
| 2 | Run length, room height, applicable island dimensions | Positive applicable dimensions |
| 3 | Upper materials | Optional for booking; required for AI |
| 4 | Lower materials | Optional for booking; required for AI |
| 5 | Countertop materials | Optional for booking; required for AI |
| 6 | Backsplash materials | Optional for booking; required for AI |
| 7 | Appliance variants | Optional appliances |
| 8 | Seven extras | Optional extras |
| 9 | Material-only AI visualization | AI itself optional for booking |
| 10 | Calendar, inspiration, timing, contacts and notes | Name/email; other existing optional fields stay optional |

Do not gate material navigation or booking on a paid generation. Close returns to the planner landing page; Back moves exactly one step and preserves choices. Reset retains the existing configuration-reset semantics.

## Responsibility and state ownership

| Source | Sole responsibility |
|---|---|
| `prava-smart-form.js` | Canonical material identity registry; configuration choice/hidden aliases; existing CAD layer selection; dimension picker arithmetic; island dimension visibility; calendar; inspiration/timing choices; success summary |
| `prava-material-gallery.js` | One renderer for all four galleries: exact source rows, filters, search, pagination, selection |
| `prava-flow.js` | Ten-step index, phase visibility/inertness, title/progress, Next/Back, configuration/dimension gates, scroll target |
| `prava-preview.js` | Left preview card state, decoded result image, material summaries, retry affordance |
| `webflow/prava-ai-visualization.js` | Existing payload collection/validation, queued POST/poll, explicit preview updates; no modal prerequisite |
| `prava-submit.js` | Unique source field names, optional notes, appliance submission aliases, synchronous preview-link preparation before Webflow serialization |
| `prava-planner.css` | Page-scoped visual system and responsive layout |
| Webflow native runtime | Shared navigation/interaction bundles, actual form submission and native done/fail state |

`window.pravaFlow.getStep()` is the phase index. `window.pravaGoToStep(1..10)` is the existing public integration point. Flow emits `prava:phase-changed` with `{step}`. Inactive phases use both native `hidden` and `inert`; `.sf-page-prava [hidden] {display:none!important}` is authoritative. No other script may write phase display/opacity, restore a broad snapshot, or intercept navigation. Existing CAD image visibility is separate from phase visibility.

## Visual system, headings, cards and navigation

Use `prava-planner.css` variables: gray background family, charcoal text/buttons, muted green selection, 14px main card radius, 10px nested card radius, 24px spacing. The shell is at most 1280px; two shrinkable columns (preview/content ratio 1.15:1) have a 32px desktop gap. Preserve the existing VERDE-M brand, logo and typography; no second embedded design system.

A single `.prava-global-progress` uses the prior ten-segment green/gray visual structure above the two columns, as a direct form child; it remains visible in the final phase. Its title, count, completed/active segments and ARIA value update directly from the existing `step` inside `prava-flow.js` render, with no observer, inferred DOM state or extra navigation owner. An existing bar element is reused if present. The right `.prava-step-header` retains its heading outside the content card and corresponding top space so both column heading baselines stay aligned. Steps 7 and 8 use the identical structure. The left heading and right heading align. The progress bar sticks below the existing navbar; opaque, page-colored pseudo-element backings cover the 16px sticky spacing and rounded edges. The form isolates stacking, the preview owns z-index 2, headings 4 and progress 6; CAD layers stay inside a stage stacking context. Heading/preview sticky offsets derive from navbar height plus measured bar height plus 16px, refreshed by phase render and resize. The left card itself is sticky; mobile stacks columns and makes it static. Transitions scroll the static right container or final phase, not a sticky heading. Immediate scrolling avoids overlapping smooth-scroll transitions.

Cards have one border/shadow/background family; option pills retain charcoal selected states and material/calendar selection uses green. Navigation is one sibling `.prava-navigation`, outside all content cards. Every control is a button except existing native configuration pills/links. Keyboard focus is visible. Validation uses a scoped `role=alert` message, not layout shake/timers or unrelated global fields.

Tablet keeps the two-column preview when space permits; below 768px columns stack. Material cards use two equal columns. Calendar uses three columns, then two on mobile; contacts stack on mobile. Long material labels wrap. Flex/grid children always permit shrinking. No fixed 760px card height or 600/520px column width may be copied.

## Materials and canonical identity

Four `.question-wrap-vision[data-field]` values are `upper_finish`, `lower_finish`, `countertop_finish`, `backsplash_finish`. Each gallery retains its hidden selected ID and a `script[type=application/json][data-prava-catalog]`. The JSON contains the exact prior source `items`, existing asset base and explicit PDC/MDF code sets. Do not infer extra metadata from filenames or remap known filename/decor conflicts.

`window.pravaMaterialSelections.get(field)` returns a copy of the canonical record. It resolves a hidden ID from source data even when its card is on another page or excluded by a filter. The capture listener preserves explicit card metadata before a renderer replaces the grid. Clearing the hidden input clears the selection. Collector, left summaries, submission URL and success summary consume this registry, not a visible selected-card lookup.

Cabinet rows keep ID, manufacturer, category, code, name and asset filename. Worktop rows keep ID, manufacturer, code, surface, source image and existing category/family. Missing display metadata stays unavailable. Countertop default family remains `thermal`; `slimline` and `compact` remain selectable. Filters combine with full-catalog search, and the resulting list is paginated by ten without a fifty-result cutoff. Source catalog sizes at consolidation: 356 upper, 356 lower, 172 countertop, 144 backsplash. These are source counts, not promises that all filename identities are corrected.

## Appliances and extras

Configuration fields: `water_position_prava` (plus submission alias `water_position`), `oven_tall_unit`, `fridge_type`, `deep_cabinets`, `island` (plus `island_enabled`). Built-in and freestanding refrigerator choices remain separate. `deep_cabinets` alone enables the deep upper row.

Appliance selects use existing exact enums in `dishwasher_type`, `washing_machine_type`, `microwave_type`, `coffee_machine_type`. Do not add unselected appliances. The four Yes/No hidden submission aliases are synchronized from these selects; the AI collector preserves the exact enum independently.

Extras use scoped checkbox containers with `data-field`: `glass_display`, `handleless`, `more_drawers`, `lift_mechanisms`, `panel_doors`, `counter_lighting`, `bottle_rack`. Names/IDs/data-name are unique. Handleless never aliases deep uppers. Panel doors are collected from the existing label without a Step 8 redesign. Source checkbox values, scene action scopes and unresolved target allocations remain unchanged.

Keep dishwasher 450/600mm variants, fixed 600mm housings, 150mm bottle pull-out and storage/filler allocation intact. Front schedules, upper tiers, room-height validation and island placement remain backend-authoritative. Island height/material assignments or drawer/glass target subdivisions unavailable in the source must not be fabricated by frontend UI.

## AI generation and preview state machine

The Generate button calls the existing collector → validation → POST `/contract-automation/api/kitchen-visual` → queued responseId → GET polling → successful result. There is one busy guard, preventing duplicate requests. Missing selections route to the appropriate step without requiring a sketch. Existing model, settings, image prompt and backend job behavior are unchanged.

Attachments remain **lower → upper → countertop → backsplash**. No CAD/sketch/reference geometry is attached. Planner data plus derived constraints remain authoritative. `collectPravaKitchenConfig()` and `validatePravaKitchenConfig()` are the public collector APIs. Backsplash source rule remains `horizontal` in the canonical hidden field.

`window.pravaPreview` exposes `setState`, `showImage` and `getState`. The card's `data-preview-state` is one of:

| State | Presentation |
|---|---|
| `planner` | Existing CAD layers and four material summaries |
| `loading` | Stable preview area with accessible loading overlay; preceding image/CAD retained |
| `generated` | One successfully decoded image in the same area; CAD hidden and four summaries hidden |
| `error` | Existing preview preserved, scoped error/retry overlay |

The stage uses the existing 1280:606 CAD image aspect ratio and a 382px minimum height to contain the absolute material overlay (four 85px tiles, three 6px gaps and two 12px insets). It no longer reserves space for summaries below the CAD or changes size when they hide. The overlay is inside the stage, left-aligned, in upper → backsplash → countertop → lower order; full captions remain available as titles. CAD layers fill the full stage with `object-fit:contain`, preserving all geometry. Generated image uses `object-fit:contain` and the same radius. It does not stretch, overflow or open a primary modal. The image is decoded before replacement; a failed image load preserves the last successful preview. A revision token prevents an obsolete load callback from replacing a newer result. Repeated generations reuse one image/status/summary DOM, never inject another overlay.

Success emits `prava-ai-generated` from the page with `imageDataUrl` and existing revisedPrompt metadata. Debug cost remains query-controlled metadata, separate from normal presentation. No observer detects generation state. Do not intentionally call the real image API in automated tests. A local fixture mock uses an existing inspiration asset solely for presentation testing and never ships to production.

## Final phase and calendar

Existing seven-free-weekday generation starts two local calendar days ahead, skips weekends, and reads Webflow CMS `.blocked-date-value` and `.booked-slot-item` date/time/status. Existing `booked` and `pending` slots stay unavailable. Slots are keyboard-accessible buttons by role, with `aria-pressed` / `aria-disabled`.

Selection writes `meeting_date` and `meeting_slot`, clears custom date, and persists in `smartFormSelectedSlotState_prava_v3`. Submitted selections preserve the existing local lock. Choosing a custom date clears the active slot **and its stored selection**, and persists the custom value; reload cannot resurrect the previous appointment. Back/forward preserves selection without rebuilding the calendar. Custom date remains optional text, not an invented booking validation rule.

The final phase uses the same card/radius/spacing/button system. Calendar logic remains in the engine, never duplicated in footer code. Inspiration cards use their actual distinct visible labels; timing remains optional. Name/email retain required status; phone is optional and has distinct `phone` / `Phone` serialization identity. Final notes retain the legacy `Field 4` submission alias as well as the canonical field. Final notes and four optional material notes are named explicitly, without positional fallbacks across appliance/filter/search fields.

`prava-submit.js` prepares the existing `/prava-preview` URL in a form-scoped capture submit handler, before Webflow's delegated serializer. It preserves existing CAD preview URL parameters for the booking summary; these are **not** image-generation attachments. No delayed post-serialization patch is permitted. The Webflow success summary uses canonical off-page material images.

One pre-existing, narrow MutationObserver remains on `.w-form-done` style/class, because actual Webflow transport is an external owner. It emits `prava:form-success` once and locks a submitted selected slot only after native success. Do not expand this observer to the page/body/document. No test sends an actual customer submission or reserves a real slot.

## Backend integration and unchanged authoritative rules

Backend prompt rewrite prerequisite commit is `aaa0890752f868f934e1188d2af2ae92c1c96790`; critical and enrichment layers precede it. This consolidation changes frontend presentation and flow only. `/api/kitchen-visual` under the `/contract-automation` Cloud mount normalizes payload, builds Straight Kitchen scene, validates the resolved cabinet stack against room height, builds the finalized prompt, queues generation and polls results.

Existing base 900mm, tall 2400mm, standard upper top 2170mm and deep upper top 2600mm derive from the current resolver. Do not invent replacement heights. Exact upper/front schedules and gaps, refrigerator distinctions, enriched material role/index mapping and structured selected appliance/extras are already covered by backend tests. Backend dry-run remains an offline inspection path; production paid generation is deliberately left for user testing.

## Deployment sources and public contracts

Five raw HTML replacement embeds are versioned under `webflow/canonical-embeds/`: AI card (8), upper (11), lower (12), countertop (13), backsplash (14). Pure dimension hidden inputs, appliance selects/aliases, inspiration/timing inputs and core hidden form inputs remain native Webflow embeds. `removals.json` records only confirmed superseded embed indexes against the audit snapshot. Head/footer source backups preserve recovery evidence.

Page head loads pinned `prava-planner.css`. Page footer loads the pinned engine, gallery, flow, preview, submit, then collector in deterministic defer order. Never use an unpinned mutable CDN branch. Shared cookie/widget/analytics/form code is preserved. Only the site-footer Prava-specific global hint observer is removed; its actual source text is handled locally.

Public classes/attributes: `.sf-page-prava`, `.sf-header-left.sf-left-prava`, `.sticky-cad-wrap`, `.cad-stage-prava`, `.combo-dim-phase`, `.question-wrap-prava[data-field]`, `.dimension-row[data-dim]`, `.question-wrap-vision[data-field]`, `.prava-extras-card`, `.final-phase-prava`, `[data-prava-phase]`, `[data-prava-nav]`, `[data-prava-catalog]`, `[data-prava-filter]`, `[data-preview-state]`, `[data-success]`, `[data-success-img]`, `.prava-global-progress`, `.prava-global-progress-head`, `.prava-global-progress-title`, `.prava-global-progress-count`, `.prava-global-progress-track`, `.prava-global-progress-seg[data-step]`. Keep these contracts explicit in any migration; do not find fields by DOM position or translated label substring when a canonical key exists.

## Reusable vs Straight-specific

Reusable: page shell, visual tokens, preview/content-column sticky pattern, card/nav/validation system, explicit hidden/inert phases, canonical material registry and renderer, preview state machine, queued-result presentation, unique form identities, calendar/optional contact pattern, regression fixture strategy.

Straight-specific: five configuration questions, CAD image classes keyed by water/oven/fridge, one-wall length dimension, current ten-step sequence, module resolver geometry, straight island position derivation, `/prava-preview` parameter contract, current DOM/root and material source datasets. Reuse structure, not Straight geometry or guessed conversions.

## Anti-patterns not to copy

- Global MutationObservers on body/document/planner classes or styles, especially callbacks writing their own observed attributes.
- Multiple phase owners, stale inline style snapshots, broad Back restoration, delayed title fixes or all-click layout timers.
- Separate filter converters, grid replacement search, arbitrary fifty-result truncation or DOM-only selected material lookup.
- Required sketch fields, reference geometry attachments, modal-based normal AI success, repeated image/status injection.
- Fixed card heights, computed optical absolute title offsets, chains of `!important` overrides. The few retained important rules enforce native hidden and override existing Webflow phase entrance opacity/transform only.
- Duplicate contact/checkbox names, positional note fallback, delayed submit mutation or a local success assumed before Webflow confirms it.
- Filename-derived material identity repairs, fabricated unavailable scene values, unselected appliances or guessed drawer/glass targets.

## Migration recipe: Straight → Corner

- [ ] Copy canonical shell, visual tokens, sticky heading, card/nav/validation and explicit preview architecture.
- [ ] Inventory Corner's full DOM/embeds/runtime/CMS transport before changing it; create source backups.
- [ ] Introduce a Corner-scoped root/phase owner; never reuse Straight's selector as a global matcher.
- [ ] Define exact Corner phase order and required/optional dimension contracts from existing product logic.
- [ ] Replace only Straight configuration keys, wall geometry/CAD selection and resolver integration with authoritative Corner inputs.
- [ ] Preserve dishwasher 450/600, fixed housings, bottle pull-out, storage/filler rules unless an explicit Corner rule differs.
- [ ] Share canonical material identity, filters/search/paging and four image roles; keep attachment order identical.
- [ ] Keep handleless/deep upper semantics separate, exact appliance types and explicit selected extras.
- [ ] Derive Corner schedules/positions from its geometry; leave genuinely unavailable values unavailable.
- [ ] Integrate native Corner booking form/calendar with the same capture serialization and unique field names.
- [ ] Keep one narrow external form-success signal; add no global observer or timer-based state detection.
- [ ] Add Corner geometry/scene/flow/calendar tests and local mocked image presentation before release.
- [ ] Verify desktop/laptop/tablet/mobile and every forward/back path, then pin deployment sources.
- [ ] Leave Straight source and production behavior untouched during that migration.

## Verification and remaining limitations

The release gate includes all existing frontend/backend tests, the full-runtime canonical suite, syntax and lint/type checks, local browser responsive checks, and live post-publish smoke checks. Mock generation and synthetic Webflow success exercise the integration without paid generation or a real booking submission.

Known catalog filename/decor conflicts are deliberately not repaired. Backend unavailable island physical height/material assignments and unresolved drawer/glass allocation targets remain explicit. Shared site widget duplication is outside this planner scope. The last AI result remains available when navigating back; a later generation always recollects the current authoritative selections.
