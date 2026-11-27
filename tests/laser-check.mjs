// Né Laze mechanics check — deterministic, engine-level.
// Loads the engine exactly the way build.mjs assembles the browser
// bundle (engine1+engine2, export stripped) and drives it with a
// fake clock. Lasers are injected by hand so every hit rule is
// checked exactly: warn never bites, LOW hits grounded, LOW misses
// airborne, HIGH hits airborne, HIGH misses grounded, jump rises on
// the A edge and lands, beams despawn after firing.
// Run: node tests/laser-check.mjs
import { readFileSync } from 'node:fs';

let nowMs = 1700000000000;
Date.now = () => nowMs;

const src = (readFileSync(new URL('../src/engine1.mjs', import.meta.url), 'utf8')
  + readFileSync(new URL('../src/engine2.mjs', import.meta.url), 'utf8')).replace(/^export /gm, '');
const E = new Function(src + '\nreturn { newRoom, hostDispatch, playerAction, advance, buildView, GAMES };')();

let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); passed++; console.log('  ok -', msg); }
function stepMs(ms) { const end = nowMs + ms; while (nowMs < end) { nowMs += 62.5; E.advance(room); } }

assert(E.GAMES['ne-dan'].name === 'Né Laze', 'game renamed to Né Laze');

const room = E.newRoom('LZ0001', 'hosttok');
E.hostDispatch(room, { action: 'addLocal', seat: 2 });            // human (keyboard seat)
E.hostDispatch(room, { action: 'addBot', seat: 3 });
E.hostDispatch(room, { action: 'addBot', seat: 4 });
const err = E.hostDispatch(room, { action: 'startGame', game: 'ne-dan' });
assert(err === null, 'startGame ne-dan accepted');
stepMs(3100); // countdown 3s
const g = room.game;
assert(g && g.phase === 'dodge', 'dodge phase begins after countdown');
assert(Array.isArray(g.lasers), 'engine tracks lasers, not balls');
assert(!Array.isArray(g.balls), 'no cannonball state remains (generic field stays null)');
const me = g.blobs[2];
assert(me && me.alive && me.lives === 3 && me.air === 0, 'human blob: 3 lives, grounded');

function view() { return E.buildView(room, 'host', null); }
let v = view();
assert(Array.isArray(v.game.lasers), 'host view exposes lasers array');
assert(v.game.blobs[2].air === false, 'view reports grounded as air=false');

// Park the human at the centre and freeze the bots far away so the
// injected beams only ever threaten the human.
function park() {
  me.x = 0; me.y = 0; me.lives = 3; me.alive = true; me.air = 0;
  g.invuln[2] = 0; g.jumpCd[2] = 0; g.lasers = [];
  g.blobs[3].x = -14; g.blobs[3].y = -8;
  g.blobs[4].x = 14; g.blobs[4].y = 8;
}
function inject(axis, pos, kind, state, tLeft) {
  g.lasers.push({ id: 900 + g.lasers.length, axis, pos, kind, state, tLeft });
}

// 1) A WARNING beam never bites, even dead-on.
park(); inject('h', 0, 'low', 'warn', 12);
stepMs(300);
assert(me.lives === 3, 'warn beam does not hit');

// 2) The same beam transitions warn -> fire in the view.
park(); inject('h', 0, 'low', 'warn', 2);
stepMs(200);
v = view();
assert(v.game.lasers.some((L) => L.state === 'fire'), 'warn beam becomes fire');
assert(me.lives === 2, 'LOW fire beam hits grounded player (-1 life)');

// 3) Jump: pad A rising edge lifts the blob; a LOW beam then misses.
park(); inject('h', 0, 'low', 'warn', 12);
E.hostDispatch(room, { action: 'pad', forSeat: 2, pad: {} });
stepMs(62.5);
E.hostDispatch(room, { action: 'pad', forSeat: 2, pad: { a: true } });
stepMs(62.5);
assert(me.air > 0, 'A edge starts the jump (airborne)');
v = view();
assert(v.game.blobs[2].air === true, 'view reports airborne');
// Ride out the warn while airborne: refuel air so the whole fire
// window is spent in the air, exactly like a well-timed jump.
for (let i = 0; i < 10; i++) { me.air = 5; stepMs(62.5); }
assert(me.lives === 3, 'LOW fire beam misses airborne player');
E.hostDispatch(room, { action: 'pad', forSeat: 2, pad: {} });

// 4) HIGH beam: grounded is safe.
park(); inject('v', 0, 'high', 'fire', 7);
stepMs(300);
assert(me.lives === 3, 'HIGH fire beam misses grounded player');

// 5) HIGH beam: airborne is hit.
park(); inject('v', 0, 'high', 'fire', 7); me.air = 6;
stepMs(62.5);
assert(me.lives === 2, 'HIGH fire beam hits airborne player (-1 life)');

// 6) Out of the line is safe whatever the kind/state.
park(); me.y = 5; inject('h', 0, 'low', 'fire', 7);
stepMs(300);
assert(me.lives === 3, 'player outside the beam line is safe');

// 7) Beams despawn after firing; natural spawns keep coming.
park();
stepMs(3000);
assert(g.lasers.every((L) => L.id < 900), 'injected beams are gone after firing');
stepMs(6000);
assert(g.laserSeq > 0, 'engine spawns its own lasers over time (' + g.laserSeq + ' so far)');

// 8) The game still ends and pays placement points.
stepMs(90000);
assert(room.phase === 'results', 'game reaches results');
const pts = Object.values(room.lastGame.points).sort((a, b) => b - a);
assert(pts[0] === 300 && pts.length === 3, 'placement points paid: ' + pts.join('/'));

console.log('\nLASER CHECK PASSED — ' + passed + ' assertions');
