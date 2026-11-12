// Local test for the Nảy Party Cloudflare worker.
// - Storage: env carries a ROOMS_DO fake (the real RoomStore class, one
//   instance per room code, backed by in-memory Maps) so the whole suite
//   exercises the Durable Object path in loadRoom/saveRoom. The old KV stub
//   stays in env as a spy: with ROOMS_DO present it must see ZERO traffic.
// - Uses a fake clock (Date.now patched) so timed phases run instantly.
// - Plays a full match: lobby/bots -> Đố Vui (streak + ×2 verified exactly)
//   -> Đoán Số (×2 verified) -> Nhớ Màu (×2 verified) -> Đua Bấm Nút (+ replay)
//   -> Nhanh Tay (ms gaps) -> Đẩy Ra Khỏi Sàn (gamepad held-state arena)
//   -> Né Đạn (tick arena survival) -> Kéo Co (team knot math, exact)
//   -> Chia Hay Cướp (secret choices, rotating pairs, exact totals)
//   -> podium/final, and checks cumulative totals == sum of per-game points.
// Run: node tests/local-test.mjs
import worker, { QUIZ_BANK, EST_BANK, RoomStore } from '../worker.mjs';

let now = 1700000000000;
Date.now = () => now;
function tick(ms) { now += ms; }

class KVStub {
  constructor() { this.m = new Map(); this.getCount = 0; this.putCount = 0; }
  async get(k) { this.getCount += 1; return this.m.has(k) ? this.m.get(k) : null; }
  async put(k, v) { this.putCount += 1; this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
}
// Durable Object fake: idFromName/get return REAL RoomStore instances whose
// state.storage is an in-memory Map, one instance per room code — exactly
// the semantics loadRoom/saveRoom rely on (GET/PUT/POST /get//put//delete).
// fetch is wrapped only to normalize (string, init) into a Request like a
// real DO stub does, and to count PUTs for the storage-routing assertions.
class DOStorageFake {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : undefined; }
  async put(k, v) { this.m.set(k, v); }
  async delete(k) { this.m.delete(k); }
}
class RoomNamespaceFake {
  constructor() { this.records = new Map(); this.putCount = 0; }
  idFromName(name) { return String(name); }
  get(id) {
    const code = String(id);
    if (!this.records.has(code)) {
      const state = { storage: new DOStorageFake() };
      const inst = new RoomStore(state, {});
      const rawFetch = inst.fetch.bind(inst);
      const ns = this;
      inst.fetch = async (input, init) => {
        const req = typeof input === 'string' ? new Request(input, init) : input;
        if (req.method === 'PUT') ns.putCount += 1;
        return rawFetch(req);
      };
      this.records.set(code, { state, inst });
    }
    return this.records.get(code).inst;
  }
}
const doFake = new RoomNamespaceFake();
const env = { ROOMS: new KVStub(), ROOMS_DO: doFake };
const ctx = { waitUntil() {} };

let passed = 0;
function assert(cond, label) {
  if (!cond) throw new Error('ASSERT FAILED: ' + label);
  passed += 1;
  console.log('  ok -', label);
}
async function call(method, path, body) {
  const req = new Request('https://test' + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await worker.fetch(req, env, ctx);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* HTML page */ }
  return { status: res.status, text, data };
}

let CODE = null, HOST = null, P1 = null;
async function hState() { return (await call('GET', '/api/rooms/' + CODE + '/state?role=host&token=' + HOST)).data; }
async function pState() { return (await call('GET', '/api/rooms/' + CODE + '/state?role=player&token=' + P1.token)).data; }
async function hAct(body) { return (await call('POST', '/api/rooms/' + CODE + '/action', Object.assign({ role: 'host', token: HOST }, body))).data; }
async function pAct(body) { return (await call('POST', '/api/rooms/' + CODE + '/action', Object.assign({ role: 'player', token: P1.token }, body))).data; }
async function pump(stepMs, until, label, maxIter) {
  const cap = maxIter || 4000;
  for (let i = 0; i < cap; i++) {
    const v = await hState();
    if (until(v)) return v;
    tick(stepMs);
  }
  throw new Error('pump timeout: ' + label);
}
async function toGame(gameId) {
  await hAct({ action: 'continue' });
  await hAct({ action: 'toChoosing' });
  const v = await hAct({ action: 'startGame', game: gameId });
  assert(v.game && v.game.id === gameId && v.game.phase === 'countdown', gameId + ' starts with 3-2-1 countdown');
  return v;
}

const played = [];
function collect(v) { played.push(Object.assign({}, v.lastGame.points)); }

// --- Audit helpers -------------------------------------------------------
// rawCall sends an arbitrary (possibly malformed) body, unlike call() which
// always JSON-encodes. If worker.fetch throws instead of answering, the
// promise rejects and the whole run fails — exactly what the garbage
// battery is meant to catch.
async function rawCall(method, path, raw, ctype) {
  const req = new Request('https://test' + path, {
    method,
    headers: { 'content-type': ctype || 'application/json' },
    body: raw === undefined ? undefined : raw,
  });
  const res = await worker.fetch(req, env, ctx);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
  return { status: res.status, text, data };
}
// A room driver with its own code/host token, so audit sections never
// disturb the main match's globals (CODE/HOST/P1).
function driver(code, host) {
  return {
    code, host,
    state: async () => (await call('GET', '/api/rooms/' + code + '/state?role=host&token=' + host)).data,
    act: async (b) => (await call('POST', '/api/rooms/' + code + '/action', Object.assign({ role: 'host', token: host }, b))).data,
    join: async (name) => (await call('POST', '/api/rooms/' + code + '/join', { name })).data,
    pState: async (tok) => (await call('GET', '/api/rooms/' + code + '/state?role=player&token=' + tok)).data,
    pAct: async (tok, b) => (await call('POST', '/api/rooms/' + code + '/action', Object.assign({ role: 'player', token: tok }, b))).data,
  };
}
async function newDrv() {
  const c = (await call('POST', '/api/rooms', {})).data;
  return driver(c.code, c.hostToken);
}
async function pumpD(drv, stepMs, until, label, maxIter) {
  const cap = maxIter || 4000;
  for (let i = 0; i < cap; i++) {
    const v = await drv.state();
    if (until(v)) return v;
    tick(stepMs);
  }
  throw new Error('pump timeout: ' + label);
}
// Play dua-bam in a driver room all the way to the results phase.
async function raceToResults(drv, humanTok) {
  for (let r = 1; r <= 3; r++) {
    await pumpD(drv, 200, (s) => s.game && s.game.phase === 'race' && s.game.round === r, 'race r' + r);
    if (humanTok) for (let i = 0; i < 12; i++) await drv.pAct(humanTok, { action: 'tap' });
    await pumpD(drv, 400, (s) => s.phase === 'results' || (s.game && s.game.phase === 'pause' && s.game.round === r), 'race resolve r' + r);
  }
  return pumpD(drv, 400, (s) => s.phase === 'results', 'race results');
}
// Run fn with Math.random served from a fixed queue (then restored).
// Room creation draws its candidate codes from Math.random via randInt,
// so this can force exact codes — collisions and code recycling included.
function withRandomQueue(values, fn) {
  const orig = Math.random;
  let i = 0;
  Math.random = () => (i < values.length ? values[i++] : orig());
  return Promise.resolve().then(fn).finally(() => { Math.random = orig; });
}
const rFor = (code) => (code - 100000 + 0.5) / 900000;

async function playQuiz() {
  console.log('Game: Đố Vui Tốc Độ (streak bonus + final round ×2)');
  const v0 = await hAct({ action: 'startGame', game: 'do-vui' });
  assert(v0.game && v0.game.phase === 'countdown', 'quiz starts with 3-2-1 countdown');
  for (let q = 1; q <= 8; q++) {
    await pump(250, (s) => s.game && s.game.phase === 'question' && s.game.round === q, 'quiz question ' + q);
    const pv = await pState();
    assert(JSON.stringify(pv.game).indexOf('correct') === -1, 'correct answer never exposed to phone (q' + q + ')');
    const bankQ = QUIZ_BANK.find((b) => b.q === pv.game.question);
    assert(!!bankQ, 'question comes from the bank (q' + q + ')');
    const idx = pv.game.options.indexOf(bankQ.options[bankQ.answer]);
    assert(idx >= 0, 'correct option is among presented options (q' + q + ')');
    await pAct({ action: 'answer', choice: idx }); // same fake instant -> full speed bonus
    const v = await pump(500, (s) => s.game && s.game.phase === 'reveal' && s.game.round === q, 'quiz reveal ' + q);
    assert(v.game.reveal.correct === idx, 'reveal exposes the correct answer after answering (q' + q + ')');
    const streakBonus = q >= 2 ? 25 * (q - 1) : 0;
    const expected = (100 + 100 + streakBonus) * (q === 8 ? 2 : 1);
    assert(v.game.reveal.points[P1.seat] === expected, 'quiz q' + q + ' points == ' + expected + ' (base 100 + speed 100 + streak ' + streakBonus + (q === 8 ? ', ×2 final' : '') + '), got ' + v.game.reveal.points[P1.seat]);
    if (q === 2) assert(v.game.reveal.streaks[P1.seat] === 2, 'streak counter reaches 2 at q2');
    if (q === 1) assert(v.gap && typeof v.gap.diff === 'number' && 'topSeat' in v.gap, 'mid-game scoreboard gap is exposed');
  }
  const v = await pump(500, (s) => s.phase === 'results', 'quiz results');
  assert(v.lastGame.points[P1.seat] === 2675, 'quiz match total == 2675 (streak + ×2 provably covered), got ' + v.lastGame.points[P1.seat]);
  return v;
}

async function playGuess() {
  console.log('Game: Đoán Số Chuẩn (worst→best drama reveal, ×2 final)');
  await toGame('doan-so');
  for (let q = 1; q <= 5; q++) {
    await pump(250, (s) => s.game && s.game.phase === 'guess' && s.game.round === q, 'guess q' + q);
    const pv = await pState();
    const bankQ = EST_BANK.find((b) => b.q === pv.game.question);
    assert(!!bankQ, 'estimation question comes from the bank (q' + q + ')');
    await pAct({ action: 'guess', value: bankQ.answer }); // exact answer -> rank 1
    const v = await pump(500, (s) => s.game && s.game.phase === 'reveal' && s.game.round === q, 'guess reveal ' + q);
    const entries = v.game.reveal.entries;
    let seenNumber = false; let lastDiff = Infinity; let orderOk = true;
    for (const e of entries) {
      if (e.value === null) { if (seenNumber) orderOk = false; }
      else { seenNumber = true; if (e.diff > lastDiff) orderOk = false; lastDiff = e.diff; }
    }
    assert(orderOk, 'reveal order is worst -> best deviation (q' + q + ')');
    assert(entries.every((e) => typeof e.revealAt === 'number'), 'reveal entries carry stagger timestamps (q' + q + ')');
    const mine = entries.find((e) => e.seat === P1.seat);
    const expected = q === 5 ? 600 : 300;
    assert(mine.points === expected, 'guess q' + q + ' exact answer scores ' + expected + (q === 5 ? ' (300 ×2 final)' : '') + ', got ' + mine.points);
  }
  const v = await pump(500, (s) => s.phase === 'results', 'guess results');
  assert(v.lastGame.points[P1.seat] === 1800, 'guess match total == 1800, got ' + v.lastGame.points[P1.seat]);
  return v;
}

async function playMemory() {
  console.log('Game: Nhớ Màu (sequence replay, ×2 final)');
  await toGame('nho-mau');
  const expected = [220, 260, 300, 340, 760];
  for (let r = 1; r <= 5; r++) {
    const vShow = await pump(200, (s) => s.game && s.game.phase === 'show' && s.game.round === r, 'memory show r' + r);
    const seq = vShow.game.seq;
    assert(Array.isArray(seq) && seq.length === r + 2, 'host sees sequence of length ' + (r + 2) + ' (r' + r + ')');
    const pv = await pState();
    assert(pv.game.seq === undefined, 'sequence is hidden from phones (r' + r + ')');
    await pump(200, (s) => s.game && s.game.phase === 'input' && s.game.round === r, 'memory input r' + r);
    for (const c of seq) await pAct({ action: 'color', color: c });
    const v = await pump(300, (s) => s.phase === 'results' || (s.game && s.game.phase === 'pause' && s.game.round === r), 'memory resolve r' + r);
    if (r < 5) assert(v.game.lastRound.points[P1.seat] === expected[r - 1], 'memory r' + r + ' points == ' + expected[r - 1] + ', got ' + v.game.lastRound.points[P1.seat]);
  }
  const v = await pump(300, (s) => s.phase === 'results', 'memory results');
  assert(v.lastGame.points[P1.seat] === 1880, 'memory match total == 1880 (final round 380 ×2), got ' + v.lastGame.points[P1.seat]);
  return v;
}

async function playRace() {
  console.log('Game: Đua Bấm Nút (tap counting) + Chơi lại ngay');
  await toGame('dua-bam');
  for (let r = 1; r <= 3; r++) {
    await pump(200, (s) => s.game && s.game.phase === 'race' && s.game.round === r, 'race r' + r);
    for (let i = 0; i < 37; i++) await pAct({ action: 'tap' });
    const pv = await pState();
    assert(pv.game.mine === 37, 'race r' + r + ': server counted exactly 37 human taps');
    await pump(400, (s) => s.phase === 'results' || (s.game && s.game.phase === 'pause' && s.game.round === r), 'race resolve r' + r);
  }
  const v = await pump(400, (s) => s.phase === 'results', 'race results');
  assert(v.lastGame.points[P1.seat] > 0, 'race awards the human points');
  // "Chơi lại ngay": replay the same game straight from the results screen.
  const scoreBefore = v.players.find((p) => p.seat === P1.seat).score;
  const vr = await hAct({ action: 'replay' });
  assert(vr.phase === 'playing' && vr.game && vr.game.id === 'dua-bam' && vr.game.round === 1 && vr.game.phase === 'countdown', 'replay restarts the same game at round 1 with a countdown');
  assert(vr.players.find((p) => p.seat === P1.seat).score === scoreBefore, 'replay keeps cumulative scores untouched');
  for (let r = 1; r <= 3; r++) {
    await pump(300, (s) => s.phase === 'results' || (s.game && s.game.phase === 'pause' && s.game.round === r), 'replay race r' + r);
  }
  const v2 = await pump(400, (s) => s.phase === 'results', 'replay race results');
  return [v, v2];
}

async function playReact() {
  console.log('Game: Nhanh Tay (millisecond gaps)');
  await toGame('nhanh-tay');
  for (let r = 1; r <= 5; r++) {
    const vGo = await pump(150, (s) => s.phase === 'results' || (s.game && s.game.phase === 'go' && s.game.round === r), 'react go r' + r);
    if (vGo.phase === 'results') break;
    await pAct({ action: 'tap' });
    const v = await pump(200, (s) => s.phase === 'results' || (s.game && s.game.phase === 'roundEnd' && s.game.round === r), 'react end r' + r);
    if (v.game && v.game.lastRound) {
      const tapped = v.game.lastRound.entries.filter((e) => e.status === 'tapped');
      if (tapped.length) {
        assert(tapped[0].gapMs === 0, 'fastest player has 0ms gap (r' + r + ')');
        let asc = true;
        for (let i = 1; i < tapped.length; i++) if (tapped[i].gapMs < tapped[i - 1].gapMs) asc = false;
        assert(asc, 'ms gaps are ascending by reaction (r' + r + ')');
      }
    }
    if (v.phase !== 'results') await pump(200, (s) => s.phase === 'results' || (s.game && s.game.phase !== 'roundEnd'), 'react drain r' + r);
  }
  return pump(300, (s) => s.phase === 'results', 'react results');
}

async function playArena() {
  console.log('Game: Đẩy Ra Khỏi Sàn (gamepad held-state, tick arena)');
  await toGame('day-ra');
  let v = await pump(200, (s) => s.game && s.game.phase === 'arena', 'arena begins');
  const start = v.game.blobs[P1.seat];
  assert(start && start.alive && start.lives === 3, 'human blob spawns alive with 3 lives');
  await pAct({ action: 'pad', pad: { l: true } }); // hold D-pad left
  for (let i = 0; i < 6; i++) { tick(500); await hState(); }
  v = await hState();
  const moved = Math.abs(v.game.blobs[P1.seat].x - start.x) + Math.abs(v.game.blobs[P1.seat].y - start.y);
  assert(moved >= 1, 'held D-pad state moves the blob on server ticks (moved ' + moved + ')');
  await pAct({ action: 'pad', pad: {} }); // release
  v = await pump(1000, (s) => s.phase === 'results', 'arena results', 300);
  const pts = Object.values(v.lastGame.points).sort((a, b) => b - a);
  assert(JSON.stringify(pts) === JSON.stringify([300, 200, 100]), 'arena placements are exactly 300/200/100, got ' + pts.join('/'));
  return v;
}

async function playDodge() {
  console.log('Game: Né Đạn (tick arena survival, walled arena)');
  await toGame('ne-dan');
  let v = await pump(200, (s) => s.game && s.game.phase === 'dodge', 'dodge begins');
  const start = v.game.blobs[P1.seat];
  assert(start && start.alive && start.lives === 3, 'dodge: human blob spawns alive with 3 lives');
  assert(Array.isArray(v.game.balls), 'dodge: cannonball field is exposed in the host view');
  await pAct({ action: 'pad', pad: { l: true } }); // hold D-pad left
  for (let i = 0; i < 6; i++) { tick(500); await hState(); }
  v = await hState();
  const moved = Math.abs(v.game.blobs[P1.seat].x - start.x) + Math.abs(v.game.blobs[P1.seat].y - start.y);
  assert(moved >= 1, 'dodge: held D-pad state moves the blob on server ticks (moved ' + moved + ')');
  await pAct({ action: 'pad', pad: {} }); // release
  v = await pump(1000, (s) => s.phase === 'results', 'dodge results', 300);
  const pts = Object.values(v.lastGame.points).sort((a, b) => b - a);
  assert(JSON.stringify(pts) === JSON.stringify([300, 200, 100]), 'dodge placements are exactly 300/200/100, got ' + pts.join('/'));
  return v;
}

async function playTug() {
  console.log('Game: Kéo Co (team tug of war, knot = 3 x net presses)');
  await toGame('keo-co');
  let v = await pump(250, (s) => s.game && s.game.phase === 'pull', 'tug pull begins');
  assert(v.game.teams && v.game.teams.A.join(',') === '1,3' && v.game.teams.B.join(',') === '2',
    'tug: teams split by seat parity (odd = A: P1+P3, even = B: P2)');
  // Fake time is frozen between actions, so no bot tick can sneak in: both
  // bots are Vừa and would cancel out anyway. 27 human B presses (rising
  // edge) must move the knot to exactly 3 * -27 = -81.
  for (let i = 0; i < 27; i++) {
    await pAct({ action: 'pad', pad: { b: true } });
    await pAct({ action: 'pad', pad: {} });
  }
  v = await hState();
  assert(v.game && v.game.presses[P1.seat] === 27, 'tug: server counted exactly 27 rising-edge B presses, got ' + (v.game ? v.game.presses[P1.seat] : '?'));
  assert(v.game && v.game.knot === -81, 'tug: knot == -81 after 27 net presses for team A, got ' + (v.game ? v.game.knot : '?'));
  await pAct({ action: 'pad', pad: { b: true } }); // 28th press: knot hits -84
  await pAct({ action: 'pad', pad: {} });
  v = await hState();
  assert(v.phase === 'results' && v.lastGame && v.lastGame.id === 'keo-co', 'tug: |knot| reaching 84 ends the match at once');
  assert(v.lastGame.points[1] === 300 && v.lastGame.points[3] === 300 && v.lastGame.points[2] === 200,
    'tug: winning team scores 300 each, losing team 200, got ' + JSON.stringify(v.lastGame.points));
  return v;
}

async function playChia() {
  console.log('Game: Chia Hay Cướp (negotiation, secret choices, rotating pairs)');
  const v0 = await toGame('chia-cuop');
  assert(v0.game.totalRounds === 3, 'chia: rounds == number of players (3), got ' + v0.game.totalRounds);
  // Round 1 — pair P1+P2. Bot Vừa splits on odd rounds, so Chia/Chia = 200 each.
  let v = await pump(250, (s) => s.game && s.game.phase === 'talk' && s.game.round === 1, 'chia talk r1');
  assert(v.game.pair.join(',') === '1,2', 'chia r1: pair is P1+P2');
  await pAct({ action: 'chat', text: 'Chia đôi cho lành nhé!' });
  v = await hState();
  assert(JSON.stringify(v.game.chat).indexOf('Chia đôi cho lành nhé!') >= 0, 'chia: negotiation bubble shows on the host during talk');
  tick(60000);
  v = await pump(250, (s) => s.game && s.game.phase === 'choose' && s.game.round === 1, 'chia choose r1');
  assert(v.game.choices === undefined, 'chia: host state exposes no choices during the choose phase');
  let pv = await pState();
  assert(pv.game.choices === undefined && pv.game.mineChosen === false, 'chia: phone state hides choices too (mineChosen=false before picking)');
  await pAct({ action: 'choose', choice: 'chia' });
  pv = await pState();
  assert(pv.game.mineChosen === true && pv.game.choices === undefined, 'chia: after picking, the phone shows only mineChosen=true, never the value');
  v = await pump(250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 1, 'chia reveal r1');
  const m1 = Object.fromEntries(v.game.reveal.entries.map((e) => [e.seat, e]));
  assert(m1[1].choice === 'chia' && m1[1].points === 200 && m1[2].choice === 'chia' && m1[2].points === 200,
    'chia r1: both Chia -> 200 each, got ' + JSON.stringify(v.game.reveal.entries));
  // Round 2 — pair P2+P3, the human sits out. Both Vừa bots steal on even
  // rounds -> both Cướp = 0 each. The sit-out human cannot choose.
  v = await pump(250, (s) => s.game && s.game.phase === 'talk' && s.game.round === 2, 'chia talk r2');
  assert(v.game.pair.join(',') === '2,3', 'chia r2: pair rotates to P2+P3, human sits out');
  const bad = await pAct({ action: 'choose', choice: 'cuop' });
  assert(bad.ok === false, 'chia: a sit-out player cannot choose');
  tick(60000);
  v = await pump(250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 2, 'chia reveal r2');
  const m2 = Object.fromEntries(v.game.reveal.entries.map((e) => [e.seat, e]));
  assert(m2[2].choice === 'cuop' && m2[3].choice === 'cuop' && m2[2].points === 0 && m2[3].points === 0,
    'chia r2: both bots Cướp -> 0 each, got ' + JSON.stringify(v.game.reveal.entries));
  // Round 3 — final round, pot doubled to 800. Pair P3+P1: bot splits (odd
  // round), the human steals and takes the whole 800.
  v = await pump(250, (s) => s.game && s.game.phase === 'talk' && s.game.round === 3, 'chia talk r3');
  assert(v.game.pair.join(',') === '3,1', 'chia r3: pair rotates to P3+P1');
  tick(60000);
  v = await pump(250, (s) => s.game && s.game.phase === 'choose' && s.game.round === 3, 'chia choose r3');
  assert(v.game.pot === 800, 'chia r3: final-round pot is doubled to 800, got ' + v.game.pot);
  await pAct({ action: 'choose', choice: 'cuop' });
  v = await pump(250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 3, 'chia reveal r3');
  const m3 = Object.fromEntries(v.game.reveal.entries.map((e) => [e.seat, e]));
  assert(m3[1].choice === 'cuop' && m3[1].points === 800 && m3[3].choice === 'chia' && m3[3].points === 0,
    'chia r3: lone Cướp takes the doubled pot (800), got ' + JSON.stringify(v.game.reveal.entries));
  v = await pump(250, (s) => s.phase === 'results', 'chia results');
  assert(v.lastGame.points[1] === 1000 && v.lastGame.points[2] === 200 && v.lastGame.points[3] === 0,
    'chia match totals == P1 1000 / P2 200 / P3 0, got ' + JSON.stringify(v.lastGame.points));
  return v;
}

async function main() {
  console.log('== Nảy Party — local worker test ==');
  const home = await call('GET', '/');
  assert(home.status === 200 && home.text.indexOf('Nảy Party') >= 0, 'GET / serves the game page');
  assert(home.text.indexOf('Nhanh Tay') >= 0 && home.text.indexOf('Đẩy Ra Khỏi Sàn') >= 0, 'page lists all games incl. the arena');
  assert(home.text.indexOf('Né Đạn') >= 0 && home.text.indexOf('Kéo Co') >= 0 && home.text.indexOf('Chia Hay Cướp') >= 0, 'page lists the 3 new games (Né Đạn, Kéo Co, Chia Hay Cướp)');
  // A freshly created room can briefly be invisible somewhere, so the join
  // handler must auto-retry ONLY the room-not-found error (2s interval,
  // bounded attempts, subtle status).
  assert(home.text.indexOf('JOIN_RETRY_MS = 2000') >= 0 && home.text.indexOf('JOIN_RETRY_MAX = 10') >= 0
    && home.text.indexOf('function tryJoin(') >= 0 && home.text.indexOf('Đang tìm phòng…') >= 0
    && home.text.indexOf("indexOf('Không thấy phòng này')") >= 0,
    'join flow auto-retries room-not-found briefly (2s x 10, "Đang tìm phòng…")');
  // NEON ARENA overhaul: action games must ship the fighter-orb renderer,
  // the K.O. banner markup, the FX engine and its hooks in the served page.
  assert(home.text.indexOf('function orbSVG(') >= 0 && home.text.indexOf('ko-banner') >= 0
    && home.text.indexOf('id="kobanner"') >= 0 && home.text.indexOf('ko-big') >= 0,
    'NEON ARENA: fighter orbs + K.O. banner ship in the page');
  assert(home.text.indexOf('function arenaFX(') >= 0 && home.text.indexOf('fx-spark') >= 0
    && home.text.indexOf('fx-ghost') >= 0 && home.text.indexOf('fx-trail') >= 0
    && home.text.indexOf('awarn') >= 0 && home.text.indexOf('hitflash') >= 0,
    'NEON ARENA: arenaFX engine + spark/ghost/trail/warn/hitflash hooks ship in the page');
  assert(home.text.indexOf('function sfxThud(') >= 0 && home.text.indexOf('function sfxBoom(') >= 0
    && home.text.indexOf('function sfxWhoosh(') >= 0 && home.text.indexOf('function sfxDash(') >= 0
    && home.text.indexOf('neon-stage') >= 0 && home.text.indexOf('.aring.danger') >= 0,
    'NEON ARENA: impact/dash/boom/whoosh sfx + neon stage + danger ring ship in the page');

  const created = (await call('POST', '/api/rooms', {})).data;
  assert(created.ok && /^[0-9]{6}$/.test(created.code), 'room created with a 6-digit code');
  CODE = created.code; HOST = created.hostToken;

  let v = await hAct({ action: 'startGame', game: 'do-vui' });
  assert(v.ok === false, 'start is blocked with no players at all');

  await hAct({ action: 'addBot', seat: 2 });
  v = await hState();
  const bot2 = v.players.find((p) => p.seat === 2);
  assert(bot2 && bot2.type === 'bot' && bot2.difficulty === 'vua', 'bot added at P2, default difficulty Vừa');
  await hAct({ action: 'cycleBot', seat: 2 });
  v = await hState();
  assert(v.players.find((p) => p.seat === 2).difficulty === 'kho', 'difficulty cycles Vừa -> Khó');
  await hAct({ action: 'cycleBot', seat: 2 });
  v = await hState();
  assert(v.players.find((p) => p.seat === 2).difficulty === 'de', 'difficulty cycles Khó -> Dễ');
  await hAct({ action: 'cycleBot', seat: 2 }); // back to Vừa
  await hAct({ action: 'addBot', seat: 3 });
  v = await hAct({ action: 'startGame', game: 'do-vui' });
  assert(v.ok === false, 'start is blocked with bots only (needs >= 1 human)');
  await hAct({ action: 'removeBot', seat: 3 });
  v = await hState();
  assert(!v.players.find((p) => p.seat === 3), 'bot can be removed');
  await hAct({ action: 'addBot', seat: 3 });

  const joined = (await call('POST', '/api/rooms/' + CODE + '/join', { name: 'An' })).data;
  assert(joined.ok && joined.seat === 1, 'human joins by code into P1');
  P1 = { seat: joined.seat, token: joined.playerToken };
  v = await hState();
  assert(v.players.length === 3, 'room has 3 filled seats (1 human + 2 bots)');
  assert(v.players.every((p) => typeof p.mood === 'string' && p.mood.length > 0), 'every player blob carries a mood/expression');

  collect(await playQuiz());
  collect(await playGuess());
  collect(await playMemory());
  const raceResults = await playRace();
  raceResults.forEach(collect);
  collect(await playReact());
  collect(await playArena());
  collect(await playDodge());
  collect(await playTug());
  collect(await playChia());

  await hAct({ action: 'continue' });
  v = await hState();
  assert(v.phase === 'podium', 'podium after the final game');
  for (const p of v.players) {
    const expected = played.reduce((sum, pts) => sum + (pts[p.seat] || 0), 0);
    assert(p.score === expected, 'cumulative total for P' + p.seat + ' == sum of all game points (' + expected + '), got ' + p.score);
  }
  const sorted = v.players.slice().sort((a, b) => (b.score - a.score) || (a.seat - b.seat)).map((p) => p.seat);
  assert(JSON.stringify(sorted) === JSON.stringify(v.standings), 'podium standings order matches verified totals');
  console.log('VERIFIED MATCH TOTALS: ' + v.players.map((p) => p.name + ' (P' + p.seat + ') = ' + p.score).join(' · '));

  await hAct({ action: 'finish' });
  v = await hState();
  assert(v.phase === 'final' && v.standings[0] === P1.seat, 'final screen crowns the human with the highest verified total');
  await hAct({ action: 'playAgain' });
  v = await hState();
  assert(v.phase === 'lobby' && v.players.every((p) => p.score === 0), 'play-again resets scores and returns to the lobby');

  // =====================================================================
  // Robustness audit additions (dead ends, garbage inputs, late joins)
  // =====================================================================
  console.log('Audit A: served page — dead-end fixes + controls');
  assert(home.text.indexOf('KV') === -1, 'served page carries no leftover KV references');
  assert(home.text.indexOf('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.') >= 0
    && home.text.indexOf('Không thấy phòng này') >= 0,
    'client leaves a dead room (not-found) instead of spinning on the connecting screen');
  assert(home.text.indexOf('Mất kết nối với phòng') >= 0 && home.text.indexOf('failSince') >= 0
    && home.text.indexOf('net: true') >= 0,
    'client exits gracefully after sustained network silence (spaced failure streak)');
  assert(home.text.indexOf('Đang nối phòng…') >= 0 && home.text.indexOf('Về trang chính') >= 0
    && home.text.indexOf('data-cmd="reload"') >= 0,
    'connecting screen has a manual "Về trang chính" escape (reload command)');
  assert(home.text.indexOf('data-cmd="sound"') >= 0 && home.text.indexOf('data-cmd="fs"') >= 0
    && home.text.indexOf('Đổi phòng') >= 0,
    'topbar mute / fullscreen / change-room controls ship in the page');

  console.log('Audit B: garbage inputs never produce an unhandled 500');
  const gRoom = (await call('POST', '/api/rooms', {})).data;
  const gCode = gRoom.code;
  const junk = [
    ['join malformed JSON', 'POST', '/api/rooms/' + gCode + '/join', 'not json{{{'],
    ['join JSON null body', 'POST', '/api/rooms/' + gCode + '/join', 'null'],
    ['join JSON array body', 'POST', '/api/rooms/' + gCode + '/join', '[1,2,3]'],
    ['join JSON string body', 'POST', '/api/rooms/' + gCode + '/join', '"hello"'],
    ['join numeric name', 'POST', '/api/rooms/' + gCode + '/join', '{"name":12345}'],
    ['join object name', 'POST', '/api/rooms/' + gCode + '/join', '{"name":{"x":1}}'],
    ['join empty body', 'POST', '/api/rooms/' + gCode + '/join', ''],
    ['join via GET (wrong method)', 'GET', '/api/rooms/' + gCode + '/join', undefined],
    ['action malformed JSON', 'POST', '/api/rooms/' + gCode + '/action', '###'],
    ['action JSON null body', 'POST', '/api/rooms/' + gCode + '/action', 'null'],
    ['state with no query params', 'GET', '/api/rooms/' + gCode + '/state', undefined],
    ['state with bogus role', 'GET', '/api/rooms/' + gCode + '/state?role=xyz&token=abc', undefined],
    ['join on unknown room', 'POST', '/api/rooms/000000/join', '{"name":"X"}'],
    ['unknown api path', 'GET', '/api/whatever', undefined],
    ['GET on the create path', 'GET', '/api/rooms', undefined],
    ['state via POST (wrong method)', 'POST', '/api/rooms/' + gCode + '/state', '{}'],
  ];
  for (const [label, m, p, raw] of junk) {
    const rj = await rawCall(m, p, raw);
    assert(rj.data && rj.data.ok === false && rj.status >= 400 && rj.status < 500,
      'garbage: ' + label + ' -> clean JSON 4xx (got status ' + rj.status + ')');
  }
  const huge = await call('POST', '/api/rooms/' + gCode + '/join', { name: 'X'.repeat(5000) });
  assert(huge.data.ok === true, 'garbage: a 5000-char name is accepted but truncated, not an error');
  const gDrv = driver(gCode, gRoom.hostToken);
  const gState = await gDrv.state();
  const hugeP = gState.players.find((p) => p.seat === huge.data.seat);
  assert(hugeP && hugeP.name.length === 14, 'garbage: stored name is truncated to 14 chars (got ' + (hugeP ? hugeP.name.length : '?') + ')');
  const bogusAct = await call('POST', '/api/rooms/' + gCode + '/action', { role: 'host', token: 'bogus', action: 'addBot', seat: 2 });
  assert(bogusAct.status === 403 && bogusAct.data.ok === false, 'garbage: action with a bogus host token -> 403');
  const hostAsPlayer = await call('GET', '/api/rooms/' + gCode + '/state?role=player&token=' + gRoom.hostToken);
  assert(hostAsPlayer.status === 403 && hostAsPlayer.data.ok === false, 'garbage: host token cannot pose as a player token');
  const unk = await gDrv.act({ action: 'fly-to-the-moon' });
  assert(unk.ok === false && unk.error === 'Hành động không hợp lệ.', 'garbage: unknown host action -> clean error');
  const badSeat = await gDrv.act({ action: 'addBot', seat: 'x' });
  const badSeat2 = await gDrv.act({ action: 'addBot', seat: 99 });
  const badSeat3 = await gDrv.act({ action: 'addBot', seat: 2.5 });
  assert(badSeat.ok === false && badSeat2.ok === false && badSeat3.ok === false, 'garbage: addBot with string/huge/fractional seat -> clean errors');
  const weird = await worker.fetch({ url: '::::', method: 'GET' }, env, ctx);
  assert(weird.status === 200 && (await weird.text()).indexOf('Nảy Party') >= 0, 'garbage: unparseable request URL -> game page, no exception');

  console.log('Audit C: wrong-phase actions + stale inputs + start gate');
  const cDrv = await newDrv();
  const solo = await cDrv.join('MotMinh');
  assert(solo.ok && solo.seat === 1, 'solo human joins');
  let cr = await cDrv.act({ action: 'startGame', game: 'do-vui' });
  assert(cr.ok === false && cr.error.indexOf('ít nhất 2 người chơi') >= 0, 'start gate: 1 human + 0 bots cannot start (needs 2 seats)');
  cr = await cDrv.act({ action: 'continue' });
  assert(cr.ok === false, 'wrong phase: continue in the lobby is rejected');
  cr = await cDrv.act({ action: 'replay' });
  assert(cr.ok === false, 'wrong phase: replay in the lobby is rejected');
  cr = await cDrv.act({ action: 'finish' });
  assert(cr.ok === false, 'wrong phase: finish in the lobby is rejected');
  cr = await cDrv.act({ action: 'playAgain' });
  assert(cr.ok === false, 'wrong phase: playAgain in the lobby is rejected');
  cr = await cDrv.act({ action: 'toChoosing' });
  assert(cr.ok === false, 'wrong phase: toChoosing in the lobby is rejected');
  const staleLobby = await cDrv.pAct(solo.playerToken, { action: 'tap' });
  assert(staleLobby.ok === false, 'stale input: player tap in the lobby is a clean error, not a crash');
  await cDrv.act({ action: 'addBot', seat: 2 });
  cr = await cDrv.act({ action: 'startGame', game: 'do-vui' });
  assert(cr.ok === true && cr.phase === 'playing', 'start succeeds once a second seat is filled');
  cr = await cDrv.act({ action: 'startGame', game: 'do-vui' });
  assert(cr.ok === false, 'wrong phase: startGame while playing is rejected');
  cr = await cDrv.act({ action: 'addBot', seat: 3 });
  assert(cr.ok === false, 'wrong phase: addBot while playing is rejected');
  cr = await cDrv.act({ action: 'removeBot', seat: 2 });
  assert(cr.ok === false, 'wrong phase: removeBot while playing is rejected');
  cr = await cDrv.act({ action: 'cycleBot', seat: 2 });
  assert(cr.ok === false, 'wrong phase: cycleBot while playing is rejected');
  const cState = await cDrv.state();
  const cBot = cState.players.find((p) => p.seat === 2);
  assert(cBot && cBot.type === 'bot' && cBot.difficulty === 'vua', 'bot is untouched after rejected mid-game seat changes');

  console.log('Audit D: spectator joins at results/podium, plays the next game');
  const sDrv = await newDrv();
  const chu = await sDrv.join('Chu');
  await sDrv.act({ action: 'addBot', seat: 2 });
  let sr = await sDrv.act({ action: 'startGame', game: 'dua-bam' });
  assert(sr.ok === true && sr.phase === 'playing', 'spectator scenario: race starts');
  const midJoin = await sDrv.join('Tre');
  assert(midJoin.ok === false && midJoin.error.indexOf('Phòng đang chơi') >= 0, 'joining mid-game is still rejected');
  const resV = await raceToResults(sDrv, chu.playerToken);
  const banked = JSON.parse(JSON.stringify(resV.lastGame.points));
  const bankedScores = resV.players.map((p) => [p.seat, p.score]);
  const xem = await sDrv.join('Xem');
  assert(xem.ok === true && xem.seat === 3, 'spectator can join at results (seat 3)');
  let sv = await sDrv.state();
  assert(sv.players.length === 3 && sv.players.find((p) => p.seat === 3).score === 0, 'spectator appears with a 0 cumulative score');
  assert(JSON.stringify(sv.lastGame.points) === JSON.stringify(banked), 'finished game results are unchanged by the spectator join');
  assert(bankedScores.every((bs) => sv.players.find((p) => p.seat === bs[0]).score === bs[1]), 'banked scores of the original players are unchanged');
  const xemView = await sDrv.pState(xem.playerToken);
  assert(xemView.ok === true && xemView.phase === 'results', 'spectator state view works at results');
  const staleTap = await sDrv.pAct(chu.playerToken, { action: 'tap' });
  const staleAns = await sDrv.pAct(chu.playerToken, { action: 'answer', choice: 1 });
  assert(staleTap.ok === false && staleAns.ok === false, 'stale inputs after the game ended are clean errors');
  const rmRes = await sDrv.act({ action: 'removeBot', seat: 2 });
  assert(rmRes.ok === false, 'wrong phase: removeBot at results is rejected');
  await sDrv.act({ action: 'continue' });
  sv = await sDrv.state();
  assert(sv.phase === 'podium', 'host advances to podium');
  const muon = await sDrv.join('Muon');
  assert(muon.ok === true && muon.seat === 4, 'a second spectator can join at podium (seat 4)');
  await sDrv.act({ action: 'toChoosing' });
  sr = await sDrv.act({ action: 'startGame', game: 'do-vui' });
  assert(sr.ok === true && sr.game && sr.game.id === 'do-vui', 'next game starts with the spectators as full players');
  for (let q = 1; q <= 8; q++) {
    await pumpD(sDrv, 250, (s) => s.game && s.game.phase === 'question' && s.game.round === q, 'spec quiz q' + q);
    const xv = await sDrv.pState(xem.playerToken);
    const bankQ = QUIZ_BANK.find((b) => b.q === xv.game.question);
    const idx = xv.game.options.indexOf(bankQ.options[bankQ.answer]);
    await sDrv.pAct(xem.playerToken, { action: 'answer', choice: idx });
    if (q === 2) {
      const mv = await sDrv.pState(muon.playerToken);
      const idxM = mv.game.options.indexOf(bankQ.options[bankQ.answer]);
      await sDrv.pAct(muon.playerToken, { action: 'answer', choice: idxM });
    }
    await pumpD(sDrv, 500, (s) => s.game && s.game.phase === 'reveal' && s.game.round === q, 'spec quiz reveal ' + q);
  }
  sv = await pumpD(sDrv, 500, (s) => s.phase === 'results', 'spec quiz results');
  assert(sv.lastGame.points[xem.seat] > 0, 'results-joiner scores in the next game (' + sv.lastGame.points[xem.seat] + ')');
  assert(sv.lastGame.points[muon.seat] > 0, 'podium-joiner scores in the next game (' + sv.lastGame.points[muon.seat] + ')');
  const xemTotal = sv.players.find((p) => p.seat === xem.seat).score;
  assert(xemTotal === sv.lastGame.points[xem.seat], 'results-joiner cumulative == their next-game points (started from 0)');
  const chuTotal = sv.players.find((p) => p.seat === chu.seat).score;
  assert(chuTotal === banked[chu.seat] + (sv.lastGame.points[chu.seat] || 0), 'original player cumulative == game1 banked + game2 points');

  console.log('Audit E: joining at the final screen');
  const fDrv = await newDrv();
  const dau = await fDrv.join('Dau');
  await fDrv.act({ action: 'addBot', seat: 2 });
  await fDrv.act({ action: 'startGame', game: 'dua-bam' });
  await raceToResults(fDrv, dau.playerToken);
  await fDrv.act({ action: 'continue' });
  await fDrv.act({ action: 'finish' });
  let fv = await fDrv.state();
  assert(fv.phase === 'final', 'final screen reached');
  const cuoi = await fDrv.join('Cuoi');
  assert(cuoi.ok === true && cuoi.seat === 3, 'spectator can join at the final screen');
  const cuoiView = await fDrv.pState(cuoi.playerToken);
  assert(cuoiView.ok === true && cuoiView.phase === 'final', 'final-joiner state view works');
  await fDrv.act({ action: 'playAgain' });
  fv = await fDrv.state();
  assert(fv.phase === 'lobby' && fv.players.length === 3 && fv.players.every((p) => p.score === 0), 'play-again includes the final-joiner, all scores reset');
  const again = await fDrv.act({ action: 'startGame', game: 'nhanh-tay' });
  assert(again.ok === true && again.game && again.game.id === 'nhanh-tay', 'final-joiner counts as a full player for the next start gate');

  console.log('Audit F: duplicate-name joins keep distinct seats/tokens');
  const dDrv = await newDrv();
  const t1 = await dDrv.join('Trung');
  const t2 = await dDrv.join('Trung');
  assert(t1.ok && t2.ok && t1.seat !== t2.seat && t1.playerToken !== t2.playerToken, 'same name twice -> two distinct seats and tokens (no re-seat, no crash)');
  const dv = await dDrv.state();
  assert(dv.players.filter((p) => p.name === 'Trung').length === 2, 'both same-name players are in the room');
  const t1v = await dDrv.pState(t1.playerToken);
  const t2v = await dDrv.pState(t2.playerToken);
  assert(t1v.ok && t1v.you.seat === t1.seat && t2v.ok && t2v.you.seat === t2.seat, 'each same-name session resolves to its own seat');

  console.log('Audit G: room-code collision + recycled code after expiry');
  const first = await withRandomQueue([rFor(555555)], () => call('POST', '/api/rooms', {}));
  assert(first.data.ok && first.data.code === '555555', 'forced-code room created (555555)');
  const second = await withRandomQueue([rFor(555555), rFor(555556)], () => call('POST', '/api/rooms', {}));
  assert(second.data.ok && second.data.code === '555556', 'create loop skips a colliding code and takes the next candidate');
  const oldDrv = driver('555555', first.data.hostToken);
  const oldJoin = await oldDrv.join('Cu');
  assert(oldJoin.ok === true, 'player joins the original 555555 room');
  tick((6 * 3600 + 60) * 1000); // beyond the 6h TTL
  const gone = await call('GET', '/api/rooms/555555/state?role=host&token=' + first.data.hostToken);
  assert(gone.status === 404, 'original room is gone after the TTL');
  const reborn = await withRandomQueue([rFor(555555)], () => call('POST', '/api/rooms', {}));
  assert(reborn.data.ok && reborn.data.code === '555555', 'the expired code can be recycled for a fresh room');
  const rb = driver('555555', reborn.data.hostToken);
  const rbState = await rb.state();
  assert(rbState.players.length === 0, 'recycled room starts empty — old players are not resurrected');
  const zombie = await call('GET', '/api/rooms/555555/state?role=player&token=' + oldJoin.playerToken);
  assert(zombie.status === 403 && zombie.data.ok === false, 'old player token is rejected by the recycled room');
  const zombieHost = await call('GET', '/api/rooms/555555/state?role=host&token=' + first.data.hostToken);
  assert(zombieHost.status === 403 && zombieHost.data.ok === false, 'old host token is rejected by the recycled room');
  const fresh = await rb.join('Moi');
  assert(fresh.ok === true && fresh.seat === 1, 'a fresh player can join the recycled room at P1');
  await rb.act({ action: 'addBot', seat: 2 });
  const rbStart = await rb.act({ action: 'startGame', game: 'nhanh-tay' });
  assert(rbStart.ok === true && rbStart.phase === 'playing', 'recycled room can start a game normally');

  // --- Storage routing: with ROOMS_DO bound, everything above must have
  // gone through the Durable Objects and the KV fallback must be untouched.
  console.log('Storage: Durable Object routing + expiry');
  assert(env.ROOMS.putCount === 0 && env.ROOMS.getCount === 0,
    'KV fallback saw zero reads/writes while ROOMS_DO is bound (spy counters)');
  assert(doFake.putCount > 0, 'room saves were written to the Durable Objects (' + doFake.putCount + ' PUTs)');
  const mainRec = doFake.records.get(CODE);
  const mainEntry = mainRec && await mainRec.state.storage.get('room');
  assert(!!mainEntry && JSON.parse(mainEntry.json).code === CODE,
    'the played room is stored inside its own Durable Object');
  const created2 = (await call('POST', '/api/rooms', {})).data;
  assert(created2.ok && created2.code !== CODE, 'second room created for the DO expiry check');
  const st2 = await call('GET', '/api/rooms/' + created2.code + '/state?role=host&token=' + created2.hostToken);
  assert(st2.status === 200 && st2.data && st2.data.phase === 'lobby', 'unexpired room loads through the DO path');
  const rec2 = doFake.records.get(created2.code);
  assert(rec2 && !!(await rec2.state.storage.get('room')), 'second room is stored in its Durable Object');
  tick((6 * 3600 + 60) * 1000); // beyond ROOM_TTL_SECONDS (6h)
  const st3 = await call('GET', '/api/rooms/' + created2.code + '/state?role=host&token=' + created2.hostToken);
  assert(st3.status === 404 && st3.data && st3.data.error.indexOf('Không thấy phòng này') >= 0,
    'expired room loads as missing through the DO path');
  assert(!(await rec2.state.storage.get('room')), 'expired DO entry is deleted on read');

  console.log('\nALL TESTS PASSED — ' + passed + ' assertions');
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
