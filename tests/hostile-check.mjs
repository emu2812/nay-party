// HOSTILE CHECK — adversarial players trying to break every game:
// garbage actions, wrong seats, wrong turns, spam, absurd values.
// The engine must never throw, never corrupt state, and every match
// must still reach results with finite scores.
import { readFileSync } from 'fs';
let src = '';
for (const f of ['engine1.mjs', 'engine2.mjs']) src += readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').replace(/^export /gm, '') + '\n';
let fakeNow = 1000000;
const E = new Function('Date', src + '\nreturn { newRoom, hostDispatch, playerAction, advance, buildView, GAMES };')({ now: () => fakeNow });
const GAME_IDS = Object.keys(E.GAMES);
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }

const GARBAGE = [
  { action: 'pad', pad: { u: 'x', a: 999, r: null, zzz: [1, 2, 3] } },
  { action: 'pad', pad: null },
  { action: 'pad' },
  { action: 'pad', pad: { u: true, d: true, l: true, r: true, a: true, b: true, x: true, y: true } },
  { action: 'chessMove', from: -1, to: 999, promo: {} },
  { action: 'chessMove', from: 'e2', to: 'e4' },
  { action: 'chessMove', from: 52, to: 36, promo: 'X' },
  { action: 'play', cards: [999, -1, 'a', null] },
  { action: 'play', cards: 'not-an-array' },
  { action: 'pass' },
  { action: 'roll' },
  { action: 'move', horse: 99 },
  { action: 'move', horse: -3 },
  { action: 'answer', idx: 999 },
  { action: 'answer', idx: -1 },
  { action: 'answer', idx: 'A' },
  { action: 'vote', target: 999 },
  { action: 'vote', target: 'x' },
  { action: 'shoot', dx: 1e9, dy: -1e9 },
  { action: 'aim', angle: NaN, power: Infinity },
  { action: 'bogus-action-xyz' },
  { action: null },
  {},
  { action: 'pad', pad: { a: true } },
];
const HOST_GARBAGE = [
  { action: 'startGame', game: 'khong-co-game-nay' },
  { action: 'startGame', game: null },
  { action: 'addBot', seat: 99 },
  { action: 'addBot', seat: -1 },
  { action: 'addBot', seat: 'x' },
  { action: 'removePlayer', seat: 99 },
  { action: 'kickSeat', seat: 0 },
  { action: 'quickStart', game: 'khong-co' },
  { action: 'syncLocalResults', deltas: { 1: 1e12, 2: -1e12, 99: 500 }, bots: 'x', lastGame: null },
  { action: 'localPlay', on: 'maybe' },
  { action: 'bogus-host-action' },
  { action: null },
  {},
];

for (const id of GAME_IDS) {
  const meta = E.GAMES[id];
  const room = E.newRoom('666777', 'hosttok');
  const seats = Math.min(meta.max, Math.max(meta.min, 3));
  room.players.push({ seat: 1, name: 'H', type: 'human', token: 't1', color: 0, score: 0 });
  for (let s = 2; s <= seats; s++) room.players.push({ seat: s, name: 'B' + s, type: 'bot', difficulty: id === 'co-vua' ? 'kho' : 'vua', color: s - 1, score: 0 });
  let threw = '';
  try {
    // hostile host actions BEFORE the game starts
    for (const g of HOST_GARBAGE) { try { E.hostDispatch(room, JSON.parse(JSON.stringify(g))); } catch (e) { threw = 'pre-host ' + g.action + ': ' + e.message; } }
    const st = E.hostDispatch(room, { action: 'startGame', game: id });
    ok(typeof st !== 'string', id + ': startGame still works after hostile host actions' + (typeof st === 'string' ? ' — ' + st : ''));
    let guard = 0, spammed = false;
    const GUARD_MAX = id === 'co-vua' ? 3000000 : id === 'ca-ngua' ? 150000 : 20000; // idle turns burn the full turn timer; auto-play still finishes the match
    while (room.phase !== 'results' && guard < GUARD_MAX) {
      fakeNow += 62.5;
      E.advance(room);
      guard++;
      if (!spammed && room.game && guard > 60) {
        spammed = true;
        // every garbage action from the human seat, a bot seat, and a ghost seat
        for (const g of GARBAGE) {
          for (const seat of [1, 2, 99]) {
            try { E.playerAction(room, seat, JSON.parse(JSON.stringify(g))); } catch (e) { threw = id + ' seat' + seat + ' ' + g.action + ': ' + e.message; }
          }
        }
        // pad spam flood
        for (let i = 0; i < 500; i++) { try { E.playerAction(room, 1, { action: 'pad', pad: { a: i % 2 === 0, r: true } }); } catch (e) { threw = id + ' spam: ' + e.message; } }
        // hostile host actions mid-game
        for (const g of HOST_GARBAGE) { try { E.hostDispatch(room, JSON.parse(JSON.stringify(g))); } catch (e) { threw = 'mid-host ' + g.action + ': ' + e.message; } }
      }
    }
    ok(!threw, id + ': no throw under hostile fire' + (threw ? ' — ' + threw : ''));
    ok(room.phase === 'results', id + ': match still reaches results (guard ' + guard + ')');
    const scoresOk = room.players.every((p) => Number.isFinite(p.score) && Math.abs(p.score) < 1e9);
    ok(scoresOk, id + ': scores stay finite and sane: ' + JSON.stringify(room.players.map((p) => p.score)));
    const v = E.buildView(room, { role: 'host' });
    ok(!!v && v.phase === 'results', id + ': results view builds');
  } catch (e) {
    fail++; console.log('FAIL: ' + id + ' threw outside guards: ' + e.stack);
  }
}
console.log('HOSTILE CHECK: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
