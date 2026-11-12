// Local test for the Nảy Party Cloudflare worker.
// - Stubs the ROOMS KV namespace in memory.
// - Uses a fake clock (Date.now patched) so timed phases run instantly.
// - Plays a full match: lobby/bots -> Đố Vui (streak + ×2 verified exactly)
//   -> Đoán Số (×2 verified) -> Nhớ Màu (×2 verified) -> Đua Bấm Nút (+ replay)
//   -> Nhanh Tay (ms gaps) -> Đẩy Ra Khỏi Sàn (gamepad held-state arena)
//   -> podium/final, and checks cumulative totals == sum of per-game points.
// Run: node tests/local-test.mjs
import worker, { QUIZ_BANK, EST_BANK } from '../worker.mjs';

let now = 1700000000000;
Date.now = () => now;
function tick(ms) { now += ms; }

class KVStub {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async put(k, v) { this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
}
const env = { ROOMS: new KVStub() };
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

async function main() {
  console.log('== Nảy Party — local worker test ==');
  const home = await call('GET', '/');
  assert(home.status === 200 && home.text.indexOf('Nảy Party') >= 0, 'GET / serves the game page');
  assert(home.text.indexOf('Nhanh Tay') >= 0 && home.text.indexOf('Đẩy Ra Khỏi Sàn') >= 0, 'page lists all games incl. the arena');

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

  console.log('\nALL TESTS PASSED — ' + passed + ' assertions');
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
