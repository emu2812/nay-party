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

export const SEAT_COLORS = ['blue', 'pink', 'green', 'purple'];
export const PLACEMENT_POINTS = [300, 200, 100, 50];
export const DIFFS = ['de', 'vua', 'kho'];
export const DIFF_LABELS = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };

export const GAMES = {
  'nhanh-tay': { name: 'Nhanh Tay', desc: 'Đợi màu xanh, bấm nhanh nhất!', rounds: 5, cat: 'versus' },
  'do-vui': { name: 'Đố Vui Tốc Độ', desc: 'Trả lời đúng và nhanh nhất', rounds: 8, cat: 'versus' },
  'doan-so': { name: 'Đoán Số Chuẩn', desc: 'Ước lượng gần đúng nhất', rounds: 5, cat: 'versus' },
  'dua-bam': { name: 'Đua Bấm Nút', desc: '10 giây bấm thật nhiều', rounds: 3, cat: 'versus' },
  'nho-mau': { name: 'Nhớ Màu', desc: 'Nhớ và bấm lại dãy màu', rounds: 5, cat: 'versus' },
  'day-ra': { name: 'Đẩy Ra Khỏi Sàn', desc: 'Gamepad: đẩy hết đối thủ khỏi sàn tròn!', rounds: 1, cat: 'versus' },
  'ne-dan': { name: 'Né Đạn', desc: 'Gamepad: né đạn pháo, sống sót đến cuối!', rounds: 1, cat: 'versus' },
  'keo-co': { name: 'Kéo Co', desc: 'Hai đội bấm nút B, kéo nút thắt về phía mình!', rounds: 1, cat: 'versus' },
  // Rounds for Chia Hay Cướp are dynamic: one round per seated player
  // (pairs rotate, see beginRound), so `rounds` here is only nominal.
  'chia-cuop': { name: 'Chia Hay Cướp', desc: 'Thương lượng 60 giây rồi chọn bí mật: Chia hay Cướp?', rounds: 4, cat: 'versus' },
  'cuop-sao': { name: 'Cướp Sao', desc: 'Gamepad: nhặt sao, xô đối thủ cho rơi sao!', rounds: 1, cat: 'versus' },
  'giu-vuong-mien': { name: 'Giữ Vương Miện', desc: 'Gamepad: giành vương miện và giữ càng lâu càng tốt!', rounds: 1, cat: 'versus' },
  'son-san': { name: 'Sơn Sàn', desc: 'Gamepad: chạy sơn sàn, chiếm thật nhiều ô!', rounds: 1, cat: 'versus' },
  'cao-boi': { name: 'Cao Bồi', desc: 'Đợi hiệu lệnh BẮN — rút súng nhanh nhất!', rounds: 5, cat: 'versus' },
  'xe-tank': { name: 'Xe Tăng Đấu Trường', desc: 'Gamepad: lái xe tăng, bắn hạ đối thủ, núp sau vật chắn!', rounds: 1, cat: 'versus' },
  'dat-bom': { name: 'Đặt Bom', desc: 'Gamepad: đặt bom phá tường gỗ, né vụ nổ chữ thập!', rounds: 1, cat: 'versus' },
  'ke-gia-mao': { name: 'Kẻ Giả Mạo', desc: 'Một người nhận câu hỏi giả — bàn luận và tố cáo cho đúng!', rounds: 3, cat: 'versus' },
  'chung-mot-than': { name: 'Chung Một Thân', desc: 'Hợp tác: cả đội lái chung một quả bóng, mỗi người giữ một hướng!', rounds: 1, cat: 'coop' },
  'day-hop': { name: 'Đẩy Hộp Về Đích', desc: 'Hợp tác: cùng đẩy hộp qua mê cung về ô đích!', rounds: 1, cat: 'coop' },
  'cheo-thuyen': { name: 'Chèo Thuyền', desc: 'Hợp tác: chèo thuyền theo nhịp, cả đội cùng trúng nhịp mới đi xa!', rounds: 1, cat: 'coop' },
  'thu-thanh': { name: 'Thủ Thành', desc: 'Hợp tác: bắn hạ đàn slime, giữ pha lê nguyên vẹn đến cuối!', rounds: 1, cat: 'coop' },
  'giai-ma-chung': { name: 'Giải Mã Chung', desc: 'Hợp tác: mỗi người giữ một phần mật mã — phối hợp bấm đúng thứ tự!', rounds: 1, cat: 'coop' },
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
// Tick engine retuned 500ms -> 250ms for smoother motion. Every
// tick-denominated constant was doubled (and per-tick steps/speeds
// halved) so wall-clock behaviour is unchanged: MOVE_STEP 0.5/tick =
// 2 units/s, dash cooldown 12 ticks = 3s, shove cooldown 6 ticks = 1.5s,
// ring shrink 0.5 per 8 ticks = per 2s, dodge invulnerability 8 ticks =
// 2s, ball speed 0.575/tick = 2.3 units/s, bot re-decision every
// 2/4/6 ticks = 0.5s/1s/1.5s as before.
const ARENA_R0 = 10, ARENA_RMIN = 4, ARENA_MS = 90000, ARENA_LIVES = 3, TICK_MS = 250;
const MOVE_STEP = 0.5, DASH_CD_TICKS = 12, SHOVE_CD_TICKS = 6;
const SHOVE_RANGE = 2.7, SHOVE_FORCE = 2.7;
// Né Đạn: same tick engine + walled arena (no shrinking, no ring-out).
const DODGE_MS = 75000, DODGE_LIVES = 3, BALL_SPEED = 0.575, BALL_HIT_DIST = 1.35, INVULN_TICKS = 8;
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
const STEAL_MS = 45000, STEAL_SHOVE_FORCE = 4.5, GOLD_EVERY_TICKS = 48, DROP_LOCK_TICKS = 2;
// Giữ Vương Miện: hold the crown for +1 point per tick; the holder moves
// at HOLDER_SPEED of normal speed; a shove drops the crown, which then
// cannot be picked up for CROWN_LOCK_TICKS ticks (1s).
const CROWN_MS = 45000, HOLDER_SPEED = 0.9, CROWN_LOCK_TICKS = 4;
// Sơn Sàn: 12x12 grid over the square [-9.6, 9.6]^2 (cell 1.6). Entering
// a cell paints it; A triggers a 3x3 paint burst on PAINT_CD_TICKS (2s).
const SPLAT_MS = 40000, SPLAT_N = 12, SPLAT_MIN = -9.6, SPLAT_CELL = 1.6, PAINT_CD_TICKS = 8;
// Cao Bồi: after a random hidden delay the BẮN! window opens for
// DUEL_WINDOW_MS; round points by server receipt order, foul = -100.
const DUEL_WINDOW_MS = 1500, DUEL_POINTS = [200, 100, 50, 0], DUEL_FOUL = -100;
// Hợp tác (co-op): no per-player placement. Each co-op game ends with a
// TEAM result: a tier (Vàng/Bạc/Đồng/none) and every player banks the
// same pointsEach (300/200/100/50). See finishCoop().
const TIER_LABELS = { vang: 'VÀNG', bac: 'BẠC', dong: 'ĐỒNG', none: 'CHƯA ĐẠT HUY CHƯƠNG' };
const TIER_POINTS = { vang: 300, bac: 200, dong: 100, none: 50 };
// Chung Một Thân: ONE shared blob steered by split direction ownership;
// checkpoint stars score for the team, cannonballs (slower + sparser
// than Né Đạn) cost shared hearts.
const SHARED_MS = 60000, SHARED_HEARTS = 3, STAR_STALE_TICKS = 60;
const SHARED_BALL_SPEED = 0.4;
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
const TANK_MS = 75000, TANK_LIVES = 3, SHELL_SPEED = 1.2, SHELL_CD_TICKS = 4, SHELL_HIT_DIST = 1.0;
const TANK_BLOCKS = [
  { x: 2.2, y: -3.2, w: 2, h: 1.4 }, { x: -4.2, y: 1.8, w: 2, h: 1.4 },
  { x: -4.2, y: -3.2, w: 2, h: 1.4 }, { x: 2.2, y: 1.8, w: 2, h: 1.4 },
];
// Đặt Bom: 11x9 grid of 2-unit cells over the arena; hard pillars sit
// on odd/odd cells (classic bomber layout), soft blocks are dealt per
// match with Math.random so tests can queue the exact layout.
const BOM_MS = 75000, BOM_LIVES = 2, BOM_COLS = 11, BOM_ROWS = 9, BOM_FUSE_TICKS = 8, BOM_SOFT_P = 0.62;
// Kẻ Giả Mạo: one secret impostor per round secretly gets the variant
// question; catching pays every other player, escaping pays the
// impostor (doubled in the final round).
const IMP_ANSWER_MS = 30000, IMP_DISCUSS_MS = 45000, IMP_VOTE_MS = 20000, IMP_REVEAL_MS = 9000;
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
    stars: null, starSeq: 0, goldIn: 0, banked: {}, hold: {}, crown: null, grid: null, paintCd: {},
    teamResult: null, owners: null, shared: null, star: null, starTick: 0, hearts: 0, checks: 0, sharedInvuln: 0,
    crate: null, goal: null, walls: null, layout: 0, deliveries: 0,
    rowStart: 0, distance: 0, hits: {}, splash: {}, stroked: {}, beatDone: 0,
    shells: [], shellSeq: 0, facing: {}, fireCd: {},
    votes: {}, imp: null, usedPairs: [], chatLog: [],
    hardCells: [], softCells: [], bombs: [], bombSeq: 0, blasts: [],
    slimes: [], slimeSeq: 0, crystal: null, kills: 0,
    level: 0, levelsDone: 0, stepIdx: 0, botPressAt: 0, decodeAt: 0,
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
  if (g.teamResult) entry.teamResult = g.teamResult;
  room.resultsLog.push(entry);
  if (room.resultsLog.length > 20) room.resultsLog = room.resultsLog.slice(-20);
  room.lastGame = { id: g.id, name: entry.name, points: entry.points, standings: standingsOf(room), teamResult: g.teamResult || null };
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
  g.blobs = {}; g.elimOrder = []; g.elimTick = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};
  room.players.forEach((p, i) => {
    const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
    g.blobs[p.seat] = {
      x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
      y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
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
    g.blobs = {}; g.elimOrder = []; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);
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
    g.blobs = {}; g.balls = []; g.spawnIn = 6; g.elimOrder = []; g.elimTick = {};
    g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room); g.invuln = {};
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
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
        lives: 0, alive: true,
      };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.banked[p.seat] = 0;
    });
    spawnStar(room, false); spawnStar(room, false);
  } else if (g.id === 'giu-vuong-mien') {
    g.phase = 'crown';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + CROWN_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.shoveCd = {}; preservePads(room);
    g.hold = {}; g.crown = { holder: null, x: 0, y: 0, lockTicks: 0 };
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
        lives: 0, alive: true,
      };
      g.dashCd[p.seat] = 0; g.shoveCd[p.seat] = 0; g.hold[p.seat] = 0;
    });
  } else if (g.id === 'son-san') {
    g.phase = 'splat';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + SPLAT_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; g.paintCd = {}; preservePads(room);
    g.grid = new Array(SPLAT_N * SPLAT_N).fill(0);
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
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
    g.balls = []; g.spawnIn = 10; preservePads(room); g.botIntent = {};
    spawnSharedStar(room);
  } else if (g.id === 'day-hop') {
    g.phase = 'box';
    g.tickCount = 0; g.nextTickAt = t + TICK_MS; g.endsAt = t + BOX_MS;
    g.blobs = {}; g.botIntent = {}; g.dashCd = {}; preservePads(room);
    room.players.forEach((p, i) => {
      const ang = (i / Math.max(1, room.players.length)) * Math.PI * 2;
      g.blobs[p.seat] = {
        x: Math.round(Math.cos(ang) * ARENA_R0 * 0.55 * 100) / 100,
        y: Math.round(Math.sin(ang) * ARENA_R0 * 0.55 * 100) / 100,
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
    // Spawns are the four corner cells, dealt in seat order.
    const corners = [[0, 0], [BOM_COLS - 1, BOM_ROWS - 1], [BOM_COLS - 1, 0], [0, BOM_ROWS - 1]];
    room.players.forEach((p, i) => {
      const c = corners[i % corners.length];
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
    g.slimes = []; g.slimeSeq = 0; g.kills = 0; g.spawnIn = 4;
  } else if (g.id === 'giai-ma-chung') {
    g.phase = 'decode';
    g.endsAt = t + DECODE_MS;
    g.hearts = DECODE_HEARTS; g.level = 0; g.levelsDone = 0;
    startDecodeLevel(room, t);
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
  const every = p.difficulty === 'kho' ? 2 : p.difficulty === 'vua' ? 4 : 6;
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
  if (g.tickCount % 8 === 0 && g.arenaR > ARENA_RMIN) g.arenaR = Math.max(ARENA_RMIN, g.arenaR - 0.5);
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
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = DASH_CD_TICKS; }
    b.x += mv.x * MOVE_STEP * stepMul; b.y += mv.y * MOVE_STEP * stepMul;
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
      g.shoveCd[p.seat] = SHOVE_CD_TICKS;
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
// lives and grants INVULN_TICKS ticks of invulnerability so one ball can
// never multi-hit. Ranking: survivors first (most lives), then by elimination
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
  const every = p.difficulty === 'kho' ? 2 : p.difficulty === 'vua' ? 4 : 6;
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
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = DASH_CD_TICKS; }
    b.x += mv.x * MOVE_STEP * stepMul; b.y += mv.y * MOVE_STEP * stepMul;
    const d = Math.hypot(b.x, b.y); const maxR = ARENA_R0 - 0.8;
    if (d > maxR) { b.x *= maxR / d; b.y *= maxR / d; } // the wall stops you
  });
  // Cannonballs: spawn on a cadence that tightens as the match goes on
  // (same wall-clock cadence as before the retune: gap starts at 3.5s,
  // shrinks 0.25s every 12s, floor 1.5s).
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
    g.spawnIn = Math.max(6, 14 - Math.floor(g.tickCount / 48));
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
    let stepMul = 1;
    if (opts.holderSeat === p.seat) stepMul = HOLDER_SPEED;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = DASH_CD_TICKS; }
    b.x += mv.x * MOVE_STEP * stepMul; b.y += mv.y * MOVE_STEP * stepMul;
    if (opts.clampBox) {
      const m = opts.clampBox;
      b.x = Math.max(-m, Math.min(m, b.x)); b.y = Math.max(-m, Math.min(m, b.y));
    } else {
      const d = Math.hypot(b.x, b.y); const maxR = ARENA_R0 - 0.8;
      if (d > maxR) { b.x *= maxR / d; b.y *= maxR / d; } // the wall stops you
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
      foe.x += ((foe.x - b.x) / foeD) * force;
      foe.y += ((foe.y - b.y) / foeD) * force;
      const d2 = Math.hypot(foe.x, foe.y); const maxR = ARENA_R0 - 0.8;
      if (d2 > maxR) { foe.x *= maxR / d2; foe.y *= maxR / d2; } // wall stops the knockback too
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
    const e = { seat: p.seat, points: PLACEMENT_POINTS[Math.min(i, 3)] };
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
function brainCadence(p) { return p.difficulty === 'kho' ? 2 : p.difficulty === 'vua' ? 4 : 6; }
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
    x = Math.cos(ang) * rr; y = Math.sin(ang) * rr;
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
    simulateStealTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
    return true;
  }
  return false;
}
function simulateStealTick(room) {
  const g = room.game;
  g.tickCount += 1;
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
// banks +1 hold point per tick survived and moves at HOLDER_SPEED; a
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
    if (Math.hypot(me.x, me.y) > 7) { tx += -me.x * 0.7; ty += -me.y * 0.7; }
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
    simulateCrownTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
    return true;
  }
  return false;
}
function simulateCrownTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = collectMoves(room, botBrainCrown);
  applyMoves(room, moves, { holderSeat: g.crown.holder });
  separateBlobs(room);
  applyShoves(room, moves, SHOVE_FORCE, (rm, attackerSeat, victimSeat, vx, vy) => {
    const gg = rm.game;
    if (gg.crown.holder === victimSeat) {
      const ab = gg.blobs[attackerSeat];
      let dx = vx - ab.x, dy = vy - ab.y;
      const d = Math.hypot(dx, dy) || 1;
      let cx = vx + (dx / d) * 1.6, cy = vy + (dy / d) * 1.6;
      const cd = Math.hypot(cx, cy); const maxR = ARENA_R0 - 0.8;
      if (cd > maxR) { cx *= maxR / cd; cy *= maxR / cd; }
      gg.crown.holder = null;
      gg.crown.x = Math.round(cx * 100) / 100; gg.crown.y = Math.round(cy * 100) / 100;
      gg.crown.lockTicks = CROWN_LOCK_TICKS;
    }
  });
  if (g.crown.holder) {
    const hb = g.blobs[g.crown.holder];
    g.crown.x = hb.x; g.crown.y = hb.y;
    g.hold[g.crown.holder] = (g.hold[g.crown.holder] || 0) + 1;
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
  const c = Math.max(0, Math.min(SPLAT_N - 1, Math.floor((x - SPLAT_MIN) / SPLAT_CELL)));
  const r = Math.max(0, Math.min(SPLAT_N - 1, Math.floor((y - SPLAT_MIN) / SPLAT_CELL)));
  return r * SPLAT_N + c;
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
    const cx = SPLAT_MIN + (i % SPLAT_N + 0.5) * SPLAT_CELL;
    const cy = SPLAT_MIN + (Math.floor(i / SPLAT_N) + 0.5) * SPLAT_CELL;
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
    simulateSplatTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
    return true;
  }
  return false;
}
function simulateSplatTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = collectMoves(room, botBrainSplat);
  applyMoves(room, moves, { clampBox: 9.2 });
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive) return;
    g.grid[splatCell(b.x, b.y)] = p.seat;
    if (g.paintCd[p.seat] > 0) g.paintCd[p.seat] -= 1;
    if (mv && mv.burst && g.paintCd[p.seat] <= 0) {
      const ci = splatCell(b.x, b.y);
      const cc = ci % SPLAT_N, cr = Math.floor(ci / SPLAT_N);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = cr + dr, cc2 = cc + dc;
        if (rr >= 0 && rr < SPLAT_N && cc2 >= 0 && cc2 < SPLAT_N) g.grid[rr * SPLAT_N + cc2] = p.seat;
      }
      g.paintCd[p.seat] = PAINT_CD_TICKS;
    }
  });
  snapshotPad(room);
}

// --- Game 13: Cao Bồi (duel draw, rounds) ----------------------------------
// Not tick-based: like Nhanh Tay it reuses the countdown -> wait -> go
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
  fired.forEach((e, i) => { e.order = i + 1; e.points = roundPoints(g, DUEL_POINTS[Math.min(i, 3)]); });
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
    x = Math.cos(ang) * rr; y = Math.sin(ang) * rr;
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
    simulateSharedTick(room);
    if (room.game !== g) return true; // hearts ran out mid-tick
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync after long gaps
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
  b.x += mx * MOVE_STEP; b.y += my * MOVE_STEP;
  const d = Math.hypot(b.x, b.y); const maxR = ARENA_R0 - 0.8;
  if (d > maxR) { b.x *= maxR / d; b.y *= maxR / d; } // walled arena
  b.x = Math.round(b.x * 100) / 100; b.y = Math.round(b.y * 100) / 100;
  // Checkpoint touch scores for the team; a stale star respawns.
  if (g.star && Math.hypot(g.star.x - b.x, g.star.y - b.y) <= 1.3) { g.checks += 1; spawnSharedStar(room); }
  else if (g.star && g.tickCount - g.starTick >= STAR_STALE_TICKS) spawnSharedStar(room);
  // Cannonballs: same edge-spawn pattern as Né Đạn, lower density.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    const R = ARENA_R0 + 2;
    const side = randInt(0, 3); const along = rand(-8, 8);
    let x = 0, y = 0;
    if (side === 0) { x = -R; y = along; } else if (side === 1) { x = R; y = along; }
    else if (side === 2) { x = along; y = -R; } else { x = along; y = R; }
    const tx = rand(-5, 5), ty = rand(-5, 5);
    const dx = tx - x, dy = ty - y; const dd = Math.hypot(dx, dy) || 1;
    g.balls.push({ x, y, vx: (dx / dd) * SHARED_BALL_SPEED, vy: (dy / dd) * SHARED_BALL_SPEED });
    g.spawnIn = Math.max(10, 16 - Math.floor(g.tickCount / 96));
  }
  g.balls.forEach((ball) => { ball.x += ball.vx; ball.y += ball.vy; });
  g.balls = g.balls.filter((ball) => Math.hypot(ball.x, ball.y) <= 15);
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
const BOX_LAYOUTS = [
  { crate: { x: -6, y: 0 }, goal: { x: 6.5, y: -1.5, w: 3, h: 3 }, walls: [
    { x: -1.5, y: 2.5, w: 3, h: 1.1 }, { x: -1.5, y: -3.6, w: 3, h: 1.1 } ] },
  { crate: { x: -6.5, y: -5 }, goal: { x: 6, y: 3.5, w: 3.2, h: 3 }, walls: [
    { x: -9.2, y: 1.8, w: 6.4, h: 1.2 }, { x: 2.8, y: -3, w: 6.4, h: 1.2 } ] },
  { crate: { x: 0, y: -6.5 }, goal: { x: -1.6, y: 5.2, w: 3.2, h: 3 }, walls: [
    { x: -3.6, y: -1, w: 1.1, h: 3.8 }, { x: 2.5, y: -1, w: 1.1, h: 3.8 }, { x: -2.5, y: 2.8, w: 6.1, h: 1.1 } ] },
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
function slideCircle(pos, dx, dy, r, walls, clampM) {
  if (dx) {
    const nx = pos.x + dx;
    if (!walls.some((w) => circleRectHit(nx, pos.y, r, w))) pos.x = nx;
  }
  if (dy) {
    const ny = pos.y + dy;
    if (!walls.some((w) => circleRectHit(pos.x, ny, r, w))) pos.y = ny;
  }
  pos.x = Math.max(-clampM, Math.min(clampM, pos.x));
  pos.y = Math.max(-clampM, Math.min(clampM, pos.y));
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
    simulateBoxTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync after long gaps
    return true;
  }
  return false;
}
function simulateBoxTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = collectMoves(room, botBrainBox);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = DASH_CD_TICKS; }
    slideCircle(b, mv.x * MOVE_STEP * stepMul, mv.y * MOVE_STEP * stepMul, 0.8, g.walls, ARENA_R0 - 0.8);
  });
  separateBlobs(room);
  const c = g.crate;
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
      slideCircle(c, (sx / mag) * MOVE_STEP * BOX_STEP_MUL, (sy / mag) * MOVE_STEP * BOX_STEP_MUL,
        BOX_CRATE_R, g.walls, ARENA_R0 - BOX_CRATE_R);
    }
  }
  c.x = Math.round(c.x * 100) / 100; c.y = Math.round(c.y * 100) / 100;
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
// applyMoves, then either a slideCircle pass against wall rects or the
// plain radial wall clamp.
function moveBlobsWalled(room, moves, walls, clampM) {
  const g = room.game;
  room.players.forEach((p) => {
    const b = g.blobs[p.seat]; const mv = moves[p.seat];
    if (!b || !b.alive || !mv) return;
    if (g.dashCd[p.seat] > 0) g.dashCd[p.seat] -= 1;
    let stepMul = 1;
    if (mv.dash && (mv.x || mv.y) && g.dashCd[p.seat] <= 0) { stepMul = 3; g.dashCd[p.seat] = DASH_CD_TICKS; }
    if (walls) {
      slideCircle(b, mv.x * MOVE_STEP * stepMul, mv.y * MOVE_STEP * stepMul, 0.8, walls, clampM);
    } else {
      b.x += mv.x * MOVE_STEP * stepMul; b.y += mv.y * MOVE_STEP * stepMul;
      const d = Math.hypot(b.x, b.y); const maxR = ARENA_R0 - 0.8;
      if (d > maxR) { b.x *= maxR / d; b.y *= maxR / d; }
    }
  });
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
    let dead = Math.hypot(s.x, s.y) > 11.5;
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
    simulateTankTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
    return true;
  }
  return false;
}
function simulateTankTick(room) {
  const g = room.game;
  g.tickCount += 1;
  const moves = collectMoves(room, botBrainTank);
  moveBlobsWalled(room, moves, TANK_BLOCKS, 9.2);
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
function bomCellX(c) { return -10 + c * 2; }
function bomCellY(r) { return -8 + r * 2; }
function bomColOf(x) { return Math.max(0, Math.min(BOM_COLS - 1, Math.floor((x + 11) / 2))); }
function bomRowOf(y) { return Math.max(0, Math.min(BOM_ROWS - 1, Math.floor((y + 9) / 2))); }
function bomIsHard(c, r) { return c % 2 === 1 && r % 2 === 1; }
function bomIsSafe(c, r) {
  return (c <= 1 && r <= 1) || (c >= BOM_COLS - 2 && r >= BOM_ROWS - 2)
    || (c >= BOM_COLS - 2 && r <= 1) || (c <= 1 && r >= BOM_ROWS - 2);
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
    simulateBomberTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
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
  moveBlobsWalled(room, moves, bomberWalls(room), 10.2);
  room.players.forEach((p) => {
    const b = g.blobs[p.seat];
    if (b) b.y = Math.max(-8.2, Math.min(8.2, b.y)); // grid is 11 wide but 9 tall
  });
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
    simulateDefendTick(room);
    g.nextTickAt += TICK_MS;
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;
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
  // Waves: spawn interval ramps 12 -> 5 ticks across the minute;
  // bigger, slower 3-HP slimes join from the 20 second mark.
  g.spawnIn -= 1;
  if (g.spawnIn <= 0) {
    const ang = rand(0, Math.PI * 2);
    const big = g.tickCount >= 80 && Math.random() < 0.3;
    g.slimeSeq += 1;
    g.slimes.push({
      id: g.slimeSeq,
      x: Math.round(Math.cos(ang) * 10.6 * 100) / 100, y: Math.round(Math.sin(ang) * 10.6 * 100) / 100,
      hp: big ? 3 : 1, maxHp: big ? 3 : 1, r: big ? 1.05 : 0.7, speed: big ? 0.16 : 0.26, big,
    });
    g.spawnIn = Math.max(5, Math.round(12 - 7 * (g.tickCount / (DEF_MS / TICK_MS))));
  }
  let crystalDown = false;
  g.slimes.forEach((sl) => {
    const d = Math.hypot(sl.x, sl.y) || 1;
    sl.x -= (sl.x / d) * sl.speed; sl.y -= (sl.y / d) * sl.speed;
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
    if ((tx / dd) * f.x + (ty / dd) * f.y > 0.92 && sd < 9.5) burst = true;
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

function blobsView(room) {
  const g = room.game;
  const out = {};
  room.players.forEach((p) => {
    const b = g.blobs ? g.blobs[p.seat] : null;
    if (b) out[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
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
  return (g.shells || []).map((s) => ({ id: s.id, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100 }));
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
  } else if (g.id === 'cuop-sao') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
    });
    v.stars = (g.stars || []).map((s) => ({ id: s.id, x: s.x, y: s.y, gold: s.gold }));
    v.banked = g.banked;
    if (seat) v.mine = g.banked[seat] || 0;
  } else if (g.id === 'giu-vuong-mien') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
    });
    v.hold = g.hold;
    v.crown = g.crown ? { holder: g.crown.holder, x: Math.round(g.crown.x * 100) / 100, y: Math.round(g.crown.y * 100) / 100 } : null;
    if (seat) { v.mine = g.hold[seat] || 0; v.myCrown = !!g.crown && g.crown.holder === seat; }
  } else if (g.id === 'son-san') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
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
    v.shared = g.shared ? { x: Math.round(g.shared.x * 100) / 100, y: Math.round(g.shared.y * 100) / 100 } : null;
    v.star = g.star ? { x: g.star.x, y: g.star.y } : null;
    v.hearts = g.hearts;
    v.checks = g.checks;
    v.balls = (g.balls || []).map((b) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100 }));
    if (seat) v.myDirs = ['u', 'r', 'd', 'l'].filter((d) => g.owners && g.owners[d] === seat);
  } else if (g.id === 'day-hop') {
    v.arenaR = ARENA_R0;
    v.blobs = {};
    room.players.forEach((p) => {
      const b = g.blobs ? g.blobs[p.seat] : null;
      if (b) v.blobs[p.seat] = { x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, lives: b.lives, alive: b.alive };
    });
    v.crate = g.crate ? { x: g.crate.x, y: g.crate.y } : null;
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
    const pair = IMPOSTOR_BANK[g.imp.pair];
    v.category = pair.cat;
    v.phaseDur = g.phase === 'answer' ? IMP_ANSWER_MS : g.phase === 'discuss' ? IMP_DISCUSS_MS : g.phase === 'vote' ? IMP_VOTE_MS : IMP_REVEAL_MS;
    const answered = {}; const voted = {};
    room.players.forEach((p) => {
      answered[p.seat] = p.type === 'human' ? !!g.inputs[p.seat] : !!(g.botPlan[p.seat] && g.botPlan[p.seat].answerAt <= t);
      voted[p.seat] = g.votes[p.seat] != null;
    });
    v.answered = answered; v.voted = voted;
    if (g.phase === 'discuss' || g.phase === 'vote' || g.phase === 'reveal') v.chatLog = g.chatLog || [];
    if (g.phase === 'reveal' && g.reveal) {
      v.reveal = {
        impostor: g.reveal.impostor, caught: g.reveal.caught,
        realQ: pair.real, fakeQ: pair.fake, options: pair.options,
        votes: g.reveal.votes, answers: g.reveal.answers, points: g.reveal.points,
      };
    }
    if (seat) {
      v.myQuestion = g.imp.seat === seat ? pair.fake : pair.real;
      v.options = pair.options;
      v.mine = g.inputs[seat] ? g.inputs[seat].choice : null;
      v.myVote = g.votes[seat] != null ? g.votes[seat] : null;
    }
  } else if (g.id === 'thu-thanh') {
    v.arenaR = ARENA_R0;
    v.blobs = blobsView(room);
    v.facing = facingView(room);
    v.shells = shellsView(room);
    v.slimes = (g.slimes || []).map((s) => ({ id: s.id, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, hp: s.hp, maxHp: s.maxHp, big: s.big }));
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
    games: Object.keys(GAMES).map((id) => ({ id, name: GAMES[id].name, desc: GAMES[id].desc, rounds: GAMES[id].rounds, cat: GAMES[id].cat })),
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
    if (body.game === 'ke-gia-mao' && room.players.length < 3) return 'Kẻ Giả Mạo cần ít nhất 3 người chơi mới chơi được (thêm Máy hoặc rủ thêm bạn).';
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
    if (g.id !== 'day-ra' && g.id !== 'ne-dan' && g.id !== 'keo-co' && g.id !== 'chia-cuop'
      && g.id !== 'cuop-sao' && g.id !== 'giu-vuong-mien' && g.id !== 'son-san'
      && g.id !== 'chung-mot-than' && g.id !== 'day-hop'
      && g.id !== 'xe-tank' && g.id !== 'dat-bom' && g.id !== 'thu-thanh') return null;
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
    if (g.id === 'nhanh-tay') {
      if (g.inputs[seat]) return null;
      if (g.phase === 'wait') g.inputs[seat] = { early: true, tapAt: t };
      else if (g.phase === 'go') g.inputs[seat] = { tapAt: t };
      return null;
    }
    if (g.id === 'cao-boi') {
      if (g.inputs[seat]) return null;
      if (g.phase === 'wait') g.inputs[seat] = { foul: true, at: t };
      else if (g.phase === 'go') g.inputs[seat] = { tapAt: t };
      return null;
    }
    if (g.id === 'dua-bam') {
      if (g.phase !== 'race') return null;
      if (!g.inputs[seat]) g.inputs[seat] = { count: 0 };
      g.inputs[seat].count += 1;
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
  if (a === 'vote') {
    if (g.id !== 'ke-gia-mao' || g.phase !== 'vote') return 'Chưa đến lúc tố cáo.';
    if (g.votes[seat] != null) return null;
    const target = body.seat;
    if (!Number.isInteger(target) || target === seat || !playerAt(room, target)) return 'Không tố cáo được người này.';
    g.votes[seat] = target;
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
html, body { margin: 0; padding: 0; overscroll-behavior: none; }
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
.pstage { touch-action: none; overscroll-behavior: none; }
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
.tapbtn, .opt, .key, .pad, .btn[data-cmd="choose"], .btn[data-cmd="guessSubmit"] { touch-action: none; user-select: none; -webkit-user-select: none; }
.pressed { transform: scale(.93) !important; filter: brightness(1.25) saturate(1.15); box-shadow: 0 0 0 3px rgba(255,255,255,.8), 0 0 26px rgba(255,255,255,.6) !important; }
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
.g-cuop-sao { background-color: #171003; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,190,50,.3), transparent 62%), linear-gradient(rgba(255,210,110,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,210,110,.05) 1px, transparent 1px), linear-gradient(165deg, #241A04, #2E2005 58%, #140E02); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(22,16,2,.5); }
.g-giu-vuong-mien { background-color: #12061F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(190,120,255,.3), transparent 62%), linear-gradient(rgba(200,150,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,150,255,.05) 1px, transparent 1px), linear-gradient(165deg, #1E0A38, #2A1052 58%, #0E0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(16,4,30,.5); }
.g-son-san { background-color: #03181C; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(50,220,200,.24), transparent 62%), linear-gradient(rgba(120,255,235,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,235,.045) 1px, transparent 1px), linear-gradient(165deg, #052A30, #04303A 58%, #02141A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,18,22,.5); }
.g-cao-boi { background-color: #170B04; background-image: radial-gradient(ellipse 70% 60% at 50% 30%, rgba(255,176,66,.32), transparent 65%), linear-gradient(rgba(255,190,110,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,110,.04) 1px, transparent 1px), linear-gradient(165deg, #2A1503, #3A1C05 58%, #180B02); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(22,10,2,.5); }
.g-chung-mot-than { background-color: #0D0620; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(167,139,250,.3), transparent 62%), linear-gradient(rgba(180,160,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(180,160,255,.05) 1px, transparent 1px), linear-gradient(165deg, #1E1040, #2A1458 58%, #0C0518); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(14,4,30,.5); }
.g-day-hop { background-color: #160D02; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,170,60,.26), transparent 62%), linear-gradient(rgba(255,190,100,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,100,.045) 1px, transparent 1px), linear-gradient(165deg, #241503, #331D04 58%, #120A01); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(20,12,2,.5); }
.g-xe-tank { background-color: #0A1410; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(80,255,170,.24), transparent 62%), linear-gradient(rgba(120,255,190,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,190,.045) 1px, transparent 1px), linear-gradient(165deg, #0B2018, #0E2A1E 58%, #060F0B); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,16,10,.5); }
.g-dat-bom { background-color: #160A04; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,120,60,.26), transparent 62%), linear-gradient(rgba(255,160,110,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,160,110,.045) 1px, transparent 1px), linear-gradient(165deg, #241006, #301605 58%, #120702); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(18,8,2,.5); }
.g-ke-gia-mao { background-color: #12081C; background-image: radial-gradient(ellipse 70% 60% at 50% 30%, rgba(190,90,255,.22), transparent 65%), linear-gradient(rgba(200,150,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200,150,255,.04) 1px, transparent 1px), linear-gradient(165deg, #1E0A38, #2A0E44 58%, #0C0516); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(12,4,24,.5); }
.g-thu-thanh { background-color: #03141C; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(80,220,255,.26), transparent 62%), linear-gradient(rgba(140,230,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(140,230,255,.045) 1px, transparent 1px), linear-gradient(165deg, #06222E, #08303F 58%, #02101A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,14,20,.5); }
.g-giai-ma-chung { background-color: #0C0A1E; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(130,120,255,.28), transparent 62%), linear-gradient(rgba(160,150,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(160,150,255,.05) 1px, transparent 1px), linear-gradient(165deg, #191238, #120E30 58%, #08061A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(6,4,20,.5); }
.aframe { position: absolute; border: 3px solid rgba(120,220,255,.85); border-radius: 14px; box-shadow: 0 0 24px rgba(80,200,255,.4), inset 0 0 40px rgba(80,200,255,.14); pointer-events: none; }
.ablock { position: absolute; z-index: 1; pointer-events: none; border-radius: 6px; background: linear-gradient(150deg, #3E5A4C, #22392E); border: 2px solid rgba(140,255,200,.5); box-shadow: 0 3px 8px rgba(0,0,0,.5), inset 0 0 0 2px rgba(0,0,0,.25); }
.orbwrap { position: relative; display: inline-block; }
.abarrel { position: absolute; left: 50%; top: 50%; width: 27px; height: 8px; margin-top: -4px; transform-origin: 0 50%; border-radius: 4px; background: linear-gradient(90deg, rgba(255,255,255,.15), #FFC93D); box-shadow: 0 0 8px rgba(255,201,61,.8); pointer-events: none; }
.ashell { position: absolute; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%; z-index: 3; pointer-events: none; transition: left .25s linear, top .25s linear; background: radial-gradient(circle at 40% 38%, #FFF6D8, #FFC93D 55%, #FF7A1A); box-shadow: 0 0 12px rgba(255,190,60,.95), 0 0 26px rgba(255,140,30,.55); }
.bhard { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: linear-gradient(150deg, #6B7280, #374151); border: 2px solid rgba(220,230,255,.4); box-shadow: inset 0 0 0 2px rgba(0,0,0,.3), 0 3px 7px rgba(0,0,0,.5); }
.bsoft { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: linear-gradient(150deg, #C98A4B, #96622A); border: 2px solid rgba(255,214,150,.55); box-shadow: inset 0 0 0 2px rgba(0,0,0,.22), 0 3px 7px rgba(0,0,0,.45); }
.abomb { position: absolute; z-index: 2; transform: translate(-50%, -50%); pointer-events: none; font-size: 30px; line-height: 1; filter: drop-shadow(0 0 10px rgba(255,90,40,.75)); animation: bombPulse .5s ease-in-out infinite alternate; }
@keyframes bombPulse { from { transform: translate(-50%, -50%) scale(1); } to { transform: translate(-50%, -50%) scale(1.22); } }
.ablast { position: absolute; z-index: 2; pointer-events: none; border-radius: 6px; background: radial-gradient(circle, rgba(255,240,190,.95), rgba(255,140,40,.75) 60%, rgba(255,80,20,.25)); box-shadow: 0 0 18px rgba(255,150,50,.8); }
.aslime { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50% 50% 46% 46%; z-index: 1; pointer-events: none; transition: left .25s linear, top .25s linear; background: radial-gradient(circle at 36% 30%, #C6FF9E, #58C472 55%, #1E7A46); box-shadow: 0 0 14px rgba(90,230,140,.75), 0 4px 7px rgba(0,0,0,.4); }
.aslime.big { width: 46px; height: 46px; margin: -23px 0 0 -23px; }
.aslime i { position: absolute; top: 32%; width: 5px; height: 7px; border-radius: 50%; background: #10331C; }
.aslime i:first-child { left: 30%; } .aslime i:last-child { right: 30%; }
.acrystal { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1; text-align: center; pointer-events: none; font-size: 44px; line-height: 1; filter: drop-shadow(0 0 16px rgba(120,230,255,.9)); }
.acrystal .chp { font-size: 13px; letter-spacing: 1px; }
.pips { display: flex; gap: 9px; justify-content: center; margin: 16px 0; }
.pip { width: 30px; height: 30px; border-radius: 50%; border: 3px solid rgba(255,255,255,.5); background: rgba(255,255,255,.08); }
.pip.done { background: #FFC93D; border-color: #FFE9A8; box-shadow: 0 0 16px rgba(255,201,61,.85); }
.pip.now { border-color: #FFC93D; animation: ringPulse .6s ease-in-out infinite alternate; }
.symbtn { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; border: none; border-radius: 16px; padding: 16px 0; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.45); box-shadow: 0 5px 0 rgba(0,0,0,.3); }
.symgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.impq { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
.impq .qcard { background: rgba(255,255,255,.1); border: 2px solid rgba(255,255,255,.25); border-radius: 16px; padding: 14px; }
.mystep { display: inline-block; background: rgba(255,255,255,.13); border-radius: 12px; padding: 7px 13px; margin: 4px; font-weight: 800; }
.g-cheo-thuyen { background-color: #02141F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(56,189,248,.3), transparent 62%), linear-gradient(rgba(125,211,252,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,.05) 1px, transparent 1px), linear-gradient(165deg, #062A3F, #083A56 58%, #02101A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,16,26,.5); }
.g-day-ra { background-color: #170A18; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,92,60,.34), transparent 62%), linear-gradient(rgba(255,130,90,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,130,90,.055) 1px, transparent 1px), linear-gradient(165deg, #1D0B20, #2B0A18 58%, #140A24); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(20,4,16,.45); }
.g-ne-dan { background-color: #0C0618; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(190,90,255,.3), transparent 62%), linear-gradient(rgba(170,120,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(170,120,255,.05) 1px, transparent 1px), linear-gradient(165deg, #150826, #200A33 58%, #0A0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(14,4,28,.5); }
.g-keo-co { background-color: #04140F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(45,230,190,.22), transparent 62%), linear-gradient(rgba(120,255,220,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,220,.045) 1px, transparent 1px), linear-gradient(165deg, #06231B, #052A1E 58%, #03130E); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,20,14,.5); }
.g-chia-cuop { background-color: #0D0A22; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(130,110,255,.28), transparent 62%), linear-gradient(rgba(150,140,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(150,140,255,.05) 1px, transparent 1px), linear-gradient(165deg, #171038, #120A2E 58%, #0A0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(8,4,24,.5); }
.stage.neon-stage h2 { text-shadow: 0 0 18px rgba(130,190,255,.35), 0 3px 0 rgba(0,0,0,.35); }
.aball { position: absolute; width: 26px; height: 26px; border-radius: 50%; z-index: 1;
  background: radial-gradient(circle at 35% 32%, #FFE3B3, #FF8C42 55%, #D63C14); transform: translate(-50%, -50%);
  transition: left .25s linear, top .25s linear; box-shadow: 0 0 16px rgba(255,140,50,.9), 0 0 34px rgba(255,90,30,.45), 0 4px 8px rgba(0,0,0,.35); }
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
.ablob { position: absolute; transform: translate(-50%, -50%); transition: left .25s linear, top .25s linear; text-align: center; z-index: 2; }
.ablob svg { filter: drop-shadow(0 0 9px currentColor); display: block; margin: 0 auto; }
.ablob.holder svg { filter: drop-shadow(0 0 16px #FFC93D) drop-shadow(0 0 5px #FFC93D); }
.astar { position: absolute; transform: translate(-50%, -50%); z-index: 1; font-size: 24px; line-height: 1; color: #FFE066;
  text-shadow: 0 0 10px rgba(255,205,60,.95), 0 0 22px rgba(255,170,30,.55), 0 2px 3px rgba(0,0,0,.4); animation: starBob 1.6s ease-in-out infinite; pointer-events: none; }
.astar.gold { font-size: 36px; color: #FFC93D; text-shadow: 0 0 14px rgba(255,201,61,1), 0 0 34px rgba(255,160,20,.8), 0 2px 4px rgba(0,0,0,.45); }
@keyframes starBob { 0%,100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -62%) scale(1.12); } }
.acrown { position: absolute; transform: translate(-50%, -135%); z-index: 3; pointer-events: none;
  transition: left .25s linear, top .25s linear; filter: drop-shadow(0 0 12px rgba(255,201,61,.9)); animation: starBob 2s ease-in-out infinite; }
.acrate { position: absolute; width: 13.3%; aspect-ratio: 1; transform: translate(-50%, -50%); z-index: 2; pointer-events: none;
  transition: left .25s linear, top .25s linear; display: flex; align-items: center; justify-content: center; font-size: 30px;
  background: linear-gradient(150deg, #B97B34, #8A5518); border: 3px solid #E8B96A; border-radius: 9px;
  box-shadow: 0 0 18px rgba(255,180,80,.5), 0 6px 12px rgba(0,0,0,.45), inset 0 0 0 3px rgba(0,0,0,.18); }
.agoal { position: absolute; z-index: 0; pointer-events: none; border: 3px dashed #3ED97E; border-radius: 10px;
  background: rgba(62,217,126,.14); box-shadow: 0 0 22px rgba(62,217,126,.5), inset 0 0 26px rgba(62,217,126,.28);
  display: flex; align-items: center; justify-content: center; color: #8FF5B8; font-family: 'Baloo 2', cursive; font-weight: 800; letter-spacing: 2px; animation: ringPulse 1.1s ease-in-out infinite alternate; }
.awallseg { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px;
  background: linear-gradient(150deg, #5A4632, #3A2C1D); border: 2px solid rgba(232,185,106,.55); box-shadow: 0 3px 8px rgba(0,0,0,.5), inset 0 0 0 2px rgba(0,0,0,.25); }
.teambanner { background: linear-gradient(135deg, #FFD93D, #FF9F1C); color: #4A2503; border-radius: 18px; padding: 14px 18px; margin: 10px 0;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 23px; text-align: center; box-shadow: 0 0 26px rgba(255,190,60,.55), 0 8px 18px rgba(0,0,0,.25); }
.mydirs { display: flex; gap: 8px; justify-content: center; align-items: center; margin: 6px 0; font-weight: 800; }
.mydirs .dirarrow { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px;
  background: linear-gradient(180deg, #FFE066, #FFB03A); color: #4A2503; font-size: 28px; box-shadow: 0 0 16px rgba(255,190,60,.75), 0 4px 0 rgba(120,70,0,.55); }
.water { position: relative; height: 150px; border-radius: 18px; margin: 14px 0; overflow: hidden;
  background: linear-gradient(180deg, rgba(56,189,248,.16), rgba(2,80,130,.4) 55%, rgba(1,40,70,.55)); box-shadow: inset 0 0 44px rgba(0,0,0,.4); }
.aboat { position: absolute; bottom: 26px; font-size: 56px; line-height: 1; transform: translateX(-50%); transition: left .4s ease; filter: drop-shadow(0 6px 8px rgba(0,0,0,.45)); }
.buoy { position: absolute; right: 6px; bottom: 22px; font-size: 44px; line-height: 1; }
.beating { position: absolute; left: 50%; top: 44%; width: 118px; height: 118px; margin: -59px 0 0 -59px; border-radius: 50%; pointer-events: none;
  border: 5px solid rgba(255,224,102,.9); box-shadow: 0 0 22px rgba(255,210,80,.55), inset 0 0 18px rgba(255,210,80,.3); opacity: 0; }
.tapbtn.rowbtn { background: linear-gradient(180deg, #38BDF8, #0369A1); }
.tapbtn.rowbtn.now { background: linear-gradient(180deg, #FFE066, #FF9F1C); color: #4A2503; box-shadow: 0 0 34px rgba(255,200,60,.9); animation: pop .25s ease; }
.splatgrid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: repeat(12, 1fr); gap: 2px; z-index: 0; }
.scell { border-radius: 3px; background: rgba(255,255,255,.07); }
.duel-bang { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 120px; line-height: 1.1; text-align: center; color: #FFC93D;
  text-shadow: 0 0 34px rgba(255,180,40,.75), 0 6px 0 #7C2D12, 0 12px 30px rgba(0,0,0,.55); animation: pop .3s ease; }
.gamecard.soon { cursor: default; opacity: .72; filter: saturate(.55); }
.cathead { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 26px; color: #7C4F27; margin: 20px 0 0; }
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
#recon { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); background: #B3261E; color: #FFE9E6; font-weight: 700;
  padding: 9px 18px; border-radius: 999px; box-shadow: 0 10px 22px rgba(0,0,0,.35); display: none; z-index: 60; max-width: 92vw; text-align: center; }
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
<div id="recon">Đang kết nối lại…</div>
<script>
var COLORS = { blue: '#4FA8E8', pink: '#F77FB0', green: '#58C472', purple: '#A78BFA', orange: '#FFB35C' };
var LIGHT = { blue: '#9AD1F5', pink: '#FFB3D1', green: '#A9E8B2', purple: '#CDBFFD', orange: '#FFD29B' };
var MEM = ['#E84F4F', '#58C472', '#4FA8E8', '#FFC93D'];
var MEMNAME = ['Đỏ', 'Xanh lá', 'Xanh dương', 'Vàng'];
var SYMNAMES = ['ĐỎ', 'XANH', 'VÀNG', 'HỒNG'];
var SYMCOLORS = ['#FF4757', '#3FA9F5', '#FFC93D', '#F77FB0'];
var LETTERS = ['A', 'B', 'C', 'D'];
var S = { role: null, code: null, token: null, seat: null, view: null, sig: '', serverOffset: 0,
  audio: null, muted: localStorage.getItem('np_muted') === '1', lastCd: -1, lastTickSec: -1,
  fxReveal: '', fxRound: '', fxConfetti: '', guess: '', blobN: 0, fxP: null, _nb: null, _koT: 0, _smT: 0,
  lastOkAt: 0 };
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
    + '<defs><radialGradient id="' + gid + '" cx="0.35" cy="0.3" r="0.95"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#E8ECF5"/><stop offset="1" stop-color="#9AA7C2"/></radialGradient></defs>'
    + '<circle cx="50" cy="50" r="44" fill="url(#' + gid + ')"/>'
    + arcs
    + visor
    + '<ellipse cx="33" cy="23" rx="13" ry="7" fill="#ffffff" opacity="0.6" transform="rotate(-20 33 23)"/>'
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
// 220ms in-game poll) an outage never registers and the screen can sit
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
function poll() {
  if (!S.code) return;
  api(stateUrl(), null, function (v) {
    if (v && v.ok) { S.failN = 0; S.failSince = 0; S.view = v; S.serverOffset = v.serverNow - Date.now(); noteOk(); render(); return; }
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
function act(body, cb) {
  body.role = S.role; body.token = S.token;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok) { S.view = v; S.serverOffset = v.serverNow - Date.now(); S.sig = ''; noteOk(); render(); }
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
  'chia-cuop': 'linear-gradient(160deg,#241457,#4C2FA8)',
  'cuop-sao': 'linear-gradient(160deg,#8A5A00,#E8A812)', 'giu-vuong-mien': 'linear-gradient(160deg,#5B21B6,#B8860B)',
  'son-san': 'linear-gradient(160deg,#0E7490,#22C55E)', 'cao-boi': 'linear-gradient(160deg,#7C2D12,#B45309)',
  'chung-mot-than': 'linear-gradient(160deg,#312E81,#7C3AED)', 'day-hop': 'linear-gradient(160deg,#92400E,#D97706)',
  'cheo-thuyen': 'linear-gradient(160deg,#0C4A6E,#0284C7)',
  'xe-tank': 'linear-gradient(160deg,#14532D,#22C55E)', 'dat-bom': 'linear-gradient(160deg,#7C2D12,#F97316)',
  'ke-gia-mao': 'linear-gradient(160deg,#4C1D95,#A855F7)',
  'thu-thanh': 'linear-gradient(160deg,#0E7490,#67E8F9)', 'giai-ma-chung': 'linear-gradient(160deg,#3730A3,#818CF8)'
};
function noX2(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'cuop-sao' || id === 'giu-vuong-mien' || id === 'son-san' || id === 'chung-mot-than' || id === 'day-hop' || id === 'cheo-thuyen' || id === 'xe-tank' || id === 'dat-bom' || id === 'thu-thanh' || id === 'giai-ma-chung'; }
function isActionGame(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'chia-cuop' || id === 'cuop-sao' || id === 'giu-vuong-mien' || id === 'son-san' || id === 'chung-mot-than' || id === 'day-hop' || id === 'cheo-thuyen' || id === 'xe-tank' || id === 'dat-bom' || id === 'thu-thanh'; }
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
    // Game chooser, grouped by category: versus games race for
    // placement points; co-op games score the whole team one tier.
    function gameCard(gm) {
      var small = gm.cat === 'coop' ? '1 trận hợp tác · Cả đội cùng nhận điểm theo hạng' : (gm.rounds > 1 ? gm.rounds + ' vòng · Vòng cuối ×2 điểm' : '1 trận sống còn · 300/200/100/50');
      return '<button class="gamecard" style="background:' + GCOLORS[gm.id] + '" data-cmd="start" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">' + small + '</p></button>';
    }
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
  } else if (g.id === 'cuop-sao') {
    if (g.phase === 'steal') {
      h += '<div class="baloo" style="font-size:25px">Nhặt sao vàng, xô đối thủ cho rơi sao! Sao lớn = 3 sao thường</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div>';
      if (g.stars) for (var sI2 = 0; sI2 < g.stars.length; sI2++) { var st = g.stars[sI2]; h += '<div class="astar' + (st.gold ? ' gold' : '') + '" id="astar-' + st.id + '" style="left:' + ((st.x + 12) / 24 * 100) + '%;top:' + ((st.y + 12) / 24 * 100) + '%">★</div>'; }
      for (var aI2 = 0; aI2 < v.players.length; aI2++) { var ap2 = v.players[aI2]; h += '<div class="ablob" id="ablob-' + ap2.seat + '" style="left:50%;top:50%;color:' + COLORS[ap2.color] + '">' + orbSVG(ap2.color, 46) + '<div class="aname">' + esc(ap2.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var bI = 0; bI < v.players.length; bI++) { var bp = v.players[bI]; h += '<span class="scorechip">' + orbSVG(bp.color, 26) + ' ' + esc(bp.name) + ' · ★ ' + (g.banked ? (g.banked[bp.seat] || 0) : 0) + '</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'giu-vuong-mien') {
    if (g.phase === 'crown') {
      h += '<div class="baloo" style="font-size:25px">Giành vương miện và giữ càng lâu càng tốt! Bị xô là rơi vương miện</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div><div class="acrown" id="acrown" style="left:50%;top:50%">' + crownSVG(44) + '</div>';
      for (var cI3 = 0; cI3 < v.players.length; cI3++) { var cp3 = v.players[cI3]; h += '<div class="ablob" id="ablob-' + cp3.seat + '" style="left:50%;top:50%;color:' + COLORS[cp3.color] + '">' + orbSVG(cp3.color, 46) + '<div class="aname">' + esc(cp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var hI = 0; hI < v.players.length; hI++) { var hp = v.players[hI]; h += '<span class="scorechip">' + orbSVG(hp.color, 26) + ' ' + esc(hp.name) + ' · 👑 <span id="holdn-' + hp.seat + '">' + (g.hold ? (g.hold[hp.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'son-san') {
    if (g.phase === 'splat') {
      h += '<div class="baloo" style="font-size:25px">Chạy sơn sàn theo màu của mình — hết giờ ai nhiều ô nhất thắng!</div>';
      h += '<div class="afield" id="afield"><div class="splatgrid">';
      for (var gI = 0; gI < 144; gI++) { var gs = g.grid ? g.grid[gI] : 0; var gp2 = gs ? playerOf(v, gs) : null; h += '<div class="scell" id="scell-' + gI + '"' + (gp2 ? ' style="background:' + COLORS[gp2.color] + '"' : '') + '></div>'; }
      h += '</div>';
      for (var sI3 = 0; sI3 < v.players.length; sI3++) { var sp3 = v.players[sI3]; h += '<div class="ablob" id="ablob-' + sp3.seat + '" style="left:50%;top:50%;color:' + COLORS[sp3.color] + '">' + orbSVG(sp3.color, 40) + '<div class="aname">' + esc(sp3.name) + '</div></div>'; }
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
      h += '<div class="afield" id="afield"><div class="aring" style="width:83.4%;height:83.4%"></div>';
      for (var bI2 = 0; bI2 < (g.balls ? g.balls.length : 0); bI2++) h += '<div class="aball" id="nball-' + bI2 + '"></div>';
      if (g.star) h += '<div class="astar gold" id="cstar" style="left:' + ((g.star.x + 12) / 24 * 100) + '%;top:' + ((g.star.y + 12) / 24 * 100) + '%">★</div>';
      h += '<div class="ablob" id="sharedblob" style="left:50%;top:50%">' + sharedOrbSVG(v, 52) + '<div class="aname">CẢ ĐỘI</div></div>';
      h += '</div>';
      h += '<p class="center">Một quả bóng, bốn người lái — mỗi người giữ một hướng! Chạm sao ⭐ là +1 điểm kiểm tra · Trúng đạn là cả đội mất 1 tim</p>';
    }
  } else if (g.id === 'day-hop') {
    if (g.phase === 'box') {
      h += '<div class="scorebar"><span class="scorechip">📦 Đã giao: <b id="delivn">' + (g.deliveries || 0) + '</b> hộp</span><span class="scorechip">Mê cung ' + ((g.layout || 0) + 1) + '/3</span></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="afield" id="afield">';
      if (g.goal) h += '<div class="agoal" style="left:' + ((g.goal.x + 12) / 24 * 100) + '%;top:' + ((g.goal.y + 12) / 24 * 100) + '%;width:' + (g.goal.w / 24 * 100) + '%;height:' + (g.goal.h / 24 * 100) + '%">ĐÍCH</div>';
      if (g.walls) for (var wI = 0; wI < g.walls.length; wI++) { var wl = g.walls[wI]; h += '<div class="awallseg" style="left:' + ((wl.x + 12) / 24 * 100) + '%;top:' + ((wl.y + 12) / 24 * 100) + '%;width:' + (wl.w / 24 * 100) + '%;height:' + (wl.h / 24 * 100) + '%"></div>'; }
      h += '<div class="acrate" id="acrate" style="left:50%;top:50%">📦</div>';
      for (var pI3 = 0; pI3 < v.players.length; pI3++) { var pp3 = v.players[pI3]; h += '<div class="ablob" id="ablob-' + pp3.seat + '" style="left:50%;top:50%;color:' + COLORS[pp3.color] + '">' + orbSVG(pp3.color, 44) + '<div class="aname">' + esc(pp3.name) + '</div></div>'; }
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
      h += '<div class="afield" id="afield"><div class="aframe" style="left:11.67%;top:11.67%;width:76.67%;height:76.67%"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      if (g.blocks) for (var kI = 0; kI < g.blocks.length; kI++) { var kb = g.blocks[kI]; h += '<div class="ablock" style="left:' + ((kb.x + 12) / 24 * 100) + '%;top:' + ((kb.y + 12) / 24 * 100) + '%;width:' + (kb.w / 24 * 100) + '%;height:' + (kb.h / 24 * 100) + '%"></div>'; }
      for (var tI2 = 0; tI2 < v.players.length; tI2++) { var tp2 = v.players[tI2]; var fc = g.facing ? g.facing[tp2.seat] : null; var deg = fc ? Math.round(Math.atan2(fc.y, fc.x) * 180 / Math.PI) : 0; h += '<div class="ablob" id="ablob-' + tp2.seat + '" style="left:50%;top:50%;color:' + COLORS[tp2.color] + '"><span class="orbwrap">' + orbSVG(tp2.color, 46) + '<span class="abarrel" id="barrel-' + tp2.seat + '" style="transform:rotate(' + deg + 'deg)"></span></span><div class="aname">' + esc(tp2.name) + '</div><div class="alives" id="alives-' + tp2.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Trúng đạn mất 1 mạng · Hết 3 mạng là bị loại · A: bắn · B: lướt nhanh</p>';
    }
  } else if (g.id === 'dat-bom') {
    if (g.phase === 'bomber') {
      h += '<div class="baloo" style="font-size:25px">Đặt bom phá tường gỗ, thổi bay đối thủ! Né xa vụ nổ chữ thập</div>';
      h += '<div class="afield" id="afield">';
      if (g.hard) for (var hI2 = 0; hI2 < g.hard.length; hI2++) h += '<div class="bhard" style="left:' + ((1 + 2 * g.hard[hI2][0]) / 24 * 100) + '%;top:' + ((3 + 2 * g.hard[hI2][1]) / 24 * 100) + '%;width:8.33%;height:8.33%"></div>';
      if (g.soft) for (var sI4 = 0; sI4 < g.soft.length; sI4++) h += '<div class="bsoft" style="left:' + ((1 + 2 * g.soft[sI4][0]) / 24 * 100) + '%;top:' + ((3 + 2 * g.soft[sI4][1]) / 24 * 100) + '%;width:8.33%;height:8.33%"></div>';
      if (g.blasts) for (var bI3 = 0; bI3 < g.blasts.length; bI3++) for (var cI5 = 0; cI5 < g.blasts[bI3].cells.length; cI5++) { var bc = g.blasts[bI3].cells[cI5]; h += '<div class="ablast" style="left:' + ((1 + 2 * bc[0]) / 24 * 100) + '%;top:' + ((3 + 2 * bc[1]) / 24 * 100) + '%;width:8.33%;height:8.33%"></div>'; }
      if (g.bombs) for (var boI = 0; boI < g.bombs.length; boI++) { var bo = g.bombs[boI]; h += '<div class="abomb" id="abomb-' + bo.id + '" style="left:' + ((bo.x + 12) / 24 * 100) + '%;top:' + ((bo.y + 12) / 24 * 100) + '%">💣</div>'; }
      for (var bI4 = 0; bI4 < v.players.length; bI4++) { var bp4 = v.players[bI4]; h += '<div class="ablob" id="ablob-' + bp4.seat + '" style="left:50%;top:50%;color:' + COLORS[bp4.color] + '">' + orbSVG(bp4.color, 42) + '<div class="aname">' + esc(bp4.name) + '</div><div class="alives" id="alives-' + bp4.seat + '"></div></div>'; }
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
      h += '<div class="afield" id="afield"><div class="aring" style="width:83.4%;height:83.4%"></div>';
      h += '<div class="acrystal">💎<div class="chp" id="crystalhearts">' + (g.crystal ? '❤'.repeat(Math.max(0, g.crystal.hp)) : '') + '</div></div>';
      for (var dI4 = 0; dI4 < v.players.length; dI4++) { var dp4 = v.players[dI4]; var fc2 = g.facing ? g.facing[dp4.seat] : null; var deg2 = fc2 ? Math.round(Math.atan2(fc2.y, fc2.x) * 180 / Math.PI) : 0; h += '<div class="ablob" id="ablob-' + dp4.seat + '" style="left:50%;top:50%;color:' + COLORS[dp4.color] + '"><span class="orbwrap">' + orbSVG(dp4.color, 46) + '<span class="abarrel" id="barrel-' + dp4.seat + '" style="transform:rotate(' + deg2 + 'deg)"></span></span><div class="aname">' + esc(dp4.name) + '</div></div>'; }
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
  }
  return h;
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
      gp = pl ? [g.id, g.phase, ak2, g.lastRound] : [g.id, g.phase, ak2, g.balls ? g.balls.length : 0, g.lastRound];
    } else if (g.id === 'keo-co') {
      gp = pl ? [g.id, g.phase, Math.round((g.knot || 0) / 9), g.lastRound] : [g.id, g.phase, g.knot, g.presses, g.lastRound];
    } else if (g.id === 'chia-cuop') {
      gp = [g.id, g.phase, g.round, g.points, g.chosen, g.chat, g.reveal, g.mineChosen, g.lastRound];
    } else if (g.id === 'cuop-sao') {
      gp = pl ? [g.id, g.phase, g.banked ? g.banked[S.seat] : 0, g.lastRound] : [g.id, g.phase, g.banked, g.stars, g.lastRound];
    } else if (g.id === 'giu-vuong-mien') {
      gp = [g.id, g.phase, g.crown ? g.crown.holder : '-', g.lastRound];
    } else if (g.id === 'son-san') {
      gp = [g.id, g.phase, g.lastRound];
    } else if (g.id === 'chung-mot-than') {
      gp = pl ? [g.id, g.phase, g.hearts, g.checks, g.owners, g.lastRound]
        : [g.id, g.phase, g.hearts, g.checks, g.owners, g.star, g.balls ? g.balls.length : 0, g.lastRound];
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
      gp = pl ? [g.id, g.phase, bk, g.lastRound]
        : [g.id, g.phase, bk, g.bombs ? g.bombs.length : 0, g.soft ? g.soft.length : 0, g.blasts, g.lastRound];
    } else if (g.id === 'thu-thanh') {
      gp = [g.id, g.phase, g.crystal ? g.crystal.hp : 0, g.kills, g.lastRound];
    } else if (g.id === 'ke-gia-mao') {
      gp = [g.id, g.phase, g.round, g.points, g.answered, g.voted, g.chatLog, g.reveal, g.mine, g.myVote, g.lastRound];
    } else if (g.id === 'giai-ma-chung') {
      gp = pl ? [g.id, g.phase, g.level, g.hearts, g.done, g.mySteps, g.levelsDone, g.lastRound]
        : [g.id, g.phase, g.level, g.hearts, g.done, g.total, g.levelsDone, g.lastRound];
    } else {
      if (pl) {
      // PLAYER signature for the tap/answer games: keep only what the
      // phone actually renders and what changes on real game events.
      // Dropped vs the host signature: g.mine as a raw counter (dua-bam
      // mine = my own tap count, nho-mau mine.taps — both change with
      // EVERY press I make, and tick() already refreshes the on-screen
      // counters from the raw view), and g.answered / g.guessed /
      // g.statuses, which track the OTHER players and are never drawn
      // on the phone. Rebuilding the controls mid-press is what ate
      // real finger presses; the host signature is unchanged.
      var pm = g.mine;
      if (g.id === 'nho-mau' && pm) pm = pm.status;
      else if (g.id === 'dua-bam') pm = null;
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, pm, g.myStreak];
    } else {
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, g.answered, g.guessed, g.statuses, g.mine];
    }
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
      if (moved > 1.4) {
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
// Create/move/remove the transient field entities (shells, slimes)
// whose DOM nodes cannot be rendered once by hostStage: they are keyed
// by server id inside #afield and pruned when the server drops them.
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
      field.appendChild(n);
    }
    n.style.left = ((it.x + 12) / 24 * 100) + '%';
    n.style.top = ((it.y + 12) / 24 * 100) + '%';
  }
  var olds = field.querySelectorAll('.' + cls);
  for (var j = 0; j < olds.length; j++) if (!seen[olds[j].id]) olds[j].remove();
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
function patchPositions(v) {
  var g = v && v.game;
  if (!g) return;
  var t = serverNow();
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
  if (g && (g.id === 'xe-tank' || g.id === 'dat-bom' || g.id === 'thu-thanh') && g.blobs) {
    for (var wSeat in g.blobs) {
      var wb = g.blobs[wSeat];
      var wn = el('ablob-' + wSeat);
      if (wn) {
        wn.style.left = ((wb.x + 12) / 24 * 100) + '%';
        wn.style.top = ((wb.y + 12) / 24 * 100) + '%';
        wn.style.opacity = wb.alive ? '1' : '0.25';
      }
      var lv2 = el('alives-' + wSeat);
      if (lv2) lv2.textContent = '❤'.repeat(Math.max(0, wb.lives));
      var brl = el('barrel-' + wSeat);
      if (brl && g.facing && g.facing[wSeat]) brl.style.transform = 'rotate(' + Math.round(Math.atan2(g.facing[wSeat].y, g.facing[wSeat].x) * 180 / Math.PI) + 'deg)';
    }
    var ml2 = el('mylives');
    if (ml2 && g.blobs[S.seat]) ml2.textContent = '❤'.repeat(Math.max(0, g.blobs[S.seat].lives));
    if (g.shells) syncDyn(g.shells, 'shell-', 'ashell', null);
    if (g.id === 'xe-tank' || g.id === 'dat-bom') arenaFX(v, g);
  }
  if (g && g.id === 'thu-thanh') {
    if (g.slimes) syncDyn(g.slimes, 'slime-', 'aslime', function (n, it) { n.className = 'aslime' + (it.big ? ' big' : ''); n.innerHTML = '<i></i><i></i>'; });
    var ch2 = el('crystalhp'); if (ch2 && g.crystal) ch2.textContent = g.crystal.hp;
    var chh = el('crystalhearts'); if (chh && g.crystal) chh.textContent = '❤'.repeat(Math.max(0, g.crystal.hp));
    var kn = el('killn'); if (kn) kn.textContent = g.kills || 0;
    var chp2 = el('crystalhp2'); if (chp2 && g.crystal) chp2.textContent = g.crystal.hp;
    var kn2 = el('killn2'); if (kn2) kn2.textContent = g.kills || 0;
  }
  if (g && (g.id === 'cuop-sao' || g.id === 'giu-vuong-mien' || g.id === 'son-san') && g.blobs) {
    for (var nSeat in g.blobs) {
      var nb2 = g.blobs[nSeat];
      var nn = el('ablob-' + nSeat);
      if (nn) {
        nn.style.left = ((nb2.x + 12) / 24 * 100) + '%';
        nn.style.top = ((nb2.y + 12) / 24 * 100) + '%';
        if (g.id === 'giu-vuong-mien') nn.className = 'ablob' + (g.crown && g.crown.holder === +nSeat ? ' holder' : '');
      }
    }
    if (g.id === 'cuop-sao') {
      var mb2 = el('mybank'); if (mb2) mb2.textContent = g.mine || 0;
      for (var sN = 0; sN < (g.stars ? g.stars.length : 0); sN++) {
        var sEl = el('astar-' + g.stars[sN].id);
        if (sEl) { sEl.style.left = ((g.stars[sN].x + 12) / 24 * 100) + '%'; sEl.style.top = ((g.stars[sN].y + 12) / 24 * 100) + '%'; }
      }
    }
    if (g.id === 'giu-vuong-mien') {
      var cr2 = el('acrown');
      if (cr2 && g.crown) {
        var cx2 = g.crown.x, cy2 = g.crown.y;
        if (g.crown.holder && g.blobs[g.crown.holder]) { cx2 = g.blobs[g.crown.holder].x; cy2 = g.blobs[g.crown.holder].y; }
        cr2.style.left = ((cx2 + 12) / 24 * 100) + '%';
        cr2.style.top = ((cy2 + 12) / 24 * 100) + '%';
      }
      for (var hSeat in g.hold || {}) { var hn2 = el('holdn-' + hSeat); if (hn2) hn2.textContent = g.hold[hSeat]; }
      var mh2 = el('myhold'); if (mh2) mh2.textContent = g.mine || 0;
    }
    if (g.id === 'son-san' && g.grid) {
      for (var ci2 = 0; ci2 < 144; ci2++) {
        var cell2 = el('scell-' + ci2); if (!cell2) continue;
        var own2 = g.grid[ci2]; var cp2 = own2 ? playerOf(v, own2) : null;
        cell2.style.background = cp2 ? COLORS[cp2.color] : 'rgba(255,255,255,.07)';
      }
      for (var cSeat in g.counts || {}) { var sn2 = el('scount-' + cSeat); if (sn2) sn2.textContent = g.counts[cSeat]; }
      var mc2 = el('mycells'); if (mc2) mc2.textContent = g.mine || 0;
    }
  }
  if (g && g.id === 'chung-mot-than' && g.shared) {
    var sb = el('sharedblob');
    if (sb) { sb.style.left = ((g.shared.x + 12) / 24 * 100) + '%'; sb.style.top = ((g.shared.y + 12) / 24 * 100) + '%'; }
    var cs = el('cstar');
    if (cs && g.star) { cs.style.left = ((g.star.x + 12) / 24 * 100) + '%'; cs.style.top = ((g.star.y + 12) / 24 * 100) + '%'; }
    if (g.balls) for (var cbi = 0; cbi < g.balls.length; cbi++) {
      var cb = el('nball-' + cbi);
      if (cb) { cb.style.left = ((g.balls[cbi].x + 12) / 24 * 100) + '%'; cb.style.top = ((g.balls[cbi].y + 12) / 24 * 100) + '%'; }
    }
    var cn = el('checkn'); if (cn) cn.textContent = g.checks || 0;
    var th = el('teamhearts'); if (th) th.textContent = '❤'.repeat(Math.max(0, g.hearts || 0));
    var thp = el('teamheartsp'); if (thp) thp.textContent = '❤'.repeat(Math.max(0, g.hearts || 0));
    var cnp = el('checknp'); if (cnp) cnp.textContent = g.checks || 0;
  }
  if (g && g.id === 'day-hop' && g.blobs) {
    for (var xSeat in g.blobs) {
      var xb = g.blobs[xSeat];
      var xn = el('ablob-' + xSeat);
      if (xn) { xn.style.left = ((xb.x + 12) / 24 * 100) + '%'; xn.style.top = ((xb.y + 12) / 24 * 100) + '%'; }
    }
    var crt = el('acrate');
    if (crt && g.crate) { crt.style.left = ((g.crate.x + 12) / 24 * 100) + '%'; crt.style.top = ((g.crate.y + 12) / 24 * 100) + '%'; }
    var dv = el('delivn'); if (dv) dv.textContent = g.deliveries || 0;
    var dvp = el('delivp'); if (dvp) dvp.textContent = g.deliveries || 0;
  }
  if (g && g.id === 'cheo-thuyen' && g.phase === 'row') {
    var pctR = Math.max(0, Math.min(100, (g.distance || 0) / (g.course || 400) * 100));
    var rp4 = el('rowprog'); if (rp4) rp4.style.width = pctR + '%';
    var rd = el('rowdist'); if (rd) rd.textContent = Math.round(g.distance || 0);
    var bt = el('aboat'); if (bt) bt.style.left = (4 + pctR * 0.9) + '%';
    var rb2 = el('rowbeat'); if (rb2) rb2.textContent = g.beat || 1;
    for (var rhSeat in g.hits || {}) { var rh = el('rowhit-' + rhSeat); if (rh) rh.textContent = g.hits[rhSeat]; }
    var ring2 = el('beating');
    if (ring2 && g.nextBeatAt) {
      var toBeat = g.nextBeatAt - t;
      var pr = Math.max(0, Math.min(1, 1 - toBeat / 1000));
      ring2.style.opacity = (0.2 + 0.8 * pr).toFixed(2);
      ring2.style.transform = 'scale(' + (0.65 + 0.45 * pr).toFixed(2) + ')';
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
  h += '<p class="muted">Màn hình lớn tạo phòng và hiện mã 6 số. Bạn bè mở trang này trên điện thoại, nhập mã là chơi — không cần cài app, không cần tài khoản.</p>';
  h += '</div>';
  h += '<div class="card center" style="margin-top:16px"><h2 style="margin:0 0 8px">Vào bằng điện thoại (tay cầm)</h2>';
  h += '<div class="digits">';
  for (var i = 0; i < 6; i++) h += '<input class="digit" id="d' + i + '" type="tel" maxlength="1" inputmode="numeric">';
  h += '</div>';
  h += '<p><input type="text" id="joinName" maxlength="14" placeholder="Tên của bạn" style="text-align:center"></p>';
  h += '<p><button class="btn pink" data-cmd="join" style="font-size:22px">Vào phòng</button></p></div>';
  h += '<p class="center muted small" style="margin-top:14px">21 game: Nhanh Tay · Đố Vui Tốc Độ · Đoán Số Chuẩn · Đua Bấm Nút · Nhớ Màu · Đẩy Ra Khỏi Sàn · Né Đạn · Kéo Co · Chia Hay Cướp · Cướp Sao · Giữ Vương Miện · Sơn Sàn · Cao Bồi · Xe Tăng Đấu Trường · Đặt Bom · Kẻ Giả Mạo · Chung Một Thân · Đẩy Hộp Về Đích · Chèo Thuyền · Thủ Thành · Giải Mã Chung — 16 game đấu + 5 game hợp tác!</p>';
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
  var h = '<div class="stage pstage g-' + g.id + (isActionGame(g.id) ? ' neon-stage' : '') + '">';
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
        h += '<div class="center baloo" style="font-size:23px">Đã bấm <span id="coltaps">' + mine.taps + '</span>/' + g.len + ' màu</div>';
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
  } else if (g.id === 'cuop-sao' || g.id === 'giu-vuong-mien' || g.id === 'son-san') {
    if (g.phase === 'steal' || g.phase === 'crown' || g.phase === 'splat') {
      if (g.id === 'cuop-sao') {
        h += '<div class="center baloo" style="font-size:22px">Sao của bạn: ★ <span id="mybank">' + (g.mine || 0) + '</span></div>';
        h += '<div class="padwrap"><div class="dpad">'
          + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
          + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
          + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
          + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>ĐẨY</span></button></div></div>';
        h += '<p class="center small">Bay qua sao là nhặt · A: xô mạnh, đối thủ rơi 1 sao · Sao lớn = 3 sao</p>';
      } else if (g.id === 'giu-vuong-mien') {
        var holderP = g.crown && g.crown.holder ? playerOf(v, g.crown.holder) : null;
        if (g.myCrown) h += '<div class="center baloo" style="font-size:23px;color:#FFC93D">👑 BẠN ĐANG GIỮ VƯƠNG MIỆN!</div>';
        else h += '<div class="center baloo" style="font-size:20px">' + (holderP ? 'Vương miện: ' + esc(holderP.name) + ' đang giữ' : 'Vương miện đang ở giữa sàn!') + '</div>';
        h += '<div class="center baloo" style="font-size:19px">Điểm giữ của bạn: <span id="myhold">' + (g.mine || 0) + '</span></div>';
        h += '<div class="padwrap"><div class="dpad">'
          + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
          + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
          + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
          + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>ĐẨY</span></button></div></div>';
        h += '<p class="center small">Chạm vào vương miện là đội lên đầu · Giữ càng lâu càng nhiều điểm · A: xô người giữ cho rơi</p>';
      } else {
        h += '<div class="center baloo" style="font-size:22px">Ô của bạn: <span id="mycells">' + (g.mine || 0) + '</span>/144</div>';
        h += '<div class="padwrap"><div class="dpad">'
          + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
          + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
          + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
          + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>SƠN</span></button></div></div>';
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
      var kpct2 = Math.max(3, Math.min(97, 50 + (g.knot / 84) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" style="left:' + kpct2 + '%"></div></div>';
      h += '<div class="center baloo" style="font-size:21px">Bạn đã kéo: <span id="mypull">' + (g.presses ? (g.presses[S.seat] || 0) : 0) + '</span> lần</div>';
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
  } else if (g.id === 'chung-mot-than') {
    if (g.phase === 'shared') {
      var arrowOf = { u: '▲', r: '▶', d: '▼', l: '◀' };
      h += '<div class="center baloo" style="font-size:21px">⭐ Đội: <span id="checknp">' + (g.checks || 0) + '</span> điểm · Tim: <span id="teamheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span></div>';
      h += '<div class="mydirs">Bạn giữ:';
      var md = g.myDirs || [];
      for (var dI4 = 0; dI4 < md.length; dI4++) h += '<span class="dirarrow">' + arrowOf[md[dI4]] + '</span>';
      h += '</div>';
      h += '<div class="padwrap"><div class="dpad">'
        + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
        + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
        + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
        + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>Đẩy</span></button></div></div>';
      h += '<p class="center small">Cả đội lái CHUNG một quả bóng — chỉ hướng của bạn mới chạy theo tay bạn. Phối hợp đưa bóng chạm sao ⭐, né đạn!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - 60000) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'day-hop') {
    if (g.phase === 'box') {
      h += '<div class="center baloo" style="font-size:22px">📦 Đội đã giao: <span id="delivp">' + (g.deliveries || 0) + '</span> hộp</div>';
      h += '<div class="padwrap"><div class="dpad">'
        + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
        + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
        + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
        + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>Đẩy</span></button></div></div>';
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
        h += '<div class="padwrap"><div class="dpad">'
          + '<span></span><button class="dbtn" data-pad="u">▲</button><span></span>'
          + '<button class="dbtn" data-pad="l">◀</button><span></span><button class="dbtn" data-pad="r">▶</button>'
          + '<span></span><button class="dbtn" data-pad="d">▼</button><span></span></div>'
          + '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>Lướt</span></button><button class="abtn abtnA" data-pad="a">A<span>' + (g.id === 'dat-bom' ? 'ĐẶT BOM' : 'BẮN') + '</span></button></div></div>';
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
    if (v && v.ok) { S.role = 'player'; S.code = code; S.token = v.playerToken; S.seat = v.seat; noteOk(); saveSession(); S.sig = ''; poll(); return; }
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
var GAME_CMDS = { tap: 1, answer: 1, color: 1, key: 1, guessSubmit: 1, choose: 1, vote: 1, symbol: 1 };
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
      if (v && v.ok) { S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; noteOk(); saveSession(); S.sig = ''; poll(); }
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
    var cv = el('coltaps'); if (cv) cv.textContent = (+cv.textContent || 0) + 1;
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
  }
});
S.padState = { u: false, d: false, l: false, r: false, a: false, b: false };
S.padPointers = {};
function sendPad() {
  if (!S.code || S.role !== 'player') return;
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
    markCmdGuard(node, node.getAttribute('data-cmd'));
    runCmd(node);
  }
});
function padRelease(ev) {
  var bit = S.padPointers[ev.pointerId];
  if (bit) padSet(bit, false, ev.pointerId);
  clearPadFx();
}
document.addEventListener('pointerup', padRelease);
document.addEventListener('pointercancel', padRelease);
window.addEventListener('blur', function () {
  S.padPointers = {};
  var changed = false;
  for (var k in S.padState) if (S.padState[k]) { S.padState[k] = false; changed = true; }
  if (changed) sendPad();
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
        markCmdGuard(node, node.getAttribute('data-cmd'));
        runCmd(node);
      }
    }
  }, { passive: false });
  function touchEnd(ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var pid = 't' + ev.changedTouches[i].identifier;
      var bit = S.padPointers[pid];
      if (bit) padSet(bit, false, pid);
    }
    clearPadFx();
  }
  document.addEventListener('touchend', touchEnd);
  document.addEventListener('touchcancel', touchEnd);
  document.addEventListener('mousedown', function (ev) {
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
  document.addEventListener('mouseup', function () {
    if (S.padPointers.mouse) padSet(S.padPointers.mouse, false, 'mouse');
    clearPadFx();
  });
}
(function init() {
  try {
    var raw = sessionStorage.getItem('np_session');
    if (raw) { var s = JSON.parse(raw); if (s && s.code && s.token) { S.role = s.role; S.code = s.code; S.token = s.token; S.seat = s.seat; S.lastOkAt = Date.now(); } }
  } catch (e) {}
  render();
  setInterval(poll, 800);
  setInterval(tick, 150);
  setInterval(function () {
    var v = S.view;
    if (v && v.game && ((v.game.id === 'nhanh-tay' && (v.game.phase === 'wait' || v.game.phase === 'go')) || (v.game.id === 'cao-boi' && (v.game.phase === 'wait' || v.game.phase === 'go')) || (v.game.id === 'day-ra' && v.game.phase === 'arena') || (v.game.id === 'ne-dan' && v.game.phase === 'dodge') || (v.game.id === 'keo-co' && v.game.phase === 'pull') || (v.game.id === 'cuop-sao' && v.game.phase === 'steal') || (v.game.id === 'giu-vuong-mien' && v.game.phase === 'crown') || (v.game.id === 'son-san' && v.game.phase === 'splat') || (v.game.id === 'chung-mot-than' && v.game.phase === 'shared') || (v.game.id === 'day-hop' && v.game.phase === 'box') || (v.game.id === 'cheo-thuyen' && v.game.phase === 'row') || (v.game.id === 'xe-tank' && v.game.phase === 'tank') || (v.game.id === 'dat-bom' && v.game.phase === 'bomber') || (v.game.id === 'thu-thanh' && v.game.phase === 'defend'))) poll();
  }, 220);
})();
</script>
</body>
</html>`;

