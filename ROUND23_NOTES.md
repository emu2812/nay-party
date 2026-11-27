# ROUND 23 — STRIP + NÉ LAZE (2026-11-27)

User 27/11 16:38: Round 22 "đỡ lag hơn rồi đó nhưng vẫn chậm lắm" —
lệnh: bỏ hết đồ họa gây lag và mọi vấn đề khác cho cực mượt; đổi
Né Đạn thành Né Laze, thêm chế độ nhảy lên để né.

## 1) STRIP — lột sạch hiệu ứng khi đang chơi

Một luật CSS duy nhất trong PERF MODE (src/page.mjs):
`#app.perf *, ::before, ::after { box-shadow: none !important;
filter: none !important; text-shadow: none !important;
backdrop-filter: none !important; }`
— ngoại lệ cuối cùng (vương miện giữ drop-shadow) cũng bỏ. Ngoài
lúc chơi, giao diện giữ nguyên. Luật chơi/vị trí/tick/điểm không đổi.

## 2) NÉ LAZE — viết lại game ne-dan (giữ id, giữ phase 'dodge')

- Bỏ hẳn đạn pháo (g.balls, spawn từ 4 cạnh, botBrain né đạn).
- Tia laze: hiện tia ngang/dọc toàn sân — WARN 12 tick (0,75s, tia
  mỏng nhấp nháy) → FIRE 7 tick (tia dày đặc) → biến mất. Nhịp ra
  tia: 34 tick → sàn 17 tick; sau tick 400 có 35% ra 2 tia.
  55% số tia nhắm vào tọa độ một người đang sống (±1,2).
- Hai loại: THẤP (đỏ, 62%) đánh người đang đứng đất — phải NHẢY;
  CAO (tím) đánh người đang trên không — phải đứng yên dưới đất.
  Bề nửa tia trúng: |lệch| < 1,0 đơn vị. Trúng: −1 mạng + 2s bất tử
  (như cũ); 3 mạng, 75s, điểm hạng như cũ.
- Nhảy: nút A (cạnh lên), trên không 10 tick (~0,62s), hồi 15 tick.
  Vẫn giữ lướt nhanh bằng B như cũ. Hình: nhân vật phóng to 1,3× +
  bóng đất phẳng (::after), class .air do patchPositions gắn.
- Bot: đọc tia báo trước — chạy thoát khỏi đường tia; tia thấp sắp
  bắn mà thoát không kịp thì nhảy; tia cao thì không nhảy. Nhịp
  quyết định theo độ khó 8/16/24 tick như cũ.
- Trang: tia là div phẳng (syncLasers, khóa theo id tia, đặt vị
  trí một lần, chỉ đổi class warn→fire), tối đa vài div mỏng —
  rẻ hơn nhiều so với hàng chục viên đạn cũ. Bỏ khối FX đạn trong
  arenaFX (nay là mã chết). Điện thoại: nút A ghi "NHẢY", có sân
  mini như cũ (tia vẽ chung qua syncLasers trên #afield).

## Kiểm chứng

- tests/laser-check.mjs (MỚI, engine trực tiếp, tia bơm tay):
  21/21 — warn không đánh; thấp bắn trúng người đứng đất; nhảy qua
  được tia thấp; tia cao trúng người nhảy, hụt người đứng đất;
  ngoài đường tia an toàn; tia tự sinh & tự mất; ván kết thúc trả
  điểm 300/200/100.
- Hồi quy: local-test 803, deep-drive 630/0, discrim PASS.
- rig-local-all: 25/25 game vào chế độ tại chỗ, FLAGGED 0.
- Ảnh thật hồ sơ yếu (rig-laser-shot): tia đỏ đang bắn + Phím 1
  đang nhảy (class air) — nay-party-shots/ne-laze.png.
- Đo hồ sơ yếu: ne-dan 60, day-ra 60, dat-bom 60 fps, 0 rebuild.

KHÔNG tuyên bố hết lag — chốt cuối vẫn là cảm giác người dùng.
