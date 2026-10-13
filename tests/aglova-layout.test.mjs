import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const engine = require('../aglova-layout.js');

// The browser layout engine must place exactly what the backend corner planner places (the AI step renders from the backend scene).
const candidates = ['../../backend/tests/corner-runtime.mjs', '../../verde-contract-automation/tests/corner-runtime.mjs'].map(p => new URL(p, import.meta.url));
const runtimeUrl = candidates.find(u => fs.existsSync(u));
const backend = runtimeUrl ? await import(runtimeUrl.href) : null;

function payload(c) {
  const ap = (name, v) => ({ enabled: !!v, type: v || null });
  return {
    version: 'aglova-ai-visual-v1', kitchenType: 'aglova',
    configuration: {
      chimney: { value: c.chimney ? 'Да' : 'Не', label: c.chimney ? 'Да' : 'Не' },
      waterWall: { value: 'На стена ' + c.waterWall, label: 'На стена ' + c.waterWall },
      ovenTallUnit: { value: c.ovenTower ? 'yes' : 'no', label: c.ovenTower ? 'Да' : 'Не' },
      fridgeType: { value: c.fridge, label: c.fridge === 'built_in' ? 'Вграден' : 'Свободностоящ' },
      bar: { value: 'НЕ', label: 'НЕ' },
    },
    technicalRequirements: { wall1LengthMm: c.w1, wall2LengthMm: c.w2, roomHeightMm: 2700, chimneyAMm: c.chimney ? c.a : undefined, chimneyBMm: c.chimney ? c.b : undefined, deepUpperCabinets: false, upperRowMode: 'standard' },
    appliances: { dishwasher: ap('d', c.dish), washingMachine: ap('w', c.wash), microwave: ap('m', c.micro), coffeeMachine: ap('c', c.coffee) },
    materials: {}, extras: c.bottle ? [{ field: 'bottle_rack', label: 'bottle' }] : [],
  };
}
const key = m => m.type + ':' + (m.widthMm ?? m.w) + '@' + (m.xMm ?? m.x);

test('corner layout engine matches the backend planner', { skip: !backend }, () => {
  let compared = 0;
  const walls = [3000, 3300, 3600, 4100, 4750];
  for (const w1 of walls) for (const w2 of [2400, 3000, 3850]) for (const waterWall of [1, 2]) for (const ovenTower of [true, false]) for (const chimney of [false]) for (const dish of [null, 'built_in_45', 'free_standing_60']) for (const wash of [null, 'built_in']) for (const bottle of [false, true]) {
    const c = { w1, w2, waterWall, ovenTower, chimney, a: 400, b: 600, fridge: 'built_in', dish, wash, micro: ovenTower ? 'built_in' : null, coffee: null, bottle };
    const b = backend.buildCornerKitchenScene(payload(c));
    const e = engine.planCorner({ wall1Mm: w1, wall2Mm: w2, heightMm: 2700, waterWall, ovenTower, fridge: 'built_in', dishwasherMm: dish ? Number(dish.slice(-2)) * 10 : 0, washer: !!wash, microwave: !!c.micro, coffee: false, basket: bottle, chimney, chimneyAMm: c.a, chimneyBMm: c.b, deep: false });
    assert.equal(e.errors.length > 0, !b.ok, JSON.stringify(c) + ' ' + e.errors.join('|') + ' / ' + b.errors.join('|'));
    if (!b.ok) continue;
    for (const [wn, bw] of [[1, b.scene.walls.wall1], [2, b.scene.walls.wall2]]) {
      const ew = e.walls[wn], pos = engine.position(ew.modules, ew.startMm);
      assert.deepEqual(pos.items.map(key), bw.modules.map(key), JSON.stringify(c) + ' wall ' + wn);
      assert.equal(ew.fillerMm, bw.fillerMm);
      const runs = engine.upperRuns(wn, pos.items), spans = [];
      runs.forEach(r => { let x = r.x0; r.units.forEach(u => { spans.push(x + ':' + u.w); x += u.w; }); });
      assert.deepEqual(spans, bw.upperStandard.map(s => s.xMm + ':' + s.widthMm), JSON.stringify(c) + ' uppers wall ' + wn);
    }
    compared++;
  }
  assert.ok(compared > 100, 'compared ' + compared);
});

test('applyOrder keeps the corner unit first and unknown ids in their slots', () => {
  const mods = [{ id: 'cornerBase#0', type: 'cornerBase', w: 900 }, { id: 'a', type: 'genericBase', w: 600 }, { id: 'b', type: 'genericBase', w: 600 }];
  assert.deepEqual(engine.applyOrder(mods, ['b', 'a', 'cornerBase#0']).map(m => m.id), ['cornerBase#0', 'b', 'a']);
  assert.deepEqual(engine.applyOrder(mods, null).map(m => m.id), ['cornerBase#0', 'a', 'b']);
});

test('errors: missing walls, fixed modules that do not fit', () => {
  assert.match(engine.planCorner({ wall1Mm: 0, wall2Mm: 3000 }).errors[0], /стена 1/);
  const r = engine.planCorner({ wall1Mm: 1500, wall2Mm: 1000, waterWall: 1, ovenTower: true, fridge: 'built_in', dishwasherMm: 600, washer: true });
  assert.ok(r.errors.length);
});

test('narrow chimney: wall 2 starts beside wall 1 run, runs never overlap', () => {
  const p = engine.planCorner({ wall1Mm: 3000, wall2Mm: 4000, heightMm: 2700, waterWall: 1, ovenTower: false, fridge: 'built_in', dishwasherMm: 0, washer: false, chimney: true, chimneyAMm: 500, chimneyBMm: 500, deep: false });
  assert.deepEqual(p.errors, []);
  assert.equal(p.walls[1].startMm, 660);
  assert.equal(p.walls[2].startMm, 660);
  const q = engine.planCorner({ wall1Mm: 3000, wall2Mm: 4000, heightMm: 2700, waterWall: 1, ovenTower: false, fridge: 'built_in', dishwasherMm: 0, washer: false, chimney: true, chimneyAMm: 400, chimneyBMm: 800, deep: false });
  assert.equal(q.walls[2].startMm, 860);
});

test('cross-wall move re-sizes the generic cabinets so both walls still add up', () => {
  const cfg = { wall1Mm: 3000, wall2Mm: 4000, heightMm: 3000, waterWall: 1, ovenTower: true, fridge: 'built_in', dishwasherMm: 450, washer: false, basket: true };
  const plan = engine.planCorner(cfg);
  const ok = engine.applyMoves(plan, [{ id: 'dishwasher#0', to: 2, at: 1 }, { id: 'basket#0', to: 1, at: 1 }]);
  assert.equal(ok.length, 2);
  [1, 2].forEach((w) => {
    const wl = plan.walls[w], corner = wl.modules.some((m) => m.type === 'cornerBase') ? 900 : 0;
    assert.equal(wl.modules.filter((m) => m.type !== 'cornerBase').reduce((s, m) => s + m.w, 0) + wl.fillerMm, wl.lengthMm - wl.startMm - corner);
  });
  assert.ok(plan.walls[2].modules.some((m) => m.id === 'dishwasher#0'));
});

test('two ordinary cabinets on different walls trade widths and the others absorb the difference', () => {
  const plan = engine.planCorner({ wall1Mm: 3000, wall2Mm: 4000, heightMm: 3000, waterWall: 1, ovenTower: true, fridge: 'built_in', dishwasherMm: 0, washer: false });
  const ok = engine.applyMoves(plan, [{ gs: ['genericBase#0', 'genericBase#2'] }]);
  assert.equal(ok.length, 1);
  [1, 2].forEach((w) => { const wl = plan.walls[w], corner = wl.modules.some((m) => m.type === 'cornerBase') ? 900 : 0; assert.equal(wl.modules.filter((m) => m.type !== 'cornerBase').reduce((s, m) => s + m.w, 0) + wl.fillerMm, wl.lengthMm - wl.startMm - corner); });
  assert.equal(plan.walls[1].modules.find((m) => m.id === 'genericBase#0').w, 800);
});
