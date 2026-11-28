# Round 34 — Gọn giao diện + đúng màu/kích cỡ + thêm bàn & chi tiết (2026-11-28)

Ba lệnh của người dùng: (1) rà hết, bỏ nội dung thừa, tập trung nội dung/giao diện chính;
(2) màu sắc + hình ảnh phải đúng, kích cỡ các bàn và các phần phải đúng;
(3) thêm nhiều bàn chơi, mỗi bàn thêm chi tiết tăng độ khó + thú vị.

## 1. Bỏ nội dung thừa (src/page.mjs)
- Trang chủ: xoá đoạn giải thích dưới nút tạo phòng TV; thẻ phòng điện thoại rút còn 1 dòng;
  footer liệt kê 21 tên game → 1 dòng "21 game — 15 đấu · 6 hợp tác · phòng tới 12 người".
- Sảnh: xoá dòng chú thích dưới lưới ghế; xoá đoạn giải thích thẻ danh sách phát (giữ nút);
  xoá hẳn hàng "⭐ Hay nhất" (6 thẻ game trùng lặp — game vẫn còn nguyên trong nhóm của chúng).
- Thẻ chọn game: bỏ dòng chân điểm số ("300/200/100/50"…) ở thẻ bắt đầu thường;
  GIỮ chân khoá/thiếu người/danh sách phát vì đó là thông tin hành động.
- Sân chơi: bỏ dòng nhắc luật dài dưới sân cho 14 game (luật đã có trên thẻ chọn game);
  GIỮ banner mục tiêu trên sân và dòng trạng thái đêm của Ma Sói (thông tin trực tiếp).
- Bỏ bong bóng thoại của Máy (render + CSS + thành phần chữ ký renderMySeat).
- Trang điện thoại: bỏ dòng gợi ý bàn phím (kbHintHTML) — thừa trên thiết bị cảm ứng.
- GIỮ nguyên: gapline (đã tự ẩn khi đang chơi), scoreStrip, thẻ luật + dòng điều khiển trên thẻ game.

## 2. Màu + kích cỡ — đo thật, tất cả đều đúng (rig-sizes, 1600×900)
- Cờ Vua: bàn 590×590 (tỉ lệ 1.00), ô 73×73 — vuông tuyệt đối, màu chess.com #EEEED2/#769656.
- Cờ Cá Ngựa: 685×691 (≈1.00, vuông); góc sân theo thứ tự màu người chơi (đã đối chiếu ảnh).
- Tiến Lên: mặt bàn 1114×500 (oval 2.23). Sân đấu 1415×796 = 1.78, khớp không gian 34×19.2;
  Đua Máy Bay 1262×710 = 1.78; Đá Bóng 1484×750 = 1.98 khớp sân 38×19.2 — hình tròn không méo.
- Màu nhất quán: màu ghế dùng chung cho nhân vật/chip/cổng bay/bàn phím; laze THẤP đỏ / CAO tím;
  đội Đỏ/Xanh; Lửa cam / Nước xanh. Không phải sửa mục nào.

## 3. Bàn mới + chi tiết tăng độ khó (engine, xoay vòng layoutPick như cũ)
- Xe Tăng — bàn 4 "Kho Gỗ": 4 tường đá cổ điển + 5 thùng gỗ (soft): đạn bắn vỡ thùng
  (stepShells splice khỏi danh sách tường trực tiếp → view + tầm nhìn bot tự cập nhật).
  Probe: ván 4 đúng layout 3, 9 khối/5 thùng, bắn 1 phát → 8 khối, thùng biến mất.
- Đặt Bom — bàn 4 "Vòng Vây": vòng cột cứng quanh tâm (24 ô cứng); test [28,28,9,24].
- Né Laze — biến thể 1 "Dồn dập" (nhịp tia nhanh hơn, tia đôi từ tick 192, 50%);
  biến thể 2 "Chớp nhoáng" (cảnh báo 12→9 tick). laser-check cổ điển vẫn exact.
- Đua Máy Bay — "Nhiều mây" (8 mây), "Cổng xa" (7 mây + cổng cách ≥17 thay vì 13).
- Cướp Sao — "Sao Bay" (sao vàng trôi vòng tròn quanh điểm sinh, phải đuổi theo);
  "Mưa Sao" (mỗi 420 tick rơi thêm 2 sao, tối đa 8 sao trên sân).
- Giữ Vương Miện — "Vương Miện Nặng" (người giữ chậm thêm ×0.85 qua holderMul);
  "Khóa Lâu" (vương miện rơi khoá nhặt ×2 thời gian).
- Đá Bóng — bàn 2 "Sân Băng": ma sát bóng 0.9695→0.992 (bóng lăn xa hẳn) + sân xanh băng.
- Thủ Thành — "Slime Nhanh" (nhịp sinh ×0.78, slime to từ tick 240);
  "Slime Khổng Lồ" (50% slime to, 4 HP).
- Người Que — vũ khí rơi nhanh dần theo bàn: 144/110/84 tick (g.wpnEvery).
- Tên bàn hiện 1 lần trên thẻ đếm ngược (v.layoutName, chỉ khi không phải Cổ điển).

## 4. Lỗi thật tìm được nhờ chụp ảnh kiểm chứng
Ảnh chụp đầu tiên cho thấy ván 4 Xe Tăng vẫn là bàn cổ điển và sân bóng vẫn xanh cỏ:
chế độ TẠI CHỖ tạo phòng gương MỚI cho mỗi ván → bộ đếm xoay bàn (room._lay) luôn reset,
người chơi tại chỗ (cách chơi chính của người dùng) KHÔNG BAO GIỜ thấy bàn biến thể —
kể cả các bàn từ Round 33. Đã sửa: bộ đếm sống trên trang (S._laySeed) và được chia sẻ
theo tham chiếu vào từng phòng gương (localMirror). Chụp lại: ván 4 tại chỗ = Kho Gỗ
(5 thùng gỗ hiện rõ), ván 2 bóng đá tại chỗ = Sân Băng (sân xanh băng). rig-local-all 0 flagged.

## Kiểm chứng
- local-test 699 · deep-drive 504/0 · discrim 7 PASS · laser 21/21 · chess 21/21 · hostile 105/0.
- Probe xoay bàn: bóng đá Cổ điển→Sân Băng (ice=true); laze warn 12→12→9; bom hard 28→28→9→24.
- Ảnh: r34/home.png, lobby.png (gọn), tank-kho-go.png (thùng gỗ), soccer-ice.png (sân băng).
- Trang nhúng trích xuất + node --check OK.
