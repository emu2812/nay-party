function newRoom(code, hostToken) {
  return {
    code, hostToken, phase: 'lobby', players: [], game: null, lastGame: null,
    resultsLog: [], bubble: null, prevRanks: null, createdAt: now(), updatedAt: now(),
    playlist: null, playlistNextAt: null,
  };
}
function playerAt(room, seat) { return room.players.find((p) => p.seat === seat) || null; }
function humanCount(room) { return room.players.filter((p) => p.type === 'human').length; }
function liveScore(room, p) { return p.score + (room.game ? (room.game.points[p.seat] || 0) : 0); }
function standingsOf(room) {
  return room.players.slice()
    .sort((a, b) => (liveScore(room, b) - liveScore(room, a)) || (a.seat - b.seat))
    .map((p) => p.seat);
}
function ranksOf(room) {
  const st = standingsOf(room); const r = {};
  st.forEach((seat, i) => { r[seat] = i + 1; });
  return r;
}
// After points change: remember how ranks moved (drives blob moods), refresh ranks.
function snapshotRanks(room) {
  const g = room.game;
  const current = ranksOf(room);
  if (g && room.prevRanks) {
    g.rankMoves = {};
    room.players.forEach((p) => { g.rankMoves[p.seat] = (room.prevRanks[p.seat] || current[p.seat]) - current[p.seat]; });
  }
  room.prevRanks = current;
}

// ---------------------------------------------------------------------------
// Bot personality: teasing speech bubbles (self-authored lines)
// ---------------------------------------------------------------------------
const BUBBLES = {
  lead: ['Theo kịp tui đi nè!', 'Chậm vậy, ngủ gật à?', 'Đỉnh cao là đây chứ đâu!', 'Cứ thế này thì cúp về tay tui.'],
  mid: ['Vòng này tui lấy điểm!', 'Ai run tay là thua nha.', 'Đang nóng máy đây, chờ chút!', 'Chưa biết mèo nào cắn mỉu nào đâu.'],
  last: ['Đợi đó, vòng sau biết tay!', 'Tui đang nhường thôi đó.', 'Từ từ, tui chưa tung chiêu đâu!', 'Thua keo này ta bày keo khác!'],
};
function rollBubble(room) {
  const bots = room.players.filter((p) => p.type === 'bot');
  if (!bots.length || Math.random() > 0.4) return;
  const bot = pick(bots);
  const st = standingsOf(room);
  const rank = st.indexOf(bot.seat);
  const mood = rank === 0 ? 'lead' : (rank === st.length - 1 && st.length > 1 ? 'last' : 'mid');
  room.bubble = { seat: bot.seat, text: pick(BUBBLES[mood]), until: now() + 4500 };
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------
function createGame(room, gameId) {
  const meta = GAMES[gameId];
  const game = {
    id: gameId, round: 1, totalRounds: meta.rounds, phase: 'countdown', endsAt: now() + 3000,
    points: {}, streaks: {}, inputs: {}, botPlan: {}, reveal: null, lastRound: null, rankMoves: {},
    order: null, current: null, seq: null, greenAt: 0, qStart: 0, raceStart: 0, inputStart: 0,
    pad: {}, padPrev: {}, blobs: null, arenaR: 0, tickCount: 0, nextTickAt: 0, elimOrder: [], botIntent: {}, dashCd: {}, dashBoost: {}, shoveCd: {},
    balls: null, spawnIn: 0, invuln: {}, elimTick: {},
    presses: {}, knot: 0, teams: null, winnerTeam: null,
    pair: null, chat: {},
    stars: null, starSeq: 0, goldIn: 0, banked: {}, hold: {}, crown: null, grid: null, paintCd: {},
    teamResult: null, owners: null, shared: null, star: null, starTick: 0, hearts: 0, checks: 0, sharedInvuln: 0,
    crate: null, goal: null, walls: null, layout: 0, deliveries: 0,
    rowStart: 0, distance: 0, hits: {}, splash: {}, stroked: {}, beatDone: 0,
    shells: [], shellSeq: 0, facing: {}, fireCd: {},
    votes: {}, imp: null, usedPairs: [], chatLog: [],
    hardCells: [], softCells: [], bombs: [], bombSeq: 0, blasts: [],
    slimes: [], slimeSeq: 0, crystal: null, kills: 0,
    level: 0, levelsDone: 0, stepIdx: 0, botPressAt: 0, decodeAt: 0,
    vel: {}, dmg: {}, face: {}, jumps: {}, atkCd: {}, hitT: {}, atkT: {}, dashT: {}, dashDir: {}, hvyCd: {}, hvyT: {},
    chars: null, gems: null, gemCount: {}, gateOpen: false, elOf: {}, wpIdx: {}, wpAt: {},
    wolf: null, ng: null, tl: null,
    ball: null, score: {}, lastTouch: null, goalInfo: null, goalieSeat: {}, kickCd: {}, remainMs: 0,
    frogs: null, chamber: 0, chambersDone: 0, fliesEaten: 0, flies: [], crates: [],
    heights: null, cannons: null, turnSeat: null, wind: 0, shell: null, boomFx: null,
    dmgDealt: {}, botFireAt: 0, lastImpact: null, matchEndsAt: 0, elimAt: {},
  };
  room.players.forEach((p) => { game.points[p.seat] = 0; game.streaks[p.seat] = 0; });
  if (gameId === 'do-vui') game.order = shuffle(QUIZ_BANK.map((_, i) => i)).slice(0, meta.rounds);
  // Chia Hay Cướp rotates pairs across the table: one round per player.
  room.game = game;
  room.phase = 'playing';
  room.prevRanks = ranksOf(room);
}
function setupCountdown(room) {
  const g = room.game;
  g.phase = 'countdown';
  g.endsAt = now() + 3000;
  g.inputs = {}; g.botPlan = {}; g.reveal = null;
}
function nextRoundOrEnd(room) {
  const g = room.game;
  if (g.round < g.totalRounds) { g.round += 1; setupCountdown(room); }
  else endGame(room);
}
function endGame(room) {
  const g = room.game;
  room.players.forEach((p) => { p.score += g.points[p.seat] || 0; });
  const entry = { game: g.id, name: GAMES[g.id].name, points: Object.assign({}, g.points), at: now() };
  if (g.teamResult) entry.teamResult = g.teamResult;
  room.resultsLog.push(entry);
  if (room.resultsLog.length > 20) room.resultsLog = room.resultsLog.slice(-20);
  room.lastGame = { id: g.id, name: entry.name, points: entry.points, standings: standingsOf(room), teamResult: g.teamResult || null };
  snapshotRanks(room);
  room.game = null;
  room.phase = 'results';
  // Playlist mode: if games remain in the queue, arm the intermission
  // auto-start; advance() fires it once the gap elapses (the DO alarm
  // stays armed meanwhile, and plain polling is the fallback). If that
  // was the last queued game, the playlist simply ends here.
  if (room.playlist) {
    if (room.playlist.idx + 1 < room.playlist.queue.length) room.playlistNextAt = now() + PLAYLIST_GAP_MS;
    else { room.playlist = null; room.playlistNextAt = null; }
  }
  rollBubble(room);
}
function isFinalRound(g) { return g.round === g.totalRounds; }
function roundPoints(g, pts) { return isFinalRound(g) ? pts * 2 : pts; }

// ---------------------------------------------------------------------------
// Round setup (runs when the 3-2-1 countdown expires) + bot plans
// ---------------------------------------------------------------------------
function botDelay(diff, range) { return Math.round(rand(range[0], range[1])); }
// Chia Hay Cướp bot personalities are deliberately deterministic so a
// bot's word can be read at the table: Dễ bots always split, Khó bots
// always steal, Vừa bots split on odd rounds and steal on even rounds.
const NEGOT_LINES = [
  'Chia đôi cho lành nhé!',
  'Tin tui đi, chia là chắc ăn nhất.',
  'Cướp là tui không nể đâu nha.',
  'Thương lượng đàng hoàng nè, chia nhé?',
];
// Kẻ Giả Mạo bot discussion lines: deliberately generic — a bot must
// never reference either question (it only knows its own, and saying
// it out loud would break the secrecy rule for everyone).
// Round setup must not erase a gamepad state the player is physically
// still holding: both clients send pad state only when it changes, so
// wiping g.pad at spawn would freeze anyone who grabbed a direction (or
// held A/B) during the 3-2-1 countdown until they happened to re-touch.
// Keep the held state, pruned to the seats currently at the table (a
// seat that left between rounds must not resurrect), and clear padPrev
// so a held button reads as a fresh rising edge on the round's first
// tick (a held A fires at once, a held B dashes at once).
// Held-pad bitmask for the view: lets every screen predict a
// REMOTE human's blob from their last known input (the same trick
// local seats already use), instead of rendering it a full round
// trip behind the server. Bits: up1 down2 left4 right8 a16 b32
// x64 y128. Only human seats get one — bots have no pad.
function padMask(pad) {
  if (!pad) return 0;
  // Server pads are stored with short keys (u/d/l/r) by the pad
  // action handler; the client decodes the mask back into its own
  // long-key pad shape in predPadFor.
  let m = 0;
  if (pad.u) m |= 1; if (pad.d) m |= 2; if (pad.l) m |= 4; if (pad.r) m |= 8;
  if (pad.a) m |= 16; if (pad.b) m |= 32; if (pad.x) m |= 64; if (pad.y) m |= 128;
  return m;
}
function preservePads(room) {
  const g = room.game;
  const kept = {};
  room.players.forEach((p) => { if (g.pad && g.pad[p.seat]) kept[p.seat] = g.pad[p.seat]; });
  g.pad = kept;
  g.padPrev = {};
}
// Shared spawn for the walled tick-arena games: blobs on the ring at
// ARENA_R0*0.55 with fresh cooldown / invulnerability maps.
function spawnArenaBlobs(room, lives) {
  const g = room.game;
  g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; g.dashCd = {}; g.dashBoost = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};
  room.players.forEach((p, i) => {
    const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
    g.blobs[p.seat] = {
      x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
      y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
      lives, alive: true,
    };
    g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.invuln[p.seat] = 0;
  });
}
// Guns for Xe Tăng / Thủ Thành: facing starts aimed at the centre
// (the last-movement direction from then on), fire cooldowns clear.
function initGuns(room) {
  const g = room.game;
  g.shells = []; g.shellSeq = 0; g.facing = {}; g.fireCd = {};
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    const d = Math.hypot(b.x, b.y) || 1;
    g.facing[p.seat] = { x: Math.round(-b.x / d * 100) / 100, y: Math.round(-b.y / d * 100) / 100 };
    g.fireCd[p.seat] = 0;
  });
}
function beginRound(room) {
  const g = room.game; const t = now();
  g.inputs = {}; g.botPlan = {}; g.reveal = null;
  const bots = room.players.filter((p) => p.type === 'bot');
  if (g.id === 'do-vui') {
    const src = QUIZ_BANK[g.order[g.round - 1]];
    const opts = shuffle(src.options.map((text, i) => ({ text, correct: i === src.answer })));
    g.current = { q: src.q, options: opts.map((o) => o.text), correct: opts.findIndex((o) => o.correct) };
    g.phase = 'question'; g.qStart = t; g.endsAt = t + QUIZ_MS;
    bots.forEach((p) => {
      const B = BOT[p.difficulty];
      let choice;
      if (Math.random() < B.quizCorrect) choice = g.current.correct;
      else { const wrong = [0, 1, 2, 3].filter((i) => i !== g.current.correct); choice = pick(wrong); }
      g.botPlan[p.seat] = { choice, at: t + botDelay(p.difficulty, B.quizDelay) };
    });
  } else if (g.id === 'day-ra') {
    g.phase = 'arena';
    g.arenaR = ARENA_R0; g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + ARENA_MS;
    g.blobs = {}; g.elimOrder = []; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: ARENA_LIVES, alive: true,
      };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0;
    });
  } else if (g.id === 'ne-dan') {
    g.phase = 'dodge';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + DODGE_MS;
    g.blobs = {}; g.lasers = []; g.laserSeq = 0; g.spawnIn = 20; g.elimOrder = []; g.elimTick = {};
    g.botIntent = {}; g.dashCd = {}; g.jumpCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: DODGE_LIVES, alive: true, air: 0,
      };
      g.dashCd[p.seat] = 0; g.jumpCd[p.seat] = 0; g.invuln[p.seat] = 0;
    });
  } else if (g.id === 'cuop-sao') {
    g.phase = 'steal';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + STEAL_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);
    g.stars = []; g.starSeq = 0; g.goldIn = GOLD_EVERY_TICKS; g.banked = {};
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: 0, alive: true,
      };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.banked[p.seat] = 0;
    });
    spawnStar(room, false); spawnStar(room, false);
  } else if (g.id === 'giu-vuong-mien') {
    g.phase = 'crown';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + CROWN_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);
    g.hold = {}; g.crown = { holder: null, x: 0, y: 0, lockTicks: 0, acc: 0 };
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: 0, alive: true,
      };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.hold[p.seat] = 0;
    });
  } else if (g.id === 'chung-mot-than') {
    g.phase = 'shared';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SHARED_MS;
    // Directions are dealt round-robin across the seats in seat order:
    // 2P -> P1: up+down, P2: right+left; 3P -> P1: up+left, P2: right,
    // P3: down; 4P -> one each. The server filters every pad to the
    // directions its owner holds.
    const seats = room.players.map((p) => p.seat).sort((x, y) => x - y);
    g.owners = {};
    ['u', 'r', 'd', 'l'].forEach((d, i) => { g.owners[d] = seats[i % seats.length]; });
    g.shared = { x: 0, y: 0 };
    g.hearts = SHARED_HEARTS; g.checks = 0; g.sharedInvuln = 0;
    g.balls = []; g.spawnIn = 20; preservePads(room); g.botIntent = {};
    spawnSharedStar(room);
  } else if (g.id === 'day-hop') {
    g.phase = 'box';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + BOX_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; preservePads(room);
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: 0, alive: true,
      };
      g.dashCd[p.seat] = 0;
    });
    g.layout = 0; g.deliveries = 0;
    loadBoxLayout(room);
  } else if (g.id === 'cheo-thuyen') {
    g.phase = 'row';
    g.rowStart = t; g.endsAt = t + ROW_BEATS * ROW_BEAT_MS;
    g.distance = 0; g.hits = {}; g.splash = {}; g.stroked = {}; g.beatDone = 0;
    room.players.forEach((p) => { g.hits[p.seat] = 0; g.splash[p.seat] = 0; });
  } else if (g.id === 'xe-tank') {
    g.phase = 'tank';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + TANK_MS;
    spawnArenaBlobs(room, TANK_LIVES);
    initGuns(room);
  } else if (g.id === 'dat-bom') {
    g.phase = 'bomber';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + BOM_MS;
    g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};
    // Spawns are BOM_SPAWNS (corners, then edge midpoints), dealt in
    // seat order — with max 6 players nobody ever shares a cell.
    room.players.forEach((p, i) => {
      const c = BOM_SPAWNS[i % BOM_SPAWNS.length];
      g.blobs[p.seat] = { x: bomCellX(c[0]), y: bomCellY(c[1]), lives: BOM_LIVES, alive: true };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.invuln[p.seat] = 0;
    });
    g.hardCells = []; g.softCells = []; g.bombs = []; g.bombSeq = 0; g.blasts = [];
    for (let r = 0; r < BOM_ROWS; r++) {
      for (let c = 0; c < BOM_COLS; c++) {
        if (bomIsHard(c, r)) { g.hardCells.push([c, r]); continue; }
        if (bomIsSafe(c, r)) continue;
        if (Math.random() < BOM_SOFT_P) g.softCells.push([c, r]);
      }
    }
  } else if (g.id === 'thu-thanh') {
    g.phase = 'defend';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + DEF_MS;
    spawnArenaBlobs(room, 0);
    initGuns(room);
    g.crystal = { hp: DEF_CRYSTAL_HP };
    g.slimes = []; g.slimeSeq = 0; g.kills = 0; g.spawnIn = 16;
  } else if (g.id === 'nguoi-que') {
    g.phase = 'fight';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + FIGHT_MS;
    g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; preservePads(room); g.invuln = {};
    g.vel = {}; g.dmg = {}; g.face = {}; g.jumps = {}; g.atkCd = {}; g.hitT = {}; g.atkT = {}; g.dashT = {}; g.dashDir = {};
    g.dashCd = {}; g.hvyCd = {}; g.hvyT = {};
    room.players.forEach((p, i) => {
      const sx = FIGHT_SPAWN_X[i % FIGHT_SPAWN_X.length];
      g.blobs[p.seat] = { x: sx, y: FIGHT_PLATFORMS[0].y - PLAT_HH, vx: 0, vy: 0, ground: true, lives: FIGHT_LIVES, alive: true };
      g.dmg[p.seat] = 0; g.face[p.seat] = sx < 0 ? 1 : -1; g.jumps[p.seat] = 0;
      g.atkCd[p.seat] = 0; g.hitT[p.seat] = 0; g.atkT[p.seat] = 0; g.dashT[p.seat] = 0; g.dashDir[p.seat] = 1;
      g.dashCd[p.seat] = 0; g.hvyCd[p.seat] = 0; g.hvyT[p.seat] = 0;
      g.invuln[p.seat] = 0;
    });
  } else if (g.id === 'den-lua-nuoc') {
    g.phase = 'temple';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + TEMP_MS;
    g.hearts = TEMP_HEARTS; preservePads(room); g.botIntent = {};
    g.chars = {}; g.elOf = {}; g.wpIdx = {}; g.wpAt = {};
    g.gems = TEMPLE_LEVEL.gems.map((gm) => ({ x: gm.x, y: gm.y, el: gm.el, taken: false }));
    g.gemCount = { lua: 0, nuoc: 0 };
    g.gateOpen = false;
    room.players.forEach((p) => {
      const el = p.seat % 2 === 1 ? 'lua' : 'nuoc';
      const st = TEMPLE_LEVEL.starts[el];
      g.elOf[p.seat] = el;
      g.chars[p.seat] = { x: st.x, y: st.y, vx: 0, vy: 0, ground: true, el, home: false };
      g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0;
    });
  } else if (g.id === 'ma-soi') {
    // Roles are dealt secretly HERE and live only in g.wolf; views
    // hand each phone its own role and nothing else (see gameView).
    const seats = room.players.map((p) => p.seat);
    const n = seats.length;
    const nWolves = n <= 5 ? 1 : n <= 8 ? 2 : 3;
    const deal = shuffle(seats.slice());
    const roles = {}; const alive = {};
    deal.forEach((seat, i) => {
      roles[seat] = i < nWolves ? 'soi'
        : i === nWolves ? 'tien-tri'
        : i === nWolves + 1 ? 'bao-ve'
        : (n >= 6 && i === nWolves + 2) ? 'phu-thuy' : 'dan';
      alive[seat] = true;
    });
    g.wolf = {
      roles, alive,
      wolfVotes: {}, guardPick: null, guardLast: null, seerPick: null, seerNotes: {},
      witch: { save: false, poison: null, done: false }, saveLeft: 1, poisonLeft: 1,
      deaths: [], dawnDeaths: [], exec: null, voteTally: null, winner: null,
    };
    g.votes = {}; g.chatLog = [];
    g.phase = 'night'; g.endsAt = t + WOLF_NIGHT_MS;
    wolfPlanNight(room, t);
  } else if (g.id === 'ca-ngua') {
    const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);
    g.ng = {
      boards: {}, horses: {}, turn: seats[0], dice: null, legal: [], chain: 0,
      actAt: t + NGUA_BOT_MS, autoAt: 0, winner: null, last: null, log: [],
    };
    room.players.forEach((p) => {
      g.ng.boards[p.seat] = seats.indexOf(p.seat);
      g.ng.horses[p.seat] = [0, 0, 0, 0];
    });
    g.phase = 'roll'; g.endsAt = t + NGUA_TURN_MS;
  } else if (g.id === 'tien-len') {
    const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);
    const deck = shuffle(Array.from({ length: 52 }, (_, i) => i));
    const hands = {};
    seats.forEach((s, i) => { hands[s] = tlSort(deck.slice(i * 13, i * 13 + 13)); });
    let first = seats[0];
    seats.forEach((s) => { if (hands[s].indexOf(0) >= 0) first = s; });
    // With fewer than 4 players the 3♠ can stay in the undealt pile;
    // the must-include-3♠ opening rule only applies when the card is
    // actually in a hand — otherwise the fallback leader (seats[0])
    // could never legally open and would sit locked until the timeout.
    const threeDealt = seats.some((s) => hands[s].indexOf(0) >= 0);
    g.tl = {
      hands, table: null, passed: {}, turn: first, leader: first,
      finished: [], firstPlay: threeDealt, turnEndsAt: t + TL_TURN_MS, actAt: t + TL_BOT_MS,
      log: [], instantWin: null, winner: null,
    };
    // Tới trắng: an unbeatable dealt hand ends the match on the spot —
    // lowest qualifying seat wins; everyone else still holds 13 cards,
    // so the remaining placements fall back to seat order.
    let iwSeat = null, iwKind = null;
    for (const s of seats) { const k = tlInstantWin(hands[s]); if (k) { iwSeat = s; iwKind = k; break; } }
    if (iwSeat != null) {
      g.tl.instantWin = { seat: iwSeat, kind: iwKind };
      const rest = seats.filter((s) => s !== iwSeat)
        .sort((a, b) => (hands[a].length - hands[b].length) || (a - b));
      g.tl.finished = [iwSeat].concat(rest);
      tlLog(room, playerAt(room, iwSeat).name + ' TỚI TRẮNG — thắng ngay khi chia bài!');
      finishTienLen(room, t);
    } else {
      g.phase = 'cards'; g.endsAt = g.tl.turnEndsAt;
      tlLog(room, playerAt(room, first).name + (threeDealt ? ' có lá 3♠ — đánh trước!' : ' đánh trước!'));
    }
  } else if (g.id === 'da-bong') {
    g.phase = 'soccer';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SOCCER_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.dashT = {}; g.dashDir = {}; g.face = {}; g.kickCd = {};
    preservePads(room);
    g.score = { do: 0, xanh: 0 };
    g.lastTouch = null; g.goalInfo = null;
    room.players.forEach((p) => {
      g.blobs[p.seat] = { x: 0, y: 7.1, vx: 0, vy: 0, ground: true, lives: 0, alive: true };
      g.face[p.seat] = p.seat % 2 === 1 ? 1 : -1;
      g.dashCd[p.seat] = 0; g.dashT[p.seat] = 0; g.dashDir[p.seat] = 1; g.kickCd[p.seat] = 0;
    });
    soccerKickoff(room);
  } else if (g.id === 'ech-op') {
    g.phase = 'frog';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS;
    g.hearts = FROG_HEARTS; preservePads(room); g.botIntent = {};
    g.frogs = {}; g.face = {}; g.wpIdx = {}; g.wpAt = {};
    g.chambersDone = 0; g.fliesEaten = 0;
    room.players.forEach((p) => {
      g.frogs[p.seat] = { x: 0, y: 9.1, vx: 0, vy: 0, ground: true, belly: null, by: null };
      g.face[p.seat] = 1; g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0;
    });
    loadFrogChamber(room, 1, t);
  } else if (g.id === 'can-goc') {
    // Terrain: two summed sines, surface clamped to a playable band.
    // 16:9 wave: 160 columns of 0.2u span the 32-wide field; the sine
    // frequencies scale by 24/32 so the hills keep their old shape.
    const p1 = rand(0, Math.PI * 2), p2 = rand(0, Math.PI * 2);
    const a1 = rand(1.2, 2.0), a2 = rand(0.5, 1.0), f1 = rand(0.165, 0.255), f2 = rand(0.41, 0.64);
    g.heights = [];
    for (let i = 0; i < CANNON_COLS; i++) {
      const x = -16 + (i + 0.5) * (32 / CANNON_COLS);
      let y = 1.6 + a1 * Math.sin(x * f1 + p1) + a2 * Math.sin(x * f2 + p2);
      y = Math.max(-2.5, Math.min(5.5, y));
      g.heights.push(Math.round(y * 100) / 100);
    }
    g.cannons = {}; g.elimOrder = []; g.elimAt = {}; g.dmgDealt = {};
    const n = room.players.length;
    room.players.forEach((p, i) => {
      const col = n === 1 ? 80 : Math.max(4, Math.min(CANNON_COLS - 5, Math.round(26 + (i * 108) / (n - 1) + rand(-4, 4))));
      g.cannons[p.seat] = {
        col, x: Math.round((-16 + (col + 0.5) * 0.2) * 100) / 100, y: g.heights[col],
        hp: CANNON_HP, alive: true, face: 0, angle: 45, power: 60,
      };
      const c = g.cannons[p.seat];
      c.face = c.x <= 0 ? 1 : -1;
      g.dmgDealt[p.seat] = 0;
    });
    g.shell = null; g.boomFx = null; g.lastImpact = null;
    g.matchEndsAt = t + CANNON_MATCH_MS;
    cannonNextTurn(room, t, null);
  }
}

// ---------------------------------------------------------------------------
// Advance engine: phases move forward lazily whenever a request touches
// the room. Bots act from their precomputed plans.
// ---------------------------------------------------------------------------
function advance(room) {
  playlistAutoStart(room);
  let guard = 0;
  while (guard++ < 40) { if (!step(room)) break; }
}
// Playlist intermission: the results screen is showing and the gap has
// elapsed — start the next queued game with NO host action. Entries
// that became unplayable since queueing (seat-gated games after seats
// dropped, or nobody left to play) are skipped; if nothing playable
// remains, the playlist ends and the room just stays on results.
function playlistAutoStart(room) {
  if (room.phase !== 'results' || !room.playlist || !room.playlistNextAt) return;
  if (now() < room.playlistNextAt) return;
  room.playlistNextAt = null;
  let i = room.playlist.idx + 1;
  while (i < room.playlist.queue.length && !gamePlayable(room, room.playlist.queue[i])) i++;
  if (i >= room.playlist.queue.length) { room.playlist = null; return; }
  room.playlist.idx = i;
  createGame(room, room.playlist.queue[i]);
}
function step(room) {
  const g = room.game;
  if (room.phase !== 'playing' || !g) return false;
  const t = now();
  if (g.phase === 'countdown') {
    if (t >= g.endsAt) { beginRound(room); return true; }
    return false;
  }
  if (g.id === 'do-vui') return stepQuiz(room, t);
  if (g.id === 'day-ra') return stepArena(room, t);
  if (g.id === 'ne-dan') return stepDodge(room, t);
  if (g.id === 'cuop-sao') return stepSteal(room, t);
  if (g.id === 'giu-vuong-mien') return stepCrown(room, t);
  if (g.id === 'chung-mot-than') return stepShared(room, t);
  if (g.id === 'day-hop') return stepBox(room, t);
  if (g.id === 'cheo-thuyen') return stepRow(room, t);
  if (g.id === 'xe-tank') return stepTank(room, t);
  if (g.id === 'dat-bom') return stepBomber(room, t);
  if (g.id === 'thu-thanh') return stepDefend(room, t);
  if (g.id === 'nguoi-que') return stepFight(room, t);
  if (g.id === 'den-lua-nuoc') return stepTemple(room, t);
  if (g.id === 'ma-soi') return stepWolf(room, t);
  if (g.id === 'ca-ngua') return stepNgua(room, t);
  if (g.id === 'tien-len') return stepTienLen(room, t);
  if (g.id === 'da-bong') return stepSoccer(room, t);
  if (g.id === 'ech-op') return stepFrog(room, t);
  if (g.id === 'can-goc') return stepCannon(room, t);
  return false;
}
function humansAllIn(room, has) {
  return room.players.filter((p) => p.type === 'human').every((p) => has(p.seat));
}
function botsDue(room, atOf) {
  return room.players.filter((p) => p.type === 'bot').every((p) => { const plan = room.game.botPlan[p.seat]; return plan && atOf(plan) <= now(); });
}
function finishTimedRound(room, nextPhase, endsAt) {
  snapshotRanks(room);
  rollBubble(room);
  room.game.phase = nextPhase;
  room.game.endsAt = endsAt;
}

// --- Game 2: Đố Vui Tốc Độ (quiz, streak bonus) ----------------------------
function stepQuiz(room, t) {
  const g = room.game;
  if (g.phase === 'question') {
    const settled = humansAllIn(room, (s) => !!g.inputs[s]) && botsDue(room, (pl) => pl.at || 0);
    if (t >= g.endsAt || settled) { resolveQuiz(room, t); return true; }
    return false;
  }
  if (g.phase === 'reveal') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function resolveQuiz(room, t) {
  const g = room.game;
  const choices = {}; const pts = {};
  room.players.forEach((p) => {
    let ans = null;
    if (p.type === 'human') { const inp = g.inputs[p.seat]; if (inp) ans = inp; }
    else { const plan = g.botPlan[p.seat]; if (plan && plan.at <= g.endsAt) ans = plan; }
    choices[p.seat] = ans ? ans.choice : null;
    if (ans && ans.choice === g.current.correct) {
      const streak = (g.streaks[p.seat] || 0) + 1;
      g.streaks[p.seat] = streak;
      const speed = Math.round(100 * Math.max(0, 1 - (ans.at - g.qStart) / QUIZ_MS));
      const streakBonus = streak >= 2 ? 25 * (streak - 1) : 0;
      pts[p.seat] = roundPoints(g, 100 + speed + streakBonus);
    } else {
      g.streaks[p.seat] = 0;
      pts[p.seat] = 0;
    }
    g.points[p.seat] = (g.points[p.seat] || 0) + pts[p.seat];
  });
  g.reveal = { correct: g.current.correct, choices, points: pts, streaks: Object.assign({}, g.streaks) };
  g.lastRound = { round: g.round, points: pts };
  finishTimedRound(room, 'reveal', t + QUIZ_REVEAL_MS);
}

// --- Game 6: Đẩy Ra Khỏi Sàn (tick arena, gamepad held-state) ---------------
// Placement for this game is awarded once per match (300/200/100/50) as the
// follow-up spec fixes those numbers; the ×2 rule applies to round-based
// games, this one is a single continuous match.
function stepArena(room, t) {
  const g = room.game;
  if (g.phase !== 'arena') return false;
  if (t >= g.endsAt) { finishArena(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up: a caller arriving k>=2 ticks late simulates up to 4
    // of the missed ticks in this call instead of dropping all but
    // one; any deeper backlog still resyncs (snap below), so a long
    // sleep can never spiral. Behind by <=1 the loop runs exactly
    // once — bit-identical to the old 1-tick-per-call semantics.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'arena') {
      simulateTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function botBrain(room, p) {
  const g = room.game;
  const every = p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24;
  const prev = g.botIntent[p.seat];
  if (prev && (g.tickCount + p.seat) % every !== 0) return { x: prev.x, y: prev.y, shove: false };
  const me = g.blobs[p.seat];
  let tx = 0, ty = 0, shove = false;
  const dC = Math.hypot(me.x, me.y);
  let foe = null, foeD = 1e9;
  room.players.forEach((q) => {
    if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {
      const d = Math.hypot(g.blobs[q.seat].x - me.x, g.blobs[q.seat].y - me.y);
      if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; }
    }
  });
  if (dC > g.arenaR * 0.6 || !foe) { tx = -me.x; ty = -me.y; }
  else {
    tx = foe.x - me.x; ty = foe.y - me.y;
    if (foeD <= SHOVE_RANGE) shove = Math.random() < (p.difficulty === 'kho' ? 0.85 : p.difficulty === 'vua' ? 0.55 : 0.3);
  }
  if (p.difficulty === 'de' && Math.random() < 0.25) { tx = randInt(-1, 1); ty = randInt(-1, 1); }
  const intent = { x: Math.abs(tx) > 0.4 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.4 ? Math.sign(ty) : 0, shove };
  g.botIntent[p.seat] = intent;
  return intent;
}
// --- 16:9 wave: velocity tracking for client extrapolation ----------
// Arena blobs are positional (x += step each tick), so a blob's
// velocity IS the displacement its sim just applied. Arena sims call
// trackStart() before moving and trackEnd() after; the views expose
// the result as b.vx/b.vy (units per tick) and the TV client leads
// its render target by v * elapsed ticks (capped), so motion reads
// ahead of the 125ms tick instead of trailing it.
function trackStart(room) {
  const g = room.game; const s = {};
  room.players.forEach((p) => { const b = g.blobs && g.blobs[p.seat]; if (b) s[p.seat] = { x: b.x, y: b.y }; });
  return s;
}
function trackEnd(room, s) {
  const g = room.game;
  room.players.forEach((p) => {
    const b = g.blobs && g.blobs[p.seat]; const o = s[p.seat];
    if (!b || !o) return;
    b.vx = Math.round((b.x - o.x) * 100) / 100;
    b.vy = Math.round((b.y - o.y) * 100) / 100;
  });
}
// The wide field's rectangle clamp (0.8u margin inside [-16,16]x[-9,9]).
function clampRect(b) {
  b.x = Math.max(-CLAMP_X, Math.min(CLAMP_X, b.x));
  b.y = Math.max(-CLAMP_Y, Math.min(CLAMP_Y, b.y));
}
// Normalised squared distance from the day-ra ellipse centre (1 = on
// the ring): the ring-out test and the finish tie-break share it.
function ellipseDist(b, R) {
  const ex = b.x / (R * (4 / 3)), ey = b.y / (R * (3 / 4));
  return ex * ex + ey * ey;
}
function simulateTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  if (g.tickCount % 32 === 0 && g.arenaR > ARENA_RMIN) g.arenaR = Math.max(ARENA_RMIN, g.arenaR - 0.5);
  const moves = {};
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    const mv = { x: 0, y: 0, shove: false, dash: false };
    if (p.type === 'human') {
      const pad = g.pad[p.seat] || {};
      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);
      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);
      mv.shove = !!pad.a;
      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;
    } else {
      const intent = botBrain(room, p);
      mv.x = intent.x; mv.y = intent.y; mv.shove = intent.shove;
    }
    moves[p.seat] = mv;
  });
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;
    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;
  });
  const alive = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const A = g.blobs[alive[i].seat], B = g.blobs[alive[j].seat];
      let dx = B.x - A.x, dy = B.y - A.y;
      let d = Math.hypot(dx, dy);
      if (d < 1.6) {
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        const push = (1.6 - d) / 2;
        A.x -= (dx / d) * push; A.y -= (dy / d) * push;
        B.x += (dx / d) * push; B.y += (dy / d) * push;
      }
    }
  }
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.shoveCd[p.seat] > 0) g.shoveCd[p.seat] -= 1;
    if (!mv.shove || g.shoveCd[p.seat] > 0) return;
    let foe = null, foeD = 1e9;
    room.players.forEach((q) => {
      if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {
        const d = Math.hypot(g.blobs[q.seat].x - b.x, g.blobs[q.seat].y - b.y);
        if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; }
      }
    });
    if (foe && foeD <= SHOVE_RANGE && foeD > 0.01) {
      foe.x += ((foe.x - b.x) / foeD) * SHOVE_FORCE * (4 / 3);
      foe.y += ((foe.y - b.y) / foeD) * SHOVE_FORCE * (3 / 4);
      g.shoveCd[p.seat] = SHOVE_CD_TICKS;
    }
  });
  trackEnd(room, trk);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    // The shrinking ring is an ELLIPSE in the wide field: radii
    // (arenaR*4/3, arenaR*3/4); outside it costs a life.
    if (ellipseDist(b, g.arenaR) > 1) {
      b.lives -= 1;
      b.vx = 0; b.vy = 0;
      if (b.lives > 0) {
        const ang = rand(0, Math.PI * 2); const rr = g.arenaR * 0.3 * Math.random();
        b.x = Math.cos(ang) * rr * (4 / 3); b.y = Math.sin(ang) * rr * (3 / 4);
      } else { b.alive = false; g.elimOrder.push(p.seat); }
    }
  });
  const snap = {};
  room.players.forEach((p) => { if (p.type === 'human') snap[p.seat] = Object.assign({}, g.pad[p.seat] || {}); });
  g.padPrev = snap;
  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;
  if (aliveCount <= 1) finishArena(room);
}
function finishArena(room) {
  const g = room.game;
  const aliveRanked = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive)
    .sort((a, b) => (g.blobs[b.seat].lives - g.blobs[a.seat].lives)
      || (ellipseDist(g.blobs[a.seat], g.arenaR) - ellipseDist(g.blobs[b.seat], g.arenaR))
      || (a.seat - b.seat));
  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);
  const ranking = aliveRanked.concat(elimRanked);
  const entries = ranking.map((p, i) => ({ seat: p.seat, points: placementAt(i), lives: g.blobs[p.seat].lives, alive: g.blobs[p.seat].alive }));
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}

// --- Game 7: Né Đạn (tick arena survival, walled arena) ---------------------
// Same tick simulation + pad held-state as Đẩy Ra Khỏi Sàn, but the arena
// has walls (blobs clamp inside, no ring-out, no shrinking). Cannonballs
// spawn from the edges on ticks and cross the field; a hit costs 1 of 3
// lives and grants INVULN_TICKS ticks of invulnerability so one ball can
// never multi-hit. Ranking: survivors first (most lives), then by elimination
// tick (eliminated later = better). Placement awarded once per match
// (300/200/100/50) like the other arena game — the ×2 rule is rounds-only.
function stepDodge(room, t) {
  const g = room.game;
  if (g.phase !== 'dodge') return false;
  if (t >= g.endsAt) { finishDodge(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'dodge') {
      simulateDodgeTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function botBrainDodge(room, p) {
  // Né Laze bot: read the telegraphed beams. Escape sideways out of
  // the beam line when there is time; jump a LOW beam when there is
  // not; never jump into a HIGH beam. Reaction cadence by difficulty
  // (kho re-reads every 8 ticks — inside the 12-tick telegraph; de
  // every 24 — often too late, as an easy bot should be).
  const g = room.game;
  const every = p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24;
  const prev = g.botIntent[p.seat];
  if (prev && (g.tickCount + p.seat) % every !== 0) return { x: prev.x, y: prev.y, jump: false };
  const me = g.blobs[p.seat];
  if (!me) return { x: 0, y: 0, jump: false };
  let mx = 0, my = 0, jump = false;
  let threat = null, threatScore = -1;
  (g.lasers || []).forEach((L) => {
    const dist = L.axis === 'h' ? me.y - L.pos : me.x - L.pos;
    if (Math.abs(dist) >= LASER_HIT + 0.45) return; // line does not cover me
    const score = (L.state === 'fire' ? 100 : 50) - L.tLeft + (Math.abs(dist) < 0.3 ? 10 : 0);
    if (score > threatScore) { threatScore = score; threat = { L, dist }; }
  });
  if (threat) {
    const { L, dist } = threat;
    const away = dist >= 0 ? 1 : -1;
    if (L.axis === 'h') my = away; else mx = away;
    const canJump = (g.jumpCd[p.seat] || 0) <= 0 && (me.air || 0) <= 0;
    if (L.kind === 'low' && canJump && (L.state === 'fire' || L.tLeft <= 3)) jump = true;
    // A HIGH beam while airborne: keep running out (cannot un-jump).
  } else {
    // No threat: drift back towards the centre.
    if (Math.abs(me.x) > 2) mx = -Math.sign(me.x);
    if (Math.abs(me.y) > 1.5) my = -Math.sign(me.y);
  }
  const intent = { x: mx, y: my, jump };
  g.botIntent[p.seat] = intent;
  return intent;
}
function spawnLaser(room) {
  const g = room.game;
  const axis = Math.random() < 0.5 ? 'h' : 'v';
  const kind = Math.random() < 0.62 ? 'low' : 'high';
  let pos;
  const alive = room.players.filter((pl) => g.blobs[pl.seat] && g.blobs[pl.seat].alive);
  if (alive.length && Math.random() < 0.55) {
    const b = g.blobs[alive[randInt(0, alive.length - 1)].seat];
    pos = (axis === 'h' ? b.y : b.x) + rand(-1.2, 1.2);
  } else {
    pos = axis === 'h' ? rand(-8, 8) : rand(-15, 15);
  }
  pos = Math.round(Math.max(axis === 'h' ? -8.2 : -15.2, Math.min(axis === 'h' ? 8.2 : 15.2, pos)) * 100) / 100;
  g.lasers.push({ id: ++g.laserSeq, axis, pos, kind, state: 'warn', tLeft: LASER_WARN_TICKS });
}
function simulateDodgeTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  const moves = {};
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    const mv = { x: 0, y: 0, dash: false, jump: false };
    if (p.type === 'human') {
      const pad = g.pad[p.seat] || {};
      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);
      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);
      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;
      mv.jump = !!pad.a && !(g.padPrev[p.seat] || {}).a;
    } else {
      const intent = botBrainDodge(room, p);
      mv.x = intent.x; mv.y = intent.y; mv.jump = !!intent.jump;
    }
    moves[p.seat] = mv;
  });
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    if (g.jumpCd[p.seat] > 0) g.jumpCd[p.seat] -= 1;
    if ((b.air || 0) > 0) b.air -= 1;
    if (mv.jump && (b.air || 0) <= 0 && g.jumpCd[p.seat] <= 0) { b.air = JUMP_TICKS; g.jumpCd[p.seat] = JUMP_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;
    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;
    clampRect(b); // the wide field's walls stop you
  });
  trackEnd(room, trk);
  // Lasers: spawn on a cadence that tightens as the match goes on
  // (gap starts ~2.1s, floor ~1.06s; late match can double up). Each
  // beam telegraphs for LASER_WARN_TICKS, then fires for
  // LASER_FIRE_TICKS and is gone.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    spawnLaser(room);
    if (g.tickCount > 400 && Math.random() < 0.35) spawnLaser(room);
    g.spawnIn = Math.max(17, 34 - 2 * Math.floor(g.tickCount / 192));
  }
  g.lasers.forEach((L) => { L.tLeft -= 1; });
  g.lasers = g.lasers.filter((L) => {
    if (L.tLeft > 0) return true;
    if (L.state === 'warn') { L.state = 'fire'; L.tLeft = LASER_FIRE_TICKS; return true; }
    return false;
  });
  // Hits: only firing beams bite. LOW hits grounded players (jump
  // it), HIGH hits airborne players (stay down). One hit per player
  // per tick at most; a hit grants the usual 2s of invulnerability.
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    if (g.invuln[p.seat] > 0) { g.invuln[p.seat] -= 1; return; }
    const airborne = (b.air || 0) > 0;
    const hit = g.lasers.some((L) => {
      if (L.state !== 'fire') return false;
      const inLine = L.axis === 'h' ? Math.abs(b.y - L.pos) < LASER_HIT : Math.abs(b.x - L.pos) < LASER_HIT;
      if (!inLine) return false;
      return L.kind === 'low' ? !airborne : airborne;
    });
    if (!hit) return;
    b.lives -= 1;
    g.invuln[p.seat] = INVULN_TICKS;
    if (b.lives <= 0) { b.alive = false; g.elimOrder.push(p.seat); g.elimTick[p.seat] = g.tickCount; }
  });
  const snap = {};
  room.players.forEach((p) => { if (p.type === 'human') snap[p.seat] = Object.assign({}, g.pad[p.seat] || {}); });
  g.padPrev = snap;
  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;
  if (aliveCount <= 1) finishDodge(room);
}
function finishDodge(room) {
  const g = room.game;
  const aliveRanked = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive)
    .sort((a, b) => (g.blobs[b.seat].lives - g.blobs[a.seat].lives) || (a.seat - b.seat));
  const elimRanked = g.elimOrder.slice()
    .sort((x, y) => ((g.elimTick[y] || 0) - (g.elimTick[x] || 0)) || (x - y))
    .map((seat) => playerAt(room, seat)).filter(Boolean);
  const ranking = aliveRanked.concat(elimRanked);
  const entries = ranking.map((p, i) => ({
    seat: p.seat, points: placementAt(i),
    lives: g.blobs[p.seat].lives, alive: g.blobs[p.seat].alive, elimTick: g.elimTick[p.seat] || null,
  }));
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}

// --- Game 8: Kéo Co (team tug of war) ---------------------------------------
// Teams are fixed by seat parity: odd seats = team A, even seats = team B.
// Scoring rule (uniform for every team size): each member of the winning
// team scores 300, each member of the losing team scores 200; an exact
// tie at time out is a draw and everyone scores 200. Single match, so no
// final-round ×2. Human presses are counted at action time on the rising
// edge of the pad's B button; bots accumulate BOT_TUG presses per tick.
function collectMoves(room, brain) {
  const g = room.game;
  const moves = {};
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    const mv = { x: 0, y: 0, shove: false, dash: false, burst: false };
    if (p.type === 'human') {
      const pad = g.pad[p.seat] || {};
      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);
      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);
      mv.shove = !!pad.a;
      mv.burst = !!pad.a && !(g.padPrev[p.seat] || {}).a;
      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;
    } else {
      const intent = brain(room, p);
      mv.x = intent.x; mv.y = intent.y; mv.shove = !!intent.shove;
      mv.dash = !!intent.dash; mv.burst = !!intent.burst;
    }
    moves[p.seat] = mv;
  });
  return moves;
}
function applyMoves(room, moves, opts) {
  const g = room.game;
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;
    let stepMul = 1;
    if (opts.holderSeat === p.seat) stepMul = HOLDER_SPEED;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;
    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;
    if (opts.clampBox) {
      // Sơn Sàn: clamp to the paint grid's extent (cells span
      // [-14.4,14.4]x[-8,8]); other clampBox callers pass a square m.
      const mx = opts.clampX != null ? opts.clampX : opts.clampBox;
      const my = opts.clampY != null ? opts.clampY : opts.clampBox;
      b.x = Math.max(-mx, Math.min(mx, b.x)); b.y = Math.max(-my, Math.min(my, b.y));
    } else {
      clampRect(b); // the wide field's walls stop you
    }
  });
}
function separateBlobs(room) {
  const g = room.game;
  const alive = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const A = g.blobs[alive[i].seat], B = g.blobs[alive[j].seat];
      let dx = B.x - A.x, dy = B.y - A.y;
      let d = Math.hypot(dx, dy);
      if (d < 1.6) {
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        const push = (1.6 - d) / 2;
        A.x -= (dx / d) * push; A.y -= (dy / d) * push;
        B.x += (dx / d) * push; B.y += (dy / d) * push;
      }
    }
  }
}
// A-button shoves for the walled games. onHit(room, attackerSeat,
// victimSeat, vx, vy) receives the victim's position from BEFORE the
// knockback displacement (where the victim stood when hit).
function applyShoves(room, moves, force, onHit) {
  const g = room.game;
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.shoveCd[p.seat] > 0) g.shoveCd[p.seat] -= 1;
    if (!mv.shove || g.shoveCd[p.seat] > 0) return;
    let foe = null, foeSeat = null, foeD = 1e9;
    room.players.forEach((q) => {
      if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {
        const d = Math.hypot(g.blobs[q.seat].x - b.x, g.blobs[q.seat].y - b.y);
        if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; foeSeat = q.seat; }
      }
    });
    if (foe && foeD <= SHOVE_RANGE && foeD > 0.01) {
      const vx = foe.x, vy = foe.y;
      foe.x += ((foe.x - b.x) / foeD) * force * (4 / 3);
      foe.y += ((foe.y - b.y) / foeD) * force * (3 / 4);
      clampRect(foe); // the wall stops the knockback too
      g.shoveCd[p.seat] = SHOVE_CD_TICKS;
      if (onHit) onHit(room, p.seat, foeSeat, vx, vy);
    }
  });
}
function snapshotPad(room) {
  const g = room.game;
  const snap = {};
  room.players.forEach((p) => { if (p.type === 'human') snap[p.seat] = Object.assign({}, g.pad[p.seat] || {}); });
  g.padPrev = snap;
}
// Single-match ranking shared by the three games: most of `values` wins;
// ties go to the earlier seat (stated rule, applied consistently).
function finishByValue(room, values, valueKey) {
  const g = room.game;
  const ranking = room.players.slice()
    .sort((a, b) => ((values[b.seat] || 0) - (values[a.seat] || 0)) || (a.seat - b.seat));
  const entries = ranking.map((p, i) => {
    const e = { seat: p.seat, points: placementAt(i) };
    e[valueKey] = values[p.seat] || 0;
    return e;
  });
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}
// ---------------------------------------------------------------------------
// Co-op finish path: a team score maps to a tier via a descending table
// of [minScore, tier]; every player banks TIER_POINTS[tier]. The results
// screen reads room.lastGame.teamResult for the team banner.
// ---------------------------------------------------------------------------
function coopTier(score, table) {
  for (let i = 0; i < table.length; i++) { if (score >= table[i][0]) return table[i][1]; }
  return 'none';
}
function finishCoop(room, score, tier, unit) {
  const g = room.game;
  const pointsEach = TIER_POINTS[tier];
  g.teamResult = { score, tier, tierLabel: TIER_LABELS[tier], pointsEach, unit };
  const entries = room.players.map((p) => ({ seat: p.seat, points: pointsEach }));
  entries.forEach((e) => { g.points[e.seat] = pointsEach; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}
// Chèo Thuyền: one in-window stroke adds an equal share of a full stroke.
function addRowDistance(room, seat) {
  const g = room.game;
  g.distance = Math.round((g.distance + ROW_FULL_STROKE / Math.max(1, room.players.length)) * 1000) / 1000;
  g.hits[seat] = (g.hits[seat] || 0) + 1;
}
function brainCadence(p) { return p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24; }
function cachedIntent(room, p) {
  const g = room.game;
  const prev = g.botIntent[p.seat];
  if (prev && (g.tickCount + p.seat) % brainCadence(p) !== 0) return { x: prev.x, y: prev.y, shove: false, dash: false, burst: false };
  return null;
}
function nearestFoe(room, p) {
  const g = room.game;
  const me = g.blobs[p.seat];
  let foe = null, foeSeat = null, foeD = 1e9;
  room.players.forEach((q) => {
    if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {
      const d = Math.hypot(g.blobs[q.seat].x - me.x, g.blobs[q.seat].y - me.y);
      if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; foeSeat = q.seat; }
    }
  });
  return { foe, foeSeat, foeD };
}
function dirIntent(tx, ty) {
  return { x: Math.abs(tx) > 0.4 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.4 ? Math.sign(ty) : 0 };
}

// --- Game 10: Cướp Sao (star grab arena, walled) ---------------------------
// Stars sit on the field; flying over one banks its value at once (a
// golden star is worth 3). The A shove has extra knockback here and
// knocks one banked point out of the victim as a loose star where they
// stood. Ranked by banked value after STEAL_MS; ties -> earlier seat.
function spawnStar(room, gold) {
  const g = room.game;
  let x = 0, y = 0;
  for (let i = 0; i < 8; i++) {
    const ang = rand(0, Math.PI * 2); const rr = rand(2, 8.5);
    x = Math.cos(ang) * rr * (4 / 3); y = Math.sin(ang) * rr * (3 / 4);
    let ok = true;
    (g.stars || []).forEach((s) => { if (Math.hypot(s.x - x, s.y - y) < 2) ok = false; });
    if (ok) break;
  }
  g.starSeq += 1;
  g.stars.push({ id: g.starSeq, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, gold: !!gold, pickAt: g.tickCount });
}
function botBrainSteal(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  let star = null, sd = 1e9;
  (g.stars || []).forEach((s) => {
    const d = Math.hypot(s.x - me.x, s.y - me.y) * (s.gold && p.difficulty !== 'de' ? 0.4 : 1);
    if (d < sd) { sd = d; star = s; }
  });
  let tx = 0, ty = 0, dash = false, shove = false;
  if (star) {
    tx = star.x - me.x; ty = star.y - me.y;
    if (star.gold && Math.hypot(tx, ty) > 4 && p.difficulty !== 'de') dash = true;
  }
  const near = nearestFoe(room, p);
  if (!star && near.foe) { tx = near.foe.x - me.x; ty = near.foe.y - me.y; }
  if (near.foe && near.foeD <= SHOVE_RANGE) {
    const leader = Math.max.apply(null, room.players.map((q) => g.banked[q.seat] || 0));
    const isLeader = (g.banked[near.foeSeat] || 0) > 0 && (g.banked[near.foeSeat] || 0) === leader;
    const prob = p.difficulty === 'kho' ? 0.85 : p.difficulty === 'vua' ? 0.55 : 0.3;
    if ((isLeader || !star) && Math.random() < prob) shove = true;
  }
  if (p.difficulty === 'de' && Math.random() < 0.2) { tx = randInt(-1, 1); ty = randInt(-1, 1); }
  const intent = Object.assign(dirIntent(tx, ty), { shove, dash });
  g.botIntent[p.seat] = intent;
  return intent;
}
function stepSteal(room, t) {
  const g = room.game;
  if (g.phase !== 'steal') return false;
  if (t >= g.endsAt) { finishByValue(room, g.banked, 'banked'); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'steal') {
      simulateStealTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateStealTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  const moves = collectMoves(room, botBrainSteal);
  applyMoves(room, moves, {});
  separateBlobs(room);
  applyShoves(room, moves, STEAL_SHOVE_FORCE, (rm, attackerSeat, victimSeat, vx, vy) => {
    const gg = rm.game;
    if ((gg.banked[victimSeat] || 0) > 0) {
      gg.banked[victimSeat] -= 1;
      gg.starSeq += 1;
      gg.stars.push({ id: gg.starSeq, x: Math.round(vx * 100) / 100, y: Math.round(vy * 100) / 100, gold: false, pickAt: gg.tickCount + DROP_LOCK_TICKS, dropped: true });
    }
  });
  // Pickups: the nearest blob in range banks the star (ties -> the
  // earlier seat, which is room.players order).
  const remaining = [];
  (g.stars || []).forEach((s) => {
    let taker = null, td = 1e9;
    if (g.tickCount >= (s.pickAt || 0)) {
      room.players.forEach((p) => {
        const b = g.blobs[p.seat];
        if (!b || !b.alive) return;
        const d = Math.hypot(b.x - s.x, b.y - s.y);
        if (d <= 1.3 && d < td) { td = d; taker = p.seat; }
      });
    }
    if (taker) g.banked[taker] = (g.banked[taker] || 0) + (s.gold ? 3 : 1);
    else remaining.push(s);
  });
  g.stars = remaining;
  trackEnd(room, trk);
  let normals = g.stars.filter((s) => !s.gold).length;
  while (normals < 2) { spawnStar(room, false); normals += 1; }
  g.goldIn -= 1;
  if (g.goldIn <= 0) {
    if (!g.stars.some((s) => s.gold)) spawnStar(room, true);
    g.goldIn = GOLD_EVERY_TICKS;
  }
  snapshotPad(room);
}

// --- Game 11: Giữ Vương Miện (keep the crown, walled arena) ----------------
// The crown rests at the centre; touching it picks it up. The holder
// banks +1 hold point per 250ms survived and moves at HOLDER_SPEED; a
// shove knocks the crown loose a short way away, and it then stays
// unpickable for CROWN_LOCK_TICKS ticks (1s) so the victim cannot
// instantly re-grab it. Ranked by hold points; ties -> earlier seat.
function botBrainCrown(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  let tx = 0, ty = 0, shove = false, dash = false;
  const near = nearestFoe(room, p);
  if (g.crown.holder === p.seat) {
    // Flee with the crown: away from the nearest foe, biased back
    // towards the centre when hugging the wall.
    if (near.foe) { tx = me.x - near.foe.x; ty = me.y - near.foe.y; }
    if (ellipseDist(me, ARENA_R0) > 0.49) { tx += -me.x * 0.7; ty += -me.y * 0.7; }
  } else {
    const tp = g.crown.holder ? g.blobs[g.crown.holder] : g.crown;
    tx = tp.x - me.x; ty = tp.y - me.y;
    const d = Math.hypot(tx, ty);
    if (d > 5 && p.difficulty !== 'de') dash = true;
    if (g.crown.holder && d <= SHOVE_RANGE) {
      const prob = p.difficulty === 'kho' ? 0.85 : p.difficulty === 'vua' ? 0.55 : 0.3;
      if (Math.random() < prob) shove = true;
    }
  }
  const intent = Object.assign(dirIntent(tx, ty), { shove, dash });
  g.botIntent[p.seat] = intent;
  return intent;
}
function stepCrown(room, t) {
  const g = room.game;
  if (g.phase !== 'crown') return false;
  if (t >= g.endsAt) { finishByValue(room, g.hold, 'hold'); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'crown') {
      simulateCrownTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateCrownTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  const moves = collectMoves(room, botBrainCrown);
  applyMoves(room, moves, { holderSeat: g.crown.holder });
  separateBlobs(room);
  applyShoves(room, moves, SHOVE_FORCE, (rm, attackerSeat, victimSeat, vx, vy) => {
    const gg = rm.game;
    if (gg.crown.holder === victimSeat) {
      const ab = gg.blobs[attackerSeat];
      let dx = vx - ab.x, dy = vy - ab.y;
      const d = Math.hypot(dx, dy) || 1;
      const crownPos = { x: vx + (dx / d) * 1.6 * (4 / 3), y: vy + (dy / d) * 1.6 * (3 / 4) };
      clampRect(crownPos);
      gg.crown.holder = null;
      gg.crown.acc = 0;
      gg.crown.x = Math.round(crownPos.x * 100) / 100; gg.crown.y = Math.round(crownPos.y * 100) / 100;
      gg.crown.lockTicks = CROWN_LOCK_TICKS;
    }
  });
  trackEnd(room, trk);
  if (g.crown.holder) {
    const hb = g.blobs[g.crown.holder];
    g.crown.x = hb.x; g.crown.y = hb.y;
    // +1 hold point per 250ms of holding: at the 62.5ms tick, accrue
    // one point per four ticks spent holding (counted from the pickup,
    // so the rate is exact regardless of tick parity).
    g.crown.acc = (g.crown.acc || 0) + 1;
    if (g.crown.acc >= 4) { g.crown.acc = 0; g.hold[g.crown.holder] = (g.hold[g.crown.holder] || 0) + 1; }
  } else if (g.crown.lockTicks > 0) {
    g.crown.lockTicks -= 1;
  } else {
    let taker = null, td = 1e9;
    room.players.forEach((p) => {
      const b = g.blobs[p.seat];
      if (!b || !b.alive) return;
      const d = Math.hypot(b.x - g.crown.x, b.y - g.crown.y);
      if (d <= 1.3 && d < td) { td = d; taker = p.seat; }
    });
    if (taker) {
      g.crown.holder = taker;
      g.crown.acc = 0;
      g.hold[taker] = (g.hold[taker] || 0) + 1;
    }
  }
  snapshotPad(room);
}

// --- Game 12: Sơn Sàn (paint the floor, walled square arena) ---------------
// The floor is a 12x12 grid; entering a cell paints it your colour and
// opponents can repaint it. A (rising edge) fires a 3x3 paint burst with
// a 2s cooldown — the one flourish kept, because it makes comebacks
// possible without complicating the base loop. Ranked by cells owned at
// the end; ties -> earlier seat.
function botBrainShared(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  let want;
  if (cached) want = cached;
  else {
    const me = g.shared;
    let tx = g.star ? g.star.x - me.x : 0, ty = g.star ? g.star.y - me.y : 0;
    let ball = null, bd = 1e9;
    (g.balls || []).forEach((b) => {
      const d = Math.hypot(b.x - me.x, b.y - me.y);
      if (d < bd) { bd = d; ball = b; }
    });
    if (ball && bd < 5) { tx = me.x - ball.x; ty = me.y - ball.y; } // flee the nearest ball
    want = dirIntent(tx, ty);
    g.botIntent[p.seat] = { x: want.x, y: want.y };
  }
  // Cooperate: a bot may only push the directions it owns.
  return {
    x: (want.x > 0 && g.owners.r === p.seat) || (want.x < 0 && g.owners.l === p.seat) ? want.x : 0,
    y: (want.y > 0 && g.owners.d === p.seat) || (want.y < 0 && g.owners.u === p.seat) ? want.y : 0,
  };
}

function spawnSharedStar(room) {
  const g = room.game;
  let x = 0, y = 0;
  for (let i = 0; i < 8; i++) {
    const ang = rand(0, Math.PI * 2); const rr = rand(2.5, 8.5);
    x = Math.cos(ang) * rr * (4 / 3); y = Math.sin(ang) * rr * (3 / 4);
    if (!g.shared || Math.hypot(x - g.shared.x, y - g.shared.y) >= 3) break;
  }
  g.star = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  g.starTick = g.tickCount;
}

function stepShared(room, t) {
  const g = room.game;
  if (g.phase !== 'shared') return false;
  if (t >= g.endsAt) { finishShared(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'shared') {
      simulateSharedTick(room);
      if (room.game !== g) return true; // hearts ran out mid-tick
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateSharedTick(room) {
  const g = room.game;
  g.tickCount += 1;
  // Sum the owned-direction inputs: each direction has exactly one
  // owner, so the blob moves at most MOVE_STEP per axis per tick.
  let mx = 0, my = 0;
  room.players.forEach((p) => {
    let ix = 0, iy = 0;
    if (p.type === 'human') {
      const pad = g.pad[p.seat] || {};
      ix = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);
      iy = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);
    } else {
      const intent = botBrainShared(room, p);
      ix = intent.x; iy = intent.y;
    }
    if (ix > 0 && g.owners.r === p.seat) mx += 1;
    if (ix < 0 && g.owners.l === p.seat) mx -= 1;
    if (iy > 0 && g.owners.d === p.seat) my += 1;
    if (iy < 0 && g.owners.u === p.seat) my -= 1;
  });
  const b = g.shared;
  const ox = b.x, oy = b.y;
  b.x += mx * STEP_X; b.y += my * STEP_Y;
  clampRect(b); // walled arena
  b.x = Math.round(b.x * 100) / 100; b.y = Math.round(b.y * 100) / 100;
  b.vx = Math.round((b.x - ox) * 100) / 100; b.vy = Math.round((b.y - oy) * 100) / 100;
  // Checkpoint touch scores for the team; a stale star respawns.
  if (g.star && Math.hypot(g.star.x - b.x, g.star.y - b.y) <= 1.3) { g.checks += 1; spawnSharedStar(room); }
  else if (g.star && g.tickCount - g.starTick >= STAR_STALE_TICKS) spawnSharedStar(room);
  // Cannonballs: same edge-spawn pattern as Né Đạn, lower density.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    const side = randInt(0, 3);
    let x = 0, y = 0;
    if (side === 0) { x = -17.5; y = rand(-8.5, 8.5); } else if (side === 1) { x = 17.5; y = rand(-8.5, 8.5); }
    else if (side === 2) { x = rand(-15.5, 15.5); y = -10.5; } else { x = rand(-15.5, 15.5); y = 10.5; }
    const tx = rand(-8, 8), ty = rand(-4.5, 4.5);
    const dx = tx - x, dy = ty - y; const dd = Math.hypot(dx, dy) || 1;
    g.balls.push({ x, y, vx: (dx / dd) * SHARED_BALL_SPEED * (4 / 3), vy: (dy / dd) * SHARED_BALL_SPEED * (3 / 4) });
    g.spawnIn = Math.max(40, 64 - 2 * Math.floor(g.tickCount / 384));
  }
  g.balls.forEach((ball) => { ball.x += ball.vx; ball.y += ball.vy; });
  g.balls = g.balls.filter((ball) => Math.abs(ball.x) <= 19 && Math.abs(ball.y) <= 12);
  if (g.sharedInvuln > 0) g.sharedInvuln -= 1;
  else {
    const idx = g.balls.findIndex((ball) => Math.hypot(ball.x - b.x, ball.y - b.y) < BALL_HIT_DIST);
    if (idx >= 0) {
      g.balls.splice(idx, 1);
      g.hearts -= 1;
      g.sharedInvuln = INVULN_TICKS;
      if (g.hearts <= 0) { finishShared(room); return; }
    }
  }
  snapshotPad(room);
}
function finishShared(room) {
  const g = room.game;
  finishCoop(room, g.checks, coopTier(g.checks, SHARED_TIERS), 'điểm kiểm tra');
}

// --- Game 15: Đẩy Hộp Về Đích (co-op crate pushing through a maze) ---------
// The crate is a circle of radius BOX_CRATE_R for collision. Each tick,
// players overlapping the crate contribute their movement direction to a
// push sum; the crate slides by the normalized sum * MOVE_STEP *
// BOX_STEP_MUL ONLY when >= 2 distinct players are in contact AND |sum|
// >= BOX_PUSH_MIN — one player alone can never move it, and two players
// pushing against each other cancel out. Rect walls block players and
// crate alike (axis-separate slide). Delivering the crate centre into
// the goal zone scores +1 and loads the next layout (rotating).
// 16:9 WAVE: the three mazes are redrawn for the wide field (crate /
// goal / wall rects mapped x*4/3, y*3/4 from the old layouts, goals
// widened a touch); the >=2-pushers rule is untouched.
const BOX_LAYOUTS = [
  { crate: { x: -8.6, y: 0 }, goal: { x: 8.7, y: -1.1, w: 4, h: 2.2 }, walls: [
    { x: -2, y: 2.2, w: 4, h: 0.85 }, { x: -2, y: -3.05, w: 4, h: 0.85 } ] },
  { crate: { x: -8.7, y: -3.75 }, goal: { x: 8, y: 2.6, w: 4.3, h: 2.25 }, walls: [
    { x: -12.3, y: 1.35, w: 8.5, h: 0.9 }, { x: 3.7, y: -2.25, w: 8.5, h: 0.9 } ] },
  { crate: { x: 0, y: -4.9 }, goal: { x: -2.1, y: 3.9, w: 4.3, h: 2.25 }, walls: [
    { x: -4.8, y: -0.75, w: 1.5, h: 2.85 }, { x: 3.3, y: -0.75, w: 1.5, h: 2.85 }, { x: -3.3, y: 2.1, w: 8.1, h: 0.85 } ] },
];
function loadBoxLayout(room) {
  const g = room.game;
  const L = BOX_LAYOUTS[g.layout % BOX_LAYOUTS.length];
  g.crate = { x: L.crate.x, y: L.crate.y };
  g.goal = { x: L.goal.x, y: L.goal.y, w: L.goal.w, h: L.goal.h };
  g.walls = L.walls.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h }));
}
function circleRectHit(cx, cy, r, w) {
  const nx = Math.max(w.x, Math.min(cx, w.x + w.w));
  const ny = Math.max(w.y, Math.min(cy, w.y + w.h));
  return Math.hypot(cx - nx, cy - ny) < r;
}
function slideCircle(pos, dx, dy, r, walls, clampM, clampMY) {
  if (dx) {
    const nx = pos.x + dx;
    if (!walls.some((w) => circleRectHit(nx, pos.y, r, w))) pos.x = nx;
  }
  if (dy) {
    const ny = pos.y + dy;
    if (!walls.some((w) => circleRectHit(pos.x, ny, r, w))) pos.y = ny;
  }
  pos.x = Math.max(-clampM, Math.min(clampM, pos.x));
  const my = clampMY != null ? clampMY : clampM;
  pos.y = Math.max(-my, Math.min(my, pos.y));
}
function botBrainBox(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  const c = g.crate; const gl = g.goal;
  const gx = gl.x + gl.w / 2, gy = gl.y + gl.h / 2;
  const dGoal = Math.hypot(gx - c.x, gy - c.y) || 1;
  // Stand on the far side of the crate from the goal, then push into it.
  const bx = c.x - ((gx - c.x) / dGoal) * (BOX_CRATE_R + 0.85);
  const by = c.y - ((gy - c.y) / dGoal) * (BOX_CRATE_R + 0.85);
  const inContact = Math.hypot(c.x - me.x, c.y - me.y) <= BOX_CRATE_R + 0.85;
  const intent = inContact ? dirIntent(gx - c.x, gy - c.y) : dirIntent(bx - me.x, by - me.y);
  g.botIntent[p.seat] = { x: intent.x, y: intent.y };
  return intent;
}
function stepBox(room, t) {
  const g = room.game;
  if (g.phase !== 'box') return false;
  if (t >= g.endsAt) { finishBox(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'box') {
      simulateBoxTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateBoxTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  const moves = collectMoves(room, botBrainBox);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;
    slideCircle(b, mv.x * STEP_X * stepMul, mv.y * STEP_Y * stepMul, 0.8, g.walls, CLAMP_X, CLAMP_Y);
  });
  separateBlobs(room);
  trackEnd(room, trk);
  const c = g.crate;
  const cox = c.x, coy = c.y;
  // Body-block: nobody may stand inside the crate; contact pushes out.
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    const dx = b.x - c.x, dy = b.y - c.y; const d = Math.hypot(dx, dy);
    const minD = BOX_CRATE_R + 0.8;
    if (d < minD) {
      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
      b.x = c.x + ux * minD; b.y = c.y + uy * minD;
    }
  });
  // The push itself: needs >= 2 distinct players in contact and a
  // summed intent of magnitude >= BOX_PUSH_MIN.
  const contact = room.players.filter((p) => {
    const b = g.blobs[p.seat];
    return b && b.alive && Math.hypot(b.x - c.x, b.y - c.y) <= BOX_CRATE_R + 0.8 + 0.05;
  });
  if (contact.length >= 2) {
    let sx = 0, sy = 0;
    contact.forEach((p) => { const mv = moves[p.seat]; if (mv) { sx += mv.x; sy += mv.y; } });
    const mag = Math.hypot(sx, sy);
    if (mag >= BOX_PUSH_MIN) {
      slideCircle(c, (sx / mag) * STEP_X * BOX_STEP_MUL, (sy / mag) * STEP_Y * BOX_STEP_MUL,
        BOX_CRATE_R, g.walls, CLAMP_X - BOX_CRATE_R, CLAMP_Y - BOX_CRATE_R);
    }
  }
  c.x = Math.round(c.x * 100) / 100; c.y = Math.round(c.y * 100) / 100;
  c.vx = Math.round((c.x - cox) * 100) / 100; c.vy = Math.round((c.y - coy) * 100) / 100;
  const gl = g.goal;
  if (c.x >= gl.x && c.x <= gl.x + gl.w && c.y >= gl.y && c.y <= gl.y + gl.h) {
    g.deliveries += 1;
    g.layout = (g.layout + 1) % BOX_LAYOUTS.length;
    loadBoxLayout(room);
  }
  snapshotPad(room);
}
function finishBox(room) {
  const g = room.game;
  finishCoop(room, g.deliveries, coopTier(g.deliveries, BOX_TIERS), 'lượt giao');
}

// --- Game 16: Chèo Thuyền (co-op rhythm rowing, phase-based) ---------------
// Beats fall every ROW_BEAT_MS for ROW_BEATS beats. A tap counts as an
// in-window stroke when its server receipt time is within
// +-ROW_WINDOW_MS of a beat time (handled in playerAction); anything
// else splashes (a miss: counted, no advance, no penalty). Per beat the
// boat advances (fraction of the room stroking in that beat's window) *
// ROW_FULL_STROKE, so a perfect team covers ROW_PERFECT metres and
// finishes the ROW_COURSE course with ~5 beats to spare. Bots "press"
// when their beat's window closes, with a difficulty timing error
// (ROW_ERR): Dễ at +-380ms sometimes lands outside the window entirely.
function stepRow(room, t) {
  const g = room.game;
  if (g.phase !== 'row') return false;
  let progressed = false;
  while (g.beatDone < ROW_BEATS && t >= g.rowStart + g.beatDone * ROW_BEAT_MS + ROW_WINDOW_MS) {
    resolveRowBeat(room, g.beatDone);
    g.beatDone += 1;
    progressed = true;
  }
  if (t >= g.endsAt) { finishRow(room); return true; }
  return progressed;
}
function resolveRowBeat(room, k) {
  const g = room.game;
  room.players.forEach((p) => {
    if (p.type !== 'bot') return;
    const key = p.seat + ':' + k;
    if (g.stroked[key]) return;
    g.stroked[key] = 1;
    const E = ROW_ERR[p.difficulty] || 220;
    const err = Math.round(rand(-E, E));
    if (Math.abs(err) <= ROW_WINDOW_MS) addRowDistance(room, p.seat);
  });
}
function finishRow(room) {
  const g = room.game;
  const pct = (g.distance / ROW_PERFECT) * 100;
  finishCoop(room, Math.round(g.distance), coopTier(pct, ROW_TIERS), 'm');
}

// ---------------------------------------------------------------------------
// Views (filtered per role; quiz answers are never exposed before reveal)
// ---------------------------------------------------------------------------
function moodOf(room, p) {
  if (room.phase === 'lobby') return 'cuoi';
  const st = standingsOf(room);
  const rank = st.indexOf(p.seat);
  const n = st.length;
  const g = room.game;
  const moves = g && g.rankMoves ? (g.rankMoves[p.seat] || 0) : 0;
  if (n > 1 && rank === 0) return 'reo';
  if (moves < 0 && n > 1 && rank === n - 1) return 'buon';
  if (moves < 0) return 'ngacnhien';
  if (moves > 0) return 'reo';
  if (n > 2 && rank === n - 1) return 'buon';
  return 'cuoi';
}
// ---------------------------------------------------------------------------
// Wave 3: Xe Tăng / Đặt Bom / Kẻ Giả Mạo / Thủ Thành / Giải Mã Chung
// ---------------------------------------------------------------------------
// Shared movement for the walled tick games: dash handling matches
// applyMoves, then either a slideCircle pass against wall rects or
// the plain rectangle wall clamp of the wide field.
function moveBlobsWalled(room, moves, walls, clampM, clampMY) {
  const g = room.game;
  const trk = trackStart(room);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;
    if (walls) {
      slideCircle(b, mv.x * STEP_X * stepMul, mv.y * STEP_Y * stepMul, 0.8, walls, clampM, clampMY);
    } else {
      b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;
      clampRect(b);
    }
  });
  trackEnd(room, trk);
}
function damageBlob(room, seat) {
  const g = room.game;
  const b = g.blobs[seat];
  if (!b || !b.alive) return;
  b.lives -= 1;
  g.invuln[seat] = INVULN_TICKS;
  if (b.lives <= 0) { b.alive = false; g.elimOrder.push(seat); g.elimTick[seat] = g.tickCount; }
}
// Guns: facing follows the last movement direction; the A rising edge
// (collectMoves' burst) fires one shell per SHELL_CD_TICKS.
function processGuns(room, moves) {
  const g = room.game;
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive) return;
    if (g.fireCd[p.seat] > 0) g.fireCd[p.seat] -= 1;
    if (!mv) return;
    if (mv.x || mv.y) {
      const dd = Math.hypot(mv.x, mv.y);
      g.facing[p.seat] = { x: mv.x / dd, y: mv.y / dd };
    }
    if (mv.burst && g.fireCd[p.seat] <= 0) {
      const f = g.facing[p.seat] || { x: 1, y: 0 };
      g.shellSeq += 1;
      g.shells.push({
        id: g.shellSeq, seat: p.seat,
        x: Math.round((b.x + f.x * 1.1) * 100) / 100, y: Math.round((b.y + f.y * 1.1) * 100) / 100,
        vx: f.x * SHELL_SPEED, vy: f.y * SHELL_SPEED,
      });
      g.fireCd[p.seat] = SHELL_CD_TICKS;
    }
  });
}
// Shells fly straight; they die on cover walls and out of bounds, and
// hit the first valid target: enemy players (never the owner, never an
// invulnerable one — the shell passes through those) and/or slimes.
function stepShells(room, opts) {
  const g = room.game;
  const keep = [];
  for (const s of g.shells) {
    s.x += s.vx; s.y += s.vy;
    let dead = Math.abs(s.x) > 16.5 || Math.abs(s.y) > 9.5; // out of the wide field
    if (!dead && opts.walls) {
      dead = opts.walls.some((w) => s.x >= w.x - 0.1 && s.x <= w.x + w.w + 0.1 && s.y >= w.y - 0.1 && s.y <= w.y + w.h + 0.1);
    }
    if (!dead && opts.hitPlayers) {
      for (const q of room.players) {
        if (q.seat === s.seat) continue;
        const tb = g.blobs[q.seat];
        if (tb && tb.alive && (g.invuln[q.seat] || 0) <= 0 && Math.hypot(tb.x - s.x, tb.y - s.y) <= SHELL_HIT_DIST) {
          damageBlob(room, q.seat); dead = true; break;
        }
      }
    }
    if (!dead && opts.hitSlimes) {
      for (const sl of g.slimes) {
        if (Math.hypot(sl.x - s.x, sl.y - s.y) <= sl.r + 0.35) {
          sl.hp -= 1;
          if (sl.hp <= 0) { sl.dead = true; g.kills += 1; }
          dead = true; break;
        }
      }
    }
    if (!dead) keep.push(s);
  }
  g.shells = keep;
}
function tickInvuln(room) {
  const g = room.game;
  room.players.forEach((p) => { if ((g.invuln[p.seat] || 0) > 0) g.invuln[p.seat] -= 1; });
}

// --- Game 17: Xe Tăng Đấu Trường (tick arena, cover blocks) ---------------
// Tanks trade shells across a walled arena with four cover blocks
// (slideCircle collisions; shells die on the blocks). Placement is the
// shared arena rule (finishArena): alive first by lives, then the
// elimination order reversed.
function stepTank(room, t) {
  const g = room.game;
  if (g.phase !== 'tank') return false;
  if (t >= g.endsAt) { finishArena(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'tank') {
      simulateTankTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateTankTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = collectMoves(room, botBrainTank);
  moveBlobsWalled(room, moves, TANK_BLOCKS, CLAMP_X, CLAMP_Y);
  separateBlobs(room);
  processGuns(room, moves);
  stepShells(room, { walls: TANK_BLOCKS, hitPlayers: true });
  tickInvuln(room);
  snapshotPad(room);
  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;
  if (aliveCount <= 1) finishArena(room);
}
function shellPathBlocked(x1, y1, x2, y2) {
  for (let i = 1; i < 10; i++) {
    const x = x1 + (x2 - x1) * i / 10, y = y1 + (y2 - y1) * i / 10;
    if (TANK_BLOCKS.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h)) return true;
  }
  return false;
}
function botBrainTank(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  let tx = 0, ty = 0, burst = false, dash = false;
  // Sidestep a shell that is closing in on me.
  let dodge = null;
  (g.shells || []).forEach((s) => {
    if (s.seat === p.seat) return;
    const rx = me.x - s.x, ry = me.y - s.y;
    const d = Math.hypot(rx, ry);
    if (d < 4 && rx * s.vx + ry * s.vy > 0 && (!dodge || d < dodge.d)) {
      dodge = { x: Math.sign(-s.vy) || 1, y: Math.sign(s.vx) || 0, d };
    }
  });
  if (dodge) { tx = dodge.x; ty = dodge.y; dash = p.difficulty === 'kho'; }
  else {
    const near = nearestFoe(room, p);
    if (near.foe) {
      tx = near.foe.x - me.x; ty = near.foe.y - me.y;
      const f = g.facing[p.seat] || { x: 1, y: 0 };
      const dd = Math.hypot(tx, ty) || 1;
      const aligned = (tx / dd) * f.x + (ty / dd) * f.y > 0.9;
      if (aligned && !shellPathBlocked(me.x, me.y, near.foe.x, near.foe.y)) burst = true;
      if (near.foeD < 2.2) { tx = -tx; ty = -ty; } // keep some distance
    }
  }
  const intent = Object.assign(dirIntent(tx, ty), { burst, dash });
  g.botIntent[p.seat] = intent;
  return intent;
}

// --- Game 18: Đặt Bom (tick, grid arena, chain reactions) -----------------
// 16:9 wave: 15 columns span x in [-15,15] (cell centres -14+2c); the
// 9 rows are unchanged (centres -8+2r over the field's [-9,9]).
function bomCellX(c) { return -14 + c * 2; }
function bomCellY(r) { return -8 + r * 2; }
function bomColOf(x) { return Math.max(0, Math.min(BOM_COLS - 1, Math.floor((x + 15) / 2))); }
function bomRowOf(y) { return Math.max(0, Math.min(BOM_ROWS - 1, Math.floor((y + 9) / 2))); }
function bomIsHard(c, r) { return c % 2 === 1 && r % 2 === 1; }
const BOM_MID = (BOM_COLS - 1) / 2; // 7: the middle column of 15
// Spawn cells for up to 6 bombers: the four corners, then the top-
// and bottom-edge midpoints. Nobody ever stacks on a shared cell.
const BOM_SPAWNS = [[0, 0], [BOM_COLS - 1, BOM_ROWS - 1], [BOM_COLS - 1, 0], [0, BOM_ROWS - 1], [BOM_MID, 0], [BOM_MID, BOM_ROWS - 1]];
function bomIsSafe(c, r) {
  // Corner pockets: the 2x2 around each corner spawn (as always).
  if ((c <= 1 && r <= 1) || (c >= BOM_COLS - 2 && r >= BOM_ROWS - 2)
    || (c >= BOM_COLS - 2 && r <= 1) || (c <= 1 && r >= BOM_ROWS - 2)) return true;
  // Edge-mid pockets: the spawn cell plus the cell directly inward,
  // so a mid-edge bomber always has one guaranteed open step.
  return (c === BOM_MID && (r === 0 || r === 1)) || (c === BOM_MID && (r === BOM_ROWS - 1 || r === BOM_ROWS - 2));
}
function bomCellRect(c, r) { return { x: bomCellX(c) - 1, y: bomCellY(r) - 1, w: 2, h: 2 }; }
function blastCells(room, bomb) {
  const g = room.game;
  const hard = new Set(g.hardCells.map(([c, r]) => c + ',' + r));
  const soft = new Set(g.softCells.map(([c, r]) => c + ',' + r));
  const cells = [[bomb.col, bomb.row]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dc, dr] of dirs) {
    for (let k = 1; k <= 2; k++) {
      const c = bomb.col + dc * k, r = bomb.row + dr * k;
      if (c < 0 || c >= BOM_COLS || r < 0 || r >= BOM_ROWS) break;
      const key = c + ',' + r;
      if (hard.has(key)) break;
      cells.push([c, r]);
      if (soft.has(key)) break;
    }
  }
  return cells;
}
function detonateBombs(room, initial) {
  const g = room.game;
  const queue = initial.slice();
  const done = new Set();
  const allCells = [];
  const cellSet = new Set();
  while (queue.length) {
    const bomb = queue.shift();
    if (done.has(bomb.id)) continue;
    done.add(bomb.id);
    const cells = blastCells(room, bomb);
    cells.forEach(([c, r]) => {
      const key = c + ',' + r;
      if (!cellSet.has(key)) { cellSet.add(key); allCells.push([c, r]); }
    });
    // Chain reaction: any other live bomb caught in the blast goes off
    // in the same tick, with its own full blast cross.
    g.bombs.forEach((b) => {
      if (!done.has(b.id) && cells.some(([c, r]) => c === b.col && r === b.row)) queue.push(b);
    });
  }
  g.softCells = g.softCells.filter(([c, r]) => !cellSet.has(c + ',' + r));
  g.bombs = g.bombs.filter((b) => !done.has(b.id));
  g.blasts.push({ cells: allCells, until: now() + 650 });
  if (g.blasts.length > 3) g.blasts = g.blasts.slice(-3);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive || (g.invuln[p.seat] || 0) > 0) return;
    if (cellSet.has(bomColOf(b.x) + ',' + bomRowOf(b.y))) damageBlob(room, p.seat);
  });
}
function bomberWalls(room) {
  const g = room.game;
  const walls = [];
  g.hardCells.forEach(([c, r]) => walls.push(bomCellRect(c, r)));
  g.softCells.forEach(([c, r]) => walls.push(bomCellRect(c, r)));
  g.bombs.forEach((b) => { if (b.solid) walls.push({ x: b.x - 0.95, y: b.y - 0.95, w: 1.9, h: 1.9 }); });
  return walls;
}
function stepBomber(room, t) {
  const g = room.game;
  if (g.phase !== 'bomber') return false;
  if (t >= g.endsAt) { finishArena(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'bomber') {
      simulateBomberTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateBomberTick(room) {
  const g = room.game;
  g.tickCount += 1;
  // A bomb turns solid only once nobody stands on its cell, so the
  // planter can always walk off their own fresh bomb.
  g.bombs.forEach((b) => {
    if (b.solid) return;
    const occupied = room.players.some((p) => {
      const bb = g.blobs[p.seat];
      return bb && bb.alive && bomColOf(bb.x) === b.col && bomRowOf(bb.y) === b.row;
    });
    if (!occupied) b.solid = true;
  });
  const moves = collectMoves(room, botBrainBomber);
  moveBlobsWalled(room, moves, bomberWalls(room), 14.2, 8.2); // the grid spans [-15,15]x[-9,9], blobs keep 0.8 off the edge
  separateBlobs(room);
  // A places a bomb on the current cell; one live bomb per player.
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv || !mv.burst) return;
    if (g.bombs.some((x) => x.seat === p.seat)) return;
    const col = bomColOf(b.x), row = bomRowOf(b.y);
    if (g.bombs.some((x) => x.col === col && x.row === row)) return;
    g.bombSeq += 1;
    g.bombs.push({ id: g.bombSeq, seat: p.seat, col, row, x: bomCellX(col), y: bomCellY(row), boomTick: g.tickCount + BOM_FUSE_TICKS, solid: false });
  });
  const due = g.bombs.filter((b) => g.tickCount >= b.boomTick);
  if (due.length) detonateBombs(room, due);
  tickInvuln(room);
  snapshotPad(room);
  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;
  if (aliveCount <= 1) finishArena(room);
}
function botBrainBomber(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  const danger = new Set();
  g.bombs.forEach((b) => { blastCells(room, b).forEach(([c, r]) => danger.add(c + ',' + r)); });
  const myBomb = g.bombs.find((b) => b.seat === p.seat);
  let tx = 0, ty = 0, burst = false;
  if (myBomb || danger.has(bomColOf(me.x) + ',' + bomRowOf(me.y))) {
    // Retreat to the nearest cell outside every blast cross.
    let best = null, bd = 1e9;
    for (let r = 0; r < BOM_ROWS; r++) {
      for (let c = 0; c < BOM_COLS; c++) {
        if (bomIsHard(c, r) || danger.has(c + ',' + r)) continue;
        if (g.softCells.some(([sc, sr]) => sc === c && sr === r)) continue;
        const d = Math.hypot(bomCellX(c) - me.x, bomCellY(r) - me.y);
        if (d < bd) { bd = d; best = { x: bomCellX(c), y: bomCellY(r) }; }
      }
    }
    if (best) { tx = best.x - me.x; ty = best.y - me.y; }
  } else {
    // Hunt: nearest soft block or enemy; plant when adjacent-ish.
    let target = null, td = 1e9;
    g.softCells.forEach(([c, r]) => {
      const d = Math.hypot(bomCellX(c) - me.x, bomCellY(r) - me.y);
      if (d < td) { td = d; target = { x: bomCellX(c), y: bomCellY(r) }; }
    });
    const near = nearestFoe(room, p);
    if (near.foe && near.foeD < td) { target = { x: near.foe.x, y: near.foe.y }; td = near.foeD; }
    if (target) {
      tx = target.x - me.x; ty = target.y - me.y;
      if (td <= 2.6) burst = true;
    }
  }
  const intent = Object.assign(dirIntent(tx, ty), { burst });
  g.botIntent[p.seat] = intent;
  return intent;
}

// --- Game 19: Kẻ Giả Mạo (rounds-based social deduction) ------------------
// Phases answer -> discuss -> vote -> reveal per round. Scoring: a
// strict plurality accusation against the impostor catches them
// (everyone else +150); any tie or a wrong plurality lets the impostor
// escape (+300, doubled in the final round).
function wolfWinner(room) {
  const g = room.game; const w = g.wolf;
  const alive = room.players.filter((p) => w.alive[p.seat]);
  const wolves = alive.filter((p) => w.roles[p.seat] === 'soi').length;
  if (wolves === 0) return 'dan';
  if (wolves >= alive.length - wolves) return 'soi';
  if (g.round >= WOLF_NIGHT_CAP) return wolves * 2 >= alive.length ? 'soi' : 'dan';
  return null;
}
function wolfWolvesIn(room) {
  const w = room.game.wolf;
  return room.players.every((p) => !w.alive[p.seat] || w.roles[p.seat] !== 'soi' || w.wolfVotes[p.seat] != null);
}
function wolfVictim(room) {
  const w = room.game.wolf;
  const counts = {}; const firstVoter = {};
  Object.keys(w.wolfVotes).forEach((s) => {
    const tgt = w.wolfVotes[s];
    counts[tgt] = (counts[tgt] || 0) + 1;
    if (firstVoter[tgt] == null || +s < firstVoter[tgt]) firstVoter[tgt] = +s;
  });
  let best = null;
  Object.keys(counts).forEach((tgt) => {
    if (best == null || counts[tgt] > counts[best]
      || (counts[tgt] === counts[best] && firstVoter[tgt] < firstVoter[best])) best = +tgt;
  });
  return best;
}
function wolfSeerApply(room, seat, target) {
  const w = room.game.wolf;
  w.seerPick = target;
  if (!w.seerNotes[seat]) w.seerNotes[seat] = {};
  w.seerNotes[seat][target] = w.roles[target] === 'soi';
}
function wolfAllIn(room) {
  const g = room.game; const w = g.wolf;
  return room.players.every((p) => {
    if (!w.alive[p.seat]) return true;
    const role = w.roles[p.seat];
    if (role === 'soi') return w.wolfVotes[p.seat] != null;
    if (role === 'bao-ve') return w.guardPick != null;
    if (role === 'tien-tri') return w.seerPick != null;
    if (role === 'phu-thuy') {
      const needed = (w.saveLeft > 0 || w.poisonLeft > 0);
      return !needed || w.witch.done;
    }
    return true;
  });
}
function wolfPlanNight(room, t) {
  const g = room.game; const w = g.wolf;
  g.botPlan = {};
  const nonWolves = room.players.filter((p) => w.alive[p.seat] && w.roles[p.seat] !== 'soi').map((p) => p.seat);
  const packTarget = nonWolves.length ? pick(nonWolves) : null;
  room.players.forEach((p) => {
    if (p.type !== 'bot' || !w.alive[p.seat]) return;
    const role = w.roles[p.seat];
    const at = t + Math.round(rand(2500, 20000));
    if (role === 'soi') {
      // Pack play: Khó wolves always hunt the shared victim, Vừa
      // wolves join it half the time, Dễ wolves wander off alone.
      const share = p.difficulty === 'kho' || (p.difficulty === 'vua' && Math.random() < 0.5);
      g.botPlan[p.seat] = { at, target: share && packTarget != null ? packTarget : (nonWolves.length ? pick(nonWolves) : null) };
    } else if (role === 'bao-ve') {
      let cands = room.players.filter((q) => w.alive[q.seat] && q.seat !== w.guardLast).map((q) => q.seat);
      if (!cands.length && w.guardLast != null && w.alive[w.guardLast]) cands = [w.guardLast];
      g.botPlan[p.seat] = { at, target: cands.length ? pick(cands) : null };
    } else if (role === 'tien-tri') {
      const notes = w.seerNotes[p.seat] || {};
      const cands = room.players.filter((q) => w.alive[q.seat] && q.seat !== p.seat && !(q.seat in notes)).map((q) => q.seat);
      g.botPlan[p.seat] = { at, target: cands.length ? pick(cands) : null };
    } else if (role === 'phu-thuy') {
      g.botPlan[p.seat] = { at }; // decided live in stepWolf — she needs the victim first
    }
  });
}
function wolfBotVote(room, p) {
  const g = room.game; const w = g.wolf;
  const role = w.roles[p.seat];
  const others = room.players.filter((q) => w.alive[q.seat] && q.seat !== p.seat).map((q) => q.seat);
  if (!others.length) return null;
  if (role === 'tien-tri') {
    // The seer pushes a wolf they have SEEN — but only through the
    // ballot box, never by claiming in chat (lines stay generic).
    const notes = w.seerNotes[p.seat] || {};
    const known = others.find((s) => notes[s] === true);
    if (known != null) return known;
    const uncleared = others.filter((s) => notes[s] !== false);
    return pick(uncleared.length ? uncleared : others);
  }
  if (role === 'soi') {
    const nonWolves = others.filter((s) => w.roles[s] !== 'soi');
    if (p.difficulty === 'kho' && nonWolves.length) return pick(nonWolves);
    if (p.difficulty === 'vua' && nonWolves.length && Math.random() < 0.8) return pick(nonWolves);
    return pick(others);
  }
  return pick(others);
}
function stepWolf(room, t) {
  const g = room.game; const w = g.wolf;
  if (g.phase === 'night') {
    room.players.forEach((p) => {
      if (p.type !== 'bot' || !w.alive[p.seat]) return;
      const plan = g.botPlan[p.seat];
      if (!plan || plan.at > t || plan.done) return;
      const role = w.roles[p.seat];
      if (role === 'soi' && w.wolfVotes[p.seat] == null && plan.target != null) {
        w.wolfVotes[p.seat] = plan.target; plan.done = true;
      } else if (role === 'bao-ve' && w.guardPick == null && plan.target != null) {
        w.guardPick = plan.target; plan.done = true;
      } else if (role === 'tien-tri' && w.seerPick == null && plan.target != null) {
        wolfSeerApply(room, p.seat, plan.target); plan.done = true;
      } else if (role === 'phu-thuy' && !w.witch.done) {
        if (!wolfWolvesIn(room)) return; // the witch wakes after the pack
        const victim = wolfVictim(room);
        const saveP = p.difficulty === 'kho' ? 0.8 : p.difficulty === 'vua' ? 0.55 : 0.3;
        if (victim != null && w.saveLeft > 0 && Math.random() < saveP) w.witch.save = true;
        const poisonP = p.difficulty === 'kho' ? 0.25 : p.difficulty === 'vua' ? 0.12 : 0.05;
        if (w.poisonLeft > 0 && Math.random() < poisonP) {
          const cands = room.players.filter((q) => w.alive[q.seat] && q.seat !== p.seat && q.seat !== victim).map((q) => q.seat);
          if (cands.length) w.witch.poison = pick(cands);
        }
        w.witch.done = true; plan.done = true;
      }
    });
    if (t >= g.endsAt || wolfAllIn(room)) { resolveWolfNight(room, t); return true; }
    return false;
  }
  if (g.phase === 'dawn') {
    if (t >= g.endsAt) { wolfEnterDiscuss(room, t); return true; }
    return false;
  }
  if (g.phase === 'discuss') {
    room.players.forEach((p) => {
      if (p.type !== 'bot' || !w.alive[p.seat]) return;
      const plan = g.botPlan[p.seat];
      if (plan && !plan.chatted && plan.chatAt && plan.chatAt <= t) {
        plan.chatted = true;
        g.chatLog.push({ seat: p.seat, text: plan.chatLine, at: t });
        if (g.chatLog.length > 40) g.chatLog = g.chatLog.slice(-40);
      }
    });
    if (t >= g.endsAt) { wolfEnterVote(room, t); return true; }
    return false;
  }
  if (g.phase === 'vote') {
    room.players.forEach((p) => {
      if (p.type !== 'bot' || !w.alive[p.seat]) return;
      const plan = g.botPlan[p.seat];
      if (plan && plan.voteAt && plan.voteAt <= t && g.votes[p.seat] == null && plan.vote != null) {
        g.votes[p.seat] = plan.vote;
      }
    });
    const allIn = room.players.every((p) => !w.alive[p.seat] || g.votes[p.seat] != null);
    if (t >= g.endsAt || allIn) { resolveWolfVote(room, t); return true; }
    return false;
  }
  if (g.phase === 'execute') {
    if (t >= g.endsAt) { wolfNextNight(room, t); return true; }
    return false;
  }
  if (g.phase === 'wolfEnd') {
    if (t >= g.endsAt) { endGame(room); return true; }
  }
  return false;
}
function resolveWolfNight(room, t) {
  const g = room.game; const w = g.wolf;
  const victim = wolfVictim(room);
  // Resolution order: the guard's protection and the witch's save
  // both cancel the wolf kill; the witch's poison always kills
  // (it slips past the guard and past a save spent on the victim).
  const saved = victim != null && (w.guardPick === victim || (w.witch.done && w.witch.save));
  const deaths = [];
  if (victim != null && !saved) deaths.push({ seat: victim, cause: 'soi' });
  if (w.witch.done && w.witch.poison != null && w.alive[w.witch.poison]
    && !deaths.some((d) => d.seat === w.witch.poison)) {
    deaths.push({ seat: w.witch.poison, cause: 'doc' });
  }
  if (w.witch.done) {
    if (w.witch.save && victim != null) w.saveLeft = 0;
    if (w.witch.poison != null) w.poisonLeft = 0;
  }
  w.guardLast = w.guardPick;
  w.dawnDeaths = [];
  deaths.forEach((d) => {
    w.alive[d.seat] = false;
    const rec = { seat: d.seat, role: w.roles[d.seat], cause: d.cause, night: g.round };
    w.deaths.push(rec); w.dawnDeaths.push(rec);
  });
  const winner = wolfWinner(room);
  if (winner) { finishWolf(room, winner, t); return; }
  g.phase = 'dawn'; g.endsAt = t + WOLF_DAWN_MS;
}
function wolfEnterDiscuss(room, t) {
  const g = room.game;
  g.chatLog = [];
  g.phase = 'discuss'; g.endsAt = t + WOLF_DISCUSS_MS;
  g.botPlan = {};
  room.players.forEach((p) => {
    if (p.type !== 'bot' || !room.game.wolf.alive[p.seat]) return;
    if (Math.random() < 0.75) {
      g.botPlan[p.seat] = { chatAt: t + Math.round(rand(4000, 40000)), chatLine: pick(WOLF_CHAT_LINES), chatted: false };
    }
  });
}
function wolfEnterVote(room, t) {
  const g = room.game;
  g.votes = {};
  g.phase = 'vote'; g.endsAt = t + WOLF_VOTE_MS;
  g.botPlan = {};
  room.players.forEach((p) => {
    if (p.type !== 'bot' || !room.game.wolf.alive[p.seat]) return;
    g.botPlan[p.seat] = { voteAt: t + Math.round(rand(3000, 20000)), vote: wolfBotVote(room, p) };
  });
}
function resolveWolfVote(room, t) {
  const g = room.game; const w = g.wolf;
  const counts = {};
  Object.keys(g.votes).forEach((s) => {
    if (w.alive[+s] && w.alive[g.votes[s]]) counts[g.votes[s]] = (counts[g.votes[s]] || 0) + 1;
  });
  let top = null, topN = 0, tie = false;
  Object.keys(counts).forEach((s) => {
    const c = counts[s];
    if (c > topN) { topN = c; top = +s; tie = false; }
    else if (c === topN) tie = true;
  });
  w.voteTally = counts;
  if (top != null && !tie && topN > 0) {
    w.alive[top] = false;
    w.deaths.push({ seat: top, role: w.roles[top], cause: 'treo', night: g.round });
    w.exec = { seat: top, role: w.roles[top] };
  } else {
    w.exec = { seat: null, role: null };
  }
  const winner = wolfWinner(room);
  if (winner) { finishWolf(room, winner, t); return; }
  g.phase = 'execute'; g.endsAt = t + WOLF_EXEC_MS;
}
function wolfNextNight(room, t) {
  const g = room.game; const w = g.wolf;
  g.round += 1;
  w.wolfVotes = {}; w.guardPick = null; w.seerPick = null;
  w.witch = { save: false, poison: null, done: false };
  w.dawnDeaths = []; w.exec = null; w.voteTally = null;
  g.votes = {}; g.inputs = {};
  g.phase = 'night'; g.endsAt = t + WOLF_NIGHT_MS;
  wolfPlanNight(room, t);
}
function finishWolf(room, winner, t) {
  const g = room.game; const w = g.wolf;
  w.winner = winner;
  const entries = room.players.map((p) => {
    const isWolf = w.roles[p.seat] === 'soi';
    const won = (winner === 'soi') === isWolf;
    const pts = won ? (isWolf ? 300 : 200) : 50;
    g.points[p.seat] = pts;
    return { seat: p.seat, points: pts, role: w.roles[p.seat] };
  });
  g.lastRound = { round: g.round, entries };
  finishTimedRound(room, 'wolfEnd', t + WOLF_END_MS);
}

// --- Game: Cờ Cá Ngựa (Vietnamese Ludo) -------------------------------------
function nguaLegal(room, seat, dice) {
  const horses = room.game.ng.horses[seat];
  const out = [];
  horses.forEach((p, h) => {
    if (p === 0) { if (dice === 6) out.push(h); }
    else if (p + dice <= 58) out.push(h);
  });
  return out;
}
function nguaProgress(room, seat) {
  const horses = room.game.ng.horses[seat];
  return horses.filter((p) => p === 58).length * 100 + horses.reduce((a, b) => a + b, 0);
}
function nguaCellOf(room, seat, p) {
  if (p < 1 || p > 51) return null;
  return (NGUA_OFFSETS[room.game.ng.boards[seat]] + p - 1) % 52;
}
function nguaLog(room, text) {
  const ng = room.game.ng;
  ng.log.push(text);
  if (ng.log.length > 6) ng.log = ng.log.slice(-6);
}
function nguaRoll(room, t) {
  const g = room.game; const ng = g.ng;
  const seat = ng.turn;
  const dice = randInt(1, 6);
  ng.dice = dice;
  if (dice === 6) ng.chain += 1; else ng.chain = 0;
  // Three consecutive sixes: the third roll is forfeited outright.
  ng.legal = ng.chain >= 3 ? [] : nguaLegal(room, seat, dice);
  if (ng.chain >= 3) nguaLog(room, playerAt(room, seat).name + ' thảy 6 ba lần liên tiếp — mất lượt!');
  g.phase = 'pick';
  ng.autoAt = t + (playerAt(room, seat).type === 'bot' ? NGUA_BOT_MS : NGUA_BEAT_MS);
  g.endsAt = t + NGUA_TURN_MS;
  return dice;
}
function nguaMove(room, seat, h, t) {
  const g = room.game; const ng = g.ng;
  const me = playerAt(room, seat);
  const dice = ng.dice;
  const from = ng.horses[seat][h];
  const to = from === 0 ? 1 : from + dice;
  ng.horses[seat][h] = to;
  const kicked = [];
  const cell = nguaCellOf(room, seat, to);
  if (cell != null && !NGUA_SAFE.has(cell)) {
    room.players.forEach((q) => {
      if (q.seat === seat) return;
      ng.horses[q.seat].forEach((qp, qh) => {
        if (nguaCellOf(room, q.seat, qp) === cell) {
          ng.horses[q.seat][qh] = 0;
          if (kicked.indexOf(q.seat) < 0) kicked.push(q.seat);
        }
      });
    });
  }
  ng.last = { seat, dice, horse: h, from, to, kicked, at: t };
  let text = me.name + ' thảy ' + dice + ': ngựa ' + (h + 1);
  if (from === 0) text += ' xuất chuồng';
  else if (to === 58) text += ' VỀ CHUỒNG ĐÍCH!';
  else text += ' đi tới ô ' + to;
  kicked.forEach((ks) => { text += ' · ĐÁ NGỰA của ' + playerAt(room, ks).name + '!'; });
  nguaLog(room, text);
  if (ng.horses[seat].every((p) => p === 58)) { finishNgua(room, seat, t); return; }
  if (dice === 6) {
    // A six earns another roll (chain < 3 is guaranteed: a third
    // consecutive six never reaches the move step at all).
    g.phase = 'roll'; ng.dice = null; ng.legal = [];
    ng.actAt = t + NGUA_BOT_MS; g.endsAt = t + NGUA_TURN_MS;
  } else {
    nguaEndTurn(room, t);
  }
}
function nguaEndTurn(room, t) {
  const g = room.game; const ng = g.ng;
  const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);
  ng.turn = seats[(seats.indexOf(ng.turn) + 1) % seats.length];
  ng.chain = 0; ng.dice = null; ng.legal = [];
  g.phase = 'roll'; ng.actAt = t + NGUA_BOT_MS; g.endsAt = t + NGUA_TURN_MS;
}
function nguaBotPick(room, seat) {
  const g = room.game; const ng = g.ng;
  const p = playerAt(room, seat);
  const legal = ng.legal.slice();
  if (!legal.length) return null;
  const blunder = p.difficulty === 'de' ? 0.35 : p.difficulty === 'vua' ? 0.15 : 0.05;
  if (Math.random() < blunder) return pick(legal);
  const dice = ng.dice;
  let best = legal[0], bestScore = -1;
  legal.forEach((h) => {
    const from = ng.horses[seat][h];
    const to = from === 0 ? 1 : from + dice;
    let score;
    if (to === 58) score = 100;                       // bring a horse home
    else if (from === 0) score = 80;                  // leave the stable
    else {
      const cell = nguaCellOf(room, seat, to);
      let kicks = false;
      if (cell != null && !NGUA_SAFE.has(cell)) {
        room.players.forEach((q) => {
          if (q.seat === seat) return;
          if (ng.horses[q.seat].some((qp) => nguaCellOf(room, q.seat, qp) === cell)) kicks = true;
        });
      }
      score = kicks ? 90 : 10 + to;                   // kick, else advance the leader
    }
    if (score > bestScore) { bestScore = score; best = h; }
  });
  return best;
}
function nguaHint(room, seat, h) {
  const g = room.game; const ng = g.ng;
  const from = ng.horses[seat][h];
  const dice = ng.dice;
  const to = from === 0 ? 1 : from + dice;
  if (from === 0) return 'Xuất chuồng';
  if (to === 58) return 'Về chuồng đích!';
  if (to >= 52) return 'Vào đường về chuồng (' + (to - 51) + '/6)';
  const cell = nguaCellOf(room, seat, to);
  if (cell != null && !NGUA_SAFE.has(cell)) {
    let kickName = null;
    room.players.forEach((q) => {
      if (q.seat === seat) return;
      if (ng.horses[q.seat].some((qp) => nguaCellOf(room, q.seat, qp) === cell)) kickName = q.name;
    });
    if (kickName) return 'ĐÁ NGỰA của ' + kickName + '!';
    return 'Đi ' + dice + ' ô';
  }
  return 'Về ô an toàn';
}
function stepNgua(room, t) {
  const g = room.game; const ng = g.ng;
  if (g.phase === 'ngWin') {
    if (t >= g.endsAt) { endGame(room); return true; }
    return false;
  }
  if (g.phase === 'roll') {
    const cur = playerAt(room, ng.turn);
    if (cur && cur.type === 'bot' && t >= ng.actAt) { nguaRoll(room, t); return true; }
    if (t >= g.endsAt) { nguaRoll(room, t); return true; } // idle human: the server rolls for them
    return false;
  }
  if (g.phase === 'pick') {
    if (!ng.legal.length) {
      if (t >= ng.autoAt) { nguaEndTurn(room, t); return true; }
      return false;
    }
    const cur = playerAt(room, ng.turn);
    if (cur && cur.type === 'bot' && t >= ng.autoAt) {
      const h = nguaBotPick(room, ng.turn);
      if (h != null) nguaMove(room, ng.turn, h, t);
      return true;
    }
    if (t >= g.endsAt) { nguaMove(room, ng.turn, pick(ng.legal), t); return true; } // timeout: a random legal move
    return false;
  }
  return false;
}
function finishNgua(room, winnerSeat, t) {
  const g = room.game; const ng = g.ng;
  ng.winner = winnerSeat;
  const ranking = room.players.slice().sort((a, b) => {
    if (a.seat === winnerSeat) return -1;
    if (b.seat === winnerSeat) return 1;
    return (nguaProgress(room, b.seat) - nguaProgress(room, a.seat)) || (a.seat - b.seat);
  });
  const entries = ranking.map((p, i) => ({ seat: p.seat, points: placementAt(i), progress: nguaProgress(room, p.seat) }));
  entries.forEach((e) => { g.points[e.seat] = e.points; });
  g.lastRound = { round: 1, entries };
  finishTimedRound(room, 'ngWin', t + NGUA_WIN_MS);
}

// --- Game: Tiến Lên Miền Nam (Vietnamese Thirteen) --------------------------
// Cards are ids 0..51: rankValue r = id % 13 maps to the ranks
// 3,4,5,6,7,8,9,10,J,Q,K,A,2 (2 is highest, r = 12); suit
// s = floor(id / 13) runs ♠ ♣ ♦ ♥ (♥ highest). Strength compares rank
// first, then suit, so r * 4 + s orders any two cards with one number.
const TL_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const TL_SUITS = ['♠', '♣', '♦', '♥'];
function tlRank(id) { return id % 13; }
function tlSuit(id) { return Math.floor(id / 13); }
function tlStrength(id) { return tlRank(id) * 4 + tlSuit(id); }
function tlLabel(id) { return TL_RANKS[tlRank(id)] + TL_SUITS[tlSuit(id)]; }
function tlSort(ids) { return ids.slice().sort((a, b) => tlStrength(a) - tlStrength(b)); }
function tlComboOf(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return null;
  const seen = new Set();
  for (const c of cards) {
    if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return null;
    seen.add(c);
  }
  const cs = tlSort(cards);
  const n = cs.length;
  const counts = {};
  cs.forEach((c) => { const r = tlRank(c); counts[r] = (counts[r] || 0) + 1; });
  const distinct = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const top = cs[n - 1];
  // (cards ride along so the exported TL.beats can recompute a table
  // combo's tier from them; g.tl.table stores only the contracted
  // fields and carries the same cards.)
  if (distinct.length === 1) {
    if (n === 1) return { kind: 'single', len: 1, top, tier: 0, cards: cs };
    if (n === 2) return { kind: 'pair', len: 2, top, tier: 0, cards: cs };
    if (n === 3) return { kind: 'triple', len: 3, top, tier: 0, cards: cs };
    if (n === 4) return { kind: 'quad', len: 4, top, tier: 2, cards: cs };
    return null;
  }
  const consecutive = distinct[distinct.length - 1] - distinct[0] === distinct.length - 1;
  if (!consecutive || distinct[distinct.length - 1] > 11) return null;
  if (n >= 3 && distinct.length === n) return { kind: 'seq', len: n, top, tier: 0, cards: cs };
  if (n % 2 === 0 && n >= 6 && distinct.every((r) => counts[r] === 2)) {
    const pairs = n / 2;
    return { kind: 'dseq', len: n, top, tier: pairs === 3 ? 1 : 3, cards: cs };
  }
  return null;
}
// Can `play` (a comboOf result) be laid over `table` (the stored
// {seat, cards, kind, len, top} or null)? Ordinary plays must match
// kind AND card count with a strictly higher top card. Bombs (quad,
// double sequences) additionally chop 2s and lower bombs: tiers run
// dseq-3 = 1, quad = 2, dseq-4+ = 3; a single 2 falls to any bomb, a
// pair of 2s only to tier >= 2; a bomb never chops anything else.
function tlBeats(play, table) {
  if (!play) return false;
  if (!table) return true;
  const tc = tlComboOf(table.cards);
  if (!tc) return false;
  const pBomb = play.tier > 0, tBomb = tc.tier > 0;
  if (pBomb && tBomb) {
    if (play.tier !== tc.tier) return play.tier > tc.tier;
    if (play.kind !== tc.kind) return false;
    if (play.kind === 'dseq' && play.len !== tc.len) return play.len > tc.len;
    return tlStrength(play.top) > tlStrength(tc.top);
  }
  if (pBomb) {
    if (tc.kind === 'single' && tlRank(tc.top) === 12) return true;
    if (tc.kind === 'pair' && tlRank(tc.top) === 12) return play.tier >= 2;
    return false;
  }
  if (tBomb) return false;
  if (play.kind !== tc.kind || play.len !== tc.len) return false;
  return tlStrength(play.top) > tlStrength(tc.top);
}
// Tới trắng — an unbeatable dealt hand. Returns the kind key or null.
function tlInstantWin(hand) {
  const counts = {};
  hand.forEach((c) => { const r = tlRank(c); counts[r] = (counts[r] || 0) + 1; });
  let dragon = true;
  for (let r = 0; r <= 11; r++) if (!counts[r]) { dragon = false; break; }
  if (dragon) return 'dragon';
  let pairs = 0;
  for (let r = 0; r <= 12; r++) if ((counts[r] || 0) >= 2) pairs += 1;
  if (pairs >= 6) return 'sixpairs';
  if (counts[0] === 4) return 'quad3';
  for (let r = 0; r + 3 <= 11; r++) {
    if ((counts[r] || 0) >= 2 && (counts[r + 1] || 0) >= 2 && (counts[r + 2] || 0) >= 2 && (counts[r + 3] || 0) >= 2) return 'dseq4';
  }
  return null;
}
export const TL = { comboOf: tlComboOf, beats: tlBeats, instantWin: tlInstantWin };
function tlComboName(combo) {
  if (!combo) return '';
  if (combo.kind === 'single') return 'lá ' + tlLabel(combo.top);
  if (combo.kind === 'pair') return 'Đôi ' + TL_RANKS[tlRank(combo.top)];
  if (combo.kind === 'triple') return 'Ba ' + TL_RANKS[tlRank(combo.top)];
  if (combo.kind === 'quad') return 'Tứ quý ' + TL_RANKS[tlRank(combo.top)];
  if (combo.kind === 'seq') return 'Sảnh ' + combo.len + ' lá';
  if (combo.kind === 'dseq') return (combo.len / 2) + ' đôi thông';
  return '';
}
function tlLog(room, text) {
  const tl = room.game.tl;
  tl.log.push(text);
  if (tl.log.length > 8) tl.log = tl.log.slice(-8);
}
function tlSeats(room) { return room.players.map((p) => p.seat).sort((a, b) => a - b); }
function tlActive(room, seat) { return room.game.tl.finished.indexOf(seat) < 0; }
function tlNextActive(room, fromSeat) {
  const seats = tlSeats(room);
  const i = seats.indexOf(fromSeat);
  for (let k = 1; k <= seats.length; k++) {
    const s = seats[(i + k) % seats.length];
    if (tlActive(room, s)) return s;
  }
  return fromSeat;
}
function tlArmTurn(room, t) {
  const g = room.game; const tl = g.tl;
  tl.turnEndsAt = t + TL_TURN_MS; tl.actAt = t + TL_BOT_MS; g.endsAt = tl.turnEndsAt;
}
// After any play or pass: close the trick when every other active
// player has passed (the last play maker leads again — or the next
// active player after them, if that play finished them); otherwise
// hand the turn to the next active player who has not passed.
function tlCloseOrAdvance(room, t) {
  const tl = room.game.tl;
  const holder = tl.table ? tl.table.seat : tl.leader;
  const others = tlSeats(room).filter((s) => s !== holder && tlActive(room, s));
  if (tl.table && others.every((s) => tl.passed[s])) {
    tl.table = null; tl.passed = {};
    tl.turn = tlActive(room, holder) ? holder : tlNextActive(room, holder);
    tl.leader = tl.turn;
  } else {
    const seats = tlSeats(room);
    const i = seats.indexOf(tl.turn);
    let nxt = null;
    for (let k = 1; k <= seats.length; k++) {
      const s = seats[(i + k) % seats.length];
      if (s !== holder && tlActive(room, s) && !tl.passed[s]) { nxt = s; break; }
    }
    tl.turn = nxt != null ? nxt : holder;
  }
  tlArmTurn(room, t);
}
function tlPlayCards(room, seat, cards, t) {
  const g = room.game; const tl = g.tl;
  const combo = tlComboOf(cards);
  tl.hands[seat] = tl.hands[seat].filter((c) => cards.indexOf(c) < 0);
  tl.table = { seat, cards: tlSort(cards), kind: combo.kind, len: combo.len, top: combo.top };
  tl.leader = seat;
  tl.firstPlay = false;
  tlLog(room, playerAt(room, seat).name + ' đánh ' + tlComboName(combo));
  if (tl.hands[seat].length === 0 && tl.finished.indexOf(seat) < 0) {
    tl.finished.push(seat);
    tlLog(room, playerAt(room, seat).name + ' HẾT BÀI — về hạng ' + tl.finished.length + '!');
  }
  const activeLeft = tlSeats(room).filter((s) => tlActive(room, s));
  if (activeLeft.length === 1) {
    tl.finished.push(activeLeft[0]);
    finishTienLen(room, t);
    return;
  }
  tlCloseOrAdvance(room, t);
}
function tlPassTurn(room, seat, t) {
  const tl = room.game.tl;
  tl.passed[seat] = true;
  tlLog(room, playerAt(room, seat).name + ' bỏ lượt');
  tlCloseOrAdvance(room, t);
}
function finishTienLen(room, t) {
  const g = room.game; const tl = g.tl;
  tl.winner = tl.finished[0];
  const entries = tl.finished.map((s, i) => ({ seat: s, points: placementAt(i) }));
  entries.forEach((e) => { g.points[e.seat] = e.points; });
  g.lastRound = { round: 1, entries };
  finishTimedRound(room, 'tlWin', t + TL_WIN_MS);
}
function tlTimeout(room, t) {
  const tl = room.game.tl;
  const seat = tl.turn;
  if (!tl.table) {
    // Must lead: the server plays the lowest single. For the 3♠
    // holder that lowest card IS card 0 (hands sort by rank, suit),
    // so the first-play rule satisfies itself.
    const lead = tl.firstPlay && tl.hands[seat].indexOf(0) >= 0 ? [0] : [tl.hands[seat][0]];
    tlPlayCards(room, seat, lead, t);
  } else {
    tlPassTurn(room, seat, t);
  }
}
function stepTienLen(room, t) {
  const g = room.game; const tl = g.tl;
  if (g.phase === 'tlWin') {
    if (t >= g.endsAt) { endGame(room); return true; }
    return false;
  }
  if (g.phase !== 'cards' || !tl) return false;
  const cur = playerAt(room, tl.turn);
  if (cur && cur.type === 'bot' && t >= tl.actAt) { tlBotTurn(room, t); return true; }
  if (t >= tl.turnEndsAt) { tlTimeout(room, t); return true; }
  return false;
}
// --- Tiến Lên bots -----------------------------------------------------------
// Candidates are enumerated from the hand: every suit subset of each
// rank group (single/pair/triple/quad in every suit flavour), plus two
// suit variants — cheapest and strongest-top — of every sequence and
// double-sequence window. Beats() then filters what may be played.
function tlRankGroups(hand) {
  const byRank = {};
  hand.forEach((c) => { const r = tlRank(c); (byRank[r] = byRank[r] || []).push(c); });
  Object.keys(byRank).forEach((r) => byRank[r].sort((a, b) => tlSuit(a) - tlSuit(b)));
  return byRank;
}
function tlSubsets(arr) {
  const out = [];
  for (let mask = 1; mask < (1 << arr.length); mask++) {
    const sub = [];
    for (let i = 0; i < arr.length; i++) if (mask & (1 << i)) sub.push(arr[i]);
    out.push(sub);
  }
  return out;
}
function tlCombosOf(hand) {
  const byRank = tlRankGroups(hand);
  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  const out = [];
  const seen = new Set();
  function push(cards) {
    const sorted = tlSort(cards);
    const key = sorted.join(',');
    if (seen.has(key)) return;
    const combo = tlComboOf(sorted);
    if (!combo) return;
    seen.add(key);
    out.push({ cards: sorted, combo });
  }
  ranks.forEach((r) => { tlSubsets(byRank[r]).forEach(push); });
  for (let a = 0; a <= 11; a++) {
    for (let b = a + 2; b <= 11; b++) {
      const win = [];
      for (let r = a; r <= b; r++) win.push(r);
      if (win.every((r) => byRank[r])) {
        push(win.map((r) => byRank[r][0]));
        push(win.map((r) => (r === b ? byRank[r][byRank[r].length - 1] : byRank[r][0])));
      }
      if (win.every((r) => (byRank[r] || []).length >= 2)) {
        const cheap = []; win.forEach((r) => { cheap.push(byRank[r][0], byRank[r][1]); });
        push(cheap);
        const strong = [];
        win.forEach((r) => {
          if (r === b) { const gr = byRank[r]; strong.push(gr[gr.length - 2], gr[gr.length - 1]); }
          else strong.push(byRank[r][0], byRank[r][1]);
        });
        push(strong);
      }
    }
  }
  return out;
}
// A candidate "breaks a bomb" when it spends some — but not all — of
// a held quad's cards, or pair-cards of a held double-sequence run,
// without being that bomb itself. Vừa/Khó sort such candidates last:
// a human guards their hàng the same way.
function tlBreaksBomb(hand, candCards) {
  const byRank = tlRankGroups(hand);
  const cand = new Set(candCards);
  const ranks = Object.keys(byRank).map(Number);
  for (const r of ranks) {
    if (byRank[r].length === 4) {
      const used = byRank[r].filter((c) => cand.has(c)).length;
      if (used > 0 && used < 4) return true;
    }
  }
  const pairRanks = ranks.filter((r) => byRank[r].length >= 2 && r <= 11).sort((a, b) => a - b);
  let run = [];
  const runs = [];
  pairRanks.forEach((r) => {
    if (run.length && r === run[run.length - 1] + 1) run.push(r);
    else { if (run.length >= 3) runs.push(run); run = [r]; }
  });
  if (run.length >= 3) runs.push(run);
  for (const rn of runs) {
    const bombCards = [];
    rn.forEach((r) => { bombCards.push(byRank[r][0], byRank[r][1]); });
    const used = bombCards.filter((c) => cand.has(c)).length;
    if (used > 0 && used < bombCards.length) return true;
  }
  return false;
}
function tlBotFollow(room, seat, diff) {
  const tl = room.game.tl;
  const hand = tl.hands[seat];
  const beaters = tlCombosOf(hand).filter((c) => tlBeats(c.combo, tl.table));
  if (!beaters.length) return null;
  const nonBombs = beaters.filter((c) => c.combo.tier === 0);
  if (diff === 'de') {
    if (Math.random() < 0.25) return null;
    return pick(nonBombs.length ? nonBombs : beaters);
  }
  const key = (c) => (tlBreaksBomb(hand, c.cards) ? 1000000 : 0) + tlStrength(c.combo.top);
  if (diff === 'vua') return beaters.slice().sort((a, b) => key(a) - key(b))[0];
  // kho: cheapest ordinary beater first; bombs are a last resort with
  // discipline (see TIEN_LEN_NOTES.md).
  if (nonBombs.length) return nonBombs.slice().sort((a, b) => key(a) - key(b))[0];
  const tableCount = tl.hands[tl.table.seat].length;
  const isTwo = tlRank(tl.table.top) === 12 && (tl.table.kind === 'single' || tl.table.kind === 'pair');
  if (isTwo) {
    if (hand.length <= 6 || tableCount <= 2) {
      return beaters.slice().sort((a, b) => (a.combo.tier - b.combo.tier) || (tlStrength(a.combo.top) - tlStrength(b.combo.top)))[0];
    }
    return null;
  }
  if (hand.length <= 4 || tableCount <= 2) return beaters.slice().sort((a, b) => key(a) - key(b))[0];
  return null;
}
function tlBotLead(room, seat, diff) {
  const tl = room.game.tl;
  const hand = tl.hands[seat];
  let all = tlCombosOf(hand);
  if (tl.firstPlay) all = all.filter((c) => c.cards.indexOf(0) >= 0);
  if (!all.length) return null;
  if (diff === 'de') return pick(all);
  const twoLead = (c) => (tlRank(c.combo.top) === 12 && (c.combo.kind === 'single' || c.combo.kind === 'pair')) ? 1 : 0;
  return all.slice().sort((a, b) =>
    (twoLead(a) - twoLead(b)) || (b.cards.length - a.cards.length) || (tlStrength(a.combo.top) - tlStrength(b.combo.top)))[0];
}
function tlBotTurn(room, t) {
  const tl = room.game.tl;
  const seat = tl.turn;
  const p = playerAt(room, seat);
  if (!p || p.type !== 'bot') return;
  const chosen = tl.table ? tlBotFollow(room, seat, p.difficulty) : tlBotLead(room, seat, p.difficulty);
  if (chosen) tlPlayCards(room, seat, chosen.cards, t);
  else tlPassTurn(room, seat, t);
}

// --- Game 20: Thủ Thành (COOP tick arena defence) --------------------------
// Slimes spawn at the rim and march straight at the crystal; players
// shoot them with the shared shell sim. Surviving DEF_MS pays the tier
// of the crystal's remaining HP; losing the crystal ends the game at
// once with the participation tier. Team score = slimes destroyed.
function stepDefend(room, t) {
  const g = room.game;
  if (g.phase !== 'defend') return false;
  if (t >= g.endsAt) { finishCoop(room, g.kills, coopTier(g.crystal.hp, DEF_TIERS), 'slime bị hạ'); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'defend') {
      simulateDefendTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateDefendTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = collectMoves(room, botBrainDefend);
  moveBlobsWalled(room, moves, null, 0);
  separateBlobs(room);
  processGuns(room, moves);
  stepShells(room, { hitSlimes: true });
  if (g.slimes.some((sl) => sl.dead)) g.slimes = g.slimes.filter((sl) => !sl.dead);
  // Waves: spawn interval ramps 24 -> 10 ticks across the minute;
  // bigger, slower 3-HP slimes join from the 20 second mark.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    // 16:9 wave: slimes pour in from the wide field's rim — a point on
    // the spawn ellipse (the old 10.6 circle under the field map), so
    // they arrive along every edge; speeds scale ~x1.1 so the average
    // march time to the crystal matches the old game's.
    const ang = rand(0, Math.PI * 2);
    const big = g.tickCount >= 320 && Math.random() < 0.3;
    g.slimeSeq += 1;
    g.slimes.push({
      id: g.slimeSeq,
      x: Math.round(Math.cos(ang) * 10.6 * (4 / 3) * 100) / 100, y: Math.round(Math.sin(ang) * 10.6 * (3 / 4) * 100) / 100,
      hp: big ? 3 : 1, maxHp: big ? 3 : 1, r: big ? 1.05 : 0.7, speed: big ? 0.045 : 0.07, big,
    });
    g.spawnIn = Math.max(20, Math.round(48 - 28 * (g.tickCount / (DEF_MS / TICK_MS))));
  }
  let crystalDown = false;
  g.slimes.forEach((sl) => {
    const d = Math.hypot(sl.x, sl.y) || 1;
    sl.vx = -(sl.x / d) * sl.speed; sl.vy = -(sl.y / d) * sl.speed;
    sl.x += sl.vx; sl.y += sl.vy;
    if (Math.hypot(sl.x, sl.y) <= 1.35) {
      sl.dead = true;
      g.crystal.hp -= 1;
      if (g.crystal.hp <= 0) crystalDown = true;
    }
  });
  if (g.slimes.some((sl) => sl.dead)) g.slimes = g.slimes.filter((sl) => !sl.dead);
  snapshotPad(room);
  if (crystalDown) finishCoop(room, g.kills, 'none', 'slime bị hạ');
}
function botBrainDefend(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  let sl = null, sd = 1e9;
  (g.slimes || []).forEach((s) => {
    const d = Math.hypot(s.x - me.x, s.y - me.y);
    if (d < sd) { sd = d; sl = s; }
  });
  let tx = 0, ty = 0, burst = false;
  if (sl) {
    tx = sl.x - me.x; ty = sl.y - me.y;
    const f = g.facing[p.seat] || { x: 1, y: 0 };
    const dd = Math.hypot(tx, ty) || 1;
    if ((tx / dd) * f.x + (ty / dd) * f.y > 0.92 && sd < 12) burst = true;
    if (sd < 2.4) { tx = -tx; ty = -ty; }
  } else { tx = -me.x; ty = -me.y; }
  const intent = Object.assign(dirIntent(tx, ty), { burst });
  g.botIntent[p.seat] = intent;
  return intent;
}

// --- Game 21: Giải Mã Chung (COOP phase puzzle) ----------------------------
// A level deals a secret step sequence round-robin across the seats;
// only the owner's phone lists their steps. A press is right iff the
// presser owns the current step AND the symbol matches; anything else
// costs the team a heart. Bots press their own step correctly ~800ms
// after it becomes current and never press otherwise.
function platOverlap(e, s) {
  return e.x - PLAT_HW < s.x + s.w && e.x + PLAT_HW > s.x
    && e.y - PLAT_HH < s.y + s.h && e.y + PLAT_HH > s.y;
}
function platStep(e, solids, grav, maxFall) {
  e.vy = Math.min(maxFall, e.vy + grav);
  e.x += e.vx;
  for (const s of solids) {
    if (s.oneWay) continue;
    if (!platOverlap(e, s)) continue;
    if (e.vx > 0) e.x = s.x - PLAT_HW;
    else if (e.vx < 0) e.x = s.x + s.w + PLAT_HW;
    else {
      // No horizontal motion but already inside (a gate slab closed
      // onto the entity): leave by the shorter side, never stay buried.
      const dl = (e.x + PLAT_HW) - s.x, dr = (s.x + s.w) - (e.x - PLAT_HW);
      e.x = dl < dr ? s.x - PLAT_HW : s.x + s.w + PLAT_HW;
    }
    e.vx = 0;
  }
  const prevFeet = e.y + PLAT_HH;
  e.y += e.vy;
  e.ground = false;
  for (const s of solids) {
    if (!platOverlap(e, s)) continue;
    if (e.vy >= 0 && prevFeet <= s.y + 0.05) { e.y = s.y - PLAT_HH; e.vy = 0; e.ground = true; }
    else if (e.vy < 0 && !s.oneWay) { e.y = s.y + s.h + PLAT_HH; e.vy = 0; }
  }
}

// --- Game 22: Người Que Đại Chiến (versus platform fighter) -------------
// Stick fighters on an open stage: run, double jump, dash, and a melee
// swing whose knockback scales with the VICTIM's damage %. Blast
// bounds on every side (past |x| 13, below y 12.5, above y -15) cost a
// life; the last fighter standing wins, and at the 90s cap the ranking
// is lives first, then LOWEST damage. Placement 300/200/100/50 once.
function stepFight(room, t) {
  const g = room.game;
  if (g.phase !== 'fight') return false;
  if (t >= g.endsAt) { finishFight(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'fight') {
      simulateFightTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function fightIntent(room, p) {
  const g = room.game;
  if (p.type === 'human') {
    const pad = g.pad[p.seat] || {};
    const prev = g.padPrev[p.seat] || {};
    return {
      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),
      jump: (!!pad.u && !prev.u) || (!!pad.y && !prev.y),
      atk: !!pad.a && !prev.a,
      hvy: !!pad.x && !prev.x,
      dash: !!pad.b && !prev.b,
    };
  }
  return botBrainFight(room, p);
}
// One melee swing from `seat`: the arc reaches FIGHT reach in the
// facing direction and a full body height up/down, same test either
// way. A heavy swing adds FIGHT_HVY_DMG instead of FIGHT_DMG and
// multiplies the knockback force (computed AFTER the damage lands,
// exactly like a normal hit) by 1.5.
function fightSwing(room, seat, heavy) {
  const g = room.game;
  const b = g.blobs[seat];
  const face = g.face[seat] || 1;
  room.players.forEach((q) => {
    if (q.seat === seat) return;
    const qb = g.blobs[q.seat];
    if (!qb || !qb.alive || (g.invuln[q.seat] || 0) > 0) return;
    const dx = qb.x - b.x, dy = qb.y - b.y;
    if (Math.abs(dy) > 1.7 || Math.abs(dx) > 2.1 || (Math.abs(dx) > 0.3 && Math.sign(dx) !== face)) return;
    g.dmg[q.seat] = (g.dmg[q.seat] || 0) + (heavy ? FIGHT_HVY_DMG : FIGHT_DMG);
    let force = 0.15 + g.dmg[q.seat] * 0.0125; // AFTER the damage lands (per-tick velocity: halved at 62.5ms)
    if (heavy) force *= 1.5;
    qb.vx = face * force;
    qb.vy = -force * 0.55;
    qb.ground = false;
    g.hitT[q.seat] = FIGHT_HITSTUN;
    g.dashT[q.seat] = 0;
  });
}
function simulateFightTick(room) {
  const g = room.game;
  g.tickCount += 1;
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    const seat = p.seat;
    if (g.atkCd[seat] > 0) g.atkCd[seat] -= 1;
    if (g.atkT[seat] > 0) g.atkT[seat] -= 1;
    if ((g.hvyCd[seat] || 0) > 0) g.hvyCd[seat] -= 1;
    if ((g.hvyT[seat] || 0) > 0) g.hvyT[seat] -= 1;
    if (g.dashCd[seat] > 0) g.dashCd[seat] -= 1;
    if ((g.invuln[seat] || 0) > 0) g.invuln[seat] -= 1;
    const stunned = (g.hitT[seat] || 0) > 0;
    if (stunned) g.hitT[seat] -= 1;
    const it = fightIntent(room, p);
    // Dash start (fresh press, off cooldown, not stunned).
    if (!stunned && it.dash && g.dashCd[seat] <= 0 && (g.dashT[seat] || 0) <= 0) {
      g.dashDir[seat] = it.x !== 0 ? it.x : (g.face[seat] || 1);
      g.dashT[seat] = FIGHT_DASH_TICKS;
      g.dashCd[seat] = FIGHT_DASH_CD;
    }
    if ((g.dashT[seat] || 0) > 0) {
      g.dashT[seat] -= 1;
      b.vx = g.dashDir[seat] * FIGHT_DASH_SPEED;
      b.vy = -FIGHT_GRAV; // pre-cancel gravity: the dash flies level
      g.face[seat] = g.dashDir[seat];
    } else if (stunned) {
      b.vx *= b.ground ? 0.8803 : 0.9685; // knockback slide, no control (sqrt-rescaled per-tick friction)
    } else {
      if (it.x !== 0) {
        g.face[seat] = it.x;
        if (Math.abs(b.vx) <= FIGHT_RUN || Math.sign(b.vx) !== it.x) b.vx = it.x * FIGHT_RUN;
        else b.vx *= b.ground ? 0.9628 : 0.9925; // launched: bleed back toward run speed
      } else {
        b.vx *= b.ground ? 0.8614 : 0.9742;
        if (Math.abs(b.vx) < 0.015) b.vx = 0;
      }
      if (it.jump && (g.jumps[seat] || 0) < 2) {
        b.vy = (g.jumps[seat] || 0) === 0 ? -FIGHT_JUMP : -FIGHT_DJUMP;
        g.jumps[seat] = (g.jumps[seat] || 0) + 1;
        b.ground = false;
      }
    }
    // Melee: a fresh A press swings at once. A fresh X press is the
    // heavy swing — its own longer cooldown, +16% and 1.5x knockback,
    // and a longer recovery pose. If both edges land on the same
    // tick the heavy wins and the normal swing is skipped.
    if (!stunned && it.hvy && (g.hvyCd[seat] || 0) <= 0) {
      g.hvyT[seat] = FIGHT_HVY_ATK_T;
      g.hvyCd[seat] = FIGHT_HVY_CD;
      fightSwing(room, seat, true);
    } else if (!stunned && it.atk && g.atkCd[seat] <= 0) {
      g.atkT[seat] = 8;
      g.atkCd[seat] = FIGHT_ATK_CD;
      fightSwing(room, seat, false);
    }
    platStep(b, FIGHT_PLATFORMS, FIGHT_GRAV, PLAT_MAXFALL);
    if (b.ground) g.jumps[seat] = 0;
    // Ring-out past the blast bounds (widened with the 16:9 stage:
    // the floor now spans +-11.3, the field +-16 x +-9).
    if (b.x < -17.5 || b.x > 17.5 || b.y > 10.5 || b.y < -11.5) {
      b.lives -= 1;
      if (b.lives > 0) {
        b.x = 0; b.y = FIGHT_PLATFORMS[3].y - PLAT_HH - 0.6; b.vx = 0; b.vy = 0; b.ground = false;
        g.dmg[seat] = 0; g.jumps[seat] = 0; g.hitT[seat] = 0; g.dashT[seat] = 0; g.hvyT[seat] = 0;
        g.invuln[seat] = INVULN_TICKS; // 2s of cover on the way back in
      } else {
        b.alive = false;
        g.elimOrder.push(seat);
        g.elimTick[seat] = g.tickCount;
      }
    }
  });
  snapshotPad(room);
  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;
  if (aliveCount <= 1) finishFight(room);
}
function botBrainFight(room, p) {
  const g = room.game;
  const me = g.blobs[p.seat];
  const intent = { x: 0, jump: false, atk: false, hvy: false, dash: false };
  if (!me || !me.alive) return intent;
  // Recovery first — checked every tick, it is life-critical: airborne,
  // low or out past the floor's edge, so steer home and spend jumps /
  // the dash to get back over the stage.
  if (!me.ground && (me.y > 1 || Math.abs(me.x) > 11.3)) {
    intent.x = me.x > 0 ? -1 : 1;
    if (me.vy > 0.1 && me.y > -1.1 && (g.jumps[p.seat] || 0) < 2) intent.jump = true;
    else if (Math.abs(me.x) > 12.7 && (g.dashCd[p.seat] || 0) <= 0) intent.dash = true;
    return intent;
  }
  // Combat steering, re-decided on the usual per-difficulty cadence.
  const cached = g.botIntent[p.seat];
  let dir = cached && typeof cached.x === 'number' ? cached.x : 0;
  if (!cached || (g.tickCount + p.seat) % brainCadence(p) === 0) {
    const near = nearestFoe(room, p);
    dir = near.foe ? (Math.abs(near.foe.x - me.x) > 0.3 ? Math.sign(near.foe.x - me.x) : 0) : 0;
    // Never chase a foe off the edge: near the rim, hold inward.
    if (Math.abs(me.x) > 10.4 && dir === Math.sign(me.x)) dir = -Math.sign(me.x);
    g.botIntent[p.seat] = { x: dir, y: 0 };
  }
  intent.x = dir;
  const near = nearestFoe(room, p);
  if (near.foe) {
    const dx = near.foe.x - me.x, dy = near.foe.y - me.y;
    if (me.ground && dy < -2 && Math.abs(dx) < 2.2) intent.jump = true; // hop up to their platform
    if (Math.abs(dx) <= 2.0 && Math.abs(dy) <= 1.6) {
      // Finisher: against a badly hurt foe (>= 50%), Khó/Vừa bots
      // sometimes spend the heavy swing instead of a normal one —
      // only when its own cooldown is ready. Dễ bots never heavy.
      const foeDmg = near.foeSeat != null ? (g.dmg[near.foeSeat] || 0) : 0;
      const hvyProb = p.difficulty === 'kho' ? 0.194 : p.difficulty === 'vua' ? 0.078 : 0; // per-tick rolls: 1-sqrt(1-p) keeps the per-second rate
      if (hvyProb > 0 && foeDmg >= 50 && (g.hvyCd[p.seat] || 0) <= 0 && Math.random() < hvyProb) {
        intent.hvy = true;
      } else {
        const prob = p.difficulty === 'kho' ? 0.684 : p.difficulty === 'vua' ? 0.368 : 0.194;
        if (Math.random() < prob) intent.atk = true;
      }
    } else if (Math.abs(dx) > 6 && p.difficulty !== 'de' && Math.random() < 0.134) {
      intent.dash = true;
    }
  }
  return intent;
}
function finishFight(room) {
  const g = room.game;
  const aliveRanked = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive)
    .sort((a, b) => (g.blobs[b.seat].lives - g.blobs[a.seat].lives)
      || ((g.dmg[a.seat] || 0) - (g.dmg[b.seat] || 0)) || (a.seat - b.seat));
  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);
  const ranking = aliveRanked.concat(elimRanked);
  const entries = ranking.map((p, i) => ({
    seat: p.seat, points: placementAt(i),
    lives: g.blobs[p.seat].lives, dmg: g.dmg[p.seat] || 0, alive: g.blobs[p.seat].alive,
  }));
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}

// --- Game 23: Đền Lửa & Nước (COOP temple platformer) -------------------
// Elements by seat parity (odd = Lửa, even = Nước). Pools kill by
// element: red is safe only for Lửa, blue only for Nước, green kills
// both — tested against the character's feet box so a clean jump over
// a pool never clips it. Gems are colour-locked the same way. The two
// portcullis gates share one open state, driven by either pressure
// button. "Home" is positional: a character is home while standing in
// its own door zone, and the level completes the tick EVERY character
// is home at once (someone who rushed home can step back out to hold
// the balcony button for a partner who fell behind).
function poolLethal(kind, el) {
  if (kind === 'green') return true;
  if (kind === 'red') return el === 'nuoc';
  return el === 'lua'; // blue
}
function stepTemple(room, t) {
  const g = room.game;
  if (g.phase !== 'temple') return false;
  if (t >= g.endsAt) { finishTemple(room, false); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'temple') {
      simulateTempleTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function templeIntent(room, p) {
  const g = room.game;
  if (p.type === 'human') {
    const pad = g.pad[p.seat] || {};
    const prev = g.padPrev[p.seat] || {};
    return {
      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),
      jump: (!!pad.u && !prev.u) || (!!pad.a && !prev.a) || (!!pad.y && !prev.y),
    };
  }
  return botBrainTemple(room, p);
}
function simulateTempleTick(room) {
  const g = room.game;
  g.tickCount += 1;
  // Gate state is read from where everyone stands BEFORE this tick's
  // movement: a holder stepping off closes the slabs for the next tick.
  g.gateOpen = room.players.some((p) => {
    const c = g.chars[p.seat];
    return c && TEMPLE_LEVEL.buttons.some((bt) => platOverlap(c, bt));
  });
  const solids = g.gateOpen ? TEMPLE_LEVEL.solids : TEMPLE_LEVEL.solids.concat(TEMPLE_LEVEL.gates);
  let heartsGone = false;
  room.players.forEach((p) => {
    const c = g.chars[p.seat];
    if (!c) return;
    const it = templeIntent(room, p);
    if (it.jump && c.ground) { c.vy = -TEMP_JUMP; c.ground = false; }
    c.vx = it.x * TEMP_RUN;
    platStep(c, solids, TEMP_GRAV, PLAT_MAXFALL);
    // Pools: only the feet box counts, so jumping a pool is safe.
    for (const pool of TEMPLE_LEVEL.pools) {
      const inX = c.x + 0.25 > pool.x && c.x - 0.25 < pool.x + pool.w;
      const inFeet = c.y + PLAT_HH > pool.y && c.y + PLAT_HH - 0.5 < pool.y + pool.h;
      if (inX && inFeet && poolLethal(pool.kind, c.el)) {
        g.hearts -= 1;
        const st = TEMPLE_LEVEL.starts[c.el];
        c.x = st.x; c.y = st.y; c.vx = 0; c.vy = 0;
        if (p.type === 'bot') { g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0; }
        if (g.hearts <= 0) heartsGone = true;
        break;
      }
    }
    if (heartsGone) return;
    (g.gems || []).forEach((gm) => {
      if (!gm.taken && gm.el === c.el && Math.hypot(gm.x - c.x, gm.y - c.y) < 1.15) {
        gm.taken = true;
        g.gemCount[c.el] = (g.gemCount[c.el] || 0) + 1;
      }
    });
    c.home = platOverlap(c, TEMPLE_LEVEL.doors[c.el]);
  });
  snapshotPad(room);
  if (heartsGone) { finishTemple(room, false); return; }
  if (room.players.every((p) => g.chars[p.seat] && g.chars[p.seat].home)) finishTemple(room, true);
}
function botBrainTemple(room, p) {
  const g = room.game;
  const c = g.chars[p.seat];
  const intent = { x: 0, jump: false };
  if (!c || c.home) return intent;
  const route = TEMPLE_WP[c.el] || [];
  const idx = g.wpIdx[p.seat] || 0;
  if (idx >= route.length) return intent;
  const wp = route[idx];
  if (Math.abs(c.x - wp.x) < 0.4 && Math.abs(c.y - wp.y) < 0.75) {
    if (wp.holdBtn) {
      if (!g.wpAt[p.seat]) g.wpAt[p.seat] = g.tickCount;
      const partnersIn = room.players.every((q) => q.seat === p.seat
        || (g.chars[q.seat] && (g.chars[q.seat].home || g.chars[q.seat].y < -1.5)));
      if (!partnersIn && g.tickCount - g.wpAt[p.seat] < 480) return intent; // keep holding (30s at the shared 62.5ms tick)
    }
    g.wpIdx[p.seat] = idx + 1;
    g.wpAt[p.seat] = 0;
    return intent;
  }
  const dx = wp.x - c.x;
  intent.x = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0;
  if (c.ground) {
    if (wp.y < c.y - 0.8 && Math.abs(dx) < 2.4) intent.jump = true; // climb toward the waypoint
    if (!intent.jump && intent.x !== 0) {
      const aheadX = c.x + intent.x * 0.95;
      for (const pool of TEMPLE_LEVEL.pools) {
        if (poolLethal(pool.kind, c.el)
          && aheadX > pool.x - 0.2 && aheadX < pool.x + pool.w + 0.2
          && Math.abs((c.y + PLAT_HH) - (pool.y + pool.h)) < 0.75) { intent.jump = true; break; }
      }
    }
  }
  return intent;
}
function finishTemple(room, completed) {
  const g = room.game;
  const total = (g.gemCount.lua || 0) + (g.gemCount.nuoc || 0);
  let tier = 'none';
  if (completed && total >= TEMP_GEMS_TOTAL) tier = 'vang';
  else if (completed) tier = 'bac';
  else if (total * 2 >= TEMP_GEMS_TOTAL) tier = 'dong';
  finishCoop(room, total, tier, 'viên ngọc');
}

// --- Game 24: Đá Bóng Đầu To (versus team soccer) ------------------------
// Odd seats = Đỏ (defend left), even seats = Xanh. The deepest player
// of each team spawns in goal; everyone resets there after each goal
// while the match clock is banked (remainMs), so celebrations are
// free. Scoring is the tug-of-war team path (not placement): winners
// 300 each, draw 150 each, losers 50 each. Own goals count — the
// scoreboard credits the TEAM, and goalInfo.by keeps the culprit.
function soccerTeam(seat) { return seat % 2 === 1 ? 'do' : 'xanh'; }
function soccerKickoff(room) {
  const g = room.game;
  const byTeam = { do: [], xanh: [] };
  room.players.forEach((p) => { byTeam[soccerTeam(p.seat)].push(p.seat); });
  g.goalieSeat = {};
  ['do', 'xanh'].forEach((tm) => {
    const seats = byTeam[tm];
    const flip = tm === 'do' ? 1 : -1; // SOCCER_FWD_X is written for the left side
    g.goalieSeat[tm] = seats.length >= 2 ? seats[seats.length - 1] : null;
    seats.forEach((seat, i) => {
      const b = g.blobs[seat];
      if (!b) return;
      const isG = g.goalieSeat[tm] === seat;
      b.x = flip * (isG ? -SOCCER_GOALIE_X : SOCCER_FWD_X[Math.min(i, SOCCER_FWD_X.length - 1)]);
      b.y = 7.1; b.vx = 0; b.vy = 0; b.ground = true;
      g.face[seat] = tm === 'do' ? 1 : -1;
      g.dashT[seat] = 0; g.kickCd[seat] = 0;
    });
  });
  g.ball = { x: 0, y: 8 - SOCCER_BALL_R, vx: 0, vy: 0 };
}
function stepSoccer(room, t) {
  const g = room.game;
  if (g.phase === 'goal') {
    if (t >= g.endsAt) {
      soccerKickoff(room);
      g.phase = 'soccer';
      g.endsAt = t + Math.max(1000, g.remainMs || SOCCER_MS);
      g.nextTickAt = t + TICK_MS;
      return true;
    }
    return false;
  }
  if (g.phase !== 'soccer') return false;
  if (t >= g.endsAt) { finishSoccer(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'soccer') {
      simulateSoccerTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function soccerIntent(room, p) {
  const g = room.game;
  if (p.type === 'human') {
    const pad = g.pad[p.seat] || {};
    const prev = g.padPrev[p.seat] || {};
    return {
      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),
      jump: (!!pad.u && !prev.u) || (!!pad.y && !prev.y),
      kick: !!pad.a && !prev.a,
      dash: !!pad.b && !prev.b,
    };
  }
  return botBrainSoccer(room, p);
}
function simulateSoccerTick(room) {
  const g = room.game;
  g.tickCount += 1;
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b) return;
    const seat = p.seat;
    if (g.dashCd[seat] > 0) g.dashCd[seat] -= 1;
    if (g.kickCd[seat] > 0) g.kickCd[seat] -= 1;
    const it = soccerIntent(room, p);
    if (it.x !== 0) g.face[seat] = it.x;
    if (it.dash && g.dashCd[seat] <= 0 && (g.dashT[seat] || 0) <= 0) {
      g.dashDir[seat] = it.x !== 0 ? it.x : (g.face[seat] || 1);
      g.dashT[seat] = SOCCER_DASH_TICKS;
      g.dashCd[seat] = SOCCER_DASH_CD;
    }
    if ((g.dashT[seat] || 0) > 0) {
      g.dashT[seat] -= 1;
      b.vx = g.dashDir[seat] * SOCCER_DASH_SPEED;
    } else {
      b.vx = it.x * SOCCER_RUN;
    }
    if (it.jump && b.ground) { b.vy = -SOCCER_JUMP; b.ground = false; }
    if (it.kick && g.kickCd[seat] <= 0) soccerKick(room, seat);
    platStep(b, SOCCER_SOLIDS, SOCCER_GRAV, PLAT_MAXFALL);
  });
  stepSoccerBall(room);
  snapshotPad(room);
  const ball = g.ball;
  if (ball && ball.y > 4.6) {
    if (ball.x < -16.6) soccerGoal(room, 'xanh');
    else if (ball.x > 16.6) soccerGoal(room, 'do');
  }
}
function soccerKick(room, seat) {
  const g = room.game;
  const b = g.blobs[seat]; const ball = g.ball;
  if (!b || !ball) return;
  if (Math.hypot(ball.x - b.x, ball.y - b.y) > 2.3) return; // out of reach: no kick, no cooldown
  g.kickCd[seat] = SOCCER_KICK_CD;
  const pad = g.pad[seat] || {};
  let vx = SOCCER_KICK_VX, vy = SOCCER_KICK_VY;
  if (pad.u) { vx *= 0.8; vy = 0.425; } // lob it
  else if (pad.d) { vx *= 1.15; vy = 0.125; } // low drive
  ball.vx = (g.face[seat] || 1) * vx;
  ball.vy = -vy;
  g.lastTouch = seat;
}
function stepSoccerBall(room) {
  const g = room.game;
  const ball = g.ball;
  if (!ball) return;
  ball.vy = Math.min(0.65, ball.vy + SOCCER_BALL_GRAV);
  ball.x += ball.vx;
  ball.y += ball.vy;
  for (const s of SOCCER_SOLIDS) {
    const nx = Math.max(s.x, Math.min(ball.x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(ball.y, s.y + s.h));
    const dx = ball.x - nx, dy = ball.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= SOCCER_BALL_R * SOCCER_BALL_R) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const ux = dx / d, uy = dy / d;
      ball.x = nx + ux * SOCCER_BALL_R;
      ball.y = ny + uy * SOCCER_BALL_R;
      const vn = ball.vx * ux + ball.vy * uy;
      if (vn < 0) {
        if (vn > -0.09) { ball.vx -= vn * ux; ball.vy -= vn * uy; } // settle, don't micro-bounce
        else {
          ball.vx -= (1 + SOCCER_BALL_REST) * vn * ux;
          ball.vy -= (1 + SOCCER_BALL_REST) * vn * uy;
          ball.vx *= 0.98; ball.vy *= 0.98;
        }
      }
    } else {
      ball.y = s.y - SOCCER_BALL_R;
      if (ball.vy > 0) ball.vy = -ball.vy * SOCCER_BALL_REST;
    }
  }
  // Player contact: dribble pushes, body blocks and jumping headers.
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b) return;
    const nx = Math.max(b.x - PLAT_HW, Math.min(ball.x, b.x + PLAT_HW));
    const ny = Math.max(b.y - PLAT_HH, Math.min(ball.y, b.y + PLAT_HH));
    const dx = ball.x - nx, dy = ball.y - ny;
    const d = Math.hypot(dx, dy);
    if (d >= SOCCER_BALL_R) return;
    if (d < 0.001) { ball.x = b.x + (g.face[p.seat] || 1) * (PLAT_HW + SOCCER_BALL_R); return; }
    const ux = dx / d, uy = dy / d;
    ball.x = nx + ux * SOCCER_BALL_R;
    ball.y = ny + uy * SOCCER_BALL_R;
    const vn = ball.vx * ux + ball.vy * uy;
    if (vn < 0.2) {
      ball.vx += (0.2 - vn) * ux + b.vx * 0.55;
      ball.vy += (0.2 - vn) * uy + (b.vy < 0 ? b.vy * 0.35 : 0);
    }
    if (uy < -0.5 && b.vy < -0.1) ball.vy = Math.min(ball.vy, -0.275); // header pop
    g.lastTouch = p.seat;
  });
  // Rolling friction once the ball is basically resting on the ground.
  if (ball.y >= 8 - SOCCER_BALL_R - 0.03 && Math.abs(ball.vy) < 0.05) {
    ball.vy = 0;
    ball.y = 8 - SOCCER_BALL_R;
    ball.vx *= 0.9695; // sqrt(0.94): same decay per second at 62.5ms
    if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
  }
}
function soccerGoal(room, team) {
  const g = room.game;
  g.score[team] = (g.score[team] || 0) + 1;
  const scorer = g.lastTouch != null ? playerAt(room, g.lastTouch) : null;
  g.goalInfo = { team, by: g.lastTouch, ownGoal: !!scorer && soccerTeam(scorer.seat) !== team };
  g.remainMs = Math.max(0, g.endsAt - now());
  g.phase = 'goal';
  g.endsAt = now() + SOCCER_GOAL_MS;
}
function botBrainSoccer(room, p) {
  const g = room.game;
  const me = g.blobs[p.seat];
  const intent = { x: 0, jump: false, kick: false, dash: false };
  if (!me || !g.ball) return intent;
  const ball = g.ball;
  const tm = soccerTeam(p.seat);
  const atk = tm === 'do' ? 1 : -1;
  const isGoalie = !!(g.goalieSeat && g.goalieSeat[tm] === p.seat);
  let tx;
  if (isGoalie) {
    const home = -atk * 15.0;
    tx = home + Math.max(-2.2, Math.min(2.2, (ball.x - home) * 0.3));
    if (Math.abs(ball.x - me.x) < 3.2 && Math.abs(ball.y - me.y) < 3) tx = ball.x; // charge a close ball
  } else {
    let closest = true;
    room.players.forEach((q) => {
      if (q.seat === p.seat || soccerTeam(q.seat) !== tm) return;
      if (g.goalieSeat && g.goalieSeat[tm] === q.seat) return;
      const qb = g.blobs[q.seat];
      if (qb && Math.hypot(ball.x - qb.x, ball.y - qb.y) < Math.hypot(ball.x - me.x, ball.y - me.y)) closest = false;
    });
    tx = closest ? ball.x + ball.vx * (p.difficulty === 'kho' ? 8 : 0) : ball.x * 0.45 - atk * 2;
  }
  if (Math.abs(tx - me.x) > 0.35) intent.x = Math.sign(tx - me.x);
  const dBall = Math.hypot(ball.x - me.x, ball.y - me.y);
  if (dBall < 2.3 && (g.kickCd[p.seat] || 0) <= 0) {
    const blunder = p.difficulty === 'de' && Math.random() < 0.22;
    const wantFace = blunder ? -atk : atk;
    if ((g.face[p.seat] || 1) === wantFace) intent.kick = true;
    else intent.x = wantFace;
  }
  if (ball.y < me.y - 1.6 && dBall < 2.6 && me.ground) intent.jump = true;
  if (!isGoalie && dBall > 7 && intent.x !== 0 && p.difficulty !== 'de' && Math.random() < 0.0305) intent.dash = true; // per-tick roll: 1-sqrt(1-p)
  return intent;
}
function finishSoccer(room) {
  const g = room.game;
  const d = g.score.do || 0, x = g.score.xanh || 0;
  const winner = d > x ? 'do' : x > d ? 'xanh' : null;
  const entries = room.players.map((p) => {
    const tm = soccerTeam(p.seat);
    return { seat: p.seat, team: tm, points: winner === null ? 150 : tm === winner ? 300 : 50 };
  });
  entries.forEach((e) => { g.points[e.seat] = e.points; });
  g.lastRound = { round: 1, entries, score: { do: d, xanh: x }, winnerTeam: winner };
  endGame(room);
}

// --- Game 25: Ếch Ộp Phiêu Lưu (co-op swallow-carry platformer) ----------
// Frogs are temple-style AABBs in the shared 24 x 24 space. The belly
// rules: B/X edge near a free, non-carrying teammate swallows them
// (they freeze, glued to the carrier); B/X again spits them out ahead
// with a hop. A carrier jumps with FROG_JUMP_CARRY — that boost is
// the whole point: the 5.2u spike strips fit between the solo and
// carrier clearances. Spikes use the temple feet-box test. Crates are
// pushed by contact (they inherit the pusher's run speed) and glide
// on with friction once released, so a crate can be shoved INTO a
// spike strip and hopped across; frogs stand on crates (they join the
// solids list), crates themselves ignore spikes.
function loadFrogChamber(room, idx, t) {
  const g = room.game;
  const L = FROG_LEVELS[idx - 1];
  g.chamber = idx;
  g.flies = L.flies.map((f) => ({ x: f.x, y: f.y, taken: false }));
  g.crates = L.crates.map((c) => ({ x: c.x, y: c.y, vx: 0, vy: 0, ground: true }));
  room.players.forEach((p, i) => {
    const st = L.starts[i % L.starts.length];
    const f = g.frogs[p.seat];
    if (!f) return;
    f.x = st.x; f.y = st.y; f.vx = 0; f.vy = 0; f.ground = true; f.belly = null; f.by = null;
    g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0;
  });
  g.endsAt = t + FROG_PER_MS;
}
function frogSolids(room) {
  const g = room.game;
  const L = FROG_LEVELS[g.chamber - 1];
  let solids = FROG_WALLS.concat(L.solids);
  (g.crates || []).forEach((c) => { solids = solids.concat([{ x: c.x - 0.6, y: c.y - 0.6, w: 1.2, h: 1.2 }]); });
  return solids;
}
function stepFrog(room, t) {
  const g = room.game;
  if (g.phase === 'frogClear') {
    if (t >= g.endsAt) {
      loadFrogChamber(room, g.chamber + 1, t);
      g.phase = 'frog';
      g.nextTickAt = t + TICK_MS;
      return true;
    }
    return false;
  }
  if (g.phase !== 'frog') return false;
  if (t >= g.endsAt) { finishFrog(room); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'frog') {
      simulateFrogTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function frogIntent(room, p) {
  const g = room.game;
  const f = g.frogs[p.seat];
  if (f && f.by != null) return { x: 0, jump: false, gulp: false }; // a passenger has no controls
  if (p.type === 'human') {
    const pad = g.pad[p.seat] || {};
    const prev = g.padPrev[p.seat] || {};
    return {
      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),
      jump: (!!pad.u && !prev.u) || (!!pad.a && !prev.a) || (!!pad.y && !prev.y),
      gulp: (!!pad.b && !prev.b) || (!!pad.x && !prev.x),
    };
  }
  return botBrainFrog(room, p);
}
function crateStep(c, solids) {
  // platStep's axis-separated resolution with the crate's own 0.6 half extents.
  const HW = 0.6, HH = 0.6;
  c.vy = Math.min(PLAT_MAXFALL, c.vy + TEMP_GRAV);
  c.x += c.vx;
  for (const s of solids) {
    if (s.oneWay) continue;
    if (c.x - HW < s.x + s.w && c.x + HW > s.x && c.y - HH < s.y + s.h && c.y + HH > s.y) {
      if (c.vx > 0) c.x = s.x - HW;
      else if (c.vx < 0) c.x = s.x + s.w + HW;
      c.vx = 0;
    }
  }
  const prevFeet = c.y + HH;
  c.y += c.vy;
  c.ground = false;
  for (const s of solids) {
    if (!(c.x - HW < s.x + s.w && c.x + HW > s.x && c.y - HH < s.y + s.h && c.y + HH > s.y)) continue;
    if (c.vy >= 0 && prevFeet <= s.y + 0.05) { c.y = s.y - HH; c.vy = 0; c.ground = true; }
    else if (c.vy < 0 && !s.oneWay) { c.y = s.y + s.h + HH; c.vy = 0; }
  }
}
function simulateFrogTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const L = FROG_LEVELS[g.chamber - 1];
  const staticSolids = FROG_WALLS.concat(L.solids);
  const intents = {};
  room.players.forEach((p) => { intents[p.seat] = frogIntent(room, p); });
  // Crates first: a pushing frog lends its run speed; a released crate
  // glides with friction. Crates then join the frogs' solids list.
  (g.crates || []).forEach((c, ci) => {
    let push = 0;
    room.players.forEach((p) => {
      const f = g.frogs[p.seat]; const it = intents[p.seat];
      if (!f || f.by != null || !it || it.x === 0) return;
      const dx = c.x - f.x;
      if (Math.sign(dx) === it.x && Math.abs(dx) <= 1.25 && Math.abs(f.y - c.y) < 1.1) push = it.x;
    });
    if (push !== 0) c.vx = push * FROG_RUN;
    // SMOOTH3: the glide decrement is acceleration-class — with the
    // release speed halved it must QUARTER (0.03 -> 0.0075) or the
    // glide distance (v^2 / 2a) halves. The 0.015 stop threshold is
    // a velocity and simply halves.
    else if (c.ground) c.vx = Math.abs(c.vx) <= 0.015 ? 0 : c.vx - Math.sign(c.vx) * 0.0075;
    crateStep(c, staticSolids);
    if (c.y > 10.5) { c.x = L.crates[ci].x; c.y = L.crates[ci].y; c.vx = 0; c.vy = 0; }
  });
  const solids = frogSolids(room);
  room.players.forEach((p) => {
    const f = g.frogs[p.seat];
    if (!f) return;
    const seat = p.seat;
    if (f.by != null) {
      const carrier = g.frogs[f.by];
      if (carrier) { f.x = carrier.x; f.y = carrier.y; }
      return;
    }
    const it = intents[seat];
    if (it.x !== 0) g.face[seat] = it.x;
    if (it.gulp) {
      if (f.belly != null) {
        const pas = g.frogs[f.belly];
        if (pas) {
          pas.by = null;
          pas.x = f.x + (g.face[seat] || 1) * 1.15;
          pas.y = f.y - 0.3;
          pas.vx = (g.face[seat] || 1) * 0.25;
          pas.vy = -0.5;
          pas.ground = false;
          const pasP = playerAt(room, f.belly);
          if (pasP && pasP.type === 'bot') {
            g.wpIdx[f.belly] = Math.max(g.wpIdx[f.belly] || 0, g.wpIdx[seat] || 0);
          }
        }
        f.belly = null;
      } else {
        let best = null, bd = 1.7;
        room.players.forEach((q) => {
          if (q.seat === seat) return;
          const qf = g.frogs[q.seat];
          if (!qf || qf.by != null || qf.belly != null) return;
          const d = Math.hypot(qf.x - f.x, qf.y - f.y);
          if (d <= bd) { bd = d; best = q.seat; }
        });
        if (best != null) {
          g.frogs[best].by = seat;
          g.frogs[best].vx = 0; g.frogs[best].vy = 0;
          f.belly = best;
        }
      }
    }
    if (it.jump && f.ground) {
      f.vy = -(f.belly != null ? FROG_JUMP_CARRY : FROG_JUMP);
      f.ground = false;
    }
    f.vx = it.x * FROG_RUN;
    platStep(f, solids, TEMP_GRAV, PLAT_MAXFALL);
    for (const sp of L.spikes) {
      // Spikes kill only once the feet are essentially ON the strip
      // (within 0.15 of the floor): a frog arcing over the far edge
      // with its feet still high is clearing it, not landing in it.
      // Standing in the strip (feetY = floor top) always dies.
      const inX = f.x + 0.25 > sp.x && f.x - 0.25 < sp.x + sp.w;
      const inFeet = f.y + PLAT_HH > sp.y + sp.h - 0.15;
      if (inX && inFeet) { frogDie(room, seat); break; }
    }
    if (g.frogs[seat] === f && f.y > 10.5) frogDie(room, seat);
  });
  (g.flies || []).forEach((fl) => {
    if (fl.taken) return;
    room.players.forEach((p) => {
      if (fl.taken) return;
      const f = g.frogs[p.seat];
      if (f && f.by == null && Math.hypot(fl.x - f.x, fl.y - f.y) < FROG_EAT_R) {
        fl.taken = true;
        g.fliesEaten = (g.fliesEaten || 0) + 1;
      }
    });
  });
  snapshotPad(room);
  if (g.hearts <= 0) { finishFrog(room); return; }
  const allHome = room.players.every((p) => {
    const f = g.frogs[p.seat];
    if (!f) return false;
    if (f.by != null) return true; // a passenger is wherever its carrier is
    return platOverlap(f, L.door);
  });
  if (allHome) {
    g.chambersDone = Math.max(g.chambersDone || 0, g.chamber);
    if (g.chamber >= FROG_LEVELS.length) { finishFrog(room); return; }
    g.phase = 'frogClear';
    g.endsAt = now() + 2000;
  }
}
function frogDie(room, seat) {
  const g = room.game;
  const L = FROG_LEVELS[g.chamber - 1];
  const idx = room.players.findIndex((p) => p.seat === seat);
  const st = L.starts[Math.max(0, idx) % L.starts.length];
  const f = g.frogs[seat];
  if (!f) return;
  // A passenger dies with its carrier: both restart for ONE heart.
  const rider = f.belly;
  f.x = st.x; f.y = st.y; f.vx = 0; f.vy = 0; f.belly = null;
  if (rider != null) {
    const rf = g.frogs[rider];
    if (rf) { rf.by = null; rf.x = st.x + 0.8; rf.y = st.y; rf.vx = 0; rf.vy = 0; }
    const rp = playerAt(room, rider);
    if (rp && rp.type === 'bot') g.wpIdx[rider] = 0;
  }
  const me = playerAt(room, seat);
  if (me && me.type === 'bot') g.wpIdx[seat] = 0;
  g.hearts -= 1;
}
function botBrainFrog(room, p) {
  const g = room.game;
  const f = g.frogs[p.seat];
  const intent = { x: 0, jump: false, gulp: false };
  if (!f || f.by != null) return intent;
  const L = FROG_LEVELS[g.chamber - 1];
  const route = FROG_WP[g.chamber - 1] || [];
  const idx = g.wpIdx[p.seat] || 0;
  if (idx >= route.length) return intent;
  const wp = route[idx];
  const dx = wp.x - f.x;
  const dy = (wp.y != null ? wp.y : f.y) - f.y;
  if (wp.swallow && f.belly == null) {
    // Park at the swallow point until a free teammate is in range to
    // gulp down; a 20s timeout keeps a lone bot from freezing the run.
    if (!g.wpAt[p.seat]) g.wpAt[p.seat] = g.tickCount;
    let mateNear = false;
    room.players.forEach((q) => {
      if (q.seat === p.seat) return;
      const qf = g.frogs[q.seat];
      if (qf && qf.by == null && qf.belly == null && Math.hypot(qf.x - f.x, qf.y - f.y) <= 1.7) mateNear = true;
    });
    if (mateNear && Math.abs(dx) < 1.2) {
      intent.gulp = true;
      g.wpIdx[p.seat] = idx + 1;
      g.wpAt[p.seat] = 0;
      return intent;
    }
    if (g.tickCount - (g.wpAt[p.seat] || 0) > 320) { g.wpIdx[p.seat] = idx + 1; g.wpAt[p.seat] = 0; return intent; }
    if (Math.abs(dx) >= 0.45) intent.x = Math.sign(dx);
    return intent;
  }
  if (wp.spit && f.belly != null && f.ground && Math.abs(dx) < 0.6) {
    intent.gulp = true;
    g.wpIdx[p.seat] = idx + 1;
    return intent;
  }
  if (Math.abs(dx) < 0.45 && (wp.y == null || Math.abs(dy) < 0.8)) { g.wpIdx[p.seat] = idx + 1; return intent; }
  intent.x = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0;
  if (f.ground && intent.x !== 0) {
    if (wp.y != null && dy < -0.8 && Math.abs(dx) < 3.0) intent.jump = true;
    else {
      // Hazard probe: jump as the near edge of a spike strip comes
      // underfoot — a carrying bot leaves it later (0.5) because its
      // boosted jump needs the latest safe takeoff.
      const lead = f.belly != null ? 0.6 : 1.15;
      for (const sp of L.spikes) {
        const edge = intent.x > 0 ? sp.x : sp.x + sp.w;
        const dist = (edge - f.x) * intent.x;
        if (dist > 0 && dist < lead && f.y + PLAT_HH > sp.y - 1.2) { intent.jump = true; break; }
      }
    }
  }
  return intent;
}
function finishFrog(room) {
  const g = room.game;
  const done = g.chambersDone || 0;
  const flies = g.fliesEaten || 0;
  let tier = 'none';
  if (done >= FROG_LEVELS.length && flies >= FROG_LEVELS.length * 3) tier = 'vang';
  else if (done >= FROG_LEVELS.length) tier = 'bac';
  else if (done >= 1) tier = 'dong';
  finishCoop(room, flies, tier, 'con ruồi');
}

// --- Game 26: Đại Bác Căn Góc (turn-based artillery) ----------------------
// One cannon takes the whole 'aim' phase (30s): its owner sweeps
// angle/power with the pad (2.5 deg / 3 power per tick), flips with
// X, fires with A; an idle human simply passes. Bots solve the
// ballistic equation (ignoring wind), walk their correction from
// their last landing offset, then add difficulty error. The boom
// carves the heightmap in a circle and every cannon settles onto the
// new surface; falling out of the world never happens (the carve is
// capped), so elimination is HP-only. Placement: survivors by HP,
// then reverse elimination order — all through placementAt().
function cannonColAt(x) { return Math.max(0, Math.min(CANNON_COLS - 1, Math.floor((x + 16) / 0.2))); }
function cannonNextTurn(room, t, afterSeat) {
  const g = room.game;
  const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);
  let next = null;
  if (afterSeat == null) next = seats.find((s) => g.cannons[s] && g.cannons[s].alive);
  else {
    const i = seats.indexOf(afterSeat);
    for (let k = 1; k <= seats.length; k++) {
      const s = seats[(i + k) % seats.length];
      if (g.cannons[s] && g.cannons[s].alive) { next = s; break; }
    }
  }
  g.turnSeat = next;
  g.wind = randInt(-6, 6);
  g.phase = 'aim';
  g.endsAt = t + CANNON_AIM_MS;
  g.nextTickAt = t + TICK_MS;
  const cp = next != null ? playerAt(room, next) : null;
  g.botFireAt = cp && cp.type === 'bot' ? t + Math.round(rand(1000, 2000)) : 0;
  snapshotPad(room);
}
function cannonFire(room, seat) {
  const g = room.game;
  const c = g.cannons[seat];
  if (!c || !c.alive) return;
  const rad = (c.angle * Math.PI) / 180;
  const v = Math.max(4, c.power) / 100 * BALLISTICS.maxV;
  const dx = c.face * Math.cos(rad), dy = -Math.sin(rad);
  g.shell = {
    x: Math.round((c.x + dx * 1.0) * 1000) / 1000,
    y: Math.round((c.y - 0.4 + dy * 1.0) * 1000) / 1000,
    vx: dx * v, vy: dy * v, by: seat, trail: [], born: now(),
  };
  g.phase = 'shell';
  g.nextTickAt = now() + TICK_MS;
}
function stepCannon(room, t) {
  const g = room.game;
  if (g.phase === 'aim') {
    if (t >= g.matchEndsAt) { finishCannon(room); return true; }
    const seat = g.turnSeat;
    const c = seat != null ? g.cannons[seat] : null;
    if (!c || !c.alive) { cannonNextTurn(room, t, seat); return true; }
    const cp = playerAt(room, seat);
    if (cp && cp.type === 'bot') {
      if (t >= g.botFireAt) { cannonBotAim(room, cp); cannonFire(room, seat); return true; }
      return false;
    }
    if (t >= g.endsAt) { cannonNextTurn(room, t, seat); return true; } // idle: the turn passes
    if (t >= g.nextTickAt) {
      // Catch-up (see stepArena): a held pad applies once per missed
      // tick, up to 4 — exactly what four on-time ticks would do.
      // Edges still fire once: padPrev tracks the pad after the first
      // sub-tick, so the A fire / X flip cannot repeat inside the loop.
      let nCU = 0;
      while (nCU < 8 && t >= g.nextTickAt && g.phase === 'aim') {
        const pad = g.pad[seat] || {};
        const prev = g.padPrev[seat] || {};
        if (pad.u) c.angle = Math.min(85, c.angle + 1.25);
        if (pad.d) c.angle = Math.max(5, c.angle - 1.25);
        if (pad.l) c.power = Math.max(0, c.power - 1.5);
        if (pad.r) c.power = Math.min(100, c.power + 1.5);
        if (pad.x && !prev.x) c.face = -c.face;
        g.padPrev[seat] = Object.assign({}, pad);
        g.nextTickAt += TICK_MS;
        nCU++;
        if (pad.a && !prev.a) { cannonFire(room, seat); return true; }
      }
      if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
      return true;
    }
    return false;
  }
  if (g.phase === 'shell') {
    if (t >= g.nextTickAt) {
      // Catch-up (see stepArena): up to 8 missed ticks, then resync.
      let nCU = 0;
      while (nCU < 8 && t >= g.nextTickAt && g.phase === 'shell') {
        simulateShellTick(room);
        if (room.game !== g) return true; // the tick ended the game
        g.nextTickAt += TICK_MS;
        nCU++;
      }
      if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
      return true;
    }
    return false;
  }
  if (g.phase === 'boom') {
    if (t >= g.endsAt) {
      const alive = room.players.filter((p) => g.cannons[p.seat] && g.cannons[p.seat].alive);
      if (alive.length <= 1 || t >= g.matchEndsAt) { finishCannon(room); return true; }
      cannonNextTurn(room, t, g.turnSeat);
      return true;
    }
    return false;
  }
  return false;
}
function simulateShellTick(room) {
  const g = room.game;
  const sh = g.shell;
  if (!sh) { g.phase = 'aim'; return; }
  const B = BALLISTICS;
  const dt = 1 / B.sub;
  for (let i = 0; i < B.sub; i++) {
    sh.vy += B.grav * dt;
    sh.vx += g.wind * B.windK * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    let direct = false;
    room.players.forEach((p) => {
      const c = g.cannons[p.seat];
      if (c && c.alive && Math.hypot(sh.x - c.x, sh.y - (c.y - 0.4)) < 0.85) direct = true;
    });
    if (direct) { resolveBoom(room, sh.x, sh.y); return; }
    if (sh.x < -16.6 || sh.x > 16.6) { // sailed out of the world: no boom
      g.shell = null;
      g.boomFx = null;
      g.phase = 'boom';
      g.endsAt = now() + 300;
      return;
    }
    if (sh.y >= g.heights[cannonColAt(sh.x)]) { resolveBoom(room, sh.x, g.heights[cannonColAt(sh.x)]); return; }
  }
  sh.trail.push({ x: Math.round(sh.x * 100) / 100, y: Math.round(sh.y * 100) / 100 });
  if (sh.trail.length > 80) sh.trail = sh.trail.slice(-80);
  if (now() - sh.born > 12000) {
    g.shell = null;
    g.boomFx = null;
    g.phase = 'boom';
    g.endsAt = now() + 300;
  }
}
function resolveBoom(room, ix, iy) {
  const g = room.game;
  const B = BALLISTICS;
  const by = g.shell ? g.shell.by : null;
  const hits = {};
  room.players.forEach((p) => {
    const c = g.cannons[p.seat];
    if (!c || !c.alive) return;
    const d = Math.hypot(ix - c.x, iy - (c.y - 0.4));
    if (d < B.blastR) {
      const dmg = Math.round(B.dmgMax * (1 - d / B.blastR));
      if (dmg > 0) {
        hits[p.seat] = dmg;
        c.hp -= dmg;
        if (by != null && by !== p.seat) g.dmgDealt[by] = (g.dmgDealt[by] || 0) + dmg;
      }
    }
  });
  for (let i = 0; i < CANNON_COLS; i++) {
    const cx = -16 + (i + 0.5) * 0.2;
    const dx = Math.abs(cx - ix);
    if (dx < B.blastR) {
      const depth = Math.sqrt(B.blastR * B.blastR - dx * dx);
      const target = Math.min(7.6, iy + depth);
      if (target > g.heights[i]) g.heights[i] = Math.round(target * 100) / 100;
    }
  }
  room.players.forEach((p) => {
    const c = g.cannons[p.seat];
    if (!c || !c.alive) return;
    c.y = g.heights[c.col];
    if (c.hp <= 0) {
      c.alive = false;
      c.hp = 0;
      g.elimOrder.push(p.seat);
    }
  });
  g.lastImpact = { x: Math.round(ix * 100) / 100, y: Math.round(iy * 100) / 100, by };
  g.boomFx = { x: g.lastImpact.x, y: g.lastImpact.y, hits, at: now() };
  g.shell = null;
  g.phase = 'boom';
  g.endsAt = now() + CANNON_BOOM_MS;
}
function cannonBotAim(room, p) {
  const g = room.game;
  const c = g.cannons[p.seat];
  if (!c) return;
  let tgt = null, td = 1e9;
  room.players.forEach((q) => {
    if (q.seat === p.seat) return;
    const qc = g.cannons[q.seat];
    if (qc && qc.alive && Math.abs(qc.x - c.x) < td) { td = Math.abs(qc.x - c.x); tgt = qc; }
  });
  if (!tgt) return;
  const B = BALLISTICS;
  const ox = c.x, oy = c.y - 0.4;
  const R = Math.abs(tgt.x - ox), dy = (tgt.y - 0.4) - oy; // +dy: the target sits lower
  let solved = null;
  for (const deg of [45, 55, 65, 35]) {
    const rad = (deg * Math.PI) / 180;
    const denom = Math.cos(rad) * Math.cos(rad) * (dy + R * Math.tan(rad));
    if (denom <= 0.01) continue;
    const v2 = (0.5 * B.grav * R * R) / denom;
    if (v2 <= 0) continue;
    const v = Math.sqrt(v2);
    if (v <= B.maxV * 1.02) { solved = { angle: deg, v }; break; }
  }
  if (!solved) solved = { angle: 45, v: B.maxV };
  let angle = solved.angle;
  let power = Math.max(4, Math.min(100, Math.round((solved.v / B.maxV) * 100)));
  // Shot-walking: correct by my last shot's landing offset (the
  // memory is only honoured against the same intended target area).
  const li = g.lastImpact;
  if (li && li.by === p.seat && p.difficulty !== 'de') {
    const off = li.x - tgt.x;
    const fix = p.difficulty === 'kho' ? 1 : 0.5;
    power = Math.max(4, Math.min(100, Math.round(power - off * 2.2 * fix)));
  }
  const err = p.difficulty === 'kho' ? [2, 3] : p.difficulty === 'vua' ? [5, 6] : [10, 12];
  angle = Math.max(5, Math.min(85, angle + rand(-err[0], err[0])));
  power = Math.max(4, Math.min(100, power + rand(-err[1], err[1])));
  c.face = tgt.x >= c.x ? 1 : -1;
  c.angle = Math.round(angle * 10) / 10;
  c.power = Math.round(power);
}
function finishCannon(room) {
  const g = room.game;
  const aliveRanked = room.players.filter((p) => g.cannons[p.seat] && g.cannons[p.seat].alive)
    .sort((a, b) => (g.cannons[b.seat].hp - g.cannons[a.seat].hp)
      || ((g.dmgDealt[b.seat] || 0) - (g.dmgDealt[a.seat] || 0)) || (a.seat - b.seat));
  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);
  const ranking = aliveRanked.concat(elimRanked);
  const entries = ranking.map((p, i) => ({
    seat: p.seat, points: placementAt(i),
    hp: Math.max(0, g.cannons[p.seat].hp), dmgDealt: g.dmgDealt[p.seat] || 0, alive: g.cannons[p.seat].alive,
  }));
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}

function blobsView(room) {
  const g = room.game;
  const out = {};
  room.players.forEach((p) => {
    const b = g.blobs ? g.blobs[p.seat] : null;
    if (b) out[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 };
  });
  return out;
}
function facingView(room) {
  const g = room.game;
  const out = {};
  room.players.forEach((p) => {
    const f = g.facing ? g.facing[p.seat] : null;
    if (f) out[p.seat] = { x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100 };
  });
  return out;
}
function shellsView(room) {
  const g = room.game;
  return (g.shells || []).map((s) => ({ id: s.id, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, vx: s.vx, vy: s.vy }));
}

function gameView(room, role, seat, t) {
  const g = room.game;
  const v = {
    id: g.id, name: GAMES[g.id].name, round: g.round, totalRounds: g.totalRounds,
    phase: g.phase, endsAt: g.endsAt, finalRound: isFinalRound(g), points: g.points, lastRound: g.lastRound,
  };
  if (g.id === 'do-vui') {
    if (g.phase === 'question' || g.phase === 'reveal') {
      v.question = g.current.q; v.options = g.current.options;
      const answered = {};
      room.players.forEach((p) => {
        if (p.type === 'human') answered[p.seat] = !!g.inputs[p.seat];
        else { const plan = g.botPlan[p.seat]; answered[p.seat] = !!plan && plan.at <= t; }
      });
      v.answered = answered;
    }
    if (g.phase === 'reveal') v.reveal = g.reveal;
    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? inp.choice : null; v.myStreak = g.streaks[seat] || 0; }
  } else if (g.id === 'day-ra') {
    v.arenaR = g.arenaR;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
  } else if (g.id === 'ne-dan') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, air: (b.air || 0) > 0, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
    v.lasers = (g.lasers || []).map((L) => ({ id: L.id, axis: L.axis, pos: L.pos, kind: L.kind, state: L.state }));
  } else if (g.id === 'cuop-sao') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
    v.stars = (g.stars || []).map((s) => ({ id: s.id, x: s.x, y: s.y, gold: s.gold }));
    v.banked = g.banked;
    if (seat) v.mine = g.banked[seat] || 0;
  } else if (g.id === 'giu-vuong-mien') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
    v.hold = g.hold;
    v.crown = g.crown ? { holder: g.crown.holder, x: Math.round(g.crown.x * 100) / 100, y: Math.round(g.crown.y * 100) / 100 } : null;
    if (seat) { v.mine = g.hold[seat] || 0; v.myCrown = !!g.crown && g.crown.holder === seat; }
  } else if (g.id === 'chung-mot-than') {
    v.arenaR = ARENA_R0;
    v.owners = g.owners;
    v.shared = g.shared ? { x: Math.round(g.shared.x * 100) / 100, y: Math.round(g.shared.y * 100) / 100, vx: g.shared.vx || 0, vy: g.shared.vy || 0 } : null;
    v.star = g.star ? { x: g.star.x, y: g.star.y } : null;
    v.hearts = g.hearts;
    v.checks = g.checks;
    v.balls = (g.balls || []).map((b) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, vx: Math.round(b.vx * 100) / 100, vy: Math.round(b.vy * 100) / 100 }));
    if (seat) v.myDirs = ['u', 'r', 'd', 'l'].filter((d) => g.owners && g.owners[d] === seat);
  } else if (g.id === 'day-hop') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
    v.crate = g.crate ? { x: g.crate.x, y: g.crate.y, vx: g.crate.vx || 0, vy: g.crate.vy || 0 } : null;
    v.goal = g.goal;
    v.walls = g.walls;
    v.layout = g.layout;
    v.deliveries = g.deliveries;
    v.phaseDur = BOX_MS;
  } else if (g.id === 'cheo-thuyen') {
    const el = Math.max(0, t - g.rowStart);
    v.distance = Math.round(g.distance * 10) / 10;
    v.course = ROW_COURSE;
    v.perfect = ROW_PERFECT;
    v.beat = Math.min(ROW_BEATS, Math.floor(el / ROW_BEAT_MS) + 1);
    v.beats = ROW_BEATS;
    v.rowStart = g.rowStart;
    v.nextBeatAt = Math.min(g.endsAt, g.rowStart + (Math.floor(el / ROW_BEAT_MS) + 1) * ROW_BEAT_MS);
    v.hits = g.hits;
    v.splash = g.splash;
    if (seat) { v.mine = g.hits[seat] || 0; v.mySplash = g.splash[seat] || 0; }
  } else if (g.id === 'xe-tank') {
    v.arenaR = ARENA_R0;
    v.blobs = blobsView(room);
    v.facing = facingView(room);
    v.blocks = TANK_BLOCKS;
    v.shells = shellsView(room);
  } else if (g.id === 'dat-bom') {
    v.arenaR = ARENA_R0;
    v.blobs = blobsView(room);
    v.hard = g.hardCells;
    v.soft = g.softCells;
    v.bombs = (g.bombs || []).map((b) => ({ id: b.id, x: b.x, y: b.y, left: Math.max(0, (b.boomTick - g.tickCount) * TICK_MS) }));
    v.blasts = (g.blasts || []).filter((bl) => bl.until > t).map((bl) => ({ cells: bl.cells }));
  } else if (g.id === 'ma-soi') {
    // SECRECY (hard rule, asserted in tests by string search): before
    // the wolfEnd phase NO view — host or player — may carry another
    // player's role or any night choice. Public facts only: who is
    // alive, the death record (roles are public FROM DEATH ON), the
    // day's chat, vote-cast flags, and after the vote the tally + the
    // execution. A phone additionally sees ONLY its own private kit:
    // its role; a wolf sees the pack list + pack votes-in count; the
    // guard its own pick; the seer its own notes; the witch (once the
    // pack has locked) the victim + her own potion state. Death cuts
    // a phone back to its role card + public facts.
    const w = g.wolf;
    v.phaseDur = g.phase === 'night' ? WOLF_NIGHT_MS : g.phase === 'dawn' ? WOLF_DAWN_MS
      : g.phase === 'discuss' ? WOLF_DISCUSS_MS : g.phase === 'vote' ? WOLF_VOTE_MS
      : g.phase === 'execute' ? WOLF_EXEC_MS : WOLF_END_MS;
    v.night = g.round;
    v.aliveMap = {};
    room.players.forEach((p) => { v.aliveMap[p.seat] = w ? !!w.alive[p.seat] : true; });
    v.deadList = w ? w.deaths.map((d) => ({ seat: d.seat, role: d.role, cause: d.cause, night: d.night })) : [];
    v.dawnDeaths = w ? w.dawnDeaths.map((d) => ({ seat: d.seat, role: d.role })) : [];
    v.wolfCount = w ? room.players.filter((p) => w.roles[p.seat] === 'soi').length : 0;
    if (g.phase === 'discuss' || g.phase === 'vote' || g.phase === 'execute' || g.phase === 'wolfEnd') v.chatLog = g.chatLog || [];
    if (g.phase === 'vote') {
      v.voted = {};
      room.players.forEach((p) => { v.voted[p.seat] = g.votes[p.seat] != null; });
    }
    if (g.phase === 'execute' || g.phase === 'wolfEnd') { v.exec = w.exec; v.voteTally = w.voteTally || {}; }
    if (g.phase === 'wolfEnd') { v.winner = w.winner; v.roles = Object.assign({}, w.roles); }
    if (seat && w) {
      v.myRole = w.roles[seat];
      v.myAlive = !!w.alive[seat];
      if (w.alive[seat]) {
        if (w.roles[seat] === 'soi') {
          v.wolfTeam = room.players.filter((p) => w.roles[p.seat] === 'soi').map((p) => p.seat);
          v.myWolfVote = w.wolfVotes[seat] != null ? w.wolfVotes[seat] : null;
          v.wolfVotesIn = Object.keys(w.wolfVotes).length;
        } else if (w.roles[seat] === 'bao-ve') {
          v.myGuardPick = w.guardPick;
          v.myGuardLast = w.guardLast;
        } else if (w.roles[seat] === 'tien-tri') {
          v.mySeerPick = w.seerPick;
          const notes = w.seerNotes[seat] || {};
          v.mySeerNotes = Object.keys(notes).map((s) => ({ seat: +s, wolf: !!notes[s] }));
        } else if (w.roles[seat] === 'phu-thuy') {
          v.mySaveLeft = w.saveLeft;
          v.myPoisonLeft = w.poisonLeft;
          v.myWitchSave = w.witch.save;
          v.myWitchPoison = w.witch.poison;
          v.myWitchDone = w.witch.done;
          v.wolvesIn = wolfWolvesIn(room);
          v.myVictim = v.wolvesIn ? wolfVictim(room) : null;
        }
      }
    }
  } else if (g.id === 'ca-ngua') {
    const ng = g.ng;
    v.phaseDur = NGUA_TURN_MS;
    v.board = { loop: NGUA_LOOP, stretch: NGUA_STRETCH, stable: NGUA_STABLE, safe: Array.from(NGUA_SAFE) };
    v.horses = ng ? ng.horses : {};
    v.boards = ng ? ng.boards : {};
    v.turn = ng ? ng.turn : null;
    v.dice = ng ? ng.dice : null;
    v.winner = ng ? ng.winner : null;
    v.last = ng ? ng.last : null;
    v.log = ng ? ng.log : [];
    v.progress = {};
    if (ng) room.players.forEach((p) => { v.progress[p.seat] = nguaProgress(room, p.seat); });
    if (seat) {
      v.myTurn = !!ng && ng.turn === seat;
      v.myLegal = (ng && g.phase === 'pick' && ng.turn === seat)
        ? ng.legal.map((h) => ({ horse: h, hint: nguaHint(room, seat, h), from: ng.horses[seat][h] }))
        : [];
    }
  } else if (g.id === 'tien-len') {
    // SECRECY: hand contents exist ONLY in the seat's own branch
    // below. Every other field is public table talk: how many cards
    // each player holds, the face-up table play, who passed, who
    // finished, and the log.
    const tl = g.tl;
    v.phaseDur = TL_TURN_MS;
    v.counts = {};
    if (tl) room.players.forEach((p) => { v.counts[p.seat] = (tl.hands[p.seat] || []).length; });
    v.table = tl && tl.table ? { seat: tl.table.seat, cards: tl.table.cards.slice(), kind: tl.table.kind, len: tl.table.len, top: tl.table.top } : null;
    v.turn = tl ? tl.turn : null;
    v.leader = tl ? tl.leader : null;
    v.passed = tl ? Object.assign({}, tl.passed) : {};
    v.finished = tl ? tl.finished.slice() : [];
    v.log = tl ? tl.log.slice() : [];
    v.firstPlay = tl ? !!tl.firstPlay : false;
    v.turnEndsAt = tl ? tl.turnEndsAt : 0;
    v.instantWin = tl && tl.instantWin ? { seat: tl.instantWin.seat, kind: tl.instantWin.kind } : null;
    v.winner = tl ? tl.winner : null;
    if (seat) {
      v.myHand = tl && tl.hands[seat] ? tl.hands[seat].slice() : [];
      v.myTurn = !!tl && g.phase === 'cards' && tl.turn === seat;
      v.myPassed = !!tl && !!tl.passed[seat];
      v.mustInclude3 = !!tl && tl.firstPlay && tl.turn === seat && (tl.hands[seat] || []).indexOf(0) >= 0;
      const fi = tl ? tl.finished.indexOf(seat) : -1;
      v.myRank = fi >= 0 ? fi + 1 : null;
    }
  } else if (g.id === 'thu-thanh') {
    v.arenaR = ARENA_R0;
    v.blobs = blobsView(room);
    v.facing = facingView(room);
    v.shells = shellsView(room);
    v.slimes = (g.slimes || []).map((s) => ({ id: s.id, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, hp: s.hp, maxHp: s.maxHp, big: s.big, vx: Math.round((s.vx || 0) * 100) / 100, vy: Math.round((s.vy || 0) * 100) / 100 }));
    v.crystal = g.crystal ? { hp: g.crystal.hp, max: DEF_CRYSTAL_HP } : null;
    v.kills = g.kills;
  } else if (g.id === 'nguoi-que') {
    v.phaseDur = FIGHT_MS;
    v.platforms = FIGHT_PLATFORMS;
    v.blobs = {};
    if (g.blobs) room.players.forEach((p) => {
      const b = g.blobs[p.seat];
      if (!b) return;
      v.blobs[p.seat] = {
        x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive,
        dmg: g.dmg[p.seat] || 0, face: g.face[p.seat] || 1,
        vx: Math.round((b.vx || 0) * 100) / 100, vy: Math.round((b.vy || 0) * 100) / 100, ground: !!b.ground,
        atk: (g.atkT[p.seat] || 0) > 0, hvy: (g.hvyT[p.seat] || 0) > 0, hit: (g.hitT[p.seat] || 0) > 0,
        invuln: (g.invuln[p.seat] || 0) > 0, dash: (g.dashT[p.seat] || 0) > 0,
      };
    });
    if (seat != null) v.myDmg = g.dmg[seat] || 0;
  } else if (g.id === 'den-lua-nuoc') {
    v.phaseDur = TEMP_MS;
    v.solids = TEMPLE_LEVEL.solids;
    v.pools = TEMPLE_LEVEL.pools;
    v.gates = TEMPLE_LEVEL.gates;
    v.buttons = TEMPLE_LEVEL.buttons;
    v.doors = TEMPLE_LEVEL.doors;
    v.gateOpen = !!g.gateOpen;
    v.hearts = g.hearts;
    v.gemCount = g.gemCount || { lua: 0, nuoc: 0 };
    v.gemsTotal = TEMP_GEMS_TOTAL;
    v.gems = (g.gems || []).map((gm, i) => ({ id: i, x: gm.x, y: gm.y, el: gm.el, taken: !!gm.taken }));
    v.chars = {};
    if (g.chars) room.players.forEach((p) => {
      const c = g.chars[p.seat];
      if (c) v.chars[p.seat] = { x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, el: c.el, home: !!c.home, ground: !!c.ground, vx: Math.round((c.vx || 0) * 100) / 100, vy: Math.round((c.vy || 0) * 100) / 100 };
    });
    if (seat != null) {
      v.myEl = g.elOf[seat] || null;
      v.myHome = !!(g.chars && g.chars[seat] && g.chars[seat].home);
    }
  } else if (g.id === 'da-bong') {
    v.phaseDur = SOCCER_MS;
    v.solids = SOCCER_SOLIDS;
    v.teams = {};
    v.blobs = {};
    if (g.blobs) room.players.forEach((p) => {
      const b = g.blobs[p.seat];
      v.teams[p.seat] = soccerTeam(p.seat);
      if (b) v.blobs[p.seat] = {
        x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, alive: true,
        face: g.face[p.seat] || 1, ground: !!b.ground, dash: (g.dashT[p.seat] || 0) > 0,
        team: soccerTeam(p.seat), vx: Math.round((b.vx || 0) * 100) / 100, vy: Math.round((b.vy || 0) * 100) / 100,
      };
    });
    v.ball = g.ball ? { x: Math.round(g.ball.x * 100) / 100, y: Math.round(g.ball.y * 100) / 100, vx: Math.round(g.ball.vx * 100) / 100, vy: Math.round(g.ball.vy * 100) / 100 } : null;
    v.scoreboard = { do: (g.score && g.score.do) || 0, xanh: (g.score && g.score.xanh) || 0 };
    v.goalInfo = g.phase === 'goal' ? g.goalInfo : null;
    if (seat != null) v.myTeam = soccerTeam(seat);
  } else if (g.id === 'ech-op') {
    const L = FROG_LEVELS[(g.chamber || 1) - 1];
    v.phaseDur = FROG_PER_MS;
    v.chamber = g.chamber || 1;
    v.chambersTotal = FROG_LEVELS.length;
    v.solids = FROG_WALLS.concat(L.solids);
    v.spikes = L.spikes;
    v.door = L.door;
    v.hearts = g.hearts;
    v.fliesEaten = g.fliesEaten || 0;
    v.fliesTotal = FROG_LEVELS.length * 3;
    v.flies = (g.flies || []).map((fl, i) => ({ id: i, x: fl.x, y: fl.y, taken: !!fl.taken }));
    v.crates = (g.crates || []).map((c, i) => ({ id: i, x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, vx: Math.round((c.vx || 0) * 100) / 100, vy: Math.round((c.vy || 0) * 100) / 100 }));
    v.frogs = {};
    if (g.frogs) room.players.forEach((p) => {
      const f = g.frogs[p.seat];
      if (!f) return;
      v.frogs[p.seat] = {
        x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100, vx: Math.round((f.vx || 0) * 100) / 100, vy: Math.round((f.vy || 0) * 100) / 100,
        face: g.face[p.seat] || 1, ground: !!f.ground,
        state: f.by != null ? 'in' : f.belly != null ? 'carry' : 'free',
        bellySeat: f.belly != null ? f.belly : null,
        carrierSeat: f.by != null ? f.by : null,
        atDoor: f.by == null && platOverlap(f, L.door),
      };
    });
    if (seat != null && g.frogs && g.frogs[seat]) {
      const mf = g.frogs[seat];
      v.myState = mf.by != null ? 'in' : mf.belly != null ? 'carry' : 'free';
      v.myCarrierSeat = mf.by != null ? mf.by : null;
      v.myPassengerSeat = mf.belly != null ? mf.belly : null;
      v.myDoor = v.myState !== 'in' && platOverlap(mf, L.door);
    }
  } else if (g.id === 'can-goc') {
    v.phaseDur = CANNON_AIM_MS;
    v.heights = g.heights || [];
    v.wind = g.wind || 0;
    v.turn = g.turnSeat;
    v.cannons = {};
    if (g.cannons) room.players.forEach((p) => {
      const c = g.cannons[p.seat];
      if (c) v.cannons[p.seat] = {
        x: c.x, y: c.y, hp: Math.max(0, c.hp), alive: !!c.alive,
        face: c.face, angle: Math.round(c.angle * 10) / 10, power: Math.round(c.power),
      };
    });
    v.shell = g.shell ? {
      x: Math.round(g.shell.x * 100) / 100, y: Math.round(g.shell.y * 100) / 100,
      vx: Math.round(g.shell.vx * 100) / 100, vy: Math.round(g.shell.vy * 100) / 100,
      trail: g.shell.trail || [],
    } : null;
    v.boom = g.phase === 'boom' && g.boomFx ? { x: g.boomFx.x, y: g.boomFx.y, hits: g.boomFx.hits, at: g.boomFx.at } : null;
    if (seat != null) {
      v.myTurn = g.turnSeat === seat && g.phase === 'aim';
      const mc = g.cannons ? g.cannons[seat] : null;
      v.myCannon = mc ? { angle: Math.round(mc.angle * 10) / 10, power: Math.round(mc.power), face: mc.face, hp: Math.max(0, mc.hp), alive: !!mc.alive } : null;
    }
  }
  return v;
}
function buildView(room, role, seat) {
  const t = now();
  const st = standingsOf(room);
  const players = room.players.map((p) => ({
    seat: p.seat, name: p.name, type: p.type,
    difficulty: p.type === 'bot' ? p.difficulty : undefined,
    diffLabel: p.type === 'bot' ? DIFF_LABELS[p.difficulty] : undefined,
    color: SEAT_COLORS[p.seat - 1], score: p.score, liveScore: liveScore(room, p), mood: moodOf(room, p),
    local: p.local ? true : undefined,
    scheme: p.local ? p.scheme : undefined,
    hostSeat: p.hostSeat ? true : undefined,
  }));
  let gap = null;
  if (st.length >= 2) {
    gap = { topSeat: st[0], secondSeat: st[1], diff: liveScore(room, playerAt(room, st[0])) - liveScore(room, playerAt(room, st[1])) };
  }
  const view = {
    ok: true, serverNow: t, code: room.code, phase: room.phase, localPlay: room.localPlay ? true : undefined, players, standings: st, gap,
    bubble: room.bubble && room.bubble.until > t ? { seat: room.bubble.seat, text: room.bubble.text } : null,
    // The 25-game catalog is chooser furniture (lobby/choosing and the
    // results/podium/final screens that lead back to it). During play
    // it is half the state payload and nothing reads it — every
    // playing-phase read goes through v.game — so it ships empty and
    // returns the moment the phase leaves 'playing'.
    games: room.phase === 'playing' ? [] : Object.keys(GAMES).map((id) => ({ id, name: GAMES[id].name, desc: GAMES[id].desc, rounds: GAMES[id].rounds, cat: GAMES[id].cat, min: minSeats(id), max: maxSeats(id) })),
    playlist: playlistView(room, t),
    game: room.game ? gameView(room, role, seat, t) : null,
    lastGame: room.lastGame,
    you: seat ? { seat } : null,
  };
  if (role === 'host') {
    // Keyboard ("local") seats live on THIS screen, so the host view
    // carries their mapping (all phases) and — while a game runs — each
    // local seat's own player view, built by the very same gameView a
    // phone would get: their secret question/role/legal moves are theirs
    // to peek at on the big screen. SECRECY INVARIANT: localViews keys
    // are exactly the local seats; a PHONE player's private view is
    // never built for the host.
    view.locals = room.players.filter((p) => p.local).map((p) => ({ seat: p.seat, scheme: p.scheme }));
    if (room.game) {
      view.localViews = {};
      room.players.forEach((p) => {
        if (p.local) view.localViews[p.seat] = gameView(room, 'player', p.seat, t);
      });
      // Phone mode: the host may also SIT in the room (hostSeat — the
      // room was created on their phone and they play from the same
      // screen). Their own player view rides along under the same
      // gating as localViews, so the host page can render a "my seat"
      // section. SECRECY INVARIANT: myView is built for the hostSeat
      // ONLY — no other player's private view is ever attached here.
      const hs = room.players.find((p) => p.hostSeat);
      if (hs) view.myView = gameView(room, 'player', hs.seat, t);
    }
  }
  return view;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function startCheck(room) {
  if (humanCount(room) < 1) return 'Cần ít nhất 1 người chơi bằng điện thoại mới bắt đầu được.';
  if (room.players.length < 2) return 'Cần ít nhất 2 người chơi (thêm Máy hoặc rủ thêm bạn).';
  return null;
}
// Seat gate per game: every game declares [min, max] in GAMES (Kẻ Giả
// Mạo needs a real vote so 3 minimum; Ma Sói needs a village so 4;
// arenas cap at 8; Cờ Cá Ngựa is a 4-colour board…).
function minSeats(id) { return GAMES[id] ? GAMES[id].min : 2; }
function maxSeats(id) { return GAMES[id] ? GAMES[id].max : MAX_SEATS; }
// Could this game start right now in this room? Used by playlist
// queueing (filter) and by the intermission auto-start (skip).
function gamePlayable(room, id) {
  if (!GAMES[id]) return false;
  if (room.players.length < minSeats(id) || room.players.length > maxSeats(id)) return false;
  return !startCheck(room);
}
function clearPlaylist(room) { room.playlist = null; room.playlistNextAt = null; }
// Playlist progress for the room view (both roles read the same shape;
// additive only — older clients just ignore it). pos is the 1-based
// position of the game playing now, or of the one about to auto-start
// during the intermission; nextName skips entries that are no longer
// playable so the TV never promises a game that will be skipped.
function playlistView(room, t) {
  const pl = room.playlist;
  if (!pl || !pl.queue || !pl.queue.length) return { active: false };
  let nextIdx = -1;
  for (let i = pl.idx + 1; i < pl.queue.length; i++) {
    if (gamePlayable(room, pl.queue[i])) { nextIdx = i; break; }
  }
  const intermission = !!room.playlistNextAt;
  return {
    active: true,
    pos: Math.min((intermission && nextIdx >= 0 ? nextIdx : pl.idx) + 1, pl.queue.length),
    total: pl.queue.length,
    nextName: nextIdx >= 0 ? GAMES[pl.queue[nextIdx]].name : null,
    nextInSec: intermission ? Math.max(0, Math.ceil((room.playlistNextAt - t) / 1000)) : null,
  };
}
// Host-relayed input for a seat that lives on the host screen: when
// the host page sends an action with body.forSeat set, it lands on that
// seat via playerAction. Relayable seats are the keyboard ("local")
// seats and the host's OWN seat (hostSeat, phone mode) — never a bot
// (bots take no input) and NEVER a phone player's seat (their inputs
// are theirs alone; the host token must not become a skeleton key for
// every seat in the room). Host actions without forSeat go to
// hostAction exactly as before. The rejection text mentions keyboards
// because that is the original relay; it only ever fires for
// phone/bot/empty targets, never for the host's own seat.
function hostDispatch(room, body) {
  if (Number.isInteger(body.forSeat)) {
    const target = room.players.find((p) => p.seat === body.forSeat && (p.local || p.hostSeat));
    if (!target) return 'Ghế này không phải người chơi bàn phím.';
    return playerAction(room, target, body);
  }
  return hostAction(room, body);
}
function hostAction(room, body) {
  const a = body.action;
  if (a === 'localPlay') {
    // LOCAL PLAY marker: the host page is running the current game
    // in-page (rooms with no remote players). The server room stays
    // the membership shell; the flag only informs other surfaces.
    if (body.on) room.localPlay = true; else delete room.localPlay;
    return null;
  }
  if (a === 'syncLocalResults') {
    // A locally-played game finished on the host page: fold its
    // per-seat score deltas into the room totals and mirror the
    // results phase, so every surface agrees on the standings.
    if (room.game) return 'Đang có ván trên máy chủ.';
    // Bots the local game added (quickStart fill) join the server
    // roster first, so their deltas land and a rematch sees the
    // same headcount the local game played with.
    if (Array.isArray(body.bots)) {
      for (const b of body.bots) {
        const seat = b && b.seat;
        if (!Number.isInteger(seat) || seat < 2 || seat > MAX_SEATS || playerAt(room, seat)) continue;
        room.players.push({ seat, type: 'bot', name: 'Máy', difficulty: DIFFS.includes(b.difficulty) ? b.difficulty : 'vua', score: 0 });
      }
      room.players.sort((x, y) => x.seat - y.seat);
    }
    const deltas = body.deltas && typeof body.deltas === 'object' ? body.deltas : {};
    for (const seatKey of Object.keys(deltas)) {
      const seat = parseInt(seatKey, 10);
      const d = Math.round(Number(deltas[seatKey]) || 0);
      if (!Number.isInteger(seat) || !d) continue;
      const p = playerAt(room, seat);
      if (p) p.score += Math.max(-100000, Math.min(100000, d));
    }
    if (body.lastGame && typeof body.lastGame === 'object' && typeof body.lastGame.id === 'string') room.lastGame = body.lastGame;
    room.phase = 'results';
    room.playlistNextAt = null;
    delete room.localPlay;
    return null;
  }
  if (a === 'addBot') {
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ thêm Máy được khi đang ở sảnh chờ.';
    const seat = body.seat;
    if (!Number.isInteger(seat) || seat < 2 || seat > MAX_SEATS) return 'Chỉ thêm Máy vào các ô P2 đến P' + MAX_SEATS + '.';
    if (playerAt(room, seat)) return 'Ô này đã có người.';
    room.players.push({ seat, type: 'bot', name: 'Máy', difficulty: 'vua', score: 0 });
    room.players.sort((x, y) => x.seat - y.seat);
    return null;
  }
  if (a === 'addLocal') {
    // A keyboard seat at the host screen: a human with NO token (so no
    // phone can ever claim it — see the !local guards on every token
    // lookup) and a keyboard scheme (0..3, lowest unused). All input
    // paths key on type 'human', so locals play every game untouched;
    // the host page relays their actions with body.forSeat (hostDispatch).
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ thêm người chơi bàn phím được khi đang ở sảnh chờ.';
    const seat = body.seat;
    if (!Number.isInteger(seat) || seat < 2 || seat > MAX_SEATS) return 'Chỉ thêm người chơi bàn phím vào các ô P2 đến P' + MAX_SEATS + '.';
    if (playerAt(room, seat)) return 'Ô này đã có người.';
    const locals = room.players.filter((p) => p.local);
    if (locals.length >= 4) return 'Tối đa 4 người chơi bằng bàn phím trong một phòng.';
    let scheme = 0;
    while (locals.some((p) => p.scheme === scheme)) scheme += 1;
    room.players.push({ seat, type: 'human', local: true, scheme, name: 'Phím ' + (scheme + 1), score: 0 });
    room.players.sort((x, y) => x.seat - y.seat);
    return null;
  }
  if (a === 'hostJoin') {
    // Phone mode: the host sits down in their own room. The seat is a
    // human with NO token — exactly the local-seat shape discipline, so
    // no phone can ever claim it (every token lookup rejects tokenless
    // seats via the !local / !hostSeat guards) — and the host page
    // drives it through the same forSeat relay the keyboard seats use
    // (hostDispatch). At most ONE host seat per room: it is the room
    // owner's own chair, not a batch of seats.
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ nhận ghế chủ phòng được khi đang ở sảnh chờ.';
    if (room.players.some((p) => p.hostSeat)) return 'Chủ phòng đã có ghế rồi.';
    if (room.players.length >= MAX_SEATS) return 'Phòng đã đủ ' + MAX_SEATS + ' người.';
    let name = typeof body.name === 'string' ? body.name.trim().slice(0, 14) : '';
    if (!name) name = 'Chủ phòng';
    let seat = 1;
    while (playerAt(room, seat)) seat += 1;
    room.players.push({ seat, type: 'human', hostSeat: true, name, score: 0 });
    room.players.sort((x, y) => x.seat - y.seat);
    return null;
  }
  if (a === 'hostLeave') {
    // The host gives their own seat back (lobby only, like every seat
    // change). Deliberately a separate action from removeBot: that
    // wire is for bots/keyboard seats and structurally refuses human
    // phone seats, and the host seat must only ever be removable by
    // this path — it names no seat, so it can only ever free the one
    // hostSeat in the room.
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ rời ghế được khi đang ở sảnh chờ.';
    const hs = room.players.find((p) => p.hostSeat);
    if (!hs) return 'Chủ phòng chưa có ghế.';
    room.players = room.players.filter((x) => x.seat !== hs.seat);
    return null;
  }
  if (a === 'removeBot') {
    // Same phase gate as addBot: removing a bot mid-game (or at results)
    // would strand its seat inside the running game's snapshots and break
    // the results/podium views, so seat changes are lobby-only, exactly
    // like the buttons the UI shows. Also removes LOCAL (keyboard) seats:
    // same lobby-only seat management, same button in the UI.
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ xoá Máy được khi đang ở sảnh chờ.';
    const p = playerAt(room, body.seat);
    if (!p || (p.type !== 'bot' && !p.local)) return 'Ô này không phải Máy.';
    room.players = room.players.filter((x) => x.seat !== body.seat);
    return null;
  }
  if (a === 'cycleBot') {
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ đổi mức Máy được khi đang ở sảnh chờ.';
    const p = playerAt(room, body.seat);
    if (!p || p.type !== 'bot') return 'Ô này không phải Máy.';
    p.difficulty = DIFFS[(DIFFS.indexOf(p.difficulty) + 1) % DIFFS.length];
    return null;
  }
  if (a === 'cycleScheme') {
    // A local seat's keyboard layout rotates to the next scheme no
    // other local seat uses, so two people at the big screen never
    // share a key set. The seat's NAME is creation-order naming and
    // deliberately does NOT follow the scheme (Phím 2 keeps its name
    // even on scheme 0).
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ đổi bộ phím được khi đang ở sảnh chờ.';
    const p = playerAt(room, body.seat);
    if (!p || !p.local) return 'Ghế này không phải người chơi bàn phím.';
    const used = new Set(room.players.filter((x) => x.local && x.seat !== p.seat).map((x) => x.scheme || 0));
    for (let k = 1; k <= 3; k++) {
      const cand = ((p.scheme || 0) + k) % 4;
      if (!used.has(cand)) { p.scheme = cand; return null; }
    }
    return 'Cả 3 bộ phím còn lại đều đang có người dùng.';
  }
  if (a === 'startGame') {
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Đang chơi, không chọn game khác được.';
    if (!GAMES[body.game]) return 'Không có game này.';
    const err = startCheck(room);
    if (err) return err;
    const nSeats = room.players.length;
    if (nSeats < minSeats(body.game)) return GAMES[body.game].name + ' cần ít nhất ' + minSeats(body.game) + ' người chơi mới chơi được (thêm Máy hoặc rủ thêm bạn).';
    if (nSeats > maxSeats(body.game)) return GAMES[body.game].name + ' chỉ chơi được tối đa ' + maxSeats(body.game) + ' người chơi — phòng đang có ' + nSeats + ' người, xoá bớt Máy hoặc chọn game khác nhé.';
    clearPlaylist(room); // manual navigation cancels any playlist
    createGame(room, body.game);
    return null;
  }
  if (a === 'quickStart') {
    // One-tap start from the chooser: the host tapped a game the room
    // is short of players for, so fill empty seats with bots (Vừa)
    // up to the game's minimum and start immediately — nobody should
    // have to walk the seat grid adding bots by hand first.
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Đang chơi, không chọn game khác được.';
    if (!GAMES[body.game]) return 'Không có game này.';
    // Only startCheck's human half applies here — its "at least 2
    // players" half is exactly what the fill below provides.
    if (humanCount(room) < 1) return 'Cần ít nhất 1 người chơi bằng điện thoại mới bắt đầu được.';
    if (room.players.length > maxSeats(body.game)) return GAMES[body.game].name + ' chỉ chơi được tối đa ' + maxSeats(body.game) + ' người chơi — phòng đang có ' + room.players.length + ' người, xoá bớt Máy hoặc chọn game khác nhé.';
    for (let s = 2; s <= MAX_SEATS && room.players.length < minSeats(body.game); s++) {
      if (!playerAt(room, s)) room.players.push({ seat: s, type: 'bot', name: 'Máy', difficulty: 'vua', score: 0 });
    }
    room.players.sort((x, y) => x.seat - y.seat);
    if (room.players.length < minSeats(body.game)) return GAMES[body.game].name + ' cần ít nhất ' + minSeats(body.game) + ' người chơi mới chơi được (thêm Máy hoặc rủ thêm bạn).';
    clearPlaylist(room);
    createGame(room, body.game);
    return null;
  }
  if (a === 'playlistStart') {
    if (room.phase !== 'choosing' && room.phase !== 'lobby' && room.phase !== 'results' && room.phase !== 'podium') return 'Đang chơi, không bắt đầu liên hoàn được.';
    const err = startCheck(room);
    if (err) return err;
    const ids = Array.isArray(body.games) ? body.games : [];
    const queue = [];
    ids.forEach((id) => {
      if (typeof id === 'string' && queue.indexOf(id) < 0 && gamePlayable(room, id)) queue.push(id);
    });
    if (queue.length < 2) return 'Liên hoàn cần ít nhất 2 game đủ người chơi (game thiếu người đã bị lọc ra).';
    room.playlist = { queue, idx: 0 };
    room.playlistNextAt = null;
    createGame(room, queue[0]);
    return null;
  }
  if (a === 'playlistStop') {
    if (!room.playlist && !room.playlistNextAt) return 'Chưa bật chế độ liên hoàn.';
    clearPlaylist(room);
    return null;
  }
  if (a === 'quitToChoosing') {
    // Host-only mid-game escape: abandon the running game and land the
    // whole room on the chooser. Points are banked ONLY in endGame, so
    // dropping room.game here leaks nothing into cumulative scores —
    // the abandoned game simply never happened, score-wise.
    if (room.phase !== 'playing' || !room.game) return 'Chưa vào game.';
    room.game = null;
    clearPlaylist(room);
    room.phase = 'choosing';
    return null;
  }
  if (a === 'continue') {
    if (room.phase !== 'results') return 'Chưa có kết quả để xem tiếp.';
    room.phase = 'podium';
    return null;
  }
  if (a === 'replay') {
    if ((room.phase !== 'results' && room.phase !== 'podium') || !room.lastGame) return 'Chưa có game nào để chơi lại.';
    // Seats may have changed since the game was played (spectators
    // join at results): the rematch must still fit the game's range.
    if (room.players.length < minSeats(room.lastGame.id) || room.players.length > maxSeats(room.lastGame.id)) {
      return 'Số người trong phòng đã thay đổi — ' + GAMES[room.lastGame.id].name + ' cần ' + minSeats(room.lastGame.id) + '–' + maxSeats(room.lastGame.id) + ' người chơi.';
    }
    clearPlaylist(room); // manual navigation cancels any playlist
    createGame(room, room.lastGame.id);
    return null;
  }
  if (a === 'toChoosing') {
    // One tap from results OR the podium: the room, its players and
    // the cumulative scores all stay exactly as they are.
    if (room.phase !== 'podium' && room.phase !== 'results') return 'Chưa chọn game khác được.';
    clearPlaylist(room); // manual navigation cancels any playlist
    room.phase = 'choosing';
    return null;
  }
  if (a === 'finish') {
    if (room.phase !== 'podium' && room.phase !== 'choosing') return 'Chưa kết thúc được.';
    clearPlaylist(room); // manual navigation cancels any playlist
    room.phase = 'final';
    return null;
  }
  if (a === 'playAgain') {
    if (room.phase !== 'final') return 'Chưa ở màn kết thúc.';
    room.players.forEach((p) => { p.score = 0; });
    room.resultsLog = []; room.lastGame = null; room.prevRanks = null;
    clearPlaylist(room);
    room.phase = 'lobby';
    return null;
  }
  return 'Hành động không hợp lệ.';
}
// --- Onset nudge (smoothness wave) ---------------------------------------
// A pad's first effect used to wait for the next 125ms tick boundary:
// the pipeline advances the sim BEFORE dispatch, so a direction change
// landing mid-tick moved nothing until (nextTickAt - t) had elapsed.
// For the games whose movement is a clean positional step, the pad
// handler now applies that fraction of ONE step immediately — dir *
// step * frac, frac = elapsed fraction of the current tick — under the
// stepper's own bounds. The nudge runs NO game logic (no collisions,
// deaths, ring-outs, pickups, painting, scoring, bots, facing) and the
// next regular tick proceeds from the nudged position: a one-off head
// start of < 1 step that makes input feel instant without changing any
// rule. Base step only: dash multipliers/cooldowns are tick business.
const NUDGE_PHASES = {
  'day-ra': 'arena', 'ne-dan': 'dodge', 'cuop-sao': 'steal',
  'giu-vuong-mien': 'crown', 'xe-tank': 'tank',
  'thu-thanh': 'defend', 'chung-mot-than': 'shared',
};
function padNudge(room, seat, prev, np, t) {
  const g = room.game;
  const phase = NUDGE_PHASES[g.id];
  if (!phase || g.phase !== phase) return; // live play phase only (never 'countdown')
  if (g.nextTickAt == null || g.nextTickAt <= t) return; // a due tick fires in this request's trailing advance, with this pad
  const frac = Math.min(1, Math.max(0, 1 - (g.nextTickAt - t) / TICK_MS));
  if (frac <= 0) return;
  const dirChanged = !!prev.u !== !!np.u || !!prev.d !== !!np.d || !!prev.l !== !!np.l || !!prev.r !== !!np.r;
  if (!dirChanged) return;
  const dx = (np.r ? 1 : 0) - (np.l ? 1 : 0);
  const dy = (np.d ? 1 : 0) - (np.u ? 1 : 0);
  if (g.id === 'chung-mot-than') {
    // The shared blob: only the axes the SENDER owns move, gated
    // exactly as simulateSharedTick gates them; other players' inputs
    // are not re-applied here.
    let mx = 0, my = 0;
    if (dx > 0 && g.owners.r === seat) mx = 1;
    if (dx < 0 && g.owners.l === seat) mx = -1;
    if (dy > 0 && g.owners.d === seat) my = 1;
    if (dy < 0 && g.owners.u === seat) my = -1;
    if (!mx && !my) return;
    const b = g.shared;
    if (!b) return;
    b.x += mx * STEP_X * frac; b.y += my * STEP_Y * frac;
    clampRect(b);
    b.x = Math.round(b.x * 100) / 100; b.y = Math.round(b.y * 100) / 100;
    return;
  }
  if (!dx && !dy) return;
  const b = g.blobs && g.blobs[seat];
  if (!b || !b.alive) return;
  if (g.id === 'xe-tank') {
    // The stepper's own wall slide (cover blocks + rect clamp);
    // facing deliberately untouched — ticks own it.
    slideCircle(b, dx * STEP_X * frac, dy * STEP_Y * frac, 0.8, TANK_BLOCKS, CLAMP_X, CLAMP_Y);
    return;
  }
  b.x += dx * STEP_X * frac; b.y += dy * STEP_Y * frac;
  // day-ra mirrors its stepper exactly: no positional clamp — the
  // ring-out verdict belongs to the next regular tick.
}
function playerAction(room, player, body) {
  const g = room.game;
  if (room.phase !== 'playing' || !g) return 'Chưa vào game.';
  const seat = player.seat; const t = now(); const a = body.action;
  if (a === 'pad') {
    if (g.id !== 'day-ra' && g.id !== 'ne-dan'
      && g.id !== 'cuop-sao' && g.id !== 'giu-vuong-mien'
      && g.id !== 'chung-mot-than' && g.id !== 'day-hop'
      && g.id !== 'xe-tank' && g.id !== 'dat-bom' && g.id !== 'thu-thanh'
      && g.id !== 'nguoi-que' && g.id !== 'den-lua-nuoc'
      && g.id !== 'da-bong' && g.id !== 'ech-op' && g.id !== 'can-goc') return null;
    const pd = body.pad || {};
    const np = { u: !!pd.u, d: !!pd.d, l: !!pd.l, r: !!pd.r, a: !!pd.a, b: !!pd.b, x: !!pd.x, y: !!pd.y };
    const prev = g.pad[seat] || {};
    // Kéo Co: a press is the rising edge of B, counted the moment it lands.
    // Chia Hay Cướp on the gamepad: A (the X position) = Chia, B = Cướp,
    // rising edge only, and only for the pair during the choose phase.
    g.pad[seat] = np;
    padNudge(room, seat, prev, np, t);
    return null;
  }
  if (a === 'setAim') {
    // Đại Bác Căn Góc: exact aim for slider-style clients (and tests).
    // Only the cannon whose turn it is, only during the aim phase;
    // the pad sweep writes the very same fields.
    if (g.id !== 'can-goc' || g.phase !== 'aim' || g.turnSeat !== seat) return 'Chưa tới lượt bạn căn góc.';
    const c = g.cannons[seat];
    if (!c || !c.alive) return 'Pháo của bạn đã bị phá huỷ.';
    if (typeof body.angle === 'number' && isFinite(body.angle)) c.angle = Math.max(5, Math.min(85, body.angle));
    if (typeof body.power === 'number' && isFinite(body.power)) c.power = Math.max(0, Math.min(100, body.power));
    if (body.face === 1 || body.face === -1) c.face = body.face;
    return null;
  }
  if (a === 'chat') {
    if (g.id === 'ma-soi') {
      // Day discussion is public — but the dead only watch: a ghost
      // who could still talk could leak night knowledge.
      if (g.phase !== 'discuss') return 'Chỉ trò chuyện được trong lúc bàn luận ban ngày.';
      if (!g.wolf.alive[seat]) return 'Bạn đã chết — chỉ theo dõi thôi nhé.';
      const text = String(body.text || '').trim().slice(0, 60);
      if (!text) return 'Hãy nhập lời nhắn.';
      g.chatLog.push({ seat, text, at: t });
      if (g.chatLog.length > 40) g.chatLog = g.chatLog.slice(-40);
      return null;
    }
    return 'Game này không có trò chuyện.';
  }
  if (a === 'tap') {
    if (g.id === 'cheo-thuyen') {
      if (g.phase !== 'row') return null;
      // A press is an in-window stroke when its server receipt time is
      // within +-ROW_WINDOW_MS of the nearest beat; one stroke per
      // player per beat. Anything else is a splash (miss, no penalty).
      const k = Math.round((t - g.rowStart) / ROW_BEAT_MS);
      const key = seat + ':' + k;
      if (k >= 0 && k < ROW_BEATS && Math.abs(t - (g.rowStart + k * ROW_BEAT_MS)) <= ROW_WINDOW_MS && !g.stroked[key]) {
        g.stroked[key] = 1;
        addRowDistance(room, seat);
      } else {
        g.splash[seat] = (g.splash[seat] || 0) + 1;
      }
      return null;
    }
    return 'Game này không dùng nút bấm.';
  }
  if (a === 'answer') {
    if (g.id !== 'do-vui' || g.phase !== 'question') return 'Chưa đến lúc trả lời.';
    if (g.inputs[seat]) return null;
    const c = body.choice;
    if (!Number.isInteger(c) || c < 0 || c > 3) return 'Đáp án không hợp lệ.';
    g.inputs[seat] = { choice: c, at: t };
    return null;
  }
  if (a === 'vote') {
    if (g.id === 'ma-soi') {
      if (g.phase !== 'vote') return 'Chưa đến lúc bỏ phiếu.';
      if (!g.wolf.alive[seat]) return 'Bạn đã chết — chỉ theo dõi thôi nhé.';
      if (g.votes[seat] != null) return null;
      const target = body.seat;
      if (!Number.isInteger(target) || target === seat || !playerAt(room, target) || !g.wolf.alive[target]) return 'Không bỏ phiếu cho người này được.';
      g.votes[seat] = target;
      return null;
    }
    return 'Chưa đến lúc bỏ phiếu.';
  }
  if (a === 'wolfVote' || a === 'wolfGuard' || a === 'wolfSeer' || a === 'wolfWitch') {
    if (g.id !== 'ma-soi' || g.phase !== 'night') return 'Chưa đến lúc hành động ban đêm.';
    const w = g.wolf;
    if (!w.alive[seat]) return 'Bạn đã chết — chỉ theo dõi thôi nhé.';
    const role = w.roles[seat];
    const target = body.seat;
    const targetOk = Number.isInteger(target) && !!playerAt(room, target) && !!w.alive[target];
    if (a === 'wolfVote') {
      if (role !== 'soi') return 'Chỉ có sói mới chọn con mồi.';
      if (w.wolfVotes[seat] != null) return null;
      if (!targetOk || target === seat) return 'Không chọn được người này.';
      w.wolfVotes[seat] = target;
      return null;
    }
    if (a === 'wolfGuard') {
      if (role !== 'bao-ve') return 'Chỉ có Bảo Vệ mới chọn người để bảo vệ.';
      if (w.guardPick != null) return null;
      if (!targetOk) return 'Không chọn được người này.';
      if (target === w.guardLast) return 'Đêm qua bạn đã bảo vệ người này rồi — luật không cho bảo vệ cùng một người hai đêm liền.';
      w.guardPick = target;
      return null;
    }
    if (a === 'wolfSeer') {
      if (role !== 'tien-tri') return 'Chỉ có Tiên Tri mới soi được người khác.';
      if (w.seerPick != null) return null;
      if (!targetOk || target === seat) return 'Không soi được người này.';
      wolfSeerApply(room, seat, target);
      return null;
    }
    // wolfWitch: incremental — set the save flag and/or a poison
    // target first, then confirm with done:true (the phone renders
    // her current choices back from the view between steps).
    if (role !== 'phu-thuy') return 'Chỉ có Phù Thủy mới dùng thuốc được.';
    if (w.witch.done) return null;
    if (body.done === true) { w.witch.done = true; return null; }
    if (typeof body.save === 'boolean') {
      if (body.save) {
        if (w.saveLeft <= 0) return 'Thuốc cứu đã dùng hết rồi.';
        if (!wolfWolvesIn(room)) return 'Sói chưa chọn xong con mồi — đợi một chút.';
        if (wolfVictim(room) == null) return 'Đêm nay sói chưa chọn được ai.';
      }
      w.witch.save = body.save;
      return null;
    }
    if (body.poison === null) { w.witch.poison = null; return null; }
    if (body.poison !== undefined) {
      if (w.poisonLeft <= 0) return 'Thuốc độc đã dùng hết rồi.';
      const pt = body.poison;
      if (!Number.isInteger(pt) || !playerAt(room, pt) || !w.alive[pt] || pt === seat) return 'Không đầu độc được người này.';
      w.witch.poison = pt;
      return null;
    }
    return null;
  }
  if (a === 'roll') {
    if (g.id !== 'ca-ngua' || g.phase !== 'roll') return 'Chưa đến lúc thảy xúc xắc.';
    if (g.ng.turn !== seat) return 'Chưa tới lượt của bạn.';
    nguaRoll(room, t);
    return null;
  }
  if (a === 'move') {
    if (g.id !== 'ca-ngua' || g.phase !== 'pick') return 'Chưa đến lúc đi ngựa.';
    if (g.ng.turn !== seat) return 'Chưa tới lượt của bạn.';
    const h = body.horse;
    if (!Number.isInteger(h) || g.ng.legal.indexOf(h) < 0) return 'Ngựa này đi không được.';
    nguaMove(room, seat, h, t);
    return null;
  }
  if (a === 'play') {
    if (g.id !== 'tien-len' || g.phase !== 'cards') return 'Chưa tới lượt bạn.';
    const tl = g.tl;
    if (tl.finished.indexOf(seat) >= 0) return 'Chưa tới lượt bạn.';
    if (tl.passed[seat]) return 'Bạn đã bỏ lượt vòng này rồi.';
    if (tl.turn !== seat) return 'Chưa tới lượt bạn.';
    const cards = body.cards;
    if (!Array.isArray(cards) || !cards.length) return 'Bài không hợp lệ.';
    const hand = tl.hands[seat] || [];
    const seenC = new Set();
    for (const c of cards) {
      if (!Number.isInteger(c) || c < 0 || c > 51 || seenC.has(c) || hand.indexOf(c) < 0) return 'Bài không hợp lệ.';
      seenC.add(c);
    }
    if (tl.firstPlay && cards.indexOf(0) < 0) return 'Lượt đầu phải có lá 3♠.';
    const combo = tlComboOf(cards);
    if (!combo) return 'Bộ bài này không hợp lệ.';
    if (tl.table && !tlBeats(combo, tl.table)) return 'Chưa chặn được. Đánh bộ mạnh hơn hoặc bỏ lượt.';
    tlPlayCards(room, seat, cards, t);
    return null;
  }
  if (a === 'pass') {
    if (g.id !== 'tien-len' || g.phase !== 'cards') return 'Chưa tới lượt bạn.';
    const tl = g.tl;
    if (tl.finished.indexOf(seat) >= 0) return 'Chưa tới lượt bạn.';
    if (tl.passed[seat]) return 'Bạn đã bỏ lượt vòng này rồi.';
    if (tl.turn !== seat) return 'Chưa tới lượt bạn.';
    if (!tl.table) return 'Bạn đang cầm cái, phải đánh bài.';
    tlPassTurn(room, seat, t);
    return null;
  }
  return 'Hành động không hợp lệ.';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
