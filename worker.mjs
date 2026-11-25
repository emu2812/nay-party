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
export const IMPOSTOR_BANK = [
  { cat: 'Địa lý', real: 'Thủ đô của nước Pháp là thành phố nào?', fake: 'Thủ đô của nước Ý là thành phố nào?', options: ['Paris', 'Rome', 'Berlin', 'Madrid'] },
  { cat: 'Thiên văn', real: 'Hành tinh nào gần Mặt Trời nhất?', fake: 'Hành tinh nào xa Mặt Trời nhất trong bốn hành tinh này?', options: ['Sao Thủy', 'Sao Kim', 'Sao Hỏa', 'Sao Mộc'] },
  { cat: 'Động vật', real: 'Loài nào trong bốn loài này đẻ trứng?', fake: 'Loài nào trong bốn loài này đẻ con?', options: ['Gà', 'Chó', 'Mèo', 'Lợn'] },
  { cat: 'Đời sống', real: 'Một tuần có bao nhiêu ngày?', fake: 'Một tháng có khoảng bao nhiêu tuần?', options: ['4', '7', '12', '30'] },
  { cat: 'Thể thao', real: 'Một đội bóng đá có bao nhiêu cầu thủ trên sân?', fake: 'Một đội bóng rổ có bao nhiêu cầu thủ trên sân?', options: ['5', '7', '9', '11'] },
  { cat: 'Cơ thể', real: 'Người trưởng thành có tối đa bao nhiêu chiếc răng vĩnh viễn?', fake: 'Một bàn tay người có bao nhiêu ngón?', options: ['5', '10', '28', '32'] },
  { cat: 'Việt Nam', real: 'Vịnh Hạ Long thuộc tỉnh nào?', fake: 'Đảo Phú Quốc thuộc tỉnh nào?', options: ['Quảng Ninh', 'Kiên Giang', 'Khánh Hòa', 'Bình Thuận'] },
  { cat: 'Văn học', real: 'Truyện Kiều là tác phẩm của ai?', fake: 'Truyện Lục Vân Tiên là tác phẩm của ai?', options: ['Nguyễn Du', 'Nguyễn Đình Chiểu', 'Hồ Xuân Hương', 'Nguyễn Trãi'] },
  { cat: 'Khoa học', real: 'Ở áp suất thường, nước sôi ở bao nhiêu độ C?', fake: 'Ở áp suất thường, nước đóng băng ở bao nhiêu độ C?', options: ['0', '50', '90', '100'] },
  { cat: 'Động vật', real: 'Loài nào có sọc đen trắng và thích ăn tre trúc?', fake: 'Loài nào có sọc đen trắng và sống ở đồng cỏ châu Phi?', options: ['Gấu trúc', 'Ngựa vằn', 'Hổ', 'Gấu mèo'] },
  { cat: 'Địa lý', real: 'Ngọn núi nào cao nhất Việt Nam?', fake: 'Ngọn núi nào cao nhất thế giới?', options: ['Fansipan', 'Everest', 'Phú Sĩ', 'Bà Đen'] },
  { cat: 'Ẩm thực', real: 'Bánh chưng truyền thống có hình gì?', fake: 'Bánh tét truyền thống có hình gì?', options: ['Hình vuông', 'Hình tròn dài', 'Hình tam giác', 'Hình trăng khuyết'] },
  { cat: 'Âm nhạc', real: 'Đàn guitar thông thường có bao nhiêu dây?', fake: 'Đàn violin thông thường có bao nhiêu dây?', options: ['4', '5', '6', '7'] },
  { cat: 'Toán học', real: 'Hình tam giác có bao nhiêu cạnh?', fake: 'Hình ngũ giác có bao nhiêu cạnh?', options: ['3', '4', '5', '6'] },
  { cat: 'Sinh học', real: 'Con nhện có bao nhiêu chân?', fake: 'Côn trùng trưởng thành có bao nhiêu chân?', options: ['4', '6', '8', '10'] },
  { cat: 'Địa lý', real: 'Sa mạc nào lớn nhất thế giới?', fake: 'Đại dương nào lớn nhất thế giới?', options: ['Sahara', 'Thái Bình Dương', 'Đại Tây Dương', 'Gobi'] },
  { cat: 'Thể thao', real: 'Một hiệp bóng đá kéo dài bao nhiêu phút?', fake: 'Một hiệp bóng rổ FIBA kéo dài bao nhiêu phút?', options: ['10', '12', '40', '45'] },
  { cat: 'Văn hóa', real: 'Tết Nguyên Đán là ngày đầu của tháng mấy âm lịch?', fake: 'Tết Trung Thu là rằm tháng mấy âm lịch?', options: ['Tháng 1', 'Tháng 5', 'Tháng 8', 'Tháng 12'] },
];

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
  'ne-dan': { name: 'Né Đạn', desc: 'Gamepad: né đạn pháo, sống sót đến cuối!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'keo-co': { name: 'Kéo Co', desc: 'Hai đội bấm nút B, kéo nút thắt về phía mình!', rounds: 1, cat: 'versus', min: 2, max: 12 },
  // Rounds for Chia Hay Cướp are dynamic: one round per seated player
  // (pairs rotate, see beginRound), so `rounds` here is only nominal.
  'chia-cuop': { name: 'Chia Hay Cướp', desc: 'Thương lượng 60 giây rồi chọn bí mật: Chia hay Cướp?', rounds: 4, cat: 'versus', min: 2, max: 12 },
  'cuop-sao': { name: 'Cướp Sao', desc: 'Gamepad: nhặt sao, xô đối thủ cho rơi sao!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'giu-vuong-mien': { name: 'Giữ Vương Miện', desc: 'Gamepad: giành vương miện và giữ càng lâu càng tốt!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'son-san': { name: 'Sơn Sàn', desc: 'Gamepad: chạy sơn sàn, chiếm thật nhiều ô!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'cao-boi': { name: 'Cao Bồi', desc: 'Đợi hiệu lệnh BẮN — rút súng nhanh nhất!', rounds: 5, cat: 'versus', min: 2, max: 8 },
  'xe-tank': { name: 'Xe Tăng Đấu Trường', desc: 'Gamepad: lái xe tăng, bắn hạ đối thủ, núp sau vật chắn!', rounds: 1, cat: 'versus', min: 2, max: 8 },
  'dat-bom': { name: 'Đặt Bom', desc: 'Gamepad: đặt bom phá tường gỗ, né vụ nổ chữ thập!', rounds: 1, cat: 'versus', min: 2, max: 6 },
  'ke-gia-mao': { name: 'Kẻ Giả Mạo', desc: 'Một người nhận câu hỏi giả — bàn luận và tố cáo cho đúng!', rounds: 3, cat: 'versus', min: 3, max: 12 },
  'ma-soi': { name: 'Ma Sói', desc: 'Suy luận xã hội: sói trà trộn trong làng — bảo vệ dân, tìm và treo cổ sói trước khi quá muộn!', rounds: 1, cat: 'versus', min: 4, max: 12 },
  'ca-ngua': { name: 'Cờ Cá Ngựa', desc: 'Thảy xúc xắc, xuất chuồng, đá ngựa đối thủ — đưa cả 4 ngựa về chuồng trước!', rounds: 1, cat: 'versus', min: 2, max: 4 },
  'tien-len': { name: 'Tiến Lên Miền Nam', desc: 'Đánh bài miền Nam: chặn bài, chặt heo bằng tứ quý & đôi thông — hết bài trước thắng!', rounds: 1, cat: 'versus', min: 2, max: 4 },
  'chung-mot-than': { name: 'Chung Một Thân', desc: 'Hợp tác: cả đội lái chung một quả bóng, mỗi người giữ một hướng!', rounds: 1, cat: 'coop', min: 2, max: 8 },
  'day-hop': { name: 'Đẩy Hộp Về Đích', desc: 'Hợp tác: cùng đẩy hộp qua mê cung về ô đích!', rounds: 1, cat: 'coop', min: 2, max: 6 },
  'cheo-thuyen': { name: 'Chèo Thuyền', desc: 'Hợp tác: chèo thuyền theo nhịp, cả đội cùng trúng nhịp mới đi xa!', rounds: 1, cat: 'coop', min: 2, max: 12 },
  'thu-thanh': { name: 'Thủ Thành', desc: 'Hợp tác: bắn hạ đàn slime, giữ pha lê nguyên vẹn đến cuối!', rounds: 1, cat: 'coop', min: 2, max: 8 },
  'giai-ma-chung': { name: 'Giải Mã Chung', desc: 'Hợp tác: mỗi người giữ một phần mật mã — phối hợp bấm đúng thứ tự!', rounds: 1, cat: 'coop', min: 2, max: 12 },
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
const DODGE_MS = 75000, DODGE_LIVES = 3, BALL_SPEED = 0.14375, BALL_HIT_DIST = 1.35, INVULN_TICKS = 32;
// Kéo Co: knot = TUG_STEP * (presses of even seats - presses of odd seats);
// first side to |knot| >= TUG_WIN within TUG_MS wins, else the leader at
// time out wins (exact tie = draw). Bots add BOT_TUG presses per tug tick.
// Kéo Co keeps its own 500ms bot cadence (TUG_TICK_MS) so the TICK_MS
// retune leaves its wall-clock behaviour bit-identical.
const TUG_MS = 20000, TUG_WIN = 84, TUG_STEP = 3, TUG_TICK_MS = 500;
const BOT_TUG = { de: 1, vua: 2, kho: 3 };
// Chia Hay Cướp: negotiation then secret choice; pot per round, final ×2.
const TALK_MS = 60000, CHOOSE_MS = 15000, POT = 400;
// Cướp Sao: walled arena, bank stars by flying over them; a shove knocks
// one banked point loose as a fresh star (unpickable for DROP_LOCK_TICKS
// ticks so the victim cannot instantly re-grab it). A golden star worth
// 3 spawns every GOLD_EVERY_TICKS ticks (12s) while none is on the field.
const STEAL_MS = 45000, STEAL_SHOVE_FORCE = 4.5, GOLD_EVERY_TICKS = 192, DROP_LOCK_TICKS = 8;
// Giữ Vương Miện: hold the crown for +1 point per 250ms; the holder moves
// at HOLDER_SPEED of normal speed; a shove drops the crown, which then
// cannot be picked up for CROWN_LOCK_TICKS ticks (1s).
const CROWN_MS = 45000, HOLDER_SPEED = 0.9, CROWN_LOCK_TICKS = 16;
// Sơn Sàn: 18x10 grid of 1.6u cells over [-14.4,14.4]x[-8,8] (the old
// 12x12 over [-9.6,9.6]^2, widened with the 16:9 field). Entering
// a cell paints it; A triggers a 3x3 paint burst on PAINT_CD_TICKS (2s).
const SPLAT_MS = 40000, SPLAT_COLS = 18, SPLAT_ROWS = 10, SPLAT_MIN_X = -14.4, SPLAT_MIN_Y = -8, SPLAT_CELL = 1.6, PAINT_CD_TICKS = 32;
// Cao Bồi: after a random hidden delay the BẮN! window opens for
// DUEL_WINDOW_MS; round points by server receipt order, foul = -100.
// Tail extended past 4 shooters (25/10/0/…) so 5-8-player duels still
// pay the midfield; the first four values are the historical table.
const DUEL_WINDOW_MS = 1500, DUEL_POINTS = [200, 100, 50, 25, 10, 0, 0, 0], DUEL_FOUL = -100;
// Hợp tác (co-op): no per-player placement. Each co-op game ends with a
// TEAM result: a tier (Vàng/Bạc/Đồng/none) and every player banks the
// same pointsEach (300/200/100/50). See finishCoop().
const TIER_LABELS = { vang: 'VÀNG', bac: 'BẠC', dong: 'ĐỒNG', none: 'CHƯA ĐẠT HUY CHƯƠNG' };
const TIER_POINTS = { vang: 300, bac: 200, dong: 100, none: 50 };
// Chung Một Thân: ONE shared blob steered by split direction ownership;
// checkpoint stars score for the team, cannonballs (slower + sparser
// than Né Đạn) cost shared hearts.
const SHARED_MS = 60000, SHARED_HEARTS = 3, STAR_STALE_TICKS = 240;
const SHARED_BALL_SPEED = 0.1;
// Tiers by checkpoints: >=8 Vàng, >=5 Bạc, >=3 Đồng.
const SHARED_TIERS = [[8, 'vang'], [5, 'bac'], [3, 'dong']];
// Đẩy Hộp Về Đích: crate = circle of radius BOX_CRATE_R; it only moves
// when >=2 distinct players push it with a summed intent of magnitude
// >= BOX_PUSH_MIN. Crate step = MOVE_STEP * BOX_STEP_MUL per tick.
const BOX_MS = 75000, BOX_CRATE_R = 1.6, BOX_STEP_MUL = 0.6, BOX_PUSH_MIN = 1.2;
// Tiers by deliveries: >=3 Vàng, 2 Bạc, 1 Đồng.
const BOX_TIERS = [[3, 'vang'], [2, 'bac'], [1, 'dong']];
// Chèo Thuyền: ROW_BEATS beats every ROW_BEAT_MS; a press within
// +-ROW_WINDOW_MS of a beat is an in-window stroke. A perfect team
// (every player stroking every beat) advances ROW_FULL_STROKE per beat,
// covering ROW_COURSE in ROW_BEATS - 5 beats (pace margin built in).
const ROW_BEATS = 45, ROW_BEAT_MS = 1000, ROW_WINDOW_MS = 260;
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
const TANK_MS = 75000, TANK_LIVES = 3, SHELL_SPEED = 0.3, SHELL_CD_TICKS = 16, SHELL_HIT_DIST = 1.0;
const TANK_BLOCKS = [
  { x: 2.9, y: -2.4, w: 2.7, h: 1.1 }, { x: -5.6, y: 1.35, w: 2.7, h: 1.1 },
  { x: -5.6, y: -2.4, w: 2.7, h: 1.1 }, { x: 2.9, y: 1.35, w: 2.7, h: 1.1 },
];
// Đặt Bom: 15x9 grid of 2-unit cells over the wide arena; hard pillars sit
// on odd/odd cells (classic bomber layout), soft blocks are dealt per
// match with Math.random so tests can queue the exact layout.
const BOM_MS = 75000, BOM_LIVES = 2, BOM_COLS = 15, BOM_ROWS = 9, BOM_FUSE_TICKS = 32, BOM_SOFT_P = 0.62;
// Kẻ Giả Mạo: one secret impostor per round secretly gets the variant
// question; catching pays every other player, escaping pays the
// impostor (doubled in the final round).
const IMP_ANSWER_MS = 30000, IMP_DISCUSS_MS = 45000, IMP_VOTE_MS = 20000, IMP_REVEAL_MS = 9000;
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
const DEF_MS = 60000, DEF_CRYSTAL_HP = 10;
const DEF_TIERS = [[7, 'vang'], [4, 'bac'], [1, 'dong']];
// Giải Mã Chung: levels escalate (longer sequences); the team shares
// DECODE_HEARTS hearts for the whole game. Tiers by levels completed.
const DECODE_MS = 75000, DECODE_HEARTS = 3;
const DECODE_TIERS = [[5, 'vang'], [4, 'bac'], [3, 'dong']];
const DECODE_SYMBOLS = [
  { name: 'ĐỎ', color: '#FF4757' }, { name: 'XANH', color: '#3FA9F5' },
  { name: 'VÀNG', color: '#FFC93D' }, { name: 'HỒNG', color: '#F77FB0' },
];
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
const SOCCER_MS = 90000, SOCCER_GOAL_MS = 2500;
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
export class RoomStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Diff memory for broadcasts: socket -> last serialized view sent.
    // Instance-local on purpose — hibernation may drop it, and the worst
    // case is one duplicate state message per socket after a wake.
    this.lastSent = new Map();
  }
  async fetch(request) {
    this._lastDrive = Date.now();
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
    if (path === '/ws' && request.method === 'GET') return this._acceptWs(request);
    if (path === '/poke' && request.method === 'POST') {
      try {
        const loaded = await this._loadRoom();
        if (loaded) { this._broadcast(loaded.room); await this._syncAlarm(loaded.room); }
      } catch (e) { /* a poke must never fail the caller's request */ }
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 404 });
  }
  // Load the room record exactly as /get sees it (same envelope, same key,
  // same logical expiry), plus the raw stored text for change detection.
  async _loadRoom() {
    const entry = await this.state.storage.get('room');
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      await this.state.storage.delete('room');
      return null;
    }
    let room = null;
    try { room = JSON.parse(entry.json); } catch (e) { return null; }
    return room ? { room, json: entry.json } : null;
  }
  // Persist only when the serialized room actually moved (mirrors the
  // intent of saveRoom's payload dedup on the worker side).
  async _saveIfChanged(loaded) {
    if (JSON.stringify(loaded.room) === loaded.json) return false;
    loaded.room.updatedAt = now();
    const text = JSON.stringify(loaded.room);
    await this.state.storage.put('room', {
      json: text,
      expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000,
    });
    loaded.json = text;
    return true;
  }
  _sockets() {
    try {
      return this.state && typeof this.state.getWebSockets === 'function'
        ? this.state.getWebSockets() : [];
    } catch (e) { return []; }
  }
  _bye(ws) {
    try { ws.send(JSON.stringify({ type: 'bye' })); } catch (e) { /* already gone */ }
    try { ws.close(1001, 'Phòng đã đóng.'); } catch (e) { /* already gone */ }
  }
  // Send this socket its personalized view, but only when it changed.
  // The diff key is the serialized view with serverNow neutralized: the
  // clock field differs on every buildView call and would defeat the
  // compare, pushing every tick to every socket. A dead socket is
  // contained here — it can never break the broadcast or a save.
  _sendState(ws, room) {
    try {
      const att = ws.deserializeAttachment() || {};
      const view = buildView(room, att.role === 'host' ? 'host' : 'player', att.seat || null);
      const diffKey = JSON.stringify(Object.assign({}, view, { serverNow: 0 }));
      if (this.lastSent.get(ws) === diffKey) return;
      this.lastSent.set(ws, diffKey);
      ws.send(JSON.stringify({ type: 'state', view }));
    } catch (e) { /* one dead socket must not affect the others */ }
  }
  _broadcast(room) {
    const sockets = this._sockets();
    for (const ws of sockets) this._sendState(ws, room);
  }
  // Keep a TICK_MS alarm armed exactly while a game is active (or a
  // playlist intermission is pending) and at least one socket is
  // attached; disarm otherwise. Only arms when no alarm is pending,
  // so frequent calls never postpone a due tick.
  async _syncAlarm(room, base) {
    try {
      const st = this.state && this.state.storage;
      if (!st || typeof st.setAlarm !== 'function' || typeof st.getAlarm !== 'function') return;
      const want = !!((room && room.game) || (room && room.phase === 'results' && room.playlistNextAt)) && this._sockets().length > 0;
      const current = await st.getAlarm();
      if (want && current === null) {
        // Metronome arming: the next wake is scheduled off the PREVIOUS
        // wake's target (base, threaded from alarm() via this._alarmFor),
        // not off whenever this handler happens to finish. Handler work
        // plus platform delivery latency used to inflate every cycle
        // from 62.5 ms to ~100 ms, and state pushes inherited the gap.
        // DRIVEN MODE: while any client is actively driving the loop
        // (the host page's tick pump, pad messages, polls — every
        // contact stamps _lastDrive), the alarm demotes itself to a
        // 1 s backstop. Alarm invocations are the free plan's scarcest
        // resource (each bills as a full request — a tick-rate alarm
        // is ~57,600 billed requests per room-hour against a 100,000
        // per DAY free budget, plus a billed row-write per setAlarm),
        // while incoming WebSocket messages bill at 20:1, so the pump
        // is ~50x cheaper per drive. If no client has driven for
        // 250 ms (old page build, frozen host tab), the alarm resumes
        // the full tick metronome — the game never depends on the pump.
        const driven = this._lastDrive && (Date.now() - this._lastDrive) < 250;
        let target = (base || Date.now()) + (driven ? 1000 : TICK_MS);
        const nowMs = Date.now();
        if (target <= nowMs) target = nowMs + 5;
        this._alarmFor = target;
        await st.setAlarm(target);
      }
      if (!want && current !== null && typeof st.deleteAlarm === 'function') { this._alarmFor = 0; await st.deleteAlarm(); }
    } catch (e) { /* best-effort: HTTP lazy advance still works without it */ }
  }
  async _acceptWs(request) {
    // Hibernation API unavailable (local test harness, exotic envs):
    // answer a clean JSON error so the worker passes it through and
    // clients stay on HTTP polling, completely unaffected.
    if (typeof WebSocketPair !== 'function' || !this.state || typeof this.state.acceptWebSocket !== 'function') {
      return fail('Kênh WebSocket chưa khả dụng.', 501);
    }
    const role = request.headers.get('x-np-role') === 'host' ? 'host' : 'player';
    const seatRaw = parseInt(request.headers.get('x-np-seat') || '', 10);
    const seat = role === 'player' && Number.isInteger(seatRaw) ? seatRaw : null;
    const token = request.headers.get('x-np-token') || '';
    const loaded = await this._loadRoom();
    if (!loaded) return fail('Không thấy phòng này. Kiểm tra lại mã nhé.', 404);
    // The worker already validated this identity; re-check it against
    // the stored room anyway so the object never trusts headers alone.
    if (role === 'host') {
      if (token !== loaded.room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
    } else {
      const p = loaded.room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.seat === seat && x.token === token);
      if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
    }
    const pair = new WebSocketPair();
    const client = pair[0]; const server = pair[1];
    this.state.acceptWebSocket(server, role === 'host' ? ['host'] : ['player', 'seat-' + seat]);
    try { server.serializeAttachment({ role, seat, token }); } catch (e) { /* tags still identify it */ }
    try {
      // Greet exactly like a /state poll would: advance the sim, persist
      // if it moved, then hand this socket its personalized view.
      advance(loaded.room);
      await this._saveIfChanged(loaded);
      this._sendState(server, loaded.room);
      await this._syncAlarm(loaded.room);
    } catch (e) { /* a failed greeting must not break the upgrade */ }
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    try {
      if (typeof message !== 'string') return;
      let body = null;
      try { body = JSON.parse(message); } catch (e) { return; }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return;
      if (body.action === 'ping') {
        // App-level RTT probe for the on-screen meter: answer on
        // this socket immediately, without touching room state.
        try { ws.send(JSON.stringify({ type: 'pong', t: body.t || 0 })); } catch (e) {}
        return;
      }
      let att = {};
      try { att = ws.deserializeAttachment() || {}; } catch (e) { /* treated as bad identity below */ }
      const loaded = await this._loadRoom();
      if (!loaded) { this._bye(ws); return; }
      const room = loaded.room;
      // The identity pinned at accept time must still own its seat: a
      // socket never outlives the session it was opened for.
      let player = null;
      if (att.role === 'host') {
        if (!att.token || att.token !== room.hostToken) { this._bye(ws); return; }
      } else {
        player = room.players.find((p) => p.type === 'human' && !p.local && !p.hostSeat && p.seat === att.seat && p.token === att.token) || null;
        if (!player) { this._bye(ws); return; }
      }
      this._lastDrive = Date.now();
      // Tick-pump rate gate: the host page drives the loop with
      // 'tick' messages every ~30 ms while playing; anything faster
      // than 20 ms spacing is redundant (the sim is time-based, so
      // extra advances add nothing) and is dropped before any work.
      if (body.action === 'tick') {
        const nowT = Date.now();
        if (this._lastPumpAt && nowT - this._lastPumpAt < 20) return;
        this._lastPumpAt = nowT;
      }
      // The HTTP action pipeline, verbatim: advance, dispatch, advance,
      // save (even on error — the first advance may have moved the sim),
      // then push the fresh personalized views to every socket.
      advance(room);
      // A 'tick' message is a pure loop-driver: the sender noticed
      // state pushes had gone quiet (the alarm path can stall for
      // seconds at the platform level) and asks the object to advance
      // and broadcast NOW, inside this message handler — the handler
      // path has never shown the alarm path's stalls. No dispatch.
      const err = body.action === 'tick' ? null : (att.role === 'host' ? hostDispatch(room, body) : playerAction(room, player, body));
      if (err) {
        await this._saveIfChanged(loaded);
        try { ws.send(JSON.stringify({ type: 'error', error: err })); } catch (e) { /* socket dying */ }
        this._broadcast(room);
        await this._syncAlarm(room);
        return;
      }
      advance(room);
      await this._saveIfChanged(loaded);
      this._broadcast(room);
      await this._syncAlarm(room);
    } catch (e) { /* a bad message must never crash the object */ }
  }
  webSocketClose(ws) { this.lastSent.delete(ws); }
  webSocketError(ws) { this.lastSent.delete(ws); }
  async alarm() {
    try {
      const loaded = await this._loadRoom();
      const sockets = this._sockets();
      if (!loaded) {
        // The room was deleted/expired under live sockets: say bye first.
        for (const ws of sockets) this._bye(ws);
        return;
      }
      if (sockets.length === 0) { await this._syncAlarm(null); return; }
      // A pending playlist auto-start also keeps the alarm alive: the
      // room sits in results with no game, but the intermission
      // deadline must fire on time even if nobody polls.
      const active = !!loaded.room.game || (loaded.room.phase === 'results' && !!loaded.room.playlistNextAt);
      if (!active) { await this._syncAlarm(null); return; }
      advance(loaded.room);
      // Save BEFORE broadcasting: a broadcast failure (contained per
      // socket in _sendState) can never corrupt or block persistence.
      await this._saveIfChanged(loaded);
      this._broadcast(loaded.room);
      await this._syncAlarm(loaded.room, this._alarmFor || 0); // the fired alarm is spent: re-arm on the metronome base
    } catch (e) { /* an alarm must never throw */ }
  }
}
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
// Kẻ Giả Mạo bot discussion lines: deliberately generic — a bot must
// never reference either question (it only knows its own, and saying
// it out loud would break the secrecy rule for everyone).
const IMP_CHAT_LINES = [
  'Hmm… câu này ai cũng biết mà nhỉ?',
  'Tôi trả lời chắc chắn 100% luôn.',
  'Có người đang giấu đấy, nhìn là biết.',
  'Mọi người bình tĩnh, tôi vô tội!',
  'Câu này dễ ợt, khỏi bàn.',
  'Ai cười tủm tỉm nãy giờ ấy nhỉ?',
  'Tôi nghi người im lặng nhất phòng này.',
  'Thề luôn, đáp án của tôi là thật.',
];
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
    g.blobs = {}; g.balls = []; g.spawnIn = 24; g.elimOrder = []; g.elimTick = {};
    g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: DODGE_LIVES, alive: true,
      };
      g.dashCd[p.seat] = 0; g.invuln[p.seat] = 0;
    });
  } else if (g.id === 'keo-co') {
    g.phase = 'pull';
    g.endsAt = t + TUG_MS; g.tickCount = 0; g.nextTickAt = t + TUG_TICK_MS;
    g.presses = {}; g.knot = 0; g.winnerTeam = null; preservePads(room);
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
  } else if (g.id === 'son-san') {
    g.phase = 'splat';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SPLAT_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.paintCd = {}; preservePads(room);
    g.grid = new Array(SPLAT_COLS * SPLAT_ROWS).fill(0);
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,
        lives: 0, alive: true,
      };
      g.dashCd[p.seat] = 0; g.paintCd[p.seat] = 0;
    });
  } else if (g.id === 'cao-boi') {
    g.phase = 'wait';
    g.greenAt = t + Math.round(rand(1200, 4000));
    g.endsAt = g.greenAt + DUEL_WINDOW_MS;
    bots.forEach((p) => {
      const B = BOT[p.difficulty];
      // Only Dễ bots ever jump the gun, and only rarely; Vừa/Khó wait
      // for the BẮN! signal and fire on reaction time alone.
      if (p.difficulty === 'de' && Math.random() < 0.12) g.botPlan[p.seat] = { earlyAt: g.greenAt - Math.round(rand(150, 700)) };
      else g.botPlan[p.seat] = { tapAt: g.greenAt + botDelay(p.difficulty, B.reactMs) };
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
  } else if (g.id === 'ke-gia-mao') {
    // Secrecy starts here: the impostor seat and the question pair live
    // only in g.imp on the server; views hand each player their OWN
    // question and the host nothing but status (see gameView).
    const impostor = pick(room.players);
    const avail = IMPOSTOR_BANK.map((_, i) => i).filter((i) => (g.usedPairs || []).indexOf(i) < 0);
    const pairIdx = avail.length ? pick(avail) : randInt(0, IMPOSTOR_BANK.length - 1);
    g.usedPairs.push(pairIdx);
    g.imp = { seat: impostor.seat, pair: pairIdx };
    g.votes = {}; g.chatLog = [];
    g.phase = 'answer'; g.endsAt = t + IMP_ANSWER_MS;
    bots.forEach((p) => {
      g.botPlan[p.seat] = {
        answerAt: t + Math.round(rand(3000, 20000)), answer: randInt(0, 3),
        chatAt: t + IMP_ANSWER_MS + Math.round(rand(4000, 30000)), chatLine: pick(IMP_CHAT_LINES), chatted: false,
        voteAt: 0, vote: null,
      };
    });
  } else if (g.id === 'thu-thanh') {
    g.phase = 'defend';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + DEF_MS;
    spawnArenaBlobs(room, 0);
    initGuns(room);
    g.crystal = { hp: DEF_CRYSTAL_HP };
    g.slimes = []; g.slimeSeq = 0; g.kills = 0; g.spawnIn = 16;
  } else if (g.id === 'giai-ma-chung') {
    g.phase = 'decode';
    g.endsAt = t + DECODE_MS;
    g.hearts = DECODE_HEARTS; g.level = 0; g.levelsDone = 0;
    startDecodeLevel(room, t);
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
  if (g.id === 'keo-co') return stepTug(room, t);
  if (g.id === 'chia-cuop') return stepChia(room, t);
  if (g.id === 'cuop-sao') return stepSteal(room, t);
  if (g.id === 'giu-vuong-mien') return stepCrown(room, t);
  if (g.id === 'son-san') return stepSplat(room, t);
  if (g.id === 'cao-boi') return stepDuel(room, t);
  if (g.id === 'chung-mot-than') return stepShared(room, t);
  if (g.id === 'day-hop') return stepBox(room, t);
  if (g.id === 'cheo-thuyen') return stepRow(room, t);
  if (g.id === 'xe-tank') return stepTank(room, t);
  if (g.id === 'dat-bom') return stepBomber(room, t);
  if (g.id === 'ke-gia-mao') return stepImpostor(room, t);
  if (g.id === 'thu-thanh') return stepDefend(room, t);
  if (g.id === 'giai-ma-chung') return stepDecode(room, t);
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
  const g = room.game;
  const every = p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24;
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
  const trk = trackStart(room);
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
    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;
    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;
    clampRect(b); // the wide field's walls stop you
  });
  trackEnd(room, trk);
  // Cannonballs: spawn on a cadence that tightens as the match goes on
  // (same wall-clock cadence as before the retune: gap starts at 3.5s,
  // shrinks 0.25s every 12s, floor 1.5s). 16:9 wave: they enter from
  // the wide field's four edges and their velocity components scale
  // with the field map, so crossing times are unchanged.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    const side = randInt(0, 3);
    let x = 0, y = 0;
    if (side === 0) { x = -17.5; y = rand(-8.5, 8.5); } else if (side === 1) { x = 17.5; y = rand(-8.5, 8.5); }
    else if (side === 2) { x = rand(-15.5, 15.5); y = -10.5; } else { x = rand(-15.5, 15.5); y = 10.5; }
    const tx = rand(-8, 8), ty = rand(-4.5, 4.5);
    const dx = tx - x, dy = ty - y; const dd = Math.hypot(dx, dy) || 1;
    g.balls.push({ x, y, vx: (dx / dd) * BALL_SPEED * (4 / 3), vy: (dy / dd) * BALL_SPEED * (3 / 4) });
    g.spawnIn = Math.max(24, 56 - 2 * Math.floor(g.tickCount / 192));
  }
  g.balls.forEach((b) => { b.x += b.vx; b.y += b.vy; });
  g.balls = g.balls.filter((b) => Math.abs(b.x) <= 19 && Math.abs(b.y) <= 12);
  // Hits.
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (!b || !b.alive) return;
    if (g.invuln[p.seat] > 0) { g.invuln[p.seat] -= 1; return; }
    const idx = g.balls.findIndex((ball) => Math.hypot(ball.x - b.x, ball.y - b.y) < BALL_HIT_DIST);
    if (idx < 0) return;
    g.balls.splice(idx, 1);
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
    g.nextTickAt += TUG_TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TUG_TICK_MS;
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
// Shared helpers for the three walled tick-arena games below (Cướp Sao,
// Giữ Vương Miện, Sơn Sàn). They follow the same patterns as Đẩy Ra Khỏi
// Sàn / Né Đạn: gamepad held-state for humans, per-difficulty bot brains
// that re-decide on a fixed tick cadence, one simulation tick per
// TICK_MS, placement points awarded once per match (300/200/100/50).
// ---------------------------------------------------------------------------
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
function splatCell(x, y) {
  const c = Math.max(0, Math.min(SPLAT_COLS - 1, Math.floor((x - SPLAT_MIN_X) / SPLAT_CELL)));
  const r = Math.max(0, Math.min(SPLAT_ROWS - 1, Math.floor((y - SPLAT_MIN_Y) / SPLAT_CELL)));
  return r * SPLAT_COLS + c;
}
function splatCounts(room) {
  const g = room.game;
  const counts = {};
  room.players.forEach((p) => { counts[p.seat] = 0; });
  (g.grid || []).forEach((s) => { if (s) counts[s] = (counts[s] || 0) + 1; });
  return counts;
}
function botBrainSplat(room, p) {
  const g = room.game;
  const cached = cachedIntent(room, p);
  if (cached) return cached;
  const me = g.blobs[p.seat];
  let bd = 1e9, bx = 0, by = 0;
  for (let i = 0; i < (g.grid || []).length; i++) {
    if (g.grid[i] === p.seat) continue;
    const cx = SPLAT_MIN_X + (i % SPLAT_COLS + 0.5) * SPLAT_CELL;
    const cy = SPLAT_MIN_Y + (Math.floor(i / SPLAT_COLS) + 0.5) * SPLAT_CELL;
    const d = Math.hypot(cx - me.x, cy - me.y);
    if (d < bd) { bd = d; bx = cx; by = cy; }
  }
  const intent = Object.assign(dirIntent(bx - me.x, by - me.y), { shove: false, dash: bd > 6 && p.difficulty !== 'de' });
  g.botIntent[p.seat] = intent;
  return intent;
}
function stepSplat(room, t) {
  const g = room.game;
  if (g.phase !== 'splat') return false;
  if (t >= g.endsAt) { finishByValue(room, splatCounts(room), 'cells'); return true; }
  if (t >= g.nextTickAt) {
    // Catch-up (see stepArena): up to 8 missed ticks, then resync.
    let nCU = 0;
    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'splat') {
      simulateSplatTick(room);
      if (room.game !== g) return true; // the tick ended the game
      g.nextTickAt += TICK_MS;
      nCU++;
    }
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog
    return true;
  }
  return false;
}
function simulateSplatTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const trk = trackStart(room);
  const moves = collectMoves(room, botBrainSplat);
  applyMoves(room, moves, { clampBox: 9.2, clampX: 14.4, clampY: 8 });
  trackEnd(room, trk);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive) return;
    g.grid[splatCell(b.x, b.y)] = p.seat;
    if (g.paintCd[p.seat] > 0) g.paintCd[p.seat] -= 1;
    if (mv && mv.burst && g.paintCd[p.seat] <= 0) {
      const ci = splatCell(b.x, b.y);
      const cc = ci % SPLAT_COLS, cr = Math.floor(ci / SPLAT_COLS);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = cr + dr, cc2 = cc + dc;
        if (rr >= 0 && rr < SPLAT_ROWS && cc2 >= 0 && cc2 < SPLAT_COLS) g.grid[rr * SPLAT_COLS + cc2] = p.seat;
      }
      g.paintCd[p.seat] = PAINT_CD_TICKS;
    }
  });
  snapshotPad(room);
}

// --- Game 13: Cao Bồi (duel draw, rounds) ----------------------------------
// Not tick-based: it reuses the countdown -> wait -> go
// phase machinery and server receipt order (the tap's server timestamp
// IS the draw time, so network racing cannot be faked by the client).
// Round points go to the fastest draws in receipt order (200/100/50/0);
// tapping before BẮN! is a foul: DUEL_FOUL and locked out of the round.
function stepDuel(room, t) {
  const g = room.game;
  if (g.phase === 'wait') {
    if (t >= g.greenAt) { g.phase = 'go'; return true; }
    return false;
  }
  if (g.phase === 'go') {
    const settled = humansAllIn(room, (s) => !!g.inputs[s]) && botsDue(room, (pl) => (pl.earlyAt || pl.tapAt || 0));
    if (t >= g.endsAt || settled) { resolveDuel(room, t); return true; }
    return false;
  }
  if (g.phase === 'roundEnd') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function resolveDuel(room, t) {
  const g = room.game;
  const entries = room.players.map((p) => {
    const e = { seat: p.seat, status: 'none', reactionMs: null, points: 0 };
    if (p.type === 'human') {
      const inp = g.inputs[p.seat];
      if (inp && inp.foul) e.status = 'foul';
      else if (inp && inp.tapAt) { e.status = 'fired'; e.reactionMs = inp.tapAt - g.greenAt; }
    } else {
      const plan = g.botPlan[p.seat] || {};
      if (plan.earlyAt) e.status = 'foul';
      else if (plan.tapAt && plan.tapAt <= g.endsAt) { e.status = 'fired'; e.reactionMs = plan.tapAt - g.greenAt; }
    }
    return e;
  });
  const fired = entries.filter((e) => e.status === 'fired')
    .sort((a, b) => (a.reactionMs - b.reactionMs) || (a.seat - b.seat));
  fired.forEach((e, i) => { e.order = i + 1; e.points = roundPoints(g, DUEL_POINTS[Math.min(i, DUEL_POINTS.length - 1)]); });
  entries.forEach((e) => { if (e.status === 'foul') e.points = roundPoints(g, DUEL_FOUL); });
  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });
  const order = fired.concat(entries.filter((e) => e.status === 'foul'), entries.filter((e) => e.status === 'none'));
  g.lastRound = { round: g.round, entries: order };
  finishTimedRound(room, 'roundEnd', t + ROUND_PAUSE_MS);
}

// --- Game 14: Chung Một Thân (co-op: ONE shared blob, split steering) ------
// The whole team steers a single blob. Directions [u, r, d, l] are dealt
// round-robin across the seats in seat order (beginRound); the server
// filters every pad/brain to its owner's directions only, so the blob
// moves at normal speed per axis and ONLY when the owner of that
// direction holds it. Touching the checkpoint star scores +1 for the
// team; a star left untouched for STAR_STALE_TICKS ticks (15s) respawns.
// Cannonballs reuse the Né Đạn spawn pattern but slower (SHARED_BALL_SPEED)
// and sparser; a hit costs the TEAM one of SHARED_HEARTS shared hearts
// (usual INVULN_TICKS window). Ends at SHARED_MS or at 0 hearts.
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
function stepImpostor(room, t) {
  const g = room.game;
  if (g.phase === 'answer') {
    room.players.forEach((p) => {
      if (p.type !== 'bot') return;
      const plan = g.botPlan[p.seat];
      if (plan && plan.answerAt <= t && !g.inputs[p.seat]) g.inputs[p.seat] = { choice: plan.answer, at: plan.answerAt };
    });
    if (t >= g.endsAt || humansAllIn(room, (s) => !!g.inputs[s])) {
      g.phase = 'discuss'; g.endsAt = t + IMP_DISCUSS_MS;
      return true;
    }
    return false;
  }
  if (g.phase === 'discuss') {
    room.players.forEach((p) => {
      if (p.type !== 'bot') return;
      const plan = g.botPlan[p.seat];
      if (plan && !plan.chatted && plan.chatAt <= t) {
        plan.chatted = true;
        g.chatLog.push({ seat: p.seat, text: plan.chatLine, at: t });
        if (g.chatLog.length > 30) g.chatLog = g.chatLog.slice(-30);
      }
    });
    if (t >= g.endsAt) {
      g.phase = 'vote'; g.endsAt = t + IMP_VOTE_MS;
      room.players.forEach((p) => {
        if (p.type !== 'bot') return;
        const others = room.players.filter((q) => q.seat !== p.seat).map((q) => q.seat);
        g.botPlan[p.seat].voteAt = t + Math.round(rand(2000, 14000));
        g.botPlan[p.seat].vote = pick(others);
      });
      return true;
    }
    return false;
  }
  if (g.phase === 'vote') {
    room.players.forEach((p) => {
      if (p.type !== 'bot') return;
      const plan = g.botPlan[p.seat];
      if (plan && plan.voteAt && plan.voteAt <= t && g.votes[p.seat] == null) g.votes[p.seat] = plan.vote;
    });
    if (t >= g.endsAt || humansAllIn(room, (s) => g.votes[s] != null)) { resolveImpostor(room, t); return true; }
    return false;
  }
  if (g.phase === 'reveal') {
    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }
  }
  return false;
}
function resolveImpostor(room, t) {
  const g = room.game;
  const counts = {};
  Object.keys(g.votes).forEach((s) => { counts[g.votes[s]] = (counts[g.votes[s]] || 0) + 1; });
  let topSeat = null, topCount = 0, tie = false;
  Object.keys(counts).forEach((s) => {
    const c = counts[s];
    if (c > topCount) { topCount = c; topSeat = +s; tie = false; }
    else if (c === topCount) tie = true;
  });
  const caught = !tie && topCount > 0 && topSeat === g.imp.seat;
  const pts = {};
  room.players.forEach((p) => {
    let v = 0;
    if (caught) v = p.seat === g.imp.seat ? 0 : 150;
    else if (p.seat === g.imp.seat) v = isFinalRound(g) ? 600 : 300;
    pts[p.seat] = v;
    g.points[p.seat] = (g.points[p.seat] || 0) + v;
  });
  const answers = {};
  room.players.forEach((p) => { answers[p.seat] = g.inputs[p.seat] ? g.inputs[p.seat].choice : null; });
  g.reveal = { impostor: g.imp.seat, pair: g.imp.pair, caught, votes: Object.assign({}, g.votes), answers, points: pts };
  g.lastRound = { round: g.round, entries: room.players.map((p) => ({ seat: p.seat, points: pts[p.seat] })) };
  finishTimedRound(room, 'reveal', t + IMP_REVEAL_MS);
}

// --- Game: Ma Sói (hidden-role social deduction) ---------------------------
// Flow per round: night (wolves pick a victim by vote — plurality,
// ties broken by the lowest-seat wolf's choice; guard protects one
// player, never the same target two nights running; seer inspects
// one player and learns wolf/not-wolf into their PRIVATE notes; the
// witch, once every living wolf has locked a vote, privately sees
// the victim and may spend her one save and/or her one poison) ->
// dawn (the dead are announced, roles public from death on) -> day
// discussion (public chat) -> vote (plurality executed, tie = nobody)
// -> execute reveal. Win checks run after every death resolution:
// wolves win at parity, the village wins when the last wolf dies.
// Points go to the WINNING SIDE as a block: wolves 300 each, village
// 200 each, losers 50 each — dying early never costs your side's pay.
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
function startDecodeLevel(room, t) {
  const g = room.game;
  g.level += 1;
  const len = Math.min(3 + g.level - 1, 7);
  const seats = room.players.map((p) => p.seat).sort((x, y) => x - y);
  const startIdx = randInt(0, seats.length - 1);
  g.seq = [];
  for (let i = 0; i < len; i++) g.seq.push({ seat: seats[(startIdx + i) % seats.length], sym: randInt(0, 3) });
  g.stepIdx = 0;
  decodeArmBot(room, t);
}
function decodeArmBot(room, t) {
  const g = room.game;
  g.botPressAt = 0;
  const step = g.seq && g.seq[g.stepIdx];
  if (!step) return;
  const p = playerAt(room, step.seat);
  if (p && p.type === 'bot') g.botPressAt = t + 800;
}
function decodePress(room, seat, sym, t) {
  const g = room.game;
  if (g.phase !== 'decode') return;
  const step = g.seq && g.seq[g.stepIdx];
  if (!step) return;
  if (seat === step.seat && sym === step.sym) {
    g.stepIdx += 1;
    if (g.stepIdx >= g.seq.length) {
      g.levelsDone = g.level;
      g.phase = 'levelup';
      g.decodeAt = t + 1500;
    } else decodeArmBot(room, t);
  } else {
    g.hearts -= 1;
    if (g.hearts <= 0) finishCoop(room, g.levelsDone, coopTier(g.levelsDone, DECODE_TIERS), 'màn đã qua');
  }
}
function stepDecode(room, t) {
  const g = room.game;
  if (g.phase === 'decode') {
    if (t >= g.endsAt) { finishCoop(room, g.levelsDone, coopTier(g.levelsDone, DECODE_TIERS), 'màn đã qua'); return true; }
    const step = g.seq && g.seq[g.stepIdx];
    if (step && g.botPressAt && t >= g.botPressAt) {
      g.botPressAt = 0;
      decodePress(room, step.seat, step.sym, t);
      return true;
    }
    return false;
  }
  if (g.phase === 'levelup') {
    if (t >= g.endsAt) { finishCoop(room, g.levelsDone, coopTier(g.levelsDone, DECODE_TIERS), 'màn đã qua'); return true; }
    if (t >= g.decodeAt) { g.phase = 'decode'; startDecodeLevel(room, t); return true; }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Wave 4: platformers — one shared physics helper, then the two games.
// ---------------------------------------------------------------------------
// platStep moves ONE centre-anchored AABB entity (half extents
// PLAT_HW x PLAT_HH, fields {x, y, vx, vy, ground}) through a list of
// top-left rect solids. Gravity is applied first, then the axes are
// integrated and resolved SEPARATELY — X against solid sides, Y
// against tops/bottoms — so characters slide along walls and land
// cleanly on ledges. A solid flagged oneWay only catches a falling
// entity whose feet were at/above its top before the Y move; jumping
// up through it is free (the fighter stage's floaters).
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
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
    v.balls = (g.balls || []).map((b) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, vx: Math.round(b.vx * 100) / 100, vy: Math.round(b.vy * 100) / 100 }));
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
  } else if (g.id === 'son-san') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }
    });
    v.grid = g.grid;
    v.counts = splatCounts(room);
    if (seat) v.mine = v.counts[seat] || 0;
  } else if (g.id === 'cao-boi') {
    const status = {};
    room.players.forEach((p) => {
      if (p.type === 'human') { const inp = g.inputs[p.seat]; status[p.seat] = inp ? (inp.foul ? 'foul' : 'fired') : 'waiting'; }
      else {
        const plan = g.botPlan[p.seat] || {};
        if (plan.earlyAt && plan.earlyAt <= t) status[p.seat] = 'foul';
        else if (plan.tapAt && plan.tapAt <= t && g.phase !== 'wait') status[p.seat] = 'fired';
        else status[p.seat] = 'waiting';
      }
    });
    v.status = status;
    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? (inp.foul ? 'foul' : 'fired') : 'waiting'; }
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
  } else if (g.id === 'ke-gia-mao') {
    // SECRECY (hard rule, asserted in tests by string search): before
    // the reveal phase NO view — host or player — may carry the other
    // question's text or anyone's answer. A player view carries only
    // that player's own question + the shared options; the host gets
    // category + answered/voted status only. Chat is public by design.
    const pair = g.imp ? IMPOSTOR_BANK[g.imp.pair] : null;
    v.category = pair ? pair.cat : '';
    v.phaseDur = g.phase === 'answer' ? IMP_ANSWER_MS : g.phase === 'discuss' ? IMP_DISCUSS_MS : g.phase === 'vote' ? IMP_VOTE_MS : IMP_REVEAL_MS;
    const answered = {}; const voted = {};
    room.players.forEach((p) => {
      answered[p.seat] = p.type === 'human' ? !!g.inputs[p.seat] : !!(g.botPlan[p.seat] && g.botPlan[p.seat].answerAt <= t);
      voted[p.seat] = g.votes[p.seat] != null;
    });
    v.answered = answered; v.voted = voted;
    if (g.phase === 'discuss' || g.phase === 'vote' || g.phase === 'reveal') v.chatLog = g.chatLog || [];
    if (g.phase === 'reveal' && g.reveal && pair) {
      v.reveal = {
        impostor: g.reveal.impostor, caught: g.reveal.caught,
        realQ: pair.real, fakeQ: pair.fake, options: pair.options,
        votes: g.reveal.votes, answers: g.reveal.answers, points: g.reveal.points,
      };
    }
    if (seat) {
      if (pair) {
        v.myQuestion = g.imp.seat === seat ? pair.fake : pair.real;
        v.options = pair.options;
      }
      v.mine = g.inputs[seat] ? g.inputs[seat].choice : null;
      v.myVote = g.votes[seat] != null ? g.votes[seat] : null;
    }
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
  } else if (g.id === 'giai-ma-chung') {
    // SECRECY: the host view carries level/hearts/progress counts only
    // — never a step's symbol or owner. A player view lists ONLY their
    // own steps (position + symbol); nobody sees anyone else's steps.
    v.level = g.level;
    v.hearts = g.hearts;
    v.total = g.seq ? g.seq.length : 0;
    v.done = g.phase === 'levelup' ? v.total : g.stepIdx;
    v.levelsDone = g.levelsDone;
    v.phaseDur = DECODE_MS;
    if (seat) {
      v.mySteps = (g.seq || []).filter((s) => s.seat === seat)
        .map((s) => ({ pos: g.seq.indexOf(s) + 1, sym: s.sym, name: DECODE_SYMBOLS[s.sym].name }));
    }
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
  'giu-vuong-mien': 'crown', 'son-san': 'splat', 'xe-tank': 'tank',
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
  if (g.id === 'son-san') {
    b.x = Math.max(-14.4, Math.min(14.4, b.x)); b.y = Math.max(-8, Math.min(8, b.y));
  } else if (g.id !== 'day-ra') {
    clampRect(b);
  }
  // day-ra mirrors its stepper exactly: no positional clamp — the
  // ring-out verdict belongs to the next regular tick.
}
function playerAction(room, player, body) {
  const g = room.game;
  if (room.phase !== 'playing' || !g) return 'Chưa vào game.';
  const seat = player.seat; const t = now(); const a = body.action;
  if (a === 'pad') {
    if (g.id !== 'day-ra' && g.id !== 'ne-dan' && g.id !== 'keo-co' && g.id !== 'chia-cuop'
      && g.id !== 'cuop-sao' && g.id !== 'giu-vuong-mien' && g.id !== 'son-san'
      && g.id !== 'chung-mot-than' && g.id !== 'day-hop'
      && g.id !== 'xe-tank' && g.id !== 'dat-bom' && g.id !== 'thu-thanh'
      && g.id !== 'nguoi-que' && g.id !== 'den-lua-nuoc'
      && g.id !== 'da-bong' && g.id !== 'ech-op' && g.id !== 'can-goc') return null;
    const pd = body.pad || {};
    const np = { u: !!pd.u, d: !!pd.d, l: !!pd.l, r: !!pd.r, a: !!pd.a, b: !!pd.b, x: !!pd.x, y: !!pd.y };
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
  if (a === 'choose') {
    if (g.id !== 'chia-cuop' || g.phase !== 'choose') return 'Chưa đến lúc chọn.';
    if (!g.pair || g.pair.indexOf(seat) < 0) return 'Vòng này bạn ngồi ngoài, chỉ xem thôi.';
    if (g.inputs[seat]) return null;
    if (body.choice !== 'chia' && body.choice !== 'cuop') return 'Lựa chọn không hợp lệ.';
    g.inputs[seat] = { choice: body.choice, at: t };
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
    if (g.id === 'ke-gia-mao') {
      // Public discussion: EVERY player may chat (unlike Chia Hay
      // Cướp's pair-only negotiation). Stored as a scrolling log.
      if (g.phase !== 'discuss') return 'Chỉ trò chuyện được trong lúc bàn luận.';
      const text = String(body.text || '').trim().slice(0, 60);
      if (!text) return 'Hãy nhập lời nhắn.';
      g.chatLog.push({ seat, text, at: t });
      if (g.chatLog.length > 30) g.chatLog = g.chatLog.slice(-30);
      return null;
    }
    if (g.id !== 'chia-cuop' || g.phase !== 'talk') return 'Chỉ trò chuyện được trong lúc thương lượng.';
    if (!g.pair || g.pair.indexOf(seat) < 0) return 'Chỉ hai người trong cặp mới thương lượng.';
    const text = String(body.text || '').trim().slice(0, 60);
    if (!text) return 'Hãy nhập lời nhắn.';
    g.chat[seat] = { text, at: t };
    return null;
  }
  if (a === 'tap') {
    if (g.id === 'cao-boi') {
      if (g.inputs[seat]) return null;
      if (g.phase === 'wait') g.inputs[seat] = { foul: true, at: t };
      else if (g.phase === 'go') g.inputs[seat] = { tapAt: t };
      return null;
    }
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
    if (g.id === 'ke-gia-mao') {
      // The choice answers the question THIS player was dealt (real or
      // variant); it stays secret until the reveal phase.
      if (g.phase !== 'answer') return 'Chưa đến lúc trả lời.';
      if (g.inputs[seat]) return null;
      const ci = body.choice;
      if (!Number.isInteger(ci) || ci < 0 || ci > 3) return 'Đáp án không hợp lệ.';
      g.inputs[seat] = { choice: ci, at: t };
      return null;
    }
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
    if (g.id !== 'ke-gia-mao' || g.phase !== 'vote') return 'Chưa đến lúc tố cáo.';
    if (g.votes[seat] != null) return null;
    const target = body.seat;
    if (!Number.isInteger(target) || target === seat || !playerAt(room, target)) return 'Không tố cáo được người này.';
    g.votes[seat] = target;
    return null;
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
  if (a === 'symbol') {
    if (g.id !== 'giai-ma-chung' || g.phase !== 'decode') return 'Chưa đến lúc bấm ký hiệu.';
    const sym = body.sym;
    if (!Number.isInteger(sym) || sym < 0 || sym > 3) return 'Ký hiệu không hợp lệ.';
    decodePress(room, seat, sym, t);
    return null;
  }
  return 'Hành động không hợp lệ.';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const ENGINE_JS = "(function () {\n// ============================================================================\n// Nảy Party — Cloudflare Worker (single self-contained file, no dependencies)\n// - GET  /                        → the full game page (HTML embedded below)\n// - POST /api/rooms               → create a room (host screen)\n// - POST /api/rooms/:code/join    → a phone joins by code + name\n// - GET  /api/rooms/:code/state   → polled state view (host or player, filtered)\n// - POST /api/rooms/:code/action  → host / player actions\n// - GET  /api/rooms/:code/ws      → WebSocket live channel (same auth as\n//   /state): the room's Durable Object pushes personalized state views the\n//   moment they change and accepts the same action bodies, so input no\n//   longer waits on polling. HTTP remains the full fallback everywhere.\n// Rooms live in a Durable Object (binding ROOMS_DO, class RoomStore below):\n// one object per room code, so room writes use DO storage instead of KV\n// (the KV free tier's daily write limit was exhausted by per-poll saves).\n// The KV namespace bound as ROOMS remains only as a fallback for\n// environments where ROOMS_DO is not bound. The server is authoritative:\n// all timing uses server timestamps and game phases advance lazily whenever\n// a request touches the room (clients poll ~1s, faster during reaction games).\n// All game content (name, mascots, question banks) is self-authored.\n// ============================================================================\n\n// ---------------------------------------------------------------------------\n// Question banks (self-authored)\n// ---------------------------------------------------------------------------\nconst QUIZ_BANK = [\n  { q: 'Thủ đô của nước Pháp là thành phố nào?', options: ['Paris', 'Luân Đôn', 'Rôm', 'Berlin'], answer: 0 },\n  { q: 'Ký hiệu hóa học \"O\" là nguyên tố nào?', options: ['Vàng', 'Oxy', 'Sắt', 'Đồng'], answer: 1 },\n  { q: 'Loài động vật nào lớn nhất trên Trái Đất?', options: ['Voi châu Phi', 'Cá mập trắng', 'Cá voi xanh', 'Hươu cao cổ'], answer: 2 },\n  { q: 'Bản Tuyên ngôn Độc lập của Việt Nam được đọc vào năm nào?', options: ['1930', '1954', '1975', '1945'], answer: 3 },\n  { q: 'Tác giả của Truyện Kiều là ai?', options: ['Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Trãi', 'Cao Bá Quát'], answer: 0 },\n  { q: 'Hành tinh nào được gọi là Hành tinh Đỏ?', options: ['Sao Kim', 'Sao Hỏa', 'Sao Mộc', 'Sao Thổ'], answer: 1 },\n  { q: 'Công thức hóa học của nước là gì?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },\n  { q: 'Đội tuyển nào vô địch World Cup bóng đá 2022?', options: ['Pháp', 'Brazil', 'Đức', 'Argentina'], answer: 3 },\n  { q: 'Sông nào dài nhất thế giới?', options: ['Sông Amazon', 'Sông Nile', 'Sông Dương Tử', 'Sông Mississippi'], answer: 1 },\n  { q: '7 × 8 bằng bao nhiêu?', options: ['54', '56', '63', '48'], answer: 1 },\n  { q: 'Thủ đô của Nhật Bản là thành phố nào?', options: ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'], answer: 2 },\n  { q: 'Ai là họa sĩ vẽ bức Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Monet', 'Leonardo da Vinci'], answer: 3 },\n  { q: 'Cây xanh hấp thụ loại khí nào để quang hợp?', options: ['Oxy', 'Cacbonic (CO2)', 'Nitơ', 'Hydro'], answer: 1 },\n  { q: 'Đơn vị tiền tệ của Nhật Bản là gì?', options: ['Won', 'Yên', 'Nhân dân tệ', 'Ringgit'], answer: 1 },\n  { q: 'Đại dương nào lớn nhất trên Trái Đất?', options: ['Đại Tây Dương', 'Ấn Độ Dương', 'Thái Bình Dương', 'Bắc Băng Dương'], answer: 2 },\n  { q: 'Vị vua cuối cùng của triều Nguyễn là ai?', options: ['Khải Định', 'Bảo Đại', 'Duy Tân', 'Hàm Nghi'], answer: 1 },\n  { q: 'Tốc độ âm thanh trong không khí khoảng bao nhiêu m/s?', options: ['150 m/s', '340 m/s', '1000 m/s', '3000 m/s'], answer: 1 },\n  { q: 'Chuột túi (kangaroo) sống tự nhiên chủ yếu ở đâu?', options: ['Brazil', 'Canada', 'Australia (Úc)', 'Ấn Độ'], answer: 2 },\n  { q: 'Kim loại nào nhẹ nhất trong các kim loại sau?', options: ['Nhôm', 'Sắt', 'Liti', 'Đồng'], answer: 2 },\n  { q: 'Số nguyên tố nhỏ nhất là số nào?', options: ['0', '1', '2', '3'], answer: 2 },\n  { q: 'Hòn đảo nào lớn nhất thế giới?', options: ['Borneo', 'Greenland', 'Madagascar', 'Sumatra'], answer: 1 },\n  { q: 'Người đầu tiên đặt chân lên Mặt Trăng là ai?', options: ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin', 'Michael Collins'], answer: 1 },\n  { q: 'Trộn màu xanh dương với màu vàng được màu gì?', options: ['Tím', 'Cam', 'Xanh lá', 'Nâu'], answer: 2 },\n  { q: 'Thủ đô của Australia (Úc) là thành phố nào?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },\n  { q: 'Cá heo thuộc nhóm động vật nào?', options: ['Cá', 'Động vật có vú', 'Lưỡng cư', 'Bò sát'], answer: 1 },\n  { q: 'Thế vận hội Olympic tổ chức mấy năm một lần?', options: ['2 năm', '3 năm', '4 năm', '5 năm'], answer: 2 },\n  { q: 'Chữ cái đầu tiên trong bảng chữ cái Hy Lạp là gì?', options: ['Beta', 'Omega', 'Sigma', 'Alpha'], answer: 3 },\n  { q: 'Nước chiếm khoảng bao nhiêu phần trăm cơ thể người trưởng thành?', options: ['30%', '45%', '60%', '90%'], answer: 2 },\n  { q: 'Vĩ tuyến 0 độ được gọi là gì?', options: ['Chí tuyến', 'Xích đạo', 'Kinh tuyến gốc', 'Vòng cực'], answer: 1 },\n  { q: 'Âm thanh không truyền được qua môi trường nào?', options: ['Nước', 'Không khí', 'Chân không', 'Kim loại'], answer: 2 },\n];\n\n// ---------------------------------------------------------------------------\n// Constants\n// ---------------------------------------------------------------------------\nconst IMPOSTOR_BANK = [\n  { cat: 'Địa lý', real: 'Thủ đô của nước Pháp là thành phố nào?', fake: 'Thủ đô của nước Ý là thành phố nào?', options: ['Paris', 'Rome', 'Berlin', 'Madrid'] },\n  { cat: 'Thiên văn', real: 'Hành tinh nào gần Mặt Trời nhất?', fake: 'Hành tinh nào xa Mặt Trời nhất trong bốn hành tinh này?', options: ['Sao Thủy', 'Sao Kim', 'Sao Hỏa', 'Sao Mộc'] },\n  { cat: 'Động vật', real: 'Loài nào trong bốn loài này đẻ trứng?', fake: 'Loài nào trong bốn loài này đẻ con?', options: ['Gà', 'Chó', 'Mèo', 'Lợn'] },\n  { cat: 'Đời sống', real: 'Một tuần có bao nhiêu ngày?', fake: 'Một tháng có khoảng bao nhiêu tuần?', options: ['4', '7', '12', '30'] },\n  { cat: 'Thể thao', real: 'Một đội bóng đá có bao nhiêu cầu thủ trên sân?', fake: 'Một đội bóng rổ có bao nhiêu cầu thủ trên sân?', options: ['5', '7', '9', '11'] },\n  { cat: 'Cơ thể', real: 'Người trưởng thành có tối đa bao nhiêu chiếc răng vĩnh viễn?', fake: 'Một bàn tay người có bao nhiêu ngón?', options: ['5', '10', '28', '32'] },\n  { cat: 'Việt Nam', real: 'Vịnh Hạ Long thuộc tỉnh nào?', fake: 'Đảo Phú Quốc thuộc tỉnh nào?', options: ['Quảng Ninh', 'Kiên Giang', 'Khánh Hòa', 'Bình Thuận'] },\n  { cat: 'Văn học', real: 'Truyện Kiều là tác phẩm của ai?', fake: 'Truyện Lục Vân Tiên là tác phẩm của ai?', options: ['Nguyễn Du', 'Nguyễn Đình Chiểu', 'Hồ Xuân Hương', 'Nguyễn Trãi'] },\n  { cat: 'Khoa học', real: 'Ở áp suất thường, nước sôi ở bao nhiêu độ C?', fake: 'Ở áp suất thường, nước đóng băng ở bao nhiêu độ C?', options: ['0', '50', '90', '100'] },\n  { cat: 'Động vật', real: 'Loài nào có sọc đen trắng và thích ăn tre trúc?', fake: 'Loài nào có sọc đen trắng và sống ở đồng cỏ châu Phi?', options: ['Gấu trúc', 'Ngựa vằn', 'Hổ', 'Gấu mèo'] },\n  { cat: 'Địa lý', real: 'Ngọn núi nào cao nhất Việt Nam?', fake: 'Ngọn núi nào cao nhất thế giới?', options: ['Fansipan', 'Everest', 'Phú Sĩ', 'Bà Đen'] },\n  { cat: 'Ẩm thực', real: 'Bánh chưng truyền thống có hình gì?', fake: 'Bánh tét truyền thống có hình gì?', options: ['Hình vuông', 'Hình tròn dài', 'Hình tam giác', 'Hình trăng khuyết'] },\n  { cat: 'Âm nhạc', real: 'Đàn guitar thông thường có bao nhiêu dây?', fake: 'Đàn violin thông thường có bao nhiêu dây?', options: ['4', '5', '6', '7'] },\n  { cat: 'Toán học', real: 'Hình tam giác có bao nhiêu cạnh?', fake: 'Hình ngũ giác có bao nhiêu cạnh?', options: ['3', '4', '5', '6'] },\n  { cat: 'Sinh học', real: 'Con nhện có bao nhiêu chân?', fake: 'Côn trùng trưởng thành có bao nhiêu chân?', options: ['4', '6', '8', '10'] },\n  { cat: 'Địa lý', real: 'Sa mạc nào lớn nhất thế giới?', fake: 'Đại dương nào lớn nhất thế giới?', options: ['Sahara', 'Thái Bình Dương', 'Đại Tây Dương', 'Gobi'] },\n  { cat: 'Thể thao', real: 'Một hiệp bóng đá kéo dài bao nhiêu phút?', fake: 'Một hiệp bóng rổ FIBA kéo dài bao nhiêu phút?', options: ['10', '12', '40', '45'] },\n  { cat: 'Văn hóa', real: 'Tết Nguyên Đán là ngày đầu của tháng mấy âm lịch?', fake: 'Tết Trung Thu là rằm tháng mấy âm lịch?', options: ['Tháng 1', 'Tháng 5', 'Tháng 8', 'Tháng 12'] },\n];\n\n// Platform seat cap: rooms hold up to MAX_SEATS players (humans +\n// bots). Each game declares its own [min, max] inside GAMES; the\n// chooser locks a card whose range excludes the current seat count.\nconst MAX_SEATS = 12;\nconst SEAT_COLORS = ['blue', 'pink', 'green', 'purple', 'orange', 'red', 'cyan', 'yellow', 'lime', 'brown', 'silver', 'magenta'];\n// Placement points by finishing rank. Ranks 1-4 are the historical\n// 300/200/100/50; ranks 5-12 extend the tail so big-room matches pay\n// everyone something. EVERY placement award goes through\n// placementAt() so >4-player matches score identically everywhere.\nconst PLACEMENT_POINTS = [300, 200, 100, 50, 40, 30, 20, 10, 10, 10, 10, 10];\nfunction placementAt(rankIdx) {\n  return PLACEMENT_POINTS[Math.min(rankIdx, PLACEMENT_POINTS.length - 1)];\n}\nconst DIFFS = ['de', 'vua', 'kho'];\nconst DIFF_LABELS = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };\n\n// Per-game seat range [min, max]: crowd / turn-based games scale to\n// the full 12-seat room; realtime arenas cap at 8 so the field stays\n// readable; Đặt Bom caps at 6 (its spawn cells), Đẩy Hộp / Đền at 6\n// (level geometry), Cờ Cá Ngựa is a 4-colour board by design.\nconst GAMES = {\n  'do-vui': { name: 'Đố Vui Tốc Độ', desc: 'Trả lời đúng và nhanh nhất', rounds: 8, cat: 'versus', min: 2, max: 12 },\n  'day-ra': { name: 'Đẩy Ra Khỏi Sàn', desc: 'Gamepad: đẩy hết đối thủ khỏi sàn tròn!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'ne-dan': { name: 'Né Đạn', desc: 'Gamepad: né đạn pháo, sống sót đến cuối!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'keo-co': { name: 'Kéo Co', desc: 'Hai đội bấm nút B, kéo nút thắt về phía mình!', rounds: 1, cat: 'versus', min: 2, max: 12 },\n  // Rounds for Chia Hay Cướp are dynamic: one round per seated player\n  // (pairs rotate, see beginRound), so `rounds` here is only nominal.\n  'chia-cuop': { name: 'Chia Hay Cướp', desc: 'Thương lượng 60 giây rồi chọn bí mật: Chia hay Cướp?', rounds: 4, cat: 'versus', min: 2, max: 12 },\n  'cuop-sao': { name: 'Cướp Sao', desc: 'Gamepad: nhặt sao, xô đối thủ cho rơi sao!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'giu-vuong-mien': { name: 'Giữ Vương Miện', desc: 'Gamepad: giành vương miện và giữ càng lâu càng tốt!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'son-san': { name: 'Sơn Sàn', desc: 'Gamepad: chạy sơn sàn, chiếm thật nhiều ô!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'cao-boi': { name: 'Cao Bồi', desc: 'Đợi hiệu lệnh BẮN — rút súng nhanh nhất!', rounds: 5, cat: 'versus', min: 2, max: 8 },\n  'xe-tank': { name: 'Xe Tăng Đấu Trường', desc: 'Gamepad: lái xe tăng, bắn hạ đối thủ, núp sau vật chắn!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'dat-bom': { name: 'Đặt Bom', desc: 'Gamepad: đặt bom phá tường gỗ, né vụ nổ chữ thập!', rounds: 1, cat: 'versus', min: 2, max: 6 },\n  'ke-gia-mao': { name: 'Kẻ Giả Mạo', desc: 'Một người nhận câu hỏi giả — bàn luận và tố cáo cho đúng!', rounds: 3, cat: 'versus', min: 3, max: 12 },\n  'ma-soi': { name: 'Ma Sói', desc: 'Suy luận xã hội: sói trà trộn trong làng — bảo vệ dân, tìm và treo cổ sói trước khi quá muộn!', rounds: 1, cat: 'versus', min: 4, max: 12 },\n  'ca-ngua': { name: 'Cờ Cá Ngựa', desc: 'Thảy xúc xắc, xuất chuồng, đá ngựa đối thủ — đưa cả 4 ngựa về chuồng trước!', rounds: 1, cat: 'versus', min: 2, max: 4 },\n  'tien-len': { name: 'Tiến Lên Miền Nam', desc: 'Đánh bài miền Nam: chặn bài, chặt heo bằng tứ quý & đôi thông — hết bài trước thắng!', rounds: 1, cat: 'versus', min: 2, max: 4 },\n  'chung-mot-than': { name: 'Chung Một Thân', desc: 'Hợp tác: cả đội lái chung một quả bóng, mỗi người giữ một hướng!', rounds: 1, cat: 'coop', min: 2, max: 8 },\n  'day-hop': { name: 'Đẩy Hộp Về Đích', desc: 'Hợp tác: cùng đẩy hộp qua mê cung về ô đích!', rounds: 1, cat: 'coop', min: 2, max: 6 },\n  'cheo-thuyen': { name: 'Chèo Thuyền', desc: 'Hợp tác: chèo thuyền theo nhịp, cả đội cùng trúng nhịp mới đi xa!', rounds: 1, cat: 'coop', min: 2, max: 12 },\n  'thu-thanh': { name: 'Thủ Thành', desc: 'Hợp tác: bắn hạ đàn slime, giữ pha lê nguyên vẹn đến cuối!', rounds: 1, cat: 'coop', min: 2, max: 8 },\n  'giai-ma-chung': { name: 'Giải Mã Chung', desc: 'Hợp tác: mỗi người giữ một phần mật mã — phối hợp bấm đúng thứ tự!', rounds: 1, cat: 'coop', min: 2, max: 12 },\n  'nguoi-que': { name: 'Người Que Đại Chiến', desc: 'Gamepad: người que đấu võ — đánh đối thủ văng khỏi sàn!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'den-lua-nuoc': { name: 'Đền Lửa & Nước', desc: 'Hợp tác: Lửa và Nước cùng vượt đền — nhặt ngọc, giữ cổng cho nhau, về đúng cửa!', rounds: 1, cat: 'coop', min: 2, max: 6 },\n  'da-bong': { name: 'Đá Bóng Đầu To', desc: 'Gamepad: hai đội đầu to tranh bóng — sút vào gôn đối thủ!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n  'ech-op': { name: 'Ếch Ộp Phiêu Lưu', desc: 'Hợp tác: hai chú ếch nuốt nhau vào bụng, vác nhau qua gai và hố sâu!', rounds: 1, cat: 'coop', min: 2, max: 4 },\n  'can-goc': { name: 'Đại Bác Căn Góc', desc: 'Căn góc + lực như Gunny: chỉnh nòng, tính gió, bắn phá địa hình!', rounds: 1, cat: 'versus', min: 2, max: 8 },\n};\n\n// Bot behaviour per difficulty. Bots are simulated server-side from plans\n// that are generated when each round/question starts.\nconst BOT = {\n  de:  { quizCorrect: 0.45, quizDelay: [6000, 13000], reactMs: [550, 1200] },\n  vua: { quizCorrect: 0.65, quizDelay: [4000, 9000],  reactMs: [320, 700] },\n  kho: { quizCorrect: 0.88, quizDelay: [1800, 4800],  reactMs: [170, 370] },\n};\n\nconst ROOM_TTL_SECONDS = 6 * 3600;\nconst QUIZ_MS = 15000, QUIZ_REVEAL_MS = 4000;\nconst ROUND_PAUSE_MS = 3500;\nconst PLAYLIST_GAP_MS = 8000; // results intermission before a playlist auto-starts its next game\n// Tick engine retuned 500ms -> 250ms for smoother motion. Every\n// tick-denominated constant was doubled (and per-tick steps/speeds\n// halved) so wall-clock behaviour is unchanged: MOVE_STEP 0.5/tick =\n// 2 units/s, dash cooldown 12 ticks = 3s, shove cooldown 6 ticks = 1.5s,\n// ring shrink 0.5 per 8 ticks = per 2s, dodge invulnerability 8 ticks =\n// 2s, ball speed 0.575/tick = 2.3 units/s, bot re-decision every\n// 2/4/6 ticks = 0.5s/1s/1.5s as before.\n// Retuned again 250ms -> 125ms (same method): per-tick speeds halved,\n// tick-counted durations doubled, bot cadences 4/8/12 ticks, crown hold\n// points accrue via an accumulator (+1 per 250ms held). Platform\n// physics is the exception that proves the rule: with gravity-before-\n// move semi-implicit Euler, halving the step needs gravity x0.25\n// (A*h^2) and jump velocities re-tuned to the same discrete apexes\n// (FIGHT_JUMP 1.2 -> apex 4.2 vs 4.4 before), and per-tick friction\n// factors rescale to their square roots so decay per second is kept.\n// The TEMPLE game originally stayed on the old 250ms tick (its gate\n// slabs shadowed the mid-floor pool jumps — see the note at\n// TEMPLE_LEVEL); it has since joined the shared 125ms tick too.\n// SMOOTH3: retuned once more 125ms -> 62.5ms (same playbook — see\n// SMOOTH_NOTES.md). Per-tick speeds halved, tick counters doubled, bot\n// cadences 8/16/24 ticks, crown accumulator threshold 4 ticks. The\n// platformers now carry PER-GAME gravities (FIGHT_GRAV / TEMP_GRAV /\n// SOCCER_GRAV) tuned on the half-integer discrete family (V = (k+0.5)G,\n// apex = G*k^2/2, air = 2k ticks exactly, with the jump velocity\n// nudged 0.0003 low so the fall penetrates on the exact return tick\n// instead of depending on float dust): fight apex 4.20 / air 30 ticks,\n// temple+frog apex 3.15 / air 28, soccer apex ~3.50 / air 28 — the\n// discrim numbers are bit-identical to the 125ms build.\nconst ARENA_R0 = 10, ARENA_RMIN = 4, ARENA_MS = 90000, ARENA_LIVES = 3, TICK_MS = 62.5;\nconst MOVE_STEP = 0.125, DASH_CD_TICKS = 48, SHOVE_CD_TICKS = 24;\n// 16:9 WAVE: the arena family plays in a 32x18 space (x in [-16,16],\n// y in [-9,9]) so the TV stage fills a 16:9 screen edge to edge. The\n// map from the old 24x24 space scales x by 4/3 and y by 3/4, and the\n// per-axis move steps scale identically, so every crossing TIME (the\n// tuned feel of every arena game) is bit-identical to before.\nconst FIELD_HW = 16, FIELD_HH = 9;\nconst STEP_X = MOVE_STEP * 4 / 3, STEP_Y = MOVE_STEP * 3 / 4;\nconst CLAMP_X = FIELD_HW - 0.8, CLAMP_Y = FIELD_HH - 0.8; // blob rect clamp (0.8 margin)\n// A dash is a x3 speed boost lasting DASH_BOOST_TICKS ticks: 4 ticks\n// at 62.5ms reproduces the old single-tick 1.5-unit lunge (3 x 0.5)\n// over the same 250ms.\nconst DASH_BOOST_TICKS = 4;\nconst SHOVE_RANGE = 2.7, SHOVE_FORCE = 2.7;\n// Né Đạn: same tick engine + walled arena (no shrinking, no ring-out).\nconst DODGE_MS = 75000, DODGE_LIVES = 3, BALL_SPEED = 0.14375, BALL_HIT_DIST = 1.35, INVULN_TICKS = 32;\n// Kéo Co: knot = TUG_STEP * (presses of even seats - presses of odd seats);\n// first side to |knot| >= TUG_WIN within TUG_MS wins, else the leader at\n// time out wins (exact tie = draw). Bots add BOT_TUG presses per tug tick.\n// Kéo Co keeps its own 500ms bot cadence (TUG_TICK_MS) so the TICK_MS\n// retune leaves its wall-clock behaviour bit-identical.\nconst TUG_MS = 20000, TUG_WIN = 84, TUG_STEP = 3, TUG_TICK_MS = 500;\nconst BOT_TUG = { de: 1, vua: 2, kho: 3 };\n// Chia Hay Cướp: negotiation then secret choice; pot per round, final ×2.\nconst TALK_MS = 60000, CHOOSE_MS = 15000, POT = 400;\n// Cướp Sao: walled arena, bank stars by flying over them; a shove knocks\n// one banked point loose as a fresh star (unpickable for DROP_LOCK_TICKS\n// ticks so the victim cannot instantly re-grab it). A golden star worth\n// 3 spawns every GOLD_EVERY_TICKS ticks (12s) while none is on the field.\nconst STEAL_MS = 45000, STEAL_SHOVE_FORCE = 4.5, GOLD_EVERY_TICKS = 192, DROP_LOCK_TICKS = 8;\n// Giữ Vương Miện: hold the crown for +1 point per 250ms; the holder moves\n// at HOLDER_SPEED of normal speed; a shove drops the crown, which then\n// cannot be picked up for CROWN_LOCK_TICKS ticks (1s).\nconst CROWN_MS = 45000, HOLDER_SPEED = 0.9, CROWN_LOCK_TICKS = 16;\n// Sơn Sàn: 18x10 grid of 1.6u cells over [-14.4,14.4]x[-8,8] (the old\n// 12x12 over [-9.6,9.6]^2, widened with the 16:9 field). Entering\n// a cell paints it; A triggers a 3x3 paint burst on PAINT_CD_TICKS (2s).\nconst SPLAT_MS = 40000, SPLAT_COLS = 18, SPLAT_ROWS = 10, SPLAT_MIN_X = -14.4, SPLAT_MIN_Y = -8, SPLAT_CELL = 1.6, PAINT_CD_TICKS = 32;\n// Cao Bồi: after a random hidden delay the BẮN! window opens for\n// DUEL_WINDOW_MS; round points by server receipt order, foul = -100.\n// Tail extended past 4 shooters (25/10/0/…) so 5-8-player duels still\n// pay the midfield; the first four values are the historical table.\nconst DUEL_WINDOW_MS = 1500, DUEL_POINTS = [200, 100, 50, 25, 10, 0, 0, 0], DUEL_FOUL = -100;\n// Hợp tác (co-op): no per-player placement. Each co-op game ends with a\n// TEAM result: a tier (Vàng/Bạc/Đồng/none) and every player banks the\n// same pointsEach (300/200/100/50). See finishCoop().\nconst TIER_LABELS = { vang: 'VÀNG', bac: 'BẠC', dong: 'ĐỒNG', none: 'CHƯA ĐẠT HUY CHƯƠNG' };\nconst TIER_POINTS = { vang: 300, bac: 200, dong: 100, none: 50 };\n// Chung Một Thân: ONE shared blob steered by split direction ownership;\n// checkpoint stars score for the team, cannonballs (slower + sparser\n// than Né Đạn) cost shared hearts.\nconst SHARED_MS = 60000, SHARED_HEARTS = 3, STAR_STALE_TICKS = 240;\nconst SHARED_BALL_SPEED = 0.1;\n// Tiers by checkpoints: >=8 Vàng, >=5 Bạc, >=3 Đồng.\nconst SHARED_TIERS = [[8, 'vang'], [5, 'bac'], [3, 'dong']];\n// Đẩy Hộp Về Đích: crate = circle of radius BOX_CRATE_R; it only moves\n// when >=2 distinct players push it with a summed intent of magnitude\n// >= BOX_PUSH_MIN. Crate step = MOVE_STEP * BOX_STEP_MUL per tick.\nconst BOX_MS = 75000, BOX_CRATE_R = 1.6, BOX_STEP_MUL = 0.6, BOX_PUSH_MIN = 1.2;\n// Tiers by deliveries: >=3 Vàng, 2 Bạc, 1 Đồng.\nconst BOX_TIERS = [[3, 'vang'], [2, 'bac'], [1, 'dong']];\n// Chèo Thuyền: ROW_BEATS beats every ROW_BEAT_MS; a press within\n// +-ROW_WINDOW_MS of a beat is an in-window stroke. A perfect team\n// (every player stroking every beat) advances ROW_FULL_STROKE per beat,\n// covering ROW_COURSE in ROW_BEATS - 5 beats (pace margin built in).\nconst ROW_BEATS = 45, ROW_BEAT_MS = 1000, ROW_WINDOW_MS = 260;\nconst ROW_FULL_STROKE = 10, ROW_COURSE = 400;\nconst ROW_PERFECT = ROW_BEATS * ROW_FULL_STROKE; // 450 m\n// Tiers by % of the perfect-team distance: >=90% Vàng, >=70% Bạc, >=45% Đồng.\nconst ROW_TIERS = [[90, 'vang'], [70, 'bac'], [45, 'dong']];\n// Bot press timing error (+/-ms) by difficulty for Chèo Thuyền.\nconst ROW_ERR = { kho: 120, vua: 220, de: 380 };\n// Xe Tăng Đấu Trường + Thủ Thành share the gun/shell sim: shells fly\n// straight at SHELL_SPEED units/tick, firing costs a SHELL_CD_TICKS\n// (1s) cooldown, and a player hit costs 1 life + INVULN_TICKS (2s) of\n// cover. Xe Tăng cover blocks are arena rects in {x,y,w,h} top-left\n// form, kept off the spawn axes so every spawn lane starts clear.\nconst TANK_MS = 75000, TANK_LIVES = 3, SHELL_SPEED = 0.3, SHELL_CD_TICKS = 16, SHELL_HIT_DIST = 1.0;\nconst TANK_BLOCKS = [\n  { x: 2.9, y: -2.4, w: 2.7, h: 1.1 }, { x: -5.6, y: 1.35, w: 2.7, h: 1.1 },\n  { x: -5.6, y: -2.4, w: 2.7, h: 1.1 }, { x: 2.9, y: 1.35, w: 2.7, h: 1.1 },\n];\n// Đặt Bom: 15x9 grid of 2-unit cells over the wide arena; hard pillars sit\n// on odd/odd cells (classic bomber layout), soft blocks are dealt per\n// match with Math.random so tests can queue the exact layout.\nconst BOM_MS = 75000, BOM_LIVES = 2, BOM_COLS = 15, BOM_ROWS = 9, BOM_FUSE_TICKS = 32, BOM_SOFT_P = 0.62;\n// Kẻ Giả Mạo: one secret impostor per round secretly gets the variant\n// question; catching pays every other player, escaping pays the\n// impostor (doubled in the final round).\nconst IMP_ANSWER_MS = 30000, IMP_DISCUSS_MS = 45000, IMP_VOTE_MS = 20000, IMP_REVEAL_MS = 9000;\n// Ma Sói: hidden-role deduction. One night = wolves hunt + guard /\n// seer / witch act in the same window (the witch sees the wolves'\n// victim only once every living wolf has locked a vote), then dawn\n// announces the dead (roles are public from death on), the village\n// discusses and votes an execution. Side points: winning wolves 300\n// each, winning villagers 200 each, losers 50 each (dead members of\n// the winning side score the same — the side wins or loses together).\n// NIGHT_CAP bounds a game whose guard keeps saving perfectly: at the\n// cap the larger living side wins (a tie goes to the wolves, matching\n// the parity rule).\nconst WOLF_NIGHT_MS = 45000, WOLF_DAWN_MS = 10000, WOLF_DISCUSS_MS = 60000,\n  WOLF_VOTE_MS = 30000, WOLF_EXEC_MS = 10000, WOLF_END_MS = 12000, WOLF_NIGHT_CAP = 15;\nconst WOLF_ROLES = {\n  soi: { name: 'Sói', icon: '🐺' },\n  'tien-tri': { name: 'Tiên Tri', icon: '🔮' },\n  'bao-ve': { name: 'Bảo Vệ', icon: '🛡️' },\n  'phu-thuy': { name: 'Phù Thủy', icon: '🧙' },\n  dan: { name: 'Dân Làng', icon: '🧑‍🌾' },\n};\n// Bot lines for the Ma Sói day discussion: deliberately generic — a\n// bot must never reference roles, night events or anything it could\n// only know secretly (same rule as IMP_CHAT_LINES).\nconst WOLF_CHAT_LINES = [\n  'Đêm qua ghê quá… mọi người cẩn thận nhé.',\n  'Tôi là dân thường thôi, thề luôn!',\n  'Ai nãy giờ im lặng bất thường ấy nhỉ?',\n  'Bình tĩnh, đừng treo nhầm người tốt.',\n  'Tôi nghi người ít nói nhất hôm nay.',\n  'Cứ theo linh cảm của cả làng thôi.',\n  'Ai cũng có vẻ đáng nghi hết trơn…',\n  'Hôm nay phải tìm cho ra sói!',\n];\n// Cờ Cá Ngựa (Vietnamese Ludo): a horse's progress p means 0 = stable,\n// 1..51 on the shared 52-cell loop at (startOffset + p - 1) mod 52,\n// 52..57 in the seat's home stretch, 58 = finished (exact roll needed\n// to land on 58; overshoot is simply not a legal move for that horse).\n// Safe loop cells (no kicking): the 4 start cells + each seat's\n// home-entry cell (the last loop cell before its home stretch).\n// Own horses stack freely on a cell; an opponent landing on a\n// non-safe cell kicks the WHOLE opposing stack back to its stable.\n// No blockade rule: passing over any horse is always allowed.\n// Three sixes in a row forfeit the third roll's move (classic rule).\nconst NGUA_TURN_MS = 30000, NGUA_BOT_MS = 900, NGUA_BEAT_MS = 1500, NGUA_WIN_MS = 4000;\n// Tiến Lên Miền Nam: 30s per turn (wall clock, like Cá Ngựa); bots act\n// ~1s into their turn; the winner banner holds 5s before results.\nconst TL_TURN_MS = 30000, TL_BOT_MS = 900, TL_WIN_MS = 5000;\nconst NGUA_OFFSETS = [0, 13, 26, 39];\nconst NGUA_SAFE = new Set([0, 13, 26, 39, 50, 11, 24, 37]);\n// The 52-cell loop on a 15x15 board as [col, row] pairs, starting at\n// seat board 0's start cell (1,6) and running (1,6)->(5,6)->up the\n// top-left arm->across the top->down the right->across the bottom->\n// up the left back to (0,6). Start cells sit at indices 0/13/26/39,\n// home-entry cells at 50/11/24/37, exactly NGUA_OFFSETS/NGUA_SAFE.\nconst NGUA_LOOP = [\n  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0],\n  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],\n  [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12],\n  [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8],\n  [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],\n];\n// Home stretches (progress 52..57) per board index, running toward\n// the centre cell (7,7); stables (progress 0) per board index.\nconst NGUA_STRETCH = [\n  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],\n  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],\n  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],\n  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],\n];\nconst NGUA_STABLE = [\n  [[1, 1], [4, 1], [1, 4], [4, 4]],\n  [[10, 1], [13, 1], [10, 4], [13, 4]],\n  [[10, 10], [13, 10], [10, 13], [13, 13]],\n  [[1, 10], [4, 10], [1, 13], [4, 13]],\n];\n// Thủ Thành: the crystal's remaining HP decides the tier on survival.\nconst DEF_MS = 60000, DEF_CRYSTAL_HP = 10;\nconst DEF_TIERS = [[7, 'vang'], [4, 'bac'], [1, 'dong']];\n// Giải Mã Chung: levels escalate (longer sequences); the team shares\n// DECODE_HEARTS hearts for the whole game. Tiers by levels completed.\nconst DECODE_MS = 75000, DECODE_HEARTS = 3;\nconst DECODE_TIERS = [[5, 'vang'], [4, 'bac'], [3, 'dong']];\nconst DECODE_SYMBOLS = [\n  { name: 'ĐỎ', color: '#FF4757' }, { name: 'XANH', color: '#3FA9F5' },\n  { name: 'VÀNG', color: '#FFC93D' }, { name: 'HỒNG', color: '#F77FB0' },\n];\n// ---------------------------------------------------------------------------\n// Wave 4: the two PLATFORMER games (Người Que Đại Chiến + Đền Lửa & Nước)\n// share one small platform-physics helper (platStep below): entities are\n// centre-anchored AABBs {x, y, vx, vy, hw, hh, ground}; solids are\n// top-left rects {x, y, w, h} exactly like TANK_BLOCKS, in the arena's\n// [-12, 12] unit space so the page's % mapping works unchanged. Gravity\n// is applied BEFORE the move each tick (semi-implicit Euler), so the\n// discrete jump apex for velocity V is sum(V - k*GRAV) over the rising\n// ticks: at the 125ms tick, V=1.2 -> ~4.2 units, V=1.05 -> ~3.15 units\n// (the pre-retune 250ms values were V=2.6 -> ~4.4, V=2.2 -> ~3.0).\n// Every step-up in both stages below is sized against those apexes,\n// never the naive V²/2G.\n// SMOOTH3 (62.5ms tick): gravity is per-game. Each pair below sits on\n// the half-integer family V = (k + 0.5) * G: apex = G * k^2 / 2 and\n// air time = 2k ticks EXACTLY (the fall returns to launch height on\n// the final tick), and each jump velocity is shaved by 0.0003 so the\n// return tick penetrates the floor by ~0.01u instead of relying on\n// binary float dust to miss the strict-overlap test (the 125ms temple\n// arc only made its 14th tick that way). Fight: k=15 -> apex 4.20,\n// air 30 ticks = 1875ms. Temple/frog: k=14 -> apex 3.15, air 28 ticks\n// = 1750ms. Soccer: k=14 -> apex ~3.50, air 28 ticks = 1750ms.\nconst FIGHT_GRAV = 0.0373333, TEMP_GRAV = 0.0321429, SOCCER_GRAV = 0.0357143;\nconst PLAT_MAXFALL = 0.65, PLAT_HW = 0.45, PLAT_HH = 0.9;\n// Người Que Đại Chiến: %-based knockback fighting on an open stage.\n// A hit adds FIGHT_DMG %; the knockback force 0.3 + dmg*0.025 is applied\n// AFTER the damage lands, so the same punch flies further the more\n// hurt the victim already is. Ring-out (past the blast bounds) costs a\n// life; respawn is on the top platform, damage reset, 2s invulnerable.\nconst FIGHT_MS = 90000, FIGHT_LIVES = 3;\n// SMOOTH3: FIGHT_JUMP = 15.5 * FIGHT_GRAV - 0.0003 (apex 4.20, air\n// 30 ticks); FIGHT_DJUMP = 13.5 * FIGHT_GRAV - 0.0003 (apex ~3.15,\n// air 26 ticks — the double jump keeps the temple arc's height).\nconst FIGHT_RUN = 0.17, FIGHT_JUMP = 0.5783667, FIGHT_DJUMP = 0.5037;\nconst FIGHT_ATK_CD = 12, FIGHT_DMG = 10, FIGHT_HITSTUN = 12;\n// Heavy swing (pad X): own cooldown, +16% and 1.5x the knockback\n// force of a normal hit at the same resulting damage; the attacker's\n// recovery (hvyT, the big-swing pose) runs 12 ticks.\nconst FIGHT_HVY_CD = 20, FIGHT_HVY_DMG = 16, FIGHT_HVY_ATK_T = 12;\nconst FIGHT_DASH_CD = 32, FIGHT_DASH_TICKS = 12, FIGHT_DASH_SPEED = 0.475;\n// 16:9 WAVE: platforms are the old layout under the arena map\n// (x*4/3, y*3/4). Vertical gaps SHRINK (4.0 -> 3.0 < jump apex 4.2)\n// and horizontal gaps grow by 4/3 (still far inside the ~5.4u jump\n// range), so every proven route keeps working; physics untouched.\nconst FIGHT_PLATFORMS = [\n  { x: -11.33, y: 4.5, w: 22.67, h: 1.9 },\n  { x: -10.67, y: 1.5, w: 6, h: 0.5, oneWay: true },\n  { x: 4.67, y: 1.5, w: 6, h: 0.5, oneWay: true },\n  { x: -3.33, y: -1.13, w: 6.67, h: 0.5, oneWay: true },\n];\n// First four are the original 4-player spawns (x*4/3); players 5-8\n// fill the gaps so an 8-fighter match never stacks two fighters on\n// one spot.\nconst FIGHT_SPAWN_X = [-8, -2.7, 2.7, 8, -10.7, -5.3, 5.3, 10.7];\n// Đền Lửa & Nước: co-op temple. Seats alternate elements by seat order\n// (odd seat = Lửa 'lua', even = Nước 'nuoc'). One handcrafted enclosed\n// level: three floors, element pools, colour-locked gems, and one\n// linked pair of pressure gates — the portcullis slabs beside the two\n// balcony stairs stay down unless SOMEONE stands on a button: button 1\n// sits on a ledge on the Nước side, button 2 on the balcony itself, so\n// the first climber is held up by a partner and then holds the gate\n// for them in turn. Wrong-element (or green) pool = death: respawn at\n// the element start, the team loses one of TEMP_HEARTS hearts.\nconst TEMP_MS = 200000, TEMP_HEARTS = 5; // 150s at the old 24-wide level, scaled by the 32/24 width so the wide temple keeps the same time budget per unit of travel\n// Temple runs on the shared tick with its own platform gravity\n// (TEMP_GRAV / PLAT_MAXFALL via platStep), rescaled like the\n// fighter's: TEMP_RUN is the old 0.65 per 250ms tick quartered, and\n// TEMP_JUMP reproduces the old discrete arc (apex 3.15 vs the\n// old 3.0; air time 14 ticks = 1750ms and jump range 4.55u, both\n// exactly the old values). It originally kept its own 250ms tick\n// because gate slab 2 began at x 5.5, only 0.2 past the mid-floor red\n// pool's end (5.3): a pool-jump takeoff from the pool's edge clears\n// the slab's shadow in the first tick at 0.65u/tick but not at\n// 0.325u/tick — the jumper stayed under the slab, head-bonked, and\n// dropped into the lethal pool (mirrored at gate 1 / the blue pool).\n// Both slabs now sit 0.4 further out (gate 1 x -6.6, gate 2 x 5.9),\n// which reopens that first-tick window while the slabs still flank\n// the balcony stairs and block the climb exactly as before (the 0.4\n// gap to the balcony edge is narrower than a character's 0.9 body,\n// and a stair jump's apex never rises past the slab tops).\n// SMOOTH3: TEMP_JUMP = 14.5 * TEMP_GRAV - 0.0003 (apex 3.15, air\n// 28 ticks = 1750ms, jump range 28 * 0.1625 = 4.55u — unchanged).\nconst TEMP_RUN = 0.1625, TEMP_JUMP = 0.4657714;\n// 16:9 WAVE: the temple is re-laid for the 32x18 field WITHOUT\n// touching physics: every feature keeps its local relationships —\n// left-side features shift -4, right-side +4, centre-spanning solids\n// stretch, and all y coordinates scale by 3/4 (steps get SHORTER, so\n// every proven jump keeps working; pool widths and the gate-slab /\n// pool-end gaps are preserved to the centimetre).\n// SMOOTH3 (62.5ms): the two mid-floor side pools shift 0.4 toward\n// the centre (blue -9.3 -> -8.9, red 6.9 -> 6.5). At 125ms a jump\n// off the mid floor beside a gate slab cleared BOTH the slab's\n// head-bonk shadow and the pool's feet band in one tick (x-step\n// 0.325, rise 0.90; the slab margin was 0.015). At 62.5ms (x-step\n// 0.1625, first-tick rise 0.434 < the 0.45 band depth) no takeoff\n// position satisfied both, so that jump was impossible; the shift\n// reopens a 0.3u takeoff window. The slabs cannot move instead:\n// 0.4 further out they would overlap the balcony stairs. Widths,\n// kinds and the bottom pools are unchanged.\nconst TEMPLE_LEVEL = {\n  solids: [\n    { x: -16, y: 7.5, w: 32, h: 1.8 },\n    { x: -16, y: -9, w: 1, h: 16.5 },\n    { x: 15, y: -9, w: 1, h: 16.5 },\n    { x: -16, y: -9, w: 32, h: 0.75 },\n    { x: -14.9, y: 5.1, w: 2.2, h: 0.53, oneWay: true },\n    { x: 12.7, y: 5.1, w: 2.2, h: 0.53, oneWay: true },\n    { x: -12.5, y: 2.7, w: 25, h: 0.75, oneWay: true },\n    { x: -12.9, y: 0.6, w: 2, h: 0.53, oneWay: true },\n    { x: 10.9, y: 0.6, w: 2, h: 0.53, oneWay: true },\n    { x: -9.5, y: -2.1, w: 19, h: 0.75, oneWay: true },\n    { x: 12.6, y: 0.4, w: 2.3, h: 0.53, oneWay: true },\n  ],\n  gates: [\n    { x: -10.6, y: -3.9, w: 0.7, h: 4.5 },\n    { x: 9.9, y: -3.9, w: 0.7, h: 4.5 },\n  ],\n  buttons: [\n    { x: 13.2, y: -0.05, w: 1.1, h: 0.45 },\n    { x: -0.55, y: -2.55, w: 1.1, h: 0.45 },\n  ],\n  pools: [\n    { x: -10.2, y: 7.05, w: 2.8, h: 0.45, kind: 'red' },\n    { x: -1.4, y: 7.05, w: 2.8, h: 0.45, kind: 'green' },\n    { x: 7.4, y: 7.05, w: 2.8, h: 0.45, kind: 'blue' },\n    { x: -8.9, y: 2.25, w: 2.4, h: 0.45, kind: 'blue' }, // SMOOTH3: -9.3 -> -8.9 (see the SMOOTH3 pool note below)\n    { x: -1.1, y: 2.25, w: 2.2, h: 0.45, kind: 'green' },\n    { x: 6.5, y: 2.25, w: 2.4, h: 0.45, kind: 'red' }, // SMOOTH3: 6.9 -> 6.5 (see the SMOOTH3 pool note below)\n  ],\n  gems: [\n    { x: -8.8, y: 6.4, el: 'lua' }, { x: -0.7, y: 5.8, el: 'lua' }, { x: -8.1, y: -0.3, el: 'lua' },\n    { x: 11.8, y: 2.0, el: 'lua' }, { x: -7.9, y: -0.6, el: 'lua' },\n    { x: 8.8, y: 6.4, el: 'nuoc' }, { x: 0.7, y: 5.8, el: 'nuoc' }, { x: 8.1, y: -0.3, el: 'nuoc' },\n    { x: -11.8, y: 2.0, el: 'nuoc' }, { x: 13.7, y: -0.3, el: 'nuoc' },\n  ],\n  doors: {\n    lua: { x: -9.4, y: -3.45, w: 1.7, h: 1.35 },\n    nuoc: { x: 7.7, y: -3.45, w: 1.7, h: 1.35 },\n  },\n  starts: { lua: { x: -13.5, y: 6.6 }, nuoc: { x: 13.5, y: 6.6 } },\n};\n// Bot waypoint routes through the temple (target = character centre).\n// The bot brain adds two generic rules on top of plain steering: jump\n// when a waypoint sits above and the bot is close + grounded, and jump\n// any pool ahead that is lethal to the bot's own element. 'holdBtn'\n// waypoints park the bot on a gate button until every other character\n// is on the balcony (centre y < 1.0) or home, with a 30s timeout so a\n// stuck partner can never freeze the bot forever.\nconst TEMPLE_WP = {\n  lua: [\n    { x: -13.8, y: 4.2 }, { x: -2.6, y: 1.8 }, { x: 0.5, y: 1.8 },\n    { x: -11.9, y: -0.3 }, { x: -8.9, y: -3.0 },\n    { x: -0.45, y: -3.0, holdBtn: true }, { x: -8.55, y: -3.0 },\n  ],\n  nuoc: [\n    { x: 13.8, y: 4.2 }, { x: 2.6, y: 1.8 },\n    { x: 13.7, y: -0.5, holdBtn: true },\n    { x: 0.5, y: 1.8 }, { x: 11.9, y: -0.3 }, { x: 8.55, y: -3.0 },\n    { x: 0.45, y: -3.0, holdBtn: true }, { x: 8.55, y: -3.0 },\n  ],\n};\n// Temple finish tiers: completed + every gem = Vàng, completed = Bạc,\n// at least half of all gems (even unfinished) = Đồng.\nconst TEMP_GEMS_TOTAL = 10;\n\n// ---------------------------------------------------------------------------\n// Wave 5: Đá Bóng Đầu To (versus team soccer), Ếch Ộp Phiêu Lưu (co-op\n// swallow-carry platformer) and Đại Bác Căn Góc (turn-based artillery).\n// ---------------------------------------------------------------------------\n// --- Đá Bóng Đầu To -------------------------------------------------------\n// Side-view pitch in its own 32 x 18 unit space (x in [-19, 19] inside\n// the goal boxes, y in [-9, 9]); the page maps it with the .afield.wide\n// 16:9 variant. Teams by seat parity: odd seats = Đỏ (defend the LEFT\n// goal, attack right), even seats = Xanh. Players run on platStep; the\n// ball is a circle with its own integrator (gravity, restitution,\n// rolling friction, circle-vs-rect bounces off the same solids list).\n// Control map (phone + APK): disc/stick = run, U or Y = jump,\n// A = SÚT (kick), B = LƯỚT (dash). A goal pauses the match clock for a\n// 2.5s celebration, then everyone resets to the kickoff formation.\nconst SOCCER_MS = 90000, SOCCER_GOAL_MS = 2500;\n// SMOOTH3: SOCCER_JUMP = 14.5 * SOCCER_GRAV - 0.0003 (apex ~3.50,\n// air 28 ticks); ball gravity follows the x0.25 discrete rule.\nconst SOCCER_RUN = 0.18, SOCCER_JUMP = 0.5175571;\nconst SOCCER_KICK_CD = 12, SOCCER_KICK_VX = 0.44, SOCCER_KICK_VY = 0.31;\nconst SOCCER_DASH_CD = 32, SOCCER_DASH_TICKS = 12, SOCCER_DASH_SPEED = 0.475;\nconst SOCCER_BALL_R = 0.55, SOCCER_BALL_GRAV = 0.0225, SOCCER_BALL_REST = 0.62;\nconst SOCCER_SOLIDS = [\n  { x: -19, y: 8, w: 38, h: 1.6 },\n  { x: -19, y: -9.6, w: 38, h: 0.6 },\n  { x: -17, y: -9, w: 1, h: 14.4 },\n  { x: 16, y: -9, w: 1, h: 14.4 },\n  { x: -19, y: 4.8, w: 3, h: 0.6 },\n  { x: 16, y: 4.8, w: 3, h: 0.6 },\n  { x: -19, y: -9, w: 1, h: 17 },\n  { x: 18, y: -9, w: 1, h: 17 },\n];\nconst SOCCER_FWD_X = [-4, -7, -10.5]; // forward slots (goalie is separate)\nconst SOCCER_GOALIE_X = 13.8;\n// --- Ếch Ộp Phiêu Lưu -----------------------------------------------------\n// Co-op platformer in the temple's 24 x 24 space. Solo jump V=1.05 is\n// the temple arc (apex 3.15, range ~4.55u at run 0.325, ~4.2u of safe\n// spike clearance); a carrier's jump V=1.45 is far bigger (apex ~6.3,\n// range ~6.2u, ~5.9u clearance) — the wide spike strips (5.2u) are\n// sized exactly between the two, so they can ONLY be crossed carrying\n// a teammate (or by being carried). Swallow/spit is the B or X rising\n// edge near a free teammate; the passenger rides hidden in the belly.\n// A carrier touching spikes kills BOTH frogs for ONE shared heart.\nconst FROG_HEARTS = 5, FROG_PER_MS = 120000;\n// SMOOTH3: frogs fly on TEMP_GRAV; FROG_JUMP = TEMP_JUMP (air 28\n// ticks, range 4.55u); FROG_JUMP_CARRY = 19.5 * TEMP_GRAV - 0.0003\n// (air 38 ticks, range 38 * 0.1625 = 6.175u — the spike-strip sizing\n// arithmetic is unchanged; apex ~5.80 vs ~6.30 before, clearance is\n// governed by range, not apex).\nconst FROG_RUN = 0.1625, FROG_JUMP = 0.4657714, FROG_JUMP_CARRY = 0.6264857;\nconst FROG_EAT_R = 1.25;\n// 16:9 WAVE: chambers re-laid for the 32x18 field with physics\n// untouched: spike strips keep their exact widths (5.2u still fits\n// between the solo jump range 4.55 and the carrier range 6.2), all\n// vertical rises scale by 3/4 (easier, never harder), and every\n// proven route - swallow-carry, crate climb, crate glide - keeps\n// the same shape with wider margins.\nconst FROG_WALLS = [\n  { x: -16, y: 7.5, w: 32, h: 1.8 },\n  { x: -16, y: -9, w: 1, h: 16.5 },\n  { x: 15, y: -9, w: 1, h: 16.5 },\n  { x: -16, y: -9, w: 32, h: 0.75 },\n];\nconst FROG_LEVELS = [\n  { // Chamber 1 - the first spike strip: too wide to jump alone.\n    solids: [{ x: 3.6, y: 5.4, w: 3, h: 0.53, oneWay: true }],\n    spikes: [{ x: -2.6, y: 7.05, w: 4.9, h: 0.45 }],\n    crates: [],\n    flies: [{ x: -6, y: 5.7 }, { x: 0, y: 1.3 }, { x: 5.1, y: 2.9 }],\n    door: { x: 13.9, y: 6.15, w: 1.8, h: 1.35 },\n    starts: [{ x: -13.5, y: 6.6 }, { x: -11.9, y: 6.6 }, { x: -10.3, y: 6.6 }, { x: -8.7, y: 6.6 }],\n  },\n  { // Chamber 2 - push the crate against the plateau, climb it, cross.\n    solids: [{ x: 5, y: 3.3, w: 8, h: 4.2 }],\n    spikes: [{ x: -6.5, y: 7.05, w: 2, h: 0.45 }],\n    crates: [{ x: 0.2, y: 6.9 }],\n    flies: [{ x: -8.5, y: 5.7 }, { x: -4.8, y: 4.35 }, { x: 8, y: 1.5 }],\n    door: { x: 9.3, y: 1.95, w: 1.7, h: 1.35 },\n    starts: [{ x: -13.5, y: 6.6 }, { x: -11.9, y: 6.6 }, { x: -10.3, y: 6.6 }, { x: -8.7, y: 6.6 }],\n  },\n  { // Chamber 3 - a carrier strip (A: -9.5..-4.3), a mid safe zone with\n    // the crate, then strip B (8.2..10.5) running right up to the plateau\n    // face: push the crate across B (crates are spike-immune), hop onto\n    // it from the safe edge, then up to the plateau.\n    solids: [{ x: 10.5, y: 4.2, w: 4.5, h: 3.3 }],\n    spikes: [{ x: -9.5, y: 7.05, w: 5.2, h: 0.45 }, { x: 8.2, y: 7.05, w: 2.3, h: 0.45 }],\n    crates: [{ x: 1.2, y: 6.9 }],\n    flies: [{ x: -11.3, y: 5.7 }, { x: -7.85, y: 1.2 }, { x: 12.6, y: 2.4 }],\n    door: { x: 12.8, y: 2.85, w: 1.7, h: 1.35 },\n    starts: [{ x: -13.8, y: 6.6 }, { x: -12.9, y: 6.6 }, { x: -12.0, y: 6.6 }, { x: -11.1, y: 6.6 }],\n  },\n];\nconst FROG_WP = [\n  [{ x: -7.0 }, { x: -4.2, swallow: 1 }, { x: 3.8, spit: 1 }, { x: 14.8 }],\n  [{ x: -7.6 }, { x: 0.2 }, { x: 4.4, y: 5.4 }, { x: 6.0, y: 3.53 }, { x: 10.15 }],\n  [{ x: -10.6, swallow: 1 }, { x: -3.6, spit: 1 }, { x: 1.2 }, { x: 8.6 }, { x: 9.9, y: 5.4 }, { x: 11.6, y: 4.05 }, { x: 13.65 }],\n];\n\n// --- Đại Bác Căn Góc ------------------------------------------------------\n// Turn-based artillery on a 120-column heightmap over a 24 x 16 space\n// (x in [-12, 12], y in [-8, 8], y grows DOWN: a column's height value\n// is the y of its ground surface). Shells integrate in 4 substeps per\n// tick with gravity + wind; the boom carves a circular crater and\n// damage falls off linearly from CANNON_DMG at the centre. Control\n// map: pad U/D sweeps the barrel angle (5-85 deg), pad L/R sweeps\n// power (0-100), X flips facing, A fires; the 'setAim' action sets\n// angle/power/face exactly (sliders / tests). NO trajectory preview.\nconst CANNON_COLS = 160, CANNON_AIM_MS = 30000, CANNON_BOOM_MS = 800, CANNON_MATCH_MS = 360000;\n// SMOOTH3: per-tick totals halve at the 62.5ms tick — grav and windK\n// halve (each tick applies sub x (value/sub)), maxV (a per-tick\n// velocity) halves; sub stays 4 so the integration shape is kept.\nconst BALLISTICS = { grav: 0.025, sub: 4, maxV: 0.8, windK: 0.00075, blastR: 2.2, dmgMax: 60 };\n// SMOOTH3 note: grav and windK are accelerations — when the tick\n// halved they QUARTERED (0.10 -> 0.025, 0.003 -> 0.00075), because\n// per-second acceleration is g / T^2. maxV is a velocity and halved.\n// (An earlier draft halved grav too; the shell's range, v^2/g,\n// halved with it and the snipe solver found no solutions.)\nconst CANNON_HP = 100;\n\n// ---------------------------------------------------------------------------\n// Small utilities\n// ---------------------------------------------------------------------------\nfunction now() { return Date.now(); }\nfunction rand(min, max) { return min + Math.random() * (max - min); }\nfunction randInt(min, max) { return Math.floor(rand(min, max + 1)); }\nfunction pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }\nfunction shuffle(arr) {\n  const a = arr.slice();\n  for (let i = a.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    const t = a[i]; a[i] = a[j]; a[j] = t;\n  }\n  return a;\n}\nfunction makeToken() {\n  const bytes = new Uint8Array(12);\n  crypto.getRandomValues(bytes);\n  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');\n}\nfunction json(data, status) {\n  return new Response(JSON.stringify(data), {\n    status: status || 200,\n    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },\n  });\n}\nfunction fail(message, status) { return json({ ok: false, error: message }, status || 400); }\n\n// ---------------------------------------------------------------------------\n// Room storage + helpers\n// ---------------------------------------------------------------------------\n// Primary store: one Durable Object per room code (binding ROOMS_DO, class\n// RoomStore below). DO storage writes are not subject to the KV daily write\n// limit that took the game down. KV (binding ROOMS) is kept only as a\n// fallback for environments without the DO binding.\n//\n// lastSavedJson is a best-effort, isolate-local write dedup: saveRoom skips\n// the underlying put when the payload is byte-identical to the last one this\n// isolate wrote. Correctness never depends on it — a cold isolate simply\n// writes again.\nconst lastSavedJson = new Map();\n\nfunction roomStub(env, code) {\n  return env.ROOMS_DO.get(env.ROOMS_DO.idFromName(code));\n}\nasync function loadRoom(env, code) {\n  if (env.ROOMS_DO) {\n    const res = await roomStub(env, code).fetch('https://room/get');\n    if (res.status === 404) return null;\n    const raw = await res.text();\n    return raw ? JSON.parse(raw) : null;\n  }\n  const raw = await env.ROOMS.get('room:' + code);\n  return raw ? JSON.parse(raw) : null;\n}\nasync function saveRoom(env, room) {\n  room.updatedAt = now();\n  const payload = JSON.stringify(room);\n  if (lastSavedJson.get(room.code) === payload) return;\n  if (env.ROOMS_DO) {\n    await roomStub(env, room.code).fetch('https://room/put', { method: 'PUT', body: payload });\n  } else {\n    await env.ROOMS.put('room:' + room.code, payload, { expirationTtl: ROOM_TTL_SECONDS });\n  }\n  lastSavedJson.set(room.code, payload);\n}\nasync function deleteRoom(env, code) {\n  lastSavedJson.delete(code);\n  if (env.ROOMS_DO) {\n    await roomStub(env, code).fetch('https://room/delete', { method: 'POST' });\n  } else if (env.ROOMS.delete) {\n    await env.ROOMS.delete('room:' + code);\n  }\n}\n// After a worker-side mutation (join / action) is saved, nudge the room's\n// Durable Object so any WebSocket clients attached to it receive the new\n// views immediately and the tick alarm stays armed. Fire-and-forget via\n// waitUntil: the HTTP response — above all the tiny pad ack — must never\n// wait on it, and a failed poke changes nothing (polls + alarm recover).\nfunction pokeRoom(env, code, ctx) {\n  if (!env.ROOMS_DO) return;\n  const p = roomStub(env, code).fetch('https://room/poke', { method: 'POST' }).catch(() => {});\n  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);\n}\n\n// Durable Object holding one room. Internal protocol (only loadRoom /\n// saveRoom / deleteRoom / pokeRoom talk to it over fetch):\n//   GET    /get    → 200 with the room JSON text, or 404 if absent/expired\n//   PUT    /put    → store the room JSON text with a fresh expiry, 200\n//   POST   /delete → clear the room, 200\n//   GET    /ws     → WebSocket upgrade (worker-validated identity arrives\n//                    as x-np-role / x-np-seat / x-np-token headers and is\n//                    re-checked against the stored room before accept)\n//   POST   /poke   → a worker-side HTTP mutation was saved: broadcast the\n//                    fresh views to attached sockets and re-check the alarm\n// The stored value is an envelope { json, expiresAt } under the key 'room';\n// expiry is logical (checked on /get) because DO storage has no TTL.\n//\n// WebSocket channel (hibernation API): sockets are tagged by role/seat and\n// carry { role, seat, token } as their attachment. Server→client messages:\n//   {\"type\":\"state\",\"view\":<the exact object GET /state returns for that\n//   recipient>} — sent only when the serialized view (with the serverNow\n//   clock field neutralized, since it changes on every call) differs from\n//   the last one sent to that socket; {\"type\":\"error\",\"error\":...} for a\n//   rejected client action; {\"type\":\"bye\"} right before a fatal close\n//   (bad identity, room deleted/expired). Client→server messages are the\n//   POST /action body minus token/role and dispatch through the very same\n//   advance/hostAction/playerAction pipeline as HTTP. While a game is\n//   active and at least one socket is attached, a storage alarm every\n//   TICK_MS advances the sim so ticks no longer depend on anyone polling.\nfunction newRoom(code, hostToken) {\n  return {\n    code, hostToken, phase: 'lobby', players: [], game: null, lastGame: null,\n    resultsLog: [], bubble: null, prevRanks: null, createdAt: now(), updatedAt: now(),\n    playlist: null, playlistNextAt: null,\n  };\n}\nfunction playerAt(room, seat) { return room.players.find((p) => p.seat === seat) || null; }\nfunction humanCount(room) { return room.players.filter((p) => p.type === 'human').length; }\nfunction liveScore(room, p) { return p.score + (room.game ? (room.game.points[p.seat] || 0) : 0); }\nfunction standingsOf(room) {\n  return room.players.slice()\n    .sort((a, b) => (liveScore(room, b) - liveScore(room, a)) || (a.seat - b.seat))\n    .map((p) => p.seat);\n}\nfunction ranksOf(room) {\n  const st = standingsOf(room); const r = {};\n  st.forEach((seat, i) => { r[seat] = i + 1; });\n  return r;\n}\n// After points change: remember how ranks moved (drives blob moods), refresh ranks.\nfunction snapshotRanks(room) {\n  const g = room.game;\n  const current = ranksOf(room);\n  if (g && room.prevRanks) {\n    g.rankMoves = {};\n    room.players.forEach((p) => { g.rankMoves[p.seat] = (room.prevRanks[p.seat] || current[p.seat]) - current[p.seat]; });\n  }\n  room.prevRanks = current;\n}\n\n// ---------------------------------------------------------------------------\n// Bot personality: teasing speech bubbles (self-authored lines)\n// ---------------------------------------------------------------------------\nconst BUBBLES = {\n  lead: ['Theo kịp tui đi nè!', 'Chậm vậy, ngủ gật à?', 'Đỉnh cao là đây chứ đâu!', 'Cứ thế này thì cúp về tay tui.'],\n  mid: ['Vòng này tui lấy điểm!', 'Ai run tay là thua nha.', 'Đang nóng máy đây, chờ chút!', 'Chưa biết mèo nào cắn mỉu nào đâu.'],\n  last: ['Đợi đó, vòng sau biết tay!', 'Tui đang nhường thôi đó.', 'Từ từ, tui chưa tung chiêu đâu!', 'Thua keo này ta bày keo khác!'],\n};\nfunction rollBubble(room) {\n  const bots = room.players.filter((p) => p.type === 'bot');\n  if (!bots.length || Math.random() > 0.4) return;\n  const bot = pick(bots);\n  const st = standingsOf(room);\n  const rank = st.indexOf(bot.seat);\n  const mood = rank === 0 ? 'lead' : (rank === st.length - 1 && st.length > 1 ? 'last' : 'mid');\n  room.bubble = { seat: bot.seat, text: pick(BUBBLES[mood]), until: now() + 4500 };\n}\n\n// ---------------------------------------------------------------------------\n// Game lifecycle\n// ---------------------------------------------------------------------------\nfunction createGame(room, gameId) {\n  const meta = GAMES[gameId];\n  const game = {\n    id: gameId, round: 1, totalRounds: meta.rounds, phase: 'countdown', endsAt: now() + 3000,\n    points: {}, streaks: {}, inputs: {}, botPlan: {}, reveal: null, lastRound: null, rankMoves: {},\n    order: null, current: null, seq: null, greenAt: 0, qStart: 0, raceStart: 0, inputStart: 0,\n    pad: {}, padPrev: {}, blobs: null, arenaR: 0, tickCount: 0, nextTickAt: 0, elimOrder: [], botIntent: {}, dashCd: {}, dashBoost: {}, shoveCd: {},\n    balls: null, spawnIn: 0, invuln: {}, elimTick: {},\n    presses: {}, knot: 0, teams: null, winnerTeam: null,\n    pair: null, chat: {},\n    stars: null, starSeq: 0, goldIn: 0, banked: {}, hold: {}, crown: null, grid: null, paintCd: {},\n    teamResult: null, owners: null, shared: null, star: null, starTick: 0, hearts: 0, checks: 0, sharedInvuln: 0,\n    crate: null, goal: null, walls: null, layout: 0, deliveries: 0,\n    rowStart: 0, distance: 0, hits: {}, splash: {}, stroked: {}, beatDone: 0,\n    shells: [], shellSeq: 0, facing: {}, fireCd: {},\n    votes: {}, imp: null, usedPairs: [], chatLog: [],\n    hardCells: [], softCells: [], bombs: [], bombSeq: 0, blasts: [],\n    slimes: [], slimeSeq: 0, crystal: null, kills: 0,\n    level: 0, levelsDone: 0, stepIdx: 0, botPressAt: 0, decodeAt: 0,\n    vel: {}, dmg: {}, face: {}, jumps: {}, atkCd: {}, hitT: {}, atkT: {}, dashT: {}, dashDir: {}, hvyCd: {}, hvyT: {},\n    chars: null, gems: null, gemCount: {}, gateOpen: false, elOf: {}, wpIdx: {}, wpAt: {},\n    wolf: null, ng: null, tl: null,\n    ball: null, score: {}, lastTouch: null, goalInfo: null, goalieSeat: {}, kickCd: {}, remainMs: 0,\n    frogs: null, chamber: 0, chambersDone: 0, fliesEaten: 0, flies: [], crates: [],\n    heights: null, cannons: null, turnSeat: null, wind: 0, shell: null, boomFx: null,\n    dmgDealt: {}, botFireAt: 0, lastImpact: null, matchEndsAt: 0, elimAt: {},\n  };\n  room.players.forEach((p) => { game.points[p.seat] = 0; game.streaks[p.seat] = 0; });\n  if (gameId === 'do-vui') game.order = shuffle(QUIZ_BANK.map((_, i) => i)).slice(0, meta.rounds);\n  // Chia Hay Cướp rotates pairs across the table: one round per player.\n  if (gameId === 'chia-cuop') game.totalRounds = Math.max(2, room.players.length);\n  room.game = game;\n  room.phase = 'playing';\n  room.prevRanks = ranksOf(room);\n}\nfunction setupCountdown(room) {\n  const g = room.game;\n  g.phase = 'countdown';\n  g.endsAt = now() + 3000;\n  g.inputs = {}; g.botPlan = {}; g.reveal = null;\n}\nfunction nextRoundOrEnd(room) {\n  const g = room.game;\n  if (g.round < g.totalRounds) { g.round += 1; setupCountdown(room); }\n  else endGame(room);\n}\nfunction endGame(room) {\n  const g = room.game;\n  room.players.forEach((p) => { p.score += g.points[p.seat] || 0; });\n  const entry = { game: g.id, name: GAMES[g.id].name, points: Object.assign({}, g.points), at: now() };\n  if (g.teamResult) entry.teamResult = g.teamResult;\n  room.resultsLog.push(entry);\n  if (room.resultsLog.length > 20) room.resultsLog = room.resultsLog.slice(-20);\n  room.lastGame = { id: g.id, name: entry.name, points: entry.points, standings: standingsOf(room), teamResult: g.teamResult || null };\n  snapshotRanks(room);\n  room.game = null;\n  room.phase = 'results';\n  // Playlist mode: if games remain in the queue, arm the intermission\n  // auto-start; advance() fires it once the gap elapses (the DO alarm\n  // stays armed meanwhile, and plain polling is the fallback). If that\n  // was the last queued game, the playlist simply ends here.\n  if (room.playlist) {\n    if (room.playlist.idx + 1 < room.playlist.queue.length) room.playlistNextAt = now() + PLAYLIST_GAP_MS;\n    else { room.playlist = null; room.playlistNextAt = null; }\n  }\n  rollBubble(room);\n}\nfunction isFinalRound(g) { return g.round === g.totalRounds; }\nfunction roundPoints(g, pts) { return isFinalRound(g) ? pts * 2 : pts; }\n\n// ---------------------------------------------------------------------------\n// Round setup (runs when the 3-2-1 countdown expires) + bot plans\n// ---------------------------------------------------------------------------\nfunction botDelay(diff, range) { return Math.round(rand(range[0], range[1])); }\n// Chia Hay Cướp bot personalities are deliberately deterministic so a\n// bot's word can be read at the table: Dễ bots always split, Khó bots\n// always steal, Vừa bots split on odd rounds and steal on even rounds.\nfunction chiaBotChoice(diff, round) {\n  if (diff === 'de') return 'chia';\n  if (diff === 'kho') return 'cuop';\n  return round % 2 === 1 ? 'chia' : 'cuop';\n}\nconst NEGOT_LINES = [\n  'Chia đôi cho lành nhé!',\n  'Tin tui đi, chia là chắc ăn nhất.',\n  'Cướp là tui không nể đâu nha.',\n  'Thương lượng đàng hoàng nè, chia nhé?',\n];\n// Kẻ Giả Mạo bot discussion lines: deliberately generic — a bot must\n// never reference either question (it only knows its own, and saying\n// it out loud would break the secrecy rule for everyone).\nconst IMP_CHAT_LINES = [\n  'Hmm… câu này ai cũng biết mà nhỉ?',\n  'Tôi trả lời chắc chắn 100% luôn.',\n  'Có người đang giấu đấy, nhìn là biết.',\n  'Mọi người bình tĩnh, tôi vô tội!',\n  'Câu này dễ ợt, khỏi bàn.',\n  'Ai cười tủm tỉm nãy giờ ấy nhỉ?',\n  'Tôi nghi người im lặng nhất phòng này.',\n  'Thề luôn, đáp án của tôi là thật.',\n];\n// Round setup must not erase a gamepad state the player is physically\n// still holding: both clients send pad state only when it changes, so\n// wiping g.pad at spawn would freeze anyone who grabbed a direction (or\n// held A/B) during the 3-2-1 countdown until they happened to re-touch.\n// Keep the held state, pruned to the seats currently at the table (a\n// seat that left between rounds must not resurrect), and clear padPrev\n// so a held button reads as a fresh rising edge on the round's first\n// tick (a held A fires at once, a held B dashes at once).\n// Held-pad bitmask for the view: lets every screen predict a\n// REMOTE human's blob from their last known input (the same trick\n// local seats already use), instead of rendering it a full round\n// trip behind the server. Bits: up1 down2 left4 right8 a16 b32\n// x64 y128. Only human seats get one — bots have no pad.\nfunction padMask(pad) {\n  if (!pad) return 0;\n  // Server pads are stored with short keys (u/d/l/r) by the pad\n  // action handler; the client decodes the mask back into its own\n  // long-key pad shape in predPadFor.\n  let m = 0;\n  if (pad.u) m |= 1; if (pad.d) m |= 2; if (pad.l) m |= 4; if (pad.r) m |= 8;\n  if (pad.a) m |= 16; if (pad.b) m |= 32; if (pad.x) m |= 64; if (pad.y) m |= 128;\n  return m;\n}\nfunction preservePads(room) {\n  const g = room.game;\n  const kept = {};\n  room.players.forEach((p) => { if (g.pad && g.pad[p.seat]) kept[p.seat] = g.pad[p.seat]; });\n  g.pad = kept;\n  g.padPrev = {};\n}\n// Shared spawn for the walled tick-arena games: blobs on the ring at\n// ARENA_R0*0.55 with fresh cooldown / invulnerability maps.\nfunction spawnArenaBlobs(room, lives) {\n  const g = room.game;\n  g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; g.dashCd = {}; g.dashBoost = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};\n  room.players.forEach((p, i) => {\n    const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n    g.blobs[p.seat] = {\n      x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n      y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n      lives, alive: true,\n    };\n    g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.invuln[p.seat] = 0;\n  });\n}\n// Guns for Xe Tăng / Thủ Thành: facing starts aimed at the centre\n// (the last-movement direction from then on), fire cooldowns clear.\nfunction initGuns(room) {\n  const g = room.game;\n  g.shells = []; g.shellSeq = 0; g.facing = {}; g.fireCd = {};\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    const d = Math.hypot(b.x, b.y) || 1;\n    g.facing[p.seat] = { x: Math.round(-b.x / d * 100) / 100, y: Math.round(-b.y / d * 100) / 100 };\n    g.fireCd[p.seat] = 0;\n  });\n}\nfunction beginRound(room) {\n  const g = room.game; const t = now();\n  g.inputs = {}; g.botPlan = {}; g.reveal = null;\n  const bots = room.players.filter((p) => p.type === 'bot');\n  if (g.id === 'do-vui') {\n    const src = QUIZ_BANK[g.order[g.round - 1]];\n    const opts = shuffle(src.options.map((text, i) => ({ text, correct: i === src.answer })));\n    g.current = { q: src.q, options: opts.map((o) => o.text), correct: opts.findIndex((o) => o.correct) };\n    g.phase = 'question'; g.qStart = t; g.endsAt = t + QUIZ_MS;\n    bots.forEach((p) => {\n      const B = BOT[p.difficulty];\n      let choice;\n      if (Math.random() < B.quizCorrect) choice = g.current.correct;\n      else { const wrong = [0, 1, 2, 3].filter((i) => i !== g.current.correct); choice = pick(wrong); }\n      g.botPlan[p.seat] = { choice, at: t + botDelay(p.difficulty, B.quizDelay) };\n    });\n  } else if (g.id === 'day-ra') {\n    g.phase = 'arena';\n    g.arenaR = ARENA_R0; g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + ARENA_MS;\n    g.blobs = {}; g.elimOrder = []; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);\n    room.players.forEach((p, i) => {\n      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n      g.blobs[p.seat] = {\n        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n        lives: ARENA_LIVES, alive: true,\n      };\n      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0;\n    });\n  } else if (g.id === 'ne-dan') {\n    g.phase = 'dodge';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + DODGE_MS;\n    g.blobs = {}; g.balls = []; g.spawnIn = 24; g.elimOrder = []; g.elimTick = {};\n    g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};\n    room.players.forEach((p, i) => {\n      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n      g.blobs[p.seat] = {\n        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n        lives: DODGE_LIVES, alive: true,\n      };\n      g.dashCd[p.seat] = 0; g.invuln[p.seat] = 0;\n    });\n  } else if (g.id === 'keo-co') {\n    g.phase = 'pull';\n    g.endsAt = t + TUG_MS; g.tickCount = 0; g.nextTickAt = t + TUG_TICK_MS;\n    g.presses = {}; g.knot = 0; g.winnerTeam = null; preservePads(room);\n    const teamA = [], teamB = [];\n    room.players.forEach((p) => {\n      g.presses[p.seat] = 0;\n      (p.seat % 2 === 1 ? teamA : teamB).push(p.seat);\n    });\n    g.teams = { A: teamA, B: teamB };\n  } else if (g.id === 'chia-cuop') {\n    // Pairs rotate around the table: round r pairs seats[(r-1) mod n] with\n    // seats[r mod n]; everyone else sits out and watches the negotiation.\n    const seats = room.players.map((p) => p.seat).sort((x, y) => x - y);\n    const n = seats.length;\n    g.pair = [seats[(g.round - 1) % n], seats[g.round % n]];\n    g.phase = 'talk'; g.endsAt = t + TALK_MS; g.chat = {};\n    g.pair.forEach((seat) => {\n      const p = playerAt(room, seat);\n      if (p && p.type === 'bot') {\n        g.botPlan[seat] = { choice: chiaBotChoice(p.difficulty, g.round) };\n        g.chat[seat] = { text: NEGOT_LINES[(g.round + seat) % NEGOT_LINES.length], at: t };\n      }\n    });\n  } else if (g.id === 'cuop-sao') {\n    g.phase = 'steal';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + STEAL_MS;\n    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);\n    g.stars = []; g.starSeq = 0; g.goldIn = GOLD_EVERY_TICKS; g.banked = {};\n    room.players.forEach((p, i) => {\n      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n      g.blobs[p.seat] = {\n        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n        lives: 0, alive: true,\n      };\n      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.banked[p.seat] = 0;\n    });\n    spawnStar(room, false); spawnStar(room, false);\n  } else if (g.id === 'giu-vuong-mien') {\n    g.phase = 'crown';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + CROWN_MS;\n    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);\n    g.hold = {}; g.crown = { holder: null, x: 0, y: 0, lockTicks: 0, acc: 0 };\n    room.players.forEach((p, i) => {\n      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n      g.blobs[p.seat] = {\n        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n        lives: 0, alive: true,\n      };\n      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.hold[p.seat] = 0;\n    });\n  } else if (g.id === 'son-san') {\n    g.phase = 'splat';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SPLAT_MS;\n    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.paintCd = {}; preservePads(room);\n    g.grid = new Array(SPLAT_COLS * SPLAT_ROWS).fill(0);\n    room.players.forEach((p, i) => {\n      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n      g.blobs[p.seat] = {\n        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n        lives: 0, alive: true,\n      };\n      g.dashCd[p.seat] = 0; g.paintCd[p.seat] = 0;\n    });\n  } else if (g.id === 'cao-boi') {\n    g.phase = 'wait';\n    g.greenAt = t + Math.round(rand(1200, 4000));\n    g.endsAt = g.greenAt + DUEL_WINDOW_MS;\n    bots.forEach((p) => {\n      const B = BOT[p.difficulty];\n      // Only Dễ bots ever jump the gun, and only rarely; Vừa/Khó wait\n      // for the BẮN! signal and fire on reaction time alone.\n      if (p.difficulty === 'de' && Math.random() < 0.12) g.botPlan[p.seat] = { earlyAt: g.greenAt - Math.round(rand(150, 700)) };\n      else g.botPlan[p.seat] = { tapAt: g.greenAt + botDelay(p.difficulty, B.reactMs) };\n    });\n  } else if (g.id === 'chung-mot-than') {\n    g.phase = 'shared';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SHARED_MS;\n    // Directions are dealt round-robin across the seats in seat order:\n    // 2P -> P1: up+down, P2: right+left; 3P -> P1: up+left, P2: right,\n    // P3: down; 4P -> one each. The server filters every pad to the\n    // directions its owner holds.\n    const seats = room.players.map((p) => p.seat).sort((x, y) => x - y);\n    g.owners = {};\n    ['u', 'r', 'd', 'l'].forEach((d, i) => { g.owners[d] = seats[i % seats.length]; });\n    g.shared = { x: 0, y: 0 };\n    g.hearts = SHARED_HEARTS; g.checks = 0; g.sharedInvuln = 0;\n    g.balls = []; g.spawnIn = 20; preservePads(room); g.botIntent = {};\n    spawnSharedStar(room);\n  } else if (g.id === 'day-hop') {\n    g.phase = 'box';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + BOX_MS;\n    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; preservePads(room);\n    room.players.forEach((p, i) => {\n      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;\n      g.blobs[p.seat] = {\n        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * (4 / 3) * 100) / 100,\n        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * (3 / 4) * 100) / 100,\n        lives: 0, alive: true,\n      };\n      g.dashCd[p.seat] = 0;\n    });\n    g.layout = 0; g.deliveries = 0;\n    loadBoxLayout(room);\n  } else if (g.id === 'cheo-thuyen') {\n    g.phase = 'row';\n    g.rowStart = t; g.endsAt = t + ROW_BEATS * ROW_BEAT_MS;\n    g.distance = 0; g.hits = {}; g.splash = {}; g.stroked = {}; g.beatDone = 0;\n    room.players.forEach((p) => { g.hits[p.seat] = 0; g.splash[p.seat] = 0; });\n  } else if (g.id === 'xe-tank') {\n    g.phase = 'tank';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + TANK_MS;\n    spawnArenaBlobs(room, TANK_LIVES);\n    initGuns(room);\n  } else if (g.id === 'dat-bom') {\n    g.phase = 'bomber';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + BOM_MS;\n    g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};\n    // Spawns are BOM_SPAWNS (corners, then edge midpoints), dealt in\n    // seat order — with max 6 players nobody ever shares a cell.\n    room.players.forEach((p, i) => {\n      const c = BOM_SPAWNS[i % BOM_SPAWNS.length];\n      g.blobs[p.seat] = { x: bomCellX(c[0]), y: bomCellY(c[1]), lives: BOM_LIVES, alive: true };\n      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.invuln[p.seat] = 0;\n    });\n    g.hardCells = []; g.softCells = []; g.bombs = []; g.bombSeq = 0; g.blasts = [];\n    for (let r = 0; r < BOM_ROWS; r++) {\n      for (let c = 0; c < BOM_COLS; c++) {\n        if (bomIsHard(c, r)) { g.hardCells.push([c, r]); continue; }\n        if (bomIsSafe(c, r)) continue;\n        if (Math.random() < BOM_SOFT_P) g.softCells.push([c, r]);\n      }\n    }\n  } else if (g.id === 'ke-gia-mao') {\n    // Secrecy starts here: the impostor seat and the question pair live\n    // only in g.imp on the server; views hand each player their OWN\n    // question and the host nothing but status (see gameView).\n    const impostor = pick(room.players);\n    const avail = IMPOSTOR_BANK.map((_, i) => i).filter((i) => (g.usedPairs || []).indexOf(i) < 0);\n    const pairIdx = avail.length ? pick(avail) : randInt(0, IMPOSTOR_BANK.length - 1);\n    g.usedPairs.push(pairIdx);\n    g.imp = { seat: impostor.seat, pair: pairIdx };\n    g.votes = {}; g.chatLog = [];\n    g.phase = 'answer'; g.endsAt = t + IMP_ANSWER_MS;\n    bots.forEach((p) => {\n      g.botPlan[p.seat] = {\n        answerAt: t + Math.round(rand(3000, 20000)), answer: randInt(0, 3),\n        chatAt: t + IMP_ANSWER_MS + Math.round(rand(4000, 30000)), chatLine: pick(IMP_CHAT_LINES), chatted: false,\n        voteAt: 0, vote: null,\n      };\n    });\n  } else if (g.id === 'thu-thanh') {\n    g.phase = 'defend';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + DEF_MS;\n    spawnArenaBlobs(room, 0);\n    initGuns(room);\n    g.crystal = { hp: DEF_CRYSTAL_HP };\n    g.slimes = []; g.slimeSeq = 0; g.kills = 0; g.spawnIn = 16;\n  } else if (g.id === 'giai-ma-chung') {\n    g.phase = 'decode';\n    g.endsAt = t + DECODE_MS;\n    g.hearts = DECODE_HEARTS; g.level = 0; g.levelsDone = 0;\n    startDecodeLevel(room, t);\n  } else if (g.id === 'nguoi-que') {\n    g.phase = 'fight';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + FIGHT_MS;\n    g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; preservePads(room); g.invuln = {};\n    g.vel = {}; g.dmg = {}; g.face = {}; g.jumps = {}; g.atkCd = {}; g.hitT = {}; g.atkT = {}; g.dashT = {}; g.dashDir = {};\n    g.dashCd = {}; g.hvyCd = {}; g.hvyT = {};\n    room.players.forEach((p, i) => {\n      const sx = FIGHT_SPAWN_X[i % FIGHT_SPAWN_X.length];\n      g.blobs[p.seat] = { x: sx, y: FIGHT_PLATFORMS[0].y - PLAT_HH, vx: 0, vy: 0, ground: true, lives: FIGHT_LIVES, alive: true };\n      g.dmg[p.seat] = 0; g.face[p.seat] = sx < 0 ? 1 : -1; g.jumps[p.seat] = 0;\n      g.atkCd[p.seat] = 0; g.hitT[p.seat] = 0; g.atkT[p.seat] = 0; g.dashT[p.seat] = 0; g.dashDir[p.seat] = 1;\n      g.dashCd[p.seat] = 0; g.hvyCd[p.seat] = 0; g.hvyT[p.seat] = 0;\n      g.invuln[p.seat] = 0;\n    });\n  } else if (g.id === 'den-lua-nuoc') {\n    g.phase = 'temple';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + TEMP_MS;\n    g.hearts = TEMP_HEARTS; preservePads(room); g.botIntent = {};\n    g.chars = {}; g.elOf = {}; g.wpIdx = {}; g.wpAt = {};\n    g.gems = TEMPLE_LEVEL.gems.map((gm) => ({ x: gm.x, y: gm.y, el: gm.el, taken: false }));\n    g.gemCount = { lua: 0, nuoc: 0 };\n    g.gateOpen = false;\n    room.players.forEach((p) => {\n      const el = p.seat % 2 === 1 ? 'lua' : 'nuoc';\n      const st = TEMPLE_LEVEL.starts[el];\n      g.elOf[p.seat] = el;\n      g.chars[p.seat] = { x: st.x, y: st.y, vx: 0, vy: 0, ground: true, el, home: false };\n      g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0;\n    });\n  } else if (g.id === 'ma-soi') {\n    // Roles are dealt secretly HERE and live only in g.wolf; views\n    // hand each phone its own role and nothing else (see gameView).\n    const seats = room.players.map((p) => p.seat);\n    const n = seats.length;\n    const nWolves = n <= 5 ? 1 : n <= 8 ? 2 : 3;\n    const deal = shuffle(seats.slice());\n    const roles = {}; const alive = {};\n    deal.forEach((seat, i) => {\n      roles[seat] = i < nWolves ? 'soi'\n        : i === nWolves ? 'tien-tri'\n        : i === nWolves + 1 ? 'bao-ve'\n        : (n >= 6 && i === nWolves + 2) ? 'phu-thuy' : 'dan';\n      alive[seat] = true;\n    });\n    g.wolf = {\n      roles, alive,\n      wolfVotes: {}, guardPick: null, guardLast: null, seerPick: null, seerNotes: {},\n      witch: { save: false, poison: null, done: false }, saveLeft: 1, poisonLeft: 1,\n      deaths: [], dawnDeaths: [], exec: null, voteTally: null, winner: null,\n    };\n    g.votes = {}; g.chatLog = [];\n    g.phase = 'night'; g.endsAt = t + WOLF_NIGHT_MS;\n    wolfPlanNight(room, t);\n  } else if (g.id === 'ca-ngua') {\n    const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);\n    g.ng = {\n      boards: {}, horses: {}, turn: seats[0], dice: null, legal: [], chain: 0,\n      actAt: t + NGUA_BOT_MS, autoAt: 0, winner: null, last: null, log: [],\n    };\n    room.players.forEach((p) => {\n      g.ng.boards[p.seat] = seats.indexOf(p.seat);\n      g.ng.horses[p.seat] = [0, 0, 0, 0];\n    });\n    g.phase = 'roll'; g.endsAt = t + NGUA_TURN_MS;\n  } else if (g.id === 'tien-len') {\n    const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);\n    const deck = shuffle(Array.from({ length: 52 }, (_, i) => i));\n    const hands = {};\n    seats.forEach((s, i) => { hands[s] = tlSort(deck.slice(i * 13, i * 13 + 13)); });\n    let first = seats[0];\n    seats.forEach((s) => { if (hands[s].indexOf(0) >= 0) first = s; });\n    // With fewer than 4 players the 3♠ can stay in the undealt pile;\n    // the must-include-3♠ opening rule only applies when the card is\n    // actually in a hand — otherwise the fallback leader (seats[0])\n    // could never legally open and would sit locked until the timeout.\n    const threeDealt = seats.some((s) => hands[s].indexOf(0) >= 0);\n    g.tl = {\n      hands, table: null, passed: {}, turn: first, leader: first,\n      finished: [], firstPlay: threeDealt, turnEndsAt: t + TL_TURN_MS, actAt: t + TL_BOT_MS,\n      log: [], instantWin: null, winner: null,\n    };\n    // Tới trắng: an unbeatable dealt hand ends the match on the spot —\n    // lowest qualifying seat wins; everyone else still holds 13 cards,\n    // so the remaining placements fall back to seat order.\n    let iwSeat = null, iwKind = null;\n    for (const s of seats) { const k = tlInstantWin(hands[s]); if (k) { iwSeat = s; iwKind = k; break; } }\n    if (iwSeat != null) {\n      g.tl.instantWin = { seat: iwSeat, kind: iwKind };\n      const rest = seats.filter((s) => s !== iwSeat)\n        .sort((a, b) => (hands[a].length - hands[b].length) || (a - b));\n      g.tl.finished = [iwSeat].concat(rest);\n      tlLog(room, playerAt(room, iwSeat).name + ' TỚI TRẮNG — thắng ngay khi chia bài!');\n      finishTienLen(room, t);\n    } else {\n      g.phase = 'cards'; g.endsAt = g.tl.turnEndsAt;\n      tlLog(room, playerAt(room, first).name + (threeDealt ? ' có lá 3♠ — đánh trước!' : ' đánh trước!'));\n    }\n  } else if (g.id === 'da-bong') {\n    g.phase = 'soccer';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SOCCER_MS;\n    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.dashT = {}; g.dashDir = {}; g.face = {}; g.kickCd = {};\n    preservePads(room);\n    g.score = { do: 0, xanh: 0 };\n    g.lastTouch = null; g.goalInfo = null;\n    room.players.forEach((p) => {\n      g.blobs[p.seat] = { x: 0, y: 7.1, vx: 0, vy: 0, ground: true, lives: 0, alive: true };\n      g.face[p.seat] = p.seat % 2 === 1 ? 1 : -1;\n      g.dashCd[p.seat] = 0; g.dashT[p.seat] = 0; g.dashDir[p.seat] = 1; g.kickCd[p.seat] = 0;\n    });\n    soccerKickoff(room);\n  } else if (g.id === 'ech-op') {\n    g.phase = 'frog';\n    g.tickCount = 0; g.nextTickAt = t + TICK_MS;\n    g.hearts = FROG_HEARTS; preservePads(room); g.botIntent = {};\n    g.frogs = {}; g.face = {}; g.wpIdx = {}; g.wpAt = {};\n    g.chambersDone = 0; g.fliesEaten = 0;\n    room.players.forEach((p) => {\n      g.frogs[p.seat] = { x: 0, y: 9.1, vx: 0, vy: 0, ground: true, belly: null, by: null };\n      g.face[p.seat] = 1; g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0;\n    });\n    loadFrogChamber(room, 1, t);\n  } else if (g.id === 'can-goc') {\n    // Terrain: two summed sines, surface clamped to a playable band.\n    // 16:9 wave: 160 columns of 0.2u span the 32-wide field; the sine\n    // frequencies scale by 24/32 so the hills keep their old shape.\n    const p1 = rand(0, Math.PI * 2), p2 = rand(0, Math.PI * 2);\n    const a1 = rand(1.2, 2.0), a2 = rand(0.5, 1.0), f1 = rand(0.165, 0.255), f2 = rand(0.41, 0.64);\n    g.heights = [];\n    for (let i = 0; i < CANNON_COLS; i++) {\n      const x = -16 + (i + 0.5) * (32 / CANNON_COLS);\n      let y = 1.6 + a1 * Math.sin(x * f1 + p1) + a2 * Math.sin(x * f2 + p2);\n      y = Math.max(-2.5, Math.min(5.5, y));\n      g.heights.push(Math.round(y * 100) / 100);\n    }\n    g.cannons = {}; g.elimOrder = []; g.elimAt = {}; g.dmgDealt = {};\n    const n = room.players.length;\n    room.players.forEach((p, i) => {\n      const col = n === 1 ? 80 : Math.max(4, Math.min(CANNON_COLS - 5, Math.round(26 + (i * 108) / (n - 1) + rand(-4, 4))));\n      g.cannons[p.seat] = {\n        col, x: Math.round((-16 + (col + 0.5) * 0.2) * 100) / 100, y: g.heights[col],\n        hp: CANNON_HP, alive: true, face: 0, angle: 45, power: 60,\n      };\n      const c = g.cannons[p.seat];\n      c.face = c.x <= 0 ? 1 : -1;\n      g.dmgDealt[p.seat] = 0;\n    });\n    g.shell = null; g.boomFx = null; g.lastImpact = null;\n    g.matchEndsAt = t + CANNON_MATCH_MS;\n    cannonNextTurn(room, t, null);\n  }\n}\n\n// ---------------------------------------------------------------------------\n// Advance engine: phases move forward lazily whenever a request touches\n// the room. Bots act from their precomputed plans.\n// ---------------------------------------------------------------------------\nfunction advance(room) {\n  playlistAutoStart(room);\n  let guard = 0;\n  while (guard++ < 40) { if (!step(room)) break; }\n}\n// Playlist intermission: the results screen is showing and the gap has\n// elapsed — start the next queued game with NO host action. Entries\n// that became unplayable since queueing (seat-gated games after seats\n// dropped, or nobody left to play) are skipped; if nothing playable\n// remains, the playlist ends and the room just stays on results.\nfunction playlistAutoStart(room) {\n  if (room.phase !== 'results' || !room.playlist || !room.playlistNextAt) return;\n  if (now() < room.playlistNextAt) return;\n  room.playlistNextAt = null;\n  let i = room.playlist.idx + 1;\n  while (i < room.playlist.queue.length && !gamePlayable(room, room.playlist.queue[i])) i++;\n  if (i >= room.playlist.queue.length) { room.playlist = null; return; }\n  room.playlist.idx = i;\n  createGame(room, room.playlist.queue[i]);\n}\nfunction step(room) {\n  const g = room.game;\n  if (room.phase !== 'playing' || !g) return false;\n  const t = now();\n  if (g.phase === 'countdown') {\n    if (t >= g.endsAt) { beginRound(room); return true; }\n    return false;\n  }\n  if (g.id === 'do-vui') return stepQuiz(room, t);\n  if (g.id === 'day-ra') return stepArena(room, t);\n  if (g.id === 'ne-dan') return stepDodge(room, t);\n  if (g.id === 'keo-co') return stepTug(room, t);\n  if (g.id === 'chia-cuop') return stepChia(room, t);\n  if (g.id === 'cuop-sao') return stepSteal(room, t);\n  if (g.id === 'giu-vuong-mien') return stepCrown(room, t);\n  if (g.id === 'son-san') return stepSplat(room, t);\n  if (g.id === 'cao-boi') return stepDuel(room, t);\n  if (g.id === 'chung-mot-than') return stepShared(room, t);\n  if (g.id === 'day-hop') return stepBox(room, t);\n  if (g.id === 'cheo-thuyen') return stepRow(room, t);\n  if (g.id === 'xe-tank') return stepTank(room, t);\n  if (g.id === 'dat-bom') return stepBomber(room, t);\n  if (g.id === 'ke-gia-mao') return stepImpostor(room, t);\n  if (g.id === 'thu-thanh') return stepDefend(room, t);\n  if (g.id === 'giai-ma-chung') return stepDecode(room, t);\n  if (g.id === 'nguoi-que') return stepFight(room, t);\n  if (g.id === 'den-lua-nuoc') return stepTemple(room, t);\n  if (g.id === 'ma-soi') return stepWolf(room, t);\n  if (g.id === 'ca-ngua') return stepNgua(room, t);\n  if (g.id === 'tien-len') return stepTienLen(room, t);\n  if (g.id === 'da-bong') return stepSoccer(room, t);\n  if (g.id === 'ech-op') return stepFrog(room, t);\n  if (g.id === 'can-goc') return stepCannon(room, t);\n  return false;\n}\nfunction humansAllIn(room, has) {\n  return room.players.filter((p) => p.type === 'human').every((p) => has(p.seat));\n}\nfunction botsDue(room, atOf) {\n  return room.players.filter((p) => p.type === 'bot').every((p) => { const plan = room.game.botPlan[p.seat]; return plan && atOf(plan) <= now(); });\n}\nfunction finishTimedRound(room, nextPhase, endsAt) {\n  snapshotRanks(room);\n  rollBubble(room);\n  room.game.phase = nextPhase;\n  room.game.endsAt = endsAt;\n}\n\n// --- Game 2: Đố Vui Tốc Độ (quiz, streak bonus) ----------------------------\nfunction stepQuiz(room, t) {\n  const g = room.game;\n  if (g.phase === 'question') {\n    const settled = humansAllIn(room, (s) => !!g.inputs[s]) && botsDue(room, (pl) => pl.at || 0);\n    if (t >= g.endsAt || settled) { resolveQuiz(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'reveal') {\n    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }\n  }\n  return false;\n}\nfunction resolveQuiz(room, t) {\n  const g = room.game;\n  const choices = {}; const pts = {};\n  room.players.forEach((p) => {\n    let ans = null;\n    if (p.type === 'human') { const inp = g.inputs[p.seat]; if (inp) ans = inp; }\n    else { const plan = g.botPlan[p.seat]; if (plan && plan.at <= g.endsAt) ans = plan; }\n    choices[p.seat] = ans ? ans.choice : null;\n    if (ans && ans.choice === g.current.correct) {\n      const streak = (g.streaks[p.seat] || 0) + 1;\n      g.streaks[p.seat] = streak;\n      const speed = Math.round(100 * Math.max(0, 1 - (ans.at - g.qStart) / QUIZ_MS));\n      const streakBonus = streak >= 2 ? 25 * (streak - 1) : 0;\n      pts[p.seat] = roundPoints(g, 100 + speed + streakBonus);\n    } else {\n      g.streaks[p.seat] = 0;\n      pts[p.seat] = 0;\n    }\n    g.points[p.seat] = (g.points[p.seat] || 0) + pts[p.seat];\n  });\n  g.reveal = { correct: g.current.correct, choices, points: pts, streaks: Object.assign({}, g.streaks) };\n  g.lastRound = { round: g.round, points: pts };\n  finishTimedRound(room, 'reveal', t + QUIZ_REVEAL_MS);\n}\n\n// --- Game 6: Đẩy Ra Khỏi Sàn (tick arena, gamepad held-state) ---------------\n// Placement for this game is awarded once per match (300/200/100/50) as the\n// follow-up spec fixes those numbers; the ×2 rule applies to round-based\n// games, this one is a single continuous match.\nfunction stepArena(room, t) {\n  const g = room.game;\n  if (g.phase !== 'arena') return false;\n  if (t >= g.endsAt) { finishArena(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up: a caller arriving k>=2 ticks late simulates up to 4\n    // of the missed ticks in this call instead of dropping all but\n    // one; any deeper backlog still resyncs (snap below), so a long\n    // sleep can never spiral. Behind by <=1 the loop runs exactly\n    // once — bit-identical to the old 1-tick-per-call semantics.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'arena') {\n      simulateTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction botBrain(room, p) {\n  const g = room.game;\n  const every = p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24;\n  const prev = g.botIntent[p.seat];\n  if (prev && (g.tickCount + p.seat) % every !== 0) return { x: prev.x, y: prev.y, shove: false };\n  const me = g.blobs[p.seat];\n  let tx = 0, ty = 0, shove = false;\n  const dC = Math.hypot(me.x, me.y);\n  let foe = null, foeD = 1e9;\n  room.players.forEach((q) => {\n    if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {\n      const d = Math.hypot(g.blobs[q.seat].x - me.x, g.blobs[q.seat].y - me.y);\n      if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; }\n    }\n  });\n  if (dC > g.arenaR * 0.6 || !foe) { tx = -me.x; ty = -me.y; }\n  else {\n    tx = foe.x - me.x; ty = foe.y - me.y;\n    if (foeD <= SHOVE_RANGE) shove = Math.random() < (p.difficulty === 'kho' ? 0.85 : p.difficulty === 'vua' ? 0.55 : 0.3);\n  }\n  if (p.difficulty === 'de' && Math.random() < 0.25) { tx = randInt(-1, 1); ty = randInt(-1, 1); }\n  const intent = { x: Math.abs(tx) > 0.4 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.4 ? Math.sign(ty) : 0, shove };\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\n// --- 16:9 wave: velocity tracking for client extrapolation ----------\n// Arena blobs are positional (x += step each tick), so a blob's\n// velocity IS the displacement its sim just applied. Arena sims call\n// trackStart() before moving and trackEnd() after; the views expose\n// the result as b.vx/b.vy (units per tick) and the TV client leads\n// its render target by v * elapsed ticks (capped), so motion reads\n// ahead of the 125ms tick instead of trailing it.\nfunction trackStart(room) {\n  const g = room.game; const s = {};\n  room.players.forEach((p) => { const b = g.blobs && g.blobs[p.seat]; if (b) s[p.seat] = { x: b.x, y: b.y }; });\n  return s;\n}\nfunction trackEnd(room, s) {\n  const g = room.game;\n  room.players.forEach((p) => {\n    const b = g.blobs && g.blobs[p.seat]; const o = s[p.seat];\n    if (!b || !o) return;\n    b.vx = Math.round((b.x - o.x) * 100) / 100;\n    b.vy = Math.round((b.y - o.y) * 100) / 100;\n  });\n}\n// The wide field's rectangle clamp (0.8u margin inside [-16,16]x[-9,9]).\nfunction clampRect(b) {\n  b.x = Math.max(-CLAMP_X, Math.min(CLAMP_X, b.x));\n  b.y = Math.max(-CLAMP_Y, Math.min(CLAMP_Y, b.y));\n}\n// Normalised squared distance from the day-ra ellipse centre (1 = on\n// the ring): the ring-out test and the finish tie-break share it.\nfunction ellipseDist(b, R) {\n  const ex = b.x / (R * (4 / 3)), ey = b.y / (R * (3 / 4));\n  return ex * ex + ey * ey;\n}\nfunction simulateTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const trk = trackStart(room);\n  if (g.tickCount % 32 === 0 && g.arenaR > ARENA_RMIN) g.arenaR = Math.max(ARENA_RMIN, g.arenaR - 0.5);\n  const moves = {};\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    const mv = { x: 0, y: 0, shove: false, dash: false };\n    if (p.type === 'human') {\n      const pad = g.pad[p.seat] || {};\n      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);\n      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);\n      mv.shove = !!pad.a;\n      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;\n    } else {\n      const intent = botBrain(room, p);\n      mv.x = intent.x; mv.y = intent.y; mv.shove = intent.shove;\n    }\n    moves[p.seat] = mv;\n  });\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;\n    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;\n    let stepMul = 1;\n    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }\n    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;\n    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;\n  });\n  const alive = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive);\n  for (let i = 0; i < alive.length; i++) {\n    for (let j = i + 1; j < alive.length; j++) {\n      const A = g.blobs[alive[i].seat], B = g.blobs[alive[j].seat];\n      let dx = B.x - A.x, dy = B.y - A.y;\n      let d = Math.hypot(dx, dy);\n      if (d < 1.6) {\n        if (d < 0.01) { dx = 1; dy = 0; d = 1; }\n        const push = (1.6 - d) / 2;\n        A.x -= (dx / d) * push; A.y -= (dy / d) * push;\n        B.x += (dx / d) * push; B.y += (dy / d) * push;\n      }\n    }\n  }\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.shoveCd[p.seat] > 0) g.shoveCd[p.seat] -= 1;\n    if (!mv.shove || g.shoveCd[p.seat] > 0) return;\n    let foe = null, foeD = 1e9;\n    room.players.forEach((q) => {\n      if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {\n        const d = Math.hypot(g.blobs[q.seat].x - b.x, g.blobs[q.seat].y - b.y);\n        if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; }\n      }\n    });\n    if (foe && foeD <= SHOVE_RANGE && foeD > 0.01) {\n      foe.x += ((foe.x - b.x) / foeD) * SHOVE_FORCE * (4 / 3);\n      foe.y += ((foe.y - b.y) / foeD) * SHOVE_FORCE * (3 / 4);\n      g.shoveCd[p.seat] = SHOVE_CD_TICKS;\n    }\n  });\n  trackEnd(room, trk);\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    // The shrinking ring is an ELLIPSE in the wide field: radii\n    // (arenaR*4/3, arenaR*3/4); outside it costs a life.\n    if (ellipseDist(b, g.arenaR) > 1) {\n      b.lives -= 1;\n      b.vx = 0; b.vy = 0;\n      if (b.lives > 0) {\n        const ang = rand(0, Math.PI * 2); const rr = g.arenaR * 0.3 * Math.random();\n        b.x = Math.cos(ang) * rr * (4 / 3); b.y = Math.sin(ang) * rr * (3 / 4);\n      } else { b.alive = false; g.elimOrder.push(p.seat); }\n    }\n  });\n  const snap = {};\n  room.players.forEach((p) => { if (p.type === 'human') snap[p.seat] = Object.assign({}, g.pad[p.seat] || {}); });\n  g.padPrev = snap;\n  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;\n  if (aliveCount <= 1) finishArena(room);\n}\nfunction finishArena(room) {\n  const g = room.game;\n  const aliveRanked = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive)\n    .sort((a, b) => (g.blobs[b.seat].lives - g.blobs[a.seat].lives)\n      || (ellipseDist(g.blobs[a.seat], g.arenaR) - ellipseDist(g.blobs[b.seat], g.arenaR))\n      || (a.seat - b.seat));\n  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);\n  const ranking = aliveRanked.concat(elimRanked);\n  const entries = ranking.map((p, i) => ({ seat: p.seat, points: placementAt(i), lives: g.blobs[p.seat].lives, alive: g.blobs[p.seat].alive }));\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  g.lastRound = { round: 1, entries };\n  endGame(room);\n}\n\n// --- Game 7: Né Đạn (tick arena survival, walled arena) ---------------------\n// Same tick simulation + pad held-state as Đẩy Ra Khỏi Sàn, but the arena\n// has walls (blobs clamp inside, no ring-out, no shrinking). Cannonballs\n// spawn from the edges on ticks and cross the field; a hit costs 1 of 3\n// lives and grants INVULN_TICKS ticks of invulnerability so one ball can\n// never multi-hit. Ranking: survivors first (most lives), then by elimination\n// tick (eliminated later = better). Placement awarded once per match\n// (300/200/100/50) like the other arena game — the ×2 rule is rounds-only.\nfunction stepDodge(room, t) {\n  const g = room.game;\n  if (g.phase !== 'dodge') return false;\n  if (t >= g.endsAt) { finishDodge(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'dodge') {\n      simulateDodgeTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction botBrainDodge(room, p) {\n  const g = room.game;\n  const every = p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24;\n  const prev = g.botIntent[p.seat];\n  if (prev && (g.tickCount + p.seat) % every !== 0) return prev;\n  const me = g.blobs[p.seat];\n  let tx = -me.x * 0.4, ty = -me.y * 0.4; // drift back towards the centre\n  let ball = null, bd = 1e9;\n  (g.balls || []).forEach((b) => {\n    const d = Math.hypot(b.x - me.x, b.y - me.y);\n    if (d < bd) { bd = d; ball = b; }\n  });\n  if (ball && bd < 6.5) { tx = me.x - ball.x; ty = me.y - ball.y; } // run away\n  const intent = { x: Math.abs(tx) > 0.4 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.4 ? Math.sign(ty) : 0 };\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\nfunction simulateDodgeTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const trk = trackStart(room);\n  const moves = {};\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    const mv = { x: 0, y: 0, dash: false };\n    if (p.type === 'human') {\n      const pad = g.pad[p.seat] || {};\n      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);\n      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);\n      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;\n    } else {\n      const intent = botBrainDodge(room, p);\n      mv.x = intent.x; mv.y = intent.y;\n    }\n    moves[p.seat] = mv;\n  });\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;\n    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;\n    let stepMul = 1;\n    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }\n    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;\n    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;\n    clampRect(b); // the wide field's walls stop you\n  });\n  trackEnd(room, trk);\n  // Cannonballs: spawn on a cadence that tightens as the match goes on\n  // (same wall-clock cadence as before the retune: gap starts at 3.5s,\n  // shrinks 0.25s every 12s, floor 1.5s). 16:9 wave: they enter from\n  // the wide field's four edges and their velocity components scale\n  // with the field map, so crossing times are unchanged.\n  g.spawnIn -= 1;\n  if (g.spawnIn <= 0) {\n    const side = randInt(0, 3);\n    let x = 0, y = 0;\n    if (side === 0) { x = -17.5; y = rand(-8.5, 8.5); } else if (side === 1) { x = 17.5; y = rand(-8.5, 8.5); }\n    else if (side === 2) { x = rand(-15.5, 15.5); y = -10.5; } else { x = rand(-15.5, 15.5); y = 10.5; }\n    const tx = rand(-8, 8), ty = rand(-4.5, 4.5);\n    const dx = tx - x, dy = ty - y; const dd = Math.hypot(dx, dy) || 1;\n    g.balls.push({ x, y, vx: (dx / dd) * BALL_SPEED * (4 / 3), vy: (dy / dd) * BALL_SPEED * (3 / 4) });\n    g.spawnIn = Math.max(24, 56 - 2 * Math.floor(g.tickCount / 192));\n  }\n  g.balls.forEach((b) => { b.x += b.vx; b.y += b.vy; });\n  g.balls = g.balls.filter((b) => Math.abs(b.x) <= 19 && Math.abs(b.y) <= 12);\n  // Hits.\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    if (g.invuln[p.seat] > 0) { g.invuln[p.seat] -= 1; return; }\n    const idx = g.balls.findIndex((ball) => Math.hypot(ball.x - b.x, ball.y - b.y) < BALL_HIT_DIST);\n    if (idx < 0) return;\n    g.balls.splice(idx, 1);\n    b.lives -= 1;\n    g.invuln[p.seat] = INVULN_TICKS;\n    if (b.lives <= 0) { b.alive = false; g.elimOrder.push(p.seat); g.elimTick[p.seat] = g.tickCount; }\n  });\n  const snap = {};\n  room.players.forEach((p) => { if (p.type === 'human') snap[p.seat] = Object.assign({}, g.pad[p.seat] || {}); });\n  g.padPrev = snap;\n  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;\n  if (aliveCount <= 1) finishDodge(room);\n}\nfunction finishDodge(room) {\n  const g = room.game;\n  const aliveRanked = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive)\n    .sort((a, b) => (g.blobs[b.seat].lives - g.blobs[a.seat].lives) || (a.seat - b.seat));\n  const elimRanked = g.elimOrder.slice()\n    .sort((x, y) => ((g.elimTick[y] || 0) - (g.elimTick[x] || 0)) || (x - y))\n    .map((seat) => playerAt(room, seat)).filter(Boolean);\n  const ranking = aliveRanked.concat(elimRanked);\n  const entries = ranking.map((p, i) => ({\n    seat: p.seat, points: placementAt(i),\n    lives: g.blobs[p.seat].lives, alive: g.blobs[p.seat].alive, elimTick: g.elimTick[p.seat] || null,\n  }));\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  g.lastRound = { round: 1, entries };\n  endGame(room);\n}\n\n// --- Game 8: Kéo Co (team tug of war) ---------------------------------------\n// Teams are fixed by seat parity: odd seats = team A, even seats = team B.\n// Scoring rule (uniform for every team size): each member of the winning\n// team scores 300, each member of the losing team scores 200; an exact\n// tie at time out is a draw and everyone scores 200. Single match, so no\n// final-round ×2. Human presses are counted at action time on the rising\n// edge of the pad's B button; bots accumulate BOT_TUG presses per tick.\nfunction tugKnot(room) {\n  const g = room.game;\n  let a = 0, b = 0;\n  room.players.forEach((p) => {\n    const n = g.presses[p.seat] || 0;\n    if (p.seat % 2 === 1) a += n; else b += n;\n  });\n  return TUG_STEP * (b - a);\n}\nfunction stepTug(room, t) {\n  const g = room.game;\n  if (g.phase !== 'pull') return false;\n  const knot = tugKnot(room);\n  g.knot = knot;\n  if (Math.abs(knot) >= TUG_WIN) { finishTug(room, knot > 0 ? 'B' : 'A'); return true; }\n  if (t >= g.endsAt) { finishTug(room, knot > 0 ? 'B' : knot < 0 ? 'A' : null); return true; }\n  if (t >= g.nextTickAt) {\n    room.players.filter((p) => p.type === 'bot').forEach((p) => {\n      g.presses[p.seat] = (g.presses[p.seat] || 0) + BOT_TUG[p.difficulty];\n    });\n    g.tickCount += 1;\n    g.nextTickAt += TUG_TICK_MS;\n    if (g.nextTickAt <= t) g.nextTickAt = t + TUG_TICK_MS;\n    return true;\n  }\n  return false;\n}\nfunction finishTug(room, winnerTeam) {\n  const g = room.game;\n  g.winnerTeam = winnerTeam;\n  g.knot = tugKnot(room);\n  const entries = room.players.map((p) => {\n    const team = p.seat % 2 === 1 ? 'A' : 'B';\n    const points = winnerTeam === null ? 200 : (team === winnerTeam ? 300 : 200);\n    return { seat: p.seat, team, presses: g.presses[p.seat] || 0, points };\n  });\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  g.lastRound = { round: 1, entries, knot: g.knot, winnerTeam };\n  endGame(room);\n}\n\n// --- Game 9: Chia Hay Cướp (negotiate, then a secret split-or-steal) --------\n// Per round: 'talk' (TALK_MS, the pair can post chat bubbles the host\n// shows) -> 'choose' (CHOOSE_MS, both lock a secret choice; bots lock\n// theirs the moment the phase opens) -> 'reveal' (choices exposed one at\n// a time via revealAt). Choices live only in g.inputs on the server and\n// are NEVER put into any view before the reveal phase. A player who does\n// not choose in time defaults to Chia. Pot is POT, doubled on the final\n// round: both Chia = half each, lone Cướp takes all, both Cướp = 0.\nfunction stepChia(room, t) {\n  const g = room.game;\n  if (g.phase === 'talk') {\n    if (t >= g.endsAt) { enterChiaChoose(room); return true; }\n    return false;\n  }\n  if (g.phase === 'choose') {\n    const both = (g.pair || []).every((s) => !!g.inputs[s]);\n    if (both || t >= g.endsAt) { resolveChia(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'reveal') {\n    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }\n  }\n  return false;\n}\nfunction enterChiaChoose(room) {\n  const g = room.game; const t = now();\n  g.phase = 'choose'; g.endsAt = t + CHOOSE_MS;\n  (g.pair || []).forEach((seat) => {\n    const p = playerAt(room, seat);\n    if (p && p.type === 'bot') { const plan = g.botPlan[seat]; if (plan) g.inputs[seat] = { choice: plan.choice, at: t }; }\n  });\n}\nfunction resolveChia(room, t) {\n  const g = room.game;\n  const pot = isFinalRound(g) ? POT * 2 : POT;\n  const sa = g.pair[0], sb = g.pair[1];\n  const ca = (g.inputs[sa] && g.inputs[sa].choice) || 'chia';\n  const cb = (g.inputs[sb] && g.inputs[sb].choice) || 'chia';\n  const won = {};\n  won[sa] = 0; won[sb] = 0;\n  if (ca === 'chia' && cb === 'chia') { won[sa] = pot / 2; won[sb] = pot / 2; }\n  else if (ca === 'cuop' && cb === 'chia') won[sa] = pot;\n  else if (ca === 'chia' && cb === 'cuop') won[sb] = pot;\n  const entries = [sa, sb].map((seat, i) => ({\n    seat, choice: seat === sa ? ca : cb, points: won[seat], revealAt: t + 700 + i * 1500,\n  }));\n  const ptsAll = {};\n  room.players.forEach((p) => { ptsAll[p.seat] = won[p.seat] || 0; g.points[p.seat] = (g.points[p.seat] || 0) + ptsAll[p.seat]; });\n  g.reveal = { pot, entries };\n  g.lastRound = { round: g.round, points: ptsAll, pair: g.pair.slice() };\n  finishTimedRound(room, 'reveal', t + 700 + 2 * 1500 + 900);\n}\n\n// ---------------------------------------------------------------------------\n// Shared helpers for the three walled tick-arena games below (Cướp Sao,\n// Giữ Vương Miện, Sơn Sàn). They follow the same patterns as Đẩy Ra Khỏi\n// Sàn / Né Đạn: gamepad held-state for humans, per-difficulty bot brains\n// that re-decide on a fixed tick cadence, one simulation tick per\n// TICK_MS, placement points awarded once per match (300/200/100/50).\n// ---------------------------------------------------------------------------\nfunction collectMoves(room, brain) {\n  const g = room.game;\n  const moves = {};\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    const mv = { x: 0, y: 0, shove: false, dash: false, burst: false };\n    if (p.type === 'human') {\n      const pad = g.pad[p.seat] || {};\n      mv.x = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);\n      mv.y = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);\n      mv.shove = !!pad.a;\n      mv.burst = !!pad.a && !(g.padPrev[p.seat] || {}).a;\n      mv.dash = !!pad.b && !(g.padPrev[p.seat] || {}).b;\n    } else {\n      const intent = brain(room, p);\n      mv.x = intent.x; mv.y = intent.y; mv.shove = !!intent.shove;\n      mv.dash = !!intent.dash; mv.burst = !!intent.burst;\n    }\n    moves[p.seat] = mv;\n  });\n  return moves;\n}\nfunction applyMoves(room, moves, opts) {\n  const g = room.game;\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;\n    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;\n    let stepMul = 1;\n    if (opts.holderSeat === p.seat) stepMul = HOLDER_SPEED;\n    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }\n    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;\n    b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;\n    if (opts.clampBox) {\n      // Sơn Sàn: clamp to the paint grid's extent (cells span\n      // [-14.4,14.4]x[-8,8]); other clampBox callers pass a square m.\n      const mx = opts.clampX != null ? opts.clampX : opts.clampBox;\n      const my = opts.clampY != null ? opts.clampY : opts.clampBox;\n      b.x = Math.max(-mx, Math.min(mx, b.x)); b.y = Math.max(-my, Math.min(my, b.y));\n    } else {\n      clampRect(b); // the wide field's walls stop you\n    }\n  });\n}\nfunction separateBlobs(room) {\n  const g = room.game;\n  const alive = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive);\n  for (let i = 0; i < alive.length; i++) {\n    for (let j = i + 1; j < alive.length; j++) {\n      const A = g.blobs[alive[i].seat], B = g.blobs[alive[j].seat];\n      let dx = B.x - A.x, dy = B.y - A.y;\n      let d = Math.hypot(dx, dy);\n      if (d < 1.6) {\n        if (d < 0.01) { dx = 1; dy = 0; d = 1; }\n        const push = (1.6 - d) / 2;\n        A.x -= (dx / d) * push; A.y -= (dy / d) * push;\n        B.x += (dx / d) * push; B.y += (dy / d) * push;\n      }\n    }\n  }\n}\n// A-button shoves for the walled games. onHit(room, attackerSeat,\n// victimSeat, vx, vy) receives the victim's position from BEFORE the\n// knockback displacement (where the victim stood when hit).\nfunction applyShoves(room, moves, force, onHit) {\n  const g = room.game;\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.shoveCd[p.seat] > 0) g.shoveCd[p.seat] -= 1;\n    if (!mv.shove || g.shoveCd[p.seat] > 0) return;\n    let foe = null, foeSeat = null, foeD = 1e9;\n    room.players.forEach((q) => {\n      if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {\n        const d = Math.hypot(g.blobs[q.seat].x - b.x, g.blobs[q.seat].y - b.y);\n        if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; foeSeat = q.seat; }\n      }\n    });\n    if (foe && foeD <= SHOVE_RANGE && foeD > 0.01) {\n      const vx = foe.x, vy = foe.y;\n      foe.x += ((foe.x - b.x) / foeD) * force * (4 / 3);\n      foe.y += ((foe.y - b.y) / foeD) * force * (3 / 4);\n      clampRect(foe); // the wall stops the knockback too\n      g.shoveCd[p.seat] = SHOVE_CD_TICKS;\n      if (onHit) onHit(room, p.seat, foeSeat, vx, vy);\n    }\n  });\n}\nfunction snapshotPad(room) {\n  const g = room.game;\n  const snap = {};\n  room.players.forEach((p) => { if (p.type === 'human') snap[p.seat] = Object.assign({}, g.pad[p.seat] || {}); });\n  g.padPrev = snap;\n}\n// Single-match ranking shared by the three games: most of `values` wins;\n// ties go to the earlier seat (stated rule, applied consistently).\nfunction finishByValue(room, values, valueKey) {\n  const g = room.game;\n  const ranking = room.players.slice()\n    .sort((a, b) => ((values[b.seat] || 0) - (values[a.seat] || 0)) || (a.seat - b.seat));\n  const entries = ranking.map((p, i) => {\n    const e = { seat: p.seat, points: placementAt(i) };\n    e[valueKey] = values[p.seat] || 0;\n    return e;\n  });\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  g.lastRound = { round: 1, entries };\n  endGame(room);\n}\n// ---------------------------------------------------------------------------\n// Co-op finish path: a team score maps to a tier via a descending table\n// of [minScore, tier]; every player banks TIER_POINTS[tier]. The results\n// screen reads room.lastGame.teamResult for the team banner.\n// ---------------------------------------------------------------------------\nfunction coopTier(score, table) {\n  for (let i = 0; i < table.length; i++) { if (score >= table[i][0]) return table[i][1]; }\n  return 'none';\n}\nfunction finishCoop(room, score, tier, unit) {\n  const g = room.game;\n  const pointsEach = TIER_POINTS[tier];\n  g.teamResult = { score, tier, tierLabel: TIER_LABELS[tier], pointsEach, unit };\n  const entries = room.players.map((p) => ({ seat: p.seat, points: pointsEach }));\n  entries.forEach((e) => { g.points[e.seat] = pointsEach; });\n  g.lastRound = { round: 1, entries };\n  endGame(room);\n}\n// Chèo Thuyền: one in-window stroke adds an equal share of a full stroke.\nfunction addRowDistance(room, seat) {\n  const g = room.game;\n  g.distance = Math.round((g.distance + ROW_FULL_STROKE / Math.max(1, room.players.length)) * 1000) / 1000;\n  g.hits[seat] = (g.hits[seat] || 0) + 1;\n}\nfunction brainCadence(p) { return p.difficulty === 'kho' ? 8 : p.difficulty === 'vua' ? 16 : 24; }\nfunction cachedIntent(room, p) {\n  const g = room.game;\n  const prev = g.botIntent[p.seat];\n  if (prev && (g.tickCount + p.seat) % brainCadence(p) !== 0) return { x: prev.x, y: prev.y, shove: false, dash: false, burst: false };\n  return null;\n}\nfunction nearestFoe(room, p) {\n  const g = room.game;\n  const me = g.blobs[p.seat];\n  let foe = null, foeSeat = null, foeD = 1e9;\n  room.players.forEach((q) => {\n    if (q.seat !== p.seat && g.blobs[q.seat] && g.blobs[q.seat].alive) {\n      const d = Math.hypot(g.blobs[q.seat].x - me.x, g.blobs[q.seat].y - me.y);\n      if (d < foeD) { foeD = d; foe = g.blobs[q.seat]; foeSeat = q.seat; }\n    }\n  });\n  return { foe, foeSeat, foeD };\n}\nfunction dirIntent(tx, ty) {\n  return { x: Math.abs(tx) > 0.4 ? Math.sign(tx) : 0, y: Math.abs(ty) > 0.4 ? Math.sign(ty) : 0 };\n}\n\n// --- Game 10: Cướp Sao (star grab arena, walled) ---------------------------\n// Stars sit on the field; flying over one banks its value at once (a\n// golden star is worth 3). The A shove has extra knockback here and\n// knocks one banked point out of the victim as a loose star where they\n// stood. Ranked by banked value after STEAL_MS; ties -> earlier seat.\nfunction spawnStar(room, gold) {\n  const g = room.game;\n  let x = 0, y = 0;\n  for (let i = 0; i < 8; i++) {\n    const ang = rand(0, Math.PI * 2); const rr = rand(2, 8.5);\n    x = Math.cos(ang) * rr * (4 / 3); y = Math.sin(ang) * rr * (3 / 4);\n    let ok = true;\n    (g.stars || []).forEach((s) => { if (Math.hypot(s.x - x, s.y - y) < 2) ok = false; });\n    if (ok) break;\n  }\n  g.starSeq += 1;\n  g.stars.push({ id: g.starSeq, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, gold: !!gold, pickAt: g.tickCount });\n}\nfunction botBrainSteal(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  let star = null, sd = 1e9;\n  (g.stars || []).forEach((s) => {\n    const d = Math.hypot(s.x - me.x, s.y - me.y) * (s.gold && p.difficulty !== 'de' ? 0.4 : 1);\n    if (d < sd) { sd = d; star = s; }\n  });\n  let tx = 0, ty = 0, dash = false, shove = false;\n  if (star) {\n    tx = star.x - me.x; ty = star.y - me.y;\n    if (star.gold && Math.hypot(tx, ty) > 4 && p.difficulty !== 'de') dash = true;\n  }\n  const near = nearestFoe(room, p);\n  if (!star && near.foe) { tx = near.foe.x - me.x; ty = near.foe.y - me.y; }\n  if (near.foe && near.foeD <= SHOVE_RANGE) {\n    const leader = Math.max.apply(null, room.players.map((q) => g.banked[q.seat] || 0));\n    const isLeader = (g.banked[near.foeSeat] || 0) > 0 && (g.banked[near.foeSeat] || 0) === leader;\n    const prob = p.difficulty === 'kho' ? 0.85 : p.difficulty === 'vua' ? 0.55 : 0.3;\n    if ((isLeader || !star) && Math.random() < prob) shove = true;\n  }\n  if (p.difficulty === 'de' && Math.random() < 0.2) { tx = randInt(-1, 1); ty = randInt(-1, 1); }\n  const intent = Object.assign(dirIntent(tx, ty), { shove, dash });\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\nfunction stepSteal(room, t) {\n  const g = room.game;\n  if (g.phase !== 'steal') return false;\n  if (t >= g.endsAt) { finishByValue(room, g.banked, 'banked'); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'steal') {\n      simulateStealTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateStealTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const trk = trackStart(room);\n  const moves = collectMoves(room, botBrainSteal);\n  applyMoves(room, moves, {});\n  separateBlobs(room);\n  applyShoves(room, moves, STEAL_SHOVE_FORCE, (rm, attackerSeat, victimSeat, vx, vy) => {\n    const gg = rm.game;\n    if ((gg.banked[victimSeat] || 0) > 0) {\n      gg.banked[victimSeat] -= 1;\n      gg.starSeq += 1;\n      gg.stars.push({ id: gg.starSeq, x: Math.round(vx * 100) / 100, y: Math.round(vy * 100) / 100, gold: false, pickAt: gg.tickCount + DROP_LOCK_TICKS, dropped: true });\n    }\n  });\n  // Pickups: the nearest blob in range banks the star (ties -> the\n  // earlier seat, which is room.players order).\n  const remaining = [];\n  (g.stars || []).forEach((s) => {\n    let taker = null, td = 1e9;\n    if (g.tickCount >= (s.pickAt || 0)) {\n      room.players.forEach((p) => {\n        const b = g.blobs[p.seat];\n        if (!b || !b.alive) return;\n        const d = Math.hypot(b.x - s.x, b.y - s.y);\n        if (d <= 1.3 && d < td) { td = d; taker = p.seat; }\n      });\n    }\n    if (taker) g.banked[taker] = (g.banked[taker] || 0) + (s.gold ? 3 : 1);\n    else remaining.push(s);\n  });\n  g.stars = remaining;\n  trackEnd(room, trk);\n  let normals = g.stars.filter((s) => !s.gold).length;\n  while (normals < 2) { spawnStar(room, false); normals += 1; }\n  g.goldIn -= 1;\n  if (g.goldIn <= 0) {\n    if (!g.stars.some((s) => s.gold)) spawnStar(room, true);\n    g.goldIn = GOLD_EVERY_TICKS;\n  }\n  snapshotPad(room);\n}\n\n// --- Game 11: Giữ Vương Miện (keep the crown, walled arena) ----------------\n// The crown rests at the centre; touching it picks it up. The holder\n// banks +1 hold point per 250ms survived and moves at HOLDER_SPEED; a\n// shove knocks the crown loose a short way away, and it then stays\n// unpickable for CROWN_LOCK_TICKS ticks (1s) so the victim cannot\n// instantly re-grab it. Ranked by hold points; ties -> earlier seat.\nfunction botBrainCrown(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  let tx = 0, ty = 0, shove = false, dash = false;\n  const near = nearestFoe(room, p);\n  if (g.crown.holder === p.seat) {\n    // Flee with the crown: away from the nearest foe, biased back\n    // towards the centre when hugging the wall.\n    if (near.foe) { tx = me.x - near.foe.x; ty = me.y - near.foe.y; }\n    if (ellipseDist(me, ARENA_R0) > 0.49) { tx += -me.x * 0.7; ty += -me.y * 0.7; }\n  } else {\n    const tp = g.crown.holder ? g.blobs[g.crown.holder] : g.crown;\n    tx = tp.x - me.x; ty = tp.y - me.y;\n    const d = Math.hypot(tx, ty);\n    if (d > 5 && p.difficulty !== 'de') dash = true;\n    if (g.crown.holder && d <= SHOVE_RANGE) {\n      const prob = p.difficulty === 'kho' ? 0.85 : p.difficulty === 'vua' ? 0.55 : 0.3;\n      if (Math.random() < prob) shove = true;\n    }\n  }\n  const intent = Object.assign(dirIntent(tx, ty), { shove, dash });\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\nfunction stepCrown(room, t) {\n  const g = room.game;\n  if (g.phase !== 'crown') return false;\n  if (t >= g.endsAt) { finishByValue(room, g.hold, 'hold'); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'crown') {\n      simulateCrownTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateCrownTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const trk = trackStart(room);\n  const moves = collectMoves(room, botBrainCrown);\n  applyMoves(room, moves, { holderSeat: g.crown.holder });\n  separateBlobs(room);\n  applyShoves(room, moves, SHOVE_FORCE, (rm, attackerSeat, victimSeat, vx, vy) => {\n    const gg = rm.game;\n    if (gg.crown.holder === victimSeat) {\n      const ab = gg.blobs[attackerSeat];\n      let dx = vx - ab.x, dy = vy - ab.y;\n      const d = Math.hypot(dx, dy) || 1;\n      const crownPos = { x: vx + (dx / d) * 1.6 * (4 / 3), y: vy + (dy / d) * 1.6 * (3 / 4) };\n      clampRect(crownPos);\n      gg.crown.holder = null;\n      gg.crown.acc = 0;\n      gg.crown.x = Math.round(crownPos.x * 100) / 100; gg.crown.y = Math.round(crownPos.y * 100) / 100;\n      gg.crown.lockTicks = CROWN_LOCK_TICKS;\n    }\n  });\n  trackEnd(room, trk);\n  if (g.crown.holder) {\n    const hb = g.blobs[g.crown.holder];\n    g.crown.x = hb.x; g.crown.y = hb.y;\n    // +1 hold point per 250ms of holding: at the 62.5ms tick, accrue\n    // one point per four ticks spent holding (counted from the pickup,\n    // so the rate is exact regardless of tick parity).\n    g.crown.acc = (g.crown.acc || 0) + 1;\n    if (g.crown.acc >= 4) { g.crown.acc = 0; g.hold[g.crown.holder] = (g.hold[g.crown.holder] || 0) + 1; }\n  } else if (g.crown.lockTicks > 0) {\n    g.crown.lockTicks -= 1;\n  } else {\n    let taker = null, td = 1e9;\n    room.players.forEach((p) => {\n      const b = g.blobs[p.seat];\n      if (!b || !b.alive) return;\n      const d = Math.hypot(b.x - g.crown.x, b.y - g.crown.y);\n      if (d <= 1.3 && d < td) { td = d; taker = p.seat; }\n    });\n    if (taker) {\n      g.crown.holder = taker;\n      g.crown.acc = 0;\n      g.hold[taker] = (g.hold[taker] || 0) + 1;\n    }\n  }\n  snapshotPad(room);\n}\n\n// --- Game 12: Sơn Sàn (paint the floor, walled square arena) ---------------\n// The floor is a 12x12 grid; entering a cell paints it your colour and\n// opponents can repaint it. A (rising edge) fires a 3x3 paint burst with\n// a 2s cooldown — the one flourish kept, because it makes comebacks\n// possible without complicating the base loop. Ranked by cells owned at\n// the end; ties -> earlier seat.\nfunction splatCell(x, y) {\n  const c = Math.max(0, Math.min(SPLAT_COLS - 1, Math.floor((x - SPLAT_MIN_X) / SPLAT_CELL)));\n  const r = Math.max(0, Math.min(SPLAT_ROWS - 1, Math.floor((y - SPLAT_MIN_Y) / SPLAT_CELL)));\n  return r * SPLAT_COLS + c;\n}\nfunction splatCounts(room) {\n  const g = room.game;\n  const counts = {};\n  room.players.forEach((p) => { counts[p.seat] = 0; });\n  (g.grid || []).forEach((s) => { if (s) counts[s] = (counts[s] || 0) + 1; });\n  return counts;\n}\nfunction botBrainSplat(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  let bd = 1e9, bx = 0, by = 0;\n  for (let i = 0; i < (g.grid || []).length; i++) {\n    if (g.grid[i] === p.seat) continue;\n    const cx = SPLAT_MIN_X + (i % SPLAT_COLS + 0.5) * SPLAT_CELL;\n    const cy = SPLAT_MIN_Y + (Math.floor(i / SPLAT_COLS) + 0.5) * SPLAT_CELL;\n    const d = Math.hypot(cx - me.x, cy - me.y);\n    if (d < bd) { bd = d; bx = cx; by = cy; }\n  }\n  const intent = Object.assign(dirIntent(bx - me.x, by - me.y), { shove: false, dash: bd > 6 && p.difficulty !== 'de' });\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\nfunction stepSplat(room, t) {\n  const g = room.game;\n  if (g.phase !== 'splat') return false;\n  if (t >= g.endsAt) { finishByValue(room, splatCounts(room), 'cells'); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'splat') {\n      simulateSplatTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateSplatTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const trk = trackStart(room);\n  const moves = collectMoves(room, botBrainSplat);\n  applyMoves(room, moves, { clampBox: 9.2, clampX: 14.4, clampY: 8 });\n  trackEnd(room, trk);\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive) return;\n    g.grid[splatCell(b.x, b.y)] = p.seat;\n    if (g.paintCd[p.seat] > 0) g.paintCd[p.seat] -= 1;\n    if (mv && mv.burst && g.paintCd[p.seat] <= 0) {\n      const ci = splatCell(b.x, b.y);\n      const cc = ci % SPLAT_COLS, cr = Math.floor(ci / SPLAT_COLS);\n      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {\n        const rr = cr + dr, cc2 = cc + dc;\n        if (rr >= 0 && rr < SPLAT_ROWS && cc2 >= 0 && cc2 < SPLAT_COLS) g.grid[rr * SPLAT_COLS + cc2] = p.seat;\n      }\n      g.paintCd[p.seat] = PAINT_CD_TICKS;\n    }\n  });\n  snapshotPad(room);\n}\n\n// --- Game 13: Cao Bồi (duel draw, rounds) ----------------------------------\n// Not tick-based: it reuses the countdown -> wait -> go\n// phase machinery and server receipt order (the tap's server timestamp\n// IS the draw time, so network racing cannot be faked by the client).\n// Round points go to the fastest draws in receipt order (200/100/50/0);\n// tapping before BẮN! is a foul: DUEL_FOUL and locked out of the round.\nfunction stepDuel(room, t) {\n  const g = room.game;\n  if (g.phase === 'wait') {\n    if (t >= g.greenAt) { g.phase = 'go'; return true; }\n    return false;\n  }\n  if (g.phase === 'go') {\n    const settled = humansAllIn(room, (s) => !!g.inputs[s]) && botsDue(room, (pl) => (pl.earlyAt || pl.tapAt || 0));\n    if (t >= g.endsAt || settled) { resolveDuel(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'roundEnd') {\n    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }\n  }\n  return false;\n}\nfunction resolveDuel(room, t) {\n  const g = room.game;\n  const entries = room.players.map((p) => {\n    const e = { seat: p.seat, status: 'none', reactionMs: null, points: 0 };\n    if (p.type === 'human') {\n      const inp = g.inputs[p.seat];\n      if (inp && inp.foul) e.status = 'foul';\n      else if (inp && inp.tapAt) { e.status = 'fired'; e.reactionMs = inp.tapAt - g.greenAt; }\n    } else {\n      const plan = g.botPlan[p.seat] || {};\n      if (plan.earlyAt) e.status = 'foul';\n      else if (plan.tapAt && plan.tapAt <= g.endsAt) { e.status = 'fired'; e.reactionMs = plan.tapAt - g.greenAt; }\n    }\n    return e;\n  });\n  const fired = entries.filter((e) => e.status === 'fired')\n    .sort((a, b) => (a.reactionMs - b.reactionMs) || (a.seat - b.seat));\n  fired.forEach((e, i) => { e.order = i + 1; e.points = roundPoints(g, DUEL_POINTS[Math.min(i, DUEL_POINTS.length - 1)]); });\n  entries.forEach((e) => { if (e.status === 'foul') e.points = roundPoints(g, DUEL_FOUL); });\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  const order = fired.concat(entries.filter((e) => e.status === 'foul'), entries.filter((e) => e.status === 'none'));\n  g.lastRound = { round: g.round, entries: order };\n  finishTimedRound(room, 'roundEnd', t + ROUND_PAUSE_MS);\n}\n\n// --- Game 14: Chung Một Thân (co-op: ONE shared blob, split steering) ------\n// The whole team steers a single blob. Directions [u, r, d, l] are dealt\n// round-robin across the seats in seat order (beginRound); the server\n// filters every pad/brain to its owner's directions only, so the blob\n// moves at normal speed per axis and ONLY when the owner of that\n// direction holds it. Touching the checkpoint star scores +1 for the\n// team; a star left untouched for STAR_STALE_TICKS ticks (15s) respawns.\n// Cannonballs reuse the Né Đạn spawn pattern but slower (SHARED_BALL_SPEED)\n// and sparser; a hit costs the TEAM one of SHARED_HEARTS shared hearts\n// (usual INVULN_TICKS window). Ends at SHARED_MS or at 0 hearts.\nfunction spawnSharedStar(room) {\n  const g = room.game;\n  let x = 0, y = 0;\n  for (let i = 0; i < 8; i++) {\n    const ang = rand(0, Math.PI * 2); const rr = rand(2.5, 8.5);\n    x = Math.cos(ang) * rr * (4 / 3); y = Math.sin(ang) * rr * (3 / 4);\n    if (!g.shared || Math.hypot(x - g.shared.x, y - g.shared.y) >= 3) break;\n  }\n  g.star = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };\n  g.starTick = g.tickCount;\n}\nfunction botBrainShared(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  let want;\n  if (cached) want = cached;\n  else {\n    const me = g.shared;\n    let tx = g.star ? g.star.x - me.x : 0, ty = g.star ? g.star.y - me.y : 0;\n    let ball = null, bd = 1e9;\n    (g.balls || []).forEach((b) => {\n      const d = Math.hypot(b.x - me.x, b.y - me.y);\n      if (d < bd) { bd = d; ball = b; }\n    });\n    if (ball && bd < 5) { tx = me.x - ball.x; ty = me.y - ball.y; } // flee the nearest ball\n    want = dirIntent(tx, ty);\n    g.botIntent[p.seat] = { x: want.x, y: want.y };\n  }\n  // Cooperate: a bot may only push the directions it owns.\n  return {\n    x: (want.x > 0 && g.owners.r === p.seat) || (want.x < 0 && g.owners.l === p.seat) ? want.x : 0,\n    y: (want.y > 0 && g.owners.d === p.seat) || (want.y < 0 && g.owners.u === p.seat) ? want.y : 0,\n  };\n}\nfunction stepShared(room, t) {\n  const g = room.game;\n  if (g.phase !== 'shared') return false;\n  if (t >= g.endsAt) { finishShared(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'shared') {\n      simulateSharedTick(room);\n      if (room.game !== g) return true; // hearts ran out mid-tick\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateSharedTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  // Sum the owned-direction inputs: each direction has exactly one\n  // owner, so the blob moves at most MOVE_STEP per axis per tick.\n  let mx = 0, my = 0;\n  room.players.forEach((p) => {\n    let ix = 0, iy = 0;\n    if (p.type === 'human') {\n      const pad = g.pad[p.seat] || {};\n      ix = (pad.r ? 1 : 0) - (pad.l ? 1 : 0);\n      iy = (pad.d ? 1 : 0) - (pad.u ? 1 : 0);\n    } else {\n      const intent = botBrainShared(room, p);\n      ix = intent.x; iy = intent.y;\n    }\n    if (ix > 0 && g.owners.r === p.seat) mx += 1;\n    if (ix < 0 && g.owners.l === p.seat) mx -= 1;\n    if (iy > 0 && g.owners.d === p.seat) my += 1;\n    if (iy < 0 && g.owners.u === p.seat) my -= 1;\n  });\n  const b = g.shared;\n  const ox = b.x, oy = b.y;\n  b.x += mx * STEP_X; b.y += my * STEP_Y;\n  clampRect(b); // walled arena\n  b.x = Math.round(b.x * 100) / 100; b.y = Math.round(b.y * 100) / 100;\n  b.vx = Math.round((b.x - ox) * 100) / 100; b.vy = Math.round((b.y - oy) * 100) / 100;\n  // Checkpoint touch scores for the team; a stale star respawns.\n  if (g.star && Math.hypot(g.star.x - b.x, g.star.y - b.y) <= 1.3) { g.checks += 1; spawnSharedStar(room); }\n  else if (g.star && g.tickCount - g.starTick >= STAR_STALE_TICKS) spawnSharedStar(room);\n  // Cannonballs: same edge-spawn pattern as Né Đạn, lower density.\n  g.spawnIn -= 1;\n  if (g.spawnIn <= 0) {\n    const side = randInt(0, 3);\n    let x = 0, y = 0;\n    if (side === 0) { x = -17.5; y = rand(-8.5, 8.5); } else if (side === 1) { x = 17.5; y = rand(-8.5, 8.5); }\n    else if (side === 2) { x = rand(-15.5, 15.5); y = -10.5; } else { x = rand(-15.5, 15.5); y = 10.5; }\n    const tx = rand(-8, 8), ty = rand(-4.5, 4.5);\n    const dx = tx - x, dy = ty - y; const dd = Math.hypot(dx, dy) || 1;\n    g.balls.push({ x, y, vx: (dx / dd) * SHARED_BALL_SPEED * (4 / 3), vy: (dy / dd) * SHARED_BALL_SPEED * (3 / 4) });\n    g.spawnIn = Math.max(40, 64 - 2 * Math.floor(g.tickCount / 384));\n  }\n  g.balls.forEach((ball) => { ball.x += ball.vx; ball.y += ball.vy; });\n  g.balls = g.balls.filter((ball) => Math.abs(ball.x) <= 19 && Math.abs(ball.y) <= 12);\n  if (g.sharedInvuln > 0) g.sharedInvuln -= 1;\n  else {\n    const idx = g.balls.findIndex((ball) => Math.hypot(ball.x - b.x, ball.y - b.y) < BALL_HIT_DIST);\n    if (idx >= 0) {\n      g.balls.splice(idx, 1);\n      g.hearts -= 1;\n      g.sharedInvuln = INVULN_TICKS;\n      if (g.hearts <= 0) { finishShared(room); return; }\n    }\n  }\n  snapshotPad(room);\n}\nfunction finishShared(room) {\n  const g = room.game;\n  finishCoop(room, g.checks, coopTier(g.checks, SHARED_TIERS), 'điểm kiểm tra');\n}\n\n// --- Game 15: Đẩy Hộp Về Đích (co-op crate pushing through a maze) ---------\n// The crate is a circle of radius BOX_CRATE_R for collision. Each tick,\n// players overlapping the crate contribute their movement direction to a\n// push sum; the crate slides by the normalized sum * MOVE_STEP *\n// BOX_STEP_MUL ONLY when >= 2 distinct players are in contact AND |sum|\n// >= BOX_PUSH_MIN — one player alone can never move it, and two players\n// pushing against each other cancel out. Rect walls block players and\n// crate alike (axis-separate slide). Delivering the crate centre into\n// the goal zone scores +1 and loads the next layout (rotating).\n// 16:9 WAVE: the three mazes are redrawn for the wide field (crate /\n// goal / wall rects mapped x*4/3, y*3/4 from the old layouts, goals\n// widened a touch); the >=2-pushers rule is untouched.\nconst BOX_LAYOUTS = [\n  { crate: { x: -8.6, y: 0 }, goal: { x: 8.7, y: -1.1, w: 4, h: 2.2 }, walls: [\n    { x: -2, y: 2.2, w: 4, h: 0.85 }, { x: -2, y: -3.05, w: 4, h: 0.85 } ] },\n  { crate: { x: -8.7, y: -3.75 }, goal: { x: 8, y: 2.6, w: 4.3, h: 2.25 }, walls: [\n    { x: -12.3, y: 1.35, w: 8.5, h: 0.9 }, { x: 3.7, y: -2.25, w: 8.5, h: 0.9 } ] },\n  { crate: { x: 0, y: -4.9 }, goal: { x: -2.1, y: 3.9, w: 4.3, h: 2.25 }, walls: [\n    { x: -4.8, y: -0.75, w: 1.5, h: 2.85 }, { x: 3.3, y: -0.75, w: 1.5, h: 2.85 }, { x: -3.3, y: 2.1, w: 8.1, h: 0.85 } ] },\n];\nfunction loadBoxLayout(room) {\n  const g = room.game;\n  const L = BOX_LAYOUTS[g.layout % BOX_LAYOUTS.length];\n  g.crate = { x: L.crate.x, y: L.crate.y };\n  g.goal = { x: L.goal.x, y: L.goal.y, w: L.goal.w, h: L.goal.h };\n  g.walls = L.walls.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h }));\n}\nfunction circleRectHit(cx, cy, r, w) {\n  const nx = Math.max(w.x, Math.min(cx, w.x + w.w));\n  const ny = Math.max(w.y, Math.min(cy, w.y + w.h));\n  return Math.hypot(cx - nx, cy - ny) < r;\n}\nfunction slideCircle(pos, dx, dy, r, walls, clampM, clampMY) {\n  if (dx) {\n    const nx = pos.x + dx;\n    if (!walls.some((w) => circleRectHit(nx, pos.y, r, w))) pos.x = nx;\n  }\n  if (dy) {\n    const ny = pos.y + dy;\n    if (!walls.some((w) => circleRectHit(pos.x, ny, r, w))) pos.y = ny;\n  }\n  pos.x = Math.max(-clampM, Math.min(clampM, pos.x));\n  const my = clampMY != null ? clampMY : clampM;\n  pos.y = Math.max(-my, Math.min(my, pos.y));\n}\nfunction botBrainBox(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  const c = g.crate; const gl = g.goal;\n  const gx = gl.x + gl.w / 2, gy = gl.y + gl.h / 2;\n  const dGoal = Math.hypot(gx - c.x, gy - c.y) || 1;\n  // Stand on the far side of the crate from the goal, then push into it.\n  const bx = c.x - ((gx - c.x) / dGoal) * (BOX_CRATE_R + 0.85);\n  const by = c.y - ((gy - c.y) / dGoal) * (BOX_CRATE_R + 0.85);\n  const inContact = Math.hypot(c.x - me.x, c.y - me.y) <= BOX_CRATE_R + 0.85;\n  const intent = inContact ? dirIntent(gx - c.x, gy - c.y) : dirIntent(bx - me.x, by - me.y);\n  g.botIntent[p.seat] = { x: intent.x, y: intent.y };\n  return intent;\n}\nfunction stepBox(room, t) {\n  const g = room.game;\n  if (g.phase !== 'box') return false;\n  if (t >= g.endsAt) { finishBox(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'box') {\n      simulateBoxTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateBoxTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const trk = trackStart(room);\n  const moves = collectMoves(room, botBrainBox);\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;\n    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;\n    let stepMul = 1;\n    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }\n    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;\n    slideCircle(b, mv.x * STEP_X * stepMul, mv.y * STEP_Y * stepMul, 0.8, g.walls, CLAMP_X, CLAMP_Y);\n  });\n  separateBlobs(room);\n  trackEnd(room, trk);\n  const c = g.crate;\n  const cox = c.x, coy = c.y;\n  // Body-block: nobody may stand inside the crate; contact pushes out.\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    const dx = b.x - c.x, dy = b.y - c.y; const d = Math.hypot(dx, dy);\n    const minD = BOX_CRATE_R + 0.8;\n    if (d < minD) {\n      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;\n      b.x = c.x + ux * minD; b.y = c.y + uy * minD;\n    }\n  });\n  // The push itself: needs >= 2 distinct players in contact and a\n  // summed intent of magnitude >= BOX_PUSH_MIN.\n  const contact = room.players.filter((p) => {\n    const b = g.blobs[p.seat];\n    return b && b.alive && Math.hypot(b.x - c.x, b.y - c.y) <= BOX_CRATE_R + 0.8 + 0.05;\n  });\n  if (contact.length >= 2) {\n    let sx = 0, sy = 0;\n    contact.forEach((p) => { const mv = moves[p.seat]; if (mv) { sx += mv.x; sy += mv.y; } });\n    const mag = Math.hypot(sx, sy);\n    if (mag >= BOX_PUSH_MIN) {\n      slideCircle(c, (sx / mag) * STEP_X * BOX_STEP_MUL, (sy / mag) * STEP_Y * BOX_STEP_MUL,\n        BOX_CRATE_R, g.walls, CLAMP_X - BOX_CRATE_R, CLAMP_Y - BOX_CRATE_R);\n    }\n  }\n  c.x = Math.round(c.x * 100) / 100; c.y = Math.round(c.y * 100) / 100;\n  c.vx = Math.round((c.x - cox) * 100) / 100; c.vy = Math.round((c.y - coy) * 100) / 100;\n  const gl = g.goal;\n  if (c.x >= gl.x && c.x <= gl.x + gl.w && c.y >= gl.y && c.y <= gl.y + gl.h) {\n    g.deliveries += 1;\n    g.layout = (g.layout + 1) % BOX_LAYOUTS.length;\n    loadBoxLayout(room);\n  }\n  snapshotPad(room);\n}\nfunction finishBox(room) {\n  const g = room.game;\n  finishCoop(room, g.deliveries, coopTier(g.deliveries, BOX_TIERS), 'lượt giao');\n}\n\n// --- Game 16: Chèo Thuyền (co-op rhythm rowing, phase-based) ---------------\n// Beats fall every ROW_BEAT_MS for ROW_BEATS beats. A tap counts as an\n// in-window stroke when its server receipt time is within\n// +-ROW_WINDOW_MS of a beat time (handled in playerAction); anything\n// else splashes (a miss: counted, no advance, no penalty). Per beat the\n// boat advances (fraction of the room stroking in that beat's window) *\n// ROW_FULL_STROKE, so a perfect team covers ROW_PERFECT metres and\n// finishes the ROW_COURSE course with ~5 beats to spare. Bots \"press\"\n// when their beat's window closes, with a difficulty timing error\n// (ROW_ERR): Dễ at +-380ms sometimes lands outside the window entirely.\nfunction stepRow(room, t) {\n  const g = room.game;\n  if (g.phase !== 'row') return false;\n  let progressed = false;\n  while (g.beatDone < ROW_BEATS && t >= g.rowStart + g.beatDone * ROW_BEAT_MS + ROW_WINDOW_MS) {\n    resolveRowBeat(room, g.beatDone);\n    g.beatDone += 1;\n    progressed = true;\n  }\n  if (t >= g.endsAt) { finishRow(room); return true; }\n  return progressed;\n}\nfunction resolveRowBeat(room, k) {\n  const g = room.game;\n  room.players.forEach((p) => {\n    if (p.type !== 'bot') return;\n    const key = p.seat + ':' + k;\n    if (g.stroked[key]) return;\n    g.stroked[key] = 1;\n    const E = ROW_ERR[p.difficulty] || 220;\n    const err = Math.round(rand(-E, E));\n    if (Math.abs(err) <= ROW_WINDOW_MS) addRowDistance(room, p.seat);\n  });\n}\nfunction finishRow(room) {\n  const g = room.game;\n  const pct = (g.distance / ROW_PERFECT) * 100;\n  finishCoop(room, Math.round(g.distance), coopTier(pct, ROW_TIERS), 'm');\n}\n\n// ---------------------------------------------------------------------------\n// Views (filtered per role; quiz answers are never exposed before reveal)\n// ---------------------------------------------------------------------------\nfunction moodOf(room, p) {\n  if (room.phase === 'lobby') return 'cuoi';\n  const st = standingsOf(room);\n  const rank = st.indexOf(p.seat);\n  const n = st.length;\n  const g = room.game;\n  const moves = g && g.rankMoves ? (g.rankMoves[p.seat] || 0) : 0;\n  if (n > 1 && rank === 0) return 'reo';\n  if (moves < 0 && n > 1 && rank === n - 1) return 'buon';\n  if (moves < 0) return 'ngacnhien';\n  if (moves > 0) return 'reo';\n  if (n > 2 && rank === n - 1) return 'buon';\n  return 'cuoi';\n}\n// ---------------------------------------------------------------------------\n// Wave 3: Xe Tăng / Đặt Bom / Kẻ Giả Mạo / Thủ Thành / Giải Mã Chung\n// ---------------------------------------------------------------------------\n// Shared movement for the walled tick games: dash handling matches\n// applyMoves, then either a slideCircle pass against wall rects or\n// the plain rectangle wall clamp of the wide field.\nfunction moveBlobsWalled(room, moves, walls, clampM, clampMY) {\n  const g = room.game;\n  const trk = trackStart(room);\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv) return;\n    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;\n    if ((g.dashBoost[p.seat] || 0) > 0) g.dashBoost[p.seat] -= 1;\n    let stepMul = 1;\n    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { g.dashBoost[p.seat] = DASH_BOOST_TICKS; g.dashCd[p.seat] = DASH_CD_TICKS; }\n    if ((g.dashBoost[p.seat] || 0) > 0) stepMul = 3;\n    if (walls) {\n      slideCircle(b, mv.x * STEP_X * stepMul, mv.y * STEP_Y * stepMul, 0.8, walls, clampM, clampMY);\n    } else {\n      b.x += mv.x * STEP_X * stepMul; b.y += mv.y * STEP_Y * stepMul;\n      clampRect(b);\n    }\n  });\n  trackEnd(room, trk);\n}\nfunction damageBlob(room, seat) {\n  const g = room.game;\n  const b = g.blobs[seat];\n  if (!b || !b.alive) return;\n  b.lives -= 1;\n  g.invuln[seat] = INVULN_TICKS;\n  if (b.lives <= 0) { b.alive = false; g.elimOrder.push(seat); g.elimTick[seat] = g.tickCount; }\n}\n// Guns: facing follows the last movement direction; the A rising edge\n// (collectMoves' burst) fires one shell per SHELL_CD_TICKS.\nfunction processGuns(room, moves) {\n  const g = room.game;\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive) return;\n    if (g.fireCd[p.seat] > 0) g.fireCd[p.seat] -= 1;\n    if (!mv) return;\n    if (mv.x || mv.y) {\n      const dd = Math.hypot(mv.x, mv.y);\n      g.facing[p.seat] = { x: mv.x / dd, y: mv.y / dd };\n    }\n    if (mv.burst && g.fireCd[p.seat] <= 0) {\n      const f = g.facing[p.seat] || { x: 1, y: 0 };\n      g.shellSeq += 1;\n      g.shells.push({\n        id: g.shellSeq, seat: p.seat,\n        x: Math.round((b.x + f.x * 1.1) * 100) / 100, y: Math.round((b.y + f.y * 1.1) * 100) / 100,\n        vx: f.x * SHELL_SPEED, vy: f.y * SHELL_SPEED,\n      });\n      g.fireCd[p.seat] = SHELL_CD_TICKS;\n    }\n  });\n}\n// Shells fly straight; they die on cover walls and out of bounds, and\n// hit the first valid target: enemy players (never the owner, never an\n// invulnerable one — the shell passes through those) and/or slimes.\nfunction stepShells(room, opts) {\n  const g = room.game;\n  const keep = [];\n  for (const s of g.shells) {\n    s.x += s.vx; s.y += s.vy;\n    let dead = Math.abs(s.x) > 16.5 || Math.abs(s.y) > 9.5; // out of the wide field\n    if (!dead && opts.walls) {\n      dead = opts.walls.some((w) => s.x >= w.x - 0.1 && s.x <= w.x + w.w + 0.1 && s.y >= w.y - 0.1 && s.y <= w.y + w.h + 0.1);\n    }\n    if (!dead && opts.hitPlayers) {\n      for (const q of room.players) {\n        if (q.seat === s.seat) continue;\n        const tb = g.blobs[q.seat];\n        if (tb && tb.alive && (g.invuln[q.seat] || 0) <= 0 && Math.hypot(tb.x - s.x, tb.y - s.y) <= SHELL_HIT_DIST) {\n          damageBlob(room, q.seat); dead = true; break;\n        }\n      }\n    }\n    if (!dead && opts.hitSlimes) {\n      for (const sl of g.slimes) {\n        if (Math.hypot(sl.x - s.x, sl.y - s.y) <= sl.r + 0.35) {\n          sl.hp -= 1;\n          if (sl.hp <= 0) { sl.dead = true; g.kills += 1; }\n          dead = true; break;\n        }\n      }\n    }\n    if (!dead) keep.push(s);\n  }\n  g.shells = keep;\n}\nfunction tickInvuln(room) {\n  const g = room.game;\n  room.players.forEach((p) => { if ((g.invuln[p.seat] || 0) > 0) g.invuln[p.seat] -= 1; });\n}\n\n// --- Game 17: Xe Tăng Đấu Trường (tick arena, cover blocks) ---------------\n// Tanks trade shells across a walled arena with four cover blocks\n// (slideCircle collisions; shells die on the blocks). Placement is the\n// shared arena rule (finishArena): alive first by lives, then the\n// elimination order reversed.\nfunction stepTank(room, t) {\n  const g = room.game;\n  if (g.phase !== 'tank') return false;\n  if (t >= g.endsAt) { finishArena(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'tank') {\n      simulateTankTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateTankTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const moves = collectMoves(room, botBrainTank);\n  moveBlobsWalled(room, moves, TANK_BLOCKS, CLAMP_X, CLAMP_Y);\n  separateBlobs(room);\n  processGuns(room, moves);\n  stepShells(room, { walls: TANK_BLOCKS, hitPlayers: true });\n  tickInvuln(room);\n  snapshotPad(room);\n  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;\n  if (aliveCount <= 1) finishArena(room);\n}\nfunction shellPathBlocked(x1, y1, x2, y2) {\n  for (let i = 1; i < 10; i++) {\n    const x = x1 + (x2 - x1) * i / 10, y = y1 + (y2 - y1) * i / 10;\n    if (TANK_BLOCKS.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h)) return true;\n  }\n  return false;\n}\nfunction botBrainTank(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  let tx = 0, ty = 0, burst = false, dash = false;\n  // Sidestep a shell that is closing in on me.\n  let dodge = null;\n  (g.shells || []).forEach((s) => {\n    if (s.seat === p.seat) return;\n    const rx = me.x - s.x, ry = me.y - s.y;\n    const d = Math.hypot(rx, ry);\n    if (d < 4 && rx * s.vx + ry * s.vy > 0 && (!dodge || d < dodge.d)) {\n      dodge = { x: Math.sign(-s.vy) || 1, y: Math.sign(s.vx) || 0, d };\n    }\n  });\n  if (dodge) { tx = dodge.x; ty = dodge.y; dash = p.difficulty === 'kho'; }\n  else {\n    const near = nearestFoe(room, p);\n    if (near.foe) {\n      tx = near.foe.x - me.x; ty = near.foe.y - me.y;\n      const f = g.facing[p.seat] || { x: 1, y: 0 };\n      const dd = Math.hypot(tx, ty) || 1;\n      const aligned = (tx / dd) * f.x + (ty / dd) * f.y > 0.9;\n      if (aligned && !shellPathBlocked(me.x, me.y, near.foe.x, near.foe.y)) burst = true;\n      if (near.foeD < 2.2) { tx = -tx; ty = -ty; } // keep some distance\n    }\n  }\n  const intent = Object.assign(dirIntent(tx, ty), { burst, dash });\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\n\n// --- Game 18: Đặt Bom (tick, grid arena, chain reactions) -----------------\n// 16:9 wave: 15 columns span x in [-15,15] (cell centres -14+2c); the\n// 9 rows are unchanged (centres -8+2r over the field's [-9,9]).\nfunction bomCellX(c) { return -14 + c * 2; }\nfunction bomCellY(r) { return -8 + r * 2; }\nfunction bomColOf(x) { return Math.max(0, Math.min(BOM_COLS - 1, Math.floor((x + 15) / 2))); }\nfunction bomRowOf(y) { return Math.max(0, Math.min(BOM_ROWS - 1, Math.floor((y + 9) / 2))); }\nfunction bomIsHard(c, r) { return c % 2 === 1 && r % 2 === 1; }\nconst BOM_MID = (BOM_COLS - 1) / 2; // 7: the middle column of 15\n// Spawn cells for up to 6 bombers: the four corners, then the top-\n// and bottom-edge midpoints. Nobody ever stacks on a shared cell.\nconst BOM_SPAWNS = [[0, 0], [BOM_COLS - 1, BOM_ROWS - 1], [BOM_COLS - 1, 0], [0, BOM_ROWS - 1], [BOM_MID, 0], [BOM_MID, BOM_ROWS - 1]];\nfunction bomIsSafe(c, r) {\n  // Corner pockets: the 2x2 around each corner spawn (as always).\n  if ((c <= 1 && r <= 1) || (c >= BOM_COLS - 2 && r >= BOM_ROWS - 2)\n    || (c >= BOM_COLS - 2 && r <= 1) || (c <= 1 && r >= BOM_ROWS - 2)) return true;\n  // Edge-mid pockets: the spawn cell plus the cell directly inward,\n  // so a mid-edge bomber always has one guaranteed open step.\n  return (c === BOM_MID && (r === 0 || r === 1)) || (c === BOM_MID && (r === BOM_ROWS - 1 || r === BOM_ROWS - 2));\n}\nfunction bomCellRect(c, r) { return { x: bomCellX(c) - 1, y: bomCellY(r) - 1, w: 2, h: 2 }; }\nfunction blastCells(room, bomb) {\n  const g = room.game;\n  const hard = new Set(g.hardCells.map(([c, r]) => c + ',' + r));\n  const soft = new Set(g.softCells.map(([c, r]) => c + ',' + r));\n  const cells = [[bomb.col, bomb.row]];\n  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];\n  for (const [dc, dr] of dirs) {\n    for (let k = 1; k <= 2; k++) {\n      const c = bomb.col + dc * k, r = bomb.row + dr * k;\n      if (c < 0 || c >= BOM_COLS || r < 0 || r >= BOM_ROWS) break;\n      const key = c + ',' + r;\n      if (hard.has(key)) break;\n      cells.push([c, r]);\n      if (soft.has(key)) break;\n    }\n  }\n  return cells;\n}\nfunction detonateBombs(room, initial) {\n  const g = room.game;\n  const queue = initial.slice();\n  const done = new Set();\n  const allCells = [];\n  const cellSet = new Set();\n  while (queue.length) {\n    const bomb = queue.shift();\n    if (done.has(bomb.id)) continue;\n    done.add(bomb.id);\n    const cells = blastCells(room, bomb);\n    cells.forEach(([c, r]) => {\n      const key = c + ',' + r;\n      if (!cellSet.has(key)) { cellSet.add(key); allCells.push([c, r]); }\n    });\n    // Chain reaction: any other live bomb caught in the blast goes off\n    // in the same tick, with its own full blast cross.\n    g.bombs.forEach((b) => {\n      if (!done.has(b.id) && cells.some(([c, r]) => c === b.col && r === b.row)) queue.push(b);\n    });\n  }\n  g.softCells = g.softCells.filter(([c, r]) => !cellSet.has(c + ',' + r));\n  g.bombs = g.bombs.filter((b) => !done.has(b.id));\n  g.blasts.push({ cells: allCells, until: now() + 650 });\n  if (g.blasts.length > 3) g.blasts = g.blasts.slice(-3);\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive || (g.invuln[p.seat] || 0) > 0) return;\n    if (cellSet.has(bomColOf(b.x) + ',' + bomRowOf(b.y))) damageBlob(room, p.seat);\n  });\n}\nfunction bomberWalls(room) {\n  const g = room.game;\n  const walls = [];\n  g.hardCells.forEach(([c, r]) => walls.push(bomCellRect(c, r)));\n  g.softCells.forEach(([c, r]) => walls.push(bomCellRect(c, r)));\n  g.bombs.forEach((b) => { if (b.solid) walls.push({ x: b.x - 0.95, y: b.y - 0.95, w: 1.9, h: 1.9 }); });\n  return walls;\n}\nfunction stepBomber(room, t) {\n  const g = room.game;\n  if (g.phase !== 'bomber') return false;\n  if (t >= g.endsAt) { finishArena(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'bomber') {\n      simulateBomberTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateBomberTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  // A bomb turns solid only once nobody stands on its cell, so the\n  // planter can always walk off their own fresh bomb.\n  g.bombs.forEach((b) => {\n    if (b.solid) return;\n    const occupied = room.players.some((p) => {\n      const bb = g.blobs[p.seat];\n      return bb && bb.alive && bomColOf(bb.x) === b.col && bomRowOf(bb.y) === b.row;\n    });\n    if (!occupied) b.solid = true;\n  });\n  const moves = collectMoves(room, botBrainBomber);\n  moveBlobsWalled(room, moves, bomberWalls(room), 14.2, 8.2); // the grid spans [-15,15]x[-9,9], blobs keep 0.8 off the edge\n  separateBlobs(room);\n  // A places a bomb on the current cell; one live bomb per player.\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat]; const mv = moves[p.seat];\n    if (!b || !b.alive || !mv || !mv.burst) return;\n    if (g.bombs.some((x) => x.seat === p.seat)) return;\n    const col = bomColOf(b.x), row = bomRowOf(b.y);\n    if (g.bombs.some((x) => x.col === col && x.row === row)) return;\n    g.bombSeq += 1;\n    g.bombs.push({ id: g.bombSeq, seat: p.seat, col, row, x: bomCellX(col), y: bomCellY(row), boomTick: g.tickCount + BOM_FUSE_TICKS, solid: false });\n  });\n  const due = g.bombs.filter((b) => g.tickCount >= b.boomTick);\n  if (due.length) detonateBombs(room, due);\n  tickInvuln(room);\n  snapshotPad(room);\n  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;\n  if (aliveCount <= 1) finishArena(room);\n}\nfunction botBrainBomber(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  const danger = new Set();\n  g.bombs.forEach((b) => { blastCells(room, b).forEach(([c, r]) => danger.add(c + ',' + r)); });\n  const myBomb = g.bombs.find((b) => b.seat === p.seat);\n  let tx = 0, ty = 0, burst = false;\n  if (myBomb || danger.has(bomColOf(me.x) + ',' + bomRowOf(me.y))) {\n    // Retreat to the nearest cell outside every blast cross.\n    let best = null, bd = 1e9;\n    for (let r = 0; r < BOM_ROWS; r++) {\n      for (let c = 0; c < BOM_COLS; c++) {\n        if (bomIsHard(c, r) || danger.has(c + ',' + r)) continue;\n        if (g.softCells.some(([sc, sr]) => sc === c && sr === r)) continue;\n        const d = Math.hypot(bomCellX(c) - me.x, bomCellY(r) - me.y);\n        if (d < bd) { bd = d; best = { x: bomCellX(c), y: bomCellY(r) }; }\n      }\n    }\n    if (best) { tx = best.x - me.x; ty = best.y - me.y; }\n  } else {\n    // Hunt: nearest soft block or enemy; plant when adjacent-ish.\n    let target = null, td = 1e9;\n    g.softCells.forEach(([c, r]) => {\n      const d = Math.hypot(bomCellX(c) - me.x, bomCellY(r) - me.y);\n      if (d < td) { td = d; target = { x: bomCellX(c), y: bomCellY(r) }; }\n    });\n    const near = nearestFoe(room, p);\n    if (near.foe && near.foeD < td) { target = { x: near.foe.x, y: near.foe.y }; td = near.foeD; }\n    if (target) {\n      tx = target.x - me.x; ty = target.y - me.y;\n      if (td <= 2.6) burst = true;\n    }\n  }\n  const intent = Object.assign(dirIntent(tx, ty), { burst });\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\n\n// --- Game 19: Kẻ Giả Mạo (rounds-based social deduction) ------------------\n// Phases answer -> discuss -> vote -> reveal per round. Scoring: a\n// strict plurality accusation against the impostor catches them\n// (everyone else +150); any tie or a wrong plurality lets the impostor\n// escape (+300, doubled in the final round).\nfunction stepImpostor(room, t) {\n  const g = room.game;\n  if (g.phase === 'answer') {\n    room.players.forEach((p) => {\n      if (p.type !== 'bot') return;\n      const plan = g.botPlan[p.seat];\n      if (plan && plan.answerAt <= t && !g.inputs[p.seat]) g.inputs[p.seat] = { choice: plan.answer, at: plan.answerAt };\n    });\n    if (t >= g.endsAt || humansAllIn(room, (s) => !!g.inputs[s])) {\n      g.phase = 'discuss'; g.endsAt = t + IMP_DISCUSS_MS;\n      return true;\n    }\n    return false;\n  }\n  if (g.phase === 'discuss') {\n    room.players.forEach((p) => {\n      if (p.type !== 'bot') return;\n      const plan = g.botPlan[p.seat];\n      if (plan && !plan.chatted && plan.chatAt <= t) {\n        plan.chatted = true;\n        g.chatLog.push({ seat: p.seat, text: plan.chatLine, at: t });\n        if (g.chatLog.length > 30) g.chatLog = g.chatLog.slice(-30);\n      }\n    });\n    if (t >= g.endsAt) {\n      g.phase = 'vote'; g.endsAt = t + IMP_VOTE_MS;\n      room.players.forEach((p) => {\n        if (p.type !== 'bot') return;\n        const others = room.players.filter((q) => q.seat !== p.seat).map((q) => q.seat);\n        g.botPlan[p.seat].voteAt = t + Math.round(rand(2000, 14000));\n        g.botPlan[p.seat].vote = pick(others);\n      });\n      return true;\n    }\n    return false;\n  }\n  if (g.phase === 'vote') {\n    room.players.forEach((p) => {\n      if (p.type !== 'bot') return;\n      const plan = g.botPlan[p.seat];\n      if (plan && plan.voteAt && plan.voteAt <= t && g.votes[p.seat] == null) g.votes[p.seat] = plan.vote;\n    });\n    if (t >= g.endsAt || humansAllIn(room, (s) => g.votes[s] != null)) { resolveImpostor(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'reveal') {\n    if (t >= g.endsAt) { nextRoundOrEnd(room); return true; }\n  }\n  return false;\n}\nfunction resolveImpostor(room, t) {\n  const g = room.game;\n  const counts = {};\n  Object.keys(g.votes).forEach((s) => { counts[g.votes[s]] = (counts[g.votes[s]] || 0) + 1; });\n  let topSeat = null, topCount = 0, tie = false;\n  Object.keys(counts).forEach((s) => {\n    const c = counts[s];\n    if (c > topCount) { topCount = c; topSeat = +s; tie = false; }\n    else if (c === topCount) tie = true;\n  });\n  const caught = !tie && topCount > 0 && topSeat === g.imp.seat;\n  const pts = {};\n  room.players.forEach((p) => {\n    let v = 0;\n    if (caught) v = p.seat === g.imp.seat ? 0 : 150;\n    else if (p.seat === g.imp.seat) v = isFinalRound(g) ? 600 : 300;\n    pts[p.seat] = v;\n    g.points[p.seat] = (g.points[p.seat] || 0) + v;\n  });\n  const answers = {};\n  room.players.forEach((p) => { answers[p.seat] = g.inputs[p.seat] ? g.inputs[p.seat].choice : null; });\n  g.reveal = { impostor: g.imp.seat, pair: g.imp.pair, caught, votes: Object.assign({}, g.votes), answers, points: pts };\n  g.lastRound = { round: g.round, entries: room.players.map((p) => ({ seat: p.seat, points: pts[p.seat] })) };\n  finishTimedRound(room, 'reveal', t + IMP_REVEAL_MS);\n}\n\n// --- Game: Ma Sói (hidden-role social deduction) ---------------------------\n// Flow per round: night (wolves pick a victim by vote — plurality,\n// ties broken by the lowest-seat wolf's choice; guard protects one\n// player, never the same target two nights running; seer inspects\n// one player and learns wolf/not-wolf into their PRIVATE notes; the\n// witch, once every living wolf has locked a vote, privately sees\n// the victim and may spend her one save and/or her one poison) ->\n// dawn (the dead are announced, roles public from death on) -> day\n// discussion (public chat) -> vote (plurality executed, tie = nobody)\n// -> execute reveal. Win checks run after every death resolution:\n// wolves win at parity, the village wins when the last wolf dies.\n// Points go to the WINNING SIDE as a block: wolves 300 each, village\n// 200 each, losers 50 each — dying early never costs your side's pay.\nfunction wolfWinner(room) {\n  const g = room.game; const w = g.wolf;\n  const alive = room.players.filter((p) => w.alive[p.seat]);\n  const wolves = alive.filter((p) => w.roles[p.seat] === 'soi').length;\n  if (wolves === 0) return 'dan';\n  if (wolves >= alive.length - wolves) return 'soi';\n  if (g.round >= WOLF_NIGHT_CAP) return wolves * 2 >= alive.length ? 'soi' : 'dan';\n  return null;\n}\nfunction wolfWolvesIn(room) {\n  const w = room.game.wolf;\n  return room.players.every((p) => !w.alive[p.seat] || w.roles[p.seat] !== 'soi' || w.wolfVotes[p.seat] != null);\n}\nfunction wolfVictim(room) {\n  const w = room.game.wolf;\n  const counts = {}; const firstVoter = {};\n  Object.keys(w.wolfVotes).forEach((s) => {\n    const tgt = w.wolfVotes[s];\n    counts[tgt] = (counts[tgt] || 0) + 1;\n    if (firstVoter[tgt] == null || +s < firstVoter[tgt]) firstVoter[tgt] = +s;\n  });\n  let best = null;\n  Object.keys(counts).forEach((tgt) => {\n    if (best == null || counts[tgt] > counts[best]\n      || (counts[tgt] === counts[best] && firstVoter[tgt] < firstVoter[best])) best = +tgt;\n  });\n  return best;\n}\nfunction wolfSeerApply(room, seat, target) {\n  const w = room.game.wolf;\n  w.seerPick = target;\n  if (!w.seerNotes[seat]) w.seerNotes[seat] = {};\n  w.seerNotes[seat][target] = w.roles[target] === 'soi';\n}\nfunction wolfAllIn(room) {\n  const g = room.game; const w = g.wolf;\n  return room.players.every((p) => {\n    if (!w.alive[p.seat]) return true;\n    const role = w.roles[p.seat];\n    if (role === 'soi') return w.wolfVotes[p.seat] != null;\n    if (role === 'bao-ve') return w.guardPick != null;\n    if (role === 'tien-tri') return w.seerPick != null;\n    if (role === 'phu-thuy') {\n      const needed = (w.saveLeft > 0 || w.poisonLeft > 0);\n      return !needed || w.witch.done;\n    }\n    return true;\n  });\n}\nfunction wolfPlanNight(room, t) {\n  const g = room.game; const w = g.wolf;\n  g.botPlan = {};\n  const nonWolves = room.players.filter((p) => w.alive[p.seat] && w.roles[p.seat] !== 'soi').map((p) => p.seat);\n  const packTarget = nonWolves.length ? pick(nonWolves) : null;\n  room.players.forEach((p) => {\n    if (p.type !== 'bot' || !w.alive[p.seat]) return;\n    const role = w.roles[p.seat];\n    const at = t + Math.round(rand(2500, 20000));\n    if (role === 'soi') {\n      // Pack play: Khó wolves always hunt the shared victim, Vừa\n      // wolves join it half the time, Dễ wolves wander off alone.\n      const share = p.difficulty === 'kho' || (p.difficulty === 'vua' && Math.random() < 0.5);\n      g.botPlan[p.seat] = { at, target: share && packTarget != null ? packTarget : (nonWolves.length ? pick(nonWolves) : null) };\n    } else if (role === 'bao-ve') {\n      let cands = room.players.filter((q) => w.alive[q.seat] && q.seat !== w.guardLast).map((q) => q.seat);\n      if (!cands.length && w.guardLast != null && w.alive[w.guardLast]) cands = [w.guardLast];\n      g.botPlan[p.seat] = { at, target: cands.length ? pick(cands) : null };\n    } else if (role === 'tien-tri') {\n      const notes = w.seerNotes[p.seat] || {};\n      const cands = room.players.filter((q) => w.alive[q.seat] && q.seat !== p.seat && !(q.seat in notes)).map((q) => q.seat);\n      g.botPlan[p.seat] = { at, target: cands.length ? pick(cands) : null };\n    } else if (role === 'phu-thuy') {\n      g.botPlan[p.seat] = { at }; // decided live in stepWolf — she needs the victim first\n    }\n  });\n}\nfunction wolfBotVote(room, p) {\n  const g = room.game; const w = g.wolf;\n  const role = w.roles[p.seat];\n  const others = room.players.filter((q) => w.alive[q.seat] && q.seat !== p.seat).map((q) => q.seat);\n  if (!others.length) return null;\n  if (role === 'tien-tri') {\n    // The seer pushes a wolf they have SEEN — but only through the\n    // ballot box, never by claiming in chat (lines stay generic).\n    const notes = w.seerNotes[p.seat] || {};\n    const known = others.find((s) => notes[s] === true);\n    if (known != null) return known;\n    const uncleared = others.filter((s) => notes[s] !== false);\n    return pick(uncleared.length ? uncleared : others);\n  }\n  if (role === 'soi') {\n    const nonWolves = others.filter((s) => w.roles[s] !== 'soi');\n    if (p.difficulty === 'kho' && nonWolves.length) return pick(nonWolves);\n    if (p.difficulty === 'vua' && nonWolves.length && Math.random() < 0.8) return pick(nonWolves);\n    return pick(others);\n  }\n  return pick(others);\n}\nfunction stepWolf(room, t) {\n  const g = room.game; const w = g.wolf;\n  if (g.phase === 'night') {\n    room.players.forEach((p) => {\n      if (p.type !== 'bot' || !w.alive[p.seat]) return;\n      const plan = g.botPlan[p.seat];\n      if (!plan || plan.at > t || plan.done) return;\n      const role = w.roles[p.seat];\n      if (role === 'soi' && w.wolfVotes[p.seat] == null && plan.target != null) {\n        w.wolfVotes[p.seat] = plan.target; plan.done = true;\n      } else if (role === 'bao-ve' && w.guardPick == null && plan.target != null) {\n        w.guardPick = plan.target; plan.done = true;\n      } else if (role === 'tien-tri' && w.seerPick == null && plan.target != null) {\n        wolfSeerApply(room, p.seat, plan.target); plan.done = true;\n      } else if (role === 'phu-thuy' && !w.witch.done) {\n        if (!wolfWolvesIn(room)) return; // the witch wakes after the pack\n        const victim = wolfVictim(room);\n        const saveP = p.difficulty === 'kho' ? 0.8 : p.difficulty === 'vua' ? 0.55 : 0.3;\n        if (victim != null && w.saveLeft > 0 && Math.random() < saveP) w.witch.save = true;\n        const poisonP = p.difficulty === 'kho' ? 0.25 : p.difficulty === 'vua' ? 0.12 : 0.05;\n        if (w.poisonLeft > 0 && Math.random() < poisonP) {\n          const cands = room.players.filter((q) => w.alive[q.seat] && q.seat !== p.seat && q.seat !== victim).map((q) => q.seat);\n          if (cands.length) w.witch.poison = pick(cands);\n        }\n        w.witch.done = true; plan.done = true;\n      }\n    });\n    if (t >= g.endsAt || wolfAllIn(room)) { resolveWolfNight(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'dawn') {\n    if (t >= g.endsAt) { wolfEnterDiscuss(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'discuss') {\n    room.players.forEach((p) => {\n      if (p.type !== 'bot' || !w.alive[p.seat]) return;\n      const plan = g.botPlan[p.seat];\n      if (plan && !plan.chatted && plan.chatAt && plan.chatAt <= t) {\n        plan.chatted = true;\n        g.chatLog.push({ seat: p.seat, text: plan.chatLine, at: t });\n        if (g.chatLog.length > 40) g.chatLog = g.chatLog.slice(-40);\n      }\n    });\n    if (t >= g.endsAt) { wolfEnterVote(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'vote') {\n    room.players.forEach((p) => {\n      if (p.type !== 'bot' || !w.alive[p.seat]) return;\n      const plan = g.botPlan[p.seat];\n      if (plan && plan.voteAt && plan.voteAt <= t && g.votes[p.seat] == null && plan.vote != null) {\n        g.votes[p.seat] = plan.vote;\n      }\n    });\n    const allIn = room.players.every((p) => !w.alive[p.seat] || g.votes[p.seat] != null);\n    if (t >= g.endsAt || allIn) { resolveWolfVote(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'execute') {\n    if (t >= g.endsAt) { wolfNextNight(room, t); return true; }\n    return false;\n  }\n  if (g.phase === 'wolfEnd') {\n    if (t >= g.endsAt) { endGame(room); return true; }\n  }\n  return false;\n}\nfunction resolveWolfNight(room, t) {\n  const g = room.game; const w = g.wolf;\n  const victim = wolfVictim(room);\n  // Resolution order: the guard's protection and the witch's save\n  // both cancel the wolf kill; the witch's poison always kills\n  // (it slips past the guard and past a save spent on the victim).\n  const saved = victim != null && (w.guardPick === victim || (w.witch.done && w.witch.save));\n  const deaths = [];\n  if (victim != null && !saved) deaths.push({ seat: victim, cause: 'soi' });\n  if (w.witch.done && w.witch.poison != null && w.alive[w.witch.poison]\n    && !deaths.some((d) => d.seat === w.witch.poison)) {\n    deaths.push({ seat: w.witch.poison, cause: 'doc' });\n  }\n  if (w.witch.done) {\n    if (w.witch.save && victim != null) w.saveLeft = 0;\n    if (w.witch.poison != null) w.poisonLeft = 0;\n  }\n  w.guardLast = w.guardPick;\n  w.dawnDeaths = [];\n  deaths.forEach((d) => {\n    w.alive[d.seat] = false;\n    const rec = { seat: d.seat, role: w.roles[d.seat], cause: d.cause, night: g.round };\n    w.deaths.push(rec); w.dawnDeaths.push(rec);\n  });\n  const winner = wolfWinner(room);\n  if (winner) { finishWolf(room, winner, t); return; }\n  g.phase = 'dawn'; g.endsAt = t + WOLF_DAWN_MS;\n}\nfunction wolfEnterDiscuss(room, t) {\n  const g = room.game;\n  g.chatLog = [];\n  g.phase = 'discuss'; g.endsAt = t + WOLF_DISCUSS_MS;\n  g.botPlan = {};\n  room.players.forEach((p) => {\n    if (p.type !== 'bot' || !room.game.wolf.alive[p.seat]) return;\n    if (Math.random() < 0.75) {\n      g.botPlan[p.seat] = { chatAt: t + Math.round(rand(4000, 40000)), chatLine: pick(WOLF_CHAT_LINES), chatted: false };\n    }\n  });\n}\nfunction wolfEnterVote(room, t) {\n  const g = room.game;\n  g.votes = {};\n  g.phase = 'vote'; g.endsAt = t + WOLF_VOTE_MS;\n  g.botPlan = {};\n  room.players.forEach((p) => {\n    if (p.type !== 'bot' || !room.game.wolf.alive[p.seat]) return;\n    g.botPlan[p.seat] = { voteAt: t + Math.round(rand(3000, 20000)), vote: wolfBotVote(room, p) };\n  });\n}\nfunction resolveWolfVote(room, t) {\n  const g = room.game; const w = g.wolf;\n  const counts = {};\n  Object.keys(g.votes).forEach((s) => {\n    if (w.alive[+s] && w.alive[g.votes[s]]) counts[g.votes[s]] = (counts[g.votes[s]] || 0) + 1;\n  });\n  let top = null, topN = 0, tie = false;\n  Object.keys(counts).forEach((s) => {\n    const c = counts[s];\n    if (c > topN) { topN = c; top = +s; tie = false; }\n    else if (c === topN) tie = true;\n  });\n  w.voteTally = counts;\n  if (top != null && !tie && topN > 0) {\n    w.alive[top] = false;\n    w.deaths.push({ seat: top, role: w.roles[top], cause: 'treo', night: g.round });\n    w.exec = { seat: top, role: w.roles[top] };\n  } else {\n    w.exec = { seat: null, role: null };\n  }\n  const winner = wolfWinner(room);\n  if (winner) { finishWolf(room, winner, t); return; }\n  g.phase = 'execute'; g.endsAt = t + WOLF_EXEC_MS;\n}\nfunction wolfNextNight(room, t) {\n  const g = room.game; const w = g.wolf;\n  g.round += 1;\n  w.wolfVotes = {}; w.guardPick = null; w.seerPick = null;\n  w.witch = { save: false, poison: null, done: false };\n  w.dawnDeaths = []; w.exec = null; w.voteTally = null;\n  g.votes = {}; g.inputs = {};\n  g.phase = 'night'; g.endsAt = t + WOLF_NIGHT_MS;\n  wolfPlanNight(room, t);\n}\nfunction finishWolf(room, winner, t) {\n  const g = room.game; const w = g.wolf;\n  w.winner = winner;\n  const entries = room.players.map((p) => {\n    const isWolf = w.roles[p.seat] === 'soi';\n    const won = (winner === 'soi') === isWolf;\n    const pts = won ? (isWolf ? 300 : 200) : 50;\n    g.points[p.seat] = pts;\n    return { seat: p.seat, points: pts, role: w.roles[p.seat] };\n  });\n  g.lastRound = { round: g.round, entries };\n  finishTimedRound(room, 'wolfEnd', t + WOLF_END_MS);\n}\n\n// --- Game: Cờ Cá Ngựa (Vietnamese Ludo) -------------------------------------\nfunction nguaLegal(room, seat, dice) {\n  const horses = room.game.ng.horses[seat];\n  const out = [];\n  horses.forEach((p, h) => {\n    if (p === 0) { if (dice === 6) out.push(h); }\n    else if (p + dice <= 58) out.push(h);\n  });\n  return out;\n}\nfunction nguaProgress(room, seat) {\n  const horses = room.game.ng.horses[seat];\n  return horses.filter((p) => p === 58).length * 100 + horses.reduce((a, b) => a + b, 0);\n}\nfunction nguaCellOf(room, seat, p) {\n  if (p < 1 || p > 51) return null;\n  return (NGUA_OFFSETS[room.game.ng.boards[seat]] + p - 1) % 52;\n}\nfunction nguaLog(room, text) {\n  const ng = room.game.ng;\n  ng.log.push(text);\n  if (ng.log.length > 6) ng.log = ng.log.slice(-6);\n}\nfunction nguaRoll(room, t) {\n  const g = room.game; const ng = g.ng;\n  const seat = ng.turn;\n  const dice = randInt(1, 6);\n  ng.dice = dice;\n  if (dice === 6) ng.chain += 1; else ng.chain = 0;\n  // Three consecutive sixes: the third roll is forfeited outright.\n  ng.legal = ng.chain >= 3 ? [] : nguaLegal(room, seat, dice);\n  if (ng.chain >= 3) nguaLog(room, playerAt(room, seat).name + ' thảy 6 ba lần liên tiếp — mất lượt!');\n  g.phase = 'pick';\n  ng.autoAt = t + (playerAt(room, seat).type === 'bot' ? NGUA_BOT_MS : NGUA_BEAT_MS);\n  g.endsAt = t + NGUA_TURN_MS;\n  return dice;\n}\nfunction nguaMove(room, seat, h, t) {\n  const g = room.game; const ng = g.ng;\n  const me = playerAt(room, seat);\n  const dice = ng.dice;\n  const from = ng.horses[seat][h];\n  const to = from === 0 ? 1 : from + dice;\n  ng.horses[seat][h] = to;\n  const kicked = [];\n  const cell = nguaCellOf(room, seat, to);\n  if (cell != null && !NGUA_SAFE.has(cell)) {\n    room.players.forEach((q) => {\n      if (q.seat === seat) return;\n      ng.horses[q.seat].forEach((qp, qh) => {\n        if (nguaCellOf(room, q.seat, qp) === cell) {\n          ng.horses[q.seat][qh] = 0;\n          if (kicked.indexOf(q.seat) < 0) kicked.push(q.seat);\n        }\n      });\n    });\n  }\n  ng.last = { seat, dice, horse: h, from, to, kicked, at: t };\n  let text = me.name + ' thảy ' + dice + ': ngựa ' + (h + 1);\n  if (from === 0) text += ' xuất chuồng';\n  else if (to === 58) text += ' VỀ CHUỒNG ĐÍCH!';\n  else text += ' đi tới ô ' + to;\n  kicked.forEach((ks) => { text += ' · ĐÁ NGỰA của ' + playerAt(room, ks).name + '!'; });\n  nguaLog(room, text);\n  if (ng.horses[seat].every((p) => p === 58)) { finishNgua(room, seat, t); return; }\n  if (dice === 6) {\n    // A six earns another roll (chain < 3 is guaranteed: a third\n    // consecutive six never reaches the move step at all).\n    g.phase = 'roll'; ng.dice = null; ng.legal = [];\n    ng.actAt = t + NGUA_BOT_MS; g.endsAt = t + NGUA_TURN_MS;\n  } else {\n    nguaEndTurn(room, t);\n  }\n}\nfunction nguaEndTurn(room, t) {\n  const g = room.game; const ng = g.ng;\n  const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);\n  ng.turn = seats[(seats.indexOf(ng.turn) + 1) % seats.length];\n  ng.chain = 0; ng.dice = null; ng.legal = [];\n  g.phase = 'roll'; ng.actAt = t + NGUA_BOT_MS; g.endsAt = t + NGUA_TURN_MS;\n}\nfunction nguaBotPick(room, seat) {\n  const g = room.game; const ng = g.ng;\n  const p = playerAt(room, seat);\n  const legal = ng.legal.slice();\n  if (!legal.length) return null;\n  const blunder = p.difficulty === 'de' ? 0.35 : p.difficulty === 'vua' ? 0.15 : 0.05;\n  if (Math.random() < blunder) return pick(legal);\n  const dice = ng.dice;\n  let best = legal[0], bestScore = -1;\n  legal.forEach((h) => {\n    const from = ng.horses[seat][h];\n    const to = from === 0 ? 1 : from + dice;\n    let score;\n    if (to === 58) score = 100;                       // bring a horse home\n    else if (from === 0) score = 80;                  // leave the stable\n    else {\n      const cell = nguaCellOf(room, seat, to);\n      let kicks = false;\n      if (cell != null && !NGUA_SAFE.has(cell)) {\n        room.players.forEach((q) => {\n          if (q.seat === seat) return;\n          if (ng.horses[q.seat].some((qp) => nguaCellOf(room, q.seat, qp) === cell)) kicks = true;\n        });\n      }\n      score = kicks ? 90 : 10 + to;                   // kick, else advance the leader\n    }\n    if (score > bestScore) { bestScore = score; best = h; }\n  });\n  return best;\n}\nfunction nguaHint(room, seat, h) {\n  const g = room.game; const ng = g.ng;\n  const from = ng.horses[seat][h];\n  const dice = ng.dice;\n  const to = from === 0 ? 1 : from + dice;\n  if (from === 0) return 'Xuất chuồng';\n  if (to === 58) return 'Về chuồng đích!';\n  if (to >= 52) return 'Vào đường về chuồng (' + (to - 51) + '/6)';\n  const cell = nguaCellOf(room, seat, to);\n  if (cell != null && !NGUA_SAFE.has(cell)) {\n    let kickName = null;\n    room.players.forEach((q) => {\n      if (q.seat === seat) return;\n      if (ng.horses[q.seat].some((qp) => nguaCellOf(room, q.seat, qp) === cell)) kickName = q.name;\n    });\n    if (kickName) return 'ĐÁ NGỰA của ' + kickName + '!';\n    return 'Đi ' + dice + ' ô';\n  }\n  return 'Về ô an toàn';\n}\nfunction stepNgua(room, t) {\n  const g = room.game; const ng = g.ng;\n  if (g.phase === 'ngWin') {\n    if (t >= g.endsAt) { endGame(room); return true; }\n    return false;\n  }\n  if (g.phase === 'roll') {\n    const cur = playerAt(room, ng.turn);\n    if (cur && cur.type === 'bot' && t >= ng.actAt) { nguaRoll(room, t); return true; }\n    if (t >= g.endsAt) { nguaRoll(room, t); return true; } // idle human: the server rolls for them\n    return false;\n  }\n  if (g.phase === 'pick') {\n    if (!ng.legal.length) {\n      if (t >= ng.autoAt) { nguaEndTurn(room, t); return true; }\n      return false;\n    }\n    const cur = playerAt(room, ng.turn);\n    if (cur && cur.type === 'bot' && t >= ng.autoAt) {\n      const h = nguaBotPick(room, ng.turn);\n      if (h != null) nguaMove(room, ng.turn, h, t);\n      return true;\n    }\n    if (t >= g.endsAt) { nguaMove(room, ng.turn, pick(ng.legal), t); return true; } // timeout: a random legal move\n    return false;\n  }\n  return false;\n}\nfunction finishNgua(room, winnerSeat, t) {\n  const g = room.game; const ng = g.ng;\n  ng.winner = winnerSeat;\n  const ranking = room.players.slice().sort((a, b) => {\n    if (a.seat === winnerSeat) return -1;\n    if (b.seat === winnerSeat) return 1;\n    return (nguaProgress(room, b.seat) - nguaProgress(room, a.seat)) || (a.seat - b.seat);\n  });\n  const entries = ranking.map((p, i) => ({ seat: p.seat, points: placementAt(i), progress: nguaProgress(room, p.seat) }));\n  entries.forEach((e) => { g.points[e.seat] = e.points; });\n  g.lastRound = { round: 1, entries };\n  finishTimedRound(room, 'ngWin', t + NGUA_WIN_MS);\n}\n\n// --- Game: Tiến Lên Miền Nam (Vietnamese Thirteen) --------------------------\n// Cards are ids 0..51: rankValue r = id % 13 maps to the ranks\n// 3,4,5,6,7,8,9,10,J,Q,K,A,2 (2 is highest, r = 12); suit\n// s = floor(id / 13) runs ♠ ♣ ♦ ♥ (♥ highest). Strength compares rank\n// first, then suit, so r * 4 + s orders any two cards with one number.\nconst TL_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];\nconst TL_SUITS = ['♠', '♣', '♦', '♥'];\nfunction tlRank(id) { return id % 13; }\nfunction tlSuit(id) { return Math.floor(id / 13); }\nfunction tlStrength(id) { return tlRank(id) * 4 + tlSuit(id); }\nfunction tlLabel(id) { return TL_RANKS[tlRank(id)] + TL_SUITS[tlSuit(id)]; }\nfunction tlSort(ids) { return ids.slice().sort((a, b) => tlStrength(a) - tlStrength(b)); }\nfunction tlComboOf(cards) {\n  if (!Array.isArray(cards) || cards.length === 0) return null;\n  const seen = new Set();\n  for (const c of cards) {\n    if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return null;\n    seen.add(c);\n  }\n  const cs = tlSort(cards);\n  const n = cs.length;\n  const counts = {};\n  cs.forEach((c) => { const r = tlRank(c); counts[r] = (counts[r] || 0) + 1; });\n  const distinct = Object.keys(counts).map(Number).sort((a, b) => a - b);\n  const top = cs[n - 1];\n  // (cards ride along so the exported TL.beats can recompute a table\n  // combo's tier from them; g.tl.table stores only the contracted\n  // fields and carries the same cards.)\n  if (distinct.length === 1) {\n    if (n === 1) return { kind: 'single', len: 1, top, tier: 0, cards: cs };\n    if (n === 2) return { kind: 'pair', len: 2, top, tier: 0, cards: cs };\n    if (n === 3) return { kind: 'triple', len: 3, top, tier: 0, cards: cs };\n    if (n === 4) return { kind: 'quad', len: 4, top, tier: 2, cards: cs };\n    return null;\n  }\n  const consecutive = distinct[distinct.length - 1] - distinct[0] === distinct.length - 1;\n  if (!consecutive || distinct[distinct.length - 1] > 11) return null;\n  if (n >= 3 && distinct.length === n) return { kind: 'seq', len: n, top, tier: 0, cards: cs };\n  if (n % 2 === 0 && n >= 6 && distinct.every((r) => counts[r] === 2)) {\n    const pairs = n / 2;\n    return { kind: 'dseq', len: n, top, tier: pairs === 3 ? 1 : 3, cards: cs };\n  }\n  return null;\n}\n// Can `play` (a comboOf result) be laid over `table` (the stored\n// {seat, cards, kind, len, top} or null)? Ordinary plays must match\n// kind AND card count with a strictly higher top card. Bombs (quad,\n// double sequences) additionally chop 2s and lower bombs: tiers run\n// dseq-3 = 1, quad = 2, dseq-4+ = 3; a single 2 falls to any bomb, a\n// pair of 2s only to tier >= 2; a bomb never chops anything else.\nfunction tlBeats(play, table) {\n  if (!play) return false;\n  if (!table) return true;\n  const tc = tlComboOf(table.cards);\n  if (!tc) return false;\n  const pBomb = play.tier > 0, tBomb = tc.tier > 0;\n  if (pBomb && tBomb) {\n    if (play.tier !== tc.tier) return play.tier > tc.tier;\n    if (play.kind !== tc.kind) return false;\n    if (play.kind === 'dseq' && play.len !== tc.len) return play.len > tc.len;\n    return tlStrength(play.top) > tlStrength(tc.top);\n  }\n  if (pBomb) {\n    if (tc.kind === 'single' && tlRank(tc.top) === 12) return true;\n    if (tc.kind === 'pair' && tlRank(tc.top) === 12) return play.tier >= 2;\n    return false;\n  }\n  if (tBomb) return false;\n  if (play.kind !== tc.kind || play.len !== tc.len) return false;\n  return tlStrength(play.top) > tlStrength(tc.top);\n}\n// Tới trắng — an unbeatable dealt hand. Returns the kind key or null.\nfunction tlInstantWin(hand) {\n  const counts = {};\n  hand.forEach((c) => { const r = tlRank(c); counts[r] = (counts[r] || 0) + 1; });\n  let dragon = true;\n  for (let r = 0; r <= 11; r++) if (!counts[r]) { dragon = false; break; }\n  if (dragon) return 'dragon';\n  let pairs = 0;\n  for (let r = 0; r <= 12; r++) if ((counts[r] || 0) >= 2) pairs += 1;\n  if (pairs >= 6) return 'sixpairs';\n  if (counts[0] === 4) return 'quad3';\n  for (let r = 0; r + 3 <= 11; r++) {\n    if ((counts[r] || 0) >= 2 && (counts[r + 1] || 0) >= 2 && (counts[r + 2] || 0) >= 2 && (counts[r + 3] || 0) >= 2) return 'dseq4';\n  }\n  return null;\n}\nconst TL = { comboOf: tlComboOf, beats: tlBeats, instantWin: tlInstantWin };\nfunction tlComboName(combo) {\n  if (!combo) return '';\n  if (combo.kind === 'single') return 'lá ' + tlLabel(combo.top);\n  if (combo.kind === 'pair') return 'Đôi ' + TL_RANKS[tlRank(combo.top)];\n  if (combo.kind === 'triple') return 'Ba ' + TL_RANKS[tlRank(combo.top)];\n  if (combo.kind === 'quad') return 'Tứ quý ' + TL_RANKS[tlRank(combo.top)];\n  if (combo.kind === 'seq') return 'Sảnh ' + combo.len + ' lá';\n  if (combo.kind === 'dseq') return (combo.len / 2) + ' đôi thông';\n  return '';\n}\nfunction tlLog(room, text) {\n  const tl = room.game.tl;\n  tl.log.push(text);\n  if (tl.log.length > 8) tl.log = tl.log.slice(-8);\n}\nfunction tlSeats(room) { return room.players.map((p) => p.seat).sort((a, b) => a - b); }\nfunction tlActive(room, seat) { return room.game.tl.finished.indexOf(seat) < 0; }\nfunction tlNextActive(room, fromSeat) {\n  const seats = tlSeats(room);\n  const i = seats.indexOf(fromSeat);\n  for (let k = 1; k <= seats.length; k++) {\n    const s = seats[(i + k) % seats.length];\n    if (tlActive(room, s)) return s;\n  }\n  return fromSeat;\n}\nfunction tlArmTurn(room, t) {\n  const g = room.game; const tl = g.tl;\n  tl.turnEndsAt = t + TL_TURN_MS; tl.actAt = t + TL_BOT_MS; g.endsAt = tl.turnEndsAt;\n}\n// After any play or pass: close the trick when every other active\n// player has passed (the last play maker leads again — or the next\n// active player after them, if that play finished them); otherwise\n// hand the turn to the next active player who has not passed.\nfunction tlCloseOrAdvance(room, t) {\n  const tl = room.game.tl;\n  const holder = tl.table ? tl.table.seat : tl.leader;\n  const others = tlSeats(room).filter((s) => s !== holder && tlActive(room, s));\n  if (tl.table && others.every((s) => tl.passed[s])) {\n    tl.table = null; tl.passed = {};\n    tl.turn = tlActive(room, holder) ? holder : tlNextActive(room, holder);\n    tl.leader = tl.turn;\n  } else {\n    const seats = tlSeats(room);\n    const i = seats.indexOf(tl.turn);\n    let nxt = null;\n    for (let k = 1; k <= seats.length; k++) {\n      const s = seats[(i + k) % seats.length];\n      if (s !== holder && tlActive(room, s) && !tl.passed[s]) { nxt = s; break; }\n    }\n    tl.turn = nxt != null ? nxt : holder;\n  }\n  tlArmTurn(room, t);\n}\nfunction tlPlayCards(room, seat, cards, t) {\n  const g = room.game; const tl = g.tl;\n  const combo = tlComboOf(cards);\n  tl.hands[seat] = tl.hands[seat].filter((c) => cards.indexOf(c) < 0);\n  tl.table = { seat, cards: tlSort(cards), kind: combo.kind, len: combo.len, top: combo.top };\n  tl.leader = seat;\n  tl.firstPlay = false;\n  tlLog(room, playerAt(room, seat).name + ' đánh ' + tlComboName(combo));\n  if (tl.hands[seat].length === 0 && tl.finished.indexOf(seat) < 0) {\n    tl.finished.push(seat);\n    tlLog(room, playerAt(room, seat).name + ' HẾT BÀI — về hạng ' + tl.finished.length + '!');\n  }\n  const activeLeft = tlSeats(room).filter((s) => tlActive(room, s));\n  if (activeLeft.length === 1) {\n    tl.finished.push(activeLeft[0]);\n    finishTienLen(room, t);\n    return;\n  }\n  tlCloseOrAdvance(room, t);\n}\nfunction tlPassTurn(room, seat, t) {\n  const tl = room.game.tl;\n  tl.passed[seat] = true;\n  tlLog(room, playerAt(room, seat).name + ' bỏ lượt');\n  tlCloseOrAdvance(room, t);\n}\nfunction finishTienLen(room, t) {\n  const g = room.game; const tl = g.tl;\n  tl.winner = tl.finished[0];\n  const entries = tl.finished.map((s, i) => ({ seat: s, points: placementAt(i) }));\n  entries.forEach((e) => { g.points[e.seat] = e.points; });\n  g.lastRound = { round: 1, entries };\n  finishTimedRound(room, 'tlWin', t + TL_WIN_MS);\n}\nfunction tlTimeout(room, t) {\n  const tl = room.game.tl;\n  const seat = tl.turn;\n  if (!tl.table) {\n    // Must lead: the server plays the lowest single. For the 3♠\n    // holder that lowest card IS card 0 (hands sort by rank, suit),\n    // so the first-play rule satisfies itself.\n    const lead = tl.firstPlay && tl.hands[seat].indexOf(0) >= 0 ? [0] : [tl.hands[seat][0]];\n    tlPlayCards(room, seat, lead, t);\n  } else {\n    tlPassTurn(room, seat, t);\n  }\n}\nfunction stepTienLen(room, t) {\n  const g = room.game; const tl = g.tl;\n  if (g.phase === 'tlWin') {\n    if (t >= g.endsAt) { endGame(room); return true; }\n    return false;\n  }\n  if (g.phase !== 'cards' || !tl) return false;\n  const cur = playerAt(room, tl.turn);\n  if (cur && cur.type === 'bot' && t >= tl.actAt) { tlBotTurn(room, t); return true; }\n  if (t >= tl.turnEndsAt) { tlTimeout(room, t); return true; }\n  return false;\n}\n// --- Tiến Lên bots -----------------------------------------------------------\n// Candidates are enumerated from the hand: every suit subset of each\n// rank group (single/pair/triple/quad in every suit flavour), plus two\n// suit variants — cheapest and strongest-top — of every sequence and\n// double-sequence window. Beats() then filters what may be played.\nfunction tlRankGroups(hand) {\n  const byRank = {};\n  hand.forEach((c) => { const r = tlRank(c); (byRank[r] = byRank[r] || []).push(c); });\n  Object.keys(byRank).forEach((r) => byRank[r].sort((a, b) => tlSuit(a) - tlSuit(b)));\n  return byRank;\n}\nfunction tlSubsets(arr) {\n  const out = [];\n  for (let mask = 1; mask < (1 << arr.length); mask++) {\n    const sub = [];\n    for (let i = 0; i < arr.length; i++) if (mask & (1 << i)) sub.push(arr[i]);\n    out.push(sub);\n  }\n  return out;\n}\nfunction tlCombosOf(hand) {\n  const byRank = tlRankGroups(hand);\n  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);\n  const out = [];\n  const seen = new Set();\n  function push(cards) {\n    const sorted = tlSort(cards);\n    const key = sorted.join(',');\n    if (seen.has(key)) return;\n    const combo = tlComboOf(sorted);\n    if (!combo) return;\n    seen.add(key);\n    out.push({ cards: sorted, combo });\n  }\n  ranks.forEach((r) => { tlSubsets(byRank[r]).forEach(push); });\n  for (let a = 0; a <= 11; a++) {\n    for (let b = a + 2; b <= 11; b++) {\n      const win = [];\n      for (let r = a; r <= b; r++) win.push(r);\n      if (win.every((r) => byRank[r])) {\n        push(win.map((r) => byRank[r][0]));\n        push(win.map((r) => (r === b ? byRank[r][byRank[r].length - 1] : byRank[r][0])));\n      }\n      if (win.every((r) => (byRank[r] || []).length >= 2)) {\n        const cheap = []; win.forEach((r) => { cheap.push(byRank[r][0], byRank[r][1]); });\n        push(cheap);\n        const strong = [];\n        win.forEach((r) => {\n          if (r === b) { const gr = byRank[r]; strong.push(gr[gr.length - 2], gr[gr.length - 1]); }\n          else strong.push(byRank[r][0], byRank[r][1]);\n        });\n        push(strong);\n      }\n    }\n  }\n  return out;\n}\n// A candidate \"breaks a bomb\" when it spends some — but not all — of\n// a held quad's cards, or pair-cards of a held double-sequence run,\n// without being that bomb itself. Vừa/Khó sort such candidates last:\n// a human guards their hàng the same way.\nfunction tlBreaksBomb(hand, candCards) {\n  const byRank = tlRankGroups(hand);\n  const cand = new Set(candCards);\n  const ranks = Object.keys(byRank).map(Number);\n  for (const r of ranks) {\n    if (byRank[r].length === 4) {\n      const used = byRank[r].filter((c) => cand.has(c)).length;\n      if (used > 0 && used < 4) return true;\n    }\n  }\n  const pairRanks = ranks.filter((r) => byRank[r].length >= 2 && r <= 11).sort((a, b) => a - b);\n  let run = [];\n  const runs = [];\n  pairRanks.forEach((r) => {\n    if (run.length && r === run[run.length - 1] + 1) run.push(r);\n    else { if (run.length >= 3) runs.push(run); run = [r]; }\n  });\n  if (run.length >= 3) runs.push(run);\n  for (const rn of runs) {\n    const bombCards = [];\n    rn.forEach((r) => { bombCards.push(byRank[r][0], byRank[r][1]); });\n    const used = bombCards.filter((c) => cand.has(c)).length;\n    if (used > 0 && used < bombCards.length) return true;\n  }\n  return false;\n}\nfunction tlBotFollow(room, seat, diff) {\n  const tl = room.game.tl;\n  const hand = tl.hands[seat];\n  const beaters = tlCombosOf(hand).filter((c) => tlBeats(c.combo, tl.table));\n  if (!beaters.length) return null;\n  const nonBombs = beaters.filter((c) => c.combo.tier === 0);\n  if (diff === 'de') {\n    if (Math.random() < 0.25) return null;\n    return pick(nonBombs.length ? nonBombs : beaters);\n  }\n  const key = (c) => (tlBreaksBomb(hand, c.cards) ? 1000000 : 0) + tlStrength(c.combo.top);\n  if (diff === 'vua') return beaters.slice().sort((a, b) => key(a) - key(b))[0];\n  // kho: cheapest ordinary beater first; bombs are a last resort with\n  // discipline (see TIEN_LEN_NOTES.md).\n  if (nonBombs.length) return nonBombs.slice().sort((a, b) => key(a) - key(b))[0];\n  const tableCount = tl.hands[tl.table.seat].length;\n  const isTwo = tlRank(tl.table.top) === 12 && (tl.table.kind === 'single' || tl.table.kind === 'pair');\n  if (isTwo) {\n    if (hand.length <= 6 || tableCount <= 2) {\n      return beaters.slice().sort((a, b) => (a.combo.tier - b.combo.tier) || (tlStrength(a.combo.top) - tlStrength(b.combo.top)))[0];\n    }\n    return null;\n  }\n  if (hand.length <= 4 || tableCount <= 2) return beaters.slice().sort((a, b) => key(a) - key(b))[0];\n  return null;\n}\nfunction tlBotLead(room, seat, diff) {\n  const tl = room.game.tl;\n  const hand = tl.hands[seat];\n  let all = tlCombosOf(hand);\n  if (tl.firstPlay) all = all.filter((c) => c.cards.indexOf(0) >= 0);\n  if (!all.length) return null;\n  if (diff === 'de') return pick(all);\n  const twoLead = (c) => (tlRank(c.combo.top) === 12 && (c.combo.kind === 'single' || c.combo.kind === 'pair')) ? 1 : 0;\n  return all.slice().sort((a, b) =>\n    (twoLead(a) - twoLead(b)) || (b.cards.length - a.cards.length) || (tlStrength(a.combo.top) - tlStrength(b.combo.top)))[0];\n}\nfunction tlBotTurn(room, t) {\n  const tl = room.game.tl;\n  const seat = tl.turn;\n  const p = playerAt(room, seat);\n  if (!p || p.type !== 'bot') return;\n  const chosen = tl.table ? tlBotFollow(room, seat, p.difficulty) : tlBotLead(room, seat, p.difficulty);\n  if (chosen) tlPlayCards(room, seat, chosen.cards, t);\n  else tlPassTurn(room, seat, t);\n}\n\n// --- Game 20: Thủ Thành (COOP tick arena defence) --------------------------\n// Slimes spawn at the rim and march straight at the crystal; players\n// shoot them with the shared shell sim. Surviving DEF_MS pays the tier\n// of the crystal's remaining HP; losing the crystal ends the game at\n// once with the participation tier. Team score = slimes destroyed.\nfunction stepDefend(room, t) {\n  const g = room.game;\n  if (g.phase !== 'defend') return false;\n  if (t >= g.endsAt) { finishCoop(room, g.kills, coopTier(g.crystal.hp, DEF_TIERS), 'slime bị hạ'); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'defend') {\n      simulateDefendTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction simulateDefendTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const moves = collectMoves(room, botBrainDefend);\n  moveBlobsWalled(room, moves, null, 0);\n  separateBlobs(room);\n  processGuns(room, moves);\n  stepShells(room, { hitSlimes: true });\n  if (g.slimes.some((sl) => sl.dead)) g.slimes = g.slimes.filter((sl) => !sl.dead);\n  // Waves: spawn interval ramps 24 -> 10 ticks across the minute;\n  // bigger, slower 3-HP slimes join from the 20 second mark.\n  g.spawnIn -= 1;\n  if (g.spawnIn <= 0) {\n    // 16:9 wave: slimes pour in from the wide field's rim — a point on\n    // the spawn ellipse (the old 10.6 circle under the field map), so\n    // they arrive along every edge; speeds scale ~x1.1 so the average\n    // march time to the crystal matches the old game's.\n    const ang = rand(0, Math.PI * 2);\n    const big = g.tickCount >= 320 && Math.random() < 0.3;\n    g.slimeSeq += 1;\n    g.slimes.push({\n      id: g.slimeSeq,\n      x: Math.round(Math.cos(ang) * 10.6 * (4 / 3) * 100) / 100, y: Math.round(Math.sin(ang) * 10.6 * (3 / 4) * 100) / 100,\n      hp: big ? 3 : 1, maxHp: big ? 3 : 1, r: big ? 1.05 : 0.7, speed: big ? 0.045 : 0.07, big,\n    });\n    g.spawnIn = Math.max(20, Math.round(48 - 28 * (g.tickCount / (DEF_MS / TICK_MS))));\n  }\n  let crystalDown = false;\n  g.slimes.forEach((sl) => {\n    const d = Math.hypot(sl.x, sl.y) || 1;\n    sl.vx = -(sl.x / d) * sl.speed; sl.vy = -(sl.y / d) * sl.speed;\n    sl.x += sl.vx; sl.y += sl.vy;\n    if (Math.hypot(sl.x, sl.y) <= 1.35) {\n      sl.dead = true;\n      g.crystal.hp -= 1;\n      if (g.crystal.hp <= 0) crystalDown = true;\n    }\n  });\n  if (g.slimes.some((sl) => sl.dead)) g.slimes = g.slimes.filter((sl) => !sl.dead);\n  snapshotPad(room);\n  if (crystalDown) finishCoop(room, g.kills, 'none', 'slime bị hạ');\n}\nfunction botBrainDefend(room, p) {\n  const g = room.game;\n  const cached = cachedIntent(room, p);\n  if (cached) return cached;\n  const me = g.blobs[p.seat];\n  let sl = null, sd = 1e9;\n  (g.slimes || []).forEach((s) => {\n    const d = Math.hypot(s.x - me.x, s.y - me.y);\n    if (d < sd) { sd = d; sl = s; }\n  });\n  let tx = 0, ty = 0, burst = false;\n  if (sl) {\n    tx = sl.x - me.x; ty = sl.y - me.y;\n    const f = g.facing[p.seat] || { x: 1, y: 0 };\n    const dd = Math.hypot(tx, ty) || 1;\n    if ((tx / dd) * f.x + (ty / dd) * f.y > 0.92 && sd < 12) burst = true;\n    if (sd < 2.4) { tx = -tx; ty = -ty; }\n  } else { tx = -me.x; ty = -me.y; }\n  const intent = Object.assign(dirIntent(tx, ty), { burst });\n  g.botIntent[p.seat] = intent;\n  return intent;\n}\n\n// --- Game 21: Giải Mã Chung (COOP phase puzzle) ----------------------------\n// A level deals a secret step sequence round-robin across the seats;\n// only the owner's phone lists their steps. A press is right iff the\n// presser owns the current step AND the symbol matches; anything else\n// costs the team a heart. Bots press their own step correctly ~800ms\n// after it becomes current and never press otherwise.\nfunction startDecodeLevel(room, t) {\n  const g = room.game;\n  g.level += 1;\n  const len = Math.min(3 + g.level - 1, 7);\n  const seats = room.players.map((p) => p.seat).sort((x, y) => x - y);\n  const startIdx = randInt(0, seats.length - 1);\n  g.seq = [];\n  for (let i = 0; i < len; i++) g.seq.push({ seat: seats[(startIdx + i) % seats.length], sym: randInt(0, 3) });\n  g.stepIdx = 0;\n  decodeArmBot(room, t);\n}\nfunction decodeArmBot(room, t) {\n  const g = room.game;\n  g.botPressAt = 0;\n  const step = g.seq && g.seq[g.stepIdx];\n  if (!step) return;\n  const p = playerAt(room, step.seat);\n  if (p && p.type === 'bot') g.botPressAt = t + 800;\n}\nfunction decodePress(room, seat, sym, t) {\n  const g = room.game;\n  if (g.phase !== 'decode') return;\n  const step = g.seq && g.seq[g.stepIdx];\n  if (!step) return;\n  if (seat === step.seat && sym === step.sym) {\n    g.stepIdx += 1;\n    if (g.stepIdx >= g.seq.length) {\n      g.levelsDone = g.level;\n      g.phase = 'levelup';\n      g.decodeAt = t + 1500;\n    } else decodeArmBot(room, t);\n  } else {\n    g.hearts -= 1;\n    if (g.hearts <= 0) finishCoop(room, g.levelsDone, coopTier(g.levelsDone, DECODE_TIERS), 'màn đã qua');\n  }\n}\nfunction stepDecode(room, t) {\n  const g = room.game;\n  if (g.phase === 'decode') {\n    if (t >= g.endsAt) { finishCoop(room, g.levelsDone, coopTier(g.levelsDone, DECODE_TIERS), 'màn đã qua'); return true; }\n    const step = g.seq && g.seq[g.stepIdx];\n    if (step && g.botPressAt && t >= g.botPressAt) {\n      g.botPressAt = 0;\n      decodePress(room, step.seat, step.sym, t);\n      return true;\n    }\n    return false;\n  }\n  if (g.phase === 'levelup') {\n    if (t >= g.endsAt) { finishCoop(room, g.levelsDone, coopTier(g.levelsDone, DECODE_TIERS), 'màn đã qua'); return true; }\n    if (t >= g.decodeAt) { g.phase = 'decode'; startDecodeLevel(room, t); return true; }\n  }\n  return false;\n}\n\n// ---------------------------------------------------------------------------\n// Wave 4: platformers — one shared physics helper, then the two games.\n// ---------------------------------------------------------------------------\n// platStep moves ONE centre-anchored AABB entity (half extents\n// PLAT_HW x PLAT_HH, fields {x, y, vx, vy, ground}) through a list of\n// top-left rect solids. Gravity is applied first, then the axes are\n// integrated and resolved SEPARATELY — X against solid sides, Y\n// against tops/bottoms — so characters slide along walls and land\n// cleanly on ledges. A solid flagged oneWay only catches a falling\n// entity whose feet were at/above its top before the Y move; jumping\n// up through it is free (the fighter stage's floaters).\nfunction platOverlap(e, s) {\n  return e.x - PLAT_HW < s.x + s.w && e.x + PLAT_HW > s.x\n    && e.y - PLAT_HH < s.y + s.h && e.y + PLAT_HH > s.y;\n}\nfunction platStep(e, solids, grav, maxFall) {\n  e.vy = Math.min(maxFall, e.vy + grav);\n  e.x += e.vx;\n  for (const s of solids) {\n    if (s.oneWay) continue;\n    if (!platOverlap(e, s)) continue;\n    if (e.vx > 0) e.x = s.x - PLAT_HW;\n    else if (e.vx < 0) e.x = s.x + s.w + PLAT_HW;\n    else {\n      // No horizontal motion but already inside (a gate slab closed\n      // onto the entity): leave by the shorter side, never stay buried.\n      const dl = (e.x + PLAT_HW) - s.x, dr = (s.x + s.w) - (e.x - PLAT_HW);\n      e.x = dl < dr ? s.x - PLAT_HW : s.x + s.w + PLAT_HW;\n    }\n    e.vx = 0;\n  }\n  const prevFeet = e.y + PLAT_HH;\n  e.y += e.vy;\n  e.ground = false;\n  for (const s of solids) {\n    if (!platOverlap(e, s)) continue;\n    if (e.vy >= 0 && prevFeet <= s.y + 0.05) { e.y = s.y - PLAT_HH; e.vy = 0; e.ground = true; }\n    else if (e.vy < 0 && !s.oneWay) { e.y = s.y + s.h + PLAT_HH; e.vy = 0; }\n  }\n}\n\n// --- Game 22: Người Que Đại Chiến (versus platform fighter) -------------\n// Stick fighters on an open stage: run, double jump, dash, and a melee\n// swing whose knockback scales with the VICTIM's damage %. Blast\n// bounds on every side (past |x| 13, below y 12.5, above y -15) cost a\n// life; the last fighter standing wins, and at the 90s cap the ranking\n// is lives first, then LOWEST damage. Placement 300/200/100/50 once.\nfunction stepFight(room, t) {\n  const g = room.game;\n  if (g.phase !== 'fight') return false;\n  if (t >= g.endsAt) { finishFight(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'fight') {\n      simulateFightTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction fightIntent(room, p) {\n  const g = room.game;\n  if (p.type === 'human') {\n    const pad = g.pad[p.seat] || {};\n    const prev = g.padPrev[p.seat] || {};\n    return {\n      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),\n      jump: (!!pad.u && !prev.u) || (!!pad.y && !prev.y),\n      atk: !!pad.a && !prev.a,\n      hvy: !!pad.x && !prev.x,\n      dash: !!pad.b && !prev.b,\n    };\n  }\n  return botBrainFight(room, p);\n}\n// One melee swing from `seat`: the arc reaches FIGHT reach in the\n// facing direction and a full body height up/down, same test either\n// way. A heavy swing adds FIGHT_HVY_DMG instead of FIGHT_DMG and\n// multiplies the knockback force (computed AFTER the damage lands,\n// exactly like a normal hit) by 1.5.\nfunction fightSwing(room, seat, heavy) {\n  const g = room.game;\n  const b = g.blobs[seat];\n  const face = g.face[seat] || 1;\n  room.players.forEach((q) => {\n    if (q.seat === seat) return;\n    const qb = g.blobs[q.seat];\n    if (!qb || !qb.alive || (g.invuln[q.seat] || 0) > 0) return;\n    const dx = qb.x - b.x, dy = qb.y - b.y;\n    if (Math.abs(dy) > 1.7 || Math.abs(dx) > 2.1 || (Math.abs(dx) > 0.3 && Math.sign(dx) !== face)) return;\n    g.dmg[q.seat] = (g.dmg[q.seat] || 0) + (heavy ? FIGHT_HVY_DMG : FIGHT_DMG);\n    let force = 0.15 + g.dmg[q.seat] * 0.0125; // AFTER the damage lands (per-tick velocity: halved at 62.5ms)\n    if (heavy) force *= 1.5;\n    qb.vx = face * force;\n    qb.vy = -force * 0.55;\n    qb.ground = false;\n    g.hitT[q.seat] = FIGHT_HITSTUN;\n    g.dashT[q.seat] = 0;\n  });\n}\nfunction simulateFightTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b || !b.alive) return;\n    const seat = p.seat;\n    if (g.atkCd[seat] > 0) g.atkCd[seat] -= 1;\n    if (g.atkT[seat] > 0) g.atkT[seat] -= 1;\n    if ((g.hvyCd[seat] || 0) > 0) g.hvyCd[seat] -= 1;\n    if ((g.hvyT[seat] || 0) > 0) g.hvyT[seat] -= 1;\n    if (g.dashCd[seat] > 0) g.dashCd[seat] -= 1;\n    if ((g.invuln[seat] || 0) > 0) g.invuln[seat] -= 1;\n    const stunned = (g.hitT[seat] || 0) > 0;\n    if (stunned) g.hitT[seat] -= 1;\n    const it = fightIntent(room, p);\n    // Dash start (fresh press, off cooldown, not stunned).\n    if (!stunned && it.dash && g.dashCd[seat] <= 0 && (g.dashT[seat] || 0) <= 0) {\n      g.dashDir[seat] = it.x !== 0 ? it.x : (g.face[seat] || 1);\n      g.dashT[seat] = FIGHT_DASH_TICKS;\n      g.dashCd[seat] = FIGHT_DASH_CD;\n    }\n    if ((g.dashT[seat] || 0) > 0) {\n      g.dashT[seat] -= 1;\n      b.vx = g.dashDir[seat] * FIGHT_DASH_SPEED;\n      b.vy = -FIGHT_GRAV; // pre-cancel gravity: the dash flies level\n      g.face[seat] = g.dashDir[seat];\n    } else if (stunned) {\n      b.vx *= b.ground ? 0.8803 : 0.9685; // knockback slide, no control (sqrt-rescaled per-tick friction)\n    } else {\n      if (it.x !== 0) {\n        g.face[seat] = it.x;\n        if (Math.abs(b.vx) <= FIGHT_RUN || Math.sign(b.vx) !== it.x) b.vx = it.x * FIGHT_RUN;\n        else b.vx *= b.ground ? 0.9628 : 0.9925; // launched: bleed back toward run speed\n      } else {\n        b.vx *= b.ground ? 0.8614 : 0.9742;\n        if (Math.abs(b.vx) < 0.015) b.vx = 0;\n      }\n      if (it.jump && (g.jumps[seat] || 0) < 2) {\n        b.vy = (g.jumps[seat] || 0) === 0 ? -FIGHT_JUMP : -FIGHT_DJUMP;\n        g.jumps[seat] = (g.jumps[seat] || 0) + 1;\n        b.ground = false;\n      }\n    }\n    // Melee: a fresh A press swings at once. A fresh X press is the\n    // heavy swing — its own longer cooldown, +16% and 1.5x knockback,\n    // and a longer recovery pose. If both edges land on the same\n    // tick the heavy wins and the normal swing is skipped.\n    if (!stunned && it.hvy && (g.hvyCd[seat] || 0) <= 0) {\n      g.hvyT[seat] = FIGHT_HVY_ATK_T;\n      g.hvyCd[seat] = FIGHT_HVY_CD;\n      fightSwing(room, seat, true);\n    } else if (!stunned && it.atk && g.atkCd[seat] <= 0) {\n      g.atkT[seat] = 8;\n      g.atkCd[seat] = FIGHT_ATK_CD;\n      fightSwing(room, seat, false);\n    }\n    platStep(b, FIGHT_PLATFORMS, FIGHT_GRAV, PLAT_MAXFALL);\n    if (b.ground) g.jumps[seat] = 0;\n    // Ring-out past the blast bounds (widened with the 16:9 stage:\n    // the floor now spans +-11.3, the field +-16 x +-9).\n    if (b.x < -17.5 || b.x > 17.5 || b.y > 10.5 || b.y < -11.5) {\n      b.lives -= 1;\n      if (b.lives > 0) {\n        b.x = 0; b.y = FIGHT_PLATFORMS[3].y - PLAT_HH - 0.6; b.vx = 0; b.vy = 0; b.ground = false;\n        g.dmg[seat] = 0; g.jumps[seat] = 0; g.hitT[seat] = 0; g.dashT[seat] = 0; g.hvyT[seat] = 0;\n        g.invuln[seat] = INVULN_TICKS; // 2s of cover on the way back in\n      } else {\n        b.alive = false;\n        g.elimOrder.push(seat);\n        g.elimTick[seat] = g.tickCount;\n      }\n    }\n  });\n  snapshotPad(room);\n  const aliveCount = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive).length;\n  if (aliveCount <= 1) finishFight(room);\n}\nfunction botBrainFight(room, p) {\n  const g = room.game;\n  const me = g.blobs[p.seat];\n  const intent = { x: 0, jump: false, atk: false, hvy: false, dash: false };\n  if (!me || !me.alive) return intent;\n  // Recovery first — checked every tick, it is life-critical: airborne,\n  // low or out past the floor's edge, so steer home and spend jumps /\n  // the dash to get back over the stage.\n  if (!me.ground && (me.y > 1 || Math.abs(me.x) > 11.3)) {\n    intent.x = me.x > 0 ? -1 : 1;\n    if (me.vy > 0.1 && me.y > -1.1 && (g.jumps[p.seat] || 0) < 2) intent.jump = true;\n    else if (Math.abs(me.x) > 12.7 && (g.dashCd[p.seat] || 0) <= 0) intent.dash = true;\n    return intent;\n  }\n  // Combat steering, re-decided on the usual per-difficulty cadence.\n  const cached = g.botIntent[p.seat];\n  let dir = cached && typeof cached.x === 'number' ? cached.x : 0;\n  if (!cached || (g.tickCount + p.seat) % brainCadence(p) === 0) {\n    const near = nearestFoe(room, p);\n    dir = near.foe ? (Math.abs(near.foe.x - me.x) > 0.3 ? Math.sign(near.foe.x - me.x) : 0) : 0;\n    // Never chase a foe off the edge: near the rim, hold inward.\n    if (Math.abs(me.x) > 10.4 && dir === Math.sign(me.x)) dir = -Math.sign(me.x);\n    g.botIntent[p.seat] = { x: dir, y: 0 };\n  }\n  intent.x = dir;\n  const near = nearestFoe(room, p);\n  if (near.foe) {\n    const dx = near.foe.x - me.x, dy = near.foe.y - me.y;\n    if (me.ground && dy < -2 && Math.abs(dx) < 2.2) intent.jump = true; // hop up to their platform\n    if (Math.abs(dx) <= 2.0 && Math.abs(dy) <= 1.6) {\n      // Finisher: against a badly hurt foe (>= 50%), Khó/Vừa bots\n      // sometimes spend the heavy swing instead of a normal one —\n      // only when its own cooldown is ready. Dễ bots never heavy.\n      const foeDmg = near.foeSeat != null ? (g.dmg[near.foeSeat] || 0) : 0;\n      const hvyProb = p.difficulty === 'kho' ? 0.194 : p.difficulty === 'vua' ? 0.078 : 0; // per-tick rolls: 1-sqrt(1-p) keeps the per-second rate\n      if (hvyProb > 0 && foeDmg >= 50 && (g.hvyCd[p.seat] || 0) <= 0 && Math.random() < hvyProb) {\n        intent.hvy = true;\n      } else {\n        const prob = p.difficulty === 'kho' ? 0.684 : p.difficulty === 'vua' ? 0.368 : 0.194;\n        if (Math.random() < prob) intent.atk = true;\n      }\n    } else if (Math.abs(dx) > 6 && p.difficulty !== 'de' && Math.random() < 0.134) {\n      intent.dash = true;\n    }\n  }\n  return intent;\n}\nfunction finishFight(room) {\n  const g = room.game;\n  const aliveRanked = room.players.filter((p) => g.blobs[p.seat] && g.blobs[p.seat].alive)\n    .sort((a, b) => (g.blobs[b.seat].lives - g.blobs[a.seat].lives)\n      || ((g.dmg[a.seat] || 0) - (g.dmg[b.seat] || 0)) || (a.seat - b.seat));\n  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);\n  const ranking = aliveRanked.concat(elimRanked);\n  const entries = ranking.map((p, i) => ({\n    seat: p.seat, points: placementAt(i),\n    lives: g.blobs[p.seat].lives, dmg: g.dmg[p.seat] || 0, alive: g.blobs[p.seat].alive,\n  }));\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  g.lastRound = { round: 1, entries };\n  endGame(room);\n}\n\n// --- Game 23: Đền Lửa & Nước (COOP temple platformer) -------------------\n// Elements by seat parity (odd = Lửa, even = Nước). Pools kill by\n// element: red is safe only for Lửa, blue only for Nước, green kills\n// both — tested against the character's feet box so a clean jump over\n// a pool never clips it. Gems are colour-locked the same way. The two\n// portcullis gates share one open state, driven by either pressure\n// button. \"Home\" is positional: a character is home while standing in\n// its own door zone, and the level completes the tick EVERY character\n// is home at once (someone who rushed home can step back out to hold\n// the balcony button for a partner who fell behind).\nfunction poolLethal(kind, el) {\n  if (kind === 'green') return true;\n  if (kind === 'red') return el === 'nuoc';\n  return el === 'lua'; // blue\n}\nfunction stepTemple(room, t) {\n  const g = room.game;\n  if (g.phase !== 'temple') return false;\n  if (t >= g.endsAt) { finishTemple(room, false); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'temple') {\n      simulateTempleTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction templeIntent(room, p) {\n  const g = room.game;\n  if (p.type === 'human') {\n    const pad = g.pad[p.seat] || {};\n    const prev = g.padPrev[p.seat] || {};\n    return {\n      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),\n      jump: (!!pad.u && !prev.u) || (!!pad.a && !prev.a) || (!!pad.y && !prev.y),\n    };\n  }\n  return botBrainTemple(room, p);\n}\nfunction simulateTempleTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  // Gate state is read from where everyone stands BEFORE this tick's\n  // movement: a holder stepping off closes the slabs for the next tick.\n  g.gateOpen = room.players.some((p) => {\n    const c = g.chars[p.seat];\n    return c && TEMPLE_LEVEL.buttons.some((bt) => platOverlap(c, bt));\n  });\n  const solids = g.gateOpen ? TEMPLE_LEVEL.solids : TEMPLE_LEVEL.solids.concat(TEMPLE_LEVEL.gates);\n  let heartsGone = false;\n  room.players.forEach((p) => {\n    const c = g.chars[p.seat];\n    if (!c) return;\n    const it = templeIntent(room, p);\n    if (it.jump && c.ground) { c.vy = -TEMP_JUMP; c.ground = false; }\n    c.vx = it.x * TEMP_RUN;\n    platStep(c, solids, TEMP_GRAV, PLAT_MAXFALL);\n    // Pools: only the feet box counts, so jumping a pool is safe.\n    for (const pool of TEMPLE_LEVEL.pools) {\n      const inX = c.x + 0.25 > pool.x && c.x - 0.25 < pool.x + pool.w;\n      const inFeet = c.y + PLAT_HH > pool.y && c.y + PLAT_HH - 0.5 < pool.y + pool.h;\n      if (inX && inFeet && poolLethal(pool.kind, c.el)) {\n        g.hearts -= 1;\n        const st = TEMPLE_LEVEL.starts[c.el];\n        c.x = st.x; c.y = st.y; c.vx = 0; c.vy = 0;\n        if (p.type === 'bot') { g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0; }\n        if (g.hearts <= 0) heartsGone = true;\n        break;\n      }\n    }\n    if (heartsGone) return;\n    (g.gems || []).forEach((gm) => {\n      if (!gm.taken && gm.el === c.el && Math.hypot(gm.x - c.x, gm.y - c.y) < 1.15) {\n        gm.taken = true;\n        g.gemCount[c.el] = (g.gemCount[c.el] || 0) + 1;\n      }\n    });\n    c.home = platOverlap(c, TEMPLE_LEVEL.doors[c.el]);\n  });\n  snapshotPad(room);\n  if (heartsGone) { finishTemple(room, false); return; }\n  if (room.players.every((p) => g.chars[p.seat] && g.chars[p.seat].home)) finishTemple(room, true);\n}\nfunction botBrainTemple(room, p) {\n  const g = room.game;\n  const c = g.chars[p.seat];\n  const intent = { x: 0, jump: false };\n  if (!c || c.home) return intent;\n  const route = TEMPLE_WP[c.el] || [];\n  const idx = g.wpIdx[p.seat] || 0;\n  if (idx >= route.length) return intent;\n  const wp = route[idx];\n  if (Math.abs(c.x - wp.x) < 0.4 && Math.abs(c.y - wp.y) < 0.75) {\n    if (wp.holdBtn) {\n      if (!g.wpAt[p.seat]) g.wpAt[p.seat] = g.tickCount;\n      const partnersIn = room.players.every((q) => q.seat === p.seat\n        || (g.chars[q.seat] && (g.chars[q.seat].home || g.chars[q.seat].y < -1.5)));\n      if (!partnersIn && g.tickCount - g.wpAt[p.seat] < 480) return intent; // keep holding (30s at the shared 62.5ms tick)\n    }\n    g.wpIdx[p.seat] = idx + 1;\n    g.wpAt[p.seat] = 0;\n    return intent;\n  }\n  const dx = wp.x - c.x;\n  intent.x = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0;\n  if (c.ground) {\n    if (wp.y < c.y - 0.8 && Math.abs(dx) < 2.4) intent.jump = true; // climb toward the waypoint\n    if (!intent.jump && intent.x !== 0) {\n      const aheadX = c.x + intent.x * 0.95;\n      for (const pool of TEMPLE_LEVEL.pools) {\n        if (poolLethal(pool.kind, c.el)\n          && aheadX > pool.x - 0.2 && aheadX < pool.x + pool.w + 0.2\n          && Math.abs((c.y + PLAT_HH) - (pool.y + pool.h)) < 0.75) { intent.jump = true; break; }\n      }\n    }\n  }\n  return intent;\n}\nfunction finishTemple(room, completed) {\n  const g = room.game;\n  const total = (g.gemCount.lua || 0) + (g.gemCount.nuoc || 0);\n  let tier = 'none';\n  if (completed && total >= TEMP_GEMS_TOTAL) tier = 'vang';\n  else if (completed) tier = 'bac';\n  else if (total * 2 >= TEMP_GEMS_TOTAL) tier = 'dong';\n  finishCoop(room, total, tier, 'viên ngọc');\n}\n\n// --- Game 24: Đá Bóng Đầu To (versus team soccer) ------------------------\n// Odd seats = Đỏ (defend left), even seats = Xanh. The deepest player\n// of each team spawns in goal; everyone resets there after each goal\n// while the match clock is banked (remainMs), so celebrations are\n// free. Scoring is the tug-of-war team path (not placement): winners\n// 300 each, draw 150 each, losers 50 each. Own goals count — the\n// scoreboard credits the TEAM, and goalInfo.by keeps the culprit.\nfunction soccerTeam(seat) { return seat % 2 === 1 ? 'do' : 'xanh'; }\nfunction soccerKickoff(room) {\n  const g = room.game;\n  const byTeam = { do: [], xanh: [] };\n  room.players.forEach((p) => { byTeam[soccerTeam(p.seat)].push(p.seat); });\n  g.goalieSeat = {};\n  ['do', 'xanh'].forEach((tm) => {\n    const seats = byTeam[tm];\n    const flip = tm === 'do' ? 1 : -1; // SOCCER_FWD_X is written for the left side\n    g.goalieSeat[tm] = seats.length >= 2 ? seats[seats.length - 1] : null;\n    seats.forEach((seat, i) => {\n      const b = g.blobs[seat];\n      if (!b) return;\n      const isG = g.goalieSeat[tm] === seat;\n      b.x = flip * (isG ? -SOCCER_GOALIE_X : SOCCER_FWD_X[Math.min(i, SOCCER_FWD_X.length - 1)]);\n      b.y = 7.1; b.vx = 0; b.vy = 0; b.ground = true;\n      g.face[seat] = tm === 'do' ? 1 : -1;\n      g.dashT[seat] = 0; g.kickCd[seat] = 0;\n    });\n  });\n  g.ball = { x: 0, y: 8 - SOCCER_BALL_R, vx: 0, vy: 0 };\n}\nfunction stepSoccer(room, t) {\n  const g = room.game;\n  if (g.phase === 'goal') {\n    if (t >= g.endsAt) {\n      soccerKickoff(room);\n      g.phase = 'soccer';\n      g.endsAt = t + Math.max(1000, g.remainMs || SOCCER_MS);\n      g.nextTickAt = t + TICK_MS;\n      return true;\n    }\n    return false;\n  }\n  if (g.phase !== 'soccer') return false;\n  if (t >= g.endsAt) { finishSoccer(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'soccer') {\n      simulateSoccerTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction soccerIntent(room, p) {\n  const g = room.game;\n  if (p.type === 'human') {\n    const pad = g.pad[p.seat] || {};\n    const prev = g.padPrev[p.seat] || {};\n    return {\n      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),\n      jump: (!!pad.u && !prev.u) || (!!pad.y && !prev.y),\n      kick: !!pad.a && !prev.a,\n      dash: !!pad.b && !prev.b,\n    };\n  }\n  return botBrainSoccer(room, p);\n}\nfunction simulateSoccerTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b) return;\n    const seat = p.seat;\n    if (g.dashCd[seat] > 0) g.dashCd[seat] -= 1;\n    if (g.kickCd[seat] > 0) g.kickCd[seat] -= 1;\n    const it = soccerIntent(room, p);\n    if (it.x !== 0) g.face[seat] = it.x;\n    if (it.dash && g.dashCd[seat] <= 0 && (g.dashT[seat] || 0) <= 0) {\n      g.dashDir[seat] = it.x !== 0 ? it.x : (g.face[seat] || 1);\n      g.dashT[seat] = SOCCER_DASH_TICKS;\n      g.dashCd[seat] = SOCCER_DASH_CD;\n    }\n    if ((g.dashT[seat] || 0) > 0) {\n      g.dashT[seat] -= 1;\n      b.vx = g.dashDir[seat] * SOCCER_DASH_SPEED;\n    } else {\n      b.vx = it.x * SOCCER_RUN;\n    }\n    if (it.jump && b.ground) { b.vy = -SOCCER_JUMP; b.ground = false; }\n    if (it.kick && g.kickCd[seat] <= 0) soccerKick(room, seat);\n    platStep(b, SOCCER_SOLIDS, SOCCER_GRAV, PLAT_MAXFALL);\n  });\n  stepSoccerBall(room);\n  snapshotPad(room);\n  const ball = g.ball;\n  if (ball && ball.y > 4.6) {\n    if (ball.x < -16.6) soccerGoal(room, 'xanh');\n    else if (ball.x > 16.6) soccerGoal(room, 'do');\n  }\n}\nfunction soccerKick(room, seat) {\n  const g = room.game;\n  const b = g.blobs[seat]; const ball = g.ball;\n  if (!b || !ball) return;\n  if (Math.hypot(ball.x - b.x, ball.y - b.y) > 2.3) return; // out of reach: no kick, no cooldown\n  g.kickCd[seat] = SOCCER_KICK_CD;\n  const pad = g.pad[seat] || {};\n  let vx = SOCCER_KICK_VX, vy = SOCCER_KICK_VY;\n  if (pad.u) { vx *= 0.8; vy = 0.425; } // lob it\n  else if (pad.d) { vx *= 1.15; vy = 0.125; } // low drive\n  ball.vx = (g.face[seat] || 1) * vx;\n  ball.vy = -vy;\n  g.lastTouch = seat;\n}\nfunction stepSoccerBall(room) {\n  const g = room.game;\n  const ball = g.ball;\n  if (!ball) return;\n  ball.vy = Math.min(0.65, ball.vy + SOCCER_BALL_GRAV);\n  ball.x += ball.vx;\n  ball.y += ball.vy;\n  for (const s of SOCCER_SOLIDS) {\n    const nx = Math.max(s.x, Math.min(ball.x, s.x + s.w));\n    const ny = Math.max(s.y, Math.min(ball.y, s.y + s.h));\n    const dx = ball.x - nx, dy = ball.y - ny;\n    const d2 = dx * dx + dy * dy;\n    if (d2 >= SOCCER_BALL_R * SOCCER_BALL_R) continue;\n    if (d2 > 0.0001) {\n      const d = Math.sqrt(d2);\n      const ux = dx / d, uy = dy / d;\n      ball.x = nx + ux * SOCCER_BALL_R;\n      ball.y = ny + uy * SOCCER_BALL_R;\n      const vn = ball.vx * ux + ball.vy * uy;\n      if (vn < 0) {\n        if (vn > -0.09) { ball.vx -= vn * ux; ball.vy -= vn * uy; } // settle, don't micro-bounce\n        else {\n          ball.vx -= (1 + SOCCER_BALL_REST) * vn * ux;\n          ball.vy -= (1 + SOCCER_BALL_REST) * vn * uy;\n          ball.vx *= 0.98; ball.vy *= 0.98;\n        }\n      }\n    } else {\n      ball.y = s.y - SOCCER_BALL_R;\n      if (ball.vy > 0) ball.vy = -ball.vy * SOCCER_BALL_REST;\n    }\n  }\n  // Player contact: dribble pushes, body blocks and jumping headers.\n  room.players.forEach((p) => {\n    const b = g.blobs[p.seat];\n    if (!b) return;\n    const nx = Math.max(b.x - PLAT_HW, Math.min(ball.x, b.x + PLAT_HW));\n    const ny = Math.max(b.y - PLAT_HH, Math.min(ball.y, b.y + PLAT_HH));\n    const dx = ball.x - nx, dy = ball.y - ny;\n    const d = Math.hypot(dx, dy);\n    if (d >= SOCCER_BALL_R) return;\n    if (d < 0.001) { ball.x = b.x + (g.face[p.seat] || 1) * (PLAT_HW + SOCCER_BALL_R); return; }\n    const ux = dx / d, uy = dy / d;\n    ball.x = nx + ux * SOCCER_BALL_R;\n    ball.y = ny + uy * SOCCER_BALL_R;\n    const vn = ball.vx * ux + ball.vy * uy;\n    if (vn < 0.2) {\n      ball.vx += (0.2 - vn) * ux + b.vx * 0.55;\n      ball.vy += (0.2 - vn) * uy + (b.vy < 0 ? b.vy * 0.35 : 0);\n    }\n    if (uy < -0.5 && b.vy < -0.1) ball.vy = Math.min(ball.vy, -0.275); // header pop\n    g.lastTouch = p.seat;\n  });\n  // Rolling friction once the ball is basically resting on the ground.\n  if (ball.y >= 8 - SOCCER_BALL_R - 0.03 && Math.abs(ball.vy) < 0.05) {\n    ball.vy = 0;\n    ball.y = 8 - SOCCER_BALL_R;\n    ball.vx *= 0.9695; // sqrt(0.94): same decay per second at 62.5ms\n    if (Math.abs(ball.vx) < 0.01) ball.vx = 0;\n  }\n}\nfunction soccerGoal(room, team) {\n  const g = room.game;\n  g.score[team] = (g.score[team] || 0) + 1;\n  const scorer = g.lastTouch != null ? playerAt(room, g.lastTouch) : null;\n  g.goalInfo = { team, by: g.lastTouch, ownGoal: !!scorer && soccerTeam(scorer.seat) !== team };\n  g.remainMs = Math.max(0, g.endsAt - now());\n  g.phase = 'goal';\n  g.endsAt = now() + SOCCER_GOAL_MS;\n}\nfunction botBrainSoccer(room, p) {\n  const g = room.game;\n  const me = g.blobs[p.seat];\n  const intent = { x: 0, jump: false, kick: false, dash: false };\n  if (!me || !g.ball) return intent;\n  const ball = g.ball;\n  const tm = soccerTeam(p.seat);\n  const atk = tm === 'do' ? 1 : -1;\n  const isGoalie = !!(g.goalieSeat && g.goalieSeat[tm] === p.seat);\n  let tx;\n  if (isGoalie) {\n    const home = -atk * 15.0;\n    tx = home + Math.max(-2.2, Math.min(2.2, (ball.x - home) * 0.3));\n    if (Math.abs(ball.x - me.x) < 3.2 && Math.abs(ball.y - me.y) < 3) tx = ball.x; // charge a close ball\n  } else {\n    let closest = true;\n    room.players.forEach((q) => {\n      if (q.seat === p.seat || soccerTeam(q.seat) !== tm) return;\n      if (g.goalieSeat && g.goalieSeat[tm] === q.seat) return;\n      const qb = g.blobs[q.seat];\n      if (qb && Math.hypot(ball.x - qb.x, ball.y - qb.y) < Math.hypot(ball.x - me.x, ball.y - me.y)) closest = false;\n    });\n    tx = closest ? ball.x + ball.vx * (p.difficulty === 'kho' ? 8 : 0) : ball.x * 0.45 - atk * 2;\n  }\n  if (Math.abs(tx - me.x) > 0.35) intent.x = Math.sign(tx - me.x);\n  const dBall = Math.hypot(ball.x - me.x, ball.y - me.y);\n  if (dBall < 2.3 && (g.kickCd[p.seat] || 0) <= 0) {\n    const blunder = p.difficulty === 'de' && Math.random() < 0.22;\n    const wantFace = blunder ? -atk : atk;\n    if ((g.face[p.seat] || 1) === wantFace) intent.kick = true;\n    else intent.x = wantFace;\n  }\n  if (ball.y < me.y - 1.6 && dBall < 2.6 && me.ground) intent.jump = true;\n  if (!isGoalie && dBall > 7 && intent.x !== 0 && p.difficulty !== 'de' && Math.random() < 0.0305) intent.dash = true; // per-tick roll: 1-sqrt(1-p)\n  return intent;\n}\nfunction finishSoccer(room) {\n  const g = room.game;\n  const d = g.score.do || 0, x = g.score.xanh || 0;\n  const winner = d > x ? 'do' : x > d ? 'xanh' : null;\n  const entries = room.players.map((p) => {\n    const tm = soccerTeam(p.seat);\n    return { seat: p.seat, team: tm, points: winner === null ? 150 : tm === winner ? 300 : 50 };\n  });\n  entries.forEach((e) => { g.points[e.seat] = e.points; });\n  g.lastRound = { round: 1, entries, score: { do: d, xanh: x }, winnerTeam: winner };\n  endGame(room);\n}\n\n// --- Game 25: Ếch Ộp Phiêu Lưu (co-op swallow-carry platformer) ----------\n// Frogs are temple-style AABBs in the shared 24 x 24 space. The belly\n// rules: B/X edge near a free, non-carrying teammate swallows them\n// (they freeze, glued to the carrier); B/X again spits them out ahead\n// with a hop. A carrier jumps with FROG_JUMP_CARRY — that boost is\n// the whole point: the 5.2u spike strips fit between the solo and\n// carrier clearances. Spikes use the temple feet-box test. Crates are\n// pushed by contact (they inherit the pusher's run speed) and glide\n// on with friction once released, so a crate can be shoved INTO a\n// spike strip and hopped across; frogs stand on crates (they join the\n// solids list), crates themselves ignore spikes.\nfunction loadFrogChamber(room, idx, t) {\n  const g = room.game;\n  const L = FROG_LEVELS[idx - 1];\n  g.chamber = idx;\n  g.flies = L.flies.map((f) => ({ x: f.x, y: f.y, taken: false }));\n  g.crates = L.crates.map((c) => ({ x: c.x, y: c.y, vx: 0, vy: 0, ground: true }));\n  room.players.forEach((p, i) => {\n    const st = L.starts[i % L.starts.length];\n    const f = g.frogs[p.seat];\n    if (!f) return;\n    f.x = st.x; f.y = st.y; f.vx = 0; f.vy = 0; f.ground = true; f.belly = null; f.by = null;\n    g.wpIdx[p.seat] = 0; g.wpAt[p.seat] = 0;\n  });\n  g.endsAt = t + FROG_PER_MS;\n}\nfunction frogSolids(room) {\n  const g = room.game;\n  const L = FROG_LEVELS[g.chamber - 1];\n  let solids = FROG_WALLS.concat(L.solids);\n  (g.crates || []).forEach((c) => { solids = solids.concat([{ x: c.x - 0.6, y: c.y - 0.6, w: 1.2, h: 1.2 }]); });\n  return solids;\n}\nfunction stepFrog(room, t) {\n  const g = room.game;\n  if (g.phase === 'frogClear') {\n    if (t >= g.endsAt) {\n      loadFrogChamber(room, g.chamber + 1, t);\n      g.phase = 'frog';\n      g.nextTickAt = t + TICK_MS;\n      return true;\n    }\n    return false;\n  }\n  if (g.phase !== 'frog') return false;\n  if (t >= g.endsAt) { finishFrog(room); return true; }\n  if (t >= g.nextTickAt) {\n    // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n    let nCU = 0;\n    while (nCU < 8 && t >= g.nextTickAt && g.phase === 'frog') {\n      simulateFrogTick(room);\n      if (room.game !== g) return true; // the tick ended the game\n      g.nextTickAt += TICK_MS;\n      nCU++;\n    }\n    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n    return true;\n  }\n  return false;\n}\nfunction frogIntent(room, p) {\n  const g = room.game;\n  const f = g.frogs[p.seat];\n  if (f && f.by != null) return { x: 0, jump: false, gulp: false }; // a passenger has no controls\n  if (p.type === 'human') {\n    const pad = g.pad[p.seat] || {};\n    const prev = g.padPrev[p.seat] || {};\n    return {\n      x: (pad.r ? 1 : 0) - (pad.l ? 1 : 0),\n      jump: (!!pad.u && !prev.u) || (!!pad.a && !prev.a) || (!!pad.y && !prev.y),\n      gulp: (!!pad.b && !prev.b) || (!!pad.x && !prev.x),\n    };\n  }\n  return botBrainFrog(room, p);\n}\nfunction crateStep(c, solids) {\n  // platStep's axis-separated resolution with the crate's own 0.6 half extents.\n  const HW = 0.6, HH = 0.6;\n  c.vy = Math.min(PLAT_MAXFALL, c.vy + TEMP_GRAV);\n  c.x += c.vx;\n  for (const s of solids) {\n    if (s.oneWay) continue;\n    if (c.x - HW < s.x + s.w && c.x + HW > s.x && c.y - HH < s.y + s.h && c.y + HH > s.y) {\n      if (c.vx > 0) c.x = s.x - HW;\n      else if (c.vx < 0) c.x = s.x + s.w + HW;\n      c.vx = 0;\n    }\n  }\n  const prevFeet = c.y + HH;\n  c.y += c.vy;\n  c.ground = false;\n  for (const s of solids) {\n    if (!(c.x - HW < s.x + s.w && c.x + HW > s.x && c.y - HH < s.y + s.h && c.y + HH > s.y)) continue;\n    if (c.vy >= 0 && prevFeet <= s.y + 0.05) { c.y = s.y - HH; c.vy = 0; c.ground = true; }\n    else if (c.vy < 0 && !s.oneWay) { c.y = s.y + s.h + HH; c.vy = 0; }\n  }\n}\nfunction simulateFrogTick(room) {\n  const g = room.game;\n  g.tickCount += 1;\n  const L = FROG_LEVELS[g.chamber - 1];\n  const staticSolids = FROG_WALLS.concat(L.solids);\n  const intents = {};\n  room.players.forEach((p) => { intents[p.seat] = frogIntent(room, p); });\n  // Crates first: a pushing frog lends its run speed; a released crate\n  // glides with friction. Crates then join the frogs' solids list.\n  (g.crates || []).forEach((c, ci) => {\n    let push = 0;\n    room.players.forEach((p) => {\n      const f = g.frogs[p.seat]; const it = intents[p.seat];\n      if (!f || f.by != null || !it || it.x === 0) return;\n      const dx = c.x - f.x;\n      if (Math.sign(dx) === it.x && Math.abs(dx) <= 1.25 && Math.abs(f.y - c.y) < 1.1) push = it.x;\n    });\n    if (push !== 0) c.vx = push * FROG_RUN;\n    // SMOOTH3: the glide decrement is acceleration-class — with the\n    // release speed halved it must QUARTER (0.03 -> 0.0075) or the\n    // glide distance (v^2 / 2a) halves. The 0.015 stop threshold is\n    // a velocity and simply halves.\n    else if (c.ground) c.vx = Math.abs(c.vx) <= 0.015 ? 0 : c.vx - Math.sign(c.vx) * 0.0075;\n    crateStep(c, staticSolids);\n    if (c.y > 10.5) { c.x = L.crates[ci].x; c.y = L.crates[ci].y; c.vx = 0; c.vy = 0; }\n  });\n  const solids = frogSolids(room);\n  room.players.forEach((p) => {\n    const f = g.frogs[p.seat];\n    if (!f) return;\n    const seat = p.seat;\n    if (f.by != null) {\n      const carrier = g.frogs[f.by];\n      if (carrier) { f.x = carrier.x; f.y = carrier.y; }\n      return;\n    }\n    const it = intents[seat];\n    if (it.x !== 0) g.face[seat] = it.x;\n    if (it.gulp) {\n      if (f.belly != null) {\n        const pas = g.frogs[f.belly];\n        if (pas) {\n          pas.by = null;\n          pas.x = f.x + (g.face[seat] || 1) * 1.15;\n          pas.y = f.y - 0.3;\n          pas.vx = (g.face[seat] || 1) * 0.25;\n          pas.vy = -0.5;\n          pas.ground = false;\n          const pasP = playerAt(room, f.belly);\n          if (pasP && pasP.type === 'bot') {\n            g.wpIdx[f.belly] = Math.max(g.wpIdx[f.belly] || 0, g.wpIdx[seat] || 0);\n          }\n        }\n        f.belly = null;\n      } else {\n        let best = null, bd = 1.7;\n        room.players.forEach((q) => {\n          if (q.seat === seat) return;\n          const qf = g.frogs[q.seat];\n          if (!qf || qf.by != null || qf.belly != null) return;\n          const d = Math.hypot(qf.x - f.x, qf.y - f.y);\n          if (d <= bd) { bd = d; best = q.seat; }\n        });\n        if (best != null) {\n          g.frogs[best].by = seat;\n          g.frogs[best].vx = 0; g.frogs[best].vy = 0;\n          f.belly = best;\n        }\n      }\n    }\n    if (it.jump && f.ground) {\n      f.vy = -(f.belly != null ? FROG_JUMP_CARRY : FROG_JUMP);\n      f.ground = false;\n    }\n    f.vx = it.x * FROG_RUN;\n    platStep(f, solids, TEMP_GRAV, PLAT_MAXFALL);\n    for (const sp of L.spikes) {\n      // Spikes kill only once the feet are essentially ON the strip\n      // (within 0.15 of the floor): a frog arcing over the far edge\n      // with its feet still high is clearing it, not landing in it.\n      // Standing in the strip (feetY = floor top) always dies.\n      const inX = f.x + 0.25 > sp.x && f.x - 0.25 < sp.x + sp.w;\n      const inFeet = f.y + PLAT_HH > sp.y + sp.h - 0.15;\n      if (inX && inFeet) { frogDie(room, seat); break; }\n    }\n    if (g.frogs[seat] === f && f.y > 10.5) frogDie(room, seat);\n  });\n  (g.flies || []).forEach((fl) => {\n    if (fl.taken) return;\n    room.players.forEach((p) => {\n      if (fl.taken) return;\n      const f = g.frogs[p.seat];\n      if (f && f.by == null && Math.hypot(fl.x - f.x, fl.y - f.y) < FROG_EAT_R) {\n        fl.taken = true;\n        g.fliesEaten = (g.fliesEaten || 0) + 1;\n      }\n    });\n  });\n  snapshotPad(room);\n  if (g.hearts <= 0) { finishFrog(room); return; }\n  const allHome = room.players.every((p) => {\n    const f = g.frogs[p.seat];\n    if (!f) return false;\n    if (f.by != null) return true; // a passenger is wherever its carrier is\n    return platOverlap(f, L.door);\n  });\n  if (allHome) {\n    g.chambersDone = Math.max(g.chambersDone || 0, g.chamber);\n    if (g.chamber >= FROG_LEVELS.length) { finishFrog(room); return; }\n    g.phase = 'frogClear';\n    g.endsAt = now() + 2000;\n  }\n}\nfunction frogDie(room, seat) {\n  const g = room.game;\n  const L = FROG_LEVELS[g.chamber - 1];\n  const idx = room.players.findIndex((p) => p.seat === seat);\n  const st = L.starts[Math.max(0, idx) % L.starts.length];\n  const f = g.frogs[seat];\n  if (!f) return;\n  // A passenger dies with its carrier: both restart for ONE heart.\n  const rider = f.belly;\n  f.x = st.x; f.y = st.y; f.vx = 0; f.vy = 0; f.belly = null;\n  if (rider != null) {\n    const rf = g.frogs[rider];\n    if (rf) { rf.by = null; rf.x = st.x + 0.8; rf.y = st.y; rf.vx = 0; rf.vy = 0; }\n    const rp = playerAt(room, rider);\n    if (rp && rp.type === 'bot') g.wpIdx[rider] = 0;\n  }\n  const me = playerAt(room, seat);\n  if (me && me.type === 'bot') g.wpIdx[seat] = 0;\n  g.hearts -= 1;\n}\nfunction botBrainFrog(room, p) {\n  const g = room.game;\n  const f = g.frogs[p.seat];\n  const intent = { x: 0, jump: false, gulp: false };\n  if (!f || f.by != null) return intent;\n  const L = FROG_LEVELS[g.chamber - 1];\n  const route = FROG_WP[g.chamber - 1] || [];\n  const idx = g.wpIdx[p.seat] || 0;\n  if (idx >= route.length) return intent;\n  const wp = route[idx];\n  const dx = wp.x - f.x;\n  const dy = (wp.y != null ? wp.y : f.y) - f.y;\n  if (wp.swallow && f.belly == null) {\n    // Park at the swallow point until a free teammate is in range to\n    // gulp down; a 20s timeout keeps a lone bot from freezing the run.\n    if (!g.wpAt[p.seat]) g.wpAt[p.seat] = g.tickCount;\n    let mateNear = false;\n    room.players.forEach((q) => {\n      if (q.seat === p.seat) return;\n      const qf = g.frogs[q.seat];\n      if (qf && qf.by == null && qf.belly == null && Math.hypot(qf.x - f.x, qf.y - f.y) <= 1.7) mateNear = true;\n    });\n    if (mateNear && Math.abs(dx) < 1.2) {\n      intent.gulp = true;\n      g.wpIdx[p.seat] = idx + 1;\n      g.wpAt[p.seat] = 0;\n      return intent;\n    }\n    if (g.tickCount - (g.wpAt[p.seat] || 0) > 320) { g.wpIdx[p.seat] = idx + 1; g.wpAt[p.seat] = 0; return intent; }\n    if (Math.abs(dx) >= 0.45) intent.x = Math.sign(dx);\n    return intent;\n  }\n  if (wp.spit && f.belly != null && f.ground && Math.abs(dx) < 0.6) {\n    intent.gulp = true;\n    g.wpIdx[p.seat] = idx + 1;\n    return intent;\n  }\n  if (Math.abs(dx) < 0.45 && (wp.y == null || Math.abs(dy) < 0.8)) { g.wpIdx[p.seat] = idx + 1; return intent; }\n  intent.x = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0;\n  if (f.ground && intent.x !== 0) {\n    if (wp.y != null && dy < -0.8 && Math.abs(dx) < 3.0) intent.jump = true;\n    else {\n      // Hazard probe: jump as the near edge of a spike strip comes\n      // underfoot — a carrying bot leaves it later (0.5) because its\n      // boosted jump needs the latest safe takeoff.\n      const lead = f.belly != null ? 0.6 : 1.15;\n      for (const sp of L.spikes) {\n        const edge = intent.x > 0 ? sp.x : sp.x + sp.w;\n        const dist = (edge - f.x) * intent.x;\n        if (dist > 0 && dist < lead && f.y + PLAT_HH > sp.y - 1.2) { intent.jump = true; break; }\n      }\n    }\n  }\n  return intent;\n}\nfunction finishFrog(room) {\n  const g = room.game;\n  const done = g.chambersDone || 0;\n  const flies = g.fliesEaten || 0;\n  let tier = 'none';\n  if (done >= FROG_LEVELS.length && flies >= FROG_LEVELS.length * 3) tier = 'vang';\n  else if (done >= FROG_LEVELS.length) tier = 'bac';\n  else if (done >= 1) tier = 'dong';\n  finishCoop(room, flies, tier, 'con ruồi');\n}\n\n// --- Game 26: Đại Bác Căn Góc (turn-based artillery) ----------------------\n// One cannon takes the whole 'aim' phase (30s): its owner sweeps\n// angle/power with the pad (2.5 deg / 3 power per tick), flips with\n// X, fires with A; an idle human simply passes. Bots solve the\n// ballistic equation (ignoring wind), walk their correction from\n// their last landing offset, then add difficulty error. The boom\n// carves the heightmap in a circle and every cannon settles onto the\n// new surface; falling out of the world never happens (the carve is\n// capped), so elimination is HP-only. Placement: survivors by HP,\n// then reverse elimination order — all through placementAt().\nfunction cannonColAt(x) { return Math.max(0, Math.min(CANNON_COLS - 1, Math.floor((x + 16) / 0.2))); }\nfunction cannonNextTurn(room, t, afterSeat) {\n  const g = room.game;\n  const seats = room.players.map((p) => p.seat).sort((a, b) => a - b);\n  let next = null;\n  if (afterSeat == null) next = seats.find((s) => g.cannons[s] && g.cannons[s].alive);\n  else {\n    const i = seats.indexOf(afterSeat);\n    for (let k = 1; k <= seats.length; k++) {\n      const s = seats[(i + k) % seats.length];\n      if (g.cannons[s] && g.cannons[s].alive) { next = s; break; }\n    }\n  }\n  g.turnSeat = next;\n  g.wind = randInt(-6, 6);\n  g.phase = 'aim';\n  g.endsAt = t + CANNON_AIM_MS;\n  g.nextTickAt = t + TICK_MS;\n  const cp = next != null ? playerAt(room, next) : null;\n  g.botFireAt = cp && cp.type === 'bot' ? t + Math.round(rand(1000, 2000)) : 0;\n  snapshotPad(room);\n}\nfunction cannonFire(room, seat) {\n  const g = room.game;\n  const c = g.cannons[seat];\n  if (!c || !c.alive) return;\n  const rad = (c.angle * Math.PI) / 180;\n  const v = Math.max(4, c.power) / 100 * BALLISTICS.maxV;\n  const dx = c.face * Math.cos(rad), dy = -Math.sin(rad);\n  g.shell = {\n    x: Math.round((c.x + dx * 1.0) * 1000) / 1000,\n    y: Math.round((c.y - 0.4 + dy * 1.0) * 1000) / 1000,\n    vx: dx * v, vy: dy * v, by: seat, trail: [], born: now(),\n  };\n  g.phase = 'shell';\n  g.nextTickAt = now() + TICK_MS;\n}\nfunction stepCannon(room, t) {\n  const g = room.game;\n  if (g.phase === 'aim') {\n    if (t >= g.matchEndsAt) { finishCannon(room); return true; }\n    const seat = g.turnSeat;\n    const c = seat != null ? g.cannons[seat] : null;\n    if (!c || !c.alive) { cannonNextTurn(room, t, seat); return true; }\n    const cp = playerAt(room, seat);\n    if (cp && cp.type === 'bot') {\n      if (t >= g.botFireAt) { cannonBotAim(room, cp); cannonFire(room, seat); return true; }\n      return false;\n    }\n    if (t >= g.endsAt) { cannonNextTurn(room, t, seat); return true; } // idle: the turn passes\n    if (t >= g.nextTickAt) {\n      // Catch-up (see stepArena): a held pad applies once per missed\n      // tick, up to 4 — exactly what four on-time ticks would do.\n      // Edges still fire once: padPrev tracks the pad after the first\n      // sub-tick, so the A fire / X flip cannot repeat inside the loop.\n      let nCU = 0;\n      while (nCU < 8 && t >= g.nextTickAt && g.phase === 'aim') {\n        const pad = g.pad[seat] || {};\n        const prev = g.padPrev[seat] || {};\n        if (pad.u) c.angle = Math.min(85, c.angle + 1.25);\n        if (pad.d) c.angle = Math.max(5, c.angle - 1.25);\n        if (pad.l) c.power = Math.max(0, c.power - 1.5);\n        if (pad.r) c.power = Math.min(100, c.power + 1.5);\n        if (pad.x && !prev.x) c.face = -c.face;\n        g.padPrev[seat] = Object.assign({}, pad);\n        g.nextTickAt += TICK_MS;\n        nCU++;\n        if (pad.a && !prev.a) { cannonFire(room, seat); return true; }\n      }\n      if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n      return true;\n    }\n    return false;\n  }\n  if (g.phase === 'shell') {\n    if (t >= g.nextTickAt) {\n      // Catch-up (see stepArena): up to 8 missed ticks, then resync.\n      let nCU = 0;\n      while (nCU < 8 && t >= g.nextTickAt && g.phase === 'shell') {\n        simulateShellTick(room);\n        if (room.game !== g) return true; // the tick ended the game\n        g.nextTickAt += TICK_MS;\n        nCU++;\n      }\n      if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync the remaining backlog\n      return true;\n    }\n    return false;\n  }\n  if (g.phase === 'boom') {\n    if (t >= g.endsAt) {\n      const alive = room.players.filter((p) => g.cannons[p.seat] && g.cannons[p.seat].alive);\n      if (alive.length <= 1 || t >= g.matchEndsAt) { finishCannon(room); return true; }\n      cannonNextTurn(room, t, g.turnSeat);\n      return true;\n    }\n    return false;\n  }\n  return false;\n}\nfunction simulateShellTick(room) {\n  const g = room.game;\n  const sh = g.shell;\n  if (!sh) { g.phase = 'aim'; return; }\n  const B = BALLISTICS;\n  const dt = 1 / B.sub;\n  for (let i = 0; i < B.sub; i++) {\n    sh.vy += B.grav * dt;\n    sh.vx += g.wind * B.windK * dt;\n    sh.x += sh.vx * dt;\n    sh.y += sh.vy * dt;\n    let direct = false;\n    room.players.forEach((p) => {\n      const c = g.cannons[p.seat];\n      if (c && c.alive && Math.hypot(sh.x - c.x, sh.y - (c.y - 0.4)) < 0.85) direct = true;\n    });\n    if (direct) { resolveBoom(room, sh.x, sh.y); return; }\n    if (sh.x < -16.6 || sh.x > 16.6) { // sailed out of the world: no boom\n      g.shell = null;\n      g.boomFx = null;\n      g.phase = 'boom';\n      g.endsAt = now() + 300;\n      return;\n    }\n    if (sh.y >= g.heights[cannonColAt(sh.x)]) { resolveBoom(room, sh.x, g.heights[cannonColAt(sh.x)]); return; }\n  }\n  sh.trail.push({ x: Math.round(sh.x * 100) / 100, y: Math.round(sh.y * 100) / 100 });\n  if (sh.trail.length > 80) sh.trail = sh.trail.slice(-80);\n  if (now() - sh.born > 12000) {\n    g.shell = null;\n    g.boomFx = null;\n    g.phase = 'boom';\n    g.endsAt = now() + 300;\n  }\n}\nfunction resolveBoom(room, ix, iy) {\n  const g = room.game;\n  const B = BALLISTICS;\n  const by = g.shell ? g.shell.by : null;\n  const hits = {};\n  room.players.forEach((p) => {\n    const c = g.cannons[p.seat];\n    if (!c || !c.alive) return;\n    const d = Math.hypot(ix - c.x, iy - (c.y - 0.4));\n    if (d < B.blastR) {\n      const dmg = Math.round(B.dmgMax * (1 - d / B.blastR));\n      if (dmg > 0) {\n        hits[p.seat] = dmg;\n        c.hp -= dmg;\n        if (by != null && by !== p.seat) g.dmgDealt[by] = (g.dmgDealt[by] || 0) + dmg;\n      }\n    }\n  });\n  for (let i = 0; i < CANNON_COLS; i++) {\n    const cx = -16 + (i + 0.5) * 0.2;\n    const dx = Math.abs(cx - ix);\n    if (dx < B.blastR) {\n      const depth = Math.sqrt(B.blastR * B.blastR - dx * dx);\n      const target = Math.min(7.6, iy + depth);\n      if (target > g.heights[i]) g.heights[i] = Math.round(target * 100) / 100;\n    }\n  }\n  room.players.forEach((p) => {\n    const c = g.cannons[p.seat];\n    if (!c || !c.alive) return;\n    c.y = g.heights[c.col];\n    if (c.hp <= 0) {\n      c.alive = false;\n      c.hp = 0;\n      g.elimOrder.push(p.seat);\n    }\n  });\n  g.lastImpact = { x: Math.round(ix * 100) / 100, y: Math.round(iy * 100) / 100, by };\n  g.boomFx = { x: g.lastImpact.x, y: g.lastImpact.y, hits, at: now() };\n  g.shell = null;\n  g.phase = 'boom';\n  g.endsAt = now() + CANNON_BOOM_MS;\n}\nfunction cannonBotAim(room, p) {\n  const g = room.game;\n  const c = g.cannons[p.seat];\n  if (!c) return;\n  let tgt = null, td = 1e9;\n  room.players.forEach((q) => {\n    if (q.seat === p.seat) return;\n    const qc = g.cannons[q.seat];\n    if (qc && qc.alive && Math.abs(qc.x - c.x) < td) { td = Math.abs(qc.x - c.x); tgt = qc; }\n  });\n  if (!tgt) return;\n  const B = BALLISTICS;\n  const ox = c.x, oy = c.y - 0.4;\n  const R = Math.abs(tgt.x - ox), dy = (tgt.y - 0.4) - oy; // +dy: the target sits lower\n  let solved = null;\n  for (const deg of [45, 55, 65, 35]) {\n    const rad = (deg * Math.PI) / 180;\n    const denom = Math.cos(rad) * Math.cos(rad) * (dy + R * Math.tan(rad));\n    if (denom <= 0.01) continue;\n    const v2 = (0.5 * B.grav * R * R) / denom;\n    if (v2 <= 0) continue;\n    const v = Math.sqrt(v2);\n    if (v <= B.maxV * 1.02) { solved = { angle: deg, v }; break; }\n  }\n  if (!solved) solved = { angle: 45, v: B.maxV };\n  let angle = solved.angle;\n  let power = Math.max(4, Math.min(100, Math.round((solved.v / B.maxV) * 100)));\n  // Shot-walking: correct by my last shot's landing offset (the\n  // memory is only honoured against the same intended target area).\n  const li = g.lastImpact;\n  if (li && li.by === p.seat && p.difficulty !== 'de') {\n    const off = li.x - tgt.x;\n    const fix = p.difficulty === 'kho' ? 1 : 0.5;\n    power = Math.max(4, Math.min(100, Math.round(power - off * 2.2 * fix)));\n  }\n  const err = p.difficulty === 'kho' ? [2, 3] : p.difficulty === 'vua' ? [5, 6] : [10, 12];\n  angle = Math.max(5, Math.min(85, angle + rand(-err[0], err[0])));\n  power = Math.max(4, Math.min(100, power + rand(-err[1], err[1])));\n  c.face = tgt.x >= c.x ? 1 : -1;\n  c.angle = Math.round(angle * 10) / 10;\n  c.power = Math.round(power);\n}\nfunction finishCannon(room) {\n  const g = room.game;\n  const aliveRanked = room.players.filter((p) => g.cannons[p.seat] && g.cannons[p.seat].alive)\n    .sort((a, b) => (g.cannons[b.seat].hp - g.cannons[a.seat].hp)\n      || ((g.dmgDealt[b.seat] || 0) - (g.dmgDealt[a.seat] || 0)) || (a.seat - b.seat));\n  const elimRanked = g.elimOrder.slice().reverse().map((seat) => playerAt(room, seat)).filter(Boolean);\n  const ranking = aliveRanked.concat(elimRanked);\n  const entries = ranking.map((p, i) => ({\n    seat: p.seat, points: placementAt(i),\n    hp: Math.max(0, g.cannons[p.seat].hp), dmgDealt: g.dmgDealt[p.seat] || 0, alive: g.cannons[p.seat].alive,\n  }));\n  entries.forEach((e) => { g.points[e.seat] = (g.points[e.seat] || 0) + e.points; });\n  g.lastRound = { round: 1, entries };\n  endGame(room);\n}\n\nfunction blobsView(room) {\n  const g = room.game;\n  const out = {};\n  room.players.forEach((p) => {\n    const b = g.blobs ? g.blobs[p.seat] : null;\n    if (b) out[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 };\n  });\n  return out;\n}\nfunction facingView(room) {\n  const g = room.game;\n  const out = {};\n  room.players.forEach((p) => {\n    const f = g.facing ? g.facing[p.seat] : null;\n    if (f) out[p.seat] = { x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100 };\n  });\n  return out;\n}\nfunction shellsView(room) {\n  const g = room.game;\n  return (g.shells || []).map((s) => ({ id: s.id, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, vx: s.vx, vy: s.vy }));\n}\n\nfunction gameView(room, role, seat, t) {\n  const g = room.game;\n  const v = {\n    id: g.id, name: GAMES[g.id].name, round: g.round, totalRounds: g.totalRounds,\n    phase: g.phase, endsAt: g.endsAt, finalRound: isFinalRound(g), points: g.points, lastRound: g.lastRound,\n  };\n  if (g.id === 'do-vui') {\n    if (g.phase === 'question' || g.phase === 'reveal') {\n      v.question = g.current.q; v.options = g.current.options;\n      const answered = {};\n      room.players.forEach((p) => {\n        if (p.type === 'human') answered[p.seat] = !!g.inputs[p.seat];\n        else { const plan = g.botPlan[p.seat]; answered[p.seat] = !!plan && plan.at <= t; }\n      });\n      v.answered = answered;\n    }\n    if (g.phase === 'reveal') v.reveal = g.reveal;\n    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? inp.choice : null; v.myStreak = g.streaks[seat] || 0; }\n  } else if (g.id === 'day-ra') {\n    v.arenaR = g.arenaR;\n    v.blobs = {};\n    room.players.forEach((p) => {\n      const b = g.blobs ? g.blobs[p.seat] : null;\n      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }\n    });\n  } else if (g.id === 'ne-dan') {\n    v.arenaR = ARENA_R0;\n    v.blobs = {};\n    room.players.forEach((p) => {\n      const b = g.blobs ? g.blobs[p.seat] : null;\n      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }\n    });\n    v.balls = (g.balls || []).map((b) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, vx: Math.round(b.vx * 100) / 100, vy: Math.round(b.vy * 100) / 100 }));\n  } else if (g.id === 'keo-co') {\n    v.teams = g.teams;\n    v.presses = g.presses;\n    v.knot = tugKnot(room);\n    v.phaseDur = TUG_MS;\n  } else if (g.id === 'chia-cuop') {\n    v.pair = g.pair;\n    v.pot = isFinalRound(g) ? POT * 2 : POT;\n    v.phaseDur = g.phase === 'talk' ? TALK_MS : g.phase === 'choose' ? CHOOSE_MS : 0;\n    v.chat = (g.pair || []).filter((s) => g.chat && g.chat[s]).map((s) => ({ seat: s, text: g.chat[s].text }));\n    const chosen = {};\n    (g.pair || []).forEach((s) => { chosen[s] = !!g.inputs[s]; });\n    v.chosen = chosen;\n    // Secrecy rule: no choice values in ANY view before the reveal phase;\n    // a player only ever sees that they themselves have locked in.\n    if (g.phase === 'reveal') v.reveal = g.reveal;\n    if (seat) v.mineChosen = !!(g.pair && g.pair.indexOf(seat) >= 0 && g.inputs[seat]);\n  } else if (g.id === 'cuop-sao') {\n    v.arenaR = ARENA_R0;\n    v.blobs = {};\n    room.players.forEach((p) => {\n      const b = g.blobs ? g.blobs[p.seat] : null;\n      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }\n    });\n    v.stars = (g.stars || []).map((s) => ({ id: s.id, x: s.x, y: s.y, gold: s.gold }));\n    v.banked = g.banked;\n    if (seat) v.mine = g.banked[seat] || 0;\n  } else if (g.id === 'giu-vuong-mien') {\n    v.arenaR = ARENA_R0;\n    v.blobs = {};\n    room.players.forEach((p) => {\n      const b = g.blobs ? g.blobs[p.seat] : null;\n      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }\n    });\n    v.hold = g.hold;\n    v.crown = g.crown ? { holder: g.crown.holder, x: Math.round(g.crown.x * 100) / 100, y: Math.round(g.crown.y * 100) / 100 } : null;\n    if (seat) { v.mine = g.hold[seat] || 0; v.myCrown = !!g.crown && g.crown.holder === seat; }\n  } else if (g.id === 'son-san') {\n    v.arenaR = ARENA_R0;\n    v.blobs = {};\n    room.players.forEach((p) => {\n      const b = g.blobs ? g.blobs[p.seat] : null;\n      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }\n    });\n    v.grid = g.grid;\n    v.counts = splatCounts(room);\n    if (seat) v.mine = v.counts[seat] || 0;\n  } else if (g.id === 'cao-boi') {\n    const status = {};\n    room.players.forEach((p) => {\n      if (p.type === 'human') { const inp = g.inputs[p.seat]; status[p.seat] = inp ? (inp.foul ? 'foul' : 'fired') : 'waiting'; }\n      else {\n        const plan = g.botPlan[p.seat] || {};\n        if (plan.earlyAt && plan.earlyAt <= t) status[p.seat] = 'foul';\n        else if (plan.tapAt && plan.tapAt <= t && g.phase !== 'wait') status[p.seat] = 'fired';\n        else status[p.seat] = 'waiting';\n      }\n    });\n    v.status = status;\n    if (seat) { const inp = g.inputs[seat]; v.mine = inp ? (inp.foul ? 'foul' : 'fired') : 'waiting'; }\n  } else if (g.id === 'chung-mot-than') {\n    v.arenaR = ARENA_R0;\n    v.owners = g.owners;\n    v.shared = g.shared ? { x: Math.round(g.shared.x * 100) / 100, y: Math.round(g.shared.y * 100) / 100, vx: g.shared.vx || 0, vy: g.shared.vy || 0 } : null;\n    v.star = g.star ? { x: g.star.x, y: g.star.y } : null;\n    v.hearts = g.hearts;\n    v.checks = g.checks;\n    v.balls = (g.balls || []).map((b) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, vx: Math.round(b.vx * 100) / 100, vy: Math.round(b.vy * 100) / 100 }));\n    if (seat) v.myDirs = ['u', 'r', 'd', 'l'].filter((d) => g.owners && g.owners[d] === seat);\n  } else if (g.id === 'day-hop') {\n    v.arenaR = ARENA_R0;\n    v.blobs = {};\n    room.players.forEach((p) => {\n      const b = g.blobs ? g.blobs[p.seat] : null;\n      if (b) { v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive, vx: b.vx || 0, vy: b.vy || 0 }; if (p.type === 'human') v.blobs[p.seat].pm = padMask(g.pad && g.pad[p.seat]); }\n    });\n    v.crate = g.crate ? { x: g.crate.x, y: g.crate.y, vx: g.crate.vx || 0, vy: g.crate.vy || 0 } : null;\n    v.goal = g.goal;\n    v.walls = g.walls;\n    v.layout = g.layout;\n    v.deliveries = g.deliveries;\n    v.phaseDur = BOX_MS;\n  } else if (g.id === 'cheo-thuyen') {\n    const el = Math.max(0, t - g.rowStart);\n    v.distance = Math.round(g.distance * 10) / 10;\n    v.course = ROW_COURSE;\n    v.perfect = ROW_PERFECT;\n    v.beat = Math.min(ROW_BEATS, Math.floor(el / ROW_BEAT_MS) + 1);\n    v.beats = ROW_BEATS;\n    v.rowStart = g.rowStart;\n    v.nextBeatAt = Math.min(g.endsAt, g.rowStart + (Math.floor(el / ROW_BEAT_MS) + 1) * ROW_BEAT_MS);\n    v.hits = g.hits;\n    v.splash = g.splash;\n    if (seat) { v.mine = g.hits[seat] || 0; v.mySplash = g.splash[seat] || 0; }\n  } else if (g.id === 'xe-tank') {\n    v.arenaR = ARENA_R0;\n    v.blobs = blobsView(room);\n    v.facing = facingView(room);\n    v.blocks = TANK_BLOCKS;\n    v.shells = shellsView(room);\n  } else if (g.id === 'dat-bom') {\n    v.arenaR = ARENA_R0;\n    v.blobs = blobsView(room);\n    v.hard = g.hardCells;\n    v.soft = g.softCells;\n    v.bombs = (g.bombs || []).map((b) => ({ id: b.id, x: b.x, y: b.y, left: Math.max(0, (b.boomTick - g.tickCount) * TICK_MS) }));\n    v.blasts = (g.blasts || []).filter((bl) => bl.until > t).map((bl) => ({ cells: bl.cells }));\n  } else if (g.id === 'ke-gia-mao') {\n    // SECRECY (hard rule, asserted in tests by string search): before\n    // the reveal phase NO view — host or player — may carry the other\n    // question's text or anyone's answer. A player view carries only\n    // that player's own question + the shared options; the host gets\n    // category + answered/voted status only. Chat is public by design.\n    const pair = g.imp ? IMPOSTOR_BANK[g.imp.pair] : null;\n    v.category = pair ? pair.cat : '';\n    v.phaseDur = g.phase === 'answer' ? IMP_ANSWER_MS : g.phase === 'discuss' ? IMP_DISCUSS_MS : g.phase === 'vote' ? IMP_VOTE_MS : IMP_REVEAL_MS;\n    const answered = {}; const voted = {};\n    room.players.forEach((p) => {\n      answered[p.seat] = p.type === 'human' ? !!g.inputs[p.seat] : !!(g.botPlan[p.seat] && g.botPlan[p.seat].answerAt <= t);\n      voted[p.seat] = g.votes[p.seat] != null;\n    });\n    v.answered = answered; v.voted = voted;\n    if (g.phase === 'discuss' || g.phase === 'vote' || g.phase === 'reveal') v.chatLog = g.chatLog || [];\n    if (g.phase === 'reveal' && g.reveal && pair) {\n      v.reveal = {\n        impostor: g.reveal.impostor, caught: g.reveal.caught,\n        realQ: pair.real, fakeQ: pair.fake, options: pair.options,\n        votes: g.reveal.votes, answers: g.reveal.answers, points: g.reveal.points,\n      };\n    }\n    if (seat) {\n      if (pair) {\n        v.myQuestion = g.imp.seat === seat ? pair.fake : pair.real;\n        v.options = pair.options;\n      }\n      v.mine = g.inputs[seat] ? g.inputs[seat].choice : null;\n      v.myVote = g.votes[seat] != null ? g.votes[seat] : null;\n    }\n  } else if (g.id === 'ma-soi') {\n    // SECRECY (hard rule, asserted in tests by string search): before\n    // the wolfEnd phase NO view — host or player — may carry another\n    // player's role or any night choice. Public facts only: who is\n    // alive, the death record (roles are public FROM DEATH ON), the\n    // day's chat, vote-cast flags, and after the vote the tally + the\n    // execution. A phone additionally sees ONLY its own private kit:\n    // its role; a wolf sees the pack list + pack votes-in count; the\n    // guard its own pick; the seer its own notes; the witch (once the\n    // pack has locked) the victim + her own potion state. Death cuts\n    // a phone back to its role card + public facts.\n    const w = g.wolf;\n    v.phaseDur = g.phase === 'night' ? WOLF_NIGHT_MS : g.phase === 'dawn' ? WOLF_DAWN_MS\n      : g.phase === 'discuss' ? WOLF_DISCUSS_MS : g.phase === 'vote' ? WOLF_VOTE_MS\n      : g.phase === 'execute' ? WOLF_EXEC_MS : WOLF_END_MS;\n    v.night = g.round;\n    v.aliveMap = {};\n    room.players.forEach((p) => { v.aliveMap[p.seat] = w ? !!w.alive[p.seat] : true; });\n    v.deadList = w ? w.deaths.map((d) => ({ seat: d.seat, role: d.role, cause: d.cause, night: d.night })) : [];\n    v.dawnDeaths = w ? w.dawnDeaths.map((d) => ({ seat: d.seat, role: d.role })) : [];\n    v.wolfCount = w ? room.players.filter((p) => w.roles[p.seat] === 'soi').length : 0;\n    if (g.phase === 'discuss' || g.phase === 'vote' || g.phase === 'execute' || g.phase === 'wolfEnd') v.chatLog = g.chatLog || [];\n    if (g.phase === 'vote') {\n      v.voted = {};\n      room.players.forEach((p) => { v.voted[p.seat] = g.votes[p.seat] != null; });\n    }\n    if (g.phase === 'execute' || g.phase === 'wolfEnd') { v.exec = w.exec; v.voteTally = w.voteTally || {}; }\n    if (g.phase === 'wolfEnd') { v.winner = w.winner; v.roles = Object.assign({}, w.roles); }\n    if (seat && w) {\n      v.myRole = w.roles[seat];\n      v.myAlive = !!w.alive[seat];\n      if (w.alive[seat]) {\n        if (w.roles[seat] === 'soi') {\n          v.wolfTeam = room.players.filter((p) => w.roles[p.seat] === 'soi').map((p) => p.seat);\n          v.myWolfVote = w.wolfVotes[seat] != null ? w.wolfVotes[seat] : null;\n          v.wolfVotesIn = Object.keys(w.wolfVotes).length;\n        } else if (w.roles[seat] === 'bao-ve') {\n          v.myGuardPick = w.guardPick;\n          v.myGuardLast = w.guardLast;\n        } else if (w.roles[seat] === 'tien-tri') {\n          v.mySeerPick = w.seerPick;\n          const notes = w.seerNotes[seat] || {};\n          v.mySeerNotes = Object.keys(notes).map((s) => ({ seat: +s, wolf: !!notes[s] }));\n        } else if (w.roles[seat] === 'phu-thuy') {\n          v.mySaveLeft = w.saveLeft;\n          v.myPoisonLeft = w.poisonLeft;\n          v.myWitchSave = w.witch.save;\n          v.myWitchPoison = w.witch.poison;\n          v.myWitchDone = w.witch.done;\n          v.wolvesIn = wolfWolvesIn(room);\n          v.myVictim = v.wolvesIn ? wolfVictim(room) : null;\n        }\n      }\n    }\n  } else if (g.id === 'ca-ngua') {\n    const ng = g.ng;\n    v.phaseDur = NGUA_TURN_MS;\n    v.board = { loop: NGUA_LOOP, stretch: NGUA_STRETCH, stable: NGUA_STABLE, safe: Array.from(NGUA_SAFE) };\n    v.horses = ng ? ng.horses : {};\n    v.boards = ng ? ng.boards : {};\n    v.turn = ng ? ng.turn : null;\n    v.dice = ng ? ng.dice : null;\n    v.winner = ng ? ng.winner : null;\n    v.last = ng ? ng.last : null;\n    v.log = ng ? ng.log : [];\n    v.progress = {};\n    if (ng) room.players.forEach((p) => { v.progress[p.seat] = nguaProgress(room, p.seat); });\n    if (seat) {\n      v.myTurn = !!ng && ng.turn === seat;\n      v.myLegal = (ng && g.phase === 'pick' && ng.turn === seat)\n        ? ng.legal.map((h) => ({ horse: h, hint: nguaHint(room, seat, h), from: ng.horses[seat][h] }))\n        : [];\n    }\n  } else if (g.id === 'tien-len') {\n    // SECRECY: hand contents exist ONLY in the seat's own branch\n    // below. Every other field is public table talk: how many cards\n    // each player holds, the face-up table play, who passed, who\n    // finished, and the log.\n    const tl = g.tl;\n    v.phaseDur = TL_TURN_MS;\n    v.counts = {};\n    if (tl) room.players.forEach((p) => { v.counts[p.seat] = (tl.hands[p.seat] || []).length; });\n    v.table = tl && tl.table ? { seat: tl.table.seat, cards: tl.table.cards.slice(), kind: tl.table.kind, len: tl.table.len, top: tl.table.top } : null;\n    v.turn = tl ? tl.turn : null;\n    v.leader = tl ? tl.leader : null;\n    v.passed = tl ? Object.assign({}, tl.passed) : {};\n    v.finished = tl ? tl.finished.slice() : [];\n    v.log = tl ? tl.log.slice() : [];\n    v.firstPlay = tl ? !!tl.firstPlay : false;\n    v.turnEndsAt = tl ? tl.turnEndsAt : 0;\n    v.instantWin = tl && tl.instantWin ? { seat: tl.instantWin.seat, kind: tl.instantWin.kind } : null;\n    v.winner = tl ? tl.winner : null;\n    if (seat) {\n      v.myHand = tl && tl.hands[seat] ? tl.hands[seat].slice() : [];\n      v.myTurn = !!tl && g.phase === 'cards' && tl.turn === seat;\n      v.myPassed = !!tl && !!tl.passed[seat];\n      v.mustInclude3 = !!tl && tl.firstPlay && tl.turn === seat && (tl.hands[seat] || []).indexOf(0) >= 0;\n      const fi = tl ? tl.finished.indexOf(seat) : -1;\n      v.myRank = fi >= 0 ? fi + 1 : null;\n    }\n  } else if (g.id === 'thu-thanh') {\n    v.arenaR = ARENA_R0;\n    v.blobs = blobsView(room);\n    v.facing = facingView(room);\n    v.shells = shellsView(room);\n    v.slimes = (g.slimes || []).map((s) => ({ id: s.id, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, hp: s.hp, maxHp: s.maxHp, big: s.big, vx: Math.round((s.vx || 0) * 100) / 100, vy: Math.round((s.vy || 0) * 100) / 100 }));\n    v.crystal = g.crystal ? { hp: g.crystal.hp, max: DEF_CRYSTAL_HP } : null;\n    v.kills = g.kills;\n  } else if (g.id === 'giai-ma-chung') {\n    // SECRECY: the host view carries level/hearts/progress counts only\n    // — never a step's symbol or owner. A player view lists ONLY their\n    // own steps (position + symbol); nobody sees anyone else's steps.\n    v.level = g.level;\n    v.hearts = g.hearts;\n    v.total = g.seq ? g.seq.length : 0;\n    v.done = g.phase === 'levelup' ? v.total : g.stepIdx;\n    v.levelsDone = g.levelsDone;\n    v.phaseDur = DECODE_MS;\n    if (seat) {\n      v.mySteps = (g.seq || []).filter((s) => s.seat === seat)\n        .map((s) => ({ pos: g.seq.indexOf(s) + 1, sym: s.sym, name: DECODE_SYMBOLS[s.sym].name }));\n    }\n  } else if (g.id === 'nguoi-que') {\n    v.phaseDur = FIGHT_MS;\n    v.platforms = FIGHT_PLATFORMS;\n    v.blobs = {};\n    if (g.blobs) room.players.forEach((p) => {\n      const b = g.blobs[p.seat];\n      if (!b) return;\n      v.blobs[p.seat] = {\n        x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive,\n        dmg: g.dmg[p.seat] || 0, face: g.face[p.seat] || 1,\n        vx: Math.round((b.vx || 0) * 100) / 100, vy: Math.round((b.vy || 0) * 100) / 100, ground: !!b.ground,\n        atk: (g.atkT[p.seat] || 0) > 0, hvy: (g.hvyT[p.seat] || 0) > 0, hit: (g.hitT[p.seat] || 0) > 0,\n        invuln: (g.invuln[p.seat] || 0) > 0, dash: (g.dashT[p.seat] || 0) > 0,\n      };\n    });\n    if (seat != null) v.myDmg = g.dmg[seat] || 0;\n  } else if (g.id === 'den-lua-nuoc') {\n    v.phaseDur = TEMP_MS;\n    v.solids = TEMPLE_LEVEL.solids;\n    v.pools = TEMPLE_LEVEL.pools;\n    v.gates = TEMPLE_LEVEL.gates;\n    v.buttons = TEMPLE_LEVEL.buttons;\n    v.doors = TEMPLE_LEVEL.doors;\n    v.gateOpen = !!g.gateOpen;\n    v.hearts = g.hearts;\n    v.gemCount = g.gemCount || { lua: 0, nuoc: 0 };\n    v.gemsTotal = TEMP_GEMS_TOTAL;\n    v.gems = (g.gems || []).map((gm, i) => ({ id: i, x: gm.x, y: gm.y, el: gm.el, taken: !!gm.taken }));\n    v.chars = {};\n    if (g.chars) room.players.forEach((p) => {\n      const c = g.chars[p.seat];\n      if (c) v.chars[p.seat] = { x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, el: c.el, home: !!c.home, ground: !!c.ground, vx: Math.round((c.vx || 0) * 100) / 100, vy: Math.round((c.vy || 0) * 100) / 100 };\n    });\n    if (seat != null) {\n      v.myEl = g.elOf[seat] || null;\n      v.myHome = !!(g.chars && g.chars[seat] && g.chars[seat].home);\n    }\n  } else if (g.id === 'da-bong') {\n    v.phaseDur = SOCCER_MS;\n    v.solids = SOCCER_SOLIDS;\n    v.teams = {};\n    v.blobs = {};\n    if (g.blobs) room.players.forEach((p) => {\n      const b = g.blobs[p.seat];\n      v.teams[p.seat] = soccerTeam(p.seat);\n      if (b) v.blobs[p.seat] = {\n        x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, alive: true,\n        face: g.face[p.seat] || 1, ground: !!b.ground, dash: (g.dashT[p.seat] || 0) > 0,\n        team: soccerTeam(p.seat), vx: Math.round((b.vx || 0) * 100) / 100, vy: Math.round((b.vy || 0) * 100) / 100,\n      };\n    });\n    v.ball = g.ball ? { x: Math.round(g.ball.x * 100) / 100, y: Math.round(g.ball.y * 100) / 100, vx: Math.round(g.ball.vx * 100) / 100, vy: Math.round(g.ball.vy * 100) / 100 } : null;\n    v.scoreboard = { do: (g.score && g.score.do) || 0, xanh: (g.score && g.score.xanh) || 0 };\n    v.goalInfo = g.phase === 'goal' ? g.goalInfo : null;\n    if (seat != null) v.myTeam = soccerTeam(seat);\n  } else if (g.id === 'ech-op') {\n    const L = FROG_LEVELS[(g.chamber || 1) - 1];\n    v.phaseDur = FROG_PER_MS;\n    v.chamber = g.chamber || 1;\n    v.chambersTotal = FROG_LEVELS.length;\n    v.solids = FROG_WALLS.concat(L.solids);\n    v.spikes = L.spikes;\n    v.door = L.door;\n    v.hearts = g.hearts;\n    v.fliesEaten = g.fliesEaten || 0;\n    v.fliesTotal = FROG_LEVELS.length * 3;\n    v.flies = (g.flies || []).map((fl, i) => ({ id: i, x: fl.x, y: fl.y, taken: !!fl.taken }));\n    v.crates = (g.crates || []).map((c, i) => ({ id: i, x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, vx: Math.round((c.vx || 0) * 100) / 100, vy: Math.round((c.vy || 0) * 100) / 100 }));\n    v.frogs = {};\n    if (g.frogs) room.players.forEach((p) => {\n      const f = g.frogs[p.seat];\n      if (!f) return;\n      v.frogs[p.seat] = {\n        x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100, vx: Math.round((f.vx || 0) * 100) / 100, vy: Math.round((f.vy || 0) * 100) / 100,\n        face: g.face[p.seat] || 1, ground: !!f.ground,\n        state: f.by != null ? 'in' : f.belly != null ? 'carry' : 'free',\n        bellySeat: f.belly != null ? f.belly : null,\n        carrierSeat: f.by != null ? f.by : null,\n        atDoor: f.by == null && platOverlap(f, L.door),\n      };\n    });\n    if (seat != null && g.frogs && g.frogs[seat]) {\n      const mf = g.frogs[seat];\n      v.myState = mf.by != null ? 'in' : mf.belly != null ? 'carry' : 'free';\n      v.myCarrierSeat = mf.by != null ? mf.by : null;\n      v.myPassengerSeat = mf.belly != null ? mf.belly : null;\n      v.myDoor = v.myState !== 'in' && platOverlap(mf, L.door);\n    }\n  } else if (g.id === 'can-goc') {\n    v.phaseDur = CANNON_AIM_MS;\n    v.heights = g.heights || [];\n    v.wind = g.wind || 0;\n    v.turn = g.turnSeat;\n    v.cannons = {};\n    if (g.cannons) room.players.forEach((p) => {\n      const c = g.cannons[p.seat];\n      if (c) v.cannons[p.seat] = {\n        x: c.x, y: c.y, hp: Math.max(0, c.hp), alive: !!c.alive,\n        face: c.face, angle: Math.round(c.angle * 10) / 10, power: Math.round(c.power),\n      };\n    });\n    v.shell = g.shell ? {\n      x: Math.round(g.shell.x * 100) / 100, y: Math.round(g.shell.y * 100) / 100,\n      vx: Math.round(g.shell.vx * 100) / 100, vy: Math.round(g.shell.vy * 100) / 100,\n      trail: g.shell.trail || [],\n    } : null;\n    v.boom = g.phase === 'boom' && g.boomFx ? { x: g.boomFx.x, y: g.boomFx.y, hits: g.boomFx.hits, at: g.boomFx.at } : null;\n    if (seat != null) {\n      v.myTurn = g.turnSeat === seat && g.phase === 'aim';\n      const mc = g.cannons ? g.cannons[seat] : null;\n      v.myCannon = mc ? { angle: Math.round(mc.angle * 10) / 10, power: Math.round(mc.power), face: mc.face, hp: Math.max(0, mc.hp), alive: !!mc.alive } : null;\n    }\n  }\n  return v;\n}\nfunction buildView(room, role, seat) {\n  const t = now();\n  const st = standingsOf(room);\n  const players = room.players.map((p) => ({\n    seat: p.seat, name: p.name, type: p.type,\n    difficulty: p.type === 'bot' ? p.difficulty : undefined,\n    diffLabel: p.type === 'bot' ? DIFF_LABELS[p.difficulty] : undefined,\n    color: SEAT_COLORS[p.seat - 1], score: p.score, liveScore: liveScore(room, p), mood: moodOf(room, p),\n    local: p.local ? true : undefined,\n    scheme: p.local ? p.scheme : undefined,\n    hostSeat: p.hostSeat ? true : undefined,\n  }));\n  let gap = null;\n  if (st.length >= 2) {\n    gap = { topSeat: st[0], secondSeat: st[1], diff: liveScore(room, playerAt(room, st[0])) - liveScore(room, playerAt(room, st[1])) };\n  }\n  const view = {\n    ok: true, serverNow: t, code: room.code, phase: room.phase, localPlay: room.localPlay ? true : undefined, players, standings: st, gap,\n    bubble: room.bubble && room.bubble.until > t ? { seat: room.bubble.seat, text: room.bubble.text } : null,\n    // The 25-game catalog is chooser furniture (lobby/choosing and the\n    // results/podium/final screens that lead back to it). During play\n    // it is half the state payload and nothing reads it — every\n    // playing-phase read goes through v.game — so it ships empty and\n    // returns the moment the phase leaves 'playing'.\n    games: room.phase === 'playing' ? [] : Object.keys(GAMES).map((id) => ({ id, name: GAMES[id].name, desc: GAMES[id].desc, rounds: GAMES[id].rounds, cat: GAMES[id].cat, min: minSeats(id), max: maxSeats(id) })),\n    playlist: playlistView(room, t),\n    game: room.game ? gameView(room, role, seat, t) : null,\n    lastGame: room.lastGame,\n    you: seat ? { seat } : null,\n  };\n  if (role === 'host') {\n    // Keyboard (\"local\") seats live on THIS screen, so the host view\n    // carries their mapping (all phases) and — while a game runs — each\n    // local seat's own player view, built by the very same gameView a\n    // phone would get: their secret question/role/legal moves are theirs\n    // to peek at on the big screen. SECRECY INVARIANT: localViews keys\n    // are exactly the local seats; a PHONE player's private view is\n    // never built for the host.\n    view.locals = room.players.filter((p) => p.local).map((p) => ({ seat: p.seat, scheme: p.scheme }));\n    if (room.game) {\n      view.localViews = {};\n      room.players.forEach((p) => {\n        if (p.local) view.localViews[p.seat] = gameView(room, 'player', p.seat, t);\n      });\n      // Phone mode: the host may also SIT in the room (hostSeat — the\n      // room was created on their phone and they play from the same\n      // screen). Their own player view rides along under the same\n      // gating as localViews, so the host page can render a \"my seat\"\n      // section. SECRECY INVARIANT: myView is built for the hostSeat\n      // ONLY — no other player's private view is ever attached here.\n      const hs = room.players.find((p) => p.hostSeat);\n      if (hs) view.myView = gameView(room, 'player', hs.seat, t);\n    }\n  }\n  return view;\n}\n\n// ---------------------------------------------------------------------------\n// Actions\n// ---------------------------------------------------------------------------\nfunction startCheck(room) {\n  if (humanCount(room) < 1) return 'Cần ít nhất 1 người chơi bằng điện thoại mới bắt đầu được.';\n  if (room.players.length < 2) return 'Cần ít nhất 2 người chơi (thêm Máy hoặc rủ thêm bạn).';\n  return null;\n}\n// Seat gate per game: every game declares [min, max] in GAMES (Kẻ Giả\n// Mạo needs a real vote so 3 minimum; Ma Sói needs a village so 4;\n// arenas cap at 8; Cờ Cá Ngựa is a 4-colour board…).\nfunction minSeats(id) { return GAMES[id] ? GAMES[id].min : 2; }\nfunction maxSeats(id) { return GAMES[id] ? GAMES[id].max : MAX_SEATS; }\n// Could this game start right now in this room? Used by playlist\n// queueing (filter) and by the intermission auto-start (skip).\nfunction gamePlayable(room, id) {\n  if (!GAMES[id]) return false;\n  if (room.players.length < minSeats(id) || room.players.length > maxSeats(id)) return false;\n  return !startCheck(room);\n}\nfunction clearPlaylist(room) { room.playlist = null; room.playlistNextAt = null; }\n// Playlist progress for the room view (both roles read the same shape;\n// additive only — older clients just ignore it). pos is the 1-based\n// position of the game playing now, or of the one about to auto-start\n// during the intermission; nextName skips entries that are no longer\n// playable so the TV never promises a game that will be skipped.\nfunction playlistView(room, t) {\n  const pl = room.playlist;\n  if (!pl || !pl.queue || !pl.queue.length) return { active: false };\n  let nextIdx = -1;\n  for (let i = pl.idx + 1; i < pl.queue.length; i++) {\n    if (gamePlayable(room, pl.queue[i])) { nextIdx = i; break; }\n  }\n  const intermission = !!room.playlistNextAt;\n  return {\n    active: true,\n    pos: Math.min((intermission && nextIdx >= 0 ? nextIdx : pl.idx) + 1, pl.queue.length),\n    total: pl.queue.length,\n    nextName: nextIdx >= 0 ? GAMES[pl.queue[nextIdx]].name : null,\n    nextInSec: intermission ? Math.max(0, Math.ceil((room.playlistNextAt - t) / 1000)) : null,\n  };\n}\n// Host-relayed input for a seat that lives on the host screen: when\n// the host page sends an action with body.forSeat set, it lands on that\n// seat via playerAction. Relayable seats are the keyboard (\"local\")\n// seats and the host's OWN seat (hostSeat, phone mode) — never a bot\n// (bots take no input) and NEVER a phone player's seat (their inputs\n// are theirs alone; the host token must not become a skeleton key for\n// every seat in the room). Host actions without forSeat go to\n// hostAction exactly as before. The rejection text mentions keyboards\n// because that is the original relay; it only ever fires for\n// phone/bot/empty targets, never for the host's own seat.\nfunction hostDispatch(room, body) {\n  if (Number.isInteger(body.forSeat)) {\n    const target = room.players.find((p) => p.seat === body.forSeat && (p.local || p.hostSeat));\n    if (!target) return 'Ghế này không phải người chơi bàn phím.';\n    return playerAction(room, target, body);\n  }\n  return hostAction(room, body);\n}\nfunction hostAction(room, body) {\n  const a = body.action;\n  if (a === 'localPlay') {\n    // LOCAL PLAY marker: the host page is running the current game\n    // in-page (rooms with no remote players). The server room stays\n    // the membership shell; the flag only informs other surfaces.\n    if (body.on) room.localPlay = true; else delete room.localPlay;\n    return null;\n  }\n  if (a === 'syncLocalResults') {\n    // A locally-played game finished on the host page: fold its\n    // per-seat score deltas into the room totals and mirror the\n    // results phase, so every surface agrees on the standings.\n    if (room.game) return 'Đang có ván trên máy chủ.';\n    // Bots the local game added (quickStart fill) join the server\n    // roster first, so their deltas land and a rematch sees the\n    // same headcount the local game played with.\n    if (Array.isArray(body.bots)) {\n      for (const b of body.bots) {\n        const seat = b && b.seat;\n        if (!Number.isInteger(seat) || seat < 2 || seat > MAX_SEATS || playerAt(room, seat)) continue;\n        room.players.push({ seat, type: 'bot', name: 'Máy', difficulty: DIFFS.includes(b.difficulty) ? b.difficulty : 'vua', score: 0 });\n      }\n      room.players.sort((x, y) => x.seat - y.seat);\n    }\n    const deltas = body.deltas && typeof body.deltas === 'object' ? body.deltas : {};\n    for (const seatKey of Object.keys(deltas)) {\n      const seat = parseInt(seatKey, 10);\n      const d = Math.round(Number(deltas[seatKey]) || 0);\n      if (!Number.isInteger(seat) || !d) continue;\n      const p = playerAt(room, seat);\n      if (p) p.score += Math.max(-100000, Math.min(100000, d));\n    }\n    if (body.lastGame && typeof body.lastGame === 'object' && typeof body.lastGame.id === 'string') room.lastGame = body.lastGame;\n    room.phase = 'results';\n    room.playlistNextAt = null;\n    delete room.localPlay;\n    return null;\n  }\n  if (a === 'addBot') {\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ thêm Máy được khi đang ở sảnh chờ.';\n    const seat = body.seat;\n    if (!Number.isInteger(seat) || seat < 2 || seat > MAX_SEATS) return 'Chỉ thêm Máy vào các ô P2 đến P' + MAX_SEATS + '.';\n    if (playerAt(room, seat)) return 'Ô này đã có người.';\n    room.players.push({ seat, type: 'bot', name: 'Máy', difficulty: 'vua', score: 0 });\n    room.players.sort((x, y) => x.seat - y.seat);\n    return null;\n  }\n  if (a === 'addLocal') {\n    // A keyboard seat at the host screen: a human with NO token (so no\n    // phone can ever claim it — see the !local guards on every token\n    // lookup) and a keyboard scheme (0..3, lowest unused). All input\n    // paths key on type 'human', so locals play every game untouched;\n    // the host page relays their actions with body.forSeat (hostDispatch).\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ thêm người chơi bàn phím được khi đang ở sảnh chờ.';\n    const seat = body.seat;\n    if (!Number.isInteger(seat) || seat < 2 || seat > MAX_SEATS) return 'Chỉ thêm người chơi bàn phím vào các ô P2 đến P' + MAX_SEATS + '.';\n    if (playerAt(room, seat)) return 'Ô này đã có người.';\n    const locals = room.players.filter((p) => p.local);\n    if (locals.length >= 4) return 'Tối đa 4 người chơi bằng bàn phím trong một phòng.';\n    let scheme = 0;\n    while (locals.some((p) => p.scheme === scheme)) scheme += 1;\n    room.players.push({ seat, type: 'human', local: true, scheme, name: 'Phím ' + (scheme + 1), score: 0 });\n    room.players.sort((x, y) => x.seat - y.seat);\n    return null;\n  }\n  if (a === 'hostJoin') {\n    // Phone mode: the host sits down in their own room. The seat is a\n    // human with NO token — exactly the local-seat shape discipline, so\n    // no phone can ever claim it (every token lookup rejects tokenless\n    // seats via the !local / !hostSeat guards) — and the host page\n    // drives it through the same forSeat relay the keyboard seats use\n    // (hostDispatch). At most ONE host seat per room: it is the room\n    // owner's own chair, not a batch of seats.\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ nhận ghế chủ phòng được khi đang ở sảnh chờ.';\n    if (room.players.some((p) => p.hostSeat)) return 'Chủ phòng đã có ghế rồi.';\n    if (room.players.length >= MAX_SEATS) return 'Phòng đã đủ ' + MAX_SEATS + ' người.';\n    let name = typeof body.name === 'string' ? body.name.trim().slice(0, 14) : '';\n    if (!name) name = 'Chủ phòng';\n    let seat = 1;\n    while (playerAt(room, seat)) seat += 1;\n    room.players.push({ seat, type: 'human', hostSeat: true, name, score: 0 });\n    room.players.sort((x, y) => x.seat - y.seat);\n    return null;\n  }\n  if (a === 'hostLeave') {\n    // The host gives their own seat back (lobby only, like every seat\n    // change). Deliberately a separate action from removeBot: that\n    // wire is for bots/keyboard seats and structurally refuses human\n    // phone seats, and the host seat must only ever be removable by\n    // this path — it names no seat, so it can only ever free the one\n    // hostSeat in the room.\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ rời ghế được khi đang ở sảnh chờ.';\n    const hs = room.players.find((p) => p.hostSeat);\n    if (!hs) return 'Chủ phòng chưa có ghế.';\n    room.players = room.players.filter((x) => x.seat !== hs.seat);\n    return null;\n  }\n  if (a === 'removeBot') {\n    // Same phase gate as addBot: removing a bot mid-game (or at results)\n    // would strand its seat inside the running game's snapshots and break\n    // the results/podium views, so seat changes are lobby-only, exactly\n    // like the buttons the UI shows. Also removes LOCAL (keyboard) seats:\n    // same lobby-only seat management, same button in the UI.\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ xoá Máy được khi đang ở sảnh chờ.';\n    const p = playerAt(room, body.seat);\n    if (!p || (p.type !== 'bot' && !p.local)) return 'Ô này không phải Máy.';\n    room.players = room.players.filter((x) => x.seat !== body.seat);\n    return null;\n  }\n  if (a === 'cycleBot') {\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ đổi mức Máy được khi đang ở sảnh chờ.';\n    const p = playerAt(room, body.seat);\n    if (!p || p.type !== 'bot') return 'Ô này không phải Máy.';\n    p.difficulty = DIFFS[(DIFFS.indexOf(p.difficulty) + 1) % DIFFS.length];\n    return null;\n  }\n  if (a === 'cycleScheme') {\n    // A local seat's keyboard layout rotates to the next scheme no\n    // other local seat uses, so two people at the big screen never\n    // share a key set. The seat's NAME is creation-order naming and\n    // deliberately does NOT follow the scheme (Phím 2 keeps its name\n    // even on scheme 0).\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Chỉ đổi bộ phím được khi đang ở sảnh chờ.';\n    const p = playerAt(room, body.seat);\n    if (!p || !p.local) return 'Ghế này không phải người chơi bàn phím.';\n    const used = new Set(room.players.filter((x) => x.local && x.seat !== p.seat).map((x) => x.scheme || 0));\n    for (let k = 1; k <= 3; k++) {\n      const cand = ((p.scheme || 0) + k) % 4;\n      if (!used.has(cand)) { p.scheme = cand; return null; }\n    }\n    return 'Cả 3 bộ phím còn lại đều đang có người dùng.';\n  }\n  if (a === 'startGame') {\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Đang chơi, không chọn game khác được.';\n    if (!GAMES[body.game]) return 'Không có game này.';\n    const err = startCheck(room);\n    if (err) return err;\n    const nSeats = room.players.length;\n    if (nSeats < minSeats(body.game)) return GAMES[body.game].name + ' cần ít nhất ' + minSeats(body.game) + ' người chơi mới chơi được (thêm Máy hoặc rủ thêm bạn).';\n    if (nSeats > maxSeats(body.game)) return GAMES[body.game].name + ' chỉ chơi được tối đa ' + maxSeats(body.game) + ' người chơi — phòng đang có ' + nSeats + ' người, xoá bớt Máy hoặc chọn game khác nhé.';\n    clearPlaylist(room); // manual navigation cancels any playlist\n    createGame(room, body.game);\n    return null;\n  }\n  if (a === 'quickStart') {\n    // One-tap start from the chooser: the host tapped a game the room\n    // is short of players for, so fill empty seats with bots (Vừa)\n    // up to the game's minimum and start immediately — nobody should\n    // have to walk the seat grid adding bots by hand first.\n    if (room.phase !== 'lobby' && room.phase !== 'choosing') return 'Đang chơi, không chọn game khác được.';\n    if (!GAMES[body.game]) return 'Không có game này.';\n    // Only startCheck's human half applies here — its \"at least 2\n    // players\" half is exactly what the fill below provides.\n    if (humanCount(room) < 1) return 'Cần ít nhất 1 người chơi bằng điện thoại mới bắt đầu được.';\n    if (room.players.length > maxSeats(body.game)) return GAMES[body.game].name + ' chỉ chơi được tối đa ' + maxSeats(body.game) + ' người chơi — phòng đang có ' + room.players.length + ' người, xoá bớt Máy hoặc chọn game khác nhé.';\n    for (let s = 2; s <= MAX_SEATS && room.players.length < minSeats(body.game); s++) {\n      if (!playerAt(room, s)) room.players.push({ seat: s, type: 'bot', name: 'Máy', difficulty: 'vua', score: 0 });\n    }\n    room.players.sort((x, y) => x.seat - y.seat);\n    if (room.players.length < minSeats(body.game)) return GAMES[body.game].name + ' cần ít nhất ' + minSeats(body.game) + ' người chơi mới chơi được (thêm Máy hoặc rủ thêm bạn).';\n    clearPlaylist(room);\n    createGame(room, body.game);\n    return null;\n  }\n  if (a === 'playlistStart') {\n    if (room.phase !== 'choosing' && room.phase !== 'lobby' && room.phase !== 'results' && room.phase !== 'podium') return 'Đang chơi, không bắt đầu liên hoàn được.';\n    const err = startCheck(room);\n    if (err) return err;\n    const ids = Array.isArray(body.games) ? body.games : [];\n    const queue = [];\n    ids.forEach((id) => {\n      if (typeof id === 'string' && queue.indexOf(id) < 0 && gamePlayable(room, id)) queue.push(id);\n    });\n    if (queue.length < 2) return 'Liên hoàn cần ít nhất 2 game đủ người chơi (game thiếu người đã bị lọc ra).';\n    room.playlist = { queue, idx: 0 };\n    room.playlistNextAt = null;\n    createGame(room, queue[0]);\n    return null;\n  }\n  if (a === 'playlistStop') {\n    if (!room.playlist && !room.playlistNextAt) return 'Chưa bật chế độ liên hoàn.';\n    clearPlaylist(room);\n    return null;\n  }\n  if (a === 'quitToChoosing') {\n    // Host-only mid-game escape: abandon the running game and land the\n    // whole room on the chooser. Points are banked ONLY in endGame, so\n    // dropping room.game here leaks nothing into cumulative scores —\n    // the abandoned game simply never happened, score-wise.\n    if (room.phase !== 'playing' || !room.game) return 'Chưa vào game.';\n    room.game = null;\n    clearPlaylist(room);\n    room.phase = 'choosing';\n    return null;\n  }\n  if (a === 'continue') {\n    if (room.phase !== 'results') return 'Chưa có kết quả để xem tiếp.';\n    room.phase = 'podium';\n    return null;\n  }\n  if (a === 'replay') {\n    if ((room.phase !== 'results' && room.phase !== 'podium') || !room.lastGame) return 'Chưa có game nào để chơi lại.';\n    // Seats may have changed since the game was played (spectators\n    // join at results): the rematch must still fit the game's range.\n    if (room.players.length < minSeats(room.lastGame.id) || room.players.length > maxSeats(room.lastGame.id)) {\n      return 'Số người trong phòng đã thay đổi — ' + GAMES[room.lastGame.id].name + ' cần ' + minSeats(room.lastGame.id) + '–' + maxSeats(room.lastGame.id) + ' người chơi.';\n    }\n    clearPlaylist(room); // manual navigation cancels any playlist\n    createGame(room, room.lastGame.id);\n    return null;\n  }\n  if (a === 'toChoosing') {\n    // One tap from results OR the podium: the room, its players and\n    // the cumulative scores all stay exactly as they are.\n    if (room.phase !== 'podium' && room.phase !== 'results') return 'Chưa chọn game khác được.';\n    clearPlaylist(room); // manual navigation cancels any playlist\n    room.phase = 'choosing';\n    return null;\n  }\n  if (a === 'finish') {\n    if (room.phase !== 'podium' && room.phase !== 'choosing') return 'Chưa kết thúc được.';\n    clearPlaylist(room); // manual navigation cancels any playlist\n    room.phase = 'final';\n    return null;\n  }\n  if (a === 'playAgain') {\n    if (room.phase !== 'final') return 'Chưa ở màn kết thúc.';\n    room.players.forEach((p) => { p.score = 0; });\n    room.resultsLog = []; room.lastGame = null; room.prevRanks = null;\n    clearPlaylist(room);\n    room.phase = 'lobby';\n    return null;\n  }\n  return 'Hành động không hợp lệ.';\n}\n// --- Onset nudge (smoothness wave) ---------------------------------------\n// A pad's first effect used to wait for the next 125ms tick boundary:\n// the pipeline advances the sim BEFORE dispatch, so a direction change\n// landing mid-tick moved nothing until (nextTickAt - t) had elapsed.\n// For the games whose movement is a clean positional step, the pad\n// handler now applies that fraction of ONE step immediately — dir *\n// step * frac, frac = elapsed fraction of the current tick — under the\n// stepper's own bounds. The nudge runs NO game logic (no collisions,\n// deaths, ring-outs, pickups, painting, scoring, bots, facing) and the\n// next regular tick proceeds from the nudged position: a one-off head\n// start of < 1 step that makes input feel instant without changing any\n// rule. Base step only: dash multipliers/cooldowns are tick business.\nconst NUDGE_PHASES = {\n  'day-ra': 'arena', 'ne-dan': 'dodge', 'cuop-sao': 'steal',\n  'giu-vuong-mien': 'crown', 'son-san': 'splat', 'xe-tank': 'tank',\n  'thu-thanh': 'defend', 'chung-mot-than': 'shared',\n};\nfunction padNudge(room, seat, prev, np, t) {\n  const g = room.game;\n  const phase = NUDGE_PHASES[g.id];\n  if (!phase || g.phase !== phase) return; // live play phase only (never 'countdown')\n  if (g.nextTickAt == null || g.nextTickAt <= t) return; // a due tick fires in this request's trailing advance, with this pad\n  const frac = Math.min(1, Math.max(0, 1 - (g.nextTickAt - t) / TICK_MS));\n  if (frac <= 0) return;\n  const dirChanged = !!prev.u !== !!np.u || !!prev.d !== !!np.d || !!prev.l !== !!np.l || !!prev.r !== !!np.r;\n  if (!dirChanged) return;\n  const dx = (np.r ? 1 : 0) - (np.l ? 1 : 0);\n  const dy = (np.d ? 1 : 0) - (np.u ? 1 : 0);\n  if (g.id === 'chung-mot-than') {\n    // The shared blob: only the axes the SENDER owns move, gated\n    // exactly as simulateSharedTick gates them; other players' inputs\n    // are not re-applied here.\n    let mx = 0, my = 0;\n    if (dx > 0 && g.owners.r === seat) mx = 1;\n    if (dx < 0 && g.owners.l === seat) mx = -1;\n    if (dy > 0 && g.owners.d === seat) my = 1;\n    if (dy < 0 && g.owners.u === seat) my = -1;\n    if (!mx && !my) return;\n    const b = g.shared;\n    if (!b) return;\n    b.x += mx * STEP_X * frac; b.y += my * STEP_Y * frac;\n    clampRect(b);\n    b.x = Math.round(b.x * 100) / 100; b.y = Math.round(b.y * 100) / 100;\n    return;\n  }\n  if (!dx && !dy) return;\n  const b = g.blobs && g.blobs[seat];\n  if (!b || !b.alive) return;\n  if (g.id === 'xe-tank') {\n    // The stepper's own wall slide (cover blocks + rect clamp);\n    // facing deliberately untouched — ticks own it.\n    slideCircle(b, dx * STEP_X * frac, dy * STEP_Y * frac, 0.8, TANK_BLOCKS, CLAMP_X, CLAMP_Y);\n    return;\n  }\n  b.x += dx * STEP_X * frac; b.y += dy * STEP_Y * frac;\n  if (g.id === 'son-san') {\n    b.x = Math.max(-14.4, Math.min(14.4, b.x)); b.y = Math.max(-8, Math.min(8, b.y));\n  } else if (g.id !== 'day-ra') {\n    clampRect(b);\n  }\n  // day-ra mirrors its stepper exactly: no positional clamp — the\n  // ring-out verdict belongs to the next regular tick.\n}\nfunction playerAction(room, player, body) {\n  const g = room.game;\n  if (room.phase !== 'playing' || !g) return 'Chưa vào game.';\n  const seat = player.seat; const t = now(); const a = body.action;\n  if (a === 'pad') {\n    if (g.id !== 'day-ra' && g.id !== 'ne-dan' && g.id !== 'keo-co' && g.id !== 'chia-cuop'\n      && g.id !== 'cuop-sao' && g.id !== 'giu-vuong-mien' && g.id !== 'son-san'\n      && g.id !== 'chung-mot-than' && g.id !== 'day-hop'\n      && g.id !== 'xe-tank' && g.id !== 'dat-bom' && g.id !== 'thu-thanh'\n      && g.id !== 'nguoi-que' && g.id !== 'den-lua-nuoc'\n      && g.id !== 'da-bong' && g.id !== 'ech-op' && g.id !== 'can-goc') return null;\n    const pd = body.pad || {};\n    const np = { u: !!pd.u, d: !!pd.d, l: !!pd.l, r: !!pd.r, a: !!pd.a, b: !!pd.b, x: !!pd.x, y: !!pd.y };\n    const prev = g.pad[seat] || {};\n    // Kéo Co: a press is the rising edge of B, counted the moment it lands.\n    if (g.id === 'keo-co' && g.phase === 'pull' && np.b && !prev.b) {\n      g.presses[seat] = (g.presses[seat] || 0) + 1;\n    }\n    // Chia Hay Cướp on the gamepad: A (the X position) = Chia, B = Cướp,\n    // rising edge only, and only for the pair during the choose phase.\n    if (g.id === 'chia-cuop' && g.phase === 'choose' && g.pair && g.pair.indexOf(seat) >= 0 && !g.inputs[seat]) {\n      if (np.a && !prev.a) g.inputs[seat] = { choice: 'chia', at: t };\n      else if (np.b && !prev.b) g.inputs[seat] = { choice: 'cuop', at: t };\n    }\n    g.pad[seat] = np;\n    padNudge(room, seat, prev, np, t);\n    return null;\n  }\n  if (a === 'setAim') {\n    // Đại Bác Căn Góc: exact aim for slider-style clients (and tests).\n    // Only the cannon whose turn it is, only during the aim phase;\n    // the pad sweep writes the very same fields.\n    if (g.id !== 'can-goc' || g.phase !== 'aim' || g.turnSeat !== seat) return 'Chưa tới lượt bạn căn góc.';\n    const c = g.cannons[seat];\n    if (!c || !c.alive) return 'Pháo của bạn đã bị phá huỷ.';\n    if (typeof body.angle === 'number' && isFinite(body.angle)) c.angle = Math.max(5, Math.min(85, body.angle));\n    if (typeof body.power === 'number' && isFinite(body.power)) c.power = Math.max(0, Math.min(100, body.power));\n    if (body.face === 1 || body.face === -1) c.face = body.face;\n    return null;\n  }\n  if (a === 'choose') {\n    if (g.id !== 'chia-cuop' || g.phase !== 'choose') return 'Chưa đến lúc chọn.';\n    if (!g.pair || g.pair.indexOf(seat) < 0) return 'Vòng này bạn ngồi ngoài, chỉ xem thôi.';\n    if (g.inputs[seat]) return null;\n    if (body.choice !== 'chia' && body.choice !== 'cuop') return 'Lựa chọn không hợp lệ.';\n    g.inputs[seat] = { choice: body.choice, at: t };\n    return null;\n  }\n  if (a === 'chat') {\n    if (g.id === 'ma-soi') {\n      // Day discussion is public — but the dead only watch: a ghost\n      // who could still talk could leak night knowledge.\n      if (g.phase !== 'discuss') return 'Chỉ trò chuyện được trong lúc bàn luận ban ngày.';\n      if (!g.wolf.alive[seat]) return 'Bạn đã chết — chỉ theo dõi thôi nhé.';\n      const text = String(body.text || '').trim().slice(0, 60);\n      if (!text) return 'Hãy nhập lời nhắn.';\n      g.chatLog.push({ seat, text, at: t });\n      if (g.chatLog.length > 40) g.chatLog = g.chatLog.slice(-40);\n      return null;\n    }\n    if (g.id === 'ke-gia-mao') {\n      // Public discussion: EVERY player may chat (unlike Chia Hay\n      // Cướp's pair-only negotiation). Stored as a scrolling log.\n      if (g.phase !== 'discuss') return 'Chỉ trò chuyện được trong lúc bàn luận.';\n      const text = String(body.text || '').trim().slice(0, 60);\n      if (!text) return 'Hãy nhập lời nhắn.';\n      g.chatLog.push({ seat, text, at: t });\n      if (g.chatLog.length > 30) g.chatLog = g.chatLog.slice(-30);\n      return null;\n    }\n    if (g.id !== 'chia-cuop' || g.phase !== 'talk') return 'Chỉ trò chuyện được trong lúc thương lượng.';\n    if (!g.pair || g.pair.indexOf(seat) < 0) return 'Chỉ hai người trong cặp mới thương lượng.';\n    const text = String(body.text || '').trim().slice(0, 60);\n    if (!text) return 'Hãy nhập lời nhắn.';\n    g.chat[seat] = { text, at: t };\n    return null;\n  }\n  if (a === 'tap') {\n    if (g.id === 'cao-boi') {\n      if (g.inputs[seat]) return null;\n      if (g.phase === 'wait') g.inputs[seat] = { foul: true, at: t };\n      else if (g.phase === 'go') g.inputs[seat] = { tapAt: t };\n      return null;\n    }\n    if (g.id === 'cheo-thuyen') {\n      if (g.phase !== 'row') return null;\n      // A press is an in-window stroke when its server receipt time is\n      // within +-ROW_WINDOW_MS of the nearest beat; one stroke per\n      // player per beat. Anything else is a splash (miss, no penalty).\n      const k = Math.round((t - g.rowStart) / ROW_BEAT_MS);\n      const key = seat + ':' + k;\n      if (k >= 0 && k < ROW_BEATS && Math.abs(t - (g.rowStart + k * ROW_BEAT_MS)) <= ROW_WINDOW_MS && !g.stroked[key]) {\n        g.stroked[key] = 1;\n        addRowDistance(room, seat);\n      } else {\n        g.splash[seat] = (g.splash[seat] || 0) + 1;\n      }\n      return null;\n    }\n    return 'Game này không dùng nút bấm.';\n  }\n  if (a === 'answer') {\n    if (g.id === 'ke-gia-mao') {\n      // The choice answers the question THIS player was dealt (real or\n      // variant); it stays secret until the reveal phase.\n      if (g.phase !== 'answer') return 'Chưa đến lúc trả lời.';\n      if (g.inputs[seat]) return null;\n      const ci = body.choice;\n      if (!Number.isInteger(ci) || ci < 0 || ci > 3) return 'Đáp án không hợp lệ.';\n      g.inputs[seat] = { choice: ci, at: t };\n      return null;\n    }\n    if (g.id !== 'do-vui' || g.phase !== 'question') return 'Chưa đến lúc trả lời.';\n    if (g.inputs[seat]) return null;\n    const c = body.choice;\n    if (!Number.isInteger(c) || c < 0 || c > 3) return 'Đáp án không hợp lệ.';\n    g.inputs[seat] = { choice: c, at: t };\n    return null;\n  }\n  if (a === 'vote') {\n    if (g.id === 'ma-soi') {\n      if (g.phase !== 'vote') return 'Chưa đến lúc bỏ phiếu.';\n      if (!g.wolf.alive[seat]) return 'Bạn đã chết — chỉ theo dõi thôi nhé.';\n      if (g.votes[seat] != null) return null;\n      const target = body.seat;\n      if (!Number.isInteger(target) || target === seat || !playerAt(room, target) || !g.wolf.alive[target]) return 'Không bỏ phiếu cho người này được.';\n      g.votes[seat] = target;\n      return null;\n    }\n    if (g.id !== 'ke-gia-mao' || g.phase !== 'vote') return 'Chưa đến lúc tố cáo.';\n    if (g.votes[seat] != null) return null;\n    const target = body.seat;\n    if (!Number.isInteger(target) || target === seat || !playerAt(room, target)) return 'Không tố cáo được người này.';\n    g.votes[seat] = target;\n    return null;\n  }\n  if (a === 'wolfVote' || a === 'wolfGuard' || a === 'wolfSeer' || a === 'wolfWitch') {\n    if (g.id !== 'ma-soi' || g.phase !== 'night') return 'Chưa đến lúc hành động ban đêm.';\n    const w = g.wolf;\n    if (!w.alive[seat]) return 'Bạn đã chết — chỉ theo dõi thôi nhé.';\n    const role = w.roles[seat];\n    const target = body.seat;\n    const targetOk = Number.isInteger(target) && !!playerAt(room, target) && !!w.alive[target];\n    if (a === 'wolfVote') {\n      if (role !== 'soi') return 'Chỉ có sói mới chọn con mồi.';\n      if (w.wolfVotes[seat] != null) return null;\n      if (!targetOk || target === seat) return 'Không chọn được người này.';\n      w.wolfVotes[seat] = target;\n      return null;\n    }\n    if (a === 'wolfGuard') {\n      if (role !== 'bao-ve') return 'Chỉ có Bảo Vệ mới chọn người để bảo vệ.';\n      if (w.guardPick != null) return null;\n      if (!targetOk) return 'Không chọn được người này.';\n      if (target === w.guardLast) return 'Đêm qua bạn đã bảo vệ người này rồi — luật không cho bảo vệ cùng một người hai đêm liền.';\n      w.guardPick = target;\n      return null;\n    }\n    if (a === 'wolfSeer') {\n      if (role !== 'tien-tri') return 'Chỉ có Tiên Tri mới soi được người khác.';\n      if (w.seerPick != null) return null;\n      if (!targetOk || target === seat) return 'Không soi được người này.';\n      wolfSeerApply(room, seat, target);\n      return null;\n    }\n    // wolfWitch: incremental — set the save flag and/or a poison\n    // target first, then confirm with done:true (the phone renders\n    // her current choices back from the view between steps).\n    if (role !== 'phu-thuy') return 'Chỉ có Phù Thủy mới dùng thuốc được.';\n    if (w.witch.done) return null;\n    if (body.done === true) { w.witch.done = true; return null; }\n    if (typeof body.save === 'boolean') {\n      if (body.save) {\n        if (w.saveLeft <= 0) return 'Thuốc cứu đã dùng hết rồi.';\n        if (!wolfWolvesIn(room)) return 'Sói chưa chọn xong con mồi — đợi một chút.';\n        if (wolfVictim(room) == null) return 'Đêm nay sói chưa chọn được ai.';\n      }\n      w.witch.save = body.save;\n      return null;\n    }\n    if (body.poison === null) { w.witch.poison = null; return null; }\n    if (body.poison !== undefined) {\n      if (w.poisonLeft <= 0) return 'Thuốc độc đã dùng hết rồi.';\n      const pt = body.poison;\n      if (!Number.isInteger(pt) || !playerAt(room, pt) || !w.alive[pt] || pt === seat) return 'Không đầu độc được người này.';\n      w.witch.poison = pt;\n      return null;\n    }\n    return null;\n  }\n  if (a === 'roll') {\n    if (g.id !== 'ca-ngua' || g.phase !== 'roll') return 'Chưa đến lúc thảy xúc xắc.';\n    if (g.ng.turn !== seat) return 'Chưa tới lượt của bạn.';\n    nguaRoll(room, t);\n    return null;\n  }\n  if (a === 'move') {\n    if (g.id !== 'ca-ngua' || g.phase !== 'pick') return 'Chưa đến lúc đi ngựa.';\n    if (g.ng.turn !== seat) return 'Chưa tới lượt của bạn.';\n    const h = body.horse;\n    if (!Number.isInteger(h) || g.ng.legal.indexOf(h) < 0) return 'Ngựa này đi không được.';\n    nguaMove(room, seat, h, t);\n    return null;\n  }\n  if (a === 'play') {\n    if (g.id !== 'tien-len' || g.phase !== 'cards') return 'Chưa tới lượt bạn.';\n    const tl = g.tl;\n    if (tl.finished.indexOf(seat) >= 0) return 'Chưa tới lượt bạn.';\n    if (tl.passed[seat]) return 'Bạn đã bỏ lượt vòng này rồi.';\n    if (tl.turn !== seat) return 'Chưa tới lượt bạn.';\n    const cards = body.cards;\n    if (!Array.isArray(cards) || !cards.length) return 'Bài không hợp lệ.';\n    const hand = tl.hands[seat] || [];\n    const seenC = new Set();\n    for (const c of cards) {\n      if (!Number.isInteger(c) || c < 0 || c > 51 || seenC.has(c) || hand.indexOf(c) < 0) return 'Bài không hợp lệ.';\n      seenC.add(c);\n    }\n    if (tl.firstPlay && cards.indexOf(0) < 0) return 'Lượt đầu phải có lá 3♠.';\n    const combo = tlComboOf(cards);\n    if (!combo) return 'Bộ bài này không hợp lệ.';\n    if (tl.table && !tlBeats(combo, tl.table)) return 'Chưa chặn được. Đánh bộ mạnh hơn hoặc bỏ lượt.';\n    tlPlayCards(room, seat, cards, t);\n    return null;\n  }\n  if (a === 'pass') {\n    if (g.id !== 'tien-len' || g.phase !== 'cards') return 'Chưa tới lượt bạn.';\n    const tl = g.tl;\n    if (tl.finished.indexOf(seat) >= 0) return 'Chưa tới lượt bạn.';\n    if (tl.passed[seat]) return 'Bạn đã bỏ lượt vòng này rồi.';\n    if (tl.turn !== seat) return 'Chưa tới lượt bạn.';\n    if (!tl.table) return 'Bạn đang cầm cái, phải đánh bài.';\n    tlPassTurn(room, seat, t);\n    return null;\n  }\n  if (a === 'symbol') {\n    if (g.id !== 'giai-ma-chung' || g.phase !== 'decode') return 'Chưa đến lúc bấm ký hiệu.';\n    const sym = body.sym;\n    if (!Number.isInteger(sym) || sym < 0 || sym > 3) return 'Ký hiệu không hợp lệ.';\n    decodePress(room, seat, sym, t);\n    return null;\n  }\n  return 'Hành động không hợp lệ.';\n}\n\n// ---------------------------------------------------------------------------\n// Router\n// ---------------------------------------------------------------------------\n\nwindow.__NP_ENGINE = { newRoom: newRoom, hostDispatch: hostDispatch, playerAction: playerAction, advance: advance, buildView: buildView };\n})();\n";
const PAGE_V = "b1873ed9ea";
export default {
  async fetch(request, env, ctx) {
    // A malformed request target must never escape as an unhandled
    // exception: unparseable URLs are served the game page, and every API
    // failure below is a clean JSON ok:false.
    let url = null;
    try { url = new URL(request.url); } catch (e) { /* fall through to the page */ }
    const path = url ? url.pathname : '/';
    if (path === '/engine.js') {
      // The shared game engine (constants, steppers, bots, views,
      // dispatch) served to the host page for LOCAL PLAY mode: rooms
      // with no remote players run the simulation in the page itself,
      // so home-network stalls cannot touch the picture. Versioned by
      // content hash in the URL, hence immutable caching.
      return new Response(ENGINE_JS, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (path === '/api/version') {
      // Build fingerprint of the served page: open tabs poll this
      // between games and reload themselves when a new build ships,
      // so a stale tab can never keep running an old version.
      return new Response(JSON.stringify({ build: PAGE_V }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }
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
      const m = path.match(/^\/api\/rooms\/(\d{6})\/(join|state|action|ws)$/);
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
        if (room.players.length >= MAX_SEATS) return fail('Phòng đã đủ ' + MAX_SEATS + ' người.');
        let seat = 1;
        while (playerAt(room, seat)) seat += 1;
        const player = { seat, type: 'human', name, token: makeToken(), score: 0 };
        room.players.push(player);
        room.players.sort((x, y) => x.seat - y.seat);
        advance(room);
        await saveRoom(env, room);
        pokeRoom(env, code, ctx);
        return json({ ok: true, seat, playerToken: player.token, color: SEAT_COLORS[seat - 1] });
      }

      if (kind === 'state' && request.method === 'GET') {
        const role = url.searchParams.get('role');
        const token = url.searchParams.get('token') || '';
        let seat = null;
        if (role === 'host') {
          if (token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          const p = room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.token === token);
          if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = p.seat;
        }
        advance(room);
        await saveRoom(env, room);
        return json(buildView(room, role === 'host' ? 'host' : 'player', seat));
      }

      if (kind === 'ws' && request.method === 'GET') {
        // WebSocket live channel for this room. Identity is validated
        // exactly like /state (the host token, or the player token that
        // owns a seat) BEFORE any upgrade is attempted, so bad sessions
        // get the same JSON errors as every other route and a missing
        // room the shared 404 above. The room's Durable Object accepts
        // the socket itself (hibernation API): it re-checks the identity
        // headers against its stored room, greets with the personalized
        // view, and owns the tick alarm while a game runs.
        const role = url.searchParams.get('role');
        const token = url.searchParams.get('token') || '';
        let seat = null;
        if (role === 'host') {
          if (token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          const p = room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.token === token);
          if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = p.seat;
        }
        if (!env.ROOMS_DO) return fail('Kênh WebSocket chưa khả dụng.', 501);
        if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
          return fail('Yêu cầu này phải là nâng cấp WebSocket.', 400);
        }
        const fwd = new Request('https://room/ws', {
          headers: {
            Upgrade: 'websocket',
            'x-np-role': role === 'host' ? 'host' : 'player',
            'x-np-seat': seat === null ? '' : String(seat),
            'x-np-token': token,
          },
        });
        return roomStub(env, code).fetch(fwd);
      }

      if (kind === 'action' && request.method === 'POST') {
        const rawBody = await request.json().catch(() => null);
        const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
        let seat = null; let player = null;
        if (body.role === 'host') {
          if (body.token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          player = room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.token === body.token) || null;
          if (!player) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = player.seat;
        }
        advance(room);
        const err = body.role === 'host' ? hostDispatch(room, body) : playerAction(room, player, body);
        if (err) { await saveRoom(env, room); pokeRoom(env, code, ctx); return fail(err); }
        advance(room);
        await saveRoom(env, room);
        pokeRoom(env, code, ctx);
        // Pad snapshots are fire-and-forget: clients ignore this response
        // body (the web page's sendPad callback is empty; views arrive via
        // /state polling). Shipping the full ~3.4KB view here would make
        // the controller's serial pad channel wait for a whole download
        // after every snapshot on slow links, so a successful pad gets a
        // tiny ack instead. Errors above keep the existing error JSON.
        if (body.action === 'pad') return json({ ok: true, serverNow: now() });
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
html, body { margin: 0; padding: 0; overscroll-behavior: none; }
body { font-family: 'Quicksand', sans-serif; background: #FFF6E9; color: #4A3226; min-height: 100vh; }
h1, h2, h3, .baloo { font-family: 'Baloo 2', cursive; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 18px 16px 40px; }
.card { background: #fff; border-radius: 28px; border: 3px solid #EBD9BE; padding: 22px; }
.center { text-align: center; }
.btn { display: inline-block; border: none; cursor: pointer; font-family: 'Baloo 2', cursive; font-weight: 800;
  font-size: 20px; color: #fff; padding: 13px 28px; border-radius: 999px; background: #B08968;
  box-shadow: 0 4px 0 rgba(0,0,0,.18); transition: transform .06s, box-shadow .06s; }
.btn:active { transform: translateY(4px); box-shadow: 0 1px 0 rgba(0,0,0,.18); }
.btn.blue { background: #4FA8E8; box-shadow: 0 4px 0 #2F7FBF; }
.btn.pink { background: #F77FB0; box-shadow: 0 4px 0 #D6538A; }
.btn.green { background: #58C472; box-shadow: 0 4px 0 #379A54; }
.btn.purple { background: #A78BFA; box-shadow: 0 4px 0 #7E63D8; }
.btn.orange { background: #FFB35C; box-shadow: 0 4px 0 #E08A2E; }
.btn.small { font-size: 15px; padding: 8px 16px; }
.btn.ghost { background: #FFF1DE; color: #8A5A33; box-shadow: 0 3px 0 #E4C9A2; }
.btn.off { opacity: .45; pointer-events: none; }
.logo { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.logo .word { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 58px; color: #4A3226; letter-spacing: 1px; }
.logo .party span { display: inline-block; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 34px; color: #fff;
  padding: 2px 10px; border-radius: 12px; margin: 0 2px; transform: rotate(-3deg); }
.tagline { font-size: 19px; font-weight: 700; color: #7C4F27; margin-top: 6px; }
.codeboxes { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
.codebox { width: 62px; height: 76px; background: #fff; border-radius: 16px; font-family: 'Baloo 2', cursive; font-weight: 800;
  font-size: 42px; color: #4A3226; display: flex; align-items: center; justify-content: center;
  border: 3px solid #FFE3B3; }
.seats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 14px; }
.seat { background: #FFFDF8; border-radius: 24px; padding: 14px 10px; text-align: center; border: 3px dashed #EBD9BE; position: relative; }
.seat.filled { border: 3px solid #FFE3B3; background: #fff; }
.seat .nm { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; margin-top: 4px; }
.seat .sc { font-weight: 700; color: #9C744C; }
.bubble { position: absolute; top: -14px; left: 50%; transform: translateX(-50%) rotate(-2deg); background: #fff; border: 3px solid #FFD98E;
  color: #4A3226; font-weight: 700; font-size: 14px; padding: 6px 12px; border-radius: 16px; white-space: nowrap; z-index: 3; }
.blobbob { display: inline-block; }
/* FLAT: bob removed — blobs stay still, no idle motion. */
.chip { display: inline-block; background: #FFF1DE; color: #8A5A33; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 999px; margin: 2px; }
.chip.hot { background: #FFE1EC; color: #C2437E; }
.chip.cool { background: #E1F0FF; color: #2F6FBF; }
.games { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-top: 14px; }
.gamecard { border-radius: 24px; padding: 18px; color: #fff; cursor: pointer; text-align: left; border: none; font-family: inherit;
  box-shadow: 0 6px 0 rgba(0,0,0,.15); transition: transform .08s; }
.gamecard:active { transform: translateY(4px); }
.gamecard h3 { margin: 0 0 4px; font-size: 24px; }
.gamecard p { margin: 0; font-weight: 700; opacity: .92; }
.stage { border-radius: 32px; padding: 12px 10px; color: #fff; min-height: 400px; border: 3px solid rgba(255,255,255,.35); position: relative; overflow: hidden; }
.pstage { touch-action: none; overscroll-behavior: none; }
.stage h2 { margin: 0 0 4px; font-size: 24px; }
.g-do-vui { background: #4F7BE8; }
.g-ma-soi { background: #4A2A85; }
.g-ca-ngua { background: #B45309; }
.g-tien-len { background: #0F766E; }
.tlchips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 8px 0; }
.tlcard2 { display: inline-block; background: #FFFDF5; color: #26314A; border-radius: 9px; padding: 7px 10px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; line-height: 1.1; box-shadow: 0 2px 0 rgba(0,0,0,.25); }
.tlcard2.red { color: #D81F3C; }
.tlcard2.sm { font-size: 15px; padding: 4px 7px; border-radius: 7px; }
.tltable { background: rgba(0,0,0,.22); border: 2px dashed rgba(255,255,255,.35); border-radius: 20px; padding: 12px 10px; margin: 8px auto; max-width: 860px; }
.tlhand { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 10px 0; }
button.tlcard { background: #FFFDF5; color: #26314A; border: none; border-radius: 9px; min-width: 50px; padding: 10px 4px 8px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; line-height: 1.05; cursor: pointer; box-shadow: 0 2px 0 rgba(0,0,0,.3); transition: transform .07s; }
button.tlcard.red { color: #D81F3C; }
button.tlcard.sel { transform: translateY(-11px); outline: 3px solid #FFC93D; box-shadow: 0 2px 0 rgba(0,0,0,.3); background: #FFF3C4; }
.tlp { display: inline-block; padding: 1px 5px; margin: 1px 1px; border-radius: 6px; background: rgba(255,255,255,.1); font-weight: 700; }
.tlp.red { color: #FF9DB0; }
.tlp.sel { background: #FFC93D; color: #26314A; }
.tlp.sel.red { color: #B3122F; }
.tlp.cur { outline: 2px solid #7BE0B8; }
.wolfgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 12px; }
.wolfcard { background: rgba(255,255,255,.92); color: #4A3226; border-radius: 18px; padding: 10px 6px; text-align: center; font-weight: 700; }
.wolfcard.dead { opacity: .62; filter: grayscale(.8); }
.wolfcard .rolechip { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 999px; background: #312E81; color: #fff; font-size: 13px; }
.ngrow { display: flex; gap: 14px; align-items: stretch; margin-top: 6px; }
.ngrow .ngmid { flex: 0 0 auto; min-width: 0; width: calc(100vh - 215px); width: calc(100dvh - 215px); max-width: 46%; margin: 0 auto; }
.ngside { flex: 1 1 0; min-width: 0; background: rgba(255,255,255,.14); border-radius: 16px; padding: 10px 12px; overflow: hidden; }
.ngside h3 { margin: 0 0 8px; font-size: 17px; }
.ngside .rrow { margin: 5px 0; padding: 6px 10px; font-size: 14.5px; }
.ngside .chatrow { font-size: 14px; }
.ngside .progbar { height: 9px; background: rgba(0,0,0,.3); border-radius: 99px; overflow: hidden; margin-top: 4px; }
.ngside .progbar i { display: block; height: 100%; border-radius: 99px; }
@media (max-width: 1100px) { .ngrow { flex-direction: column; } .ngside { width: 100%; } .ngrow .ngmid { width: 100%; max-width: 560px; } }
.ngboard { position: relative; width: 100%; padding-top: 100%; margin: 6px auto; background: #FDF6E3; border-radius: 18px; border: 3px solid rgba(0,0,0,.15); }
.ngcell { position: absolute; box-sizing: border-box; border: 1px solid rgba(0,0,0,.18); border-radius: 4px; background: #fff; }
.ngcell.safe { background: #FFE9A8; }
.ngcell.quad { border: none; border-radius: 14px; }
.ngstable { position: absolute; box-sizing: border-box; border: 2px dashed rgba(0,0,0,.25); border-radius: 50%; background: rgba(255,255,255,.85); }
.nghorse { position: absolute; box-sizing: border-box; border-radius: 50%; border: 2px solid rgba(0,0,0,.35); color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; text-shadow: 0 1px 2px rgba(0,0,0,.5); z-index: 3; }
.nghorse.turn { outline: 3px solid #FFC93D; outline-offset: 2px; }
.diceface { display: inline-flex; align-items: center; justify-content: center; width: 74px; height: 74px; border-radius: 16px; background: #fff; color: #312E81; font-size: 44px; box-shadow: 0 4px 0 rgba(0,0,0,.2); }
.bigcircle { width: 250px; height: 250px; border-radius: 50%; margin: 16px auto; display: flex; align-items: center; justify-content: center;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 34px; text-align: center; padding: 20px;
  box-shadow: inset 0 -8px 0 rgba(0,0,0,.15); }
.bigcircle.wait { background: #E84F4F; color: #fff; }
.bigcircle.go { background: #3ED97E; color: #fff; animation: pop .3s ease; }
@keyframes pop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
.optgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.opt { border: none; border-radius: 20px; padding: 18px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; cursor: pointer;
  background: rgba(255,255,255,.92); color: #4A3226; box-shadow: 0 4px 0 rgba(0,0,0,.18); text-align: left; }
.opt:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,.18); }
.opt.right { background: #3ED97E; color: #fff; }
.opt.dim { opacity: .55; }
.tbar { height: 12px; background: rgba(0,0,0,.22); border-radius: 999px; overflow: hidden; margin: 10px 0; }
.tbar i { display: block; height: 100%; background: #fff; border-radius: 999px; }
.scorebar { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.scorechip { display: flex; align-items: center; gap: 7px; background: #fff; color: #4A3226; border-radius: 999px; padding: 4px 14px 4px 5px;
  font-weight: 700; font-size: 16px; }
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
  box-shadow: inset 0 -10px 0 rgba(0,0,0,.18); }
.tapbtn:active { transform: scale(.96); }
.tapbtn.wait { background: #E84F4F; }
.tapbtn.go { background: #3ED97E; animation: pop .3s ease; }
.tapbtn.race { background: #B45FE8; }
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 330px; margin: 12px auto; }
.key { border: none; border-radius: 18px; padding: 16px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 24px;
  background: #fff; color: #4A3226; box-shadow: 0 3px 0 rgba(140,90,30,.3); cursor: pointer; }
.key:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(140,90,30,.3); }
.tapbtn, .opt, .key, .pad, .symbtn, .abtn, .disc, .btn[data-cmd="choose"], .btn[data-cmd="guessSubmit"] { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.pressed { transform: scale(.93) !important; filter: brightness(1.25); box-shadow: 0 0 0 3px rgba(255,255,255,.8) !important; }
.guessbox { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 44px; background: #fff; border-radius: 20px;
  padding: 8px 20px; min-height: 74px; box-shadow: inset 0 -5px 0 rgba(140,90,30,.15); }
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 14px; margin-top: 26px; }
.pod { text-align: center; width: 150px; }
.pod .col { border-radius: 18px 18px 0 0; color: #fff; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 30px;
  display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; box-shadow: inset 0 -8px 0 rgba(0,0,0,.15); }
.rows { margin-top: 12px; }
.rrow { display: flex; align-items: center; gap: 10px; background: #FFFDF8; color: #4A3226; border-radius: 16px; padding: 9px 14px; margin: 7px 0; font-weight: 700; }
.rrow .pts { margin-left: auto; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; }
.cdwrap { text-align: center; padding: 30px 0; }
.cdnum { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 150px; line-height: 1; color: #fff; text-shadow: 0 6px 0 rgba(0,0,0,.18); animation: pop .45s ease; }
.cdnum.punch { animation: cdPunch .45s ease; }
@keyframes cdPunch { 0% { transform: scale(1.6); } 55% { transform: scale(.93); } 100% { transform: scale(1); } }
.g-cuop-sao { background: #241A04; }
.g-giu-vuong-mien { background: #1E0A38; }
.g-son-san { background: #052A30; }
.g-cao-boi { background: #2A1503; }
.g-chung-mot-than { background: #1E1040; }
.g-day-hop { background: #241503; }
.g-xe-tank { background: #0B2018; }
.g-dat-bom { background: #241006; }
.g-ke-gia-mao { background: #1E0A38; }
.g-thu-thanh { background: #06222E; }
.g-giai-ma-chung { background: #191238; }
.g-nguoi-que { background: #2A0A16; }
.g-den-lua-nuoc { background: #241305; }
.fplat { position: absolute; z-index: 1; pointer-events: none; border-radius: 7px; background: #2A1220; border: 2px solid #FF7890; }
.fplat.oneway { background: #5A3250; border-color: #C8A0FF; }
.admg { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 15px; line-height: 1; text-shadow: 0 2px 0 rgba(0,0,0,.5); min-height: 16px; }
.tbrick { position: absolute; z-index: 1; pointer-events: none; border-radius: 4px; background: #4A2F1B; border: 2px solid #FFC46E; }
.tpool { position: absolute; z-index: 1; pointer-events: none; border-radius: 8px 8px 4px 4px; overflow: hidden; }
/* FLAT: pool shine sweep removed. */
.tpool.red { background: #FF5A3C; }
.tpool.blue { background: #3FA9F5; }
.tpool.green { background: #8CE03A; }
/* FLAT: poolGlow removed. */
.tgem { position: absolute; width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; z-index: 2; pointer-events: none; }
.tgem i { display: block; width: 100%; height: 100%; transform: rotate(45deg); }
.tgem.lua i { background: #FF5A3C; }
.tgem.nuoc i { background: #3FA9F5; }
.tgem.taken { display: none; }
/* FLAT: gemBob removed. */
.tgate { position: absolute; z-index: 2; pointer-events: none; border-radius: 4px; background: #454E61; border: 2px solid #DCE6FF; transition: opacity .18s linear; }
.tgate.open { opacity: 0; }
.tbtn { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: #E8A812; border: 2px solid #FFF0BE; }
.tdoor { position: absolute; z-index: 1; pointer-events: none; border-radius: 9px 9px 3px 3px; border: 3px solid; }
.tdoor.lua { border-color: #FF7A50; background: rgba(255,110,60,.35); }
.tdoor.nuoc { border-color: #5FC2FF; background: rgba(90,180,255,.35); }
.achar { position: absolute; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; text-align: center; z-index: 3; pointer-events: none; }
.achar svg { display: block; margin: 0 auto; }
.achar.home { filter: brightness(1.5); }
/* --- Wave 5 stages ---------------------------------------------------------
   da-bong plays in a 32 x 18 space on the wide 16:9 field; can-goc in a
   24 x 16 space on the 3:2 field; ech-op reuses the square temple field. */
.afield.wide { aspect-ratio: 95 / 48; width: min(100%, max(340px, calc((100vh - 150px) * 95 / 48))); width: min(100%, max(340px, calc((100dvh - 150px) * 95 / 48))); }
.afield.art { aspect-ratio: 16 / 9; width: min(100%, max(340px, calc((100vh - 190px) * 16 / 9))); width: min(100%, max(340px, calc((100dvh - 190px) * 16 / 9))); }
.g-da-bong { background: #0B3D1E; }
.g-ech-op { background: #2E1C07; }
.g-can-goc { background: #0E2233; }
.spitch { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: #14532D; border: 2px solid #A0FFBE; }
.spitch.wall { background: #4A2C10; border-color: #FFCD82; }
.sgoalbox { position: absolute; z-index: 0; pointer-events: none; border: 3px dashed rgba(255,255,255,.65); border-radius: 8px; background: rgba(255,255,255,.08); }
.sball { position: absolute; width: 3.4%; aspect-ratio: 1; border-radius: 50%; z-index: 3; pointer-events: none; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; background: #FFFFFF; border: 2px solid #9AA7C2; }
.goalbanner { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%); z-index: 6; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: clamp(30px, 6.2vw, 64px); color: #FFE066; text-shadow: 0 4px 0 rgba(120,53,15,.85); animation: pop .45s ease; pointer-events: none; white-space: nowrap; }
.fspike { position: absolute; z-index: 1; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='14'%3E%3Cpath d='M0 14 L9 0 L18 14 Z' fill='%232E2A33'/%3E%3Cpath d='M0 14 L9 0 L18 14 Z' fill='none' stroke='%23B9B3C7' stroke-width='1.4'/%3E%3C/svg%3E"); background-repeat: repeat-x; background-position: bottom left; background-size: 18px 100%; }
.fdoor { position: absolute; z-index: 1; pointer-events: none; border-radius: 9px 9px 3px 3px; border: 3px solid #3ED97E; background: rgba(62,217,126,.35); }
.ffly { position: absolute; width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; border-radius: 50%; z-index: 2; pointer-events: none; transition: left .18s linear, top .18s linear; background: #14141C; box-shadow: 0 0 0 3px rgba(255,255,255,.28); }
.ffly.taken { opacity: 0; }
.afrog { position: absolute; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; text-align: center; z-index: 3; pointer-events: none; }
.afrog svg { display: block; margin: 0 auto; }
.afrog.carry svg { filter: none; }
.fcrate { position: absolute; width: 3.75%; aspect-ratio: 1; transform: translate(-50%, -50%); z-index: 2; pointer-events: none; transition: left .18s linear, top .18s linear; display: flex; align-items: center; justify-content: center; font-size: 22px; background: #8A5518; border: 3px solid #E8B96A; border-radius: 8px; }
.artwrap { position: absolute; inset: 0; }
.artwrap svg { width: 100%; height: 100%; display: block; }
.boomflash { position: absolute; border-radius: 50%; z-index: 5; pointer-events: none; transform: translate(-50%, -50%); background: rgba(255,180,80,.8); animation: boomPop .5s ease-out; }
@keyframes boomPop { from { width: 4%; padding-top: 4%; opacity: 1; } to { width: 19%; padding-top: 19%; opacity: 0; } }
.aframe { position: absolute; border: 3px solid #78DCFF; border-radius: 14px; pointer-events: none; }
.ablock { position: absolute; z-index: 1; pointer-events: none; border-radius: 6px; background: #22392E; border: 2px solid #8CFFC8; }
.orbwrap { position: relative; display: inline-block; }
.abarrel { position: absolute; left: 50%; top: 50%; width: 42px; height: 11px; margin-top: -5.5px; transform-origin: 0 50%; border-radius: 4px; background: #FFC93D; pointer-events: none; }
.ashell { position: absolute; width: 17px; height: 17px; margin: -8.5px 0 0 -8.5px; border-radius: 50%; z-index: 3; pointer-events: none; transition: left .18s linear, top .18s linear; background: #FFC93D; border: 2px solid #FF7A1A; }
.bhard { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: #374151; border: 2px solid #DCE6FF; }
.bsoft { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: #96622A; border: 2px solid #FFD696; }
.abomb { position: absolute; z-index: 2; transform: translate(-50%, -50%); pointer-events: none; font-size: 30px; line-height: 1; animation: bombPulse .5s ease-in-out infinite alternate; }
@keyframes bombPulse { from { scale: 1; } to { scale: 1.22; } }
.ablast { position: absolute; z-index: 2; pointer-events: none; border-radius: 6px; background: rgba(255,140,40,.75); }
.aslime { position: absolute; width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50% 50% 46% 46%; z-index: 1; pointer-events: none; transition: left .18s linear, top .18s linear; background: #58C472; }
.aslime.big { width: 58px; height: 58px; margin: -29px 0 0 -29px; }
.aslime i { position: absolute; top: 32%; width: 5px; height: 7px; border-radius: 50%; background: #10331C; }
.aslime i:first-child { left: 30%; } .aslime i:last-child { right: 30%; }
.acrystal { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1; text-align: center; pointer-events: none; font-size: 44px; line-height: 1; }
.acrystal .chp { font-size: 13px; letter-spacing: 1px; }
.pips { display: flex; gap: 9px; justify-content: center; margin: 16px 0; }
.pip { width: 30px; height: 30px; border-radius: 50%; border: 3px solid rgba(255,255,255,.5); background: rgba(255,255,255,.08); }
.pip.done { background: #FFC93D; border-color: #FFE9A8; }
.pip.now { border-color: #FFC93D; }
.symbtn { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; border: none; border-radius: 16px; padding: 16px 0; color: #fff; box-shadow: 0 3px 0 rgba(0,0,0,.3); }
.symgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.impq { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
.impq .qcard { background: rgba(255,255,255,.1); border: 2px solid rgba(255,255,255,.25); border-radius: 16px; padding: 14px; }
.mystep { display: inline-block; background: rgba(255,255,255,.13); border-radius: 12px; padding: 7px 13px; margin: 4px; font-weight: 800; }
.g-cheo-thuyen { background: #062A3F; }
.g-day-ra { background: #1D0B20; }
.g-ne-dan { background: #150826; }
.g-keo-co { background: #06231B; }
.g-chia-cuop { background: #171038; }
.stage.neon-stage h2 { text-shadow: none; }
.aball { position: absolute; width: 34px; height: 34px; border-radius: 50%; z-index: 1;
  background: #FF8C42; transform: translate(-50%, -50%);
  transition: left .18s linear, top .18s linear; border: 2px solid #D63C14; }
.rope { position: relative; height: 40px; border-radius: 999px; margin: 16px 0;
  background: linear-gradient(90deg, #4FA8E8 0 50%, #F77FB0 50% 100%); box-shadow: inset 0 -6px 0 rgba(0,0,0,.18); }
.rope .mid { position: absolute; left: 50%; top: -6px; bottom: -6px; width: 4px; background: #fff; transform: translateX(-50%); border-radius: 2px; }
.rope .knot { position: absolute; top: 50%; width: 34px; height: 34px; border-radius: 50%; background: #FFC93D;
  border: 4px solid #fff; transform: translate(-50%, -50%); transition: left .3s; }
.chatrow { display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,.22); border-radius: 14px; padding: 7px 12px; margin: 6px 0; font-weight: 700; text-align: left; }
.afield { position: relative; width: min(100%, max(340px, calc((100vh - 190px) * 16 / 9))); width: min(100%, max(340px, calc((100dvh - 190px) * 16 / 9))); aspect-ratio: 16 / 9; margin: 6px auto; border-radius: 18px;
  background: rgba(255,255,255,.06);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.18); }
.aring { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border-radius: 50%;
  background: transparent;
  border: 3px solid #78DCFF; }
/* The day-ra / ne-dan ring is resized by patchPositions via transform
   scale on a fixed full-field basis (compositor work) instead of
   width/height (a full repaint of this giant bordered circle on every
   patch). The old width/height transition is gone with it: the 125ms
   patch cadence steps the shrink, which reads fine at ring speed. */
.aring.dynring { width: 100%; height: 100%; transition: transform .13s linear; }
/* Mini live field on the PHONE player page: until now a phone
   player in an arena game saw only a D-pad and a hint to watch the
   TV — anyone playing from another room or house played blind and
   (rightly) called it lag. The same patchPositions/rafLoop
   machinery drives this field; movers shrink to phone scale. */
.afield.pfield { width: 100%; margin: 0 auto 8px; }
.afield.pfield.wide { width: 100%; }
.pfield .ablob svg { width: 28px; height: 28px; }
.pfield .afrog svg { width: 30px; height: 30px; }
.pfield .achar svg { width: 26px; height: 26px; }
.pfield .aname { font-size: 9px; padding: 0 5px; }
.pfield .alives { font-size: 8px; }
.pfield .aball { width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; }
.pfield .ashell { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }
.pfield .aslime { width: 17px; height: 17px; margin: -8.5px 0 0 -8.5px; }
.pfield .aslime.big { width: 26px; height: 26px; margin: -13px 0 0 -13px; }
.pfield .abarrel { width: 19px; height: 5px; margin-top: -2.5px; }
.pfield .abomb { font-size: 15px; }
.pfield .astar { font-size: 15px; }
.pfield .astar.gold { font-size: 22px; }
.pfield .acrown svg { width: 27px; height: 27px; }
.pfield .tgem { font-size: 13px; }
.aring.danger { border-color: #FF4757; border-width: 5px; }
/* FLAT: ringPulse removed — danger ring is a thicker solid border now. */
.ablob { position: absolute; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; text-align: center; z-index: 2; }
.ablob svg { display: block; margin: 0 auto; }
.ablob.holder svg { filter: none; }
.astar { position: absolute; transform: translate(-50%, -50%); z-index: 1; font-size: 34px; line-height: 1; color: #FFE066;
  pointer-events: none; }
.astar.gold { font-size: 50px; color: #FFC93D; }
/* FLAT: starBob removed — stars stay still and readable. */
.acrown { position: absolute; transform: translate(-50%, -135%); z-index: 3; pointer-events: none;
  transition: left .18s linear, top .18s linear; }
.acrate { position: absolute; width: 10%; aspect-ratio: 1; transform: translate(-50%, -50%); z-index: 2; pointer-events: none;
  transition: left .18s linear, top .18s linear; display: flex; align-items: center; justify-content: center; font-size: 30px;
  background: #8A5518; border: 3px solid #E8B96A; border-radius: 9px; }
.agoal { position: absolute; z-index: 0; pointer-events: none; border: 3px dashed #3ED97E; border-radius: 10px;
  background: rgba(62,217,126,.14);
  display: flex; align-items: center; justify-content: center; color: #8FF5B8; font-family: 'Baloo 2', cursive; font-weight: 800; letter-spacing: 2px; }
.awallseg { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px;
  background: #3A2C1D; border: 2px solid #E8B96A; }
.teambanner { background: #FFC93D; color: #4A2503; border-radius: 18px; padding: 14px 18px; margin: 10px 0;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 23px; text-align: center; }
.mydirs { display: flex; gap: 8px; justify-content: center; align-items: center; margin: 6px 0; font-weight: 800; }
.mydirs .dirarrow { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px;
  background: #FFB03A; color: #4A2503; font-size: 28px; box-shadow: 0 3px 0 rgba(120,70,0,.55); }
.water { position: relative; height: 150px; border-radius: 18px; margin: 14px 0; overflow: hidden;
  background: rgba(2,80,130,.4); }
.aboat { position: absolute; bottom: 26px; font-size: 56px; line-height: 1; transform: translateX(-50%); transition: left .4s ease; }
.buoy { position: absolute; right: 6px; bottom: 22px; font-size: 44px; line-height: 1; }
.beating { position: absolute; left: 50%; top: 44%; width: 118px; height: 118px; margin: -59px 0 0 -59px; border-radius: 50%; pointer-events: none;
  border: 5px solid rgba(255,224,102,.9); opacity: 0; }
.tapbtn.rowbtn { background: #0369A1; }
.tapbtn.rowbtn.now { background: #FF9F1C; color: #4A2503; animation: pop .25s ease; }
.splatgrid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(18, 1fr); grid-template-rows: repeat(10, 1fr); gap: 2px; z-index: 0; }
.scell { border-radius: 3px; background: rgba(255,255,255,.07); }
.duel-bang { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 120px; line-height: 1.1; text-align: center; color: #FFC93D;
  text-shadow: 0 6px 0 #7C2D12; animation: pop .3s ease; }
.gamecard.soon { cursor: default; opacity: .72; filter: saturate(.55); }
.cathead { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 26px; color: #7C4F27; margin: 20px 0 0; }
.ablob.hitflash svg { filter: brightness(1.8); }
.afield.slowmo .ablob, .afield.slowmo .aball { transition-duration: 1.15s; }
/* While the rAF interpolator is live it owns left/top on the movers:
   zero their CSS transitions so the two smoothing systems never stack
   (the loop itself applies the slow-mo time constant when .slowmo is
   on). Without rAF this rule never matches and transitions remain. */
.afield.raf-on .ablob, .afield.raf-on .aball, .afield.raf-on .ashell, .afield.raf-on .aslime,
.afield.raf-on .astar, .afield.raf-on .acrown, .afield.raf-on .acrate, .afield.raf-on .achar,
.afield.raf-on .tgem, .afield.raf-on .afrog, .afield.raf-on .sball, .afield.raf-on .fcrate,
.afield.raf-on .ffly { transition: none; }
/* Spawn pop for dynamically created field entities (shells, slimes,
   gems): the standalone scale property composes with the elements'
   own transform instead of overriding it. */
.pop { animation: spawnPop .3s ease-out; }
@keyframes spawnPop { 0% { scale: .2; opacity: 0; } 60% { scale: 1.22; opacity: 1; } 100% { scale: 1; opacity: 1; } }
/* Winner crown glow (podium + final screens). */
.crownglow { display: inline-block; }
/* FLAT: crownPulse removed. */
/* Playlist builder: queue badges on game cards. */
.gamecard { position: relative; }
.plbadge { position: absolute; top: 8px; right: 8px; min-width: 30px; height: 30px; padding: 0 7px; border-radius: 999px; background: #fff; color: #333;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; }
.gamecard.plon { outline: 4px solid #fff; outline-offset: -4px; }
.gamecard.pllock { opacity: .62; }
.afield.pulse { animation: fieldPulse .22s ease; }
@keyframes fieldPulse { 0% { transform: scale(1); } 40% { transform: scale(1.012); } 100% { transform: scale(1); } }
.afield.shake { animation: shakeA .3s ease; }
.afield.shake-big { animation: shakeB .45s ease; }
@keyframes shakeA { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-4px,2px) rotate(-.4deg); } 55% { transform: translate(4px,-2px) rotate(.4deg); } 80% { transform: translate(-2px,-1px); } }
@keyframes shakeB { 0%,100% { transform: translate(0,0); } 18% { transform: translate(-9px,4px) rotate(-.8deg); } 42% { transform: translate(8px,-4px) rotate(.8deg); } 66% { transform: translate(-6px,-3px) rotate(-.5deg); } 85% { transform: translate(3px,2px); } }
.fx-spark { position: absolute; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; pointer-events: none; z-index: 4;
  transition: transform .6s ease-out, opacity .6s ease-out; }
.fx-ghost { position: absolute; transform: translate(-50%, -50%); opacity: .38; pointer-events: none; z-index: 1; transition: opacity .5s ease; }
.fx-trail { position: absolute; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%; pointer-events: none; z-index: 1;
  background: rgba(255,190,90,.85); animation: trailFade .3s ease-out forwards; }
@keyframes trailFade { from { opacity: .85; transform: scale(1); } to { opacity: 0; transform: scale(.35); } }
.awarn { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; pointer-events: none; z-index: 3;
  border: 3px solid #FF4757; animation: warnPulse .28s ease-in-out 2; }
@keyframes warnPulse { 0% { transform: scale(.6); opacity: .4; } 50% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(.9); opacity: .7; } }
.ko-banner { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%) scale(.4); opacity: 0; z-index: 6;
  text-align: center; pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
.ko-banner.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.ko-txt { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 86px; line-height: 1; color: #FF4757; letter-spacing: 2px;
  text-shadow: 0 5px 0 #5C0A12; }
.ko-sub { display: inline-block; margin-top: 8px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; color: #fff;
  background: rgba(5,8,18,.6); padding: 3px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); }
.ko-big { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 66px; line-height: 1.05; color: #FF4757; letter-spacing: 2px;
  text-shadow: 0 5px 0 #5C0A12; animation: cdPunch .5s ease; }
.aname { display: inline-block; font-weight: 700; font-size: 15px; color: #fff; background: rgba(5,8,18,.55); padding: 1px 10px;
  border-radius: 999px; border: 1px solid rgba(255,255,255,.28); margin-top: 1px; }
.alives { font-size: 11px; color: #FFD7DE; letter-spacing: 1px; text-shadow: 0 1px 0 rgba(0,0,0,.35); min-height: 14px; }
.padwrap { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; }
.dpad { display: grid; grid-template-columns: repeat(3, 62px); grid-template-rows: repeat(3, 62px); gap: 4px; }
.dbtn { border: none; border-radius: 16px; background: rgba(255,255,255,.92); color: #4A3226; font-size: 24px;
  box-shadow: 0 5px 0 rgba(0,0,0,.25); touch-action: none; user-select: none; -webkit-user-select: none; }
.dbtn:active { background: #FFD98E; }
.abtns { display: flex; gap: 12px; align-items: center; }
.disc { position: relative; width: 190px; height: 190px; border-radius: 50%; flex: none;
  background: #1B2740;
  border: 1px solid rgba(140,180,255,.4); box-shadow: 0 6px 0 rgba(0,0,0,.45);
  touch-action: none; user-select: none; -webkit-user-select: none; }
.disc svg { display: block; width: 100%; height: 100%; pointer-events: none; }
.disc .seg { fill: rgba(140,180,255,.10); }
.disc .segarr { fill: #8FB4E8; }
.disc .hub { fill: #1B2740; stroke: rgba(140,180,255,.45); stroke-width: 1.2; }
.disc[data-u="1"] .seg-u, .disc[data-d="1"] .seg-d, .disc[data-l="1"] .seg-l, .disc[data-r="1"] .seg-r { fill: rgba(120,190,255,.55); }
.disc[data-u="1"] .arr-u, .disc[data-d="1"] .arr-d, .disc[data-l="1"] .arr-l, .disc[data-r="1"] .arr-r { fill: #FFFFFF; }
.abtns.dia { display: grid; grid-template-columns: repeat(3, 58px); grid-template-rows: repeat(3, 58px); gap: 2px; }
.abtns.dia .abtn { width: 58px; height: 58px; font-size: 19px; }
.abtns.dia .abtn span { font-size: 8.5px; }
.xbtn { background: #7A4FD0; }
.ybtn { background: #D9A514; }
.stage .xbtn { background: #6A32C8; box-shadow: 0 4px 0 rgba(0,0,0,.5); }
.stage .ybtn { background: #D9930D; box-shadow: 0 4px 0 rgba(0,0,0,.5); }
.abtn { width: 78px; height: 78px; border-radius: 50%; border: none; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 25px;
  color: #fff; box-shadow: 0 6px 0 rgba(0,0,0,.25); touch-action: none; user-select: none; -webkit-user-select: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
.abtn span { font-size: 11px; font-family: 'Quicksand', sans-serif; font-weight: 700; }
.abtnA { background: #E84F4F; }
.bbtn { background: #4FA8E8; width: 64px; height: 64px; font-size: 20px; }
.stage .dbtn { background: #131A29; color: #DCE6FF; border: 1px solid rgba(140,180,255,.4);
  box-shadow: 0 4px 0 rgba(0,0,0,.5); }
.stage .dbtn:active { background: #1D2C47; transform: scale(.93);
  box-shadow: 0 2px 0 rgba(0,0,0,.5); }
.stage .abtn { box-shadow: 0 4px 0 rgba(0,0,0,.5); }
.stage .abtnA { background: #D81F3C; box-shadow: 0 4px 0 rgba(0,0,0,.5); }
.stage .abtn:active { transform: scale(.93); }
.stage .bbtn { background: #1D6FD1; box-shadow: 0 4px 0 rgba(0,0,0,.5); }
input[type=text], input[type=tel] { font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 19px; color: #4A3226;
  border: 3px solid #FFE3B3; border-radius: 16px; padding: 12px 16px; background: #FFFDF8; outline: none; }
.digits { display: flex; gap: 8px; justify-content: center; }
.digits input { width: 48px; height: 60px; text-align: center; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 30px; padding: 4px; }
#toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); background: #4A3226; color: #FFF3DF; font-weight: 700;
  padding: 12px 22px; border-radius: 999px; display: none; z-index: 50; max-width: 92vw; text-align: center; }
#recon { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); background: #B3261E; color: #FFE9E6; font-weight: 700;
  padding: 9px 18px; border-radius: 999px; display: none; z-index: 60; max-width: 92vw; text-align: center; }
#confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 40; }
#confetti .cf { position: absolute; top: -20px; width: 10px; height: 15px; border-radius: 2px; animation-name: fall; animation-timing-function: linear; animation-fill-mode: forwards; }
@keyframes fall { to { transform: translateY(108vh) rotate(680deg); } }
.rev { opacity: 0; transform: translateY(8px); transition: opacity .3s, transform .3s; }
.rev.shown { opacity: 1; transform: none; }
.topbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.topbar .sp { flex: 1; }
.small { font-size: 14px; } .muted { color: #9C744C; font-weight: 700; }
@media (max-width: 720px) { .seats { grid-template-columns: repeat(2, 1fr); } .logo .word { font-size: 42px; } .codebox { width: 46px; height: 58px; font-size: 32px; } .cdnum { font-size: 110px; } .bigcircle { width: 200px; height: 200px; font-size: 27px; } }
/* --- Fullscreen stage pass -------------------------------------------------
   While a game is on (a .stage is a direct child of #app, host OR phone),
   the page wrapper goes near-full-bleed and the in-game chrome collapses
   to one compact chip row, so the play field owns the screen. The square
   fields (.afield / .ngboard) are sized by the dvh-based formulas on their
   own rules above; everything here is presentation only — positions in
   the field stay %-based, so the rAF interpolator is unaffected. In
   browsers without :has() these rules simply never match and the classic
   layout remains. */
#app:has(> .stage) { max-width: none; padding: 8px 6px 12px; }
#app:has(> .stage) .topbar { margin-bottom: 4px; }
#app:has(> .stage) .topbar .btn.small { padding: 5px 12px; font-size: 13px; }
#app:has(> .stage) .scorebar { margin: 4px 0; gap: 6px; }
#app:has(> .stage) .scorechip { font-size: 13px; padding: 2px 10px 2px 4px; }
#app:has(> .stage) .scorechip svg { width: 20px; height: 20px; }
#app:has(> .stage) > .gapline { display: none; }
.stage p.center { font-size: 13.5px; margin: 6px 0 0; line-height: 1.35; }
.stage .chatrow { padding: 5px 10px; margin: 4px 0; font-size: 14px; }
.stage .tbar { margin: 6px 0; }
.stage .diceface { width: 48px; height: 48px; font-size: 29px; border-radius: 12px; }
/* Text/card stages (quiz, werewolf village, rope, rowing…) widen to a
   generous cap instead of stretching edge-to-edge on a TV; field stages
   are excluded — they take the whole bleed. */
.stage:not(:has(.afield)):not(:has(.ngboard)) { max-width: 1180px; margin-left: auto; margin-right: auto; }
@media (min-width: 721px) {
  /* On TV-sized host screens the brand + room chip leave the play HUD:
     only the functional buttons (sound / fullscreen / leave) stay. */
  #app:has(> .stage) .topbar .baloo, #app:has(> .stage) .topbar .chip { display: none; }
}
@media (min-width: 900px) {
  /* The host's "Đổi game ✕" escape floats on the score row instead of
     eating its own line above the stage. */
  #app:has(> .stage) { position: relative; }
  #app:has(> .stage) > p:has(> [data-cmd="quitGame"]) { position: absolute; top: 44px; right: 8px; margin: 0 !important; z-index: 7; }
  #app:has(> .stage) > .scorebar { padding-right: 138px; }
}
/* Big-screen lobby / chooser / podium: use the width a TV offers.
   Phone widths are untouched (these rules start at 1500px). */
@media (min-width: 1500px) {
  .wrap { max-width: 1760px; }
  .stage:not(:has(.afield)):not(:has(.ngboard)) { max-width: 1760px; }
  .rows { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; align-content: start; }
  .wolfgrid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  .games { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .seats { grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); }
  .pod { width: 185px; }
}
/* --- 16:9 play HUD ---------------------------------------------------------
   render() stamps .playhud on #app while the host shows a field game:
   the title, timer bar, score chips and hint float OVER the stage so
   the field itself can span the TV (16:9, ~91% of a 1920px width). */
#app.playhud .stage { padding: 8px 10px; }
#app.playhud .stage > h2 { position: absolute; top: 12px; left: 18px; z-index: 8; margin: 0; pointer-events: none; font-size: 22px; }
@media (min-width: 1100px) { #app.playhud .stage:has(> #afield) > .baloo { position: absolute; top: 12px; left: 300px; right: 300px; z-index: 8; margin: 0; text-align: center; pointer-events: none; } }
#app.playhud .stage > .scorebar { position: absolute; top: 10px; right: 14px; z-index: 8; margin: 0; max-width: 62%; justify-content: flex-end; pointer-events: none; }
#app.playhud .stage > .tbar { position: absolute; top: 0; left: 0; right: 0; height: 6px; margin: 0; border-radius: 0; z-index: 9; }
#app.playhud .stage > p.center { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 8; margin: 0; max-width: 94%; padding: 5px 16px; border-radius: 999px; background: rgba(10,8,20,.55); pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#app.playhud .afield:not(.wide) { width: min(100%, calc((100vh - 104px) * 16 / 9)); width: min(100%, calc((100dvh - 104px) * 16 / 9)); margin: 0 auto; }
#app.playhud .topbar { margin-bottom: 2px; }
/* PERF MODE: while a field game is playing, render() stamps .perf on
   #app (both roles) and every decorative INFINITE animation freezes.
   An infinite animation on a full-screen stage forces the compositor
   to repaint forever — the filter ones (ringPulse brightness on the
   giant ring, poolGlow on temple pools) are the worst. One-shot
   feedback (spawnPop, boomPop, trailFade, shakes, pops) is untouched.
   Gameplay signals stay live below: a pulsing bomb is a fuse timer and
   the warning marker means incoming fire — information, not decor. */
#app.perf .blobbob, #app.perf .tpool, #app.perf .tpool::after, #app.perf .tgem i,
#app.perf .ffly, #app.perf .pip.now, #app.perf .aring.danger, #app.perf .astar,
#app.perf .acrown, #app.perf .agoal, #app.perf .crownglow { animation-play-state: paused; }
/* Spawned movers carry .pop (one-shot spawnPop from scale .2): the
   pause above must never freeze THAT animation, or a spawned star
   stays a ~7px dot for the whole match — exactly what happened in
   Cuop Sao, where a human player saw no stars while bots farmed
   them. One-shot pops always run. */
#app.perf .pop { animation-play-state: running; }
#app.perf .abomb, #app.perf .awarn { animation-play-state: running; }
/* PERF MODE also sheds the per-frame paint cost: a drop-shadow filter
   on a MOVING element re-rasterizes its blur every frame, and the
   player blobs wear one each. During field play the glow goes (the
   crown holder keeps a single cheaper shadow — one element only);
   everything returns when the game ends. */
#app.perf .ablob svg, #app.perf .afrog svg, #app.perf .afrog.carry svg { filter: none; }
#app.perf .ablob.holder svg { filter: drop-shadow(0 0 10px #FFC93D); }
/* Same logic for paint: a moving element's box-shadow forces the
   browser to repaint its blurred halo every frame, and Né Đạn
   fills the field with triple-shadowed balls plus trail ghosts.
   During field play the glow shadows go; the shapes keep their
   gradient bodies, so the field still reads at a glance. */
#app.perf .aball, #app.perf .ashell, #app.perf .fx-trail, #app.perf .aring { box-shadow: none; }
/* LITE MODE (adaptive, set by rafLoop when this device cannot hold
   ~45fps): shed shadows and blur filters page-wide until frames
   recover. A plain smooth game beats a pretty slideshow. */
body.lite .ablob svg, body.lite .afrog svg, body.lite .ablob.holder svg, body.lite .abomb, body.lite .acrystal, body.lite .astar, body.lite .aboat, body.lite .crownglow { filter: none !important; }
body.lite #afield, body.lite .card, body.lite .gamecard { box-shadow: none !important; }
body.lite .aball, body.lite .ashell, body.lite .aring, body.lite .ablob { box-shadow: none !important; }
/* Live device meter (fps / ping / push cadence) shown while playing. */
#netmeter { position: fixed; left: 10px; bottom: 10px; z-index: 9998; background: rgba(10,10,20,.72); color: #B7F0C0; font: 700 12px/1.5 system-ui, sans-serif; padding: 3px 9px; border-radius: 999px; cursor: pointer; user-select: none; }
/* Local keyboard players: per-seat overlay panels on the host screen.
   The container is created by JS and appended to <body> (never inside
   #app, whose innerHTML render() rebuilds); panels are display-only —
   pointer-events none — because input arrives via window keyboard
   handlers, and peek/cursor state lives in the LK object, not the DOM. */
#localpanels { position: fixed; inset: 0; pointer-events: none; z-index: 55; }
.lpanel { position: absolute; width: 302px; max-width: 44vw; background: rgba(17,12,30,.9); color: #FFF3DC; border: 2px solid rgba(255,255,255,.16); border-radius: 14px; padding: 9px 12px 10px; font-size: 14.5px; line-height: 1.35; }
.lpanel.lp0 { left: 10px; bottom: 10px; }
.lpanel.lp1 { right: 10px; bottom: 10px; }
.lpanel.lp2 { left: 10px; top: 66px; }
.lpanel.lp3 { right: 10px; top: 66px; }
.lphead { display: flex; align-items: center; gap: 7px; font-family: 'Baloo 2', cursive; font-size: 16.5px; margin-bottom: 3px; }
.lpdot { flex: none; width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 -3px 0 rgba(0,0,0,.25), 0 0 0 2px rgba(255,255,255,.25); }
.lpscheme { margin-left: auto; font-size: 12px; opacity: .75; font-family: 'Quicksand', sans-serif; font-weight: 700; }
.lpline { margin: 2px 0; }
.lpsecret { background: rgba(255,201,61,.14); border: 1px dashed rgba(255,201,61,.55); border-radius: 9px; padding: 5px 8px; margin: 3px 0; }
.lplist { margin: 4px 0 2px; }
.lprow { padding: 3px 9px; border-radius: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lprow.cur { background: rgba(255,201,61,.3); outline: 1.5px solid #FFC93D; }
.lpfoot { font-size: 12px; opacity: .7; margin-top: 2px; }
/* Phone mode (hostSeat): the invite-link row in the lobby, the
   my-seat section under the stage on the host page, and the recent
   room chips on the home screen. */
.shareurl { width: min(88vw, 520px); text-align: center; font-size: 15px; font-weight: 700; padding: 9px 10px; border-radius: 12px; border: 2px solid #EBD9BE; background: #FFFDF8; color: #4A3226; }
#myseat { border: 3px solid #FFD98E; margin-top: 12px; }
#myseat.phonemode { border-color: #58C472; }
button.recentchip { cursor: pointer; border: none; font-family: inherit; }
</style>
</head>
<body>
<div id="app" class="wrap"></div>
<div id="confetti"></div>
<div id="toast"></div>
<div id="recon">Đang kết nối lại…</div>
<script>
var COLORS = { blue: '#4FA8E8', pink: '#F77FB0', green: '#58C472', purple: '#A78BFA', orange: '#FFB35C', red: '#E84F4F', cyan: '#38C6D9', yellow: '#FFC93D', lime: '#9BC53D', brown: '#B07B4F', silver: '#B8C4CE', magenta: '#D63FD0' };
var LIGHT = { blue: '#9AD1F5', pink: '#FFB3D1', green: '#A9E8B2', purple: '#CDBFFD', orange: '#FFD29B', red: '#FF9D9D', cyan: '#9AE8F5', yellow: '#FFE28A', lime: '#D3EC9B', brown: '#D9B48F', silver: '#E4EBF0', magenta: '#F2A3EC' };
var SYMNAMES = ['ĐỎ', 'XANH', 'VÀNG', 'HỒNG'];
var SYMCOLORS = ['#FF4757', '#3FA9F5', '#FFC93D', '#F77FB0'];
var LETTERS = ['A', 'B', 'C', 'D'];
var WOLF_ROLE_NAMES = { soi: 'Sói 🐺', 'tien-tri': 'Tiên Tri 🔮', 'bao-ve': 'Bảo Vệ 🛡️', 'phu-thuy': 'Phù Thủy 🧙', dan: 'Dân Làng 🧑‍🌾' };
var DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
var TL_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
var TL_SUITS = ['♠', '♣', '♦', '♥'];
var TL_KIND_NAMES = { single: 'Đơn', pair: 'Đôi', triple: 'Ba con', quad: 'TỨ QUÝ', seq: 'Sảnh', dseq: 'ĐÔI THÔNG' };
var TL_IW_NAMES = { dragon: 'SẢNH RỒNG', sixpairs: 'SÁU ĐÔI', quad3: 'TỨ QUÝ 3', dseq4: 'BỐN ĐÔI THÔNG' };
function tlCardLabel(id) { return TL_RANKS[id % 13] + TL_SUITS[Math.floor(id / 13)]; }
function tlCardRed(id) { var s = Math.floor(id / 13); return s === 2 || s === 3; }
function tlChipsHTML(cards, sm) {
  var h = '';
  for (var i = 0; i < cards.length; i++) h += '<span class="tlcard2' + (sm ? ' sm' : '') + (tlCardRed(cards[i]) ? ' red' : '') + '">' + tlCardLabel(cards[i]) + '</span>';
  return h;
}
// Rendering is deliberately PLAIN (user's order after the A/B
// experiment builds): world movers dead-reckon from the newest
// anchor — no interpolation buffer, no smoothing spring — and
// decorative effects stay muted during play (see fxMuted).
var S = { role: null, code: null, token: null, seat: null, view: null, sig: '', serverOffset: 0,
  audio: null, muted: localStorage.getItem('np_muted') === '1', lastCd: -1, lastTickSec: -1,
  fxReveal: '', fxRound: '', fxConfetti: '', blobN: 0, fxP: null, _nb: null, _koT: 0, _smT: 0,
  plMode: false, plQueue: [], raf: {}, rafLast: 0,
  phoneMode: false, mySeatSig: '', myTlSel: [], myTlSig: '',
  lastOkAt: 0, lastWsAt: 0 };
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;'); }
function fmt(n) { var s = String(Math.round(Math.abs(n))); var out = ''; while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); } return (n < 0 ? '-' : '') + s + out; }
function playerOf(v, seat) { for (var i = 0; i < v.players.length; i++) if (v.players[i].seat === seat) return v.players[i]; return null; }
function gameMeta(v, id) { if (!v || !v.games) return null; for (var i = 0; i < v.games.length; i++) if (v.games[i].id === id) return v.games[i]; return null; }
function seatLocked(gm, n) { return !!gm && ((gm.min && n < gm.min) || (gm.max && n > gm.max)); }
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
    + '<path d="M50 4 C74 4 96 26 96 52 C96 79 75 96 50 96 C25 96 4 79 4 52 C4 26 26 4 50 4 Z" fill="' + c + '"/>'
    + eyes + mouth + '</svg>';
}
function crownSVG(size) {
  return '<svg width="' + size + '" height="' + Math.round(size * 0.62) + '" viewBox="0 0 100 62"><path d="M6 56 L13 16 L35 36 L50 8 L65 36 L87 16 L94 56 Z" fill="#FFC93D" stroke="#E0A92E" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="44" r="5" fill="#F77FB0"/></svg>';
}
var DARK = { blue: '#1D5C8F', pink: '#B23A72', green: '#2E7D46', purple: '#5F43B8', orange: '#C77414', red: '#A52A2A', cyan: '#177E8C', yellow: '#B8860B', lime: '#5F7D1E', brown: '#7A4A21', silver: '#6E7B87', magenta: '#8F2A87' };
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
    + '<circle cx="50" cy="50" r="46" fill="' + c + '"/>'
    + '<path d="M19 65 Q50 87 81 65" stroke="' + l + '" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>'
    + visor
    + '</svg>';
}
// Neon stick fighter for Người Que Đại Chiến: round head + line limbs,
// the pose follows live state (idle / run / air / atk arm swing / hit),
// and the punching arm points the fighter's facing way.
function stickSVG(colorName, pose, face) {
  var c = COLORS[colorName] || '#fff';
  var f = face < 0 ? -1 : 1;
  var arms, legs;
  if (pose === 'run') { arms = [[13, 15], [35, 24]]; legs = [[13, 37], [34, 40]]; }
  else if (pose === 'air') { arms = [[13, 12], [35, 12]]; legs = [[16, 39], [33, 36]]; }
  else if (pose === 'atk') { arms = f > 0 ? [[42, 17], [16, 27]] : [[6, 17], [32, 27]]; legs = [[15, 39], [33, 40]]; }
  else if (pose === 'atkh') { arms = f > 0 ? [[47, 14], [10, 30]] : [[1, 14], [38, 30]]; legs = [[13, 40], [35, 41]]; }
  else if (pose === 'hit') { arms = [[12, 10], [36, 10]]; legs = [[14, 40], [34, 40]]; }
  else { arms = [[15, 26], [33, 26]]; legs = [[17, 41], [31, 41]]; }
  var s = '<svg width="64" height="64" viewBox="0 0 48 48">';
  s += '<circle cx="24" cy="9" r="6.5" fill="' + c + '" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/>';
  s += '<g stroke="' + c + '" stroke-width="4" stroke-linecap="round">';
  s += '<line x1="24" y1="15" x2="24" y2="29"/>';
  s += '<line x1="24" y1="19" x2="' + arms[0][0] + '" y2="' + arms[0][1] + '"/>';
  s += '<line x1="24" y1="19" x2="' + arms[1][0] + '" y2="' + arms[1][1] + '"/>';
  s += '<line x1="24" y1="29" x2="' + legs[0][0] + '" y2="' + legs[0][1] + '"/>';
  s += '<line x1="24" y1="29" x2="' + legs[1][0] + '" y2="' + legs[1][1] + '"/>';
  s += '</g>';
  // Heavy swing: the punching arm is redrawn twice as thick so the
  // big wind-up reads at TV distance.
  if (pose === 'atkh') s += '<line x1="24" y1="19" x2="' + arms[0][0] + '" y2="' + arms[0][1] + '" stroke="' + c + '" stroke-width="7.5" stroke-linecap="round" opacity="0.85"/>';
  return s + '</svg>';
}
// Temple characters for Đền Lửa & Nước: a neon flame (Lửa) or droplet
// (Nước), trimmed with the player's own seat colour.
function charSVG(el, colorName) {
  var trim = COLORS[colorName] || '#fff';
  if (el === 'lua') {
    return '<svg width="52" height="57" viewBox="0 0 40 44">'
      + '<path d="M20 2 C24.5 10 30 14.5 30 24 a10 11 0 1 1 -20 0 C10 14.5 15.5 10 20 2 Z" fill="#FF5A3C" stroke="' + trim + '" stroke-width="2.6"/>'
      + '<path d="M20 16 C22.5 20.5 25 22.8 25 27.5 a5 5.5 0 1 1 -10 0 C15 22.8 17.5 20.5 20 16 Z" fill="#FFC93D"/>'
      + '<circle cx="16.5" cy="27" r="1.7" fill="#5B1503"/><circle cx="23.5" cy="27" r="1.7" fill="#5B1503"/></svg>';
  }
  return '<svg width="52" height="57" viewBox="0 0 40 44">'
    + '<path d="M20 3 C25 12 30 18 30 26 a10 10.5 0 1 1 -20 0 C10 18 15 12 20 3 Z" fill="#3FA9F5" stroke="' + trim + '" stroke-width="2.6"/>'
    + '<ellipse cx="15.5" cy="25" rx="2.6" ry="4" fill="rgba(255,255,255,.55)"/>'
    + '<circle cx="16.5" cy="27" r="1.7" fill="#06283D"/><circle cx="23.5" cy="27" r="1.7" fill="#06283D"/></svg>';
}
// Đá Bóng Đầu To players: an oversized round head in the player's own
// seat colour on a tiny team-coloured body — the head IS the hitbox star.
function bigHeadSVG(colorName, team) {
  var col = COLORS[colorName] || '#4FA8E8';
  var light = LIGHT[colorName] || '#FFFFFF';
  var shirt = team === 'do' ? '#E84F4F' : '#3FA9F5';
  return '<svg width="52" height="56" viewBox="0 0 52 56">'
    + '<path d="M18 46 h6 l-1.5 8 h-5 Z" fill="#26324A"/><path d="M28 46 h6 l1.5 8 h-5 Z" fill="#26324A"/>'
    + '<rect x="14" y="36" width="24" height="11" rx="5" fill="' + shirt + '" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/>'
    + '<circle cx="26" cy="21" r="17" fill="' + col + '" stroke="rgba(0,0,0,.28)" stroke-width="2"/>'
    + '<ellipse cx="20" cy="14" rx="6.5" ry="4" fill="' + light + '" opacity=".75"/>'
    + '<circle cx="20.5" cy="22" r="2.2" fill="#14202E"/><circle cx="31.5" cy="22" r="2.2" fill="#14202E"/>'
    + '<path d="M21 29 Q26 32.5 31 29" stroke="#14202E" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}
// Ếch Ộp frogs: a round frog in the seat colour; a carrying frog is
// drawn bigger with the passenger's colour glowing in its belly.
function frogSVG(colorName, bellyColorName) {
  var col = COLORS[colorName] || '#58C472';
  var light = LIGHT[colorName] || '#D8F5C8';
  var belly = bellyColorName ? (COLORS[bellyColorName] || '#FFFFFF') : 'rgba(255,255,255,.55)';
  var size = bellyColorName ? 56 : 46;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48">'
    + '<circle cx="15" cy="11" r="6.5" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>'
    + '<circle cx="33" cy="11" r="6.5" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>'
    + '<circle cx="15" cy="11" r="2.6" fill="#12240F"/><circle cx="33" cy="11" r="2.6" fill="#12240F"/>'
    + '<ellipse cx="24" cy="28" rx="19" ry="16.5" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1.8"/>'
    + '<ellipse cx="24" cy="33" rx="11.5" ry="8.5" fill="' + belly + '"/>'
    + '<ellipse cx="17" cy="21" rx="5.5" ry="3.2" fill="' + light + '" opacity=".8"/>'
    + '<path d="M17 27 Q24 31.5 31 27" stroke="#12240F" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}
// Chung Một Thân: the shared blob is a WHITE orb wearing the neon visor,
// ringed by four quarter arcs — one per direction, stroked in the seat
// colour of the player who owns that direction (up/right/down/left).
function sharedOrbSVG(v, size) {
  S.blobN += 1;
  var gid = 'sg' + S.blobN;
  var dirs = [['u', -90], ['r', 0], ['d', 90], ['l', 180]];
  var arcs = '';
  for (var i = 0; i < 4; i++) {
    var seat = v.game.owners ? v.game.owners[dirs[i][0]] : null;
    var p = seat ? playerOf(v, seat) : null;
    var col = p ? (COLORS[p.color] || '#FFFFFF') : '#FFFFFF';
    var a0 = (dirs[i][1] - 40) * Math.PI / 180, a1 = (dirs[i][1] + 40) * Math.PI / 180;
    var x0 = Math.round((50 + 46 * Math.cos(a0)) * 10) / 10, y0 = Math.round((50 + 46 * Math.sin(a0)) * 10) / 10;
    var x1 = Math.round((50 + 46 * Math.cos(a1)) * 10) / 10, y1 = Math.round((50 + 46 * Math.sin(a1)) * 10) / 10;
    arcs += '<path d="M' + x0 + ' ' + y0 + ' A46 46 0 0 1 ' + x1 + ' ' + y1 + '" stroke="' + col + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
  }
  var visor = '<path d="M15 39 L85 39 L78 58 Q50 67 22 58 Z" fill="#0B1020"/>'
    + '<path d="M15 39 L85 39 L82 48 L18 48 Z" fill="#1B2742"/>'
    + '<path d="M27 52.5 L50 58 L73 52.5" stroke="#FFE066" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="50" cy="44" r="2.4" fill="#FFE066"/>';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">'
    + '<circle cx="50" cy="50" r="44" fill="#E8ECF5"/>'
    + arcs
    + visor
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
// Stale-view watchdog. poll()'s own failure counter only counts failures
// spaced >=600ms apart, so when polls fail FAST (flaky WiFi against the
// 120ms in-game poll) an outage never registers and the screen can sit
// frozen on the last good frame forever. noteOk() stamps every successful
// state application; watchdog() (driven from tick) shows a reconnecting
// badge after 3s of silence and self-heals with ONE location.reload()
// after 8s — the session restores from sessionStorage and rejoins the
// same room view. The reload budget (one per 60s) is kept in
// sessionStorage so it survives the reload itself; on the home screen
// (no role) the watchdog is inert and the badge stays hidden.
function noteOk() {
  S.lastOkAt = Date.now();
  var b = el('recon'); if (b) b.style.display = 'none';
}
function watchdog() {
  var b = el('recon');
  if (!S.role || !S.code) { if (b) b.style.display = 'none'; return; }
  if (!S.lastOkAt) { S.lastOkAt = Date.now(); return; }
  var stale = Date.now() - S.lastOkAt;
  if (stale <= 3000) { if (b) b.style.display = 'none'; return; }
  if (b) b.style.display = 'block';
  if (stale > 8000) {
    var last = 0;
    try { last = +sessionStorage.getItem('np_reload_at') || 0; } catch (e) {}
    if (Date.now() - last > 60000) {
      try { sessionStorage.setItem('np_reload_at', String(Date.now())); } catch (e) {}
      location.reload();
    }
  }
}
var lastPollAt = 0;
function poll() {
  if (!S.code) return;
  wsEnsure();
  // While the WebSocket channel is live it pushes every change the
  // moment it happens, so polling demotes itself to a ~2s safety net.
  // The moment the socket drops, this gate opens and the normal rates
  // (800ms base + 120ms in-game) resume on their own.
  var tPoll = Date.now();
  // While a game is playing the safety net tightens to ~900ms: a
  // stalled push channel then freezes the screen for under a second
  // instead of up to ~3s. Other phases keep the relaxed ~2s gate.
  var gateMs = (S.view && S.view.phase === 'playing') ? 900 : 2000;
  if (wsOpen() && tPoll - lastPollAt < gateMs) return;
  lastPollAt = tPoll;
  api(stateUrl(), null, function (v) {
    if (v && v.ok) { S.failN = 0; S.failSince = 0; if (!viewStale(v) && !S.localActive) { var gapP = Date.now(); if (S.lastStateAt) { S._gapH = S._gapH || []; S._gapH.push(gapP - S.lastStateAt); if (S._gapH.length > 20) S._gapH.shift(); } S.lastStateAt = gapP; S._lastSrc = 'http'; S.view = v; noteServerTime(v.serverNow); render(); patchPositions(v); hostKbAutoSeat(v); } noteOk(); return; }
    if (v && v.net) {
      // No answer at all (offline / DNS / non-JSON reply): the room may
      // well still exist, so keep waiting — but never spin on the
      // connecting screen forever. Count only failures spaced >=600ms
      // apart (the 120ms fast poll during games must not be able to fake
      // a long outage) and give up after 5 counted failures spanning
      // at least ~3 seconds of continuous silence.
      var t = Date.now();
      if (!S.failSince) S.failSince = t;
      if (t - (S.failLast || 0) >= 600) { S.failN = (S.failN || 0) + 1; S.failLast = t; }
      if (S.failN >= 5 && t - S.failSince >= 3000) {
        if (wsOpen()) {
          // The WS channel is still feeding fresh state, so this session
          // is demonstrably alive even while HTTP polls are failing:
          // never let the poll path tear it down.
          S.failN = 0; S.failSince = 0; S.failLast = 0;
          return;
        }
        if (S.view && (S.view.phase === 'playing' || S.view.phase === 'results' || S.view.phase === 'podium')) {
          // Mid-match (or on the results/podium screens) a dead connection
          // must NOT nuke the host session: the room lives on server-side,
          // and the stale-view watchdog recovers more gently (badge, then
          // one session-restoring reload). Just restart the failure count
          // and keep waiting for the watchdog to escalate.
          S.failN = 0; S.failSince = 0; S.failLast = 0;
          return;
        }
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
var PAGE_V = 'b1873ed9ea';
var vchkN = 0;
function versionCheck() {
  // Between games only: if the server has a newer build than this
  // open tab, reload once — a stale tab must never keep playing an
  // old version (it would miss fixes like LOCAL PLAY entirely).
  // Never yank a game in progress (local or server); every other
  // phase — lobby, choosing, results — is fair game, and localStop
  // calls this directly so back-to-back local games cannot carry
  // an old build through a whole session.
  if (!S.code) return;
  if (S.view && S.view.phase === 'playing') return;
  fetch('/api/version').then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.build || j.build === PAGE_V) return;
    var last = +(sessionStorage.getItem('np_vreload') || 0);
    var lastFor = '';
    try { lastFor = sessionStorage.getItem('np_vreload_for') || ''; } catch (e) {}
    // Anti-loop guard applies only to the SAME target build: a
    // second deploy within 5 minutes must still reach the tab.
    if (Date.now() - last < 300000 && lastFor === j.build) return;
    try { sessionStorage.setItem('np_vreload', '' + Date.now()); sessionStorage.setItem('np_vreload_for', j.build); } catch (e) {}
    location.reload();
  }).catch(function () {});
}
// ---------------------------------------------------------------------
// LOCAL PLAY: when a room holds ONLY people at this screen (keyboard
// seats, the host's own seat) plus bots, the game simulation runs IN
// THIS PAGE from the shared engine (served at /engine.js) instead of
// on the server. The picture then answers to this machine's frame
// clock alone — a stalled network cannot touch it. Rooms with any
// remote (phone) player keep the server path exactly as before. The
// server room remains the membership shell; when a local game ends,
// its score deltas sync back in one small action.
// ---------------------------------------------------------------------
var L = { room: null, active: false, synced: true, startScores: null, timer: null, engLoading: false, syncTries: 0 };
function engReady() { return !!window.__NP_ENGINE; }
function engLoad() {
  if (engReady() || L.engLoading) return;
  L.engLoading = true;
  var sc = document.createElement('script');
  sc.src = '/engine.js?v=349988a5ab';
  sc.onload = function () { L.engLoading = false; };
  sc.onerror = function () { L.engLoading = false; };
  document.head.appendChild(sc);
}
function localEligible() {
  var v = S.view;
  if (S.role !== 'host' || !v || !v.players) return false;
  if (v.playlist && v.playlist.active) return false;
  for (var i = 0; i < v.players.length; i++) { var p = v.players[i]; if (p.type === 'human' && !p.local && !p.hostSeat) return false; }
  return true;
}
function localMirror() {
  var E = window.__NP_ENGINE; var v = S.view; if (!E || !v) return null;
  var room = E.newRoom(v.code, 'local');
  room.phase = v.phase;
  room.lastGame = v.lastGame || null;
  room.players = [];
  L.mirrorSeats = {};
  for (var i = 0; i < v.players.length; i++) {
    var p = v.players[i];
    L.mirrorSeats[p.seat] = true;
    room.players.push({ seat: p.seat, name: p.name, type: p.type, difficulty: p.difficulty || 'vua', score: p.score || 0, local: p.local ? true : undefined, scheme: p.scheme || 0, hostSeat: p.hostSeat ? true : undefined, token: 'local-' + p.seat });
  }
  return room;
}
function localApply() {
  var E = window.__NP_ENGINE; if (!E || !L.room) return;
  var v = E.buildView(L.room, 'host', null);
  // NOTE: S.sig must NOT be cleared here. Clearing it defeats
  // render()'s signature gate and rebuilds the entire app DOM on
  // every tick — under software rendering that saturates the
  // raster threads and collapses the frame rate to single digits
  // (found by weak-profile bisection, 2026-11-24). The server push
  // path never clears it either; structural changes flow through
  // the signature exactly as they do there.
  S.view = v; render(); patchPositions(v);
}
function localDispatch(body) {
  var E = window.__NP_ENGINE; if (!E || !L.room) return 'Phòng tại chỗ chưa sẵn sàng.';
  E.advance(L.room);
  var err = E.hostDispatch(L.room, body);
  E.advance(L.room);
  localApply();
  return err;
}
function localStart(body) {
  var room = localMirror();
  if (!room) return false;
  L.room = room;
  var err = null;
  try { err = localDispatch(body); } catch (e) { err = 'engine-error'; }
  if (err || !room.game) { L.room = null; if (err && err !== 'engine-error') toast(err); return false; }
  L.active = true; S.localActive = true; L.synced = false; L.syncTries = 0;
  L.startScores = {};
  for (var i = 0; i < room.players.length; i++) L.startScores[room.players[i].seat] = room.players[i].score || 0;
  api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'localPlay', on: true }, function () {});
  L.timer = setInterval(localTick, 31);
  toast('Đang chơi TẠI CHỖ trên máy này — mạng lag cũng không ảnh hưởng ván này.');
  return true;
}
function localTick() {
  if (!L.active || !L.room) return;
  var E = window.__NP_ENGINE;
  try { E.advance(L.room); localApply(); } catch (e) { localAbort(); return; }
  if (L.room.phase === 'playing') L.wasPlaying = true;
  if (L.room.phase === 'results' && !L.synced && Date.now() >= (L.syncNextAt || 0)) { L.synced = true; localSyncResults(); }
  else if (L.room.phase === 'lobby') localStop();
  else if (L.room.phase === 'choosing' && L.wasPlaying) { localStop(); poll(); }
}
function localSyncResults() {
  var room = L.room; if (!room) return;
  var deltas = {};
  for (var i = 0; i < room.players.length; i++) { var p = room.players[i]; var d = (p.score || 0) - (L.startScores[p.seat] || 0); if (d) deltas[p.seat] = d; }
  var bots = [];
  for (var j = 0; j < room.players.length; j++) { var bp = room.players[j]; if (bp.type === 'bot' && !(L.mirrorSeats && L.mirrorSeats[bp.seat])) bots.push({ seat: bp.seat, difficulty: bp.difficulty || 'vua' }); }
  api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'syncLocalResults', deltas: deltas, bots: bots, lastGame: room.lastGame || null }, function (v) {
    if (v && v.ok) { localStop(); S.view = v; S.sig = ''; render(); }
    else if (L.active) { L.syncTries++; if (L.syncTries <= 5) { L.synced = false; L.syncNextAt = Date.now() + 3000; } }
  });
}
function localStop() {
  if (L.timer) { clearInterval(L.timer); L.timer = null; }
  L.active = false; S.localActive = false; L.room = null;
  // A local game just ended: this is the exact moment a stale tab
  // must catch a newer build, before the next game starts.
  versionCheck();
}
function localAbort() {
  // Any engine fault drops back to the server path for the next
  // game; the current local game is abandoned rather than risked.
  localStop();
  toast('Chế độ chơi tại chỗ gặp lỗi — ván sau sẽ chạy qua máy chủ như cũ.');
}
function act(body, cb) {
  if (S.localActive && body.action !== 'leave' && body.action !== 'closeRoom') {
    var lerr = null;
    try { lerr = localDispatch(body); } catch (e) { lerr = null; }
    if (lerr) toast(lerr);
    if (cb) cb(lerr ? { error: lerr } : { ok: true });
    return;
  }
  if ((body.action === 'startGame' || body.action === 'quickStart' || body.action === 'replay') && !S.localActive && engReady() && localEligible()) {
    if (localStart(body)) { if (cb) cb({ ok: true }); return; }
  }
  body.role = S.role; body.token = S.token;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok && !viewStale(v)) { S.view = v; noteServerTime(v.serverNow); S.sig = ''; noteOk(); render(); }
    else if (v && v.error && v.error.indexOf('Không thấy phòng này') >= 0) { clearSession(); toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.'); }
    else if (v && v.error && v.error.indexOf('không hợp lệ') >= 0) clearSession();
    else if (v && v.error) toast(v.error);
    if (cb) cb(v);
  });
}
// Tiến Lên sends: like act(), but a rejected play must NEVER clear
// the session — act() drops the session on errors containing
// 'không hợp lệ', which is exactly the wording of this game's rules
// errors ('Bài không hợp lệ.'). Errors only toast, and the player's
// card selection (S.tlSel) survives the rejection untouched.
function tlSend(body) {
  body.role = S.role; body.token = S.token;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok && !viewStale(v)) { S.view = v; noteServerTime(v.serverNow); S.sig = ''; noteOk(); render(); }
    else if (v && v.error) toast(v.error);
  });
}
// ---------------------------------------------------------------------
// WebSocket live channel. Once a session exists the page also opens a
// socket to the room: the server pushes the personalized view the
// moment it changes (no poll delay) and pad snapshots ride the socket
// instead of a fresh HTTP round trip per press. HTTP stays the full
// fallback: while the socket is open, poll() demotes itself to a ~2s
// safety net (see poll), and if the socket dies the normal poll rates
// resume automatically while a reconnect is retried with backoff
// (1s, 2s, 5s, then every 10s) — the session itself is never touched,
// and every pushed state stamps noteOk() exactly like a poll, so the
// stale-view watchdog keeps working off the same freshness signal.
// ---------------------------------------------------------------------
var wsConn = null;
var wsBackoff = 0;
var wsTimer = null;
var WS_BACKOFFS = [1000, 2000, 5000, 10000];
function wsUrl() {
  var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  return proto + location.host + '/api/rooms/' + S.code + '/ws?role=' + S.role + '&token=' + encodeURIComponent(S.token);
}
function wsOpen() { return !!wsConn && wsConn.readyState === 1; }
// Push-channel watchdog (SMOOTH5). The stale-view watchdog above cannot
// see a silently dead socket: while playing, the 900ms safety poll keeps
// stamping noteOk() with fresh views, so the screen never looks stale —
// yet sendPad/sendLocalPad keep preferring the corpse socket (readyState
// still 1) and the player's inputs vanish. Track push freshness on its
// own signal: S.lastWsAt is stamped ONLY when a pushed state is applied
// below (never on open, never by polls) and cleared whenever a fresh
// socket is created, so a new socket is never judged before its first
// push. During real arena play views change every tick, so 2s of push
// silence mid-play means the channel is dead.
function wsStale() {
  if (!wsOpen()) return false;
  if (!S.view || S.view.phase !== 'playing') return false;
  if (!S.view.game || S.view.game.phase === 'countdown') return false;
  // A socket that opened but never delivered a single push is just
  // as dead as one that went silent — the old guard required a first
  // message before it could ever fire, so a blackholed connection
  // (NAT/proxy eating the return path) pinned the page to a corpse
  // socket and the slow poll gate forever.
  if (!S.lastWsAt) return !!(S.wsOpenAt && Date.now() - S.wsOpenAt > 3000);
  return Date.now() - S.lastWsAt > 2000;
}
function wsWatchdog() {
  if (!wsStale()) return;
  // Drop the corpse: poll() ungates itself the moment wsOpen() is false
  // (full 120ms in-play rate resumes) and the scheduled retry builds a
  // fresh socket. After the drop wsConn is null, so wsStale() stays
  // false until a new socket opens, receives a push, then goes silent
  // again — this cannot loop from tick().
  wsDrop();
  wsSchedule();
}
function wsEnsure() {
  if (!S.code || !S.role || !S.token) return;
  if (wsConn || wsTimer) return; // already open/connecting, or a retry is scheduled
  if (typeof WebSocket === 'undefined') return;
  var sock = null;
  try { sock = new WebSocket(wsUrl()); } catch (e) { wsSchedule(); return; }
  wsConn = sock;
  S.lastWsAt = 0;
  S.wsOpenAt = Date.now();
  sock.onopen = function () { wsBackoff = 0; };
  sock.onmessage = function (ev) {
    var msg = null;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (!msg) return;
    if (msg.type === 'state' && msg.view && msg.view.ok) {
      // Applied EXACTLY like a successful poll: fresh view, fresh
      // server-offset, watchdog stamp, render. The push-freshness stamp
      // is separate: only a real pushed state proves the socket lives.
      var gapNow = Date.now();
      if (S.lastStateAt) { S._gapH = S._gapH || []; S._gapH.push(gapNow - S.lastStateAt); if (S._gapH.length > 20) S._gapH.shift(); }
      // WS-only gap history: the poll fallback (120 ms in play) also
      // feeds _gapH, so the mixed history cannot tell whether the
      // socket itself delivers at tick rate. The render buffer and
      // the meter read the socket's own cadence when it has samples.
      if (S.lastWsAt) { S._gapWs = S._gapWs || []; S._gapWs.push(gapNow - S.lastWsAt); if (S._gapWs.length > 20) S._gapWs.shift(); }
      S._lastSrc = 'ws';
      S.lastStateAt = gapNow;
      S.lastWsAt = gapNow;
      S.failN = 0; S.failSince = 0; if (!S.localActive) { S.view = msg.view; noteServerTime(msg.view.serverNow); render(); patchPositions(msg.view); } noteOk();
    } else if (msg.type === 'pong') {
      if (msg.t) { S._rttH = S._rttH || []; S._rttH.push(Date.now() - msg.t); if (S._rttH.length > 10) S._rttH.shift(); }
    } else if (msg.type === 'error' && msg.error) {
      toast(msg.error);
    } else if (msg.type === 'bye') {
      // The server is closing this socket for a fatal reason; the
      // safety-net poll arbitrates what happens to the session.
      try { sock.close(); } catch (e) {}
    }
  };
  sock.onclose = function () { if (wsConn === sock) wsConn = null; wsSchedule(); };
  sock.onerror = function () { try { sock.close(); } catch (e) {} };
}
function wsSchedule() {
  if (wsTimer) return;
  if (!S.code || !S.role) return;
  var d = WS_BACKOFFS[Math.min(wsBackoff, WS_BACKOFFS.length - 1)];
  wsBackoff += 1;
  wsTimer = setTimeout(function () { wsTimer = null; wsEnsure(); }, d);
}
function wsDrop() {
  if (wsTimer) { clearTimeout(wsTimer); wsTimer = null; }
  wsBackoff = 0;
  if (wsConn) { var s = wsConn; wsConn = null; s.onclose = null; try { s.close(); } catch (e) {} }
}
function serverNow() { return Date.now() + S.serverOffset; }
// Clock discipline: a view's serverNow is stamped when the server
// GENERATED it, so (serverNow - receipt time) = true offset MINUS
// that view's transit delay. Adopting every sample raw (the old
// code) baked each delivery's jitter straight into the clock —
// anchor ages wobbled by the full jitter swing and rendered goals
// teleported back and forth (measured: 78 one-frame jumps > 0.3
// units and ~3 s of frozen frames in 10 s on a swinging connection).
// Track the MAXIMUM sample instead: transit can only subtract from
// it, so the maximum is the least-contaminated estimate (the
// fastest delivery), and jitter stops moving the clock. A sample
// hours below the current estimate means the clock itself stepped
// — re-seed then.
// A state view older than the one already on screen must never
// replace it. The HTTP poll (every ~900ms in play) and action
// responses are generated when the request lands and arrive a
// round trip later, by which time the WebSocket has usually
// delivered something newer: applying the stale copy regressed
// the whole view (ring radius pulsing backwards, HUD flicker,
// anchor statistics poisoned) roughly once a second.
function medOf(a) { if (!a || !a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; }
function pctOf(a, q) { if (!a || !a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * q))]; }
function viewStale(v) {
  return !!(v && S.view && typeof v.serverNow === 'number' && typeof S.view.serverNow === 'number' && v.serverNow < S.view.serverNow);
}
function noteServerTime(sn) {
  if (!sn) return;
  var now = Date.now();
  var sample = sn - now;
  if (S.serverOffset == null || sample > S.serverOffset || S.serverOffset - sample > 3600000) S.serverOffset = sample;
  // Rolling delivery stats for the interpolation buffer: how far
  // apart anchors are generated, how long they take to arrive, and
  // how much that arrival time spreads (jitter). The buffer below
  // sizes itself from all three.
  var tr = Math.max(0, (now + (S.serverOffset || 0)) - sn);
  if (S._lastSn && sn > S._lastSn) {
    S._ivH = S._ivH || []; S._ivH.push(sn - S._lastSn); if (S._ivH.length > 24) S._ivH.shift();
  }
  if (sn !== S._lastSn) {
    S._trH = S._trH || []; S._trH.push(tr); if (S._trH.length > 24) S._trH.shift();
    S._lastSn = sn;
  }
  if (S._ivH && S._ivH.length >= 4 && S._trH && S._trH.length >= 4) {
    var med = function (a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; };
    // Render delay for non-predicted movers. This used to be a full
    // anchor interval + transit (>=100 ms by construction): the
    // player's own blob is predicted at ~now while shells and other
    // players rendered 100+ ms in the past — two different time
    // frames on one field, so in Né Đạn a shell visually 1 unit
    // away was already hitting you. Ballistic movers extrapolate
    // exactly, so the buffer only needs to cover transit plus a
    // third of an interval of jitter slack.
    S.transitMs = med(S._trH);
    var trH = S._trH.slice().sort(function (a, b) { return a - b; });
    var spread = trH.length ? trH[Math.floor(trH.length * 0.9)] - med(S._trH) : 0;
    S.interpMs = Math.min(260, Math.max(35, med(S._trH) + med(S._ivH) * 0.35 + Math.min(Math.max(spread, 0), 120)));
  }
}

var DUR = { 'do-vui': 15000, 'keo-co': 20000 };
var GCOLORS = {
  'do-vui': '#6BCBFF',
  'ma-soi': '#1E1B4B', 'ca-ngua': '#78350F',
  'tien-len': '#134E4A',
  'day-ra': '#4A0E24',
  'ne-dan': '#2A0A54', 'keo-co': '#064A38',
  'chia-cuop': '#241457',
  'cuop-sao': '#8A5A00', 'giu-vuong-mien': '#5B21B6',
  'son-san': '#0E7490', 'cao-boi': '#7C2D12',
  'chung-mot-than': '#312E81', 'day-hop': '#92400E',
  'cheo-thuyen': '#0C4A6E',
  'xe-tank': '#14532D', 'dat-bom': '#7C2D12',
  'ke-gia-mao': '#4C1D95',
  'thu-thanh': '#0E7490', 'giai-ma-chung': '#3730A3',
  'nguoi-que': '#7F1D1D', 'den-lua-nuoc': '#451A03',
  'da-bong': '#14532D', 'ech-op': '#713F12',
  'can-goc': '#0C4A6E'
};
function noX2(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'cuop-sao' || id === 'giu-vuong-mien' || id === 'son-san' || id === 'chung-mot-than' || id === 'day-hop' || id === 'cheo-thuyen' || id === 'xe-tank' || id === 'dat-bom' || id === 'thu-thanh' || id === 'giai-ma-chung' || id === 'nguoi-que' || id === 'den-lua-nuoc' || id === 'da-bong' || id === 'ech-op' || id === 'can-goc' || id === 'tien-len'; }
function isActionGame(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'chia-cuop' || id === 'cuop-sao' || id === 'giu-vuong-mien' || id === 'son-san' || id === 'chung-mot-than' || id === 'day-hop' || id === 'cheo-thuyen' || id === 'xe-tank' || id === 'dat-bom' || id === 'thu-thanh' || id === 'nguoi-que' || id === 'den-lua-nuoc' || id === 'da-bong' || id === 'ech-op'; }
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
// Tiến Lên hand chips + action buttons, shared by the phone page
// (prefix 'tl', selection in S.tlSel, sends via tlSend) and the host
// page's my-seat section (prefix 'myTl', selection in S.myTlSel,
// sends via the forSeat relay): the same chips and buttons — only
// the command names and the selection store differ.
function tlHandHTML(hand, sel, pfx) {
  var h = '<div class="tlhand">';
  for (var i = 0; i < hand.length; i++) {
    var cid = hand[i];
    h += '<button class="tlcard' + (tlCardRed(cid) ? ' red' : '') + (sel.indexOf(cid) >= 0 ? ' sel' : '') + '" data-cmd="' + pfx + 'Card" data-i="' + cid + '">' + tlCardLabel(cid) + '</button>';
  }
  return h + '</div>';
}
function tlBtnsHTML(g, sel, pfx) {
  return '<p class="center">'
    + '<button class="btn green" data-cmd="' + pfx + 'Play"' + ((g.myTurn && sel.length) ? '' : ' disabled style="opacity:.45"') + '>Đánh bài (' + sel.length + ')</button> '
    + ((g.myTurn && g.table && !g.myPassed) ? '<button class="btn orange" data-cmd="' + pfx + 'Pass">Bỏ lượt</button> ' : '')
    + (sel.length ? '<button class="btn ghost" data-cmd="' + pfx + 'Clear">Bỏ chọn</button>' : '')
    + '</p>';
}
// The host's own Tiến Lên selection, keyed by the myHand signature —
// the same discipline as the phone's S.tlSel: it survives re-renders
// and rejected plays, and resets only when the hand itself changes.
function myTlSync(g) {
  var hand = (g && g.myHand) || [];
  var sig = hand.join(',');
  if (S.myTlSig !== sig) { S.myTlSig = sig; S.myTlSel = []; }
  if (!S.myTlSel) S.myTlSel = [];
  return hand;
}
// ---------------------------------------------------------------------
// My-seat section (phone mode). When the host also sits in the room
// (hostSeat), buildView attaches their own player view as v.myView;
// the host page renders it as a control block directly under the
// stage. Every send goes through localAct() with forSeat = the host's
// seat — the same relay the keyboard seats use, and never act(): a
// rules error ('Bài không hợp lệ.' and friends) must never clear the
// host's session. renderMySeat() repaints the block on its own
// signature from every render() call, because the private view can
// change while the public stage signature stands still.
// ---------------------------------------------------------------------
function mySeatHTML(v) {
  return '<div id="myseat" class="card' + (S.phoneMode ? ' phonemode' : '') + '">' + mySeatInner(v) + '</div>';
}
var MYSEAT_INTER = { 'tien-len': 1, 'ma-soi': 1, 'ca-ngua': 1, 'ke-gia-mao': 1, 'do-vui': 1, 'giai-ma-chung': 1, 'chia-cuop': 1 };
function renderMySeat() {
  var box = el('myseat');
  if (!box) { S.mySeatSig = ''; return; }
  var v = S.view;
  if (S.role !== 'host' || !v || !v.myView || v.phase !== 'playing' || !v.game) {
    if (S.mySeatSig !== '') { S.mySeatSig = ''; box.style.display = 'none'; }
    return;
  }
  box.style.display = '';
  var g = v.game;
  var sig = MYSEAT_INTER[g.id]
    ? g.id + '|' + g.phase + '|' + JSON.stringify(v.myView) + '|' + (S.myTlSel || []).join(',')
    : g.id + '|' + g.phase;
  if (sig === S.mySeatSig) return;
  var ci = el('myChatText');
  var cval = ci ? ci.value : null;
  var cfocus = !!ci && document.activeElement === ci;
  var caret = -1;
  if (cfocus) { try { caret = ci.selectionStart; } catch (e) {} }
  S.mySeatSig = sig;
  box.innerHTML = mySeatInner(v);
  if (cval !== null) {
    var ni = el('myChatText');
    if (ni) {
      ni.value = cval;
      if (cfocus) { ni.focus(); try { ni.setSelectionRange(caret < 0 ? cval.length : caret, caret < 0 ? cval.length : caret); } catch (e) {} }
    }
  }
}
function mySeatInner(v) {
  var g = v.myView;
  var seat = mySeatOf(v);
  if (!g || seat == null) return '';
  var me = playerOf(v, seat);
  var h = '<div class="baloo" style="font-size:21px">🎮 Ghế của tôi — ' + esc(me ? me.name : '') + '</div>';
  if (!v.game || v.game.phase === 'countdown') return h + '<p class="center" style="margin:6px 0 0">⏳ Chuẩn bị…</p>';
  function nm(s2) { var p = playerOf(v, s2); return p ? p.name : ''; }
  function pickBtns(cmd, kind, excludeSelf, guardSeat) {
    var out = '<div class="optgrid">';
    for (var i = 0; i < v.players.length; i++) {
      var p = v.players[i];
      if (g.aliveMap && !g.aliveMap[p.seat]) continue;
      if (excludeSelf && p.seat === seat) continue;
      var dis = guardSeat != null && p.seat === guardSeat;
      out += '<button class="opt" data-cmd="' + cmd + '"' + (kind ? ' data-kind="' + kind + '"' : '') + ' data-i="' + p.seat + '"' + (dis ? ' disabled style="opacity:.45"' : '') + '>' + esc(p.name)
        + (p.seat === seat ? ' (bạn)' : '')
        + (kind === 'wolfVote' && (g.wolfTeam || []).indexOf(p.seat) >= 0 ? ' 🐺 (đồng đội)' : '')
        + (dis ? ' · đêm qua đã bảo vệ' : '') + '</button>';
    }
    return out + '</div>';
  }
  if (g.id === 'tien-len') {
    if (g.phase === 'tlWin') {
      h += '<p class="center baloo" style="font-size:19px">🏆 ' + esc(nm(g.winner)) + ' thắng!' + (g.instantWin ? ' ⚡ TỚI TRẮNG — ' + (TL_IW_NAMES[g.instantWin.kind] || '') + '!' : '') + (g.myRank ? ' Bạn về hạng ' + g.myRank + ' · +' + fmt(g.points ? (g.points[seat] || 0) : 0) + ' điểm' : '') + '</p>';
      return h;
    }
    if (g.phase === 'cards') {
      var handT = myTlSync(g);
      if (g.table) {
        h += '<p class="center" style="margin:4px 0">Trên bàn — ' + esc(nm(g.table.seat)) + ' · ' + (TL_KIND_NAMES[g.table.kind] || '') + '</p>';
        h += '<div class="tlchips">' + tlChipsHTML(g.table.cards, true) + '</div>';
      } else h += '<p class="center" style="margin:4px 0">🃏 Bàn trống</p>';
      if (g.myRank) {
        h += '<p class="center baloo" style="font-size:19px">🏆 Bạn đã hết bài — về hạng ' + g.myRank + '!</p>';
      } else {
        if (g.myTurn) {
          h += '<p class="center baloo" style="font-size:19px">' + (g.table ? '⚔️ LƯỢT CỦA BẠN — chọn bài để CHẶN!' : '👑 LƯỢT CỦA BẠN — bạn cầm cái, chọn bài để đánh!') + '</p>';
          if (g.mustInclude3) h += '<p class="center"><span class="chip hot">Lượt đầu tiên của trận: bộ bạn đánh phải có lá 3♠!</span></p>';
        } else if (g.myPassed) {
          h += '<p class="center">✋ Bạn đã bỏ lượt vòng này — đợi vòng mới…</p>';
        } else {
          h += '<p class="center">Lượt của ' + esc(nm(g.turn)) + ' — chuẩn bị bài của bạn…</p>';
        }
        h += tlHandHTML(handT, S.myTlSel, 'myTl');
        h += tlBtnsHTML(g, S.myTlSel, 'myTl');
        h += '<p class="center small">Chạm vào lá bài để chọn / bỏ chọn — bộ không hợp lệ sẽ bị báo lỗi và lựa chọn vẫn được giữ nguyên.</p>';
      }
    }
    return h;
  }
  if (g.id === 'ma-soi') {
    h += '<div class="center"><span class="chip ' + (g.myRole === 'soi' ? 'hot' : 'cool') + '" style="font-size:16px">Vai của bạn: ' + (WOLF_ROLE_NAMES[g.myRole] || '') + '</span></div>';
    if (!g.myAlive) {
      h += '<p class="center">💀 Bạn đã chết — theo dõi tiếp trên bàn chung nhé!</p>';
    } else if (g.phase === 'night') {
      if (g.myRole === 'soi') {
        if (g.myWolfVote == null) { h += '<div class="baloo" style="font-size:19px">🐺 Chọn con mồi đêm nay:</div>' + pickBtns('myWolf', 'wolfVote', true, null); }
        else h += '<p class="center baloo" style="font-size:19px">Đã chọn con mồi: ' + esc(nm(g.myWolfVote)) + '<br><span style="font-size:16px">Phiếu sói đã vào: ' + (g.wolfVotesIn || 0) + '/' + (g.wolfTeam || []).length + '</span></p>';
      } else if (g.myRole === 'bao-ve') {
        if (g.myGuardPick == null) { h += '<div class="baloo" style="font-size:19px">🛡️ Đêm nay bạn bảo vệ ai?</div>' + pickBtns('myWolf', 'wolfGuard', false, g.myGuardLast); }
        else h += '<p class="center baloo" style="font-size:19px">🛡️ Đang bảo vệ: ' + esc(nm(g.myGuardPick)) + '</p>';
      } else if (g.myRole === 'tien-tri') {
        if (g.mySeerPick == null) { h += '<div class="baloo" style="font-size:19px">🔮 Đêm nay bạn soi ai?</div>' + pickBtns('myWolf', 'wolfSeer', true, null); }
        else { var seenW = (g.mySeerNotes || []).some(function (n2) { return n2.seat === g.mySeerPick && n2.wolf; }); h += '<p class="center baloo" style="font-size:19px">🔮 ' + esc(nm(g.mySeerPick)) + (seenW ? ' LÀ SÓI! 🐺' : ' là dân lành ✅') + '</p>'; }
        if (g.mySeerNotes && g.mySeerNotes.length) {
          h += '<p class="center small" style="margin:4px 0 0">📖 Sổ tay: ';
          for (var sn2 = 0; sn2 < g.mySeerNotes.length; sn2++) h += esc(nm(g.mySeerNotes[sn2].seat)) + (g.mySeerNotes[sn2].wolf ? ' 🐺' : ' ✅') + (sn2 < g.mySeerNotes.length - 1 ? ' · ' : '');
          h += '</p>';
        }
      } else if (g.myRole === 'phu-thuy') {
        if (g.myWitchDone) h += '<p class="center baloo" style="font-size:19px">🧙 Đã quyết định xong — đi ngủ thôi!</p>';
        else if (!g.wolvesIn) h += '<p class="center">🧙 Đợi bầy sói chọn xong con mồi… · 🧪 cứu ×' + (g.mySaveLeft || 0) + ' · ☠️ độc ×' + (g.myPoisonLeft || 0) + '</p>';
        else {
          h += '<p class="center baloo" style="font-size:19px">Con mồi của sói đêm nay: ' + (g.myVictim ? esc(nm(g.myVictim)) + (g.myVictim === seat ? ' (CHÍNH LÀ BẠN!)' : '') : '—') + '</p>';
          if ((g.mySaveLeft || 0) > 0) h += '<p class="center"><button class="btn ' + (g.myWitchSave ? 'green' : 'ghost') + '" data-cmd="myWitchSave">' + (g.myWitchSave ? '🧪 ĐÃ CHỌN CỨU — bấm để huỷ' : '🧪 Dùng thuốc cứu người này') + '</button></p>';
          else h += '<p class="center muted">Thuốc cứu đã dùng hết.</p>';
          if ((g.myPoisonLeft || 0) > 0) {
            h += '<div class="baloo" style="font-size:18px">☠️ Đầu độc ai? ' + (g.myWitchPoison ? '(đang chọn: ' + esc(nm(g.myWitchPoison)) + ')' : '(chưa chọn)') + '</div>' + pickBtns('myWolf', 'wolfPoison', true, null);
            if (g.myWitchPoison) h += '<p class="center"><button class="btn small ghost" data-cmd="myWitchClear">Bỏ chọn đầu độc</button></p>';
          } else h += '<p class="center muted">Thuốc độc đã dùng hết.</p>';
          h += '<p class="center"><button class="btn pink" data-cmd="myWitchDone">Xác nhận — đi ngủ</button></p>';
        }
      } else {
        h += '<p class="center">😴 Bạn là dân làng — ngủ ngon, đợi trời sáng…</p>';
      }
    } else if (g.phase === 'dawn') {
      h += '<p class="center baloo" style="font-size:19px">' + (g.dawnDeaths && g.dawnDeaths.length ? '☀️ Đêm qua làng mất: ' + g.dawnDeaths.map(function (d3) { return esc(nm(d3.seat)); }).join(', ') : '☀️ Đêm qua bình yên — không ai ra đi!') + '</p>';
    } else if (g.phase === 'discuss') {
      h += '<p class="center">🗣️ Bàn luận: ai là sói? (xem bàn chung ở trên)</p>';
    } else if (g.phase === 'vote') {
      if (g.voted && g.voted[seat]) h += '<p class="center baloo" style="font-size:19px">Đã bỏ phiếu! Đợi kết quả…</p>';
      else { h += '<div class="baloo" style="font-size:19px">⚖️ Treo cổ ai? Chọn người bạn nghi là sói:</div>' + pickBtns('myVote', null, true, null); }
    } else if (g.phase === 'execute') {
      h += '<p class="center baloo" style="font-size:19px">' + (g.exec && g.exec.seat ? '⚖️ ' + esc(nm(g.exec.seat)) + ' bị treo cổ — là ' + (WOLF_ROLE_NAMES[g.exec.role] || '') : '⚖️ Hôm nay không ai bị treo cổ.') + '</p>';
    } else if (g.phase === 'wolfEnd') {
      h += '<p class="center baloo" style="font-size:19px">' + (g.winner === 'soi' ? '🐺 Bầy sói thắng!' : '🎉 Dân làng thắng!') + ' · Bạn +' + fmt(g.points ? (g.points[seat] || 0) : 0) + ' điểm</p>';
    }
    return h;
  }
  if (g.id === 'ca-ngua') {
    if (g.phase === 'ngWin') {
      h += '<p class="center baloo" style="font-size:19px">🏆 ' + esc(nm(g.winner)) + ' thắng!</p>';
    } else if (g.myTurn && g.phase === 'roll') {
      h += '<p class="center baloo" style="font-size:19px">🎲 LƯỢT CỦA BẠN!</p>';
      h += '<p class="center"><button class="btn pink" data-cmd="myRoll" style="font-size:22px;padding:14px 30px">THẢY XÚC XẮC</button></p>';
      h += '<p class="center small">Thảy 6 để xuất chuồng và được thảy tiếp · Ba lần 6 liên tiếp là mất lượt!</p>';
    } else if (g.myTurn && g.phase === 'pick') {
      h += '<p class="center baloo" style="font-size:19px">Bạn thảy được: ' + (g.dice || '') + ' chấm — chọn ngựa để đi:</p>';
      if (g.myLegal && g.myLegal.length) {
        h += '<div class="optgrid">';
        for (var ml2 = 0; ml2 < g.myLegal.length; ml2++) h += '<button class="opt" data-cmd="myMove" data-i="' + g.myLegal[ml2].horse + '">🐴 Ngựa ' + (g.myLegal[ml2].horse + 1) + '<br><span style="font-size:15px">' + esc(g.myLegal[ml2].hint) + '</span></button>';
        h += '</div>';
      } else h += '<p class="center">Không có nước đi nào — đợi qua lượt…</p>';
    } else {
      h += '<p class="center">Lượt của ' + esc(nm(g.turn)) + (g.dice ? ' · vừa thảy ' + g.dice + ' chấm' : '') + ' — xem bàn cờ ở bàn chung.</p>';
    }
    return h;
  }
  if (g.id === 'ke-gia-mao') {
    if (g.phase === 'answer') {
      h += '<div class="center"><span class="chip cool">Chủ đề: ' + esc(g.category || '') + '</span></div>';
      h += '<div class="baloo" style="font-size:20px">' + esc(g.myQuestion || '') + '</div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a3 = 0; a3 < 4; a3++) h += '<button class="opt" data-cmd="myAnswer" data-i="' + a3 + '">' + LETTERS[a3] + '. ' + esc(g.options ? g.options[a3] : '') + '</button>';
        h += '</div>';
        h += '<p class="center small">Trả lời bí mật — đừng đọc to câu hỏi hay đáp án của bạn!</p>';
      } else h += '<p class="center baloo" style="font-size:19px">Đã trả lời! Đợi mọi người…</p>';
    } else if (g.phase === 'discuss') {
      h += '<p class="center">🗣️ Bàn luận: ai đang giả vờ? (xem bàn chung ở trên)</p>';
    } else if (g.phase === 'vote') {
      if (g.myVote == null) {
        h += '<div class="baloo" style="font-size:19px">Bạn tố cáo ai là kẻ giả mạo?</div><div class="optgrid">';
        for (var v3 = 0; v3 < v.players.length; v3++) { if (v.players[v3].seat === seat) continue; h += '<button class="opt" data-cmd="myVote" data-i="' + v.players[v3].seat + '">' + esc(v.players[v3].name) + '</button>'; }
        h += '</div>';
      } else h += '<p class="center baloo" style="font-size:19px">Đã tố cáo! Đợi công bố…</p>';
    } else if (g.phase === 'reveal' && g.reveal) {
      h += '<p class="center baloo" style="font-size:19px">' + (g.reveal.caught ? 'Bắt được kẻ giả mạo!' : 'Kẻ giả mạo đã thoát!') + ' Kẻ giả mạo: ' + esc(nm(g.reveal.impostor)) + (g.reveal.impostor === seat ? ' — chính là BẠN!' : '') + ' · +' + fmt(g.reveal.points[seat] || 0) + ' điểm</p>';
    }
    return h;
  }
  if (g.id === 'do-vui') {
    if (g.phase === 'question') {
      h += '<div class="baloo" style="font-size:19px">' + esc(g.question || '') + '</div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a4 = 0; a4 < 4; a4++) h += '<button class="opt" data-cmd="myAnswer" data-i="' + a4 + '">' + LETTERS[a4] + '. ' + esc(g.options[a4]) + '</button>';
        h += '</div>';
      } else h += '<p class="center baloo" style="font-size:19px">Đã trả lời! Đợi mọi người…</p>';
    } else if (g.phase === 'reveal' && g.reveal) {
      var okA = g.mine != null && g.mine === g.reveal.correct;
      h += '<p class="center baloo" style="font-size:19px">' + (okA ? 'ĐÚNG RỒI!' : 'Chưa đúng!') + ' Đáp án đúng: ' + LETTERS[g.reveal.correct] + '. ' + esc(g.options[g.reveal.correct]) + ' · +' + fmt(g.reveal.points[seat] || 0) + ' điểm</p>';
    }
    return h;
  }
  if (g.id === 'giai-ma-chung') {
    if (g.phase === 'decode' || g.phase === 'levelup') {
      h += '<p class="center">Màn ' + (g.level || 1) + ' · Tim đội: ' + '❤'.repeat(Math.max(0, g.hearts || 0)) + ' · Tiến độ: ' + (g.done || 0) + '/' + (g.total || 0) + ' bước · Đã qua ' + (g.levelsDone || 0) + ' màn</p>';
      if (g.phase === 'levelup') h += '<p class="center baloo" style="font-size:19px">QUA MÀN! 🎉</p>';
      var ms3 = g.mySteps || [];
      h += '<p class="center" style="margin:4px 0"><b>Phần mật mã của bạn:</b> ';
      if (!ms3.length) h += 'Màn này bạn không giữ bước nào — cổ vũ đồng đội nhé!';
      for (var s3 = 0; s3 < ms3.length; s3++) h += '<span class="mystep">Bước ' + ms3[s3].pos + ': <span style="color:' + SYMCOLORS[ms3[s3].sym] + '">' + ms3[s3].name + '</span></span> ';
      h += '</p>';
      h += '<div class="symgrid">';
      for (var y3 = 0; y3 < 4; y3++) h += '<button class="symbtn" data-cmd="mySymbol" data-i="' + y3 + '" style="background:' + SYMCOLORS[y3] + '">' + SYMNAMES[y3] + '</button>';
      h += '</div>';
      h += '<p class="center small">Chỉ bấm khi tới lượt bước của bạn và đúng ký hiệu của bước đó — bấm sai cả đội mất 1 tim!</p>';
    }
    return h;
  }
  if (g.id === 'chia-cuop') {
    var inPair2 = g.pair && g.pair.indexOf(seat) >= 0;
    if (g.phase === 'talk') {
      h += '<p class="center baloo" style="font-size:19px">Nồi ' + fmt(g.pot || 400) + ' điểm' + (g.finalRound ? ' · VÒNG CUỐI ×2' : '') + '</p>';
      if (g.chat) for (var c3 = 0; c3 < g.chat.length; c3++) { var cp3 = playerOf(v, g.chat[c3].seat); h += '<div class="chatrow">' + blobSVG(cp3 ? cp3.color : 'blue', 'cuoi', 24) + ' <b>' + esc(cp3 ? cp3.name : '') + ':</b> ' + esc(g.chat[c3].text) + '</div>'; }
      if (inPair2) {
        h += '<p class="center">Bạn đấu với <b>' + esc(nm(g.pair[g.pair[0] === seat ? 1 : 0])) + '</b>. Nói gì cũng được — lát nữa chọn mới là thật!</p>';
        h += '<p class="center"><input type="text" id="myChatText" maxlength="60" placeholder="Lời thương lượng…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="myChatSend">Gửi</button></p>';
      } else {
        h += '<p class="center">Vòng này hai người khác thương lượng — bạn ngồi ngoài xem.</p>';
      }
    } else if (g.phase === 'choose') {
      if (!inPair2) h += '<p class="center">Hai người kia đang chọn bí mật…</p>';
      else if (g.mineChosen) h += '<p class="center baloo" style="font-size:19px">Đã khoá lựa chọn! Đợi đối thủ…</p>';
      else {
        h += '<p class="center baloo" style="font-size:19px">CHỌN BÍ MẬT ĐI!</p>';
        h += '<p class="center">Cả hai CHIA: mỗi người một nửa nồi · Một người CƯỚP: cướp hết · Cả hai CƯỚP: mất trắng!</p>';
        h += '<p class="center"><button class="btn green" data-cmd="myChoose" data-c="chia" style="font-size:20px">CHIA</button> <button class="btn pink" data-cmd="myChoose" data-c="cuop" style="font-size:20px">CƯỚP</button></p>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var myE3 = null;
      for (var q3 = 0; q3 < g.reveal.entries.length; q3++) if (g.reveal.entries[q3].seat === seat) myE3 = g.reveal.entries[q3];
      h += '<p class="center baloo" style="font-size:19px">' + (myE3 ? 'Bạn đã ' + (myE3.choice === 'cuop' ? 'CƯỚP' : 'CHIA') + ' · +' + fmt(myE3.points) + ' điểm' : 'Xem kết quả ở bàn chung!') + '</p>';
    }
    return h;
  }
  // Any other game (real-time pads and friends): the host's own seat
  // has no touch controls on this screen — say so plainly instead of
  // rendering dead buttons.
  return h + '<p class="center" style="margin:6px 0 0">Game hành động cần bàn phím hoặc điện thoại — quay lại sảnh rồi bấm “⌨️ Chơi bằng phím ngay trên máy này” là chơi được ngay trên máy này.</p>';
}
function seatCard(v, seat) {
  var p = playerOf(v, seat);
  if (!p) {
    var h = '<div class="seat"><div style="opacity:.45">' + blobSVG('orange', 'ngu', 84) + '</div>';
    h += '<div class="nm muted">P' + seat + ' · Trống</div>';
    if (seat >= 2 && (v.phase === 'lobby' || v.phase === 'choosing')) {
      h += '<button class="btn small orange" data-cmd="addBot" data-seat="' + seat + '">+ Máy</button>';
      var nLoc0 = 0; for (var li0 = 0; li0 < v.players.length; li0++) if (v.players[li0].local) nLoc0++;
      if (nLoc0 < 4) h += ' <button class="btn small blue" data-cmd="addLocal" data-seat="' + seat + '">+ Phím</button>';
    }
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
  } else if (p.local) {
    h2 += '<div><span class="chip cool">NGƯỜI CHƠI · BÀN PHÍM</span></div>';
    h2 += '<div class="small muted" style="margin-top:4px">' + esc(LK_SCHEME_SUMMARY[p.scheme || 0] || '') + '</div>';
    if (v.phase === 'lobby' || v.phase === 'choosing') {
      h2 += '<div style="margin-top:6px"><button class="btn small ghost" data-cmd="cycleScheme" data-seat="' + seat + '">Đổi bộ phím</button> ';
      h2 += '<button class="btn small ghost" data-cmd="removeBot" data-seat="' + seat + '">Xoá phím</button></div>';
    }
  } else if (p.hostSeat) {
    h2 += '<div><span class="chip hot">CHỦ PHÒNG · ĐANG CHƠI</span></div>';
    if (v.phase === 'lobby' || v.phase === 'choosing') {
      h2 += '<div style="margin-top:6px"><button class="btn small ghost" data-cmd="hostLeave">Rời ghế</button></div>';
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
    h += '<p class="center" style="margin:10px 0 0">🔗 Link mời bạn bè: <input class="shareurl" id="shareLink" readonly value="' + esc((location.origin || (location.protocol + '//' + location.host)) + '/?code=' + v.code) + '"> <button class="btn small blue" data-cmd="copyLink">Sao chép link</button></p>';
    var kbFreeT = 0, kbLocT = 0;
    for (var liT = 0; liT < v.players.length; liT++) if (v.players[liT].local) kbLocT++;
    if (kbLocT < 4) for (var fsT = 2; fsT <= 12; fsT++) if (!playerOf(v, fsT)) { kbFreeT = fsT; break; }
    var canKbT = !('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer:fine)').matches);
    h += '<div style="border:3px solid #58C472;border-radius:16px;padding:10px 12px;margin:12px 0 4px;background:rgba(88,196,114,.10)">';
    h += '<div class="center baloo" style="font-size:19px;margin-bottom:8px">🎮 Chủ phòng cũng chơi — chọn cách chơi của bạn</div>';
    h += '<p class="center" style="margin:0">';
    if (kbFreeT && canKbT) h += '<button class="btn green" data-cmd="hostPlayKb" data-seat="' + kbFreeT + '">⌨️ Chơi bằng bàn phím máy này</button> ';
    h += '<button class="btn blue" data-cmd="hostPhone">📱 Chơi bằng điện thoại</button> ';
    if (!mySeatOf(v)) h += '<button class="btn ghost" data-cmd="hostJoinBtn">Ngồi vào ghế trên màn hình này</button>';
    h += '</p>';
    if (S.phoneHelp) h += '<p class="center" style="margin:8px 0 0">Mở Nảy Party trên điện thoại của bạn, nhập mã phòng <b>' + esc(v.code) + '</b> hoặc quét mã QR phía trên — bạn vào như một người chơi bình thường.</p>';
    h += '</div>';
    h += '<div class="seats">';
    for (var s = 1; s <= 12; s++) h += seatCard(v, s);
    h += '</div>';
    var humans = 0; for (var j = 0; j < v.players.length; j++) if (v.players[j].type === 'human') humans++;
    h += '<p class="center" style="margin-top:14px">';
    if (humans < 1) h += '<span class="chip hot">Cần ít nhất 1 người chơi (điện thoại hoặc bàn phím)</span>';
    else if (v.players.length < 2) h += '<span class="chip hot">Thêm Máy hoặc rủ thêm bạn để đủ 2 người</span>';
    else h += '<span class="chip cool">Sẵn sàng! Chọn một game bên dưới để bắt đầu</span>';
    h += '</p>';
    h += '<p class="center small muted" style="margin:8px 0 0">Chơi ngay trên màn hình này: mỗi ghế trống cũng có nút + Phím / + Máy riêng.</p>';
    h += '</div>';
    // Game chooser, grouped by category: versus games race for
    // placement points; co-op games score the whole team one tier.
    // In playlist mode the same cards become queue toggles instead of
    // one-tap starts, with numbered badges showing the queue order.
    function gameCard(gm) {
      // Seat-range lock (same pattern in both modes): a game whose
      // [min, max] excludes the current seat count shows WHY, and a
      // tap explains instead of mysteriously failing.
      var nP = v.players.length;
      var rangeTxt = (gm.min === gm.max ? gm.min : gm.min + '–' + gm.max) + ' người';
      var lockWhy = '';
      if (gm.min && nP < gm.min) lockWhy = '🔒 Cần ít nhất ' + gm.min + ' người chơi (đang có ' + nP + ')';
      else if (gm.max && nP > gm.max) lockWhy = '🔒 Tối đa ' + gm.max + ' người chơi (đang có ' + nP + ')';
      if (S.plMode) {
        var qi = S.plQueue.indexOf(gm.id);
        return '<button class="gamecard' + (qi >= 0 ? ' plon' : '') + (lockWhy ? ' pllock' : '') + '" style="background:' + GCOLORS[gm.id] + '" data-cmd="plToggle" data-game="' + gm.id + '">'
          + (qi >= 0 ? '<span class="plbadge">' + (qi + 1) + '</span>' : '')
          + '<h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p>'
          + (lockWhy ? '<p class="small">' + lockWhy + '</p>' : '<p class="small">' + rangeTxt + ' · ' + (qi >= 0 ? 'Đã chọn · chạm để bỏ khỏi hàng chờ' : 'Chạm để thêm vào hàng chờ') + '</p></button>');
      }
      var small = gm.cat === 'coop' ? '1 trận hợp tác · Cả đội cùng nhận điểm theo hạng' : (gm.rounds > 1 ? gm.rounds + ' vòng · Vòng cuối ×2 điểm' : '1 trận sống còn · 300/200/100/50');
      if (lockWhy) {
        if (gm.min && nP < gm.min) {
          return '<button class="gamecard" style="background:' + GCOLORS[gm.id] + '" data-cmd="quickStart" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">▶ Thiếu ' + (gm.min - nP) + ' người — chạm để thêm Máy và chơi ngay</p></button>';
        }
        return '<button class="gamecard pllock" style="background:' + GCOLORS[gm.id] + '" data-cmd="startLocked" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">' + lockWhy + '</p></button>';
      }
      return '<button class="gamecard" style="background:' + GCOLORS[gm.id] + '" data-cmd="start" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">' + rangeTxt + ' · ' + small + '</p></button>';
    }
    // Playlist builder: arm the mode, tap cards to queue them, then
    // start the chain — or take a preset (random 5 / everything).
    h += '<div class="card center" style="margin-top:12px">';
    if (!S.plMode) {
      h += '<button class="btn purple" data-cmd="plMode">🔁 Chế độ liên hoàn</button>';
      h += '<p class="small muted" style="margin:8px 0 0">Chọn sẵn nhiều game để chơi nối tiếp nhau — hết game này tự sang game kia, cả phòng không phải chọn lại.</p>';
    } else {
      h += '<div class="baloo" style="font-size:21px">🔁 Chế độ liên hoàn</div>';
      h += '<p style="margin:6px 0">Chạm vào các game bên dưới để xếp hàng chờ · đã chọn ' + S.plQueue.length + ' game</p>';
      if (S.plQueue.length) {
        h += '<p class="small" style="margin:4px 0">';
        for (var qi2 = 0; qi2 < S.plQueue.length; qi2++) { var qm = gameMeta(v, S.plQueue[qi2]); h += '<span class="chip cool">' + (qi2 + 1) + '. ' + esc(qm ? qm.name : S.plQueue[qi2]) + '</span>'; }
        h += '</p>';
      }
      h += '<p style="margin:8px 0 0"><button class="btn green" data-cmd="plStart">▶ Chơi liên hoàn (' + S.plQueue.length + ' game)</button> ';
      h += '<button class="btn blue" data-cmd="plRandom">🎲 Ngẫu nhiên 5 game</button> ';
      h += '<button class="btn orange" data-cmd="plAll">🏆 Tất cả game</button> ';
      h += '<button class="btn ghost" data-cmd="plMode">Tắt liên hoàn</button></p>';
    }
    h += '</div>';
    h += '<div class="cathead">🏆 Đấu với nhau</div><div class="games">';
    for (var k = 0; k < v.games.length; k++) if (v.games[k].cat !== 'coop') h += gameCard(v.games[k]);
    h += '</div>';
    h += '<div class="cathead">🤝 Hợp tác</div><div class="games">';
    for (var k2 = 0; k2 < v.games.length; k2++) if (v.games[k2].cat === 'coop') h += gameCard(v.games[k2]);
    h += '</div>';
    return h;
  }
  if (v.phase === 'playing' && v.game) {
    h += scoreStrip(v);
    h += '<p style="text-align:right;margin:2px 0 0"><button class="btn small ghost" data-cmd="quitGame" title="Bỏ game đang chơi, về màn hình chọn game — điểm ván này không tính">Đổi game ✕</button></p>';
    h += '<div class="stage g-' + v.game.id + (isActionGame(v.game.id) ? ' neon-stage' : '') + '">' + hostStage(v) + '</div>';
    if (v.myView) h += mySeatHTML(v);
    return h;
  }
  if (v.phase === 'results') return h + resultsHTML(v, true);
  if (v.phase === 'podium') return h + podiumHTML(v, true);
  if (v.phase === 'final') return h + finalHTML(v, true);
  return h + '<div class="card center"><h2>Đang tải…</h2></div>';
}
function countdownHTML(g) {
  var title = g.id === 'ma-soi' ? 'Đêm ' + g.round : (g.id === 'ca-ngua' || g.id === 'tien-len') ? 'Bắt đầu nào!' : 'Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · VÒNG QUYẾT ĐỊNH ×2' : '');
  return '<div class="cdwrap"><div class="baloo" style="font-size:30px">' + title + '</div>'
    + '<div class="cdnum" id="cdnum">3</div><div class="baloo" style="font-size:24px">Chuẩn bị…</div></div>';
}
// Shared client helpers for the two platformer games (wave 4): rect
// geometry in the arena's % space, stick-fighter pose + damage colour.
function rectStyle(r) { return 'left:' + PX(r.x) + '%;top:' + PY(r.y) + '%;width:' + (r.w / 32 * 100) + '%;height:' + (r.h / 18 * 100) + '%'; }
// Đá Bóng Đầu To maps its 38 x 19.2 space onto the wide field.
function rectStyleS(r) {
  return 'left:' + ((r.x + 19) / 38 * 100) + '%;top:' + ((r.y + 9.6) / 19.2 * 100) + '%;width:' + (r.w / 38 * 100) + '%;height:' + (r.h / 19.2 * 100) + '%';
}
function pctS(x, y) { return { l: (x + 19) / 38 * 100, t: (y + 9.6) / 19.2 * 100 }; }
function fightPose(b) {
  if (!b.alive || b.hit) return 'hit';
  if (b.hvy) return 'atkh';
  if (b.atk) return 'atk';
  if (!b.ground) return 'air';
  if (Math.abs(b.vx || 0) > 0.1) return 'run';
  return 'idle';
}
function dmgColor(d) { return d >= 100 ? '#FF5A3C' : d >= 50 ? '#FFC93D' : '#7BE0B8'; }
function hostStage(v) {
  var g = v.game;
  if (g.phase === 'countdown') return countdownHTML(g);
  var h = '<h2>' + esc(g.name) + (g.id === 'ma-soi' ? ' · Đêm ' + (g.night || g.round) : (g.id === 'ca-ngua' || g.id === 'tien-len') ? '' : ' · Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · ×2' : '')) + '</h2>';
  var t = serverNow();
  if (g.id === 'do-vui') {
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
  } else if (g.id === 'day-ra') {
    if (g.phase === 'arena') {
      h += '<div class="baloo" style="font-size:25px">Đẩy hết đối thủ ra khỏi vòng tròn! Sàn đang thu hẹp dần…</div>';
      h += '<div class="afield" id="afield"><div class="aring dynring" id="aring" style="transform:translate(-50%,-50%) scale(' + (g.arenaR * 25 / 300) + ')"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      for (var aI = 0; aI < v.players.length; aI++) { var ap = v.players[aI]; h += '<div class="ablob" id="ablob-' + ap.seat + '" style="left:50%;top:50%;color:' + COLORS[ap.color] + '">' + orbSVG(ap.color, 62) + '<div class="aname">' + esc(ap.name) + '</div><div class="alives" id="alives-' + ap.seat + '"></div></div>'; }
      h += '</div>';

    }
  } else if (g.id === 'ne-dan') {
    if (g.phase === 'dodge') {
      h += '<div class="baloo" style="font-size:25px">Né hết đạn pháo! Trúng là mất 1 mạng…</div>';
      h += '<div class="afield" id="afield"><div class="aring dynring" id="aring" style="transform:translate(-50%,-50%) scale(' + (g.arenaR * 25 / 300) + ')"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      for (var dI = 0; dI < v.players.length; dI++) { var dp = v.players[dI]; h += '<div class="ablob" id="ablob-' + dp.seat + '" style="left:50%;top:50%;color:' + COLORS[dp.color] + '">' + orbSVG(dp.color, 62) + '<div class="aname">' + esc(dp.name) + '</div><div class="alives" id="alives-' + dp.seat + '"></div></div>'; }
      h += '</div>';

    }
  } else if (g.id === 'keo-co') {
    if (g.phase === 'pull') {
      h += '<div class="baloo" style="font-size:25px">Đội A (ghế lẻ) ⟵ KÉO! ⟶ Đội B (ghế chẵn)</div>';
      var kpct = Math.max(3, Math.min(97, 50 + (g.knot / 112) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" id="tugknot" style="left:' + kpct + '%"></div></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var tI = 0; tI < v.players.length; tI++) { var tp = v.players[tI]; var tm = tp.seat % 2 === 1 ? 'A' : 'B'; h += '<span class="scorechip">' + blobSVG(tp.color, tp.mood, 28) + ' ' + esc(tp.name) + ' · Đội ' + tm + ' · <span id="tugpress-' + tp.seat + '">' + (g.presses ? (g.presses[tp.seat] || 0) : 0) + '</span> lần kéo</span>'; }
      h += '</div>';

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
  } else if (g.id === 'cuop-sao') {
    if (g.phase === 'steal') {
      h += '<div class="baloo" style="font-size:25px">Nhặt sao vàng, xô đối thủ cho rơi sao! Sao lớn = 3 sao thường</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div>';
      for (var aI2 = 0; aI2 < v.players.length; aI2++) { var ap2 = v.players[aI2]; h += '<div class="ablob" id="ablob-' + ap2.seat + '" style="left:50%;top:50%;color:' + COLORS[ap2.color] + '">' + orbSVG(ap2.color, 62) + '<div class="aname">' + esc(ap2.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var bI = 0; bI < v.players.length; bI++) { var bp = v.players[bI]; h += '<span class="scorechip">' + orbSVG(bp.color, 26) + ' ' + esc(bp.name) + ' · ★ <span id="bankn-' + bp.seat + '">' + (g.banked ? (g.banked[bp.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'giu-vuong-mien') {
    if (g.phase === 'crown') {
      h += '<div class="baloo" style="font-size:25px">Giành vương miện và giữ càng lâu càng tốt! Bị xô là rơi vương miện</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div><div class="acrown" id="acrown" style="left:50%;top:50%">' + crownSVG(60) + '</div>';
      for (var cI3 = 0; cI3 < v.players.length; cI3++) { var cp3 = v.players[cI3]; h += '<div class="ablob" id="ablob-' + cp3.seat + '" style="left:50%;top:50%;color:' + COLORS[cp3.color] + '">' + orbSVG(cp3.color, 62) + '<div class="aname">' + esc(cp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var hI = 0; hI < v.players.length; hI++) { var hp = v.players[hI]; h += '<span class="scorechip">' + orbSVG(hp.color, 26) + ' ' + esc(hp.name) + ' · 👑 <span id="holdn-' + hp.seat + '">' + (g.hold ? (g.hold[hp.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'son-san') {
    if (g.phase === 'splat') {
      h += '<div class="baloo" style="font-size:25px">Chạy sơn sàn theo màu của mình — hết giờ ai nhiều ô nhất thắng!</div>';
      h += '<div class="afield" id="afield"><div class="splatgrid">';
      for (var gI = 0; gI < 180; gI++) { var gs = g.grid ? g.grid[gI] : 0; var gp2 = gs ? playerOf(v, gs) : null; h += '<div class="scell" id="scell-' + gI + '"' + (gp2 ? ' style="background:' + COLORS[gp2.color] + '"' : '') + '></div>'; }
      h += '</div>';
      for (var sI3 = 0; sI3 < v.players.length; sI3++) { var sp3 = v.players[sI3]; h += '<div class="ablob" id="ablob-' + sp3.seat + '" style="left:50%;top:50%;color:' + COLORS[sp3.color] + '">' + orbSVG(sp3.color, 54) + '<div class="aname">' + esc(sp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var cI4 = 0; cI4 < v.players.length; cI4++) { var cp4 = v.players[cI4]; h += '<span class="scorechip">' + orbSVG(cp4.color, 26) + ' ' + esc(cp4.name) + ' · <span id="scount-' + cp4.seat + '">' + (g.counts ? (g.counts[cp4.seat] || 0) : 0) + '</span> ô</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'cao-boi') {
    if (g.phase === 'wait') h += '<div class="bigcircle wait">ĐỢI…<br><span style="font-size:19px">Tay để yên trên nút…</span></div>';
    else if (g.phase === 'go') h += '<div class="duel-bang">BẮN!</div>';
    if (g.phase === 'roundEnd' && g.lastRound) {
      h += '<div class="rows">';
      for (var dI2 = 0; dI2 < g.lastRound.entries.length; dI2++) {
        var de = g.lastRound.entries[dI2]; var dp2 = playerOf(v, de.seat);
        var mid2 = de.status === 'fired' ? de.reactionMs + ' ms' + (de.order === 1 ? ' · NHANH NHẤT!' : ' · thứ ' + de.order) : (de.status === 'foul' ? 'Phạm quy! Bắn trước hiệu lệnh' : 'Không bắn');
        h += '<div class="rrow">' + blobSVG(dp2.color, dp2.mood, 34) + ' ' + esc(dp2.name) + '<span class="muted">' + mid2 + '</span><span class="pts">' + (de.points > 0 ? '+' : '') + fmt(de.points) + '</span></div>';
      }
      h += '</div>';
    } else if (g.phase !== 'roundEnd') {
      h += '<div class="scorebar">';
      for (var dI3 = 0; dI3 < v.players.length; dI3++) { var dp3 = v.players[dI3]; var dst = g.status ? g.status[dp3.seat] : 'waiting'; h += '<span class="scorechip">' + blobSVG(dp3.color, dp3.mood, 28) + ' ' + esc(dp3.name) + ' · ' + (dst === 'fired' ? 'đã bắn!' : dst === 'foul' ? 'phạm quy!' : 'đang đợi…') + '</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'chung-mot-than') {
    if (g.phase === 'shared') {
      h += '<div class="scorebar"><span class="scorechip">⭐ Điểm kiểm tra: <b id="checkn">' + (g.checks || 0) + '</b></span><span class="scorechip">Tim đội: <b id="teamhearts">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</b></span>';
      var dirNames = { u: '▲ Lên', r: '▶ Phải', d: '▼ Xuống', l: '◀ Trái' };
      var dirKeys = ['u', 'r', 'd', 'l'];
      for (var oI = 0; oI < 4; oI++) { var op = g.owners ? playerOf(v, g.owners[dirKeys[oI]]) : null; if (op) h += '<span class="scorechip">' + dirNames[dirKeys[oI]] + ': ' + esc(op.name) + '</span>'; }
      h += '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - 60000) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="afield" id="afield"><div class="aring" style="width:95%;height:91.1%"></div>';
      if (g.star) h += '<div class="astar gold" id="cstar" style="left:' + PX(g.star.x) + '%;top:' + PY(g.star.y) + '%">★</div>';
      h += '<div class="ablob" id="sharedblob" style="left:50%;top:50%">' + sharedOrbSVG(v, 66) + '<div class="aname">CẢ ĐỘI</div></div>';
      h += '</div>';
      h += '<p class="center">Một quả bóng, bốn người lái — mỗi người giữ một hướng! Chạm sao ⭐ là +1 điểm kiểm tra · Trúng đạn là cả đội mất 1 tim</p>';
    }
  } else if (g.id === 'day-hop') {
    if (g.phase === 'box') {
      h += '<div class="scorebar"><span class="scorechip">📦 Đã giao: <b id="delivn">' + (g.deliveries || 0) + '</b> hộp</span><span class="scorechip">Mê cung ' + ((g.layout || 0) + 1) + '/3</span></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="afield" id="afield">';
      if (g.goal) h += '<div class="agoal" style="' + rectStyle(g.goal) + '">ĐÍCH</div>';
      if (g.walls) for (var wI = 0; wI < g.walls.length; wI++) { var wl = g.walls[wI]; h += '<div class="awallseg" style="' + rectStyle(wl) + '"></div>'; }
      h += '<div class="acrate" id="acrate" style="left:50%;top:50%">📦</div>';
      for (var pI3 = 0; pI3 < v.players.length; pI3++) { var pp3 = v.players[pI3]; h += '<div class="ablob" id="ablob-' + pp3.seat + '" style="left:50%;top:50%;color:' + COLORS[pp3.color] + '">' + orbSVG(pp3.color, 58) + '<div class="aname">' + esc(pp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<p class="center">Một người đẩy không nhúc nhích — phải từ 2 người cùng đẩy mới đi! Đưa hộp vào ô ĐÍCH xanh lá</p>';
    }
  } else if (g.id === 'cheo-thuyen') {
    if (g.phase === 'row') {
      h += '<div class="baloo" style="font-size:25px">Cả đội chèo theo nhịp — bấm đúng nhịp vàng mới tiến!</div>';
      h += '<div class="scorebar"><span class="scorechip">🚣 Đã đi: <b id="rowdist">' + Math.round(g.distance || 0) + '</b>/' + (g.course || 400) + ' m</span><span class="scorechip">Nhịp <b id="rowbeat">' + (g.beat || 1) + '</b>/' + (g.beats || 45) + '</span></div>';
      h += '<div class="racebar"><i id="rowprog" style="background:#38BDF8;width:0%"></i><b>Tiến độ về đích</b></div>';
      h += '<div class="water"><div class="beating" id="beating"></div><div class="aboat" id="aboat" style="left:5%">🚣</div><div class="buoy">🏁</div></div>';
      h += '<div class="tbar"><i data-start="' + g.rowStart + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var rI3 = 0; rI3 < v.players.length; rI3++) { var rp3 = v.players[rI3]; h += '<span class="scorechip">' + orbSVG(rp3.color, 26) + ' ' + esc(rp3.name) + ' · trúng nhịp <span id="rowhit-' + rp3.seat + '">' + (g.hits ? (g.hits[rp3.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'xe-tank') {
    if (g.phase === 'tank') {
      h += '<div class="baloo" style="font-size:25px">Lái xe tăng, bắn hạ đối thủ! Núp sau thùng chắn — đạn không xuyên qua được</div>';
      h += '<div class="afield" id="afield"><div class="aframe" style="left:2.5%;top:4.44%;width:95%;height:91.11%"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      if (g.blocks) for (var kI = 0; kI < g.blocks.length; kI++) { var kb = g.blocks[kI]; h += '<div class="ablock" style="' + rectStyle(kb) + '"></div>'; }
      for (var tI2 = 0; tI2 < v.players.length; tI2++) { var tp2 = v.players[tI2]; var fc = g.facing ? g.facing[tp2.seat] : null; var deg = fc ? Math.round(Math.atan2(fc.y, fc.x) * 180 / Math.PI) : 0; h += '<div class="ablob" id="ablob-' + tp2.seat + '" style="left:50%;top:50%;color:' + COLORS[tp2.color] + '"><span class="orbwrap">' + orbSVG(tp2.color, 62) + '<span class="abarrel" id="barrel-' + tp2.seat + '" style="transform:rotate(' + deg + 'deg)"></span></span><div class="aname">' + esc(tp2.name) + '</div><div class="alives" id="alives-' + tp2.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Trúng đạn mất 1 mạng · Hết 3 mạng là bị loại · A: bắn · B: lướt nhanh</p>';
    }
  } else if (g.id === 'dat-bom') {
    if (g.phase === 'bomber') {
      h += '<div class="baloo" style="font-size:25px">Đặt bom phá tường gỗ, thổi bay đối thủ! Né xa vụ nổ chữ thập</div>';
      h += '<div class="afield" id="afield">';
      if (g.hard) for (var hI2 = 0; hI2 < g.hard.length; hI2++) h += '<div class="bhard" style="left:' + (g.hard[hI2][0] * 6.25) + '%;top:' + (g.hard[hI2][1] * 11.1111) + '%;width:6.25%;height:11.1111%"></div>';
      if (g.soft) for (var sI4 = 0; sI4 < g.soft.length; sI4++) h += '<div class="bsoft" id="bsoft-' + g.soft[sI4][0] + ',' + g.soft[sI4][1] + '" style="left:' + (g.soft[sI4][0] * 6.25) + '%;top:' + (g.soft[sI4][1] * 11.1111) + '%;width:6.25%;height:11.1111%"></div>';
      for (var bI4 = 0; bI4 < v.players.length; bI4++) { var bp4 = v.players[bI4]; h += '<div class="ablob" id="ablob-' + bp4.seat + '" style="left:50%;top:50%;color:' + COLORS[bp4.color] + '">' + orbSVG(bp4.color, 56) + '<div class="aname">' + esc(bp4.name) + '</div><div class="alives" id="alives-' + bp4.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Tường xám không phá được · Tường gỗ phá được · Nổ dây chuyền khi lửa chạm bom khác · Trúng nổ mất 1 mạng (có 2 mạng)</p>';
    }
  } else if (g.id === 'ke-gia-mao') {
    h += '<div class="center baloo" style="font-size:31px">🕵️ AI LÀ KẺ GIẢ MẠO?</div>';
    h += '<div class="center"><span class="chip cool">Chủ đề: ' + esc(g.category || '') + '</span></div>';
    if (g.phase === 'answer') {
      h += '<div class="baloo" style="font-size:24px">Mỗi người đang trả lời MỘT câu hỏi bí mật trên điện thoại của mình… và một người nhận câu hỏi KHÁC!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var iI = 0; iI < v.players.length; iI++) { var ip = v.players[iI]; h += '<span class="scorechip">' + blobSVG(ip.color, ip.mood, 28) + ' ' + esc(ip.name) + ' ' + (g.answered && g.answered[ip.seat] ? 'đã trả lời ✓' : 'đang nghĩ…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'discuss') {
      h += '<div class="baloo" style="font-size:24px">Bàn luận đi! Ai đang nói dối về câu hỏi của mình?</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.chatLog) for (var cI6 = 0; cI6 < g.chatLog.length; cI6++) { var cp6 = playerOf(v, g.chatLog[cI6].seat); h += '<div class="chatrow">' + blobSVG(cp6 ? cp6.color : 'blue', 'cuoi', 26) + ' <b>' + esc(cp6 ? cp6.name : '') + ':</b> ' + esc(g.chatLog[cI6].text) + '</div>'; }
    } else if (g.phase === 'vote') {
      h += '<div class="baloo" style="font-size:26px">Tố cáo! Mọi người chọn kẻ giả mạo trên điện thoại…</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var vI2 = 0; vI2 < v.players.length; vI2++) { var vp3 = v.players[vI2]; h += '<span class="scorechip">' + blobSVG(vp3.color, vp3.mood, 28) + ' ' + esc(vp3.name) + ' ' + (g.voted && g.voted[vp3.seat] ? 'đã tố cáo ✓' : 'đang chọn…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      var rv = g.reveal; var imp = playerOf(v, rv.impostor);
      h += '<div class="center baloo" style="font-size:29px">' + (rv.caught ? '🎉 BẮT ĐƯỢC KẺ GIẢ MẠO!' : '😈 KẺ GIẢ MẠO ĐÃ THOÁT!') + '</div>';
      h += '<div class="center"><span class="blobbob">' + orbSVG(imp.color, 84, !rv.caught) + '</span><div class="baloo" style="font-size:24px">Kẻ giả mạo là: ' + esc(imp.name) + '!</div></div>';
      h += '<div class="impq"><div class="qcard"><b>Câu hỏi thật:</b><br>' + esc(rv.realQ) + '</div><div class="qcard"><b>Câu hỏi của kẻ giả mạo:</b><br>' + esc(rv.fakeQ) + '</div></div>';
      h += '<div class="rows">';
      for (var rI4 = 0; rI4 < v.players.length; rI4++) {
        var rp4 = v.players[rI4]; var vt = rv.votes ? rv.votes[rp4.seat] : null; var tp4 = vt ? playerOf(v, vt) : null;
        var ans = rv.answers ? rv.answers[rp4.seat] : null;
        h += '<div class="rrow">' + blobSVG(rp4.color, rp4.mood, 34) + ' ' + esc(rp4.name) + (rp4.seat === rv.impostor ? '<span class="chip hot">GIẢ MẠO</span>' : '') + '<span class="muted">' + (ans == null ? 'không trả lời' : 'đã chọn ' + LETTERS[ans]) + ' · tố cáo: ' + (tp4 ? esc(tp4.name) : '—') + '</span><span class="pts">' + (rv.points[rp4.seat] > 0 ? '+' : '') + fmt(rv.points[rp4.seat] || 0) + '</span></div>';
      }
      h += '</div>';
    }
  } else if (g.id === 'thu-thanh') {
    if (g.phase === 'defend') {
      h += '<div class="scorebar"><span class="scorechip">💎 Pha lê: <b id="crystalhp">' + (g.crystal ? g.crystal.hp : 10) + '</b>/10</span><span class="scorechip">🟢 Đã hạ: <b id="killn">' + (g.kills || 0) + '</b> slime</span></div>';
      h += '<div class="afield" id="afield"><div class="aring" style="width:95%;height:91.1%"></div>';
      h += '<div class="acrystal">💎<div class="chp" id="crystalhearts">' + (g.crystal ? '❤'.repeat(Math.max(0, g.crystal.hp)) : '') + '</div></div>';
      for (var dI4 = 0; dI4 < v.players.length; dI4++) { var dp4 = v.players[dI4]; var fc2 = g.facing ? g.facing[dp4.seat] : null; var deg2 = fc2 ? Math.round(Math.atan2(fc2.y, fc2.x) * 180 / Math.PI) : 0; h += '<div class="ablob" id="ablob-' + dp4.seat + '" style="left:50%;top:50%;color:' + COLORS[dp4.color] + '"><span class="orbwrap">' + orbSVG(dp4.color, 62) + '<span class="abarrel" id="barrel-' + dp4.seat + '" style="transform:rotate(' + deg2 + 'deg)"></span></span><div class="aname">' + esc(dp4.name) + '</div></div>'; }
      h += '</div>';
      h += '<p class="center">Đừng để slime chạm vào pha lê! Sống sót hết giờ: pha lê còn ≥7 tim = hạng VÀNG · ≥4 = BẠC · ≥1 = ĐỒNG</p>';
    }
  } else if (g.id === 'giai-ma-chung') {
    if (g.phase === 'decode' || g.phase === 'levelup') {
      h += '<div class="teambanner">MÀN ' + (g.level || 1) + ' · Tim đội: ' + '❤'.repeat(Math.max(0, g.hearts || 0)) + ' · Đã qua: ' + (g.levelsDone || 0) + ' màn</div>';
      if (g.phase === 'levelup') h += '<div class="center baloo" style="font-size:30px">QUA MÀN! 🎉 Chuẩn bị màn tiếp theo…</div>';
      h += '<div class="pips">';
      for (var pI5 = 0; pI5 < (g.total || 0); pI5++) h += '<div class="pip' + (pI5 < (g.done || 0) ? ' done' : pI5 === (g.done || 0) ? ' now' : '') + '"></div>';
      h += '</div>';
      h += '<div class="baloo center" style="font-size:22px">Mỗi người chỉ thấy phần mật mã CỦA MÌNH trên điện thoại — gọi nhau mà bấm cho đúng thứ tự!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'nguoi-que') {
    if (g.phase === 'fight') {
      h += '<div class="afield" id="afield">';
      (g.platforms || []).forEach(function (pf) { h += '<div class="fplat' + (pf.oneWay ? ' oneway' : '') + '" style="' + rectStyle(pf) + '"></div>'; });
      for (var fI = 0; fI < v.players.length; fI++) {
        var fp = v.players[fI]; var fb = g.blobs[fp.seat];
        h += '<div class="ablob" id="ablob-' + fp.seat + '" style="left:' + PX(fb.x) + '%;top:' + PY(fb.y) + '%;color:' + COLORS[fp.color] + '">'
          + '<div class="admg" id="dmg-' + fp.seat + '" style="color:' + dmgColor(fb.dmg || 0) + '">' + (fb.dmg || 0) + '%</div>'
          + '<span id="fig-' + fp.seat + '">' + stickSVG(fp.color, fightPose(fb), fb.face) + '</span>'
          + '<div class="alives" id="alives-' + fp.seat + '">' + '♥'.repeat(Math.max(0, fb.lives)) + '</div>'
          + '<div class="aname">' + esc(fp.name) + '</div></div>';
      }
      h += '</div>';
      h += '<p class="center">Đánh đối thủ tích % sát thương — % càng cao văng càng xa! Văng khỏi sàn là mất một mạng.</p>';
    }
  } else if (g.id === 'den-lua-nuoc') {
    if (g.phase === 'temple') {
      h += '<div class="scorebar"><span class="scorechip">🔥 Ngọc lửa: <b id="gemlua">' + (g.gemCount ? g.gemCount.lua : 0) + '</b>/5</span><span class="scorechip">💧 Ngọc nước: <b id="gemnuoc">' + (g.gemCount ? g.gemCount.nuoc : 0) + '</b>/5</span><span class="scorechip">Tim đội: <b id="temphearts">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</b></span></div>';
      h += '<div class="afield" id="afield">';
      (g.solids || []).forEach(function (s) { h += '<div class="tbrick" style="' + rectStyle(s) + '"></div>'; });
      (g.pools || []).forEach(function (pl) { h += '<div class="tpool ' + pl.kind + '" style="' + rectStyle(pl) + '"></div>'; });
      (g.buttons || []).forEach(function (bt) { h += '<div class="tbtn" style="' + rectStyle(bt) + '"></div>'; });
      if (g.doors) { h += '<div class="tdoor lua" style="' + rectStyle(g.doors.lua) + '"></div>'; h += '<div class="tdoor nuoc" style="' + rectStyle(g.doors.nuoc) + '"></div>'; }
      (g.gates || []).forEach(function (gt, gi) { h += '<div class="tgate' + (g.gateOpen ? ' open' : '') + '" id="gate-' + gi + '" style="' + rectStyle(gt) + '"></div>'; });
      (g.gems || []).forEach(function (gm) { h += '<div class="tgem ' + gm.el + (gm.taken ? ' taken' : '') + '" id="tgem-' + gm.id + '" style="left:' + PX(gm.x) + '%;top:' + PY(gm.y) + '%"><i></i></div>'; });
      for (var tI = 0; tI < v.players.length; tI++) {
        var tp = v.players[tI]; var tc = g.chars[tp.seat];
        if (!tc) continue;
        h += '<div class="achar' + (tc.home ? ' home' : '') + '" id="achar-' + tp.seat + '" style="left:' + PX(tc.x) + '%;top:' + PY(tc.y) + '%">' + charSVG(tc.el, tp.color) + '<div class="aname">' + esc(tp.name) + '</div></div>';
      }
      h += '</div>';
      h += '<p class="center">Hồ đỏ chỉ Lửa qua được, hồ xanh chỉ Nước, hồ xanh lá hại cả hai! Đứng lên nút vàng để mở cổng cho đồng đội, rồi về đúng cửa của mình.</p>';
    }
  } else if (g.id === 'ma-soi') {
    var deadRole = {};
    if (g.deadList) for (var dL = 0; dL < g.deadList.length; dL++) deadRole[g.deadList[dL].seat] = g.deadList[dL].role;
    var wbanner = { night: '🌙 ĐÊM ' + (g.night || 1) + ' — LÀNG ĐANG NGỦ…', dawn: '☀️ BÌNH MINH ĐÊM ' + (g.night || 1), discuss: '🗣️ BÀN LUẬN — AI LÀ SÓI?', vote: '🗳️ BỎ PHIẾU TREO CỔ', execute: '⚖️ KẾT QUẢ BỎ PHIẾU', wolfEnd: '🏁 TRỜI SÁNG HẲN — KẾT THÚC!' };
    h += '<div class="center baloo" style="font-size:27px">' + (wbanner[g.phase] || '') + '</div>';
    if (g.phase === 'night') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<p class="center">Sói đang săn mồi · Bảo Vệ đang canh giữ · Tiên Tri đang soi · Phù Thủy đang cân nhắc hai lọ thuốc — tất cả bí mật trên điện thoại của từng người!</p>';
    } else if (g.phase === 'dawn') {
      if (g.dawnDeaths && g.dawnDeaths.length) {
        h += '<div class="baloo center" style="font-size:24px">Đêm qua, làng đã mất:</div><div class="rows">';
        for (var dI = 0; dI < g.dawnDeaths.length; dI++) { var dd = g.dawnDeaths[dI]; var dp5 = playerOf(v, dd.seat); if (dp5) h += '<div class="rrow">' + blobSVG(dp5.color, 'buon', 34) + ' ' + esc(dp5.name) + '<span class="chip hot">' + (WOLF_ROLE_NAMES[dd.role] || '') + '</span><span class="muted">' + (dd.role === 'soi' ? 'Một con sói đã gục ngã!' : 'Một người vô tội ra đi…') + '</span></div>'; }
        h += '</div>';
      } else {
        h += '<div class="baloo center" style="font-size:25px">🌿 Một đêm yên bình — không ai phải ra đi!</div>';
      }
    } else if (g.phase === 'discuss') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.chatLog) for (var cI7 = 0; cI7 < g.chatLog.length; cI7++) { var cp7 = playerOf(v, g.chatLog[cI7].seat); h += '<div class="chatrow">' + blobSVG(cp7 ? cp7.color : 'blue', 'cuoi', 26) + ' <b>' + esc(cp7 ? cp7.name : '') + ':</b> ' + esc(g.chatLog[cI7].text) + '</div>'; }
    } else if (g.phase === 'vote') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var vI4 = 0; vI4 < v.players.length; vI4++) { var vp5 = v.players[vI4]; var isDead = g.aliveMap && !g.aliveMap[vp5.seat]; h += '<span class="scorechip">' + blobSVG(vp5.color, vp5.mood, 28) + ' ' + esc(vp5.name) + ' ' + (isDead ? '💀' : (g.voted && g.voted[vp5.seat] ? 'đã bỏ phiếu ✓' : 'đang nghĩ…')) + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'execute' || g.phase === 'wolfEnd') {
      if (g.exec) {
        if (g.exec.seat) { var ep2 = playerOf(v, g.exec.seat); h += '<div class="center baloo" style="font-size:26px">Làng đã treo cổ ' + esc(ep2 ? ep2.name : '') + ' — đó là ' + (WOLF_ROLE_NAMES[g.exec.role] || '') + '!</div>'; }
        else h += '<div class="center baloo" style="font-size:25px">Phiếu hoà hoặc chưa đủ — hôm nay không ai bị treo cổ.</div>';
      }
      if (g.voteTally) {
        h += '<div class="rows">';
        for (var tSeat in g.voteTally) { var tp5 = playerOf(v, +tSeat); if (tp5) h += '<div class="rrow">' + blobSVG(tp5.color, tp5.mood, 30) + ' ' + esc(tp5.name) + '<span class="pts">' + g.voteTally[tSeat] + ' phiếu</span></div>'; }
        h += '</div>';
      }
    }
    if (g.phase === 'wolfEnd') {
      h += '<div class="center baloo" style="font-size:30px">' + (g.winner === 'soi' ? '🐺 BẦY SÓI THẮNG! Làng đã bị sói ăn mòn…' : '🎉 DÂN LÀNG THẮNG! Sói đã bị quét sạch!') + '</div>';
      h += '<div class="rows">';
      for (var wI = 0; wI < v.players.length; wI++) { var wp = v.players[wI]; var wr = g.roles ? g.roles[wp.seat] : null; h += '<div class="rrow">' + blobSVG(wp.color, wp.mood, 34) + ' ' + esc(wp.name) + (wr ? '<span class="chip ' + (wr === 'soi' ? 'hot' : 'cool') + '">' + WOLF_ROLE_NAMES[wr] + '</span>' : '') + '<span class="pts">+' + fmt(g.points[wp.seat] || 0) + '</span></div>'; }
      h += '</div>';
    } else {
      h += '<div class="wolfgrid">';
      for (var gI2 = 0; gI2 < v.players.length; gI2++) {
        var gp3 = v.players[gI2]; var alive3 = !g.aliveMap || g.aliveMap[gp3.seat];
        h += '<div class="wolfcard' + (alive3 ? '' : ' dead') + '">' + blobSVG(gp3.color, alive3 ? gp3.mood : 'buon', 54) + '<div>' + esc(gp3.name) + '</div>'
          + (alive3 ? '<div class="small muted">😴 đang yên giấc / còn sống</div>' : '<div class="rolechip">💀 ' + (WOLF_ROLE_NAMES[deadRole[gp3.seat]] || '') + '</div>') + '</div>';
      }
      h += '</div>';
    }
  } else if (g.id === 'ca-ngua') {
    var turnP = g.turn ? playerOf(v, g.turn) : null;
    if (g.phase === 'ngWin' && g.winner) {
      var winP = playerOf(v, g.winner);
      h += '<div class="center baloo" style="font-size:29px">🏆 ' + esc(winP ? winP.name : '') + ' ĐƯA CẢ 4 NGỰA VỀ CHUỒNG — THẮNG!</div>';
    } else {
      h += '<div class="center baloo" style="font-size:24px">Lượt của: ' + (turnP ? esc(turnP.name) : '') + (g.dice ? ' · <span class="diceface">' + DICE_FACES[g.dice] + '</span> ' + g.dice + ' chấm' : ' · đang chờ thảy xúc xắc…') + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
    // Wide layout: the square board keeps the full stage height in the
    // middle; the freed side columns carry the turn order + per-player
    // progress (left) and the event log (right), so the whole row
    // spans the TV instead of leaving two dead bands.
    h += '<div class="ngrow"><div class="ngside"><h3>Thứ tự lượt & tiến độ</h3>';
    var turnIdx = 0;
    for (var tIx = 0; tIx < v.players.length; tIx++) if (v.players[tIx].seat === g.turn) turnIdx = tIx;
    for (var nI2 = 0; nI2 < v.players.length; nI2++) {
      var np3 = v.players[(turnIdx + nI2) % v.players.length];
      var hs = g.horses ? (g.horses[np3.seat] || []) : [];
      var home3 = 0, sum3 = 0;
      for (var hI3 = 0; hI3 < hs.length; hI3++) { if (hs[hI3] === 58) home3++; sum3 += hs[hI3]; }
      var isTurn = np3.seat === g.turn && g.phase !== 'ngWin';
      h += '<div class="rrow"' + (isTurn ? ' style="outline:3px solid #FFC93D"' : '') + '>' + blobSVG(np3.color, np3.mood, 28) + '<span>' + esc(np3.name) + (isTurn ? ' <b>◀ đang đi</b>' : '') + '<br><span class="muted">🐴 về đích ' + home3 + '/4 · tiến độ ' + (g.progress ? (g.progress[np3.seat] || 0) : 0) + '</span><span class="progbar"><i style="width:' + Math.round(sum3 / 232 * 100) + '%;background:' + COLORS[np3.color] + '"></i></span></span></div>';
    }
    h += '</div><div class="ngmid">';
    h += nguaBoardHTML(v, g);
    h += '</div><div class="ngside"><h3>Diễn biến</h3>';
    if (g.log && g.log.length) for (var lI = 0; lI < g.log.length; lI++) h += '<div class="chatrow">🎲 ' + esc(g.log[lI]) + '</div>';
    else h += '<p class="muted">Chưa có diễn biến nào…</p>';
    h += '</div></div>';
    h += '<p class="center">Ô vàng là ô an toàn — ngựa đứng đó không bị đá. Thảy 6 được đi tiếp; 6 ba lần liên tiếp thì mất lượt!</p>';
  } else if (g.id === 'tien-len') {
    if (g.phase === 'tlWin' && g.winner) {
      var winT = playerOf(v, g.winner);
      h += '<div class="center baloo" style="font-size:30px">🏆 ' + esc(winT ? winT.name : '') + ' THẮNG TIẾN LÊN!</div>';
      if (g.instantWin) h += '<div class="center baloo" style="font-size:24px;color:#FFC93D">⚡ TỚI TRẮNG — ' + (TL_IW_NAMES[g.instantWin.kind] || '') + '!</div>';
      h += '<div class="rows">';
      for (var fI = 0; fI < (g.finished || []).length; fI++) { var fp9 = playerOf(v, g.finished[fI]); h += '<div class="rrow">' + blobSVG(fp9.color, fp9.mood, 32) + ' ' + esc(fp9.name) + '<span class="chip cool">Hạng ' + (fI + 1) + '</span><span class="pts">+' + fmt(g.points[fp9.seat] || 0) + '</span></div>'; }
      h += '</div>';
    } else if (g.phase === 'cards') {
      var turnT = g.turn ? playerOf(v, g.turn) : null;
      h += '<div class="center baloo" style="font-size:24px">Lượt của: ' + (turnT ? esc(turnT.name) : '') + (g.table ? ' · cần chặn bài trên bàn' : ' · đang cầm cái') + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="tltable">';
      if (g.table) {
        var tabP = playerOf(v, g.table.seat);
        h += '<div class="center baloo" style="font-size:19px">' + esc(tabP ? tabP.name : '') + ' vừa đánh · ' + (TL_KIND_NAMES[g.table.kind] || '') + '</div>';
        h += '<div class="tlchips">' + tlChipsHTML(g.table.cards, false) + '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">🃏 Bàn trống — ' + (turnT ? esc(turnT.name) : '') + ' cầm cái, đánh bộ bất kỳ!</div>';
      }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var pI9 = 0; pI9 < v.players.length; pI9++) {
        var pp9 = v.players[pI9];
        var fin9 = (g.finished || []).indexOf(pp9.seat);
        h += '<span class="scorechip"' + (g.turn === pp9.seat ? ' style="outline:3px solid #FFC93D"' : '') + '>' + blobSVG(pp9.color, pp9.mood, 28) + ' ' + esc(pp9.name)
          + ' · 🂠 × ' + (g.counts ? (g.counts[pp9.seat] || 0) : 0)
          + (g.leader === pp9.seat ? ' · <b>Cái</b>' : '')
          + (g.passed && g.passed[pp9.seat] ? ' · ✋ Bỏ' : '')
          + (fin9 >= 0 ? ' · 🏆 ' + (fin9 + 1) : '') + '</span>';
      }
      h += '</div>';
      if (g.log && g.log.length) { h += '<div style="margin-top:8px">'; for (var lI9 = 0; lI9 < g.log.length; lI9++) h += '<div class="chatrow">🃏 ' + esc(g.log[lI9]) + '</div>'; h += '</div>'; }
      h += '<p class="center">Chặt heo: tứ quý & đôi thông chặt được lá 2; đôi heo chỉ bị chặt bởi tứ quý và 4 đôi thông. Hết bài trước là thắng!</p>';
    }
  } else if (g.id === 'da-bong') {
    var sb = g.scoreboard || { do: 0, xanh: 0 };
    h += '<div class="scorebar"><span class="scorechip" style="background:#FBD5D5">🔴 Đội Đỏ: <b id="scoredo">' + sb.do + '</b></span><span class="scorechip" style="background:#CFE8FB">🔵 Đội Xanh: <b id="scorexanh">' + sb.xanh + '</b></span></div>';
    h += '<div class="afield wide" id="afield">';
    (g.solids || []).forEach(function (s) { h += '<div class="spitch' + (s.w > 20 ? '' : ' wall') + '" style="' + rectStyleS(s) + '"></div>'; });
    h += '<div class="sgoalbox" style="' + rectStyleS({ x: -19, y: 5.4, w: 3, h: 2.6 }) + '"></div>';
    h += '<div class="sgoalbox" style="' + rectStyleS({ x: 16, y: 5.4, w: 3, h: 2.6 }) + '"></div>';
    for (var sI = 0; sI < v.players.length; sI++) {
      var sp2 = v.players[sI]; var sb2 = g.blobs[sp2.seat];
      if (!sb2) continue;
      h += '<div class="ablob" id="ablob-' + sp2.seat + '" style="left:' + ((sb2.x + 19) / 38 * 100) + '%;top:' + ((sb2.y + 9.6) / 19.2 * 100) + '%">' + bigHeadSVG(sp2.color, sb2.team) + '<div class="aname">' + esc(sp2.name) + '</div></div>';
    }
    if (g.ball) h += '<div class="sball" id="sball" style="left:' + ((g.ball.x + 19) / 38 * 100) + '%;top:' + ((g.ball.y + 9.6) / 19.2 * 100) + '%"></div>';
    if (g.phase === 'goal' && g.goalInfo) {
      var gp8 = g.goalInfo.by ? playerOf(v, g.goalInfo.by) : null;
      h += '<div class="goalbanner">GÔÔÔL! ' + (g.goalInfo.team === 'do' ? '🔴' : '🔵') + '</div>';
      h += '<div class="center baloo" style="font-size:21px;position:relative;z-index:6">' + (gp8 ? esc(gp8.name) + (g.goalInfo.ownGoal ? ' đá phản lưới nhà! 😱' : ' ghi bàn!') : 'Vào rồi!') + '</div>';
    }
    h += '</div>';
    h += '<p class="center">Đội Đỏ (ghế lẻ) tấn công sang phải, Đội Xanh (ghế chẵn) sang trái. A = SÚT (giữ ▲ = bổng, ▼ = sệt) · B = lướt · ▲/Y = nhảy đánh đầu!</p>';
  } else if (g.id === 'ech-op') {
    h += '<div class="scorebar"><span class="scorechip">Màn <b id="frogcham">' + (g.chamber || 1) + '</b>/' + (g.chambersTotal || 3) + '</span><span class="scorechip">Tim đội: <b id="froghearts">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</b></span><span class="scorechip">🪰 Ruồi: <b id="frogflies">' + (g.fliesEaten || 0) + '</b>/' + (g.fliesTotal || 9) + '</span></div>';
    if (g.phase === 'frogClear') h += '<div class="center baloo" style="font-size:29px">🎉 QUA MÀN ' + (g.chamber || 1) + '! Chuẩn bị màn tiếp theo…</div>';
    h += '<div class="afield" id="afield">';
    (g.solids || []).forEach(function (s) { h += '<div class="tbrick" style="' + rectStyle(s) + '"></div>'; });
    (g.spikes || []).forEach(function (sp3) { h += '<div class="fspike" style="' + rectStyle(sp3) + '"></div>'; });
    if (g.door) h += '<div class="fdoor" style="' + rectStyle(g.door) + '"></div>';
    (g.flies || []).forEach(function (fl) { h += '<div class="ffly' + (fl.taken ? ' taken' : '') + '" id="ffly-' + fl.id + '" style="left:' + PX(fl.x) + '%;top:' + PY(fl.y) + '%"></div>'; });
    (g.crates || []).forEach(function (cr) { h += '<div class="fcrate" id="fcrate-' + cr.id + '" style="left:' + PX(cr.x) + '%;top:' + PY(cr.y) + '%"></div>'; });
    for (var fI2 = 0; fI2 < v.players.length; fI2++) {
      var fp3 = v.players[fI2]; var ff = g.frogs[fp3.seat];
      if (!ff) continue;
      var bellyP = ff.bellySeat ? playerOf(v, ff.bellySeat) : null;
      h += '<div class="afrog' + (ff.state === 'carry' ? ' carry' : '') + '" id="afrog-' + fp3.seat + '" data-st="' + ff.state + ':' + (ff.bellySeat || '') + '" style="left:' + PX(ff.x) + '%;top:' + PY(ff.y) + '%' + (ff.state === 'in' ? ';display:none' : '') + '">' + frogSVG(fp3.color, bellyP ? bellyP.color : null) + '<div class="aname">' + esc(fp3.name) + '</div></div>';
    }
    h += '</div>';
    h += '<p class="center">Đứng cạnh đồng đội rồi bấm B/X để NUỐT bạn vào bụng — ếch đang vác nhảy xa và cao hơn hẳn! Sang bờ an toàn thì bấm B/X lần nữa để nhả ra. Cả đội cùng đứng vào cửa xanh là qua màn.</p>';
  } else if (g.id === 'can-goc') {
    var turnP3 = g.turn ? playerOf(v, g.turn) : null;
    var windTxt = !g.wind ? 'không gió' : (g.wind > 0 ? '→ ' + g.wind : '← ' + (-g.wind));
    h += '<div class="scorebar"><span class="scorechip">Lượt: <b>' + (turnP3 ? esc(turnP3.name) : '—') + '</b></span><span class="scorechip">🌬️ Gió: <b>' + windTxt + '</b></span>';
    if (g.phase === 'aim' && turnP3 && g.cannons && g.cannons[g.turn]) h += '<span class="scorechip" id="aiminfo">Góc ' + g.cannons[g.turn].angle + '° · Lực ' + g.cannons[g.turn].power + '</span>';
    h += '</div>';
    if (g.phase === 'aim') h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    h += '<div class="afield art" id="afield"><div class="artwrap"><svg viewBox="0 0 320 180" preserveAspectRatio="none">';
    var pts = '0,180 ';
    for (var cI = 0; cI < (g.heights || []).length; cI++) { var hy = Math.round(((g.heights[cI] + 9) * 10) * 10) / 10; pts += (cI * 2) + ',' + hy + ' ' + ((cI + 1) * 2) + ',' + hy + ' '; }
    pts += '320,180';
    h += '<polygon points="' + pts + '" fill="#3E6B35" stroke="#7AC74F" stroke-width="1.6"/>';
    if (g.shell && g.shell.trail && g.shell.trail.length > 1) {
      var tp9 = '';
      for (var tI9 = 0; tI9 < g.shell.trail.length; tI9++) tp9 += Math.round((g.shell.trail[tI9].x + 16) * 10) + ',' + Math.round((g.shell.trail[tI9].y + 9) * 10) + ' ';
      h += '<polyline points="' + tp9 + '" fill="none" stroke="rgba(255,240,190,.75)" stroke-width="1.6" stroke-dasharray="3 3"/>';
    }
    for (var nI = 0; nI < v.players.length; nI++) {
      var np9 = v.players[nI]; var cn = g.cannons ? g.cannons[np9.seat] : null;
      if (!cn) continue;
      var cx9 = Math.round((cn.x + 16) * 10), cy9 = Math.round((cn.y + 9) * 10);
      var colr = COLORS[np9.color] || '#fff';
      if (!cn.alive) {
        h += '<g opacity=".55"><circle cx="' + cx9 + '" cy="' + (cy9 - 4) + '" r="6" fill="#5A6472"/><path d="M' + (cx9 - 4) + ' ' + (cy9 - 8) + ' l8 8 M' + (cx9 + 4) + ' ' + (cy9 - 8) + ' l-8 8" stroke="#FF8A7A" stroke-width="2"/></g>';
        continue;
      }
      var rad9 = cn.angle * Math.PI / 180;
      var bx9 = Math.round(cx9 + cn.face * Math.cos(rad9) * 15), by9 = Math.round((cy9 - 4) - Math.sin(rad9) * 15);
      if (g.turn === np9.seat && g.phase !== 'boom') h += '<circle cx="' + cx9 + '" cy="' + (cy9 - 4) + '" r="12" fill="none" stroke="#FFE066" stroke-width="2" stroke-dasharray="4 3"/>';
      h += '<line id="barrel-' + np9.seat + '" x1="' + cx9 + '" y1="' + (cy9 - 4) + '" x2="' + bx9 + '" y2="' + by9 + '" stroke="#2B3442" stroke-width="4.4" stroke-linecap="round"/>';
      h += '<circle cx="' + cx9 + '" cy="' + (cy9 - 4) + '" r="7" fill="' + colr + '" stroke="rgba(0,0,0,.4)" stroke-width="1.6"/>';
      h += '<rect x="' + (cx9 - 10) + '" y="' + (cy9 - 20) + '" width="20" height="3.6" fill="rgba(0,0,0,.45)"/><rect x="' + (cx9 - 10) + '" y="' + (cy9 - 20) + '" width="' + Math.round(20 * Math.max(0, cn.hp) / 100) + '" height="3.6" fill="' + (cn.hp > 40 ? '#58C472' : '#FF5A3C') + '"/>';
      h += '<text x="' + cx9 + '" y="' + (cy9 + 13) + '" font-size="8.5" font-weight="700" fill="#fff" text-anchor="middle" style="text-shadow:0 1px 2px #000">' + esc(np9.name) + '</text>';
    }
    h += '</svg></div>';
    if (g.shell) h += '<div class="ashell" id="shellpt" style="left:' + PX(g.shell.x) + '%;top:' + PY(g.shell.y) + '%"></div>';
    if (g.boom) h += '<div class="boomflash" style="left:' + PX(g.boom.x) + '%;top:' + PY(g.boom.y) + '%"></div>';
    h += '</div>';
    h += '<p class="center">Căn góc như Gunny: ▲▼ chỉnh góc · ◀▶ chỉnh lực · X đổi hướng · A bắn. Không có đường đạn mẫu đâu — gió còn đổi mỗi lượt nữa!</p>';
  }
  return h;
}
// Cờ Cá Ngựa board: geometry arrives in the view (g.board), so the
// renderer is a pure lookup — loop cells, home stretches, stables and
// one token per horse; horses sharing a cell fan out into corners.
function nguaBoardHTML(v, g) {
  var B = g.board; if (!B) return '';
  var CELL = 100 / 15;
  // token coordinates per horse
  var toks = [];
  for (var si = 0; si < v.players.length; si++) {
    var pl2 = v.players[si]; var bi = g.boards[pl2.seat]; var hs2 = g.horses[pl2.seat] || [];
    for (var hi = 0; hi < hs2.length; hi++) {
      var p2 = hs2[hi]; var xy = null;
      if (p2 === 0) xy = B.stable[bi][hi];
      else if (p2 <= 51) xy = B.loop[(bi * 13 + p2 - 1) % 52];
      else if (p2 <= 57) xy = B.stretch[bi][p2 - 52];
      else xy = [6 + (bi % 2) * 2, 6 + Math.floor(bi / 2) * 2];
      toks.push({ seat: pl2.seat, hi: hi, x: xy[0], y: xy[1], p: p2 });
    }
  }
  var groups = {};
  toks.forEach(function (tk) { var k = tk.x + ',' + tk.y; (groups[k] = groups[k] || []).push(tk); });
  var h = '<div class="ngboard">';
  var quadXY = [[0, 0], [9, 0], [9, 9], [0, 9]];
  for (var qi = 0; qi < v.players.length; qi++) {
    var qp = v.players[qi]; var qb = g.boards[qp.seat];
    h += '<div class="ngcell quad" style="left:' + (quadXY[qb][0] * CELL) + '%;top:' + (quadXY[qb][1] * CELL) + '%;width:' + (6 * CELL) + '%;height:' + (6 * CELL) + '%;background:' + LIGHT[qp.color] + '"></div>';
  }
  for (var ci = 0; ci < B.loop.length; ci++) {
    var c2 = B.loop[ci];
    var fill = '';
    if (B.safe.indexOf(ci) >= 0) fill = '';
    var startBoard = ci % 13 === 0 ? ci / 13 : -1;
    var st = 'left:' + (c2[0] * CELL) + '%;top:' + (c2[1] * CELL) + '%;width:' + CELL + '%;height:' + CELL + '%';
    if (startBoard >= 0) {
      var sp2 = null;
      for (var sj = 0; sj < v.players.length; sj++) if (g.boards[v.players[sj].seat] === startBoard) sp2 = v.players[sj];
      if (sp2) st += ';background:' + LIGHT[sp2.color];
    }
    h += '<div class="ngcell' + (B.safe.indexOf(ci) >= 0 ? ' safe' : '') + '" style="' + st + '"></div>';
  }
  for (var bi2 = 0; bi2 < B.stretch.length; bi2++) {
    var owner = null;
    for (var oj = 0; oj < v.players.length; oj++) if (g.boards[v.players[oj].seat] === bi2) owner = v.players[oj];
    if (!owner) continue;
    for (var sti = 0; sti < B.stretch[bi2].length; sti++) { var sc = B.stretch[bi2][sti]; h += '<div class="ngcell" style="left:' + (sc[0] * CELL) + '%;top:' + (sc[1] * CELL) + '%;width:' + CELL + '%;height:' + CELL + '%;background:' + LIGHT[owner.color] + '"></div>'; }
    for (var sbi = 0; sbi < B.stable[bi2].length; sbi++) { var sb = B.stable[bi2][sbi]; h += '<div class="ngstable" style="left:' + ((sb[0] + 0.15) * CELL) + '%;top:' + ((sb[1] + 0.15) * CELL) + '%;width:' + (0.7 * CELL) + '%;height:' + (0.7 * CELL) + '%;border-color:' + COLORS[owner.color] + '"></div>'; }
  }
  toks.forEach(function (tk) {
    var owner2 = playerOf(v, tk.seat);
    var grp = groups[tk.x + ',' + tk.y];
    var idx = grp.indexOf(tk);
    var many = grp.length > 1;
    var size = many ? 0.52 : 0.8;
    var ox = many ? (idx % 2) * 0.48 : 0.1;
    var oy = many ? Math.floor(idx / 2) * 0.48 : 0.1;
    h += '<div class="nghorse' + (g.turn === tk.seat && g.phase !== 'ngWin' ? ' turn' : '') + '" style="left:' + ((tk.x + ox) * CELL) + '%;top:' + ((tk.y + oy) * CELL) + '%;width:' + (size * CELL) + '%;height:' + (size * CELL) + '%;background:' + COLORS[owner2.color] + ';font-size:' + (many ? 11 : 14) + 'px">' + (tk.hi + 1) + '</div>';
  });
  return h + '</div>';
}
function resultsHTML(v, isHost) {
  var lg = v.lastGame;
  var h = '<div class="card center"><h2 style="margin:0">Kết quả game: ' + esc(lg.name) + '</h2></div>';
  if (lg.teamResult) {
    h += '<div class="teambanner">🏆 Cả đội đạt hạng ' + esc(lg.teamResult.tierLabel) + ' — mỗi người +' + fmt(lg.teamResult.pointsEach) + ' điểm!<br><span style="font-size:17px">Thành tích đội: ' + fmt(lg.teamResult.score) + ' ' + esc(lg.teamResult.unit) + '</span></div>';
  }
  h += scoreStrip(v);
  var seats = Object.keys(lg.points).map(function (k) { return +k; }).sort(function (a, b) { return (lg.points[b] - lg.points[a]) || (a - b); });
  h += '<div class="card rows" style="margin-top:10px">';
  for (var i = 0; i < seats.length; i++) { var p = playerOf(v, seats[i]); h += '<div class="rrow">' + blobSVG(p.color, p.mood, 38) + ' ' + esc(p.name) + '<span class="pts">' + fmt(lg.points[seats[i]]) + ' điểm game này</span></div>'; }
  h += '</div>';
  var plv = v.playlist;
  if (plv && plv.active && plv.nextName && plv.nextInSec != null) {
    h += '<div class="card center" style="margin-top:10px"><div class="baloo" style="font-size:22px">🔁 Game tiếp theo: ' + esc(plv.nextName) + '</div>';
    h += '<p style="margin:4px 0">Tự bắt đầu sau <b>' + plv.nextInSec + '</b> giây · Game ' + plv.pos + '/' + plv.total + ' trong liên hoàn</p>';
    if (isHost) h += '<p style="margin:6px 0 0"><button class="btn pink" data-cmd="plStop">⏸ Dừng liên hoàn</button></p><p class="small muted" style="margin:6px 0 0">Bấm Chơi lại hoặc Chọn game khác cũng sẽ huỷ chế độ liên hoàn.</p>';
    h += '</div>';
  }
  if (isHost) h += '<p class="center" style="margin-top:16px"><button class="btn green" data-cmd="replay">Chơi lại ngay</button> <button class="btn blue" data-cmd="toChoosing">Chọn game khác</button> <button class="btn purple" data-cmd="continue">Bục vinh quang</button></p>';
  else if (!(plv && plv.active && plv.nextName)) h += '<p class="center muted">Ván này xong rồi! Chủ phòng sẽ chọn game tiếp theo, cứ ở yên trong phòng nhé.</p>';
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
    h += '<div class="pod">' + (rank === 1 ? '<span class="crownglow">' + crownSVG(64) + '</span><br>' : '') + '<span class="blobbob">' + blobSVG(p.color, 'reo', 86) + '</span><div class="baloo" style="font-size:19px">' + esc(p.name) + '</div><div class="col" style="height:' + heights[order[i]] + 'px;background:' + COLORS[p.color] + '">' + rank + '</div><div class="muted">' + fmt(p.score) + ' điểm</div></div>';
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
  var h = '<div class="card center"><div class="crownglow">' + crownSVG(90) + '</div><span class="blobbob">' + blobSVG(champ.color, 'reo', 130) + '</span>';
  h += '<h2 style="margin:6px 0">NHÀ VÔ ĐỊCH: ' + esc(champ.name) + '</h2><div class="baloo" style="font-size:24px">' + fmt(champ.score) + ' điểm</div>';
  h += '<div class="rows" style="text-align:left">';
  for (var i = 0; i < v.standings.length; i++) { var p = playerOf(v, v.standings[i]); h += '<div class="rrow"><b>' + (i + 1) + '</b>' + blobSVG(p.color, p.mood, 32) + ' ' + esc(p.name) + '<span class="pts">' + fmt(p.score) + '</span></div>'; }
  h += '</div>';
  if (isHost) h += '<p style="margin-top:14px"><button class="btn green" data-cmd="playAgain">Chơi lại từ đầu</button></p>';
  return h + '</div>';
}
function viewSig(v) {
  if (!v) return 'none';
  var pl = S.role === 'player';
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
      gp = [g.id, g.phase, ak2, g.lastRound];
    } else if (g.id === 'keo-co') {
      gp = pl ? [g.id, g.phase, Math.round((g.knot || 0) / 9), g.lastRound] : [g.id, g.phase, g.lastRound];
    } else if (g.id === 'chia-cuop') {
      gp = [g.id, g.phase, g.round, g.points, g.chosen, g.chat, g.reveal, g.mineChosen, g.lastRound];
    } else if (g.id === 'cuop-sao') {
      gp = pl ? [g.id, g.phase, g.banked ? g.banked[S.seat] : 0, g.lastRound] : [g.id, g.phase, g.lastRound];
    } else if (g.id === 'giu-vuong-mien') {
      gp = [g.id, g.phase, g.crown ? g.crown.holder : '-', g.lastRound];
    } else if (g.id === 'son-san') {
      gp = [g.id, g.phase, g.lastRound];
    } else if (g.id === 'chung-mot-than') {
      gp = [g.id, g.phase, g.hearts, g.checks, g.owners, g.lastRound];
    } else if (g.id === 'day-hop') {
      gp = [g.id, g.phase, g.deliveries, g.layout, g.lastRound];
    } else if (g.id === 'cheo-thuyen') {
      gp = [g.id, g.phase, g.lastRound];
    } else if (g.id === 'xe-tank') {
      var tk = '';
      if (g.blobs) for (var ts in g.blobs) tk += ts + (g.blobs[ts].alive ? '1' : '0') + g.blobs[ts].lives;
      gp = [g.id, g.phase, tk, g.lastRound];
    } else if (g.id === 'dat-bom') {
      var bk = '';
      if (g.blobs) for (var bs3 in g.blobs) bk += bs3 + (g.blobs[bs3].alive ? '1' : '0') + g.blobs[bs3].lives;
      gp = [g.id, g.phase, bk, g.lastRound];
    } else if (g.id === 'thu-thanh') {
      gp = [g.id, g.phase, g.crystal ? g.crystal.hp : 0, g.kills, g.lastRound];
    } else if (g.id === 'ke-gia-mao') {
      gp = [g.id, g.phase, g.round, g.points, g.answered, g.voted, g.chatLog, g.reveal, g.mine, g.myVote, g.lastRound];
    } else if (g.id === 'giai-ma-chung') {
      gp = pl ? [g.id, g.phase, g.level, g.hearts, g.done, g.mySteps, g.levelsDone, g.lastRound]
        : [g.id, g.phase, g.level, g.hearts, g.done, g.total, g.levelsDone, g.lastRound];
    } else if (g.id === 'nguoi-que') {
      var fk = '';
      if (g.blobs) for (var fs in g.blobs) fk += fs + (g.blobs[fs].alive ? '1' : '0') + g.blobs[fs].lives;
      gp = pl ? [g.id, g.phase, fk, g.myDmg, g.lastRound] : [g.id, g.phase, fk, g.lastRound];
    } else if (g.id === 'den-lua-nuoc') {
      gp = pl ? [g.id, g.phase, g.hearts, g.gemCount, g.myEl, g.myHome, g.lastRound]
        : [g.id, g.phase, g.hearts, g.gemCount, g.gateOpen, g.lastRound];
    } else if (g.id === 'ma-soi') {
      gp = pl ? [g.id, g.phase, g.night, g.aliveMap, g.deadList, g.myRole, g.myAlive, g.myWolfVote, g.wolfVotesIn, g.myGuardPick, g.mySeerPick, g.mySeerNotes, g.myVictim, g.myWitchSave, g.myWitchPoison, g.myWitchDone, g.voted, g.chatLog, g.exec, g.winner, g.points, g.lastRound]
        : [g.id, g.phase, g.night, g.aliveMap, g.deadList, g.dawnDeaths, g.voted, g.chatLog, g.exec, g.voteTally, g.winner, g.roles, g.points, g.lastRound];
    } else if (g.id === 'ca-ngua') {
      gp = pl ? [g.id, g.phase, g.turn, g.dice, g.horses, g.last, g.winner, g.myLegal, g.myTurn]
        : [g.id, g.phase, g.turn, g.dice, g.horses, g.last, g.winner, g.log];
    } else if (g.id === 'tien-len') {
      gp = pl ? [g.id, g.phase, g.counts, g.table, g.turn, g.leader, g.passed, g.finished, g.log, g.myHand, g.myTurn, g.myPassed, g.myRank, g.lastRound]
        : [g.id, g.phase, g.counts, g.table, g.turn, g.leader, g.passed, g.finished, g.log, g.winner, g.instantWin, g.lastRound];
    } else if (g.id === 'da-bong') {
      gp = pl ? [g.id, g.phase, g.scoreboard, g.myTeam, g.lastRound]
        : [g.id, g.phase, g.scoreboard, g.goalInfo, g.lastRound];
    } else if (g.id === 'ech-op') {
      gp = pl ? [g.id, g.phase, g.chamber, g.hearts, g.fliesEaten, g.myState, g.myPassengerSeat, g.myCarrierSeat, g.myDoor, g.lastRound]
        : [g.id, g.phase, g.chamber, g.hearts, g.fliesEaten, g.lastRound];
    } else if (g.id === 'can-goc') {
      var ck = '';
      if (g.cannons) for (var cs in g.cannons) { var cc9 = g.cannons[cs]; ck += cs + ':' + cc9.hp + (cc9.alive ? 1 : 0) + ':' + cc9.face + ';'; }
      // angle/power are NOT in the signature: they change on every
      // tick while aiming, and each signature change rebuilds the
      // whole SVG stage (160-segment terrain) — the aim collapse
      // found by the weak-profile sweep. patchPositions updates
      // the barrel lines and the aim chip directly instead.
      gp = pl ? [g.id, g.phase, g.turn, g.wind, g.myTurn, g.myCannon, ck, g.boom, g.lastRound]
        : [g.id, g.phase, g.turn, g.wind, ck, g.shell ? 's' : '', g.boom, g.lastRound];
    } else {
      if (pl) {
      // PLAYER signature for the tap/answer games: keep only what the
      // phone actually renders and what changes on real game events.
      // Dropped vs the host signature: g.answered / g.statuses, which
      // track the OTHER players and are never drawn on the phone.
      // Rebuilding the controls mid-press is what ate real finger
      // presses; the host signature is unchanged.
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, g.mine, g.myStreak];
    } else {
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, g.answered, g.statuses, g.mine];
    }
    }
  }
  var pls = v.playlist ? [v.playlist.active ? 1 : 0, v.playlist.pos || 0, v.playlist.total || 0, v.playlist.nextName || '', v.playlist.nextInSec] : 0;
  return JSON.stringify([v.phase, v.players, v.bubble, v.standings, v.gap, gp, v.lastGame, pls]);
}
var FIELD_GAMES = { 'day-ra': 1, 'ne-dan': 1, 'cuop-sao': 1, 'giu-vuong-mien': 1, 'son-san': 1, 'xe-tank': 1, 'dat-bom': 1, 'thu-thanh': 1, 'chung-mot-than': 1, 'day-hop': 1, 'nguoi-que': 1, 'den-lua-nuoc': 1, 'ech-op': 1, 'da-bong': 1, 'can-goc': 1 };
// The phone's control cluster for the current screen, as a key: the
// cluster's CONTENT is a pure function of this key, so while the key is
// unchanged a state push may rebuild everything AROUND the controls
// but must never rebuild the controls themselves — a rebuilt DiscPad
// or button detaches the very node a finger is holding, and the held
// direction dies mid-press (the "bấm không ăn / giữ hướng bị rơi"
// complaint). render() transplants the live cluster nodes into the
// fresh markup instead (see clusterNodes).
function playerCtrlKey(v) {
  var g = v.game; if (!g) return '';
  var myB = g.blobs ? g.blobs[S.seat] : null;
  var ko = myB && !myB.alive ? '|ko' : '';
  switch (g.id) {
    case 'day-ra': case 'ne-dan': case 'xe-tank': case 'dat-bom': case 'thu-thanh': case 'nguoi-que':
      return g.id + '|' + g.phase + ko;
    case 'ech-op':
      return g.id + '|' + g.phase + '|' + (g.myState || '');
    case 'can-goc': {
      var mc = g.myCannon;
      return g.id + '|' + g.phase + '|' + (!mc || !mc.alive ? 'ko' : g.myTurn ? 'aim' : 'wait');
    }
    case 'cao-boi':
      return g.id + '|' + g.phase + '|' + (g.mine || '');
    case 'do-vui':
      return g.id + '|' + g.phase + '|' + g.round + '|' + (g.mine == null ? 'ans' : 'done');
    case 'chia-cuop': {
      var inP = g.pair && g.pair.indexOf(S.seat) >= 0;
      return g.id + '|' + g.phase + '|' + (inP ? 'in' : 'out') + '|' + (g.mineChosen ? 'chosen' : '');
    }
    case 'ke-gia-mao':
      return g.id + '|' + g.phase + '|' + g.round + '|' + (g.mine == null ? 'a0' : 'a1') + '|' + (g.myVote == null ? 'v0' : 'v1');
    case 'ma-soi': {
      var k = g.id + '|' + g.phase + '|' + (g.myRole || '') + '|' + (g.myAlive ? 'alive' : 'dead');
      if (g.phase === 'night') k += '|' + (g.myWolfVote == null ? 0 : 1) + (g.myGuardPick == null ? 0 : 1) + (g.mySeerPick == null ? 0 : 1) + '|' + (g.myWitchDone ? 'wd' : '') + (g.wolvesIn ? 'wi' : '') + '|' + (g.myWitchSave ? 'ws' : '') + '|' + (g.myWitchPoison || '');
      if (g.phase === 'vote') k += '|' + (g.voted && g.voted[S.seat] ? 'voted' : '');
      return k;
    }
    case 'ca-ngua':
      return g.id + '|' + g.phase + '|' + (g.myTurn ? 'my' : 'other') + '|' + (g.dice || 0) + '|' + (g.myLegal || []).map(function (e) { return e.horse; }).join(',');
  }
  return g.id + '|' + g.phase;
}
function clusterNodes(root) {
  var out = [];
  var pw = root.querySelector('.padwrap'); if (pw) out.push(pw);
  var tb = root.querySelector('.tapbtn'); if (tb) out.push(tb);
  var og = root.querySelector('.optgrid'); if (og) out.push(og);
  var sg = root.querySelector('.symgrid'); if (sg) out.push(sg);
  var ct = root.querySelector('#chatText'); if (ct && ct.parentElement) out.push(ct.parentElement);
  var chs = root.querySelectorAll('[data-cmd="choose"]');
  for (var i = 0; i < chs.length; i++) { var pp = chs[i].parentElement; if (pp && out.indexOf(pp) < 0) out.push(pp); }
  var rl = root.querySelector('[data-cmd="roll"]'); if (rl && rl.parentElement && out.indexOf(rl.parentElement) < 0) out.push(rl.parentElement);
  return out;
}
function render() {
  var app = el('app');
  // Local keyboard panels live outside #app and must repaint even when
  // the main view signature is unchanged (peek/cursor state), and clear
  // themselves when the host leaves a game — so they run on EVERY
  // render() invocation, before any early return below.
  renderLocalPanels();
  // The my-seat section (phone mode) lives inside #app but, exactly
  // like the local panels, must repaint on its own signature — the
  // host's private view can change (a dealt hand, a witch toggle)
  // while the public stage signature stands still.
  renderMySeat();
  if (!S.role) { if (app.classList) { app.classList.remove('playhud'); app.classList.remove('perf'); } if (S.sig !== 'home') { S.sig = 'home'; S.ctrlKey = ''; app.innerHTML = homeHTML(); fillHomeDefaults(); } return; }
  var v = S.view;
  if (!v) { app.innerHTML = '<div class="card center"><h2>Đang nối phòng…</h2><p class="muted">Nếu chờ lâu vẫn không vào được, phòng có thể đã đóng hoặc hết hạn.</p><p><button class="btn ghost" data-cmd="reload">Về trang chính</button></p></div>'; return; }
  if (app.classList) app.classList.toggle('playhud', !!(S.role === 'host' && v.phase === 'playing' && v.game && FIELD_GAMES[v.game.id]));
  if (app.classList) app.classList.toggle('perf', !!(v.phase === 'playing' && v.game && FIELD_GAMES[v.game.id]));
  var sig = viewSig(v);
  if (sig === S.sig) return;
  var transplant = null;
  if (S.role === 'player' && v.phase === 'playing' && v.game) {
    var key = playerCtrlKey(v);
    if (S.ctrlKey === key) transplant = clusterNodes(document);
    S.ctrlKey = key;
  } else S.ctrlKey = '';
  S.sig = sig;
  app.innerHTML = S.role === 'host' ? hostHTML(v) : playerHTML(v);
  if (transplant && transplant.length) {
    var fresh = clusterNodes(app);
    if (fresh.length === transplant.length) {
      var activeEl = document.activeElement;
      var caret = activeEl && activeEl.id === 'chatText' ? activeEl.selectionStart : -1;
      for (var ti = 0; ti < fresh.length; ti++) fresh[ti].parentNode.replaceChild(transplant[ti], fresh[ti]);
      if (activeEl && activeEl.id === 'chatText' && document.activeElement !== activeEl) {
        activeEl.focus();
        try { activeEl.setSelectionRange(caret, caret); } catch (e) {}
      }
    }
  }
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
  // The full render above rebuilt the field DOM from scratch: arena
  // pieces were created at their CSS default position (centre). Patch
  // them onto the current view NOW, in the same task, so the browser
  // never paints the centred frame (the life-loss centre-flash).
  patchPositions(v);
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
// Decorative effects are MUTED while a game is playing (user's
// order: strip every excess effect for smoothness). Spark bursts,
// ghosts, trails, warning pings, screen shakes and the slow-mo
// class all create DOM nodes and force style/layout work in the
// middle of play; the essential feedback that remains is the hit
// flash on the blob itself and the K.O. banner (plain class/text
// changes, no new nodes).
function fxMuted() { return !!(S.view && S.view.phase === 'playing'); }
function fxSparks(field, x, y, colorHex, n, fam) {
  if (fxMuted()) return;
  var fp = famPct(fam || 'std', x, y);
  for (var i = 0; i < n; i++) {
    var s = document.createElement('span');
    s.className = 'fx-spark';
    s.style.left = fp[0] + '%';
    s.style.top = fp[1] + '%';
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
  if (fxMuted()) return;
  var s = document.createElement('span');
  s.className = 'fx-ghost';
  s.style.left = PX(pos.x) + '%';
  s.style.top = PY(pos.y) + '%';
  s.innerHTML = orbSVG(colorName, 40);
  field.appendChild(s);
  requestAnimationFrame(function () { s.style.opacity = '0'; });
  setTimeout(function () { s.remove(); }, 540);
}
function fxTrail(field, ball) {
  if (fxMuted()) return;
  var s = document.createElement('span');
  s.className = 'fx-trail';
  s.style.left = PX(ball.x) + '%';
  s.style.top = PY(ball.y) + '%';
  field.appendChild(s);
  setTimeout(function () { s.remove(); }, 320);
}
function fxWarn(field, ball) {
  if (fxMuted()) return;
  var cx = Math.max(-15, Math.min(15, ball.x)), cy = Math.max(-8.5, Math.min(8.5, ball.y));
  var s = document.createElement('span');
  s.className = 'awarn';
  s.style.left = PX(cx) + '%';
  s.style.top = PY(cy) + '%';
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
  if (fxMuted()) return;
  var cls = big ? 'shake-big' : 'shake';
  field.classList.remove('shake'); field.classList.remove('shake-big');
  requestAnimationFrame(function () { field.classList.add(cls); });
  setTimeout(function () { field.classList.remove(cls); }, big ? 480 : 330);
}
function fxSlowmo(field) {
  if (fxMuted()) return;
  field.classList.add('slowmo');
  if (S._smT) clearTimeout(S._smT);
  S._smT = setTimeout(function () { field.classList.remove('slowmo'); }, 620);
}
function fxFlash(seat) {
  var node = el('ablob-' + seat); if (!node) return;
  node.classList.remove('hitflash');
  requestAnimationFrame(function () { node.classList.add('hitflash'); });
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
      if (moved > 1.4) {
        fxGhost(field, prev, colName);
        fxGhost(field, { x: (cur.x + prev.x) / 2, y: (cur.y + prev.y) / 2 }, colName);
        sfxDash();
      }
    }
    P.blobs[seat] = { x: cur.x, y: cur.y, lives: cur.lives, alive: cur.alive };
  }
  // Pickup bursts, same snapshot pattern: a banked star (Cướp Sao), a
  // crown changing hands (Giữ Vương Miện) and a temple gem being taken
  // each pop a small spark burst in the game's own colour.
  if (g.id === 'cuop-sao' && g.banked && g.blobs) {
    if (!P.banked) { P.banked = {}; for (var bk0 in g.banked) P.banked[bk0] = g.banked[bk0]; }
    for (var bkS in g.banked) {
      if (P.banked[bkS] != null && g.banked[bkS] > P.banked[bkS] && field && g.blobs[bkS]) {
        fxSparks(field, g.blobs[bkS].x, g.blobs[bkS].y, '#FFD93D', 8);
        beep(1180, 0.07, 'sine', 0.1);
      }
      P.banked[bkS] = g.banked[bkS];
    }
  }
  if (g.id === 'giu-vuong-mien' && g.crown && g.blobs) {
    var holderNow = g.crown.holder || 0;
    if (P.holder === undefined) P.holder = holderNow;
    else if (holderNow && holderNow !== P.holder && field && g.blobs[holderNow]) {
      fxSparks(field, g.blobs[holderNow].x, g.blobs[holderNow].y, '#FFC93D', 10);
      beep(880, 0.08, 'triangle', 0.11);
    }
    P.holder = holderNow;
  }
  if (g.id === 'den-lua-nuoc' && g.gems) {
    if (!P.gems) { P.gems = {}; for (var gm0 = 0; gm0 < g.gems.length; gm0++) P.gems[g.gems[gm0].id] = g.gems[gm0].taken; }
    for (var gmI = 0; gmI < g.gems.length; gmI++) {
      var gmNow = g.gems[gmI];
      if (P.gems[gmNow.id] === false && gmNow.taken && field) {
        fxSparks(field, gmNow.x, gmNow.y, gmNow.el === 'lua' ? '#FF7A4D' : '#4FC3F7', 9);
        beep(990, 0.07, 'sine', 0.1);
      }
      P.gems[gmNow.id] = gmNow.taken;
    }
  }
  if (g.id === 'da-bong' && g.scoreboard) {
    var totNow = (g.scoreboard.do || 0) + (g.scoreboard.xanh || 0);
    if (P.goals === undefined) P.goals = totNow;
    else if (totNow > P.goals) {
      if (field) {
        fxShake(field, true);
        var gx9 = g.goalInfo && g.goalInfo.team === 'do' ? 17.5 : -17.5;
        fxSparks(field, gx9, 6.7, '#FFE066', 18, 'soc');
      }
      sfxWin();
      P.goals = totNow;
    }
  }
  if (g.id === 'ech-op' && typeof g.fliesEaten === 'number') {
    if (P.flies === undefined) P.flies = g.fliesEaten;
    else if (g.fliesEaten > P.flies) { beep(1180, 0.07, 'sine', 0.1); P.flies = g.fliesEaten; }
  }
  if (g.id === 'can-goc') {
    var boomAt = g.boom ? g.boom.at : 0;
    if (P.boomAt === undefined) P.boomAt = boomAt;
    else if (boomAt && boomAt !== P.boomAt) {
      if (field) { fxShake(field, true); fxSparks(field, g.boom.x, g.boom.y, '#FFB35C', 14); }
      sfxBoom();
      P.boomAt = boomAt;
    }
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
      }
    }
    P.ballN = g.balls.length;
  }
}
// Create/move/remove the transient field entities (shells, slimes)
// whose DOM nodes cannot be rendered once by hostStage: they are keyed
// by server id inside #afield and pruned when the server drops them.
// Coordinate families: 'std' games simulate in a 32x18 space
// (x in [-16,16], y in [-9,9]); soccer ('soc') in 38x19.2.
function PX(x) { return (x + 16) / 32 * 100; }
function PY(y) { return (y + 9) / 18 * 100; }
function PSX(x) { return (x + 19) / 38 * 100; }
function PSY(y) { return (y + 9.6) / 19.2 * 100; }
function famPct(fam, x, y) { return fam === 'soc' ? [PSX(x), PSY(y)] : [PX(x), PY(y)]; }
function syncDyn(items, prefix, cls, decorate) {
  var field = el('afield');
  if (!field) return;
  var seen = {};
  for (var i = 0; i < items.length; i++) {
    var it = items[i]; var id = prefix + it.id; seen[id] = 1;
    var n = el(id);
    if (!n) {
      n = document.createElement('div');
      n.id = id; n.className = cls;
      if (decorate) decorate(n, it);
      n.classList.add('pop');
      field.appendChild(n);
    }
    moveEl(n, it.x, it.y, 'std', it.vx, it.vy);
  }
  var olds = field.querySelectorAll('.' + cls);
  for (var j = 0; j < olds.length; j++) if (!seen[olds[j].id]) olds[j].remove();
}
// Index-keyed variant for the dodge/shared balls (no server id): nodes
// are nball-<index>, created/pruned as the ball count changes, so the
// host stage never rebuilds when a ball spawns.
function syncDynIdx(items, prefix, cls) {
  var field = el('afield');
  if (!field) return;
  for (var i = 0; i < items.length; i++) {
    var id = prefix + i;
    var n = el(id);
    if (!n) {
      n = document.createElement('div');
      n.id = id; n.className = cls;
      n.classList.add('pop');
      field.appendChild(n);
    }
    moveEl(n, items[i].x, items[i].y, 'std', items[i].vx, items[i].vy);
  }
  var olds = field.querySelectorAll('.' + cls);
  for (var j = 0; j < olds.length; j++) {
    var idx = +(olds[j].id || '').slice(prefix.length);
    if (!(idx >= 0 && idx < items.length)) olds[j].remove();
  }
}
// Bomber blast cells, keyed by grid cell: created/pruned from the live
// view so explosions no longer force a stage rebuild. Cell (c, r) of
// the 15x9 grid spans exactly 2x2 game units.
function syncBlasts(blasts) {
  var field = el('afield');
  if (!field) return;
  var seen = {};
  for (var i = 0; i < blasts.length; i++) {
    var cells = blasts[i].cells || [];
    for (var j = 0; j < cells.length; j++) {
      var c = cells[j][0], r = cells[j][1];
      var id = 'blast-' + c + '-' + r; seen[id] = 1;
      if (!el(id)) {
        var n = document.createElement('div');
        n.id = id; n.className = 'ablast';
        n.style.left = (c * 6.25) + '%'; n.style.top = (r * 11.1111) + '%';
        n.style.width = '6.25%'; n.style.height = '11.1111%';
        field.appendChild(n);
      }
    }
  }
  var olds = field.querySelectorAll('.ablast');
  for (var k = 0; k < olds.length; k++) if (!seen[olds[k].id]) olds[k].remove();
}
// ---------------------------------------------------------------------
// rAF position interpolation, transform edition. patchPositions records
// TARGET positions (in game units) through moveEl; one
// requestAnimationFrame loop eases each element toward its target and
// writes a GPU-composited transform: translate3d(...) instead of
// left/top (no layout, no paint of the element's box). Elements sit at
// left:0/top:0 of the field; the pixel offset comes from the field rect
// and each element's own centring is appended (translate(-50%,-50%),
// or the crown's -135% hover; margin-centred pieces need nothing).
// First placement of any element SNAPS exactly to target in the same
// task as the render: the centre-flash guard is preserved. On top of
// easing, the loop EXTRAPOLATES: views carry vx/vy in units per tick,
// and the rendered target leads the last server position by a TIME
// budget (SMOOTH3: up to 400 ms of dead reckoning at the 62.5 ms
// tick), so motion runs ahead of the tick instead of trailing it —
// and when a state push is delayed, movers keep gliding on their
// last velocity for up to 400 ms instead of freezing mid-glide; the
// exponential ease (tau 40) absorbs the correction when fresh state
// lands. The loop still reads the field's .slowmo class and
// stretches its time constant ~6x. Without rAF, moveEl falls back to
// left/top percentages and the CSS transitions carry the motion.
var RAF_OK = typeof requestAnimationFrame === 'function';
var RAF_TAU = 30;
// Snapshot-interpolation delay for non-predicted movers: the render
// runs this far behind the newest anchor, between the last two
// anchors, so delivery jitter cannot move the rendered path.
var INTERP_MS = 100;
var TICK_MS_CLIENT = 62.5;
function moverMode(node) {
  var c = ' ' + (node.className || '') + ' ';
  if (c.indexOf(' acrown ') >= 0) return 'crown';
  if (c.indexOf(' ashell ') >= 0 || c.indexOf(' aslime ') >= 0 || c.indexOf(' tgem ') >= 0 || c.indexOf(' ffly ') >= 0) return 'm';
  return 'c';
}
function writePos(e, rect) {
  var parent = e.el.parentElement;
  if (!parent) return;
  // The field's size is cached across frames: measuring it forces
  // a synchronous layout of the whole page, and doing that inside
  // the frame loop (or at every mover spawn) is a steady tax on
  // weak machines. The cache is dropped on window resize.
  rect = rect || (parent.id === 'afield' ? S.fieldRect : null) || parent.getBoundingClientRect();
  if (parent.id === 'afield' && rect.width) S.fieldRect = rect;
  if (!rect.width) return;
  var p = famPct(e.fam, e.x, e.y);
  var t = 'translate3d(' + (p[0] / 100 * rect.width).toFixed(1) + 'px,' + (p[1] / 100 * rect.height).toFixed(1) + 'px,0)';
  if (e.mode === 'c') t += ' translate(-50%,-50%)';
  else if (e.mode === 'crown') t += ' translate(-50%,-135%)';
  // Writing the same transform again still costs a style recalc on
  // weak GPUs; movers whose rendered position did not change since
  // the last write (idle players, paused balls, static pieces) skip
  // the write entirely.
  if (e._wt !== t) { e._wt = t; e.el.style.transform = t; }
}
// --- SMOOTH4: client-side prediction for the viewer's OWN character.
// A local keypress used to show on screen only after a full round
// trip to the Durable Object and back (pad POST -> tick -> push ->
// render), even though the pad is already known HERE, instantly.
// For the seven positional pad games below, rafLoop now steers the
// viewer's own blob with a LIVE velocity rebuilt from the currently
// held pad (same sign convention as every server stepper:
// x = r - l, y = d - u) at the last speed the server reported for
// that axis, and leads the anchor by the elapsed time plus a fixed
// 2.5 ticks (the one-way trip), under the same 400 ms cap as the
// plain dead reckoning. Other players, bots, projectiles and props
// keep the server velocity untouched. When the pad is released the
// prediction velocity is 0 and the mover settles on the anchor
// exactly as before. Scope is deliberately narrow: positional
// movers only (no gravity games, no shared blob, no soccer).
var PRED_GAMES = { 'day-ra': 1, 'ne-dan': 1, 'cuop-sao': 1, 'giu-vuong-mien': 1, 'son-san': 1, 'xe-tank': 1, 'thu-thanh': 1 };
function predPadFor(id) {
  if (!id || id.indexOf('ablob-') !== 0) return null;
  var v = S.view;
  if (!v || !v.game || !PRED_GAMES[v.game.id]) return null;
  var seat = +id.slice(6);
  if (!seat) return null;
  if (S.role === 'player') return seat === S.seat ? S.padState : null;
  if (S.role === 'host' && v.locals) {
    for (var i = 0; i < v.locals.length; i++) {
      if (v.locals[i].seat === seat) { var st = LK[seat]; return st ? st.pad : null; }
    }
  }
  // Remote human (phone/APK player): the view carries their last
  // held pad as a bitmask — predict from it exactly like a local
  // seat. It is at most one push cadence old, and the anchor
  // reconcile keeps it honest. Bots carry no mask and stay on the
  // interpolation path.
  var vb = v.game.blobs ? v.game.blobs[seat] : null;
  if (vb && typeof vb.pm === 'number') {
    return { up: !!(vb.pm & 1), down: !!(vb.pm & 2), left: !!(vb.pm & 4), right: !!(vb.pm & 8), a: !!(vb.pm & 16), b: !!(vb.pm & 32), x: !!(vb.pm & 64), y: !!(vb.pm & 128) };
  }
  return null;
}
function moveEl(node, x, y, fam, vx, vy) {
  if (!node) return;
  fam = fam || 'std';
  if (!RAF_OK || !node.id) {
    var p = famPct(fam, x, y);
    node.style.left = p[0] + '%'; node.style.top = p[1] + '%';
    return;
  }
  var e = S.raf[node.id];
  if (!e || e.el !== node) {
    node.style.left = '0px'; node.style.top = '0px';
    var at0 = (S._anchorT || serverNow());
    var cls0 = ' ' + (node.className || '') + ' ';
    e = S.raf[node.id] = { el: node, fam: fam, mode: moverMode(node), bal: (cls0.indexOf(' ashell ') >= 0 || cls0.indexOf(' aball ') >= 0), x: x, y: y, px: x, py: y, atP: at0, tx: x, ty: y, vx: vx || 0, vy: vy || 0, atS: at0, lastSpdX: vx ? Math.abs(vx) : null, lastSpdY: vy ? Math.abs(vy) : null };
    writePos(e);
    return;
  }
  var newAtS = (S._anchorT || serverNow());
  if (newAtS < e.atS) return; // stale / out-of-order view: anchors never run backward
  if (newAtS === e.atS && x === e.tx && y === e.ty) { e.vx = vx || 0; e.vy = vy || 0; e.fam = fam; return; } // the same view re-applied by tick/render is not a new anchor
  // Keep the previous anchor: non-predicted movers are rendered by
  // interpolating between the last two anchors on the server clock,
  // which is what makes their motion immune to delivery jitter.
  e.px = e.tx; e.py = e.ty; e.atP = e.atS;
  e.tx = x; e.ty = y; e.vx = vx || 0; e.vy = vy || 0; e.atS = newAtS; e.fam = fam;
  if (predPadFor(node.id)) {
    // Remember the last nonzero per-axis speed the server reported
    // (magnitude only — the held pad supplies the sign) for the
    // local integration in rafLoop, then reconcile softly: project
    // the fresh anchor to "now" along its own velocity and pull the
    // render a third of the way toward it. Only a true teleport
    // (ring-out respawn) snaps outright — the old hard snap at 2.5u
    // fired on ordinary jitter corrections too and read as a jerk.
    if (e.vx) e.lastSpdX = Math.abs(e.vx);
    if (e.vy) e.lastSpdY = Math.abs(e.vy);
    var ageT = Math.min(Math.max((serverNow() - e.atS) / TICK_MS_CLIENT, 0), 400 / TICK_MS_CLIENT);
    var projX = e.tx + e.vx * ageT, projY = e.ty + e.vy * ageT;
    var ddx = projX - e.x, ddy = projY - e.y;
    // Do not drag the render toward the projection here: an
    // instant pull once per push is a 16 Hz step train on the
    // player's own character (reads as vibration). Store the
    // correction; rafLoop applies it as a smooth spring.
    if (Math.abs(ddx) > 2.5 || Math.abs(ddy) > 2.5) { e.x = projX; e.y = projY; e.corrX = 0; e.corrY = 0; }
    else { e.corrX = ddx; e.corrY = ddy; }
  } else if (Math.abs(e.tx - e.px) > 3 || Math.abs(e.ty - e.py) > 3) {
    // Teleport (spawn / respawn): restart the interpolation history
    // here instead of gliding across the arena.
    e.px = e.tx; e.py = e.ty; e.atP = e.atS; e.x = e.tx; e.y = e.ty; e.corrX = 0; e.corrY = 0;
  } else {
    // Non-predicted mover (bots, other players): the new anchor's
    // projection almost never equals the position the render has
    // reached by extrapolating the PREVIOUS anchor — bot steering,
    // decaying knockback and wall bounces all bend the true path
    // between pushes. Snapping to the new projection at every push
    // is a ~15 Hz step train across the whole scene (the "frames
    // keep skipping" feel, worst in Day Ra where knockback velocity
    // decays every tick). Store the gap as an offset instead;
    // rafLoop adds it to the fresh projection and decays it over
    // ~85 ms, so the path bends smoothly into the new anchor.
    // Project on the RENDER clock (now minus the adaptive delay),
    // not wall-clock now: rafLoop draws at rt, so an offset measured
    // against "now" is wrong by vx * delay and the render jumps by
    // exactly that error whenever the delay is engaged.
    var rtN = serverNow() - (S._rDelayCur || 0) / 1000;
    var ageN = Math.min(Math.max((rtN - e.atS) / TICK_MS_CLIENT, 0), 400 / TICK_MS_CLIENT);
    e.corrX = e.x - (e.tx + e.vx * ageN);
    e.corrY = e.y - (e.ty + e.vy * ageN);
  }
}
function rafLoop(ts) {
  requestAnimationFrame(rafLoop);
  var nowMs = typeof ts === 'number' ? ts : performance.now();
  var dt = S.rafLast ? Math.min(100, nowMs - S.rafLast) : 16;
  S.rafLast = nowMs;
  // Adaptive lite mode: average the frame time over 50-frame
  // windows; if this device cannot hold ~45fps, shed the expensive
  // paint work (body.lite CSS) until frames recover for 3 straight
  // windows. Weak hardware feels "lag" no network fix can cure —
  // this makes the page itself cheaper exactly when it matters.
  S._ftAcc = (S._ftAcc || 0) + dt; S._ftN = (S._ftN || 0) + 1;
  if (dt > 25) S._ftSlow = (S._ftSlow || 0) + 1;
  if (dt > 25) { S._hitch = S._hitch || []; S._hitch.push({ t: Date.now(), d: Math.round(dt) }); if (S._hitch.length > 60) S._hitch.shift(); }
  if (dt > 120) S._ftBlock = true;
  if (S._ftN >= 50) {
    var avgF = S._ftAcc / S._ftN; var slowN = S._ftSlow || 0; var blocked = !!S._ftBlock; S._ftAcc = 0; S._ftN = 0; S._ftSlow = 0; S._ftBlock = false;
    S._fpsAvg = avgF;
    var bd = document.body;
    if (bd) {
      // Trigger on hitches, not just a low average: a page that
      // averages 58 fps but freezes 200 ms every few seconds FEELS
      // broken while its average still looks healthy — and a single
      // long block produces only ONE slow frame sample, so count
      // blocks explicitly.
      if ((avgF > 23 || slowN >= 8 || blocked) && !bd.classList.contains('lite')) bd.classList.add('lite');
      else if (avgF < 17 && slowN <= 2 && bd.classList.contains('lite')) { S._liteOk = (S._liteOk || 0) + 1; if (S._liteOk >= 3) { bd.classList.remove('lite'); S._liteOk = 0; } }
      else if (avgF >= 17) S._liteOk = 0;
    }
  }
  var field = el('afield');
  if (field && !field.classList.contains('raf-on')) field.classList.add('raf-on');
  var slow = !!(field && field.classList.contains('slowmo'));
  var ks = 1 - Math.exp(-dt / (RAF_TAU * 6));
  var nowS = serverNow();
  var rectCache = [];
  for (var id in S.raf) {
    var e = S.raf[id];
    if (e.el.isConnected === false) { delete S.raf[id]; continue; }
    var parent = e.el.parentElement;
    if (!parent) continue;
    var rect = null;
    for (var ci = 0; ci < rectCache.length; ci++) if (rectCache[ci][0] === parent) { rect = rectCache[ci][1]; break; }
    if (!rect) { rect = parent.getBoundingClientRect(); rectCache.push([parent, rect]); }
    var pp = predPadFor(id);
    if (pp) {
      // Own character — client-side prediction by INTEGRATION: each
      // frame advances the render by the live pad at the last speed
      // the server reported, so input answers on the very next frame
      // and no network swing can move the goalposts (the old
      // anchor-age extrapolation teleported its goal back and forth
      // whenever delivery jittered — the measured jerk). A free axis
      // follows the anchor velocity with a freshness fade: a stale
      // velocity is probably over, which is what keeps a released
      // key or a finished shove from drifting on. moveEl reconciles
      // softly each time a fresh anchor lands.
      var dtT = dt / TICK_MS_CLIENT;
      var pdx = (pp.r ? 1 : 0) - (pp.l ? 1 : 0), pdy = (pp.d ? 1 : 0) - (pp.u ? 1 : 0);
      var ageTk = Math.min(Math.max((nowS - (e.atS || nowS)) / TICK_MS_CLIENT, 0), 6);
      var fresh = Math.max(0, 1 - ageTk / 2.5);
      // Speed seed: every predicted game's stepper moves its blobs
      // at the arena step (STEP_X 0.167 / STEP_Y 0.094 per tick), so
      // a press from standstill predicts at that speed until the
      // first anchor reports the true one. Without the seed the
      // first press of every stop-and-go waited a full round trip
      // for an observed speed (measured 170 ms on a zero-delay rig).
      var spdX = e.lastSpdX != null ? e.lastSpdX : 0.167;
      var spdY = e.lastSpdY != null ? e.lastSpdY : 0.094;
      if (pdx !== 0) e.x += pdx * spdX * dtT; else e.x += (e.vx || 0) * fresh * dtT;
      if (pdy !== 0) e.y += pdy * spdY * dtT; else e.y += (e.vy || 0) * fresh * dtT;
      // Continuous reconcile spring (~80 ms): applies the stored
      // correction from the latest anchor gradually, every frame.
      if (e.corrX || e.corrY) {
        var cf3 = 1 - Math.exp(-dt / 80);
        var ax3 = (e.corrX || 0) * cf3, ay3 = (e.corrY || 0) * cf3;
        e.x += ax3; e.y += ay3; e.corrX -= ax3; e.corrY -= ay3;
      }
      writePos(e, rect);
      continue;
    }
    if (slow && field && field.contains(e.el)) {
      // The brief slow-mo celebration keeps its legacy glide.
      var leadS = Math.min(Math.max((nowS - (e.atS || nowS)) / TICK_MS_CLIENT, 0), 400 / TICK_MS_CLIENT);
      var sx = e.tx + e.vx * leadS - e.x, sy = e.ty + e.vy * leadS - e.y;
      e.x += sx * ks; e.y += sy * ks;
      writePos(e, rect);
      continue;
    }
    // Everyone else — snapshot interpolation on the server clock:
    // render the mover as it was INTERP_MS ago, between the last
    // two anchors. Delivery jitter changes WHEN anchors land, never
    // the rendered path. If render time runs past the newest anchor
    // (a push is late), extrapolate its velocity for at most 80 ms,
    // then hold until the next anchor arrives.
    // Ballistic movers (shells) get a much shorter delay — transit
    // plus a breath — because their extrapolation is exact: what
    // matters in a dodge game is that a shell is drawn where it IS,
    // not where it was a tenth of a second ago.
    // The render clock trails real time by a delay sized from the
    // MEASURED push cadence: while pushes arrive at tick rate
    // (~63 ms) the delay is zero and movers dead-reckon exactly as
    // before, but when the channel degrades (a measured median gap
    // of 118 ms on the user's own screen, with a fast 30 ms ping —
    // the alarm path, not the network) the delay grows to cover
    // the gap and the segment interpolation below takes over, so
    // the world glides across late pushes instead of snapping at
    // each one. The player's own blob is unaffected: it renders
    // from local prediction at ~now on a separate branch.
    // Size the render buffer from the gap DISTRIBUTION, not the
    // median: residential Wi-Fi delivers pushes in bunches (three
    // at once, then 250 ms of silence) while the median still reads
    // a healthy ~60 ms — a median-sized buffer is empty exactly
    // when the bunch gap hits, so the world extrapolated, decayed
    // and snapped all match long. The 90th-percentile gap is the
    // honest size of the hole the buffer must cover. On a truly
    // clean channel (p90 <= 85 ms) the delay stays zero.
    var gapHist = (S._gapWs && S._gapWs.length >= 6) ? S._gapWs : S._gapH;
    var gapP90 = pctOf(gapHist, 0.9) || medOf(gapHist) || 63;
    var rDelayT = gapP90 <= 85 ? 0 : Math.min(240, Math.max(40, (gapP90 - 15) * 0.9));
    // The delay itself must glide toward its target (<=2 ms per
    // frame): the rolling median steps as samples enter and leave,
    // and a stepping delay makes the render clock wobble, which is
    // visible as judder all by itself.
    if (S._rDelayCur === undefined) S._rDelayCur = rDelayT;
    else if (S._rDelayCur < rDelayT) S._rDelayCur = Math.min(rDelayT, S._rDelayCur + 2);
    else if (S._rDelayCur > rDelayT) S._rDelayCur = Math.max(rDelayT, S._rDelayCur - 2);
    var rt = nowS - S._rDelayCur / 1000;
    var gx, gy;
    if (e.atS == null || e.atP == null || e.atS <= e.atP || rt >= e.atS) {
      // Past the newest anchor: extrapolate the velocity.
      var extra = e.atS == null ? 0 : Math.min(Math.max(rt - e.atS, 0), e.bal ? 700 : 500);
      // Ballistic movers fly straight at constant speed FOREVER:
      // decaying their extrapolation (the old shared rule) made
      // shells visibly slow down then lurch forward whenever
      // delivery bunched — in a dodge game that reads as pure lag.
      // Other movers keep a gentle decay that only starts at
      // 200 ms, so a late push resumes from a closer position and
      // the catch-up correction stays small.
      var decay = e.bal ? 1 : (extra <= 200 ? 1 : Math.max(0.6, 1 - (extra - 200) / 750));
      var dist = (extra / TICK_MS_CLIENT) * decay;
      gx = e.tx + (e.vx || 0) * dist; gy = e.ty + (e.vy || 0) * dist;
    } else if (rt <= e.atP) { gx = e.px; gy = e.py; }
    else { var f = (rt - e.atP) / (e.atS - e.atP); gx = e.px + (e.tx - e.px) * f; gy = e.py + (e.ty - e.py) * f; }
    // Apply the anchor-arrival offset (see moveEl): the rendered
    // path starts from where the eye actually was and the offset
    // decays exponentially, so velocity changes between pushes
    // bend the path instead of stepping it.
    if (e.corrX || e.corrY) {
      var cfN = Math.exp(-dt / 85);
      e.corrX = (e.corrX || 0) * cfN; e.corrY = (e.corrY || 0) * cfN;
      if (Math.abs(e.corrX) < 0.004) e.corrX = 0;
      if (Math.abs(e.corrY) < 0.004) e.corrY = 0;
      gx += e.corrX; gy += e.corrY;
    }
    e.x = gx; e.y = gy;
    writePos(e, rect);
  }
}
// Position + label sync for every arena-style game (blobs, cannonballs,
// barrels, shells, slimes, stars, crown, paint grid, shared blob, crate,
// boat). tick() runs this every 150ms; render() ALSO runs it once via
// afterRender, because a full re-render rebuilds the field DOM with
// elements at their CSS default (left/top 50%) — without an immediate
// patch they would flash at the arena centre until the next tick.
// Everything here is a pure function of the current view (idempotent),
// and arenaFX keeps its own delta snapshot, so an extra call after a
// render can only fire a pending effect once, never twice.
// DOM write guards: patchPositions runs on every push (and every
// local tick); rewriting identical text/transforms still dirties
// layout on weak GPUs, so each element remembers its last value.
function setT(elm, txt) { if (!elm) return; txt = '' + txt; if (elm._tx !== txt) { elm._tx = txt; elm.textContent = txt; } }
function setTf(elm, tf) { if (!elm) return; if (elm._tf !== tf) { elm._tf = tf; elm.style.transform = tf; } }
function setOp(elm, op) { if (!elm) return; if (elm._op !== op) { elm._op = op; elm.style.opacity = op; } }
function patchPositions(v) {
  var g = v && v.game;
  if (!g) return;
  var t = serverNow();
  S._anchorT = (v && v.serverNow) || t; // anchors are stamped with the VIEW's server time, not the apply time
  if ((g.id === 'day-ra' || g.id === 'ne-dan') && g.blobs) {
    for (var bSeat in g.blobs) {
      var bb = g.blobs[bSeat];
      var bn = el('ablob-' + bSeat);
      if (bn) {
        moveEl(bn, bb.x, bb.y, 'std', bb.vx, bb.vy);
        bn.style.opacity = bb.alive ? '1' : '0.25';
      }
      var lv = el('alives-' + bSeat);
      if (lv) lv.textContent = '\u2764'.repeat(bb.lives);
    }
    var ring = el('aring');
    // Ring size rides a transform scale on the fixed full-field basis
    // (.aring.dynring is 100% x 100%): scale = (arenaR * 25/3)% / 100 —
    // the exact diameter the old width/height percentages produced,
    // without repainting the giant bordered circle on every patch.
    if (ring && g.arenaR) { ring.style.transform = 'translate(-50%, -50%) scale(' + (g.arenaR * 25 / 300) + ')'; }
    var ml = el('mylives');
    if (ml && g.blobs[S.seat]) ml.textContent = '\u2764'.repeat(g.blobs[S.seat].lives);
  }
  if (g.id === 'ne-dan' && g.balls) syncDynIdx(g.balls, 'nball-', 'aball');
  if ((g.id === 'day-ra' || g.id === 'ne-dan') && g.blobs) arenaFX(v, g);
  if (g.id === 'keo-co') {
    var kn9 = el('tugknot');
    if (kn9) kn9.style.left = Math.max(3, Math.min(97, 50 + (g.knot / 112) * 46)) + '%';
    if (g.presses) for (var pSeat in g.presses) { setT(el('tugpress-' + pSeat), g.presses[pSeat]); }
    var mp9 = el('mypull');
    if (g.presses) setT(mp9, g.presses[S.seat] || 0);
  }
  if ((g.id === 'xe-tank' || g.id === 'dat-bom' || g.id === 'thu-thanh') && g.blobs) {
    for (var wSeat in g.blobs) {
      var wb = g.blobs[wSeat];
      var wn = el('ablob-' + wSeat);
      if (wn) {
        moveEl(wn, wb.x, wb.y, 'std', wb.vx, wb.vy);
        setOp(wn, wb.alive ? '1' : '0.25');
      }
      var lv2 = el('alives-' + wSeat);
      setT(lv2, '\u2764'.repeat(Math.max(0, wb.lives)));
      var brl = el('barrel-' + wSeat);
      if (brl && g.facing && g.facing[wSeat]) setTf(brl, 'rotate(' + Math.round(Math.atan2(g.facing[wSeat].y, g.facing[wSeat].x) * 180 / Math.PI) + 'deg)');
    }
    var ml2 = el('mylives');
    if (g.blobs[S.seat]) setT(ml2, '\u2764'.repeat(Math.max(0, g.blobs[S.seat].lives)));
    if (g.shells) syncDyn(g.shells, 'shell-', 'ashell', null);
    if (g.id === 'xe-tank' || g.id === 'dat-bom') arenaFX(v, g);
  }
  if (g.id === 'dat-bom') {
    if (g.bombs) syncDyn(g.bombs, 'abomb-', 'abomb', function (n, it) { n.textContent = '\uD83D\uDCA3'; });
    if (g.soft) {
      var softSet = {};
      for (var sfI = 0; sfI < g.soft.length; sfI++) softSet[g.soft[sfI][0] + ',' + g.soft[sfI][1]] = 1;
      var softEls = document.querySelectorAll('.bsoft');
      for (var sfJ = 0; sfJ < softEls.length; sfJ++) {
        var sfKey = (softEls[sfJ].id || '').slice(6);
        softEls[sfJ].style.display = softSet[sfKey] ? '' : 'none';
      }
    }
    if (g.blasts) syncBlasts(g.blasts);
  }
  if (g.id === 'thu-thanh') {
    if (g.slimes) syncDyn(g.slimes, 'slime-', 'aslime', function (n, it) { n.className = 'aslime' + (it.big ? ' big' : ''); n.innerHTML = '<i></i><i></i>'; });
    var ch2 = el('crystalhp'); if (ch2 && g.crystal) ch2.textContent = g.crystal.hp;
    var chh = el('crystalhearts'); if (chh && g.crystal) chh.textContent = '\u2764'.repeat(Math.max(0, g.crystal.hp));
    var kn = el('killn'); if (kn) kn.textContent = g.kills || 0;
    var chp2 = el('crystalhp2'); if (chp2 && g.crystal) chp2.textContent = g.crystal.hp;
    var kn2 = el('killn2'); if (kn2) kn2.textContent = g.kills || 0;
  }
  if (g.id === 'nguoi-que' && g.blobs) {
    for (var qSeat in g.blobs) {
      var qb2 = g.blobs[qSeat];
      var qn = el('ablob-' + qSeat);
      if (qn) {
        moveEl(qn, qb2.x, qb2.y, 'std', qb2.vx, qb2.vy);
        qn.style.opacity = qb2.alive ? (qb2.invuln ? '0.55' : '1') : '0.2';
      }
      var dm = el('dmg-' + qSeat);
      if (dm) { dm.textContent = (qb2.dmg || 0) + '%'; dm.style.color = dmgColor(qb2.dmg || 0); }
      var lvq = el('alives-' + qSeat);
      if (lvq) lvq.textContent = '\u2665'.repeat(Math.max(0, qb2.lives));
      var fg = el('fig-' + qSeat);
      if (fg) {
        var poseKey = fightPose(qb2) + '|' + (qb2.face || 1);
        if (fg.dataset.pose !== poseKey) { fg.dataset.pose = poseKey; var plq = playerOf(v, +qSeat); fg.innerHTML = stickSVG(plq ? plq.color : 'blue', fightPose(qb2), qb2.face); }
      }
    }
    var mlq = el('mylives'); if (mlq && g.blobs[S.seat]) mlq.textContent = '\u2665'.repeat(Math.max(0, g.blobs[S.seat].lives));
    var mdq = el('mydmg'); if (mdq) mdq.textContent = (g.myDmg || 0) + '%';
    arenaFX(v, g);
  }
  if (g.id === 'den-lua-nuoc' && g.chars) {
    for (var cSeat in g.chars) {
      var cc2 = g.chars[cSeat];
      var cn = el('achar-' + cSeat);
      if (cn) {
        moveEl(cn, cc2.x, cc2.y, 'std', cc2.vx, cc2.vy);
        cn.className = 'achar' + (cc2.home ? ' home' : '');
      }
    }
    if (g.gems) syncDyn(g.gems, 'tgem-', 'tgem', function (n, it) { n.className = 'tgem ' + it.el + (it.taken ? ' taken' : ''); if (!n.firstChild) n.innerHTML = '<i></i>'; });
    (g.gates || []).forEach(function (gt2, gi2) { var gn = el('gate-' + gi2); if (gn) gn.className = 'tgate' + (g.gateOpen ? ' open' : ''); });
    var gl2 = el('gemlua'); if (gl2 && g.gemCount) gl2.textContent = g.gemCount.lua;
    var gw2 = el('gemnuoc'); if (gw2 && g.gemCount) gw2.textContent = g.gemCount.nuoc;
    var th2 = el('temphearts'); if (th2) th2.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var glp = el('gemluap'); if (glp && g.gemCount) glp.textContent = g.gemCount.lua;
    var gwp = el('gemnuocp'); if (gwp && g.gemCount) gwp.textContent = g.gemCount.nuoc;
    var thp = el('tempheartsp'); if (thp) thp.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    arenaFX(v, g);
  }
  if (g.id === 'da-bong') {
    if (g.blobs) {
      for (var sSeat in g.blobs) {
        var sbb = g.blobs[sSeat];
        var snn = el('ablob-' + sSeat);
        if (snn) moveEl(snn, sbb.x, sbb.y, 'soc', sbb.vx, sbb.vy);
      }
    }
    var sbl = el('sball');
    if (sbl && g.ball) moveEl(sbl, g.ball.x, g.ball.y, 'soc', g.ball.vx, g.ball.vy);
    var sd9 = el('scoredo'); if (sd9 && g.scoreboard) sd9.textContent = g.scoreboard.do;
    var sx9 = el('scorexanh'); if (sx9 && g.scoreboard) sx9.textContent = g.scoreboard.xanh;
    arenaFX(v, g);
  }
  if (g.id === 'ech-op') {
    if (g.frogs) {
      for (var fSeat in g.frogs) {
        var fb9 = g.frogs[fSeat];
        var fn9 = el('afrog-' + fSeat);
        if (!fn9) continue;
        if (fb9.state === 'in') { fn9.style.display = 'none'; continue; }
        fn9.style.display = '';
        moveEl(fn9, fb9.x, fb9.y, 'std', fb9.vx, fb9.vy);
        var stKey = fb9.state + ':' + (fb9.bellySeat || '');
        if (fn9.dataset.st !== stKey) {
          fn9.dataset.st = stKey;
          fn9.className = 'afrog' + (fb9.state === 'carry' ? ' carry' : '');
          var bp9 = fb9.bellySeat ? playerOf(v, fb9.bellySeat) : null;
          var me9 = playerOf(v, +fSeat);
          fn9.innerHTML = frogSVG(me9 ? me9.color : 'green', bp9 ? bp9.color : null) + '<div class="aname">' + esc(me9 ? me9.name : '') + '</div>';
        }
      }
    }
    if (g.crates) syncDyn(g.crates, 'fcrate-', 'fcrate', null);
    if (g.flies) {
      syncDyn(g.flies, 'ffly-', 'ffly', null);
      for (var flI = 0; flI < g.flies.length; flI++) {
        var flN = el('ffly-' + g.flies[flI].id);
        if (flN) flN.className = 'ffly' + (g.flies[flI].taken ? ' taken' : '');
      }
    }
    var fh9 = el('froghearts'); if (fh9) fh9.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var ff9 = el('frogflies'); if (ff9) ff9.textContent = g.fliesEaten || 0;
    var fc9 = el('frogcham'); if (fc9) fc9.textContent = g.chamber || 1;
    var fhp = el('frogheartsp'); if (fhp) fhp.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var ffp = el('frogfliesp'); if (ffp) ffp.textContent = g.fliesEaten || 0;
    arenaFX(v, g);
  }
  if (g.id === 'can-goc') {
    var shp = el('shellpt');
    if (shp && g.shell) moveEl(shp, g.shell.x, g.shell.y, 'std', g.shell.vx, g.shell.vy);
    var aa9 = el('aimangle'); if (aa9 && g.myCannon) aa9.textContent = g.myCannon.angle;
    var ap9 = el('aimpower'); if (ap9 && g.myCannon) ap9.textContent = g.myCannon.power;
    // Aim visuals patch in place (see the signature note): the
    // angle/power chip and every cannon's barrel follow the live
    // values without a stage rebuild.
    var ai9 = el('aiminfo');
    if (ai9 && g.cannons && g.turn && g.cannons[g.turn]) { var ait = 'Góc ' + g.cannons[g.turn].angle + '° · Lực ' + g.cannons[g.turn].power; if (ai9._t !== ait) { ai9._t = ait; ai9.textContent = ait; } }
    if (g.cannons) for (var cs2 in g.cannons) {
      var cn9 = g.cannons[cs2]; if (!cn9 || !cn9.alive) continue;
      var bl9 = el('barrel-' + cs2); if (!bl9) continue;
      var rd9 = cn9.angle * Math.PI / 180;
      var bx9b = Math.round((cn9.x + 16) * 10 + cn9.face * Math.cos(rd9) * 15);
      var by9b = Math.round((cn9.y + 9) * 10 - 4 - Math.sin(rd9) * 15);
      if (bl9._bx !== bx9b || bl9._by !== by9b) { bl9._bx = bx9b; bl9._by = by9b; bl9.setAttribute('x2', bx9b); bl9.setAttribute('y2', by9b); }
    }
    arenaFX(v, g);
  }
  if ((g.id === 'cuop-sao' || g.id === 'giu-vuong-mien' || g.id === 'son-san') && g.blobs) {
    for (var nSeat in g.blobs) {
      var nb2 = g.blobs[nSeat];
      var nn = el('ablob-' + nSeat);
      if (nn) {
        moveEl(nn, nb2.x, nb2.y, 'std', nb2.vx, nb2.vy);
        if (g.id === 'giu-vuong-mien') nn.className = 'ablob' + (g.crown && g.crown.holder === +nSeat ? ' holder' : '');
      }
    }
    if (g.id === 'cuop-sao') {
      var mb2 = el('mybank'); if (mb2) mb2.textContent = g.mine || 0;
      if (g.banked) for (var bkSeat in g.banked) { var bkn = el('bankn-' + bkSeat); if (bkn) bkn.textContent = g.banked[bkSeat]; }
      if (g.stars) syncDyn(g.stars, 'astar-', 'astar', function (n, it) { n.className = 'astar' + (it.gold ? ' gold' : ''); n.textContent = '\u2605'; });
    }
    if (g.id === 'giu-vuong-mien') {
      var cr2 = el('acrown');
      if (cr2 && g.crown) {
        var cx2 = g.crown.x, cy2 = g.crown.y;
        var cvx = g.crown.vx || 0, cvy = g.crown.vy || 0;
        if (g.crown.holder && g.blobs[g.crown.holder]) { cx2 = g.blobs[g.crown.holder].x; cy2 = g.blobs[g.crown.holder].y; cvx = g.blobs[g.crown.holder].vx || 0; cvy = g.blobs[g.crown.holder].vy || 0; }
        moveEl(cr2, cx2, cy2, 'std', cvx, cvy);
      }
      for (var hSeat in g.hold || {}) { var hn2 = el('holdn-' + hSeat); if (hn2) hn2.textContent = g.hold[hSeat]; }
      var mh2 = el('myhold'); if (mh2) mh2.textContent = g.mine || 0;
    }
    if (g.id === 'son-san' && g.grid) {
      for (var ci2 = 0; ci2 < 180; ci2++) {
        var cell2 = el('scell-' + ci2); if (!cell2) continue;
        var own2 = g.grid[ci2]; var cp2 = own2 ? playerOf(v, own2) : null;
        cell2.style.background = cp2 ? COLORS[cp2.color] : 'rgba(255,255,255,.07)';
      }
      for (var cSeat2 in g.counts || {}) { var sn2 = el('scount-' + cSeat2); if (sn2) sn2.textContent = g.counts[cSeat2]; }
      var mc2 = el('mycells'); if (mc2) mc2.textContent = g.mine || 0;
    }
    arenaFX(v, g);
  }
  if (g.id === 'chung-mot-than' && g.shared) {
    var sb = el('sharedblob');
    if (sb) moveEl(sb, g.shared.x, g.shared.y, 'std', g.shared.vx, g.shared.vy);
    var cs = el('cstar');
    if (cs && g.star) moveEl(cs, g.star.x, g.star.y, 'std', 0, 0);
    if (g.balls) syncDynIdx(g.balls, 'nball-', 'aball');
    var cn2 = el('checkn'); if (cn2) cn2.textContent = g.checks || 0;
    var th = el('teamhearts'); if (th) th.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var thp2 = el('teamheartsp'); if (thp2) thp2.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var cnp = el('checknp'); if (cnp) cnp.textContent = g.checks || 0;
  }
  if (g.id === 'day-hop' && g.blobs) {
    for (var xSeat in g.blobs) {
      var xb = g.blobs[xSeat];
      var xn = el('ablob-' + xSeat);
      if (xn) moveEl(xn, xb.x, xb.y, 'std', xb.vx, xb.vy);
    }
    var crt = el('acrate');
    if (crt && g.crate) moveEl(crt, g.crate.x, g.crate.y, 'std', g.crate.vx, g.crate.vy);
    var dv = el('delivn'); if (dv) dv.textContent = g.deliveries || 0;
    var dvp = el('delivp'); if (dvp) dvp.textContent = g.deliveries || 0;
  }
  if (g.id === 'cheo-thuyen' && g.phase === 'row') {
    var pctR = Math.max(0, Math.min(100, (g.distance || 0) / (g.course || 400) * 100));
    // Every write below is value-guarded: this block runs on every
    // patch (30x/s locally), and unguarded style.left/width writes
    // force a layout pass each time — on software rendering that
    // alone capped this game near 30 fps (weak-profile sweep).
    var rp4 = el('rowprog'); if (rp4 && rp4._w !== pctR) { rp4._w = pctR; rp4.style.width = pctR + '%'; }
    var rd = el('rowdist'); var rdt = Math.round(g.distance || 0); if (rd && rd._t !== rdt) { rd._t = rdt; rd.textContent = rdt; }
    var bt = el('aboat'); var bl5 = 4 + pctR * 0.9; if (bt && bt._l !== bl5) { bt._l = bl5; bt.style.left = bl5 + '%'; }
    var rb2 = el('rowbeat'); var rbt = g.beat || 1; if (rb2 && rb2._t !== rbt) { rb2._t = rbt; rb2.textContent = rbt; }
    for (var rhSeat in g.hits || {}) { var rh = el('rowhit-' + rhSeat); if (rh && rh._t !== g.hits[rhSeat]) { rh._t = g.hits[rhSeat]; rh.textContent = g.hits[rhSeat]; } }
    var ring2 = el('beating');
    if (ring2 && g.nextBeatAt) {
      var toBeat = g.nextBeatAt - t;
      var pr = Math.max(0, Math.min(1, 1 - toBeat / 1000));
      var prB = Math.round(pr * 20) / 20;
      if (ring2._p !== prB) {
        ring2._p = prB;
        ring2.style.opacity = (0.2 + 0.8 * prB).toFixed(2);
        ring2.style.transform = 'scale(' + (0.65 + 0.45 * prB).toFixed(2) + ')';
      }
    }
    var rbtn = el('rowbtn');
    if (rbtn && g.nextBeatAt && g.rowStart != null) {
      var inWin = (g.nextBeatAt - t >= 0 && g.nextBeatAt - t <= 260) || (t - (g.nextBeatAt - 1000) <= 260 && g.nextBeatAt - 1000 >= g.rowStart);
      if (inWin) rbtn.classList.add('now'); else rbtn.classList.remove('now');
    }
    var rhm = el('rowhits'); if (rhm) rhm.textContent = g.mine || 0;
    var rsm = el('rowsplash'); if (rsm) rsm.textContent = g.mySplash || 0;
    var rbm = el('rowbeatm'); if (rbm) rbm.textContent = g.beat || 1;
    var rdm = el('rowdistm'); if (rdm) rdm.textContent = Math.round(g.distance || 0);
    var rpm = el('rowprogm'); if (rpm) rpm.style.width = pctR + '%';
  }
}

function tick() {
  watchdog();
  wsWatchdog();
  if (S.role === 'host' && S.code) engLoad();
  vchkN = (vchkN + 1) % 200; if (vchkN === 0) versionCheck();
  var v = S.view;
  if (!v || !S.role) return;
  var t = serverNow();
  var g = v.game;
  // Stall rescue: during play the server pushes state ~16x/s over
  // this socket. If pushes have been silent for >250 ms the alarm
  // driving the loop has stalled at the platform level — drive the
  // loop from here instead: a 'tick' message makes the server
  // advance and broadcast inside its message handler, which has
  // never shown the alarm path's multi-second stalls. Costs nothing
  // while pushes are healthy (the branch simply never fires).
  if (g && v.phase === 'playing' && S.lastWsAt && Date.now() - S.lastWsAt > 250 && wsOpen() && !wsStale()) {
    try { wsConn.send(JSON.stringify({ action: 'tick' })); } catch (e) {}
  }
  // On-screen meter while playing: real numbers from THIS device —
  // frame rate, socket round trip, push cadence — so a lag report
  // carries data instead of impressions. Click to hide.
  var nmEl = el('netmeter');
  if (v.phase === 'playing' && !S.meterOff) {
    if (!nmEl) {
      nmEl = document.createElement('div'); nmEl.id = 'netmeter'; nmEl.title = 'Số đo trên máy này — bấm để ẩn';
      nmEl.addEventListener('click', function () { S.meterOff = true; nmEl.style.display = 'none'; });
      document.body.appendChild(nmEl);
    }
    if (!S._pingAt || Date.now() - S._pingAt > 2000) {
      S._pingAt = Date.now();
      if (wsOpen()) { try { wsConn.send(JSON.stringify({ action: 'ping', t: Date.now() })); } catch (e) {} }
    }
    if (!S._nmAt || Date.now() - S._nmAt > 500) {
      S._nmAt = Date.now();
      var medM = function (a) { if (!a || !a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; };
      var fpsM = S._fpsAvg ? Math.round(1000 / S._fpsAvg) : null;
      var gapHistM = (S._gapWs && S._gapWs.length >= 6) ? S._gapWs : S._gapH;
      var rttM = medM(S._rttH), gapM = pctOf(gapHistM, 0.9) || medM(gapHistM);
      var hN = 0, hW = 0;
      if (S._hitch) { var cutH = Date.now() - 10000; S._hitch = S._hitch.filter(function (h) { return h.t > cutH; }); hN = S._hitch.length; for (var hi = 0; hi < hN; hi++) if (S._hitch[hi].d > hW) hW = S._hitch[hi].d; }
      if (S.localActive) nmEl.textContent = '⚡ ' + (fpsM ? fpsM + ' fps' : '— fps') + ' · TẠI CHỖ — không qua mạng' + (hN ? ' · khựng ' + hN + ' (nặng nhất ' + hW + 'ms)' : '') + (document.body.classList.contains('lite') ? ' · LITE' : '');
      else nmEl.textContent = '⚡ ' + (fpsM ? fpsM + ' fps' : '— fps') + ' · ping ' + (rttM != null ? rttM + 'ms' : '—') + ' · nhịp ' + (gapM != null ? gapM + 'ms' : '—') + (S._lastSrc ? ' · ' + S._lastSrc : '') + (hN ? ' · khựng ' + hN + ' (nặng nhất ' + hW + 'ms)' : '') + (document.body.classList.contains('lite') ? ' · LITE' : '');
      nmEl.style.display = '';
    }
  } else if (nmEl) nmEl.style.display = 'none';
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
  if (g && g.id === 'do-vui' && g.phase === 'question') {
    var rem = g.endsAt - t;
    if (rem <= 3000 && rem > 0) { var s2 = Math.ceil(rem / 1000); if (s2 !== S.lastTickSec) { S.lastTickSec = s2; beep(1150, 0.045, 'square', 0.09); } }
    else if (rem > 3000) S.lastTickSec = -1;
  }
  patchPositions(v);
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
  if (!('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer:fine)').matches)) h += '<p><button class="btn green" data-cmd="createKb" style="font-size:20px">⌨️ Mở màn hình lớn & chủ phòng chơi bằng bàn phím</button></p>';
  h += '<p class="muted">Màn hình lớn tạo phòng và hiện mã 6 số. Bạn bè mở trang này trên điện thoại, nhập mã là chơi — không cần cài app, không cần tài khoản.</p>';
  h += '</div>';
  h += '<div class="card center" style="margin-top:16px"><h2 style="margin:0 0 8px">📱 Tạo phòng chơi trên điện thoại</h2>';
  h += '<p class="muted" style="margin:4px 0">Không cần TV — mỗi người chơi ngay trên điện thoại của mình. Bạn tạo phòng, ngồi vào một ghế chơi luôn, rồi gửi link mời cho bạn bè.</p>';
  h += '<p><input type="text" id="pmName" maxlength="14" placeholder="Tên của bạn" style="text-align:center"></p>';
  h += '<p><button class="btn green" data-cmd="createPhone" style="font-size:22px">Tạo phòng điện thoại</button></p></div>';
  var rec = npRecents();
  if (rec.length) {
    h += '<div class="card center" style="margin-top:16px"><h3 style="margin:0 0 8px">Phòng gần đây của máy này</h3><p style="margin:0">';
    for (var ri = 0; ri < rec.length; ri++) h += '<button class="chip cool recentchip" data-cmd="recent" data-i="' + ri + '">Vào lại phòng ' + esc(rec[ri].code) + (rec[ri].name ? ' · ' + esc(rec[ri].name) : '') + '</button> ';
    h += '</p></div>';
  }
  h += '<div class="card center" style="margin-top:16px"><h2 style="margin:0 0 8px">Vào bằng điện thoại (tay cầm)</h2>';
  h += '<div class="digits">';
  for (var i = 0; i < 6; i++) h += '<input class="digit" id="d' + i + '" type="tel" maxlength="1" inputmode="numeric">';
  h += '</div>';
  h += '<p><input type="text" id="joinName" maxlength="14" placeholder="Tên của bạn" style="text-align:center"></p>';
  h += '<p id="idNote" class="small" style="display:none;margin:2px 0 0"></p>';
  h += '<p><button class="btn pink" data-cmd="join" style="font-size:22px">Vào phòng</button></p></div>';
  h += '<p class="center muted small" style="margin-top:14px">25 game: Đố Vui Tốc Độ · Đẩy Ra Khỏi Sàn · Né Đạn · Kéo Co · Chia Hay Cướp · Cướp Sao · Giữ Vương Miện · Sơn Sàn · Cao Bồi · Xe Tăng Đấu Trường · Đặt Bom · Kẻ Giả Mạo · Ma Sói · Cờ Cá Ngựa · Tiến Lên Miền Nam · Người Que Đại Chiến · Đá Bóng Đầu To · Đại Bác Căn Góc · Chung Một Thân · Đẩy Hộp Về Đích · Chèo Thuyền · Thủ Thành · Giải Mã Chung · Đền Lửa & Nước · Ếch Ộp Phiêu Lưu — 18 game đấu + 7 game hợp tác! Phòng chứa tới 12 người chơi.</p>';
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
  if (v.phase === 'playing' && v.game) return h + playerGame(v) + kbHintHTML();
  if (v.phase === 'results') return h + resultsHTML(v, false);
  if (v.phase === 'podium') return h + podiumHTML(v, false);
  if (v.phase === 'final') return h + finalHTML(v, false);
  return h + '<div class="card center"><h2>Đang tải…</h2></div>';
}
// Mini live field for the phone player page (see the .pfield CSS
// note): the same static mover elements the host stage builds, so
// the shared patchPositions + rafLoop machinery animates them from
// the player's own view — including prediction of the player's own
// blob. Scenery that patchPositions only touches through guarded
// lookups is omitted; gameplay statics (ring, paint grid, crown,
// shared blob, crate + maze, soccer ball) are mirrored.
var PFIELD_PHASES = { 'day-ra': 'arena', 'ne-dan': 'dodge', 'cuop-sao': 'steal', 'giu-vuong-mien': 'crown', 'son-san': 'splat', 'xe-tank': 'tank', 'dat-bom': 'bomber', 'thu-thanh': 'defend', 'chung-mot-than': 'shared', 'day-hop': 'box', 'nguoi-que': 'fight', 'den-lua-nuoc': 'temple', 'ech-op': 'frog', 'da-bong': 'soccer', 'can-goc': 'shell' };
function pfieldHTML(v, g) {
  if (!g || PFIELD_PHASES[g.id] !== g.phase && !(g.id === 'da-bong' && g.phase === 'goal') && !(g.id === 'ech-op' && g.phase === 'frogClear') && !(g.id === 'can-goc' && g.phase === 'boom')) return '';
  var h = '<div class="afield pfield' + (g.id === 'da-bong' ? ' wide' : '') + '" id="afield">';
  if (g.id === 'day-ra' || g.id === 'ne-dan') h += '<div class="aring dynring" id="aring" style="transform:translate(-50%,-50%) scale(' + ((g.arenaR || 12) * 25 / 300) + ')"></div>';
  else h += '<div class="aring" id="aring"></div>';
  if (g.id === 'son-san' && g.grid) {
    h += '<div class="splatgrid">';
    for (var gi = 0; gi < 180; gi++) { var gs = g.grid[gi]; var gp = gs ? playerOf(v, gs) : null; h += '<div class="scell" id="scell-' + gi + '"' + (gp ? ' style="background:' + COLORS[gp.color] + '"' : '') + '></div>'; }
    h += '</div>';
  }
  if (g.id === 'giu-vuong-mien') h += '<div class="acrown" id="acrown" style="left:50%;top:50%">' + crownSVG(60) + '</div>';
  if (g.id === 'chung-mot-than' && g.star) h += '<div class="astar gold" id="cstar" style="left:' + PX(g.star.x) + '%;top:' + PY(g.star.y) + '%">★</div>';
  if (g.id === 'day-hop') {
    if (g.goal) h += '<div class="agoal" style="' + rectStyle(g.goal) + '">ĐÍCH</div>';
    if (g.walls) for (var wi = 0; wi < g.walls.length; wi++) h += '<div class="awallseg" style="' + rectStyle(g.walls[wi]) + '"></div>';
    h += '<div class="acrate" id="acrate" style="left:50%;top:50%">📦</div>';
  }
  if (g.id === 'da-bong' && g.ball) h += '<div class="sball" id="sball" style="left:' + ((g.ball.x + 19) / 38 * 100) + '%;top:' + ((g.ball.y + 9.6) / 19.2 * 100) + '%"></div>';
  if (g.id === 'chung-mot-than') {
    h += '<div class="ablob" id="sharedblob" style="left:50%;top:50%">' + sharedOrbSVG(v, 66) + '<div class="aname">CẢ ĐỘI</div></div>';
  } else if (g.id !== 'can-goc') {
    for (var i = 0; i < v.players.length; i++) {
      var p = v.players[i];
      if (g.id === 'den-lua-nuoc') { h += '<div class="achar" id="achar-' + p.seat + '" style="left:50%;top:50%">' + orbSVG(p.color, 52) + '<div class="aname">' + esc(p.name) + '</div></div>'; continue; }
      if (g.id === 'ech-op') { h += '<div class="afrog" id="afrog-' + p.seat + '" style="left:50%;top:50%">' + frogSVG(p.color, null) + '<div class="aname">' + esc(p.name) + '</div></div>'; continue; }
      if (g.id === 'nguoi-que') { h += '<div class="ablob" id="ablob-' + p.seat + '" style="left:50%;top:50%;color:' + COLORS[p.color] + '"><span id="fig-' + p.seat + '">' + orbSVG(p.color, 62) + '</span><div class="aname">' + esc(p.name) + '</div><div class="alives" id="alives-' + p.seat + '"></div><div id="dmg-' + p.seat + '"></div></div>'; continue; }
      if (g.id === 'xe-tank' || g.id === 'dat-bom') { h += '<div class="ablob" id="ablob-' + p.seat + '" style="left:50%;top:50%;color:' + COLORS[p.color] + '"><span class="orbwrap">' + orbSVG(p.color, 62) + '<span class="abarrel" id="barrel-' + p.seat + '"></span></span><div class="aname">' + esc(p.name) + '</div><div class="alives" id="alives-' + p.seat + '"></div></div>'; continue; }
      h += '<div class="ablob" id="ablob-' + p.seat + '" style="left:50%;top:50%;color:' + COLORS[p.color] + '">' + orbSVG(p.color, 62) + '<div class="aname">' + esc(p.name) + '</div><div class="alives" id="alives-' + p.seat + '"></div></div>';
    }
  }
  h += '</div>';
  return h;
}
function playerGame(v) {
  var g = v.game;
  var me = playerOf(v, S.seat);
  var h = '<div class="stage pstage g-' + g.id + (isActionGame(g.id) ? ' neon-stage' : '') + '">';
  if (g.phase === 'countdown') { h += '<div class="center baloo" style="font-size:26px">' + esc(g.name) + '</div>' + countdownHTML(g) + '</div>'; return h; }
  h += '<h2>' + esc(g.name) + (g.id === 'ma-soi' ? ' · Đêm ' + (g.night || g.round) : (g.id === 'ca-ngua' || g.id === 'tien-len') ? '' : ' · Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · ×2' : '')) + '</h2>';
  h += pfieldHTML(v, g);
  if (g.id === 'do-vui') {
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
  } else if (g.id === 'day-ra' || g.id === 'ne-dan') {
    var myB = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'arena' || g.phase === 'dodge') {
      if (myB && !myB.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">Mạng của bạn: <span id="mylives" style="color:#FFD7DE">' + (myB ? '❤'.repeat(myB.lives) : '') + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐẨY', 'Lướt') + '</div>';
        h += '<p class="center small">' + (g.id === 'ne-dan' ? 'Giữ D-pad để né đạn · B: lướt nhanh' : 'Giữ D-pad để di chuyển · A: đẩy đối thủ · B: lướt nhanh') + '</p>';
      }
    }
  } else if (g.id === 'cuop-sao' || g.id === 'giu-vuong-mien' || g.id === 'son-san') {
    if (g.phase === 'steal' || g.phase === 'crown' || g.phase === 'splat') {
      if (g.id === 'cuop-sao') {
        h += '<div class="center baloo" style="font-size:22px">Sao của bạn: ★ <span id="mybank">' + (g.mine || 0) + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐẨY', 'Lướt') + '</div>';
        h += '<p class="center small">Bay qua sao là nhặt · A: xô mạnh, đối thủ rơi 1 sao · Sao lớn = 3 sao</p>';
      } else if (g.id === 'giu-vuong-mien') {
        var holderP = g.crown && g.crown.holder ? playerOf(v, g.crown.holder) : null;
        if (g.myCrown) h += '<div class="center baloo" style="font-size:23px;color:#FFC93D">👑 BẠN ĐANG GIỮ VƯƠNG MIỆN!</div>';
        else h += '<div class="center baloo" style="font-size:20px">' + (holderP ? 'Vương miện: ' + esc(holderP.name) + ' đang giữ' : 'Vương miện đang ở giữa sàn!') + '</div>';
        h += '<div class="center baloo" style="font-size:19px">Điểm giữ của bạn: <span id="myhold">' + (g.mine || 0) + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐẨY', 'Lướt') + '</div>';
        h += '<p class="center small">Chạm vào vương miện là đội lên đầu · Giữ càng lâu càng nhiều điểm · A: xô người giữ cho rơi</p>';
      } else {
        h += '<div class="center baloo" style="font-size:22px">Ô của bạn: <span id="mycells">' + (g.mine || 0) + '</span>/180</div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'SƠN', 'Lướt') + '</div>';
        h += '<p class="center small">Chạy qua ô nào sơn ô đó · A: sơn bùng 3×3 (hồi 2 giây) · B: lướt nhanh</p>';
      }
    }
  } else if (g.id === 'cao-boi') {
    if (g.phase === 'wait') {
      if (g.mine === 'foul') h += '<div class="center"><div class="baloo" style="font-size:30px">KẸT SÚNG!</div><p>Bạn bắn trước hiệu lệnh — bị khoá và −100 điểm vòng này. Đợi vòng sau nhé.</p></div>';
      else h += '<button class="tapbtn wait" data-cmd="tap">ĐỢI…<br><span style="font-size:17px">Nghe hiệu lệnh BẮN!</span></button>';
    } else if (g.phase === 'go') {
      if (g.mine === 'fired') h += '<div class="center baloo" style="font-size:30px">ĐÃ BẮN! Đợi kết quả…</div>';
      else h += '<button class="tapbtn go" data-cmd="tap">BẮN!</button>';
    } else if (g.phase === 'roundEnd' && g.lastRound) {
      var e2 = null; for (var qI2 = 0; qI2 < g.lastRound.entries.length; qI2++) if (g.lastRound.entries[qI2].seat === S.seat) e2 = g.lastRound.entries[qI2];
      if (e2) {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, e2.points > 0 ? 'reo' : 'buon', 100) + '</span>';
        h += '<div class="baloo" style="font-size:28px">' + (e2.status === 'fired' ? 'Bạn bắn trong ' + e2.reactionMs + ' ms — nhanh thứ ' + e2.order + '!' : e2.status === 'foul' ? 'Phạm quy! Bắn quá sớm' : 'Bạn chưa bắn') + '</div>';
        h += '<div class="baloo" style="font-size:24px">' + (e2.points > 0 ? '+' : '') + fmt(e2.points) + ' điểm</div></div>';
      }
    }
  } else if (g.id === 'keo-co') {
    var myTeam = S.seat % 2 === 1 ? 'A' : 'B';
    if (g.phase === 'pull') {
      h += '<div class="center baloo" style="font-size:24px">BẠN Ở ĐỘI ' + myTeam + ' — BẤM NÚT B LIÊN TỤC!</div>';
      var kpct2 = Math.max(3, Math.min(97, 50 + (g.knot / 112) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" id="tugknot" style="left:' + kpct2 + '%"></div></div>';
      h += '<div class="center baloo" style="font-size:21px">Bạn đã kéo: <span id="mypull">' + (g.presses ? (g.presses[S.seat] || 0) : 0) + '</span> lần</div>';
      h += '<div class="padwrap">' + discHTML()
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
  } else if (g.id === 'chung-mot-than') {
    if (g.phase === 'shared') {
      var arrowOf = { u: '▲', r: '▶', d: '▼', l: '◀' };
      h += '<div class="center baloo" style="font-size:21px">⭐ Đội: <span id="checknp">' + (g.checks || 0) + '</span> điểm · Tim: <span id="teamheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span></div>';
      h += '<div class="mydirs">Bạn giữ:';
      var md = g.myDirs || [];
      for (var dI4 = 0; dI4 < md.length; dI4++) h += '<span class="dirarrow">' + arrowOf[md[dI4]] + '</span>';
      h += '</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'Đẩy', 'Lướt') + '</div>';
      h += '<p class="center small">Cả đội lái CHUNG một quả bóng — chỉ hướng của bạn mới chạy theo tay bạn. Phối hợp đưa bóng chạm sao ⭐, né đạn!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - 60000) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'day-hop') {
    if (g.phase === 'box') {
      h += '<div class="center baloo" style="font-size:22px">📦 Đội đã giao: <span id="delivp">' + (g.deliveries || 0) + '</span> hộp</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'Đẩy', 'Lướt') + '</div>';
      h += '<p class="center small">Cùng một đồng đội áp sát hộp và đẩy cùng một hướng — một người đẩy hộp không đi đâu cả!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'cheo-thuyen') {
    if (g.phase === 'row') {
      h += '<div class="center baloo" style="font-size:22px">Nhịp <span id="rowbeatm">' + (g.beat || 1) + '</span>/' + (g.beats || 45) + ' · Thuyền đã đi <span id="rowdistm">' + Math.round(g.distance || 0) + '</span>/' + (g.course || 400) + ' m</div>';
      h += '<div class="racebar"><i id="rowprogm" style="background:#38BDF8;width:0%"></i><b>Về đích 🏁</b></div>';
      h += '<button class="tapbtn rowbtn" id="rowbtn" data-cmd="tap">CHÈO!<br><span style="font-size:17px">Bấm khi nút cháy VÀNG = đúng nhịp</span></button>';
      h += '<div class="center baloo" style="font-size:20px">Bạn trúng nhịp: <span id="rowhits">' + (g.mine || 0) + '</span> · Trượt (tạt nước): <span id="rowsplash">' + (g.mySplash || 0) + '</span></div>';
      h += '<div class="tbar"><i data-start="' + g.rowStart + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'xe-tank' || g.id === 'dat-bom' || g.id === 'thu-thanh') {
    var myB2 = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'tank' || g.phase === 'bomber' || g.phase === 'defend') {
      if (myB2 && !myB2.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        if (g.id === 'thu-thanh') h += '<div class="center baloo" style="font-size:20px">💎 Pha lê: <span id="crystalhp2">' + (g.crystal ? g.crystal.hp : 10) + '</span>/10 · Đã hạ: <span id="killn2">' + (g.kills || 0) + '</span> slime</div>';
        else h += '<div class="center baloo" style="font-size:20px">Mạng của bạn: <span id="mylives" style="color:#FFD7DE">' + (myB2 ? '❤'.repeat(myB2.lives) : '') + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, (g.id === 'dat-bom' ? 'ĐẶT BOM' : 'BẮN'), 'Lướt') + '</div>';
        h += '<p class="center small">' + (g.id === 'xe-tank' ? 'Nòng súng hướng theo hướng di chuyển cuối · A: bắn (hồi 1 giây) · Núp sau thùng chắn' : g.id === 'dat-bom' ? 'A: đặt bom (mỗi người 1 quả một lúc) · Bom nổ sau 2 giây theo hình chữ thập — đặt xong chạy ngay!' : 'Bắn slime trước khi chúng chạm vào pha lê · Nòng súng hướng theo hướng di chuyển cuối') + '</p>';
      }
    }
  } else if (g.id === 'ke-gia-mao') {
    if (g.phase === 'answer') {
      h += '<div class="center"><span class="chip cool">Chủ đề: ' + esc(g.category || '') + '</span></div>';
      h += '<div class="baloo" style="font-size:22px">' + esc(g.myQuestion || '') + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a2 = 0; a2 < 4; a2++) h += '<button class="opt" data-cmd="answer" data-i="' + a2 + '">' + LETTERS[a2] + '. ' + esc(g.options[a2]) + '</button>';
        h += '</div>';
        h += '<p class="center small">Trả lời bí mật — đừng đọc to câu hỏi hay đáp án của bạn!</p>';
      } else {
        h += '<div class="center baloo" style="font-size:26px">Đã trả lời! Đợi mọi người…</div>';
      }
    } else if (g.phase === 'discuss') {
      h += '<div class="baloo" style="font-size:22px">Bàn luận: ai đang giả vờ?</div>';
      if (g.chatLog) for (var pI6 = 0; pI6 < g.chatLog.length; pI6++) { var pp6 = playerOf(v, g.chatLog[pI6].seat); h += '<div class="chatrow">' + blobSVG(pp6 ? pp6.color : 'blue', 'cuoi', 24) + ' <b>' + esc(pp6 ? pp6.name : '') + ':</b> ' + esc(g.chatLog[pI6].text) + '</div>'; }
      h += '<p class="center"><input type="text" id="chatText" maxlength="60" placeholder="Nói gì đó…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="chatSend">Gửi</button></p>';
      h += '<p class="center small">Đừng lộ đáp án của bạn — kẻ giả mạo đang nghe đấy!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'vote') {
      if (g.myVote == null) {
        h += '<div class="baloo" style="font-size:23px">Bạn tố cáo ai là kẻ giả mạo?</div>';
        h += '<div class="optgrid">';
        for (var vI3 = 0; vI3 < v.players.length; vI3++) { var vp4 = v.players[vI3]; if (vp4.seat === S.seat) continue; h += '<button class="opt" data-cmd="vote" data-i="' + vp4.seat + '">' + esc(vp4.name) + '</button>'; }
        h += '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:26px">Đã tố cáo! Đợi công bố…</div>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      var rv2 = g.reveal; var iAmImp = rv2.impostor === S.seat;
      var iWon = (rv2.caught && !iAmImp) || (!rv2.caught && iAmImp);
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, iWon ? 'reo' : 'buon', 100) + '</span>';
      h += '<div class="baloo" style="font-size:27px">' + (rv2.caught ? 'Bắt được kẻ giả mạo!' : 'Kẻ giả mạo đã thoát!') + '</div>';
      var impP = playerOf(v, rv2.impostor);
      h += '<p>Kẻ giả mạo: <b>' + esc(impP ? impP.name : '') + '</b>' + (iAmImp ? ' — chính là BẠN!' : '') + '</p>';
      h += '<div class="baloo" style="font-size:24px">+' + fmt(rv2.points[S.seat] || 0) + ' điểm</div></div>';
    }
  } else if (g.id === 'giai-ma-chung') {
    if (g.phase === 'decode' || g.phase === 'levelup') {
      h += '<div class="center baloo" style="font-size:21px">Màn ' + (g.level || 1) + ' · Tim đội: <span style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span> · Đã qua ' + (g.levelsDone || 0) + ' màn</div>';
      h += '<div class="center baloo" style="font-size:20px">Tiến độ màn này: ' + (g.done || 0) + '/' + (g.total || 0) + ' bước</div>';
      if (g.phase === 'levelup') h += '<div class="center baloo" style="font-size:26px">QUA MÀN! 🎉</div>';
      h += '<div class="center"><b>Phần mật mã của bạn:</b><br>';
      var ms = g.mySteps || [];
      if (!ms.length) h += '<span class="mystep">Màn này bạn không giữ bước nào — cổ vũ đồng đội nhé!</span>';
      for (var sI6 = 0; sI6 < ms.length; sI6++) h += '<span class="mystep">Bước ' + ms[sI6].pos + ': <span style="color:' + SYMCOLORS[ms[sI6].sym] + '">' + ms[sI6].name + '</span></span>';
      h += '</div>';
      h += '<div class="symgrid">';
      for (var yI = 0; yI < 4; yI++) h += '<button class="symbtn" data-cmd="symbol" data-i="' + yI + '" style="background:' + SYMCOLORS[yI] + '">' + SYMNAMES[yI] + '</button>';
      h += '</div>';
      h += '<p class="center small">Chỉ bấm khi tới lượt bước của bạn và đúng ký hiệu của bước đó — bấm sai cả đội mất 1 tim!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'nguoi-que') {
    var myF = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'fight') {
      if (myF && !myF.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">Mạng: <span id="mylives" style="color:#FFD7DE">' + (myF ? '♥'.repeat(Math.max(0, myF.lives)) : '') + '</span> · Sát thương: <span id="mydmg">' + (g.myDmg || 0) + '%</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐÁNH', 'LƯỚT') + '</div>';
        h += '<p class="center small">▲ hoặc Y: nhảy (nhấn 2 lần = nhảy đôi) · A: đánh — đối thủ % càng cao càng văng xa · X: ĐÁNH MẠNH (+16%, văng xa gấp rưỡi, hồi chiêu lâu hơn) · B: lướt · Bị đánh văng khỏi sàn thì về điểm hồi sinh trên bục cao.</p>';
        h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 90000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      }
    }
  } else if (g.id === 'den-lua-nuoc') {
    var myC = g.chars ? g.chars[S.seat] : null;
    if (g.phase === 'temple') {
      h += '<div class="center baloo" style="font-size:21px">Bạn là: ' + (g.myEl === 'lua' ? '🔥 LỬA' : '💧 NƯỚC') + '</div>';
      h += '<div class="center baloo" style="font-size:19px">Tim đội: <span id="tempheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span> · 🔥 <span id="gemluap">' + (g.gemCount ? g.gemCount.lua : 0) + '</span>/5 · 💧 <span id="gemnuocp">' + (g.gemCount ? g.gemCount.nuoc : 0) + '</span>/5</div>';
      if (g.myHome) h += '<div class="center baloo" style="font-size:24px">🏠 Bạn đã về nhà! Đợi đồng đội…</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'NHẢY', '—') + '</div>';
      h += '<p class="center small">' + (g.myEl === 'lua' ? 'Bạn là LỬA: hồ đỏ an toàn, hồ xanh dương chết, hồ xanh lá chết! Chỉ bạn nhặt được ngọc đỏ.' : 'Bạn là NƯỚC: hồ xanh dương an toàn, hồ đỏ chết, hồ xanh lá chết! Chỉ bạn nhặt được ngọc xanh.') + ' Đứng lên nút vàng để mở cổng cho đồng đội. A hoặc Y: nhảy.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 150000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'ma-soi') {
    var roleName = WOLF_ROLE_NAMES[g.myRole] || '';
    h += '<div class="center"><span class="chip ' + (g.myRole === 'soi' ? 'hot' : 'cool') + '" style="font-size:17px">Vai của bạn: ' + roleName + '</span></div>';
    if (!g.myAlive) {
      h += '<div class="center"><div class="ko-big">💀</div><div class="baloo" style="font-size:26px">Bạn đã chết — theo dõi tiếp nhé!</div><p>Xem mọi người bàn luận và bỏ phiếu trên TV. Vai của bạn sẽ được công bố khi game kết thúc.</p></div>';
    } else if (g.phase === 'night') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.myRole === 'soi') {
        h += '<div class="center baloo" style="font-size:21px">🐺 Bầy sói: ' + (g.wolfTeam || []).map(function (s2) { var wp2 = playerOf(v, s2); return esc(wp2 ? wp2.name : ''); }).join(', ') + '</div>';
        if (g.myWolfVote == null) {
          h += '<div class="baloo" style="font-size:21px">Chọn con mồi đêm nay:</div><div class="optgrid">';
          for (var wv = 0; wv < v.players.length; wv++) { var wvp = v.players[wv]; if (wvp.seat === S.seat || (g.aliveMap && !g.aliveMap[wvp.seat])) continue; var isMate = (g.wolfTeam || []).indexOf(wvp.seat) >= 0; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfVote" data-i="' + wvp.seat + '">' + esc(wvp.name) + (isMate ? ' 🐺 (đồng đội)' : '') + '</button>'; }
          h += '</div>';
        } else {
          var vt = playerOf(v, g.myWolfVote);
          h += '<div class="center baloo" style="font-size:23px">Đã chọn con mồi: ' + esc(vt ? vt.name : '') + '<br><span style="font-size:18px">Phiếu sói đã vào: ' + (g.wolfVotesIn || 0) + '/' + (g.wolfTeam || []).length + '</span></div>';
        }
      } else if (g.myRole === 'bao-ve') {
        if (g.myGuardPick == null) {
          h += '<div class="baloo" style="font-size:21px">Đêm nay bạn bảo vệ ai? (được bảo vệ chính mình; không trùng người đêm qua)</div><div class="optgrid">';
          for (var gv = 0; gv < v.players.length; gv++) { var gvp = v.players[gv]; if (g.aliveMap && !g.aliveMap[gvp.seat]) continue; var wasLast = g.myGuardLast === gvp.seat; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfGuard" data-i="' + gvp.seat + '"' + (wasLast ? ' disabled style="opacity:.45"' : '') + '>' + esc(gvp.name) + (gvp.seat === S.seat ? ' (bạn)' : '') + (wasLast ? ' · đêm qua đã bảo vệ' : '') + '</button>'; }
          h += '</div>';
        } else { var gp6 = playerOf(v, g.myGuardPick); h += '<div class="center baloo" style="font-size:23px">🛡️ Đang bảo vệ: ' + esc(gp6 ? gp6.name : '') + '</div>'; }
      } else if (g.myRole === 'tien-tri') {
        if (g.mySeerPick == null) {
          h += '<div class="baloo" style="font-size:21px">Đêm nay bạn soi ai?</div><div class="optgrid">';
          for (var sv2 = 0; sv2 < v.players.length; sv2++) { var svp = v.players[sv2]; if (svp.seat === S.seat || (g.aliveMap && !g.aliveMap[svp.seat])) continue; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfSeer" data-i="' + svp.seat + '">' + esc(svp.name) + '</button>'; }
          h += '</div>';
        } else { var sp7 = playerOf(v, g.mySeerPick); var seenWolf = (g.mySeerNotes || []).some(function (n2) { return n2.seat === g.mySeerPick && n2.wolf; }); h += '<div class="center baloo" style="font-size:23px">🔮 ' + esc(sp7 ? sp7.name : '') + (seenWolf ? ' LÀ SÓI! 🐺' : ' là dân lành ✅') + '</div>'; }
        if (g.mySeerNotes && g.mySeerNotes.length) {
          h += '<div class="rows"><div class="baloo" style="font-size:19px">📖 Sổ tay tiên tri (chỉ mình bạn thấy):</div>';
          for (var sn = 0; sn < g.mySeerNotes.length; sn++) { var np4 = playerOf(v, g.mySeerNotes[sn].seat); h += '<div class="rrow">' + blobSVG(np4 ? np4.color : 'blue', 'cuoi', 28) + ' ' + esc(np4 ? np4.name : '') + '<span class="pts">' + (g.mySeerNotes[sn].wolf ? '🐺 SÓI' : '✅ dân') + '</span></div>'; }
          h += '</div>';
        }
      } else if (g.myRole === 'phu-thuy') {
        if (g.myWitchDone) {
          h += '<div class="center baloo" style="font-size:23px">🧙 Đã quyết định xong — đi ngủ thôi!</div>';
        } else if (!g.wolvesIn) {
          h += '<div class="center baloo" style="font-size:22px">🧙 Đợi bầy sói chọn xong con mồi…</div><p class="center">Thuốc của bạn: 🧪 cứu ×' + (g.mySaveLeft || 0) + ' · ☠️ độc ×' + (g.myPoisonLeft || 0) + '</p>';
        } else {
          var vic = g.myVictim ? playerOf(v, g.myVictim) : null;
          h += '<div class="center baloo" style="font-size:22px">Con mồi của sói đêm nay: ' + (vic ? esc(vic.name) : '—') + (g.myVictim === S.seat ? ' (CHÍNH LÀ BẠN!)' : '') + '</div>';
          if (g.mySaveLeft > 0) h += '<p class="center"><button class="btn ' + (g.myWitchSave ? 'green' : 'ghost') + '" data-cmd="witchSave">' + (g.myWitchSave ? '🧪 ĐÃ CHỌN CỨU — bấm để huỷ' : '🧪 Dùng thuốc cứu người này') + '</button></p>';
          else h += '<p class="center muted">Thuốc cứu đã dùng hết.</p>';
          if (g.myPoisonLeft > 0) {
            h += '<div class="baloo" style="font-size:20px">☠️ Đầu độc ai? ' + (g.myWitchPoison ? '(đang chọn: ' + esc((playerOf(v, g.myWitchPoison) || {}).name || '') + ')' : '(chưa chọn)') + '</div><div class="optgrid">';
            for (var pv2 = 0; pv2 < v.players.length; pv2++) { var pvp = v.players[pv2]; if (pvp.seat === S.seat || (g.aliveMap && !g.aliveMap[pvp.seat])) continue; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfPoison" data-i="' + pvp.seat + '">' + esc(pvp.name) + '</button>'; }
            h += '</div>';
            if (g.myWitchPoison) h += '<p class="center"><button class="btn small ghost" data-cmd="witchPoisonClear">Bỏ chọn đầu độc</button></p>';
          } else h += '<p class="center muted">Thuốc độc đã dùng hết.</p>';
          h += '<p class="center"><button class="btn pink" data-cmd="witchDone" style="font-size:21px">Xác nhận — đi ngủ</button></p>';
        }
      } else {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, 'ngu', 100) + '</span><div class="baloo" style="font-size:24px">Bạn là dân làng — ngủ ngon nhé…</div><p>Đợi trời sáng trên TV.</p></div>';
      }
    } else if (g.phase === 'dawn') {
      if (g.dawnDeaths && g.dawnDeaths.length) {
        h += '<div class="center baloo" style="font-size:24px">☀️ Đêm qua làng mất: ' + g.dawnDeaths.map(function (d3) { var dp6 = playerOf(v, d3.seat); return esc(dp6 ? dp6.name : ''); }).join(', ') + '</div>';
      } else h += '<div class="center baloo" style="font-size:24px">☀️ Đêm qua bình yên — không ai ra đi!</div>';
    } else if (g.phase === 'discuss') {
      h += '<div class="baloo" style="font-size:21px">Bàn luận: ai là sói?</div>';
      if (g.chatLog) for (var pI7 = 0; pI7 < g.chatLog.length; pI7++) { var pp7 = playerOf(v, g.chatLog[pI7].seat); h += '<div class="chatrow">' + blobSVG(pp7 ? pp7.color : 'blue', 'cuoi', 24) + ' <b>' + esc(pp7 ? pp7.name : '') + ':</b> ' + esc(g.chatLog[pI7].text) + '</div>'; }
      h += '<p class="center"><input type="text" id="chatText" maxlength="60" placeholder="Nói gì đó…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="chatSend">Gửi</button></p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'vote') {
      if (g.voted && g.voted[S.seat]) {
        h += '<div class="center baloo" style="font-size:25px">Đã bỏ phiếu! Đợi kết quả…</div>';
      } else {
        h += '<div class="baloo" style="font-size:22px">Treo cổ ai? Chọn một người bạn nghi là sói:</div><div class="optgrid">';
        for (var vv = 0; vv < v.players.length; vv++) { var vvp = v.players[vv]; if (vvp.seat === S.seat || (g.aliveMap && !g.aliveMap[vvp.seat])) continue; h += '<button class="opt" data-cmd="vote" data-i="' + vvp.seat + '">' + esc(vvp.name) + '</button>'; }
        h += '</div>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'execute') {
      if (g.exec && g.exec.seat) { var ep3 = playerOf(v, g.exec.seat); h += '<div class="center baloo" style="font-size:25px">⚖️ ' + esc(ep3 ? ep3.name : '') + ' bị treo cổ — là ' + (WOLF_ROLE_NAMES[g.exec.role] || '') + '</div>'; }
      else h += '<div class="center baloo" style="font-size:24px">⚖️ Hôm nay không ai bị treo cổ.</div>';
    } else if (g.phase === 'wolfEnd') {
      var iWon2 = (g.winner === 'soi') === (g.myRole === 'soi');
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, iWon2 ? 'reo' : 'buon', 100) + '</span>';
      h += '<div class="baloo" style="font-size:27px">' + (g.winner === 'soi' ? '🐺 Bầy sói thắng!' : '🎉 Dân làng thắng!') + '</div>';
      h += '<p>Bạn là ' + roleName + ' · +' + fmt(g.points[S.seat] || 0) + ' điểm</p>';
      if (g.roles) { h += '<div class="rows">'; for (var wr2 = 0; wr2 < v.players.length; wr2++) { var wrp = v.players[wr2]; h += '<div class="rrow">' + blobSVG(wrp.color, wrp.mood, 30) + ' ' + esc(wrp.name) + '<span class="chip ' + (g.roles[wrp.seat] === 'soi' ? 'hot' : 'cool') + '">' + (WOLF_ROLE_NAMES[g.roles[wrp.seat]] || '') + '</span></div>'; } h += '</div>'; }
      h += '</div>';
    }
  } else if (g.id === 'ca-ngua') {
    var myHs = g.horses ? (g.horses[S.seat] || []) : [];
    var turnP2 = g.turn ? playerOf(v, g.turn) : null;
    if (g.phase === 'ngWin') {
      var winP2 = g.winner ? playerOf(v, g.winner) : null;
      h += '<div class="center"><div class="baloo" style="font-size:27px">🏆 ' + esc(winP2 ? winP2.name : '') + ' thắng!</div><p>Bạn về hạng theo tiến độ — xem bảng điểm trên TV nhé.</p></div>';
    } else if (g.myTurn && g.phase === 'roll') {
      h += '<div class="center baloo" style="font-size:25px">🎲 LƯỢT CỦA BẠN!</div>';
      h += '<p class="center"><button class="btn pink" data-cmd="roll" style="font-size:26px;padding:18px 34px">THẢY XÚC XẮC</button></p>';
      h += '<p class="center small">Thảy 6 để xuất chuồng và được thảy tiếp · Ba lần 6 liên tiếp là mất lượt!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.myTurn && g.phase === 'pick') {
      h += '<div class="center baloo" style="font-size:24px">Bạn thảy được: <span class="diceface">' + DICE_FACES[g.dice] + '</span> ' + g.dice + ' chấm</div>';
      if (g.myLegal && g.myLegal.length) {
        h += '<div class="baloo" style="font-size:21px">Chọn ngựa để đi:</div><div class="optgrid">';
        for (var ml = 0; ml < g.myLegal.length; ml++) { var mle = g.myLegal[ml]; h += '<button class="opt" data-cmd="move" data-i="' + mle.horse + '">🐴 Ngựa ' + (mle.horse + 1) + '<br><span style="font-size:16px">' + esc(mle.hint) + '</span></button>'; }
        h += '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:22px">Không có nước đi nào — đợi qua lượt…</div>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else {
      h += '<div class="center baloo" style="font-size:22px">Lượt của ' + esc(turnP2 ? turnP2.name : '') + (g.dice ? ' · vừa thảy ' + DICE_FACES[g.dice] : '') + '</div>';
      h += '<div class="rows">';
      for (var mh = 0; mh < myHs.length; mh++) h += '<div class="rrow">🐴 Ngựa ' + (mh + 1) + '<span class="muted">' + (myHs[mh] === 0 ? 'đang trong chuồng' : myHs[mh] === 58 ? 'ĐÃ VỀ ĐÍCH 🏆' : myHs[mh] >= 52 ? 'đường về chuồng ' + (myHs[mh] - 51) + '/6' : 'ô ' + myHs[mh] + '/51') + '</span></div>';
      h += '</div>';
      h += '<p class="center">Xem bàn cờ trên TV nhé!</p>';
    }
  } else if (g.id === 'tien-len') {
    if (!S.tlSel) S.tlSel = [];
    var hand9 = g.myHand || [];
    var hsig = hand9.join(',');
    if (S.tlSig !== hsig) { S.tlSig = hsig; S.tlSel = []; }
    var turnP9 = g.turn ? playerOf(v, g.turn) : null;
    if (g.phase === 'tlWin') {
      var winP9 = g.winner ? playerOf(v, g.winner) : null;
      h += '<div class="center"><div class="baloo" style="font-size:27px">🏆 ' + esc(winP9 ? winP9.name : '') + ' thắng!</div>'
        + (g.instantWin ? '<p class="baloo" style="font-size:20px;color:#FFC93D">⚡ TỚI TRẮNG — ' + (TL_IW_NAMES[g.instantWin.kind] || '') + '!</p>' : '')
        + (g.myRank ? '<p>Bạn về hạng ' + g.myRank + ' · +' + fmt(g.points[S.seat] || 0) + ' điểm</p>' : '')
        + '<p>Xem bảng điểm trên TV nhé.</p></div>';
    } else if (g.phase === 'cards') {
      if (g.table) {
        var tabP9 = playerOf(v, g.table.seat);
        h += '<div class="center baloo" style="font-size:18px">Trên bàn — ' + esc(tabP9 ? tabP9.name : '') + ' · ' + (TL_KIND_NAMES[g.table.kind] || '') + '</div>';
        h += '<div class="tlchips">' + tlChipsHTML(g.table.cards, true) + '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:18px">🃏 Bàn trống</div>';
      }
      if (g.myRank) {
        h += '<div class="center baloo" style="font-size:24px">🏆 Bạn đã hết bài — về hạng ' + g.myRank + '!</div><p class="center">Xem mọi người đánh tiếp trên TV nhé…</p>';
      } else {
        if (g.myTurn) {
          h += '<div class="center baloo" style="font-size:22px">' + (g.table ? '⚔️ LƯỢT CỦA BẠN — chọn bài để CHẶN!' : '👑 LƯỢT CỦA BẠN — bạn cầm cái, chọn bài để đánh!') + '</div>';
          if (g.mustInclude3) h += '<p class="center"><span class="chip hot">Lượt đầu tiên của trận: bộ bạn đánh phải có lá 3♠!</span></p>';
        } else if (g.myPassed) {
          h += '<div class="center baloo" style="font-size:20px">✋ Bạn đã bỏ lượt vòng này — đợi vòng mới…</div>';
        } else {
          h += '<div class="center baloo" style="font-size:20px">Lượt của ' + esc(turnP9 ? turnP9.name : '') + ' — chuẩn bị bài của bạn…</div>';
        }
        h += tlHandHTML(hand9, S.tlSel, 'tl');
        h += tlBtnsHTML(g, S.tlSel, 'tl');
        h += '<p class="center small">Chạm vào lá bài để chọn / bỏ chọn — lá được chọn sẽ nhô lên. Bộ không hợp lệ sẽ bị báo lỗi và lựa chọn của bạn vẫn được giữ nguyên.</p>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var sI9 = 0; sI9 < v.players.length; sI9++) { var sp9 = v.players[sI9]; h += '<span class="scorechip">' + blobSVG(sp9.color, sp9.mood, 24) + ' ' + esc(sp9.name) + ' · 🂠 × ' + (g.counts ? (g.counts[sp9.seat] || 0) : 0) + ((g.finished || []).indexOf(sp9.seat) >= 0 ? ' 🏆' : '') + '</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'da-bong') {
    var sbp = g.scoreboard || { do: 0, xanh: 0 };
    h += '<div class="center baloo" style="font-size:21px">Bạn: ' + (g.myTeam === 'do' ? '🔴 ĐỘI ĐỎ' : '🔵 ĐỘI XANH') + ' · Đỏ ' + sbp.do + ' — ' + sbp.xanh + ' Xanh</div>';
    if (g.phase === 'goal') {
      h += '<div class="center baloo" style="font-size:30px">⚽ GÔÔÔL! ' + (g.goalInfo && g.goalInfo.team === 'do' ? '🔴' : '🔵') + '</div><p class="center">Đá lại từ giữa sân sau vài giây…</p>';
    } else if (g.phase === 'soccer') {
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'SÚT', 'LƯỚT') + '</div>';
      h += '<p class="center small">Chạy theo bóng, đến gần thì A = SÚT về phía bạn đang quay mặt (giữ ▲ khi bấm A = sút bổng, ▼ = sút sệt) · ▲/Y = nhảy đánh đầu · B = lướt.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 90000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'ech-op') {
    h += '<div class="center baloo" style="font-size:20px">Màn ' + (g.chamber || 1) + '/' + (g.chambersTotal || 3) + ' · Tim đội: <span id="frogheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span> · 🪰 <span id="frogfliesp">' + (g.fliesEaten || 0) + '</span>/' + (g.fliesTotal || 9) + '</div>';
    if (g.phase === 'frogClear') {
      h += '<div class="center baloo" style="font-size:27px">🎉 QUA MÀN! Chuẩn bị…</div>';
    } else if (g.myState === 'in') {
      var carrierP = g.myCarrierSeat ? playerOf(v, g.myCarrierSeat) : null;
      h += '<div class="center"><div class="baloo" style="font-size:25px">🫃 Bạn đang trong bụng ' + esc(carrierP ? carrierP.name : '') + '!</div><p>Đồng đội đang vác bạn qua đoạn khó — thả bạn ra ở bờ an toàn ngay thôi.</p></div>';
    } else {
      if (g.myState === 'carry') {
        var pasP = g.myPassengerSeat ? playerOf(v, g.myPassengerSeat) : null;
        h += '<div class="center baloo" style="font-size:22px">🫃 Đang vác ' + esc(pasP ? pasP.name : '') + ' trong bụng — bạn nhảy cao và xa hơn hẳn! Bấm B/X để nhả bạn ra.</div>';
      } else if (g.myDoor) {
        h += '<div class="center baloo" style="font-size:23px">🚪 Bạn đã vào cửa! Đợi cả đội…</div>';
      }
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'NHẢY', 'NUỐT / NHẢ') + '</div>';
      h += '<p class="center small">Đứng cạnh đồng đội rồi bấm B/X: NUỐT bạn vào bụng (nhả ra cũng B/X). Ếch đang vác bạn nhảy qua được hàng gai dài mà một mình nhảy không tới. A/Y = nhảy.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 120000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'can-goc') {
    var mc = g.myCannon;
    if (!mc || !mc.alive) {
      h += '<div class="center"><div class="ko-big">💥</div><div class="baloo" style="font-size:26px">Pháo của bạn đã bị phá huỷ!</div><p>Xem mọi người căn góc trên TV, đợi kết quả nhé…</p></div>';
    } else if (g.phase === 'aim' && g.myTurn) {
      h += '<div class="center baloo" style="font-size:24px">🎯 LƯỢT CỦA BẠN! 🌬️ Gió: ' + (!g.wind ? 'không gió' : (g.wind > 0 ? '→ ' + g.wind : '← ' + (-g.wind))) + '</div>';
      h += '<div class="center baloo" style="font-size:27px">Góc: <span id="aimangle">' + mc.angle + '</span>° · Lực: <span id="aimpower">' + mc.power + '</span> · Hướng: ' + (mc.face > 0 ? '▶' : '◀') + '</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'BẮN', '') + '</div>';
      h += '<p class="center small">Giữ ▲▼ để chỉnh GÓC · giữ ◀▶ để chỉnh LỰC · X = đổi hướng nòng · A = BẮN! Đạn bay theo vòng cung và bị gió đẩy — căn cho khéo.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else {
      var turnP4 = g.turn ? playerOf(v, g.turn) : null;
      h += '<div class="center baloo" style="font-size:23px">' + (g.phase === 'shell' || g.phase === 'boom' ? '💥 Đạn đang bay… / Vừa nổ!' : 'Lượt của ' + esc(turnP4 ? turnP4.name : '') + ' — đợi tới lượt bạn') + '</div>';
      h += '<p class="center">Pháo của bạn: ❤️ ' + mc.hp + '/100 · Xem địa hình và gió trên TV để tính trước phát bắn của mình.</p>';
    }
  }
  return h + '</div>';
}
// ---------------------------------------------------------------------
// Device identity + recent rooms (phone mode convenience). The web
// remembers WHO this device is (np_identity: the name it last played
// under) so the join form is prefilled and friends recognize each
// other by name + seat colour with zero accounts; np_recent keeps up
// to 5 rooms this device created or joined (with the session token —
// this device's own credential, the same thing sessionStorage already
// holds) so rejoining is one tap.
// ---------------------------------------------------------------------
function npIdentity() {
  try { var o = JSON.parse(localStorage.getItem('np_identity') || 'null'); if (o && typeof o.name === 'string' && o.name) return o; } catch (e) {}
  return null;
}
function npSaveIdentity(name) {
  if (!name) return;
  try { localStorage.setItem('np_identity', JSON.stringify({ name: name })); } catch (e) {}
}
function npRecents() {
  try { var a = JSON.parse(localStorage.getItem('np_recent') || '[]'); if (Array.isArray(a)) return a.filter(function (r) { return r && r.code && r.token; }); } catch (e) {}
  return [];
}
function npSaveRecent(entry) {
  try {
    var a = npRecents().filter(function (r) { return !(r.code === entry.code && r.role === entry.role); });
    entry.at = Date.now();
    a.unshift(entry);
    localStorage.setItem('np_recent', JSON.stringify(a.slice(0, 5)));
  } catch (e) {}
}
function npDropRecent(code) {
  try { localStorage.setItem('np_recent', JSON.stringify(npRecents().filter(function (r) { return r.code !== code; }))); } catch (e) {}
}
// The host's own seat number in this view, or null. The hostSeat flag
// rides the players list (additive view field), so every client can
// find it; only the host page acts on it.
function mySeatOf(v) {
  if (!v || !v.players) return null;
  for (var i = 0; i < v.players.length; i++) if (v.players[i].hostSeat) return v.players[i].seat;
  return null;
}
// Home-screen defaults, applied right after homeHTML() paints: the
// remembered name fills both name inputs, a code= in the URL fills the
// join digits (friends tap the invite link and land one tap from the
// room — no auto-join without that tap), and the recognition note
// shows when this device is already known.
function fillHomeDefaults() {
  var idn = npIdentity();
  var jn = el('joinName'); if (jn && idn && !jn.value) jn.value = idn.name;
  var pm = el('pmName'); if (pm && idn && !pm.value) pm.value = idn.name;
  var note = el('idNote');
  if (note && idn) { note.textContent = 'Máy này đã nhớ bạn là ' + idn.name + ' 👋'; note.style.display = ''; }
  var qs = location.search || ''; var qi = qs.indexOf('code=');
  if (qi >= 0) {
    var cd = qs.slice(qi + 5, qi + 11); var cdOk = cd.length === 6;
    for (var ci = 0; ci < cd.length; ci++) if ('0123456789'.indexOf(cd.charAt(ci)) < 0) cdOk = false;
    if (cdOk) { for (var i = 0; i < 6; i++) { var d = el('d' + i); if (d) d.value = cd.charAt(i); } }
  }
}
function saveSession() {
  try { sessionStorage.setItem('np_session', JSON.stringify({ role: S.role, code: S.code, token: S.token, seat: S.seat, phoneMode: S.phoneMode ? true : undefined })); } catch (e) {}
}
function clearSession() {
  wsDrop();
  try { sessionStorage.removeItem('np_session'); } catch (e) {}
  S.role = null; S.code = null; S.token = null; S.seat = null; S.view = null; S.sig = ''; S.phoneMode = false; render();
}
// A room created seconds ago may briefly be invisible to a phone whose
// request lands somewhere the fresh room has not reached yet, and the
// join then answers "room not found". Retry ONLY that error every 2s
// for ~20s before bothering the user; every other error (room playing,
// room full, name problems) surfaces immediately.
var JOIN_RETRY_MS = 2000, JOIN_RETRY_MAX = 10;
function tryJoin(code, name, attempt) {
  api('/api/rooms/' + code + '/join', { name: name }, function (v) {
    if (v && v.ok) { S.role = 'player'; S.code = code; S.token = v.playerToken; S.seat = v.seat; npSaveIdentity(name); npSaveRecent({ code: code, role: 'player', name: name, token: v.playerToken, seat: v.seat }); noteOk(); saveSession(); S.sig = ''; poll(); return; }
    var err = v && v.error ? v.error : '';
    if (err.indexOf('Không thấy phòng này') >= 0 && attempt < JOIN_RETRY_MAX) {
      toast('Đang tìm phòng…');
      setTimeout(function () { tryJoin(code, name, attempt + 1); }, JOIN_RETRY_MS);
      return;
    }
    toast(err || 'Không vào được phòng.');
  });
}
// ---------------------------------------------------------------------
// Input dispatch. A mouse click is atomic, but a real finger press is
// not: 'click' only fires on release, and only if the touch did not
// drift, scroll, or straddle a re-render — rapid mashing on a phone
// lost presses exactly that way ("bấm phím không ăn"). Gameplay
// commands therefore fire on pointerdown (finger contact), with a
// per-signature guard that swallows the synthetic click trailing each
// press exactly once. Non-gameplay commands (lobby, settings,
// navigation) keep the plain click path, as do clicks with no press
// before them (keyboard / assistive tech).
// ---------------------------------------------------------------------
var GAME_CMDS = { tap: 1, answer: 1, choose: 1, vote: 1, symbol: 1, roll: 1, move: 1, wolfPick: 1, witchSave: 1, witchDone: 1, witchPoisonClear: 1, tlCard: 1, tlPlay: 1, tlPass: 1, tlClear: 1, myAnswer: 1, myVote: 1, myWolf: 1, myWitchSave: 1, myWitchDone: 1, myWitchClear: 1, myRoll: 1, myMove: 1, mySymbol: 1, myChoose: 1, myTlCard: 1, myTlPlay: 1, myTlPass: 1, myTlClear: 1 };
var cmdGuard = {};
function findCmdNode(node) {
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-cmd')) return node; node = node.parentNode; }
  return null;
}
function findPadNode(node) {
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-pad')) return node; node = node.parentNode; }
  return null;
}
function cmdSig(node, cmd) {
  return cmd + '|' + (node.getAttribute('data-i') || '') + '|' + (node.getAttribute('data-k') || '') + '|' + (node.getAttribute('data-c') || '');
}
function markCmdGuard(node, cmd) {
  var s = cmdSig(node, cmd); var r = cmdGuard[s]; var t = Date.now();
  if (!r || t - r.at > 700) cmdGuard[s] = { n: 1, at: t };
  else { r.n += 1; r.at = t; }
}
function pressFx(node) {
  if (!node || !node.classList) return;
  node.classList.add('pressed');
  setTimeout(function () { node.classList.remove('pressed'); }, 220);
}
function clearPadFx() {
  var pb = document.querySelectorAll('.dbtn.pressed, .abtn.pressed');
  for (var i = 0; i < pb.length; i++) pb[i].classList.remove('pressed');
}
function runCmd(node) {
  var cmd = node.getAttribute('data-cmd');
  if (cmd === 'create') {
    api('/api/rooms', {}, function (v) {
      if (v && v.ok) { S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; S.phoneMode = false; S.hostKb = false; npSaveRecent({ code: v.code, role: 'host', name: '', token: v.hostToken, seat: null }); noteOk(); saveSession(); S.sig = ''; poll(); }
      else toast(v && v.error ? v.error : 'Không tạo được phòng.');
    });
  } else if (cmd === 'createKb') {
    // Same big-screen create, plus the host sits down at a keyboard
    // seat the moment the lobby lands (hostKbAutoSeat, on poll).
    api('/api/rooms', {}, function (v) {
      if (v && v.ok) { S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; S.phoneMode = false; S.hostKb = true; npSaveRecent({ code: v.code, role: 'host', name: '', token: v.hostToken, seat: null }); noteOk(); saveSession(); S.sig = ''; poll(); }
      else toast(v && v.error ? v.error : 'Không tạo được phòng.');
    });
  } else if (cmd === 'createPhone') {
    // Phone mode: create the room AND sit the creator down in it —
    // one flow, landing in the lobby with the seat taken and the
    // invite link on screen. The name comes from the card's input
    // (prefilled from the remembered identity); the server defaults
    // it to 'Chủ phòng' when empty.
    var pmEl = el('pmName'); var pmName = pmEl ? pmEl.value.trim() : '';
    api('/api/rooms', {}, function (v) {
      if (!(v && v.ok)) { toast(v && v.error ? v.error : 'Không tạo được phòng.'); return; }
      S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; S.phoneMode = true;
      api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'hostJoin', name: pmName }, function (v2) {
        if (v2 && v2.ok) { S.view = v2; noteServerTime(v2.serverNow); }
        else if (v2 && v2.error) toast(v2.error);
        if (pmName) npSaveIdentity(pmName);
        npSaveRecent({ code: S.code, role: 'host', name: pmName, token: S.token, seat: null, phone: true });
        noteOk(); saveSession(); S.sig = ''; poll(); render();
      });
    });
  } else if (cmd === 'recent') {
    // One-tap rejoin from the home screen: probe the saved session —
    // adopt it when the room still exists, drop the chip when it is
    // gone (same not-found feedback the poll path uses).
    var rc = npRecents()[+node.getAttribute('data-i')];
    if (!rc) return;
    api('/api/rooms/' + rc.code + '/state?role=' + rc.role + '&token=' + encodeURIComponent(rc.token), null, function (v) {
      if (v && v.ok) {
        S.role = rc.role; S.code = rc.code; S.token = rc.token; S.seat = rc.seat || null; S.phoneMode = !!rc.phone;
        S.view = v; noteServerTime(v.serverNow); noteOk(); saveSession(); S.sig = ''; poll(); render();
      } else if (v && v.error && !v.net && v.error.indexOf('Không thấy phòng này') >= 0) {
        npDropRecent(rc.code);
        toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.');
        S.sig = ''; render();
      } else toast(v && v.error ? v.error : 'Không vào lại được phòng.');
    });
  } else if (cmd === 'copyLink') {
    var liEl = el('shareLink');
    if (liEl) {
      var linkUrl = liEl.value;
      var copied = function () { toast('Đã sao chép link mời! Gửi cho bạn bè nhé.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkUrl).then(copied, function () { liEl.focus(); liEl.select(); toast('Link đã được bôi đen — sao chép rồi gửi cho bạn bè nhé.'); });
      } else { liEl.focus(); liEl.select(); toast('Link đã được bôi đen — sao chép rồi gửi cho bạn bè nhé.'); }
    }
  } else if (cmd === 'hostJoinBtn') {
    var idn2 = npIdentity();
    act({ action: 'hostJoin', name: idn2 ? idn2.name : '' });
  } else if (cmd === 'hostLeave') {
    act({ action: 'hostLeave' });
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
  } else if (cmd === 'hostPlayKb') {
    sfxTap();
    act({ action: 'addLocal', seat: +node.getAttribute('data-seat') });
  } else if (cmd === 'hostPhone') {
    sfxTap();
    S.phoneHelp = true; S.sig = ''; render();
  } else if (cmd === 'addBot' || cmd === 'removeBot' || cmd === 'cycleBot' || cmd === 'addLocal' || cmd === 'cycleScheme') {
    act({ action: cmd, seat: +node.getAttribute('data-seat') });
  } else if (cmd === 'start') {
    sfxTap();
    act({ action: 'startGame', game: node.getAttribute('data-game') });
  } else if (cmd === 'quickStart') {
    sfxTap();
    act({ action: 'quickStart', game: node.getAttribute('data-game') });
  } else if (cmd === 'startLocked') {
    var lgm = gameMeta(S.view, node.getAttribute('data-game'));
    if (lgm && S.view) toast(lgm.name + ' chơi được với ' + lgm.min + '–' + lgm.max + ' người — phòng đang có ' + S.view.players.length + ' người. Thêm/xoá Máy hoặc rủ thêm bạn nhé.');
  } else if (cmd === 'quitGame') {
    sfxTap();
    act({ action: 'quitToChoosing' });
  } else if (cmd === 'plStop') {
    sfxTap();
    act({ action: 'playlistStop' });
  } else if (cmd === 'plMode') {
    S.plMode = !S.plMode;
    if (!S.plMode) S.plQueue = [];
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plToggle') {
    var pgid = node.getAttribute('data-game');
    var pgm = gameMeta(S.view, pgid);
    var pqi = S.plQueue.indexOf(pgid);
    if (pqi >= 0) S.plQueue.splice(pqi, 1);
    else {
      if (pgm && S.view && seatLocked(pgm, S.view.players.length)) { toast(pgm.name + ' chơi được với ' + pgm.min + '–' + pgm.max + ' người — phòng đang có ' + S.view.players.length + ' người.'); return; }
      S.plQueue.push(pgid);
    }
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plRandom') {
    var pool = [];
    for (var rpi = 0; rpi < S.view.games.length; rpi++) { var rgm = S.view.games[rpi]; if (!seatLocked(rgm, S.view.players.length)) pool.push(rgm.id); }
    var picked = [];
    while (picked.length < 5 && pool.length) { var rix = Math.floor(Math.random() * pool.length); picked.push(pool.splice(rix, 1)[0]); }
    S.plQueue = picked;
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plAll') {
    S.plQueue = [];
    for (var api2 = 0; api2 < S.view.games.length; api2++) { var agm = S.view.games[api2]; if (!seatLocked(agm, S.view.players.length)) S.plQueue.push(agm.id); }
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plStart') {
    if (S.plQueue.length < 2) { toast('Chọn ít nhất 2 game cho liên hoàn nhé.'); return; }
    var pq = S.plQueue.slice();
    S.plQueue = []; S.plMode = false;
    sfxTap();
    act({ action: 'playlistStart', games: pq });
  } else if (cmd === 'continue' || cmd === 'replay' || cmd === 'toChoosing' || cmd === 'finish' || cmd === 'playAgain') {
    sfxTap();
    act({ action: cmd });
  } else if (cmd === 'tap') {
    sfxTap();
    act({ action: 'tap' });
  } else if (cmd === 'answer') {
    sfxTap();
    act({ action: 'answer', choice: +node.getAttribute('data-i') });
  } else if (cmd === 'roll') {
    sfxTap();
    act({ action: 'roll' });
  } else if (cmd === 'move') {
    sfxTap();
    act({ action: 'move', horse: +node.getAttribute('data-i') });
  } else if (cmd === 'tlCard') {
    sfxTap();
    if (!S.tlSel) S.tlSel = [];
    var tcid = +node.getAttribute('data-i');
    var tix = S.tlSel.indexOf(tcid);
    if (tix >= 0) S.tlSel.splice(tix, 1); else S.tlSel.push(tcid);
    S.sig = ''; render();
  } else if (cmd === 'tlPlay') {
    if (!S.tlSel || !S.tlSel.length) { toast('Chọn ít nhất một lá bài trước đã.'); return; }
    sfxTap();
    tlSend({ action: 'play', cards: S.tlSel.slice() });
  } else if (cmd === 'tlPass') {
    sfxTap();
    tlSend({ action: 'pass' });
  } else if (cmd === 'tlClear') {
    S.tlSel = [];
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'myAnswer' || cmd === 'myVote' || cmd === 'myWolf' || cmd === 'myWitchSave' || cmd === 'myWitchDone' || cmd === 'myWitchClear'
    || cmd === 'myRoll' || cmd === 'myMove' || cmd === 'mySymbol' || cmd === 'myChoose' || cmd === 'myChatSend'
    || cmd === 'myTlCard' || cmd === 'myTlPlay' || cmd === 'myTlPass' || cmd === 'myTlClear') {
    // My-seat commands (phone mode): all sends ride the forSeat relay
    // via localAct, which stamps host credentials + forSeat and never
    // clears the session on a rules error.
    var mySeat = mySeatOf(S.view);
    if (mySeat == null) return;
    sfxTap();
    if (cmd === 'myAnswer') localAct(mySeat, { action: 'answer', choice: +node.getAttribute('data-i') });
    else if (cmd === 'myVote') localAct(mySeat, { action: 'vote', seat: +node.getAttribute('data-i') });
    else if (cmd === 'myWolf') {
      var mk = node.getAttribute('data-kind');
      var mi = +node.getAttribute('data-i');
      if (mk === 'wolfPoison') localAct(mySeat, { action: 'wolfWitch', poison: mi });
      else localAct(mySeat, { action: mk, seat: mi });
    }
    else if (cmd === 'myWitchSave') {
      var msv = S.view && S.view.myView ? !!S.view.myView.myWitchSave : false;
      localAct(mySeat, { action: 'wolfWitch', save: !msv });
    }
    else if (cmd === 'myWitchClear') localAct(mySeat, { action: 'wolfWitch', poison: null });
    else if (cmd === 'myWitchDone') localAct(mySeat, { action: 'wolfWitch', done: true });
    else if (cmd === 'myRoll') localAct(mySeat, { action: 'roll' });
    else if (cmd === 'myMove') localAct(mySeat, { action: 'move', horse: +node.getAttribute('data-i') });
    else if (cmd === 'mySymbol') { var msy = +node.getAttribute('data-i'); beep(320 + msy * 130, 0.1, 'triangle', 0.14); localAct(mySeat, { action: 'symbol', sym: msy }); }
    else if (cmd === 'myChoose') localAct(mySeat, { action: 'choose', choice: node.getAttribute('data-c') });
    else if (cmd === 'myChatSend') {
      var mct = el('myChatText'); var mtxt = mct ? mct.value.trim() : '';
      if (!mtxt) { toast('Nhập lời nhắn trước đã.'); return; }
      if (mct) mct.value = '';
      localAct(mySeat, { action: 'chat', text: mtxt });
    }
    else if (cmd === 'myTlCard') {
      if (!S.myTlSel) S.myTlSel = [];
      var mtc = +node.getAttribute('data-i');
      var mtx = S.myTlSel.indexOf(mtc);
      if (mtx >= 0) S.myTlSel.splice(mtx, 1); else S.myTlSel.push(mtc);
      S.mySeatSig = ''; S.sig = ''; render();
    }
    else if (cmd === 'myTlPlay') {
      if (!S.myTlSel || !S.myTlSel.length) { toast('Chọn ít nhất một lá bài trước đã.'); return; }
      localAct(mySeat, { action: 'play', cards: S.myTlSel.slice() });
    }
    else if (cmd === 'myTlPass') localAct(mySeat, { action: 'pass' });
    else if (cmd === 'myTlClear') { S.myTlSel = []; S.mySeatSig = ''; S.sig = ''; render(); }
  } else if (cmd === 'wolfPick') {
    sfxTap();
    var wk = node.getAttribute('data-kind');
    var wi = +node.getAttribute('data-i');
    if (wk === 'wolfPoison') act({ action: 'wolfWitch', poison: wi });
    else act({ action: wk, seat: wi });
  } else if (cmd === 'witchSave') {
    sfxTap();
    var wsv = S.view && S.view.game ? !!S.view.game.myWitchSave : false;
    act({ action: 'wolfWitch', save: !wsv });
  } else if (cmd === 'witchPoisonClear') {
    sfxTap();
    act({ action: 'wolfWitch', poison: null });
  } else if (cmd === 'witchDone') {
    sfxTap();
    act({ action: 'wolfWitch', done: true });
  } else if (cmd === 'choose') {
    sfxTap();
    act({ action: 'choose', choice: node.getAttribute('data-c') });
  } else if (cmd === 'vote') {
    sfxTap();
    act({ action: 'vote', seat: +node.getAttribute('data-i') });
  } else if (cmd === 'symbol') {
    var sy = +node.getAttribute('data-i');
    beep(320 + sy * 130, 0.1, 'triangle', 0.14);
    act({ action: 'symbol', sym: sy });
  } else if (cmd === 'chatSend') {
    var ct = el('chatText'); var txt = ct ? ct.value.trim() : '';
    if (!txt) { toast('Nhập lời nhắn trước đã.'); return; }
    if (ct) ct.value = '';
    act({ action: 'chat', text: txt });
  }
}
document.addEventListener('click', function (ev) {
  var node = findCmdNode(ev.target);
  if (!node) return;
  var cmd = node.getAttribute('data-cmd');
  if (GAME_CMDS[cmd]) {
    // This click is the synthetic tail of a press that already fired on
    // pointerdown: swallow it once per recorded press.
    var s = cmdSig(node, cmd); var r = cmdGuard[s];
    if (r && r.n > 0 && Date.now() - r.at < 700) { r.n -= 1; return; }
  }
  runCmd(node);
});
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.classList && t.classList.contains('digit') && t.value.length >= 1) {
    var idx = +t.id.slice(1);
    var next = el('d' + (idx + 1));
    if (next) next.focus();
    else if (idx === 5) {
      // Last digit in and the name is already filled (it is
      // remembered between visits): join right away, no extra tap.
      var jn2 = el('joinName');
      if (jn2 && jn2.value.trim()) { var jb = document.querySelector('[data-cmd="join"]'); if (jb) jb.click(); }
    }
  }
});
// Per-game action-button sets for the phone gamepad (mirrors the
// Android controller's table): games not listed here get exactly the
// classic A/B pair; listed games add X/Y (or swap B out) with their
// own labels. nguoi-que uses a diamond layout (Y top, X left, A
// right, B bottom, like a console pad); den-lua-nuoc a plain row.
var PAD_SPEC = {
  'nguoi-que': { layout: 'diamond', btns: { a: 'ĐÁNH', b: 'LƯỚT', x: 'ĐÁNH MẠNH', y: 'NHẢY' } },
  'den-lua-nuoc': { layout: 'row', order: ['y', 'a'], btns: { a: 'NHẢY', y: 'NHẢY' } },
  'da-bong': { layout: 'row', order: ['y', 'b', 'a'], btns: { y: 'NHẢY', b: 'LƯỚT', a: 'SÚT' } },
  'ech-op': { layout: 'row', order: ['y', 'a', 'b'], btns: { y: 'NHẢY', a: 'NHẢY', b: 'NUỐT / NHẢ' } },
  'can-goc': { layout: 'row', order: ['x', 'a'], btns: { x: 'HƯỚNG', a: 'BẮN' } }
};
function abtnsHTML(gid, aLabel, bLabel) {
  var spec = PAD_SPEC[gid];
  if (!spec) return '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>' + bLabel + '</span></button><button class="abtn abtnA" data-pad="a">A<span>' + aLabel + '</span></button></div>';
  if (spec.layout === 'diamond') {
    return '<div class="abtns dia">'
      + '<span></span><button class="abtn ybtn" data-pad="y">Y<span>' + spec.btns.y + '</span></button><span></span>'
      + '<button class="abtn xbtn" data-pad="x">X<span>' + spec.btns.x + '</span></button><span></span><button class="abtn abtnA" data-pad="a">A<span>' + spec.btns.a + '</span></button>'
      + '<span></span><button class="abtn bbtn" data-pad="b">B<span>' + spec.btns.b + '</span></button><span></span></div>';
  }
  var h = '<div class="abtns">';
  for (var i = 0; i < spec.order.length; i++) {
    var k = spec.order[i];
    h += '<button class="abtn ' + (k === 'a' ? 'abtnA' : k === 'x' ? 'xbtn' : k === 'y' ? 'ybtn' : 'bbtn') + '" data-pad="' + k + '">' + k.toUpperCase() + '<span>' + spec.btns[k] + '</span></button>';
  }
  return h + '</div>';
}
// The circular direction disc that replaces the 3x3 D-pad grid: one
// round target; the thumb's offset from centre picks the directions
// (axis thresholds, so sliding diagonally gives a real diagonal) and
// the active segments light up through data-u/d/l/r attributes.
function discHTML() {
  return '<div class="disc" data-disc="1" data-u="0" data-d="0" data-l="0" data-r="0"><svg viewBox="0 0 100 100">'
    + '<path class="seg seg-u" d="M50 50 L16.8 16.8 A47 47 0 0 1 83.2 16.8 Z"/>'
    + '<path class="seg seg-r" d="M50 50 L83.2 16.8 A47 47 0 0 1 83.2 83.2 Z"/>'
    + '<path class="seg seg-d" d="M50 50 L83.2 83.2 A47 47 0 0 1 16.8 83.2 Z"/>'
    + '<path class="seg seg-l" d="M50 50 L16.8 83.2 A47 47 0 0 1 16.8 16.8 Z"/>'
    + '<polygon class="segarr arr-u" points="50,13 42.5,25 57.5,25"/>'
    + '<polygon class="segarr arr-r" points="87,50 75,42.5 75,57.5"/>'
    + '<polygon class="segarr arr-d" points="50,87 42.5,75 57.5,75"/>'
    + '<polygon class="segarr arr-l" points="13,50 25,42.5 25,57.5"/>'
    + '<circle class="hub" cx="50" cy="50" r="14"/>'
    + '</svg></div>';
}
function findDiscNode(node) {
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-disc')) return node; node = node.parentNode; }
  return null;
}
S.discPointers = {};
function discBits(node, cx, cy) {
  var r = node.getBoundingClientRect();
  var R = r.width / 2; if (!R) return '';
  var dx = cx - (r.left + R), dy = cy - (r.top + R);
  if (Math.sqrt(dx * dx + dy * dy) <= R * 0.18) return '';
  var th = R * 0.25, bits = '';
  if (dx > th) bits += 'r'; else if (dx < -th) bits += 'l';
  if (dy > th) bits += 'd'; else if (dy < -th) bits += 'u';
  return bits;
}
// A disc pointer drives up to two pad bits at once; each bit rides
// the ordinary padSet machinery under its own synthetic pointer id
// ("<pid>:<bit>"), so the multi-touch bookkeeping (padPointers holds
// exactly one bit per id) and the stuck-release recovery keep working
// unchanged, and other fingers on A/B/X/Y stay fully independent.
function discApply(pid, bits) {
  var rec = S.discPointers[pid]; if (!rec) return;
  if (rec.bits === bits) return;
  var old = rec.bits; rec.bits = bits;
  var dirs = ['u', 'd', 'l', 'r'];
  for (var i = 0; i < dirs.length; i++) {
    var b = dirs[i], was = old.indexOf(b) >= 0, is = bits.indexOf(b) >= 0;
    if (is && !was) padSet(b, true, pid + ':' + b);
    else if (was && !is) padSet(b, false, pid + ':' + b);
  }
}
function discDown(pid, node, cx, cy) {
  S.discPointers[pid] = { node: node, bits: '' };
  discApply(pid, discBits(node, cx, cy));
  paintDiscs();
}
function discUp(pid) {
  if (!S.discPointers[pid]) return;
  discApply(pid, '');
  delete S.discPointers[pid];
  paintDiscs();
}
function paintDiscs() {
  var ds = document.querySelectorAll('.disc');
  for (var i = 0; i < ds.length; i++) {
    ds[i].setAttribute('data-u', S.padState.u ? '1' : '0');
    ds[i].setAttribute('data-d', S.padState.d ? '1' : '0');
    ds[i].setAttribute('data-l', S.padState.l ? '1' : '0');
    ds[i].setAttribute('data-r', S.padState.r ? '1' : '0');
  }
}
S.padState = { u: false, d: false, l: false, r: false, a: false, b: false, x: false, y: false };
S.padPointers = {};
function sendPad() {
  if (!S.code || S.role !== 'player') return;
  paintDiscs();
  // The live channel carries pad snapshots with no HTTP round trip per
  // press; the HTTP send (tiny-ack path) remains the exact fallback
  // whenever the socket is down, stale (SMOOTH5), or a send throws.
  if (wsOpen() && !wsStale()) {
    try { wsConn.send(JSON.stringify({ action: 'pad', pad: S.padState })); return; } catch (e) {}
  }
  api('/api/rooms/' + S.code + '/action', { role: 'player', token: S.token, action: 'pad', pad: S.padState }, function () {});
}
function padBitHeld(bit) {
  for (var k in S.padPointers) if (S.padPointers[k] === bit) return true;
  return false;
}
function padSet(bit, val, pid) {
  if (val) {
    if (S.padPointers[pid] === bit) return;
    var wasHeld = !!S.padState[bit];
    S.padPointers[pid] = bit;
    if (wasHeld) {
      // The bit already reads as held, but not by THIS pointer: the
      // earlier holder's release never arrived (its button was rebuilt
      // mid-touch) or a second finger joined on the same button. Cycle
      // the bit so this press produces a fresh rising edge on the
      // server instead of being swallowed by the stuck state.
      S.padState[bit] = false; sendPad();
    }
    S.padState[bit] = true; sendPad();
  } else {
    delete S.padPointers[pid];
    if (S.padState[bit] && !padBitHeld(bit)) { S.padState[bit] = false; sendPad(); }
  }
}
function padPressFx(bit) {
  // Kéo Co no longer re-renders for my own press count (player
  // signature), so the on-screen counter is bumped locally on contact.
  if (bit === 'b' && S.view && S.view.game && S.view.game.id === 'keo-co' && S.view.game.phase === 'pull') {
    var mp = el('mypull'); if (mp) mp.textContent = (+mp.textContent || 0) + 1;
  }
}
document.addEventListener('pointerdown', function (ev) {
  var discNode = findDiscNode(ev.target);
  if (discNode) {
    ev.preventDefault();
    discDown(ev.pointerId, discNode, ev.clientX, ev.clientY);
    return;
  }
  var padNode = findPadNode(ev.target);
  if (padNode) {
    ev.preventDefault();
    pressFx(padNode);
    padSet(padNode.getAttribute('data-pad'), true, ev.pointerId);
    padPressFx(padNode.getAttribute('data-pad'));
    return;
  }
  var node = findCmdNode(ev.target);
  if (node && GAME_CMDS[node.getAttribute('data-cmd')]) {
    ev.preventDefault();
    pressFx(node);
    vibrate(10);
    markCmdGuard(node, node.getAttribute('data-cmd'));
    runCmd(node);
  }
});
document.addEventListener('pointermove', function (ev) {
  var rec = S.discPointers[ev.pointerId];
  if (rec) discApply(ev.pointerId, discBits(rec.node, ev.clientX, ev.clientY));
});
function padRelease(ev) {
  discUp(ev.pointerId);
  var bit = S.padPointers[ev.pointerId];
  if (bit) padSet(bit, false, ev.pointerId);
  clearPadFx();
}
document.addEventListener('pointerup', padRelease);
document.addEventListener('pointercancel', padRelease);
window.addEventListener('blur', function () {
  S.padPointers = {};
  S.discPointers = {};
  var changed = false;
  for (var k in S.padState) if (S.padState[k]) { S.padState[k] = false; changed = true; }
  if (changed) sendPad();
  paintDiscs();
});
// Fallbacks for engines without Pointer Events (older browsers and
// in-app webviews such as Zalo/Facebook): without these, the gamepad
// would be completely dead there and gameplay buttons would fall back
// to fragile clicks. Registered ONLY when Pointer Events are missing,
// so the two input stacks can never double-fire; the cmdGuard above
// additionally swallows any emulated click that still gets through.
if (!window.PointerEvent) {
  document.addEventListener('touchstart', function (ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var t = ev.changedTouches[i];
      var discNode = findDiscNode(t.target);
      if (discNode) {
        ev.preventDefault();
        discDown('t' + t.identifier, discNode, t.clientX, t.clientY);
        continue;
      }
      var padNode = findPadNode(t.target);
      if (padNode) {
        ev.preventDefault();
        pressFx(padNode);
        padSet(padNode.getAttribute('data-pad'), true, 't' + t.identifier);
        padPressFx(padNode.getAttribute('data-pad'));
        continue;
      }
      var node = findCmdNode(t.target);
      if (node && GAME_CMDS[node.getAttribute('data-cmd')]) {
        ev.preventDefault();
        pressFx(node);
        vibrate(10);
        markCmdGuard(node, node.getAttribute('data-cmd'));
        runCmd(node);
      }
    }
  }, { passive: false });
  document.addEventListener('touchmove', function (ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var t = ev.changedTouches[i];
      var rec = S.discPointers['t' + t.identifier];
      if (rec) { ev.preventDefault(); discApply('t' + t.identifier, discBits(rec.node, t.clientX, t.clientY)); }
    }
  }, { passive: false });
  function touchEnd(ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var pid = 't' + ev.changedTouches[i].identifier;
      discUp(pid);
      var bit = S.padPointers[pid];
      if (bit) padSet(bit, false, pid);
    }
    clearPadFx();
  }
  document.addEventListener('touchend', touchEnd);
  document.addEventListener('touchcancel', touchEnd);
  document.addEventListener('mousedown', function (ev) {
    var discNode = findDiscNode(ev.target);
    if (discNode) {
      ev.preventDefault();
      discDown('mouse', discNode, ev.clientX, ev.clientY);
      return;
    }
    var padNode = findPadNode(ev.target);
    if (padNode) {
      pressFx(padNode);
      padSet(padNode.getAttribute('data-pad'), true, 'mouse');
      padPressFx(padNode.getAttribute('data-pad'));
      return;
    }
    var node = findCmdNode(ev.target);
    if (node && GAME_CMDS[node.getAttribute('data-cmd')]) {
      pressFx(node);
      markCmdGuard(node, node.getAttribute('data-cmd'));
      runCmd(node);
    }
  });
  document.addEventListener('mousemove', function (ev) {
    var rec = S.discPointers.mouse;
    if (rec) discApply('mouse', discBits(rec.node, ev.clientX, ev.clientY));
  });
  document.addEventListener('mouseup', function () {
    discUp('mouse');
    if (S.padPointers.mouse) padSet(S.padPointers.mouse, false, 'mouse');
    clearPadFx();
  });
}
// ---------------------------------------------------------------------
// Player-page keyboard (role 'player', this device's own keyboard):
// a player alone on their own computer needs NO configuration — the
// WASD set and the arrow set are both live at once (schemes 0 and 1
// in LK_SCHEMES below share no key codes), and the merged result
// drives the player's own seat through the ordinary pad machinery.
// Merge design: the keyboard is one more input source riding padSet
// under the synthetic pointer id 'kb:<bit>', exactly like each disc
// direction does, so the sent pad state is the OR of the touch
// claims and the keyboard claims — releasing a key never clears a
// bit a finger still holds, and lifting a finger never clears a bit
// a key still holds. Two physical keys can map to one bit (KeyW and
// ArrowUp are both 'u'); KB_DOWN tracks keys, and a bit only counts
// as keyboard-held while at least one of its keys is down. The
// page's own blur handler (registered with the touch stack) already
// zeroes padState + padPointers; this engine additionally forgets
// which keys were down so a later keyup cannot resurrect a bit.
// Discrete presses reuse the exact payloads the on-screen buttons
// send through act() (see runCmd: answer / symbol / tap / roll),
// including their answer-once gating on the view's mine field.
// The host page is untouched — the multi-seat engine below owns it.
// ---------------------------------------------------------------------
var KB_MAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyF: 'a', Comma: 'a', KeyG: 'b', Period: 'b', KeyQ: 'x', KeyM: 'x', KeyE: 'y', Slash: 'y' };
var KB_BITS = ['u', 'd', 'l', 'r', 'a', 'b', 'x', 'y'];
var KB_DOWN = {};
function pkActive() {
  var v = S.view;
  return S.role === 'player' && !!v && v.phase === 'playing' && !!v.game;
}
function kbBitHeld(bit) {
  for (var c in KB_DOWN) if (KB_DOWN[c] === bit) return true;
  return false;
}
function kbSync(bit) {
  var on = kbBitHeld(bit);
  var claimed = S.padPointers['kb:' + bit] === bit;
  if (on !== claimed) padSet(bit, on, 'kb:' + bit);
}
function pkTranslate(bit) {
  var v = S.view; var g = v && v.game; if (!g) return;
  var ci = bit === 'a' ? 0 : bit === 'b' ? 1 : bit === 'x' ? 2 : bit === 'y' ? 3 : -1;
  if (ci < 0) return;
  if (g.id === 'do-vui' && g.phase === 'question') { if (g.mine == null) { sfxTap(); act({ action: 'answer', choice: ci }); } }
  else if (g.id === 'ke-gia-mao' && g.phase === 'answer') { if (g.mine == null) { sfxTap(); act({ action: 'answer', choice: ci }); } }
  else if (g.id === 'giai-ma-chung') { beep(320 + ci * 130, 0.1, 'triangle', 0.14); act({ action: 'symbol', sym: ci }); }
  else if (g.id === 'cao-boi') { if (bit === 'a') { sfxTap(); act({ action: 'tap' }); } }
  else if (g.id === 'cheo-thuyen' && g.phase === 'row') { if (bit === 'a') { sfxTap(); act({ action: 'tap' }); } }
  else if (g.id === 'ca-ngua' && g.phase === 'roll') { if (bit === 'a' && g.myTurn) { sfxTap(); act({ action: 'roll' }); } }
}
window.addEventListener('keydown', function (ev) {
  if (!pkActive()) return;
  var t = ev.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  var bit = KB_MAP[ev.code]; if (!bit) return;
  ev.preventDefault();
  var was = kbBitHeld(bit);
  KB_DOWN[ev.code] = bit;
  if (!was) { kbSync(bit); if (!ev.repeat) pkTranslate(bit); }
});
window.addEventListener('keyup', function (ev) {
  var bit = KB_MAP[ev.code]; if (!bit) return;
  if (!KB_DOWN[ev.code]) return;
  delete KB_DOWN[ev.code];
  if (pkActive()) ev.preventDefault();
  if (!kbBitHeld(bit)) kbSync(bit);
});
window.addEventListener('blur', function () {
  if (!Object.keys(KB_DOWN).length) return;
  KB_DOWN = {};
  for (var ki = 0; ki < KB_BITS.length; ki++) kbSync(KB_BITS[ki]);
});
function kbHintHTML() {
  if ('ontouchstart' in window) return '';
  return '<p class="center small muted" style="margin:8px 0 0">⌨️ WASD hoặc phím mũi tên để di chuyển · F/G/Q/E = A/B/X/Y</p>';
}
// ---------------------------------------------------------------------
// Local keyboard mode (host screen only): up to four players play on
// THIS screen, each with their own keyboard scheme — no phone needed.
// The server marks those seats local:true; the host view carries
// locals (seat -> scheme, every phase) and, during a game,
// localViews (each local seat's own player view — their secret
// question / wolf role / legal moves — because this screen IS that
// player's screen). Input relays back as host actions with forSeat.
// Panels are display-only overlays inside #localpanels, a fixed
// container appended to <body> (outside #app, whose innerHTML render()
// rebuilds): peek + cursor state lives in LK keyed by seat, never in
// the DOM, so repaints cannot lose it. Nothing here runs for the
// phone role. NOTE (brief conflict, resolved): in Kẻ Giả Mạo the Y key
// is both "hold to peek at your question" and "answer 4" — a quick TAP
// of Y answers 4, a HOLD (>= 300ms) only peeks, so the question can
// always be read before deciding.
// ---------------------------------------------------------------------
var LK_SCHEMES = [
  { name: 'WASD', u: 'KeyW', d: 'KeyS', l: 'KeyA', r: 'KeyD', a: 'KeyF', b: 'KeyG', x: 'KeyQ', y: 'KeyE' },
  { name: 'Mũi tên', u: 'ArrowUp', d: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight', a: 'Comma', b: 'Period', x: 'KeyM', y: 'Slash' },
  { name: 'Numpad', u: 'Numpad8', d: 'Numpad5', l: 'Numpad4', r: 'Numpad6', a: 'Numpad0', b: 'NumpadEnter', x: 'Numpad7', y: 'Numpad9' },
  { name: 'IJKL', u: 'KeyI', d: 'KeyK', l: 'KeyJ', r: 'KeyL', a: 'KeyO', b: 'KeyP', x: 'KeyU', y: 'Semicolon' }
];
var LK_SCHEME_SUMMARY = ['WASD · A=F B=G X=Q Y=E', 'Mũi tên · A=, B=. X=M Y=/', 'Numpad · A=0 B=Enter X=7 Y=9', 'IJKL · A=O B=P X=U Y=;'];
var LK_BITS = ['u', 'd', 'l', 'r', 'a', 'b', 'x', 'y'];
var LK_PAD_GAMES = { 'day-ra': 1, 'ne-dan': 1, 'cuop-sao': 1, 'giu-vuong-mien': 1, 'son-san': 1, 'chung-mot-than': 1, 'day-hop': 1, 'xe-tank': 1, 'dat-bom': 1, 'thu-thanh': 1, 'nguoi-que': 1, 'den-lua-nuoc': 1, 'da-bong': 1, 'ech-op': 1, 'can-goc': 1 };
var LK = {};
function lkState(seat) {
  if (!LK[seat]) LK[seat] = { pad: { u: false, d: false, l: false, r: false, a: false, b: false, x: false, y: false }, peek: false, yAt: 0, cur: 0, sig: '' };
  return LK[seat];
}
function lkActive() {
  var v = S.view;
  return S.role === 'host' && !!v && v.phase === 'playing' && !!v.game && !!v.locals && v.locals.length > 0;
}
function lkFind(code) {
  var v = S.view; if (!v || !v.locals) return null;
  for (var i = 0; i < v.locals.length; i++) {
    var sc = LK_SCHEMES[v.locals[i].scheme || 0]; if (!sc) continue;
    for (var b = 0; b < LK_BITS.length; b++) if (sc[LK_BITS[b]] === code) return { seat: v.locals[i].seat, bit: LK_BITS[b] };
  }
  return null;
}
function lkPlayerName(v, seat) { var p = playerOf(v, seat); return p ? p.name : ''; }
// One-shot helper for the home screen's "play by keyboard" create:
// once the freshly created room's lobby view lands, sit the host
// down in the first free keyboard seat automatically.
function hostKbAutoSeat(v) {
  if (!S.hostKb || S.role !== 'host' || !v || v.phase !== 'lobby') return;
  S.hostKb = false;
  for (var hl = 0; hl < v.players.length; hl++) if (v.players[hl].local) return;
  for (var ks2 = 2; ks2 <= 12; ks2++) if (!playerOf(v, ks2)) { act({ action: 'addLocal', seat: ks2 }); return; }
}
function sendLocalPad(seat) {
  // Mirror of sendPad() for a local seat: WS bare object when the live
  // channel is open, else the HTTP tiny-ack path; replies are ignored.
  var st = LK[seat]; if (!st || !S.code) return;
  if (S.localActive && L.room) {
    var E = window.__NP_ENGINE;
    for (var pi = 0; pi < L.room.players.length; pi++) { var pl = L.room.players[pi]; if (pl.seat === seat) { try { E.playerAction(L.room, pl, { action: 'pad', pad: st.pad }); } catch (e) {} break; } }
    return;
  }
  if (wsOpen() && !wsStale()) { try { wsConn.send(JSON.stringify({ action: 'pad', forSeat: seat, pad: st.pad })); return; } catch (e) {} }
  api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'pad', forSeat: seat, pad: st.pad }, function () {});
}
function localAct(seat, body) {
  // act() for a local seat: stamps host credentials + forSeat and
  // applies the returned host view. Deliberately NOT act() itself:
  // act() clears the session when an error contains 'không hợp lệ',
  // and a mistimed local press (e.g. a symbol sent a frame after the
  // phase turned) must never kick the big screen out of its own room.
  if (S.localActive) {
    body.forSeat = seat;
    var lerr2 = null;
    try { lerr2 = localDispatch(body); } catch (e) { lerr2 = null; }
    if (lerr2) toast(lerr2);
    return;
  }
  body.role = 'host'; body.token = S.token; body.forSeat = seat;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok && !viewStale(v)) { S.view = v; noteServerTime(v.serverNow); S.sig = ''; noteOk(); render(); }
    else if (v && v.error) toast(v.error);
  });
}
function lkOptions(v, seat) {
  // The seat's current pick list, or null. Options carry ready-to-send
  // action bodies (localAct stamps forSeat). Building the list also
  // owns cursor housekeeping: a changed signature (game + phase +
  // option actions) resets the cursor to the first row.
  var g = v.game; if (!g || !v.localViews) return null;
  var lv = v.localViews[seat]; if (!lv) return null;
  var opts = null;
  function aliveOthers() {
    var out = [];
    for (var i = 0; i < v.players.length; i++) { var p = v.players[i]; if (p.seat !== seat && g.aliveMap && g.aliveMap[p.seat]) out.push(p); }
    return out;
  }
  if (g.id === 'ma-soi' && lv.myAlive) {
    if (g.phase === 'night') {
      if (lv.myRole === 'soi' && lv.myWolfVote == null) {
        opts = aliveOthers().map(function (p) { return { label: esc(p.name) + ((lv.wolfTeam || []).indexOf(p.seat) >= 0 ? ' 🐺 đồng đội' : ''), act: { action: 'wolfVote', seat: p.seat } }; });
      } else if (lv.myRole === 'bao-ve' && lv.myGuardPick == null) {
        opts = [];
        for (var gi = 0; gi < v.players.length; gi++) { var gp = v.players[gi]; if (!g.aliveMap || !g.aliveMap[gp.seat]) continue; if (gp.seat === lv.myGuardLast) continue; opts.push({ label: esc(gp.name) + (gp.seat === seat ? ' (bạn)' : ''), act: { action: 'wolfGuard', seat: gp.seat } }); }
      } else if (lv.myRole === 'tien-tri' && lv.mySeerPick == null) {
        opts = aliveOthers().map(function (p) { return { label: esc(p.name), act: { action: 'wolfSeer', seat: p.seat } }; });
      } else if (lv.myRole === 'phu-thuy' && !lv.myWitchDone && lv.wolvesIn) {
        opts = [];
        if (lv.myVictim && (lv.mySaveLeft || 0) > 0) opts.push({ label: '🧪 Cứu ' + esc(lkPlayerName(v, lv.myVictim)) + (lv.myWitchSave ? ' ✓ đang chọn' : ''), act: { action: 'wolfWitch', save: true } });
        if ((lv.myPoisonLeft || 0) > 0) {
          var ao = aliveOthers();
          for (var pi = 0; pi < ao.length; pi++) opts.push({ label: '☠️ Độc: ' + esc(ao[pi].name) + (lv.myWitchPoison === ao[pi].seat ? ' ✓ đang chọn' : ''), act: { action: 'wolfWitch', poison: ao[pi].seat } });
        }
        opts.push({ label: '✔ Xong — đi ngủ', act: { action: 'wolfWitch', done: true } });
      }
    } else if (g.phase === 'vote' && !(g.voted && g.voted[seat])) {
      opts = aliveOthers().map(function (p) { return { label: esc(p.name), act: { action: 'vote', seat: p.seat } }; });
    }
  } else if (g.id === 'ke-gia-mao' && g.phase === 'vote' && lv.myVote == null) {
    opts = [];
    for (var vi = 0; vi < v.players.length; vi++) { var vp = v.players[vi]; if (vp.seat !== seat) opts.push({ label: esc(vp.name), act: { action: 'vote', seat: vp.seat } }); }
  } else if (g.id === 'ca-ngua' && g.phase === 'pick' && lv.myTurn && lv.myLegal && lv.myLegal.length) {
    opts = lv.myLegal.map(function (e) { return { label: '🐴 Ngựa ' + (e.horse + 1) + ' · ' + esc(e.hint), act: { action: 'move', horse: e.horse } }; });
  }
  if (!opts || !opts.length) return null;
  var sig = g.id + '|' + g.phase + '|' + opts.map(function (o) { return JSON.stringify(o.act); }).join(',');
  var st = lkState(seat);
  if (st.sig !== sig) { st.sig = sig; st.cur = 0; }
  if (st.cur >= opts.length) st.cur = opts.length - 1;
  if (st.cur < 0) st.cur = 0;
  return { options: opts };
}
function lkPickHTML(v, seat) {
  var got = lkOptions(v, seat);
  if (!got) return '';
  var st = lkState(seat);
  var h = '<div class="lplist">';
  for (var i = 0; i < got.options.length; i++) h += '<div class="lprow' + (i === st.cur ? ' cur' : '') + '">' + got.options[i].label + '</div>';
  h += '</div><div class="lpfoot">Phím lên/xuống: chọn · A: xác nhận</div>';
  return h;
}
// Tiến Lên local panel state: the seat's card selection + cursor,
// kept in LK (outside the rendered HTML) and reset whenever the hand
// signature changes — the same discipline as the phone's S.tlSel.
function lkTlSync(seat, lv) {
  var st = lkState(seat);
  var hand = (lv && lv.myHand) || [];
  var sig = hand.join(',');
  if (st.tlSig !== sig) { st.tlSig = sig; st.tlSel = []; st.tlCur = 0; }
  if (!st.tlSel) st.tlSel = [];
  if (st.tlCur == null || st.tlCur < 0) st.tlCur = 0;
  if (st.tlCur >= hand.length) st.tlCur = Math.max(0, hand.length - 1);
  return hand;
}
function lkTienLenKey(seat, bit, fresh, repeat) {
  var v = S.view; var g = v && v.game;
  if (!g || g.id !== 'tien-len' || g.phase !== 'cards') return false;
  var lv = (v.localViews || {})[seat]; if (!lv) return false;
  var st = lkState(seat);
  var hand = lkTlSync(seat, lv);
  if (bit === 'l' || bit === 'r') {
    if (hand.length) {
      var nc = Math.max(0, Math.min(hand.length - 1, st.tlCur + (bit === 'l' ? -1 : 1)));
      if (nc !== st.tlCur) { st.tlCur = nc; renderLocalPanels(); }
    }
    return true;
  }
  if (!fresh || repeat) return true;
  if (bit === 'a') {
    if (hand.length) {
      var cid = hand[st.tlCur];
      var ix = st.tlSel.indexOf(cid);
      if (ix >= 0) st.tlSel.splice(ix, 1); else st.tlSel.push(cid);
      renderLocalPanels();
    }
    return true;
  }
  if (bit === 'b') {
    if (st.tlSel.length) localAct(seat, { action: 'play', cards: st.tlSel.slice() });
    return true;
  }
  if (bit === 'x') { localAct(seat, { action: 'pass' }); return true; }
  if (bit === 'u' || bit === 'd' || bit === 'y') return true;
  return false;
}
function lkPanelBody(v, seat) {
  var g = v.game; var lv = (v.localViews || {})[seat] || {}; var st = lkState(seat);
  if (g.phase === 'countdown') return '<div class="lpline">⏳ Chuẩn bị… sẵn sàng trên bộ phím của bạn!</div>';
  if (g.id === 'ke-gia-mao') {
    if (g.phase === 'answer') {
      var kh = '';
      if (lv.mine != null) kh += '<div class="lpline">✅ Đã trả lời — đợi mọi người…</div>';
      if (st.peek && lv.myQuestion) {
        kh += '<div class="lpsecret"><b>' + esc(lv.myQuestion) + '</b>';
        if (lv.options) for (var oi = 0; oi < lv.options.length; oi++) kh += '<div>' + (oi + 1) + '. ' + esc(lv.options[oi]) + '</div>';
        kh += '</div><div class="lpfoot">A/B/X: đáp án 1–3 · chạm nhanh Y: đáp án 4</div>';
      } else if (lv.mine == null) kh += '<div class="lpline">🤫 Giữ phím Y của bạn để xem câu hỏi</div>';
      return kh;
    }
    if (g.phase === 'discuss') return '<div class="lpline">🗣️ Thảo luận trực tiếp với nhau!</div>';
    if (g.phase === 'vote') {
      if (lv.myVote != null) return '<div class="lpline">✅ Đã tố cáo — đợi kết quả…</div>';
      return '<div class="lpline">🕵️ Tố cáo ai là kẻ giả mạo?</div>' + lkPickHTML(v, seat);
    }
    if (g.phase === 'reveal') return '<div class="lpline">🧐 Xem kẻ giả mạo lộ diện trên màn hình!</div>';
    return '';
  }
  if (g.id === 'ma-soi') {
    if (lv.myAlive === false) return '<div class="lpline">💀 Bạn đã chết — theo dõi trên TV</div>';
    var mh = '';
    if (lv.myRole) {
      if (st.peek) {
        mh += '<div class="lpsecret">Vai của bạn: <b>' + (WOLF_ROLE_NAMES[lv.myRole] || '') + '</b>';
        if (lv.myRole === 'soi' && lv.wolfTeam) mh += '<div>Bầy sói: ' + lv.wolfTeam.map(function (s2) { return esc(lkPlayerName(v, s2)); }).join(', ') + '</div>';
        if (lv.myRole === 'tien-tri' && lv.mySeerNotes && lv.mySeerNotes.length) mh += '<div>Sổ tay: ' + lv.mySeerNotes.map(function (n2) { return esc(lkPlayerName(v, n2.seat)) + (n2.wolf ? ' 🐺' : ' ✅'); }).join(' · ') + '</div>';
        mh += '</div>';
      } else mh += '<div class="lpline">🤫 Giữ phím Y để xem vai trò</div>';
    }
    if (g.phase === 'night' && lv.myAlive) {
      if (lv.myRole === 'soi') mh += (lv.myWolfVote != null) ? '<div class="lpline">✅ Đã chọn con mồi: ' + esc(lkPlayerName(v, lv.myWolfVote)) + '</div>' : '<div class="lpline">🐺 Chọn con mồi đêm nay:</div>' + lkPickHTML(v, seat);
      else if (lv.myRole === 'bao-ve') mh += (lv.myGuardPick != null) ? '<div class="lpline">🛡️ Đang bảo vệ: ' + esc(lkPlayerName(v, lv.myGuardPick)) + '</div>' : '<div class="lpline">🛡️ Đêm nay bạn bảo vệ ai?</div>' + lkPickHTML(v, seat);
      else if (lv.myRole === 'tien-tri') {
        if (lv.mySeerPick != null) { var seen1 = (lv.mySeerNotes || []).filter(function (n3) { return n3.seat === lv.mySeerPick; })[0]; mh += '<div class="lpline">🔮 ' + esc(lkPlayerName(v, lv.mySeerPick)) + (seen1 && seen1.wolf ? ' LÀ SÓI! 🐺' : ' là dân lành ✅') + '</div>'; }
        else mh += '<div class="lpline">🔮 Đêm nay bạn soi ai?</div>' + lkPickHTML(v, seat);
      } else if (lv.myRole === 'phu-thuy') {
        if (lv.myWitchDone) mh += '<div class="lpline">🧙 Đã quyết định xong — đi ngủ thôi!</div>';
        else if (!lv.wolvesIn) mh += '<div class="lpline">🧙 Đợi bầy sói chọn xong con mồi…</div>';
        else mh += '<div class="lpline">Con mồi của sói: ' + (lv.myVictim ? esc(lkPlayerName(v, lv.myVictim)) : '—') + ' · 🧪 cứu ×' + (lv.mySaveLeft || 0) + ' · ☠️ độc ×' + (lv.myPoisonLeft || 0) + '</div>' + lkPickHTML(v, seat);
      } else if (lv.myRole === 'dan') mh += '<div class="lpline">😴 Bạn là dân làng — ngủ ngon, đợi trời sáng…</div>';
    } else if (g.phase === 'vote' && lv.myAlive) {
      if (g.voted && g.voted[seat]) mh += '<div class="lpline">✅ Đã bỏ phiếu! Đợi kết quả…</div>';
      else mh += '<div class="lpline">⚖️ Treo cổ ai? Chọn người bạn nghi là sói:</div>' + lkPickHTML(v, seat);
    } else if (g.phase === 'discuss') {
      mh += '<div class="lpline">🗣️ Bàn luận trực tiếp: ai là sói?</div>';
    }
    return mh;
  }
  if (g.id === 'ca-ngua') {
    if (g.phase === 'roll') return lv.myTurn ? '<div class="lpline">🎲 Lượt của bạn — nhấn phím A để thảy xúc xắc!</div>' : '';
    if (g.phase === 'pick') {
      if (!lv.myTurn) return '';
      return '<div class="lpline">🎲 Bạn thảy được ' + (g.dice || '') + ' chấm — chọn ngựa để đi:</div>' + lkPickHTML(v, seat);
    }
    return '';
  }
  if (g.id === 'tien-len') {
    if (g.phase === 'tlWin') {
      var winL = g.winner ? playerOf(v, g.winner) : null;
      return '<div class="lpline">🏆 ' + esc(winL ? winL.name : '') + ' thắng Tiến Lên!' + (lv.myRank ? ' Bạn về hạng ' + lv.myRank + '.' : '') + '</div>';
    }
    if (g.phase !== 'cards') return '';
    if (lv.myRank) return '<div class="lpline">🏆 Bạn đã hết bài — về hạng ' + lv.myRank + '! Xem TV đợi kết quả…</div>';
    var handL = lkTlSync(seat, lv);
    var stl = lkState(seat);
    var th = '';
    if (g.table) {
      var tpL = playerOf(v, g.table.seat);
      th += '<div class="lpline">Trên bàn: ' + tlChipsHTML(g.table.cards, true) + ' <span class="lpfoot">(' + esc(tpL ? tpL.name : '') + ' · ' + (TL_KIND_NAMES[g.table.kind] || '') + ')</span></div>';
    } else {
      th += '<div class="lpline">🃏 Bàn trống</div>';
    }
    th += '<div class="lpline">';
    for (var tci = 0; tci < handL.length; tci++) {
      var tcd = handL[tci];
      th += '<span class="tlp' + (tlCardRed(tcd) ? ' red' : '') + (stl.tlSel.indexOf(tcd) >= 0 ? ' sel' : '') + (tci === stl.tlCur ? ' cur' : '') + '">' + tlCardLabel(tcd) + '</span>';
    }
    th += '</div>';
    if (lv.myTurn) {
      th += '<div class="lpline">' + (g.table ? '⚔️ Lượt của bạn — đã chọn ' + stl.tlSel.length + ' lá để chặn' : '👑 Bạn cầm cái — đã chọn ' + stl.tlSel.length + ' lá') + (lv.mustInclude3 ? ' · <b>phải có lá 3♠!</b>' : '') + '</div>';
    } else if (lv.myPassed) {
      th += '<div class="lpline">✋ Bạn đã bỏ lượt vòng này — đợi vòng mới…</div>';
    } else {
      var tnL = g.turn ? playerOf(v, g.turn) : null;
      th += '<div class="lpline">Đợi lượt… (đang là lượt của ' + esc(tnL ? tnL.name : '') + ')</div>';
    }
    th += '<div class="lpfoot">◀▶ chọn lá · A lật chọn · B đánh · X bỏ lượt</div>';
    return th;
  }
  if (g.id === 'do-vui') {
    if (g.phase === 'question') return '<div class="lpline">' + (lv.mine != null ? '✅ Đã trả lời — đợi kết quả…' : '⌨️ A/B/X/Y = chọn đáp án 1–4') + '</div>';
    return '';
  }
  if (g.id === 'giai-ma-chung') return '<div class="lpline">⌨️ A/B/X/Y = bấm ký hiệu của bạn</div>';
  if (g.id === 'cao-boi') return '<div class="lpline">🔫 Nghe hiệu lệnh… phím A = BẮN!</div>';
  if (g.id === 'chia-cuop') {
    if (g.phase === 'choose') return '<div class="lpline">🤝 Phím A = Chia · B = Cướp (chọn bí mật)</div>';
    if (g.phase === 'talk') return '<div class="lpline">🗣️ Thương lượng trực tiếp với nhau!</div>';
    return '';
  }
  if (g.id === 'cheo-thuyen' && g.phase === 'row') return '<div class="lpline">🚣 Phím A = chèo theo nhịp!</div>';
  if (g.id === 'keo-co') return '<div class="lpline">🪢 Nhấn liên tục phím B để KÉO!</div>';
  // Pad games need no panel body while playing: the header chip
  // (name + key set) is the whole panel. The repeated "move with
  // your key set" sentence was on every panel, in every game, all
  // the time — pure clutter over the field corners.
  if (LK_PAD_GAMES[g.id]) return '';
  return '';
}
function lkPanelHTML(v, loc, idx) {
  var p = playerOf(v, loc.seat);
  var sc = LK_SCHEMES[loc.scheme || 0] || LK_SCHEMES[0];
  var h = '<div class="lpanel lp' + idx + '">';
  h += '<div class="lphead"><span class="lpdot" style="background:' + (COLORS[p ? p.color : 'blue'] || '#888888') + '"></span><b>' + esc(p ? p.name : '') + '</b><span class="lpscheme">' + esc(sc.name) + '</span></div>';
  h += lkPanelBody(v, loc.seat);
  return h + '</div>';
}
function renderLocalPanels() {
  var box = el('localpanels');
  if (!box) { box = document.createElement('div'); box.id = 'localpanels'; document.body.appendChild(box); }
  var v = S.view;
  // Scheme watch: a seat whose layout was just rotated in the lobby
  // (Đổi bộ phím) must not keep pad bits pressed under the OLD mapping
  // — drop its snapshot and push the cleared state before anything
  // else reads it. Runs in every phase because the rotation itself
  // happens in the lobby.
  if (S.role === 'host' && v && v.locals) {
    for (var swi = 0; swi < v.locals.length; swi++) {
      var swl = v.locals[swi]; var sws = LK[swl.seat]; if (!sws) continue;
      var swScheme = swl.scheme || 0;
      if (sws.schemeSeen === undefined) { sws.schemeSeen = swScheme; continue; }
      if (sws.schemeSeen !== swScheme) {
        sws.schemeSeen = swScheme;
        var swDirty = false;
        for (var swb = 0; swb < LK_BITS.length; swb++) if (sws.pad[LK_BITS[swb]]) { sws.pad[LK_BITS[swb]] = false; swDirty = true; }
        sws.peek = false;
        if (swDirty) sendLocalPad(swl.seat);
      }
    }
  }
  if (S.role !== 'host' || !v || v.phase !== 'playing' || !v.game || !v.locals || !v.locals.length) { if (S._panelH) { S._panelH = ''; box.innerHTML = ''; } return; }
  var h = '';
  for (var i = 0; i < v.locals.length && i < 4; i++) h += lkPanelHTML(v, v.locals[i], i);
  // Compare against the stored string, not box.innerHTML: reading
  // innerHTML back serializes the subtree on every 150 ms tick.
  if (S._panelH !== h) { S._panelH = h; box.innerHTML = h; }
}
function lkTranslate(seat, bit) {
  var v = S.view; var g = v.game; if (!g) return;
  var lv = (v.localViews || {})[seat] || {};
  var ci = bit === 'a' ? 0 : bit === 'b' ? 1 : bit === 'x' ? 2 : bit === 'y' ? 3 : -1;
  if (g.id === 'do-vui' && g.phase === 'question') { if (ci >= 0 && lv.mine == null) localAct(seat, { action: 'answer', choice: ci }); }
  else if (g.id === 'ke-gia-mao' && g.phase === 'answer') { if (ci >= 0 && ci < 3 && lv.mine == null) localAct(seat, { action: 'answer', choice: ci }); }
  else if (g.id === 'giai-ma-chung') { if (ci >= 0) localAct(seat, { action: 'symbol', sym: ci }); }
  else if (g.id === 'cao-boi') { if (bit === 'a') localAct(seat, { action: 'tap' }); }
  else if (g.id === 'cheo-thuyen' && g.phase === 'row') { if (bit === 'a') localAct(seat, { action: 'tap' }); }
  else if (g.id === 'ca-ngua' && g.phase === 'roll') { if (bit === 'a' && lv.myTurn) localAct(seat, { action: 'roll' }); }
}
window.addEventListener('keydown', function (ev) {
  if (!lkActive()) return;
  var t = ev.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  var hit = lkFind(ev.code); if (!hit) return;
  ev.preventDefault();
  var seat = hit.seat, bit = hit.bit, st = lkState(seat);
  var fresh = !st.pad[bit];
  if (bit === 'y' && fresh) { st.peek = true; st.yAt = Date.now(); renderLocalPanels(); }
  // A visible pick list claims up/down (cursor, repeats welcome) and A
  // (confirm, fresh presses only); every other fresh press falls to
  // the per-game discrete translations. Pad state below tracks ALL
  // mapped keys regardless — the server ignores pads in list games.
  // Tiến Lên claims its own keys first (card cursor + toggle + play +
  // pass live in lkTienLenKey); its pick list is a hand of cards, not
  // an lkOptions list.
  var tlHandled = lkTienLenKey(seat, bit, fresh, ev.repeat);
  var opts = tlHandled ? null : lkOptions(S.view, seat);
  if (opts && (bit === 'u' || bit === 'd')) {
    if (fresh || ev.repeat) { st.cur = (st.cur + (bit === 'u' ? opts.options.length - 1 : 1)) % opts.options.length; renderLocalPanels(); }
  } else if (opts && bit === 'a') {
    if (fresh && !ev.repeat) { var o = opts.options[st.cur]; if (o) localAct(seat, o.act); }
  } else if (!tlHandled && fresh && !ev.repeat) {
    lkTranslate(seat, bit);
  }
  if (!st.pad[bit]) { st.pad[bit] = true; sendLocalPad(seat); }
});
window.addEventListener('keyup', function (ev) {
  if (S.role !== 'host') return;
  var hit = lkFind(ev.code); if (!hit) return;
  var seat = hit.seat, bit = hit.bit, st = lkState(seat);
  if (st.pad[bit]) { st.pad[bit] = false; sendLocalPad(seat); }
  if (bit === 'y' && st.peek) {
    st.peek = false;
    var v = S.view;
    if (v && v.game && v.game.id === 'ke-gia-mao' && v.game.phase === 'answer' && Date.now() - st.yAt < 300) {
      var lv = (v.localViews || {})[seat] || {};
      if (lv.mine == null) localAct(seat, { action: 'answer', choice: 3 });
    }
    renderLocalPanels();
  }
});
window.addEventListener('blur', function () {
  // Never leave a local pad bit stuck on the server when the TV window
  // loses focus mid-hold: clear every seat's snapshot and push it.
  for (var seat in LK) {
    var st = LK[seat]; var dirty = false;
    for (var b = 0; b < LK_BITS.length; b++) if (st.pad[LK_BITS[b]]) { st.pad[LK_BITS[b]] = false; dirty = true; }
    st.peek = false;
    if (dirty && S.role === 'host' && S.view && S.view.locals) sendLocalPad(+seat);
  }
  renderLocalPanels();
});
(function init() {
  try {
    var raw = sessionStorage.getItem('np_session');
    if (raw) { var s = JSON.parse(raw); if (s && s.code && s.token) { S.role = s.role; S.code = s.code; S.token = s.token; S.seat = s.seat; S.phoneMode = !!s.phoneMode; S.lastOkAt = Date.now(); } }
  } catch (e) {}
  wsEnsure();
  render();
  if (RAF_OK) requestAnimationFrame(rafLoop);
  window.addEventListener('resize', function () { S.fieldRect = null; });
  setInterval(poll, 800);
  setInterval(tick, 150);
  // Tick pump: while a game is playing, the host page drives the
  // server loop over the WebSocket every ~50 ms. The platform alarm
  // that normally drives the loop measured ~118 ms per cycle on the
  // user's own room (their ping is only 30 ms — the message path is
  // fast, the alarm path is not), so state arrived in ~118 ms lumps
  // and the world juddered at that rhythm in every game. Driving
  // the loop from inside the message handler restores a ~60 ms
  // cadence. The alarm stays armed as a backstop; advance() is
  // time-based, so pump + alarm together can never double-step
  // the simulation.
  setInterval(function () {
    if (S.role !== 'host' || !S.view || S.view.phase !== 'playing' || !S.view.game) return;
    if (!wsOpen() || wsStale()) return;
    var nowP = Date.now();
    if (S._pumpAt && nowP - S._pumpAt < 30) return;
    if (S.lastStateAt && nowP - S.lastStateAt < 25) return;
    S._pumpAt = nowP;
    try { wsConn.send(JSON.stringify({ action: 'tick' })); } catch (e) {}
  }, 30);
  setInterval(function () {
    var v = S.view;
    if (v && v.game && ((v.game.id === 'cao-boi' && (v.game.phase === 'wait' || v.game.phase === 'go')) || (v.game.id === 'day-ra' && v.game.phase === 'arena') || (v.game.id === 'ne-dan' && v.game.phase === 'dodge') || (v.game.id === 'keo-co' && v.game.phase === 'pull') || (v.game.id === 'cuop-sao' && v.game.phase === 'steal') || (v.game.id === 'giu-vuong-mien' && v.game.phase === 'crown') || (v.game.id === 'son-san' && v.game.phase === 'splat') || (v.game.id === 'chung-mot-than' && v.game.phase === 'shared') || (v.game.id === 'day-hop' && v.game.phase === 'box') || (v.game.id === 'cheo-thuyen' && v.game.phase === 'row') || (v.game.id === 'xe-tank' && v.game.phase === 'tank') || (v.game.id === 'dat-bom' && v.game.phase === 'bomber') || (v.game.id === 'thu-thanh' && v.game.phase === 'defend') || (v.game.id === 'nguoi-que' && v.game.phase === 'fight') || (v.game.id === 'den-lua-nuoc' && v.game.phase === 'temple') || (v.game.id === 'da-bong' && (v.game.phase === 'soccer' || v.game.phase === 'goal')) || (v.game.id === 'ech-op' && (v.game.phase === 'frog' || v.game.phase === 'frogClear')) || (v.game.id === 'can-goc' && (v.game.phase === 'shell' || v.game.phase === 'boom')))) { if (!wsOpen() || wsStale()) poll(); }
  }, 120);
})();
</script>
</body>
</html>`;

