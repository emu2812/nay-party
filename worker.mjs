// ============================================================================
// Nảy Party — Cloudflare Worker (single self-contained file, no dependencies)
// - GET  /                        → the full game page (HTML embedded below)
// - POST /api/rooms               → create a room (host screen)
// - POST /api/rooms/:code/join    → a phone joins by code + name
// - GET  /api/rooms/:code/state   → polled state view (host or player, filtered)
// - POST /api/rooms/:code/action  → host / player actions
// Rooms live in a Durable Object (binding ROOMS_DO, class RoomStore below):
// one object per room code, so room writes use DO storage instead of KV
// (the KV free tier's daily write limit was exhausted by per-poll saves).
// The KV namespace bound as ROOMS remains only as a fallback for
// environments where ROOMS_DO is not bound. The server is authoritative:
// all timing uses server timestamps and game phases advance lazily whenever
// a request touches the room (clients poll ~1s, faster during Nhanh Tay).
// All game content (name, mascots, question banks) is self-authored.
// ============================================================================

// ---------------------------------------------------------------------------
// Question banks (self-authored)
// ---------------------------------------------------------------------------
export const QUIZ_BANK = [
  { q: 'Thủ đô của nước Pháp là thành phố nào?', options: ['Paris', 'Luân Đôn', 'Rôm', 'Berlin'], answer: 0 },
  { q: 'Ký hiệu hóa học "O" là nguyên tố nào?', options: ['Vàng', 'Oxy', 'Sắt', 'Đồng'], answer: 1 },
  { q: 'Loài động vật nào lớn nhất trên Trái Đất?', options: ['Voi châu Phi', 'Cá mập trắng', 'Cá voi xanh', 'Hươu cao cổ'], answer: 2 },
  { q: 'Bản Tuyên ngôn Độc lập của Việt Nam được đọc vào năm nào?', options: ['1930', '1954', '1975', '1945'], answer: 3 },
  { q: 'Tác giả của Truyện Kiều là ai?', options: ['Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Trãi', 'Cao Bá Quát'], answer: 0 },
  { q: 'Hành tinh nào được gọi là Hành tinh Đỏ?', options: ['Sao Kim', 'Sao Hỏa', 'Sao Mộc', 'Sao Thổ'], answer: 1 },
  { q: 'Công thức hóa học của nước là gì?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
  { q: 'Đội tuyển nào vô địch World Cup bóng đá 2022?', options: ['Pháp', 'Brazil', 'Đức', 'Argentina'], answer: 3 },
  { q: 'Sông nào dài nhất thế giới?', options: ['Sông Amazon', 'Sông Nile', 'Sông Dương Tử', 'Sông Mississippi'], answer: 1 },
  { q: '7 × 8 bằng bao nhiêu?', options: ['54', '56', '63', '48'], answer: 1 },
  { q: 'Thủ đô của Nhật Bản là thành phố nào?', options: ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'], answer: 2 },
  { q: 'Ai là họa sĩ vẽ bức Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Monet', 'Leonardo da Vinci'], answer: 3 },
  { q: 'Cây xanh hấp thụ loại khí nào để quang hợp?', options: ['Oxy', 'Cacbonic (CO2)', 'Nitơ', 'Hydro'], answer: 1 },
  { q: 'Đơn vị tiền tệ của Nhật Bản là gì?', options: ['Won', 'Yên', 'Nhân dân tệ', 'Ringgit'], answer: 1 },
  { q: 'Đại dương nào lớn nhất trên Trái Đất?', options: ['Đại Tây Dương', 'Ấn Độ Dương', 'Thái Bình Dương', 'Bắc Băng Dương'], answer: 2 },
  { q: 'Vị vua cuối cùng của triều Nguyễn là ai?', options: ['Khải Định', 'Bảo Đại', 'Duy Tân', 'Hàm Nghi'], answer: 1 },
  { q: 'Tốc độ âm thanh trong không khí khoảng bao nhiêu m/s?', options: ['150 m/s', '340 m/s', '1000 m/s', '3000 m/s'], answer: 1 },
  { q: 'Chuột túi (kangaroo) sống tự nhiên chủ yếu ở đâu?', options: ['Brazil', 'Canada', 'Australia (Úc)', 'Ấn Độ'], answer: 2 },
  { q: 'Kim loại nào nhẹ nhất trong các kim loại sau?', options: ['Nhôm', 'Sắt', 'Liti', 'Đồng'], answer: 2 },
  { q: 'Số nguyên tố nhỏ nhất là số nào?', options: ['0', '1', '2', '3'], answer: 2 },
  { q: 'Hòn đảo nào lớn nhất thế giới?', options: ['Borneo', 'Greenland', 'Madagascar', 'Sumatra'], answer: 1 },
  { q: 'Người đầu tiên đặt chân lên Mặt Trăng là ai?', options: ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin', 'Michael Collins'], answer: 1 },
  { q: 'Trộn màu xanh dương với màu vàng được màu gì?', options: ['Tím', 'Cam', 'Xanh lá', 'Nâu'], answer: 2 },
  { q: 'Thủ đô của Australia (Úc) là thành phố nào?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
  { q: 'Cá heo thuộc nhóm động vật nào?', options: ['Cá', 'Động vật có vú', 'Lưỡng cư', 'Bò sát'], answer: 1 },
  { q: 'Thế vận hội Olympic tổ chức mấy năm một lần?', options: ['2 năm', '3 năm', '4 năm', '5 năm'], answer: 2 },
  { q: 'Chữ cái đầu tiên trong bảng chữ cái Hy Lạp là gì?', options: ['Beta', 'Omega', 'Sigma', 'Alpha'], answer: 3 },
  { q: 'Nước chiếm khoảng bao nhiêu phần trăm cơ thể người trưởng thành?', options: ['30%', '45%', '60%', '90%'], answer: 2 },
  { q: 'Vĩ tuyến 0 độ được gọi là gì?', options: ['Chí tuyến', 'Xích đạo', 'Kinh tuyến gốc', 'Vòng cực'], answer: 1 },
  { q: 'Âm thanh không truyền được qua môi trường nào?', options: ['Nước', 'Không khí', 'Chân không', 'Kim loại'], answer: 2 },
];

export const EST_BANK = [
  { q: 'Sông Mê Kông dài khoảng bao nhiêu ki-lô-mét?', unit: 'km', answer: 4350 },
  { q: 'Đỉnh Fansipan cao khoảng bao nhiêu mét?', unit: 'm', answer: 3143 },
  { q: 'Dân số Việt Nam khoảng bao nhiêu triệu người?', unit: 'triệu người', answer: 101 },
  { q: 'Một con voi châu Á trưởng thành nặng khoảng bao nhiêu ki-lô-gam?', unit: 'kg', answer: 4000 },
  { q: 'Ánh sáng đi được bao nhiêu ki-lô-mét trong một giây?', unit: 'km', answer: 300000 },
  { q: 'Chu vi Trái Đất khoảng bao nhiêu ki-lô-mét?', unit: 'km', answer: 40000 },
  { q: 'Tháp Eiffel ở Paris cao khoảng bao nhiêu mét?', unit: 'm', answer: 330 },
  { q: 'Cơ thể người trưởng thành có bao nhiêu chiếc xương?', unit: 'xương', answer: 206 },
  { q: 'Trái tim người đập khoảng bao nhiêu lần trong một ngày?', unit: 'lần', answer: 100000 },
  { q: 'Sông Hồng dài khoảng bao nhiêu ki-lô-mét?', unit: 'km', answer: 1149 },
  { q: 'Diện tích Việt Nam khoảng bao nhiêu ki-lô-mét vuông?', unit: 'km²', answer: 331690 },
  { q: 'Một con cá voi xanh trưởng thành dài khoảng bao nhiêu mét?', unit: 'm', answer: 30 },
  { q: 'Người trưởng thành có bao nhiêu chiếc răng (đủ bộ)?', unit: 'răng', answer: 32 },
  { q: 'Bề mặt Mặt Trời nóng khoảng bao nhiêu độ C?', unit: '°C', answer: 5500 },
  { q: 'Trái Đất cách Mặt Trời khoảng bao nhiêu triệu ki-lô-mét?', unit: 'triệu km', answer: 150 },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const SEAT_COLORS = ['blue', 'pink', 'green', 'purple'];
export const PLACEMENT_POINTS = [300, 200, 100, 50];
export const DIFFS = ['de', 'vua', 'kho'];
export const DIFF_LABELS = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };

export const GAMES = {
  'nhanh-tay': { name: 'Nhanh Tay', desc: 'Đợi màu xanh, bấm nhanh nhất!', rounds: 5 },
  'do-vui': { name: 'Đố Vui Tốc Độ', desc: 'Trả lời đúng và nhanh nhất', rounds: 8 },
  'doan-so': { name: 'Đoán Số Chuẩn', desc: 'Ước lượng gần đúng nhất', rounds: 5 },
  'dua-bam': { name: 'Đua Bấm Nút', desc: '10 giây bấm thật nhiều', rounds: 3 },
  'nho-mau': { name: 'Nhớ Màu', desc: 'Nhớ và bấm lại dãy màu', rounds: 5 },
  'day-ra': { name: 'Đẩy Ra Khỏi Sàn', desc: 'Gamepad: đẩy hết đối thủ khỏi sàn tròn!', rounds: 1 },
  'ne-dan': { name: 'Né Đạn', desc: 'Gamepad: né đạn pháo, sống sót đến cuối!', rounds: 1 },
  'keo-co': { name: 'Kéo Co', desc: 'Hai đội bấm nút B, kéo nút thắt về phía mình!', rounds: 1 },
  // Rounds for Chia Hay Cướp are dynamic: one round per seated player
  // (pairs rotate, see beginRound), so `rounds` here is only nominal.
  'chia-cuop': { name: 'Chia Hay Cướp', desc: 'Thương lượng 60 giây rồi chọn bí mật: Chia hay Cướp?', rounds: 4 },
};

// Bot behaviour per difficulty. Bots are simulated server-side from plans
// that are generated when each round/question starts.
const BOT = {
  de:  { quizCorrect: 0.45, quizDelay: [6000, 13000], reactEarly: 0.15, reactMs: [550, 1200], guessFactor: [0.35, 2.40], guessDelay: [7000, 15000], taps: [25, 45],  memory: 0.35 },
  vua: { quizCorrect: 0.65, quizDelay: [4000, 9000],  reactEarly: 0.08, reactMs: [320, 700],  guessFactor: [0.65, 1.55], guessDelay: [5000, 11000], taps: [45, 70],  memory: 0.60 },
  kho: { quizCorrect: 0.88, quizDelay: [1800, 4800],  reactEarly: 0.03, reactMs: [170, 370],  guessFactor: [0.88, 1.14], guessDelay: [3000, 7000],  taps: [70, 100], memory: 0.85 },
};

const ROOM_TTL_SECONDS = 6 * 3600;
const QUIZ_MS = 15000, QUIZ_REVEAL_MS = 4000;
const GUESS_MS = 20000, GUESS_REVEAL_MS = 5000;
const REACT_GO_MS = 3000, ROUND_PAUSE_MS = 3500;
const RACE_COUNTDOWN_MS = 3000, RACE_MS = 10000, RACE_PAUSE_MS = 3000;
const MEMORY_INPUT_MS = 12000, MEMORY_PAUSE_MS = 3000;
const ARENA_R0 = 10, ARENA_RMIN = 4, ARENA_MS = 90000, ARENA_LIVES = 3, TICK_MS = 500;
const SHOVE_RANGE = 2.7, SHOVE_FORCE = 2.7;
// Né Đạn: same tick engine + walled arena (no shrinking, no ring-out).
const DODGE_MS = 75000, DODGE_LIVES = 3, BALL_SPEED = 1.15, BALL_HIT_DIST = 1.35;
// Kéo Co: knot = TUG_STEP * (presses of even seats - presses of odd seats);
// first side to |knot| >= TUG_WIN within TUG_MS wins, else the leader at
// time out wins (exact tie = draw). Bots add BOT_TUG presses per tick.
const TUG_MS = 20000, TUG_WIN = 84, TUG_STEP = 3;
const BOT_TUG = { de: 1, vua: 2, kho: 3 };
// Chia Hay Cướp: negotiation then secret choice; pot per round, final ×2.
const TALK_MS = 60000, CHOOSE_MS = 15000, POT = 400;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
function now() { return Date.now(); }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function makeToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
function fail(message, status) { return json({ ok: false, error: message }, status || 400); }

// ---------------------------------------------------------------------------
// Room storage + helpers
// ---------------------------------------------------------------------------
// Primary store: one Durable Object per room code (binding ROOMS_DO, class
// RoomStore below). DO storage writes are not subject to the KV daily write
// limit that took the game down. KV (binding ROOMS) is kept only as a
// fallback for environments without the DO binding.
//
// lastSavedJson is a best-effort, isolate-local write dedup: saveRoom skips
// the underlying put when the payload is byte-identical to the last one this
// isolate wrote. Correctness never depends on it — a cold isolate simply
// writes again.
const lastSavedJson = new Map();

function roomStub(env, code) {
  return env.ROOMS_DO.get(env.ROOMS_DO.idFromName(code));
}
async function loadRoom(env, code) {
  if (env.ROOMS_DO) {
    const res = await roomStub(env, code).fetch('https://room/get');
    if (res.status === 404) return null;
    const raw = await res.text();
    return raw ? JSON.parse(raw) : null;
  }
  const raw = await env.ROOMS.get('room:' + code);
  return raw ? JSON.parse(raw) : null;
}
async function saveRoom(env, room) {
  room.updatedAt = now();
  const payload = JSON.stringify(room);
  if (lastSavedJson.get(room.code) === payload) return;
  if (env.ROOMS_DO) {
    await roomStub(env, room.code).fetch('https://room/put', { method: 'PUT', body: payload });
  } else {
    await env.ROOMS.put('room:' + room.code, payload, { expirationTtl: ROOM_TTL_SECONDS });
  }
  lastSavedJson.set(room.code, payload);
}
async function deleteRoom(env, code) {
  lastSavedJson.delete(code);
  if (env.ROOMS_DO) {
    await roomStub(env, code).fetch('https://room/delete', { method: 'POST' });
  } else if (env.ROOMS.delete) {
    await env.ROOMS.delete('room:' + code);
  }
}

// Durable Object holding one room. Internal protocol (only loadRoom /
// saveRoom / deleteRoom talk to it):
//   GET    /get    → 200 with the room JSON text, or 404 if absent/expired
//   PUT    /put    → store the room JSON text with a fresh expiry, 200
//   POST   /delete → clear the room, 200
// The stored value is an envelope { json, expiresAt } under the key 'room';
// expiry is logical (checked on /get) because DO storage has no TTL.
export class RoomStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/get' && request.method === 'GET') {
      const entry = await this.state.storage.get('room');
      if (!entry) return new Response(null, { status: 404 });
      if (entry.expiresAt <= Date.now()) {
        await this.state.storage.delete('room');
        return new Response(null, { status: 404 });
      }
      return new Response(entry.json, {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    if (path === '/put' && request.method === 'PUT') {
      const text = await request.text();
      await this.state.storage.put('room', {
        json: text,
        expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000,
      });
      return new Response(null, { status: 200 });
    }
    if (path === '/delete' && request.method === 'POST') {
      await this.state.storage.delete('room');
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 404 });
  }
}
function newRoom(code, hostToken) {
  return {
    code, hostToken, phase: 'lobby', players: [], game: null, lastGame: null,
    resultsLog: [], bubble: null, prevRanks: null, createdAt: now(), updatedAt: now(),
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
    pad: {}, padPrev: {}, blobs: null, arenaR: 0, tickCount: 0, nextTickAt: 0, elimOrder: [], botIntent: {}, dashCd: {}, shoveCd: {},
    balls: null, spawnIn: 0, invuln: {}, elimTick: {},
    presses: {}, knot: 0, teams: null, winnerTeam: null,
    pair: null, chat: {},
  };
  room.players.forEach((p) => { game.points[p.seat] = 0; game.streaks[p.seat] = 0; });
  if (gameId === 'do-vui') game.order = shuffle(QUIZ_BANK.map((_, i) => i)).slice(0, meta.rounds);
  if (gameId === 'doan-so') game.order = shuffle(EST_BANK.map((_, i) => i)).slice(0, meta.rounds);
  // Chia Hay Cướp rotates pairs across the table: one round per player.
  if (gameId === 'chia-cuop') game.totalRounds = Math.max(2, room.players.length);
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
  room.resultsLog.push(entry);
  if (room.resultsLog.length > 20) room.resultsLog = room.resultsLog.slice(-20);
  room.lastGame = { id: g.id, name: entry.name, points: entry.points, standings: standingsOf(room) };
  snapshotRanks(room);
  room.game = null;
  room.phase = 'results';
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
function chiaBotChoice(diff, round) {
  if (diff === 'de') return 'chia';
  if (diff === 'kho') return 'cuop';
  return round % 2 === 1 ? 'chia' : 'cuop';
}
const NEGOT_LINES = [
  'Chia đôi cho lành nhé!',
  'Tin tui đi, chia là chắc ăn nhất.',
  'Cướp là tui không nể đâu nha.',
  'Thương lượng đàng hoàng nè, chia nhé?',
];
function beginRound(room) {
  const g = room.game; const t = now();
  g.inputs = {}; g.botPlan = {}; g.reveal = null;
  const bots = room.players.filter((p) => p.type === 'bot');
  if (g.id === 'nhanh-tay') {
    g.phase = 'wait';
    g.greenAt = t + Math.round(rand(1800, 5500));
    g.endsAt = g.greenAt + REACT_GO_MS;
    bots.forEach((p) => {
      const B = BOT[p.difficulty];
      if (Math.random() < B.reactEarly) g.botPlan[p.seat] = { earlyAt: g.greenAt - Math.round(rand(200, 900)) };
      else g.botPlan[p.seat] = { tapAt: g.greenAt + botDelay(p.difficulty, B.reactMs) };
    });
  } else if (g.id === 'do-vui') {
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
  } else if (g.id === 'doan-so') {
    const src = EST_BANK[g.order[g.round - 1]];
    g.current = { q: src.q, unit: src.unit, answer: src.answer };
    g.phase = 'guess'; g.qStart = t; g.endsAt = t + GUESS_MS;
    bots.forEach((p) => {
      const B = BOT[p.difficulty];
      let factor = rand(B.guessFactor[0], B.guessFactor[1]);
      if (Math.abs(factor - 1) < 0.04) factor += 0.06; // a bot never lands exactly on the answer
      g.botPlan[p.seat] = { value: Math.max(1, Math.round(src.answer * factor)), at: t + botDelay(p.difficulty, B.guessDelay) };
    });
  } else if (g.id === 'dua-bam') {
    g.phase = 'race'; g.raceStart = t; g.endsAt = t + RACE_MS;
    room.players.forEach((p) => { if (p.type === 'human') g.inputs[p.seat] = { count: 0 }; });
    bots.forEach((p) => { g.botPlan[p.seat] = { totalTaps: randInt(BOT[p.difficulty].taps[0], BOT[p.difficulty].taps[1]) }; });
  } else if (g.id === 'nho-mau') {
    const len = g.round + 2;
    g.seq = Array.from({ length: len }, () => randInt(0, 3));
    g.phase = 'show'; g.endsAt = t + 900 + len * 750;
    bots.forEach((p) => {
      const prob = Math.max(0.1, BOT[p.difficulty].memory - 0.05 * (len - 3));
      g.botPlan[p.seat] = { success: Math.random() < prob, finishIn: Math.round(rand(2000, 5000)) };
    });
  } else if (g.id === 'day-ra') {
    g.phase = 'arena';
    g.arenaR = ARENA_R0; g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + ARENA_MS;
    g.blobs = {}; g.elimOrder = []; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; g.pad = {}; g.padPrev = {};
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
        lives: ARENA_LIVES, alive: true,
      };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0;
    });
  } else if (g.id === 'ne-dan') {
    g.phase = 'dodge';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + DODGE_MS;
    g.blobs = {}; g.balls = []; g.spawnIn = 3; g.elimOrder = []; g.elimTick = {};
    g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; g.pad = {}; g.padPrev = {}; g.invuln = {};
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
        lives: DODGE_LIVES, alive: true,
      };
      g.dashCd[p.seat] = 0; g.invuln[p.seat] = 0;
    });
  } else if (g.id === 'keo-co') {
    g.phase = 'pull';
    g.endsAt = t + TUG_MS; g.tickCount = 0; g.nextTickAt = t + TICK_MS;
    g.presses = {}; g.knot = 0; g.winnerTeam = null; g.pad = {}; g.padPrev = {};
    const teamA = [], teamB = [];
    room.players.forEach((p) => {
      g.presses[p.seat] = 0;
      (p.seat % 2 === 1 ? teamA : teamB).push(p.seat);
    });
    g.teams = { A: teamA, B: teamB };
  } else if (g.id === 'chia-cuop') {
    // Pairs rotate around the table: round r pairs seats[(r-1) mod n] with
    // seats[r mod n]; everyone else sits out and watches the negotiation.
    const seats = room.players.map((p) => p.seat).sort((x, y) => x - y);
    const n = seats.length;
    g.pair = [seats[(g.round - 1) % n], seats[g.round % n]];
    g.phase = 'talk'; g.endsAt = t + TALK_MS; g.chat = {};
    g.pair.forEach((seat) => {
      const p = playerAt(room, seat);
      if (p && p.type === 'bot') {
        g.botPlan[seat] = { choice: chiaBotChoice(p.difficulty, g.round) };
        g.chat[seat] = { text: NEGOT_LINES[(g.round + seat) % NEGOT_LINES.length], at: t };
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Advance engine: phases move forward lazily whenever a request touches
// the room. Bots act from their precomputed plans.
// ---------------------------------------------------------------------------
function advance(room) {
  let guard = 0;
  while (guard++ < 40) { if (!step(room)) break; }
}
function step(room) {
  const g = room.game;
  if (room.phase !== 'playing' || !g) return false;
  const t = now();
  if (g.phase === 'countdown') {
    if (t >= g.endsAt) { beginRound(room); return true; }
    return false;
  }
  if (g.id === 'nhanh-tay') return stepReact(room, t);
  if (g.id === 'do-vui') return stepQuiz(room, t);
  if (g.id === 'doan-so') return stepGuess(room, t);
  if (g.id === 'dua-bam') return stepRace(room, t);
  if (g.id === 'nho-mau') return stepMemory(room, t);
  if (g.id === 'day-ra') return stepArena(room, t);
  if (g.id === 'ne-dan') return stepDodge(room, t);
  if (g.id === 'keo-co') return stepTug(room, t);
  if (g.id === 'chia-cuop') return stepChia(room, t);
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

// --- Game 1: Nhanh Tay (reaction) -----------------------------------------
function stepReact(room, t) {
  const g = room.game;
  if (g.phase === 'wait') {
    if (t >= g.greenAt) { g.phase = 'go'; return true; }
    return false;
  }
  if (g.phase === 'go') {
    const settled = humansAllIn(room, (s) => !!g.inputs[s]) && botsDue(room, (pl) => (pl.earlyAt || pl.tapAt || 0));
    if (t >= g.endsAt || settled) { resolveReact(room, t); return true; }
    return false;
  }
  if (g.phase === 'roundEnd') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function resolveReact(room, t) {
  const g = room.game;
  const entries = room.players.map((p) => {
    const e = { seat: p.seat, status: 'none', reactionMs: null, gapMs: null, points: 0 };
    if (p.type === 'human') {
      const inp = g.inputs[p.seat];
      if (inp && inp.early) e.status = 'early';
      else if (inp && inp.tapAt) { e.status = 'tapped'; e.reactionMs = inp.tapAt - g.greenAt; }
    } else {
      const plan = g.botPlan[p.seat] || {};
      if (plan.earlyAt) e.status = 'early';
      else if (plan.tapAt && plan.tapAt <= g.endsAt) { e.status = 'tapped'; e.reactionMs = plan.tapAt - g.greenAt; }
    }
    return e;
  });
  const tapped = entries.filter((e) => e.status === 'tapped').sort((a, b) => a.reactionMs - b.reactionMs || a.seat - b.seat);
  const best = tapped.length ? tapped[0].reactionMs : 0;
  tapped.forEach((e, i) => { e.points = roundPoints(g, PLACEMENT_POINTS[Math.min(i, 3)]); e.gapMs = e.reactionMs - best; });
  entries.forEach((e) => { if (e.status === 'early') e.points = roundPoints(g, -100); });
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  const order = tapped.concat(entries.filter((e) => e.status === 'early'), entries.filter((e) => e.status === 'none'));
  g.lastRound = { round: g.round, entries: order };
  finishTimedRound(room, 'roundEnd', t + ROUND_PAUSE_MS);
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

// --- Game 3: Đoán Số Chuẩn (estimation, dramatic worst→best reveal) --------
function stepGuess(room, t) {
  const g = room.game;
  if (g.phase === 'guess') {
    const settled = humansAllIn(room, (s) => !!g.inputs[s]) && botsDue(room, (pl) => pl.at || 0);
    if (t >= g.endsAt || settled) { resolveGuess(room, t); return true; }
    return false;
  }
  if (g.phase === 'reveal') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function resolveGuess(room, t) {
  const g = room.game;
  const answer = g.current.answer;
  const entries = room.players.map((p) => {
    let value = null;
    if (p.type === 'human') { const inp = g.inputs[p.seat]; if (inp && typeof inp.value === 'number') value = inp.value; }
    else { const plan = g.botPlan[p.seat]; if (plan) value = plan.value; }
    return { seat: p.seat, value, diff: value === null ? null : Math.abs(value - answer), points: 0 };
  });
  const ranked = entries.filter((e) => e.value !== null)
    .sort((a, b) => (a.diff - b.diff) || (a.seat - b.seat));
  ranked.forEach((e, i) => { e.points = roundPoints(g, PLACEMENT_POINTS[Math.min(i, 3)]); });
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  // Drama order: no-guess first (worst), then largest deviation → smallest.
  const drama = entries.filter((e) => e.value === null)
    .concat(entries.filter((e) => e.value !== null).sort((a, b) => (b.diff - a.diff) || (a.seat - b.seat)));
  drama.forEach((e, i) => { e.revealAt = t + 800 + i * 1200; });
  g.reveal = { answer, entries: drama };
  g.lastRound = { round: g.round, points: Object.fromEntries(entries.map((e) => [e.seat, e.points])) };
  finishTimedRound(room, 'reveal', t + 1600 + drama.length * 1200);
}

// --- Game 4: Đua Bấm Nút (tap race) ----------------------------------------
function stepRace(room, t) {
  const g = room.game;
  if (g.phase === 'race') {
    if (t >= g.endsAt) { resolveRace(room, t); return true; }
    return false;
  }
  if (g.phase === 'pause') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function raceCount(room, p, t) {
  const g = room.game;
  if (p.type === 'human') { const inp = g.inputs[p.seat]; return inp ? inp.count : 0; }
  const plan = g.botPlan[p.seat];
  if (!plan) return 0;
  if (g.phase !== 'race') return plan.totalTaps;
  const frac = Math.min(1, Math.max(0, (t - g.raceStart) / RACE_MS));
  return Math.floor(plan.totalTaps * frac);
}
function resolveRace(room, t) {
  const g = room.game;
  const entries = room.players.map((p) => ({ seat: p.seat, taps: raceCount(room, p, t), points: 0 }));
  const ranked = entries.slice().sort((a, b) => (b.taps - a.taps) || (a.seat - b.seat));
  ranked.forEach((e, i) => { e.points = roundPoints(g, PLACEMENT_POINTS[Math.min(i, 3)]); });
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: g.round, entries: ranked };
  finishTimedRound(room, 'pause', t + RACE_PAUSE_MS);
}

// --- Game 5: Nhớ Màu (memory sequence) --------------------------------------
function stepMemory(room, t) {
  const g = room.game;
  if (g.phase === 'show') {
    if (t >= g.endsAt) {
      g.phase = 'input'; g.inputStart = t; g.endsAt = t + MEMORY_INPUT_MS;
      room.players.forEach((p) => { if (p.type === 'human') g.inputs[p.seat] = { taps: [], status: 'playing' }; });
      room.players.filter((p) => p.type === 'bot').forEach((p) => {
        const plan = g.botPlan[p.seat]; if (plan) plan.finishAt = t + plan.finishIn;
      });
      return true;
    }
    return false;
  }
  if (g.phase === 'input') {
    const humansDone = humansAllIn(room, (s) => { const inp = g.inputs[s]; return inp && inp.status !== 'playing'; });
    if (t >= g.endsAt || humansDone) { resolveMemory(room, t); return true; }
    return false;
  }
  if (g.phase === 'pause') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function resolveMemory(room, t) {
  const g = room.game;
  const len = g.seq.length;
  const pts = {};
  room.players.forEach((p) => {
    let ok = false;
    if (p.type === 'human') { const inp = g.inputs[p.seat]; ok = !!inp && inp.status === 'done'; }
    else { const plan = g.botPlan[p.seat]; ok = !!plan && plan.success; }
    pts[p.seat] = ok ? roundPoints(g, 100 + 40 * len) : 0;
    g.points[p.seat] = (g.points[p.seat] || 0) + pts[p.seat];
  });
  g.lastRound = { round: g.round, points: pts, len };
  finishTimedRound(room, 'pause', t + MEMORY_PAUSE_MS);
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
    simulateTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // long poll gap: resync instead of spiralling
    return true;
  }
  return false;
}
function botBrain(room, p) {
  const g = room.game;
  const every = p.difficulty === 'kho' ? 1 : p.difficulty === 'vua' ? 2 : 3;
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
function simulateTick(room) {
  const g = room.game;
  g.tickCount += 1;
  if (g.tickCount % 4 === 0 && g.arenaR > ARENA_RMIN) g.arenaR = Math.max(ARENA_RMIN, g.arenaR - 0.5);
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
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = 6; }
    b.x += mv.x * stepMul; b.y += mv.y * stepMul;
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
      foe.x += ((foe.x - b.x) / foeD) * SHOVE_FORCE;
      foe.y += ((foe.y - b.y) / foeD) * SHOVE_FORCE;
      g.shoveCd[p.seat] = 3;
    }
  });
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    if (Math.hypot(b.x, b.y) > g.arenaR) {
      b.lives -= 1;
      if (b.lives > 0) {
        const ang = rand(0, Math.PI * 2); const rr = g.arenaR * 0.3 * Math.random();
        b.x = Math.cos(ang) * rr; b.y = Math.sin(ang) * rr;
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
      || (Math.hypot(g.blobs[a.seat].x, g.blobs[a.seat].y) - Math.hypot(g.blobs[b.seat].x, g.blobs[b.seat].y))
      || (a.seat - b.seat));
  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);
  const ranking = aliveRanked.concat(elimRanked);
  const entries = ranking.map((p, i) => ({ seat: p.seat, points: PLACEMENT_POINTS[Math.min(i, 3)], lives: g.blobs[p.seat].lives, alive: g.blobs[p.seat].alive }));
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries };
  endGame(room);
}

// --- Game 7: Né Đạn (tick arena survival, walled arena) ---------------------
// Same tick simulation + pad held-state as Đẩy Ra Khỏi Sàn, but the arena
// has walls (blobs clamp inside, no ring-out, no shrinking). Cannonballs
// spawn from the edges on ticks and cross the field; a hit costs 1 of 3
// lives and grants 4 ticks of invulnerability so one ball can never
// multi-hit. Ranking: survivors first (most lives), then by elimination
// tick (eliminated later = better). Placement awarded once per match
// (300/200/100/50) like the other arena game — the ×2 rule is rounds-only.
function stepDodge(room, t) {
  const g = room.game;
  if (g.phase !== 'dodge') return false;
  if (t >= g.endsAt) { finishDodge(room); return true; }
  if (t >= g.nextTickAt) {
    simulateDodgeTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync after long gaps
    return true;
  }
  return false;
}
function botBrainDodge(room, p) {
  const g = room.game;
  const every = p.difficulty === 'kho' ? 1 : p.difficulty === 'vua' ? 2 : 3;
  const prev = g.botIntent[p.seat];
  if (prev && (g.tickCount + p.seat) % every !== 0) return prev;
  const me = g.blobs[p.seat];
  let tx = -me.x * 0.4, ty = -me.y * 0.4; // drift back towards the centre
  let ball = null, bd = 1e9;
  (g.balls || []).forEach((b) => {
    const d = Math.hypot(b.x - me.x, b.y - me.y);
    if (d < bd) { bd = d; ball = b; }
  });
  if (ball && bd < 6.5) { tx = me.x - ball.x; ty = me.y - ball.y; } // run away
  const intent = { x: Math.abs(tx) > 0.4 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.4 ? Math.sign(ty) : 0 };
  g.botIntent[p.seat] = intent;
  return intent;
}
function simulateDodgeTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = {};
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    const mv = { x: 0, y: 0, dash: false };
    if (p.type === 'human') {
      const pad = g.pad[p.seat] || {};
      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);
      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);
      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;
    } else {
      const intent = botBrainDodge(room, p);
      mv.x = intent.x; mv.y = intent.y;
    }
    moves[p.seat] = mv;
  });
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = 6; }
    b.x += mv.x * stepMul; b.y += mv.y * stepMul;
    const d = Math.hypot(b.x, b.y); const maxR = ARENA_R0 - 0.8;
    if (d > maxR) { b.x *= maxR / d; b.y *= maxR / d; } // the wall stops you
  });
  // Cannonballs: spawn on a cadence that tightens as the match goes on.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    const R = ARENA_R0 + 2;
    const side = randInt(0, 3); const along = rand(-8, 8);
    let x = 0, y = 0;
    if (side === 0) { x = -R; y = along; } else if (side === 1) { x = R; y = along; }
    else if (side === 2) { x = along; y = -R; } else { x = along; y = R; }
    const tx = rand(-5, 5), ty = rand(-5, 5);
    const dx = tx - x, dy = ty - y; const dd = Math.hypot(dx, dy) || 1;
    g.balls.push({ x, y, vx: (dx / dd) * BALL_SPEED, vy: (dy / dd) * BALL_SPEED });
    g.spawnIn = Math.max(3, 7 - Math.floor(g.tickCount / 24));
  }
  g.balls.forEach((b) => { b.x += b.vx; b.y += b.vy; });
  g.balls = g.balls.filter((b) => Math.hypot(b.x, b.y) <= 15);
  // Hits.
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    if (g.invuln[p.seat] > 0) { g.invuln[p.seat] -= 1; return; }
    const idx = g.balls.findIndex((ball) => Math.hypot(ball.x - b.x, ball.y - b.y) < BALL_HIT_DIST);
    if (idx < 0) return;
    g.balls.splice(idx, 1);
    b.lives -= 1;
    g.invuln[p.seat] = 4;
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
    seat: p.seat, points: PLACEMENT_POINTS[Math.min(i, 3)],
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
function tugKnot(room) {
  const g = room.game;
  let a = 0, b = 0;
  room.players.forEach((p) => {
    const n = g.presses[p.seat] || 0;
    if (p.seat % 2 === 1) a += n; else b += n;
  });
  return TUG_STEP * (b - a);
}
function stepTug(room, t) {
  const g = room.game;
  if (g.phase !== 'pull') return false;
  const knot = tugKnot(room);
  g.knot = knot;
  if (Math.abs(knot) >= TUG_WIN) { finishTug(room, knot > 0 ? 'B' : 'A'); return true; }
  if (t >= g.endsAt) { finishTug(room, knot > 0 ? 'B' : knot < 0 ? 'A' : null); return true; }
  if (t >= g.nextTickAt) {
    room.players.filter((p) => p.type === 'bot').forEach((p) => {
      g.presses[p.seat] = (g.presses[p.seat] || 0) + BOT_TUG[p.difficulty];
    });
    g.tickCount += 1;
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
    return true;
  }
  return false;
}
function finishTug(room, winnerTeam) {
  const g = room.game;
  g.winnerTeam = winnerTeam;
  g.knot = tugKnot(room);
  const entries = room.players.map((p) => {
    const team = p.seat % 2 === 1 ? 'A' : 'B';
    const points = winnerTeam === null ? 200 : (team === winnerTeam ? 300 : 200);
    return { seat: p.seat, team, presses: g.presses[p.seat] || 0, points };
  });
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  g.lastRound = { round: 1, entries, knot: g.knot, winnerTeam };
  endGame(room);
}

// --- Game 9: Chia Hay Cướp (negotiate, then a secret split-or-steal) --------
// Per round: 'talk' (TALK_MS, the pair can post chat bubbles the host
// shows) -> 'choose' (CHOOSE_MS, both lock a secret choice; bots lock
// theirs the moment the phase opens) -> 'reveal' (choices exposed one at
// a time via revealAt). Choices live only in g.inputs on the server and
// are NEVER put into any view before the reveal phase. A player who does
// not choose in time defaults to Chia. Pot is POT, doubled on the final
// round: both Chia = half each, lone Cướp takes all, both Cướp = 0.
function stepChia(room, t) {
  const g = room.game;
  if (g.phase === 'talk') {
    if (t >= g.endsAt) { enterChiaChoose(room); return true; }
    return false;
  }
  if (g.phase === 'choose') {
    const both = (g.pair || []).every((s) => !!g.inputs[s]);
    if (both || t >= g.endsAt) { resolveChia(room, t); return true; }
    return false;
  }
  if (g.phase === 'reveal') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function enterChiaChoose(room) {
  const g = room.game; const t = now();
  g.phase = 'choose'; g.endsAt = t + CHOOSE_MS;
  (g.pair || []).forEach((seat) => {
    const p = playerAt(room, seat);
    if (p && p.type === 'bot') { const plan = g.botPlan[seat]; if (plan) g.inputs[seat] = { choice: plan.choice, at: t }; }
  });
}
function resolveChia(room, t) {
  const g = room.game;
  const pot = isFinalRound(g) ? POT * 2 : POT;
  const sa = g.pair[0], sb = g.pair[1];
  const ca = (g.inputs[sa] && g.inputs[sa].choice) || 'chia';
  const cb = (g.inputs[sb] && g.inputs[sb].choice) || 'chia';
  const won = {};
  won[sa] = 0; won[sb] = 0;
  if (ca === 'chia' && cb === 'chia') { won[sa] = pot / 2; won[sb] = pot / 2; }
  else if (ca === 'cuop' && cb === 'chia') won[sa] = pot;
  else if (ca === 'chia' && cb === 'cuop') won[sb] = pot;
  const entries = [sa, sb].map((seat, i) => ({
    seat, choice: seat === sa ? ca : cb, points: won[seat], revealAt: t + 700 + i * 1500,
  }));
  const ptsAll = {};
  room.players.forEach((p) => { ptsAll[p.seat] = won[p.seat] || 0; g.points[p.seat] = (g.points[p.seat] || 0) + ptsAll[p.seat]; });
  g.reveal = { pot, entries };
  g.lastRound = { round: g.round, points: ptsAll, pair: g.pair.slice() };
  finishTimedRound(room, 'reveal', t + 700 + 2 * 1500 + 900);
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
function gameView(room, role, seat, t) {
  const g = room.game;
  const v = {
    id: g.id, name: GAMES[g.id].name, round: g.round, totalRounds: g.totalRounds,
    phase: g.phase, endsAt: g.endsAt, finalRound: isFinalRound(g), points: g.points, lastRound: g.lastRound,
  };
  if (g.id === 'nhanh-tay') {
    const status = {};
    room.players.forEach((p) => {
      if (p.type === 'human') { const inp = g.inputs[p.seat]; status[p.seat] = inp ? (inp.early ? 'early' : 'tapped') : 'waiting'; }
      else {
        const plan = g.botPlan[p.seat] || {};
        if (plan.earlyAt && plan.earlyAt <= t) status[p.seat] = 'early';
        else if (plan.tapAt && plan.tapAt <= t && g.phase === 'go') status[p.seat] = 'tapped';
        else status[p.seat] = 'waiting';
      }
    });
    v.status = status;
    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? (inp.early ? 'early' : 'tapped') : 'waiting'; }
  } else if (g.id === 'do-vui') {
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
  } else if (g.id === 'doan-so') {
    if (g.phase === 'guess' || g.phase === 'reveal') { v.question = g.current.q; v.unit = g.current.unit; }
    const guessed = {};
    room.players.forEach((p) => {
      if (p.type === 'human') guessed[p.seat] = !!g.inputs[p.seat];
      else { const plan = g.botPlan[p.seat]; guessed[p.seat] = !!plan && plan.at <= t; }
    });
    v.guessed = guessed;
    if (g.phase === 'reveal') v.reveal = g.reveal;
    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? inp.value : null; }
  } else if (g.id === 'dua-bam') {
    const counts = {};
    room.players.forEach((p) => { counts[p.seat] = raceCount(room, p, t); });
    v.counts = counts;
    if (seat) v.mine = counts[seat] || 0;
  } else if (g.id === 'day-ra') {
    v.arenaR = g.arenaR;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
    });
  } else if (g.id === 'ne-dan') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
    });
    v.balls = (g.balls || []).map((b) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100 }));
  } else if (g.id === 'keo-co') {
    v.teams = g.teams;
    v.presses = g.presses;
    v.knot = tugKnot(room);
    v.phaseDur = TUG_MS;
  } else if (g.id === 'chia-cuop') {
    v.pair = g.pair;
    v.pot = isFinalRound(g) ? POT * 2 : POT;
    v.phaseDur = g.phase === 'talk' ? TALK_MS : g.phase === 'choose' ? CHOOSE_MS : 0;
    v.chat = (g.pair || []).filter((s) => g.chat && g.chat[s]).map((s) => ({ seat: s, text: g.chat[s].text }));
    const chosen = {};
    (g.pair || []).forEach((s) => { chosen[s] = !!g.inputs[s]; });
    v.chosen = chosen;
    // Secrecy rule: no choice values in ANY view before the reveal phase;
    // a player only ever sees that they themselves have locked in.
    if (g.phase === 'reveal') v.reveal = g.reveal;
    if (seat) v.mineChosen = !!(g.pair && g.pair.indexOf(seat) >= 0 && g.inputs[seat]);
  } else if (g.id === 'nho-mau') {
    v.len = g.seq ? g.seq.length : 0;
    const statuses = {};
    room.players.forEach((p) => {
      if (g.phase === 'show') statuses[p.seat] = 'watching';
      else if (p.type === 'human') { const inp = g.inputs[p.seat]; statuses[p.seat] = inp ? inp.status : 'playing'; }
      else {
        const plan = g.botPlan[p.seat];
        if (g.phase === 'input' && plan && plan.finishAt && t >= plan.finishAt) statuses[p.seat] = plan.success ? 'done' : 'failed';
        else statuses[p.seat] = 'playing';
      }
    });
    v.statuses = statuses;
    if (role === 'host' && g.phase === 'show') v.seq = g.seq;
    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? { taps: inp.taps.length, status: inp.status } : { taps: 0, status: 'playing' }; }
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
  }));
  let gap = null;
  if (st.length >= 2) {
    gap = { topSeat: st[0], secondSeat: st[1], diff: liveScore(room, playerAt(room, st[0])) - liveScore(room, playerAt(room, st[1])) };
  }
  return {
    ok: true, serverNow: t, code: room.code, phase: room.phase, players, standings: st, gap,
    bubble: room.bubble && room.bubble.until > t ? { seat: room.bubble.seat, text: room.bubble.text } : null,
    games: Object.keys(GAMES).map((id) => ({ id, name: GAMES[id].name, desc: GAMES[id].desc, rounds: GAMES[id].rounds })),
    game: room.game ? gameView(room, role, seat, t) : null,
    lastGame: room.lastGame,
    you: seat ? { seat } : null,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function startCheck(room) {
  if (humanCount(room) < 1) return 'Cần ít nhất 1 người chơi bằng điện thoại mới bắt đầu được.';
  if (room.players.length < 2) return 'Cần ít nhất 2 người chơi (thêm Máy hoặc rủ thêm bạn).';
  return null;
}
function hostAction(room, body) {
  const a = body.action;
  if (a === 'addBot') {
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ thêm Máy được khi đang ở sảnh chờ.';
    const seat = body.seat;
    if (!Number.isInteger(seat) || seat < 2 || seat > 4) return 'Chỉ thêm Máy vào ô P2, P3, P4.';
    if (playerAt(room, seat)) return 'Ô này đã có người.';
    room.players.push({ seat, type: 'bot', name: 'Máy', difficulty: 'vua', score: 0 });
    room.players.sort((x, y) => x.seat - y.seat);
    return null;
  }
  if (a === 'removeBot') {
    // Same phase gate as addBot: removing a bot mid-game (or at results)
    // would strand its seat inside the running game's snapshots and break
    // the results/podium views, so seat changes are lobby-only, exactly
    // like the buttons the UI shows.
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ xoá Máy được khi đang ở sảnh chờ.';
    const p = playerAt(room, body.seat);
    if (!p || p.type !== 'bot') return 'Ô này không phải Máy.';
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
  if (a === 'startGame') {
    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Đang chơi, không chọn game khác được.';
    if (!GAMES[body.game]) return 'Không có game này.';
    const err = startCheck(room);
    if (err) return err;
    createGame(room, body.game);
    return null;
  }
  if (a === 'continue') {
    if (room.phase !== 'results') return 'Chưa có kết quả để xem tiếp.';
    room.phase = 'podium';
    return null;
  }
  if (a === 'replay') {
    if ((room.phase !== 'results' && room.phase !== 'podium') || !room.lastGame) return 'Chưa có game nào để chơi lại.';
    createGame(room, room.lastGame.id);
    return null;
  }
  if (a === 'toChoosing') {
    if (room.phase !== 'podium') return 'Chưa ở bục vinh quang.';
    room.phase = 'choosing';
    return null;
  }
  if (a === 'finish') {
    if (room.phase !== 'podium' && room.phase !== 'choosing') return 'Chưa kết thúc được.';
    room.phase = 'final';
    return null;
  }
  if (a === 'playAgain') {
    if (room.phase !== 'final') return 'Chưa ở màn kết thúc.';
    room.players.forEach((p) => { p.score = 0; });
    room.resultsLog = []; room.lastGame = null; room.prevRanks = null;
    room.phase = 'lobby';
    return null;
  }
  return 'Hành động không hợp lệ.';
}
function playerAction(room, player, body) {
  const g = room.game;
  if (room.phase !== 'playing' || !g) return 'Chưa vào game.';
  const seat = player.seat; const t = now(); const a = body.action;
  if (a === 'pad') {
    if (g.id !== 'day-ra' && g.id !== 'ne-dan' && g.id !== 'keo-co' && g.id !== 'chia-cuop') return null;
    const pd = body.pad || {};
    const np = { u: !!pd.u, d: !!pd.d, l: !!pd.l, r: !!pd.r, a: !!pd.a, b: !!pd.b };
    const prev = g.pad[seat] || {};
    // Kéo Co: a press is the rising edge of B, counted the moment it lands.
    if (g.id === 'keo-co' && g.phase === 'pull' && np.b && !prev.b) {
      g.presses[seat] = (g.presses[seat] || 0) + 1;
    }
    // Chia Hay Cướp on the gamepad: A (the X position) = Chia, B = Cướp,
    // rising edge only, and only for the pair during the choose phase.
    if (g.id === 'chia-cuop' && g.phase === 'choose' && g.pair && g.pair.indexOf(seat) >= 0 && !g.inputs[seat]) {
      if (np.a && !prev.a) g.inputs[seat] = { choice: 'chia', at: t };
      else if (np.b && !prev.b) g.inputs[seat] = { choice: 'cuop', at: t };
    }
    g.pad[seat] = np;
    return null;
  }
  if (a === 'choose') {
    if (g.id !== 'chia-cuop' || g.phase !== 'choose') return 'Chưa đến lúc chọn.';
    if (!g.pair || g.pair.indexOf(seat) < 0) return 'Vòng này bạn ngồi ngoài, chỉ xem thôi.';
    if (g.inputs[seat]) return null;
    if (body.choice !== 'chia' && body.choice !== 'cuop') return 'Lựa chọn không hợp lệ.';
    g.inputs[seat] = { choice: body.choice, at: t };
    return null;
  }
  if (a === 'chat') {
    if (g.id !== 'chia-cuop' || g.phase !== 'talk') return 'Chỉ trò chuyện được trong lúc thương lượng.';
    if (!g.pair || g.pair.indexOf(seat) < 0) return 'Chỉ hai người trong cặp mới thương lượng.';
    const text = String(body.text || '').trim().slice(0, 60);
    if (!text) return 'Hãy nhập lời nhắn.';
    g.chat[seat] = { text, at: t };
    return null;
  }
  if (a === 'tap') {
    if (g.id === 'nhanh-tay') {
      if (g.inputs[seat]) return null;
      if (g.phase === 'wait') g.inputs[seat] = { early: true, tapAt: t };
      else if (g.phase === 'go') g.inputs[seat] = { tapAt: t };
      return null;
    }
    if (g.id === 'dua-bam') {
      if (g.phase !== 'race') return null;
      if (!g.inputs[seat]) g.inputs[seat] = { count: 0 };
      g.inputs[seat].count += 1;
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
  if (a === 'guess') {
    if (g.id !== 'doan-so' || g.phase !== 'guess') return 'Chưa đến lúc đoán.';
    if (g.inputs[seat]) return null;
    const v = body.value;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 1e12) return 'Số đoán không hợp lệ.';
    g.inputs[seat] = { value: Math.round(v), at: t };
    return null;
  }
  if (a === 'color') {
    if (g.id !== 'nho-mau' || g.phase !== 'input') return 'Chưa đến lúc bấm màu.';
    const inp = g.inputs[seat];
    if (!inp || inp.status !== 'playing') return null;
    const c = body.color;
    if (!Number.isInteger(c) || c < 0 || c > 3) return 'Màu không hợp lệ.';
    inp.taps.push(c);
    const idx = inp.taps.length - 1;
    if (c !== g.seq[idx]) inp.status = 'failed';
    else if (inp.taps.length === g.seq.length) { inp.status = 'done'; inp.doneAt = t; }
    return null;
  }
  return 'Hành động không hợp lệ.';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env) {
    // A malformed request target must never escape as an unhandled
    // exception: unparseable URLs are served the game page, and every API
    // failure below is a clean JSON ok:false.
    let url = null;
    try { url = new URL(request.url); } catch (e) { /* fall through to the page */ }
    const path = url ? url.pathname : '/';
    if (!path.startsWith('/api/')) {
      return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    try {
      if (path === '/api/rooms' && request.method === 'POST') {
        let code = null;
        for (let i = 0; i < 10 && !code; i++) {
          const candidate = String(randInt(100000, 999999));
          if (!(await loadRoom(env, candidate))) code = candidate;
        }
        if (!code) return fail('Không tạo được phòng, thử lại nhé.', 500);
        const room = newRoom(code, makeToken());
        await saveRoom(env, room);
        return json({ ok: true, code, hostToken: room.hostToken });
      }
      const m = path.match(/^\/api\/rooms\/(\d{6})\/(join|state|action)$/);
      if (!m) return fail('Không tìm thấy đường dẫn.', 404);
      const code = m[1]; const kind = m[2];
      const room = await loadRoom(env, code);
      if (!room) return fail('Không thấy phòng này. Kiểm tra lại mã nhé.', 404);

      if (kind === 'join' && request.method === 'POST') {
        const rawBody = await request.json().catch(() => null);
        const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
        // Joining is open in every phase except mid-game. Late joiners at
        // results/podium/final are spectators for the finished game: that
        // is safe because endGame() has already banked its points into
        // p.score and snapshotted them into lastGame (both immutable by
        // now), and room.game is null in those phases — so nothing the
        // joiner does can touch the finished game. They become a full
        // player from the next createGame(), which snapshots room.players.
        if (room.phase === 'playing') return fail('Phòng đang chơi, đợi ván sau nhé.');
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 14) : '';
        if (!name) return fail('Hãy nhập tên của bạn.');
        if (room.players.length >= 4) return fail('Phòng đã đủ 4 người.');
        let seat = 1;
        while (playerAt(room, seat)) seat += 1;
        const player = { seat, type: 'human', name, token: makeToken(), score: 0 };
        room.players.push(player);
        room.players.sort((x, y) => x.seat - y.seat);
        advance(room);
        await saveRoom(env, room);
        return json({ ok: true, seat, playerToken: player.token, color: SEAT_COLORS[seat - 1] });
      }

      if (kind === 'state' && request.method === 'GET') {
        const role = url.searchParams.get('role');
        const token = url.searchParams.get('token') || '';
        let seat = null;
        if (role === 'host') {
          if (token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          const p = room.players.find((x) => x.type === 'human' && x.token === token);
          if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = p.seat;
        }
        advance(room);
        await saveRoom(env, room);
        return json(buildView(room, role === 'host' ? 'host' : 'player', seat));
      }

      if (kind === 'action' && request.method === 'POST') {
        const rawBody = await request.json().catch(() => null);
        const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
        let seat = null; let player = null;
        if (body.role === 'host') {
          if (body.token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          player = room.players.find((x) => x.type === 'human' && x.token === body.token) || null;
          if (!player) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = player.seat;
        }
        advance(room);
        const err = body.role === 'host' ? hostAction(room, body) : playerAction(room, player, body);
        if (err) { await saveRoom(env, room); return fail(err); }
        advance(room);
        await saveRoom(env, room);
        return json(buildView(room, body.role === 'host' ? 'host' : 'player', seat));
      }
      return fail('Không tìm thấy đường dẫn.', 404);
    } catch (e) {
      return fail('Lỗi máy chủ: ' + (e && e.message ? e.message : 'không rõ'), 500);
    }
  },
};

// ---------------------------------------------------------------------------
// The game page (single HTML document). NOTE: the client script below is
// written without template literals or backslashes on purpose — it lives
// inside this template literal.
// ---------------------------------------------------------------------------
const PAGE = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Nảy Party — Game tiệc trên TV, điện thoại làm tay cầm</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Quicksand', sans-serif; background: #FFF6E9; color: #4A3226; min-height: 100vh;
  background-image: radial-gradient(circle at 12% 18%, rgba(247,127,176,.14) 0 90px, transparent 91px),
    radial-gradient(circle at 88% 12%, rgba(79,168,232,.14) 0 110px, transparent 111px),
    radial-gradient(circle at 82% 88%, rgba(88,196,114,.13) 0 100px, transparent 101px),
    radial-gradient(circle at 8% 86%, rgba(255,179,92,.15) 0 80px, transparent 81px); }
h1, h2, h3, .baloo { font-family: 'Baloo 2', cursive; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 18px 16px 40px; }
.card { background: #fff; border-radius: 28px; border: 3px solid #fff; box-shadow: 0 12px 30px rgba(140,90,30,.13); padding: 22px; }
.center { text-align: center; }
.btn { display: inline-block; border: none; cursor: pointer; font-family: 'Baloo 2', cursive; font-weight: 800;
  font-size: 20px; color: #fff; padding: 13px 28px; border-radius: 999px; background: #B08968;
  box-shadow: 0 6px 0 rgba(0,0,0,.18), 0 14px 22px rgba(120,72,20,.18); transition: transform .06s, box-shadow .06s; }
.btn:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.18), 0 6px 12px rgba(120,72,20,.18); }
.btn.blue { background: linear-gradient(180deg, #6DB6F2, #4FA8E8); box-shadow: 0 6px 0 #2F7FBF, 0 14px 22px rgba(47,127,191,.3); }
.btn.pink { background: linear-gradient(180deg, #FF9CC4, #F77FB0); box-shadow: 0 6px 0 #D6538A, 0 14px 22px rgba(214,83,138,.3); }
.btn.green { background: linear-gradient(180deg, #7ED98F, #58C472); box-shadow: 0 6px 0 #379A54, 0 14px 22px rgba(55,154,84,.3); }
.btn.purple { background: linear-gradient(180deg, #BFA8FF, #A78BFA); box-shadow: 0 6px 0 #7E63D8, 0 14px 22px rgba(126,99,216,.3); }
.btn.orange { background: linear-gradient(180deg, #FFC37E, #FFB35C); box-shadow: 0 6px 0 #E08A2E, 0 14px 22px rgba(224,138,46,.3); }
.btn.small { font-size: 15px; padding: 8px 16px; }
.btn.ghost { background: #FFF1DE; color: #8A5A33; box-shadow: 0 4px 0 #E4C9A2; }
.btn.off { opacity: .45; pointer-events: none; }
.logo { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.logo .word { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 58px; color: #4A3226; letter-spacing: 1px; }
.logo .party span { display: inline-block; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 34px; color: #fff;
  padding: 2px 10px; border-radius: 12px; margin: 0 2px; box-shadow: 0 4px 0 rgba(0,0,0,.15); transform: rotate(-3deg); }
.tagline { font-size: 19px; font-weight: 700; color: #7C4F27; margin-top: 6px; }
.codeboxes { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
.codebox { width: 62px; height: 76px; background: #fff; border-radius: 16px; font-family: 'Baloo 2', cursive; font-weight: 800;
  font-size: 42px; color: #4A3226; display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 -6px 0 rgba(140,90,30,.15), 0 8px 18px rgba(140,90,30,.15); border: 3px solid #FFE3B3; }
.seats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 14px; }
.seat { background: #FFFDF8; border-radius: 24px; padding: 14px 10px; text-align: center; border: 3px dashed #EBD9BE; position: relative; }
.seat.filled { border: 3px solid #FFE3B3; background: #fff; box-shadow: 0 8px 18px rgba(140,90,30,.1); }
.seat .nm { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; margin-top: 4px; }
.seat .sc { font-weight: 700; color: #9C744C; }
.bubble { position: absolute; top: -14px; left: 50%; transform: translateX(-50%) rotate(-2deg); background: #fff; border: 3px solid #FFD98E;
  color: #4A3226; font-weight: 700; font-size: 14px; padding: 6px 12px; border-radius: 16px; white-space: nowrap; z-index: 3;
  box-shadow: 0 6px 14px rgba(140,90,30,.18); }
.blobbob { display: inline-block; animation: bob 2.6s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateY(0) scale(1,1); } 30% { transform: translateY(-8px) scale(.97,1.03); } 55% { transform: translateY(0) scale(1.04,.94); } }
.chip { display: inline-block; background: #FFF1DE; color: #8A5A33; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 999px; margin: 2px; }
.chip.hot { background: #FFE1EC; color: #C2437E; }
.chip.cool { background: #E1F0FF; color: #2F6FBF; }
.games { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-top: 14px; }
.gamecard { border-radius: 24px; padding: 18px; color: #fff; cursor: pointer; text-align: left; border: none; font-family: inherit;
  box-shadow: 0 8px 0 rgba(0,0,0,.15), 0 16px 26px rgba(120,72,20,.18); transition: transform .08s; }
.gamecard:active { transform: translateY(4px); }
.gamecard h3 { margin: 0 0 4px; font-size: 24px; }
.gamecard p { margin: 0; font-weight: 700; opacity: .92; }
.stage { border-radius: 32px; padding: 26px; color: #fff; min-height: 400px; box-shadow: inset 0 -10px 0 rgba(0,0,0,.12), 0 18px 34px rgba(120,72,20,.2); position: relative; overflow: hidden; }
.stage h2 { margin: 0 0 8px; font-size: 34px; text-shadow: 0 3px 0 rgba(0,0,0,.15); }
.g-nhanh-tay { background: linear-gradient(160deg, #FFD93D, #FF8C42); }
.g-do-vui { background: linear-gradient(160deg, #6BCBFF, #4F7BE8); }
.g-doan-so { background: linear-gradient(160deg, #7BE0B8, #2FA36B); }
.g-dua-bam { background: linear-gradient(160deg, #FF9DE2, #B45FE8); }
.g-nho-mau { background: linear-gradient(160deg, #A8C0FF, #6A5FE8); }
.bigcircle { width: 250px; height: 250px; border-radius: 50%; margin: 16px auto; display: flex; align-items: center; justify-content: center;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 34px; text-align: center; padding: 20px;
  box-shadow: inset 0 -12px 0 rgba(0,0,0,.15), 0 16px 30px rgba(0,0,0,.2); }
.bigcircle.wait { background: #E84F4F; color: #fff; }
.bigcircle.go { background: #3ED97E; color: #fff; animation: pop .3s ease; }
@keyframes pop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
.optgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.opt { border: none; border-radius: 20px; padding: 18px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; cursor: pointer;
  background: rgba(255,255,255,.92); color: #4A3226; box-shadow: 0 6px 0 rgba(0,0,0,.18); text-align: left; }
.opt:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,.18); }
.opt.right { background: #3ED97E; color: #fff; }
.opt.dim { opacity: .55; }
.tbar { height: 12px; background: rgba(0,0,0,.22); border-radius: 999px; overflow: hidden; margin: 10px 0; }
.tbar i { display: block; height: 100%; background: #fff; border-radius: 999px; }
.scorebar { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.scorechip { display: flex; align-items: center; gap: 7px; background: #fff; border-radius: 999px; padding: 4px 14px 4px 5px;
  font-weight: 700; box-shadow: 0 4px 10px rgba(140,90,30,.15); font-size: 16px; }
.gapline { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; color: #8A5A33; }
.pads { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 430px; margin: 16px auto; }
.pad { height: 120px; border-radius: 26px; border: none; cursor: pointer; opacity: .45; box-shadow: inset 0 -8px 0 rgba(0,0,0,.2); }
.pad.on { opacity: 1; filter: brightness(1.25); }
.pad:active { opacity: 1; }
.racebar { background: rgba(255,255,255,.25); border-radius: 999px; height: 30px; margin: 8px 0; position: relative; overflow: hidden; }
.racebar i { display: block; height: 100%; border-radius: 999px; }
.racebar b { position: absolute; left: 12px; top: 3px; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.25); }
.tapbtn { display: block; width: min(78vw, 340px); height: min(78vw, 340px); margin: 18px auto; border-radius: 50%; border: none; cursor: pointer;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 36px; color: #fff; padding: 24px;
  box-shadow: inset 0 -14px 0 rgba(0,0,0,.18), 0 18px 34px rgba(120,72,20,.3); }
.tapbtn:active { transform: scale(.96); }
.tapbtn.wait { background: #E84F4F; }
.tapbtn.go { background: #3ED97E; animation: pop .3s ease; }
.tapbtn.race { background: linear-gradient(180deg, #FF9DE2, #B45FE8); }
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 330px; margin: 12px auto; }
.key { border: none; border-radius: 18px; padding: 16px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 24px;
  background: #fff; color: #4A3226; box-shadow: 0 5px 0 rgba(140,90,30,.3); cursor: pointer; }
.key:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(140,90,30,.3); }
.guessbox { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 44px; background: #fff; border-radius: 20px;
  padding: 8px 20px; min-height: 74px; box-shadow: inset 0 -5px 0 rgba(140,90,30,.15); }
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 14px; margin-top: 26px; }
.pod { text-align: center; width: 150px; }
.pod .col { border-radius: 18px 18px 0 0; color: #fff; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 30px;
  display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; box-shadow: inset 0 -8px 0 rgba(0,0,0,.15); }
.rows { margin-top: 12px; }
.rrow { display: flex; align-items: center; gap: 10px; background: #FFFDF8; border-radius: 16px; padding: 9px 14px; margin: 7px 0; font-weight: 700; }
.rrow .pts { margin-left: auto; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; }
.cdwrap { text-align: center; padding: 30px 0; }
.cdnum { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 150px; line-height: 1; color: #fff; text-shadow: 0 8px 0 rgba(0,0,0,.18); animation: pop .45s ease; }
.cdnum.punch { animation: cdPunch .45s ease; }
@keyframes cdPunch { 0% { transform: scale(1.6); } 55% { transform: scale(.93); } 100% { transform: scale(1); } }
.g-day-ra { background-color: #170A18; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,92,60,.34), transparent 62%), linear-gradient(rgba(255,130,90,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,130,90,.055) 1px, transparent 1px), linear-gradient(165deg, #1D0B20, #2B0A18 58%, #140A24); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(20,4,16,.45); }
.g-ne-dan { background-color: #0C0618; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(190,90,255,.3), transparent 62%), linear-gradient(rgba(170,120,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(170,120,255,.05) 1px, transparent 1px), linear-gradient(165deg, #150826, #200A33 58%, #0A0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(14,4,28,.5); }
.g-keo-co { background-color: #04140F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(45,230,190,.22), transparent 62%), linear-gradient(rgba(120,255,220,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,220,.045) 1px, transparent 1px), linear-gradient(165deg, #06231B, #052A1E 58%, #03130E); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,20,14,.5); }
.g-chia-cuop { background-color: #0D0A22; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(130,110,255,.28), transparent 62%), linear-gradient(rgba(150,140,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(150,140,255,.05) 1px, transparent 1px), linear-gradient(165deg, #171038, #120A2E 58%, #0A0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(8,4,24,.5); }
.stage.neon-stage h2 { text-shadow: 0 0 18px rgba(130,190,255,.35), 0 3px 0 rgba(0,0,0,.35); }
.aball { position: absolute; width: 26px; height: 26px; border-radius: 50%; z-index: 1;
  background: radial-gradient(circle at 35% 32%, #FFE3B3, #FF8C42 55%, #D63C14); transform: translate(-50%, -50%);
  transition: left .45s linear, top .45s linear; box-shadow: 0 0 16px rgba(255,140,50,.9), 0 0 34px rgba(255,90,30,.45), 0 4px 8px rgba(0,0,0,.35); }
.rope { position: relative; height: 40px; border-radius: 999px; margin: 16px 0;
  background: linear-gradient(90deg, #4FA8E8 0 50%, #F77FB0 50% 100%); box-shadow: inset 0 -6px 0 rgba(0,0,0,.18), 0 0 22px rgba(90,160,255,.28); }
.rope .mid { position: absolute; left: 50%; top: -6px; bottom: -6px; width: 4px; background: #fff; transform: translateX(-50%); border-radius: 2px; }
.rope .knot { position: absolute; top: 50%; width: 34px; height: 34px; border-radius: 50%; background: #FFC93D;
  border: 4px solid #fff; transform: translate(-50%, -50%); box-shadow: 0 0 18px rgba(255,201,61,.85), 0 6px 12px rgba(0,0,0,.3); transition: left .3s; }
.chatrow { display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,.22); border-radius: 14px; padding: 7px 12px; margin: 6px 0; font-weight: 700; text-align: left; }
.afield { position: relative; width: min(86vw, 540px); aspect-ratio: 1; margin: 12px auto; }
.aring { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(circle, rgba(140,200,255,.15), rgba(140,200,255,.03) 62%, rgba(255,120,80,.06));
  border: 3px solid rgba(120,220,255,.9);
  box-shadow: 0 0 26px rgba(80,200,255,.45), inset 0 0 44px rgba(80,200,255,.22), inset 0 0 120px rgba(0,0,0,.35);
  transition: width .5s linear, height .5s linear; }
.aring.danger { border-color: #FF4757; box-shadow: 0 0 34px rgba(255,71,87,.75), inset 0 0 50px rgba(255,71,87,.35); animation: ringPulse .5s ease-in-out infinite alternate; }
@keyframes ringPulse { from { filter: brightness(1); } to { filter: brightness(1.7); } }
.ablob { position: absolute; transform: translate(-50%, -50%); transition: left .45s linear, top .45s linear; text-align: center; z-index: 2; }
.ablob svg { filter: drop-shadow(0 0 9px currentColor); display: block; margin: 0 auto; }
.ablob.hitflash svg { filter: brightness(2.6) saturate(.25) drop-shadow(0 0 16px #FF4757); }
.afield.slowmo .ablob, .afield.slowmo .aball { transition-duration: 1.15s; }
.afield.pulse { animation: fieldPulse .22s ease; }
@keyframes fieldPulse { 0% { transform: scale(1); } 40% { transform: scale(1.012); } 100% { transform: scale(1); } }
.afield.shake { animation: shakeA .3s ease; }
.afield.shake-big { animation: shakeB .45s ease; }
@keyframes shakeA { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-4px,2px) rotate(-.4deg); } 55% { transform: translate(4px,-2px) rotate(.4deg); } 80% { transform: translate(-2px,-1px); } }
@keyframes shakeB { 0%,100% { transform: translate(0,0); } 18% { transform: translate(-9px,4px) rotate(-.8deg); } 42% { transform: translate(8px,-4px) rotate(.8deg); } 66% { transform: translate(-6px,-3px) rotate(-.5deg); } 85% { transform: translate(3px,2px); } }
.fx-spark { position: absolute; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; pointer-events: none; z-index: 4;
  transition: transform .6s ease-out, opacity .6s ease-out; box-shadow: 0 0 8px currentColor; }
.fx-ghost { position: absolute; transform: translate(-50%, -50%); opacity: .38; pointer-events: none; z-index: 1; transition: opacity .5s ease; }
.fx-trail { position: absolute; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%; pointer-events: none; z-index: 1;
  background: radial-gradient(circle, rgba(255,190,90,.85), rgba(255,120,40,0) 70%); animation: trailFade .3s ease-out forwards; }
@keyframes trailFade { from { opacity: .85; transform: scale(1); } to { opacity: 0; transform: scale(.35); } }
.awarn { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; pointer-events: none; z-index: 3;
  border: 3px solid #FF4757; box-shadow: 0 0 14px rgba(255,71,87,.8), inset 0 0 10px rgba(255,71,87,.5); animation: warnPulse .28s ease-in-out 2; }
@keyframes warnPulse { 0% { transform: scale(.6); opacity: .4; } 50% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(.9); opacity: .7; } }
.ko-banner { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%) scale(.4); opacity: 0; z-index: 6;
  text-align: center; pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
.ko-banner.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.ko-txt { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 86px; line-height: 1; color: #FF4757; letter-spacing: 2px;
  text-shadow: 0 0 26px rgba(255,71,87,.85), 0 5px 0 #5C0A12, 0 10px 26px rgba(0,0,0,.5); }
.ko-sub { display: inline-block; margin-top: 8px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; color: #fff;
  background: rgba(5,8,18,.6); padding: 3px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); }
.ko-big { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 66px; line-height: 1.05; color: #FF4757; letter-spacing: 2px;
  text-shadow: 0 0 24px rgba(255,71,87,.85), 0 5px 0 #5C0A12; animation: cdPunch .5s ease; }
.aname { display: inline-block; font-weight: 700; font-size: 13px; color: #fff; background: rgba(5,8,18,.55); padding: 1px 10px;
  border-radius: 999px; border: 1px solid rgba(255,255,255,.28); margin-top: 1px; }
.alives { font-size: 11px; color: #FFD7DE; letter-spacing: 1px; text-shadow: 0 1px 0 rgba(0,0,0,.35); min-height: 14px; }
.padwrap { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; }
.dpad { display: grid; grid-template-columns: repeat(3, 62px); grid-template-rows: repeat(3, 62px); gap: 4px; }
.dbtn { border: none; border-radius: 16px; background: rgba(255,255,255,.92); color: #4A3226; font-size: 24px;
  box-shadow: 0 5px 0 rgba(0,0,0,.25); touch-action: none; user-select: none; -webkit-user-select: none; }
.dbtn:active { background: #FFD98E; }
.abtns { display: flex; gap: 12px; align-items: center; }
.abtn { width: 78px; height: 78px; border-radius: 50%; border: none; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 25px;
  color: #fff; box-shadow: 0 6px 0 rgba(0,0,0,.25); touch-action: none; user-select: none; -webkit-user-select: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
.abtn span { font-size: 11px; font-family: 'Quicksand', sans-serif; font-weight: 700; }
.abtnA { background: #E84F4F; }
.bbtn { background: #4FA8E8; width: 64px; height: 64px; font-size: 20px; }
.stage .dbtn { background: linear-gradient(180deg, #26314A, #131A29); color: #DCE6FF; border: 1px solid rgba(140,180,255,.4);
  box-shadow: 0 5px 0 rgba(0,0,0,.5), 0 0 12px rgba(90,150,255,.22); }
.stage .dbtn:active { background: linear-gradient(180deg, #37507E, #1D2C47); transform: scale(.93);
  box-shadow: 0 2px 0 rgba(0,0,0,.5), 0 0 22px rgba(120,190,255,.75); }
.stage .abtn { box-shadow: 0 6px 0 rgba(0,0,0,.5); }
.stage .abtnA { background: linear-gradient(180deg, #FF6B5E, #D81F3C); box-shadow: 0 6px 0 rgba(0,0,0,.5), 0 0 22px rgba(255,60,80,.55); }
.stage .abtn:active { transform: scale(.93); }
.stage .bbtn { background: linear-gradient(180deg, #57B6FF, #1D6FD1); box-shadow: 0 6px 0 rgba(0,0,0,.5), 0 0 20px rgba(80,160,255,.5); }
input[type=text], input[type=tel] { font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 19px; color: #4A3226;
  border: 3px solid #FFE3B3; border-radius: 16px; padding: 12px 16px; background: #FFFDF8; outline: none; }
.digits { display: flex; gap: 8px; justify-content: center; }
.digits input { width: 48px; height: 60px; text-align: center; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 30px; padding: 4px; }
#toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); background: #4A3226; color: #FFF3DF; font-weight: 700;
  padding: 12px 22px; border-radius: 999px; box-shadow: 0 12px 24px rgba(0,0,0,.3); display: none; z-index: 50; max-width: 92vw; text-align: center; }
#confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 40; }
#confetti .cf { position: absolute; top: -20px; width: 10px; height: 15px; border-radius: 2px; animation-name: fall; animation-timing-function: linear; animation-fill-mode: forwards; }
@keyframes fall { to { transform: translateY(108vh) rotate(680deg); } }
.rev { opacity: 0; transform: translateY(8px); transition: opacity .3s, transform .3s; }
.rev.shown { opacity: 1; transform: none; }
.topbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.topbar .sp { flex: 1; }
.small { font-size: 14px; } .muted { color: #9C744C; font-weight: 700; }
@media (max-width: 720px) { .seats { grid-template-columns: repeat(2, 1fr); } .logo .word { font-size: 42px; } .codebox { width: 46px; height: 58px; font-size: 32px; } .cdnum { font-size: 110px; } .bigcircle { width: 200px; height: 200px; font-size: 27px; } }
</style>
</head>
<body>
<div id="app" class="wrap"></div>
<div id="confetti"></div>
<div id="toast"></div>
<script>
var COLORS = { blue: '#4FA8E8', pink: '#F77FB0', green: '#58C472', purple: '#A78BFA', orange: '#FFB35C' };
var LIGHT = { blue: '#9AD1F5', pink: '#FFB3D1', green: '#A9E8B2', purple: '#CDBFFD', orange: '#FFD29B' };
var MEM = ['#E84F4F', '#58C472', '#4FA8E8', '#FFC93D'];
var MEMNAME = ['Đỏ', 'Xanh lá', 'Xanh dương', 'Vàng'];
var LETTERS = ['A', 'B', 'C', 'D'];
var S = { role: null, code: null, token: null, seat: null, view: null, sig: '', serverOffset: 0,
  audio: null, muted: localStorage.getItem('np_muted') === '1', lastCd: -1, lastTickSec: -1,
  fxReveal: '', fxRound: '', fxConfetti: '', guess: '', blobN: 0, fxP: null, _nb: null, _koT: 0, _smT: 0 };
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;'); }
function fmt(n) { var s = String(Math.round(Math.abs(n))); var out = ''; while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); } return (n < 0 ? '-' : '') + s + out; }
function playerOf(v, seat) { for (var i = 0; i < v.players.length; i++) if (v.players[i].seat === seat) return v.players[i]; return null; }
function toast(msg) { var t = el('toast'); t.textContent = msg; t.style.display = 'block'; setTimeout(function () { t.style.display = 'none'; }, 3200); }
function blobSVG(color, mood, size) {
  S.blobN += 1;
  var gid = 'bg' + S.blobN;
  var c = COLORS[color] || COLORS.blue; var l = LIGHT[color] || LIGHT.blue;
  var eyes = '', mouth = '';
  if (mood === 'reo') {
    eyes = '<path d="M28 50 Q35 41 42 50" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M58 50 Q65 41 72 50" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    mouth = '<ellipse cx="50" cy="65" rx="9" ry="11" fill="#4A3226"/><ellipse cx="50" cy="69" rx="5.5" ry="4.5" fill="#F77FB0"/>';
  } else if (mood === 'ngacnhien') {
    eyes = '<circle cx="35" cy="48" r="6.5" fill="#4A3226"/><circle cx="65" cy="48" r="6.5" fill="#4A3226"/>';
    mouth = '<circle cx="50" cy="67" r="5.5" fill="#4A3226"/>';
  } else if (mood === 'buon') {
    eyes = '<circle cx="35" cy="50" r="5" fill="#4A3226"/><circle cx="65" cy="50" r="5" fill="#4A3226"/><path d="M27 40 L43 45 M73 40 L57 45" stroke="#4A3226" stroke-width="4" stroke-linecap="round"/>';
    mouth = '<path d="M36 72 Q50 61 64 72" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
  } else if (mood === 'ngu') {
    eyes = '<path d="M28 49 Q35 55 42 49" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M58 49 Q65 55 72 49" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    mouth = '<path d="M44 66 Q50 69 56 66" stroke="#4A3226" stroke-width="4" fill="none" stroke-linecap="round"/>';
    mouth += '<text x="72" y="26" font-size="17" font-weight="bold" fill="#8A5A33">Z</text><text x="82" y="16" font-size="12" font-weight="bold" fill="#8A5A33">z</text>';
  } else {
    eyes = '<circle cx="35" cy="48" r="5" fill="#4A3226"/><circle cx="65" cy="48" r="5" fill="#4A3226"/>';
    mouth = '<path d="M34 61 Q50 75 66 61" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">'
    + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + l + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>'
    + '<path d="M50 4 C74 4 96 26 96 52 C96 79 75 96 50 96 C25 96 4 79 4 52 C4 26 26 4 50 4 Z" fill="url(#' + gid + ')"/>'
    + '<ellipse cx="34" cy="27" rx="16" ry="9" fill="#ffffff" opacity="0.38" transform="rotate(-18 34 27)"/>'
    + eyes + mouth + '</svg>';
}
function crownSVG(size) {
  return '<svg width="' + size + '" height="' + Math.round(size * 0.62) + '" viewBox="0 0 100 62"><path d="M6 56 L13 16 L35 36 L50 8 L65 36 L87 16 L94 56 Z" fill="#FFC93D" stroke="#E0A92E" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="44" r="5" fill="#F77FB0"/></svg>';
}
var DARK = { blue: '#1D5C8F', pink: '#B23A72', green: '#2E7D46', purple: '#5F43B8', orange: '#C77414' };
function orbSVG(color, size, ko) {
  S.blobN += 1;
  var gid = 'og' + S.blobN;
  var c = COLORS[color] || COLORS.blue; var l = LIGHT[color] || LIGHT.blue; var d = DARK[color] || DARK.blue;
  var visor;
  if (ko) {
    visor = '<path d="M29 41 L44 56 M44 41 L29 56 M56 41 L71 56 M71 41 L56 56" stroke="#0B1020" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
      + '<path d="M50 63 L45 75 L53 81" stroke="rgba(11,16,32,.5)" stroke-width="3" fill="none" stroke-linecap="round"/>';
  } else {
    visor = '<path d="M15 39 L85 39 L78 58 Q50 67 22 58 Z" fill="#0B1020"/>'
      + '<path d="M15 39 L85 39 L82 48 L18 48 Z" fill="#1B2742"/>'
      + '<path d="M27 52.5 L50 58 L73 52.5" stroke="' + l + '" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="50" cy="44" r="2.4" fill="' + l + '"/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">'
    + '<defs><radialGradient id="' + gid + '" cx="0.35" cy="0.3" r="0.95"><stop offset="0" stop-color="' + l + '"/><stop offset="0.45" stop-color="' + c + '"/><stop offset="1" stop-color="' + d + '"/></radialGradient></defs>'
    + '<circle cx="50" cy="50" r="46" fill="url(#' + gid + ')"/>'
    + '<path d="M19 65 Q50 87 81 65" stroke="' + l + '" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>'
    + visor
    + '<ellipse cx="33" cy="23" rx="14" ry="7.5" fill="#ffffff" opacity="0.55" transform="rotate(-20 33 23)"/>'
    + '</svg>';
}
function ac() {
  if (!S.audio) { try { S.audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { S.audio = null; } }
  if (S.audio && S.audio.state === 'suspended') S.audio.resume();
  return S.audio;
}
function beep(freq, dur, type, vol, delay) {
  if (S.muted) return;
  var ctx = ac(); if (!ctx) return;
  var t0 = ctx.currentTime + (delay || 0);
  var o = ctx.createOscillator(); var gn = ctx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  gn.gain.setValueAtTime(vol || 0.14, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function sfxTap() { beep(620, 0.06, 'triangle', 0.12); }
function sfxCorrect() { beep(660, 0.09, 'sine', 0.16); beep(880, 0.14, 'sine', 0.16, 0.08); }
function sfxWrong() { beep(200, 0.16, 'sawtooth', 0.08); beep(140, 0.2, 'sawtooth', 0.08, 0.1); }
function sfxWin() { var n = [523, 659, 784, 1046]; for (var i = 0; i < n.length; i++) beep(n[i], 0.16, 'triangle', 0.16, i * 0.1); }
function sfxCount(last) { beep(last ? 990 : 660, last ? 0.22 : 0.09, 'square', 0.1); }
function noiseBuf() {
  var ctx = ac(); if (!ctx) return null;
  if (S._nb) return S._nb;
  var len = Math.floor(ctx.sampleRate * 0.5);
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  S._nb = buf; return buf;
}
function noiseBurst(dur, f0, f1, vol) {
  if (S.muted) return;
  var ctx = ac(); if (!ctx) return;
  var buf = noiseBuf(); if (!buf) return;
  var t0 = ctx.currentTime;
  var src = ctx.createBufferSource(); src.buffer = buf;
  var fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.1;
  fl.frequency.setValueAtTime(f0, t0);
  fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  var gn = ctx.createGain();
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(fl); fl.connect(gn); gn.connect(ctx.destination);
  src.start(t0); src.stop(t0 + dur + 0.05);
}
function toneDrop(f0, f1, dur, vol) {
  if (S.muted) return;
  var ctx = ac(); if (!ctx) return;
  var t0 = ctx.currentTime;
  var o = ctx.createOscillator(); var gn = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function sfxThud() { toneDrop(120, 42, 0.16, 0.32); noiseBurst(0.08, 900, 300, 0.1); }
function sfxBoom() { toneDrop(90, 30, 0.5, 0.42); noiseBurst(0.42, 500, 90, 0.22); }
function sfxWhoosh() { noiseBurst(0.22, 2400, 500, 0.13); }
function sfxDash() { noiseBurst(0.16, 900, 2600, 0.09); }
function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
function confetti(waves) {
  var box = el('confetti'); if (!box) return;
  var colors = ['#F77FB0', '#4FA8E8', '#58C472', '#A78BFA', '#FFB35C', '#FFC93D'];
  for (var w = 0; w < (waves || 1); w++) {
    (function (delayMs) {
      setTimeout(function () {
        for (var i = 0; i < 34; i++) {
          var s = document.createElement('span');
          s.className = 'cf';
          s.style.left = (Math.random() * 100) + 'vw';
          s.style.background = colors[i % colors.length];
          s.style.animationDuration = (2.1 + Math.random() * 1.7) + 's';
          s.style.animationDelay = (Math.random() * 0.35) + 's';
          if (i % 3 === 0) s.style.borderRadius = '50%';
          if (i % 4 === 0) { s.style.width = '14px'; s.style.height = '8px'; }
          box.appendChild(s);
          (function (node) { setTimeout(function () { node.remove(); }, 4800); })(s);
        }
      }, delayMs);
    })(w * 450);
  }
}
function api(path, body, cb) {
  var opt = { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' } };
  if (body) opt.body = JSON.stringify(body);
  // Network-level failures (offline, DNS, a non-JSON reply) are flagged
  // with net:true so poll() can tell "no answer at all" apart from a real
  // JSON error the server sent on purpose.
  fetch(path, opt).then(function (r) { return r.json(); }).then(cb).catch(function () { cb({ ok: false, error: 'Mất kết nối, thử lại nhé.', net: true }); });
}
function stateUrl() { return '/api/rooms/' + S.code + '/state?role=' + S.role + '&token=' + encodeURIComponent(S.token); }
function poll() {
  if (!S.code) return;
  api(stateUrl(), null, function (v) {
    if (v && v.ok) { S.failN = 0; S.failSince = 0; S.view = v; S.serverOffset = v.serverNow - Date.now(); render(); return; }
    if (v && v.net) {
      // No answer at all (offline / DNS / non-JSON reply): the room may
      // well still exist, so keep waiting — but never spin on the
      // connecting screen forever. Count only failures spaced >=600ms
      // apart (the 220ms fast poll during games must not be able to fake
      // a long outage) and give up after 5 counted failures spanning
      // at least ~3 seconds of continuous silence.
      var t = Date.now();
      if (!S.failSince) S.failSince = t;
      if (t - (S.failLast || 0) >= 600) { S.failN = (S.failN || 0) + 1; S.failLast = t; }
      if (S.failN >= 5 && t - S.failSince >= 3000) {
        S.failN = 0; S.failSince = 0;
        clearSession();
        toast('Mất kết nối với phòng, về trang chính nhé.');
      }
      return;
    }
    // The server answered with a JSON error: any silence streak is over.
    S.failN = 0; S.failSince = 0;
    if (v && v.error && v.error.indexOf('Không thấy phòng này') >= 0) {
      // The room is gone (expired after its TTL or older than the current
      // storage): this saved session can never work again. Leave for the
      // home screen instead of polling a dead room forever.
      clearSession();
      toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.');
    } else if (v && v.error && v.error.indexOf('không hợp lệ') >= 0) clearSession();
  });
}
function act(body, cb) {
  body.role = S.role; body.token = S.token;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok) { S.view = v; S.serverOffset = v.serverNow - Date.now(); S.sig = ''; render(); }
    else if (v && v.error && v.error.indexOf('Không thấy phòng này') >= 0) { clearSession(); toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.'); }
    else if (v && v.error && v.error.indexOf('không hợp lệ') >= 0) clearSession();
    else if (v && v.error) toast(v.error);
    if (cb) cb(v);
  });
}
function serverNow() { return Date.now() + S.serverOffset; }

var DUR = { 'do-vui': 15000, 'doan-so': 20000, 'dua-bam': 10000, 'nho-mau': 12000, 'keo-co': 20000 };
var GCOLORS = {
  'nhanh-tay': 'linear-gradient(160deg,#FFD93D,#FF8C42)', 'do-vui': 'linear-gradient(160deg,#6BCBFF,#4F7BE8)',
  'doan-so': 'linear-gradient(160deg,#7BE0B8,#2FA36B)', 'dua-bam': 'linear-gradient(160deg,#FF9DE2,#B45FE8)',
  'nho-mau': 'linear-gradient(160deg,#A8C0FF,#6A5FE8)',
  'day-ra': 'linear-gradient(160deg,#4A0E24,#A4133C)',
  'ne-dan': 'linear-gradient(160deg,#2A0A54,#6D28A8)', 'keo-co': 'linear-gradient(160deg,#064A38,#0B7A55)',
  'chia-cuop': 'linear-gradient(160deg,#241457,#4C2FA8)'
};
function noX2(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co'; }
function isActionGame(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'chia-cuop'; }
function topbarHTML(v, isHost) {
  var h = '<div class="topbar"><span class="baloo" style="font-size:24px">Nảy Party</span>';
  h += '<span class="chip cool">Phòng ' + esc(v.code) + '</span>';
  h += '<span class="sp"></span>';
  h += '<button class="btn small ghost" data-cmd="sound">' + (S.muted ? 'Bật tiếng' : 'Tắt tiếng') + '</button>';
  if (isHost) h += '<button class="btn small ghost" data-cmd="fs">Toàn màn hình</button>';
  h += '<button class="btn small ghost" data-cmd="reload">Đổi phòng</button></div>';
  return h;
}
function scoreStrip(v) {
  var h = '<div class="scorebar">';
  for (var i = 0; i < v.standings.length; i++) {
    var p = playerOf(v, v.standings[i]);
    if (!p) continue;
    h += '<span class="scorechip">' + blobSVG(p.color, p.mood, 30) + ' ' + esc(p.name) + ' · <b>' + fmt(p.liveScore) + '</b></span>';
  }
  h += '</div>';
  if (v.gap && v.players.length > 1) {
    var top = playerOf(v, v.gap.topSeat); var second = playerOf(v, v.gap.secondSeat);
    if (top && second) {
      h += '<div class="gapline">' + (v.gap.diff > 0
        ? esc(top.name) + ' đang dẫn trước ' + esc(second.name) + ' ' + fmt(v.gap.diff) + ' điểm'
        : esc(top.name) + ' và ' + esc(second.name) + ' đang hoà điểm dẫn đầu!') + '</div>';
    }
  }
  return h;
}
function seatCard(v, seat) {
  var p = playerOf(v, seat);
  if (!p) {
    var h = '<div class="seat"><div style="opacity:.45">' + blobSVG('orange', 'ngu', 84) + '</div>';
    h += '<div class="nm muted">P' + seat + ' · Trống</div>';
    if (seat >= 2 && (v.phase === 'lobby' || v.phase === 'choosing')) h += '<button class="btn small orange" data-cmd="addBot" data-seat="' + seat + '">+ Máy</button>';
    return h + '</div>';
  }
  var h2 = '<div class="seat filled">';
  if (v.bubble && v.bubble.seat === seat) h2 += '<div class="bubble">' + esc(v.bubble.text) + '</div>';
  h2 += '<span class="blobbob">' + blobSVG(p.color, p.mood, 84) + '</span>';
  h2 += '<div class="nm">' + esc(p.name) + '</div>';
  h2 += '<div class="sc">P' + seat + ' · ' + fmt(p.score) + ' điểm</div>';
  if (p.type === 'bot') {
    h2 += '<div><span class="chip hot">MÁY · ' + esc(p.diffLabel) + '</span></div>';
    if (v.phase === 'lobby' || v.phase === 'choosing') {
      h2 += '<div style="margin-top:6px"><button class="btn small ghost" data-cmd="cycleBot" data-seat="' + seat + '">Đổi mức máy</button> ';
      h2 += '<button class="btn small ghost" data-cmd="removeBot" data-seat="' + seat + '">Xoá máy</button></div>';
    }
  } else {
    h2 += '<div><span class="chip cool">NGƯỜI CHƠI</span></div>';
  }
  return h2 + '</div>';
}
function hostHTML(v) {
  var h = topbarHTML(v, true);
  if (v.phase === 'lobby' || v.phase === 'choosing') {
    h += '<div class="card"><div class="logo"><span class="word">nảy</span>' + blobSVG('blue', 'reo', 54) + blobSVG('pink', 'cuoi', 54) + '<span class="party"><span style="background:#4FA8E8">P</span><span style="background:#F77FB0">A</span><span style="background:#FFB35C">R</span><span style="background:#58C472">T</span><span style="background:#A78BFA">Y</span></span></div>';
    h += '<p class="center tagline">Mở Nảy Party trên điện thoại, nhập mã phòng:</p>';
    h += '<div class="codeboxes">';
    for (var i = 0; i < v.code.length; i++) h += '<div class="codebox">' + esc(v.code[i]) + '</div>';
    h += '</div>';
    h += '<div class="seats">';
    for (var s = 1; s <= 4; s++) h += seatCard(v, s);
    h += '</div>';
    var humans = 0; for (var j = 0; j < v.players.length; j++) if (v.players[j].type === 'human') humans++;
    h += '<p class="center" style="margin-top:14px">';
    if (humans < 1) h += '<span class="chip hot">Cần ít nhất 1 người chơi bằng điện thoại</span>';
    else if (v.players.length < 2) h += '<span class="chip hot">Thêm Máy hoặc rủ thêm bạn để đủ 2 người</span>';
    else h += '<span class="chip cool">Sẵn sàng! Chọn một game bên dưới để bắt đầu</span>';
    h += '</p></div>';
    h += '<div class="games">';
    for (var k = 0; k < v.games.length; k++) {
      var gm = v.games[k];
      h += '<button class="gamecard" style="background:' + GCOLORS[gm.id] + '" data-cmd="start" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">' + (gm.rounds > 1 ? gm.rounds + ' vòng · Vòng cuối ×2 điểm' : '1 trận sống còn · 300/200/100/50') + '</p></button>';
    }
    h += '</div>';
    return h;
  }
  if (v.phase === 'playing' && v.game) {
    h += scoreStrip(v);
    h += '<div class="stage g-' + v.game.id + (isActionGame(v.game.id) ? ' neon-stage' : '') + '">' + hostStage(v) + '</div>';
    return h;
  }
  if (v.phase === 'results') return h + resultsHTML(v, true);
  if (v.phase === 'podium') return h + podiumHTML(v, true);
  if (v.phase === 'final') return h + finalHTML(v, true);
  return h + '<div class="card center"><h2>Đang tải…</h2></div>';
}
function countdownHTML(g) {
  return '<div class="cdwrap"><div class="baloo" style="font-size:30px">Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · VÒNG QUYẾT ĐỊNH ×2' : '') + '</div>'
    + '<div class="cdnum" id="cdnum">3</div><div class="baloo" style="font-size:24px">Chuẩn bị…</div></div>';
}
function hostStage(v) {
  var g = v.game;
  if (g.phase === 'countdown') return countdownHTML(g);
  var h = '<h2>' + esc(g.name) + ' · Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · ×2' : '') + '</h2>';
  var t = serverNow();
  if (g.id === 'nhanh-tay') {
    if (g.phase === 'wait') h += '<div class="bigcircle wait">Đợi màu xanh…</div>';
    else if (g.phase === 'go') h += '<div class="bigcircle go">BẤM!</div>';
    if (g.phase === 'roundEnd' && g.lastRound) {
      h += '<div class="rows">';
      for (var i = 0; i < g.lastRound.entries.length; i++) {
        var e = g.lastRound.entries[i]; var p = playerOf(v, e.seat);
        var mid = e.status === 'tapped' ? e.reactionMs + ' ms' + (e.gapMs > 0 ? ' (+' + e.gapMs + ' ms)' : ' · NHANH NHẤT!') : (e.status === 'early' ? 'Bấm sớm!' : 'Không bấm');
        h += '<div class="rrow">' + blobSVG(p.color, p.mood, 34) + ' ' + esc(p.name) + '<span class="muted">' + mid + '</span><span class="pts">' + (e.points > 0 ? '+' : '') + fmt(e.points) + '</span></div>';
      }
      h += '</div>';
    } else {
      h += '<div class="scorebar">';
      for (var j = 0; j < v.players.length; j++) { var pp = v.players[j]; var st = g.status ? g.status[pp.seat] : 'waiting'; h += '<span class="scorechip">' + blobSVG(pp.color, pp.mood, 28) + ' ' + esc(pp.name) + ' · ' + (st === 'tapped' ? 'đã bấm!' : st === 'early' ? 'bấm sớm!' : 'đang đợi…') + '</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'do-vui') {
    if (g.phase === 'question' || g.phase === 'reveal') {
      h += '<div class="baloo" style="font-size:30px">' + esc(g.question) + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['do-vui']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="optgrid">';
      for (var a = 0; a < 4; a++) {
        var cls = 'opt';
        if (g.phase === 'reveal' && g.reveal) cls += (a === g.reveal.correct ? ' right' : ' dim');
        h += '<div class="' + cls + '">' + LETTERS[a] + '. ' + esc(g.options[a]) + '</div>';
      }
      h += '</div>';
      if (g.phase === 'question') {
        h += '<div class="scorebar">';
        for (var b = 0; b < v.players.length; b++) { var q = v.players[b]; h += '<span class="scorechip">' + blobSVG(q.color, q.mood, 28) + ' ' + esc(q.name) + ' ' + (g.answered && g.answered[q.seat] ? '✓' : '…') + '</span>'; }
        h += '</div>';
      } else if (g.reveal) {
        h += '<div class="rows">';
        for (var c = 0; c < v.standings.length; c++) { var rp = playerOf(v, v.standings[c]); var pts = g.reveal.points[rp.seat] || 0; var stk = g.reveal.streaks[rp.seat] || 0; h += '<div class="rrow">' + blobSVG(rp.color, rp.mood, 34) + ' ' + esc(rp.name) + (stk >= 2 ? '<span class="chip hot">Chuỗi đúng ×' + stk + '</span>' : '') + '<span class="pts">' + (pts > 0 ? '+' : '') + fmt(pts) + '</span></div>'; }
        h += '</div>';
      }
    }
  } else if (g.id === 'doan-so') {
    if (g.phase === 'guess') {
      h += '<div class="baloo" style="font-size:30px">' + esc(g.question) + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['doan-so']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var d = 0; d < v.players.length; d++) { var gp = v.players[d]; h += '<span class="scorechip">' + blobSVG(gp.color, gp.mood, 28) + ' ' + esc(gp.name) + ' ' + (g.guessed && g.guessed[gp.seat] ? 'đã đoán ✓' : 'đang nghĩ…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      h += '<div class="baloo" style="font-size:32px">Đáp án đúng: ' + fmt(g.reveal.answer) + ' ' + esc(g.unit) + '</div>';
      h += '<div class="rows">';
      for (var e2 = 0; e2 < g.reveal.entries.length; e2++) {
        var en = g.reveal.entries[e2]; var ep = playerOf(v, en.seat);
        var dv = en.value === null ? '' : String(en.value);
        var dt = en.value === null ? 'không đoán' : 'lệch ' + fmt(en.diff) + ' ' + esc(g.unit);
        h += '<div class="rrow rev" data-reveal="' + en.revealAt + '" data-value="' + dv + '" data-difftext="' + esc(dt) + '">' + blobSVG(ep.color, ep.mood, 34) + ' ' + esc(ep.name) + ' <span class="gv">…</span> <span class="gd muted"></span><span class="pts">' + (en.points > 0 ? '+' : '') + fmt(en.points) + '</span></div>';
      }
      h += '</div>';
    }
  } else if (g.id === 'dua-bam') {
    if (g.phase === 'race') {
      h += '<div class="baloo" style="font-size:28px">BẤM! BẤM! BẤM!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['dua-bam']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      for (var r = 0; r < v.standings.length; r++) { var rb = playerOf(v, v.standings[r]); h += '<div class="racebar"><i data-seat="' + rb.seat + '" style="background:' + COLORS[rb.color] + ';width:0%"></i><b id="rcl-' + rb.seat + '">' + esc(rb.name) + ' · 0</b></div>'; }
    } else if (g.phase === 'pause' && g.lastRound) {
      h += '<div class="rows">';
      for (var r2 = 0; r2 < g.lastRound.entries.length; r2++) { var re = g.lastRound.entries[r2]; var rp2 = playerOf(v, re.seat); h += '<div class="rrow">' + blobSVG(rp2.color, rp2.mood, 34) + ' ' + esc(rp2.name) + '<span class="muted">' + re.taps + ' lần bấm</span><span class="pts">+' + fmt(re.points) + '</span></div>'; }
      h += '</div>';
    }
  } else if (g.id === 'nho-mau') {
    if (g.phase === 'show') {
      h += '<div class="baloo" style="font-size:28px">Nhìn kỹ dãy màu! Dãy dài ' + g.len + ' màu</div>';
      h += '<div class="pads">';
      for (var mI = 0; mI < 4; mI++) h += '<div class="pad" id="pad' + mI + '" style="background:' + MEM[mI] + '"></div>';
      h += '</div>';
    } else if (g.phase === 'input') {
      h += '<div class="baloo" style="font-size:28px">Bấm lại dãy màu trên điện thoại!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['nho-mau']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var m2 = 0; m2 < v.players.length; m2++) { var mp = v.players[m2]; var stt = g.statuses ? g.statuses[mp.seat] : 'playing'; h += '<span class="scorechip">' + blobSVG(mp.color, mp.mood, 28) + ' ' + esc(mp.name) + ' · ' + (stt === 'done' ? 'xong!' : stt === 'failed' ? 'sai rồi' : 'đang bấm…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'pause' && g.lastRound) {
      h += '<div class="rows">';
      for (var m3 = 0; m3 < v.standings.length; m3++) { var mp3 = playerOf(v, v.standings[m3]); var mpts = g.lastRound.points[mp3.seat] || 0; h += '<div class="rrow">' + blobSVG(mp3.color, mp3.mood, 34) + ' ' + esc(mp3.name) + '<span class="muted">dãy ' + g.lastRound.len + ' màu</span><span class="pts">' + (mpts > 0 ? '+' : '') + fmt(mpts) + '</span></div>'; }
      h += '</div>';
    }
  } else if (g.id === 'day-ra') {
    if (g.phase === 'arena') {
      h += '<div class="baloo" style="font-size:25px">Đẩy hết đối thủ ra khỏi vòng tròn! Sàn đang thu hẹp dần…</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      for (var aI = 0; aI < v.players.length; aI++) { var ap = v.players[aI]; h += '<div class="ablob" id="ablob-' + ap.seat + '" style="left:50%;top:50%;color:' + COLORS[ap.color] + '">' + orbSVG(ap.color, 46) + '<div class="aname">' + esc(ap.name) + '</div><div class="alives" id="alives-' + ap.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Rơi khỏi vòng là mất 1 mạng · Hết mạng là bị loại · Người trụ lại cuối cùng thắng!</p>';
    }
  } else if (g.id === 'ne-dan') {
    if (g.phase === 'dodge') {
      h += '<div class="baloo" style="font-size:25px">Né hết đạn pháo! Trúng là mất 1 mạng…</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      for (var nI = 0; nI < (g.balls ? g.balls.length : 0); nI++) h += '<div class="aball" id="nball-' + nI + '"></div>';
      for (var dI = 0; dI < v.players.length; dI++) { var dp = v.players[dI]; h += '<div class="ablob" id="ablob-' + dp.seat + '" style="left:50%;top:50%;color:' + COLORS[dp.color] + '">' + orbSVG(dp.color, 46) + '<div class="aname">' + esc(dp.name) + '</div><div class="alives" id="alives-' + dp.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Đạn bay càng lúc càng dày · Hết mạng là bị loại · Người sống sót cuối cùng thắng!</p>';
    }
  } else if (g.id === 'keo-co') {
    if (g.phase === 'pull') {
      h += '<div class="baloo" style="font-size:25px">Đội A (ghế lẻ) ⟵ KÉO! ⟶ Đội B (ghế chẵn)</div>';
      var kpct = Math.max(3, Math.min(97, 50 + (g.knot / 84) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" style="left:' + kpct + '%"></div></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var tI = 0; tI < v.players.length; tI++) { var tp = v.players[tI]; var tm = tp.seat % 2 === 1 ? 'A' : 'B'; h += '<span class="scorechip">' + blobSVG(tp.color, tp.mood, 28) + ' ' + esc(tp.name) + ' · Đội ' + tm + ' · ' + (g.presses ? (g.presses[tp.seat] || 0) : 0) + ' lần kéo</span>'; }
      h += '</div>';
      h += '<p class="center">Kéo nút thắt vàng chạm mép phía đội mình là thắng ngay!</p>';
    }
  } else if (g.id === 'chia-cuop') {
    var pa = g.pair ? playerOf(v, g.pair[0]) : null; var pb = g.pair ? playerOf(v, g.pair[1]) : null;
    if (pa && pb) {
      h += '<div class="center"><span class="blobbob">' + orbSVG(pa.color, 74) + '</span> <span class="baloo" style="font-size:26px"> ' + esc(pa.name) + ' ⚔ ' + esc(pb.name) + ' </span> <span class="blobbob">' + orbSVG(pb.color, 74) + '</span></div>';
      h += '<div class="center baloo" style="font-size:23px">Nồi điểm vòng này: ' + fmt(g.pot || 400) + ' điểm' + (g.finalRound ? ' (VÒNG CUỐI ×2!)' : '') + '</div>';
    }
    if (g.phase === 'talk') {
      h += '<div class="baloo" style="font-size:24px">Đang thương lượng… hai người cứ thuyết phục nhau đi!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.chat) for (var cI2 = 0; cI2 < g.chat.length; cI2++) { var cp = playerOf(v, g.chat[cI2].seat); h += '<div class="chatrow">' + blobSVG(cp ? cp.color : 'blue', 'cuoi', 26) + ' <b>' + esc(cp ? cp.name : '') + ':</b> ' + esc(g.chat[cI2].text) + '</div>'; }
      h += '<p class="center">Hết giờ thương lượng sẽ tới lúc chọn bí mật: CHIA hay CƯỚP…</p>';
    } else if (g.phase === 'choose') {
      h += '<div class="baloo" style="font-size:26px">Đang chọn bí mật… không ai biết ai chọn gì!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 15000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      if (g.pair) for (var sI = 0; sI < g.pair.length; sI++) { var sp = playerOf(v, g.pair[sI]); h += '<span class="scorechip">' + blobSVG(sp.color, sp.mood, 28) + ' ' + esc(sp.name) + ' ' + (g.chosen && g.chosen[sp.seat] ? 'đã khoá ✓' : 'đang nghĩ…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      h += '<div class="baloo" style="font-size:27px">Công bố!</div><div class="rows">';
      for (var vI = 0; vI < g.reveal.entries.length; vI++) {
        var ve = g.reveal.entries[vI]; var vp = playerOf(v, ve.seat);
        h += '<div class="rrow rev" data-reveal="' + ve.revealAt + '">' + orbSVG(vp.color, 34) + ' ' + esc(vp.name) + '<span class="chip ' + (ve.choice === 'cuop' ? 'hot' : 'cool') + '">' + (ve.choice === 'cuop' ? 'CƯỚP!' : 'CHIA') + '</span><span class="pts">+' + fmt(ve.points) + '</span></div>';
      }
      h += '</div>';
    }
  }
  return h;
}
function resultsHTML(v, isHost) {
  var lg = v.lastGame;
  var h = '<div class="card center"><h2 style="margin:0">Kết quả game: ' + esc(lg.name) + '</h2></div>';
  h += scoreStrip(v);
  var seats = Object.keys(lg.points).map(function (k) { return +k; }).sort(function (a, b) { return (lg.points[b] - lg.points[a]) || (a - b); });
  h += '<div class="card rows" style="margin-top:10px">';
  for (var i = 0; i < seats.length; i++) { var p = playerOf(v, seats[i]); h += '<div class="rrow">' + blobSVG(p.color, p.mood, 38) + ' ' + esc(p.name) + '<span class="pts">' + fmt(lg.points[seats[i]]) + ' điểm game này</span></div>'; }
  h += '</div>';
  if (isHost) h += '<p class="center" style="margin-top:16px"><button class="btn green" data-cmd="replay">Chơi lại ngay</button> <button class="btn purple" data-cmd="continue">Bục vinh quang</button></p>';
  else h += '<p class="center muted">Đợi màn hình lớn chọn tiếp…</p>';
  return h;
}
function podiumHTML(v, isHost) {
  var h = '<div class="card center"><h2 style="margin:0">Bục vinh quang</h2>' + scoreStrip(v);
  var top = v.standings.slice(0, 3);
  var order = top.length >= 2 ? [top[1], top[0], top[2]] : top;
  var heights = {}; if (top[0]) heights[top[0]] = 150; if (top[1]) heights[top[1]] = 105; if (top[2]) heights[top[2]] = 78;
  h += '<div class="podium">';
  for (var i = 0; i < order.length; i++) {
    if (!order[i]) continue;
    var p = playerOf(v, order[i]); var rank = v.standings.indexOf(order[i]) + 1;
    h += '<div class="pod">' + (rank === 1 ? crownSVG(64) + '<br>' : '') + '<span class="blobbob">' + blobSVG(p.color, 'reo', 86) + '</span><div class="baloo" style="font-size:19px">' + esc(p.name) + '</div><div class="col" style="height:' + heights[order[i]] + 'px;background:' + COLORS[p.color] + '">' + rank + '</div><div class="muted">' + fmt(p.score) + ' điểm</div></div>';
  }
  h += '</div>';
  h += '<div class="rows">';
  for (var j = 0; j < v.standings.length; j++) { var q = playerOf(v, v.standings[j]); h += '<div class="rrow"><b>' + (j + 1) + '</b>' + blobSVG(q.color, q.mood, 32) + ' ' + esc(q.name) + '<span class="pts">' + fmt(q.score) + '</span></div>'; }
  h += '</div>';
  if (isHost) h += '<p class="center" style="margin-top:14px"><button class="btn green" data-cmd="replay">Chơi lại game này</button> <button class="btn blue" data-cmd="toChoosing">Chọn game khác</button> <button class="btn pink" data-cmd="finish">Kết thúc</button></p>';
  else h += '<p class="center muted">Đợi màn hình lớn…</p>';
  return h + '</div>';
}
function finalHTML(v, isHost) {
  var champ = playerOf(v, v.standings[0]);
  var h = '<div class="card center"><div>' + crownSVG(90) + '</div><span class="blobbob">' + blobSVG(champ.color, 'reo', 130) + '</span>';
  h += '<h2 style="margin:6px 0">NHÀ VÔ ĐỊCH: ' + esc(champ.name) + '</h2><div class="baloo" style="font-size:24px">' + fmt(champ.score) + ' điểm</div>';
  h += '<div class="rows" style="text-align:left">';
  for (var i = 0; i < v.standings.length; i++) { var p = playerOf(v, v.standings[i]); h += '<div class="rrow"><b>' + (i + 1) + '</b>' + blobSVG(p.color, p.mood, 32) + ' ' + esc(p.name) + '<span class="pts">' + fmt(p.score) + '</span></div>'; }
  h += '</div>';
  if (isHost) h += '<p style="margin-top:14px"><button class="btn green" data-cmd="playAgain">Chơi lại từ đầu</button></p>';
  return h + '</div>';
}
function viewSig(v) {
  if (!v) return 'none';
  var g = v.game;
  var gp = null;
  if (g) {
    if (g.id === 'day-ra') {
      var ak = '';
      if (g.blobs) for (var bs in g.blobs) ak += bs + (g.blobs[bs].alive ? '1' : '0');
      gp = [g.id, g.phase, ak, g.lastRound];
    } else if (g.id === 'ne-dan') {
      var ak2 = '';
      if (g.blobs) for (var bs2 in g.blobs) ak2 += bs2 + (g.blobs[bs2].alive ? '1' : '0') + g.blobs[bs2].lives;
      gp = [g.id, g.phase, ak2, g.balls ? g.balls.length : 0, g.lastRound];
    } else if (g.id === 'keo-co') {
      gp = [g.id, g.phase, g.knot, g.presses, g.lastRound];
    } else if (g.id === 'chia-cuop') {
      gp = [g.id, g.phase, g.round, g.points, g.chosen, g.chat, g.reveal, g.mineChosen, g.lastRound];
    } else {
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, g.answered, g.guessed, g.statuses, g.mine];
    }
  }
  return JSON.stringify([v.phase, v.players, v.bubble, v.standings, v.gap, gp, v.lastGame]);
}
function render() {
  var app = el('app');
  if (!S.role) { if (S.sig !== 'home') { S.sig = 'home'; app.innerHTML = homeHTML(); } return; }
  var v = S.view;
  if (!v) { app.innerHTML = '<div class="card center"><h2>Đang nối phòng…</h2><p class="muted">Nếu chờ lâu vẫn không vào được, phòng có thể đã đóng hoặc hết hạn.</p><p><button class="btn ghost" data-cmd="reload">Về trang chính</button></p></div>'; return; }
  var sig = viewSig(v);
  if (sig === S.sig) return;
  S.sig = sig;
  app.innerHTML = S.role === 'host' ? hostHTML(v) : playerHTML(v);
  afterRender(v);
}
function checkRoundWin(v) {
  var lr = v.game.lastRound; if (!lr) return;
  var key = v.game.id + ':' + lr.round + ':' + v.game.phase;
  if (S.fxRound === key) return;
  S.fxRound = key;
  var myPts = null; var max = -1; var k;
  if (lr.points) { for (k in lr.points) { if (lr.points[k] > max) max = lr.points[k]; } myPts = lr.points[S.seat]; }
  else if (lr.entries) { for (var i = 0; i < lr.entries.length; i++) { if (lr.entries[i].points > max) max = lr.entries[i].points; if (lr.entries[i].seat === S.seat) myPts = lr.entries[i].points; } }
  if (myPts != null && myPts > 0 && myPts === max) vibrate([70, 50, 70]);
}
function afterRender(v) {
  if (v.phase === 'results' && v.lastGame) {
    var k = 'r' + v.lastGame.at;
    if (S.fxConfetti !== k) { S.fxConfetti = k; confetti(1); sfxWin(); }
  }
  if (v.phase === 'podium' || v.phase === 'final') {
    var k2 = 'p' + (v.lastGame ? v.lastGame.at : 0) + v.phase;
    if (S.fxConfetti !== k2) { S.fxConfetti = k2; confetti(3); sfxWin(); }
  }
  if (S.role === 'player' && v.game) {
    if (v.game.id === 'do-vui' && v.game.phase === 'reveal' && v.game.reveal) {
      var key = 'q' + v.game.round + ':' + v.game.round;
      if (S.fxReveal !== key) {
        S.fxReveal = key;
        if (v.game.mine != null && v.game.mine === v.game.reveal.correct) { sfxCorrect(); vibrate(80); }
        else sfxWrong();
      }
    }
    checkRoundWin(v);
  }
  if (S.role === 'player' && v.phase === 'results' && v.lastGame) {
    var mine = v.lastGame.points[S.seat] || 0; var max = 0; var kk;
    for (kk in v.lastGame.points) if (v.lastGame.points[kk] > max) max = v.lastGame.points[kk];
    var key3 = 'w' + v.lastGame.at;
    if (S.fxRound !== key3) { S.fxRound = key3; if (mine > 0 && mine === max) { sfxWin(); vibrate([70, 50, 70]); } }
  }
}
function countUp(row) {
  var out = row.querySelector('.gv'); if (!out) return;
  var gd = row.querySelector('.gd'); if (gd) gd.textContent = row.getAttribute('data-difftext') || '';
  var target = row.getAttribute('data-value');
  if (target === '' || target === null) { out.textContent = '—'; return; }
  var val = +target; var t0 = Date.now();
  var iv = setInterval(function () {
    var p = Math.min(1, (Date.now() - t0) / 600);
    out.textContent = fmt(val * p);
    if (p >= 1) clearInterval(iv);
  }, 40);
}
function fxSparks(field, x, y, colorHex, n) {
  for (var i = 0; i < n; i++) {
    var s = document.createElement('span');
    s.className = 'fx-spark';
    s.style.left = ((x + 12) / 24 * 100) + '%';
    s.style.top = ((y + 12) / 24 * 100) + '%';
    s.style.background = colorHex; s.style.color = colorHex;
    field.appendChild(s);
    var ang = Math.random() * Math.PI * 2; var dist = 22 + Math.random() * 48;
    var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    (function (node, mx, my) {
      requestAnimationFrame(function () {
        node.style.transform = 'translate(' + mx + 'px,' + my + 'px) scale(.3)';
        node.style.opacity = '0';
      });
      setTimeout(function () { node.remove(); }, 680);
    })(s, dx, dy);
  }
}
function fxGhost(field, pos, colorName) {
  var s = document.createElement('span');
  s.className = 'fx-ghost';
  s.style.left = ((pos.x + 12) / 24 * 100) + '%';
  s.style.top = ((pos.y + 12) / 24 * 100) + '%';
  s.innerHTML = orbSVG(colorName, 40);
  field.appendChild(s);
  requestAnimationFrame(function () { s.style.opacity = '0'; });
  setTimeout(function () { s.remove(); }, 540);
}
function fxTrail(field, ball) {
  var s = document.createElement('span');
  s.className = 'fx-trail';
  s.style.left = ((ball.x + 12) / 24 * 100) + '%';
  s.style.top = ((ball.y + 12) / 24 * 100) + '%';
  field.appendChild(s);
  setTimeout(function () { s.remove(); }, 320);
}
function fxWarn(field, ball) {
  var cx = Math.max(-11, Math.min(11, ball.x)), cy = Math.max(-11, Math.min(11, ball.y));
  var s = document.createElement('span');
  s.className = 'awarn';
  s.style.left = ((cx + 12) / 24 * 100) + '%';
  s.style.top = ((cy + 12) / 24 * 100) + '%';
  field.appendChild(s);
  setTimeout(function () { s.remove(); }, 580);
}
function fxKO(name) {
  var b = el('kobanner'); if (!b) return;
  var sub = el('kosub'); if (sub) sub.textContent = name + ' bị loại!';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  if (S._koT) clearTimeout(S._koT);
  S._koT = setTimeout(function () { b.classList.remove('show'); }, 1600);
}
function fxShake(field, big) {
  var cls = big ? 'shake-big' : 'shake';
  field.classList.remove('shake'); field.classList.remove('shake-big'); void field.offsetWidth;
  field.classList.add(cls);
  setTimeout(function () { field.classList.remove(cls); }, big ? 480 : 330);
}
function fxSlowmo(field) {
  field.classList.add('slowmo');
  if (S._smT) clearTimeout(S._smT);
  S._smT = setTimeout(function () { field.classList.remove('slowmo'); }, 620);
}
function fxFlash(seat) {
  var node = el('ablob-' + seat); if (!node) return;
  node.classList.remove('hitflash'); void node.offsetWidth; node.classList.add('hitflash');
  setTimeout(function () { node.classList.remove('hitflash'); }, 240);
}
function arenaFX(v, g) {
  var field = el('afield');
  var key = g.id + '|' + g.round + '|' + g.phase;
  if (!S.fxP || S.fxP.key !== key) {
    S.fxP = { key: key, blobs: {}, ballN: -1, nearCd: 0, trailAt: 0 };
    for (var s0 in g.blobs) S.fxP.blobs[s0] = { x: g.blobs[s0].x, y: g.blobs[s0].y, lives: g.blobs[s0].lives, alive: g.blobs[s0].alive };
    if (g.balls) S.fxP.ballN = g.balls.length;
    return;
  }
  var P = S.fxP;
  var lostLife = {};
  for (var seat in g.blobs) {
    var cur = g.blobs[seat]; var prev = P.blobs[seat];
    var pl = playerOf(v, +seat);
    var colName = pl ? pl.color : 'blue'; var colHex = COLORS[colName] || COLORS.blue;
    if (prev && prev.alive && !cur.alive) {
      if (field) { fxKO(pl ? pl.name : ''); fxShake(field, true); fxSlowmo(field); fxSparks(field, cur.x, cur.y, colHex, 16); }
      sfxBoom(); if (+seat === S.seat) vibrate([90, 40, 90]);
    } else if (prev && cur.alive && cur.lives < prev.lives) {
      lostLife[seat] = true;
      fxFlash(seat);
      if (field) { fxShake(field, false); fxSparks(field, cur.x, cur.y, colHex, 7); }
      sfxThud(); if (+seat === S.seat) vibrate(120);
    } else if (prev && cur.alive && prev.alive && field) {
      var moved = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      if (moved > 3.4) {
        fxGhost(field, prev, colName);
        fxGhost(field, { x: (cur.x + prev.x) / 2, y: (cur.y + prev.y) / 2 }, colName);
        sfxDash();
      }
    }
    P.blobs[seat] = { x: cur.x, y: cur.y, lives: cur.lives, alive: cur.alive };
  }
  var ring = el('aring');
  if (ring && g.id === 'day-ra' && g.arenaR) ring.classList.toggle('danger', g.arenaR <= 5.5);
  if (g.id === 'ne-dan' && g.balls) {
    if (P.ballN >= 0 && g.balls.length > P.ballN && field) {
      for (var bi = P.ballN; bi < g.balls.length; bi++) fxWarn(field, g.balls[bi]);
    }
    var nowMs = Date.now();
    if (field && nowMs - P.trailAt > 210 && g.balls.length <= 14) {
      P.trailAt = nowMs;
      for (var ti = 0; ti < g.balls.length; ti++) fxTrail(field, g.balls[ti]);
    }
    if (nowMs > P.nearCd) {
      var near = false;
      for (var ni = 0; ni < g.balls.length && !near; ni++) {
        for (var ns in g.blobs) {
          var bb2 = g.blobs[ns]; if (!bb2.alive || lostLife[ns]) continue;
          var dd = Math.hypot(g.balls[ni].x - bb2.x, g.balls[ni].y - bb2.y);
          if (dd > 1.5 && dd < 3.0) { near = true; break; }
        }
      }
      if (near) {
        P.nearCd = nowMs + 900;
        sfxWhoosh();
        if (field) {
          field.classList.remove('pulse'); void field.offsetWidth; field.classList.add('pulse');
          setTimeout(function () { field.classList.remove('pulse'); }, 240);
        }
      }
    }
    P.ballN = g.balls.length;
  }
}
function tick() {
  var v = S.view;
  if (!v || !S.role) return;
  var t = serverNow();
  var g = v.game;
  var cd = el('cdnum');
  if (g && g.phase === 'countdown' && cd) {
    var sec = Math.max(1, Math.ceil((g.endsAt - t) / 1000));
    if (String(sec) !== cd.textContent) {
      cd.textContent = sec;
      cd.classList.remove('punch'); void cd.offsetWidth; cd.classList.add('punch');
    }
    if (sec !== S.lastCd) { S.lastCd = sec; sfxCount(sec === 1); }
  } else S.lastCd = -1;
  var bars = document.querySelectorAll('.tbar i');
  for (var i = 0; i < bars.length; i++) {
    var start = +bars[i].getAttribute('data-start'); var end = +bars[i].getAttribute('data-end');
    var pct = Math.max(0, Math.min(100, (end - t) / (end - start) * 100));
    bars[i].style.width = pct + '%';
  }
  if (g && ((g.id === 'do-vui' && g.phase === 'question') || (g.id === 'dua-bam' && g.phase === 'race') || (g.id === 'doan-so' && g.phase === 'guess'))) {
    var rem = g.endsAt - t;
    if (rem <= 3000 && rem > 0) { var s2 = Math.ceil(rem / 1000); if (s2 !== S.lastTickSec) { S.lastTickSec = s2; beep(1150, 0.045, 'square', 0.09); } }
    else if (rem > 3000) S.lastTickSec = -1;
  }
  if (g && g.id === 'nho-mau' && g.phase === 'show' && S.role === 'host' && g.seq) {
    var len = g.seq.length; var total = 900 + len * 750;
    var elapsed = total - (g.endsAt - t);
    var active = -1;
    if (elapsed >= 450) { var idx = Math.floor((elapsed - 450) / 750); var within = (elapsed - 450) - idx * 750; if (idx < len && within < 450) active = g.seq[idx]; }
    for (var pi = 0; pi < 4; pi++) { var pad = el('pad' + pi); if (pad) { if (pi === active) pad.classList.add('on'); else pad.classList.remove('on'); } }
  }
  if (g && g.id === 'dua-bam' && g.counts) {
    var max = 1; var seat;
    for (seat in g.counts) if (g.counts[seat] > max) max = g.counts[seat];
    for (seat in g.counts) {
      var bar = document.querySelector('.racebar i[data-seat="' + seat + '"]');
      if (bar) bar.style.width = (g.counts[seat] / max * 100) + '%';
      var lab = el('rcl-' + seat);
      if (lab) { var pl = playerOf(v, +seat); lab.textContent = (pl ? pl.name : '') + ' · ' + g.counts[seat]; }
    }
    var mc = el('mycount');
    if (mc && S.role === 'player') mc.textContent = g.counts[S.seat] || 0;
  }
  if (g && (g.id === 'day-ra' || g.id === 'ne-dan') && g.blobs) {
    for (var bSeat in g.blobs) {
      var bb = g.blobs[bSeat];
      var bn = el('ablob-' + bSeat);
      if (bn) {
        bn.style.left = ((bb.x + 12) / 24 * 100) + '%';
        bn.style.top = ((bb.y + 12) / 24 * 100) + '%';
        bn.style.opacity = bb.alive ? '1' : '0.25';
      }
      var lv = el('alives-' + bSeat);
      if (lv) lv.textContent = '❤'.repeat(bb.lives);
    }
    var ring = el('aring');
    if (ring && g.arenaR) { var pct = (g.arenaR * 2 / 24 * 100) + '%'; ring.style.width = pct; ring.style.height = pct; }
    var ml = el('mylives');
    if (ml && g.blobs[S.seat]) ml.textContent = '❤'.repeat(g.blobs[S.seat].lives);
  }
  if (g && g.id === 'ne-dan' && g.balls) {
    for (var nbi = 0; nbi < g.balls.length; nbi++) {
      var nb = el('nball-' + nbi);
      if (nb) {
        nb.style.left = ((g.balls[nbi].x + 12) / 24 * 100) + '%';
        nb.style.top = ((g.balls[nbi].y + 12) / 24 * 100) + '%';
      }
    }
  }
  if (g && (g.id === 'day-ra' || g.id === 'ne-dan') && g.blobs) arenaFX(v, g);
  var rows = document.querySelectorAll('.rev');
  for (var ri = 0; ri < rows.length; ri++) {
    if (!rows[ri].classList.contains('shown') && t >= +rows[ri].getAttribute('data-reveal')) {
      rows[ri].classList.add('shown');
      beep(500 + ri * 110, 0.08, 'triangle', 0.11);
      countUp(rows[ri]);
    }
  }
}

function homeHTML() {
  var h = '<div class="card center" style="margin-top:26px">';
  h += '<div class="logo"><span class="word">nảy</span>' + blobSVG('blue', 'reo', 60) + blobSVG('pink', 'cuoi', 60) + '<span class="party"><span style="background:#4FA8E8">P</span><span style="background:#F77FB0">A</span><span style="background:#FFB35C">R</span><span style="background:#58C472">T</span><span style="background:#A78BFA">Y</span></span></div>';
  h += '<p class="tagline">Game tiệc trên màn hình lớn — điện thoại là tay cầm</p>';
  h += '<p><button class="btn blue" data-cmd="create" style="font-size:23px">Mở trên màn hình lớn (TV)</button></p>';
  h += '<p class="muted">Màn hình lớn tạo phòng và hiện mã 6 số. Bạn bè mở trang này trên điện thoại, nhập mã là chơi — không cần cài app, không cần tài khoản.</p>';
  h += '</div>';
  h += '<div class="card center" style="margin-top:16px"><h2 style="margin:0 0 8px">Vào bằng điện thoại (tay cầm)</h2>';
  h += '<div class="digits">';
  for (var i = 0; i < 6; i++) h += '<input class="digit" id="d' + i + '" type="tel" maxlength="1" inputmode="numeric">';
  h += '</div>';
  h += '<p><input type="text" id="joinName" maxlength="14" placeholder="Tên của bạn" style="text-align:center"></p>';
  h += '<p><button class="btn pink" data-cmd="join" style="font-size:22px">Vào phòng</button></p></div>';
  h += '<p class="center muted small" style="margin-top:14px">9 game: Nhanh Tay · Đố Vui Tốc Độ · Đoán Số Chuẩn · Đua Bấm Nút · Nhớ Màu · Đẩy Ra Khỏi Sàn · Né Đạn · Kéo Co · Chia Hay Cướp — vòng cuối luôn ×2 điểm!</p>';
  return h;
}
function playerHTML(v) {
  var h = topbarHTML(v, false);
  var me = playerOf(v, S.seat);
  if (v.phase === 'lobby' || v.phase === 'choosing') {
    h += '<div class="card center"><span class="blobbob">' + blobSVG(me ? me.color : 'blue', 'reo', 120) + '</span>';
    h += '<h2 style="margin:6px 0">' + esc(me ? me.name : '') + ' đã vào phòng!</h2>';
    h += '<p class="muted">Đợi màn hình lớn chọn game… Trong phòng đang có:</p><p>';
    for (var i = 0; i < v.players.length; i++) { var p = v.players[i]; h += '<span class="chip' + (p.type === 'bot' ? ' hot' : ' cool') + '">' + esc(p.name) + (p.type === 'bot' ? ' (Máy)' : '') + '</span>'; }
    h += '</p></div>';
    return h;
  }
  if (v.phase === 'playing' && v.game) return h + playerGame(v);
  if (v.phase === 'results') return h + resultsHTML(v, false);
  if (v.phase === 'podium') return h + podiumHTML(v, false);
  if (v.phase === 'final') return h + finalHTML(v, false);
  return h + '<div class="card center"><h2>Đang tải…</h2></div>';
}
function playerGame(v) {
  var g = v.game;
  var me = playerOf(v, S.seat);
  var h = '<div class="stage g-' + g.id + (isActionGame(g.id) ? ' neon-stage' : '') + '">';
  if (g.phase === 'countdown') { h += '<div class="center baloo" style="font-size:26px">' + esc(g.name) + '</div>' + countdownHTML(g) + '</div>'; return h; }
  h += '<h2>' + esc(g.name) + ' · Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · ×2' : '') + '</h2>';
  if (g.id === 'nhanh-tay') {
    if (g.phase === 'wait') {
      if (g.mine === 'early') h += '<div class="center"><div class="baloo" style="font-size:30px">Bạn bấm sớm!</div><p>−100 điểm vòng này. Đợi vòng sau nhé.</p></div>';
      else h += '<button class="tapbtn wait" data-cmd="tap">ĐỢI…<br><span style="font-size:17px">Đừng bấm vội!</span></button>';
    } else if (g.phase === 'go') {
      if (g.mine === 'tapped') h += '<div class="center baloo" style="font-size:30px">Đã bấm! Đợi kết quả…</div>';
      else h += '<button class="tapbtn go" data-cmd="tap">BẤM NGAY!</button>';
    } else if (g.phase === 'roundEnd' && g.lastRound) {
      var e = null; for (var i = 0; i < g.lastRound.entries.length; i++) if (g.lastRound.entries[i].seat === S.seat) e = g.lastRound.entries[i];
      if (e) {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, e.points > 0 ? 'reo' : 'buon', 100) + '</span>';
        h += '<div class="baloo" style="font-size:28px">' + (e.status === 'tapped' ? 'Bạn bấm trong ' + e.reactionMs + ' ms' + (e.gapMs > 0 ? ' (chậm hơn ' + e.gapMs + ' ms)' : ' — NHANH NHẤT!') : e.status === 'early' ? 'Bấm sớm mất rồi!' : 'Bạn chưa bấm') + '</div>';
        h += '<div class="baloo" style="font-size:24px">' + (e.points > 0 ? '+' : '') + fmt(e.points) + ' điểm</div></div>';
      }
    }
  } else if (g.id === 'do-vui') {
    if (g.phase === 'question') {
      h += '<div class="baloo" style="font-size:22px">' + esc(g.question) + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['do-vui']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a = 0; a < 4; a++) h += '<button class="opt" data-cmd="answer" data-i="' + a + '">' + LETTERS[a] + '. ' + esc(g.options[a]) + '</button>';
        h += '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:26px">Đã trả lời! Đợi mọi người…</div>';
        if (g.myStreak >= 1) h += '<p class="center"><span class="chip hot">Chuỗi đúng ×' + (g.myStreak + 1) + ' đang chờ — đúng tiếp là cộng điểm chuỗi!</span></p>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var okAns = g.mine != null && g.mine === g.reveal.correct;
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, okAns ? 'reo' : 'buon', 100) + '</span>';
      h += '<div class="baloo" style="font-size:30px">' + (okAns ? 'ĐÚNG RỒI!' : 'Chưa đúng!') + '</div>';
      h += '<p>Đáp án đúng: <b>' + LETTERS[g.reveal.correct] + '. ' + esc(g.options[g.reveal.correct]) + '</b></p>';
      h += '<div class="baloo" style="font-size:24px">+' + fmt(g.reveal.points[S.seat] || 0) + ' điểm</div></div>';
    }
  } else if (g.id === 'doan-so') {
    if (g.phase === 'guess') {
      h += '<div class="baloo" style="font-size:22px">' + esc(g.question) + ' (' + esc(g.unit) + ')</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['doan-so']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.mine == null) {
        h += '<div class="guessbox center" id="guessVal">' + (S.guess ? fmt(+S.guess) : '') + '</div>';
        h += '<div class="keypad">';
        var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'D'];
        for (var kI = 0; kI < keys.length; kI++) h += '<button class="key" data-cmd="key" data-k="' + keys[kI] + '">' + (keys[kI] === 'C' ? 'Xoá' : keys[kI] === 'D' ? '←' : keys[kI]) + '</button>';
        h += '</div>';
        h += '<p class="center"><button class="btn green" data-cmd="guessSubmit" style="font-size:23px">ĐOÁN!</button></p>';
      } else {
        h += '<div class="center baloo" style="font-size:27px">Đã đoán: ' + fmt(g.mine) + ' ' + esc(g.unit) + '</div><p class="center">Đợi kết quả trên TV…</p>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var myE = null; for (var gi = 0; gi < g.reveal.entries.length; gi++) if (g.reveal.entries[gi].seat === S.seat) myE = g.reveal.entries[gi];
      h += '<div class="center"><div class="baloo" style="font-size:28px">Đáp án đúng: ' + fmt(g.reveal.answer) + ' ' + esc(g.unit) + '</div>';
      if (myE) h += '<p>Bạn đoán ' + (myE.value === null ? '—' : fmt(myE.value)) + (myE.diff !== null ? ' · lệch ' + fmt(myE.diff) : '') + '</p><div class="baloo" style="font-size:24px">+' + fmt(myE.points) + ' điểm</div>';
      h += '</div>';
    }
  } else if (g.id === 'dua-bam') {
    if (g.phase === 'race') {
      h += '<div class="center baloo" style="font-size:26px">Số lần bấm của bạn</div>';
      h += '<div class="center baloo" style="font-size:64px" id="mycount">' + (g.mine || 0) + '</div>';
      h += '<button class="tapbtn race" data-cmd="tap">BẤM!</button>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['dua-bam']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'pause' && g.lastRound) {
      h += '<div class="rows">';
      for (var rI = 0; rI < g.lastRound.entries.length; rI++) { var re2 = g.lastRound.entries[rI]; var rp = playerOf(v, re2.seat); h += '<div class="rrow">' + blobSVG(rp.color, rp.mood, 32) + ' ' + esc(rp.name) + '<span class="muted">' + re2.taps + ' lần</span><span class="pts">+' + fmt(re2.points) + '</span></div>'; }
      h += '</div>';
    }
  } else if (g.id === 'nho-mau') {
    if (g.phase === 'show') {
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, 'ngacnhien', 110) + '</span><div class="baloo" style="font-size:27px">Nhìn lên TV<br>và nhớ dãy màu!</div><p>Dãy dài ' + g.len + ' màu</p></div>';
    } else if (g.phase === 'input') {
      var mine = g.mine || { taps: 0, status: 'playing' };
      if (mine.status === 'done') h += '<div class="center baloo" style="font-size:29px">Hoàn thành! Đợi kết quả…</div>';
      else if (mine.status === 'failed') h += '<div class="center baloo" style="font-size:29px">Sai rồi! Vòng này 0 điểm.</div>';
      else {
        h += '<div class="center baloo" style="font-size:23px">Đã bấm ' + mine.taps + '/' + g.len + ' màu</div>';
        h += '<div class="pads">';
        for (var cI = 0; cI < 4; cI++) h += '<button class="pad" data-cmd="color" data-i="' + cI + '" style="background:' + MEM[cI] + ';opacity:.9" aria-label="' + MEMNAME[cI] + '"></button>';
        h += '</div>';
        h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['nho-mau']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      }
    } else if (g.phase === 'pause' && g.lastRound) {
      var mp2 = g.lastRound.points[S.seat] || 0;
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, mp2 > 0 ? 'reo' : 'buon', 100) + '</span><div class="baloo" style="font-size:27px">' + (mp2 > 0 ? 'Nhớ siêu quá!' : 'Chưa thuộc dãy này') + '</div><div class="baloo" style="font-size:23px">+' + fmt(mp2) + ' điểm</div></div>';
    }
  } else if (g.id === 'day-ra' || g.id === 'ne-dan') {
    var myB = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'arena' || g.phase === 'dodge') {
      if (myB && !myB.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">Mạng của bạn: <span id="mylives" style="color:#FFD7DE">' + (myB ? '❤'.repeat(myB.lives) : '') + '</span></div>';
        h += '<div class="padwrap"><div class="dpad">'
          + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
          + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
          + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
          + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>ĐẨY</span></button></div></div>';
        h += '<p class="center small">' + (g.id === 'ne-dan' ? 'Giữ D-pad để né đạn · B: lướt nhanh' : 'Giữ D-pad để di chuyển · A: đẩy đối thủ · B: lướt nhanh') + '</p>';
      }
    }
  } else if (g.id === 'keo-co') {
    var myTeam = S.seat % 2 === 1 ? 'A' : 'B';
    if (g.phase === 'pull') {
      h += '<div class="center baloo" style="font-size:24px">BẠN Ở ĐỘI ' + myTeam + ' — BẤM NÚT B LIÊN TỤC!</div>';
      var kpct2 = Math.max(3, Math.min(97, 50 + (g.knot / 84) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" style="left:' + kpct2 + '%"></div></div>';
      h += '<div class="center baloo" style="font-size:21px">Bạn đã kéo: ' + (g.presses ? (g.presses[S.seat] || 0) : 0) + ' lần</div>';
      h += '<div class="padwrap"><div class="dpad">'
        + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
        + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
        + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
        + '<div class="abtns"><button class="abtn" data-pad="b" style="background:#E84F4F;width:92px;height:92px;font-size:30px">B<span>KÉO!</span></button></div></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'chia-cuop') {
    var inPair = g.pair && g.pair.indexOf(S.seat) >= 0;
    var foeSeat = inPair ? g.pair[g.pair[0] === S.seat ? 1 : 0] : null;
    var foe = foeSeat ? playerOf(v, foeSeat) : null;
    if (g.phase === 'talk') {
      h += '<div class="center baloo" style="font-size:23px">Nồi ' + fmt(g.pot || 400) + ' điểm' + (g.finalRound ? ' · VÒNG CUỐI ×2' : '') + '</div>';
      if (g.chat) for (var pI = 0; pI < g.chat.length; pI++) { var pp2 = playerOf(v, g.chat[pI].seat); h += '<div class="chatrow">' + blobSVG(pp2 ? pp2.color : 'blue', 'cuoi', 24) + ' <b>' + esc(pp2 ? pp2.name : '') + ':</b> ' + esc(g.chat[pI].text) + '</div>'; }
      if (inPair) {
        h += '<p class="center">Bạn đấu với <b>' + esc(foe ? foe.name : '') + '</b>. Nói gì cũng được — lát nữa chọn mới là thật!</p>';
        h += '<p class="center"><input type="text" id="chatText" maxlength="60" placeholder="Lời thương lượng…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="chatSend">Gửi</button></p>';
      } else {
        var w1 = g.pair ? playerOf(v, g.pair[0]) : null; var w2 = g.pair ? playerOf(v, g.pair[1]) : null;
        h += '<p class="center">Vòng này ' + esc(w1 ? w1.name : '') + ' và ' + esc(w2 ? w2.name : '') + ' thương lượng — bạn ngồi ngoài xem.</p>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'choose') {
      if (!inPair) {
        h += '<div class="center baloo" style="font-size:25px">Hai người kia đang chọn bí mật…</div><p class="center">Xem TV đoán thử ai sẽ cướp!</p>';
      } else if (g.mineChosen) {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, 'ngacnhien', 100) + '</span><div class="baloo" style="font-size:26px">Đã khoá lựa chọn!</div><p>Bí mật đến phút công bố — đợi đối thủ…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:25px">CHỌN BÍ MẬT ĐI!</div>';
        h += '<p class="center">Cả hai CHIA: mỗi người một nửa nồi · Một người CƯỚP: cướp hết · Cả hai CƯỚP: mất trắng!</p>';
        h += '<p class="center"><button class="btn green" data-cmd="choose" data-c="chia" style="font-size:23px">X · CHIA</button></p>';
        h += '<p class="center"><button class="btn pink" data-cmd="choose" data-c="cuop" style="font-size:23px">B · CƯỚP</button></p>';
        h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 15000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var myE2 = null; for (var qI = 0; qI < g.reveal.entries.length; qI++) if (g.reveal.entries[qI].seat === S.seat) myE2 = g.reveal.entries[qI];
      h += '<div class="center"><span class="blobbob">' + orbSVG(me.color, 100, !!(myE2 && myE2.points <= 0)) + '</span>';
      if (myE2) h += '<div class="baloo" style="font-size:27px">Bạn đã ' + (myE2.choice === 'cuop' ? 'CƯỚP' : 'CHIA') + ' · +' + fmt(myE2.points) + ' điểm</div>';
      else h += '<div class="baloo" style="font-size:25px">Xem kết quả trên TV!</div>';
      h += '</div>';
    }
  }
  return h + '</div>';
}
function saveSession() {
  try { sessionStorage.setItem('np_session', JSON.stringify({ role: S.role, code: S.code, token: S.token, seat: S.seat })); } catch (e) {}
}
function clearSession() {
  try { sessionStorage.removeItem('np_session'); } catch (e) {}
  S.role = null; S.code = null; S.token = null; S.seat = null; S.view = null; S.sig = ''; render();
}
// A room created seconds ago may briefly be invisible to a phone whose
// request lands somewhere the fresh room has not reached yet, and the
// join then answers "room not found". Retry ONLY that error every 2s
// for ~20s before bothering the user; every other error (room playing,
// room full, name problems) surfaces immediately.
var JOIN_RETRY_MS = 2000, JOIN_RETRY_MAX = 10;
function tryJoin(code, name, attempt) {
  api('/api/rooms/' + code + '/join', { name: name }, function (v) {
    if (v && v.ok) { S.role = 'player'; S.code = code; S.token = v.playerToken; S.seat = v.seat; saveSession(); S.sig = ''; poll(); return; }
    var err = v && v.error ? v.error : '';
    if (err.indexOf('Không thấy phòng này') >= 0 && attempt < JOIN_RETRY_MAX) {
      toast('Đang tìm phòng…');
      setTimeout(function () { tryJoin(code, name, attempt + 1); }, JOIN_RETRY_MS);
      return;
    }
    toast(err || 'Không vào được phòng.');
  });
}
document.addEventListener('click', function (ev) {
  var node = ev.target;
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-cmd')) break; node = node.parentNode; }
  if (!node || !node.getAttribute) return;
  var cmd = node.getAttribute('data-cmd');
  if (cmd === 'create') {
    api('/api/rooms', {}, function (v) {
      if (v && v.ok) { S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; saveSession(); S.sig = ''; poll(); }
      else toast(v && v.error ? v.error : 'Không tạo được phòng.');
    });
  } else if (cmd === 'join') {
    var code = '';
    for (var i = 0; i < 6; i++) { var d = el('d' + i); code += d ? d.value.trim() : ''; }
    var nameEl = el('joinName'); var name = nameEl ? nameEl.value.trim() : '';
    if (code.length !== 6) { toast('Nhập đủ mã phòng 6 số nhé.'); return; }
    if (!name) { toast('Nhập tên của bạn trước nhé.'); return; }
    tryJoin(code, name, 0);
  } else if (cmd === 'sound') {
    S.muted = !S.muted;
    try { localStorage.setItem('np_muted', S.muted ? '1' : '0'); } catch (e) {}
    S.sig = ''; render();
  } else if (cmd === 'fs') {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  } else if (cmd === 'reload') {
    clearSession();
    location.reload();
  } else if (cmd === 'addBot' || cmd === 'removeBot' || cmd === 'cycleBot') {
    act({ action: cmd, seat: +node.getAttribute('data-seat') });
  } else if (cmd === 'start') {
    sfxTap();
    act({ action: 'startGame', game: node.getAttribute('data-game') });
  } else if (cmd === 'continue' || cmd === 'replay' || cmd === 'toChoosing' || cmd === 'finish' || cmd === 'playAgain') {
    sfxTap();
    act({ action: cmd });
  } else if (cmd === 'tap') {
    sfxTap();
    if (S.view && S.view.game && S.view.game.id === 'dua-bam') { var mc = el('mycount'); if (mc) mc.textContent = (+mc.textContent || 0) + 1; }
    act({ action: 'tap' });
  } else if (cmd === 'answer') {
    sfxTap();
    act({ action: 'answer', choice: +node.getAttribute('data-i') });
  } else if (cmd === 'color') {
    var ci = +node.getAttribute('data-i');
    beep(320 + ci * 130, 0.1, 'triangle', 0.14);
    node.classList.add('on');
    setTimeout(function () { node.classList.remove('on'); }, 200);
    act({ action: 'color', color: ci });
  } else if (cmd === 'key') {
    var k = node.getAttribute('data-k');
    if (k === 'C') S.guess = '';
    else if (k === 'D') S.guess = S.guess.slice(0, -1);
    else if (S.guess.length < 9) S.guess += k;
    var gv = el('guessVal'); if (gv) gv.textContent = S.guess ? fmt(+S.guess) : '';
    sfxTap();
  } else if (cmd === 'guessSubmit') {
    if (!S.guess) { toast('Nhập số đoán trước đã.'); return; }
    var val = +S.guess; S.guess = '';
    act({ action: 'guess', value: val });
  } else if (cmd === 'choose') {
    sfxTap();
    act({ action: 'choose', choice: node.getAttribute('data-c') });
  } else if (cmd === 'chatSend') {
    var ct = el('chatText'); var txt = ct ? ct.value.trim() : '';
    if (!txt) { toast('Nhập lời nhắn trước đã.'); return; }
    if (ct) ct.value = '';
    act({ action: 'chat', text: txt });
  }
});
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.classList && t.classList.contains('digit') && t.value.length >= 1) {
    var idx = +t.id.slice(1);
    var next = el('d' + (idx + 1));
    if (next) next.focus();
  }
});
S.padState = { u: false, d: false, l: false, r: false, a: false, b: false };
S.padPointers = {};
function sendPad() {
  if (!S.code || S.role !== 'player') return;
  api('/api/rooms/' + S.code + '/action', { role: 'player', token: S.token, action: 'pad', pad: S.padState }, function () {});
}
function padSet(bit, val, pid) {
  if (val) {
    S.padPointers[pid] = bit;
    if (!S.padState[bit]) { S.padState[bit] = true; sendPad(); }
  } else {
    delete S.padPointers[pid];
    if (S.padState[bit]) { S.padState[bit] = false; sendPad(); }
  }
}
document.addEventListener('pointerdown', function (ev) {
  var node = ev.target;
  if (node && node.getAttribute && node.getAttribute('data-pad')) {
    ev.preventDefault();
    padSet(node.getAttribute('data-pad'), true, ev.pointerId);
  }
});
function padRelease(ev) {
  var bit = S.padPointers[ev.pointerId];
  if (bit) padSet(bit, false, ev.pointerId);
}
document.addEventListener('pointerup', padRelease);
document.addEventListener('pointercancel', padRelease);
window.addEventListener('blur', function () {
  S.padPointers = {};
  var changed = false;
  for (var k in S.padState) if (S.padState[k]) { S.padState[k] = false; changed = true; }
  if (changed) sendPad();
});
(function init() {
  try {
    var raw = sessionStorage.getItem('np_session');
    if (raw) { var s = JSON.parse(raw); if (s && s.code && s.token) { S.role = s.role; S.code = s.code; S.token = s.token; S.seat = s.seat; } }
  } catch (e) {}
  render();
  setInterval(poll, 800);
  setInterval(tick, 150);
  setInterval(function () {
    var v = S.view;
    if (v && v.game && ((v.game.id === 'nhanh-tay' && (v.game.phase === 'wait' || v.game.phase === 'go')) || (v.game.id === 'day-ra' && v.game.phase === 'arena') || (v.game.id === 'ne-dan' && v.game.phase === 'dodge') || (v.game.id === 'keo-co' && v.game.phase === 'pull'))) poll();
  }, 220);
})();
</script>
</body>
</html>`;

