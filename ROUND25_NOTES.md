# ROUND 25 — GIAO DIỆN DỄ NHÌN THEO THAM KHẢO WEB LỚN (2026-11-27)

User 27/11 17:02: "tham khảo giao diện các game tương tự ở trang
web lớn mà làm cho dễ nhìn cho hợp lý". Nghiên cứu đầy đủ ở
UI_REFERENCE_NOTES.md (Bloop, Kahoot, Agar.io, Slither.io,
Jackbox, chuẩn 10-foot TV, telegraph, mù màu). Chỉ áp dụng những
gì giữ được phẳng + nhẹ; danh sách KHÔNG sao chép (gradient,
glow, bóng đổ, thumbnail động, skin ảnh) giữ nguyên không làm.

## Đã áp dụng (chỉ src/page.mjs — CSS + syncLasers + thẻ game)

1. Nhãn tên người chơi: chip nền tối ĐẶC (#0B0E1A thay cho mờ
   55%), chữ 15→17px đậm 800, viền trắng 2px — kênh nhận diện
   thứ hai sau màu (chuẩn Agar.io/Kahoot: không bao giờ chỉ màu).
2. Viền avatar: orb trong sân thêm stroke trắng 3.5px; blob ở
   sảnh/bảng điểm thêm stroke tối — avatar tách khỏi nền khi chạy.
3. Cỡ chữ màn hình lớn: banner hướng dẫn trong sân 28px mọi game;
   tiêu đề sân 24→27px; chip điểm trong sân 13→15px; nút đáp án
   Đố Vui 21→24px (hướng Kahoot: ô đáp án to, ít chữ).
4. Laze phân biệt bằng HÌNH, không chỉ màu: tia CAO vẽ thành HAI
   vạch song song có khe ở giữa (đứng dưới khe), tia THẤP một vạch
   đặc (nhảy qua); tia cao nhấp nháy chậm hơn khi báo trước; bề
   dày tia khi bắn = đúng bề rộng vùng trúng (2.0 đơn vị, khớp
   LASER_HIT hai phía). Thêm tiếng vút báo tia mới trên màn hình
   lớn (kênh cảnh báo thứ hai, chặn dồn 350ms).
5. Thẻ chọn game: cả 25 thẻ thêm một dòng phím điều khiển chính
   (mẫu Bloop: thẻ tự dạy cách chơi) — GAME_CTL trong page.mjs,
   đối chiếu nhãn nút thật trên màn hình điện thoại từng game.

Đã cân nhắc và KHÔNG đổi: thứ tự bảng 12 màu ghế — nhóm nhỏ
(≤6 người, phổ biến nhất) nhận các màu đầu (xanh dương/hồng/xanh
lá/tím/cam/đỏ) vốn khác hẳn nhau; kênh phụ (chip tên đặc) là lời
giải mù màu chính theo nghiên cứu, đã làm ở mục 1.

## Kiểm chứng

- Hồi quy: laser-check 21/21, local-test 803, deep-drive 629/0
  (biến thiên ±1 đã biết), discrim PASS.
- rig-ui-shot: 25/25 thẻ có dòng điều khiển; ảnh sảnh + ảnh Né
  Laze (chip tên đặc, viền avatar, tia bắn đúng bề rộng, người
  đang nhảy) kiểm bằng mắt đạt.
