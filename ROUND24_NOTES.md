# ROUND 24 — STRIP CHO MỌI GAME + KIỂM TOÁN ĐÓNG BĂNG (2026-11-27)

User 27/11 16:54: "ý là tất cả mọi game ấy" — lệnh lột đồ họa ở
Round 23 hoá ra mới chạm 15 game sân đấu. 16:58: "check kỹ loại bỏ
mọi thứ gây lag … tất cả mọi game".

## Đã làm

- PERF MODE (luật lột bóng/filter/bóng chữ) nay bật cho MỌI game
  khi đang chơi, không còn khoanh FIELD_GAMES (chỉ src/page.mjs,
  một điều kiện toggle). playhud giữ nguyên chỉ cho game sân đấu
  (đó là chế độ bố cục, không phải hiệu ứng). Kiểm chứng thật
  (rig-perf-all): trong ván Tiến Lên, #app mang class perf và nút
  bấm đo được box-shadow = none.

## Kiểm toán đóng băng (phép đo mới: rig-longtask)

Hồ sơ máy yếu (SwiftShader + throttle 4×), chế độ tại chỗ, 6 giây
chơi thật mỗi game, bộ đếm rAF độc lập + PerformanceObserver
longtask CHỈ tính trong lúc chơi (bản đầu dùng buffered:true nên
đếm cả khâu tải trang/dựng sân — đã sửa và đo lại):

- 24/25 game: 0 long task (>50ms), 0 khung khựng >34ms, 60 fps.
- ne-dan: 1 long task 57ms + 1 khung >34ms trong 6s (trùng thời
  điểm tia laze đầu tiên xuất hiện — mức một lần, không lặp).
- son-san / ma-soi / chung-mot-than: 1–2 khung >34ms, không có
  long task (phía compositor, không phải main thread).

Kết luận: trong lúc chơi, main thread sạch ở hồ sơ yếu nhất dựng
được. Phần cứng thật của người dùng vẫn là chốt cuối.

## Sau đợt này

Nghiên cứu UI các trang game lớn đã xong (UI_REFERENCE_NOTES.md) —
đợt giao diện dễ nhìn làm tiếp ngay sau, giữ phẳng/nhẹ.
