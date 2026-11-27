// --- Game: Dua May Bay (checkpoint air race) -------------------------------
// Top-down planes in the wide arena: thrust with the pad (planes carry
// momentum), A = boost (meter), B = brake. Each pilot races their OWN
// gate sequence — gates are rings in the pilot's seat colour; first to
// FLY_GATES_WIN gates wins, timeout ranks by gates then distance to
// the next gate. Storm clouds (static cells) drag any plane inside.
function flyGatePos(room, seat) {
  const g = room.game;
  const b = g.blobs[seat];
  for (let tries = 0; tries < 12; tries++) {
    const x = Math.round((Math.random() * 27 - 13.5) * 10) / 10;
    const y = Math.round((Math.random() * 15 - 7.5) * 10) / 10;
    if (!b || Math.hypot(x - b.x, y - b.y) >= 13) return { x, y };
  }
  return { x: 0, y: 0 };
}
function botBrainFly(room, p) {
  const g = room.game;
  const every = p.difficulty === 'kho' ? 6 : p.difficulty === 'vua' ? 12 : 20;
  const prev = g.botIntent[p.seat];
  if (prev && (g.tickCount + p.seat) % every !== 0) return prev;
  const me = g.blobs[p.seat];
  const gate = g.fly.gates[p.seat];
  let tx = gate.x - me.x, ty = gate.y - me.y;
  // veer off a storm cloud sitting close to the flight path
  for (let i = 0; i < g.fly.clouds.length; i++) {
    const c = g.fly.clouds[i];
    const d = Math.hypot(c.x - me.x, c.y - me.y);
    if (d < c.r + 3.4) { tx += (me.x - c.x) * 1.6; ty += (me.y - c.y) * 1.6; }
  }
  const dist = Math.hypot(tx, ty) || 1;
  const boost = me.boost > 35 && Math.abs(me.vx * tx + me.vy * ty) / ((Math.hypot(me.vx, me.vy) || 1) * dist) > 0.86 && dist > 9;
  const intent = { x: Math.abs(tx) > 0.5 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.5 ? Math.sign(ty) : 0, boost, brake: dist < 3.4 && Math.hypot(me.vx, me.vy) > 0.5 };
  if (p.difficulty === 'de' && Math.random() < 0.2) { intent.x = randInt(-1, 1); intent.y = randInt(-1, 1); }
  g.botIntent[p.seat] = intent;
  return intent;
}
function stepFly(room, t) {
  const g = room.game;
  if (g.phase !== 'fly') return false;
  if (t >= g.endsAt) { finishFly(room); return true; }
  if (t < g.nextTickAt) return false;
  let nCU = 0;
  while (nCU < 8 && t >= g.nextTickAt && g.phase === 'fly') {
    flyTick(room);
    if (room.game !== g) return true;
    g.nextTickAt += TICK_MS;
    nCU++;
  }
  if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
  return true;
}
function flyTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  const moves = {};
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b) return;
    if (p.type === 'human') {
      const pad = g.pad[p.seat] || {};
      moves[p.seat] = { x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0), y: (pad.d ? 1 : 0) - (pad.u ? 1 : 0), boost: !!pad.a, brake: !!pad.b };
    } else moves[p.seat] = botBrainFly(room, p);
  });
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !mv || b.fin) return;
    const inCloud = g.fly.clouds.some((c) => Math.hypot(c.x - b.x, c.y - b.y) < c.r);
    b.stun = inCloud ? 4 : Math.max(0, (b.stun || 0) - 1);
    let acc = 0.055, maxV = 0.85;
    if (mv.boost && b.boost > 0) { acc = 0.105; maxV = 1.3; b.boost = Math.max(0, b.boost - 1.7); }
    else b.boost = Math.min(100, b.boost + 0.55);
    if (mv.x || mv.y) {
      const len = Math.hypot(mv.x, mv.y);
      b.vx += (mv.x / len) * acc; b.vy += (mv.y / len) * acc;
    }
    b.vx *= mv.brake ? 0.84 : 0.965; b.vy *= mv.brake ? 0.84 : 0.965;
    if (inCloud) { b.vx *= 0.9; b.vy *= 0.9; }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > maxV) { b.vx = b.vx / sp * maxV; b.vy = b.vy / sp * maxV; }
    b.x += b.vx; b.y += b.vy;
    clampRect(b);
    const gate = g.fly.gates[p.seat];
    if (gate && Math.hypot(gate.x - b.x, gate.y - b.y) < FLY_GATE_R) {
      b.gates += 1;
      if (b.gates >= FLY_GATES_WIN) { b.fin = g.tickCount; g.fly.finOrder.push(p.seat); }
      else g.fly.gates[p.seat] = flyGatePos(room, p.seat);
    }
  });
  const alive = room.players.filter((p) => g.blobs[p.seat] && !g.blobs[p.seat].fin);
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const A = g.blobs[alive[i].seat], B = g.blobs[alive[j].seat];
    let dx = B.x - A.x, dy = B.y - A.y; let d = Math.hypot(dx, dy);
    if (d < 1.6) { if (d < 0.01) { dx = 1; dy = 0; d = 1; } const push = (1.6 - d) / 2; A.x -= dx / d * push; A.y -= dy / d * push; B.x += dx / d * push; B.y += dy / d * push; }
  }
  trackEnd(room, trk);
  if (g.fly.finOrder.length >= room.players.length) finishFly(room);
}
function finishFly(room) {
  const g = room.game;
  const ranked = room.players.slice().sort((a, b) => {
    const A = g.blobs[a.seat], B = g.blobs[b.seat];
    if (A.fin && B.fin) return A.fin - B.fin;
    if (A.fin) return -1;
    if (B.fin) return 1;
    if (B.gates !== A.gates) return B.gates - A.gates;
    const ga = g.fly.gates[a.seat], gb = g.fly.gates[b.seat];
    return Math.hypot(ga.x - A.x, ga.y - A.y) - Math.hypot(gb.x - B.x, gb.y - B.y);
  });
  const entries = ranked.map((p, i) => ({ seat: p.seat, points: placementAt(i), gates: g.blobs[p.seat].gates, alive: true }));
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}
