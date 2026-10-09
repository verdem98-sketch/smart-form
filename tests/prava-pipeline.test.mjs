import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";
import { buildStraightKitchenScene } from "../../backend/tests/scene-runtime.mjs";

const fixture = fs.readFileSync(new URL("./fixtures/prava-published-2026-10-06.html", import.meta.url), "utf8");
const frontend = fs.readFileSync(new URL("../prava-smart-form.js", import.meta.url), "utf8");
const collector = fs.readFileSync(new URL("../webflow/prava-ai-visualization.js", import.meta.url), "utf8");
const fields = ["upper_finish", "lower_finish", "countertop_finish", "backsplash_finish"];
const clone = value => JSON.parse(JSON.stringify(value));

async function setup(t) {
  const errors = [];
  const console = new VirtualConsole();
  console.on("jsdomError", error => errors.push(error.message));
  const dom = new JSDOM(fixture, { url: "https://www.verde-m.com/prava-kuhnya", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: console });
  t.after(() => dom.window.close());
  const win = dom.window, doc = win.document;
  win.fetch = () => { throw new Error("Network/image generation disabled in local test"); };
  // Run the actual gallery/select/search/collector code, never remote scripts.
  for (const node of [...doc.querySelectorAll("script:not([src])")]) {
    const source = node.textContent;
    if (source.includes("window.collectPravaKitchenConfig")) win.eval(collector);
    else if (source.includes("const D=[") || source.includes("function parseCatalog(wrap)") ||
      source.includes("function extractD(wrap)") || source.includes("var card=e.target.closest('.material-card')") ||
      source.includes("var panel=ensureHidden(host,'panel_doors'")) win.eval(source);
  }
  // The unchanged rendering observers need browser layout, which JSDOM does not provide.
  // Execute the new scoped helper and the real configuration engine; no visual observers.
  const chapter1 = frontend.indexOf("/* =========================================================\n   CHAPTER 1");
  win.eval(frontend.slice(frontend.indexOf("/* PRAVA critical pipeline state"), chapter1));
  const configStart = frontend.indexOf('document.addEventListener("DOMContentLoaded", function () {', chapter1);
  const configEnd = frontend.lastIndexOf("/* =========================================================", frontend.indexOf("   CHAPTER 2"));
  win.eval(frontend.slice(configStart, configEnd));
  await new Promise(resolve => doc.addEventListener("DOMContentLoaded", resolve, { once: true }));
  assert.deepEqual(errors, [], "initialization errors");
  function choice(field, value) {
    const wrap = doc.querySelector('.question-wrap-prava[data-field="' + field + '"]');
    const pill = [...wrap.querySelectorAll(".option-pill")].find(x => x.getAttribute("data-value") === value);
    pill.click();
    assert.ok(pill.classList.contains("active") || pill.classList.contains("is-selected"));
  }
  choice("water_position_prava", "center");
  choice("oven_tall_unit", "yes");
  choice("fridge_type", "Вграден");
  choice("deep_cabinets", "no");
  choice("island", "no");
  function dimension(key, totalCm) {
    const row = doc.querySelector('.dimension-row[data-dim="' + key + '"]');
    for (const [selector, value] of [[".meters-control", Math.floor(totalCm / 100)], [".centimeters-control", totalCm % 100]]) {
      const el = row.querySelector(selector + " .picker-value-text") || row.querySelector(selector + " .picker-value");
      if (el) el.textContent = String(value);
    }
  }
  dimension("len_prava_3", 750);
  dimension("height_prava_3", 280);
  for (const field of fields) doc.querySelector('.question-wrap-vision[data-field="' + field + '"] .material-card').click();
  function extra(field, checked = true) {
    const input = doc.querySelector('[data-field="' + field + '"] input[type=checkbox]');
    assert.ok(input, "wired extra: " + field);
    input.checked = checked;
    input.dispatchEvent(new win.Event("change", { bubbles: true }));
  }
  function appliance(name, value) {
    const el = doc.querySelector('[name="' + name + '"]');
    el.value = value;
    el.dispatchEvent(new win.Event("change", { bubbles: true }));
  }
  const payload = () => clone(win.collectPravaKitchenConfig());
  const scene = () => {
    const result = buildStraightKitchenScene(payload());
    assert.equal(result.ok, true, result.errors.join("; "));
    return result.scene;
  };
  return { win, doc, choice, dimension, extra, appliance, payload, scene };
}

test("handleless is independent from deep upper selection; Step 8 labels unchanged", async t => {
  const env = await setup(t);
  const original = new JSDOM(fixture);
  t.after(() => original.window.close());
  const labels = d => [...d.querySelectorAll(".prava-extras-card .w-form-label")].map(x => x.textContent);
  assert.deepEqual(labels(env.doc), labels(original.window.document));
  assert.equal(env.doc.querySelectorAll('.question-wrap-prava[data-field="deep_cabinets"]').length, 1);
  assert.equal(env.doc.querySelectorAll('[data-field="deep_cabinets"] input[type=checkbox]').length, 0);
  env.extra("handleless");
  assert.equal(env.payload().technicalRequirements.deepUpperCabinets, false);
  assert.equal(env.scene().requested.features.handleless, true);
  assert.equal(env.scene().upperCabinetry.topRow.enabled, false);
  env.choice("deep_cabinets", "yes");
  assert.equal(env.scene().upperCabinetry.topRow.enabled, true);
  env.extra("handleless", false);
  assert.equal(env.scene().upperCabinetry.topRow.enabled, true);
});

test("drawers and framed doors reach the scene and respond to deselection", async t => {
  const env = await setup(t);
  env.extra("more_drawers"); env.extra("panel_doors");
  assert.ok(env.payload().extras.some(x => x.field === "more_drawers"));
  assert.ok(env.payload().extras.some(x => x.field === "panel_doors"));
  assert.equal(env.scene().requested.features.moreDrawers, true);
  assert.equal(env.scene().requested.features.panelDoors, true);
  env.extra("more_drawers", false); env.extra("panel_doors", false);
  assert.equal(env.scene().requested.features.moreDrawers, false);
  assert.equal(env.scene().requested.features.panelDoors, false);
});

test("both UI refrigerator states remain distinct without changing 600 mm housing", async t => {
  const env = await setup(t);
  assert.equal(env.scene().requested.appliances.fridgeType, "built_in");
  env.choice("fridge_type", "Свободностоящ");
  const scene = env.scene(), module = scene.baseRun.find(x => x.type === "fridge");
  assert.equal(scene.requested.appliances.fridgeType, "free_standing");
  assert.equal(module.applianceType, "free_standing");
  assert.equal(module.widthMm, 600);
});

test("room height enters scene and rejects the existing oversized resolved stack", async t => {
  const env = await setup(t);
  assert.equal(env.scene().geometry.roomHeightMm, 2800);
  assert.deepEqual(env.scene().geometry.verticalFit, { requiredHeightMm: 2400, fits: true });
  env.choice("deep_cabinets", "yes");
  assert.equal(env.scene().geometry.verticalFit.requiredHeightMm, 2500);
  env.dimension("height_prava_3", 249);
  const result = buildStraightKitchenScene(env.payload());
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /2500.*2490/);
});

for (const field of fields) {
  test(field + " canonical record survives pagination and filtering", async t => {
    const env = await setup(t);
    const before = env.payload().materials[field.replace("_finish", "")];
    const wrap = env.doc.querySelector('.question-wrap-vision[data-field="' + field + '"]');
    [...wrap.querySelectorAll(".page-btn")].find(x => x.textContent === "2").click();
    assert.equal([...wrap.querySelectorAll(".material-card")].some(x => x.dataset.value === before.value), false);
    assert.deepEqual(env.payload().materials[field.replace("_finish", "")], before);
    const filter = wrap.querySelector('[data-filter-kind="manufacturer"][data-filter-value="Kronospan"]') ||
      wrap.querySelector('[data-kind="manufacturer"][data-value="Kronospan"]');
    filter.click();
    assert.deepEqual(env.payload().materials[field.replace("_finish", "")], before);
    const material = env.scene().materials[field.replace("_finish", "")];
    assert.equal(material.id, before.value);
    assert.equal(material.manufacturer, before.manufacturer);
    assert.equal(material.sampleImageUrl, before.sampleImageUrl);
  });
}

test("search re-render preserves choice; choosing a search result replaces it", async t => {
  const env = await setup(t), role = "countertop";
  const before = env.payload().materials[role];
  const wrap = env.doc.querySelector('[data-field="countertop_finish"]');
  const input = wrap.querySelector(".prava-worktop-search input");
  input.value = "K003";
  input.dispatchEvent(new env.win.Event("input", { bubbles: true }));
  await new Promise(resolve => env.win.setTimeout(resolve, 120));
  assert.deepEqual(env.payload().materials[role], before);
  const card = wrap.querySelector(".material-card");
  assert.ok(card);
  const nextId = card.dataset.value;
  card.click();
  assert.equal(env.payload().materials[role].id, nextId);
  assert.notEqual(nextId, before.id);
});

test("saved ID resolves from gallery source even without a selected card; clearing remains cleared", async t => {
  const env = await setup(t);
  const field = "lower_finish", role = "lower";
  const wrap = env.doc.querySelector('[data-field="' + field + '"]');
  const next = [...wrap.querySelectorAll(".material-card")][1].dataset.value;
  const hidden = env.doc.querySelector('input[name="' + field + '"]');
  hidden.value = next;
  hidden.dispatchEvent(new env.win.Event("change", { bubbles: true }));
  wrap.querySelector(".material-gallery-grid").innerHTML = "";
  assert.equal(env.payload().materials[role].id, next);
  hidden.value = "";
  hidden.dispatchEvent(new env.win.Event("change", { bubbles: true }));
  assert.equal(env.payload().materials[role], null);
});

test("material-only validation needs no sketch and keeps lower/upper/countertop/backsplash order", async t => {
  const env = await setup(t);
  env.doc.querySelectorAll(".cad-stage img,.cad-stage-prava img").forEach(x => x.remove());
  assert.equal(env.win.validatePravaKitchenConfig().valid, true);
  assert.equal("sketchLayers" in env.payload(), false);
  assert.deepEqual(env.scene().materialReferenceUrls.map(x => x.role), ["lower", "upper", "countertop", "backsplash"]);
});

test("all optional appliance enums keep existing fixed widths and tower rules", async t => {
  const env = await setup(t);
  for (const type of ["built_in_45", "free_standing_45", "built_in_60", "free_standing_60"]) {
    env.appliance("dishwasher_type", type);
    assert.equal(env.scene().baseRun.find(x => x.type === "dishwasher").widthMm, type.endsWith("45") ? 450 : 600);
  }
  env.extra("bottle_rack");
  assert.equal(env.scene().baseRun.find(x => x.type === "basket").widthMm, 150);
  for (const type of ["built_in", "free_standing"]) {
    env.appliance("washing_machine_type", type);
    env.appliance("microwave_type", type);
    env.appliance("coffee_machine_type", type);
    assert.equal(env.scene().baseRun.find(x => x.type === "washingMachine").widthMm, 600);
    const scene = env.scene();
    for (const name of ["microwave", "coffeeMachine"]) {
      assert.equal(scene.requested.appliances[name], true);
      assert.equal(scene.requested.appliances[name], scene.structuredData.appliancePresence[name].enabled);
      assert.equal(scene.structuredData.appliancePresence[name].placementScope, type === "built_in" ? "module" : "countertop");
      assert.equal(scene.baseRun.some(m => m.appliances?.includes(name)), type === "built_in");
    }
  }
  env.choice("oven_tall_unit", "no");
  env.appliance("microwave_type", "built_in"); env.appliance("coffee_machine_type", "built_in");
  assert.ok(env.scene().baseRun.some(x => x.type === "ovenHobBase" && x.widthMm === 600));
  assert.deepEqual(env.scene().baseRun.find(x => x.type === "applianceTower").appliances, ["microwave", "coffeeMachine"]);
  assert.equal(env.scene().totals.plannedWidthMm, 7500);
});

test("helper adds no MutationObserver and touches only the straight page", () => {
  const added = frontend.slice(frontend.indexOf("/* PRAVA critical pipeline state"), frontend.indexOf("   CHAPTER 1"));
  assert.equal(added.includes("new MutationObserver"), false);
  const dom = new JSDOM("<div class='sf-page-aglova'><label data-field='deep_cabinets'><input type='checkbox'></label></div>", { runScripts: "outside-only" });
  try {
    dom.window.eval(added.slice(0, added.lastIndexOf("/* =========================================================")));
    assert.ok(dom.window.document.querySelector('[data-field="deep_cabinets"]'));
    assert.equal(dom.window.document.querySelector('[data-field="handleless"]'), null);
  } finally { dom.window.close(); }
});

test("UI upper selections produce independent enriched standard/deep schedules", async t => {
  const env = await setup(t);
  let data = env.scene().structuredData;
  assert.equal(data.upperSchedules.standard.enabled, true);
  assert.equal(data.upperSchedules.deep.enabled, false);
  assert.ok(data.upperSchedules.standard.modules.every(m => m.bottomMm === 1450 && m.topMm === 2170 && m.depthMm === 350));
  env.choice("deep_cabinets", "yes");
  data = env.scene().structuredData;
  assert.ok(data.upperSchedules.deep.modules.every(m => m.bottomMm === 2170 && m.topMm === 2500 && m.depthMm === 600));
  assert.deepEqual(data.upperSchedules.deep.modules.map(m => m.sourceBaseModuleId), data.upperSchedules.standard.modules.map(m => m.sourceBaseModuleId));
});

test("all UI front extras become actions with resolved scopes or explicit unresolved targets", async t => {
  const env = await setup(t);
  env.choice("deep_cabinets", "yes");
  for (const field of ["handleless", "more_drawers", "panel_doors", "glass_display", "lift_mechanisms", "counter_lighting"]) env.extra(field);
  const data = env.scene().structuredData;
  for (const key of ["handleless", "more_drawers", "panel_doors", "glass_display", "lift_mechanisms"]) {
    const action = data.frontActions.find(a => a.key === key);
    assert.equal(action.selected, true);
    assert.ok(data.extras.selected.some(e => e.field === key && e.actionKey === key));
    assert.equal(action.resolution, ["more_drawers", "glass_display"].includes(key) ? "unresolved" : "resolved_scope");
  }
  const lift = data.frontActions.find(a => a.key === "lift_mechanisms");
  assert.deepEqual(lift.targetModuleIds, data.upperSchedules.standard.modules.map(m => m.moduleId));
  assert.equal(data.upperSchedules.deep.modules.some(m => m.treatments.includes("lift_mechanisms")), false);
  assert.equal(data.extras.actions.find(a => a.key === "counter_lighting").selected, true);
  for (const field of ["handleless", "more_drawers", "panel_doors", "glass_display", "lift_mechanisms", "counter_lighting"]) env.extra(field, false);
  assert.ok(env.scene().structuredData.frontActions.every(a => a.selected === false && a.targetModuleIds.length === 0));
  assert.deepEqual(env.scene().structuredData.extras.selected, []);
});

test("island UI dimensions enter existing placement without fabricated height/material assignments", async t => {
  const env = await setup(t);
  assert.equal(env.scene().structuredData.island.enabled, false);
  env.choice("island", "yes");
  env.dimension("island_len_3a", 180); env.dimension("island_width_3a", 90);
  const island = env.scene().structuredData.island;
  assert.equal(island.lengthMm, 1800); assert.equal(island.widthMm, 900);
  assert.equal(island.centerXMm, 3750); assert.equal(island.distanceFromWallMm, 1600); assert.equal(island.rotationDeg, 0);
  assert.equal(island.heightMm, null);
  assert.deepEqual(island.materialAssignments, { cabinet: null, countertop: null });
  env.choice("island", "no");
  assert.equal(env.scene().structuredData.island.centerXMm, null);
});

test("four gallery identities and role/index mapping reach scene without interpreting asset filenames", async t => {
  const env = await setup(t), p = env.payload(), s = env.scene();
  for (const role of ["lower", "upper", "countertop", "backsplash"]) {
    const selected = p.materials[role], material = s.materials[role];
    for (const key of ["id", "manufacturer", "decorCode", "decorName", "surfaceCode", "category", "family", "displayName"]) assert.equal(material[key], selected[key] ?? null);
    assert.equal(material.profile, null);
    assert.equal(material.thicknessMm, null);
    assert.equal(material.productCode, null);
    const reference = s.structuredData.materialReferences.find(r => r.role === role);
    assert.equal(reference.materialId, selected.id);
    assert.equal(reference.sourceImageUrl, selected.sampleImageUrl);
  }
  assert.deepEqual(s.structuredData.materialReferences.map(r => [r.role, r.attachmentIndex]), [["lower", 1], ["upper", 2], ["countertop", 3], ["backsplash", 4]]);
});

test("explicit source-card metadata survives paging and filtering alongside the canonical record", async t => {
  const env = await setup(t);
  const wrap = env.doc.querySelector('[data-field="countertop_finish"]');
  const card = [...wrap.querySelectorAll(".material-card")][1];
  card.setAttribute("data-product-code", "SOURCE-PRODUCT");
  card.setAttribute("data-surface", "Source surface");
  card.setAttribute("data-finish", "Source finish");
  card.setAttribute("data-profile", "Source profile");
  card.setAttribute("data-thickness-mm", "12");
  card.click();
  const before = env.payload().materials.countertop;
  assert.equal(before.productCode, "SOURCE-PRODUCT");
  assert.equal(before.thicknessMm, 12);
  [...wrap.querySelectorAll(".page-btn")].find(x => x.textContent === "2").click();
  assert.deepEqual(env.payload().materials.countertop, before);
  const material = env.scene().materials.countertop;
  assert.equal(material.surface, "Source surface"); assert.equal(material.finish, "Source finish");
  assert.equal(material.profile, "Source profile"); assert.equal(material.thicknessMm, 12);
});

test("existing UI horizontal backsplash rule travels through payload to structured mapping", async t => {
  const env = await setup(t);
  assert.equal(env.payload().materialRules.backsplash.orientation, "horizontal");
  assert.deepEqual(env.scene().structuredData.backsplash, {
    enabled: true, orientation: "horizontal", source: "backsplash_orientation input",
    rotateMappingIfSourceVerticalDeg: 90, rotateSourceFile: false, unavailable: []
  });
  env.doc.querySelector('[name="backsplash_orientation"]').remove();
  delete env.doc.querySelector(".sf-page-prava").dataset.backsplashOrientation;
  assert.equal(env.payload().materialRules.backsplash.orientation, null);
  assert.match(env.scene().structuredData.backsplash.unavailable.join(" "), /not supplied/);
});

test("appliance UI enums retain exact structured variants and no unselected optional appliance is added", async t => {
  const env = await setup(t);
  for (const name of ["dishwasher", "washingMachine", "microwave", "coffeeMachine"]) assert.equal(env.scene().structuredData.appliancePresence[name].enabled, false);
  for (const kind of ["built_in", "free_standing"]) {
    for (const width of ["45", "60"]) {
      env.appliance("dishwasher_type", kind + "_" + width);
      const presence = env.scene().structuredData.appliancePresence.dishwasher;
      assert.equal(presence.variant, kind + "_" + width);
      assert.equal(presence.installation, kind);
    }
    for (const [field, name] of [["washing_machine_type", "washingMachine"], ["microwave_type", "microwave"], ["coffee_machine_type", "coffeeMachine"]]) {
      env.appliance(field, kind);
      const presence = env.scene().structuredData.appliancePresence[name];
      assert.equal(presence.enabled, true); assert.equal(presence.variant, kind);
      assert.equal(presence.installation, kind);
      if (name !== "washingMachine") assert.equal(presence.placementScope, kind === "built_in" ? "module" : "countertop");
    }
  }
});
