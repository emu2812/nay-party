// Deep-drive for Nảy Party — the parent's per-game deep-test protocol:
//   PART B  countdown-view sweep for all 25 games (the historical crash
//           family: a gameView that throws while phase === 'countdown'
//           500s every state fetch for 3 seconds — hit ke-gia-mao and
//           ma-soi in production).
//   PART C  full-match matrix: every game driven lobby -> results at
//           MIN seats and at MAX seats (bots fill; phones driven with
//           simple legal inputs where a game needs them).
//   PART D  mode flows: playlist chain, mid-game quit, replay +
//           podium + finish, local-seat-only room, phone-mode room.
//   PART E  secrecy string audits for the 4 secret games.
// Unlike local-test.mjs, checks here COLLECT failures instead of
// throwing at the first one, so a single run maps the whole surface;
// the process exits 1 if anything failed.
// Run: node tests/deep-drive.mjs
import worker, { QUIZ_BANK, RoomStore, TL, GAMES } from '../worker.mjs';

let now = 1700000000000;
Date.now = () => now;
function tick(ms) { now += ms; }

class KVStub {
  constructor() { this.m = new Map(); this.getCount = 0; this.putCount = 0; }
  async get(k) { this.getCount += 1; return this.m.has(k) ? this.m.get(k) : null; }
  async put(k, v) { this.putCount += 1; this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
}
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
const failures = [];
function check(cond, label) {
  if (!cond) { failures.push(label); console.log('  FAIL -', label); return false; }
  passed += 1; console.log('  ok -', label); return true;
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
function driver(code, host) {
  return {
    code, host,
    state: async () => (await call('GET', '/api/rooms/' + code + '/state?role=host&token=' + host)).data,
    stateRaw: async () => call('GET', '/api/rooms/' + code + '/state?role=host&token=' + host),
    act: async (b) => (await call('POST', '/api/rooms/' + code + '/action', Object.assign({ role: 'host', token: host }, b))).data,
    join: async (name) => (await call('POST', '/api/rooms/' + code + '/join', { name })).data,
    pState: async (tok) => (await call('GET', '/api/rooms/' + code + '/state?role=player&token=' + tok)).data,
    pStateRaw: async (tok) => call('GET', '/api/rooms/' + code + '/state?role=player&token=' + tok),
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
// Build a room: `phones` phone joins first (seats 1..phones), then an
// optional local keyboard seat, then bots fill up to `seats`.
async function buildRoom(seats, phones, local) {
  const drv = await newDrv();
  const toks = [];
  for (let i = 0; i < phones; i++) {
    const j = await drv.join('DT' + (i + 1));
    if (!j || !j.playerToken) throw new Error('join failed in buildRoom');
    toks.push(j.playerToken);
  }
  let localSeat = null;
  if (local) {
    localSeat = toks.length + 1;
    const r = await drv.act({ action: 'addLocal', seat: localSeat });
    if (!r || r.ok !== true) throw new Error('addLocal failed: ' + (r && r.error));
  }
  const filled = toks.length + (local ? 1 : 0);
  for (let s = filled + 1; s <= seats; s++) {
    const r = await drv.act({ action: 'addBot', seat: s });
    if (!r || r.ok !== true) throw new Error('addBot seat ' + s + ' failed: ' + (r && r.error));
  }
  return { drv, toks, localSeat };
}

const SECRET_GAMES = ['ma-soi', 'tien-len'];
const GAME_IDS = Object.keys(GAMES);
const matrix = {}; // gameId -> {minOk, maxOk, minMs, maxMs, errors, countdown, secrecy}

// ============================ PART B =====================================
// Countdown-view sweep. No fake time passes between startGame and the
// fetches, so every view is built while the game sits in 'countdown'.
function checkCountdownView(label, res, gameId, phasesSeen) {
  check(res.status === 200, label + ': HTTP 200 (got ' + res.status + ')');
  const v = res.data;
  check(!!v && !v.error, label + ': no error' + (v && v.error ? ' (got: ' + v.error + ')' : ''));
  check(!!v && !!v.game && v.game.id === gameId, label + ': game.id === ' + gameId + ' (got ' + (v && v.game && v.game.id) + ')');
  const ph = v && v.game && v.game.phase;
  check(typeof ph === 'string' && ph.length > 0, label + ': a phase is present (got ' + ph + ')');
  if (ph) phasesSeen.add(ph);
}

async function countdownRoom(label, seats, phones, local, gameId) {
  const { drv, toks, localSeat } = await buildRoom(seats, phones, local);
  const st = await drv.act({ action: 'startGame', game: gameId });
  check(!!st && st.ok === true, label + ': startGame ok during countdown (' + (st && st.error) + ')');
  const phases = new Set();
  const host = await drv.stateRaw();
  checkCountdownView(label + ' host', host, gameId, phases);
  for (let i = 0; i < toks.length; i++) {
    const pv = await drv.pStateRaw(toks[i]);
    checkCountdownView(label + ' phone' + (i + 1), pv, gameId, phases);
  }
  if (local && host.data) {
    const keys = Object.keys(host.data.localViews || {});
    check(JSON.stringify(keys) === JSON.stringify([String(localSeat)]),
      label + ': host localViews keys are exactly the local seat during countdown (got ' + keys.join(',') + ')');
  }
  return phases;
}

async function partB() {
  console.log('\nPART B: countdown-view sweep (25 games)');
  for (const id of GAME_IDS) {
    const meta = GAMES[id];
    const secret = SECRET_GAMES.indexOf(id) >= 0;
    const f0 = failures.length;
    try {
      const ph1 = await countdownRoom('B ' + id + ' min', meta.min, secret ? 2 : 1, false, id);
      const ph2 = await countdownRoom('B ' + id + ' min+local', meta.min, 1, true, id);
      let extra = '';
      if (secret) {
        const ph3 = await countdownRoom('B ' + id + ' max', meta.max, 2, false, id);
        extra = ', max phases: ' + Array.from(ph3).join('/');
      }
      matrix[id].countdown = failures.length === f0 ? 'OK' : 'FAIL';
      console.log('  [' + id + '] countdown phases seen min: ' + Array.from(ph1).join('/')
        + ' | local: ' + Array.from(ph2).join('/') + extra);
    } catch (e) {
      matrix[id].countdown = 'FAIL';
      check(false, 'B ' + id + ': sweep threw: ' + e.message);
    }
  }
}

// ============================ PART C =====================================
// Full-match matrix. Most games complete with an idle phone (bots +
// phase timers carry them); ca-ngua and tien-len are driven actively
// with simple legal inputs; ech-op gets a held rightward pad so the
// frogs keep moving (hearts/timer end the run regardless).
function tlCandidates(hand) {
  const byRank = {};
  hand.forEach((c) => { const r = c % 13; (byRank[r] = byRank[r] || []).push(c); });
  const cands = [];
  Object.values(byRank).forEach((grp) => {
    for (let k = 1; k <= grp.length; k++) cands.push(grp.slice(0, k));
  });
  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    for (let j = i + 2; j < ranks.length && ranks[j] <= 11 && ranks[j] - ranks[i] === j - i; j++) {
      const win = ranks.slice(i, j + 1);
      cands.push(win.map((r) => byRank[r][0]));
      if (win.every((r) => byRank[r].length >= 2)) cands.push(win.flatMap((r) => byRank[r].slice(0, 2)));
    }
  }
  return cands.filter((c) => TL.comboOf(c));
}
async function tlDriveStep(drv, tok) {
  const hv = await drv.pState(tok);
  if (!hv || !hv.game || hv.game.phase !== 'cards' || !hv.game.myTurn) return;
  const hand = hv.game.myHand || [];
  if (!hand.length) return;
  const cands = tlCandidates(hand);
  if (!cands.length) return;
  if (!hv.game.table) {
    let pool = cands;
    if (hv.game.mustInclude3) pool = cands.filter((c) => c.indexOf(0) >= 0);
    if (!pool.length) pool = cands;
    pool = pool.slice().sort((a, b) => (b.length - a.length) || (TL.comboOf(a).top - TL.comboOf(b).top));
    await drv.pAct(tok, { action: 'play', cards: pool[0] });
    return;
  }
  const tableCombo = TL.comboOf(hv.game.table.cards);
  const beaters = cands.filter((c) => TL.beats(TL.comboOf(c), tableCombo));
  if (!beaters.length) { await drv.pAct(tok, { action: 'pass' }); return; }
  beaters.sort((a, b) => TL.comboOf(a).top - TL.comboOf(b).top);
  await drv.pAct(tok, { action: 'play', cards: beaters[0] });
}
async function nguaDriveStep(drv, tok) {
  const hv = await drv.pState(tok);
  if (!hv || !hv.game || !hv.game.myTurn) return;
  if (hv.game.phase === 'roll') { await drv.pAct(tok, { action: 'roll' }); return; }
  if (hv.game.phase !== 'pick') return;
  const legal = hv.game.myLegal || [];
  if (!legal.length) return;
  const dice = hv.game.dice;
  let best = null, bestScore = -1;
  legal.forEach((e) => {
    const to = e.from === 0 ? 1 : e.from + dice;
    let score;
    if (to === 58) score = 100;
    else if (e.hint && e.hint.indexOf('ĐÁ NGỰA') >= 0) score = 90;
    else if (e.from === 0) score = 80;
    else score = 10 + to;
    if (score > bestScore) { bestScore = score; best = e.horse; }
  });
  if (best != null) await drv.pAct(tok, { action: 'move', horse: best });
}
async function chessDriveStep(drv, tok) {
  const hv = await drv.pState(tok);
  if (!hv || !hv.game || hv.game.id !== 'co-vua' || hv.game.phase !== 'chess') return;
  const legal = hv.game.myLegal || [];
  if (!legal.length) return;
  const m = legal[Math.floor(Math.random() * legal.length)];
  await drv.pAct(tok, { action: 'chessMove', from: m.from, to: m.to, promo: m.promo || 'Q' });
}
let coopCheckDone = false;
async function driveMatch(gameId, seats) {
  const meta = GAMES[gameId];
  const { drv, toks } = await buildRoom(seats, 1, false);
  const tok = toks[0];
  const st = await drv.act({ action: 'startGame', game: gameId });
  if (!st || st.ok !== true) return { ok: false, fakeMs: 0, errors: ['startGame failed: ' + (st && st.error)] };
  const t0 = now;
  const errors = [];
  const cap = gameId === 'ma-soi' ? 30000 : 24000;
  for (let i = 0; i < cap; i++) {
    if (gameId === 'ca-ngua') await nguaDriveStep(drv, tok);
    else if (gameId === 'co-vua') await chessDriveStep(drv, tok);
    else if (gameId === 'tien-len') await tlDriveStep(drv, tok);
    else if (gameId === 'ech-op' && i % 24 === 0) await drv.pAct(tok, { action: 'pad', pad: { r: true } });
    const v = await drv.state();
    if (!v || v.error) { errors.push('state error: ' + (v && v.error)); return { ok: false, fakeMs: now - t0, errors }; }
    if (v.phase === 'results') {
      if (!v.lastGame || v.lastGame.id !== gameId) {
        errors.push('results lastGame mismatch: ' + (v.lastGame && v.lastGame.id));
        return { ok: false, fakeMs: now - t0, errors };
      }
      if (gameId === 'chung-mot-than' && seats === meta.min && !coopCheckDone) {
        coopCheckDone = true;
        const tr = v.lastGame.teamResult;
        check(!!tr && typeof tr.tier === 'string' && typeof tr.pointsEach === 'number' && tr.pointsEach > 0,
          'C coop: chung-mot-than results carry the team tier banner data (teamResult '
          + JSON.stringify(tr) + ')');
      }
      return { ok: true, fakeMs: now - t0, errors };
    }
    tick(250);
  }
  return { ok: false, fakeMs: now - t0, errors: errors.concat(['drive timed out before results']) };
}

async function partC() {
  console.log('\nPART C: full-match matrix (min + max seats)');
  for (const id of GAME_IDS) {
    const meta = GAMES[id];
    for (const cfg of ['min', 'max']) {
      const seats = cfg === 'min' ? meta.min : meta.max;
      try {
        const r = await driveMatch(id, seats);
        if (cfg === 'min') { matrix[id].minOk = r.ok; matrix[id].minMs = r.fakeMs; }
        else { matrix[id].maxOk = r.ok; matrix[id].maxMs = r.fakeMs; }
        if (r.errors.length) matrix[id].errors.push(cfg + ': ' + r.errors.join(' | '));
        check(r.ok, 'C ' + id + ' @' + cfg + ' (' + seats + ' seats): match reaches results'
          + (r.ok ? ' in ' + Math.round(r.fakeMs / 1000) + 's fake' : ' — ' + r.errors.join(' | ')));
      } catch (e) {
        if (cfg === 'min') matrix[id].minOk = false; else matrix[id].maxOk = false;
        matrix[id].errors.push(cfg + ': threw ' + e.message);
        check(false, 'C ' + id + ' @' + cfg + ': drive threw: ' + e.message);
      }
    }
  }
}
// ============================ PART D =====================================
async function pumpToPhase(drv, pred, label, maxIter) {
  return pumpD(drv, 125, (s) => s.game && pred(s.game), label, maxIter || 400);
}

async function partD() {
  console.log('\nPART D: mode flows');
  // (1) Playlist: 3-game chain auto-advances to the final results.
  try {
    const { drv } = await buildRoom(2, 1, false);
    const queue = ['day-ra', 'cuop-sao', 'xe-tank'];
    const ps = await drv.act({ action: 'playlistStart', games: queue });
    check(!!ps && ps.ok === true, 'D1 playlist: playlistStart accepted (' + (ps && ps.error) + ')');
    const seenGames = [];
    const seenPos = new Set();
    let finalView = null;
    for (let i = 0; i < 6000; i++) {
      const v = await drv.state();
      if (v.error) { check(false, 'D1 playlist: state error mid-chain: ' + v.error); break; }
      if (v.game && seenGames[seenGames.length - 1] !== v.game.id) seenGames.push(v.game.id);
      if (v.playlist && v.playlist.active) seenPos.add(v.playlist.pos);
      if (v.phase === 'results' && (!v.playlist || !v.playlist.active) && seenGames.length >= 3) { finalView = v; break; }
      tick(250);
    }
    check(JSON.stringify(seenGames) === JSON.stringify(queue),
      'D1 playlist: the chain played all 3 games in queue order (saw ' + seenGames.join(', ') + ')');
    check(seenPos.has(1) && seenPos.has(2) && seenPos.has(3),
      'D1 playlist: playlist position advanced 1 -> 2 -> 3 (saw ' + Array.from(seenPos).sort().join(',') + ')');
    check(!!finalView && finalView.phase === 'results' && !!finalView.lastGame,
      'D1 playlist: the chain settles at the final game results');
  } catch (e) { check(false, 'D1 playlist threw: ' + e.message); }

  // (2) quitToChoosing mid-game banks no points (day-ra + tien-len).
  for (const gid of ['day-ra', 'tien-len']) {
    try {
      const { drv } = await buildRoom(2, 1, false);
      const before = await drv.state();
      const scoresBefore = JSON.stringify(before.players.map((p) => [p.seat, p.score]));
      await drv.act({ action: 'startGame', game: gid });
      await pumpToPhase(drv, (g) => g.phase !== 'countdown', 'D2 ' + gid + ' live', 400);
      const q = await drv.act({ action: 'quitToChoosing' });
      check(!!q && q.ok === true && q.phase === 'choosing',
        'D2 quit ' + gid + ': quitToChoosing lands in choosing (phase ' + (q && q.phase) + ', err ' + (q && q.error) + ')');
      const after = await drv.state();
      check(JSON.stringify(after.players.map((p) => [p.seat, p.score])) === scoresBefore,
        'D2 quit ' + gid + ': no points were banked for the aborted game');
    } catch (e) { check(false, 'D2 quit ' + gid + ' threw: ' + e.message); }
  }

  // (3) replay restarts the same game; podium -> finish reaches final.
  try {
    const { drv } = await buildRoom(2, 1, false);
    await drv.act({ action: 'startGame', game: 'day-ra' });
    await pumpD(drv, 250, (s) => s.phase === 'results', 'D3 first results', 4000);
    const rp = await drv.act({ action: 'replay' });
    check(!!rp && rp.ok === true && rp.game && rp.game.id === 'day-ra' && rp.game.phase === 'countdown',
      'D3 replay: restarts the same game into countdown');
    await pumpD(drv, 250, (s) => s.phase === 'results', 'D3 replay results', 4000);
    const cont = await drv.act({ action: 'continue' });
    check(!!cont && cont.phase === 'podium', 'D3 podium: continue from results reaches podium (got ' + (cont && cont.phase) + ')');
    const fin = await drv.act({ action: 'finish' });
    check(!!fin && fin.phase === 'final', 'D3 finish: finish from podium reaches final (got ' + (fin && fin.phase) + ')');
  } catch (e) { check(false, 'D3 replay/podium threw: ' + e.message); }

  // (4) A room whose ONLY human is a LOCAL seat completes do-vui.
  try {
    const drv = await newDrv();
    const localSeat = 2; // addLocal seats start at 2 (P1 is the phone slot)
    const la = await drv.act({ action: 'addLocal', seat: localSeat });
    check(!!la && la.ok === true, 'D4 local-only: addLocal takes seat 2 with no phone in the room');
    await drv.act({ action: 'addBot', seat: 3 });
    const st = await drv.act({ action: 'startGame', game: 'do-vui' });
    check(!!st && st.ok === true, 'D4 local-only: do-vui starts with a local seat as the only human (' + (st && st.error) + ')');
    let res = null;
    for (let i = 0; i < 6000; i++) {
      const v = await drv.state();
      if (v.phase === 'results') { res = v; break; }
      if (v.game && v.game.phase === 'question' && v.localViews && v.localViews[localSeat]) {
        const lv = v.localViews[localSeat];
        if (lv.mine == null && lv.question) {
          const bankQ = QUIZ_BANK.find((b) => b.q === lv.question);
          if (bankQ) {
            const idx = lv.options.indexOf(bankQ.options[bankQ.answer]);
            if (idx >= 0) await drv.act({ action: 'answer', forSeat: localSeat, choice: idx });
          }
        }
      }
      tick(250);
    }
    check(!!res && res.lastGame && res.lastGame.id === 'do-vui',
      'D4 local-only: the local-seat room completes do-vui to results');
    check(!!res && res.lastGame && (res.lastGame.points[localSeat] || 0) > 0,
      'D4 local-only: the local seat banked points by answering through forSeat (got '
      + (res && res.lastGame && res.lastGame.points[localSeat]) + ')');
  } catch (e) { check(false, 'D4 local-only threw: ' + e.message); }

  // (5) Phone-mode room (hostSeat + phone + bots) completes ma-soi.
  try {
    const drv = await newDrv();
    const hj = await drv.act({ action: 'hostJoin', name: 'Chủ ĐT' });
    check(!!hj && hj.ok === true, 'D5 phone-mode: hostJoin takes the host seat (' + (hj && hj.error) + ')');
    const j = await drv.join('Bạn ĐT');
    await drv.act({ action: 'addBot', seat: 3 });
    await drv.act({ action: 'addBot', seat: 4 });
    const st = await drv.act({ action: 'startGame', game: 'ma-soi' });
    check(!!st && st.ok === true, 'D5 phone-mode: ma-soi starts (hostSeat + phone + 2 bots)');
    let res = null; let sawMyView = false;
    for (let i = 0; i < 30000 && !res; i++) {
      const v = await drv.state();
      if (v.error) { check(false, 'D5 phone-mode: state error: ' + v.error); break; }
      if (v.phase === 'results') { res = v; break; }
      const mv = v.myView;
      if (mv && mv.id) { // myView IS the seat's gameView (fields at top level)
        sawMyView = true;
        const g = mv;
        const aliveOthers = Object.keys(g.aliveMap || {}).map(Number).filter((s) => s !== 1 && g.aliveMap[s]);
        if (g.phase === 'night' && g.myAlive) {
          if (g.myRole === 'soi' && g.myWolfVote == null && aliveOthers.length)
            await drv.act({ action: 'wolfVote', forSeat: 1, seat: aliveOthers[0] });
          else if (g.myRole === 'bao-ve' && g.myGuardPick == null) {
            const tgt = g.myGuardLast === 1 ? (aliveOthers[0] || 1) : 1;
            await drv.act({ action: 'wolfGuard', forSeat: 1, seat: tgt });
          } else if (g.myRole === 'tien-tri' && g.mySeerPick == null && aliveOthers.length)
            await drv.act({ action: 'wolfSeer', forSeat: 1, seat: aliveOthers[0] });
          else if (g.myRole === 'phu-thuy' && !g.myWitchDone && g.wolvesIn)
            await drv.act({ action: 'wolfWitch', forSeat: 1, done: true });
        } else if (g.phase === 'vote' && g.myAlive && aliveOthers.length) {
          const voted = (v.game && v.game.voted) || {};
          if (!voted[1]) await drv.act({ action: 'vote', forSeat: 1, seat: aliveOthers[0] });
        }
      }
      tick(250);
    }
    check(sawMyView, 'D5 phone-mode: the host view carries myView for the host seat during play');
    check(!!res && res.lastGame && res.lastGame.id === 'ma-soi',
      'D5 phone-mode: the phone-mode room completes ma-soi to results');
    check(!!res && res.lastGame && typeof res.lastGame.points[1] === 'number' && res.lastGame.points[1] >= 50,
      'D5 phone-mode: the host seat banked side points (got ' + (res && res.lastGame && res.lastGame.points[1]) + ')');
  } catch (e) { check(false, 'D5 phone-mode threw: ' + e.message); }
}

// ============================ PART E =====================================
async function partE() {
  console.log('\nPART E: secrecy string audits (2 phones per game)');
  // --- ma-soi: night 1, before any death makes roles public.
  const f0w = failures.length;
  try {
    const { drv, toks } = await buildRoom(4, 2, false);
    await drv.act({ action: 'startGame', game: 'ma-soi' });
    await pumpToPhase(drv, (g) => g.phase === 'night', 'E ma-soi night 1', 400);
    const A = await drv.pState(toks[0]);
    const B = await drv.pState(toks[1]);
    const H = await drv.state();
    const hJson = JSON.stringify(H);
    check(hJson.indexOf('"myRole"') === -1 && hJson.indexOf('"wolfTeam"') === -1
      && hJson.indexOf('"myVictim"') === -1 && hJson.indexOf('"mySeerNotes"') === -1
      && hJson.indexOf('"roles"') === -1,
      'E ma-soi: the host view carries no role secrets at night');
    let nonWolfChecked = 0;
    for (const [nm, X] of [['A', A], ['B', B]]) {
      if (X.game && X.game.myRole !== 'soi') {
        check(JSON.stringify(X).indexOf('"soi"') === -1,
          'E ma-soi: non-wolf phone ' + nm + ' never contains the wolf role string');
        nonWolfChecked += 1;
      }
    }
    check(nonWolfChecked >= 1, 'E ma-soi: at least one non-wolf phone was audited (n=4 deals exactly 1 wolf)');
    check(!!A.game.myRole && !!B.game.myRole,
      'E ma-soi: each phone still sees exactly its own role');
  } catch (e) { check(false, 'E ma-soi threw: ' + e.message); }
  matrix['ma-soi'].secrecy = failures.length === f0w ? 'OK' : 'FAIL';


  // --- tien-len: full hands exist only in their owner's view.
  const f0t = failures.length;
  try {
    const { drv, toks } = await buildRoom(4, 2, false);
    await drv.act({ action: 'startGame', game: 'tien-len' });
    await pumpToPhase(drv, (g) => g.phase === 'cards', 'E tien-len cards phase', 400);
    const A = await drv.pState(toks[0]);
    const B = await drv.pState(toks[1]);
    const H = await drv.state();
    const handA = JSON.stringify(A.game.myHand);
    const handB = JSON.stringify(B.game.myHand);
    check(Array.isArray(A.game.myHand) && A.game.myHand.length === 13,
      'E tien-len: phone A holds its full 13-card hand');
    check(JSON.stringify(B).indexOf(handA) === -1,
      'E tien-len: phone A\'s hand never appears in phone B\'s view');
    check(JSON.stringify(H).indexOf(handA) === -1 && JSON.stringify(H).indexOf(handB) === -1,
      'E tien-len: neither hand appears in the host view (counts only)');
    check(!('myHand' in H.game), 'E tien-len: the host game view has no myHand field at all');
  } catch (e) { check(false, 'E tien-len threw: ' + e.message); }
  matrix['tien-len'].secrecy = failures.length === f0t ? 'OK' : 'FAIL';

}

// ============================ RUNNER =====================================
async function main() {
  for (const id of GAME_IDS) matrix[id] = { minOk: null, maxOk: null, minMs: 0, maxMs: 0, errors: [], countdown: 'n/a', secrecy: 'n/a' };
  await partB();
  await partC();
  await partD();
  await partE();
  console.log('\n================ DEEP-DRIVE SUMMARY ================');
  for (const id of GAME_IDS) {
    const m = matrix[id];
    console.log('  ' + id.padEnd(16) + ' min:' + (m.minOk ? 'OK' : 'FAIL') + '  max:' + (m.maxOk ? 'OK' : 'FAIL')
      + '  countdown:' + m.countdown + '  secrecy:' + m.secrecy
      + (m.errors.length ? '  errors: ' + m.errors.join(' ;; ') : ''));
  }
  console.log('checks passed: ' + passed + ', failures: ' + failures.length);
  if (failures.length) {
    console.log('FAILURES:');
    failures.forEach((f) => console.log('  - ' + f));
  }
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error('DEEP-DRIVE CRASHED: ' + (e && e.stack || e)); process.exit(2); });