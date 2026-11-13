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
import worker, { QUIZ_BANK, EST_BANK, IMPOSTOR_BANK, RoomStore } from '../worker.mjs';

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

async function playSteal() {
  console.log('Game: Cướp Sao (bank stars, golden = 3, placements)');
  await toGame('cuop-sao');
  let v = await pump(250, (s) => s.game && s.game.phase === 'steal', 'steal begins');
  assert(Array.isArray(v.game.stars) && v.game.stars.length >= 2, 'steal: at least 2 stars are kept on the field');
  assert(v.game.banked && v.game.banked[P1.seat] === 0, 'steal: bank starts at 0');
  v = await pump(1000, (s) => s.phase === 'results', 'steal results', 300);
  const pts = Object.values(v.lastGame.points).sort((a, b) => b - a);
  assert(JSON.stringify(pts) === JSON.stringify([300, 200, 100]), 'steal placements are exactly 300/200/100, got ' + pts.join('/'));
  return v;
}

async function playCrown() {
  console.log('Game: Giữ Vương Miện (hold points, placements)');
  await toGame('giu-vuong-mien');
  let v = await pump(250, (s) => s.game && s.game.phase === 'crown', 'crown begins');
  assert(v.game.crown && v.game.crown.holder === null && v.game.crown.x === 0 && v.game.crown.y === 0, 'crown: the crown rests at the centre at the start');
  assert(v.game.hold && v.game.hold[P1.seat] === 0, 'crown: hold points start at 0');
  v = await pump(1000, (s) => s.phase === 'results', 'crown results', 300);
  const pts = Object.values(v.lastGame.points).sort((a, b) => b - a);
  assert(JSON.stringify(pts) === JSON.stringify([300, 200, 100]), 'crown placements are exactly 300/200/100, got ' + pts.join('/'));
  return v;
}

async function playSplat() {
  console.log('Game: Sơn Sàn (paint grid, placements)');
  await toGame('son-san');
  let v = await pump(250, (s) => s.game && s.game.phase === 'splat', 'splat begins');
  assert(Array.isArray(v.game.grid) && v.game.grid.length === 144, 'splat: the 12x12 floor grid is exposed');
  for (let i = 0; i < 8; i++) { tick(1000); await hState(); }
  v = await hState();
  const total = Object.values(v.game.counts || {}).reduce((a, b) => a + b, 0);
  assert(total > 0 && total <= 144, 'splat: painted cells are counted live and bounded by the grid (' + total + ')');
  v = await pump(1000, (s) => s.phase === 'results', 'splat results', 300);
  const pts = Object.values(v.lastGame.points).sort((a, b) => b - a);
  assert(JSON.stringify(pts) === JSON.stringify([300, 200, 100]), 'splat placements are exactly 300/200/100, got ' + pts.join('/'));
  return v;
}

async function playDuel() {
  console.log('Game: Cao Bồi (draw duel, receipt order, final x2)');
  await toGame('cao-boi');
  for (let r = 1; r <= 5; r++) {
    const vGo = await pump(150, (s) => s.phase === 'results' || (s.game && s.game.phase === 'go' && s.game.round === r), 'duel go r' + r);
    if (vGo.phase === 'results') break;
    await pAct({ action: 'tap' });
    const v = await pump(200, (s) => s.phase === 'results' || (s.game && s.game.phase === 'roundEnd' && s.game.round === r), 'duel end r' + r);
    if (v.game && v.game.lastRound) {
      const mine = v.game.lastRound.entries.find((e) => e.seat === P1.seat);
      assert(mine && mine.status === 'fired', 'duel r' + r + ': the human draw registers as fired');
      const allowed = r === 5 ? [400, 200, 100, 0] : [200, 100, 50, 0];
      assert(v.game.lastRound.entries.every((e) => e.status !== 'fired' || allowed.indexOf(e.points) >= 0),
        'duel r' + r + ': draw points follow 200/100/50/0' + (r === 5 ? ' with the final round x2' : ''));
    }
    if (v.phase !== 'results') await pump(200, (s) => s.phase === 'results' || (s.game && s.game.phase !== 'roundEnd'), 'duel drain r' + r);
  }
  return pump(300, (s) => s.phase === 'results', 'duel results');
}

async function main() {
  console.log('== Nảy Party — local worker test ==');
  const home = await call('GET', '/');
  assert(home.status === 200 && home.text.indexOf('Nảy Party') >= 0, 'GET / serves the game page');
  assert(home.text.indexOf('Nhanh Tay') >= 0 && home.text.indexOf('Đẩy Ra Khỏi Sàn') >= 0, 'page lists all games incl. the arena');
  assert(home.text.indexOf('Né Đạn') >= 0 && home.text.indexOf('Kéo Co') >= 0 && home.text.indexOf('Chia Hay Cướp') >= 0, 'page lists the 3 new games (Né Đạn, Kéo Co, Chia Hay Cướp)');
  assert(home.text.indexOf('Cướp Sao') >= 0 && home.text.indexOf('Giữ Vương Miện') >= 0 && home.text.indexOf('Sơn Sàn') >= 0 && home.text.indexOf('Cao Bồi') >= 0, 'page lists the 4 newest games (Cướp Sao, Giữ Vương Miện, Sơn Sàn, Cao Bồi)');
  assert(home.text.indexOf('Đấu với nhau') >= 0 && home.text.indexOf('Hợp tác') >= 0 && home.text.indexOf('Sắp ra mắt') < 0, 'game chooser is grouped by category: Đấu với nhau + Hợp tác, placeholder tile GONE (co-op wave shipped)');
  assert(home.text.indexOf('Chung Một Thân') >= 0 && home.text.indexOf('Đẩy Hộp Về Đích') >= 0 && home.text.indexOf('Chèo Thuyền') >= 0, 'page lists the 3 co-op games (Chung Một Thân, Đẩy Hộp Về Đích, Chèo Thuyền)');
  assert(home.text.indexOf('21 game') >= 0, 'homepage footer counts all 21 games');
  assert(home.text.indexOf('astar') >= 0 && home.text.indexOf('acrown') >= 0 && home.text.indexOf('splatgrid') >= 0 && home.text.indexOf('duel-bang') >= 0, 'new-game renderers ship in the page (star / crown / splat grid / duel banner)');
  assert(home.text.indexOf('sharedblob') >= 0 && home.text.indexOf('acrate') >= 0 && home.text.indexOf('agoal') >= 0 && home.text.indexOf('aboat') >= 0 && home.text.indexOf('teambanner') >= 0 && home.text.indexOf('function sharedOrbSVG(') >= 0, 'co-op renderers ship in the page (shared orb / crate / goal / boat / team banner)');
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
  assert(v.games && v.games.length === 21, 'lobby game list carries all 21 games');
  assert(v.games.filter((gm) => gm.cat === 'versus').length === 16, 'exactly 16 games are categorized versus');
  assert(v.games.filter((gm) => gm.cat === 'coop').map((gm) => gm.id).sort().join(',') === 'cheo-thuyen,chung-mot-than,day-hop,giai-ma-chung,thu-thanh', 'co-op group is exactly the 5 co-op games (chung-mot-than, day-hop, cheo-thuyen, thu-thanh, giai-ma-chung)');
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
  collect(await playSteal());
  collect(await playCrown());
  collect(await playSplat());
  collect(await playDuel());

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

  console.log('Audit H: phone touch input — pointerdown dispatch, fallbacks, dedupe');
  assert(home.text.indexOf('GAME_CMDS') >= 0 && home.text.indexOf('function runCmd(') >= 0,
    'gameplay commands dispatch through runCmd, shared by the press and click paths');
  assert(home.text.indexOf("addEventListener('pointerdown'") >= 0 && home.text.indexOf('findCmdNode') >= 0
    && home.text.indexOf('findPadNode') >= 0,
    'gameplay commands + gamepad fire on pointerdown, targets resolved with parent walk-up (span labels no longer dead)');
  assert(home.text.indexOf('cmdGuard') >= 0 && home.text.indexOf('markCmdGuard') >= 0,
    'the synthetic click trailing a pointerdown press is swallowed exactly once (dedupe guard)');
  assert(home.text.indexOf('window.PointerEvent') >= 0 && home.text.indexOf("addEventListener('touchstart'") >= 0
    && home.text.indexOf("addEventListener('touchcancel'") >= 0 && home.text.indexOf("addEventListener('mousedown'") >= 0,
    'touch/mouse fallbacks ship for engines without Pointer Events (in-app webviews, older browsers)');
  assert(home.text.indexOf('.tapbtn, .opt, .key, .pad') >= 0 && home.text.indexOf('data-cmd="guessSubmit"]') >= 0,
    'every gameplay control carries touch-action:none so mashing cannot scroll or cancel presses');
  assert(home.text.indexOf('.pstage') >= 0 && home.text.indexOf('overscroll-behavior: none') >= 0
    && home.text.indexOf('.pressed') >= 0 && home.text.indexOf('pressFx') >= 0,
    'playing container blocks overscroll/pull-refresh; presses get instant .pressed feedback');
  assert(home.text.indexOf('padBitHeld') >= 0 && home.text.indexOf("g.id === 'dua-bam') pm = null") >= 0
    && home.text.indexOf('Math.round((g.knot || 0) / 9)') >= 0,
    'player view signature is stabilized (no per-tap/per-press rebuilds) and lost pad releases recover');

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

  // =====================================================================
  // Audit I: the four new games, driven deterministically in 2-human
  // rooms (no bots -> no bot RNG). Every expectation below is computed
  // by hand from the engine constants: spawn ring radius 5.5 (seat 1 at
  // (5.5,0), seat 2 at (-5.5,0)), MOVE_STEP 0.5/tick, pickup radius 1.3,
  // SHOVE_RANGE 2.7. Splat cell indices account for IEEE reality:
  // 9.6/1.6 == 5.999999999999999, so y=0 lands in row 5, not row 6.
  console.log('Audit I: new games — hand-computed deterministic drives');
  async function padTicks(drv, tok, pad, n) {
    let v = null;
    for (let i = 0; i < n; i++) { await drv.pAct(tok, { action: 'pad', pad }); tick(250); v = await drv.state(); }
    return v;
  }
  // Steer one human's blob toward a (possibly moving) target using the
  // live host view, one 250ms tick per step, until `until(view)` holds.
  async function driveSeat(drv, tok, seat, targetFn, opts) {
    const o = opts || {};
    for (let i = 0; i < (o.max || 90); i++) {
      const v = await drv.state();
      if (o.until && o.until(v)) { await drv.pAct(tok, { action: 'pad', pad: {} }); return v; }
      const b = v.game && v.game.blobs ? v.game.blobs[seat] : null;
      if (!b) throw new Error('driveSeat: no blob for seat ' + seat);
      const tgt = targetFn(v);
      const dx = tgt.x - b.x, dy = tgt.y - b.y;
      if (Math.hypot(dx, dy) <= (o.tol || 0.3)) { await drv.pAct(tok, { action: 'pad', pad: {} }); return v; }
      const pad = {};
      if (dx > 0.25) pad.r = true; else if (dx < -0.25) pad.l = true;
      if (dy > 0.25) pad.d = true; else if (dy < -0.25) pad.u = true;
      await drv.pAct(tok, { action: 'pad', pad });
      tick(250);
    }
    throw new Error('driveSeat timeout (seat ' + seat + ')');
  }

  // --- Cướp Sao: star values, the golden star, and the shove drop -----
  // Star spawns are forced by a random queue. Draw order in spawnStar is
  // angle then radius; rand(0,2PI)/rand(2,8.5) map the queue values to:
  // star1 (4,0), star2 (-4,0), respawn (0,-7), golden@tick48 (0,3),
  // respawn (0,7) — deliberately far from (-9.2,0), where the shove
  // below lands H2, so the landing cannot re-bank a star in the same
  // tick — and golden@tick96: attempts on (0,-7) and (0,7) are rejected
  // (too close to stars sitting there), the third lands at (4,0).
  const stDrv = await newDrv();
  const st1 = await stDrv.join('Mot');
  const stP2 = await stDrv.join('Hai');
  await stDrv.act({ action: 'startGame', game: 'cuop-sao' });
  await withRandomQueue(
    [0.0, 0.3077, 0.5, 0.3077, 0.75, 0.7692, 0.25, 0.1538, 0.25, 0.7692, 0.75, 0.7692, 0.25, 0.7692, 0.0, 0.3077],
    async () => {
      let v = await pumpD(stDrv, 250, (s) => s.game && s.game.phase === 'steal', 'steal begins');
      const byId = v.game.stars.slice().sort((a, b) => a.id - b.id);
      assert(byId.length === 2 && byId[0].x === 4 && byId[0].y === 0 && byId[1].x === -4 && byId[1].y === 0 && !byId[0].gold && !byId[1].gold,
        'steal: forced spawns land at (4,0) and (-4,0), got ' + JSON.stringify(v.game.stars));
      // H1 at (5.5,0): one tick left puts it at (5.0,0), 1.0 from star1
      // (pickup radius 1.3) -> banks exactly 1.
      v = await padTicks(stDrv, st1.playerToken, { l: true }, 1);
      await stDrv.pAct(st1.playerToken, { action: 'pad', pad: {} });
      assert(v.game.banked[1] === 1 && v.game.banked[2] === 0, 'steal: flying over a normal star banks exactly 1');
      // Golden star spawns on tick 48 at (0,3).
      v = await pumpD(stDrv, 250, (s) => s.game && s.game.stars && s.game.stars.some((x) => x.gold), 'steal golden spawns', 200);
      const gold = v.game.stars.find((x) => x.gold);
      assert(Math.abs(gold.x) <= 0.01 && Math.abs(gold.y - 3) <= 0.01, 'steal: golden star spawns at (0,3), got ' + JSON.stringify(gold));
      v = await driveSeat(stDrv, st1.playerToken, 1,
        (s) => { const gs = s.game.stars.find((x) => x.gold); return gs ? { x: gs.x, y: gs.y } : { x: 0, y: 3 }; },
        { until: (s) => s.game.banked[1] === 4 });
      assert(v.game.banked[1] === 4, 'steal: the golden star banks exactly 3 (total 1 + 3 = 4)');
      // H2 at (-5.5,0) steps right onto star2 at (-4,0).
      v = await driveSeat(stDrv, stP2.playerToken, 2, () => ({ x: -4, y: 0 }), { until: (s) => s.game.banked[2] === 1 });
      assert(v.game.banked[2] === 1, 'steal: H2 banks star2 for exactly 1');
      // H1 closes to shove range (<= 2.4) and shoves: H2 must drop its
      // banked point as a loose star where it stood.
      v = await driveSeat(stDrv, st1.playerToken, 1,
        (s) => ({ x: s.game.blobs[2].x, y: s.game.blobs[2].y }),
        { until: (s) => Math.hypot(s.game.blobs[1].x - s.game.blobs[2].x, s.game.blobs[1].y - s.game.blobs[2].y) <= 2.4 });
      const h2pos = { x: v.game.blobs[2].x, y: v.game.blobs[2].y };
      v = await padTicks(stDrv, st1.playerToken, { a: true }, 1);
      await stDrv.pAct(st1.playerToken, { action: 'pad', pad: {} });
      assert(v.game.banked[2] === 0 && v.game.banked[1] === 4, 'steal: a shove knocks exactly 1 banked point out of the victim');
      assert(v.game.stars.some((s) => !s.gold && Math.hypot(s.x - h2pos.x, s.y - h2pos.y) <= 1.2),
        'steal: the dropped point lies as a loose star where the victim stood');
      v = await pumpD(stDrv, 250, (s) => s.phase === 'results', 'steal results', 400);
      assert(v.lastGame.points[1] === 300 && v.lastGame.points[2] === 200,
        'steal: final placements 300/200 for banked 4 vs 0, got ' + JSON.stringify(v.lastGame.points));
    });
  const stRes = await stDrv.state();
  assert(stRes.phase === 'results' && stRes.lastGame.points[1] === 300 && stRes.lastGame.points[2] === 200, 'steal: results stand after the random queue is restored');
  const xemSt = await stDrv.join('Xem');
  assert(xemSt.ok === true && xemSt.seat === 3, 'spectator can join at steal results');

  // --- Giữ Vương Miện: pickup, holder speed, hold accrual, drop lock --
  const crDrv = await newDrv();
  const cr1 = await crDrv.join('Mot');
  const cr2 = await crDrv.join('Hai');
  await crDrv.act({ action: 'startGame', game: 'giu-vuong-mien' });
  let cv = await pumpD(crDrv, 250, (s) => s.game && s.game.phase === 'crown', 'crown begins');
  assert(cv.game.crown.holder === null && cv.game.crown.x === 0 && cv.game.crown.y === 0, 'crown: rests at the centre, unheld');
  // H1 walks left 0.5/tick: at x=1.0 (tick 9) it is 1.0 from the crown
  // -> pickup, and the pickup tick itself scores +1.
  cv = await driveSeat(crDrv, cr1.playerToken, 1, () => ({ x: 0, y: 0 }), { until: (s) => s.game.crown.holder === 1 });
  assert(Math.abs(cv.game.blobs[1].x - 1.0) <= 0.01 && cv.game.hold[1] === 1, 'crown: pickup at x=1.0 and the pickup tick scores +1 (hold == 1)');
  // Holder speed is 0.9 x 0.5 = 0.45/tick: 10 ticks right from x=1.0.
  cv = await padTicks(crDrv, cr1.playerToken, { r: true }, 10);
  await crDrv.pAct(cr1.playerToken, { action: 'pad', pad: {} });
  assert(Math.abs(cv.game.blobs[1].x - 5.5) <= 0.02, 'crown: holder moves at 0.45/tick (x == 5.5 after 10 ticks), got ' + cv.game.blobs[1].x);
  const holdBefore = cv.game.hold[1];
  cv = await padTicks(crDrv, cr1.playerToken, {}, 20);
  assert(cv.game.hold[1] - holdBefore === 20, 'crown: 20 quiet ticks as holder add exactly 20 hold points');
  // H2 walks right along y=0 to shove range of the holder.
  cv = await driveSeat(crDrv, cr2.playerToken, 2,
    (s) => ({ x: s.game.blobs[1].x, y: s.game.blobs[1].y }),
    { until: (s) => Math.hypot(s.game.blobs[1].x - s.game.blobs[2].x, s.game.blobs[1].y - s.game.blobs[2].y) <= 2.6 });
  cv = await padTicks(crDrv, cr2.playerToken, { a: true }, 1);
  await crDrv.pAct(cr2.playerToken, { action: 'pad', pad: {} });
  // The crown drops 1.6 past the victim along the shove line: (7.1, 0).
  assert(cv.game.crown.holder === null && Math.abs(cv.game.crown.x - 7.1) <= 0.05 && Math.abs(cv.game.crown.y) <= 0.05,
    'crown: a shove drops the crown at (7.1, 0), got ' + JSON.stringify(cv.game.crown));
  // Lockout is 4 ticks: still unheld after 3 more ticks, re-grabbed by
  // H1 (standing 1.1 away at x=8.2) on the 4th.
  cv = await padTicks(crDrv, cr1.playerToken, {}, 3);
  assert(cv.game.crown.holder === null, 'crown: pickup lockout still holds 3 ticks after the drop');
  cv = await padTicks(crDrv, cr1.playerToken, {}, 1);
  assert(cv.game.crown.holder === 1, 'crown: H1 re-grabs the crown once the lockout lapses');
  cv = await pumpD(crDrv, 250, (s) => s.phase === 'results', 'crown results', 400);
  assert(cv.lastGame.points[1] === 300 && cv.lastGame.points[2] === 200, 'crown: placements 300/200, got ' + JSON.stringify(cv.lastGame.points));
  assert(cv.players.find((p) => p.seat === 1).score === 300, 'crown: winner banked the 300 placement points');

  // --- Sơn Sàn: scripted paths paint hand-counted cells ---------------
  const spDrv = await newDrv();
  const sp1 = await spDrv.join('Mot');
  const sp2 = await spDrv.join('Hai');
  await spDrv.act({ action: 'startGame', game: 'son-san' });
  let sv2 = await pumpD(spDrv, 250, (s) => s.game && s.game.phase === 'splat', 'splat begins');
  tick(250); sv2 = await spDrv.state(); // tick 1: spawn cells paint
  assert(sv2.game.grid[69] === 1 && sv2.game.grid[62] === 2, 'splat: tick 1 paints the spawn cells (69 for H1, 62 for H2)');
  assert(sv2.game.counts[1] === 1 && sv2.game.counts[2] === 1, 'splat: counts start at 1 cell each');
  // Right x4: x = 6.0 (cell 69 again), 6.5/7.0/7.5 (cell 70) -> 2 cells.
  sv2 = await padTicks(spDrv, sp1.playerToken, { r: true }, 4);
  assert(sv2.game.counts[1] === 2, 'splat: walking right 4 ticks owns exactly 2 cells, got ' + sv2.game.counts[1]);
  // Down x4: y = 0.5/1.0/1.5 (cell 82), 2.0 (cell 94) -> 4 cells.
  sv2 = await padTicks(spDrv, sp1.playerToken, { d: true }, 4);
  assert(sv2.game.counts[1] === 4, 'splat: walking down 4 ticks owns exactly 4 cells, got ' + sv2.game.counts[1]);
  // Burst at cell 94 (row 7, col 10): 3x3 = rows 6-8 x cols 9-11; two
  // already owned (82, 94) -> +7 = 11 cells.
  sv2 = await padTicks(spDrv, sp1.playerToken, { a: true }, 1);
  await spDrv.pAct(sp1.playerToken, { action: 'pad', pad: {} });
  assert(sv2.game.counts[1] === 11, 'splat: the 3x3 burst brings H1 to exactly 11 cells, got ' + sv2.game.counts[1]);
  // A second burst inside the 2s cooldown paints nothing.
  sv2 = await padTicks(spDrv, sp1.playerToken, { a: true }, 1);
  await spDrv.pAct(sp1.playerToken, { action: 'pad', pad: {} });
  assert(sv2.game.counts[1] === 11 && sv2.game.counts[2] === 1, 'splat: burst is blocked during its cooldown; idle H2 still owns 1');
  sv2 = await pumpD(spDrv, 250, (s) => s.phase === 'results', 'splat results', 400);
  assert(sv2.lastGame.points[1] === 300 && sv2.lastGame.points[2] === 200, 'splat: placements 300/200 for 11 vs 1 cells, got ' + JSON.stringify(sv2.lastGame.points));

  // --- Cao Bồi: foul / receipt order / silent player / final x2 -------
  // Hand totals: r1 P2 200, P1 foul -100; r2 P2 200, P1 100; r3 P1 200
  // (P2 never fires); r4 P2 200, P1 foul -100; r5 x2: P1 400, P2 200.
  // Match totals: P1 = 500, P2 = 800.
  const duDrv = await newDrv();
  const du1 = await duDrv.join('Mot');
  const du2 = await duDrv.join('Hai');
  await duDrv.act({ action: 'startGame', game: 'cao-boi' });
  const duelRound = async (r, script) => {
    await pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'wait' && s.game.round === r, 'duel wait r' + r);
    await script();
    return pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'roundEnd' && s.game.round === r, 'duel roundEnd r' + r);
  };
  const ptsOf = (v, seat) => v.game.lastRound.entries.find((e) => e.seat === seat).points;
  let duv = await duelRound(1, async () => {
    await duDrv.pAct(du1.playerToken, { action: 'tap' }); // foul: before BẮN!
    await pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'go' && s.game.round === 1, 'duel go r1');
    await duDrv.pAct(du2.playerToken, { action: 'tap' });
  });
  assert(ptsOf(duv, 2) === 200 && ptsOf(duv, 1) === -100, 'duel r1: lone legal draw scores 200, the foul scores -100');
  duv = await duelRound(2, async () => {
    await pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'go' && s.game.round === 2, 'duel go r2');
    await duDrv.pAct(du2.playerToken, { action: 'tap' });
    tick(10);
    await duDrv.pAct(du1.playerToken, { action: 'tap' });
  });
  assert(ptsOf(duv, 2) === 200 && ptsOf(duv, 1) === 100, 'duel r2: receipt order pays 200 then 100 (10ms apart)');
  duv = await duelRound(3, async () => {
    await pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'go' && s.game.round === 3, 'duel go r3');
    await duDrv.pAct(du1.playerToken, { action: 'tap' });
  });
  assert(ptsOf(duv, 1) === 200 && ptsOf(duv, 2) === 0, 'duel r3: the window closes on a silent player (200 / 0)');
  duv = await duelRound(4, async () => {
    await duDrv.pAct(du1.playerToken, { action: 'tap' }); // foul again
    await pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'go' && s.game.round === 4, 'duel go r4');
    await duDrv.pAct(du2.playerToken, { action: 'tap' });
  });
  assert(ptsOf(duv, 2) === 200 && ptsOf(duv, 1) === -100, 'duel r4: foul -100 again, clean draw 200');
  duv = await duelRound(5, async () => {
    await pumpD(duDrv, 100, (s) => s.game && s.game.phase === 'go' && s.game.round === 5, 'duel go r5');
    await duDrv.pAct(du1.playerToken, { action: 'tap' });
    tick(10);
    await duDrv.pAct(du2.playerToken, { action: 'tap' });
  });
  assert(ptsOf(duv, 1) === 400 && ptsOf(duv, 2) === 200, 'duel r5: the final round doubles draw points (400 / 200)');
  duv = await pumpD(duDrv, 250, (s) => s.phase === 'results', 'duel results');
  assert(duv.lastGame.points[1] === 500 && duv.lastGame.points[2] === 800,
    'duel: hand-computed match totals are P1 500 / P2 800, got ' + JSON.stringify(duv.lastGame.points));


  // =====================================================================
  // Audit J: the three co-op games. Co-op scoring has NO placement: a
  // team result (score + tier) pays EVERY player the same pointsEach
  // (Vàng 300 / Bạc 200 / Đồng 100 / below 50). All expectations are
  // hand-computed from the engine constants: MOVE_STEP 0.5/tick, shared
  // checkpoint radius 1.3, ball speed 0.4/tick, crate step 0.3/tick,
  // rowing fullStroke 10m over 45 beats (perfect team = 450m).
  console.log('Audit J: co-op games — team tiers, split steering, crate, rowing');
  // Set both humans' pads once, then run n ticks (pads are held-state).
  async function bothTicks(drv, tokA, padA, tokB, padB, n) {
    await drv.pAct(tokA, { action: 'pad', pad: padA });
    await drv.pAct(tokB, { action: 'pad', pad: padB });
    let v = null;
    for (let i = 0; i < n; i++) { tick(250); v = await drv.state(); }
    return v;
  }
  async function sharedPads(drv, tokV, padV, tokH, padH) {
    await drv.pAct(tokV, { action: 'pad', pad: padV });
    await drv.pAct(tokH, { action: 'pad', pad: padH });
  }
  // Steer the Chung Một Thân blob: tokV's owner sends the vertical
  // component, tokH's owner the horizontal one (2P dealing).
  async function driveShared(drv, tokV, tokH, targetFn, opts) {
    const o = opts || {};
    for (let i = 0; i < (o.max || 120); i++) {
      const v = await drv.state();
      if (o.until && o.until(v)) { await sharedPads(drv, tokV, {}, tokH, {}); return v; }
      const b = v.game && v.game.shared;
      if (!b) throw new Error('driveShared: no shared blob');
      const tgt = targetFn(v);
      const dx = tgt.x - b.x, dy = tgt.y - b.y;
      if (!o.until && Math.hypot(dx, dy) <= (o.tol || 0.3)) { await sharedPads(drv, tokV, {}, tokH, {}); return v; }
      const pv = {}, ph = {};
      if (dx > 0.25) ph.r = true; else if (dx < -0.25) ph.l = true;
      if (dy > 0.25) pv.d = true; else if (dy < -0.25) pv.u = true;
      await sharedPads(drv, tokV, pv, tokH, ph);
      tick(250);
    }
    throw new Error('driveShared timeout');
  }
  // Slide one player horizontally on a FIXED pad until its centre
  // crosses targetX. Used for under-crate crossings: the pad never
  // gains a second axis (driveSeat would add one once the body-block
  // projection moves the player off the target line), so the intent
  // inside the contact band stays a pure axis push of magnitude 1.
  async function slideX(drv, tok, seat, targetX, pad) {
    await drv.pAct(tok, { action: 'pad', pad });
    let v = null;
    for (let i = 0; i < 60; i++) {
      tick(250);
      v = await drv.state();
      const b = v.game.blobs[seat];
      if ((pad.r && b.x >= targetX) || (pad.l && b.x <= targetX)) break;
    }
    await drv.pAct(tok, { action: 'pad', pad: {} });
    return v;
  }
  // Walk one box-game player into the crate's contact band (<= 2.44;
  // the body-block floor is exactly 2.4). The approach is AXIS-ALIGNED
  // (vertical first, then horizontal): a diagonal intent has magnitude
  // sqrt(2) >= 1.2, so diagonal homing would legally PUSH the crate
  // (with the other player in contact) and the band would never close.
  async function boxHome(drv, tok, seat) {
    for (let i = 0; i < 40; i++) {
      const v = await drv.state();
      const b = v.game.blobs[seat]; const c = v.game.crate;
      const dx = c.x - b.x, dy = c.y - b.y;
      if (Math.hypot(dx, dy) <= 2.44) { await drv.pAct(tok, { action: 'pad', pad: {} }); return v; }
      const pad = {};
      if (Math.abs(dy) > 0.25) { if (dy > 0) pad.d = true; else pad.u = true; }
      else if (dx > 0.25) pad.r = true; else if (dx < -0.25) pad.l = true;
      await drv.pAct(tok, { action: 'pad', pad });
      tick(250);
    }
    throw new Error('boxHome timeout seat ' + seat);
  }

  // --- J1: direction dealing for 2/3/4-player rooms -------------------
  const shDrv = await newDrv();
  const sh1 = await shDrv.join('Mot');
  const sh2 = await shDrv.join('Hai');
  await shDrv.act({ action: 'startGame', game: 'chung-mot-than' });
  let jv = await pumpD(shDrv, 250, (s) => s.game && s.game.phase === 'shared', 'shared begins (2P)');
  assert(JSON.stringify(jv.game.owners) === JSON.stringify({ u: 1, r: 2, d: 1, l: 2 }),
    'shared dealing 2P: P1 owns up+down, P2 owns right+left, got ' + JSON.stringify(jv.game.owners));
  const shPv1 = await shDrv.pState(sh1.playerToken);
  const shPv2 = await shDrv.pState(sh2.playerToken);
  assert(JSON.stringify(shPv1.game.myDirs) === JSON.stringify(['u', 'd']), 'shared phone view: P1 sees myDirs [u, d]');
  assert(JSON.stringify(shPv2.game.myDirs) === JSON.stringify(['r', 'l']), 'shared phone view: P2 sees myDirs [r, l]');
  const sh3Drv = await newDrv();
  await sh3Drv.join('Mot');
  await sh3Drv.act({ action: 'addBot', seat: 2 });
  await sh3Drv.act({ action: 'addBot', seat: 3 });
  await sh3Drv.act({ action: 'startGame', game: 'chung-mot-than' });
  jv = await pumpD(sh3Drv, 250, (s) => s.game && s.game.phase === 'shared', 'shared begins (3P)');
  assert(JSON.stringify(jv.game.owners) === JSON.stringify({ u: 1, r: 2, d: 3, l: 1 }),
    'shared dealing 3P: P1 up+left, P2 right, P3 down, got ' + JSON.stringify(jv.game.owners));
  const sh4Drv = await newDrv();
  await sh4Drv.join('Mot');
  await sh4Drv.act({ action: 'addBot', seat: 2 });
  await sh4Drv.act({ action: 'addBot', seat: 3 });
  await sh4Drv.act({ action: 'addBot', seat: 4 });
  await sh4Drv.act({ action: 'startGame', game: 'chung-mot-than' });
  jv = await pumpD(sh4Drv, 250, (s) => s.game && s.game.phase === 'shared', 'shared begins (4P)');
  assert(JSON.stringify(jv.game.owners) === JSON.stringify({ u: 1, r: 2, d: 3, l: 4 }),
    'shared dealing 4P: one direction each, got ' + JSON.stringify(jv.game.owners));

  // --- J2: server filtering — non-owned directions do nothing ---------
  // Same 2-human room as J1; the blob starts at (0,0), no ticks elapsed.
  jv = await padTicks(shDrv, sh2.playerToken, { u: true }, 4);
  assert(jv.game.shared.x === 0 && jv.game.shared.y === 0, 'shared filter: P2 holding UP (not owned) moves nothing');
  jv = await padTicks(shDrv, sh1.playerToken, { r: true }, 4);
  assert(jv.game.shared.x === 0 && jv.game.shared.y === 0, 'shared filter: P1 holding RIGHT (not owned) moves nothing');
  jv = await padTicks(shDrv, sh1.playerToken, { u: true }, 4);
  assert(jv.game.shared.x === 0 && jv.game.shared.y === -2, 'shared filter: P1 UP x4 ticks moves the blob to y == -2 exactly, got ' + JSON.stringify(jv.game.shared));
  await shDrv.pAct(sh1.playerToken, { action: 'pad', pad: {} }); // release P1's held pad before P2's turn
  jv = await padTicks(shDrv, sh2.playerToken, { l: true }, 4);
  assert(jv.game.shared.x === -2 && jv.game.shared.y === -2, 'shared filter: P2 LEFT x4 ticks moves the blob to x == -2 exactly, got ' + JSON.stringify(jv.game.shared));
  await shDrv.pAct(sh1.playerToken, { action: 'pad', pad: {} });
  await shDrv.pAct(sh2.playerToken, { action: 'pad', pad: {} });

  // --- J3: scripted checkpoint + hearts end the game ------------------
  // Queue 0.5: every star spawns at (-5.5, 0); every cannonball spawns
  // at (0,-12) flying straight at (0,0) at 0.4/tick (27 ticks to reach
  // the parked blob). Drive out, touch the star once (checks == 1),
  // drive home to (0,0), release: balls land at ~ticks 37/53/69, the
  // third empties the 3 shared hearts long before the 60s timeout.
  const cpDrv = await newDrv();
  const cp1 = await cpDrv.join('Mot');
  const cp2 = await cpDrv.join('Hai');
  await withRandomQueue(new Array(600).fill(0.5), async () => {
    const t0 = now;
    await cpDrv.act({ action: 'startGame', game: 'chung-mot-than' });
    await pumpD(cpDrv, 250, (s) => s.game && s.game.phase === 'shared', 'shared begins (J3)');
    await driveShared(cpDrv, cp1.playerToken, cp2.playerToken, (s) => s.game.star, { until: (s) => s.game.checks >= 1 });
    await driveShared(cpDrv, cp1.playerToken, cp2.playerToken, () => ({ x: 0, y: 0 }), {});
    const parked = await cpDrv.state();
    assert(parked.game.checks === 1, 'shared: one scripted checkpoint touch scores exactly 1, got ' + parked.game.checks);
    const res = await pumpD(cpDrv, 250, (s) => s.phase === 'results', 'shared hearts end', 200);
    assert(now - t0 < 45000, 'shared: the game ended by HEARTS, not the 60s timeout (elapsed ' + (now - t0) + 'ms)');
    const tr = res.lastGame.teamResult;
    assert(tr && tr.score === 1 && tr.tier === 'none' && tr.pointsEach === 50,
      'shared: 1 checkpoint is below Đồng -> team tier none, +50 each, got ' + JSON.stringify(tr));
    assert(res.lastGame.points[1] === 50 && res.lastGame.points[2] === 50,
      'shared: both players bank the equal 50 team points, got ' + JSON.stringify(res.lastGame.points));
  });

  // --- J4: checkpoint tiers 3/5/8 -> Đồng/Bạc/Vàng ---------------------
  // Queue 0.999: the star always (re)spawns at ~(8.49,-0.05) — right
  // where the blob parks against it, so checks tick up exactly 1/tick;
  // cannonballs fly a path that misses the parked blob by ~5 units.
  // The moment checks hit N the clock jumps past endsAt: stepShared
  // finishes on time BEFORE any further sim tick, freezing checks at N.
  for (const [need, tier, pts] of [[3, 'dong', 100], [5, 'bac', 200], [8, 'vang', 300]]) {
    const tDrv = await newDrv();
    const t1 = await tDrv.join('Mot');
    const t2 = await tDrv.join('Hai');
    await withRandomQueue(new Array(2000).fill(0.999), async () => {
      await tDrv.act({ action: 'startGame', game: 'chung-mot-than' });
      await pumpD(tDrv, 250, (s) => s.game && s.game.phase === 'shared', 'shared begins (tier ' + need + ')');
      await driveShared(tDrv, t1.playerToken, t2.playerToken, () => ({ x: 12, y: 0 }), { until: (s) => s.game.checks >= need });
      tick(61000);
      const res = await tDrv.state();
      const tr = res.lastGame && res.lastGame.teamResult;
      assert(res.phase === 'results' && tr && tr.score === need && tr.tier === tier && tr.pointsEach === pts,
        'shared tier: exactly ' + need + ' checkpoints -> ' + tier + ' (+' + pts + ' each), got ' + JSON.stringify(tr));
      assert(res.lastGame.points[1] === pts && res.lastGame.points[2] === pts,
        'shared tier ' + need + ': equal banked points ' + pts + '/' + pts);
    });
  }

  // --- J5: Đẩy Hộp — solo / aligned / opposed / delivery --------------
  // Layout 0: crate (-6,0), goal x 6.5..9.5 / y -1.5..1.5. P2 spawns at
  // (-5.5,0) — 0.5 to the RIGHT of the crate centre — so tick 1's
  // body-block parks it at exactly (-3.6,0): right-side contact. One
  // player's push sums to magnitude 1 < 1.2, so even with the other
  // player incidentally in contact the crate cannot move until BOTH
  // players push the same way (sum 2 -> the crate slides 0.3/tick).
  const bxDrv = await newDrv();
  const bx1 = await bxDrv.join('Mot');
  const bx2 = await bxDrv.join('Hai');
  await bxDrv.act({ action: 'startGame', game: 'day-hop' });
  let bv = await pumpD(bxDrv, 250, (s) => s.game && s.game.phase === 'box', 'box begins');
  assert(bv.game.crate.x === -6 && bv.game.crate.y === 0 && bv.game.layout === 0, 'box: layout 0 opens with the crate at (-6,0)');
  // Solo: P1 dives UNDER the crate on a fixed {l} slide (inside the
  // contact band its intent is a pure axis push of magnitude 1, and
  // P2 idles in right-side contact with intent 0, so the crossing
  // cannot move the crate either), rises on the far left and homes
  // into the pure-left contact point. It then pushes right alone —
  // the sum is still only magnitude 1.
  await padTicks(bxDrv, bx1.playerToken, { d: true }, 3);
  await bxDrv.pAct(bx1.playerToken, { action: 'pad', pad: {} });
  await slideX(bxDrv, bx1.playerToken, 1, -8.7, { l: true });
  await padTicks(bxDrv, bx1.playerToken, { u: true }, 4);
  await bxDrv.pAct(bx1.playerToken, { action: 'pad', pad: {} });
  await boxHome(bxDrv, bx1.playerToken, 1);
  const crateA = (await bxDrv.state()).game.crate;
  bv = await padTicks(bxDrv, bx1.playerToken, { r: true }, 10);
  await bxDrv.pAct(bx1.playerToken, { action: 'pad', pad: {} });
  assert(bv.game.crate.x === crateA.x && bv.game.crate.y === crateA.y,
    'box: ONE player pushing alone never moves the crate (sum 1 < 1.2), got ' + JSON.stringify(bv.game.crate));
  // Opposed: no routing at all — P2 has been parked in right-side
  // contact since tick 1 and P1 sits at the pure-left point, so both
  // push radially into the crate (P1 right, P2 left) and the sums
  // cancel exactly; radial presses keep both projected in place.
  const crateC = (await bxDrv.state()).game.crate;
  bv = await bothTicks(bxDrv, bx1.playerToken, { r: true }, bx2.playerToken, { l: true }, 10);
  await bothTicks(bxDrv, bx1.playerToken, {}, bx2.playerToken, {}, 0);
  assert(bv.game.crate.x === crateC.x && bv.game.crate.y === crateC.y,
    'box: two players pushing against each other cancel — crate byte-identical, got ' + JSON.stringify(bv.game.crate));
  // Aligned + delivery: both pushers are placed at ~±23° around the
  // crate's left point. The angle matters: a pressing player's angle
  // steepens ~x1.26/tick (in tan) as its steps shorten the radial
  // gap while the tangential offset persists, so from ±23° it stays
  // in contact for ~20 ticks, and the two spots are ~46° apart so
  // blob separation never fires. P1 (which the opposed hold orbited
  // over the top) walks back along the top lane, drops to the y=-0.9
  // lane and steps in; P2 comes under the crate and steps in from
  // the y=+0.9 lane. Every crossing/entry intent here is a pure axis
  // push with the other player idle in contact (sum 1), so the
  // crate is still at (-6,0) when the aligned push starts.
  await slideX(bxDrv, bx1.playerToken, 1, -8.6, { l: true });
  await padTicks(bxDrv, bx1.playerToken, { d: true }, 3);
  await bxDrv.pAct(bx1.playerToken, { action: 'pad', pad: {} });
  await padTicks(bxDrv, bx1.playerToken, { r: true }, 1);
  await bxDrv.pAct(bx1.playerToken, { action: 'pad', pad: {} });
  await padTicks(bxDrv, bx2.playerToken, { d: true }, 3);
  await bxDrv.pAct(bx2.playerToken, { action: 'pad', pad: {} });
  await slideX(bxDrv, bx2.playerToken, 2, -8.6, { l: true });
  await padTicks(bxDrv, bx2.playerToken, { u: true }, 3);
  await bxDrv.pAct(bx2.playerToken, { action: 'pad', pad: {} });
  await padTicks(bxDrv, bx2.playerToken, { r: true }, 1);
  await bxDrv.pAct(bx2.playerToken, { action: 'pad', pad: {} });
  const crateB = (await bxDrv.state()).game.crate;
  bv = await bothTicks(bxDrv, bx1.playerToken, { r: true }, bx2.playerToken, { r: true }, 10);
  assert(Math.abs(bv.game.crate.x - (crateB.x + 3.0)) <= 0.05 && Math.abs(bv.game.crate.y - crateB.y) <= 0.05,
    'box: two players aligned move the crate +3.0 in 10 ticks (0.3/tick), got ' + JSON.stringify(bv.game.crate));
  // Delivery: keep pushing with STEERED pads. A pusher holding a
  // fixed direction orbits the crate and falls out of contact, so
  // each tick every in-contact player pushes right plus a vertical
  // correction toward the crate's centre line (the two corrections
  // cancel in the push sum when the formation is symmetric), and an
  // out-of-contact player re-homes axis-aligned to the crate's left
  // point, so a re-entry tick carries a single-axis intent.
  let delivered = null;
  for (let i = 0; i < 100 && !delivered; i++) {
    const s = await bxDrv.state();
    if (!s.game) break; // the 75s clock ran out mid-push: delivered stays null and the assert below reports it
    if (s.game.deliveries >= 1) { delivered = s; break; }
    const c = s.game.crate;
    // Each player owns a pusher spot at ±23° around the crate's left
    // point (P1 above, P2 below — the aligned formation). Homing both
    // to the SAME left point deadlocks: the first arrival occupies
    // it and blob separation keeps the second player out of the band.
    const mkPad = (seat) => {
      const b = s.game.blobs[seat];
      const rx = b.x - c.x, ry = b.y - c.y;
      const dist = Math.hypot(rx, ry);
      const spot = { x: c.x - 2.22, y: c.y + (seat === 1 ? -0.95 : 0.95) };
      if (dist <= 2.45 && rx <= 0.3) {
        // In contact on the pushing side: push right, correcting
        // toward my own spot's lane (the two corrections cancel in
        // the push sum when both players ride their lanes).
        const pad = { r: true };
        if (b.y < spot.y - 0.3) pad.d = true;
        else if (b.y > spot.y + 0.3) pad.u = true;
        return pad;
      }
      if (dist <= 2.45) return ry <= 0 ? { u: true } : { d: true }; // wrong side: escape tangentially
      if (rx > 0.3 && Math.abs(ry) < 3.0) return ry <= 0 ? { u: true } : { d: true }; // clear the flank before crossing
      // Home to my spot (tight deadband — a 0.25 one strands the
      // player just outside the band); if already at the spot but
      // still out of the band, press straight in.
      const dx = spot.x - b.x, dy = spot.y - b.y;
      if (Math.hypot(dx, dy) <= 0.3) return { r: true };
      const pad = {};
      if (Math.abs(dx) >= Math.abs(dy)) { if (dx > 0.05) pad.r = true; else if (dx < -0.05) pad.l = true; }
      else { if (dy > 0.05) pad.d = true; else if (dy < -0.05) pad.u = true; }
      return pad;
    };
    await bxDrv.pAct(bx1.playerToken, { action: 'pad', pad: mkPad(1) });
    await bxDrv.pAct(bx2.playerToken, { action: 'pad', pad: mkPad(2) });
    tick(250);
  }
  if (!delivered) {
    const s = await bxDrv.state();
    if (s.game && s.game.deliveries >= 1) delivered = s;
  }
  await bothTicks(bxDrv, bx1.playerToken, {}, bx2.playerToken, {}, 0);
  assert(!!delivered && delivered.game.deliveries === 1 && delivered.game.layout === 1,
    'box: the push delivers the crate (deliveries == 1) and rotates to layout 1');
  assert(delivered.game.crate.x === -6.5 && delivered.game.crate.y === -5
    && delivered.game.goal.x === 6 && delivered.game.goal.y === 3.5,
    'box: layout 1 loads its own crate (-6.5,-5) and goal (6,3.5), got crate ' + JSON.stringify(delivered.game.crate));
  await bothTicks(bxDrv, bx1.playerToken, {}, bx2.playerToken, {}, 0);
  tick(76000);
  const bres = await bxDrv.state();
  const btr = bres.lastGame && bres.lastGame.teamResult;
  assert(bres.phase === 'results' && btr && btr.score === 1 && btr.tier === 'dong' && btr.pointsEach === 100
    && bres.lastGame.points[1] === 100 && bres.lastGame.points[2] === 100,
    'box: 1 delivery -> Đồng, +100 each, got ' + JSON.stringify(btr));

  // --- J6: Chèo Thuyền — windows, splashes, tier thresholds -----------
  // 2 humans: each in-window stroke adds 10/2 = 5m. Presses are sent at
  // exact fake-clock beat times (rowStart + k*1000).
  async function rowRoom() {
    const d = await newDrv();
    const h1 = await d.join('Mot');
    const h2 = await d.join('Hai');
    await d.act({ action: 'startGame', game: 'cheo-thuyen' });
    const v = await pumpD(d, 250, (s) => s.game && s.game.phase === 'row', 'row begins');
    return { d, h1, h2, rowStart: v.game.rowStart };
  }
  async function pressAt(d, tok, tAbs) { if (tAbs > now) tick(tAbs - now); await d.pAct(tok, { action: 'tap' }); }
  {
    const { d, h1, h2, rowStart } = await rowRoom();
    await pressAt(d, h1.playerToken, rowStart);
    await pressAt(d, h2.playerToken, rowStart);
    let rv = await d.state();
    assert(rv.game.distance === 10 && rv.game.hits[1] === 1 && rv.game.hits[2] === 1,
      'row: beat 0 with both players in-window advances the full 10m, got ' + rv.game.distance);
    await pressAt(d, h1.playerToken, rowStart + 1000);
    rv = await d.state();
    assert(rv.game.distance === 15, 'row: a lone stroke advances half (5m) -> 15m, got ' + rv.game.distance);
    await pressAt(d, h1.playerToken, rowStart + 1500); // midway: outside every window
    rv = await d.state();
    assert(rv.game.splash[1] === 1 && rv.game.distance === 15,
      'row: an off-window press splashes (miss counted, 0 advance), got splash ' + rv.game.splash[1] + ' / ' + rv.game.distance + 'm');
    for (let k = 2; k <= 40; k++) { await pressAt(d, h1.playerToken, rowStart + k * 1000); await pressAt(d, h2.playerToken, rowStart + k * 1000); }
    tick(rowStart + 45000 - now);
    rv = await d.state();
    const tr = rv.lastGame && rv.lastGame.teamResult;
    // 10 + 5 + 39*10 = 405m = exactly 90.0% of the 450m perfect distance.
    assert(rv.phase === 'results' && tr && tr.score === 405 && tr.tier === 'vang' && tr.pointsEach === 300,
      'row: 405m = 90% of perfect -> Vàng, +300 each, got ' + JSON.stringify(tr));
    assert(rv.lastGame.points[1] === 300 && rv.lastGame.points[2] === 300, 'row: Vàng banks 300/300');
  }
  {
    const { d, h1, h2, rowStart } = await rowRoom();
    for (let k = 0; k <= 31; k++) { await pressAt(d, h1.playerToken, rowStart + k * 1000); await pressAt(d, h2.playerToken, rowStart + k * 1000); }
    tick(rowStart + 45000 - now);
    const rv = await d.state();
    const tr = rv.lastGame && rv.lastGame.teamResult;
    // 32 beats x 10m = 320m = 71.1% -> Bạc.
    assert(tr && tr.score === 320 && tr.tier === 'bac' && tr.pointsEach === 200,
      'row: 320m = 71% of perfect -> Bạc, +200 each, got ' + JSON.stringify(tr));
  }
  {
    const { d, h1, rowStart } = await rowRoom();
    for (let k = 0; k <= 40; k++) await pressAt(d, h1.playerToken, rowStart + k * 1000);
    tick(rowStart + 45000 - now);
    const rv = await d.state();
    const tr = rv.lastGame && rv.lastGame.teamResult;
    // One player alone: 41 strokes x 5m = 205m = 45.6% -> Đồng.
    assert(tr && tr.score === 205 && tr.tier === 'dong' && tr.pointsEach === 100,
      'row: 205m = 46% of perfect -> Đồng, +100 each, got ' + JSON.stringify(tr));
  }
  {
    const { d, rowStart } = await rowRoom();
    tick(rowStart + 45000 - now);
    const rv = await d.state();
    const tr = rv.lastGame && rv.lastGame.teamResult;
    assert(tr && tr.score === 0 && tr.tier === 'none' && tr.pointsEach === 50
      && rv.lastGame.points[1] === 50 && rv.lastGame.points[2] === 50,
      'row: a silent team rows 0m -> participation +50 each, got ' + JSON.stringify(tr));
  }

  // --- J7: mixed session — co-op banks equal, versus banks placement --
  const mxDrv = await newDrv();
  const mx1 = await mxDrv.join('Mot');
  const mx2 = await mxDrv.join('Hai');
  await withRandomQueue(new Array(600).fill(0.5), async () => {
    await mxDrv.act({ action: 'startGame', game: 'chung-mot-than' });
    await pumpD(mxDrv, 250, (s) => s.game && s.game.phase === 'shared', 'mixed shared begins');
    // Nobody steers: the blob sits at (0,0) in the cannonballs' path.
    const res = await pumpD(mxDrv, 250, (s) => s.phase === 'results', 'mixed shared results', 200);
    const tr = res.lastGame.teamResult;
    assert(tr && tr.score === 0 && tr.tier === 'none' && tr.pointsEach === 50,
      'mixed: idle co-op run scores 0 checkpoints -> +50 each, got ' + JSON.stringify(tr));
    assert(res.lastGame.points[1] === 50 && res.lastGame.points[2] === 50, 'mixed: co-op points are equal (50/50)');
  });
  await mxDrv.act({ action: 'continue' });
  let mv = await mxDrv.state();
  assert(mv.phase === 'podium' && mv.players.find((p) => p.seat === 1).score === 50 && mv.players.find((p) => p.seat === 2).score === 50,
    'mixed: podium after the co-op game shows 50/50 banked');
  await mxDrv.act({ action: 'toChoosing' });
  await mxDrv.act({ action: 'startGame', game: 'keo-co' });
  await pumpD(mxDrv, 250, (s) => s.game && s.game.phase === 'pull', 'mixed tug begins');
  // P1 (team A, odd seat) presses B 28 times: knot = 3*(0 - 28) = -84,
  // |knot| >= TUG_WIN -> team A wins outright: A banks 300, B banks 200.
  for (let i = 0; i < 28; i++) {
    await mxDrv.pAct(mx1.playerToken, { action: 'pad', pad: { b: true } });
    await mxDrv.pAct(mx1.playerToken, { action: 'pad', pad: {} });
  }
  mv = await pumpD(mxDrv, 250, (s) => s.phase === 'results', 'mixed tug results');
  assert(mv.lastGame.id === 'keo-co' && mv.lastGame.teamResult === null
    && mv.lastGame.points[1] === 300 && mv.lastGame.points[2] === 200,
    'mixed: the versus game banks normal placement (300/200) with NO teamResult, got ' + JSON.stringify(mv.lastGame.points));
  await mxDrv.act({ action: 'continue' });
  mv = await mxDrv.state();
  assert(mv.phase === 'podium' && mv.players.find((p) => p.seat === 1).score === 350 && mv.players.find((p) => p.seat === 2).score === 250,
    'mixed: hand-checked podium totals are P1 350 (50 co-op + 300 tug) / P2 250 (50 + 200), got '
    + mv.players.map((p) => p.seat + ':' + p.score).join(','));

  // =====================================================================
  // Audit K: the five complex games. All expectations hand-computed
  // from the engine constants: shell speed 1.2/tick with hit radius
  // 1.0, fire cooldown 4 ticks, bomb fuse 8 ticks with a radius-2
  // cross, impostor points 150/300 (escape doubled to 600 in the
  // final round), slime speed 0.26/tick from rim 10.6 to the crystal
  // at 1.35, decode levels of 3/4/5 steps with 3 team hearts.
  console.log('Audit K: complex games — tanks, bombs, impostor, defence, decode');
  assert(home.text.indexOf('abarrel') >= 0 && home.text.indexOf('ashell') >= 0 && home.text.indexOf('syncDyn') >= 0,
    'wave-3 renderers ship in the page (tank barrels / shells / dynamic entity sync)');
  assert(home.text.indexOf('abomb') >= 0 && home.text.indexOf('ablast') >= 0 && home.text.indexOf('bsoft') >= 0,
    'bomber renderers ship in the page (bomb / blast / soft block)');
  assert(home.text.indexOf('aslime') >= 0 && home.text.indexOf('acrystal') >= 0 && home.text.indexOf('pips') >= 0,
    'defence + decode renderers ship in the page (slime / crystal / progress pips)');
  assert(home.text.indexOf("cmd === 'vote'") >= 0 && home.text.indexOf("cmd === 'symbol'") >= 0 && home.text.indexOf('symbtn') >= 0,
    'impostor vote command + decode symbol buttons ship in the page');
  assert(home.text.indexOf("v.game.id === 'xe-tank'") >= 0 && home.text.indexOf("v.game.id === 'dat-bom'") >= 0 && home.text.indexOf("v.game.id === 'thu-thanh'") >= 0,
    'fast poll covers the three new tick games (tank / bomber / defend)');
  {
    const lv = await (await newDrv()).state();
    const byId = {};
    (lv.games || []).forEach((gm) => { byId[gm.id] = gm.cat; });
    assert(byId['xe-tank'] === 'versus' && byId['dat-bom'] === 'versus' && byId['ke-gia-mao'] === 'versus',
      'chooser: the 3 new versus games sit in the versus group');
    assert(byId['thu-thanh'] === 'coop' && byId['giai-ma-chung'] === 'coop',
      'chooser: the 2 new co-op games sit in the coop group');
  }

  // --- Xe Tăng: facing, cooldown, a hand-aimed hit, cover, elimination
  const tkDrv = await newDrv();
  const tk1 = await tkDrv.join('Mot');
  const tk2 = await tkDrv.join('Hai');
  await tkDrv.act({ action: 'startGame', game: 'xe-tank' });
  let tv = await pumpD(tkDrv, 250, (s) => s.game && s.game.phase === 'tank', 'tank begins');
  assert(tv.game.blobs[1].x === 5.5 && tv.game.blobs[1].y === 0 && tv.game.blobs[2].x === -5.5 && tv.game.blobs[2].y === 0,
    'tank: spawns face each other across the arena');
  assert(tv.game.facing[1].x === -1 && tv.game.facing[1].y === 0, 'tank: seat 1 starts aimed at the centre');
  assert(tv.game.blocks.length === 4, 'tank: four cover blocks stand on the field');
  // Fire once down the clear spawn lane: spawn (4.4,0), 1.2/tick, the
  // target at -5.5 is first within the 1.0 hit radius on tick 8.
  tv = await padTicks(tkDrv, tk1.playerToken, { a: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  assert(tv.game.shells.length === 1, 'tank: one shell in flight after firing');
  tv = await padTicks(tkDrv, tk1.playerToken, {}, 1);
  tv = await padTicks(tkDrv, tk1.playerToken, { a: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  assert(tv.game.shells.length === 1, 'tank: the 1s cooldown swallows a re-press — still exactly 1 shell');
  tv = await pumpD(tkDrv, 250, (s) => s.game.blobs[2].lives === 2, 'tank first hit lands', 40);
  assert(tv.game.blobs[1].lives === 3, 'tank: the shooter keeps all 3 lives');
  // Cover: drive above the upper-right block, aim down, fire into it.
  await driveSeat(tkDrv, tk1.playerToken, 1, () => ({ x: 5.5, y: -5.5 }));
  tv = await driveSeat(tkDrv, tk1.playerToken, 1, () => ({ x: 3.2, y: -5.5 }));
  tv = await padTicks(tkDrv, tk1.playerToken, { d: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  assert(tv.game.facing[1].y === 1, 'tank: facing follows the last movement direction (down)');
  tv = await padTicks(tkDrv, tk1.playerToken, { a: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  tv = await padTicks(tkDrv, tk1.playerToken, {}, 2);
  assert(tv.game.shells.length === 0 && tv.game.blobs[2].lives === 2,
    'tank: the cover block eats the shell — no shell survives, no damage dealt');
  // Elimination: back to the lane, two more hits end the match.
  await driveSeat(tkDrv, tk1.playerToken, 1, () => ({ x: 5.5, y: -5.5 }));
  tv = await driveSeat(tkDrv, tk1.playerToken, 1, () => ({ x: 5.5, y: 0 }));
  tv = await padTicks(tkDrv, tk1.playerToken, { l: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  assert(tv.game.facing[1].x === -1, 'tank: facing turns left with the last move');
  tv = await padTicks(tkDrv, tk1.playerToken, { a: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  tv = await pumpD(tkDrv, 250, (s) => s.game && s.game.blobs[2].lives === 1, 'tank second hit lands', 40);
  tv = await padTicks(tkDrv, tk1.playerToken, { a: true }, 1);
  await tkDrv.pAct(tk1.playerToken, { action: 'pad', pad: {} });
  tv = await pumpD(tkDrv, 250, (s) => s.phase === 'results', 'tank elimination ends the match', 60);
  assert(tv.lastGame.points[1] === 300 && tv.lastGame.points[2] === 200,
    'tank: elimination placement pays 300/200, got ' + JSON.stringify(tv.lastGame.points));
  // Bot smoke: a bot tank drives and shoots without breaking the sim.
  {
    const btDrv = await newDrv();
    await btDrv.join('Mot');
    await btDrv.act({ action: 'addBot', seat: 2 });
    await btDrv.act({ action: 'startGame', game: 'xe-tank' });
    let bv2 = await pumpD(btDrv, 250, (s) => s.game && s.game.phase === 'tank', 'bot tank begins');
    for (let i = 0; i < 40; i++) { tick(250); bv2 = await btDrv.state(); }
    assert(bv2.game && bv2.game.blobs[2] && bv2.game.blobs[1].alive,
      'tank: 40 ticks with a bot driver leave the match running cleanly');
  }

  // --- Đặt Bom A: queued layout, corner spawns, CHAIN REACTION --------
  // Soft generation draws once per candidate cell in row-major order
  // (99 cells - 20 hard - 12 spawn-safe = 67 draws); the queue below
  // deals exactly one soft block, at (4,0).
  const bmDrv = await newDrv();
  const bm1 = await bmDrv.join('Mot');
  await bmDrv.join('Hai');
  const bm3 = await bmDrv.join('Ba');
  {
    const q = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 11; c++) {
      const hard = c % 2 === 1 && r % 2 === 1;
      const safe = (c <= 1 && r <= 1) || (c >= 9 && r >= 7) || (c >= 9 && r <= 1) || (c <= 1 && r >= 7);
      if (hard || safe) continue;
      q.push(c === 4 && r === 0 ? 0.1 : 0.99);
    }
    await withRandomQueue(q, async () => {
      await bmDrv.act({ action: 'startGame', game: 'dat-bom' });
      let bv = await pumpD(bmDrv, 250, (s) => s.game && s.game.phase === 'bomber', 'bomber begins');
      assert(bv.game.hard.length === 20, 'bomber: 20 hard pillars on the odd/odd cells');
      assert(JSON.stringify(bv.game.soft) === JSON.stringify([[4, 0]]),
        'bomber: the queued layout deals exactly one soft block at (4,0), got ' + JSON.stringify(bv.game.soft));
      assert(bv.game.blobs[1].x === -10 && bv.game.blobs[1].y === -8 && bv.game.blobs[3].x === 10 && bv.game.blobs[3].y === -8,
        'bomber: players spawn in the corner cells');
      // H3 walks the open corridors (right column, middle row, top row).
      await driveSeat(bmDrv, bm3.playerToken, 3, () => ({ x: 10, y: -4 }));
      await driveSeat(bmDrv, bm3.playerToken, 3, () => ({ x: -6, y: -4 }));
      bv = await driveSeat(bmDrv, bm3.playerToken, 3, () => ({ x: -6, y: -8 }));
      bv = await padTicks(bmDrv, bm3.playerToken, { a: true }, 1);
      await bmDrv.pAct(bm3.playerToken, { action: 'pad', pad: {} });
      assert(bv.game.bombs.length === 1 && bv.game.bombs[0].left >= 1750,
        'bomber: H3 plants a bomb on (2,0) with a ~2s fuse, left=' + (bv.game.bombs[0] && bv.game.bombs[0].left));
      bv = await padTicks(bmDrv, bm1.playerToken, { a: true }, 1);
      await bmDrv.pAct(bm1.playerToken, { action: 'pad', pad: {} });
      assert(bv.game.bombs.length === 2, 'bomber: two live bombs, one per player');
      // H3 flees; H1's bomb must be chained by H3's, before its own
      // 8-tick fuse could ever run out.
      let chainTicks = 0;
      while (chainTicks < 12) {
        bv = await bmDrv.state();
        if (!bv.game.bombs.length) break;
        await bmDrv.pAct(bm3.playerToken, { action: 'pad', pad: { d: true, r: true } });
        tick(250); chainTicks++;
      }
      assert(bv.game.bombs.length === 0 && chainTicks < 8,
        'bomber: CHAIN — the second bomb detonated with the first after ' + chainTicks + ' ticks (its own fuse is 8)');
      const cells = bv.game.blasts && bv.game.blasts.length ? bv.game.blasts[bv.game.blasts.length - 1].cells : [];
      const has = (c, r) => cells.some(([cc, rr]) => cc === c && rr === r);
      assert(has(0, 0) && has(2, 0) && has(4, 0), 'bomber: the combined blast covers both bomb cells and the soft block');
      assert(!has(5, 0), 'bomber: the soft block stops the blast arm — (5,0) is untouched');
      assert(bv.game.soft.length === 0, 'bomber: the soft block was destroyed by the blast');
      assert(bv.game.blobs[1].lives === 1, 'bomber: H1, caught on the chained bomb, loses exactly 1 of 2 lives');
    });
    const end = await pumpD(bmDrv, 250, (s) => s.phase === 'results', 'bomber ends at the cap', 500);
    assert(end.lastGame.id === 'dat-bom', 'bomber: the match ends at the 75s cap and banks placements');
  }
  // --- Đặt Bom B: max 1 bomb per player + hard blocks stop the cross --
  {
    const hbDrv = await newDrv();
    const hb1 = await hbDrv.join('Mot');
    await hbDrv.join('Hai');
    await withRandomQueue(new Array(67).fill(0.99), async () => {
      await hbDrv.act({ action: 'startGame', game: 'dat-bom' });
      let hv = await pumpD(hbDrv, 250, (s) => s.game && s.game.phase === 'bomber', 'bomber B begins');
      assert(hv.game.soft.length === 0 && hv.game.hard.length === 20, 'bomber B: the queued layout deals no soft blocks');
      await driveSeat(hbDrv, hb1.playerToken, 1, () => ({ x: -6, y: -8 }));
      hv = await driveSeat(hbDrv, hb1.playerToken, 1, () => ({ x: -6, y: -6 }));
      hv = await padTicks(hbDrv, hb1.playerToken, { a: true }, 1);
      await hbDrv.pAct(hb1.playerToken, { action: 'pad', pad: {} });
      assert(hv.game.bombs.length === 1, 'bomber B: bomb planted at (2,1)');
      hv = await padTicks(hbDrv, hb1.playerToken, { a: true }, 1);
      await hbDrv.pAct(hb1.playerToken, { action: 'pad', pad: {} });
      assert(hv.game.bombs.length === 1, 'bomber B: one live bomb per player — a second press changes nothing');
      let blast = null;
      for (let i = 0; i < 14 && !blast; i++) {
        hv = await hbDrv.state();
        if (hv.game.blasts && hv.game.blasts.length) blast = hv.game.blasts[hv.game.blasts.length - 1];
        else { await hbDrv.pAct(hb1.playerToken, { action: 'pad', pad: { d: true, r: true } }); tick(250); }
      }
      assert(!!blast, 'bomber B: the blast was rendered for the TV');
      const keys = blast.cells.map(([c, r]) => c + ',' + r).sort().join(' ');
      assert(keys === '2,0 2,1 2,2 2,3',
        'bomber B: blast cross is exactly the bomb column — hard pillars at (1,1) and (3,1) cut both side arms, got ' + keys);
    });
  }

  // --- Kẻ Giả Mạo: <3 seats rejected, then a full scripted match -----
  // beginRound draws exactly twice per round in a bot-free room:
  // the impostor pick, then the pair pick. Queue: r1 seat2 + pair 0
  // (Pháp/Ý), r2 seat3 + pair 1, r3 seat1 + pair 2.
  {
    const rjDrv = await newDrv();
    await rjDrv.join('Mot');
    await rjDrv.join('Hai');
    const rj = await rjDrv.act({ action: 'startGame', game: 'ke-gia-mao' });
    assert(rj.ok === false && rj.error && rj.error.indexOf('ít nhất 3') >= 0,
      'impostor: starting with only 2 seats is rejected with a clear error, got ' + JSON.stringify(rj));
  }
  const imDrv = await newDrv();
  const im1 = await imDrv.join('Mot');
  const im2 = await imDrv.join('Hai');
  const im3 = await imDrv.join('Ba');
  await withRandomQueue([0.34, 0.0, 0.67, 0.0, 0.0, 0.0], async () => {
    await imDrv.act({ action: 'startGame', game: 'ke-gia-mao' });
    let iv = await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'answer' && s.game.round === 1, 'impostor r1 answer');
    // PRIVACY, asserted by string search over the serialized views.
    const hostJSON = JSON.stringify(iv);
    assert(hostJSON.indexOf('Thủ đô của nước Pháp') === -1 && hostJSON.indexOf('Thủ đô của nước Ý') === -1,
      'impostor privacy: the HOST view contains neither question text');
    const p1v = await imDrv.pState(im1.playerToken);
    const p2v = await imDrv.pState(im2.playerToken);
    const p3v = await imDrv.pState(im3.playerToken);
    assert(p1v.game.myQuestion === IMPOSTOR_BANK[0].real && JSON.stringify(p1v).indexOf('Thủ đô của nước Ý') === -1,
      'impostor privacy: H1 sees only the REAL question');
    assert(p2v.game.myQuestion === IMPOSTOR_BANK[0].fake && JSON.stringify(p2v).indexOf('Thủ đô của nước Pháp') === -1,
      'impostor privacy: H2 (the impostor) sees only the VARIANT question');
    assert(p3v.game.myQuestion === IMPOSTOR_BANK[0].real, 'impostor privacy: H3 sees the real question');
    assert(p1v.game.options.join('|') === IMPOSTOR_BANK[0].options.join('|'), 'impostor: the 4 options are shared by both questions');
    await imDrv.pAct(im1.playerToken, { action: 'answer', choice: 0 });
    const p3b = await imDrv.pState(im3.playerToken);
    assert(p3b.game.answered[1] === true && p3b.game.mine === null,
      'impostor privacy: H3 sees THAT H1 answered, never WHAT H1 answered');
    await imDrv.pAct(im2.playerToken, { action: 'answer', choice: 1 });
    await imDrv.pAct(im3.playerToken, { action: 'answer', choice: 0 });
    iv = await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'discuss' && s.game.round === 1, 'impostor r1 discuss');
    await imDrv.pAct(im1.playerToken, { action: 'chat', text: 'Tôi chắc chắn đáp án của mình!' });
    await imDrv.pAct(im2.playerToken, { action: 'chat', text: 'Tui cũng chắc lắm luôn.' });
    iv = await imDrv.state();
    assert(iv.game.chatLog && iv.game.chatLog.length === 2 && iv.game.chatLog[0].seat === 1,
      'impostor: discussion chat is public — every player may post, the TV shows the log');
    const hostJSON2 = JSON.stringify(iv);
    assert(hostJSON2.indexOf('Thủ đô của nước Pháp') === -1 && hostJSON2.indexOf('Thủ đô của nước Ý') === -1,
      'impostor privacy: still no question text on the host during discussion');
    tick(45000);
    iv = await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'vote' && s.game.round === 1, 'impostor r1 vote');
    const selfVote = await imDrv.pAct(im1.playerToken, { action: 'vote', seat: 1 });
    assert(selfVote.ok === false, 'impostor: accusing yourself is rejected');
    await imDrv.pAct(im1.playerToken, { action: 'vote', seat: 2 });
    await imDrv.pAct(im3.playerToken, { action: 'vote', seat: 2 });
    await imDrv.pAct(im2.playerToken, { action: 'vote', seat: 1 });
    iv = await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 1, 'impostor r1 reveal');
    assert(iv.game.reveal.caught === true && iv.game.reveal.impostor === 2,
      'impostor r1: the 2-vote plurality names the impostor — caught');
    assert(iv.game.reveal.points[1] === 150 && iv.game.reveal.points[2] === 0 && iv.game.reveal.points[3] === 150,
      'impostor r1: catching pays every non-impostor +150, the impostor +0');
    assert(JSON.stringify(iv).indexOf('Thủ đô của nước Pháp') >= 0 && JSON.stringify(iv).indexOf('Thủ đô của nước Ý') >= 0,
      'impostor: the reveal finally shows BOTH questions side by side');
    // Round 2: impostor is seat 3; the vote plurality lands on seat 1.
    iv = await pumpD(imDrv, 500, (s) => s.game && s.game.phase === 'answer' && s.game.round === 2, 'impostor r2 answer');
    const r2v = await imDrv.pState(im3.playerToken);
    assert(r2v.game.myQuestion === IMPOSTOR_BANK[1].fake, 'impostor r2: seat 3 holds the variant (Thiên văn)');
    await imDrv.pAct(im1.playerToken, { action: 'answer', choice: 0 });
    await imDrv.pAct(im2.playerToken, { action: 'answer', choice: 0 });
    await imDrv.pAct(im3.playerToken, { action: 'answer', choice: 0 });
    await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'discuss' && s.game.round === 2, 'impostor r2 discuss');
    tick(45000);
    await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'vote' && s.game.round === 2, 'impostor r2 vote');
    await imDrv.pAct(im1.playerToken, { action: 'vote', seat: 2 });
    await imDrv.pAct(im2.playerToken, { action: 'vote', seat: 1 });
    await imDrv.pAct(im3.playerToken, { action: 'vote', seat: 1 });
    iv = await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 2, 'impostor r2 reveal');
    assert(iv.game.reveal.caught === false && iv.game.reveal.impostor === 3 && iv.game.reveal.points[3] === 300,
      'impostor r2: a wrong plurality lets the impostor escape with +300');
    assert(iv.game.points[1] === 150 && iv.game.points[2] === 0 && iv.game.points[3] === 450,
      'impostor: match totals after r2 are 150 / 0 / 450, got ' + JSON.stringify(iv.game.points));
    // Round 3 (final): impostor is seat 1 and escapes again — doubled.
    iv = await pumpD(imDrv, 500, (s) => s.game && s.game.phase === 'answer' && s.game.round === 3, 'impostor r3 answer');
    await imDrv.pAct(im1.playerToken, { action: 'answer', choice: 0 });
    await imDrv.pAct(im2.playerToken, { action: 'answer', choice: 0 });
    await imDrv.pAct(im3.playerToken, { action: 'answer', choice: 0 });
    await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'discuss' && s.game.round === 3, 'impostor r3 discuss');
    tick(45000);
    await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'vote' && s.game.round === 3, 'impostor r3 vote');
    await imDrv.pAct(im1.playerToken, { action: 'vote', seat: 2 });
    await imDrv.pAct(im2.playerToken, { action: 'vote', seat: 3 });
    await imDrv.pAct(im3.playerToken, { action: 'vote', seat: 2 });
    iv = await pumpD(imDrv, 250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 3, 'impostor r3 reveal');
    assert(iv.game.reveal.caught === false && iv.game.reveal.points[1] === 600,
      'impostor r3: the final-round escape pays the impostor 600 (300 x2)');
    iv = await pumpD(imDrv, 500, (s) => s.phase === 'results', 'impostor results');
    assert(iv.lastGame.points[1] === 750 && iv.lastGame.points[2] === 0 && iv.lastGame.points[3] === 450,
      'impostor: hand-computed match totals are 750 / 0 / 450, got ' + JSON.stringify(iv.lastGame.points));
  });
  // Bot table-mates: a bot answers, chats and votes from its plans and
  // the round still resolves by the same scoring rule.
  {
    const ibDrv = await newDrv();
    const ib1 = await ibDrv.join('Mot');
    const ib2 = await ibDrv.join('Hai');
    await ibDrv.act({ action: 'addBot', seat: 3 });
    await ibDrv.act({ action: 'startGame', game: 'ke-gia-mao' });
    await pumpD(ibDrv, 250, (s) => s.game && s.game.phase === 'answer' && s.game.round === 1, 'impostor bot r1 answer');
    await ibDrv.pAct(ib1.playerToken, { action: 'answer', choice: 0 });
    await ibDrv.pAct(ib2.playerToken, { action: 'answer', choice: 0 });
    await pumpD(ibDrv, 500, (s) => s.game && s.game.phase === 'discuss' && s.game.round === 1, 'impostor bot r1 discuss', 200);
    tick(45000);
    await pumpD(ibDrv, 250, (s) => s.game && s.game.phase === 'vote' && s.game.round === 1, 'impostor bot r1 vote');
    await ibDrv.pAct(ib1.playerToken, { action: 'vote', seat: 3 });
    await ibDrv.pAct(ib2.playerToken, { action: 'vote', seat: 3 });
    const ibv = await pumpD(ibDrv, 250, (s) => s.game && s.game.phase === 'reveal' && s.game.round === 1, 'impostor bot r1 reveal');
    const rv = ibv.game.reveal;
    const ruleOk = [1, 2, 3].every((seat) => rv.points[seat] === (rv.caught ? (seat === rv.impostor ? 0 : 150) : (seat === rv.impostor ? 300 : 0)));
    assert(ruleOk, 'impostor with a bot: the reveal pays exactly by the caught/escaped rule, got ' + JSON.stringify(rv.points));
  }

  // --- Thủ Thành: scripted kill / crystal falls / survival tier -------
  {
    const dfDrv = await newDrv();
    const df1 = await dfDrv.join('Mot');
    await dfDrv.join('Hai');
    await withRandomQueue([0.0], async () => {
      await dfDrv.act({ action: 'startGame', game: 'thu-thanh' });
      let dv = await pumpD(dfDrv, 250, (s) => s.game && s.game.phase === 'defend', 'defend begins');
      assert(dv.game.crystal.hp === 10 && dv.game.kills === 0, 'defend: the crystal starts at 10 HP, no kills');
      dv = await padTicks(dfDrv, df1.playerToken, { r: true }, 1);
      await dfDrv.pAct(df1.playerToken, { action: 'pad', pad: {} });
      dv = await pumpD(dfDrv, 250, (s) => s.game.slimes && s.game.slimes.length > 0, 'first slime spawns', 30);
      assert(Math.abs(dv.game.slimes[0].y) <= 0.01 && dv.game.slimes[0].x > 9,
        'defend: the forced spawn walks the +x axis toward the crystal, got ' + JSON.stringify(dv.game.slimes[0]));
      dv = await padTicks(dfDrv, df1.playerToken, { a: true }, 1);
      await dfDrv.pAct(df1.playerToken, { action: 'pad', pad: {} });
      dv = await pumpD(dfDrv, 250, (s) => s.game.kills === 1, 'first slime shot down', 30);
      assert(dv.game.crystal.hp === 10, 'defend: the crystal is untouched after the scripted kill');
    });
  }
  {
    const dxDrv = await newDrv();
    await dxDrv.join('Mot');
    await dxDrv.join('Hai');
    await withRandomQueue(new Array(500).fill(0), async () => {
      await dxDrv.act({ action: 'startGame', game: 'thu-thanh' });
      const xv = await pumpD(dxDrv, 250, (s) => s.phase === 'results', 'crystal falls', 600);
      const tr = xv.lastGame.teamResult;
      assert(tr && tr.tier === 'none' && tr.pointsEach === 50 && tr.score === 0,
        'defend: an undefended crystal falls — participation tier, +50 each, got ' + JSON.stringify(tr));
      assert(xv.lastGame.points[1] === 50 && xv.lastGame.points[2] === 50, 'defend: destruction pays everyone the same 50');
    });
  }
  {
    const swDrv = await newDrv();
    const sw1 = await swDrv.join('Mot');
    const sw2 = await swDrv.join('Hai');
    await withRandomQueue(new Array(500).fill(0), async () => {
      await swDrv.act({ action: 'startGame', game: 'thu-thanh' });
      let wv = await pumpD(swDrv, 250, (s) => s.game && s.game.phase === 'defend', 'defend survival begins');
      // Both defenders hold the +x lane (every queued spawn walks it):
      // H1 steps right once to aim outward; H2 crosses to the same lane.
      await padTicks(swDrv, sw1.playerToken, { r: true }, 1);
      await swDrv.pAct(sw1.playerToken, { action: 'pad', pad: {} });
      await driveSeat(swDrv, sw2.playerToken, 2, () => ({ x: 6.5, y: 0 }), { tol: 0.9 });
      for (let i = 0; i < 400; i++) {
        wv = await swDrv.state();
        if (wv.phase === 'results' || !wv.game) break;
        const slimes = wv.game.slimes || [];
        for (const [tok, seat] of [[sw1.playerToken, 1], [sw2.playerToken, 2]]) {
          const me = wv.game.blobs[seat];
          const threat = slimes.some((s) => s.x > me.x + 0.5 && Math.abs(s.y - me.y) < 1.0);
          await swDrv.pAct(tok, { action: 'pad', pad: threat ? { a: i % 2 === 0 } : {} });
        }
        tick(250);
      }
      wv = await swDrv.state();
      const tr = wv.lastGame && wv.lastGame.teamResult;
      assert(tr && tr.tier === 'vang' && tr.pointsEach === 300,
        'defend: a held lane keeps the crystal at >=7 HP to the whistle — Vàng, +300 each, got ' + JSON.stringify(tr));
      assert(tr.score >= 8, 'defend: the team destroyed at least 8 slimes, got ' + tr.score);
    });
  }

  // --- Giải Mã Chung: privacy, right/wrong presses, levels, tiers -----
  // Level generation draws: the round-robin start seat, then one draw
  // per step symbol. Queue: L1 start seat1 + [ĐỎ, XANH, VÀNG];
  // L2 start seat2 + [ĐỎ, XANH, VÀNG, HỒNG].
  {
    const dcDrv = await newDrv();
    const dc1 = await dcDrv.join('Mot');
    const dc2 = await dcDrv.join('Hai');
    await withRandomQueue([0.0, 0.0, 0.3, 0.6, 0.5, 0.0, 0.3, 0.6, 0.9], async () => {
      await dcDrv.act({ action: 'startGame', game: 'giai-ma-chung' });
      let gv = await pumpD(dcDrv, 250, (s) => s.game && s.game.phase === 'decode', 'decode begins');
      assert(gv.game.level === 1 && gv.game.total === 3 && gv.game.hearts === 3,
        'decode: level 1 deals 3 steps; the team holds 3 hearts');
      assert(!/ĐỎ|XANH|VÀNG|HỒNG/.test(JSON.stringify(gv)),
        'decode privacy: the HOST view contains no step symbols at all');
      const p1v = await dcDrv.pState(dc1.playerToken);
      const p2v = await dcDrv.pState(dc2.playerToken);
      assert(JSON.stringify(p1v.game.mySteps) === JSON.stringify([{ pos: 1, sym: 0, name: 'ĐỎ' }, { pos: 3, sym: 2, name: 'VÀNG' }]),
        'decode: H1 holds steps 1 (ĐỎ) and 3 (VÀNG), got ' + JSON.stringify(p1v.game.mySteps));
      assert(JSON.stringify(p2v.game.mySteps) === JSON.stringify([{ pos: 2, sym: 1, name: 'XANH' }]),
        'decode: H2 holds step 2 (XANH)');
      assert(JSON.stringify(p1v).indexOf('XANH') === -1, 'decode privacy: H1 cannot see H2\'s symbol anywhere in their view');
      assert(JSON.stringify(p2v).indexOf('ĐỎ') === -1 && JSON.stringify(p2v).indexOf('VÀNG') === -1,
        'decode privacy: H2 cannot see either of H1\'s symbols');
      await dcDrv.pAct(dc2.playerToken, { action: 'symbol', sym: 0 });
      gv = await dcDrv.state();
      assert(gv.game.hearts === 2 && gv.game.done === 0,
        'decode: an out-of-turn press costs the team 1 heart and the step stays');
      await dcDrv.pAct(dc1.playerToken, { action: 'symbol', sym: 0 });
      gv = await dcDrv.state();
      assert(gv.game.done === 1 && gv.game.hearts === 2,
        'decode: the owner pressing their own symbol advances the sequence');
      await dcDrv.pAct(dc1.playerToken, { action: 'symbol', sym: 1 });
      gv = await dcDrv.state();
      assert(gv.game.hearts === 1 && gv.game.done === 1,
        'decode: the right symbol from the WRONG owner still costs a heart');
      await dcDrv.pAct(dc2.playerToken, { action: 'symbol', sym: 1 });
      await dcDrv.pAct(dc1.playerToken, { action: 'symbol', sym: 2 });
      gv = await dcDrv.state();
      assert(gv.game.phase === 'levelup' && gv.game.levelsDone === 1, 'decode: the last correct press completes the level');
      gv = await pumpD(dcDrv, 250, (s) => s.game && s.game.phase === 'decode' && s.game.level === 2, 'decode level 2', 40);
      assert(gv.game.total === 4 && gv.game.hearts === 1,
        'decode: level 2 deals 4 steps and hearts carry over (no refill)');
    });
  }
  {
    const dhDrv = await newDrv();
    const dh1 = await dhDrv.join('Mot');
    const dh2 = await dhDrv.join('Hai');
    await withRandomQueue([0.0, 0.0, 0.0, 0.0], async () => {
      await dhDrv.act({ action: 'startGame', game: 'giai-ma-chung' });
      let hv2 = await pumpD(dhDrv, 250, (s) => s.game && s.game.phase === 'decode', 'decode hearts begins');
      // Steps are [{1,ĐỎ},{2,ĐỎ},{1,ĐỎ}]: three wrong presses end it.
      await dhDrv.pAct(dh2.playerToken, { action: 'symbol', sym: 1 });
      await dhDrv.pAct(dh1.playerToken, { action: 'symbol', sym: 1 });
      hv2 = await dhDrv.state();
      assert(hv2.game.hearts === 1, 'decode: two wrong presses leave exactly 1 heart');
      await dhDrv.pAct(dh2.playerToken, { action: 'symbol', sym: 2 });
      hv2 = await dhDrv.state();
      const tr = hv2.lastGame && hv2.lastGame.teamResult;
      assert(hv2.phase === 'results' && tr && tr.score === 0 && tr.tier === 'none' && tr.pointsEach === 50,
        'decode: hearts out ends the game at once — 0 levels, +50 each, got ' + JSON.stringify(tr));
    });
  }
  {
    const dsDrv = await newDrv();
    const ds1 = await dsDrv.join('Mot');
    const ds2 = await dsDrv.join('Hai');
    await withRandomQueue(new Array(300).fill(0.37), async () => {
      await dsDrv.act({ action: 'startGame', game: 'giai-ma-chung' });
      let sv3 = await pumpD(dsDrv, 250, (s) => s.game && s.game.phase === 'decode', 'decode solver begins');
      const toks = { 1: ds1.playerToken, 2: ds2.playerToken };
      // Solve levels using only what each phone legitimately shows:
      // whoever's own-steps list holds the current position presses it.
      for (let guard = 0; guard < 60 && !(sv3.game && sv3.game.levelsDone >= 3); guard++) {
        sv3 = await dsDrv.state();
        if (!sv3.game) break;
        if (sv3.game.phase === 'levelup') { tick(1600); continue; }
        if (sv3.game.phase !== 'decode') break;
        const done = sv3.game.done;
        let pressed = false;
        for (const seat of [1, 2]) {
          const pv = await dsDrv.pState(toks[seat]);
          const mine = (pv.game.mySteps || []).find((s) => s.pos === done + 1);
          if (mine) { await dsDrv.pAct(toks[seat], { action: 'symbol', sym: mine.sym }); pressed = true; break; }
        }
        if (!pressed) throw new Error('decode solver: nobody owns step ' + (done + 1));
      }
      sv3 = await dsDrv.state();
      assert(sv3.game && sv3.game.levelsDone === 3 && sv3.game.hearts === 3,
        'decode: the solver completes 3 levels without losing a heart');
      tick(80000);
      sv3 = await dsDrv.state();
      const tr = sv3.lastGame && sv3.lastGame.teamResult;
      assert(tr && tr.score === 3 && tr.tier === 'dong' && tr.pointsEach === 100,
        'decode: 3 levels at time out = Đồng, +100 each, got ' + JSON.stringify(tr));
    });
  }

  // =====================================================================
  // Audit L: gamepad state held through the 3-2-1 countdown survives
  // round setup. Both real clients (web phone, Android APK) send pad
  // state ONLY when it changes, so when setup wiped g.pad, a player
  // already holding a direction (or A/B) as the round opened stood
  // frozen until they re-touched. Setup now preserves g.pad (pruned to
  // the seats at the table) and clears padPrev, so a held button also
  // reads as a fresh rising edge on tick 1. Expectations are computed
  // from the engine constants: spawn ring 5.5 (seat 1 at (5.5,0), seat
  // 2 at (-5.5,0)), MOVE_STEP 0.5/tick, dash = 3 steps.
  console.log('Audit L: countdown-held gamepad input survives round setup');
  {
    // Xe Tăng: RIGHT + A grabbed during the countdown, never re-sent.
    const cdDrv = await newDrv();
    const cd1 = await cdDrv.join('Mot');
    await cdDrv.join('Hai');
    const cdStart = await cdDrv.act({ action: 'startGame', game: 'xe-tank' });
    assert(cdStart.game && cdStart.game.phase === 'countdown', 'countdown-hold tank: game opens with the 3-2-1 countdown');
    await cdDrv.pAct(cd1.playerToken, { action: 'pad', pad: { r: true, a: true } });
    let cv = await pumpD(cdDrv, 250, (s) => s.game && s.game.phase === 'tank', 'countdown-hold tank begins');
    assert(cv.game.blobs[1].x === 5.5 && cv.game.blobs[1].y === 0, 'countdown-hold tank: seat 1 spawns at (5.5,0)');
    tick(250); cv = await cdDrv.state(); // exactly one sim tick
    assert(cv.game.blobs[1].x === 6, 'countdown-hold tank: the direction held since the countdown moves the tank on tick 1 (x=' + cv.game.blobs[1].x + ')');
    assert(cv.game.facing[1].x === 1 && cv.game.facing[1].y === 0, 'countdown-hold tank: facing follows the preserved direction');
    assert(cv.game.shells.length === 1, 'countdown-hold tank: the A held since the countdown fires exactly one shell on tick 1');
    assert(cv.game.blobs[2].x === -5.5, 'countdown-hold tank: the idle tank has not moved');
    tick(250); cv = await cdDrv.state(); tick(250); cv = await cdDrv.state(); // ticks 2-3, pad still merely held, never re-sent
    assert(cv.game.blobs[1].x === 7, 'countdown-hold tank: the held direction keeps moving the tank (x=' + cv.game.blobs[1].x + ' after 3 ticks)');
    assert(cv.game.shells.length === 1, 'countdown-hold tank: merely holding A does not re-fire — the rising edge was consumed once');
    await cdDrv.pAct(cd1.playerToken, { action: 'pad', pad: {} });
  }
  {
    // Đẩy Ra Khỏi Sàn: LEFT + B grabbed during the countdown. Dash is
    // a B rising edge; padPrev was cleared at setup, so tick 1 dashes
    // (3 × 0.5 = 1.5) from 5.5 to exactly 4.0. Continuing to hold B
    // must not dash again — ticks 2-3 walk at normal speed to 3.0.
    const ddDrv = await newDrv();
    const dd1 = await ddDrv.join('Mot');
    await ddDrv.join('Hai');
    const ddStart = await ddDrv.act({ action: 'startGame', game: 'day-ra' });
    assert(ddStart.game && ddStart.game.phase === 'countdown', 'countdown-hold arena: game opens with the 3-2-1 countdown');
    await ddDrv.pAct(dd1.playerToken, { action: 'pad', pad: { l: true, b: true } });
    let dv = await pumpD(ddDrv, 250, (s) => s.game && s.game.phase === 'arena', 'countdown-hold arena begins');
    assert(dv.game.blobs[1].x === 5.5 && dv.game.blobs[1].y === 0, 'countdown-hold arena: seat 1 spawns at (5.5,0)');
    tick(250); dv = await ddDrv.state(); // exactly one sim tick
    assert(dv.game.blobs[1].x === 4, 'countdown-hold arena: held LEFT+B dashes on tick 1 (x=' + dv.game.blobs[1].x + ', dash = 3 steps of 0.5)');
    tick(250); dv = await ddDrv.state(); tick(250); dv = await ddDrv.state(); // ticks 2-3, B still merely held
    assert(dv.game.blobs[1].x === 3, 'countdown-hold arena: still holding B does not re-dash — ticks 2-3 walk at normal speed (x=' + dv.game.blobs[1].x + ')');
    await ddDrv.pAct(dd1.playerToken, { action: 'pad', pad: {} });
  }
  {
    // Kéo Co counts presses inside the pad action handler, on the
    // rising edge of B against the stored pad, and only during 'pull'.
    // A B grabbed during the countdown is stored (and now preserved
    // into the round) but fabricates no press: the counter moves only
    // when a real pad action lands during the pull. Pin that exactly.
    const tgDrv = await newDrv();
    const tg1 = await tgDrv.join('Mot');
    await tgDrv.join('Hai');
    const tgStart = await tgDrv.act({ action: 'startGame', game: 'keo-co' });
    assert(tgStart.game && tgStart.game.phase === 'countdown', 'countdown-hold tug: game opens with the 3-2-1 countdown');
    await tgDrv.pAct(tg1.playerToken, { action: 'pad', pad: { b: true } }); // grabbed during the countdown
    const gv0 = await pumpD(tgDrv, 250, (s) => s.game && s.game.phase === 'pull', 'countdown-hold tug begins');
    assert(gv0.game.presses[tg1.seat] === 0, 'countdown-hold tug: a B held since the countdown fabricates no press');
    await tgDrv.pAct(tg1.playerToken, { action: 'pad', pad: {} }); // release
    await tgDrv.pAct(tg1.playerToken, { action: 'pad', pad: { b: true } }); // one genuine press
    const gv1 = await tgDrv.state();
    assert(gv1.game.presses[tg1.seat] === 1, 'countdown-hold tug: release + a real press during the pull counts exactly 1');
    await tgDrv.pAct(tg1.playerToken, { action: 'pad', pad: {} });
  }

  // --- Storage routing: with ROOMS_DO bound, everything above must have
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
