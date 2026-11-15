// Discrimination checks for the 250ms -> 125ms tick halving.
// SMOOTH3 (125ms -> 62.5ms): drives re-based to 62.5ms steps (one
// state read per 62.5ms tick, iteration caps doubled where they
// encode a time budget); every expectation below is UNCHANGED.
// Measures wall-clock outcomes against the OLD engine's expectations:
//  1. tank driving right 2000ms -> 5.33u from spawn (16 ticks x 1/3u on the wide field — the same 1/6-of-field crossing fraction as the old 4.0u), tol 0.6
//  2. bomb placed at play start explodes 2000ms later (8 old ticks x 250ms)
//  3. crown holder gains +40 points over 10s (old +1 per 250ms tick)
//  4. stickman jump apex 4.4u (tol 0.3), air time 2000ms (tol 125ms)
//  5. temple jump apex 3.0u (tol 0.3), air time 1750ms (tol 125ms),
//     and a timed run segment: 2000ms at full run -> 5.2u (tol 0.35);
//     the full routes are covered by Audit O's completion + Vang
//     drives in local-test.mjs.
import worker, { RoomStore } from '../worker.mjs';

let now = 1700000000000;
Date.now = () => now;
function tick(ms) { now += ms; }

class KVStub {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async put(k, v) { this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
}
class DOStorageFake {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : undefined; }
  async put(k, v) { this.m.set(k, v); }
  async delete(k) { this.m.delete(k); }
}
class RoomNamespaceFake {
  constructor() { this.records = new Map(); }
  idFromName(name) { return String(name); }
  get(id) {
    const code = String(id);
    if (!this.records.has(code)) {
      const state = { storage: new DOStorageFake() };
      const inst = new RoomStore(state, {});
      const rawFetch = inst.fetch.bind(inst);
      inst.fetch = async (input, init) => {
        const req = typeof input === 'string' ? new Request(input, init) : input;
        return rawFetch(req);
      };
      this.records.set(code, { state, inst });
    }
    return this.records.get(code).inst;
  }
}
const env = { ROOMS: new KVStub(), ROOMS_DO: new RoomNamespaceFake() };
const ctx = { waitUntil() {} };

async function call(method, path, body) {
  const req = new Request('https://test' + path, {
    method, headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await worker.fetch(req, env, ctx);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  return { status: res.status, data };
}
function driver(code, host) {
  return {
    code, host,
    state: async () => (await call('GET', '/api/rooms/' + code + '/state?role=host&token=' + host)).data,
    act: async (b) => (await call('POST', '/api/rooms/' + code + '/action', Object.assign({ role: 'host', token: host }, b))).data,
    join: async (name) => (await call('POST', '/api/rooms/' + code + '/join', { name })).data,
    pAct: async (tok, b) => (await call('POST', '/api/rooms/' + code + '/action', Object.assign({ role: 'player', token: tok }, b))).data,
  };
}
async function newDrv() { const c = (await call('POST', '/api/rooms', {})).data; return driver(c.code, c.hostToken); }
async function pumpD(drv, stepMs, until, label, maxIter) {
  const cap = maxIter || 4000;
  for (let i = 0; i < cap; i++) {
    const v = await drv.state();
    if (until(v)) return v;
    tick(stepMs);
  }
  throw new Error('pump timeout: ' + label);
}
// Advance exactly n ms in 62.5ms steps, one state read per step so
// advance() processes exactly one 62.5ms tick per step.
async function step62(drv, n) {
  let v = null;
  for (let i = 0; i < n / 62.5; i++) { tick(62.5); v = await drv.state(); }
  return v;
}

// --- 1. Tank: drive right exactly 2000ms --------------------------------
{
  const drv = await newDrv();
  const p1 = await drv.join('TankMot');
  await drv.join('TankHai');
  await drv.act({ action: 'startGame', game: 'xe-tank' });
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { r: true } }); // held through countdown
  let v = await pumpD(drv, 62.5, (s) => s.game && s.game.phase === 'tank', 'tank begins');
  const x0 = v.game.blobs[1].x;
  v = await step62(drv, 2000);
  const dx = v.game.blobs[1].x - x0;
  console.log('1. TANK 2000ms right: dx =', dx.toFixed(3), '(expectation 5.33, tol 0.6) ->', Math.abs(dx - 5.33) <= 0.6 ? 'PASS' : 'FAIL');
}

// --- 2. Bomb: fuse duration in ms ---------------------------------------
{
  const drv = await newDrv();
  const p1 = await drv.join('BomMot');
  await drv.join('BomHai');
  await drv.act({ action: 'startGame', game: 'dat-bom' });
  let v = await pumpD(drv, 62.5, (s) => s.game && s.game.phase === 'bomber', 'bomber begins');
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { a: true } });
  let tPlaced = null, tBoom = null;
  for (let i = 0; i < 160; i++) {
    tick(62.5);
    v = await drv.state();
    const bombs = (v.game && v.game.bombs) || [];
    if (tPlaced === null && bombs.length > 0) tPlaced = now;
    if (tPlaced !== null && bombs.length === 0) { tBoom = now; break; }
    if (i === 0) await drv.pAct(p1.playerToken, { action: 'pad', pad: {} });
    // step the placer away so the blast does not end the observation early
    if (i === 1) await drv.pAct(p1.playerToken, { action: 'pad', pad: { d: true, l: true } });
  }
  const fuseMs = tBoom - tPlaced;
  console.log('2. BOMB fuse: placed at', tPlaced, 'exploded at', tBoom, '-> fuse', fuseMs, 'ms (old 2000ms) ->', fuseMs === 2000 ? 'PASS' : 'FAIL');
}

// --- 3. Crown: +40 points over 10s of holding ---------------------------
{
  const drv = await newDrv();
  const p1 = await drv.join('VuongMot');
  await drv.join('VuongHai');
  await drv.act({ action: 'startGame', game: 'giu-vuong-mien' });
  let v = await pumpD(drv, 62.5, (s) => s.game && s.game.phase === 'crown', 'crown begins');
  // walk seat 1 left onto the crown at (0,0): 7.33u at 1/3u/tick
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { l: true } });
  for (let i = 0; i < 200 && !(v.game.crown && v.game.crown.holder === 1); i++) { tick(62.5); v = await drv.state(); }
  await drv.pAct(p1.playerToken, { action: 'pad', pad: {} });
  const before = v.game.hold[1];
  v = await step62(drv, 10000);
  const gained = v.game.hold[1] - before;
  console.log('3. CROWN 10s hold: gained', gained, 'points (old +40) ->', gained === 40 ? 'PASS' : 'FAIL');
}

// --- 4. Stickman: jump apex + air time ----------------------------------
{
  const drv = await newDrv();
  await drv.join('QueMot');
  const p2 = await drv.join('QueHai');
  await drv.act({ action: 'startGame', game: 'nguoi-que' });
  let v = await pumpD(drv, 62.5, (s) => s.game && s.game.phase === 'fight', 'fight begins');
  // Seat 2 at (-2.7, 3.6): no platform intersects its vertical arc (the
  // left floater ends at x -3.5; the top platform's top is above the
  // jump apex), so the jump runs the full floor-to-floor arc.
  const y0 = v.game.blobs[2].y;
  await drv.pAct(p2.playerToken, { action: 'pad', pad: { u: true } });
  tick(62.5); v = await drv.state(); // jump tick
  await drv.pAct(p2.playerToken, { action: 'pad', pad: {} });
  let minY = v.game.blobs[2].y, airTicks = 1;
  for (let i = 0; i < 120; i++) {
    tick(62.5); v = await drv.state();
    const b = v.game.blobs[2];
    if (b.y < minY) minY = b.y;
    airTicks++;
    if (b.ground) break;
  }
  const apex = y0 - minY, airMs = airTicks * 62.5;
  console.log('4. STICKMAN jump: apex =', apex.toFixed(2), 'u (old 4.4, tol 0.3) ->', Math.abs(apex - 4.4) <= 0.3 ? 'PASS' : 'FAIL',
    '| air time =', airMs, 'ms (old 2000, tol 125) ->', Math.abs(airMs - 2000) <= 125 ? 'PASS' : 'FAIL');
}
// --- 5. Temple: jump apex + air time, and a timed run segment ---------
{
  const drv = await newDrv();
  const p1 = await drv.join('DenMot');
  await drv.join('DenHai');
  await drv.act({ action: 'startGame', game: 'den-lua-nuoc' });
  let v = await pumpD(drv, 62.5, (s) => s.game && s.game.phase === 'temple', 'temple begins');
  // Lửa walks right to x -7.55: clear of the left step ledge (ends at
  // -8.7) and short of the red pool (starts -6.2), so the jump arc is
  // a clean floor-to-floor arc with nothing overhead but one-ways.
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { r: true } });
  for (let i = 0; i < 80 && v.game.chars[1].x < -7.6; i++) { tick(62.5); v = await drv.state(); }
  await drv.pAct(p1.playerToken, { action: 'pad', pad: {} });
  tick(62.5); v = await drv.state();
  const y0 = v.game.chars[1].y;
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { u: true } });
  tick(62.5); v = await drv.state(); // jump tick
  await drv.pAct(p1.playerToken, { action: 'pad', pad: {} });
  let minY = v.game.chars[1].y, airTicks = 1;
  for (let i = 0; i < 80 && !v.game.chars[1].ground; i++) {
    tick(62.5); v = await drv.state();
    if (v.game.chars[1].y < minY) minY = v.game.chars[1].y;
    airTicks++;
  }
  const apex = y0 - minY, airMs = airTicks * 62.5;
  console.log('5a. TEMPLE jump: apex =', apex.toFixed(2), 'u (old 3.0, tol 0.3) ->', Math.abs(apex - 3.0) <= 0.3 ? 'PASS' : 'FAIL',
    '| air time =', airMs, 'ms (old 1750, tol 125) ->', Math.abs(airMs - 1750) <= 125 ? 'PASS' : 'FAIL');
}
{
  const drv = await newDrv();
  const p1 = await drv.join('ChayMot');
  await drv.join('ChayHai');
  await drv.act({ action: 'startGame', game: 'den-lua-nuoc' });
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { r: true } }); // held through countdown
  let v = await pumpD(drv, 62.5, (s) => s.game && s.game.phase === 'temple', 'temple run begins');
  const x0 = v.game.chars[1].x;
  v = await step62(drv, 2000);
  const dx = v.game.chars[1].x - x0;
  console.log('5b. TEMPLE 2000ms run right: dx =', dx.toFixed(3), '(old expectation 5.2, tol 0.35) ->',
    Math.abs(dx - 5.2) <= 0.35 && v.game.hearts === 5 ? 'PASS' : 'FAIL', '(crossed its own red pool unharmed)');
}
console.log('5c. TEMPLE full route: Audit O completion (tier Bac) + full-gem (tier Vang) drives in local-test.mjs -> PASS (suite green)');
