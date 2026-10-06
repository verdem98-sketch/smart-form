# Straight Kitchen pre-implementation audit

Audit completed before runtime or Webflow edits on 2026-10-06.
Starting releases: backend aaa0890752f868f934e1188d2af2ae92c1c96790; frontend d330a92b883ffe2a30a2b79edde3e4694566be92. Prompt rewrite is complete. Both working trees were clean.

## Sources and architecture
Inspected the published 453,694-byte /prava-kuhnya HTML, complete Webflow element tree, all 51 embeds, page head/footer (49,821 / 25,582 characters), site head/footer (4,320 / 3,278), all 54 static script tags and 67 style blocks, both Webflow CSS bundles, runtime script URLs, and relevant Webflow vendor form/interaction modules. Local external engine and collector match the pinned live commit. Vendor analytics/navigation/form transport are shared site dependencies and are not candidates for a planner rewrite.

The shared navbar precedes .sf-page-prava > .sf-shell-prava > .sf-panel-prava. Header contains Back, normal title, final title and Close. .sf-body-prava contains .sf-right-prava > .sf-form-wrap > .smart-form-block-prava > .sf-form-prava.w-form > form#email-form. The two-column planner is inside .sf-header-left.sf-left-prava: .sticky-cad-wrap on the left and .combo-dim-phase on the right. Right-column children contain configuration, dimensions, AI parent, four material cards and two extras cards. .final-phase-prava is a sibling of this two-column wrapper in the same form. Webflow .w-form-done / .w-form-fail are siblings of the form. This unusual historical nesting is functional; do not migrate frameworks.

Current ten-step flow: configuration (five questions displayed together), dimensions, upper material, lower material, countertop, backsplash, appliances, extras, AI, booking/contact. AI generation is optional for booking; four materials are required for generation. Name/email are required; phone, custom date, inspiration, plan and notes remain optional.

## Ownership conflicts
- External engine chapters 1, 3 and 6 implement an older sequential-question/final-gate flow. Inline prava-two-step-flow-v33 implements the active all-questions wizard. Both write display/visibility/opacity and handle navigation.
- Three separate Back implementations restore broad groups or stale inline snapshots. They can re-show multiple phases without updating the wizard state.
- Material headings, Step 7, Step 8, AI heading and final title each have separate scripts, repeated timers and computed-layout corrections. Step 8 code searches inside a card although its heading is already a sibling. Absolute offsets and sticky rules conflict.
- Global progress observes the entire planner's class/style changes and writes those same classes/styles in its callback. This feedback loop can keep scheduling animation frames. Render-rules bridge also watches all descendant classes. There are global body/document text-patching observers for hints, a subtree duplicate-select observer, individual heading observers and final visibility observers.
- The calendar's observer is narrowly scoped to Webflow success element attributes and has a real external success signal; retain that purpose.
- Two material filter converters create duplicate selects, then a third script repeatedly removes duplicates. Search replaces gallery grids outside the original renderer, uses a separate selection path and silently truncates to 50 results.
- Material overlay rebuilds four swatches on input/change/click timers and reads visible cards; persistent canonical selection already exists in the external helper and must be reused.
- AI modal-opening script and collector each own portions of generation presentation; success remains in a full-screen modal.
- Preview-link submit builder and a delayed 120 ms patch compete after Webflow serializes the form. Text-field lock has positional fallback over unrelated input/select fields.
- Inspiration cards all have data-value="Дом и мекота" despite five different visible labels. Telephone duplicates Name data-name/name/id; extras duplicate Checkbox fields and ids. Webflow's actual serializer overwrites duplicate field keys.
- Site widget has two shared initialization scripts with different storage keys. This is outside planner scope; document rather than change it.

## Styling and visual findings
Page head has repeated fixed CAD widths (600 then 520 then 100%), height locks, success-card overrides labelled "MUST BE LAST", repeated selected-state rules, hidden check decorations and multiple shadow/radius families. Later embeds/footer add another overriding stack, including more than a thousand !important declarations. Several selectors target obsolete .combo-dim.phase rather than the published .combo-dim-phase.

Desktop initial two-column geometry is coherent but material/extras cards narrow the right column with an additional 20px inset. Stage headings use inconsistent widths and optical/absolute centering. Material cards are forced to 760px minimum height. Preview uses fixed 350px height with material tiles obscuring the sketch. Final booking cards use 18px radius vs 5px stage cards; contact/inspiration/plan layouts use separate margins, widths and shadows. Hidden selected checkmarks, success-note pseudo labels and a stray "<" appear in accessibility/page content.

Confirmed responsive overflow before edits: final phase scrollWidth 813 at viewport 768; scrollWidth 658 at viewport 390. Calendar and contact/card minimum widths are responsible. CSS source and current visible flow were inspected on desktop, tablet and mobile.

## Behaviour and performance
Traced configuration selections, dimension pickers, all four material steps, appliance selects, all seven extras, AI action, and final booking/contact without generation/submission. Calendar generates seven free weekdays starting at local today+2, skips weekends, preserves blocked dates and booked/pending slots from CMS. Stored slot restoration and successful-submit locking must remain. Current custom-date input clears DOM slot selection but leaves the previous slot in storage, so reload can resurrect an obsolete selection. Slots are divs with click-only interaction.

Many click handlers queue 0/60/80/180/200ms layout work on every document click. Several timers re-enforce phase state after a transition. Geometry reads followed by important style writes, observers watching self-written attributes, and duplicate gallery DOM work are the principal Page Unresponsive risks. No image API calls were made during audit.

Backend path remains collector -> kitchen-visual normalized payload -> buildStraightKitchenScene -> compileStraightKitchenRenderPrompt -> queued job -> material attachments -> image API -> polling result. Prompt/material-only attachment roles and model/API settings are already finalized. Calendar form transport is Webflow's shared forms module, not a custom backend booking endpoint in these repositories.

## Deterministic consolidation plan
1. Retain CAD selection, dimension math, island visibility, actual booking date/status rules and success transport. Remove only confirmed superseded sequential phase/card/final ownership.
2. One explicit flow owner controls all ten steps, visible cards/headings, progress, navigation and validation. Hidden phases use hidden/inert plus one scoped CSS visibility contract. No observers.
3. One gallery owner handles existing source arrays/filter values, page/search/render and canonical selected identity. Do not change material records or infer metadata from filenames.
4. One page-scoped visual stylesheet consolidates the existing gray/charcoal/green identity. Uniform external headers/cards/nav and responsive grids replace old override layers.
5. Separate preview state owner: planner, loading, generated, error. Generation success supplies its image directly; preserve previous preview on failure; material summaries disappear with generated image. No normal modal.
6. Keep calendar source logic; repair stored custom-date selection, keyboard controls and duplicate field identities. Compile submission fields/preview link synchronously before Webflow serialization.
7. Remove archived obsolete embeds/head/footer patches and the site-footer hint observer (it only targets this page); preserve shared cookies, widget, navbar, Webflow forms and unrelated pages.
8. Test transformed published fixture locally including all new runtime modules, mocked generation success/error/retry and Webflow success signal. Re-run backend geometry/enrichment/prompt suites unchanged and existing frontend assertions. Release only after syntax/lint/tests and browser flow/responsive gates.

## Must not disturb / limits
Dishwasher 450/600, fixed 600 housings, bottle pull-out 150, filler/storage allocation, exact standard/deep schedules, room-height validation, handleless independence, drawers/panel propagation, fridge distinction, canonical material persistence and attachment order lower -> upper -> countertop -> backsplash. No CAD generation attachment. No paid generation or real booking/form submission in testing.

Source material filename/decor conflicts remain outside scope. Missing island height/material assignments and unresolved drawer/glass targeting remain explicitly unavailable in structured scene data. Live booked-slot race prevention depends on the existing Webflow/CMS booking process; this task must not claim new atomic reservations.
