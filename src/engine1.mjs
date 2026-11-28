// ============================================================================
// Nảy Party — Cloudflare Worker (single self-contained file, no dependencies)
// - GET  /                        → the full game page (HTML embedded below)
// - POST /api/rooms               → create a room (host screen)
// - POST /api/rooms/:code/join    → a phone joins by code + name
// - GET  /api/rooms/:code/state   → polled state view (host or player, filtered)
// - POST /api/rooms/:code/action  → host / player actions
// - GET  /api/rooms/:code/ws      → WebSocket live channel (same auth as
//   /state): the room's Durable Object pushes personalized state views the
//   moment they change and accepts the same action bodies, so input no
//   longer waits on polling. HTTP remains the full fallback everywhere.
// Rooms live in a Durable Object (binding ROOMS_DO, class RoomStore below):
// one object per room code, so room writes use DO storage instead of KV
// (the KV free tier's daily write limit was exhausted by per-poll saves).
// The KV namespace bound as ROOMS remains only as a fallback for
// environments where ROOMS_DO is not bound. The server is authoritative:
// all timing uses server timestamps and game phases advance lazily whenever
// a request touches the room (clients poll ~1s, faster during reaction games).
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Platform seat cap: rooms hold up to MAX_SEATS players (humans +
// bots). Each game declares its own [min, max] inside GAMES; the
// chooser locks a card whose range excludes the current seat count.
export const MAX_SEATS = 12;
export const SEAT_COLORS = ['blue', 'pink', 'green', 'purple', 'orange', 'red', 'cyan', 'yellow', 'lime', 'brown', 'silver', 'magenta'];
// Placement points by finishing rank. Ranks 1-4 are the historical
// 300/200/100/50; ranks 5-12 extend the tail so big-room matches pay
// everyone something. EVERY placement award goes through
// placementAt() so >4-player matches score identically everywhere.
export const PLACEMENT_POINTS = [300, 200, 100, 50, 40, 30, 20, 10, 10, 10, 10, 10];
export function placementAt(rankIdx) {
  return PLACEMENT_POINTS[Math.min(rankIdx, PLACEMENT_POINTS.length - 1)];
}
export const DIFFS = ['de', 'vua', 'kho'];
export const DIFF_LABELS = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };

// Per-game seat range [min, max]: crowd / turn-based games scale to
// the full 12-seat room; realtime arenas cap at 8 so the field stays
// readable; Đặt Bom caps at 6 (its spawn cells), Đẩy Hộp / Đền at 6
// (level geometry), Cờ Cá Ngựa is a 4-colour board by design.
export const GAMES = {
  'do-vui': { name: 'Đố Vui Tốc Độ', desc: 'Trả lời đúng và nhanh nhất', rounds: 8, cat: 'versus', min: 2, max: 12 },
  'day-ra': { name: 'Đẩy Ra Khỏi Sàn', desc: 'Gamepad: đẩy hết đối thủ khỏi sàn tròn!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'ne-dan': { name: 'Né Laze', desc: 'Né tia laze: nhảy qua tia thấp, đứng yên tránh tia cao!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  // Rounds for Chia Hay Cướp are dynamic: one round per seated player
  // (pairs rotate, see beginRound), so `rounds` here is only nominal.
  'cuop-sao': { name: 'Cướp Sao', desc: 'Gamepad: nhặt sao, xô đối thủ cho rơi sao!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'giu-vuong-mien': { name: 'Giữ Vương Miện', desc: 'Gamepad: giành vương miện và giữ càng lâu càng tốt!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'xe-tank': { name: 'Xe Tăng Đấu Trường', desc: 'Gamepad: lái xe tăng, bắn hạ đối thủ, núp sau vật chắn!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'dat-bom': { name: 'Đặt Bom', desc: 'Gamepad: đặt bom phá tường gỗ, né vụ nổ chữ thập!', rounds: 1, cat: 'versus', min: 2, max: 6 },
  'ma-soi': { name: 'Ma Sói', desc: 'Suy luận xã hội: sói trà trộn trong làng — bảo vệ dân, tìm và treo cổ sói trước khi quá muộn!', rounds: 1, cat: 'versus', min: 4, max: 12 },
  'ca-ngua': { name: 'Cờ Cá Ngựa', desc: 'Thảy xúc xắc, xuất chuồng, đá ngựa đối thủ — đưa cả 4 ngựa về chuồng trước!', rounds: 1, cat: 'versus', min: 2, max: 4 },
  'tien-len': { name: 'Tiến Lên Miền Nam', desc: 'Đánh bài miền Nam: chặn bài, chặt heo bằng tứ quý & đôi thông — hết bài trước thắng!', rounds: 1, cat: 'versus', min: 2, max: 4 },
  'co-vua': { name: 'Cờ Vua', desc: 'Cờ vua chuẩn quốc tế: chiếu hết vua đối thủ — nhập thành, bắt tốt qua đường, phong cấp đủ cả!', rounds: 1, cat: 'versus', min: 2, max: 2 },
  'dua-may-bay': { name: 'Đua Máy Bay', desc: 'Gamepad: lái máy bay xuyên cổng vòng theo màu của bạn — tăng tốc, né mây giông, về đích 10 cổng trước!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'chung-mot-than': { name: 'Chung Một Thân', desc: 'Hợp tác: cả đội lái chung một quả bóng, mỗi người giữ một hướng!', rounds: 1, cat: 'coop', min: 2, max: 8 },
  'day-hop': { name: 'Đẩy Hộp Về Đích', desc: 'Hợp tác: cùng đẩy hộp qua mê cung về ô đích!', rounds: 1, cat: 'coop', min: 2, max: 6 },
  'cheo-thuyen': { name: 'Chèo Thuyền', desc: 'Hợp tác: chèo thuyền theo nhịp, cả đội cùng trúng nhịp mới đi xa!', rounds: 1, cat: 'coop', min: 2, max: 12 },
  'thu-thanh': { name: 'Thủ Thành', desc: 'Hợp tác: bắn hạ đàn slime, giữ pha lê nguyên vẹn đến cuối!', rounds: 1, cat: 'coop', min: 2, max: 8 },
  'nguoi-que': { name: 'Người Que Đại Chiến', desc: 'Gamepad: người que đấu võ — đánh đối thủ văng khỏi sàn!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'den-lua-nuoc': { name: 'Đền Lửa & Nước', desc: 'Hợp tác: Lửa và Nước cùng vượt đền — nhặt ngọc, giữ cổng cho nhau, về đúng cửa!', rounds: 1, cat: 'coop', min: 2, max: 6 },
  'da-bong': { name: 'Đá Bóng Đầu To', desc: 'Gamepad: hai đội đầu to tranh bóng — sút vào gôn đối thủ!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'ech-op': { name: 'Ếch Ộp Phiêu Lưu', desc: 'Hợp tác: hai chú ếch nuốt nhau vào bụng, vác nhau qua gai và hố sâu!', rounds: 1, cat: 'coop', min: 2, max: 4 },
  'can-goc': { name: 'Đại Bác Căn Góc', desc: 'Căn góc + lực như Gunny: chỉnh nòng, tính gió, bắn phá địa hình!', rounds: 1, cat: 'versus', min: 2, max: 8 },
};

// Bot behaviour per difficulty. Bots are simulated server-side from plans
// that are generated when each round/question starts.
const BOT = {
  de:  { quizCorrect: 0.45, quizDelay: [6000, 13000], reactMs: [550, 1200] },
  vua: { quizCorrect: 0.65, quizDelay: [4000, 9000],  reactMs: [320, 700] },
  kho: { quizCorrect: 0.88, quizDelay: [1800, 4800],  reactMs: [170, 370] },
};

const ROOM_TTL_SECONDS = 6 * 3600;
const QUIZ_MS = 15000, QUIZ_REVEAL_MS = 4000;
const ROUND_PAUSE_MS = 3500;
const PLAYLIST_GAP_MS = 8000; // results intermission before a playlist auto-starts its next game
// Tick engine retuned 500ms -> 250ms for smoother motion. Every
// tick-denominated constant was doubled (and per-tick steps/speeds
// halved) so wall-clock behaviour is unchanged: MOVE_STEP 0.5/tick =
// 2 units/s, dash cooldown 12 ticks = 3s, shove cooldown 6 ticks = 1.5s,
// ring shrink 0.5 per 8 ticks = per 2s, dodge invulnerability 8 ticks =
// 2s, ball speed 0.575/tick = 2.3 units/s, bot re-decision every
// 2/4/6 ticks = 0.5s/1s/1.5s as before.
// Retuned again 250ms -> 125ms (same method): per-tick speeds halved,
// tick-counted durations doubled, bot cadences 4/8/12 ticks, crown hold
// points accrue via an accumulator (+1 per 250ms held). Platform
// physics is the exception that proves the rule: with gravity-before-
// move semi-implicit Euler, halving the step needs gravity x0.25
// (A*h^2) and jump velocities re-tuned to the same discrete apexes
// (FIGHT_JUMP 1.2 -> apex 4.2 vs 4.4 before), and per-tick friction
// factors rescale to their square roots so decay per second is kept.
// The TEMPLE game originally stayed on the old 250ms tick (its gate
// slabs shadowed the mid-floor pool jumps — see the note at
// TEMPLE_LEVEL); it has since joined the shared 125ms tick too.
// SMOOTH3: retuned once more 125ms -> 62.5ms (same playbook — see
// SMOOTH_NOTES.md). Per-tick speeds halved, tick counters doubled, bot
// cadences 8/16/24 ticks, crown accumulator threshold 4 ticks. The
// platformers now carry PER-GAME gravities (FIGHT_GRAV / TEMP_GRAV /
// SOCCER_GRAV) tuned on the half-integer discrete family (V = (k+0.5)G,
// apex = G*k^2/2, air = 2k ticks exactly, with the jump velocity
// nudged 0.0003 low so the fall penetrates on the exact return tick
// instead of depending on float dust): fight apex 4.20 / air 30 ticks,
// temple+frog apex 3.15 / air 28, soccer apex ~3.50 / air 28 — the
// discrim numbers are bit-identical to the 125ms build.
const ARENA_R0 = 10, ARENA_RMIN = 4, ARENA_MS = 90000, ARENA_LIVES = 3, TICK_MS = 62.5;
const MOVE_STEP = 0.125, DASH_CD_TICKS = 48, SHOVE_CD_TICKS = 24;
// 16:9 WAVE: the arena family plays in a 32x18 space (x in [-16,16],
// y in [-9,9]) so the TV stage fills a 16:9 screen edge to edge. The
// map from the old 24x24 space scales x by 4/3 and y by 3/4, and the
// per-axis move steps scale identically, so every crossing TIME (the
// tuned feel of every arena game) is bit-identical to before.
const FIELD_HW = 16, FIELD_HH = 9;
const STEP_X = MOVE_STEP * 4 / 3, STEP_Y = MOVE_STEP * 3 / 4;
const CLAMP_X = FIELD_HW - 0.8, CLAMP_Y = FIELD_HH - 0.8; // blob rect clamp (0.8 margin)
// A dash is a x3 speed boost lasting DASH_BOOST_TICKS ticks: 4 ticks
// at 62.5ms reproduces the old single-tick 1.5-unit lunge (3 x 0.5)
// over the same 250ms.
const DASH_BOOST_TICKS = 4;
const SHOVE_RANGE = 2.7, SHOVE_FORCE = 2.7;
// Né Đạn: same tick engine + walled arena (no shrinking, no ring-out).
const DODGE_MS = 105000, DODGE_LIVES = 3, BALL_SPEED = 0.14375, BALL_HIT_DIST = 1.35, INVULN_TICKS = 32;
// Né Laze (ne-dan, redesigned 2026-11-27 on the user's order): beams
// telegraph (warn) then fire across the whole arena. A LOW beam hits
// grounded players — jump it (A). A HIGH beam hits airborne players —
// stay on the ground. Jump: JUMP_TICKS airborne, JUMP_CD_TICKS cooldown.
const LASER_WARN_TICKS = 12, LASER_FIRE_TICKS = 7, LASER_HIT = 1.0, JUMP_TICKS = 10, JUMP_CD_TICKS = 15;
// Chia Hay Cướp: negotiation then secret choice; pot per round, final ×2.
const TALK_MS = 60000, CHOOSE_MS = 15000, POT = 400;
// Cướp Sao: walled arena, bank stars by flying over them; a shove knocks
// one banked point loose as a fresh star (unpickable for DROP_LOCK_TICKS
// ticks so the victim cannot instantly re-grab it). A golden star worth
// 3 spawns every GOLD_EVERY_TICKS ticks (12s) while none is on the field.
const STEAL_MS = 75000, STEAL_SHOVE_FORCE = 4.5, GOLD_EVERY_TICKS = 192, DROP_LOCK_TICKS = 8;
// Giữ Vương Miện: hold the crown for +1 point per 250ms; the holder moves
// at HOLDER_SPEED of normal speed; a shove drops the crown, which then
// cannot be picked up for CROWN_LOCK_TICKS ticks (1s).
const CROWN_MS = 75000, HOLDER_SPEED = 0.9, CROWN_LOCK_TICKS = 16;
// Hợp tác (co-op): no per-player placement. Each co-op game ends with a
// TEAM result: a tier (Vàng/Bạc/Đồng/none) and every player banks the
// same pointsEach (300/200/100/50). See finishCoop().
const TIER_LABELS = { vang: 'VÀNG', bac: 'BẠC', dong: 'ĐỒNG', none: 'CHƯA ĐẠT HUY CHƯƠNG' };
const TIER_POINTS = { vang: 300, bac: 200, dong: 100, none: 50 };
// Chung Một Thân: ONE shared blob steered by split direction ownership;
// checkpoint stars score for the team, cannonballs (slower + sparser
// than Né Đạn) cost shared hearts.
const SHARED_MS = 90000, SHARED_HEARTS = 3, STAR_STALE_TICKS = 240;
const SHARED_BALL_SPEED = 0.1;
// Tiers by checkpoints: >=8 Vàng, >=5 Bạc, >=3 Đồng.
const SHARED_TIERS = [[8, 'vang'], [5, 'bac'], [3, 'dong']];
// Đẩy Hộp Về Đích: crate = circle of radius BOX_CRATE_R; it only moves
// when >=2 distinct players push it with a summed intent of magnitude
// >= BOX_PUSH_MIN. Crate step = MOVE_STEP * BOX_STEP_MUL per tick.
const BOX_MS = 105000, BOX_CRATE_R = 1.6, BOX_STEP_MUL = 0.6, BOX_PUSH_MIN = 1.2;
// Tiers by deliveries: >=3 Vàng, 2 Bạc, 1 Đồng.
const BOX_TIERS = [[3, 'vang'], [2, 'bac'], [1, 'dong']];
// Chèo Thuyền: ROW_BEATS beats every ROW_BEAT_MS; a press within
// +-ROW_WINDOW_MS of a beat is an in-window stroke. A perfect team
// (every player stroking every beat) advances ROW_FULL_STROKE per beat,
// covering ROW_COURSE in ROW_BEATS - 5 beats (pace margin built in).
const ROW_BEATS = 60, ROW_BEAT_MS = 1000, ROW_WINDOW_MS = 260;
const ROW_FULL_STROKE = 10, ROW_COURSE = 400;
const ROW_PERFECT = ROW_BEATS * ROW_FULL_STROKE; // 450 m
// Tiers by % of the perfect-team distance: >=90% Vàng, >=70% Bạc, >=45% Đồng.
const ROW_TIERS = [[90, 'vang'], [70, 'bac'], [45, 'dong']];
// Bot press timing error (+/-ms) by difficulty for Chèo Thuyền.
const ROW_ERR = { kho: 120, vua: 220, de: 380 };
// Xe Tăng Đấu Trường + Thủ Thành share the gun/shell sim: shells fly
// straight at SHELL_SPEED units/tick, firing costs a SHELL_CD_TICKS
// (1s) cooldown, and a player hit costs 1 life + INVULN_TICKS (2s) of
// cover. Xe Tăng cover blocks are arena rects in {x,y,w,h} top-left
// form, kept off the spawn axes so every spawn lane starts clear.
const TANK_MS = 105000, TANK_LIVES = 3, SHELL_SPEED = 0.3, SHELL_CD_TICKS = 16, SHELL_HIT_DIST = 1.0;
const TANK_BLOCKS = [
  { x: 2.9, y: -2.4, w: 2.7, h: 1.1 }, { x: -5.6, y: 1.35, w: 2.7, h: 1.1 },
  { x: -5.6, y: -2.4, w: 2.7, h: 1.1 }, { x: 2.9, y: 1.35, w: 2.7, h: 1.1 },
];
// Tank arena variants (Round 33): layout 0 is the classic four-block
// field; 1 adds a centre cross + far corners (Tank-Trouble-like maze);
// 2 is a broken fortress around the centre. All keep the right-hand
// spawn corridor (x > 8, |y| < 1.5) clear — discrim's drive lives there.
const TANK_LAYOUTS = [
  TANK_BLOCKS,
  TANK_BLOCKS.concat([
    { x: -1.35, y: -3.4, w: 2.7, h: 1.1 }, { x: -1.35, y: 2.3, w: 2.7, h: 1.1 },
    { x: -11, y: 3.4, w: 2.7, h: 1.1 }, { x: 8.3, y: -4.5, w: 2.7, h: 1.1 },
  ]),
  [
    { x: -3.4, y: -1.7, w: 1.1, h: 3.4 }, { x: 2.3, y: -1.7, w: 1.1, h: 3.4 },
    { x: -1.7, y: -3.9, w: 3.4, h: 1.1 }, { x: -1.7, y: 2.8, w: 3.4, h: 1.1 },
    { x: -13.5, y: -4.5, w: 2.7, h: 1.1 }, { x: 10.8, y: 3.4, w: 2.7, h: 1.1 },
  ],
  // Layout 3 "Kho Gỗ": the classic four stone blocks plus five wooden
  // crates (soft: a shell destroys the crate instead of just dying).
  TANK_BLOCKS.concat([
    { x: -1.35, y: -0.55, w: 2.7, h: 1.1, soft: 1 }, { x: -8.3, y: -0.55, w: 2.7, h: 1.1, soft: 1 },
    { x: 5.3, y: -0.55, w: 2.7, h: 1.1, soft: 1 }, { x: -1.35, y: -3.4, w: 2.7, h: 1.1, soft: 1 },
    { x: -1.35, y: 2.3, w: 2.7, h: 1.1, soft: 1 },
  ]),
];
// Đặt Bom: 15x9 grid of 2-unit cells over the wide arena; hard pillars sit
// on odd/odd cells (classic bomber layout), soft blocks are dealt per
// match with Math.random so tests can queue the exact layout.
const BOM_MS = 105000, BOM_LIVES = 2, BOM_COLS = 15, BOM_ROWS = 9, BOM_FUSE_TICKS = 32, BOM_SOFT_P = 0.62;
// Kẻ Giả Mạo: one secret impostor per round secretly gets the variant
// Ma Sói: hidden-role deduction. One night = wolves hunt + guard /
// seer / witch act in the same window (the witch sees the wolves'
// victim only once every living wolf has locked a vote), then dawn
// announces the dead (roles are public from death on), the village
// discusses and votes an execution. Side points: winning wolves 300
// each, winning villagers 200 each, losers 50 each (dead members of
// the winning side score the same — the side wins or loses together).
// NIGHT_CAP bounds a game whose guard keeps saving perfectly: at the
// cap the larger living side wins (a tie goes to the wolves, matching
// the parity rule).
const WOLF_NIGHT_MS = 45000, WOLF_DAWN_MS = 10000, WOLF_DISCUSS_MS = 60000,
  WOLF_VOTE_MS = 30000, WOLF_EXEC_MS = 10000, WOLF_END_MS = 12000, WOLF_NIGHT_CAP = 15;
const WOLF_ROLES = {
  soi: { name: 'Sói', icon: '🐺' },
  'tien-tri': { name: 'Tiên Tri', icon: '🔮' },
  'bao-ve': { name: 'Bảo Vệ', icon: '🛡️' },
  'phu-thuy': { name: 'Phù Thủy', icon: '🧙' },
  dan: { name: 'Dân Làng', icon: '🧑‍🌾' },
};
// Bot lines for the Ma Sói day discussion: deliberately generic — a
// bot must never reference roles, night events or anything it could
// only know secretly (same rule as IMP_CHAT_LINES).
const WOLF_CHAT_LINES = [
  'Đêm qua ghê quá… mọi người cẩn thận nhé.',
  'Tôi là dân thường thôi, thề luôn!',
  'Ai nãy giờ im lặng bất thường ấy nhỉ?',
  'Bình tĩnh, đừng treo nhầm người tốt.',
  'Tôi nghi người ít nói nhất hôm nay.',
  'Cứ theo linh cảm của cả làng thôi.',
  'Ai cũng có vẻ đáng nghi hết trơn…',
  'Hôm nay phải tìm cho ra sói!',
];
// Cờ Cá Ngựa (Vietnamese Ludo): a horse's progress p means 0 = stable,
// 1..51 on the shared 52-cell loop at (startOffset + p - 1) mod 52,
// 52..57 in the seat's home stretch, 58 = finished (exact roll needed
// to land on 58; overshoot is simply not a legal move for that horse).
// Safe loop cells (no kicking): the 4 start cells + each seat's
// home-entry cell (the last loop cell before its home stretch).
// Own horses stack freely on a cell; an opponent landing on a
// non-safe cell kicks the WHOLE opposing stack back to its stable.
// No blockade rule: passing over any horse is always allowed.
// Three sixes in a row forfeit the third roll's move (classic rule).
const NGUA_TURN_MS = 30000, NGUA_BOT_MS = 900, NGUA_BEAT_MS = 1500, NGUA_WIN_MS = 4000;
const CHESS_TURN_MS = 120000, CHESS_BOT_MS = 900, CHESS_END_MS = 5000;
const FLY_MS = 90000, FLY_GATES_WIN = 10, FLY_GATE_R = 6.5;
// Tiến Lên Miền Nam: 30s per turn (wall clock, like Cá Ngựa); bots act
// ~1s into their turn; the winner banner holds 5s before results.
const TL_TURN_MS = 30000, TL_BOT_MS = 900, TL_WIN_MS = 5000;
const NGUA_OFFSETS = [0, 13, 26, 39];
const NGUA_SAFE = new Set([0, 13, 26, 39, 50, 11, 24, 37]);
// The 52-cell loop on a 15x15 board as [col, row] pairs, starting at
// seat board 0's start cell (1,6) and running (1,6)->(5,6)->up the
// top-left arm->across the top->down the right->across the bottom->
// up the left back to (0,6). Start cells sit at indices 0/13/26/39,
// home-entry cells at 50/11/24/37, exactly NGUA_OFFSETS/NGUA_SAFE.
export const NGUA_LOOP = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12],
  [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8],
  [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],
];
// Home stretches (progress 52..57) per board index, running toward
// the centre cell (7,7); stables (progress 0) per board index.
export const NGUA_STRETCH = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
];
export const NGUA_STABLE = [
  [[1, 1], [4, 1], [1, 4], [4, 4]],
  [[10, 1], [13, 1], [10, 4], [13, 4]],
  [[10, 10], [13, 10], [10, 13], [13, 13]],
  [[1, 10], [4, 10], [1, 13], [4, 13]],
];
// Thủ Thành: the crystal's remaining HP decides the tier on survival.
const DEF_MS = 90000, DEF_CRYSTAL_HP = 10;
const DEF_TIERS = [[7, 'vang'], [4, 'bac'], [1, 'dong']];
// ---------------------------------------------------------------------------
// Wave 4: the two PLATFORMER games (Người Que Đại Chiến + Đền Lửa & Nước)
// share one small platform-physics helper (platStep below): entities are
// centre-anchored AABBs {x, y, vx, vy, hw, hh, ground}; solids are
// top-left rects {x, y, w, h} exactly like TANK_BLOCKS, in the arena's
// [-12, 12] unit space so the page's % mapping works unchanged. Gravity
// is applied BEFORE the move each tick (semi-implicit Euler), so the
// discrete jump apex for velocity V is sum(V - k*GRAV) over the rising
// ticks: at the 125ms tick, V=1.2 -> ~4.2 units, V=1.05 -> ~3.15 units
// (the pre-retune 250ms values were V=2.6 -> ~4.4, V=2.2 -> ~3.0).
// Every step-up in both stages below is sized against those apexes,
// never the naive V²/2G.
// SMOOTH3 (62.5ms tick): gravity is per-game. Each pair below sits on
// the half-integer family V = (k + 0.5) * G: apex = G * k^2 / 2 and
// air time = 2k ticks EXACTLY (the fall returns to launch height on
// the final tick), and each jump velocity is shaved by 0.0003 so the
// return tick penetrates the floor by ~0.01u instead of relying on
// binary float dust to miss the strict-overlap test (the 125ms temple
// arc only made its 14th tick that way). Fight: k=15 -> apex 4.20,
// air 30 ticks = 1875ms. Temple/frog: k=14 -> apex 3.15, air 28 ticks
// = 1750ms. Soccer: k=14 -> apex ~3.50, air 28 ticks = 1750ms.
const FIGHT_GRAV = 0.0373333, TEMP_GRAV = 0.0321429, SOCCER_GRAV = 0.0357143;
const PLAT_MAXFALL = 0.65, PLAT_HW = 0.45, PLAT_HH = 0.9;
// Người Que Đại Chiến: %-based knockback fighting on an open stage.
// A hit adds FIGHT_DMG %; the knockback force 0.3 + dmg*0.025 is applied
// AFTER the damage lands, so the same punch flies further the more
// hurt the victim already is. Ring-out (past the blast bounds) costs a
// life; respawn is on the top platform, damage reset, 2s invulnerable.
const FIGHT_MS = 90000, FIGHT_LIVES = 3;
// SMOOTH3: FIGHT_JUMP = 15.5 * FIGHT_GRAV - 0.0003 (apex 4.20, air
// 30 ticks); FIGHT_DJUMP = 13.5 * FIGHT_GRAV - 0.0003 (apex ~3.15,
// air 26 ticks — the double jump keeps the temple arc's height).
const FIGHT_RUN = 0.17, FIGHT_JUMP = 0.5783667, FIGHT_DJUMP = 0.5037;
const FIGHT_ATK_CD = 12, FIGHT_DMG = 10, FIGHT_HITSTUN = 12;
// Heavy swing (pad X): own cooldown, +16% and 1.5x the knockback
// force of a normal hit at the same resulting damage; the attacker's
// recovery (hvyT, the big-swing pose) runs 12 ticks.
const FIGHT_HVY_CD = 20, FIGHT_HVY_DMG = 16, FIGHT_HVY_ATK_T = 12;
const WPN_SPAWN_TICKS = 144, WPN_MAX_FIELD = 2, GUN_AMMO = 6, GUN_CD = 14, GUN_HVY_CD = 26, BULLET_SPEED = 1.6, SWORD_DMG = 14, SWORD_HVY_DMG = 22, GUN_DMG = 8;
const FIGHT_DASH_CD = 32, FIGHT_DASH_TICKS = 12, FIGHT_DASH_SPEED = 0.475;
// 16:9 WAVE: platforms are the old layout under the arena map
// (x*4/3, y*3/4). Vertical gaps SHRINK (4.0 -> 3.0 < jump apex 4.2)
// and horizontal gaps grow by 4/3 (still far inside the ~5.4u jump
// range), so every proven route keeps working; physics untouched.
const FIGHT_PLATFORMS = [
  { x: -11.33, y: 4.5, w: 22.67, h: 1.9 },
  { x: -10.67, y: 1.5, w: 6, h: 0.5, oneWay: true },
  { x: 4.67, y: 1.5, w: 6, h: 0.5, oneWay: true },
  { x: -3.33, y: -1.13, w: 6.67, h: 0.5, oneWay: true },
];
// Stick-fight stage variants (Round 33): same ground and same heights
// everywhere (the jump arc is a measured invariant); only the floating
// platforms move. Every layout keeps the x = -2.7 column clear at mid
// height so a straight jump from spawn 2 runs the full arc.
const FIGHT_LAYOUTS = [
  FIGHT_PLATFORMS,
  [
    { x: -11.33, y: 4.5, w: 22.67, h: 1.9 },
    { x: -13.8, y: 1.5, w: 6, h: 0.5, oneWay: true },
    { x: 3.4, y: 1.5, w: 6, h: 0.5, oneWay: true },
    { x: -8.5, y: -1.13, w: 5, h: 0.5, oneWay: true },
  ],
  [
    { x: -11.33, y: 4.5, w: 22.67, h: 1.9 },
    { x: -6.4, y: 1.5, w: 3.2, h: 0.5, oneWay: true },
    { x: 0.6, y: 1.5, w: 3.2, h: 0.5, oneWay: true },
    { x: -1.8, y: -1.13, w: 3.6, h: 0.5, oneWay: true },
  ],
];
// First four are the original 4-player spawns (x*4/3); players 5-8
// fill the gaps so an 8-fighter match never stacks two fighters on
// one spot.
const FIGHT_SPAWN_X = [-8, -2.7, 2.7, 8, -10.7, -5.3, 5.3, 10.7];
// Đền Lửa & Nước: co-op temple. Seats alternate elements by seat order
// (odd seat = Lửa 'lua', even = Nước 'nuoc'). One handcrafted enclosed
// level: three floors, element pools, colour-locked gems, and one
// linked pair of pressure gates — the portcullis slabs beside the two
// balcony stairs stay down unless SOMEONE stands on a button: button 1
// sits on a ledge on the Nước side, button 2 on the balcony itself, so
// the first climber is held up by a partner and then holds the gate
// for them in turn. Wrong-element (or green) pool = death: respawn at
// the element start, the team loses one of TEMP_HEARTS hearts.
const TEMP_MS = 200000, TEMP_HEARTS = 5; // 150s at the old 24-wide level, scaled by the 32/24 width so the wide temple keeps the same time budget per unit of travel
// Temple runs on the shared tick with its own platform gravity
// (TEMP_GRAV / PLAT_MAXFALL via platStep), rescaled like the
// fighter's: TEMP_RUN is the old 0.65 per 250ms tick quartered, and
// TEMP_JUMP reproduces the old discrete arc (apex 3.15 vs the
// old 3.0; air time 14 ticks = 1750ms and jump range 4.55u, both
// exactly the old values). It originally kept its own 250ms tick
// because gate slab 2 began at x 5.5, only 0.2 past the mid-floor red
// pool's end (5.3): a pool-jump takeoff from the pool's edge clears
// the slab's shadow in the first tick at 0.65u/tick but not at
// 0.325u/tick — the jumper stayed under the slab, head-bonked, and
// dropped into the lethal pool (mirrored at gate 1 / the blue pool).
// Both slabs now sit 0.4 further out (gate 1 x -6.6, gate 2 x 5.9),
// which reopens that first-tick window while the slabs still flank
// the balcony stairs and block the climb exactly as before (the 0.4
// gap to the balcony edge is narrower than a character's 0.9 body,
// and a stair jump's apex never rises past the slab tops).
// SMOOTH3: TEMP_JUMP = 14.5 * TEMP_GRAV - 0.0003 (apex 3.15, air
// 28 ticks = 1750ms, jump range 28 * 0.1625 = 4.55u — unchanged).
const TEMP_RUN = 0.1625, TEMP_JUMP = 0.4657714;
// 16:9 WAVE: the temple is re-laid for the 32x18 field WITHOUT
// touching physics: every feature keeps its local relationships —
// left-side features shift -4, right-side +4, centre-spanning solids
// stretch, and all y coordinates scale by 3/4 (steps get SHORTER, so
// every proven jump keeps working; pool widths and the gate-slab /
// pool-end gaps are preserved to the centimetre).
// SMOOTH3 (62.5ms): the two mid-floor side pools shift 0.4 toward
// the centre (blue -9.3 -> -8.9, red 6.9 -> 6.5). At 125ms a jump
// off the mid floor beside a gate slab cleared BOTH the slab's
// head-bonk shadow and the pool's feet band in one tick (x-step
// 0.325, rise 0.90; the slab margin was 0.015). At 62.5ms (x-step
// 0.1625, first-tick rise 0.434 < the 0.45 band depth) no takeoff
// position satisfied both, so that jump was impossible; the shift
// reopens a 0.3u takeoff window. The slabs cannot move instead:
// 0.4 further out they would overlap the balcony stairs. Widths,
// kinds and the bottom pools are unchanged.
const TEMPLE_LEVEL = {
  solids: [
    { x: -16, y: 7.5, w: 32, h: 1.8 },
    { x: -16, y: -9, w: 1, h: 16.5 },
    { x: 15, y: -9, w: 1, h: 16.5 },
    { x: -16, y: -9, w: 32, h: 0.75 },
    { x: -14.9, y: 5.1, w: 2.2, h: 0.53, oneWay: true },
    { x: 12.7, y: 5.1, w: 2.2, h: 0.53, oneWay: true },
    { x: -12.5, y: 2.7, w: 25, h: 0.75, oneWay: true },
    { x: -12.9, y: 0.6, w: 2, h: 0.53, oneWay: true },
    { x: 10.9, y: 0.6, w: 2, h: 0.53, oneWay: true },
    { x: -9.5, y: -2.1, w: 19, h: 0.75, oneWay: true },
    { x: 12.6, y: 0.4, w: 2.3, h: 0.53, oneWay: true },
  ],
  gates: [
    { x: -10.6, y: -3.9, w: 0.7, h: 4.5 },
    { x: 9.9, y: -3.9, w: 0.7, h: 4.5 },
  ],
  buttons: [
    { x: 13.2, y: -0.05, w: 1.1, h: 0.45 },
    { x: -0.55, y: -2.55, w: 1.1, h: 0.45 },
  ],
  pools: [
    { x: -10.2, y: 7.05, w: 2.8, h: 0.45, kind: 'red' },
    { x: -1.4, y: 7.05, w: 2.8, h: 0.45, kind: 'green' },
    { x: 7.4, y: 7.05, w: 2.8, h: 0.45, kind: 'blue' },
    { x: -8.9, y: 2.25, w: 2.4, h: 0.45, kind: 'blue' }, // SMOOTH3: -9.3 -> -8.9 (see the SMOOTH3 pool note below)
    { x: -1.1, y: 2.25, w: 2.2, h: 0.45, kind: 'green' },
    { x: 6.5, y: 2.25, w: 2.4, h: 0.45, kind: 'red' }, // SMOOTH3: 6.9 -> 6.5 (see the SMOOTH3 pool note below)
  ],
  gems: [
    { x: -8.8, y: 6.4, el: 'lua' }, { x: -0.7, y: 5.8, el: 'lua' }, { x: -8.1, y: -0.3, el: 'lua' },
    { x: 11.8, y: 2.0, el: 'lua' }, { x: -7.9, y: -0.6, el: 'lua' },
    { x: 8.8, y: 6.4, el: 'nuoc' }, { x: 0.7, y: 5.8, el: 'nuoc' }, { x: 8.1, y: -0.3, el: 'nuoc' },
    { x: -11.8, y: 2.0, el: 'nuoc' }, { x: 13.7, y: -0.3, el: 'nuoc' },
  ],
  doors: {
    lua: { x: -9.4, y: -3.45, w: 1.7, h: 1.35 },
    nuoc: { x: 7.7, y: -3.45, w: 1.7, h: 1.35 },
  },
  starts: { lua: { x: -13.5, y: 6.6 }, nuoc: { x: 13.5, y: 6.6 } },
};
// Bot waypoint routes through the temple (target = character centre).
// The bot brain adds two generic rules on top of plain steering: jump
// when a waypoint sits above and the bot is close + grounded, and jump
// any pool ahead that is lethal to the bot's own element. 'holdBtn'
// waypoints park the bot on a gate button until every other character
// is on the balcony (centre y < 1.0) or home, with a 30s timeout so a
// stuck partner can never freeze the bot forever.
const TEMPLE_WP = {
  lua: [
    { x: -13.8, y: 4.2 }, { x: -2.6, y: 1.8 }, { x: 0.5, y: 1.8 },
    { x: -11.9, y: -0.3 }, { x: -8.9, y: -3.0 },
    { x: -0.45, y: -3.0, holdBtn: true }, { x: -8.55, y: -3.0 },
  ],
  nuoc: [
    { x: 13.8, y: 4.2 }, { x: 2.6, y: 1.8 },
    { x: 13.7, y: -0.5, holdBtn: true },
    { x: 0.5, y: 1.8 }, { x: 11.9, y: -0.3 }, { x: 8.55, y: -3.0 },
    { x: 0.45, y: -3.0, holdBtn: true }, { x: 8.55, y: -3.0 },
  ],
};
// Temple finish tiers: completed + every gem = Vàng, completed = Bạc,
// at least half of all gems (even unfinished) = Đồng.
const TEMP_GEMS_TOTAL = 10;

// ---------------------------------------------------------------------------
// Wave 5: Đá Bóng Đầu To (versus team soccer), Ếch Ộp Phiêu Lưu (co-op
// swallow-carry platformer) and Đại Bác Căn Góc (turn-based artillery).
// ---------------------------------------------------------------------------
// --- Đá Bóng Đầu To -------------------------------------------------------
// Side-view pitch in its own 32 x 18 unit space (x in [-19, 19] inside
// the goal boxes, y in [-9, 9]); the page maps it with the .afield.wide
// 16:9 variant. Teams by seat parity: odd seats = Đỏ (defend the LEFT
// goal, attack right), even seats = Xanh. Players run on platStep; the
// ball is a circle with its own integrator (gravity, restitution,
// rolling friction, circle-vs-rect bounces off the same solids list).
// Control map (phone + APK): disc/stick = run, U or Y = jump,
// A = SÚT (kick), B = LƯỚT (dash). A goal pauses the match clock for a
// 2.5s celebration, then everyone resets to the kickoff formation.
const SOCCER_MS = 120000, SOCCER_GOAL_MS = 2500;
// SMOOTH3: SOCCER_JUMP = 14.5 * SOCCER_GRAV - 0.0003 (apex ~3.50,
// air 28 ticks); ball gravity follows the x0.25 discrete rule.
const SOCCER_RUN = 0.18, SOCCER_JUMP = 0.5175571;
const SOCCER_KICK_CD = 12, SOCCER_KICK_VX = 0.44, SOCCER_KICK_VY = 0.31;
const SOCCER_DASH_CD = 32, SOCCER_DASH_TICKS = 12, SOCCER_DASH_SPEED = 0.475;
const SOCCER_BALL_R = 0.55, SOCCER_BALL_GRAV = 0.0225, SOCCER_BALL_REST = 0.62;
const SOCCER_SOLIDS = [
  { x: -19, y: 8, w: 38, h: 1.6 },
  { x: -19, y: -9.6, w: 38, h: 0.6 },
  { x: -17, y: -9, w: 1, h: 14.4 },
  { x: 16, y: -9, w: 1, h: 14.4 },
  { x: -19, y: 4.8, w: 3, h: 0.6 },
  { x: 16, y: 4.8, w: 3, h: 0.6 },
  { x: -19, y: -9, w: 1, h: 17 },
  { x: 18, y: -9, w: 1, h: 17 },
];
const SOCCER_FWD_X = [-4, -7, -10.5]; // forward slots (goalie is separate)
const SOCCER_GOALIE_X = 13.8;
// --- Ếch Ộp Phiêu Lưu -----------------------------------------------------
// Co-op platformer in the temple's 24 x 24 space. Solo jump V=1.05 is
// the temple arc (apex 3.15, range ~4.55u at run 0.325, ~4.2u of safe
// spike clearance); a carrier's jump V=1.45 is far bigger (apex ~6.3,
// range ~6.2u, ~5.9u clearance) — the wide spike strips (5.2u) are
// sized exactly between the two, so they can ONLY be crossed carrying
// a teammate (or by being carried). Swallow/spit is the B or X rising
// edge near a free teammate; the passenger rides hidden in the belly.
// A carrier touching spikes kills BOTH frogs for ONE shared heart.
const FROG_HEARTS = 5, FROG_PER_MS = 120000;
// SMOOTH3: frogs fly on TEMP_GRAV; FROG_JUMP = TEMP_JUMP (air 28
// ticks, range 4.55u); FROG_JUMP_CARRY = 19.5 * TEMP_GRAV - 0.0003
// (air 38 ticks, range 38 * 0.1625 = 6.175u — the spike-strip sizing
// arithmetic is unchanged; apex ~5.80 vs ~6.30 before, clearance is
// governed by range, not apex).
const FROG_RUN = 0.1625, FROG_JUMP = 0.4657714, FROG_JUMP_CARRY = 0.6264857;
const FROG_EAT_R = 1.25;
// 16:9 WAVE: chambers re-laid for the 32x18 field with physics
// untouched: spike strips keep their exact widths (5.2u still fits
// between the solo jump range 4.55 and the carrier range 6.2), all
// vertical rises scale by 3/4 (easier, never harder), and every
// proven route - swallow-carry, crate climb, crate glide - keeps
// the same shape with wider margins.
const FROG_WALLS = [
  { x: -16, y: 7.5, w: 32, h: 1.8 },
  { x: -16, y: -9, w: 1, h: 16.5 },
  { x: 15, y: -9, w: 1, h: 16.5 },
  { x: -16, y: -9, w: 32, h: 0.75 },
];
const FROG_LEVELS = [
  { // Chamber 1 - the first spike strip: too wide to jump alone.
    solids: [{ x: 3.6, y: 5.4, w: 3, h: 0.53, oneWay: true }],
    spikes: [{ x: -2.6, y: 7.05, w: 4.9, h: 0.45 }],
    crates: [],
    flies: [{ x: -6, y: 5.7 }, { x: 0, y: 1.3 }, { x: 5.1, y: 2.9 }],
    door: { x: 13.9, y: 6.15, w: 1.8, h: 1.35 },
    starts: [{ x: -13.5, y: 6.6 }, { x: -11.9, y: 6.6 }, { x: -10.3, y: 6.6 }, { x: -8.7, y: 6.6 }],
  },
  { // Chamber 2 - push the crate against the plateau, climb it, cross.
    solids: [{ x: 5, y: 3.3, w: 8, h: 4.2 }],
    spikes: [{ x: -6.5, y: 7.05, w: 2, h: 0.45 }],
    crates: [{ x: 0.2, y: 6.9 }],
    flies: [{ x: -8.5, y: 5.7 }, { x: -4.8, y: 4.35 }, { x: 8, y: 1.5 }],
    door: { x: 9.3, y: 1.95, w: 1.7, h: 1.35 },
    starts: [{ x: -13.5, y: 6.6 }, { x: -11.9, y: 6.6 }, { x: -10.3, y: 6.6 }, { x: -8.7, y: 6.6 }],
  },
  { // Chamber 3 - a carrier strip (A: -9.5..-4.3), a mid safe zone with
    // the crate, then strip B (8.2..10.5) running right up to the plateau
    // face: push the crate across B (crates are spike-immune), hop onto
    // it from the safe edge, then up to the plateau.
    solids: [{ x: 10.5, y: 4.2, w: 4.5, h: 3.3 }],
    spikes: [{ x: -9.5, y: 7.05, w: 5.2, h: 0.45 }, { x: 8.2, y: 7.05, w: 2.3, h: 0.45 }],
    crates: [{ x: 1.2, y: 6.9 }],
    flies: [{ x: -11.3, y: 5.7 }, { x: -7.85, y: 1.2 }, { x: 12.6, y: 2.4 }],
    door: { x: 12.8, y: 2.85, w: 1.7, h: 1.35 },
    starts: [{ x: -13.8, y: 6.6 }, { x: -12.9, y: 6.6 }, { x: -12.0, y: 6.6 }, { x: -11.1, y: 6.6 }],
  },
];
const FROG_WP = [
  [{ x: -7.0 }, { x: -4.2, swallow: 1 }, { x: 3.8, spit: 1 }, { x: 14.8 }],
  [{ x: -7.6 }, { x: 0.2 }, { x: 4.4, y: 5.4 }, { x: 6.0, y: 3.53 }, { x: 10.15 }],
  [{ x: -10.6, swallow: 1 }, { x: -3.6, spit: 1 }, { x: 1.2 }, { x: 8.6 }, { x: 9.9, y: 5.4 }, { x: 11.6, y: 4.05 }, { x: 13.65 }],
];

// --- Đại Bác Căn Góc ------------------------------------------------------
// Turn-based artillery on a 120-column heightmap over a 24 x 16 space
// (x in [-12, 12], y in [-8, 8], y grows DOWN: a column's height value
// is the y of its ground surface). Shells integrate in 4 substeps per
// tick with gravity + wind; the boom carves a circular crater and
// damage falls off linearly from CANNON_DMG at the centre. Control
// map: pad U/D sweeps the barrel angle (5-85 deg), pad L/R sweeps
// power (0-100), X flips facing, A fires; the 'setAim' action sets
// angle/power/face exactly (sliders / tests). NO trajectory preview.
const CANNON_COLS = 160, CANNON_AIM_MS = 30000, CANNON_BOOM_MS = 800, CANNON_MATCH_MS = 360000;
// SMOOTH3: per-tick totals halve at the 62.5ms tick — grav and windK
// halve (each tick applies sub x (value/sub)), maxV (a per-tick
// velocity) halves; sub stays 4 so the integration shape is kept.
export const BALLISTICS = { grav: 0.025, sub: 4, maxV: 0.8, windK: 0.00075, blastR: 2.2, dmgMax: 60 };
// SMOOTH3 note: grav and windK are accelerations — when the tick
// halved they QUARTERED (0.10 -> 0.025, 0.003 -> 0.00075), because
// per-second acceleration is g / T^2. maxV is a velocity and halved.
// (An earlier draft halved grav too; the shell's range, v^2/g,
// halved with it and the snipe solver found no solutions.)
const CANNON_HP = 100;

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
// After a worker-side mutation (join / action) is saved, nudge the room's
// Durable Object so any WebSocket clients attached to it receive the new
// views immediately and the tick alarm stays armed. Fire-and-forget via
// waitUntil: the HTTP response — above all the tiny pad ack — must never
// wait on it, and a failed poke changes nothing (polls + alarm recover).
function pokeRoom(env, code, ctx) {
  if (!env.ROOMS_DO) return;
  const p = roomStub(env, code).fetch('https://room/poke', { method: 'POST' }).catch(() => {});
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
}

// Durable Object holding one room. Internal protocol (only loadRoom /
// saveRoom / deleteRoom / pokeRoom talk to it over fetch):
//   GET    /get    → 200 with the room JSON text, or 404 if absent/expired
//   PUT    /put    → store the room JSON text with a fresh expiry, 200
//   POST   /delete → clear the room, 200
//   GET    /ws     → WebSocket upgrade (worker-validated identity arrives
//                    as x-np-role / x-np-seat / x-np-token headers and is
//                    re-checked against the stored room before accept)
//   POST   /poke   → a worker-side HTTP mutation was saved: broadcast the
//                    fresh views to attached sockets and re-check the alarm
// The stored value is an envelope { json, expiresAt } under the key 'room';
// expiry is logical (checked on /get) because DO storage has no TTL.
//
// WebSocket channel (hibernation API): sockets are tagged by role/seat and
// carry { role, seat, token } as their attachment. Server→client messages:
//   {"type":"state","view":<the exact object GET /state returns for that
//   recipient>} — sent only when the serialized view (with the serverNow
//   clock field neutralized, since it changes on every call) differs from
//   the last one sent to that socket; {"type":"error","error":...} for a
//   rejected client action; {"type":"bye"} right before a fatal close
//   (bad identity, room deleted/expired). Client→server messages are the
//   POST /action body minus token/role and dispatch through the very same
//   advance/hostAction/playerAction pipeline as HTTP. While a game is
//   active and at least one socket is attached, a storage alarm every
//   TICK_MS advances the sim so ticks no longer depend on anyone polling.
