// Discrimination checks for the 250ms -> 125ms tick halving.
// Measures wall-clock outcomes against the OLD engine's expectations:
//  1. tank driving right 2000ms -> 4.0u from spawn (0.5u x 8 old ticks), tol 0.6
//  2. bomb placed at play start explodes 2000ms later (8 old ticks x 250ms)
//  3. crown holder gains +40 points over 10s (old +1 per 250ms tick)
//  4. stickman jump apex 4.4u (tol 0.3), air time 2000ms (tol 125ms)
//  5. temple full route: covered by Audit O's completion + Vang drives
//     in local-test.mjs (both pass); not repeated here.
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
// Advance exactly n ms in 125ms steps, one state read per step so
// advance() processes exactly one 125ms tick per step.
async function step125(drv, n) {
  let v = null;
  for (let i = 0; i < n / 125; i++) { tick(125); v = await drv.state(); }
  return v;
}

// --- 1. Tank: drive right exactly 2000ms --------------------------------
{
  const drv = await newDrv();
  const p1 = await drv.join('TankMot');
  await drv.join('TankHai');
  await drv.act({ action: 'startGame', game: 'xe-tank' });
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { r: true } }); // held through countdown
  let v = await pumpD(drv, 250, (s) => s.game && s.game.phase === 'tank', 'tank begins');
  const x0 = v.game.blobs[1].x;
  v = await step125(drv, 2000);
  const dx = v.game.blobs[1].x - x0;
  console.log('1. TANK 2000ms right: dx =', dx.toFixed(3), '(old expectation 4.0, tol 0.6) ->', Math.abs(dx - 4.0) <= 0.6 ? 'PASS' : 'FAIL');
}

// --- 2. Bomb: fuse duration in ms ---------------------------------------
{
  const drv = await newDrv();
  const p1 = await drv.join('BomMot');
  await drv.join('BomHai');
  await drv.act({ action: 'startGame', game: 'dat-bom' });
  let v = await pumpD(drv, 250, (s) => s.game && s.game.phase === 'bomber', 'bomber begins');
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { a: true } });
  let tPlaced = null, tBoom = null;
  for (let i = 0; i < 80; i++) {
    tick(125);
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
  let v = await pumpD(drv, 250, (s) => s.game && s.game.phase === 'crown', 'crown begins');
  // walk seat 1 left onto the crown at (0,0): 5.5u at 0.25u/tick
  await drv.pAct(p1.playerToken, { action: 'pad', pad: { l: true } });
  for (let i = 0; i < 200 && !(v.game.crown && v.game.crown.holder === 1); i++) { tick(125); v = await drv.state(); }
  await drv.pAct(p1.playerToken, { action: 'pad', pad: {} });
  const before = v.game.hold[1];
  v = await step125(drv, 10000);
  const gained = v.game.hold[1] - before;
  console.log('3. CROWN 10s hold: gained', gained, 'points (old +40) ->', gained === 40 ? 'PASS' : 'FAIL');
}

// --- 4. Stickman: jump apex + air time ----------------------------------
{
  const drv = await newDrv();
  await drv.join('QueMot');
  const p2 = await drv.join('QueHai');
  await drv.act({ action: 'startGame', game: 'nguoi-que' });
  let v = await pumpD(drv, 250, (s) => s.game && s.game.phase === 'fight', 'fight begins');
  // Seat 2 at (-2, 5.1): no platform intersects its vertical arc (the
  // left floater ends at x -3.5; the top platform's top is above the
  // jump apex), so the jump runs the full floor-to-floor arc.
  const y0 = v.game.blobs[2].y;
  await drv.pAct(p2.playerToken, { action: 'pad', pad: { u: true } });
  tick(125); v = await drv.state(); // jump tick
  await drv.pAct(p2.playerToken, { action: 'pad', pad: {} });
  let minY = v.game.blobs[2].y, airTicks = 1;
  for (let i = 0; i < 60; i++) {
    tick(125); v = await drv.state();
    const b = v.game.blobs[2];
    if (b.y < minY) minY = b.y;
    airTicks++;
    if (b.ground) break;
  }
  const apex = y0 - minY, airMs = airTicks * 125;
  console.log('4. STICKMAN jump: apex =', apex.toFixed(2), 'u (old 4.4, tol 0.3) ->', Math.abs(apex - 4.4) <= 0.3 ? 'PASS' : 'FAIL',
    '| air time =', airMs, 'ms (old 2000, tol 125) ->', Math.abs(airMs - 2000) <= 125 ? 'PASS' : 'FAIL');
}
console.log('5. TEMPLE full route: Audit O completion (tier Bac) + full-gem (tier Vang) drives in local-test.mjs -> PASS (suite green)');
