// ---------------------------------------------------------------------------
// CO VUA (chess): full rules. Board = Array(64), index 0 = a8 .. 63 = h1
// (row 0 is rank 8, row 7 is rank 1). Pieces 'PNBRQK' white, lowercase
// black. Legal generation = pseudo-legal moves filtered by own-king
// safety; castling rights/path, en passant, promotion, checkmate,
// stalemate, insufficient material, fifty-move and threefold draws.
// ---------------------------------------------------------------------------
function chessStartBoard() {
  const b = new Array(64).fill(null);
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) { b[f] = back[f]; b[8 + f] = 'p'; b[48 + f] = 'P'; b[56 + f] = back[f].toUpperCase(); }
  return b;
}
function chessColorOf(pc) { return pc === pc.toUpperCase() ? 'w' : 'b'; }
function chessOpp(c) { return c === 'w' ? 'b' : 'w'; }
function chessAttacked(b, sq, by) {
  const r = sq >> 3, f = sq & 7;
  const pr = by === 'w' ? r + 1 : r - 1;
  if (pr >= 0 && pr < 8) {
    const pawn = by === 'w' ? 'P' : 'p';
    if (f > 0 && b[pr * 8 + f - 1] === pawn) return true;
    if (f < 7 && b[pr * 8 + f + 1] === pawn) return true;
  }
  const knight = by === 'w' ? 'N' : 'n';
  const nd = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (let i = 0; i < 8; i++) { const rr = r + nd[i][0], ff = f + nd[i][1]; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === knight) return true; }
  const king = by === 'w' ? 'K' : 'k';
  for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
    if (!dr && !df) continue;
    const rr = r + dr, ff = f + df;
    if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === king) return true;
  }
  const bishop = by === 'w' ? 'B' : 'b', rook = by === 'w' ? 'R' : 'r', queen = by === 'w' ? 'Q' : 'q';
  const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]], straight = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let i = 0; i < 4; i++) {
    let rr = r + diag[i][0], ff = f + diag[i][1];
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { const pc = b[rr * 8 + ff]; if (pc) { if (pc === bishop || pc === queen) return true; break; } rr += diag[i][0]; ff += diag[i][1]; }
    rr = r + straight[i][0]; ff = f + straight[i][1];
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { const pc = b[rr * 8 + ff]; if (pc) { if (pc === rook || pc === queen) return true; break; } rr += straight[i][0]; ff += straight[i][1]; }
  }
  return false;
}
function chessKingSq(b, color) {
  const k = color === 'w' ? 'K' : 'k';
  for (let i = 0; i < 64; i++) if (b[i] === k) return i;
  return -1;
}
function chessPseudo(b, color, castling, ep) {
  const moves = [];
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const promoRow = color === 'w' ? 0 : 7;
  const push = (from, to, extra) => { moves.push(Object.assign({ from, to }, extra || {})); };
  for (let sq = 0; sq < 64; sq++) {
    const pc = b[sq];
    if (!pc || chessColorOf(pc) !== color) continue;
    const r = sq >> 3, f = sq & 7, kind = pc.toUpperCase();
    if (kind === 'P') {
      const oneR = r + dir;
      if (oneR >= 0 && oneR < 8 && !b[oneR * 8 + f]) {
        if (oneR === promoRow) { ['Q', 'R', 'B', 'N'].forEach((pr) => push(sq, oneR * 8 + f, { promo: color === 'w' ? pr : pr.toLowerCase() })); }
        else {
          push(sq, oneR * 8 + f);
          if (r === startRow && !b[(r + 2 * dir) * 8 + f]) push(sq, (r + 2 * dir) * 8 + f, { dbl: true });
        }
      }
      for (let df = -1; df <= 1; df += 2) {
        const ff = f + df, rr = r + dir;
        if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
        const to = rr * 8 + ff, tp = b[to];
        if (tp && chessColorOf(tp) !== color) {
          if (rr === promoRow) ['Q', 'R', 'B', 'N'].forEach((pr) => push(sq, to, { promo: color === 'w' ? pr : pr.toLowerCase(), cap: tp }));
          else push(sq, to, { cap: tp });
        } else if (!tp && to === ep) push(sq, to, { epCap: true });
      }
    } else if (kind === 'N' || kind === 'K') {
      const ds = kind === 'N' ? [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] : [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (let i = 0; i < ds.length; i++) {
        const rr = r + ds[i][0], ff = f + ds[i][1];
        if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
        const tp = b[rr * 8 + ff];
        if (!tp) push(sq, rr * 8 + ff);
        else if (chessColorOf(tp) !== color) push(sq, rr * 8 + ff, { cap: tp });
      }
      if (kind === 'K') {
        const home = color === 'w' ? 60 : 4;
        if (sq === home) {
          const rights = color === 'w' ? ['K', 'Q'] : ['k', 'q'];
          const enemy = chessOpp(color);
          if (castling[rights[0]] && !b[home + 1] && !b[home + 2] && b[home + 3] === (color === 'w' ? 'R' : 'r')
            && !chessAttacked(b, home, enemy) && !chessAttacked(b, home + 1, enemy) && !chessAttacked(b, home + 2, enemy)) push(sq, home + 2, { castle: 'K' });
          if (castling[rights[1]] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === (color === 'w' ? 'R' : 'r')
            && !chessAttacked(b, home, enemy) && !chessAttacked(b, home - 1, enemy) && !chessAttacked(b, home - 2, enemy)) push(sq, home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = kind === 'B' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : kind === 'R' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (let i = 0; i < dirs.length; i++) {
        let rr = r + dirs[i][0], ff = f + dirs[i][1];
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const tp = b[rr * 8 + ff];
          if (!tp) push(sq, rr * 8 + ff);
          else { if (chessColorOf(tp) !== color) push(sq, rr * 8 + ff, { cap: tp }); break; }
          rr += dirs[i][0]; ff += dirs[i][1];
        }
      }
    }
  }
  return moves;
}
function chessDoMove(b, castling, ep, m) {
  const nb = b.slice();
  const nc = Object.assign({}, castling);
  const pc = nb[m.from];
  let captured = nb[m.to] || null;
  nb[m.from] = null;
  if (m.epCap) { const capSq = m.to + (chessColorOf(pc) === 'w' ? 8 : -8); captured = nb[capSq]; nb[capSq] = null; }
  nb[m.to] = m.promo || pc;
  if (m.castle === 'K') { const home = chessColorOf(pc) === 'w' ? 60 : 4; nb[home + 1] = nb[home + 3]; nb[home + 3] = null; }
  if (m.castle === 'Q') { const home = chessColorOf(pc) === 'w' ? 60 : 4; nb[home - 1] = nb[home - 4]; nb[home - 4] = null; }
  if (pc === 'K') { nc.K = false; nc.Q = false; }
  if (pc === 'k') { nc.k = false; nc.q = false; }
  if (m.from === 63 || m.to === 63) nc.K = false;
  if (m.from === 56 || m.to === 56) nc.Q = false;
  if (m.from === 7 || m.to === 7) nc.k = false;
  if (m.from === 0 || m.to === 0) nc.q = false;
  return { board: nb, castling: nc, ep: m.dbl ? (m.from + m.to) / 2 : -1, captured };
}
function chessLegal(b, color, castling, ep) {
  const enemy = chessOpp(color);
  return chessPseudo(b, color, castling, ep).filter((m) => {
    const st = chessDoMove(b, castling, ep, m);
    return !chessAttacked(st.board, chessKingSq(st.board, color), enemy);
  });
}
function chessPosKey(b, color, castling, ep) {
  return b.map((p) => p || '.').join('') + color + (castling.K ? 'K' : '') + (castling.Q ? 'Q' : '') + (castling.k ? 'k' : '') + (castling.q ? 'q' : '') + ep;
}
function chessInsufficient(b) {
  const rest = [];
  for (let i = 0; i < 64; i++) { const pc = b[i]; if (pc && pc.toUpperCase() !== 'K') rest.push({ pc, sq: i }); }
  if (!rest.length) return true;
  if (rest.length === 1) return rest[0].pc.toUpperCase() === 'B' || rest[0].pc.toUpperCase() === 'N';
  if (rest.every((x) => x.pc.toUpperCase() === 'B')) {
    const par = ((rest[0].sq >> 3) + (rest[0].sq & 7)) % 2;
    return rest.every((x) => ((x.sq >> 3) + (x.sq & 7)) % 2 === par);
  }
  return false;
}
const CHESS_VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const CHESS_PST = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, 20, 20, 0, 0, 0, 20, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
function chessEval(b) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const pc = b[i];
    if (!pc) continue;
    const kind = pc.toUpperCase();
    const v = CHESS_VAL[kind] + (CHESS_PST[kind] ? CHESS_PST[kind][chessColorOf(pc) === 'w' ? i : ((7 - (i >> 3)) * 8 + (i & 7))] : 0);
    s += chessColorOf(pc) === 'w' ? v : -v;
  }
  return s;
}
function chessSearch(b, castling, ep, color, depth, alpha, beta) {
  if (depth === 0) return (color === 'w' ? 1 : -1) * chessEval(b);
  const moves = chessLegal(b, color, castling, ep);
  if (!moves.length) {
    if (chessAttacked(b, chessKingSq(b, color), chessOpp(color))) return -100000 - depth;
    return 0;
  }
  if (chessInsufficient(b)) return 0;
  moves.sort((m1, m2) => ((m2.cap ? CHESS_VAL[m2.cap.toUpperCase()] : 0) + (m2.promo ? 900 : 0)) - ((m1.cap ? CHESS_VAL[m1.cap.toUpperCase()] : 0) + (m1.promo ? 900 : 0)));
  let best = -Infinity;
  for (let i = 0; i < moves.length; i++) {
    const st = chessDoMove(b, castling, ep, moves[i]);
    const sc = -chessSearch(st.board, st.castling, st.ep, chessOpp(color), depth - 1, -beta, -alpha);
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
function chessBotPick(room, seat) {
  const g = room.game; const ch = g.ch;
  const p = playerAt(room, seat);
  const color = ch.colors[seat];
  const moves = chessLegal(ch.board, color, ch.castling, ch.ep);
  if (!moves.length) return null;
  const depth = p.difficulty === 'kho' ? 3 : p.difficulty === 'vua' ? 2 : 1;
  const scored = moves.map((m) => {
    const st = chessDoMove(ch.board, ch.castling, ch.ep, m);
    return { m, sc: -chessSearch(st.board, st.castling, st.ep, chessOpp(color), depth - 1, -Infinity, Infinity) };
  });
  scored.sort((a, b2) => b2.sc - a.sc);
  if (p.difficulty === 'de' && Math.random() < 0.3 && scored.length > 1) return pick(scored.slice(0, Math.min(5, scored.length))).m;
  if (p.difficulty === 'vua' && Math.random() < 0.12 && scored.length > 1) return scored[1].m;
  return scored[0].m;
}
function chessSqName(sq) { return 'abcdefgh'[sq & 7] + (8 - (sq >> 3)); }
function chessNotation(ch, m, givesCheck, isMate) {
  let s;
  if (m.castle === 'K') s = 'O-O';
  else if (m.castle === 'Q') s = 'O-O-O';
  else {
    const pc = ch.board[m.from];
    const kind = pc.toUpperCase();
    const cap = !!(m.cap || m.epCap);
    if (kind === 'P') s = (cap ? 'abcdefgh'[m.from & 7] + 'x' : '') + chessSqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    else s = kind + (cap ? 'x' : '') + chessSqName(m.to);
  }
  return s + (isMate ? '#' : givesCheck ? '+' : '');
}
function chessApplyMove(room, seat, m, t) {
  const g = room.game; const ch = g.ch;
  const color = ch.colors[seat];
  const movingKind = (ch.board[m.from] || '').toUpperCase();
  const st = chessDoMove(ch.board, ch.castling, ch.ep, m);
  const enemy = chessOpp(color);
  const enemyMoves = chessLegal(st.board, enemy, st.castling, st.ep);
  const inCheck = chessAttacked(st.board, chessKingSq(st.board, enemy), color);
  const isMate = inCheck && !enemyMoves.length;
  const notation = chessNotation(ch, m, inCheck, isMate);
  if (st.captured) (color === 'w' ? ch.capByW : ch.capByB).push(st.captured);
  ch.board = st.board; ch.castling = st.castling; ch.ep = st.ep;
  ch.half = (st.captured || movingKind === 'P') ? 0 : ch.half + 1;
  ch.lastMove = { from: m.from, to: m.to };
  ch.log.push({ seat, text: notation });
  if (ch.log.length > 60) ch.log = ch.log.slice(-60);
  // end conditions
  let result = null;
  if (isMate) result = { winner: seat, reason: 'chiếu hết' };
  else if (!enemyMoves.length) result = { winner: null, reason: 'hết nước đi (stalemate)' };
  else if (chessInsufficient(ch.board)) result = { winner: null, reason: 'thiếu quân chiếu hết' };
  else if (ch.half >= 100) result = { winner: null, reason: 'luật 50 nước' };
  else {
    const key = chessPosKey(ch.board, enemy, ch.castling, ch.ep);
    ch.rep[key] = (ch.rep[key] || 0) + 1;
    if (ch.rep[key] >= 3) result = { winner: null, reason: 'lặp lại thế cờ 3 lần' };
  }
  if (result) {
    ch.result = result;
    room.players.forEach((pl) => {
      g.points[pl.seat] = result.winner == null ? 200 : pl.seat === result.winner ? 300 : 200;
    });
    g.phase = 'chessEnd'; g.endsAt = t + CHESS_END_MS;
    return;
  }
  const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);
  ch.turn = seats[(seats.indexOf(seat) + 1) % seats.length];
  ch.actAt = t + CHESS_BOT_MS;
  g.endsAt = t + CHESS_TURN_MS;
}
function stepChess(room, t) {
  const g = room.game; const ch = g.ch;
  if (!ch) return false;
  if (g.phase === 'chessEnd') { if (t >= g.endsAt) { endGame(room); return true; } return false; }
  if (g.phase !== 'chess') return false;
  const cur = playerAt(room, ch.turn);
  if (cur && cur.type === 'bot' && t >= ch.actAt) {
    const m = chessBotPick(room, ch.turn);
    if (m) chessApplyMove(room, ch.turn, m, t);
    return true;
  }
  if (t >= g.endsAt) {
    const moves = chessLegal(ch.board, ch.colors[ch.turn], ch.castling, ch.ep);
    if (moves.length) chessApplyMove(room, ch.turn, pick(moves), t);
    return true;
  }
  return false;
}
