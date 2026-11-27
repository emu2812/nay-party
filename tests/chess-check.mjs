// Chess rules verification: perft counts against known values (the
// gold standard for move-generation correctness), plus end-to-end
// game flow (fool's mate, bot game completion).
import { readFileSync } from 'fs';
let src = '';
for (const f of ['engine1.mjs', 'engine2.mjs']) src += readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').replace(/^export /gm, '') + '\n';
let fakeNow = 1000000;
const E = new Function('Date', src + '\nreturn { newRoom, hostDispatch, playerAction, advance, buildView, GAMES, chessStartBoard, chessLegal, chessDoMove, chessAttacked, chessKingSq, chessPosKey };')({ now: () => fakeNow });
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.log('FAIL:', name); } };
function fen(f) {
  const [place, turn, cast, ep] = f.split(' ');
  const b = new Array(64).fill(null);
  place.split('/').forEach((row, r) => {
    let file = 0;
    for (const ch of row) { if (/\d/.test(ch)) file += +ch; else { b[r * 8 + file] = ch; file++; } }
  });
  return { b, turn, castling: { K: cast.includes('K'), Q: cast.includes('Q'), k: cast.includes('k'), q: cast.includes('q') }, ep: ep === '-' ? -1 : (8 - +ep[1]) * 8 + 'abcdefgh'.indexOf(ep[0]) };
}
function perft(b, castling, ep, color, depth) {
  const moves = E.chessLegal(b, color, castling, ep);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) { const st = E.chessDoMove(b, castling, ep, m); n += perft(st.board, st.castling, st.ep, color === 'w' ? 'b' : 'w', depth - 1); }
  return n;
}
const start = E.chessStartBoard();
const C0 = { K: true, Q: true, k: true, q: true };
ok(perft(start, C0, -1, 'w', 1) === 20, 'perft startpos 1 = 20');
ok(perft(start, C0, -1, 'w', 2) === 400, 'perft startpos 2 = 400');
ok(perft(start, C0, -1, 'w', 3) === 8902, 'perft startpos 3 = 8902');
const kiwi = fen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -');
ok(perft(kiwi.b, kiwi.castling, kiwi.ep, 'w', 1) === 48, 'perft kiwipete 1 = 48');
ok(perft(kiwi.b, kiwi.castling, kiwi.ep, 'w', 2) === 2039, 'perft kiwipete 2 = 2039');
const pos3 = fen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -');
ok(perft(pos3.b, pos3.castling, pos3.ep, 'w', 3) === 2812, 'perft endgame 3 = 2812');
const pos4 = fen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -');
ok(perft(pos4.b, pos4.castling, pos4.ep, 'w', 2) === 264, 'perft pos4 2 = 264');
// --- game flow: fool's mate by actions ---
function mkRoom(p2type) {
  const room = E.newRoom('654321', 'hosttok');
  room.players.push({ seat: 1, name: 'A', type: 'human', token: 't1', color: 0, score: 0 });
  room.players.push({ seat: 2, name: 'B', type: p2type, token: p2type === 'bot' ? undefined : 't2', color: 1, score: 0, difficulty: 'vua' });
  return room;
}
function step(ms) { const end = fakeNow + ms; while (fakeNow < end) { fakeNow += 62.5; E.advance(room); } }
let room = mkRoom('human');
E.hostDispatch(room, { action: 'startGame', game: 'co-vua' });
step(3100);
let v = E.buildView(room, { role: 'host' });
ok(v.game && v.game.phase === 'chess', 'chess phase after countdown');
ok(v.game.board && v.game.board.filter(Boolean).length === 32, '32 pieces at start');
ok(v.game.colors[1] === 'w' && v.game.colors[2] === 'b', 'seat1 white, seat2 black');
const sq = (s) => (8 - +s[1]) * 8 + 'abcdefgh'.indexOf(s[0]);
function moveAs(seat, from, to) {
  const pl = room.players.find((p) => p.seat === seat);
  return E.playerAction(room, pl, { action: 'chessMove', from: sq(from), to: sq(to) });
}
ok(moveAs(2, 'e7', 'e5') != null, 'black cannot move first');
ok(moveAs(1, 'e2', 'e5') != null, 'illegal pawn jump rejected');
ok(moveAs(1, 'f2', 'f3') === null, 'f3 ok');
ok(moveAs(2, 'e7', 'e5') === null, 'e5 ok');
ok(moveAs(1, 'g2', 'g4') === null, 'g4 ok');
ok(moveAs(2, 'd8', 'h4') === null, 'Qh4 ok');
v = E.buildView(room, { role: 'host' });
ok(v.game.result && v.game.result.winner === 2, "fool's mate: black wins");
ok(v.game.points[2] === 300 && v.game.points[1] === 200, 'mate points 300/200');
step(6000);
ok(room.phase === 'results', 'game ends to results');
// --- bot game completes ---
room = mkRoom('bot');
E.hostDispatch(room, { action: 'startGame', game: 'co-vua' });
step(3100);
let guard = 0;
while (room.phase === 'playing' && guard < 20000) {
  fakeNow += 1000; E.advance(room); guard++;
  const g2 = room.game;
  if (g2 && g2.phase === 'chess' && g2.ch && g2.ch.turn === 1) {
    const legal = E.chessLegal(g2.ch.board, 'w', g2.ch.castling, g2.ch.ep);
    if (legal.length) E.playerAction(room, room.players[0], { action: 'chessMove', from: legal[0].from, to: legal[0].to, promo: legal[0].promo });
  }
}
ok(room.phase === 'results', 'human+bot chess game completes (guard ' + guard + ')');
ok(E.GAMES['co-vua'] && E.GAMES['co-vua'].min === 2 && E.GAMES['co-vua'].max === 2, 'catalog min/max 2');
console.log(fail === 0 ? 'CHESS CHECK PASSED — ' + pass + ' assertions' : 'CHESS FAILURES: ' + fail);
process.exit(fail ? 1 : 0);
