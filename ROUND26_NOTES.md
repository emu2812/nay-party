# ROUND 26 — RENDER DIET: BỎ REFLOW MỖI KHUNG HÌNH (2026-11-27)

User 27/11 20:26: "Vẫn chưa tốt cần tối ưu cực tốt hơn ở tất cả
mọi game". Lần này không đoán: dùng CDP profiler đo self-time
từng hàm trên hồ sơ máy yếu, chế độ tại chỗ, phòng 7 người.

## Số đo trước khi sửa (Né Laze / Đẩy Ra / Đá Bóng, 6 giây)

- getBoundingClientRect: 601–908ms = 10–15% TOÀN BỘ thời gian
  main thread — chi phí JS lớn nhất, gấp ~8 lần khâu thứ hai.
- Đếm trực tiếp (rectprobe): 179 lần đo trong 3 giây, TẤT CẢ từ
  vòng lặp vật bay (rafLoop) — vòng này cache theo khung hình nên
  vẫn đo lại kích thước sân MỖI khung; mỗi lần đo ép trình duyệt
  reflow toàn trang (vì khung trước vừa ghi transform) ≈ 2,4ms.
- Các khâu khác đều nhỏ: patchPositions ~1–2%, viewSig ~0,5%,
  buildView ~0,1%, GC ~1%. Engine/sim không phải vấn đề.

## Đã sửa (chỉ src/page.mjs)

1. Vòng vật bay dùng S.fieldRect (cache kích thước sân xuyên
   khung, writePos đã duy trì sẵn) thay vì đo mỗi khung. Cache bị
   xoá đúng hai chỗ: resize cửa sổ (có sẵn) và MỖI lần render()
   dựng lại sân (thêm một dòng cạnh S.sig = sig) — không bao giờ
   dùng kích thước cũ cho sân mới.
2. Mọi phần tử bay theo khung (.ablob, .aball, .ashell, .aring,
   .astar, .acrown, .acrate, .abomb, .aslime, .tgem, .ffly,
   .alaser) thêm will-change: transform — lớp compositor riêng,
   GPU di chuyển không phải vẽ lại.

## Số đo sau khi sửa

- rectprobe: 0 lần đo kích thước trong 3 giây chơi (trước: 179).
- rig-longtask: Né Laze giờ 0 long task, 0 khung khựng (trước có
  1 lần 57ms trùng tia đầu — chính là cú reflow đó); day-ra,
  da-bong, son-san đều 0/0, 60 fps.
- Hồi quy: local-test 804, laser-check 21/21, discrim PASS,
  deep-drive 630/0 (một lần chạy chung bị pump timeout ở Tiến
  Lên do nghẽn CPU máy đo — chạy lại riêng đạt; engine không đổi
  byte nào).
- Ảnh Né Laze sau sửa: vị trí nhân vật/chip tên đúng như trước.
