# ROUND 21 — FLAT: hình phẳng, đơn giản, dễ nhìn

User 25/11 18:32 (Asia/Bangkok): "nảy party này tôi chỉ muốn nó không
lag nữa và game dễ nhìn đơn giản thôi". Hai tiêu chí, một đợt riêng.

## Vấn đề (đo trước khi sửa, src/page.mjs)

- 99 gradient + 150 bóng/phát sáng/blur trong CSS; 17 nền sân, mỗi cái
  4 lớp (radial glow + lưới 34px + gradient chéo + vignette inset 130px).
- 17 animation, trong đó 7 chạy vô hạn trang trí: bob, poolGlow,
  poolShine, gemBob, starBob, ringPulse, crownPulse.
- 3 hàm SVG dùng gradient fill (blob, orb, shared orb) + ellipse bóng
  trắng trang trí.
- Lưu ý: PERF MODE / LITE MODE trước đây chỉ gỡ bóng khi ĐANG chơi
  sân; sảnh, thẻ game, nút vẫn giữ nguyên lớp nặng.

## Đã làm (chỉ CSS trong src/page.mjs + 3 hàm SVG, KHÔNG đụng luật
## chơi, vị trí, kích thước, tick, điểm)

- 21 nền sân (.g-* + .g-do-vui/.g-ma-soi/.g-ca-ngua/.g-tien-len) →
  một màu phẳng duy nhất, giữ đúng tông màu cũ, chữ trắng vẫn đọc rõ.
- 25 thẻ game lobby (GCOLORS) → màu phẳng (lấy đầu tối của cặp cũ).
- Nút/thẻ/sân: gradient → màu phẳng; bóng blur → chỉ còn viền lệch
  đặc 2–4px (không blur) hoặc bỏ hẳn; viền rõ giữ lại để phân biệt.
- Sân đấu (.afield): bỏ radial + lưới kẻ → nền phẳng mờ trắng 6%;
  vòng (.aring): bỏ radial + phát sáng → viền đặc 3px; vòng nguy hiểm
  → viền đỏ dày 5px thay vì nhấp nháy filter.
- Vật trên sân (bóng, đạn, thùng, gạch, xu, cửa, thuyền, bọt...):
  màu phẳng + viền đặc, bỏ phát sáng.
- Blob/orb SVG: fill gradient → màu đặc của ghế; bỏ ellipse bóng trắng.
- Bỏ 7 animation trang trí vô hạn. Giữ lại tín hiệu chơi thật:
  bombPulse (ngòi nổ), warnPulse (cảnh báo đạn tới), pop/spawnPop/
  boomPop/shake (phản hồi một lần), chuyển động nhân vật theo phím.

## Ngoại lệ có chủ đích (đều là thông tin chơi, không phải trang trí)

1. Dây Kéo Co: 1 linear-gradient chia đôi cứng 2 màu phẳng theo đội.
2. Người giữ vương miện: 1 drop-shadow, chỉ trong PERF MODE.
3. Bom: 1 animation vô hạn bombPulse = đồng hồ ngòi nổ.

## Kiểm chứng (25/11, local — CHƯA deploy, CHƯA chụp màn hình thật)

- Đếm lại trong worker.mjs đã build: radial-gradient 0,
  linear-gradient 1 (dây Kéo Co), text-shadow phát sáng 0,
  drop-shadow 1 (vương miện), infinite 1 (ngòi bom).
- node build.mjs OK (engine hash 349988a5ab); node --check worker.mjs OK.
- tests/local-test.mjs: ALL TESTS PASSED — 803 assertions.
- tests/deep-drive.mjs: 630 checks, 0 failures.
- tests/discrim-check.mjs: PASS.
- Thay đổi: src/page.mjs + worker.mjs (346 thêm / 384 bớt).

## Còn lại (cho delivery / main agent)

1. Deploy (wrangler) lên link thật — bản local này chưa lên sóng.
2. Chụp ảnh thật sảnh + 2–3 sân (Né Đạn, Đẩy Ra, Đền Lửa & Nước)
   để người dùng nhìn tận mắt hình phẳng.
3. Đo lại fps trên hồ sơ máy yếu (SwiftShader + throttle 4×) cho
   25 game — kỳ vọng không thấp hơn Round 20.4 (50–61 fps), vì chỉ
   nhẹ đi chứ không thêm gì.
4. Chốt cuối vẫn là người dùng chơi thử trên máy họ.
